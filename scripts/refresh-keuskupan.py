"""Build public/keuskupan/keuskupan.geojson from an embedded keuskupan roster.

Data source: id.wikipedia.org/wiki/Daftar_keuskupan_di_Indonesia plus each
keuskupan's own page (for the kabupaten list). Kabupaten membership was
compiled manually because the summary page only carries prose ("Jawa Barat
bagian barat"). All 38 territorial keuskupan are included; the Ordinariat
Militer has no geographic boundary and is intentionally omitted from the
choropleth (it lives in the info page instead).

Run from repo root:  python scripts/refresh-keuskupan.py
"""
import json, re, io, sys, urllib.request
from pathlib import Path
from datetime import date

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO        = Path(__file__).resolve().parent.parent
OUT_GEO     = REPO / "public" / "keuskupan" / "keuskupan.geojson"
KABKOTA_URL = "https://rebornian48.my.id/assets/json/kabkota.json"
# ~1.1 km at the equator. This layer covers all 514 kabupaten so we want
# the whole file under 1 MB — aggressive vs the 0.005 MBG uses (that one
# only ships the affected kabupaten). At country zoom the loss is invisible.
SIMPLIFY_TOL = 0.01

# --- keuskupan roster --------------------------------------------------------
#
# `kab` uses raw wiki spellings (with "Kabupaten "/"Kota " prefix) so that
# `norm()` below sorts them into kab: vs kota: buckets against kabkota.json.
# `whole_prov` lists provinces where every kab/kota belongs to this diocese
# (a shorthand — expanded from kabkota.json at build time).

