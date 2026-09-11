import L from "leaflet";

// Four maritime-boundary polyline layers vendored from BIG
// (BatasNegaraLaut MapServer, edisi Juni 2026). Snapshots live in
// public/boundaries/laut/ and are refreshed manually via
// scripts/refresh-laut.py.
function lautUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}boundaries/laut/${name}`;
}

// UNCLOS defines four seaward zones with progressively wider extent from
// the territorial sea baseline. Colours run cool → warm as we move offshore
// so an eyeball can order them without checking the legend.
const LAUT_STYLES = {
  teritorial:      { color: "#1e88e5", weight: 2.5, opacity: 0.9,  dashArray: null },
  "zona-tambahan": { color: "#00acc1", weight: 2,   opacity: 0.85, dashArray: "6,4" },
  "landas-kontinen": { color: "#8e24aa", weight: 2, opacity: 0.85, dashArray: "8,4,2,4" },
  zee:             { color: "#e65100", weight: 2,   opacity: 0.9,  dashArray: "10,6" },
};

const LAUT_LABELS = {
  teritorial:        "Laut Teritorial",
  "zona-tambahan":   "Zona Tambahan",
  "landas-kontinen": "Landas Kontinen",
  zee:               "Zona Ekonomi Eksklusif (ZEE)",
};

export const LAUT_SOURCES = [
  { key: "laut_teritorial",    label: "Laut Teritorial (12 nm)",   group: "Batas Laut · BIG", kind: "lautTeritorial",     url: lautUrl("teritorial.json") },
  { key: "laut_zonaTambahan",  label: "Zona Tambahan (24 nm)",     group: "Batas Laut · BIG", kind: "lautZonaTambahan",   url: lautUrl("zona-tambahan.json") },
  { key: "laut_landasKontinen", label: "Landas Kontinen",          group: "Batas Laut · BIG", kind: "lautLandasKontinen", url: lautUrl("landas-kontinen.json") },
  { key: "laut_zee",           label: "ZEE — Zona Ekonomi Eksklusif (200 nm)", group: "Batas Laut · BIG", kind: "lautZee", url: lautUrl("zee.json") },
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

function tooltipHtml(slug, props) {
  const parts = [`<strong>${escapeHtml(LAUT_LABELS[slug])}</strong>`];
  const partner = props?.BTSNGR || props?.NAMOBJ;
  if (partner) parts.push(escapeHtml(String(partner)));
  const uupp = props?.UUPP;
  if (uupp) parts.push(`<span style="opacity:.75">Dasar hukum: ${escapeHtml(uupp)}</span>`);
  return parts.join("<br>");
}

function makeBuilder(slug) {
  return async function build(_key, url) {
    const geo = await fetchGeoJson(url);
    return L.geoJSON(geo, {
      style: LAUT_STYLES[slug],
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(tooltipHtml(slug, feature.properties), {
          sticky: true, direction: "top", opacity: 0.95,
        });
      },
    });
  };
}

export const LAUT_BUILDERS = new Map([
  ["lautTeritorial",     makeBuilder("teritorial")],
  ["lautZonaTambahan",   makeBuilder("zona-tambahan")],
  ["lautLandasKontinen", makeBuilder("landas-kontinen")],
  ["lautZee",            makeBuilder("zee")],
]);
