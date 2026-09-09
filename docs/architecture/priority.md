# Daftar Prioritas Masalah TAWANGTANI

Klasifikasi setiap masalah yang ditemukan saat audit kode, dikelompokkan P0–P3 (P0 = kritis/segara, P3 = perbaikan kecil/nice-to-have). Dokumen ini berfungsi sebagai **daftar masalah yang harus diselesaikan** (Phase 13) saat melakukan refactor di [`safe-refactor-order.md`](./safe-refactor-order.md).

---

## 1. Ringkasan Prioritas

| Prioritas | Jumlah | Makna |
|---|---|---|
| **P0** | 2 | Bug/risiko yang memengaruhi produksi atau integritas data — selesaikan segera. |
| **P1** | 6 | Duplikasi & drift kritis yang menjadi akar bug laten; migrasi ke kontrak. |
| **P2** | 6 | Beban perawatan (maintainability) dan konsistensi; refactor terencana. |
| **P3** | 4 | Peningkatan kualitas & perapian; jarang memengaruhi fungsi inti. |

---

## 2. P0 — KRITIS (segara)

| ID | Fase | Deskripsi | Dampak | File Terdampak | Rekomendasi |
|---|---|---|---|---|---|
| P0-01 | 4 | **Duplikasi `ToolContext`/`ToolResult` & skema tool AI** antara backend & mobile. Backend dan mobile masing-masing mendefinisikan dan mengeksekusi tool sendiri dengan skema berbeda; drift argumen menyebabkan agent mobile memanggil tool dengan bentuk yang tidak dikenali backend (atau sebaliknya) → jawaban salah/gagal. | Risiko tinggi pada inti fitur AI Tani; kegagalan tool membuat loop agent gagal tanpa pesan jelas. | `backend/src/types.ts`, `backend/src/tools/schemas.ts`, `backend/src/tools/executors.ts`, `src/services/ai/tools.ts`, `src/services/ai/agent.ts` | Konsolidasi ke `packages/contracts/src/tools`; pastikan satu skema dipakai kedua sisi. |
| P0-02 | 4 | **Duplikasi konstanta `commodities` & `provinces` di 3-4 lokasi** (mobile, backend, edge function). Kunci/slug komoditas & provinsi yang tidak match adalah akar bug sinkronisasi harga (sync Kemendag / sync prices) dan pencocokan pasar. | Data harga salah/tidak muncul; pencocokan provinsi keliru di market. | `src/constants/commodities.ts`, `backend/src/services/commodityMatch.ts`, `backend/src/services/provinceMatch.ts`, `backend/src/routes/market.routes.ts`, `supabase/functions/sync-*/index.ts`, `src/utils/resolveProvince.ts` | Satu sumber di `packages/contracts`; singkirkan duplikasi satu per satu dengan tes kunci. |

---

## 3. P1 — TINGGI (migrasi ke kontrak / drift laten)

| ID | Fase | Deskripsi | Dampak | File Terdampak | Rekomendasi |
|---|---|---|---|---|---|
| P1-01 | 4 | **Logika kalkulator diduplikat** (fertilizer/pesticide) di backend & mobile. Hasil bisa berbeda antar-platform. | Perhitungan dosis tidak konsisten antara chat AI dan layar kalkulator. | `backend/src/tools/executors.ts`, `src/features/fertilizer/calculator.ts`, `src/features/pesticide/calculator.ts`, `src/features/fertilizer/grid.ts` | Satu implementasi di `packages/contracts/src/domain/calculator`; uji numerik identik. |
| P1-02 | 4 | **`priceSanity` (batas harga) & `weatherAlerts` (ambang cuaca) hanya di backend** — mobile tidak punya versi konsisten; logika validasi tidak dapat dipakai ulang. | Ketidakpastian tentang kapan harga dianggap wajar; duplikasi konsep antar-sisi. | `backend/src/services/priceSanity.ts`, `backend/src/services/weatherAlerts.ts`, mobile weather/price service | Pindah ke kontrak sebagai logika murni; impor kedua sisi. |
| P1-03 | 3 | **Backend masih satu `store/` flat (11 file) & satu `routes/` (9 file)** — tumbuh tanpa batas domain; redudansi logika antar-store. | Sulit dirawat; risiko perilaku saling mengunci antar domain. | `backend/src/store/*`, `backend/src/routes/*` | Pecah per domain (lihat migration-map B26–B36). |
| P1-04 | 4 | **Tipe entitas inti diduplikat** antara `src/types/index.ts` & `backend/src/types.ts`. | DTO dan entitas bisa tidak sinkron → kesalahan pada batas REST. | `src/types/index.ts`, `backend/src/types.ts` | Satu set tipe di `packages/contracts/src/domain`. |
| P1-05 | 2 | **Frontend flat** — 7 store, 13 service, screen per fitur tersebar di folder akar; kode milik fitur terjauh dari pemiliknya. | Maintainability rendah; kesulitan menemukan & mengexport komponen per fitur. | `src/store/*`, `src/services/*`, `src/screens/*` | Organisasi ulang per fitur (lihat migration-map M-set). |
| P1-06 | 4 | **Edge function sync meng-hardcode konstanta komoditas/provinsi** (duplikat ketiga). | Drift konstanta dengan backend/mobile → sync salah. | `supabase/functions/sync-kemendag/index.ts`, `supabase/functions/sync-prices/index.ts` | Impor dari kontrak bila memungkinkan, atau inline hasil build dari kontrak. |

