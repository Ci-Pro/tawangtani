import { Router, Request, Response } from 'express';
import { listMarketPrices, upsertMarketPrices } from '../store/marketPrices';
import { guidanceFor, refreshPrices, SOURCE_LABEL, toView } from '../services/marketData';
import { getSeries, snapshotToday } from '../services/marketHistory';
import { config } from '../config';
import { requireSupabaseUser } from '../middleware/supabaseUser';

export const marketRouter = Router();

const KNOWN_COMMODITIES = new Set([
  'bawang_merah',
  'bawang_putih',
  'cabai_rawit_merah',
  'cabai_merah_besar',
  'tomat',
  'kentang',
  'wortel',
  'kol',
  'jagung_pipilan',
  'beras_medium',
]);

marketRouter.get('/prices', async (req: Request, res: Response) => {
  try {
    const commodity = typeof req.query.commodity === 'string' ? req.query.commodity : undefined;
    const province = typeof req.query.province === 'string' ? req.query.province : undefined;
    const rows = await listMarketPrices(commodity, province);
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
    const series = await getSeries(commodity, range as 'daily', province);
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
    const clean = raw
      .filter((p) => KNOWN_COMMODITIES.has(String(p?.commodity)) && Number.isFinite(Number(p?.price)))
      .map((p) => ({ commodity: String(p.commodity), price: Math.round(Number(p.price)) }))
      .filter((p) => p.price >= 500 && p.price <= 10_000_000);
    if (clean.length === 0) {
      res.status(400).json({ error: 'Tidak ada harga valid' });
      return;
    }
    const existing = await listMarketPrices(undefined, province);
    const byCommodity = new Map(existing.map((r) => [r.commodity, r]));
    const nowIso = new Date().toISOString();
    const updates = [];
    for (const c of clean) {
      const row = byCommodity.get(c.commodity);
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
          id: `${c.commodity}|${province}`,
          commodity: c.commodity,
          province,
          price: c.price,
          prev_price: null,
          unit: 'kg',
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
