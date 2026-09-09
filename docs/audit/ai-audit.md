# Audit Arsitektur AI Tani (Phase 6)

> **Ruang lingkup:** Alur agen AI backend (Express/OpenRouter/Gemini/Supabase) dan fallback agen frontend (React Native/Expo).
> **File audit:** `backend/src/services/agent.ts`, `backend/src/services/openrouter.ts`, `backend/src/services/structured.ts`, `backend/src/services/tokenBudget.ts`, `backend/src/tools/executors.ts`, `backend/src/tools/schemas.ts`, `backend/src/store/knowledge.ts`, `backend/src/routes/ai.routes.ts`, `src/services/ai/agent.ts`, `src/services/ai/tools.ts`.
> **Status kesimpulan:** Arsitektur agen dua-lapis (online + offline) sudah baik; temuan utama adalah konsumsi token tanpa belanja ada, pencatatan kuota tidak atomik, dan dependensi pada model gratis berisiko keandalan.

---

## 1. Ringkasan Eksekutif

Sistem AI Tani dibangun sebagai **agent loop dengan tool-calling** di backend, dan **fallback rule-based** di frontend. Backend memakai kaskade model Gemini → OpenRouter (semua model gratis) dengan mekanisme perbaikan kesalahan nama tool (Levenshtein + alias), validasi skema argumen, dan RAG basis pengetahuan (pgvector → full-text → skoring lokal). Frontend menjalankan agent offline yang mencakup kalkulator lokal agar aplikasi tetap berguna tanpa koneksi.

**Skor kesehatan keseluruhan: 7,5/10** — desain robust untuk model lemah, tetapi ada celah pengendalian biaya/biaya dan konsistensi log.

---

## 2. Arsitektur Aliran Data

```
[Expo App] -> runAgent/frontend agent.ts
   |-- backendUrl set? -- post /ai/chat (backend) -> runAgent (backend)
   |                      (gagal/fallback) -> runOfflineAgent (rule-based, local tools)
   `-- backendUrl kosong? -> runOfflineAgent (local tools)

