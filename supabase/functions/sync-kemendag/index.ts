// Supabase Edge Function: sinkron harga harian SP2KP Kemendag -> Supabase.
// Sumber resmi Kementerian Perdagangan, terbuka dari cloud, tanpa token.
// Dipanggil pg_cron harian dengan header x-cron-secret (sama dengan sync-prices).
// Waktu respons SP2KP linier terhadap jumlah baris (~19 ms/baris), sehingga data
// diambil dengan banyak halaman kecil SECARA PARALEL (spekulatif), lalu halaman
// setelah halaman pertama yang tidak penuh dibuang.

const REPORT_API = 'https://api-sp2kp.kemendag.go.id/report/api';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/2.0)';

/** Nama varian SP2KP (dinormalisasi) -> [komoditas kanonik aplikasi, prioritas]. */
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
  });
  if (!res.ok) throw new Error(`SP2KP HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

async function fetchPageRetry(tanggal: string, skip: number, take: number): Promise<SpRow[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchPage(tanggal, skip, take);
    } catch (_e) {
      if (attempt === 1) return null;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

async function fetchDay(tanggal: string): Promise<{ rows: SpRow[]; failedPages: number }> {
  const take = 1500;
  const skips = Array.from({ length: 16 }, (_, i) => i * take);
  const settled = await Promise.all(
    skips.map((skip) => fetchPageRetry(tanggal, skip, take).then((rows) => ({ skip, rows })))
  );
  const out: SpRow[] = [];
  let failedPages = 0;
  for (const { rows } of settled.sort((a, b) => a.skip - b.skip)) {
    if (rows === null) {
      // halaman gagal: lanjut ke halaman berikutnya, jangan memotong data
      failedPages++;
      continue;
    }
    out.push(...rows);
    if (rows.length < take) break;
  }
  return { rows: out, failedPages };
}

const SB = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function rest(pathUrl: string, method: string, body?: unknown, prefer?: string): Promise<unknown> {
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
    throw new Error(`REST ${method} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return method === 'GET' ? await res.json() : null;
}

async function handle(req: Request): Promise<Response> {
  const secret = Deno.env.get('CRON_SYNC_SECRET') ?? '';
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'tidak diizinkan' }), { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const requested = (url.searchParams.get('tanggal') ?? '').trim();
    const candidates = requested
      ? [requested]
      : [fmtDate(new Date()), fmtDate(new Date(Date.now() - 864e5))];

    let rows: SpRow[] | null = null;
    let tanggal = '';
    const skippedDays: string[] = [];
    let failedPages = 0;
    for (const tgl of candidates) {
      const day = await fetchDay(tgl);
      if (day.rows.length > 0) {
        rows = day.rows;
        failedPages = day.failedPages;
        tanggal = tgl;
        break;
      }
      skippedDays.push(tgl);
    }
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'tidak ada data', skippedDays }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kumpulkan per varian (rata-rata bila satu provinsi punya baris per kabupaten),
    // lalu pilih varian prioritas tertinggi per (komoditas|provinsi|level).
    const grouped = new Map<
      string,
      { commodity: string; prov: string; level: number; prio: number; prices: number[] }
    >();
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
      const gkey = `${vName}|${prov}|${level}`;
      const old = grouped.get(gkey);
      if (old) old.prices.push(price);
      else grouped.set(gkey, { commodity, prov, level, prio, prices: [price] });
    }

    const best = new Map<
      string,
      { commodity: string; prov: string; level: number; prio: number; price: number }
    >();
    for (const g of grouped.values()) {
      const key = `${g.commodity}|${g.prov}|${g.level}`;
      const cand = { ...g, price: Math.round(g.prices.reduce((a, b) => a + b, 0) / g.prices.length) };
      const old = best.get(key);
      if (!old || cand.prio < old.prio) best.set(key, cand);
    }

    // paginasi penuh (batas PostgREST 1.000 baris)
    const existing: Array<{ commodity: string; province: string; level: number; price: number }> = [];
    for (let offset = 0; offset < 30_000; offset += 1000) {
      const pageRows = (await rest(
        `market_prices?select=commodity,province,level,price&source=eq.sp2kp:kemendag-api&limit=1000&offset=${offset}`,
        'GET'
      )) as Array<{ commodity: string; province: string; level: number; price: number }>;
      existing.push(...pageRows);
      if (pageRows.length < 1000) break;
    }
    const prevByKey = new Map(
      existing.map((r) => [`${r.commodity}|${r.province}|${r.level}`, r.price])
    );

    const nowIso = new Date().toISOString();
    const priceRows: unknown[] = [];
    const historyRows: unknown[] = [];
    for (const c of best.values()) {
      const old = prevByKey.get(`${c.commodity}|${c.prov}|${c.level}`);
      priceRows.push({
        id: `${c.commodity}|${c.prov}|${c.level}`,
        commodity: c.commodity,
        province: c.prov,
        level: c.level,
        price: c.price,
        prev_price: old !== undefined && old !== c.price ? old : null,
        unit: LITER_COMMODITIES.has(c.commodity) ? 'liter' : 'kg',
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

    if (priceRows.length > 0) {
      await rest(
        'market_prices?on_conflict=commodity,province,level',
        'POST',
        priceRows,
        'resolution=merge-duplicates,return=minimal'
      );
    }
    let totalHistory = 0;
    for (let i = 0; i < historyRows.length; i += 500) {
      await rest(
        'market_price_history?on_conflict=commodity,province,level,date',
        'POST',
        historyRows.slice(i, i + 500),
        'resolution=merge-duplicates,return=minimal'
      );
      totalHistory += Math.min(500, historyRows.length - i);
    }

    const provinces = new Set(priceRows.map((r) => (r as { province: string }).province));
    console.log(
      `[sync-kemendag] ${tanggal}: ${priceRows.length} harga, ${provinces.size} provinsi, mentah=${rows.length}, variantakkenal=${unknownVariants}`
    );
    return new Response(
      JSON.stringify({
        ok: true,
        tanggal,
        fetched: rows.length,
        prices: priceRows.length,
        provinces: provinces.size,
        riwayat: totalHistory,
        unknownVariants,
        failedPages: failedPages || undefined,
        skippedDays: skippedDays.length ? skippedDays : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-kemendag] gagal:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve((req: Request) => {
  // pg_net/pg_cron memutus koneksi setelah 5 dtk; proses sinkron tetap
  // dikerjakan di latar sehingga jadwal harian tidak gagal.
  const bg = handle(req);
  const edge = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  if (edge?.waitUntil) {
    edge.waitUntil(bg.catch((e) => console.error('[sync-kemendag] latar gagal:', e)));
    return new Response(JSON.stringify({ ok: true, queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return bg;
});
