import { Router, Request, Response } from 'express';
import { config } from '../config';
import { loadCatalog, saveCatalog } from '../store/catalog';

export const productsRouter = Router();

productsRouter.get('/', (_req: Request, res: Response) => {
  res.json({ products: loadCatalog() });
});

productsRouter.put('/', (req: Request, res: Response) => {
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
  saveCatalog(products, String(req.user?.sub ?? 'admin'));
  res.json({ ok: true, count: products.length });
});
