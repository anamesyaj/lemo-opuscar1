#!/usr/bin/env python3
"""Original 120 BPM score + frame-locked procedural foley for `what-if-drop-of-lava`.

Uses ONLY numpy + soundfile so it runs identically locally and inside `.github/workflows/render.yml` (stitch job).
Timeline (60.0 s, padded to 65.0 s for stitch.py sidechain tail):
  0.00 -  3.30  Beat 1: Hook — tong click (0.20s), molten stretch hum, sparse tense D-minor mallet
  3.30 - 10.20  Beat 2: 1,200°C vs 100°C — kettle boil (3.6s), magma pour (6.2s), 12x bar ticks, 120 BPM marimba groove
 10.20 - 17.00  Beat 3: Sagittal cutaway — J-cut flash-steam burst (9.90s), wet tongue sizzle (11.5s), 1,700x shock whoosh (15.0s)
 17.00 - 23.40  Beat 4: Leidenfrost skate — continuous pressurized vapor hiss (17.2-22.9s), nerve-sear crackle
 23.40 - 30.20  Beat 5: Airway trap — steam rush upward (23.6s), clay tissue swell throb + urgent heartbeat, 16th-note tension build
 30.20 - 36.80  Beat 6: Esophagus crater — sticky silicate snag (31.5s), deep char sizzle (34.8s)
 36.05 - 36.95  SILENCE #1 (0.90s score dropout) + single deep heartbeat at 36.45s before the Turn
 36.80 - 44.10  Beat 7: Myth busted — half-time investigative marimba (37.0s), 3D red X stamp thud (40.3s), 1,000 J drain ticks
 44.10 - 51.40  Beat 8: Stomach quench & Native Move — J-cut acid plunge (43.85s), rapid quench boil,
                        SILENCE #2 (49.45-50.05s hush) -> SHARP OBSIDIAN GLASS CRACK & shard chimes at 50.05s!
 51.40 - 60.00  Beat 9: Bookend verdict — crystalline glass-bell + marimba finale, 3 diagnostic chimes (54.4, 55.3, 56.2s), warm D9 resolve
"""
import sys
import numpy as np
import soundfile as sf

SR = 44100
DUR = 65.0          # 60.0s film + 5.0s clean silence tail for stitch.py pad_dur=65
FILM_DUR = 60.0
N = int(SR * DUR)
rng = np.random.default_rng(20261118)

out = np.zeros((2, N), dtype=np.float64)


def add_stereo(sig, t0, gain=1.0, pan=0.0):
    """Equal-power pan (-1 left .. +1 right) into stereo buffer `out`."""
    s = int(round(t0 * SR))
    if s >= N or len(sig) == 0:
        return
    if s < 0:
        sig = sig[-s:]
        s = 0
    e = min(N, s + len(sig))
    if e <= s:
        return
    seg = sig[:e - s]
    ang = (np.clip(pan, -1.0, 1.0) + 1.0) * (np.pi / 4.0)
    out[0, s:e] += seg * (gain * np.cos(ang))
    out[1, s:e] += seg * (gain * np.sin(ang))


def one_pole_lp(x, cutoff_hz):
    """Pure-numpy 1-pole lowpass filter (no scipy required on stitch runner)."""
    rc = 1.0 / (2.0 * np.pi * max(20.0, cutoff_hz))
    dt = 1.0 / SR
    alpha = dt / (rc + dt)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha * (x[i] - acc)
        y[i] = acc
    return y


def fast_lp(x, win):
    """Fast moving-average lowpass for long noise beds using cumsum."""
    w = max(2, int(win))
    c = np.cumsum(np.insert(x, 0, 0.0))
    return (c[w:] - c[:-w]) / w


def fast_hp(x, win):
    lp = fast_lp(x, win)
    m = len(lp)
    return x[:m] - lp


