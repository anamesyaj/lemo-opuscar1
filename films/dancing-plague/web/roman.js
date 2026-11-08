// roman.js — the medieval cast for The Dancing Plague (Strasbourg 1518).
// ES module; imports the stripped Pen library from './toonbase.js' (namespace
// import on purpose: `cat toonbase.js roman.js > toon.js` stays loadable, since
// named imports would collide with toonbase's own top-level declarations).
//
// Design canvas 600 x 1000, soles y = 975 (same as toon.ts). CARD_H_M = 2.25:
// 1 design unit = 0.00225 m (1000 units = 2.25 m), so the engine can size cards.
//
// ARM-POSE MAPPING (opts.arm; screen-left = side -1, screen-right = side +1):
//   hang    native bodyFront hanging arms (default; nothing overlaid)
//   spear   right arm dead straight, horizontal at shoulder height
//   point   right arm extended out/up, hand + finger tick (index pointing)
//   up      BOTH arms raised in a V (Troffea dancing)
//   wave    native bodyFront wave (right arm up, waving); no overlay
//   hip     right hand on hip, elbow out
//   belly   BOTH hands meet on the belly, elbows out
//   temple  right hand to temple + small swirl FX beside the head (despair)
//   lift    right arm raised high, elbow bent (lifting / hailing)
//   reach   right arm reaching up-forward diagonal; +lift variant (opts.armLift
//           or arm 'reach_lift') lifts the OTHER arm too
//   cheek   right hand to cheek (worried)
//   shield  right forearm across the eyes (shielding / disbelief)
//   cross   BOTH forearms crossed over the chest
//   thumb   right arm bent, fist up at chest height + thumb tick (thumbs-up)
//
// How overlays work: bodyFront always draws its own (hanging) arms, so for any
// pose that moves an arm we first ERASE that default arm where it shows outside
// the torso/dress silhouette (destination-out, clipped to outside the torso
// blob — the torso fill itself is never touched), then draw the overlay arm as
// an ink-rimmed stroke + ink-dot hand, in bodyFront's drawArm style, under the
// same upper-body rotation bodyFront uses. In 'sit'/'fall' modes the native
// arms are already pose-appropriate (resting / flung up), so overlays are
// skipped there. Props (pipe/drum/lute) are drawn by romanFront, not by
// bodyFront: bodyFront's prop slot is always passed null.
//
// Headscarf note: Troffea / townswoman use hat 'bonnet' — toon.ts renders it
// as a tied kerchief (brim arc + chin ties), which reads as a headscarf at
// card scale. Its straw colour is fixed inside toon.ts, so it is the same
// for every bonnet wearer.

import * as TB from './toonbase.js';

export const CARD_W = 600;
export const CARD_H = 1000;
export const SOLE_Y = 975;
export const CARD_H_M = 2.25;


