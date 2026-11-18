// cast_wojtek.js — WWII Polish II Corps human cast, military arm overlays,
// articulated Corporal Wojtek bear rig (cub & 500-lb adult), and pop-in badges.
// Canvas design space: 600 x 1000 (soles at y = 975, 1000 units = 2.25 m).
import * as TB from './toonbase.js';

export const CARD_W = 600;
export const CARD_H = 1000;
export const SOLE_Y = 975;
export const CARD_H_M = 2.25;

// ---------------- human outfits ----------------
export const OUTFITS = {
  // Private Piotr Prendysz — 22nd Artillery Supply Company handler
  piotr: {
    jacket: '#8d7648', pants: '#78633b', boots: '#322216',
    hat: 'cap', cap: '#7d673c', buttons: '#d8b454', skin: TB.SKINS[0],
  },
  // Polish Commanding Officer (Major Chełkowski)
  officer: {
    jacket: '#5f5336', pants: '#52472e', boots: '#281c14',
    hat: 'cap', cap: '#4f442b', buttons: '#e5c158', skin: TB.SKINS[1], moustache: '#3d2b1e',
  },
  // British Port Inspector at Alexandria Harbour
  brit: {
    jacket: '#1f2d48', pants: '#1a253b', boots: '#151820',
    hat: 'cap', cap: '#1b2740', buttons: '#eac45a', bib: true, skin: TB.SKINS[2], moustache: '#5c4028',
  },
  // Polish Artillery Crew / Soldiers (seeded variations)
  soldier: {
    jacket: '#856f44', pants: '#6e5b36', boots: '#302015',
    hat: 'cap', cap: '#766139', buttons: '#d2ae50', skin: TB.SKINS[0],
  },
};

const KHAKI_SHADES = ['#8d7648', '#7e6a40', '#967f50', '#74623b'];

const DEFAULT_EXPR = {
  piotr: 'happy',
  officer: 'stern',
  brit: 'stern',
  soldier: 'happy',
};

function resolveOutfit(outfitKey, seed) {
  const base = OUTFITS[outfitKey] || OUTFITS.soldier;
  const o = { ...base };
  if (outfitKey === 'soldier') {
    o.jacket = KHAKI_SHADES[seed % KHAKI_SHADES.length];
    o.pants = TB.shade(o.jacket, 0.84);
    o.cap = TB.shade(o.jacket, 0.90);
    o.skin = TB.SKINS[seed % TB.SKINS.length];
    if (seed % 2 === 1) o.moustache = '#463120';
  }
  return o;
}

// ---------------- geometry mirror of toonbase bodyFront ----------------
function geomFor(outfit, mode, phase, seed = 1, facing = 0) {
  const Bd = TB.BUILD[outfit.build ?? 'adult'];
  const H = TB.headBlob(seed, Bd.a, facing);
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH;
  const bob = mode === 'march' ? 0.025 * tall * Math.cos(4 * Math.PI * phase)
    : mode === 'stroll' ? 0.015 * tall * Math.cos(4 * Math.PI * phase) : 0;
  const torsoBot = mode === 'sit' || mode === 'kneel' ? SOLE_Y - 0.22 * HH : SOLE_Y - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b;
  const hipY = torsoBot - 0.12 * HH;
  const T = {
    a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)),
    nTop: 2.2, nBot: 2.6, egg: outfit.build === 'stout' ? 0.17 : 0.12,
    asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7,
  };
  const tcx = 300 + 3 * u * facing, tcy = torsoBot - T.b;
  const torsoPts = TB.blobPts(tcx, tcy, T);
  return { Bd, H, W, HH, u, torsoBot, chin, hc, crown, hipY, T, tcx, torsoPts, dressPts: null };
}

const shoulder = (g, side) => [g.tcx + side * 0.85 * g.T.a, g.chin + 0.12 * g.HH];

function hangArm(g, side, fwd) {
  const S = shoulder(g, side);
  const ex = g.tcx + side * (1.12 * g.T.a + 4 * g.u);
  const hx = ex + side * 3 * g.u - side * 6 * g.u * Math.max(0, fwd) + side * 4 * g.u * Math.max(0, -fwd);
  return {
    pts: [S, [ex, S[1] + 0.48 * g.HH], [hx, g.chin + 1.04 * g.HH - Math.abs(fwd) * 9 * g.u]],
    hand: [hx, g.chin + 1.04 * g.HH - Math.abs(fwd) * 9 * g.u],
  };
}

