// Layer registry for the MapLibre GlobeView.
//
// Each entry is a self-contained declaration: where the GeoJSON is, how the
// source is named, which paint/layer specs to add, and optional hover wiring.
// This keeps GlobeView.jsx generic — adding a new overlay is a new entry here.

// Import CFG directly from the Leaflet-free config files. Going through
// ../sarpras / ../sda would pull Leaflet into the globe's static import
// graph (and Vite would then preload it on the default /), even though
// tree-shaking drops the runtime code.
import { SARPRAS_CFG } from '../sarprasCfg'
import { SDA_CFG } from '../sdaCfg'
import { expandCfgToEntries } from './bigLayers'
import { BMKG_GEMPA_ENTRIES } from './live/bmkgGempa'
import { SIGMET_ENTRY } from './live/sigmet'
import { MBG_ENTRY } from './live/mbg'
import { MAGMA_ENTRY } from './live/magma'
import { CAP_ENTRY } from './live/bmkgCap'
import { CUACA_ENTRY } from './live/bmkgCuaca'
import { BUS_ENTRIES } from './live/bus'
import { KRL_LINES_ENTRY, LRT_MRT_LINES_ENTRY, RAIL_STATIONS_ENTRY } from './live/rail'
import { GTFS_TJ_ENTRY } from './live/gtfs'
import { OPENAIP_AIRPORTS_ENTRY, OPENAIP_AIRSPACES_ENTRY } from './live/openaipRuntime'
import { SEARATES_ENTRY } from './live/searates'

const BASE = import.meta.env.BASE_URL || '/'

// ── Palette (aligned with the Leaflet-side theme accents) ─────────
const C = {
  accent: '#f36',
  ocean: '#2b7bd6',
  gold: '#f2b544',
  purple: '#8c66d9',
  green: '#0ca',
  gray: '#8a8a9a',
  red: '#e53935',
  orange: '#fb8c00',
  brown: '#8d6e63',
  // Tektonik
  plateFill: '#b58a5c',
  plateLine: '#5c3a1f',
  boundary: '#c9302c',
  orogen: '#9c6b3a',
  // Batas laut
  teritorial: '#5aa8ff',
  zonaTambahan: '#3a83d4',
  landasKontinen: '#2d6ab8',
  zee: '#1f4e91',
  // Keuskupan choropleth (per provinsi gerejawi)
  keuskupanPalette: [
    '#f36',    // Jakarta
    '#f2b544', // Semarang
    '#0ca',    // Ende
    '#8c66d9', // Kupang
    '#e6204e', // Makassar
    '#00a88a', // Medan
    '#f28430', // Merauke
    '#6b8dc7', // Palembang
    '#a26db5', // Pontianak
    '#d94a7c', // Samarinda
  ],
}

export const LAYER_CATEGORIES = [
  'Batas Administrasi',
  'Batas Laut UNCLOS',
  'Keagamaan',
  // Live BMKG / MAGMA / aviasi / insiden
  'BMKG · Gempa',
  'BMKG · Peringatan Dini',
  'BMKG · Cuaca',
  'Aviasi',
  'Insiden · MBG',
  // Transportasi runtime
  'Bus (JSON)',
  'Bus (GTFS)',
  'Rel',
  'Aeronautika · OpenAIP',
  'Maritim · SeaRates',
  // Statik
  'Tektonik',
  'Vulkano',
  // Sarpras BIG
  'Transportasi · BIG',
  'Energi · BIG',
  'Air & Zona · BIG',
  // SDA BIG
  'Tanah & Geologi · BIG',
  'Hidrologi · BIG',
  'Bencana · SDA',
  'Sumber Daya · BIG',
  'Ekosistem · BIG',
  'Cagar Budaya & Konservasi · BIG',
]

