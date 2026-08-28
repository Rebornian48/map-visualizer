import React from 'react'

const panel = {
  background: 'var(--surface-solid)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
}

const sectionLabel = {
  fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em',
  color: 'var(--text-dim)', marginBottom: 10, display: 'block',
  fontFamily: "'DM Mono', monospace",
}

const DATASETS = [
  {
    name: 'Transjakarta (BRT, Mikrotrans, dll)',
    format: 'GTFS (.zip)',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/file_gtfs.zip',
  },
  {
    name: 'Trans Semarang',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transsemarang.json',
  },
  {
    name: 'Metro Trans Jabar',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/metrojabartrans.json',
  },
  {
    name: 'Bus Listrik Medan',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/buslistrikmedan.json',
  },
  {
    name: 'Trans Koetaradja',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transkotaradja.json',
  },
  {
    name: 'Transpakuan (Bis Kita Bogor)',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transpakuan.json',
  },
  {
    name: 'Mitra Darat (Trans Jogja, Trans Jateng, Trans Batam, Trans Jatim, Suroboyo Bus, dan kota-kota lain — lihat halaman Moda Transportasi untuk daftar lengkap)',
    format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/mitradarat.json',
  },
  {
    name: 'Stasiun KRL, LRT, dan MRT',
    format: 'KML',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/rails.kml',
  },
  {
    name: 'Garis rel KRL',
    format: 'GeoJSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/krl_lines.geojson',
  },
  {
    name: 'Garis rel LRT & MRT',
    format: 'GeoJSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/lrt_mrt_lines.geojson',
  },
]

export default function DataInfoModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panel,
          width: '100%', maxWidth: 640, maxHeight: '90vh',
          overflow: 'auto', padding: 28,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18,
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
            Data Terbuka Opentransum
          </h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        <p style={{
          fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, margin: '0 0 12px',
        }}>
          Opentransum berkomitmen untuk membagikan data transportasi umum secara terbuka
          kepada publik.
        </p>
        <p style={{
          fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, margin: '0 0 22px',
        }}>
          Data statis di bawah ini — trayek, halte, stasiun, dan rute — bisa diunduh
          dan dipakai langsung oleh siapa saja: peneliti, pengembang, jurnalis, maupun
          masyarakat umum.
        </p>

        <div style={sectionLabel}>Dataset</div>
        <ul style={{
          listStyle: 'none', margin: '0 0 24px', padding: 0,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {DATASETS.map(d => (
            <li key={d.url} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap',
            }}>
              <div style={{
                flex: '1 1 260px', fontSize: '0.85rem', color: 'var(--text)',
                lineHeight: 1.5,
              }}>
                {d.name}
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '5px 12px', borderRadius: 6,
                  background: 'var(--accent)', color: 'white',
                  fontSize: '0.75rem', fontFamily: "'DM Mono', monospace",
                  textDecoration: 'none', fontWeight: 500,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {d.format}
              </a>
            </li>
          ))}
        </ul>

        <div style={sectionLabel}>Penyangkalan</div>
        <p style={{
          fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 10px',
        }}>
          Opentransum tidak memiliki data ini. Seluruh data trayek, halte, stasiun,
          rute, dan jadwal adalah milik masing-masing operator transportasi dan
          dikumpulkan dari sumber yang tersedia untuk publik.
        </p>
        <p style={{
          fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: '0 0 24px',
        }}>
          Data disediakan apa adanya (as-is), tanpa jaminan apa pun atas keakuratan,
          kelengkapan, kemutakhiran, maupun ketersediaannya. Isinya dapat berubah kapan
          saja dan mungkin tidak sesuai dengan kondisi di lapangan. Gunakan dengan
          risiko Anda sendiri, dan rujuk ke operator terkait untuk informasi resmi.
        </p>

        <div style={sectionLabel}>Lisensi &amp; Atribusi</div>
        <p style={{
          fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0,
        }}>
          Kompilasi dan penyajian data oleh Opentransum dilisensikan di bawah{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc/4.0/deed.id"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline' }}
          >
            Attribution-NonCommercial 4.0
          </a>
          . Hak atas data aslinya tetap berada pada masing-masing operator transportasi.
        </p>
      </div>
    </div>
  )
}
