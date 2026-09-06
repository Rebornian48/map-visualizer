import L from "leaflet";

// GeoJSON files live in /public/tectonicplates/ so they ship with the build.
// Vite exposes the base path (usually "/map-visualizer/") as BASE_URL.
function tectUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}tectonicplates/${name}`;
}

export const TECTONIC_SOURCES = [
  { key: "tect_boundaries", label: "Batas lempeng (PB2002)",   group: "Tektonik", kind: "tectBoundaries", url: tectUrl("boundaries.json") },
  { key: "tect_plates",     label: "Lempeng tektonik",          group: "Tektonik", kind: "tectPlates",     url: tectUrl("plates.json") },
  { key: "tect_orogens",    label: "Orogen (zona pegunungan)",  group: "Tektonik", kind: "tectOrogens",    url: tectUrl("orogens.json") },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

async function fetchGeoJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// ============================ BOUNDARIES ============================

// PB2002 only tags 65 of 241 boundaries with Type = "subduction"; the rest
// have an empty Type. Highlight the classified ones and keep the rest as
// generic boundaries.
const BOUNDARY_STYLE_DEFAULT = { color: "#ff9800", weight: 1.5, opacity: 0.85 };
const BOUNDARY_STYLE_SUBDUCTION = { color: "#d32f2f", weight: 2.5, opacity: 0.95 };

function boundaryStyle(props) {
  return props?.Type === "subduction" ? BOUNDARY_STYLE_SUBDUCTION : BOUNDARY_STYLE_DEFAULT;
}

function boundaryTooltipHtml(props) {
  const pair = [props?.PlateA, props?.PlateB].filter(Boolean).join(" ↔ ") || "boundary";
  const type = props?.Type ? ` <span style="opacity:.7">(${escapeHtml(props.Type)})</span>` : "";
  return `<strong>${escapeHtml(pair)}</strong>${type}`;
}

async function buildBoundaries(_key, url) {
  const geo = await fetchGeoJson(url);
  return L.geoJSON(geo, {
    style: (feature) => boundaryStyle(feature.properties),
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(boundaryTooltipHtml(feature.properties), {
        sticky: true, direction: "top", opacity: 0.95,
      });
    },
  });
}

// ============================ PLATES ============================

// 54 plates in the dataset — assign a stable pseudo-random color per plate
// code so neighbors don't collide.
const PLATE_PALETTE = [
  "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#00838f", "#c2185b",
  "#5d4037", "#455a64", "#0288d1", "#689f38", "#e64a19", "#5e35b2",
];

function plateColor(code) {
  const s = String(code || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PLATE_PALETTE[h % PLATE_PALETTE.length];
}

function plateStyle(props) {
  const color = plateColor(props?.Code);
  return { color, weight: 0.6, opacity: 0.6, fillColor: color, fillOpacity: 0.08 };
}

function plateTooltipHtml(props) {
  const name = escapeHtml(props?.PlateName || "plate");
  const code = props?.Code ? ` <span style="opacity:.7">(${escapeHtml(props.Code)})</span>` : "";
  return `<strong>${name}</strong>${code}`;
}

async function buildPlates(_key, url) {
  const geo = await fetchGeoJson(url);
  return L.geoJSON(geo, {
    style: (feature) => plateStyle(feature.properties),
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(plateTooltipHtml(feature.properties), {
        sticky: true, direction: "top", opacity: 0.95,
      });
    },
  });
}

// ============================ OROGENS ============================

const OROGEN_STYLE = {
  color: "#795548", weight: 1, opacity: 0.75,
  fillColor: "#8d6e63", fillOpacity: 0.18,
};

function orogenTooltipHtml(props) {
  return `<strong>${escapeHtml(props?.Name || "orogen")}</strong>`;
}

async function buildOrogens(_key, url) {
  const geo = await fetchGeoJson(url);
  return L.geoJSON(geo, {
    style: OROGEN_STYLE,
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(orogenTooltipHtml(feature.properties), {
        sticky: true, direction: "top", opacity: 0.95,
      });
    },
  });
}

export const TECTONIC_BUILDERS = new Map([
  ["tectBoundaries", buildBoundaries],
  ["tectPlates", buildPlates],
  ["tectOrogens", buildOrogens],
]);
