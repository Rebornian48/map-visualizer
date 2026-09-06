# Map Visualizer

[![CodeFactor](https://www.codefactor.io/repository/github/rebornian48/map-visualizer/badge)](https://www.codefactor.io/repository/github/rebornian48/map-visualizer) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/6a8bf2aeed6340b3a53bce1babf30296)](https://app.codacy.com/gh/Rebornian48/map-visualizer/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

Interactive web visualizer for Google Location History `Timeline.json` files.
Built with **React + Vite + Leaflet** — auto-deploys to **Hostinger** via GitHub Actions.

Live: <https://rebornian48.my.id/map-visualizer/>

## Features

- **Map-first flow** — the map loads immediately; drop a `Timeline.json` in
  from the header when you're ready.
- **Layer panel = 4 tombol kategori** di top-right — _Basemap_,
  _Wilayah_, _Transportasi_, _Bencana Alam_. Klik salah satu → panel
  konten yang relevan muncul; hanya satu terbuka pada satu waktu.
  Group baru dengan nama yang cocok (di `SECTIONS` di
  [src/components/LayersControl.jsx](src/components/LayersControl.jsx))
  otomatis mendarat di kategori yang benar.
- **Multiple basemaps** — OpenStreetMap, Esri Satellite, and OpenTopoMap
  (Basemap tab).
- **Indonesia boundary overlays** — toggle Provinsi / Kab/Kota
  (GeoJSON), mutually exclusive (Wilayah tab).
- **Transportasi umum (Opentransum)** — overlay opsional yang bisa
  di-toggle satu per satu dari layer control: enam jaringan bus JSON
  (Trans Semarang, Metro Trans Jabar, Bus Listrik Medan, Trans
  Koetaradja, Transpakuan, Mitra Darat), GTFS Transjakarta, garis rel
  KRL & LRT/MRT (GeoJSON), dan stasiun KRL/LRT/MRT (KML). Data
  diambil dari `cdn.opentransum.randspace0.com` dan di-cache per
  sesi. Lihat bagian _Data attribution_ di bawah untuk lisensi.
- **BMKG · Gempa / Peringatan Dini / Cuaca** — overlay real-time dari
  tiga endpoint publik BMKG (grup `BMKG · Gempa`, `BMKG · Peringatan
  Dini`, `BMKG · Cuaca` di layer control):
  - **Gempa Terbaru / Terkini M 5+ / Dirasakan** (`data.bmkg.go.id`) —
    marker lingkaran berukuran magnitude, warna sesuai kedalaman
    (dangkal merah / menengah oranye / dalam biru). Popup menampilkan
    detail lengkap plus gambar shakemap dari `static.bmkg.go.id` bila
    tersedia.
  - **Peringatan Dini Cuaca** (`www.bmkg.go.id/alerts/nowcast`) — RSS
    feed berisi daftar alert aktif; tiap alert diambil sebagai CAP 1.2
    XML lalu direnderer sebagai polygon berwarna severity (Minor→
    Extreme). Popup menampilkan headline, deskripsi, dan tautan
    infografis BMKG.
  - **Cuaca Kota Besar (hari ini)** (`api.bmkg.go.id/publik/
    prakiraan-cuaca`) — 11 ibukota provinsi ter-hardcode dengan kode
    `adm4`. Marker menampilkan emoji cuaca + suhu; popup menampilkan
    kelembapan, angin, jarak pandang, dan jam prakiraan lokal.
- **SIGMET Aktif (NOAA AWC)** — peringatan cuaca berbahaya untuk
  penerbangan (Significant Meteorological Information) dari NOAA
  Aviation Weather Center. Polygon area terdampak warna sesuai
  hazard: VA (volcanic ash — merah tua), TC (tropical cyclone —
  ungu), TS (thunderstorm — oranye), TURB, ICE, MTW, DS/SS. Popup
  menampilkan FIR, hazard + qualifier, valid time, ketinggian
  base/top (FL), dan seri. Endpoint tidak berCORS jadi lewat proxy
  PHP kita (`?h=awc&p=api/data/isigmet&q=format=json`).
- **Status Gunung Api Indonesia (MAGMA · live)** — 69 gunung api
  Indonesia dengan status aktivitas real-time (Normal / Waspada /
  Siaga / Awas) dari
  [MAGMA Indonesia](https://magma.esdm.go.id/) (PVMBG · Badan
  Geologi · ESDM). MAGMA menyisipkan roster + level sebagai variabel
  JS inline (`markersGunungApi`) di halaman utama; overlay fetch
  halaman via proxy PHP lalu ekstrak array-nya di klien. Marker
  warna sesuai level (hijau/kuning/oranye/merah), ukuran mengikuti
  level agar yang berstatus tinggi lebih menonjol. Popup menampilkan
  nama, provinsi, kabupaten/kota, elevasi, kode MAGMA, dan nomor
  VONA jika ada.
- **Gunung Api (Smithsonian GVP · Holocene)** — 1.214 gunung api
  Holocene dari _Smithsonian Global Volcanism Program_, snapshot
  langsung dari WFS resmi mereka
  (`webservices.volcano.si.edu/geoserver/GVP-VOTW`, feature type
  `Smithsonian_VOTW_Holocene_Volcanoes`). Marker warna sesuai
  aktivitas terakhir (aktif ≥ 1900 merah, historis 1500–1899 oranye,
  holocene pra-1500 coklat), ukuran skala elevasi. Popup menampilkan
  nama, negara, wilayah/subwilayah, tipe, landform, elevasi, batuan
  utama, setting tektonik, tahun erupsi terakhir, bukti, foto GVP,
  ringkasan geologis, dan deep-link ke halaman `volcano.si.edu`.
- **Tektonik (PB2002)** — grup `Tektonik` di layer control dengan
  tiga toggle: batas lempeng (garis; zona subduksi ditandai merah
  tebal), poligon lempeng (54 lempeng dengan warna stabil per kode),
  dan orogen (13 zona pegunungan). GeoJSON di-bundle di
  `public/tectonicplates/` (~600 KB total) dari
  [fraxen/tectonicplates](https://github.com/fraxen/tectonicplates)
  — model PB2002 Bird (2003).
- **Year & Month filters** — dot-only render: path points as small red
  dots, visits as green dots; no polylines cluttering the view.
- **Playback animation** — a single moving dot traces the timeline; once
  the animation finishes, the full trajectory polyline is revealed.
- **Statistics panel** — distance, points, visits, unique places, trips.
- **Live coordinate readout** — lat/lng of the cursor in the bottom-left.
- **Video export (MP4)** — pick a period (year/month range), a custom
  title, and a duration (30s, 60s, or custom); render the timeline as
  an animated MP4 (H.264). Each frame carries a rounded header card
  (title + `Month Year · N km` cumulative distance), a growing
  magenta trail, and a glowing pin at the head, with a 10-second
  trajectory hold at the end. Falls back to WebM only when the browser
  cannot encode MP4 (Firefox).
- **Halaman info di URL sendiri** — tombol `i` navigasi ke
  `/map-visualizer/info` (bukan modal), berisi dokumentasi lengkap
  tiap sumber data (endpoint, atribusi, lisensi, penyangkalan).
  URL shareable; `.htaccess` SPA fallback bikin deep link works di
  prod, dan Vite dev server juga SPA fallback by default.
- **Legend MAGMA dengan angka per level** — begitu overlay _Status
  Gunung Api (MAGMA)_ aktif, legend di kiri-bawah menampilkan
  jumlah gunung per Level IV/III/II/I plus Σ total. Kalau data live
  gagal dan overlay pakai snapshot vendored, legend tandain
  "Fallback snapshot".
- **Privacy-first** — all data processing happens in the browser.
  Nothing is uploaded.

## Quick start (local dev)

```bash
git clone https://github.com/Rebornian48/map-visualizer.git
cd map-visualizer
npm install
npm run dev
```

Open `http://localhost:5173`, then click **+ Add Timeline JSON** in the
header and pick your `Timeline.json`.

## Get your Timeline data

1. Go to [Google Takeout](https://takeout.google.com/).
2. Deselect all, then select **Location History (Timeline)**.
3. Choose **JSON** format.
4. Download and extract — find `Timeline.json`.

## Deploy: GitHub → Hostinger (auto)

The workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
builds the app and uploads `dist/` to Hostinger via FTP on every push to
`main`.

Repository secrets required (**Settings → Secrets and variables → Actions**):

| Secret Name | Value                        |
| ----------- | ---------------------------- |
| `FTP_HOST`  | e.g. `ftp.yourdomain.com`    |
| `FTP_USER`  | e.g. `u123456789`            |
| `FTP_PASS`  | Your FTP password            |

The workflow currently deploys to
`/domains/rebornian48.my.id/public_html/map-visualizer/` — change
`server-dir` in the workflow if you host elsewhere.

## Boundary overlays

The Provinsi/Kab-Kota toggles fetch GeoJSON from:

- `https://rebornian48.my.id/assets/json/provinsi.json`
- `https://rebornian48.my.id/assets/json/kabkota.json`

Those endpoints must return an `Access-Control-Allow-Origin` header for
the fetch to succeed from another origin (including during local dev).
For Apache/Hostinger, add this to `.htaccess` where the JSON lives:

```apache
<FilesMatch "\.(json|geojson)$">
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

## Data attribution

### Boundary GeoJSON

Provinsi & Kab/Kota outlines hosted at `rebornian48.my.id/assets/json/`.

### Opentransum (transportasi umum)

Overlay bus & rel diambil dari **Opentransum**
(<https://opentransum.randspace0.com/open-data>).

- **Sumber:** trayek, halte, stasiun, dan garis rel dikumpulkan
  Opentransum dari sumber publik masing-masing operator (Transjakarta,
  Trans Semarang, Trans Koetaradja, Transpakuan, Bus Listrik Medan,
  Metro Trans Jabar, KAI Commuter, MRT/LRT, dan operator Mitra Darat).
- **Lisensi:** Kompilasi dan penyajian data oleh Opentransum
  dilisensikan di bawah **Attribution-NonCommercial 4.0 (CC BY-NC
  4.0)**. Hak atas data aslinya tetap pada masing-masing operator.
- **Penyangkalan:** Data disajikan _as-is_, tanpa jaminan atas
  keakuratan, kelengkapan, kemutakhiran, maupun ketersediaannya. Isi
  dapat berubah kapan saja dan mungkin tidak sesuai kondisi lapangan.
  Rujuk ke operator terkait untuk informasi resmi.
- **Endpoints (CDN):** `https://cdn.opentransum.randspace0.com/transport-data/`
  — `transsemarang.json`, `metrojabartrans.json`, `buslistrikmedan.json`,
  `transkotaradja.json`, `transpakuan.json`, `mitradarat.json`,
  `file_gtfs.zip` (Transjakarta GTFS), `krl_lines.geojson`,
  `lrt_mrt_lines.geojson`, `rails.kml`.

CDN Opentransum hanya mengirim `Access-Control-Allow-Origin:
https://opentransum.randspace0.com`, jadi fetch langsung dari
`rebornian48.my.id` diblok CORS. Karena kami tidak mengelola CDN
tersebut, build produksi mem-proxi via satu file PHP di Hostinger.

**Setup proxy (sekali saja):**

1. Upload [deploy/otsum/proxy.php](deploy/otsum/proxy.php) ke
   `public_html/otsum/proxy.php` di Hostinger (File Manager atau FTP).
2. Verifikasi:
   ```bash
   curl -sI "https://rebornian48.my.id/otsum/proxy.php?f=transsemarang.json" | grep -i access-control
   ```
   Harus muncul `access-control-allow-origin: *`.

Proxy meng-whitelist 10 nama file yang dipakai app, forward ke CDN
Opentransum, dan menempelkan header CORS. Cache HTTP 1 jam di browser.

Dev lokal tidak melewati proxy — `vite.config.js` memproxikan
`/otsum-cdn/*` langsung ke CDN dari sisi Node server.

### BMKG (Gempa, CAP, Cuaca)

Ketiga host BMKG (`data.bmkg.go.id`, `www.bmkg.go.id`, `api.bmkg.go.id`)
tidak mengirim header CORS, jadi build produksi memakai satu file PHP
gabungan di Hostinger untuk merutekan ketiganya.

**Setup proxy BMKG (sekali saja):**

1. Upload [deploy/bmkg/proxy.php](deploy/bmkg/proxy.php) ke
   `public_html/bmkg/proxy.php` di Hostinger.
2. Verifikasi:
   ```bash
   curl -sI "https://rebornian48.my.id/bmkg/proxy.php?h=data&p=DataMKG/TEWS/autogempa.json" | grep -i access-control
   ```
   Harus muncul `access-control-allow-origin: *`.

Proxy meng-whitelist empat host (via `?h=data|www|api|magma`) dan
mem-validasi path dengan regex (untuk CAP alert dengan ID dinamis).
Query string `?adm4=…` diteruskan untuk endpoint cuaca. Host `magma`
menunjuk ke `magma.esdm.go.id` — halaman utama-nya menyisipkan roster
gunung api live sebagai variabel JS inline yang di-ekstrak di klien
oleh overlay MAGMA.

Dev lokal tidak melewati proxy PHP — `vite.config.js` memproxikan
`/bmkg-cdn/*`, `/bmkg-www/*`, `/bmkg-api/*`, dan `/magma-web/*`
langsung ke masing-masing host.

### Gunung Api (Smithsonian GVP · Holocene)

Dataset gunung api Holocene diambil langsung dari **Smithsonian Global
Volcanism Program**, via WFS resmi mereka:

```
https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application/json
```

Snapshot GeoJSON (~2,4 MB, 1.214 fitur) di-vendor ke
`public/veins/volcanoes.json` — refresh manual dengan `curl` di atas
untuk pick-up erupsi baru.

Sitasi wajib pada tampilan yang menampilkannya:

> Global Volcanism Program, 2026. _[Volcanoes of the World (v. 5.2.6)](https://doi.org/10.5479/si.GVP.VOTW5-2026.5.4)_.
> Smithsonian Institution.

### Tektonik (PB2002)

Data batas lempeng, poligon lempeng, dan orogen diambil dari repo
[fraxen/tectonicplates](https://github.com/fraxen/tectonicplates),
turunan langsung dari model **PB2002** Peter Bird:

> Bird, P. (2003), _An updated digital model of plate boundaries_,
> Geochemistry Geophysics Geosystems, 4(3), 1027,
> doi:10.1029/2001GC000252.

File-nya di-vendor ke `public/tectonicplates/{boundaries,plates,orogens}.json`
supaya build self-contained (tidak fetch ke GitHub raw saat runtime).

### Attribusi BMKG

Data BMKG (gempa, peringatan dini cuaca, prakiraan cuaca) adalah **milik
Badan Meteorologi, Klimatologi, dan Geofisika**. Sesuai ketentuan
[infoBMKG](https://github.com/infoBMKG), wajib mencantumkan BMKG sebagai
sumber pada aplikasi yang menampilkannya. Data disajikan _as-is_; untuk
peringatan resmi dan tindakan lapangan, rujuk selalu ke
[bmkg.go.id](https://www.bmkg.go.id/).

## Manual deploy (alternative)

```bash
npm run build
```

Upload the contents of `dist/` to Hostinger's target folder via:

- Hostinger File Manager (hPanel → Files → File Manager)
- Any FTP client (FileZilla, Cyberduck)

## Tech stack

- **React 18** — UI framework
- **Vite 6** — build tool
- **Leaflet** — interactive maps
- **html-to-image** — DOM → PNG snapshot for the video background
- **MediaRecorder + canvas.captureStream** — MP4/WebM encoding
- **JSZip** — client-side GTFS zip extraction (Transjakarta overlay)
- **GitHub Actions** — CI/CD
- **Hostinger** — hosting

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Example export: a 9.5-year timeline

An example MP4 rendered from this tool — one user's Google Timeline
covering March 2017 to August 2026, exported at 480×480, 24 fps, ~31.5 s
(AV1 + AAC, ~1.6 MB).

### Video metadata

- **Duration:** 31.56 s
- **Resolution / fps:** 480×480 @ 24 fps
- **Codec:** AV1 video, AAC audio
- **Overlay:** title, month + year, cumulative distance
- **Basemap:** CARTO Positron / OpenStreetMap
- **Trail:** accumulated pink/magenta polyline with a circular pin marker

### Sampled frames

| Time (s) | Date | Cumulative distance | Position / movement |
| -------- | ---- | ------------------- | ------------------- |
| 1 | Mar 2017 | 3,802 km | Yogyakarta (origin) |
| 2 | Feb 2018 | 10,352 km | Local loops around Yogyakarta–Bantul–Wates |
| 4 | Sep 2018 | 23,088 km | Dense activity across Yogyakarta |
| 6 | Apr 2019 | 36,458 km | Yogyakarta → Jakarta along the north-coast route |
| 8 | Aug 2019 | 52,422 km | Jabodetabek (Jakarta–Bogor–Bekasi) |
| 10 | Mar 2020 | 69,931 km | Jakarta ↔ Semarang corridor (pandemic era) |
| 12 | Jun 2021 | 85,293 km | Jakarta ↔ Yogyakarta via both north and south routes |
| 14 | Apr 2022 | 100,294 km | First Sumatra trip (toward Palembang / Jambi) |
| 16 | Nov 2022 | 117,564 km | Reach into Palembang; Bandung–Semarang corridor |
| 18 | Apr 2023 | 133,201 km | Kalimantan trip (Central Kalimantan) |
| 20 | Aug 2023 | 155,057 km | Full Java coverage: Jakarta ↔ Surabaya |
| 22 | Dec 2023 | 175,877 km | Jakarta–Semarang corridor |
| 24 | Jun 2024 | 197,650 km | Sulawesi trip (Makassar) |
| 26 | Oct 2024 | 220,772 km | Jakarta–Semarang again |
| 28 | Jul 2025 | 238,584 km | Jakarta–Semarang–Surabaya |
| 30 | May 2026 | 254,479 km | West + Central Java loop |
| 31 | Aug 2026 | 259,229 km | Final frame — a fan of trips across all of Indonesia, hubbed on Jakarta |

### Travel phases

1. **2017–2018 — Yogyakarta base.** Local movement, ~10k km.
2. **2019 — Relocation.** Yogyakarta → Jakarta; one long jump adds ~26k km.
3. **2019–2021 — Jabodetabek base.** North-coast corridor
   Jakarta–Semarang–Yogyakarta dominates.
4. **2022–2024 — Outside-Java expansion.** Sumatra (Palembang),
   Kalimantan (Central), Sulawesi (Makassar). Each trip adds
   ~15–20k km in a single hop.
5. **2025–2026 — Consolidation and finale.** Return to Java corridors,
   then a final Nusantara-wide fan reaching Malaysia, Brunei, and
   East Timor at the edges of the frame.

### Aggregate stats

- **Total distance:** 259,229 km over ~9.5 years (Mar 2017 – Aug 2026)
- **Average:** ~27,300 km/year, or ~75 km/day
- **Scale:** roughly 6.5× the Earth's equator (40,075 km)
- Two visible acceleration points: the 2018→2019 relocation, and the
  post-2022 expansion outside Java

### What the export shows about the tool

- Auto-fit zoom per frame — the map re-frames from a Yogyakarta close-up
  to an Indonesia-wide view as the trajectory expands.
- Cumulative trail: earlier segments stay drawn as new ones arrive.
- 10-second trajectory hold at the end (see the `b0bb095` commit).
- Compact file size at usable quality thanks to AV1.

## Inspired by

[google-timeline-visualizer](https://github.com/mahlernim/google-timeline-visualizer)
by @mahlernim.

## License

MIT
