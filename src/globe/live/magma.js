// MAGMA Indonesia (PVMBG · ESDM) — volcano status list. Live source is
// the homepage HTML with `var markersGunungApi = [...]`. If the live
// fetch fails (rate-limit / IP-block / offline) we fall back to the
// vendored snapshot at public/magma/volcanoes.json.

const BASE = import.meta.env.BASE_URL || '/'

function magmaLiveUrl() {
  if (import.meta.env.DEV) return '/magma-web/'
  return 'https://rebornian48.my.id/bmkg/proxy.php?h=magma&p='
}
function magmaSnapshotUrl() {
  return `${BASE}magma/volcanoes.json`
}

// ga_status: 1 Normal · 2 Waspada · 3 Siaga · 4 Awas
const STATUS_COLOR = {
  1: '#43a047',
  2: '#fdd835',
  3: '#fb8c00',
  4: '#e53935',
}

function extractVolcanoArray(html) {
  const start = html.indexOf('var markersGunungApi')
  if (start < 0) throw new Error('MAGMA: variable not found')
  const arrStart = html.indexOf('[', start)
  if (arrStart < 0) throw new Error('MAGMA: array start not found')
  let depth = 0
  let i = arrStart
  let inStr = false
  let esc = false
  for (; i < html.length; i++) {
    const c = html[i]
    if (esc) { esc = false; continue }
    if (inStr) {
      if (c === '\\') { esc = true; continue }
      if (c === '"') { inStr = false; continue }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '[') depth++
    else if (c === ']') { depth--; if (depth === 0) { i++; break } }
  }
  return JSON.parse(html.slice(arrStart, i))
}

function magmaFC(list) {
  const features = []
  for (const v of list) {
    if (!Number.isFinite(v.ga_lat_gapi) || !Number.isFinite(v.ga_lon_gapi)) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.ga_lon_gapi, v.ga_lat_gapi] },
      properties: {
        nama: v.ga_nama_gapi || '',
        kab: v.ga_kab_gapi || '',
        prov: v.ga_prov_gapi || '',
        elev: v.ga_elev_gapi ?? null,
        status: v.ga_status || 0,
        code: v.ga_code || '',
        vona: v.has_vona ? 1 : 0,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

async function fetchMagmaList() {
  try {
    const r = await fetch(magmaLiveUrl(), { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return extractVolcanoArray(await r.text())
  } catch (e) {
    console.warn('MAGMA live fetch failed, using snapshot:', e.message)
    const r = await fetch(magmaSnapshotUrl(), { cache: 'no-store' })
    if (!r.ok) throw new Error(`snapshot HTTP ${r.status}`)
    return r.json()
  }
}

export const MAGMA_ENTRY = {
  id: 'magma-gunungapi',
  label: 'Status Gunung Api (MAGMA)',
  category: 'Vulkano',
  color: '#fb8c00',
  sourceId: 'magma-gunungapi',
  dataLoader: async () => magmaFC(await fetchMagmaList()),
  layers: () => [
    {
      id: 'magma-circle',
      type: 'circle',
      source: 'magma-gunungapi',
      paint: {
        // Bigger radius for higher status so eye lands on Level IV first.
        'circle-radius': [
          'match', ['get', 'status'],
          4, 10,
          3, 8,
          2, 6,
          1, 5,
          4,
        ],
        'circle-color': [
          'match', ['get', 'status'],
          1, STATUS_COLOR[1],
          2, STATUS_COLOR[2],
          3, STATUS_COLOR[3],
          4, STATUS_COLOR[4],
          '#9e9e9e',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.4,
        'circle-opacity': 0.9,
      },
    },
  ],
  hover: (map, setHover) => {
    map.on('mousemove', 'magma-circle', (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      const p = f.properties
      const levels = { 1: 'I Normal', 2: 'II Waspada', 3: 'III Siaga', 4: 'IV Awas' }
      setHover(`Gunung ${p.nama} · Level ${levels[p.status] || '?'}${p.vona ? ' · VONA' : ''}`)
    })
    map.on('mouseleave', 'magma-circle', () => {
      map.getCanvas().style.cursor = ''
      setHover(null)
    })
  },
}
