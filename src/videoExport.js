import { toPng } from 'html-to-image'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function filterPointsByPeriod(yearData, startYear, startMonth, endYear, endMonth) {
  const startTs = new Date(startYear, startMonth, 1).getTime()
  const endTs = new Date(endYear, endMonth + 1, 1).getTime()
  const out = []
  for (const y of Object.keys(yearData).map(Number)) {
    if (y < startYear || y > endYear) continue
    for (const p of yearData[y].points) {
      const t = p.time.getTime()
      if (t >= startTs && t < endTs) out.push(p)
    }
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

export function summarizePeriod(points) {
  let dist = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    dist += haversine(a.lat, a.lon, b.lat, b.lon)
  }
  return { count: points.length, distanceKm: dist / 1000 }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function pickMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01F',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

const HOLD_SECONDS = 10

export async function exportVideo({
  map, points, durationSeconds, fps = 30, title = '', onProgress, onStage,
}) {
  if (!points || points.length < 2) throw new Error('Not enough points in the selected period.')

  onStage?.('Fitting map to period…')
  const lats = points.map(p => p.lat)
  const lons = points.map(p => p.lon)
  map.fitBounds(
    [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]],
    { padding: [40, 40], maxZoom: 14, animate: false }
  )

  await new Promise(r => setTimeout(r, 300))
  await waitForTilesLoaded(map)

  onStage?.('Snapshotting map background…')
  const mapEl = map.getContainer()
  const rect = mapEl.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  const bgDataUrl = await toPng(mapEl, {
    width, height, pixelRatio: 1, cacheBust: true,
    filter: (node) => !(node.classList && (
      node.classList.contains('leaflet-control-container') ||
      node.classList.contains('leaflet-control')
    )),
  })
  const bgImg = await loadImage(bgDataUrl)

  const projected = points.map(p => {
    const pt = map.latLngToContainerPoint([p.lat, p.lon])
    return { x: pt.x, y: pt.y, t: p.time, lat: p.lat, lon: p.lon }
  })

  const cumKm = new Array(projected.length)
  cumKm[0] = 0
  for (let i = 1; i < projected.length; i++) {
    cumKm[i] = cumKm[i - 1] + haversine(
      projected[i - 1].lat, projected[i - 1].lon,
      projected[i].lat, projected[i].lon,
    ) / 1000
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const mimeType = pickMimeType()
  if (!mimeType) throw new Error('Browser does not support MediaRecorder video output.')
  const isMp4 = mimeType.startsWith('video/mp4')

  const stream = canvas.captureStream(fps)
  const chunks = []
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  const stopped = new Promise((resolve) => { recorder.onstop = resolve })

  const startPeriod = projected[0].t.getTime()
  const endPeriod = projected[projected.length - 1].t.getTime()

  const animMs = durationSeconds * 1000
  const holdMs = HOLD_SECONDS * 1000
  const totalMs = animMs + holdMs

  const drawFrame = (animPct) => {
    const cutoffTs = startPeriod + (endPeriod - startPeriod) * animPct
    let headIdx = 0
    for (let i = 0; i < projected.length; i++) {
      if (projected[i].t.getTime() > cutoffTs) break
      headIdx = i
    }
    const head = projected[headIdx]

    ctx.drawImage(bgImg, 0, 0, width, height)

    if (headIdx > 0) {
      ctx.strokeStyle = '#e91e63'
      ctx.lineWidth = 4
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.moveTo(projected[0].x, projected[0].y)
      for (let i = 1; i <= headIdx; i++) {
        ctx.lineTo(projected[i].x, projected[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = '#e91e63'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(233,30,99,0.6)'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(head.x, head.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.stroke()

    drawHeaderCard(ctx, width, {
      title: title || 'Timeline',
      subtitle: formatSubtitle(head.t, cumKm[headIdx]),
    })
  }

  onStage?.('Rendering frames…')
  drawFrame(0)
  recorder.start()

  const startWall = performance.now()
  await new Promise((resolve) => {
    function tick() {
      const elapsed = performance.now() - startWall
      if (elapsed >= totalMs) { resolve(); return }
      const animPct = elapsed <= animMs ? elapsed / animMs : 1
      drawFrame(animPct)
      onProgress?.(elapsed / totalMs)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  drawFrame(1)
  await new Promise(r => requestAnimationFrame(r))

  recorder.stop()
  await stopped

  const blob = new Blob(chunks, { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ext = isMp4 ? 'mp4' : 'webm'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  a.href = url
  a.download = `map-visualizer-${stamp}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return { mimeType, isMp4, sizeBytes: blob.size }
}

function formatSubtitle(date, km) {
  const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  const kmStr = Math.round(km).toLocaleString('en-US')
  return `${monthYear} · ${kmStr} km`
}

function drawHeaderCard(ctx, width, { title, subtitle }) {
  const marginTop = 12
  const padX = 20
  const padY = 12
  const titleFont = "600 15px 'Outfit', system-ui, sans-serif"
  const subFont = "500 12px 'DM Mono', monospace"

  ctx.font = titleFont
  const titleW = ctx.measureText(title).width
  ctx.font = subFont
  const subW = ctx.measureText(subtitle).width
  const contentW = Math.max(titleW, subW)
  const cardW = Math.min(width - 24, contentW + padX * 2)
  const cardH = padY * 2 + 18 + 4 + 14
  const cardX = Math.round((width - cardW) / 2)
  const cardY = marginTop

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.12)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 2
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  roundRect(ctx, cardX, cardY, cardW, cardH, 12)
  ctx.fill()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = titleFont
  ctx.fillStyle = '#1a1a1a'
  ctx.fillText(title, cardX + cardW / 2, cardY + padY, cardW - padX * 2)

  ctx.font = subFont
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillText(subtitle, cardX + cardW / 2, cardY + padY + 20, cardW - padX * 2)

  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function waitForTilesLoaded(map) {
  return new Promise((resolve) => {
    let tilesPending = 0
    map.eachLayer(l => {
      if (l._loading) tilesPending++
    })
    if (tilesPending === 0) return setTimeout(resolve, 200)
    const onLoad = () => { setTimeout(resolve, 200) }
    map.once('load', onLoad)
    setTimeout(resolve, 3000)
  })
}

export { MONTHS }