// ---------------- outfits ----------------
export const OUTFITS = {
  // Frau Troffea: plain muted-mauve dress + headscarf (bonnet = tied kerchief).
  troffea: { jacket: '#6f6480', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#8a7f9a', skin: TB.SKIN },
  // Townsman: tunic; jacket/skin/moustache/hat vary by seed (see resolveOutfit).
  townsman: { jacket: '#3f6fb5', pants: '#3b3f52', boots: '#4a3426', hat: 'cap', cap: '#5a3b2a', skin: TB.SKIN },
  // Townswoman: dress + bonnet; dress/skin vary by seed.
  townswoman: { jacket: '#8c3b4a', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#c25a7a', skin: TB.SKIN },
  // Councillor: near-black cold robe + cap, panicked by default.
  councillor: { jacket: '#232030', pants: '#232030', boots: '#1d1b22', hat: 'cap', cap: '#232030', dress: '#26232e', skin: TB.SKINS[1] },
  // Musicians: bright tunics, caps; pipe / drum supplied via opts.prop.
  musician_pipe: { jacket: '#b5653f', pants: '#3b3f52', boots: '#4a3426', hat: 'cap', cap: '#c9373a', skin: TB.SKIN },
  musician_drum: { jacket: '#2f5f6a', pants: '#3b3f52', boots: '#4a3426', hat: 'cap', cap: '#2f5f6a', skin: TB.SKINS[2] },
  // Doctor: warm dark-brown robe + cap (distinct from the councillor's cold black).
  doctor: { jacket: '#3f3a35', pants: '#3f3a35', boots: '#1d1b22', hat: 'cap', cap: '#3f3a35', dress: '#453d36', skin: TB.SKIN },
};

const COATS = ['#3f6fb5', '#8c3b4a', '#5d7a3a', '#b5653f', '#2f5f6a', '#7b5ac9'];
const DRESSES = ['#d9a441', '#c25a7a', '#5a8fc2', '#7a9a5a', '#a06a9a'];
const CAPS = ['#5a3b2a', '#3a3d47', '#2e2a36'];

const DEFAULT_EXPR = {
  troffea: 'smile_closed', townsman: 'neutral', townswoman: 'neutral',
  councillor: 'shock', musician_pipe: 'smile', musician_drum: 'smile', doctor: 'neutral',
};

/** seed-driven variation for the townsfolk; named cast members stay fixed. */
function resolveOutfit(outfitKey, seed) {
  const base = OUTFITS[outfitKey];
  if (!base) throw new Error(`unknown outfit: ${outfitKey}`);
  const o = { ...base };
  if (outfitKey === 'townsman') {
    o.jacket = COATS[seed % COATS.length];
    o.skin = TB.SKINS[seed % TB.SKINS.length];
    o.cap = CAPS[seed % CAPS.length];
    o.hat = seed % 3 === 2 ? 'tophat' : 'cap';
    if (seed % 4 === 1) o.moustache = '#4a3426';
    if (seed % 4 === 3) o.moustache = '#2a201a';
  } else if (outfitKey === 'townswoman') {
    o.dress = DRESSES[seed % DRESSES.length];
    o.jacket = TB.shade(o.dress, 0.7);
    o.skin = TB.SKINS[seed % TB.SKINS.length];
  } else if (outfitKey === 'councillor' || outfitKey === 'musician_pipe' || outfitKey === 'musician_drum') {
    o.skin = TB.SKINS[seed % TB.SKINS.length];
  }
  return o;
}

// ---------------- geometry (mirrors bodyFront, facing 0) ----------------
function geomFor(outfit, mode, phase, seed = 1) {
  const Bd = TB.BUILD[outfit.build ?? 'adult'];
  const H = TB.headBlob(seed, Bd.a, 0);
  const W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const tall = (1 + Bd.torso + Bd.legs) * HH;
  const bob = mode === 'march' ? 0.025 * tall * Math.cos(4 * Math.PI * phase)
    : mode === 'stroll' ? 0.015 * tall * Math.cos(4 * Math.PI * phase) : 0;
  const torsoBot = mode === 'sit' ? SOLE_Y - 0.2 * HH : SOLE_Y - Bd.legs * HH + bob;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, crown = hc - H.b;
  const hipY = torsoBot - 0.12 * HH;
  const T = {
    a: ((Bd.tw / 2) * W) / 1.06, b: 0.5 * (torsoBot - (chin - 0.25 * HH)),
    nTop: 2.2, nBot: 2.6, egg: outfit.build === 'stout' ? 0.17 : 0.12,
    asym: 0, rot: 0, noise: 0.006, seed: seed + 7,
  };
  const tcx = 300, tcy = torsoBot - T.b;
  const torsoPts = TB.blobPts(tcx, tcy, T);
  let dressPts = null;
  if (outfit.dress && mode !== 'sit' && mode !== 'fall') {
    const D = {
      a: 0.5 * W * 0.98, b: 0.5 * ((SOLE_Y - 0.35 * HH) - (chin - 0.2 * HH)),
      nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0, rot: 0, noise: 0.006, seed: seed + 9,
    };
    dressPts = TB.blobPts(300, SOLE_Y - 0.35 * HH - D.b, D);
  }
  return { Bd, H, W, HH, u, torsoBot, chin, hc, crown, hipY, T, tcx, torsoPts, dressPts };
}

const shoulder = (g, side) => [g.tcx + side * 0.85 * g.T.a, g.chin + 0.12 * g.HH];

/** head centre in design units, from the same geometry bodyFront uses (stand pose). */
export function headCenter(seed, outfitKey) {
  const o = resolveOutfit(outfitKey, seed);
  const Bd = TB.BUILD[o.build ?? 'adult'];
  const H = TB.headBlob(seed, Bd.a, 0);
  const HH = 2 * H.b;
  const torsoBot = SOLE_Y - Bd.legs * HH;
  const chin = torsoBot - Bd.torso * HH;
  return [300, chin - H.b];
}

// ---------------- arm erasure + overlay ----------------
/** default hanging arm for one side, exactly as bodyFront draws it. */
function hangArm(g, side, fwd) {
  const S = shoulder(g, side);
  const ex = g.tcx + side * (1.12 * g.T.a + 4 * g.u);
  const hx = ex + side * 3 * g.u - side * 6 * g.u * Math.max(0, fwd) + side * 4 * g.u * Math.max(0, -fwd);
  return {
    pts: [S, [ex, S[1] + 0.48 * g.HH], [hx, g.chin + 1.04 * g.HH - Math.abs(fwd) * 9 * g.u]],
    hand: [hx, g.chin + 1.04 * g.HH - Math.abs(fwd) * 9 * g.u],
  };
}

/**
 * Erase one default hanging arm where it shows outside the torso/dress.
 * Clip = canvas rect minus torso blob (evenodd), destination-out, so the
 * torso fill is untouched and the card stays transparent elsewhere.
 */
function eraseArm(p, g, side, fwd, rotA) {
  const u = g.u, arm = hangArm(g, side, fwd);
  const pts = g.dressPts ?? g.torsoPts;
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
  gg.lineWidth = 5.2 * u + 8;
  const c = TB.curve(arm.pts[0], arm.pts[1], arm.pts[2]);
  gg.beginPath();
  c.forEach(([x, y], i) => (i ? gg.lineTo(x - 300, y - g.hipY) : gg.moveTo(x - 300, y - g.hipY)));
  gg.stroke();
  gg.beginPath();
  gg.arc(arm.hand[0] - 300, arm.hand[1] - g.hipY, 5.5 * u + 4, 0, Math.PI * 2);
  gg.fill();
  gg.restore();
}

/** ink-rimmed overlay arm (rim + fill + ink-dot hand), drawArm style. */
function overlayArm(p, g, pts, armCol) {
  const u = g.u;
  const c = pts.length === 2 ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]] : TB.curve(pts[0], pts[1], pts[2]);
  p.stroke(c, 5.2 * u + 3.5, TB.INK);
  p.stroke(c, 5.2 * u, armCol);
  const h = pts[pts.length - 1];
  p.dot(h[0], h[1], 5.5 * u);
  return h;
}