function eraseArm(p, g, side, fwd, rotA) {
  const u = g.u, arm = hangArm(g, side, fwd);
  const pts = g.torsoPts;
  const gg = p.g;
  gg.save();
  gg.translate(300, g.hipY);
  gg.rotate(TB.rad(rotA));
  gg.beginPath();
  gg.rect(-300, -g.hipY, CARD_W, CARD_H);
  gg.moveTo(pts[0][0] - 300, pts[0][1] - g.hipY);
  for (let i = 1; i < pts.length; i++) gg.lineTo(pts[i][0] - 300, pts[i][1] - g.hipY);
  gg.closePath();
  gg.clip('evenodd');
  gg.globalCompositeOperation = 'destination-out';
  gg.lineCap = 'round'; gg.lineJoin = 'round';
  gg.strokeStyle = '#000'; gg.fillStyle = '#000';
  gg.lineWidth = 5.2 * u + 10;
  const c = TB.curve(arm.pts[0], arm.pts[1], arm.pts[2]);
  gg.beginPath();
  c.forEach(([x, y], i) => (i ? gg.lineTo(x - 300, y - g.hipY) : gg.moveTo(x - 300, y - g.hipY)));
  gg.stroke();
  gg.beginPath();
  gg.arc(arm.hand[0] - 300, arm.hand[1] - g.hipY, 5.5 * u + 5, 0, Math.PI * 2);
  gg.fill();
  gg.restore();
}

function overlayArm(p, g, pts, armCol, skinCol) {
  const u = g.u;
  const c = pts.length === 2
    ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]]
    : TB.curve(pts[0], pts[1], pts[2]);
  p.stroke(c, 5.2 * u + 3.5, TB.INK);
  p.stroke(c, 5.2 * u, armCol);
  const h = pts[pts.length - 1];
  p.dot(h[0], h[1], 5.5 * u, skinCol || TB.SKIN);
  return h;
}

// Draw military badges & headgear details on human characters
function drawUniformDetails(p, g, outfitKey, o, rotA) {
  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    // Sam Browne leather belt & brass buckle across waist
    const by = g.torsoBot - 0.14 * g.HH;
    p.poly(TB.rrect(g.tcx - g.T.a * 0.92, by - 9, g.tcx + g.T.a * 0.92, by + 9, 4), '#4a2e1b', 4);
    p.poly(TB.rrect(g.tcx - 13, by - 12, g.tcx + 13, by + 12, 3), '#e2be58', 4);
    // Diagonal cross-strap for Polish soldiers & officer
    if (outfitKey !== 'brit') {
      p.stroke([[g.tcx - g.T.a * 0.55, g.chin + 0.08 * g.HH], [g.tcx + g.T.a * 0.35, by - 6]], 10, '#4a2e1b');
      // Red-and-white Polish shoulder flash on left & right shoulders
      for (const s of [-1, 1]) {
        const sx = g.tcx + s * g.T.a * 0.78, sy = g.chin + 0.18 * g.HH;
        p.poly(TB.rrect(sx - 12, sy - 9, sx + 12, sy, 2), '#f5f2ea', 3);
        p.poly(TB.rrect(sx - 12, sy, sx + 12, sy + 9, 2), '#c92a2a', 3);
      }
      // White Polish eagle badge on cap crown
      p.dot(300, g.crown - 12, 8, '#f5f2ea');
    } else {
      // British Port Inspector crimson cap band & gold anchor badge
      p.poly(TB.rrect(300 - g.W * 0.46, g.crown - 6, 300 + g.W * 0.46, g.crown + 8, 3), '#b82828', 4);
      p.dot(300, g.crown - 14, 9, '#eac45a');
    }
  } finally {
    p.rot = null;
  }
}

