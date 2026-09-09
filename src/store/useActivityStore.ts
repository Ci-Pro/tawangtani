import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { FarmActivity, ActivityType } from '@/types';
import { uid } from '@/utils/format';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  createActivity,
  deleteActivity,
  listActivities,
  rowToLocal,
  updateActivity,
  ActivityServerRow,
} from '@/services/activitiesApi';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface AddActivityInput {
  farmId?: string;
  cropId?: string;
  cropLabel?: string;
  activity: ActivityType;
  productId?: string;
  productName?: string;
  doseText?: string;
  date: string;
  remindAt?: string;
  note?: string;
  source?: 'manual' | 'ai';
}

export interface SyncStats {
  pushed: number;
  pulled: number;
}

interface ActivityState {
  items: FarmActivity[];
  pendingDeletes: string[];
  add: (input: AddActivityInput) => Promise<void>;
  toggleDone: (id: string) => void;
  remove: (id: string) => Promise<void>;
  importAll: (rows: ActivityServerRow[]) => number;
  synced: (serverId: string, localId: string) => void;
  markDeleted: (serverId: string) => void;
  syncNow: () => Promise<SyncStats>;
}

async function scheduleReminder(activity: FarmActivity): Promise<string | undefined> {
  if (!activity.remindAt) return undefined;
  const when = new Date(activity.remindAt).getTime();
  if (when <= Date.now()) return undefined;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌾 Pengingat TAWANGTANI',
        body: `${activityLabel(activity.activity)}${activity.cropLabel ? ` — ${activity.cropLabel}` : ''}`,
      },
      trigger: { date: when },
    });
    return id;
  } catch {
    return undefined;
  }
}

export function activityLabel(a: ActivityType): string {
  const map: Record<ActivityType, string> = {
    tanam: 'Tanam',
    pemupukan: 'Pemupukan',
    penyemprotan: 'Penyemprotan',
    penyiraman: 'Penyiraman',
    penyiangan: 'Penyiangan',
    panen: 'Panen',
    lainnya: 'Aktivitas',
  };
  return map[a];
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void useActivityStore.getState().syncNow().catch(() => {});
  }, 1600);
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      items: [],
      pendingDeletes: [],

      add: async (input) => {
        const draft: FarmActivity = {
          id: uid(),
          ...input,
          source: input.source ?? 'manual',
          done: false,
          synced: false,
        };
        const notificationId = await scheduleReminder(draft);
        set((s) => ({ items: [...s.items, { ...draft, notificationId }] }));
        scheduleSync();
      },

      toggleDone: (id) => {
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
        }));
        scheduleSync();
      },

      remove: async (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item?.notificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.notificationId);
          } catch {}
        }
        set((s) => {
          const toDelete = (item?.serverId && item.synced && !item._deleted) ? item.serverId : null;
          return {
            items: s.items.filter((i) => i.id !== id),
            pendingDeletes: toDelete && !s.pendingDeletes.includes(toDelete) ? [...s.pendingDeletes, toDelete] : s.pendingDeletes,
          };
        });
        scheduleSync();
      },

      importAll: (rows) => {
        const s = get();
        const byServer = new Map<string, FarmActivity>();
        for (const it of s.items) if (it.serverId) byServer.set(it.serverId, it);
        let pulled = 0;
        const next: FarmActivity[] = [...s.items];
        for (const r of rows) {
          const existing = byServer.get(r.id);
          if (existing) {
            const merged: FarmActivity = {
              ...existing,
              done: r.done,
              remindAt: r.remind_at || existing.remindAt,
              cropLabel: r.crop_label || existing.cropLabel,
              doseText: r.dose_text || existing.doseText,
              note: r.note || existing.note,
              source: r.source === 'ai' ? 'ai' : existing.source,
              synced: true,
            };
            const idx = next.findIndex((i) => i.id === existing.id);
            if (idx >= 0) next[idx] = merged;
          } else {
            next.push({ id: uid(), ...rowToLocal(r), synced: true });
            pulled += 1;
          }
        }
        set({ items: next });
        return pulled;
      },

      synced: (serverId, localId) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === localId ? { ...i, serverId, synced: !i._deleted } : i)),
        })),

      markDeleted: (serverId) =>
        set((s) => ({
          pendingDeletes: s.pendingDeletes.filter((id) => id !== serverId),
        })),

      syncNow: async () => {
        const { items } = get();
        const backendUrl = useSettingsStore.getState().backendUrl?.trim();
        if (!backendUrl) return { pushed: 0, pulled: 0 };
        const base = backendUrl.replace(/\/$/, '');
        let pushed = 0;
        let pulled = 0;

        // 1. Hapus tertunda
        for (const sid of get().pendingDeletes) {
          try {
            await deleteActivity(base, sid);
            get().markDeleted(sid);
          } catch {}
        }

        // 2. Dorong aktivitas lokal yang belum tersinkron
        for (const it of get().items) {
          if (it.synced) continue;
          try {
            const row = await createActivity(base, {
              activity: it.activity,
              date: it.date,
              note: it.note,
              source: it.source === 'ai' ? 'ai' : 'manual',
              productName: it.productName,
              doseText: it.doseText,
              cropLabel: it.cropLabel,
              done: it.done,
              remindAt: it.remindAt ?? null,
            });
            get().synced(String(row.id), it.id);
            pushed += 1;
          } catch {}
        }

        // 3. Sinkronkan perubahan tanda selesai ke server
        for (const it of get().items) {
          if (!it.serverId || it.synced === false) continue;
          try {
            await updateActivity(base, it.serverId, { done: it.done });
          } catch {}
        }

        // 4. Tarik aktivitas server yang belum ada secara lokal
        try {
          const rows = await listActivities(base);
          const result = get().importAll(rows);
          pulled = result;
        } catch {}

        return { pushed, pulled };
      },
    }),
    { name: 'twt-activities', storage: createJSONStorage(() => AsyncStorage) }
  )
);