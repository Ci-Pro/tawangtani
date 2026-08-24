/**
 * Sinkron harga harian SP2KP Kemendag (api-sp2kp.kemendag.go.id).
 *
 * Sumber resmi Kementerian Perdagangan, TERBUKA dari cloud (terverifikasi
 * HTTP 200 dari runner GitHub Actions), tanpa token, diperbarui harian.
 * Menggantikan ketergantungan pada panelharga Kementan yang memblokir WAF.
 */
import { listMarketPrices, upsertMarketPrices } from '../store/marketPrices';
import { upsertHistory } from '../store/marketHistory';

const REPORT_API = 'https://api-sp2kp.kemendag.go.id/report/api';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/2.0)';

/** Nama varian SP2KP (dinormalisasi) -> [komoditas kanonik, prioritas]. */
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
};

const LITER_COMMODITIES = new Set(['minyak_goreng_curah', 'minyak_goreng_kemasan']);

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

interface SpRow {
  tanggal?: string;
  nama_provinsi?: string;
  level?: number;
  harga?: number;
  komoditas?: { nama?: string };
  variant?: { nama?: string };
}

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchPage(tanggal: string, skip: number, take: number): Promise<SpRow[]> {
  const params = new URLSearchParams({
    filter: `["tanggal","${tanggal}"]`,
    skip: String(skip),
    take: String(take),
  });
  const res = await fetch(`${REPORT_API}/average-price-public?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`SP2KP HTTP ${res.status}`);
  const json = (await res.json()) as { data?: SpRow[] };
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchDay(tanggal: string): Promise<SpRow[]> {
  const out: SpRow[] = [];
  const take = 3000;
  for (let skip = 0; ; skip += take) {
    const page = await fetchPage(tanggal, skip, take);
    out.push(...page);
    if (page.length < take || skip > 60_000) break;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return out;
}

export interface SyncResult {
  tanggal: string;
  fetched: number;
  prices: number;
  provinces: number;
  unknownVariants: number;
  skippedDays: string[];
}

export async function runKemendagSync(requestedDate?: string): Promise<SyncResult> {
  const candidates = requestedDate?.trim()
    ? [requestedDate.trim()]
    : [fmtDate(new Date()), fmtDate(new Date(Date.now() - 86_400_000))];

  let rows: SpRow[] | null = null;
  let tanggal = '';
  const skippedDays: string[] = [];
  for (const tgl of candidates) {
    rows = await fetchDay(tgl);
    if (rows.length > 0) {
      tanggal = tgl;
      break;
    }
    skippedDays.push(tgl);
  }
  if (!rows || rows.length === 0) throw new Error('Tidak ada data SP2KP pada tanggal mana pun');
  const fetched = rows.length;

  // prioritas varian terbaik per (komoditas|provinsi|level)
  const best = new Map<string, { commodity: string; prov: string; level: number; price: number; prio: number }>();
  let unknownVariants = 0;

  for (const r of rows) {
    const vName = normName(r.variant?.nama ?? r.komoditas?.nama ?? '');
    const entry = VARIANT_MAP[vName];
    if (!entry) {
      unknownVariants++;
      continue;
    }
    const [commodity, prio] = entry;
    const prov = normName(r.nama_provinsi ?? '');
    if (!KNOWN_PROVINCES.has(prov)) continue;
    const price = Math.round(Number(r.harga));
    if (!Number.isFinite(price) || price < 500 || price > 10_000_000) continue;
    const level = Number(r.level);
    if (![1, 2, 3].includes(level)) continue;
    const key = `${commodity}|${prov}|${level}`;
    const old = best.get(key);
    if (!old || prio < old.prio) best.set(key, { commodity, prov, level, price, prio });
  }

  // prev_price dari baris sumber ini yang sudah tersimpan
  const existing = await listMarketPrices();
  const prevByKey = new Map(
    existing.filter((r) => r.source === 'sp2kp:kemendag-api').map((r) => [`${r.commodity}|${r.province}|${r.level}`, r.price])
  );

  const nowIso = new Date().toISOString();
  const priceRows = [...best.values()].map((c) => ({
    id: `${c.commodity}|${c.prov}|${c.level}`,
    commodity: c.commodity,
    province: c.prov,
    level: c.level,
    price: c.price,
    prev_price: prevByKey.get(`${c.commodity}|${c.prov}|${c.level}`) ?? null,
    unit: LITER_COMMODITIES.has(c.commodity) ? 'liter' : 'kg',
    source: 'sp2kp:kemendag-api',
    updated_at: nowIso,
  }));

  const historyRows = [...best.values()].map((c) => ({
    commodity: c.commodity,
    province: c.prov,
    level: c.level,
    date: tanggal,
    price: c.price,
    source: 'sp2kp-kemendag',
  }));

  await upsertMarketPrices(priceRows);
  for (let i = 0; i < historyRows.length; i += 500) {
    await upsertHistory(historyRows.slice(i, i + 500));
  }

  return {
    tanggal,
    fetched,
    prices: priceRows.length,
    provinces: new Set(priceRows.map((r) => r.province)).size,
    unknownVariants,
    skippedDays,
  };
}
