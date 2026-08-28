import React from 'react'
import 'leaflet/dist/leaflet.css'
import ExportModal from './ExportModal'
import DataInfoModal from './DataInfoModal'
import LayersControl from './LayersControl'
import HeaderBar from './HeaderBar'
import { StatsPanel, MonthBar, Legend, CoordinateReadout, PlaybackBar } from './MapPanels'
import { SPEEDS } from './mapView.helpers'
import { useMapController } from './useMapController'

const uiPanel = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow)',
  transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
}

function DataInfoButton({ onClick }) {
  return (
    <button onClick={onClick} title="Tentang data" style={{
      position: 'absolute', top: 56, right: 12, zIndex: 1000,
      width: 36, height: 36, borderRadius: 8,
      background: 'var(--surface-solid)', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text)' }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </button>
  )
}

function MapArea({ controller, hasData }) {
  const { refs, state, setters, actions } = controller
  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      <div ref={refs.mapRef} style={{
        width: '100%', height: '100%', background: 'var(--map-bg)', transition: 'background 0.4s',
      }} />
      <LayersControl
        basemap={state.basemap} onBasemap={setters.setBasemap}
        boundary={state.boundary} onBoundary={setters.setBoundary}
        boundaryLoading={state.boundaryLoading}
        transportActive={state.transportActive}
        transportLoading={state.transportLoading}
        transportError={state.transportError}
        onToggleTransport={actions.onToggleTransport}
      />
      <DataInfoButton onClick={() => setters.setShowDataInfo(true)} />
      {state.showDataInfo && <DataInfoModal onClose={() => setters.setShowDataInfo(false)} />}
      {hasData && state.showStats && <StatsPanel stats={state.stats} uiPanel={uiPanel} />}
      {hasData && state.currentYear && (
        <MonthBar uiPanel={uiPanel} months={state.availableMonths}
                  current={state.currentMonth} onSelect={setters.setCurrentMonth} />
      )}
      {hasData && state.legendItems.length > 0 && <Legend uiPanel={uiPanel} items={state.legendItems} />}
      <CoordinateReadout uiPanel={uiPanel} cursor={state.cursor} />
      {hasData && (
        <PlaybackBar uiPanel={uiPanel}
          isPlaying={state.isPlaying} onTogglePlay={actions.togglePlay}
          playPct={state.playPct} timeLabel={state.timeLabel}
          speed={state.speed}
          onCycleSpeed={() => setters.setSpeedIdx(i => (i + 1) % SPEEDS.length)} />
      )}
    </div>
  )
}

export default function MapView({ yearData, theme, onToggleTheme, onFile }) {
  const controller = useMapController(yearData)
  const { refs, state, setters } = controller
  const hasData = !!yearData

  const yearNav = {
    years: state.years,
    current: state.currentYear,
    onSelect: (y) => { setters.setCurrentYear(y); setters.setCurrentMonth(null) },
  }
  const fileInput = { ref: refs.fileInputRef, onFile }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        hasData={hasData}
        yearNav={yearNav}
        fileInput={fileInput}
        onOpenExport={() => setters.setShowExport(true)}
        onToggleStats={() => setters.setShowStats(s => !s)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
      {state.showExport && hasData && (
        <ExportModal yearData={yearData} map={refs.mapInstance.current}
                     onClose={() => setters.setShowExport(false)} />
      )}
      <MapArea controller={controller} hasData={hasData} />
    </div>
  )
}
