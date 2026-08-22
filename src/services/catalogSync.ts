import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from '@/services/api/client';
import { useProductStore } from '@/store/useProductStore';
import type { Product } from '@/types';

const LAST_SYNC_KEY = 'catalog_last_sync';
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function syncCatalog(force = false): Promise<number> {
  const url = getBackendUrl();
  if (!url) return 0;
  if (!force) {
    const last = Number((await AsyncStorage.getItem(LAST_SYNC_KEY)) ?? 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return -1;
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/products`);
    if (!res.ok) return 0;
    const json = (await res.json()) as { products?: Product[] };
    const products = Array.isArray(json.products) ? json.products : [];
    if (products.length === 0) return 0;
    useProductStore.getState().replaceAll(products);
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
    return products.length;
  } catch {
    return 0;
  }
}
