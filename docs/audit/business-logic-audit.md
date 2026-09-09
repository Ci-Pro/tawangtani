# Business Logic Audit

A catalog of the **business rules** currently implemented in TAWANGTANI, grouped by domain, with the exact thresholds and where each rule lives. The goal is to make borrowing logic explicit, surface **duplicated logic that has drifted** (same concept, different thresholds across layers), and note rules that are **implicit or under-specified**.

Legend:
- **Pure** — no I/O, unit-testable in isolation.
- **I/O-coupled** — embedded in a fetch/DB/transport function.
- **Drift** — same concept with different values/behavior in two layers.
- **Implicit** — not clearly defined or only known via code reading.

---

## 1. Area / unit conversion (`src/utils/format.ts`, calculators, backend executors)

| Rule | Value | Location |
|---|---|---|
| Area labels | `m2`, `are` (100 m²), `ha` (10,000 m²) | `format.ts` `AREA_UNITS`; backend `AREA_TO_M2 = {m2:1, are:100, ha:10000}` (`executors.ts:41`) |
| Area → ha | `value/10000` for ha; are→ha via ×100/10000 | `areaToHa` (client), `executors.ts:137` |
| Area → m² | `areaToM2` (client) | `format.ts` |
| `assertPositive` | throws if value ≤ 0 or non-finite | `format.ts` (client), `executors.ts:37` (backend) |

**Drift note:** Two separate implementations of area arithmetic exist (client `format.ts`/calculators and backend `executors.ts`). They agree on the m²/are/ha factors today, but no shared constant enforces it. `AreaUnit` union type (`'m2'|'are'|'ha'`) is duplicated across the calculators and backend schema enums.

---

## 2. Fertilizer calculator

### Client `src/features/fertilizer/calculator.ts` (Pure)
- Dose units: `kg/ha`, `g/m2`, `kg/m2`, `g/ha`, `ton/ha`.
- Conversion to `kg/ha`:
  - `kg/ha` → ×1
  - `g/m2` → `dose * 10` (explicit special case; the `DOSE_TO_KG_PER_HA` table also has `g/m2: (d) => (d*1)/1` which is unused/incorrect, overridden by the explicit branch)
  - `kg/m2` → ×10000
  - `g/ha` → ÷1000
  - `ton/ha` → ×1000
- `totalKg = areaHa * dosePerHaKg`; optional `gridCount > 1` splits `totalKg / floor(gridCount)`.
- Returns `totalG = totalKg * 1000`, formula string.

### Backend `executors.ts` `fertilizer_calculator` (I/O-coupled tool)
- Same conversions re-implemented inline (`executors.ts:138-139`): `g/m2` ×10, `kg/m2` ×10000, `g/ha` ÷1000, `ton/ha` ×1000.
- Grid: `totalKg / gridCount` when `gridCount > 1`.

**→ DRIFT (low).** Two copies of the conversion table with a dead `g/m2: (d) => d` entry in `DOSE_TO_KG_PER_HA` (client). The backend copy and client copy should share one pure implementation (per `target-architecture.md`).

---

## 3. Pesticide calculator

### Client `src/features/pesticide/calculator.ts` (Pure)
- Dose units: `mL/L`, `g/L` (concentration) vs `mL/ha`, `g/ha`, `L/ha`, `kg/ha` (per-area).
- For concentration units (`mL/L`/`g/L`): requires `waterRateLPerHa > 0`; `totalWaterL = waterRateLPerHa * areaHa`; `productTotal = dose * totalWaterL` (mL or g).
- For per-area units: `productTotal = dose * areaHa`.
- `tanksNeeded = max(1, ceil(totalWaterL / tankVolumeL))`; `productPerTank = productTotal / tanks`.
- Big-unit promotion: if `productTotal >= 1000` → L (volume) or kg (mass), else mL/g.

### Backend `executors.ts` `pesticide_calculator` (I/O-coupled tool)
- Same: `totalWaterL = waterRate * areaHa` (default `waterRateLPerHa = 600`); `tanks = max(1, ceil(totalWaterL/tankVolumeL))`; concentration detected by `doseUnit.endsWith('/L')`; unit small by `doseUnit.startsWith('g')`; `productTotal = isConcentration ? dose*totalWaterL : dose*areaHa`.

