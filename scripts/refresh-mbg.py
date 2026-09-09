"""Refresh public/mbg/incidents.json from Wikipedia.

Downloads the "Makan Bergizi Gratis" section from
  https://id.wikipedia.org/wiki/Daftar_kasus_keracunan_massal_makan_siang_gratis
parses its wikitable (handling rowspan so victim counts aren't double-counted),
matches each kabupaten/kota to a centroid from the boundary GeoJSON, and writes
a compact JSON to public/mbg/incidents.json.

Requires: beautifulsoup4. Run from repo root:  python scripts/refresh-mbg.py
"""
import json, re, io, sys, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parent.parent
OUT  = REPO / "public" / "mbg" / "incidents.json"
KABKOTA_URL = "https://rebornian48.my.id/assets/json/kabkota.json"
WIKI_API = ("https://id.wikipedia.org/w/api.php?action=parse"
            "&page=Daftar_kasus_keracunan_massal_makan_siang_gratis"
            "&prop=text|sections&format=json&disablelimitreport=1")

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

# --- 1. fetch MBG section HTML ----------------------------------------------

print("fetch wiki page …")
page = json.loads(fetch(WIKI_API))
sections = page["parse"]["sections"]
mbg_section = next(s for s in sections if s["line"].strip() == "Makan Bergizi Gratis")
mbg_idx = mbg_section["index"]

sect_url = ("https://id.wikipedia.org/w/api.php?action=parse"
            "&page=Daftar_kasus_keracunan_massal_makan_siang_gratis"
            f"&section={mbg_idx}&prop=text&format=json&disablelimitreport=1")
html = json.loads(fetch(sect_url))["parse"]["text"]["*"]

# --- 2. parse wikitable ------------------------------------------------------

soup = BeautifulSoup(html, "html.parser")
table = soup.find("table", class_="wikitable")
if table is None:
    raise SystemExit("no wikitable in Makan Bergizi Gratis section")

raw_rows = table.find_all("tr")
grid, prim = [], []
row_spans = {}
for tr in raw_rows:
    cells = tr.find_all(["td","th"])
    if not cells: continue
    row, is_primary, ci = [], [], 0
    cell_iter = iter(cells)
    while len(row) < 8:
        if ci in row_spans and row_spans[ci][0] > 0:
            r, v = row_spans[ci]
            row.append(v); is_primary.append(False)
            row_spans[ci] = (r-1, v); ci += 1; continue
        try: cell = next(cell_iter)
        except StopIteration: break
        for ref in cell.find_all("sup", class_="reference"): ref.decompose()
        txt = re.sub(r"\s+"," ", cell.get_text(" ", strip=True)).strip()
        cs = int(cell.get("colspan",1)); rs = int(cell.get("rowspan",1))
        for _ in range(cs):
            row.append(txt); is_primary.append(True)
            if rs > 1: row_spans[ci] = (rs-1, txt)
            ci += 1
    grid.append(row); prim.append(is_primary)

MONTHS = {"januari":1,"februari":2,"maret":3,"april":4,"mei":5,"juni":6,
          "juli":7,"agustus":8,"september":9,"oktober":10,"november":11,"desember":12}
def parse_date(s):
    m = re.search(r"(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})", s or "")
    if not m or m.group(2).lower() not in MONTHS: return None
    return f"{int(m.group(3)):04d}-{MONTHS[m.group(2).lower()]:02d}-{int(m.group(1)):02d}"
def parse_int(s):
    if not s: return 0
    s = s.replace(".","").replace(",","")
    m = re.search(r"(\d+)", s); return int(m.group(1)) if m else 0

rows = []
for r, p in zip(grid[2:], prim[2:]):
    if len(r) < 6: continue
    if not p[4]: continue   # skip rowspan-continuation rows
    date = parse_date(r[0]); n = parse_int(r[4])
    if not date or not n: continue
    if not r[1].strip() or "TOTAL" in r[1].upper(): continue
    rows.append({
        "d": date, "prov": r[1].strip(), "kab": r[2].strip(),
        "loc": r[3].strip(), "n": n,
        "dead": parse_int(r[5]) if p[5] else 0,
    })
print(f"parsed {len(rows)} primary incidents")

# --- 3. centroid map from kabkota.json --------------------------------------

def poly_centroid(coords):
    pts = coords[0]
    if len(pts) < 3: return None
    cx = cy = a = 0.0
    for i in range(len(pts)-1):
        x0,y0 = pts[i]; x1,y1 = pts[i+1]
        cross = x0*y1 - x1*y0
        a += cross; cx += (x0+x1)*cross; cy += (y0+y1)*cross
    a *= 0.5
    if abs(a) < 1e-12:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        return sum(xs)/len(xs), sum(ys)/len(ys)
    return cx/(6*a), cy/(6*a)

