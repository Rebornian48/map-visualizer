import { ACTIVITY_COLORS } from '../parser'

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const SPEEDS = [1, 2, 5, 10]

// Boundary polygons are vendored to /public/boundaries/ from BIG's
// BATASWILAYAH MapServer (edisi Juni 2026). See scripts/refresh-boundaries.py
// for the refresh procedure.
const BOUNDARY_BASE = `${import.meta.env.BASE_URL || '/'}boundaries`

export const BOUNDARY_SOURCES = new Map([
  ['provinsi',  `${BOUNDARY_BASE}/provinsi.json`],
  ['kabkota',   `${BOUNDARY_BASE}/kabkota.json`],
  ['kecamatan', `${BOUNDARY_BASE}/kecamatan.json`],
  ['desa',      `${BOUNDARY_BASE}/desa.json`],
])

export const BASEMAPS = new Map([
  ['OpenStreetMap', {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' },
  }],
  ['Satellite', {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opts: { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
  }],
  ['Topographic', {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    opts: { maxZoom: 17, attribution: '&copy; OpenTopoMap (CC-BY-SA)' },
  }],
])

export const ACTIVITY_COLOR_MAP = new Map(Object.entries(ACTIVITY_COLORS))

export const escapeHtml = (s) => {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
};

const PROVINCE_KEYS   = ['WADMPR', 'PROVINSI', 'Propinsi', 'NAME_1', 'nama_provinsi', 'province']
const KABKOTA_KEYS    = ['WADMKK', 'KAB_KOTA', 'KABKOT', 'NAME_2', 'kabupaten']
const KECAMATAN_KEYS  = ['WADMKC', 'KECAMATAN', 'NAME_3']
const DESA_KEYS       = ['WADMKD', 'KELDESA', 'KELURAHAN', 'NAME_4']

function pickProp(props, keys) {
  if (!props) return ''
  for (const k of keys) {
    const v = Reflect.get(props, k)
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function strongText(txt) {
  const el = document.createElement('strong')
  el.textContent = txt
  return el
}

function dimText(txt) {
  const el = document.createElement('span')
  el.style.opacity = '0.7'
  el.textContent = txt
  return el
}

function serializeHtml(nodes) {
  const wrap = document.createElement('div')
  for (const n of nodes) wrap.appendChild(n)
  return wrap.innerHTML
}

function stackedLabel(main, secondaries) {
  if (!main && secondaries.every(s => !s)) return ''
  const nodes = []
  if (main) nodes.push(strongText(main))
  for (const s of secondaries) {
    if (!s) continue
    if (nodes.length) nodes.push(document.createElement('br'))
    nodes.push(dimText(s))
  }
  return serializeHtml(nodes)
}

export function boundaryLabelHtml(kind, props) {
  const prov = pickProp(props, PROVINCE_KEYS)
  const kab  = pickProp(props, KABKOTA_KEYS)
  const kec  = pickProp(props, KECAMATAN_KEYS)
  const desa = pickProp(props, DESA_KEYS)
  if (kind === 'provinsi')  return stackedLabel(prov, [])
  if (kind === 'kabkota')   return stackedLabel(kab,  [prov])
  if (kind === 'kecamatan') return stackedLabel(kec,  [`${kab || ''}${kab && prov ? ' · ' : ''}${prov || ''}`])
  if (kind === 'desa')      return stackedLabel(desa, [kec, `${kab || ''}${kab && prov ? ' · ' : ''}${prov || ''}`])
  return ''
}
