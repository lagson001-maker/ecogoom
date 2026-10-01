-- Glaze-to-glaze advice: which glazes work well together, which to avoid,
-- and how (one over the other, or mixed in a ratio). Every row needs a source.
--
-- A row is stored once from glaze_id's point of view and read from both
-- sides: "A over B" on A's page is "B under A" on B's page, and a 2:1 mix of
-- A:B reads as 1:2 of B:A.

create table public.glaze_pairings (
  id                   uuid primary key default gen_random_uuid(),
  glaze_id             uuid not null references public.glazes (id) on delete cascade,
  other_glaze_id       uuid not null references public.glazes (id) on delete cascade,
  verdict              text not null check (verdict in ('recommended', 'avoid')),
  -- over: glaze_id on top of other_glaze_id; under: glaze_id beneath; mix: blended in a ratio.
  arrangement          text not null check (arrangement in ('over', 'under', 'mix')),
  ratio_glaze          smallint check (ratio_glaze is null or ratio_glaze between 1 and 20),
  ratio_other          smallint check (ratio_other is null or ratio_other between 1 and 20),
  -- Surface finish quality reported for this combination, 1 (poor) .. 5 (excellent).
  surface_rating       smallint check (surface_rating is null or surface_rating between 1 and 5),
  cone                 smallint check (cone is null or cone between -22 and 14),
  effect_description   text not null check (length(effect_description) between 1 and 2000),
  reason               text check (reason is null or length(reason) <= 1000),
  source_id            uuid references public.sources (id) on delete set null,
  source_url           text,
  verification_status  text not null default 'unverified'
                         check (verification_status in ('unverified', 'community_reported', 'manufacturer_documented', 'personally_tested', 'repeated_test')),
  created_by           uuid default auth.uid() references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (glaze_id <> other_glaze_id),
  check (source_id is not null or source_url is not null),
  -- A ratio only makes sense for a mix, and then both parts are required.
  check (
    (arrangement = 'mix' and ratio_glaze is not null and ratio_other is not null)
    or (arrangement <> 'mix' and ratio_glaze is null and ratio_other is null)
  )
);

create index glaze_pairings_glaze_idx on public.glaze_pairings (glaze_id);
create index glaze_pairings_other_idx on public.glaze_pairings (other_glaze_id);

create trigger glaze_pairings_updated_at before update on public.glaze_pairings
  for each row execute function public.set_updated_at();

alter table public.glaze_pairings enable row level security;

create policy "glaze_pairings: public read" on public.glaze_pairings
  for select to anon, authenticated using (true);
create policy "glaze_pairings: editor insert" on public.glaze_pairings
  for insert to authenticated with check (public.is_editor());
create policy "glaze_pairings: editor update" on public.glaze_pairings
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "glaze_pairings: editor delete" on public.glaze_pairings
  for delete to authenticated using (public.is_editor());