def fast_bp(x, win_lo, win_hi):
    """Bandpass via difference of two moving averages (fast, click-free, pure numpy)."""
    a = fast_lp(x, win_hi)
    b = fast_lp(x, win_lo)
    m = min(len(a), len(b))
    return a[:m] - b[:m]


def env_ad(n, att_s, dec_tau_s):
    tt = np.arange(n) / SR
    e = np.exp(-tt / max(1e-4, dec_tau_s))
    na = min(n, max(1, int(att_s * SR)))
    e[:na] *= np.linspace(0.0, 1.0, na)
    nr = min(n, max(1, int(0.008 * SR)))
    e[-nr:] *= np.linspace(1.0, 0.0, nr)
    return e


# ============================================================================
# 1. INSTRUMENTS (Woody Marimba, Warm Harmonic Bass, Crystalline Obsidian Bell)
# ============================================================================

def marimba(freq, t0, vel=0.20, pan=0.0, dur=0.55):
    """Woody rosewood marimba bar: fundamental + 4x & 9.2x bar overtones + crisp mallet transient."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * np.pi * freq * tt) * np.exp(-tt / 0.19)
        + 0.34 * np.sin(2 * np.pi * freq * 3.98 * tt) * np.exp(-tt / 0.055)
        + 0.11 * np.sin(2 * np.pi * freq * 9.18 * tt) * np.exp(-tt / 0.020)
        + 0.22 * np.sin(2 * np.pi * freq * 2.0 * tt) * np.exp(-tt / 0.12)
    )
    # Soft yarn-mallet wood click
    n_tr = min(n, int(0.014 * SR))
    click = fast_bp(rng.standard_normal(n_tr + 40), 28, 6)[:n_tr] * np.exp(-np.arange(n_tr) / (0.003 * SR))
    sig[:n_tr] += 0.28 * click
    na = min(n, int(0.003 * SR))
    sig[:na] *= np.linspace(0.0, 1.0, na)
    add_stereo(sig, t0, gain=vel, pan=pan)


def bass_pulse(freq, t0, dur=0.46, vel=0.15):
    """Phone-friendly warm bass (>= MIDI 50 / D3) with strong 2nd & 3rd harmonics, light sub."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = (
        0.55 * np.sin(2 * np.pi * freq * tt)
        + 0.65 * np.sin(2 * np.pi * (freq * 2.0) * tt)
        + 0.32 * np.sin(2 * np.pi * (freq * 3.0) * tt)
        + 0.14 * np.sin(2 * np.pi * (freq * 4.0) * tt)
    ) * env_ad(n, 0.010, 0.24)
    add_stereo(sig, t0, gain=vel, pan=0.0)


