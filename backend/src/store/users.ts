import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  locale: string;
  createdAt: string;
}

function file(): string {
  return path.join(config.dataDir, 'users.json');
}

function readAll(): StoredUser[] {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf8')) as StoredUser[];
  } catch {
    return [];
  }
}

function writeAll(users: StoredUser[]): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(users, null, 2));
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return readAll().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(name: string, email: string, password: string): StoredUser {
  const users = readAll();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    locale: 'id',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeAll(users);
  return user;
}

export function verifyPassword(user: StoredUser, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}
