/**
 * Pilar 2 — validasi skema structured output.
 * Mengekstrak & memvalidasi JSON dari teks model (menoleransi model yang
 * menyelipkan teks di sekitar JSON), dan mengembalikan galat bila skema dilanggar.
 */

export interface DiagnosisStructured {
  gejala: string[];
  penyebab: string[];
  keparahan: 'rendah' | 'sedang' | 'tinggi' | 'kritis';
  penanganan: string[];
  keyakinan: number; // 0..1
}

export interface DiagnosisResult {
  ok: boolean;
  structured?: DiagnosisStructured;
  raw: string;
  error?: string;
}

const SEVERITY = new Set(['rendah', 'sedang', 'tinggi', 'kritis']);

function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const trimmed = text.replace(/```json|```/g, '').trim();
  const start = trimmed.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function strArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v.slice(0, 12)) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim().slice(0, 300));
    else return null;
  }
  return out;
}

/** Validasi diagnosis terstruktur; sepelen bila ada lapangan yang tidak valid. */
export function parseDiagnosis(text: string): DiagnosisResult {
  const raw = text ?? '';
  const obj = extractJsonObject(raw);
  if (!obj) {
    // Bukan JSON murni — biarkan teks (model mungkin menolak JSON).
    return { ok: true, raw };
  }

  const gejala = strArray(obj['gejala']);
  const penyebab = strArray(obj['penyebab']);
  const keparahan = String(obj['keparahan'] ?? '').toLowerCase();
  const penanganan = strArray(obj['penanganan']);

  if (!gejala || !penyebab || !SEVERITY.has(keparahan) || !penanganan) {
    return {
      ok: false,
      raw,
      error: 'JSON diagnosis tidak sesuai skema yang diminta.',
    };
  }

  const rawConf = Number(obj['keyakinan'] ?? -1);
  const keyakinan = Number.isFinite(rawConf) ? Math.min(1, Math.max(0, rawConf)) : 0.5;

  return {
    ok: true,
    raw,
    structured: { gejala, penyebab, keparahan: keparahan as DiagnosisStructured['keparahan'], penanganan, keyakinan },
  };
}