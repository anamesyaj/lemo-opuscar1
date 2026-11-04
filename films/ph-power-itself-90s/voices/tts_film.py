# Film voiceover: "What if the Philippines powered itself?" (Satellite Briefing style, 90s).
# Kokoro am_michael, lang en-us, per-line emotion speeds. Gaps: 0.15s base, 0.5s after
# lines 4, 9, 14, 17 (1-based) for beat pauses.
# Run from voices/ dir with kit venv python, TMPDIR=$HOME/tmp.
import json, sys, os, shutil, tempfile, numpy as np, soundfile as sf
KIT = os.path.expanduser("~/claude-animation-skills/kit")
sys.path.insert(0, os.path.expanduser("~/claude-animation-skills/skills/stick-figure/engine/tools"))
from kokoro_onnx import Kokoro, EspeakConfig
import espeakng_loader

data = espeakng_loader.get_data_path()
if len(data) > 100:
    short = os.path.join(tempfile.gettempdir(), "kokoro-espeak-ng-data")
    if not os.path.exists(os.path.join(short, "phontab")):
        shutil.rmtree(short, ignore_errors=True); shutil.copytree(data, short)
    data = short
espeak = EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=data)
k = Kokoro(os.path.join(KIT, "models/kokoro-v1.0.onnx"), os.path.join(KIT, "models/voices-v1.0.bin"), espeak_config=espeak)

# (text, speed); beat pauses (0.5s gap) after 1-based lines 4, 9, 14, 17
LINES = [
    ("What if the Philippines powered itself?", 1.00),
    ("Not with imported fuel — with what is already under its feet.", 0.95),
    ("Start in Bataan. A nuclear plant, finished in 1984, that never switched on.", 0.95),
    ("One decision, and its reactors could hum for sixty years.", 0.90),
    ("Then look down. The archipelago sits on the Ring of Fire.", 1.00),
    ("The Philippines is already among the world's top geothermal producers — and it has barely scratched the surface.", 1.00),
    ("Steam that has been rising for free, for centuries.", 0.92),
    ("The rivers of the Cordillera. The sun of the dry season. The wind of Ilocos.", 1.00),
    ("Each one a power station waiting to be built.", 1.00),
    ("Connect them, and the grid stops begging for imported coal.", 0.98),
    ("Electricity — among the priciest in Asia today — starts getting cheaper.", 0.95),
    ("Cheaper power means factories that stay open past midnight.", 1.00),
    ("Cold storage that keeps the fishermen's catch fresh.", 1.00),
    ("Hospitals that never flicker.", 0.92),
    ("Here is the mechanism: energy independence compounds.", 0.88),
    ("Every peso not spent on imported fuel is a peso spent at home.", 0.98),
    ("On schools. On roads. On the next power plant.", 1.00),
    ("So the question was never whether the Philippines had energy.", 0.95),
    ("It was always who got to switch it on.", 0.90),
]
BEAT_AFTER = {4, 9, 14, 17}  # 1-based
BASE_GAP = 0.15

out, t, meta, durs = [], 0.0, [], []
for i, (text, speed) in enumerate(LINES):
    samples, sr = k.create(text, voice="am_michael", speed=speed, lang="en-us")
    a = np.abs(samples); thr = 0.01
    idx = np.where(a > thr)[0]
    samples = samples[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.05 * sr)]
    sf.write(f"line_{i:02d}.wav", samples, sr)
    dur = len(samples) / sr
    meta.append({"i": i, "text": text, "start": round(t, 3), "dur": round(dur, 3)})
    durs.append({"i": i, "dur": round(dur, 3)})
    out.append(samples)
    gap = 0.5 if (i + 1) in BEAT_AFTER else BASE_GAP
    out.append(np.zeros(int(gap * sr), dtype=samples.dtype))
    t += dur + gap
vo = np.concatenate(out)
peak = np.max(np.abs(vo)); vo = vo / peak * 10 ** (-1 / 20)
sf.write("voice.wav", vo, sr)
json.dump(meta, open("lines.json", "w"), indent=1)
json.dump(durs, open("dur.json", "w"), indent=1)
print(f"am_michael total {len(vo)/sr:.2f}s @ {sr}Hz")
for m in meta: print(m["i"], m["start"], m["dur"], m["text"][:60])
