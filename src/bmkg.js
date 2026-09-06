import L from "leaflet";

// ============================ ENDPOINT ROUTING ============================

// Dev: use Vite proxies. Prod: use one PHP proxy that switches upstream by
// the `h` query param (data|www|api). Both branches produce the same final
// URL from the caller's perspective, with `?q=` optionally appended for the
// cuaca endpoint's own query string.
function bmkgUrl(host, path, query = "") {
  const devPrefix = { data: "/bmkg-cdn", www: "/bmkg-www", api: "/bmkg-api" }[host];
  const qs = query ? `?${query}` : "";
  if (import.meta.env.DEV) return `${devPrefix}/${path}${qs}`;
  const base = `https://rebornian48.my.id/bmkg/proxy.php?h=${host}&p=${encodeURIComponent(path)}`;
  return query ? `${base}&q=${encodeURIComponent(query)}` : base;
}

const SHAKEMAP_BASE = "https://static.bmkg.go.id/";

// ============================ SOURCES ============================

// Major Indonesian cities with verified BMKG adm4 codes.
// Format: PP.KK.KK.DDDD (provinsi.kabupaten.kecamatan.desa).
const CUACA_CITIES = [
  { adm4: "12.71.01.1001", label: "Medan" },
  { adm4: "16.71.01.1001", label: "Palembang" },
  { adm4: "31.71.01.1001", label: "Jakarta Pusat" },
  { adm4: "32.73.01.1001", label: "Bandung" },
  { adm4: "33.74.01.1001", label: "Semarang" },
  { adm4: "34.71.01.1001", label: "Yogyakarta" },
  { adm4: "35.78.16.1001", label: "Surabaya" },
  { adm4: "51.71.01.1001", label: "Denpasar" },
  { adm4: "64.71.01.1001", label: "Balikpapan" },
  { adm4: "73.71.01.1001", label: "Makassar" },
  { adm4: "82.71.01.1001", label: "Ternate" },
];

export const BMKG_SOURCES = [
  { key: "bmkg_gempa_auto",    label: "Gempa Terbaru",              group: "BMKG · Gempa",           kind: "bmkgGempa", url: bmkgUrl("data", "DataMKG/TEWS/autogempa.json") },
  { key: "bmkg_gempa_terkini", label: "Gempa Terkini (M 5+)",       group: "BMKG · Gempa",           kind: "bmkgGempa", url: bmkgUrl("data", "DataMKG/TEWS/gempaterkini.json") },
  { key: "bmkg_gempa_rasa",    label: "Gempa Dirasakan",            group: "BMKG · Gempa",           kind: "bmkgGempa", url: bmkgUrl("data", "DataMKG/TEWS/gempadirasakan.json") },
  { key: "bmkg_cap_nowcast",   label: "Peringatan Dini Cuaca",      group: "BMKG · Peringatan Dini", kind: "bmkgCap",   url: bmkgUrl("www",  "alerts/nowcast/id/rss.xml") },
  { key: "bmkg_cuaca_kota",    label: "Cuaca Kota Besar (hari ini)", group: "BMKG · Cuaca",           kind: "bmkgCuaca", url: "" },
];

// ============================ SHARED HELPERS ============================

const escapeHtml = (s) => {
  const div = document.createElement("div");
  div.textContent = String(s ?? "");
  return div.innerHTML;
};

async function fetchLive(url, asJson = false) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return asJson ? r.json() : r.text();
}

// ============================ GEMPA ============================

function parseCoords(str) {
  const m = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(String(str || ""));
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
}

function parseDepthKm(str) {
  const m = /(\d+(?:\.\d+)?)/.exec(String(str || ""));
  return m ? parseFloat(m[1]) : null;
}

function depthColor(km) {
  if (km == null) return "#888";
  if (km < 70) return "#e53935";
  if (km < 300) return "#fb8c00";
  return "#1e88e5";
}

function magRadius(mag) {
  const m = parseFloat(mag) || 3;
  return Math.max(5, Math.min(24, m * 2.5));
}

