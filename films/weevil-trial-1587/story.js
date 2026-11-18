// story.js — *The French Town That Sued Tiny Bugs (St-Julien, 1587)*
// 100% pure functions of frame `f` (30 fps, 900 frames = 30.000 s) for deterministic 18-worker parallel chunks.
import {
  FPS, clamp01, smooth, easeOut, lerp, V3,
  camFromKeys, pushK, dolly, spring, blinkAt,
} from './motion.js';
import { ZONES } from './world.js';
import {
  humanFront, weevilFront, drawMacroLeaf, drawCalendarPage, drawRejectedBadge, drawPaperShard, drawLeafCrumb,
} from './cast_weevil.js';
import { fxPuff } from './toonbase.js';

export { FPS };
export const TOTAL = 900;
export const DUR = 30.0;

// Beat-locked audio event markers synced identically to make-music.py
export const EV = [
  { t: 0.35, kind: 'leaf_chomp' },
  { t: 0.92, kind: 'leaf_chomp' },
  { t: 1.50, kind: 'leaf_chomp' },
  { t: 2.75, kind: 'summons_rustle' },
  { t: 5.26, kind: 'gavel' },
  { t: 7.45, kind: 'cushion_squeak' },
  { t: 9.75, kind: 'robe_swish' },
  { t: 14.80, kind: 'deed_unroll' },
  { t: 17.85, kind: 'loupe_clink' },
  { t: 18.60, kind: 'stamp_rejected' },
  { t: 20.45, kind: 'calendar_flip' },
  { t: 20.82, kind: 'calendar_flip' },
  { t: 21.18, kind: 'calendar_flip' },
  { t: 21.52, kind: 'calendar_flip' },
  { t: 22.15, kind: 'quill_write' },
  { t: 24.60, kind: 'bite_crunch' },
  { t: 29.00, kind: 'burp_pop' },
];

export const SHOTS = [
  { id: 1, a: 0, b: 156, light: 'vineyard', zone: 'vineyard' },      // 0.00–5.17 s: Vineyard crime hook
  { id: 2, a: 156, b: 291, light: 'courtroom', zone: 'courtroom' },  // 5.20–9.67 s: Courtroom judge & witness box
  { id: 3, a: 291, b: 441, light: 'courtroom', zone: 'courtroom' },  // 9.70–14.67 s: Defense counsel Genesis argument
  { id: 4, a: 441, b: 469, light: 'courtroom', zone: 'courtroom' },  // 14.70–15.60 s: Silence #1 + Deed unroll
  { id: 5, a: 469, b: 492, light: 'wasteland', zone: 'wasteland' },  // 15.63–16.37 s: Cut outdoors to Le Grand Feisse
  { id: 6, a: 492, b: 605, light: 'wasteland', zone: 'wasteland' },  // 16.40–20.13 s: Barren loupe inspection + REJECTED stamp
  { id: 7, a: 605, b: 737, light: 'archive', zone: 'archive' },      // 20.17–24.53 s: Archive months + quill VERDICT + Silence #2
  { id: 8, a: 737, b: 900, light: 'archive', zone: 'archive' },      // 24.57–30.00 s: 24.60s SIGNATURE BITE & comic tag
];

export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export function lightFor(f) {
  const s = shotAt(f);
  return { name: s.light, zoneCenter: ZONES[s.zone] };
}

// Optional global word-level timings (loaded from words_master.json for character lip movement)
let MASTER_WORDS = [];
export function setWords(words) { MASTER_WORDS = words || []; }
function isWordActiveAt(t, tMin, tMax) {
  if (t < tMin || t > tMax) return 0;
  for (let i = 0; i < MASTER_WORDS.length; i++) {
    const [, ws, we] = MASTER_WORDS[i];
    if (t >= ws - 0.03 && t <= we + 0.03) return 1;
  }
  return 0;
}

const q = (v, n = 120) => Math.round(v * n) / n;
const T = (f) => f / FPS;

function light2D(cam, mirror) {
  const sun = cam.sun || [0.5, 0.75, -0.4];
  const sx = (sun[0] * cam.right[0] + sun[2] * cam.right[2]) * (mirror ? -1 : 1);
  const sy = -sun[1];
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
}

