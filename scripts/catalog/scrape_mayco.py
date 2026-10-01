import re, html, json, subprocess, sys, time
UA = "Mozilla/5.0 (GlazeStack catalog research)"
def get(url):
    return subprocess.run(["curl", "-s", "-m", "25", "-A", UA, url], capture_output=True).stdout.decode("utf-8", "ignore")
def lines_of(s):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t))
    return [l.strip() for l in t.split("\n") if l.strip()]

LISTINGS = ["https://www.maycocolors.com/color/fired/stoneware/",
            "https://www.maycocolors.com/color/fired/stoneware-specialty/"]
# Flux glazes used in Mayco's layering tiles but not listed on the category pages.
EXTRA = ["https://www.maycocolors.com/product/sw-401-light-flux/",
         "https://www.maycocolors.com/product/sw-402-dark-flux/"]
urls = []
# The category pages do not always return every product, so read each one a few times.
for listing in LISTINGS * 3:
    for u in re.findall(r'href="(https://www\.maycocolors\.com/product/(sw-?\d+[a-z]?)-[^"]+/)"', get(listing)):
        if u[0] not in urls: urls.append(u[0])
urls += [u for u in EXTRA + sys.argv[1:] if u not in urls]
print(len(urls), "SW products", file=sys.stderr)

out = []
for u in urls:
    s = get(u); time.sleep(0.25)
    L = lines_of(s)
    og = lambda p: (m.group(1) if (m := re.search(rf'<meta property="og:{p}" content="([^"]*)"', s)) else None)
    name = html.unescape(og("title") or "").replace(" - Mayco", "").strip()
    code = None
    for l in L:
        if re.fullmatch(r"SW-?\d+[A-Z]?", l): code = l.replace("SW", "SW-").replace("SW--", "SW-"); break
    if not code:
        m = re.search(r"/product/sw-?(\d+[a-z]?)-", u)
        code = f"SW-{m.group(1).upper()}" if m else None
    # captioned images: (src, caption)
    imgs = [(src, re.sub(r"\s+", " ", re.sub(r"<br\s*/?>", " ", html.unescape(alt))).strip())
            for src, alt in re.findall(r'<img src="(https://www\.maycocolors\.com/wp-content/uploads/[^"]+)" alt="([^"]*)"', s)]
    imgs = list(dict.fromkeys(imgs))
    # description block between code line and "Size /Unit of Measure"
    desc = []
    if code:
        try:
            i = max(idx for idx, l in enumerate(L) if l.replace("SW", "SW-").replace("SW--", "SW-") == code and idx > 100)
        except ValueError:
            i = None
        if i is not None:
            for l in L[i + 1:]:
                if l.startswith("Size /Unit"): break
                desc.append(l)
    text = " ".join(desc).replace(" :", ":").replace("TIP:", "Tip:")
    text = re.sub(r"\s+", " ", text).strip()
    line_desc = ""
    if "Description" in L:
        j = len(L) - 1 - L[::-1].index("Description")
        line_desc = " ".join(L[j + 1:j + 3]) if j + 1 < len(L) else ""
    dm = re.search(r'attribute_dinnerware-safe.*?<img src="[^"]*/([a-z0-9-]+)\.png"', s, re.S)
    food_icon = dm.group(1) if dm else None
    food = True if food_icon == "dinnerware-safe" else False if food_icon and "not" in food_icon else None
    out.append({"url": u, "code": code, "name": name, "description": text, "line_note": line_desc,
                "image": og("image"), "og_description": html.unescape(og("description") or ""), "captioned": imgs, "dinnerware_safe": food, "dinnerware_icon": food_icon})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
