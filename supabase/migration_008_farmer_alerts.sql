-- 008: laporan harga petani + alarm harga
create table if not exists public.farmer_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  commodity text not null,
  province text not null,
  village text not null default '',
  role text not null check (role in ('jual','beli')),
  price numeric not null,
  unit text not null default 'kg',
  note text not null default '',
  status text not null default 'approved',
  created_at timestamptz not null default now()
);
alter table public.farmer_prices enable row level security;
drop policy if exists farmer_prices_insert_own on public.farmer_prices;
create policy farmer_prices_insert_own on public.farmer_prices
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists farmer_prices_read on public.farmer_prices;
create policy farmer_prices_read on public.farmer_prices
  for select to authenticated using (status = 'approved' or user_id = auth.uid());
create index if not exists farmer_prices_lookup on farmer_prices (province, commodity, created_at desc);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  expo_push_token text not null,
  commodity text not null,
  province text not null default 'nasional',
  level smallint not null default 3,
  direction text not null check (direction in ('above','below')),
  target numeric not null,
  active boolean not null default true,
  last_fired_at timestamptz,
  fired_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.price_alerts enable row level security;
drop policy if exists price_alerts_all_own on public.price_alerts;
create policy price_alerts_all_own on public.price_alerts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists price_alerts_active on price_alerts (active);