**Notable behavior differences:**
- Backend default `waterRateLPerHa = 600` when absent; client **throws** if absent for concentration units and requires explicit water-rate for per-area units too (client `pesticide/calculator.ts:71-73` requires `waterRateLPerHa` non-empty even for per-area; backend uses default 600). So the same logical operation yields different results if the water-rate arg is omitted.
- Unit promotion (`productTotal >= 1000` → L/kg) exists **only in client**; backend always returns mL/g.

**→ DRIFT (medium).** Identical domain concept with different defaults and output-unit promotion. Also, the backend tool only accepts the `mL/L`/`g/L`/etc. semantics loosely derived from string suffixes, unlike the client's explicit `PesticideDoseUnit` union.

---

## 4. Spray / weather suitability (two implementations)

### Client `src/services/weather/openMeteo.ts` `sprayCondition` (Pure)
| Condition | Rule | Result |
|---|---|---|
| wind `> 15` km/h | → `hindari` | |
| wind `> 10` | → `hati-hati` | |
| precipitation `> 0.5` mm | → `hindari` | |
| precipitation `> 0` | → `hati-hati` (if ideal) | |
| temp `> 32` °C | → `hati-hati` (if ideal) | |

### Backend `backend/src/tools/executors.ts` `weatherSummary` (I/O-coupled tool)
| Condition | Rule | Result |
|---|---|---|
| wind `> 15` | → `HINDARI` | |
| wind `> 10` | → `HATI-HATI` | |
| precipitation `> 0.5` | → `HINDARI` | |
| precipitation `> 0` | → `HATI-HATI` (if ideal) | |
| temp `> 32` | → `HATI-HATI` (if ideal) | |

**→ DUPLICATED (identical thresholds).** Same thresholds, two copies (client pure + backend tool). This is a good candidate for extraction to a shared pure module. Backend caches weather 10 min (`WEATHER_TTL_MS`); client caches 30 min (`WEATHER_CACHE_TTL_MS`).

Weather-code classification also duplicated: client `describeWeatherCode` (openMeteo) vs backend `weatherSummary` which does not map WMO codes to descriptions (backend omits weather-code→label mapping; uses temperature/wind/precipitation only).

---

## 5. Weather alerts (`backend/src/services/weatherAlerts.ts`)

Thresholds for daily forecasts (3 forecast days), applied per date `>= today`; returns `alerts.slice(0, 6)`.

| Alert type | Severity | Condition |
|---|---|---|
| `hujan_lebat` | `siaga` | rain ≥ 50 mm |
| `hujan_lebat` | `waspada` | rain ≥ 20 mm (and < 50) |
| `angin_kencang` | `siaga` | wind ≥ 30 km/h |
| `angin_kencang` | `waspada` | wind ≥ 20 and < 30 km/h |
| `suhu_ekstrem` | `siaga` | `tmax ≥ 36` °C |
| `suhu_ekstrem` | `waspada` | `tmin ≤ 10` °C |

Used by:
- `GET /api/push/weather-alerts` (on-demand).
- Cron weather-push job — sends push **only** for `severity === 'siaga'` (serious), up to 200 devices, body truncated to 350 chars.

**Note:** The `siaga`/`waspada` nomenclature and the rain/wind/temp thresholds are business rules defined in one file; the cron push filtering ("only siaga") is a separate decision layered on top.

---

## 6. Market price business rules

