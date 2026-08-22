-- ============================================================
-- TAWANGTANI — Migrasi 005: Riwayat Harga (untuk grafik)
-- ============================================================

create table if not exists public.market_price_history (
  id         bigserial primary key,
  commodity  text not null,
  province   text not null default 'nasional',
  date       date not null,
  price      integer not null,
  source     text not null default 'snapshot',
  created_at timestamptz not null default now(),
  unique (commodity, province, date)
);

create index if not exists mph_lookup_idx
  on public.market_price_history (commodity, province, date desc);

alter table public.market_price_history enable row level security;
