import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ChatMessage } from '@/types';

export async function syncChatSession(
  sessionId: string,
  title: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    const backendUrl = useSettingsStore.getState().backendUrl?.trim();
    if (!backendUrl || !isSupabaseConfigured) return;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return;
    await fetch(`${backendUrl.replace(/\/$/, '')}/api/chat/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        title,
        messages: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
          createdAt: m.createdAt,
        })),
      }),
    });
  } catch {
    // Sinkronisasi gagal diam-diam; data tetap aman di penyimpanan lokal
  }
}
