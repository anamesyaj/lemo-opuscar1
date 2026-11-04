#!/bin/sh
# stills.sh <t_seconds> <out.png> — render one still for QC.
# Uses a 1080x2010 window because headless Chromium's --window-size includes
# ~90 px of browser chrome; the shot is cropped to the 1080x1920 page.
# Requires: the film folder served at http://127.0.0.1:8090/ (python3 -m http.server 8090)
# Env: TMPDIR=$HOME/tmp, CHROME=<chromium binary> (default: playwright chromium-1194)
set -e
T="$1"; OUT="$2"
CHROME="${CHROME:-/home/hatch/.cache/ms-playwright/chromium-1194/chrome-linux/chrome}"
TMPDIR="${TMPDIR:-$HOME/tmp}"
export TMPDIR
RAW="$(mktemp "$TMPDIR/still_XXXXXX.png")"
"$CHROME" --headless=new --no-sandbox --enable-unsafe-swiftshader \
  --screenshot="$RAW" --window-size=1080,2010 --virtual-time-budget=60000 \
  --hide-scrollbars "http://127.0.0.1:8090/index.html?t=$T" 2>/dev/null
python3 -c "
from PIL import Image
Image.open('$RAW').crop((0, 0, 1080, 1920)).save('$OUT')
"
rm -f "$RAW"
echo "wrote $OUT"