KEUSKUPAN = [
    # ================= PROVINSI GEREJAWI MEDAN =================
    # Sumatera Utara bagian utara + hampir seluruh Aceh. The KA Medan wiki
    # page only lists parishes (2 Aceh entries) but the main "Daftar keuskupan
    # di Indonesia" says "hampir seluruh Aceh" — 2 kab/kota (Aceh Singkil,
    # Subulussalam) go to Sibolga, the other 21 belong here.
    dict(nama="Keuskupan Agung Medan", prov_gerejawi="Medan", status="Metropolit",
         berdiri="30 Juni 1911",
         uskup="Kornelius Sipayung, O.F.M. Cap.", uskup_sejak="8 Desember 2018",
         katedral="Katedral Medan",
         whole_prov=[],
         kab=["Kota Banda Aceh","Kabupaten Aceh Tenggara",
              "Kabupaten Aceh Barat","Kabupaten Aceh Barat Daya","Kabupaten Aceh Besar",
              "Kabupaten Aceh Jaya","Kabupaten Aceh Selatan","Kabupaten Aceh Tamiang",
              "Kabupaten Aceh Tengah","Kabupaten Aceh Timur","Kabupaten Aceh Utara",
              "Kabupaten Bener Meriah","Kabupaten Bireuen","Kabupaten Gayo Lues",
              "Kota Langsa","Kota Lhokseumawe","Kota Sabang",
              "Kabupaten Nagan Raya","Kabupaten Pidie","Kabupaten Pidie Jaya","Kabupaten Simeulue",
              "Kota Binjai","Kota Medan","Kota Pematangsiantar","Kota Tanjung Balai","Kota Tebing Tinggi",
              "Kabupaten Asahan","Kabupaten Batu Bara","Kabupaten Dairi","Kabupaten Deli Serdang",
              "Kabupaten Humbang Hasundutan","Kabupaten Labuhanbatu","Kabupaten Labuhanbatu Utara",
              "Kabupaten Labuhanbatu Selatan","Kabupaten Langkat","Kabupaten Karo","Kabupaten Pakpak Bharat",
              "Kabupaten Simalungun","Kabupaten Tapanuli Utara","Kabupaten Toba","Kabupaten Samosir",
              "Kabupaten Serdang Bedagai"]),
    dict(nama="Keuskupan Padang", prov_gerejawi="Medan", status="Sufragan",
         berdiri="19 Juni 1952",
         uskup="Vitus Rubianto Solichin, S.X.", uskup_sejak="3 Juli 2021",
         katedral="Katedral Padang",
         whole_prov=["Sumatera Barat","Riau"],
         kab=["Kabupaten Kerinci","Kota Sungai Penuh"]),
    dict(nama="Keuskupan Sibolga", prov_gerejawi="Medan", status="Sufragan",
         berdiri="17 November 1959",
         uskup="Fransiskus Tuaman Sasfo Sinaga", uskup_sejak="6 Maret 2021",
         katedral="Katedral Sibolga",
         whole_prov=[],
         kab=["Kota Sibolga","Kota Gunungsitoli","Kota Padang Sidempuan",
              "Kabupaten Mandailing Natal","Kabupaten Nias","Kabupaten Nias Barat",
              "Kabupaten Nias Selatan","Kabupaten Nias Utara","Kabupaten Padang Lawas",
              "Kabupaten Padang Lawas Utara","Kabupaten Tapanuli Selatan","Kabupaten Tapanuli Tengah",
              "Kota Subulussalam","Kabupaten Aceh Singkil"]),

    # ================= PROVINSI GEREJAWI PALEMBANG =================
    dict(nama="Keuskupan Agung Palembang", prov_gerejawi="Palembang", status="Metropolit",
         berdiri="27 Desember 1923",
         uskup="Yohanes Harun Yuwono", uskup_sejak="3 Juli 2021",
         katedral="Katedral Palembang",
         whole_prov=["Sumatera Selatan","Bengkulu"],
         kab=["Kota Jambi","Kabupaten Bungo","Kabupaten Merangin","Kabupaten Sarolangun",
              "Kabupaten Tanjung Jabung Barat","Kabupaten Tanjung Jabung Timur",
              "Kabupaten Tebo","Kabupaten Batanghari","Kabupaten Muaro Jambi"]),
    dict(nama="Keuskupan Pangkalpinang", prov_gerejawi="Palembang", status="Sufragan",
         berdiri="27 Desember 1923",
         uskup="Adrianus Sunarko, O.F.M.", uskup_sejak="28 Juni 2017",
         katedral="Katedral Pangkalpinang",
         whole_prov=["Kepulauan Bangka Belitung","Kepulauan Riau"],
         kab=[]),
    dict(nama="Keuskupan Tanjungkarang", prov_gerejawi="Palembang", status="Sufragan",
         berdiri="19 Juni 1952",
         uskup="Vinsensius Setiawan Triatmojo", uskup_sejak="17 Desember 2022",
         katedral="Katedral Tanjungkarang",
         whole_prov=["Lampung"], kab=[]),

    # ================= PROVINSI GEREJAWI JAKARTA =================
    dict(nama="Keuskupan Agung Jakarta", prov_gerejawi="Jakarta", status="Metropolit",
         berdiri="8 Mei 1807",
         uskup="Ignatius Kardinal Suharyo", uskup_sejak="28 Juni 2010",
         katedral="Katedral Jakarta",
         whole_prov=["DKI Jakarta"],
         kab=["Kabupaten Tangerang","Kota Tangerang","Kota Tangerang Selatan",
              "Kabupaten Bekasi","Kota Bekasi"]),
    dict(nama="Keuskupan Bandung", prov_gerejawi="Jakarta", status="Sufragan",
         berdiri="20 April 1932",
         uskup="Antonius Subianto Bunjamin, O.S.C.", uskup_sejak="3 Juni 2014",
         katedral="Katedral Bandung",
         whole_prov=[],
         kab=["Kota Bandung","Kota Banjar","Kota Cimahi","Kota Cirebon","Kota Tasikmalaya",
              "Kabupaten Bandung","Kabupaten Bandung Barat","Kabupaten Ciamis","Kabupaten Cirebon",
              "Kabupaten Garut","Kabupaten Indramayu","Kabupaten Karawang","Kabupaten Kuningan",
              "Kabupaten Majalengka","Kabupaten Pangandaran","Kabupaten Purwakarta","Kabupaten Subang",
              "Kabupaten Sumedang","Kabupaten Tasikmalaya"]),
    dict(nama="Keuskupan Bogor", prov_gerejawi="Jakarta", status="Sufragan",
         berdiri="9 Desember 1948",
         uskup="Lowong", uskup_sejak="19 Januari 2026",
         katedral="Katedral Bogor",
         whole_prov=[],
         kab=["Kota Bogor","Kabupaten Bogor","Kota Depok","Kota Sukabumi","Kabupaten Sukabumi",
              "Kabupaten Cianjur",
              "Kota Cilegon","Kota Serang","Kabupaten Serang","Kabupaten Lebak","Kabupaten Pandeglang"]),

    # ================= PROVINSI GEREJAWI SEMARANG =================
    dict(nama="Keuskupan Agung Semarang", prov_gerejawi="Semarang", status="Metropolit",
         berdiri="25 Juni 1940",
         uskup="Robertus Rubiyatmoko", uskup_sejak="18 Maret 2017",
         katedral="Katedral Semarang",
         whole_prov=["Daerah Istimewa Yogyakarta"],
         kab=["Kota Semarang","Kabupaten Semarang","Kota Surakarta","Kabupaten Boyolali",
              "Kabupaten Demak","Kabupaten Grobogan","Kabupaten Jepara","Kabupaten Karanganyar",
              "Kabupaten Kendal","Kabupaten Klaten","Kabupaten Kudus","Kabupaten Magelang",
              "Kota Magelang","Kabupaten Pati","Kota Salatiga","Kabupaten Sragen",
              "Kabupaten Sukoharjo","Kabupaten Temanggung","Kabupaten Wonogiri"]),
    dict(nama="Keuskupan Malang", prov_gerejawi="Semarang", status="Sufragan",
         berdiri="27 April 1927",
         uskup="Henricus Pidyarto Gunawan, O. Carm.", uskup_sejak="28 Juni 2016",
         katedral="Katedral Malang",
         whole_prov=[],
         kab=["Kota Malang","Kota Batu","Kota Pasuruan","Kota Probolinggo",
              "Kabupaten Bangkalan","Kabupaten Banyuwangi","Kabupaten Bondowoso","Kabupaten Jember",
              "Kabupaten Lumajang","Kabupaten Malang","Kabupaten Pamekasan","Kabupaten Pasuruan",
              "Kabupaten Probolinggo","Kabupaten Sampang","Kabupaten Situbondo","Kabupaten Sumenep"]),
    dict(nama="Keuskupan Purwokerto", prov_gerejawi="Semarang", status="Sufragan",
         berdiri="25 April 1932",
         uskup="Christophorus Tri Harsono", uskup_sejak="14 Juli 2018",
         katedral="Katedral Purwokerto",
         whole_prov=[],
         kab=["Kabupaten Banjarnegara","Kabupaten Banyumas","Kabupaten Batang","Kabupaten Brebes",
              "Kabupaten Cilacap","Kabupaten Kebumen","Kabupaten Pekalongan","Kota Pekalongan",
              "Kabupaten Pemalang","Kabupaten Purbalingga","Kabupaten Purworejo","Kabupaten Tegal",
              "Kota Tegal","Kabupaten Wonosobo"]),
    dict(nama="Keuskupan Surabaya", prov_gerejawi="Semarang", status="Sufragan",
         berdiri="15 Februari 1928",
         uskup="Agustinus Tri Budi Utomo", uskup_sejak="29 Oktober 2024",
         katedral="Katedral Surabaya",
         whole_prov=[],
         kab=["Kota Surabaya","Kota Blitar","Kota Kediri","Kota Madiun","Kota Mojokerto",
              "Kabupaten Blitar","Kabupaten Bojonegoro","Kabupaten Gresik","Kabupaten Jombang",
              "Kabupaten Kediri","Kabupaten Lamongan","Kabupaten Madiun","Kabupaten Magetan",
              "Kabupaten Mojokerto","Kabupaten Nganjuk","Kabupaten Ngawi","Kabupaten Pacitan",
              "Kabupaten Ponorogo","Kabupaten Sidoarjo","Kabupaten Trenggalek","Kabupaten Tuban",
              "Kabupaten Tulungagung",
              "Kabupaten Blora","Kabupaten Rembang"]),

    # ================= PROVINSI GEREJAWI ENDE =================
    dict(nama="Keuskupan Agung Ende", prov_gerejawi="Ende", status="Metropolit",
         berdiri="16 September 1913",
         uskup="Paulus Budi Kleden, S.V.D.", uskup_sejak="25 Mei 2024",
         katedral="Katedral Ende",
         whole_prov=[],
         kab=["Kabupaten Ende","Kabupaten Nagekeo","Kabupaten Ngada"]),
    dict(nama="Keuskupan Denpasar", prov_gerejawi="Ende", status="Sufragan",
         berdiri="10 Juli 1950",
         uskup="Silvester Tung Kiem San", uskup_sejak="22 November 2008",
         katedral="Katedral Denpasar",
         whole_prov=["Bali","Nusa Tenggara Barat"], kab=[]),
    dict(nama="Keuskupan Labuan Bajo", prov_gerejawi="Ende", status="Sufragan",
         berdiri="21 Juni 2024",
         uskup="Maksimus Regus", uskup_sejak="21 Juni 2024",
         katedral="Katedral Labuan Bajo",
         whole_prov=[],
         kab=["Kabupaten Manggarai Barat"]),
    dict(nama="Keuskupan Larantuka", prov_gerejawi="Ende", status="Sufragan",
         berdiri="8 Maret 1951",
         uskup="Yohanes Hans Monteiro", uskup_sejak="22 November 2025",
         katedral="Katedral Larantuka",
         whole_prov=[],
         kab=["Kabupaten Flores Timur","Kabupaten Lembata"]),
    dict(nama="Keuskupan Maumere", prov_gerejawi="Ende", status="Sufragan",
         berdiri="14 Desember 2005",
         uskup="Ewaldus Martinus Sedu", uskup_sejak="14 Juli 2018",
         katedral="Katedral Maumere",
         whole_prov=[],
         kab=["Kabupaten Sikka"]),
    dict(nama="Keuskupan Ruteng", prov_gerejawi="Ende", status="Sufragan",
         berdiri="8 Maret 1951",
         uskup="Siprianus Hormat", uskup_sejak="13 November 2019",
         katedral="Katedral Ruteng",
         whole_prov=[],
         kab=["Kabupaten Manggarai","Kabupaten Manggarai Timur"]),

    # ================= PROVINSI GEREJAWI KUPANG =================
    dict(nama="Keuskupan Agung Kupang", prov_gerejawi="Kupang", status="Metropolit",
         berdiri="13 April 1967",
         uskup="Hironimus Pakaenoni", uskup_sejak="9 Maret 2024",
         katedral="Katedral Kupang",
         whole_prov=[],
         kab=["Kota Kupang","Kabupaten Kupang","Kabupaten Timor Tengah Selatan",
              "Kabupaten Rote Ndao","Kabupaten Sabu Raijua","Kabupaten Alor"]),
    dict(nama="Keuskupan Atambua", prov_gerejawi="Kupang", status="Sufragan",
         berdiri="25 Mei 1936",
         uskup="Dominikus Saku", uskup_sejak="2 Juni 2007",
         katedral="Katedral Atambua",
         whole_prov=[],
         kab=["Kabupaten Belu","Kabupaten Malaka","Kabupaten Timor Tengah Utara"]),
    dict(nama="Keuskupan Weetebula", prov_gerejawi="Kupang", status="Sufragan",
         berdiri="20 Oktober 1959",
         uskup="Edmund Woga, C.SS.R.", uskup_sejak="4 April 2009",
         katedral="Katedral Weetebula",
         whole_prov=[],
         kab=["Kabupaten Sumba Barat","Kabupaten Sumba Barat Daya",
              "Kabupaten Sumba Tengah","Kabupaten Sumba Timur"]),

    # ================= PROVINSI GEREJAWI PONTIANAK =================
    dict(nama="Keuskupan Agung Pontianak", prov_gerejawi="Pontianak", status="Metropolit",
         berdiri="11 Februari 1905",
         uskup="Lowong", uskup_sejak="30 Agustus 2025",
         katedral="Katedral Pontianak",
         whole_prov=[],
         kab=["Kota Pontianak","Kota Singkawang","Kabupaten Bengkayang","Kabupaten Kubu Raya",
              "Kabupaten Landak","Kabupaten Mempawah","Kabupaten Sambas"]),
    dict(nama="Keuskupan Ketapang", prov_gerejawi="Pontianak", status="Sufragan",
         berdiri="14 Juni 1954",
         uskup="Pius Riana Prapdi", uskup_sejak="25 Juni 2012",
         katedral="Katedral Ketapang",
         whole_prov=[],
         kab=["Kabupaten Ketapang","Kabupaten Kayong Utara"]),
    dict(nama="Keuskupan Sanggau", prov_gerejawi="Pontianak", status="Sufragan",
         berdiri="9 April 1968",
         uskup="Valentinus Saeng, C.P.", uskup_sejak="18 Juni 2022",
         katedral="Katedral Sanggau",
         whole_prov=[],
         kab=["Kabupaten Sanggau","Kabupaten Sekadau"]),
    dict(nama="Keuskupan Sintang", prov_gerejawi="Pontianak", status="Sufragan",
         berdiri="11 Maret 1948",
         uskup="Samuel Oton Sidin, O.F.M. Cap.", uskup_sejak="21 Desember 2016",
         katedral="Katedral Sintang",
         whole_prov=[],
         kab=["Kabupaten Sintang","Kabupaten Kapuas Hulu","Kabupaten Melawi"]),

    # ================= PROVINSI GEREJAWI SAMARINDA =================
    dict(nama="Keuskupan Agung Samarinda", prov_gerejawi="Samarinda", status="Metropolit",
         berdiri="21 Februari 1955",
         uskup="Yustinus Harjosusanto, M.S.F.", uskup_sejak="16 Februari 2015",
         katedral="Katedral Samarinda",
         whole_prov=[],
         kab=["Kota Samarinda","Kota Bontang","Kota Balikpapan",
              "Kabupaten Kutai Timur","Kabupaten Kutai Kartanegara","Kabupaten Kutai Barat",
              "Kabupaten Paser","Kabupaten Penajam Paser Utara","Kabupaten Mahakam Ulu"]),
    dict(nama="Keuskupan Banjarmasin", prov_gerejawi="Samarinda", status="Sufragan",
         berdiri="21 Mei 1938",
         uskup="Victorius Dwiardy, O.F.M. Cap.", uskup_sejak="8 Juli 2023",
         katedral="Katedral Banjarmasin",
         whole_prov=["Kalimantan Selatan"], kab=[]),
    dict(nama="Keuskupan Palangka Raya", prov_gerejawi="Samarinda", status="Sufragan",
         berdiri="5 April 1993",
         uskup="Aloysius Maryadi Sutrisnaatmaka, M.S.F.", uskup_sejak="23 Januari 2001",
         katedral="Katedral Palangka Raya",
         whole_prov=["Kalimantan Tengah"], kab=[]),
    dict(nama="Keuskupan Tanjung Selor", prov_gerejawi="Samarinda", status="Sufragan",
         berdiri="22 Desember 2001",
         uskup="Paulinus Yan Olla, M.S.F.", uskup_sejak="22 Februari 2018",
         katedral="Katedral Tanjung Selor",
         whole_prov=["Kalimantan Utara"],
         kab=["Kabupaten Berau"]),

    # ================= PROVINSI GEREJAWI MAKASSAR =================
    dict(nama="Keuskupan Agung Makassar", prov_gerejawi="Makassar", status="Metropolit",
         berdiri="13 April 1937",
         uskup="Fransiskus Nipa", uskup_sejak="17 Oktober 2024",
         katedral="Katedral Makassar",
         whole_prov=["Sulawesi Selatan","Sulawesi Barat","Sulawesi Tenggara"], kab=[]),
    dict(nama="Keuskupan Amboina", prov_gerejawi="Makassar", status="Sufragan",
         berdiri="22 Desember 1902",
         uskup="Seno Inno Ngutra", uskup_sejak="8 Desember 2021",
         katedral="Katedral Amboina",
         whole_prov=["Maluku","Maluku Utara"], kab=[]),
    dict(nama="Keuskupan Manado", prov_gerejawi="Makassar", status="Sufragan",
         berdiri="19 November 1919",
         uskup="Benedictus Estephanus Rolly Untu, M.S.C.", uskup_sejak="12 April 2017",
         katedral="Katedral Manado",
         whole_prov=["Sulawesi Utara","Gorontalo","Sulawesi Tengah"], kab=[]),

    # ================= PROVINSI GEREJAWI MERAUKE =================
    # Papua split (Papua Selatan): Merauke gets Merauke+Boven Digoel+Mappi (mostly);
    # Agats gets Asmat + 4 distrik of Mappi (northern). We assign Mappi to Merauke
    # since it holds the larger share; Agats keeps just Asmat in the choropleth.
    #
    # Papua split (Papua province): Jayapura gets Kota Jayapura+Jayapura+Keerom+
    # Sarmi (+ 3 distrik of Mamberamo Raya, north); Timika gets Kepulauan Yapen+
    # Waropen+Biak Numfor+Supiori (+ southern Mamberamo Raya) + all of Papua Tengah.
    # Mamberamo Raya is split; assign it to Timika so Jayapura reads as
    # coast+highlands.
    dict(nama="Keuskupan Agung Merauke", prov_gerejawi="Merauke", status="Metropolit",
         berdiri="24 Juni 1950",
         uskup="Petrus Canisius Mandagi, M.S.C.", uskup_sejak="11 November 2020",
         katedral="Katedral Merauke",
         whole_prov=[],
         kab=["Kabupaten Merauke","Kabupaten Boven Digoel","Kabupaten Mappi"]),
    dict(nama="Keuskupan Agats", prov_gerejawi="Merauke", status="Sufragan",
         berdiri="29 Mei 1969",
         uskup="Aloysius Murwito, O.F.M.", uskup_sejak="7 Juni 2002",
         katedral="Katedral Agats",
         whole_prov=[],
         kab=["Kabupaten Asmat"]),
    dict(nama="Keuskupan Jayapura", prov_gerejawi="Merauke", status="Sufragan",
         berdiri="12 Mei 1949",
         uskup="Yanuarius Teofilus Matopai You", uskup_sejak="29 Oktober 2022",
         katedral="Katedral Jayapura",
         whole_prov=["Papua Pegunungan"],
         kab=["Kota Jayapura","Kabupaten Jayapura","Kabupaten Keerom","Kabupaten Sarmi"]),
    dict(nama="Keuskupan Manokwari–Sorong", prov_gerejawi="Merauke", status="Sufragan",
         berdiri="19 Desember 1959",
         uskup="Hilarion Datus Lega", uskup_sejak="30 Juni 2003",
         katedral="Katedral Sorong",
         whole_prov=["Papua Barat","Papua Barat Daya"], kab=[]),
    dict(nama="Keuskupan Timika", prov_gerejawi="Merauke", status="Sufragan",
         berdiri="19 Desember 2003",
         uskup="Bernardus Bofitwos Baru, O.S.A.", uskup_sejak="8 Maret 2025",
         katedral="Katedral Timika",
         whole_prov=["Papua Tengah"],
         kab=["Kabupaten Kepulauan Yapen","Kabupaten Waropen","Kabupaten Biak Numfor",
              "Kabupaten Supiori","Kabupaten Mamberamo Raya"]),
]