function placeHuman(cam, outfit, x, y, z, opts = {}) {
  const o = opts;
  const mirror = !!o.mirror;
  const light = light2D(cam, mirror);
  const seed = o.seed ?? 1;
  const key = [
    'H', outfit, o.expr || 'neutral', o.mode || 'stand', q(o.phase || 0), q(o.blink || 0),
    q(o.tilt || 0), q(o.headTilt || 0), o.arm || '', q(o.talk || 0, 12),
    q(o.gavelAng ?? -9, 24), q(o.stampY ?? -9, 24), q(light, 8), mirror ? 'm' : '',
  ].join('|');
  return {
    key, outfit, x, y, z, seed,
    scale: o.scale ?? 1, mirror, yaw: o.yaw ?? 0, roll: o.roll ?? 0,
    noBlob: !!o.noBlob, idleK: o.idleK ?? 1,
    draw: (p) => humanFront(p, outfit, { ...o, light, seed }),
  };
}

function placeWeevil(cam, x, y, z, opts = {}) {
  const o = opts;
  const mirror = !!o.mirror;
  const seed = o.seed ?? 99;
  const key = [
    'W', o.expr || 'smug', q(o.phase || 0, 48), q(o.chew || 0, 24), q(o.bounce || 0, 36),
    q(o.blink || 0, 16), o.prop || '', q(o.look || 0, 16), q(o.tilt || 0, 24),
  ].join('|');
  return {
    key, outfit: 'weevil', x, y, z, seed,
    scale: o.scale ?? 0.35, mirror, yaw: o.yaw ?? 0, roll: o.roll ?? 0,
    noBlob: o.noBlob !== false, idleK: o.idleK ?? 0.35,
    draw: (p) => weevilFront(p, o),
  };
}

// ---------------- CAMERA CURVES (9:16 vertical, Z-layered depth staging) ----------------
// Shot 1: Vineyard macro leaf [0.38, 1.74, 2.28] -> tracks left & pulls back revealing Amenet cleanly at [-1.15, 0, -1.65]
const S1_MACRO = (f) => dolly([0.38, 1.80, 3.82], [0.38, 1.72, 2.28], pushK(f, 0, 0.0018), { fov: 38 });
const S1_WIDE = (f) => dolly([-1.25, 1.68, 5.10], [-0.95, 1.05, -1.65], pushK(f, 45, 0.001), { fov: 42 });

// Shot 2: Courtroom [52,0,0] — framed judge dais + litigants -> swing cleanly onto Hero Weevil on crimson witness cushion
const S2_JUDGE = (f) => dolly([52.05, 2.22, 1.85], [51.85, 1.62, -4.15], pushK(f, 156, 0.0012), { fov: 42, roll: 0.04 });
const S2_BUG = (f) => dolly([50.85, 1.98, 0.55], [50.32, 1.56, -2.20], pushK(f, 190, 0.0012), { fov: 38, roll: 0.0 });

// Shot 3: Courtroom — Filliol Genesis point-up [53.15,0,-2.4], then whip-pan reaction onto Amenet + Judge
const S3_LAWYER = (f) => dolly([52.15, 1.72, 1.25], [53.05, 1.38, -2.40], pushK(f, 291, 0.001), { fov: 42 });
const S3_SHOCK = (f) => dolly([51.85, 1.85, 1.15], [51.55, 1.55, -3.90], pushK(f, 395, 0.001), { fov: 44 });

// Shot 4: Silence #1 Deed Unroll on oak table [53.6, 0.995, -0.6]
const S4_DEED = (f) => dolly([53.60, 3.25, 1.25], [53.60, 0.99, -0.60], pushK(f, 441, 0.0018), { fov: 42 });

// Shot 5: Cut outdoors to Le Grand Feisse [-46, 0, 0]
const S5_WIDE = (f) => dolly([-45.65, 2.08, 5.10], [-46.28, 1.15, -1.25], pushK(f, 469, 0.002), { fov: 44 });

// Shot 6: Loupe inspection -> Signboard & REJECTED stamp slam at f558
const S6_LOUPE = (f) => dolly([-44.2, 1.45, 2.45], [-45.10, 0.72, -0.70], pushK(f, 492, 0.0012), { fov: 40 });
const S6_STAMP = (f) => dolly([-45.62, 1.62, 3.35], [-45.88, 1.24, -1.05], pushK(f, 540, 0.0008), { fov: 40 });

