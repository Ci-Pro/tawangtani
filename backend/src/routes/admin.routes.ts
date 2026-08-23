import { Router, Request, Response } from 'express';
import { config } from '../config';
import { loadCatalog } from '../store/catalog';
import {
  adminListFarmerPrices,
  adminModerateFarmerPrice,
  adminDeleteFarmerPrice,
  countRows,
} from '../store/farmerPrices';

export const adminRouter = Router();

function guard(req: Request): boolean {
  return req.headers['x-admin-token'] === config.adminToken;
}

adminRouter.use((req: Request, res: Response, next: () => void) => {
  if (!guard(req)) {
    res.status(403).json({ error: 'Admin token tidak valid' });
    return;
  }
  next();
});

adminRouter.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [products, farmerPending, farmerApproved, alerts, plantings, aiQueries, kbChunks] =
      await Promise.all([
        loadCatalog().then((p) => p.length).catch(() => -1),
        countRows('farmer_prices', '&status=eq.pending'),
        countRows('farmer_prices', '&status=eq.approved'),
        countRows('price_alerts'),
        countRows('plantings'),
        countRows(
          'ai_query_log',
          `&created_at=gte.${new Date(Date.now() - 7 * 864e5).toISOString()}`
        ),
        countRows('knowledge_chunks'),
      ]);
    res.json({
      products,
      farmerPending,
      farmerApproved,
      alerts,
      plantings,
      aiQueries7d: aiQueries,
      kbChunks,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/farmer-prices', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await adminListFarmerPrices(status);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/farmer-prices/:id/moderate', async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: "status harus 'approved' | 'rejected' | 'pending'" });
    return;
  }
  try {
    await adminModerateFarmerPrice(req.params.id, status as 'approved');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/farmer-prices/:id', async (req: Request, res: Response) => {
  try {
    await adminDeleteFarmerPrice(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
