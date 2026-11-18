#!/usr/bin/env python3
"""
Procedural Renaissance Chamber Comedy Score + Frame-Locked Foley for `weevil-trial-1587`.
Pure NumPy + soundfile (no external stems or samples).

Outputs 65.0s stereo 44.1 kHz WAV (matching stitch.py pad_dur >= 65):
  0.00 - 30.00s : active film score & foley (smooth fade-out across 29.60..30.00s)
  30.00 - 65.00s : exact zeros (safe pad for stitch.py sidechaincompress)

150 BPM (1 beat = 0.400 s = 12 frames @ 30 fps, 1 bar = 1.600 s = 48 frames)
Includes TWO true full-score dropouts:
  Silence #1: 14.70 - 15.55 s (only dry parchment deed unroll inside pause)
  Silence #2: 23.70 - 24.55 s (pin-drop quiet -> 24.60 s signature PARCHMENT TEAR & BITE CRUNCH!)
"""
import os
import sys
import numpy as np
import soundfile as sf

SR = 44100
FILM_DUR = 30.0
DUR = 65.0
N_FILM = int(FILM_DUR * SR)
N_TOTAL = int(DUR * SR)

BEAT = 0.400   # 150 BPM
BAR = 1.600    # 4/4


def note_hz(midi):
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def karplus_lute(freq, dur, bright=0.68, amp=0.22, seed=0):
    """Crisp Renaissance lute string via damped Karplus-Strong delay loop."""
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float64)
    p = max(4, int(round(SR / freq)))
    rng = np.random.default_rng(seed + int(freq * 10))
    buf = (rng.uniform(-1.0, 1.0, p)) * bright
    # Smooth initial impulse slightly so pick attack sounds woody, not harsh buzz
    buf = 0.5 * buf + 0.5 * np.roll(buf, 1)
    decay = 0.992 - min(0.012, (freq - 150.0) * 1.2e-5)
    pos = 0
    prev = 0.0
    for i in range(n):
        cur = buf[pos]
        out[i] = cur
        nxt = decay * (0.64 * cur + 0.36 * prev)
        prev = cur
        buf[pos] = nxt
        pos = (pos + 1) % p
    fade = min(n // 4, int(0.03 * SR))
    if fade > 0:
        out[-fade:] *= np.linspace(1.0, 0.0, fade)
    out[:min(n, int(0.002 * SR))] *= np.linspace(0.0, 1.0, min(n, int(0.002 * SR)))
    return out * amp


def bassoon_note(freq, dur, amp=0.14):
    """Warm comic woodwind/bassoon note (>= D3 = 146.8 Hz, rich 2nd & 3rd harmonics)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1.0 + 0.003 * np.sin(2 * np.pi * 5.2 * t)
    ph = 2 * np.pi * np.cumsum(freq * vib) / SR
    # Double-reed timbre: fundamental + strong 2nd/3rd harmonics, gentle upper rolloff
    wave = (
        0.52 * np.sin(ph)
        + 0.36 * np.sin(2 * ph + 0.2)
        + 0.20 * np.sin(3 * ph + 0.4)
        + 0.08 * np.sin(4 * ph)
    )
    att = min(n // 3, int(0.032 * SR))
    rel = min(n // 2, int(0.055 * SR))
    env = np.ones(n, dtype=np.float64)
    if att > 0:
        env[:att] = np.linspace(0.0, 1.0, att)
    if rel > 0:
        env[-rel:] = np.linspace(1.0, 0.0, rel)
    return wave * env * amp


def harpsichord_note(freq, dur, amp=0.09):
    """Crisp baroque harpsichord pluck with sparkly 2nd/3rd overtones."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    wave = (
        0.48 * np.sin(ph) * np.exp(-t * 3.8)
        + 0.32 * np.sin(2 * ph) * np.exp(-t * 4.9)
        + 0.22 * np.sin(3 * ph) * np.exp(-t * 6.2)
        + 0.12 * np.sin(4 * ph) * np.exp(-t * 8.0)
    )
    att = min(n // 4, int(0.003 * SR))
    if att > 0:
        wave[:att] *= np.linspace(0.0, 1.0, att)
    fade = min(n // 4, int(0.025 * SR))
    if fade > 0:
        wave[-fade:] *= np.linspace(1.0, 0.0, fade)
    return wave * amp


def woodblock(freq=720.0, dur=0.065, amp=0.14):
    """Crisp hollow wooden temple/court tick."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = (np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * freq * 1.48 * t)) * np.exp(-t * 58.0)
    w[:min(n, 32)] *= np.linspace(0.0, 1.0, min(n, 32))
    return w * amp


def add_stereo(L, R, t0, sig, pan=0.0, gain=1.0):
    s = int(round(t0 * SR))
    if s < 0 or s >= N_FILM or len(sig) == 0:
        return
    e = min(N_FILM, s + len(sig))
    chunk = sig[: e - s] * gain
    gl = np.cos((pan + 1.0) * 0.25 * np.pi)
    gr = np.sin((pan + 1.0) * 0.25 * np.pi)
    L[s:e] += chunk * gl
    R[s:e] += chunk * gr


# ---------------- procedural foley helpers ----------------
def foley_leaf_chomp(seed=1):
    """Crisp wet green-leaf crunch bite for Shot 1."""
    rng = np.random.default_rng(100 + seed)
    dur = 0.24
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0.0, 1.0, n)
    # Two-stage crunch envelope + snappy mid-band resin resonance
    env = (np.exp(-t * 28.0) * (0.65 + 0.35 * np.sin(2 * np.pi * 42 * t))) + 0.75 * np.exp(-((t - 0.045) ** 2) / (2 * 0.015 ** 2))
    # One-pole highpass around 450 Hz to avoid mud
    hp = np.zeros_like(noise)
    a = 0.93
    for i in range(1, n):
        hp[i] = a * (hp[i - 1] + noise[i] - noise[i - 1])
    snap = np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 65.0) * 0.35
    return (hp * env * 0.52 + snap) * 0.68


def foley_parchment_rustle(dur=0.62, amp=0.45, seed=10):
    """Crisp stiff vellum unroll / page turn noise (band-limited crackle + swipe)."""
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    raw = rng.normal(0.0, 1.0, n)
    # Add occasional sharp paper-crease cracks
    clicks = (rng.random(n) > 0.996).astype(np.float64) * rng.uniform(1.5, 3.2, n)
    sig = raw + clicks * 0.65
    # Two cascaded high-passes so parchment sounds airy and light (>= 650 Hz)
    y = np.zeros_like(sig)
    for _ in range(2):
        tmp = np.zeros_like(sig)
        a = 0.91
        for i in range(1, n):
            tmp[i] = a * (tmp[i - 1] + sig[i] - sig[i - 1])
        sig = tmp
    y = sig
    env = np.sin(np.pi * t / dur) ** 0.7 * (0.6 + 0.4 * np.sin(2 * np.pi * 6.5 * t) ** 2)
    return y * env * amp


def foley_gavel_slam(amp=0.78):
    """Oak court gavel bang + brief vaulted nave tail."""
    rng = np.random.default_rng(202)
    dur = 0.48
    n = int(dur * SR)
    t = np.arange(n) / SR
    thud = (np.sin(2 * np.pi * 155 * t * np.exp(-t * 8.0)) * 0.72 + np.sin(2 * np.pi * 240 * t) * 0.38) * np.exp(-t * 24.0)
    crack = rng.normal(0.0, 1.0, n) * np.exp(-t * 95.0) * 0.55
    body = (thud + crack)
    body[:min(n, 24)] *= np.linspace(0.0, 1.0, min(n, 24))
    return body * amp


def foley_stamp_thunk(amp=0.72):
    """Heavy ink court stamp slamming on wood sign ('REJECTED')."""
    rng = np.random.default_rng(303)
    dur = 0.35
    n = int(dur * SR)
    t = np.arange(n) / SR
    thump = (np.sin(2 * np.pi * 135 * t) * 0.65 + np.sin(2 * np.pi * 285 * t) * 0.35) * np.exp(-t * 28.0)
    slap = rng.normal(0.0, 1.0, n) * np.exp(-t * 110.0) * 0.52
    return (thump + slap) * amp


def foley_quill_scratch(dur=1.25):
    """Scratchy goose-feather nib writing 'VERDICT:' on vellum."""
    rng = np.random.default_rng(404)
    n = int(dur * SR)
    t = np.arange(n) / SR
    raw = rng.normal(0.0, 1.0, n)
    hp = np.zeros_like(raw)
    a = 0.85
    for i in range(1, n):
        hp[i] = a * (hp[i - 1] + raw[i] - raw[i - 1])
    # Rhythmic cursive strokes (7 pen strokes in 1.25s)
    strokes = np.maximum(0.0, np.sin(2 * np.pi * 3.1 * t)) ** 1.6
    tone = np.sin(2 * np.pi * 2450 * t) * 0.12 * strokes
    env = np.sin(np.pi * t / dur) ** 0.35
    return (hp * strokes * 0.32 + tone) * env * 0.85


def foley_signature_bite(amp=0.92):
    """SIGNATURE SOUND at 24.60 s: Razor-crisp parchment TEAR + juicy comic CRUNCH."""
    rng = np.random.default_rng(505)
    dur = 0.56
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0.0, 1.0, n)
    # Rapid series of paper fiber rips + crisp resonant snap around 1.2–3.8 kHz
    hp = np.zeros_like(noise)
    a = 0.88
    for i in range(1, n):
        hp[i] = a * (hp[i - 1] + noise[i] - noise[i - 1])
    rip_env = (
        np.exp(-((t - 0.05) ** 2) / (2 * 0.025 ** 2)) * 1.15
        + np.exp(-((t - 0.13) ** 2) / (2 * 0.032 ** 2)) * 0.95
        + np.exp(-((t - 0.22) ** 2) / (2 * 0.045 ** 2)) * 0.65
    )
    tooth = (np.sin(2 * np.pi * 290 * t) * 0.45 + np.sin(2 * np.pi * 1180 * t) * 0.25) * np.exp(-t * 36.0)
    sig = hp * rip_env * 0.95 + tooth
    fade = int(0.04 * SR)
    sig[-fade:] *= np.linspace(1.0, 0.0, fade)
    return sig * amp


def foley_burp_pop(amp=0.45):
    """Tiny cheerful comic weevil burp + squeak pop at 29.00 s."""
    dur = 0.28
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 220.0 + 180.0 * np.exp(-t * 14.0) - 90.0 * t
    w = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * t / dur)
    return w * amp


def build():
    Lm = np.zeros(N_FILM, dtype=np.float64)
    Rm = np.zeros(N_FILM, dtype=np.float64)
    Lf = np.zeros(N_FILM, dtype=np.float64)
    Rf = np.zeros(N_FILM, dtype=np.float64)

    # ---------------- RENAISSANCE SCORE (D Dorian -> D Major Picardy Finale) ----------------
    # Chords per bar (MIDI note roots >= D3 = 50, bright chamber texture, light sub-120 Hz):
    #   Dm (D4 F4 A4) | C (C4 E4 G4) | Bb (Bb3 D4 F4) | A7 (C#4 E4 A4)
    #   Gm (G3 Bb3 D4) | Dm (D4 F4 A4) | C (C4 E4 G4) | A7 (A3 C#4 E4)
    prog_chords = [
        (62, 65, 69), (60, 64, 67), (58, 62, 65), (61, 64, 69),
        (55, 58, 62), (62, 65, 69), (60, 64, 67), (57, 61, 64),
    ]
    prog_bass = [50, 48, 58, 57, 55, 50, 48, 57]  # all >= C3 (130.8 Hz) — zero muddy sub-bass!

    # Melody motifs in D Dorian (8th-note steps inside each 4-beat bar)
    melody_bars = [
        [74, 72, 74, 77, 76, 74, 72, 69],
        [72, 74, 76, 72, 79, 76, 74, 72],
        [70, 72, 74, 70, 77, 74, 72, 70],
        [69, 73, 76, 73, 79, 76, 73, 69],
        [74, 70, 74, 79, 77, 74, 70, 74],
        [74, 72, 74, 77, 76, 74, 72, 69],
        [76, 74, 72, 74, 76, 79, 77, 76],
        [73, 76, 79, 76, 81, 76, 73, 69],
    ]

    # Bars 0..15 cover 0.00 .. 25.60 s; score plays cleanly except during Silence #1 & #2
    def in_silence(t):
        return (14.66 <= t <= 15.54) or (23.66 <= t <= 24.98)

    for b in range(15):
        t_bar = b * BAR
        chord = prog_chords[b % len(prog_chords)]
        bass_m = prog_bass[b % len(prog_bass)]
        mel = melody_bars[b % len(melody_bars)]

        # Bassoon comic bass on beats 1 and 3 (staccato bounce)
        for beat_off, dur_k, gain_b in [(0.0, 0.30, 0.95), (2 * BEAT, 0.28, 0.80)]:
            tb = t_bar + beat_off
            if not in_silence(tb) and tb < 23.70:
                add_stereo(Lm, Rm, tb, bassoon_note(note_hz(bass_m), dur_k, amp=0.14), pan=-0.22, gain=gain_b)

        # Harpsichord / lute arpeggio accompaniment on beats 2 & 4 + crisp lute ostinato on 8th notes
        for step in range(8):
            ts = t_bar + step * (BEAT * 0.5)
            if in_silence(ts) or ts >= 23.65:
                continue
            # Fade gently through bar 14 (22.4..23.65) into Silence #2
            fade_pre = 1.0 if ts < 22.4 else max(0.25, 1.0 - (ts - 22.4) / 1.3)
            m_note = mel[step]
            add_stereo(Lm, Rm, ts, karplus_lute(note_hz(m_note), 0.34, bright=0.66, amp=0.18, seed=b * 10 + step), pan=0.25, gain=fade_pre)
            if step % 2 == 0:
                c_note = chord[(step // 2) % 3]
                add_stereo(Lm, Rm, ts, harpsichord_note(note_hz(c_note), 0.25, amp=0.07), pan=-0.3, gain=fade_pre)
            if b >= 3 and step in (2, 6):
                add_stereo(Lm, Rm, ts, woodblock(780.0 if step == 2 else 660.0, amp=0.075), pan=0.4, gain=fade_pre)

    # Bar 16..18 (25.00 .. 29.75 s): CHEEKY D MAJOR PICARDY THIRD FINALE!
    picardy = [
        (25.10, 74, 0.35), (25.30, 76, 0.32), (25.50, 78, 0.36), (25.70, 81, 0.42),
        (26.10, 78, 0.35), (26.30, 79, 0.35), (26.50, 81, 0.42),
        (26.90, 86, 0.45), (27.30, 81, 0.38), (27.70, 78, 0.38), (28.10, 81, 0.45),
        (28.50, 78, 0.42), (28.90, 74, 0.55),
    ]
    for idx, (tp, mn, d) in enumerate(picardy):
        add_stereo(Lm, Rm, tp, karplus_lute(note_hz(mn), d, bright=0.72, amp=0.21, seed=90 + idx), pan=0.18)
        if idx % 2 == 0:
            add_stereo(Lm, Rm, tp, bassoon_note(note_hz(50 if idx < 8 else 57), 0.28, amp=0.14), pan=-0.2)
    # Final joyful Picardy D Major button chord at 29.22 s
    for mn, pan in [(62, -0.35), (66, 0.0), (69, 0.35), (74, 0.15)]:
        add_stereo(Lm, Rm, 29.22, karplus_lute(note_hz(mn), 0.65, bright=0.76, amp=0.22, seed=mn), pan=pan)
        add_stereo(Lm, Rm, 29.22, harpsichord_note(note_hz(mn), 0.58, amp=0.11), pan=-pan)
    add_stereo(Lm, Rm, 29.22, bassoon_note(note_hz(50), 0.52, amp=0.18), pan=0.0)

    # Smooth score gate across Silence #1 (14.66-15.54) and Silence #2 (23.66-24.98)
    t_grid = np.arange(N_FILM) / SR
    gate = np.ones(N_FILM, dtype=np.float64)
    # Smooth 40ms cosine duck to zero across both silences
    for s0, s1 in [(14.64, 15.52), (23.64, 24.98)]:
        i0, i1 = int(s0 * SR), int(s1 * SR)
        ramp = int(0.045 * SR)
        if i0 > ramp:
            gate[i0 - ramp:i0] = np.linspace(1.0, 0.0, ramp)
        gate[i0:i1] = 0.0
        if i1 + ramp < N_FILM:
            gate[i1:i1 + ramp] = np.linspace(0.0, 1.0, ramp)
    # Smooth final score tail fade 29.60..30.00s
    f0 = int(29.60 * SR)
    gate[f0:] *= np.linspace(1.0, 0.0, N_FILM - f0)
    Lm *= gate
    Rm *= gate

    # ---------------- FRAME-LOCKED PROCEDURAL FOLEY ----------------
    # Shot 1: Giant grape leaf bites (0.35s, 0.90s, 1.55s) + wooden shoe skid + summons snap (3.00s)
    add_stereo(Lf, Rf, 0.35, foley_leaf_chomp(1), pan=0.08, gain=0.82)
    add_stereo(Lf, Rf, 0.92, foley_leaf_chomp(2), pan=-0.10, gain=0.78)
    add_stereo(Lf, Rf, 1.50, foley_leaf_chomp(3), pan=0.06, gain=0.72)
    add_stereo(Lf, Rf, 2.75, foley_parchment_rustle(0.38, amp=0.38, seed=11), pan=-0.15)

    # Shot 2 & 3: Oak court J-cut door latch & heavy GAVEL SLAM at 5.26s, cushion squeak at 7.40s, silk robe swish at 9.72s
    add_stereo(Lf, Rf, 5.26, foley_gavel_slam(0.84), pan=0.0)
    add_stereo(Lf, Rf, 7.45, woodblock(980.0, dur=0.09, amp=0.18), pan=0.12)
    add_stereo(Lf, Rf, 9.75, foley_parchment_rustle(0.45, amp=0.30, seed=12), pan=0.22)

    # Shot 4 — SILENCE #1 prominent unrolling parchment deed (14.80 s)
    add_stereo(Lf, Rf, 14.80, foley_parchment_rustle(0.60, amp=0.68, seed=13), pan=0.0)

    # Shot 5 — Le Grand Feisse inspection & REJECTED stamp slam at 18.60 s
    add_stereo(Lf, Rf, 16.50, woodblock(540.0, dur=0.05, amp=0.16), pan=-0.2)
    add_stereo(Lf, Rf, 17.85, woodblock(1180.0, dur=0.055, amp=0.18), pan=0.15)  # brass loupe clink
    add_stereo(Lf, Rf, 18.60, foley_stamp_thunk(0.82), pan=0.0)

    # Shot 6 — Calendar page flutters (20.45–21.65 s) + Bishop goose quill writing VERDICT: (22.10–23.45 s)
    for idx, tp in enumerate([20.45, 20.82, 21.18, 21.52]):
        add_stereo(Lf, Rf, tp, foley_parchment_rustle(0.32, amp=0.36, seed=20 + idx), pan=(idx - 1.5) * 0.12)
    add_stereo(Lf, Rf, 22.15, foley_quill_scratch(1.25), pan=0.05)

    # SILENCE #2 -> 24.60 s: SIGNATURE BITE CRUNCH & TEAR!
    add_stereo(Lf, Rf, 24.60, foley_signature_bite(0.95), pan=0.0)

    # Ending burp pop at 29.00 s
    add_stereo(Lf, Rf, 29.00, foley_burp_pop(0.42), pan=0.05)

    # High-pass master music+foley cleanly at 80 Hz (prevents 20-120Hz boom) and balance L/R
    def hp80(x):
        y = np.zeros_like(x)
        rc = 1.0 / (2.0 * np.pi * 80.0)
        dt = 1.0 / SR
        alpha = rc / (rc + dt)
        for i in range(1, len(x)):
            y[i] = alpha * (y[i - 1] + x[i] - x[i - 1])
        return y

    L = hp80(Lm * 0.72 + Lf * 0.90)
    R = hp80(Rm * 0.72 + Rf * 0.90)

    # Soft peak ceiling -3.5 dB on music+foley before mix
    pk = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
    if pk > 0.68:
        scale = 0.68 / pk
        L *= scale
        R *= scale

    # Exact zero fade across last 120 ms of 30s film
    tail = int(0.12 * SR)
    ramp = np.linspace(1.0, 0.0, tail)
    L[-tail:] *= ramp
    R[-tail:] *= ramp

    # Pad 30.00..65.00 s with exact zeros for stitch.py
    out = np.zeros((N_TOTAL, 2), dtype=np.float32)
    out[:N_FILM, 0] = L
    out[:N_FILM, 1] = R

    dst = sys.argv[1] if len(sys.argv) > 1 else "/tmp/weevil_tts/music.wav"
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    sf.write(dst, out, SR, subtype="PCM_16")
    print(f"wrote {dst} ({DUR:.1f}s stereo @ {SR}Hz, peak={max(np.max(np.abs(L)), np.max(np.abs(R))):.3f})")


if __name__ == "__main__":
    build()
