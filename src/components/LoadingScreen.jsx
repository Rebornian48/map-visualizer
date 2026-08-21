import React from 'react'

export default function LoadingScreen({ text, pct }) {
  return (
    <div style={{
      display: 'flex', position: 'fixed', inset: 0, background: 'var(--bg)',
      zIndex: 9999, alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '1.5rem',
    }}>
      <div style={{
        width: 56, height: 56, border: '3px solid var(--surface-2)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        {text}
      </div>
      <div style={{ width: 240, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--accent)', width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}
