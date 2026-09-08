#!/usr/bin/env node
// Refresh SeaRates World Sea Ports snapshot for Indonesia.
// Trims heavy fields (properties, boundaries, statistics) — the map
// overlay only needs name / locode / location / features / teu, so the
// vendored JSON stays under 100 KB even at full national coverage.
//
// Usage:
//   SEARATES_KEY=<your-key> node scripts/refresh-searates-ports.mjs
//   SEARATES_KEY=<your-key> node scripts/refresh-searates-ports.mjs --include-rivers
//
// API spec:  https://docs.searates.com/spec/world-sea-ports-v1-openapi.json
// Sign-up:   https://www.searates.com/account/api  (api_key in query string)

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.SEARATES_KEY
if (!KEY) {
  console.error('Missing SEARATES_KEY env var. Grab a key at https://www.searates.com/account/api')
  process.exit(1)
}

const INCLUDE_RIVERS = process.argv.includes('--include-rivers')
const COUNTRY = 'ID'
const BASE = 'https://geocoding.searates.com'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'searates')

async function listByCountry(cc, includeRivers) {
  const url = `${BASE}/geo/world-sea-ports/list-by-country?api_key=${encodeURIComponent(KEY)}`
  const body = { country_code: cc, is_river: includeRivers }
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status} for list-by-country: ${await r.text()}`)
  return r.json()
}

// Trim to only what src/searates.js needs. The lookup endpoint returns a
// huge "properties" array (~60 rows) and boundary polylines; we skip both
// to keep the vendored file small. Re-fetch per port via lookup only if
// we ever start rendering harbour polygons.
const trimPort = (p) => ({
  id: p.id,
  name: p.name,
  locode: p.locode,
  iata: p.iata,
  location: p.location,
  features: p.features,
})

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const items = await listByCountry(COUNTRY, INCLUDE_RIVERS)
  if (!Array.isArray(items)) throw new Error(`Unexpected response: ${JSON.stringify(items).slice(0, 200)}`)

  const out = {
    updated: new Date().toISOString(),
    source: 'SeaRates World Sea Ports API (© SeaRates by DP World)',
    country: COUNTRY,
    includeRivers: INCLUDE_RIVERS,
    count: items.length,
    items: items.map(trimPort),
  }

  await writeFile(join(OUT_DIR, 'ports.json'), JSON.stringify(out))
  console.log(`ports (${COUNTRY}): ${items.length} → public/searates/ports.json`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
