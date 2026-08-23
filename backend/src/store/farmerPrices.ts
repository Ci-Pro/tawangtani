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
      Prefer: method === 'GET' ? 'count=exact' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST ${method} farmer_prices -> ${res.status}: ${text.slice(0, 200)}`);
  }
  if (method === 'DELETE') return null;
  return res.status === 204 ? null : res.json().catch(() => []);
}

export interface FarmerPriceRow {
  id?: string;
  user_id: string;
  commodity: string;
  province: string;
  village: string;
  role: 'jual' | 'beli';
  price: number;
  unit: string;
  note: string;
  status: 'approved' | 'pending';
  created_at?: string;
}

export async function insertFarmerPrice(row: FarmerPriceRow): Promise<void> {
  await rest('farmer_prices', 'POST', row);
}

export async function recentFarmerPrices(
  province: string,
  commodity: string | undefined,
  days: number
): Promise<FarmerPriceRow[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  let q = `farmer_prices?select=*&status=eq.approved&province=eq.${encodeURIComponent(
    province
  )}&created_at=gte.${since}&order=created_at.desc&limit=2000`;
  if (commodity) q += `&commodity=eq.${encodeURIComponent(commodity)}`;
  return ((await rest(q, 'GET')) as FarmerPriceRow[] | null) ?? [];
}

export async function myFarmerPrices(userId: string): Promise<FarmerPriceRow[]> {
  const rows = (await rest(
    `farmer_prices?select=*&user_id=eq.${userId}&order=created_at.desc&limit=30`,
    'GET'
  )) as FarmerPriceRow[] | null;
  return rows ?? [];
}

export async function adminListFarmerPrices(status?: string, limit = 200): Promise<FarmerPriceRow[]> {
  let q = `farmer_prices?select=*&order=created_at.desc&limit=${limit}`;
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    q += `&status=eq.${status}`;
  }
  return ((await rest(q, 'GET')) as FarmerPriceRow[] | null) ?? [];
}

export async function adminModerateFarmerPrice(
  id: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<void> {
  await rest(`farmer_prices?id=eq.${encodeURIComponent(id)}`, 'PATCH', { status });
}

export async function adminDeleteFarmerPrice(id: string): Promise<void> {
  await rest(`farmer_prices?id=eq.${encodeURIComponent(id)}`, 'DELETE');
}

export async function countRows(table: string, filters = ''): Promise<number> {
  const b = base();
  if (!b) return -1;
  try {
    const res = await fetch(`${b.url}/rest/v1/${table}?select=*${filters}`, {
      method: 'HEAD',
      headers: {
        apikey: b.key,
        Authorization: `Bearer ${b.key}`,
        Prefer: 'count=exact',
      },
      signal: AbortSignal.timeout(8000),
    });
    const range = res.headers.get('content-range') ?? '';
    const m = range.match(/\/(\d+)$/);
    return m ? Number(m[1]) : 0;
  } catch {
    return -1;
  }
}

export interface FarmerAggregate {
  commodity: string;
  count: number;
  avgSell: number | null;
  avgBuy: number | null;
  min: number;
  max: number;
  lastAt: string;
}

export function aggregateFarmer(rows: FarmerPriceRow[]): FarmerAggregate[] {
  const map = new Map<string, { n: number; s: number; b: number; ns: number; nb: number; min: number; max: number; last: string }>();
  for (const r of rows) {
    const cur = map.get(r.commodity) ?? {
      n: 0, s: 0, b: 0, ns: 0, nb: 0, min: Infinity, max: 0, last: r.created_at ?? '',
    };
    cur.n += 1;
    if (r.price < cur.min) cur.min = r.price;
    if (r.price > cur.max) cur.max = r.price;
    if (r.role === 'jual') { cur.s += r.price; cur.ns += 1; } else { cur.b += r.price; cur.nb += 1; }
    if ((r.created_at ?? '') > cur.last) cur.last = r.created_at ?? '';
    map.set(r.commodity, cur);
  }
  return [...map.entries()].map(([commodity, v]) => ({
    commodity,
    count: v.n,
    avgSell: v.ns > 0 ? Math.round(v.s / v.ns) : null,
    avgBuy: v.nb > 0 ? Math.round(v.b / v.nb) : null,
    min: v.min,
    max: v.max,
    lastAt: v.last,
  }));
}
