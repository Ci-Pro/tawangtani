import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';
export type LangCode = 'id' | 'jv' | 'su' | 'ms';

interface SettingsState {
  themeMode: ThemeMode;
  backendUrl: string;
  locationName: string;
  coords: { lat: number; lon: number } | null;
  province: string | null;
  language: LangCode;
  toggleTheme: () => void;
  setBackendUrl: (url: string) => void;
  setLocation: (name: string, lat: number, lon: number, province?: string) => void;
  setLanguage: (lang: LangCode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? '',
      locationName: '',
      coords: null,
      province: null,
      language: 'id',
      toggleTheme: () =>
        set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      setBackendUrl: (url) => set({ backendUrl: url }),
      setLocation: (name, lat, lon, province) =>
        set({ locationName: name, coords: { lat, lon }, province: province ?? null }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'twt-settings', storage: createJSONStorage(() => AsyncStorage) }
  )
);
