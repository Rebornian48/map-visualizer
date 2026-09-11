"""Refresh public/boundaries/{kabkota,provinsi}.json from BIG.

Source
------
Badan Informasi Geospasial (BIG), edisi Juni 2026:

  https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BATAS_KABKOTA_AR/MapServer

Layer 0 (esriGeometryPolygon, WKID 4326) exposes all 541 kabupaten/kota
including the four new Papua provinces' kab/kota born from UU 14-17/2022.
Provinsi has no dedicated BIG endpoint at this level, so we dissolve
kab/kota polygons by ``WADMPR`` (the provincial name attribute).

Output
------
- ``public/boundaries/kabkota.json`` — 541 kab/kota polygons, RDP-simplified
  ~500m tolerance, coords rounded to 4 decimals (~11m). Properties kept:
  WADMKK, WADMPR, KDPBPS (province BPS code), KDBBPS (kab/kota BPS code).
- ``public/boundaries/provinsi.json`` — 38 provinces, dissolved from
  kabkota, simplified ~1.1km tolerance.

Run from repo root:
    python scripts/refresh-boundaries.py

Requires: shapely.
"""
import json, sys, io, time, urllib.request
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, GeometryCollection
from shapely.ops import unary_union
from shapely.validation import make_valid


def drop_tiny_holes(geom, min_area):
    """Rebuild polygons without interior rings smaller than ``min_area``.

    Server-side simplification (``maxAllowableOffset``) leaves neighbouring
    kab/kota polygons with tiny mismatches on their shared edges. After
    ``unary_union`` those mismatches become interior rings of the merged
    province polygon — hundreds of ~4-point triangles that bloat the file
    for no visual value. Drop them.
    """
    def clean_poly(p):
        if not p.interiors:
            return p
        kept = [r for r in p.interiors if Polygon(r).area >= min_area]
        if len(kept) == len(p.interiors):
            return p
        return Polygon(p.exterior, kept)
    if isinstance(geom, Polygon):
        return clean_poly(geom)
    if isinstance(geom, MultiPolygon):
        return MultiPolygon([clean_poly(p) for p in geom.geoms])
    return geom


def polygons_only(geom):
    """Reduce a possibly-mixed geometry to Polygon/MultiPolygon.

    ``shapely.make_valid`` can hand back a GeometryCollection when the
    input has self-intersections that split off degenerate lines/points;
    keep only the areal parts.
    """
    if isinstance(geom, (Polygon, MultiPolygon)):
        return geom
    if isinstance(geom, GeometryCollection):
        polys = [g for g in geom.geoms if isinstance(g, (Polygon, MultiPolygon))]
        if not polys:
            return None
        if len(polys) == 1:
            return polys[0]
        # Merge each MultiPolygon into a flat list before rebuilding.
        parts = []
        for p in polys:
            if isinstance(p, MultiPolygon):
                parts.extend(p.geoms)
            else:
                parts.append(p)
        return MultiPolygon(parts)
    return None

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO      = Path(__file__).resolve().parent.parent
OUT_DIR   = REPO / "public" / "boundaries"
OUT_KAB   = OUT_DIR / "kabkota.json"
OUT_PROV  = OUT_DIR / "provinsi.json"

BASE = ("https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH"
        "/BATAS_KABKOTA_AR/MapServer/0/query")
FIELDS = "WADMKK,WADMPR,KDPBPS,KDBBPS"
PAGE   = 200  # server 500s on full-precision payloads; 200 works w/ offset
# Server-side simplification degrees. Kept finer than our client-side target
# so the additional shapely.simplify pass is the visual arbiter.
SERVER_OFFSET = 0.002    # ~222m — server-side snap

# Simplify tolerances in degrees. At the equator 0.001° ≈ 111m.
TOL_KAB  = 0.005   # ~555m — readable at country zoom, keeps ~700-900 KB
TOL_PROV = 0.020   # ~2.2km — provinces are country-scale overlays

# Coordinate rounding (decimal places). 4 dp ≈ 11m; 5 dp ≈ 1.1m.
ROUND_KAB  = 4
ROUND_PROV = 4

# Drop tiny islet polygons from the *provinsi* dissolve — country-level
# outlines don't need ~1 km² specks. Threshold is in square degrees;
# 1 sq deg ≈ 12,321 km² at the equator, so 5e-4 ≈ 6 km².
PROV_MIN_AREA_SQDEG = 5e-4


def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-boundaries-refresh/1.0",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def fetch_page(offset):
    url = (f"{BASE}?where=1=1&outFields={FIELDS}"
           f"&resultRecordCount={PAGE}&resultOffset={offset}"
           f"&maxAllowableOffset={SERVER_OFFSET}&geometryPrecision=5"
           "&outSR=4326&f=geojson")
    last_err = None
    for attempt in range(5):
        try:
            return json.loads(fetch(url))
        except Exception as e:
            last_err = e
            print(f"  retry {attempt+1} after error: {e}", flush=True)
            time.sleep(3 * (attempt + 1))
    raise last_err


