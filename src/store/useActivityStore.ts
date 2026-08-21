import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { FarmActivity, ActivityType } from '@/types';
import { uid } from '@/utils/format';

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

interface ActivityState {
  items: FarmActivity[];
  add: (input: AddActivityInput) => Promise<void>;
  toggleDone: (id: string) => void;
  remove: (id: string) => Promise<void>;
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

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      items: [],
      add: async (input) => {
        const draft: FarmActivity = {
          id: uid(),
          ...input,
          source: input.source ?? 'manual',
          done: false,
        };
        const notificationId = await scheduleReminder(draft);
        set((s) => ({ items: [...s.items, { ...draft, notificationId }] }));
      },
      toggleDone: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
        })),
      remove: async (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item?.notificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.notificationId);
          } catch {}
        }
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },
    }),
    { name: 'twt-activities', storage: createJSONStorage(() => AsyncStorage) }
  )
);
