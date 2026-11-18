#!/bin/sh
# One-command reproducible build script for `weevil-trial-1587` (1080x1920 @ 30fps, 30.0s).
# For 18-worker parallel GitHub Actions rendering, push to `main` or dispatch `.github/workflows/render.yml`.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to library root"; exit 1; }
cd "$LIB"

PY="$LIB/.venv/bin/python"
mkdir -p "$HERE/out" /tmp/weevil_tts

# 1. Kokoro TTS + Whisper ASR check + mixed voice/score/foley build
"$PY" core/tts/tts.py "$HERE/audio/lines.json" /tmp/weevil_tts
"$PY" core/tts/asr_check.py "$HERE/audio/lines.json" /tmp/weevil_tts --lang en
"$PY" "$HERE/build-audio.py"

# 2. Validate event markers & reading-time check
node core/render/events.mjs "$HERE" --q "render=1"
node core/render/readcheck.mjs "$HERE" --size 1080x1920 --q "render=1&fastcheck=1"

# 3. Render 30fps vertical video + mux at -14 LUFS
node core/render/video.mjs "$HERE" --fps 30 --size 1080x1920 --q "render=1" --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" /tmp/weevil_tts/mix.wav "$HERE/weevil-trial-1587.mp4" 30 0
