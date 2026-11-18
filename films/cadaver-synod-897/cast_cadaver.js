// cast_cadaver.js — 897 AD Roman Synod Cast:
//   - Pope Stephen VI (the furious prosecutor in crimson-and-gold papal mitre & robes)
//   - The Trembling Young Deacon (appointed defense lawyer in white dalmatic tunic holding scroll)
//   - Papal Crypt Guards / Bishops (with iron shovels & torches)
//   - Pope Formosus (articulated 2D Skeleton Defendant on the papal throne, in gold robes & mitre
//     or stripped sackcloth, with 3 blessing fingers or bandaged stump!)
//   - Pop-in graphic badges (Guilty ❌, Official Ban Decree ✅, Papal Edict Crest)
// Canvas design space: 600 x 1000 (soles at y = 975, 1000 units = 2.25 m).
import * as TB from './toonbase.js';

export const CARD_W = 600;
export const CARD_H = 1000;
export const SOLE_Y = 975;
export const CARD_H_M = 2.25;

export const OUTFITS = {
  // Pope Stephen VI — prosecuting pontiff
  stephen: {
    jacket: '#9b1c24', pants: '#73141a', boots: '#3a1414',
    hat: 'cap', cap: '#d8a838', buttons: '#f2ce68', bib: true, skin: TB.SKINS[0],
  },
  // Trembling Young Deacon — appointed defense counsel for the corpse
  deacon: {
    jacket: '#ede5d2', pants: '#cabfa6', boots: '#3d2a1d',
    hat: 'none', buttons: '#c9a248', skin: TB.SKINS[1],
  },
  // Papal Crypt Guard / Cardinal witness
  guard: {
    jacket: '#4f3b63', pants: '#3b2b4a', boots: '#261c18',
    hat: 'cap', cap: '#684d82', buttons: '#dfb652', skin: TB.SKINS[2], moustache: '#3a281c',
  },
};

const GUARD_SHADES = ['#4f3b63', '#61394c', '#3c4a63', '#5c4632'];

const DEFAULT_EXPR = {
  stephen: 'stern',
  deacon: 'shock',
  guard: 'stern',
};

function resolveOutfit(outfitKey, seed) {
  const base = OUTFITS[outfitKey] || OUTFITS.guard;
  const o = { ...base };
  if (outfitKey === 'guard') {
    o.jacket = GUARD_SHADES[seed % GUARD_SHADES.length];
    o.pants = TB.shade(o.jacket, 0.82);
    o.cap = TB.shade(o.jacket, 1.08);
    o.skin = TB.SKINS[seed % TB.SKINS.length];
  }
  return o;
}

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

function drawClericalDetails(p, g, outfitKey, o, rotA) {
  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    const by = g.torsoBot - 0.14 * g.HH;
    if (outfitKey === 'stephen') {
      // Gold embroidered papal stole + pectoral cross + tall pointed papal mitre
      p.poly(TB.rrect(g.tcx - 22, g.chin + 0.04 * g.HH, g.tcx + 22, by + 12, 4), '#f0c85a', 4);
      p.stroke([[g.tcx, g.chin + 0.25 * g.HH], [g.tcx, g.chin + 0.55 * g.HH]], 7, '#9b1c24');
      p.stroke([[g.tcx - 14, g.chin + 0.36 * g.HH], [g.tcx + 14, g.chin + 0.36 * g.HH]], 7, '#9b1c24');
      // Tall pointed papal mitre on Pope Stephen VI
      const mx = 300, my = g.crown + 8;
      p.poly([
        [mx - g.W * 0.48, my],
        [mx - g.W * 0.36, my - 96],
        [mx, my - 148],
        [mx + g.W * 0.36, my - 96],
        [mx + g.W * 0.48, my],
      ], '#f7eed2', 7);
      p.poly(TB.rrect(mx - g.W * 0.50, my - 16, mx + g.W * 0.50, my + 6, 4), '#e5b842', 5);
      p.stroke([[mx, my - 118], [mx, my - 36]], 9, '#d8a432');
      p.stroke([[mx - 24, my - 82], [mx + 24, my - 82]], 9, '#d8a432');
    } else if (outfitKey === 'deacon') {
      // Crimson deacon sash & monastic tonsure hair band
      p.stroke([[g.tcx - g.T.a * 0.62, g.chin + 0.08 * g.HH], [g.tcx + g.T.a * 0.48, by - 4]], 14, '#b82828');
      p.poly(TB.rrect(g.tcx - g.T.a * 0.88, by - 8, g.tcx + g.T.a * 0.88, by + 8, 4), '#c9a248', 4);
    } else {
      // Papal Guard halberdier / bishop belt & crimson cross badge
      p.poly(TB.rrect(g.tcx - g.T.a * 0.90, by - 9, g.tcx + g.T.a * 0.90, by + 9, 4), '#3d2718', 4);
      p.poly(TB.rrect(g.tcx - 13, by - 12, g.tcx + 13, by + 12, 3), '#e2be58', 4);
      p.dot(300, g.crown - 12, 9, '#e5b842');
    }
  } finally {
    p.rot = null;
  }
}