function gempaRows(g) {
  const rows = [
    ["Waktu", `${g.Tanggal || ""} ${g.Jam || ""}`.trim()],
    ["Magnitude", `M ${g.Magnitude ?? "-"}`],
    ["Kedalaman", g.Kedalaman ?? "-"],
    ["Wilayah", g.Wilayah ?? "-"],
    ["Koordinat", `${g.Lintang || ""}, ${g.Bujur || ""}`],
    ["Potensi", g.Potensi ?? "-"],
  ];
  if (g.Dirasakan) rows.push(["Dirasakan", g.Dirasakan]);
  return rows;
}

function gempaShakemapHtml(g) {
  if (!g.Shakemap) return "";
  const src = SHAKEMAP_BASE + encodeURIComponent(g.Shakemap);
  return `<div style="margin-top:8px"><img src="${src}" alt="Shakemap" style="max-width:240px;width:100%;border-radius:4px" loading="lazy"/></div>`;
}

function gempaPopupHtml(g) {
  const tbl = gempaRows(g).map(([k, v]) =>
    `<tr><td style="opacity:.6;padding-right:8px;vertical-align:top">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`,
  ).join("");
  return `<div style="font-size:12px;line-height:1.45"><table>${tbl}</table>${gempaShakemapHtml(g)}</div>`;
}

function gempaTooltipHtml(g) {
  return `<strong>M ${escapeHtml(g.Magnitude ?? "-")}</strong> — ${escapeHtml(g.Wilayah || "")}<br/><span style="opacity:.7">${escapeHtml(g.Kedalaman || "")}</span>`;
}

function addGempaMarker(g, group) {
  const coords = parseCoords(g.Coordinates);
  if (!coords) return;
  const km = parseDepthKm(g.Kedalaman);
  L.circleMarker([coords.lat, coords.lng], {
    radius: magRadius(g.Magnitude),
    fillColor: depthColor(km),
    fillOpacity: 0.55,
    color: "#fff",
    weight: 1.5,
    opacity: 0.9,
  })
    .bindTooltip(gempaTooltipHtml(g), { direction: "top", opacity: 0.95, sticky: true })
    .bindPopup(gempaPopupHtml(g), { maxWidth: 280 })
    .addTo(group);
}

function gempaListFromJson(data) {
  const field = data?.Infogempa?.gempa;
  if (Array.isArray(field)) return field;
  if (field) return [field];
  return [];
}

async function buildGempa(key, url) {
  const data = await fetchLive(url, true);
  const group = L.layerGroup();
  for (const g of gempaListFromJson(data)) addGempaMarker(g, group);
  return group;
}

// ============================ CAP (Peringatan Dini) ============================

const CAP_COLORS = new Map([
  ["Extreme", "#7b1fa2"],
  ["Severe", "#e53935"],
  ["Moderate", "#fb8c00"],
  ["Minor", "#fdd835"],
  ["Unknown", "#9e9e9e"],
]);

function nsAll(node, tag) {
  return node.getElementsByTagNameNS("*", tag);
}

function capText(node, tag) {
  const els = nsAll(node, tag);
  return els.length ? els[0].textContent.trim() : "";
}

function capRows(info, areaDesc) {
  return [
    ["Event", capText(info, "event")],
    ["Severity", capText(info, "severity")],
    ["Urgency", capText(info, "urgency")],
    ["Certainty", capText(info, "certainty")],
    ["Headline", capText(info, "headline")],
    ["Wilayah", areaDesc],
    ["Berlaku s.d.", capText(info, "expires")],
    ["Deskripsi", capText(info, "description")],
  ].filter(([, v]) => v);
}

function capInfoHtml(info) {
  const web = capText(info, "web");
  const link = web
    ? `<div style="margin-top:6px"><a href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer" style="color:#3388ff">Infografis BMKG →</a></div>`
    : "";
  return link;
}

function capPopupHtml(info, areaDesc) {
  const areaSummary = capRows(info, areaDesc).map(([k, v]) =>
    `<div style="margin-bottom:4px"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`,
  ).join("");
  return `<div style="font-size:12px;line-height:1.45;max-width:320px">${areaSummary}${capInfoHtml(info)}</div>`;
}

