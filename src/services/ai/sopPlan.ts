import { postJson } from '@/services/api/client';
import { SopPlan, SopPlanStage, GrowthStage } from '@/types';

export interface SopPlanInput {
  cropType: string;
  variety?: string;
  plantingDate?: string;
  growthStage?: SopPlanStage;
  ageDays?: number;
}

export const SOP_SUPPORTED_CROPS: { slug: string; label: string }[] = [
  { slug: 'padi', label: 'Padi' },
  { slug: 'jagung', label: 'Jagung' },
  { slug: 'cabai', label: 'Cabai' },
  { slug: 'bawang_merah', label: 'Bawang Merah' },
  { slug: 'tomat', label: 'Tomat' },
];

export const SOP_STAGES: { stage: SopPlanStage; label: string }[] = [
  { stage: 'semai', label: 'Semai' },
  { stage: 'vegetatif', label: 'Vegetatif' },
  { stage: 'generatif', label: 'Generatif' },
  { stage: 'pematangan', label: 'Pematangan' },
  { stage: 'panen', label: 'Panen' },
];

export function stageLabel(stage: SopPlanStage | GrowthStage): string {
  return SOP_STAGES.find((s) => s.stage === stage)?.label ?? stage;
}

export async function fetchSopPlan(
  backendUrl: string | null,
  input: SopPlanInput,
  timeoutMs = 30000
): Promise<SopPlan> {
  if (!backendUrl) throw new Error('Server TAWANGTANI belum diatur di Pengaturan.');
  return postJson<SopPlan>(`${backendUrl}/api/ai/sop-plan`, input, timeoutMs);
}

export interface ParsedDose {
  value: string;
  unit: string | null;
  raw: string;
}

/**
 * Ekstraksi angka+satuan dari baris dosis grounded, mis.
 * "beri urea 100 kg/ha" → value "100", unit "kg/ha".
 * Tidak mengarang: bila tak ada angka, kembalikan null unit.
 */
export function parseDoseFromText(doseText: string | null | undefined): ParsedDose | null {
  if (!doseText) return null;
  const m = doseText.match(/(\d+(?:[.,]\d+)?)\s*(kg\/ha|kg|liter\/ha|l\/ha|per\s*ha|g\/m2|ml\/l|ml|g\/l|gram|cc|l\b)/i);
  if (!m) return null;
  const value = m[1].replace(',', '.');
  const unitRaw = m[2].toLowerCase();
  let unit: string | null = unitRaw;
  if (/per\s*ha|kg\/ha/.test(unitRaw)) unit = 'kg/ha';
  return { value, unit, raw: m[0].replace(/\s+/g, ' ').trim() };
}