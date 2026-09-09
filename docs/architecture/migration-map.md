# Peta Migrasi TAWANGTANI

Satu baris per file sumber saat ini: posisi sekarang → target, jenis migrasi, dependensi, risiko, urutan, dan fase. Dokumen ini adalah **cara/langkah bergerak** (Phase 12). Untuk urutan detail lihat [`safe-refactor-order.md`](./safe-refactor-order.md); untuk klasifikasi masalah lihat [`priority.md`](./priority.md).

---

## 1. Legenda

**Jenis Migrasi:**
- `MOVE` — pindah path, isi sama persis.
- `SPLIT` — pecah satu file menjadi beberapa (mis. store → per fitur).
- `MERGE` — gabung beberapa file jadi satu modul domain.
- `REWRITE` — tulis ulang untuk tujuan target (hati-hati DRIFT).
- `KEEP` — biarkan, hanya pindah bila diperlukan.
- `DEPRECATE` — berhenti dipakai, kode mati.
- `DELETE AFTER MIGRATION` — hapus setelah duplikat telah dimigrasikan/dikonsolidasi.

**Risiko:** `rendah` (path-only, aman) · `sedang` (perubahan impor lintas file) · `tinggi` (logika berbagi/cabang ganda) · `kritis` (perilaku inti — eksekusi tool, agent loop, sinkronisasi).

**Urutan:** skala eksekusi global 1–10 (lihat fase di bawah). Fase mengikuti [`safe-refactor-order.md`](./safe-refactor-order.md).

---

## 2. Peta Migrasi — BACKEND (`backend/src/`)

