import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { WeatherData } from '@/types';
import { fetchWeatherCached } from '@/services/weather/openMeteo';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useLocation() {
  const setLocation = useSettingsStore((s) => s.setLocation);
  const coords = useSettingsStore((s) => s.coords);
  const locationName = useSettingsStore((s) => s.locationName);
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  const request = useCallback(async () => {
    try {
      const { status: st } = await Location.requestForegroundPermissionsAsync();
      if (st !== 'granted') {
        setStatus('denied');
        return;
      }
      setStatus('granted');
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      let name = '';
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        if (places[0]) {
          name = [places[0].city ?? places[0].district, places[0].region].filter(Boolean).join(', ');
        }
      } catch {
        name = '';
      }
      setLocation(name || 'Lokasi Anda', pos.coords.latitude, pos.coords.longitude);
    } catch {
      setStatus('denied');
    }
  }, [setLocation]);

  return { coords, locationName, status, request };
}

export function useWeather() {
  const coords = useSettingsStore((s) => s.coords);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchWeatherCached(coords.lat, coords.lon));
    } catch {
      setError('Cuaca tidak tersedia. Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
