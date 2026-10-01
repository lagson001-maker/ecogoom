-- Hand-curated facts from sources other than the manufacturer's product page.
-- Runs after the generated catalog files (10_*, 20_*) so these values win.
-- Sourced catalog facts (web research, 2026-10). Each statement below cites
-- where it was read; anything not confirmed by a source is left null.
--   Product code PC-17: hot-clay.com/products/amaco-stoneware-potters-choice-honey-flux-pc-17,
--     goodearthclays.com/products/pc-17-honey-flux, armadilloclay.com (Honey Flux (PC-17)).
--   2–3 coats; too thin and the flux cannot float: bathpotters.co.uk/honey-flux-amaco-potters-choice-glaze/p3748,
--     sheffield-pottery.com/products/amaco-pcf-potters-choice-flux-glazes-for-cone-5-6.
update public.glazes
set coats_min = 2,
    coats_max = 3,
    application_notes = 'AMACO recommends 2–3 coats. Applied too thinly the flux cannot float and the result looks flat. '
      || 'Cone 5: opaque honey and cream; cone 6: more fluid white with honey flecks. '
      || 'Sources: Bath Potters Supplies, Sheffield Pottery (retailers quoting AMACO).'
where slug = 'amaco-honey-flux';
