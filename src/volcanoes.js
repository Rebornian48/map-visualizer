import L from "leaflet";

function volcanoUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}veins/volcanoes.json`;
}

export const VOLCANO_SOURCES = [
  { key: "volcanoes_gvp", label: "Gunung Api (GVP · Holocene)", group: "Vulkano",
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

function classifyActivity(years) {
  if (!Array.isArray(years) || years.length === 0) return "holocene";
  const last = Math.max(...years);
  if (last >= 1900) return "active";
  if (last >= 1500) return "historic";
  return "holocene";
}

function radiusForElevation(m) {
  if (m == null) return 3;
  if (m < 500) return 3;
  if (m < 2000) return 4;
  if (m < 4000) return 5;
  return 6;
}

function formatYear(y) {
  if (y < 0) return `${-y} SM`;
  return String(y);
}

function lastEruption(years) {
  if (!Array.isArray(years) || years.length === 0) return "—";
  return formatYear(Math.max(...years));
}

function popupHtml(v) {
  const rows = [
    ["Nama", v.n],
    ["Negara", v.c],
    ["Wilayah", v.r],
    ["Tipe", v.t],
    ["Elevasi", v.e != null ? `${v.e} m` : "—"],
    ["Batuan utama", v.k],
    ["Tektonik", v.s],
    ["Erupsi terakhir", lastEruption(v.y)],
  ];
  const table = rows.map(([k, val]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(val)}</td></tr>`,
  ).join("");
  const desc = v.d
    ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);opacity:.85">${escapeHtml(v.d)}</div>`
    : "";
  return `<div style="font-size:12px;line-height:1.45;max-width:320px"><table>${table}</table>${desc}</div>`;
}

function tooltipHtml(v) {
  return `<strong>${escapeHtml(v.n)}</strong> — ${escapeHtml(v.c)}<br/><span style="opacity:.75">${escapeHtml(v.t)} · ${escapeHtml(lastEruption(v.y))}</span>`;
}

function addVolcanoMarker(v, group) {
  if (!Number.isFinite(v.la) || !Number.isFinite(v.lo)) return;
  const activity = classifyActivity(v.y);
  L.circleMarker([v.la, v.lo], {
    radius: radiusForElevation(v.e),
    fillColor: ACTIVITY_COLORS[activity],
    fillOpacity: 0.75,
    color: "#fff",
    weight: 1,
    opacity: 0.85,
  })
    .bindTooltip(tooltipHtml(v), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(popupHtml(v), { maxWidth: 340 })
    .addTo(group);
}

async function buildVolcanoes(_key, url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const data = await r.json();
  const group = L.layerGroup();
  for (const v of data) addVolcanoMarker(v, group);
  return group;
}

export const VOLCANO_BUILDERS = new Map([
  ["volcanoes", buildVolcanoes],
]);