# --- helpers -----------------------------------------------------------------

def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "map-visualizer-keuskupan-refresh/1.0 (github.com/Rebornian48/map-visualizer)",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def norm(s):
    """Match refresh-mbg.py exactly so we speak the same keys against kabkota.json."""
    if not s: return ""
    s = re.sub(r"\s+", " ", s.lower()).strip()
    kind = "kab"
    if s.startswith("kota administrasi "):
        s, kind = s[len("kota administrasi "):], "kota"
    elif s.startswith("kota "):
        s, kind = s[len("kota "):], "kota"
    elif s.startswith("kabupaten "):
        s, kind = s[len("kabupaten "):], "kab"
    elif s.startswith("kab. "):
        s, kind = s[len("kab. "):], "kab"
    elif s.startswith("kab "):
        s, kind = s[len("kab "):], "kab"
    bare = re.sub(r"[^a-z0-9 ]", "", s).strip()
    return f"{kind}:{bare}"

PROV_ALIAS = {
    "aceh":"aceh","nanggroe aceh darussalam":"aceh",
    "dki jakarta":"dki jakarta",
    "daerah khusus ibukota jakarta":"dki jakarta",
    "yogyakarta":"daerah istimewa yogyakarta",
    "daerah istimewa yogyakarta":"daerah istimewa yogyakarta",
    "bangka belitung":"kepulauan bangka belitung",
    "kepulauan bangka belitung":"kepulauan bangka belitung",
}
def norm_prov(s):
    n = re.sub(r"\s+", " ", s.lower()).strip()
    return PROV_ALIAS.get(n, n)

