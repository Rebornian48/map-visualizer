// OpenAIP Indonesia snapshots — 286 aerodromes + 8 airspace polygons.
// Same JSON shape the Leaflet side consumes (public/openaip/*.json),
// converted here to GeoJSON with the type-color and a size hint for
// international aerodromes so they read as the "big" ones on the map.

const BASE = import.meta.env.BASE_URL || '/'

// Airport type enum → color. Kept in sync with src/openaip.js.
const AIRPORT_COLOR = {
  0: '#1e88e5', 1: '#7cb342', 2: '#1e88e5', 3: '#1565c0',
  4: '#d81b60', 5: '#c62828', 6: '#8e24aa', 7: '#ec407a',
  8: '#757575', 9: '#ad1457', 10: '#00acc1', 11: '#7cb342',
  12: '#26a69a', 13: '#00acc1', 14: '#a1887f', 15: '#9e9d24',
  16: '#6d4c41',
}
// Airport type → radius multiplier bucket. Bigger for international.
const AIRPORT_SIZE = {
  3: 8, 9: 8,           // international
  0: 6, 2: 6, 5: 6,     // civil / military
  // default 5 below
}

function airportsToFC(items) {
  const features = []
  for (const a of items || []) {
    const c = a.geometry?.coordinates
    if (!Array.isArray(c) || c.length < 2) continue
    if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: c },
      properties: {
        name: a.name || '',
        icao: a.icaoCode || '',
        iata: a.iataCode || '',
        type: a.type ?? -1,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function airportColorExpr() {
  const args = ['match', ['get', 'type']]
  for (const [k, v] of Object.entries(AIRPORT_COLOR)) args.push(Number(k), v)
  args.push('#607d8b')
  return args
}

function airportSizeExpr() {
  const args = ['match', ['get', 'type']]
  for (const [k, v] of Object.entries(AIRPORT_SIZE)) args.push(Number(k), v)
  args.push(5)
  return args
}

export const OPENAIP_AIRPORTS_ENTRY = {
  id: 'openaip-airports',
  label: 'Bandara (OpenAIP)',
  category: 'Aeronautika · OpenAIP',
  color: '#1e88e5',
  sourceId: 'openaip-airports',
  dataLoader: async () => {
    const r = await fetch(`${BASE}openaip/airports.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    return airportsToFC(j.items)
  },
  layers: () => [
    {
      id: 'openaip-airports-circle',
      type: 'circle',
      source: 'openaip-airports',
      paint: {
        'circle-radius': airportSizeExpr(),
        'circle-color': airportColorExpr(),
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2,
        'circle-opacity': 0.9,
      },
    },
  ],
  hover: (map, setHover) => {
    map.on('mousemove', 'openaip-airports-circle', (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      const codes = [f.properties.icao, f.properties.iata].filter(Boolean).join(' · ')
      setHover(`${f.properties.name}${codes ? ' — ' + codes : ''}`)
    })
    map.on('mouseleave', 'openaip-airports-circle', () => {
      map.getCanvas().style.cursor = ''
      setHover(null)
    })
  },
}

// Airspace type → color, aligned with src/openaip.js.
const AIRSPACE_COLOR = {
  0: '#607d8b', 1: '#e53935', 2: '#fdd835', 3: '#b71c1c',
  4: '#d84315', 5: '#00acc1', 6: '#00838f', 7: '#fb8c00',
  8: '#8e24aa', 9: '#6a1b9a', 10: '#1e88e5', 11: '#3949ab',
  12: '#c62828', 13: '#e65100', 14: '#bf360c', 15: '#5d4037',
  16: '#5d4037', 17: '#fbc02d', 18: '#f9a825', 19: '#00acc1',
  20: '#ec407a', 21: '#7cb342', 22: '#8e24aa', 23: '#43a047',
  24: '#66bb6a', 25: '#5e35b1', 26: '#f57c00', 27: '#0277bd',
  28: '#c0ca33', 29: '#78909c', 30: '#5c6bc0',
}

function airspacesToFC(items) {
  const features = []
  for (const a of items || []) {
    if (!a.geometry) continue
    features.push({
      type: 'Feature',
      geometry: a.geometry, // Polygon or MultiPolygon — MapLibre handles both
      properties: {
        name: a.name || '',
        type: a.type ?? -1,
        // FIR/UIR fills too aggressively — mark it so the paint dims it.
        isFir: (a.type === 10 || a.type === 11) ? 1 : 0,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function airspaceColorExpr() {
  const args = ['match', ['get', 'type']]
  for (const [k, v] of Object.entries(AIRSPACE_COLOR)) args.push(Number(k), v)
  args.push('#607d8b')
  return args
}

export const OPENAIP_AIRSPACES_ENTRY = {
  id: 'openaip-airspaces',
  label: 'FIR & Airspace (OpenAIP)',
  category: 'Aeronautika · OpenAIP',
  color: '#fb8c00',
  sourceId: 'openaip-airspaces',
  dataLoader: async () => {
    const r = await fetch(`${BASE}openaip/airspaces.json`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    return airspacesToFC(j.items)
  },
  layers: () => [
    {
      id: 'openaip-airspaces-fill',
      type: 'fill',
      source: 'openaip-airspaces',
      paint: {
        'fill-color': airspaceColorExpr(),
        'fill-opacity': [
          'case',
          ['==', ['get', 'isFir'], 1], 0.04,
          0.22,
        ],
      },
    },
    {
      id: 'openaip-airspaces-line',
      type: 'line',
      source: 'openaip-airspaces',
      paint: {
        'line-color': airspaceColorExpr(),
        'line-width': [
          'case',
          ['==', ['get', 'isFir'], 1], 2,
          1.4,
        ],
        'line-opacity': 0.85,
      },
    },
  ],
  hover: (map, setHover) => {
    for (const layerId of ['openaip-airspaces-fill', 'openaip-airspaces-line']) {
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        setHover(f.properties.name || '')
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    }
  },
}
