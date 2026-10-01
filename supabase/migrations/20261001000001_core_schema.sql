-- =============================================================================
-- GlazeStack V1 — core schema
--
-- Conventions
--   * Controlled vocabularies that are product decisions (role, source type,
--     verification, status, coverage, atmosphere) use CHECK constraints.
--   * Open vocabularies (glaze_type, tags, colors) are plain text / text[] so
--     editors can extend them without a migration.
--   * Layers are stored in application order: layer_position 1 = first coat on
--     the clay, n = top. The UI renders them top-down.
--   * recipes carries a few derived columns (glaze_ids, brand_ids, layer_count,
--     all_tags, search_doc …) maintained by triggers so Discover can filter with
--     plain PostgREST operators and no extra RPC.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'editor', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers are SECURITY DEFINER so policies can call them without
-- recursing through the profiles RLS policies.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- New auth user -> profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile but never their own role.
-- auth.uid() is null for SQL editor / service role sessions, which are trusted.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- brands / series / glazes
-- -----------------------------------------------------------------------------

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  website_url text,
  country     text,
  description text,
  logo_path   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index brands_name_unique on public.brands (lower(name));
create index brands_name_trgm on public.brands using gin (name extensions.gin_trgm_ops);

-- Controlled list of product lines per brand (Potter's Choice, Celadon, …).
create table public.glaze_series (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.brands (id) on delete cascade,
  name        text not null,
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  created_at  timestamptz not null default now(),
  unique (brand_id, slug)
);

create index glaze_series_brand_id_idx on public.glaze_series (brand_id);

create table public.glazes (
  id                            uuid primary key default gen_random_uuid(),
  brand_id                      uuid not null references public.brands (id) on delete restrict,
  series_id                     uuid references public.glaze_series (id) on delete set null,
  product_code                  text,
  name                          text not null,
  slug                          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Open vocabulary: glaze, celadon, shino, flux, wash, crystal, matte, gloss,
  -- satin, crawl, underglaze, other … (see lib/vocabulary.ts)
  glaze_type                    text not null default 'glaze',
  base_color                    text,
  -- Approximate jar/unfired-to-fired hint only; never a fired-color guarantee.
  swatch_hex                    text check (swatch_hex is null or swatch_hex ~ '^#[0-9a-fA-F]{6}$'),
  color_family                  text,
  color_tags                    text[] not null default '{}',
  finish                        text,
  opacity                       text check (opacity is null or opacity in ('transparent', 'translucent', 'semi-opaque', 'opaque')),
  cone_min                      smallint check (cone_min is null or cone_min between -22 and 14),
  cone_max                      smallint check (cone_max is null or cone_max between -22 and 14),
  -- null = no manufacturer statement recorded. Never inferred.
  manufacturer_food_safe_claim  boolean,
  manufacturer_notes            text,
  official_url                  text,
  image_path                    text,
  active                        boolean not null default true,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  check (cone_min is null or cone_max is null or cone_min <= cone_max)
);

create trigger glazes_updated_at before update on public.glazes
  for each row execute function public.set_updated_at();

create index glazes_brand_id_idx on public.glazes (brand_id);
create index glazes_series_id_idx on public.glazes (series_id);
create index glazes_name_idx on public.glazes (lower(name));
create index glazes_product_code_idx on public.glazes (lower(product_code));
create index glazes_name_trgm on public.glazes using gin (name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- sources (provenance)
-- -----------------------------------------------------------------------------

create table public.sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  source_type         text not null default 'unknown'
                        check (source_type in ('manufacturer', 'community', 'personal', 'imported', 'unknown')),
  url                 text,
  author              text,
  source_date         date,
  notes               text,
  -- Strength of evidence this source provides on its own.
  evidence_level      text not null default 'unverified'
                        check (evidence_level in ('unverified', 'community_reported', 'manufacturer_documented', 'personally_tested', 'repeated_test')),
  created_by          uuid references auth.users (id) on delete set null,
  imported_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index sources_type_idx on public.sources (source_type);
create index sources_name_trgm on public.sources using gin (name extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- recipes
-- -----------------------------------------------------------------------------

create table public.recipes (
  id                     uuid primary key default gen_random_uuid(),
  created_by             uuid references auth.users (id) on delete set null,
  -- public: visible to everyone when published. private: personal recipe.
  visibility             text not null default 'public' check (visibility in ('public', 'private')),
  status                 text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  parent_recipe_id       uuid references public.recipes (id) on delete set null,

  title                  text not null,
  slug                   text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description            text,
  cone                   smallint check (cone is null or cone between -22 and 14),
  atmosphere             text check (atmosphere is null or atmosphere in ('oxidation', 'reduction', 'neutral', 'wood', 'soda', 'salt', 'raku', 'unknown')),
  clay_body_text         text,
  clay_color             text check (clay_color is null or clay_color in ('white', 'buff', 'speckled', 'brown', 'red', 'dark', 'porcelain', 'other')),
  application_method     text,
  result_description     text,
  prediction_notes       text,

  -- Visual descriptors (open vocabulary, normalized lowercase)
  dominant_colors        text[] not null default '{}',
  color_tags             text[] not null default '{}',
  surface_tags           text[] not null default '{}',
  effect_tags            text[] not null default '{}',

  -- Physical behavior, 0 (none) – 5 (extreme)
  movement_level         smallint check (movement_level between 0 and 5),
  run_risk               smallint check (run_risk between 0 and 5),
  pinhole_risk           smallint check (pinhole_risk between 0 and 5),
  crawl_risk             smallint check (crawl_risk between 0 and 5),
  opacity                text check (opacity is null or opacity in ('transparent', 'translucent', 'semi-opaque', 'opaque')),

  dinnerware_suitability text not null default 'unknown'
                           check (dinnerware_suitability in ('verified', 'manufacturer_guidance', 'unknown', 'not_recommended')),

  -- Summary of provenance; details live in sources / recipe_sources.
  source_type            text not null default 'unknown'
                           check (source_type in ('manufacturer', 'community', 'personal', 'imported', 'unknown')),
  verification_status    text not null default 'unverified'
                           check (verification_status in ('unverified', 'community_reported', 'manufacturer_documented', 'personally_tested', 'repeated_test')),

  user_rating            numeric(2, 1) check (user_rating is null or user_rating between 0 and 5),

  -- Derived (trigger-maintained). Do not write from the app.
  glaze_ids              uuid[] not null default '{}',
  brand_ids              uuid[] not null default '{}',
  series_names           text[] not null default '{}',
  layer_count            smallint not null default 0,
  glaze_count            smallint not null default 0,
  all_tags               text[] not null default '{}',
  search_doc             text not null default '',

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index recipes_cone_idx on public.recipes (cone);
create index recipes_status_idx on public.recipes (status, visibility);
create index recipes_created_by_idx on public.recipes (created_by);
create index recipes_created_at_idx on public.recipes (created_at desc);
create index recipes_glaze_ids_gin on public.recipes using gin (glaze_ids);
create index recipes_brand_ids_gin on public.recipes using gin (brand_ids);
create index recipes_all_tags_gin on public.recipes using gin (all_tags);
create index recipes_search_doc_trgm on public.recipes using gin (search_doc extensions.gin_trgm_ops);

create table public.recipe_layers (
  id                 uuid primary key default gen_random_uuid(),
  recipe_id          uuid not null references public.recipes (id) on delete cascade,
  glaze_id           uuid not null references public.glazes (id) on delete restrict,
  -- 1 = first layer on the clay, increasing upward.
  layer_position     smallint not null check (layer_position between 1 and 12),
  coat_count         smallint not null default 1 check (coat_count between 1 and 10),
  coverage_percent   smallint check (coverage_percent between 1 and 100),
  coverage_area      text not null default 'full'
                       check (coverage_area in ('full', 'upper_half', 'upper_third', 'rim_only', 'overlap', 'brush_detail', 'custom')),
  application_method text,
  notes              text,
  unique (recipe_id, layer_position)
);

create index recipe_layers_recipe_id_idx on public.recipe_layers (recipe_id);
create index recipe_layers_glaze_id_idx on public.recipe_layers (glaze_id);

create table public.recipe_sources (
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  source_id  uuid not null references public.sources (id) on delete cascade,
  is_primary boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  primary key (recipe_id, source_id)
);

create index recipe_sources_source_id_idx on public.recipe_sources (source_id);

-- Derived recipe columns --------------------------------------------------------

create or replace function public.compute_recipe_derived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_glaze_ids  uuid[];
  v_brand_ids  uuid[];
  v_series     text[];
  v_layers     smallint;
  v_glaze_text text;
begin
  select
    coalesce(array_agg(distinct l.glaze_id), '{}'),
    coalesce(array_agg(distinct g.brand_id), '{}'),
    coalesce(array_agg(distinct lower(s.name)) filter (where s.name is not null), '{}'),
    count(*)::smallint,
    coalesce(string_agg(
      concat_ws(' ', b.name, g.name, g.product_code, s.name, g.glaze_type, g.color_family, array_to_string(g.color_tags, ' ')),
      ' '), '')
  into v_glaze_ids, v_brand_ids, v_series, v_layers, v_glaze_text
  from public.recipe_layers l
  join public.glazes g on g.id = l.glaze_id
  join public.brands b on b.id = g.brand_id
  left join public.glaze_series s on s.id = g.series_id
  where l.recipe_id = new.id;

  new.glaze_ids   := v_glaze_ids;
  new.brand_ids   := v_brand_ids;
  new.series_names := v_series;
  new.layer_count := v_layers;
  new.glaze_count := coalesce(array_length(v_glaze_ids, 1), 0);

  new.dominant_colors := (select coalesce(array_agg(distinct lower(trim(x))), '{}') from unnest(new.dominant_colors) x where trim(x) <> '');
  new.color_tags      := (select coalesce(array_agg(distinct lower(trim(x))), '{}') from unnest(new.color_tags) x where trim(x) <> '');
  new.surface_tags    := (select coalesce(array_agg(distinct lower(trim(x))), '{}') from unnest(new.surface_tags) x where trim(x) <> '');
  new.effect_tags     := (select coalesce(array_agg(distinct lower(trim(x))), '{}') from unnest(new.effect_tags) x where trim(x) <> '');

  new.all_tags := (
    select coalesce(array_agg(distinct t), '{}')
    from unnest(new.dominant_colors || new.color_tags || new.surface_tags || new.effect_tags) t
  );

  new.search_doc := lower(concat_ws(' ',
    new.title, new.description, new.result_description, new.clay_body_text,
    array_to_string(new.all_tags, ' '), v_glaze_text));

  return new;
end;
$$;

create trigger recipes_derived before insert or update on public.recipes
  for each row execute function public.compute_recipe_derived();

create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

-- Any layer change touches the parent recipe so the BEFORE trigger recomputes.
create or replace function public.touch_recipe_from_layer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.recipes set updated_at = now() where id = old.recipe_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.recipe_id <> old.recipe_id) then
    update public.recipes set updated_at = now() where id = new.recipe_id;
  end if;
  return null;
end;
$$;

create trigger recipe_layers_touch after insert or update or delete on public.recipe_layers
  for each row execute function public.touch_recipe_from_layer();

-- Renaming a glaze/brand keeps recipe search text fresh.
create or replace function public.touch_recipes_for_glaze()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recipes set updated_at = now() where new.id = any (glaze_ids);
  return null;
end;
$$;

create trigger glazes_touch_recipes after update of name, product_code, series_id, color_tags, glaze_type on public.glazes
  for each row execute function public.touch_recipes_for_glaze();

-- -----------------------------------------------------------------------------
-- media
-- -----------------------------------------------------------------------------

create table public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  owner_type    text not null check (owner_type in ('glaze', 'recipe', 'experiment', 'recommendation_reference')),
  owner_id      uuid not null,
  bucket        text not null check (bucket in ('public-glaze-assets', 'public-recipe-assets', 'private-user-assets')),
  storage_path  text not null,
  media_type    text not null default 'image' check (media_type in ('image', 'video', 'document')),
  caption       text,
  alt_text      text,
  source_url    text,
  source_credit text,
  is_primary    boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (bucket, storage_path)
);

create index media_assets_owner_idx on public.media_assets (owner_type, owner_id);

-- -----------------------------------------------------------------------------
-- experiments (personal lab notebook)
-- -----------------------------------------------------------------------------

create table public.experiments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id          uuid references public.recipes (id) on delete set null,
  title              text not null,
  status             text not null default 'in_progress'
                       check (status in ('in_progress', 'waiting_firing', 'completed')),
  clay_body          text,
  clay_color         text check (clay_color is null or clay_color in ('white', 'buff', 'speckled', 'brown', 'red', 'dark', 'porcelain', 'other')),
  cone               smallint check (cone is null or cone between -22 and 14),
  atmosphere         text check (atmosphere is null or atmosphere in ('oxidation', 'reduction', 'neutral', 'wood', 'soda', 'salt', 'raku', 'unknown')),
  kiln_notes         text,
  application_notes  text,
  result_notes       text,
  rating             smallint check (rating between 1 and 5),
  success_level      text check (success_level is null or success_level in ('success', 'partial', 'failure')),
  movement_level     smallint check (movement_level between 0 and 5),
  run_risk_observed  smallint check (run_risk_observed between 0 and 5),
  result_tags        text[] not null default '{}',
  favorite           boolean not null default false,
  test_date          date,
  promoted_recipe_id uuid references public.recipes (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger experiments_updated_at before update on public.experiments
  for each row execute function public.set_updated_at();

create index experiments_user_id_idx on public.experiments (user_id, created_at desc);
create index experiments_recipe_id_idx on public.experiments (recipe_id);

create table public.experiment_layers (
  id                 uuid primary key default gen_random_uuid(),
  experiment_id      uuid not null references public.experiments (id) on delete cascade,
  glaze_id           uuid not null references public.glazes (id) on delete restrict,
  layer_position     smallint not null check (layer_position between 1 and 12),
  coat_count         smallint not null default 1 check (coat_count between 1 and 10),
  coverage_percent   smallint check (coverage_percent between 1 and 100),
  coverage_area      text not null default 'full'
                       check (coverage_area in ('full', 'upper_half', 'upper_third', 'rim_only', 'overlap', 'brush_detail', 'custom')),
  application_method text,
  notes              text,
  unique (experiment_id, layer_position)
);

create index experiment_layers_experiment_id_idx on public.experiment_layers (experiment_id);
create index experiment_layers_glaze_id_idx on public.experiment_layers (glaze_id);

-- -----------------------------------------------------------------------------
-- inventory / saved
-- -----------------------------------------------------------------------------

create table public.user_inventory (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  glaze_id       uuid not null references public.glazes (id) on delete cascade,
  quantity_note  text,
  in_stock       boolean not null default true,
  favorite       boolean not null default false,
  notes          text,
  updated_at     timestamptz not null default now(),
  unique (user_id, glaze_id)
);

create trigger user_inventory_updated_at before update on public.user_inventory
  for each row execute function public.set_updated_at();

create index user_inventory_user_id_idx on public.user_inventory (user_id);

create table public.saved_recipes (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index saved_recipes_recipe_id_idx on public.saved_recipes (recipe_id);

-- -----------------------------------------------------------------------------
-- import drafts (Import -> Review -> Save)
-- -----------------------------------------------------------------------------

create table public.import_drafts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status          text not null default 'draft' check (status in ('draft', 'approved', 'discarded')),
  source_url      text,
  source_name     text,
  source_author   text,
  source_type     text not null default 'community'
                    check (source_type in ('manufacturer', 'community', 'personal', 'imported', 'unknown')),
  raw_text        text,
  image_path      text,
  notes           text,
  -- AI suggestion (unconfirmed). Shape: lib/types ImportExtraction.
  extracted       jsonb,
  recipe_id       uuid references public.recipes (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger import_drafts_updated_at before update on public.import_drafts
  for each row execute function public.set_updated_at();

create index import_drafts_user_id_idx on public.import_drafts (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- ask requests (history + owner for reference images)
-- -----------------------------------------------------------------------------

create table public.ask_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  query_text     text,
  constraints    jsonb not null default '{}',
  image_path     text,
  visual_intent  jsonb,
  result_ids     uuid[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index ask_requests_user_id_idx on public.ask_requests (user_id, created_at desc);

-- Phase 2 (pgvector) is intentionally NOT enabled here. See
-- supabase/phase2/recipe_embeddings.sql for the additive migration.