# Wiki-spelling → boundary-spelling. Post-norm keys.
KAB_ALIAS = {
    "kab:timur tengah utara": "kab:timor tengah utara",
    "kab:pangkajene dan kepulauan": "kab:pangkajene kepulauan",
    "kota:baubau": "kota:bau bau",
    "kota:pangkalpinang": "kota:pangkal pinang",
    "kota:palangka raya": "kota:palangkaraya",
    "kota:tanjungpinang": "kota:tanjung pinang",
    "kota:tanjungbalai": "kota:tanjung balai",
    "kab:fakfak": "kab:fak fak",
    "kab:mukomuko": "kab:muko muko",
    "kab:tolitoli": "kab:toli toli",
    # Papua Pegunungan (whole province) — Wikipedia sometimes uses different spellings
    "kab:gunung kidul": "kab:gunungkidul",
}

# --- polygon simplify (RDP) --------------------------------------------------

def rdp_indices(pts, tol):
    n = len(pts)
    if n < 3: return list(range(n))
    keep = [False]*n
    keep[0] = True; keep[-1] = True
    stack = [(0, n-1)]
    tol2 = tol*tol
    while stack:
        i, j = stack.pop()
        if j - i < 2: continue
        x1,y1 = pts[i]; x2,y2 = pts[j]
        dx, dy = x2-x1, y2-y1
        denom = dx*dx + dy*dy
        best_d2, best_k = -1.0, -1
        for k in range(i+1, j):
            x0, y0 = pts[k]
            if denom == 0:
                ddx, ddy = x0-x1, y0-y1
                d2 = ddx*ddx + ddy*ddy
            else:
                num = dx*(y1-y0) - (x1-x0)*dy
                d2 = (num*num)/denom
            if d2 > best_d2: best_d2, best_k = d2, k
        if best_d2 > tol2:
            keep[best_k] = True
            stack.append((i, best_k)); stack.append((best_k, j))
    return [k for k in range(n) if keep[k]]

