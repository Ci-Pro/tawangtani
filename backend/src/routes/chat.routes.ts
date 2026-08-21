import { Router, Request, Response } from 'express';
import { config, hasSupabase } from '../config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseUser } from '../middleware/supabaseUser';

export const chatRouter = Router();

function db(): SupabaseClient {
  if (!hasSupabase()) throw new Error('SUPABASE belum dikonfigurasi');
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

interface SyncMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

chatRouter.post(
  '/sync',
  requireSupabaseUser,
  async (req: Request & { sbUser?: { id: string } }, res: Response) => {
    try {
      const userId = req.sbUser!.id;
      const { sessionId, title, messages } = req.body as {
        sessionId?: string;
        title?: string;
        messages?: SyncMessage[];
      };
      if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'sessionId dan messages wajib' });
        return;
      }
      const c = db();
      await c.from('chat_messages').delete().eq('session_id', sessionId).eq('user_id', userId);
      const rows = messages.slice(-200).map((m) => ({
        session_id: String(sessionId).slice(0, 120),
        user_id: userId,
        role: m.role,
        content: m.content ?? '',
        created_at: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      }));
      const { error } = await c.from('chat_messages').insert(rows);
      if (error) throw new Error(error.message);
      res.json({
        ok: true,
        count: rows.length,
        title: (title ?? rows.find((r) => r.role === 'user')?.content ?? 'Sesi').slice(0, 80),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

chatRouter.get(
  '/sessions',
  requireSupabaseUser,
  async (req: Request & { sbUser?: { id: string } }, res: Response) => {
    try {
      const c = db();
      const { data, error } = await c
        .from('chat_messages')
        .select('session_id, role, content, created_at')
        .eq('user_id', req.sbUser!.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      const seen = new Map<string, { sessionId: string; title: string; updatedAt: string; count: number }>();
      for (const row of data ?? []) {
        const s = seen.get(row.session_id) ?? {
          sessionId: row.session_id,
          title: '',
          updatedAt: row.created_at,
          count: 0,
        };
        s.count += 1;
        if (!s.title && row.role === 'user') s.title = row.content.slice(0, 60);
        seen.set(row.session_id, s);
      }
      res.json({ sessions: [...seen.values()] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

chatRouter.get(
  '/sessions/:id/messages',
  requireSupabaseUser,
  async (req: Request & { sbUser?: { id: string } }, res: Response) => {
    try {
      const c = db();
      const { data, error } = await c
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', req.sbUser!.id)
        .eq('session_id', req.params.id)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      res.json({ messages: data ?? [] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);
