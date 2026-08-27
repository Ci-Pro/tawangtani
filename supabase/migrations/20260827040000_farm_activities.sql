-- ============================================================
-- TAWANGTANI — Migrasi 014: farm_activities (log aktivitas AI/P4)
-- ============================================================

create table if not exists public.farm_activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  activity     text not null,
  product_name text not null default '',
  dose_text    text not null default '',
  date         date not null default current_date,
  note         text not null default '',
  source       text not null default 'manual',
  created_at   timestamptz not null default now()
);

alter table public.farm_activities enable row level security;

drop policy if exists farm_activities_all_own on public.farm_activities;
create policy farm_activities_all_own on public.farm_activities
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists farm_activities_user_date_idx on public.farm_activities (user_id, date desc);