-- ============================================================
-- TAWANGTANI — Migrasi 003: Token Push Notifikasi Cuaca
-- ============================================================

create table if not exists public.push_tokens (
  expo_token    text primary key,
  user_id       text,
  lat           double precision not null default 0,
  lon           double precision not null default 0,
  location_name text not null default '',
  updated_at    timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
-- Tulis/baca hanya lewat service_role (backend)
