#!/usr/bin/env python3
"""Deterministic score for "What if the Philippines powered itself?" (low-poly rebuild).
Low-poly Island grammar (STYLE.md/DEMO.md): everything that arrives lands with a
note — marimba for rises/floors, kalimba for pops, woodblock for roofs/structure.
D-major pentatonic, rising across the 90 s build. Warm swell at 50 s (the grid),
resolve 80-90 s. Numpy + stdlib only.

Arrival times mirror world.js (deterministic constants, duplicated here so the
GitHub runner needs no browser).
Run: python3 make-music.py <out.wav>
"""
import sys, wave
import numpy as np

SR = 44100
DUR = 90.0
N = int(SR * DUR)
rng = np.random.default_rng(20261104)

# MIDI note helper
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)

# D major pentatonic ladder, rising with the build
PENTA = [50, 52, 54, 57, 59, 62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86]  # D3..D6-ish

# (time, kind) — kind: rise/floor/pop/roof/window/wire
EV = [
    (6.0, 'pop'), (9.0, 'floor'), (9.6, 'pop'), (10.4, 'floor'), (11.0, 'floor'),
    (11.8, 'floor'), (12.0, 'pop'), (12.3, 'roof'), (12.8, 'rise'),
    (22.0, 'pop'), (22.6, 'pop'), (26.0, 'pop'), (26.8, 'pop'),
    (30.0, 'pop'), (36.0, 'floor'), (36.4, 'floor'), (36.8, 'floor'), (37.2, 'rise'),
    (38.5, 'floor'), (39.0, 'pop'), (39.2, 'floor'), (39.7, 'pop'), (39.9, 'floor'), (40.4, 'pop'),
    (42.0, 'pop'), (42.3, 'pop'), (42.6, 'pop'), (42.9, 'pop'), (43.2, 'pop'), (43.5, 'pop'),
    (43.8, 'pop'), (44.1, 'pop'),
    (51.0, 'floor'), (51.5, 'floor'), (51.9, 'roof'), (52.0, 'window'), (52.5, 'wire'),
    (53.0, 'floor'), (53.4, 'roof'), (53.6, 'wire'), (54.0, 'window'), (54.5, 'floor'),
    (54.7, 'wire'), (54.9, 'roof'), (55.0, 'pop'), (56.0, 'window'), (56.5, 'pop'),
    (57.6, 'floor'), (58.0, 'pop'), (58.0, 'window'), (58.0, 'pop'), (60.0, 'window'),
    (62.0, 'window'), (63.0, 'window'), (64.0, 'window'),
]
EV.sort(key=lambda e: e[0])

def adsr(n, a, d, s, r):
    e = np.ones(n)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nd: e[na:na + nd] = np.linspace(1, s, nd)
    if nr: e[-nr:] = np.linspace(e[-nr - 1] if n - nr - 1 >= 0 else s, 0, nr)
    return e

def marimba(midi, t0, dur=0.5, gain=0.5):
    f = mf(midi); n = int(dur * SR); tt = np.arange(n) / SR
    # marimba-ish: sine + 4th harmonic + 10th, fast decay
    y = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9)
         + 0.35 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 22)
         + 0.12 * np.sin(2 * np.pi * f * 9.2 * tt) * np.exp(-tt * 30))
    y *= adsr(n, 0.004, 0.05, 0.4, 0.25)
    return t0, y * gain

def kalimba(midi, t0, dur=0.4, gain=0.34):
    f = mf(midi); n = int(dur * SR); tt = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * tt) * np.exp(-tt * 14)
         + 0.25 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 26))
    y *= adsr(n, 0.003, 0.04, 0.3, 0.2)
    return t0, y * gain

def woodblock(t0, dur=0.16, gain=0.4, hi=False):
    f = 1180 if hi else 840; n = int(dur * SR); tt = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.7 * tt)) * np.exp(-tt * 55)
    return t0, y * gain

def put(out, t0, y):
    i0 = int(t0 * SR); i1 = min(N, i0 + len(y))
    if i0 < N: out[i0:i1] += y[:i1 - i0]

out = np.zeros(N)
# arrival notes: rising pentatonic across the event order
for i, (t0, kind) in enumerate(EV):
    note = PENTA[min(i * (len(PENTA) - 1) // max(len(EV) - 1, 1), len(PENTA) - 1)]
    if kind in ('rise', 'floor'): t_, y = marimba(note, t0)
    elif kind == 'pop': t_, y = kalimba(note + 12, t0)
    elif kind == 'roof': t_, y = woodblock(t0, hi=True); put(out, t_, y); t_, y = marimba(note, t0 + 0.02, gain=0.35)
    elif kind == 'window': t_, y = kalimba(note + 12, t0, gain=0.22)
    else: t_, y = woodblock(t0)
    put(out, t_, y)

# soft shaker pulse, 8ths at 96 BPM from 8 s to 80 s (drops out for the resolve)
bpm, beat = 96, 60 / 96
tt = 8.0
while tt < 80:
    n = int(0.09 * SR); seg = rng.standard_normal(n) * np.exp(-np.arange(n) / (0.02 * SR))
    seg *= 0.05 * (0.4 + 0.6 * min(1, (tt - 8) / 40))
    put(out, tt, seg)
    tt += beat / 2

# warm swell at 50 s: low D major pad bloom
def pad(t0, dur, freqs, gain):
    n = int(dur * SR); tt = np.arange(n) / SR; y = np.zeros(n)
    for f in freqs:
        y += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) * np.exp(-((tt - dur / 2) ** 2) / (2 * (dur / 3) ** 2))
    y /= max(len(freqs), 1)
    put(out, t0, y * gain)
pad(48, 14, [mf(38), mf(45), mf(50), mf(54)], 0.10)   # D2 A2 D3 F#3
pad(64, 16, [mf(45), mf(50), mf(57)], 0.07)            # night wonder
pad(80, 10, [mf(50), mf(54), mf(57), mf(62)], 0.09)    # resolve, D major

# gentle master: soft clip + normalize to -3.2 dBFS peak
out = np.tanh(out * 1.1)
out *= 10 ** (-3.2 / 20) / max(np.abs(out).max(), 1e-6)
st = np.stack([out, out])

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1).T * 32767).astype(np.int16).tobytes())
print('wrote', sys.argv[1], 'peak', round(float(np.abs(out).max()), 3))
