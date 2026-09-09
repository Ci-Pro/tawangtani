# Arsitektur Target TAWANGTANI

Dokumen ini mendeskripsikan target arsitektur yang ingin dicapai lewat refactor bertahap. Ini adalah **peta tujuan** (Phase 11) — bukan jadwal eksekusi. Untuk urutan eksekusi lihat [`migration-map.md`](./migration-map.md) dan [`safe-refactor-order.md`](./safe-refactor-order.md).

---

## 1. Prinsip Utama (Target)

1. **Satu sumber kebenaran (Single Source of Truth)** untuk tipe, konstanta, dan logika bisnis yang dipakai lintas sisi (mobile ↔ backend ↔ Supabase edge function). Tidak ada lagi duplikasi tipe/logika.
2. **Kontrak berbagi** (shared contracts) lewat paket monorepo bernama `packages/` — bukan salinan manual antar folder.
3. **Backend terpisah per domain** — jangan satu `store/` maupun satu set `routes/` yang menumpuk. Pecah per domain (farms, market, chat/ai, products, notifications).
4. **Logika bisnis yang murni (pure, tanpa I/O)** dipisahkan dari lapisan I/O/adapter sehingga dapat diuji tanpa dependensi eksternal dan dipakai ulang lintas sisi.
5. **Frontend terorganisir per fitur** — setiap fitur memegang screen + komponen + hook + store + service yang menjadi miliknya, alih-alih flat `services/`, `store/`, `components/`.
6. **Migrasi tanpa lompatan besar** — satu langkah kecil yang selalu hijau (test, typecheck, lint), dapat di-rollback, dan tidak mengubah perilaku luar.
7. **Hanya simpan kode yang benar-benar dipakai** — bersihkan kode mati (dead code) dan kode yang diduplikat sebelum/menjelang dipindah.

---

## 2. Struktur Target

```
tawangtani/
├── app/                         # (Expo Router — OPSIONAL/TARGET LANJUT)
├── packages/
│   ├── contracts/               # KONTRAK BERBAGI — single source of truth
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── api/             # tipe request/response + DTO REST
│   │       ├── domain/          # tipe entitas inti (Farm, Crop, Activity, Product, dll.)
│   │       │   └── calculator/  # murni, tanpa I/O (fertilizer, pesticide, grid, konversi)
│   │       ├── tools/           # skema tool AI + ToolContext/ToolResult yang sama
│   │       ├── constants/
│   │       │   ├── commodities.ts   # satu daftar komoditas
│   │       │   ├── provinces.ts     # satu daftar provinsi
│   │       │   └── bahasa.ts        # COMMODITY_FRIENDLY + bahasa daerah
│   │       └── index.ts
│   └── config/                  # env/shared config (optional)
├── apps/
│   ├── mobile/                  # Expo React Native (sumber dipindah dari root/src)
│   │   └── src/
│   │       ├── app/             # entry/providers
│   │       ├── navigation/
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── calculator/
│   │       │   ├── farm/
│   │       │   ├── ai/
│   │       │   ├── market/
│   │       │   ├── weather/
│   │       │   ├── products/
│   │       │   ├── profile/
│   │       │   ├── history/
│   │       │   └── guide/
│   │       ├── shared/          # komponen/hook/util lintas fitur
│   │       └── theme/
│   ├── backend/                 # Node/Express (dipindah dari backend/)
│   └── supabase/                # schema, migrations, edge functions
└── docs/
    ├── architecture/
    └── audit/
```

> Catatan: pemindahan seluruh tree ke `apps/mobile` + `apps/backend` dan `app/` (Expo Router) dapat dianggap **target lanjutan** (fase optional) agar risiko tetap rendah. Prioritas utama adalah memecah `packages/contracts` dulu.

---

## 3. Target Backend (per-domain)

Backend dipisah per domain. Contoh target (relative terhadap `apps/backend/src`):

```
apps/backend/src/
├── app.ts            # glue: mount semua router, middleware global
├── config.ts
├── index.ts
├── api/index.ts      # entry Vercel (serverless)
├── server/
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── rateLimit.ts
│   │   └── supabaseUser.ts
│   └── utils/
│       └── cache.ts
└── domains/
    ├── ai/           # agent.ts, openrouter, structured, tokenBudget
    │   ├── routes.ts
    │   ├── service.ts
    │   └── store.ts
    ├── market/       # harga, riwayat, farmer prices, alert
    │   ├── routes.ts
    │   ├── service.ts
    │   └── store.ts
    ├── farm/         # farm, plantings, farm activities
    │   ├── routes.ts
    │   ├── service.ts
    │   └── store.ts
    ├── products/     # katalog + knowledge seed
    │   ├── routes.ts
    │   ├── service.ts
    │   └── store.ts
    └── notifications/  # push tokens, push.routes
        ├── routes.ts
        └── store.ts
```

- **`routes/*` lama** → dipindah ke `domains/<domain>/routes.ts` masing-masing.
- **`store/*` lama** → dipindah ke `domains/<domain>/store.ts`.
- **Logika murni** (`commodityMatch.ts`, `provinceMatch.ts`, `priceSanity.ts`, `weatherAlerts.ts`, parser jumlah) → pindah ke `packages/contracts` (domain calculation) agar dipakai ulang oleh edge function & mobile.
- **`adminPage.ts` + `admin.routes.ts`** → menjadi satu modul `admin/` (dashboard + HTML template inlined).

