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
  if (!b) throw new Error('Supabase belum dikonfigurasi');
  const res = await fetch(`${b.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${method} price_alerts -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

export interface PriceAlertRow {
  id?: string;
  user_id: string;
  expo_push_token: string;
  commodity: string;
  province: string;
  level: number;
  direction: 'above' | 'below';
  target: number;
  active: boolean;
  last_fired_at?: string | null;
  fired_count?: number;
  created_at?: string;
}

export async function upsertPriceAlert(row: PriceAlertRow): Promise<void> {
  await rest(
    'price_alerts?on_conflict=user_id,commodity,province,direction,target',
    'POST',
    { ...row, active: true }
  );
}

export async function listMyAlerts(userId: string): Promise<PriceAlertRow[]> {
  const rows = (await rest(
    `price_alerts?select=*&user_id=eq.${userId}&order=created_at.desc&limit=50`,
    'GET'
  )) as PriceAlertRow[] | null;
  return rows ?? [];
}

export async function deactivateAlert(userId: string, id: string): Promise<void> {
  await rest(`price_alerts?id=eq.${id}&user_id=eq.${userId}`, 'PATCH', { active: false });
}

export async function listActiveAlerts(): Promise<PriceAlertRow[]> {
  const rows = (await rest(
    'price_alerts?select=*&active=eq.true&limit=2000',
    'GET'
  )) as PriceAlertRow[] | null;
  return rows ?? [];
}

export async function markAlertFired(id: string, previousCount = 0): Promise<void> {
  await rest(`price_alerts?id=eq.${id}`, 'PATCH', {
    active: false,
    last_fired_at: new Date().toISOString(),
    fired_count: previousCount + 1,
  });
}
