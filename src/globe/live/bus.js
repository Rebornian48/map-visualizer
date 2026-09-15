// Bus JSON networks — 6 sources. Each JSON has:
//   { routes: [{ id, shape, color, shortName, fullName }], stops: {...} }
// where shape is [[lng,lat], ...]. Convert to two GeoJSON layers per
// network: a MultiLineString `routes` FC (color per route) and a Point
// FC for stops.

function busUrl(filename) {
  if (import.meta.env.DEV) return `/otsum-cdn/transport-data/${filename}`
  return `https://rebornian48.my.id/otsum/proxy.php?f=${encodeURIComponent(filename)}`
}

const NETWORKS = [
  { id: 'transsemarang',   label: 'Trans Semarang',           file: 'transsemarang.json' },
  { id: 'metrojabartrans', label: 'Metro Trans Jabar',        file: 'metrojabartrans.json' },
  { id: 'buslistrikmedan', label: 'Bus Listrik Medan',        file: 'buslistrikmedan.json' },
  { id: 'transkotaradja',  label: 'Trans Koetaradja',         file: 'transkotaradja.json' },
  { id: 'transpakuan',     label: 'Transpakuan (Bogor)',      file: 'transpakuan.json' },
  { id: 'mitradarat',      label: 'Mitra Darat (multi-kota)', file: 'mitradarat.json' },
]

function normalizeColor(c) {
  if (!c) return '#ff3366'
  const s = String(c).trim()
  return s.startsWith('#') ? s : `#${s}`
}

function busToFC(data) {
  const routes = []
  for (const r of data.routes || []) {
    const shape = r.shape || []
    if (shape.length < 2) continue
    routes.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: shape },
      properties: {
        name: r.shortName || r.fullName || r.id || 'Route',
        long: r.fullName || '',
        color: normalizeColor(r.color),
      },
    })
  }
  const stops = []
  for (const s of Object.values(data.stops || {})) {
    if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue
    stops.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { name: s.name || '' },
    })
  }
  return {
    routes: { type: 'FeatureCollection', features: routes },
    stops:  { type: 'FeatureCollection', features: stops },
  }
}

function makeBusEntry({ id, label, file }) {
  const sourceRoutes = `bus-${id}-routes`
  const sourceStops  = `bus-${id}-stops`
  return {
    id: `bus-${id}`,
    label,
    category: 'Bus (JSON)',
    color: '#ff3366',
    // We publish two sources via customMount so a single toggle covers routes+stops.
    customMount: async (map, { setStatus }) => {
      setStatus(`Memuat ${label}…`)
      const r = await fetch(busUrl(file))
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const { routes, stops } = busToFC(await r.json())
      if (!map.getSource(sourceRoutes)) map.addSource(sourceRoutes, { type: 'geojson', data: routes })
      if (!map.getSource(sourceStops))  map.addSource(sourceStops,  { type: 'geojson', data: stops  })
      const routeLine = `bus-${id}-line`
      const stopCircle = `bus-${id}-stop`
      if (!map.getLayer(routeLine)) {
        map.addLayer({
          id: routeLine, type: 'line', source: sourceRoutes,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#ff3366'],
            'line-width': 3,
            'line-opacity': 0.85,
          },
        })
      }
      if (!map.getLayer(stopCircle)) {
        map.addLayer({
          id: stopCircle, type: 'circle', source: sourceStops,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 13, 5],
            'circle-color': '#00ccaa',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        })
      }
      setStatus('')
      return () => {
        for (const lid of [routeLine, stopCircle]) if (map.getLayer(lid)) map.removeLayer(lid)
      }
    },
  }
}

export const BUS_ENTRIES = NETWORKS.map(makeBusEntry)
