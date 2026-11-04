#!/usr/bin/env python3
"""Deterministic synthesized score for the film "What if the Philippines powered itself?"
Satellite Briefing style, 90 s documentary bed. Numpy + stdlib only (no soundfile).

Cue map (treatment):
   0-8   low string drone (D) + sparse piano pulse — orbit, analyst calm
   8-20  drone continues, low pulse on the Bataan lock-on (~14 s, label landing)
  20-50  piano motif develops, gentle forward motion (geothermal -> hydro/solar/wind)
   ~50   single warm swell (the grid lights) — the one big lift, D major warmth
  50-65  warm pad + motif, confident
  65-80  softening, night-bloom wonder
  80-90  resolve to tonic, long tail into silence

Per STYLE.md §7 (analyst register): pulse bass with harmonics, detuned-saw pads
under low-pass, risers for dives. No drums except the soft pulse; no melody that
fights narration — motif is sparse, pentatonic, always under the bed.

Run: TMPDIR=$HOME/tmp python3 make-music.py <out.wav>
"""
import sys
import wave
import numpy as np

SR = 44100
DUR = 90.0
N = int(SR * DUR)
rng = np.random.default_rng(20261104)  # fixed seed -> deterministic

t = np.arange(N) / SR
out = np.zeros((2, N))

# ---- D-centric pitch set ----
D1, D2, A2 = 36.71, 73.42, 110.00
D3, F3S, A3 = 146.83, 185.00, 220.00
D4, E4, F4S, G4, A4, B4 = 293.66, 329.63, 369.99, 392.00, 440.00, 493.88
D5, F5S, A5 = 587.33, 739.99, 880.00
DPENT = [D4, E4, F4S, A4, B4, D5, E4 * 2, F4S * 2, A4 * 2]


def adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nd: e[na:na + nd] = np.linspace(1, s, nd)
    if nr: e[-nr:] = np.linspace(s, 0, nr)
    return e


def lowpass_fft(x, fc):
    """One-pole low-pass via FFT convolution (vectorized, no scipy)."""
    a = 1.0 - np.exp(-2.0 * np.pi * fc / SR)
    b = 1.0 - a
    n = len(x)
    h = a * b ** np.arange(n)
    L = 1 << (2 * n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(h, L), L)[:n]
    return y


def pad_chord(freqs, t0, t1, vol=0.14, fc=1400.0, a=2.2, d=1.0, s=0.85, r=2.5):
    """Detuned-saw pad under a low-pass: two saws +/-4 cents per pitch, 1/h harmonics."""
    n0, n1 = int(t0 * SR), int(t1 * SR)
    if n1 > N: n1 = N
    tt = np.arange(n1 - n0) / SR
    seg = np.zeros(n1 - n0)
    for f in freqs:
        for det in (2 ** (4 / 1200), 2 ** (-4 / 1200)):
            ph = rng.uniform(0, 6.28)
            for h in range(1, 11):
                seg += (1.0 / h) * np.sin(2 * np.pi * f * det * h * tt + ph)
    seg = lowpass_fft(seg, fc)
    seg *= adsr(n1 - n0, a, d, s, r)
    for ch in (0, 1):  # gentle breathing LFO, opposite phase per channel
        lfo = 0.88 + 0.12 * np.sin(2 * np.pi * 0.08 * tt + ch * np.pi)
        out[ch, n0:n1] += vol * seg * lfo / len(freqs)


def piano_note(f, t0, vol=0.20, dur=3.0):
    n0 = int(t0 * SR); nn = int(dur * SR)
    if n0 + nn > N: nn = N - n0
    if nn <= 0: return
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
    if n1 > N: n1 = N
    tt = np.arange(n1 - n0) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt)
    sig = np.sin(2 * np.pi * f * vib * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * vib * tt)
    sig *= adsr(n1 - n0, 1.2, 0.5, 0.8, 1.5)
    out[:, n0:n1] += vol * sig / 1.3


def pulse_hit(f, t0, vol=0.30, dur=2.4):
    """Low pulse bass with harmonics: quick swell, long decay."""
    n0 = int(t0 * SR); nn = int(dur * SR)
    if n0 + nn > N: nn = N - n0
    if nn <= 0: return
    tt = np.arange(nn) / SR
    sig = np.zeros(nn)
    for h, amp in [(1, 1.0), (2, 0.5), (3, 0.25), (4, 0.10)]:
        sig += amp * np.sin(2 * np.pi * f * h * tt)
    env = np.minimum(1.0, tt / 0.06) * np.exp(-tt * 1.8)  # soft attack, slow decay
    out[:, n0:n0 + nn] += vol * sig * env


