// cast_weevil.js — St-Julien 1587 characters, arm overlays, props, and articulated Weevil rigs.
// Canvas design space: 600 x 1000 (humans: soles at y = 975, 1000 units = 2.25 m).
import * as TB from './toonbase.js';

export const CARD_W = 600;
export const CARD_H = 1000;
export const SOLE_Y = 975;
export const CARD_H_M = 2.25;

// ---------------- outfits ----------------
export const OUTFITS = {
  // François Amenet — Savoyard winegrower in straw hat, slate tunic, cream apron
  amenet: {
    jacket: '#3d6188', pants: '#4d3a2c', boots: '#3a2518',
    hat: 'straw', apron: '#efe2c6', skin: TB.SKINS[1], moustache: '#4b3122',
  },
  // Antoine Filliol — Insect defense procurator in black robe, white linen rabat & square toque
  filliol: {
    jacket: '#1c1824', pants: '#1c1824', boots: '#16131c',
    hat: 'lawyer', dress: '#241e2e', bib: true, skin: TB.SKIN,
  },
  // Bishop's Official Judge — Stout ecclesiastical judge in burgundy cassock & velvet miter
  bishop: {
    jacket: '#6b2a3e', pants: '#321c26', boots: '#211419', build: 'stout',
    hat: 'miter', dress: '#542032', buttons: '#e0b858', skin: TB.SKINS[2], moustache: '#8c8682',
  },
  // Parish Clerk / Town Villagers (seeded variation in courtroom / assembly shots)
  villager_m: {
    jacket: '#6c7a44', pants: '#4b3b2f', boots: '#3c281b',
    hat: 'cap', cap: '#5a3b2a', skin: TB.SKINS[0],
  },
  villager_f: {
    jacket: '#8b454f', pants: '#3b3f52', boots: '#3c281b',
    hat: 'bonnet', dress: '#a55662', skin: TB.SKINS[2],
  },
};

const VILLAGER_COATS = ['#6c7a44', '#a86740', '#4f6d8a', '#7c5c42', '#526f64'];
const VILLAGER_DRESSES = ['#b66b52', '#7a8a56', '#8d6478', '#c19652'];
const CAPS = ['#4a3426', '#333640', '#5e4532'];

const DEFAULT_EXPR = {
  amenet: 'nervous',
  filliol: 'smug',
  bishop: 'stern',
  villager_m: 'shock',
  villager_f: 'nervous',
};

function resolveOutfit(outfitKey, seed) {
  const base = OUTFITS[outfitKey];
  if (!base) throw new Error(`unknown outfit: ${outfitKey}`);
  const o = { ...base };
  if (outfitKey === 'villager_m') {
    o.jacket = VILLAGER_COATS[seed % VILLAGER_COATS.length];
    o.skin = TB.SKINS[seed % TB.SKINS.length];
    o.cap = CAPS[seed % CAPS.length];
    o.hat = seed % 3 === 0 ? 'straw' : 'cap';
    if (seed % 2 === 1) o.moustache = '#3d2a1e';
  } else if (outfitKey === 'villager_f') {
    o.dress = VILLAGER_DRESSES[seed % VILLAGER_DRESSES.length];
    o.jacket = TB.shade(o.dress, 0.72);
    o.skin = TB.SKINS[seed % TB.SKINS.length];
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
  let dressPts = null;
  if (outfit.dress && mode !== 'sit' && mode !== 'kneel') {
    const D = {
      a: 0.5 * W * 0.98, b: 0.5 * ((SOLE_Y - 0.35 * HH) - (chin - 0.2 * HH)),
      nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0.03 * facing, rot: 0, noise: 0.006, seed: seed + 9,
    };
    dressPts = TB.blobPts(300, SOLE_Y - 0.35 * HH - D.b, D);
  }
  return { Bd, H, W, HH, u, torsoBot, chin, hc, crown, hipY, T, tcx, torsoPts, dressPts };
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

function overlayArm(p, g, pts, armCol) {
  const u = g.u;
  const c = pts.length === 2
    ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]]
    : TB.curve(pts[0], pts[1], pts[2]);
  p.stroke(c, 5.2 * u + 3.5, TB.INK);
  p.stroke(c, 5.2 * u, armCol);
  const h = pts[pts.length - 1];
  p.dot(h[0], h[1], 5.5 * u);
  return h;
}

