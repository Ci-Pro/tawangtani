import { ToolContext, ToolResult } from '../types';
import { searchKnowledge } from '../store/knowledge';
import { listMarketPrices } from '../store/marketPrices';
import { resolveCommodity, listCommoditySlugs } from '../services/commodityMatch';
import { resolveProvince, listMarketProvinces } from '../services/provinceMatch';
import { validateToolArgs } from './schemas';
import { config } from '../config';
import { insertFarmActivity } from '../store/farmActivities';

/** Terima ragam bentuk level harga: 1/2/3, 'producer'|'wholesale'|'retail', istilah Indonesia. */
const LEVEL_MAP: Record<string, number> = {
  produsen: 1,
  producer: 1,
  petani: 1,
  grosir: 2,
  wholesale: 2,
  kios: 2,
  penggrosok: 2,
  eceran: 3,
  retail: 3,
  konsumen: 3,
  pasar: 3,
};

function coerceLevel(v: unknown): number | undefined {
  if (typeof v === 'number') return v >= 1 && v <= 3 ? Math.round(v) : undefined;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (/^[123]$/.test(s)) return Number(s);
    return LEVEL_MAP[s];
  }
  return undefined;
}
import { guidanceFor, toView } from '../services/marketData';
import { getSeries } from '../services/marketHistory';

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

// Cache cuaca sederhana agar chat beruntun tidak menghantam Open-Meteo
const weatherCache = new Map<string, { at: number; data: ToolResult }>();
const WEATHER_TTL_MS = 10 * 60 * 1000;

