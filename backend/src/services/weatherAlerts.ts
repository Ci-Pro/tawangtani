export interface WeatherAlert {
  type: 'hujan_lebat' | 'angin_kencang' | 'suhu_ekstrem';
  severity: 'waspada' | 'siaga';
  date: string;
  message: string;
}

interface DailyItem {
  date: string;
  weather_code?: number;
  precipitation_sum?: number;
  wind_max?: number;
  temperature_2m_max?: number;
  temperature_2m_min?: number;
}

export async function fetchWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'precipitation_sum,wind_max,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '3',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Gagal mengambil prakiraan cuaca');
  const json = (await res.json()) as { daily?: { time: string[] } & Record<string, DailyItem[] | string[]> };
  const d = json.daily as unknown as {
    time: string[];
    precipitation_sum: number[];
    wind_max: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  if (!d?.time) return [];

  const alerts: WeatherAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);

  d.time.forEach((date, i) => {
    if (date < today) return;
    const rain = d.precipitation_sum?.[i] ?? 0;
    const wind = d.wind_max?.[i] ?? 0;
    const tmax = d.temperature_2m_max?.[i] ?? 0;
    const tmin = d.temperature_2m_min?.[i] ?? 0;

    if (rain >= 50) {
      alerts.push({
        type: 'hujan_lebat',
        severity: 'siaga',
        date,
        message: `Hujan lebat ${Math.round(rain)} mm diprakirakan. Tunda penyemprotan & amankan saluran air.`,
      });
    } else if (rain >= 20) {
      alerts.push({
        type: 'hujan_lebat',
        severity: 'waspada',
        date,
        message: `Hujan cukup lebat ${Math.round(rain)} mm diprakirakan. Perhatikan jadwal semprot & pemupukan.`,
      });
    }
    if (wind >= 30) {
      alerts.push({
        type: 'angin_kencang',
        severity: 'siaga',
        date,
        message: `Angin kencang hingga ${Math.round(wind)} km/jam. Hindari penyemprotan & pasang penopang tanaman.`,
      });
    } else if (wind >= 20 && wind < 30) {
      alerts.push({
        type: 'angin_kencang',
        severity: 'waspada',
        date,
        message: `Angin cukup kencang ${Math.round(wind)} km/jam. Hati-hati saat menyemprot.`,
      });
    }
    if (tmax >= 36) {
      alerts.push({
        type: 'suhu_ekstrem',
        severity: 'siaga',
        date,
        message: `Suhu panas ekstrem ${Math.round(tmax)}°C. Tambah air irigasi & hindari semprot siang hari.`,
      });
    }
    if (tmin <= 10) {
      alerts.push({
        type: 'suhu_ekstrem',
        severity: 'waspada',
        date,
        message: `Suhu dingin malam ${Math.round(tmin)}°C. Waspadai stres tanaman & penyakit.`,
      });
    }
  });

  return alerts.slice(0, 6);
}
