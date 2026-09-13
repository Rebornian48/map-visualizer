import L from "leaflet";

// Static snapshots of 22 sublayers from BIG's Satupeta
// SARANA_PRASARANA MapServer (edisi 2024-07). Refreshed manually via
// scripts/refresh-sarpras.py. See that script for source URLs and the
// per-layer property whitelist.
//
// Presentation strategy: everything comes back as a GeoJSON
// FeatureCollection. Points render as circle markers colour-coded by
// category (transport / energy / water / airspace); polylines and
// polygons use themed strokes with light fills so they don't obscure
// the basemap.

function sarprasUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sarpras/${name}.json`;
}

// ---------- palette + per-slug config -----------------------------------

// Themed hues, chosen so overlapping layers stay distinguishable on both
// light OSM tiles and dark satellite imagery.
const C = {
  fishery:      "#00838f",   // teal (perikanan)
  seaport:      "#0277bd",   // blue (pelabuhan umum)
  ferryport:    "#00acc1",   // cyan (penyeberangan)
  jetty:        "#26a69a",   // green-teal (terminal khusus)
  airport:      "#1e88e5",   // bright blue (bandara)
  railLine:     "#ffb300",   // amber
  railStation:  "#ff6f00",   // deep amber
  power:        "#c62828",   // red
  gardu:        "#ad1457",   // pink
  genPoly:      "#e65100",   // deep orange
  genPoint:     "#f4511e",   // orange
  jalanNonTol:  "#5d4037",   // brown
  jalanTol:     "#d84315",   // burnt orange
  dam:          "#1565c0",   // deep blue
  bbm:          "#6d4c41",   // brown
  lpg:          "#8d6e63",   // light brown
  kilang:       "#4e342e",   // dark brown
  alur:         "#00695c",   // dark teal
  ruangUdara:   "#7e57c2",   // purple
  dlkr:         "#5e35b1",   // deep indigo
  kkop:         "#8e24aa",   // magenta
  sbnp:         "#fbc02d",   // yellow
};

// Human labels + property field to display as the tooltip title.
// ``fields`` = ordered list of [label, key] pairs for the popup table.
const CFG = {
  "pelabuhan-perikanan": {
    label: "Pelabuhan Perikanan", group: "Transportasi · BIG", color: C.fishery,
    title: "namobj",
    fields: [["Kelas", "kelas"], ["Pengelola", "pengelola"], ["Status", "status"], ["Catatan", "remark"]],
  },
  "pelabuhan-umum": {
    label: "Pelabuhan Umum", group: "Transportasi · BIG", color: C.seaport,
    title: "namobj",
    fields: [["Nama pelabuhan", "nama_pp"], ["Tipe", "tipe_pp"], ["Kelas", "klspel"],
             ["Hierarki", "hirrki"], ["Jenis kapal", "jns_kpl"],
             ["Alamat", "alamat"], ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"],
             ["Telp", "notelp"], ["Email", "surel"], ["Status ops", "stat_ops"]],
  },
  "pelabuhan-penyeberangan": {
    label: "Pelabuhan Penyeberangan", group: "Transportasi · BIG", color: C.ferryport,
    title: "namobj",
    fields: [["ADPEL", "admpel"], ["Kelas", "kelas"], ["Jenis kapal", "jns_kpl"],
             ["Alamat", "alamat"], ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"],
             ["Telp", "notelp"], ["Email", "surel"]],
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
  },
  "rel": {
    label: "Jaringan Rel", group: "Transportasi · BIG", color: C.railLine,
    title: "namobj",
    fields: [["Tipe rel", "tiprel"], ["Kelas", "klsrel"], ["Jumlah rel", "jmlrel"],
             ["Kebar rel", "kebrel"], ["Wilker", "wilker"], ["Catatan", "remark"]],
  },
  "stasiun-ka": {
    label: "Stasiun KA", group: "Transportasi · BIG", color: C.railStation,
    title: "namobj",
    fields: [["Kelas", "klssta"], ["Wilayah", "wilsta"], ["Wilayah ops", "wil_op"],
             ["DOP", "dopsta"], ["Lintas", "linsta"],
             ["Kab/Kota", "wadmkk"], ["Provinsi", "wadmpr"]],
  },
  "jalan-nasional-non-tol": {
    label: "Jalan Nasional Non Tol", group: "Transportasi · BIG", color: C.jalanNonTol,
    title: "nm_inf",
    fields: [["Kode ruas", "kd_ruas"], ["Fungsi", "fungsi"], ["Tipe", "tipe_jalan"],
             ["Status", "status"], ["Panjang (m)", "pjg_datar"],
             ["KM awal", "km_awal_ru"], ["KM akhir", "km_akhir_r"], ["LHRT", "lhrt"]],
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
  },
  "jaringan-listrik": {
    label: "Jaringan Listrik", group: "Energi · BIG", color: C.power,
    title: "namobj",
    fields: [["Panjang jaringan (m)", "pjgjar"], ["Wilayah PLN", "regpln"]],
  },
  "gardu-induk": {
    label: "Gardu Induk", group: "Energi · BIG", color: C.gardu,
    title: "namaobj",
    fields: [["Tegangan (kV)", "teggi"], ["Kapasitas (MVA)", "kapgi"],
             ["Status milik", "statmlk"], ["Status ops", "statopr"],
             ["Wilayah PLN", "regpln"], ["Tahun ops", "thnopr"],
             ["Alamat", "alamat"], ["Catatan", "remark"]],
  },
  "pembangkit-poly": {
    label: "Pembangkit Listrik (kawasan)", group: "Energi · BIG", color: C.genPoly,
    title: "namobj",
    fields: [["Energi primer", "enrgprmr"], ["Daya (MW)", "daya"],
             ["Wilayah PLN", "regpln"], ["Alamat", "alamat"], ["Tahun ops", "thnopr"]],
  },
  "pembangkit": {
    label: "Pembangkit Listrik (titik)", group: "Energi · BIG", color: C.genPoint,
    title: "namobj",
    fields: [["Energi primer", "enrgprmr"], ["Daya (MW)", "daya"],
             ["Wilayah PLN", "regpln"], ["Alamat", "alamat"], ["Tahun ops", "thnopr"]],
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
  },
};

// ---------- SOURCES / builders -----------------------------------------

export const SARPRAS_SOURCES = Object.entries(CFG).map(([slug, c]) => ({
  key:   `sarpras_${slug}`,
  label: c.label,
  group: c.group,
  kind:  `sarpras:${slug}`,
  url:   sarprasUrl(slug),
}));

export const SARPRAS_GROUP_NAMES = [
  "Transportasi · BIG",
  "Energi · BIG",
  "Air & Zona · BIG",
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

function fmtNum(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    // Big numbers get thousands separators, small ones stay as-is.
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

function tooltipHtml(cfg, props) {
  const title = props[cfg.title] || cfg.label;
  return `<strong style="color:${cfg.color}">${escapeHtml(title)}</strong>
    <span style="opacity:.75"> — ${escapeHtml(cfg.label)}</span>`;
}

async function fetchGeoJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// A single feature can be Point / Line / Polygon; Leaflet dispatches
// on ``geometry.type`` via ``pointToLayer`` and ``style`` callbacks, so
// one builder handles all three cases per layer.
function makeBuilder(slug) {
  const cfg = CFG[slug];
  const pointStyle = {
    radius: 4,
    color: "#ffffff",
    weight: 1,
    opacity: 0.9,
    fillColor: cfg.color,
    fillOpacity: 0.85,
  };
  const lineStyle = {
    color: cfg.color,
    weight: 2,
    opacity: 0.85,
  };
  const polyStyle = {
    color: cfg.color,
    weight: 1.2,
    opacity: 0.9,
    fillColor: cfg.color,
    fillOpacity: 0.2,
  };

  return async function build(_key, url) {
    const fc = await fetchGeoJson(url);
    const layer = L.geoJSON(fc, {
      pointToLayer: (_f, latlng) => L.circleMarker(latlng, pointStyle),
      style: (feat) => {
        const t = feat?.geometry?.type;
        if (t === "Polygon" || t === "MultiPolygon") return polyStyle;
        return lineStyle;
      },
      onEachFeature: (feature, lyr) => {
        const p = feature.properties || {};
        lyr.bindTooltip(tooltipHtml(cfg, p), {
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
  Object.keys(CFG).map((slug) => [`sarpras:${slug}`, makeBuilder(slug)]),
);
