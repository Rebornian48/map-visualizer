import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import { TRANSPORT_SOURCES, buildTransportLayer } from '../transport'
import { BOUNDARY_SOURCES, BASEMAPS, MONTH_NAMES, SPEEDS, ACTIVITY_COLOR_MAP,
         boundaryLabelHtml } from './mapView.helpers'

const BOUNDARY_STYLE = {
  color: '#ff3366', weight: 1, opacity: 0.7, fillOpacity: 0.05, fillColor: '#ff3366',
}
const BOUNDARY_HOVER_STYLE = {
  color: '#ff3366', weight: 2.5, opacity: 1, fillOpacity: 0.2, fillColor: '#ff3366',
}
const BOUNDARY_SELECTED_STYLE = {
  color: '#ff3366', weight: 3, opacity: 1, fillOpacity: 0.28, fillColor: '#ff3366',
}

function initMap(container, setCursor) {
  const map = L.map(container, {
    center: [-2.5, 118], zoom: 5,
    zoomControl: true, attributionControl: true,
  })
  const baseLayers = new Map()
  for (const [name, { url, opts }] of BASEMAPS) baseLayers.set(name, L.tileLayer(url, opts))
  baseLayers.get('Carto Light').addTo(map)
  const layers = {
    path: L.layerGroup().addTo(map),
    visit: L.layerGroup().addTo(map),
    activity: L.layerGroup().addTo(map),
  }
  map.on('mousemove', (e) => setCursor(e.latlng))
  map.on('mouseout', () => setCursor(null))
  return { map, baseLayers, layers }
}

function boundaryFeatureHandlers(layer, mapInst, getSelected, setSelected) {
  return {
    mouseover: (e) => {
      if (e.target !== getSelected()) e.target.setStyle(BOUNDARY_HOVER_STYLE)
      e.target.bringToFront()
    },
    mouseout: (e) => { if (e.target !== getSelected()) layer.resetStyle(e.target) },
    click: (e) => {
      const sel = getSelected()
      if (sel && sel !== e.target) layer.resetStyle(sel)
      setSelected(e.target)
      e.target.setStyle(BOUNDARY_SELECTED_STYLE)
      e.target.bringToFront()
      const b = e.target.getBounds?.()
      if (b?.isValid()) mapInst.fitBounds(b, { padding: [40, 40], maxZoom: 12 })
      L.DomEvent.stopPropagation(e)
    },
  }
}

function attachBoundaryLayer(geojson, kind, mapInst) {
  let selectedLyr = null
  const layer = L.geoJSON(geojson, {
    style: BOUNDARY_STYLE,
    interactive: true,
    onEachFeature: (feature, lyr) => {
      const label = boundaryLabelHtml(kind, feature?.properties)
      if (label) {
        lyr.bindTooltip(label, {
          sticky: true, direction: 'top', opacity: 0.95, className: 'boundary-tooltip',
        })
      }
      lyr.on(boundaryFeatureHandlers(layer, mapInst, () => selectedLyr, (v) => { selectedLyr = v }))
    },
  })
  layer.addTo(mapInst)
  const mapClickHandler = () => {
    if (selectedLyr) { layer.resetStyle(selectedLyr); selectedLyr = null }
  }
  mapInst.on('click', mapClickHandler)
  layer._mapClickHandler = mapClickHandler
  return layer
}

function filterByMonth(yd, month) {
  if (month === null) return yd
  return {
    points: yd.points.filter(p => p.time.getMonth() === month),
    visits: yd.visits.filter(v => v.start.getMonth() === month),
    activities: yd.activities.filter(a => a.start.getMonth() === month),
  }
}

function drawDots(points, visits, layers) {
  const maxDots = 5000
  const dotStep = Math.max(1, Math.ceil(points.length / maxDots))
  for (let i = 0; i < points.length; i += dotStep) {
    const p = points.at(i)
    L.circleMarker([p.lat, p.lon], {
      radius: 2, fillColor: '#ff3366', fillOpacity: 0.7,
      color: '#ff3366', weight: 0, opacity: 0,
    }).addTo(layers.path)
  }
  for (const v of visits) {
    L.circleMarker([v.lat, v.lon], {
      radius: 5, fillColor: '#00ccaa', fillOpacity: 0.85,
      color: '#00ccaa', weight: 1, opacity: 0.5,
    }).addTo(layers.visit)
  }
}

function fitToBounds(map, points, visits) {
  const allLats = [...points.map(p => p.lat), ...visits.map(v => v.lat)]
  const allLons = [...points.map(p => p.lon), ...visits.map(v => v.lon)]
  if (allLats.length === 0) return
  map.fitBounds(
    [[Math.min(...allLats), Math.min(...allLons)], [Math.max(...allLats), Math.max(...allLons)]],
    { padding: [40, 40], maxZoom: 14 },
  )
}

