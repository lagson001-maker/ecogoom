# Catalog import

Builds `supabase/seeds/10_amaco.sql` and `20_mayco.sql` from the manufacturers' own product pages.

```bash
pip install pillow
cd scripts/catalog
python3 scrape_amaco.py https://shop.amaco.com/glazes-underglazes/high-fire-glazes/pc-potters-choice/ > amaco_pc.json
python3 scrape_mayco.py > mayco_sw.json
python3 build_catalog.py ../../supabase/seeds
npx supabase db reset   # from the repo root
```

Rules the builder follows:

- Every glaze, clay-body result and pairing keeps the URL of the page it came from.
- A value is filled only when the page states it; otherwise it stays `NULL`
  (e.g. AMACO's shop pages give no coats or food-safety statement, so none is recorded).
- Mayco food safety comes from the page's *Dinnerware Safe / Not Dinnerware Safe* icon, never inferred.
- Clay-body results and layering pairings come from Mayco's captioned test-tile photos and are
  marked `manufacturer_documented`. A test tile shows a combination was tried, not that it is advised.
- Images are hotlinked with credit, never copied. Swatches are averaged from the chip photo and are
  approximate; fluxes and clears get none (the photo shows the glaze underneath).
- Hand-curated facts from other sources go in `supabase/seeds/90_sourced_facts.sql`, which runs last.

Be polite: the scrapers fetch one page at a time with a short pause.
