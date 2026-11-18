#!/usr/bin/env python3
"""Build master voice track (voice.flac + base64 parts for GHA stitch),
word-level timestamps (words_master.json), short 2-4 word Baboon-standard
caption phrases (cues.json), and synced .srt files for `cadaver-synod-897`."""
import base64
import json
import os
import subprocess
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(HERE, "audio")
TTS_DIR = "/tmp/cadaver_tts"
SR = 44100
DUR = 30.0
N = int(DUR * SR)

LINE_STARTS = {
    "01": 0.15,
    "02": 5.35,
    "03": 11.20,
    "04": 16.20,
    "05": 22.15,
}

# Clean display words per line (matching spoken order 1-to-1 with Whisper tokens)
DISPLAY_WORDS = {
    "01": ["In", "the", "year", "897,", "Pope", "Stephen", "VI", "put", "his", "dead", "predecessor", "on", "trial", "for", "real."],
    "02": ["Nine", "months", "after", "Pope", "Formosus", "died,", "guards", "dug", "up", "his", "corpse", "and", "dressed", "the", "skeleton", "in", "gold", "robes."],
    "03": ["They", "propped", "him", "on", "a", "throne", "and", "appointed", "a", "trembling", "young", "deacon", "to", "answer", "as", "his", "defence", "lawyer."],
    "04": ["The", "silent", "skeleton", "still", "lost", "the", "case,", "had", "his", "three", "blessing", "fingers", "chopped", "off,", "and", "was", "stripped", "of", "his", "title."],
    "05": ["After", "his", "body", "was", "tossed", "into", "the", "Tiber", "River,", "Rome", "rebelled", "and", "banned", "putting", "dead", "people", "on", "trial", "forever."],
}

# Short 2-4 word Baboon-style caption chunks (line_id, start_word_idx, end_word_idx_inclusive)
CHUNKS = [
    ("01", 0, 3),    # In the year 897,
    ("01", 4, 6),    # Pope Stephen VI
    ("01", 7, 10),   # put his dead predecessor
    ("01", 11, 14),  # on trial for real.

    ("02", 0, 2),    # Nine months after
    ("02", 3, 5),    # Pope Formosus died,
    ("02", 6, 10),   # guards dug up his corpse
    ("02", 11, 14),  # and dressed the skeleton
    ("02", 15, 17),  # in gold robes.

    ("03", 0, 2),    # They propped him
    ("03", 3, 5),    # on a throne
    ("03", 6, 9),    # and appointed a trembling
    ("03", 10, 13),  # young deacon to answer
    ("03", 14, 17),  # as his defence lawyer.

    ("04", 0, 2),    # The silent skeleton
    ("04", 3, 6),    # still lost the case,
    ("04", 7, 10),   # had his three blessing
    ("04", 11, 13),  # fingers chopped off,
    ("04", 14, 19),  # and was stripped of his title.

    ("05", 0, 3),    # After his body was
    ("05", 4, 8),    # tossed into the Tiber River,
    ("05", 9, 12),   # Rome rebelled and banned
    ("05", 13, 15),  # putting dead people
    ("05", 16, 18),  # on trial forever.
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

    voice = np.zeros(N, dtype=np.float32)
    line_word_master = {}

    for lid, t_start in LINE_STARTS.items():
        wav = load_wav_44k(os.path.join(TTS_DIR, f"{lid}.wav"))
        pk = np.max(np.abs(wav)) or 1.0
        wav = np.tanh((wav / pk) * 2.9) / np.tanh(2.9) * 0.45
        i0 = int(round(t_start * SR))
        i1 = min(N, i0 + len(wav))
        voice[i0:i1] += wav[: i1 - i0]

        w_raw = raw_words[lid]
        merged = [[tok, max(0.0, float(a)), float(b)] for tok, a, b in w_raw]
        disp = DISPLAY_WORDS[lid]
        assert len(merged) == len(disp), f"Line {lid} word count mismatch: {len(merged)} vs {len(disp)}: {merged}"
        items = []
        for d_word, (_, wa, wb) in zip(disp, merged):
            items.append({
                "word": d_word,
                "t0": round(t_start + wa, 3),
                "t1": round(t_start + max(wb, wa + 0.08), 3),
            })
        line_word_master[lid] = items

    all_words = []
    for lid in sorted(line_word_master.keys()):
        all_words.extend(line_word_master[lid])

    cues = []
    for ci, (lid, w0, w1) in enumerate(CHUNKS):
        wslice = line_word_master[lid][w0 : w1 + 1]
        t0 = wslice[0]["t0"]
        t1 = round(wslice[-1]["t1"] + 0.14, 3)
        cues.append({
            "id": f"c{ci+1:02d}",
            "t0": t0,
            "t1": t1,
            "text": " ".join(x["word"] for x in wslice),
            "words": wslice,
        })
    for i in range(len(cues) - 1):
        if cues[i]["t1"] > cues[i + 1]["t0"]:
            cues[i]["t1"] = cues[i + 1]["t0"]

    with open(os.path.join(AUDIO_DIR, "words_master.json"), "w") as f:
        json.dump(all_words, f, indent=2)
    with open(os.path.join(AUDIO_DIR, "cues.json"), "w") as f:
        json.dump(cues, f, indent=2)

    srt_lines = []
    for idx, c in enumerate(cues, 1):
        srt_lines.append(f"{idx}\n{fmt_srt_time(c['t0'])} --> {fmt_srt_time(c['t1'])}\n{c['text']}\n")
    srt_text = "\n".join(srt_lines)
    for dst in [os.path.join(AUDIO_DIR, "captions.srt"), os.path.join(HERE, "cadaver-synod-897.srt")]:
        with open(dst, "w") as f:
            f.write(srt_text)

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
