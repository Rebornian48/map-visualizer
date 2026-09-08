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

function SigmetSection() {
  return (
    <section>
      <h3 style={h3Style}>SIGMET — NOAA Aviation Weather Center</h3>
      <p style={pStyle}>
        Peringatan cuaca berbahaya untuk penerbangan (<em>Significant
        Meteorological Information</em>) dari{' '}
        <ExternalLink href="https://aviationweather.gov/">NOAA Aviation
        Weather Center</ExternalLink>, endpoint publik JSON:
      </p>
      <p style={{ ...pMuted, fontFamily: "'DM Mono', monospace" }}>
        <ExternalLink href="https://aviationweather.gov/api/data/isigmet?format=json">
          aviationweather.gov/api/data/isigmet?format=json
        </ExternalLink>
      </p>
      <p style={pStyle}>
        Hazard yang ditangani: <strong>VA</strong> (volcanic ash — paling
        relevan untuk Indonesia karena Ring of Fire), <strong>TS</strong> (thunderstorm,
        termasuk qualifier EMBD/OBSC), <strong>TC</strong> (tropical cyclone),
        <strong> TURB</strong>, <strong>ICE</strong>, <strong>MTW</strong>{' '}
        (mountain waves), dan <strong>DS/SS</strong> (dust/sand storm). Polygon
        area terdampak warna sesuai hazard; popup menampilkan FIR, valid time,
        ketinggian base/top (FL), seri, dan waktu terbitnya.
      </p>
      <p style={pStyle}>
        Endpoint tidak mengirim header CORS; overlay lewat proxy PHP kita
        (<code>?h=awc&amp;p=api/data/isigmet&amp;q=format=json</code>) supaya browser
        bisa fetch dari origin manapun. Cache 5 menit di proxy karena SIGMET
        umumnya valid 4–6 jam dan di-refresh sesuai kondisi.
      </p>
      <p style={pMuted}>
        Sitasi: NOAA <em>National Weather Service — Aviation Weather Center</em>.
        Data domain publik.
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

function OpenAipSection() {
  return (
    <section>
      <h3 style={h3Style}>Aeronautika — OpenAIP (Bandara + Airspace)</h3>
      <p style={pStyle}>
        Data bandara dan airspace polygon untuk Indonesia dari{' '}
        <ExternalLink href="https://www.openaip.net">OpenAIP</ExternalLink> —
        crowdsourced aeronautical database. Ambil via Core REST API{' '}
        <code>api.core.openaip.net</code> dengan filter{' '}
        <code>?country=ID</code>, snapshot di-vendor ke{' '}
        <code>public/openaip/&#123;airports,airspaces&#125;.json</code> (~125 KB
        total). Refresh manual tiap AIRAC cycle (~28 hari) dengan{' '}
        <code>OPENAIP_KEY=… node scripts/refresh-openaip.mjs</code>.
      </p>
      <p style={pStyle}>
        <strong>Coverage per snapshot:</strong> 286 aerodrome (civil, militer,
        internasional, heliport, seaplane base — lengkap dengan runway
        designator/panjang/permukaan dan frekuensi TWR/APP/ATIS) + 8 polygon
        airspace: 2 <strong>FIR</strong> nasional (Jakarta, Ujung Pandang), 3{' '}
        <strong>CTR</strong> dan 3 <strong>TMA</strong> di Papua (Jayapura,
        Merauke, Timika). Marker warna sesuai tipe bandara; polygon warna
        sesuai kelas airspace (FIR biru tipis, CTR merah bata, TMA oranye).
      </p>
      <p style={pStyle}>
        <strong>Batasan:</strong> OpenAIP di-populate komunitas. Kontribusi
        untuk Indonesia masih terbatas — CTR/TMA di luar Papua, sebagian besar
        area PRD (Prohibited/Restricted/Danger), navaid VOR/DME/NDB, dan
        waypoint VFR belum terisi. Struktur overlay sudah siap kalau di masa
        depan data-nya bertambah.
      </p>
      <p style={pMuted}>
        Lisensi: <strong>Attribution-NonCommercial 4.0 (CC BY-NC 4.0)</strong>.
        Sitasi:{' '}
        <ExternalLink href="https://www.openaip.net">openaip.net</ExternalLink>{' '}
        — data disajikan <em>as-is</em>, jangan dipakai untuk navigasi
        penerbangan sungguhan; rujuk selalu ke AIP resmi Indonesia (AirNav
        Indonesia) dan NOTAM aktif.
      </p>
    </section>
  )
}

const OVERLAY_SUMMARY = [
  { section: 'Basemap', items: ['OpenStreetMap · Esri Satellite · OpenTopoMap (3 opsi)'] },
  { section: 'Wilayah', items: ['Provinsi (batas GeoJSON)', 'Kab/Kota (batas GeoJSON)'] },
  { section: 'Transportasi Umum', items: [
    'Bus JSON — 6 jaringan (Trans Semarang, Metro Trans Jabar, Bus Listrik Medan, Trans Koetaradja, Transpakuan, Mitra Darat)',
    'Bus GTFS — Transjakarta (BRT + Mikrotrans)',
    'Rel — KRL, LRT & MRT (garis + stasiun)',
  ] },
  { section: 'Cuaca', items: [
    'Peringatan Dini Cuaca — CAP nowcast BMKG (severity polygon, live)',
    'Prakiraan Cuaca Kota Besar — 11 ibukota provinsi via api.bmkg.go.id',
  ] },
  { section: 'Bencana Alam', items: [
    'Gempa BMKG — autogempa (1), gempaterkini M 5+ (15), gempadirasakan (15)',
    'Tektonik PB2002 — 241 batas lempeng, 54 lempeng, 13 orogen',
    'Vulkano — 1.214 gunung Holocene (Smithsonian GVP) + 69 status live (MAGMA · PVMBG)',
    'Aviasi — SIGMET aktif worldwide dari NOAA AWC (VA, TS, TC, TURB, ICE, MTW, DS)',
  ] },
  { section: 'Aeronautika', items: [
    'Bandara Indonesia — 286 aerodrome dari OpenAIP (runway, frekuensi, tipe)',
    'FIR & Airspace — 2 FIR (Jakarta, Ujung Pandang) + 3 CTR + 3 TMA Papua (OpenAIP; coverage terbatas)',
  ] },
]

// ============================ SIMBOLOGI ============================
// Reusable inline-SVG previews so the info page shows the exact same
// glyphs the map uses. Kept in this file (not shared with mapIcons.js)
// because those functions return L.divIcon instances, not React nodes.

function SymTriangle({ color = '#e53935', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <polygon points="12,3 22,20 2,20" fill={color} fillOpacity="0.85" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
function SymPlane({ color = '#1e88e5', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <g transform="rotate(-30 12 12)">
        <path d="M2 12l20-8-8 20-3-8-9-4z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    </svg>
  )
}
function SymBus({ color = '#00ccaa', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <rect x="4" y="3" width="16" height="14" rx="2" fill={color} stroke="#fff" strokeWidth="1.2" />
      <rect x="6" y="5" width="3.5" height="3" fill="#fff" opacity="0.9" />
      <rect x="10.25" y="5" width="3.5" height="3" fill="#fff" opacity="0.9" />
      <rect x="14.5" y="5" width="3.5" height="3" fill="#fff" opacity="0.9" />
      <circle cx="8" cy="18" r="1.6" fill="#222" stroke="#fff" strokeWidth="0.5" />
      <circle cx="16" cy="18" r="1.6" fill="#222" stroke="#fff" strokeWidth="0.5" />
    </svg>
  )
}
function SymTrain({ color = '#ffcc00', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <rect x="6" y="3" width="12" height="15" rx="3" fill={color} stroke="#333" strokeWidth="1" />
      <rect x="8" y="5" width="8" height="5" fill="#fff" opacity="0.92" />
      <line x1="6" y1="13" x2="18" y2="13" stroke="#333" strokeWidth="0.9" />
      <circle cx="9" cy="18" r="1.3" fill="#222" />
      <circle cx="15" cy="18" r="1.3" fill="#222" />
    </svg>
  )
}
function SymCircle({ color, size = 22, fillOpacity = 0.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <circle cx="12" cy="12" r="8" fill={color} fillOpacity={fillOpacity} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
function SymEmoji({ char, size = 22 }) {
  return <span style={{ fontSize: size, lineHeight: 1, display: 'block', textAlign: 'center', width: size, height: size }}>{char}</span>
}
function SymLine({ color, size = 22, weight = 3, dashed = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={weight}
        strokeLinecap="round" strokeDasharray={dashed ? '3 3' : undefined} />
    </svg>
  )
}
function SymFill({ color, size = 22, fillOpacity = 0.25, weight = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <rect x="3" y="5" width="18" height="14" rx="2" fill={color} fillOpacity={fillOpacity} stroke={color} strokeWidth={weight} />
    </svg>
  )
}

const svgBlock = { display: 'block' }

const SYMBOL_GROUPS = [
  {
    title: 'Titik (marker)',
    rows: [
      { sym: <SymTriangle color="#e53935" />, name: 'Gunung api — aktif',      note: 'Segitiga merah. Ukuran skala elevasi (GVP) / level status (MAGMA).' },
      { sym: <SymTriangle color="#fb8c00" />, name: 'Gunung api — historis',    note: 'Segitiga oranye (erupsi tercatat 1500–1899).' },
      { sym: <SymTriangle color="#8d6e63" />, name: 'Gunung api — holocene',   note: 'Segitiga coklat (erupsi pra-1500, tidak aktif).' },
      { sym: <SymPlane color="#1565c0" />,    name: 'Bandara internasional',   note: 'Pesawat biru tua (ukuran ~22 px).' },
      { sym: <SymPlane color="#1e88e5" />,    name: 'Bandara sipil / airfield', note: 'Pesawat biru (ukuran ~18 px).' },
      { sym: <SymPlane color="#c62828" />,    name: 'Aerodrome militer',       note: 'Pesawat merah.' },
      { sym: <SymPlane color="#ec407a" />,    name: 'Heliport',                note: 'Pesawat pink (~14 px).' },
      { sym: <SymPlane color="#00acc1" />,    name: 'Seaplane base',           note: 'Pesawat teal.' },
      { sym: <SymBus color="#00ccaa" />,      name: 'Halte / stop bus',        note: 'Glyph bus kecil (14 px), warna sesuai operator.' },
      { sym: <SymTrain color="#ffcc00" />,    name: 'Stasiun KRL/LRT/MRT',     note: 'Glyph kereta kuning (16 px).' },
      { sym: <SymCircle color="#e53935" />,   name: 'Gempa dangkal',           note: 'Lingkaran merah (< 70 km). Radius skala magnitude.' },
      { sym: <SymCircle color="#fb8c00" />,   name: 'Gempa menengah',          note: 'Lingkaran oranye (70–300 km).' },
      { sym: <SymCircle color="#1e88e5" />,   name: 'Gempa dalam',             note: 'Lingkaran biru (> 300 km).' },
      { sym: <SymEmoji char="☀️" />,          name: 'Cuaca — cerah',           note: 'Emoji per kondisi dari kode BMKG (cerah / berawan / hujan / petir).' },
    ],
  },
  {
    title: 'Garis (line)',
    rows: [
      { sym: <SymLine color="#ff9800" weight={2} />,  name: 'Batas lempeng (PB2002)', note: 'Garis oranye — patahan/rift/transform.' },
      { sym: <SymLine color="#d32f2f" weight={3} />,  name: 'Zona subduksi',          note: 'Garis merah tebal — trench (mis. Sunda Trench).' },
      { sym: <SymLine color="#3388ff" weight={3} />,  name: 'Rel KRL / LRT / MRT',    note: 'Garis warna sesuai operator (biru KAI, merah LRT, dst.).' },
      { sym: <SymLine color="#ff3366" weight={3} />,  name: 'Trayek bus',             note: 'Garis warna sesuai koridor operator.' },
      { sym: <SymLine color="#ff3366" weight={1.5} />, name: 'Batas Provinsi / Kab-Kota', note: 'Garis merah tipis (GeoJSON boundary).' },
    ],
  },
  {
    title: 'Poligon (area)',
    rows: [
      { sym: <SymFill color="#7b1fa2" fillOpacity={0.35} />, name: 'Peringatan dini — Extreme',  note: 'CAP BMKG severity paling tinggi.' },
      { sym: <SymFill color="#e53935" fillOpacity={0.30} />, name: 'Peringatan dini — Severe',   note: 'Merah.' },
      { sym: <SymFill color="#fb8c00" fillOpacity={0.28} />, name: 'Peringatan dini — Moderate', note: 'Oranye.' },
      { sym: <SymFill color="#fdd835" fillOpacity={0.28} />, name: 'Peringatan dini — Minor',    note: 'Kuning.' },
      { sym: <SymFill color="#b71c1c" fillOpacity={0.30} />, name: 'SIGMET — Volcanic Ash',      note: 'Peringatan abu vulkanik untuk penerbangan.' },
      { sym: <SymFill color="#7b1fa2" fillOpacity={0.28} />, name: 'SIGMET — Tropical Cyclone',  note: 'Peringatan siklon tropis.' },
      { sym: <SymFill color="#8d6e63" fillOpacity={0.20} weight={1} />, name: 'Orogen (PB2002)', note: 'Zona pegunungan aktif (Bird 2003).' },
      { sym: <SymFill color="#1e88e5" fillOpacity={0.06} weight={2} />, name: 'FIR (Flight Information Region)', note: 'Batas biru tipis; fill minim supaya tak menutupi CTR/TMA.' },
      { sym: <SymFill color="#fb8c00" fillOpacity={0.22} weight={1.5} />, name: 'TMA (Terminal Maneuvering Area)', note: 'Oranye, di atas FIR (pane z=412).' },
      { sym: <SymFill color="#d84315" fillOpacity={0.25} weight={2} />, name: 'CTR (Control Zone)', note: 'Merah bata, layer paling atas (pane z=422) — sekitar bandara.' },
      { sym: <SymFill color="#e53935" fillOpacity={0.25} />, name: 'Restricted / Prohibited',    note: 'Airspace larangan.' },
    ],
  },
]

function SymbolRow({ sym, name, note }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, alignItems: 'center',
      padding: '8px 0', borderTop: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{sym}</div>
      <div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.45 }}>{note}</div>
      </div>
    </div>
  )
}

function SymbolCard({ title, rows }) {
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '4px 14px 12px',
    }}>
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: '0.72rem',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--accent)', margin: '10px 0 2px',
      }}>{title}</div>
      {rows.map((r, i) => <SymbolRow key={i} {...r} />)}
    </div>
  )
}

