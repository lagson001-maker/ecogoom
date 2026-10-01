-- =============================================================================
-- GlazeStack V1 — demo seed
--
-- IMPORTANT: this is ILLUSTRATIVE demo data so Discover / filters / detail /
-- recommendations / My Glazes work out of the box.
--   * Glaze names follow well-known commercial lines, but colors, cone ranges,
--     finishes and product codes are approximate. Codes are left NULL where we
--     were not certain. Verify against the manufacturer before relying on them.
--   * No manufacturer food-safety claims are recorded (all NULL = unknown).
--   * Every recipe is attributed to the "GlazeStack demo seed" source and marked
--     verification_status = 'unverified'. Swap in real, sourced data over time.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

-- Brands ----------------------------------------------------------------------

insert into public.brands (name, slug, website_url, country, description) values
  ('AMACO',    'amaco',    'https://www.amaco.com',        'US', 'American Art Clay Co. Mid-fire lines include Potter''s Choice, Celadon, Shino.'),
  ('Mayco',    'mayco',    'https://www.maycocolors.com',  'US', 'Stoneware lines for cone 5–6 including classic, matte, gloss and crystal glazes.'),
  ('Coyote',   'coyote',   'https://www.coyoteclay.com',   'US', 'Texas-based maker of mid-fire shinos, celadons and reactive glazes.'),
  ('Spectrum', 'spectrum', 'https://www.spectrumglazes.com','CA', 'Low- and mid-fire glazes.'),
  ('Laguna',   'laguna',   'https://www.lagunaclay.com',   'US', 'Clay and glaze manufacturer.'),
  ('Studio House (demo)', 'studio-house-demo', null, 'VN', 'Fictional local studio brand used for demo data only.')
on conflict (slug) do nothing;

-- Series ----------------------------------------------------------------------

insert into public.glaze_series (brand_id, name, slug)
select b.id, s.name, s.slug
from (values
  ('amaco', 'Potter''s Choice', 'potters-choice'),
  ('amaco', 'Potter''s Choice Flux', 'potters-choice-flux'),
  ('amaco', 'Celadon', 'celadon'),
  ('amaco', 'Shino', 'shino'),
  ('amaco', 'Phase', 'phase'),
  ('amaco', 'Crawl', 'crawl'),
  ('mayco', 'Stoneware Classic', 'stoneware-classic'),
  ('mayco', 'Stoneware Matte', 'stoneware-matte'),
  ('mayco', 'Stoneware Gloss', 'stoneware-gloss'),
  ('mayco', 'Stoneware Crystal', 'stoneware-crystal'),
  ('mayco', 'Flux', 'flux'),
  ('mayco', 'Wash', 'wash'),
  ('coyote', 'Shino', 'shino'),
  ('coyote', 'Celadon', 'celadon'),
  ('coyote', 'Constellation', 'constellation'),
  ('coyote', 'Crystalline', 'crystalline'),
  ('coyote', 'Satin', 'satin'),
  ('coyote', 'Gloss', 'gloss'),
  ('coyote', 'Crawl', 'crawl'),
  ('coyote', 'Mottled', 'mottled'),
  ('studio-house-demo', 'House Base', 'house-base')
) as s(brand_slug, name, slug)
join public.brands b on b.slug = s.brand_slug
on conflict (brand_id, slug) do nothing;

-- Glazes ----------------------------------------------------------------------

insert into public.glazes (
  brand_id, series_id, product_code, name, slug, glaze_type, base_color, swatch_hex,
  color_family, color_tags, finish, opacity, cone_min, cone_max, manufacturer_notes
)
select
  b.id, s.id, g.code, g.name, g.slug, g.glaze_type, g.base_color, g.swatch,
  g.family, g.tags, g.finish, g.opacity, g.cmin, g.cmax,
  'Demo seed entry. Attributes are approximate — verify against the manufacturer''s current product information.'
