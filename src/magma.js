import L from "leaflet";

// MAGMA Indonesia (PVMBG · ESDM) embeds the current volcano roster + activity
// level inline in the homepage HTML as `var markersGunungApi = [...]`. There
// is no separate JSON API, so we fetch the homepage through the same PHP
// proxy the BMKG layers use and regex-extract the array on the client.
//
// MAGMA is intermittently unreachable and appears to rate-limit / IP-block
// datacenter ranges, so if the live fetch fails we fall back to a vendored
// snapshot at public/magma/volcanoes.json. Refresh the snapshot periodically
// by fetching the homepage manually and re-running the extractor.
function magmaLiveUrl() {
  if (import.meta.env.DEV) return "/magma-web/";
  return "https://rebornian48.my.id/bmkg/proxy.php?h=magma&p=";
}

function magmaSnapshotUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}magma/volcanoes.json`;
}

export const MAGMA_SOURCES = [
  { key: "magma_gunungapi", label: "Status Gunung Api (MAGMA)",
    group: "Vulkano", kind: "magmaVolcanoes", url: magmaLiveUrl() },
];

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

// ga_status: 1 = Normal, 2 = Waspada, 3 = Siaga, 4 = Awas
const STATUS_META = new Map([
  [1, { level: "I",   label: "Normal",  color: "#43a047", ring: "rgba(67,160,71,0.9)" }],
  [2, { level: "II",  label: "Waspada", color: "#fdd835", ring: "rgba(253,216,53,0.95)" }],
  [3, { level: "III", label: "Siaga",   color: "#fb8c00", ring: "rgba(251,140,0,0.95)" }],
  [4, { level: "IV",  label: "Awas",    color: "#e53935", ring: "rgba(229,57,53,0.95)" }],
]);

function statusOf(code) {
  return STATUS_META.get(code) || { level: "?", label: "—", color: "#9e9e9e", ring: "rgba(158,158,158,0.9)" };
}

function radiusForStatus(code) {
  // Bigger for higher alert so the eye lands on them first.
  if (code >= 4) return 10;
  if (code === 3) return 8;
  if (code === 2) return 6;
  return 5;
}

function extractVolcanoArray(html) {
  const start = html.indexOf("var markersGunungApi");
  if (start < 0) throw new Error("MAGMA: markersGunungApi variable not found");
  const arrStart = html.indexOf("[", start);
  if (arrStart < 0) throw new Error("MAGMA: array start not found");
  let depth = 0;
  let i = arrStart;
  let inStr = false;
  let esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = false; continue; }
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { i++; break; } }
  }
  const arr = html.slice(arrStart, i);
  return JSON.parse(arr);
}

function popupRows(v, st) {
  const rows = [
    ["Nama", `Gunung ${v.ga_nama_gapi}`],
    ["Status", `Level ${st.level} · ${st.label}`],
    ["Kabupaten/Kota", v.ga_kab_gapi],
    ["Provinsi", v.ga_prov_gapi],
    ["Elevasi", v.ga_elev_gapi != null ? `${v.ga_elev_gapi} m` : "—"],
    ["Kode MAGMA", v.ga_code],
  ];
  if (v.has_vona && v.noticenumber) rows.push(["VONA aktif", v.noticenumber]);
  return rows;
}

function popupHtml(v, st) {
  const tbl = popupRows(v, st).map(([k, val]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(val)}</td></tr>`,
  ).join("");
  const link = `<div style="margin-top:6px"><a href="https://magma.esdm.go.id/v1/gunung-api/laporan-harian" target="_blank" rel="noopener noreferrer" style="color:#3388ff">Laporan MAGMA →</a></div>`;
  return `<div style="font-size:12px;line-height:1.45;max-width:320px"><table>${tbl}</table>${link}</div>`;
}

function tooltipHtml(v, st) {
  return `<strong>Gunung ${escapeHtml(v.ga_nama_gapi)}</strong> — <span style="color:${st.color}">Level ${st.level} (${escapeHtml(st.label)})</span><br/><span style="opacity:.75">${escapeHtml(v.ga_prov_gapi)}${v.has_vona ? " · VONA aktif" : ""}</span>`;
}

function addMagmaMarker(v, group) {
  if (!Number.isFinite(v.ga_lat_gapi) || !Number.isFinite(v.ga_lon_gapi)) return;
  const st = statusOf(v.ga_status);
  L.circleMarker([v.ga_lat_gapi, v.ga_lon_gapi], {
    radius: radiusForStatus(v.ga_status),
    fillColor: st.color,
    fillOpacity: 0.9,
    color: "#fff",
    weight: 1.5,
    opacity: 0.95,
  })
    .bindTooltip(tooltipHtml(v, st), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(popupHtml(v, st), { maxWidth: 340 })
    .addTo(group);
}

async function fetchLive(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return extractVolcanoArray(await r.text());
}

async function fetchSnapshot() {
  const r = await fetch(magmaSnapshotUrl(), { cache: "no-store" });
  if (!r.ok) throw new Error(`snapshot HTTP ${r.status}`);
  return r.json();
}

function countByStatus(list) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const v of list) {
    const s = v.ga_status;
    if (counts[s] !== undefined) counts[s] += 1;
  }
  return counts;
}

async function buildMagma(_key, url) {
  let list;
  let source = "live";
  try {
    list = await fetchLive(url);
  } catch (e) {
    console.warn("MAGMA live fetch failed, using vendored snapshot:", e.message);
    list = await fetchSnapshot();
    source = "snapshot";
  }
  const group = L.layerGroup();
  for (const v of list) addMagmaMarker(v, group);
  // Expose per-level counts (and data source) so the legend can label them.
  group._meta = { counts: countByStatus(list), total: list.length, source };
  return group;
}

export const MAGMA_BUILDERS = new Map([
  ["magmaVolcanoes", buildMagma],
]);
