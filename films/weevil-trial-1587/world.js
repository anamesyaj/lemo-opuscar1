// world.js — Four St-Julien 1587 physical 3D sets in Three.js r170:
//   Zone 1 (  0, 0,   0): Savoyard Vineyard Terrace (grapevines, posts, cottages)
//   Zone 2 (+52, 0,   0): Ecclesiastical Church Courtroom Nave (judge dais, velvet witness stand, oak table)
//   Zone 3 (-46, 0,   0): Barren Wasteland Hill "Le Grand Feisse" (rocks, fence, slanted deed sign, dead twig)
//   Zone 4 (  0, 0, -52): Midnight Candlelit Archive (lectern, candelabras, interactive biteable Verdict book)
// Every animation inside update(f) is 100% pure in frame number `f` for seamless parallel worker stitching.

import * as THREE from 'three';
import { LIGHTS, LOOK } from './lights.js';
import { clamp01, smooth } from './motion.js';

export const ZONES = {
  vineyard: [0, 0, 0],
  courtroom: [52, 0, 0],
  wasteland: [-46, 0, 0],
  archive: [0, 0, -52],
};

export function sunDirFromAzEl(az, el, camera) {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  let fx = fwd.x, fz = fwd.z;
  const n = Math.hypot(fx, fz) || 1;
  fx /= n; fz /= n;
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const hx = fx * Math.cos(a) - fz * Math.sin(a);
  const hz = fz * Math.cos(a) + fx * Math.sin(a);
  return new THREE.Vector3(hx * Math.cos(e), Math.sin(e), hz * Math.cos(e)).normalize();
}

function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const texCache = new Map();
function ctex(key, w, h, draw, repeat = true) {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), rng(key.length * 131 + key.charCodeAt(0)), cv);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texCache.set(key, t);
  return t;
}
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const U = (r, a, b) => a + (b - a) * r();
const TAU = Math.PI * 2;
function jitHex(r, hex, dv = 0.08, dh = 4, ds = 0.14) {
  const c = new THREE.Color(hex), hsl = {};
  c.getHSL(hsl);
  const k = (a) => 1 + (r() * 2 - 1) * a;
  c.setHSL(((hsl.h + ((r() * 2 - 1) * dh) / 360) % 1 + 1) % 1,
    Math.min(1, hsl.s * k(ds)), Math.min(0.96, hsl.l * k(dv)));
  return '#' + c.getHexString();
}

// ---------------- Canvas2D Painted Textures ----------------
function grassTex() {
  return ctex('vineGrass', 512, 512, (g, r) => {
    g.fillStyle = '#6da73d'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12; i++) {
      const x = U(r, 0, 512), y = U(r, 0, 512), rad = U(r, 60, 160);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() > 0.5 ? 'rgba(138,195,78,0.35)' : 'rgba(84,140,42,0.35)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 700; i++) {
      const x = U(r, 0, 512), y = U(r, 0, 512), h = U(r, 6, 13);
      g.strokeStyle = r() < 0.4 ? 'rgba(164,218,96,0.42)' : 'rgba(66,118,32,0.42)';
      g.beginPath(); g.moveTo(x - 2, y - h); g.lineTo(x, y); g.lineTo(x + 2, y - h * 0.8); g.stroke();
    }
  });
}

function stoneFloorTex() {
  return ctex('courtStone', 512, 512, (g, r) => {
    g.fillStyle = '#6e655a'; g.fillRect(0, 0, 512, 512);
    const cols = ['#a89b88', '#988b79', '#b6aa96', '#8d8172'];
    const S = 128, J = 4;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        g.fillStyle = jitHex(r, cols[(row + col) % cols.length], 0.08, 3, 0.1);
        g.fillRect(col * S + J, row * S + J, S - J * 2, S - J * 2);
      }
    }
  });
}

function ashlarWallTex() {
  return ctex('churchAshlar', 512, 512, (g, r) => {
    g.fillStyle = '#73685c'; g.fillRect(0, 0, 512, 512);
    const cols = ['#b8ab98', '#c6baaa', '#a99b89'];
    const RH = 64, J = 4;
    for (let row = 0; row < 8; row++) {
      let x = (row % 2) * 70;
      while (x < 512) {
        const w = U(r, 110, 180);
        g.fillStyle = jitHex(r, pick(r, cols), 0.08, 4, 0.12);
        g.fillRect(x + J / 2, row * RH + J / 2, w - J, RH - J);
        x += w;
      }
    }
  });
}

function woodTex(key = 'oakWood', col1 = '#8f5d38', col2 = '#724627') {
  return ctex(key, 512, 512, (g, r) => {
    g.fillStyle = col1; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = jitHex(r, i % 2 ? col1 : col2, 0.07, 3, 0.1);
      g.fillRect(0, i * 85, 512, 82);
      g.fillStyle = 'rgba(30,15,6,0.65)';
      g.fillRect(0, i * 85 + 82, 512, 3);
    }
    g.strokeStyle = 'rgba(40,20,8,0.25)'; g.lineWidth = 2;
    for (let k = 0; k < 28; k++) {
      const y = U(r, 0, 512);
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 6, 340, y - 6, 512, y); g.stroke();
    }
  });
}