// ---------------- main human cast draw entry ----------------
export function humanFront(p, outfitKey, opts = {}) {
  const {
    seed = 1, expr, mode = 'stand', phase = 0, look = 0, blink = false,
    lift = 60, tilt = 0, headTilt = 0, wave, light, facing = 0,
    arm = 'hang', talk = 0, gavelAng = 0, stampY = 0,
  } = opts;
  const o = resolveOutfit(outfitKey, seed);
  const useWave = arm === 'wave' ? (wave ?? 1) : wave;
  TB.bodyFront(p, o, {
    phase, expr: expr ?? DEFAULT_EXPR[outfitKey] ?? 'neutral', mode, look, blink,
    lift, prop: null, tilt, headTilt, wave: useWave, light, facing, seed, talk,
  });

  if (arm === 'hang' || arm === 'wave') return;

  const g = geomFor(o, mode, phase, seed, facing);
  const u = g.u;
  const sway = mode === 'march' ? 1.6 * Math.sin(2 * Math.PI * phase)
    : mode === 'stroll' ? 1.0 * Math.sin(2 * Math.PI * phase) : 0;
  const rotA = tilt + sway;
  const sw = mode === 'march' || mode === 'stroll' ? Math.sin(2 * Math.PI * phase) : 0;
  const armCol = TB.mix(o.jacket, TB.INK, 0.5);
  const S = (side) => shoulder(g, side);

  const eraseSides = new Set();
  if (['point', 'point_up', 'gavel', 'quill', 'loupe', 'stamp', 'cheek', 'hip', 'summons'].includes(arm)) eraseSides.add(1);
  if (['up', 'shock_up', 'summons', 'point_up', 'cross'].includes(arm)) eraseSides.add(-1);
  if (mode !== 'sit' && mode !== 'kneel') {
    for (const side of eraseSides) eraseArm(p, g, side, side < 0 ? -sw : sw, rotA);
  }

  p.rot = rotA ? [TB.rad(rotA), 300, g.hipY] : null;
  try {
    const R = S(1), L = S(-1);
    switch (arm) {
      case 'up':
      case 'shock_up':
        overlayArm(p, g, [R, [R[0] + 45, R[1] - 0.35 * g.HH], [300 + 148, g.crown - 42]], armCol);
        overlayArm(p, g, [L, [L[0] - 45, L[1] - 0.35 * g.HH], [300 - 148, g.crown - 42]], armCol);
        break;
      case 'cheek':
        overlayArm(p, g, [R, [R[0] + 44, R[1] - 0.25 * g.HH], [300 + 58, g.hc + 10]], armCol);
        break;
      case 'hip':
        overlayArm(p, g, [R, [R[0] + 54, R[1] + 0.24 * g.HH], [g.tcx + 0.72 * g.T.a, g.torsoBot - 0.16 * g.HH]], armCol);
        break;
      case 'cross':
        overlayArm(p, g, [R, [R[0] + 22, R[1] + 0.24 * g.HH], [300 - 54, g.chin + 0.46 * g.HH]], armCol);
        overlayArm(p, g, [L, [L[0] - 22, L[1] + 0.24 * g.HH], [300 + 54, g.chin + 0.6 * g.HH]], armCol);
        break;
      case 'summons': {
        // Amenet brandishing unrolled parchment court summons toward the vines
        const hx = 300 + 168, hy = g.chin - 0.16 * g.HH;
        const sx = hx - 22, sy = hy - 22;
        p.poly(TB.rrect(sx - 52, sy - 64, sx + 52, sy + 52, 8), '#f5e8c8', 6);
        p.ell(sx, sy - 64, 54, 11, '#ebd4a0', 5);
        p.ell(sx, sy + 52, 54, 11, '#ebd4a0', 5);
        for (let k = 0; k < 4; k++) p.stroke([[sx - 34, sy - 38 + k * 14], [sx + 34, sy - 38 + k * 14]], 3.2, TB.INK);
        p.dot(sx + 18, sy + 24, 13, '#b8322c');
        overlayArm(p, g, [R, [R[0] + 62, R[1] + 0.08 * g.HH], [hx - 14, hy + 10]], armCol);
        overlayArm(p, g, [L, [L[0] - 28, L[1] + 0.2 * g.HH], [sx - 36, sy + 28]], armCol);
        break;
      }
      case 'point_up': {
        // Filliol points upward to heaven (Genesis defense) while cradling codex book in left hand
        const bx = 300 - 118, by = g.chin + 0.34 * g.HH;
        p.poly([[bx - 40, by - 30], [bx + 36, by - 36], [bx + 42, by + 34], [bx - 34, by + 40]], '#6d3026', 6);
        p.stroke([[bx - 24, by - 14], [bx + 22, by - 18]], 4, '#e0b858');
        overlayArm(p, g, [L, [L[0] - 42, L[1] + 0.18 * g.HH], [bx + 10, by + 18]], armCol);
        const h = overlayArm(p, g, [R, [R[0] + 64, R[1] - 0.2 * g.HH], [300 + 148, g.crown - 62]], armCol);
        p.stroke([[h[0], h[1]], [h[0] + 6, h[1] - 32]], 4.2 * u); // tall vertical index finger!
        break;
      }
      case 'point': {
        const h = overlayArm(p, g, [R, [R[0] + 72, R[1] - 10], [300 + 202, g.chin - 0.22 * g.HH]], armCol);
        p.stroke([[h[0], h[1]], [h[0] + 24, h[1] - 6]], 3.5 * u);
        break;
      }
      case 'gavel': {
        // Judge gripping gavel high or mid-slam
        const h = overlayArm(p, g, [R, [R[0] + 62, R[1] - 0.2 * g.HH], [300 + 140, g.chin - 0.35 * g.HH + gavelAng * 105]], armCol);
        const tx = h[0] + 38 * Math.cos(gavelAng - 0.65), ty = h[1] + 38 * Math.sin(gavelAng - 0.65);
        p.line([h, [tx, ty]], '#6e4226', 10);
        p.poly([
          [tx - 24 * Math.sin(gavelAng - 0.65) - 16 * Math.cos(gavelAng - 0.65), ty + 24 * Math.cos(gavelAng - 0.65) - 16 * Math.sin(gavelAng - 0.65)],
          [tx + 24 * Math.sin(gavelAng - 0.65) - 16 * Math.cos(gavelAng - 0.65), ty - 24 * Math.cos(gavelAng - 0.65) - 16 * Math.sin(gavelAng - 0.65)],
          [tx + 24 * Math.sin(gavelAng - 0.65) + 16 * Math.cos(gavelAng - 0.65), ty - 24 * Math.cos(gavelAng - 0.65) + 16 * Math.sin(gavelAng - 0.65)],
          [tx - 24 * Math.sin(gavelAng - 0.65) + 16 * Math.cos(gavelAng - 0.65), ty + 24 * Math.cos(gavelAng - 0.65) + 16 * Math.sin(gavelAng - 0.65)],
        ], '#8c5530', 5);
        break;
      }
      case 'loupe': {
        // Filliol inspecting the ground through a brass magnifying glass
        const hx = 300 + 135, hy = g.chin + 0.45 * g.HH;
        overlayArm(p, g, [R, [R[0] + 58, R[1] + 0.14 * g.HH], [hx, hy]], armCol);
        p.line([[hx, hy], [hx + 34, hy + 28]], '#6b4228', 8);
        p.ell(hx + 66, hy + 52, 42, 42, 'rgba(205,235,248,0.68)', 8);
        p.ell(hx + 66, hy + 52, 42, 42, null, 4, 0, 360);
        p.arc(hx + 56, hy + 42, 22, 22, 200, 290, 5, '#ffffff');
        break;
      }
      case 'stamp': {
        // Filliol holding big wooden court stamp slamming down
        const hx = 300 + 130, hy = g.chin + 0.1 * g.HH + stampY * 145;
        overlayArm(p, g, [R, [R[0] + 62, R[1] - 0.18 * g.HH], [hx, hy]], armCol);
        p.poly([[hx - 18, hy + 4], [hx + 18, hy + 4], [hx + 40, hy + 38], [hx - 40, hy + 38]], '#7a4526', 5);
        p.poly([[hx - 42, hy + 36], [hx + 42, hy + 36], [hx + 42, hy + 50], [hx - 42, hy + 50]], '#c92e2e', 5);
        break;
      }
      case 'quill': {
        // Holding white goose quill over ledger
        const hx = 300 + 115, hy = g.chin + 0.2 * g.HH;
        p.line([[hx - 8, hy + 10], [hx + 58, hy - 95]], '#f6f1e4', 10);
        p.stroke([[hx - 8, hy + 10], [hx - 14, hy + 20]], 5, TB.INK);
        overlayArm(p, g, [R, [R[0] + 52, R[1] + 0.12 * g.HH], [hx, hy]], armCol);
        break;
      }
      default: break;
    }
  } finally {
    p.rot = null;
  }
}

