import { MarketPriceRow, listMarketPrices, upsertMarketPrices } from '../store/marketPrices';

const SOURCE_LABEL = 'Referensi harga nasional (PIHPS - Panel Harga Kementan/Bapanas)';

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

/**
 * Mirror resmi Kementan: app3.pertanian.go.id/panelharga (data PIHPS Badan Pangan).
 * Endpoint export HTML tanpa API key; respons kadang terpotong saat sibuk,
 * jadi ada retry dengan backoff.
 */
const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';

function parseKemtanTable(html: string): Array<{ name: string; price: number }> {
  const out: Array<{ name: string; price: number }> = [];
  if (!/<table/i.test(html) || html.includes('Data tidak ditemukan')) return out;
  const trs = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  for (const tr of trs) {
    if (/<th/i.test(tr)) continue;
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z]+;/gi, ' ')
        .trim()
    );
    if (cells.length < 2 || !cells[0]) continue;
    let price = 0;
    for (let i = cells.length - 1; i >= 1; i--) {
      const v = Number(cells[i].replace(/[^\d]/g, ''));
      if (Number.isFinite(v) && v > 0) {
        price = Math.round(v);
        break;
      }
    }
    if (price > 0) out.push({ name: cells[0], price });
  }
  return out;
}

async function kemtanFetchLevel(level: '1' | '3'): Promise<Map<string, number>> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const end = new Date();
  const start = new Date(Date.now() - 3 * 86400000);
  const params = new URLSearchParams({
    tanggal_mulai: fmt(start),
    tanggal_akhir: fmt(end),
    level_harga: level,
    kode_wilayah: '0',
  });

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${KEMTAN_BASE}?${params}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const rows = parseKemtanTable(html);
      if (rows.length === 0 && !html.includes('Data tidak ditemukan')) {
        throw new Error(`respons terpotong (${html.length} byte)`);
      }
      const map = new Map<string, number>();
      for (const r of rows) map.set(r.name, r.price);
      return map;
    } catch (err) {
      lastErr = err as Error;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastErr ?? new Error('gagal fetch kemtan');
}

// Pemetaan nama di tabel Kementan → kunci komoditas aplikasi.
// Prioritas: konsumen (level 3) dulu — acuan harga pasar yang dilihat petani.
const KEMTAN_MAP: Record<string, Array<{ level: '1' | '3'; name: string }>> = {
  beras_medium: [
    { level: '3', name: 'Beras Medium' },
    { level: '1', name: 'Beras Medium Penggilingan' },
  ],
  jagung_pipilan: [{ level: '1', name: 'Jagung Pipilan Kering' }],
  bawang_merah: [{ level: '3', name: 'Bawang Merah' }],
  bawang_putih: [{ level: '3', name: 'Bawang Putih Bonggol' }],
  cabai_rawit_merah: [{ level: '3', name: 'Cabai Rawit Merah' }],
  cabai_merah_besar: [{ level: '1', name: 'Cabai Merah Besar' }],
};

async function kemtanPanelharga(): Promise<Array<{ commodity: string; price: number }>> {
  const [konsumen, produsen] = await Promise.all([
    kemtanFetchLevel('3'),
    kemtanFetchLevel('1').catch(() => new Map<string, number>()),
  ]);
  const byName = new Map<string, Map<string, number>>([
    ['3', konsumen],
    ['1', produsen],
  ]);
  const out: Array<{ commodity: string; price: number }> = [];
  for (const [commodity, candidates] of Object.entries(KEMTAN_MAP)) {
    for (const cand of candidates) {
      const table = byName.get(cand.level);
      const price = table?.get(cand.name);
      if (typeof price === 'number' && price > 0) {
        out.push({ commodity, price });
        break;
      }
    }
  }
  if (out.length === 0) throw new Error('tidak ada komoditas cocok');
  return out;
}

const fetchers: Fetcher[] = [
  {
    name: 'kemtan-panelharga',
    run: kemtanPanelharga,
  },
  {
    name: 'panelharga-v2',
    run: async () => {
      const key = process.env.BAPANAS_API_KEY?.trim();
      if (!key) throw new Error('BAPANAS_API_KEY belum diset');
      const res = await fetch(
        'https://api-panelhargav2.badanpangan.go.id/api/front/harga-pangan-table-v2',
        {
          headers: {
            Accept: 'application/json',
            'x-api-key': key,
            'User-Agent': 'Mozilla/5.0',
          },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data?: unknown };
      if (!json.data || typeof json.data !== 'object') throw new Error('struktur tak dikenal');
      // Struktur respons dipetakan longgar: cari daftar { komoditas/harga } di dalam data
      const out: Array<{ commodity: string; price: number }> = [];
      const walk = (node: unknown): void => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const obj = node as Record<string, unknown>;
        const name = obj.komoditas ?? obj.commodity ?? obj.nama;
        const price = obj.harga ?? obj.price ?? obj.rata_rata;
        if (typeof name === 'string' && typeof price === 'number' && price > 0) {
          out.push({ commodity: normalizeName(name), price: Math.round(price) });
        }
        Object.values(obj).forEach(walk);
      };
      walk(json.data);
      return out;
    },
  },
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
