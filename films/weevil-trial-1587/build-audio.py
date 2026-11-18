#!/usr/bin/env python3
"""Assemble master voiceover track, .srt subtitles, b64 FLAC for GitHub stitch.py, and HTML preview MP3."""
import base64
import json
import os
import subprocess
import sys
import numpy as np
import soundfile as sf
import soxr

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "core", "audio"))
from sfx import compress, hp  # noqa: E402

FILM_DIR = os.path.dirname(os.path.realpath(__file__))
TTS_DIR = "/tmp/weevil_tts"
SR = 44100
FILM_DUR = 30.0

# Exact clip start times and safe consonant-preserving trim lengths (s) on the 30.0s master timeline:
#   01 (trim 5.04s):  0.20 ->  5.24   (Shot 1: Vineyard Hook & Summons)
#   02 (trim 4.10s):  5.44 ->  9.54   (Shot 2: Church Court Witness Box; gavel slam at 5.26s)
#   03 (trim 4.98s):  9.80 -> 14.78   (Shot 3: Filliol's Genesis Argument)
#   [14.78 -> 15.63: SILENCE #1 (0.85 s pure score dropout + parchment deed unroll at 14.80s)]
#   04 (trim 4.46s): 15.63 -> 20.09   (Shot 4-5: Le Grand Feisse Offer & REJECTED Stamp at 18.60s)
#   05 (trim 3.40s): 20.30 -> 23.70   (Shot 6: Archive Months Pass & Quill Writes "VERDICT:")
#   [23.70 -> 24.55: SILENCE #2 (0.85 s pin-drop suspense -> 24.60s SIGNATURE PARCHMENT TEAR & BITE CRUNCH!)]
#   06 (trim 3.92s): 25.25 -> 29.17   (Shot 7: Weevil Erupts Through Verdict + 1.09s post-word tail)
VO_SCHEDULE = [
    ("01", 0.20, 5.04),
    ("02", 5.44, 4.10),
    ("03", 9.80, 4.98),
    ("04", 15.63, 4.46),
    ("05", 20.30, 3.40),
    ("06", 25.25, 3.92),
]

# Phrase-level captions synced verbatim to words.json (every cue >= 1.84s; digits formatted cleanly "1587")
CUES = [
    {"t0": 0.15, "t1": 2.85, "text": "In 1587, a French town actually sued"},
    {"t0": 2.85, "t1": 5.26, "text": "tiny green weevils for eating their vineyards."},
    {"t0": 5.42, "t1": 7.96, "text": "The church court even gave the bugs real defense lawyers,"},
    {"t0": 7.96, "t1": 9.80, "text": "who nearly won the case."},
    {"t0": 9.80, "t1": 11.65, "text": "Since God created insects first,"},
    {"t0": 11.65, "t1": 14.78, "text": "lawyers argued bugs held prior rights to eat green leaves."},
    {"t0": 15.63, "t1": 17.81, "text": "Panicked villagers offered the bugs free land,"},
    {"t0": 17.81, "t1": 20.12, "text": "yet the lawyer rejected it as rocky dirt."},
    {"t0": 20.30, "t1": 23.70, "text": "Months of delays dragged on until the bishop finally penned a verdict."},
    {"t0": 25.25, "t1": 29.85, "text": "History never learned who won, because insects literally chewed up the last page!"},
]


