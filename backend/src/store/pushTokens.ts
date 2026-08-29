import { config } from '../config';

function base(): { url: string; key: string } | null {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  return { url: config.supabase.url, key: config.supabase.serviceRoleKey };
}

function baseHeaders(): Record<string, string> {
  const b = base()!;
  return {
    apikey: b.key,
    Authorization: `Bearer ${b.key}`,
    'Content-Type': 'application/json',
  };
}

async function rest(
  pathUrl: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
  prefer = 'return=minimal'
): Promise<unknown> {
  const b = base();
  if (!b) return null;
  const res = await fetch(`${b.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
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
  // expo_token adalah PK: merge-duplicates agar registrasi ulang perangkat
  // yang sama (rutin tiap buka aplikasi) membarui user_id/lokasi, bukan 409.
  await rest(
    'push_tokens?on_conflict=expo_token',
    'POST',
    row,
    'resolution=merge-duplicates,return=minimal'
  );
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
  // Expo menerima maks 100 notifikasi per permintaan HTTP; batch lebih cepat
  // & hemat daripada satu permintaan per perangkat.
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          chunk.map((m) => ({ ...m, sound: 'default', channelId: 'weather' }))
        ),
      });
      if (!res.ok) {
        failed += chunk.length;
        continue;
      }
      const data = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
      if (!Array.isArray(data?.data)) {
        sent += chunk.length;
        continue;
      }
      for (const item of data.data) {
        if (item && typeof item === 'object' && (item as { status?: string }).status === 'ok') sent += 1;
        else failed += 1;
      }
    } catch {
      failed += chunk.length;
    }
  }
  return { sent, failed };
}

export async function logCampaign(c: {
  title: string;
  body: string;
  targets: number;
  sent: number;
  failed: number;
}): Promise<void> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return;
  try {
    await fetch(`${config.supabase.url}/rest/v1/push_campaign_log`, {
      method: 'POST',
      headers: { ...baseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(c),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // ledger tidak boleh menggagalkan kampanye
  }
}

export async function listCampaigns(limit = 20): Promise<unknown[]> {
  const rows = (await rest(
    `push_campaign_log?select=*&order=created_at.desc&limit=${limit}`,
    'GET'
  )) as unknown[] | null;
  return rows ?? [];
}
