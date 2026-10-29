import React, { useRef, useCallback, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import '../digitasi.css'
import { useDigitasiMap, LANDUSE, LANDUSE_KEYS, areaM2, areaText, fmt } from './useDigitasiMap'
import LayersControl from './LayersControl'
import { LegendStack, CoordinateReadout } from './MapPanels'
import ThemeToggle from './ThemeToggle'

const uiPanel = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow)',
  transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
}

function BackButton({ onClick }) {
  return (
    <button className="digitasi-nav-btn" onClick={onClick}
      title="Kembali ke Map Visualizer"
      style={{ top: 56, left: 56, zIndex: 1000 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12,19 5,12 12,5" />
      </svg>
    </button>
  )
}

function StatsSection({ stats }) {
  return (
    <div className="digitasi-section">
      <div className="digitasi-stats">
        <div className="digitasi-stat">
          <b>{stats.count}</b><span>persil</span>
        </div>
        <div className="digitasi-stat">
          <b>{fmt(stats.area / 10000, 2)}</b><span>hektare total</span>
        </div>
      </div>
    </div>
  )
}

function ImportSection({ onImport }) {
  const fileRef = useRef(null)
  const handleChange = async (e) => {
    for (const f of e.target.files) await onImport(f)
    e.target.value = ''
  }
  return (
    <div className="digitasi-section">
      <div className="digitasi-label">Impor data</div>
      <div className="digitasi-row">
        <label className="d-btn" htmlFor="d-file-input">
          Unggah SHP (.zip) / GeoJSON
          <input ref={fileRef} id="d-file-input" type="file"
            accept=".zip,.geojson,.json" multiple onChange={handleChange} />
        </label>
      </div>
      <p className="digitasi-drop-hint">
        Shapefile harus dikemas dalam satu .zip berisi .shp, .shx, .dbf, dan .prj.
        File juga bisa diseret langsung ke peta.
      </p>
    </div>
  )
}

function ExportSection({ onGeoJSON, onSHP, onFit, onClear }) {
  const [clearArmed, setClearArmed] = useState(false)
  const clearTimer = useRef(null)

  const handleClear = () => {
    if (!clearArmed) {
      setClearArmed(true)
      clearTimer.current = setTimeout(() => setClearArmed(false), 3000)
      return
    }
    clearTimeout(clearTimer.current)
    setClearArmed(false)
    onClear()
  }

  return (
    <div className="digitasi-section">
      <div className="digitasi-label">Ekspor data</div>
      <div className="digitasi-row">
        <button className="d-primary" onClick={onGeoJSON}>Unduh GeoJSON</button>
        <button className="d-primary" onClick={onSHP}>Unduh SHP (.zip)</button>
      </div>
      <div className="digitasi-row">
        <button onClick={onFit}>Perbesar ke semua persil</button>
        <button className="d-danger" onClick={handleClear}>
          {clearArmed ? 'Klik lagi untuk menghapus' : 'Hapus semua'}
        </button>
      </div>
    </div>
  )
}

function DetailSection({ selected, onUpdate, onDelete }) {
  if (!selected?.feature?.properties) return null
  const p = selected.feature.properties
  const m2 = areaM2(selected)

  return (
    <div className="digitasi-section">
      <div className="digitasi-label">Atribut persil terpilih</div>
      <div className="digitasi-attr">
        <label>
          Nama / kode persil
          <input type="text" value={p.nama || ''} onChange={e => onUpdate('nama', e.target.value)} />
        </label>
        <label>
          Pemilik
          <input type="text" value={p.pemilik || ''} onChange={e => onUpdate('pemilik', e.target.value)} />
        </label>
        <label>
          Penggunaan lahan
          <select value={p.guna_lahan || 'Lainnya'} onChange={e => onUpdate('guna_lahan', e.target.value)}>
            {LANDUSE_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>
          Keterangan
          <textarea value={p.ket || ''} onChange={e => onUpdate('ket', e.target.value)} />
        </label>
        <div className="digitasi-readout">Luas: {areaText(m2)}</div>
        <div className="digitasi-row">
          <button className="d-danger" onClick={onDelete}>Hapus persil ini</button>
        </div>
      </div>
    </div>
  )
}

function ParcelList({ parcels, selected, onSelect, mapInstance }) {
  if (parcels.length === 0) {
    return (
      <div className="digitasi-empty">
        Belum ada persil. Pilih alat poligon atau persegi di kiri atas peta, lalu klik titik-titik batas lahan.
      </div>
    )
  }
  return parcels.map(({ layer, props, area }) => {
    const isActive = layer === selected
    const go = () => {
      onSelect(layer)
      const map = mapInstance.current
      if (map && layer.getBounds) map.fitBounds(layer.getBounds(), { maxZoom: 19, padding: [40, 40] })
    }
    return (
      <div key={props.id || Math.random()}
        className={'digitasi-item' + (isActive ? ' active' : '')}
        tabIndex={0}
        onClick={go}
        onKeyDown={e => { if (e.key === 'Enter') go() }}>
        <span className="digitasi-swatch"
          style={{ background: LANDUSE[props.guna_lahan] || LANDUSE.Lainnya }} />
        <div style={{ minWidth: 0 }}>
          <div className="digitasi-item-name">{props.nama}</div>
          <div className="digitasi-item-sub">
            {props.guna_lahan}{props.pemilik ? ' · ' + props.pemilik : ''}
          </div>
        </div>
        <div className="digitasi-item-area">{fmt(area / 10000, 2)} ha</div>
      </div>
    )
  })
}

function MapArea({ controller, onBack, theme, onToggleTheme }) {
  const { refs, layerState, actions, ui } = controller
  const mapWrapRef = useRef(null)

  const handleDragEnter = (e) => { e.preventDefault(); mapWrapRef.current?.classList.add('dragging') }
  const handleDragOver = (e) => { e.preventDefault(); mapWrapRef.current?.classList.add('dragging') }
  const handleDragLeave = (e) => {
    e.preventDefault()
    if (mapWrapRef.current?.contains(e.relatedTarget)) return
    mapWrapRef.current?.classList.remove('dragging')
  }
  const handleDrop = async (e) => {
    e.preventDefault()
    mapWrapRef.current?.classList.remove('dragging')
    for (const f of e.dataTransfer.files) await actions.importFile(f)
  }

  return (
    <main className="digitasi-map-wrap" ref={mapWrapRef}
      onDragEnter={handleDragEnter} onDragOver={handleDragOver}
      onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div className="digitasi-map" ref={refs.mapRef} />

      <LayersControl
        basemap={layerState.basemap} onBasemap={controller.setters.setBasemap}
        boundary={layerState.boundary} onBoundary={controller.setters.setBoundary}
        boundaryLoading={layerState.boundaryLoading}
        transportActive={layerState.transportActive}
        transportLoading={layerState.transportLoading}
        transportError={layerState.transportError}
        onToggleTransport={actions.onToggleTransport}
      />

      <BackButton onClick={onBack} />

      <div style={{ position: 'absolute', top: 56, left: 100, zIndex: 500 }}>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <LegendStack uiPanel={uiPanel}
        activeKeys={layerState.transportActive}
        meta={layerState.transportMeta} />

      <CoordinateReadout uiPanel={uiPanel} cursor={ui.cursor} />

      {ui.toastMsg && (
        <div className="digitasi-toast">{ui.toastMsg}</div>
      )}
    </main>
  )
}

export default function DigitasiView({ theme, onToggleTheme, onBack }) {
  const controller = useDigitasiMap()
  const { parcelState, actions, refs } = controller
  // Force re-render on parcel changes via parcelVersion
  const parcels = parcelState.getParcels()

  return (
    <div className="digitasi-app">
      <aside className="digitasi-panel">
        <header>
          <h1>Digitasi Peta Lahan</h1>
          <p>Gambar batas persil di atas citra satelit, isi atributnya, lalu simpan sebagai GeoJSON atau Shapefile.</p>
        </header>

        <StatsSection stats={parcelState.stats} />
        <ImportSection onImport={actions.importFile} />
        <ExportSection
          onGeoJSON={actions.exportGeoJSON}
          onSHP={actions.exportSHP}
          onFit={actions.fitAll}
          onClear={actions.clearAll}
        />

        <DetailSection
          selected={parcelState.selected}
          onUpdate={actions.updateAttribute}
          onDelete={actions.deleteSelected}
        />

        <div className="digitasi-list">
          <div className="digitasi-label">Daftar persil</div>
          <ParcelList
            parcels={parcels}
            selected={parcelState.selected}
            onSelect={actions.selectParcel}
            mapInstance={refs.mapInstance}
          />
        </div>
      </aside>

      <MapArea
        controller={controller}
        onBack={onBack}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    </div>
  )
}
