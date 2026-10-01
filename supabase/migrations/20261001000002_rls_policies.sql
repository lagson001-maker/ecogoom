-- =============================================================================
-- GlazeStack V1 — Row Level Security
--
-- Model
--   * Catalog (brands, series, glazes): public read, editor write, admin delete.
--   * Recipes: public+published readable by anyone (incl. anonymous).
--       Users create PRIVATE recipes only (personal / variation / import).
--       Editors & admins create and edit PUBLIC recipes.
--   * Experiments, inventory, saved, imports, ask requests: owner only.
--   * The service role key is never used by the browser.
-- =============================================================================

-- Can the current user edit this recipe (and its layers / sources / media)?
create or replace function public.can_edit_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and auth.uid() is not null
      and (
        (r.visibility = 'private' and r.created_by = auth.uid())
        or (r.visibility = 'public' and public.is_editor())
      )
  );
$$;

create or replace function public.owns_experiment(p_experiment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.experiments e
    where e.id = p_experiment_id and e.user_id = auth.uid()
  );
$$;

alter table public.profiles          enable row level security;
alter table public.brands            enable row level security;
alter table public.glaze_series      enable row level security;
alter table public.glazes            enable row level security;
alter table public.sources           enable row level security;
alter table public.recipes           enable row level security;
alter table public.recipe_layers     enable row level security;
alter table public.recipe_sources    enable row level security;
alter table public.media_assets      enable row level security;
alter table public.experiments       enable row level security;
alter table public.experiment_layers enable row level security;
alter table public.user_inventory    enable row level security;
alter table public.saved_recipes     enable row level security;
alter table public.import_drafts     enable row level security;
alter table public.ask_requests      enable row level security;

-- profiles --------------------------------------------------------------------

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- catalog ---------------------------------------------------------------------

create policy "brands: public read" on public.brands
  for select to anon, authenticated using (true);
create policy "brands: editor insert" on public.brands
  for insert to authenticated with check (public.is_editor());
create policy "brands: editor update" on public.brands
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "brands: admin delete" on public.brands
  for delete to authenticated using (public.is_admin());

create policy "series: public read" on public.glaze_series
  for select to anon, authenticated using (true);
create policy "series: editor insert" on public.glaze_series
  for insert to authenticated with check (public.is_editor());
create policy "series: editor update" on public.glaze_series
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "series: admin delete" on public.glaze_series
  for delete to authenticated using (public.is_admin());

create policy "glazes: public read" on public.glazes
  for select to anon, authenticated using (true);
create policy "glazes: editor insert" on public.glazes
  for insert to authenticated with check (public.is_editor());
create policy "glazes: editor update" on public.glazes
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "glazes: admin delete" on public.glazes
  for delete to authenticated using (public.is_admin());

-- recipes ---------------------------------------------------------------------

create policy "recipes: read published, own, or editor" on public.recipes
  for select to anon, authenticated
  using (
    (visibility = 'public' and status = 'published')
    or created_by = auth.uid()
    or (visibility = 'public' and public.is_editor())
  );

create policy "recipes: insert private or editor public" on public.recipes
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (visibility = 'private' or public.is_editor())
  );

create policy "recipes: update own private or editor public" on public.recipes
  for update to authenticated
  using (
    (visibility = 'private' and created_by = auth.uid())
    or (visibility = 'public' and public.is_editor())
  )
  with check (
    (visibility = 'private' and created_by = auth.uid())
    or public.is_editor()
  );

create policy "recipes: delete own private or admin" on public.recipes
  for delete to authenticated
  using (
    (visibility = 'private' and created_by = auth.uid())
    or public.is_admin()
  );

-- Layer rows follow the recipe's visibility through nested RLS on recipes.
create policy "recipe_layers: read with recipe" on public.recipe_layers
  for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_layers: write if can edit recipe" on public.recipe_layers
  for insert to authenticated with check (public.can_edit_recipe(recipe_id));
create policy "recipe_layers: update if can edit recipe" on public.recipe_layers
  for update to authenticated
  using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id));
create policy "recipe_layers: delete if can edit recipe" on public.recipe_layers
  for delete to authenticated using (public.can_edit_recipe(recipe_id));

-- sources ---------------------------------------------------------------------

create policy "recipe_sources: read with recipe" on public.recipe_sources
  for select to anon, authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "recipe_sources: insert if can edit recipe" on public.recipe_sources
  for insert to authenticated with check (public.can_edit_recipe(recipe_id));
create policy "recipe_sources: update if can edit recipe" on public.recipe_sources
  for update to authenticated
  using (public.can_edit_recipe(recipe_id)) with check (public.can_edit_recipe(recipe_id));
create policy "recipe_sources: delete if can edit recipe" on public.recipe_sources
  for delete to authenticated using (public.can_edit_recipe(recipe_id));

-- A source is visible if it backs a visible recipe, or it is yours, or you edit.
create policy "sources: read linked, own, or editor" on public.sources
  for select to anon, authenticated
  using (
    exists (select 1 from public.recipe_sources rs where rs.source_id = id)
    or created_by = auth.uid()
    or public.is_editor()
  );
create policy "sources: insert own" on public.sources
  for insert to authenticated
  with check (created_by = auth.uid());
create policy "sources: update own or editor" on public.sources
  for update to authenticated
  using (created_by = auth.uid() or public.is_editor())
  with check (created_by = auth.uid() or public.is_editor());
create policy "sources: delete own or admin" on public.sources
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- media -----------------------------------------------------------------------

create policy "media: read if owner object visible" on public.media_assets
  for select to anon, authenticated
  using (
    created_by = auth.uid()
    or owner_type = 'glaze'
    or (owner_type = 'recipe' and exists (select 1 from public.recipes r where r.id = owner_id))
    or (owner_type = 'experiment' and public.owns_experiment(owner_id))
  );

create policy "media: insert for editable owner" on public.media_assets
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (owner_type = 'glaze' and public.is_editor())
      or (owner_type = 'recipe' and public.can_edit_recipe(owner_id))
      or (owner_type = 'experiment' and public.owns_experiment(owner_id))
      or (owner_type = 'recommendation_reference'
          and exists (select 1 from public.ask_requests a where a.id = owner_id and a.user_id = auth.uid()))
    )
  );

create policy "media: update own or editor" on public.media_assets
  for update to authenticated
  using (created_by = auth.uid() or (owner_type in ('glaze', 'recipe') and public.is_editor()))
  with check (created_by = auth.uid() or (owner_type in ('glaze', 'recipe') and public.is_editor()));

create policy "media: delete own or editor" on public.media_assets
  for delete to authenticated
  using (created_by = auth.uid() or (owner_type in ('glaze', 'recipe') and public.is_editor()));

-- personal data: owner only ---------------------------------------------------

create policy "experiments: owner all" on public.experiments
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "experiment_layers: owner all" on public.experiment_layers
  for all to authenticated
  using (public.owns_experiment(experiment_id))
  with check (public.owns_experiment(experiment_id));

create policy "inventory: owner all" on public.user_inventory
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "saved: owner all" on public.saved_recipes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "imports: owner all" on public.import_drafts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ask: owner all" on public.ask_requests
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Note: derived recipe columns (glaze_ids, layer_count, all_tags, search_doc …)
-- need no column privilege tricks: the BEFORE trigger recomputes them on every
-- insert/update, so client-supplied values are always overwritten.
