/**
 * Sinkron harga SP2KP Kemendag (api-sp2kp.kemendag.go.id) -> Supabase.
 *
 * Sumber ini TERBUKA dari cloud (terverifikasi 200 di GitHub Actions),
 * resmi Kementerian Perdagangan, tanpa token, diperbarui harian.
 *
 * Mandiri tanpa dependensi:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-kemendag.mjs
 * Env opsional: TANGGAL=YYYY-MM-DD (default: hari ini, fallback kemarin)
 */

const REPORT_API = 'https://api-sp2kp.kemendag.go.id/report/api';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/2.0)';

/** Nama varian SP2KP (dinormalisasi) -> komoditas kanonik aplikasi.
 *  Angka = prioritas bila beberapa varian jatuh ke komoditas yang sama (kecil menang). */
const VARIANT_MAP = {
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

const LITER_COMODITIES = new Set(['minyak_goreng_curah', 'minyak_goreng_kemasan']);

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

function normName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function fetchPage(tanggal, skip, take) {
  const params = new URLSearchParams({
    filter: `["tanggal","${tanggal}"]`,
    skip: String(skip),
    take: String(take),
  });
  const res = await fetch(`${REPORT_API}/average-price-public?${params}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`SP2KP HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchPageRetry(tanggal, skip, take) {
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

async function fetchDay(tanggal) {
  const take = 1500;
  const skips = Array.from({ length: process.env.LIMIT_PAGES === '1' ? 1 : 16 }, (_, i) => i * take);
  const settled = await Promise.all(
    skips.map((skip) => fetchPageRetry(tanggal, skip, take).then((rows) => ({ skip, rows })))
  );
  const out = [];
  let failedPages = 0;
  for (const { rows } of settled.sort((a, b) => a.skip - b.skip)) {
    if (rows === null) {
      failedPages++;
      continue;
    }
    out.push(...rows);
    if (rows.length < take) break;
  }
  return out;
}

const SB = process.env.SUPABASE_URL?.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest(pathUrl, method, body, prefer) {
  const res = await fetch(`${SB}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`REST ${method} ${pathUrl.split('?')[0]} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return method === 'GET' ? res.json() : null;
}

function transform(rawRows, tanggal, nowIso, prevByKey) {
  // kumpulkan per varian (rata-rata bila ada baris per kabupaten),
  // lalu pilih varian prioritas tertinggi per (komoditas|provinsi|level)
  const grouped = new Map();
  let skippedUnknownVariant = 0;
  let skippedUnknownProvince = 0;

  for (const r of rawRows) {
    const vName = normName((r.variant?.nama ?? r.komoditas?.nama ?? ''));
    const entry = VARIANT_MAP[vName];
    if (!entry) {
      skippedUnknownVariant++;
      continue;
    }
    const [commodity, prio] = entry;
    const prov = normName(r.nama_provinsi ?? '');
    if (!KNOWN_PROVINCES.has(prov)) {
      skippedUnknownProvince++;
      continue;
    }
    const price = Math.round(Number(r.harga));
    if (!Number.isFinite(price) || price < 500 || price > 10_000_000) continue;
    const level = Number(r.level);
    if (![1, 2, 3].includes(level)) continue;
    const gkey = `${vName}|${prov}|${level}`;
    const old = grouped.get(gkey);
    if (old) old.prices.push(price);
    else grouped.set(gkey, { commodity, prov, level, prio, prices: [price] });
  }

  const best = new Map();
  for (const g of grouped.values()) {
    const key = `${g.commodity}|${g.prov}|${g.level}`;
    const cand = {
      commodity: g.commodity, prov: g.prov, level: g.level, prio: g.prio,
      price: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length),
    };
    const old = best.get(key);
    if (!old || cand.prio < old.prio) best.set(key, cand);
  }

  const priceRows = [];
  const historyRows = [];
  for (const c of best.values()) {
    const old = prevByKey.get(`${c.commodity}|${c.prov}|${c.level}`);
    priceRows.push({
      id: `${c.commodity}|${c.prov}|${c.level}`,
      commodity: c.commodity,
      province: c.prov,
      level: c.level,
      price: c.price,
      prev_price: old && old !== c.price ? old : null,
      unit: LITER_COMODITIES.has(c.commodity) ? 'liter' : 'kg',
      source: 'sp2kp:kemendag-api',
      updated_at: nowIso,
    });
    historyRows.push({
      commodity: c.commodity,
      province: c.prov,
      level: c.level,
      date: tanggal,
      price: c.price,
      source: 'sp2kp-kemendag',
    });
  }
  return { priceRows, historyRows, skippedUnknownVariant, skippedUnknownProvince };
}

async function main() {
  if (!SB || !KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur');
    process.exit(1);
  }

  const argDate = process.env.TANGGAL?.trim();
  const nowIso = new Date().toISOString();
  const candidates = argDate ? [argDate] : [fmtDate(new Date()), fmtDate(new Date(Date.now() - 86400000))];

  let rawRows = null;
  let tanggal = null;
  for (const tgl of candidates) {
    process.stdout.write(`mengambil ${tgl} ... `);
    rawRows = await fetchDay(tgl);
    console.log(`${rawRows.length} baris mentah`);
    if (rawRows.length > 0) {
      tanggal = tgl;
      break;
    }
  }
  if (!rawRows || rawRows.length === 0) {
    console.error('Tidak ada data pada tanggal mana pun — berhenti tanpa mengubah DB.');
    process.exit(2);
  }

  const existing = await rest(
    'market_prices?select=commodity,province,level,price&source=eq.sp2kp:kemendag-api',
    'GET'
  ).catch(() => []);
  const prevByKey = new Map(existing.map((r) => [`${r.commodity}|${r.province}|${r.level}`, r.price]));

  const { priceRows, historyRows, skippedUnknownVariant, skippedUnknownProvince } = transform(
    rawRows, tanggal, nowIso, prevByKey
  );

  console.log(`terpetakan: ${priceRows.length} harga | varian tak dikenal: ${skippedUnknownVariant} | provinsi tak dikenal: ${skippedUnknownProvince}`);

  if (priceRows.length > 0) {
    await rest('market_prices?on_conflict=commodity,province,level', 'POST', priceRows, 'resolution=merge-duplicates,return=minimal');
    console.log(`market_prices: ${priceRows.length} baris tersimpan`);
  }
  if (historyRows.length > 0) {
    for (let i = 0; i < historyRows.length; i += 500) {
      await rest(
        'market_price_history?on_conflict=commodity,province,level,date',
        'POST',
        historyRows.slice(i, i + 500),
        'resolution=merge-duplicates,return=minimal'
      );
    }
    console.log(`market_price_history: ${historyRows.length} baris tersimpan`);
  }

  const byProv = new Set(priceRows.map((r) => r.province));
  console.log(`SELESAI ${tanggal}: ${byProv.size} provinsi, ${priceRows.length} harga.`);
}

main().catch((e) => {
  console.error('sinkron gagal:', e.message);
  process.exit(1);
});
