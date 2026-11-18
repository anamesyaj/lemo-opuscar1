#!/usr/bin/env python3
"""Synthesize original medieval Roman basilica harpsichord/organ & brass score +
frame-accurate procedural foley for `cadaver-synod-897` (30.0 s active, padded to
65.0 s for GHA stitch.py).
Usage: python3 films/cadaver-synod-897/make-music.py <out_music.wav>"""
import sys
import numpy as np
import soundfile as sf

SR = 44100
FILM_DUR = 30.0
TOTAL_DUR = 65.0
N = int(TOTAL_DUR * SR)
N_FILM = int(FILM_DUR * SR)
rng = np.random.default_rng(897)


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


def pluck(m, dur=0.34, bright=0.56):
    f = midi_hz(m)
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.zeros(n, dtype=np.float32)
    for k in range(1, 8):
        s += (bright ** (k - 1)) * np.sin(2.0 * np.pi * f * k * t) / k
    return (s * env_ad(n, 0.003, dur * 0.44)).astype(np.float32)


def organ_brass(ms, dur=0.42, cutoff=1950):
    if isinstance(ms, (int, float)):
        ms = [ms]
    n = int(dur * SR)
    t = np.arange(n, dtype=np.float32) / SR
    s = np.zeros(n, dtype=np.float32)
    for m in ms:
        f = midi_hz(m)
        vib = 0.0025 * np.sin(2.0 * np.pi * 5.0 * t)
        ph = 2.0 * np.pi * f * t + vib
        for k in [1, 2, 3, 4, 6]:
            s += np.sin(k * ph) / (k ** 1.15)
    a = np.minimum(1.0, t / 0.025) * np.minimum(1.0, np.maximum(0.0, (dur - t) / 0.08))
    out = lp_fft((s * a).astype(np.float32), cutoff) / max(1, len(ms))
    return hp_fft(out, 130)