| # | Sumber (sekarang) | Target | Jenis | Risiko | Urutan | Fase |
|---|---|---|---|---|---|---|
| B1 | `backend/src/app.ts` | `domains` + `app.ts` (mount ulang router) | MERGE/REWRITE | sedang | 1 | 2 |
| B2 | `backend/src/config.ts` | `apps/backend/src/config.ts` | MOVE | rendah | 1 | 2 |
| B3 | `backend/src/index.ts` | `apps/backend/src/index.ts` | MOVE | rendah | 1 | 2 |
| B4 | `backend/src/types.ts` | `packages/contracts/src/domain` (migrasi tipe bersama) | SPLIT | tinggi | 4 | 4 |
| B5 | `backend/src/routes/ai.routes.ts` | `domains/ai/routes.ts` | MOVE | sedang | 3 | 3 |
| B6 | `backend/src/routes/chat.routes.ts` | `domains/ai/routes.ts` (chat & ai disatukan) | MERGE | sedang | 3 | 3 |
| B7 | `backend/src/routes/market.routes.ts` | `domains/market/routes.ts` | MOVE/SPLIT (kelola provinsi) | sedang | 3 | 3 |
| B8 | `backend/src/routes/farms.routes.ts` | `domains/farm/routes.ts` | MOVE | sedang | 3 | 3 |
| B9 | `backend/src/routes/plantings.routes.ts` | `domains/farm/routes.ts` (gabung domain farm) | MERGE | sedang | 3 | 3 |
| B10 | `backend/src/routes/products.routes.ts` | `domains/products/routes.ts` | MOVE | sedang | 3 | 3 |
| B11 | `backend/src/routes/push.routes.ts` | `domains/notifications/routes.ts` | MOVE | sedang | 3 | 3 |
| B12 | `backend/src/routes/admin.routes.ts` | `domains/admin/routes.ts` | MOVE | sedang | 3 | 3 |
| B13 | `backend/src/routes/adminPage.ts` | `domains/admin/adminPage.ts` (HTML template) | MOVE | rendah | 3 | 3 |
| B14 | `backend/src/services/agent.ts` | `domains/ai/` (agent loop, MAX_ITERATIONS=7) | MOVE | tinggi | 5 | 4 |
| B15 | `backend/src/services/openrouter.ts` | `domains/ai/` | MOVE | sedang | 3 | 3 |
| B16 | `backend/src/services/structured.ts` | `domains/ai/` | MOVE | sedang | 3 | 3 |
| B17 | `backend/src/services/tokenBudget.ts` | `domains/ai/` | MOVE | sedang | 3 | 3 |
| B18 | `backend/src/tools/schemas.ts` | `packages/contracts/src/tools/schemas.ts` | MOVE → KONTRAK | kritis | 6 | 4 |
| B19 | `backend/src/tools/executors.ts` | `domains/ai/executors.ts` + logika murni → kontrak | SPLIT | kritis | 6 | 4 |
| B20 | `backend/src/services/commodityMatch.ts` | `packages/contracts/src/constants/commodities.ts` | MOVE → KONTRAK | kritis | 4 | 4 |
| B21 | `backend/src/services/provinceMatch.ts` | `packages/contracts/src/constants/provinces.ts` | MOVE → KONTRAK | kritis | 4 | 4 |
| B22 | `backend/src/services/marketData.ts` | `domains/market/` (parser/guidance harga) | MOVE | sedang | 4 | 3 |
| B23 | `backend/src/services/marketHistory.ts` | `domains/market/` | MOVE | sedang | 4 | 3 |
| B24 | `backend/src/services/priceSanity.ts` | `packages/contracts/src/domain/` (batas harga/logika) | MOVE → KONTRAK | tinggi | 5 | 4 |
| B25 | `backend/src/services/weatherAlerts.ts` | `packages/contracts/src/domain/` + `domains/weather` | SPLIT | tinggi | 5 | 4 |
| B26 | `backend/src/store/catalog.ts` | `domains/products/store.ts` | MOVE | sedang | 4 | 3 |
| B27 | `backend/src/store/knowledge.ts` | `domains/ai/store.ts` (knowledge search) | MOVE | sedang | 4 | 3 |
| B28 | `backend/src/store/marketPrices.ts` | `domains/market/store.ts` | MOVE | sedang | 4 | 3 |
| B29 | `backend/src/store/marketHistory.ts` | `domains/market/store.ts` | MOVE | sedang | 4 | 3 |
| B30 | `backend/src/store/farmerPrices.ts` | `domains/market/store.ts` | MOVE | sedang | 4 | 3 |
| B31 | `backend/src/store/priceAlerts.ts` | `domains/market/store.ts` | MOVE | sedang | 4 | 3 |
| B32 | `backend/src/store/priceChangeAlerts.ts` | `domains/market/store.ts` | MOVE | sedang | 4 | 3 |
| B33 | `backend/src/store/farms.ts` | `domains/farm/store.ts` | MOVE | sedang | 4 | 3 |
| B34 | `backend/src/store/plantings.ts` | `domains/farm/store.ts` | MOVE | sedang | 4 | 3 |
| B35 | `backend/src/store/farmActivities.ts` | `domains/farm/store.ts` | MOVE | sedang | 4 | 3 |
| B36 | `backend/src/store/pushTokens.ts` | `domains/notifications/store.ts` | MOVE | sedang | 4 | 3 |
| B37 | `backend/src/middleware/errorHandler.ts` | `server/middleware/errorHandler.ts` | MOVE | rendah | 1 | 2 |
| B38 | `backend/src/middleware/rateLimit.ts` | `server/middleware/rateLimit.ts` | MOVE | rendah | 1 | 2 |
| B39 | `backend/src/middleware/supabaseUser.ts` | `server/middleware/supabaseUser.ts` | MOVE | rendah | 1 | 2 |
| B40 | `backend/src/utils/cache.ts` | `server/utils/cache.ts` | MOVE | rendah | 1 | 2 |
| B41 | `backend/api/index.ts` | `apps/backend/api/index.ts` | MOVE | rendah | 1 | 2 |
| B42 | `backend/public/index.html` | `apps/backend/public/index.html` | MOVE | rendah | 1 | 2 |
| B43 | `backend/scripts/*` (9) | `apps/backend/scripts/*` | MOVE | rendah | 1 | 2 |
| B44 | `backend/data/*.json` (4 seed) | `domains/products/data/` atau `packages/contracts` | MOVE | sedang | 4 | 3 |
| B45 | `backend/src/tools/executors.ts` (kalkulator) | `packages/contracts/src/domain/calculator/(fertilizer|pesticide)` | MERGE (dengan mobile calc) | kritis | 6 | 4 |

---

## 3. Peta Migrasi — FRONTEND (`src/`)

