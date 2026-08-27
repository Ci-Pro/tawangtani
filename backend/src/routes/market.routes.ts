import { Router, Request, Response } from 'express';
import { listMarketPrices, upsertMarketPrices } from '../store/marketPrices';
import { guidanceFor, refreshPrices, SOURCE_LABEL, toView } from '../services/marketData';
import { getSeries, snapshotToday } from '../services/marketHistory';
import {
  aggregateFarmer,
  insertFarmerPrice,
  myFarmerPrices,
  recentFarmerPrices,
} from '../store/farmerPrices';
import { config } from '../config';
import { requireSupabaseUser } from '../middleware/supabaseUser';
import { cached, cacheClear } from '../utils/cache';
import { resolveCommodity } from '../services/commodityMatch';
import { resolveProvince } from '../services/provinceMatch';

export const marketRouter = Router();

const KNOWN_COMMODITIES: Record<string, string> = {
  // satuan: kg default; minyak goreng = liter
  gabah_kering_panen: 'kg',
  gabah_kering_giling: 'kg',
  beras_medium: 'kg',
  beras_premium: 'kg',
  jagung_pipilan: 'kg',
  kedelai_kering: 'kg',
  cabai_rawit_merah: 'kg',
  cabai_rawit_hijau: 'kg',
  cabai_merah_besar: 'kg',
  cabai_merah_keriting: 'kg',
  cabai_hijau_besar: 'kg',
  bawang_merah: 'kg',
  bawang_putih: 'kg',
  bawang_bombay: 'kg',
  bawang_daun: 'kg',
  tomat: 'kg',
  kentang: 'kg',
  wortel: 'kg',
  kol: 'kg',
  kacang_tanah: 'kg',
  kacang_hijau: 'kg',
  gula_pasir: 'kg',
  minyak_goreng_curah: 'liter',
  minyak_goreng_kemasan: 'liter',
  tepung_terigu: 'kg',
  telur_ayam: 'kg',
  ayam_broiler: 'kg',
  sapi_murni: 'kg',
  ikan_kembung: 'kg',
  ikan_bandeng: 'kg',
  ikan_tongkol: 'kg',
  ikan_lele: 'kg',
  ikan_nila: 'kg',
  ikan_teri: 'kg',
  udang_windu: 'kg',
  pupuk_urea: 'kg',
  pupuk_npk: 'kg',
  pupuk_sp36: 'kg',
  pupuk_za: 'kg',
  lpg_3kg: 'kg',
  lpg_12kg: 'kg',
  semen_portland: 'kg',
  mie_instan: 'kg',
  garam_halus: 'kg',
  beras_sphp: 'kg',
  kacang_panjang: 'kg',
  kangkung: 'kg',
  sawi_hijau: 'kg',
  jeruk_lokal: 'kg',
  pisang_lokal: 'kg',
  susu_bubuk: 'kg',
  susu_kemanis: 'kg',
};