function crackedDirtTex() {
  return ctex('barrenDirt', 512, 512, (g, r) => {
    g.fillStyle = '#c8aa7a'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 20; i++) {
      const x = U(r, 0, 512), y = U(r, 0, 512), rad = U(r, 35, 110);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() > 0.5 ? 'rgba(158,125,78,0.32)' : 'rgba(218,195,152,0.28)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Dry sun-baked earth crack network
    g.strokeStyle = 'rgba(92,65,38,0.55)'; g.lineWidth = 2.4;
    for (let i = 0; i < 36; i++) {
      let x = U(r, 0, 512), y = U(r, 0, 512);
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += U(r, -55, 55); y += U(r, -55, 55);
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 65; i++) {
      g.fillStyle = r() > 0.5 ? '#9e8868' : '#dfd2b8';
      g.beginPath(); g.arc(U(r, 0, 512), U(r, 0, 512), U(r, 2, 5.5), 0, TAU); g.fill();
    }
  });
}

function deedSignTex() {
  return ctex('deedSign', 512, 320, (g) => {
    g.fillStyle = '#c7965d'; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#3b2414'; g.lineWidth = 12; g.strokeRect(10, 10, 492, 300);
    g.fillStyle = '#f2e4c4'; g.fillRect(28, 28, 456, 264);
    g.strokeStyle = '#5a3a22'; g.lineWidth = 4; g.strokeRect(36, 36, 440, 248);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#5a221d';
    g.font = 'italic 30px "IM Fell English", Georgia, serif';
    g.fillText('FREE BUG RESERVE', 256, 86);
    g.fillStyle = '#241726';
    g.font = 'bold 46px "IM Fell English", Georgia, serif';
    g.fillText('LE GRAND FEISSE', 256, 152);
    g.fillStyle = '#6c5a46';
    g.font = '24px "IM Fell English", Georgia, serif';
    g.fillText('ST-JULIEN · 1587', 256, 224);
  }, false);
}

function deedTableTex() {
  return ctex('deedTableScroll', 512, 512, (g) => {
    g.fillStyle = '#f3e5c5'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#5c3c24'; g.lineWidth = 8; g.strokeRect(18, 18, 476, 476);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#8b2420';
    g.font = 'bold 34px "IM Fell English", Georgia, serif';
    g.fillText('ACT OF SETTLEMENT', 256, 84);
    g.fillStyle = '#241726';
    g.font = 'bold 44px "IM Fell English", Georgia, serif';
    g.fillText('LE GRAND FEISSE', 256, 152);
    // Crisp simplified plot map diagram inside parchment
    g.strokeStyle = '#4a3522'; g.lineWidth = 4;
    g.strokeRect(104, 198, 304, 184);
    g.fillStyle = '#d4b882'; g.fillRect(108, 202, 296, 176);
    g.strokeStyle = '#704e2e'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(140, 320); g.quadraticCurveTo(256, 230, 370, 330); g.stroke();
    g.fillStyle = '#b42b26';
    g.beginPath(); g.arc(380, 434, 34, 0, TAU); g.fill();
    g.strokeStyle = '#6d1815'; g.lineWidth = 4; g.stroke();
  }, false);
}

function ledgerLeftTex() {
  return ctex('ledgerLeft', 512, 640, (g) => {
    g.fillStyle = '#f2e4c7'; g.fillRect(0, 0, 512, 640);
    // Warm aged margin tone
    const gr = g.createLinearGradient(0, 0, 512, 0);
    gr.addColorStop(0, 'rgba(130,90,45,0.16)');
    gr.addColorStop(0.15, 'rgba(255,250,238,0.0)');
    gr.addColorStop(0.9, 'rgba(110,75,35,0.18)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#7c211d';
    g.font = 'bold 34px "IM Fell English", Georgia, serif';
    g.fillText('ACTA SANCTI JULIANI', 256, 86);
    g.strokeStyle = '#5c3c24'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(64, 118); g.lineTo(448, 118); g.stroke();
    g.strokeStyle = 'rgba(42,28,20,0.72)'; g.lineWidth = 3.5;
    for (let y = 164; y < 500; y += 34) {
      g.beginPath(); g.moveTo(66, y);
      for (let x = 90; x <= 440; x += 35) g.lineTo(x, y + Math.sin(x * 0.11 + y) * 3.5);
      g.stroke();
    }
    g.fillStyle = '#9e2620';
    g.beginPath(); g.arc(135, 558, 34, 0, TAU); g.fill();
  }, false);
}

function makeRightPageCanvas() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 640;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { cv, g: cv.getContext('2d'), tex, lastPct: -1 };
}

