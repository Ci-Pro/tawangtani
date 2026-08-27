import { config } from '../config';

export interface KnowledgeHit {
  id: number;
  doc_id: string;
  title: string;
  crop: string;
  topic: string;
  content: string;
  source: string;
  score: number;
}

interface RawChunk {
  id: number;
  doc_id: string;
  crop: string;
  topic: string;
  content: string;
  source: string;
  title: string;
}

let cache: { rows: RawChunk[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

function headers(): Record<string, string> {
  return {
    apikey: config.supabase.serviceRoleKey,
    Authorization: `Bearer ${config.supabase.serviceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

async function loadChunks(): Promise<RawChunk[]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.rows;
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return cache?.rows ?? [];
  try {
    const res = await fetch(
      `${config.supabase.url}/rest/v1/knowledge_chunks?select=id,doc_id,crop,topic,content,source,knowledge_docs(title)&limit=500`,
      { headers: headers(), signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    const rows: RawChunk[] = data.map((r) => ({
      id: r.id as number,
      doc_id: r.doc_id as string,
      crop: (r.crop as string) ?? 'umum',
      topic: (r.topic as string) ?? 'umum',
      content: (r.content as string) ?? '',
      source: (r.source as string) ?? '',
      title: ((r.knowledge_docs as { title?: string } | null)?.title as string) ?? '',
    }));
    cache = { rows, loadedAt: now };
    return rows;
  } catch (err) {
    console.error('[knowledge] gagal muat:', (err as Error).message);
    return cache?.rows ?? [];
  }
}

const STOPWORDS = new Set([
  'dan', 'yang', 'untuk', 'dengan', 'cara', 'bagaimana', 'apa', 'kenapa', 'kapan',
  'apakah', 'saya', 'kami', 'bisa', 'boleh', 'adalah', 'itu', 'ini', 'jika', 'kalau',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  panen: ['panen', 'petik', 'kematangan', 'siap'],
  pemupukan: ['pupuk', 'urea', 'npk', 'sp36', 'sp-36', 'kcl', 'memupuk', 'pemupukan', 'dosis'],
  hama_penyakit: ['hama', 'penyakit', 'ulat', 'jamur', 'virus', 'layu', 'bercak', 'wereng', 'busuk'],
  irigasi: ['air', 'siram', 'irigasi', 'drainase', 'genangan', 'hujan', 'kering'],
  keselamatan: ['pestisida', 'semprot', 'aman', 'residu', 'label', 'spray'],
  strategi_jual: ['jual', 'harga', 'pasar', 'pemasaran', 'untung', 'simpan'],
  budidaya: ['tanam', 'semai', 'bibit', 'jarak', 'budidaya', 'mulsa'],
  diagnosa_hara: ['defisiensi', 'kuning', 'gejala', 'hara', 'daun', 'kurang'],
};

const CROPS = [
  'padi', 'jagung', 'cabai', 'bawang merah', 'tomat', 'kentang', 'wortel', 'kol', 'kubis',
];

/** Ekspansi query ringan: tambahkan sinonim istilah dagang/topik agar recall naik. */
const EXPANSION: Record<string, string> = {
  semprot: 'semprot pestisida',
  obat: 'pestisida obat',
  kering: 'kering kekeringan irigasi',
  pupuk: 'pupuk pemupukan dosis',
  panen: 'panen petik kematangan',
  jual: 'jual pasar harga strategi_jual',
  benih: 'benih bibit semai',
  hama: 'hama penyakit serangan',
  busuk: 'busuk penyakit jamur',
  layu: 'layu penyakit wilt',
  kuning: 'kuning daun defisiensi hara',
};

export function expandQuery(query: string): string {
  let q = query.toLowerCase();
  for (const [from, to] of Object.entries(EXPANSION)) {
    if (q.includes(from)) q = `${q} ${to}`;
  }
  return q.replace(/\s+/g, ' ').trim();
}

// ---------- P3: RAG semantik (pgvector) ----------

const EMBED_MODEL = 'gemini-embedding-001';
let embedCache = new Map<string, { vec: number[]; at: number }>();
const EMBED_TTL_MS = 30 * 60 * 1000;

export async function embedText(text: string): Promise<number[] | null> {
  const key = text.slice(0, 400);
  const hit = embedCache.get(key);
  if (hit && Date.now() - hit.at < EMBED_TTL_MS) return hit.vec;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text: key }] },
          outputDimensionality: 768,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { embedding?: { values?: number[] } };
    const vec = json.embedding?.values;
    if (!vec || !Array.isArray(vec)) return null;
    embedCache.set(key, { vec, at: Date.now() });
    if (embedCache.size > 128) {
      const oldest = embedCache.keys().next().value;
      if (oldest) embedCache.delete(oldest);
    }
    return vec;
  } catch {
    return null;
  }
}

function embedVectorString(vec: number[]): string {
  return `[${vec.map((v) => v.toFixed(6)).join(',')}]`;
}

/** RPC vektor hibrida (cosine + trigram) bila chunk sudah punya embedding. */
async function searchKnowledgeVec(
  query: string,
  matchCount: number
): Promise<KnowledgeHit[] | null> {
  const vec = await embedText(query);
  if (!vec) return null;
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  try {
    const res = await fetch(`${config.supabase.url}/rest/v1/rpc/search_knowledge_vec`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, qvec: embedVectorString(vec), match_count: matchCount }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as KnowledgeHit[];
    if (!Array.isArray(rows)) return null;
    return rows.map((r) => ({ ...r, score: Math.round(Number(r.score) * 100) / 100 }));
  } catch {
    return null;
  }
}

/** RPC full-text + trigram (fungsi PostgreSQL existing) sebagai lapis kedua. */
async function searchKnowledgeRpc(query: string, matchCount: number): Promise<KnowledgeHit[] | null> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return null;
  try {
    const res = await fetch(`${config.supabase.url}/rest/v1/rpc/search_knowledge`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, match_count: matchCount }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as KnowledgeHit[];
    if (!Array.isArray(rows)) return null;
    return rows.map((r) => ({ ...r, score: Math.round(Number(r.score) * 100) / 100 }));
  } catch {
    return null;
  }
}

export async function searchKnowledge(query: string, matchCount = 4): Promise<KnowledgeHit[]> {
  const result = typeof query === 'string' ? query : '';
  const expanded = expandQuery(result);
  const targets = expanded || result;

  // 1) Paling baik: RAG semantik (embedding → vektor hibrida).
  const vecHits = await searchKnowledgeVec(targets, matchCount);
  if (vecHits && vecHits.length > 0) return vecHits;

  // 2) RPC full-text + trigram (dijalankan di PostgreSQL, di-rank di server).
  const rpcHits = await searchKnowledgeRpc(targets, matchCount);
  if (rpcHits && rpcHits.length > 0) return rpcHits;

  // 3) Terakhir: skoring lokal (fallback bila RPC tak tersedia).
  return localScoring(targets, matchCount);
}

async function localScoring(query: string, matchCount: number): Promise<KnowledgeHit[]> {
  const rows = await loadChunks();
  if (rows.length === 0) return [];
  const lowerQ = query.toLowerCase();
  const tokens = tokenize(query);

  const scored = rows.map((r) => {
    const hayTitle = r.title.toLowerCase();
    const hayContent = r.content.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hayTitle.includes(t)) score += 1.6;
      if (hayContent.includes(t)) score += 1.0;
    }
    if (lowerQ.length > 8 && hayContent.includes(lowerQ)) score += 3;
    for (const crop of CROPS) {
      if (lowerQ.includes(crop) && (r.crop === crop || hayTitle.toLowerCase().includes(crop))) {
        score += 1.4;
        break;
      }
    }
    for (const kw of TOPIC_KEYWORDS[r.topic] ?? []) {
      if (lowerQ.includes(kw)) score += 0.7;
    }
    return { ...r, score };
  });

  return scored
    .filter((h) => h.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(matchCount, 8)))
    .map(({ id, doc_id, title, crop, topic, content, source, score }) => ({
      id,
      doc_id,
      title,
      crop,
      topic,
      content,
      source,
      score: Math.round(score * 100) / 100,
    }));
}

export async function logAiQuery(entry: {
  userId?: string | null;
  question: string;
  iterations: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
}): Promise<void> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return;
  try {
    await fetch(`${config.supabase.url}/rest/v1/ai_query_log`, {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: entry.userId ?? null,
        question: entry.question.slice(0, 2000),
        iterations: entry.iterations,
        model: entry.model,
        prompt_tokens: entry.promptTokens ?? 0,
        completion_tokens: entry.completionTokens ?? 0,
        model_used: entry.model,
        latency_ms: entry.latencyMs ?? 0,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // logging tidak boleh mengganggu jawaban
  }
}

/** Hitung pemakaian AI seorang pengguna sejak `sinceIso` (untuk kuota harian). */
export async function countRecentAiQueries(userId: string, sinceIso: string): Promise<number> {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) return 0;
  try {
    const res = await fetch(
      `${config.supabase.url}/rest/v1/ai_query_log?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(sinceIso)}`,
      { headers: headers(), signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return 0;
    const rows = (await res.json()) as unknown[];
    return rows.length;
  } catch {
    return 0;
  }
}
