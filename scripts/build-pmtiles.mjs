#!/usr/bin/env node
// Build vector tile archives (.pmtiles) for the heavy GeoJSON overlays so
// MapLibre can lazy-load only the visible tiles instead of parsing tens of
// MB of raw GeoJSON on the main thread.
//
// Runner auto-detection (Windows has no native tippecanoe):
//   1. `tippecanoe` on PATH        (macOS/Linux, or Git Bash with a build)
//   2. `wsl tippecanoe …`          (Windows with WSL + `apt install tippecanoe`)
//   3. Docker  ghcr.io/felt/tippecanoe:latest  (any OS with Docker Desktop)
//
// Usage:
//   node scripts/build-pmtiles.mjs                      # rebuild all missing
//   node scripts/build-pmtiles.mjs --force              # rebuild all
//   node scripts/build-pmtiles.mjs --group boundaries   # one group
//   node scripts/build-pmtiles.mjs --only desa,mangrove # specific slugs
//   node scripts/build-pmtiles.mjs --runner docker      # force docker
//   node scripts/build-pmtiles.mjs --list               # print planned builds
//
// Output lands in public/tiles/<group>/<slug>.pmtiles. The layer name inside
// each archive equals the slug — matches what GlobeView passes as
// `source-layer` when it reads `pmtilesUrl`.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_DIR = join(ROOT, 'public')
const OUT_ROOT = join(PUBLIC_DIR, 'tiles')

