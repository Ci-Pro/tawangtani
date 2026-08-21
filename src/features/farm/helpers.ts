import { Crop, GrowthStage } from '@/types';

export const GROWTH_STAGES: GrowthStage[] = [
  'semai',
  'vegetatif',
  'generatif',
  'pematangan',
  'panen',
];

export const GROWTH_STAGE_LABEL: Record<GrowthStage, string> = {
  semai: 'Semai',
  vegetatif: 'Vegetatif',
  generatif: 'Generatif',
  pematangan: 'Pematangan',
  panen: 'Panen',
};

export function cropAgeDays(plantingDate?: string): number | null {
  if (!plantingDate) return null;
  const planted = new Date(plantingDate).getTime();
  if (Number.isNaN(planted)) return null;
  return Math.max(0, Math.floor((Date.now() - planted) / 86400000));
}

export function describeCrop(crop: Crop): string {
  const parts = [crop.cropType];
  if (crop.variety) parts.push(crop.variety);
  const age = cropAgeDays(crop.plantingDate);
  if (age !== null) parts.push(`${age} hari`);
  parts.push(GROWTH_STAGE_LABEL[crop.growthStage]);
  return parts.join(' • ');
}

export function suggestNextStage(stage: GrowthStage): string {
  const map: Record<GrowthStage, string> = {
    semai: 'Siapkan lahan & pindah tanam saat semai cukup umur',
    vegetatif: 'Pantau hama daun & lakukan pemupukan susulan sesuai rekomendasi',
    generatif: 'Jaga kestabilan air; hindari penyemprotan berlebih di fase bunga',
    pematangan: 'Kurangi air menjelang panen; siapkan alat panen',
    panen: 'Panen pada waktu tepat; catat hasil untuk riwayat',
  };
  return map[stage];
}
