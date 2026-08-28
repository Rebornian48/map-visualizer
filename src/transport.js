import L from "leaflet";
import JSZip from "jszip";

function srcUrl(filename) {
  if (import.meta.env.DEV) return `/otsum-cdn/transport-data/${filename}`;
  return `https://rebornian48.my.id/otsum/proxy.php?f=${encodeURIComponent(filename)}`
}

export const TRANSPORT_SOURCES = [
  { key: 'transsemarang',    label: 'Trans Semarang',            group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('transsemarang.json') },
  { key: 'metrojabartrans',  label: 'Metro Trans Jabar',         group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('metrojabartrans.json') },
  { key: 'buslistrikmedan',  label: 'Bus Listrik Medan',         group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('buslistrikmedan.json') },
  { key: 'transkotaradja',   label: 'Trans Koetaradja',          group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('transkotaradja.json') },
  { key: 'transpakuan',      label: 'Transpakuan (Bogor)',       group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('transpakuan.json') },
  { key: 'mitradarat',       label: 'Mitra Darat (multi-kota)',  group: 'Bus (JSON)', kind: 'bus',           url: srcUrl('mitradarat.json') },
  { key: 'transjakarta',     label: 'Transjakarta (GTFS)',       group: 'Bus (GTFS)', kind: 'gtfs',          url: srcUrl('file_gtfs.zip') },
  { key: 'krl_lines',        label: 'KRL — garis rel',           group: 'Rel',        kind: 'railLines',     url: srcUrl('krl_lines.geojson') },
  { key: 'lrt_mrt_lines',    label: 'LRT & MRT — garis rel',     group: 'Rel',        kind: 'railLines',     url: srcUrl('lrt_mrt_lines.geojson') },
  { key: 'rails_stations',   label: 'Stasiun KRL/LRT/MRT',       group: 'Rel',        kind: 'railStations',  url: srcUrl('rails.kml') },
];

const RAW_CACHE = new Map();

async function fetchRaw(key, url, asBuffer = false) {
  if (RAW_CACHE.has(key)) return RAW_CACHE.get(key);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = asBuffer ? await r.arrayBuffer() : await r.text();
  RAW_CACHE.set(key, data);
  return data;
}

function normalizeColor(c) {
  if (!c) return null;
  const s = String(c).trim();
  if (!s) return null;
  return s.startsWith("#") ? s : `#${s}`;
}

const escapeHtml = (s) => {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
};

function stopCircle(lat, lon, name, color) {
  return L.circleMarker([lat, lon], {
    radius: 2.5,
    fillColor: color || "#00ccaa",
    fillOpacity: 0.85,
    color: "#0b0b0b",
    weight: 0.4,
    opacity: 0.6,
    pane: "markerPane",
  }).bindTooltip(escapeHtml(name || ""), { direction: "top", opacity: 0.9 });
}

function routePolyline(latlngs, color, tooltip) {
  const pl = L.polyline(latlngs, {
    color: color || "#3388ff",
    weight: 3,
    opacity: 0.85,
    smoothFactor: 1.2,
  });
  if (tooltip) pl.bindTooltip(tooltip, { sticky: true, direction: 'top', opacity: 0.95 })
  return pl;
}

function pickRouteName(route) {
  if (route.shortName) return route.shortName
  if (route.fullName) return route.fullName
  return route.id
}

function busRouteTip(route) {
  const head = `<strong>${escapeHtml(pickRouteName(route))}</strong>`
  if (!route.fullName) return head
  return head + `<br/><span style="opacity:.75">${escapeHtml(route.fullName)}</span>`
}

function addBusRoute(route, routesSub) {
  const shape = route.shape || []
  if (shape.length < 2) return
  const latlngs = shape.map(([lng, lat]) => [lat, lng])
  const color = normalizeColor(route.color) || '#ff3366'
  routePolyline(latlngs, color, busRouteTip(route)).addTo(routesSub)
}