def glass_bell(freq, t0, dur=2.2, vel=0.14, pan=0.0):
    """Crystalline volcanic-glass chime (inharmonic glass modes, enters at the Obsidian Turn)."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    vib = 1.0 + 0.0018 * np.sin(2 * np.pi * 5.2 * tt)
    sig = (
        1.00 * np.sin(2 * np.pi * freq * vib * tt) * np.exp(-tt / 1.15)
        + 0.42 * np.sin(2 * np.pi * (freq * 2.51) * tt) * np.exp(-tt / 0.55)
        + 0.24 * np.sin(2 * np.pi * (freq * 4.19) * tt) * np.exp(-tt / 0.28)
        + 0.12 * np.sin(2 * np.pi * (freq * 6.32) * tt) * np.exp(-tt / 0.14)
    )
    na = min(n, int(0.004 * SR))
    sig[:na] *= np.linspace(0.0, 1.0, na)
    add_stereo(sig, t0, gain=vel, pan=pan)


def warm_pad(freqs, t0, t1, vel=0.065):
    """Subtle airy harmonic bed (>= D3) with gentle stereo LFO."""
    n = int((t1 - t0) * SR)
    if n <= 0:
        return
    tt = np.arange(n) / SR
    env = np.ones(n)
    na = min(n // 3, int(0.35 * SR))
    nr = min(n // 3, int(0.45 * SR))
    if na > 0:
        env[:na] = np.linspace(0.0, 1.0, na)
    if nr > 0:
        env[-nr:] = np.linspace(1.0, 0.0, nr)
    for idx, f in enumerate(freqs):
        sig = (
            0.70 * np.sin(2 * np.pi * f * tt + idx)
            + 0.35 * np.sin(2 * np.pi * (f * 2.002) * tt + 2.1 * idx)
            + 0.15 * np.sin(2 * np.pi * (f * 3.0) * tt)
        ) * env / len(freqs)
        pan = -0.35 + 0.70 * (idx / max(1, len(freqs) - 1))
        add_stereo(sig, t0, gain=vel, pan=pan)


# Pitch table (Hz) — D minor / Bb Lydian / D9
D3, F3, G3, A3, Bb3, C4 = 146.83, 174.61, 196.00, 220.00, 233.08, 261.63
D4, E4, F4, G4, A4, Bb4, C5 = 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25
D5, E5, F5, G5, A5, C6, D6 = 587.33, 659.25, 698.46, 783.99, 880.00, 1046.50, 1174.66


def in_silence_window(t):
    """Enforce the two real dramatic silences in the musical score."""
    return (36.02 <= t < 36.98) or (49.42 <= t < 50.06)


# ---- Score Section A (0.0 - 3.3s): Sparse tense hook ticks + heat swell ----
for beat_i, f in enumerate([D4, A4, Bb4, A4, F4, E4]):
    t_hit = 0.25 + beat_i * 0.50
    marimba(f, t_hit, vel=0.14, pan=(-0.25 if beat_i % 2 == 0 else 0.25))
warm_pad([D3, A3, F4], 0.15, 3.25, vel=0.055)

# ---- Score Section B (3.3 - 23.4s): 120 BPM ZackD curiosity marimba groove ----
# 4-bar chord loop: Dm -> Bb -> Gm -> A7sus4
PROGRESSION = [
    (D3, [D4, F4, A4, C5, A4, F4, D5, A4]),
    (Bb3 / 2 * 2, [Bb3, D4, F4, A4, F4, D4, C5, F4]),
    (G3, [G4, Bb4, D5, F4, Bb4, G4, D5, Bb4]),
    (A3, [A4, E4, G4, C5, E5, C5, A4, E4]),
]
t_cursor = 3.50
bar_idx = 0
while t_cursor < 23.25:
    bass_f, arp = PROGRESSION[bar_idx % 4]
    if not in_silence_window(t_cursor):
        bass_pulse(bass_f, t_cursor, dur=0.45, vel=0.12)
        bass_pulse(bass_f, t_cursor + 1.0, dur=0.45, vel=0.10)
    for step_i, note_f in enumerate(arp):
        nt = t_cursor + step_i * 0.25
        if nt >= 23.35 or in_silence_window(nt):
            continue
        acc = 0.145 if step_i in (0, 3, 6) else 0.095
        marimba(note_f, nt, vel=acc, pan=0.32 * np.sin(step_i * 1.3))
    t_cursor += 2.0
    bar_idx += 1

# ---- Score Section C (23.4 - 36.02s): Airway & Esophagus 16th-note urgency build ----
URGENT_CHORDS = [
    (D3, [D4, F4, A4, Bb4]),
    (C4 / 2 * 2, [C4, E4, G4, Bb4]),
    (Bb3, [Bb3, D4, F4, A4]),
    (A3, [A3, E4, G4, 277.18]),  # A7 (C-sharp-4 = 277.18 Hz)
]
t_cursor = 23.50
bar_idx = 0
while t_cursor < 36.00:
    bass_f, notes = URGENT_CHORDS[bar_idx % 4]
    if t_cursor + 0.4 < 36.02:
        bass_pulse(bass_f, t_cursor, dur=0.38, vel=0.135)
        if t_cursor + 1.0 < 36.02:
            bass_pulse(bass_f, t_cursor + 1.0, dur=0.38, vel=0.125)
    # 16th-note pulse during Beat 5 (airway closing), easing to tense 8ths in Beat 6
    subdiv = 0.125 if t_cursor < 30.2 else 0.25
    steps = int(round(2.0 / subdiv))
    for s_i in range(steps):
        nt = t_cursor + s_i * subdiv
        if nt >= 36.00 or in_silence_window(nt):
            continue
        nf = notes[(s_i + bar_idx) % 4] * (2.0 if s_i % 4 == 3 else 1.0)
        vel = 0.115 if s_i % 2 == 0 else 0.070
        marimba(nf, nt, vel=vel, pan=0.38 * ((-1) ** s_i))
    t_cursor += 2.0
    bar_idx += 1

# [36.02 - 36.98s: SILENCE #1 — complete musical dropout before the myth-busting turn!]

# ---- Score Section D (37.00 - 49.42s): Investigative half-time myth-busting groove ----
TURN_PROG = [
    (Bb3, [F4, A4, C5, D5]),
    (F3, [C4, F4, A4, C5]),
    (G3, [D4, G4, Bb4, D5]),
    (A3, [E4, A4, C5, E5]),
]
t_cursor = 37.00
bar_idx = 0
while t_cursor < 49.40:
    bass_f, chord = TURN_PROG[bar_idx % 4]
    if not in_silence_window(t_cursor):
        bass_pulse(bass_f, t_cursor, dur=0.65, vel=0.115)
    warm_pad(chord[:3], t_cursor, min(49.40, t_cursor + 1.95), vel=0.050)
    for k_i, nf in enumerate(chord):
        nt = t_cursor + k_i * 0.50
        if nt >= 49.40 or in_silence_window(nt):
            continue
        marimba(nf, nt, vel=0.125, pan=-0.28 + 0.18 * k_i)
    t_cursor += 2.0
    bar_idx += 1

# [49.42 - 50.06s: SILENCE #2 — instrumental hush right as molten lava freezes black!]

# ---- Score Section E (50.06 - 60.0s): Crystalline Obsidian Glass + Marimba Finale ----
# Immediate shimmering glass-bell chord blooming out of the 50.05s obsidian shatter!
for idx, gf in enumerate([D5, A5, E5, F5, C6, D6]):
    glass_bell(gf, 50.08 + idx * 0.06, dur=2.6, vel=0.125, pan=-0.45 + 0.18 * idx)

FINALE_PROG = [
    (D3, [D4, A4, E5, F5]),
    (Bb3, [Bb4, F4, C5, D5]),
    (F3, [F4, C5, E5, A5]),
    (A3, [E4, A4, C5, E5]),
]
t_cursor = 51.50
bar_idx = 0
while t_cursor < 58.0:
    bass_f, notes = FINALE_PROG[bar_idx % 4]
    bass_pulse(bass_f, t_cursor, dur=0.55, vel=0.12)
    for s_i, nf in enumerate(notes):
        nt = t_cursor + s_i * 0.40
        if nt < 58.2:
            marimba(nf, nt, vel=0.115, pan=0.3 * np.cos(s_i))
            if s_i % 2 == 0:
                glass_bell(nf * 2.0, nt, dur=1.4, vel=0.065, pan=-0.3 * np.cos(s_i))
    t_cursor += 1.60
    bar_idx += 1

# Final warm D minor-add9 resolve chord at 58.10 - 60.00s
warm_pad([D3, A3, E4, F4, A4], 58.05, 59.95, vel=0.085)
for idx, gf in enumerate([D5, F5, A5, E5]):
    glass_bell(gf, 58.10 + idx * 0.05, dur=1.85, vel=0.095, pan=-0.3 + 0.2 * idx)


# ============================================================================
# 2. PROCEDURAL FOLEY & AMBIENCE (Every Row of TREATMENT.md §8 Sound Table!)
# ============================================================================

def foley_tong_click(t0):
    """Crisp stainless-steel tong release click."""
    n = int(0.08 * SR)
    tt = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * 3150 * tt) * np.exp(-tt / 0.010)
        + 0.7 * np.sin(2 * np.pi * 4820 * tt) * np.exp(-tt / 0.006)
        + 0.5 * fast_hp(rng.standard_normal(n + 20), 8)[:n] * np.exp(-tt / 0.003)
    )
    add_stereo(sig, t0, gain=0.22, pan=0.05)


def foley_molten_stretch(t0, dur=1.4, gain=0.12):
    """Low incandescent magma radiant hum + viscous taffy stretch."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f_glide = 95.0 - 22.0 * (tt / dur)
    hum = (np.sin(2 * np.pi * np.cumsum(f_glide) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f_glide) / SR))
    crackle = fast_bp(rng.standard_normal(n + 60), 45, 10)[:n] * (rng.random(n) > 0.985) * 4.0
    env = np.sin(np.pi * tt / dur) ** 1.2
    add_stereo((0.65 * hum + 0.35 * crackle) * env, t0, gain=gain, pan=0.0)


