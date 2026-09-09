# Urutan Refactor Aman TAWANGTANI

Dokumen ini mendeskripsikan **urutan eksekusi** (Phase 14) untuk memigrasikan kode menuju [target-architecture](./target-architecture.md) dengan risiko minimal. Setiap langkah harus selalu **hijau** (test, typecheck, lint, build) dan **dapat di-rollback**.

---

## 1. Aturan Dasar (Setiap Langkah)

1. **Satu langkah kecil** — jangan gabung beberapa pemindahan yang saling bergantung dalam satu commit.
2. **Semua gerbang hijau sebelum lanjut**: `tsc --noEmit` (mobile & backend), lint, unit test, build Expo, build Vercel.
3. **Tidak mengubah perilaku luar** — path berubah, nama berubah, tapi API/skema DB/logika numerik tetap sama selama fase refactor (kecuali ditandai eksplisit sebagai fase DB).
4. **Rollback siap** — setiap langkah terisolasi; lepas satu PR/commit agar mudah dibatalkan.
5. **Kode mati dibersihkan saat dipindah** — jangan pindahkan kode yang tak terpakai.

---

## 2. Ringkasan 4 Fase

| Fase | Nama | Tujuan Utama | Prioritas yang disentuh |
|---|---|---|---|
| **1** | Freeze & Snapshot | Membekukan titik awal, snapshot, dokumentasi dasar, baseline test | P2-03, P3-01, P3-04 |
| **2** | Bootstrap & Frontend per-fitur | Buat `packages/contracts`, rapikan mobile per fitur | P1-05, P2-01, P2-02, P2-04, P3-02 |
| **3** | Backend per-domain | Pecah backend flat menjadi domain | P1-03, P2-05, P2-06 |
| **4** | Migrasi Kontrak (kritis) | Konsolidasi duplikasi ke `packages/contracts` | P0-01, P0-02, P1-01, P1-02, P1-04, P1-06 |

---

## 3. FASE 1 — FREEZE & SNAPSHOT

**Tujuan:** titik awal yang terukur; snapshot; baseline; dokumentasi.

### 3.1 Langkah

1. **Snapshot git**: pastikan repo memiliki baseline commit; tandai tag `v-baseline-<date>`; catat versi package (`package-lock.json`, `backend/package-lock.json`).
2. **Jalankan baseline test** (catat hasilnya): `npm test` (root, jest-expo), `tsc --noEmit` mobile & backend, `npm run build` backend.
3. **Buat workspace monorepo ringan** di root (`package.json` dengan `"workspaces"`) agar `packages/` bisa diimpor. (Bisa ditunda ke Fase 2 bila lebih nyaman — dokumentasikan di `DEVELOPMENT.md`.)
4. **Tulis `DEVELOPMENT.md`** ringkas dengan cara build/test/migrate.
5. **Audit & catat path** — gunakan migration-map & priority sebagai checklist.
6. **Bersihkan kode mati** ringan yang jelas tak dipakai (jangan lakukan refactor besar di fase ini).

### 3.2 Kriteria Keluar (Exit Criteria)

- [ ] Baseline test & build hijau tercatat.
- [ ] Tag snapshot dibuat.
- [ ] Workspace (atau rencana workspace) didokumentasikan.
- [ ] `DEVELOPMENT.md` ada.

---

## 4. FASE 2 — BOOTSTRAP & FRONTEND PER-FITUR

**Tujuan:** struktur frontend per-fitur + fondasi `packages/contracts`.

### 4.1 Bootstrap `packages/contracts`

1. Buat `packages/contracts` dengan `tsconfig` (mode commonjs+esm) dan `package.json` (exports `./domain`, `./tools`, `./constants`, `./api`).
2. **Pindahkan tipe domain** (`src/types/index.ts`) ke `packages/contracts/src/domain` *(MOVE, satu-ke-satu — belum konsolidasi dgn backend, itu di Fase 4)*.
3. **Pindahkan konstanta** murni mobile (`bahasa.ts`, `komoditas` awal) ke `packages/contracts/src/constants` (belum hapus duplikat backend — itu Fase 4).
4. Update impor mobile agar mengonsumsi dari paket, bukan salinan lokal.

### 4.2 Organisasi ulang frontend per fitur

