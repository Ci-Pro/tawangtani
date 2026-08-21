import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/ai.routes';
import { productsRouter } from './routes/products.routes';
import { chatRouter } from './routes/chat.routes';
import { pushRouter } from './routes/push.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
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

  app.use(errorHandler);
  return app;
}
