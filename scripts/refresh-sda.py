"""Refresh public/sda/*.json from BIG SUMBER_DAYA_ALAM_DAN_LINGKUNGAN MapServer.

Source
------
Sekretariat Kebijakan Satupeta / BIG, MapServer edisi 2024-08:

  https://kspservices.big.go.id/satupeta/rest/services
    /PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer

Sibling of ``refresh-sarpras.py``. Vendors 34 curated sublayers covering
peat, watersheds, geology, natural hazards, mineral resources, cultural
heritage, and conservation zones. Same engine — paginate + per-layer
field whitelist + ``maxAllowableOffset`` server-side simplification.

Feature counts vary wildly, from 3 (Likuifaksi) to 344,506 (Rawan
Banjir). The huge polygon sets (Mangrove 240k, Rawan Banjir 344k,
Gerakan Tanah 265k, Karhutla 176k) get aggressive server-side
simplification via ``server_offset`` — accept lossy geometry to keep
each vendored file under a few dozen MB.

Usage
-----
Run from repo root — one or more slugs, or ``all``:

    python scripts/refresh-sda.py                 # everything
    python scripts/refresh-sda.py karst panas-bumi
    python scripts/refresh-sda.py all
"""
import json, sys, io, time, urllib.request, ssl
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO    = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "public" / "sda"

BASE = ("https://kspservices.big.go.id/satupeta/rest/services"
        "/PUBLIK/SUMBER_DAYA_ALAM_DAN_LINGKUNGAN/MapServer/{id}/query")

