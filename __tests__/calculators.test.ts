import { calcFertilizer } from '../src/features/fertilizer/calculator';
import { calcPesticide } from '../src/features/pesticide/calculator';
import { convertArea, areaToHa } from '../src/utils/format';

describe('Kalkulator Pupuk', () => {
  it('menghitung kebutuhan dasar: 1 ha × 200 kg/ha = 200 kg', () => {
    const r = calcFertilizer({ areaValue: 1, areaUnit: 'ha', dose: 200, doseUnit: 'kg/ha' });
    expect(r.totalKg).toBeCloseTo(200);
    expect(r.areaHa).toBeCloseTo(1);
  });

  it('konversi g/m2 ke kg: 1000 m2 × 50 g/m2 = 50 kg', () => {
    const r = calcFertilizer({ areaValue: 1000, areaUnit: 'm2', dose: 50, doseUnit: 'g/m2' });
    expect(r.totalKg).toBeCloseTo(50);
  });

  it('pembagian per petak: 2 ha × 300 kg/ha dibagi 4 petak = 150 kg/petak', () => {
    const r = calcFertilizer({
      areaValue: 2,
      areaUnit: 'ha',
      dose: 300,
      doseUnit: 'kg/ha',
      gridCount: 4,
    });
    expect(r.totalKg).toBeCloseTo(600);
    expect(r.perGridKg).toBeCloseTo(150);
  });

  it('rumus ditampilkan untuk verifikasi', () => {
    const r = calcFertilizer({ areaValue: 1, areaUnit: 'ha', dose: 200, doseUnit: 'kg/ha' });
    expect(r.formula).toContain('×');
  });

  it('menolak dosis negatif', () => {
    expect(() =>
      calcFertilizer({ areaValue: 1, areaUnit: 'ha', dose: -5, doseUnit: 'kg/ha' })
    ).toThrow();
  });
});

describe('Kalkulator Pestisida', () => {
  const base = {
    tankVolumeL: 14,
    areaValue: 1,
    areaUnit: 'ha' as const,
    waterRateLPerHa: 600,
  };

  it('dosis konsentrasi: 2 mL/L, air 600 L → total 1200 mL', () => {
    const r = calcPesticide({ ...base, dose: 2, doseUnit: 'mL/L' });
    expect(r.productTotalValue).toBeCloseTo(1200);
    expect(r.totalWaterL).toBeCloseTo(600);
    expect(r.tanksNeeded).toBe(Math.ceil(600 / 14));
  });

  it('produk per tangki = total / jumlah tangki', () => {
    const r = calcPesticide({ ...base, dose: 2, doseUnit: 'mL/L' });
    expect(r.productPerTankValue).toBeCloseTo(1200 / r.tanksNeeded);
  });

  it('dosis per hektare: 500 mL/ha pada 2 ha → total 1000 mL', () => {
    const r = calcPesticide({ ...base, areaValue: 2, dose: 500, doseUnit: 'mL/ha' });
    expect(r.productTotalValue).toBeCloseTo(1000);
    expect(r.totalWaterL).toBeCloseTo(1200);
  });

  it('jumlah tangki minimal 1 meski luas kecil', () => {
    const r = calcPesticide({
      ...base,
      areaValue: 0.01,
      dose: 2,
      doseUnit: 'mL/L',
      waterRateLPerHa: 600,
    });
    expect(r.tanksNeeded).toBeGreaterThanOrEqual(1);
  });

  it('wajib ada volume air untuk dosis konsentrasi', () => {
    expect(() =>
      calcPesticide({ dose: 2, doseUnit: 'mL/L', tankVolumeL: 14, areaValue: 1, areaUnit: 'ha' })
    ).toThrow();
  });
});

describe('Konversi Satuan', () => {
  it('1 ha = 100 are = 10.000 m2', () => {
    expect(convertArea(1, 'ha', 'are')).toBeCloseTo(100);
    expect(convertArea(1, 'ha', 'm2')).toBeCloseTo(10000);
    expect(areaToHa(2500, 'm2')).toBeCloseTo(0.25);
  });
});
