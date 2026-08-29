/**
 * Kuota masuk akal per komoditas untuk memfilter harga jelas keliru
 * dari sinkron upstream (SP2KP Kemendag, Panel Harga Kemtan) maupun
 * laporan pengguna. Batas sengaja LEBAR agar harga mahal di Papua atau
 * lonjakan cabai tetap lolos; hanya nilai tak masuk akal yang dibuang.
 *
 * Satuan default: per kg. Komoditas tertentu punya satuan berbeda
 * (LPG per tabung, mie per bungkus, susu per kaleng, minyak per liter).
 */

type Limit = { min: number; max: number; unit?: string };

export const PRICE_LIMITS: Record<string, Limit> = {
  gabah_kering_panen: { min: 3000, max: 15000 },
  gabah_kering_giling: { min: 4000, max: 18000 },
  beras_medium: { min: 7000, max: 25000 },
  beras_premium: { min: 9000, max: 30000 },
  beras_sphp: { min: 6000, max: 22000 },
  jagung_pipilan: { min: 3000, max: 15000 },
  kedelai_kering: { min: 8000, max: 25000 },
  cabai_rawit_merah: { min: 12000, max: 300000 },
  cabai_rawit_hijau: { min: 10000, max: 200000 },
  cabai_merah_besar: { min: 12000, max: 200000 },
  cabai_merah_keriting: { min: 12000, max: 200000 },
  cabai_hijau_besar: { min: 5000, max: 100000 },
  bawang_merah: { min: 12000, max: 120000 },
  bawang_putih: { min: 15000, max: 80000 },
  bawang_bombay: { min: 12000, max: 60000 },
  bawang_daun: { min: 5000, max: 30000 },
  tomat: { min: 3000, max: 60000 },
  kentang: { min: 6000, max: 40000 },
  wortel: { min: 5000, max: 30000 },
  kol: { min: 2000, max: 25000 },
  kacang_tanah: { min: 10000, max: 50000 },
  kacang_hijau: { min: 12000, max: 40000 },
  kacang_panjang: { min: 4000, max: 30000 },
  kangkung: { min: 2000, max: 30000 },
  sawi_hijau: { min: 2000, max: 30000 },
  jeruk_lokal: { min: 5000, max: 30000 },
  pisang_lokal: { min: 3000, max: 25000 },
  gula_pasir: { min: 12000, max: 25000 },
  minyak_goreng_curah: { min: 10000, max: 30000, unit: 'liter' },
  minyak_goreng_kemasan: { min: 12000, max: 50000, unit: 'liter' },
  tepung_terigu: { min: 7000, max: 25000 },
  telur_ayam: { min: 18000, max: 45000 },
  ayam_broiler: { min: 20000, max: 60000 },
  sapi_murni: { min: 90000, max: 250000 },
  ikan_kembung: { min: 18000, max: 90000 },
  ikan_bandeng: { min: 12000, max: 90000 },
  ikan_tongkol: { min: 12000, max: 90000 },
  ikan_lele: { min: 12000, max: 60000 },
  ikan_nila: { min: 15000, max: 60000 },
  ikan_teri: { min: 25000, max: 150000 },
  udang_windu: { min: 45000, max: 300000 },
  pupuk_urea: { min: 1500, max: 25000 },
  pupuk_npk: { min: 1500, max: 25000 },
  pupuk_sp36: { min: 1500, max: 25000 },
  pupuk_za: { min: 1500, max: 20000 },
  lpg_3kg: { min: 12000, max: 40000, unit: 'tabung 3 kg' },
  lpg_12kg: { min: 160000, max: 500000, unit: 'tabung 12 kg' },
  semen_portland: { min: 500, max: 5000 },
  mie_instan: { min: 1000, max: 10000, unit: 'bungkus' },
  garam_halus: { min: 3000, max: 30000 },
  susu_bubuk: { min: 20000, max: 100000, unit: 'kaleng' },
  susu_kemanis: { min: 6000, max: 30000, unit: 'kaleng' },
};

const DEFAULT_UNITS: Record<string, string> = {
  lpg_3kg: 'tabung 3 kg',
  lpg_12kg: 'tabung 12 kg',
  mie_instan: 'bungkus',
  susu_bubuk: 'kaleng',
  susu_kemanis: 'kaleng',
};

/** Satuan tampilan kanonik per komoditas; fallback satuan dari baris. */
export function displayUnitFor(commodity: string, fallback?: string): string {
  return PRICE_LIMITS[commodity]?.unit ?? DEFAULT_UNITS[commodity] ?? fallback ?? 'kg';
}

/** Kembalikan harga bila masuk akal, atau null bila jelas abnormal. */
export function sanitizePrice(commodity: string, price: number): number | null {
  const limit = PRICE_LIMITS[commodity];
  if (limit) {
    if (!Number.isFinite(price) || price < limit.min || price > limit.max) return null;
  } else if (!Number.isFinite(price) || price < 500 || price > 10_000_000) {
    return null;
  }
  return Math.round(price);
}