function SimbologiSection() {
  return (
    <section>
      <h3 style={h3Style}>Simbologi Peta</h3>
      <p style={pStyle}>
        Simbol yang dipakai di peta mengikuti konvensi peta buku pelajaran
        Indonesia (BSE) sedapat mungkin — segitiga untuk gunung, pesawat untuk
        bandara, glyph bus/kereta untuk transit — supaya cepat dikenali tanpa
        harus membaca legenda tiap kali.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {SYMBOL_GROUPS.map(g => <SymbolCard key={g.title} {...g} />)}
      </div>
      <p style={{ ...pMuted, marginTop: 10 }}>
        Warna dan ukuran adalah petunjuk semantik: warna gunung menandai
        aktivitas terakhir, warna gempa menandai kedalaman, ukuran skala
        magnitude / elevasi / level alert. Detail lengkap tiap layer ada di
        legend kiri-bawah saat overlay-nya aktif.
      </p>
    </section>
  )
}

function OverlaySummary() {
  return (
    <section>
      <h3 style={h3Style}>Ringkasan Isi Peta</h3>
      <p style={pStyle}>
        Peta ini menggabungkan overlay dari berbagai sumber terbuka. Panel
        di kanan-atas dibagi ke enam tombol berdasarkan kategori:
      </p>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4,
      }}>
        {OVERLAY_SUMMARY.map(g => (
          <div key={g.section} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: '0.72rem',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--accent)', marginBottom: 6,
            }}>{g.section}</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.55 }}>
              {g.items.map((it, i) => <li key={i} style={{ marginBottom: 2 }}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ ...pMuted, marginTop: 12 }}>
        Detail teknis (endpoint, atribusi, lisensi, penyangkalan) tiap sumber
        ada di bagian-bagian di bawah.
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
        <OverlaySummary />
        <SimbologiSection />
        <OpentransumSection />
        <BmkgSection />
        <SigmetSection />
        <MagmaSection />
        <VolcanoSection />
        <TectonicSection />
        <OpenAipSection />
      </main>
    </div>
  )
}
