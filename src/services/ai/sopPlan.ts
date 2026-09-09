import { postJson } from '@/services/api/client';
import { SopPlan, SopPlanStage, SopPhase, SopStep, GrowthStage } from '@/types';

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  return addDaysISO(iso, days);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Tanggal patokan jadwal SOP: tanggal tanam bila tersedia, atau "hari ini ± titik
 * tengah fase aktif" bila lahan belum punya tanggal (fase sekarang).
 */
export function planBaseDate(plan: SopPlan | null, explicit?: string | null): string | null {
  if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  const active = plan?.phases?.find((p) => p.active);
  if (active) {
    const mid = Math.round((active.hstStart + active.hstEnd) / 2);
    return addDaysISO(todayISO(), -mid);
  }
  return null;
}

export interface PlannedStep {
  key: string;
  phase: SopPhase;
  step: SopStep;
  date: string;
}

/** Konversi langkah-langkah SOP menjadi entri ber-tanggal nyata (untuk kalender). */
export function planStepSchedule(plan: SopPlan, base: string | null): PlannedStep[] {
  const out: PlannedStep[] = [];
  for (const p of plan.phases ?? []) {
    p.steps.forEach((s, i) => {
      const offset =
        p.steps.length <= 1
          ? p.hstStart
          : p.hstStart + Math.round((i / (p.steps.length - 1)) * (p.hstEnd - p.hstStart));
      out.push({
        key: `${plan.crop?.cropType ?? 'sop'}-${p.stage}-${s.id}`,
        phase: p,
        step: s,
        date: base ? addDaysISO(base, offset) : todayISO(),
      });
    });
  }
  return out;
}

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
  { slug: 'kedelai', label: 'Kedelai' },
  { slug: 'kentang', label: 'Kentang' },
  { slug: 'terong', label: 'Terong' },
  { slug: 'kacang_tanah', label: 'Kacang Tanah' },
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