function capStyle(severity) {
  const color = CAP_COLORS.get(severity) || "#888";
  return { color, fillColor: color, fillOpacity: 0.25, weight: 2, opacity: 0.85 };
}

function parseCapPolygon(str) {
  return String(str || "").trim().split(/\s+/).map((p) => {
    const [lat, lng] = p.split(",").map(parseFloat);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return [lat, lng];
  }).filter(Boolean);
}

function parseCapCircle(str) {
  const parts = String(str || "").trim().split(/\s+/);
  if (parts.length < 2) return null;
  const [lat, lng] = parts[0].split(",").map(parseFloat);
  const radiusKm = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) return null;
  return { lat, lng, radiusM: radiusKm * 1000 };
}

function bindCapPopups(shape, info, areaDesc) {
  const tip = escapeHtml(capText(info, "headline") || areaDesc || capText(info, "event"));
  return shape
    .bindTooltip(tip, { sticky: true, direction: "top", opacity: 0.95 })
    .bindPopup(capPopupHtml(info, areaDesc));
}

function addCapPolygons(areaEl, info, style, areaDesc, group) {
  for (const p of nsAll(areaEl, "polygon")) {
    const pts = parseCapPolygon(p.textContent);
    if (pts.length < 3) continue;
    bindCapPopups(L.polygon(pts, style), info, areaDesc).addTo(group);
  }
}

function addCapCircles(areaEl, info, style, areaDesc, group) {
  for (const c of nsAll(areaEl, "circle")) {
    const parsed = parseCapCircle(c.textContent);
    if (!parsed) continue;
    bindCapPopups(
      L.circle([parsed.lat, parsed.lng], { ...style, radius: parsed.radiusM }),
      info,
      areaDesc,
    ).addTo(group);
  }
}

function addCapArea(info, areaEl, group) {
  const style = capStyle(capText(info, "severity") || "Unknown");
  const areaDesc = capText(areaEl, "areaDesc");
  addCapPolygons(areaEl, info, style, areaDesc, group);
  addCapCircles(areaEl, info, style, areaDesc, group);
}

function alertUrlFromRssLink(link) {
  // RSS <link> is https://www.bmkg.go.id/alerts/nowcast/id/<ID>_alert.xml
  const m = /alerts\/nowcast\/id\/([A-Za-z0-9]+_alert\.xml)/.exec(String(link || ""));
  if (!m) return null;
  return bmkgUrl("www", `alerts/nowcast/id/${m[1]}`);
}

async function fetchAlertXml(url) {
  try {
    const text = await fetchLive(url);
    return new DOMParser().parseFromString(text, "application/xml");
  } catch (e) {
    console.warn("CAP alert fetch failed:", url, e);
    return null;
  }
}

async function buildCap(key, url) {
  const rssText = await fetchLive(url);
  const rss = new DOMParser().parseFromString(rssText, "application/xml");
  const links = [...rss.getElementsByTagName("item")]
    .map((it) => alertUrlFromRssLink(it.getElementsByTagName("link")[0]?.textContent))
    .filter(Boolean);
  const docs = await Promise.all(links.map(fetchAlertXml));

  const group = L.layerGroup();
  for (const doc of docs) {
    if (!doc) continue;
    for (const info of nsAll(doc, "info")) {
      for (const area of nsAll(info, "area")) addCapArea(info, area, group);
    }
  }
  return group;
}

// ============================ CUACA ============================

// Map BMKG weather codes → emoji + Indonesian label (used as a fallback
// when the API's own weather_desc is missing).
const WEATHER_ICONS = new Map([
  [0,  ["☀️", "Cerah"]],
  [1,  ["🌤️", "Cerah Berawan"]],
  [2,  ["🌤️", "Cerah Berawan"]],
  [3,  ["⛅", "Berawan"]],
  [4,  ["☁️", "Berawan Tebal"]],
  [5,  ["🌫️", "Udara Kabur"]],
  [10, ["🌫️", "Asap"]],
  [45, ["🌫️", "Kabut"]],
  [60, ["🌦️", "Hujan Ringan"]],
  [61, ["🌧️", "Hujan Sedang"]],
  [63, ["🌧️", "Hujan Lebat"]],
  [80, ["🌧️", "Hujan Lokal"]],
  [95, ["⛈️", "Hujan Petir"]],
  [97, ["⛈️", "Hujan Petir"]],
]);

