// One-off: bertasi keluar harga benar-benar tak masuk akal di market_prices
// dan market_price_history, lalu perbaiki label satuan (tabung/bungkus/kaleng/liter).
// Memakai kuota yang sama dengan priceSanity (di-salin agar skrip mandiri tanpa build).
// Usage: `set -a; . ../.env; set +a; node sanitize-prices.mjs`

const URL = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!URL || !KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.');
  process.exit(1);
}

const LIMITS = {
  gabah_kering_panen: [3000, 15000],
  gabah_kering_giling: [4000, 18000],
  beras_medium: [7000, 25000],
  beras_premium: [9000, 30000],
  beras_sphp: [6000, 22000],
  jagung_pipilan: [3000, 15000],
  kedelai_kering: [8000, 25000],
  cabai_rawit_merah: [12000, 300000],
  cabai_rawit_hijau: [10000, 200000],
  cabai_merah_besar: [12000, 200000],
  cabai_merah_keriting: [12000, 200000],
  cabai_hijau_besar: [5000, 100000],
  bawang_merah: [12000, 120000],
  bawang_putih: [15000, 80000],
  bawang_bombay: [12000, 60000],
  bawang_daun: [5000, 30000],
  tomat: [3000, 60000],
  kentang: [6000, 40000],
  wortel: [5000, 30000],
  kol: [2000, 25000],
  kacang_tanah: [10000, 50000],
  kacang_hijau: [12000, 40000],
  kacang_panjang: [4000, 30000],
  kangkung: [2000, 30000],
  sawi_hijau: [2000, 30000],
  jeruk_lokal: [5000, 30000],
  pisang_lokal: [3000, 25000],
  gula_pasir: [12000, 25000],
  minyak_goreng_curah: [10000, 30000, 'liter'],
  minyak_goreng_kemasan: [12000, 50000, 'liter'],
  tepung_terigu: [7000, 25000],
  telur_ayam: [18000, 45000],
  ayam_broiler: [20000, 60000],
  sapi_murni: [90000, 250000],
  ikan_kembung: [18000, 90000],
  ikan_bandeng: [12000, 90000],
  ikan_tongkol: [12000, 90000],
  ikan_lele: [12000, 60000],
  ikan_nila: [15000, 60000],
  ikan_teri: [25000, 150000],
  udang_windu: [45000, 300000],
  pupuk_urea: [1500, 25000],
  pupuk_npk: [1500, 25000],
  pupuk_sp36: [1500, 25000],
  pupuk_za: [1500, 20000],
  lpg_3kg: [12000, 40000, 'tabung 3 kg'],
  lpg_12kg: [160000, 500000, 'tabung 12 kg'],
  semen_portland: [500, 5000],
  mie_instan: [1000, 10000, 'bungkus'],
  garam_halus: [3000, 30000],
  susu_bubuk: [20000, 100000, 'kaleng'],
  susu_kemanis: [6000, 30000, 'kaleng'],
};

function sane(commodity, price) {
  const [min, max] = LIMITS[commodity] ?? [500, 10_000_000];
  if (!Number.isFinite(price) || price < min || price > max) return null;
  return Math.round(price);
}
const unitFor = (c) => LIMITS[c]?.[2] ?? (c === 'minyak_goreng_curah' || c === 'minyak_goreng_kemasan' ? 'liter' : 'kg');

async function rest(pathUrl, method = 'GET', body) {
  const res = await fetch(`${URL}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { Prefer: 'return=minimal' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${method} ${pathUrl.split('?')[0]} -> ${res.status}: ${t.slice(0, 160)}`);
  }
  return method === 'GET' ? res.json() : null;
}

async function fetchAll(table, extra = '') {
  const out = [];
  for (let offset = 0; offset < 100_000; offset += 1000) {
    const rows = await rest(`${table}?select=*${extra}&limit=1000&offset=${offset}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function main() {
  let deletedPrices = 0;
  let unitFixes = 0;
  const prices = await fetchAll('market_prices');
  console.log(`market_prices: ${prices.length} baris`);

  const bad = prices.filter((r) => sane(r.commodity, r.price) === null);
  console.log(`harga tak masuk akal: ${bad.length}`);
  for (const r of bad) {
    await rest(`market_prices?id=eq.${r.id}`, 'DELETE');
    deletedPrices++;
    console.log(`  [delete] ${r.commodity} ${r.province} level=${r.level}: Rp${r.price}`);
  }

  for (const r of prices.filter((x) => !bad.includes(x))) {
    const want = unitFor(r.commodity);
    if (r.unit !== want) {
      await rest(`market_prices?id=eq.${r.id}`, 'PATCH', { unit: want });
      unitFixes++;
    }
  }
  console.log(`satuan diperbaiki: ${unitFixes}`);

  // Riwayat: buang harga luar kuota agar grafik tidak ada lonjakan hantu.
  let deletedHist = 0;
  for (let offset = 0; ; ) {
    const rows = await rest(`market_price_history?select=id,commodity,price,date&limit=1000&offset=${offset}`);
    const toDel = rows.filter((r) => sane(r.commodity, r.price) === null);
    for (const r of toDel) {
      await rest(`market_price_history?id=eq.${r.id}`, 'DELETE');
      deletedHist++;
      console.log(`  [delete hist] ${r.date} ${r.commodity}: Rp${r.price}`);
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }
  console.log(`riwayat dihapus: ${deletedHist}`);

  console.log(`SELESAI: harga ${deletedPrices}, satuan ${unitFixes}, riwayat ${deletedHist}.`);
}

main().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});