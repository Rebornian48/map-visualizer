import React, { useState } from 'react'
import { TRANSPORT_SOURCES } from '../transport'

const BASEMAP_NAMES = ['OpenStreetMap', 'Satellite', 'Topographic']

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

const SECTIONS = [
  { key: 'wilayah',   title: 'Basemap & Wilayah',   kind: 'base' },
  { key: 'transport', title: 'Transportasi Umum',   kind: 'groups', groups: ['Bus (JSON)', 'Bus (GTFS)', 'Rel'] },
  { key: 'bencana',   title: 'Bencana Alam',        kind: 'groups', groups: ['BMKG · Gempa', 'BMKG · Peringatan Dini', 'BMKG · Cuaca', 'Tektonik'] },
]

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

const sectionHeaderStyle = {
  display: 'flex', width: '100%', background: 'none', border: 'none', padding: '4px 0',
  color: 'var(--text)', fontFamily: "'Outfit', sans-serif", cursor: 'pointer',
  fontSize: '0.88rem', fontWeight: 600, alignItems: 'center', justifyContent: 'space-between',
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

function CollapsibleSection({ title, children, first }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      {!first && <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />}
      <button onClick={() => setOpen(o => !o)} style={sectionHeaderStyle}>
        <span>{title}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.55 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ marginTop: 6 }}>{children}</div>}
    </>
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

function GroupBlock({ name, items, transportActive, transportLoading, transportError, onToggleTransport, first }) {
  return (
    <>
      {!first && <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />}
      <div style={groupLabel}>{name}</div>
      {items.map(src => (
        <TransportRow key={src.key}
          src={src}
          on={transportActive.has(src.key)}
          loading={transportLoading.has(src.key)}
          err={transportError.get(src.key)}
          onToggle={onToggleTransport} />
      ))}
    </>
  )
}

function TransportGroups({ groups, transportActive, transportLoading, transportError, onToggleTransport }) {
  const allowed = new Set(groups)
  const filtered = TRANSPORT_GROUPS.filter(([name]) => allowed.has(name))
  return filtered.map(([name, items], i) => (
    <GroupBlock key={name}
      name={name} items={items} first={i === 0}
      transportActive={transportActive}
      transportLoading={transportLoading}
      transportError={transportError}
      onToggleTransport={onToggleTransport} />
  ))
}

function SectionBody({ section, props }) {
  if (section.kind === 'base') {
    return (
      <>
        <BasemapSection basemap={props.basemap} onBasemap={props.onBasemap} />
        <BoundarySection
          boundary={props.boundary}
          onBoundary={props.onBoundary}
          boundaryLoading={props.boundaryLoading} />
      </>
    )
  }
  return (
    <TransportGroups
      groups={section.groups}
      transportActive={props.transportActive}
      transportLoading={props.transportLoading}
      transportError={props.transportError}
      onToggleTransport={props.onToggleTransport} />
  )
}

export default function LayersControl(props) {
  const [open, setOpen] = useState(false)
  if (!open) return <ClosedButton onOpen={setOpen} />
  return (
    <div onMouseLeave={() => setOpen(false)}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        background: 'var(--surface-solid)', border: '1px solid var(--border)',
        borderRadius: 8, boxShadow: 'var(--shadow)',
        padding: '12px 16px', minWidth: 240, maxHeight: '80vh', overflowY: 'auto',
      }}>
      {SECTIONS.map((section, i) => (
        <CollapsibleSection key={section.key} title={section.title} first={i === 0}>
          <SectionBody section={section} props={props} />
        </CollapsibleSection>
      ))}
    </div>
  )
}
