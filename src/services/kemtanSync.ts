import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useSettingsStore } from '@/store/useSettingsStore';

const LAST_SYNC_KEY = 'kemtan_last_ingest';
const THROTTLE_MS = 20 * 60 * 60 * 1000;

const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';

/** Kode wilayah resmi situs Panel Harga Kementan. */
export const PROVINCE_CODES: Record<string, string> = {
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
  yogyakarta: '34',
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
  'papua barat daya': '96',
  papua: '91',
  'papua selatan': '93',
  'papua tengah': '94',
  'papua pegunungan': '95',
};

export const PROVINCE_LIST: string[] = Object.keys(PROVINCE_CODES).sort();

/**
 * Definisi komoditas PIHPS dengan aturan pencocokan fuzzy terhadap nama baris
 * tabel Panel Harga Kementan (tiap tingkat harga memakai nama berbeda).
 * URUTAN penting: definisi yang lebih spesifik harus lebih dulu (mis. keriting
 * sebelum merah besar) dan satu baris tabel hanya boleh terpakai sekali.
 */
export const COMMODITY_DEFS: Record<string, string[][]> = {
  telur_ayam: [['telur']],
  ayam_broiler: [['ayam']],
  sapi_murni: [['sapi murni'], ['sapi']],
  cabai_merah_keriting: [['keriting']],
  cabai_merah_besar: [['merah besar'], ['cabai merah']],
  cabai_hijau_besar: [['hijau besar']],
  cabai_rawit_hijau: [['rawit hijau']],
  cabai_rawit_merah: [['rawit merah'], ['rawit']],
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
  ikan_kembung: [['kembung']],
  ikan_bandeng: [['bandeng']],
  ikan_tongkol: [['tongkol']],
  ikan_lele: [['lele']],
  ikan_nila: [['nila']],
  udang_windu: [['udang']],
  gabah_kering_panen: [['gkp']],
  gabah_kering_giling: [['gkg']],
  beras_premium: [['premium']],
  beras_medium: [['beras medium'], ['penggilingan']],
  jagung_pipilan: [['jagung']],
  kedelai_kering: [['kedelai']],
  tomat: [['tomat']],
  kentang: [['kentang']],
  wortel: [['wortel']],
  kol: [['kol']],
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

function parseTable(html: string): ParsedRow[] {
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

async function fetchLevel(level: '1' | '2' | '3', province?: string): Promise<ParsedRow[]> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const kode = (province && PROVINCE_CODES[province.toLowerCase()]) || '0';
  const params = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - 3 * 86400000)),
    tanggal_akhir: fmt(new Date()),
    level_harga: level,
    kode_wilayah: kode,
  });
  const res = await fetch(`${KEMTAN_BASE}?${params}`, {
    headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseTable(await res.text());
}

/** Cocokkan definisinya ke baris satu tabel tingkat harga; tiap baris dipakai maksimal sekali. */
export function matchLevel(rows: ParsedRow[]): Array<{ commodity: string; price: number }> {
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

export interface KemtanPrice {
  commodity: string;
  price: number;
  level: number;
}

/** Ambil harga ketiga tingkat PIHPS sekaligus: 1=Produsen, 2=Grosir/Pasar Besar, 3=Konsumen. */
export async function fetchKemtanPrices(province?: string): Promise<KemtanPrice[]> {
  const tables = await Promise.all([
    fetchLevel('1', province).catch(() => [] as ParsedRow[]),
    fetchLevel('2', province).catch(() => [] as ParsedRow[]),
    fetchLevel('3', province).catch(() => [] as ParsedRow[]),
  ]);
  const out: KemtanPrice[] = [];
  tables.forEach((rows, idx) => {
    for (const m of matchLevel(rows)) {
      out.push({ ...m, level: idx + 1 });
    }
  });
  if (out.length === 0) throw new Error('tidak ada harga terbaca');
  return out;
}

/**
 * Dipanggil diam-diam saat layar Harga dibuka. Maksimal sekali per ~20 jam
 * per perangkat & wilayah. Gagal diabaikan sepenuhnya.
 */
export async function syncHargaJikaPerlu(province?: string): Promise<void> {
  try {
    const provKey = (province ?? 'nasional').toLowerCase();
    const last = Number((await AsyncStorage.getItem(`${LAST_SYNC_KEY}:${provKey}`)) ?? 0);
    if (Date.now() - last < THROTTLE_MS) return;
    await AsyncStorage.setItem(`${LAST_SYNC_KEY}:${provKey}`, String(Date.now()));
    if (!isSupabaseConfigured) return;
    const backendUrl = useSettingsStore.getState().backendUrl?.trim();
    if (!backendUrl) return;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const prices = await fetchKemtanPrices(provKey === 'nasional' ? undefined : provKey);
    await fetch(`${backendUrl.replace(/\/$/, '')}/api/market/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ prices, province: provKey }),
    });
  } catch {
    // sinkronisasi latar belakang tidak boleh mengganggu pengguna
  }
}
