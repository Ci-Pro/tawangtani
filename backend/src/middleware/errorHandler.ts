import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message || 'Kesalahan server internal' });
}
