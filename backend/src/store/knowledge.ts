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

export async function searchKnowledge(query: string, matchCount = 4): Promise<KnowledgeHit[]> {
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
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // logging tidak boleh mengganggu jawaban
  }
}
