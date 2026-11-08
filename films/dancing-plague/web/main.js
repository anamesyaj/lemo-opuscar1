// main.js — harness: renderer + world + cards + post, driven by story.js.
// Exposes window.renderFrame(f) (returns a JPEG data URL) and window.ready.
// Everything is a pure function of the frame number, except the world's cloud
// drift (accumulates per update call — cosmetic only; sequential renders match).
import * as THREE from 'three';
import { createPost } from './post.js';
import { buildWorld, sunDirFromAzEl } from './world.js';
import { LIGHTS } from './lights.js';
import { Pool, Actor, Fx, tier, contactBlob, NOINK } from './cast.js';
import {
  SHOTS, shotAt, camAt, dofAt, focusAt, lightFor, worldAt, actorsAt, fxAt, TOTAL,
} from './story.js';
import { idle } from './motion.js';

const W = 1080, H = 1920;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({
  antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance',
});
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- scene ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 1000);
camera.layers.enable(NOINK);
camera.userData.target = new THREE.Vector3();
scene.add(camera);

const world = buildWorld();
scene.add(world.group);
world.attach(scene);

// ---------- post ----------
const post = createPost(renderer, W, H);

// ---------- stage (cards) ----------
const stage = new THREE.Group();
scene.add(stage);
const pool = new Pool();
const actors = [];
const fxs = [];
const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();

// The world's sun is positioned from a FIXED dummy camera (see world.js
// applyPreset), so the card shading must use that same direction, not the live
// camera, or the 2D shading and the 3D shadows would disagree.
const dummyCam = new THREE.PerspectiveCamera();
dummyCam.position.set(0, 1.7, 20);
dummyCam.lookAt(0, 2, -12);

let lastShotId = -1;

function renderFrame(f) {
  const shot = shotAt(f);
  if (shot.id !== lastShotId) {
    world.setLight(shot.light);
    lastShotId = shot.id;
  }
  world.update(f, shot.id);

  // ---- camera ----
  const cam = camAt(shot.id, f);
  camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
  camera.lookAt(cam.look[0], cam.look[1], cam.look[2]);
  if (cam.roll) camera.rotateZ(cam.roll);
  camera.fov = cam.fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.userData.target.set(cam.look[0], cam.look[1], cam.look[2]);

  // ---- sun (world direction, toward the sun) ----
  const preset = LIGHTS[lightFor(f).name];
  const sun = sunDirFromAzEl(preset.az, preset.el, dummyCam);
  const sunArr = [sun.x, sun.y, sun.z];

  // ---- camera info for the story functions ----
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  camera.getWorldDirection(_fwd);
  const camInfo = {
    pos: [camera.position.x, camera.position.y, camera.position.z],
    right: [_right.x, _right.y, _right.z],
    fwd: [_fwd.x, _fwd.y, _fwd.z],
    sun: sunArr,
  };

  // ---- placements ----
  const places = actorsAt(f, camInfo);
  const { flash, fx: fxList } = fxAt(f, camInfo);
  const lightName = lightFor(f).name;

  // Contact blobs + day shadows for every actor.
  for (const p of places) contactBlob(fxList, p.x, p.y, p.z, sunArr, lightName, p.scale ?? 1);

  // ---- pool requests ----
  for (const p of places) {
    _v.set(p.x, p.y + 1.2 * (p.scale ?? 1), p.z);
    const d = camera.position.distanceTo(_v) / (p.scale ?? 1);
    const [w, h, k] = tier(d);
    p.r = pool.req(p.key, w, h, k, p.draw);
  }
  for (const x of fxList) x.r = pool.req(x.key, x.cw, x.ch, 1, x.draw);
  pool.flush();

  // ---- actors ----
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    let a = actors[i];
    if (!a) { a = new Actor(stage); actors[i] = a; }
    a.r = p.r;
    a.bind();
    const m = a.mesh;
    m.visible = true;
    const idl = idle(f, p.seed ?? 1);
    m.position.set(p.x, p.y + idl.bob, p.z);
    m.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + (p.yaw || 0);
    m.rotation.z = (p.roll || 0) + idl.rot;
    const s = p.scale ?? 1;
    m.scale.set(p.mirror ? -s : s, s, s);
    a.setTint(preset);
  }
  for (let i = places.length; i < actors.length; i++) actors[i].mesh.visible = false;

  // ---- effects ----
  for (let i = 0; i < fxList.length; i++) {
    const x = fxList[i];
    let fx = fxs[i];
    if (!fx) { fx = new Fx(stage); fxs[i] = fx; }
    fx.r = x.r;
    fx.bind(x.soft);
    const m = fx.mesh;
    m.visible = true;
    m.position.set(x.x, x.y, x.z);
    m.rotation.order = 'YXZ';
    if (x.flat) {
      m.rotation.set(-Math.PI / 2, 0, x.rot || 0);
    } else {
      m.rotation.set(0, Math.atan2(camera.position.x - x.x, camera.position.z - x.z), x.rot || 0);
    }
    m.scale.set(x.w, x.h, 1);
  }
  for (let i = fxList.length; i < fxs.length; i++) fxs[i].mesh.visible = false;

  // ---- sight-line culling (never let a camera stare through a house) ----
  world.cullForCamera(camera);

  // ---- post ----
  const d = dofAt(f);
  const focusPt = focusAt(shot.id, f);
  const focusDist = camera.position.distanceTo(_v.set(focusPt[0], focusPt[1], focusPt[2]));
  post.render(scene, camera, {
    dof: { focus: focusDist, cInf: d.cInf },
    flash, saturation: 1, gain: 1, lift: 0, vignette: 0.12,
  });
}

window.renderFrame = (f) => {
  renderFrame(f);
  return renderer.domElement.toDataURL('image/jpeg', 0.95);
};
window.__dbg = { scene, camera, actors, fxs, stage, renderer, post, world };
window.TOTAL = TOTAL;
window.SHOTS = SHOTS;
window.ready = true;