def foley_kettle_boil(t0, dur=2.2):
    """100°C mug gentle water bubble."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    sig = fast_bp(rng.standard_normal(n + 80), 55, 16)[:n] * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * tt))
    for b_i in range(9):
        bt = int((b_i / 9.0) * (n - int(0.08 * SR)))
        bn = int(0.06 * SR)
        btt = np.arange(bn) / SR
        pop = np.sin(2 * np.pi * (420 + 600 * (btt / 0.06)) * btt) * np.exp(-btt / 0.018)
        sig[bt:bt + bn] += 0.5 * pop
    add_stereo(sig * np.sin(np.pi * tt / dur), t0, gain=0.11, pan=-0.45)


def foley_steam_burst(t0, dur=1.6, gain=0.24, pan=0.0):
    """Violent flash-vaporization hiss (1,700x expansion / J-cut transition)."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    raw = rng.standard_normal(n + 50)
    hiss = 0.65 * fast_hp(raw, 7)[:n] + 0.55 * fast_bp(raw, 28, 6)[:n]
    sizzle_mod = 0.78 + 0.22 * np.sin(2 * np.pi * 34.0 * tt)
    env = np.minimum(1.0, tt / 0.04) * np.exp(-tt / (dur * 0.52))
    thump = np.sin(2 * np.pi * (130 * np.exp(-tt / 0.12)) * tt) * np.exp(-tt / 0.09)
    add_stereo(hiss * sizzle_mod * env + 0.45 * thump, t0, gain=gain, pan=pan)


