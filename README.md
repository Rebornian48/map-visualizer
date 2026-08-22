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
- **Video export (MP4)** — pick a period (year/month range) and a
  duration (30s, 60s, or custom), render the timeline as an animated
  MP4 (H.264) with a 10-second trajectory hold at the end. Falls back to
  WebM only when the browser cannot encode MP4 (Firefox).
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

## Inspired by

[google-timeline-visualizer](https://github.com/mahlernim/google-timeline-visualizer)
by @mahlernim.

## License

MIT
