/**
 * Sinkron harga PIHPS Kementan -> Supabase.
 * Mandiri tanpa dependensi: `node scripts/sync-prices.mjs`
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, [PROVINSI=nasional]
 *
 * Logika parsing identik dengan src/services/kemtanSync.ts (mobile) -
 * sumber kebenaran aturan pencocokan ada di sana; ubah keduanya bila berubah.
 */

const KEMTAN_BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';
const UA = 'Mozilla/5.0 (compatible; TAWANGTANI-sync/1.0)';

const PROVINCE_CODES = {
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

const COMMODITY_DEFS = {
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

const UNITS = new Set(['minyak_goreng_curah', 'minyak_goreng_kemasan']);

function normName(s) {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function parseTable(html) {
  const out = [];
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

function matchLevel(rows) {
  const used = new Set();
  const out = [];
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

async function fetchLevel(level, provinceCode) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - 3 * 86400000)),
    tanggal_akhir: fmt(new Date()),
    level_harga: level,
    kode_wilayah: provinceCode,
  });
  const res = await fetch(`${KEMTAN_BASE}?${params}`, {
    headers: { Accept: 'text/html', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseTable(await res.text());
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

async function main() {
  if (!SB || !KEY) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur');
    process.exit(1);
  }

  const onlyProv = process.env.PROVINSI?.trim().toLowerCase() ?? '';
  const provinces = onlyProv && onlyProv !== 'nasional'
    ? [onlyProv]
    : Object.keys(PROVINCE_CODES);

  const todayIso = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  let totalUpserts = 0;
  let totalHistory = 0;
  const failed = [];

  for (const prov of provinces) {
    const code = PROVINCE_CODES[prov];
    if (!code) {
      console.error(`kode wilayah tidak dikenal: ${prov}`);
      process.exit(1);
    }
    try {
      const tables = await Promise.all([
        fetchLevel('1', code).catch(() => []),
        fetchLevel('2', code).catch(() => []),
        fetchLevel('3', code).catch(() => []),
      ]);
      const matched = [];
      tables.forEach((rows, idx) => {
        for (const m of matchLevel(rows)) matched.push({ ...m, level: idx + 1 });
      });
      if (matched.length === 0) {
        failed.push(`${prov}:kosong`);
        continue;
      }

      // prev_price dari baris yang sudah ada
      const existing = await rest(
        `market_prices?select=id,commodity,level,price&province=eq.${encodeURIComponent(prov)}`,
        'GET'
      );
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
          unit: UNITS.has(c.commodity) ? 'liter' : 'kg',
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
        totalUpserts += priceRows.length;
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
      console.log(`${prov}: harga=${priceRows.length} riwayat=${historyRows.length}`);
    } catch (err) {
      failed.push(`${prov}:${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`);
    }
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log(`SELESAI provinsi=${provinces.length} harga=${totalUpserts} riwayat=${totalHistory}`);
  if (failed.length) console.log(`GAGAL(${failed.length}): ${failed.join('; ')}`);
  if (totalUpserts === 0) process.exit(2);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
