#!/usr/bin/env bash
# Build vector tile archives (.pmtiles) for the heavy boundary layers so
# MapLibre can lazy-load only the visible tiles instead of parsing 30+ MB
# of GeoJSON on the main thread.
#
# Requires tippecanoe (Linux/macOS). Windows: use WSL or run in CI.
#   brew install tippecanoe
#   sudo apt-get install tippecanoe
#
# Usage:
#   scripts/build-pmtiles.sh              # rebuild all
#   scripts/build-pmtiles.sh desa         # rebuild one
#
# Output lands in public/boundaries/pmtiles/. Once a *.pmtiles exists,
# switch the layer entry in src/globe/layers.js to use `pmtilesUrl` +
# `sourceLayer` instead of `url`, and mountLayer will serve tiles via the
# pmtiles:// protocol (registered client-side in GlobeView.jsx).
#
# Layer registry field shape once you convert:
#   {
#     id: 'desa',
#     pmtilesUrl: `${BASE}boundaries/pmtiles/desa.pmtiles`,
#     sourceId: 'desa',
#     layers: () => [{ ...spec, source: 'desa', 'source-layer': 'desa' }],
#     hover: ...,
#   }
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN_DIR="$ROOT/public/boundaries"
OUT_DIR="$ROOT/public/boundaries/pmtiles"
mkdir -p "$OUT_DIR"

if ! command -v tippecanoe >/dev/null 2>&1; then
  echo "tippecanoe not found — install first:" >&2
  echo "  brew install tippecanoe        # macOS" >&2
  echo "  sudo apt install tippecanoe    # Debian/Ubuntu" >&2
  exit 1
fi

# per-layer config: input geojson, tippecanoe flags tuned for coverage.
# tuning notes (all sourced from the tippecanoe README):
#   -zN / -ZN  = max/min zoom range
#   --drop-densest-as-needed  = drop features to fit zoom budget
#   --coalesce-densest-as-needed  = merge polygons at low zoom
#   -l NAME    = layer name inside the archive (must match source-layer)
declare -A CFG=(
  [provinsi]="-l provinsi -Z0 -z10 -y WADMPR --coalesce-densest-as-needed"
  [kabkota]="-l kabkota -Z2 -z12 -y WADMKK -y WADMPR --coalesce-densest-as-needed"
  [kecamatan]="-l kecamatan -Z5 -z14 -y WADMKC -y WADMKK -y WADMPR --coalesce-densest-as-needed --drop-densest-as-needed"
  [desa]="-l desa -Z7 -z15 -y WADMKD -y WADMKC -y WADMKK -y WADMPR --drop-densest-as-needed --coalesce-densest-as-needed"
)

layers=("${@:-provinsi kabkota kecamatan desa}")

for slug in ${layers[@]}; do
  flags="${CFG[$slug]-}"
  if [ -z "$flags" ]; then
    echo "unknown layer: $slug (options: ${!CFG[@]})" >&2
    exit 1
  fi
  in="$IN_DIR/$slug.json"
  out="$OUT_DIR/$slug.pmtiles"
  echo ">> tippecanoe $slug -> $out"
  tippecanoe --force -o "$out" $flags "$in"
done

echo "done. next: switch layer entry in src/globe/layers.js to pmtilesUrl."