def feat_centroid(feat):
    g = feat["geometry"]
    if g["type"] == "Polygon":
        return poly_centroid(g["coordinates"])
    if g["type"] == "MultiPolygon":
        best_area, best = -1, None
        for poly in g["coordinates"]:
            pts = poly[0]
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            area = (max(xs)-min(xs)) * (max(ys)-min(ys))
            if area > best_area: best_area, best = area, poly
        return poly_centroid(best) if best else None
    return None

print("fetch kabkota.json …")
kabkota = json.loads(fetch(KABKOTA_URL))

def norm(s):
    if not s: return ""
    s = re.sub(r"\s+", " ", s.lower()).strip()
    for pfx in ["kabupaten ", "kota administrasi ", "kota "]:
        if s.startswith(pfx): s = s[len(pfx):]
    return re.sub(r"[^a-z0-9 ]", "", s).strip()

centroids, by_kab = {}, {}
for f in kabkota["features"]:
    c = feat_centroid(f)
    if not c: continue
    lng, lat = c
    p = f["properties"]
    key = (norm(p.get("KAB_KOTA","")), norm(p.get("PROVINSI","")))
    centroids[key] = (round(lat, 4), round(lng, 4))
    by_kab.setdefault(key[0], []).append((p.get("PROVINSI",""), round(lat, 4), round(lng, 4)))

PROV_ALIAS = {
    "nanggroe aceh darussalam": "aceh", "aceh": "aceh",
    "sumatera utara":"sumatera utara","sumatera barat":"sumatera barat",
    "riau":"riau","kepulauan riau":"kepulauan riau","jambi":"jambi",
    "sumatera selatan":"sumatera selatan",
    "bangka belitung":"kepulauan bangka belitung",
    "kepulauan bangka belitung":"kepulauan bangka belitung",
    "bengkulu":"bengkulu","lampung":"lampung",
    "dki jakarta":"dki jakarta",
    "daerah khusus ibukota jakarta":"dki jakarta",
    "banten":"banten","jawa barat":"jawa barat","jawa tengah":"jawa tengah",
    "daerah istimewa yogyakarta":"daerah istimewa yogyakarta",
    "yogyakarta":"daerah istimewa yogyakarta",
    "jawa timur":"jawa timur","bali":"bali",
    "nusa tenggara barat":"nusa tenggara barat",
    "nusa tenggara timur":"nusa tenggara timur",
    "kalimantan barat":"kalimantan barat","kalimantan tengah":"kalimantan tengah",
    "kalimantan selatan":"kalimantan selatan","kalimantan timur":"kalimantan timur",
    "kalimantan utara":"kalimantan utara","sulawesi utara":"sulawesi utara",
    "gorontalo":"gorontalo","sulawesi tengah":"sulawesi tengah",
    "sulawesi barat":"sulawesi barat","sulawesi selatan":"sulawesi selatan",
    "sulawesi tenggara":"sulawesi tenggara","maluku":"maluku","maluku utara":"maluku utara",
    "papua":"papua","papua barat":"papua barat","papua barat daya":"papua barat daya",
    "papua tengah":"papua tengah","papua pegunungan":"papua pegunungan",
    "papua selatan":"papua selatan",
}
KAB_ALIAS = {
    "timur tengah utara": "timor tengah utara",
    "pangkajene dan kepulauan": "pangkajene kepulauan",
    "kapupaten jeneponto": "jeneponto",
    "baubau": "bau bau",
}
def norm_prov(s):
    n = norm(s); return PROV_ALIAS.get(n, n)

# --- 4. attach lat/lng, output ----------------------------------------------

matched = 0; unmatched = []
for row in rows:
    kn = KAB_ALIAS.get(norm(row["kab"]), norm(row["kab"]))
    pn = norm_prov(row["prov"])
    latlng = centroids.get((kn, pn))
    if not latlng and kn in by_kab and len(by_kab[kn]) == 1:
        _, la, ln = by_kab[kn][0]; latlng = (la, ln)
    if latlng:
        row["lat"], row["lng"] = latlng; matched += 1
    else:
        unmatched.append((row["prov"], row["kab"]))

print(f"matched {matched}/{len(rows)} incidents to centroids")
if unmatched:
    seen = set()
    for pv, kb in unmatched:
        if (pv, kb) in seen: continue
        seen.add((pv, kb))
        print(f"  UNMATCHED: [{pv}] {kb}")

rows_geo = [r for r in rows if "lat" in r]
rows_geo.sort(key=lambda r: r["d"])

from datetime import date
out = {
    "generated": date.today().isoformat(),
    "first_date": rows_geo[0]["d"] if rows_geo else None,
    "last_date":  rows_geo[-1]["d"] if rows_geo else None,
    "total_incidents": len(rows_geo),
    "total_bergejala": sum(r["n"] for r in rows_geo),
    "total_meninggal": sum(r["dead"] for r in rows_geo),
    "incidents": rows_geo,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
print(f"wrote {OUT}  ({OUT.stat().st_size:,} bytes)")
