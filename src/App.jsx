import React, { useState, useCallback, useEffect } from 'react'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import MapView from './components/MapView'
import { parseTimeline, organizeByYear } from './parser'
import { getInitialTheme, applyTheme } from './theme'

export default function App() {
  const [screen, setScreen] = useState('upload')
  const [loadingText, setLoadingText] = useState('')
  const [loadingPct, setLoadingPct] = useState(0)
  const [yearData, setYearData] = useState(null)
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => { applyTheme(theme) }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  const handleFile = useCallback(async (file) => {
    setScreen('loading')
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
           if (text[i] === '{') depth++
           else if (text[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
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
      setScreen('map')
    } catch (err) {
      alert('Error parsing file: ' + err.message)
      setScreen('upload')
    }
  }, [])

  if (screen === 'upload') return <UploadScreen onFile={handleFile} theme={theme} onToggleTheme={toggleTheme} />
  if (screen === 'loading') return <LoadingScreen text={loadingText} pct={loadingPct} />
  return <MapView yearData={yearData} theme={theme} onToggleTheme={toggleTheme} />
}
