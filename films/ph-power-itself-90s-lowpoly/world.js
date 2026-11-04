// world.js — "What if the Philippines powered itself?" (Low-poly Isometric Island rebuild)
// A dim archipelago that builds its own power: Bataan dome → geothermal steam →
// dam + turning turbines + solar → transmission lines → night emissive bloom.
// Prop factories adapted from the style demo grammar; layout/schedule/story original.
import * as THREE from '/node_modules/three/build/three.module.js';
import { clamp, seg, ss, eio, lerp, hash, TAU, mulberry } from '/core/lib.js';
import { waveH } from './sea.js';

const SQ3 = Math.sqrt(3);
const hex2w = (q, r) => [SQ3 * (q + r / 2), 1.5 * r];
const hdist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
const R = mulberry(20261104);   // deterministic

// —— materials ——
const MC = new Map();
export function mat(hex, o = {}) {
  const k = hex + JSON.stringify(o);
  if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: hex, flatShading: true, roughness: .88, metalness: 0, ...o }));
  return MC.get(k);
}
const jit = (hex, a) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, clamp(h.l * (1 + a))); return '#' + c.getHexString(); };
const M = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };

export const PAL = {
  sandTop: '#f3dfab', sandSide: '#e2c68e', grassTop: '#93c96c', grassTop2: '#84bd63', earth: '#c99c6e',
  rockTop: '#b4b8bd', rockSide: '#8f949c', riverTop: '#7fc4d8', riverSide: '#5d94a8',
  walls: ['#fbf3e6', '#f5c2b0', '#b5dccb', '#a9cbe8', '#f7df8f', '#e9c9e6'],
  roofs: ['#d9644a', '#4f7fb8', '#e0874f', '#6a5a8e', '#3f8f86', '#c9504a'],
  pine: ['#3f8a5a', '#4f9c63'], leaf: ['#7fc36a', '#9ad06f', '#6fb35e'], trunk: '#8a5a3c',
  win: '#4d5c74', warm: '#ffc676', wood: '#a8764e', woodDark: '#7d5436',
  solar: '#2e4d70', concrete: '#cfccc2', steel: '#8a8f96', accent: '#e8a13c',
};

// —— layout: one main island (Luzon-like, elongated N–S) + two islets ——
// main M at (0,0) r=4 (stretched: |q|<=4, |r|<=5 ellipse-ish); islets E (7,-5) r=2, W (-7,6) r=2
const TRIM = new Set(['4,-5', '-4,5', '3,4', '-3,-4']);
function buildLayout() {
  const cells = [];
  const push = (q, r, isl) => {
    const key = q + ',' + r; if (TRIM.has(key)) return;
    const [x, z] = hex2w(q, r);
    let type = 'grass', h = .8;
    if (isl === 'M') {
      const e = (q * q) / 20 + (r * r) / 30;         // ellipse falloff
      if (e < .18) h = 1.25; else if (e < .45) h = .95 + hash(q * 3 + r * 7) * .15;
      else if (e < .75) { h = .62; if (hash(q * 5 - r * 11) > .5) type = 'sand'; }
      else { type = 'sand'; h = .38; }
      if (q === 1 && r >= -3 && r <= 1) { type = 'river'; h = .22; }       // river valley (hydro)
      if ((q === -2 && r === -3) || (q === -1 && r === -4)) { type = 'rock'; h = 1.05; }  // volcanic ridge (geothermal)
      if (key === '2,-4') { type = 'rock'; h = .9; }                        // Bataan headland
    } else {
      const d = hdist(q - (isl === 'E' ? 7 : -7), r - (isl === 'E' ? -5 : 6));
      if (d === 0) h = .9; else if (d === 1) h = .62; else { type = 'sand'; h = .38; }
      if (isl === 'W' && d >= 1) type = 'sand';
    }
    cells.push({ q, r, x, z, key, type, h, isl });
  };
  for (let q = -5; q <= 5; q++) for (let r = -6; r <= 6; r++)
    if ((q * q) / 22 + (r * r) / 34 <= 1) push(q, r, 'M');
  for (const [isl, cq, cr, rad] of [['E', 7, -5, 2], ['W', -7, 6, 2]])
    for (let q = cq - rad; q <= cq + rad; q++) for (let r = cr - rad; r <= cr + rad; r++)
      if (hdist(q - cq, r - cr) <= rad) push(q, r, isl);
  return cells;
}
export const CELLS = buildLayout();
export const byKey = k => CELLS.find(c => c.key === k);