def foley_leidenfrost_skate(t0, dur=5.2):
    """High-pitched airy vapor-cushion hover glide + nerve-sear micro-crackles."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    raw = rng.standard_normal(n + 40)
    airy = fast_hp(raw, 5)[:n] * (0.7 + 0.3 * np.sin(2 * np.pi * 7.5 * tt))
    whistle = 0.18 * np.sin(2 * np.pi * (2100 + 280 * np.sin(2 * np.pi * 1.4 * tt)) * tt)
    sparks = (rng.random(n) > 0.996).astype(float) * rng.uniform(0.4, 1.0, n)
    sparks = fast_lp(sparks, 4)
    sparks = np.pad(sparks, (0, max(0, n - len(sparks))))[:n]
    env = np.sin(np.pi * tt / dur) ** 0.7
    pan_sweep = np.linspace(0.35, -0.35, n)
    # Apply smoothly across stereo
    s = int(round(t0 * SR))
    e = min(N, s + n)
    seg = (0.55 * airy + whistle + 1.4 * sparks)[:e - s] * env[:e - s] * 0.11
    ang = (pan_sweep[:e - s] + 1.0) * (np.pi / 4.0)
    out[0, s:e] += seg * np.cos(ang)
    out[1, s:e] += seg * np.sin(ang)


def foley_heartbeat(t0, gain=0.28):
    """Deep anatomical lub-dub heartbeat."""
    for dt, f0, g in [(0.0, 68.0, 1.0), (0.23, 58.0, 0.72)]:
        n = int(0.22 * SR)
        tt = np.arange(n) / SR
        # Include 2nd harmonic (116-136 Hz) so phone speakers reproduce the heartbeat clearly!
        sig = (
            0.65 * np.sin(2 * np.pi * f0 * (1.0 - 0.22 * tt) * tt)
            + 0.55 * np.sin(2 * np.pi * (2.0 * f0) * (1.0 - 0.22 * tt) * tt)
        ) * env_ad(n, 0.008, 0.065)
        add_stereo(sig, t0 + dt, gain=gain * g, pan=0.0)


def foley_stamp_x(t0):
    """Punchy 3D myth-busted X-stamp impact."""
    n = int(0.28 * SR)
    tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * (165 * np.exp(-tt / 0.08)) * tt) * np.exp(-tt / 0.075)
    buzz = np.sin(2 * np.pi * 240 * tt) * np.exp(-tt / 0.11) * 0.35
    snap = fast_bp(rng.standard_normal(n + 30), 22, 5)[:n] * np.exp(-tt / 0.012) * 0.65
    add_stereo(body + buzz + snap, t0, gain=0.25, pan=0.1)


def foley_acid_plunge_and_quench(t0):
    """J-cut liquid stomach plunge + rapid boiling quench leading up to the silence."""
    n = int(5.4 * SR)
    tt = np.arange(n) / SR
    bub = fast_bp(rng.standard_normal(n + 80), 42, 10)[:n] * (0.5 + 0.5 * np.sin(2 * np.pi * 19.0 * tt))
    env = np.minimum(1.0, tt / 0.10) * np.exp(-tt / 2.6)
    # Taper cleanly into Silence #2 at t0 + 5.4s (~49.35s)
    fade_n = int(0.45 * SR)
    env[-fade_n:] *= np.linspace(1.0, 0.0, fade_n)
    add_stereo(bub * env, t0, gain=0.16, pan=0.0)


def foley_obsidian_shatter(t0):
    """THE SIGNATURE SOUND AFTER SILENCE #2: thermal-shock volcanic glass crack + 9 crystal shards!"""
    # 1. Razor-sharp fracture snap
    n = int(0.32 * SR)
    tt = np.arange(n) / SR
    snap = (
        1.1 * fast_hp(rng.standard_normal(n + 20), 4)[:n] * np.exp(-tt / 0.009)
        + 0.8 * np.sin(2 * np.pi * 2850 * tt) * np.exp(-tt / 0.022)
        + 0.7 * np.sin(2 * np.pi * 4380 * tt) * np.exp(-tt / 0.015)
        + 0.5 * np.sin(2 * np.pi * 1420 * tt) * np.exp(-tt / 0.035)
    )
    add_stereo(snap, t0, gain=0.32, pan=0.0)
    # 2. Scattering obsidian glass shard clinks across stereo field
    shard_freqs = [3120, 3890, 2640, 4520, 3480, 5120, 2950, 4180, 3660]
    for i, sf_hz in enumerate(shard_freqs):
        dt = 0.05 + (i ** 1.25) * 0.055
        sn = int(0.18 * SR)
        stt = np.arange(sn) / SR
        clink = (
            np.sin(2 * np.pi * sf_hz * stt) * np.exp(-stt / 0.040)
            + 0.5 * np.sin(2 * np.pi * (sf_hz * 1.62) * stt) * np.exp(-stt / 0.020)
        )
        add_stereo(clink, t0 + dt, gain=0.14 * (0.9 ** i), pan=-0.65 + 1.3 * ((i * 37 % 9) / 8.0))


