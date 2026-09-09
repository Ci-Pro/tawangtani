# File Inventory

Snapshot of the TAWANGTANI monorepo at audit time. Lists every tracked source file (excluding `node_modules`, `.expo`, `.git`, and Supabase CLI temp state) grouped by layer, with a one-line responsibility note and any obvious redundancy/dead-code markers. This is a **record of the current state** — not the target state (see `docs/architecture/target-architecture.md`).

Scope note: the repo mixes a React Native/Expo mobile app (root `src/`), an Express/Vercel backend (`backend/`), Supabase schema + edge functions (`supabase/`), native Android widget code (`src/widgets/`), and automation scripts (`scripts/`, `backend/scripts/`).

---

## 1. Root configuration

| File | Purpose |
|---|---|
| `App.tsx` | Root React Native component; wires providers + navigation. |
| `index.js` | Entry point; registers the root component with `expo`. |
| `app.json` | Expo app config (name, slug, notification channels, plugins). |
| `package.json` | Mobile dependencies + scripts (`jest`, lint, `typecheck`). |
| `babel.config.js` | Babel config (path aliases `@/`). |
| `tsconfig.json` | Root TypeScript config (path alias `@/*` → `src/*`). |
| `eas.json` | EAS build profiles for Android/iOS. |
| `jest.setup.js` | Jest setup (mocks, polyfills). |
| `scripts/generate-assets.js` | Asset generation helper for icons/splash. |

---

## 2. Mobile application source (`src/`)

### 2.1 Navigation
| File | Purpose |
|---|---|
| `src/navigation/RootNavigator.tsx` | Root stack navigation: auth vs main flow. |
| `src/navigation/types.ts` | Route param list type for the navigator. |

### 2.2 App bootstrap / providers
| File | Purpose |
|---|---|
| `src/app/providers.tsx` | Composes theme + all zustand store providers. |

### 2.3 Feature logic (pure, no I/O)
| File | Purpose |
|---|---|
| `src/features/fertilizer/calculator.ts` | Pure fertilizer dose calculator (`calcFertilizer`). |
| `src/features/pesticide/calculator.ts` | Pure pesticide tank/dose calculator (`calcPesticide`). |
| `src/features/farm/helpers.ts` | Farm/crop helper logic (labels, stage mapping). |
| `src/features/fertilizer/grid.ts` | Grid (petak) subdivision logic for fertilizer. |

### 2.4 Services (I/O adapters + orchestration)
| File | Purpose |
|---|---|
| `src/services/supabase.ts` | Supabase client singleton + auth helpers. |
| `src/services/api/client.ts` | HTTP client: `getBackendUrl`, `getJson`, `postJson`, network guard. |
| `src/services/farmSync.ts` | Farm create/update sync to backend `/api/farms` + `/api/farms/seed`. |
| `src/services/chatSync.ts` | Chat history sync to `/api/chat/sync`. |
| `src/services/catalogSync.ts` | Product catalog pull from `/api/products` (6h throttle). |
| `src/services/agriForecast.ts` | (Weather) forecast helper used by home/agri flows. |
| `src/services/offline.ts` | Offline/queue management for sync-on-reconnect. |
| `src/services/pushRegister.ts` | Expo push token registration to `/api/push/register`. |
| `src/services/widgetPublish.ts` | Publishes price widget data to local storage/Android widget. |
| `src/services/weatherAlertService.ts` | Backs weather alerts (`/api/push/weather-alerts?lat=&lon=`). |
| `src/services/kemtanSync.ts` | Mobile end of the Kemtan price sync (province codes, throttling). |
| `src/services/ai/agent.ts` | Agent orchestration: `runAgent`, `runVisionAgent`, `runOfflineAgent`. |
| `src/services/ai/tools.ts` | Client tool registry `TOOLS` + `executeTool` implementations. |
| `src/services/weather/openMeteo.ts` | Open-Meteo fetch, describe weather code, spray-condition logic (30min TTL). |

