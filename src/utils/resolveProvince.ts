import { PROVINCE_LIST } from '@/services/kemtanSync';

/**
 * Normalisasi nama provinsi dari reverse geocoding (expo-location)
 * ke slug provinsi di PROVINCE_LIST (lowercase, tanpa "Provinsi" prefix).
 */
export function resolveProvince(region: string | null | undefined): string | null {
  if (!region) return null;
  const raw = region
    .replace(/^prov\.?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!raw) return null;

  if (PROVINCE_LIST.includes(raw)) return raw;

  const noDiacritics = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  const match = PROVINCE_LIST.find((p) => {
    const norm = p
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    return norm === noDiacritics || norm.includes(noDiacritics) || noDiacritics.includes(norm);
  });

  return match ?? null;
}
