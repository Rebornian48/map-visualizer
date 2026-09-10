# Changelog

All notable changes to Map Visualizer. Entries follow the app's own
evolution rather than semantic versions; the most recent change is
at the top.

## Unreleased

### Added

- **Insiden Keracunan MBG — choropleth kab/kota + dashboard interaktif.**
  Grup baru `Insiden · MBG` di bawah _Bencana Alam_ (toggle
  _Keracunan MBG_). Data-nya dari tabel Wikipedia bahasa Indonesia
  [_Daftar kasus keracunan massal makan siang gratis_](https://id.wikipedia.org/wiki/Daftar_kasus_keracunan_massal_makan_siang_gratis)
  section _Makan Bergizi Gratis_ — di-fetch via MediaWiki API,
  di-parse dengan handling rowspan yang benar (satu insiden bisa
  span beberapa sekolah; jumlah korban tidak boleh dobel-hitung),
  lalu dijodohkan ke polygon `kabkota.json`.
  Layer render polygon batas administrasi kabupaten/kota yang punya
  insiden dengan arsiran warm ramp berdasarkan total korban di
  kabupaten itu (peach ≤50 → maroon &gt;2.000). Popup menampilkan
  kabupaten, jumlah kejadian, total korban, dan tiga insiden
  terbesar (nama lokasi + tanggal + jumlah).
  Polygon di-simplify Ramer-Douglas-Peucker ~500m, jadi file turun
  dari 33 MB (kabkota.json penuh) ke ~650 KB.
  Dashboard interaktif terpisah di
  [/keracunan-mbg](https://rebornian48.my.id/map-visualizer/keracunan-mbg)
  — timeline bulanan (bar chart, warna warm ramp) + breakdown per
  provinsi (horizontal bars) + top 10 insiden terparah, dengan
  cross-filter dua arah (klik bulan → provinsi ter-filter; klik
  provinsi → timeline ter-filter). Design Fraunces serif + Public
  Sans, dark/light theme-aware. Dashboard dan layer peta share satu
  sumber data (`public/mbg/incidents.json` + `.geojson`, dua-duanya
  dihasilkan oleh `scripts/refresh-mbg.py`).
- **Auto-refresh BMKG layers (setInterval).** Layer BMKG yang di-toggle
  aktif sekarang otomatis re-fetch tiap N menit: Gempa (autogempa,
  terkini, dirasakan) tiap 2 menit, CAP Peringatan Dini Cuaca tiap
  5 menit, Prakiraan Cuaca Kota Besar tiap 30 menit. Interval
  di-attach saat toggle-on dan di-clear saat toggle-off; guard supaya
  tidak race kalau user matikan layer selagi fetch jalan. Kegagalan
  refresh cuma `console.warn` — layer lama tetap tampil, jadi hiccup
  jaringan sesaat tidak menghapus data yang sudah ada.

### Changed

- **Panel Layers: gabungkan Aeronautika + Maritim ke Transportasi.**
  Toolbar Layers turun dari tujuh tombol jadi lima
  (_Basemap_, _Wilayah_, _Transportasi_, _Cuaca_, _Bencana Alam_).
  Aeronautika (OpenAIP) dan Maritim (SeaRates) tetap ada — pindah
  jadi group tersendiri di dalam panel _Transportasi_. Semua key
  layer dan state toggle tidak berubah, cuma pengelompokan UI-nya
  yang digabung.
- **MBG layer: centroid dot → polygon choropleth kab/kota.**
  Iterasi pertama layer MBG render satu `circleMarker` per lokasi
  di centroid kabupaten — banyak dot tumpuk di kota yang sama, dan
  peta terbaca "dot di Jawa" alih-alih peta severity administratif.
  Sekarang render polygon batas kabupaten yang punya insiden dengan
  arsiran warm ramp (lihat entri _Insiden Keracunan MBG_ di atas).

### Fixed

- **Boundary layers Provinsi/Kab-Kota gagal load — CORS.** Endpoint
  `rebornian48.my.id/assets/json/{provinsi,kabkota}.json` mengembalikan
  200 OK tapi tanpa header `Access-Control-Allow-Origin`, sehingga
  browser memblokir respons (`Failed to fetch`). Overlay lain aman
  karena diproksi via `proxy.php` yang menyisipkan CORS; dua JSON ini
  bypass proxy dan hit static origin langsung.
  Dev sekarang lewat Vite proxy baru `/rebornian-assets`. Prod
  diperbaiki dengan menambah `Access-Control-Allow-Origin: *` di
  `.htaccess` untuk `/assets/json/` (perubahan sisi server).
- **TDZ di `attachBoundaryLayer` saat boundary GeoJSON akhirnya
  ter-load.** Bug lama yang tersembunyi karena fetch selalu gagal
  duluan di CORS: `L.geoJSON({onEachFeature: ...})` memanggil
  callback sinkron selama konstruktor jalan, dan callback-nya baca
  `const layer` yang lagi di-assign — hit Temporal Dead Zone (`Cannot
  access 'h' before initialization` di bundle prod). Diperbaiki
  dengan meng-inject getter `getLayer` alih-alih referensi langsung
  ke `layer`; getter di-resolve nanti saat user hover/click, jauh
  setelah `L.geoJSON()` selesai return.

### Added — earlier this window

- **Maritim overlay — Pelabuhan Indonesia (SeaRates World Sea Ports).**
  New _Maritim_ section (anchor icon) exposes Indonesian sea ports as
  anchor markers. Data lives at `public/searates/ports.json` and comes
  from SeaRates' `POST /geo/world-sea-ports/list-by-country` endpoint
  (`geocoding.searates.com`, filtered by `country_code:"ID"`). Refresh
  is `SEARATES_KEY=… node scripts/refresh-searates-ports.mjs` — trims
  each port to `{name, locode, iata, location, features}` so the
  vendored file stays small even at full national coverage (200+ ports).
  Colour encodes intermodal role (sea, sea+rail, river, ICD), size
  encodes TEU throughput. Popup shows LOCODE, city, WGS84 coordinates,
  TEU (if any), and intermodal flag badges (SEA/RIVER/RAIL/ROAD/AIR/ICD).
  Ships out of the box with a seed of 15 major ports (Pelabuhan Utama —
  Tanjung Priok, Tanjung Perak, Belawan, Makassar, Tanjung Emas, Batam,
  Balikpapan, Panjang, Pontianak, Palembang, Dumai, Bitung, Sorong,
  Ambon, Jayapura; coordinates from public OSM/UN-LOCODE) so the layer
  works without an API key. Attribution: © SeaRates by DP World.
- **BMKG overlays — gempa, peringatan dini cuaca (CAP), cuaca kota.**
  Three toggleable layer groups under a new _Bencana Alam_ section:
  - `data.bmkg.go.id/DataMKG/TEWS/{autogempa,gempaterkini,gempadirasakan}.json`
    render as circle markers sized by magnitude and coloured by depth
    (< 70 km red, 70–300 km orange, > 300 km blue); popup pulls the
    shakemap image from `static.bmkg.go.id`.
  - `www.bmkg.go.id/alerts/nowcast/id/rss.xml` (RSS index → per-alert
    CAP 1.2 XML) renders as polygons/circles coloured by severity
    (Minor → Extreme).
  - `api.bmkg.go.id/publik/prakiraan-cuaca?adm4=…` fetched for 11
    verified major-city `adm4` codes; emoji markers show current
    weather + temperature.
  All three routed through one PHP proxy
  ([deploy/bmkg/proxy.php](deploy/bmkg/proxy.php)) with a regex
  whitelist per host (`?h=data|www|api`), because BMKG endpoints
  don't send CORS headers. Dev bypasses via three vite proxies
  (`/bmkg-cdn`, `/bmkg-www`, `/bmkg-api`).
- **Textbook symbology untuk marker.** Overlay bencana dan transit
  sekarang render dengan pictogram yang cocok dengan konvensi peta
  buku pelajaran alih-alih lingkaran generik:
  - Gunung api (GVP + MAGMA) — **segitiga**, ukuran sesuai elevasi /
    level status, warna sesuai activity / alert level.
  - Bandara (OpenAIP) — **glyph pesawat**, ukuran sesuai tipe
    (internasional 22 px, sipil/militer 18 px, heliport / ULM /
    seaplane / private 14 px), warna sesuai kategori tipe.
  - Halte / stop bus (Trans Semarang, Metro Trans Jabar, Bus Listrik
    Medan, Trans Koetaradja, Transpakuan, Mitra Darat, Transjakarta
    GTFS) — **glyph bus** kecil (14 px).
  - Stasiun KRL/LRT/MRT — **glyph kereta** kecil (16 px).
  Semua ikon dihasilkan lewat `L.divIcon` dengan SVG inline yang
  di-share di [src/mapIcons.js](src/mapIcons.js); caller cukup pilih
  ukuran + warna. Legend Gunung Api (GVP) dan MAGMA juga ikut
  triangle swatch supaya konsisten dengan simbol di peta.
- **Airspace z-order: CTR/TMA di atas FIR.** FIR Indonesia besar
  (Jakarta + Ujung Pandang) — sebelumnya menutupi CTR & TMA Papua
  yang ada di dalamnya sehingga tooltip/popup mereka tak bisa diklik.
  Sekarang dibuat tiga custom Leaflet pane di map init
  (useMapController): `airspaceFir` (zIndex 402), `airspaceTma`
  (412), `airspaceCtr` (422). openaip.js routing polygon ke pane
  sesuai `type` — jadi CTR selalu render paling atas tanpa peduli
  urutan toggle.
- **Simbologi Peta di InfoPage.** Section baru sesudah Ringkasan Isi
  Peta yang mendokumentasikan setiap glyph yang dipakai di peta —
  dikelompokkan Titik (marker) / Garis (line) / Poligon (area).
  Tiap baris menampilkan simbol SVG persis seperti di peta, nama,
  dan keterangan. Total 30 simbol: gunung api (aktif/historis/holocene),
  bandara (internasional/sipil/militer/heliport/seaplane), halte
  bus, stasiun rel, gempa (dangkal/menengah/dalam), cuaca emoji,
  batas lempeng, zona subduksi, trayek bus, rel, batas administratif,
  CAP severity (4 level), SIGMET hazard (VA/TC), orogen, FIR/TMA/CTR,
  Restricted/Prohibited. Berfungsi sebagai "kamus simbol" — mengikuti
  konvensi peta buku pelajaran Indonesia sedapat mungkin.
- **Ringkasan Isi Peta di InfoPage.** Halaman `/info` sekarang
  diawali dengan card per kategori tombol layer (Basemap / Wilayah /
  Transportasi / Cuaca / Bencana Alam) yang menampilkan semua
  overlay yang tersedia — jumlah item, jaringan/dataset yang
  dicover, dan format singkat. Detail teknis (endpoint, atribusi,
  lisensi) tetap tersedia di bagian-bagian di bawahnya. Berfungsi
  sebagai "peta situs" untuk semua data yang bisa ditoggle.
- **SIGMET overlay (NOAA Aviation Weather Center).** New toggle
  under _Bencana Alam · Aviasi_ shows worldwide active SIGMETs
  (Significant Meteorological Information) — hazardous weather
  advisories for aviation. Colour-coded polygons per hazard: VA
  (volcanic ash), TC (tropical cyclone), TS (thunderstorm), TURB,
  ICE, MTW (mountain waves), DS/SS. Popup surfaces FIR, hazard +
  qualifier, valid time window, ketinggian base/top (FL), and
  series. Legend card ("SIGMET · Hazard aktif") only lists hazards
  with at least one active advisory and shows the count per hazard
  + Σ total. Source: `aviationweather.gov/api/data/isigmet?format=json`,
  routed through the shared PHP proxy (new `h=awc` host + `q=`
  passthrough) since the AWC API doesn't send CORS headers.
- **MAGMA Indonesia overlay (live volcano status).** New toggle
  under _Bencana Alam · Vulkano_ shows 69 Indonesian volcanoes with
  live activity level from
  [MAGMA Indonesia](https://magma.esdm.go.id/) (PVMBG · ESDM):
  Normal (green) → Waspada (yellow) → Siaga (orange) → Awas (red).
  MAGMA embeds the roster + status as an inline JS variable
  (`markersGunungApi`) on its homepage; the layer fetches the HTML
  through the shared PHP proxy (new `h=magma` host) and regex-extracts
  the array on the client. Markers are colour + size coded by alert
  level; popup surfaces province/regency, elevation, MAGMA code, and
  the active VONA number when one is issued. Legend card added.
- **Gunung Api overlay (Smithsonian GVP · Holocene).** New toggle
  under _Bencana Alam · Vulkano_ shows **1.214** Holocene volcanoes
  from the _Smithsonian Global Volcanism Program_. Snapshot taken
  directly from GVP's official WFS
  (`webservices.volcano.si.edu/geoserver/GVP-VOTW`, feature type
  `Smithsonian_VOTW_Holocene_Volcanoes`) as GeoJSON, replacing the
  earlier 832-point veins-of-the-earth simplification. Markers
  coloured by most recent eruption (active ≥ 1900 red, historic
  1500–1899 orange, holocene pre-1500 brown) and sized by summit
  elevation. Popup now surfaces the extra GVP fields: subregion,
  landform, evidence category, primary photo + credit, and a deep
  link to `volcano.si.edu` via the volcano's VOTW number. JSON
  bundled in `public/veins/volcanoes.json` (~2.4 MB) so the build
  stays self-contained; refresh from WFS periodically. Legend card
  added to the bottom-left stack.
- **Tectonic plates overlay (PB2002 · Bird 2003).** Three toggles
  under _Bencana Alam · Tektonik_: 241 plate-boundary lines (with
  subduction zones highlighted red), 54 plate polygons (stable
  per-plate hash colour), and 13 orogens. GeoJSON bundled locally in
  `public/tectonicplates/` (~600 KB total) from
  [fraxen/tectonicplates](https://github.com/fraxen/tectonicplates)
  so the build is self-contained.
- **Legend cards for tectonic + BMKG layers.** Bottom-left
  `LegendStack` renders one card per active section — tectonic
  colour key (boundary / subduction / plates / orogen), gempa depth
  colour scale + magnitude-size hint, CAP severity scale, and the
  weather-icon reference grid. Only sections whose layer is on are
  drawn.
- **Layers panel split into 3 top-level sections.** _Basemap &
  Wilayah_, _Transportasi Umum_ (Bus JSON / Bus GTFS / Rel), and
  _Bencana Alam_ (BMKG + Tektonik). Each section header is
  click-to-collapse so the panel stays scannable as more overlays
  are added.
- **Data attribution modal** now lists BMKG endpoints and cites
  Bird (2003) for PB2002 tectonic data.
- **GitHub Actions deploy** gains a second FTP step that syncs
  `deploy/bmkg/` → `public_html/bmkg/` so the BMKG proxy lands
  automatically on every push instead of needing a one-off upload.
- **Opentransum transport overlays.** Layer control gains a
  toggleable list of public-transport overlays sourced from
  [opentransum.randspace0.com](https://opentransum.randspace0.com/open-data):
  six bus networks (Trans Semarang, Metro Trans Jabar, Bus Listrik
  Medan, Trans Koetaradja, Transpakuan, Mitra Darat), Transjakarta
  GTFS, KRL & LRT/MRT rail lines (GeoJSON), and KRL/LRT/MRT stations
  (KML). Each source is fetched and cached on first toggle. Bus
  routes coloured from `route.color`, rail lines from
  `properties.colour_hex`, GTFS routes from `routes.txt.route_color`.
  Compilation is CC BY-NC 4.0 (Opentransum) — see README for full
  attribution and disclaimer.
- **JSZip dependency** for client-side extraction of the Transjakarta
  GTFS bundle.
- **Dev-only Vite proxy** at `/otsum-cdn` → CDN so local dev works
  before CDN CORS is opened to third-party origins.
- **Boundary overlays.** Segmented control in the header switches
  between _No boundary_, _Provinsi_, and _Kab/Kota_ — mutually
  exclusive. GeoJSON is fetched from
  `https://rebornian48.my.id/assets/json/{provinsi,kabkota}.json`
  on demand and cached per session.
- **First-visit notice** about the video export still being a work
  in progress. Appears on every reload; dismissable per view.

### Changed

- **Cuaca split into its own layer button.** BMKG · Peringatan Dini
  and BMKG · Cuaca moved from _Bencana Alam_ into a new _Cuaca_
  button (cloud-with-rain icon). The panel is now 5 buttons instead
  of 4: Basemap · Wilayah · Transportasi · Cuaca · Bencana Alam.
  Bencana Alam keeps hazard-only data (Gempa, Vulkano, Tektonik,
  Aviasi/SIGMET).
- **Layers panel is four separate buttons.** Instead of one panel with
  collapsible sections, the layer control is now a row of four icon
  buttons at top-right — _Basemap_, _Wilayah_, _Transportasi_,
  _Bencana Alam_. Only one panel is open at a time; clicking outside
  or the × in the panel header closes it. Group→section mapping
  lives in `LayersControl.jsx` so new overlays with an existing group
  name auto-slot into the right button.
- **Info opens a dedicated page, not a modal.** The `i` button now
  navigates to `/map-visualizer/info` via client-side `history.pushState`;
  App.jsx renders `InfoPage` for that route and `MapView` for
  everything else. Content is the same (Opentransum + BMKG + MAGMA
  + GVP + PB2002 attribution & datasets) but laid out as a full-page
  document with a back button, so the URL is shareable and the map
  isn't obscured by an overlay. Existing `.htaccess` SPA fallback
  makes deep links to `/info` work in prod.
- **MAGMA legend now shows per-level counts.** Builder attaches
  `{ counts, total, source }` metadata onto the returned layer;
  useMapController exposes it via a new `transportMeta` state;
  MagmaLegend reads the count for each `ga_status` code and prints
  it right-aligned per row (Awas / Siaga / Waspada / Normal), plus a
  Σ total on the header. When the live fetch failed and the layer
  fell back to the vendored snapshot, the legend appends a
  "Fallback snapshot" note so it's obvious the numbers might be
  slightly stale.
- **Video export duration is now honored.** The rendering loop is
  driven by `requestAnimationFrame` anchored to wall-clock elapsed,
  instead of `setTimeout(1000/fps)` which was overshooting by ~5x.
- **Video structure:** `durationSeconds` of animation, followed by
  a **10-second hold** where the full trajectory polyline fades in
  (over 1s) and stays for the remaining 9s. A 60-second pick now
  produces a 70-second file; a 30-second pick produces 40 seconds.
- **Dots-only render** in the static filtered view. Path points
  become small red dots (sampled up to 5000), visits become green
  dots — no polylines, no activity direction lines.
- **Playback shows only a moving head marker.** The trail no
  longer paints as the animation plays; when the run finishes the
  full trajectory polyline is drawn as the finished state.

### Added — earlier in this window

- **Video export (MP4).** New _Export Video_ button opens a modal
  with start/end year+month pickers and a duration control (30s,
  60s, or custom 5-600s). Renderer snapshots the fitted map with
  `html-to-image`, then animates the route on a
  `captureStream`-backed canvas and records via `MediaRecorder`.
  Prefers `video/mp4` (H.264) and falls back to WebM only when the
  browser cannot encode MP4.
- **Header replaces the floating top bar.** Solid header with a
  border-bottom on top; the map fills the remaining space below.
- **Map-first flow.** The map opens immediately; the upload lives
  in the header as _+ Add Timeline JSON_ (turns into _Replace JSON_
  once data is loaded). `LoadingScreen` overlays the map during
  parsing.
- **Basemap picker** in the top-right of the map: OpenStreetMap,
  Esri Satellite, OpenTopoMap.
- **Live coordinate readout** in the bottom-left, following the
  cursor at 6-decimal precision.

### Removed

- **`DataInfoModal`** — replaced by the standalone `InfoPage` at
  `/map-visualizer/info`. Content moved verbatim into `InfoPage.jsx`;
  the modal wrapper is gone.
- **Carto Light / Carto Dark basemaps.** CARTO's `basemaps.cartocdn.com`
  tiles now require an API key and were serving "API KEY REQUIRED"
  watermarks over the map. Default basemap moves to OpenStreetMap.
  Remaining basemap options: OpenStreetMap, Esri Satellite,
  OpenTopoMap.
- `UploadScreen` component — replaced by the header button.

## 2025-08 — repository rename

### Repository

- Project renamed from `visualisasi-peta` /
  `google-timeline-visualizer-web` to **`map-visualizer`**.
  Package name, Vite `base`, `.htaccess` `RewriteBase`, the
  Hostinger `server-dir`, the page title, and the on-page heading
  all updated.

## Initial

- React + Vite + Leaflet app that parses Google Location History
  `Timeline.json`, organizes by year and month, and draws routes,
  visits, and activity segments on a dark-themed Leaflet map.
- Statistics panel (points, visits, unique places, trips,
  distance) and playback animation with adjustable speed.
- GitHub Actions workflow that builds and FTPs `dist/` to
  Hostinger on every push to `main`.