def foley_diag_ping(t0, freq, pan=0.0):
    """Clean medical callout ring ping in Beat 9."""
    n = int(0.45 * SR)
    tt = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * freq * tt) * np.exp(-tt / 0.14)
        + 0.35 * np.sin(2 * np.pi * (freq * 2.0) * tt) * np.exp(-tt / 0.07)
    )
    na = int(0.004 * SR)
    sig[:na] *= np.linspace(0.0, 1.0, na)
    add_stereo(sig, t0, gain=0.15, pan=pan)


# Place all frame-synced foley events:
foley_tong_click(0.22)
foley_molten_stretch(0.55, dur=2.2, gain=0.11)
foley_kettle_boil(3.55, dur=2.3)
foley_molten_stretch(6.10, dur=3.1, gain=0.12)
# Rising 12x temperature ticks in Beat 2
for k in range(6):
    foley_diag_ping(6.30 + k * 0.16, 680 + k * 110, pan=0.35)

# J-cut #1: Flash-steam burst starts at 9.92s (0.28s before Beat 3 cut at 10.20s!)
foley_steam_burst(9.92, dur=1.9, gain=0.22, pan=0.0)
foley_steam_burst(14.85, dur=1.5, gain=0.18, pan=0.15)   # 1,700x expansion shockwave

