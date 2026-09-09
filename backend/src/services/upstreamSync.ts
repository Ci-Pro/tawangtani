import { listMarketPrices, MarketPriceRow, upsertMarketPrices } from '../store/marketPrices';
import { writeSyncHealth } from '../store/syncHealth';
import { sanitizePrice, displayUnitFor } from './priceSanity';
import { snapshotToday } from './marketHistory';
import { runKemendagSync } from './kemendagSync';

/**
 * Sinkronisasi penuh harga dari Panel Harga Kementan (PIHPS).
 * Cron terjadwal 2x/hari (06:00 & 18:00 UTC) mengambil 38 provinsi × 3 tingkat
 * harga (1=Produsen, 2=Grosir/Pasar Besar, 3=Konsumen), membandingkan dengan
 * nilai tersimpan (prev_price utk perhitungan change%), lalu menyimpan snapshot
 * riwayat dan catatan kesehatan. Gagal total tidak memutus layanan lain.
 */

const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';

/** Kode wilayah resmi situs Panel Harga Kementan. */
export const PROVINCE_CODES: Record<string, string> = {
  nasional: '0',
  aceh: '11',
  'sumatera utara': '12',
  'sumatera barat': '13',
  riau: '14',
  jambi: '15',
  'sumatera selatan': '16',
  bengkulu: '17',
  lampung: '18',
  'kepulauan bangka belitung': '19',
  'kepulauan riau': '21',
  'dki jakarta': '31',
  'jawa barat': '32',
  'jawa tengah': '33',
  'd.i yogyakarta': '34',
  'jawa timur': '35',
  banten: '36',
  bali: '51',
  'nusa tenggara barat': '52',
  'nusa tenggara timur': '53',
  'kalimantan barat': '61',
  'kalimantan tengah': '62',
  'kalimantan selatan': '63',
  'kalimantan timur': '64',
  'kalimantan utara': '65',
  'sulawesi utara': '71',
  'sulawesi tengah': '72',
  'sulawesi selatan': '73',
  'sulawesi tenggara': '74',
  gorontalo: '75',
  'sulawesi barat': '76',
  maluku: '81',
  'maluku utara': '82',
  'papua barat': '92',
  papua: '91',
  'papua tengah': '94',
  'papua pegunungan': '95',
  'papua selatan': '93',
  'papua barat daya': '96',
};

/** Def. komoditas PIHPS dgn aturan kecocokan baris (baris hanya dipakai sekali). */
const COMMODITY_DEFS: Record<string, string[][]> = {
  telur_ayam: [['telur']],
  ayam_broiler: [['ayam']],
  sapi_murni: [['sapi murni'], ['sapi']],
  cabai_merah_keriting: [['keriting']],
  cabai_merah_besar: [['merah besar'], ['cabai merah']],
  cabai_hijau_besar: [['hijau besar']],
  gabah_kering_panen: [['gkp']],
  gabah_kering_giling: [['gkg']],
  beras_premium: [['premium']],
  beras_medium: [['beras medium'], ['penggilingan']],
  jagung_pipilan: [['jagung']],
  kedelai_kering: [['kedelai']],
  bawang_daun: [['bawang daun']],
  bawang_bombay: [['bomba']],
  bawang_putih: [['bawang putih']],
  bawang_merah: [['bawang merah']],
  kacang_tanah: [['kacang tanah']],
  kacang_hijau: [['kacang hijau']],
  gula_pasir: [['gula']],
  minyak_goreng_curah: [['minyak', 'curah']],
  minyak_goreng_kemasan: [['minyak', 'kemasan']],
  tepung_terigu: [['terigu']],
  tomat: [['tomat']],
  kentang: [['kentang']],
  wortel: [['wortel']],
  kol: [['kol']],
  cabai_rawit_hijau: [['rawit hijau']],
  cabai_rawit_merah: [['rawit merah'], ['rawit']],
};

