#!/usr/bin/env bash
# Thin dispatcher — real logic lives in scripts/build-pmtiles.mjs (Node,
# cross-platform, auto-detects native tippecanoe / WSL / Docker). This
# wrapper exists so `bash scripts/build-pmtiles.sh …` keeps working on
# CI and for muscle memory. All flags pass through unchanged; see
# `node scripts/build-pmtiles.mjs --help` for options.
set -euo pipefail
exec node "$(dirname "$0")/build-pmtiles.mjs" "$@"
