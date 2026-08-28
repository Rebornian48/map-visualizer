import React from 'react'
import { MONTH_NAMES } from './mapView.helpers'

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
