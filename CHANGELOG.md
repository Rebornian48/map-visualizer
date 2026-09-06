# Changelog

All notable changes to Map Visualizer. Entries follow the app's own
evolution rather than semantic versions; the most recent change is
at the top.

## Unreleased

### Added

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
- **Gunung Api overlay (Smithsonian GVP · Holocene).** New toggle
  under _Bencana Alam · Vulkano_ shows 832 active or Holocene-active
  volcanoes from the Smithsonian Global Volcanism Program, via the
  [Salar2035/veins-of-the-earth](https://github.com/Salar2035/veins-of-the-earth)
  simplification. Markers are coloured by most recent eruption
  (active ≥ 1900 red, historic 1500–1899 orange, holocene pre-1500
  brown) and sized by summit elevation. Popup shows name, country,
  region, type, major rock, tectonic setting, last eruption, and the
  GVP geological summary. JSON bundled in `public/veins/volcanoes.json`
  (~420 KB) so the build stays self-contained. Legend card added to
  the bottom-left stack.
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
