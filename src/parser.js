const ACTIVITY_COLORS = {
  WALKING: '#00ccaa',
  CYCLING: '#44aaff',
  IN_PASSENGER_VEHICLE: '#ff3366',
  IN_BUS: '#ff8833',
  IN_TRAIN: '#aa44ff',
  IN_SUBWAY: '#8844cc',
  IN_TRAM: '#cc44aa',
  IN_TAXI: '#ffcc00',
  FLYING: '#ff4488',
  MOTORCYCLING: '#ff6644',
  IN_FERRY: '#00aacc',
  UNKNOWN_ACTIVITY_TYPE: '#888888',
}

export { ACTIVITY_COLORS }

const MAX_LAT = 85
const MAX_LON = 180

function normalizeCoordString(val) {
  if (!val) return null
  const raw = typeof val === 'string' ? val : (val.latLng || val.point || '')
  if (!raw) return null
  return raw.replace(/°/g, '').replace(/\s/g, '')
}

function parseCoord(val) {
  const str = normalizeCoordString(val)
  if (!str) return null
  const parts = str.split(',')
  if (parts.length < 2) return null
  const lat = parseFloat(parts[0])
  const lon = parseFloat(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (Math.abs(lat) > MAX_LAT || Math.abs(lon) > MAX_LON) return null
  return [lat, lon]
}

function parseTime(t) {
  if (!t) return null
  try { return new Date(t) } catch { return null }
}

function parseVisit(seg) {
  const cand = seg.visit?.topCandidate
  if (!cand) return null
  const loc = parseCoord(cand.placeLocation)
  const t = parseTime(seg.startTime)
  if (!loc || !t) return null
  return {
    lat: loc[0], lon: loc[1],
    start: t,
    end: parseTime(seg.endTime),
    placeId: cand.placeId || '',
    type: cand.semanticType || 'UNKNOWN',
  }
}

function parseActivity(seg) {
  const act = seg.activity
  if (!act) return null
  const s = parseCoord(act.start)
  const e = parseCoord(act.end)
  const t = parseTime(seg.startTime)
  if (!s || !e || !t) return null
  return {
    startLat: s[0], startLon: s[1],
    endLat: e[0], endLon: e[1],
    start: t,
    end: parseTime(seg.endTime),
    type: act.topCandidate?.type || 'UNKNOWN_ACTIVITY_TYPE',
    distance: act.distanceMeters || 0,
  }
}

function coerceCoordSource(pp) {
  if (pp.point) return pp.point
  return pp
}

function parsePathPoint(pp) {
  const c = parseCoord(coerceCoordSource(pp))
  if (!c) return null
  const t = parseTime(pp.time)
  if (!t) return null
  return { lat: c[0], lon: c[1], time: t }
}

function hasPathData(seg) {
  const raw = seg.timelinePath
  if (!raw) return false
  return raw.length > 0
}

function parsePath(seg) {
  if (!hasPathData(seg)) return null
  const pts = seg.timelinePath.map(parsePathPoint).filter(Boolean)
  if (pts.length === 0) return null
  return pts
}

export function parseTimeline(data) {
  const segments = data.semanticSegments || (Array.isArray(data) ? data : [])
  const result = { visits: [], activities: [], paths: [] }
  for (const seg of segments) {
    if (!seg || typeof seg !== 'object') continue
    const v = parseVisit(seg); if (v) result.visits.push(v)
    const a = parseActivity(seg); if (a) result.activities.push(a)
    const p = parsePath(seg); if (p) result.paths.push(p)
  }
  return result
}

function ensureYear(map, y) {
  if (!map.has(y)) map.set(y, { visits: [], activities: [], points: [] })
  return map.get(y)
}

export function organizeByYear(data) {
  const yearData = new Map()
  for (const v of data.visits) ensureYear(yearData, v.start.getFullYear()).visits.push(v)
  for (const a of data.activities) ensureYear(yearData, a.start.getFullYear()).activities.push(a)
  for (const pg of data.paths) {
    for (const pt of pg) ensureYear(yearData, pt.time.getFullYear()).points.push(pt)
  }
  for (const y of yearData.values()) {
    y.points.sort((a, b) => a.time - b.time)
    y.visits.sort((a, b) => a.start - b.start)
    y.activities.sort((a, b) => a.start - b.start)
  }
  return yearData
}
