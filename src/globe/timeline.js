// Timeline layer for the MapLibre GlobeView. Manages three MapLibre
// sources (path, visits, playback head) plus their circle/line layers,
// and drives the playback animation. Shape mirrors the Leaflet side
// (src/components/useMapController.js) so both viewers render the same
// dots for the same input.

import { ACTIVITY_COLORS } from '../parser'

const SOURCES = {
  path: 'timeline-path',
  visits: 'timeline-visits',
  head: 'timeline-head',
  trail: 'timeline-trail',
}

const LAYERS = {
  path: 'timeline-path-circle',
  visits: 'timeline-visits-circle',
  head: 'timeline-head-circle',
  trail: 'timeline-trail-line',
}

const MAX_DOTS = 5000

function empty() { return { type: 'FeatureCollection', features: [] } }

function pointsToFC(points) {
  const step = Math.max(1, Math.ceil(points.length / MAX_DOTS))
  const features = []
  for (let i = 0; i < points.length; i += step) {
    const p = points[i]
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {},
    })
  }
  return { type: 'FeatureCollection', features }
}

function visitsToFC(visits) {
  return {
    type: 'FeatureCollection',
    features: visits.map(v => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: { type: v.type },
    })),
  }
}

function headFC(lat, lon) {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: {},
    }],
  }
}

function trailFC(points) {
  if (points.length < 2) return empty()
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points.map(p => [p.lon, p.lat]),
      },
      properties: {},
    }],
  }
}

// One-shot install: idempotent — safe to call after a setStyle swap.
export function ensureTimelineLayers(map) {
  for (const [k, id] of Object.entries(SOURCES)) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: empty() })
  }
  if (!map.getLayer(LAYERS.trail)) {
    map.addLayer({
      id: LAYERS.trail, type: 'line', source: SOURCES.trail,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ff3366', 'line-width': 2, 'line-opacity': 0.7 },
    })
  }
  if (!map.getLayer(LAYERS.path)) {
    map.addLayer({
      id: LAYERS.path, type: 'circle', source: SOURCES.path,
      paint: {
        'circle-radius': 2,
        'circle-color': '#ff3366',
        'circle-opacity': 0.7,
      },
    })
  }
  if (!map.getLayer(LAYERS.visits)) {
    map.addLayer({
      id: LAYERS.visits, type: 'circle', source: SOURCES.visits,
      paint: {
        'circle-radius': 5,
        'circle-color': '#00ccaa',
        'circle-opacity': 0.85,
        'circle-stroke-color': '#00ccaa',
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.5,
      },
    })
  }
  if (!map.getLayer(LAYERS.head)) {
    map.addLayer({
      id: LAYERS.head, type: 'circle', source: SOURCES.head,
      paint: {
        'circle-radius': 7,
        'circle-color': '#ff3366',
        'circle-opacity': 1,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    })
  }
}

export function setStaticData(map, { points, visits }) {
  ensureTimelineLayers(map)
  map.getSource(SOURCES.path)?.setData(pointsToFC(points))
  map.getSource(SOURCES.visits)?.setData(visitsToFC(visits))
  map.getSource(SOURCES.head)?.setData(empty())
  map.getSource(SOURCES.trail)?.setData(empty())
}

export function clearTimelineData(map) {
  for (const id of Object.values(SOURCES)) {
    map.getSource(id)?.setData(empty())
  }
}

// Fit the map view to the extent of the timeline data.
export function fitToTimeline(map, { points, visits }) {
  const lats = [...points.map(p => p.lat), ...visits.map(v => v.lat)]
  const lons = [...points.map(p => p.lon), ...visits.map(v => v.lon)]
  if (lats.length === 0) return
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40, maxZoom: 12 })
}

// Filter helpers matching the Leaflet controller.
export function filterByMonth(yd, month) {
  if (month === null) return yd
  return {
    points: yd.points.filter(p => p.time.getMonth() === month),
    visits: yd.visits.filter(v => v.start.getMonth() === month),
    activities: yd.activities.filter(a => a.start.getMonth() === month),
  }
}

export function computeStats(points, visits, activities, year, month, monthNames) {
  const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0)
  const uniquePlaces = new Set(visits.map(v => v.placeId)).size
  const label = month !== null ? `${monthNames[month]} ${year}` : `${year}`
  return { label, points: points.length, visits: visits.length, uniquePlaces, trips: activities.length, totalDist }
}

export function buildLegend(activities) {
  const actTypes = new Set(activities.map(a => a.type))
  return [...actTypes].sort().map(t => ({
    type: t,
    color: ACTIVITY_COLORS[t] || '#888',
    label: t.replace(/_/g, ' ').replace(/^IN /, '').toLowerCase(),
  }))
}

// Playback — animates a single "head" marker along the points array,
// updates the trail progressively. Returns { stop, promise }.
export function startPlayback(map, points, { speed = 1, onProgress, onDone }) {
  if (points.length < 2) {
    onDone?.()
    return { stop() {} }
  }
  ensureTimelineLayers(map)
  // Hide the static path while animating so the head is unambiguous.
  const wasPathVisible = map.getLayoutProperty(LAYERS.path, 'visibility') !== 'none'
  map.setLayoutProperty(LAYERS.path, 'visibility', 'none')
  map.getSource(SOURCES.head).setData(headFC(points[0].lat, points[0].lon))
  map.getSource(SOURCES.trail).setData(empty())

  let frame = 0
  const total = points.length
  const step = Math.max(1, Math.floor(total / 3000))
  let rafId = null
  let stopped = false

  function tick() {
    if (stopped) return
    const idx = Math.min(frame, total - 1)
    const pt = points[idx]
    map.getSource(SOURCES.head)?.setData(headFC(pt.lat, pt.lon))
    onProgress?.({
      pct: (idx / Math.max(1, total - 1)) * 100,
      timeLabel: pt.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })
    frame += step * speed
    if (frame >= total) {
      // Show the full trail at the end and pin the head at the last point.
      map.getSource(SOURCES.trail)?.setData(trailFC(points))
      const last = points[total - 1]
      map.getSource(SOURCES.head)?.setData(headFC(last.lat, last.lon))
      if (wasPathVisible) map.setLayoutProperty(LAYERS.path, 'visibility', 'visible')
      onProgress?.({ pct: 100, timeLabel: last.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
      onDone?.()
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)

  return {
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      // Restore path visibility so the user still sees dots after stopping.
      if (wasPathVisible) map.setLayoutProperty(LAYERS.path, 'visibility', 'visible')
    },
  }
}