from (values
  -- brand, series, code, name, slug, type, base_color, swatch, family, tags, finish, opacity, cone_min, cone_max
  ('amaco', 'potters-choice', null,    'Obsidian',            'amaco-obsidian',            'gloss', 'Glossy black',               '#1c1a1d', 'black',  array['black'],                     'gloss',    'opaque',      5, 6),
  ('amaco', 'potters-choice-flux', null, 'Honey Flux',        'amaco-honey-flux',          'flux',  'Amber honey fluid glass',    '#b5772a', 'amber',  array['amber','honey','brown'],     'gloss',    'translucent', 5, 6),
  ('amaco', 'potters-choice', 'PC-33', 'Iron Lustre',         'amaco-iron-lustre',         'glaze', 'Dark bronze-brown',          '#4a2f22', 'brown',  array['brown','bronze'],            'metallic', 'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-20', 'Blue Rutile',         'amaco-blue-rutile',         'glaze', 'Blue with tan rutile breaks','#3f5f7f', 'blue',   array['blue','tan'],                'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', 'PC-30', 'Temmoku',             'amaco-temmoku',             'gloss', 'Black breaking rust',        '#2a1a14', 'black',  array['black','rust','brown'],      'gloss',    'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-23', 'Indigo Float',        'amaco-indigo-float',        'glaze', 'Deep indigo',                '#2b3f6b', 'blue',   array['blue','indigo'],             'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', 'PC-42', 'Seaweed',             'amaco-seaweed',             'glaze', 'Olive-green to brown',       '#3f4a2b', 'green',  array['green','olive','brown'],     'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', null,    'Oatmeal',             'amaco-oatmeal',             'matte', 'Speckled warm beige',        '#d8c9a8', 'beige',  array['beige','cream'],             'matte',    'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-32', 'Albany Slip Brown',   'amaco-albany-slip-brown',   'glaze', 'Dark brown',                 '#3b2416', 'brown',  array['brown','black'],             'gloss',    'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-25', 'Textured Turquoise',  'amaco-textured-turquoise',  'glaze', 'Turquoise with texture',     '#3c8a8a', 'teal',   array['turquoise','teal'],          'satin',    'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-53', 'Ancient Jasper',      'amaco-ancient-jasper',      'glaze', 'Burgundy-brown with blue',   '#6b3a2a', 'brown',  array['burgundy','brown','blue'],   'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', 'PC-57', 'Smokey Merlot',       'amaco-smokey-merlot',       'glaze', 'Smoky wine red',             '#5a2a3a', 'red',    array['burgundy','plum'],           'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', 'PC-59', 'Deep Firebrick',      'amaco-deep-firebrick',      'glaze', 'Brick red',                  '#8a3b22', 'red',    array['red','rust'],                'satin',    'opaque',      5, 6),
  ('amaco', 'potters-choice', 'PC-48', 'Art Deco Green',      'amaco-art-deco-green',      'glaze', 'Mid green',                  '#4f6b3a', 'green',  array['green'],                     'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', 'PC-43', 'Toasted Sage',        'amaco-toasted-sage',        'glaze', 'Muted sage',                 '#8a8a5a', 'green',  array['sage','olive'],              'satin',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', null,    'Chun Plum',           'amaco-chun-plum',           'glaze', 'Plum with blue chun',        '#6a4a6a', 'purple', array['plum','purple','blue'],      'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'potters-choice', null,    'Arctic Blue',         'amaco-arctic-blue',         'glaze', 'Pale icy blue',              '#9ab8c8', 'blue',   array['blue','white'],              'gloss',    'semi-opaque', 5, 6),
  ('amaco', 'celadon',        null,    'Celadon (demo)',      'amaco-celadon-demo',        'celadon','Pale green celadon',        '#a9c5a6', 'green',  array['green','celadon'],           'gloss',    'transparent', 5, 6),
  ('mayco', 'stoneware-classic', null, 'Norse Blue',          'mayco-norse-blue',          'glaze', 'Blue that breaks lighter',   '#34506e', 'blue',   array['blue'],                      'gloss',    'semi-opaque', 5, 6),
  ('mayco', 'flux',           null,    'Light Flux',          'mayco-light-flux',          'flux',  'Pale fluid flux',            '#e6d9b0', 'cream',  array['cream','clear'],             'gloss',    'transparent', 5, 6),
  ('mayco', 'stoneware-classic', null, 'Blue Hydrangea',      'mayco-blue-hydrangea',      'glaze', 'Blue-violet',                '#5a7aa0', 'blue',   array['blue','purple'],             'gloss',    'semi-opaque', 5, 6),
  ('mayco', 'stoneware-matte', null,   'Birch',               'mayco-birch',               'matte', 'Speckled off-white',         '#d9d2c2', 'white',  array['white','cream'],             'satin',    'opaque',      5, 6),
  ('studio-house-demo', 'house-base', null, 'House Satin White (demo)',  'house-satin-white-demo',  'satin',   'Satin white liner',  '#efeae0', 'white', array['white'],          'satin', 'opaque',      6, 6),
  ('studio-house-demo', 'house-base', null, 'House Celadon (demo)',      'house-celadon-demo',      'celadon', 'Reduction celadon',  '#a8c4a0', 'green', array['green','celadon'],'gloss', 'transparent', 10, 10),
  ('studio-house-demo', 'house-base', null, 'House Copper Red (demo)',   'house-copper-red-demo',   'glaze',   'Reduction copper red','#7a1f1f', 'red',   array['red'],            'gloss', 'semi-opaque', 10, 10)
) as g(brand_slug, series_slug, code, name, slug, glaze_type, base_color, swatch, family, tags, finish, opacity, cmin, cmax)
join public.brands b on b.slug = g.brand_slug
left join public.glaze_series s on s.brand_id = b.id and s.slug = g.series_slug
on conflict (slug) do nothing;

-- Source ----------------------------------------------------------------------

insert into public.sources (id, name, source_type, notes, evidence_level)
values (
  '00000000-0000-4000-8000-000000000001',
  'GlazeStack demo seed',
  'imported',
  'Illustrative layering combinations created for the V1 demo. Not tested results. Replace with real, sourced records.',
  'unverified'
)
on conflict (id) do nothing;

-- Recipes ---------------------------------------------------------------------

insert into public.recipes (
  title, slug, description, cone, atmosphere, clay_body_text, clay_color, application_method,
  result_description, dominant_colors, color_tags, surface_tags, effect_tags,
  movement_level, run_risk, opacity, source_type, verification_status, status, visibility
)
values
  ('Honey Flux over Obsidian', 'honey-flux-over-obsidian',
   'Fluid amber flux floating on a glossy black base.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'brush',
   'Black base with amber-olive pooling where the flux thins out; flux runs toward the foot.',
   array['black','amber'], array['olive','brown'], array['glossy'], array['floating','breaking','flowing'],
   3, 3, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Iron Lustre over Obsidian', 'iron-lustre-over-obsidian',
   'Two dark glazes for a bronze-plum sheen.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'brush',
   'Very dark surface with bronze and subtle purple-brown lustre on edges.',
   array['black','brown'], array['bronze','purple'], array['satin','metallic'], array['metallic','breaking'],
   1, 1, 'opaque', 'imported', 'unverified', 'published', 'public'),

  ('Obsidian, Iron Lustre & Honey Flux rim', 'obsidian-iron-lustre-honey-flux-rim',
   'Three-layer dark stack with a flux-dipped rim.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'brush + dip',
   'Dark bronze body with amber rivulets running down from the rim.',
   array['black','bronze'], array['amber','brown'], array['glossy','metallic'], array['flowing','metallic','breaking'],
   3, 4, 'opaque', 'imported', 'unverified', 'published', 'public'),

  ('Iron Lustre & Blue Rutile', 'iron-lustre-blue-rutile',
   'Classic rutile blue over a bronze base.', 6, 'oxidation', 'Speckled buff stoneware', 'speckled', 'brush',
   'Blue and tan variegation with bronze showing through on edges.',
   array['blue','brown'], array['tan','bronze'], array['glossy'], array['variegated','breaking','reactive'],
   2, 2, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Seaweed over Albany Slip Brown', 'seaweed-over-albany-slip-brown',
   'Moss-olive over dark brown, earthy and slightly antique.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'brush',
   'Olive-moss green breaking to warm brown at edges and texture.',
   array['green','brown'], array['olive','moss'], array['glossy'], array['variegated','breaking','moss'],
   2, 2, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Indigo Float over Temmoku', 'indigo-float-over-temmoku',
   'Deep blue floating over black-rust temmoku.', 6, 'oxidation', 'Mid-fire stoneware', 'dark', 'brush',
   'Midnight blue with rust and black speckling — a "galaxy" look.',
   array['blue','black'], array['indigo','rust'], array['glossy'], array['floating','galaxy','variegated'],
   2, 2, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Textured Turquoise over Iron Lustre', 'textured-turquoise-over-iron-lustre',
   'Ocean-like turquoise with brown breaking through.', 6, 'oxidation', 'Speckled buff stoneware', 'speckled', 'brush',
   'Turquoise crackle texture over dark brown, like shallow sea over rock.',
   array['teal','brown'], array['turquoise'], array['satin'], array['ocean','reactive','speckled'],
   2, 1, 'opaque', 'imported', 'unverified', 'published', 'public'),

  ('Chun Plum over Obsidian (upper third)', 'chun-plum-over-obsidian',
   'Plum and violet floating band on a black pot.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'dip',
   'Black lower body; violet-plum with blue chun hints on the upper third.',
   array['black','purple'], array['plum','blue'], array['glossy'], array['floating','galaxy','gradient'],
   2, 2, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Oatmeal over Smokey Merlot', 'oatmeal-over-smokey-merlot',
   'Matte beige breaking to wine red — vintage farmhouse feel.', 6, 'oxidation', 'Speckled buff stoneware', 'speckled', 'brush',
   'Dry-leaning oatmeal beige with burgundy showing at edges and throwing lines.',
   array['beige','burgundy'], array['cream'], array['matte'], array['breaking','dry','speckled'],
   1, 0, 'opaque', 'imported', 'unverified', 'published', 'public'),

  ('Norse Blue over Birch', 'norse-blue-over-birch',
   'Blue cascading over a speckled white base.', 6, 'oxidation', 'White stoneware', 'white', 'dip',
   'Glossy blue gradient fading into speckled white; noticeable movement.',
   array['blue','white'], array['cream'], array['glossy'], array['flowing','gradient','speckled'],
   3, 3, 'semi-opaque', 'imported', 'unverified', 'published', 'public'),

  ('Deep Firebrick with Art Deco Green overlap', 'deep-firebrick-art-deco-green',
   'Rust red and green overlapped for a reactive band.', 6, 'oxidation', 'Mid-fire stoneware', 'brown', 'brush',
   'Rust and green interact in the overlap band, creating mottled brown.',
   array['red','green'], array['rust','brown'], array['satin'], array['reactive','variegated','mottled','rust'],
   2, 2, 'opaque', 'imported', 'unverified', 'published', 'public'),

  ('House Celadon, single layer', 'house-celadon-single-layer',
   'Single-glaze reduction celadon on porcelain.', 10, 'reduction', 'Porcelain', 'porcelain', 'dip',
   'Pale jade green pooling darker in carved lines.',
   array['green'], array['celadon'], array['glossy'], array['gradient'],
   0, 0, 'transparent', 'imported', 'unverified', 'published', 'public')
on conflict (slug) do nothing;

-- Layers (position 1 = on the clay) ---------------------------------------------

insert into public.recipe_layers (recipe_id, glaze_id, layer_position, coat_count, coverage_area, coverage_percent)
select r.id, g.id, l.pos, l.coats, l.area, l.pct
from (values
  ('honey-flux-over-obsidian',            'amaco-obsidian',            1, 3, 'full',        null),
  ('honey-flux-over-obsidian',            'amaco-honey-flux',          2, 2, 'upper_half',  50),
  ('iron-lustre-over-obsidian',           'amaco-obsidian',            1, 2, 'full',        null),
  ('iron-lustre-over-obsidian',           'amaco-iron-lustre',         2, 2, 'full',        null),
  ('obsidian-iron-lustre-honey-flux-rim', 'amaco-obsidian',            1, 2, 'full',        null),
  ('obsidian-iron-lustre-honey-flux-rim', 'amaco-iron-lustre',         2, 1, 'upper_half',  50),
  ('obsidian-iron-lustre-honey-flux-rim', 'amaco-honey-flux',          3, 1, 'rim_only',    10),
  ('iron-lustre-blue-rutile',             'amaco-iron-lustre',         1, 2, 'full',        null),
  ('iron-lustre-blue-rutile',             'amaco-blue-rutile',         2, 2, 'upper_half',  60),
  ('seaweed-over-albany-slip-brown',      'amaco-albany-slip-brown',   1, 2, 'full',        null),
  ('seaweed-over-albany-slip-brown',      'amaco-seaweed',             2, 2, 'full',        null),
  ('indigo-float-over-temmoku',           'amaco-temmoku',             1, 2, 'full',        null),
  ('indigo-float-over-temmoku',           'amaco-indigo-float',        2, 2, 'upper_half',  50),
  ('textured-turquoise-over-iron-lustre', 'amaco-iron-lustre',         1, 2, 'full',        null),
  ('textured-turquoise-over-iron-lustre', 'amaco-textured-turquoise',  2, 2, 'full',        null),
  ('chun-plum-over-obsidian',             'amaco-obsidian',            1, 2, 'full',        null),
  ('chun-plum-over-obsidian',             'amaco-chun-plum',           2, 2, 'upper_third', 33),
  ('oatmeal-over-smokey-merlot',          'amaco-smokey-merlot',       1, 2, 'full',        null),
  ('oatmeal-over-smokey-merlot',          'amaco-oatmeal',             2, 1, 'full',        null),
  ('norse-blue-over-birch',               'mayco-birch',               1, 3, 'full',        null),
  ('norse-blue-over-birch',               'mayco-norse-blue',          2, 2, 'upper_half',  50),
  ('deep-firebrick-art-deco-green',       'amaco-deep-firebrick',      1, 2, 'full',        null),
  ('deep-firebrick-art-deco-green',       'amaco-art-deco-green',      2, 2, 'overlap',     40),
  ('house-celadon-single-layer',          'house-celadon-demo',        1, 1, 'full',        null)
) as l(recipe_slug, glaze_slug, pos, coats, area, pct)
join public.recipes r on r.slug = l.recipe_slug
join public.glazes g on g.slug = l.glaze_slug
on conflict (recipe_id, layer_position) do nothing;

-- Link every demo recipe to the demo source ------------------------------------

insert into public.recipe_sources (recipe_id, source_id, is_primary, notes)
select r.id, '00000000-0000-4000-8000-000000000001', true, 'Demo seed'
from public.recipes r
where r.slug in (
  'honey-flux-over-obsidian', 'iron-lustre-over-obsidian', 'obsidian-iron-lustre-honey-flux-rim',
  'iron-lustre-blue-rutile', 'seaweed-over-albany-slip-brown', 'indigo-float-over-temmoku',
  'textured-turquoise-over-iron-lustre', 'chun-plum-over-obsidian', 'oatmeal-over-smokey-merlot',
  'norse-blue-over-birch', 'deep-firebrick-art-deco-green', 'house-celadon-single-layer'
)
on conflict (recipe_id, source_id) do nothing;