// ── Hover wiring helper ──────────────────────────────────────────
function hoverPropReader(sourceId, layerId, propName) {
  return (map, setHover) => {
    let hoveredId = null
    map.on('mousemove', layerId, (e) => {
      const f = e.features && e.features[0]
      if (!f) return
      map.getCanvas().style.cursor = 'pointer'
      if (hoveredId !== null) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false })
      }
      hoveredId = f.id
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: true })
      }
      const label = f.properties?.[propName]
      setHover(label || '(tanpa nama)')
    })
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = ''
      if (hoveredId !== null) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false })
      }
      hoveredId = null
      setHover(null)
    })
  }
}

// ── Boundary-style helper (fill + line) ──────────────────────────
function boundaryLayers({ sourceId, prefix, color, fillOpacity = 0.10, hoverOpacity = 0.35, lineWidth = 1.2 }) {
  return () => [
    {
      id: `${prefix}-fill`,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': color,
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], hoverOpacity,
          fillOpacity,
        ],
      },
    },
    {
      id: `${prefix}-line`,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false], lineWidth + 1,
          lineWidth,
        ],
      },
    },
  ]
}

function linestringLayer({ sourceId, id, color, width = 1.5, dash = null }) {
  return () => [
    {
      id,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': width,
        ...(dash ? { 'line-dasharray': dash } : {}),
      },
    },
  ]
}

