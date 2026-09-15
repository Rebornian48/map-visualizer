// SeaRates Indonesian sea ports — snapshot at public/searates/ports.json.
// Feature flags on each port (is_seaport / is_river / is_rail_terminal /
// is_icd) drive both the color bucket and whether we render the port at
// all (skip pure ICD-only entries — those don't belong on an anchor map).

const BASE = import.meta.env.BASE_URL || '/'

function portColor(features = {}) {
  if (features.is_seaport && features.is_rail_terminal) return '#0277bd' // intermodal
  if (features.is_seaport) return '#0288d1'                              // pure sea
  if (features.is_river || features.is_river_port) return '#00838f'      // river
  if (features.is_icd) return '#6a1b9a'                                  // ICD only
  return '#546e7a'
}

function portRadius(teu) {
  const t = teu || 0
  if (t >= 3_000_000) return 10
  if (t >= 1_000_000) return 8
  if (t >= 200_000)   return 6
  return 4
}

function portsToFC(items) {
  const features = []
  for (const p of items || []) {
    if (p.features && p.features.is_seaport === false) continue
    const loc = p.location
    if (!Array.isArray(loc) || loc.length < 2) continue
    const [lat, lng] = loc
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        name: p.name || '',
        locode: p.locode || '',
        color: portColor(p.features),
        radius: portRadius(p.teu),
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export const SEARATES_ENTRY = {
  id: 'searates-ports',
  label: 'Pelabuhan Indonesia (SeaRates)',
  category: 'Maritim · SeaRates',
  color: '#0288d1',
  sourceId: 'searates-ports',
  dataLoader: async () => {
    const r = await fetch(`${BASE}searates/ports.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return portsToFC((await r.json()).items)
  },
  layers: () => [
    {
      id: 'searates-ports-circle',
      type: 'circle',
      source: 'searates-ports',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.4,
        'circle-opacity': 0.9,
      },
    },
  ],
  hover: (map, setHover) => {
    map.on('mousemove', 'searates-ports-circle', (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      setHover(`${f.properties.name}${f.properties.locode ? ' (' + f.properties.locode + ')' : ''}`)
    })
    map.on('mouseleave', 'searates-ports-circle', () => {
      map.getCanvas().style.cursor = ''
      setHover(null)
    })
  },
}
