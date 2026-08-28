import React, { useMemo, useState } from 'react'
import { filterPointsByPeriod, summarizePeriod, exportVideo, MONTHS } from '../videoExport'

const DURATION_PRESETS = [
  { label: '30 seconds', value: 30 },
  { label: '60 seconds', value: 60 },
]

const panel = {
  background: 'var(--surface-solid)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
}

const fieldStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  padding: '8px 10px',
  fontSize: '0.85rem',
  fontFamily: "'Outfit', sans-serif",
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle = {
  fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-dim)', marginBottom: 6, display: 'block',
  fontFamily: "'DM Mono', monospace",
}

export default function ExportModal({ yearData, map, onClose }) {
  const years = useMemo(
    () => Object.keys(yearData).map(Number).sort(),
    [yearData]
  )

  const [startYear, setStartYear] = useState(years[0])
  const [endYear, setEndYear] = useState(years[years.length - 1])
  const [startMonth, setStartMonth] = useState(0)
  const [endMonth, setEndMonth] = useState(11)
  const [durationChoice, setDurationChoice] = useState(30)
  const [customSeconds, setCustomSeconds] = useState(45)
  const [title, setTitle] = useState('')

  const effectiveTitle = title.trim() || `${startYear}–${endYear} Timeline`

  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const filtered = useMemo(
    () => filterPointsByPeriod(yearData, startYear, startMonth, endYear, endMonth),
    [yearData, startYear, startMonth, endYear, endMonth]
  )
  const summary = useMemo(() => summarizePeriod(filtered), [filtered])

  const duration = durationChoice === 'custom' ? Math.max(5, Math.min(600, Number(customSeconds) || 30)) : durationChoice

  const handleGenerate = async () => {
    setBusy(true)
    setError('')
    setStage('Preparing…')
    setProgress(0)
    try {
      const res = await exportVideo({
        map, points: filtered, durationSeconds: duration,
        title: effectiveTitle,
        onProgress: setProgress, onStage: setStage,
      })
      setStage(`Done — ${res.isMp4 ? 'MP4' : 'WebM (MP4 not supported by this browser)'} · ${(res.sizeBytes / 1024 / 1024).toFixed(1)} MB`)
      setTimeout(() => { setBusy(false); onClose() }, 1200)
    } catch (e) {
      setError(e.message || String(e))
      setBusy(false)
    }
  }

  const rangeInvalid = endYear < startYear || (endYear === startYear && endMonth < startMonth)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={busy ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...panel, width: '100%', maxWidth: 520, padding: 24, maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Export Video</h2>
          <button onClick={onClose} disabled={busy} style={{
            background: 'none', border: 'none', color: 'var(--text-dim)', cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: '1.4rem', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Video title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            maxLength={80}
            placeholder={`${startYear}–${endYear} Timeline`}
            style={fieldStyle}
          />
          <div style={{
            fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4,
            fontFamily: "'DM Mono', monospace",
          }}>
            Shown in the header card at the top of every frame
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Selected period</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>Start year</div>
              <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} style={fieldStyle} disabled={busy}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>End year</div>
              <select value={endYear} onChange={(e) => setEndYear(Number(e.target.value))} style={fieldStyle} disabled={busy}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>Start month</div>
              <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} style={fieldStyle} disabled={busy}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 4 }}>End month</div>
              <select value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))} style={fieldStyle} disabled={busy}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{
            fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace",
          }}>
            {rangeInvalid ? (
              <span style={{ color: 'var(--accent)' }}>End must be on or after start</span>
            ) : (
              <>{summary.count.toLocaleString()} points · about {summary.distanceKm.toFixed(0)} km</>
            )}
          </div>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4,
            fontFamily: "'DM Mono', monospace",
          }}>
            Final video: {duration}s animation + 10s hold = {duration + 10}s total
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Duration</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DURATION_PRESETS.map(p => (
              <label key={p.value} style={radioLabel(durationChoice === p.value)}>
                <input type="radio" name="dur" checked={durationChoice === p.value}
                  onChange={() => setDurationChoice(p.value)} disabled={busy} />
                <span>{p.label}</span>
              </label>
            ))}
            <label style={radioLabel(durationChoice === 'custom')}>
              <input type="radio" name="dur" checked={durationChoice === 'custom'}
                onChange={() => setDurationChoice('custom')} disabled={busy} />
              <span>Custom:</span>
              <input
                type="number" min={5} max={600} step={1}
                value={customSeconds}
                onChange={(e) => { setCustomSeconds(e.target.value); setDurationChoice('custom') }}
                disabled={busy}
                style={{ ...fieldStyle, width: 90, padding: '4px 8px', fontFamily: "'DM Mono', monospace" }}
              />
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>seconds</span>
            </label>
          </div>
        </div>

        {busy && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: '0.75rem', fontFamily: "'DM Mono', monospace",
              color: 'var(--text-dim)', marginBottom: 6,
            }}>{stage}</div>
            <div style={{ width: '100%', height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%',
                background: 'var(--accent)', transition: 'width 0.15s',
              }} />
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 10, marginBottom: 16, borderRadius: 8,
            background: 'rgba(255, 51, 102, 0.12)', border: '1px solid rgba(255, 51, 102, 0.4)',
            color: '#ff6688', fontSize: '0.8rem',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} disabled={busy} style={{
            padding: '9px 18px', background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif",
          }}>Cancel</button>
          <button onClick={handleGenerate} disabled={busy || rangeInvalid || filtered.length < 2} style={{
            padding: '9px 20px', background: 'var(--accent)', border: 'none',
            borderRadius: 8, color: 'white', cursor: (busy || rangeInvalid || filtered.length < 2) ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
            opacity: (busy || rangeInvalid || filtered.length < 2) ? 0.5 : 1,
          }}>Generate MP4</button>
        </div>
      </div>
    </div>
  )
}

function radioLabel(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: active ? 'var(--surface-2)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 8, cursor: 'pointer',
    fontSize: '0.85rem',
  }
}
