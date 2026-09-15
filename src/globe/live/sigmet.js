// NOAA AWC International SIGMET — JSON list with per-alert coords array.
// LINE geom → LineString; anything else → Polygon.

function sigmetUrl() {
  if (import.meta.env.DEV) return '/awc-api/api/data/isigmet?format=json'
  return 'https://rebornian48.my.id/bmkg/proxy.php?h=awc&p=api/data/isigmet&q=format=json'
}

const HAZARD_COLOR = {
  TS:   '#fb8c00',
  TSGR: '#e64a19',
  TC:   '#7b1fa2',
  VA:   '#b71c1c',
  TURB: '#00838f',
  ICE:  '#0288d1',
  MTW:  '#5d4037',
  DS:   '#c9a227',
  SS:   '#c9a227',
  RDOACT: '#00c853',
}

const HAZARD_LABEL = {
  TS: 'Thunderstorm', TSGR: 'TS+Hail', TC: 'Tropical Cyclone',
  VA: 'Volcanic Ash', TURB: 'Turbulence', ICE: 'Icing',
  MTW: 'Mountain Wave', DS: 'Dust Storm', SS: 'Sand Storm',
  RDOACT: 'Radioactive Cloud',
}

function sigmetFC(list) {
  const features = []
  for (const s of list) {
    if (!Array.isArray(s.coords) || s.coords.length < 2) continue
    const ring = s.coords
      .map(c => [c.lon, c.lat])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    if (ring.length < 2) continue
    const isLine = s.geom === 'LINE'
    const geometry = isLine
      ? { type: 'LineString', coordinates: ring }
      : { type: 'Polygon', coordinates: [ring] }
    features.push({
      type: 'Feature',
      geometry,
      properties: {
        hazard: s.hazard || '',
        hazardLabel: HAZARD_LABEL[s.hazard] || s.hazard || 'Hazard',
        fir: s.firName || s.firId || '',
        validFrom: s.validTimeFrom || 0,
        validTo: s.validTimeTo || 0,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function colorExpr() {
  const args = ['match', ['get', 'hazard']]
  for (const [k, v] of Object.entries(HAZARD_COLOR)) {
    args.push(k, v)
  }
  args.push('#607d8b')
  return args
}

export const SIGMET_ENTRY = {
  id: 'sigmet-intl',
  label: 'SIGMET Aktif (NOAA AWC)',
  category: 'Aviasi',
  color: '#fb8c00',
  sourceId: 'sigmet-intl',
  dataLoader: async () => {
    const r = await fetch(sigmetUrl(), { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return sigmetFC(await r.json())
  },
  layers: () => [
    {
      id: 'sigmet-fill',
      type: 'fill',
      source: 'sigmet-intl',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': colorExpr(),
        'fill-opacity': 0.22,
        'fill-outline-color': colorExpr(),
      },
    },
    {
      id: 'sigmet-line',
      type: 'line',
      source: 'sigmet-intl',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': colorExpr(),
        'line-width': [
          'case',
          ['==', ['geometry-type'], 'LineString'], 3,
          2,
        ],
        'line-opacity': 0.9,
      },
    },
  ],
  hover: (map, setHover) => {
    for (const layerId of ['sigmet-fill', 'sigmet-line']) {
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        setHover(`${f.properties.hazardLabel} — ${f.properties.fir}`)
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    }
  },
}
