# TAWANGTANI Backend

Backend Express + TypeScript untuk aplikasi TAWANGTANI. Proxy AI via **OpenRouter dengan model gratis**, auth JWT, dan API katalog produk.

## Fitur

| Endpoint | Fungsi |
|---|---|
| `GET /health` | Health check |
| `POST /ai/chat` | Agent loop server-side: LLM + tool calling (cuaca, kalkulator pupuk/pestisida, katalog produk, konteks lahan) |
| `POST /ai/vision` | Diagnosis foto tanaman (model vision gratis) |
| `GET /ai/status` | Status konfigurasi model |
| `POST /api/auth/register` / `login` | JWT auth (bcrypt) |
| `GET /api/products` | Katalog produk (dipakai app untuk sinkronisasi) |
| `PUT /api/products` | Update katalog (header `x-admin-token`) — dosis bisa diperbarui tanpa update APK |

## Keamanan sesuai PRD
- **API key LLM hanya di server** — tidak pernah dikirim ke APK.
- Rate limit `/ai/*`: 30 permintaan / 15 menit / IP.
- Model tidak boleh mengarang dosis: tool `product_search` hanya membaca katalog; jawaban selalu mengingatkan label resmi.
- Auth ditangani **Supabase Auth** (bcrypt, refresh token, verifikasi email bawaan). Backend hanya memakai service role key untuk katalog & audit.

## Menjalankan

```bash
cp .env.example .env        # isi SUPABASE_*, OPENROUTER_API_KEY, ADMIN_TOKEN
npm install
npm run dev                 # development (tsx watch)
# atau
npm run build && npm start  # production
```

Server jalan di `http://localhost:3000`.

## Deploy ke Vercel + Supabase (gratis)

1. **Supabase**: buat project di https://supabase.com → SQL Editor → tempel isi [`supabase/schema.sql`](../supabase/schema.sql) → Run.
2. **Vercel**: import repo GitHub, set **Root Directory = `backend`**.
3. Set Environment Variables (Project Settings → Environment Variables):

   | Key | Sumber nilai |
   |---|---|
   | `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role key (rahasia!) |
   | `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
   | `ADMIN_TOKEN` | string acak pilihan Anda |

4. Deploy → dapat URL seperti `https://tawangtani.vercel.app`.
5. Di aplikasi: **Profil → URL Backend** isi URL Vercel tersebut.

Endpoint tetap sama: `/ai/chat`, `/ai/vision`, `/ai/status`, `/api/products`, `/health`.

> Catatan: rate limit bawaan bersifat per-instance serverless. Untuk pembatasan ketat lintas-instance, hubungkan Upstash Redis (gratis) nanti.

## Model gratis (OpenRouter)

Default di `.env.example`, semua tier `:free`:

| Kebutuhan | Model |
|---|---|
| Chat + tool calling | `meta-llama/llama-3.3-70b-instruct:free` |
| Vision (foto tanaman) | `google/gemini-2.0-flash-exp:free` |
| Cadangan otomatis | Gemini Flash → Qwen 2.5 72B → Mistral Small 3.1 |

Bila model utama penuh/rate-limited, backend otomatis mencoba model cadangan. Jika provider menolak parameter `tools`, backend otomatis fallback ke mode direktif JSON. Ganti model apa saja di `.env` — daftar lengkap: https://openrouter.ai/models?max_price=0

## Integrasi aplikasi mobile

1. Salin `.env.example` di root repo → `.env`, isi `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key aman untuk APK, dilindungi RLS).
2. Login/Signup otomatis memakai Supabase Auth.
3. Untuk AI online: **Profil → URL Backend** isi URL Vercel/server; tanpa itu aplikasi tetap jalan mode offline lokal.

Kontrak `/ai/chat`:
```jsonc
// request
{ "messages": [{"role":"user","content":"..."}], "context": { "coords": {"lat":-7.8,"lon":110.4}, "farmContext": {...}, "products": [...] } }
// response
{ "reply": "..." }
```

## Deploy singkat
- **Railway/Fly.io/Render**: set env dari `.env.example`, start `npm run build && npm start`.
- **VPS**: `pm2 start dist/index.js --name tawangtani-api`, taruh di belakang Nginx + HTTPS.
