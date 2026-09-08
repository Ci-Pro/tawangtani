#!/usr/bin/env node
/**
 * Guard kontrak tools AI: skema di backend (8 tools) wajib menjadi superset dari
 * registry offline mobile (6 tools), sehingga semantik tool tidak melenceng diam-diam
 * antara mode online (server) dan offline (perangkat).
 *
 * Pemakaian:
 *   npm run check:contract   (dari backend/)
 *
 * Exit code 1 bila ada nama tool frontend yang tidak dikenali backend.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

function toolNamesBackend() {
  const src = readFileSync(resolve(root, 'backend/src/tools/schemas.ts'), 'utf-8');
  const names = [...src.matchAll(/name:\s*'([a-z_]+)'/g)].map((m) => m[1]);
  return [...new Set(names)];
}

function frontendTools() {
  const src = readFileSync(resolve(root, 'src/services/ai/tools.ts'), 'utf-8');
  const start = src.indexOf('export const TOOLS');
  const block = src.slice(start, src.indexOf('];', start));
  const tools = [...block.matchAll(/name:\s*'([a-z_]+)',\s*description:\s*'([^']*)'/g)].map((m) => ({
    name: m[1],
    description: m[2],
  }));
  return tools;
}

let failures = 0;
const backendNames = new Set(toolNamesBackend());
const offline = frontendTools();

console.log(`Kontrak tools AI:`);
console.log(`  backend (online): ${backendNames.size} tools`);
for (const t of offline) {
  const known = backendNames.has(t.name);
  console.log(`  mobile (offline): ${t.name} — ${known ? 'OK' : 'TIDAK DIKENALI BACKEND'}`);
  if (!known) failures++;
}

const backendOnly = [...backendNames].filter((n) => !offline.some((t) => t.name === n));
if (backendOnly.length) {
  console.log(`  (info) tool hanya di backend: ${backendOnly.join(', ')}`);
}

if (failures > 0) {
  console.error(`\nKONTRAK GAGAL: ${failures} tool frontend tidak ada di skema backend.`);
  process.exit(1);
}
console.log('\nKontrak tools AI aman (frontend ⊆ backend).');