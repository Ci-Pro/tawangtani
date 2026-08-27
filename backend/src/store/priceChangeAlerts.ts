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
    throw new Error(`REST ${method} price_change_alerts -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

export interface PriceChangeAlertRow {
  id?: string;
  user_id: string;
  expo_token: string;
  commodity: string;
  province: string;
  level: number;
  threshold: number;
  last_price: number | null;
  active: boolean;
  last_fired?: string | null;
  created_at?: string;
}

export async function upsertPriceChangeAlert(row: PriceChangeAlertRow): Promise<void> {
  await rest(
    'price_change_alerts?on_conflict=user_id,commodity,province,level',
    'POST',
    { ...row, active: true }
  );
}

export async function listMyPriceChangeAlerts(userId: string): Promise<PriceChangeAlertRow[]> {
  const rows = (await rest(
    `price_change_alerts?select=*&user_id=eq.${userId}&active=eq.true&order=created_at.desc&limit=50`,
    'GET'
  )) as PriceChangeAlertRow[] | null;
  return rows ?? [];
}

export async function deactivatePriceChangeAlert(userId: string, id: string): Promise<void> {
  await rest(`price_change_alerts?id=eq.${id}&user_id=eq.${userId}`, 'PATCH', { active: false });
}

export async function listAllActivePriceChangeAlerts(): Promise<PriceChangeAlertRow[]> {
  const rows = (await rest(
    'price_change_alerts?select=*&active=eq.true&limit=2000',
    'GET'
  )) as PriceChangeAlertRow[] | null;
  return rows ?? [];
}

export async function markPriceChangeAlertFired(id: string, newPrice: number): Promise<void> {
  await rest(`price_change_alerts?id=eq.${id}`, 'PATCH', {
    last_fired: new Date().toISOString(),
    last_price: newPrice,
  });
}
