import { execSync } from 'node:child_process';
import { Router, Request, Response } from 'express';
import { config, hasSupabase } from '../config';
import { loadCatalog } from '../store/catalog';
import { PRICE_LIMITS } from '../services/priceSanity';
import {
  logCampaign,
  listCampaigns,
  listPushTokens,
  sendExpoPush,
} from '../store/pushTokens';
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
    res.json({
      rows: rows.map((r) => ({
        ...r,
        sanity: PRICE_LIMITS[r.commodity] ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/farmer-prices/export', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const rows = await adminListFarmerPrices(status, 10000);
    const cols = [
      'created_at',
      'commodity',
      'province',
      'village',
      'role',
      'price',
      'unit',
      'status',
      'moderation_note',
      'user_id',
    ];
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => cols.map((c) => cell(r[c as keyof typeof r])).join(';'));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="laporan-harga-${status ?? 'semua'}.csv"`);
    res.send([cols.join(';'), ...lines].join('\n'));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/farmer-prices/batch', async (req: Request, res: Response) => {
  const { ids, status, note } = (req.body ?? {}) as {
    ids?: unknown;
    status?: string;
    note?: string;
  };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids wajib array tidak kosong' });
    return;
  }
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: "status harus 'approved' | 'rejected' | 'pending'" });
    return;
  }
  if (ids.length > 500) {
    res.status(400).json({ error: 'maksimal 500 id per operasi batch' });
    return;
  }
  try {
    let failed = 0;
    for (const id of ids) {
      if (typeof id !== 'string') {
        failed += 1;
        continue;
      }
      try {
        await adminModerateFarmerPrice(id, status as 'approved', note);
      } catch {
        failed += 1;
      }
    }
    res.json({ processed: ids.length - failed, failed });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/farmer-prices/:id/moderate', async (req: Request, res: Response) => {
  const { status, note } = req.body as { status?: string; note?: string };
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
    res.status(400).json({ error: "status harus 'approved' | 'rejected' | 'pending'" });
    return;
  }
  try {
    await adminModerateFarmerPrice(
      req.params.id,
      status as 'approved',
      typeof note === 'string' ? note : undefined
    );
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

async function sb(pathUrl: string, method: 'GET' | 'DELETE' = 'GET'): Promise<unknown> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  const res = await fetch(`${config.supabase.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: config.supabase.serviceRoleKey,
      Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`REST ${pathUrl} -> ${res.status}`);
  return method === 'DELETE' ? null : res.json();
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

// ---------------------------------------------------------------------------
// Alarm harga & perangkat (cleanup + inspeksi)
// ---------------------------------------------------------------------------

adminRouter.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const [price, change] = await Promise.all([
      sb('price_alerts?select=*&order=created_at.desc&limit=200'),
      sb('price_change_alerts?select=*&order=created_at.desc&limit=200'),
    ]);
    const [activePrice, totalChange] = await Promise.all([
      countRows('price_alerts', '&active=eq.true'),
      countRows('price_change_alerts'),
    ]);
    res.json({
      priceAlerts: Array.isArray(price) ? price : [],
      changeAlerts: Array.isArray(change) ? change : [],
      activePrice,
      totalChange,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/alerts/:id', async (req: Request, res: Response) => {
  try {
    await sb(`price_alerts?id=eq.${encodeURIComponent(req.params.id)}`, 'DELETE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/change-alerts/:id', async (req: Request, res: Response) => {
  try {
    await sb(`price_change_alerts?id=eq.${encodeURIComponent(req.params.id)}`, 'DELETE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.get('/push-tokens', async (req: Request, res: Response) => {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const size = 200;
    const [rows, total] = await Promise.all([
      sb(`push_tokens?select=*&order=updated_at.desc&limit=${size}&offset=${page * size}`),
      countRows('push_tokens'),
    ]);
    const arr = Array.isArray(rows) ? rows : [];
    const geolocated = arr.filter(
      (t) => Number((t as { lat?: number }).lat) !== 0 || Number((t as { lon?: number }).lon) !== 0
    ).length;
    res.json({ rows: arr, total, page, size, geolocated });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.delete('/push-tokens/:token', async (req: Request, res: Response) => {
  try {
    await sb(`push_tokens?expo_token=eq.${encodeURIComponent(req.params.token)}`, 'DELETE');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Kampanye notifikasi massal
// ---------------------------------------------------------------------------

adminRouter.get('/push/campaigns', async (_req: Request, res: Response) => {
  try {
    const rows = await listCampaigns(20);
    res.json({ campaigns: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

adminRouter.post('/push/send', async (req: Request, res: Response) => {
  const { title, body, limit } = (req.body ?? {}) as {
    title?: string;
    body?: string;
    limit?: number;
  };
  if (!title || typeof title !== 'string' || !body || typeof body !== 'string') {
    res.status(400).json({ error: 'title & body wajib teks' });
    return;
  }
  if (title.length > 120 || body.length > 800) {
    res.status(400).json({ error: 'title maks 120 & body maks 800 karakter' });
    return;
  }
  try {
    const devices = await listPushTokens();
    const cap = Math.min(Math.max(1, Number(limit) || devices.length), 2000);
    const messages = devices
      .slice(0, cap)
      .map((t) => ({ to: t.expo_token, title, body }));
    const { sent, failed } = await sendExpoPush(messages);
    await logCampaign({ title, body, targets: messages.length, sent, failed });
    res.json({ devices: devices.length, targeted: messages.length, sent, failed });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
