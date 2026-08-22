import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from '../src/config';

interface SeedItem {
  commodity: string;
  price: number;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SOURCE = 'backfill-referensi';

async function main(): Promise<void> {
  const items = JSON.parse(
    readFileSync(resolve(__dirname, '../src/data/market.seed.json'), 'utf8')
  ) as SeedItem[];

  const today = new Date();
  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const it of items) {
    const rand = mulberry32(hashStr(it.commodity));
    // Harga mengikuti jalan acak halus menuju harga saat ini
    const dailyDays = 90;
    const startPrice = Math.round(it.price * (0.82 + rand() * 0.2));
    for (let i = dailyDays; i >= 1; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const t = (dailyDays - i) / dailyDays;
      const wiggle = Math.sin(i * 0.35 + rand()) * 0.02 + (rand() - 0.5) * 0.03;
      const price = Math.round((startPrice + (it.price - startPrice) * t) * (1 + wiggle));
      const ds = d.toISOString().slice(0, 10);
      const key = `${it.commodity}|${ds}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          commodity: it.commodity,
          province: 'nasional',
          date: ds,
          price,
          source: SOURCE,
        });
      }
    }

    // Bulanan 24 bulan
    for (let m = 24; m >= 1; m--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - m, 15));
      const t = (24 - m) / 24;
      const startM = Math.round(it.price * (0.75 + rand() * 0.25));
      const price = Math.round(startM + (it.price - startM) * t);
      const ds = d.toISOString().slice(0, 10);
      const key = `${it.commodity}|${ds}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({
          commodity: it.commodity,
          province: 'nasional',
          date: ds,
          price,
          source: SOURCE,
        });
      }
    }
  }

  console.log(`Upsert ${rows.length} baris riwayat...`);
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const res = await fetch(`${config.supabase.url}/rest/v1/market_price_history?on_conflict=commodity,province,date`, {
      method: 'POST',
      headers: {
        apikey: config.supabase.serviceRoleKey,
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error('Gagal:', res.status, (await res.text()).slice(0, 200));
      process.exit(1);
    }
  }
  console.log('Backfill riwayat harga OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