function computeStats(points, visits, activities, year, month) {
  const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0)
  const uniquePlaces = new Set(visits.map(v => v.placeId)).size
  const label = month !== null ? `${MONTH_NAMES.at(month)} ${year}` : `${year}`
  return { label, points: points.length, visits: visits.length, uniquePlaces, trips: activities.length, totalDist }
}

function buildLegend(activities) {
  const actTypes = new Set(activities.map(a => a.type))
  return [...actTypes].sort().map(t => ({
    type: t,
    color: ACTIVITY_COLOR_MAP.get(t) || '#888',
    label: t.replace(/_/g, ' ').replace(/^IN /, '').toLowerCase(),
  }))
}

function drawStatic(yearData, year, month, layers, map, setStats, setLegendItems, currentPointsRef) {
  const yd = yearData?.get(year)
  if (!yd) return
  const filtered = filterByMonth(yd, month)
  currentPointsRef.current = filtered.points
  drawDots(filtered.points, filtered.visits, layers)
  fitToBounds(map, filtered.points, filtered.visits)
  setStats(computeStats(filtered.points, filtered.visits, filtered.activities, year, month))
  setLegendItems(buildLegend(filtered.activities))
}

function useMapInit(mapRef, mapInstance, baseLayersRef, layersRef, setCursor) {
  useEffect(() => {
    if (mapInstance.current) return
    const { map, baseLayers, layers } = initMap(mapRef.current, setCursor)
    baseLayersRef.current = baseLayers
    layersRef.current = layers
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])
}

function useBasemapEffect(basemap, mapInstance, baseLayersRef) {
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    for (const [name, layer] of baseLayersRef.current) {
      if (name === basemap) {
        if (!map.hasLayer(layer)) layer.addTo(map)
      } else if (map.hasLayer(layer)) map.removeLayer(layer)
    }
  }, [basemap])
}

function useBoundaryEffect(boundary, mapInstance, boundaryLayerRef, boundaryCacheRef, setBoundaryLoading) {
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (boundaryLayerRef.current) {
      if (boundaryLayerRef.current._mapClickHandler) {
        map.off('click', boundaryLayerRef.current._mapClickHandler)
      }
      map.removeLayer(boundaryLayerRef.current)
      boundaryLayerRef.current = null
    }
    if (boundary === 'none') return

    let cancelled = false
    const addLayer = (geojson) => {
      if (cancelled || !mapInstance.current) return
      boundaryLayerRef.current = attachBoundaryLayer(geojson, boundary, mapInstance.current)
    }
    const cached = boundaryCacheRef.current.get(boundary)
    if (cached) { addLayer(cached); return () => { cancelled = true } }

    setBoundaryLoading(true)
    fetch(BOUNDARY_SOURCES.get(boundary))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { boundaryCacheRef.current.set(boundary, data); addLayer(data) })
      .catch(err => {
        console.error('Boundary load failed:', err)
        if (!cancelled) alert(`Failed to load boundary layer: ${err.message}`)
      })
      .finally(() => { if (!cancelled) setBoundaryLoading(false) })

    return () => { cancelled = true }
  }, [boundary])
}

function makeTransportToggle(mapInstance, transportLayersRef, setTransportActive, setTransportLoading, setTransportError) {
  return (key) => {
    const map = mapInstance.current
    if (!map) return
    const src = TRANSPORT_SOURCES.find(s => s.key === key)
    if (!src) return
    const existing = transportLayersRef.current.get(key)
    if (existing) {
      if (map.hasLayer(existing)) map.removeLayer(existing)
      transportLayersRef.current.delete(key)
      setTransportActive(prev => { const n = new Set(prev); n.delete(key); return n })
      return
    }
    setTransportLoading(prev => new Set(prev).add(key))
    setTransportError(prev => { const n = new Map(prev); n.delete(key); return n })
    buildTransportLayer(src)
      .then(layer => {
        if (!mapInstance.current) return
        layer.addTo(mapInstance.current)
        transportLayersRef.current.set(key, layer)
        setTransportActive(prev => new Set(prev).add(key))
      })
      .catch(err => {
        console.error(`Transport load failed [${key}]:`, err)
        setTransportError(prev => new Map(prev).set(key, err.message || String(err)))
      })
      .finally(() => {
        setTransportLoading(prev => { const n = new Set(prev); n.delete(key); return n })
      })
  }
}

