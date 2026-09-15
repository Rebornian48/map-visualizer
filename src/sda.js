import L from "leaflet";
import { SDA_CFG } from "./sdaCfg";

// Re-export so the Leaflet side keeps its import path stable. Actual
// data lives in ./sdaCfg (Leaflet-free) so the MapLibre globe view can
// pull SDA_CFG without dragging Leaflet with it.
export { SDA_CFG };

// Static snapshots of 32 sublayers from BIG Satupeta's
// SUMBER_DAYA_ALAM_DAN_LINGKUNGAN MapServer (edisi 2024-08). Refreshed
// manually via scripts/refresh-sda.py.
//
// Same rendering pattern as ./sarpras.js: one generic builder per slug,
// dispatch on ``geometry.type`` so a single file can carry point/line/
// polygon. Slugs with a ``categorize`` block colour features per property
// value (severity ramps for KRB/rawan layers, qualitative palettes for
// jenis/kelas fields); everything else uses the layer's base ``color``.

function sdaUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}sda/${name}.json`;
}

// ---------- SOURCES / builders -----------------------------------------

export const SDA_SOURCES = Object.entries(SDA_CFG).map(([slug, c]) => ({
  key:   `sda_${slug}`,
  label: c.label,
  group: c.group,
  kind:  `sda:${slug}`,
  url:   sdaUrl(slug),
}));

export const SDA_GROUP_NAMES = [
  "Tanah & Geologi · BIG",
  "Hidrologi · BIG",
  "Bencana · SDA",
  "Sumber Daya · BIG",
  "Ekosistem · BIG",
  "Cagar Budaya & Konservasi · BIG",
];

// Exposed for the map's legend stack — one entry per categorised slug.
export const SDA_CATEGORIES = new Map(
  Object.entries(SDA_CFG)
    .filter(([, c]) => c.categorize)
    .map(([slug, c]) => [
      `sda_${slug}`,
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

async function fetchGeoJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

function makeColorFn(cfg) {
  if (!cfg.categorize) {
    const c = cfg.color;
    return () => c;
  }
  const { field, values, fallback } = cfg.categorize;
  const table = new Map(values.map(([v, color]) => [v, color]));
  return (props) => {
    const raw = props?.[field];
    if (raw == null || raw === "") return fallback;
    const s = String(raw);
    return table.get(s) || fallback;
  };
}

function makeBuilder(slug) {
  const cfg = SDA_CFG[slug];
  const colorFor = makeColorFn(cfg);

  return async function build(_key, url) {
    const fc = await fetchGeoJson(url);
    const layer = L.geoJSON(fc, {
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: 3.5,
        color: "#ffffff",
        weight: 0.8,
        opacity: 0.85,
        fillColor: colorFor(f.properties),
        fillOpacity: 0.85,
      }),
      style: (feat) => {
        const t = feat?.geometry?.type;
        const c = colorFor(feat?.properties);
        if (t === "Polygon" || t === "MultiPolygon") {
          return { color: c, weight: 0.6, opacity: 0.75, fillColor: c, fillOpacity: 0.28 };
        }
        return { color: c, weight: 1.5, opacity: 0.85 };
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

export const SDA_BUILDERS = new Map(
  Object.keys(SDA_CFG).map((slug) => [`sda:${slug}`, makeBuilder(slug)]),
);
