// main.js — Corporal Wojtek (1942–1944) film harness (1080x1920 @ 30 fps, 960 frames = 32.0s).
// Enforces the Mandatory Baboon Reference Standard:
//   1. ZERO top HUD banner/plaque (all location/date signage is physical 3D fascia boards in the world).
//   2. Short 2-4 word bottom safe-zone captions with the actively spoken word highlighted in warm gold (#f2c94c).
//   3. Exposes window.READY, window.DUR, window.EV, window.TEXTS(t), window.render(t).
import * as THREE from 'three';
import { createPost } from './post.js';
import { buildWorld } from './world.js';
import { LIGHTS, LOOK } from './lights.js';
import { Pool, Actor, Fx, tier, NOINK } from './cast.js';
import { DUR, FPS, TOTAL_FRAMES, EV, evaluateFrame } from './story.js';

const W = 1080, H = 1920;

const params = new URLSearchParams(location.search);
const isRenderMode = params.get('render') === '1';
const isFastCheck = params.get('fastcheck') === '1';
if (isRenderMode) document.body.classList.add('render');

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
  document.fonts.load('900 48px "Fredoka"'),
  document.fonts.load('800 44px "Fredoka"'),
  document.fonts.load('700 46px "Fredoka"'),
  document.fonts.load('600 40px "Fredoka"'),
]);

let cues = [];
try {
  cues = await (await fetch('./audio/cues.json')).json();
} catch (_) { cues = []; }

// ---------- Scene, Sky Dome, Clouds & Lights ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 1000);
camera.layers.enable(NOINK);
scene.add(camera);

const hemiLight = new THREE.HemisphereLight('#f2ebd9', '#c29b64', 0.56);
const sunLight = new THREE.DirectionalLight('#fff0d2', 2.9);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
const sc = sunLight.shadow.camera;
sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 6; sc.far = 260;
sunLight.shadow.bias = -0.00025;
sunLight.shadow.normalBias = 0.015;
scene.add(hemiLight, sunLight, sunLight.target);

const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() },
    c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() },
    c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
  },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
    void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
      vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
      c = mix(c, c2, smoothstep(e.x, e.y, el));
      c = mix(c, c3, smoothstep(e.y, e.z, el));
      c = mix(c, c4, smoothstep(e.z, e.w, el));
      gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(750, 36, 20), skyMat);
sky.renderOrder = -1;
sky.frustumCulled = false;
scene.add(sky);

const fog = new THREE.Fog('#e6cea4', 26, 240);
scene.fog = fog;

const world = buildWorld(scene);
const post = createPost(renderer, W, H);
const cardStage = new THREE.Group();
scene.add(cardStage);
const pool = new Pool();
const actors = [];
const fxs = [];
const _v = new THREE.Vector3();

const ZONE_CENTERS = {
  iran_camp: [0, 1.2, -2.0],
  alexandria_port: [0, 1.2, -52.0],
  monte_cassino: [0, 1.2, -101.8],
  emblem_road: [0, 1.2, -100.5],
};

function applyLightPreset(name) {
  const preset = LIGHTS[name] || LIGHTS.iran_camp;
  const look = LOOK[name] || LOOK.iran_camp;
  const center = ZONE_CENTERS[name] || ZONE_CENTERS.iran_camp;

  hemiLight.color.set(preset.sky);
  hemiLight.groundColor.set(preset.ground);
  hemiLight.intensity = preset.hemiI;
  sunLight.color.set(preset.sunCol);
  sunLight.intensity = preset.sunI;

  const az = THREE.MathUtils.degToRad(preset.az);
  const el = THREE.MathUtils.degToRad(preset.el);
  const dx = Math.cos(el) * Math.sin(az);
  const dy = Math.sin(el);
  const dz = Math.cos(el) * Math.cos(az);
  sunLight.position.set(center[0] + dx * 95, center[1] + dy * 95, center[2] + dz * 95);
  sunLight.target.position.set(center[0], center[1], center[2]);
  sunLight.target.updateMatrixWorld();

  const su = skyMat.uniforms;
  look.sky.c.forEach((h, i) => su['c' + i].value.set(h));
  const e = look.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
  su.e.value.set(e[1], e[2], e[3], e[4]);

  fog.color.set(preset.fog);
  fog.near = preset.fogNear;
  fog.far = preset.fogFar;
  return preset;
}

