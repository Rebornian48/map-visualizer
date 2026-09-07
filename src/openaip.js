import L from "leaflet";

// Snapshot vendored from OpenAIP (openaip.net) — Indonesia aerodromes +
// airspace polygons. Snapshots live in public/openaip/ and are refreshed
// manually with scripts/refresh-openaip.mjs (each AIRAC cycle, ~28 days).
//
// Coverage: OpenAIP for Indonesia is community-populated and sparse today —
// 286 aerodromes + 8 airspace polygons (2 FIR + Papua CTR/TMA). Enough to
// show national FIR delineation and every civil/military bandara, but
// navaids/waypoints/CTR-TMA outside Papua are gaps we cannot fill from
// OpenAIP alone. Structure is ready if coverage improves.
//
// License: CC BY-NC 4.0 — non-commercial use only, attribution to
// openaip.net required.

function openaipUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}openaip/${name}.json`;
}

export const OPENAIP_SOURCES = [
  { key: "openaip_airports",  label: "Bandara Indonesia (OpenAIP)",
    group: "Aeronautika · OpenAIP", kind: "openaipAirports",
    url: openaipUrl("airports") },
  { key: "openaip_airspaces", label: "FIR & Airspace (OpenAIP)",
    group: "Aeronautika · OpenAIP", kind: "openaipAirspaces",
    url: openaipUrl("airspaces") },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

// ---------- Airports ----------

// OpenAIP airport `type` enum (from OpenAPI schema).
const AIRPORT_TYPE = new Map([
  [0,  { label: "Bandara (sipil/militer)", color: "#1e88e5" }],
  [1,  { label: "Glider Site",              color: "#7cb342" }],
  [2,  { label: "Airfield sipil",           color: "#1e88e5" }],
  [3,  { label: "Bandara internasional",    color: "#1565c0" }],
  [4,  { label: "Heliport militer",         color: "#d81b60" }],
  [5,  { label: "Aerodrome militer",        color: "#c62828" }],
  [6,  { label: "Ultralight",               color: "#8e24aa" }],
  [7,  { label: "Heliport sipil",           color: "#ec407a" }],
  [8,  { label: "Aerodrome closed",         color: "#757575" }],
  [9,  { label: "Heliport internasional",   color: "#ad1457" }],
  [10, { label: "Seaplane base",            color: "#00acc1" }],
  [11, { label: "Gliding",                  color: "#7cb342" }],
  [12, { label: "Airport resort",           color: "#26a69a" }],
  [13, { label: "Floatplane",               color: "#00acc1" }],
  [14, { label: "Landing strip",            color: "#a1887f" }],
  [15, { label: "Agricultural",             color: "#9e9d24" }],
  [16, { label: "Bandara privat",           color: "#6d4c41" }],
]);

const airportMeta = (t) => AIRPORT_TYPE.get(t) || { label: "Unknown", color: "#607d8b" };

// Frequency type → short label. Only the common ones need names — the rest fall through as "FRQ".
const FREQ_TYPE = new Map([
  [0,  "APP"], [1, "APP+"], [3, "ATIS"], [4, "AWIB"], [5, "CTAF"],
  [6, "DEP"], [7, "FIS"], [11, "GND"], [12, "INFO"], [14, "TWR"],
  [15, "UNICOM"], [18, "AFIS"],
]);

const freqLabel = (t) => FREQ_TYPE.get(t) || "FRQ";

// Runway surface enum → short label.
const SURFACE = new Map([
  [0, "Asphalt"], [1, "Concrete"], [2, "Grass"], [3, "Sand"],
  [4, "Water"], [5, "Bituminous"], [6, "Brick"], [7, "Macadam"],
  [8, "Stone"], [9, "Coral"], [10, "Clay"], [11, "Laterite"],
  [12, "Gravel"], [13, "Earth"], [14, "Ice"], [15, "Snow"],
  [16, "Protective laminate"], [17, "Metal"], [18, "Rubber"],
  [19, "Wood"], [20, "Unknown"],
]);

function radiusForAirportType(t) {
  if (t === 3 || t === 9) return 6;   // international
  if (t === 0 || t === 2 || t === 5) return 5; // civil/military
  return 4;
}

function airportPopupHtml(a) {
  const meta = airportMeta(a.type);
  const codes = [a.icaoCode, a.iataCode].filter(Boolean).join(" · ") || "—";
  const rwy = (a.runways || []).map(r => {
    const dim = r.length ? ` — ${r.length}m${r.width ? ` × ${r.width}m` : ""}` : "";
    const surf = r.surface != null ? ` (${SURFACE.get(r.surface) || "?"})` : "";
    return `RW ${escapeHtml(r.designator || "?")}${escapeHtml(dim)}${escapeHtml(surf)}`;
  }).join("<br/>") || "—";
  const freq = (a.frequencies || []).map(f =>
    `${escapeHtml(freqLabel(f.type))} ${escapeHtml(f.value)} <span style="opacity:.6">${escapeHtml(f.name || "")}</span>`
  ).join("<br/>") || "—";
  const flags = [
    a.private && "Privat",
    a.ppr && "PPR",
    a.skydiveActivity && "Skydive",
  ].filter(Boolean).join(" · ");
  const rows = [
    ["Kode", codes],
    ["Tipe", meta.label],
    ["Elevasi", a.elevation != null ? `${a.elevation} ft` : "—"],
    ["Runway", rwy],
    ["Frekuensi", freq],
    flags && ["Catatan", flags],
  ].filter(Boolean);
  const html = rows.map(([k, v]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${v}</td></tr>`
  ).join("");
  return `<div style="font-size:12px;line-height:1.45;max-width:340px"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(a.name)}</div><table>${html}</table></div>`;
}

