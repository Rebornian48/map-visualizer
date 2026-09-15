import L from "leaflet";
import { anchorIcon, planeIcon, trainIcon } from "./mapIcons";
import { SARPRAS_CFG } from "./sarprasCfg";

// Re-export so the Leaflet side keeps its `import { SARPRAS_CFG } from './sarpras'`
// path stable — the actual data lives in ./sarprasCfg (Leaflet-free) so the
// MapLibre globe can pull the config without dragging Leaflet with it.
export { SARPRAS_CFG };

// Static snapshots of 22 sublayers from BIG's Satupeta
// SARANA_PRASARANA MapServer (edisi 2024-07). Refreshed manually via
// scripts/refresh-sarpras.py. See that script for source URLs and the
// per-layer property whitelist.

function sarprasUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sarpras/${name}.json`;
}


// ---------- SOURCES / builders ---------------------------------------------

// A slug marked with ``split`` expands into one source per category
// value — the user gets an independent toggle for each nested layer.
// The others map 1:1 to a single source keyed by the slug.
export const SARPRAS_SOURCES = Object.entries(SARPRAS_CFG).flatMap(([slug, c]) => {
  if (!c.split) return [{
    key:   `sarpras_${slug}`,
    label: c.label,
    group: c.group,
    kind:  `sarpras:${slug}`,
    url:   sarprasUrl(slug),
  }];
  return c.categorize.values.map(([val, _color, longLabel]) => ({
    key:   `sarpras_${slug}__${val}`,
    label: c.split.subLabel(val, longLabel),
    group: c.group,
    kind:  `sarpras:${slug}:${val}`,
    url:   sarprasUrl(slug),
  }));
});

export const SARPRAS_GROUP_NAMES = [
  "Transportasi · BIG",
  "Energi · BIG",
  "Air & Zona · BIG",
];

// Legend entries — one per categorised slug (skip split layers: each
// sub-toggle is already colour-labelled by its own name).
export const SARPRAS_CATEGORIES = new Map(
  Object.entries(SARPRAS_CFG)
    .filter(([, c]) => c.categorize && !c.split)
    .map(([slug, c]) => [
      `sarpras_${slug}`,
      {
        title: c.label,
        rows: c.categorize.values.map(([_v, color, label]) => ({ color, label }))
          .concat(c.categorize.combined ? [c.categorize.combined] : []),
      },
    ]),
);

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

function fmtNum(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("id-ID");
    return Number(v.toFixed(2)).toLocaleString("id-ID");
  }
  return String(v);
}

function popupHtml(cfg, props) {
  const title = props[cfg.title] || cfg.label;
  const rows = cfg.fields
    .map(([label, key]) => {
      const v = props[key];
      if (v == null || v === "") return null;
      return `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(label)}</td><td>${escapeHtml(fmtNum(v))}</td></tr>`;
    })
    .filter(Boolean)
    .join("");
  return `<div style="font-size:12px;line-height:1.5;max-width:340px">
    <div style="font-weight:600;margin-bottom:4px">${escapeHtml(title)}</div>
    <table>${rows}</table>
  </div>`;
}

function tooltipHtml(cfg, props, color) {
  const title = props[cfg.title] || cfg.label;
  return `<strong style="color:${color}">${escapeHtml(title)}</strong>
    <span style="opacity:.75"> — ${escapeHtml(cfg.label)}</span>`;
}

// Split slugs fan out to 8+ toggles hitting the same URL; memoise the
// parsed FeatureCollection so a re-toggle doesn't re-fetch and each
// sub-builder just filters the shared result.
const GEOJSON_CACHE = new Map();
async function fetchGeoJson(url) {
  let promise = GEOJSON_CACHE.get(url);
  if (!promise) {
    promise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return r.json();
    });
    GEOJSON_CACHE.set(url, promise);
  }
  return promise;
}

const POINT_ICON = {
  "pelabuhan-perikanan":     (color, size) => anchorIcon({ size, color }),
  "pelabuhan-umum":          (color, size) => anchorIcon({ size, color }),
  "pelabuhan-penyeberangan": (color, size) => anchorIcon({ size, color }),
  "terminal-khusus":         (color, size) => anchorIcon({ size, color }),
  "bandara":                 (color, size) => planeIcon({ size, color }),
  "stasiun-ka":              (color, size) => trainIcon({ size, color }),
};
const ICON_SIZE = 18;

// Build a colour-picker for the layer: constant if uncategorised,
// else look up the property value in the values table (with a
// "combined" catch-all if a value names more than one keyword).
function makeColorFn(cfg) {
  if (!cfg.categorize) {
    const c = cfg.color;
    return () => c;
  }
  const { field, values, fallback, combined } = cfg.categorize;
  const table = new Map(values.map(([v, color]) => [v, color]));
  const keywords = combined ? values.map(([v]) => v) : [];
  return (props) => {
    const raw = props?.[field];
    if (raw == null || raw === "") return fallback;
    const s = String(raw);
    if (table.has(s)) return table.get(s);
    if (combined) {
      const hits = keywords.filter(k => s.includes(k));
      if (hits.length >= 2) return combined.color;
      if (hits.length === 1) return table.get(hits[0]);
    }
    return fallback;
  };
}

// A single feature can be Point / Line / Polygon; Leaflet dispatches
// on ``geometry.type`` via ``pointToLayer`` and ``style`` callbacks, so
// one builder handles all three cases per layer. When ``subValue`` is
// supplied (split layer), the builder pre-filters the FeatureCollection
// to that category and pins its polygons to the category's pane so
// nested airspaces layer correctly.
function makeBuilder(slug, subValue) {
  const cfg = SARPRAS_CFG[slug];
  const iconFactory = POINT_ICON[slug];
  const colorFor = makeColorFn(cfg);
  const pane = subValue && cfg.split ? cfg.split.paneFor(subValue) : undefined;
  const filterField = subValue ? cfg.categorize.field : null;

  return async function build(_key, url) {
    const raw = await fetchGeoJson(url);
    const fc = filterField
      ? { ...raw, features: (raw.features || []).filter(
          (f) => (f.properties || {})[filterField] === subValue) }
      : raw;
    const layer = L.geoJSON(fc, {
      pointToLayer: iconFactory
        ? (f, latlng) => L.marker(latlng, {
            icon: iconFactory(colorFor(f.properties), ICON_SIZE),
            riseOnHover: true,
            pane,
          })
        : (f, latlng) => L.circleMarker(latlng, {
            radius: 4,
            color: "#ffffff",
            weight: 1,
            opacity: 0.9,
            fillColor: colorFor(f.properties),
            fillOpacity: 0.85,
            pane,
          }),
      style: (feat) => {
        const t = feat?.geometry?.type;
        const c = colorFor(feat?.properties);
        if (t === "Polygon" || t === "MultiPolygon") {
          return { color: c, weight: 1.2, opacity: 0.9, fillColor: c, fillOpacity: 0.2, pane };
        }
        return { color: c, weight: 2, opacity: 0.85, pane };
      },
      onEachFeature: (feature, lyr) => {
        const p = feature.properties || {};
        lyr.bindTooltip(tooltipHtml(cfg, p, colorFor(p)), {
          sticky: true, direction: "top", opacity: 0.95,
        });
        lyr.bindPopup(popupHtml(cfg, p), { maxWidth: 360 });
      },
    });
    layer._meta = { features: fc.features?.length ?? 0 };
    return layer;
  };
}

export const SARPRAS_BUILDERS = new Map(
  Object.entries(SARPRAS_CFG).flatMap(([slug, c]) => {
    if (!c.split) return [[`sarpras:${slug}`, makeBuilder(slug)]];
    return c.categorize.values.map(([val]) =>
      [`sarpras:${slug}:${val}`, makeBuilder(slug, val)]);
  }),
);
