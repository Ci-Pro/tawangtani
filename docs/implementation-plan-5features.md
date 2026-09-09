# TAWANGTANI — Implementation Plan: 5 New Features

> Grounded in the current codebase (Expo SDK 50, RN 0.73.6, Zustand/AsyncStorage, Express/Supabase backend).
> Key references already inspected:
> - `src/store/useSettingsStore.ts` — persisted settings, has `locationName` + `coords`, **no `province`**
> - `src/hooks/useWeather.ts` — `useLocation()` already does `reverseGeocodeAsync()` and reads `places[0].region`
> - `src/screens/market/MarketScreen.tsx` — province from `AsyncStorage('market_province')`, default `'nasional'`
> - `src/services/kemtanSync.ts` — `PROVINCE_CODES` / `PROVINCE_LIST` (38 provinces, e.g. `'Jawa Barat'`)
> - `backend/src/services/provinceMatch.ts` — already has `normalize()` + `resolveProvince()` (free-text, async, hits market_prices)
> - `backend/src/store/priceAlerts.ts` — `PriceAlertRow`, `listActiveAlerts()`, `markAlertFired()`
> - `backend/src/routes/push.routes.ts:227` — `runPriceAlertJob()` (one-shot, deactivates after fire)
> - `src/store/useFarmStore.ts` — local AsyncStorage, **no user_id**
> - `backend/src/routes/plantings_routes.ts` + `backend/src/middleware/supabaseUser.ts` — existing auth pattern to copy for `/api/farms`
> - `src/services/weather/openMeteo.ts` — `WeatherData` (current + `daily: {temperature_2m_max/min, precipitation_sum, wind_speed_10m_max, weather_code}`), currently `forecast_days: '5'`
> - `src/services/weatherAlertService.ts` — spray-condition style logic to mirror for agri rules
> - `app.json` — `plugins` array, Android `package: com.tawangtani.app`, no widget plugin yet

---

## 1. RECOMMENDED IMPLEMENTATION ORDER

| # | Feature | Why this order | Complexity |
|---|---------|----------------|------------|
| 1 | **F1 — GPS Auto-Province** | Zero backend deps, touches only frontend + one backend helper. Unblocks better province defaults for F2/F3. | Low |
| 2 | **F5 — Agri Weather Forecast** | Pure frontend rule engine on already-fetched `WeatherData`; no backend, no DB. Independent. | Low–Med |
| 3 | **F3 — Smart Price Notifications** | New table + new branch in existing `runPriceAlertJob` cron; reuses push infra. No frontend breaking changes. | Medium |
| 4 | **F4 — Multi-User Farm Profiles** | Largest surface: SQL migration + backend CRUD + frontend store rewrite + seeding. Best done after store patterns are stable. | High |
| 5 | **F2 — Android Widget (expo-widget)** | Most complex tooling (dev client, native Glance code, EAS build). Depends on stable backend endpoints that F1/F3/F4 produce. Do last. | High |

**Serial vs parallel:**
- F1, F5, F3 can be parallelized across devs (independent code paths).
- F4 must be sequenced after F1 if you want the farm "location" to reuse the new `province` field.
- F2 must come **last** because it consumes endpoints/data shaped by F1 (province), F3 (alert toggles), F4 (farm count) and needs a production-style build to verify.

---

## 2. FEATURE-BY-FEATURE DETAIL

### FEATURE 1 — GPS Auto-Province
**Goal:** Auto-detect province from GPS reverse geocode; persist it; offer "Deteksi Otomatis" in the picker.

**Files to MODIFY:**

1. **`backend/src/services/provinceMatch.ts`** — Add exported helper:
   ```ts
   export async function resolveProvinceFromRegion(region: string): Promise<string | null>
   ```
   - Reuse private `normalize()`; region like `"Jawa Barat"` → normalize → `"jawa barat"`.
   - Because all 38 PROVINCE_LIST entries are already in `market_prices`, `resolveProvince(region)` already covers this — so `resolveProvinceFromRegion` can simply be:
     `return normalize(region) ? resolveProvince(region) : null;` with a thin doc wrapper.
   - **Note:** `resolveProvince` is async + hits Supabase. For the client side we do NOT want a network call per geocode; see frontend approach below.

