import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/ai.routes';
import { authRouter } from './routes/auth.routes';
import { productsRouter } from './routes/products.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '12mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'tawangtani-backend', time: new Date().toISOString() });
  });

  app.use('/ai', aiRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);

  app.use(errorHandler);
  return app;
}
