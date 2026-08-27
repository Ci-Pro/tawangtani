import { Router, Request, Response } from 'express';
import { hasApiKey } from '../config';
import { runAgent } from '../services/agent';
import { executeTool } from '../tools/executors';
import { loadCatalog } from '../store/catalog';
import { visionCompletion } from '../services/openrouter';
import { logAiQuery, countRecentAiQueries } from '../store/knowledge';
import { parseDiagnosis } from '../services/structured';
import { userFromHeader } from '../middleware/supabaseUser';
import { ChatMessageIn, ToolContext } from '../types';
import { aiLimiter } from '../middleware/rateLimit';

export const aiRouter = Router();

/** Kata kunci hama/penyakit/tanaman untuk rantai diagnosis -> solusi. */
const PEST_TERMS = [
  'ulat', 'pengorok', 'kutu', 'thrips', 'tungau', 'lalat buah', 'wereng',
  'kumbang', 'belalang', 'spodoptera', 'helicoverpa', 'penggerek', 'grayak',
  'kutu daun', 'kutu putih', 'nematoda',
];
const DISEASE_TERMS = [
  'antraknosa', 'bulai', 'mildew', 'bercak', 'layu', 'busuk', 'karat daun',
  'mosaik', 'virus', 'bakteri', 'jamur', 'rebah', 'mati susu', 'kering',
  'daun kuning', 'keriting',
];
const CROP_TERMS = [
  'padi', 'gabah', 'beras', 'jagung', 'kedelai', 'cabai', 'tomat', 'bawang merah',
  'bawang putih', 'kentang', 'kol', 'kubis', 'sawi', 'timun', 'melon', 'semangka',
  'mangga', 'jeruk', 'tebu', 'kedelai',
];

function extractTerms(text: string): { pest: string[]; disease: string[]; crop: string[] } {
  const t = text.toLowerCase();
  return {
    pest: PEST_TERMS.filter((w) => t.includes(w)),
    disease: DISEASE_TERMS.filter((w) => t.includes(w)),
    crop: [...new Set(CROP_TERMS.filter((w) => t.includes(w)))].slice(0, 2),
  };
}

/** Kuota AI harian per pengguna (0 = pengguna anonim). */
const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? '100');

async function quotaExceeded(req: Request): Promise<{ userId: string | null; exceeded: boolean }> {
  const sbUser = await userFromHeader(req).catch(() => null);
  if (!sbUser?.id) return { userId: null, exceeded: false };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let used = 0;
  try {
    used = await countRecentAiQueries(sbUser.id, since);
  } catch {
    return { userId: sbUser.id, exceeded: false };
  }
  return { userId: sbUser.id, exceeded: used >= AI_DAILY_LIMIT };
}

aiRouter.post('/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!hasApiKey()) {
      res.status(503).json({ error: 'Server belum dikonfigurasi OPENROUTER_API_KEY' });
      return;
    }
    const { messages, context } = req.body as {
      messages?: ChatMessageIn[];
      context?: ToolContext;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages wajib berupa array tidak kosong' });
      return;
    }
    if (messages.length > 50 || messages.some((m) => typeof m.content !== 'string' || m.content.length > 4000)) {
      res.status(400).json({ error: 'messages maksimal 50 pesan, masing-masing maks 4.000 karakter' });
      return;
    }
    const sbUser = await userFromHeader(req).catch(() => null);
    const { userId, exceeded } = await quotaExceeded(req);
    if (exceeded) {
      res.status(429).json({ error: `Kuota AI harian tercapai (${AI_DAILY_LIMIT} pertanyaan/24 jam). Coba lagi besok.` });
      return;
    }
    const started = Date.now();
    const ctx: ToolContext = { ...(context ?? {}), ...(sbUser?.id ? { userId: sbUser.id } : {}) };
    const { reply, iterations, model, usage } = await runAgent(messages, ctx);
    console.log(`[ai/chat] iter=${iterations} ms=${Date.now() - started} model=${model}`);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    logAiQuery({
      userId,
      question: lastUser?.content ?? '(kosong)',
      iterations,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      latencyMs: Date.now() - started,
    }).catch(() => undefined);
    res.json({ reply, model, usage });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

/** Batas ukuran gambar base64 ~ 2,5 MB hasil dekode. */
const MAX_IMAGE_BYTES = 2_500_000;

