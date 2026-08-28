import React from 'react'
import ThemeToggle from './ThemeToggle'

function Brand() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', padding: '4px 4px 4px 0',
    }}>
      <span style={{
        width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%',
        boxShadow: '0 0 8px var(--accent-glow)',
      }} />
      Map Visualizer
    </div>
  )
}

function YearTabs({ years, current, onSelect }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 3,
      background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
      overflowX: 'auto', maxWidth: 580,
    }}>
      {years.map(y => (
        <button key={y} onClick={() => onSelect(y)}
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: '0.8rem',
            fontFamily: "'DM Mono', monospace", cursor: 'pointer', whiteSpace: 'nowrap',
            border: 'none', background: current === y ? 'var(--accent)' : 'transparent',
            color: current === y ? 'white' : 'var(--text-dim)', transition: 'all 0.2s',
          }}>{y}</button>
      ))}
    </div>
  )
}

function FileInput({ fileInput, hasData }) {
  return (
    <>
      <button onClick={() => fileInput.ref.current?.click()} style={{
        padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, color: 'var(--text)', cursor: 'pointer',
        fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
      }}>
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
        {hasData ? 'Replace JSON' : 'Add Timeline JSON'}
      </button>
      <input ref={fileInput.ref} type="file" accept=".json" style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) fileInput.onFile(f)
          e.target.value = ''
        }} />
    </>
  )
}

function ActionCluster({ hasData, onOpenExport, onToggleStats, theme, onToggleTheme }) {
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      {hasData && (
        <>
          <button onClick={onOpenExport} style={{
            padding: '7px 14px', background: 'var(--accent)', border: 'none',
            borderRadius: 8, color: 'white', cursor: 'pointer',
            fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 500,
          }}>Export Video</button>
          <button onClick={onToggleStats} style={{
            background: 'none', border: 'none', padding: '7px 12px', color: 'var(--text)',
            cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif",
            borderRadius: 7,
          }}>Stats</button>
        </>
      )}
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </div>
  )
}

const headerStyle = {
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  padding: '10px 16px',
  background: 'var(--surface-solid)', borderBottom: '1px solid var(--border)',
  boxShadow: 'var(--shadow)', zIndex: 1100,
}

export default function HeaderBar({ hasData, yearNav, fileInput, onOpenExport, onToggleStats, theme, onToggleTheme }) {
  return (
    <header style={headerStyle}>
      <Brand />
      <FileInput fileInput={fileInput} hasData={hasData} />
      {hasData && <YearTabs {...yearNav} />}
      <ActionCluster hasData={hasData} onOpenExport={onOpenExport} onToggleStats={onToggleStats}
                     theme={theme} onToggleTheme={onToggleTheme} />
    </header>
  )
}
