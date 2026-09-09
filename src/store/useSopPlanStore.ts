import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SopPlan } from '@/types';

export interface PinnedSop {
  plan: SopPlan;
  /** Tanggal tanam nyata; null = dijangkarkan ke hari ini. */
  base: string | null;
  cropKey: string;
  pinnedAt: string;
}

interface SopPlanState {
  pinned: PinnedSop | null;
  loggedKeys: string[];
  setPinned: (plan: SopPlan, base: string | null) => void;
  markLogged: (key: string) => void;
  clearPin: () => void;
}

export const useSopPlanStore = create<SopPlanState>()(
  persist(
    (set) => ({
      pinned: null,
      loggedKeys: [],
      setPinned: (plan, base) =>
        set({
          pinned: {
            plan,
            base,
            cropKey: plan.crop?.cropType ?? 'unknown',
            pinnedAt: new Date().toISOString(),
          },
          loggedKeys: [],
        }),
      markLogged: (key) =>
        set((s) => (s.loggedKeys.includes(key) ? s : { loggedKeys: [...s.loggedKeys, key] })),
      clearPin: () => set({ pinned: null, loggedKeys: [] }),
    }),
    { name: 'twt-sop-pin', storage: createJSONStorage(() => AsyncStorage) }
  )
);