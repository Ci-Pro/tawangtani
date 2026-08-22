import { HistoryRow, queryHistory, upsertHistory } from '../store/marketHistory';
import { listMarketPrices } from '../store/marketPrices';

export interface Bucket {
  label: string;
  avg: number;
  min: number;
  max: number;
  close: number;
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Simpan harga hari ini ke riwayat (idempoten per tanggal). */
export async function snapshotToday(province = 'nasional'): Promise<number> {
  const prices = await listMarketPrices(undefined, province);
  const today = iso(new Date());
  const rows: HistoryRow[] = prices.map((p) => ({
    commodity: p.commodity,
    province: p.province,
    date: today,
    price: p.price,
    source: 'snapshot',
  }));
  await upsertHistory(rows);
  return rows.length;
}

function bucketize(
  rows: HistoryRow[],
  keyFn: (dateStr: string) => string
): Bucket[] {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    const k = keyFn(r.date);
    const arr = map.get(k) ?? [];
    arr.push(r.price);
    map.set(k, arr);
  }
  const out: Bucket[] = [];
  for (const [label, arr] of map) {
    const sum = arr.reduce((a, b) => a + b, 0);
    out.push({
      label,
      avg: Math.round(sum / arr.length),
      min: Math.min(...arr),
      max: Math.max(...arr),
      close: arr[arr.length - 1],
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

function weekKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Senin=0
  d.setUTCDate(d.getUTCDate() - day);
  return iso(d);
}

export async function getSeries(
  commodity: string,
  range: 'daily' | 'weekly' | 'monthly' | 'yearly',
  province = 'nasional'
): Promise<{ buckets: Bucket[]; range: string }> {
  const now = new Date();
  let since: string;
  if (range === 'daily') {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 30);
    since = iso(d);
  } else if (range === 'weekly') {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 12 * 7);
    since = iso(d);
  } else if (range === 'monthly') {
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 24);
    since = iso(d);
  } else {
    const d = new Date(now);
    d.setUTCFullYear(d.getUTCFullYear() - 5);
    since = iso(d);
  }

  const rows = await queryHistory(commodity, province, since);

  let buckets: Bucket[];
  switch (range) {
    case 'daily':
      buckets = rows.map((r) => ({ label: r.date.slice(5), avg: r.price, min: r.price, max: r.price, close: r.price }));
      break;
    case 'weekly':
      buckets = bucketize(rows, weekKey).map((b) => ({ ...b, label: b.label.slice(5) }));
      break;
    case 'monthly':
      buckets = bucketize(rows, (ds) => ds.slice(0, 7)).map((b) => {
        const [y, m] = b.label.split('-');
        return { ...b, label: `${MONTHS_ID[Number(m) - 1]} ${y.slice(2)}` };
      });
      break;
    case 'yearly':
      buckets = bucketize(rows, (ds) => ds.slice(0, 4));
      break;
  }
  return { buckets, range };
}
