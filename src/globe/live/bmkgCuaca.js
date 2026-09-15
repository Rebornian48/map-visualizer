// BMKG Cuaca — current weather for 11 major cities via
// api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<code>. Each city fetched
// separately, then rendered as HTML markers with an emoji so the icon
// can convey the weather code without a sprite atlas.

import * as maplibregl from 'maplibre-gl'

function bmkgUrl(host, path, query = '') {
  const devPrefix = { data: '/bmkg-cdn', www: '/bmkg-www', api: '/bmkg-api' }[host]
  const qs = query ? `?${query}` : ''
  if (import.meta.env.DEV) return `${devPrefix}/${path}${qs}`
  const base = `https://rebornian48.my.id/bmkg/proxy.php?h=${host}&p=${encodeURIComponent(path)}`
  return query ? `${base}&q=${encodeURIComponent(query)}` : base
}

const CITIES = [
  { adm4: '12.71.01.1001', label: 'Medan' },
  { adm4: '16.71.01.1001', label: 'Palembang' },
  { adm4: '31.71.01.1001', label: 'Jakarta Pusat' },
  { adm4: '32.73.01.1001', label: 'Bandung' },
  { adm4: '33.74.01.1001', label: 'Semarang' },
  { adm4: '34.71.01.1001', label: 'Yogyakarta' },
  { adm4: '35.78.16.1001', label: 'Surabaya' },
  { adm4: '51.71.01.1001', label: 'Denpasar' },
  { adm4: '64.71.01.1001', label: 'Balikpapan' },
  { adm4: '73.71.01.1001', label: 'Makassar' },
  { adm4: '82.71.01.1001', label: 'Ternate' },
]

const WEATHER_ICONS = {
  0:  ['☀️', 'Cerah'],
  1:  ['🌤️', 'Cerah Berawan'],
  2:  ['🌤️', 'Cerah Berawan'],
  3:  ['⛅', 'Berawan'],
  4:  ['☁️', 'Berawan Tebal'],
  5:  ['🌫️', 'Udara Kabur'],
  10: ['🌫️', 'Asap'],
  45: ['🌫️', 'Kabut'],
  60: ['🌦️', 'Hujan Ringan'],
  61: ['🌧️', 'Hujan Sedang'],
  63: ['🌧️', 'Hujan Lebat'],
  80: ['🌧️', 'Hujan Lokal'],
  95: ['⛈️', 'Hujan Petir'],
  97: ['⛈️', 'Hujan Petir'],
}

function weatherIconOf(code, descFallback) {
  const [icon, label] = WEATHER_ICONS[Number(code)] || ['🌡️', descFallback || '—']
  return { icon, label: descFallback || label }
}

function pickNowSlot(cuaca) {
  const now = Date.now()
  let best = null
  let bestDiff = Infinity
  for (const day of cuaca || []) {
    for (const slot of day || []) {
      const t = Date.parse(slot.datetime)
      if (!Number.isFinite(t)) continue
      const diff = Math.abs(t - now)
      if (diff < bestDiff) { bestDiff = diff; best = slot }
    }
  }
  return best
}

async function fetchCity(city) {
  try {
    const url = bmkgUrl('api', 'publik/prakiraan-cuaca', `adm4=${city.adm4}`)
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    return { city, lokasi: j.lokasi, slot: pickNowSlot(j.data?.[0]?.cuaca) }
  } catch (e) {
    console.warn(`Cuaca fetch failed for ${city.label}:`, e.message)
    return null
  }
}

function markerElement(entry) {
  const wi = weatherIconOf(entry.slot?.weather, entry.slot?.weather_desc)
  const t = entry.slot?.t != null ? `${entry.slot.t}°C` : '—'
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:auto;user-select:none'
  div.title = `${entry.city.label} · ${wi.label} · ${t}`
  const icon = document.createElement('div')
  icon.style.cssText = 'font-size:22px;line-height:1;text-shadow:0 0 3px rgba(0,0,0,0.6)'
  icon.textContent = wi.icon
  const label = document.createElement('div')
  label.style.cssText = 'margin-top:2px;padding:2px 6px;font:600 10px/1.2 Outfit,sans-serif;color:#fff;background:rgba(0,0,0,0.55);border-radius:4px;white-space:nowrap;text-shadow:0 1px 2px #000'
  label.textContent = `${entry.city.label} ${t}`
  div.appendChild(icon)
  div.appendChild(label)
  return div
}

export const CUACA_ENTRY = {
  id: 'bmkg-cuaca-kota',
  label: 'Cuaca Kota Besar (11)',
  category: 'BMKG · Cuaca',
  color: '#1e88e5',
  customMount: async (map, { setStatus }) => {
    setStatus('Memuat cuaca 11 kota…')
    const entries = await Promise.all(CITIES.map(fetchCity))
    const markers = []
    for (const e of entries) {
      if (!e?.lokasi) continue
      const { lat, lon } = e.lokasi
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      const marker = new maplibregl.Marker({ element: markerElement(e), anchor: 'top' })
        .setLngLat([lon, lat])
        .addTo(map)
      markers.push(marker)
    }
    setStatus('')
    return () => {
      for (const m of markers) m.remove()
    }
  },
}
