import React from 'react'

const toggleStyle = {
  position: 'relative',
  width: 52,
  height: 28,
  borderRadius: 14,
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 3px',
  flexShrink: 0,
}

const thumbBase = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'var(--accent)',
  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
}

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <div
      style={toggleStyle}
      onClick={onToggle}
      title="Toggle dark/light mode"
    >
      <div style={{
        ...thumbBase,
        transform: isDark ? 'translateX(0)' : 'translateX(23px)',
      }}>
        {isDark ? '🌙' : '☀️'}
      </div>
    </div>
  )
}