// ---------------- HERO WEEVIL RIG (600 x 1000 card, soles y = 975) ----------------
/**
 * Draw the Hero Weevil (*Verpillion*) or colony bug as a full cartoon character.
 * Supports smooth articulation: stride (6-leg gait), chew (mandible snap),
 * bounce (antenna spring), expr ('smug'|'munch'|'innocent'|'shock'|'burp'), blink,
 * prop ('leaf'|'crumb'|null), look (-1..1).
 */
export function weevilFront(p, opts = {}) {
  const {
    expr = 'smug', phase = 0, chew = 0, bounce = 0, blink = 0,
    prop = null, look = 0, scaleBody = 1.0, tilt = 0,
  } = opts;

  const cx = 300, groundY = 970;
  const bobY = Math.sin(phase * Math.PI * 2 * 2) * 14;
  p.rot = tilt ? [TB.rad(tilt), cx, groundY - 220] : null;

  try {
    const legCol = '#2a4a24';
    const footPairs = [
      [-1, 0, -145, 760, -210, 965],
      [1, 0.5, 145, 760, 210, 965],
      [-1, 0.5, -135, 810, -175, 972],
      [1, 0, 135, 810, 175, 972],
      [-1, 0, -105, 850, -110, 974],
      [1, 0.5, 105, 850, 110, 974],
    ];
    for (const [side, ph, sx, sy, fx, fy] of footPairs) {
      const lift = Math.max(0, Math.sin((phase + ph) * Math.PI * 2)) * 28;
      const kx = cx + sx + side * 42;
      const ky = sy + 72 - lift * 0.6;
      const endX = cx + fx + side * 14 * Math.cos((phase + ph) * Math.PI * 2);
      const endY = fy - lift;
      p.line([[cx + sx * 0.72, sy + bobY], [kx, ky], [endX, endY]], legCol, 18 * scaleBody);
      p.ell(endX + side * 10, endY, 18 * scaleBody, 9 * scaleBody, legCol, 7);
    }

    // Main glossy emerald-gold carapace abdomen & thorax (thick-thin ink rim + sun gradient)
    const bodyCX = cx, bodyCY = 675 + bobY;
    const shell = TB.blobPts(bodyCX, bodyCY, {
      a: 190 * scaleBody, b: 215 * scaleBody, nTop: 1.9, nBot: 2.35,
      egg: -0.08, asym: 0, rot: 0, noise: 0.008, seed: 42,
    });
    p.shadedFill(shell, '#68b642', '#346822', TB.rad(-120), 210 * scaleBody, 0.42, 0.85, 1.25);
    p.clip(shell, () => {
      // Golden bronze iridescent wing-cover stripe + belly cream band + chitin sheen
      p.ell(bodyCX + 6, bodyCY + 145, 115, 78, '#c5cf6a', 0);
      p.stroke([[bodyCX, bodyCY - 190], [bodyCX, bodyCY + 205]], 7, '#22441b');
      for (const [dx, dy, r] of [[-78, -60, 10], [82, -45, 10], [-95, 35, 11], [95, 45, 11], [-65, 115, 9], [68, 120, 9]]) {
        p.dot(bodyCX + dx, bodyCY + dy, r, '#46822e');
      }
      // Glossy specular crescent upper-left
      p.ell(bodyCX - 62, bodyCY - 98, 52, 26, 'rgba(225,250,155,0.45)', 0, 0, 360, -28);
    });
    p.inkRing(shell, 13, TB.thickAngle(TB.rad(-120)));

    // Cute rounded weevil head & long curved rostrum snout at top-front
    const headCY = 468 + bobY * 0.8;
    const head = TB.blobPts(cx, headCY, {
      a: 122 * scaleBody, b: 102 * scaleBody, nTop: 1.9, nBot: 2.1,
      egg: 0.06, asym: 0, rot: 0, noise: 0.005, seed: 77,
    });
    p.shadedFill(head, '#74c44b', '#3b7427', TB.rad(-120), 120 * scaleBody, 0.4, 0.9, 1.25);
    p.inkRing(head, 12, TB.thickAngle(TB.rad(-120)));

    // Clubbed elbowed weevil antennae bouncing playfully!
    const antBounce = Math.sin(bounce * Math.PI * 2) * 26;
    for (const side of [-1, 1]) {
      const a0 = [cx + side * 48, headCY - 68];
      const a1 = [cx + side * 124, headCY - 155 + antBounce * side * 0.6];
      const a2 = [cx + side * 165, headCY - 198 - antBounce];
      p.line([a0, a1, a2], '#3f6e27', 10);
      p.ell(a2[0], a2[1], 19, 14, '#c4b84b', 7, 0, 360, side * 25);
    }

    // Large cartoon eyes with expressive lids & brows
    for (const side of [-1, 1]) {
      const ex = cx + side * 48, ey = headCY - 12;
      p.ell(ex, ey, 33, 35, '#ffffff', 8);
      if (blink >= 0.8 || expr === 'sleep') {
        p.ell(ex, ey, 33, 35, '#68b642', 0);
        p.stroke([[ex - 26, ey], [ex + 26, ey]], 8);
      } else if (expr === 'wink' && side === 1) {
        p.ell(ex, ey, 33, 35, '#68b642', 0);
        p.arc(ex, ey + 6, 22, 14, 200, 340, 8);
      } else {
        const px = ex + look * 9 + side * -3, py = ey + (expr === 'innocent' ? -6 : 2);
        p.dot(px, py, expr === 'shock' ? 9 : 13, TB.INK);
        p.dot(px - 4, py - 5, 4.5, '#ffffff');
        if (expr === 'smug' || blink > 0.2) {
          p.clip([[ex - 36, ey - 38], [ex + 36, ey - 38], [ex + 36, ey - 4], [ex - 36, ey - 4]], () => {
            p.ell(ex, ey, 33, 35, '#68b642', 0);
          });
          p.stroke([[ex - 30, ey - 4], [ex + 30, ey - 4]], 7);
        }
      }
      // Comical brow
      const browTilt = expr === 'smug' ? side * -9 : expr === 'innocent' ? side * 8 : expr === 'shock' ? -14 : 0;
      p.stroke([[ex - 22, ey - 42 + browTilt], [ex + 22, ey - 42 - browTilt]], 8);
    }

    // Long curved proboscis snout + chewing mandibles!
    const snoutY = headCY + 66 + chew * 10;
    const jawOpen = 14 + chew * 22;
    p.poly([
      [cx - 34, headCY + 24],
      [cx + 34, headCY + 24],
      [cx + 22, snoutY + 12],
      [cx + 12, snoutY + 34],
      [cx - 12, snoutY + 34],
      [cx - 22, snoutY + 12],
    ], '#559c33', 9);
    // Cute golden snout tip bands & mandibles
    p.ell(cx, snoutY + 18, 22, 11, '#a9c75a', 6);
    p.poly([[cx - 22, snoutY + 28], [cx - 8, snoutY + 46 + jawOpen * 0.4], [cx - 4, snoutY + 28]], '#e4d5a0', 6);
    p.poly([[cx + 22, snoutY + 28], [cx + 8, snoutY + 46 + jawOpen * 0.4], [cx + 4, snoutY + 28]], '#e4d5a0', 6);

    // Optional nibbled prop held in mandibles or cheek crumb!
    if (prop === 'leaf') {
      p.poly([
        [cx - 85, snoutY + 55], [cx - 15, snoutY + 28], [cx + 68, snoutY + 42],
        [cx + 82, snoutY + 95], [cx + 24, snoutY + 72], [cx - 32, snoutY + 115],
      ], '#71bf45', 8);
      p.stroke([[cx - 58, snoutY + 78], [cx + 55, snoutY + 62]], 5, '#3b7325');
    } else if (prop === 'crumb') {
      // Torn jagged ledger corner stuck cleanly to mandibles (`VERDICT` scrap!)
      p.poly([
        [cx + 10, snoutY + 22], [cx + 95, snoutY + 12], [cx + 85, snoutY + 68],
        [cx + 38, snoutY + 58], [cx + 18, snoutY + 75],
      ], '#f5ead0', 6);
      p.stroke([[cx + 28, snoutY + 38], [cx + 76, snoutY + 34]], 4, '#5a221d');
      p.dot(cx - 28, snoutY + 44, 6, '#f5ead0');
      p.dot(cx + 98, snoutY + 28, 7, '#f5ead0');
    }

    if (expr === 'burp') {
      // Little cheeky burp puff bubble beside snout
      p.ell(cx - 58, snoutY - 6, 26, 20, '#f5ead0', 6);
      p.ell(cx - 88, snoutY - 26, 14, 12, '#f5ead0', 5);
    }
  } finally {
    p.rot = null;
  }
}

