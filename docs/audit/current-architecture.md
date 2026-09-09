# Current Architecture

A documented-as-is architecture of the TAWANGTANI system: what layers exist today, how they connect, where data flows, and the primary structural pain points. This describes the **current state**; the intended end state is described in `docs/architecture/target-architecture.md`, and the step-by-step movement in `docs/architecture/migration-map.md`.

---

## 1. System at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Mobile App (React Native / Expo)                 │
│   src/                                                                  │
│   ├─ navigation/  → tabs (Home·AI·Kalkulator·Lahan·Profil) + stack      │
│   ├─ screens/     → 21 screens per feature                              │
│   ├─ features/    → pure calculators (fertilizer/pesticide/grid)        │
│   ├─ store/       → 7 zustand stores (2 persisted)                      │
│   ├─ services/    → I/O adapters (supabase, http, sync, weather, AI)    │
│   ├─ components/  → shared UI                                           │
│   ├─ types/       → central mobile types                                │
│   └─ widgets/     → Android market-price home widget                    │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Backend (Express → Vercel serverless)   backend/           │
│   app.ts mounts: /ai · /api/ai · /api/products · /api/chat · /api/push  │
│                  /api/market · /api/plantings · /api/farms · /api/admin  │
│   services/ (AI agent, weather alerts, market data, matching)           │
│   tools/    (AI tool schemas + executors)                               │
│   store/    (data-access: supabase queries)                             │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ service_role key
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Supabase (Postgres + Auth + Edge Functions)           │
│   schema.sql + migrations (products, KB, market, plantings, farms, ...) │
│   functions/sync-prices · sync-kemendag (price sync edge functions)     │
└─────────────────────────────────────────────────────────────────────────┘

External:
  · OpenRouter / Gemini (LLM providers)        ← backend AI agent
  · Open-Meteo (weather)                       ← mobile + backend weather
  · Kemtan panelharga / Kemendag API           ← price sync (backend scripts + edge functions)
  · Expo push notifications                    ← backend
