-- ============================================================
-- TAWANGTANI — Migrasi 004: Harga Pasar Referensi
-- ============================================================

create table if not exists public.market_prices (
  id          text primary key,              -- "{commodity}|{province}"
  commodity   text not null,
  province    text not null default 'nasional',
  price       integer not null,              -- Rp per unit
  prev_price  integer,
  unit        text not null default 'kg',
  source      text not null default 'seed',
  updated_at  timestamptz not null default now()
);

create index if not exists market_prices_commodity_idx on public.market_prices (commodity);

alter table public.market_prices enable row level security;
