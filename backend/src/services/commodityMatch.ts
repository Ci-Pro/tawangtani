import { config } from '../config';

/**
 * Normalisasi & pencocokan nama komoditas dari bahasa bebas pengguna/model
 * ke slug kanonik di tabel market_prices.
 */

interface CacheEntry {
  slugs: string[];
  at: number;
}

let cache: CacheEntry = { slugs: [], at: 0 };
const TTL_MS = 10 * 60 * 1000;

const SYNONYMS: Record<string, string> = {
  telur_ayam_ras_segar: 'telur_ayam',
  telur: 'telur_ayam',
  telur_ayam_ras: 'telur_ayam',
  egg: 'telur_ayam',
  daging_sapi_murni: 'sapi_murni',
  sapi_potong: 'sapi_murni',
  sapi: 'sapi_murni',
  daging_sapi: 'sapi_murni',
  beef: 'sapi_murni',
  ayam_ras: 'ayam_broiler',
  ayam_potong: 'ayam_broiler',
  daging_ayam: 'ayam_broiler',
  broiler: 'ayam_broiler',
  cabai_rawit: 'cabai_rawit_merah',
  cabe_rawit: 'cabai_rawit_merah',
  rawit_merah: 'cabai_rawit_merah',
  cabai_rawit_merah_keriting: 'cabai_rawit_merah',
  cabe: 'cabai_rawit_merah',
  cabai: 'cabai_rawit_merah',
  cabai_merah: 'cabai_merah_besar',
  cabai_besar: 'cabai_merah_besar',
  bawang: 'bawang_merah',
  shallot: 'bawang_merah',
  beras: 'beras_medium',
  rice: 'beras_medium',
  gkp: 'gabah_kering_panen',
  gabah_kering: 'gabah_kering_panen',
  gkg: 'gabah_kering_giling',
  gabah_giling: 'gabah_kering_giling',
  padi: 'gabah_kering_panen',
  jagung: 'jagung_pipilan',
  corn: 'jagung_pipilan',
  minyak_goreng: 'minyak_goreng_kemasan',
  minyakita: 'minyak_goreng_curah',
  migas: 'minyak_goreng_curah',
  goreng: 'minyak_goreng_kemasan',
  gula: 'gula_pasir',
  terigu: 'tepung_terigu',
  pupuk: 'pupuk_urea',
  npk: 'pupuk_npk',
  sp36: 'pupuk_sp36',
  lpg: 'lpg_3kg',
  elpiji: 'lpg_3kg',
  semen: 'semen_portland',
  susu: 'susu_bubuk',
  garam: 'garam_halus',
  teri: 'ikan_teri',
  kacang_panjang: 'kacang_panjang',
  kangkung: 'kangkung',
  sawi: 'sawi_hijau',
  jeruk: 'jeruk_lokal',
  pisang: 'pisang_lokal',
};

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  };
}

export async function listCommoditySlugs(): Promise<string[]> {
  if (cache.slugs.length > 0 && Date.now() - cache.at < TTL_MS) return cache.slugs;
  try {
    // Paginasi wajib: tanpa itu PostgREST memotong di 1.000 baris pertama dan
    // daftar slug menjadi parsial saat tabel bertambah (mis. sinkron SP2KP).
    const seen = new Set<string>();
    for (let offset = 0; offset < 30_000; offset += 1000) {
      const res = await fetch(
        `${config.supabase.url}/rest/v1/market_prices?select=commodity&limit=1000&offset=${offset}`,
        { headers: headers() }
      );
      if (!res.ok) break;
      const rows = (await res.json()) as Array<{ commodity: string }>;
      for (const r of rows) seen.add(r.commodity);
      if (rows.length < 1000) break;
    }
    const slugs = [...seen].sort();
    if (slugs.length > 0) cache = { slugs, at: Date.now() };
    return slugs.length > 0 ? slugs : cache.slugs;
  } catch {
    return cache.slugs;
  }
}

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Kembalikan slug kanonik, atau null bila tak dikenali. */
export async function resolveCommodity(input?: string): Promise<string | undefined> {
  const norm = normalize(input ?? '');
  if (!norm) return undefined;
  const slugs = await listCommoditySlugs();
  if (slugs.length === 0) return norm;

  // 1. Persis
  if (slugs.includes(norm)) return norm;
  // 2. Sinonim map
  if (SYNONYMS[norm] && slugs.includes(SYNONYMS[norm])) return SYNONYMS[norm];
  // 3. Prefiks / berisi satu sama lain (telur_ayam_ras vs telur_ayam)
  const contains = slugs.find(
    (s) => s.startsWith(norm + '_') || norm.startsWith(s + '_') || s === norm.replace(/_(ras|segar|keriting|besar|merah)$/, '')
  );
  if (contains) return contains;
  // 4. Kata kunci inti: cocokkan token terakhir/kata unik (rawit -> cabai_rawit_merah)
  const tokens = norm.split('_').filter((t) => t.length > 3);
  for (const t of tokens.reverse()) {
    const hit = slugs.find((s) => s.split('_').includes(t));
    if (hit) return hit;
  }
  return undefined;
}
