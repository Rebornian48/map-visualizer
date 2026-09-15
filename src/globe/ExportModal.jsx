// Globe-side export modal. Same period-picker + duration flow as the
// Leaflet ExportModal, but talks to the MapLibre-native exporter and
// styles itself inline with panel props so it doesn't depend on the
// CSS variable theme.

import React, { useMemo, useState } from 'react'
import { filterPointsByPeriod, summarizePeriod, exportVideo, MONTHS } from './videoExport'

const DURATION_PRESETS = [
  { label: '30 seconds', value: 30 },
  { label: '60 seconds', value: 60 },
]

function computeDuration(choice, custom) {
  if (choice !== 'custom') return choice
  return Math.max(5, Math.min(600, Number(custom) || 30))
}

function isRangeInvalid(p) {
  return p.endYear < p.startYear
    || (p.endYear === p.startYear && p.endMonth < p.startMonth)
}

export default function GlobeExportModal({ yearData, map, onClose, panel, dark }) {
  const years = useMemo(() => [...yearData.keys()].sort((a, b) => a - b), [yearData])

  const [startYear, setStartYear]   = useState(years[0])
  const [endYear,   setEndYear]     = useState(years[years.length - 1])
  const [startMonth, setStartMonth] = useState(0)
  const [endMonth,   setEndMonth]   = useState(11)
  const [durationChoice, setDurationChoice] = useState(30)
  const [customSeconds, setCustomSeconds]   = useState(45)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const period = { startYear, endYear, startMonth, endMonth }
  const duration = computeDuration(durationChoice, customSeconds)
  const effectiveTitle = title.trim() || `${startYear}–${endYear} Timeline`

  const filtered = useMemo(
    () => filterPointsByPeriod(yearData, startYear, startMonth, endYear, endMonth),
    [yearData, startYear, startMonth, endYear, endMonth],
  )
  const summary = useMemo(() => summarizePeriod(filtered), [filtered])
  const rangeInvalid = isRangeInvalid(period)
  const canGenerate = !busy && !rangeInvalid && filtered.length >= 2

  const run = async () => {
    setBusy(true); setError(''); setStage('Preparing…'); setProgress(0)
    try {
      const res = await exportVideo({
        map, points: filtered, durationSeconds: duration,
        title: effectiveTitle, onProgress: setProgress, onStage: setStage,
      })
      const kind = res.isMp4 ? 'MP4' : 'WebM'
      const size = (res.sizeBytes / 1024 / 1024).toFixed(1)
      setStage(`Done — ${kind} · ${size} MB`)
      setTimeout(() => { setBusy(false); onClose() }, 1500)
    } catch (e) {
      setError(e.message || String(e))
      setBusy(false)
    }
  }

  const field = {
    background: dark ? '#1a1a28' : '#e8e9f0',
    border: `1px solid ${dark ? '#2a2a3a' : '#d0d1da'}`,
    borderRadius: 6, color: dark ? '#e8e8f0' : '#1a1a2e',
    padding: '6px 8px', fontSize: 12,
    fontFamily: 'Outfit, sans-serif', width: '100%', boxSizing: 'border-box',
  }
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: dark ? '#8888a0' : '#6b6b80', marginBottom: 4, display: 'block' }
  const btn = (primary, disabled) => ({
    padding: '8px 16px', border: primary ? 'none' : `1px solid ${dark ? '#2a2a3a' : '#d0d1da'}`,
    borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    background: primary ? '#f36' : 'transparent',
    color: primary ? '#fff' : (dark ? '#e8e8f0' : '#1a1a2e'),
    opacity: disabled ? 0.5 : 1, fontSize: 12, fontWeight: 500,
    fontFamily: 'Outfit, sans-serif',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={busy ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panel, width: '100%', maxWidth: 480, padding: 20,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Export Video</div>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ background: 'none', border: 'none', color: 'inherit',
                     fontSize: 20, cursor: busy ? 'not-allowed' : 'pointer', padding: 0 }}
          >×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={label}>Video title</div>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            disabled={busy} maxLength={80} placeholder={`${startYear}–${endYear} Timeline`}
            style={field}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={label}>Selected period</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, marginBottom: 3, opacity: 0.7 }}>Start year</div>
              <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} disabled={busy} style={field}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, marginBottom: 3, opacity: 0.7 }}>End year</div>
              <select value={endYear} onChange={(e) => setEndYear(Number(e.target.value))} disabled={busy} style={field}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, marginBottom: 3, opacity: 0.7 }}>Start month</div>
              <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} disabled={busy} style={field}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, marginBottom: 3, opacity: 0.7 }}>End month</div>
              <select value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))} disabled={busy} style={field}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, fontFamily: '"DM Mono", monospace' }}>
            {rangeInvalid
              ? <span style={{ color: '#f36' }}>End must be on or after start</span>
              : <>{summary.count.toLocaleString()} points · about {summary.distanceKm.toFixed(0)} km</>}
          </div>
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 3, fontFamily: '"DM Mono", monospace' }}>
            Final video: {duration}s animation + 10s hold = {duration + 10}s total
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={label}>Duration</div>
          {DURATION_PRESETS.map((p) => (
            <label key={p.value} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              border: `1px solid ${durationChoice === p.value ? '#f36' : (dark ? '#2a2a3a' : '#d0d1da')}`,
              background: durationChoice === p.value ? (dark ? '#1a1a28' : '#e8e9f0') : 'transparent',
              borderRadius: 6, marginBottom: 6, cursor: 'pointer', fontSize: 12,
            }}>
              <input
                type="radio" name="dur" checked={durationChoice === p.value}
                onChange={() => setDurationChoice(p.value)} disabled={busy}
              />
              <span>{p.label}</span>
            </label>
          ))}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            border: `1px solid ${durationChoice === 'custom' ? '#f36' : (dark ? '#2a2a3a' : '#d0d1da')}`,
            background: durationChoice === 'custom' ? (dark ? '#1a1a28' : '#e8e9f0') : 'transparent',
            borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}>
            <input
              type="radio" name="dur" checked={durationChoice === 'custom'}
              onChange={() => setDurationChoice('custom')} disabled={busy}
            />
            <span>Custom:</span>
            <input
              type="number" min={5} max={600} step={1}
              value={customSeconds}
              onChange={(e) => { setCustomSeconds(e.target.value); setDurationChoice('custom') }}
              disabled={busy}
              style={{ ...field, width: 70, padding: '2px 6px' }}
            />
            <span style={{ opacity: 0.7 }}>seconds</span>
          </label>
        </div>

        {busy && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, marginBottom: 4, fontFamily: '"DM Mono", monospace' }}>{stage}</div>
            <div style={{ width: '100%', height: 4, background: dark ? '#2a2a3a' : '#e0e1eb', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progress * 100}%`, height: '100%', background: '#f36' }} />
            </div>
          </div>
        )}
        {error && (
          <div style={{
            padding: 8, marginBottom: 12, borderRadius: 6,
            background: 'rgba(255,51,102,0.12)', border: '1px solid rgba(255,51,102,0.4)',
            color: '#ff6688', fontSize: 12,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={btn(false, busy)}>Cancel</button>
          <button onClick={run} disabled={!canGenerate} style={btn(true, !canGenerate)}>Generate MP4</button>
        </div>
      </div>
    </div>
  )
}