### 2.5 State stores (zustand)
| File | Purpose |
|---|---|
| `src/store/useAuthStore.ts` | Auth/session state + actions. |
| `src/store/useFarmStore.ts` | Farm list + chosen farm state. |
| `src/store/useChatStore.ts` | Chat sessions/messages state. |
| `src/store/useHistoryStore.ts` | Calculator history; persisted key `twt-history`. |
| `src/store/useProductStore.ts` | Product catalog state. |
| `src/store/useActivityStore.ts` | Farm activity + reminders state. |
| `src/store/useSettingsStore.ts` | Settings (incl. locale); persisted key `twt-settings`. |

### 2.6 Screens
| File | Purpose |
|---|---|
| `src/screens/activity/ActivityCalendarScreen.tsx` | Activity calendar view. |
| `src/screens/ai/AIChatScreen.tsx` | Tani AI chat UI. |
| `src/screens/auth/LoginScreen.tsx` | Login. |
| `src/screens/auth/SignupScreen.tsx` | Signup. |
| `src/screens/calculator/CalculatorHomeScreen.tsx` | Calculator hub. |
| `src/screens/calculator/FertilizerCalculatorScreen.tsx` | Fertilizer calc UI. |
| `src/screens/calculator/GridCalculatorScreen.tsx` | Grid calc UI. |
| `src/screens/calculator/PesticideCalculatorScreen.tsx` | Pesticide calc UI. |
| `src/screens/calculator/UnitConverterScreen.tsx` | Unit converter UI. |
| `src/screens/farm/ActivitiesScreen.tsx` | Farm activity list + reminder entry. |
| `src/screens/farm/FarmFormScreen.tsx` | Farm create/edit form. |
| `src/screens/farm/FarmListScreen.tsx` | Farm list. |
| `src/screens/farm/PlantingsScreen.tsx` | Plantings (tanaman) list. |
| `src/screens/guide/GuideScreen.tsx` | Farming guide content. |
| `src/screens/history/HistoryScreen.tsx` | Calculator history list. |
| `src/screens/home/HomeScreen.tsx` | Home dashboard. |
| `src/screens/market/MarketScreen.tsx` | Market price viewer. |
| `src/screens/products/ProductDetailScreen.tsx` | Product detail. |
| `src/screens/products/ProductListScreen.tsx` | Product list. |
| `src/screens/profile/ProfileScreen.tsx` | Profile + backend URL setting. |
| `src/screens/weather/WeatherDetailScreen.tsx` | Weather detail + spray advice. |

### 2.7 Shared components
| File | Purpose |
|---|---|
| `src/components/Button.tsx` | Button. |
| `src/components/Card.tsx` | Card. |
| `src/components/FadeIn.tsx` | Fade-in animation wrapper. |
| `src/components/Input.tsx` | Text input. |
| `src/components/PriceChart.tsx` | Price trend chart. |
| `src/components/Screen.tsx` | Screen container/safe area wrapper. |

### 2.8 Constants / labels
| File | Purpose |
|---|---|
| `src/constants/commodities.ts` | Commodity list + labels (`COMMODITY_LABELS`), market levels. |
| `src/constants/locale.ts` | Locale config. |
| `src/constants/bahasa.ts` | Indonesian UI strings. |
| `src/constants/bahasaDaerah.ts` | Regional-language strings. |
| `src/constants/products.seed.ts` | Seed product catalog used by product store (client fallback). |

### 2.9 Types / utils / theme
| File | Purpose |
|---|---|
| `src/types/index.ts` | Central mobile domain + DTO types (see `type-audit.md`). |
| `src/utils/format.ts` | Area units, `uid`, `fmtNum`, `parseIdNumber`, area converters. |
| `src/utils/date.ts` | Date helpers, `todayISO`. |
| `src/utils/resolveProvince.ts` | Resolve province name/alias normalization. |
| `src/hooks/useWeather.ts` | Weather hook. |
| `src/theme/ThemeProvider.tsx` | Theme provider + palette. |

