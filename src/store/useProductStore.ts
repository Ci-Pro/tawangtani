import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductAuditEntry } from '@/types';
import { PRODUCT_SEED } from '@/constants/products.seed';
import { uid } from '@/utils/format';

const SEED_UPDATED_AT = '2026-01-15';

interface ProductState {
  products: Product[];
  audits: ProductAuditEntry[];
  replaceAll: (products: Product[]) => void;
  updateProduct: (productId: string, patch: Partial<Product>, reason: string) => void;
}

function logAudit(
  audits: ProductAuditEntry[],
  entry: Omit<ProductAuditEntry, 'id' | 'at'>
): ProductAuditEntry[] {
  return [{ ...entry, id: uid(), at: new Date().toISOString() }, ...audits].slice(0, 200);
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: PRODUCT_SEED.map((p) => ({ ...p, updatedAt: p.updatedAt ?? SEED_UPDATED_AT })),
      audits: [],
      replaceAll: (products) =>
        set((s) => ({
          products,
          audits: logAudit(s.audits, {
            productId: '*',
            productName: `${products.length} produk`,
            action: 'replace-all',
            detail: 'Sinkronisasi katalog dari server',
          }),
        })),
      updateProduct: (productId, patch, reason) =>
        set((s) => {
          const target = s.products.find((p) => p.id === productId);
          return {
            products: s.products.map((p) =>
              p.id === productId ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
            ),
            audits: logAudit(s.audits, {
              productId,
              productName: target ? `${target.brand} — ${target.name}` : productId,
              action: 'update',
              detail: reason,
            }),
          };
        }),
    }),
    { name: 'twt-products', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export function searchProducts(
  products: Product[],
  query: string,
  category?: string
): Product[] {
  const q = query.toLowerCase().trim();
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return (
      p.brand.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.activeIngredient.toLowerCase().includes(q) ||
      p.formulation.toLowerCase().includes(q) ||
      p.doses.some(
        (d) => d.crop.toLowerCase().includes(q) || d.target.toLowerCase().includes(q)
      )
    );
  });
}