function drawSwirl(p, x, y, u) {
  // small spiral of confusion beside the temple (despair / "what do we do?")
  const s = [];
  for (let t = 1; t < 15; t++) s.push([x + Math.cos(t * 0.9) * t * 0.55 * u, y + Math.sin(t * 0.9) * t * 0.55 * u]);
  p.stroke(s, 2.4 * u);
  p.arc(x + 16 * u, y - 6 * u, 5 * u, 4 * u, 200, 340, 2.2 * u);
}

// ---------------- main entry ----------------
export function romanFront(p, outfitKey, opts = {}) {
  const {
    seed = 1, expr, mode = 'stand', phase = 0, look = 0, blink = false,
    lift = 60, prop = null, tilt = 0, headTilt = 0, wave, light, facing = 0,
    arm = 'hang', armLift = false,
  } = opts;
  const o = resolveOutfit(outfitKey, seed);
  const useWave = arm === 'wave' ? (wave ?? 1) : wave;
  TB.bodyFront(p, o, {
    phase, expr: expr ?? DEFAULT_EXPR[outfitKey] ?? 'neutral', mode, look, blink,
    lift, prop: null, tilt, headTilt, wave: useWave, light, facing, seed,
  });

  // Native arms already pose-appropriate in sit (resting) / fall (flung up).
  if (mode === 'sit' || mode === 'fall' || (arm === 'hang' && !prop)) return;

  const g = geomFor(o, mode, phase, seed);
  const u = g.u;
  const sway = mode === 'march' ? 1.6 * Math.sin(2 * Math.PI * phase)
    : mode === 'stroll' ? 1.0 * Math.sin(2 * Math.PI * phase) : 0;
  const rotA = tilt + sway;
  const sw = mode === 'march' || mode === 'stroll' ? Math.sin(2 * Math.PI * phase) : 0;
  const armCol = TB.mix(o.jacket, TB.INK, 0.5);
  const S = (side) => shoulder(g, side);

  // Which default arms must go: every side the overlay (or a prop) moves.
  const eraseSides = new Set();
  if (arm === 'wave') { /* native; left hangs, right already raised */ }
  else if (['spear', 'point', 'hip', 'temple', 'lift', 'reach', 'reach_lift', 'cheek', 'shield', 'thumb'].includes(arm)) eraseSides.add(1);
  else if (['up', 'belly', 'cross'].includes(arm)) { eraseSides.add(1); eraseSides.add(-1); }
  if ((arm === 'reach' && armLift) || arm === 'reach_lift') eraseSides.add(-1);
  if (prop === 'pipe') eraseSides.add(1);
  if (prop === 'drum' || prop === 'lute') { eraseSides.add(1); eraseSides.add(-1); }
  for (const side of eraseSides) eraseArm(p, g, side, side < 0 ? -sw : sw, rotA);

  // Overlay arms, drawn under the same upper-body rotation bodyFront used.
  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    const R = S(1), L = S(-1);
    switch (arm) {
      case 'spear':
        overlayArm(p, g, [R, [R[0] + 118, R[1]], [300 + 235, g.chin + 0.12 * g.HH]], armCol);
        break;
      case 'point': {
        const h = overlayArm(p, g, [R, [R[0] + 70, R[1] - 10], [300 + 205, g.chin - 0.25 * g.HH]], armCol);
        p.stroke([[h[0], h[1]], [h[0] + 24, h[1] - 7]], 3.5 * u); // pointing finger
        break;
      }
      case 'up':
        overlayArm(p, g, [R, [R[0] + 40, R[1] - 0.35 * g.HH], [300 + 150, g.crown - 55]], armCol);
        overlayArm(p, g, [L, [L[0] - 40, L[1] - 0.35 * g.HH], [300 - 150, g.crown - 55]], armCol);
        break;
      case 'hip':
        overlayArm(p, g, [R, [R[0] + 55, R[1] + 0.25 * g.HH], [g.tcx + 0.72 * g.T.a, g.torsoBot - 0.18 * g.HH]], armCol);
        break;
      case 'belly':
        overlayArm(p, g, [R, [R[0] + 45, R[1] + 0.3 * g.HH], [300 + 14, g.torsoBot - 0.28 * g.HH]], armCol);
        overlayArm(p, g, [L, [L[0] - 45, L[1] + 0.3 * g.HH], [300 - 14, g.torsoBot - 0.28 * g.HH]], armCol);
        break;
      case 'temple': {
        overlayArm(p, g, [R, [R[0] + 45, R[1] - 0.3 * g.HH], [300 + 62, g.hc - 52]], armCol);
        drawSwirl(p, 300 + 108, g.hc - 82, u);
        break;
      }
      case 'lift':
        overlayArm(p, g, [R, [R[0] + 55, R[1] - 0.45 * g.HH], [300 + 95, g.crown - 95]], armCol);
        break;
      case 'reach':
      case 'reach_lift':
        overlayArm(p, g, [R, [R[0] + 75, R[1] - 0.3 * g.HH], [300 + 188, g.crown - 18]], armCol);
        if (arm === 'reach_lift' || armLift)
          overlayArm(p, g, [L, [L[0] - 50, L[1] - 0.4 * g.HH], [300 - 115, g.crown - 10]], armCol);
        break;
      case 'cheek':
        overlayArm(p, g, [R, [R[0] + 40, R[1] - 0.25 * g.HH], [300 + 58, g.hc + 8]], armCol);
        break;
      case 'shield':
        overlayArm(p, g, [R, [R[0] + 30, R[1] - 0.55 * g.HH], [300 - 45, g.hc - 8]], armCol);
        break;
      case 'cross':
        overlayArm(p, g, [R, [R[0] + 20, R[1] + 0.25 * g.HH], [300 - 55, g.chin + 0.45 * g.HH]], armCol);
        overlayArm(p, g, [L, [L[0] - 20, L[1] + 0.25 * g.HH], [300 + 55, g.chin + 0.6 * g.HH]], armCol);
        break;
      case 'thumb': {
        // Fist up at shoulder height, thumb tick long and vertical so it reads at card scale.
        const h = overlayArm(p, g, [R, [R[0] + 55, R[1] + 0.4 * g.HH], [R[0] + 78, R[1] - 0.28 * g.HH]], armCol);
        p.stroke([[h[0], h[1]], [h[0] + 3, h[1] - 22]], 4 * u); // thumb tick
        break;
      }
      default: break; // hang / wave: native arms already drawn
    }

    // ---- props (drawn after the arms so hands grip them) ----
    if (prop === 'pipe') {
      const mouth = [300 + 14, g.hc + 20 * u];
      const tip = [300 + 95, g.hc - 55 * u];
      p.line([mouth, tip], '#7a4b2a', 5 * u);
      p.poly([[tip[0] - 4, tip[1] - 12], [tip[0] + 16, tip[1] - 2], [tip[0] + 8, tip[1] + 12], [tip[0] - 10, tip[1] + 2]], '#8a5a34', 2 * u);
      const h = overlayArm(p, g, [R, [R[0] + 35, R[1] + 0.1 * g.HH], [300 + 38, g.hc + 22 * u]], armCol);
      p.dot(h[0], h[1], 5.5 * u);
    } else if (prop === 'drum') {
      const cy = g.torsoBot - 0.02 * g.HH;
      p.band([[300 - 60, g.chin + 0.1 * g.HH], [300 + 40, cy - 0.1 * g.HH]], '#8a5a3a', 10, 2);
      const drum = TB.rrect(300 - 85, cy - 55, 300 + 85, cy + 55, 14);
      p.poly(drum, '#f1ece0', 8);
      p.poly(TB.rrect(300 - 92, cy - 62, 300 + 92, cy - 34, 10), '#c9373a', 7);
      p.poly(TB.rrect(300 - 92, cy + 34, 300 + 92, cy + 62, 10), '#c9373a', 7);
      p.line([[300 - 60, cy - 30], [300 - 30, cy + 30], [300, cy - 30], [300 + 30, cy + 30], [300 + 60, cy - 30]], TB.INK, 4);
      for (const side of [1, -1]) {
        const h = overlayArm(p, g, [S(side), [S(side)[0] + side * 40, S(side)[1] + 0.35 * g.HH], [300 + side * 55, cy - 0.12 * g.HH]], armCol);
        p.stroke([[h[0], h[1]], [h[0] + side * 14, h[1] - 34]], 3 * u); // drumstick
      }
    } else if (prop === 'lute') {
      const bx = 300 - 30, by = g.torsoBot - 0.25 * g.HH;
      p.ell(bx, by, 55, 70, '#c98a4a', 7, 0, 360, -25);
      p.ell(bx, by, 16, 20, TB.INK, 0);
      p.line([[bx + 30, by - 55], [300 + 110, g.chin - 0.1 * g.HH]], '#7a4b2a', 7);
      p.dot(300 + 112, g.chin - 0.12 * g.HH, 7);
      const hL = overlayArm(p, g, [L, [L[0] - 40, L[1] - 0.2 * g.HH], [300 + 92, g.chin - 0.05 * g.HH]], armCol);
      const hR = overlayArm(p, g, [R, [R[0] + 30, R[1] + 0.3 * g.HH], [300 - 8, g.torsoBot - 0.2 * g.HH]], armCol);
      p.dot(hL[0], hL[1], 5.5 * u); p.dot(hR[0], hR[1], 5.5 * u);
    }
  } finally {
    p.rot = null;
  }
}

