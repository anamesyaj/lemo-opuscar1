#!/bin/sh
# One-command local build for `what-if-drop-of-lava` (9:16 1080x1920 @ 30 fps)
# For parallel 18-worker cloud rendering, push to `main` or dispatch `.github/workflows/render.yml`.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"

PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out" /tmp/lava_tts

# 1. Voiceover + Whisper ASR verification + master audio & .srt subtitles
"$PY" core/tts/tts.py "$HERE/audio/lines.json" /tmp/lava_tts
"$PY" core/tts/asr_check.py "$HERE/audio/lines.json" /tmp/lava_tts --lang en
base64 -w 0 "$LIB/core/fonts/f3.woff2" > /tmp/fredoka_b64.txt
"$PY" "$HERE/build-audio.py"

# 2. Bundle self-contained HTML player & verify events + reading times
"$PY" "$HERE/bundle.py"
node core/render/events.mjs "$HERE" --q 'render=1'
node core/render/readcheck.mjs "$HERE" --size 1080x1920 --q 'render=1&fastcheck=1'

# 3. Render 1080x1920 @ 30 fps frames and master to -14 LUFS
node core/render/video.mjs "$HERE" --fps 30 --size 1080x1920 --q 'render=1' --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" /tmp/lava_tts/mix.wav "$HERE/what-if-drop-of-lava.mp4" 30 0
