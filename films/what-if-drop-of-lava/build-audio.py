#!/usr/bin/env python3
"""Assemble master voiceover track, .srt subtitles, b64 FLAC for GitHub stitch.py, and embedded MP3 for HTML player."""
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
TTS_DIR = "/tmp/lava_tts"
SR = 44100
FILM_DUR = 60.0

# Exact start times (s) of the 9 verified Kokoro lines on the 60.0s master timeline:
#   01 (2.413s):  0.20 ->  2.613   (Beat 1:  0.00 -  3.30)
#   02 (6.750s):  3.35 -> 10.100   (Beat 2:  3.30 - 10.20)
#   03 (6.532s): 10.30 -> 16.832   (Beat 3: 10.20 - 17.00)
#   04 (6.125s): 17.10 -> 23.225   (Beat 4: 17.00 - 23.40)
#   05 (6.478s): 23.50 -> 29.978   (Beat 5: 23.40 - 30.20)
#   06 (5.925s): 30.10 -> 36.025   (Beat 6: 30.20 - 36.80)
#   [36.025 -> 36.98: SILENCE #1 (0.955s hush + single heartbeat at 36.42s!)]
#   07 (6.865s): 36.98 -> 43.845   (Beat 7: 36.80 - 44.10)
#   08 (6.780s): 44.20 -> 50.980   (Beat 8: 44.10 - 51.40; "volcanic glass" lands across 49.68-50.62s right on 50.05s shatter!)
#   09 (7.544s): 51.55 -> 59.094   (Beat 9: 51.40 - 60.00; +0.906s final visual & subtitle hold!)
VO_SCHEDULE = [
    ("01", 0.20),
    ("02", 3.35),
    ("03", 10.30),
    ("04", 17.10),
    ("05", 23.50),
    ("06", 30.10),
    ("07", 36.98),
    ("08", 44.20),
    ("09", 51.55),
]

# Phrase-level captions (digits formatted cleanly per TECHNIQUE.md §4; every cue >= 2.1s, last cue holds +0.85s)
# Split points inside each clip come directly from Whisper's /tmp/lava_tts/words.json!
CUES = [
    # Beat 1
    {"t0": 0.15, "t1": 3.22, "text": "What if you swallowed a single drop of lava?"},
    # Beat 2
    {"t0": 3.35, "t1": 6.55, "text": "Fresh lava erupts at 1,200°C —"},
    {"t0": 6.55, "t1": 10.15, "text": "12× hotter than boiling water, and thick like honey."},
    # Beat 3
    {"t0": 10.30, "t1": 12.62, "text": "The instant it touches your wet tongue,"},
    {"t0": 12.62, "t1": 16.92, "text": "saliva flashes into steam, expanding 1,700×."},
    # Beat 4
    {"t0": 17.10, "t1": 20.55, "text": "For a split second, the drop skates on boiling vapor,"},
    {"t0": 20.55, "t1": 23.35, "text": "searing a white track across your taste buds."},
    # Beat 5
    {"t0": 23.50, "t1": 27.60, "text": "Inhaling superheated steam swells your airway shut,"},
    {"t0": 27.60, "t1": 30.05, "text": "threatening suffocation within seconds."},
    # Beat 6
    {"t0": 30.10, "t1": 33.85, "text": "As you swallow, sticky molten rock clings to your esophagus,"},
    {"t0": 33.85, "t1": 36.65, "text": "burning a deep crater into the wall."},
    # Beat 7 (after Silence #1)
    {"t0": 36.98, "t1": 40.22, "text": "Hollywood shows lava melting right through your stomach —"},
    {"t0": 40.22, "t1": 44.05, "text": "yet 1 small drop holds only 1,000 joules of heat."},
    # Beat 8
    {"t0": 44.20, "t1": 46.85, "text": "That boils less than 0.5 g of water,"},
    {"t0": 46.85, "t1": 51.32, "text": "so stomach acid quenches it in 3s into volcanic glass."},
    # Beat 9
    {"t0": 51.55, "t1": 54.15, "text": "One drop will not melt through your belly."},
    {"t0": 54.15, "t1": 59.90, "text": "Steam, a burned throat & sharp obsidian are the real danger."},
]