export function humanFront(p, outfitKey, opts = {}) {
  const {
    seed = 1, expr, mode = 'stand', phase = 0, look = 0, blink = false,
    lift = 60, tilt = 0, headTilt = 0, wave, light, facing = 0,
    arm = 'hang', talk = 0, gavelY = 0,
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

  drawClericalDetails(p, g, outfitKey, o, rotA);

  if (arm === 'hang' || arm === 'wave') return;

  const sw = mode === 'march' || mode === 'stroll' ? Math.sin(2 * Math.PI * phase) : 0;
  const armCol = TB.mix(o.jacket, TB.INK, 0.25);
  const S = (side) => shoulder(g, side);

  const eraseSides = new Set();
  if (['accuse', 'gavel', 'shovel', 'robe_present', 'scroll_panic', 'up', 'point'].includes(arm)) eraseSides.add(1);
  if (['gavel', 'shovel', 'robe_present', 'scroll_panic', 'up'].includes(arm)) eraseSides.add(-1);
  if (mode !== 'sit' && mode !== 'kneel') {
    for (const side of eraseSides) eraseArm(p, g, side, side < 0 ? -sw : sw, rotA);
  }

  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    const R = S(1), L = S(-1);
    switch (arm) {
      case 'accuse': {
        // Pope Stephen VI pointing furiously across courtroom toward skeleton throne
        const hx = 300 + 195, hy = g.chin - 0.22 * g.HH;
        overlayArm(p, g, [R, [R[0] + 68, R[1] - 0.18 * g.HH], [hx, hy]], armCol, o.skin);
        p.stroke([[hx, hy], [hx + 28, hy - 6]], 4.2 * u, o.skin);
        break;
      }
      case 'gavel': {
        // Left hand holding papal decree scroll ("ACTA NULLA"), Right hand slamming heavy wooden gavel!
        const lx = 300 - 118, ly = g.chin + 0.24 * g.HH;
        p.poly(TB.rrect(lx - 38, ly - 48, lx + 38, ly + 48, 6), '#f8f0d8', 5);
        for (let k = 0; k < 3; k++) p.stroke([[lx - 22, ly - 22 + k * 18], [lx + 22, ly - 22 + k * 18]], 3.5, TB.INK);
        p.dot(lx + 14, ly + 32, 12, '#c92a2a');
        overlayArm(p, g, [L, [L[0] - 40, L[1] + 0.16 * g.HH], [lx - 8, ly + 16]], armCol, o.skin);

        const hx = 300 + 128, hy = g.chin - 0.14 * g.HH + gavelY * 110;
        overlayArm(p, g, [R, [R[0] + 58, R[1] - 0.18 * g.HH], [hx, hy]], armCol, o.skin);
        // Wooden mallet head + handle
        p.stroke([[hx, hy], [hx + 46, hy + 18]], 10, '#5c3818');
        p.poly(TB.rrect(hx + 32, hy - 14, hx + 68, hy + 42, 6), '#7a4b24', 5);
        break;
      }
      case 'shovel': {
        // Crypt guard holding iron spade shovel across chest
        const sx = 300 + 95, sy = g.chin + 0.25 * g.HH;
        p.stroke([[sx - 120, sy + 45], [sx + 55, sy - 65]], 12, '#6b4423');
        p.poly([
          [sx + 45, sy - 92],
          [sx + 102, sy - 108],
          [sx + 88, sy - 42],
          [sx + 35, sy - 45],
        ], '#7b848f', 6);
        overlayArm(p, g, [L, [L[0] - 25, L[1] + 0.22 * g.HH], [sx - 65, sy + 12]], armCol, o.skin);
        overlayArm(p, g, [R, [R[0] + 35, R[1] + 0.12 * g.HH], [sx + 18, sy - 40]], armCol, o.skin);
        break;
      }
      case 'robe_present': {
        // Presenting golden papal mitre & vestments during crypt exhumation
        const rx = 300, ry = g.chin + 0.28 * g.HH;
        p.poly(TB.rrect(rx - 68, ry - 34, rx + 68, ry + 34, 8), '#d8a432', 6);
        p.poly(TB.rrect(rx - 52, ry - 20, rx + 52, ry + 20, 4), '#9b1c24', 4);
        overlayArm(p, g, [L, [L[0] - 32, L[1] + 0.18 * g.HH], [rx - 58, ry + 6]], armCol, o.skin);
        overlayArm(p, g, [R, [R[0] + 32, R[1] + 0.18 * g.HH], [rx + 58, ry + 6]], armCol, o.skin);
        break;
      }
      case 'scroll_panic': {
        // Trembling young deacon holding up "DEFENSE" scroll in left hand & sweating while waving right hand
        const lx = 300 - 128, ly = g.chin + 0.16 * g.HH;
        p.poly(TB.rrect(lx - 46, ly - 56, lx + 46, ly + 56, 6), '#fbf3dc', 6);
        p.poly(TB.rrect(lx - 52, ly - 62, lx + 52, ly - 48, 4), '#c99b42', 4);
        p.poly(TB.rrect(lx - 52, ly + 48, lx + 52, ly + 62, 4), '#c99b42', 4);
        for (let k = 0; k < 3; k++) p.stroke([[lx - 28, ly - 24 + k * 20], [lx + 28, ly - 24 + k * 20]], 4, TB.INK);
        overlayArm(p, g, [L, [L[0] - 45, L[1] + 0.12 * g.HH], [lx, ly + 22]], armCol, o.skin);

        const wag = Math.sin(phase * Math.PI * 6) * 22;
        const hx = 300 + 148 + wag, hy = g.chin - 0.28 * g.HH;
        overlayArm(p, g, [R, [R[0] + 55, R[1] - 0.15 * g.HH], [hx, hy]], armCol, o.skin);
        // Cartoon sweat droplets flying off trembling deacon's brow
        p.ell(300 - g.W * 0.56, g.hc - 18, 8, 14, '#74c0fc', 3);
        p.ell(300 + g.W * 0.58, g.hc - 6, 8, 14, '#74c0fc', 3);
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
    }
  } finally {
    p.rot = null;
  }
}

// ============================================================================
// POPE FORMOSUS — Articulated Cartoon Skeleton Defendant Rig (Gold Robes / Stripped)
// ============================================================================
const BONE_MAIN = '#f3ebd4';
const BONE_SHADE = '#d5c8a8';
const SOCKET_COL = '#1c1512';

export function drawSkeletonPope(p, opts = {}) {
  const {
    pose = 'throne',        // 'crypt' | 'throne' | 'puppet' | 'chopped' | 'stripped'
    robes = true,           // Rich crimson-and-gold papal vestments vs rough sackcloth
    mitre = true,           // Tall gold-and-white papal mitre on skull
    fingers = 3,            // 3 blessing fingers vs 0 (bandaged stump after chop!)
    jawOpen = 0,            // Clacking jaw when deacon puppeteers him
    phase = 0,
    tilt = 0,
    facing = 0,
  } = opts;

  const gg = p.g;
  gg.save();

  const rattle = pose === 'puppet' ? Math.sin(phase * Math.PI * 6) * 2.4 : Math.sin(phase * Math.PI * 2) * 0.9;
  const slumpTilt = (pose === 'throne' ? -5.5 : pose === 'chopped' ? 7.0 : 0) + tilt + rattle;

  gg.translate(300, SOLE_Y);
  gg.rotate(TB.rad(slumpTilt));
  gg.translate(-300, -SOLE_Y);

  const cx = 300 + facing * 10;

  // ---- 1. SKELETON LEGS & PAPAL SLIPPERS (soles at y = 975) ----
  for (const s of [-1, 1]) {
    const lx = cx + s * 68;
    // Tibia bone shaft + ankle joint
    p.stroke([[lx, 760], [lx, 940]], 26, TB.INK);
    p.stroke([[lx, 760], [lx, 940]], 16, BONE_MAIN);
    p.dot(lx, 765, 16, BONE_SHADE);
    // Crimson papal slipper (or bare bony foot when stripped)
    if (robes) {
      p.ell(lx + s * 8, 952, 46, 22, '#9b1c24', 6);
      p.stroke([[lx + s * 8 - 14, 950], [lx + s * 8 + 14, 950]], 4, '#f2ce68');
    } else {
      p.ell(lx + s * 8, 952, 44, 18, BONE_MAIN, 6);
    }
  }

  // ---- 2. RIBCAGE / TORSO & GOLD PAPAL VESTMENTS ----
  if (robes) {
    // Rich crimson papal chasuble cloak with gold border & embroidered cross
    p.poly([
      [cx - 145, 420],
      [cx + 145, 420],
      [cx + 175, 810],
      [cx - 175, 810],
    ], '#9b1c24', 8);
    p.poly([
      [cx - 115, 425],
      [cx + 115, 425],
      [cx + 92, 795],
      [cx - 92, 795],
    ], '#d8a432', 6);
    // White-and-gold papal pallium stole down the center with black crosses
    p.poly(TB.rrect(cx - 26, 420, cx + 26, 825, 6), '#f8f2de', 5);
    for (const cyCross of [510, 625, 740]) {
      p.stroke([[cx, cyCross - 16], [cx, cyCross + 16]], 6, TB.INK);
      p.stroke([[cx - 14, cyCross], [cx + 14, cyCross]], 6, TB.INK);
    }
  } else {
    // Stripped of royal vestments: tattered brown penitent sackcloth tunic + continuous neck & ribcage!
    p.poly([
      [cx - 118, 430],
      [cx + 118, 430],
      [cx + 132, 805],
      [cx - 132, 805],
    ], '#7d6346', 7);
    // Rope belt around sackcloth waist
    p.poly(TB.rrect(cx - 122, 650, cx + 122, 672, 6), '#c8a870', 5);
    // Continuous cervical & thoracic spine column connecting skull (y=360) to pelvis (y=655)
    p.stroke([[cx, 355], [cx, 650]], 30, TB.INK);
    p.stroke([[cx, 355], [cx, 650]], 18, BONE_SHADE);
    // Collarbone / clavicle bar connecting left & right shoulder sockets
    p.stroke([[cx - 126, 452], [cx + 126, 452]], 22, TB.INK);
    p.stroke([[cx - 126, 452], [cx + 126, 452]], 12, BONE_MAIN);
    // 4 curved cartoon ribs over the sackcloth chest
    for (let r = 0; r < 4; r++) {
      const ry = 468 + r * 42;
      const rw = 104 - r * 7;
      p.ell(cx, ry, rw, 15, BONE_MAIN, 6);
    }
  }

  // ---- 3. EXPRESSIVE CARTOON SKULL, HINGED JAW & GOLD PAPAL MITRE ----
  const hx = cx + (pose === 'throne' ? -8 : 0);
  const hy = 290;

  // Hinged lower jawbone (mandible) that drops when deacon speaks or during verdict shock
  const jawDrop = Math.round((jawOpen + (pose === 'chopped' ? 0.55 : 0)) * 32);
  p.poly(TB.rrect(hx - 58, hy + 42, hx + 58, hy + 108 + jawDrop, 18), BONE_MAIN, 7);
  // Dark mouth cavity when jaw is open
  if (jawDrop > 4) {
    p.poly(TB.rrect(hx - 42, hy + 52, hx + 42, hy + 68 + jawDrop, 8), SOCKET_COL, 4);
  }
  // Upper & lower cartoon teeth row with vertical tooth seams
  p.poly(TB.rrect(hx - 46, hy + 38, hx + 46, hy + 58, 4), '#ffffff', 5);
  p.poly(TB.rrect(hx - 44, hy + 58 + jawDrop, hx + 44, hy + 76 + jawDrop, 4), '#ffffff', 5);
  for (let tx = -30; tx <= 30; tx += 15) {
    p.stroke([[hx + tx, hy + 38], [hx + tx, hy + 58]], 3.5, TB.INK);
    p.stroke([[hx + tx, hy + 58 + jawDrop], [hx + tx, hy + 76 + jawDrop]], 3.5, TB.INK);
  }

  // Upper cranium dome & cheekbones
  p.ell(hx, hy - 12, 112, 96, BONE_MAIN, 8);
  p.ell(hx - 76, hy + 24, 34, 26, BONE_MAIN, 6);
  p.ell(hx + 76, hy + 24, 34, 26, BONE_MAIN, 6);

  // Dark hollow eye sockets with expressive glowing pinpricks & cartoon brow ridges
  for (const s of [-1, 1]) {
    const ex = hx + s * 42, ey = hy - 8;
    p.ell(ex, ey, 26, 28, SOCKET_COL, 5);
    // Tiny comical ivory eye-ring inside socket so gaze reads clearly at 9:16
    p.dot(ex + facing * 3, ey, 7, '#f7eed2');
    // Expressive bone brow ridge
    const bTilt = pose === 'chopped' ? s * 10 : -s * 5;
    p.stroke([[ex - 26, ey - 30 + bTilt], [ex + 26, ey - 30 - bTilt]], 7, TB.INK);
  }

  // Triangular dark nasal cavity
  p.poly([[hx, hy + 6], [hx - 14, hy + 30], [hx + 14, hy + 30]], SOCKET_COL, 4);

  // Tall Golden Papal Mitre (Crown) perched on skull
  if (mitre) {
    const my = hy - 78;
    p.poly([
      [hx - 96, my],
      [hx - 74, my - 115],
      [hx, my - 172],
      [hx + 74, my - 115],
      [hx + 96, my],
    ], '#f9f1d8', 8);
    // Gold headband & vertical/horizontal cross orphrey bands
    p.poly(TB.rrect(hx - 102, my - 22, hx + 102, my + 8, 6), '#e5b842', 6);
    p.poly(TB.rrect(hx - 14, my - 150, hx + 14, my - 20, 3), '#e5b842', 4);
    p.poly(TB.rrect(hx - 54, my - 96, hx + 54, my - 72, 3), '#e5b842', 4);
    // Ruby jewel on mitre center
    p.dot(hx, my - 84, 11, '#c92a2a');
  }

  // ---- 4. SKELETON ARMS, PAPAL CROSIER & 3 BLESSING FINGERS (OR CHOPPED STUMP!) ----
  const LS = [cx - 128, 455];
  const RS = [cx + 128, 455];

  const drawBoneArm = (pts) => {
    const c = TB.curve(pts[0], pts[1], pts[2]);
    if (robes) {
      p.stroke(c, 48, TB.INK);
      p.stroke(c, 36, '#9b1c24');
    } else {
      p.stroke(c, 26, TB.INK);
      p.stroke(c, 16, BONE_MAIN);
    }
  };

  // Left arm holding golden Papal Crosier staff (when robed) or hanging limp
  if (robes) {
    const lx = cx - 168, ly = 535;
    // Tall golden Papal Triple-Cross Crosier staff
    p.stroke([[lx, 210], [lx, 955]], 16, TB.INK);
    p.stroke([[lx, 210], [lx, 955]], 10, '#f0c448');
    for (const [cyBar, wBar] of [[245, 34], [285, 48], [325, 34]]) {
      p.stroke([[lx - wBar, cyBar], [lx + wBar, cyBar]], 14, TB.INK);
      p.stroke([[lx - wBar, cyBar], [lx + wBar, cyBar]], 8, '#f0c448');
    }
    drawBoneArm([LS, [cx - 175, 505], [lx, ly]]);
    p.ell(lx, ly, 22, 18, BONE_MAIN, 5);
  } else {
    drawBoneArm([LS, [cx - 165, 555], [cx - 155, 675]]);
    p.ell(cx - 155, 685, 22, 18, BONE_MAIN, 5);
  }

  // Right arm raised in papal blessing (showing 3 bony fingers OR bandaged stump after chop!)
  const wagY = pose === 'puppet' ? Math.sin(phase * Math.PI * 6) * 28 : 0;
  const rx = cx + 178, ry = 435 + wagY;
  drawBoneArm([RS, [cx + 188, 520], [rx, ry]]);

  if (fingers === 3) {
    // Bony palm + 3 distinct raised papal blessing fingers!
    p.ell(rx, ry, 26, 22, BONE_MAIN, 6);
    for (const fxOff of [-14, 0, 14]) {
      p.stroke([[rx + fxOff, ry - 16], [rx + fxOff + fxOff * 0.25, ry - 68]], 13, TB.INK);
      p.stroke([[rx + fxOff, ry - 16], [rx + fxOff + fxOff * 0.25, ry - 68]], 7, BONE_MAIN);
    }
  } else {
    // Comical cartoon white bandage stump with red cross & star burst after "three blessing fingers chopped off"!
    p.ell(rx, ry - 12, 34, 30, '#ffffff', 7);
    p.stroke([[rx - 18, ry - 18], [rx + 18, ry - 6]], 5, '#d63031');
    p.stroke([[rx - 18, ry - 4], [rx + 18, ry - 16]], 5, '#d63031');
  }

  gg.restore();
}

// ============================================================================
// POP-IN GRAPHIC BADGES (Guilty ❌ / Official Ban Decree ✅)
// ============================================================================
export function drawBadge(p, kind = 'check') {
  const cx = 300, cy = 500;
  if (kind === 'ban') {
    p.ell(cx, cy, 155, 155, '#ffffff', 10);
    p.ell(cx, cy, 132, 132, '#d63031', 8);
    p.ell(cx, cy, 88, 88, '#fff5f5', 6);
    p.stroke([[cx - 78, cy - 78], [cx + 78, cy + 78]], 28, '#d63031');
    p.stroke([[cx + 78, cy - 78], [cx - 78, cy + 78]], 28, '#d63031');
  } else {
    p.ell(cx, cy, 155, 155, '#ffffff', 10);
    p.ell(cx, cy, 132, 132, '#27ae60', 8);
    p.stroke([[cx - 62, cy + 6], [cx - 16, cy + 54], [cx + 68, cy - 44]], 34, '#145a32');
    p.stroke([[cx - 62, cy + 2], [cx - 16, cy + 50], [cx + 68, cy - 48]], 26, '#ffffff');
  }
}
