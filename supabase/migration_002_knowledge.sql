-- ============================================================
-- TAWANGTANI — Migrasi 002: Knowledge Base (RAG), Chat Sync,
-- dan Audit Log AI
-- Jalankan di Supabase Dashboard → SQL Editor, atau otomatis
-- via Management API oleh skrip setup.
-- ============================================================

create extension if not exists pg_trgm;

-- ---------- KNOWLEDGE BASE ----------
create table if not exists public.knowledge_docs (
  id          text primary key,
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id       bigserial primary key,
  doc_id   text not null references public.knowledge_docs(id) on delete cascade,
  crop     text not null default 'umum',
  topic    text not null default 'umum',
  content  text not null,
  source   text not null default '',
  -- Kolom pencarian full-text, terisi otomatis
  fts      tsvector generated always as (to_tsvector('simple', content)) stored
);

create index if not exists knowledge_chunks_fts_idx on public.knowledge_chunks using gin (fts);
create index if not exists knowledge_chunks_trgm_idx on public.knowledge_chunks using gin (content gin_trgm_ops);
create index if not exists knowledge_chunks_doc_idx on public.knowledge_chunks (doc_id);
create index if not exists knowledge_chunks_crop_idx on public.knowledge_chunks (crop);

alter table public.knowledge_docs enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "kb_read_all" on public.knowledge_docs;
create policy "kb_read_all" on public.knowledge_docs for select to anon, authenticated using (true);
drop policy if exists "kbc_read_all" on public.knowledge_chunks;
create policy "kbc_read_all" on public.knowledge_chunks for select to anon, authenticated using (true);
-- Tulis hanya lewat service_role (backend/admin)

-- Pencarian hybrid: full-text rank + kemiripan trigram
create or replace function public.search_knowledge(q text, match_count int default 5)
returns table (
  id      bigint,
  doc_id  text,
  title   text,
  crop    text,
  topic   text,
  content text,
  source  text,
  score   float
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.doc_id,
    d.title,
    c.crop,
    c.topic,
    c.content,
    c.source,
    (
      ts_rank(c.fts, websearch_to_tsquery('simple', q)) * 3.0
      + coalesce(similarity(lower(c.content), lower(q)), 0)::float
      + case when c.crop <> 'umum' and position(c.crop in lower(q)) > 0 then 0.5 else 0 end
    )::float as score
  from knowledge_chunks c
  join knowledge_docs d on d.id = c.doc_id
  where c.fts @@ websearch_to_tsquery('simple', q)
     or c.content % q
  order by score desc
  limit greatest(1, least(match_count, 10));
$$;

grant execute on function public.search_knowledge(text, int) to anon, authenticated, service_role;

-- ---------- SINKRONISASI CHAT ----------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id    text not null,
  role       text not null check (role in ('user', 'assistant', 'system')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_session_idx on public.chat_messages (user_id, session_id);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_own_select" on public.chat_messages;
create policy "chat_own_select" on public.chat_messages for select
  to authenticated using (user_id = auth.uid()::text);
drop policy if exists "chat_own_insert" on public.chat_messages;
create policy "chat_own_insert" on public.chat_messages for insert
  to authenticated with check (user_id = auth.uid()::text);
drop policy if exists "chat_own_delete" on public.chat_messages;
create policy "chat_own_delete" on public.chat_messages for delete
  to authenticated using (user_id = auth.uid()::text);

-- ---------- AUDIT LOG AI (PRD §7) ----------
create table if not exists public.ai_query_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    text,
  question   text not null,
  iterations int not null default 0,
  model      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ai_query_log enable row level security;
-- Tanpa policy: hanya service_role (backend) yang menulis/membaca
