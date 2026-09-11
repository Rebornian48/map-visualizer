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

function BigBoundarySection() {
  return (
    <section>
      <h3 style={h3Style}>Batas Wilayah — BIG (Badan Informasi Geospasial)</h3>
      <p style={pStyle}>
        Overlay <strong>Provinsi</strong>, <strong>Kab/Kota</strong>,{' '}
        <strong>Kecamatan</strong>, <strong>Kelurahan/Desa</strong>, dan{' '}
        <strong>Batas Laut</strong> di panel <em>Wilayah</em> semuanya
        diambil dari service ArcGIS REST publik{' '}
        <strong>Badan Informasi Geospasial</strong>, edisi Juni 2026,
        dari lima MapServer berbeda di{' '}
        <ExternalLink href="https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH">
          geoservices.big.go.id/rbi/rest/services/BATASWILAYAH
        </ExternalLink>:
      </p>
      <ul style={{ ...pStyle, paddingLeft: '1.25em', margin: '0.5em 0',
                    fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>
        <li>BATAS_KABKOTA_AR &nbsp;· 541 kab/kota (~3 MB)</li>
        <li>BATAS_KECAMATAN_AR · 7.432 kecamatan (~8 MB)</li>
        <li>BATAS_DESAKEL_AR &nbsp;· 84.503 kelurahan/desa (~30 MB)</li>
        <li>BatasNegaraLaut &nbsp;&nbsp;· 4 sublayer polyline (~400 KB total)</li>
      </ul>
      <p style={pStyle}>
        Layer <strong>Provinsi</strong> (38) dihasilkan dengan dissolve
        kab/kota per <code>WADMPR</code>; BIG tidak menyediakan endpoint
        provinsi murni (layer 12 di service <code>BATAS_WILAYAH</code>{' '}
        sebenarnya berisi baris kab/kota juga). Empat provinsi Papua
        baru (Papua Barat Daya, Papua Pegunungan, Papua Selatan, Papua
        Tengah) dan kab/kota barunya sudah masuk sesuai UU pemekaran
        2022.
      </p>
      <p style={pStyle}>
        <strong>Batas Laut</strong> — empat zona UNCLOS sebagai
        polyline, disajikan sebagai checkbox independen (boleh overlay
        bersama-sama): <strong>Laut Teritorial</strong> (12 nm, biru
        solid), <strong>Zona Tambahan</strong> (24 nm, cyan dashed),{' '}
        <strong>Landas Kontinen</strong> (magenta dash-dot), dan{' '}
        <strong>ZEE</strong> (200 nm, oranye dashed). Warna
        cool → warm mengikuti urutan seaward.
      </p>
      <p style={pStyle}>
        <strong>Pipeline refresh</strong>{' '}
        (<code>scripts/refresh-boundaries.py</code> dan{' '}
        <code>refresh-laut.py</code>): paginasi (server BIG 500 di atas
        payload besar), server-side{' '}
        <code>maxAllowableOffset</code> untuk menekan payload, lalu di
        klien <em>shapely</em>:
      </p>
      <ul style={{ ...pStyle, paddingLeft: '1.25em', margin: '0.5em 0' }}>
        <li>Kab/Kota RDP ~555 m → <code>~3 MB</code></li>
        <li>Provinsi RDP ~2,2 km + islet + hole filter → <code>~250 KB</code></li>
        <li>Kecamatan RDP ~333 m → <code>~8 MB</code></li>
        <li>Kelurahan/Desa server_offset 0,005° + RDP 0,002° → <code>~30 MB</code></li>
        <li>Batas Laut — polylines raw dari BIG (fitur sedikit, sudah
          coarse) → <code>~400 KB total</code></li>
      </ul>
      <p style={pStyle}>
        Snapshot di-vendor ke <code>public/boundaries/</code> supaya
        build self-contained (tidak fetch ke BIG saat runtime). Field
        yang di-preserve mengikuti hierarki BIG: <code>WADMPR</code>,{' '}
        <code>WADMKK</code>, <code>WADMKC</code>, <code>WADMKD</code>,
        plus kode BPS lima level (<code>KDPBPS</code>, <code>KDBBPS</code>,{' '}
        <code>KDCBPS</code>, <code>KDEBPS</code>). Popup label
        bertingkat sesuai level yang dipilih (mis. desa menampilkan{' '}
        <em>Desa / Kecamatan / Kab · Provinsi</em>).
      </p>
      <p style={pMuted}>
        Data adalah milik <strong>Badan Informasi Geospasial</strong>
        {' '}(copyrightText service). Sitasi wajib: BIG, <em>Geodatabase data
        batas wilayah administrasi nasional edisi Juni 2026</em> dan{' '}
        <em>Batas Negara Laut</em>. Untuk keperluan resmi rujuk ke{' '}
        <ExternalLink href="https://www.big.go.id/">big.go.id</ExternalLink>.
      </p>
    </section>
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

function MbgSection() {
  return (
    <section>
      <h3 style={h3Style}>Insiden Keracunan MBG — Wikipedia (agregat kab/kota)</h3>
      <p style={pStyle}>
        Choropleth kabupaten/kota untuk dugaan kasus keracunan program{' '}
        <strong>Makan Bergizi Gratis (MBG)</strong>. Sumber tabel:{' '}
        <ExternalLink href="https://id.wikipedia.org/wiki/Daftar_kasus_keracunan_massal_makan_siang_gratis">
          Daftar kasus keracunan massal makan siang gratis
        </ExternalLink>{' '}
        (Wikipedia bahasa Indonesia), bagian <em>Makan Bergizi Gratis</em>.
        Diambil via MediaWiki API, di-parse dengan handling rowspan yang
        benar (satu insiden bisa mencakup beberapa sekolah — jumlah korban
        tidak boleh dobel-hitung), lalu dijodohkan ke centroid + polygon
        kabupaten dari <code>kabkota.json</code>.
      </p>
      <p style={pStyle}>
        Layer render polygon batas administrasi kab/kota yang punya
        insiden, dengan arsiran warm ramp berdasarkan <strong>total
        korban bergejala</strong> di kabupaten tersebut: peach pucat
        (≤50) → oranye → merah → maroon (&gt;2.000). Popup menampilkan
        nama kabupaten, provinsi, jumlah kejadian di sana, total korban,
        dan tiga insiden terbesar (nama lokasi + tanggal + korban).
        Polygon di-simplify Ramer-Douglas-Peucker ~500 m supaya file
        turun dari 33 MB (kabkota.json penuh) ke ~650 KB tanpa
        mengorbankan bentuk kabupaten pada zoom nasional.
      </p>
      <p style={pStyle}>
        <strong>Dashboard interaktif:</strong>{' '}
        <ExternalLink href={`${import.meta.env.BASE_URL}keracunan-mbg`}>
          /keracunan-mbg
        </ExternalLink>{' '}
        — halaman terpisah dengan timeline bulanan (bar chart) +
        breakdown per provinsi + 10 insiden terparah. Cross-filter dua
        arah: klik bulan → provinsi ter-filter; klik provinsi → timeline
        ter-filter. Dashboard dan layer peta share satu sumber data
        (<code>public/mbg/incidents.json</code>).
      </p>
      <p style={pStyle}>
        Refresh manual (jalankan setelah tabel Wikipedia update):{' '}
        <code>python scripts/refresh-mbg.py</code>. Script fetch section
        Makan Bergizi Gratis lewat MediaWiki API, download{' '}
        <code>kabkota.json</code>, dan menulis dua file:{' '}
        <code>incidents.json</code> (per-insiden, dipakai dashboard) dan{' '}
        <code>incidents.geojson</code> (per-kab/kota, dipakai peta).
      </p>
      <p style={pMuted}>
        Data <em>as-is</em> dari Wikipedia — akurasi dan kelengkapannya
        bergantung pada kontribusi editor. Untuk data resmi, rujuk ke
        laporan Badan Gizi Nasional dan Kementerian Kesehatan. Angka
        korban dan lokasi bisa berbeda dengan sumber primer. Konten
        artikel Wikipedia dilisensikan{' '}
        <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/">
          CC BY-SA 4.0
        </ExternalLink>.
      </p>
    </section>
  )
}

function KeuskupanSection() {
  return (
    <section>
      <h3 style={h3Style}>Gereja Katolik — Keuskupan (batas gerejawi kab/kota)</h3>
      <p style={pStyle}>
        Choropleth kabupaten/kota berdasar keuskupan (diocese) Gereja
        Katolik. Sumber:{' '}
        <ExternalLink href="https://id.wikipedia.org/wiki/Daftar_keuskupan_di_Indonesia">
          Daftar keuskupan di Indonesia
        </ExternalLink>{' '}
        (Wikipedia bahasa Indonesia) untuk daftar 38 keuskupan teritorial +
        metadata (uskup, tahun berdiri, katedral, provinsi gerejawi), lalu
        halaman masing-masing keuskupan untuk daftar kabupaten tepat. Data
        dijodohkan ke polygon <code>kabkota.json</code>: <strong>514
        kabupaten/kota, 38 keuskupan, 10 provinsi gerejawi</strong> (Medan,
        Palembang, Jakarta, Semarang, Ende, Kupang, Pontianak, Samarinda,
        Makassar, Merauke). Ordinariat Militer tidak masuk peta karena tidak
        punya batas geografis (mencakup lingkungan TNI &amp; Polri seluruh
        Indonesia).
      </p>
      <p style={pStyle}>
        Warna arsiran menandai <strong>provinsi gerejawi</strong> (10 hue
        distinct dari palet ColorBrewer, satu warna per provinsi
        metropolitan) — bukan satu warna per keuskupan, agar
        struktur hierarki gerejawi terbaca sekali pandang: keuskupan sufragan
        yang satu provinsi gerejawi dengan metropolitannya akan mengambil
        warna yang sama. Popup menampilkan: nama kab/kota + provinsi sipil,
        nama keuskupan, status (Metropolit / Sufragan), tahun berdiri, nama
        uskup diosesan aktif (atau tanda <em>Lowong</em> jika kursi kosong)
        dengan tanggal penunjukan, dan katedral. Polygon di-simplify
        Ramer-Douglas-Peucker ~1,1 km untuk menekan file ke ~1 MB — visual
        loss tidak terlihat pada zoom nasional.
      </p>
      <p style={pStyle}>
        Catatan pemetaan: beberapa kabupaten split antar keuskupan
        (Kabupaten Mappi di Papua Selatan sebagian ke KA Merauke sebagian ke
        Keuskupan Agats; Mamberamo Raya di Papua sebagian ke Jayapura
        sebagian ke Timika). Layer ini memilih keuskupan mayoritas untuk
        setiap kabupaten karena polygon terkecil di kabkota.json adalah
        kabupaten, bukan distrik. Kelurahan Pondok Labu (Cilandak, Jakarta
        Selatan) yang secara gerejawi masuk Keuskupan Bogor juga
        diagregasikan ke KAJ karena alasan sama.
      </p>
      <p style={pStyle}>
        Refresh manual (jalankan setelah pergantian uskup atau pembentukan
        keuskupan baru — misalnya Keuskupan Labuan Bajo yang baru berdiri
        21 Juni 2024): <code>python scripts/refresh-keuskupan.py</code>.
        Daftar keuskupan + kabupaten di-embed langsung di dalam script
        (bukan hasil scrape) karena Wikipedia menuliskan cakupan wilayah
        dalam prosa (mis. "Jawa Tengah bagian barat") yang tidak
        machine-readable.
      </p>
      <p style={pMuted}>
        Data <em>as-is</em> — akurasi bergantung pada edisi Wikipedia saat
        script dijalankan. Untuk data resmi rujuk ke Konferensi Waligereja
        Indonesia (<ExternalLink href="https://kawali.org/">
          kawali.org
        </ExternalLink>) dan situs masing-masing keuskupan. Konten
        Wikipedia dilisensikan{' '}
        <ExternalLink href="https://creativecommons.org/licenses/by-sa/4.0/">
          CC BY-SA 4.0
        </ExternalLink>.
      </p>
    </section>
  )
}

function SearatesSection() {
  return (
    <section>
      <h3 style={h3Style}>Maritim — SeaRates World Sea Ports</h3>
      <p style={pStyle}>
        Pelabuhan laut Indonesia dari{' '}
        <ExternalLink href="https://docs.searates.com/spec/world-sea-ports-v1-openapi.json">
          SeaRates World Sea Ports API
        </ExternalLink>{' '}
        (SeaRates by DP World). Endpoint <code>POST /geo/world-sea-ports/list-by-country</code>{' '}
        di <code>geocoding.searates.com</code>, request body{' '}
        <code>&#123;"country_code":"ID","is_river":false&#125;</code>, auth{' '}
        <code>api_key</code> di query string. Snapshot di-vendor ke{' '}
        <code>public/searates/ports.json</code>. Refresh manual dengan{' '}
        <code>SEARATES_KEY=… node scripts/refresh-searates-ports.mjs</code>.
      </p>
      <p style={pStyle}>
        Marker jangkar; warna sesuai fungsi intermoda (biru untuk pelabuhan
        laut murni, biru-tua untuk sea+rail, teal untuk sungai, ungu untuk
        ICD-only), ukuran sesuai throughput TEU (hub &gt; 3 juta TEU jadi
        24 px, menengah 20 px, kecil/unknown 16 px). Popup menampilkan
        LOCODE, kota, koordinat WGS84, TEU tahunan (jika ada), dan flag
        fungsi intermoda (SEA / RIVER / RAIL / ROAD / AIR / ICD).
      </p>
      <p style={pStyle}>
        <strong>Snapshot bawaan:</strong> tanpa API key, aplikasi ini ship
        <em> seed</em> 15 pelabuhan utama (Tanjung Priok, Tanjung Perak,
        Belawan, Makassar, Tanjung Emas, Batam, Balikpapan, Panjang,
        Pontianak, Palembang, Dumai, Bitung, Sorong, Ambon, Jayapura) —
        koordinat dari OpenStreetMap / UN-LOCODE (data publik). Begitu
        script refresh dijalankan dengan key SeaRates, seed ini ditimpa
        katalog nasional lengkap (200+ pelabuhan dengan LOCODE, IATA-code,
        fungsi intermoda).
      </p>
      <p style={pMuted}>
        Atribusi: © SeaRates by DP World. Data untuk keperluan riset &amp;
        referensi; rujuk syarat penggunaan di{' '}
        <ExternalLink href="https://www.searates.com/">searates.com</ExternalLink>{' '}
        sebelum pemakaian komersial. Untuk data resmi pelabuhan Indonesia,
        rujuk ke{' '}
        <ExternalLink href="https://pelindo.co.id/">Pelindo</ExternalLink>{' '}
        dan{' '}
        <ExternalLink href="https://hubla.dephub.go.id/">
          Direktorat Jenderal Perhubungan Laut
        </ExternalLink>.
      </p>
    </section>
  )
}

const OVERLAY_SUMMARY = [
  { section: 'Basemap', items: ['OpenStreetMap · Esri Satellite · OpenTopoMap (3 opsi)'] },
  { section: 'Wilayah', items: [
    'Provinsi — 38 provinsi (BIG edisi Juni 2026, dissolve dari kab/kota)',
    'Kab/Kota — 541 kabupaten/kota termasuk 4 provinsi Papua baru (BIG edisi Juni 2026)',
    'Kecamatan — 7.432 kecamatan (BIG edisi Juni 2026)',
    'Kelurahan/Desa — 84.503 kelurahan/desa (BIG edisi Juni 2026)',
    'Batas Laut · BIG — 4 zona UNCLOS (Laut Teritorial, Zona Tambahan, Landas Kontinen, ZEE)',
    'Gereja Katolik · Keuskupan — choropleth kabupaten, warna per 10 provinsi gerejawi (Wikipedia)',
  ] },
  { section: 'Transportasi', items: [
    'Bus JSON — 6 jaringan (Trans Semarang, Metro Trans Jabar, Bus Listrik Medan, Trans Koetaradja, Transpakuan, Mitra Darat)',
    'Bus GTFS — Transjakarta (BRT + Mikrotrans)',
    'Rel — KRL, LRT & MRT (garis + stasiun)',
    'Aeronautika — 286 bandara + FIR/CTR/TMA dari OpenAIP',
    'Maritim — pelabuhan Indonesia dari SeaRates World Sea Ports',
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
    'Insiden · Keracunan MBG — arsiran kab/kota, agregat dari tabel Wikipedia (~400+ insiden)',
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
function SymAnchor({ color = '#0288d1', size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={svgBlock}>
      <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="4.5" r="1.8" fill="#fff" />
        <line x1="12" y1="6.3" x2="12" y2="20.5" />
        <line x1="8.5" y1="10" x2="15.5" y2="10" />
        <path d="M4 15c1.5 3.5 4.7 5.5 8 5.5s6.5-2 8-5.5" />
      </g>
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
      { sym: <SymAnchor color="#0288d1" />,   name: 'Pelabuhan laut',           note: 'Jangkar biru — pelabuhan laut murni.' },
      { sym: <SymAnchor color="#0277bd" />,   name: 'Pelabuhan intermoda',      note: 'Jangkar biru-tua — sea + rail (hub kontainer).' },
      { sym: <SymAnchor color="#00838f" />,   name: 'Pelabuhan sungai',         note: 'Jangkar teal — riverport.' },
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
      { sym: <SymFill color="#fdbb84" fillOpacity={0.72} weight={0.6} />, name: 'MBG kab/kota — ≤ 200 korban',  note: 'Choropleth kab/kota terdampak keracunan MBG (ramp warm; peach = sedikit).' },
      { sym: <SymFill color="#fc8d59" fillOpacity={0.72} weight={0.6} />, name: 'MBG kab/kota — 201–500',       note: 'Oranye.' },
      { sym: <SymFill color="#e34a33" fillOpacity={0.72} weight={0.6} />, name: 'MBG kab/kota — 501–1.000',     note: 'Merah.' },
      { sym: <SymFill color="#b30000" fillOpacity={0.72} weight={0.6} />, name: 'MBG kab/kota — 1.001–2.000',   note: 'Merah tua.' },
      { sym: <SymFill color="#7f0000" fillOpacity={0.72} weight={0.6} />, name: 'MBG kab/kota — > 2.000',       note: 'Maroon gelap (paling parah).' },
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
        di kanan-atas dibagi ke lima tombol berdasarkan kategori:
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
        <BigBoundarySection />
        <OpentransumSection />
        <BmkgSection />
        <SigmetSection />
        <MagmaSection />
        <VolcanoSection />
        <TectonicSection />
        <OpenAipSection />
        <SearatesSection />
        <MbgSection />
        <KeuskupanSection />
      </main>
    </div>
  )
}
