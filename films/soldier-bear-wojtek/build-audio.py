#!/usr/bin/env python3
"""Build master voice track (voice.flac + base64 parts for GHA stitch),
word-level timestamps (words_master.json), short 2-4 word Baboon-standard
caption phrases (cues.json), and synced .srt files for `soldier-bear-wojtek`."""
import base64
import json
import os
import subprocess
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(HERE, "audio")
TTS_DIR = "/tmp/wojtek_tts"
SR = 44100
DUR = 32.0
N = int(DUR * SR)

LINE_STARTS = {
    "01": 0.15,
    "02": 4.95,
    "03": 10.85,
    "04": 18.45,
    "05": 25.75,
}

# Clean display words per line (matching spoken order 1-to-1 with Whisper tokens)
DISPLAY_WORDS = {
    "01": ["During", "World", "War", "II,", "the", "Polish", "Army", "officially", "enlisted", "a", "500-pound", "brown", "bear."],
    "02": ["After", "adopting", "an", "orphaned", "cub", "named", "Wojtek", "in", "Iran,", "soldiers", "taught", "him", "to", "salute,", "wrestle,", "and", "drink", "beer."],
    "03": ["When", "British", "port", "officials", "banned", "pets", "from", "boarding", "their", "warship", "to", "Italy,", "the", "soldiers", "drafted", "Wojtek", "as", "a", "real", "private", "with", "his", "own", "paybook."],
    "04": ["Then", "at", "Monte", "Cassino,", "while", "cannons", "roared,", "Wojtek", "watched", "the", "exhausted", "crew", "and", "began", "hauling", "heavy", "ammo", "crates", "himself."],
    "05": ["He", "never", "dropped", "a", "single", "shell,", "earning", "promotion", "to", "Corporal", "and", "a", "place", "on", "the", "company's", "official", "emblem."],
}

# Short 2-4 word Baboon-style caption chunks (line_id, start_word_idx, end_word_idx_inclusive)
CHUNKS = [
    ("01", 0, 3),    # During World War II,
    ("01", 4, 6),    # the Polish Army
    ("01", 7, 9),    # officially enlisted a
    ("01", 10, 12),  # 500-pound brown bear.

    ("02", 0, 2),    # After adopting an
    ("02", 3, 5),    # orphaned cub named
    ("02", 6, 8),    # Wojtek in Iran,
    ("02", 9, 13),   # soldiers taught him to salute,
    ("02", 14, 17),  # wrestle, and drink beer.

    ("03", 0, 3),    # When British port officials
    ("03", 4, 6),    # banned pets from
    ("03", 7, 11),   # boarding their warship to Italy,
    ("03", 12, 15),  # the soldiers drafted Wojtek
    ("03", 16, 19),  # as a real private
    ("03", 20, 23),  # with his own paybook.

    ("04", 0, 3),    # Then at Monte Cassino,
    ("04", 4, 6),    # while cannons roared,
    ("04", 7, 9),    # Wojtek watched the
    ("04", 10, 12),  # exhausted crew and
    ("04", 13, 15),  # began hauling heavy
    ("04", 16, 18),  # ammo crates himself.

    ("05", 0, 2),    # He never dropped
    ("05", 3, 5),    # a single shell,
    ("05", 6, 9),    # earning promotion to Corporal
    ("05", 10, 14),  # and a place on the
    ("05", 15, 17),  # company's official emblem.
]


def load_wav_44k(path):
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"
    ])
    return np.frombuffer(raw, dtype=np.float32).copy()