function paintRightPage(state, writePct, bitten = false, shadowPct = 0) {
  const step = Math.round(clamp01(writePct) * 24) / 24;
  const sStep = Math.round(clamp01(shadowPct) * 16) / 16;
  const key = `${step}|${bitten ? 1 : 0}|${sStep}`;
  if (key === state.lastPct) return;
  state.lastPct = key;
  const g = state.g;
  g.fillStyle = '#f5ead0'; g.fillRect(0, 0, 512, 640);
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(100,65,30,0.22)');
  gr.addColorStop(0.14, 'rgba(255,250,238,0)');
  gr.addColorStop(1, 'rgba(130,90,45,0.12)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);

  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#8b1f1c';
  g.font = 'bold 46px "IM Fell English", Georgia, serif';
  g.fillText('VERDICT:', 44, 90);
  g.strokeStyle = '#8b1f1c'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(44, 120); g.lineTo(340, 120); g.stroke();

  // Cursive handwritten lines smoothly written by Bishop's quill across 22.10..23.60 s
  g.strokeStyle = '#241726'; g.lineWidth = 5; g.lineCap = 'round';
  const rows = 6;
  for (let r = 0; r < rows; r++) {
    const rowStart = r / rows;
    const rowEnd = (r + 1) / rows;
    const p = clamp01((step - rowStart) / (rowEnd - rowStart));
    if (p <= 0) break;
    const y = 170 + r * 52;
    const xEnd = 68 + p * 340;
    g.beginPath(); g.moveTo(68, y);
    for (let x = 80; x <= xEnd; x += 18) g.lineTo(x, y + Math.sin(x * 0.17 + r * 2.1) * 5.2);
    g.stroke();
  }
  if (sStep > 0 && !bitten) {
    // Silence #2 suspense: dark creeping weevil head + clubbed antennae silhouette sliding onto VERDICT margin!
    const ox = 565 - sStep * 135;
    const oy = 375 - sStep * 42;
    g.save();
    g.fillStyle = 'rgba(26, 15, 28, 0.42)';
    g.strokeStyle = 'rgba(26, 15, 28, 0.42)';
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.ellipse(ox, oy + 45, 76, 62, -0.25, 0, TAU); g.fill();
    // Long snout + twin clubbed antennae reaching toward "VERDICT:"
    g.lineWidth = 22;
    g.beginPath(); g.moveTo(ox - 45, oy + 20); g.lineTo(ox - 108, oy - 8); g.stroke();
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(ox - 52, oy - 8); g.lineTo(ox - 104, oy - 62); g.lineTo(ox - 146, oy - 78); g.stroke();
    g.beginPath(); g.moveTo(ox - 32, oy - 22); g.lineTo(ox - 70, oy - 84); g.lineTo(ox - 112, oy - 106); g.stroke();
    g.beginPath(); g.arc(ox - 148, oy - 78, 12, 0, TAU); g.fill();
    g.beginPath(); g.arc(ox - 114, oy - 106, 12, 0, TAU); g.fill();
    g.restore();
  }
  if (bitten) {
    // Paint crisp cartoon jagged ink tooth border right along the geometric bite cutout
    const w = 0.58, h = 0.78, hw = w / 2, hh = h / 2;
    const biteCenterY = -0.06, biteR = 0.20, teeth = 14;
    g.strokeStyle = '#140c18'; g.lineWidth = 10; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= teeth; i++) {
      const ang = -Math.PI * 0.5 + (i / teeth) * (-Math.PI);
      const rr = biteR * (i % 2 ? 0.87 : 1.05);
      const bx = hw + Math.cos(ang) * rr * 1.18 - 0.03;
      const by = biteCenterY + Math.sin(ang) * rr * 0.92;
      const u = (bx + hw) / w, v = (by + hh) / h;
      const px = u * 512, py = (1 - v) * 640;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
  }
  state.tex.needsUpdate = true;
}

function cloudTex(seed, pal) {
  return ctex(`wCloud_${pal.lit}_${seed}`, 512, 256, (g, r) => {
    const base = 200;
    const lobes = [];
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const rad = (34 + 54 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.8, 1.15);
      lobes.push({ x: 75 + t * 362, y: base - rad * U(r, 0.35, 0.6), r: rad });
    }
    const layer = (dx, dy, k, col, blur) => {
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
      for (const l of lobes) {
        const x = l.x + dx * l.r, y = l.y + dy * l.r;
        g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU);
      }
      g.fill(); g.restore();
    };
    layer(0, 0, 1.0, pal.shade, 4);
    layer(-0.04, -0.12, 0.9, pal.mid, 5);
    layer(-0.1, -0.25, 0.72, pal.lit, 6);
  });
}

