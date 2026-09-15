// Turns a BIG-style sarpras/sda CFG entry into a MapLibre GlobeView
// registry entry. Same CFG shape used by the Leaflet side — colour
// buckets, popup fields, group name — reused here so the two viewers
// stay in sync when the config changes.
//
// One CFG entry becomes ONE source + three geometry-typed layers
// (fill / line / circle) filtered by $type. Only the ones matching
// real features in the GeoJSON actually render; the rest are no-ops.

const BASE = import.meta.env.BASE_URL || '/'

// Build a MapLibre paint-color expression from a CFG.categorize block.
// - Simple case (no `combined`): a plain `match` on the field value.
// - `combined` case: features whose field value contains 2+ keywords
//   get the "Campuran" colour; single matches fall back to the plain
//   `match`. MapLibre doesn't have a `count-substrings` helper so we
//   express this as nested `case` conditions built from `in`.
function buildColorExpression(cfg) {
  if (!cfg.categorize) return cfg.color
  const { field, values, fallback, combined } = cfg.categorize

  const matchArgs = ['match', ['to-string', ['coalesce', ['get', field], '']]]
  for (const [val, color] of values) {
    matchArgs.push(val, color)
  }
  matchArgs.push(fallback || '#607d8b')

  if (!combined) return matchArgs

  // combined: check how many keywords appear in the value; 2+ → combined
  // color. Expressed as: case (count>=2) → combined.color else fallbackMatch.
  const keywords = values.map(([v]) => v)
  const val = ['to-string', ['coalesce', ['get', field], '']]
  // sum of booleans (1/0) for each keyword's substring presence
  const countExpr = keywords.reduce((acc, kw) => [
    '+', acc, ['case', ['in', kw, val], 1, 0],
  ], 0)
  return ['case', ['>=', countExpr, 2], combined.color, matchArgs]
}

// Preferred hover property name — the CFG.title field.
function hoverProp(cfg) {
  return cfg.title || 'namobj'
}

// Attach mousemove/mouseleave handlers to any of the three geometry
// layers so hover works uniformly across point/line/polygon sources.
function makeHoverWiring(sourceId, layerIds, propName) {
  return (map, setHover) => {
    for (const layerId of layerIds) {
      if (!map.getLayer(layerId)) continue
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        setHover(f.properties?.[propName] || '(tanpa nama)')
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    }
  }
}

// Turn one CFG entry into a globe layer registry entry.
export function bigLayerEntry({ prefix, slug, cfg, dataDir }) {
  const id = `${prefix}-${slug}`
  const sourceId = id
  const url = `${BASE}${dataDir}/${slug}.json`
  const colorExpr = buildColorExpression(cfg)

  return {
    id,
    label: cfg.label,
    category: cfg.group,
    color: cfg.color,
    url,
    sourceId,
    layers: () => [
      {
        id: `${id}-fill`,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-color': colorExpr,
          'fill-opacity': 0.25,
          'fill-outline-color': colorExpr,
        },
      },
      {
        id: `${id}-line`,
        type: 'line',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': colorExpr,
          'line-width': 2,
        },
      },
      {
        id: `${id}-circle`,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            3, 3,
            8, 5,
            13, 8,
          ],
          'circle-color': colorExpr,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 0.8,
          'circle-opacity': 0.9,
        },
      },
    ],
    hover: makeHoverWiring(
      sourceId,
      [`${id}-circle`, `${id}-line`, `${id}-fill`],
      hoverProp(cfg),
    ),
  }
}

// Expand a CFG object into an array of registry entries.
// A CFG entry with `.split` (only "ruang-udara" today) fans out to
// one entry per category value — same behaviour as the Leaflet side.
export function expandCfgToEntries({ prefix, cfg, dataDir }) {
  const out = []
  for (const [slug, def] of Object.entries(cfg)) {
    if (!def.split) {
      out.push(bigLayerEntry({ prefix, slug, cfg: def, dataDir }))
      continue
    }
    // split — build one filter-by-value entry per category
    for (const [val, color, longLabel] of def.categorize.values) {
      const subCfg = {
        ...def,
        label: def.split.subLabel(val, longLabel),
        color,
        // Force a single-color paint for the sub-slice.
        categorize: undefined,
      }
      const entry = bigLayerEntry({
        prefix, slug: `${slug}--${val}`, cfg: subCfg, dataDir,
      })
      // The URL still points at the parent GeoJSON; but each entry
      // needs a filter to keep only features with categorize.field === val.
      // We add that filter at source-load time via a `preprocess` hook
      // (handled by GlobeView's mountLayer).
      entry.url = `${BASE}${dataDir}/${slug}.json`
      entry.preprocess = (fc) => ({
        ...fc,
        features: (fc.features || []).filter(
          (f) => (f.properties || {})[def.categorize.field] === val,
        ),
      })
      out.push(entry)
    }
  }
  return out
}
