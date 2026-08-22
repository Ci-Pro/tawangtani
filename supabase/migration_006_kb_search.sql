-- ============================================================
-- TAWANGTANI — Migrasi 006: Pencarian KB semantik OR + ranking
-- ============================================================

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
  with tokens as (
    select distinct w from regexp_split_to_table(
      regexp_replace(lower(q), '[^a-z0-9]+', ' ', 'g'), '\s+'
    ) as w where length(w) >= 2
  ),
  tsq as (
    select to_tsquery('simple', coalesce(nullif(string_agg(w, ' | '), ''), 'tani')) as t from tokens
  )
  select
    c.id,
    c.doc_id,
    d.title,
    c.crop,
    c.topic,
    c.content,
    c.source,
    (
      ts_rank(c.fts, tsq.t) * 3.0
      + coalesce(similarity(lower(c.content), lower(q)), 0)::float
      + case when c.crop <> 'umum' and position(c.crop in lower(q)) > 0 then 0.5 else 0 end
    )::float as score
  from knowledge_chunks c
  join knowledge_docs d on d.id = c.doc_id
  cross join tsq
  where c.fts @@ tsq.t
     or lower(c.content) like '%' || left(regexp_replace(lower(q), '[^a-z0-9 ]+', '', 'g'), 40) || '%'
     or c.content % q
  order by score desc
  limit greatest(1, least(match_count, 10));
$$;

grant execute on function public.search_knowledge(text, int) to anon, authenticated, service_role;
