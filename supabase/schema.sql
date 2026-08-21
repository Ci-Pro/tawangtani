-- ============================================================
-- TAWANGTANI — Skema Supabase
-- Tempel & jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1) Katalog produk (baca: semua orang; tulis: hanya service_role/admin)
create table if not exists public.products (
  id                text primary key,
  brand             text not null,
  name              text not null,
  category          text not null check (category in ('pupuk', 'pestisida', 'benih', 'lainnya')),
  formulation       text not null default '',
  active_ingredient text not null default '',
  doses             jsonb not null default '[]'::jsonb,
  warnings          jsonb,
  source            text not null default '',
  verified          boolean not null default false,
  updated_at        timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "products_read_all" on public.products;
create policy "products_read_all"
  on public.products for select
  to anon, authenticated
  using (true);
-- Tidak ada policy INSERT/UPDATE/DELETE → hanya service_role (backend) yang bisa menulis.

-- 2) Audit trail perubahan katalog (sesuai PRD §6)
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  product_id text,
  action     text not null,              -- 'seed' | 'replace' | 'update' | 'delete'
  actor      text not null default 'system',
  detail     jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_read_authenticated" on public.audit_log;
create policy "audit_read_authenticated"
  on public.audit_log for select
  to authenticated
  using (true);

-- 3) Index ringan
create index if not exists products_category_idx on public.products (category);
create index if not exists audit_product_idx on public.audit_log (product_id);