### 6.1 Sanity limits (`backend/src/services/priceSanity.ts`)
Per-commodity `PRICE_LIMITS {min, max, unit?}` (all per kg unless overridden):
- **Cereals:** GKP 3000–15000, GKG 4000–18000, beras medium 7000–25000, beras premium 9000–30000, beras SPHP 6000–22000, jagung pipilan 3000–15000, kedelai 8000–25000.
- **Chili:** rawit merah 12000–300000, rawit hijau 10000–200000, merah besar 12000–200000, keriting 12000–200000, hijau besar 5000–100000.
- **Bawang:** merah 12000–120000, putih 15000–80000, bombay 12000–60000, daun 5000–30000.
- **Sayur:** tomat 3000–60000, kentang 6000–40000, wortel 5000–30000, kol 2000–25000, kacang panjang 4000–30000, kangkung/sawi 2000–30000.
- **Buah:** jeruk 5000–30000, pisang 3000–25000.
- **Lain:** gula 12000–25000, minyak goreng curah 10000–30000(L), kemasan 12000–50000(L), terigu 7000–25000, telur 18000–45000, ayam broiler 20000–60000, sapi 90000–250000.
- **Ikan:** kembung 18000–90000, bandeng/tongkol 12000–90000, lele 12000–60000, nila 15000–60000, teri 25000–150000, udang 45000–300000.
- **Pupuk:** urea/NPK/SP36 1500–25000, ZA 1500–20000.
- **Non-food units:** LPG 3kg 12000–40000/tabung, LPG 12kg 160000–500000, semen 500–5000, mie 1000–10000/bungkus, garam 3000–30000, susu bubuk 20000–100000/kaleng, susu kemanis 6000–30000/kaleng.

Fallback (commodity not in list): price must be `500 ≤ p ≤ 10_000_000`.

**`sanitizePrice()`** returns null (reject) if outside range or non-finite; else `Math.round(price)`.

**Drift note:** `backend/scripts/sanitize-prices.mjs` carries a **copy** of these `LIMITS`. If they diverge, price cleaning differs between the script path and the API path. (See also the triplicated sync logic.)

### 6.2 Trend classification & guidance (`backend/src/services/marketData.ts`)
- `changePct = ((price - prev_price)/prev_price)*100` when `prev_price > 0`, rounded to 0.1%.
- `trend`: `naik` if `changePct > 2`; `turun` if `changePct < -2`; else `stabil`.
- `guidanceFor(v)`:
  - Naik → positive signal for sellers, "jual bertahap".
  - Turun → "jual cepat jika mudah busuk; tahan jika awet".
  - Stabil → "jual sesuai kebutuhan".

### 6.3 Market history bucketing (`backend/src/services/marketHistory.ts`)
- Snapshot today idempotent per (commodity, province, level, date) — `upsertHistory`.
- Series lookback: daily → 30 days; weekly → 12 weeks; monthly → 24 months; yearly → 5 years.
- Bucketing: daily = raw rows; weekly = Monday-start week key (`(day+6)%7`); monthly label `Mon YY`; yearly = year.
- Each bucket: `{label, avg, min, max, close}` (close = last value in bucket).

### 6.4 Farmer price report auto-moderation (`backend/src/routes/market.routes.ts:241`)
- Role: `jual` (petani price, ref level=1) or `beli` (kios, ref level=3).
- `status='approved'` by default; if official ref `> 0`, `pending` when `price/ref < 0.4` or `> 2.5`.
- `market.routes` `/report` also requires `sanitizePrice` to pass (else `400`).
- Admin moderation columns `farmer_prices.moderated_at` / `moderation_note` added in `20260829060000_admin_ops.sql`.

### 6.5 Ingest validation (`/api/market/ingest`)
- Only rows whose `commodity` is in `KNOWN_COMMODITIES` and price is finite numeric are accepted.
- Price normalized via `sanitizePrice`; level default 3 (or body level).
- Area/province strings truncated (province ≤ 40 chars, lowercased).

### 6.6 Price value restrictions (`/api/push/alerts`)
- `target` must be 500–10,000,000 (else `400`).
- Change-alert `threshold` clamped to 1–50 (default 5) percent.

---

## 7. AI agent rules (two agents)

