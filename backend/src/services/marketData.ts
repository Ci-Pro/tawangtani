import { MarketPriceRow, listMarketPrices, upsertMarketPrices } from '../store/marketPrices';

const SOURCE_LABEL = 'Referensi harga nasional (PIHPS/Bapanas), diperbarui admin TAWANGTANI';

export interface PriceView {
  commodity: string;
  province: string;
  price: number;
  prevPrice: number | null;
  changePct: number | null;
  trend: 'naik' | 'turun' | 'stabil';
  unit: string;
  source: string;
  updatedAt: string;
}

function trendOf(changePct: number | null): 'naik' | 'turun' | 'stabil' {
  if (changePct === null) return 'stabil';
  if (changePct > 2) return 'naik';
  if (changePct < -2) return 'turun';
  return 'stabil';
}

export function toView(r: MarketPriceRow): PriceView {
  const changePct =
    r.prev_price && r.prev_price > 0 ? ((r.price - r.prev_price) / r.prev_price) * 100 : null;
  return {
    commodity: r.commodity,
    province: r.province,
    price: r.price,
    prevPrice: r.prev_price,
    changePct: changePct === null ? null : Math.round(changePct * 10) / 10,
    trend: trendOf(changePct),
    unit: r.unit,
    source: r.source,
    updatedAt: r.updated_at,
  };
}

export function guidanceFor(v: PriceView): string {
  const rp = `Rp${v.price.toLocaleString('id-ID')}/${v.unit}`;
  if (v.trend === 'naik') {
    return `Harga ${v.commodity} naik ${v.changePct}% menjadi ${rp}. Sinyal positif untuk penjual — pertimbangkan jual bertahap dan pantau terus.`;
  }
  if (v.trend === 'turun') {
    return `Harga ${v.commodity} turun ${Math.abs(v.changePct!)}% menjadi ${rp}. Untuk komoditas mudah busuk sebaiknya jual lebih cepat; jika awet disimpan, tahan sambil tunggu pemulihan.`;
  }
  return `Harga ${v.commodity} stabil di ${rp}. Jual sesuai kebutuhan; tidak ada sinyal menunggu.`;
}

/**
 * Alternative upstream fetchers — dicoba berurutan saat refresh.
 * Situs resmi sering berubah/WAF, jadi kegagalan semua sumber dianggap normal
 * dan cache Supabase tetap menjadi sumber utama.
 */
type Fetcher = { name: string; run: () => Promise<Array<{ commodity: string; price: number }>> };

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

const fetchers: Fetcher[] = [
  {
    name: 'panelharga-bapanas',
    run: async () => {
      const res = await fetch(
        'https://panelharga.badanpangan.go.id/data/provinsi/2/3/' + new Date().getFullYear(),
        {
          headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        }
      );
      const ct = res.headers.get('content-type') ?? '';
      if (!res.ok || !ct.includes('json')) throw new Error('bukan JSON');
      const json = (await res.json()) as { data?: unknown[] };
      const rows = json.data;
      if (!Array.isArray(rows)) throw new Error('struktur tak dikenal');
      const out: Array<{ commodity: string; price: number }> = [];
      for (const r of rows) {
        const arr = r as [string, unknown[]];
        const prices = Array.isArray(arr?.[1])
          ? (arr[1].filter((n) => typeof n === 'number' && n > 0) as number[])
          : [];
        if (prices.length > 0) {
          out.push({ commodity: normalizeName(String(arr[0])), price: Math.round(prices[prices.length - 1]) });
        }
      }
      return out;
    },
  },
];

export async function refreshPrices(): Promise<{
  updated: number;
  sources: string[];
  note?: string;
}> {
  let collected: Array<{ commodity: string; price: number }> = [];
  const sources: string[] = [];
  for (const f of fetchers) {
    try {
      const rows = await f.run();
      if (rows.length > 0) {
        collected = collected.concat(rows);
        sources.push(f.name);
      }
    } catch {
      continue;
    }
  }

  if (collected.length === 0) {
    return {
      updated: 0,
      sources,
      note: 'Semua sumber upstream gagal/diubah — cache tetap dipakai.',
    };
  }

  const existing = await listMarketPrices();
  const nowIso = new Date().toISOString();
  const updates: MarketPriceRow[] = [];
  for (const row of existing) {
    const match = collected.find(
      (c) =>
        c.commodity === row.commodity ||
        c.commodity.includes(row.commodity) ||
        row.commodity.includes(c.commodity)
    );
    if (match && match.price !== row.price) {
      updates.push({
        ...row,
        prev_price: row.price,
        price: match.price,
        source: `upstream:${sources.join('+')}`,
        updated_at: nowIso,
      });
    }
  }
  await upsertMarketPrices(updates);
  return { updated: updates.length, sources };
}

export { SOURCE_LABEL };
