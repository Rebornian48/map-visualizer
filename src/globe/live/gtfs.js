// GTFS Transjakarta (BRT + Mikrotrans) — routes.txt/trips.txt/shapes.txt
// /stops.txt inside a zip. JSZip is imported dynamically so the ~100 KB
// library only downloads when the user actually enables this layer.

function gtfsUrl() {
  if (import.meta.env.DEV) return '/otsum-cdn/transport-data/file_gtfs.zip'
  return 'https://rebornian48.my.id/otsum/proxy.php?f=file_gtfs.zip'
}

function normalizeColor(c) {
  if (!c) return null
  const s = String(c).trim()
  if (!s) return null
  return s.startsWith('#') ? s : `#${s}`
}

function parseCsvLine(line) {
  const chars = Array.from(line)
  const out = []
  let cur = '', inQ = false, i = 0
  while (i < chars.length) {
    const c = chars[i]
    if (inQ) {
      if (c === '"') {
        if (chars[i + 1] === '"') { cur += '"'; i++ }
        else inQ = false
      } else cur += c
    } else if (c === ',') { out.push(cur); cur = '' }
    else if (c === '"') inQ = true
    else cur += c
    i++
  }
  out.push(cur)
  return out
}

function csvToObjects(text) {
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return { idx: {}, rows: [] }
  const header = parseCsvLine(lines[0])
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    rows.push(parseCsvLine(lines[i]))
  }
  return { idx, rows }
}

async function readZipEntry(zip, name) {
  const f = zip.file(name)
  return f ? f.async('string') : ''
}

function buildRouteIndex(routesTxt) {
  const routes = csvToObjects(routesTxt)
  const routeById = new Map()
  for (const r of routes.rows) {
    routeById.set(r[routes.idx.route_id], {
      short: r[routes.idx.route_short_name] || '',
      long:  r[routes.idx.route_long_name]  || '',
      color: normalizeColor(r[routes.idx.route_color]) || '#3388ff',
    })
  }
  return routeById
}

function buildShapeToRoute(tripsTxt) {
  const trips = csvToObjects(tripsTxt)
  const shapeToRoute = new Map()
  for (const t of trips.rows) {
    const sid = t[trips.idx.shape_id]
    if (!sid || shapeToRoute.has(sid)) continue
    shapeToRoute.set(sid, t[trips.idx.route_id])
  }
  return shapeToRoute
}

function buildShapesById(shapesTxt) {
  const shapes = csvToObjects(shapesTxt)
  const sIdx = shapes.idx
  const shapesById = new Map()
  for (const r of shapes.rows) {
    const sid = r[sIdx.shape_id]
    const seq = +r[sIdx.shape_pt_sequence]
    const lat = +r[sIdx.shape_pt_lat]
    const lon = +r[sIdx.shape_pt_lon]
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (!shapesById.has(sid)) shapesById.set(sid, [])
    shapesById.get(sid).push({ seq, lat, lon })
  }
  return shapesById
}

async function loadGtfsFC() {
  const r = await fetch(gtfsUrl())
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const buf = await r.arrayBuffer()
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(buf)
  const [routesTxt, tripsTxt, shapesTxt, stopsTxt] = await Promise.all([
    readZipEntry(zip, 'routes.txt'),
    readZipEntry(zip, 'trips.txt'),
    readZipEntry(zip, 'shapes.txt'),
    readZipEntry(zip, 'stops.txt'),
  ])
  const routeById = buildRouteIndex(routesTxt)
  const shapeToRoute = buildShapeToRoute(tripsTxt)
  const shapesById = buildShapesById(shapesTxt)

  const routeFeatures = []
  for (const [sid, pts] of shapesById) {
    pts.sort((a, b) => a.seq - b.seq)
    if (pts.length < 2) continue
    const routeId = shapeToRoute.get(sid)
    const info = routeById.get(routeId) || {}
    routeFeatures.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: pts.map(p => [p.lon, p.lat]) },
      properties: {
        name: info.short || routeId || sid,
        long: info.long || '',
        color: info.color || '#3388ff',
      },
    })
  }
  const stops = csvToObjects(stopsTxt)
  const stopFeatures = []
  for (const r of stops.rows) {
    const lat = +r[stops.idx.stop_lat]
    const lon = +r[stops.idx.stop_lon]
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    stopFeatures.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { name: r[stops.idx.stop_name] || '' },
    })
  }
  return {
    routes: { type: 'FeatureCollection', features: routeFeatures },
    stops:  { type: 'FeatureCollection', features: stopFeatures },
  }
}

export const GTFS_TJ_ENTRY = {
  id: 'gtfs-transjakarta',
  label: 'Transjakarta (GTFS)',
  category: 'Bus (GTFS)',
  color: '#c62828',
  customMount: async (map, { setStatus }) => {
    setStatus('Memuat GTFS Transjakarta…')
    const { routes, stops } = await loadGtfsFC()
    const routesSrc = 'gtfs-tj-routes'
    const stopsSrc  = 'gtfs-tj-stops'
    if (!map.getSource(routesSrc)) map.addSource(routesSrc, { type: 'geojson', data: routes })
    if (!map.getSource(stopsSrc))  map.addSource(stopsSrc,  { type: 'geojson', data: stops  })
    const routeLine = 'gtfs-tj-line'
    const stopCircle = 'gtfs-tj-stop'
    if (!map.getLayer(routeLine)) {
      map.addLayer({
        id: routeLine, type: 'line', source: routesSrc,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#c62828'],
          'line-width': 3,
          'line-opacity': 0.85,
        },
      })
    }
    if (!map.getLayer(stopCircle)) {
      map.addLayer({
        id: stopCircle, type: 'circle', source: stopsSrc,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, 5],
          'circle-color': '#00ccaa',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
        minzoom: 10, // stops mostly noise below city zoom
      })
    }
    setStatus('')
    return () => {
      for (const lid of [routeLine, stopCircle]) if (map.getLayer(lid)) map.removeLayer(lid)
    }
  },
}
