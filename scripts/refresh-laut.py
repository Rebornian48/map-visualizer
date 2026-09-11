"""Refresh public/boundaries/laut/*.json from BIG.

Source
------
Badan Informasi Geospasial, service ``BatasNegaraLaut``:

  https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/BatasNegaraLaut/MapServer

Four polyline sublayers, each becomes its own vendored file so each can
be toggled independently on the map:

  layer 0  LAUTTERITORIAL_LN   — Laut Teritorial (12 nm)
  layer 1  ZONATAMBAHAN_LN     — Zona Tambahan (24 nm)
  layer 2  LANDASKONTINEN_LN   — Landas Kontinen (Continental Shelf)
  layer 3  ZEE_LN              — Zona Ekonomi Eksklusif (200 nm)

Feature counts are small (21 + 10 + 31 + 24 = 86 total) and file sizes
per layer stay well under 100 KB, so we don't simplify — the raw
polylines are already coarse enough for a country-level overview.

Usage
-----
Run from repo root:

    python scripts/refresh-laut.py

Requires: nothing beyond stdlib (no shapely — these are polylines, no
dissolve/simplify).
"""
import json, sys, io, time, urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO    = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "public" / "boundaries" / "laut"

BASE = ("https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH"
        "/BatasNegaraLaut/MapServer/{layer}/query")

# One entry per sublayer. ``slug`` becomes the output filename and the
# toggle id in the UI; ``fields`` is the whitelist we keep for popups.
LAYERS = [
    {"idx": 0, "slug": "teritorial",
     "label": "Laut Teritorial",
     "fields": "STSLAT,UUPP,BTSNGR,PJGBTS,REMARK"},
    {"idx": 1, "slug": "zona-tambahan",
     "label": "Zona Tambahan",
     "fields": "STSLAT,UUPP,BTSNGR,PJGBTS,REMARK"},
    {"idx": 2, "slug": "landas-kontinen",
     "label": "Landas Kontinen",
     "fields": "STSLAT,UUPP,BTSNGR,PJGBTS,REMARK"},
    {"idx": 3, "slug": "zee",
     "label": "ZEE (Zona Ekonomi Eksklusif)",
     "fields": "STSLAT,UUPP,BTSNGR,PJGBTS,REMARK"},
]

PAGE = 1000  # per-layer counts are ~30 max, so this fetches everything at once


def http_get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-laut-refresh/1.0",
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def fetch_all(layer, fields):
    url = (BASE.format(layer=layer)
           + f"?where=1=1&outFields={fields}"
           + f"&resultRecordCount={PAGE}&resultOffset=0"
           + "&geometryPrecision=5&outSR=4326&f=geojson")
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


def clean_feature(feat, keep_props):
    g = feat.get("geometry")
    if not g:
        return None
    g["coordinates"] = round_coords(strip_z(g["coordinates"]), 4)
    props = feat.get("properties") or {}
    feat["properties"] = {
        k: (str(props.get(k) or "")).strip() for k in keep_props
    }
    return feat


OUT_DIR.mkdir(parents=True, exist_ok=True)
for spec in LAYERS:
    print(f"fetch layer {spec['idx']} ({spec['slug']}) …", flush=True)
    keep_props = spec["fields"].split(",")
    j = fetch_all(spec["idx"], spec["fields"])
    raw_feats = j.get("features") or []
    features = []
    for f in raw_feats:
        cleaned = clean_feature(f, keep_props)
        if cleaned:
            features.append(cleaned)
    out = OUT_DIR / f"{spec['slug']}.json"
    fc = {"type": "FeatureCollection", "features": features}
    out.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"  wrote {out.relative_to(REPO)}  "
          f"{out.stat().st_size / 1024:.1f} KB  "
          f"({len(features)} features)")