2. **`src/store/useSettingsStore.ts`** — Add `province: string` (default `''`) and extend `setLocation`:
   ```ts
   setLocation: (name, lat, lon, province?: string) => void
   ```
   Persist `province` alongside `coords`. This makes `province` available app-wide (MarketScreen, widget config, farm seeding).

3. **`src/hooks/useWeather.ts`** (`useLocation` → `request`) — After reverse geocode:
   - Capture `const region = places[0]?.region ?? '';`
   - Normalize client-side to match `PROVINCE_LIST`: build a local lowercase map once (import `PROVINCE_LIST` from `kemtanSync.ts`), match `region.toLowerCase().trim()` → returns canonical `'Jawa Barat'`.
   - Pass `province` into `setLocation(name, lat, lon, province)`.
   - **Don't** call the backend `resolveProvinceFromRegion` from the client — keep geocoding offline & instant. Use `resolveProvinceFromRegion` only if a server-side confirmation is ever needed (e.g., fuzzy alias). Document this split.

4. **`src/screens/market/MarketScreen.tsx`** —
   - Add `manualProvince: boolean` flag (in component state or AsyncStorage `market_province_manual`).
   - On first mount: if `!manualProvince && settings.province`, call `setProvince(settings.province)` and write it to `market_province`.
   - In the province picker modal, prepend option **"Deteksi Otomatis"** (value `__auto__`). When selected: call `useLocation().request()`, then read `settings.province` and apply; set `manualProvince=false`.
   - `changeProvince(p)` already writes `market_province`; when user picks a real province set `manualProvince=true`.

**Files to CREATE:** none strictly required (helper added to existing module).

**Step-by-step:**
1. Extend `useSettingsStore` (field + `setLocation` signature). Update any current `setLocation` callers (only `useWeather.ts`) to the new signature.
2. Add client-side province normalizer (small util in `src/utils/province.ts` or inline in hook) mapping `region` → `PROVINCE_LIST`.
3. Wire `useLocation().request` to populate `province`.
4. Add "Deteksi Otomatis" row + first-load auto-apply in MarketScreen.
5. Add `resolveProvinceFromRegion` to backend helper (for completeness / future server use).

**Complexity:** Low. **Risk:** lowest. Main pitfall: `places[0].region` can be `undefined` or a non-province string (e.g., region returned as city) → must guard and fall back to `''` (keep `nasional`). Also `PROVINCE_LIST` keys are title-case ('Jawa Barat') while `market_prices.province` is lowercase slug ('jawa barat') — keep frontend `province` in title-case for display + pass lowercased to API (MarketScreen already `encodeURIComponent(p)` and backend normalizes).

---

### FEATURE 5 — Agricultural Weather Forecast (Prakiraan Pertanian)
**Goal:** 7-day rule engine → prioritized farming recommendations card on HomeScreen.

**Files to CREATE:**

1. **`src/services/agriForecast.ts`** — Pure rule engine:
   - Input: `WeatherData` (use existing type from `@/types` / `openMeteo.ts`).
   - Bump Open-Meteo `forecast_days` from `'5'` → `'7'` in `openMeteo.ts` so a full week is available (verify payload shape unchanged).
   - Define `type AgriRec = { id: string; severity: 'info'|'warning'|'urgent'; title: string; body: string; rank: number }`.
   - Rules (mirror severity style of `weatherAlertService.ts`):
     - Rain today `daily.precipitation_sum[0] > 2` → "Hindari penyemprotan hari ini — hujan diprediksi" (urgent)
     - Temp today `daily.temperature_2m_max[0] > 35` → "Kondisi panas ekstrem — siram di pagi/sore" (warning)
     - Wind today `daily.wind_speed_10m_max[0] > 20` → "Angin kencang — tunda penyemprotan" (warning)
     - Low rain today + moderate temp (e.g. `precipitation_sum[0] < 0.5 && temp_max between 22–32`) → "Hari ini cocok untuk menyiram" (info)
     - Cumulative next-7d rain `sum(precipitation_sum) > 30` → "Pekan depan hujan — siapkan drainase" (warning)
     - Harvest window: optional param `harvestDate?` (from active farm crop) → if a dry 3-day window occurs within ±5 days of harvest, emit "Jadwal panen: kondisi cuaca mendukung" (info)
   - Sort by `rank`/severity, return **max 3–4** items.

2. **HomeScreen card** — new component **`src/components/agri/PrakiraanPertanianCard.tsx`** (create) that calls `generateAgriForecast(weatherData, { harvestDate })` and renders the list.

