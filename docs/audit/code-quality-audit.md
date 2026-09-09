# Audit Kualitas Kode (Phase 10)

> **Ruang lingkup:** Pemindaian seluruh codebase (backend + aplikasi React Native).
> **File audit:** semua `src/**` (66 file TS/TSX) dan `backend/src/**` (40 file TS), `package.json`, `__tests__/`, dan skrip CI.
> **Status kesimpulan:** Kode bersih dari TODO/FIXME/`@ts-ignore`, tes unit ada namun minim cakupan, dan ada file sangat besar + CI yang tidak menjalankan typecheck/lint/jest.

---

## 1. Ringkasan Eksekutif

Kode ditulis dengan gaya konsisten (TypeScript), bebas dari `@ts-ignore`, `@ts-nocheck`, TODO/FIXME/HACK. Namun ada tiga area perhatian: **(1)** skala file yang besar, **(2)** cakupan tes sangat tipis (hanya kalkulator), dan **(3)** CI tidak menjalankan `typecheck`/lint/jest sehingga regresi tipe bisa lolos. Ada pula duplikasi kecil (utility, matcher) antara frontend & backend.

**Skor kualitas keseluruhan: 7/10** — rapi, tapi butuh hardening tes & CI serta pemecahan file besar.

---

## 2. Inventori Pemindaian Otomatis

### 2.1. Kode Mati / Suppresi Tipe
| Metrik | Jumlah | Lokasi |
|--------|--------|--------|
| `@ts-ignore` / `@ts-nocheck` | **0** | – |
| `eslint-disable` | **5** | HomeScreen:98, PlantingsScreen:113, MarketScreen:224,245, AIChatScreen:76 (semua `exhaustive-deps`) |
| `TODO` / `FIXME` / `HACK` | **0** | – |
| `: any` di frontend `src/` | **2** | MarketScreen:483,519 |
| `: any` di backend | **1** | farms.ts:102 `seedFarmsFromLocal(localFarms: any[])` |
| `(req as any).sbUser` backend | **12** | farms.routes.ts (8x), push.routes.ts:243,253,284, rateLimit.ts:6 |
| `console.*` backend | **20** | config.ts, executors.ts:276, knowledge.ts:58, catalog.ts:48, ai.routes.ts, push.routes.ts, index.ts, errorHandler.ts:9, openrouter.ts, agent.ts |
| `console.*` frontend | **0** | – |

### 2.2. Catch Kosong / Ditelan
| Lokasi | Risiko |
|--------|--------|
| `offline.ts:22,48` | kegagalan AsyncStorage diam |
| `weather/openMeteo.ts:26,32` | data cuaca diam |
| `weatherAlertService.ts:56` | alert diam |
| `useActivityStore.ts:98` | reminder diam |
| `PlantingsScreen.tsx:84,204,217` | error simpan diam |
| `MarketScreen.tsx:206,500,522` | error pasar diam |

Terdapat pula **5** `catch(() => undefined)` (providers.tsx, ProductListScreen, HomeScreen, ai.routes.ts x2). Pola ini menyulitkan debugging & respons UI.

---

## 3. File Terbesar (>300 baris)

| File | Baris | Catatan |
|------|------:|---------|
| `products.seed.ts` | 3853 | Data seed JSON-in-code — sebaiknya file `.json` terpisah |
| `MarketScreen.tsx` | 1432 | Terlalu besar; pecah komponen/hook |
| `adminPage.ts` | 583 | HTML string besar di backend |
| `AIChatScreen.tsx` | 571 | Pecah komponen chat |
| `PlantingsScreen.tsx` | 504 | Pecah form/list |
| `push.routes.ts` | 442 | Campur banyak job (weather, alarm harga, change, reminder) |
| `admin.routes.ts` | 420 | Banyak handler admin |
| `PesticideCalculatorScreen.tsx` | 408 | Pecah form |
| `HomeScreen.tsx` | 400 | Pecah kartu/komponen |
| `ActivitiesScreen.tsx` | 391 | Pecah list/reminder |
| `executors.ts` | 368 | Banyak switch tool — pecah per-tool |
| `market.routes.ts` | 335 | Banyak handler |
| `marketData.ts` | 311 | – |
| `agent.ts` | 309 | Loop + banyak util di satu file |
| `knowledge.ts` | 308 | RAG + logging |

