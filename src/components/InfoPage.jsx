import React from 'react'

const sectionLabel = {
  fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em',
  color: 'var(--text-dim)', marginBottom: 10, display: 'block',
  fontFamily: "'DM Mono', monospace",
}

const h3Style = {
  fontSize: '1.15rem', fontWeight: 600, margin: '0 0 10px', color: 'var(--text)',
}

const pStyle = { fontSize: '0.9rem', color: 'var(--text-dim)', lineHeight: 1.65, margin: '0 0 12px' }
const pMuted = { ...pStyle, fontSize: '0.82rem' }
const linkStyle = { color: 'var(--accent)', textDecoration: 'underline' }

function ExternalLink({ href, children }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{children}</a>
}

const BMKG_DATASETS = [
  { name: 'Gempa terbaru (autogempa)', format: 'JSON',
    url: 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json' },
  { name: 'Gempa terkini M 5+', format: 'JSON',
    url: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json' },
  { name: 'Gempa dirasakan', format: 'JSON',
    url: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json' },
  { name: 'Peringatan Dini Cuaca — RSS (index CAP)', format: 'RSS',
    url: 'https://www.bmkg.go.id/alerts/nowcast/id/rss.xml' },
  { name: 'Peringatan Dini Cuaca — per-alert (CAP 1.2)', format: 'CAP XML',
    url: 'https://www.bmkg.go.id/alerts/nowcast/id/' },
  { name: 'Prakiraan cuaca per wilayah (adm4)', format: 'JSON',
    url: 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001' },
]

const OTSUM_DATASETS = [
  { name: 'Transjakarta (BRT, Mikrotrans, dll)', format: 'GTFS (.zip)',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/file_gtfs.zip' },
  { name: 'Trans Semarang', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transsemarang.json' },
  { name: 'Metro Trans Jabar', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/metrojabartrans.json' },
  { name: 'Bus Listrik Medan', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/buslistrikmedan.json' },
  { name: 'Trans Koetaradja', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transkotaradja.json' },
  { name: 'Transpakuan (Bis Kita Bogor)', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/transpakuan.json' },
  { name: 'Mitra Darat (Trans Jogja, Trans Jateng, Trans Batam, Trans Jatim, Suroboyo Bus, dan kota-kota lain)', format: 'JSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/mitradarat.json' },
  { name: 'Stasiun KRL, LRT, dan MRT', format: 'KML',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/rails.kml' },
  { name: 'Garis rel KRL', format: 'GeoJSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/krl_lines.geojson' },
  { name: 'Garis rel LRT & MRT', format: 'GeoJSON',
    url: 'https://cdn.opentransum.randspace0.com/transport-data/lrt_mrt_lines.geojson' },
]

function DatasetList({ items }) {
  return (
    <ul style={{
      listStyle: 'none', margin: '0 0 22px', padding: 0,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {items.map(d => (
        <li key={d.url} style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 260px', fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
            {d.name}
          </div>
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{
            padding: '5px 12px', borderRadius: 6, background: 'var(--accent)', color: 'white',
            fontSize: '0.75rem', fontFamily: "'DM Mono', monospace",
            textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
          }}>{d.format}</a>
        </li>
      ))}
    </ul>
  )
}

function OpentransumSection() {
  return (
    <section>
      <h3 style={h3Style}>Opentransum — Transportasi Umum</h3>
      <p style={pStyle}>
        Overlay bus, GTFS, dan rel/stasiun berasal dari{' '}
        <ExternalLink href="https://opentransum.randspace0.com/open-data">Opentransum</ExternalLink>,
        yang mengkompilasi data dari operator publik (Transjakarta, Trans Semarang,
        Trans Koetaradja, Transpakuan, Bus Listrik Medan, Metro Trans Jabar, KAI
        Commuter, MRT/LRT, dan operator Mitra Darat lainnya).
      </p>
      <p style={pStyle}>
        Data statis — trayek, halte, stasiun, dan rute — bisa diunduh dan
        dipakai langsung oleh peneliti, pengembang, jurnalis, maupun masyarakat
        umum.
      </p>
      <div style={sectionLabel}>Dataset</div>
      <DatasetList items={OTSUM_DATASETS} />
      <div style={sectionLabel}>Penyangkalan</div>
      <p style={pStyle}>
        Opentransum tidak memiliki data ini. Seluruh data trayek, halte,
        stasiun, dan rute adalah milik masing-masing operator transportasi.
        Data disediakan <em>as-is</em>, tanpa jaminan atas keakuratan atau
        kemutakhiran; rujuk ke operator untuk informasi resmi.
      </p>
      <div style={sectionLabel}>Lisensi</div>
      <p style={pStyle}>
        Kompilasi Opentransum dilisensikan di bawah{' '}
        <ExternalLink href="https://creativecommons.org/licenses/by-nc/4.0/deed.id">
          Attribution-NonCommercial 4.0
        </ExternalLink>. Hak atas data asli tetap pada masing-masing operator.
      </p>
    </section>
  )
}

function BmkgSection() {
  return (
    <section>
      <h3 style={h3Style}>BMKG — Gempa, Peringatan Dini &amp; Cuaca</h3>
      <p style={pStyle}>
        Data dari <strong>Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)</strong>,
        dipublikasikan lewat repositori GitHub{' '}
        <ExternalLink href="https://github.com/infoBMKG">infoBMKG</ExternalLink>.
        Gempa & CAP diperbarui otomatis; prakiraan cuaca diterbitkan harian dengan
        resolusi per 3 jam untuk 3 hari ke depan.
      </p>
      <div style={sectionLabel}>Dataset</div>
      <DatasetList items={BMKG_DATASETS} />
      <p style={pMuted}>
        Data disajikan <em>as-is</em>. Untuk peringatan resmi rujuk selalu ke{' '}
        <ExternalLink href="https://www.bmkg.go.id/">bmkg.go.id</ExternalLink>.
      </p>
    </section>
  )
}

function MagmaSection() {
  return (
    <section>
      <h3 style={h3Style}>MAGMA Indonesia — Status Gunung Api Live</h3>
      <p style={pStyle}>
        Status aktivitas 69 gunung api Indonesia dari{' '}
        <ExternalLink href="https://magma.esdm.go.id/">MAGMA Indonesia</ExternalLink>{' '}
        (Pusat Vulkanologi dan Mitigasi Bencana Geologi — <strong>PVMBG · Badan
        Geologi · Kementerian ESDM</strong>). MAGMA menyisipkan roster gunung api
        plus level aktivitas terkini (Normal / Waspada / Siaga / Awas) sebagai
        variabel inline di halaman utama; overlay ini fetch halaman via proxy PHP
        dan ekstrak array-nya di klien.
      </p>
      <p style={pStyle}>
        Fallback: kalau live fetch gagal (MAGMA rate-limit / block IP datacenter),
        overlay pakai snapshot vendored di <code>public/magma/volcanoes.json</code>.
      </p>
      <p style={pStyle}>
        Field yang dipakai: nama gunung, kabupaten/kota, provinsi, elevasi,
        koordinat, kode 3-huruf MAGMA, level aktivitas, dan flag <em>VONA</em>
        (Volcano Observatory Notice for Aviation) beserta nomor notice-nya.
      </p>
      <p style={pMuted}>
        Untuk peringatan resmi dan tindakan lapangan rujuk selalu ke{' '}
        <ExternalLink href="https://magma.esdm.go.id/v1/gunung-api/laporan-harian">
          laporan harian MAGMA
        </ExternalLink>.
      </p>
    </section>
  )
}

function VolcanoSection() {
  return (
    <section>
      <h3 style={h3Style}>Gunung Api — Smithsonian GVP (Holocene)</h3>
      <p style={pStyle}>
        1.214 gunung api Holocene dari <em>Smithsonian Global Volcanism
        Program</em>, snapshot langsung dari WFS resmi mereka di{' '}
        <ExternalLink href="https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?request=GetCapabilities">
          webservices.volcano.si.edu/geoserver/GVP-VOTW
        </ExternalLink>{' '}(feature type <code>Smithsonian_VOTW_Holocene_Volcanoes</code>).
        GeoJSON di-vendor ke <code>public/veins/volcanoes.json</code> (~2,4 MB)
        untuk build self-contained.
      </p>
      <p style={pStyle}>
        Field yang dipakai: nama, negara, wilayah/subwilayah, tipe, landform,
        elevasi, batuan utama, setting tektonik, tahun erupsi terakhir, foto GVP
        + kredit, ringkasan geologis, dan nomor VOTW untuk deep-link ke halaman
        resmi tiap gunung.
      </p>
      <p style={pMuted}>
        Sitasi wajib: <em>Global Volcanism Program</em>,{' '}
        <ExternalLink href="https://doi.org/10.5479/si.GVP.VOTW5-2026.5.4">
          Volcanoes of the World (v. 5.2.6)
        </ExternalLink>, Smithsonian Institution.
      </p>
    </section>
  )
}

function TectonicSection() {
  return (
    <section>
      <h3 style={h3Style}>Lempeng Tektonik — PB2002 (Bird 2003)</h3>
      <p style={pStyle}>
        Batas lempeng, poligon lempeng, dan orogen dari{' '}
        <ExternalLink href="https://github.com/fraxen/tectonicplates">fraxen/tectonicplates</ExternalLink>
        {' '}— GeoJSON turunan dari model PB2002. Bundle di dalam build.
      </p>
      <p style={pMuted}>
        Bird, P. (2003), <em>An updated digital model of plate boundaries</em>,
        Geochemistry Geophysics Geosystems, 4(3), 1027, doi:10.1029/2001GC000252.
      </p>
    </section>
  )
}

function Header({ onBack }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '16px 28px', borderBottom: '1px solid var(--border)',
      background: 'var(--surface-solid)', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <button onClick={onBack} title="Kembali ke peta" style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 12px', color: 'var(--text)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Peta
      </button>
      <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
        Sumber Data
      </h1>
    </header>
  )
}

export default function InfoPage({ onBack }) {
  // body has `overflow: hidden` globally (map needs a fixed viewport), so
  // make this page's own container the scroll surface.
  return (
    <div style={{
      height: '100vh', overflowY: 'auto', overflowX: 'hidden',
      background: 'var(--map-bg)',
      fontFamily: "'Outfit', sans-serif", color: 'var(--text)',
    }}>
      <Header onBack={onBack} />
      <main style={{
        maxWidth: 780, margin: '0 auto', padding: '28px 28px 60px',
        display: 'flex', flexDirection: 'column', gap: 30,
      }}>
        <section>
          <p style={{ ...pStyle, fontSize: '0.95rem' }}>
            Semua overlay yang bisa di-toggle di peta datang dari sumber publik
            di bawah. Halaman ini dokumentasi lengkapnya — endpoint, atribusi,
            lisensi, dan penyangkalan per sumber.
          </p>
        </section>
        <OpentransumSection />
        <BmkgSection />
        <MagmaSection />
        <VolcanoSection />
        <TectonicSection />
      </main>
    </div>
  )
}
