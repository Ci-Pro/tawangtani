import { config } from '../config';

export interface HistoryRow {
  commodity: string;
  province: string;
  level?: number; // default 3 (Konsumen)
  date: string; // YYYY-MM-DD
  price: number;
  source: string;
}

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
}

export async function upsertHistory(rows: HistoryRow[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await fetch(
    `${config.supabase.url}/rest/v1/market_price_history?on_conflict=commodity,province,level,date`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`upsertHistory -> ${res.status}: ${t.slice(0, 200)}`);
  }
}

export async function queryHistory(
  commodity: string,
  province: string,
  sinceDate: string,
  level = 3
): Promise<HistoryRow[]> {
  const path =
    `market_price_history?select=commodity,province,date,price,source` +
    `&commodity=eq.${encodeURIComponent(commodity)}` +
    `&province=ilike.${encodeURIComponent(province.trim())}` +
    `&level=eq.${level}` +
    `&date=gte.${sinceDate}&order=date.asc&limit=2000`;
  const res = await fetch(`${config.supabase.url}/rest/v1/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`queryHistory -> ${res.status}`);
  return (await res.json()) as HistoryRow[];
}
