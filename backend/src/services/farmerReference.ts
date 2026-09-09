import { listMarketPrices, MarketPriceRow, upsertMarketPrices } from '../store/marketPrices';
import { recentFarmerPrices } from '../store/farmerPrices';
import { sanitizePrice, displayUnitFor } from './priceSanity';

const STALE_HOURS = 24;

/**
 * Tutup celah "laporan petani tak pernah masuk harga resmi": bila referensi
 * PIHPS untuk komoditas+provinsi basi (>24 jam) atau belum ada, harga
 * dikoreksi pakai median laporan terverifikasi 7 hari terakhir (min. 2 data).
 * Sumber diberi label 'farmer:verified' agar transparan di UI.
 */
export async function mergeFarmerReference(commodity: string, province: string): Promise<number> {
  const rows = await recentFarmerPrices(province, commodity, 7);
  const groups: Array<[1 | 3, Array<{ price: number }>]> = [
    [1, rows.filter((r) => r.role === 'jual')],
    [3, rows.filter((r) => r.role === 'beli')],
  ];
  const refs: Array<{ level: 1 | 3; price: number }> = [];
  for (const [level, group] of groups) {
    if (group.length < 2) continue;
    const median = medianOf(group.map((g) => g.price));
    const clean = sanitizePrice(commodity, median);
    if (clean !== null) refs.push({ level, price: clean });
  }
  if (refs.length === 0) return 0;

  const existing = await listMarketPrices(commodity, province);
  const byKey = new Map(existing.map((r) => [`${r.commodity}|${r.level ?? 3}`, r]));
  const nowIso = new Date().toISOString();
  const updates: MarketPriceRow[] = [];
  for (const ref of refs) {
    const row = byKey.get(`${commodity}|${ref.level}`);
    const stale =
      !row || Date.now() - new Date(row.updated_at).getTime() > STALE_HOURS * 3_600_000;
    if (!stale) continue;
    updates.push(
      row
        ? {
            ...row,
            prev_price: row.price,
            price: ref.price,
            source: 'farmer:verified',
            updated_at: nowIso,
          }
        : {
            id: `${commodity}|${province}|${ref.level}`,
            commodity,
            province,
            level: ref.level,
            price: ref.price,
            prev_price: null,
            unit: displayUnitFor(commodity, 'kg'),
            source: 'farmer:verified',
            updated_at: nowIso,
          }
    );
  }
  if (updates.length > 0) await upsertMarketPrices(updates);
  return updates.length;
}

function medianOf(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}