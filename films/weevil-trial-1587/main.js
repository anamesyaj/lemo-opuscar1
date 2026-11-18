// main.js — St-Julien 1587 film harness (1080x1920 @ 30 fps, 900 frames).
// Exposes window.READY, window.DUR, window.EV, window.TEXTS(t), window.render(t),
// window.renderAt(t), window.renderDataURL(), plus interactive scrub controls when not ?render=1.
import * as THREE from 'three';
import { createPost } from './post.js';
import { buildWorld, sunDirFromAzEl } from './world.js';
import { LIGHTS } from './lights.js';
import { Pool, Actor, Fx, tier, contactBlob, NOINK } from './cast.js';
import {
  FPS, TOTAL, DUR, EV, shotAt, camAt, dofAt, focusAt, lightFor, actorsAt, fxAt, plaqueAt, setWords,
} from './story.js';
import { idle } from './motion.js';

const W = 1080, H = 1920;

const params = new URLSearchParams(location.search);
const isRenderMode = params.get('render') === '1';
const isFastCheck = params.get('fastcheck') === '1';
if (isRenderMode) document.body.classList.add('render');

// ---------- composited 1080x1920 stage canvas (3D WebGL + HUD Plaque + Captions) ----------
const stageCanvas = document.getElementById('stage');
stageCanvas.width = W;
stageCanvas.height = H;
const ctx = stageCanvas.getContext('2d');

const renderer = new THREE.WebGLRenderer({
  antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance',
});
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Wait for self-hosted offline fonts (/core/fonts/fonts.css) BEFORE building Canvas2D textures
await document.fonts.ready;
await Promise.allSettled([
  document.fonts.load('700 44px "Fredoka"'),
  document.fonts.load('600 40px "Fredoka"'),
  document.fonts.load('bold 54px "IM Fell English"'),
  document.fonts.load('italic 34px "IM Fell English"'),
]);

let cues = [];
try {
  cues = await (await fetch('./audio/cues.json')).json();
} catch (_) { cues = []; }
try {
  setWords(await (await fetch('./audio/words_master.json')).json());
} catch (_) {}

// ---------- scene ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
camera.layers.enable(NOINK);
scene.add(camera);

const world = buildWorld();
scene.add(world.group);
world.attach(scene);

const post = createPost(renderer, W, H);
const cardStage = new THREE.Group();
scene.add(cardStage);
const pool = new Pool();
const actors = [];
const fxs = [];
const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();

const dummyCam = new THREE.PerspectiveCamera();
dummyCam.position.set(0, 1.7, 16);
dummyCam.lookAt(0, 1.2, 0);

let lastLightKey = '';

// ---------------- HUD Plaque & Safe-Zone Burned-In Captions ----------------
function computePlaqueBox(t) {
  const p = plaqueAt(t);
  return { id: p.id, text: p.text, sub: p.sub, x0: 210, y0: 248, x1: 870, y1: 342 };
}

function drawHUD(t) {
  // 1. Top Diegetic Case Plaque (y = 248..342 px)
  const b = computePlaqueBox(t);
  const pw = b.x1 - b.x0, ph = b.y1 - b.y0;
  ctx.save();
  ctx.fillStyle = 'rgba(24, 15, 24, 0.86)';
  ctx.strokeStyle = '#e5be67';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(b.x0, b.y0, pw, ph, 18);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e5be67';
  ctx.font = '600 19px "Fredoka", sans-serif';
  ctx.fillText(b.sub, W * 0.5, b.y0 + 25);
  ctx.fillStyle = '#fff9ee';
  ctx.font = '700 39px "Fredoka", sans-serif';
  ctx.fillText(b.text, W * 0.5, b.y0 + 63);
  ctx.restore();

  // 2. Bottom Safe-Zone Burned-In Captions (y <= 1548 px -> bottom margin >= 372 px clear of player UI)
  const cue = cues.find((c) => t >= c.t0 && t < c.t1);
  if (!cue) return;
  ctx.save();
  ctx.font = '600 39px "Fredoka", sans-serif';
  const maxW = 820;
  const words = cue.text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lh = 48;
  const padX = 34, padY = 18;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = widest + padX * 2;
  const boxH = lines.length * lh + padY * 2;
  const yBot = 1544;
  const yTop = yBot - boxH;
  const xLeft = (W - boxW) * 0.5;

  ctx.fillStyle = 'rgba(18, 12, 22, 0.86)';
  ctx.strokeStyle = 'rgba(255, 240, 206, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(xLeft, yTop, boxW, boxH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffdf7';
  lines.forEach((ln, idx) => {
    ctx.fillText(ln, W * 0.5, yTop + padY + lh * (idx + 0.5));
  });
  ctx.restore();
}

