-- 009: tanamanku (HST, biaya) + pengingat push
create table if not exists public.plantings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  commodity text not null,
  name text not null default '',
  area numeric not null default 0,
  planted_at date not null,
  harvest_days int not null default 90,
  yield_kg_per_ha numeric not null default 0,
  cost_total numeric not null default 0,
  status text not null default 'active',
  harvest_notified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.plantings enable row level security;
drop policy if exists plantings_all_own on public.plantings;
create policy plantings_all_own on public.plantings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists plantings_active on plantings (status);

create table if not exists public.planting_reminders (
  id uuid primary key default gen_random_uuid(),
  planting_id uuid not null references public.plantings(id) on delete cascade,
  user_id uuid not null,
  hst int not null,
  label text not null default '',
  fired boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.planting_reminders enable row level security;
drop policy if exists planting_reminders_all_own on public.planting_reminders;
create policy planting_reminders_all_own on public.planting_reminders
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists planting_reminders_pending on planting_reminders (fired);