// ---------------- main human cast draw entry ----------------
export function humanFront(p, outfitKey, opts = {}) {
  const {
    seed = 1, expr, mode = 'stand', phase = 0, look = 0, blink = false,
    lift = 60, tilt = 0, headTilt = 0, wave, light, facing = 0,
    arm = 'hang', talk = 0, stampY = 0,
  } = opts;
  const o = resolveOutfit(outfitKey, seed);
  const useWave = arm === 'wave' ? (wave ?? 1) : wave;
  TB.bodyFront(p, o, {
    phase, expr: expr ?? DEFAULT_EXPR[outfitKey] ?? 'neutral', mode, look, blink,
    lift, prop: null, tilt, headTilt, wave: useWave, light, facing, seed, talk,
  });

  const g = geomFor(o, mode, phase, seed, facing);
  const u = g.u;
  const sway = mode === 'march' ? 1.6 * Math.sin(2 * Math.PI * phase)
    : mode === 'stroll' ? 1.0 * Math.sin(2 * Math.PI * phase) : 0;
  const rotA = tilt + sway;

  drawUniformDetails(p, g, outfitKey, o, rotA);

  if (arm === 'hang' || arm === 'wave') return;

  const sw = mode === 'march' || mode === 'stroll' ? Math.sin(2 * Math.PI * phase) : 0;
  const armCol = TB.mix(o.jacket, TB.INK, 0.35);
  const S = (side) => shoulder(g, side);

  const eraseSides = new Set();
  if (['salute', 'point', 'milk_bottle', 'beer_toast', 'clipboard_ban', 'stamp_book', 'pin_chevron', 'cheek', 'hip', 'up'].includes(arm)) eraseSides.add(1);
  if (['up', 'clipboard_ban', 'stamp_book', 'haul_shell', 'pin_chevron'].includes(arm)) eraseSides.add(-1);
  if (mode !== 'sit' && mode !== 'kneel') {
    for (const side of eraseSides) eraseArm(p, g, side, side < 0 ? -sw : sw, rotA);
  }

  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    const R = S(1), L = S(-1);
    switch (arm) {
      case 'salute': {
        // Crisp Polish military salute to cap brow
        const hx = 300 + g.W * 0.48, hy = g.crown + 10;
        overlayArm(p, g, [R, [R[0] + 68, R[1] - 0.28 * g.HH], [hx, hy]], armCol, o.skin);
        p.stroke([[hx, hy], [hx - 18, hy - 8]], 4.2 * u, o.skin);
        break;
      }
      case 'milk_bottle': {
        // Offering condensed-milk bottle to orphaned bear cub
        const hx = 300 + 135, hy = g.chin + 0.32 * g.HH;
        overlayArm(p, g, [R, [R[0] + 52, R[1] + 0.18 * g.HH], [hx, hy]], armCol, o.skin);
        // Glass bottle + warm milk + cloth nipple tilted toward cub
        p.poly(TB.rrect(hx + 6, hy - 18, hx + 64, hy + 18, 8), '#dceef8', 5);
        p.poly(TB.rrect(hx + 10, hy - 12, hx + 56, hy + 12, 5), '#fff6dc', 3);
        p.poly(TB.rrect(hx + 62, hy - 8, hx + 82, hy + 8, 4), '#f5e4c3', 4);
        break;
      }
      case 'beer_toast': {
        // Raising amber beer bottle high in camp cheer
        const hx = 300 + 142, hy = g.chin - 0.25 * g.HH;
        overlayArm(p, g, [R, [R[0] + 58, R[1] - 0.15 * g.HH], [hx, hy]], armCol, o.skin);
        p.poly(TB.rrect(hx - 16, hy - 58, hx + 16, hy + 12, 6), '#9e5418', 5);
        p.poly(TB.rrect(hx - 8, hy - 82, hx + 8, hy - 54, 4), '#9e5418', 5);
        p.poly(TB.rrect(hx - 14, hy - 38, hx + 14, hy - 12, 2), '#f5ead0', 3);
        break;
      }
      case 'clipboard_ban': {
        // British official holding clipboard in left hand & raising stern STOP hand with right
        const lx = 300 - 124, ly = g.chin + 0.28 * g.HH;
        p.poly(TB.rrect(lx - 36, ly - 46, lx + 36, ly + 46, 6), '#8b5a2b', 5);
        p.poly(TB.rrect(lx - 28, ly - 36, lx + 28, ly + 38, 3), '#fbf5e6', 4);
        for (let k = 0; k < 3; k++) p.stroke([[lx - 18, ly - 20 + k * 16], [lx + 18, ly - 20 + k * 16]], 3.5, TB.INK);
        overlayArm(p, g, [L, [L[0] - 42, L[1] + 0.18 * g.HH], [lx, ly + 18]], armCol, o.skin);
        // Right arm extended pointing / halting
        const h = overlayArm(p, g, [R, [R[0] + 68, R[1] - 0.15 * g.HH], [300 + 185, g.chin - 0.22 * g.HH]], armCol, o.skin);
        p.dot(h[0] + 6, h[1] - 6, 7.2 * u, o.skin);
        break;
      }
      case 'stamp_book': {
        // Polish officer holding green military paybook & slamming official ink stamp
        const lx = 300 - 118, ly = g.chin + 0.24 * g.HH;
        p.poly(TB.rrect(lx - 42, ly - 48, lx + 42, ly + 48, 6), '#3c5a38', 6);
        p.poly(TB.rrect(lx - 28, ly - 24, lx + 28, ly + 6, 3), '#f2e8cf', 3);
        p.dot(lx + 14, ly + 24, 11, '#c92a2a');
        overlayArm(p, g, [L, [L[0] - 40, L[1] + 0.16 * g.HH], [lx - 10, ly + 18]], armCol, o.skin);
        const hx = 300 + 124, hy = g.chin - 0.10 * g.HH + stampY * 115;
        overlayArm(p, g, [R, [R[0] + 58, R[1] - 0.16 * g.HH], [hx, hy]], armCol, o.skin);
        p.poly([[hx - 16, hy + 4], [hx + 16, hy + 4], [hx + 36, hy + 34], [hx - 36, hy + 34]], '#7a4526', 5);
        p.poly([[hx - 38, hy + 32], [hx + 38, hy + 32], [hx + 38, hy + 46], [hx - 38, hy + 46]], '#c92a2a', 5);
        break;
      }
      case 'haul_shell': {
        // Artillery crewman holding a gleaming brass 25-pdr shell across chest
        const sx = 300, sy = g.chin + 0.36 * g.HH;
        p.poly(TB.rrect(sx - 58, sy - 18, sx + 32, sy + 18, 6), '#d8a840', 5);
        p.poly([[sx + 32, sy - 18], [sx + 74, sy - 6], [sx + 74, sy + 6], [sx + 32, sy + 18]], '#b84228', 5);
        overlayArm(p, g, [L, [L[0] - 32, L[1] + 0.22 * g.HH], [sx - 30, sy + 8]], armCol, o.skin);
        overlayArm(p, g, [R, [R[0] + 32, R[1] + 0.22 * g.HH], [sx + 24, sy + 8]], armCol, o.skin);
        break;
      }
      case 'pin_chevron': {
        // Presenting red-and-white Corporal chevron plaque
        const hx = 300 + 148, hy = g.chin - 0.08 * g.HH;
        overlayArm(p, g, [R, [R[0] + 58, R[1] - 0.10 * g.HH], [hx, hy]], armCol, o.skin);
        overlayArm(p, g, [L, [L[0] - 42, L[1] + 0.15 * g.HH], [300 - 110, g.chin + 0.25 * g.HH]], armCol, o.skin);
        break;
      }
      case 'up':
        overlayArm(p, g, [R, [R[0] + 45, R[1] - 0.35 * g.HH], [300 + 148, g.crown - 42]], armCol, o.skin);
        overlayArm(p, g, [L, [L[0] - 45, L[1] - 0.35 * g.HH], [300 - 148, g.crown - 42]], armCol, o.skin);
        break;
      case 'point': {
        const h = overlayArm(p, g, [R, [R[0] + 72, R[1] - 10], [300 + 202, g.chin - 0.22 * g.HH]], armCol, o.skin);
        p.stroke([[h[0], h[1]], [h[0] + 24, h[1] - 6]], 3.5 * u, o.skin);
        break;
      }
      case 'cheek':
        overlayArm(p, g, [R, [R[0] + 44, R[1] - 0.25 * g.HH], [300 + 58, g.hc + 10]], armCol, o.skin);
        break;
      case 'hip':
        overlayArm(p, g, [R, [R[0] + 54, R[1] + 0.24 * g.HH], [g.tcx + 0.72 * g.T.a, g.torsoBot - 0.16 * g.HH]], armCol, o.skin);
        break;
    }
  } finally {
    p.rot = null;
  }
}

