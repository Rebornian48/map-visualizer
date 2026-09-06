import L from "leaflet";

// NOAA Aviation Weather Center — international SIGMET as JSON.
// Free, no auth. No CORS header, so routed through the shared PHP proxy.
function sigmetUrl() {
  if (import.meta.env.DEV) return "/awc-api/api/data/isigmet?format=json";
  return "https://rebornian48.my.id/bmkg/proxy.php?h=awc&p=api/data/isigmet&q=format=json";
}

export const SIGMET_SOURCES = [
  { key: "sigmet_intl", label: "SIGMET Aktif (NOAA AWC)",
    group: "Aviasi", kind: "sigmet", url: sigmetUrl() },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

// ICAO SIGMET hazard codes → { label, color }
const HAZARDS = new Map([
  ["TS",   { label: "Thunderstorm",       color: "#fb8c00" }],
  ["TSGR", { label: "Thunderstorm + hail", color: "#e64a19" }],
  ["TC",   { label: "Tropical cyclone",   color: "#7b1fa2" }],
  ["VA",   { label: "Volcanic ash",       color: "#b71c1c" }],
  ["TURB", { label: "Turbulence",         color: "#00838f" }],
  ["ICE",  { label: "Icing",              color: "#0288d1" }],
  ["MTW",  { label: "Mountain waves",     color: "#5d4037" }],
  ["DS",   { label: "Dust storm",         color: "#c9a227" }],
  ["SS",   { label: "Sand storm",         color: "#c9a227" }],
  ["RDOACT", { label: "Radioactive cloud", color: "#00c853" }],
]);

function hazardMeta(code) {
  return HAZARDS.get(code) || { label: code || "Hazard", color: "#607d8b" };
}

function styleFor(hazard) {
  const meta = hazardMeta(hazard);
  return { color: meta.color, fillColor: meta.color, fillOpacity: 0.22, weight: 2, opacity: 0.9 };
}

function tsUtc(ts) {
  if (!Number.isFinite(ts)) return "—";
  return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

function altFt(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (n <= 0) return "SFC";
  return `FL${Math.round(n / 100)}`;
}

function popupHtml(s) {
  const meta = hazardMeta(s.hazard);
  const q = s.qualifier ? ` <span style="opacity:.7">(${escapeHtml(s.qualifier)})</span>` : "";
  const rows = [
    ["Hazard", `${meta.label}${q}`],
    ["FIR", `${s.firName || s.firId || "—"}`],
    ["Berlaku", `${tsUtc(s.validTimeFrom)} → ${tsUtc(s.validTimeTo)}`],
    ["Ketinggian", `${altFt(s.base)} – ${altFt(s.top)}`],
    ["Diterima", s.receiptTime ? s.receiptTime.slice(0, 16).replace("T", " ") + "Z" : "—"],
    ["Seri", s.seriesId ? `#${s.seriesId}` : "—"],
  ];
  const html = rows.map(([k, v]) =>
    `<div style="margin-bottom:3px"><strong>${escapeHtml(k)}:</strong> ${v}</div>`,
  ).join("");
  return `<div style="font-size:12px;line-height:1.45;max-width:300px">${html}</div>`;
}

function tooltipHtml(s) {
  const meta = hazardMeta(s.hazard);
  return `<strong style="color:${meta.color}">${escapeHtml(meta.label)}</strong> — ${escapeHtml(s.firName || s.firId || "")}`;
}

function toLatLngs(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(c => [c.lat, c.lon]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
}

function addSigmetShape(s, group) {
  const latlngs = toLatLngs(s.coords);
  if (latlngs.length < 2) return;
  const style = styleFor(s.hazard);
  const shape = s.geom === "LINE"
    ? L.polyline(latlngs, { ...style, fillOpacity: 0, weight: 3 })
    : L.polygon(latlngs, style);
  shape.bindTooltip(tooltipHtml(s), { sticky: true, direction: "top", opacity: 0.95 })
       .bindPopup(popupHtml(s))
       .addTo(group);
}

function countByHazard(list) {
  const counts = {};
  for (const s of list) {
    const k = s.hazard || "?";
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

async function buildSigmet(_key, url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const list = await r.json();
  const group = L.layerGroup();
  for (const s of list) addSigmetShape(s, group);
  group._meta = { counts: countByHazard(list), total: list.length };
  return group;
}

export const SIGMET_BUILDERS = new Map([
  ["sigmet", buildSigmet],
]);
