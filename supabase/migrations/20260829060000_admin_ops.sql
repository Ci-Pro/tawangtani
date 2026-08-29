-- ============================================================
-- Migrasi 015: Operasi admin
-- - farmer_prices: catatan moderasi (note penolakan + waktu)
-- - push_campaign_log: ledger kampanye notifikasi massal admin
-- ============================================================

alter table public.farmer_prices add column if not exists moderation_note text not null default '';
alter table public.farmer_prices add column if not exists moderated_at timestamptz;

create table if not exists public.push_campaign_log (
  id          bigserial primary key,
  title       text not null,
  body        text not null,
  targets     int  not null default 0,
  sent        int  not null default 0,
  failed      int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists push_campaign_log_idx on public.push_campaign_log (created_at desc);