// ============================================================================
// CORPORAL WOJTEK — Custom Articulated Syrian Brown Bear Rig (Cub & 500-lb Adult)
// ============================================================================
const FUR_MAIN = '#7c4b2b';
const FUR_DARK = '#59331a';
const FUR_LIGHT = '#9e6640';
const FUR_BLAZE = '#e5c48c';
const MUZZLE_COL = '#dcb47e';
const NOSE_COL = '#231612';

export function drawWojtek(p, opts = {}) {
  const {
    stage = 'adult',      // 'cub' | 'adult'
    pose = 'stand',       // 'stand' | 'salute' | 'wrestle' | 'beer' | 'paybook' | 'crate' | 'bottle'
    expr = 'proud',       // 'proud' | 'happy' | 'focused' | 'curious'
    cap = false,          // Polish garrison cap (rogatywka)
    corporal = false,     // Corporal double-chevron collar & shoulder insignia
    phase = 0,
    talk = 0,
    blink = false,
    tilt = 0,
    facing = 0,
  } = opts;

  const gg = p.g;
  gg.save();

  // Scale down around SOLE_Y (y = 975) when rendering young orphaned cub in Shot 2a
  const sc = stage === 'cub' ? 0.54 : 1.0;
  const walkBob = Math.abs(Math.sin(phase * Math.PI * 2)) * (pose === 'crate' ? 10 : 6);
  const walkSway = Math.sin(phase * Math.PI * 2) * (pose === 'crate' ? 2.2 : 1.2) + tilt;

  gg.translate(300, SOLE_Y);
  gg.scale(sc, sc);
  gg.rotate(TB.rad(walkSway));
  gg.translate(-300, -SOLE_Y + walkBob);

  const cx = 300 + facing * 12;

  // ---- 1. HIND LEGS & MASSIVE PLANTED BEAR PAWS (soles at y = 975) ----
  const stride = Math.sin(phase * Math.PI * 2) * 18;
  for (const s of [-1, 1]) {
    const lx = cx + s * 86;
    const lyOff = s < 0 ? Math.max(0, stride) : Math.max(0, -stride);
    // Thick furry thigh + shin
    p.ell(lx, 835 - lyOff * 0.5, 62, 118, FUR_DARK, 7);
    p.ell(lx, 830 - lyOff * 0.5, 56, 110, FUR_MAIN, 0);
    // Broad flat bear foot pad
    const fy = 948 - lyOff;
    p.ell(lx + s * 8, fy, 64, 28, FUR_DARK, 7);
    // 4 cream-ivory bear claws on each foot
    for (let c = -1.5; c <= 1.5; c += 1) {
      const clx = lx + s * 8 + c * 15;
      p.poly([[clx - 5, fy + 10], [clx + 5, fy + 10], [clx, fy + 26]], '#efe2c2', 3);
    }
  }

  // ---- 2. MASSIVE BARREL TORSO & SYRIAN GOLDEN CHEST BLAZE ----
  p.ell(cx, 595, 178, 245, FUR_DARK, 8);
  p.ell(cx, 590, 168, 232, FUR_MAIN, 0);
  // Fluffy shoulder & flank fur tufts
  for (const s of [-1, 1]) {
    p.poly([
      [cx + s * 150, 440],
      [cx + s * 188, 465],
      [cx + s * 166, 495],
      [cx + s * 192, 525],
      [cx + s * 158, 555],
    ], FUR_MAIN, 6);
  }
  // Signature Syrian brown bear cream-gold V-shaped chest blaze
  p.poly([
    [cx - 88, 435],
    [cx + 88, 435],
    [cx + 52, 565],
    [cx, 625],
    [cx - 52, 565],
  ], FUR_BLAZE, 5);

  // Military Webbing Belt & Corporal Collar/Shoulder Insignia (when enlisted / promoted)
  if (cap || corporal || pose === 'salute' || pose === 'paybook' || pose === 'crate') {
    // Khaki webbing belt around bear belly with brass buckle
    p.poly(TB.rrect(cx - 166, 685, cx + 166, 718, 8), '#78643a', 6);
    p.poly(TB.rrect(cx - 24, 680, cx + 24, 723, 5), '#e5c158', 5);
  }
  if (corporal) {
    // Red-and-white Polish collar band + giant gold/white double Corporal chevrons on shoulder/chest
    p.poly([
      [cx - 125, 405], [cx + 125, 405], [cx + 105, 445], [cx - 105, 445],
    ], '#5e4f30', 6);
    // Double V Corporal stripes on chest badge
    const bx = cx + 92, by = 475;
    p.poly(TB.rrect(bx - 38, by - 42, bx + 38, by + 42, 8), '#3b4d2e', 5);
    p.poly(TB.rrect(bx - 30, by - 34, bx + 30, by - 20, 2), '#f5f2ea', 3);
    p.poly(TB.rrect(bx - 30, by - 20, bx + 30, by - 6, 2), '#c92a2a', 3);
    p.stroke([[bx - 24, by + 4], [bx, by + 20], [bx + 24, by + 4]], 6, '#f5e6b8');
    p.stroke([[bx - 24, by + 18], [bx, by + 34], [bx + 24, by + 18]], 6, '#f5e6b8');
  }

  // ---- 3. ROUND BEAR HEAD, EARS, SNOUT & EXPRESSIVE FACE ----
  const hx = cx + facing * 10;
  const hy = 285;

  // Round furry bear ears
  for (const s of [-1, 1]) {
    const ex = hx + s * 108, ey = hy - 102;
    p.ell(ex, ey, 42, 42, FUR_DARK, 7);
    p.ell(ex, ey, 24, 24, '#c48d62', 3);
  }

  // Broad furry cranium with cheek ruffs
  p.ell(hx, hy, 134, 118, FUR_DARK, 8);
  p.ell(hx, hy - 2, 126, 110, FUR_MAIN, 0);
  for (const s of [-1, 1]) {
    p.poly([
      [hx + s * 116, hy - 10],
      [hx + s * 148, hy + 15],
      [hx + s * 124, hy + 42],
      [hx + s * 144, hy + 64],
      [hx + s * 104, hy + 78],
    ], FUR_MAIN, 6);
  }

  // Polish Khaki Garrison Cap (Rogatywka) perched between ears
  if (cap) {
    p.poly([
      [hx - 92, hy - 92],
      [hx - 68, hy - 156],
      [hx, hy - 142],
      [hx + 72, hy - 160],
      [hx + 94, hy - 92],
    ], '#7d673c', 7);
    p.poly(TB.rrect(hx - 96, hy - 102, hx + 96, hy - 78, 6), '#66532f', 6);
    // Crisp white Polish Eagle emblem on cap front
    p.dot(hx, hy - 118, 13, '#f7f4ec');
    p.poly(TB.rrect(hx - 14, hy - 94, hx + 14, hy - 84, 2), '#c92a2a', 3);
  }

  // Prominent warm-tan bear snout / muzzle
  const mx = hx + facing * 14, my = hy + 34;
  p.ell(mx, my, 68, 56, MUZZLE_COL, 6);
  // Big dark-brown glossy bear nose with highlight
  p.ell(mx, my - 18, 30, 21, NOSE_COL, 5);
  p.ell(mx - 8, my - 23, 9, 5, '#6e584f', 0);

  // Mouth & expression
  const openAmt = Math.max(talk, pose === 'beer' || pose === 'bottle' ? 0.65 : expr === 'happy' ? 0.35 : 0);
  p.stroke([[mx, my + 3], [mx, my + 18]], 5, TB.INK);
  if (openAmt > 0.15) {
    p.ell(mx, my + 26, 28, 12 + openAmt * 16, '#3a1414', 5);
    p.ell(mx, my + 32, 18, 7 + openAmt * 7, '#e06c6c', 0);
  } else {
    p.stroke([[mx - 28, my + 18], [mx, my + 26], [mx + 28, my + 18]], 5.5, TB.INK);
  }

  // Eyes & Brows
  for (const s of [-1, 1]) {
    const ex = hx + s * 48 + facing * 6, ey = hy - 22;
    if (blink) {
      p.stroke([[ex - 16, ey], [ex + 16, ey]], 6, TB.INK);
    } else {
      p.ell(ex, ey, 16, 18, '#ffffff', 5);
      p.dot(ex + facing * 3, ey, 10, '#181210');
      p.dot(ex - 4, ey - 5, 4.5, '#ffffff');
    }
    // Expressive eyebrows
    const browLift = expr === 'focused' ? -8 : expr === 'curious' ? (s > 0 ? 10 : -4) : 6;
    const browTilt = expr === 'focused' ? -s * 8 : s * 4;
    p.stroke([
      [ex - 22, ey - 26 - browLift + browTilt],
      [ex, ey - 32 - browLift],
      [ex + 22, ey - 26 - browLift - browTilt],
    ], 7, FUR_DARK);
  }

  // ---- 4. ARTICULATED ARMS & HELD PROPS BY POSE ----
  const drawBearArm = (pts, pawX, pawY, pawRx = 38, pawRy = 34) => {
    const c = TB.curve(pts[0], pts[1], pts[2]);
    p.stroke(c, 68, TB.INK);
    p.stroke(c, 54, FUR_MAIN);
    p.ell(pawX, pawY, pawRx, pawRy, FUR_DARK, 7);
    p.ell(pawX, pawY, pawRx * 0.62, pawRy * 0.62, MUZZLE_COL, 3);
  };

  const LS = [cx - 142, 455];
  const RS = [cx + 142, 455];

  if (pose === 'bottle') {
    // Cub cradling condensed-milk bottle with both paws up to mouth
    const bx = mx, by = my + 62;
    p.poly(TB.rrect(bx - 22, by - 36, bx + 22, by + 44, 10), '#dceef8', 6);
    p.poly(TB.rrect(bx - 16, by - 18, bx + 16, by + 36, 6), '#fff6dc', 3);
    p.poly(TB.rrect(bx - 8, by - 56, bx + 8, by - 34, 4), '#f5e4c3', 5);
    drawBearArm([LS, [cx - 160, 480], [bx - 30, by + 4]], bx - 28, by + 4, 30, 28);
    drawBearArm([RS, [cx + 160, 480], [bx + 30, by + 4]], bx + 28, by + 4, 30, 28);
  } else if (pose === 'salute') {
    // Left arm hanging proudly at side, Right paw raised crisply to garrison cap brim!
    drawBearArm([LS, [cx - 186, 560], [cx - 168, 675]], cx - 168, 685);
    const sx = hx + 112, sy = hy - 86;
    drawBearArm([RS, [cx + 215, 345], [sx, sy]], sx, sy, 36, 28);
    // Claws on saluting paw tip
    for (let k = -1; k <= 1; k++) {
      p.poly([[sx - 28, sy + k * 8 - 3], [sx - 28, sy + k * 8 + 3], [sx - 44, sy + k * 8]], '#efe2c2', 3);
    }
  } else if (pose === 'wrestle') {
    // Playful wide grappler arms raised high
    drawBearArm([LS, [cx - 220, 395], [cx - 185, 305]], cx - 185, 295);
    drawBearArm([RS, [cx + 220, 395], [cx + 185, 305]], cx + 185, 295);
  } else if (pose === 'beer') {
    // Left paw patting belly, Right paw tipping green/amber glass beer bottle into open mouth!
    drawBearArm([LS, [cx - 185, 565], [cx - 110, 640]], cx - 105, 645);
    const bx = mx + 82, by = my + 42;
    // Amber beer bottle tilted toward mouth with golden foam
    gg.save();
    gg.translate(bx, by);
    gg.rotate(TB.rad(-56));
    p.poly(TB.rrect(-22, -55, 22, 45, 8), '#9e5418', 6);
    p.poly(TB.rrect(-10, -95, 10, -52, 4), '#9e5418', 6);
    p.poly(TB.rrect(-18, -28, 18, 16, 3), '#f6ead0', 4);
    p.dot(0, -100, 11, '#fff8e0');
    gg.restore();
    drawBearArm([RS, [cx + 210, 430], [bx + 22, by + 14]], bx + 22, by + 14, 36, 32);
  } else if (pose === 'paybook') {
    // Left paw presenting official Polish military PAYBOOK #253, Right paw saluting!
    const px = cx - 155, py = 505;
    p.poly(TB.rrect(px - 62, py - 74, px + 62, py + 74, 8), '#3b5936', 7);
    p.poly(TB.rrect(px - 46, py - 52, px + 46, py - 8, 4), '#f5ebd2', 4);
    for (let k = 0; k < 2; k++) p.stroke([[px - 32, py - 36 + k * 16], [px + 32, py - 36 + k * 16]], 4, TB.INK);
    p.dot(px + 20, py + 32, 16, '#c92a2a');
    drawBearArm([LS, [cx - 205, 535], [px - 36, py + 28]], px - 36, py + 28, 34, 30);
    const sx = hx + 112, sy = hy - 86;
    drawBearArm([RS, [cx + 215, 345], [sx, sy]], sx, sy, 36, 28);
  } else if (pose === 'crate') {
    // HERO POSE: Cradling heavy wooden "100 LB AMMO" artillery crate with brass shells between both paws!
    const cy = 565;
    const cw = 210, ch = 92;
    // 3 gleaming brass 25-pounder artillery shells peeking out top of crate
    for (const ox of [-110, 0, 110]) {
      p.poly(TB.rrect(cx + ox - 24, cy - ch - 46, cx + ox + 24, cy - ch + 8, 6), '#dfb046', 6);
      p.poly([[cx + ox - 20, cy - ch - 46], [cx + ox, cy - ch - 82], [cx + ox + 20, cy - ch - 46]], '#b83c28', 6);
      p.poly(TB.rrect(cx + ox - 16, cy - ch - 52, cx + ox + 16, cy - ch - 42, 2), '#e8e4dc', 3);
    }
    // Slatted wooden ammo crate box
    p.poly(TB.rrect(cx - cw, cy - ch, cx + cw, cy + ch, 10), '#b88346', 8);
    // Horizontal plank seam & vertical corner battens
    p.stroke([[cx - cw + 8, cy], [cx + cw - 8, cy]], 5, '#593818');
    p.poly(TB.rrect(cx - cw, cy - ch, cx - cw + 34, cy + ch, 4), '#9a6932', 6);
    p.poly(TB.rrect(cx + cw - 34, cy - ch, cx + cw, cy + ch, 4), '#9a6932', 6);
    // Stenciled "100 LB · AMMO" plate on front of crate
    p.poly(TB.rrect(cx - 148, cy - 58, cx + 148, cy + 58, 6), '#cfa063', 4);
    gg.save();
    gg.fillStyle = '#1d1510';
    gg.font = '900 44px "Fredoka", sans-serif';
    gg.textAlign = 'center';
    gg.textBaseline = 'middle';
    gg.fillText('100 LB AMMO', cx, cy - 16);
    gg.font = '800 30px "Fredoka", sans-serif';
    gg.fillStyle = '#8f221e';
    gg.fillText('22 KOMPANIA', cx, cy + 28);
    gg.restore();
    // Both massive bear arms & paws wrapping around and under the crate edges
    drawBearArm([LS, [cx - 235, 515], [cx - cw + 12, cy + 24]], cx - cw + 18, cy + 28, 42, 36);
    drawBearArm([RS, [cx + 235, 515], [cx + cw - 12, cy + 24]], cx + cw - 18, cy + 28, 42, 36);
  } else {
    // Default standing pose
    drawBearArm([LS, [cx - 186, 560], [cx - 168, 675]], cx - 168, 685);
    drawBearArm([RS, [cx + 186, 560], [cx + 168, 675]], cx + 168, 685);
  }

  gg.restore();
}

