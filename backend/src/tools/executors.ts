import { ToolContext, ToolResult } from '../types';

function assertPositive(v: number, name: string): void {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} harus lebih dari 0`);
}

const AREA_TO_M2: Record<string, number> = { m2: 1, are: 100, ha: 10000 };

interface WeatherCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
}

async function weatherSummary(lat: number, lon: number, locationName?: string): Promise<ToolResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    timezone: 'auto',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error('Gagal mengambil cuaca');
  const json = (await res.json()) as { current?: WeatherCurrent };
  const c = json.current;
  if (!c) throw new Error('Data cuaca tidak lengkap');

  let level = 'IDEAL';
  const reasons: string[] = [];
  if (c.wind_speed_10m > 15) {
    level = 'HINDARI';
    reasons.push(`angin kencang ${c.wind_speed_10m.toFixed(0)} km/jam`);
  } else if (c.wind_speed_10m > 10) {
    level = 'HATI-HATI';
    reasons.push(`angin agak kencang ${c.wind_speed_10m.toFixed(0)} km/jam`);
  }
  if (c.precipitation > 0.5) {
    level = 'HINDARI';
    reasons.push('sedang hujan');
  } else if (c.precipitation > 0) {
    if (level === 'IDEAL') level = 'HATI-HATI';
    reasons.push('gerimis ringan');
  }
  if (c.temperature_2m > 32) {
    if (level === 'IDEAL') level = 'HATI-HATI';
    reasons.push(`suhu tinggi ${c.temperature_2m.toFixed(0)}°C`);
  }
  if (reasons.length === 0) reasons.push('kondisi mendukung penyemprotan');

  return {
    summary:
      `Cuaca di ${locationName || 'lokasi pengguna'}: ${c.temperature_2m}°C, ` +
      `kelembapan ${c.relative_humidity_2m}%, hujan ${c.precipitation} mm, angin ${c.wind_speed_10m} km/jam. ` +
      `Kondisi semprot: ${level} (${reasons.join('; ')}).`,
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (name) {
    case 'get_weather': {
      if (!ctx.coords) {
        return { summary: 'Lokasi belum tersedia. Minta pengguna mengaktifkan izin lokasi di aplikasi.' };
      }
      return weatherSummary(ctx.coords.lat, ctx.coords.lon, ctx.locationName);
    }

    case 'fertilizer_calculator': {
      const areaValue = Number(args.areaValue);
      const dose = Number(args.dose);
      assertPositive(areaValue, 'Luas');
      assertPositive(dose, 'Dosis');
      const areaUnit = String(args.areaUnit ?? 'ha');
      const doseUnit = String(args.doseUnit ?? 'kg/ha');
      const areaHa = (areaValue * (AREA_TO_M2[areaUnit] ?? 10000)) / 10000;
      const dosePerHa =
        doseUnit === 'g/m2' ? dose * 10 : doseUnit === 'kg/m2' ? dose * 10000 : doseUnit === 'g/ha' ? dose / 1000 : doseUnit === 'ton/ha' ? dose * 1000 : dose;
      const totalKg = areaHa * dosePerHa;
      let extra = '';
      const gridCount = args.gridCount ? Number(args.gridCount) : 0;
      if (gridCount > 1) {
        extra = ` Per petak (${gridCount}): ${(totalKg / gridCount).toFixed(3)} kg.`;
      }
      return {
        summary:
          `Kebutuhan pupuk: luas ${areaHa.toFixed(4)} ha × ${dosePerHa} kg/ha = ${totalKg.toFixed(3)} kg.` +
          extra,
      };
    }

    case 'pesticide_calculator': {
      const dose = Number(args.dose);
      const tankVolumeL = Number(args.tankVolumeL);
      const areaValue = Number(args.areaValue);
      const waterRate = Number(args.waterRateLPerHa ?? 600);
      assertPositive(dose, 'Dosis');
      assertPositive(tankVolumeL, 'Volume tangki');
      assertPositive(areaValue, 'Luas');
      const areaUnit = String(args.areaUnit ?? 'ha');
      const areaHa = (areaValue * (AREA_TO_M2[areaUnit] ?? 10000)) / 10000;
      const doseUnit = String(args.doseUnit ?? 'mL/L');
      const totalWaterL = waterRate * areaHa;
      const tanks = Math.max(1, Math.ceil(totalWaterL / tankVolumeL));
      const isConcentration = doseUnit.endsWith('/L');
      const unitSmall = doseUnit.startsWith('g') ? 'g' : 'mL';
      const productTotal = isConcentration ? dose * totalWaterL : dose * areaHa;
      const perTank = productTotal / tanks;
      return {
        summary:
          `${tanks} tangki × ${perTank.toFixed(1)} ${unitSmall}/tangki. Total produk ${productTotal.toFixed(1)} ${unitSmall}, total air ${totalWaterL.toFixed(0)} L. ` +
          'Ingatkan pengguna mengikuti label resmi produk.',
      };
    }

    case 'product_search': {
      const q = String(args.query ?? '').toLowerCase().trim();
      const products = ctx.products ?? [];
      const found = products
        .filter((p) => {
          if (!q) return true;
          return (
            p.brand.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.activeIngredient.toLowerCase().includes(q) ||
            p.doses.some(
              (d) => d.crop.toLowerCase().includes(q) || d.target.toLowerCase().includes(q)
            )
          );
        })
        .slice(0, 5);
      if (found.length === 0) {
        return { summary: 'Tidak ada produk cocok di katalog.' };
      }
      return {
        summary:
          'Produk ditemukan:\n' +
          found
            .map(
              (p) =>
                `- ${p.brand} — ${p.name} (${p.formulation}), bahan aktif: ${p.activeIngredient}` +
                (p.doses[0] ? `, dosis referensi: ${p.doses[0].dose} ${p.doses[0].unit} untuk ${p.doses[0].crop}` : '')
            )
            .join('\n'),
      };
    }

    case 'farm_context': {
      const f = ctx.farmContext;
      if (!f?.farmName) {
        return { summary: 'Pengguna belum memiliki profil lahan.' };
      }
      const crops = f.cropsText?.length ? f.cropsText.join(', ') : 'belum ada tanaman';
      return { summary: `Lahan "${f.farmName}" (${f.areaText}). Tanaman: ${crops}.` };
    }

    case 'activity_log': {
      const activity = String(args.activity ?? 'lainnya');
      return {
        summary: `Aktivitas "${activity}" dicatat. Beri tahu pengguna untuk memeriksa dan melengkapi detail di menu Aktivitas aplikasi.`,
      };
    }

    default:
      return { summary: `Tool "${name}" tidak dikenal.` };
  }
}
