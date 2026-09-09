import { config } from '../config';
import { upsertMarketPrices, MarketPriceRow } from '../store/marketPrices';
import { upsertHistory } from '../store/marketHistory';
import { sanitizePrice, displayUnitFor } from './priceSanity';

/**
 * Sinkron harga SP2KP Kemendag (api-sp2kp.kemendag.go.id) -> Supabase.
 * JSON resmi, tanpa token, terbuka dari cloud, diperbarui harian.
 * Sumber kedua di dalam pipa cron (`runUpstreamSync`): memperkaya cakupan
 * komoditas (>50) yang tak tersedia di tabel HTML Panel Harga Kementan.
 */

const REPORT_API = 'https://api-sp2kp.kemendag.go.id/report/api';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/2.1)';

/** Nama varian SP2KP (ternormalisasi) -> komoditas kanonik + prioritas (kecil menang). */
const VARIANT_MAP: Record<string, [string, number]> = {
  'beras medium': ['beras_medium', 1],
  'beras premium': ['beras_premium', 1],
  'jagung lokal pipilan': ['jagung_pipilan', 1],
  'kedelai lokal': ['kedelai_kering', 1],
  'kedelai impor': ['kedelai_kering', 2],
  'cabai merah keriting': ['cabai_merah_keriting', 1],
  'cabai merah besar': ['cabai_merah_besar', 1],
  'cabai rawit hijau': ['cabai_rawit_hijau', 1],
  'cabai rawit merah': ['cabai_rawit_merah', 1],
  'bawang merah': ['bawang_merah', 1],
  'bawang putih honan': ['bawang_putih', 1],
  'bawang putih kating': ['bawang_putih', 2],
  'bawang bombai': ['bawang_bombay', 1],
  'telur ayam ras': ['telur_ayam', 1],
  'daging ayam ras': ['ayam_broiler', 1],
  'daging sapi paha belakang': ['sapi_murni', 1],
  'gula pasir kemasan': ['gula_pasir', 1],
  'gula pasir curah': ['gula_pasir', 2],
  'minyak goreng sawit curah': ['minyak_goreng_curah', 1],
  minyakita: ['minyak_goreng_curah', 2],
  'minyak goreng sawit kemasan premium': ['minyak_goreng_kemasan', 1],
  'tepung terigu': ['tepung_terigu', 1],
  'ikan bandeng': ['ikan_bandeng', 1],
  'ikan kembung': ['ikan_kembung', 1],
  'ikan tongkol': ['ikan_tongkol', 1],
  'udang basah': ['udang_windu', 1],
  'kacang tanah': ['kacang_tanah', 1],
  'kacang hijau': ['kacang_hijau', 1],
  'kentang sedang': ['kentang', 1],
  tomat: ['tomat', 1],
  'pupuk urea': ['pupuk_urea', 1],
  'pupuk npk 15 15 15': ['pupuk_npk', 1],
  'pupuk sp 36': ['pupuk_sp36', 1],
  'pupuk za': ['pupuk_za', 1],
  'lpg 3 kg subsidi': ['lpg_3kg', 1],
  'lpg 12 kg': ['lpg_12kg', 1],
  'semen portland pcc semua merek': ['semen_portland', 1],
  'mie instan': ['mie_instan', 1],
  'garam halus': ['garam_halus', 1],
  'beras sphp bulog': ['beras_sphp', 1],
  'kacang panjang': ['kacang_panjang', 1],
  kangkung: ['kangkung', 1],
  'sawi hijau': ['sawi_hijau', 1],
  'jeruk lokal': ['jeruk_lokal', 1],
  'pisang lokal': ['pisang_lokal', 1],
  'susu bubuk': ['susu_bubuk', 1],
  'susu kental manis': ['susu_kemanis', 1],
  'ikan teri': ['ikan_teri', 1],
};

