-- ============================================================
-- TAWANGTANI — Migrasi 013: RAG semantik (pgvector)
-- ============================================================

create extension if not exists vector;

alter table public.knowledge_chunks
  add column if not exists embedding vector(768);

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Pencarian hibrida: kemiripan semantik (cosine) + trigram leksikal.
-- qvec dikirim sebagai teks "[0.1,0.2,...]" lalu di-cast ke vector.
create or replace function public.search_knowledge_vec(q text, qvec text, match_count int default 5)
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
  with scored as (
    select
      c.id,
      1 - (c.embedding <=> qvec::vector) as cosine,
      coalesce(similarity(lower(c.content), lower(q)), 0) as trigram
    from knowledge_chunks c
    where c.embedding is not null
  ),
  ranked as (
    select * from scored
    order by (cosine * 4.0 + trigram) desc
    limit greatest(1, least(match_count, 10))
  )
  select
    r.id,
    c.doc_id,
    d.title,
    c.crop,
    c.topic,
    c.content,
    c.source,
    (r.cosine * 4.0 + r.trigram)::float as score
  from ranked r
  join knowledge_chunks c on c.id = r.id
  join knowledge_docs d on d.id = c.doc_id
  order by score desc;
$$;

grant execute on function public.search_knowledge_vec(text, text, int) to anon, authenticated, service_role;