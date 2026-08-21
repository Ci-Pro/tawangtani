import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, ChatSession } from '@/types';
import { uid } from '@/utils/format';

interface ChatState {
  sessions: ChatSession[];
  activeId: string | null;
  newSession: () => void;
  setActive: (id: string) => void;
  deleteSession: (id: string) => void;
  addUser: (content: string) => void;
  addAssistant: (content: string, toolName?: string, actions?: { label: string; route: string }[]) => void;
}

function activeSession(s: { sessions: ChatSession[]; activeId: string | null }): ChatSession {
  const existing = s.sessions.find((x) => x.id === s.activeId);
  if (existing) return existing;
  const fresh: ChatSession = {
    id: uid(),
    title: 'Konsultasi Baru',
    messages: [],
    createdAt: new Date().toISOString(),
  };
  return fresh;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      newSession: () =>
        set((s) => {
          const empty = s.sessions.find((x) => x.messages.length === 0);
          if (empty) return { activeId: empty.id };
          const fresh: ChatSession = {
            id: uid(),
            title: 'Konsultasi Baru',
            messages: [],
            createdAt: new Date().toISOString(),
          };
          return { sessions: [fresh, ...s.sessions], activeId: fresh.id };
        }),
      setActive: (id) => set({ activeId: id }),
      deleteSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((x) => x.id !== id);
          return { sessions, activeId: s.activeId === id ? sessions[0]?.id ?? null : s.activeId };
        }),
      addUser: (content) =>
        set((s) => {
          const current = activeSession(s);
          const msg: ChatMessage = {
            id: uid(),
            role: 'user',
            content,
            createdAt: new Date().toISOString(),
          };
          const title =
            current.messages.length === 0
              ? content.slice(0, 40) || current.title
              : current.title;
          const updated = { ...current, title, messages: [...current.messages, msg] };
          return {
            sessions: [updated, ...s.sessions.filter((x) => x.id !== current.id)],
            activeId: updated.id,
          };
        }),
      addAssistant: (content, toolName, actions) =>
        set((s) => {
          const current = activeSession(s);
          const msg: ChatMessage = {
            id: uid(),
            role: 'assistant',
            content,
            toolName,
            actions,
            createdAt: new Date().toISOString(),
          };
          const updated = { ...current, messages: [...current.messages, msg] };
          return {
            sessions: [updated, ...s.sessions.filter((x) => x.id !== current.id)],
            activeId: updated.id,
          };
        }),
    }),
    {
      name: 'twt-chat',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && !state.activeId && state.sessions.length > 0) {
          useChatStore.setState({ activeId: state.sessions[0].id });
        }
      },
    }
  )
);

export function useActiveMessages(): ChatMessage[] {
  return useChatStore((s) => s.sessions.find((x) => x.id === s.activeId)?.messages ?? []);
}
