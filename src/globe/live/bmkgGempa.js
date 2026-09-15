// BMKG gempa endpoints — three JSON feeds (autogempa / gempaterkini /
// gempadirasakan). Each returns Infogempa.gempa (single object or array)
// with fields Coordinates ("lat,lng"), Magnitude, Kedalaman ("N km"),
// Wilayah, Tanggal, Jam, Potensi, and optionally Shakemap / Dirasakan.
// We turn each row into a GeoJSON Point + a data-driven circle radius +
// depth-bucketed circle color.

function bmkgUrl(host, path) {
  const devPrefix = { data: '/bmkg-cdn', www: '/bmkg-www', api: '/bmkg-api' }[host]
  if (import.meta.env.DEV) return `${devPrefix}/${path}`
  return `https://rebornian48.my.id/bmkg/proxy.php?h=${host}&p=${encodeURIComponent(path)}`
}

function parseCoords(str) {
  const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(String(str || ''))
  if (!m) return null
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
}

function parseDepthKm(str) {
  const m = /(\d+(?:\.\d+)?)/.exec(String(str || ''))
  return m ? parseFloat(m[1]) : null
}

function gempaFC(json) {
  const raw = json?.Infogempa?.gempa
  const list = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  const features = []
  for (const g of list) {
    const c = parseCoords(g.Coordinates)
    if (!c) continue
    const depthKm = parseDepthKm(g.Kedalaman)
    const mag = parseFloat(g.Magnitude) || 3
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
      properties: {
        magnitude: mag,
        depthKm: depthKm == null ? -1 : depthKm,
        wilayah: g.Wilayah || '',
        waktu: `${g.Tanggal || ''} ${g.Jam || ''}`.trim(),
        potensi: g.Potensi || '',
        dirasakan: g.Dirasakan || '',
        kedalamanLabel: g.Kedalaman || '',
        shakemap: g.Shakemap || '',
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function makeEntry({ id, label, path }) {
  const url = bmkgUrl('data', path)
  return {
    id,
    label,
    category: 'BMKG · Gempa',
    color: '#e53935',
    sourceId: id,
    dataLoader: async () => {
      const r = await fetch(url, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return gempaFC(await r.json())
    },
    layers: () => [
      {
        id: `${id}-circle`,
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'magnitude'],
            2, 5,
            9, 24,
          ],
          'circle-color': [
            'step', ['get', 'depthKm'],
            '#888',       // depth == -1 unknown
            0,   '#e53935', // 0-70 km shallow
            70,  '#fb8c00', // 70-300 intermediate
            300, '#1e88e5', // 300+ deep
          ],
          'circle-opacity': 0.6,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.4,
          'circle-stroke-opacity': 0.9,
        },
      },
    ],
    hover: (map, setHover) => {
      const layerId = `${id}-circle`
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        const p = f.properties
        setHover(`M ${p.magnitude} · ${p.wilayah} · ${p.kedalamanLabel}`)
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    },
  }
}

export const BMKG_GEMPA_ENTRIES = [
  makeEntry({ id: 'bmkg-gempa-auto',    label: 'Gempa Terbaru',        path: 'DataMKG/TEWS/autogempa.json' }),
  makeEntry({ id: 'bmkg-gempa-terkini', label: 'Gempa Terkini (M 5+)', path: 'DataMKG/TEWS/gempaterkini.json' }),
  makeEntry({ id: 'bmkg-gempa-rasa',    label: 'Gempa Dirasakan',      path: 'DataMKG/TEWS/gempadirasakan.json' }),
]
