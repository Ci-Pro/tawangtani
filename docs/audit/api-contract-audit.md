# API Contract Audit

Audit of the HTTP contracts exposed by the TAWANGTANI backend and consumed by the mobile app (and other clients: cron, admin, edge functions). For each endpoint we record the **request shape** (method, path, headers, body/query), the **response shape**, **authentication**, **rate limits**, and any **contract mismatch / drift** between producer and consumer. Types referenced are defined in `src/types/index.ts`, `backend/src/types.ts`, and tool schemas in `backend/src/tools/schemas.ts`.

Convention for the "status" column:
- **MATCH** — producer and consumer agree structurally.
- **DRIFT** — producer returns/accepts a different shape than consumer expects (works only by coincidence, or branch is dead).
- **MISMATCH** — caller and callee disagree on a field that would break behavior.
- **RISK** — shape is correct but fragile (loose `any`, undocumented fields, implicit defaults).

---

## 1. AI endpoints (`/ai/*` and `/api/ai/*`)

Both `/ai` and `/api/ai` mount the same router (`app.ts`), so `/ai/chat`, `/ai/vision`, `/api/ai/chat`, `/api/ai/vision` are all valid. Mobile uses `/ai/*`.

### 1.1 `POST /ai/chat` — chat agent completion

**Producer (backend `ai.routes.ts:57`)**
- Auth: none required (optional `userFromHeader` for quota/logging).
- Rate limit: `aiLimiter` (30 req / 15 min IP).
- Daily quota: default `AI_DAILY_LIMIT=100` queries / 24h per authenticated user.
- Request body:
  ```jsonc
  {
    "messages": [{ "role": "user|assistant|system|tool", "content": "string" }],
    "context": { /* ToolContext minus require user id */ }
  }
  ```
  - Validation: `messages` must be non-empty array; ≤ 50 messages; each `content` ≤ 4000 chars, must be string.
- Response `200`:
  ```jsonc
  { "reply": "string", "model": "string", "usage": { "promptTokens": n, "completionTokens": n, "totalTokens": n } }
  ```
  - Errors: `400` (bad messages), `429` (quota), `503` (no key), `502` (LLM failure).

**Consumer (mobile `src/services/ai/agent.ts:99-123`, `runBackendAgent`)**
- Sends body:
  ```jsonc
  { "messages": [...], "tools": TOOLS /* 6 ToolDef: name+description only */, "context": ctx }
  ```
- Expects response:
  ```jsonc
  { "reply": "string", "tool_calls": [{ "name": "string", "arguments": { ... } }] }
  ```
- If `res.tool_calls?.length` → executes tools **client-side** (`executeTool`) and loops (MAX_ITERATIONS=5 on device).

**→ MISMATCH (critical).** The consumer expects a `tool_calls` array and a **client-side tool loop**; the producer returns only `{reply, model, usage}` (no `tool_calls`) and runs the tool loop **server-side** (`services/agent.ts`). Consequences:
1. The `tool_calls` branch in `runBackendAgent` is **dead** against the real backend (always falls through to `res.reply`).
2. The `tools` field sent by mobile is **ignored** by the producer (backend uses its own `TOOL_SCHEMAS`).
3. Tool results aggregated (totals, iteration count) never reach device; `toolsUsed` is always empty on the backend path.
4. This is safe *today* only because the backend already produces a final `reply`; but the mobile loop, offline tool names, and tool semantics are effectively unused in the connected mode.

**Recommended fix:** either (a) remove the client-side loop/tools and treat `/ai/chat` as an opaque reply channel (backend owns tools), or (b) define a real streaming/turn protocol agreeing on `tool_calls`. Refer `target-architecture.md` shared-contract direction.

### 1.2 `POST /ai/vision` — photo diagnosis

**Producer (`ai.routes.ts:129`)**
- Auth: optional. Rate: `aiLimiter`. Quota: shared daily limit.
- Request: `{ "imageBase64": "string", "context"?: "string" }`
  - `imageBase64` must be base64 (valid char set, ≥64 chars), decoded ≤ 2.5 MB (`MAX_IMAGE_BYTES`).
