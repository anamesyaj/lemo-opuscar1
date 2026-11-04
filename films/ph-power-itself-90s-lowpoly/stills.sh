#!/bin/sh
# stills.sh <t_seconds> <out.png> — render one still for QC.
# Serves ~/workspace/lemo-opuscar-test at 127.0.0.1:8090 (absolute /core + /node_modules imports).
set -e
T="$1"; OUT="$2"
CHROME="${CHROME:-/home/hatch/.cache/ms-playwright/chromium-1194/chrome-linux/chrome}"
export TMPDIR="${TMPDIR:-$HOME/tmp}"
RAW="$(mktemp "$TMPDIR/still_XXXXXX.png")"
"$CHROME" --headless=new --no-sandbox --enable-unsafe-swiftshader \
  --screenshot="$RAW" --window-size=1080,2010 --virtual-time-budget=90000 \
  --hide-scrollbars "http://127.0.0.1:8090/films/ph-power-itself-90s-lowpoly/index.html?t=$T" 2>/dev/null
python3 -c "
from PIL import Image
Image.open('$RAW').crop((0, 0, 1080, 1920)).save('$OUT')
"
rm -f "$RAW"
echo "wrote $OUT"
