import L from "leaflet";
import { anchorIcon, planeIcon, trainIcon } from "./mapIcons";

// Static snapshots of 22 sublayers from BIG's Satupeta
// SARANA_PRASARANA MapServer (edisi 2024-07). Refreshed manually via
// scripts/refresh-sarpras.py. See that script for source URLs and the
// per-layer property whitelist.

function sarprasUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sarpras/${name}.json`;
}

// ---------- base palette (used when a layer isn't categorised) ------------
const C = {
  fishery:      "#00838f",
  seaport:      "#0277bd",
  ferryport:    "#00acc1",
  jetty:        "#26a69a",
  airport:      "#1e88e5",
  railLine:     "#ffb300",
  railStation:  "#ff6f00",
  power:        "#c62828",
  gardu:        "#ad1457",
  genPoly:      "#e65100",
  genPoint:     "#f4511e",
  jalanNonTol:  "#5d4037",
  jalanTol:     "#d84315",
  dam:          "#1565c0",
  bbm:          "#6d4c41",
  lpg:          "#8d6e63",
  kilang:       "#4e342e",
  alur:         "#00695c",
  ruangUdara:   "#7e57c2",
  dlkr:         "#5e35b1",
  kkop:         "#8e24aa",
  sbnp:         "#fbc02d",
};

// ---------- reusable palettes ---------------------------------------------
// Ordinal risk/quality ramp (4 tiers). Cool → warm so a glance ranks them.
const RAMP4 = { verylow: "#66bb6a", low: "#ffca28", mid: "#fb8c00", high: "#e53935" };
// Qualitative 12-hue palette (ColorBrewer Set3-ish, tuned for both themes).
const QUAL = [
  "#1e88e5", "#e53935", "#43a047", "#fb8c00", "#8e24aa", "#00acc1",
  "#c62828", "#7cb342", "#5e35b1", "#f4511e", "#00897b", "#ec407a",
];

// ---------- per-slug config -----------------------------------------------
// ``label``     – human name shown as source in the layer control
// ``group``     – section (Transportasi / Energi / Air & Zona)
// ``color``     – default hue (used when no ``categorize`` block)
// ``title``     – property key used as the tooltip/popup headline
// ``fields``    – ordered [label, key] rows for the popup body
// ``categorize``– optional per-feature colour by property value:
//                 { field, values: [[value, color, label]], fallback, unit }
//                 The unit string (e.g. "kV") is stripped from `value`
//                 before comparison so numeric codes still match.
export const SARPRAS_CFG = {
  "pelabuhan-perikanan": {
    label: "Pelabuhan Perikanan", group: "Transportasi · BIG", color: C.fishery,
    title: "namobj",
    fields: [["Kelas", "kelas"], ["Pengelola", "pengelola"], ["Status", "status"], ["Catatan", "remark"]],
    categorize: {
      field: "kelas",
      values: [
        ["Pelabuhan Perikanan Samudera (PPS)",   "#7f0000", "PPS · Samudera"],
        ["Pelabuhan Perikanan Nusantara (PPN)",  "#c62828", "PPN · Nusantara"],
        ["Pelabuhan Perikanan Pantai (PPP)",     "#fb8c00", "PPP · Pantai"],
        ["Pelabuhan Perikanan (PP)",             "#26a69a", "PP · umum"],
        ["Pelabuhan Perikanan Swasta (PS)",      "#5e35b1", "PS · swasta"],
        ["Pangkalan Pendaratan Ikan (PPI)",      "#ffca28", "PPI · pendaratan"],
      ],
      fallback: "#607d8b",
    },
  },
  "pelabuhan-umum": {
    label: "Pelabuhan Umum", group: "Transportasi · BIG", color: C.seaport,
    title: "namobj",
    fields: [["Nama pelabuhan", "nama_pp"], ["Tipe", "tipe_pp"], ["Kelas", "klspel"],
             ["Hierarki", "hirrki"], ["Jenis kapal", "jns_kpl"],
             ["Alamat", "alamat"], ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"],
             ["Telp", "notelp"], ["Email", "surel"], ["Status ops", "stat_ops"]],
    categorize: {
      field: "hirrki",
      // BIG codes hierarki 1..4 (utama/pengumpul/pengumpan-regional/lokal)
      values: [
        ["1", "#c62828", "1 — Utama"],
        ["2", "#fb8c00", "2 — Pengumpul"],
        ["3", "#43a047", "3 — Pengumpan Regional"],
        ["4", "#1e88e5", "4 — Pengumpan Lokal"],
      ],
      fallback: "#607d8b",
    },
  },
  "pelabuhan-penyeberangan": {
    label: "Pelabuhan Penyeberangan", group: "Transportasi · BIG", color: C.ferryport,
    title: "namobj",
    fields: [["ADPEL", "admpel"], ["Kelas", "kelas"], ["Jenis kapal", "jns_kpl"],
             ["Alamat", "alamat"], ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"],
             ["Telp", "notelp"], ["Email", "surel"]],
    categorize: {
      field: "kelas",
      values: [
        ["1", "#c62828", "Kelas I"],
        ["2", "#fb8c00", "Kelas II"],
        ["3", "#43a047", "Kelas III"],
      ],
      fallback: "#607d8b",
    },
  },
  "terminal-khusus": {
    label: "Terminal Khusus (Tersus)", group: "Transportasi · BIG", color: C.jetty,
    title: "namobj",
    fields: [["Nama pelabuhan", "nama_pp"], ["Bidang kegiatan", "bdg_keg"],
             ["Status", "status"], ["Status ops", "stat_ops"],
             ["Alamat", "alamat"], ["Kab/Kota", "kabkot"], ["Provinsi", "prov"]],
  },
  "bandara": {
    label: "Bandara", group: "Transportasi · BIG", color: C.airport,
    title: "namobj",
    fields: [["ICAO", "kdicao"], ["IATA", "kdiata"], ["Elevasi", "elevas"],
             ["Kelas", "klsbmi"], ["Fungsi", "funaip"], ["Hierarki", "hiraip"],
             ["Kategori", "kataip"], ["Pengelola", "kepaip"], ["Jam ops", "jamopr"],
             ["Kab/Kota", "wadmkk"]],
    categorize: {
      field: "hiraip",
      values: [
        ["1", "#c62828", "Bandara Pengumpul"],
        ["2", "#1e88e5", "Bandara Pengumpan"],
      ],
      fallback: "#607d8b",
    },
  },
  "rel": {
    label: "Jaringan Rel", group: "Transportasi · BIG", color: C.railLine,
    title: "namobj",
    fields: [["Tipe rel", "tiprel"], ["Kelas", "klsrel"], ["Jumlah rel", "jmlrel"],
             ["Kebar rel", "kebrel"], ["Wilker", "wilker"], ["Catatan", "remark"]],
    categorize: {
      field: "remark",
      values: [
        ["Aktif",     "#43a047", "Aktif"],
        ["Non Aktif", "#9e9e9e", "Non Aktif"],
      ],
      fallback: "#ffb300",
    },
  },
  "stasiun-ka": {
    label: "Stasiun KA", group: "Transportasi · BIG", color: C.railStation,
    title: "namobj",
    fields: [["Kelas", "klssta"], ["Wilayah", "wilsta"], ["Wilayah ops", "wil_op"],
             ["DOP", "dopsta"], ["Lintas", "linsta"],
             ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"]],
    categorize: {
      field: "remark",
      values: [
        ["Aktif",     "#ff6f00", "Aktif"],
        ["Non Aktif", "#9e9e9e", "Non Aktif"],
      ],
      fallback: "#ff6f00",
    },
  },
  "jalan-nasional-non-tol": {
    label: "Jalan Nasional Non Tol", group: "Transportasi · BIG", color: C.jalanNonTol,
    title: "nm_inf",
    fields: [["Kode ruas", "kd_ruas"], ["Fungsi", "fungsi"], ["Tipe", "tipe_jalan"],
             ["Status", "status"], ["Panjang (m)", "pjg_datar"],
             ["KM awal", "km_awal_ru"], ["KM akhir", "km_akhir_r"], ["LHRT", "lhrt"]],
    categorize: {
      field: "fungsi",
      // K1 = Arteri Primer, A = Arteri (huruf), lowercase 'k1' = variant
      values: [
        ["K1", "#d84315", "K1 — Arteri Primer"],
        ["k1", "#d84315", "K1 — Arteri Primer"],
        ["A",  "#5d4037", "A — Arteri"],
      ],
      fallback: "#5d4037",
    },
  },
  "jalan-nasional-tol": {
    label: "Jalan Nasional Tol", group: "Transportasi · BIG", color: C.jalanTol,
    title: "nm_inf",
    fields: [["Fungsi", "fungsi"], ["Tipe", "tipe_jalan"], ["Status", "status"],
             ["Panjang (m)", "pjg_datar"],
             ["Tahun bangun", "thn_bang"], ["Tahun ops", "thn_oprs"],
             ["Investor", "nm_inv"], ["Konsesi (thn)", "konsesi"], ["LHRT", "lhrt"]],
  },
  "alur-pelayaran": {
    label: "Alur Pelayaran Laut", group: "Transportasi · BIG", color: C.alur,
    title: "namobj",
    fields: [["UPT", "nama_upt"], ["Alamat", "alamat"],
             ["Panjang (m)", "pjg_alur"], ["Lebar (m)", "lbr_alur"],
             ["Tahun", "thn_alur"],
             ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"], ["Catatan", "remark"]],
  },
  "sbnp": {
    label: "Sarana Bantu Navigasi Pelayaran (SBNP)", group: "Transportasi · BIG", color: C.sbnp,
    title: "namobj",
    fields: [["Jenis SBNP", "arti"], ["Tipe pelampung", "tipbuy"],
             ["Penyelenggara", "nm_penylgr"], ["Tahun ops", "thn_ops"],
             ["Tinggi menara (m)", "t_mnr"], ["Jarak tampak (NM)", "jrk_tmpk"],
             ["Nomor DSI", "nomor_dsi"], ["Catatan", "remark"]],
    categorize: {
      field: "tipbuy",
      values: [
        ["A", "#e53935", "A — merah (portside)"],
        ["B", "#43a047", "B — hijau (starboard)"],
        ["C", "#ffca28", "C — kuning (khusus)"],
        ["E", "#1e88e5", "E — biru"],
        ["F", "#9e9e9e", "F — lainnya"],
      ],
      fallback: "#fbc02d",
    },
  },
  "jaringan-listrik": {
    label: "Jaringan Listrik", group: "Energi · BIG", color: C.power,
    title: "namobj",
    fields: [["Panjang jaringan (m)", "pjgjar"], ["Wilayah PLN", "regpln"]],
    categorize: {
      field: "regpln",
      values: [
        ["Jawa-Bali",     "#c62828", "Jawa-Bali"],
        ["Sumatera",      "#fb8c00", "Sumatera"],
        ["Kalimantan",    "#8e24aa", "Kalimantan"],
        ["Sulawesi",      "#00897b", "Sulawesi"],
        ["Nusa Tenggara", "#1e88e5", "Nusa Tenggara"],
        ["Maluku",        "#5e35b1", "Maluku"],
        ["Papua",         "#43a047", "Papua"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "gardu-induk": {
    label: "Gardu Induk", group: "Energi · BIG", color: C.gardu,
    title: "namaobj",
    fields: [["Tegangan (kV)", "teggi"], ["Kapasitas (MVA)", "kapgi"],
             ["Status milik", "statmlk"], ["Status ops", "statopr"],
             ["Wilayah PLN", "regpln"], ["Tahun ops", "thnopr"],
             ["Alamat", "alamat"], ["Catatan", "remark"]],
    categorize: {
      field: "teggi",
      values: [
        ["500 kV", "#7f0000", "500 kV"],
        ["275 kV", "#c62828", "275 kV"],
        ["150 kV", "#fb8c00", "150 kV"],
        ["70 kV",  "#43a047", "70 kV"],
        ["30 kV",  "#1e88e5", "30 kV"],
        ["25 kV",  "#5e35b1", "25 kV"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "pembangkit-poly": {
    label: "Pembangkit Listrik (kawasan)", group: "Energi · BIG", color: C.genPoly,
    title: "namobj",
    fields: [["Energi primer", "enrgprmr"], ["Daya (MW)", "daya"],
             ["Wilayah PLN", "regpln"], ["Alamat", "alamat"], ["Tahun ops", "thnopr"]],
    categorize: {
      field: "enrgprmr",
      values: [
        ["Air",         "#1e88e5", "Air (PLTA)"],
        ["Batubara",    "#3e2723", "Batubara (PLTU)"],
        ["Gas",         "#fb8c00", "Gas (PLTG)"],
        ["Panas Bumi",  "#e53935", "Panas Bumi (PLTP)"],
        ["Surya",       "#ffca28", "Surya (PLTS)"],
        ["MFO",         "#6d4c41", "MFO"],
        ["HSD",         "#4e342e", "HSD (diesel)"],
      ],
      fallback: "#9e9e9e",
      // Any value containing more than one primary keyword is bucketed to "Campuran".
      combined: { color: "#8e24aa", label: "Campuran" },
    },
  },
  "pembangkit": {
    label: "Pembangkit Listrik (titik)", group: "Energi · BIG", color: C.genPoint,
    title: "namobj",
    fields: [["Energi primer", "enrgprmr"], ["Daya (MW)", "daya"],
             ["Wilayah PLN", "regpln"], ["Alamat", "alamat"], ["Tahun ops", "thnopr"]],
    categorize: {
      field: "enrgprmr",
      values: [
        ["Air",         "#1e88e5", "Air (PLTA / PLTMH)"],
        ["Batubara",    "#3e2723", "Batubara (PLTU)"],
        ["Gas",         "#fb8c00", "Gas (PLTG / PLTGU)"],
        ["Panas Bumi",  "#e53935", "Panas Bumi (PLTP)"],
        ["Surya",       "#ffca28", "Surya (PLTS)"],
        ["Biogas",      "#7cb342", "Biogas / Biomassa"],
        ["MFO",         "#6d4c41", "MFO"],
        ["HSD",         "#4e342e", "HSD (diesel)"],
        ["B30",         "#5d4037", "B30 (biodiesel)"],
      ],
      fallback: "#9e9e9e",
      combined: { color: "#8e24aa", label: "Campuran" },
    },
  },
  "terminal-bbm": {
    label: "Terminal BBM", group: "Energi · BIG", color: C.bbm,
    title: "namobj",
    fields: [["Badan usaha", "alamatbu"], ["Kapasitas", "kap"],
             ["Status", "status"], ["Berlaku dari", "effdat"], ["Kadaluarsa", "expdat"]],
  },
  "terminal-lpg": {
    label: "Terminal LPG", group: "Energi · BIG", color: C.lpg,
    title: "namaobj",
    fields: [["Badan usaha", "bdnush"], ["Kapasitas", "kap"]],
  },
  "kilang-minyak": {
    label: "Kilang Minyak", group: "Energi · BIG", color: C.kilang,
    title: "namobj",
    fields: [["Operator", "nmoprt"], ["Skema", "skema"],
             ["Kapasitas (MBSD)", "kap"], ["Status", "status"]],
  },
  "bendungan-eksisting": {
    label: "Bendungan Eksisting", group: "Air & Zona · BIG", color: C.dam,
    title: "nm_inf",
    fields: [["Tipe", "tipe_bdgan"], ["Status", "status"], ["Kondisi", "kondisi_dat"],
             ["Wilayah Sungai", "nama_ws"], ["DAS", "nama_das"],
             ["Kab/Kota", "kab"], ["Provinsi", "provinsi"],
             ["Tinggi (m)", "tng_bdg"], ["Volume normal", "vol_bdgan"],
             ["Irigasi (Ha)", "irigrasi"], ["PLTA (MWH)", "plta"],
             ["Pengelola", "pengelola"], ["Tahun selesai", "thn_seles"]],
  },
  "ruang-udara": {
    label: "Ruang Udara", group: "Air & Zona · BIG", color: C.ruangUdara,
    title: "namobj",
    fields: [["Jenis", "jenis"], ["Service", "service"], ["Tipe AIS", "tipais"],
             ["Konfigurasi", "konkon"], ["Kelas", "klsrud"],
             ["Batas bawah", "low_limit"], ["Batas atas", "upp_limit"],
             ["Frekuensi", "frekuensi"]],
    categorize: {
      field: "jenis",
      values: [
        ["FIR",    "#1e88e5", "FIR — Flight Information Region"],
        ["UTA",    "#3949ab", "UTA — Upper Terminal Area"],
        ["TMA",    "#fb8c00", "TMA — Terminal Manoeuvring Area"],
        ["CTR",    "#d84315", "CTR — Control Zone"],
        ["ATZ",    "#e65100", "ATZ — Aerodrome Traffic Zone"],
        ["AFIZ",   "#00acc1", "AFIZ — Aerodrome FIZ"],
        ["PDRT",   "#c62828", "PDRT — Prohibited/Danger/Restricted/TSA"],
        ["SECTOR", "#546e7a", "SECTOR"],
      ],
      fallback: "#7e57c2",
    },
    // Categories nest (CTR ⊂ TMA ⊂ FIR), so exposing one toggle drops
    // every reader into an unreadable stack. ``split`` fans the source
    // out to one toggle per category and pins each to a Leaflet pane so
    // the smaller shapes always draw on top of the larger ones,
    // regardless of the order the user turned them on. Pane names match
    // the ones useMapController ensures at map init for OpenAIP.
    split: {
      subLabel: (val, longLabel) => `Ruang Udara · ${longLabel}`,
      paneFor: (val) => {
        if (val === "FIR" || val === "UTA") return "airspaceFir";
        if (val === "TMA" || val === "SECTOR") return "airspaceTma";
        return "airspaceCtr";  // CTR / ATZ / AFIZ / PDRT
      },
    },
  },
  "dlkr-dlkp-pelabuhan": {
    label: "DLKr/DLKp Pelabuhan", group: "Air & Zona · BIG", color: C.dlkr,
    title: "namobj",
    fields: [["Kode", "kode"], ["SK penetapan", "sk_tap_dlk"],
             ["Kab/Kota", "kabkot"], ["Provinsi", "prov"],
             ["Luas (m²)", "luas"], ["Catatan", "remark"]],
  },
  "kkop": {
    label: "KKOP — Keamanan Ops Penerbangan", group: "Air & Zona · BIG", color: C.kkop,
    title: "namobj",
    fields: [["Kawasan", "kawasan"]],
    categorize: {
      field: "kawasan",
      values: [
        ["PERMUKAAN UTAMA/STRIP LANDAS PACU",       "#c62828", "Permukaan Utama / Strip Landas Pacu"],
        ["KAWASAN ANCANGAN PENDARATAN DAN LEPAS LANDAS", "#fb8c00", "Ancangan Pendaratan & Lepas Landas"],
        ["KAWASAN KEMUNGKINAN BAHAYA KECELAKAAN",   "#e65100", "Kemungkinan Bahaya Kecelakaan"],
        ["KAWASAN DI BAWAH PERMUKAAN TRANSISI",     "#8e24aa", "Bawah Permukaan Transisi"],
        ["KAWASAN DI BAWAH PERMUKAAN HORISONTAL DALAM", "#5e35b1", "Bawah Permukaan Horisontal Dalam"],
        ["KAWASAN DI BAWAH PERMUKAAN KERUCUT",      "#3949ab", "Bawah Permukaan Kerucut"],
        ["KAWASAN DI BAWAH PERMUKAAN HORISONTAL LUAR", "#1e88e5", "Bawah Permukaan Horisontal Luar"],
      ],
      fallback: "#607d8b",
    },
  },
};

// ---------- SOURCES / builders ---------------------------------------------

// A slug marked with ``split`` expands into one source per category
// value — the user gets an independent toggle for each nested layer.
// The others map 1:1 to a single source keyed by the slug.
export const SARPRAS_SOURCES = Object.entries(SARPRAS_CFG).flatMap(([slug, c]) => {
  if (!c.split) return [{
    key:   `sarpras_${slug}`,
    label: c.label,
    group: c.group,
    kind:  `sarpras:${slug}`,
    url:   sarprasUrl(slug),
  }];
  return c.categorize.values.map(([val, _color, longLabel]) => ({
    key:   `sarpras_${slug}__${val}`,
    label: c.split.subLabel(val, longLabel),
    group: c.group,
    kind:  `sarpras:${slug}:${val}`,
    url:   sarprasUrl(slug),
  }));
});

export const SARPRAS_GROUP_NAMES = [
  "Transportasi · BIG",
  "Energi · BIG",
  "Air & Zona · BIG",
];

// Legend entries — one per categorised slug (skip split layers: each
// sub-toggle is already colour-labelled by its own name).
export const SARPRAS_CATEGORIES = new Map(
  Object.entries(SARPRAS_CFG)
    .filter(([, c]) => c.categorize && !c.split)
    .map(([slug, c]) => [
      `sarpras_${slug}`,
      {
        title: c.label,
        rows: c.categorize.values.map(([_v, color, label]) => ({ color, label }))
          .concat(c.categorize.combined ? [c.categorize.combined] : []),
      },
    ]),
);

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

function fmtNum(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("id-ID");
    return Number(v.toFixed(2)).toLocaleString("id-ID");
  }
  return String(v);
}

function popupHtml(cfg, props) {
  const title = props[cfg.title] || cfg.label;
  const rows = cfg.fields
    .map(([label, key]) => {
      const v = props[key];
      if (v == null || v === "") return null;
      return `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(label)}</td><td>${escapeHtml(fmtNum(v))}</td></tr>`;
    })
    .filter(Boolean)
    .join("");
  return `<div style="font-size:12px;line-height:1.5;max-width:340px">
    <div style="font-weight:600;margin-bottom:4px">${escapeHtml(title)}</div>
    <table>${rows}</table>
  </div>`;
}

function tooltipHtml(cfg, props, color) {
  const title = props[cfg.title] || cfg.label;
  return `<strong style="color:${color}">${escapeHtml(title)}</strong>
    <span style="opacity:.75"> — ${escapeHtml(cfg.label)}</span>`;
}

// Split slugs fan out to 8+ toggles hitting the same URL; memoise the
// parsed FeatureCollection so a re-toggle doesn't re-fetch and each
// sub-builder just filters the shared result.
const GEOJSON_CACHE = new Map();
async function fetchGeoJson(url) {
  let promise = GEOJSON_CACHE.get(url);
  if (!promise) {
    promise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return r.json();
    });
    GEOJSON_CACHE.set(url, promise);
  }
  return promise;
}

const POINT_ICON = {
  "pelabuhan-perikanan":     (color, size) => anchorIcon({ size, color }),
  "pelabuhan-umum":          (color, size) => anchorIcon({ size, color }),
  "pelabuhan-penyeberangan": (color, size) => anchorIcon({ size, color }),
  "terminal-khusus":         (color, size) => anchorIcon({ size, color }),
  "bandara":                 (color, size) => planeIcon({ size, color }),
  "stasiun-ka":              (color, size) => trainIcon({ size, color }),
};
const ICON_SIZE = 18;

// Build a colour-picker for the layer: constant if uncategorised,
// else look up the property value in the values table (with a
// "combined" catch-all if a value names more than one keyword).
function makeColorFn(cfg) {
  if (!cfg.categorize) {
    const c = cfg.color;
    return () => c;
  }
  const { field, values, fallback, combined } = cfg.categorize;
  const table = new Map(values.map(([v, color]) => [v, color]));
  const keywords = combined ? values.map(([v]) => v) : [];
  return (props) => {
    const raw = props?.[field];
    if (raw == null || raw === "") return fallback;
    const s = String(raw);
    if (table.has(s)) return table.get(s);
    if (combined) {
      const hits = keywords.filter(k => s.includes(k));
      if (hits.length >= 2) return combined.color;
      if (hits.length === 1) return table.get(hits[0]);
    }
    return fallback;
  };
}

// A single feature can be Point / Line / Polygon; Leaflet dispatches
// on ``geometry.type`` via ``pointToLayer`` and ``style`` callbacks, so
// one builder handles all three cases per layer. When ``subValue`` is
// supplied (split layer), the builder pre-filters the FeatureCollection
// to that category and pins its polygons to the category's pane so
// nested airspaces layer correctly.
function makeBuilder(slug, subValue) {
  const cfg = SARPRAS_CFG[slug];
  const iconFactory = POINT_ICON[slug];
  const colorFor = makeColorFn(cfg);
  const pane = subValue && cfg.split ? cfg.split.paneFor(subValue) : undefined;
  const filterField = subValue ? cfg.categorize.field : null;

  return async function build(_key, url) {
    const raw = await fetchGeoJson(url);
    const fc = filterField
      ? { ...raw, features: (raw.features || []).filter(
          (f) => (f.properties || {})[filterField] === subValue) }
      : raw;
    const layer = L.geoJSON(fc, {
      pointToLayer: iconFactory
        ? (f, latlng) => L.marker(latlng, {
            icon: iconFactory(colorFor(f.properties), ICON_SIZE),
            riseOnHover: true,
            pane,
          })
        : (f, latlng) => L.circleMarker(latlng, {
            radius: 4,
            color: "#ffffff",
            weight: 1,
            opacity: 0.9,
            fillColor: colorFor(f.properties),
            fillOpacity: 0.85,
            pane,
          }),
      style: (feat) => {
        const t = feat?.geometry?.type;
        const c = colorFor(feat?.properties);
        if (t === "Polygon" || t === "MultiPolygon") {
          return { color: c, weight: 1.2, opacity: 0.9, fillColor: c, fillOpacity: 0.2, pane };
        }
        return { color: c, weight: 2, opacity: 0.85, pane };
      },
      onEachFeature: (feature, lyr) => {
        const p = feature.properties || {};
        lyr.bindTooltip(tooltipHtml(cfg, p, colorFor(p)), {
          sticky: true, direction: "top", opacity: 0.95,
        });
        lyr.bindPopup(popupHtml(cfg, p), { maxWidth: 360 });
      },
    });
    layer._meta = { features: fc.features?.length ?? 0 };
    return layer;
  };
}

export const SARPRAS_BUILDERS = new Map(
  Object.entries(SARPRAS_CFG).flatMap(([slug, c]) => {
    if (!c.split) return [[`sarpras:${slug}`, makeBuilder(slug)]];
    return c.categorize.values.map(([val]) =>
      [`sarpras:${slug}:${val}`, makeBuilder(slug, val)]);
  }),
);
