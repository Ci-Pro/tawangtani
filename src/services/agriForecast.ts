import { WeatherData, WeatherDailyItem } from '@/types';

export interface AgriTip {
  icon: string;
  title: string;
  detail: string;
  urgency: 'tinggi' | 'sedang' | 'rendah';
}

/**
 * Rule engine: menghasilkan rekomendasi pertanian dari data cuaca 7 hari.
 * Output diurutkan berdasarkan urgency (tinggi dulu).
 */
export function generateAgriTips(weather: WeatherData): AgriTip[] {
  const tips: AgriTip[] = [];
  const daily = weather.daily ?? [];
  const today = daily[0];

  if (!today) return tips;

  // --- Hari ini ---
  const hujanHariIni = today.precipitationSum;
  const anginMax = today.windMax;
  const suhuMax = today.tempMax;
  const suhuMin = today.tempMin;

  if (hujanHariIni >= 10) {
    tips.push({
      icon: 'rainy',
      title: 'Hujan lebat hari ini',
      detail: `${fmtMm(hujanHariIni)} diprediksi. Hindari penyemprotan & penyulaman. Siapkan drainase lahan.`,
      urgency: 'tinggi',
    });
  } else if (hujanHariIni >= 2) {
    tips.push({
      icon: 'water',
      title: 'Hujan ringan-sedang',
      detail: `${fmtMm(hujanHariIni)} hujan. Tunda penyemprotan pestisida — efektivitas berkurang.`,
      urgency: 'sedang',
    });
  } else if (hujanHariIni < 0.5 && suhuMax < 33) {
    tips.push({
      icon: 'leaf',
      title: 'Hari ini cocok untuk menyiram',
      detail: 'Tidak ada hujan signifikan, suhu moderat. Waktu optimal untuk irigasi dan pemupukan.',
      urgency: 'rendah',
    });
  }

  if (anginMax >= 25) {
    tips.push({
      icon: 'speedometer',
      title: 'Angin kencang — tunda semprot',
      detail: `Angin ${fmtKmh(anginMax)}. Penyemprotan hanya ${anginMax >= 35 ? '0%' : '~30%'} efektif. Tunggu kondisi lebih tenang.`,
      urgency: 'tinggi',
    });
  } else if (anginMax >= 15) {
    tips.push({
      icon: 'leaf-outline',
      title: 'Angin cukup kencang',
      detail: `Angin ${fmtKmh(anginMax)}. Hati-hati saat menyemprot — gunakan nozel finer drop.`,
      urgency: 'sedang',
    });
  }

  if (suhuMax >= 35) {
    tips.push({
      icon: 'sunny',
      title: 'Suhu panas ekstrem',
      detail: `Maks ${fmtC(suhuMax)}. Siram di pagi (sebelum 09:00) atau sore (setelah 16:00). Jangan siram siang.`,
      urgency: 'tinggi',
    });
  } else if (suhuMax >= 32) {
    tips.push({
      icon: 'thermometer',
      title: 'Suhu cukup panas',
      detail: `Maks ${fmtC(suhuMax)}. Pantau kelembapan tanah. Siram jika tanah mulai kering.`,
      urgency: 'sedang',
    });
  }

  if (suhuMin <= 15) {
    tips.push({
      icon: 'snow',
      title: 'Malam dingin',
      detail: `Minimum ${fmtC(suhuMin)}. Lindungi tanaman muda dari stres dingin. Tutup mulsa jika ada.`,
      urgency: 'sedang',
    });
  }

  // --- Pekan depan (hari 2-7) ---
  const pekanDepan = daily.slice(1, 8);
  const totalHujanPekan = pekanDepan.reduce((s, d) => s + d.precipitationSum, 0);
  const hariHujan = pekanDepan.filter((d) => d.precipitationSum >= 1).length;
  const hariKering = pekanDepan.filter((d) => d.precipitationSum < 0.5).length;

  if (totalHujanPekan >= 50) {
    tips.push({
      icon: 'cloud-download',
      title: 'Pekan depan hujan banyak',
      detail: `${fmtMm(totalHujanPekan)} dalam ${pekanDepan.length} hari (${hariHujan} hari hujan). Siapkan drainase, tunda penanaman baru.`,
      urgency: 'sedang',
    });
  } else if (totalHujanPekan >= 20) {
    tips.push({
      icon: 'cloud',
      title: 'Pekan depan cukup basah',
      detail: `${fmtMm(totalHujanPekan)} dalam ${hariHujan} hari. Waspadai potensi jamur pada tanaman basah.`,
      urgency: 'rendah',
    });
  }

  if (hariKering >= 5 && suhuMax >= 30) {
    tips.push({
      icon: 'water-outline',
      title: 'Pekan depan banyak hari kering',
      detail: `${hariKering} hari kering diprediksi. Siapkan jadwal irigasi teratur.`,
      urgency: 'rendah',
    });
  }

  // Sort by urgency
  const order = { tinggi: 0, sedang: 1, rendah: 2 };
  tips.sort((a, b) => order[a.urgency] - order[b.urgency]);

  return tips.slice(0, 4);
}

function fmtMm(v: number): string {
  return v >= 1 ? `${Math.round(v)} mm` : `${v.toFixed(1)} mm`;
}
function fmtKmh(v: number): string {
  return `${Math.round(v)} km/jam`;
}
function fmtC(v: number): string {
  return `${Math.round(v)}°C`;
}