// ── Dataset config ───────────────────────────────────────────────
// Each entry: { group, slug, input, args }
//   - group: folder under public/tiles/
//   - slug:  filename stem (also becomes `-l <slug>` inside the archive)
//   - input: path relative to public/
//   - args:  extra tippecanoe flags (geometry-type + zoom tuning)
//
// Flag cheatsheet:
//   -Z<n> / -z<n>                min / max zoom
//   -l <name>                    layer name inside archive (added automatically)
//   -y <prop>                    keep only these properties (repeatable)
//   --drop-densest-as-needed     drop features to fit tile budget
//   --coalesce-densest-as-needed merge polygons at low zoom
//   -r1                          skip point-radius dropping (keep every point)
const DATASETS = [
  // ── Batas Administrasi ──────────────────────────────────────
  { group: 'boundaries', slug: 'provinsi',  input: 'boundaries/provinsi.json',
    args: ['-Z0','-z10','-y','WADMPR','--coalesce-densest-as-needed'] },
  { group: 'boundaries', slug: 'kabkota',   input: 'boundaries/kabkota.json',
    args: ['-Z2','-z12','-y','WADMKK','-y','WADMPR','--coalesce-densest-as-needed'] },
  { group: 'boundaries', slug: 'kecamatan', input: 'boundaries/kecamatan.json',
    args: ['-Z5','-z14','-y','WADMKC','-y','WADMKK','-y','WADMPR',
           '--coalesce-densest-as-needed','--drop-densest-as-needed'] },
  { group: 'boundaries', slug: 'desa',      input: 'boundaries/desa.json',
    args: ['-Z7','-z15','-y','WADMKD','-y','WADMKC','-y','WADMKK','-y','WADMPR',
           '--drop-densest-as-needed','--coalesce-densest-as-needed'] },

  // ── Batas Laut UNCLOS (small but frequently redrawn) ───────
  { group: 'laut', slug: 'teritorial',      input: 'boundaries/laut/teritorial.json',
    args: ['-Z0','-z10'] },
  { group: 'laut', slug: 'zona-tambahan',   input: 'boundaries/laut/zona-tambahan.json',
    args: ['-Z0','-z10'] },
  { group: 'laut', slug: 'landas-kontinen', input: 'boundaries/laut/landas-kontinen.json',
    args: ['-Z0','-z10'] },
  { group: 'laut', slug: 'zee',             input: 'boundaries/laut/zee.json',
    args: ['-Z0','-z10'] },

  // ── Keagamaan ───────────────────────────────────────────────
  { group: 'keuskupan', slug: 'keuskupan', input: 'keuskupan/keuskupan.geojson',
    args: ['-Z2','-z12','--coalesce-densest-as-needed'] },

  // ── Tektonik (PB2002) ───────────────────────────────────────
  { group: 'tektonik', slug: 'plates',     input: 'tectonicplates/plates.json',
    args: ['-Z0','-z10','--coalesce-densest-as-needed'] },
  { group: 'tektonik', slug: 'boundaries', input: 'tectonicplates/boundaries.json',
    args: ['-Z0','-z10'] },
  { group: 'tektonik', slug: 'orogens',    input: 'tectonicplates/orogens.json',
    args: ['-Z0','-z10','--coalesce-densest-as-needed'] },

  // ── Vulkano (Smithsonian GVP Holocene) ──────────────────────
  { group: 'veins', slug: 'volcanoes', input: 'veins/volcanoes.json',
    args: ['-Z0','-z10','-r1'] },

  // ── SDA · heavy (> 2 MB) ────────────────────────────────────
  // Polygons unless noted. Zoom tuning targets Indonesia-scale usage:
  // Z2 = whole archipelago fits, z12 = kabupaten-detail.
  { group: 'sda', slug: 'mangrove',           input: 'sda/mangrove.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'lahan-kritis',       input: 'sda/lahan-kritis.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'krb-gempa',          input: 'sda/krb-gempa.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'rawan-banjir',       input: 'sda/rawan-banjir.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'perikanan-budidaya', input: 'sda/perikanan-budidaya.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'geologi',            input: 'sda/geologi.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'geostruktur',        input: 'sda/geostruktur.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'ekosistem-gambut',   input: 'sda/ekosistem-gambut.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'zonasi-konservasi',  input: 'sda/zonasi-konservasi.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'neraca-air',         input: 'sda/neraca-air.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'gerakan-tanah',      input: 'sda/gerakan-tanah.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'karst',              input: 'sda/karst.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'likuifaksi',         input: 'sda/likuifaksi.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'lahan-garam',        input: 'sda/lahan-garam.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  { group: 'sda', slug: 'karhutla',           input: 'sda/karhutla.json',
    args: ['-Z2','-z12','--drop-densest-as-needed','--coalesce-densest-as-needed'] },
  // Points — keep every one (-r1) so seismicity dots don't thin out.
  { group: 'sda', slug: 'seismisitas',        input: 'sda/seismisitas.json',
    args: ['-Z0','-z12','-r1'] },

  // ── Sarpras · heavy (only large ones; rest stay as GeoJSON) ─
  { group: 'sarpras', slug: 'jalan-nasional-non-tol', input: 'sarpras/jalan-nasional-non-tol.json',
    args: ['-Z2','-z12','--drop-densest-as-needed'] },
]

// ── CLI parsing ──────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { force: false, runner: null, only: null, group: null, list: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--force') opts.force = true
    else if (a === '--list') opts.list = true
    else if (a === '--runner') opts.runner = argv[++i]
    else if (a === '--only') opts.only = argv[++i].split(',').map(s => s.trim())
    else if (a === '--group') opts.group = argv[++i]
    else if (a === '-h' || a === '--help') { printHelp(); process.exit(0) }
    else { console.error(`unknown flag: ${a}`); printHelp(); process.exit(2) }
  }
  return opts
}

function printHelp() {
  console.log(`Usage: node scripts/build-pmtiles.mjs [options]

Options:
  --force            rebuild even if the .pmtiles already exists
  --group <name>     restrict to one group (boundaries|laut|sda|sarpras|keuskupan|tektonik|veins)
  --only <slugs>     comma-separated slugs (e.g. --only desa,mangrove)
  --runner <name>    force runner (native|wsl|docker); default: auto-detect
  --list             show planned builds and exit
`)
}

// ── Runner detection ─────────────────────────────────────────────
function tryRun(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'ignore', shell: false })
  return r.status === 0
}

function detectRunner(force) {
  if (force) return force
  if (tryRun('tippecanoe', ['--version'])) return 'native'
  if (process.platform === 'win32' && tryRun('wsl', ['tippecanoe', '--version'])) return 'wsl'
  if (tryRun('docker', ['--version'])) return 'docker'
  return null
}

// Convert a Windows path (C:\foo\bar) to a docker-friendly mount path.
// Docker Desktop for Windows accepts both C:\foo and /c/foo — the latter is
// more portable across shells so we normalise to it.
function toDockerPath(p) {
  if (process.platform !== 'win32') return p
  const m = /^([A-Za-z]):\\(.*)$/.exec(p)
  if (!m) return p.replace(/\\/g, '/')
  return `/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`
}