function airportTooltipHtml(a) {
  const meta = airportMeta(a.type);
  const code = a.icaoCode || a.iataCode || "";
  return `<strong style="color:${meta.color}">${escapeHtml(a.name)}</strong>${code ? ` <span style="opacity:.7">(${escapeHtml(code)})</span>` : ""}`;
}

function addAirportMarker(a, group) {
  const c = a.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return;
  const [lng, lat] = c;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const meta = airportMeta(a.type);
  L.circleMarker([lat, lng], {
    radius: radiusForAirportType(a.type),
    fillColor: meta.color,
    fillOpacity: 0.85,
    color: "#fff",
    weight: 1,
    opacity: 0.9,
  })
    .bindTooltip(airportTooltipHtml(a), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(airportPopupHtml(a), { maxWidth: 360 })
    .addTo(group);
}

async function buildAirports(_key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = await r.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const group = L.layerGroup();
  for (const a of items) addAirportMarker(a, group);
  return group;
}

// ---------- Airspaces ----------

// OpenAIP airspace `type` enum. Colors follow ICAO chart conventions.
const AIRSPACE_TYPE = new Map([
  [0,  { label: "Other",                color: "#607d8b" }],
  [1,  { label: "Restricted",           color: "#e53935" }],
  [2,  { label: "Danger",               color: "#fdd835" }],
  [3,  { label: "Prohibited",           color: "#b71c1c" }],
  [4,  { label: "CTR",                  color: "#d84315" }],
  [5,  { label: "TMZ",                  color: "#00acc1" }],
  [6,  { label: "RMZ",                  color: "#00838f" }],
  [7,  { label: "TMA",                  color: "#fb8c00" }],
  [8,  { label: "TRA",                  color: "#8e24aa" }],
  [9,  { label: "TSA",                  color: "#6a1b9a" }],
  [10, { label: "FIR",                  color: "#1e88e5" }],
  [11, { label: "UIR",                  color: "#3949ab" }],
  [12, { label: "ADIZ",                 color: "#c62828" }],
  [13, { label: "ATZ",                  color: "#e65100" }],
  [14, { label: "MATZ",                 color: "#bf360c" }],
  [15, { label: "Airway",               color: "#5d4037" }],
  [16, { label: "MTR",                  color: "#5d4037" }],
  [17, { label: "Alert Area",           color: "#fbc02d" }],
  [18, { label: "Warning Area",         color: "#f9a825" }],
  [19, { label: "Protected Area",       color: "#00acc1" }],
  [20, { label: "HTZ",                  color: "#ec407a" }],
  [21, { label: "Gliding Sector",       color: "#7cb342" }],
  [22, { label: "TRP",                  color: "#8e24aa" }],
  [23, { label: "TIZ",                  color: "#43a047" }],
  [24, { label: "TIA",                  color: "#66bb6a" }],
  [25, { label: "MTA",                  color: "#5e35b1" }],
  [26, { label: "CTA",                  color: "#f57c00" }],
  [27, { label: "ACC",                  color: "#0277bd" }],
  [28, { label: "Sport & Rec",          color: "#c0ca33" }],
  [29, { label: "Low altitude zone",    color: "#78909c" }],
  [30, { label: "OTA",                  color: "#5c6bc0" }],
]);

const ICAO_CLASS = new Map([
  [0, "A"], [1, "B"], [2, "C"], [3, "D"], [4, "E"], [5, "F"], [6, "G"], [8, "Unclassified"],
]);

const airspaceMeta = (t) => AIRSPACE_TYPE.get(t) || { label: `Type ${t ?? "?"}`, color: "#607d8b" };

// referenceDatum: 0=GND, 1=MSL, 2=STD. unit: 1=FT, 6=FL. value=integer.
function fmtLimit(l) {
  if (!l) return "—";
  const { value, unit, referenceDatum } = l;
  if (referenceDatum === 0 && value === 0) return "GND";
  if (referenceDatum === 2 && unit === 6) return `FL${value}`;
  if (unit === 1) return `${value} ft ${referenceDatum === 1 ? "MSL" : ""}`.trim();
  return `${value}`;
}

function airspacePopupHtml(a) {
  const meta = airspaceMeta(a.type);
  const rows = [
    ["Nama", a.name],
    ["Tipe", meta.label],
    ["ICAO Class", ICAO_CLASS.get(a.icaoClass) || "—"],
    ["Batas atas", fmtLimit(a.upperLimit)],
    ["Batas bawah", fmtLimit(a.lowerLimit)],
  ];
  const html = rows.map(([k, v]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`
  ).join("");
  return `<div style="font-size:12px;line-height:1.45;max-width:300px"><table>${html}</table></div>`;
}

function airspaceTooltipHtml(a) {
  const meta = airspaceMeta(a.type);
  return `<strong style="color:${meta.color}">${escapeHtml(a.name)}</strong> <span style="opacity:.7">— ${escapeHtml(meta.label)}</span>`;
}

// Convert GeoJSON coordinate arrays ([lng,lat]) to Leaflet ([lat,lng]).
// Supports Polygon (rings) and MultiPolygon.
function polygonLatLngs(geom) {
  if (!geom) return null;
  if (geom.type === "Polygon") {
    return geom.coordinates.map(ring =>
      ring.map(([lng, lat]) => [lat, lng]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    );
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.map(poly =>
      poly.map(ring =>
        ring.map(([lng, lat]) => [lat, lng]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
      )
    );
  }
  return null;
}

function addAirspaceShape(a, group) {
  const latlngs = polygonLatLngs(a.geometry);
  if (!latlngs || latlngs.length === 0) return;
  const meta = airspaceMeta(a.type);
  // FIR polygons are huge — draw thin outline with almost-no fill so they
  // don't blanket the whole map. Everything else gets ~20% fill.
  const isFir = a.type === 10 || a.type === 11;
  const style = {
    color: meta.color,
    fillColor: meta.color,
    fillOpacity: isFir ? 0.04 : 0.22,
    weight: isFir ? 2 : 1.5,
    opacity: 0.9,
  };
  L.polygon(latlngs, style)
    .bindTooltip(airspaceTooltipHtml(a), { sticky: true, direction: "top", opacity: 0.95 })
    .bindPopup(airspacePopupHtml(a))
    .addTo(group);
}

async function buildAirspaces(_key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = await r.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const group = L.layerGroup();
  for (const a of items) addAirspaceShape(a, group);
  return group;
}

export const OPENAIP_BUILDERS = new Map([
  ["openaipAirports",  buildAirports],
  ["openaipAirspaces", buildAirspaces],
]);
