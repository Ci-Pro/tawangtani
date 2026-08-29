#!/usr/bin/env node
/**
 * E2E TAWANGTANI: menelusuri perjalanan pengguna nyata dari ujung ke ujung
 * terhadap deployment backend (produksi atau lokal).
 *
 * Pemakaian:
 *   BASE_URL=https://... SUPABASE_URL=https://... ANON_KEY=eyJ... node backend/scripts/e2e.mjs
 *   SKIP_AI=1 ...   # lewati panggilan AI (hemat kuota harian)
 *
 * Exit code 1 bila ada langkah gagal.
 */

const BASE = (process.env.BASE_URL || 'https://tawangtani-flame.vercel.app').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bpiqgbjlwkdpnlgvxdrx.supabase.co';
const ANON_KEY = process.env.ANON_KEY || '';
const SKIP_AI = process.env.SKIP_AI === '1';

let passed = 0;
let failed = 0;
const step = (name, ok, extra = '') => {
  if (ok) {
    passed++;
    console.log(`  ✔ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    failed++;
    console.error(`  ✘ ${name}${extra ? ` — ${extra}` : ''}`);
  }
};

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90_000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const main = async () => {
  console.log(`\nE2E → ${BASE}\n`);

  // 1. Health & status layanan
  let r = await req('/health');
  step('health', r.status === 200 && r.json?.ok === true);

  r = await req('/ai/status');
  step('ai/status', r.status === 200 && r.json?.ok === true);

  // 2. Katalog produk
  r = await req('/api/products');
  const products = r.json?.products ?? [];
  step('products: daftar katalog', r.status === 200 && Array.isArray(products) && products.length >= 50, `${products.length} produk`);
  const pestisida = products.find((p) => p.category === 'pestisida');
  step('products: punya bahan aktif & dosis', !!pestisida && typeof pestisida.activeIngredient === 'string');

  r = await req('/api/products?q=beras');
  step('products: pencarian', r.status === 200 && (r.json?.products ?? []).length >= 1);

  // 3. Harga pasar
  r = await req('/api/market/prices?province=nasional&level=3');
  const prices = r.json?.prices ?? [];
  step('prices: nasional L3', r.status === 200 && prices.length >= 15, `${prices.length} komoditas`);
  step('prices: bentuk data lengkap', prices.every((p) => p.commodity && typeof p.price === 'number' && [1, 2, 3].includes(p.level)));

  r = await req('/api/market/prices?province=jogja&level=kios');
  step(
    'prices: alias provinsi & level bebas',
    r.status === 200 && (r.json?.prices ?? []).length >= 1,
    `${(r.json?.prices ?? []).length} baris`
  );

  r = await req('/api/market/prices?commodity=gkp&province=jawa%20timur&level=1');
  const gkps = r.json?.prices ?? [];
  step(
    'prices: sinonim komoditas GKP (L1 produsen)',
    r.status === 200 && gkps.length >= 1 && gkps[0].commodity === 'gabah_kering_panen',
    gkps.length ? `Rp${gkps[0].price}` : 'kosong'
  );

  // 4. Riwayat / tren
  r = await req('/api/market/history?commodity=beras_medium&range=daily&province=nasional&level=3');
  const buckets = r.json?.buckets ?? [];
  step('history: deret harian ada isi', r.status === 200 && Array.isArray(buckets) && buckets.length >= 5, `${buckets.length} titik`);
  r = await req('/api/market/history?commodity=beras_medium&range=NGACO');
  step('history: range tak dikenal ditolak 400', r.status === 400);

  // 5. Laporan petani (agregat publik)
  r = await req('/api/market/reports?province=nasional&days=30');
  step('reports: agregat tersedia', r.status === 200 && Array.isArray(r.json?.aggregates));

  // 6. Autentikasi: daftar akun sementara
  const email = `e2e-${Date.now()}@test.id`;
  const su = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'E2eTest12345!' }),
  }).then((x) => x.json());
  const jwt = su.access_token;
  step('auth: signup anon key', typeof jwt === 'string' && jwt.length > 20);

  // 7. Plantings CRUD (butuh login)
  r = await req('/api/plantings');
  step('plantings: tanpa login ditolak', r.status === 401);
  r = await req('/api/plantings', {
    method: 'POST',
    token: jwt,
    body: { commodity: 'beras_medium', plantedAt: new Date().toISOString().slice(0, 10), harvestDays: 120, area: 0.5, yieldKgPerHa: 5000, costTotal: 3000000 },
  });
  const pid = r.json?.planting?.id ?? r.json?.id;
  step('plantings: buat catatan tanam', r.status === 201 || r.status === 200, `id=${pid ?? '-'}`);
  r = await req('/api/plantings', { token: jwt });
  step('plantings: daftar milik pengguna', r.status === 200 && (r.json?.plantings ?? []).length >= 1);
  if (pid) {
    r = await req(`/api/plantings/${pid}`, { method: 'DELETE', token: jwt });
    step('plantings: hapus', r.status === 200 || r.status === 204);
  }

  // 8. Laporan harga petani
  r = await req('/api/market/prices?province=jawa%20timur&level=3');
  const jatimAll = (r.json?.prices ?? []).filter((p) => p.province === 'jawa timur').length;
  step('prices: filter provinsi benar (jawa timur)', r.status === 200 && jatimAll > 0 && (r.json?.prices ?? []).length === jatimAll);
  r = await req('/api/market/prices?province=nasional&level=3');
  step('prices: harga wajar tidak ada yang ekstrem', r.status === 200 && (r.json?.prices ?? []).every((p) => p.price > 0 && p.price <= 600000 && p.unit));

  r = await req('/api/market/report', {
    method: 'POST',
    token: jwt,
    body: { commodity: 'beras_medium', province: 'jawa timur', village: 'Test Desa', role: 'jual', price: 12000 },
  });
  step('report: kirim laporan harga', r.status === 200 && r.json?.ok === true);
  r = await req('/api/market/report', { method: 'POST', token: jwt, body: { commodity: 'beras_medium' } });
  step('report: data kurang ditolak 400', r.status === 400);
  r = await req('/api/market/my-reports', { token: jwt });
  step('report: my-reports tercatat', r.status === 200 && (r.json?.reports ?? []).length >= 1);

  // 9. Sinkron chat lintas perangkat
  r = await req('/api/chat/sync', {
    method: 'POST',
    token: jwt,
    body: { sessionId: 'e2e-session', title: 'E2E', messages: [{ role: 'user', content: 'tes e2e', at: new Date().toISOString() }] },
  });
  step('chat/sync: simpan sesi', r.status === 200);
  r = await req('/api/chat/sessions', { token: jwt });
  step('chat/sessions: sesi terlihat', r.status === 200 && JSON.stringify(r.json).includes('e2e-session'));

  // 10. Chat AI end-to-end (1 panggilan hemat kuota)
  if (!SKIP_AI) {
    r = await req('/api/ai/chat', {
      method: 'POST',
      token: jwt,
      body: { messages: [{ role: 'user', content: 'Harga cabai rawit di Jawa Timur berapa?' }] },
    });
    const text = String(r.json?.answer ?? r.json?.reply ?? JSON.stringify(r.json));
    step('ai/chat: jawaban memuat angka harga', r.status === 200 && /(rp|rupiah|\d{4,})/i.test(text), text.slice(0, 60).replace(/\n/g, ' '));
    step('ai/chat: menyertakan usage token', r.status === 200 && r.json?.usage?.promptTokens > 0 && typeof r.json?.model === 'string');
    r = await req('/api/ai/vision', { method: 'POST', token: jwt, body: { imageBase64: 'b3V0LW9mLWZvcm1hdA==' } });
    step('ai/vision: gambar invalid ditolak 400', r.status === 400);
  } else {
    console.log('  ⤼ ai/chat dilewati (SKIP_AI=1)');
  }

  // 11. Halaman admin
  const admin = await fetch(`${BASE}/admin`, { signal: AbortSignal.timeout(30_000) });
  step('admin: halaman panel', admin.status === 200);

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`);
  process.exit(failed > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error('E2E error fatal:', e.message);
  process.exit(1);
});