# --- per-layer settings -----------------------------------------------------
# ``keep``          → property whitelist
# ``page``          → resultRecordCount (server maxRecordCount = 1000; smaller
#                     for heavy polygon layers so responses don't 502)
# ``server_offset`` → Esri maxAllowableOffset in degrees (0 = no simplify)
# ``round``         → coord decimal precision (5≈1.1m, 4≈11m, 3≈111m)
LAYERS = [
    # --- Tanah / Geologi -------------------------------------------------
    {"id":  6, "slug": "gambut",
     "keep": ["namobj","wadmpu","landform","bhnindk","relief","usda1","usda2","usda3"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id":  8, "slug": "geologi",
     "keep": ["namobj","umurobj","simobj","remark"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id":  9, "slug": "geostruktur",
     "keep": ["namaobj","klsstr","remark"],
     "page": 300, "server_offset": 0.005, "round": 4},
    {"id": 23, "slug": "karst",
     "keep": ["namobj","klskbak","skkbak","datstr","spatial_re","remark"],
     "page": 300, "server_offset": 0.002, "round": 5},
    {"id": 48, "slug": "ekosistem-gambut",
     "keep": ["kode_khg","peat_thick","tnh_gambut","feg_peat","feg_50k"],
     "page": 300, "server_offset": 0.003, "round": 5},

    # --- Hidrologi -------------------------------------------------------
    {"id":  7, "slug": "das",
     "keep": ["kode_das","nama_das","luas_ha","klsfks","bpdashl","keterangan"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id": 45, "slug": "neraca-air",
     "keep": ["nm_inf","nama_ws","kode_ws","luas_km2","ktrs_air","kbth_air",
              "nrc_air","kls_nrcair","ipa","kls_ipa","populasi","keterangan"],
     "page": 200, "server_offset": 0.002, "round": 5},
    {"id": 53, "slug": "danau",
     "keep": ["nm_inf","nama_ws","pengelola","jns_danau","luas_danau","vol_danau",
              "provinsi","kab_kota","kec","kel_desa","thn_data","irigasi","dmi","ket"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 54, "slug": "embung",
     "keep": ["nm_inf","nama_ws","pengelola","jns_embung","vol_embung","luas_genan",
              "kap_tamp","thn_data","provinsi","kab_kota","kec","kel_desa","ket"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 55, "slug": "situ",
     "keep": ["nm_inf","nama_ws","pengelola","jns_situ","vol_situ","luas_situ",
              "kap_tamp","thn_data","provinsi","kab_kota","kec","kel_desa","ket"],
     "page": 500, "server_offset": 0, "round": 5},

    # --- Bencana ---------------------------------------------------------
    {"id": 10, "slug": "krb-gunungapi-titik",
     "keep": ["namobj","cla","vei","mon","tim","victim","tek","gasvul","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 11, "slug": "krb-gunungapi-area",
     "keep": ["namobj","clapi","vei","tim","vic","dur","remark"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 12, "slug": "krb-gempa",
     "keep": ["namobj","kelas","krbid"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id": 13, "slug": "gerakan-tanah",
     "keep": ["namobj","zona","klsgtn","tahun","remark"],
     "page": 200, "server_offset": 0.01, "round": 3},
    {"id": 14, "slug": "krb-tsunami",
     "keep": ["unsur","keterangan","tahun_terbit","provinsi","kota_kabupaten",
              "kecamatan","tinggi_genangan"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 43, "slug": "likuifaksi",
     "keep": ["namobj","kerentanan","keterangan"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 44, "slug": "patahan-aktif",
     "keep": ["namobj","simobj","jenispthn","pjgpthn","lokasi","geologi",
              "sjrhgempa","remark"],
     "page": 300, "server_offset": 0.001, "round": 5},
    {"id": 46, "slug": "kerentanan-pesisir",
     "keep": ["provinsi","kab_kota","status","produksi","remark"],
     "page": 300, "server_offset": 0.001, "round": 5},
    {"id": 47, "slug": "karhutla",
     "keep": ["namobj","kelas","provinsi","luas","keterangan"],
     "page": 200, "server_offset": 0.01, "round": 3},
    {"id": 58, "slug": "rawan-banjir",
     "keep": ["bentanglhn","r_banjir","kelas_rawan","tahun"],
     "page": 200, "server_offset": 0.01, "round": 3},
    {"id": 60, "slug": "seismisitas",
     "keep": ["tanggal","waktu","bujur","lintang","kedalaman","magnitudo",
              "kelaskedalaman"],
     "page": 1000, "server_offset": 0, "round": 4},

    # --- Sumber daya mineral --------------------------------------------
    {"id": 24, "slug": "mineral-logam",
     "keep": ["namobj","jnskom","lbunsur","kellgm","lokasilgm","statdiklgm",
              "acuan","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 25, "slug": "mineral-non-logam",
     "keep": ["namobj","jnskombl","lbunsurbl","kelkombl","lokasibl","statdikbl",
              "acuan","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 26, "slug": "batubara",
     "keep": ["namobj","lokasi","klsbb","hipbb","totsdbb","totcadbb",
              "statdikbb","acuan","remark"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 27, "slug": "panas-bumi",
     "keep": ["namobj","lokasi","status","statdikpb","klsrsv","temprsv",
              "mgkinpb","spekpb","thndatpb","remark"],
     "page": 500, "server_offset": 0, "round": 5},

    # --- Ekosistem / Vegetasi --------------------------------------------
    {"id": 49, "slug": "lahan-kritis",
     "keep": ["namobj","kritis","bpdas","remark"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id": 50, "slug": "dddtlh",
     "keep": ["namobj","status","sedia","bth_dom","bth_lahan","ambang_bts",
              "kdppum","kdpkab","remark"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id": 51, "slug": "perikanan-budidaya",
     "keep": ["namobj","tipeair","provinsi","kabupaten","kecamatan",
              "status","referensi","sumberdata","thnsumber"],
     "page": 200, "server_offset": 0.005, "round": 4},
    {"id": 56, "slug": "lahan-garam",
     "keep": ["namaobj","provinsi","kabupaten","kecamatan","jenis_lahan",
              "teknologi","pola","luas","status","fungsi","referensi"],
     "page": 300, "server_offset": 0.002, "round": 5},
    {"id": 57, "slug": "mangrove",
     "keep": ["kttj","ints","fgsfrf","prov","kab","lsmgr","bpdashl","thnbuat"],
     "page": 200, "server_offset": 0.01, "round": 3},

    # --- Cagar budaya + Konservasi --------------------------------------
    {"id": 31, "slug": "cagar-budaya-kawasan",
     "keep": ["namobj","prov","kabkota","krtacbdef","fgsicbdef","sttpcbdef",
              "kndscbdef","pnglcbdef","sk","tglsk","luas","thndata"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 32, "slug": "cagar-budaya-titik",
     "keep": ["namobj","prov","kabkota","kec","krtacbdef","fgsicbdef",
              "sttpcbdef","kndscbdef","pnglcbdef","sk","tglsk","thndata"],
     "page": 500, "server_offset": 0, "round": 5},
    {"id": 33, "slug": "zonasi-konservasi",
     "keep": ["nkws","nprov","nupt","fgskws","kodezona","catatan","keterangan","remark"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 34, "slug": "blok-konservasi",
     "keep": ["nkws","nprov","nupt","fgskws","kodeblok","cakupan","catatan","keterangan"],
     "page": 200, "server_offset": 0.001, "round": 5},
    {"id": 35, "slug": "konservasi-perairan",
     "keep": ["namobj","namaobj","provinsi","kkp","zonkkp","sznkkp","nskkkp",
              "tskkkp","remark"],
     "page": 200, "server_offset": 0.001, "round": 5},
]

# --- helpers ----------------------------------------------------------------

# kspservices.big.go.id uses a Let's Encrypt cert that trips some stdlib
# SSL contexts on Windows; curl -k equivalents keep working.
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def http_get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-sda-refresh/1.0",
    })
    with urllib.request.urlopen(req, timeout=240, context=CTX) as r:
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
    for attempt in range(6):
        try:
            return json.loads(http_get(url))
        except Exception as e:
            last_err = e
            print(f"    retry {attempt+1} after error: {e}", flush=True)
            time.sleep(5 * (attempt + 1))
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
        print(f"       offset={offset:>6}  +{len(batch)} → total {len(features)}",
              flush=True)
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
    kb = out.stat().st_size / 1024
    tag = f"{kb / 1024:.2f} MB" if kb > 1024 else f"{kb:.1f} KB"
    print(f"       wrote {out.relative_to(REPO)}  {tag}  ({len(features)} features)")


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