---

## 4. Target Frontend (per-feature)

Setiap fitur memegang screen, komponen khusus fitur, hook, store, dan service-nya sendiri:

```
apps/mobile/src/features/
├── calculator/
│   ├── screens/            # CalculatorHome, Fertilizer, Pesticide, Grid, UnitConverter
│   ├── convert.ts
│   └── gridHelpers.ts      # logika grid phospat (pindah dari features/fertilizer/grid.ts)
├── farm/
│   ├── screens/            # FarmList, FarmForm, Plantings, Activities
│   ├── helpers.ts
│   └── sync.ts             # farmSync.ts
├── ai/
│   ├── screens/AIChatScreen.tsx
│   ├── components/         # bubble, quick actions, dll.
│   ├── agent.ts            # pindah dari services/ai/agent.ts
│   └── useAgent.ts
├── market/
│   ├── screens/MarketScreen.tsx
│   ├── dashboard.ts        # widget data/harga (pindah dari WidgetData)
│   └── sync.ts
├── weather/
│   ├── screens/WeatherDetailScreen.tsx
│   ├── hooks/useWeather.ts
│   └── alerts.ts
├── products/
│   ├── screens/            # ProductList, ProductDetail
│   └── search.ts           # pindah dari useProductStore.searchProducts
├── auth/                   # Login, Signup
├── history/
├── profile/
├── guide/
├── home/
└── shared/                 # Button, Card, Input, Screen, FadeIn, PriceChart, hooks umum, utils
```

---

## 5. Target Paket Kontrak (`packages/contracts`)

Semua hal yang **duplikat saat ini** menjadi satu sumber di sini:

| Hal yang hari ini duplikat | Target di `packages/contracts` |
|---|---|
| `ToolContext` / `ToolResult` (`backend/src/types.ts` & `src/services/ai/tools.ts`) | `src/tools/` |
| Skema tool AI (`backend/src/tools/schemas.ts` & mobile `services/ai/tools.ts`) | `src/tools/schemas.ts` |
| Logika kalkulator (`backend/src/tools/executors.ts` & `src/features/fertilizer|pesticide/calculator.ts`) | `src/domain/calculator/` |
| `commodities` (`src/constants/commodities.ts`, `backend/src/services/commodityMatch.ts`, `supabase/functions/sync-*/index.ts`) | `src/constants/commodities.ts` |
| `provinces` (`src/constants/…`, `backend/src/services/provinceMatch.ts`, `market.routes.ts`, edge functions) | `src/constants/provinces.ts` |
| Tipe entitas inti (`src/types/index.ts` & `backend/src/types.ts`) | `src/domain/` |
| DTO REST | `src/api/` |

---

## 6. Prinsip Kontrak Berbagi

1. **Tulis tipe & konstanta SEKALI di `packages/contracts`**, lalu impor oleh mobile, backend, dan edge function.
2. **Edge function Supabase** mengimpor dari `packages/contracts` bila bundler/deno memungkinkan; jika tidak memungkinkan, gunakan skrip sync build yang menghasilkan versi inline **dari** kontrak (tetap satu sumber).
3. **Bidang (schemas) yang dipakai bersama** — khususnya konstanta komoditas/provinsi, kalkulator, dan skema tool AI — **tidak boleh** tetap diduplikat; migrasi ke kontrak menyelesaikan *drift* (ketidakcocokan kunci/ID yang menjadi akar bug).

---

## 7. Migrasi dari Struktur Saat Ini

Struktur **saat ini** (flat) → target (per-domain/feature):

| Sekarang | Target |
|---|---|
| `src/` (root) | `apps/mobile/src/` |
| `backend/src/` | `apps/backend/src/` |
| `src/store/*.ts` (7 store zustand) | split ke `features/<fitur>/` |
| `src/services/*.ts` (13) | split ke `features/<fitur>/` atau `shared/` |
| `backend/src/store/*.ts` (11) | `domains/<domain>/store.ts` |
| `backend/src/routes/*.ts` (9) | `domains/<domain>/routes.ts` |

> Migrasi **tidak** mengubah perilaku luar: penamaan ulang path, pemindahan file, dan ekstraksi logika murni hanya bila terjadi satu-ke-satu. Tidak ada perubahan API/skema DB di dalam fase refactor (kecuali perubahan DB ditandai eksplisit sebagai fase terpisah).

---

## 8. Prinsip Anti-Regresi (Target)

Setiap perubahan harus tetap hijau di **semua** gerbang:

1. `tsc --noEmit` (mobile & backend)
2. ESLint / lint di masing-masing package
3. Unit test kalkulator & domain murni (`__tests__/calculators.test.ts` dan setara)
4. Test integrasi backend (jika ada) — wajib setelah pemisahan per domain
5. Build Expo + build Vercel

Lihat [`safe-refactor-order.md`](./safe-refactor-order.md) untuk detail eksekusi.