def simplify_ring(ring, tol):
    if len(ring) < 5: return ring
    idx = rdp_indices(ring, tol)
    if idx[-1] != len(ring)-1: idx.append(len(ring)-1)
    return [ring[i] for i in idx]

def simplify_geom(geom, tol):
    if geom["type"] == "Polygon":
        return {"type":"Polygon",
                "coordinates":[[[round(x,4),round(y,4)] for x,y in simplify_ring(r, tol)] for r in geom["coordinates"]]}
    if geom["type"] == "MultiPolygon":
        out = []
        for poly in geom["coordinates"]:
            out.append([[[round(x,4),round(y,4)] for x,y in simplify_ring(r, tol)] for r in poly])
        return {"type":"MultiPolygon","coordinates": out}
    return geom

# --- build kab→keuskupan lookup ----------------------------------------------

print("fetch kabkota.json …")
kabkota = json.loads(fetch(KABKOTA_URL))

# Expand `whole_prov` into individual kab/kota using kabkota.json.
prov_to_kabs = {}   # norm(prov) -> list of raw KAB_KOTA names
for f in kabkota["features"]:
    p = f["properties"]
    prov_to_kabs.setdefault(norm_prov(p["PROVINSI"]), []).append(p["KAB_KOTA"])

# kab_norm -> keuskupan record
lookup = {}
collisions = []
for k in KEUSKUPAN:
    kab_norm_list = []
    for raw_kab in k["kab"]:
        kn = KAB_ALIAS.get(norm(raw_kab), norm(raw_kab))
        kab_norm_list.append(kn)
    for prov in k["whole_prov"]:
        for raw_kab in prov_to_kabs.get(norm_prov(prov), []):
            kn = KAB_ALIAS.get(norm(raw_kab), norm(raw_kab))
            kab_norm_list.append(kn)
    for kn in kab_norm_list:
        if kn in lookup:
            collisions.append((kn, lookup[kn]["nama"], k["nama"]))
        else:
            lookup[kn] = k

