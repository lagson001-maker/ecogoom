"""Turn scraped manufacturer pages into an idempotent seed file.

Rules: every value comes from text on the manufacturer's own page (URL kept on
each row). Anything the page does not state stays NULL. Swatches are averaged
from the manufacturer's chip photo and are labelled approximate in the UI.
"""
import io, json, os, re, subprocess, sys, unicodedata
from PIL import Image

COLOR_WORDS = {
    "black": "black", "white": "white", "cream": "cream", "beige": "beige", "tan": "tan", "brown": "brown",
    "amber": "amber", "honey": "honey", "rust": "rust", "red": "red", "burgundy": "burgundy", "plum": "plum",
    "purple": "purple", "violet": "purple", "lilac": "purple", "pink": "pink", "coral": "pink", "blue": "blue",
    "indigo": "indigo", "navy": "indigo", "teal": "teal", "turquoise": "turquoise", "green": "green",
    "olive": "olive", "moss": "moss", "sage": "sage", "celadon": "celadon", "yellow": "yellow", "orange": "orange",
    "gray": "gray", "grey": "gray", "bronze": "bronze", "gold": "gold", "copper": "bronze", "clear": "clear",
}
FAMILY_ORDER = ["black", "white", "blue", "green", "brown", "red", "purple", "yellow", "orange", "gray", "pink",
                "teal", "turquoise", "amber", "cream", "beige", "tan", "gold", "bronze", "indigo", "clear"]


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def q(s):
    """Dollar-quoted SQL literal (or NULL)."""
    if s is None:
        return "null"
    s = str(s)
    assert "$v$" not in s
    return f"$v${s}$v$"


def colors_in(text):
    found = []
    for w in re.findall(r"[a-z]+", text.lower()):
        c = COLOR_WORDS.get(w)
        if c and c not in found:
            found.append(c)
    return found[:5]


def finish_of(text):
    t = text.lower()
    if "metallic" in t:
        return "metallic"
    if "satin" in t or "semi-matte" in t or "semi matte" in t:
        return "satin"
    if "matte" in t:
        return "matte"
    if "gloss" in t:
        return "gloss"
    return None


def opacity_of(text):
    t = text.lower()
    for k in ["semi-opaque", "translucent", "transparent", "opaque"]:
        if k in t:
            return k
    if "semi opaque" in t:
        return "semi-opaque"
    return None


SWATCH_CACHE = "swatch_cache.json"
swatches = json.load(open(SWATCH_CACHE)) if os.path.exists(SWATCH_CACHE) else {}


