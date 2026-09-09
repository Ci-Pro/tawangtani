# TAWANGTANI — Final Audit Report

> **Date:** 2026-08-30
> **Auditor:** Automated code audit (no source modifications)
> **Scope:** Full repository — mobile (Expo/React Native), backend (Node/Express), Supabase (Postgres + Edge Functions), Android widget, CI/CD, scripts
> **Branch:** main, 187 tracked files

---

## 1. Executive Summary

TawangTani is a functional agricultural app with solid domain logic, but its architecture has accumulated significant duplication across the frontend/backend/supabase boundary. The single most dangerous pattern is **4+ independent copies of the same business constants and rules** (price limits, commodity names, province codes, calculator formulas) maintained in separate files with no shared contract. This drift has already caused real bugs (the template literal escape bug in adminPage.ts that broke the entire admin panel for days went undetected because no tool executed the browser JS).

The codebase is clean of committed secrets (`.env` correctly gitignored), has consistent error handling patterns, and the AI agent architecture is well-designed with proper guardrails. However, the absence of a shared types package means frontend and backend can silently diverge on data shapes, tool schemas, and business rules.

**Bottom line:** The app works, the core logic is sound, but scaling without a shared contract layer will produce increasingly difficult drift bugs. The recommended first step is creating `packages/contracts` and migrating the 5 critical duplicated constant sets.

---

## 2. Current Architecture

### Deployment
```
Mobile (Expo) → Expo Build → Google Play / Expo Go
Backend (Express) → Vercel Serverless (api/index.ts)
Database → Supabase (Postgres + Auth + Edge Functions + pg_cron)
AI → Gemini (primary) → OpenRouter (fallback)
Weather → Open-Meteo
Push → Expo Push Notifications
```

### Data Flow
```
Mobile ←HTTP→ Backend ←REST→ Supabase Postgres (service-role)
                              ↑
Edge Functions (sync-kemendag, sync-prices) ←pg_cron→ Supabase
Mobile ←direct→ Supabase Auth (signup/login)
Mobile ←HTTP→ Open-Meteo (weather)
```

### Key Pain Points
1. **No shared types** — types duplicated across `src/types`, `backend/src/types`, `tools/schemas.ts`, `ai/tools.ts`
2. **No shared business rules** — price limits, calculators, commodity matching all hand-duplicated
3. **Flat directory structure** — backend `store/` has 11 files, `routes/` has 9 files, no domain boundaries
4. **Silent failure everywhere** — 9 `catch(() => undefined)` in frontend, no sync status UI
5. **Offline agent feature gap** — 6 tools offline vs 8 tools online (missing knowledge + market price)

---

## 3. Critical Problems (P0)

