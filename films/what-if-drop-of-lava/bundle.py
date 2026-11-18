#!/usr/bin/env python3
"""Bundle modular `src/*.js` + embedded OFL Fredoka woff2 + embedded mixed MP3 into self-contained `index.html`."""
import json
import os
import shutil

HERE = os.path.dirname(os.path.realpath(__file__))
FONT_B64 = open("/tmp/fredoka_b64.txt").read().strip()
MP3_B64 = open("/tmp/lava_tts/player_mix_b64.txt").read().strip()
CUES_JSON = json.dumps(json.load(open(os.path.join(HERE, "audio", "cues.json"), encoding="utf-8")), ensure_ascii=False)

SRC_FILES = [
    "materials.js",
    "rig.js",
    "beats1to5.js",
    "beats6to9.js",
    "overlays.js",
]
JS_BUNDLE = "\n\n".join(open(os.path.join(HERE, "src", fn), encoding="utf-8").read() for fn in SRC_FILES)

HTML = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>What If You Swallowed a Single Drop of Lava?</title>
<!--
  WHAT IF YOU SWALLOWED A SINGLE DROP OF LAVA?
  (ZackD Films style, soft vinyl-clay 3D + anatomical cutaways, 9:16 1080x1920, 30 fps, 60.0 s)

  BEAT LIST (keep it up to date for later edits)
  #  start-end    top badge                      what we see
  1  0.0-3.3      1 DROP OF LAVA?                Steel tongs release a glowing 1,200°C viscous lava teardrop toward Leo's open mouth
  2  3.3-10.2     1,200°C · 12× BOILING WATER    Studio stage: 100°C steaming mug vs. 12× thermal column & crucible pouring thick honey-like lava
  3  10.2-17.0    STEAM EXPANDS 1,700×           Sagittal 3D head cutaway: drop strikes wet tongue, flashing saliva into 1,700× steam spheres
  4  17.0-23.4    LEIDENFROST VAPOR CUSHION      Extreme macro tongue papillae: lava bead levitates & skates on vapor, searing a white burn track
  5  23.4-30.2    STEAM SWELLS AIRWAY SHUT       Neck cutaway: superheated steam billows into larynx, inflating pink airway walls shut
  6  30.2-36.8    BURNS ESOPHAGUS CRATER         Esophagus cutaway: cooling sticky silicate snags on mucosal wall, burning a deep dark crater (+ 0.9s hush)
  7  36.8-44.1    MYTH BUSTED · ONLY 1,000 J     Torso stomach cutaway: movie melt-through path stamped with a 3D red X as 1,000 J drains against 0.5g H2O
  8  44.1-51.4    QUENCHED TO VOLCANIC GLASS     Native Move: inside stomach acid, molten clay cools solid black and shatters at 50.05s into 9 obsidian shards
  9  51.4-60.0    3 REAL RISKS · NOT MELTING     Bookend reveal: 3 pulsing hazard rings on cutaway bust above twin pedestals (1,200°C Lava vs. Cold Obsidian)
