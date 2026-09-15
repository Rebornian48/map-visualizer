// BMKG CAP nowcast — RSS index of individual alert XML documents.
// Each alert can carry multiple <info> blocks, and each <info> carries
// one or more <area> blocks with <polygon> and/or <circle> geometry.
// We convert polygons directly and approximate circles as 32-vertex
// polygons around the center.

function bmkgUrl(host, path) {
  const devPrefix = { data: '/bmkg-cdn', www: '/bmkg-www', api: '/bmkg-api' }[host]
  if (import.meta.env.DEV) return `${devPrefix}/${path}`
  return `https://rebornian48.my.id/bmkg/proxy.php?h=${host}&p=${encodeURIComponent(path)}`
}

const RSS_URL = bmkgUrl('www', 'alerts/nowcast/id/rss.xml')

const SEVERITY_COLOR = {
  Extreme:  '#7b1fa2',
  Severe:   '#e53935',
  Moderate: '#fb8c00',
  Minor:    '#fdd835',
  Unknown:  '#9e9e9e',
}

const nsAll = (node, tag) => node.getElementsByTagNameNS('*', tag)
const capText = (node, tag) => {
  const els = nsAll(node, tag)
  return els.length ? els[0].textContent.trim() : ''
}

function parseCapPolygon(str) {
  // BMKG lists points as "lat,lng lat,lng …" — GeoJSON needs [lng,lat].
  return String(str || '').trim().split(/\s+/).map((p) => {
    const [lat, lng] = p.split(',').map(parseFloat)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return [lng, lat]
  }).filter(Boolean)
}

// "lat,lng radiusKm" → ring approximating the geodesic circle.
function circleToPolygon(str, steps = 48) {
  const parts = String(str || '').trim().split(/\s+/)
  if (parts.length < 2) return null
  const [lat, lng] = parts[0].split(',').map(parseFloat)
  const radiusKm = parseFloat(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) return null
  const R = 6371
  const dRad = radiusKm / R
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const ring = []
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * Math.PI * 2
    const sinLat = Math.sin(latRad) * Math.cos(dRad)
      + Math.cos(latRad) * Math.sin(dRad) * Math.cos(bearing)
    const newLat = Math.asin(sinLat)
    const y = Math.sin(bearing) * Math.sin(dRad) * Math.cos(latRad)
    const x = Math.cos(dRad) - Math.sin(latRad) * sinLat
    const newLng = lngRad + Math.atan2(y, x)
    ring.push([newLng * 180 / Math.PI, newLat * 180 / Math.PI])
  }
  return ring
}

function alertUrlFromRssLink(link) {
  const m = /alerts\/nowcast\/id\/([A-Za-z0-9]+_alert\.xml)/.exec(String(link || ''))
  return m ? bmkgUrl('www', `alerts/nowcast/id/${m[1]}`) : null
}

async function fetchAlertXml(url) {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const text = await r.text()
    return new DOMParser().parseFromString(text, 'application/xml')
  } catch (e) {
    console.warn('CAP fetch failed:', url, e)
    return null
  }
}

async function capFC() {
  const rssR = await fetch(RSS_URL, { cache: 'no-store' })
  if (!rssR.ok) throw new Error(`RSS HTTP ${rssR.status}`)
  const rssDoc = new DOMParser().parseFromString(await rssR.text(), 'application/xml')
  const links = Array.from(rssDoc.getElementsByTagName('item'))
    .map((it) => alertUrlFromRssLink(it.getElementsByTagName('link')[0]?.textContent))
    .filter(Boolean)
  const docs = await Promise.all(links.map(fetchAlertXml))

  const features = []
  for (const doc of docs) {
    if (!doc) continue
    for (const info of nsAll(doc, 'info')) {
      const severity = capText(info, 'severity') || 'Unknown'
      const event = capText(info, 'event')
      const headline = capText(info, 'headline')
      const expires = capText(info, 'expires')
      for (const area of nsAll(info, 'area')) {
        const areaDesc = capText(area, 'areaDesc')
        const props = { severity, event, headline, expires, areaDesc }
        for (const p of nsAll(area, 'polygon')) {
          const ring = parseCapPolygon(p.textContent)
          if (ring.length >= 3) {
            features.push({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [ring] },
              properties: props,
            })
          }
        }
        for (const c of nsAll(area, 'circle')) {
          const ring = circleToPolygon(c.textContent)
          if (ring && ring.length >= 4) {
            features.push({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [ring] },
              properties: props,
            })
          }
        }
      }
    }
  }
  return { type: 'FeatureCollection', features }
}

function colorExpr() {
  const args = ['match', ['get', 'severity']]
  for (const [k, v] of Object.entries(SEVERITY_COLOR)) {
    args.push(k, v)
  }
  args.push(SEVERITY_COLOR.Unknown)
  return args
}

export const CAP_ENTRY = {
  id: 'bmkg-cap',
  label: 'Peringatan Dini Cuaca (CAP)',
  category: 'BMKG · Peringatan Dini',
  color: '#e53935',
  sourceId: 'bmkg-cap',
  dataLoader: capFC,
  layers: () => [
    {
      id: 'bmkg-cap-fill',
      type: 'fill',
      source: 'bmkg-cap',
      paint: {
        'fill-color': colorExpr(),
        'fill-opacity': 0.25,
        'fill-outline-color': colorExpr(),
      },
    },
    {
      id: 'bmkg-cap-line',
      type: 'line',
      source: 'bmkg-cap',
      paint: {
        'line-color': colorExpr(),
        'line-width': 2,
        'line-opacity': 0.85,
      },
    },
  ],
  hover: (map, setHover) => {
    for (const layerId of ['bmkg-cap-fill', 'bmkg-cap-line']) {
      map.on('mousemove', layerId, (e) => {
        const f = e.features && e.features[0]
        if (!f) return
        map.getCanvas().style.cursor = 'pointer'
        const p = f.properties
        setHover(`${p.event || 'Peringatan'} · ${p.severity} · ${p.areaDesc || ''}`)
      })
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = ''
        setHover(null)
      })
    }
  },
}
