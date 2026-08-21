import { Router, Request, Response } from 'express';
import { listMarketPrices } from '../store/marketPrices';
import { guidanceFor, refreshPrices, SOURCE_LABEL, toView } from '../services/marketData';
import { config } from '../config';

export const marketRouter = Router();

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
