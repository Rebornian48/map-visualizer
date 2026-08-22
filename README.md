# Map Visualizer

Interactive web visualizer for Google Location History `Timeline.json` files.
Built with **React + Vite + Leaflet** — auto-deploys to **Hostinger** via GitHub Actions.

Live: https://rebornian48.my.id/map-visualizer/

## Features

- **Map-first flow** — the map loads immediately; drop a `Timeline.json` in
  from the header when you're ready.
- **Multiple basemaps** — Carto Light, Carto Dark, OpenStreetMap, Esri
  Satellite, and OpenTopoMap, switchable from the layer control in the
  top-right of the map.
- **Indonesia boundary overlays** — toggle between Provinsi and Kab/Kota
  outlines (GeoJSON), mutually exclusive.
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
