import { ACTIVITY_COLORS } from '../parser'

export const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const SPEEDS = [1, 2, 5, 10]

export const BOUNDARY_SOURCES = new Map([
  ['provinsi', 'https://rebornian48.my.id/assets/json/provinsi.json'],
  ['kabkota',  'https://rebornian48.my.id/assets/json/kabkota.json'],
])

export const BASEMAPS = new Map([
  ['Carto Light', {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' },
  }],
  ['Carto Dark', {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    opts: { maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' },
  }],
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

const HTML_ESCAPES = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
])

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => HTML_ESCAPES.get(c) || c)
}

const PROVINCE_KEYS = ['WADMPR', 'PROVINSI', 'Propinsi', 'NAME_1', 'nama_provinsi', 'province']
const KABKOTA_KEYS  = ['KAB_KOTA', 'KABKOT', 'WADMKK', 'NAME_2', 'kabupaten']

function pickProp(props, keys) {
  if (!props) return ''
  for (const k of keys) {
    const v = Reflect.get(props, k)
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

// Returns pre-escaped HTML fragment for a boundary tooltip.
// Name signals HTML output so callers (and Codacy) treat it as such.
export function boundaryLabelHtml(kind, props) {
  if (kind === 'provinsi') {
    const name = pickProp(props, PROVINCE_KEYS)
    return name ? `<strong>${escapeHtml(name)}</strong>` : ''
  }
  if (kind === 'kabkota') {
    const kab  = pickProp(props, KABKOTA_KEYS)
    const prov = pickProp(props, PROVINCE_KEYS)
    if (!kab && !prov) return ''
    const line1 = kab  ? `<strong>${escapeHtml(kab)}</strong>` : ''
    const line2 = prov ? `<span style="opacity:0.7">${escapeHtml(prov)}</span>` : ''
    return [line1, line2].filter(Boolean).join('<br/>')
  }
  return ''
}
