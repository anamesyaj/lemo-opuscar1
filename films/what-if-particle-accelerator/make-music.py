#!/usr/bin/env python3
import sys
import wave

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
sr = 44100
n_samples = int(48.5 * sr)
with wave.open(out, "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(b"\x00\x00\x00\x00" * n_samples)
