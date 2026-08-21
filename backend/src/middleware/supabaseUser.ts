import { NextFunction, Request, Response } from 'express';
import { config, hasSupabase } from '../config';
import { createClient } from '@supabase/supabase-js';

export interface SbUser {
  id: string;
  email?: string;
}

let verifier: ReturnType<typeof createClient> | null = null;

function client(): ReturnType<typeof createClient> | null {
  if (!hasSupabase()) return null;
  if (!verifier) {
    verifier = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return verifier;
}

export async function userFromHeader(req: Request): Promise<SbUser | null> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const c = client();
  if (!c) return null;
  const { data, error } = await c.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export async function requireSupabaseUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await userFromHeader(req);
    if (!user) {
      res.status(401).json({ error: 'Login diperlukan' });
      return;
    }
    (req as Request & { sbUser?: SbUser }).sbUser = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sesi tidak valid' });
  }
}