// ---------------- Frame Renderer ----------------
function renderAtTime(tRaw) {
  const t = Math.max(0, Math.min(DUR - 1e-4, tRaw));
  if (isFastCheck) {
    ctx.clearRect(0, 0, W, H);
    drawHUD(t);
    return;
  }
  const f = Math.min(TOTAL - 1, Math.max(0, Math.round(t * FPS)));
  const shot = shotAt(f);
  const li = lightFor(f);
  const lk = `${li.name}|${li.zoneCenter.join(',')}`;
  if (lk !== lastLightKey) {
    world.setLight(li.name, li.zoneCenter);
    lastLightKey = lk;
  }
  world.update(f);

  const cam = camAt(shot.id, f);
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  if (cam.roll) camera.rotateZ(cam.roll);
  camera.fov = cam.fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const preset = LIGHTS[li.name];
  const sun = sunDirFromAzEl(preset.az, preset.el, dummyCam);
  const sunArr = [sun.x, sun.y, sun.z];

  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  camera.getWorldDirection(_fwd);
  const camInfo = {
    pos: [camera.position.x, camera.position.y, camera.position.z],
    right: [_right.x, _right.y, _right.z],
    fwd: [_fwd.x, _fwd.y, _fwd.z],
    sun: sunArr,
  };

  const places = actorsAt(f, camInfo);
  const { flash, fx: fxList } = fxAt(f, camInfo);

  for (const p of places) {
    if (!p.noBlob) contactBlob(fxList, p.x, p.y, p.z, sunArr, li.name, p.scale ?? 1);
  }

  for (const p of places) {
    _v.set(p.x, p.y + 1.2 * (p.scale ?? 1), p.z);
    const d = camera.position.distanceTo(_v) / (p.scale ?? 1);
    const [pw, ph, pk] = tier(d);
    p.r = pool.req(p.key, pw, ph, pk, p.draw);
  }
  for (const x of fxList) x.r = pool.req(x.key, x.cw, x.ch, 1, x.draw);
  pool.flush();

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    let a = actors[i];
    if (!a) { a = new Actor(cardStage); actors[i] = a; }
    a.r = p.r;
    a.bind();
    const m = a.mesh;
    m.visible = true;
    const idl = idle(f, p.seed ?? 1);
    const ik = p.idleK ?? 1;
    m.position.set(p.x, p.y + idl.bob * ik, p.z);
    m.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + (p.yaw || 0);
    m.rotation.z = (p.roll || 0) + idl.rot * ik;
    const s = p.scale ?? 1;
    m.scale.set(p.mirror ? -s : s, s, s);
    a.setTint(preset);
  }
  for (let i = places.length; i < actors.length; i++) actors[i].mesh.visible = false;

  for (let i = 0; i < fxList.length; i++) {
    const x = fxList[i];
    let fx = fxs[i];
    if (!fx) { fx = new Fx(cardStage); fxs[i] = fx; }
    fx.r = x.r;
    fx.bind(x.soft);
    const m = fx.mesh;
    m.visible = true;
    m.position.set(x.x, x.y, x.z);
    m.rotation.order = 'YXZ';
    if (x.flat) m.rotation.set(-Math.PI / 2, 0, x.rot || 0);
    else m.rotation.set(0, Math.atan2(camera.position.x - x.x, camera.position.z - x.z), x.rot || 0);
    m.scale.set(x.w, x.h, 1);
  }
  for (let i = fxList.length; i < fxs.length; i++) fxs[i].mesh.visible = false;

  const d = dofAt(f);
  const focusPt = focusAt(shot.id, f);
  const focusDist = camera.position.distanceTo(_v.set(focusPt[0], focusPt[1], focusPt[2]));
  post.render(scene, camera, {
    dof: { focus: focusDist, cInf: d.cInf },
    flash, saturation: 1, gain: 1, lift: 0, vignette: 0.12,
  });

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(renderer.domElement, 0, 0, W, H);
  drawHUD(t);
}

// ---------------- Core Engine / Playwright Page Contract ----------------
window.DUR = DUR;
window.TOTAL = TOTAL;
window.EV = EV;
window.TEXTS = (t) => {
  const b = computePlaqueBox(Math.max(0, Math.min(DUR, t)));
  return [{ id: b.id, text: b.text, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }];
};
window.render = renderAtTime;
window.renderAt = renderAtTime;
window.renderDataURL = () => stageCanvas.toDataURL('image/jpeg', 0.95);

// Pre-warm shaders & composite initial frame cleanly
renderAtTime(0);
window.READY = true;

// Interactive browser preview scrub controls when opened interactively (without ?render=1)
if (!isRenderMode) {
  const scrub = document.getElementById('scrub');
  const msg = document.getElementById('msg');
  const playBtn = document.getElementById('play');
  let playing = false, tCur = 0, lastTs = 0;

  const sync = (t) => {
    tCur = Math.max(0, Math.min(DUR, t));
    renderAtTime(tCur);
    if (scrub) scrub.value = tCur.toFixed(2);
    if (msg) msg.textContent = `${tCur.toFixed(2)} / ${DUR.toFixed(1)}s`;
  };
  if (scrub) scrub.addEventListener('input', (e) => { playing = false; sync(parseFloat(e.target.value)); });
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.textContent = playing ? 'Pause' : 'Play';
      if (playing) {
        if (tCur >= DUR - 0.05) tCur = 0;
        lastTs = performance.now();
        const step = (now) => {
          if (!playing) return;
          const dt = (now - lastTs) / 1000;
          lastTs = now;
          tCur += dt;
          if (tCur >= DUR) { playing = false; playBtn.textContent = 'Play'; tCur = DUR - 0.01; }
          sync(tCur);
          if (playing) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    });
  }
  sync(0);
}
