import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface WeatherAlert {
  type: 'hujan_lebat' | 'angin_kencang' | 'suhu_ekstrem';
  severity: 'waspada' | 'siaga';
  date: string;
  message: string;
}

const SIGNATURE_KEY = 'twt-weather-alert-signature';

export interface AlertFetchResult {
  alerts: WeatherAlert[];
  isNew: boolean;
}

export async function fetchWeatherAlerts(): Promise<AlertFetchResult> {
  const backendUrl = useSettingsStore.getState().backendUrl?.trim();
  const coords = useSettingsStore.getState().coords;
  const empty: AlertFetchResult = { alerts: [], isNew: false };
  if (!backendUrl || !coords) return empty;
  try {
    const res = await fetch(
      `${backendUrl.replace(/\/$/, '')}/api/push/weather-alerts?lat=${coords.lat}&lon=${coords.lon}`
    );
    if (!res.ok) return empty;
    const json = (await res.json()) as { alerts?: WeatherAlert[] };
    const alerts = json.alerts ?? [];
    const signature = alerts.map((a) => `${a.type}${a.date}`).sort().join('|');
    let previous: string | null = null;
    try {
      previous = await AsyncStorage.getItem(SIGNATURE_KEY);
      await AsyncStorage.setItem(SIGNATURE_KEY, signature);
    } catch {
      previous = null;
    }
    return { alerts, isNew: Boolean(signature) && signature !== previous };
  } catch {
    return empty;
  }
}

export async function notifyWeatherAlerts(alerts: WeatherAlert[]): Promise<void> {
  try {
    for (const a of alerts.filter((x) => x.severity === 'siaga').slice(0, 2)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Peringatan Cuaca',
          body: a.message,
        },
        trigger: { seconds: 2 },
      });
    }
  } catch {}
}