---

## 4. Pengujian

- **Hanya satu file tes:** `__tests__/calculators.test.ts` (kalkulator pupuk & pestisida).
- **Tidak ada tes** untuk: store Zustand, sinkronisasi, agen AI, route backend, keamanan, utilitas pasar.
- `package.json` root punya `"test": "jest"` (preset jest-expo) dan `"typecheck": "tsc --noEmit"`; backend punya `"typecheck"`.
- **CI (`/.github/workflows/e2e-test.yml` & `sinkron-harga.yml`) TIDAK menjalankan** `typecheck`, lint, maupun `jest`. Hanya `e2e.mjs` run di satu workflow. Artinya regresi tipe/tests bisa lolos ke main.

---

## 5. Duplikasi & Kebocoran Abstraksi

| Duplikasi | Detail |
|-----------|--------|
| `assertPositive` | Didefinisikan 3×: `src/utils/format.ts:17`, `src/features/fertilizer/grid.ts:16`, `backend/src/tools/executors.ts:37` |
| `AREA_TO_M2` | frontend `format.ts` & backend `executors.ts:41` (nilai sama) |
| Provinsi match | frontend `src/utils/resolveProvince.ts` (list statis) vs backend `services/provinceMatch.ts` (fetch live, alias) — **dua implementasi berbeda** |
| Komoditas map | frontend (kemtanSync) vs backend (`commodityMatch.ts` alias/SYNONYMS live) |
| Tool list | backend `TOOL_SCHEMAS` (8) vs frontend `TOOLS` (6) — duplikat definisi, bisa drift |

**Temuan khusus (C1):** `provinceMatch` & `commodityMatch` backend mengambil daftar provinsi/slug **live dari tabel** tiap 10 menit (paginasi 0..30000, offset 1000). Ini benar untuk skala besar, tetapi N+1 paginasi kasar; bisa diganti `distinct` query / view cache bila tabel sangat besar.

---

## 6. Kesalahan Konfigurasi / Skrip

| # | Temuan | Lokasi |
|---|--------|--------|
| C2 | `backend/package.json` `"main": "dist/index.js"` tapi `"start": "node dist/src/index.js"` — **kunci start/entry tidak konsisten** (build output di `dist/src`, main menunjuk `dist/index.js`). Bila deploy memakai `main`, akan gagal. | backend/package.json:6,10 |
| C3 | Tidak ada script `lint` di kedua package.json. | package.json |
| C4 | Tidak ada `status check`/gating di CI untuk typecheck/test. | workflows |

---

## 7. Rekomendasi Prioritas

1. **P0 (TINGGI):** Tambah workflow CI yang menjalankan `npm run typecheck` + `jest` (+lint bila ada) di root & backend pada `push`/`PR`.
2. **P0 (TINGGI):** Pecah file berukuran besar (MarketScreen, AIChatScreen, PlantingsScreen, adminPage) menjadi komponen/hook moduler.
3. **P1 (SEDANG):** Pindahkan `products.seed.ts` data besar ke `*.json` dan pisahkan job push.routes ke modul terpisah.
4. **P1 (SEDANG):** Konsolidasi duplikasi `assertPositive`/`AREA_TO_M2`/definisi tool ke satu modul bersama (atau shared package), dan samakan implementasi matcher provinsi/komoditas.
5. **P1 (SEDANG):** Perbaiki ketidakcocokan `main` vs `start` di backend/package.json.
6. **P1 (SEDANG):** Ganti `console.log` backend dengan logger berlevel & kurangi catch kosong menjadi yang mencatat error.
7. **P2 (RENDAH):** Tambah tes untuk store & sinkronisasi minimal; kurangi `(req as any)` dengan tipe `SbReq` yang sudah ada.

---

## 8. Kesimpulan

Kode secara keseluruhan terstruktur dan disiplin (0 TODO, 0 ts-ignore, gaya konsisten). Yang paling menghambat kualitas & keamanan jangka panjang adalah **ketiadaan gating CI untuk typecheck/test** dan **cakupan tes yang sangat tipis** dibanding kompleksitas (agen AI, sinkronisasi, banyak route). Prioritas perbaikan adalah membangun jenjang kualitas otomatis (CI) dan memecah file besar agar dapat diuji/rawat secara modular.
