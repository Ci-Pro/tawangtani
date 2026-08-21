import { AreaUnit } from '@/types';
import { areaToHa, assertPositive } from '@/utils/format';

export type PesticideDoseUnit = 'mL/L' | 'g/L' | 'mL/ha' | 'g/ha' | 'L/ha' | 'kg/ha';

export const PESTICIDE_DOSE_UNITS: PesticideDoseUnit[] = [
  'mL/L',
  'g/L',
  'mL/ha',
  'g/ha',
  'L/ha',
  'kg/ha',
];

const CONCENTRATION_UNITS: PesticideDoseUnit[] = ['mL/L', 'g/L'];
const MASS_UNITS: PesticideDoseUnit[] = ['g/L', 'g/ha', 'kg/ha'];

export interface PesticideInput {
  dose: number;
  doseUnit: PesticideDoseUnit;
  tankVolumeL: number;
  areaValue: number;
  areaUnit: AreaUnit;
  waterRateLPerHa?: number;
}

export interface PesticideResult {
  areaHa: number;
  totalWaterL: number;
  tanksNeeded: number;
  productPerTankValue: number;
  productPerTankUnit: 'mL' | 'g';
  productTotalValue: number;
  productTotalUnit: 'mL' | 'g' | 'L' | 'kg';
  formula: string[];
}

function unitKind(unit: PesticideDoseUnit): 'volume' | 'mass' {
  return MASS_UNITS.includes(unit) ? 'mass' : 'volume';
}

export function calcPesticide(input: PesticideInput): PesticideResult {
  assertPositive(input.dose, 'Dosis');
  assertPositive(input.tankVolumeL, 'Volume tangki');
  const areaHa = areaToHa(input.areaValue, input.areaUnit);

  const kind = unitKind(input.doseUnit);
  const volUnitSmall = kind === 'volume' ? 'mL' : 'g';
  const isConcentration = CONCENTRATION_UNITS.includes(input.doseUnit);

  let totalWaterL: number;
  let productTotal: number;
  const formula: string[] = [];

  if (isConcentration) {
    if (!input.waterRateLPerHa || input.waterRateLPerHa <= 0) {
      throw new Error('Volume air (L/ha) wajib diisi untuk dosis konsentrasi');
    }
    assertPositive(input.waterRateLPerHa, 'Volume air');
    totalWaterL = input.waterRateLPerHa * areaHa;
    productTotal = input.dose * totalWaterL;
    formula.push(`Total air = volume air (L/ha) × luas (ha)`);
    formula.push(
      `Total air = ${input.waterRateLPerHa} L/ha × ${areaHa.toFixed(4)} ha = ${totalWaterL.toFixed(1)} L`
    );
    formula.push(`Total produk = dosis (${input.doseUnit}) × total air (L)`);
    formula.push(
      `Total produk = ${input.dose} ${input.doseUnit} × ${totalWaterL.toFixed(1)} L = ${productTotal.toFixed(1)} ${volUnitSmall}`
    );
  } else {
    if (!input.waterRateLPerHa || input.waterRateLPerHa <= 0) {
      throw new Error('Volume air (L/ha) wajib diisi untuk estimasi jumlah tangki');
    }
    assertPositive(input.waterRateLPerHa, 'Volume air');
    totalWaterL = input.waterRateLPerHa * areaHa;
    productTotal = input.dose * areaHa;
    formula.push(`Total produk = dosis (${input.doseUnit}) × luas (ha)`);
    formula.push(
      `Total produk = ${input.dose} ${input.doseUnit} × ${areaHa.toFixed(4)} ha = ${productTotal.toFixed(2)} ${volUnitSmall}`
    );
    formula.push(
      `Total air = ${input.waterRateLPerHa} L/ha × ${areaHa.toFixed(4)} ha = ${totalWaterL.toFixed(1)} L`
    );
  }

  const tanksNeeded = Math.max(1, Math.ceil(totalWaterL / input.tankVolumeL));
  const productPerTank = productTotal / tanksNeeded;

  formula.push(
    `Jumlah tangki = ceil(${totalWaterL.toFixed(1)} L ÷ ${input.tankVolumeL} L) = ${tanksNeeded} tangki`
  );
  formula.push(
    `Produk per tangki = ${productTotal.toFixed(1)} ${volUnitSmall} ÷ ${tanksNeeded} = ${productPerTank.toFixed(1)} ${volUnitSmall}`
  );

  const bigUnit = kind === 'volume' ? 'L' : 'kg';

  return {
    areaHa,
    totalWaterL,
    tanksNeeded,
    productPerTankValue: productPerTank,
    productPerTankUnit: volUnitSmall as 'mL' | 'g',
    productTotalValue: productTotal,
    productTotalUnit:
      productTotal >= 1000
        ? bigUnit as 'L' | 'kg'
        : (volUnitSmall as 'mL' | 'g'),
    formula,
  };
}