| # | Sumber (sekarang) | Target | Jenis | Risiko | Urutan | Fase |
|---|---|---|---|---|---|---|
| M1 | `src/App.tsx` | `apps/mobile/App.tsx` | MOVE | rendah | 1 | 2 |
| M2 | `src/app/providers.tsx` | `apps/mobile/src/app/providers.tsx` | MOVE | sedang | 1 | 2 |
| M3 | `src/navigation/RootNavigator.tsx` | `apps/mobile/src/navigation/` | MOVE | sedang | 1 | 2 |
| M4 | `src/navigation/types.ts` | `apps/mobile/src/navigation/types.ts` | MOVE | rendah | 1 | 2 |
| M5 | `src/types/index.ts` | `packages/contracts/src/domain` (tipe bersama) | SPLIT | tinggi | 4 | 4 |
| M6 | `src/store/useAuthStore.ts` | `features/auth/useAuthStore.ts` | MOVE | sedang | 2 | 2 |
| M7 | `src/store/useSettingsStore.ts` | `features/settings/useSettingsStore.ts` | MOVE | sedang | 2 | 2 |
| M8 | `src/store/useFarmStore.ts` | `features/farm/useFarmStore.ts` | MOVE | sedang | 2 | 2 |
| M9 | `src/store/useActivityStore.ts` | `features/farm/useActivityStore.ts` | MOVE | sedang | 2 | 2 |
| M10 | `src/store/useChatStore.ts` | `features/ai/useChatStore.ts` | MOVE | sedang | 2 | 2 |
| M11 | `src/store/useProductStore.ts` | `features/products/useProductStore.ts` | SPLIT | sedang | 2 | 2 |
| M12 | `src/store/useHistoryStore.ts` | `features/history/useHistoryStore.ts` | MOVE | sedang | 2 | 2 |
| M13 | `src/services/ai/tools.ts` | `features/ai/tools.ts` + `packages/contracts/src/tools` | SPLIT | kritis | 6 | 4 |
| M14 | `src/services/ai/agent.ts` | `features/ai/agent.ts` | MOVE | tinggi | 5 | 4 |
| M15 | `src/services/api/client.ts` | `shared/api/client.ts` | MOVE | sedang | 2 | 2 |
| M16 | `src/services/supabase.ts` | `shared/api/supabase.ts` | MOVE | sedang | 2 | 2 |
| M17 | `src/services/catalogSync.ts` | `features/products/sync.ts` | MOVE | sedang | 2 | 2 |
| M18 | `src/services/farmSync.ts` | `features/farm/sync.ts` | MOVE | sedang | 2 | 2 |
| M19 | `src/services/chatSync.ts` | `features/ai/sync.ts` | MOVE | sedang | 2 | 2 |
| M20 | `src/services/kemtanSync.ts` | `features/market/sync.ts` | MOVE | sedang | 2 | 2 |
| M21 | `src/services/offline.ts` | `shared/api/offline.ts` | MOVE | sedang | 2 | 2 |
| M22 | `src/services/pushRegister.ts` | `features/profile/`/`shared` | MOVE | sedang | 2 | 2 |
| M23 | `src/services/widgetPublish.ts` | `features/market/widget.ts` | MOVE | sedang | 2 | 2 |
| M24 | `src/services/agriForecast.ts` | `features/market/` | MOVE | sedang | 2 | 2 |
| M25 | `src/services/weatherAlertService.ts` | `features/weather/alerts.ts` | MOVE | sedang | 2 | 2 |
| M26 | `src/services/weather/openMeteo.ts` | `features/weather/openMeteo.ts` | MOVE | sedang | 2 | 2 |
| M27 | `src/hooks/useWeather.ts` | `features/weather/hooks/useWeather.ts` | MOVE | sedang | 2 | 2 |
| M28 | `src/features/fertilizer/calculator.ts` | `packages/contracts/src/domain/calculator/fertilizer.ts` | MOVE → KONTRAK | kritis | 6 | 4 |
| M29 | `src/features/fertilizer/grid.ts` | `packages/contracts/src/domain/calculator/grid.ts` | MOVE → KONTRAK | kritis | 6 | 4 |
| M30 | `src/features/pesticide/calculator.ts` | `packages/contracts/src/domain/calculator/pesticide.ts` | MOVE → KONTRAK | kritis | 6 | 4 |
| M31 | `src/features/farm/helpers.ts` | `features/farm/helpers.ts` | MOVE | sedang | 2 | 2 |
| M32 | `src/constants/commodities.ts` | `packages/contracts/src/constants/commodities.ts` (hapus duplikat) | MOVE → KONTRAK | kritis | 4 | 4 |
| M33 | `src/constants/bahasa.ts` | `packages/contracts/src/constants/bahasa.ts` | MOVE → KONTRAK | sedang | 4 | 4 |
| M34 | `src/constants/bahasaDaerah.ts` | `packages/contracts/src/constants/bahasaDaerah.ts` | MOVE → KONTRAK | sedang | 4 | 4 |
| M35 | `src/constants/locale.ts` | `features/settings/` | MOVE | sedang | 2 | 2 |
| M36 | `src/constants/products.seed.ts` | `features/products/seed.ts` | MOVE | sedang | 2 | 2 |
| M37 | `src/components/*` (6) | `shared/components/` | MOVE | rendah | 1 | 2 |
| M38 | `src/utils/*` (3: date, format, resolveProvince) | `shared/utils/` | MOVE | rendah | 1 | 2 |
| M39 | `src/theme/ThemeProvider.tsx` | `shared/theme/` | MOVE | rendah | 1 | 2 |
| M40 | `src/screens/calculator/*` (5) | `features/calculator/screens/` | MOVE | sedang | 2 | 2 |
| M41 | `src/screens/farm/*` (4) | `features/farm/screens/` | MOVE | sedang | 2 | 2 |
| M42 | `src/screens/ai/AIChatScreen.tsx` | `features/ai/screens/` | MOVE | sedang | 2 | 2 |
| M43 | `src/screens/market/MarketScreen.tsx` | `features/market/screens/` | MOVE | sedang | 2 | 2 |
| M44 | `src/screens/weather/WeatherDetailScreen.tsx` | `features/weather/screens/` | MOVE | sedang | 2 | 2 |
| M45 | `src/screens/products/*` (2) | `features/products/screens/` | MOVE | sedang | 2 | 2 |
| M46 | `src/screens/auth/*` (2) | `features/auth/screens/` | MOVE | sedang | 2 | 2 |
| M47 | `src/screens/history/HistoryScreen.tsx` | `features/history/screens/` | MOVE | sedang | 2 | 2 |
| M48 | `src/screens/profile/ProfileScreen.tsx` | `features/profile/screens/` | MOVE | sedang | 2 | 2 |
| M49 | `src/screens/guide/GuideScreen.tsx` | `features/guide/screens/` | MOVE | sedang | 2 | 2 |
| M50 | `src/screens/home/HomeScreen.tsx` | `features/home/screens/` | MOVE | sedang | 2 | 2 |
| M51 | `src/screens/activity/ActivityCalendarScreen.tsx` | `features/farm/screens/` | MOVE | sedang | 2 | 2 |
| M52 | `src/widgets/android/` (MarketWidgetProvider.kt, res) | `apps/mobile/src/widgets/android/` | MOVE | rendah | 1 | 2 |
| M53 | `__tests__/calculators.test.ts` | `packages/contracts` test (kalkulator) | MOVE | sedang | 6 | 4 |

