// Backfill embedding pgvector untuk knowledge_chunks (RAG semantik).
// Idempotent: melewatkan baris yang sudah punya embedding.
// Usage: `set -a; . ../.env; set +a; GEMINI_API_KEY=... node embed-knowledge.mjs`

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const EMBED_MODEL = 'gemini-embedding-001';
const DIM = 768;
const URL = process.env.SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!URL || !KEY) {
  console.error('GAGAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur.');
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error('GAGAL: GEMINI_API_KEY belum diatur.');
  process.exit(1);
}

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function embed(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(GEMINI_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        outputDimensionality: DIM,
      }),
      signal: AbortSignal.timeout(30000),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embed HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const values = json?.embedding?.values;
  if (!Array.isArray(values)) throw new Error('Tidak ada values pada respons embedding');
  return values;
}

function toVectorString(values) {
  return `[${values.map((v) => v.toFixed(6)).join(',')}]`;
}

async function main() {
  let all = [];
  let page = 0;
  const PAGE_SIZE = 500;
  while (true) {
    const res = await fetch(
      `${URL}/rest/v1/knowledge_chunks?select=id,content,embedding&order=id.asc&offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
      { headers: headers() }
    );
    if (!res.ok) throw new Error(`read HTTP ${res.status}`);
    const rows = await res.json();
    all = all.concat(rows);
    if (rows.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`Total chunk: ${all.length}`);

  let done = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of all) {
    if (row.embedding) {
      skipped++;
      continue;
    }
    const text = (row.content || '').trim();
    if (!text) {
      failed++;
      continue;
    }
    try {
      const values = await embed(text.slice(0, 1900));
      const vec = toVectorString(values);
      const patch = await fetch(`${URL}/rest/v1/knowledge_chunks?id=eq.${row.id}`, {
        method: 'PATCH',
        headers: headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify({ embedding: vec }),
      });
      if (!patch.ok) throw new Error(`patch HTTP ${patch.status}`);
      done++;
      if ((done + skipped) % 10 === 0 || done + skipped === all.length) {
        console.log(`Progres: ${done} ter-embed, ${skipped} sudah ada, ${failed} gagal`);
      }
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      failed++;
      console.error(`Gagal id=${row.id}: ${e.message}`);
    }
  }
  console.log(`Selesai: ${done} baru, ${skipped} di-skip, ${failed} gagal.`);
}

main().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});