### 2.10 Native widget (Android)
| File | Purpose |
|---|---|
| `src/widgets/android/src/main/java/package_name/MarketWidgetProvider.kt` | Android home-screen widget provider (market price). |
| `src/widgets/android/src/res/layout/market_widget.xml` | Widget layout. |
| `src/widgets/android/src/res/xml/market_widget_info.xml` | Widget metadata. |
| `src/widgets/android/src/res/values/strings.xml` | Widget strings. |

---

## 3. Backend (`backend/`)

### 3.1 Entry / wiring
| File | Purpose |
|---|---|
| `backend/src/app.ts` | Express app builder; mounts all routers. |
| `backend/src/index.ts` | Server bootstrap (imports `createApp`). |
| `backend/src/config.ts` | Env config (keys, model names, limits, admin token). |
| `backend/src/types.ts` | Backend-only API types (`ChatMessageIn`, `ToolContext`, `ToolCallOut`, `ToolResult`). |
| `backend/api/index.ts` | Vercel serverless entry (exports app). |
| `backend/vercel.json` | Vercel config: `outputDirectory`, rewrites, cron (`0 1 * * *` → weather push). |
| `backend/package.json` | Backend deps + scripts (`dev`, `build`, `start`, `seed:*`). |
| `backend/public/index.html` | Static admin landing page (served at `/admin`). |

### 3.2 Middleware
| File | Purpose |
|---|---|
| `backend/src/middleware/errorHandler.ts` | Central error handler. |
| `backend/src/middleware/supabaseUser.ts` | `SbUser`, `userFromHeader`, `requireSupabaseUser`, `optionalSupabaseUser`. |
| `backend/src/middleware/rateLimit.ts` | `aiLimiter`, `pushLimiter`, `authLimiter`, `userAiQuota`. |

### 3.3 Routes
| File | Purpose |
|---|---|
| `backend/src/routes/ai.routes.ts` | `POST /ai/chat`, `POST /ai/vision`, `GET /ai/status`; daily AI quota. |
| `backend/src/routes/products.routes.ts` | `GET /api/products`, `PUT /api/products` (x-admin-token). |
| `backend/src/routes/chat.routes.ts` | `POST /api/chat/sync` (delete-then-insert, ≤200 msgs). |
| `backend/src/routes/push.routes.ts` | `POST /api/push/register`, weather-alerts, cron weather-push. |
| `backend/src/routes/market.routes.ts` | Market price list/upsert/insights/history/farmer prices. |
| `backend/src/routes/plantings.routes.ts` | Plantings CRUD with validation. |
| `backend/src/routes/farms.routes.ts` | Farms CRUD + `/crops`, `POST /seed`. |
| `backend/src/routes/admin.routes.ts` | Admin summary (x-admin-token). |
| `backend/src/routes/adminPage.ts` | Renders the `/admin` HTML page. |

### 3.4 Services (business logic)
| File | Purpose |
|---|---|
| `backend/src/services/agent.ts` | Server-side tool-using agent loop (MAX_ITERATIONS=7). |
| `backend/src/services/openrouter.ts` | OpenRouter provider abstraction (`gemini` + `openrouter`), vision. |
| `backend/src/services/structured.ts` | `parseDiagnosis`, `extractJsonObject`, `DiagnosisStructured`. |
| `backend/src/services/tokenBudget.ts` | Token estimate + message budget pruning. |
| `backend/src/services/weatherAlerts.ts` | Weather alert fetch/threshold classification. |
| `backend/src/services/marketData.ts` | `PriceView`, `toView`, `SOURCE_LABEL`, `guidanceFor`. |
| `backend/src/services/priceSanity.ts` | `PRICE_LIMITS` sanity ranges per commodity. |
| `backend/src/services/commodityMatch.ts` | Commodity `SYNONYMS` map. |
| `backend/src/services/provinceMatch.ts` | Province `ALIASES` map. |
| `backend/src/services/marketHistory.ts` | Market history service logic. |

