#!/bin/sh
# Reproducible build script for cadaver-synod-897 (30.0s, 1080x1920 @ 30 fps)
set -e
cd "$(dirname "$0")/../.."
mkdir -p /tmp/cadaver_tts
uv run --with kokoro-onnx --with soundfile --with faster-whisper python3 core/tts/tts.py films/cadaver-synod-897/audio/lines.json /tmp/cadaver_tts
uv run --with faster-whisper python3 core/tts/asr_check.py films/cadaver-synod-897/audio/lines.json /tmp/cadaver_tts
uv run --with soundfile --with numpy python3 films/cadaver-synod-897/build-audio.py
uv run --with soundfile --with numpy python3 films/cadaver-synod-897/make-music.py /tmp/cadaver_tts/music.wav
node core/render/events.mjs films/cadaver-synod-897 --out /tmp/cadaver_tts/events.json
node core/render/readcheck.mjs films/cadaver-synod-897 --q "fastcheck=1"
