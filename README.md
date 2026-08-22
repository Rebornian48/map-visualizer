# Map Visualizer

Interactive web visualizer for Google Location History `Timeline.json` files.  
Built with **React + Vite + Leaflet** — auto-deploys to **Hostinger** via GitHub Actions.

## Features

- **Interactive Map** — Dark-themed Leaflet map with routes, visits, and activity overlays
- **Year & Month Filters** — Navigate your location history by time period
- **Activity Legend** — Color-coded activity types (walking, driving, cycling, flying, etc.)
- **Statistics Panel** — Distance traveled, places visited, trip counts
- **Playback Animation** — Watch your movements animated on the map with adjustable speed
- **Privacy-First** — All data processing happens in your browser. Nothing is uploaded.

## Quick Start (Local Dev)

```bash
git clone https://github.com/YOUR_USERNAME/map-visualizer.git
cd map-visualizer
npm install
npm run dev
```

Open `http://localhost:5173` and drop your `Timeline.json` file.

## Deploy: GitHub → Hostinger (Auto)

### Step 1 — Create GitHub Repo

```bash
cd map-visualizer
git init
git add .
git commit -m "initial commit"
gh repo create map-visualizer --public --push
```

Or create the repo manually on github.com and push.

### Step 2 — Get Hostinger FTP Credentials

1. Login to [Hostinger hPanel](https://hpanel.hostinger.com)
2. Go to **Files → FTP Accounts**
3. Note down these 3 values:
   - **FTP Host** → e.g. `ftp.yourdomain.com` or the IP
   - **FTP Username** → e.g. `u123456789`
   - **FTP Password** → the password you set

### Step 3 — Add Secrets to GitHub

1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Add 3 **Repository secrets**:

   | Secret Name  | Value                        |
   |-------------|------------------------------|
   | `FTP_HOST`  | `ftp.yourdomain.com`         |
   | `FTP_USER`  | `u123456789`                 |
   | `FTP_PASS`  | Your FTP password            |

### Step 4 — Push & Done

```bash
git push origin main
```

GitHub Actions will automatically:
1. Install dependencies
2. Build the Vite app
3. Upload `dist/` to Hostinger's `public_html/` via FTP

Every future `git push` to `main` triggers a new deploy.

### Step 5 — Verify

Open your Hostinger domain in a browser. Map Visualizer should be live.

## Manual Deploy (Alternative)

If you prefer not to use GitHub Actions:

```bash
npm run build
```

Then upload the contents of `dist/` to Hostinger's `public_html/` via:
- Hostinger File Manager (hPanel → Files → File Manager)
- Any FTP client (FileZilla, Cyberduck)

## How to Get Your Timeline Data

1. Go to [Google Takeout](https://takeout.google.com/)
2. Deselect all, then select **Location History (Timeline)**
3. Choose **JSON** format
4. Download and extract — find `Timeline.json`

## Tech Stack

- **React 18** — UI framework
- **Vite 6** — Build tool
- **Leaflet** — Interactive maps
- **GitHub Actions** — CI/CD
- **Hostinger** — Hosting

## Inspired By

[google-timeline-visualizer](https://github.com/mahlernim/google-timeline-visualizer) by @mahlernim

## License

MIT
