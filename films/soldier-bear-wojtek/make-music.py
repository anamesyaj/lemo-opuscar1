#!/usr/bin/env python3
"""Synthesize original Polish military march score + frame-accurate procedural
foley for `soldier-bear-wojtek` (32.0 s active, padded to 65.0 s for GHA stitch.py).
Usage: python3 films/soldier-bear-wojtek/make-music.py <out_music.wav>"""
import sys
import numpy as np
import soundfile as sf

SR = 44100
FILM_DUR = 32.0
TOTAL_DUR = 65.0
N = int(TOTAL_DUR * SR)
N_FILM = int(FILM_DUR * SR)
rng = np.random.default_rng(22)


def midi_hz(m):
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def lp_fft(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1.0 / SR)
    X *= 1.0 / (1.0 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


def hp_fft(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1.0 / SR)
    X *= 1.0 - 1.0 / (1.0 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x)).astype(np.float32)


def env_ad(n, attack=0.006, decay=0.22):
    t = np.arange(n, dtype=np.float32) / SR
    return np.minimum(1.0, t / max(attack, 1e-4)) * np.exp(-t / max(decay, 1e-3))


def place(buf, sig, t0, gainL=1.0, gainR=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i < 0:
        return
    j = min(len(buf), i + len(sig))
    seg = sig[: j - i]
    buf[i:j, 0] += seg * gainL
    buf[i:j, 1] += seg * gainR


def pluck(m, dur=0.34, bright=0.52):
    f = midi_hz(m)
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.zeros(n, dtype=np.float32)
    for k in range(1, 7):
        s += (bright ** (k - 1)) * np.sin(2.0 * np.pi * f * k * t) / k
    return (s * env_ad(n, 0.004, dur * 0.42)).astype(np.float32)


def brass_note(ms, dur=0.42, cutoff=1950):
    if isinstance(ms, (int, float)):
        ms = [ms]
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.zeros(n, dtype=np.float32)
    for m in ms:
        f = midi_hz(m)
        vib = 0.003 * np.sin(2.0 * np.pi * 5.2 * t)
        ph = 2.0 * np.pi * f * t + vib
        for k in range(1, 8):
            s += np.sin(k * ph) / (k ** 1.25)
    a = np.minimum(1.0, t / 0.03) * np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.09))
    out = lp_fft((s * a).astype(np.float32), cutoff) / max(1, len(ms))
    return hp_fft(out, 130)


