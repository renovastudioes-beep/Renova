-- ONYX Studios cloud storage (run in Supabase SQL Editor)
-- Mirrors browser localStorage collections so admin, POS, and client portal share one dataset.

create extension if not exists "pgcrypto";

create table if not exists public.studio_collections (
  workspace_id text not null default 'onyx',
  collection_key text not null,
  data jsonb not null default 'null'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, collection_key)
);

create index if not exists studio_collections_updated_idx
  on public.studio_collections (workspace_id, updated_at desc);

alter table public.studio_collections enable row level security;

-- MVP policy: anon key can read/write studio data.
-- Security today matches the public admin PIN model (URL + access code).
-- Tighten later with Supabase Auth for staff accounts.
drop policy if exists "studio_collections_anon_all" on public.studio_collections;
create policy "studio_collections_anon_all"
  on public.studio_collections
  for all
  to anon, authenticated
  using (true)
  with check (true);