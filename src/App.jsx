import React, { useState, useCallback, useEffect } from 'react'
import LoadingScreen from './components/LoadingScreen'
import MapView from './components/MapView'
import InfoPage from './components/InfoPage'
import FirstVisitNotice from './components/FirstVisitNotice'
import { parseTimeline, organizeByYear } from './parser'
import { getInitialTheme, applyTheme } from './theme'

const BASE = import.meta.env.BASE_URL || '/'
const INFO_PATH = `${BASE}info`

function isInfoPath(p) {
  return p === INFO_PATH || p === `${INFO_PATH}/`
}

export default function App() {
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [loadingPct, setLoadingPct] = useState(0)
  const [yearData, setYearData] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => { applyTheme(theme) }, [theme])

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

  if (isInfoPath(pathname)) {
    return <InfoPage onBack={() => navigate(BASE)} />
  }

  return (
    <>
      <MapView
        yearData={yearData}
        theme={theme}
        onToggleTheme={toggleTheme}
        onFile={handleFile}
        onOpenInfo={() => navigate(INFO_PATH)}
      />
      <FirstVisitNotice />
      {loading && <LoadingScreen text={loadingText} pct={loadingPct} />}
    </>
  )
}