Lakukan **per fitur** — satu fitur per batch, jaga impor tetap update:

1. Pindah screen fitur → `features/<fitur>/screens/` (M40–M51).
2. Pindah store milik fitur → `features/<fitur>/` (M6–M12).
3. Pindah service milik fitur → `features/<fitur>/` (M17–M26).
4. Pindah komponen & util umum → `shared/` (M37, M38, M39).
5. Pindah `services/api/*` & `services/supabase.ts` & `offline.ts` → `shared/api/` (M15, M16, M21).

> Order batch fitur yang disarankan (dari paling sedikit dependensi): `calc` → `farm` → `ai` → `market` → `weather` → `products` → `auth` → `history` → `profile` → `guide` → `home`.

### 4.3 Kriteria Keluar

- [ ] `packages/contracts` bisa diimpor & typecheck.
- [ ] Semua screen/store/service mobile dipindah per fitur; impor diperbarui.
- [ ] `__tests__/calculators.test.ts` tetap hijau.
- [ ] Build Expo + typecheck mobile hijau.

---

## 5. FASE 3 — BACKEND PER-DOMAIN

**Tujuan:** pecah backend flat → domain terpisah, jaga rute & store tetap selaras.

### 5.1 Langkah

1. Buat struktur `apps/backend/src/domains/<domain>/` (`ai`, `market`, `farm`, `products`, `notifications`, `admin`).
2. **Migrasi store dulu** (B26–B36) — pindah masing-masing store ke `domains/<domain>/store.ts`.
3. **Migrasi router** (B5–B13) — pindah ke `domains/<domain>/routes.ts`, satukan `ai`+`chat`, `farms`+`plantings`.
4. **Migrasi domain service** (B14–B25 yang bukan kontrak) ke `domains/<domain>/`.
5. **Update `app.ts`** (B1) untuk mount router baru; hapus path lama.
6. **Pindahkan file infrastruktur** (B37–B43): middleware, utils, api/index, public, scripts.
7. Jalankan **test integrasi backend** (bila ada) & `tsc --noEmit` & build Vercel.

> **Catatan kritis**: jangan pindahkan `commodityMatch`, `provinceMatch`, `priceSanity`, `weatherAlerts`, `schemas`, bagian kalkulator ke domain — ini **ditunda ke Fase 4** (kontrak), karena dilakukan bersama mobile untuk menghindari drift.

### 5.2 Kriteria Keluar

- [ ] Backend terstruktur per domain.
- [ ] Router `ai`+`chat` dan `farms`+`plantings` tergabung.
- [ ] Semua store & service domain dipindah.
- [ ] Typecheck + build backend (dan Vercel) hijau.

---

## 6. FASE 4 — MIGRASI KONTRAK (KRITIS)

**Tujuan:** hilangkan semua duplikasi kritis; satu sumber kebenaran.

### 6.1 Urutan eksekusi (risiko naik bertahap)

1. **Konsolidasi tipe** (`backend/src/types.ts` + `src/types/index.ts`) → `packages/contracts/src/domain`. Perbarui kedua sisi untuk mengimpor dari satu tempat. *(P1-04)*
2. **Konsolidasi `priceSanity` & `weatherAlerts`** → `packages/contracts/src/domain` (logika murni). *(P1-02)*
3. **Konsolidasi tipe/skema tool** (`backend/src/tools/schemas.ts` + `src/services/ai/tools.ts`) → `packages/contracts/src/tools`. *(P0-01)* — uji eksekutor kedua sisi.
4. **Konsolidasi kalkulator** (`backend/src/tools/executors.ts` bagian calc + `src/features/fertilizer|pesticide/calculator.ts` + `src/features/fertilizer/grid.ts`) → `packages/contracts/src/domain/calculator`. *(P1-01)* — pastikan hasil numerik identik; jalankan `calculators.test.ts`.
5. **Konsolidasi konstanta komoditas/provinsi** (`backend/services/commodityMatch*, provinceMatch*` + `src/constants/commodities.ts` + edge functions) → `packages/contracts/src/constants`. *(P0-02, P1-06)* — sinkronkan kunci & cek edge functions.
6. **Hapus duplikasi yang tersisa** (seed data, `searchProducts` mobile vs backend) satu per satu.

