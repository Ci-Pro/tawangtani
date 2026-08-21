import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '@/types';
import { uid } from '@/utils/format';

interface ChatState {
  messages: ChatMessage[];
  addUser: (content: string) => void;
  addAssistant: (content: string, toolName?: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addUser: (content) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { id: uid(), role: 'user', content, createdAt: new Date().toISOString() },
          ],
        })),
      addAssistant: (content, toolName) =>
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: uid(),
              role: 'assistant',
              content,
              toolName,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      reset: () => set({ messages: [] }),
    }),
    { name: 'twt-chat', storage: createJSONStorage(() => AsyncStorage) }
  )
);
