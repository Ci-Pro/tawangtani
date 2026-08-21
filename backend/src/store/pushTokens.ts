import { config } from '../config';

function base(): { url: string; key: string } | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  return { url: config.supabase.url, key: config.supabase.serviceRoleKey };
}

async function rest(
  pathUrl: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<unknown> {
  const b = base();
  if (!b) return null;
  const res = await fetch(`${b.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${method} ${pathUrl} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

export interface PushTokenRow {
  expo_token: string;
  user_id: string | null;
  lat: number;
  lon: number;
  location_name: string;
}

export async function upsertPushToken(row: PushTokenRow): Promise<void> {
  await rest('push_tokens', 'POST', row);
}

export async function listPushTokens(): Promise<PushTokenRow[]> {
  const data = (await rest('push_tokens?select=*&order=updated_at.desc&limit=5000', 'GET')) as
    | PushTokenRow[]
    | null;
  return data ?? [];
}

export async function sendExpoPush(messages: Array<{
  to: string;
  title: string;
  body: string;
}>): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const msg of messages) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...msg, sound: 'default', channelId: 'weather' }),
      });
      if (res.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { sent, failed };
}
