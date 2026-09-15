// KRL / LRT / MRT — two GeoJSON line files + one KML station file.
// The GeoJSON already carries per-feature colour_hex/colour → passthrough
// as a `color` property. The KML we parse client-side into Points.

function railUrl(filename) {
  if (import.meta.env.DEV) return `/otsum-cdn/transport-data/${filename}`
  return `https://rebornian48.my.id/otsum/proxy.php?f=${encodeURIComponent(filename)}`
}

const RAIL_PALETTE = ['#3388ff', '#e93d46', '#00a651', '#8b5a2b', '#ff69b4', '#9c27b0', '#ff9800', '#43a2c5']

function normalizeColor(c) {
  if (!c) return null
  const s = String(c).trim()
  if (!s) return null
  return s.startsWith('#') ? s : `#${s}`
}

// The lines source uses either a colour_hex/colour property or falls back
// to a palette-cycling index. Add a per-feature `color` property so the
// paint expression stays trivial.
function railLinesToFC(raw) {
  const features = []
  let idx = 0
  for (const feat of raw.features || []) {
    const props = feat.properties || {}
    const color = normalizeColor(props.colour_hex || props.colour)
      || RAIL_PALETTE[idx % RAIL_PALETTE.length]
    features.push({
      type: 'Feature',
      geometry: feat.geometry,
      properties: {
        name: props.name || props.ref || props.slug || 'rel',
        network: props.network || '',
        color,
      },
    })
    idx++
  }
  return { type: 'FeatureCollection', features }
}

function makeRailLinesEntry({ id, label, file }) {
  return {
    id,
    label,
    category: 'Rel',
    color: '#3388ff',
    sourceId: id,
    dataLoader: async () => {
      const r = await fetch(railUrl(file))
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return railLinesToFC(await r.json())
    },
    layers: () => [
      {
        id: `${id}-line`,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#3388ff'],
          'line-width': 3,
          'line-opacity': 0.9,
        },
      },
    ],
    hover: (map, setHover) => {
      const layerId = `${id}-line`
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        setHover(`${f.properties.name}${f.properties.network ? ' · ' + f.properties.network : ''}`)
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    },
  }
}

function parseKmlPoints(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const placemarks = doc.getElementsByTagName('Placemark')
  const out = []
  for (const p of placemarks) {
    const nameEl = p.getElementsByTagName('name')[0]
    const name = nameEl ? nameEl.textContent.trim() : ''
    const pt = p.getElementsByTagName('Point')[0]
    if (!pt) continue
    const coordsEl = pt.getElementsByTagName('coordinates')[0]
    if (!coordsEl) continue
    const parts = coordsEl.textContent.trim().split(',')
    const lng = parseFloat(parts[0])
    const lat = parseFloat(parts[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      out.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { name },
      })
    }
  }
  return { type: 'FeatureCollection', features: out }
}

export const KRL_LINES_ENTRY = makeRailLinesEntry({
  id: 'krl-lines', label: 'KRL — garis rel', file: 'krl_lines.geojson',
})
export const LRT_MRT_LINES_ENTRY = makeRailLinesEntry({
  id: 'lrt-mrt-lines', label: 'LRT & MRT — garis rel', file: 'lrt_mrt_lines.geojson',
})

export const RAIL_STATIONS_ENTRY = {
  id: 'rail-stations',
  label: 'Stasiun KRL/LRT/MRT',
  category: 'Rel',
  color: '#ffcc00',
  sourceId: 'rail-stations',
  dataLoader: async () => {
    const r = await fetch(railUrl('rails.kml'))
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return parseKmlPoints(await r.text())
  },
  layers: () => [
    {
      id: 'rail-stations-circle',
      type: 'circle',
      source: 'rail-stations',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6],
        'circle-color': '#ffcc00',
        'circle-stroke-color': '#1a1a2e',
        'circle-stroke-width': 1.2,
      },
    },
  ],
  hover: (map, setHover) => {
    map.on('mousemove', 'rail-stations-circle', (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      setHover(`Stasiun ${f.properties.name}`)
    })
    map.on('mouseleave', 'rail-stations-circle', () => {
      map.getCanvas().style.cursor = ''
      setHover(null)
    })
  },
}
