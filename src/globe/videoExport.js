// MapLibre-native video export. Same shape as src/videoExport.js on the
// Leaflet side (filterPointsByPeriod / summarizePeriod / exportVideo) so
// the ExportModal UI stays interchangeable — only the geo→screen math
// (map.project instead of latLngToContainerPoint) and the map snapshot
// path (getCanvas() instead of html-to-image) differ.
//
// Requires the map to have been created with preserveDrawingBuffer: true
// so the WebGL canvas is readable at the moment of capture.

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function filterPointsByPeriod(yearData, startYear, startMonth, endYear, endMonth) {
  const startTs = new Date(startYear, startMonth, 1).getTime()
  const endTs = new Date(endYear, endMonth + 1, 1).getTime()
  const out = []
  for (const [y, entry] of yearData) {
    if (y < startYear || y > endYear) continue
    for (const p of entry.points) {
      const t = p.time.getTime()
      if (t >= startTs && t < endTs) out.push(p)
    }
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

export function summarizePeriod(points) {
  let dist = 0
  let prev = null
  for (const p of points) {
    if (prev) dist += haversine(prev.lat, prev.lon, p.lat, p.lon)
    prev = p
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

// Wait until the MapLibre map has finished loading tiles + rendering.
function waitForMapIdle(map) {
  return new Promise((resolve) => {
    if (map.loaded() && !map.isMoving() && !map.isZooming()) {
      // Even when loaded reports true, one more frame settles pending
      // uploads to the WebGL context.
      requestAnimationFrame(() => resolve())
      return
    }
    const onIdle = () => { map.off('idle', onIdle); resolve() }
    map.on('idle', onIdle)
    // Hard timeout so a stuck tile server doesn't stall the export.
    setTimeout(() => { map.off('idle', onIdle); resolve() }, 5000)
  })
}

// Capture the current WebGL canvas as an HTMLImageElement.
// preserveDrawingBuffer: true (set at map init) makes this reliable.
async function snapshotMap(map) {
  const canvas = map.getCanvas()
  // Trigger a synchronous render so the buffer we grab isn't blank if a
  // previous frame was scheduled but hasn't been painted yet.
  map.triggerRepaint()
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const url = canvas.toDataURL('image/png')
  return loadImage(url)
}

export async function exportVideo({
  map, points, durationSeconds, fps = 30, title = '', onProgress, onStage,
}) {
  if (!points || points.length < 2) throw new Error('Not enough points in the selected period.')

  onStage?.('Fitting map to period…')
  const lats = points.map(p => p.lat)
  const lons = points.map(p => p.lon)
  // MapLibre's fitBounds takes [[minLng, minLat], [maxLng, maxLat]] (LngLat order).
  map.fitBounds(
    [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
    { padding: 40, maxZoom: 14, animate: false }
  )

  await waitForMapIdle(map)

  onStage?.('Snapshotting map background…')
  const bgImg = await snapshotMap(map)

  // Snapshot the CSS pixel size of the container. On HiDPI screens the
  // WebGL canvas backs at a higher resolution; we downscale to CSS pixels
  // in the composite so the header card and path stay crisp but not tiny.
  const container = map.getContainer()
  const rect = container.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)

  const projected = points.map((p) => {
    const pt = map.project([p.lon, p.lat])
    return { x: pt.x, y: pt.y, t: p.time, lat: p.lat, lon: p.lon }
  })

  const cumKm = [0]
  let prev = projected[0]
  for (let i = 1; i < projected.length; i++) {
    const cur = projected[i]
    cumKm.push(cumKm[cumKm.length - 1] + haversine(prev.lat, prev.lon, cur.lat, cur.lon) / 1000)
    prev = cur
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
      const first = projected[0]
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i <= headIdx; i++) {
        const q = projected[i]
        ctx.lineTo(q.x, q.y)
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
  await new Promise((r) => requestAnimationFrame(r))

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

export { MONTHS }
