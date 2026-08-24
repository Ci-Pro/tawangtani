/**
 * Cache TTL sederhana in-memory untuk serverless (per instance hangat).
 * Mengurangi beban Supabase & latensi pada endpoint read-heavy yang
 * datanya jarang berubah (harga harian, katalog produk).
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Bantu pembungkusan handler async dengan cache. */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Hapus seluruh isi cache (dipanggil setelah mutasi data). */
export function cacheClear(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
