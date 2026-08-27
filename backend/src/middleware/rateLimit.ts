import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { countRecentAiQueries } from '../store/knowledge';

function userOrIpKey(req: Request): string {
  return (req as any).sbUser?.id ?? req.ip ?? 'unknown';
}

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan AI. Coba lagi nanti.' },
});

export const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan push. Coba lagi nanti.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
});

/** Kuota harian per pengguna terautentikasi (tahan restart/serverless). */
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? '100');

export function userAiQuota(userIdGetter: (req: Request) => string | null | undefined) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = userIdGetter(req);
      if (!userId) return next();
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const used = await countRecentAiQueries(userId, since);
      if (used >= AI_DAILY_LIMIT) {
        res.status(429).json({
          error: `Kuota AI harian tercapai (${used}/${AI_DAILY_LIMIT} dalam 24 jam). Coba lagi besok.`,
        });
        return;
      }
    } catch {
      // kegagalan hitung kuota tidak boleh memblokir pengguna
    }
    next();
  };
}