# Beat 4: Leidenfrost vapor cushion skate
foley_leidenfrost_skate(17.15, dur=5.6)

# Beat 5: Airway steam rush + swelling heartbeats
foley_steam_burst(23.50, dur=1.4, gain=0.16, pan=-0.1)
for hb_t in [25.6, 26.8, 27.9, 28.9]:
    foley_heartbeat(hb_t, gain=0.18)

# Beat 6: Sticky esophagus snag + deep tissue sizzle + L-cut ember fade into Silence #1
foley_molten_stretch(31.30, dur=2.2, gain=0.13)
foley_steam_burst(34.50, dur=1.45, gain=0.15, pan=0.05)

# SILENCE #1 (36.02 - 36.98s): Single isolated heartbeat in the quiet!
foley_heartbeat(36.42, gain=0.29)

# Beat 7: 3D red X myth-buster stamp + 1,000 J energy drain ticks
foley_stamp_x(40.25)
for k in range(5):
    foley_diag_ping(42.40 + k * 0.18, 920 - k * 95, pan=0.28)

# J-cut #2: Acid plunge enters at 43.85s (0.25s before Beat 8 cut at 44.10s!)
foley_acid_plunge_and_quench(43.85)

# SILENCE #2 (49.42 - 50.05s) -> BROKEN BY OBSIDIAN THERMAL-SHOCK SHATTER AT 50.05s!
foley_obsidian_shatter(50.05)

# Beat 9: Three diagnostic callout pings (Airway, Esophagus, Obsidian Shards)
foley_diag_ping(54.25, 1046.5, pan=-0.25)
foley_diag_ping(55.15, 1174.7, pan=0.0)
foley_diag_ping(56.05, 1318.5, pan=0.25)

# ============================================================================
# 3. MASTERING FOR STITCH.PY SIDECHAIN MIX
# ============================================================================
# Fade cleanly to silence by 60.0s (and keep 60.0-65.0s zeroed for stitch.py pad_dur)
end_idx = int(FILM_DUR * SR)
fade_len = int(0.85 * SR)
out[:, end_idx - fade_len:end_idx] *= np.linspace(1.0, 0.0, fade_len)
out[:, end_idx:] = 0.0

# Soft tanh saturation on peaks + normalize peak to -10.5 dBFS (0.298) so that in stitch.py:
#   voice (-2.8 dBFS) + sidechain-ducked music (-10.5 dBFS ducked by 9:1) NEVER clips 1.0,
#   and voice sits ~10-12 dB RMS above the ducked music bed!
pk = np.max(np.abs(out))
if pk > 1e-6:
    out = np.tanh((out / pk) * 1.35) / np.tanh(1.35) * 0.295

dst = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
sf.write(dst, out.T.astype(np.float32), SR)
print(f"wrote {dst}: {DUR}s stereo @ {SR}Hz, peak {20 * np.log10(max(1e-9, np.max(np.abs(out)))):.1f} dBFS")
