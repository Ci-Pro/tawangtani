import { Router, Request, Response } from 'express';
import { config, hasApiKey } from '../config';
import { runAgent } from '../services/agent';
import { executeTool } from '../tools/executors';
import { loadCatalog } from '../store/catalog';
import { visionCompletion } from '../services/openrouter';
import { logAiQuery } from '../store/knowledge';
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
    const started = Date.now();
    const { reply, iterations } = await runAgent(messages, context ?? {});
    console.log(`[ai/chat] iter=${iterations} ms=${Date.now() - started}`);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const sbUser = await userFromHeader(req).catch(() => null);
    logAiQuery({
      userId: sbUser?.id ?? null,
      question: lastUser?.content ?? '(kosong)',
      iterations,
      model: process.env.OPENROUTER_MODEL ?? 'default',
    }).catch(() => undefined);
    res.json({ reply });
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

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
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'imageBase64 wajib diisi' });
      return;
    }
    const prompt =
      'Anda adalah ahli patologi tanaman Indonesia. Analisis foto tanaman ini. ' +
      (context ? `Konteks: ${JSON.stringify(context)}. ` : '') +
      'Jawab ringkas dalam bahasa Indonesia dengan format: 1) Gejala yang terlihat, 2) Kemungkinan penyebab (hama/penyakit/gizi), 3) Tingkat keparahan, 4) Langkah penanganan awal yang aman. Sebutkan kelompok bahan aktif umum bila relevan, tetapi jangan mengarang nama merek produk; konsultasi PPL untuk kepastian.';
    const reply = await visionCompletion(imageBase64, prompt);
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
          /^Artikel basis pengetahuan ditemukan \(kutip sumbernya di jawaban\):\s*\n?/,
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
    res.json({ reply: finalReply });
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