**Files to MODIFY:**

3. **`src/services/weather/openMeteo.ts`** — change `forecast_days: '5'` → `'7'` (and confirm `WeatherData`/`OpenMeteoResponse.daily` already captures the needed fields — it does).
4. **HomeScreen** (`src/screens/.../HomeScreen.tsx` — locate via `src/screens`) — below the existing weather card, render `<PrakiraanPertanianCard data={weather} harvestDate={...} />`. Pull `harvestDate` from active farm crop (F4) when available, else omit.

**Step-by-step:**
1. Extend forecast_days to 7.
2. Write `agriForecast.ts` with unit-testable pure functions (no React).
3. Build the card component.
4. Mount card on HomeScreen under weather card.

**Complexity:** Low–Medium (mostly pure logic + UI). **Risk:** Low. Main pitfall: changing `forecast_days` to 7 slightly increases payload/cache size (cache TTL already 30 min — fine). Edge: `daily` arrays may be shorter than 7 on partial data → guard array access with `?.` and length checks.

---

### FEATURE 3 — Smart Price Notifications (>5% change)
**Goal:** Recurring %-change alerts alongside existing one-shot threshold alerts.

**Files to CREATE:**

1. **`supabase/migrations/migration_010_price_change_alerts.sql`**
   ```sql
   create table price_change_alerts (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     commodity text not null,
     province text not null,
     level int not null default 3,
     last_notified_price numeric not null,
     threshold_pct numeric not null default 5,
     active boolean not null default true,
     expo_push_token text,
     created_at timestamptz not null default now()
   );
   alter table price_change_alerts enable row level security;
   create policy "owner" on price_change_alerts
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create index on price_change_alerts (active, commodity, province, level);
   ```

**Files to MODIFY:**

2. **`backend/src/store/priceAlerts.ts`** — Add:
   - `PriceChangeAlertRow` interface.
   - `upsertPriceChangeAlert(row)`, `listMyChangeAlerts(userId)`, `listActiveChangeAlerts()`, `updateChangeAlertLastPrice(id, price)`, `deactivateChangeAlert(userId,id)`.

3. **`backend/src/routes/push.routes.ts`** — In `runPriceAlertJob()`:
   - After existing one-shot loop, **append** a second loop over `listActiveChangeAlerts()`:
     - Build `priceMap` keyed `commodity|province|level` (reuse existing map).
     - For each: `changePct = (price - last_notified_price)/last_notified_price * 100` (guard divide-by-zero / null → skip).
     - If `Math.abs(changePct) >= threshold_pct`: send push "Harga {commodity} {naik/turun} {abs}%, sekarang Rp{price}" and `updateChangeAlertLastPrice(id, price)`. **Do NOT deactivate** (recurring).
   - Add `POST/GET/DELETE /api/.../price-change-alerts` routes (or extend push router) behind `supabaseUser` middleware (auth pattern from `plantings_routes.ts`).

4. **`src/screens/market/MarketScreen.tsx`** — Alarm section:
   - New per-commodity toggle "Beritahu saya jika harga berubah >5%" bound to a `price_change_alerts` row (POST on enable, DELETE on disable, GET on mount to reflect state).
   - Surface `expo_push_token` (already collected via push store) when enabling.

**Step-by-step:**
1. SQL migration → apply to Supabase (and add to migration runner if one exists in `supabase/`).
2. Backend store functions.
3. Backend job loop + routes (backward compatible: one-shot path untouched).
4. Frontend toggle UI + API wiring.

