import L from "leaflet";

// Static snapshots of 32 sublayers from BIG Satupeta's
// SUMBER_DAYA_ALAM_DAN_LINGKUNGAN MapServer (edisi 2024-08). Refreshed
// manually via scripts/refresh-sda.py.
//
// Same rendering pattern as ./sarpras.js: one generic builder per slug,
// dispatch on ``geometry.type`` so a single file can carry point/line/
// polygon. Slugs with a ``categorize`` block colour features per property
// value (severity ramps for KRB/rawan layers, qualitative palettes for
// jenis/kelas fields); everything else uses the layer's base ``color``.

function sdaUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sda/${name}.json`;
}

// ---------- base palette (uncategorised layers) ---------------------------
const C = {
  gambut:       "#795548",
  geologi:      "#6d4c41",
  geostruktur:  "#a1887f",
  karst:        "#8d6e63",
  ekoGambut:    "#5d4037",
  neracaAir:    "#1976d2",
  danau:        "#01579b",
  embung:       "#0277bd",
  situ:         "#039be5",
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
  logam:        "#455a64",
  nonLogam:     "#607d8b",
  batubara:     "#212121",
  panasBumi:    "#ef6c00",
  lahanKritis:  "#bf360c",
  perikanan:    "#00897b",
  lahanGaram:   "#e0e0e0",
  mangrove:     "#2e7d32",
  cbKawasan:    "#ad1457",
  cbTitik:      "#c2185b",
  zonasi:       "#388e3c",
  blok:         "#43a047",
  // ``das`` and ``perairan`` colors reserved for the two upstream-broken
  // layers (DAS id 7, Konservasi Perairan id 35). Reintroduce once BIG
  // stops returning HTTP 400 for those queries. DDDTLH (id 50) is also
  // dropped from the UI because its pagination has no upper bound.
};

// Shared severity ramps for ordinal risk fields. Cool → warm so the eye
// ranks them without checking the legend.
const RAMP4 = [
  ["Sangat Rendah", "#a5d6a7"],
  ["Rendah",        "#ffe082"],
  ["Menengah",      "#fb8c00"],
  ["Tinggi",        "#e53935"],
  ["Sangat Tinggi", "#7f0000"],
];

export const SDA_CFG = {
  // --- Tanah & Geologi ------------------------------------------------
  "gambut": {
    label: "Lahan Gambut", group: "Tanah & Geologi · BIG", color: C.gambut,
    title: "namobj",
    fields: [["Wilayah pemetaan","wadmpu"], ["Landform","landform"],
             ["Bahan induk","bhnindk"], ["Relief","relief"],
             ["USDA 1","usda1"], ["USDA 2","usda2"], ["USDA 3","usda3"]],
    categorize: {
      field: "bhnindk",
      values: [
        ["Endapan organik",             "#5d4037", "Endapan organik murni"],
        ["Endapan organik dan mineral", "#a1887f", "Endapan organik + mineral"],
      ],
      fallback: "#795548",
    },
  },
  "geologi": {
    label: "Geologi (formasi)", group: "Tanah & Geologi · BIG", color: C.geologi,
    title: "namobj",
    fields: [["Umur","umurobj"], ["Simbol","simobj"], ["Catatan","remark"]],
  },
  "geostruktur": {
    label: "Geologi Geostruktur", group: "Tanah & Geologi · BIG", color: C.geostruktur,
    title: "namaobj",
    fields: [["Jenis struktur","namaobj"], ["Kelas struktur","klsstr"], ["Catatan","remark"]],
    categorize: {
      field: "namaobj",
      values: [
        ["Kelurusan",       "#78909c", "Kelurusan"],
        ["Patahan",         "#c62828", "Patahan / Sesar"],
        ["Lipatan",         "#8e24aa", "Lipatan"],
        ["Sumbu Lipatan",   "#7b1fa2", "Sumbu Lipatan"],
        ["Rekahan",         "#fb8c00", "Rekahan"],
        ["Scarp",           "#5d4037", "Scarp / gawir"],
        ["Pematang Pantai", "#00acc1", "Pematang Pantai"],
        ["Foliasi",         "#43a047", "Foliasi"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "karst": {
    label: "Bentang Alam Karst", group: "Tanah & Geologi · BIG", color: C.karst,
    title: "namobj",
    fields: [["Kelas kawasan","klskbak"], ["SK penetapan","skkbak"],
             ["Dasar hukum","datstr"], ["Referensi","spatial_re"], ["Catatan","remark"]],
    categorize: {
      field: "remark",
      values: [
        ["Level 1, delineasi sebaran batugamping",                                           "#8d6e63", "Level 1 · sebaran batugamping"],
        ["Level 2, delineasi KBAK hasil penyelidikan",                                       "#00acc1", "Level 2 · penyelidikan"],
        ["Level 3, delineasi KBAK hasil verifikasi",                                         "#1e88e5", "Level 3 · verifikasi"],
        ["Level 3, delineasi KBAK hasil verifikasi, Rekomendasi tidak ditetapkan",           "#5e35b1", "Level 3 · tidak ditetapkan"],
        ["Level 4, delineasi KBAK yang telah ditetapkan",                                    "#c62828", "Level 4 · ditetapkan"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "ekosistem-gambut": {
    label: "Fungsi Ekosistem Gambut", group: "Tanah & Geologi · BIG", color: C.ekoGambut,
    title: "kode_khg",
    fields: [["Ketebalan gambut","peat_thick"], ["Tanah gambut","tnh_gambut"],
             ["FEG peat","feg_peat"], ["FEG 50k","feg_50k"]],
    categorize: {
      field: "feg_50k",
      values: [
        ["Fungsi Lindung E.G.",   "#2e7d32", "Fungsi Lindung"],
        ["Fungsi Budidaya E.G.",  "#ff8f00", "Fungsi Budidaya"],
      ],
      fallback: "#5d4037",
    },
  },

  // --- Hidrologi ------------------------------------------------------
  // NOTE: layer id 7 (Daerah Aliran Sungai) is upstream-broken — server
  // returns HTTP 400 for every request shape. Kept in refresh-sda.py so
  // it re-runs once BIG restores the endpoint, but omitted here.
  "neraca-air": {
    label: "Neraca Sumber Daya Air", group: "Hidrologi · BIG", color: C.neracaAir,
    title: "nm_inf",
    fields: [["Wilayah Sungai","nama_ws"], ["Kode WS","kode_ws"],
             ["Luas (km²)","luas_km2"], ["Ketersediaan","ktrs_air"],
             ["Kebutuhan","kbth_air"], ["Neraca","nrc_air"],
             ["Kelas neraca","kls_nrcair"], ["IPA","ipa"], ["Kelas IPA","kls_ipa"],
             ["Populasi","populasi"], ["Keterangan","keterangan"]],
    categorize: {
      field: "kls_nrcair",
      values: [
        ["Surplus", "#1976d2", "Surplus air"],
        ["Defisit", "#c62828", "Defisit air"],
      ],
      fallback: "#9e9e9e",
    },
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
    categorize: {
      field: "jns_danau",
      values: [
        ["Danau Tektonik",                "#1e88e5", "Tektonik"],
        ["Danau Tektonik - Dataran Banjir", "#039be5", "Tektonik / dataran banjir"],
        ["Danau Sesar-Lingkar Kaldera",   "#5e35b1", "Sesar / lingkar kaldera"],
        ["Danau Vulkanik",                "#d84315", "Vulkanik"],
        ["Danau Kaldera",                 "#c62828", "Kaldera"],
        ["Terbentuk Secara Alami",        "#00897b", "Alami (umum)"],
        ["Paparan Banjir",                "#00acc1", "Paparan banjir"],
        ["Cekungan Air Tanah",            "#7cb342", "Cekungan air tanah"],
        ["Buatan",                        "#8d6e63", "Buatan"],
      ],
      fallback: "#01579b",
    },
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
    categorize: {
      field: "krbid",
      values: [
        ["205", "#a5d6a7", "Sangat Rendah · ≤ IV MMI"],
        ["204", "#ffca28", "Rendah · V-VI MMI"],
        ["203", "#fb8c00", "Menengah · VII-VIII MMI"],
        ["202", "#c62828", "Tinggi · > VIII MMI"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "gerakan-tanah": {
    label: "Zona Kerentanan Gerakan Tanah", group: "Bencana · SDA", color: C.gerakanTanah,
    title: "namobj",
    fields: [["Zona","zona"], ["Kelas gerakan tanah","klsgtn"],
             ["Tahun","tahun"], ["Catatan","remark"]],
    categorize: {
      field: "remark",
      values: [
        ["Sangat Rendah", "#a5d6a7", "Sangat Rendah"],
        ["Rendah",        "#ffca28", "Rendah"],
        ["Menengah",      "#fb8c00", "Menengah"],
        ["Tinggi",        "#c62828", "Tinggi"],
      ],
      fallback: "#9e9e9e",
    },
  },
  "krb-tsunami": {
    label: "KRB Tsunami", group: "Bencana · SDA", color: C.krbTsunami,
    title: "keterangan",
    fields: [["Unsur","unsur"], ["Tahun terbit","tahun_terbit"],
             ["Tinggi genangan","tinggi_genangan"],
             ["Provinsi","provinsi"], ["Kab/Kota","kota_kabupaten"],
             ["Kecamatan","kecamatan"]],
    categorize: {
      field: "unsur",
      values: [
        ["Kawasan Rawan Bencana Tsunami Rendah",   "#ffe082", "Rendah · < 1 m"],
        ["Kawasan Rawan Bencana Tsunami Menengah", "#fb8c00", "Menengah · 1-3 m"],
        ["Kawasan Rawan Bencana Tsunami Tinggi",   "#c62828", "Tinggi · > 3 m"],
      ],
      fallback: "#1a237e",
    },
  },
  "likuifaksi": {
    label: "Kerentanan Likuifaksi", group: "Bencana · SDA", color: C.likuifaksi,
    title: "namobj",
    fields: [["Kerentanan","kerentanan"], ["Keterangan","keterangan"]],
    categorize: {
      field: "kerentanan",
      values: [
        ["1", "#ffe082", "1 — Rendah (jarang)"],
        ["2", "#fb8c00", "2 — Sedang (tidak merata)"],
        ["3", "#c62828", "3 — Tinggi (merata)"],
      ],
      fallback: "#4a148c",
    },
  },
  "patahan-aktif": {
    label: "Patahan Aktif Indonesia", group: "Bencana · SDA", color: C.patahan,
    title: "namobj",
    fields: [["Simbol","simobj"], ["Jenis patahan","jenispthn"],
             ["Panjang (km)","pjgpthn"], ["Mekanisme","remark"], ["Lokasi","lokasi"],
             ["Geologi","geologi"], ["Sejarah gempa","sjrhgempa"]],
    categorize: {
      field: "jenispthn",
      values: [
        ["Aktif",             "#c62828", "Aktif"],
        ["Potensial Aktif",   "#fb8c00", "Potensial Aktif"],
        ["Not indentified",   "#9e9e9e", "Belum teridentifikasi"],
      ],
      fallback: "#6a1b9a",
    },
  },
  "kerentanan-pesisir": {
    label: "Kerentanan Pesisir", group: "Bencana · SDA", color: C.pesisir,
    title: "kab_kota",
    fields: [["Provinsi","provinsi"], ["Status","status"],
             ["Produksi","produksi"], ["Catatan","remark"]],
    categorize: {
      field: "status",
      values: [
        ["RENDAH",        "#a5d6a7", "Rendah"],
        ["SEDANG",        "#fb8c00", "Sedang"],
        ["TINGGI",        "#e53935", "Tinggi"],
        ["SANGAT TINGGI", "#7f0000", "Sangat Tinggi"],
      ],
      fallback: "#00838f",
    },
  },
  "karhutla": {
    label: "Rawan Karhutla", group: "Bencana · SDA", color: C.karhutla,
    title: "namobj",
    fields: [["Kelas rawan","kelas"], ["Provinsi","provinsi"],
             ["Luas","luas"], ["Keterangan","keterangan"]],
    categorize: {
      field: "kelas",
      values: [
        ["Rendah",        "#a5d6a7", "Rendah"],
        ["Sedang",        "#fb8c00", "Sedang"],
        ["Sangat Tinggi", "#c62828", "Sangat Tinggi"],
      ],
      fallback: "#ff5722",
    },
  },
  "rawan-banjir": {
    label: "Rawan Banjir", group: "Bencana · SDA", color: C.rawanBanjir,
    title: "kelas_rawan",
    fields: [["Bentang lahan","bentanglhn"], ["Rawan banjir","r_banjir"],
             ["Kelas rawan","kelas_rawan"], ["Tahun","tahun"]],
    categorize: {
      field: "kelas_rawan",
      values: [
        ["Tidak Rawan", "#c6ff9c", "Tidak Rawan"],
        ["Rendah",      "#ffca28", "Rendah"],
        ["Menengah",    "#fb8c00", "Menengah"],
        ["Tinggi",      "#c62828", "Tinggi"],
      ],
      fallback: "#0288d1",
    },
  },
  "seismisitas": {
    label: "Seismisitas Gempa Bumi", group: "Bencana · SDA", color: C.seismisitas,
    title: "tanggal",
    fields: [["Tanggal","tanggal"], ["Waktu (UTC)","waktu"],
             ["Bujur","bujur"], ["Lintang","lintang"],
             ["Kedalaman (km)","kedalaman"], ["Magnitudo","magnitudo"],
             ["Kelas kedalaman","kelaskedalaman"]],
    categorize: {
      field: "kelaskedalaman",
      values: [
        ["Dangkal",  "#e53935", "Dangkal · < 70 km"],
        ["Menengah", "#fb8c00", "Menengah · 70-300 km"],
        ["Dalam",    "#1e88e5", "Dalam · > 300 km"],
      ],
      fallback: "#7f0000",
    },
  },

  // --- Sumber daya mineral -------------------------------------------
  "mineral-logam": {
    label: "Mineral Logam", group: "Sumber Daya · BIG", color: C.logam,
    title: "namobj",
    fields: [["Jenis komoditi","jnskom"], ["Lokasi","lokasilgm"],
             ["Kelas","kellgm"], ["Unsur pemantau","lbunsur"],
             ["Status","statdiklgm"], ["Acuan","acuan"], ["Catatan","remark"]],
    categorize: {
      field: "kellgm",
      values: [
        ["Logam Besi dan Paduan Besi",   "#455a64", "Besi & paduan besi"],
        ["Logam Dasar",                  "#8d6e63", "Logam dasar"],
        ["Logam Mulia",                  "#f9a825", "Logam mulia"],
        ["Logam Ringan dan Langka",      "#6a1b9a", "Logam ringan & langka"],
      ],
      fallback: "#607d8b",
    },
  },
  "mineral-non-logam": {
    label: "Mineral Non Logam", group: "Sumber Daya · BIG", color: C.nonLogam,
    title: "namobj",
    fields: [["Jenis komoditi","jnskombl"], ["Lokasi","lokasibl"],
             ["Kelas","kelkombl"], ["Unsur pemantau","lbunsurbl"],
             ["Status","statdikbl"], ["Acuan","acuan"], ["Catatan","remark"]],
    categorize: {
      field: "kelkombl",
      values: [
        ["Mineral Industri", "#455a64", "Mineral Industri"],
        ["Bahan Bangunan",   "#8d6e63", "Bahan Bangunan"],
        ["Bahan Keramik",    "#00897b", "Bahan Keramik"],
        ["Batu Mulia",       "#c62828", "Batu Mulia"],
      ],
      fallback: "#607d8b",
    },
  },
  "batubara": {
    label: "Sumber Daya Batubara", group: "Sumber Daya · BIG", color: C.batubara,
    title: "namobj",
    fields: [["Lokasi","lokasi"], ["Kelas","klsbb"],
             ["Hipotetik","hipbb"], ["Total sumber daya","totsdbb"],
             ["Total cadangan","totcadbb"], ["Status","statdikbb"],
             ["Acuan","acuan"], ["Catatan","remark"]],
    categorize: {
      field: "klsbb",
      values: [
        ["Kalori Rendah",        "#a1887f", "Kalori Rendah"],
        ["Kalori Sedang",        "#6d4c41", "Kalori Sedang"],
        ["Kalori Tinggi",        "#3e2723", "Kalori Tinggi"],
        ["Kalori Sangat Tinggi", "#212121", "Kalori Sangat Tinggi"],
      ],
      fallback: "#4e342e",
    },
  },
  "panas-bumi": {
    label: "Sumber Daya Panas Bumi", group: "Sumber Daya · BIG", color: C.panasBumi,
    title: "namobj",
    fields: [["Lokasi","lokasi"], ["Status","status"], ["Status penyelidikan","statdikpb"],
             ["Kelas reservoir","klsrsv"], ["Suhu (°C)","temprsv"],
             ["Mungkin","mgkinpb"], ["Spekulatif","spekpb"],
             ["Tahun data","thndatpb"], ["Catatan","remark"]],
    categorize: {
      field: "klsrsv",
      values: [
        ["Rendah", "#ffca28", "Reservoir Rendah"],
        ["Sedang", "#fb8c00", "Reservoir Sedang"],
        ["Tinggi", "#c62828", "Reservoir Tinggi"],
      ],
      fallback: "#ef6c00",
    },
  },

  // --- Ekosistem / Vegetasi ------------------------------------------
  "lahan-kritis": {
    label: "Lahan Kritis", group: "Ekosistem · BIG", color: C.lahanKritis,
    title: "namobj",
    fields: [["Kelas kritis","kritis"], ["BPDAS","bpdas"], ["Catatan","remark"]],
    categorize: {
      field: "kritis",
      values: [
        ["Tidak Kritis",       "#a5d6a7", "Tidak Kritis"],
        ["Potensial Kritis",   "#ffe082", "Potensial Kritis"],
        ["Agak Kritis",        "#ffb300", "Agak Kritis"],
        ["Kritis",             "#e53935", "Kritis"],
        ["Sangat Kritis",      "#7f0000", "Sangat Kritis"],
      ],
      fallback: "#bf360c",
    },
  },
  // NOTE: layer id 50 (DDDTLH) is dropped from the UI. Its polygon set
  // is unbounded (>408k features on retry) so the vendored file would
  // exceed GitHub's 100 MB per-file cap.
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
    categorize: {
      field: "kttj",
      values: [
        ["Mangrove Lebat",  "#1b5e20", "Lebat"],
        ["Mangrove Sedang", "#43a047", "Sedang"],
        ["Mangrove Jarang", "#c5e1a5", "Jarang"],
      ],
      fallback: "#2e7d32",
    },
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
    categorize: {
      field: "krtacbdef",
      values: [
        ["Situs",     "#ad1457", "Situs"],
        ["Bangunan",  "#c62828", "Bangunan"],
        ["Struktur",  "#6a1b9a", "Struktur"],
        ["Kawasan",   "#00838f", "Kawasan"],
        ["Lainnya",   "#546e7a", "Lainnya"],
      ],
      fallback: "#ad1457",
    },
  },
  "cagar-budaya-titik": {
    label: "Cagar Budaya (titik)", group: "Cagar Budaya & Konservasi · BIG", color: C.cbTitik,
    title: "namobj",
    fields: [["Provinsi","prov"], ["Kab/Kota","kabkota"], ["Kecamatan","kec"],
             ["Kriteria","krtacbdef"], ["Fungsi","fgsicbdef"],
             ["Status","sttpcbdef"], ["Kondisi","kndscbdef"],
             ["Pengelola","pnglcbdef"],
             ["SK","sk"], ["Tanggal SK","tglsk"], ["Tahun data","thndata"]],
    categorize: {
      field: "krtacbdef",
      values: [
        ["Bangunan",  "#c62828", "Bangunan"],
        ["Situs",     "#ad1457", "Situs"],
        ["Struktur",  "#6a1b9a", "Struktur"],
        ["Kawasan",   "#00838f", "Kawasan"],
      ],
      fallback: "#c2185b",
    },
  },
  "zonasi-konservasi": {
    label: "Zonasi Kawasan Konservasi", group: "Cagar Budaya & Konservasi · BIG", color: C.zonasi,
    title: "nkws",
    fields: [["Provinsi","nprov"], ["UPT","nupt"], ["Fungsi kawasan","fgskws"],
             ["Kode zona","kodezona"], ["Zona","remark"],
             ["Catatan","catatan"], ["Keterangan","keterangan"]],
    categorize: {
      field: "remark",
      values: [
        ["Inti",                       "#1b5e20", "Inti"],
        ["Rimba",                      "#43a047", "Rimba"],
        ["Pemanfaatan",                "#ffb300", "Pemanfaatan"],
        ["Tradisional",                "#6d4c41", "Tradisional"],
        ["Khusus",                     "#8e24aa", "Khusus"],
        ["Rehabilitasi",               "#fb8c00", "Rehabilitasi"],
        ["Religi, Budaya dan Sejarah", "#c62828", "Religi / Budaya / Sejarah"],
        ["Perlindungan Bahari",        "#0277bd", "Perlindungan Bahari"],
      ],
      fallback: "#388e3c",
    },
  },
  "blok-konservasi": {
    label: "Blok Kawasan Konservasi", group: "Cagar Budaya & Konservasi · BIG", color: C.blok,
    title: "nkws",
    fields: [["Provinsi","nprov"], ["UPT","nupt"], ["Fungsi kawasan","fgskws"],
             ["Kode blok","kodeblok"], ["Cakupan","cakupan"],
             ["Catatan","catatan"], ["Keterangan","keterangan"]],
    categorize: {
      field: "fgskws",
      values: [
        ["TWA",  "#43a047", "TWA — Taman Wisata Alam"],
        ["TWAL", "#0277bd", "TWAL — Taman Wisata Alam Laut"],
      ],
      fallback: "#43a047",
    },
  },
  // NOTE: layer id 35 (Kawasan Konservasi Perairan) is upstream-broken —
  // server returns HTTP 400 for every query shape. Same as layer 7 above.
};

// ---------- SOURCES / builders -----------------------------------------

export const SDA_SOURCES = Object.entries(SDA_CFG).map(([slug, c]) => ({
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

// Exposed for the map's legend stack — one entry per categorised slug.
export const SDA_CATEGORIES = new Map(
  Object.entries(SDA_CFG)
    .filter(([, c]) => c.categorize)
    .map(([slug, c]) => [
      `sda_${slug}`,
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

async function fetchGeoJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

function makeColorFn(cfg) {
  if (!cfg.categorize) {
    const c = cfg.color;
    return () => c;
  }
  const { field, values, fallback } = cfg.categorize;
  const table = new Map(values.map(([v, color]) => [v, color]));
  return (props) => {
    const raw = props?.[field];
    if (raw == null || raw === "") return fallback;
    const s = String(raw);
    return table.get(s) || fallback;
  };
}

function makeBuilder(slug) {
  const cfg = SDA_CFG[slug];
  const colorFor = makeColorFn(cfg);

  return async function build(_key, url) {
    const fc = await fetchGeoJson(url);
    const layer = L.geoJSON(fc, {
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 3.5,
        color: "#ffffff",
        weight: 0.8,
        opacity: 0.85,
        fillColor: colorFor(f.properties),
        fillOpacity: 0.85,
      }),
      style: (feat) => {
        const t = feat?.geometry?.type;
        const c = colorFor(feat?.properties);
        if (t === "Polygon" || t === "MultiPolygon") {
          return { color: c, weight: 0.6, opacity: 0.75, fillColor: c, fillOpacity: 0.28 };
        }
        return { color: c, weight: 1.5, opacity: 0.85 };
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

export const SDA_BUILDERS = new Map(
  Object.keys(SDA_CFG).map((slug) => [`sda:${slug}`, makeBuilder(slug)]),
);