const KNOWN_PROVINCES = new Set([
  'aceh', 'sumatera utara', 'sumatera barat', 'riau', 'jambi', 'sumatera selatan',
  'bengkulu', 'lampung', 'kepulauan bangka belitung', 'kepulauan riau',
  'dki jakarta', 'jawa barat', 'jawa tengah', 'd.i yogyakarta', 'jawa timur', 'banten',
  'bali', 'nusa tenggara barat', 'nusa tenggara timur',
  'kalimantan barat', 'kalimantan tengah', 'kalimantan selatan', 'kalimantan timur', 'kalimantan utara',
  'sulawesi utara', 'sulawesi tengah', 'sulawesi selatan', 'sulawesi tenggara', 'gorontalo', 'sulawesi barat',
  'maluku', 'maluku utara', 'papua', 'papua barat', 'papua barat daya',
  'papua selatan', 'papua tengah', 'papua pegunungan',
]);

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface RawRow {
  variant?: { nama?: string };
  komoditas?: { nama?: string };
  nama_provinsi?: string;
  harga?: number;
  level?: number;
}

interface Grouped {
  commodity: string;
  prov: string;
  level: number;
  prio: number;
  prices: number[];
}

async function fetchPage(tanggal: string, skip: number, take: number): Promise<RawRow[]> {
  const params = new URLSearchParams({
    filter: `["tanggal","${tanggal}"]`,
    skip: String(skip),
    take: String(take),
  });
  const res = await fetch(`${REPORT_API}/average-price-public?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`SP2KP HTTP ${res.status}`);
  const json = (await res.json()) as { data?: unknown };
  return Array.isArray(json.data) ? (json.data as RawRow[]) : [];
}

async function fetchPageRetry(tanggal: string, skip: number, take: number): Promise<RawRow[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchPage(tanggal, skip, take);
    } catch {
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

async function fetchDay(tanggal: string): Promise<RawRow[]> {
  // take sedang (400) sengaja: payload besar (1500) sering timeout dari jaringan
  // lintas benua; halaman lebih banyak tapi tiap permintaan kecil & tahan banting.
  const take = 400;
  const pages = process.env.LIMIT_PAGES === '1' ? 1 : 20;
  const skips = Array.from({ length: pages }, (_, i) => i * take);
  const settled = await Promise.all(
    skips.map((skip) => fetchPageRetry(tanggal, skip, take).then((rows) => ({ skip, rows })))
  );
  const out: RawRow[] = [];
  for (const { rows } of settled.sort((a, b) => a.skip - b.skip)) {
    if (rows === null) continue;
    out.push(...rows);
    if (rows.length < take) break;
  }
  return out;
}

async function getExistingPrices(): Promise<Map<string, number>> {
  const base = 'market_prices?select=commodity,province,level,price&source=eq.sp2kp:kemendag-api';
  const map = new Map<string, number>();
  for (let offset = 0; offset < 30_000; offset += 1000) {
    const res = await fetch(
      `${config.supabase.url}/rest/v1/${base}&limit=1000&offset=${offset}`,
      {
        headers: {
          apikey: config.supabase.serviceRoleKey,
          Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) break;
    const rows = (await res.json()) as Array<{ commodity: string; province: string; level: number; price: number }>;
    for (const r of rows) map.set(`${r.commodity}|${r.province}|${r.level}`, r.price);
    if (rows.length < 1000) break;
  }
  return map;
}

/** Baris nasional (untuk dilihat apakah perlu dikoreksi dgn median provinsi SP2KP). */
async function getNasionalRows(): Promise<Map<string, { price: number; updated_at: string }>> {
  const map = new Map<string, { price: number; updated_at: string }>();
  const res = await fetch(
    `${config.supabase.url}/rest/v1/market_prices?select=commodity,level,price,updated_at&province=eq.nasional&limit=2000`,
    {
      headers: {
        apikey: config.supabase.serviceRoleKey,
        Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (res.ok) {
    const rows = (await res.json()) as Array<{ commodity: string; level: number; price: number; updated_at: string }>;
    for (const r of rows) map.set(`${r.commodity}|${r.level}`, { price: r.price, updated_at: r.updated_at });
  }
  return map;
}

export interface KemendagSyncResult {
  priceRows: number;
  historyRows: number;
  errors: string[];
}

export async function runKemendagSync(): Promise<KemendagSyncResult> {
  const errors: string[] = [];
  try {
    const candidates = [fmtDate(new Date()), fmtDate(new Date(Date.now() - 86400000))];
    let rawRows: RawRow[] = [];
    let tanggal: string | null = null;
    for (const tgl of candidates) {
      rawRows = await fetchDay(tgl);
      if (rawRows.length > 0) {
        tanggal = tgl;
        break;
      }
    }
    if (!tanggal || rawRows.length === 0) {
      errors.push('sp2kp: tidak ada data hari ini/kemarin');
      return { priceRows: 0, historyRows: 0, errors };
    }

    const prevByKey = await getExistingPrices();
    const nowIso = new Date().toISOString();

    const grouped = new Map<string, Grouped>();
    for (const r of rawRows) {
      const vName = normName(r.variant?.nama ?? r.komoditas?.nama ?? '');
      const entry = VARIANT_MAP[vName];
      if (!entry) continue;
      const [commodity, prio] = entry;
      const prov = normName(r.nama_provinsi ?? '');
      if (!KNOWN_PROVINCES.has(prov)) continue;
      const price = Math.round(Number(r.harga));
      if (!Number.isFinite(price)) continue;
      const level = Number(r.level);
      if (![1, 2, 3].includes(level)) continue;
      const gkey = `${vName}|${prov}|${level}`;
      const old = grouped.get(gkey);
      if (old) old.prices.push(price);
      else grouped.set(gkey, { commodity, prov, level, prio, prices: [price] });
    }

    const best = new Map<string, Grouped & { price: number }>();
    for (const g of grouped.values()) {
      const avg = Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length);
      const clean = sanitizePrice(g.commodity, avg);
      if (clean === null) continue;
      const key = `${g.commodity}|${g.prov}|${g.level}`;
      const cand = { ...g, price: clean };
      const old = best.get(key);
      if (!old || cand.prio < old.prio) best.set(key, cand);
    }

    const rows = [...best.values()].map((c) => {
      const prev = prevByKey.get(`${c.commodity}|${c.prov}|${c.level}`);
      return {
        id: `${c.commodity}|${c.prov}|${c.level}`,
        commodity: c.commodity,
        province: c.prov,
        level: c.level,
        price: c.price,
        prev_price: prev !== undefined && prev !== c.price ? prev : null,
        unit: displayUnitFor(c.commodity, 'kg'),
        source: 'sp2kp:kemendag-api',
        updated_at: nowIso,
      };
    });

    if (rows.length > 0) {
      const national = await getNasionalRows();
      const medians = new Map<string, number[]>();
      for (const c of best.values()) {
        const k = `${c.commodity}|${c.level}`;
        const arr = medians.get(k) ?? [];
        arr.push(c.price);
        medians.set(k, arr);
      }
      const now = Date.now();
      const nasionalRows: MarketPriceRow[] = [];
      for (const [k, arr] of medians) {
        if (arr.length < 2) continue;
        const idx = k.lastIndexOf('|');
        const commodity = k.slice(0, idx);
        const level = Number(k.slice(idx + 1));
        const med = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        const clean = sanitizePrice(commodity, med);
        if (clean === null) continue;
        const row = national.get(k);
        const stale =
          !row || Date.now() - new Date(row.updated_at).getTime() > 24 * 3_600_000;
        if (!stale) continue;
        nasionalRows.push({
          id: `${commodity}|nasional|${level}`,
          commodity,
          province: 'nasional',
          level,
          price: clean,
          prev_price: row && row.price !== clean ? row.price : null,
          unit: displayUnitFor(commodity, 'kg'),
          source: 'sp2kp:kemendag-api',
          updated_at: new Date(now).toISOString(),
        });
      }

      await upsertMarketPrices(rows);
      if (nasionalRows.length > 0) await upsertMarketPrices(nasionalRows);
      const historyRows = rows.map((r) => ({
        commodity: r.commodity,
        province: r.province,
        level: r.level,
        date: tanggal!,
        price: r.price,
        source: 'sp2kp-kemendag',
      }));
      await upsertHistory(historyRows);
      return { priceRows: rows.length + nasionalRows.length, historyRows: historyRows.length, errors };
    }
    return { priceRows: 0, historyRows: 0, errors };
  } catch (err) {
    errors.push(`sp2kp: ${(err as Error).message}`);
    return { priceRows: 0, historyRows: 0, errors };
  }
}