// —— arrival curves (STYLE.md §5) ——
const riseY = s => {
  if (s < -.5) return null;
  if (s < 0) { const u = 1 + s / .5; return -3.2 * Math.pow(1 - u, 3); }
  return Math.sin(s * 13) * Math.exp(-s * 7) * .18;
};
const dropY = (s, h0 = 2.4, dur = .22) => {
  if (s < -dur) return null;
  if (s < 0) { const u = 1 + s / dur; return { y: h0 * (1 - u * u), sy: 1 + .12 * u }; }
  return { y: Math.abs(Math.sin(s * 15)) * Math.exp(-s * 9) * .22, sy: 1 - .16 * Math.exp(-s * 12) * Math.cos(s * 26) };
};
const popS = s => s < 0 ? 0 : s > 1.2 ? 1 : 1 - Math.exp(-s * 9) * Math.cos(s * 17);

// —— geometry pieces ——
function hexPrism(r, h, top, side, y0 = -3.4) {
  const g = new THREE.Group();
  const bt = h - .1;
  const body = M(new THREE.CylinderGeometry(r * .985, r * .985, bt - y0, 6, 1), mat(side));
  body.position.y = (bt + y0) / 2; g.add(body);
  const cap = M(new THREE.CylinderGeometry(r, r, .16, 6, 1), mat(top)); cap.position.y = h - .08; g.add(cap);
  return g;
}
function gable(w, d, h, over = .08) {
  const W = w / 2 + over, D = d / 2 + over, g = new THREE.BufferGeometry();
  const v = [-W, 0, -D, W, h, 0, W, 0, -D, -W, 0, -D, -W, h, 0, W, h, 0, -W, 0, D, W, h, 0, -W, h, 0, -W, 0, D, W, 0, D, W, h, 0,
    -W, 0, -D, W, 0, D, -W, 0, D, -W, 0, -D, W, 0, -D, W, 0, D];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}
