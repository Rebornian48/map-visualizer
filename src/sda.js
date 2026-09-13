import L from "leaflet";

// Static snapshots of 34 sublayers from BIG Satupeta's
// SUMBER_DAYA_ALAM_DAN_LINGKUNGAN MapServer (edisi 2024-08). Refreshed
// manually via scripts/refresh-sda.py. See that script for source URLs
// and the per-layer property whitelist.
//
// Same rendering pattern as ./sarpras.js — one generic builder per
// slug, dispatch on ``geometry.type`` so a single file can carry
// points, lines and polygons. Palette groups by theme (tanah, air,
// bencana, sumber daya, ekosistem, cagar budaya) so overlapping
// overlays stay legible in both light & dark basemaps.

function sdaUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sda/${name}.json`;
}

// ---------- palette + per-slug config -----------------------------------

const C = {
  // Tanah & Geologi
  gambut:       "#795548",
  geologi:      "#6d4c41",
  geostruktur:  "#a1887f",
  karst:        "#8d6e63",
  ekoGambut:    "#5d4037",
  // Hidrologi
  das:          "#0288d1",
  neracaAir:    "#1976d2",
  danau:        "#01579b",
  embung:       "#0277bd",
  situ:         "#039be5",
  // Bencana
  krbVulkanoP:  "#d84315",
  krbVulkanoA:  "#e65100",
  krbGempa:     "#c62828",
  gerakanTanah: "#b71c1c",
  krbTsunami:   "#1a237e",
  likuifaksi:   "#4a148c",
  patahan:      "#6a1b9a",
  pesisir:      "#00838f",
  karhutla:     "#ff5722",
  rawanBanjir:  "#0288d1",
  seismisitas:  "#7f0000",
  // Sumber daya mineral
  logam:        "#455a64",
  nonLogam:     "#607d8b",
  batubara:     "#212121",
  panasBumi:    "#ef6c00",
  // Ekosistem / Vegetasi
  lahanKritis:  "#bf360c",
  dddtlh:       "#33691e",
  perikanan:    "#00897b",
  lahanGaram:   "#e0e0e0",
  mangrove:     "#2e7d32",
  // Cagar budaya & konservasi
  cbKawasan:    "#ad1457",
  cbTitik:      "#c2185b",
  zonasi:       "#388e3c",
  blok:         "#43a047",
  // ``das`` and ``perairan`` colors reserved for the two upstream-broken
  // layers (DAS id 7, Konservasi Perairan id 35); the entries above are
  // omitted from CFG so no source is exposed to the UI. Reintroduce
  // once BIG's server stops returning HTTP 400 for those layer queries.
};

// title = property key used for the tooltip/popup headline
// fields = [label, key] rows for the popup body
const CFG = {
  // --- Tanah & Geologi ------------------------------------------------
  "gambut": {
    label: "Lahan Gambut", group: "Tanah & Geologi · BIG", color: C.gambut,
    title: "namobj",
    fields: [["Wilayah pemetaan","wadmpu"], ["Landform","landform"],
             ["Bahan induk","bhnindk"], ["Relief","relief"],
             ["USDA 1","usda1"], ["USDA 2","usda2"], ["USDA 3","usda3"]],
  },
  "geologi": {
    label: "Geologi (formasi)", group: "Tanah & Geologi · BIG", color: C.geologi,
    title: "namobj",
    fields: [["Umur","umurobj"], ["Simbol","simobj"], ["Catatan","remark"]],
  },
  "geostruktur": {
    label: "Geologi Geostruktur", group: "Tanah & Geologi · BIG", color: C.geostruktur,
    title: "namaobj",
    fields: [["Kelas struktur","klsstr"], ["Catatan","remark"]],
  },
  "karst": {
    label: "Bentang Alam Karst", group: "Tanah & Geologi · BIG", color: C.karst,
    title: "namobj",
    fields: [["Kelas kawasan","klskbak"], ["SK penetapan","skkbak"],
             ["Dasar hukum","datstr"], ["Referensi","spatial_re"], ["Catatan","remark"]],
  },
  "ekosistem-gambut": {
    label: "Fungsi Ekosistem Gambut", group: "Tanah & Geologi · BIG", color: C.ekoGambut,
    title: "kode_khg",
    fields: [["Ketebalan gambut","peat_thick"], ["Tanah gambut","tnh_gambut"],
             ["FEG peat","feg_peat"], ["FEG 50k","feg_50k"]],
  },

  // --- Hidrologi ------------------------------------------------------
  // NOTE: layer id 7 (Daerah Aliran Sungai) is upstream-broken — server
  // returns HTTP 400 "Failed to execute query" for every request shape
  // we've tried; kept in scripts/refresh-sda.py so it's fetched again
  // once BIG restores the endpoint, but omitted here so no broken
  // checkbox appears in the UI. Same for id 35 (konservasi-perairan).
  "neraca-air": {
    label: "Neraca Sumber Daya Air", group: "Hidrologi · BIG", color: C.neracaAir,
    title: "nm_inf",
    fields: [["Wilayah Sungai","nama_ws"], ["Kode WS","kode_ws"],
             ["Luas (km²)","luas_km2"], ["Ketersediaan","ktrs_air"],
             ["Kebutuhan","kbth_air"], ["Neraca","nrc_air"],
             ["Kelas neraca","kls_nrcair"], ["IPA","ipa"], ["Kelas IPA","kls_ipa"],
             ["Populasi","populasi"], ["Keterangan","keterangan"]],
  },
  "danau": {
    label: "Danau", group: "Hidrologi · BIG", color: C.danau,
    title: "nm_inf",
    fields: [["Wilayah Sungai","nama_ws"], ["Pengelola","pengelola"],
             ["Jenis danau","jns_danau"], ["Luas (Ha)","luas_danau"],
             ["Volume","vol_danau"], ["Irigasi","irigasi"], ["DMI","dmi"],
             ["Provinsi","provinsi"], ["Kab/Kota","kab_kota"],
             ["Kec","kec"], ["Desa/Kel","kel_desa"],
             ["Tahun data","thn_data"], ["Catatan","ket"]],
  },
  "embung": {
    label: "Embung", group: "Hidrologi · BIG", color: C.embung,
    title: "nm_inf",
    fields: [["Wilayah Sungai","nama_ws"], ["Pengelola","pengelola"],
             ["Jenis embung","jns_embung"], ["Volume","vol_embung"],
             ["Luas genangan","luas_genan"], ["Kapasitas tampung","kap_tamp"],
             ["Provinsi","provinsi"], ["Kab/Kota","kab_kota"],
             ["Kec","kec"], ["Desa/Kel","kel_desa"],
             ["Tahun data","thn_data"], ["Catatan","ket"]],
  },
  "situ": {
    label: "Situ", group: "Hidrologi · BIG", color: C.situ,
    title: "nm_inf",
    fields: [["Wilayah Sungai","nama_ws"], ["Pengelola","pengelola"],
             ["Jenis situ","jns_situ"], ["Volume","vol_situ"],
             ["Luas situ (Ha)","luas_situ"], ["Kapasitas tampung","kap_tamp"],
             ["Provinsi","provinsi"], ["Kab/Kota","kab_kota"],
             ["Kec","kec"], ["Desa/Kel","kel_desa"],
             ["Tahun data","thn_data"], ["Catatan","ket"]],
  },

  // --- Bencana --------------------------------------------------------
  "krb-gunungapi-titik": {
    label: "KRB Gunung Api (titik)", group: "Bencana · SDA", color: C.krbVulkanoP,
    title: "namobj",
    fields: [["Klasifikasi","cla"], ["VEI","vei"], ["Aktivitas","tim"],
             ["Monitoring","mon"], ["Tektonik","tek"],
             ["Gas vulkanik","gasvul"], ["Korban","victim"], ["Catatan","remark"]],
  },
  "krb-gunungapi-area": {
    label: "KRB Gunung Api (area)", group: "Bencana · SDA", color: C.krbVulkanoA,
    title: "namobj",
    fields: [["Kelas api","clapi"], ["VEI","vei"], ["Aktivitas","tim"],
             ["Korban","vic"], ["Durasi","dur"], ["Catatan","remark"]],
  },
  "krb-gempa": {
    label: "KRB Gempa Bumi", group: "Bencana · SDA", color: C.krbGempa,
    title: "namobj",
    fields: [["Kelas","kelas"], ["KRB ID","krbid"]],
  },
  "gerakan-tanah": {
    label: "Zona Kerentanan Gerakan Tanah", group: "Bencana · SDA", color: C.gerakanTanah,
    title: "namobj",
    fields: [["Zona","zona"], ["Kelas gerakan tanah","klsgtn"],
             ["Tahun","tahun"], ["Catatan","remark"]],
  },
  "krb-tsunami": {
    label: "KRB Tsunami", group: "Bencana · SDA", color: C.krbTsunami,
    title: "keterangan",
    fields: [["Unsur","unsur"], ["Tahun terbit","tahun_terbit"],
             ["Tinggi genangan","tinggi_genangan"],
             ["Provinsi","provinsi"], ["Kab/Kota","kota_kabupaten"],
             ["Kecamatan","kecamatan"]],
  },
  "likuifaksi": {
    label: "Kerentanan Likuifaksi", group: "Bencana · SDA", color: C.likuifaksi,
    title: "namobj",
    fields: [["Kerentanan","kerentanan"], ["Keterangan","keterangan"]],
  },
  "patahan-aktif": {
    label: "Patahan Aktif Indonesia", group: "Bencana · SDA", color: C.patahan,
    title: "namobj",
    fields: [["Simbol","simobj"], ["Jenis patahan","jenispthn"],
             ["Panjang (km)","pjgpthn"], ["Lokasi","lokasi"],
             ["Geologi","geologi"], ["Sejarah gempa","sjrhgempa"], ["Catatan","remark"]],
  },
  "kerentanan-pesisir": {
    label: "Kerentanan Pesisir", group: "Bencana · SDA", color: C.pesisir,
    title: "kab_kota",
    fields: [["Provinsi","provinsi"], ["Status","status"],
             ["Produksi","produksi"], ["Catatan","remark"]],
  },
  "karhutla": {
    label: "Rawan Karhutla", group: "Bencana · SDA", color: C.karhutla,
    title: "namobj",
    fields: [["Kelas rawan","kelas"], ["Provinsi","provinsi"],
             ["Luas","luas"], ["Keterangan","keterangan"]],
  },
  "rawan-banjir": {
    label: "Rawan Banjir", group: "Bencana · SDA", color: C.rawanBanjir,
    title: "kelas_rawan",
    fields: [["Bentang lahan","bentanglhn"], ["Rawan banjir","r_banjir"],
             ["Kelas rawan","kelas_rawan"], ["Tahun","tahun"]],
  },
  "seismisitas": {
    label: "Seismisitas Gempa Bumi", group: "Bencana · SDA", color: C.seismisitas,
    title: "tanggal",
    fields: [["Tanggal","tanggal"], ["Waktu (UTC)","waktu"],
             ["Bujur","bujur"], ["Lintang","lintang"],
             ["Kedalaman (km)","kedalaman"], ["Magnitudo","magnitudo"],
             ["Kelas kedalaman","kelaskedalaman"]],
  },

  // --- Sumber daya mineral -------------------------------------------
  "mineral-logam": {
    label: "Mineral Logam", group: "Sumber Daya · BIG", color: C.logam,
    title: "namobj",
    fields: [["Jenis komoditi","jnskom"], ["Lokasi","lokasilgm"],
             ["Kelas","kellgm"], ["Unsur pemantau","lbunsur"],
             ["Status","statdiklgm"], ["Acuan","acuan"], ["Catatan","remark"]],
  },
  "mineral-non-logam": {
    label: "Mineral Non Logam", group: "Sumber Daya · BIG", color: C.nonLogam,
    title: "namobj",
    fields: [["Jenis komoditi","jnskombl"], ["Lokasi","lokasibl"],
             ["Kelas","kelkombl"], ["Unsur pemantau","lbunsurbl"],
             ["Status","statdikbl"], ["Acuan","acuan"], ["Catatan","remark"]],
  },
  "batubara": {
    label: "Sumber Daya Batubara", group: "Sumber Daya · BIG", color: C.batubara,
    title: "namobj",
    fields: [["Lokasi","lokasi"], ["Kelas","klsbb"],
             ["Hipotetik","hipbb"], ["Total sumber daya","totsdbb"],
             ["Total cadangan","totcadbb"], ["Status","statdikbb"],
             ["Acuan","acuan"], ["Catatan","remark"]],
  },
  "panas-bumi": {
    label: "Sumber Daya Panas Bumi", group: "Sumber Daya · BIG", color: C.panasBumi,
    title: "namobj",
    fields: [["Lokasi","lokasi"], ["Status","status"], ["Status penyelidikan","statdikpb"],
             ["Kelas reservoir","klsrsv"], ["Suhu (°C)","temprsv"],
             ["Mungkin","mgkinpb"], ["Spekulatif","spekpb"],
             ["Tahun data","thndatpb"], ["Catatan","remark"]],
  },

  // --- Ekosistem / Vegetasi ------------------------------------------
  "lahan-kritis": {
    label: "Lahan Kritis", group: "Ekosistem · BIG", color: C.lahanKritis,
    title: "namobj",
    fields: [["Kelas kritis","kritis"], ["BPDAS","bpdas"], ["Catatan","remark"]],
  },
  // NOTE: layer id 50 (DDDTLH) is dropped from the UI. Its polygon set
  // is unbounded — a retry paginated past 408.000 features without
  // stopping, and even at aggressive server_offset the vendored file
  // would exceed GitHub's 100 MB per-file cap. Kept in the refresh
  // script so it can be re-enabled once BIG paginates it sensibly.
  "perikanan-budidaya": {
    label: "Potensi Perikanan Budidaya", group: "Ekosistem · BIG", color: C.perikanan,
    title: "namobj",
    fields: [["Tipe air","tipeair"], ["Provinsi","provinsi"],
             ["Kab/Kota","kabupaten"], ["Kecamatan","kecamatan"],
             ["Status","status"], ["Referensi","referensi"],
             ["Sumber data","sumberdata"], ["Tahun sumber","thnsumber"]],
  },
  "lahan-garam": {
    label: "Lahan Garam", group: "Ekosistem · BIG", color: C.lahanGaram,
    title: "namaobj",
    fields: [["Provinsi","provinsi"], ["Kab/Kota","kabupaten"],
             ["Kecamatan","kecamatan"], ["Jenis lahan","jenis_lahan"],
             ["Teknologi","teknologi"], ["Pola","pola"], ["Luas","luas"],
             ["Status","status"], ["Fungsi","fungsi"], ["Referensi","referensi"]],
  },
  "mangrove": {
    label: "Mangrove", group: "Ekosistem · BIG", color: C.mangrove,
    title: "kttj",
    fields: [["Kerapatan","kttj"], ["Intensitas","ints"],
             ["Fungsi fitografi","fgsfrf"], ["Luas mangrove","lsmgr"],
             ["Provinsi","prov"], ["Kab/Kota","kab"],
             ["BPDASHL","bpdashl"], ["Tahun buat","thnbuat"]],
  },

  // --- Cagar Budaya & Konservasi ------------------------------------
  "cagar-budaya-kawasan": {
    label: "Cagar Budaya (kawasan)", group: "Cagar Budaya & Konservasi · BIG", color: C.cbKawasan,
    title: "namobj",
    fields: [["Provinsi","prov"], ["Kab/Kota","kabkota"],
             ["Kriteria","krtacbdef"], ["Fungsi","fgsicbdef"],
             ["Status","sttpcbdef"], ["Kondisi","kndscbdef"],
             ["Pengelola","pnglcbdef"],
             ["SK","sk"], ["Tanggal SK","tglsk"],
             ["Luas","luas"], ["Tahun data","thndata"]],
  },
  "cagar-budaya-titik": {
    label: "Cagar Budaya (titik)", group: "Cagar Budaya & Konservasi · BIG", color: C.cbTitik,
    title: "namobj",
    fields: [["Provinsi","prov"], ["Kab/Kota","kabkota"], ["Kecamatan","kec"],
             ["Kriteria","krtacbdef"], ["Fungsi","fgsicbdef"],
             ["Status","sttpcbdef"], ["Kondisi","kndscbdef"],
             ["Pengelola","pnglcbdef"],
             ["SK","sk"], ["Tanggal SK","tglsk"], ["Tahun data","thndata"]],
  },
  "zonasi-konservasi": {
    label: "Zonasi Kawasan Konservasi", group: "Cagar Budaya & Konservasi · BIG", color: C.zonasi,
    title: "nkws",
    fields: [["Provinsi","nprov"], ["UPT","nupt"], ["Fungsi kawasan","fgskws"],
             ["Kode zona","kodezona"], ["Catatan","catatan"],
             ["Keterangan","keterangan"], ["Ref","remark"]],
  },
  "blok-konservasi": {
    label: "Blok Kawasan Konservasi", group: "Cagar Budaya & Konservasi · BIG", color: C.blok,
    title: "nkws",
    fields: [["Provinsi","nprov"], ["UPT","nupt"], ["Fungsi kawasan","fgskws"],
             ["Kode blok","kodeblok"], ["Cakupan","cakupan"],
             ["Catatan","catatan"], ["Keterangan","keterangan"]],
  },
  // NOTE: layer id 35 (Kawasan Konservasi Perairan) is also
  // upstream-broken today — see the DAS note above.
};

// ---------- SOURCES / builders -----------------------------------------

export const SDA_SOURCES = Object.entries(CFG).map(([slug, c]) => ({
  key:   `sda_${slug}`,
  label: c.label,
  group: c.group,
  kind:  `sda:${slug}`,
  url:   sdaUrl(slug),
}));

export const SDA_GROUP_NAMES = [
  "Tanah & Geologi · BIG",
  "Hidrologi · BIG",
  "Bencana · SDA",
  "Sumber Daya · BIG",
  "Ekosistem · BIG",
  "Cagar Budaya & Konservasi · BIG",
];

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

function makeBuilder(slug) {
  const cfg = CFG[slug];
  const pointStyle = {
    radius: 3.5,
    color: "#ffffff",
    weight: 0.8,
    opacity: 0.85,
    fillColor: cfg.color,
    fillOpacity: 0.85,
  };
  const lineStyle = {
    color: cfg.color,
    weight: 1.5,
    opacity: 0.85,
  };
  const polyStyle = {
    color: cfg.color,
    weight: 0.6,
    opacity: 0.75,
    fillColor: cfg.color,
    fillOpacity: 0.28,
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

export const SDA_BUILDERS = new Map(
  Object.keys(CFG).map((slug) => [`sda:${slug}`, makeBuilder(slug)]),
);
