# Audit Keamanan & Rahasia (Phase 9)

> **Ruang lingkup:** Konfigurasi backend, middleware, route, workflow CI, file rahasia, dan edge functions.
> **File audit:** `backend/src/config.ts`, `backend/src/middleware/*.ts`, `backend/src/routes/*.ts`, `.github/workflows/*.yml`, `supabase/.temp/*`, `.env*`, `.gitignore`, `supabase/functions/*/index.ts`.
> **Status kesimpulan:** Terdapat **rahasia (anon key) & metadata infra yang ter-commit**, beberapa endpoint memakai token opsional/single-header, serta CORS terbuka lebar — perlu prioritas tinggi sebelum produksi.

> **Catatan & keamanan dokumen:** Token anon Supabase adalah **kunci publik klien** (bukan secret), namun ter-commit di lintasan Git tidak perlu. Rahasia yang TIDAK boleh direproduksi di dokumen ini: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `ADMIN_TOKEN`, `CRON_SECRET` — semuanya hanya dirujuk berdasarkan nama & lokasi.

---

## 1. Ringkasan Eksekutif

Backend Express memakai pola:
- Auth user: verifikasi token Bearer supabase (JWT) via `userFromHeader`.
- Admin/mutasi: `x-admin-token` header (single static token).
- Cron: Bearer `CRON_SECRET`.
- Limit: `express-rate-limit` (`aiLimiter`, `pushLimiter`).

Temuan paling serius berada di **pengelolaan rahasia**: anon key di-commit hardcoded di `.github/workflows/e2e-test.yml`, `.env` berisi anon key + URL backend, dan `supabase/.temp/*` (pooler URL berisi kredensial DB postgres, `linked-project.json` berisi `organization_id`) ikut ter-commit walau `.gitignore` hanya mengecualikan `.env`.

**Skor keamanan keseluruhan: 5,5/10** — banyak titik perlu dirapikan.

---

## 2. Inventori Rahasia & Paparan

