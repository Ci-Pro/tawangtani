import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/ai.routes';
import { productsRouter } from './routes/products.routes';
import { chatRouter } from './routes/chat.routes';
import { pushRouter } from './routes/push.routes';
import { marketRouter } from './routes/market.routes';
import { plantingsRouter } from './routes/plantings.routes';
import { farmsRouter } from './routes/farms.routes';
import { adminRouter } from './routes/admin.routes';
import { ADMIN_HTML } from './routes/adminPage';
import { errorHandler } from './middleware/errorHandler';

// Allowlist origin browser; aplikasi mobile native tidak mengirim header Origin.
const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ||
  'https://tawangtani-flame.vercel.app,http://localhost:8081,http://localhost:19006'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function createApp(): express.Express {
  const app = express();
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '12mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'tawangtani-backend',
      time: new Date().toISOString(),
    });
  });

  app.use('/ai', aiRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/market', marketRouter);
  app.use('/api/plantings', plantingsRouter);
  app.use('/api/farms', farmsRouter);
  app.use('/api/admin', adminRouter);
  app.get('/admin', (_req, res) => {
    res.type('html').send(ADMIN_HTML);
  });

  app.use(errorHandler);
  return app;
}