### 6.2 Penanganan edge functions (S3/S4) — penting

Karena edge function berjalan di Deno & impor lintas-paket bisa gagal:

- **Opsi A (lebih aman)**: buat skrip build yang menghasilkan **file inline berisi konstanta** dari `packages/contracts`, lalu edge function memakainya. Single source tetap di kontrak.
- **Opsi B**: uji impor langsung dari `packages/contracts`; gunakan bila Deno/otel mendukung. Jangan sampai sync Kemendag/prices rusak — selalu rollback ke Opsi A bila gagal.

### 6.3 Kriteria Keluar

- [ ] Tidak ada lagi duplikat tipe/skema/kalkulator/konstanta antar sisi.
- [ ] Semua sisi (mobile, backend, edge) mengonsumsi `packages/contracts` (langsung atau hasil build).
- [ ] `__tests__/calculators.test.ts`, test backend/integrasi, typecheck, build, lint semuanya hijau.
- [ ] Sync Kemendag & sync prices berhasil setelah migrasi konstanta.

---

## 7. Rollback Strategy

| Situasi | Tindakan |
|---|---|
| Langkah frontend per-fitur gagal typecheck | `git revert` commit itu; file kembali ke posisi lama, impor kembali. |
| Backend per-domain gagal integrasi | Lepas PR router/store itu; app.ts tetap mount path lama (backward-compatible) sementara. |
| Kalkulator hasil numerik berubah | Kembalikan dulu ke implementasi lokal; selidiki selisih (rounding) sebelum re-migrate. |
| Edge function sync rusak | Segera kembalikan file edge ke versi inline lama; migrasi konstanta ditunda. |

**Prinsip**: karena langkah dipisah per commit/PR, rollback satu langkah tidak menggulirkan langkah lain.

---

## 8. Kompleksitas & Estimasi Relatif

| Fase | Kompleksitas | Risiko | Beban utama |
|---|---|---|---|
| 1 | Rendah | Rendah | Snapshot, workspace, docs |
| 2 | Sedang | Sedang | Update impor lintas fitur |
| 3 | Sedang | Sedang | Pecah store/router, app.ts |
| 4 | Tinggi | Kritis | Konsolidasi kontrak, uji drift, edge functions |

---

## 9. Pemetaan Masalah → Langkah

Setiap masalah di [`priority.md`](./priority.md) diselesaikan pada langkah tertentu:

| Prioritas | Diselesaikan di |
|---|---|
| P0-01 (tool schemas) | Fase 4, §6.1 langkah 3 |
| P0-02 (commodities/provinces) | Fase 4, §6.1 langkah 5 |
| P1-01 (kalkulator) | Fase 4, §6.1 langkah 4 |
| P1-02 (priceSanity/weatherAlerts) | Fase 4, §6.1 langkah 2 |
| P1-03 (backend flat) | Fase 3 |
| P1-04 (tipe duplikat) | Fase 4, §6.1 langkah 1 |
| P1-05 (frontend flat) | Fase 2 |
| P1-06 (edge hardcode) | Fase 4, §6.2 |
| P2-01 (tanpa kontrak) | Fase 2, §4.1 |
| P2-02 (state campur) | Fase 2 (pisah state lokasi) |
| P2-03 (schema↔TS) | Fase 1 & 4 |
| P2-04 (seed duplikat) | Fase 2 & 4 |
| P2-05 (DTO REST) | Fase 3 |
| P2-06 (no workspace) | Fase 1/2 |
| P3-01 (dead code) | Fase 1 & di setiap pemindahan |
| P3-02 (shared UI) | Fase 2 |
| P3-03 (docs komponen) | Pasca Fase 4 |
| P3-04 (DEVELOPMENT.md) | Fase 1 |

---

## 10. Verifikasi Akhir (Setelah Fase 4)

- [ ] `packages/contracts` menjadi satu-satunya sumber tipe/konstanta/kalkulator/skema.
- [ ] Tidak ada file duplikat tersisa di mobile/backend/edge.
- [ ] Seluruh rangkaian test (mobile, backend, kontrak, integrasi) hijau.
- [ ] Build produksi (Expo + Vercel) sukses.
- [ ] Smoke test fitur inti: AI Tani (loop tool), kalkulator, sinkronisasi harga, chat sync, cuaca.