**Complexity:** Medium. **Risk:** Medium. Pitfalls:
- **Notification fatigue:** recurring alerts fire every cron tick once threshold crossed until price reverts — add a cooldown (e.g., only update `last_notified_price` and re-arm; consider a `min_notify_interval_hours` to avoid daily spam). Recommend a 24h cooldown so it fires ~once/day.
- `last_notified_price` must be initialized to **current** price at subscribe time, else an immediate fire on first cron.
- Keep one-shot `price_alerts` fully intact (don't refactor shared code that could regress it).

---

### FEATURE 4 — Multi-User Farm Profiles (Supabase)
**Goal:** Move farm/crop data server-side, per-user, RLS-protected, with local→server seed.

**Files to CREATE:**

1. **`supabase/migrations/migration_011_farm_profiles.sql`**
   ```sql
   create table farms (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     name text not null,
     area_value numeric,
     area_unit text,
     location text,
     created_at timestamptz not null default now()
   );
   create table farm_crops (
     id uuid primary key default gen_random_uuid(),
     farm_id uuid references farms on delete cascade not null,
     user_id uuid references auth.users not null,
     name text not null,
     planted_date date,
     harvest_date date,
     area_value numeric,
     area_unit text,
     status text default 'aktif',
     created_at timestamptz not null default now()
   );
   alter table farms enable row level security;
   alter table farm_crops enable row level security;
   -- policies: using (auth.uid()=user_id) ...
   create index on farm_crops (user_id, farm_id);
   ```

2. **`backend/src/routes/farms_routes.ts`** — Copy `plantings_routes.ts` middleware/auth shape (`supabaseUser`):
   - `GET /api/farms`, `POST /api/farms`, `PATCH /api/farms/:id`, `DELETE /api/farms/:id`
   - `GET/POST /api/farms/:id/crops`, `PATCH/DELETE /api/farms/:id/crops/:cropId`
   - Use Supabase REST or `supabase-js` client; enforce `user_id` from JWT.

3. **`src/services/farmApi.ts`** (create) — client wrappers: `listFarms()`, `createFarm()`, `updateFarm()`, `deleteFarm()`, `listCrops()`, `addCrop()`, `updateCrop()`, `removeCrop()`. All read `useAuthStore.getState().session` token + `backendUrl`.

4. **`src/store/useFarmStore.ts`** (rewrite) — Replace AsyncStorage persistence with API-backed store:
   - Keep the **same public action names** (`addFarm`, `updateFarm`, `removeFarm`, `addCrop`, `updateCrop`, `removeCrop`, `setActiveFarm`) so `FarmListScreen`, `FarmFormScreen`, `PlantingsScreen` don't break.
   - Internally: actions call `farmApi.*` then refresh `farms` from `GET /api/farms`. Keep `activeFarmId` in AsyncStorage (device preference, not server).
   - On **first login after update**: if server farms empty AND local `twt-farms` (old AsyncStorage) has data → seed via POST loop, then clear local. Provide `seedFromLocal()` called once from auth/login flow.

**Files to MODIFY:**
- `backend/src/index.ts` (or routes index) — `app.use('/api/farms', farmsRouter)`.
- `src/store/useFarmStore.ts` — full rewrite (above).
- `src/store/useAuthStore.ts` or login screen — invoke `seedFromLocal()` once after first successful auth post-update.
- Possibly `src/screens/farm/*` if they read store shape directly (verify they use actions only — they do, per current store).

**Step-by-step:**
1. SQL migration + RLS.
2. Backend CRUD router (mirror plantings).
3. `farmApi.ts` client.
4. Rewrite `useFarmStore` to API-backed, preserving action signatures.
5. Seed logic from local AsyncStorage on first post-update login.
6. Wire router into `index.ts`; smoke-test CRUD with a JWT.

**Complexity:** High. **Risk:** High. Pitfalls:
- **Breaking change surface:** many farm screens depend on the store. By preserving action signatures and keeping `Farm`/`Crop` types identical, risk is contained — but must grep all `useFarmStore` consumers.
- **Race during seed:** concurrent logins / offline → dedupe by checking server emptiness inside a transaction-like guard; idempotent POSTs.
- **Offline:** API-backed store loses offline editing. Decide whether to keep a thin local cache for read; out of scope but note it.
- **RLS correctness:** a missing policy lets users see others' farms — test with two user JWTs.

---

### FEATURE 2 — Android Widget (expo-widget)
**Goal:** Glance widget: weather + top-3 commodity prices; 30-min refresh; tap → MarketScreen.

**Files to CREATE:**

1. **`src/widgets/`** directory:
   - `src/widgets/Widget.kt` (Glance `GlanceAppWidget` + `GlanceAppWidgetReceiver`) — layout: weather icon + temp, 3 rows commodity|price. Tap `PendingIntent` → deep link `expo:///market` (or `{scheme}://market`).
   - `src/widgets/WidgetData.kt` — `AppWidgetManager` update logic.
   - `src/widgets/dataSource.ts` — JS side: fetch top-3 from `${backendUrl}/api/market/prices?province=...&level=3` + weather from Open-Meteo, write to `AppStorage`/`SharedPreferences` the widget reads.
   - `src/widgets/config.ts` — widget config constants (refresh 30 min, bundle id).

2. **`src/widgets/android/`** native glue if required by the plugin (follow `expo-widget` README; it generates `expo/modules` + Kotlin).

**Files to MODIFY:**

3. **`app.json`** — add plugin:
   ```json
   "plugins": [ ..., ["expo-widget", { "widgets": [{ "name": "TawangtaniWidget", "package": "com.tawangtani.app.widget" }] }] ]
   ```
   (exact config keys per expo-widget docs — verify against installed version).
4. **`package.json`** — add `expo-widget` dependency; `eas.json` may need build profile update.
5. **`src/screens/market/MarketScreen.tsx`** — accept deep-link param to open directly at province (ties into F1 `province`).

**Step-by-step:**
1. `npx expo install expo-widget`; configure `app.json`.
2. Generate widget module scaffold; implement Kotlin Glance UI + tap intent.
3. Implement JS `dataSource.ts` (independent fetch: backend + Open-Meteo, no React context).
4. Schedule 30-min periodic update (`WorkManager`/Glance `GlanceAppWidget`'s `onUpdate` + `PeriodicWorkRequest`).
5. Build **dev client** to develop, **EAS Build** (android) to ship.
6. Wire deep link → MarketScreen.

**Complexity:** High (native + tooling). **Risk:** Highest. Pitfalls:
- **Dev client mandatory:** widget won't run in Expo Go; must `eas build --profile development` and install dev client. Blocks iterative testing.
- **Data independence:** widget process has no access to Zustand/AsyncStorage store — must re-fetch via direct `fetch` (already planned). Needs `backendUrl` + province; persist those in `SharedPreferences`/AppStorage set by the app, or hardcode backend URL from `EXPO_PUBLIC_BACKEND_URL`.
- **Province source:** prefer the F1 `province` (write it to shared storage on change) so the widget shows the user's province.
- **Auth for market data:** widget fetch must use a public/read endpoint (market prices are already public in `market.routes.ts`) — confirm no auth needed; weather is public Open-Meteo.
- **Android-only:** expo-widget Android uses Glance (Android 12+); document min-SDK caveat.

---

## 3. DEPENDENCY ANALYSIS

```
F1 (GPS Province) ──┬──> informs F2 widget province source
                    ├──> can enrich F4 farm "location"
                    └──> better default for F3 alert province

F5 (Agri Forecast) ── independent (uses existing WeatherData)

F3 (Smart Notify) ── independent backend; consumes market API (exists)
                    └── toggle UI lives in F1-adjacent MarketScreen

F4 (Farms) ── independent; optionally reads F1 province for farm.location
             └── F5 can use F4 active crop harvestDate for harvest-window rule

F2 (Widget) ── DEPENDS ON: F1 (province in shared storage),
                          F3 (alert toggle state if widget shows alerts - optional),
                          F4 (farm count - optional),
                          stable backend endpoints.
             └── MUST be last.
```

- **No hard cross-feature blockers** except F2→(F1,F3,F4). F1, F3, F5 can start immediately and in parallel.
- F4 is the only feature touching the **data model + store rewrite** with broad UI impact; schedule it when a backend+frontend owner is free, and do it behind the preserved store interface to avoid cascading screen changes.

## 4. CROSS-CUTTING / SHARED NOTES
- **Province representation:** standardize — store title-case (`'Jawa Barat'`) in Zustand/UI, lowercase slug (`'jawa barat'`) at API/DB boundary. `PROVINCE_LIST` (title-case) and `market_prices.province` (lowercase) already reflect this split; keep it consistent in F1/F2.
- **Migrations:** add `migration_010` (F3) and `migration_011` (F4) to `supabase/migrations/` and apply via Supabase CLI / your deploy pipeline; ensure idempotent (`create table if not exists`, guard policies).
- **Auth:** every new backend route uses `supabaseUser` middleware (copied from `plantings_routes.ts`); `price_change_alerts` and `farms`/`farm_crops` must carry `user_id` from the verified JWT, never client-supplied.
- **Testing order per feature:** unit-test pure logic first (`agriForecast.ts` rules, `resolveProvinceFromRegion`, province normalizer), then integration (backend routes with JWT), then UI.