// ---------------- standalone prop cards (600 x 1000, prop centred) ----------------
export function drawPipe(p) {
  const a = [185, 660], b = [425, 330];
  p.line([a, b], '#7a4b2a', 14);
  p.poly([[b[0] - 6, b[1] - 26], [b[0] + 34, b[1] - 6], [b[0] + 18, b[1] + 26], [b[0] - 20, b[1] + 6]], '#8a5a34', 5);
  for (let i = 1; i <= 4; i++) {
    const t = i / 5, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    p.dot(x, y, 6, TB.INK);
  }
  p.dot(a[0], a[1], 9, '#e8c45a');
}

export function drawDrum(p) {
  p.poly(TB.rrect(150, 380, 450, 640, 22), '#f1ece0', 10);
  p.poly(TB.rrect(138, 362, 462, 404, 14), '#c9373a', 9);
  p.poly(TB.rrect(138, 616, 462, 658, 14), '#c9373a', 9);
  p.line([[180, 410], [230, 610], [280, 410], [330, 610], [380, 410], [425, 610]], TB.INK, 7);
  p.ell(300, 362, 162, 26, '#f7f3ea', 9);
}

export function drawLute(p) {
  p.ell(280, 640, 115, 150, '#c98a4a', 10, 0, 360, -18);
  p.ell(280, 640, 34, 42, TB.INK, 0);
  p.ell(300, 560, 90, 26, '#e0a35a', 5, 0, 360, -18);
  p.line([[330, 510], [440, 300]], '#7a4b2a', 12);
  for (let i = 0; i < 4; i++) p.line([[436 + i * 4, 296 - i * 10], [462 + i * 4, 282 - i * 10]], TB.INK, 5);
  p.dot(446, 292, 10, '#e8c45a');
}