---

## 4. P2 — SEDANG (maintainability & konsistensi)

| ID | Fase | Deskripsi | Dampak | File Terdampak | Rekomendasi |
|---|---|---|---|---|---|
| P2-01 | 2 | **Tidak ada paket kontrak bersama** — semua tipe/konstanta digandakan manual. | Dasar dari seluruh duplikasi P0/P1. | seluruh tree | Buat `packages/contracts` dan mulai migrasi bertahap. |
| P2-02 | 2 | **`useSettingsStore` & `useAuthStore` mencampur state UI dengan state domain** — koordinat/lokasi disimpan global di settings, bukan di fitur lokasi. | Kurang jelas pemilik state; risiko inkonsistensi lokasi. | `src/store/useSettingsStore.ts`, `src/store/useAuthStore.ts` | Pisah state lokasi/lokalisasi dari auth. |
| P2-03 | 1 | **Skema Supabase & migrasi tidak didokumentasikan hubungannya** dengan tipe TS. | Migrasi DB dan tipe app bisa tidak sinkron. | `supabase/schema.sql`, `supabase/migrations/*`, `packages/contracts` | Dokumentasikan tipe ↔ kolom; jadikan kontrak sebagai acuan. |
| P2-04 | 2 | **Backend seed data & mobile seed diduplikat** (`data/*.json` backend vs `constants/products.seed.ts`). | Katalog awal bisa beda di sisi server vs offline mobile. | `backend/data/*.json`, `src/constants/products.seed.ts` | Satu sumber untuk seed; mobile ambil dari kontrak/catalog. |
| P2-05 | 3 | **Error handling & struktur respons API tidak dibakukan** di DTO bersama. | Konsumsi di mobile ad-hoc; kurang konsisten. | `backend/src/routes/*`, `src/services/api/client.ts`, `packages/contracts/src/api` | Definisikan DTO REST umum di kontrak. |
| P2-06 | 3 | **Instalasi & build tidak dikelola via workspace monorepo** — mobile (root) & backend terpisah `package.json` tanpa shared tooling. | Duplikasi script, sulit lint/typecheck/test secara bersama. | Root `package.json`, `backend/package.json`, `supabase` | Adopsi workspace (npm workspaces / turborepo) untuk google sheet & kontrak. |

---

## 5. P3 — RENDAH (nice-to-have / perapian)

| ID | Fase | Deskripsi | Dampak | File Terdampak | Rekomendasi |
|---|---|---|---|---|---|
| P3-01 | 1 | **Dead code / kode tak terpakai** (mis. beberapa service/constanta tidak dipakai menyeluruh). | Kebisingan; sulit mendeteksi kode mati. | lint seluruh `src/` & `backend/src/` | Bersihkan saat memindah file (migration-map). |
| P3-02 | 2 | **UI components (`Button`, `Card`, `Input`, `Screen`, `PriceChart`, `FadeIn`) belum masuk `shared/`** — tidak ada konsistensi ekspor. | Duplikasi gaya antar screen. | `src/components/*` | Pindah ke `shared/components` (M37). |
| P3-03 | 2 | **Tidak ada storybook/MDX docs komponen** & tidak ada docs tes jangkauan. | Kesulitan mengidentifikasi komponen mana yang dipakai. | `src/components/*`, `docs/` | Tambah katalog komponen ringan (opsional). |
| P3-04 | 1 | **Tidak ada `DEVELOPMENT.md`/`CONTRIBUTING.md`** yang memandu cara build/test/migrate. | Onboarding lambat. | `docs/` | Tulis dokumen singkat merujuk 4 dokumen arsitektur ini. |

---

## 6. Pemetaan Prioritas → Fase Refactor

| Prioritas | Dekomposisi ke fase [`safe-refactor-order.md`](./safe-refactor-order.md) |
|---|---|
| P0-01, P0-02, P1-01, P1-02, P1-04, P1-06 | **Fase 4** (migrasi kontrak & konsolidasi) |
| P1-03, P2-05, P2-06 | **Fase 3** (pemisahan per domain backend) |
| P1-05, P2-01, P2-02, P2-04, P3-02 | **Fase 2** (organisasi per fitur frontend & bootstrap kontrak) |
| P2-03, P3-01, P3-04, P3-03 | **Fase 1** (freeze, snapshot, dokumentasi, pembersihan awal) |