function validateImage(base64: string): { bytes: number } | string {
  if (typeof base64 !== 'string' || base64.length < 64) {
    return 'imageBase64 tidak valid (terlalu pendek).';
  }
  if (/[^A-Za-z0-9+/=]/.test(base64)) {
    return 'imageBase64 bukan data base64 valid.';
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = Math.floor((base64.length - padding) * (3 / 4));
  if (bytes > MAX_IMAGE_BYTES) {
    return `Ukuran gambar terlalu besar (${Math.round(bytes / 1_048_576 * 10) / 10} MB). Maksimal ${Math.round(MAX_IMAGE_BYTES / 1_048_576)} MB — gunakan foto lebih kecil.`;
  }
  return { bytes };
}

const DIAGNOSIS_SCHEMA_PROMPT = `
Balas HANYA satu objek JSON valid tanpa teks lain, dengan skema:
{
  "gejala": ["string"], 
  "penyebab": ["hama/penyakit/gizi dengan nama umum"], 
  "keparahan": "rendah|sedang|tinggi|kritis", 
  "penanganan": ["langkah aman bertahap"], 
  "keyakinan": 0.5
}`;

aiRouter.post('/vision', aiLimiter, async (req: Request, res: Response) => {
  try {
    if (!hasApiKey()) {
      res.status(503).json({ error: 'Server belum dikonfigurasi OPENROUTER_API_KEY' });
      return;
    }
    const { imageBase64, context } = req.body as {
      imageBase64?: string;
      context?: string;
    };
    const imgCheck = validateImage(imageBase64 ?? '');
    if (typeof imgCheck === 'string') {
      res.status(400).json({ error: imgCheck });
      return;
    }
    const { userId, exceeded } = await quotaExceeded(req);
    if (exceeded) {
      res.status(429).json({ error: `Kuota AI harian tercapai (${AI_DAILY_LIMIT} analisis/24 jam). Coba lagi besok.` });
      return;
    }
    const started = Date.now();
    const prompt =
      'Anda adalah ahli patologi tanaman Indonesia. Analisis foto tanaman ini. ' +
      (context ? `Konteks: ${JSON.stringify(context)}. ` : '') +
      DIAGNOSIS_SCHEMA_PROMPT;
    const { text, model, usage } = await visionCompletion(imageBase64!, prompt, {
      responseFormat: 'json_object',
      maxTokens: 1100,
      temperature: 0.15,
    });

    // P2: validasi skema structured.
    const diag = parseDiagnosis(text);
    let reply = text;
    let structured: Record<string, unknown> | undefined;
    if (diag.ok && diag.structured) {
      structured = {
        gejala: diag.structured.gejala,
        penyebab: diag.structured.penyebab,
        keparahan: diag.structured.keparahan,
        keyakinan: diag.structured.keyakinan,
      } as unknown as Record<string, unknown>;
      reply = [
        `Diagnosis: ${diag.structured.penyebab.join(', ')} (keyakinan ${Math.round(diag.structured.keyakinan * 100)}%).`,
        `Keparahan: ${diag.structured.keparahan}.`,
        `Gejala: ${diag.structured.gejala.join('; ')}.`,
        `Penanganan awal:`,
        ...diag.structured.penanganan.map((x) => `- ${x}`),
      ].join('\n');
    } else if (diag.error) {
      console.log('[vision] skema tidak valid, fallback teks:', diag.error);
    }

    logAiQuery({
      userId,
      question: '[vision] ' + (context ?? '(tanpa konteks)').slice(0, 1900),
      iterations: 1,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      latencyMs: Date.now() - started,
    }).catch(() => undefined);

    // Rantai deterministik (tanpa kuota AI): diagnosis -> produk katalog + artikel KB
    let finalReply = reply;
    try {
      const terms = extractTerms(reply);
      const query = [...terms.pest.slice(0, 2), ...terms.disease.slice(0, 2), ...terms.crop]
        .join(' ')
        .trim();
      if (query.length >= 4) {
        const catalog = await loadCatalog();
        const ctx: ToolContext = {
          products: catalog.map((p) => ({
            id: p.id,
            brand: p.brand,
            name: p.name,
            category: p.category,
            formulation: p.formulation,
            activeIngredient: p.activeIngredient ?? p.active_ingredient ?? '',
            doses: p.doses.map((d) => ({
              crop: String(d.crop ?? ''),
              target: String(d.target ?? ''),
              dose: Number(d.dose ?? 0),
              unit: String(d.unit ?? ''),
              source: String(d.source ?? ''),
            })),
            source: p.source,
            verified: p.verified,
          })),
        };
        const [prodRes, kbRes] = await Promise.all([
          executeTool('product_search', { query }, ctx),
          executeTool('search_knowledge', { query }, {}),
        ]);
        const prodLines = prodRes.summary
          .replace(/^Produk ditemukan:\s*\n?/, '')
          .replace(/\nIngatkan petani.*$/, '');
        const kbLines = kbRes.summary.replace(
          /^Artikel basis pengetahuan ditemukan[.\s]*(PENTING:[^\n]*\n)?/,
          ''
        );
        if (!prodRes.summary.startsWith('Tidak ada') || !kbRes.summary.startsWith('Tidak ada')) {
          let section = '\n\n—— Solusi dari Katalog TAWANGTANI ——';
          if (!prodRes.summary.startsWith('Tidak ada')) {
            section += `\n🛒 Produk relevan:\n${prodLines}`;
          }
          if (!kbRes.summary.startsWith('Tidak ada')) {
            section += `\n📚 Artikel penunjang:\n${kbLines}`;
          }
          section += '\n⚠️ Ikuti label resmi & aturan dosis. Konfirmasi ke penyuluh sebelum aplikasi.';
          finalReply += section;
        }
      }
    } catch (e) {
      console.log('[vision] rantai solusi gagal:', (e as Error).message);
    }
    res.json({ reply: finalReply, model, structured });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

aiRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    model: process.env.OPENROUTER_MODEL ?? null,
    keyConfigured: hasApiKey(),
  });
});