// ---------------- proclamation sign (700 x 520) ----------------
export function drawSign(p) {
  const g = p.g, RED = '#d42f2f';
  p.poly(TB.rrect(14, 14, 686, 506, 40), '#f6ecd2', 0);
  p.poly(TB.rrect(14, 14, 686, 506, 40), null, 14);
  // Dancer pictogram: bean head, arms up, dress, one leg lifted mid-step.
  const cx = 350, hy = 165;
  p.ell(cx, hy, 34, 32, TB.SKIN, 7);
  p.poly([[cx - 26, hy + 30], [cx + 26, hy + 30], [cx + 48, hy + 150], [cx - 48, hy + 150]], '#8a7f9a', 7);
  p.stroke([[cx - 20, hy + 44], [cx - 58, hy - 6]], 9);
  p.stroke([[cx + 20, hy + 44], [cx + 58, hy - 6]], 9);
  p.stroke([[cx - 12, hy + 150], [cx - 34, hy + 208]], 9);
  p.stroke([[cx + 12, hy + 150], [cx + 44, hy + 176], [cx + 30, hy + 208]], 9);
  // Bold red X over the dancer (white under-stroke, as in toon.ts fxSign).
  for (const [a, b] of [[[150, 60], [550, 330]], [[550, 60], [150, 330]]]) {
    p.stroke([a, b], 46, '#ffffff');
    p.stroke([a, b], 32, RED);
  }
  // Plain capitals, drawn normally so they read correctly (never mirrored).
  g.save();
  g.font = 'bold 74px Arial, Helvetica, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = TB.INK;
  g.fillText('NO DANCING', 350, 432);
  g.restore();
}
