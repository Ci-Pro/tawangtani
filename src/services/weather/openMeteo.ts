import { WeatherData, WeatherCurrent, SprayCondition } from '@/types';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    timezone: 'auto',
    forecast_days: '5',
  });

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('Gagal mengambil data cuaca');
  const json = (await res.json()) as OpenMeteoResponse;

  if (!json.current || !json.hourly || !json.daily) {
    throw new Error('Data cuaca tidak lengkap');
  }

  const nowIdx = json.hourly.time.findIndex((t) => t >= json.current!.time);
  const start = nowIdx < 0 ? 0 : nowIdx;

  const hourly = json.hourly.time
    .slice(start, start + 12)
    .map((time, i) => ({
      time,
      temperature: json.hourly!.temperature_2m[start + i],
      precipitationProbability: json.hourly!.precipitation_probability[start + i] ?? 0,
      weatherCode: json.hourly!.weather_code[start + i],
    }));

  const daily = json.daily.time.map((date, i) => ({
    date,
    weatherCode: json.daily!.weather_code[i],
    tempMax: json.daily!.temperature_2m_max[i],
    tempMin: json.daily!.temperature_2m_min[i],
    precipitationSum: json.daily!.precipitation_sum[i],
    windMax: json.daily!.wind_speed_10m_max[i],
  }));

  const c = json.current;
  const current: WeatherCurrent = {
    temperature: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    isDay: c.is_day === 1,
    time: c.time,
  };

  return { current, hourly, daily };
}

export function describeWeatherCode(code: number): { desc: string; icon: string } {
  if (code === 0) return { desc: 'Cerah', icon: 'sunny-outline' };
  if (code <= 3) return { desc: 'Berawan', icon: 'cloudy-outline' };
  if (code === 45 || code === 48) return { desc: 'Berkabut', icon: 'reorder-three-outline' };
  if (code >= 51 && code <= 57) return { desc: 'Gerimis', icon: 'rainy-outline' };
  if (code >= 61 && code <= 67) return { desc: 'Hujan', icon: 'rainy-outline' };
  if (code >= 71 && code <= 77) return { desc: 'Salju', icon: 'snow-outline' };
  if (code >= 80 && code <= 82) return { desc: 'Hujan Lebat', icon: 'thunderstorm-outline' };
  if (code >= 95) return { desc: 'Badai Petir', icon: 'thunderstorm-outline' };
  return { desc: 'Tidak diketahui', icon: 'help-circle-outline' };
}

export function sprayCondition(current: WeatherCurrent): SprayCondition {
  const reasons: string[] = [];
  let level: SprayCondition['level'] = 'ideal';

  if (current.windSpeed > 15) {
    level = 'hindari';
    reasons.push(`Angin kencang (${current.windSpeed.toFixed(0)} km/jam) — risiko hanyut semprotan`);
  } else if (current.windSpeed > 10) {
    if (level === 'ideal') level = 'hati-hati';
    reasons.push(`Angin agak kencang (${current.windSpeed.toFixed(0)} km/jam)`);
  }

  if (current.precipitation > 0.5) {
    level = 'hindari';
    reasons.push('Sedang hujan — semprotan akan tercuci');
  } else if (current.precipitation > 0) {
    if (level === 'ideal') level = 'hati-hati';
    reasons.push('Gerimis ringan');
  }

  if (current.temperature > 32) {
    if (level === 'ideal') level = 'hati-hati';
    reasons.push(`Suhu tinggi (${current.temperature.toFixed(0)}°C) — risiko fitotoksisitas & penguapan`);
  }

  if (reasons.length === 0) {
    reasons.push('Kondisi mendukung untuk penyemprotan');
  }

  return { level, reasons };
}