// Shot 7: Midnight Archive [0, 0, -52] — Wide codex + calendars -> slow tight push onto VERDICT corner
const S7_CODEX = (f) => dolly([0.08, 2.75, -48.45], [0.02, 1.32, -52.00], pushK(f, 605, 0.001), { fov: 43 });
const S7_VERDICT = (f) => dolly([0.32, 2.02, -50.65], [0.30, 1.18, -51.96], pushK(f, 670, 0.0018), { fov: 34 });

// Shot 8: Signature BITE at f738 -> joyful pull-back framing weevil erupting from lower-right VERDICT hole + unobstructed shocked Bishop
const S8_HOLD = (f) => S7_VERDICT(f);
const S8_END = (f) => dolly([0.06, 2.55, -48.65], [0.04, 1.48, -52.05], pushK(f, 750, 0.0005), { fov: 44 });

const CAMS = {
  1: [{ f: 0, s: S1_MACRO }, { f: 42, dur: 96, s: S1_WIDE }],
  2: [{ f: 156, s: S2_JUDGE }, { f: 190, dur: 36, s: S2_BUG }],
  3: [{ f: 291, s: S2_BUG }, { f: 295, dur: 24, s: S3_LAWYER }, { f: 392, dur: 24, s: S3_SHOCK }],
  4: [{ f: 441, s: S4_DEED }],
  5: [{ f: 469, s: S5_WIDE }],
  6: [{ f: 492, s: S6_LOUPE }, { f: 534, dur: 20, ease: easeOut, s: S6_STAMP }],
  7: [{ f: 605, s: S7_CODEX }, { f: 668, dur: 64, s: S7_VERDICT }],
  8: [{ f: 737, s: S8_HOLD }, { f: 748, dur: 48, ease: easeOut, s: S8_END }],
};

// 7-frame flip-shakes on Gavel slam (5.26s), REJECTED stamp slam (18.60s), and Signature Bite (24.60s)
const KICKS = [[5.26, 1.15], [18.60, 1.25], [24.60, 1.55]];

export function camAt(id, f) {
  return camFromKeys(CAMS[id], f, { kicks: KICKS });
}

// ---------------- DEPTH OF FIELD ----------------
const DOF = [
  { f: 0, cInf: 8.5, focus: () => [0.38, 1.74, 2.28] },
  { f: 45, dur: 70, cInf: 3.5, focus: () => [-1.0, 1.1, -1.5] },
  { f: 156, cInf: 4.5, focus: () => [52.0, 2.0, -4.5] },
  { f: 190, dur: 36, cInf: 8.0, focus: () => [50.3, 1.65, -2.2] },
  { f: 295, dur: 24, cInf: 5.5, focus: () => [53.15, 1.35, -2.4] },
  { f: 392, dur: 24, cInf: 3.5, focus: () => [51.4, 1.5, -3.6] },
  { f: 441, cInf: 5.0, focus: () => [53.6, 1.0, -0.6] },
  { f: 469, cInf: 0 },
  { f: 492, cInf: 5.5, focus: () => [-45.1, 0.72, -0.6] },
  { f: 534, dur: 20, cInf: 4.5, focus: () => [-45.8, 1.25, -1.05] },
  { f: 605, cInf: 4.0, focus: () => [0.02, 1.25, -52.00] },
  { f: 668, dur: 64, cInf: 5.5, focus: () => [0.30, 1.18, -51.96] },
  { f: 748, dur: 45, cInf: 3.8, focus: () => [0.22, 1.32, -51.95] },
];

export function dofAt(f) {
  let i = 0;
  while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
}
export function focusAt(id, f) {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
}

export function worldAt(f) {
  // Warm camera flash wipe on time skip into midnight archive (f605..610)
  const flash = f < 605 ? 0 : f < 608 ? 0.92 : Math.max(0, 0.92 * (1 - (f - 608) / 3));
  return { flash };
}

// ---------------- TOP DIEGETIC CASE PLAQUE ----------------
export function plaqueAt(t) {
  if (t < 5.20) return { id: 'p1', text: 'ST. JULIEN · 1587', sub: 'SAVOY VINEYARDS' };
  if (t < 14.70) return { id: 'p2', text: 'CHURCH BUG TRIAL', sub: 'BISHOP’S COURT' };
  if (t < 20.17) return { id: 'p3', text: 'LE GRAND FEISSE', sub: 'PROPOSED RESERVE' };
  return { id: 'p4', text: 'FINAL VERDICT', sub: 'ARCHIVAL RECORD' };
}

