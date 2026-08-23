import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'twt_offline_queue';

export interface QueueItem {
  id: string;
  kind: 'report' | 'alert';
  path: string;
  body: Record<string, unknown>;
  createdAt: number;
}

function cacheKey(key: string): string {
  return `twt_cache_${key}`;
}

/** Simpan data agar bisa ditampilkan saat offline. */
export async function saveCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify({ data, at: Date.now() }));
  } catch {}
}

export async function loadCache<T>(key: string): Promise<{ data: T; at: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; at: number };
    return parsed;
  } catch {
    return null;
  }
}

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {}
}

export async function queueCount(): Promise<number> {
  return (await readQueue()).length;
}

/** Antre aksi untuk dikirim saat kembali online. */
export async function enqueue(
  kind: 'report' | 'alert',
  path: string,
  body: Record<string, unknown>
): Promise<void> {
  const items = await readQueue();
  items.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind,
    path,
    body,
    createdAt: Date.now(),
  });
  // Batasi antrean agar tidak membengkak
  await writeQueue(items.slice(-50));
}

/**
 * Kirim semua item antrean dengan token sesi terbaru.
 * Berhenti pada kegagalan jaringan pertama agar urutan terjaga.
 * Mengembalikan jumlah item yang berhasil tersinkron.
 */
export async function processQueue(backendUrl: string): Promise<number> {
  const items = await readQueue();
  if (!items.length || !backendUrl) return 0;

  const session = await supabase.auth.getSession().catch(() => null);
  const token = session?.data.session?.access_token;
  if (!token) return 0;

  let sent = 0;
  for (const it of items) {
    try {
      const res = await fetch(`${backendUrl.replace(/\/$/, '')}${it.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(it.body),
      });
      if (!res.ok) break;
      sent += 1;
    } catch {
      break;
    }
  }
  if (sent > 0) {
    await writeQueue(items.slice(sent));
  }
  return sent;
}
