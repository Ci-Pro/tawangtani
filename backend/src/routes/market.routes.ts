import { Router, Request, Response } from 'express';
import { listMarketPrices, upsertMarketPrices } from '../store/marketPrices';
import { guidanceFor, refreshPrices, SOURCE_LABEL, toView } from '../services/marketData';
import { getSeries, snapshotToday } from '../services/marketHistory';
import { config } from '../config';
import { requireSupabaseUser } from '../middleware/supabaseUser';

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
  udang_windu: 'kg',
};

marketRouter.get('/prices', async (req: Request, res: Response) => {
  try {
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity : undefined;
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    const levelQ = Number(req.query.level);
    const level = [1, 2, 3].includes(levelQ) ? levelQ : undefined;
    const rows = await listMarketPrices(commodity, province, level);
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
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity : '';
    const range = String(req.query.range ?? 'daily');
    const province =
      typeof req.query.province === 'string' && req.query.province ? req.query.province : 'nasional';
    if (!commodity) {
      res.status(400).json({ error: 'parameter commodity wajib' });
      return;
    }
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(range)) {
      res.status(400).json({ error: 'range harus daily|weekly|monthly|yearly' });
      return;
    }
    const levelQ = Number(req.query.level);
    const level = [1, 2, 3].includes(levelQ) ? levelQ : 3;
    const series = await getSeries(commodity, range as 'daily', province, level);
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
    res.json({ ok: true, updated: updates.length, province });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