### 3.5 Stores (data-access layer)
| File | Purpose |
|---|---|
| `backend/src/store/catalog.ts` | Load/save catalog; fallback to seed. |
| `backend/src/store/knowledge.ts` | KB chunks, load, headers, 10min cache; `logAiQuery`, quota. |
| `backend/src/store/marketPrices.ts` | Market prices + province pagination. |
| `backend/src/store/marketHistory.ts` | History upsert/query. |
| `backend/src/store/plantings.ts` | Plantings CRUD + reminder queries. |
| `backend/src/store/priceAlerts.ts` | `upsertPriceAlert` (on_conflict). |
| `backend/src/store/priceChangeAlerts.ts` | `upsertPriceChangeAlert` (on_conflict). |
| `backend/src/store/pushTokens.ts` | Push token upsert/list, expo send, campaign log. |
| `backend/src/store/farmerPrices.ts` | Farmer-submitted prices + moderation. |
| `backend/src/store/farms.ts` | Farms + `farm_crops` CRUD, seed. |
| `backend/src/store/farmActivities.ts` | Farm activity insert/log. |

### 3.6 Tools (AI tool contracts + executors)
| File | Purpose |
|---|---|
| `backend/src/tools/schemas.ts` | `TOOL_SCHEMAS` (OpenAI-style), `validateToolArgs`. |
| `backend/src/tools/executors.ts` | `executeTool`: get_weather, fertilizer/pesticide, product_search, farm_context, market_price, activity_log, search_knowledge. |

### 3.7 Utils
| File | Purpose |
|---|---|
| `backend/src/utils/cache.ts` | `cacheGet`/`cacheSet`/`cached`/`cacheClear` (in-memory TTL). |

### 3.8 Seed data
| File | Purpose |
|---|---|
| `backend/src/data/knowledge.seed.json` | KB seed articles (part 1). |
| `backend/src/data/knowledge.seed.part2.json` | KB seed articles (part 2). |
| `backend/src/data/market.seed.json` | Seed market prices. |
| `backend/src/data/products.seed.json` | Seed product catalog. |

### 3.9 Backend scripts
| File | Purpose |
|---|---|
| `backend/scripts/sync-kemendag.mjs` | Kemendag price sync script (VARIANT_MAP). |
| `backend/scripts/sync-prices.mjs` | Kemtan `panelharga` sync script. |
| `backend/scripts/sanitize-prices.mjs` | Sanitize/clean prices (LIMITS copy of `priceSanity`). |
| `backend/scripts/seed-market.ts` | Seed market data. |
| `backend/scripts/backfill-provinces.ts` | Backfill province list. |
| `backend/scripts/backfill-market-history.ts` | Backfill synthetic 90-day history (mulberry32 PRNG). |
| `backend/scripts/seed-knowledge.ts` | Seed knowledge base. |
| `backend/scripts/embed-knowledge.mjs` | Embed KB chunks (gemini-embedding-001, DIM=768). |
| `backend/scripts/e2e.mjs` | End-to-end smoke test against deployed backend. |
| `backend/scripts/eval-ai.ts` | AI evaluation harness (GOLD cases, 70% threshold). |
| `backend/scripts/check-admin.mjs` | Syntax sanity check for admin HTML. |

---

## 4. Supabase (`supabase/`)

### 4.1 Schema
| File | Purpose |
|---|---|
| `supabase/schema.sql` | Full canonical schema (all tables + RLS). |

### 4.2 Migrations (numbered)
| File | Purpose |
|---|---|
| `supabase/migration_002_knowledge.sql` | Knowledge docs/chunks. |
| `supabase/migration_003_push.sql` | Push tokens. |
| `supabase/migration_004_market.sql` | Market prices. |
| `supabase/migration_005_market_history.sql` | Market price history. |
| `supabase/migration_006_kb_search.sql` | KB FTS + trgm search. |
| `supabase/migration_007_market_levels.sql` | Market levels. |
| `supabase/migration_008_farmer_alerts.sql` | Farmer prices + price alerts. |
| `supabase/migration_009_plantings.sql` | Plantings + reminder. |
| `supabase/migration_010_price_change_alerts.sql` | Price change alerts. |
| `supabase/migration_011_farm_profiles.sql` | Farms + farm_crops. |
| `supabase/migration_012_ai_logs.sql` | AI query log. |
| `supabase/migration_013_kb_vector.sql` | KB vector(768) embedding. |
| `supabase/migration_014_farm_activities.sql` | Farm activities. |

