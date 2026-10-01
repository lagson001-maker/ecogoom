-- =============================================================================
-- PHASE 2 (not applied in V1). Move into supabase/migrations/ when you are
-- ready for semantic search. The V1 app never depends on this.
--
-- Embeddings live in a side table so the core schema stays unchanged and the
-- model/dimension can be swapped by re-creating this table.
-- =============================================================================

create extension if not exists vector with schema extensions;

create table public.recipe_embeddings (
  recipe_id   uuid primary key references public.recipes (id) on delete cascade,
  model       text not null,
  content     text not null,              -- the text that was embedded
  embedding   extensions.vector(1024) not null,
  updated_at  timestamptz not null default now()
);

create index recipe_embeddings_hnsw on public.recipe_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.recipe_embeddings enable row level security;

-- Readable whenever the recipe itself is readable (nested RLS on recipes).
create policy "embeddings: read with recipe" on public.recipe_embeddings
  for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));
-- Writes happen from a server job with the service role (bypasses RLS).

create or replace function public.match_recipes(p_embedding extensions.vector(1024), p_limit int default 20)
returns table (recipe_id uuid, similarity float)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select e.recipe_id, 1 - (e.embedding <=> p_embedding) as similarity
  from public.recipe_embeddings e
  join public.recipes r on r.id = e.recipe_id
  order by e.embedding <=> p_embedding
  limit p_limit;
$$;
