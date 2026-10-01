-- Manufacturer test-tile photos for a pairing (hotlinked with credit, never copied).
alter table public.glaze_pairings
  add column image_url    text check (image_url is null or image_url ~ '^https://'),
  add column image_credit text;
