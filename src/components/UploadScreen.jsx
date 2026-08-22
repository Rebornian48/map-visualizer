import React, { useRef, useState } from 'react'
import ThemeToggle from './ThemeToggle'

export default function UploadScreen({ onFile, theme, onToggleTheme }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0])
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', position: 'relative',
      overflow: 'hidden', transition: 'background 0.4s',
    }}>
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 1, maxWidth: 520, width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: '0.3rem' }}>
          <h1 style={{
            fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, var(--text), var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Map Visualizer</h1>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
          Visualize your Google Location History on an interactive map.<br />
          Drop your <code style={{ color: 'var(--accent)', fontFamily: "'DM Mono', monospace", fontSize: '0.85rem' }}>Timeline.json</code> file to begin.
        </p>

        <div
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', padding: '3rem 2rem', cursor: 'pointer',
            transition: 'all 0.3s',
            background: dragging ? 'var(--dropzone-hover)' : 'var(--surface-solid)',
          }}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span style={{ fontSize: '2.5rem', marginBottom: '1rem', display: 'block' }}>📍</span>
          <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.4rem' }}>Drop file here or click to browse</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>
            Supports Google Takeout Timeline.json
          </div>
        </div>

        <input ref={inputRef} type="file" accept=".json" style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />

        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: "'DM Mono', monospace" }}>
          Inspired by{' '}
          <a href="https://github.com/mahlernim/google-timeline-visualizer" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}>google-timeline-visualizer</a>
          {' · '}All data stays in your browser
        </div>
      </div>
    </div>
  )
}
