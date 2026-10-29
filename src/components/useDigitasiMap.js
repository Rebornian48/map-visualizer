import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import * as turf from '@turf/turf'
import { BASEMAPS, BOUNDARY_SOURCES, boundaryLabelHtml } from './mapView.helpers'
import { TRANSPORT_SOURCES, buildTransportLayer } from '../transport'

const LANDUSE = {
  Sawah:      '#e9c46a',
  Kebun:      '#52b788',
  Permukiman: '#e76f51',
  Hutan:      '#1b7a43',
  Tambak:     '#4ea8de',
  Lainnya:    '#c77dff',
}

const LANDUSE_KEYS = Object.keys(LANDUSE)

const STORAGE_KEY = 'peta-lahan-v1'

const TRANSPORT_REFRESH_MS = new Map([
  ['bmkg_gempa_auto',    2 * 60 * 1000],
  ['bmkg_gempa_terkini', 2 * 60 * 1000],
  ['bmkg_gempa_rasa',    2 * 60 * 1000],
  ['bmkg_cap_nowcast',   5 * 60 * 1000],
  ['bmkg_cuaca_kota',   30 * 60 * 1000],
])

const BOUNDARY_STYLE = {
  color: '#ff3366', weight: 1, opacity: 0.7, fillOpacity: 0.05, fillColor: '#ff3366',
}
const BOUNDARY_HOVER_STYLE = {
  color: '#ff3366', weight: 2.5, opacity: 1, fillOpacity: 0.2, fillColor: '#ff3366',
}
const BOUNDARY_SELECTED_STYLE = {
  color: '#ff3366', weight: 3, opacity: 1, fillOpacity: 0.28, fillColor: '#ff3366',
}

function fmt(n, d) {
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function areaM2(layer) {
  if (!(layer instanceof L.Polygon)) return 0
  try { return turf.area(layer.toGeoJSON()) } catch { return 0 }
}

function areaText(m2) {
  return fmt(m2 / 10000, 4) + ' ha  ·  ' + fmt(m2, 0) + ' m²'
}

function pickName(props, idx) {
  const keys = ['nama', 'NAMA', 'Nama', 'name', 'NAME', 'Name', 'kode', 'KODE', 'NIB', 'nib']
  for (const k of keys) if (props[k] != null && String(props[k]).trim()) return String(props[k])
  return 'Persil ' + idx
}

function styleFor(layer, selected) {
  const guna = layer.feature?.properties?.guna_lahan
  const c = LANDUSE[guna] || LANDUSE.Lainnya
  const isSel = layer === selected
  return { color: isSel ? '#ffffff' : c, weight: isSel ? 3 : 2, fillColor: c, fillOpacity: isSel ? 0.45 : 0.3 }
}

function ensureAirspacePanes(map) {
  const defs = [['airspaceFir', 402], ['airspaceTma', 412], ['airspaceCtr', 422]]
  for (const [name, z] of defs) {
    if (!map.getPane(name)) map.createPane(name).style.zIndex = String(z)
  }
}

function boundaryFeatureHandlers(getLayer, mapInst, getSelected, setSelected) {
  return {
    mouseover: (e) => {
      if (e.target !== getSelected()) e.target.setStyle(BOUNDARY_HOVER_STYLE)
      e.target.bringToFront()
    },
    mouseout: (e) => { if (e.target !== getSelected()) getLayer().resetStyle(e.target) },
    click: (e) => {
      const sel = getSelected()
      if (sel && sel !== e.target) getLayer().resetStyle(sel)
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
  let layerRef = null
  const getLayer = () => layerRef
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
      lyr.on(boundaryFeatureHandlers(getLayer, mapInst, () => selectedLyr, (v) => { selectedLyr = v }))
    },
  })
  layerRef = layer
  layer.addTo(mapInst)
  const mapClickHandler = () => {
    if (selectedLyr) { layer.resetStyle(selectedLyr); selectedLyr = null }
  }
  mapInst.on('click', mapClickHandler)
  layer._mapClickHandler = mapClickHandler
  return layer
}

