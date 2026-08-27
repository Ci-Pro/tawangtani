-- =====================================================
-- Migration 010: Notifikasi perubahan harga (smart alerts)
-- =====================================================

create table public.price_change_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  expo_token  text not null,
  commodity   text not null,
  province    text not null default 'nasional',
  level       smallint not null default 3,
  threshold   numeric not null default 5,
  last_price  numeric,
  active      boolean not null default true,
  last_fired  timestamptz,
  created_at  timestamptz not null default now()
);

create unique index price_change_unique
  on public.price_change_alerts (user_id, commodity, province, level);

alter table public.price_change_alerts enable row level security;

create policy pca_all_own on public.price_change_alerts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_pca_active on public.price_change_alerts (active) where active = true;