function normName(s: string): string {
  return ` ${s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

function matchRule(name: string, keywords: string[]): boolean {
  return keywords.every((k) => name.includes(` ${k} `));
}

interface ParsedRow {
  name: string;
  price: number;
}

export function parseLevelTable(html: string): ParsedRow[] {
  const out: ParsedRow[] = [];
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

export function matchLevelRows(rows: ParsedRow[]): Array<{ commodity: string; price: number }> {
  const used = new Set<number>();
  const out: Array<{ commodity: string; price: number }> = [];
  for (const [commodity, rules] of Object.entries(COMMODITY_DEFS)) {
    for (const keywords of rules) {
      let found = false;
      for (let i = 0; i < rows.length; i++) {
        if (used.has(i)) continue;
        if (matchRule(normName(rows[i].name), keywords)) {
          out.push({ commodity, price: rows[i].price });
          used.add(i);
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }
  return out;
}

async function fetchLevel(
  level: '1' | '2' | '3',
  code: string
): Promise<Array<{ commodity: string; price: number }>> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - 3 * 86400000)),
    tanggal_akhir: fmt(new Date()),
    level_harga: level,
    kode_wilayah: code,
  });
  const url = `${KEMTAN_BASE}?${params}`;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const rows = parseLevelTable(html);
      if (rows.length === 0 && !html.includes('Data tidak ditemukan')) {
        throw new Error(`respons terpotong (${html.length} byte)`);
      }
      return matchLevelRows(rows);
    } catch (err) {
      lastErr = err as Error;
      await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw lastErr ?? new Error('gagal fetch');
}

export async function harvestProvince(
  province: string,
  code: string
): Promise<Array<{ commodity: string; price: number; level: number }>> {
  const [l1, l2, l3] = await Promise.all([
    fetchLevel('1', code).catch(() => []),
    fetchLevel('2', code).catch(() => []),
    fetchLevel('3', code).catch(() => []),
  ]);
  return [
    ...l1.map((p) => ({ ...p, level: 1 })),
    ...l2.map((p) => ({ ...p, level: 2 })),
    ...l3.map((p) => ({ ...p, level: 3 })),
  ];
}

/** Jalankan kumpulan pekerja async dengan konkurensi maks `limit`. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface HarvestResult {
  provinces: number;
  rows: number;
  changed: number;
  errors: string[];
  durationMs: number;
}

export async function runUpstreamSync(): Promise<HarvestResult> {
  const started = Date.now();
  const errors: string[] = [];
  const provinces = Object.entries(PROVINCE_CODES);
  let changed = 0;
  let rows = 0;

  await mapLimit(provinces, 5, async ([province, code]) => {
    try {
      const prices = await harvestProvince(province, code);
      if (prices.length === 0) return;
      const existing = await listMarketPrices(undefined, province);
      const byKey = new Map(existing.map((r) => [`${r.commodity}|${r.level ?? 3}`, r]));
      const nowIso = new Date().toISOString();
      const updates: MarketPriceRow[] = [];
      for (const p of prices) {
        const clean = sanitizePrice(p.commodity, p.price);
        if (clean === null) continue;
        const key = `${p.commodity}|${p.level}`;
        const row = byKey.get(key);
        if (row && row.price === clean) {
          // Harga tak berubah — tetap tandai hidup dengan menggeser updated_at
          // agar dataAgeHours mencerminkan "terverifikasi baru-baru ini".
          updates.push({ ...row, updated_at: nowIso });
          continue;
        }
        changed += 1;
        updates.push(
          row
            ? {
                ...row,
                prev_price: row.price,
                price: clean,
                source: 'upstream:kemtan-panelharga',
                updated_at: nowIso,
              }
            : {
                id: `${p.commodity}|${province}|${p.level}`,
                commodity: p.commodity,
                province,
                level: p.level,
                price: clean,
                prev_price: null,
                unit: displayUnitFor(p.commodity, 'kg'),
                source: 'upstream:kemtan-panelharga',
                updated_at: nowIso,
              }
        );
      }
      if (updates.length > 0) {
        await upsertMarketPrices(updates);
        rows += updates.length;
        try {
          await snapshotToday(province);
        } catch {
          // snapshot riwayat opsional; gagal tak menghentikan sinkron
        }
      }
    } catch (err) {
      errors.push(`${province}: ${(err as Error).message}`);
    }
  });

  const kemendag = await runKemendagSync();
  errors.push(...kemendag.errors);

  const result: HarvestResult = {
    provinces: provinces.length,
    rows: rows + kemendag.priceRows,
    changed,
    errors,
    durationMs: Date.now() - started,
  };
  await writeSyncHealth({
    ok: errors.length < provinces.length,
    rows,
    provinces: provinces.length.toString(),
    errors: errors.slice(0, 5).join(' | '),
    ran_at: new Date().toISOString(),
  });
  return result;
}