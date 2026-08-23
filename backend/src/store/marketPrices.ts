import { config } from '../config';

export interface MarketPriceRow {
  id: string;
  commodity: string;
  province: string;
  level: number; // 1=Produsen, 2=Grosir/Pasar Besar, 3=Konsumen
  price: number;
  prev_price: number | null;
  unit: string;
  source: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

export async function listMarketPrices(
  commodity?: string,
  province?: string,
  level?: number
): Promise<MarketPriceRow[]> {
  let path = 'market_prices?select=*&order=commodity.asc';
  if (commodity) path += `&commodity=eq.${encodeURIComponent(commodity)}`;
  if (province) path += `&province=ilike.${encodeURIComponent(province.trim())}`;
  if (level) path += `&level=eq.${level}`;
  const res = await fetch(`${config.supabase.url}/rest/v1/${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`REST market_prices -> ${res.status}`);
  return (await res.json()) as MarketPriceRow[];
}

export async function listProvinces(): Promise<string[]> {
  const res = await fetch(`${config.supabase.url}/rest/v1/market_prices?select=province`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ province: string }>;
  return [...new Set(rows.map((r) => r.province))];
}

export async function upsertMarketPrices(rows: MarketPriceRow[]): Promise<void> {
  if (rows.length === 0) return;
  const res = await fetch(`${config.supabase.url}/rest/v1/market_prices`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`upsertMarketPrices -> ${res.status}: ${t.slice(0, 200)}`);
  }
}
