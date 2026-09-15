import React, { useState, useCallback, useEffect, Suspense } from 'react'
import LoadingScreen from './components/LoadingScreen'
import FirstVisitNotice from './components/FirstVisitNotice'
import GlobeView from './components/GlobeView'
import { parseTimeline, organizeByYear } from './parser'
import { getInitialTheme, applyTheme } from './theme'

// GlobeView (MapLibre) is the default map viewer at "/", so we import
// it eagerly — Vite then emits a <link rel="modulepreload"> for the
// maplibre chunk, letting the ~275 KB gzipped download happen in
// parallel with react-dom instead of waiting for a Suspense round-trip.
// MapView (Leaflet) and InfoPage stay lazy — anyone hitting /legacy or
// /info gets a smaller entry cost and only pays for what they use.
const InfoPage  = React.lazy(() => import('./components/InfoPage'))
const MapView   = React.lazy(() => import('./components/MapView'))

const BASE = import.meta.env.BASE_URL || '/'
const INFO_PATH   = `${BASE}info`
const LEGACY_PATH = `${BASE}legacy`
// "/globe" (from earlier POC period) falls through to the default
// GlobeView render, same as "/", so no explicit constant needed.

function pathMatch(pathname, target) {
  return pathname === target || pathname === `${target}/`
}

export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [loadingPct, setLoadingPct] = useState(0)
  const [yearData, setYearData] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => { applyTheme(theme) }, [theme])

  // Cross-tab / cross-page theme sync. `storage` fires in every OTHER tab
  // that shares this origin when tl-theme changes — so a toggle in the
  // standalone /keracunan-mbg/ dashboard (or in another map tab) is
  // picked up here without a reload. Only respond when the value really
  // changed to skip redundant renders.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== 'tl-theme' || !e.newValue) return
      setTheme(prev => (prev === e.newValue ? prev : e.newValue))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((path) => {
    if (window.location.pathname === path) return
    window.history.pushState({}, '', path)
    setPathname(path)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  const handleFile = useCallback(async (file) => {
    setLoading(true)
    setLoadingText('Reading file…')
    setLoadingPct(5)

    try {
      const text = await file.text()
      setLoadingText('Parsing JSON…')
      setLoadingPct(20)
      await new Promise(r => setTimeout(r, 50))

      let data
      try {
        data = JSON.parse(text)
      } catch {
        let depth = 0, end = 0
        for (let i = 0; i < text.length; i++) {
          const ch = text.charAt(i)
          if (ch === '{') depth++
          else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break } }
        }
        data = JSON.parse(text.slice(0, end))
      }
      setLoadingText('Extracting timeline data…')
      setLoadingPct(40)
      await new Promise(r => setTimeout(r, 50))

      const parsed = parseTimeline(data)
      setLoadingText('Organizing by year…')
      setLoadingPct(75)
      await new Promise(r => setTimeout(r, 50))

      const organized = organizeByYear(parsed)
      setLoadingText('Building map…')
      setLoadingPct(95)
      await new Promise(r => setTimeout(r, 100))

      setYearData(organized)
      setLoading(false)
    } catch (err) {
      alert('Error parsing file: ' + err.message)
      setLoading(false)
    }
  }, [])

  if (pathMatch(pathname, INFO_PATH)) {
    return (
      <Suspense fallback={<LoadingScreen text="Loading…" pct={50} />}>
        <InfoPage
          onBack={() => navigate(BASE)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </Suspense>
    )
  }

  // Leaflet MapView is now the fallback at /legacy. Frozen feature set —
  // new coverage lands on the globe.
  if (pathMatch(pathname, LEGACY_PATH)) {
    return (
      <>
        <Suspense fallback={<LoadingScreen text="Loading legacy map…" pct={50} />}>
          <MapView
            yearData={yearData}
            theme={theme}
            onToggleTheme={toggleTheme}
            onFile={handleFile}
            onOpenInfo={() => navigate(INFO_PATH)}
            onOpenGlobe={() => navigate(BASE)}
          />
        </Suspense>
        <FirstVisitNotice />
        {loading && <LoadingScreen text={loadingText} pct={loadingPct} />}
      </>
    )
  }

  // "/" (and "/globe" for back-compat) — MapLibre GlobeView. Eager
  // import above means no Suspense boundary is needed here; the map
  // chunk is preloaded alongside the entry bundle.
  return (
    <>
      <GlobeView
        theme={theme}
        yearData={yearData}
        onFile={handleFile}
        onOpenInfo={() => navigate(INFO_PATH)}
        onOpenLegacy={() => navigate(LEGACY_PATH)}
      />
      {loading && <LoadingScreen text={loadingText} pct={loadingPct} />}
    </>
  )
}
