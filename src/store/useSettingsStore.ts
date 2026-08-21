import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface SettingsState {
  themeMode: ThemeMode;
  backendUrl: string;
  locationName: string;
  coords: { lat: number; lon: number } | null;
  toggleTheme: () => void;
  setBackendUrl: (url: string) => void;
  setLocation: (name: string, lat: number, lon: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? '',
      locationName: '',
      coords: null,
      toggleTheme: () =>
        set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      setBackendUrl: (url) => set({ backendUrl: url }),
      setLocation: (name, lat, lon) => set({ locationName: name, coords: { lat, lon } }),
    }),
    { name: 'twt-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
