import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createUser, findUserByEmail, verifyPassword } from '../store/users';
import { authLimiter } from '../middleware/rateLimit';

export const authRouter = Router();

function issueToken(sub: string, email: string, name: string): string {
  return jwt.sign({ sub, email, name }, config.jwtSecret, { expiresIn: '7d' });
}

authRouter.post('/register', authLimiter, (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, dan password wajib diisi' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Format email tidak valid' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password minimal 6 karakter' });
    return;
  }
  if (findUserByEmail(email)) {
    res.status(409).json({ error: 'Email sudah terdaftar' });
    return;
  }
  const user = createUser(name, email, password);
  res.status(201).json({
    token: issueToken(user.id, user.email, user.name),
    user: { id: user.id, name: user.name, email: user.email },
  });
});

authRouter.post('/login', authLimiter, (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email dan password wajib diisi' });
    return;
  }
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, password)) {
    res.status(401).json({ error: 'Email atau password salah' });
    return;
  }
  res.json({
    token: issueToken(user.id, user.email, user.name),
    user: { id: user.id, name: user.name, email: user.email },
  });
});
