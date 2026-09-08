import L from "leaflet";
import { anchorIcon } from "./mapIcons";

// Snapshot vendored from SeaRates World Sea Ports API
// (https://docs.searates.com/spec/world-sea-ports-v1-openapi.json).
// Snapshots live in public/searates/ports.json and are refreshed manually
// with scripts/refresh-searates-ports.mjs when the operator has an
// api_key from geocoding.searates.com. Until then, the file ships a seed
// of ~15 major Indonesian sea ports (public OSM/UN-LOCODE coordinates)
// so the overlay is not empty out of the box.
//
// Endpoint used:
//   POST https://geocoding.searates.com/geo/world-sea-ports/list-by-country
//   { "country_code": "ID", "is_river": false }
// Auth: api_key as a query parameter.
// Attribution: © SeaRates by DP World — for research/reference. Consult
// the terms at searates.com before commercial use.

function searatesUrl(name) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}searates/${name}.json`;
}

export const SEARATES_SOURCES = [
  { key: "searates_ports", label: "Pelabuhan Indonesia (SeaRates)",
    group: "Maritim · SeaRates", kind: "searatesPorts",
    url: searatesUrl("ports") },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

// Colour a port marker by its dominant intermodal role. SeaRates flags
// every terminal type an entity is served by (sea, river, rail, road,
// air, ICD). We paint the anchor based on the "main" feature.
function portColor(features = {}) {
  if (features.is_seaport && features.is_rail_terminal) return "#0277bd"; // intermodal — deep blue
  if (features.is_seaport) return "#0288d1";                              // pure sea — blue
  if (features.is_river || features.is_river_port) return "#00838f";      // river — teal
  if (features.is_icd) return "#6a1b9a";                                  // ICD only — purple
  return "#546e7a";                                                       // fallback grey-blue
}

// Rough size hint: TEU throughput places top hubs (Tanjung Priok ~7M TEU,
// Tanjung Perak ~4M TEU) as the biggest anchors; unknown TEU → default.
function portSize(port) {
  const t = port.teu || 0;
  if (t >= 3_000_000) return 24;
  if (t >= 1_000_000) return 20;
  if (t >= 200_000)   return 18;
  return 16;
}

function featureBadges(features = {}) {
  const flags = [
    features.is_seaport        && "SEA",
    features.is_river          && "RIVER",
    features.is_river_port     && "RIVER",
    features.is_rail_terminal  && "RAIL",
    features.is_road_terminal  && "ROAD",
    features.is_airport        && "AIR",
    features.is_icd            && "ICD",
    features.is_fixed_transport && "FIXED",
  ].filter(Boolean);
  // De-duplicate while preserving order (RIVER can appear twice above).
  return [...new Set(flags)];
}

function portPopupHtml(p) {
  const badges = featureBadges(p.features).map(b =>
    `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:rgba(2,136,209,.15);color:#0277bd;font-size:10px;margin-right:4px;font-family:'DM Mono',monospace">${escapeHtml(b)}</span>`
  ).join("") || "—";
  const rows = [
    ["LOCODE", p.locode || "—"],
    ["Kota", p.city || (p.city?.name) || "—"],
    ["Koordinat", Array.isArray(p.location)
      ? `${p.location[0].toFixed(4)}, ${p.location[1].toFixed(4)}`
      : "—"],
    p.teu != null && p.teu > 0 && ["TEU/tahun", p.teu.toLocaleString("id-ID")],
    ["Fungsi", badges],
  ].filter(Boolean);
  const html = rows.map(([k, v]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${typeof v === "string" ? escapeHtml(v) : v}</td></tr>`
  ).join("");
  return `<div style="font-size:12px;line-height:1.5;max-width:280px"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(p.name)}</div><table>${html}</table></div>`;
}

function portTooltipHtml(p) {
  const code = p.locode ? ` <span style="opacity:.7">(${escapeHtml(p.locode)})</span>` : "";
  return `<strong style="color:${portColor(p.features)}">${escapeHtml(p.name)}</strong>${code}`;
}

// SearRates responses put city as an object ({id, name, location}); the
// seed file uses a plain string. Normalise so popups always show a name.
function normaliseCity(p) {
  if (p && typeof p.city === "object" && p.city) return p.city.name || "";
  return p.city || "";
}

function addPortMarker(port, group) {
  const loc = port.location;
  if (!Array.isArray(loc) || loc.length < 2) return;
  const [lat, lng] = loc;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const color = portColor(port.features);
  const size = portSize(port);
  const view = { ...port, city: normaliseCity(port) };
  L.marker([lat, lng], {
    icon: anchorIcon({ size, color }),
    riseOnHover: true,
  })
    .bindTooltip(portTooltipHtml(view), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(portPopupHtml(view), { maxWidth: 320 })
    .addTo(group);
}

async function buildPorts(_key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = await r.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const group = L.layerGroup();
  for (const p of items) {
    // Only render entities that actually serve as a sea port. SeaRates
    // "tradeports" also include pure ICDs / rail terminals; those don't
    // belong on an anchor-icon layer.
    if (p.features && p.features.is_seaport === false) continue;
    addPortMarker(p, group);
  }
  return group;
}

export const SEARATES_BUILDERS = new Map([
  ["searatesPorts", buildPorts],
]);