def strip_z(coords):
    """Recursively drop the z coordinate BIG's GeoJSON leaves in every tuple."""
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        return coords[:2]
    return [strip_z(c) for c in coords]


def round_coords(coords, dp):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], dp), round(coords[1], dp)]
    return [round_coords(c, dp) for c in coords]


def clean_feature(feat):
    g = feat.get("geometry")
    if not g:
        return None
    g["coordinates"] = strip_z(g["coordinates"])
    return feat


# --- 1. fetch everything ----------------------------------------------------
print(f"fetch BIG BATAS_KABKOTA_AR (page size {PAGE}) …", flush=True)
features = []
offset = 0
while True:
    j = fetch_page(offset)
    batch = j.get("features") or []
    features.extend(batch)
    print(f"  offset={offset:>5}  +{len(batch)} → total {len(features)}",
          flush=True)
    if len(batch) < PAGE:
        break
    offset += PAGE

if not features:
    sys.exit("no features returned; aborting")

# --- 2. clean + simplify each kabkota geometry ------------------------------
print(f"clean + simplify {len(features)} kabkota polygons "
      f"(tol={TOL_KAB}°, round {ROUND_KAB}dp) …", flush=True)

# Build per-province bucket while we're iterating, to reuse the shapely
# geometries for the dissolve pass.
prov_buckets = {}
kab_features = []
for feat in features:
    feat = clean_feature(feat)
    if feat is None:
        continue
    geom = shape(feat["geometry"])
    if not geom.is_valid:
        geom = make_valid(geom)
    geom = polygons_only(geom)
    if geom is None or geom.is_empty:
        continue
    props = feat.get("properties") or {}
    prov = (props.get("WADMPR") or "").strip()

    # Bucket by province for dissolve. Use unsimplified geometry to avoid
    # topology gaps between neighbouring kab/kota.
    if prov:
        prov_buckets.setdefault(prov, []).append(geom)

    simp = geom.simplify(TOL_KAB, preserve_topology=True)
    simp = polygons_only(simp)
    if simp is None or simp.is_empty:
        continue
    kab_features.append({
        "type": "Feature",
        "properties": {
            "WADMKK": (props.get("WADMKK") or "").strip(),
            "WADMPR": prov,
            "KDPBPS": (props.get("KDPBPS") or "").strip(),
            "KDBBPS": (props.get("KDBBPS") or "").strip(),
        },
        "geometry": {
            "type": simp.geom_type,
            "coordinates": round_coords(mapping(simp)["coordinates"], ROUND_KAB),
        },
    })

# --- 3. dissolve provinces --------------------------------------------------
print(f"dissolve {len(kab_features)} kab/kota → {len(prov_buckets)} provinsi "
      f"(tol={TOL_PROV}°, round {ROUND_PROV}dp) …", flush=True)
prov_features = []
for name in sorted(prov_buckets):
    dissolved = unary_union(prov_buckets[name])
    if not dissolved.is_valid:
        dissolved = make_valid(dissolved)
    dissolved = polygons_only(dissolved)
    if dissolved is None or dissolved.is_empty:
        print(f"  ! {name} empty after dissolve — skipped")
        continue
    simp = dissolved.simplify(TOL_PROV, preserve_topology=True)
    simp = polygons_only(simp)
    if simp is None or simp.is_empty:
        print(f"  ! {name} empty after simplify — skipped")
        continue
    # Filter out tiny islet slivers (< PROV_MIN_AREA_SQDEG).
    if isinstance(simp, MultiPolygon):
        parts = [p for p in simp.geoms if p.area >= PROV_MIN_AREA_SQDEG]
        if not parts:
            # Keep the largest anyway so the province is not omitted.
            parts = [max(simp.geoms, key=lambda p: p.area)]
        simp = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    # Also drop tiny interior-ring "holes" left by server-side simplify.
    simp = drop_tiny_holes(simp, PROV_MIN_AREA_SQDEG)
    prov_features.append({
        "type": "Feature",
        "properties": {"WADMPR": name},
        "geometry": {
            "type": simp.geom_type,
            "coordinates": round_coords(mapping(simp)["coordinates"], ROUND_PROV),
        },
    })

# --- 4. write out -----------------------------------------------------------
OUT_DIR.mkdir(parents=True, exist_ok=True)

kab_fc = {"type": "FeatureCollection", "features": kab_features}
prov_fc = {"type": "FeatureCollection", "features": prov_features}

OUT_KAB.write_text(json.dumps(kab_fc, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
OUT_PROV.write_text(json.dumps(prov_fc, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")

print(f"wrote {OUT_KAB.relative_to(REPO)}  "
      f"{OUT_KAB.stat().st_size / 1024:.1f} KB  "
      f"({len(kab_features)} kab/kota)")
print(f"wrote {OUT_PROV.relative_to(REPO)} "
      f"{OUT_PROV.stat().st_size / 1024:.1f} KB  "
      f"({len(prov_features)} provinsi)")
