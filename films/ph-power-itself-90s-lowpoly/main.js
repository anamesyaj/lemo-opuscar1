// main.js — "What if the Philippines powered itself?" (low-poly rebuild, 90 s)
// Renderer, lights, day→night sky keyframes, camera shots, overlay hookup.
// Page contract: window.render(t), window.READY.
import * as THREE from '/node_modules/three/build/three.module.js';
import { clamp, seg, ss, eio, lerp, monotone, TAU } from '/core/lib.js';
import { makePost } from './post.js';
import { makeSea } from './sea.js';
import { buildWorld } from './world.js';
import { drawLabels } from './overlay.js';

const W = 1080, H = 1920, QS = new URLSearchParams(location.search);
const SSAA = +(QS.get('ssaa') ?? 1);
const DUR = 90;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 1, 2000);
const post = makePost(renderer, scene, camera, W, H, { ssaa: SSAA, aoRadius: .7, aoScale: 1.5, aoThickness: 1 });
post.bloom.threshold = .95; post.bloom.radius = .55;

const sea = makeSea(scene);
const world = buildWorld(scene);
window.__WORLD = world;   // for events.json extraction

// —— lights ——
const hemi = new THREE.HemisphereLight('#eef6fb', '#c6b89c', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e8', 1.6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 200 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const moon = new THREE.DirectionalLight('#a9b0e8', 0); moon.position.set(-40, 60, -30); scene.add(moon, moon.target);

// —— sky: dim dawn → day → dusk → night ——
// [t, zenith, horizon, deep sea, shallow sea, sun colour, sunI, hemiI, sun el°, sun azim°, bloom]
const SKY = [
  [0,   '#7d92b8', '#d9bfae', '#3d6f8a', '#6fa8a4', '#ffcf9e', 1.0, .85, 12, 160, .25],
  [15,  '#88c8e8', '#eaf5f2', '#38a5bc', '#86e2d4', '#fff6e8', 2.6, 1.1, 48, 150, .28],
  [60,  '#88c8e8', '#eaf5f2', '#38a5bc', '#86e2d4', '#fff6e8', 2.6, 1.1, 52, 145, .28],
  [68,  '#6f6fa8', '#ffa888', '#5a6a9e', '#b08aa6', '#ff9a68', 1.4, .9, 10, 140, .35],
  [76,  '#12163a', '#4a4478', '#23264a', '#363a66', '#a9b0e8', .0, .35, 30, 140, .5],
  [90,  '#12163a', '#4a4478', '#23264a', '#363a66', '#a9b0e8', .0, .35, 30, 140, .5],
];
const C = h => new THREE.Color(h);
const SK = SKY.map(k => ({ t: k[0], zen: C(k[1]), hor: C(k[2]), deep: C(k[3]), shal: C(k[4]), sun: C(k[5]), sunI: k[6], hI: k[7], el: k[8], az: k[9], bloom: k[10] }));
function skyAt(t) {
  let i = 0; while (i < SK.length - 2 && t > SK[i + 1].t) i++;
  const a = SK[i], b = SK[i + 1], u = ss(seg(t, a.t, b.t)), o = {};
  for (const k of ['zen', 'hor', 'deep', 'shal', 'sun']) o[k] = a[k].clone().lerp(b[k], u);
  for (const k of ['sunI', 'hI', 'el', 'az', 'bloom']) o[k] = lerp(a[k], b[k], u);
  return o;
}

// —— camera shots ——
// [t0, t1, name, tx,ty,tz, az, el, fh0, fh1, (truckX1, truckZ1)?]
const DEG = Math.PI / 180;
const SHOTS = [
  [0, 8,     'open',    0, 1.0, 1,   45, 30, 30, 31],
  [8, 20,    'bataan',  0, 1.0, -6,  45, 28, 10, 11],
  [20, 35,   'geo',    -5, 1.0, -4,  45, 30, 12, 13],
  [35, 50,   'renew',  -1, 1.0, -2,  45, 30, 17, 18],
  [50, 65,   'grid',    0, 1.0, 0,   45, 30, 18, 18,  -2, 3],   // lateral truck
  [65, 80,   'night',   0, 1.0, 1,   45, 28, 30, 30],
  [80, 90,   'finale',  0, 1.0, 1,   45, 30, 30, 48],          // pure zoom-out
];
const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
let CAM = {};
function cam(t) {
  const s = shotAt(t);
  const [t0, t1, name, tx, ty, tz, az, el0, fh0, fh1] = s, u = seg(t, t0, t1);
  let el = el0, fh = lerp(fh0, fh1, ss(u)), px = tx, pz = tz;
  if (name === 'grid' && s.length > 10) { const g = ss(u); px = lerp(tx, s[10], g); pz = lerp(tz, s[11], g); }
  if (name === 'finale') { const z = eio(seg(t, 80, 88)); fh = lerp(30, 48, z); el = lerp(30, 33, z); }
  const D = Math.max(300, fh * 3), ce = Math.cos(el * DEG);
  camera.position.set(px + D * ce * Math.sin(az * DEG), ty + D * Math.sin(el * DEG), pz + D * ce * Math.cos(az * DEG));
  camera.up.set(0, 1, 0); camera.lookAt(px, ty, pz);
  const fw = fh * W / H; camera.left = -fw / 2; camera.right = fw / 2; camera.top = fh / 2; camera.bottom = -fh / 2;
  camera.near = 1; camera.far = D + fh * 5 + 900; camera.updateProjectionMatrix();
  const cot = 1 / Math.tan(el * DEG);
  post.comp.camDist.value = D; post.comp.hz0.value = .1 * fh * cot; post.comp.hz1.value = .52 * fh * cot;
  CAM = { name, fh };
}

// sea + sky uniforms live on the sea object; post sky uses comp uniforms
const seaU = sea.U;
window.render = t => {
  t = clamp(t, 0, DUR);
  const sky = skyAt(t);
  sun.color.copy(sky.sun); sun.intensity = sky.sunI;
  const azr = sky.az * DEG, elr = sky.el * DEG;
  sun.position.set(Math.sin(azr) * Math.cos(elr), Math.sin(elr), Math.cos(azr) * Math.cos(elr)).multiplyScalar(120);
  hemi.intensity = sky.hI;
  moon.intensity = ss(seg(t, 66, 76)) * .9;
  post.bloom.strength = sky.bloom;
  if (seaU) {
    if (seaU.uDeep) { seaU.uDeep.value.copy(sky.deep); seaU.uShal.value.copy(sky.shal); }
    if (seaU.uTime) seaU.uTime.value = t;
    if (seaU.uNight) seaU.uNight.value = ss(seg(t, 66, 76));
  }
  if (post.comp) {
    if (post.comp.zen) { post.comp.zen.value.copy(sky.zen); post.comp.hor.value.copy(sky.hor); }
    if (post.comp.stars) post.comp.stars.value = ss(seg(t, 70, 80));
    if (post.comp.time) post.comp.time.value = t;
  }
  const ctx = { sea };
  world.update(t, ctx);
  if (sea.update) sea.update(t);
  cam(t);
  post.composer.render();
  drawLabels(t);
};
window.DUR = DUR;
window.READY = true;