// ---------------- Baboon-Standard Word-Highlighted 2-4 Word Captions ----------------
// ZERO top HUD plaque! Only bottom safe-zone 2-4 word captions with active word in warm gold (#f2c94c).
function drawHUD(t) {
  const cue = cues.find((c) => t >= c.t0 && t < c.t1);
  if (!cue || !cue.words || !cue.words.length) return;

  // Determine the actively spoken word inside this 2-4 word chunk
  let activeIdx = 0;
  for (let i = 0; i < cue.words.length; i++) {
    if (t >= cue.words[i].t0 - 0.02) activeIdx = i;
  }

  ctx.save();
  ctx.font = '700 46px "Fredoka", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const spaceW = ctx.measureText(' ').width * 1.12;
  const wordWidths = cue.words.map((w) => ctx.measureText(w.word).width);
  const totalTextW = wordWidths.reduce((a, b) => a + b, 0) + spaceW * Math.max(0, cue.words.length - 1);

  const padX = 36, padY = 20;
  const boxW = totalTextW + padX * 2;
  const boxH = 54 + padY * 2;
  const yCenter = 1542;
  const xLeft = (W - boxW) * 0.5;
  const yTop = yCenter - boxH * 0.5;

  // Rounded dark translucent backdrop pill
  ctx.fillStyle = 'rgba(14, 10, 20, 0.80)';
  ctx.strokeStyle = 'rgba(255, 236, 184, 0.30)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(xLeft, yTop, boxW, boxH, 24);
  ctx.fill();
  ctx.stroke();

  // Draw each word with thick cartoon outline & warm gold (#f2c94c) on the active word
  let curX = xLeft + padX;
  for (let i = 0; i < cue.words.length; i++) {
    const wStr = cue.words[i].word;
    const isAct = i === activeIdx;
    const wy = isAct ? yCenter - 2 : yCenter;

    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#0d0812';
    ctx.lineWidth = 11;
    ctx.strokeText(wStr, curX, wy);

    ctx.fillStyle = isAct ? '#f2c94c' : '#ffffff';
    ctx.fillText(wStr, curX, wy);

    curX += wordWidths[i] + spaceW;
  }
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
  const f = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(t * FPS)));
  const state = evaluateFrame(f, world);
  const preset = applyLightPreset(state.light);

  camera.position.set(
    state.camPos[0] + state.shake[0],
    state.camPos[1] + state.shake[1],
    state.camPos[2]
  );
  camera.lookAt(
    state.camTgt[0] + state.shake[0] * 0.6,
    state.camTgt[1] + state.shake[1] * 0.6,
    state.camTgt[2]
  );
  camera.fov = state.fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const places = state.cards;
  const fxList = state.fx;

  for (const p of places) {
    _v.set(p.x, p.y + 1.1, p.z);
    const d = camera.position.distanceTo(_v);
    const [pw, ph, pk] = tier(d);
    p.r = pool.req(p.key, pw, ph, pk, p.draw);
  }
  for (const x of fxList) {
    x.r = pool.req(x.key, x.cw, x.ch, 1, x.draw);
  }
  pool.flush();

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    let a = actors[i];
    if (!a) { a = new Actor(cardStage); actors[i] = a; }
    a.r = p.r;
    a.bind();
    const m = a.mesh;
    m.visible = true;
    m.position.set(p.x, p.y, p.z);
    m.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + (p.rotY || 0);
    m.rotation.z = p.rotZ || 0;
    const sx = p.scX ?? (p.scY ?? 1);
    const sy = p.scY ?? 1;
    m.scale.set(p.mirror ? -sx : sx, sy, 1);
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

  post.render(scene, camera, {
    dof: { focus: state.dofFocus, cInf: 0.0042 },
    flash: state.flash,
    saturation: 1.02,
    gain: 1.0,
    lift: 0,
    vignette: 0.10,
  });

  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(renderer.domElement, 0, 0, W, H);
  drawHUD(t);
}

// ---------------- Core Engine / Playwright Page Contract ----------------
window.DUR = DUR;
window.TOTAL = TOTAL_FRAMES;
window.EV = EV;
window.render = renderAtTime;
window.renderAt = renderAtTime;
window.renderDataURL = () => stageCanvas.toDataURL('image/jpeg', 0.95);

// Diegetic world fascia signs reported for core/render/readcheck.mjs
const DIEGETIC_SIGNS = [
  { id: 'sign_iran',    t0: 0.0,   t1: 10.75, text: '22ND SUPPLY CO. · HAMADAN 1942', x0: 220, y0: 260, x1: 860, y1: 380 },
  { id: 'sign_port',    t0: 10.85, t1: 18.35, text: 'ALEXANDRIA PORT · NO PETS ABOARD', x0: 200, y0: 260, x1: 880, y1: 380 },
  { id: 'sign_cassino', t0: 18.45, t1: 25.65, text: 'MONTE CASSINO · 100 LB AMMO', x0: 220, y0: 260, x1: 860, y1: 380 },
  { id: 'sign_emblem',  t0: 25.75, t1: 32.00, text: 'CORPORAL WOJTEK · 22 KOMPANIA', x0: 220, y0: 260, x1: 860, y1: 380 },
];

window.TEXTS = (t) => {
  const s = DIEGETIC_SIGNS.find((d) => t >= d.t0 && t < d.t1);
  if (!s) return [];
  return [{ id: s.id, text: s.text, x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 }];
};

renderAtTime(0);
window.READY = true;

// Interactive scrub bar when opened in browser
if (!isRenderMode) {
  const playBtn = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const msg = document.getElementById('msg');
  let playing = false;
  let curT = 0;
  let lastNow = performance.now();

  const updateUI = () => {
    scrub.value = curT.toFixed(3);
    msg.textContent = `${curT.toFixed(2)} / ${DUR.toFixed(1)}s`;
  };
  scrub.addEventListener('input', () => {
    curT = parseFloat(scrub.value) || 0;
    renderAtTime(curT);
    updateUI();
  });
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
    lastNow = performance.now();
  });
  const loop = (now) => {
    if (playing) {
      curT += (now - lastNow) / 1000;
      if (curT >= DUR) curT = 0;
      renderAtTime(curT);
      updateUI();
    }
    lastNow = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