def drum(kind):
    if kind == "kick":
        n = int(0.26 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        f = 58.0 + 75.0 * np.exp(-t * 32.0)
        sig = np.sin(2.0 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11.0)
        return hp_fft(sig.astype(np.float32), 45)
    if kind == "snare":
        n = int(0.16 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        nz = rng.standard_normal(n).astype(np.float32) * np.exp(-t * 28.0) * 0.65
        body = np.sin(2.0 * np.pi * 195.0 * t) * np.exp(-t * 22.0) * 0.45
        return hp_fft(lp_fft(nz + body, 5200), 220)
    # rim/tick
    n = int(0.06 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sig = rng.standard_normal(n).astype(np.float32) * np.exp(-t * 65.0)
    return hp_fft(lp_fft(sig, 4200), 900)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
    buf = np.zeros((N, 2), dtype=np.float32)

    # ---- 1. Cheerful / Heroic Polish Military March Groove (128 BPM) ----
    bpm = 128.0
    beat = 60.0 / bpm  # 0.46875 s
    prog = [
        (50, [62, 65, 69], [74, 77, 76, 74]),  # Dm
        (55, [62, 67, 70], [79, 77, 74, 70]),  # Gm
        (57, [61, 64, 69], [76, 77, 76, 73]),  # A
        (50, [62, 65, 69], [74, 69, 74, 74]),  # Dm -> D
    ]

    bar = 0
    tt = 0.0
    while tt < 31.2:
        root, chord, mel = prog[bar % 4]
        # Warm brass pad on bar downbeat
        place(buf, brass_note(chord, beat * 3.8, 1700), tt, 0.075, 0.085)
        for b in range(4):
            tb = tt + b * beat
            if tb >= 31.2:
                break
            # Kick on 1 & 3, crisp march snare on 2 & 4 + ghost snare on 4-and
            if b % 2 == 0:
                place(buf, drum("kick"), tb, 0.24, 0.24)
            else:
                place(buf, drum("snare"), tb, 0.18, 0.19)
                if b == 3:
                    place(buf, drum("snare"), tb + beat * 0.5, 0.10, 0.11)
            # Plucked bass (kept at MIDI >= 50 so low end stays clean)
            bass_m = root if b % 2 == 0 else root + 7
            place(buf, pluck(bass_m, 0.34, 0.48), tb, 0.20, 0.20)
            # Offbeat chord pluck
            place(buf, pluck(chord[(b + bar) % 3], 0.20, 0.58), tb + beat * 0.5, 0.10, 0.09)
            # Light melodic brass/accordion motif
            place(buf, brass_note(mel[b], beat * 0.42, 2200), tb, 0.075, 0.068)
        bar += 1
        tt += beat * 4.0

    # Triumphant D-major Picardy brass chord button at 31.05 s
    place(buf, brass_note([50, 57, 62, 66, 69, 74], 0.85, 2300), 31.02, 0.16, 0.16)
    place(buf, drum("kick"), 31.02, 0.26, 0.26)
    place(buf, drum("snare"), 31.02, 0.20, 0.20)

    # Apply the two mandatory narrative silences (smooth cosine gates)
    def gate_silence(t_a, t_b):
        ia = int(t_a * SR)
        ib = int(t_b * SR)
        ramp_n = int(0.06 * SR)
        buf[ia:ib] *= 0.02
        if ia > ramp_n:
            w = np.linspace(1.0, 0.02, ramp_n, dtype=np.float32)[:, None]
            buf[ia - ramp_n : ia] *= w
        if ib + ramp_n < N:
            w = np.linspace(0.02, 1.0, ramp_n, dtype=np.float32)[:, None]
            buf[ib : ib + ramp_n] *= w

    # Silence #1: Port ban ("banned pets")
    gate_silence(11.65, 12.45)
    # Silence #2: Monte Cassino pause before Wojtek lifts the 100-lb crate
    gate_silence(20.30, 21.05)

    # ---- 2. Frame-Accurate Procedural Foley Hits ----
    def whoosh(dur=0.42):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        nz = rng.standard_normal(n).astype(np.float32)
        return (hp_fft(lp_fft(nz, 1800), 280) * (np.sin(np.pi * t / dur) ** 2)).astype(np.float32)

    def thunk(f0=95.0, dur=0.28):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        tone = np.sin(2.0 * np.pi * f0 * t * (1.0 + 0.55 * np.exp(-t * 38.0))) * np.exp(-t * 15.0)
        nz = lp_fft(rng.standard_normal(n).astype(np.float32), 1300) * np.exp(-t * 32.0) * 0.45
        return (tone + nz).astype(np.float32)

    def whistle_pea(dur=0.45):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        mod = 1.0 + 0.03 * np.sin(2.0 * np.pi * 28.0 * t)
        s = np.sin(2.0 * np.pi * 2650.0 * mod * t) + 0.35 * np.sin(2.0 * np.pi * 5300.0 * mod * t)
        env = np.minimum(1.0, t / 0.015) * np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.06))
        return (s * env * 0.32).astype(np.float32)

    def ding_check():
        n = int(0.65 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        s = (
            np.sin(2.0 * np.pi * 1567.98 * t) * np.exp(-t * 5.5)
            + 0.65 * np.sin(2.0 * np.pi * 2093.0 * t) * np.exp(-t * 4.2)
            + 0.35 * np.sin(2.0 * np.pi * 3135.96 * t) * np.exp(-t * 7.0)
        )
        return (s * 0.32).astype(np.float32)

    def cannon_boom():
        dur = 1.15
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        boom = np.sin(2.0 * np.pi * (52.0 + 60.0 * np.exp(-t * 18.0)) * t) * np.exp(-t * 4.5) * 0.9
        blast = lp_fft(rng.standard_normal(n).astype(np.float32), 950) * np.exp(-t * 5.2) * 0.85
        return hp_fft((boom + blast).astype(np.float32), 42)

    def bottle_pop_gulp():
        n = int(0.55 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        pop = np.sin(2.0 * np.pi * (380.0 + 520.0 * t) * t) * np.exp(-t * 38.0)
        gulp1 = np.sin(2.0 * np.pi * 260.0 * np.maximum(0, t - 0.18)) * np.exp(-np.maximum(0, t - 0.18) * 26.0) * (t > 0.18)
        gulp2 = np.sin(2.0 * np.pi * 290.0 * np.maximum(0, t - 0.34)) * np.exp(-np.maximum(0, t - 0.34) * 26.0) * (t > 0.34)
        return ((pop + 0.6 * gulp1 + 0.6 * gulp2) * 0.45).astype(np.float32)

    def truck_chug_and_toot(dur=2.4):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        pulse = (0.5 + 0.5 * np.sin(2.0 * np.pi * 13.5 * t)) * lp_fft(rng.standard_normal(n).astype(np.float32), 420)
        env = np.minimum(1.0, t / 0.25) * np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.35))
        chug = hp_fft(pulse * env * 0.38, 65)
        # Double cheerful vintage horn toot ("a-ooga / beep-beep")
        for t_h in [0.55, 0.78]:
            m = (t >= t_h) & (t < t_h + 0.15)
            th = t[m] - t_h
            horn = (np.sin(2.0 * np.pi * 440.0 * th) + 0.7 * np.sin(2.0 * np.pi * 554.37 * th) + 0.4 * np.sin(2.0 * np.pi * 880.0 * th)) * np.sin(np.pi * th / 0.15)
            chug[m] += horn * 0.16
        return chug.astype(np.float32)

    # Place foley events matching story.js frame cues
    place(buf, whoosh(0.45), 0.75, 0.22, 0.22)          # Hook camera pull-back
    place(buf, thunk(140, 0.18), 1.56, 0.25, 0.22)      # Crisp bear salute snap
    place(buf, bottle_pop_gulp(), 6.05, 0.28, 0.25)     # Cub feeding bottle ("cub")
    place(buf, thunk(135, 0.18), 8.58, 0.22, 0.24)      # Camp salute snap ("salute,")
    place(buf, thunk(85, 0.28), 9.25, 0.28, 0.28)       # Playful wrestle thud ("wrestle,")
    place(buf, bottle_pop_gulp(), 9.85, 0.32, 0.30)     # Beer bottle chug ("drink beer.")
    place(buf, whistle_pea(0.42), 11.75, 0.32, 0.28)    # British port inspector whistle (in Silence #1!)
    place(buf, thunk(110, 0.24), 12.15, 0.28, 0.28)     # "NO PETS" sign tap
    place(buf, thunk(90, 0.30), 14.75, 0.34, 0.34)      # Polish officer stamps paybook ("drafted")
    place(buf, ding_check(), 16.35, 0.32, 0.32)         # Green checkmark badge pop ("real private")
    place(buf, whoosh(0.42), 18.45, 0.28, 0.28)         # 6-frame flash transition to Monte Cassino
    place(buf, cannon_boom(), 19.70, 0.38, 0.38)        # Howitzer blast at Monte Cassino ("cannons roared")
    place(buf, thunk(75, 0.32), 22.75, 0.30, 0.30)      # Wojtek hoists 100-lb ammo crate ("hauling heavy")
    place(buf, thunk(68, 0.36), 24.35, 0.34, 0.34)      # Wojtek sets heavy crate down by gun
    place(buf, ding_check(), 28.30, 0.34, 0.34)         # Corporal chevron promotion badge ding ("Corporal")
    place(buf, truck_chug_and_toot(2.35), 29.20, 0.28, 0.28)  # 22nd Supply Co. emblem truck rolls past

    # Smooth fade-out before 32.0 s, exact zeros 32.0..65.0 s
    fade_n = int(0.28 * SR)
    buf[N_FILM - fade_n : N_FILM] *= np.linspace(1.0, 0.0, fade_n, dtype=np.float32)[:, None]
    buf[N_FILM:] = 0.0

    # Soft-knee limit transients so sidechain mix with voice hits -14 LUFS in linear mode
    pk = np.max(np.abs(buf)) or 1.0
    buf = (np.tanh((buf / pk) * 2.6) / np.tanh(2.6) * 0.24).astype(np.float32)
    sf.write(out_path, buf, SR)
    print(f"Wrote {out_path} ({TOTAL_DUR}s @ {SR}Hz, peak={np.max(np.abs(buf)):.3f})")


if __name__ == "__main__":
    main()
