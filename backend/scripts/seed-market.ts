import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from '../src/config';

interface SeedItem {
  commodity: string;
  label: string;
  price: number;
  prev: number;
}

async function main(): Promise<void> {
  const file = readFileSync(resolve(__dirname, '../src/data/market.seed.json'), 'utf8');
  const items = JSON.parse(file) as SeedItem[];
  const nowIso = new Date().toISOString();
  const rows = items.map((it) => ({
    id: `${it.commodity}|nasional`,
    commodity: it.commodity,
    province: 'nasional',
    price: it.price,
    prev_price: it.prev,
    unit: 'kg',
    source: 'Referensi harga nasional (PIHPS/Bapanas), diperbarui admin TAWANGTANI',
    updated_at: nowIso,
  }));

  const res = await fetch(`${config.supabase.url}/rest/v1/market_prices`, {
    method: 'POST',
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    console.error('Gagal seed:', res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }
  console.log(`Seed market_prices OK: ${rows.length} komoditas`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