def main():
    n_total = int(FILM_DUR * SR)
    voice_mono = np.zeros(n_total, dtype=np.float64)

    for cid, t_start in VO_SCHEDULE:
        wav_path = os.path.join(TTS_DIR, f"{cid}.wav")
        x, sr_in = sf.read(wav_path, dtype="float64")
        if x.ndim > 1:
            x = x.mean(axis=1)
        if sr_in != SR:
            x = soxr.resample(x, sr_in, SR)
        # Short click-free 8ms fade in/out per clip
        nf = min(len(x) // 4, int(0.008 * SR))
        x[:nf] *= np.linspace(0.0, 1.0, nf)
        x[-nf:] *= np.linspace(1.0, 0.0, nf)
        s = int(round(t_start * SR))
        e = min(n_total, s + len(x))
        voice_mono[s:e] += x[:e - s]
        print(f"placed VO {cid}: {t_start:6.2f}s -> {t_start + len(x)/SR:6.2f}s ({len(x)/SR:.2f}s)")

    # Broadcast voice chain: clean 75 Hz rumble filter + gentle 3.2:1 compression + normalize to -2.8 dBFS (0.725)
    # Note: core/audio/sfx.py assumes 48k internally for time constants, which is within 8% at 44.1k
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

    # Write cues.json and export both .srt files via core/render/srt.py
    for idx, c in enumerate(CUES):
        dur = c["t1"] - c["t0"]
        assert dur >= 1.8, f"Cue {idx+1} too short ({dur:.2f}s < 1.8s): {c}"
    cues_path = os.path.join(FILM_DIR, "audio", "cues.json")
    json.dump(CUES, open(cues_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    for srt_dst in [
        os.path.join(FILM_DIR, "what-if-drop-of-lava.srt"),
        os.path.join(FILM_DIR, "audio", "captions.srt"),
    ]:
        subprocess.run([sys.executable, os.path.join(ROOT, "core", "render", "srt.py"), cues_path, srt_dst], check=True)

    # Synthesize score + foley via make-music.py and test the exact stitch.py sidechain mix!
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

    # Measure RMS balance, low-end energy (20-120 Hz vs rest), and peak headroom on 0..60s!
    mix_data, mix_sr = sf.read(mix_wav)
    mix_60 = mix_data[:int(FILM_DUR * mix_sr)]
    mix_pk = np.max(np.abs(mix_60))
    # Spectrum band check (TECHNIQUE.md §5: keep 20-120 Hz balanced)
    mono_60 = mix_60.mean(axis=1)
    spec = np.abs(np.fft.rfft(mono_60)) ** 2
    freqs = np.fft.rfftfreq(len(mono_60), 1.0 / mix_sr)
    e_low = spec[(freqs >= 20) & (freqs <= 120)].sum()
    e_rest = spec[(freqs > 120) & (freqs <= 16000)].sum()
    low_rel_db = 10 * np.log10(max(1e-12, e_low) / max(1e-12, e_rest))
    print(f"mix_60 peak = {20 * np.log10(mix_pk):.2f} dBFS (linear {mix_pk:.3f}), 20-120Hz relative = {low_rel_db:.1f} dB")

    # Export a normalized 60.0s MP3 for the standalone HTML player (<audio id="vo">)
    player_mp3 = os.path.join(TTS_DIR, "player_mix.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-t", str(FILM_DUR), "-i", mix_wav,
        "-af", "volume=1.18,alimiter=limit=0.92",
        "-c:a", "libmp3lame", "-b:a", "128k", player_mp3,
    ], check=True)
    mp3_b64 = base64.b64encode(open(player_mp3, "rb").read()).decode("ascii")
    with open(os.path.join(TTS_DIR, "player_mix_b64.txt"), "w") as f:
        f.write(mp3_b64)
    print(f"wrote {player_mp3} ({len(mp3_b64) / 1024:.1f} KB b64)")


if __name__ == "__main__":
    main()