---

## 4. Peta Migrasi — SUPABASE

| # | Sumber (sekarang) | Target | Jenis | Risiko | Urutan | Fase |
|---|---|---|---|---|---|---|
| S1 | `supabase/schema.sql` | `supabase/schema.sql` (tetap, audited) | KEEP | rendah | — | 1 |
| S2 | `supabase/migrations/*` (15) | `supabase/migrations/*` (keep + tambah migrasi baru bila perlu) | KEEP | rendah | — | 1 |
| S3 | `supabase/functions/sync-kemendag/index.ts` | `supabase/functions/sync-kemendag/index.ts` → impor konstanta dari kontrak jika bisa | REWRITE (opts) | tinggi | 6 | 4 |
| S4 | `supabase/functions/sync-prices/index.ts` | sama seperti S3 (alternatif: inline hasil build kontrak) | REWRITE (opts) | tinggi | 6 | 4 |

> *Risiko tinggi karena edge function berjalan pada runtime Deno; impor lintas-paket bisa tidak langsung berhasil. Solusi cadangan: skrip build menghasilkan file inline dari `packages/contracts` (single source tetap terjaga).

---

## 5. Konsolidasi Duplikasi (yang harus DITUJU dalam fase 4)

Duplikasi paling berbahaya yang harus di-merge ke `packages/contracts`:

1. **`ToolContext` / `ToolResult`** → `backend/src/types.ts` + `src/services/ai/tools.ts` → konsolidasi di `packages/contracts/src/tools/`.
2. **Skema tool AI** → `backend/src/tools/schemas.ts` + `src/services/ai/tools.ts` → `packages/contracts/src/tools/schemas.ts`. (Backend & mobile menakutkan menghasilkan *drift* argumen tool → error di agent.)
3. **Kalkulator** → `backend/src/tools/executors.ts` + `src/features/fertilizer/calculator.ts` + `src/features/pesticide/calculator.ts` + `src/features/fertilizer/grid.ts` → `packages/contracts/src/domain/calculator/`.
4. **`commodities`** → `src/constants/commodities.ts`, `backend/src/services/commodityMatch.ts`, edge `sync-*/index.ts`.
5. **`provinces`** → `backend/src/services/provinceMatch.ts`, `market.routes.ts`, edge `sync-*`, mobile `src/utils/resolveProvince.ts`.
6. **Logika harga/batas** (`priceSanity`) + **cuaca alert** (`weatherAlerts`) → kontrak agar konsisten mobile↔backend.

---

## 6. Catatan Risiko Kritis (yang wajib diuji ekstra)

- **B18/B19/M13 (tool schemas & executors)** — paling rawan *drift*; konsolidasi ke kontrak akan mengubah cara mobile dan backend bersama-sama memanggil tool. Uji agent loop kedua sisi.
- **B20/B21 (commodities/provinces)** — kunci ID yang tidak match adalah akar bug sinkronisasi; pastikan setelah migrate, satu referensi digunakan.
- **M28–M30 (kalkulator)** — wajib mempertahankan hasil numerik identik; jalankan `__tests__/calculators.test.ts` sebelum & sesudah.
- **S3/S4 (edge functions)** — runtime Deno membatasi impor; jangan pecahkan sync Kemendag / sync prices.
