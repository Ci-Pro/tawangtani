import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Farm, Crop } from '@/types';
import { uid } from '@/utils/format';

interface FarmState {
  farms: Farm[];
  addFarm: (farm: Omit<Farm, 'id' | 'createdAt' | 'crops'>) => void;
  updateFarm: (id: string, patch: Partial<Omit<Farm, 'id' | 'crops'>>) => void;
  removeFarm: (id: string) => void;
  addCrop: (farmId: string, crop: Omit<Crop, 'id'>) => void;
  updateCrop: (farmId: string, cropId: string, patch: Partial<Crop>) => void;
  removeCrop: (farmId: string, cropId: string) => void;
}

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      farms: [],
      addFarm: (farm) =>
        set((s) => ({
          farms: [
            ...s.farms,
            { ...farm, id: uid(), createdAt: new Date().toISOString(), crops: [] },
          ],
        })),
      updateFarm: (id, patch) =>
        set((s) => ({
          farms: s.farms.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeFarm: (id) =>
        set((s) => ({ farms: s.farms.filter((f) => f.id !== id) })),
      addCrop: (farmId, crop) =>
        set((s) => ({
          farms: s.farms.map((f) =>
            f.id === farmId ? { ...f, crops: [...f.crops, { ...crop, id: uid() }] } : f
          ),
        })),
      updateCrop: (farmId, cropId, patch) =>
        set((s) => ({
          farms: s.farms.map((f) =>
            f.id === farmId
              ? {
                  ...f,
                  crops: f.crops.map((c) => (c.id === cropId ? { ...c, ...patch } : c)),
                }
              : f
          ),
        })),
      removeCrop: (farmId, cropId) =>
        set((s) => ({
          farms: s.farms.map((f) =>
            f.id === farmId ? { ...f, crops: f.crops.filter((c) => c.id !== cropId) } : f
          ),
        })),
    }),
    { name: 'twt-farms', storage: createJSONStorage(() => AsyncStorage) }
  )
);
