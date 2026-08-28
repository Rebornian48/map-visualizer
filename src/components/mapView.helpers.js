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

export const escapeHtml = (s) => {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
};

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

export function boundaryLabelHtml(kind, props) {
  if (kind === 'provinsi') {
    const name = pickProp(props, PROVINCE_KEYS)
    return name ? serializeHtml([strongText(name)]) : ''
  }
  if (kind === 'kabkota') {
    const kab  = pickProp(props, KABKOTA_KEYS)
    const prov = pickProp(props, PROVINCE_KEYS)
    if (!kab && !prov) return ''
    const nodes = []
    if (kab)  nodes.push(strongText(kab))
    if (kab && prov) nodes.push(document.createElement('br'))
    if (prov) nodes.push(dimText(prov))
    return serializeHtml(nodes)
  }
  return ''
}
