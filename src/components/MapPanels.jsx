import React from 'react'
import { MONTH_NAMES } from './mapView.helpers'
import { MBG_RAMP } from '../mbg'

function fmt(v) {
  return typeof v === 'number' ? v.toLocaleString('en-US') : v
}

export function StatsPanel({ stats, uiPanel }) {
  const rows = [
    ['Period', stats.label],
    ['Data Points', fmt(stats.points)],
    ['Places Visited', fmt(stats.visits), true],
    ['Unique Places', fmt(stats.uniquePlaces)],
    ['Trips', fmt(stats.trips)],
    ['Total Distance',
      `${Math.round((stats.totalDist || 0) / 1000).toLocaleString('en-US')} km`, true],
  ]
  return (
    <div style={{ ...uiPanel, position: 'absolute', top: 16, right: 16, zIndex: 1000, padding: 20, width: 280 }}>
      <h3 style={{
        fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em',
        color: 'var(--text-dim)', marginBottom: 14, fontFamily: "'DM Mono', monospace",
      }}>Statistics</h3>
      {rows.map(([label, value, accent], i) => (
        <div key={label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '8px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{label}</span>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: '0.9rem', fontWeight: 500,
            color: accent ? 'var(--accent)' : 'var(--text)',
          }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthBar({ uiPanel, months, current, onSelect }) {
  return (
    <div style={{
      ...uiPanel, position: 'absolute', bottom: 80, left: '50%',
      transform: 'translateX(-50%)', zIndex: 1000, display: 'flex', gap: 3, padding: 4,
    }}>
      <button onClick={() => onSelect(null)} style={{
        padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem',
        fontFamily: "'DM Mono', monospace", cursor: 'pointer', border: 'none',
        background: current === null ? 'var(--accent-2)' : 'transparent',
        color: current === null ? 'white' : 'var(--text)', fontWeight: 600,
      }}>All</button>
      {months.map(m => (
        <button key={m} onClick={() => onSelect(m)} style={{
          padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem',
          fontFamily: "'DM Mono', monospace", cursor: 'pointer', border: 'none',
          minWidth: 36, textAlign: 'center',
          background: current === m ? 'var(--accent)' : 'transparent',
          color: current === m ? 'white' : 'var(--text-dim)',
        }}>{MONTH_NAMES.at(m)}</button>
      ))}
    </div>
  )
}

const TECT_LEGEND_ROWS = [
  { key: 'tect_boundaries', shape: 'line', color: '#ff9800', label: 'Batas lempeng' },
  { key: 'tect_boundaries', shape: 'line', color: '#d32f2f', label: 'Zona subduksi' },
  { key: 'tect_plates',     shape: 'grad', label: 'Lempeng tektonik' },
  { key: 'tect_orogens',    shape: 'fill', color: '#8d6e63', label: 'Orogen (zona pegunungan)' },
]

const TECT_GRAD_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#00838f', '#c2185b']

function TectSwatch({ shape, color }) {
  if (shape === 'line') {
    return <span style={{ width: 14, height: 3, background: color, borderRadius: 1, flexShrink: 0 }} />
  }
  if (shape === 'fill') {
    return <span style={{
      width: 14, height: 10, background: color, opacity: 0.85,
      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, flexShrink: 0,
    }} />
  }
  const stripes = TECT_GRAD_COLORS.map((c, i) => `${c} ${(i / TECT_GRAD_COLORS.length) * 100}%, ${c} ${((i + 1) / TECT_GRAD_COLORS.length) * 100}%`).join(', ')
  return <span style={{
    width: 14, height: 10, background: `linear-gradient(90deg, ${stripes})`,
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 2, flexShrink: 0,
  }} />
}

const legendCardStyle = { padding: '10px 14px' }
const legendTitleStyle = {
  fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace", marginBottom: 6,
}
const legendRowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
  fontSize: '0.75rem', color: 'var(--text-dim)',
}

function LegendRow({ swatch, label, right }) {
  return (
    <div style={legendRowStyle}>
      {swatch}
      <span style={{ flex: 1 }}>{label}</span>
      {right != null && (
        <span style={{
          marginLeft: 8, fontFamily: "'DM Mono', monospace",
          fontSize: '0.7rem', color: 'var(--text)', fontWeight: 500,
        }}>{right}</span>
      )}
    </div>
  )
}

export function TectonicLegend({ uiPanel, activeKeys }) {
  const rows = TECT_LEGEND_ROWS.filter(r => activeKeys.has(r.key))
  if (rows.length === 0) return null
  return (
    <div style={{ ...uiPanel, ...legendCardStyle }}>
      <div style={legendTitleStyle}>Tektonik (PB2002)</div>
      {rows.map((r, i) => (
        <LegendRow key={`${r.key}-${i}`}
          swatch={<TectSwatch shape={r.shape} color={r.color} />}
          label={r.label} />
      ))}
    </div>
  )
}

const GEMPA_KEYS = new Set(['bmkg_gempa_auto', 'bmkg_gempa_terkini', 'bmkg_gempa_rasa'])
const GEMPA_ROWS = [
  { color: '#e53935', label: 'Dangkal (< 70 km)' },
  { color: '#fb8c00', label: 'Menengah (70–300 km)' },
  { color: '#1e88e5', label: 'Dalam (> 300 km)' },
]

const CAP_ROWS = [
  { color: '#7b1fa2', label: 'Extreme' },
  { color: '#e53935', label: 'Severe' },
  { color: '#fb8c00', label: 'Moderate' },
  { color: '#fdd835', label: 'Minor' },
  { color: '#9e9e9e', label: 'Unknown' },
]

const CUACA_ICON_ROWS = [
  ['☀️', 'Cerah'],
  ['🌤️', 'Cerah Berawan'],
  ['⛅', 'Berawan'],
  ['☁️', 'Berawan Tebal'],
  ['🌫️', 'Kabut / Asap'],
  ['🌦️', 'Hujan Ringan'],
  ['🌧️', 'Hujan Sedang / Lebat'],
  ['⛈️', 'Hujan Petir'],
]

function Dot({ color, size = 10 }) {
  return <span style={{
    width: size, height: size, borderRadius: '50%', background: color,
    border: '1.5px solid #fff', boxSizing: 'border-box', flexShrink: 0,
  }} />
}

function CircleSwatch({ color, size }) {
  return <span style={{
    width: size, height: size, borderRadius: '50%', background: color,
    opacity: 0.6, border: '1.5px solid #fff', boxSizing: 'border-box', flexShrink: 0,
  }} />
}

function TriangleSwatch({ color, size = 12 }) {
  const s = size + 2
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" style={{ flexShrink: 0, display: 'block' }}>
      <polygon points="12,3 22,20 2,20" fill={color} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function TriangleSizeSwatch({ color, size }) {
  return <TriangleSwatch color={color} size={size} />
}

function CapSwatch({ color }) {
  return <span style={{
    width: 14, height: 10, background: color, opacity: 0.35,
    border: `1.5px solid ${color}`, borderRadius: 2, flexShrink: 0,
  }} />
}

function GempaSection() {
  return (
    <>
      <div style={legendTitleStyle}>Gempa · kedalaman</div>
      {GEMPA_ROWS.map(r => (
        <LegendRow key={r.color} swatch={<Dot color={r.color} />} label={r.label} />
      ))}
      <div style={{ ...legendRowStyle, gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <CircleSwatch color="#e53935" size={7} />
        <CircleSwatch color="#e53935" size={11} />
        <CircleSwatch color="#e53935" size={16} />
        <span style={{ marginLeft: 4, opacity: 0.85 }}>ukuran = magnitude</span>
      </div>
    </>
  )
}

function CapSection() {
  return (
    <>
      <div style={{ ...legendTitleStyle, marginTop: 10 }}>Peringatan dini · severity</div>
      {CAP_ROWS.map(r => (
        <LegendRow key={r.color} swatch={<CapSwatch color={r.color} />} label={r.label} />
      ))}
    </>
  )
}

function CuacaSection() {
  return (
    <>
      <div style={{ ...legendTitleStyle, marginTop: 10 }}>Cuaca · ikon</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14, rowGap: 3,
      }}>
        {CUACA_ICON_ROWS.map(([icon, label]) => (
          <div key={label} style={{ ...legendRowStyle, padding: '2px 0' }}>
            <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  )
}

const VOLCANO_ROWS = [
  { color: '#e53935', label: 'Aktif (erupsi ≥ 1900)' },
  { color: '#fb8c00', label: 'Historis (1500–1899)' },
  { color: '#8d6e63', label: 'Holocene (pra-1500)' },
]

const MAGMA_ROWS = [
  { statusCode: 4, color: '#e53935', label: 'Level IV · Awas' },
  { statusCode: 3, color: '#fb8c00', label: 'Level III · Siaga' },
  { statusCode: 2, color: '#fdd835', label: 'Level II · Waspada' },
  { statusCode: 1, color: '#43a047', label: 'Level I · Normal' },
]

const SIGMET_ROWS = [
  { code: 'VA',   color: '#b71c1c', label: 'Volcanic ash' },
  { code: 'TC',   color: '#7b1fa2', label: 'Tropical cyclone' },
  { code: 'TS',   color: '#fb8c00', label: 'Thunderstorm' },
  { code: 'TSGR', color: '#e64a19', label: 'Thunderstorm + hail' },
  { code: 'TURB', color: '#00838f', label: 'Turbulence' },
  { code: 'ICE',  color: '#0288d1', label: 'Icing' },
  { code: 'MTW',  color: '#5d4037', label: 'Mountain waves' },
  { code: 'DS',   color: '#c9a227', label: 'Dust / sand storm' },
]

function CapLineSwatch({ color }) {
  return <span style={{
    width: 14, height: 10, background: `${color}22`,
    border: `1.5px solid ${color}`, borderRadius: 2, flexShrink: 0,
  }} />
}

export function SigmetLegend({ uiPanel, activeKeys, meta }) {
  if (!activeKeys.has('sigmet_intl')) return null
  const info = meta?.get('sigmet_intl')
  const counts = info?.counts || {}
  const total = info?.total
  const rows = SIGMET_ROWS.filter(r => (counts[r.code] ?? 0) > 0)
  return (
    <div style={{ ...uiPanel, ...legendCardStyle, minWidth: 210 }}>
      <div style={{ ...legendTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>SIGMET · Hazard aktif</span>
        {total != null && (
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>Σ {total}</span>
        )}
      </div>
      {rows.length === 0 && (
        <div style={{ ...legendRowStyle, fontStyle: 'italic', opacity: 0.7 }}>
          Tidak ada SIGMET aktif
        </div>
      )}
      {rows.map(r => (
        <LegendRow key={r.code}
          swatch={<CapLineSwatch color={r.color} />}
          label={`${r.label} (${r.code})`}
          right={counts[r.code]} />
      ))}
    </div>
  )
}

export function MagmaLegend({ uiPanel, activeKeys, meta }) {
  if (!activeKeys.has('magma_gunungapi')) return null
  const info = meta?.get('magma_gunungapi')
  const counts = info?.counts
  const total = info?.total
  const isSnapshot = info?.source === 'snapshot'
  return (
    <div style={{ ...uiPanel, ...legendCardStyle, minWidth: 210 }}>
      <div style={{ ...legendTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>MAGMA · Status Gunung Api</span>
        {total != null && (
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>Σ {total}</span>
        )}
      </div>
      {MAGMA_ROWS.map(r => (
        <LegendRow key={r.color}
          swatch={<TriangleSwatch color={r.color} size={12} />}
          label={r.label}
          right={counts ? counts[r.statusCode] ?? 0 : undefined} />
      ))}
      {isSnapshot && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)',
          fontSize: '0.68rem', color: 'var(--text-dim)', fontStyle: 'italic',
        }}>Fallback snapshot (MAGMA live tak terjangkau)</div>
      )}
    </div>
  )
}

export function VolcanoLegend({ uiPanel, activeKeys }) {
  if (!activeKeys.has('volcanoes_gvp')) return null
  return (
    <div style={{ ...uiPanel, ...legendCardStyle }}>
      <div style={legendTitleStyle}>Gunung Api (GVP)</div>
      {VOLCANO_ROWS.map(r => (
        <LegendRow key={r.color} swatch={<TriangleSwatch color={r.color} size={12} />} label={r.label} />
      ))}
      <div style={{ ...legendRowStyle, gap: 6, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <TriangleSizeSwatch color="#8d6e63" size={9} />
        <TriangleSizeSwatch color="#8d6e63" size={13} />
        <TriangleSizeSwatch color="#8d6e63" size={17} />
        <span style={{ marginLeft: 4, opacity: 0.85 }}>ukuran = elevasi</span>
      </div>
    </div>
  )
}

export function BmkgLegend({ uiPanel, activeKeys }) {
  const showGempa = [...GEMPA_KEYS].some(k => activeKeys.has(k))
  const showCap = activeKeys.has('bmkg_cap_nowcast')
  const showCuaca = activeKeys.has('bmkg_cuaca_kota')
  if (!showGempa && !showCap && !showCuaca) return null
  return (
    <div style={{ ...uiPanel, ...legendCardStyle }}>
      {showGempa && <GempaSection />}
      {showCap && <CapSection />}
      {showCuaca && <CuacaSection />}
    </div>
  )
}

export function MbgLegend({ uiPanel, activeKeys, meta }) {
  if (!activeKeys.has('mbg_keracunan')) return null
  const info = meta?.get('mbg_keracunan')
  return (
    <div style={{ ...uiPanel, ...legendCardStyle, minWidth: 210 }}>
      <div style={{ ...legendTitleStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>Keracunan MBG · korban</span>
        {info?.total != null && (
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>Σ {info.total}</span>
        )}
      </div>
      {MBG_RAMP.map(r => (
        <LegendRow key={r.color}
          swatch={<Dot color={r.color} />}
          label={`${r.label} orang`} />
      ))}
      {info?.first && info?.last && (
        <div style={{
          marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)',
          fontSize: '0.68rem', color: 'var(--text-dim)',
        }}>{info.first} → {info.last} · {info.bergejala?.toLocaleString('id-ID')} bergejala{info.meninggal ? `, ${info.meninggal} meninggal` : ''}</div>
      )}
    </div>
  )
}

export function LegendStack({ uiPanel, activeKeys, meta }) {
  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 16, zIndex: 1000,
      display: 'flex', flexDirection: 'column-reverse', gap: 8, alignItems: 'flex-start',
      maxWidth: 320,
    }}>
      <TectonicLegend uiPanel={uiPanel} activeKeys={activeKeys} />
      <VolcanoLegend uiPanel={uiPanel} activeKeys={activeKeys} />
      <MagmaLegend uiPanel={uiPanel} activeKeys={activeKeys} meta={meta} />
      <SigmetLegend uiPanel={uiPanel} activeKeys={activeKeys} meta={meta} />
      <BmkgLegend uiPanel={uiPanel} activeKeys={activeKeys} />
      <MbgLegend uiPanel={uiPanel} activeKeys={activeKeys} meta={meta} />
    </div>
  )
}

export function Legend({ uiPanel, items }) {
  return (
    <div style={{
      ...uiPanel, position: 'absolute', bottom: 130, left: 16, zIndex: 1000, padding: '12px 16px',
    }}>
      {items.map(item => (
        <div key={item.type} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
          fontSize: '0.75rem', color: 'var(--text-dim)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

export function CoordinateReadout({ uiPanel, cursor }) {
  return (
    <div style={{
      ...uiPanel, position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
      padding: '6px 12px', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem',
      color: 'var(--text-dim)', display: 'flex', gap: 12, pointerEvents: 'none',
    }}>
      <span>Lat: <span style={{ color: 'var(--text)' }}>{cursor ? cursor.lat.toFixed(6) : '—'}</span></span>
      <span>Lng: <span style={{ color: 'var(--text)' }}>{cursor ? cursor.lng.toFixed(6) : '—'}</span></span>
    </div>
  )
}

export function PlaybackBar({ uiPanel, isPlaying, onTogglePlay, playPct, timeLabel, speed, onCycleSpeed }) {
  return (
    <div style={{
      ...uiPanel, position: 'absolute', bottom: 20, left: '50%',
      transform: 'translateX(-50%)', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
    }}>
      <button onClick={onTogglePlay} style={{
        width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
        border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0,
      }}>{isPlaying ? '⏸' : '▶'}</button>

      <div style={{
        width: 300, height: 4, background: 'var(--surface-2)', borderRadius: 2,
        cursor: 'pointer', position: 'relative',
      }}>
        <div style={{
          height: '100%', background: 'var(--accent)', borderRadius: 2,
          width: `${playPct}%`, transition: 'width 0.05s linear',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${playPct}%`,
          transform: 'translate(-50%, -50%)', width: 12, height: 12,
          background: 'var(--accent)', borderRadius: '50%',
          boxShadow: '0 0 8px var(--accent-glow)', pointerEvents: 'none',
        }} />
      </div>

      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: '0.75rem',
        color: 'var(--text-dim)', minWidth: 70, textAlign: 'center',
      }}>{timeLabel}</div>

      <button onClick={onCycleSpeed} style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 10px', color: 'var(--text)', cursor: 'pointer',
        fontSize: '0.7rem', fontFamily: "'DM Mono', monospace",
      }}>{speed}×</button>
    </div>
  )
}
