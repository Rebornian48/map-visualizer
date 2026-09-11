"""Refresh public/boundaries/{provinsi,kabkota,kecamatan,desa}.json from BIG.

Source
------
Badan Informasi Geospasial (BIG), edisi Juni 2026:

  https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/
    BATAS_KABKOTA_AR/MapServer      → 541 kab/kota polygons
    BATAS_KECAMATAN_AR/MapServer    → 7.432 kecamatan polygons
    BATAS_DESAKEL_AR/MapServer      → 84.503 kelurahan/desa polygons

All layers use ``esriGeometryPolygon`` on WKID 4326 with the same
``WADMxx``/``KDxxxx`` field convention (see the "props" mapping per target
below), so one paginated fetch + shapely simplify pipeline handles them
all. Provinsi has no dedicated BIG endpoint; we dissolve the kab/kota
polygons by ``WADMPR`` (running the kabkota target implicitly also
produces provinsi).

Usage
-----
Run from repo root — one or more targets:

    python scripts/refresh-boundaries.py                    # kabkota + prov
    python scripts/refresh-boundaries.py kabkota kecamatan
    python scripts/refresh-boundaries.py desa               # slow: ~15 min
    python scripts/refresh-boundaries.py all                # everything

Outputs are written to ``public/boundaries/<target>.json``. Requires
shapely.

Batas laut (polylines) live in their own script — see
``scripts/refresh-laut.py``.
"""
import json, sys, io, time, urllib.request
from pathlib import Path
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, GeometryCollection
from shapely.ops import unary_union
from shapely.validation import make_valid

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO      = Path(__file__).resolve().parent.parent
OUT_DIR   = REPO / "public" / "boundaries"

# --- per-target settings ----------------------------------------------------
# ``server_offset`` snaps points on the BIG side before serialization —
# necessary because the server 500s on full-precision payloads over about
# 5 features. ``tol`` is the extra shapely simplify pass on the client.
# ``page`` is the resultRecordCount per query (server maxRecordCount = 1000
# but chokes at that size unless server_offset is coarse enough).
TARGETS = {
    "kabkota": {
        "service": "BATAS_KABKOTA_AR",
        "fields":  "WADMKK,WADMPR,KDPBPS,KDBBPS",
        "keep":    ["WADMKK", "WADMPR", "KDPBPS", "KDBBPS"],
        "page":    200,
        "server_offset": 0.002,
        "tol":     0.005,
        "round":   4,
    },
    "kecamatan": {
        "service": "BATAS_KECAMATAN_AR",
        "fields":  "WADMKC,WADMKK,WADMPR,KDCBPS,KDBBPS,KDPBPS",
        "keep":    ["WADMKC", "WADMKK", "WADMPR", "KDCBPS", "KDBBPS", "KDPBPS"],
        "page":    500,
        "server_offset": 0.002,  # ~222m
        "tol":     0.003,        # ~333m — kecamatan can be small in urban areas
        "round":   4,
    },
    "desa": {
        "service": "BATAS_DESAKEL_AR",
        "fields":  "WADMKD,WADMKC,WADMKK,WADMPR,KDEBPS,KDCBPS,KDBBPS,KDPBPS",
        "keep":    ["WADMKD", "WADMKC", "WADMKK", "WADMPR",
                    "KDEBPS", "KDCBPS", "KDBBPS", "KDPBPS"],
        "page":    1000,
        "server_offset": 0.005,  # ~555m — many urban desa are ~200m across,
        "tol":     0.002,        # so we accept collapse of the smallest ones
        "round":   4,            # to keep the bundle under ~15 MB
    },
}

# Provinsi is derived from the kabkota dissolve.
PROV_TOL       = 0.020    # ~2.2km
PROV_ROUND     = 4
PROV_MIN_AREA  = 5e-4     # ~6 km² in square degrees near the equator

BASE_URL = ("https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH"
            "/{service}/MapServer/0/query")


# --- helpers ----------------------------------------------------------------