function collectParcels(parcelsGroup) {
  const features = []
  parcelsGroup.eachLayer((l) => {
    const f = l.toGeoJSON(15)
    const m2 = areaM2(l)
    f.properties = Object.assign({}, l.feature?.properties, {
      luas_m2: Math.round(m2 * 100) / 100,
      luas_ha: Math.round(m2 / 100) / 100,
    })
    features.push(f)
  })
  return { type: 'FeatureCollection', features }
}

function saveToStorage(parcelsGroup) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collectParcels(parcelsGroup))) } catch { /* ignore */ }
}

function stamp() {
  const d = new Date()
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
}

function saveBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}

export { LANDUSE, LANDUSE_KEYS, areaM2, areaText, fmt }

export function useDigitasiMap() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const baseLayersRef = useRef(null)
  const parcelsGroupRef = useRef(null)
  const counterRef = useRef(0)

  const boundaryLayerRef = useRef(null)
  const boundaryCacheRef = useRef(new Map())
  const transportLayersRef = useRef(new Map())
  const transportIntervalsRef = useRef(new Map())

  const [selected, setSelected] = useState(null)
  const [parcelVersion, setParcelVersion] = useState(0)
  const [cursor, setCursor] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)

  const [basemap, setBasemap] = useState('Satellite')
  const [boundary, setBoundary] = useState('none')
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [transportActive, setTransportActive] = useState(() => new Set())
  const [transportLoading, setTransportLoading] = useState(() => new Set())
  const [transportError, setTransportError] = useState(() => new Map())
  const [transportMeta, setTransportMeta] = useState(() => new Map())

  const selectedRef = useRef(null)
  selectedRef.current = selected

  const toastTimer = useRef(null)
  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 3200)
  }, [])

  const bump = useCallback(() => setParcelVersion(v => v + 1), [])

  function newId() {
    counterRef.current += 1
    return 'P' + String(Date.now()).slice(-6) + counterRef.current
  }

  const register = useCallback((layer) => {
    layer.feature = layer.feature || { type: 'Feature', properties: {} }
    const p = layer.feature.properties = layer.feature.properties || {}
    if (!p.id) p.id = newId()
    const pg = parcelsGroupRef.current
    if (!p.nama) p.nama = pickName(p, pg ? pg.getLayers().length : 1)
    if (!p.guna_lahan || !LANDUSE[p.guna_lahan]) p.guna_lahan = 'Lainnya'
    if (p.pemilik == null) p.pemilik = ''
    if (p.ket == null) p.ket = ''

    if (!layer._digitasiBound) {
      layer._digitasiBound = true
      layer.on('click', () => {
        setSelected(layer)
        if (pg) pg.eachLayer(l => l.setStyle && l.setStyle(styleFor(l, layer)))
        if (layer.bringToFront) layer.bringToFront()
        bump()
      })
      layer.on('pm:edit pm:dragend', () => {
        bump()
        if (pg) saveToStorage(pg)
      })
    }
    if (layer.setStyle) layer.setStyle(styleFor(layer, selectedRef.current))
  }, [bump])

  const selectParcel = useCallback((layer) => {
    setSelected(layer)
    const pg = parcelsGroupRef.current
    if (pg) pg.eachLayer(l => l.setStyle && l.setStyle(styleFor(l, layer)))
    if (layer && layer.bringToFront) layer.bringToFront()
    bump()
  }, [bump])

  // Map init
  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current, {
      zoomControl: true,
      maxZoom: 21,
    }).setView([-6.2712, 107.3028], 17)

    ensureAirspacePanes(map)

    const baseLayers = new Map()
    for (const [name, { url, opts }] of BASEMAPS) {
      const tileOpts = { ...opts, maxZoom: 21, maxNativeZoom: opts.maxZoom || 19 }
      baseLayers.set(name, L.tileLayer(url, tileOpts))
    }
    baseLayers.get('Satellite').addTo(map)
    baseLayersRef.current = baseLayers

    const parcels = L.featureGroup().addTo(map)
    parcelsGroupRef.current = parcels

    try { map.pm.setLang('id') } catch { /* lang not available */ }
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false, drawCircleMarker: false, drawPolyline: false,
      drawCircle: false, drawText: false, rotateMode: false,
    })
    map.pm.setGlobalOptions({
      layerGroup: parcels,
      snappable: true,
      snapDistance: 15,
      allowSelfIntersection: false,
      templineStyle: { color: '#ffd166' },
      hintlineStyle: { color: '#ffd166', dashArray: [5, 5] },
    })

    map.on('pm:create', (e) => {
      const layer = e.layer
      layer.feature = { type: 'Feature', properties: { nama: 'Persil ' + parcels.getLayers().length } }
      register(layer)
      setSelected(layer)
      parcels.eachLayer(l => l.setStyle && l.setStyle(styleFor(l, layer)))
      bump()
      saveToStorage(parcels)
      toast('Persil baru dibuat. Lengkapi atributnya di panel kiri.')
    })

    map.on('pm:remove', (e) => {
      parcels.removeLayer(e.layer)
      setSelected(prev => prev === e.layer ? null : prev)
      bump()
      saveToStorage(parcels)
    })

    map.on('pm:cut', (e) => {
      const props = Object.assign({}, e.originalLayer.feature?.properties)
      parcels.removeLayer(e.originalLayer)
      e.layer.feature = { type: 'Feature', properties: props }
      if (!parcels.hasLayer(e.layer)) parcels.addLayer(e.layer)
      register(e.layer)
      setSelected(e.layer)
      parcels.eachLayer(l => l.setStyle && l.setStyle(styleFor(l, e.layer)))
      bump()
      saveToStorage(parcels)
    })

    map.on('mousemove', (e) => setCursor(e.latlng))
    map.on('mouseout', () => setCursor(null))

    // Load from localStorage or seed
    let loaded = false
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const fc = JSON.parse(raw)
        if (fc?.features?.length) {
          L.geoJSON(fc).eachLayer(l => { parcels.addLayer(l); register(l) })
          loaded = true
        }
      }
    } catch { /* ignore */ }

    if (!loaded) {
      const sample = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { nama: 'Contoh A-01', pemilik: 'Contoh', guna_lahan: 'Sawah', ket: 'Data contoh, boleh dihapus' },
            geometry: { type: 'Polygon', coordinates: [[[107.3016, -6.2705], [107.3026, -6.2704], [107.3027, -6.2712], [107.3017, -6.2713], [107.3016, -6.2705]]] } },
          { type: 'Feature', properties: { nama: 'Contoh A-02', pemilik: 'Contoh', guna_lahan: 'Kebun', ket: 'Data contoh, boleh dihapus' },
            geometry: { type: 'Polygon', coordinates: [[[107.3029, -6.2706], [107.3039, -6.2707], [107.3038, -6.2716], [107.3028, -6.2715], [107.3029, -6.2706]]] } },
        ],
      }
      L.geoJSON(sample).eachLayer(l => { parcels.addLayer(l); register(l) })
    }

    bump()
    if (parcels.getLayers().length) {
      map.fitBounds(parcels.getBounds(), { maxZoom: 18, padding: [40, 40] })
    }

    mapInstance.current = map
    return () => { map.remove(); mapInstance.current = null }
  }, [])

  // Basemap switching
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !baseLayersRef.current) return
    for (const [name, layer] of baseLayersRef.current) {
      if (name === basemap) {
        if (!map.hasLayer(layer)) layer.addTo(map)
      } else if (map.hasLayer(layer)) map.removeLayer(layer)
    }
  }, [basemap])

  // Boundary loading
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
      .catch(err => { if (!cancelled) console.error('Boundary load failed:', err) })
      .finally(() => { if (!cancelled) setBoundaryLoading(false) })

    return () => { cancelled = true }
  }, [boundary])

  // Transport toggle
  const onToggleTransport = useCallback((key) => {
    const map = mapInstance.current
    if (!map) return

    const existing = transportLayersRef.current.get(key)
    if (existing) {
      const intId = transportIntervalsRef.current.get(key)
      if (intId) { clearInterval(intId); transportIntervalsRef.current.delete(key) }
      map.removeLayer(existing)
      transportLayersRef.current.delete(key)
      setTransportActive(prev => { const s = new Set(prev); s.delete(key); return s })
      setTransportMeta(prev => { const m = new Map(prev); m.delete(key); return m })
      return
    }

    const src = TRANSPORT_SOURCES.find(s => s.key === key)
    if (!src) return

    setTransportLoading(prev => { const s = new Set(prev); s.add(key); return s })
    setTransportError(prev => { const m = new Map(prev); m.delete(key); return m })

    buildTransportLayer(src).then(layer => {
      if (!mapInstance.current) return
      layer.addTo(mapInstance.current)
      transportLayersRef.current.set(key, layer)
      setTransportActive(prev => { const s = new Set(prev); s.add(key); return s })
      if (layer._meta) setTransportMeta(prev => { const m = new Map(prev); m.set(key, layer._meta); return m })

      const ms = TRANSPORT_REFRESH_MS.get(key)
      if (ms) {
        const id = setInterval(async () => {
          const m = mapInstance.current
          const old = transportLayersRef.current.get(key)
          if (!m || !old) return
          try {
            const fresh = await buildTransportLayer(src)
            m.removeLayer(old)
            fresh.addTo(m)
            transportLayersRef.current.set(key, fresh)
            if (fresh._meta) setTransportMeta(prev => { const mp = new Map(prev); mp.set(key, fresh._meta); return mp })
          } catch { /* silent refresh failure */ }
        }, ms)
        transportIntervalsRef.current.set(key, id)
      }
    }).catch(err => {
      setTransportError(prev => { const m = new Map(prev); m.set(key, err.message); return m })
    }).finally(() => {
      setTransportLoading(prev => { const s = new Set(prev); s.delete(key); return s })
    })
  }, [])

  // Transport cleanup
  useEffect(() => {
    return () => {
      for (const id of transportIntervalsRef.current.values()) clearInterval(id)
    }
  }, [])

  // Parcel actions
  const updateAttribute = useCallback((key, value) => {
    const sel = selectedRef.current
    if (!sel?.feature?.properties) return
    sel.feature.properties[key] = value
    if (sel.setStyle) sel.setStyle(styleFor(sel, sel))
    bump()
    if (parcelsGroupRef.current) saveToStorage(parcelsGroupRef.current)
  }, [bump])

  const deleteSelected = useCallback(() => {
    const sel = selectedRef.current
    if (!sel) return
    const pg = parcelsGroupRef.current
    if (pg) pg.removeLayer(sel)
    setSelected(null)
    bump()
    if (pg) saveToStorage(pg)
  }, [bump])

  const clearAll = useCallback(() => {
    const pg = parcelsGroupRef.current
    if (pg) pg.clearLayers()
    setSelected(null)
    bump()
    if (pg) saveToStorage(pg)
    toast('Semua persil dihapus.')
  }, [bump, toast])

  const fitAll = useCallback(() => {
    const pg = parcelsGroupRef.current
    const map = mapInstance.current
    if (pg && map && pg.getLayers().length) {
      map.fitBounds(pg.getBounds(), { maxZoom: 19, padding: [30, 30] })
    }
  }, [])

  const addGeoJSON = useCallback((gj, sourceName) => {
    const pg = parcelsGroupRef.current
    const map = mapInstance.current
    if (!pg || !map) return
    let added = 0
    const temp = L.geoJSON(gj, {
      pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 6 }),
    })
    temp.eachLayer(l => {
      if (l instanceof L.LayerGroup) return
      pg.addLayer(l)
      register(l)
      added += 1
    })
    if (added) {
      bump()
      saveToStorage(pg)
      map.fitBounds(pg.getBounds(), { maxZoom: 19, padding: [30, 30] })
    }
    toast(added ? added + ' fitur dimuat dari ' + sourceName : 'Tidak ada fitur yang bisa dibaca dari ' + sourceName)
  }, [register, bump, toast])

  const importFile = useCallback(async (file) => {
    const name = file.name.toLowerCase()
    try {
      if (name.endsWith('.zip')) {
        const shp = (await import('shpjs')).default
        const buf = await file.arrayBuffer()
        let result = await shp(buf)
        const list = Array.isArray(result) ? result : [result]
        list.forEach(fc => addGeoJSON(fc, file.name))
      } else if (name.endsWith('.geojson') || name.endsWith('.json')) {
        const gj = JSON.parse(await file.text())
        addGeoJSON(gj, file.name)
      } else if (name.endsWith('.shp')) {
        toast('Kemas .shp, .shx, .dbf, dan .prj ke dalam satu file .zip, lalu unggah .zip-nya.')
      } else {
        toast('Format ' + file.name + ' belum didukung. Gunakan .zip (Shapefile) atau .geojson.')
      }
    } catch (err) {
      console.error(err)
      toast('Gagal membaca ' + file.name + '. Periksa apakah filenya utuh dan formatnya benar.')
    }
  }, [addGeoJSON, toast])

  const exportGeoJSON = useCallback(() => {
    const pg = parcelsGroupRef.current
    if (!pg) return
    const fc = collectParcels(pg)
    if (!fc.features.length) { toast('Belum ada persil untuk diekspor.'); return }
    saveBlob(
      new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' }),
      'peta-lahan-' + stamp() + '.geojson',
    )
    toast('GeoJSON diunduh (' + fc.features.length + ' persil).')
  }, [toast])

  const exportSHP = useCallback(async () => {
    const pg = parcelsGroupRef.current
    if (!pg) return
    const fc = collectParcels(pg)
    if (!fc.features.length) { toast('Belum ada persil untuk diekspor.'); return }
    fc.features.forEach(f => {
      const out = {}
      Object.entries(f.properties).forEach(([k, v]) => {
        if (v === null || typeof v === 'object') return
        const key = k.slice(0, 10)
        if (!(key in out)) out[key] = v
      })
      f.properties = out
    })
    try {
      const shpwrite = (await import('@mapbox/shp-write')).default
      const blob = await shpwrite.zip(fc, {
        outputType: 'blob',
        compression: 'DEFLATE',
        types: { polygon: 'persil_lahan', point: 'titik', polyline: 'garis' },
      })
      saveBlob(blob, 'peta-lahan-' + stamp() + '-shp.zip')
      toast('Shapefile (.zip) diunduh. Sistem koordinat: WGS 84 (EPSG:4326).')
    } catch (err) {
      console.error(err)
      toast('Gagal membuat Shapefile. Lihat konsol browser untuk detailnya.')
    }
  }, [toast])

  // Computed stats
  const stats = (() => {
    const pg = parcelsGroupRef.current
    if (!pg) return { count: 0, area: 0 }
    let total = 0
    const layers = pg.getLayers()
    layers.forEach(l => { total += areaM2(l) })
    return { count: layers.length, area: total }
  })()

  // Get parcels list for rendering
  const getParcels = useCallback(() => {
    const pg = parcelsGroupRef.current
    if (!pg) return []
    return pg.getLayers().map(l => ({
      layer: l,
      props: l.feature?.properties || {},
      area: areaM2(l),
    }))
  }, [parcelVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    refs: { mapRef, mapInstance },
    parcelState: { selected, stats, getParcels, parcelVersion },
    layerState: {
      basemap, boundary, boundaryLoading,
      transportActive, transportLoading, transportError, transportMeta,
    },
    setters: { setBasemap, setBoundary },
    actions: {
      onToggleTransport,
      selectParcel,
      updateAttribute,
      deleteSelected,
      clearAll,
      fitAll,
      importFile,
      exportGeoJSON,
      exportSHP,
      toast,
    },
    ui: { cursor, toastMsg },
  }
}