-->
<style>
  @font-face {{
    font-family: "Fredoka";
    font-style: normal;
    font-weight: 500 700;
    font-display: block;
    src: url(data:font/woff2;base64,{FONT_B64}) format("woff2");
  }}
  html, body {{ margin: 0; height: 100%; background: #0b0f19; color: #eee; font: 14px "Fredoka", system-ui, sans-serif; overflow: hidden; }}
  #wrap {{ position: fixed; inset: 0 0 64px 0; display: flex; align-items: center; justify-content: center; }}
  #stage {{ background: #0b101b; box-shadow: 0 10px 40px rgba(0,0,0,.55); }}
  #bar {{ position: fixed; left: 0; right: 0; bottom: 0; height: 64px; display: flex; gap: 10px; align-items: center; padding: 0 14px; background: #161922; box-sizing: border-box; }}
  #bar button {{ background: #2a3040; color: #fff; border: 0; border-radius: 8px; padding: 9px 14px; font-weight: 600; font-family: inherit; cursor: pointer; }}
  #bar button.go {{ background: #ea580c; }}
  #bar input[type=range] {{ flex: 1; }}
  #msg {{ min-width: 120px; opacity: .85; font-variant-numeric: tabular-nums; }}
  body.render #bar {{ display: none; }}
  body.render #wrap {{ inset: 0; display: block; }}
  body.render #stage {{ box-shadow: none; }}
</style>
<script src="three.min.js"></script>
<script>if (!window.THREE) document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\\/script>');</script>
</head>
<body>
<div id="wrap"><canvas id="stage"></canvas></div>
<audio id="vo" preload="auto" src="data:audio/mpeg;base64,{MP3_B64}"></audio>
<div id="bar">
  <button id="play">Play</button>
  <input id="scrub" type="range" min="0" max="1000" value="0">
  <span id="msg">0.00 s</span>
  <button id="export" class="go">Export video</button>
</div>
<script>
/* ---------- 1. SETTINGS ---------- */
const CONFIG = {{
  width: 1080, height: 1920,
  fps: 30,
  duration: 60.0,
  background: "#0b101b",
}};
window.DUR = CONFIG.duration;
const CAPTION_CUES = {CUES_JSON};

/* ---------- 2. HELPERS (deterministic) ---------- */
const W = CONFIG.width, H = CONFIG.height;
const stage = document.getElementById("stage");
stage.width = W; stage.height = H;
const ctx = stage.getContext("2d");

function rand(seed) {{ let t = (seed * 2654435761 + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = {{
  inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
  out: k => 1 - Math.pow(1 - k, 3),
  in: k => k * k * k,
  back: k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2),
}};
function noise1(x, seed = 1) {{ const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(rand(i * 13 + seed * 7919), rand((i + 1) * 13 + seed * 7919), u) * 2 - 1; }}

function makeGL(w = W, h = H) {{
  const r = new THREE.WebGLRenderer({{ antialias: true, preserveDrawingBuffer: true, alpha: true }});
  r.setPixelRatio(1); r.setSize(w, h, false);
  return r;
}}

/* ---------- 3. THE ANIMATION ---------- */
{JS_BUNDLE}

let scenesReady = false;
async function setup() {{
  await document.fonts.ready;
  if (!scenesReady) {{
    buildBeats1To5();
    buildBeats6To9();
    scenesReady = true;
  }}
}}

const RENDER = /[?&](render|film)=1/.test(location.search);
const FAST_CHECK = /[?&]fastcheck=1/.test(location.search);

function draw(t) {{
  const ct = clamp(t, 0, CONFIG.duration);
  update3DScene(ct);
  if (FAST_CHECK) {{
    camera.updateMatrixWorld();
    return;
  }}
  drawStudioBackdrop(ct);
  gl.render(scene, camera);
  ctx.drawImage(gl.domElement, 0, 0, W, H);
  draw2DOverlays(ct);
}}

/* ---------- 4. PLAYER + EXPORT ---------- */
const N = Math.round(CONFIG.duration * CONFIG.fps);
window.renderAt = t => draw(clamp(t, 0, CONFIG.duration));
window.render = window.renderAt;
window.renderDataURL = () => stage.toDataURL("image/jpeg", 0.95);
window.renderFrame = f => draw(clamp(f, 0, N - 1) / CONFIG.fps);
window.CONFIG = CONFIG;

if (RENDER) document.body.classList.add("render");
function fit() {{ if (RENDER) {{ stage.style.width = W + "px"; stage.style.height = H + "px"; return; }} const s = Math.min(innerWidth / W, (innerHeight - 64) / H) * .94; stage.style.width = W * s + "px"; stage.style.height = H * s + "px"; }}
addEventListener("resize", fit); fit();

const vo = document.getElementById("vo");
let playing = false, t0 = 0, tNow = 0;
const scrub = document.getElementById("scrub"), msg = document.getElementById("msg"), playBtn = document.getElementById("play");
function show(t) {{ tNow = t; draw(t); scrub.value = Math.round(t / CONFIG.duration * 1000); msg.textContent = t.toFixed(2) + " s"; }}
function loop() {{
  if (!playing) return;
  let t = (vo && !vo.paused && !vo.ended) ? vo.currentTime : (performance.now() - t0) / 1000;
  if (t >= CONFIG.duration) {{ t = 0; t0 = performance.now(); if (vo) {{ vo.currentTime = 0; vo.play().catch(() => {{}}); }} }}
  show(t); requestAnimationFrame(loop);
}}
playBtn.onclick = () => {{
  playing = !playing; playBtn.textContent = playing ? "Pause" : "Play";
  if (playing) {{
    t0 = performance.now() - tNow * 1000;
    if (vo) {{ vo.currentTime = tNow; vo.play().catch(() => {{}}); }}
    loop();
  }} else if (vo) {{ vo.pause(); }}
}};
scrub.oninput = () => {{
  playing = false; playBtn.textContent = "Play";
  if (vo) vo.pause();
  show(scrub.value / 1000 * CONFIG.duration);
}};

let audioCtx, audioDest;
document.getElementById("export").onclick = async () => {{
  const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm"];
  const type = types.find(x => window.MediaRecorder && MediaRecorder.isTypeSupported(x));
  if (!type) {{ msg.textContent = "This browser can't record. Open the file in Chrome."; return; }}
  playing = false; playBtn.textContent = "Play"; if (vo) vo.pause();
  const stream = stage.captureStream(CONFIG.fps);
  if (vo) {{
    try {{
      if (!audioCtx) {{
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaElementSource(vo);
        audioDest = audioCtx.createMediaStreamDestination();
        src.connect(audioDest); src.connect(audioCtx.destination);
      }}
      await audioCtx.resume();
      audioDest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    }} catch (e) {{}}
  }}
  const rec = new MediaRecorder(stream, {{ mimeType: type, videoBitsPerSecond: 16e6 }});
  const parts = []; rec.ondataavailable = e => e.data.size && parts.push(e.data);
  const done = new Promise(r => rec.onstop = r);
  show(0);
  if (vo) {{ vo.currentTime = 0; await vo.play().catch(() => {{}}); }}
  rec.start();
  const start = performance.now();
  await new Promise(res => {{ (function step() {{ const t = (performance.now() - start) / 1000; if (t >= CONFIG.duration) return res(); show(t); msg.textContent = "Recording " + Math.round(t / CONFIG.duration * 100) + "% (keep this tab open)"; setTimeout(step, 1000 / CONFIG.fps); }})(); }});
  if (vo) vo.pause();
  show(CONFIG.duration - 1e-3); rec.stop(); await done;
  const blob = new Blob(parts, {{ type }}); const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "what-if-drop-of-lava." + (type.includes("mp4") ? "mp4" : "webm");
  document.body.appendChild(a); a.click(); a.remove();
  msg.textContent = "Saved " + a.download;
}};

setup().then(() => {{ show(0); window.ready = true; window.READY = true; }});
</script>
</body>
</html>
"""

out_index = os.path.join(HERE, "index.html")
with open(out_index, "w", encoding="utf-8") as f:
    f.write(HTML)
shutil.copy(out_index, os.path.join(HERE, "what-if-drop-of-lava.html"))
print(f"bundled {out_index} ({len(HTML) / 1024:.1f} KB)")
