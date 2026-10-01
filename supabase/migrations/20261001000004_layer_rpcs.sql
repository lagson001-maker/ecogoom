-- =============================================================================
-- Atomic layer replacement. SECURITY INVOKER: the caller's RLS policies apply,
-- so these can only touch recipes/experiments the caller may edit.
--
-- p_layers: JSON array ordered bottom -> top:
--   [{ "glaze_id": uuid, "coat_count": int, "coverage_area": text,
--      "coverage_percent": int|null, "application_method": text|null, "notes": text|null }]
-- =============================================================================

create or replace function public.replace_recipe_layers(p_recipe_id uuid, p_layers jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.can_edit_recipe(p_recipe_id) then
    raise exception 'Not allowed to edit this recipe' using errcode = '42501';
  end if;

  delete from public.recipe_layers where recipe_id = p_recipe_id;

  insert into public.recipe_layers
    (recipe_id, glaze_id, layer_position, coat_count, coverage_area, coverage_percent, application_method, notes)
  select
    p_recipe_id,
    (l ->> 'glaze_id')::uuid,
    ord::smallint,
    coalesce((l ->> 'coat_count')::smallint, 1),
    coalesce(l ->> 'coverage_area', 'full'),
    nullif(l ->> 'coverage_percent', '')::smallint,
    nullif(l ->> 'application_method', ''),
    nullif(l ->> 'notes', '')
  from jsonb_array_elements(p_layers) with ordinality as t(l, ord);
end;
$$;

create or replace function public.replace_experiment_layers(p_experiment_id uuid, p_layers jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.owns_experiment(p_experiment_id) then
    raise exception 'Not allowed to edit this experiment' using errcode = '42501';
  end if;

  delete from public.experiment_layers where experiment_id = p_experiment_id;

  insert into public.experiment_layers
    (experiment_id, glaze_id, layer_position, coat_count, coverage_area, coverage_percent, application_method, notes)
  select
    p_experiment_id,
    (l ->> 'glaze_id')::uuid,
    ord::smallint,
    coalesce((l ->> 'coat_count')::smallint, 1),
    coalesce(l ->> 'coverage_area', 'full'),
    nullif(l ->> 'coverage_percent', '')::smallint,
    nullif(l ->> 'application_method', ''),
    nullif(l ->> 'notes', '')
  from jsonb_array_elements(p_layers) with ordinality as t(l, ord);
end;
$$;

revoke execute on function public.replace_recipe_layers(uuid, jsonb) from public, anon;
revoke execute on function public.replace_experiment_layers(uuid, jsonb) from public, anon;
grant execute on function public.replace_recipe_layers(uuid, jsonb) to authenticated;
grant execute on function public.replace_experiment_layers(uuid, jsonb) to authenticated;
