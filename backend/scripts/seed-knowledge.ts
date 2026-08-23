import fs from 'fs';
import path from 'path';
import { config } from '../src/config';

interface SeedFile {
  docs: Array<{
    id: string;
    title: string;
    description: string;
    chunks: Array<{ crop: string; topic: string; content: string; source: string }>;
  }>;
}

function requireEnv(): { url: string; key: string } {
  const url = config.supabase.url;
  const key = config.supabase.serviceRoleKey;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur di backend/.env');
  return { url, key };
}

async function rest(
  base: { url: string; key: string },
  pathUrl: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${base.url}/rest/v1/${pathUrl}`, {
    method,
    headers: {
      apikey: base.key,
      Authorization: `Bearer ${base.key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=minimal,resolution=merge-duplicates' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${pathUrl} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function main(): Promise<void> {
  const base = requireEnv();
  const append = process.argv.includes('--append');
  const fileArg = process.argv.find((a) => a.endsWith('.json'));
  const filePath = fileArg
    ? path.resolve(fileArg)
    : path.join(__dirname, '..', 'src', 'data', 'knowledge.seed.json');
  const seed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SeedFile;

  const docRows = seed.docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
  }));
  await rest(base, 'knowledge_docs', 'POST', docRows);

  const chunkRows: Array<{
    doc_id: string;
    crop: string;
    topic: string;
    content: string;
    source: string;
  }> = [];
  for (const doc of seed.docs) {
    for (const ch of doc.chunks) {
      chunkRows.push({
        doc_id: doc.id,
        crop: ch.crop,
        topic: ch.topic,
        content: ch.content,
        source: ch.source,
      });
    }
  }

  if (!append) {
    await rest(base, 'knowledge_chunks?doc_id=neq.__none__', 'DELETE');
  }

  await rest(base, 'knowledge_chunks', 'POST', chunkRows);

  console.log(
    `Seed knowledge selesai (${append ? 'append' : 'replace'}): ${docRows.length} dokumen, ${chunkRows.length} chunk.`
  );
}

main().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
