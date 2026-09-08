-- ============================================================
-- Migrasi 016: Konsistensi tipe user_id (TEXT -> UUID) & RLS lengkap
-- ============================================================
-- Tujuan (temuan audit db D2/D3/D6):
--  - chat_messages, ai_query_log, push_tokens memakai user_id text,
--    sementara farmer_prices/plantings/farms/alerts memakai uuid.
--    Semua nilai yang tersimpan adalah UUID dari auth.users.sub, jadi
--    casting aman (chat_messages user_id retain NOT NULL).
--  - sesuai pola RLS tabel lain: policy memakai auth.uid() tanpa ::text.
--  - push_campaign_log satu-satunya tabel tanpa RLS -> diaktifkan,
--    deny semua role non-service (service_role menembus RLS).
--  - price_alerts belum punya index user_id (audit D6).

-- 1) buang policy yang mereferensikan kolom user_id (Postgres tak bisa alter
--    tipe kolom yang masih dipakai policy: "cannot alter type ... used in a
--    policy definition"), lalu konversi, lalu buat ulang tanpa ::text.
drop policy if exists "chat_own_select" on public.chat_messages;
drop policy if exists "chat_own_insert" on public.chat_messages;
drop policy if exists "chat_own_delete" on public.chat_messages;

alter table public.chat_messages
  alter column user_id type uuid using user_id::uuid;

create policy "chat_own_select" on public.chat_messages
  for select to authenticated using (user_id = auth.uid());
create policy "chat_own_insert" on public.chat_messages
  for insert to authenticated with check (user_id = auth.uid());
create policy "chat_own_delete" on public.chat_messages
  for delete to authenticated using (user_id = auth.uid());

alter table public.ai_query_log
  alter column user_id type uuid using user_id::uuid;

alter table public.push_tokens
  alter column user_id type uuid using user_id::uuid;

alter table public.push_campaign_log
  enable row level security;

create index if not exists price_alerts_user_idx on public.price_alerts (user_id);