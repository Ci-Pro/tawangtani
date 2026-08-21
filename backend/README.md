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

## Menjalankan

```bash
cp .env.example .env        # isi OPENROUTER_API_KEY dari https://openrouter.ai/keys (gratis)
npm install
npm run dev                 # development (tsx watch)
# atau
npm run build && npm start  # production
```

Server jalan di `http://localhost:3000`.

## Model gratis (OpenRouter)

Default di `.env.example`, semua tier `:free`:

| Kebutuhan | Model |
|---|---|
| Chat + tool calling | `meta-llama/llama-3.3-70b-instruct:free` |
| Vision (foto tanaman) | `google/gemini-2.0-flash-exp:free` |
| Cadangan otomatis | Gemini Flash → Qwen 2.5 72B → Mistral Small 3.1 |

Bila model utama penuh/rate-limited, backend otomatis mencoba model cadangan. Jika provider menolak parameter `tools`, backend otomatis fallback ke mode direktif JSON. Ganti model apa saja di `.env` — daftar lengkap: https://openrouter.ai/models?max_price=0

## Integrasi aplikasi mobile

Di aplikasi: **Profil → URL Backend** isi misalnya `http://192.168.1.10:3000`. Tani AI otomatis memakai server ini (mode online); bila tidak terjangkau, fallback ke mode offline lokal.

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