def drop_tiny_holes(geom, min_area):
    """Rebuild polygons without interior rings smaller than ``min_area``.

    Server-side simplification (``maxAllowableOffset``) leaves neighbouring
    polygons with tiny mismatches on their shared edges. After
    ``unary_union`` those mismatches become interior rings of the merged
    polygon — hundreds of ~4-point triangles that bloat the file for no
    visual value. Drop them.
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
        parts = []
        for p in polys:
            if isinstance(p, MultiPolygon):
                parts.extend(p.geoms)
            else:
                parts.append(p)
        return MultiPolygon(parts)
    return None


def http_get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-boundaries-refresh/1.1",
    })
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def fetch_page(service, fields, page, server_offset, offset):
    url = (BASE_URL.format(service=service)
           + f"?where=1=1&outFields={fields}"
           + f"&resultRecordCount={page}&resultOffset={offset}"
           + f"&maxAllowableOffset={server_offset}&geometryPrecision=5"
           + "&outSR=4326&f=geojson")
    last_err = None
    for attempt in range(5):
        try:
            return json.loads(http_get(url))
        except Exception as e:
            last_err = e
            print(f"    retry {attempt+1} after error: {e}", flush=True)
            time.sleep(3 * (attempt + 1))
    raise last_err


def strip_z(coords):
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


def fetch_all(cfg, label):
    print(f"fetch BIG {cfg['service']} (page {cfg['page']}, "
          f"server_offset={cfg['server_offset']}) …", flush=True)
    features = []
    offset = 0
    while True:
        j = fetch_page(cfg["service"], cfg["fields"], cfg["page"],
                       cfg["server_offset"], offset)
        batch = j.get("features") or []
        features.extend(batch)
        print(f"  offset={offset:>6}  +{len(batch)} → total {len(features)}",
              flush=True)
        if len(batch) < cfg["page"]:
            break
        offset += cfg["page"]
    if not features:
        sys.exit(f"no {label} features returned; aborting")
    return features


def simplify_target(label, features, cfg, *, return_prov_buckets=False):
    """Clean + simplify each feature. Optionally bucket by WADMPR for dissolve."""
    print(f"clean + simplify {len(features)} {label} polygons "
          f"(tol={cfg['tol']}°, round {cfg['round']}dp) …", flush=True)
    out_features = []
    prov_buckets = {} if return_prov_buckets else None
    for feat in features:
        feat = clean_feature(feat)
        if feat is None:
            continue
        try:
            geom = shape(feat["geometry"])
        except Exception:
            continue
        if not geom.is_valid:
            try:
                geom = make_valid(geom)
            except Exception:
                # make_valid() can raise IllegalArgumentException on
                # mixed-dimension inputs (server-simplified rings that
                # collapse to point-like slivers). buffer(0) is the
                # classic GIS fallback for such geometries.
                try:
                    geom = geom.buffer(0)
                except Exception:
                    continue
        geom = polygons_only(geom)
        if geom is None or geom.is_empty:
            continue
        props = feat.get("properties") or {}
        if return_prov_buckets:
            prov = (props.get("WADMPR") or "").strip()
            if prov:
                prov_buckets.setdefault(prov, []).append(geom)
        simp = geom.simplify(cfg["tol"], preserve_topology=True)
        simp = polygons_only(simp)
        if simp is None or simp.is_empty:
            continue
        out_features.append({
            "type": "Feature",
            "properties": {k: (props.get(k) or "").strip() for k in cfg["keep"]},
            "geometry": {
                "type": simp.geom_type,
                "coordinates": round_coords(mapping(simp)["coordinates"],
                                            cfg["round"]),
            },
        })
    return out_features, prov_buckets


def dissolve_provinsi(prov_buckets):
    print(f"dissolve {sum(len(v) for v in prov_buckets.values())} kab/kota → "
          f"{len(prov_buckets)} provinsi (tol={PROV_TOL}°) …", flush=True)
    prov_features = []
    for name in sorted(prov_buckets):
        dissolved = unary_union(prov_buckets[name])
        if not dissolved.is_valid:
            dissolved = make_valid(dissolved)
        dissolved = polygons_only(dissolved)
        if dissolved is None or dissolved.is_empty:
            print(f"  ! {name} empty after dissolve — skipped")
            continue
        simp = dissolved.simplify(PROV_TOL, preserve_topology=True)
        simp = polygons_only(simp)
        if simp is None or simp.is_empty:
            print(f"  ! {name} empty after simplify — skipped")
            continue
        if isinstance(simp, MultiPolygon):
            parts = [p for p in simp.geoms if p.area >= PROV_MIN_AREA]
            if not parts:
                parts = [max(simp.geoms, key=lambda p: p.area)]
            simp = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        simp = drop_tiny_holes(simp, PROV_MIN_AREA)
        prov_features.append({
            "type": "Feature",
            "properties": {"WADMPR": name},
            "geometry": {
                "type": simp.geom_type,
                "coordinates": round_coords(mapping(simp)["coordinates"],
                                            PROV_ROUND),
            },
        })
    return prov_features


def write_fc(out_path, features):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": features}
    out_path.write_text(json.dumps(fc, ensure_ascii=False,
                                   separators=(",", ":")),
                        encoding="utf-8")
    print(f"wrote {out_path.relative_to(REPO)}  "
          f"{out_path.stat().st_size / 1024:.1f} KB  "
          f"({len(features)} features)")


# --- entrypoint -------------------------------------------------------------

VALID = list(TARGETS.keys())
argv = [a for a in sys.argv[1:] if not a.startswith("-")]
if not argv:
    targets = ["kabkota"]  # default: prov + kabkota (prov derives from kabkota)
elif argv == ["all"]:
    targets = list(TARGETS.keys())
else:
    targets = argv
    for t in targets:
        if t not in TARGETS:
            sys.exit(f"unknown target '{t}'. valid: {', '.join(VALID)}, all")

for t in targets:
    cfg = TARGETS[t]
    features = fetch_all(cfg, t)
    # Bucket for provinsi only when we're on the kabkota pass — dissolving
    # from kecamatan or desa would just produce noisier provinces.
    want_prov = (t == "kabkota")
    simp_features, prov_buckets = simplify_target(
        t, features, cfg, return_prov_buckets=want_prov)
    write_fc(OUT_DIR / f"{t}.json", simp_features)
    if want_prov:
        prov_features = dissolve_provinsi(prov_buckets)
        write_fc(OUT_DIR / "provinsi.json", prov_features)