function makeHouse(i, floors, winMat) {
  const root = new THREE.Group(), parts = [];
  const wall = mat(PAL.walls[i % 6]), Wd = .92, FH = .62;
  for (let f = 0; f < floors; f++) {
    const fl = new THREE.Group();
    const body = M(new THREE.BoxGeometry(Wd, FH, Wd), wall); body.position.y = FH / 2; fl.add(body);
    const wg = new THREE.PlaneGeometry(.17, .23);
    for (let s = 0; s < 4; s++) {
      const a = s * Math.PI / 2;
      for (let j = 0; j < 2; j++) {
        const wm = new THREE.Mesh(wg, winMat), off = (j - .5) * .42;
        wm.position.set(Math.sin(a) * (Wd / 2 + .004) + Math.cos(a) * off, FH * .55, Math.cos(a) * (Wd / 2 + .004) - Math.sin(a) * off);
        wm.rotation.y = a; fl.add(wm);
      }
    }
    fl.position.y = f * FH; root.add(fl); parts.push({ obj: fl, y: f * FH, kind: 'floor' });
  }
  const roof = new THREE.Group();
  roof.add(M(gable(Wd, Wd, .5), mat(PAL.roofs[i % 6])));
  roof.position.y = floors * FH; root.add(roof); parts.push({ obj: roof, y: floors * FH, kind: 'roof' });
  return { root, parts, winMat, top: floors * FH + .5 };
}
function makeTree(kind, s) {
  const g = new THREE.Group();
  if (kind === 'pine') {
    const tr = M(new THREE.CylinderGeometry(.06, .08, .3, 5), mat(PAL.trunk)); tr.position.y = .15; g.add(tr);
    const c1 = M(new THREE.ConeGeometry(.36, .62, 6), mat(PAL.pine[0])); c1.position.y = .55; g.add(c1);
    const c2 = M(new THREE.ConeGeometry(.26, .5, 6), mat(PAL.pine[1])); c2.position.y = .92; c2.rotation.y = .5; g.add(c2);
  } else {
    const tr = M(new THREE.CylinderGeometry(.06, .08, .34, 5), mat(PAL.trunk)); tr.position.y = .17; g.add(tr);
    const c = M(new THREE.IcosahedronGeometry(.36, 0), mat(PAL.leaf[Math.floor(s * 3) % 3])); c.position.y = .6; c.rotation.set(s * 3, s * 5, 0); g.add(c);
  }
  return g;
}
// Modern wind turbine: tapered tower, nacelle, 3 blades (turns in update)
function makeTurbine() {
  const g = new THREE.Group();
  const tower = M(new THREE.CylinderGeometry(.07, .13, 1.9, 6), mat('#f4f2ec')); tower.position.y = .95; g.add(tower);
  const nac = M(new THREE.BoxGeometry(.16, .16, .34), mat('#e8e4da')); nac.position.set(0, 1.92, .1); g.add(nac);
  const hub = new THREE.Group(); hub.position.set(0, 1.92, .3);
  for (let k = 0; k < 3; k++) {
    const bl = new THREE.Group(); bl.rotation.z = k * TAU / 3;
    const b = M(new THREE.BoxGeometry(.07, .85, .02), mat('#fbfaf6'), false); b.position.y = .5; bl.add(b);
    hub.add(bl);
  }
  g.add(hub);
  return { g, tower, hub };
}
function makeCoolingTower() {
  const g = new THREE.Group(), parts = [];
  const base = M(new THREE.CylinderGeometry(.85, .9, .3, 10), mat(PAL.concrete)); base.position.y = .15; g.add(base); parts.push({ obj: base, y: .15, kind: 'floor' });
  const tw = M(new THREE.CylinderGeometry(.58, .82, 1.7, 10), mat(PAL.concrete)); tw.position.y = 1.15; g.add(tw); parts.push({ obj: tw, y: 1.15, kind: 'floor' });
  return { g, parts, topY: 2.0 };
}
function makeReactorDome() {
  const g = new THREE.Group(), parts = [];
  const base = M(new THREE.CylinderGeometry(1.0, 1.05, .5, 12), mat(PAL.concrete)); base.position.y = .25; g.add(base); parts.push({ obj: base, y: .25, kind: 'floor' });
  const dome = M(new THREE.SphereGeometry(.95, 12, 8, 0, TAU, 0, Math.PI / 2), mat('#e4ded2')); dome.position.y = .5; g.add(dome); parts.push({ obj: dome, y: .5, kind: 'pop' });
  const winMat = new THREE.MeshStandardMaterial({ color: PAL.win, emissive: PAL.warm, emissiveIntensity: 0, flatShading: true, roughness: .4 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, w = new THREE.Mesh(new THREE.PlaneGeometry(.2, .16), winMat);
    w.position.set(Math.sin(a) * 1.01, .3, Math.cos(a) * 1.01); w.rotation.y = a; g.add(w); }
  return { g, parts, winMat };
}
function makeTurbineHall() {
  const g = new THREE.Group(), parts = [];
  const b = M(new THREE.BoxGeometry(1.6, .7, 1.1), mat('#f4efe4')); b.position.y = .35; g.add(b); parts.push({ obj: b, y: .35, kind: 'floor' });
  const rf = M(new THREE.BoxGeometry(1.7, .12, 1.2), mat('#4f7fb8')); rf.position.y = .76; g.add(rf); parts.push({ obj: rf, y: .76, kind: 'roof' });
  return { g, parts };
}
function makeDam() {
  const g = new THREE.Group(), parts = [];
  for (let i = 0; i < 3; i++) {
    const b = M(new THREE.BoxGeometry(.95, .55, 1.5), mat(i % 2 ? '#b9b5a9' : '#c9c5b8'));
    b.position.set((i - 1) * .98, .27, 0); g.add(b); parts.push({ obj: b, y: .27, kind: 'floor', x: (i - 1) * .98 });
  }
  const spill = M(new THREE.BoxGeometry(2.9, .5, .06), mat('#f4fdff', { transparent: true, opacity: 0 }), false);
  spill.position.set(0, .35, .78); g.add(spill);
  return { g, parts, spill };
}
function makeSolarPanel() {
  const g = new THREE.Group();
  const post = M(new THREE.CylinderGeometry(.04, .05, .4, 5), mat('#8a8f96')); post.position.y = .2; g.add(post);
  const p = M(new THREE.BoxGeometry(.72, .05, .5), mat(PAL.solar, { roughness: .4, metalness: .3 })); p.position.y = .44; p.rotation.x = -.42; g.add(p);
  const frame = M(new THREE.BoxGeometry(.78, .03, .56), mat('#d9d5cc')); frame.position.y = .42; frame.rotation.x = -.42; g.add(frame);
  return g;
}
function makeVent() {
  const g = new THREE.Group();
  const cone = M(new THREE.ConeGeometry(.3, .5, 7), mat(PAL.rockSide)); cone.position.y = .25; g.add(cone);
  const mouth = M(new THREE.CylinderGeometry(.12, .12, .06, 7), mat('#5a5e66')); mouth.position.y = .5; g.add(mouth);
  return { g, mouthY: .53 };
}
// Transmission pylon: tapered lattice-ish tower, 2 crossarms, red warning beacon
function makePylon() {
  const g = new THREE.Group(), parts = [];
  const tw = M(new THREE.CylinderGeometry(.09, .2, 1.5, 4), mat(PAL.steel)); tw.position.y = .75; tw.rotation.y = Math.PI / 4; g.add(tw); parts.push({ obj: tw, y: .75, kind: 'floor' });
  for (const hy of [1.15, 1.42]) {
    const arm = M(new THREE.BoxGeometry(.85, .07, .07), mat(PAL.steel)); arm.position.y = hy; g.add(arm); parts.push({ obj: arm, y: hy, kind: 'pop' });
  }
  const blm = new THREE.MeshStandardMaterial({ color: '#ffd0a0', emissive: '#ff5a4a', emissiveIntensity: 0, flatShading: true });
  const bc = new THREE.Mesh(new THREE.OctahedronGeometry(.06, 0), blm); bc.position.y = 1.56; g.add(bc);
  return { g, parts, blm, armY: [1.15, 1.42], topY: 1.5 };
}
function makeLamp() {
  const g = new THREE.Group();
  const post = M(new THREE.CylinderGeometry(.03, .035, .7, 5), mat('#3d4250')); post.position.y = .35; g.add(post);
  const lm = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: PAL.warm, emissiveIntensity: 0, flatShading: true });
  const head = M(new THREE.OctahedronGeometry(.08, 0), lm, false); head.position.y = .76; g.add(head);
  return { g, lm };
}
function makeBird() {
  const g = new THREE.Group(), wm = mat('#fbfbf6', { side: THREE.DoubleSide });
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.07, 0, 0, .07, .4, 0, 0], 3)); wg.computeVertexNormals();
  const L = new THREE.Mesh(wg, wm), Rr = new THREE.Mesh(wg, wm); Rr.scale.x = -1;
  const body = M(new THREE.ConeGeometry(.05, .3, 4), mat('#f4f4ee')); body.rotation.x = Math.PI / 2;
  g.add(L, Rr, body); g.visible = false;
  return { g, L, R: Rr };
}
function makeFishingBoat() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const hg = new THREE.BoxGeometry(1.1, .26, .5, 2, 1, 1), p = hg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); if (x > .35) p.setZ(i, p.getZ(i) * .18); if (p.getY(i) < 0) p.setZ(i, p.getZ(i) * .7); }
  hg.computeVertexNormals();
  const hull = M(hg, mat('#4f9c9e')); hull.position.y = .1; body.add(hull);
  const lampM = new THREE.MeshStandardMaterial({ color: '#ffe6a8', emissive: '#ffc676', emissiveIntensity: 0, flatShading: true });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(.08, .1, .08), lampM); lamp.position.set(.35, .35, 0); body.add(lamp);
  return { g, body, lampM };
}