// ---------------- Two-Tone Cel Shader (r170 shadow capture fixed cleanly) ----------------
const TONE = {
  uLitCol: { value: new THREE.Vector3(1.5, 1.44, 1.32) },
  uShadeCol: { value: new THREE.Vector3(0.4, 0.42, 0.6) },
  uShadeLift: { value: new THREE.Vector3() },
  uLambert: { value: 0.35 }, uSideK: { value: 0.84 }, uTerm: { value: 0.2 },
  uBounce: { value: new THREE.Vector3() },
  uSat: { value: 1 },
};
const TWO_TONE_DECL = '#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;';
const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  reflectedLight.directDiffuse = alb * ( mix( uShadeCol, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + uShadeLift * LIFT_K * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );
}
#endif
`;

function twoTone(m, liftK = 1) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    const raw = THREE.ShaderChunk.lights_fragment_begin;
    const patched = raw.replace(
      /directLight\.color \*= (\(\s*directLight\.visible && receiveShadow\s*\) \? getShadow\([\s\S]*?vDirectionalShadowCoord\[ i \] \) : 1\.0);/,
      'sunVis = $1;\n\t\tdirectLight.color *= sunVis;'
    );
    const lfb = patched.includes('sunVis =') ? patched : raw;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', TWO_TONE_DECL + `\n#define LIFT_K ${liftK.toFixed(3)}`)
      .replace('#include <lights_fragment_begin>', 'float sunVis = 1.0;\n' + lfb)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + TWO_TONE);
  };
  m.customProgramCacheKey = () => 'twoToneR170_' + liftK.toFixed(3);
  return m;
}
const matCache = new Map();
function lam(key, make) {
  let m = matCache.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); matCache.set(key, m); }
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Helper: build custom ShapeGeometry with properly normalized forward planar UV [0..1, 0..1]
function makeChewedPageGeometry(w, h) {
  const hw = w / 2, hh = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  const biteCenterY = -0.06;
  const biteR = 0.20;
  s.lineTo(hw, biteCenterY - biteR * 0.92);
  // Scalloped serrated weevil teeth biting inward cleanly (ang -pi/2 .. -3pi/2)
  const teeth = 14;
  for (let i = 0; i <= teeth; i++) {
    const ang = -Math.PI * 0.5 + (i / teeth) * (-Math.PI);
    const rr = biteR * (i % 2 ? 0.87 : 1.05);
    const bx = hw + Math.cos(ang) * rr * 1.18 - 0.03;
    const by = biteCenterY + Math.sin(ang) * rr * 0.92;
    s.lineTo(bx, by);
  }
  s.lineTo(hw, hh);
  s.lineTo(-hw, hh);
  s.closePath();

  const geo = new THREE.ShapeGeometry(s, 16);
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + hw) / w;
    uv[i * 2 + 1] = (pos.getY(i) + hh) / h;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