runVisionAgent -> wajib backend /ai/vision (tidak ada fallback offline)
```

**Backend `runAgent` (agent.ts):**
1. Normalisasi pesan → sisipkan SYSTEM_PROMPT.
2. Loop maksimal `MAX_ITERATIONS = 7`.
3. `budgetMessages()` menyusutkan konteks agar muat jendela model.
4. `chatCompletion()` mencoba kaskade provider/model.
5. Ulangi hingga model berhenti memanggil tool, lalu kembalikan jawaban.
6. Bila tool "rusak" (native tool-call gagal), alihkan ke mode **directive JSON** via `PROMPT_TOOL_DIRECTIVE`.

**Poin desain kunci:**
- **Kaskade model** (openrouter.ts): Gemini utama → Gemini fallback → OpenRouter → OpenRouter fallback; setiap kelelahan diberi jeda 1,5 detik pada rate-limit.
- **Koreksi nama tool** (agent.ts): `resolveToolName()` memakai alias bahasa Indonesia (mis. `cuaca`→`get_weather`) + jarak Levenshtein ≤ 2.
- **Toleransi argumen** (agent.ts): `parseToolArgs()` memperbaiki kutip tunggal, koma menggantung, `True/False/None` gaya Python.
- **RAG 3 lapis** (knowledge.ts): vektor `search_knowledge_vec` (pgvector) → RPC `search_knowledge` (full-text+trigram) → skoring lokal di memori.
- **Validasi output diagnosis** (structured.ts): skema JSON divalidasi; bila tidak valid, fallback ke teks.

---

## 3. Inventori Tool & Skema

**`TOOL_SCHEMAS` (backend, schemas.ts) — 8 tool:**
| Tool | Param wajib | Catatan |
|------|-------------|---------|
| `get_weather` | – | params kosong, memakai `ctx.coords` |
| `fertilizer_calculator` | areaValue, dose | unit default ha / kg/ha |
| `pesticide_calculator` | dose, doseUnit, tankVolumeL, areaValue, waterRateLPerHa | default unit mL/L |
| `product_search` | – | query opsional, STOP-words disaring |
| `farm_context` | – | membaca ctx.farmContext |
| `search_knowledge` | query | RAG |
| `market_price` | – | resolve commodity/province via matcher |
| `activity_log` | activity | enum 7 aktivitas |

**`TOOLS` frontend (tools.ts) — 6 tool** (tanpa `search_knowledge` & `market_price` — keduanya hanya backend).

**Validasi:** `validateToolArgs()` (schemas.ts) memeriksa required, tipe number/string, dan enum; galat dikembalikan ke model agar dipanggil ulang (bukan menggagalkan agen).

---

## 4. Temuan Utama

### 4.1. Konsumsi Token & Pengendalian Ubahan (Ubah/Dampak)

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| A1 | **TINGGI** | Tidak ada belanja/anggaran token global kumulatif per percakapan — `usage` hanya diakumulasi dan dicatat, tidak membatasi total token per permintaan. `MAX_ITERATIONS=7` × kaskade model = potensi biaya besar bila API key berbayar kelak dipakai. | agent.ts:214-216, 363 |
| A2 | **TINGGI** | Kuota harian **tidak atomik** — `quotaExceeded()` menghitung baris `ai_query_log` lalu `logAiQuery()` menyisipkan baris secara terpisah; serangan paralel dapat melewati batas (TOCTOU). | ai.routes.ts:44-55, 86-94 |
| A3 | **SEDANG** | `tool_choice` di iterasi pertama di-hardcode `'required'` untuk memaksa model memakai tool; bisa memicu iterasi kosong/terbuang pada model yang menolak. | agent.ts:202 |
| A4 | **RENDAH** | Gemini `thought_signature` di-echo (`extra_content`) hanya untuk kandidat Gemini; bila jawaban datang dari OpenRouter, medan ini dibawa polos ke pesan berikutnya tanpa manfaat. | openrouter.ts:11, agent.ts:235 |

### 4.2. Keandalan & Ketahanan Model

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| A5 | **SEDANG** | Semua model default **gratis** (`z-ai/glm-5.2:free`, `gemini-2.5-flash`, `nvidia/nemotron-...:free`) — dekat batas kuota harian; tanpa fallback berbayar, layanan bisa "mati" di jam sibuk. | config.ts:20-41 |
| A6 | **SEDANG** | `MAX_ITERATIONS=7` backend vs `MAX_ITERATIONS=5` frontend — perilaku bisa berbeda antar lapis; konsistensi tak terjaga. | agent.ts:7, src/ai/agent.ts:21 |
| A7 | **RENDAH** | Jeda `setTimeout` 60 detik per pemanggilan; dengan kaskade 2-8 model, permintaan bisa memakan waktu lama (>4 menit) sebelum gagal. | openrouter.ts:113 |

### 4.3. RAG & Basis Pengetahuan (knowledge.ts)

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| A8 | **SEDANG** | `loadChunks()` membatasi `limit=500` chunk; bila KB tumbuh >500 tanpa paginasi, RAG lokal kehilangan artikel yang relevan (RPC full-text tetap berjalan). | knowledge.ts:41 |
| A9 | **RENDAH** | Pencarian vektor bergantung `GEMINI_API_KEY` terpisah; bila hanya OpenRouter yang ada, RAG vektor tak aktif (fallback ke full-text). | knowledge.ts:125-127 |
| A10 | **RENDAH** | Cache embed TTL 30 menit tanpa invalidasi saat KB diperbarui — hasil pencarian bisa basi. | knowledge.ts:118 |

### 4.4. Logging & Observabilitas

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| A11 | **SEDANG** | Log `console.log` pada jalur lintas berbunyi di setiap iterasi/tool — tidak ada level log/redaksi; berisiko banjir log di Vercel. | agent.ts:218, 225, 242, 251; openrouter.ts:208; ai.routes.ts:84, 179, 244 |
| A12 | **RENDAH** | `logAiQuery()` mencatat kolom `model_used` dua kali (diisi `entry.model` dan kolom `model`); redundant. | knowledge.ts:279, 283 |

### 4.5. Keamanan Prompt / Data

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| A13 | **SEDANG** | Tidak ada sanitasi/kontrol terhadap isi `context` dari klien di `/ai/chat` — klien bisa memasukkan `farmContext`/`coords` arbitrer (integritas data tool rendah). | ai.routes.ts:82 |
| A14 | **RENDAH** | `system` pesan dari klien difilter (dilewati) di `normalizeMessages`, tetapi `role` lain (`tool`) jika dikirim klien akan disisipkan — validasi role klien belum membatasi ke `user`/`assistant`. | agent.ts:149-158 |

---

## 5. Agent Frontend (Offline Fallback)

**`runOfflineAgent`** (src/ai/agent.ts) adalah mesin rule-based keyword yang mengarahkan ke 6 tool lokal. Temuan:

- **Perilaku deterministik & aman** — untuk dosis hanya memakai hasil kalkulator lokal.
- Hasil cuaca memakai `fetchWeatherCached` + `sprayCondition` lokal (tanpa server).
- `activity_log` menulis ke `useActivityStore` lokal (`source:'ai'`), bukan server (backend `activity_log` tool menulis ke `farm_activities`). **Kedua sistem aktivitas tidak sinkron** — catatan AI offline tidak pernah diunggah ke `farm_activities`.
- **Frontend tidak punya mode `search_knowledge`/`market_price`** — pertanyaan KB/harga di fallback menjawab menolak/mengarahkan.

**Rekomendasi penetapan pohon keputusan:** urutan cek di `runOfflineAgent` (cuaca → pupuk → reminder → catat → pestisida → produk → lahan → hama) rentan salah tangkap; mis. "saya mau semprot A" akan masuk jalur `has(text,'pupuk')` terlebih dahulu bila mengandung "pupuk".

---

## 6. Matriks Ketergantungan & Risiko

| Aset | Dependensi | Risiko utama |
|------|-----------|--------------|
| Backend agent | Gemini/OpenRouter API (gratis), Supabase REST | Kuota harian model mendekati limit |
| RAG vektor | `GEMINI_API_KEY`, pgvector | Nonaktif tanpa Gemini |
| Market tool | ekonomis: `market_prices` tabel + `commodityMatch`/`provinceMatch` | Nama komoditas/provinsi ambigu |
| Frontend agent | AsyncStorage, calculator lokal | Tak konsisten dengan server |

---

## 7. Rekomendasi Prioritas

1. **P0 (TINGGI):** Terapkan anggaran token global per permintaan (mis. hentikan loop bila total input+completion melewati threshold) agar siap beralih ke model berbayar tanpa ledakan biaya.
2. **P0 (TINGGI):** Buat pencatatan kuota atomik — gunakan satu RPC/transaksi yang menghitung + menyisipkan dalam satu langkah, atau pindahkan kuota ke store Redis/in-memory + lock.
3. **P1 (SEDANG):** Sinkronkan sistem aktivitas: unggah `activity_log` offline (source 'ai') ke backend `farm_activities`.
4. **P1 (SEDANG):** Tambah paginasi `loadChunks()` agar KB >500 chunk tetap ditemukan RAG lokal.
5. **P1 (P1):** Pertimbangkan satu model berbayar terjangkau sebagai lapis cadangan terakhir pada kaskade.
6. **P2 (RENDAH):** Redaksikan `console.log` menjadi logger berlevel; hapus kolom `model_used` duplikat.

---

## 8. Kesimpulan

Arsitektur AI Tani dirancang dengan baik untuk **model kecil/gratis** — koreksi tool, toleransi argumen, RAG multi-lapis, dan fallback offline menunjukkan pertimbangan engineering matang. Dua risiko terbesar bukan dari kualitas jawaban, melainkan **ekonomi & keandalan**: pengendalian biaya token yang kurang ketat dan ketergantungan pada kuota model gratis. Ini adalah titik yang paling penting untuk diperkuat sebelum sistem dipakai produksi penuh / model berbayar.