// ---------------- STANDALONE MACRO / PROP CARDS ----------------
/**
 * Giant serrated grapevine leaf for Shot 1 opening hook (`biteCount` = 0..4 circular notches taken out!)
 * Drawn across 800 x 800 card.
 */
export function drawMacroLeaf(p, bites = 0) {
  const g = p.g;
  // Build full grape leaf contour then punch circular jagged caterpillar/weevil bite scallops cleanly out!
  const pts = [
    [400, 120], [490, 175], [575, 150], [610, 265], [705, 315],
    [660, 445], [710, 560], [565, 625], [495, 705], [412, 680],
    [400, 775], [388, 680], [305, 705], [235, 625], [90, 560],
    [140, 445], [95, 315], [190, 265], [225, 150], [310, 175],
  ];
  g.save();
  p.shadedFill(pts, '#58ab3a', '#357326', TB.rad(-120), 340, 0.38);
  // Crisp leaf veins
  p.stroke([[400, 760], [400, 165]], 10, '#8ad158');
  for (const [ax, ay, bx, by] of [
    [400, 540, 180, 480], [400, 540, 620, 480],
    [400, 405, 155, 310], [400, 405, 645, 310],
    [400, 290, 255, 195], [400, 290, 545, 195],
  ]) p.stroke([[ax, ay], [bx, by]], 7, '#8ad158');
  p.poly(pts, null, 14);

  // Progressive cartoonish weevil bite notches (0..4) cut straight through canvas alpha!
  const notches = [
    [575, 168, 76],
    [695, 325, 86],
    [225, 175, 76],
    [400, 155, 88],
  ];
  if (bites > 0) {
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < Math.min(bites, notches.length); i++) {
      const [nx, ny, nr] = notches[i];
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = nr * (k % 2 ? 0.92 : 1.08);
        if (k === 0) g.moveTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r);
        else g.lineTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r);
      }
      g.closePath();
      g.fillStyle = '#000';
      g.fill();
    }
    // Crisp dark ink outline around remaining interior bite scallops!
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < Math.min(bites, notches.length); i++) {
      const [nx, ny, nr] = notches[i];
      g.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = ((k % 16) / 16) * Math.PI * 2;
        const r = nr * ((k % 16) % 2 ? 0.92 : 1.08);
        if (k === 0) g.moveTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r);
        else g.lineTo(nx + Math.cos(a) * r, ny + Math.sin(a) * r);
      }
      g.lineWidth = 14;
      g.strokeStyle = TB.INK;
      g.stroke();
    }
  }
  g.restore();
}

