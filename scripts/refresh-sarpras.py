"""Refresh public/sarpras/*.json from BIG SARANA_PRASARANA MapServer.

Source
------
Sekretariat Kebijakan Satupeta / BIG, MapServer edisi 2024-07:

  https://kspservices.big.go.id/satupeta/rest/services
    /PUBLIK/SARANA_PRASARANA/MapServer

We vendor a curated subset of the 47 sublayers — transport nodes,
energy, water, and airspace/port polygons — so the map has a static,
paginated snapshot instead of hammering the server on every load.

Layer index (id → slug → geometry):

   0  pelabuhan-perikanan     point
   1  pelabuhan-umum          point
   2  pelabuhan-penyeberangan point
   3  terminal-khusus         point
   4  bandara                 point
   6  rel                     polyline
   7  stasiun-ka              point
   8  jaringan-listrik        polyline
   9  gardu-induk             point
  10  pembangkit-poly         polygon
  11  pembangkit              point
  13  jalan-nasional-non-tol  polyline
  14  jalan-nasional-tol      polyline
  19  bendungan-eksisting     point
  25  terminal-bbm            point
  26  terminal-lpg            point
  27  kilang-minyak           point
  29  alur-pelayaran          polyline
  30  ruang-udara             polygon
  31  dlkr-dlkp-pelabuhan     polygon
  32  kkop                    polygon
  33  sbnp                    point   (~4.5k features — largest set)

Usage
-----
Run from repo root — one or more slugs, or ``all``:

    python scripts/refresh-sarpras.py                # everything
    python scripts/refresh-sarpras.py bandara sbnp
    python scripts/refresh-sarpras.py all

Outputs are written to ``public/sarpras/<slug>.json`` as compact
GeoJSON FeatureCollections. No external deps — stdlib only.
"""
import json, sys, io, time, urllib.request, ssl
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO    = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "public" / "sarpras"

BASE = ("https://kspservices.big.go.id/satupeta/rest/services"
        "/PUBLIK/SARANA_PRASARANA/MapServer/{id}/query")

