/**
 * Backfill riwayat harga RIIL per provinsi x tingkat (Produsen=1, Konsumen=3)
 * dari mirror Panel Harga Kementan. Jalankan dari mesin lokal (IP Indonesia /
 * tidak diblokir WAF), bukan dari Vercel.
 *
 * Pemakaian:
 *   NODE_PATH=node_modules npx tsx scripts/backfill-provinces.ts [hari=90]
 */
import { readFileSync } from 'fs';
import { config } from '../src/config';

const BASE = 'https://app3.pertanian.go.id/panelharga/export_harian_excel.php';
const SOURCE = 'pihps-kementan';

const PROVINCES: Record<string, string> = {
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

const UNITS: Record<string, string> = { minyak_goreng_curah: 'liter', minyak_goreng_kemasan: 'liter' };

// Aturan fuzzy sama dengan src/services/kemtanSync.ts (mobile)
const DEFS: Record<string, string[][]> = {
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
  minyak_goreng_curah: [['minyak', 'curah'], ['minyak goreng']],
  minyak_goreng_kemasan: [['minyak', 'kemasan'], ['minyak', 'merek']],
  tepung_terigu: [['terigu']],
  ikan_kembung: [['kembung']],
  ikan_bandeng: [['bandeng']],
  ikan_tongkol: [['tongkol']],
  ikan_lele: [['lele']],
  ikan_nila: [['nila']],
  udang_windu: [['udang']],
  gabah_kering_panen: [['gkp'], ['gabah kering panen']],
  gabah_kering_giling: [['gkg'], ['gabah kering giling']],
  beras_premium: [['premium']],
  beras_medium: [['beras medium'], ['beras']],
  jagung_pipilan: [['jagung']],
  kedelai_kering: [['kedelai']],
  tomat: [['tomat']],
  kentang: [['kentang']],
  wortel: [['wortel']],
  kol: [['kol']],
};

const norm = (s: string): string =>
  ' ' + s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const hit = (n: string, kw: string[]): boolean => kw.every((k) => n.includes(' ' + k + ' '));

interface Cell {
  name: string;
  prices: Array<{ date: string; price: number }>;
}

/** Tabel mirror multi-hari: header berisi tanggal dd-mm-yyyy, tiap baris satu komoditas. */
function parseTable(html: string): Cell[] {
  if (!/<table/i.test(html) || html.includes('Data tidak ditemukan')) return [];
  const trs = html.match(/<tr>[\s\S]*?<\/tr>/gi) ?? [];
  let dates: string[] = [];
  const out: Cell[] = [];
  for (const tr of trs) {
    const cells =
      [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        m[1].replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
      ) ?? [];
    const thCells =
      [...tr.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
        m[1].replace(/<[^>]*>/g, '').trim()
      );
    const all = [...cells, ...thCells].filter(Boolean);
    if (all.length === 0) continue;
    if (!dates.length && all.some((c) => /\d{2}-\d{2}-\d{4}/.test(c))) {
      dates = all
        .filter((c) => /\d{2}-\d{2}-\d{4}/.test(c))
        .map((c) => {
          const [dd, mm, yy] = c.match(/\d{2}-\d{2}-\d{4}/)![0].split('-');
          return `${yy}-${mm}-${dd}`;
        });
      continue;
    }
    const name = cells.find(Boolean);
    if (!name || dates.length === 0) continue;
    const nums = cells.slice(1).map((c) => Number(c.replace(/[^\d]/g, '')));
    const prices: Array<{ date: string; price: number }> = [];
    for (let i = 0; i < Math.min(dates.length, nums.length); i++) {
      const v = nums[i];
      if (Number.isFinite(v) && v >= 500 && v <= 10_000_000) {
        prices.push({ date: dates[i], price: v });
      }
    }
    if (prices.length > 0) out.push({ name, prices });
  }
  return out;
}

async function fetchLevel(level: number, kodeWilayah: string, days: number): Promise<Cell[]> {
  const fmt = (d: Date): string => d.toISOString().slice(0, 10);
  const p = new URLSearchParams({
    tanggal_mulai: fmt(new Date(Date.now() - days * 864e5)),
    tanggal_akhir: fmt(new Date()),
    level_harga: String(level),
    kode_wilayah: kodeWilayah,
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${BASE}?${p}`, {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return parseTable(await r.text());
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((res) => setTimeout(res, 3000 * attempt));
    }
  }
  return [];
}

function matchLevel(cells: Cell[]): Map<string, Map<string, number>> {
  // commodity -> (date -> price)
  const used = new Set<number>();
  const out = new Map<string, Map<string, number>>();
  for (const [commodity, rules] of Object.entries(DEFS)) {
    for (const kw of rules) {
      let found = false;
      for (let i = 0; i < cells.length; i++) {
        if (used.has(i)) continue;
        if (!hit(norm(cells[i].name), kw)) continue;
        used.add(i);
        found = true;
        const byDate = out.get(commodity) ?? new Map<string, number>();
        for (const pr of cells[i].prices) {
          if (!byDate.has(pr.date)) byDate.set(pr.date, pr.price);
        }
        out.set(commodity, byDate);
        break;
      }
      if (found) break;
    }
  }
  return out;
}

interface HistRow {
  commodity: string;
  province: string;
  date: string;
  level: number;
  price: number;
  source: string;
}

async function upsertRest(table: string, onConflict: string, rows: Array<Record<string, unknown>>): Promise<void> {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(
        `${config.supabase.url}/rest/v1/${table}?on_conflict=${onConflict}`,
        {
          method: 'POST',
          headers: {
            apikey: config.supabase.serviceRoleKey,
            Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(chunk),
        }
      );
      if (res.ok) break;
      if (attempt === 3) {
        console.error(`Gagal upsert ${table}:`, res.status, (await res.text()).slice(0, 200));
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main(): Promise<void> {
  const days = Number(process.argv[2]) || 90;
  const provinces = Object.entries(PROVINCES);
  console.log(`Backfill ${provinces.length} provinsi x level [1,3] x ${days} hari`);
  const histRows: HistRow[] = [];
  const latestRows: Array<Record<string, unknown>> = [];

  for (const [slug, kode] of provinces) {
    for (const level of [1, 3]) {
      let cells: Cell[] = [];
      try {
        cells = await fetchLevel(level, kode, days);
      } catch (e) {
        console.log(`  ! ${slug} L${level}: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      const matched = matchLevel(cells);
      let count = 0;
      for (const [commodity, byDate] of matched) {
        const sorted = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
        for (const [date, price] of sorted) {
          histRows.push({ commodity, province: slug, date, level, price, source: SOURCE });
          count += 1;
        }
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          const prev = sorted.length > 1 ? sorted[sorted.length - 2][1] : null;
          latestRows.push({
            id: `${commodity}|${slug}|${level}`,
            commodity,
            province: slug,
            level,
            price: last[1],
            prev_price: prev,
            unit: UNITS[commodity] ?? 'kg',
            source: `upstream:${SOURCE}`,
            updated_at: new Date().toISOString(),
          });
        }
      }
      console.log(`  ${slug} L${level}: ${count} titik (${matched.size} komoditas)`);
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  console.log(`Upsert riwayat ${histRows.length} baris...`);
  await upsertRest('market_price_history', 'commodity,province,level,date', histRows as unknown as Array<Record<string, unknown>>);

  // Isi market_prices hanya untuk kombinasi yang BELUM ada (jangan menimpa crowd-refresh yang lebih baru)
  const existRes = await fetch(`${config.supabase.url}/rest/v1/market_prices?select=id&limit=10000`, {
    headers: { apikey: config.supabase.serviceRoleKey, Authorization: `Bearer ${config.supabase.serviceRoleKey}` },
  });
  const existing = new Set(((await existRes.json()) as Array<{ id: string }>)?.map((r) => r.id) ?? []);
  const fresh = latestRows.filter((r) => !existing.has(String(r.id)));
  console.log(`Isi harga terkini baru: ${fresh.length}/${latestRows.length}`);
  await upsertRest('market_prices', 'commodity,province,level', fresh);

  console.log('Backfill provinsi selesai.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
