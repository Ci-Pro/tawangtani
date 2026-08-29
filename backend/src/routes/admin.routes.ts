import { execSync } from 'node:child_process';
import { Router, Request, Response } from 'express';
import { config, hasSupabase } from '../config';
import { loadCatalog } from '../store/catalog';
import {
  adminListFarmerPrices,
  adminModerateFarmerPrice,
  adminDeleteFarmerPrice,
  countRows,
} from '../store/farmerPrices';

export const adminRouter = Router();

function guard(req: Request): boolean {
  return req.headers['x-admin-token'] === config.adminToken;
}

adminRouter.use((req: Request, res: Response, next: () => void) => {
  if (!guard(req)) {
    res.status(403).json({ error: 'Admin token tidak valid' });
    return;
  }
  next();
});

adminRouter.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [products, farmerPending, farmerApproved, alerts, plantings, aiQueries, kbChunks] =
      await Promise.all([
        loadCatalog().then((p) => p.length).catch(() => -1),
        countRows('farmer_prices', '&status=eq.pending'),
        countRows('farmer_prices', '&status=eq.approved'),
        countRows('price_alerts'),
        countRows('plantings'),
        countRows(
          'ai_query_log',
          `&created_at=gte.${new Date(Date.now() - 7 * 864e5).toISOString()}`
        ),
        countRows('knowledge_chunks'),
      ]);
    res.json({
      products,
      farmerPending,
      farmerApproved,
      alerts,
      plantings,
      aiQueries7d: aiQueries,
      kbChunks,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/farmer-prices', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await adminListFarmerPrices(status);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/farmer-prices/:id/moderate', async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: "status harus 'approved' | 'rejected' | 'pending'" });
    return;
  }
  try {
    await adminModerateFarmerPrice(req.params.id, status as 'approved');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/farmer-prices/:id', async (req: Request, res: Response) => {
  try {
    await adminDeleteFarmerPrice(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Read-only "dashboard operasional": kesehatan sinkron harga, log AI, meta env
// ---------------------------------------------------------------------------

async function sb(pathUrl: string): Promise<unknown> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  const res = await fetch(`${config.supabase.url}/rest/v1/${pathUrl}`, {
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`REST ${pathUrl} -> ${res.status}`);
  return res.json();
}

adminRouter.get('/market-health', async (_req: Request, res: Response) => {
  try {
    const [priceCount, histCount, nasional, perProvinsi, lastUpdated, lastHist] =
      await Promise.all([
        countRows('market_prices'),
        countRows('market_price_history'),
        countRows('market_prices', '&province=eq.nasional'),
        countRows('market_prices', '&province=neq.nasional'),
        sb('market_prices?select=source,updated_at&order=updated_at.desc&limit=1') as Promise<
          { source: string; updated_at: string }[]
        >,
        sb('market_price_history?select=date&order=date.desc&limit=1') as Promise<
          { date: string }[]
        >,
      ]);
    // Provinsi unik (paginasi karena REST cap 1000 baris/permintaan)
    const provinces = new Set<string>();
    for (let offset = 0; offset <= 5000; offset += 900) {
      const page = (await sb(
        `market_prices?select=province&limit=900&offset=${offset}`
      )) as { province: string }[] | null;
      const arr = Array.isArray(page) ? page : [];
      for (const r of arr) if (r.province) provinces.add(r.province);
      if (arr.length < 900) break;
    }
    provinces.delete('nasional');
    res.json({
      marketPrices: priceCount,
      history: histCount,
      nasional,
      perProvinsi,
      provinces: provinces.size,
      lastSync: Array.isArray(lastUpdated) && lastUpdated[0] ? lastUpdated[0] : null,
      lastSnapshot: Array.isArray(lastHist) && lastHist[0] ? lastHist[0] : null,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/ai-logs', async (_req: Request, res: Response) => {
  try {
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const cols =
      'user_id,created_at,model_used,prompt_tokens,completion_tokens,latency_ms,iterations,question';
    let rows: Record<string, unknown>[] = [];
    for (let offset = 0; offset <= 9000; offset += 1000) {
      const page = (await sb(
        `ai_query_log?select=${cols}&created_at=gte.${encodeURIComponent(
          since30
        )}&order=created_at.desc&limit=1000&offset=${offset}`
      )) as Record<string, unknown>[] | null;
      const arr = Array.isArray(page) ? page : [];
      if (arr.length === 0) break;
      rows = rows.concat(arr);
      if (arr.length < 1000) break;
    }
    const num = (r: Record<string, unknown>, k: string) => Number(r[k]) || 0;
    const promptTokens = rows.reduce((a, r) => a + num(r, 'prompt_tokens'), 0);
    const completionTokens = rows.reduce((a, r) => a + num(r, 'completion_tokens'), 0);
    const withLatency = rows.filter((r) => num(r, 'latency_ms') > 0);
    const avgLatencyMs = withLatency.length
      ? Math.round(withLatency.reduce((a, r) => a + num(r, 'latency_ms'), 0) / withLatency.length)
      : 0;
    const byModel = new Map<string, { n: number; prompt: number; comp: number }>();
    for (const r of rows) {
      const m = String(r.model_used || 'unknown');
      const cur = byModel.get(m) ?? { n: 0, prompt: 0, comp: 0 };
      cur.n += 1;
      cur.prompt += num(r, 'prompt_tokens');
      cur.comp += num(r, 'completion_tokens');
      byModel.set(m, cur);
    }
    const cut7 = Date.now() - 7 * 864e5;
    res.json({
      since7,
      since30,
      total30d: rows.length,
      total7d: rows.filter((r) => new Date(String(r.created_at)).getTime() >= cut7).length,
      users30d: new Set(rows.map((r) => String(r.user_id)).filter(Boolean)).size,
      users7d: new Set(
        rows
          .filter((r) => new Date(String(r.created_at)).getTime() >= cut7)
          .map((r) => String(r.user_id))
          .filter(Boolean)
      ).size,
      promptTokens,
      completionTokens,
      avgLatencyMs,
      models: [...byModel.entries()].sort((a, b) => b[1].n - a[1].n),
      recent: rows.slice(0, 100),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/meta', async (_req: Request, res: Response) => {
  let sha = '';
  try {
    sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);
    if (!sha) sha = execSync('git rev-parse --short HEAD', { timeout: 3000 }).toString().trim();
  } catch {
    /* tidak wajib */
  }
  res.json({
    sha,
    vercel: Boolean(process.env.VERCEL),
    node: process.version,
    ts: new Date().toISOString(),
    envSet: {
      geminiApi: Boolean(config.gemini.apiKey),
      openrouterApi: Boolean(config.openrouter.apiKey),
      supabaseService: hasSupabase(),
      adminTokenKhusus: config.adminToken !== 'dev-admin-token',
      cronSecret: Boolean(config.cronSecret),
    },
    models: {
      llm: config.gemini.model,
      fallback: config.gemini.fallbackModels,
      llmAlt: config.openrouter.apiKey ? config.openrouter.model : null,
    },
  });
});
