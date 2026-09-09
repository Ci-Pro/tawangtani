-- Catatan kesehatan sinkron harga upstream (baris tunggal per kunci).
-- Dipakai dashboard admin & penyesuaian throttle sinkron perangkat.
create table if not exists public.sync_health (
  id text primary key default 'market',
  ok boolean not null default false,
  rows bigint not null default 0,
  provinces text not null default '',
  errors text not null default '',
  ran_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sync_health enable row level security;

-- Tanpa akses publik: hanya service role & admin yang boleh baca/tulis.
-- (Tabel baru tanpa policy = default deny di Supabase.)