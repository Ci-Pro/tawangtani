# Audit Database & Migrasi (Phase 8)

> **Ruang lingkup:** Skema Supabase/PostgreSQL, ledger migrasi, dan kebersihan struktur data.
> **File audit:** `supabase/schema.sql`, `supabase/migration_*.sql` (002–014), `supabase/migrations/*.sql`.
> **Status kesimpulan:** Skema berfungsi dan mencakup fitur utama, tetapi ledger migrasi **ganda/duplikat** dan struktur terbuka (RLS tidak lengkap) menjadi temuan penting.

---

## 1. Ringkasan Eksekutif

Proyek memakai **dua jalur migrasi paralel** yang isinya saling menyalin:
1. `supabase/migration_002_knowledge.sql` … `migration_014_farm_activities.sql` (13 file bernomor).
2. `supabase/migrations/20260827*` … `20260829*` (6 file dengan nama bernomor tanggal).

`migrations/20260827000000_price_change_alerts.sql` identik dengan `migration_010_price_change_alerts.sql`, seterusnya untuk `migration_011`→`20260827010000_farm_profiles`, `012`→`20260827020000_ai_logs`, `013`→`20260827030000_kb_vector`, `014`→`20260827040000_farm_activities`. Kedua jalur ini akan menjalankan `create table` yang sama dua kali bila keduanya dipakai — beruntung sebagian besar memakai `create table if not exists`, tetapi `migration_010/011` memakai `create table` **tanpa** `if not exists` (risiko error).

**Skor kesehatan keseluruhan: 6,5/10** — fungsional namun berisiko duplikasi migrasi dan RLS yang parsial.

---

## 2. Registry Tabel (16 tabel + fungsi)

| # | Tabel | File pembuat | RLS diaktifkan? |
|---|-------|-------------|----|
| 1 | `products` | schema.sql | Ya (SELECT anon/authenticated; tulis hanya service_role) |
| 2 | `audit_log` | schema.sql | Ya (SELECT authenticated) |
| 3 | `knowledge_docs` | migration_002 | perlu verifikasi |
| 4 | `knowledge_chunks` | migration_002 | perlu verifikasi |
| 5 | `chat_messages` | migration_002 | perlu verifikasi |
| 6 | `ai_query_log` | migration_002 | perlu verifikasi |
| 7 | `push_tokens` | migration_003 | perlu verifikasi |
| 8 | `market_prices` | migration_004 + 007 (level) | perlu verifikasi |
| 9 | `market_price_history` | migration_005 | perlu verifikasi |
| 10 | `farmer_prices` | migration_008 | perlu verifikasi |
| 11 | `price_alerts` | migration_008 | perlu verifikasi |
| 12 | `plantings` | migration_009 | perlu verifikasi |
| 13 | `planting_reminders` | migration_009 | perlu verifikasi |
| 14 | `price_change_alerts` | migration_010 / migrations/20260827000000 | perlu verifikasi |
| 15 | `farms` + `farm_crops` | migration_011 / migrations/20260827010000 | perlu verifikasi |
| 16 | `farm_activities` | migration_014 / migrations/20260827040000 | perlu verifikasi |
| 17 | `push_campaign_log` | migrations/20260829060000_admin_ops | perlu verifikasi |

**Fungsi/stored:** `search_knowledge` (migration_002 dirubah ulang di 006), `search_knowledge_vec` (migration_013). **Extension:** `pg_trgm` (002), `vector` (013).

---

## 3. Temuan Utama

### 3.1. Ledger & Duplikasi Migrasi

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| D1 | **TINGGI** | **Migrasi ganda/duplikat**: `migrations/20260827*` menduplikasi `migration_010..014`. Suprpabase CLI `supabase migration up` akan mengeksekusi *kedua* direktori bila keduanya dikenali, menyebabkankan `create table` dua kali. Beberapa `create table` **tanpa** `if not exists` (migration_010/011) akan gagal pada eksekusi kedua. | migration_010, 011 |
| D2 | **TINGGI** | Tidak ada direktori migrasi tunggal yang otoritatif; `schema.sql` hanya memuat 2 tabel awal, sisanya tersebar di 19+ file. | seluruh `supabase/` |
| D3 | **SEDANG** | `schema.sql` (tabel `products`/`audit_log`) **tidak sinkron** dengan perubahan terbaru (mis. kolom baru yang ditambahkan lewat migration_007 dan lainnya bila di-edit) — skema referensi dan migrasi drift. | schema.sql |
| D4 | **RENDAH** | Penamaan campuran `migration_002..014` (tanpa timestamp, urutan renyah) vs `20260827..` (timestamp). Tidak ada script migrasi otomatis (CLI `migration diff`) di CI. | naming |