// ---------------- ACTORS ----------------
export function actorsAt(f, cam) {
  const id = shotAt(f).id;
  const out = [];
  const t = T(f);

  if (id === 1) {
    // Hero Weevil munching straight through foreground macro grape leaf (0.38, 1.74, 2.28)
    const chewPulse = (
      Math.exp(-((t - 0.35) ** 2) / 0.008)
      + Math.exp(-((t - 0.92) ** 2) / 0.008)
      + Math.exp(-((t - 1.50) ** 2) / 0.008)
    );
    const hopPos = f < 26 ? [0.48, 1.63, 2.34]
      : f < 45 ? [0.50, 1.50, 2.34]
      : [0.24, 1.60, 2.34];
    out.push(placeWeevil(cam, ...hopPos, {
      seed: 99, scale: 0.24, noBlob: true, idleK: 0.15,
      expr: f >= 55 ? 'smug' : 'munch',
      phase: (t * 2.4) % 1,
      chew: Math.min(1, chewPulse),
      bounce: (t * 2.0) % 1,
      blink: blinkAt(f, 99),
      prop: f >= 55 ? 'leaf' : null,
      look: f >= 75 ? -0.4 : 0.2,
    }));

    // Background colony bugs on vineyard trellises
    out.push(placeWeevil(cam, -1.95, 1.15, 0.2, { seed: 91, scale: 0.16, noBlob: true, phase: (t * 3.0) % 1, bounce: t % 1 }));
    out.push(placeWeevil(cam, 1.95, 1.05, -0.4, { seed: 92, scale: 0.16, noBlob: true, phase: (t * 2.6 + 0.4) % 1, bounce: (t + 0.3) % 1 }));

    // François Amenet kneeling & furiously brandishing court summons (zero peek in macro, centered cleanly in wide)!
    const jump = f >= 76 ? spring(f, 76, 12) : 0;
    out.push(placeHuman(cam, 'amenet', -1.15, jump * 0.12, -1.65, {
      seed: 1, scale: 0.94,
      mode: f < 74 ? 'kneel' : 'stand',
      expr: f < 74 ? 'pained' : 'shock',
      arm: 'summons',
      tilt: f < 74 ? -6 : (1 - jump) * -8,
      blink: blinkAt(f, 1),
    }));
    // Vineyard neighbors reacting along rows behind
    out.push(placeHuman(cam, 'villager_m', -1.75, 0, -3.65, {
      seed: 11, scale: 0.92, expr: 'shock', arm: 'point', blink: blinkAt(f, 11),
    }));
    out.push(placeHuman(cam, 'villager_f', -0.25, 0, -3.95, {
      seed: 12, scale: 0.92, expr: 'nervous', arm: 'cheek', blink: blinkAt(f, 12),
    }));
  }

  if (id === 2 || id === 3) {
    // Ecclesiastical Judge behind oak desk on dais (52, 1.05, -5.35)
    const slam = f >= 158 && f <= 168 ? easeOut((f - 158) / 4) : 0;
    const gavelA = f < 158 ? -0.75 : f < 176 ? lerp(-0.75, 0.95, slam) : 0.35;
    out.push(placeHuman(cam, 'bishop', 52.0, 1.05, -5.35, {
      seed: 30, scale: 0.96, noBlob: true, idleK: 0.2,
      expr: id === 3 && f >= 390 ? 'squint' : 'stern',
      arm: id === 2 ? 'gavel' : 'hang',
      gavelAng: gavelA,
      blink: blinkAt(f, 30),
    }));

    // Hero Weevil proudly seated atop crimson velvet witness cushion (50.25, 1.33, -2.20)
    const hopCush = Math.abs(Math.sin(Math.max(0, t - 7.3) * 7)) * (t >= 7.3 && t < 7.8 ? 0.12 : 0);
    out.push(placeWeevil(cam, 50.25, 1.33 + hopCush, -2.20, {
      seed: 99, scale: 0.44, noBlob: true, idleK: 0.2,
      expr: id === 3 && f >= 360 ? 'wink' : (f < 220 ? 'innocent' : 'smug'),
      phase: (t * 0.9) % 1,
      bounce: (t * 2.2) % 1,
      blink: blinkAt(f, 99),
      look: id === 2 ? 0.7 : -0.4,
    }));

    // Defense Lawyer Filliol
    const filliolTalk = isWordActiveAt(t, 9.75, 14.55);
    out.push(placeHuman(cam, 'filliol', id === 2 ? 52.52 : 53.15, 0, id === 2 ? -3.25 : -2.4, {
      seed: 20, scale: 0.96,
      expr: id === 3 ? 'grin' : 'smug',
      arm: 'point_up',
      talk: id === 3 ? filliolTalk : 0,
      headTilt: id === 3 ? -6 : 0,
      blink: blinkAt(f, 20),
    }));

    // Stunned François Amenet clearly inside Shot 2 wide bench frame & off-right during witness cushion close-up
    const shockNow = id === 3 && f >= 395;
    out.push(placeHuman(cam, 'amenet', id === 2 ? 51.28 : 51.05, 0, id === 2 ? -3.70 : -3.55, {
      seed: 1, scale: 0.94,
      expr: shockNow ? 'shock' : 'nervous',
      arm: shockNow ? 'shock_up' : 'cheek',
      tilt: shockNow ? -5 : 2,
      blink: blinkAt(f, 1),
    }));
  }

  if (id === 4) {
    // Silence #1: Clean pure overhead oak table & parchment deed unroll
  }

  if (id === 5) {
    // Wide shot at Le Grand Feisse: desperate villagers behind rustic wooden fence (100% inside frame)
    out.push(placeHuman(cam, 'amenet', -46.80, 0, -2.0, {
      seed: 1, scale: 0.94, expr: 'nervous', arm: 'wave', blink: blinkAt(f, 1),
    }));
    out.push(placeHuman(cam, 'villager_m', -47.28, 0, -2.35, {
      seed: 11, scale: 0.92, expr: 'nervous', arm: 'wave', blink: blinkAt(f, 11),
    }));
    out.push(placeHuman(cam, 'villager_f', -46.30, 0, -2.55, {
      seed: 12, scale: 0.92, expr: 'pained', arm: 'cheek', blink: blinkAt(f, 12),
    }));
    out.push(placeHuman(cam, 'filliol', -45.32, 0, 0.2, {
      seed: 20, scale: 0.96, expr: 'stern', arm: 'loupe', blink: blinkAt(f, 20),
    }));
  }

  if (id === 6) {
    // Filliol crouches with brass loupe (f492..537), then stands & slams REJECTED stamp at f558!
    const standUp = f >= 538;
    const stampSwing = f < 538 ? 0 : f < 555 ? -0.75 * smooth((f - 538) / 14) : lerp(-0.75, 0.45, easeOut((f - 555) / 4));
    out.push(placeHuman(cam, 'filliol', standUp ? -45.32 : -45.10, 0, standUp ? -0.82 : -0.58, {
      seed: 20, scale: 0.96,
      mode: standUp ? 'stand' : 'kneel',
      expr: f >= 558 ? 'smug' : 'squint',
      arm: standUp ? 'stamp' : 'loupe',
      stampY: stampSwing,
      blink: blinkAt(f, 20),
    }));
    // Hero Weevil perched right atop the wooden LE GRAND FEISSE signpost watching!
    out.push(placeWeevil(cam, -46.30, 1.66, -1.16, {
      seed: 99, scale: 0.22, noBlob: true, idleK: 0.1,
      expr: 'smug', phase: (t * 1.1) % 1, bounce: (t * 1.8) % 1, blink: blinkAt(f, 99),
    }));
    // Amenet shocked on far left once REJECTED lands
    out.push(placeHuman(cam, 'amenet', -47.05, 0, -2.15, {
      seed: 1, scale: 0.94,
      expr: f >= 558 ? 'shock' : 'nervous',
      arm: f >= 558 ? 'shock_up' : 'cheek',
      blink: blinkAt(f, 1),
    }));
  }

  if (id === 7) {
    // Bishop leaning over midnight oak archive lectern writing verdict
    out.push(placeHuman(cam, 'bishop', -0.24, 0.12, -53.15, {
      seed: 30, scale: 0.86, noBlob: true, idleK: 0.15,
      expr: 'squint', arm: f >= 663 && f <= 712 ? 'quill' : 'hang',
      blink: blinkAt(f, 30),
    }));
  }

  if (id === 8) {
    // Payoff: Bishop gasps in horror behind lectern as Hero Weevil bursts straight up through lower-right VERDICT hole!
    out.push(placeHuman(cam, 'bishop', -0.24, 0.12, -53.15, {
      seed: 30, scale: 0.86, noBlob: true, idleK: 0.2,
      expr: 'shock', arm: f >= 742 ? 'shock_up' : 'hang',
      tilt: f >= 742 && f < 758 ? -6 : 0,
      blink: blinkAt(f, 30),
    }));

    if (f >= 738) {
      const pop = spring(f, 738, 14);
      const yPos = 0.88 + pop * 0.15;
      const exprW = f >= 868 && f < 884 ? 'burp' : f >= 884 ? 'wink' : 'munch';
      const chewEnd = Math.exp(-((t - 24.72) ** 2) / 0.015) + Math.exp(-((t - 25.08) ** 2) / 0.015);
      out.push(placeWeevil(cam, 0.45, yPos, -51.82, {
        seed: 99, scale: 0.34, noBlob: true, idleK: 0.1,
        expr: exprW,
        prop: 'crumb',
        chew: Math.min(1, chewEnd),
        phase: (t * 1.4) % 1,
        bounce: (t * 2.5) % 1,
        blink: exprW === 'wink' ? 0 : blinkAt(f, 99),
      }));
    }
  }

  return out;
}