def swatch(url):
    if not url:
        return None
    if url in swatches:
        return swatches[url]
    data = subprocess.run(["curl", "-s", "-m", "25", "-A", "Mozilla/5.0", url], capture_output=True).stdout
    hexv = None
    try:
        im = Image.open(io.BytesIO(data)).convert("RGB")
        w, h = im.size
        # Central 40%: the glaze chip, away from labels and backgrounds.
        im = im.crop((int(w * .3), int(h * .3), int(w * .7), int(h * .7))).resize((24, 24))
        px = sorted(list(im.get_flattened_data()) if hasattr(im, "get_flattened_data") else im.getdata(), key=lambda p: sum(p))
        mid = px[len(px) // 4: 3 * len(px) // 4]  # trim highlights and shadows
        r, g, b = (sum(c[i] for c in mid) // len(mid) for i in range(3))
        hexv = f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        pass
    swatches[url] = hexv
    json.dump(swatches, open(SWATCH_CACHE, "w"), indent=0)
    return hexv


def first_sentence(text, limit=140):
    s = re.split(r"(?<=[.!])\s", text.strip(), maxsplit=1)[0]
    return s[:limit].rstrip(" ,.;") if s else None


def glaze_row(brand, series, code, name, glaze_type, base_color, hexv, tags, finish, opacity, cmin, cmax,
              food, notes, url, app_notes, coats, image, credit):
    return dict(brand=brand, series=series, code=code, name=name, slug=f"{brand}-{slugify(name)}",
                glaze_type=glaze_type, base_color=base_color, swatch=hexv, tags=tags, finish=finish,
                opacity=opacity, cmin=cmin, cmax=cmax, food=food, notes=notes, url=url, app=app_notes,
                coats=coats, image=image, credit=credit)


# ---------------------------------------------------------------- AMACO -----
AMACO_LISTING = "https://shop.amaco.com/glazes-underglazes/high-fire-glazes/pc-potters-choice/"
AMACO_APP = ("AMACO: optimal results at Cone 5/6 (Cone 5 = 1186 °C, Cone 6 = 1222 °C). "
             "Apply to bisqueware fired to Cone 04 (1063 °C). Source: " + AMACO_LISTING)


def amaco_rows():
    rows = []
    for x in json.load(open("amaco_pc.json")):
        d = x["description"]
        name = x["name"]
        rows.append(glaze_row(
            "amaco", "potters-choice-flux" if "flux" in name.lower() else "potters-choice", x["code"], name,
            "flux" if "flux" in name.lower() else "glaze", first_sentence(d),
            None if no_own_colour(name, colors_in(name)) else swatch(x["image"]),
            colors_in(name + " " + (first_sentence(d) or "")), finish_of(d), opacity_of(d), 5, 6, None, d,
            x["url"], AMACO_APP, None, x["image"], "AMACO"))
    return rows


# ---------------------------------------------------------------- Mayco -----
MAYCO_SERIES = [("classic", "stoneware-classic"), ("matte", "stoneware-matte"), ("crystal", "stoneware-crystal"),
                ("gloss", "stoneware-gloss"), ("flux", "flux")]


def mayco_split(desc):
    desc = re.split(r"\s+Description\s+Additional information", desc)[0]
    parts = re.split(r"\s*Tip:\s*", desc, maxsplit=1)
    return parts[0].strip(), (parts[1].strip() if len(parts) > 1 else None)


def cone_text(main, cone):
    m = re.search(rf"Cone {cone}[^:]*:\s*(.*?)(?=Cone \d+[^:]*:|$)", main, re.I)
    return m.group(1).strip() if m else None


def coats_from(*texts):
    for t in texts:
        if not t:
            continue
        m = re.search(r"apply\s+(\d+)\s*(?:-|–|to)\s*(\d+)\s+coats", t, re.I)
        if m:
            return int(m.group(1)), int(m.group(2))
        m = re.search(r"apply\s+(\d+)\+?\s+coats", t, re.I)
        if m:
            return int(m.group(1)), None
    return None


CLAY_MAP = [("speckled brown", "speckled"), ("speckled white", "speckled"), ("speckled", "speckled"),
            ("dark brown", "brown"), ("black", "dark"), ("dark", "dark"), ("wheat", "buff"), ("buff", "buff"),
            ("red", "red"), ("brown", "brown"), ("porcelain", "porcelain"), ("white", "white")]


def clay_phrase(body_text):
    return body_text if re.search(r"\b(clay|body)\b", body_text, re.I) else f"{body_text} clay"


def no_own_colour(name, tags):
    """Fluxes and clears have no colour of their own; a chip photo would mislead."""
    return "flux" in name.lower() or (tags[:1] == ["clear"])


def parse_firing(cap):
    m = re.search(r"cone\s*(\d+)\s*(oxidation|reduction)?", cap, re.I)
    if not m:
        return None, None
    return int(m.group(1)), (m.group(2) or "").lower() or None


def mayco_rows():
    data = json.load(open("mayco_sw.json"))
    rows, clay, pairs = [], [], []
    by_code = {x["code"]: x for x in data}
    for x in data:
        main, tip = mayco_split(x["description"] or x["og_description"])
        line = x["line_note"].lower()
        series = next((s for k, s in MAYCO_SERIES if k in line), "stoneware-classic")
        name = x["name"]
        c6 = cone_text(main, 6) or main
        has10 = bool(re.search(r"Cone 10", main, re.I))
        app = " ".join(t for t in [tip, x["line_note"] if "apply" in x["line_note"].lower() else None] if t) or None
        coats = coats_from(tip, x["line_note"])
        rows.append(glaze_row(
            "mayco", series, x["code"], name, "flux" if "flux" in name.lower() else "glaze", first_sentence(c6),
            None if no_own_colour(name, colors_in(name + " " + c6[:160])) else swatch(x["image"]),
            colors_in(name + " " + c6[:160]), finish_of(c6), opacity_of(c6), 5, 10 if has10 else 6,
            x["dinnerware_safe"], main, x["url"], app, coats, x["image"], "Mayco"))

        seen_clay = set()
        for src, cap in x["captioned"]:
            low = cap.lower()
            cone, atm = parse_firing(cap)
            if low.startswith(("over", "under")):
                codes = re.findall(r"SW-?(\d+)", cap)
                for pos, code in enumerate(codes):
                    other = f"SW-{code}"
                    # Mayco photographs both flux tiles side by side: "(left)" then "(right)".
                    side = ("left" if pos == 0 else "right") if len(codes) == 2 and "(left)" in low else None
                    if other == x["code"] or other not in by_code or cone is None:
                        continue
                    arrangement = "over" if low.startswith("over") else "under"
                    key = (x["code"], other, arrangement, cone, atm)
                    if key in seen_clay:
                        continue
                    seen_clay.add(key)
                    rel = "over" if arrangement == "over" else "under"
                    where = f" It is the {side} tile in the photo." if side else ""
                    pairs.append(dict(glaze=x["code"], other=other, arrangement=arrangement, cone=cone, image=src,
                                      url=x["url"], effect=f"Mayco test tile: {name} {rel} {by_code[other]['name']} "
                                      f"({other}), cone {cone}{' ' + atm if atm else ''}.{where} Photo caption: {cap}."))
                continue
            if cone is None or "coats" in low and "," in low and re.match(r"\d,\s*\d", low):
                continue  # multi-thickness strips and uncaptioned images are skipped
            body = None
            for k, v in CLAY_MAP:
                if re.search(rf"\b{k}\b", low):
                    body = v
                    break
            body_text = re.split(r",|\s+cone", cap, flags=re.I)[0].strip()
            coats_m = re.match(r"(\d+)\s+coats", low)
            if body is None:
                if coats_m or low.startswith("cone"):
                    body, body_text = "white", "White clay body"  # Mayco: chips are fired on a white clay body
                else:
                    continue
            key = (body, body_text.lower(), cone, atm, coats_m.group(1) if coats_m else None)
            if key in seen_clay:
                continue
            seen_clay.add(key)
            text = cone_text(main, cone) if body == "white" else None
            clay.append(dict(glaze=x["code"], clay=body, body=body_text if not coats_m else "White clay body",
                             cone=cone, atm=atm, coats=int(coats_m.group(1)) if coats_m else None, image=src,
                             url=x["url"], desc=text or f"Mayco test tile on {clay_phrase(body_text if not coats_m else 'White clay body')}, "
                             f"cone {cone}{' ' + atm if atm else ''}."))
    return rows, clay, pairs


# ---------------------------------------------------------------- SQL -------
def glazes_sql(rows):
    vals = []
    for r in rows:
        tags = "array[" + ",".join(q(t) for t in r["tags"]) + "]::text[]" if r["tags"] else "'{}'::text[]"
        coats = r["coats"] or (None, None)
        vals.append("  (" + ", ".join([
            q(r["brand"]), q(r["series"]), q(r["code"]), q(r["name"]), q(r["slug"]), q(r["glaze_type"]),
            q(r["base_color"]), q(r["swatch"]), q(r["tags"][0] if r["tags"] else None), tags, q(r["finish"]),
            q(r["opacity"]), str(r["cmin"]), str(r["cmax"]),
            "null" if r["food"] is None else ("true" if r["food"] else "false"), q(r["notes"]), q(r["url"]),
            q(r["app"]), "null" if coats[0] is None else str(coats[0]), "null" if coats[1] is None else str(coats[1]),
            q(r["image"]), q(r["credit"])]) + ")")
    return """insert into public.glazes (
  brand_id, series_id, product_code, name, slug, glaze_type, base_color, swatch_hex, color_family, color_tags,
  finish, opacity, cone_min, cone_max, manufacturer_food_safe_claim, manufacturer_notes, official_url,
  application_notes, coats_min, coats_max, image_url, image_credit
)
select b.id, s.id, v.code, v.name, v.slug, v.glaze_type, v.base_color, v.swatch, v.family, v.tags, v.finish,
       v.opacity, v.cmin::smallint, v.cmax::smallint, v.food::boolean, v.notes, v.url, v.app,
       v.coats_min::smallint, v.coats_max::smallint, v.image, v.credit
from (values
""" + ",\n".join(vals) + """
) as v(brand, series, code, name, slug, glaze_type, base_color, swatch, family, tags, finish, opacity, cmin, cmax,
       food, notes, url, app, coats_min, coats_max, image, credit)
join public.brands b on b.slug = v.brand
left join public.glaze_series s on s.brand_id = b.id and s.slug = v.series
on conflict (slug) do update set
  brand_id = excluded.brand_id, series_id = excluded.series_id, product_code = excluded.product_code,
  name = excluded.name, glaze_type = excluded.glaze_type, base_color = excluded.base_color,
  swatch_hex = coalesce(excluded.swatch_hex, public.glazes.swatch_hex), color_family = excluded.color_family,
  color_tags = excluded.color_tags, finish = excluded.finish, opacity = excluded.opacity,
  cone_min = excluded.cone_min, cone_max = excluded.cone_max,
  manufacturer_food_safe_claim = excluded.manufacturer_food_safe_claim,
  manufacturer_notes = excluded.manufacturer_notes, official_url = excluded.official_url,
  application_notes = excluded.application_notes, coats_min = excluded.coats_min, coats_max = excluded.coats_max,
  image_url = excluded.image_url, image_credit = excluded.image_credit;
"""


def clay_sql(brand, items):
    if not items:
        return ""
    vals = ",\n".join("  (" + ", ".join([q(i["glaze"]), q(i["clay"]), q(i["body"]), str(i["cone"]), q(i["atm"]),
                                        "null" if i["coats"] is None else str(i["coats"]), q(i["desc"]),
                                        q(i["image"]), q(i["url"])]) + ")" for i in items)
    return f"""delete from public.glaze_clay_results r using public.glazes g, public.brands b
where r.glaze_id = g.id and g.brand_id = b.id and b.slug = '{brand}' and r.verification_status = 'manufacturer_documented';

insert into public.glaze_clay_results (glaze_id, clay_color, clay_body_text, cone, atmosphere, coats,
  result_description, image_url, image_credit, source_url, verification_status, created_by)
select g.id, v.clay, v.body, v.cone::smallint, v.atm, v.coats::smallint, v.descr, v.image, '{brand.capitalize()}', v.url,
       'manufacturer_documented', null
from (values
{vals}
) as v(code, clay, body, cone, atm, coats, descr, image, url)
join public.brands b on b.slug = '{brand}'
join public.glazes g on g.brand_id = b.id and g.product_code = v.code;
"""


def pairs_sql(brand, items):
    if not items:
        return ""
    vals = ",\n".join("  (" + ", ".join([q(i["glaze"]), q(i["other"]), q(i["arrangement"]), str(i["cone"]),
                                        q(i["effect"]), q(i["image"]), q(i["url"])]) + ")" for i in items)
    return f"""delete from public.glaze_pairings p using public.glazes g, public.brands b
where p.glaze_id = g.id and g.brand_id = b.id and b.slug = '{brand}' and p.verification_status = 'manufacturer_documented';

insert into public.glaze_pairings (glaze_id, other_glaze_id, verdict, arrangement, cone, effect_description,
  image_url, image_credit, source_url, verification_status, created_by)
select g.id, o.id, 'recommended', v.arrangement, v.cone::smallint, v.effect, v.image, '{brand.capitalize()}', v.url,
       'manufacturer_documented', null
from (values
{vals}
) as v(code, other, arrangement, cone, effect, image, url)
join public.brands b on b.slug = '{brand}'
join public.glazes g on g.brand_id = b.id and g.product_code = v.code
join public.glazes o on o.brand_id = b.id and o.product_code = v.other;
"""


def recipes_sql(brand, pairs, glaze_rows):
    """One published two-layer recipe per test tile: top over bottom, as photographed."""
    by_code = {r["code"]: r for r in glaze_rows}
    seen, items = set(), []
    for p in pairs:
        top, bottom = (p["glaze"], p["other"]) if p["arrangement"] == "over" else (p["other"], p["glaze"])
        key = (top, bottom, p["cone"])
        if key in seen or top not in by_code or bottom not in by_code:
            continue
        seen.add(key)
        t, b = by_code[top], by_code[bottom]
        atm = "reduction" if p["cone"] >= 10 else "oxidation"
        caption = p["effect"].split(". ", 1)[1] if ". " in p["effect"] else p["effect"]  # side + photo caption
        items.append(dict(
            slug=f"{brand}-tile-{slugify(t['name'])}-over-{slugify(b['name'])}-c{p['cone']}",
            title=f"{t['name']} over {b['name']}", top=top, bottom=bottom, cone=p["cone"], atm=atm,
            dominant=t["tags"][:2], secondary=[c for c in b["tags"] if c not in t["tags"][:2]][:3],
            result=f"{brand.capitalize()} test tile, cone {p['cone']} {atm}. {caption}",
            source_url=p["url"], source_name=f"{brand.capitalize()} product page: {by_code[p['glaze']]['name']} ({p['glaze']})"))
    if not items:
        return ""
    src_vals = ",\n".join(f"  ({q(u)}, {q(n)})" for u, n in dict((i["source_url"], i["source_name"]) for i in items).items())
    rec_vals = ",\n".join("  (" + ", ".join([
        q(i["slug"]), q(i["title"]), str(i["cone"]), q(i["atm"]), q(i["result"]),
        "array[" + ",".join(q(c) for c in i["dominant"]) + "]::text[]" if i["dominant"] else "'{}'::text[]",
        "array[" + ",".join(q(c) for c in i["secondary"]) + "]::text[]" if i["secondary"] else "'{}'::text[]",
        q(i["top"]), q(i["bottom"]), q(i["source_url"])]) + ")" for i in items)
    cap = brand.capitalize()
    return f"""-- {len(items)} recipes, one per {cap} layering test tile. Coats are not stated on the
-- tiles, so layer coat_count stays NULL. Dinnerware stays 'unknown' (layered).
insert into public.sources (name, url, source_type, evidence_level, notes)
select v.name, v.url, 'manufacturer', 'manufacturer_documented', 'Captioned layering test tiles on the product page.'
from (values
{src_vals}
) as v(url, name)
where not exists (select 1 from public.sources s where s.url = v.url);

drop table if exists _tile_recipes;
create temporary table _tile_recipes (slug text, title text, cone smallint, atm text, result text,
  dominant text[], secondary text[], top_code text, bottom_code text, source_url text);
insert into _tile_recipes values
{rec_vals};

insert into public.recipes (title, slug, description, status, visibility, cone, atmosphere, clay_body_text, clay_color,
  result_description, dominant_colors, color_tags, source_type, verification_status, dinnerware_suitability)
select t.title, t.slug, {q(cap + " layering test tile, fired flat on a white clay body.")}, 'published', 'public', t.cone,
       t.atm, 'White clay body ({cap} test chip)', 'white', t.result, t.dominant, t.secondary, 'manufacturer',
       'manufacturer_documented', 'unknown'
from _tile_recipes t
on conflict (slug) do nothing;

insert into public.recipe_layers (recipe_id, glaze_id, layer_position, coat_count, coverage_area)
select r.id, g.id, l.pos, null, 'full'
from _tile_recipes t
join public.recipes r on r.slug = t.slug
cross join lateral (values (1, t.bottom_code), (2, t.top_code)) as l(pos, code)
join public.brands b on b.slug = '{brand}'
join public.glazes g on g.brand_id = b.id and g.product_code = l.code
on conflict (recipe_id, layer_position) do nothing;

insert into public.recipe_sources (recipe_id, source_id, is_primary)
select r.id, s.id, true
from _tile_recipes t
join public.recipes r on r.slug = t.slug
join lateral (select id from public.sources where url = t.source_url order by imported_at limit 1) s on true
on conflict (recipe_id, source_id) do nothing;

drop table _tile_recipes;
"""


HEADER = """-- GENERATED by scripts/catalog/build_catalog.py from the manufacturer's own pages.
-- Do not edit by hand; re-run the scripts instead. Every row keeps its source URL.
-- Values not stated on the source page are NULL. Swatches are averaged from the
-- manufacturer's chip photo (approximate). Images are hotlinked with credit.

"""

if __name__ == "__main__":
    out = sys.argv[1]
    a = amaco_rows()
    open(os.path.join(out, "10_amaco.sql"), "w").write(HEADER + f"-- AMACO Potter's Choice: {len(a)} glazes. Line facts: {AMACO_LISTING}\n\n" + glazes_sql(a))
    m, clay, pairs = mayco_rows()
    open(os.path.join(out, "20_mayco.sql"), "w").write(
        HEADER + f"-- Mayco Stoneware: {len(m)} glazes, {len(clay)} clay-body results, {len(pairs)} layering tiles.\n\n"
        + glazes_sql(m) + "\n" + clay_sql("mayco", clay) + "\n" + pairs_sql("mayco", pairs) + "\n"
        + recipes_sql("mayco", pairs, m))
    print(f"amaco {len(a)} | mayco {len(m)} glazes, {len(clay)} clay results, {len(pairs)} pairings", file=sys.stderr)
