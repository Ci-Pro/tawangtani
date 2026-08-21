import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@/types';
import { PRODUCT_SEED } from '@/constants/products.seed';

interface ProductState {
  products: Product[];
  replaceAll: (products: Product[]) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      products: PRODUCT_SEED,
      replaceAll: (products) => set({ products }),
    }),
    { name: 'twt-products', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export function searchProducts(products: Product[], query: string, category?: string): Product[] {
  const q = query.toLowerCase().trim();
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (!q) return true;
    return (
      p.brand.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.activeIngredient.toLowerCase().includes(q) ||
      p.formulation.toLowerCase().includes(q)
    );
  });
}