### 3.2. Keamanan RLS & Otorisasi

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| D5 | **TINGGI** | Hanya `products` & `audit_log` di `schema.sql` yang dengan eksplisit mengaktifkan RLS dan policy. **Tabel lain** (chat_messages, farm_crops, plantings, dsb.) belum tentu memiliki RLS yang membatasi akses per-user — perlu diverifikasi; bila RLS tidak diaktifkan, Postgres default **mengizinkan akses** (tabel terbuka bagi peran dengan SELECT/INSERT). | migration_002 dkk |
| D6 | **SEDANG** | Backend sangat bergantung pada **service_role key** untuk semua operasi (mengabaikan RLS). Bila service_role bocor, seluruh tabel terekspos. | knowledge.ts, farms.ts, catalog.ts, chat.routes.ts |
| D7 | **SEDANG** | Tidak ada **RLS untuk `ai_query_log`** guna mencegah satu user membaca log user lain bila endpoint terpapar (kolom user_id). | ai_query_log |

### 3.3. Integritas & Kebijakan Data

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| D8 | **SEDANG** | `market_prices` PK diubah di migration_007 menjadi `(commodity, province, level)` — migrasi harus memastikan data lama (PK lama) dimigrasi, bukan sekadar drop fail. Perlu cek script backfill. | migration_007 |
| D9 | **RENDAH** | Kolom `doses`/`warnings` bertipe jsonb tanpa constraint struktur (skema bebas). | schema.sql:14,16 |
| D10 | **RENDAH** | Tidak ada foreign key bermakna pada beberapa tabel (mis. `chat_messages.session_id` tanpa FK ke tabel sesi — sesi hanya string id). | migration_002 |

### 3.4. Indeks & Kinerja

| # | Tingkat | Temuan | Lokasi |
|---|---------|--------|--------|
| D11 | **RENDAH** | Indeks sudah baik (`gin` FTS/trgm, embedding ivfflat, indeks user/date), namun tidak ada komentar kebijakan pemeliharaan (VACUUM, jumlah bucket vector). | migration_013 |

---

## 4. Migrasi yang Ada dan Tujuannya

| File | Tujuan |
|------|--------|
| schema.sql | produk & audit_log (DB seed awal) |
| migration_002 | extension pg_trgm, KB docs/chunks, full-text function, chat_messages, ai_query_log |
| migration_003 | push_tokens |
| migration_004 | market_prices |
| migration_005 | market_price_history |
| migration_006 | redefinisi `search_knowledge` |
| migration_007 | level harga; PK baru (commodity, province, level) |
| migration_008 | farmer_prices, price_alerts |
| migration_009 | plantings, planting_reminders |
| migration_010 | price_change_alerts |
| migration_011 | farms, farm_crops |
| migration_012 | indeks & metadata ai_query_log (prompt_tokens dll) |
| migration_013 | extension vector, `search_knowledge_vec` |
| migration_014 | farm_activities |
| migrations/20260827* | duplikat 010–014 |
| migrations/20260829* | push_campaign_log (admin ops) |

---

## 5. Rekomendasi Prioritas

1. **P0 (TINGGI):** **Konsolidasi ledger migrasi ke satu direktori otoritatif** (mis. `supabase/migrations/`) dan hapus/rename duplikat `migration_010..014`, lalu jalankan ulang dari clean state untuk memastikan tidak ada `create table` ganda.
2. **P0 (TINGGI):** Aktifkan & verifikasi **RLS per-user** untuk seluruh tabel data milik pengguna (chat, farm, plantings, activities, alerts, push_tokens, ai_query_log), dengan policy berbasis `auth.uid()` = `user_id`.
3. **P1 (SEDANG):** Buat `schema.sql` menjadi **satu-satunya sumber skema kanonik** (atau jadikan migrations-modern sebagai kanonik) dan tambahkan `supabase db diff`/migrasi di CI agar tidak drift.
4. **P1 (SEDANG):** Tambahkan script backfill/verifikasi untuk perubahan PK `market_prices` (migration_007) dan pastikan `market_price_history` memakai kunci yang konsisten.
5. **P2 (RENDAH):** Dokumen dan constraint skema jsonb (`doses`, `warnings`); pertimbangkan FK `chat_messages.session_id`.

---

## 6. Kesimpulan
Skema mencakup seluruh fitur aplikasi (katalog, KB, pasar, farm, aktivitas, notifikasi, admin). Namun ketergantungan pada **dua jalur migrasi duplikat** adalah risiko operasional serius yang dapat menyebabkan migrasi gagal atau state DB tidak deterministik. Sebelum deployment produksi ke Supabase, ledger migrasi harus disatukan dan RLS diverifikasi penuh.