- Response `200`:
  ```jsonc
  { "reply": "string", "model": "string", "structured": { "gejala": [], "penyebab": [], "keparahan": "rendah|sedang|tinggi|kritis", "keyakinan": 0.5 } | undefined }
  ```
  - `structured` is present only when `parseDiagnosis` succeeds.

**Consumer (`src/services/ai/agent.ts:47-84`, `runVisionAgent`)**
- POSTs `{ imageBase64, context }` (context is the `ToolContext` object, matching producer's `context?: string` loosely — serialized as JSON in producer prompt). Response read as `{ reply }` only.
- On non-`ok`, falls back to a guidance message.

**→ DRIFT (minor).** `context` is typed `string` in producer (`ai.routes.ts:137`) but mobile passes a `ToolContext` object; mobile sends `{ context: ctx }`. Since `visionCompletion` stringifies it (`JSON.stringify(context)`), it is tolerable, but the producer type is wrong and unvalidated. `tool_calls`-style semantics are absent (fine — vision is one-shot).

### 1.3 `GET /ai/status` — capability check
- Response: `{ ok: true, model: string|null, keyConfigured: boolean }`.
- Consumer: none found in mobile; informational.

---

## 2. Product catalog (`/api/products`)

### 2.1 `GET /api/products` — list catalog
- Auth: none. Cache: 5 min (`cached('catalog', 5*60_000)`).
- Response `200`: `{ "products": Product[] }` where `Product` matches `src/types/index.ts:49` (camelCase: `id`, `brand`, `name`, `category`, `formulation`, `activeIngredient`, `doses`, `source`, `verified`, ...).

**Consumer (`src/services/catalogSync.ts:17-24`)**: `GET ${url}/api/products`, reads `json.products as Product[]`, `replaceAll`. **MATCH.** (Note: catalogSync uses the raw `fetch` client, not a typed DTO; drift would be silent.)

### 2.2 `PUT /api/products` — replace/update catalog (admin)
- Auth: header `x-admin-token` must equal `config.adminToken`.
- Request: `{ "products": [...] }` (non-empty array).
- Response: `{ ok: true, count }`.
- Consumer: admin tooling only.

---

## 3. Chat sync (`/api/chat`)

### 3.1 `POST /api/chat/sync` — upsert a session's messages (delete-then-insert)
- Auth: `requireSupabaseUser` (Bearer JWT).
- Request:
  ```jsonc
  { "sessionId": "string", "title"?: "string", "messages": [{ "role": "user|assistant|system", "content": "string", "createdAt"?: "string" }] }
  ```
- Behavior: deletes rows for `(session_id, user_id)` then inserts `messages.slice(-200)`.
- Response: `{ ok: true, count, title }`.

**Consumer (`src/services/chatSync.ts:16-31`)**: sends `{ sessionId, title, messages }` with `Authorization: Bearer <supabase access_token>`; messages mapped to `{role, content, createdAt}`. **MATCH** for the fields used. Note consumer does **not** read the response body (void), so response shape drift would be invisible.

### 3.2 `GET /api/chat/sessions`
- Auth: required. Response: `{ sessions: [{ sessionId, title, updatedAt, count }] }`. (Consumer: AIChatScreen — not verified to consume; used by cloud history.)

### 3.3 `GET /api/chat/sessions/:id/messages`
- Auth: required. Response: `{ messages: [{ role, content, created_at }] }`.

---

## 4. Push & notifications (`/api/push`)

### 4.1 `POST /api/push/register`
- Auth: `optionalSupabaseUser`. Rate: `pushLimiter` (20/15 min).
- Request: `{ "expoToken": "string" (must start 'ExpoPushToken'), "lat": number, "lon": number, "locationName": "string" }`.
- Response: `{ ok: true }`.

### 4.2 `GET /api/push/weather-alerts?lat=&lon=`
- Auth: none. 
- Request: query `lat`, `lon` (must be finite numbers).
- Response: `{ alerts: Alert[] }` where each alert has `{ code, severity: 'waspada'|'siaga'|..., message, ... }` (see `weatherAlerts`).

**Consumer (`src/services/weatherAlertService.ts`)**: calls `?lat=&lon=`; reads `json.alerts`. **MATCH** (shape depends on `FetchAlert` in `services/weatherAlerts.ts`).

### 4.3 `GET /api/push/alerts`, `POST /api/push/alerts`, `DELETE /api/push/alerts`
- Auth: `requireSupabaseUser`; POST/DELETE rate-limited.
- POST body: `{ expoToken, commodity (^[a-z_]{3,40}$), target (500–10_000_000), direction ('above'|'below'), province?, level? }`.
- Response: `{ ok: true }`. GET → `{ alerts }`.

### 4.4 `GET/POST/DELETE /api/push/change-alerts`
- POST body: `{ expoToken, commodity (^[a-z_]{3,40}$), province?, level?, threshold (clamped 1–50, default 5) }`.
- Response: `{ ok: true }`.

### 4.5 Cron endpoints
- `GET /api/push/cron/weather-push`, `GET /api/push/cron/price-alerts`, `GET /api/push/cron/plant-reminders`
- Auth: `Authorization: Bearer ${config.cronSecret}` (or `x-...` via `requireCronSecret`).
- Response: `{ ok: true, devices, messages, sent, failed, snapshotHarga, alertTerpicu, pengingat }` (weather-push).
- Triggered by Vercel cron `0 1 * * *` (weather-push) — see `vercel.json`.

---

## 5. Market (`/api/market`)

### 5.1 `GET /api/market/prices?commodity=&province=&level=`
- Auth: none. Cache: 5 min per key.
- Tolerates common names/aliases via `resolveCommodity`/`resolveProvince` (e.g. `gkp`, `jogja`).
- Response `200`:
  ```jsonc
  { "sourceLabel": "string", "prices": [ { ...priceView, "hint": "guidance text" } ] }
  ```
  where `priceView` = `toView()` (commodity, province, level, price, unit, prev, change%, updatedAt, source).
- Errors: `500` with `{ error }`.

**Consumer (`src/screens/market/MarketScreen.tsx`)**: queries with commodity/province/level; expects `json.prices` with `hint`. **MATCH** (verify field casing matches `toView` camelCase — see note in `type-audit.md`).

### 5.2 `GET /api/market/history?commodity=&range=&province=&level=`
- `range` ∈ `daily|weekly|monthly|yearly` (default `daily`); `commodity` required; `level` default 3.
- Response: `{ commodity, ...series }` — series shape from `getSeries` (labels + values).

### 5.3 `POST /api/market/refresh`
- Auth: header `x-admin-token`. Runs `refreshPrices()`, clears cache.
- Response: `{ ok: true, ...result }`.

### 5.4 `POST /api/market/snapshot`
- Auth: `x-admin-token`. Runs `snapshotToday()`.
- Response: `{ ok: true, saved }`.

### 5.5 `POST /api/market/ingest` (crowd-refresh)
- Auth: `requireSupabaseUser`.
- Request: `{ prices: [{ commodity, price, level? }], province?, level? }`.
- Filters rows to `KNOWN_COMMODITIES` and finite numeric price; sanitizes with `priceSanity`.
- Response: `{ ok: true, updated, province }`.

### 5.6 `POST /api/market/report` (farmer price report)
- Auth: `requireSupabaseUser`.
- Request: `{ commodity (in KNOWN_COMMODITIES), price, role ('jual'|'beli'), province?, village?, note? }`.
- Auto-moderation: `status='approved'` unless `ratio < 0.4` or `> 2.5` vs official ref → `pending`.
- Errors: `400` for unknown commodity / implausible price; `401` w/o user.
- Response: `{ ok: true, status }`.

### 5.7 `GET /api/market/reports?province=&commodity=&days=`
- `days` clamped 1–90, default 30. Cache 30 s.
- Response: `{ province, days, total, aggregates, recent: [...15] }`.

### 5.8 `GET /api/market/my-reports`
- Auth required. Response: `{ reports }`.

---

## 6. Plantings (`/api/plantings`)

All `requireSupabaseUser`. Validation: `commodity` `^[a-z_]{3,40}$`; `plantedAt` `YYYY-MM-DD`; `harvestDays` 20–1500; `area` ≤ 100000.

### POST `/api/plantings` (auth)
```jsonc
{ "commodity", "plantedAt", "harvestDays", "area", "yieldKgPerHa"?, "costTotal"?, "name"?, "reminders"?: [{ "hst": n, "label": "string" }] }
```
→ `{ ok: true, id }`.

### PATCH `/api/plantings/:id`
- Allowed: `status` (`active`|`harvested`|`failed`), `costTotal`.

### DELETE `/api/plantings/:id` → `{ ok: true }`
### GET `/api/plantings` → `{ plantings }`

---

## 7. Farms (`/api/farms`)

All `requireSupabaseUser`.

- `GET /` → `{ farms }`
- `POST /` body `{ name, areaValue, areaUnit, location }` → `{ farm }`
- `PATCH /:id`, `DELETE /:id` → `{ ok: true }`
- `GET /:farmId/crops` → `{ crops }`
- `POST /:farmId/crops` body `{ name, plantedDate, harvestDate, areaValue, areaUnit, status }` → `{ crop }`
- `PATCH /:farmId/crops/:cropId`, `DELETE /:farmId/crops/:cropId`
- `POST /seed` body `{ localFarms: [...] }` (≤50) → `{ seeded }`

**Consumer (`src/services/farmSync.ts`)**: `POST /api/farms` and `POST /api/farms/seed`. Field names (`areaValue`, `areaUnit`) match producer destructuring. **MATCH.**

---

## 8. Admin (`/api/admin`, `/admin`)

- `GET /api/admin/summary` → counts (auth `x-admin-token` via `admin.routes`).
- `GET /admin` → HTML page (guarded by token for mutating actions; page checks `x-admin-token` in JS).

---

## 9. Health

- `GET /health` → `{ ok: true, service: 'tawangtani-backend', time }`.

---

## 10. Consumer HTTP client gap

`src/services/api/client.ts` exposes only `postJson` (+ `getBackendUrl`). It does **not**:
- attach Supabase auth headers (so `postJson`-driven calls like `/ai/chat` cannot be used for authed endpoints; mobile chat sync uses raw `fetch` with its own `Authorization`).
- handle typed error bodies uniformly (throws `HTTP n`).
- parse typed responses (callers cast ad-hoc).
- implement GET with query building, retries, or network-state routing (all handled ad-hoc per caller).

This forces duplicated fetch plumbing across `chatSync`, `farmSync`, `catalogSync`, `weatherAlertService`, and `ai/agent` — the root cause of most consumer-side shape drift. A shared typed client (per `target-architecture.md`) is the recommended remediation.

---

## 11. Contract gap ledger (summary)

| # | Endpoint | Segments | Status | Severity |
|---|---|---|---|---|
| C1 | `POST /ai/chat` | backend vs `agent.ts runBackendAgent` | **MISMATCH** — client expects `tool_calls` loop; backend returns `{reply,model,usage}`, runs tools server-side; client `tools` ignored | Critical |
| C2 | `POST /ai/vision` | `context` type `string` vs object | DRIFT (works via JSON.stringify) | Low |
| C3 | `GET /api/products` | catalogSync → `Product[]` | MATCH | — |
| C4 | `/api/chat/*` | chatSync uses raw fetch, ignores response | MATCH (fragile) | Low |
| C5 | `/api/push/weather-alerts` | weatherAlertService | MATCH | — |
| C6 | `/api/market/*` | MarketScreen | MATCH (casing unverified) | Low |
| C7 | `/api/farms/*` | farmSync | MATCH | — |
| C8 | `/ai` vs `/api/ai` | dual mount, same router | RISK (redundant surface) | Low |
| C9 | client `TOOLS` (6) vs backend `TOOL_SCHEMAS` (8) | AI tool registry | DRIFT — `search_knowledge` & `market_price` backend-only; `activity_log` semantics differ | Medium |