/** Flying court calendar page for Shot 6 ("Months of delays dragged on...") */
export function drawCalendarPage(p, label = 'JUNE 1587') {
  const g = p.g;
  p.poly(TB.rrect(26, 26, 374, 434, 14), '#f6ead0', 0);
  p.poly([[26, 26], [374, 26], [374, 108], [26, 108]], '#9c2d2a', 0);
  p.poly(TB.rrect(26, 26, 374, 434, 14), null, 11);
  g.save();
  g.font = 'bold 42px "IM Fell English", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fdf7eb';
  g.fillText(label, 200, 69);
  g.font = 'bold 94px "IM Fell English", Georgia, serif';
  g.fillStyle = TB.INK;
  g.fillText('1587', 200, 232);
  g.font = 'italic 30px "IM Fell English", Georgia, serif';
  g.fillStyle = '#6b2a28';
  g.fillText('APPEAL DELAYED', 200, 355);
  g.restore();
}

/** Heavy crimson court stamp badge overlay (`"REJECTED"`) for Shot 5 */
export function drawRejectedBadge(p) {
  const g = p.g;
  g.save();
  g.translate(320, 140);
  g.rotate(-0.14);
  p.poly(TB.rrect(-275, -92, 275, 92, 18), 'rgba(255,244,230,0.94)', 0);
  g.strokeStyle = '#c42121';
  g.lineWidth = 16;
  g.beginPath(); g.roundRect(-270, -86, 540, 172, 16); g.stroke();
  g.font = 'bold 96px "Fredoka", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#c42121';
  g.fillText('REJECTED', 0, 4);
  g.restore();
}

/** Tiny flying parchment crumb / confetti speck after Hero Weevil bites VERDICT */
export function drawPaperShard(p, rotDeg = 18) {
  p.poly(TB.rotPts([[30, 45], [110, 32], [122, 95], [52, 105], [38, 72]], TB.rad(rotDeg), 75, 75), '#f5ead0', 8);
}

/** Crisp emerald grape-leaf crumb burst when Hero Weevil chomps the vine leaf */
export function drawLeafCrumb(p, rotDeg = 22) {
  p.poly(TB.rotPts([[32, 48], [108, 30], [118, 92], [58, 108], [40, 74]], TB.rad(rotDeg), 75, 75), '#68bf43', 8);
}
