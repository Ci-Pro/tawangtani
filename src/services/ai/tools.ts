import { Product } from '@/types';
import { calcFertilizer, FertilizerInput } from '@/features/fertilizer/calculator';
import { calcPesticide, PesticideInput } from '@/features/pesticide/calculator';
import { fetchWeatherCached, describeWeatherCode, sprayCondition } from '@/services/weather/openMeteo';
import { fmtNum } from '@/utils/format';
import { useActivityStore } from '@/store/useActivityStore';
import { todayISO } from '@/utils/date';

export interface FarmContextData {
  farmName?: string;
  areaText?: string;
  cropsText?: string[];
}

export interface ToolContext {
  coords?: { lat: number; lon: number };
  locationName?: string;
  farmContext?: FarmContextData;
  products: Product[];
}

export interface ToolResult {
  summary: string;
  data?: unknown;
}

export interface ToolDef {
  name: string;
  description: string;
}

export const TOOLS: ToolDef[] = [
  { name: 'get_weather', description: 'Ambil cuaca terkini & kondisi semprot untuk lokasi pengguna' },
  { name: 'fertilizer_calculator', description: 'Hitung kebutuhan pupuk dari luas lahan dan dosis' },
  { name: 'pesticide_calculator', description: 'Hitung kebutuhan pestisida dari dosis, volume tangki, luas' },
  { name: 'product_search', description: 'Cari produk pertanian (pupuk/pestisida) di katalog' },
  { name: 'farm_context', description: 'Ambil konteks lahan & tanaman aktif pengguna' },
  { name: 'activity_log', description: 'Simpan aktivitas budidaya ke riwayat' },
];

function searchProducts(ctx: ToolContext, query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return ctx.products.slice(0, 5);
  return ctx.products
    .filter(
      (p) =>
        p.brand.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.activeIngredient.toLowerCase().includes(q) ||
        p.category.includes(q)
    )
    .slice(0, 5);
}

const DISCLAIMER =
  '\n\n⚠️ Data dosis bersumber dari katalog aplikasi dan wajib diverifikasi ke label resmi produk sebelum digunakan.';

export async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case 'get_weather': {
      if (!ctx.coords) {
        return { summary: 'Lokasi belum tersedia. Aktifkan izin lokasi di beranda untuk data cuaca.' };
      }
      const w = await fetchWeatherCached(ctx.coords.lat, ctx.coords.lon);
      const wc = describeWeatherCode(w.current.weatherCode);
      const spray = sprayCondition(w.current);
      const lines = [
        `Cuaca di ${ctx.locationName ?? 'lokasi Anda'}: ${wc.desc}, ${fmtNum(w.current.temperature, 1)}°C,`,
        `kelembapan ${fmtNum(w.current.humidity, 0)}%, angin ${fmtNum(w.current.windSpeed, 0)} km/jam.`,
        `Kondisi semprot: ${spray.level.toUpperCase()} — ${spray.reasons.join('; ')}.`,
      ];
      return { summary: lines.join(' '), data: w };
    }
    case 'fertilizer_calculator': {
      const input: FertilizerInput = {
        areaValue: Number(args.areaValue ?? 1),
        areaUnit: (args.areaUnit as FertilizerInput['areaUnit']) ?? 'ha',
        dose: Number(args.dose ?? 0),
        doseUnit: (args.doseUnit as FertilizerInput['doseUnit']) ?? 'kg/ha',
        gridCount: args.gridCount ? Number(args.gridCount) : undefined,
      };
      const r = calcFertilizer(input);
      return {
        summary: `Kebutuhan pupuk: ${fmtNum(r.totalKg)} kg (${fmtNum(r.totalG, 0)} g). Rumus: ${r.formula.split('\n').slice(1).join(' ')}`,
        data: r,
      };
    }
    case 'pesticide_calculator': {
      const input: PesticideInput = {
        dose: Number(args.dose ?? 0),
        doseUnit: (args.doseUnit as PesticideInput['doseUnit']) ?? 'mL/L',
        tankVolumeL: Number(args.tankVolumeL ?? 14),
        areaValue: Number(args.areaValue ?? 1),
        areaUnit: (args.areaUnit as PesticideInput['areaUnit']) ?? 'ha',
        waterRateLPerHa: args.waterRateLPerHa ? Number(args.waterRateLPerHa) : undefined,
      };
      const r = calcPesticide(input);
      return {
        summary: `${r.tanksNeeded} tangki × ${fmtNum(r.productPerTankValue, 1)} ${r.productPerTankUnit}/tangki. Total ${fmtNum(r.productTotalValue, 1)} ${r.productTotalUnit}, air ${fmtNum(r.totalWaterL, 0)} L.${DISCLAIMER}`,
        data: r,
      };
    }
    case 'product_search': {
      const results = searchProducts(ctx, String(args.query ?? ''));
      if (results.length === 0) {
        return { summary: 'Tidak ada produk cocok di katalog. Coba kata kunci lain (merek/bahan aktif).' };
      }
      const lines = results.map(
        (p) => `• ${p.brand} — ${p.name} (${p.formulation}), bahan aktif: ${p.activeIngredient}`
      );
      return { summary: `Produk ditemukan:\n${lines.join('\n')}${DISCLAIMER}`, data: results };
    }
    case 'farm_context': {
      const f = ctx.farmContext;
      if (!f?.farmName) {
        return { summary: 'Belum ada profil lahan. Tambahkan lahan di menu Lahan agar saya bisa memberi konteks.' };
      }
      const crops = f.cropsText?.length ? f.cropsText.join(', ') : 'belum ada tanaman';
      return { summary: `Lahan "${f.farmName}" (${f.areaText}). Tanaman: ${crops}.` };
    }
    case 'activity_log': {
      const activity = (args.activity as string) ?? 'lainnya';
      const valid: string[] = ['tanam', 'pemupukan', 'penyemprotan', 'penyiraman', 'penyiangan', 'panen', 'lainnya'];
      const type = (valid.includes(activity) ? activity : 'lainnya') as Parameters<
        ReturnType<typeof useActivityStore.getState>['add']
      >[0]['activity'];
      await useActivityStore.getState().add({
        activity: type,
        date: (args.date as string) ?? todayISO(),
        productName: args.productName ? String(args.productName) : undefined,
        doseText: args.doseText ? String(args.doseText) : undefined,
        note: 'Dicatat oleh AI Tani',
        source: 'ai',
      });
      return {
        summary: `Aktivitas "${type}" dicatat ke daftar Aktivitas hari ini. Silakan cek & sesuaikan di menu Aktivitas.`,
      };
    }
    default:
      return { summary: `Tool "${name}" tidak dikenal.` };
  }
}