# --- per-layer settings -----------------------------------------------------
# ``keep`` is the property whitelist (BIG returns many admin/audit columns
# we never surface). ``server_offset`` maps to Esri ``maxAllowableOffset`` in
# degrees — set for polylines/polygons only. ``round`` is the coord decimal
# precision after fetch (5 = ~1.1 m at the equator).
LAYERS = [
    # id, slug, geometry, keep, page, server_offset, round
    {"id":  0, "slug": "pelabuhan-perikanan",
     "keep": ["namobj","kelas","pengelola","status","remark"],
     "page": 1000, "server_offset": 0, "round": 5},
    {"id":  1, "slug": "pelabuhan-umum",
     "keep": ["namobj","nama_pp","tipe_pp","klspel","hirrki","alamat",
              "wadmpr","wadmkk","notelp","surel","stat_ops","jns_kpl","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id":  2, "slug": "pelabuhan-penyeberangan",
     "keep": ["namobj","admpel","alamat","kelas","wadmpr","wadmkk",
              "notelp","surel","jns_kpl","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id":  3, "slug": "terminal-khusus",
     "keep": ["namobj","nama_pp","alamat","prov","kabkot","bdg_keg",
              "status","stat_ops","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id":  4, "slug": "bandara",
     "keep": ["namobj","kdicao","kdiata","elevas","klsbmi","funaip","hiraip",
              "kataip","kepaip","jamopr","wadmkk"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id":  6, "slug": "rel",
     "keep": ["namobj","tiprel","klsrel","jmlrel","kebrel","wilker","remark"],
     "page": 400, "server_offset": 0.0005, "round": 5},
    {"id":  7, "slug": "stasiun-ka",
     "keep": ["namobj","klssta","wilsta","dopsta","linsta","wadmkk","wadmpr",
              "wil_op","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id":  8, "slug": "jaringan-listrik",
     "keep": ["namobj","pjgjar","regpln"],
     "page": 300, "server_offset": 0.001, "round": 4},
    {"id":  9, "slug": "gardu-induk",
     "keep": ["namaobj","teggi","kapgi","statmlk","statopr","regpln",
              "alamat","thnopr","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 10, "slug": "pembangkit-poly",
     "keep": ["namobj","enrgprmr","daya","regpln","alamat","thnopr"],
     "page": 200, "server_offset": 0.0005, "round": 5},
    {"id": 11, "slug": "pembangkit",
     "keep": ["namobj","daya","enrgprmr","alamat","regpln","thnopr"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 13, "slug": "jalan-nasional-non-tol",
     "keep": ["nm_inf","fungsi","kd_ruas","status","pjg_datar","tipe_jalan",
              "km_awal_ru","km_akhir_r","lhrt"],
     "page": 200, "server_offset": 0.001, "round": 4},
    {"id": 14, "slug": "jalan-nasional-tol",
     "keep": ["nm_inf","fungsi","pjg_datar","status","thn_bang","thn_oprs",
              "nm_inv","konsesi","tipe_jalan","lhrt"],
     "page": 200, "server_offset": 0.0005, "round": 5},
    {"id": 19, "slug": "bendungan-eksisting",
     "keep": ["nm_inf","pengelola","tipe_bdgan","status","kondisi_dat",
              "nama_ws","nama_das","kab","provinsi","tng_bdg","vol_bdgan",
              "irigrasi","plta","thn_seles"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 25, "slug": "terminal-bbm",
     "keep": ["namobj","alamatbu","kap","status","effdat","expdat"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 26, "slug": "terminal-lpg",
     "keep": ["namaobj","bdnush","kap"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 27, "slug": "kilang-minyak",
     "keep": ["namobj","nmoprt","skema","kap","status"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 29, "slug": "alur-pelayaran",
     "keep": ["namobj","nama_upt","alamat","thn_alur","lbr_alur","pjg_alur",
              "wadmpr","wadmkk","remark"],
     "page": 200, "server_offset": 0.0005, "round": 5},
    {"id": 30, "slug": "ruang-udara",
     "keep": ["namobj","jenis","service","tipais","konkon","klsrud",
              "low_limit","upp_limit","frekuensi"],
     "page": 200, "server_offset": 0.001, "round": 4},
    {"id": 31, "slug": "dlkr-dlkp-pelabuhan",
     "keep": ["namobj","kode","sk_tap_dlk","prov","kabkot","luas","remark"],
     "page": 200, "server_offset": 0.0005, "round": 5},
    {"id": 32, "slug": "kkop",
     "keep": ["namobj","kawasan"],
     "page": 200, "server_offset": 0.0005, "round": 5},
    {"id": 33, "slug": "sbnp",
     "keep": ["namobj","arti","tipbuy","nm_penylgr","thn_ops","t_mnr",
              "jrk_tmpk","nomor_dsi","remark"],
     "page": 1000, "server_offset": 0, "round": 5},
]

# --- helpers ----------------------------------------------------------------

# BIG's kspservices host currently serves a Let's Encrypt cert that some
# stdlib SSL contexts on Windows fail to verify against the local trust
# store. urllib is fine going through the same context that curl -k uses.
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def http_get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-sarpras-refresh/1.0",
    })
    with urllib.request.urlopen(req, timeout=180, context=CTX) as r:
        return r.read()


def fetch_page(lid, keep, page, server_offset, offset):
    fields = ",".join(keep)
    url = (BASE.format(id=lid)
           + f"?where=1=1&outFields={fields}"
           + f"&resultRecordCount={page}&resultOffset={offset}"
           + "&outSR=4326&f=geojson"
           + "&geometryPrecision=6"
           + (f"&maxAllowableOffset={server_offset}" if server_offset else ""))
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


def clean_props(props, keep):
    out = {}
    for k in keep:
        v = props.get(k)
        if v is None or v == "":
            continue
        # Trim strings; leave numerics alone
        if isinstance(v, str):
            v = v.strip()
            if not v:
                continue
        out[k] = v
    return out


def clean_feature(feat, keep, dp):
    g = feat.get("geometry")
    if not g or "coordinates" not in g:
        return None
    coords = round_coords(strip_z(g["coordinates"]), dp)
    if not coords:
        return None
    return {
        "type": "Feature",
        "properties": clean_props(feat.get("properties") or {}, keep),
        "geometry": {"type": g["type"], "coordinates": coords},
    }


def fetch_layer(spec):
    lid  = spec["id"]
    slug = spec["slug"]
    print(f"[{lid:2}] {slug}: paginate (page={spec['page']}"
          + (f", server_offset={spec['server_offset']}" if spec["server_offset"] else "")
          + ") …", flush=True)
    features = []
    offset = 0
    while True:
        j = fetch_page(lid, spec["keep"], spec["page"],
                       spec["server_offset"], offset)
        batch = j.get("features") or []
        for f in batch:
            cf = clean_feature(f, spec["keep"], spec["round"])
            if cf:
                features.append(cf)
        print(f"       offset={offset:>5}  +{len(batch)} → total {len(features)}",
              flush=True)
        # Prefer the explicit server flag when present, fall back to page-size
        # comparison for older MapServer builds that omit it.
        exceeded = j.get("exceededTransferLimit")
        if exceeded is False:
            break
        if exceeded is None and len(batch) < spec["page"]:
            break
        if not batch:
            break
        offset += len(batch)
    return features


def write_fc(slug, features):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": features}
    out = OUT_DIR / f"{slug}.json"
    out.write_text(json.dumps(fc, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"       wrote {out.relative_to(REPO)}  "
          f"{out.stat().st_size / 1024:.1f} KB  "
          f"({len(features)} features)")


# --- entrypoint -------------------------------------------------------------

VALID = {s["slug"]: s for s in LAYERS}
argv = [a for a in sys.argv[1:] if not a.startswith("-")]
if not argv or argv == ["all"]:
    todo = LAYERS
else:
    todo = []
    for a in argv:
        if a not in VALID:
            sys.exit(f"unknown slug '{a}'. valid: {', '.join(VALID)}, all")
        todo.append(VALID[a])

t0 = time.time()
for spec in todo:
    try:
        feats = fetch_layer(spec)
    except Exception as e:
        print(f"       !! failed: {e}")
        continue
    if not feats:
        print(f"       !! no features for {spec['slug']} — skipped")
        continue
    write_fc(spec["slug"], feats)
print(f"done in {time.time() - t0:.1f}s")
