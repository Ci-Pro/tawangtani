# Deploy Backend di Netlify

Backend Express dijalankan sebagai **Netlify Functions** (serverless), bukan server abadi.
Pendekatan ini gratis di plan free (125k invokasi/bulan) dan sudah terverifikasi.

## Arsitektur

- `netlify/functions/api.ts` — seluruh app Express dibungkus `serverless-http`; semua
  request `/api/*`, `/health`, dan lainnya diarahkan ke fungsi `api` via redirect
  `/* → /.netlify/functions/api`.
- `netlify/functions/market-sync-cron.ts` — **Scheduled Function** (background, limit 15 mnt)
  yang menjalankan `runUpstreamSync()` (PIHPS 39 provinsi × level + SP2KP Kemendag)
  lalu menulis hasil ke tabel `sync_health`.
- `scripts/netlify-build.mjs` — membundel kedua fungsi dengan esbuild ke `deploy/`
  plus `netlify.toml` (redirect, jadwal cron, maxDuration) dan `public/index.html`.

Site Netlify saat ini: `tawangtani.netlify.app`, base URL API: `https://tawangtani.netlify.app`.

## Jadwal sinkronisasi

`netlify.toml` (dihasilkan oleh script build):

```
[functions.market-sync-cron]
  schedule = "0 6,18 * * *"
```

Synchronous function biasa dibatasi 10 dtk guna; heavy sync dijalankan sebagai scheduled
function (dieksekusi sebagai background function, limit 15 mnt — muat untuk pipeline ±60 dtk).

## Env vars (tersimpan di Netlify, bukan di repo)

SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN, CRON_SECRET, GEMINI_API_KEY,
OPENROUTER_API_KEY, NODE_VERSION=20.

Catatan free plan: `scopes` env adalah Pro-only, dan secret env tidak boleh ber-scope
`post_processing` — gunakan `is_secret` tanpa scope eksplisit, atau non-secret.

## Deploy baru

```bash
npm run netlify:build         # bundle fungsi ke backend/deploy/
cd deploy
netlify deploy --dir public --functions functions --prod --site tawangtani
```

Netlify CLI wajib dipakai (bukan upload zip polos) agar fungsi dibundel format zisi dan
terdaftar. Deploy zip via API tanpa bundel tidak mendaftarkan fungsi.

## Uji manual

```bash
curl https://tawangtani.netlify.app/health
curl "https://tawangtani.netlify.app/api/market/prices?province=jawa%20tengah"
```

## Catatan

- Setiap situs baru di akun Netlify bisa terkunci "project visibility private / SSO login"
  (`app.netlify.com/edge-access`). Nonaktifkan dengan `PATCH /api/v1/sites/{id}` `sso_login=false`.
- Vercel tetap menjadi fallback; data identik karena satu Supabase yang sama.