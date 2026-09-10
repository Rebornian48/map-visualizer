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

REPO      = Path(__file__).resolve().parent.parent
OUT       = REPO / "public" / "mbg" / "incidents.json"
OUT_GEO   = REPO / "public" / "mbg" / "incidents.geojson"
# Polygon simplification tolerance in degrees (~110km per degree at equator).
# 0.005 keeps kabupaten shapes readable at country zoom while cutting most
# points; result stays under a few MB.
SIMPLIFY_TOL = 0.005
KABKOTA_URL = "https://rebornian48.my.id/assets/json/kabkota.json"
WIKI_API = ("https://id.wikipedia.org/w/api.php?action=parse"
            "&page=Daftar_kasus_keracunan_massal_makan_siang_gratis"
            "&prop=text|sections&format=json&disablelimitreport=1")

def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-mbg-refresh/1.0 (github.com/Rebornian48/map-visualizer)",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
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
    """Normalise a kabupaten/kota name to '<kind>:<bare-name>'.

    Kabupaten X and Kota X are DIFFERENT administrative units (different
    polygons, different populations), and several cities share the name
    with the surrounding regency — Bandung, Malang, Bogor, Bekasi,
    Tangerang, Cirebon, Sukabumi, Tasikmalaya, Pekalongan, Tegal,
    Magelang, Semarang, Salatiga, Yogyakarta, Kediri, Blitar, Madiun,
    Mojokerto, Probolinggo, Pasuruan, Batu — so we MUST keep the kind
    prefix. Falls back to 'kab:x' when no explicit prefix appears
    (the boundary file uses bare 'Jeneponto' for the regency, etc.).
    """
    if not s: return ""
    s = re.sub(r"\s+", " ", s.lower()).strip()
    kind = "kab"
    if s.startswith("kota administrasi "):
        s, kind = s[len("kota administrasi "):], "kota"
    elif s.startswith("kota "):
        s, kind = s[len("kota "):], "kota"
    elif s.startswith("kabupaten "):
        s, kind = s[len("kabupaten "):], "kab"
    elif s.startswith("kab. "):
        s, kind = s[len("kab. "):], "kab"
    elif s.startswith("kab "):
        s, kind = s[len("kab "):], "kab"
    bare = re.sub(r"[^a-z0-9 ]", "", s).strip()
    return f"{kind}:{bare}"

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
# Wiki-spelling → boundary-spelling. Keys AND values are post-`norm()`,
# so they carry the "kab:" / "kota:" prefix.
KAB_ALIAS = {
    "kab:timur tengah utara": "kab:timor tengah utara",     # wiki typo
    "kab:pangkajene dan kepulauan": "kab:pangkajene kepulauan",
    "kab:kapupaten jeneponto": "kab:jeneponto",             # wiki typo (Kap→Kab)
    "kota:baubau": "kota:bau bau",
    # DKI Jakarta: wiki writes bare "Jakarta X" (defaults to kab:), but the
    # boundary file has "Kota Administrasi Jakarta X" (kota:). No kabupaten
    # by these names exists in DKI (there's only Kepulauan Seribu), so map
    # them to the kota entries.
    "kab:jakarta selatan": "kota:jakarta selatan",
    "kab:jakarta utara":   "kota:jakarta utara",
    "kab:jakarta timur":   "kota:jakarta timur",
    "kab:jakarta barat":   "kota:jakarta barat",
    "kab:jakarta pusat":   "kota:jakarta pusat",
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

# --- 5. polygon choropleth: incidents.geojson -------------------------------
#
# Aggregate primary incidents per (kabupaten, provinsi), then take the
# matching polygon from kabkota.json, simplify, and attach aggregate
# properties. Only affected kabupaten are shipped, so this stays small.

def rdp_indices(pts, tol):
    """Ramer-Douglas-Peucker: return sorted list of point indices to keep."""
    n = len(pts)
    if n < 3: return list(range(n))
    keep = [False] * n
    keep[0] = True; keep[-1] = True
    stack = [(0, n - 1)]
    tol2 = tol * tol
    while stack:
        i, j = stack.pop()
        if j - i < 2: continue
        x1, y1 = pts[i]; x2, y2 = pts[j]
        dx, dy = x2 - x1, y2 - y1
        denom = dx*dx + dy*dy
        best_d2, best_k = -1.0, -1
        for k in range(i + 1, j):
            x0, y0 = pts[k]
            if denom == 0:
                ddx, ddy = x0 - x1, y0 - y1
                d2 = ddx*ddx + ddy*ddy
            else:
                # squared perpendicular distance
                num = dx*(y1 - y0) - (x1 - x0)*dy
                d2 = (num*num) / denom
            if d2 > best_d2:
                best_d2, best_k = d2, k
        if best_d2 > tol2:
            keep[best_k] = True
            stack.append((i, best_k))
            stack.append((best_k, j))
    return [k for k in range(n) if keep[k]]

def simplify_ring(ring, tol):
    if len(ring) < 5: return ring
    idx = rdp_indices(ring, tol)
    # Ensure closure
    if idx[-1] != len(ring) - 1: idx.append(len(ring) - 1)
    return [ring[i] for i in idx]

def simplify_geom(geom, tol):
    if geom["type"] == "Polygon":
        return {"type":"Polygon",
                "coordinates":[[[round(x,4),round(y,4)] for x,y in simplify_ring(r, tol)] for r in geom["coordinates"]]}
    if geom["type"] == "MultiPolygon":
        out = []
        for poly in geom["coordinates"]:
            out.append([[[round(x,4),round(y,4)] for x,y in simplify_ring(r, tol)] for r in poly])
        return {"type":"MultiPolygon","coordinates": out}
    return geom

# Aggregate by (norm kab, norm prov) using the same keys we matched with.
agg = {}   # key -> {"kab":, "prov":, "kejadian":n, "bergejala":n, "meninggal":n, "top": [(loc, n), ...]}
for row in rows_geo:
    kn = KAB_ALIAS.get(norm(row["kab"]), norm(row["kab"]))
    pn = norm_prov(row["prov"])
    key = (kn, pn)
    a = agg.get(key)
    if not a:
        a = {"kab": row["kab"], "prov": row["prov"], "kejadian": 0,
             "bergejala": 0, "meninggal": 0, "top": []}
        agg[key] = a
    a["kejadian"] += 1
    a["bergejala"] += row["n"]
    a["meninggal"] += row.get("dead", 0)
    a["top"].append((row["loc"], row["n"], row["d"]))

for a in agg.values():
    a["top"].sort(key=lambda t: -t[1])
    a["top"] = a["top"][:3]  # keep top 3 by victim count

# Extract matching polygons from kabkota.
feats = []
matched_poly = 0
for f in kabkota["features"]:
    p = f["properties"]
    key = (norm(p.get("KAB_KOTA","")), norm(p.get("PROVINSI","")))
    a = agg.get(key)
    if not a: continue
    geom = simplify_geom(f["geometry"], SIMPLIFY_TOL)
    feats.append({
        "type": "Feature",
        "geometry": geom,
        "properties": {
            "kab": a["kab"],
            "prov": a["prov"],
            "n": a["bergejala"],
            "kj": a["kejadian"],
            "dd": a["meninggal"],
            "top": [{"loc": t[0], "n": t[1], "d": t[2]} for t in a["top"]],
        },
    })
    matched_poly += 1

# Fallback matcher for keys the boundary file didn't reach directly.
missing = [k for k in agg if not any(
    (norm(f["properties"].get("KAB_KOTA","")), norm(f["properties"].get("PROVINSI","")))
    == k for f in kabkota["features"]
)]
if missing:
    for f in kabkota["features"]:
        p = f["properties"]
        kn = norm(p.get("KAB_KOTA",""))
        for mk in missing:
            if mk[0] == kn:
                a = agg[mk]
                geom = simplify_geom(f["geometry"], SIMPLIFY_TOL)
                feats.append({
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "kab": a["kab"], "prov": a["prov"],
                        "n": a["bergejala"], "kj": a["kejadian"], "dd": a["meninggal"],
                        "top": [{"loc": t[0], "n": t[1], "d": t[2]} for t in a["top"]],
                    },
                })
                matched_poly += 1
                break

fc = {
    "type": "FeatureCollection",
    "generated": date.today().isoformat(),
    "first_date": out["first_date"],
    "last_date":  out["last_date"],
    "total_incidents": out["total_incidents"],
    "total_bergejala": out["total_bergejala"],
    "total_meninggal": out["total_meninggal"],
    "features": feats,
}
OUT_GEO.write_text(json.dumps(fc, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
print(f"wrote {OUT_GEO}  ({OUT_GEO.stat().st_size:,} bytes, {matched_poly} polygons)")