def fmt_srt_time(t):
    ms = int(round(max(0.0, t) * 1000))
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    raw_words = json.load(open(os.path.join(TTS_DIR, "words.json")))
    raw_dur = json.load(open(os.path.join(TTS_DIR, "dur.json")))

    voice = np.zeros(N, dtype=np.float32)
    line_word_Master = {}

    for lid, t_start in LINE_STARTS.items():
        wav = load_wav_44k(os.path.join(TTS_DIR, f"{lid}.wav"))
        # Gentle soft-knee compression on voice line for low crest factor and ultra-even loudness
        pk = np.max(np.abs(wav)) or 1.0
        wav = np.tanh((wav / pk) * 2.5) / np.tanh(2.5) * 0.48
        i0 = int(round(t_start * SR))
        i1 = min(N, i0 + len(wav))
        voice[i0:i1] += wav[: i1 - i0]

        w_raw = raw_words[lid]
        # Merge "500" and "-pound" in line 01 if split by Whisper
        merged = []
        idx = 0
        while idx < len(w_raw):
            tok, a, b = w_raw[idx]
            if lid == "01" and tok == "500" and idx + 1 < len(w_raw) and w_raw[idx + 1][0].startswith("-pound"):
                merged.append(["500-pound", max(0.0, float(a)), float(w_raw[idx + 1][2])])
                idx += 2
            else:
                merged.append([tok, max(0.0, float(a)), float(b)])
                idx += 1

        disp = DISPLAY_WORDS[lid]
        assert len(merged) == len(disp), f"Line {lid} word count mismatch: {len(merged)} vs {len(disp)}: {merged}"
        items = []
        for d_word, (_, wa, wb) in zip(disp, merged):
            items.append({
                "word": d_word,
                "t0": round(t_start + wa, 3),
                "t1": round(t_start + max(wb, wa + 0.08), 3),
            })
        line_word_Master[lid] = items

    # Write words_master.json and cues.json (short 2-4 word chunks with per-word timings)
    all_words = []
    for lid in sorted(line_word_Master.keys()):
        all_words.extend(line_word_Master[lid])

    cues = []
    for ci, (lid, w0, w1) in enumerate(CHUNKS):
        wslice = line_word_Master[lid][w0 : w1 + 1]
        t0 = wslice[0]["t0"]
        t1 = round(wslice[-1]["t1"] + 0.14, 3)
        cues.append({
            "id": f"c{ci+1:02d}",
            "t0": t0,
            "t1": t1,
            "text": " ".join(x["word"] for x in wslice),
            "words": wslice,
        })
    # Ensure non-overlapping consecutive cues
    for i in range(len(cues) - 1):
        if cues[i]["t1"] > cues[i + 1]["t0"]:
            cues[i]["t1"] = cues[i + 1]["t0"]

    with open(os.path.join(AUDIO_DIR, "words_master.json"), "w") as f:
        json.dump(all_words, f, indent=2)
    with open(os.path.join(AUDIO_DIR, "cues.json"), "w") as f:
        json.dump(cues, f, indent=2)

    # Write .srt files (both audio/captions.srt and soldier-bear-wojtek.srt)
    srt_lines = []
    for idx, c in enumerate(cues, 1):
        srt_lines.append(f"{idx}\n{fmt_srt_time(c['t0'])} --> {fmt_srt_time(c['t1'])}\n{c['text']}\n")
    srt_text = "\n".join(srt_lines)
    for dst in [os.path.join(AUDIO_DIR, "captions.srt"), os.path.join(HERE, "soldier-bear-wojtek.srt")]:
        with open(dst, "w") as f:
            f.write(srt_text)

    # Save voice.flac and base64 part(s) for GitHub Actions stitch.py
    voice_flac = os.path.join(TTS_DIR, "voice.flac")
    sf.write(voice_flac, voice, SR, format="FLAC")
    b64 = base64.b64encode(open(voice_flac, "rb").read())
    for old_p in os.listdir(AUDIO_DIR):
        if old_p.startswith("voice.flac.b64.part"):
            os.remove(os.path.join(AUDIO_DIR, old_p))
    part_path = os.path.join(AUDIO_DIR, "voice.flac.b64.part00")
    with open(part_path, "wb") as f:
        f.write(b64)
    print(f"Built {len(cues)} short Baboon-style caption chunks; voice.flac b64 bytes={len(b64)}")


if __name__ == "__main__":
    main()
