import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LAYER_REGISTRY, LAYER_CATEGORIES } from '../globe/layers'

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

export default function GlobeView({ onBack, theme = 'dark' }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const loadedLayersRef = useRef(new Set()) // layer ids currently mounted
  const dataCacheRef = useRef(new Map())    // url -> Promise<GeoJSON>
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState('osm')
  const [projection, setProjection] = useState('globe')
  const [active, setActive] = useState(() => new Set(['provinsi']))
  const [status, setStatus] = useState('Menyiapkan peta…')
  const [hover, setHover] = useState(null)
  const [panelOpen, setPanelOpen] = useState(true)

  const registry = useMemo(() => LAYER_REGISTRY, [])

  // Init map once
  useEffect(() => {
    if (!mapRef.current) return
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: buildStyle(basemap, theme),
      center: [118, -2.5],
      zoom: 3.2,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      map.setProjection({ type: projection })
      setStatus('')
      setReady(true)
      // Mount initially-active layers
      for (const id of active) {
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus)
      }
    })

    mapInstance.current = map
    if (import.meta.env.DEV) window.__mlMap = map
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
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus)
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
        mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus)
      }
    }
    for (const id of Array.from(loadedLayersRef.current)) {
      if (!active.has(id)) {
        unmountLayer(map, id, registry, loadedLayersRef)
      }
    }
  }, [active, registry, ready])

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
        <button onClick={onBack} style={{ ...btn(false), pointerEvents: 'auto' }}>← Kembali</button>
        <div style={{ ...panel, padding: '6px 10px', pointerEvents: 'auto' }}>
          <strong>Globe POC</strong> · MapLibre GL
        </div>
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

      {/* Status / hover readout */}
      {(status || hover) && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          ...panel, padding: '8px 12px', maxWidth: 320,
        }}>
          {status && <div style={{ color: '#f36' }}>{status}</div>}
          {hover && <div><strong>{hover}</strong></div>}
        </div>
      )}
    </div>
  )
}

// ── Layer mount/unmount plumbing ────────────────────────────────
async function mountLayer(map, id, registry, dataCacheRef, loadedLayersRef, setHover, setStatus) {
  const def = registry.find(l => l.id === id)
  if (!def || loadedLayersRef.current.has(id)) return
  loadedLayersRef.current.add(id) // optimistic; prevents re-entry
  try {
    let data
    if (def.url) {
      if (!dataCacheRef.current.has(def.url)) {
        setStatus(`Memuat ${def.label}…`)
        dataCacheRef.current.set(def.url, fetch(def.url).then(r => r.json()))
      }
      data = await dataCacheRef.current.get(def.url)
      setStatus('')
    }
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

function unmountLayer(map, id, registry, loadedLayersRef) {
  const def = registry.find(l => l.id === id)
  if (!def) return
  for (const layer of def.layers({ theme: 'dark' })) {
    if (map.getLayer(layer.id)) map.removeLayer(layer.id)
  }
  // Keep the source for cache — cheap to leave, avoids re-fetch on re-enable
  loadedLayersRef.current.delete(id)
}