// ── Registry ─────────────────────────────────────────────────────
export const LAYER_REGISTRY = [
  // Batas Administrasi
  {
    id: 'provinsi',
    label: 'Provinsi (38)',
    category: 'Batas Administrasi',
    color: C.accent,
    url: `${BASE}boundaries/provinsi.json`,
    sourceId: 'provinsi',
    promoteId: 'WADMPR',
    layers: boundaryLayers({
      sourceId: 'provinsi', prefix: 'provinsi',
      color: C.accent, fillOpacity: 0.12, hoverOpacity: 0.4, lineWidth: 1.5,
    }),
    hover: hoverPropReader('provinsi', 'provinsi-fill', 'WADMPR'),
  },
  {
    id: 'kabkota',
    label: 'Kab/Kota (541)',
    category: 'Batas Administrasi',
    color: C.gold,
    url: `${BASE}boundaries/kabkota.json`,
    sourceId: 'kabkota',
    promoteId: 'WADMKK',
    layers: boundaryLayers({
      sourceId: 'kabkota', prefix: 'kabkota',
      color: C.gold, fillOpacity: 0.06, hoverOpacity: 0.3, lineWidth: 0.8,
    }),
    hover: hoverPropReader('kabkota', 'kabkota-fill', 'WADMKK'),
  },
  {
    id: 'kecamatan',
    label: 'Kecamatan (7.432)',
    category: 'Batas Administrasi',
    color: C.purple,
    url: `${BASE}boundaries/kecamatan.json`,
    sourceId: 'kecamatan',
    promoteId: 'WADMKC',
    layers: boundaryLayers({
      sourceId: 'kecamatan', prefix: 'kecamatan',
      color: C.purple, fillOpacity: 0.04, hoverOpacity: 0.25, lineWidth: 0.5,
    }),
    hover: hoverPropReader('kecamatan', 'kecamatan-fill', 'WADMKC'),
  },
  {
    id: 'desa',
    label: 'Kelurahan/Desa (84.503)',
    category: 'Batas Administrasi',
    color: C.green,
    url: `${BASE}boundaries/desa.json`,
    sourceId: 'desa',
    promoteId: 'WADMKD',
    layers: boundaryLayers({
      sourceId: 'desa', prefix: 'desa',
      color: C.green, fillOpacity: 0.03, hoverOpacity: 0.2, lineWidth: 0.3,
    }),
    hover: hoverPropReader('desa', 'desa-fill', 'WADMKD'),
  },

  // Batas Laut UNCLOS
  {
    id: 'laut-teritorial',
    label: 'Laut Teritorial (12 nm)',
    category: 'Batas Laut UNCLOS',
    color: C.teritorial,
    url: `${BASE}boundaries/laut/teritorial.json`,
    sourceId: 'laut-teritorial',
    layers: linestringLayer({
      sourceId: 'laut-teritorial', id: 'laut-teritorial-line',
      color: C.teritorial, width: 1.4,
    }),
  },
  {
    id: 'laut-zona-tambahan',
    label: 'Zona Tambahan (24 nm)',
    category: 'Batas Laut UNCLOS',
    color: C.zonaTambahan,
    url: `${BASE}boundaries/laut/zona-tambahan.json`,
    sourceId: 'laut-zona-tambahan',
    layers: linestringLayer({
      sourceId: 'laut-zona-tambahan', id: 'laut-zona-tambahan-line',
      color: C.zonaTambahan, width: 1.4, dash: [3, 2],
    }),
  },
  {
    id: 'laut-landas-kontinen',
    label: 'Landas Kontinen',
    category: 'Batas Laut UNCLOS',
    color: C.landasKontinen,
    url: `${BASE}boundaries/laut/landas-kontinen.json`,
    sourceId: 'laut-landas-kontinen',
    layers: linestringLayer({
      sourceId: 'laut-landas-kontinen', id: 'laut-landas-kontinen-line',
      color: C.landasKontinen, width: 1.6,
    }),
  },
  {
    id: 'laut-zee',
    label: 'ZEE (200 nm)',
    category: 'Batas Laut UNCLOS',
    color: C.zee,
    url: `${BASE}boundaries/laut/zee.json`,
    sourceId: 'laut-zee',
    layers: linestringLayer({
      sourceId: 'laut-zee', id: 'laut-zee-line',
      color: C.zee, width: 1.8,
    }),
  },

  // Keagamaan
  {
    id: 'keuskupan',
    label: 'Keuskupan Katolik (38)',
    category: 'Keagamaan',
    color: C.purple,
    url: `${BASE}keuskupan/keuskupan.geojson`,
    sourceId: 'keuskupan',
    layers: () => [
      {
        id: 'keuskupan-fill',
        type: 'fill',
        source: 'keuskupan',
        paint: {
          // Match provinsi gerejawi (property "provg") to palette; fallback gray
          'fill-color': [
            'match',
            ['get', 'provg'],
            'Jakarta',    C.keuskupanPalette[0],
            'Semarang',   C.keuskupanPalette[1],
            'Ende',       C.keuskupanPalette[2],
            'Kupang',     C.keuskupanPalette[3],
            'Makassar',   C.keuskupanPalette[4],
            'Medan',      C.keuskupanPalette[5],
            'Merauke',    C.keuskupanPalette[6],
            'Palembang',  C.keuskupanPalette[7],
            'Pontianak',  C.keuskupanPalette[8],
            'Samarinda',  C.keuskupanPalette[9],
            /* other */    C.gray,
          ],
          'fill-opacity': 0.35,
        },
      },
      {
        id: 'keuskupan-line',
        type: 'line',
        source: 'keuskupan',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#333', 'line-width': 0.6 },
      },
    ],
    hover: hoverPropReader('keuskupan', 'keuskupan-fill', 'keuskupan'),
  },

  // Tektonik (PB2002)
  {
    id: 'tektonik-plates',
    label: 'Lempeng Tektonik (54)',
    category: 'Tektonik',
    color: C.plateFill,
    url: `${BASE}tectonicplates/plates.json`,
    sourceId: 'tektonik-plates',
    promoteId: 'Code',
    layers: () => [
      {
        id: 'tektonik-plates-fill',
        type: 'fill',
        source: 'tektonik-plates',
        paint: {
          'fill-color': C.plateFill,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 0.35,
            0.10,
          ],
        },
      },
      {
        id: 'tektonik-plates-line',
        type: 'line',
        source: 'tektonik-plates',
        paint: { 'line-color': C.plateLine, 'line-width': 0.6 },
      },
    ],
    hover: hoverPropReader('tektonik-plates', 'tektonik-plates-fill', 'PlateName'),
  },
  {
    id: 'tektonik-boundaries',
    label: 'Batas Lempeng (241)',
    category: 'Tektonik',
    color: C.boundary,
    url: `${BASE}tectonicplates/boundaries.json`,
    sourceId: 'tektonik-boundaries',
    layers: linestringLayer({
      sourceId: 'tektonik-boundaries', id: 'tektonik-boundaries-line',
      color: C.boundary, width: 1.4,
    }),
  },
  {
    id: 'tektonik-orogens',
    label: 'Sabuk Orogen (13)',
    category: 'Tektonik',
    color: C.orogen,
    url: `${BASE}tectonicplates/orogens.json`,
    sourceId: 'tektonik-orogens',
    promoteId: 'Name',
    layers: () => [
      {
        id: 'tektonik-orogens-fill',
        type: 'fill',
        source: 'tektonik-orogens',
        paint: {
          'fill-color': C.orogen,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 0.45,
            0.18,
          ],
        },
      },
      {
        id: 'tektonik-orogens-line',
        type: 'line',
        source: 'tektonik-orogens',
        paint: { 'line-color': C.orogen, 'line-width': 0.8 },
      },
    ],
    hover: hoverPropReader('tektonik-orogens', 'tektonik-orogens-fill', 'Name'),
  },

  // Vulkano — Smithsonian GVP Holocene
  {
    id: 'vulkano-gvp',
    label: 'Gunung Api Holocene (1.214)',
    category: 'Vulkano',
    color: C.red,
    url: `${BASE}veins/volcanoes.json`,
    sourceId: 'vulkano-gvp',
    layers: () => [
      {
        id: 'vulkano-gvp-circle',
        type: 'circle',
        source: 'vulkano-gvp',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            2, 2,
            5, 4,
            10, 7,
          ],
          'circle-color': [
            'case',
            ['>=', ['coalesce', ['get', 'Last_Eruption_Year'], -9999], 1900], C.red,
            ['>=', ['coalesce', ['get', 'Last_Eruption_Year'], -9999], 1500], C.orange,
            C.brown,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 0.8,
          'circle-opacity': 0.9,
        },
      },
    ],
    hover: hoverPropReader('vulkano-gvp', 'vulkano-gvp-circle', 'Volcano_Name'),
  },

  // ── Live sources — BMKG / MAGMA / SIGMET / MBG ─────────────────
  // No public/static — each entry defines its own dataLoader (or a
  // customMount for the HTML-marker cuaca layer). Failure to fetch
  // (usually a proxy hiccup) leaves the layer un-mounted; MAGMA in
  // particular falls back to a vendored snapshot.
  ...BMKG_GEMPA_ENTRIES,
  CAP_ENTRY,
  CUACA_ENTRY,
  MAGMA_ENTRY,
  SIGMET_ENTRY,
  MBG_ENTRY,

  // ── Transportasi runtime ──────────────────────────────────────
  // 6 bus JSON networks, GTFS Transjakarta (dynamic JSZip), 3 rail
  // sources (KRL lines / LRT-MRT lines / stations KML), OpenAIP
  // (aerodromes + airspaces), SeaRates ports.
  ...BUS_ENTRIES,
  GTFS_TJ_ENTRY,
  KRL_LINES_ENTRY,
  LRT_MRT_LINES_ENTRY,
  RAIL_STATIONS_ENTRY,
  OPENAIP_AIRPORTS_ENTRY,
  OPENAIP_AIRSPACES_ENTRY,
  SEARATES_ENTRY,

  // ── Sarpras BIG (22 sublayer) + SDA BIG (32 sublayer) ──────────
  // Generated from the same CFG objects the Leaflet side uses so the
  // two viewers stay aligned on labels, colour buckets, and grouping.
  // "ruang-udara" expands into 8 nested-airspace toggles (FIR/UTA/TMA/
  // CTR/ATZ/AFIZ/PDRT/SECTOR).
  ...expandCfgToEntries({ prefix: 'sarpras', cfg: SARPRAS_CFG, dataDir: 'sarpras' }),
  ...expandCfgToEntries({ prefix: 'sda',     cfg: SDA_CFG,     dataDir: 'sda'     }),
]
