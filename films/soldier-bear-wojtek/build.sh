#!/bin/sh
# Reproducible local or CI build script for "The Bear That Enlisted in the Polish Army" (Corporal Wojtek, 1942-1944).
# Run from the repository root: sh films/soldier-bear-wojtek/build.sh
set -e

FILM="films/soldier-bear-wojtek"
PY="${PY:-.venv/bin/python}"
if [ ! -x "$PY" ]; then PY="python3"; fi

echo "1. Synthesizing 128 BPM Polish military march + procedural foley..."
"$PY" "$FILM/make-music.py" /tmp/wojtek_music.wav

echo "2. Decoding voice track from committed base64 parts..."
cat "$FILM"/audio/voice.flac.b64.part* | base64 -d > /tmp/wojtek_voice.flac

echo "3. Rendering 960 frames (32.0s @ 30fps, 1080x1920)..."
node core/render/render.mjs "$FILM" --size 1080x1920 --fps 30 --dur 32.0 --q "render=1" --out /tmp/wojtek_silent.mp4

echo "4. Mixing sidechain-ducked score + voice to -14 LUFS and muxing final MP4..."
ffmpeg -y -i /tmp/wojtek_music.wav -i /tmp/wojtek_voice.flac \
  -filter_complex "[1:a]asplit=2[vo][sc];[0:a][sc]sidechaincompress=threshold=0.015:ratio=2.5:attack=15:release=350:makeup=1[duck];[duck][vo]amix=inputs=2:weights='1 1':normalize=0,loudnorm=I=-14:TP=-1.2:LRA=11[out]" \
  -map "[out]" -t 32.0 -c:a pcm_s16le /tmp/wojtek_mix.wav

ffmpeg -y -i /tmp/wojtek_silent.mp4 -i /tmp/wojtek_mix.wav \
  -c:v copy -c:a aac -b:a 192k -movflags +faststart "$FILM/soldier-bear-wojtek.mp4"

echo "Done -> $FILM/soldier-bear-wojtek.mp4"