def riser(t0, t1, vol=0.035, f0=110.0, f1=880.0):
    """Quiet rising sweep into a lift — restrained, never a trailer riser."""
    n0, n1 = int(t0 * SR), int(t1 * SR)
    if n1 > N: n1 = N
    tt = np.arange(n1 - n0) / SR
    dur = (n1 - n0) / SR
    phase = 2 * np.pi * (f0 * tt + (f1 - f0) * tt ** 2 / (2 * dur))
    sig = np.sin(phase) + 0.5 * np.sin(phase * 1.5 + 1.0)
    sig = lowpass_fft(sig, 2400.0)
    sig *= np.linspace(0, 1, n1 - n0) ** 2
    out[:, n0:n1] += vol * sig


# ================= 0-8: drone + sparse piano pulse (orbit, analyst calm) =====
pad_chord([D2, A2, D3], 0.0, 8.0, vol=0.11, fc=1100.0)
piano_note(D3, 1.2, vol=0.14, dur=3.2)
piano_note(A2, 4.4, vol=0.13, dur=3.2)
piano_note(D3, 7.0, vol=0.14, dur=3.2)

# ================= 8-20: drone continues, Bataan lock-on pulse at ~14 ========
pad_chord([D2, A2, D3], 8.0, 20.0, vol=0.11, fc=1100.0)
pulse_hit(D2, 9.5, vol=0.12, dur=2.0)
pulse_hit(D2, 11.75, vol=0.12, dur=2.0)
pulse_hit(D2, 14.0, vol=0.30, dur=2.6)          # the lock-on label landing
piano_note(A3, 14.35, vol=0.16, dur=3.0)        # soft echo after the hit
piano_note(D4, 17.0, vol=0.15, dur=3.0)

# ================= 20-50: motif develops, gentle forward motion ==============
pad_chord([D2, A2, D3, F3S], 20.0, 50.0, vol=0.12, fc=1300.0)  # third enters
MOTIF_A = [0, 2, 4, 3, 5, 4, 2, 1, 0, 3, 5, 6, 5, 3, 2, 0, 4, 3, 2, 1]
tt = 20.5
for i, idx in enumerate(MOTIF_A):
    piano_note(DPENT[idx], tt, vol=0.17)
    tt += float(rng.uniform(1.35, 2.15))
    if tt > 48.5: break
string_note(D4, 30.0, 44.0, vol=0.035)          # faint high string line mid-section
string_note(A3, 30.0, 44.0, vol=0.035)
riser(46.0, 50.0, vol=0.035)                    # quiet lift into the grid moment

# ================= 50: single warm swell — the grid lights ===================
pad_chord([D2, A2, D3, F3S, A3], 50.0, 65.0, vol=0.20, fc=1600.0,
          a=3.0, d=1.0, s=0.9, r=3.5)          # D major warmth
for f in (D4 * 2, A4 * 2, F4S * 2, A5):
    string_note(f, 51.0, 64.0, vol=0.045)       # high strings join the swell
MOTIF_B = [0, 2, 4, 5, 6, 5, 4, 3, 2, 4, 5, 3, 2, 0]
tt = 51.5
for i, idx in enumerate(MOTIF_B):
    piano_note(DPENT[idx], tt, vol=0.19)
    tt += float(rng.uniform(1.15, 1.75))
    if tt > 63.5: break

# ================= 65-80: softening, night-bloom wonder ======================
pad_chord([D2, A2, D3], 65.0, 80.0, vol=0.10, fc=1000.0)
MOTIF_C = [6, 8, 7, 8, 6, 5, 4]
tt = 66.0
for i, idx in enumerate(MOTIF_C):
    piano_note(DPENT[idx], tt, vol=0.12, dur=3.6)
    tt += float(rng.uniform(2.4, 3.8))
    if tt > 79.0: break

# ================= 80-90: resolve to tonic, long tail into silence ===========
pad_chord([D2, D3], 80.0, 90.0, vol=0.09, fc=900.0, a=1.5, d=1.0, s=0.9, r=6.0)
piano_note(D4, 81.0, vol=0.12, dur=6.0)
piano_note(A3, 84.0, vol=0.10, dur=5.0)

# ---- master: long tail to silence, then normalize to -3.2 dBFS -------------
tail = int(5.0 * SR)
out[:, -tail:] *= np.linspace(1, 0, tail)
peak = float(np.abs(out).max())
out *= 10 ** (-3.2 / 20) / max(1e-9, peak)


def write_wav(path):
    pcm = np.clip(out, -1.0, 1.0)
    pcm16 = (pcm * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm16.T.tobytes())


dst = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
write_wav(dst)
final_peak_db = 20 * np.log10(float(np.abs(out).max()) + 1e-12)
print(f"wrote {dst}: {DUR:.1f}s stereo @ {SR}Hz, peak {final_peak_db:.1f} dBFS")
