import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem, HistoryType } from '@/types';
import { uid } from '@/utils/format';

interface AddHistoryInput {
  type: HistoryType;
  title: string;
  inputsText: string;
  resultText: string;
  method?: string;
}

interface HistoryState {
  items: HistoryItem[];
  add: (item: AddHistoryInput) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...item, id: uid(), createdAt: new Date().toISOString() },
          ],
        })),
      clear: () => set({ items: [] }),
    }),
    { name: 'twt-history', storage: createJSONStorage(() => AsyncStorage) }
  )
);