// ============================================================================
// POP-IN GRAPHIC BADGES (Baboon-Standard Checkmark / Ban / Corporal Crest)
// ============================================================================
export function drawBadge(p, kind = 'check') {
  const cx = 300, cy = 500;
  if (kind === 'ban') {
    // Crisp red prohibition circle with white border & slash
    p.ell(cx, cy, 155, 155, '#ffffff', 10);
    p.ell(cx, cy, 132, 132, '#d63031', 8);
    p.ell(cx, cy, 88, 88, '#fff5f5', 6);
    p.stroke([[cx - 78, cy - 78], [cx + 78, cy + 78]], 28, '#d63031');
    p.stroke([[cx + 78, cy - 78], [cx - 78, cy + 78]], 28, '#d63031');
  } else if (kind === 'corporal') {
    // Golden military promotion shield with Polish Corporal double chevrons
    p.ell(cx, cy, 160, 160, '#f5d160', 10);
    p.ell(cx, cy, 136, 136, '#2e5233', 8);
    p.poly(TB.rrect(cx - 72, cy - 74, cx + 72, cy - 42, 4), '#f7f4ec', 5);
    p.poly(TB.rrect(cx - 72, cy - 42, cx + 72, cy - 10, 4), '#c92a2a', 5);
    p.stroke([[cx - 64, cy + 8], [cx, cy + 48], [cx + 64, cy + 8]], 18, '#f5d160');
    p.stroke([[cx - 64, cy + 44], [cx, cy + 84], [cx + 64, cy + 44]], 18, '#f5d160');
  } else {
    // Baboon-style vivid green circle with white border & bold white checkmark
    p.ell(cx, cy, 155, 155, '#ffffff', 10);
    p.ell(cx, cy, 132, 132, '#27ae60', 8);
    p.stroke([[cx - 62, cy + 6], [cx - 16, cy + 54], [cx + 68, cy - 44]], 34, '#145a32');
    p.stroke([[cx - 62, cy + 2], [cx - 16, cy + 50], [cx + 68, cy - 48]], 26, '#ffffff');
  }
}
