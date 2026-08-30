// Gate guard: parse JS yang diserve di halaman /admin dari sumber terkompilasi.
// Menangkap kelas bug escape template literal ('\'', '\n') yang membunuh script di browser —
// hal yang tidak terlihat oleh tsc maupun e2e HTTP (halaman hanya dicek status 200).
// Jalankan: npx tsx scripts/check-admin.mjs

import { ADMIN_HTML } from '../src/routes/adminPage.ts';

const m = ADMIN_HTML.match(/<script>([\s\S]*)<\/script>/);
if (!m) {
  console.error('admin FAIL: blok <script> tidak ditemukan');
  process.exit(1);
}
const js = m[1];
try {
  new Function(js);
  console.log(`admin JS OK (${js.length} chars, tanpa SyntaxError)`);
} catch (e) {
  console.error(`admin FAIL: SyntaxError di skrip halaman -> ${e.message}`);
  console.error('root cause umum: escape terkompilasi di dalam template literal');
  process.exit(1);
}