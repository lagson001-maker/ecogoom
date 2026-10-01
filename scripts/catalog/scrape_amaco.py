import re, html, json, subprocess, sys, time
UA = "Mozilla/5.0 (GlazeStack catalog research)"
def get(url):
    r = subprocess.run(["curl", "-s", "-m", "25", "-A", UA, url], capture_output=True)
    return r.stdout.decode("utf-8", "ignore")
def text_lines(s):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", "\n", t))
    return [l.strip() for l in t.split("\n") if l.strip()]

listing = sys.argv[1]
urls = []
for page in range(1, 6):
    s = get(f"{listing}?page={page}")
    found = re.findall(r'href="(https://shop\.amaco\.com/[a-z]{2,3}-\d+[a-z]?-[a-z0-9-]+/)"', s)
    new = [u for u in dict.fromkeys(found) if u not in urls]
    if not new: break
    urls += new
print(len(urls), "products", file=sys.stderr)

out = []
for u in urls:
    s = get(u); time.sleep(0.3)
    title = re.search(r'<meta property="og:title" content="([^"]+)"', s)
    image = re.search(r'<meta property="og:image" content="([^"]+)"', s)
    lines = text_lines(s)
    desc = ""
    if "Product Description" in lines:
        i = lines.index("Product Description") + 1
        desc = lines[i] if i < len(lines) else ""
    t = html.unescape(title.group(1)) if title else ""
    m = re.match(r"([A-Z]{2,3}-\d+[A-Z]?)\s+(.*)", t)
    out.append({"url": u, "code": m.group(1) if m else None, "name": (m.group(2) if m else t).strip(),
                "description": desc, "image": html.unescape(image.group(1)) if image else None})
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
