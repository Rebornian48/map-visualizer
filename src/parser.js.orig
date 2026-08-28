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

function parseCoord(val) {
  if (!val) return null
  let str = typeof val === 'string' ? val : (val.latLng || val.point || '')
  if (!str) return null
  str = str.replace(/°/g, '').replace(/\s/g, '')
  const parts = str.split(',')
  if (parts.length < 2) return null
  const lat = parseFloat(parts[0])
  const lon = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lon)) return null
  if (Math.abs(lat) > 85 || Math.abs(lon) > 180) return null
  return [lat, lon]
}

function parseTime(t) {
  if (!t) return null
  try { return new Date(t) } catch { return null }
}

export function parseTimeline(data, onProgress) {
  const segments = data.semanticSegments || (Array.isArray(data) ? data : [])
  const result = { visits: [], activities: [], paths: [] }
  const total = segments.length

  for (let i = 0; i < total; i++) {
    const seg = segments[i]
    if (!seg || typeof seg !== 'object') continue

    if (seg.visit) {
      const cand = seg.visit.topCandidate
      if (cand) {
        const loc = parseCoord(cand.placeLocation)
        const t = parseTime(seg.startTime)
        if (loc && t) {
          result.visits.push({
            lat: loc[0], lon: loc[1],
            start: t,
            end: parseTime(seg.endTime),
            placeId: cand.placeId || '',
            type: cand.semanticType || 'UNKNOWN',
          })
        }
      }
    }

    if (seg.activity) {
      const act = seg.activity
      const startCoord = parseCoord(act.start)
      const endCoord = parseCoord(act.end)
      const t = parseTime(seg.startTime)
      if (startCoord && endCoord && t) {
        result.activities.push({
          startLat: startCoord[0], startLon: startCoord[1],
          endLat: endCoord[0], endLon: endCoord[1],
          start: t,
          end: parseTime(seg.endTime),
          type: (act.topCandidate && act.topCandidate.type) || 'UNKNOWN_ACTIVITY_TYPE',
          distance: act.distanceMeters || 0,
        })
      }
    }

    if (seg.timelinePath && seg.timelinePath.length > 0) {
      const pts = []
      for (const pp of seg.timelinePath) {
        const coord = parseCoord(pp.point || pp)
        const t = parseTime(pp.time)
        if (coord && t) pts.push({ lat: coord[0], lon: coord[1], time: t })
      }
      if (pts.length > 0) result.paths.push(pts)
    }
  }

  return result
}

export function organizeByYear(data) {
  const yearData = {}

  for (const v of data.visits) {
    const y = v.start.getFullYear()
    if (!yearData[y]) yearData[y] = { visits: [], activities: [], points: [] }
    yearData[y].visits.push(v)
  }

  for (const a of data.activities) {
    const y = a.start.getFullYear()
    if (!yearData[y]) yearData[y] = { visits: [], activities: [], points: [] }
    yearData[y].activities.push(a)
  }

  for (const pathGroup of data.paths) {
    for (const pt of pathGroup) {
      const y = pt.time.getFullYear()
      if (!yearData[y]) yearData[y] = { visits: [], activities: [], points: [] }
      yearData[y].points.push(pt)
    }
  }

  for (const y of Object.keys(yearData)) {
    yearData[y].points.sort((a, b) => a.time - b.time)
    yearData[y].visits.sort((a, b) => a.start - b.start)
    yearData[y].activities.sort((a, b) => a.start - b.start)
  }

  return yearData
}