def main():
    n_total = int(FILM_DUR * SR)
    voice_mono = np.zeros(n_total, dtype=np.float64)

    for cid, t_start, trim_dur in VO_SCHEDULE:
        wav_path = os.path.join(TTS_DIR, f"{cid}.wav")
        x, sr_in = sf.read(wav_path, dtype="float64")
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr_in != SR:
            x = soxr.resample(x, sr_in, SR)
        max_len = int(round(trim_dur * SR))
        if len(x) > max_len:
            x = x[:max_len]
        nf_in = min(len(x) // 4, int(0.008 * SR))
        nf_out = min(len(x) // 4, int(0.024 * SR))
        x[:nf_in] *= np.linspace(0.0, 1.0, nf_in)
        x[-nf_out:] *= np.linspace(1.0, 0.0, nf_out)
        s = int(round(t_start * SR))
        e = min(n_total, s + len(x))
        voice_mono[s:e] += x[: e - s]
        print(f"placed VO {cid}: {t_start:6.2f}s -> {t_start + len(x) / SR:6.2f}s ({len(x) / SR:.2f}s)")

    voice_proc = hp(voice_mono, 75)
    voice_proc = compress(voice_proc, thr=0.22, ratio=3.2, att=0.004, rel=0.09)
    pk = np.max(np.abs(voice_proc))
    voice_proc = voice_proc * (0.725 / max(1e-9, pk))
    voice_stereo = np.column_stack([voice_proc, voice_proc]).astype(np.float32)

    flac_path = os.path.join(TTS_DIR, "voice.flac")
    sf.write(flac_path, voice_stereo, SR, subtype="PCM_16")
    raw_flac = open(flac_path, "rb").read()
    b64_data = base64.b64encode(raw_flac)
    os.makedirs(os.path.join(FILM_DIR, "audio"), exist_ok=True)
    part_path = os.path.join(FILM_DIR, "audio", "voice.flac.b64.part00")
    with open(part_path, "wb") as f:
        f.write(b64_data)
    print(f"wrote {part_path} ({len(b64_data) / 1024:.1f} KB b64, raw FLAC {len(raw_flac) / 1024:.1f} KB)")

    for idx, c in enumerate(CUES):
        dur = c["t1"] - c["t0"]
        assert dur >= 1.8, f"Cue {idx + 1} too short ({dur:.2f}s < 1.8s): {c}"
    cues_path = os.path.join(FILM_DIR, "audio", "cues.json")
    json.dump(CUES, open(cues_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    for srt_dst in [
        os.path.join(FILM_DIR, "weevil-trial-1587.srt"),
        os.path.join(FILM_DIR, "audio", "captions.srt"),
    ]:
        subprocess.run([sys.executable, os.path.join(ROOT, "core", "render", "srt.py"), cues_path, srt_dst], check=True)

    # Generate music.wav and test the exact stitch.py sidechaincompress mix
    music_wav = os.path.join(TTS_DIR, "music.wav")
    subprocess.run([sys.executable, os.path.join(FILM_DIR, "make-music.py"), music_wav], check=True)

    mix_wav = os.path.join(TTS_DIR, "mix.wav")
    pad_dur = 65
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-i", flac_path, "-i", music_wav,
        "-filter_complex",
        f"[0:a]aresample=44100,apad=whole_dur={pad_dur},asplit=2[voice][vsc];"
        f"[1:a]aresample=44100,apad=whole_dur={pad_dur}[mus];"
        "[mus][vsc]sidechaincompress=threshold=0.04:ratio=9:attack=15:release=600:makeup=1[ducked];"
        f"[voice][ducked]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur={pad_dur}[aout]",
        "-map", "[aout]", mix_wav,
    ], check=True)

    mix_data, mix_sr = sf.read(mix_wav)
    mix_30 = mix_data[: int(FILM_DUR * mix_sr)]
    mix_pk = np.max(np.abs(mix_30))
    mono_30 = mix_30.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono_30)) ** 2
    freqs = np.fft.rfftfreq(len(mono_30), 1.0 / mix_sr)
    e_low = spec[(freqs >= 20) & (freqs <= 120)].sum()
    e_rest = spec[(freqs > 120) & (freqs <= 16000)].sum()
    low_rel_db = 10 * np.log10(max(1e-12, e_low) / max(1e-12, e_rest))
    print(f"mix_30 peak = {20 * np.log10(mix_pk):.2f} dBFS (linear {mix_pk:.3f}), 20-120Hz relative = {low_rel_db:.1f} dB")

    # Export shifted word timings JSON in global master time for mouth/lip animation in story.js
    raw_words = json.load(open(os.path.join(TTS_DIR, "words.json"), encoding="utf-8"))
    master_words = []
    for cid, t_start, trim_dur in VO_SCHEDULE:
        for w, ws, we in raw_words[cid]:
            gs = round(t_start + max(0.0, ws), 3)
            ge = round(t_start + min(trim_dur, we), 3)
            if ge > gs:
                master_words.append([w, gs, ge])
    json.dump(master_words, open(os.path.join(FILM_DIR, "audio", "words_master.json"), "w", encoding="utf-8"), indent=0)
    print(f"wrote master word timings ({len(master_words)} words)")


if __name__ == "__main__":
    main()
