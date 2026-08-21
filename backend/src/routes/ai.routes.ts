import { Router, Request, Response } from 'express';
import { hasApiKey } from '../config';
import { runAgent } from '../services/agent';
import { visionCompletion } from '../services/openrouter';
import { ChatMessageIn, ToolContext } from '../types';
import { aiLimiter } from '../middleware/rateLimit';

export const aiRouter = Router();

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
      (context ? `Konteks: ${context}. ` : '') +
      'Jawab ringkas dalam bahasa Indonesia dengan format: 1) Gejala yang terlihat, 2) Kemungkinan penyebab (hama/penyakit/gizi), 3) Tingkat keparahan, 4) Langkah penanganan awal yang aman. Jangan mengarang nama produk pestisida spesifik; sarankan konsultasi PPL untuk rekomendasi produk.';
    const reply = await visionCompletion(imageBase64, prompt);
    res.json({ reply });
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
