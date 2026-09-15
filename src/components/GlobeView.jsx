import React, { useEffect, useRef, useState, useCallback, useMemo, Suspense } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LAYER_REGISTRY, LAYER_CATEGORIES } from '../globe/layers'
import {
  ensureTimelineLayers, setStaticData, clearTimelineData,
  fitToTimeline, filterByMonth, computeStats, buildLegend, startPlayback,
} from '../globe/timeline'
// Lazy — pulls in the MediaRecorder + canvas compositing code only when
// the user actually clicks Export Video.
const GlobeExportModal = React.lazy(() => import('../globe/ExportModal'))

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SPEEDS = [1, 2, 5, 10]

// localStorage keys for cross-session preferences. Individual reads are
// wrapped in try/catch so a private window / disabled storage never
// crashes the map — the fallback is the built-in default.
const LS = {
  basemap:    'globe-basemap',
  projection: 'globe-projection',
  panelOpen:  'globe-panel-open',
  active:     'globe-active-layers',
}
function loadPref(key, fallback, parse = (v) => v) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : parse(raw)
  } catch { return fallback }
}
function savePref(key, value) {
  try { localStorage.setItem(key, String(value)) } catch { /* noop */ }
}
function saveJsonPref(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

const BASE = import.meta.env.BASE_URL || '/'

const BASEMAPS = {
  osm: {
    label: 'OpenStreetMap',
    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256, maxzoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  esri: {
    label: 'Esri Satellite',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256, maxzoom: 19,
    attribution: 'Tiles &copy; Esri',
  },
  topo: {
    label: 'OpenTopoMap',
    tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
            'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
    tileSize: 256, maxzoom: 17,
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
  },
}

// Raster paint tweaks for dark mode — leaves the overlay canvas alone.
// Only applied to non-satellite basemaps in the dark theme.
const RASTER_DARK_PAINT = {
  'raster-hue-rotate': 180,
  'raster-saturation': -0.5,
  'raster-brightness-min': 0.10,
  'raster-brightness-max': 0.55,
  'raster-contrast': -0.05,
}
const DARK_TWEAKABLE = new Set(['osm', 'topo'])

function buildStyle(basemapKey, theme) {
  const b = BASEMAPS[basemapKey]
  const useDark = theme === 'dark' && DARK_TWEAKABLE.has(basemapKey)
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      basemap: {
        type: 'raster',
        tiles: b.tiles,
        tileSize: b.tileSize,
        maxzoom: b.maxzoom,
        attribution: b.attribution,
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
        paint: useDark ? RASTER_DARK_PAINT : {},
      },
    ],
  }
}

