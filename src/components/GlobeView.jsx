import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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

function buildStyle(basemapKey) {
  const b = BASEMAPS[basemapKey]
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
      { id: 'basemap', type: 'raster', source: 'basemap' },
    ],
  }
}

export default function GlobeView({ onBack, theme = 'dark' }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [basemap, setBasemap] = useState('osm')
  const [projection, setProjection] = useState('globe') // 'globe' | 'mercator'
  const [showProvinsi, setShowProvinsi] = useState(true)
  const [status, setStatus] = useState('Menyiapkan peta…')
  const [hover, setHover] = useState(null)

  // Init map once
  useEffect(() => {
    if (!mapRef.current) return
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: buildStyle(basemap),
      center: [118, -2.5],
      zoom: 3.2,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', async () => {
      map.setProjection({ type: projection })
      setStatus('Memuat batas provinsi…')
      try {
        const r = await fetch(`${BASE}boundaries/provinsi.json`)
        const gj = await r.json()
        if (!map.getSource('provinsi')) {
          map.addSource('provinsi', { type: 'geojson', data: gj, promoteId: 'WADMPR' })
        }
        addProvinsiLayers(map)
        wireHoverPopup(map, setHover)
        setStatus('')
      } catch (e) {
        setStatus('Gagal memuat provinsi: ' + e.message)
      }
    })

    mapInstance.current = map
    if (import.meta.env.DEV) window.__mlMap = map
    return () => { map.remove(); mapInstance.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // React to basemap change — swap style but preserve overlays
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !map.isStyleLoaded()) return
    const newStyle = buildStyle(basemap)
    map.setStyle(newStyle, { diff: false })
    map.once('styledata', () => {
      map.setProjection({ type: projection })
      if (!map.getSource('provinsi')) {
        fetch(`${BASE}boundaries/provinsi.json`)
          .then(r => r.json())
          .then(gj => {
            map.addSource('provinsi', { type: 'geojson', data: gj, promoteId: 'WADMPR' })
            addProvinsiLayers(map, showProvinsi)
            wireHoverPopup(map, setHover)
          })
      } else {
        addProvinsiLayers(map, showProvinsi)
      }
    })
  }, [basemap])

  // Projection toggle
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    try { map.setProjection({ type: projection }) } catch { /* pre-load */ }
  }, [projection])

  // Provinsi visibility
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    for (const id of ['provinsi-fill', 'provinsi-line']) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', showProvinsi ? 'visible' : 'none')
      }
    }
  }, [showProvinsi])

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
  const btn = (active) => ({
    ...panel, padding: '6px 10px', cursor: 'pointer',
    background: active
      ? (dark ? '#f36' : '#e6204e')
      : panel.background,
    color: active ? '#fff' : panel.color,
    borderColor: active ? 'transparent' : panel.border,
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
          onClick={() => setShowProvinsi(v => !v)}
          style={{ ...btn(showProvinsi), pointerEvents: 'auto' }}
        >Provinsi</button>
        <button
          onClick={cycleProjection}
          style={{ ...btn(projection === 'globe'), pointerEvents: 'auto' }}
          title="Toggle globe/mercator"
        >{projection === 'globe' ? '🌐 Globe' : '🗺 Mercator'}</button>
      </div>

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

function addProvinsiLayers(map, visible = true) {
  const visibility = visible ? 'visible' : 'none'
  if (!map.getLayer('provinsi-fill')) {
    map.addLayer({
      id: 'provinsi-fill',
      type: 'fill',
      source: 'provinsi',
      layout: { visibility },
      paint: {
        'fill-color': '#f36',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 0.4,
          0.12,
        ],
      },
    })
  }
  if (!map.getLayer('provinsi-line')) {
    map.addLayer({
      id: 'provinsi-line',
      type: 'line',
      source: 'provinsi',
      layout: { visibility, 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#f36',
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 2.5,
          1.5,
        ],
      },
    })
  }
}

function wireHoverPopup(map, setHover) {
  let hoveredId = null
  map.on('mousemove', 'provinsi-fill', (e) => {
    const f = e.features && e.features[0]
    if (!f) return
    map.getCanvas().style.cursor = 'pointer'
    if (hoveredId !== null) {
      map.setFeatureState({ source: 'provinsi', id: hoveredId }, { hover: false })
    }
    hoveredId = f.id
    map.setFeatureState({ source: 'provinsi', id: hoveredId }, { hover: true })
    setHover(f.properties?.WADMPR || '(tanpa nama)')
  })
  map.on('mouseleave', 'provinsi-fill', () => {
    map.getCanvas().style.cursor = ''
    if (hoveredId !== null) {
      map.setFeatureState({ source: 'provinsi', id: hoveredId }, { hover: false })
    }
    hoveredId = null
    setHover(null)
  })
}