async function weatherSummary(lat: number, lon: number, locationName?: string): Promise<ToolResult> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = weatherCache.get(key);
  if (hit && Date.now() - hit.at < WEATHER_TTL_MS) return hit.data;

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

  const result: ToolResult = {
    summary:
      `Cuaca di ${locationName || 'lokasi pengguna'}: ${c.temperature_2m}°C, ` +
      `kelembapan ${c.relative_humidity_2m}%, hujan ${c.precipitation} mm, angin ${c.wind_speed_10m} km/jam. ` +
      `Kondisi semprot: ${level} (${reasons.join('; ')}).`,
  };
  weatherCache.set(key, { at: Date.now(), data: result });
  if (weatherCache.size > 50) {
    const oldest = weatherCache.keys().next().value;
    if (oldest) weatherCache.delete(oldest);
  }
  return result;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  // P2: validasi skema argumen — galat dikembalikan agar model bisa mengulang.
  const invalid = validateToolArgs(name, args);
  if (invalid) {
    return {
      summary: `Permintaan tool tidak valid: ${invalid} Perbaiki dan panggil tool lagi.`,
    };
  }

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
      const STOP = new Set([
        'dan', 'atau', 'untuk', 'yang', 'pada', 'dengan', 'apa', 'saja', 'adalah', 'itu',
        'rekomendasi', 'rekomendasikan', 'beserta', 'tersedia', 'tersedia', 'tolong',
        'obat', 'produk', 'pupuk', 'merek', 'harga', 'tanaman', 'serangan', 'hebat',
      ]);
      const words = q.split(/[^a-z0-9]+/i).filter((w) => w.length >= 3 && !STOP.has(w));
      const norm = (s: unknown) => String(s ?? '').toLowerCase();

      let found: Array<{ p: (typeof products)[number]; score: number }>;
      if (!words.length) {
        found = products.slice(0, 6).map((p) => ({ p, score: 1 }));
      } else {
        found = products
          .map((p) => {
            const hay = [
              norm(p.brand),
              norm(p.name),
              norm(p.activeIngredient),
              norm(p.formulation),
              norm(p.category),
              ...p.doses.map((d) => `${norm(d.crop)} ${norm(d.target)}`),
            ].join(' | ');
            let score = 0;
            for (const w of words) if (hay.includes(w)) score += 1;
            return { p, score };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
      }

      if (found.length === 0) {
        return { summary: 'Tidak ada produk cocok di katalog.' };
      }
      return {
        summary:
          'Produk ditemukan:\n' +
          found
            .map(({ p }) =>
              `- ${p.brand} — ${p.name} (${p.formulation}), bahan aktif: ${p.activeIngredient}` +
              (p.doses[0]
                ? `, dosis referensi: ${p.doses[0].dose} ${p.doses[0].unit} untuk ${p.doses[0].crop}`
                : '')
            )
            .join('\n') +
          '\nIngatkan petani membaca label kemasan sebelum aplikasi.',
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

    case 'search_knowledge': {
      const query = String(args.query ?? '').trim();
      if (!query) return { summary: 'Query pencarian kosong.' };
      const hits = await searchKnowledge(query, 4);
      if (hits.length === 0) {
        return {
          summary:
            'Tidak ada artikel basis pengetahuan yang cocok. Jawab dengan pengetahuan umum yang aman dan sarankan konsultasi PPL.',
        };
      }
      return {
        summary:
          'Artikel basis pengetahuan ditemukan. PENTING: baris TERAKHIR jawaban Anda WAJIB "Sumber: <sumber>" dari artikel yang dipakai.\n' +
          hits
            .map(
              (h) =>
                `- [${h.crop}/${h.topic}] ${h.content} (Sumber: ${h.source})`
            )
            .join('\n'),
      };
    }

    case 'activity_log': {
      const activity = String(args.activity ?? 'lainnya');
      // P4: catat ke backend (bukan sekadar teks statis) bila ada pengguna terautentikasi.
      if (ctx.userId) {
        try {
          await insertFarmActivity({
            user_id: ctx.userId,
            activity,
            product_name: args.productName ? String(args.productName) : undefined,
            dose_text: args.doseText ? String(args.doseText) : undefined,
            date: args.date ? String(args.date) : undefined,
          });
          return {
            summary: `Aktivitas "${activity}" berhasil dicatat ke riwayat aktivitas Anda di server. Pengguna dapat melihat & melengkapinya di menu Aktivitas aplikasi.`,
          };
        } catch (e) {
          console.log('[activity_log] simpan gagal:', (e as Error).message);
          return {
            summary: `Aktivitas "${activity}" belum bisa disimpan karena gangguan server. Coba lagi nanti atau catat lewat menu Aktivitas aplikasi.`,
          };
        }
      }
      return {
        summary: `Aktivitas "${activity}" dicatat. Beri tahu pengguna untuk memeriksa dan melengkapi detail di menu Aktivitas aplikasi.`,
      };
    }

    case 'market_price': {
      const rawCommodity =
        typeof args.commodity === 'string' && args.commodity.trim()
          ? args.commodity.trim().toLowerCase().replace(/\s+/g, '_')
          : undefined;
      const commodity = rawCommodity ? await resolveCommodity(rawCommodity) : undefined;
      const provinceRaw =
        typeof args.province === 'string' && args.province.trim() ? args.province.trim() : undefined;
      const resolvedProvince = provinceRaw ? await resolveProvince(provinceRaw) : undefined;
      const province = resolvedProvince ?? undefined;
      const range = typeof args.range === 'string' ? (args.range as 'daily') : undefined;

      if (rawCommodity && !commodity) {
        const slugs = await listCommoditySlugs();
        return {
          summary: `Komoditas "${rawCommodity}" tidak dikenali. Slug valid: ${slugs.join(', ')}. Ulangi panggilan dengan salah satu slug itu.`,
        };
      }
      if (provinceRaw && resolvedProvince === null) {
        const provs = await listMarketProvinces();
        return {
          summary: `Provinsi "${provinceRaw}" tidak dikenali. Nama provinsi valid: ${provs.join(', ')}. Ulangi panggilan dengan nama yang benar, atau tanpa parameter province untuk harga nasional.`,
        };
      }

      if (range && commodity) {
        const { buckets } = await getSeries(commodity, range, province ?? 'nasional');
        if (buckets.length === 0) {
          return { summary: `Belum ada riwayat ${range} untuk ${commodity}.` };
        }
        const first = buckets[0];
        const last = buckets[buckets.length - 1];
        const changePct = first.avg > 0 ? Math.round(((last.close - first.avg) / first.avg) * 1000) / 10 : null;
        const lines = buckets
          .slice(-12)
          .map((b) => `${b.label}: avg Rp${b.avg.toLocaleString('id-ID')} (min Rp${b.min.toLocaleString('id-ID')} / max Rp${b.max.toLocaleString('id-ID')})`);
        return {
          summary:
            `Riwayat ${range} ${commodity}: perubahan ${changePct}% dari awal periode. Rata-rata awal Rp${first.avg.toLocaleString('id-ID')} → terakhir Rp${last.close.toLocaleString('id-ID')}.\n` +
            lines.join('\n') +
            `\nAnalisis: jelaskan tren (naik/turun/fluktuatif), volatilitas (selisih min-max), dan rekomendasi timing jual yang hati-hati. Ingatkan data adalah referensi nasional.`,
        };
      }

      const rows = await listMarketPrices(commodity, province, coerceLevel(args.level));
      if (rows.length === 0) {
        const slugs = await listCommoditySlugs();
        return {
          summary:
            `Tidak ada data harga untuk komoditas${commodity ? ` ${commodity}` : ''}${province ? ` di ${province}` : ''}. Komoditas yang tersedia: ${slugs.join(', ')}.`,
        };
      }
      const views = rows.map(toView);
      // Tren 7 hari otomatis bila komoditas spesifik diminta
      let trendLine = '';
      if (commodity) {
        try {
          const { buckets } = await getSeries(commodity, 'daily', province ?? 'nasional');
          if (buckets.length >= 8) {
            const now = buckets[buckets.length - 1].close;
            const weekAgo = buckets[buckets.length - 8].close;
            if (weekAgo > 0) {
              const d = Math.round(((now - weekAgo) / weekAgo) * 1000) / 10;
              trendLine = `\nTren 7 hari terakhir: ${d >= 0 ? '+' : ''}${d}% (${d >= 0 ? 'cenderung naik' : 'cenderung turun'}). Untuk pertanyaan kapan jual, panggil market_price dengan range=weekly sebelum menyimpulkan.`;
            }
          }
        } catch {
          // tren opsional
        }
      }
      return {
        summary:
          views
            .map((v) => `${guidanceFor(v)} (Sumber: ${v.source}; diperbarui ${v.updatedAt.slice(0, 10)})`)
            .join('\n') + trendLine,
      };
    }

    default:
      return { summary: `Tool "${name}" tidak dikenal.` };
  }
}