// Build the argv to invoke tippecanoe with given per-dataset args.
// Paths in `args` (input/output) must already be absolute host paths;
// docker mode rewrites them to /data-relative paths.
function invokeArgs(runner, tippecanoeArgs) {
  if (runner === 'native') return { cmd: 'tippecanoe', args: tippecanoeArgs }
  if (runner === 'wsl')    return { cmd: 'wsl', args: ['tippecanoe', ...tippecanoeArgs] }
  if (runner === 'docker') {
    const mount = `${toDockerPath(ROOT)}:/data`
    // Rewrite absolute paths that fall under ROOT to /data/…
    const rewritten = tippecanoeArgs.map(a => {
      if (typeof a !== 'string') return a
      if (a.startsWith(ROOT)) return '/data/' + a.slice(ROOT.length + 1).replace(/\\/g, '/')
      return a
    })
    return {
      cmd: 'docker',
      args: ['run','--rm','-v', mount, '-w','/data',
             'ghcr.io/felt/tippecanoe:latest',
             'tippecanoe', ...rewritten],
    }
  }
  throw new Error(`no runner: ${runner}`)
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv.slice(2))

  let planned = DATASETS
  if (opts.group) planned = planned.filter(d => d.group === opts.group)
  if (opts.only)  planned = planned.filter(d => opts.only.includes(d.slug))

  if (planned.length === 0) {
    console.error('no datasets matched. use --list to see options.')
    process.exit(1)
  }

  // Sanity-check inputs exist so we fail fast, not mid-build.
  const missingInputs = planned
    .map(d => ({ d, inPath: join(PUBLIC_DIR, d.input) }))
    .filter(x => !existsSync(x.inPath))
  if (missingInputs.length) {
    console.error('missing input files:')
    for (const { d, inPath } of missingInputs) console.error(`  ${d.slug}  ← ${inPath}`)
    console.error('run the refresh-*.py / .mjs scripts under scripts/ first.')
    process.exit(1)
  }

  if (opts.list) {
    for (const d of planned) {
      const inPath  = join(PUBLIC_DIR, d.input)
      const outPath = join(OUT_ROOT, d.group, `${d.slug}.pmtiles`)
      const size = statSync(inPath).size
      const exists = existsSync(outPath) ? '✓' : ' '
      console.log(`[${exists}] ${d.group}/${d.slug}  (${(size/1024/1024).toFixed(1)} MB)`)
    }
    return
  }

  const runner = detectRunner(opts.runner)
  if (!runner) {
    console.error(`
tippecanoe not available. install one of:
  1. native   — brew install tippecanoe  |  apt install tippecanoe
  2. WSL      — inside WSL:  sudo apt install tippecanoe
  3. Docker   — Docker Desktop, then re-run (image auto-pulled)

Or pass --runner <native|wsl|docker> to bypass detection.`)
    process.exit(1)
  }
  console.log(`runner: ${runner}`)

  let built = 0, skipped = 0, failed = 0
  for (const d of planned) {
    const inPath  = join(PUBLIC_DIR, d.input)
    const outDir  = join(OUT_ROOT, d.group)
    const outPath = join(outDir, `${d.slug}.pmtiles`)

    if (!opts.force && existsSync(outPath)) {
      console.log(`skip  ${d.group}/${d.slug}  (exists; --force to rebuild)`)
      skipped++
      continue
    }

    mkdirSync(outDir, { recursive: true })

    const tArgs = [
      '--force',                       // overwrite existing output
      '-o', outPath,
      '-l', d.slug,                    // layer name inside archive
      ...d.args,
      inPath,
    ]
    const { cmd, args } = invokeArgs(runner, tArgs)
    console.log(`\n>> ${d.group}/${d.slug}`)
    console.log(`   ${cmd} ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`)
    const r = spawnSync(cmd, args, { stdio: 'inherit' })
    if (r.status === 0) { built++; }
    else { failed++; console.error(`   FAILED (exit ${r.status})`) }
  }

  console.log(`\ndone: built=${built} skipped=${skipped} failed=${failed}`)
  if (failed) process.exit(1)
}

main()
