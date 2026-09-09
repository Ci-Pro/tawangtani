-- ============================================================
-- TAWANGTANI — farm_activities: kolom sinkron lintas perangkat
-- ============================================================

alter table public.farm_activities
  add column if not exists done boolean not null default false,
  add column if not exists crop_label text not null default '',
  add column if not exists remind_at timestamptz null;

create index if not exists farm_activities_done_idx
  on public.farm_activities (user_id, done) where done = true;