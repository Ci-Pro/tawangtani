import { AreaUnit } from '@/types';

export const AREA_UNITS: AreaUnit[] = ['m2', 'are', 'ha'];

export const AREA_LABEL: Record<AreaUnit, string> = {
  m2: 'm²',
  are: 'are',
  ha: 'hektare',
};

const AREA_TO_M2: Record<AreaUnit, number> = {
  m2: 1,
  are: 100,
  ha: 10000,
};

export function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus berupa angka lebih dari 0`);
  }
}

export function areaToM2(value: number, unit: AreaUnit): number {
  assertPositive(value, 'Luas lahan');
  return value * AREA_TO_M2[unit];
}

export function areaToHa(value: number, unit: AreaUnit): number {
  return areaToM2(value, unit) / 10000;
}

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return (value * AREA_TO_M2[from]) / AREA_TO_M2[to];
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function fmtNum(value: number, maxDigits = 2): string {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('id-ID', { maximumFractionDigits: maxDigits });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseIdNumber(raw: string): number | null {
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