### 4.3 Migrations (timestamped — alternate set)
| File | Purpose |
|---|---|
| `supabase/migrations/20260827000000_price_change_alerts.sql` | (duplicate of migration_010) |
| `supabase/migrations/20260827010000_farm_profiles.sql` | (duplicate of migration_011) |
| `supabase/migrations/20260827020000_ai_logs.sql` | (duplicate of migration_012) |
| `supabase/migrations/20260827030000_kb_vector.sql` | (duplicate of migration_013) |
| `supabase/migrations/20260827040000_farm_activities.sql` | (duplicate of migration_014) |
| `supabase/migrations/20260829060000_admin_ops.sql` | Admin ops: `moderation_note`, `moderated_at` on farmer_prices, `push_campaign_log`. |

> ⚠️ **Duplicate migration sets.** `supabase/migration_0xx_*.sql` and `supabase/migrations/2026..._*.sql` cover largely the same schema (010↔20260827000000, etc.). Two naming conventions exist; keeping both is a maintenance hazard (see `dangerous tax` in migration-map). `20260829060000_admin_ops.sql` has no `migration_0xx` counterpart and is the only one carrying the admin-ops delta.

### 4.4 Edge functions
| File | Purpose |
|---|---|
| `supabase/functions/sync-kemendag/index.ts` | Edge function variant of Kemendag sync (VARIANT_MAP). |
| `supabase/functions/sync-prices/index.ts` | Edge function variant of Kemtan sync (COMMODITY_DEFS). |

> ⚠️ **Parallel price sync implementations.** The sync logic exists in three places: `backend/scripts/sync-prices.mjs`, `backend/scripts/sync-kemendag.mjs`, **and** the two Supabase edge functions `supabase/functions/sync-prices/index.ts` / `sync-kemendag/index.ts`. The edge-function copies are self-contained and duplicate the commodity/province maps used by the backend scripts. A shared-contract refactor should consolidate these (per `target-architecture.md`).

---

## 5. Documentation
| File | Purpose |
|---|---|
| `docs/implementation-plan-5features.md` | Feature implementation plan. |
| `docs/architecture/migration-map.md` | Migration map (target movement plan). |
| `docs/architecture/target-architecture.md` | Target architecture definition. |
| `docs/architecture/priority.md` | Prioritized issue classification. |
| `docs/architecture/safe-refactor-order.md` | Safe refactor execution order. |
| `docs/audit/` | This document set (current-state audits). |

---

## 6. Known duplication / drift hotspots (summary)

These are the highest-signal items surfaced by the file inventory that the other audit docs elaborate on:

1. **Client vs server tool registries diverge** — `src/services/ai/tools.ts` (`TOOLS`, 6 tools) vs `backend/src/tools/schemas.ts` (`TOOL_SCHEMAS`, 8 tools incl. `search_knowledge` & `market_price`).
2. **Client agent expects a `tool_calls` loop that the backend never returns** — `src/services/ai/agent.ts` `runBackendAgent` vs `backend/src/services/agent.ts` (server-side loop). See `api-contract-audit.md`.
3. **Types duplicated across layers** — mobile `src/types/index.ts`, backend `backend/src/types.ts`, tool contracts in `schemas.ts`/`executors.ts`, and DB columns — with no shared package. See `type-audit.md`.
4. **Price sync logic triplicated** — backend scripts + two Supabase edge functions, each with its own copy of commodity/province maps and a separate REST API target (`kemendag` vs `kemtan`).
5. **Two migration naming conventions** that cover overlapping schema (`migration_0xx_*` vs `migrations/2026*_*`).
6. **`activity_log` duplicated** — implemented in both client tools and backend executors with different semantics (client writes via zustand `useActivityStore`; backend writes to `farm_activities` table).