export default function GlobeView({
  theme = 'dark', yearData, onFile,
  onOpenInfo, onOpenLegacy,
  // `onBack` accepted for back-compat with the earlier /globe POC route.
  onBack,
}) {
  const mapRef = useRef(null)
  const fileInputRef = useRef(null)
  const mapInstance = useRef(null)
  const loadedLayersRef = useRef(new Set()) // layer ids currently mounted
  const dataCacheRef = useRef(new Map())    // url -> Promise<GeoJSON>
  const customCleanupsRef = useRef(new Map()) // layer id -> cleanup fn (customMount path)
  const playbackRef = useRef(null) // { stop } handle for the current playback
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState(() => loadPref(LS.basemap, 'osm'))
  const [projection, setProjection] = useState(() => loadPref(LS.projection, 'globe'))
  const [active, setActive] = useState(() => new Set(loadPref(
    LS.active, ['provinsi'],
    (raw) => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : ['provinsi'] } catch { return ['provinsi'] } },
  )))
  const [status, setStatus] = useState('Menyiapkan peta…')
  const [dragActive, setDragActive] = useState(false)
  const [firstVisit, setFirstVisit] = useState(() => loadPref('globe-first-visit', '1') === '1')
  // Timeline state (mirrors the Leaflet controller so behaviour matches).
  const [currentYear, setCurrentYear] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(null)
  const [stats, setStats] = useState(null)
  const [legendItems, setLegendItems] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIdx, setSpeedIdx] = useState(0)
  const [playPct, setPlayPct] = useState(0)
  const [timeLabel, setTimeLabel] = useState('—')
  const [showExport, setShowExport] = useState(false)
  const [hover, setHover] = useState(null)
  const [panelOpen, setPanelOpen] = useState(() => loadPref(LS.panelOpen, '1') === '1')

  const registry = useMemo(() => LAYER_REGISTRY, [])

  // ── Preference persistence ────────────────────────────────────
  useEffect(() => { savePref(LS.basemap, basemap) }, [basemap])
  useEffect(() => { savePref(LS.projection, projection) }, [projection])
  useEffect(() => { savePref(LS.panelOpen, panelOpen ? '1' : '0') }, [panelOpen])
  useEffect(() => { saveJsonPref(LS.active, [...active]) }, [active])

  // ── Escape key: close modal → close panel ─────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (showExport) { setShowExport(false); return }
      if (firstVisit) { setFirstVisit(false); savePref('globe-first-visit', '0'); return }
      if (panelOpen)  { setPanelOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showExport, panelOpen, firstVisit])

  // ── Drag-drop file overlay ────────────────────────────────────
  // Only wire when onFile is provided (parent controls timeline loading).
  useEffect(() => {
    if (!onFile) return
    // Track a counter so nested dragenter/dragleave from child elements
    // don't flap the overlay on and off.
    let depth = 0
    const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const onDragEnter = (e) => {
      if (!isFileDrag(e)) return
      depth += 1
      setDragActive(true)
    }
    const onDragOver = (e) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (e) => {
      if (!isFileDrag(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragActive(false)
    }
    const onDrop = (e) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      depth = 0
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) onFile(f)
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFile])

  const dismissFirstVisit = useCallback(() => {
    setFirstVisit(false)
    savePref('globe-first-visit', '0')
  }, [])

  // Init map once
  useEffect(() => {
    if (!mapRef.current) return
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: buildStyle(basemap, theme),
      center: [118, -2.5],
      zoom: 3.2,
      attributionControl: false,
      // Required so we can read the WebGL canvas back for video export.
      preserveDrawingBuffer: true,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      map.setProjection({ type: projection })
      setStatus('')
      setReady(true)
      // Mount initially-active layers
      for (const id of active) {
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus, customCleanupsRef)
      }
    })

    mapInstance.current = map
    window.__mlMap = map // POC: exposed for debug in dev & prod
    return () => { map.remove(); mapInstance.current = null; loadedLayersRef.current = new Set() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // React to basemap or theme change — swap style but re-mount active overlays
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !ready) return
    map.setStyle(buildStyle(basemap, theme), { diff: false })
    map.once('styledata', () => {
      map.setProjection({ type: projection })
      loadedLayersRef.current = new Set()
      for (const id of active) {
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus, customCleanupsRef)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap, theme, ready])

  // Projection toggle
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    try { map.setProjection({ type: projection }) } catch { /* pre-load */ }
  }, [projection])

  // Active set change — mount/unmount deltas
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !ready) return
    for (const id of active) {
      if (!loadedLayersRef.current.has(id)) {
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus, customCleanupsRef)
      }
    }
    for (const id of Array.from(loadedLayersRef.current)) {
      if (!active.has(id)) {
        unmountLayer(map, id, registry, loadedLayersRef, customCleanupsRef)
      }
    }
  }, [active, registry, ready])

  // Timeline: derive current year (default = latest available) whenever data changes.
  useEffect(() => {
    if (!yearData) { setCurrentYear(null); setCurrentMonth(null); return }
    const sorted = [...yearData.keys()].sort((a, b) => a - b)
    setCurrentYear(sorted[sorted.length - 1])
    setCurrentMonth(null)
  }, [yearData])

  // Render timeline points/visits whenever data or the year/month picker changes.
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !ready) return
    // Stop any running playback — swapping the year mid-play would strand the head.
    if (playbackRef.current) { playbackRef.current.stop(); playbackRef.current = null }
    setIsPlaying(false); setPlayPct(0); setTimeLabel('—')

    if (!yearData || currentYear === null) {
      clearTimelineData(map)
      setStats(null); setLegendItems([])
      return
    }
    const yd = yearData.get(currentYear)
    if (!yd) return
    const filtered = filterByMonth(yd, currentMonth)
    setStaticData(map, filtered)
    setStats(computeStats(filtered.points, filtered.visits, filtered.activities,
                          currentYear, currentMonth, MONTH_NAMES))
    setLegendItems(buildLegend(filtered.activities))
    fitToTimeline(map, filtered)
  }, [yearData, currentYear, currentMonth, ready])

  const togglePlay = useCallback(() => {
    const map = mapInstance.current
    if (!map || !yearData || currentYear === null) return
    if (isPlaying) {
      playbackRef.current?.stop()
      playbackRef.current = null
      setIsPlaying(false)
      // Re-render the static view so points reappear.
      const yd = yearData.get(currentYear)
      if (yd) setStaticData(map, filterByMonth(yd, currentMonth))
      return
    }
    const yd = yearData.get(currentYear)
    if (!yd) return
    const filtered = filterByMonth(yd, currentMonth)
    if (filtered.points.length < 2) return
    setIsPlaying(true)
    playbackRef.current = startPlayback(map, filtered.points, {
      speed: SPEEDS[speedIdx],
      onProgress: ({ pct, timeLabel: t }) => { setPlayPct(pct); setTimeLabel(t) },
      onDone: () => { setIsPlaying(false); playbackRef.current = null },
    })
  }, [yearData, currentYear, currentMonth, isPlaying, speedIdx])

  const toggle = useCallback((id) => {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const cycleProjection = useCallback(() => {
    setProjection(p => p === 'globe' ? 'mercator' : 'globe')
  }, [])

  const dark = theme === 'dark'

  const panel = {
    background: dark ? 'rgba(18,18,26,0.9)' : 'rgba(255,255,255,0.92)',
    color: dark ? '#e8e8f0' : '#1a1a2e',
    border: `1px solid ${dark ? '#2a2a3a' : '#d0d1da'}`,
    borderRadius: 10,
    padding: '10px 12px',
    boxShadow: dark ? '0 4px 24px rgba(0,0,0,0.5)' : '0 4px 24px rgba(0,0,0,0.12)',
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  }
  const btn = (activeBtn) => ({
    ...panel, padding: '6px 10px', cursor: 'pointer',
    background: activeBtn ? (dark ? '#f36' : '#e6204e') : panel.background,
    color: activeBtn ? '#fff' : panel.color,
    borderColor: activeBtn ? 'transparent' : panel.border,
    fontSize: 12, fontWeight: 500,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: dark ? '#0a0a0f' : '#f0f1f5' }}>
      <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top toolbar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'none',
      }}>
        {onBack && (
          <button onClick={onBack} style={{ ...btn(false), pointerEvents: 'auto' }}>← Kembali</button>
        )}
        <div style={{ ...panel, padding: '6px 10px', pointerEvents: 'auto' }}>
          <strong>Map Visualizer</strong> · MapLibre GL
        </div>
        {onOpenInfo && (
          <button
            onClick={onOpenInfo}
            style={{ ...btn(false), pointerEvents: 'auto' }}
            title="Tentang data & sumber"
          >ℹ Info</button>
        )}
        {onOpenLegacy && (
          <button
            onClick={onOpenLegacy}
            style={{ ...btn(false), pointerEvents: 'auto' }}
            title="Buka viewer Leaflet lama (fitur beku)"
          >📍 Leaflet</button>
        )}
        {onFile && (
          <>
            <input
              ref={fileInputRef} type="file" accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ ...btn(!!yearData), pointerEvents: 'auto' }}
              title="Load Google Location History Timeline.json"
            >{yearData ? '📂 Ganti Timeline' : '📂 Load Timeline JSON'}</button>
          </>
        )}
        {yearData && (
          <button
            onClick={() => setShowExport(true)}
            style={{ ...btn(false), pointerEvents: 'auto' }}
            title="Export video timeline"
          >🎬 Export</button>
        )}
        <div style={{ flex: 1 }} />
        <select
          value={basemap}
          onChange={(e) => setBasemap(e.target.value)}
          style={{ ...btn(false), pointerEvents: 'auto', appearance: 'auto' }}
        >
          {Object.entries(BASEMAPS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={cycleProjection}
          style={{ ...btn(projection === 'globe'), pointerEvents: 'auto' }}
          title="Toggle globe/mercator"
        >{projection === 'globe' ? '🌐 Globe' : '🗺 Mercator'}</button>
        <button
          onClick={() => setPanelOpen(o => !o)}
          style={{ ...btn(panelOpen), pointerEvents: 'auto' }}
        >{panelOpen ? 'Sembunyikan Layer' : 'Tampilkan Layer'}</button>
      </div>

      {/* Layer panel */}
      {panelOpen && (
        <div style={{
          position: 'absolute', top: 60, right: 12, zIndex: 10,
          ...panel, padding: '10px 12px', width: 240, maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
        }}>
          {LAYER_CATEGORIES.map(cat => {
            const items = registry.filter(l => l.category === cat)
            if (items.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: dark ? '#8888a0' : '#6b6b80', marginBottom: 6, fontWeight: 600,
                }}>{cat}</div>
                {items.map(l => (
                  <label key={l.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px',
                    cursor: 'pointer', fontSize: 12,
                  }}>
                    <input
                      type="checkbox"
                      checked={active.has(l.id)}
                      onChange={() => toggle(l.id)}
                      style={{ margin: 0, cursor: 'pointer' }}
                    />
                    <span style={{
                      width: 10, height: 10, borderRadius: 2, background: l.color || '#888',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1 }}>{l.label}</span>
                  </label>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Export modal — lazy, mount only when the user opens it. */}
      {showExport && yearData && (
        <Suspense fallback={null}>
          <GlobeExportModal
            yearData={yearData}
            map={mapInstance.current}
            panel={panel} dark={dark}
            onClose={() => setShowExport(false)}
          />
        </Suspense>
      )}

      {/* Timeline controls — only visible when data is loaded. */}
      {yearData && (
        <TimelineControls
          yearData={yearData} panel={panel} btn={btn} dark={dark}
          currentYear={currentYear} setCurrentYear={setCurrentYear}
          currentMonth={currentMonth} setCurrentMonth={setCurrentMonth}
          isPlaying={isPlaying} onTogglePlay={togglePlay}
          playPct={playPct} timeLabel={timeLabel}
          speedIdx={speedIdx} setSpeedIdx={setSpeedIdx}
          stats={stats} legendItems={legendItems}
        />
      )}

      {/* Status / hover readout — nudge up if the playback bar is visible. */}
      {(status || hover) && (
        <div style={{
          position: 'absolute', bottom: yearData ? 70 : 12, left: 12, zIndex: 10,
          ...panel, padding: '8px 12px', maxWidth: 320,
        }}>
          {status && <div style={{ color: '#f36' }}>{status}</div>}
          {hover && <div><strong>{hover}</strong></div>}
        </div>
      )}

      {/* First-visit notice — matches the FirstVisitNotice component from
          the Leaflet side, but styled for the globe theme. */}
      {firstVisit && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, maxWidth: 460, width: 'calc(100% - 100px)',
          ...panel, padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 12,
          borderLeft: '3px solid #f36',
          willChange: 'transform, opacity',
          animation: 'globe-notice-in 0.3s ease-out',
        }}>
          <style>{`
            @keyframes globe-notice-in {
              from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
              to   { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
          `}</style>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5 }}>
            Drop <strong>Timeline.json</strong> ke mana saja, atau klik
            <strong> 📂 Load Timeline JSON</strong>. Export video masih dalam
            pengembangan.
          </div>
          <button onClick={dismissFirstVisit} aria-label="Close" style={{
            background: 'none', border: 'none', color: dark ? '#8888a0' : '#6b6b80',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, marginTop: -2,
          }}>×</button>
        </div>
      )}

      {/* Drop overlay — full-viewport dashed frame that lights up during
          a file drag. Pointer events off so we don't steal drag events. */}
      {dragActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none',
          border: '3px dashed #f36',
          background: dark ? 'rgba(255,51,102,0.08)' : 'rgba(255,51,102,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            ...panel, padding: '16px 24px', fontSize: 14, fontWeight: 600,
          }}>
            📂 Drop Timeline.json di sini
          </div>
        </div>
      )}
    </div>
  )
}