function addBusStop(s, stopsSub) {
  if (typeof s.lat !== 'number') return
  if (typeof s.lng !== 'number') return
  stopCircle(s.lat, s.lng, s.name, '#00ccaa').addTo(stopsSub)
}

async function buildBus(key, url) {
  const text = await fetchRaw(key, url)
  const data = JSON.parse(text)
  const group = L.layerGroup()
  const routesSub = L.layerGroup()
  const stopsSub = L.layerGroup()

  for (const route of data.routes || []) addBusRoute(route, routesSub)
  for (const s of Object.values(data.stops || {})) addBusStop(s, stopsSub)

  routesSub.addTo(group)
  stopsSub.addTo(group)
  return group
}

const RAIL_PALETTE = ['#3388ff', '#e93d46', '#00a651', '#8b5a2b', '#ff69b4', '#9c27b0', '#ff9800', '#43a2c5']

function pickRailName(props) {
  if (props.name) return props.name
  if (props.ref) return props.ref
  if (props.slug) return props.slug
  return 'rel'
}

function railTip(props) {
  const head = `<strong>${escapeHtml(pickRailName(props))}</strong>`
  if (!props.network) return head
  return head + `<br/><span style="opacity:.75">${escapeHtml(props.network)}</span>`
}

function railCoordSets(geom) {
  if (!geom) return []
  if (geom.type === 'MultiLineString') return geom.coordinates
  if (geom.type === 'LineString') return [geom.coordinates]
  return []
}

function railColor(props, idx) {
  const explicit = normalizeColor(props.colour_hex || props.colour)
  if (explicit) return explicit
  return RAIL_PALETTE.at(idx % RAIL_PALETTE.length)
}

function addRailFeature(feat, idx, group) {
  const props = feat.properties || {}
  const color = railColor(props, idx)
  const tip = railTip(props)
  for (const line of railCoordSets(feat.geometry)) {
    if (line.length < 2) continue
    routePolyline(line.map(([lng, lat]) => [lat, lng]), color, tip).addTo(group)
  }
}

async function buildRailLines(key, url) {
  const text = await fetchRaw(key, url)
  const geo = JSON.parse(text)
  const group = L.layerGroup()
  let idx = 0
  for (const feat of geo.features || []) addRailFeature(feat, idx++, group)
  return group
}

function parseKmlPoints(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const placemarks = doc.getElementsByTagName('Placemark')
  const out = []
  for (const p of placemarks) {
    const nameEl = p.getElementsByTagName('name')[0]
    const name = nameEl ? nameEl.textContent.trim() : ''
    const pt = p.getElementsByTagName('Point')[0]
    if (!pt) continue
    const coordsEl = pt.getElementsByTagName('coordinates')[0]
    if (!coordsEl) continue
    const parts = coordsEl.textContent.trim().split(',')
    const lng = parseFloat(parts[0]), lat = parseFloat(parts[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ name, lat, lng })
  }
  return out
}

async function buildRailStations(key, url) {
  const text = await fetchRaw(key, url)
  const pts = parseKmlPoints(text)
  const group = L.layerGroup()
  for (const p of pts) {
    L.circleMarker([p.lat, p.lng], {
      radius: 3.5,
      fillColor: '#ffcc00',
      fillOpacity: 0.95,
      color: '#333',
      weight: 0.6,
      opacity: 0.8,
    }).bindTooltip(`<strong>${escapeHtml(p.name)}</strong>`, { direction: 'top', opacity: 0.95 }).addTo(group)
  }
  return group
}

