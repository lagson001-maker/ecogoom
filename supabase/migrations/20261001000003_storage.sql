-- =============================================================================
-- GlazeStack V1 — Storage buckets & policies
--
--   public-glaze-assets   product images            editors write, public read
--   public-recipe-assets  public recipe results      editors write, public read
--   private-user-assets   experiments, personal      owner only; path must start
--                         recipes, references,       with "<auth.uid()>/"
--                         import screenshots
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-glaze-assets',  'public-glaze-assets',  true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('public-recipe-assets', 'public-recipe-assets', true,  10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private-user-assets',  'private-user-assets',  false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'])
on conflict (id) do nothing;

-- public buckets: read for everyone, write for editors -------------------------

create policy "public assets: read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('public-glaze-assets', 'public-recipe-assets'));

create policy "public assets: editor insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('public-glaze-assets', 'public-recipe-assets') and public.is_editor());

create policy "public assets: editor update" on storage.objects
  for update to authenticated
  using (bucket_id in ('public-glaze-assets', 'public-recipe-assets') and public.is_editor());

create policy "public assets: editor delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('public-glaze-assets', 'public-recipe-assets') and public.is_editor());

-- private bucket: owner folder only -------------------------------------------

create policy "private assets: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'private-user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "private assets: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'private-user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "private assets: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'private-user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "private assets: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'private-user-assets' and (storage.foldername(name))[1] = auth.uid()::text);
