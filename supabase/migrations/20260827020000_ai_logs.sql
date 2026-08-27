-- ============================================================
-- TAWANGTANI — Migrasi 012: telemetri AI (usage token, model, latency)
-- ============================================================

alter table public.ai_query_log
  add column if not exists prompt_tokens int not null default 0,
  add column if not exists completion_tokens int not null default 0,
  add column if not exists model_used text not null default '',
  add column if not exists latency_ms int not null default 0;

create index if not exists ai_query_log_created_idx on public.ai_query_log (created_at desc);