// ═══════════════════════ buildWorld ═══════════════════════════════
export function buildWorld(scene) {
  const W = {};
  const S = new THREE.Group(); scene.add(S);
  const EVS = [];
  const ev = (t, type, o = {}) => { EVS.push({ t: +t.toFixed(4), type, ...o }); };

  // —— tiles: settled before t=0 (dim opening), foam shorelines ——
  const tiles = CELLS.map(c => {
    const j = (hash(c.q * 17 + c.r * 31) - .5) * .08;
    let top = PAL.grassTop, side = PAL.earth;
    if (c.type === 'sand') { top = PAL.sandTop; side = PAL.sandSide; }
    if (c.type === 'rock') { top = PAL.rockTop; side = PAL.rockSide; }
    if (c.type === 'river') { top = PAL.riverTop; side = PAL.riverSide; }
    if (c.type === 'grass' && hash(c.q * 5 - c.r * 11) > .55) top = PAL.grassTop2;
    const g = hexPrism(1, c.h, jit(top, j), jit(side, j * .7)); g.position.set(c.x, 0, c.z); S.add(g);
    const foam = new THREE.Mesh(new THREE.RingGeometry(.99, 1.12, 6, 1, Math.PI / 6),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .28, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(c.x, .07, c.z);
    foam.visible = (c.type === 'sand'); S.add(foam);
    return { c, g, foam };
  });

  // —— base trees (already there) ——
  const trees = [];
  const addTree = (key, kind, t0 = -1, dx = 0, dz = 0) => {
    const c = byKey(key); if (!c) return;
    const g = makeTree(kind, hash(trees.length * 3.1)); g.position.set(c.x + dx, c.h, c.z + dz);
    g.rotation.y = hash(trees.length) * TAU; S.add(g); trees.push({ g, t0, s: .9 + hash(trees.length * 7) * .25 });
  };
  [['0,1', 'pine'], ['-1,1', 'round'], ['-3,0', 'pine'], ['1,3', 'round'], ['-1,3', 'round'],
   ['3,-1', 'pine'], ['0,3', 'round'], ['-3,2', 'round'], ['7,-5', 'round'], ['-7,6', 'round'],
   ['2,2', 'round'], ['-2,4', 'pine']].forEach(([k, kind]) => addTree(k, kind));

  // —— base town (dim at open, windows light at 50–65 s) ——
  const houses = [];
  const addHouse = (key, i, floors, t0s, litT) => {
    const c = byKey(key); if (!c) return null;
    const winMat = new THREE.MeshStandardMaterial({ color: PAL.win, emissive: PAL.warm, emissiveIntensity: 0, flatShading: true, roughness: .4 });
    const H = makeHouse(i, floors, winMat);
    H.root.position.set(c.x, c.h, c.z); H.root.rotation.y = hash(i * 7) * TAU; S.add(H.root);
    H.parts.forEach((p, pi) => { p.t0 = t0s ? t0s[pi] : -1; });
    houses.push({ ...H, litT }); return H;
  };
  // old town on main island (there from the start, lit later); islet villages
  addHouse('-2,1', 0, 1, null, 52); addHouse('-2,2', 1, 1, null, 54); addHouse('-3,1', 2, 2, null, 56);
  addHouse('7,-5', 3, 1, null, 58); addHouse('-7,6', 4, 1, null, 60);
  // new houses stack during 50–65 s
  addHouse('-1,2', 5, 1, [51.5, 51.9], 62); addHouse('0,2', 6, 1, [53.0, 53.4], 63);
  addHouse('1,2', 7, 2, [54.5, 54.9], 64);
  houses.forEach((H, i) => { if (H.parts[0].t0 > 0) { ev(H.parts[0].t0, 'floor', { what: 'house' }); ev(H.parts[1].t0, 'roof', { what: 'house roof' }); } });

  // —— 8–20 s · BATAAN: reactor dome + cooling tower + turbine hall (close-up) ——
  const bataanWinMats = [];
  const dome = makeReactorDome(); { const c = byKey('2,-4'); dome.g.position.set(c.x, c.h, c.z); S.add(dome.g); bataanWinMats.push(dome.winMat); }
  dome.parts[0].t0 = 9.0; dome.parts[1].t0 = 9.6;
  ev(9.0, 'floor', { what: 'reactor base' }); ev(9.6, 'pop', { what: 'reactor dome' });
  const ctow = makeCoolingTower(); { const c = byKey('3,-4'); if (c) { ctow.g.position.set(c.x, c.h, c.z); S.add(ctow.g); } else { const c2 = byKey('2,-3'); ctow.g.position.set(c2.x + .4, c2.h, c2.z); S.add(ctow.g); } }
  ctow.parts[0].t0 = 10.4; ctow.parts[1].t0 = 11.0;
  ev(10.4, 'floor', { what: 'cooling tower base' }); ev(11.0, 'floor', { what: 'cooling tower' });
  const hall = makeTurbineHall(); { const c = byKey('1,-4'); if (c) { hall.g.position.set(c.x, c.h, c.z); S.add(hall.g); } }
  if (hall.g.parent) { hall.parts[0].t0 = 11.8; hall.parts[1].t0 = 12.3; ev(11.8, 'floor', { what: 'turbine hall' }); ev(12.3, 'roof', { what: 'hall roof' }); }
  const bataanSteam = { x: 0, z: 0, t0: 12.8 };
  { const c = byKey('3,-4') || byKey('2,-3'); bataanSteam.x = c.x; bataanSteam.z = c.z; }
  ev(12.8, 'rise', { what: 'cooling steam' });
  const bataanLitT = 14.0;   // windows warm as the label lands

  // —— 20–35 s · GEOTHERMAL: volcanic vents pop, steam forever, pipes stack ——
  const vents = [];
  [['-2,-3'], ['-1,-4']].forEach(([k], i) => {
    const c = byKey(k); if (!c) return;
    const v = makeVent(); v.g.position.set(c.x, c.h, c.z); v.g.scale.setScalar(0); S.add(v.g);
    const t0 = [22.0, 22.6][i]; vents.push({ ...v, t0 }); ev(t0, 'pop', { what: 'geothermal vent' });
  });
  const geoPipes = [];
  [['-2,-2'], ['-1,-3']].forEach(([k], i) => {
    const c = byKey(k); if (!c) return;
    const p = M(new THREE.CylinderGeometry(.09, .09, 1.1, 6), mat(PAL.steel)); p.rotation.z = Math.PI / 2;
    p.position.set(c.x, c.h + .1, c.z); p.scale.setScalar(0); S.add(p);
    const t0 = [26.0, 26.8][i]; geoPipes.push({ g: p, t0 }); ev(t0, 'pop', { what: 'steam pipe' });
  });

  // —— 35–50 s · HYDRO: dam drops · WIND: turbines pop+turn · SOLAR: rows pop ——
  const dam = makeDam(); { const c = byKey('1,-1'); dam.g.position.set(c.x, c.h, c.z); dam.g.rotation.y = Math.PI / 2; S.add(dam.g); }
  dam.parts.forEach((p, i) => { p.t0 = [36.0, 36.4, 36.8][i]; ev(p.t0, 'floor', { what: 'dam block' }); });
  ev(37.2, 'rise', { what: 'dam spill' });
  const turbines = [];
  [['-3,-2'], ['-4,-1'], ['-3,0']].forEach(([k], i) => {
    const c = byKey(k); if (!c) return;
    const tb = makeTurbine(); tb.g.position.set(c.x, c.h, c.z); tb.g.rotation.y = hash(i * 3) * TAU; S.add(tb.g);
    const tT = [38.5, 39.2, 39.9][i], tH = [39.0, 39.7, 40.4][i];
    turbines.push({ ...tb, tT, tH }); ev(tT, 'floor', { what: 'turbine tower' }); ev(tH, 'pop', { what: 'turbine hub' });
  });
  const solars = [];
  [['2,0', -.25, 0], ['2,0', .25, .3], ['2,1', -.2, -.2], ['2,1', .3, .2], ['3,0', 0, .1], ['3,0', .3, -.3],
   ['1,1', -.2, .2], ['1,1', .25, -.15]].forEach(([k, dx, dz], i) => {
    const c = byKey(k); if (!c) return;
    const p = makeSolarPanel(); p.position.set(c.x + dx, c.h, c.z + dz); p.rotation.y = hash(i) * TAU; p.scale.setScalar(0); S.add(p);
    const t0 = 42.0 + i * .3; solars.push({ g: p, t0 }); ev(t0, 'pop', { what: 'solar panel' });
  });

  // —— 50–65 s · TRANSMISSION: pylons pop along a path, wires draw between them ——
  const pylonKeys = ['0,-1', '0,0', '0,1', '-1,2', '7,-4', '-6,5'];
  const pylons = [];
  pylonKeys.forEach((k, i) => {
    const c = byKey(k); if (!c) return;
    const P = makePylon(); P.g.position.set(c.x, c.h, c.z); P.g.rotation.y = hash(i * 7) * .6; S.add(P.g);
    const t0 = 51.0 + i * 1.1;
    P.parts.forEach((p, pi) => { p.t0 = t0 + pi * .18; });
    pylons.push({ ...P, t0, c }); ev(t0, 'floor', { what: 'pylon' });
  });
  // wires: sagging tubes between consecutive pylons, drawn via drawRange
  const wires = [];
  const wireMat = new THREE.MeshBasicMaterial({ color: '#2e3138' });
  for (let i = 0; i < pylons.length - 1; i++) {
    const A = pylons[i], B = pylons[i + 1];
    if (!A || !B) continue;
    const a = new THREE.Vector3(A.c.x, A.c.h + A.armY[1], A.c.z), b = new THREE.Vector3(B.c.x, B.c.h + B.armY[1], B.c.z);
    const mid = a.clone().lerp(b, .5); mid.y -= a.distanceTo(b) * .12 + .25;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.TubeGeometry(curve, 24, .022, 4, false);
    const total = geo.index.count;
    geo.setDrawRange(0, 0);
    const m = new THREE.Mesh(geo, wireMat); m.frustumCulled = false; S.add(m);
    const t0 = 52.5 + i * 1.1;
    wires.push({ m, total, t0 }); ev(t0, 'rise', { what: 'wire span' });
  }

  // —— lamps along the town (pop 55–63 s, glow at night) ——
  const lamps = [];
  [['-2,0'], ['-1,1'], ['0,1']].forEach(([k], i) => {
    const c = byKey(k); if (!c) return;
    const l = makeLamp(); l.g.position.set(c.x + .3, c.h + .1, c.z - .2); l.g.scale.setScalar(0); S.add(l.g);
    const t0 = 55 + i * 1.5; lamps.push({ ...l, t0 }); ev(t0, 'pop', { what: 'lamp' });
  });

  // —— boats + birds (life throughout) ——
  const boats = [];
  [[6.0, [24, 8], [10, -2]], [30.0, [-20, 14], [-9, 9]], [58.0, [26, -6], [11, 3]]].forEach(([t0, from, to], i) => {
    const b = makeFishingBoat(); S.add(b.g);
    boats.push({ ...b, t0, from, to }); ev(t0, 'pop', { what: 'boat' });
  });
  const birds = [0, 1, 2].map(i => { const b = makeBird(); S.add(b.g); return { ...b, ph: i * 2.1, rad: 6 + i * 1.4, hgt: 4.6 + i * .6, sp: .45 - i * .05, cx: 0, cz: 2 }; });
  ev(12.0, 'pop', { what: 'birds' }); const birdsT = 12.0;

  // —— splash rings (shared) ——
  const splashes = [];
  const addSplash = (x, z, t0, big = 0) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.14, 6, 1, Math.PI / 6),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .1, z); m.visible = false; S.add(m);
    splashes.push({ x, z, t0, big, m });
  };
  { const c = byKey('2,-4'); addSplash(c.x, c.z, 9.0, 1); }
  dam.parts.forEach(() => {}); { const c = byKey('1,-1'); addSplash(c.x, c.z, 36.0, 1); }
  const DROP_N = 14, dropMesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.09, 0),
    new THREE.MeshBasicMaterial({ color: '#f4fdff' }), splashes.length * DROP_N + 16);
  dropMesh.castShadow = false; dropMesh.frustumCulled = false; S.add(dropMesh);

  // —— steam / smoke (instanced) ——
  const steam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.09, 0),
    new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: .8 }), 160);
  steam.castShadow = false; steam.frustumCulled = false; S.add(steam);
  const _c = new THREE.Color();
  const emitters = [];
  vents.forEach(v => { v.g.updateMatrixWorld(true); const p = v.g.localToWorld(new THREE.Vector3(0, v.mouthY, 0));
    emitters.push({ x: p.x, y: p.y, z: p.z, t0: v.t0, n: 9, size: 1.2, rise: 1.7, col: '#f6f4f0', sp: .5 }); });
  emitters.push({ x: bataanSteam.x, y: (byKey('3,-4') || byKey('2,-3')).h + 2.1, z: bataanSteam.z, t0: bataanSteam.t0, n: 7, size: 1.6, rise: 1.9, col: '#f6f4f0', sp: .4 });

  // —— MIDI notes for the score: rising pentatonic across the build ——
  const pitched = EVS.filter(e => e.t >= 0).sort((a, b) => a.t - b.t);
  const PO = []; for (let o = 0; o < 4; o++) for (const s of [0, 2, 4, 7, 9]) PO.push(12 * o + s);
  pitched.forEach((e, i) => { e.note = 48 + PO[Math.round(i / (pitched.length - 1) * (PO.length - 1))]; });
  W.EVS = pitched;

  // —— per-frame update ——
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(),
        _v = new THREE.Vector3(), _s = new THREE.Vector3();
  const nightAmt = t => ss(seg(t, 66, 76));       // 0 day → 1 night
  const dayDim = t => 1 - ss(seg(t, 30, 62)) * .0; // (kept 1; day brightness handled by sky)

  W.update = (t, ctx) => {
    const night = nightAmt(t), day = 1 - night;
    const blobs = [];
    for (const T0 of tiles) blobs.push([T0.c.x, T0.c.z, 2.6, 1]);
    // foam shimmer
    for (const T0 of tiles) if (T0.foam.visible) {
      T0.foam.material.opacity = .28 * (.7 + .3 * Math.sin(t * 1.7 + T0.c.q)) * (.35 + .65 * day);
    }
    for (const tr of trees) { const s = popS(t - tr.t0) * tr.s; tr.g.scale.setScalar(Math.max(s, .0001)); tr.g.visible = s > 0; }
    // houses: stack + windows glow from litT, stronger at night
    for (const H of houses) {
      H.root.visible = t > H.parts[0].t0 - .3;
      for (const p of H.parts) {
        const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
        p.obj.visible = true; p.obj.position.y = p.y + d.y; p.obj.scale.set(1 / Math.sqrt(d.sy), d.sy, 1 / Math.sqrt(d.sy));
      }
      const lit = ss(seg(t, H.litT - .05, H.litT + .15));
      H.winMat.emissiveIntensity = lit * (.9 + 1.6 * night);
    }
    // BATAAN
    dome.g.visible = t > 8.7;
    for (const p of dome.parts) {
      if (p.kind === 'pop') { const s = popS(t - p.t0); p.obj.scale.setScalar(Math.max(s, .0001)); p.obj.visible = s > 0; continue; }
      const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
      p.obj.visible = true; p.obj.position.y = p.y + d.y; p.obj.scale.set(1 / Math.sqrt(d.sy), d.sy, 1 / Math.sqrt(d.sy));
    }
    dome.winMat.emissiveIntensity = ss(seg(t, bataanLitT, bataanLitT + .2)) * (.7 + 1.8 * night);
    ctow.g.visible = t > 10.1;
    for (const p of ctow.parts) { const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
      p.obj.visible = true; p.obj.position.y = p.y + d.y; p.obj.scale.set(1 / Math.sqrt(d.sy), d.sy, 1 / Math.sqrt(d.sy)); }
    if (hall.g.parent) { hall.g.visible = t > 11.5;
      for (const p of hall.parts) { const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
        p.obj.visible = true; p.obj.position.y = p.y + d.y; p.obj.scale.set(1 / Math.sqrt(d.sy), d.sy, 1 / Math.sqrt(d.sy)); } }
    // geothermal
    for (const v of vents) { const s = popS(t - v.t0); v.g.scale.setScalar(Math.max(s, .0001)); v.g.visible = s > 0; }
    for (const p of geoPipes) { const s = popS(t - p.t0); p.g.scale.setScalar(Math.max(s, .0001)); p.g.visible = s > 0; }
    // dam
    dam.g.visible = t > 35.7;
    for (const p of dam.parts) { const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
      p.obj.visible = true; p.obj.position.x = p.x; p.obj.position.y = p.y + d.y; p.obj.scale.set(1 / Math.sqrt(d.sy), d.sy, 1 / Math.sqrt(d.sy)); }
    dam.spill.material.opacity = .75 * ss(seg(t, 37.2, 37.6));
    // turbines
    for (const m of turbines) {
      const dt = dropY(t - m.tT);
      m.tower.visible = !!dt;
      if (dt) { m.tower.position.y = .95 + dt.y; m.tower.scale.y = dt.sy; }
      const hs = popS(t - m.tH); m.hub.visible = hs > 0; m.hub.scale.setScalar(Math.max(hs, .0001));
      if (hs > 0) m.hub.rotation.z = -(t - m.tH) * 2.6;
    }
    for (const p of solars) { const s = popS(t - p.t0); p.g.scale.setScalar(Math.max(s, .0001)); p.g.visible = s > 0; }
    // pylons + wires
    for (const P of pylons) {
      P.g.visible = t > P.t0 - .3;
      for (const p of P.parts) {
        if (p.kind === 'pop') { const s = popS(t - p.t0); p.obj.scale.setScalar(Math.max(s, .0001)); p.obj.visible = s > 0; continue; }
        const d = dropY(t - p.t0); if (!d) { p.obj.visible = false; continue; }
        p.obj.visible = true; p.obj.position.y = p.y + d.y;
      }
      P.blm.emissiveIntensity = night * (1.4 + 1.2 * Math.sin(t * 5 + P.t0));
    }
    for (const w of wires) {
      const u = ss(seg(t, w.t0, w.t0 + 1.4));
      w.m.geometry.setDrawRange(0, Math.floor(w.total * u / 3) * 3);
      w.m.visible = u > 0;
    }
    for (const l of lamps) { const s = popS(t - l.t0); l.g.scale.setScalar(Math.max(s, .0001)); l.g.visible = s > 0;
      l.lm.emissiveIntensity = night * 1.6; }
    // boats
    for (const B of boats) {
      const vis = t > B.t0 - .2; B.g.visible = vis; if (!vis) continue;
      const u = ss(seg(t, B.t0, B.t0 + 3.2));
      const x = lerp(B.from[0], B.to[0], u), z = lerp(B.from[1], B.to[1], u);
      B.g.position.set(x, waveH(x, z, t, 1) + .03, z);
      B.g.rotation.set(Math.sin(t * 2.2 + B.t0) * .06, Math.atan2(-(B.to[1] - B.from[1]), B.to[0] - B.from[0]), Math.sin(t * 1.8 + B.t0) * .05);
      B.lampM.emissiveIntensity = night * 1.5;
    }
    for (const Bd of birds) {
      const vis = t > birdsT; Bd.g.visible = vis; if (!vis) continue;
      const a = Bd.ph + t * Bd.sp;
      Bd.g.position.set(Bd.cx + Math.cos(a) * Bd.rad, Bd.hgt + Math.sin(t * 1.2 + Bd.ph) * .4, Bd.cz + Math.sin(a) * Bd.rad);
      Bd.g.rotation.y = -a; const f = Math.sin(t * 9 + Bd.ph * 3) * .55; Bd.L.rotation.z = f; Bd.R.rotation.z = -f;
    }
    // splashes
    let di = 0;
    for (const sp of splashes) {
      const s = t - sp.t0, rg = sp.m;
      if (s > -.12 && s < .9) {
        rg.visible = true; rg.scale.setScalar((1 + s * 1.4) * (1 + sp.big * .8)); rg.material.opacity = .65 * (1 - s / .9);
        if (s > 0 && s < .7) {
          const n = sp.big ? DROP_N + 8 : DROP_N;
          for (let k = 0; k < n && di < dropMesh.instanceMatrix.count - 1; k++) {
            const a = k / n * TAU + hash(sp.x * 31 + k), rad = 1.6 + hash(k * 7 + sp.x) * 1.6 * (1 + sp.big);
            const vy = (3.4 + hash(k * 3 + sp.z * 5) * 2.6) * (1 + sp.big * .7), yy = vy * s - 7.5 * s * s;
            if (yy < -.1) continue;
            _v.set(sp.x + Math.cos(a) * (.9 + rad * s), yy, sp.z + Math.sin(a) * (.9 + rad * s));
            _e.set(s * 9 + k, s * 7, 0); _q.setFromEuler(_e); _s.setScalar((1 - s / 1.1) * (1 + sp.big * .6));
            dropMesh.setMatrixAt(di++, _m.compose(_v, _q, _s));
          }
        }
      } else rg.visible = false;
    }
    dropMesh.count = di; dropMesh.instanceMatrix.needsUpdate = true;
    // steam
    let si = 0;
    for (const em of emitters) {
      if (t < em.t0) continue;
      for (let k = 0; k < em.n && si < 159; k++) {
        const ph = (t * em.sp + k / em.n + em.x * .13) % 1;
        _v.set(em.x + ph * .6 + Math.sin(ph * 6 + k * 2) * .1, em.y + ph * em.rise, em.z + ph * .3);
        _s.setScalar(em.size * (.5 + ph * 1.7) * (1 - ph * .55)); _q.identity();
        steam.setMatrixAt(si, _m.compose(_v, _q, _s));
        steam.setColorAt(si, _c.set(em.col));
        si++;
      }
    }
    steam.count = si; steam.instanceMatrix.needsUpdate = true;
    if (steam.instanceColor) steam.instanceColor.needsUpdate = true;
    ctx.sea.drawShallow(blobs);
  };

  Object.assign(W, { S, EVS, tiles, nightAmt });
  return W;
}