def drum(kind):
    if kind == "kick":
        n = int(0.26 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        f = 56.0 + 72.0 * np.exp(-t * 32.0)
        sig = np.sin(2.0 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11.0)
        return hp_fft(sig.astype(np.float32), 45)
    if kind == "snare":
        n = int(0.16 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        nz = rng.standard_normal(n).astype(np.float32) * np.exp(-t * 28.0) * 0.62
        body = np.sin(2.0 * np.pi * 190.0 * t) * np.exp(-t * 22.0) * 0.45
        return hp_fft(lp_fft(nz + body, 5200), 220)
    n = int(0.06 * SR)
    t = np.arange(n, dtype=np.float32) / SR
    sig = rng.standard_normal(n).astype(np.float32) * np.exp(-t * 65.0)
    return hp_fft(lp_fft(sig, 4200), 900)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
    buf = np.zeros((N, 2), dtype=np.float32)

    # ---- 1. Mischievous Medieval Courtroom Harpsichord + Pipe Organ Groove (130 BPM) ----
    bpm = 130.0
    beat = 60.0 / bpm
    prog = [
        (50, [62, 65, 69], [74, 77, 76, 74]),  # Dm
        (55, [62, 67, 70], [79, 77, 74, 70]),  # Gm
        (53, [60, 65, 69], [77, 76, 74, 72]),  # F
        (57, [61, 64, 69], [73, 76, 74, 73]),  # A7
    ]

    bar = 0
    tt = 0.0
    while tt < 29.2:
        root, chord, mel = prog[bar % 4]
        place(buf, organ_brass(chord, beat * 3.8, 1750), tt, 0.075, 0.085)
        for b in range(4):
            tb = tt + b * beat
            if tb >= 29.2:
                break
            if b % 2 == 0:
                place(buf, drum("kick"), tb, 0.24, 0.24)
            else:
                place(buf, drum("snare"), tb, 0.18, 0.19)
                if b == 3:
                    place(buf, drum("snare"), tb + beat * 0.5, 0.10, 0.11)
            bass_m = root if b % 2 == 0 else root + 7
            place(buf, pluck(bass_m, 0.34, 0.48), tb, 0.20, 0.20)
            place(buf, pluck(chord[(b + bar) % 3], 0.20, 0.62), tb + beat * 0.5, 0.10, 0.09)
            place(buf, organ_brass(mel[b], beat * 0.42, 2300), tb, 0.075, 0.068)
        bar += 1
        tt += beat * 4.0

    # Triumphant D-major Picardy organ/brass chord button at 29.05 s
    place(buf, organ_brass([50, 57, 62, 66, 69, 74], 0.85, 2300), 29.05, 0.16, 0.16)
    place(buf, drum("kick"), 29.05, 0.26, 0.26)
    place(buf, drum("snare"), 29.05, 0.20, 0.20)

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

    # Silence #1: "trembling young deacon" courtroom hush
    gate_silence(13.05, 13.75)
    # Silence #2: "lost the case" gavel strike pause
    gate_silence(17.30, 18.00)

    # ---- 2. Frame-Accurate Procedural Foley Hits ----
    def whoosh(dur=0.42):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        nz = rng.standard_normal(n).astype(np.float32)
        return (hp_fft(lp_fft(nz, 1800), 280) * (np.sin(np.pi * t / dur) ** 2)).astype(np.float32)

    def gavel_slam(f0=92.0, dur=0.30):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        tone = np.sin(2.0 * np.pi * f0 * t * (1.0 + 0.65 * np.exp(-t * 42.0))) * np.exp(-t * 14.0)
        nz = lp_fft(rng.standard_normal(n).astype(np.float32), 1500) * np.exp(-t * 30.0) * 0.50
        return (tone + nz).astype(np.float32)

    def bone_rattle(dur=0.38):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        s = np.zeros(n, dtype=np.float32)
        for tc, fc in [(0.02, 920.0), (0.11, 1180.0), (0.21, 860.0), (0.29, 1050.0)]:
            m = t >= tc
            tm = t[m] - tc
            s[m] += np.sin(2.0 * np.pi * fc * tm) * np.exp(-tm * 55.0) * 0.42
        return s.astype(np.float32)

    def stone_scrape(dur=0.55):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        nz = hp_fft(lp_fft(rng.standard_normal(n).astype(np.float32), 750), 120)
        env = np.sin(np.pi * t / dur)
        return (nz * env * 0.36).astype(np.float32)

    def chop_pop():
        n = int(0.32 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        swish = hp_fft(lp_fft(rng.standard_normal(n).astype(np.float32), 3200), 600) * np.exp(-t * 35.0) * 0.45
        pop = np.sin(2.0 * np.pi * (420.0 + 480.0 * t) * t) * np.exp(-t * 32.0) * 0.55
        return (swish + pop).astype(np.float32)

    def splash_tiber(dur=0.75):
        n = int(dur * SR)
        t = np.arange(n, dtype=np.float32) / SR
        thud = np.sin(2.0 * np.pi * 80.0 * t) * np.exp(-t * 18.0) * 0.45
        spray = hp_fft(lp_fft(rng.standard_normal(n).astype(np.float32), 2600), 320) * np.exp(-t * 6.5) * 0.45
        return (thud + spray).astype(np.float32)

    def ding_check():
        n = int(0.65 * SR)
        t = np.arange(n, dtype=np.float32) / SR
        s = (
            np.sin(2.0 * np.pi * 1567.98 * t) * np.exp(-t * 5.5)
            + 0.65 * np.sin(2.0 * np.pi * 2093.0 * t) * np.exp(-t * 4.2)
            + 0.35 * np.sin(2.0 * np.pi * 3135.96 * t) * np.exp(-t * 7.0)
        )
        return (s * 0.32).astype(np.float32)

    # Place foley events matching story.js frame cues
    place(buf, whoosh(0.45), 0.70, 0.22, 0.22)           # Hook camera pull-back in Basilica
    place(buf, gavel_slam(95, 0.28), 2.15, 0.32, 0.30)   # Pope Stephen VI slams pulpit ("put his dead")
    place(buf, bone_rattle(0.38), 3.60, 0.28, 0.28)      # Skeleton jaw clack on throne ("on trial")
    place(buf, stone_scrape(0.55), 7.60, 0.30, 0.30)     # Guards slide sarcophagus lid ("dug up his corpse")
    place(buf, bone_rattle(0.38), 9.40, 0.28, 0.28)      # Dressing skeleton in gold mitre ("dressed the skeleton")
    place(buf, gavel_slam(105, 0.24), 11.75, 0.28, 0.28) # Propped on throne thud
    place(buf, bone_rattle(0.38), 13.85, 0.30, 0.30)     # Trembling deacon waves skeleton arm ("young deacon")
    place(buf, gavel_slam(88, 0.32), 17.55, 0.36, 0.36)  # Guilty verdict gavel strike ("lost the case")
    place(buf, chop_pop(), 19.55, 0.36, 0.36)            # Three blessing fingers chop pop ("chopped off")
    place(buf, whoosh(0.42), 20.65, 0.28, 0.28)          # Stripped of gold robes whoosh ("stripped of his title")
    place(buf, splash_tiber(0.75), 23.10, 0.34, 0.34)    # Tossed into Tiber River splash ("Tiber River")
    place(buf, ding_check(), 25.60, 0.34, 0.34)          # Official ban decree ding ("banned putting dead people")

    fade_n = int(0.28 * SR)
    buf[N_FILM - fade_n : N_FILM] *= np.linspace(1.0, 0.0, fade_n, dtype=np.float32)[:, None]
    buf[N_FILM:] = 0.0

    pk = np.max(np.abs(buf)) or 1.0
    buf = (np.tanh((buf / pk) * 2.6) / np.tanh(2.6) * 0.24).astype(np.float32)
    sf.write(out_path, buf, SR)
    print(f"Wrote {out_path} ({TOTAL_DUR}s @ {SR}Hz, peak={np.max(np.abs(buf)):.3f})")


if __name__ == "__main__":
    main()
