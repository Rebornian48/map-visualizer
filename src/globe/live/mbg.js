// MBG (Makan Bergizi Gratis) — insiden keracunan per kabupaten/kota.
// Static choropleth: fill color from property `n` (jumlah bergejala)
// via a `step` expression, buckets mirror the ramp in src/mbg.js.

const BASE = import.meta.env.BASE_URL || '/'

export const MBG_ENTRY = {
  id: 'mbg-keracunan',
  label: 'Keracunan MBG',
  category: 'Insiden · MBG',
  color: '#e34a33',
  url: `${BASE}mbg/incidents.geojson`,
  sourceId: 'mbg-keracunan',
  layers: () => [
    {
      id: 'mbg-fill',
      type: 'fill',
      source: 'mbg-keracunan',
      paint: {
        'fill-color': [
          'step', ['coalesce', ['get', 'n'], 0],
          '#fee8c8',        // 0-50
          50,   '#fdbb84',  // 51-200
          200,  '#fc8d59',  // 201-500
          500,  '#e34a33',  // 501-1000
          1000, '#b30000',  // 1001-2000
          2000, '#7f0000',  // > 2000
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 0.9,
          0.72,
        ],
      },
    },
    {
      id: 'mbg-line',
      type: 'line',
      source: 'mbg-keracunan',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], '#1a1614',
          '#ffffff',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], 2,
          0.6,
        ],
      },
    },
  ],
  hover: (map, setHover) => {
    let hoveredId = null
    map.on('mousemove', 'mbg-fill', (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      if (hoveredId !== null && hoveredId !== f.id) {
        map.setFeatureState({ source: 'mbg-keracunan', id: hoveredId }, { hover: false })
      }
      hoveredId = f.id
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: 'mbg-keracunan', id: hoveredId }, { hover: true })
      }
      const p = f.properties
      setHover(`${p.kab} — ${(p.n || 0).toLocaleString('id-ID')} bergejala · ${p.kj} insiden`)
    })
    map.on('mouseleave', 'mbg-fill', () => {
      map.getCanvas().style.cursor = ''
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'mbg-keracunan', id: hoveredId }, { hover: false })
      }
      hoveredId = null
      setHover(null)
    })
  },
}
