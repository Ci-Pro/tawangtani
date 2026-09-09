# Type Audit

An audit of every **type definition** in the system and how each is duplicated/diverged across the four "type surfaces": (1) **mobile domain** `src/types/index.ts`, (2) **backend API** `backend/src/types.ts`, (3) **AI tool contracts** `backend/src/tools/schemas.ts` + `executors.ts` + client `src/services/ai/tools.ts`, and (4) **database schema** (`supabase/schema.sql` + migrations).

The highest-order finding: **there is no shared type package.** Each layer hand-authorizes its own copies, and the only thing guaranteeing correspondence today is developer discipline. This is the root cause behind the contract drifts in `api-contract-audit.md`.

---

## 1. The four type surfaces

```
┌──────────────────────────────┐   ┌────────────────────────────────────────┐
│ Surface A: Mobile domain     │   │ Surface B: Backend API                 │
│ src/types/index.ts           │   │ backend/src/types.ts                   │
│  User, Farm, Crop, Product,  │   │  ChatMessageIn, ToolContext,           │
│  FarmActivity, HistoryItem,  │   │  ToolCallOut, ToolResult               │
│  ChatMessage, Weather* , ... │   └────────────────────────────────────────┘
└──────────────┬───────────────┘                ▲
               │   no shared package            │ ad-hoc hand-copied
               ▼                                ▼
┌──────────────────────────────┐   ┌────────────────────────────────────────┐
│ Surface C: AI Tool contracts │   │ Surface D: Database schema             │
│ tools/schemas.ts (backend)   │   │ schema.sql + migration_*.sql           │
│ tools/executors.ts (backend) │   │ products, market_prices, plantings,    │
│ ai/tools.ts + agent.ts (mob) │   │ farms, farm_crops, farmer_prices, ...  │
└──────────────────────────────┘   └────────────────────────────────────────┘
```

Each surface re-declares entities that overlap with the others. Concrete examples are in §2–§5.

---

## 2. Surface A — Mobile domain types (`src/types/index.ts`)

Core domain model the app uses (~171 lines). Notable definitions and the I/O types that duplicate other surfaces:

| Type | Purpose | Counterpart elsewhere |
|---|---|---|
| `User` | `{id,name,email,locale?}` | Supabase `auth.users` (subset) |
| `Farm`, `Crop`, `GrowthStage` | agronomy domain | `farms`/`farm_crops` tables (snake_case) |
| `Product`, `ProductDose`, `ProductWarnings`, `ProductCategory` | catalog | `products` table + backend `Product[]` inside `ToolContext` |
| `ProductAuditEntry` | audit log | `audit_log` table |
| `ActivityType`, `FarmActivity` | activities + reminders | `farm_activities` table; also `activity_log` tool |
| `HistoryType`, `HistoryItem` | calculator history | local-only (persisted `twt-history`) |
| `ChatMessage`, `ChatSession` | chat | `chat_messages` table + `ChatMessageIn` (backend) |
| `WeatherCurrent/Hourly/Daily/WeatherData`, `WeatherCacheEntry` | weather | Open-Meteo response mapping |
| `SprayLevel`, `SprayCondition` | spray advice logic | duplicated in `services/weather/openMeteo.ts` |
| `AreaUnit` | `'m2'\|'are'\|'ha'` | duplicated in `features/*` calculators, backend tool schemas, DB area_unit strings |

### 2.1 Drift within Surface A
- `Crop.cropType`/`variety`/`growthStage` vs the backend/farm_vs plantings model: the mobile `Farm.crops` uses these fields, but the backend `farm_crops` table columns are `name`/`planted_date`/`harvest_date`/`area_value`/`area_unit`/`status` and `plantings` uses `commodity`/`planted_at`/`harvest_days`/`status`. The mobile `Crop` type does **not** correspond 1:1 to either persisted shape — it is an in-memory projection.

---

## 3. Surface B — Backend API types (`backend/src/types.ts`)

Only 4 types, but all mirror client or schema concepts:

| Backend type | Mirrors | Divergences |
|---|---|---|
| `ChatMessageIn` | `ChatMessage` + `SyncMessage` | backend adds `name?` and a `tool` role the mobile `ChatMessage.role` (`'user'\|'assistant'`) does not type. Backend `normalizeMessages` expects `'tool'` role messages — the mobile client never sends those via `/ai/chat` (it uses role `user`/`assistant`/`system` only). The `'tool'|'name'` fields are used only in backend-internal re-entry. |
| `ToolContext` | `ToolContext` (client `ai/tools.ts`) | Backend adds `userId?` and a richer inline `products: Array<{...}>` shape. Client `ToolContext` has `coords/locationName/farmContext/products` where `products` are `Product[]` (from `src/types`). The `Product` shape and the inline product shape in `backend/src/types.ts:16-34` are **structurally separate definitions that must stay in sync manually**. |
| `ToolCallOut` | `BackendToolCall` (client `agent.ts`) | Same shape (`{name, arguments}`), defined twice. |
| `ToolResult` | `ToolResult` (client `ai/tools.ts`) | Identical `{summary, data?}` — defined in both layers. |

---

## 4. Surface C — AI tool contracts (the worst duplication)

The tool registry exists three times with meaningful divergence:

### 4.1 `backend/src/tools/schemas.ts` — `TOOL_SCHEMAS` (8 tools)
- `get_weather`, `fertilizer_calculator`, `pesticide_calculator`, `product_search`, `farm_context`, **`search_knowledge`**, **`market_price`**, `activity_log`.
- Full JSON-schema params (`required`, `enum`, `properties`) consumed by the LLM (OpenAI-style) and validated by `validateToolArgs`.

### 4.2 `backend/src/tools/executors.ts` — runtime implementations
- Same 8 tool names (must match `TOOL_SCHEMAS` `function.name` or the executor lookup fails).
- Adds domain logic: `LEVEL_MAP` (produsen/producer/petani=1; grosir/wholesale/kios/penggrosok=2; eceran/retail/konsumen/pasar=3), `AREA_TO_M2`, weather cache, etc.
- **`activity_log` here writes to the `farm_activities` table** (server-side persistence).

### 4.3 Client `src/services/ai/tools.ts` — `TOOLS` + `executeTool` (6 tools)
- Missing `search_knowledge` and `market_price` relative to backend.
- `activity_log` here writes via `useActivityStore` (device-local), **different semantics** from backend.

### 4.4 Divergence matrix
| Tool | Backend schemas | Backend executor | Client tools | Notes |
|---|---|---|---|---|
| `get_weather` | ✅ | ✅ | ✅ | client uses Open-Meteo locally; backend proxies |
| `fertilizer_calculator` | ✅ (params) | ✅ | ✅ (args defaults differ: `areaUnit`/`doseUnit`) | client default `doseUnit 'kg/ha'`; schema enum wider |
| `pesticide_calculator` | ✅ | ✅ | ✅ | client default `tankVolumeL 14` |
| `product_search` | ✅ | ✅ | ✅ | client returns max 5, brand/name/ingredient lookup |
| `farm_context` | ✅ | ✅ | ✅ | — |
| `search_knowledge` | ✅ | ✅ | ❌ | backend-only; KB lookup with embedding/vector |
| `market_price` | ✅ | ✅ | ❌ | backend-only; price lookup + trend + sell advice |
| `activity_log` | ✅ | ✅ (DB) | ✅ (device) | **semantic divergence** — two persistence targets |

**Impact:** The mobile `TOOLS` sent to `/ai/chat` (which the backend ignores anyway) would, if the backend honored them, advertise only 6 of 8 tools. The `search_knowledge` and `market_price` capabilities are unreachable from the mobile offline path and only exist server-side. Combined with the `C1` contract mismatch, the client tool registry is effectively dead surface in connected mode.

---

## 5. Surface D — Database schema

Column naming is **snake_case** end-to-end, and no mapper centralizes the camelCase↔snake_case boundary. Key tables (from `schema.sql` + migrations):

| Table | Note |
|---|---|
| `products` | snake_case columns; `loadCatalog`/`saveCatalog` map to camelCase products |
| `audit_log` | product audit trail |
| `knowledge_docs`, `knowledge_chunks` | FTS + trgm + `embedding vector(768)` |
| `market_prices` (PK commodity,province,level), `market_price_history`, `farmer_prices` | price data |
| `price_alerts`, `price_change_alerts` | push alerts |
| `push_tokens` | Expo tokens |
| `plantings`, `planting_reminders` | agronomy |
| `farms`, `farm_crops` | farm profiles |
| `farm_activities` | activity feed |
| `ai_query_log` | telemetry |
| `chat_messages` | synced chat |
| `push_campaign_log`, `farmer_prices.moderated_at/moderation_note` | admin ops (20260829 migration) |

