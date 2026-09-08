import L from "leaflet";
import { triangleIcon } from "./mapIcons";

// Snapshot GeoJSON from Smithsonian GVP WFS
// (webservices.volcano.si.edu/geoserver/GVP-VOTW/ows), pinned into the build
// so we don't hammer the upstream on every page load. Re-fetch periodically to
// pick up newly confirmed eruptions.
function volcanoUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}veins/volcanoes.json`;
}

export const VOLCANO_SOURCES = [
  { key: "volcanoes_gvp", label: "Gunung Api (Smithsonian GVP)", group: "Vulkano",
    kind: "volcanoes", url: volcanoUrl() },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

const ACTIVITY_COLORS = {
  active:   "#e53935", // erupted 1900 or later
  historic: "#fb8c00", // 1500–1899
  holocene: "#8d6e63", // older
};

function classifyActivity(lastYear) {
  if (!Number.isFinite(lastYear)) return "holocene";
  if (lastYear >= 1900) return "active";
  if (lastYear >= 1500) return "historic";
  return "holocene";
}

// Triangle icon size in px (larger than the old circle radius so the
// glyph is legible at typical zooms).
function sizeForElevation(m) {
  if (m == null) return 12;
  if (m < 500) return 12;
  if (m < 2000) return 14;
  if (m < 4000) return 18;
  return 22;
}

function formatYear(y) {
  if (!Number.isFinite(y)) return "—";
  if (y < 0) return `${-y} SM`;
  return String(y);
}

function popupRows(p) {
  return [
    ["Nama", p.Volcano_Name],
    ["Negara", p.Country],
    ["Wilayah", [p.Subregion, p.Region].filter(Boolean).join(" · ")],
    ["Tipe", p.Primary_Volcano_Type],
    ["Landform", p.Volcanic_Landform],
    ["Elevasi", p.Elevation != null ? `${p.Elevation} m` : "—"],
    ["Batuan utama", p.Major_Rock_Type],
    ["Tektonik", p.Tectonic_Setting],
    ["Erupsi terakhir", formatYear(p.Last_Eruption_Year)],
    ["Bukti", p.Evidence_Category],
    ["GVP #", p.Volcano_Number],
  ];
}

function popupPhotoHtml(p) {
  if (!p.Primary_Photo_Link) return "";
  const cap = [p.Primary_Photo_Caption, p.Primary_Photo_Credit].filter(Boolean).join(" — ");
  const capHtml = cap
    ? `<div style="margin-top:4px;font-size:11px;opacity:.75;line-height:1.4">${escapeHtml(cap)}</div>`
    : "";
  return `<div style="margin-top:8px"><img src="${escapeHtml(p.Primary_Photo_Link)}" alt="${escapeHtml(p.Volcano_Name)}" loading="lazy" style="max-width:100%;border-radius:4px" />${capHtml}</div>`;
}

function popupHtml(p) {
  const tbl = popupRows(p).map(([k, v]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
  ).join("");
  const desc = p.Geological_Summary
    ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);opacity:.85">${escapeHtml(p.Geological_Summary)}</div>`
    : "";
  const link = p.Volcano_Number
    ? `<div style="margin-top:6px"><a href="https://volcano.si.edu/volcano.cfm?vn=${encodeURIComponent(p.Volcano_Number)}" target="_blank" rel="noopener noreferrer" style="color:#3388ff">Lihat di volcano.si.edu →</a></div>`
    : "";
  return `<div style="font-size:12px;line-height:1.45;max-width:340px"><table>${tbl}</table>${popupPhotoHtml(p)}${desc}${link}</div>`;
}

function tooltipHtml(p) {
  return `<strong>${escapeHtml(p.Volcano_Name)}</strong> — ${escapeHtml(p.Country)}<br/><span style="opacity:.75">${escapeHtml(p.Primary_Volcano_Type)} · erupsi ${escapeHtml(formatYear(p.Last_Eruption_Year))}</span>`;
}

function coordFromFeature(f) {
  const g = f.geometry;
  if (g?.type === "Point" && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const p = f.properties || {};
  if (Number.isFinite(p.Latitude) && Number.isFinite(p.Longitude)) {
    return { lat: p.Latitude, lng: p.Longitude };
  }
  return null;
}

function addVolcanoMarker(feature, group) {
  const coords = coordFromFeature(feature);
  if (!coords) return;
  const p = feature.properties || {};
  const activity = classifyActivity(p.Last_Eruption_Year);
  L.marker([coords.lat, coords.lng], {
    icon: triangleIcon({
      size: sizeForElevation(p.Elevation),
      fill: ACTIVITY_COLORS[activity],
      fillOpacity: 0.85,
    }),
    riseOnHover: true,
  })
    .bindTooltip(tooltipHtml(p), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(popupHtml(p), { maxWidth: 360 })
    .addTo(group);
}

async function buildVolcanoes(_key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = await r.json();
  const features = Array.isArray(data?.features) ? data.features : [];
  const group = L.layerGroup();
  for (const f of features) addVolcanoMarker(f, group);
  return group;
}

export const VOLCANO_BUILDERS = new Map([
  ["volcanoes", buildVolcanoes],
]);