// ---------------- EFFECTS ----------------
export function fxAt(f) {
  const id = shotAt(f).id;
  const out = [];
  const t = T(f);
  const { flash } = worldAt(f);

  if (id === 1) {
    // Foreground Giant Grape Leaf getting chomped (bite 0->1->2->3)
    const bites = f < 10 ? 0 : f < 27 ? 1 : f < 45 ? 2 : 3;
    out.push({
      key: `macroLeaf|${bites}`, cw: 800, ch: 800,
      draw: (p) => drawMacroLeaf(p, bites),
      x: 0.38, y: 1.74, z: 2.28, w: 0.84, h: 0.84, rot: 0.05 * Math.sin(t * 2.0),
    });
    // Crisp flying green grape-leaf crumbs away from the weevil's eyes on each chomp (0.35s, 0.92s, 1.50s)
    const crumbDirs = [[0.22, 0.24], [0.28, 0.04], [-0.26, 0.22]];
    for (const [tb, bx, by] of [[0.35, 0.62, 1.96], [0.92, 0.72, 1.80], [1.50, 0.18, 1.96]]) {
      const df = f - Math.round(tb * FPS);
      if (df >= 0 && df < 14) {
        const u = df / 14;
        for (let k = 0; k < 3; k++) {
          const [vx, vy] = crumbDirs[k];
          out.push({
            key: `lCrumb|${k}`, cw: 150, ch: 150,
            draw: (p) => drawLeafCrumb(p, (k - 1) * 35),
            x: bx + vx * u * 0.9,
            y: by + vy * u - 0.55 * u * u,
            z: 2.31,
            w: 0.095, h: 0.095, rot: u * (k % 2 ? 6 : -6), soft: true,
          });
        }
      }
    }
  }

  if (id === 2) {
    // Impact wood-dust puff when gavel bangs sounding block at 5.26s (f158)
    if (f >= 158 && f < 176) {
      const u = (f - 158) / 18;
      out.push({
        key: `gavPuff|${q(u, 18)}`, cw: 300, ch: 300,
        draw: (p) => fxPuff(p, q(u, 18)),
        x: 52.46, y: 2.09, z: -4.28, w: 0.52, h: 0.52, soft: true,
      });
    }
  }

  if (id === 3) {
    // Soft translucent golden clerestory lightbeams behind pointing Lawyer Filliol
    out.push({
      key: 'clerestoryRay1', cw: 300, ch: 600,
      draw: (p) => {
        const g = p.g;
        const gr = g.createLinearGradient(80, 0, 220, 600);
        gr.addColorStop(0, 'rgba(255,224,140,0.42)');
        gr.addColorStop(1, 'rgba(255,224,140,0.0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(40, 0); g.lineTo(190, 0); g.lineTo(290, 600); g.lineTo(10, 600); g.closePath(); g.fill();
      },
      x: 53.35, y: 3.1, z: -3.2, w: 1.8, h: 4.5, soft: true, rot: 0.14,
    });
  }

  if (id === 6) {
    // Crimson REJECTED court stamp badge slammed onto Le Grand Feisse sign at f558 (18.60s)
    if (f >= 558) {
      const s = spring(f, 558, 12);
      const scaleK = Math.max(0.2, s);
      out.push({
        key: 'rejectedBadge', cw: 640, ch: 280,
        draw: (p) => drawRejectedBadge(p),
        x: -46.15, y: 1.24, z: -1.09, w: 0.94 * scaleK, h: 0.41 * scaleK, rot: -0.04,
      });
      if (f < 566) {
        const u = (f - 558) / 8;
        out.push({
          key: `stampPuff|${q(u, 8)}`, cw: 300, ch: 300,
          draw: (p) => fxPuff(p, q(u, 8)),
          x: -46.15, y: 1.15, z: -1.11, w: 0.95, h: 0.95, soft: true,
        });
      }
    }
  }

  if (id === 7) {
    // Flying court calendar pages ("Months of delays...") below FINAL VERDICT plaque f612..660
    const months = ['MAY 1587', 'JUNE 1587', 'JULY 1587', 'AUG 1587'];
    for (let i = 0; i < months.length; i++) {
      const f0 = 612 + i * 11;
      if (f >= f0 && f < f0 + 24) {
        const u = (f - f0) / 24;
        out.push({
          key: `cal|${months[i]}`, cw: 400, ch: 460,
          draw: (p) => drawCalendarPage(p, months[i]),
          x: lerp(-0.52, 0.54, u) + (i % 2 ? -0.12 : 0.12),
          y: 1.75 - u * 0.50 + Math.sin(u * Math.PI) * 0.16,
          z: -51.1 - i * 0.08,
          w: 0.42, h: 0.48, rot: (u - 0.5) * 0.75 + (i % 2 ? -0.2 : 0.2),
        });
      }
    }
    // Animated goose quill scratching across right ledger VERDICT lines (f663..710 = 22.10..23.67s)
    if (f >= 663 && f <= 710) {
      const u = (f - 663) / 47;
      const row = Math.floor(u * 5.99);
      const frac = (u * 6) % 1;
      const qx = 0.04 + frac * 0.36;
      const qy = 1.31 - row * 0.032 + Math.abs(Math.sin(f * 0.8)) * 0.014;
      const qz = -52.08 + row * 0.04;
      out.push({
        key: 'magicQuill', cw: 220, ch: 300,
        draw: (p) => {
          p.poly([[30, 275], [85, 190], [180, 28], [195, 50], [108, 205]], '#f7f0dc', 7);
          p.stroke([[30, 275], [160, 62]], 5, '#5c3c24');
          p.dot(28, 278, 7, '#1b0f1d');
        },
        x: qx + 0.09, y: qy + 0.14, z: qz + 0.04, w: 0.26, h: 0.35, rot: -0.15,
      });
    }
  }

  if (id === 8) {
    // Explosion of chewed parchment shards erupting from the bite crater (f738..772)
    if (f >= 738 && f < 774) {
      const u = (f - 738) / 36;
      const dirs = [
        [-0.95, 1.35], [-0.55, 1.65], [-0.15, 1.75], [0.28, 1.70],
        [0.72, 1.50], [1.05, 1.20], [-0.80, 0.90], [0.85, 0.85],
      ];
      for (let i = 0; i < dirs.length; i++) {
        const [vx, vy] = dirs[i];
        const sx = 0.44 + vx * u * 0.72;
        const sy = 1.15 + vy * u - 1.65 * u * u;
        const sz = -51.84 + (i - 3.5) * 0.04;
        out.push({
          key: `shard|${i % 3}`, cw: 150, ch: 150,
          draw: (p) => drawPaperShard(p, (i % 3) * 28 - 25),
          x: sx, y: sy, z: sz, w: 0.14, h: 0.14, rot: u * (i % 2 ? 7 : -7), soft: true,
        });
      }
    }
  }

  return { flash, fx: out };
}
