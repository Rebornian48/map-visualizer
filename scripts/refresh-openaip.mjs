#!/usr/bin/env node
// Refresh OpenAIP snapshots for Indonesia — airports + airspaces.
// Fields are trimmed to what the map overlay needs, to keep bundle small.
//
// Usage:
//   OPENAIP_KEY=<your-key> node scripts/refresh-openaip.mjs
//
// Snapshots land in public/openaip/{airports,airspaces}.json and are
// vendored in the build. Refresh every AIRAC cycle (~28 days) or when
// OpenAIP contributors add Indonesia data.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = process.env.OPENAIP_KEY
if (!KEY) {
  console.error('Missing OPENAIP_KEY env var')
  process.exit(1)
}

const BASE = 'https://api.core.openaip.net/api'
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'openaip')

async function fetchAll(path) {
  const url = `${BASE}/${path}?country=ID&limit=1000&apiKey=${KEY}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`)
  const j = await r.json()
  if (j.totalPages > 1) {
    console.warn(`WARN ${path}: totalPages=${j.totalPages}, only page 1 fetched (add paging if this happens)`)
  }
  return j.items || []
}

const trimAirport = (a) => ({
  name: a.name,
  icaoCode: a.icaoCode,
  iataCode: a.iataCode,
  type: a.type,
  trafficType: a.trafficType,
  ppr: a.ppr,
  private: a.private,
  skydiveActivity: a.skydiveActivity,
  elevation: a.elevation?.value,
  elevationUnit: a.elevation?.unit,
  geometry: a.geometry,
  runways: (a.runways || []).filter(r => r.mainRunway).map(r => ({
    designator: r.designator,
    length: r.dimension?.length?.value,
    width: r.dimension?.width?.value,
    surface: r.surface?.mainComposite,
  })),
  frequencies: (a.frequencies || []).filter(f => f.primary).map(f => ({
    name: f.name,
    value: f.value,
    type: f.type,
  })),
})

const trimAirspace = (a) => ({
  name: a.name,
  type: a.type,
  icaoClass: a.icaoClass,
  activity: a.activity,
  upperLimit: a.upperLimit,
  lowerLimit: a.lowerLimit,
  geometry: a.geometry,
})

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const [airports, airspaces] = await Promise.all([
    fetchAll('airports'),
    fetchAll('airspaces'),
  ])

  const airportsOut = {
    updated: new Date().toISOString(),
    source: 'OpenAIP (CC BY-NC 4.0)',
    count: airports.length,
    items: airports.map(trimAirport),
  }
  const airspacesOut = {
    updated: new Date().toISOString(),
    source: 'OpenAIP (CC BY-NC 4.0)',
    count: airspaces.length,
    items: airspaces.map(trimAirspace),
  }

  await writeFile(join(OUT_DIR, 'airports.json'), JSON.stringify(airportsOut))
  await writeFile(join(OUT_DIR, 'airspaces.json'), JSON.stringify(airspacesOut))

  console.log(`airports:  ${airports.length} → public/openaip/airports.json`)
  console.log(`airspaces: ${airspaces.length} → public/openaip/airspaces.json`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