if collisions:
    print(f"WARN: {len(collisions)} kabupaten claimed by more than one keuskupan:")
    for kn, a, b in collisions:
        print(f"  {kn}: {a}  vs  {b}")

# --- match against kabkota.json ---------------------------------------------

feats = []
unmatched_kab = []
for f in kabkota["features"]:
    p = f["properties"]
    kn = norm(p["KAB_KOTA"])
    k = lookup.get(kn)
    if not k:
        unmatched_kab.append((p["PROVINSI"], p["KAB_KOTA"]))
        continue
    geom = simplify_geom(f["geometry"], SIMPLIFY_TOL)
    feats.append({
        "type": "Feature",
        "geometry": geom,
        "properties": {
            "kab":       p["KAB_KOTA"],
            "prov":      p["PROVINSI"],
            "keuskupan": k["nama"],
            "provg":     k["prov_gerejawi"],  # provinsi gerejawi (color key)
            "status":    k["status"],
            "berdiri":   k["berdiri"],
            "uskup":     k["uskup"],
            "usejak":    k["uskup_sejak"],
            "katedral":  k["katedral"],
        },
    })

print(f"matched {len(feats)}/{len(kabkota['features'])} kabupaten to keuskupan")

# Warn about wiki-listed kabupaten that never matched a polygon
wiki_norms = set()
for k in KEUSKUPAN:
    for raw_kab in k["kab"]:
        wiki_norms.add(KAB_ALIAS.get(norm(raw_kab), norm(raw_kab)))