### 7.1 Backend agent (`backend/src/services/agent.ts`)
- `MAX_ITERATIONS = 7`; last iteration forces answer (no more tool calls).
- `MAX_TOOL_RESULT_CHARS = 3000` (tool results truncated into context).
- `MAX_INPUT_TOKENS = 24000` input budget; `budgetMessages` prunes (`maxMessageChars` 6000).
- Tool-name resolution: exact → `TOOL_ALIASES` (e.g. `harga`→`market_price`, `produk`→`product_search`, `cuaca`→`get_weather`) → levenshtein ≤ 2.
- `parseToolArgs` repairs common Python-ish / typo JSON (single quotes, trailing commas, `True/False/None`).
- Directive fallback: if model emits `{"tool": "name", "arguments": {...}}` or "will check" language, switch to prompt-directive mode.
- Native tool-call mode initially `required` on iteration 1, then `auto`; falls back to directive prompt if broken.
- Consumption capped by quota middleware (default 100 queries/24h, `ai.routes.ts:42`).
- Usage tokens summed across iterations for logging to `ai_query_log`.

### 7.2 Mobile offline agent (`src/services/ai/agent.ts` `runOfflineAgent`)
- Deterministic keyword routing (no LLM): greeting, cuaca, pupuk (≥2 numbers), reminder, catat aktivitas, pestisida, produk, lahan, hama/penyakit.
- `MAX_ITERATIONS = 5` in `runBackendAgent` (client-side loop — dead against real backend, see `api-contract-audit.md` C1).

**→ DRIFT (significant):** Two independent "agents" with different tool sets, prompt policies, and iteration budgets. The client one is used only in offline mode; the backend one is authoritative in connected mode.

---

## 8. Plantings (agronomy) validation (`backend/src/routes/plantings.routes.ts`)

- `commodity`: `^[a-z_]{3,40}$`.
- `plantedAt`: `YYYY-MM-DD`.
- `harvestDays`: 20–1500.
- `area`: `> 0` and ≤ 100,000.
- `yieldKgPerHa`, `costTotal`: clamped `>= 0` (rounded).
- `status` transitions (PATCH): `active`|`harvested`|`failed`.
- Reminders: array of `{hst, label}`.

**Planting reminders (HST) cron (`push.routes.ts` `runPlantingReminders`):**
- For each pending reminder where `currentHST >= reminder.hst` → push; mark fired.
- Harvest notification: once per planting when `hst >= harvest_days` and `harvest_notified` false → push; set flag.
- Computed `hst = floor((today - planted_at)/86400000)`.

---

## 9. Push / notification decisions (`backend/src/routes/push.routes.ts`)

- **Register:** `expoToken` must `startsWith('ExpoPushToken')`; optional user; coords default 0.
- **Weather push cron:** only tokens with `lat !== 0 || lon !== 0`; only `severity === 'siaga'` alerts; max 200 devices; body truncated 350 chars.
- **Price alert job:** once fired → alert deactivated (`markAlertFired`); only when direction match (`above`: `price >= target`; `below`: `price <= target`); max 1000 evaluated, 90 messages batch.
- **Price change job:** `pctChange = |price - last_price|/last_price*100`; fires when `>= threshold`; updates `last_price` via `markPriceChangeAlertFired`; max 90 messages.
- **Cron secret:** `config.cronSecret` required (`Bearer` header) for cron routes; absent secret → all cron routes fail closed (401).

---

## 10. Price sync topology (most fragmented domain)

Kemtan/Kemendag price sync exists in four places; each has its own copy of matching maps and a distinct target:

1. `backend/src/services/marketData.ts` — `refreshPrices()` runs fetchers sequentially: `kemtan-panelharga` → `panelharga-v2` (needs `BAPANAS_API_KEY`) → `panelharga-bapanas`. Kemtan fetch with 3 attempts / exponential backoff / 20 s timeout; maps via `KEMTAN_MAP` (6 commodities, levels 1/3). Also has a `JAVA proxy`-style recursive `panelharga-v2` walker.
2. `backend/scripts/sync-prices.mjs` — standalone script (Kemtan, UA `TAWANGTANI-sync/1.0`, `PROVINCE_CODES`, `COMMODITY_DEFS`).
3. `backend/scripts/sync-kemendag.mjs` — Kemendag `report/api` with `VARIANT_MAP` (commodity+priority).
4. `supabase/functions/sync-prices/index.ts` and `supabase/functions/sync-kemendag/index.ts` — **edge function copies** of (2) and (3), each with their own commodity/province maps.

