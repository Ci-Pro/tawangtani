import { config } from '../config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface KnowledgeHit {
  id: number;
  doc_id: string;
  title: string;
  crop: string;
  topic: string;
  content: string;
  source: string;
  score: number;
}

let client: SupabaseClient | null = null;

function db(): SupabaseClient | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export async function searchKnowledge(query: string, matchCount = 4): Promise<KnowledgeHit[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c.rpc('search_knowledge', {
    q: query,
    match_count: matchCount,
  });
  if (error) {
    console.error('[knowledge] gagal cari:', error.message);
    return [];
  }
  return (data ?? []) as KnowledgeHit[];
}

export async function logAiQuery(entry: {
  userId?: string | null;
  question: string;
  iterations: number;
  model: string;
}): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('ai_query_log').insert({
    user_id: entry.userId ?? null,
    question: entry.question.slice(0, 2000),
    iterations: entry.iterations,
    model: entry.model,
  });
}
