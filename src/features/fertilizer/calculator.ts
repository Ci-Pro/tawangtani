import { AreaUnit } from '@/types';
import { areaToHa, assertPositive } from '@/utils/format';

export type FertilizerDoseUnit = 'kg/ha' | 'g/m2' | 'kg/m2' | 'g/ha' | 'ton/ha';

export type FertilizerMethod = 'tabur' | 'kocor' | 'larut-air' | 'lainnya';

export const FERTILIZER_DOSE_UNITS: FertilizerDoseUnit[] = [
  'kg/ha',
  'g/m2',
  'kg/m2',
  'g/ha',
  'ton/ha',
];

export const FERTILIZER_METHODS: FertilizerMethod[] = ['tabur', 'kocor', 'larut-air', 'lainnya'];

export const FERTILIZER_METHOD_LABEL: Record<FertilizerMethod, string> = {
  tabur: 'Tabur',
  kocor: 'Kocor',
  'larut-air': 'Larut air',
  lainnya: 'Lainnya',
};

export const METHOD_HINT: Record<FertilizerMethod, string> = {
  tabur: 'Tabur merata lalu aduk/inpor tanah ringan; hindari kontak langsung dengan batang.',
  kocor: 'Aplikasi di sekitar lingkar tanaman atau alur, kemudian ditutup tanah.',
  'larut-air': 'Larutkan sesuai takaran air; gunakan saat tanaman membutuhkan serapan cepat.',
  lainnya: 'Ikuti petunjuk pada kemasan atau rekomendasi penyuluh.',
};

export interface FertilizerInput {
  areaValue: number;
  areaUnit: AreaUnit;
  dose: number;
  doseUnit: FertilizerDoseUnit;
  gridCount?: number;
}

export interface FertilizerResult {
  areaHa: number;
  areaM2: number;
  dosePerHaKg: number;
  totalKg: number;
  totalG: number;
  gridCount?: number;
  perGridKg?: number;
  formula: string;
}

const DOSE_TO_KG_PER_HA: Record<FertilizerDoseUnit, (d: number) => number> = {
  'kg/ha': (d) => d,
  'g/m2': (d) => (d * 1) / 1,
  'kg/m2': (d) => d * 10000,
  'g/ha': (d) => d / 1000,
  'ton/ha': (d) => d * 1000,
};

export function calcFertilizer(input: FertilizerInput): FertilizerResult {
  assertPositive(input.dose, 'Dosis');
  const areaHa = areaToHa(input.areaValue, input.areaUnit);
  const areaM2 = areaHa * 10000;

  let dosePerHaKg: number;
  if (input.doseUnit === 'g/m2') {
    dosePerHaKg = input.dose * 10;
  } else {
    dosePerHaKg = DOSE_TO_KG_PER_HA[input.doseUnit](input.dose);
  }

  const totalKg = areaHa * dosePerHaKg;

  const formulaParts = [
    `Luas = ${input.areaValue} ${input.areaUnit} = ${areaHa.toFixed(4)} ha`,
    `Total = luas (ha) × dosis (kg/ha)`,
    `Total = ${areaHa.toFixed(4)} ha × ${dosePerHaKg} kg/ha = ${totalKg.toFixed(3)} kg`,
  ];

  let perGridKg: number | undefined;
  let gridCount: number | undefined;
  if (input.gridCount && input.gridCount > 1) {
    gridCount = Math.floor(input.gridCount);
    perGridKg = totalKg / gridCount;
    formulaParts.push(
      `Per petak = ${totalKg.toFixed(3)} kg ÷ ${gridCount} petak = ${perGridKg.toFixed(3)} kg`
    );
  }

  return {
    areaHa,
    areaM2,
    dosePerHaKg,
    totalKg,
    totalG: totalKg * 1000,
    gridCount,
    perGridKg,
    formula: formulaParts.join('\n'),
  };
}
