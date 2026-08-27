import { setWidgetData } from 'expo-widget';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetchWeatherCached } from '@/services/weather/openMeteo';
import { useSettingsStore } from '@/store/useSettingsStore';
import { fmtNum } from '@/utils/format';

const PACKAGE =
  (Constants.expoConfig?.android?.package as string | undefined) ?? 'com.tawangtani.app';

export interface WidgetPriceItem {
  name: string;
  price: string;
}

export interface WidgetPayload {
  city: string;
  temp: string;
  prices: WidgetPriceItem[];
}

export function publishWidgetData(payload: WidgetPayload): void {
  if (Platform.OS !== 'android') return;
  try {
    setWidgetData(JSON.stringify(payload), PACKAGE);
  } catch {
    // Widget tidak tersedia (non-build native) — abaikan diam-diam
  }
}

export async function publishMarketWidget(
  items: { name: string; price: number }[],
  province: string
): Promise<void> {
  if (Platform.OS !== 'android') return;
  let temp = '—';
  try {
    const coords = useSettingsStore.getState().coords;
    if (coords) {
      const w = await fetchWeatherCached(coords.lat, coords.lon);
      temp = `${Math.round(w.current.temperature)}°C`;
    }
  } catch {
    // suhu opsional
  }
  publishWidgetData({
    city: province === 'nasional' ? 'Nasional' : province.replace(/\b\w/g, (c) => c.toUpperCase()),
    temp,
    prices: items.slice(0, 3).map((it) => ({ name: it.name, price: fmtNum(it.price) })),
  });
}