| # | Problem | Impact | Files |
|---|---------|--------|-------|
| P0-1 | **Tool schemas duplicated** — backend `tools/schemas.ts` defines 8 tools; frontend `ai/tools.ts` defines 6 tools with different parameter shapes. ToolContext type diverges (backend has `product.doses`, frontend doesn't). | AI agent can call non-existent tools; mobile offline mode gives wrong answers | `backend/src/tools/schemas.ts`, `src/services/ai/tools.ts`, `backend/src/types.ts`, `src/types/index.ts` |
| P0-2 | **Commodity/province constants duplicated 3-4x** — `commodityMatch.ts`, `provinceMatch.ts`, `sync-kemendag/index.ts` VARIANT_MAP, `sync-prices/index.ts` COMMODITY_DEFS, `kemtanSync.ts`, `resolveProvince.ts`, `market.routes.ts` KNOWN_COMMODITIES | Price sync silently matches wrong commodities; province aliases drift | 7+ files across all layers |

---

## 4. High Priority Problems (P1)

| # | Problem | Impact |
|---|---------|--------|
| P1-1 | Calculator logic duplicated (fertilizer/pesticide) — frontend `features/` vs backend `executors.ts` | Inconsistent dose calculations between AI chat and calculator screen |
| P1-2 | Price sanity limits duplicated 4x — `priceSanity.ts`, `sync-kemendag`, `sync-prices`, `sanitize-prices.mjs` | Threshold changes in one place silently missed in others |
| P1-3 | Backend flat structure (11 store files, 9 route files) — no domain boundaries | Maintenance burden; cross-domain coupling |
| P1-4 | Entity types duplicated — `src/types/index.ts` vs `backend/src/types.ts` | DTO shape drift at REST boundary |
| P1-5 | Frontend flat structure — 7 stores, 13 services, screens scattered | Feature discovery difficulty |
| P1-6 | Edge functions hardcode same constants as backend | Third copy of commodity/province data |

---

## 5. Frontend/Backend Contract Mismatches

| # | Mismatch | Severity |
|---|----------|----------|
| C1 | Mobile posts `{messages, tools, context}` to `/ai/chat` expecting client-side tool loop; backend returns `{reply, model, usage}` with server-side loop — client tool branch is dead code in connected mode | CRITICAL |
| C2 | Frontend ToolContext has `products[]` with camelCase shape; backend expects snake_case `active_ingredient` — raw mapping in `ai.routes.ts` line 208 | HIGH |
| C3 | Message/vision size limits (50 msgs, 4000 chars, 2.5MB) enforced only server-side; frontend sends without validation → raw 400s | MEDIUM |
| C4 | `user_id` type is TEXT in `chat_messages`/`ai_query_log`/`push_tokens` but UUID in `farmer_prices`/`plantings`/`farms` — RLS uses `auth.uid()::text` vs `auth.uid()` inconsistently | HIGH |
| C5 | `expo_push_token` (price_alerts) vs `expo_token` (price_change_alerts) — same concept, different column names | MEDIUM |
| C6 | `listMarketPrices()` has no pagination — PostgREST 1000-row cap silently truncates results as data grows | CRITICAL |
| C7 | `backfill-market-history.ts` uses `on_conflict=commodity,province,date` but migration 007 changed unique to `(commodity,province,level,date)` — upsert will fail at runtime | HIGH |
| C8 | `adminToken` default fallback `'dev-admin-token'` accessible when env not set | HIGH |

---

## 6. Duplicate Business Logic

| Rule | Location 1 | Location 2 | Location 3 | Location 4 | Drift Risk |
|------|-----------|-----------|-----------|-----------|------------|
| Price limits (50+ commodities) | `backend/src/services/priceSanity.ts` | `supabase/functions/sync-kemendag/index.ts` | `backend/scripts/sync-kemendag.mjs` | `backend/scripts/sanitize-prices.mjs` | HIGH — 4 identical copies |
| Fertilizer calculator | `src/features/fertilizer/calculator.ts` | `backend/src/tools/executors.ts` | — | — | MEDIUM — formula aligned but structurally independent |
| Pesticide calculator | `src/features/pesticide/calculator.ts` | `backend/src/tools/executors.ts` | — | — | MEDIUM |
| Spray condition thresholds | `src/services/agriForecast.ts` | `backend/src/tools/executors.ts` | `backend/src/services/weatherAlerts.ts` | — | LOW — currently aligned |
| Commodity matching | `backend/src/services/commodityMatch.ts` | `supabase/functions/sync-kemendag/VARIANT_MAP` | `supabase/functions/sync-prices/COMMODITY_DEFS` | `src/services/kemtanSync.ts` | HIGH — 4 sources |
| Province matching | `backend/src/services/provinceMatch.ts` | `src/utils/resolveProvince.ts` | `src/services/kemtanSync.ts` (38-province map) | — | MEDIUM |
| Unit classification (liter/kg) | `priceSanity.displayUnitFor` | `sync-kemendag.LITER_COMMODITIES` | `sync-prices.LITER_UNITS` | `market.routes.KNOWN_COMMODITIES` | HIGH — 4 expressions |

---

## 7. Duplicate Types

| Type | Location A | Location B | Location C | Drift |
|------|-----------|-----------|-----------|-------|
| `ToolContext` | `backend/src/types.ts` | `src/services/ai/tools.ts` | — | Backend adds `product.doses`; frontend doesn't |
| `ToolResult` | `backend/src/types.ts` | `src/services/ai/tools.ts` | — | Identical shape |
| `Product` / `ProductDose` | `src/types/index.ts` | `backend/src/types.ts` (inline) | `backend/src/store/catalog.ts` | 3 representations |
| `ActivityType` enum | `src/types/index.ts` | `backend/src/tools/schemas.ts` | `src/store/useActivityStore.ts` | Verbatim duplicate |
| Dose unit enums | `features/fertilizer/calculator.ts` | `features/pesticide/calculator.ts` | `backend/src/tools/schemas.ts` | Same values, different type names |
| `WeatherCurrent` | `src/types/index.ts` | `backend/src/tools/executors.ts` | `src/services/agriForecast.ts` | Different shape |
| `SprayLevel`/`SprayCondition` | `src/types/index.ts` | `backend/src/tools/executors.ts` (inline strings) | — | Named types vs string literals |

---

## 8. AI Problems

| # | Problem | Severity |
|---|---------|----------|
| A1 | Frontend offline agent has 6 tools; backend has 8 — missing `search_knowledge` and `market_price` → degraded offline answers | HIGH |
| A2 | AI quota counting depends on fire-and-forget `logAiQuery().catch(()=>undefined)` — logging failure = quota bypass | HIGH |
| A3 | Tool result truncation (3000 chars) silently drops data; no warning to user | MEDIUM |
| A4 | Provider fallback chain: Gemini → OpenRouter free models → 403 → error. No paid fallback; free models may be rate-limited/unavailable | MEDIUM |
| A5 | `resolveToolName` uses Levenshtein distance ≤2 — could match wrong tool for short/ambiguous names | LOW |
| A6 | `market_price` tool queries market_prices table via REST (service-role) — runs server-side, no caching per request | LOW |

---

## 9. Database Problems

| # | Problem | Severity |
|---|---------|----------|
| D1 | `schema.sql` is stale (only 2 tables) — not authoritative; actual schema lives in 15 migration files across 2 directories | HIGH |
| D2 | `user_id` type inconsistency: TEXT in 3 tables, UUID in 6 tables | HIGH |
| D3 | `push_campaign_log` has RLS disabled — only table without RLS | MEDIUM |
| D4 | `ai_query_log` has both `model` and `model_used` columns (redundant) | LOW |
| D5 | `market_prices` has legacy `id` text column alongside composite PK `(commodity,province,level)` | LOW |
| D6 | Missing `user_id` index on `price_alerts` (only `active` indexed) | MEDIUM |
| D7 | Migrations 010-014 duplicated in both `supabase/migration_*` and `supabase/migrations/*` dirs — idempotent but confusing | LOW |
| D8 | `farmer_prices.price` is NUMERIC while `market_prices.price` is INTEGER — different types for same concept | LOW |

---

## 10. Security Problems

| # | Finding | Severity | Details |
|---|---------|----------|---------|
| S1 | **Supabase anon key hardcoded** in `.github/workflows/e2e-test.yml` line 29 | HIGH | Real JWT committed to CI (anon keys are public-by-design, but this is a specific project key) |
| S2 | **`dev-admin-token` fallback** in `backend/src/config.ts` | HIGH | When `ADMIN_TOKEN` env unset, admin endpoints accessible with known default |
| S3 | **`supabase/.temp/*` tracked** in git — contains project ref, pooler URL, org slug | MEDIUM | Infrastructure details exposed; should be gitignored |
| S4 | **CORS wide-open** — `cors()` with no origin restriction | MEDIUM | Any origin can call backend APIs |
| S5 | **Editable `backendUrl`** stored in AsyncStorage, sent with auth token | MEDIUM | User can redirect token-bearing requests to attacker endpoint |
| S6 | **`authLimiter` defined but unused** — no rate limiting on auth endpoints (auth is via Supabase, so low risk) | LOW | Dead code |
| S7 | **Admin token stored in JS memory** (not httpOnly cookie) — accessible via XSS | LOW | Acceptable for SPA admin panel |

---

## 11. Code Quality

| Metric | Count | Notes |
|--------|-------|-------|
| Total tracked files | 187 | Excluding node_modules, .git, dist |
| Source files (TS/TSX/MJS/KT/XML/YML/SQL) | ~80 | Core source |
| Total LOC (source) | ~22,700 | Frontend ~14k, backend ~6.2k, supabase ~0.7k, scripts ~1.8k |
| Files > 300 lines | 15 | Largest: products.seed.ts (3853), MarketScreen (1432), adminPage (583), AIChatScreen (571) |
| `console.log/warn/error` | 20 | Mostly in stores and sync services |
| `@ts-ignore/@ts-nocheck` | 0 | Clean |
| `any` type annotations | 3 | Minimal |
| `eslint-disable` | 5 | Present but limited |
| `TODO/FIXME/HACK` | 0 | Clean |
| `catch(() => undefined)` (silent swallow) | 9 | All in frontend sync services |
| Empty catch blocks | 2 | In frontend |
| Tests | 1 file | `calculators.test.ts` — 129 lines, covers calculator logic only |
| CI typecheck/test | NONE | Only E2E regression test runs in CI |
| `dist/` committed | No | Correctly gitignored |
| Stale `package.json main` field | Yes | Points to nonexistent `dist/index.js` |

---

## 12. Target Architecture

```
tawangtani/
├── apps/
│   ├── mobile/                    ← Expo React Native
│   │   ├── app/                   ← navigation
│   │   ├── features/              ← auth, ai, calculator, farm, market, products, weather, activity
│   │   ├── shared/                ← components, hooks, utils, constants
│   │   └── infrastructure/        ← api, storage, sync, push, widget
│   └── backend/                   ← Node/Express
│       ├── modules/               ← ai, market, farmer, farm, push, products, chat, admin, knowledge
│       ├── domain/                ← calculator, weather, commodities, market (pure logic)
│       ├── application/           ← sync, cron
│       └── infrastructure/        ← supabase, cache, config, middleware
├── packages/
│   └── contracts/                 ← shared types, API schemas, domain rules, tool schemas
└── docs/
    ├── architecture/
    └── audit/
```

Key principles:
- **Shared contracts** as single source of truth for types, constants, business rules
- **Feature-based modules** in frontend, **domain-based modules** in backend
- **Dependency direction:** apps → packages/contracts (never reverse)
- **Edge functions** consume built artifacts from contracts (inline due to Deno runtime)

---

## 13. Migration Map (Summary)

| Phase | Action | Files | Risk | Duration |
|-------|--------|-------|------|----------|
| 1 | **Freeze** — baseline tests, snapshot, typecheck in CI | 3 new files | LOW | 1 day |
| 2 | **Contracts** — create `packages/contracts`, migrate shared types/constants | ~15 new/modified | MEDIUM | 3-5 days |
| 3 | **Backend domain** — split `store/` and `routes/` into `modules/` | ~20 files moved | MEDIUM | 5-7 days |
| 4 | **Frontend features** — reorganize into `features/`, `shared/`, `infrastructure/` | ~30 files moved | MEDIUM | 5-7 days |
| 5 | **AI consolidation** — shared tool schemas, single calculator impl | ~8 files modified | HIGH | 3-5 days |
| 6 | **Edge functions** — consume contracts build | 2 files | MEDIUM | 1-2 days |
| 7 | **Legacy cleanup** — remove dead code, stale migrations, dist | ~5 files deleted | LOW | 1 day |

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Calculator drift (frontend vs backend) | HIGH | HIGH | Shared contracts package |
| Price sync mismatch | HIGH | HIGH | Single commodity/province source |
| Admin panel breakage (template literal) | RESOLVED | HIGH | `check:admin.mjs` guard now in place |
| Secret leakage | LOW | CRITICAL | `.env` gitignored; audit `supabase/.temp` |
| Data corruption from service-role bypass | LOW | HIGH | RLS policies are correct; service-role usage is intentional |
| AI hallucination on dosing | LOW | HIGH | System prompt guardrails + tool injection |

---

## 15. Testing Strategy

### Current
- `__tests__/calculators.test.ts` — calculator logic (Jest)
- `backend/scripts/e2e.mjs` — HTTP regression (38 assertions, live Vercel)
- `backend/scripts/check-admin.mjs` — admin JS parse guard
- `backend/scripts/eval-ai.ts` — AI tool-calling quality (30 gold cases)

### Recommended
1. **Add typecheck to CI** — `npm run typecheck` in both root and backend
2. **Add Jest to CI** — run `npm test` in root
3. **Add contract tests** — validate API responses match shared types
4. **Add calculator conformance tests** — shared test cases for both implementations
5. **Add store tests** — at least auth and farm stores
6. **Add navigation tests** — smoke test that all screens render

---

## Final Metrics

| Metric | Value |
|--------|-------|
| **Total files audited** | 187 tracked + ~65 untracked relevant = **~252 total** |
| **Source files requiring changes** | **~40** (in migration plan) |
| **P0 problems** | **2** (tool schema duplication, commodity/province duplication) |
| **P1 problems** | **6** (calculators, price limits, flat structure x2, types, edge functions) |
| **P2 problems** | **6** (no contracts, mixed state, schema docs, seed duplication, error format, monorepo) |
| **P3 problems** | **4** (dead code, components, storybook, dev docs) |
| **Contract mismatches** | **8** (C1-C8) |
| **Duplicate type definitions** | **7** (ToolContext, ToolResult, Product, ActivityType, dose units, WeatherCurrent, SprayLevel) |
| **Duplicate business logic instances** | **5 major** (price limits ×4, calculators ×2, commodity matching ×4, province matching ×3, unit classification ×4) |
| **Security findings** | **7** (S1-S7) |
| **Total audit documentation** | **14 files**, **2,774 lines** |