export function buildWorld() {
  const group = new THREE.Group();
  group.name = 'stJulien1587';
  const clouds = [];
  const flames = [];

  // ---- Lights ----
  const hemiLight = new THREE.HemisphereLight('#e2f0ff', '#8da65c', 0.55);
  const sunLight = new THREE.DirectionalLight('#fff4df', 2.8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 10; sc.far = 360;
  sunLight.shadow.bias = -0.00025; sunLight.shadow.normalBias = 0.015;
  group.add(hemiLight, sunLight, sunLight.target);

  // ---- Sky Dome ----
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
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
  sky.renderOrder = -1; sky.frustumCulled = false;
  group.add(sky);

  const fog = new THREE.Fog('#bdd4ee', 28, 260);
  let attachedScene = null;

  // =========================================================================
  // ZONE 1: SAVOYARD VINEYARD TERRACE (centered at 0, 0, 0)
  // =========================================================================
  const vineyard = new THREE.Group();
  const grassM = lam('vineGrassMat', () => ({ map: grassTex() }));
  grassM.map.repeat.set(22, 22);
  const vGround = new THREE.Mesh(new THREE.PlaneGeometry(80, 70), grassM);
  vGround.rotation.x = -Math.PI / 2; vGround.position.y = 0; vGround.receiveShadow = true;
  vineyard.add(vGround);

  // Rolling Savoy green hills behind vineyard
  const hillGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [hx, hz, sx, sy, sz, col] of [
    [-22, -32, 34, 11, 22, '#629842'],
    [24, -36, 38, 13, 24, '#548739'],
    [0, -52, 55, 16, 26, '#4d7e34'],
  ]) {
    const h = new THREE.Mesh(hillGeo, lam('vhill' + col, () => ({ color: col })));
    h.position.set(hx, -0.5, hz); h.scale.set(sx, sy, sz); h.receiveShadow = true;
    vineyard.add(h);
  }

  // Vine rows: oak trellis posts + horizontal rails + leafy clusters + purple grapes
  const oakM = lam('vinePostOak', () => ({ map: woodTex('vineOak', '#7d4f2c', '#633c1f') }));
  const bushLeafM = lam('vineLeafM', () => ({ color: '#4c9932' }));
  const bushLeafM2 = lam('vineLeafM2', () => ({ color: '#5fb13f' }));
  const grapeM = lam('grapePurple', () => ({ color: '#582e6a' }));

  const addTrellisRow = (xCenter, zStart, zEnd) => {
    for (let z = zStart; z <= zEnd; z += 1.6) {
      vineyard.add(box(0.11, 1.65, 0.11, oakM, xCenter, 0.82, z));
    }
    const len = zEnd - zStart;
    const zMid = (zStart + zEnd) * 0.5;
    vineyard.add(box(0.06, 0.06, len, oakM, xCenter, 0.72, zMid));
    vineyard.add(box(0.06, 0.06, len, oakM, xCenter, 1.38, zMid));
    for (let k = 0; k < 7; k++) {
      const z = zStart + 0.35 + k * ((len - 0.7) / 6);
      const y = 1.05 + (k % 2) * 0.32;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), k % 2 ? bushLeafM : bushLeafM2);
      m.position.set(xCenter, y, z); m.scale.set(1.1, 0.85, 1.2); m.castShadow = true; m.receiveShadow = true;
      vineyard.add(m);
      if (k % 2 === 0) {
        for (let g = 0; g < 3; g++) {
          const gp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), grapeM);
          gp.position.set(xCenter + (g - 1) * 0.06, y - 0.25 - g * 0.05, z + 0.14);
          gp.castShadow = true;
          vineyard.add(gp);
        }
      }
    }
  };
  addTrellisRow(-2.05, -5.5, 4.0);
  addTrellisRow(2.05, -5.5, 4.0);
  // Hero front vine post supporting Shot 1's giant leaf at [0.38] (kept clear of Amenet at -1.15!)
  vineyard.add(box(0.1, 1.65, 0.1, oakM, -0.05, 0.82, 2.25));
  vineyard.add(box(0.1, 1.65, 0.1, oakM, 0.82, 0.82, 2.25));
  vineyard.add(box(0.92, 0.06, 0.06, oakM, 0.38, 1.44, 2.25));
  // St-Julien stone low garden wall + distant rustic stone cottages
  const wallM = lam('stoneWallM', () => ({ map: ashlarWallTex() }));
  vineyard.add(box(22, 1.15, 0.45, wallM, 0, 0.57, -7.8));
  const plasterM = lam('cottPlaster', () => ({ color: '#ead8b6' }));
  const roofM = lam('cottRoof', () => ({ color: '#be6548' }));
  for (const [cx, cz, s] of [[-5.6, -12.5, 1.0], [5.8, -13.5, 1.1]]) {
    vineyard.add(box(3.8 * s, 3.2 * s, 3.4 * s, plasterM, cx, 1.6 * s, cz));
    const rf = new THREE.Mesh(new THREE.ConeGeometry(3.2 * s, 1.9 * s, 4), roofM);
    rf.position.set(cx, 3.2 * s + 0.95 * s, cz); rf.rotation.y = Math.PI / 4; rf.castShadow = true;
    vineyard.add(rf);
  }
  group.add(vineyard);

  // =========================================================================
  // ZONE 2: ECCLESIASTICAL COURTROOM NAVE (centered at 52, 0, 0)
  // =========================================================================
  const court = new THREE.Group();
  court.position.set(52, 0, 0);
  const cFloorM = lam('courtFloorM', () => ({ map: stoneFloorTex() }));
  cFloorM.map.repeat.set(5, 5);
  const cFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), cFloorM);
  cFloor.rotation.x = -Math.PI / 2; cFloor.receiveShadow = true;
  court.add(cFloor);

  const naveM = lam('courtWallM', () => ({ map: ashlarWallTex() }));
  court.add(box(24, 11, 0.7, naveM, 0, 5.5, -10.5)); // back altar/court wall
  court.add(box(0.7, 11, 22, naveM, -6.5, 5.5, 0));
  court.add(box(0.7, 11, 22, naveM, 6.5, 5.5, 0));
  // Stained-glass lancet arches set into left/back wall + warm crimson tapestry
  const glassM = new THREE.MeshBasicMaterial({ color: '#ffcf70' });
  const glassBlueM = new THREE.MeshBasicMaterial({ color: '#5c78c8' });
  for (const lx of [-2.4, 2.4]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 3.8), glassM);
    win.position.set(lx, 5.8, -10.12);
    court.add(win);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(0.58, 16), glassBlueM);
    rose.position.set(lx, 7.9, -10.11);
    court.add(rose);
  }
  for (const [px, pz] of [[-4.8, -6], [4.8, -6], [-4.8, -1], [4.8, -1], [-4.8, 4], [4.8, 4]]) {
    court.add(box(0.85, 10, 0.85, naveM, px, 5, pz));
  }

  // Judge High Dais (centered z = -5.4, top y = 1.05) + oak bench desk
  const dOakM = lam('courtDarkOak', () => ({ map: woodTex('darkOak', '#6c3e20', '#542f16') }));
  const goldM = lam('brassTrim', () => ({ color: '#d8b048' }));
  const tapM = lam('tapestry', () => ({ color: '#782632' }));
  court.add(box(4.4, 1.05, 3.0, naveM, 0, 0.525, -5.8));
  court.add(box(2.2, 4.2, 0.14, tapM, 0, 3.15, -7.2));
  court.add(box(2.6, 0.88, 0.9, dOakM, 0, 1.49, -4.55));
  // Carved front oak trim, velvet runner & brass court seal on judge bench face
  court.add(box(2.25, 0.58, 0.05, lam('courtPanel', () => ({ color: '#4c2913' })), 0, 1.49, -4.08));
  court.add(box(0.84, 0.84, 0.07, tapM, 0, 1.49, -4.06));
  court.add(box(0.28, 0.28, 0.08, goldM, 0, 1.56, -4.05));
  // Sounding block resting cleanly on desk edge
  const sBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 14), dOakM);
  sBlock.position.set(0.46, 1.99, -4.35);
  sBlock.castShadow = true; sBlock.receiveShadow = true;
  court.add(sBlock);

  // Plush Crimson Witness Cushion Box (x = -1.75 relative = 50.25 world, z = -2.2)
  court.add(box(0.95, 1.15, 0.95, dOakM, -1.75, 0.575, -2.2));
  const cushionM = lam('crimsonVelvet', () => ({ color: '#b42b34' }));
  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.50, 0.20, 16), cushionM);
  cushion.position.set(-1.75, 1.25, -2.2); cushion.castShadow = true; cushion.receiveShadow = true;
  court.add(cushion);
  for (const [tx, tz] of [[-2.08, -1.85], [-1.42, -1.85]]) {
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), goldM);
    tassel.position.set(tx, 1.24, tz);
    tassel.castShadow = true;
    court.add(tassel);
  }

  // Evidence Oak Table for Shot 4 Silence #1 Deed Unroll (centered at world [53.6, 0, -0.6])
  court.add(box(1.9, 0.12, 1.35, dOakM, 1.6, 0.92, -0.6));
  for (const [lx, lz] of [[0.8, -1.15], [2.4, -1.15], [0.8, -0.05], [2.4, -0.05]]) {
    court.add(box(0.11, 0.92, 0.11, dOakM, lx, 0.46, lz));
  }
  const deedFlatMat = lam('deedTableMat', () => ({ map: deedTableTex(), side: THREE.DoubleSide }));
  const tableDeedMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), deedFlatMat);
  tableDeedMesh.rotation.x = -Math.PI / 2;
  tableDeedMesh.position.set(1.6, 0.995, -0.6);
  tableDeedMesh.receiveShadow = true;
  court.add(tableDeedMesh);
  // Rolled right scroll cylinder that slides open across the oak planks during Silence #1
  const deedRollCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.96, 12), lam('parchRoll', () => ({ color: '#ead8b2' })));
  deedRollCyl.rotation.z = Math.PI / 2;
  deedRollCyl.position.set(1.6, 1.03, -0.6);
  court.add(deedRollCyl);
  group.add(court);

  // =========================================================================
  // ZONE 3: LE GRAND FEISSE BARREN HILLSIDE (centered at -46, 0, 0)
  // =========================================================================
  const wasteland = new THREE.Group();
  wasteland.position.set(-46, 0, 0);
  const dirtM = lam('barrenDirtM', () => ({ map: crackedDirtTex() }));
  dirtM.map.repeat.set(18, 18);
  const wGround = new THREE.Mesh(new THREE.PlaneGeometry(75, 75), dirtM);
  wGround.rotation.x = -Math.PI / 2; wGround.receiveShadow = true;
  wasteland.add(wGround);

  // Dusty dry scrub slopes behind Le Grand Feisse
  for (const [hx, hz, sx, sy, sz, col] of [
    [-16, -26, 26, 8, 18, '#b59365'],
    [18, -28, 28, 9, 20, '#a6855b'],
    [0, -40, 42, 12, 22, '#9a7a54'],
  ]) {
    const h = new THREE.Mesh(hillGeo, lam('whill' + col, () => ({ color: col })));
    h.position.set(hx, -0.5, hz); h.scale.set(sx, sy, sz); h.receiveShadow = true;
    wasteland.add(h);
  }

  // Scattered dusty boulders & dry pebbles around the hill
  const rockM = lam('dryRock', () => ({ color: '#9f8b74' }));
  const r2 = rng(711);
  for (let i = 0; i < 16; i++) {
    const sz = U(r2, 0.14, 0.42);
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), rockM);
    const px = U(r2, -5.5, 5.5), pz = U(r2, -4.5, 4.5);
    if (Math.hypot(px, pz) < 1.1) continue;
    rk.position.set(px, sz * 0.42, pz);
    rk.rotation.set(U(r2, 0, 2), U(r2, 0, 3), 0);
    rk.scale.y = 0.65;
    rk.castShadow = true; rk.receiveShadow = true;
    wasteland.add(rk);
  }

  // Crooked rustic fence & tilted Wooden Deed Signboard `"LE GRAND FEISSE"` facing +z!
  const fenceM = lam('weathWood', () => ({ map: woodTex('weathOak', '#8b7255', '#70583e') }));
  for (const fx of [-2.4, -0.8, 0.8, 2.4]) {
    const p = box(0.11, 1.15, 0.11, fenceM, fx, 0.56, -1.7);
    p.rotation.z = (fx < 0 ? 0.05 : -0.04);
    wasteland.add(p);
  }
  wasteland.add(box(5.0, 0.08, 0.05, fenceM, 0, 0.88, -1.64));
  wasteland.add(box(5.0, 0.08, 0.05, fenceM, 0, 0.46, -1.64));

  // Signpost + forward-reading Sign Face (mirror = false!)
  const signPost = box(0.13, 1.55, 0.13, fenceM, -0.15, 0.77, -1.25);
  wasteland.add(signPost);
  const signBacking = box(1.38, 0.88, 0.08, fenceM, -0.15, 1.24, -1.22);
  signBacking.rotation.z = -0.04;
  wasteland.add(signBacking);
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.34, 0.84),
    lam('deedSignMat', () => ({ map: deedSignTex() }))
  );
  signFace.position.set(-0.15, 1.24, -1.175);
  signFace.rotation.z = -0.04;
  signFace.castShadow = true; signFace.receiveShadow = true;
  wasteland.add(signFace);

  // Solitary pathetic dead twig sitting right beside the fence
  const twigM = lam('deadTwig', () => ({ color: '#614830' }));
  const twigStem = box(0.04, 0.55, 0.04, twigM, 1.15, 0.27, -0.9);
  twigStem.rotation.z = -0.22;
  const twigArm = box(0.03, 0.25, 0.03, twigM, 1.25, 0.42, -0.9);
  twigArm.rotation.z = -0.85;
  wasteland.add(twigStem, twigArm);
  group.add(wasteland);

  // =========================================================================
  // ZONE 4: MIDNIGHT ARCHIVE LECTERN (centered at 0, 0, -52)
  // =========================================================================
  const archive = new THREE.Group();
  archive.position.set(0, 0, -52);
  const aFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), dOakM);
  aFloor.rotation.x = -Math.PI / 2; aFloor.receiveShadow = true;
  archive.add(aFloor);
  archive.add(box(16, 8, 0.6, dOakM, 0, 4, -4.5)); // oak library shelving backdrop
  archive.add(box(0.6, 8, 14, dOakM, -5.5, 4, 0));
  archive.add(box(0.6, 8, 14, dOakM, 5.5, 4, 0));
  // Decorative book spines on shelves behind lectern
  const spineCols = ['#782628', '#2a4d3e', '#5d3e24', '#38466e', '#885e2a'];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 12; i++) {
      const col = spineCols[(i + row * 2) % spineCols.length];
      archive.add(box(0.18, 0.56 + (i % 3) * 0.08, 0.26, lam('sp' + col, () => ({ color: col })), -1.8 + i * 0.32, 2.2 + row * 1.15, -3.9));
    }
  }

  // Heavy Oak Archive Lectern Table (top at y = 1.00)
  archive.add(box(2.2, 1.00, 1.5, dOakM, 0, 0.50, 0));

  // Brass Candelabrum + 3 glowing animated candles on top-right of lectern
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.08, 14), goldM);
  cBase.position.set(0.88, 1.04, -0.35); cBase.castShadow = true; cBase.receiveShadow = true;
  archive.add(cBase);
  const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.38, 10), goldM);
  cStem.position.set(0.88, 1.24, -0.35); cStem.castShadow = true; cStem.receiveShadow = true;
  archive.add(cStem);
  const candleWaxM = lam('waxC', () => ({ color: '#f3e5c0' }));
  for (const [cx, cy] of [[0.88, 1.48], [0.72, 1.42], [1.04, 1.42]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.18, 10), candleWaxM);
    c.position.set(cx, cy, -0.35); c.castShadow = true;
    archive.add(c);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 8), new THREE.MeshBasicMaterial({ color: '#ffbd52' }));
    fl.position.set(cx, cy + 0.13, -0.35);
    archive.add(fl);
    flames.push(fl);
  }

  // Open Court Codex Ledger ("ACTA SANCTI JULIANI" / "VERDICT:") propped up toward camera (+z / +y)
  const bookRest = box(1.12, 0.16, 0.52, dOakM, -0.04, 1.07, -0.08);
  bookRest.rotation.x = 0.26;
  archive.add(bookRest);

  const bookGroup = new THREE.Group();
  bookGroup.position.set(-0.04, 1.16, 0.06);
  bookGroup.rotation.x = 0.26;
  const coverM = lam('bookLeather', () => ({ color: '#462119' }));
  bookGroup.add(box(1.36, 0.05, 0.88, coverM, 0, 0, 0));
  // Dark recess under right page so chewing away right page exposes deep shadow pocket!
  bookGroup.add(box(0.56, 0.015, 0.78, new THREE.MeshBasicMaterial({ color: '#1b0d0a' }), 0.32, 0.025, 0));
  // Left page (static parchment)
  const pageLeft = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.78),
    lam('bookPageL', () => ({ map: ledgerLeftTex() }))
  );
  pageLeft.rotation.x = -Math.PI / 2;
  pageLeft.position.set(-0.31, 0.036, 0);
  pageLeft.receiveShadow = true;
  bookGroup.add(pageLeft);

  // Right page (WHOLE vs GEOMETRICALLY CHEWED!)
  const rightState = makeRightPageCanvas();
  paintRightPage(rightState, 0);
  const pageRightMat = lam('bookPageR', () => ({ map: rightState.tex, side: THREE.DoubleSide }));
  const pageRightWhole = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.78), pageRightMat);
  pageRightWhole.rotation.x = -Math.PI / 2;
  pageRightWhole.position.set(0.31, 0.037, 0);
  pageRightWhole.receiveShadow = true;

  const pageRightChewed = new THREE.Mesh(makeChewedPageGeometry(0.58, 0.78), pageRightMat);
  pageRightChewed.rotation.x = -Math.PI / 2;
  pageRightChewed.position.set(0.31, 0.038, 0);
  pageRightChewed.receiveShadow = true;
  pageRightChewed.visible = false;
  bookGroup.add(pageRightWhole, pageRightChewed);
  archive.add(bookGroup);
  group.add(archive);

  // ---- Clouds (purely deterministic horizontal drift from f, NEVER += state!) ----
  let currentName = 'vineyard';
  let currentPreset = LIGHTS.vineyard;
  let currentLook = LOOK.vineyard;

  const cloudBase = [];
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex(i % 4, LOOK.vineyard.cloud), transparent: true, depthWrite: false, fog: false,
    }));
    sp.userData.seed = i % 4;
    sp.renderOrder = -0.5;
    const a = (i / 8) * TAU + 0.3, dist = 540 + (i % 3) * 55;
    const basePos = [Math.cos(a) * dist, 115 + (i % 4) * 32, Math.sin(a) * dist];
    const w = 135 + (i % 4) * 28;
    sp.position.set(...basePos);
    sp.scale.set(w, w * 0.5, 1);
    group.add(sp);
    clouds.push(sp);
    cloudBase.push(basePos);
  }

  // ---- Dynamic Preset & Zone Shadow Target Application ----
  const dummyCam = new THREE.PerspectiveCamera();
  dummyCam.position.set(0, 1.7, 16);
  dummyCam.lookAt(0, 1.2, 0);
  let focusAnchor = [0, 1, 0];

  function applyPreset(preset, look) {
    currentPreset = preset; currentLook = look;
    TONE.uLitCol.value.set(...preset.lit);
    TONE.uShadeCol.value.set(...preset.shade);
    TONE.uShadeLift.value.set(...preset.lift);
    TONE.uLambert.value = preset.lambert;
    TONE.uSideK.value = preset.sideK;
    TONE.uTerm.value = preset.term;
    TONE.uBounce.value.set(...look.bounce);
    TONE.uSat.value = look.sat;
    hemiLight.color.set(preset.sky);
    hemiLight.groundColor.set(preset.ground);
    hemiLight.intensity = preset.hemiI;
    sunLight.color.set(preset.sunCol);
    sunLight.intensity = preset.sunI;
    sunLight.shadow.bias = preset.bias;
    sunLight.shadow.normalBias = preset.normalBias;
    const dir = sunDirFromAzEl(preset.az, preset.el, dummyCam);
    sunLight.position.set(focusAnchor[0] + dir.x * 160, focusAnchor[1] + dir.y * 160, focusAnchor[2] + dir.z * 160);
    sunLight.target.position.set(focusAnchor[0], focusAnchor[1], focusAnchor[2]);
    sunLight.target.updateMatrixWorld();
    const su = skyMat.uniforms;
    look.sky.c.forEach((h, i) => su['c' + i].value.set(h));
    const e = look.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    fog.color.set(preset.fog);
    fog.near = preset.fogNear; fog.far = preset.fogFar;
    if (attachedScene) attachedScene.fog = fog;
    for (const c of clouds) c.material.map = cloudTex(c.userData.seed, look.cloud);
  }

  function setLight(name, zoneCenter) {
    if (zoneCenter) focusAnchor = zoneCenter;
    currentName = name;
    applyPreset(LIGHTS[name] || LIGHTS.vineyard, LOOK[name] || LOOK.vineyard);
  }

  /**
   * 100% pure function of frame `f` (so chunk worker 0..17 produce identical pixels at boundaries):
   * - cloud drift from `f`
   * - candle flame harmonic flicker
   * - Shot 4 parchment deed unroll across oak table (t = 14.70 .. 15.50 s)
   * - Shot 6 quill ink reveal of VERDICT body lines (t = 22.10 .. 23.60 s)
   * - Shot 7 physical geometric VERDICT page bite hole toggle at t >= 24.60 s (f >= 738)
   */
  function update(f) {
    const t = f / 30;
    for (let i = 0; i < clouds.length; i++) {
      const bx = cloudBase[i][0] + t * 1.4;
      const wrappedX = ((bx + 760) % 1520) - 760;
      clouds[i].position.x = wrappedX;
    }
    flames.forEach((fl, i) => {
      const k = 1 + 0.16 * Math.sin(f * 0.48 + i * 1.9);
      fl.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    });
    // Shot 4 Silence #1 Deed Scroll Unroll (f442..f465)
    const unroll = smooth((t - 14.74) / 0.56);
    tableDeedMesh.scale.x = Math.max(0.05, unroll);
    tableDeedMesh.position.x = 1.6 - (1 - unroll) * 0.42;
    deedRollCyl.position.x = 1.6 - 0.46 + unroll * 0.92;
    deedRollCyl.visible = t >= 14.65 && t < 16.5;

    // Shot 6 Verdict Writing, Silence #2 Shadow & Shot 7 Physical Geometric Bite Hole (f738 = 24.60 s)
    const writePct = t < 22.10 ? 0 : Math.min(1, (t - 22.10) / 1.45);
    const shadowPct = t < 23.70 ? 0 : Math.min(1, (t - 23.70) / 0.85);
    const bitten = f >= 738;
    paintRightPage(rightState, writePct, bitten, shadowPct);
    pageRightWhole.visible = !bitten;
    pageRightChewed.visible = bitten;
  }

  setLight('vineyard', ZONES.vineyard);

  return {
    group, setLight, update, sunLight, hemiLight, sky, fog, ZONES,
    attach(scene) { attachedScene = scene; scene.fog = fog; },
    get currentLight() { return currentName; },
    get currentPreset() { return currentPreset; },
  };
}
