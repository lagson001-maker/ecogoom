-- Glaze catalog depth: manufacturer application guidance, a hotlinked official
-- image, and documented results of a single glaze on different clay bodies.
--
-- Images: `image_url` points at the manufacturer's own public image and is
-- displayed with a credit. It is never copied into Storage (copyright);
-- `image_path` remains for images the team owns or has permission to host.

alter table public.glazes
  add column coats_min          smallint check (coats_min is null or coats_min between 1 and 10),
  add column coats_max          smallint check (coats_max is null or coats_max between 1 and 10),
  add column application_notes  text,
  add column image_url          text check (image_url is null or image_url ~ '^https://'),
  add column image_credit       text,
  add constraint glazes_coats_range check (coats_min is null or coats_max is null or coats_min <= coats_max);

comment on column public.glazes.coats_min is 'Manufacturer-recommended coats (lower bound). Null = no statement recorded.';
comment on column public.glazes.image_url is 'Manufacturer-hosted image, hotlinked with credit. Never copied.';

-- One glaze, one clay body, one firing: what it looked like, and who says so.
create table public.glaze_clay_results (
  id                   uuid primary key default gen_random_uuid(),
  glaze_id             uuid not null references public.glazes (id) on delete cascade,
  clay_color           text not null
                         check (clay_color in ('white', 'buff', 'speckled', 'brown', 'red', 'dark', 'porcelain', 'other')),
  clay_body_text       text,
  cone                 smallint check (cone is null or cone between -22 and 14),
  atmosphere           text check (atmosphere is null or atmosphere in ('oxidation', 'reduction', 'neutral', 'wood', 'soda', 'salt', 'raku', 'unknown')),
  coats                smallint check (coats is null or coats between 1 and 10),
  result_description   text not null check (length(result_description) between 1 and 2000),
  image_url            text check (image_url is null or image_url ~ '^https://'),
  image_credit         text,
  -- Provenance is mandatory: either a recorded source or at least a URL.
  source_id            uuid references public.sources (id) on delete set null,
  source_url           text,
  verification_status  text not null default 'unverified'
                         check (verification_status in ('unverified', 'community_reported', 'manufacturer_documented', 'personally_tested', 'repeated_test')),
  created_by           uuid default auth.uid() references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (source_id is not null or source_url is not null)
);

create index glaze_clay_results_glaze_idx on public.glaze_clay_results (glaze_id);

create trigger glaze_clay_results_updated_at before update on public.glaze_clay_results
  for each row execute function public.set_updated_at();

-- Catalog rules: public read, editor write, admin delete.
alter table public.glaze_clay_results enable row level security;

create policy "glaze_clay_results: public read" on public.glaze_clay_results
  for select to anon, authenticated using (true);
create policy "glaze_clay_results: editor insert" on public.glaze_clay_results
  for insert to authenticated with check (public.is_editor());
create policy "glaze_clay_results: editor update" on public.glaze_clay_results
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "glaze_clay_results: editor delete" on public.glaze_clay_results
  for delete to authenticated using (public.is_editor());
