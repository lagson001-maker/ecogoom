-- A recipe layer's coat count may be unknown: manufacturer test tiles and many
-- forum posts show a combination without stating coats. Store NULL rather than
-- inventing a number. (Experiment layers stay required: the potter knows.)
alter table public.recipe_layers alter column coat_count drop not null;
