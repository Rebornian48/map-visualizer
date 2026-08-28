import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TRANSPORT_SOURCES, buildTransportLayer } from '../transport'
import ExportModal from './ExportModal'
import DataInfoModal from './DataInfoModal'
import LayersControl from './LayersControl'
import HeaderBar from './HeaderBar'
import { StatsPanel, MonthBar, Legend, CoordinateReadout, PlaybackBar } from './MapPanels'
import { BOUNDARY_SOURCES, BASEMAPS, MONTH_NAMES, SPEEDS, ACTIVITY_COLOR_MAP,
         boundaryLabelHtml } from './mapView.helpers'

const uiPanel = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow)',
  transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
}

const BOUNDARY_STYLE = {
  color: '#ff3366', weight: 1, opacity: 0.7,
  fillOpacity: 0.05, fillColor: '#ff3366',
}
const BOUNDARY_HOVER_STYLE = {
  color: '#ff3366', weight: 2.5, opacity: 1,
  fillOpacity: 0.2, fillColor: '#ff3366',
}
const BOUNDARY_SELECTED_STYLE = {
  color: '#ff3366', weight: 3, opacity: 1,
  fillOpacity: 0.28, fillColor: '#ff3366',
}

function initMap(container, setCursor) {
  const map = L.map(container, {
    center: [-2.5, 118], zoom: 5,
    zoomControl: true, attributionControl: true,
  })
  const baseLayers = new Map()
  for (const [name, { url, opts }] of BASEMAPS) {
    baseLayers.set(name, L.tileLayer(url, opts))
  }
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

function attachBoundaryLayer(geojson, kind, mapInst) {
  let selectedLyr = null
  const layer = L.geoJSON(geojson, {
    style: BOUNDARY_STYLE,
    interactive: true,
    onEachFeature: (feature, lyr) => {
      const label = boundaryLabelHtml(kind, feature?.properties)
      if (label) {
        lyr.bindTooltip(label, {
          sticky: true, direction: 'top', opacity: 0.95,
          className: 'boundary-tooltip',
        })
      }
      lyr.on({
        mouseover: (e) => {
          if (e.target !== selectedLyr) e.target.setStyle(BOUNDARY_HOVER_STYLE)
          e.target.bringToFront()
        },
        mouseout: (e) => {
          if (e.target !== selectedLyr) layer.resetStyle(e.target)
        },
        click: (e) => {
          if (selectedLyr && selectedLyr !== e.target) layer.resetStyle(selectedLyr)
          selectedLyr = e.target
          e.target.setStyle(BOUNDARY_SELECTED_STYLE)
          e.target.bringToFront()
          const b = e.target.getBounds?.()
          if (b?.isValid()) mapInst.fitBounds(b, { padding: [40, 40], maxZoom: 12 })
          L.DomEvent.stopPropagation(e)
        },
      })
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

function drawStatic(yearData, year, month, layers, map, setStats, setLegendItems, currentPointsRef) {
  const { path, visit } = layers
  const yd = yearData?.get(year)
  if (!yd) return

  let { points, visits, activities } = yd
  if (month !== null) {
    points = points.filter(p => p.time.getMonth() === month)
    visits = visits.filter(v => v.start.getMonth() === month)
    activities = activities.filter(a => a.start.getMonth() === month)
  }
  currentPointsRef.current = points

  const maxDots = 5000
  const dotStep = Math.max(1, Math.ceil(points.length / maxDots))
  for (let i = 0; i < points.length; i += dotStep) {
    const p = points.at(i)
    L.circleMarker([p.lat, p.lon], {
      radius: 2, fillColor: '#ff3366', fillOpacity: 0.7,
      color: '#ff3366', weight: 0, opacity: 0,
    }).addTo(path)
  }
  for (const v of visits) {
    L.circleMarker([v.lat, v.lon], {
      radius: 5, fillColor: '#00ccaa', fillOpacity: 0.85,
      color: '#00ccaa', weight: 1, opacity: 0.5,
    }).addTo(visit)
  }

  const allLats = [...points.map(p => p.lat), ...visits.map(v => v.lat)]
  const allLons = [...points.map(p => p.lon), ...visits.map(v => v.lon)]
  if (allLats.length > 0) {
    map.fitBounds(
      [[Math.min(...allLats), Math.min(...allLons)], [Math.max(...allLats), Math.max(...allLons)]],
      { padding: [40, 40], maxZoom: 14 },
    )
  }

  const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0)
  const uniquePlaces = new Set(visits.map(v => v.placeId)).size
  const label = month !== null ? `${MONTH_NAMES.at(month)} ${year}` : `${year}`
  setStats({ label, points: points.length, visits: visits.length, uniquePlaces, trips: activities.length, totalDist })

  const actTypes = new Set(activities.map(a => a.type))
  setLegendItems([...actTypes].sort().map(t => ({
    type: t,
    color: ACTIVITY_COLOR_MAP.get(t) || '#888',
    label: t.replace(/_/g, ' ').replace(/^IN /, '').toLowerCase(),
  })))
}

export default function MapView({ yearData, theme, onToggleTheme, onFile }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const layersRef = useRef({})
  const animRef = useRef(null)
  const fileInputRef = useRef(null)

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
  const boundaryLayerRef = useRef(null)
  const boundaryCacheRef = useRef(new Map())
  const baseLayersRef = useRef(new Map())
  const transportLayersRef = useRef(new Map())

  const years = yearData ? [...yearData.keys()].sort((a, b) => a - b) : []
  const currentPointsRef = useRef([])

  useEffect(() => {
    if (mapInstance.current) return
    const { map, baseLayers, layers } = initMap(mapRef.current, setCursor)
    baseLayersRef.current = baseLayers
    layersRef.current = layers
    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!yearData) return
    const sortedYears = [...yearData.keys()].sort((a, b) => a - b)
    setCurrentYear(sortedYears.at(-1))
    setCurrentMonth(null)
  }, [yearData])

  const onToggleTransport = useCallback((key) => {
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
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    for (const [name, layer] of baseLayersRef.current) {
      if (name === basemap) {
        if (!map.hasLayer(layer)) layer.addTo(map)
      } else if (map.hasLayer(layer)) map.removeLayer(layer)
    }
  }, [basemap])

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

  const togglePlay = useCallback(() => {
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
    path.clearLayers()
    visit.clearLayers()
    activity.clearLayers()

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
  }, [isPlaying, currentYear, currentMonth, speedIdx, renderData])

  const availableMonths = currentYear && yearData?.get(currentYear)
    ? [...new Set([
        ...yearData.get(currentYear).points.map(p => p.time.getMonth()),
        ...yearData.get(currentYear).visits.map(v => v.start.getMonth()),
      ])].sort((a, b) => a - b)
    : []

  const hasData = !!yearData
  const speed = SPEEDS.at(speedIdx)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        hasData={hasData}
        years={years}
        currentYear={currentYear}
        onSelectYear={(y) => { setCurrentYear(y); setCurrentMonth(null) }}
        fileInputRef={fileInputRef}
        onFile={onFile}
        onOpenExport={() => setShowExport(true)}
        onToggleStats={() => setShowStats(s => !s)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      {showExport && hasData && (
        <ExportModal yearData={yearData} map={mapInstance.current} onClose={() => setShowExport(false)} />
      )}

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--map-bg)', transition: 'background 0.4s' }} />

        <LayersControl
          basemap={basemap} onBasemap={setBasemap}
          boundary={boundary} onBoundary={setBoundary}
          boundaryLoading={boundaryLoading}
          transportActive={transportActive}
          transportLoading={transportLoading}
          transportError={transportError}
          onToggleTransport={onToggleTransport}
        />

        <button onClick={() => setShowDataInfo(true)} title="Tentang data"
          style={{
            position: 'absolute', top: 56, right: 12, zIndex: 1000,
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--surface-solid)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               style={{ color: 'var(--text)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>

        {showDataInfo && <DataInfoModal onClose={() => setShowDataInfo(false)} />}

        {hasData && showStats && <StatsPanel stats={stats} uiPanel={uiPanel} />}
        {hasData && currentYear && (
          <MonthBar uiPanel={uiPanel} months={availableMonths}
                    current={currentMonth} onSelect={setCurrentMonth} />
        )}
        {hasData && legendItems.length > 0 && <Legend uiPanel={uiPanel} items={legendItems} />}
        <CoordinateReadout uiPanel={uiPanel} cursor={cursor} />
        {hasData && (
          <PlaybackBar uiPanel={uiPanel}
            isPlaying={isPlaying} onTogglePlay={togglePlay}
            playPct={playPct} timeLabel={timeLabel}
            speed={speed} onCycleSpeed={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)} />
        )}
      </div>
    </div>
  )
}

