-- =====================================================
-- Migration 011: Multi-user farm profiles
-- =====================================================

create table public.farms (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null default '',
  area_value  numeric not null default 0,
  area_unit   text not null default 'm2',
  location    text not null default '',
  created_at  timestamptz not null default now()
);

create table public.farm_crops (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid not null references public.farms(id) on delete cascade,
  user_id       uuid not null,
  name          text not null default '',
  planted_date  date,
  harvest_date  date,
  area_value    numeric not null default 0,
  area_unit     text not null default 'm2',
  status        text not null default 'active',
  created_at    timestamptz not null default now()
);

alter table public.farms enable row level security;
alter table public.farm_crops enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'farms_all_own') then
    create policy farms_all_own on public.farms
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'farm_crops_all_own') then
    create policy farm_crops_all_own on public.farm_crops
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

create index idx_farms_user on public.farms (user_id);
create index idx_farm_crops_user on public.farm_crops (user_id);
create index idx_farm_crops_farm on public.farm_crops (farm_id);
