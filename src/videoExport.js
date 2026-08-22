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
const REVEAL_SECONDS = 1

export async function exportVideo({
  map, points, durationSeconds, fps = 30, onProgress, onStage,
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
    return { x: pt.x, y: pt.y, t: p.time }
  })

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
  const revealMs = REVEAL_SECONDS * 1000
  const totalMs = animMs + holdMs

  const drawFrame = (animPct, revealPct) => {
    const cutoffTs = startPeriod + (endPeriod - startPeriod) * animPct
    let headIdx = 0
    for (let i = 0; i < projected.length; i++) {
      if (projected[i].t.getTime() > cutoffTs) break
      headIdx = i
    }
    const head = projected[headIdx]

    ctx.drawImage(bgImg, 0, 0, width, height)

    if (revealPct > 0) {
      ctx.strokeStyle = '#ff3366'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.75 * Math.min(1, revealPct)
      ctx.beginPath()
      ctx.moveTo(projected[0].x, projected[0].y)
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].x, projected[i].y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = '#ff3366'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.shadowColor = 'rgba(255,51,102,0.6)'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(head.x, head.y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.stroke()

    ctx.font = "500 14px 'DM Mono', monospace"
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const label = head.t.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    const tw = ctx.measureText(label).width
    ctx.fillRect(12, height - 34, tw + 16, 22)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, 20, height - 18)
  }

  onStage?.('Rendering frames…')
  drawFrame(0, 0)
  recorder.start()

  const startWall = performance.now()
  await new Promise((resolve) => {
    function tick() {
      const elapsed = performance.now() - startWall
      if (elapsed >= totalMs) { resolve(); return }
      if (elapsed <= animMs) {
        drawFrame(elapsed / animMs, 0)
      } else {
        const holdElapsed = elapsed - animMs
        const revealPct = Math.min(1, holdElapsed / revealMs)
        drawFrame(1, revealPct)
      }
      onProgress?.(elapsed / totalMs)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  drawFrame(1, 1)
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