// Compact timeline UI: year chips + month strip + playback bar +
// mini-stats. Modeled after the Leaflet MapPanels but streamlined
// for the single-column layout of the globe view.
function TimelineControls({
  yearData, panel, btn, dark,
  currentYear, setCurrentYear, currentMonth, setCurrentMonth,
  isPlaying, onTogglePlay, playPct, timeLabel,
  speedIdx, setSpeedIdx, stats, legendItems,
}) {
  const years = useMemo(() => [...yearData.keys()].sort((a, b) => a - b), [yearData])
  const availableMonths = useMemo(() => {
    if (currentYear == null) return []
    const yd = yearData.get(currentYear)
    if (!yd) return []
    const set = new Set([
      ...yd.points.map(p => p.time.getMonth()),
      ...yd.visits.map(v => v.start.getMonth()),
    ])
    return [...set].sort((a, b) => a - b)
  }, [yearData, currentYear])

  return (
    <>
      {/* Year chips — top of the panel column, top-right below toolbar */}
      <div style={{
        position: 'absolute', top: 60, left: 12, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320,
      }}>
        <div style={{ ...panel, padding: '8px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {years.map(y => (
            <button
              key={y}
              onClick={() => { setCurrentYear(y); setCurrentMonth(null) }}
              style={{ ...btn(y === currentYear), padding: '4px 10px' }}
            >{y}</button>
          ))}
        </div>

        {/* Month strip — only if there's more than one month with data */}
        {availableMonths.length > 1 && (
          <div style={{ ...panel, padding: '6px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              onClick={() => setCurrentMonth(null)}
              style={{ ...btn(currentMonth === null), padding: '3px 8px', fontSize: 11 }}
            >All</button>
            {availableMonths.map(m => (
              <button
                key={m}
                onClick={() => setCurrentMonth(m)}
                style={{ ...btn(currentMonth === m), padding: '3px 8px', fontSize: 11 }}
              >{MONTH_NAMES[m]}</button>
            ))}
          </div>
        )}

        {/* Mini-stats panel */}
        {stats && (
          <div style={{ ...panel, padding: '8px 10px', fontSize: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{stats.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', color: dark ? '#8888a0' : '#6b6b80' }}>
              <span>Points</span><span style={{ color: dark ? '#e8e8f0' : '#1a1a2e' }}>{stats.points.toLocaleString('id-ID')}</span>
              <span>Visits</span><span style={{ color: dark ? '#e8e8f0' : '#1a1a2e' }}>{stats.visits}</span>
              <span>Places</span><span style={{ color: dark ? '#e8e8f0' : '#1a1a2e' }}>{stats.uniquePlaces}</span>
              <span>Trips</span><span style={{ color: dark ? '#e8e8f0' : '#1a1a2e' }}>{stats.trips}</span>
              <span>Distance</span><span style={{ color: dark ? '#e8e8f0' : '#1a1a2e' }}>{(stats.totalDist / 1000).toFixed(0)} km</span>
            </div>
          </div>
        )}

        {/* Legend */}
        {legendItems.length > 0 && (
          <div style={{ ...panel, padding: '8px 10px', fontSize: 11 }}>
            {legendItems.map(l => (
              <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: l.color }} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playback bar — bottom center */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, ...panel, padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        minWidth: 380,
      }}>
        <button
          onClick={onTogglePlay}
          style={{ ...btn(isPlaying), padding: '4px 12px', fontSize: 14 }}
        >{isPlaying ? '⏸' : '▶'}</button>
        <div style={{ flex: 1, position: 'relative', height: 4, background: dark ? '#2a2a3a' : '#e0e1eb', borderRadius: 2 }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${playPct}%`, background: '#f36', borderRadius: 2,
            transition: isPlaying ? 'none' : 'width 0.2s',
          }} />
        </div>
        <div style={{ fontSize: 11, minWidth: 60, textAlign: 'right', fontFamily: '"DM Mono", monospace' }}>
          {timeLabel}
        </div>
        <button
          onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
          style={{ ...btn(false), padding: '4px 8px', fontSize: 11, minWidth: 40 }}
          title="Kecepatan playback"
        >{SPEEDS[speedIdx]}×</button>
      </div>
    </>
  )
}

// ── Layer mount/unmount plumbing ────────────────────────────────
async function mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus, customCleanupsRef) {
  const def = registry.find(l => l.id === id)
  if (!def || loadedLayersRef.current.has(id)) return
  loadedLayersRef.current.add(id) // optimistic; prevents re-entry
  try {
    // Path A: custom mount — layer manages its own MapLibre + marker state
    // and returns a cleanup function stored for unmountLayer to call.
    if (def.customMount) {
      setStatus(`Memuat ${def.label}…`)
      const cleanup = await def.customMount(map, { setHover, setStatus, dataCacheRef })
      customCleanupsRef.current.set(id, cleanup)
      setStatus('')
      return
    }
    // Path B: standard GeoJSON — fetch (or dataLoader), addSource, add layers.
    let data
    if (def.dataLoader) {
      setStatus(`Memuat ${def.label}…`)
      data = await def.dataLoader({ dataCacheRef })
      setStatus('')
    } else if (def.url) {
      if (!dataCacheRef.current.has(def.url)) {
        setStatus(`Memuat ${def.label}…`)
        dataCacheRef.current.set(def.url, fetch(def.url).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }))
      }
      data = await dataCacheRef.current.get(def.url)
      setStatus('')
    }
    if (def.preprocess && data) data = def.preprocess(data)
    if (!map.getSource(def.sourceId)) {
      map.addSource(def.sourceId, {
        type: 'geojson',
        data: data || { type: 'FeatureCollection', features: [] },
        promoteId: def.promoteId,
      })
    }
    for (const layer of def.layers({ theme: 'dark' })) {
      if (!map.getLayer(layer.id)) map.addLayer(layer)
    }
    if (def.hover) def.hover(map, setHover)
  } catch (e) {
    loadedLayersRef.current.delete(id)
    setStatus(`Gagal muat ${def.label}: ${e.message}`)
  }
}

function unmountLayer(map, id, registry, loadedLayersRef, customCleanupsRef) {
  const def = registry.find(l => l.id === id)
  if (!def) return
  const cleanup = customCleanupsRef.current.get(id)
  if (cleanup) {
    try { cleanup() } catch (e) { console.warn('cleanup failed', id, e) }
    customCleanupsRef.current.delete(id)
  }
  if (def.layers) {
    for (const layer of def.layers({ theme: 'dark' })) {
      if (map.getLayer(layer.id)) map.removeLayer(layer.id)
    }
  }
  // Keep the source for cache — cheap to leave, avoids re-fetch on re-enable
  loadedLayersRef.current.delete(id)
}