boundary_norms = {norm(f["properties"]["KAB_KOTA"]) for f in kabkota["features"]}
missing = sorted(wiki_norms - boundary_norms)
if missing:
    print(f"WARN: {len(missing)} wiki kabupaten not found in boundary file:")
    for m in missing:
        print(f"  {m}")

if unmatched_kab:
    print(f"note: {len(unmatched_kab)} kabupaten unassigned (no Catholic diocesan coverage per wiki)")

# --- write output ------------------------------------------------------------

# Distinct keuskupan actually reached
seen_keu = {f["properties"]["keuskupan"] for f in feats}
seen_provg = {f["properties"]["provg"] for f in feats}

fc = {
    "type": "FeatureCollection",
    "generated":    date.today().isoformat(),
    "sumber":       "id.wikipedia.org/wiki/Daftar_keuskupan_di_Indonesia + halaman masing-masing keuskupan",
    "keuskupan_count":  len(seen_keu),
    "provinsi_gerejawi_count": len(seen_provg),
    "kabupaten_covered": len(feats),
    "features": feats,
}
OUT_GEO.parent.mkdir(parents=True, exist_ok=True)
OUT_GEO.write_text(json.dumps(fc, ensure_ascii=False, separators=(",",":")), encoding="utf-8")
print(f"wrote {OUT_GEO}  ({OUT_GEO.stat().st_size:,} bytes)")
print(f"  {len(seen_keu)} keuskupan, {len(seen_provg)} provinsi gerejawi, {len(feats)} kabupaten polygons")