### 5.1 Case/naming drift
- `market_prices.price` ↔ `toView()` produces `PriceView` with camelCase (`updatedAt`, `prevPrice`). Backend store returns rows with snake_case; `services/marketData.toView` converts. If a caller forgets `toView`, camelCase consumers break (see C6 note in API audit).
- `plantings.*` snake_case ↔ `src/types` has no `Planting` type at all — plantings are handled as ad-hoc object literals in screens; the domain type lives only implicitly in the DB and route validation.
- `farms.area_value/area_unit` ↔ client `Farm.areaValue/areaUnit` (route maps fields in `farms.routes.ts`). Mapping is manual per route, not type-driven.

### 5.2 Missing shared domain types
There is **no** type for `Planting`, `PlantingReminder`, `MarketPrice`, `PriceAlert`, `PushToken`, `KnowledgeChunk`, `PriceView` defined as a single shared interface anywhere. They appear as:
- inferred DB row types (Supabase `db()` queries, often `any`),
- inline object literals in handlers,
- ad-hoc cast types in stores/routes.

This is the most fragile kind of typing: column renames or table alterations fail **silently** (no TS error) until runtime.

---

## 6. Typing-quality issues (via `any`, lax casts)

The backend uses `requireSupabaseUser` and `(req as any).sbUser` in several handlers (`farms.routes.ts`, `push.routes.ts` change-alerts), and `req.sbUser!` in others (`chat.routes.ts`). This inconsistency means the authenticated-user shape is not strongly typed across the codebase:
- `SbUser` is defined properly in `middleware/supabaseUser.ts`, but handlers re-cast to `any` or `!` instead of using a typed request augmentation.
- Same anti-pattern for `ToolContext` and `PriceView` in some stores/services.

---

## 7. Recommended consolidation (pointers → target)

Consistent with `target-architecture.md` (a `packages/contracts` single source of truth), the audit recommends centralizing at minimum:

1. **Domain entity types** — `Farm`, `Crop`, `Product`, `ProductDose`, `ActivityType`, `Planting` (+ reminder), `MarketPrice`/`PriceView`, `ChatMessage`: shared `@tawangtani/contracts` package with both camelCase DTO and snake_case DB-row views.
2. **Tool contract** — single tool registry (`TOOL_SCHEMAS` + executor interface + `ToolResult`/`ToolCallOut`) shared by backend and (optionally) mobile; closes the 6-vs-8 gap and the `activity_log` semantic split.
3. **API DTOs** — typed request/response for every endpoint in `api-contract-audit.md` so callers stop ad-hoc casting.
4. **DB mapping** — one mapper between snake_case rows and camelCase DTOs (replaces per-route `toView`/field-mapping code).

## 8. Type-drift ledger (summary)

| # | Concept | # of independent definitions | Current agreement |
|---|---|---|---|
| T1 | `ToolResult` | 2 (client, backend) | identical |
| T2 | `ToolCallOut` / `BackendToolCall` | 2 | identical |
| T3 | `ToolContext` | 2 | differ: backend adds `userId` + inline product DTO |
| T4 | `Product` | ≥3 (mobile type, backend inline DTO, DB row) | near-match, hand-synced |
| T5 | Tool registry (names/params) | 2 (backend schemas+executors, client) | **drift** — 8 vs 6, `activity_log` semantics differ |
| T6 | `ChatMessage` role union | 3 (`'user'/'assistant'`, backend `+system/name/tool`) | drift |
| T7 | `Planting`/`MarketPrice`/`PriceView`/`PriceAlert`/`PushToken` | inline/ad-hoc, no shared type | **absent** |
| T8 | `AreaUnit` | ≥3 (mobile type, calculators, DB/route strings) | drift (enum vs string) |
| T9 | case mapping camel↔snake | per-route manual (`toView`, `farms.routes`) | fragile |