function parseCsvLine(line) {
  const chars = Array.from(line)
  const out = []
  let cur = '', inQ = false, i = 0
  while (i < chars.length) {
    const c = chars.at(i)
    if (inQ) {
      if (c === '"') {
        if (chars.at(i + 1) === '"') { cur += '"'; i++ }
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

function parseCsv(text) {
  const rawLines = text.split(/\r?\n/)
  if (rawLines.length === 0) return { header: [], rows: [] }
  const header = parseCsvLine(rawLines[0])
  const rows = []
  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines.at(i)
    if (!line) continue
    rows.push(parseCsvLine(line))
  }
  return { header, rows }
}

function csvToObjects(text) {
  const { header, rows } = parseCsv(text)
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  return { idx, rows }
}

async function readZipEntry(zip, name) {
  const f = zip.file(name)
  if (!f) return ''
  return f.async('string')
}

function buildRouteIndex(routesTxt) {
  const routes = csvToObjects(routesTxt)
  const routeById = new Map()
  for (const r of routes.rows) {
    routeById.set(r.at(routes.idx.route_id), {
      short: r.at(routes.idx.route_short_name) || '',
      long:  r.at(routes.idx.route_long_name)  || '',
      color: normalizeColor(r.at(routes.idx.route_color)) || '#3388ff',
    })
  }
  return routeById
}

function buildShapeToRoute(tripsTxt) {
  const trips = csvToObjects(tripsTxt)
  const shapeToRoute = new Map()
  for (const t of trips.rows) {
    const sid = t.at(trips.idx.shape_id)
    if (!sid) continue
    if (shapeToRoute.has(sid)) continue
    shapeToRoute.set(sid, t.at(trips.idx.route_id))
  }
  return shapeToRoute
}

function buildShapesById(shapesTxt) {
  const shapes = csvToObjects(shapesTxt)
  const sIdx = shapes.idx
  const shapesById = new Map()
  for (const r of shapes.rows) {
    const sid = r.at(sIdx.shape_id)
    const seq = +r.at(sIdx.shape_pt_sequence)
    const lat = +r.at(sIdx.shape_pt_lat)
    const lon = +r.at(sIdx.shape_pt_lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (!shapesById.has(sid)) shapesById.set(sid, [])
    shapesById.get(sid).push({ seq, lat, lon })
  }
  return shapesById
}

function gtfsRouteLabel(info, routeId, sid) {
  if (info.short) return info.short
  if (routeId) return routeId
  return sid
}

function gtfsTip(info, label) {
  const head = `<strong>${escapeHtml(label)}</strong>`
  if (!info.long) return head
  return head + `<br/><span style="opacity:.75">${escapeHtml(info.long)}</span>`
}

function addGtfsShapes(shapesById, shapeToRoute, routeById, routesSub) {
  for (const [sid, pts] of shapesById) {
    pts.sort((a, b) => a.seq - b.seq)
    if (pts.length < 2) continue
    const routeId = shapeToRoute.get(sid)
    const info = routeById.get(routeId) || {}
    const color = info.color || '#3388ff'
    const label = gtfsRouteLabel(info, routeId, sid)
    routePolyline(pts.map(p => [p.lat, p.lon]), color, gtfsTip(info, label)).addTo(routesSub)
  }
}

function addGtfsStops(stopsTxt, stopsSub) {
  const stops = csvToObjects(stopsTxt)
  const stIdx = stops.idx
  for (const r of stops.rows) {
    const lat = +r.at(stIdx.stop_lat)
    const lon = +r.at(stIdx.stop_lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    stopCircle(lat, lon, r.at(stIdx.stop_name), '#00ccaa').addTo(stopsSub)
  }
}

async function buildGtfs(key, url) {
  const buf = await fetchRaw(key, url, true)
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

  const group = L.layerGroup()
  const routesSub = L.layerGroup()
  const stopsSub = L.layerGroup()
  addGtfsShapes(shapesById, shapeToRoute, routeById, routesSub)
  addGtfsStops(stopsTxt, stopsSub)
  routesSub.addTo(group)
  stopsSub.addTo(group)
  return group
}

const BUILDERS = new Map([
  ['bus',          buildBus],
  ['railLines',    buildRailLines],
  ['railStations', buildRailStations],
  ['gtfs',         buildGtfs],
])

export async function buildTransportLayer(source) {
  const fn = BUILDERS.get(source.kind)
  if (!fn) throw new Error(`Unknown transport kind: ${source.kind}`)
  return fn(source.key, source.url)
}
