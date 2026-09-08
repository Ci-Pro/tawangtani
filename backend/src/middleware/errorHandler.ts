import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[error]', err?.stack ?? err?.message ?? err);
  res.status(500).json({ error: 'Kesalahan server internal' });
}