```

---

## 2. Deployment topology

| Slot | Tech | Entry |
|---|---|---|
| Mobile | React Native + Expo, zustand, @react-navigation | `App.tsx` → `RootNavigator` |
| Backend | Express on Vercel serverless | `backend/api/index.ts` → `createApp()` |
| Backend (local/dev) | `tsx watch` (tsx), build via `tsc` | `backend/src/index.ts` |
| Database | Supabase (Postgres) + Auth + RLS | `supabase/schema.sql` + migrations |
| Edge functions | Supabase Functions (Deno) | `supabase/functions/*` |
| Android widget | Native Kotlin, no network | reads locally-published widget data |
| Automation | Node scripts (`.mjs`/`.ts`) | `backend/scripts/*`, `scripts/*` |
| Cron | Vercel cron `0 1 * * *` | `/api/push/cron/weather-push` |

**Backend URL resolution (mobile):** `getBackendUrl()` in `src/services/api/client.ts` reads a user-configured backend URL (set in Profile) and falls back to a default. When no backend URL is set, the app runs offline-capable paths (`runOfflineAgent`, local product seed, Supabase direct).

---

## 3. Mobile app architecture

### 3.1 Navigation structure
- **Auth gate:** `useAuthStore.user` decides whether the root stack shows Auth (`Login`/`Signup`) or Main.
- **Main = 5 tabs:** `Home`, `AI` (Tani), `Kalkulator`, `Lahan`, `Profil`.
- **Stack screens (authenticated):** WeatherDetail, ProductList, ProductDetail, History, FarmForm, Plantings, Activities, ActivityCalendar, Market, FertilizerCalculator, PesticideCalculator, GridCalculator, UnitConverter, Guide.
- Route types centralized in `src/navigation/types.ts` (`RootStackParamList`).

### 3.2 State layer (zustand)
| Store | Notes |
|---|---|
| `useAuthStore` | Session; drives navigation gate; `init()` on mount. |
| `useFarmStore` | Farms + chosen farm. |
| `useChatStore` | Chat sessions/messages. |
| `useHistoryStore` | Calculator history; **persisted** (`twt-history`). |
| `useActivityStore` | Farm activities + reminders. |
| `useProductStore` | Product catalog (seeded from `products.seed.ts`; refreshed from backend). |
| `useSettingsStore` | Locale/settings; **persisted** (`twt-settings`). |

Files are flat in `src/store/` and cross-import each other (e.g., AI tools write into `useActivityStore`), which is a coupling to note.

### 3.3 Feature vs service split (current drift)
- **Pure logic lives in `features/`** (calculators, farm helpers, grid) — correctly isolated and UI-independent.
- **I/O lives in `services/`** but is flat and mixes domain concerns: chat sync, farm sync, catalog sync, weather, AI, notifications, price sync, widget publishing all in one folder.
- **Pure logic ALSO appears inside `services/`**: `services/weather/openMeteo.ts` contains `sprayCondition` (domain logic) and `services/ai/tools.ts` contains calculator orchestration + activity writing. This violates the "pure logic separated from I/O" target (`target-architecture.md` §1.4).

### 3.4 Persistence
- React Native local storage for accepted stores (2 persisted zustand stores).
- `offline.ts` queue for sync-on-reconnect.
- Native widget reads locally-stored price data published by `widgetPublish.ts`.

---

## 4. Backend architecture

### 4.1 Router graph (mounted in `app.ts`)
| Mount | Router | Facing consumer |
|---|---|---|
| `/ai` **and** `/api/ai` | `ai.routes` (`/chat`, `/vision`, `/status`) | Mobile agent (`/ai/chat`, `/ai/vision`) |
| `/api/products` | `products.routes` | Mobile catalog sync |
| `/api/chat` | `chat.routes` (`/sync`) | Mobile chat sync |
| `/api/push` | `push.routes` (`/register`, weather-alerts, cron) | Mobile push + cron |
| `/api/market` | `market.routes` | Mobile market screen |
| `/api/plantings` | `plantings.routes` | Mobile plantings |
| `/api/farms` | `farms.routes` (incl. `/crops`, `/seed`) | Mobile farm sync + seed |
| `/api/admin` | `admin.routes` (summary) | Admin |
| `/admin` (HTML) | `adminPage.ts` | Admin dashboard |

> Both `/ai` and `/api/ai` mount the **same** router object, so `/ai/chat`, `/ai/vision`, `/api/ai/chat`, `/api/ai/vision` all work. Mobile uses the `/ai/*` variants; this dual mount is redundant surface area.

### 4.2 Middleware chain
- `cors` (wide open), `express.json({ limit: '12mb' })` (large for image payloads).
- Per-router: `aiLimiter` (30/15min), `pushLimiter` (20/15min), `authLimiter` (20/15min).
- `supabaseUser` middleware: `userFromHeader` (parses Supabase JWT), `requireSupabaseUser`, `optionalSupabaseUser`.
- `errorHandler` centralized.
- AI daily quota: `userAiQuota` / inline in `ai.routes` (default 100 queries/24h per user).

### 4.3 Services layer (business logic)
- `services/agent.ts` — server-side tool loop (MAX_ITERATIONS=7) driving chat.
- `services/openrouter.ts` — provider orchestration (Gemini primary, OpenRouter fallback).
- `services/weatherAlerts.ts` — threshold classification + forecast fetch.
- `services/marketData.ts` — price aggregation/view + `guidanceFor` sell/hold advice.
- `services/commodityMatch.ts` / `provinceMatch.ts` — fuzzy matching lookups.
- `services/priceSanity.ts` — sanity range enforcement (deduplicated into scripts).
- `services/structured.ts` / `tokenBudget.ts` — AI response parsing + token budgeting.
- `services/marketHistory.ts` — history service over `store/marketHistory`.

### 4.4 Stores layer (data access)
Flat `store/` of Supabase-backed repositories (catalog, knowledge, marketPrices, marketHistory, plantings, priceAlerts, priceChangeAlerts, pushTokens, farmerPrices, farms, farmActivities) — mirroring configurations targeted for domain-based splitting in `target-architecture.md` §1.3.

### 4.5 Config & secrets
`config.ts` reads env: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`/model/fallbacks, `GEMINI_API_KEY`/model/fallbacks, `ADMIN_TOKEN` (default `dev-admin-token`), `CRON_SECRET`. `hasApiKey()`/`hasSupabase()` gate feature availability.

---

## 5. Data layer (Supabase)

Key tables (canonical in `schema.sql`, evolved via migrations):
- **Catalog:** `products`, `audit_log`
- **Knowledge:** `knowledge_docs`, `knowledge_chunks` (+ pg_trgm index, `fts` tsvector, `embedding vector(768)`)
- **Market:** `market_prices` (PK commodity,province,level), `market_price_history` (unique commodity,province,level,date), `farmer_prices`, `price_alerts`, `price_change_alerts`
- **Push:** `push_tokens`
- **Agronomy:** `plantings`, `planting_reminders`, `farms`, `farm_crops`, `farm_activities`
- **Telemetry:** `ai_query_log`
- **Admin ops:** `push_campaign_log`, `farmer_prices.moderated_at`/`moderation_note`

Security: RLS **enabled on all tables**; anon role is effectively read-only, writes go through the backend's `service_role` key. See `api-contract-audit.md` for the access-model implications.

---

## 6. AI subsystem (current flow)

Two distinct agent implementations exist — this is the most important architectural divergence:

1. **Mobile offline agent** (`src/services/ai/agent.ts` `runOfflineAgent`) — deterministic `if/else` keyword router + `executeTool` against device tools. Used when no backend URL, or as fallback.
2. **Backend agent** (`backend/src/services/agent.ts` `runAgent`) — LLM tool-using loop with native tool calls, directive parsing, alias/levenshtein tool-name correction, token budgeting, and model fallback.

**Mobile "backend" path** (`runBackendAgent` in `src/services/ai/agent.ts`) POSTs `{messages, tools, context}` to `/ai/chat` expecting `{reply, tool_calls}` and running a **client-side tool loop**. The real backend returns `{reply, model, usage}` and runs **server-side**. See `api-contract-audit.md` §3 for the resulting contract mismatch.

The offline `TOOLS` (6) and backend `TOOL_SCHEMAS` (8) also diverge (`search_knowledge`, `market_price` are backend-only; backend lacks the client's activity-log semantics).

---

## 7. Cross-cutting concerns & structural pain points

1. **No shared contract package.** Types and constants are hand-copied across `src/types`, `backend/src/types`, `tools/schemas.ts`, `tools/executors.ts`, and DB schema. Any drift is silent (see `type-audit.md`).
2. **Backend is a monolith of flat folders** (`routes/`, `services/`, `store/`, `tools/`) — matches the "current monolith" baseline of `target-architecture.md`, which wants domain-first splitting.
3. **Duplicate sync logic across backend scripts and Supabase edge functions** (`sync-prices`, `sync-kemendag` each appear twice with own maps).
4. **Two migration sets** (`migration_0xx_*` and `migrations/2026*_*`) overlap; `20260829060000_admin_ops.sql` is orphaned from the numbered set.
5. **`/ai` vs `/api/ai` dual mount** — redundant, ambiguous.
6. **AI agent contract mismatch** between mobile expectations and backend behavior.
7. **Large, mixed-responsibility files** — e.g., `src/services/ai/agent.ts` holds both transport logic and the offline keyword router; `services/marketData.ts` mixes aggregation and advisory rules.

---

## 8. Data flow highlights

- **Chat:** `AIChatScreen` → `useChatStore` → `runAgent` → (backend `POST /ai/chat`) → reply; sync to Supabase via `chatSync` → `/api/chat/sync`.
- **Catalog:** `catalogSync` (6h throttle) → `GET /api/products` → `useProductStore`; local seed fallback.
- **Farm:** `FarmFormScreen` → `useFarmStore` → local; `farmSync` → `/api/farms` + `/api/farms/seed`.
- **Market:** `MarketScreen` → `GET /api/market/*` → display; backend refreshes from Kemtan/Kemendag.
- **Weather alerts:** backend `weatherAlertService` → `/api/push/weather-alerts?lat=&lon=`; cron push via `push.routes`.
- **AI:** backend agent → OpenRouter/Gemini + tool executors; telemetry to `ai_query_log`.

---

## 9. Relationship to target architecture

`target-architecture.md` defines the goal: a `packages/contracts` shared source of truth, domain-first backend (`domains/`), feature-first frontend, and pure business logic isolated from I/O. The current state documented here is the **baseline** that `migration-map.md` describes how to move toward that target. Key gaps this audit confirms:
- Single source of truth for types: **absent** (param #1 of target).
- Domain-first backend: **not yet** (flat `store`/`routes`/`services`).
- Pure logic separated from I/O: **partial** (feature calculators are pure; services bundle logic + I/O).
- Dead code / duplication cleanup: **outstanding** (dual mounts, duplicate sync, duplicate migrations, mismatched AI contract).
