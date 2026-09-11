import React, { useState, useEffect, useRef } from 'react'
import { TRANSPORT_SOURCES } from '../transport'

const BASEMAP_NAMES = ['OpenStreetMap', 'Satellite', 'Topographic']

const BOUNDARY_OPTIONS = [
  { key: 'none',      label: 'No boundary' },
  { key: 'provinsi',  label: 'Provinsi' },
  { key: 'kabkota',   label: 'Kab/Kota' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'desa',      label: 'Kelurahan/Desa' },
]

const TRANSPORT_GROUPS = (() => {
  const g = new Map()
  for (const s of TRANSPORT_SOURCES) {
    if (!g.has(s.group)) g.set(s.group, [])
    g.get(s.group).push(s)
  }
  return [...g.entries()]
})()

const TRANSPORT_GROUP_NAMES  = [
  'Bus (JSON)', 'Bus (GTFS)', 'Rel',
  'Aeronautika · OpenAIP',
  'Maritim · SeaRates',
]
const CUACA_GROUP_NAMES      = ['BMKG · Peringatan Dini', 'BMKG · Cuaca']
const BENCANA_GROUP_NAMES    = ['BMKG · Gempa', 'Vulkano', 'Tektonik', 'Aviasi', 'Insiden · MBG']
const WILAYAH_GROUP_NAMES    = ['Batas Laut · BIG', 'Gereja Katolik']

// SVG icon components — kept small so 4 fit in a row at top-right.
function IconBasemap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
function IconWilayah() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4 5 12 3 20 6 20 19 12 21 4 18 4 5" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  )
}
function IconTransport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="8" cy="19" r="1.5" />
      <circle cx="16" cy="19" r="1.5" />
      <line x1="4" y1="17" x2="4" y2="20" />
      <line x1="20" y1="17" x2="20" y2="20" />
    </svg>
  )
}
function IconBencana() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L22 20 L2 20 Z" />
      <line x1="12" y1="10" x2="12" y2="15" />
      <line x1="12" y1="18" x2="12" y2="18.5" />
    </svg>
  )
}
function IconCuaca() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0 0-10 6 6 0 0 0-11.5 2A4 4 0 0 0 6 18h11" />
      <line x1="8"  y1="20" x2="8"  y2="22" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="16" y1="20" x2="16" y2="22" />
    </svg>
  )
}
const SECTIONS = [
  { key: 'basemap',   title: 'Basemap',      kind: 'basemap',  Icon: IconBasemap },
  { key: 'wilayah',   title: 'Wilayah',      kind: 'wilayah',  Icon: IconWilayah, groups: WILAYAH_GROUP_NAMES },
  { key: 'transport', title: 'Transportasi', kind: 'groups',   Icon: IconTransport, groups: TRANSPORT_GROUP_NAMES },
  { key: 'cuaca',     title: 'Cuaca',        kind: 'groups',   Icon: IconCuaca,     groups: CUACA_GROUP_NAMES },
  { key: 'bencana',   title: 'Bencana Alam', kind: 'groups',   Icon: IconBencana,   groups: BENCANA_GROUP_NAMES },
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

function LayerButton({ title, active, onClick, Icon }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      width: 36, height: 36, borderRadius: 8, padding: 0,
      background: active ? 'var(--accent)' : 'var(--surface-solid)',
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      boxShadow: 'var(--shadow)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: active ? 'white' : 'var(--text)',
      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    }}>
      <Icon />
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
  if (section.kind === 'basemap') {
    return <BasemapSection basemap={props.basemap} onBasemap={props.onBasemap} />
  }
  if (section.kind === 'wilayah') {
    return (
      <>
        <BoundarySection
          boundary={props.boundary}
          onBoundary={props.onBoundary}
          boundaryLoading={props.boundaryLoading} />
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <TransportGroups
          groups={section.groups}
          transportActive={props.transportActive}
          transportLoading={props.transportLoading}
          transportError={props.transportError}
          onToggleTransport={props.onToggleTransport} />
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

function Panel({ section, props, onClose }) {
  const panelRef = useRef(null)
  useEffect(() => {
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    // Delay so the button click that opened this panel doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDocClick) }
  }, [onClose])
  return (
    <div ref={panelRef} style={{
      position: 'absolute', top: 56, right: 12, zIndex: 1000,
      background: 'var(--surface-solid)', border: '1px solid var(--border)',
      borderRadius: 8, boxShadow: 'var(--shadow)',
      padding: '12px 16px', minWidth: 240, maxHeight: '80vh', overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
          {section.title}
        </span>
        <button onClick={onClose} aria-label="Tutup" style={{
          background: 'none', border: 'none', color: 'var(--text-dim)',
          cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 2,
        }}>×</button>
      </div>
      <SectionBody section={section} props={props} />
    </div>
  )
}

export default function LayersControl(props) {
  const [openKey, setOpenKey] = useState(null)
  const activeSection = SECTIONS.find(s => s.key === openKey)
  const toggle = (key) => setOpenKey(prev => prev === key ? null : key)
  return (
    <>
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1001,
        display: 'flex', gap: 6,
      }}>
        {SECTIONS.map(s => (
          <LayerButton key={s.key}
            title={s.title}
            Icon={s.Icon}
            active={openKey === s.key}
            onClick={() => toggle(s.key)} />
        ))}
      </div>
      {activeSection && (
        <Panel section={activeSection} props={props} onClose={() => setOpenKey(null)} />
      )}
    </>
  )
}