function makeTogglePlay(deps) {
  const { isPlaying, animRef, setIsPlaying, renderData, currentYear, currentMonth,
          layersRef, currentPointsRef, speedIdx, setPlayPct, setTimeLabel } = deps
  return () => {
    const pts = currentPointsRef.current
    if (pts.length < 2) return
    if (isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setIsPlaying(false)
      renderData(currentYear, currentMonth)
      return
    }
    setIsPlaying(true)
    const { path, visit, activity } = layersRef.current
    path.clearLayers(); visit.clearLayers(); activity.clearLayers()
    const first = pts.at(0)
    const head = L.circleMarker([first.lat, first.lon], {
      radius: 7, fillColor: '#ff3366', fillOpacity: 1, color: '#fff', weight: 2,
    }).addTo(path)
    let frame = 0
    const total = pts.length
    const step = Math.max(1, Math.floor(total / 3000))
    const speed = SPEEDS.at(speedIdx)
    function tick() {
      const idx = Math.min(frame, total - 1)
      const pt = pts.at(idx)
      head.setLatLng([pt.lat, pt.lon])
      setPlayPct((idx / (total - 1)) * 100)
      setTimeLabel(pt.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      frame += step * speed
      if (frame >= total) {
        path.clearLayers()
        L.polyline(pts.map(p => [p.lat, p.lon]), {
          color: '#ff3366', weight: 2, opacity: 0.7, smoothFactor: 1.5,
        }).addTo(path)
        const last = pts.at(-1)
        L.circleMarker([last.lat, last.lon], {
          radius: 7, fillColor: '#ff3366', fillOpacity: 1, color: '#fff', weight: 2,
        }).addTo(path)
        setPlayPct(100); setIsPlaying(false)
        return
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }
}

export function useMapController(yearData) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({})
  const animRef = useRef(null)
  const fileInputRef = useRef(null)
  const boundaryLayerRef = useRef(null)
  const boundaryCacheRef = useRef(new Map())
  const baseLayersRef = useRef(new Map())
  const transportLayersRef = useRef(new Map())
  const currentPointsRef = useRef([])

  const [currentYear, setCurrentYear] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [playPct, setPlayPct] = useState(0)
  const [timeLabel, setTimeLabel] = useState('—')
  const [legendItems, setLegendItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [showDataInfo, setShowDataInfo] = useState(false)
  const [boundary, setBoundary] = useState('none')
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [basemap, setBasemap] = useState('Carto Light')
  const [transportActive, setTransportActive] = useState(() => new Set())
  const [transportLoading, setTransportLoading] = useState(() => new Set())
  const [transportError, setTransportError] = useState(() => new Map())

  useMapInit(mapRef, mapInstance, baseLayersRef, layersRef, setCursor)
  useBasemapEffect(basemap, mapInstance, baseLayersRef)
  useBoundaryEffect(boundary, mapInstance, boundaryLayerRef, boundaryCacheRef, setBoundaryLoading)

  useEffect(() => {
    if (!yearData) return
    const sortedYears = [...yearData.keys()].sort((a, b) => a - b)
    setCurrentYear(sortedYears.at(-1))
    setCurrentMonth(null)
  }, [yearData])

  const onToggleTransport = useCallback(
    makeTransportToggle(mapInstance, transportLayersRef, setTransportActive, setTransportLoading, setTransportError),
    [],
  )

  const renderData = useCallback((year, month) => {
    const map = mapInstance.current
    const { path, visit, activity } = layersRef.current
    path.clearLayers(); visit.clearLayers(); activity.clearLayers()
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    setIsPlaying(false); setPlayPct(0); setTimeLabel('—')
    drawStatic(yearData, year, month, layersRef.current, map, setStats, setLegendItems, currentPointsRef)
  }, [yearData])

  useEffect(() => {
    if (!mapInstance.current || currentYear === null || !yearData) return
    renderData(currentYear, currentMonth)
  }, [currentYear, currentMonth, yearData, renderData])

  const togglePlay = useCallback(
    makeTogglePlay({
      isPlaying, animRef, setIsPlaying, renderData, currentYear, currentMonth,
      layersRef, currentPointsRef, speedIdx, setPlayPct, setTimeLabel,
    }),
    [isPlaying, currentYear, currentMonth, speedIdx, renderData],
  )

  const currentYd = currentYear ? yearData?.get(currentYear) : null
  const availableMonths = currentYd
    ? [...new Set([...currentYd.points.map(p => p.time.getMonth()),
                   ...currentYd.visits.map(v => v.start.getMonth())])].sort((a, b) => a - b)
    : []
  const years = yearData ? [...yearData.keys()].sort((a, b) => a - b) : []
  const speed = SPEEDS.at(speedIdx)

  return {
    refs: { mapRef, mapInstance, fileInputRef },
    state: { currentYear, currentMonth, showStats, stats, isPlaying, playPct, timeLabel,
             legendItems, cursor, showExport, showDataInfo, boundary, boundaryLoading,
             basemap, transportActive, transportLoading, transportError,
             years, availableMonths, speed },
    setters: { setCurrentYear, setCurrentMonth, setShowStats, setShowExport, setShowDataInfo,
               setBoundary, setBasemap, setSpeedIdx },
    actions: { onToggleTransport, togglePlay },
  }
}