function weatherIconOf(code, descFallback) {
  const [icon, label] = WEATHER_ICONS.get(Number(code)) || ["🌡️", descFallback || "—"];
  return { icon, label: descFallback || label };
}

function pickNowSlot(cuaca) {
  const now = Date.now();
  let best = null;
  let bestDiff = Infinity;
  for (const day of cuaca || []) {
    for (const slot of day || []) {
      const t = Date.parse(slot.datetime);
      if (!Number.isFinite(t)) continue;
      const diff = Math.abs(t - now);
      if (diff < bestDiff) { bestDiff = diff; best = slot; }
    }
  }
  return best;
}

function cuacaTooltipHtml(city, slot, wi) {
  const t = slot?.t != null ? `${slot.t}°C` : "—";
  return `<strong>${escapeHtml(city.label)}</strong> ${wi.icon} ${t}`;
}

function cuacaPopupHtml(city, lokasi, slot, wi) {
  const wilayah = [lokasi?.desa, lokasi?.kecamatan, lokasi?.kotkab, lokasi?.provinsi]
    .filter(Boolean).join(", ");
  const rows = [
    ["Kota", city.label],
    ["Wilayah data", wilayah],
    ["Cuaca", `${wi.icon} ${wi.label}`],
    ["Suhu", slot?.t != null ? `${slot.t}°C` : "—"],
    ["Kelembapan", slot?.hu != null ? `${slot.hu}%` : "—"],
    ["Angin", [slot?.ws && `${slot.ws} km/j`, slot?.wd].filter(Boolean).join(" ") || "—"],
    ["Jarak pandang", slot?.vs_text || "—"],
    ["Waktu setempat", slot?.local_datetime || "—"],
  ];
  const items = rows.map(([k, v]) =>
    `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`,
  ).join("");
  return `<div style="font-size:12px;line-height:1.45;max-width:260px">${items}</div>`;
}

function cuacaDivIcon(wi) {
  const html = `<div style="font-size:18px;line-height:1;white-space:nowrap;text-shadow:0 0 3px rgba(0,0,0,.55)">${wi.icon}</div>`;
  return L.divIcon({ html, className: "bmkg-cuaca-icon", iconSize: [24, 24], iconAnchor: [12, 12] });
}

async function fetchCityCuaca(city) {
  try {
    const url = bmkgUrl("api", "publik/prakiraan-cuaca", `adm4=${city.adm4}`);
    const j = await fetchLive(url, true);
    return { city, lokasi: j.lokasi, slot: pickNowSlot(j.data?.[0]?.cuaca) };
  } catch (e) {
    console.warn(`Cuaca fetch failed for ${city.label}:`, e);
    return null;
  }
}

function addCityMarker(entry, group) {
  if (!entry?.lokasi) return;
  const { lat, lon } = entry.lokasi;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const wi = weatherIconOf(entry.slot?.weather, entry.slot?.weather_desc);
  L.marker([lat, lon], { icon: cuacaDivIcon(wi) })
    .bindTooltip(cuacaTooltipHtml(entry.city, entry.slot, wi), { direction: "top", opacity: 0.95 })
    .bindPopup(cuacaPopupHtml(entry.city, entry.lokasi, entry.slot, wi))
    .addTo(group);
}

async function buildCuaca(_key, _url) {
  const entries = await Promise.all(CUACA_CITIES.map(fetchCityCuaca));
  const group = L.layerGroup();
  for (const e of entries) addCityMarker(e, group);
  return group;
}

export const BMKG_BUILDERS = new Map([
  ["bmkgGempa", buildGempa],
  ["bmkgCap", buildCap],
  ["bmkgCuaca", buildCuaca],
]);