| Rahasia | Lokasi ter-commit? | Tingkat |
|---------|-------------------|---------|
| **Supabase ANON key** (publik) | Ya — hardcoded di `.github/workflows/e2e-test.yml:29` && `.env` | **MEDIUM** (publik, tapi hardcode di Git tak ideal; revoke bila ragu) |
| Supabase pooler **postgres URL** (`postgres://postgres....pooler`) | Ya — `supabase/.temp/pooler-url` ter-track | **TINGGI** (kredensial DB layer direferensikan; walau anon key, nama proyek + host terekspos dari infra) |
| `organization_id`/`organization_slug` | Ya — `supabase/.temp/linked-project.json` ter-track | **RENDAH** (metadata org) |
| `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `ADMIN_TOKEN`, `CRON_SECRET` | Tidak ditemukan hardcoded (via env) | OK, namun pastikan **tidak pernah** di-commit |
| `EXPO_PUBLIC_BACKEND_URL` | Ya — `.env` (walau gitignored, file ada di repo workspace) | **RENDAH** (URL publik) |

> `backend/.gitignore` + root `.gitignore` keduanya mengecualikan `.env`, jadi file `.env` **tidak** ter-track Git. Namun karena file **tercipta di workspace** dan berisi anon key di tiap edisi, disarankan revoke & rotasi anon key bila repo pernah publik.

---

## 3. Temuan Utama

### 3.1. Rahasia & Kredensial

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| SEC1 | **TINGGI** | **Anon key hardcoded** di `e2e-test.yml` (aset publik, tapi sebaiknya ditarik dari file; gunakan secret org bila memungkinkan) & `.env` berisi anon key + backend URL. | `.github/workflows/e2e-test.yml:29`, `.env` |
| SEC2 | **TINGGI** | **`supabase/.temp/*` ter-track** di Git — memuat pooler URL (kredensial DB postgres) & metadata proyek. Semua file `.temp` seharusnya masuk `.gitignore`; hanya dibutuhkan lokal. | `.gitignore` (tak mengecualikan `.temp`), `supabase/.temp/pooler-url` |
| SEC3 | **TINGGI** | `config.adminToken` punya **fallback hardcoded `'dev-admin-token'`** — bila env `ADMIN_TOKEN` tidak diset di produksi, semua orang bisa mengakses panel admin. | config.ts:43 |
| SEC4 | **SEDANG** | `errorHandler` mengembalikan `err.message` mentah ke klien (bocor detail internal/SQL). | errorHandler.ts:10 |
| SEC5 | **SEDANG** | `sinkron-harga.yml` memakai `secrets` dengan benar (baik), tetapi `e2e-test.yml` hardcode anon; tidak konsisten. | workflows |

### 3.2. Autentikasi & Otorisasi Endpoint

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| SEC6 | **TINGGI** | **Populasi endpoint admin & mutasi bergantung pada header statis tunggal `x-admin-token`** — tanpa rate limit, tanpa exp, tanpa multi-factor. Kebocoran token = kendali penuh katalog & push massal. | admin.routes.ts:21-31, products.routes.ts:17-22, market.routes.ts:128,142 |
| SEC7 | **SEDANG** | `push.routes.ts` `/register` memakai `optionalSupabaseUser` → **anonym bisa mendaftarkan token push** (user_id null) dan `weather-alerts` tanpa auth. | push.routes.ts:32,57 |
| SEC8 | **SEDANG** | `authLimiter` didefinisikan (rateLimit.ts:27) tapi **tidak pernah dipakai** di endpoint login/register manapun. | rateLimit.ts:27 |
| SEC9 | **RENDAH** | `chatSync` menerima `role: 'system'` dari klien dan menyimpannya (di store lokal) — tidak ada batasan role di backend sync. | chat.routes.ts:15-19,38 |

### 3.3. CORS, CSRF & Headers

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| SEC10 | **SEDANG** | `app.use(cors())` — CORS **terbuka penuh** (origin `*`). Untuk backend yang diakses aplikasi mobile ini boleh, namun bila ada admin/endpoint berbasis cookie/header lain, risiko CSRF meningkat. Tidak ada header keamanan (CSP, X-Frame-Options). | app.ts:16 |
| SEC11 | **RENDAH** | `express.json({limit:'12mb'})` relatif besar untuk JSON; dibatasi oleh validasi image 2,5MB, tapi body umum tanpa limit. | app.ts:17 |

### 3.4. Rate Limiting & Penyalahgunaan

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| SEC12 | **SEDANG** | `aiLimiter` (30/15menit) hanya berbasis `req.ip`/`sbUser` in-memory (tidak persisten). Di lingkungan serverless Vercel, **limiter reset per instance** — kuota bisa dihindari. Kuota harian DB (`countRecentAiQueries`) mengompensasi sebagian. | rateLimit.ts:5-16 |
| SEC13 | **RENDAH** | Endpoint publik `/api/products`, `/api/market/prices`, `/health`, `/api/push/weather-alerts` tanpa rate limit — potensi scraping. | app.ts |

### 3.5. Service-role & Edge Functions

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| SEC14 | **SEDANG** | Backend membuat client dengan **service_role** di banyak lingkup dan mengabaikan RLS. Service role harus disimpan aman (env) & dijaga tidak bocor. | knowledge.ts, farms.ts, chat.routes.ts:10, catalog.ts |
| SEC15 | **RENDAH** | Cron endpoints (`/cron/*`) memakai Bearer CRON_SECRET — pola baik, namun secret dibagikan lintas fungsi; pastikan rotasi berkala. | push.routes.ts:111,364,434 |
| SEC16 | **RENDAH** | Edge functions (`sync-kemendag`, `sync-prices`) berinteraksi dengan API eksternal; bila dipanggil via Supabase Dashboard tanpa auth HTTP eksternal, diperlukan verifikasi source (tipe Trigger/Fire). | functions/* |

---

## 4. Checklist Verifikasi Cepat

- [x] Service-role key & API keys **tidak** ter-commit (env).
- [ ] Anon key & `.temp` infra **masih ter-commit** → perlu revoke/rotasi + `.gitignore`.
- [x] `ADMIN_TOKEN` memakai env di produksi.
- [ ] `ADMIN_TOKEN` fallback `'dev-admin-token'` bila env kosong → **harus dihilangkan**.
- [ ] RLS per-user untuk seluruh tabel (lihat DB audit).
- [ ] `authLimiter` digunakan pada endpoint auth.
- [ ] CORS dikonfigurasi (bukan `*`) bila ada konsumen web.

---

## 5. Rekomendasi Prioritas

1. **P0 (TINGGI):** Hapus anon key hardcoded dari `e2e-test.yml` (ganti ke `${{ secrets.SUPABASE_ANON_KEY }}`) dan masukkan `supabase/.temp/` ke `.gitignore`, lalu **revoke & rotasi** anon key bila repo pernah publik.
2. **P0 (TINGGI):** Hapus fallback `'dev-admin-token'` dan wajibkan `ADMIN_TOKEN` di produksi; beri rate limit + audit akses pada semua endpoint admin/mutasi.
3. **P1 (SEDANG):** Beri rate limit pada seluruh endpoint sensitif (auto-limit) dan pastikan limiter tetap efektif di serverless (bila memungkinkan gunakan store persisten).
4. **P1 (SEDANG):** Batasi header rahasia di `errorHandler` (jangan bocorkan `err.message`).
5. **P1 (SEDANG):** Konfigurasi CORS & header keamanan yang spesifik.
6. **P2 (RENDAH):** Verifikasi auth edge functions & batasi body JSON.

---

## 6. Kesimpulan
Keamanan dasar sudah dipikirkan (JWT verify, admin token, cron secret, rate limit), tetapi **pengelolaan rahasia** adalah titik paling lemah: anon key hardcode di workflow, metadata infra `.temp` ter-commit, dan fallback admin token yang rapuh. Eksekusi rekomendasi P0 harus mendahului deployment produksi.
