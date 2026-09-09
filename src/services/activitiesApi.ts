import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { ActivityType } from '@/types';

export interface ActivityServerRow {
  id: string;
  activity: string;
  product_name: string;
  dose_text: string;
  date: string;
  note: string;
  source: string;
  done: boolean;
  crop_label: string | null;
  remind_at: string | null;
  created_at: string;
}

async function token(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}

async function request<T>(
  backendUrl: string,
  path: string,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<T> {
  const jwt = await token();
  if (!jwt) throw new Error('Belum masuk — login dulu untuk sinkron.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${backendUrl}/api/activities${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (init.method === 'DELETE') return {} as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export interface CreateActivityBody {
  activity: ActivityType;
  date: string;
  note?: string;
  source?: 'manual' | 'ai';
  productName?: string;
  doseText?: string;
  cropLabel?: string;
  done?: boolean;
  remindAt?: string | null;
}

export async function listActivities(backendUrl: string): Promise<ActivityServerRow[]> {
  const data = await request<{ activities: ActivityServerRow[] }>(backendUrl, '');
  return data.activities ?? [];
}

export async function createActivity(
  backendUrl: string,
  body: CreateActivityBody
): Promise<ActivityServerRow> {
  const data = await request<{ activity: ActivityServerRow }>(backendUrl, '', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.activity;
}

export async function updateActivity(
  backendUrl: string,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  await request<{ ok: boolean }>(backendUrl, `/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteActivity(backendUrl: string, id: string): Promise<void> {
  await request<unknown>(backendUrl, `/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function rowToLocal(
  r: ActivityServerRow
): {
  serverId: string;
  activity: ActivityType;
  date: string;
  note?: string;
  source: 'manual' | 'ai';
  productName?: string;
  doseText?: string;
  cropLabel?: string;
  done: boolean;
  remindAt?: string;
} {
  const activities: ActivityType[] = ['tanam', 'pemupukan', 'penyemprotan', 'penyiraman', 'penyiangan', 'panen', 'lainnya'];
  return {
    serverId: r.id,
    activity: activities.includes(r.activity as ActivityType) ? (r.activity as ActivityType) : 'lainnya',
    date: r.date.slice(0, 10),
    note: r.note || undefined,
    source: r.source === 'ai' ? 'ai' : 'manual',
    productName: r.product_name || undefined,
    doseText: r.dose_text || undefined,
    cropLabel: r.crop_label || undefined,
    done: Boolean(r.done),
    remindAt: r.remind_at || undefined,
  };
}