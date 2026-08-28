import React, { useState } from 'react'
import { TRANSPORT_SOURCES } from '../transport'

const BASEMAP_NAMES = ['Carto Light', 'Carto Dark', 'OpenStreetMap', 'Satellite', 'Topographic']

const BOUNDARY_OPTIONS = [
  { key: 'none', label: 'No boundary' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'kabkota', label: 'Kab/Kota' },
]

const TRANSPORT_GROUPS = (() => {
  const g = new Map()
  for (const s of TRANSPORT_SOURCES) {
    if (!g.has(s.group)) g.set(s.group, [])
    g.get(s.group).push(s)
  }
  return [...g.entries()]
})()

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
  fontSize: '0.82rem', color: 'var(--text)', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
}

const groupLabel = {
  fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace",
  marginBottom: 4,
}

function ClosedButton({ onOpen }) {
  return (
    <button onClick={() => onOpen(true)} onMouseEnter={() => onOpen(true)} title="Layers"
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        width: 36, height: 36, borderRadius: 8,
        background: 'var(--surface-solid)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
           style={{ color: 'var(--text)' }}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    </button>
  )
}

function BasemapSection({ basemap, onBasemap }) {
  return (
    <>
      <div style={groupLabel}>Basemap</div>
      {BASEMAP_NAMES.map(name => (
        <label key={name} style={rowStyle}>
          <input type="radio" name="basemap"
            checked={basemap === name} onChange={() => onBasemap(name)}
            style={{ accentColor: 'var(--accent)' }} />
          <span>{name}</span>
        </label>
      ))}
    </>
  )
}

function BoundarySection({ boundary, onBoundary, boundaryLoading }) {
  return (
    <>
      <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
      <div style={groupLabel}>Boundary</div>
      {BOUNDARY_OPTIONS.map(opt => {
        const busy = boundaryLoading && boundary !== opt.key
        return (
          <label key={opt.key} style={{
            ...rowStyle, opacity: busy ? 0.5 : 1, cursor: busy ? 'wait' : 'pointer',
          }}>
            <input type="radio" name="boundary"
              checked={boundary === opt.key} disabled={busy}
              onChange={() => onBoundary(opt.key)}
              style={{ accentColor: 'var(--accent)' }} />
            <span>{opt.key === boundary && boundaryLoading ? `${opt.label}…` : opt.label}</span>
          </label>
        )
      })}
    </>
  )
}

function TransportRow({ src, on, loading, err, onToggle }) {
  return (
    <label style={{ ...rowStyle, opacity: loading ? 0.7 : 1 }} title={err || ''}>
      <input type="checkbox" checked={on} disabled={loading}
        onChange={() => onToggle(src.key)}
        style={{ accentColor: 'var(--accent)' }} />
      <span>{loading ? `${src.label}…` : src.label}</span>
      {err && <span style={{ color: '#ff5a5a', marginLeft: 'auto', fontSize: '0.7rem' }}>!</span>}
    </label>
  )
}

function TransportSections({ transportActive, transportLoading, transportError, onToggleTransport }) {
  return TRANSPORT_GROUPS.map(([groupName, items]) => (
    <React.Fragment key={groupName}>
      <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
      <div style={groupLabel}>{groupName}</div>
      {items.map(src => (
        <TransportRow key={src.key}
          src={src}
          on={transportActive.has(src.key)}
          loading={transportLoading.has(src.key)}
          err={transportError.get(src.key)}
          onToggle={onToggleTransport} />
      ))}
    </React.Fragment>
  ))
}

export default function LayersControl(props) {
  const [open, setOpen] = useState(false)
  if (!open) return <ClosedButton onOpen={setOpen} />

  const { basemap, onBasemap, boundary, onBoundary, boundaryLoading,
          transportActive, transportLoading, transportError, onToggleTransport } = props

  return (
    <div onMouseLeave={() => setOpen(false)}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        background: 'var(--surface-solid)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: 'var(--shadow)',
        padding: '12px 16px', minWidth: 220, maxHeight: '80vh', overflowY: 'auto',
      }}>
      <BasemapSection basemap={basemap} onBasemap={onBasemap} />
      <BoundarySection boundary={boundary} onBoundary={onBoundary} boundaryLoading={boundaryLoading} />
      <TransportSections
        transportActive={transportActive}
        transportLoading={transportLoading}
        transportError={transportError}
        onToggleTransport={onToggleTransport} />
    </div>
  )
}
