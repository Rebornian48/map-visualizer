import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ACTIVITY_COLORS } from '../parser'
import ThemeToggle from './ThemeToggle'
import ExportModal from './ExportModal'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SPEEDS = [1, 2, 5, 10]

const BOUNDARY_SOURCES = {
  provinsi: 'https://rebornian48.my.id/assets/json/provinsi.json',
  kabkota: 'https://rebornian48.my.id/assets/json/kabkota.json',
}

const BOUNDARY_STYLE = {
  color: '#ff3366',
  weight: 1,
  opacity: 0.7,
  fillOpacity: 0.05,
  fillColor: '#ff3366',
}

const BASEMAPS = {
  'Carto Light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' },
  },
  'Carto Dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' },
  },
  'OpenStreetMap': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' },
  },
  'Satellite': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opts: { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
  },
  'Topographic': {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    opts: { maxZoom: 17, attribution: '&copy; OpenTopoMap (CC-BY-SA)' },
  },
}

const uiPanel = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow)',
  transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
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
  const [boundary, setBoundary] = useState('none')
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const boundaryLayerRef = useRef(null)
  const boundaryCacheRef = useRef({})

  const years = yearData ? Object.keys(yearData).map(Number).sort() : []
  const currentPointsRef = useRef([])

  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, {
      center: [-2.5, 118], zoom: 5,
      zoomControl: true, attributionControl: true,
    })

    const baseLayers = {}
    Object.entries(BASEMAPS).forEach(([name, { url, opts }]) => {
      baseLayers[name] = L.tileLayer(url, opts)
    })
    baseLayers['Carto Light'].addTo(map)
    L.control.layers(baseLayers, null, { position: 'topright', collapsed: true }).addTo(map)

    layersRef.current = {
      path: L.layerGroup().addTo(map),
      visit: L.layerGroup().addTo(map),
      activity: L.layerGroup().addTo(map),
    }

    map.on('mousemove', (e) => setCursor(e.latlng))
    map.on('mouseout', () => setCursor(null))

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  useEffect(() => {
    if (!yearData) return
    const latest = Object.keys(yearData).map(Number).sort().pop()
    setCurrentYear(latest)
    setCurrentMonth(null)
  }, [yearData])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current)
      boundaryLayerRef.current = null
    }
    if (boundary === 'none') return

    let cancelled = false
    const addLayer = (geojson) => {
      if (cancelled || !mapInstance.current) return
      const layer = L.geoJSON(geojson, {
        style: BOUNDARY_STYLE,
        interactive: false,
      })
      layer.addTo(mapInstance.current)
      boundaryLayerRef.current = layer
    }

    const cached = boundaryCacheRef.current[boundary]
    if (cached) {
      addLayer(cached)
      return () => { cancelled = true }
    }

    setBoundaryLoading(true)
    fetch(BOUNDARY_SOURCES[boundary])
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        boundaryCacheRef.current[boundary] = data
        addLayer(data)
      })
      .catch(err => {
        console.error('Boundary load failed:', err)
        if (!cancelled) alert(`Failed to load boundary layer: ${err.message}`)
      })
      .finally(() => { if (!cancelled) setBoundaryLoading(false) })

    return () => { cancelled = true }
  }, [boundary])

  useEffect(() => {
    if (!mapInstance.current || currentYear === null || !yearData) return
    renderData(currentYear, currentMonth)
  }, [currentYear, currentMonth, yearData])

  const renderData = useCallback((year, month) => {
    const map = mapInstance.current
    const { path, visit, activity } = layersRef.current
    path.clearLayers(); visit.clearLayers(); activity.clearLayers()
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
    setIsPlaying(false); setPlayPct(0); setTimeLabel('—')

    const yd = yearData?.[year]
    if (!yd) return

    let points = yd.points, visits = yd.visits, activities = yd.activities
    if (month !== null) {
      points = points.filter(p => p.time.getMonth() === month)
      visits = visits.filter(v => v.start.getMonth() === month)
      activities = activities.filter(a => a.start.getMonth() === month)
    }
    currentPointsRef.current = points

    const maxDots = 5000
    const dotStep = Math.max(1, Math.ceil(points.length / maxDots))
    for (let i = 0; i < points.length; i += dotStep) {
      const p = points[i]
      L.circleMarker([p.lat, p.lon], {
        radius: 2, fillColor: '#ff3366', fillOpacity: 0.7,
        color: '#ff3366', weight: 0, opacity: 0,
      }).addTo(path)
    }

    const actTypes = new Set(activities.map(a => a.type))

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
        { padding: [40, 40], maxZoom: 14 }
      )
    }

    const totalDist = activities.reduce((s, a) => s + (a.distance || 0), 0)
    const uniquePlaces = new Set(visits.map(v => v.placeId)).size
    const label = month !== null ? `${MONTH_NAMES[month]} ${year}` : `${year}`
    setStats({ label, points: points.length, visits: visits.length, uniquePlaces, trips: activities.length, totalDist })
    setLegendItems(Array.from(actTypes).sort().map(t => ({
      type: t, color: ACTIVITY_COLORS[t] || '#888',
      label: t.replace(/_/g, ' ').replace(/^IN /, '').toLowerCase(),
    })))
  }, [yearData])

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
    path.clearLayers(); visit.clearLayers(); activity.clearLayers()

    const head = L.circleMarker([pts[0].lat, pts[0].lon], {
      radius: 7, fillColor: '#ff3366', fillOpacity: 1, color: '#fff', weight: 2,
    }).addTo(path)

    let frame = 0
    const total = pts.length
    const step = Math.max(1, Math.floor(total / 3000))
    function tick() {
      const idx = Math.min(frame, total - 1)
      const pt = pts[idx]
      head.setLatLng([pt.lat, pt.lon])
      const pct = (idx / (total - 1)) * 100
      setPlayPct(pct)
      setTimeLabel(pt.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      frame += step * SPEEDS[speedIdx]
      if (frame >= total) {
        path.clearLayers()
        L.polyline(pts.map(p => [p.lat, p.lon]), {
          color: '#ff3366', weight: 2, opacity: 0.7, smoothFactor: 1.5,
        }).addTo(path)
        L.circleMarker([pts[pts.length - 1].lat, pts[pts.length - 1].lon], {
          radius: 7, fillColor: '#ff3366', fillOpacity: 1, color: '#fff', weight: 2,
        }).addTo(path)
        setPlayPct(100)
        setIsPlaying(false)
        return
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }, [isPlaying, currentYear, currentMonth, speedIdx, renderData])

  const availableMonths = currentYear && yearData?.[currentYear]
    ? [...new Set([
        ...yearData[currentYear].points.map(p => p.time.getMonth()),
        ...yearData[currentYear].visits.map(v => v.start.getMonth()),
      ])].sort((a, b) => a - b)
    : []

  const hasData = !!yearData

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--surface-solid)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        zIndex: 1100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap',
          padding: '4px 4px 4px 0',
        }}>
          <span style={{
            width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%',
            boxShadow: '0 0 8px var(--accent-glow)',
          }} />
          Map Visualizer
        </div>

        <button onClick={() => fileInputRef.current?.click()} style={{
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, color: 'var(--text)', cursor: 'pointer',
          fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
        }}>
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
          {hasData ? 'Replace JSON' : 'Add Timeline JSON'}
        </button>

        <input
          ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />

        {hasData && (
          <div style={{
            display: 'flex', gap: 4, padding: 3,
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
            overflowX: 'auto', maxWidth: 580,
          }}>
            {years.map(y => (
              <button key={y} onClick={() => { setCurrentYear(y); setCurrentMonth(null) }}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: '0.8rem',
                  fontFamily: "'DM Mono', monospace", cursor: 'pointer', whiteSpace: 'nowrap',
                  border: 'none', background: currentYear === y ? 'var(--accent)' : 'transparent',
                  color: currentYear === y ? 'white' : 'var(--text-dim)', transition: 'all 0.2s',
                }}
              >{y}</button>
            ))}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
        }}>
          {[
            { key: 'none', label: 'No boundary' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'kabkota', label: 'Kab/Kota' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setBoundary(opt.key)}
              disabled={boundaryLoading && boundary !== opt.key}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: '0.78rem',
                fontFamily: "'Outfit', sans-serif", cursor: 'pointer', whiteSpace: 'nowrap',
                border: 'none', background: boundary === opt.key ? 'var(--accent)' : 'transparent',
                color: boundary === opt.key ? 'white' : 'var(--text-dim)',
                fontWeight: boundary === opt.key ? 500 : 400,
              }}
            >{opt.key === boundary && boundaryLoading ? '…' : opt.label}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasData && (
            <>
              <button onClick={() => setShowExport(true)} style={{
                padding: '7px 14px', background: 'var(--accent)', border: 'none',
                borderRadius: 8, color: 'white', cursor: 'pointer',
                fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
              }}>Export Video</button>
              <button onClick={() => setShowStats(s => !s)} style={{
                background: 'none', border: 'none', padding: '7px 12px', color: 'var(--text)',
                cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif",
                borderRadius: 7,
              }}>Stats</button>
            </>
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </header>

      {showExport && hasData && (
        <ExportModal
          yearData={yearData}
          map={mapInstance.current}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', background: 'var(--map-bg)', transition: 'background 0.4s' }} />

      {/* Stats Panel */}
      {hasData && showStats && (
        <div style={{ ...uiPanel, position: 'absolute', top: 16, right: 16, zIndex: 1000, padding: 20, width: 280 }}>
          <h3 style={{
            fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'var(--text-dim)', marginBottom: 14, fontFamily: "'DM Mono', monospace",
          }}>Statistics</h3>
          {[
            ['Period', stats.label],
            ['Data Points', stats.points?.toLocaleString()],
            ['Places Visited', stats.visits?.toLocaleString(), true],
            ['Unique Places', stats.uniquePlaces?.toLocaleString()],
            ['Trips', stats.trips?.toLocaleString()],
            ['Total Distance', `${((stats.totalDist||0)/1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')} km`, true],
          ].map(([label, value, accent], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{label}</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.9rem', fontWeight: 500,
                color: accent ? 'var(--accent)' : 'var(--text)',
              }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Month Bar */}
      {hasData && currentYear && (
        <div style={{
          ...uiPanel, position: 'absolute', bottom: 80, left: '50%',
          transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 3, padding: 4,
        }}>
          <button onClick={() => setCurrentMonth(null)} style={{
            padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem',
            fontFamily: "'DM Mono', monospace", cursor: 'pointer', border: 'none',
            background: currentMonth === null ? 'var(--accent-2)' : 'transparent',
            color: currentMonth === null ? 'white' : 'var(--text)', fontWeight: 600,
          }}>All</button>
          {availableMonths.map(m => (
            <button key={m} onClick={() => setCurrentMonth(m)} style={{
              padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem',
              fontFamily: "'DM Mono', monospace", cursor: 'pointer', border: 'none',
              minWidth: 36, textAlign: 'center',
              background: currentMonth === m ? 'var(--accent)' : 'transparent',
              color: currentMonth === m ? 'white' : 'var(--text-dim)',
            }}>{MONTH_NAMES[m]}</button>
          ))}
        </div>
      )}

      {/* Legend */}
      {hasData && legendItems.length > 0 && (
        <div style={{
          ...uiPanel, position: 'absolute', bottom: 130, left: 16, zIndex: 1000, padding: '12px 16px',
        }}>
          {legendItems.map(item => (
            <div key={item.type} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
              fontSize: '0.75rem', color: 'var(--text-dim)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Coordinate Display (bottom-left) */}
      <div style={{
        ...uiPanel, position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
        padding: '6px 12px', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem',
        color: 'var(--text-dim)', display: 'flex', gap: 12, pointerEvents: 'none',
      }}>
        <span>Lat: <span style={{ color: 'var(--text)' }}>{cursor ? cursor.lat.toFixed(6) : '—'}</span></span>
        <span>Lng: <span style={{ color: 'var(--text)' }}>{cursor ? cursor.lng.toFixed(6) : '—'}</span></span>
      </div>

      {/* Playback Bar */}
      {hasData && (
        <div style={{
          ...uiPanel, position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        }}>
          <button onClick={togglePlay} style={{
            width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
            border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0,
          }}>{isPlaying ? '⏸' : '▶'}</button>

          <div style={{
            width: 300, height: 4, background: 'var(--surface-2)', borderRadius: 2,
            cursor: 'pointer', position: 'relative',
          }}>
            <div style={{
              height: '100%', background: 'var(--accent)', borderRadius: 2,
              width: `${playPct}%`, transition: 'width 0.05s linear',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${playPct}%`,
              transform: 'translate(-50%, -50%)', width: 12, height: 12,
              background: 'var(--accent)', borderRadius: '50%',
              boxShadow: '0 0 8px var(--accent-glow)', pointerEvents: 'none',
            }} />
          </div>

          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: '0.75rem',
            color: 'var(--text-dim)', minWidth: 70, textAlign: 'center',
          }}>{timeLabel}</div>

          <button onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 10px', color: 'var(--text)', cursor: 'pointer',
            fontSize: '0.7rem', fontFamily: "'DM Mono', monospace",
          }}>{SPEEDS[speedIdx]}×</button>
        </div>
      )}
      </div>
    </div>
  )
}
