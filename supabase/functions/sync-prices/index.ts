// Supabase Edge Function: sinkron harga PIHPS Kementan -> Supabase.
// Dipanggil oleh pg_cron 2x/hari dengan header x-cron-secret.
// Logika parsing identik dengan backend/scripts/sync-prices.mjs & mobile kemtanSync.

const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/1.0)';

const PROVINCE_CODES: Record<string, string> = {
  aceh: '11', 'sumatera utara': '12', 'sumatera barat': '13', riau: '14', jambi: '15',
  'sumatera selatan': '16', bengkulu: '17', lampung: '18', 'kepulauan bangka belitung': '19',
  'kepulauan riau': '21', 'dki jakarta': '31', 'jawa barat': '32', 'jawa tengah': '33',
  'd.i yogyakarta': '34', yogyakarta: '34', 'jawa timur': '35', banten: '36', bali: '51',
  'nusa tenggara barat': '52', 'nusa tenggara timur': '53', 'kalimantan barat': '61',
  'kalimantan tengah': '62', 'kalimantan selatan': '63', 'kalimantan timur': '64',
  'kalimantan utara': '65', 'sulawesi utara': '71', 'sulawesi tengah': '72',
  'sulawesi selatan': '73', 'sulawesi tenggara': '74', gorontalo: '75', 'sulawesi barat': '76',
  maluku: '81', 'maluku utara': '82', 'papua barat': '92', 'papua barat daya': '96',
  papua: '91', 'papua selatan': '93', 'papua tengah': '94', 'papua pegunungan': '95',
};

const COMMODITY_DEFS: Record<string, string[][]> = {
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

const LITER_UNITS = new Set(['minyak_goreng_curah', 'minyak_goreng_kemasan']);

function normName(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
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
      m[1].replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
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

function matchLevel(rows: ParsedRow[]): Array<{ commodity: string; price: number }> {
  const used = new Set<number>();
  const out: Array<{ commodity: string; price: number }> = [];
  for (const [commodity, rules] of Object.entries(COMMODITY_DEFS)) {
    for (const keywords of rules) {
      let found = false;
      for (let i = 0; i < rows.length; i++) {
        if (used.has(i)) continue;
        const nm = normName(rows[i].name);
        if (keywords.every((k) => nm.includes(` ${k} `))) {
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

async function fetchLevel(level: string, code: string): Promise<{ rows: ParsedRow[]; status: number; bytes: number }> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - 3 * 864e5)),
    tanggal_akhir: fmt(new Date()),
    level_harga: level,
    kode_wilayah: code,
  });
  const res = await fetch(`${KEMTAN_BASE}?${params}`, {
    headers: { Accept: 'text/html', 'User-Agent': UA },
  });
  const text = await res.text();
  return { rows: res.ok ? parseTable(text) : [], status: res.status, bytes: text.length };
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

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('CRON_SYNC_SECRET') ?? '';
  if (req.headers.get('x-cron-secret') !== secret || !secret) {
    return new Response(JSON.stringify({ error: 'tidak diizinkan' }), { status: 401 });
  }

  const url = new URL(req.url);
  const onlyProv = (url.searchParams.get('provinsi') ?? '').toLowerCase();
  const provinces = onlyProv && onlyProv !== 'nasional' && PROVINCE_CODES[onlyProv]
    ? [onlyProv]
    : Object.keys(PROVINCE_CODES);

  const todayIso = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  let totalPrices = 0;
  let totalHistory = 0;
  const failed: string[] = [];
  const debug: Record<string, unknown> = {};

  for (const prov of provinces) {
    try {
      const tables = await Promise.all([
        fetchLevel('1', PROVINCE_CODES[prov]).catch((e) => ({ rows: [], status: -1, bytes: String(e).slice(0, 60) })),
        fetchLevel('2', PROVINCE_CODES[prov]).catch((e) => ({ rows: [], status: -2, bytes: String(e).slice(0, 60) })),
        fetchLevel('3', PROVINCE_CODES[prov]).catch((e) => ({ rows: [], status: -3, bytes: String(e).slice(0, 60) })),
      ]);
      if (provinces.length === 1) {
        debug.statusPerLevel = tables.map((t) => t.status);
        debug.bytesPerLevel = tables.map((t) => t.bytes);
      }
      const matched: Array<{ commodity: string; price: number; level: number }> = [];
      tables.forEach((rowsObj, idx) => {
        for (const m of matchLevel(rowsObj.rows)) matched.push({ ...m, level: idx + 1 });
      });
      if (matched.length === 0) {
        failed.push(`${prov}:kosong`);
        continue;
      }

      const existing = (await rest(
        `market_prices?select=id,commodity,level,price&province=eq.${encodeURIComponent(prov)}`,
        'GET'
      )) as Array<{ commodity: string; level: number; price: number }>;
      const byKey = new Map(existing.map((r) => [`${r.commodity}|${r.level}`, r]));

      const priceRows = [];
      const historyRows = [];
      for (const c of matched) {
        if (c.price < 500 || c.price > 10_000_000) continue;
        const old = byKey.get(`${c.commodity}|${c.level}`);
        priceRows.push({
          id: `${c.commodity}|${prov}|${c.level}`,
          commodity: c.commodity,
          province: prov,
          level: c.level,
          price: c.price,
          prev_price: old && old.price !== c.price ? old.price : null,
          unit: LITER_UNITS.has(c.commodity) ? 'liter' : 'kg',
          source: 'upstream:kemtan-panelharga',
          updated_at: nowIso,
        });
        historyRows.push({
          commodity: c.commodity,
          province: prov,
          level: c.level,
          date: todayIso,
          price: c.price,
          source: 'pihps-kementan',
        });
      }

      if (priceRows.length) {
        await rest(
          'market_prices?on_conflict=commodity,province,level',
          'POST',
          priceRows,
          'resolution=merge-duplicates,return=minimal'
        );
        totalPrices += priceRows.length;
      }
      if (historyRows.length) {
        await rest(
          'market_price_history?on_conflict=commodity,province,level,date',
          'POST',
          historyRows,
          'resolution=merge-duplicates,return=minimal'
        );
        totalHistory += historyRows.length;
      }
    } catch (err) {
      failed.push(`${prov}:${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: totalPrices > 0,
      provinsi: provinces.length,
      harga: totalPrices,
      riwayat: totalHistory,
      gagal: failed.length ? failed : undefined,
      debug,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
