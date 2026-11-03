#!/usr/bin/env python3
"""Deterministic calm ambient piano/strings bed for the sleep film.
60 s, 44.1 kHz stereo. 72 BPM ambient. Cue map (treatment §7):
  0-10s  low pad bed only
  0:10   piano motif enters (cycle reveal)
  0:52-60 warm swell, resolve to tonic
Run: python3 tools/make-music.py <out.wav>  (needs numpy)
"""
import sys
import numpy as np

SR = 44100
DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

t = np.arange(N) / SR
out = np.zeros((2, N))

def adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nd: e[na:na + nd] = np.linspace(1, s, nd)
    if nr: e[-nr:] = np.linspace(s, 0, nr)
    return e

def pad_chord(freqs, t0, t1, vol=0.16):
    n0, n1 = int(t0 * SR), int(t1 * SR)
    seg = np.zeros(n1 - n0)
    tt = np.arange(n1 - n0) / SR
    for f in freqs:
        # stacked harmonics with rolloff = warm pad, slight chorus per channel
        for h, amp in [(1, 1.0), (2, 0.35), (3, 0.15), (4, 0.06)]:
            seg += amp * np.sin(2 * np.pi * f * h * tt + rng.uniform(0, 6.28))
    seg *= adsr(n1 - n0, 2.5, 1.0, 0.85, 3.0)
    # gentle breathing LFO, opposite phase per channel
    for ch in (0, 1):
        lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.07 * tt + ch * np.pi)
        out[ch, n0:n1] += vol * seg * lfo / len(freqs)

def piano_note(f, t0, vol=0.22, dur=2.8):
    n0 = int(t0 * SR); nn = int(dur * SR)
    if n0 + nn > N: nn = N - n0
    tt = np.arange(nn) / SR
    sig = np.zeros(nn)
    for h, amp in [(1, 1.0), (2, 0.4), (3, 0.18), (4, 0.08), (5, 0.03)]:
        sig += amp * np.sin(2 * np.pi * f * h * tt)
    sig *= np.exp(-tt * 1.4)
    na = int(0.005 * SR); sig[:na] *= np.linspace(0, 1, na)  # click-free attack
    pan = rng.uniform(0.35, 0.65)
    out[0, n0:n0 + nn] += vol * sig * (1 - pan)
    out[1, n0:n0 + nn] += vol * sig * pan

def string_note(f, t0, t1, vol=0.05):
    n0, n1 = int(t0 * SR), int(t1 * SR)
    tt = np.arange(n1 - n0) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
    sig = np.sin(2 * np.pi * f * vib * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * vib * tt)
    sig *= adsr(n1 - n0, 1.2, 0.5, 0.8, 1.5)
    out[:, n0:n1] += vol * sig / 1.3

# ---- harmony: Am F C G, 7.5 s each, cycling; final 8 s resolve on Am(add9) ----
A2, C3, D3, E3, F2, G2 = 110.0, 130.81, 146.83, 164.81, 87.31, 98.0
A3, B3, C4, D4, E4, F4, G4 = 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0
CHORDS = [
    ([A2, C3, E3], 0.0, 7.5), ([F2, A2, C3], 7.5, 15.0),
    ([C3, E3, G2 * 2], 15.0, 22.5), ([G2, B3 / 2, D3], 22.5, 30.0),
    ([A2, C3, E3], 30.0, 37.5), ([F2, A2, C3], 37.5, 45.0),
    ([C3, E3, G2 * 2], 45.0, 52.0), ([A2, C3, E3, B3], 52.0, 60.0),
]
for freqs, t0, t1 in CHORDS:
    pad_chord(freqs, t0, t1, vol=0.16 if t0 < 52 else 0.22)

# ---- piano motif enters at 0:10: sparse A-minor pentatonic, seeded ----
PENTA = [A3, C4, D4, E4, G4, A3 * 2, C4 * 2]
melody = [0, 2, 4, 3, 5, 4, 2, 1, 2, 4, 6, 5, 3, 2, 1, 0, 2, 3]
tt = 10.0
for i, idx in enumerate(melody):
    piano_note(PENTA[idx], tt, vol=0.20 if tt < 52 else 0.24)
    tt += float(rng.uniform(1.9, 2.6))
    if tt > 57.5: break

# ---- warm swell 52-60: high strings join, pad already louder ----
for f in [A3 * 2, E4 * 2, C4 * 2]:
    string_note(f, 52.0, 60.0, vol=0.045)

# ---- master: gentle fade, normalize to -3 dBFS ----
fade = int(2.5 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade)
out *= 10 ** (-3 / 20) / max(1e-6, np.abs(out).max())

import soundfile as sf
dst = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
sf.write(dst, out.T, SR)
print(f"wrote {dst}: {DUR}s stereo @ {SR}Hz, peak {20*np.log10(np.abs(out).max()):.1f} dBFS")
