import { Router, Request, Response } from 'express';
import { config } from '../config';
import { loadCatalog, saveCatalog, logAudit } from '../store/catalog';

export const productsRouter = Router();

productsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await loadCatalog();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

productsRouter.put('/', async (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'];
  if (token !== config.adminToken) {
    res.status(403).json({ error: 'Admin token tidak valid' });
    return;
  }
  const { products } = req.body as { products?: unknown[] };
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: 'products harus array tidak kosong' });
    return;
  }
  try {
    const count = await saveCatalog(products as Array<Record<string, unknown>>, 'admin');
    res.json({ ok: true, count });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
