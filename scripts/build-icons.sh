#!/usr/bin/env bash
# build-icons.sh — Regenerate the full Tauri icon set from a single SVG.
#
# Usage:
#   ./scripts/build-icons.sh                              # uses src-tauri/icons/arbor.svg
#   ./scripts/build-icons.sh path/to/custom.svg
#
# What it does:
#   1. Renders the SVG to a high-quality 1024×1024 PNG (src-tauri/icons/icon.png).
#   2. Runs `bun tauri icon` to regenerate every size Tauri needs
#      (macOS .icns, Windows .ico, iOS/Android sets, all PNGs).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SVG="${1:-$ROOT/src-tauri/icons/arbor.svg}"
OUT_PNG="$ROOT/src-tauri/icons/icon.png"

[[ -f "$SVG" ]] || { echo "❌ SVG not found: $SVG" >&2; exit 1; }

echo "🌳 Rendering $(basename "$SVG") → 1024×1024 PNG"
if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 1024 -h 1024 "$SVG" -o "$OUT_PNG"
elif command -v magick >/dev/null 2>&1; then
  # -density 2048 supersamples at 2x for crisp downscale
  magick -density 2048 -background none "$SVG" -resize 1024x1024 "$OUT_PNG"
elif command -v convert >/dev/null 2>&1; then
  convert -density 2048 -background none "$SVG" -resize 1024x1024 "$OUT_PNG"
else
  echo "❌ Need one of: rsvg-convert, magick, convert" >&2
  echo "   brew install librsvg   # recommended" >&2
  exit 1
fi

echo "📦 Regenerating Tauri icon set via 'bun tauri icon'"
cd "$ROOT"
bun tauri icon "$OUT_PNG"

echo "✅ All icons updated in src-tauri/icons/"