marketRouter.get('/prices', async (req: Request, res: Response) => {
  try {
    const commodityQ = typeof req.query.commodity === 'string' ? req.query.commodity : undefined;
    const provinceQ = typeof req.query.province === 'string' ? req.query.province : undefined;
    const levelQ = Number(req.query.level);
    const level = [1, 2, 3].includes(levelQ) ? levelQ : undefined;
    // Toleran terhadap sebutan awam: "gkp" → gabah_kering_panen, "jogja" → d.i yogyakarta
    const [commodity, province] = await Promise.all([
      resolveCommodity(commodityQ),
      resolveProvince(provinceQ).then((p) => p ?? provinceQ),
    ]);
    const rows = await cached(`prices|${commodity ?? '*'}|${province ?? '*'}|${level ?? '*'}`, 5 * 60_000, () =>
      listMarketPrices(commodity, province ?? undefined, level)
    );
    res.json({
      sourceLabel: SOURCE_LABEL,
      prices: rows.map(toView).map((v) => ({ ...v, hint: guidanceFor(v) })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

marketRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const commodityQ = typeof req.query.commodity === 'string' ? req.query.commodity : '';
    const range = String(req.query.range ?? 'daily');
    const provinceQ =
      typeof req.query.province === 'string' && req.query.province ? req.query.province : 'nasional';
    if (!commodityQ) {
      res.status(400).json({ error: 'parameter commodity wajib' });
      return;
    }
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(range)) {
      res.status(400).json({ error: 'range harus daily|weekly|monthly|yearly' });
      return;
    }
    const levelQ = Number(req.query.level);
    const level = [1, 2, 3].includes(levelQ) ? levelQ : 3;
    const commodity = (await resolveCommodity(commodityQ)) ?? commodityQ;
    const province = (await resolveProvince(provinceQ)) ?? provinceQ;
    const series = await cached(`hist|${commodity}|${range}|${province}|${level}`, 10 * 60_000, () =>
      getSeries(commodity, range as 'daily', province, level)
    );
    res.json({ commodity, ...series });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

marketRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (config.adminToken && req.headers['x-admin-token'] !== config.adminToken) {
      res.status(401).json({ error: 'Admin token tidak valid' });
      return;
    }
    const result = await refreshPrices();
    cacheClear();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

marketRouter.post('/snapshot', async (req: Request, res: Response) => {
  try {
    if (config.adminToken && req.headers['x-admin-token'] !== config.adminToken) {
      res.status(401).json({ error: 'Admin token tidak valid' });
      return;
    }
    const saved = await snapshotToday();
    cacheClear();
    res.json({ ok: true, saved });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Crowd-refresh: perangkat petani (IP seluler, tidak diblokir WAF Kementan)
 * mengambil harga dari mirror Kementan lalu menyumbangkan hasilnya ke cache.
 * Mendukung level provinsi via body.province.
 */
marketRouter.post('/ingest', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const raw = Array.isArray((req.body as { prices?: unknown })?.prices)
      ? ((req.body as { prices: unknown[] }).prices as Array<Record<string, unknown>>)
      : [];
    const province =
      String((req.body as { province?: unknown })?.province ?? 'nasional')
        .trim()
        .toLowerCase()
        .slice(0, 40) || 'nasional';
    const bodyLevel = Number((req.body as { level?: unknown })?.level);
    const clean = raw
      .filter(
        (p) =>
          KNOWN_COMMODITIES[String(p?.commodity)] !== undefined &&
          Number.isFinite(Number(p?.price))
      )
      .map((p) => {
        const lvlQ = Number(p.level);
        return {
          commodity: String(p.commodity),
          price: Math.round(Number(p.price)),
          level: [1, 2, 3].includes(lvlQ)
            ? lvlQ
            : [1, 2, 3].includes(bodyLevel)
              ? bodyLevel
              : 3,
        };
      })
      .filter((p) => p.price >= 500 && p.price <= 10_000_000);
    if (clean.length === 0) {
      res.status(400).json({ error: 'Tidak ada harga valid' });
      return;
    }
    const byKey = new Map(
      (await listMarketPrices(undefined, province)).map((r) => [
        `${r.commodity}|${r.level ?? 3}`,
        r,
      ])
    );
    const nowIso = new Date().toISOString();
    const updates = [];
    for (const c of clean) {
      const row = byKey.get(`${c.commodity}|${c.level}`);
      if (row) {
        if (row.price !== c.price) {
          updates.push({
            ...row,
            prev_price: row.price,
            price: c.price,
            source: 'upstream:kemtan-panelharga',
            updated_at: nowIso,
          });
        }
      } else {
        updates.push({
          id: `${c.commodity}|${province}|${c.level}`,
          commodity: c.commodity,
          province,
          level: c.level,
          price: c.price,
          prev_price: null,
          unit: KNOWN_COMMODITIES[c.commodity] ?? 'kg',
          source: 'upstream:kemtan-panelharga',
          updated_at: nowIso,
        });
      }
    }
    await upsertMarketPrices(updates);
    cacheClear();
    res.json({ ok: true, updated: updates.length, province });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Laporan harga petani: jual (harga di petani) / beli (harga eceran kios).
 * Moderasi otomatis: disetujui bila masih dalam 2,5x harga referensi resmi.
 */
marketRouter.post('/report', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const user = (req as Request & { sbUser?: { id: string } }).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const commodity = String(body.commodity ?? '');
    if (KNOWN_COMMODITIES[commodity] === undefined) {
      res.status(400).json({ error: 'Komoditas tidak dikenal' });
      return;
    }
    const price = Math.round(Number(body.price));
    if (!Number.isFinite(price) || price < 500 || price > 10_000_000) {
      res.status(400).json({ error: 'Harga tidak wajar (500 - 10.000.000)' });
      return;
    }
    const role = body.role === 'beli' ? 'beli' : 'jual';
    const province =
      String(body.province ?? 'nasional').trim().toLowerCase().slice(0, 40) || 'nasional';
    const village = String(body.village ?? '').trim().slice(0, 60);
    const note = String(body.note ?? '').trim().slice(0, 200);
    const refLevel = role === 'jual' ? 1 : 3;
    const refRows = await listMarketPrices(commodity, province, refLevel);
    const ref = refRows[0]?.price ?? 0;
    let status: 'approved' | 'pending' = 'approved';
    if (ref > 0) {
      const ratio = price / ref;
      if (ratio < 0.4 || ratio > 2.5) status = 'pending';
    }
    await insertFarmerPrice({
      user_id: user.id,
      commodity,
      province,
      village,
      role,
      price,
      unit: KNOWN_COMMODITIES[commodity] ?? 'kg',
      note,
      status,
    });
    cacheClear('reports|');
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Agregat laporan petani per provinsi (30 hari terakhir). */
marketRouter.get('/reports', async (req: Request, res: Response) => {
  try {
    const province =
      typeof req.query.province === 'string' && req.query.province
        ? req.query.province.toLowerCase()
        : 'nasional';
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity : undefined;
    const daysQ = Number(req.query.days);
    const days = Number.isFinite(daysQ) && daysQ >= 1 && daysQ <= 90 ? daysQ : 30;
    const rows = await cached(`reports|${province}|${commodity ?? '*'}|${days}`, 30_000, () =>
      recentFarmerPrices(province, commodity, days)
    );
    res.json({
      province,
      days,
      total: rows.length,
      aggregates: aggregateFarmer(rows),
      recent: rows.slice(0, 15).map((r) => ({
        commodity: r.commodity,
        village: r.village,
        role: r.role,
        price: r.price,
        unit: r.unit,
        at: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Laporan milik pengguna sendiri (termasuk yang pending). */
marketRouter.get('/my-reports', requireSupabaseUser, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { sbUser?: { id: string } }).sbUser;
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    const rows = await myFarmerPrices(user.id);
    res.json({ reports: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
