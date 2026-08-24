import { config } from '../config';

/**
 * Normalisasi & pencocokan nama provinsi dari input bebas model/pengguna
 * ke slug kanonik di tabel market_prices (huruf kecil, contoh: "dki jakarta").
 */

interface CacheEntry {
  provinces: string[];
  at: number;
}

let cache: CacheEntry = { provinces: [], at: 0 };
const TTL_MS = 10 * 60 * 1000;

/** Alias -> pola kanonik; %s diganti token berikutnya bila berbentuk fungsi. */
const ALIASES: Record<string, string> = {
  jakarta: 'dki jakarta',
  dki: 'dki jakarta',
  'd.k.i': 'dki jakarta',
  jogja: 'd.i yogyakarta',
  yogya: 'd.i yogyakarta',
  yogyakarta: 'd.i yogyakarta',
  diy: 'd.i yogyakarta',
  'di yogyakarta': 'd.i yogyakarta',
  'daerah istimewa yogyakarta': 'd.i yogyakarta',
  babel: 'kepulauan bangka belitung',
  bangka: 'kepulauan bangka belitung',
  'bangka belitung': 'kepulauan bangka belitung',
  kepri: 'kepulauan riau',
  ntt: 'nusa tenggara timur',
  ntb: 'nusa tenggara barat',
  kalbar: 'kalimantan barat',
  kalteng: 'kalimantan tengah',
  kalsel: 'kalimantan selatan',
  kaltim: 'kalimantan timur',
  kaltara: 'kalimantan utara',
  sulsel: 'sulawesi selatan',
  sulut: 'sulawesi utara',
  sulteng: 'sulawesi tengah',
  sultra: 'sulawesi tenggara',
  sulbar: 'sulawesi barat',
  malut: 'maluku utara',
  paprabar: 'papua barat',
};

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
  };
}

export async function listMarketProvinces(): Promise<string[]> {
  if (cache.provinces.length > 0 && Date.now() - cache.at < TTL_MS) return cache.provinces;
  try {
    const res = await fetch(`${config.supabase.url}/rest/v1/market_prices?select=province`, {
      headers: headers(),
    });
    if (!res.ok) return cache.provinces;
    const rows = (await res.json()) as Array<{ province: string }>;
    const provinces = [...new Set(rows.map((r) => r.province))].filter((p) => p !== 'nasional').sort();
    cache = { provinces, at: Date.now() };
    return provinces;
  } catch {
    return cache.provinces;
  }
}

function normalize(input: string): string {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/\s+/g, ' ');
  s = s.replace(/^(provinsi|propinsi|prov|prop)\s+/, '');
  // varian ejaan umum
  s = s.replace(/sumatra/g, 'sumatera');
  return s.trim();
}

/** Kembalikan slug provinsi kanonik, atau null bila tak dikenali. */
export async function resolveProvince(input?: string): Promise<string | null> {
  const norm = normalize(input ?? '');
  if (!norm || norm === 'nasional') return norm === 'nasional' ? 'nasional' : null;
  const provinces = await listMarketProvinces();
  if (provinces.length === 0) return norm;

  // 1. Persis
  if (provinces.includes(norm)) return norm;
  // 2. Alias map
  const aliasHit = ALIASES[norm] ?? ALIASES[norm.replace(/\s+/g, ' ')];
  if (aliasHit && provinces.includes(aliasHit)) return aliasHit;
  // 3. Set token identik ("utara sumatera" vs "sumatera utara")
  const normTokens = norm.split(' ').sort().join('|');
  const sameTokens = provinces.find((p) => p.split(' ').sort().join('|') === normTokens);
  if (sameTokens) return sameTokens;
  // 4. Satu mengandung yang lain; pilih yang TERPENDEK agar "riau"
  //    tidak tertelan "kepulauan riau"
  const containsList = provinces.filter((p) => p.includes(norm) || norm.includes(p));
  if (containsList.length > 0) {
    return containsList.sort((a, b) => a.length - b.length)[0];
  }
  // 5. Token inti: kata terpanjang cocok
  const tokens = norm.split(' ').filter((t) => t.length > 2);
  tokens.sort((a, b) => b.length - a.length);
  for (const t of tokens) {
    const hit = provinces.find((p) => p.split(' ').includes(t));
    if (hit) return hit;
  }
  return null;
}