Mobile also has a crowd-sourcing variant: `src/services/kemtanSync.ts` fetches the same Kemtan endpoint (3 levels, fuzzy `COMMODITY_DEFS` matching, one-row-used-once rule) and POSTs to `/api/market/ingest`, throttled **once per ~20 hours per province per device**.

**→ HIGH RISK:** same upstream, multiple bespoke scrapers and commodity names, all drift-prone (`file-inventory.md` §6, `type-audit.md`).

---

## 11. Commodity / province matching (`backend/src/services/commodityMatch.ts`, `provinceMatch.ts`)

- `resolveCommodity` maps aliases/synonyms → canonical slug (e.g. `gkp` → `gabah_kering_panen`).
- `resolveProvince` maps aliases (e.g. `jogja` → `D.I. Yogyakarta`).
- Both used by market endpoints (driver: tolerate layman terms).
- Province codes (38 provinces) are duplicated in mobile `kemtanSync.ts` `PROVINCE_CODES`, backend scripts, and edge functions.

**→ DUPLICATED.** The mobile `PROVINCE_CODES` and the backend/edge copies must stay in sync manually across diverging upstream endpoints.

---

## 12. Mobile catalog sync (`src/services/catalogSync.ts`)

- Throttle: `MIN_INTERVAL_MS = 6h` (`force` bypasses).
- Requires configured backend URL; if none → no-op.
- If `json.products` empty → treat as failure (does not replace local).
- On success replaces the whole `useProductStore` catalog and records `last_sync`.

---

## 13. Checkout / AI quip: `activity_log` dual persistence

- **Client** `tools.ts` `activity_log`: writes via `useActivityStore.add(...)` (device-local), field `note: 'Dicatat oleh AI Tani'`, `source: 'ai'`, only if activity in allowed set else `'lainnya'`.
- **Backend** `executors.ts` `activity_log`: if `ctx.userId` present, writes to `farm_activities` (`insertFarmActivity`); else returns a "recorded" (non-persisted) summary.

**→ DRIFT (semantic).** The same tool name persists to two different backends with different validation; type `ActivityType` union vs backend free-string `activity`. This affects where an activity is recoverable from.

---

## 14. Business-logic cross-cutting summary

| Domain | Pure? | Duplicated count | Drift severity |
|---|---|---|---|
| Area conversion | client pure + backend tool | 2 | low |
| Fertilizer calc | client pure + backend tool | 2 | low (dead `g/m2` entry) |
| Pesticide calc | client pure + backend tool | 2 | **medium** (defaults/promotion differ) |
| Spray condition | client pure + backend tool | 2 | low (identical thresholds; 10 vs 30 min cache) |
| Weather alerts | backend only | 1 | — |
| Price sanity limits | backend + `sanitize-prices.mjs` | 2 | **medium** (drift risk) |
| Market trend/guidance | backend only | 1 | — |
| Market history buckets | backend only | 1 | — |
| Farmer report moderation | backend route | 1 | — |
| AI agent | backend agent + client offline agent | 2 | **high** (divergent semantics) |
| Price sync | backend + 2 scripts + 2 edge fns + mobile ingest | **5** | **high** |
| Commodity/province matching | backend services + mobile codes + scripts | multiple | **high** |
| `activity_log` | client zustand + backend DB | 2 | **medium** |

### Recommended consolidations (→ `target-architecture.md`)
1. Extract **pure calculators + spray logic + area conversion** into a shared `packages/contracts` / `packages/domain` module reused by mobile, backend tools, and edge functions.
2. Unify **pesticide/fertilizer calculator defaults** and pour the same pure function into the backend tool and client — eliminating silent numeric differences.
3. Collapse **price sanity limits** into one shared module (currently duplicated in `priceSanity.ts` and `sanitize-prices.mjs`).
4. Consolidate **price sync** to one implementation (preferably the edge functions or backend service) and one commodity/province source of truth, killing the script/edge duplication.
5. Decide one authoritative **`activity_log`** persistence path and type.
6. Keep weather-alert thresholds centralized (they already are), but share the pure `sprayCondition` between client and backend.
