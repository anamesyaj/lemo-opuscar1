// story.js — The Dancing Plague: shots, cameras, light, actors, effects.
// All pure functions of the frame number f (30 fps, 1280 frames total).
// Sources: work/PLAN.md (9 shots), work/phrases.json (locked word timings).
// Cameras follow the upstream grammar: smootherstep glides, pushK creeps, cuts on big
// reframes, 7-frame flip-shakes on impacts. Every reaction lands 0-3 f BEFORE its word.
import {
  FPS, clamp01, smooth, easeOut, lerp, catmullRom, bezier2, V3,
  camFromKeys, pushK, dolly, zoom, rolled, spring, walk, blinkAt, idle,
} from './motion.js';
import { LIGHTS } from './lights.js';
import { LAYOUT } from './world.js';
import { romanFront, OUTFITS, drawSign } from './roman.js';
import { bodySide, fxPuff, fxCloud, fxStars, fxRing, fxBlob } from './toonbase.js';

export { FPS };
export const TOTAL = 1280;

// ---------------- shots ----------------
export const SHOTS = [
  { id: 1, a: 0, b: 120, light: 'day' },
  { id: 2, a: 120, b: 302, light: 'day' },
  { id: 3, a: 302, b: 506, light: 'day', to: 'golden' }, // grades day -> golden across the shot
  { id: 4, a: 506, b: 638, light: 'golden' },
  { id: 5, a: 638, b: 766, light: 'golden' },
  { id: 6, a: 766, b: 893, light: 'golden' },
  { id: 7, a: 893, b: 1044, light: 'nightblue' },
  { id: 8, a: 1044, b: 1166, light: 'dawn' },
  { id: 9, a: 1166, b: 1280, light: 'dawn' },
];
export const shotAt = (f) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

/** Base light preset for frame f. Shot 3's day->golden ramp lives in world.update()
 *  (it lerps the preset per frame); main.js calls setLight() only on shot change. */
export function lightFor(f) {
  return { name: shotAt(f).light };
}

// ---------------- helpers ----------------
const q = (v, n = 120) => Math.round(v * n) / n;
const T = (f) => f / FPS;
/** linear position blend a->b over the spring value, with q() rounding for card keys */
const lerprojection = (a, b, x) => q(a + (b - a) * clamp01x(x));
const clamp01x = (x) => Math.max(0, Math.min(1, x));
/** deterministic per-index random in [0,1) */
const hh = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LEAD = 2; // reactions land 2 frames before the word

/** front/side view + mirroring for someone at (x,z) walking along (dx,dz) */
function viewOf(cam, x, z, dx, dz) {
  const tx = cam.pos[0] - x, tz = cam.pos[2] - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return {
    side: c < 0.57,
    mirror: dx * cam.right[0] + dz * cam.right[2] < 0,
    fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20,
  };
}
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-deg steps */
function light2D(cam, mirror) {
  const sun = cam.sun || [0.5, 0.75, -0.4];
  const sx = (sun[0] * cam.right[0] + sun[2] * cam.right[2]) * (mirror ? -1 : 1);
  const sy = -sun[1];
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
}

// ---------------- cameras ----------------
// Shot 1 — hook MCU on Troffea, slow creeping push-in, slight low angle.
const S1a = (f) => dolly([1.0, 1.8, 3.2], [0, 1.55, 0], pushK(f, 0, 0.0025), { fov: 40 });
// Shot 2 — continuous pull-back from shot 1 into a medium-wide (glide centred on f140).
const S2a = (f) => dolly([3.4, 2.6, 9.8], [0, 1.1, 0], pushK(f, 120, 0.002), { fov: 42 });
// Shot 3 — long pull-back + slow crane up over the growing crowd.
const S3a = (f) => dolly([4.2, 3.4, 12.5], [0, 1.0, -1], pushK(f, 302, 0.0015), { fov: 43 });
const S3b = (f) => dolly([6.5, 8.5, 16.5], [0, 0.8, -2], pushK(f, 380, 0.0012), { fov: 44 });
// Shot 4 — insert CU on feet, then rack focus up to the collapsing dancer's face.
// S4a is LOW and CLOSE: feet + shins fill the frame, boots fully in frame
// (the first version cut the boots off at the bottom edge).
// Closer + lower, looking AT the feet (was [0.9,0.45,3.1], look y 0.3, fov 34):
// the pull-back still showed legs + torso with the shoes small at the bottom.
// Now the shoes are the hero, legs exit the top, street reads behind.
const S4a = (f) => dolly([0.7, 0.3, 2.0], [0, 0.12, 0.5], pushK(f, 506, 0.0015), { fov: 30 });
const S4b = (f) => dolly([0.9, 1.2, 3.4], [0, 1.4, 0.3], pushK(f, 585, 0.0018), { fov: 36 });
// Shot 5 — whip-pan from the fallen dancer to the stage, then hold with creep.
// S5b sits ~10 m from the stage, looking at the councillors' chests so they are
// centred (the old look y=1.9 left them at the top edge over an empty deck).
// The hold creep is 0.0005 (was 0.002): at 0.002 the camera slid ~8 m over the
// shot, straight into the crowd block at z -4.5 (0.6 m from a face — the
// looming blurred foreground the look-check caught).
const S5a = (f) => S4b(f);
// Pulled back + up (was [2.4,2.2,-1.5], fov 40): the old framing put the
// watchers ~8 m from the lens, huge, blurred and cut at the feet. Now the whole
// watcher row + stage fit in frame with feet on the ground.
const S5b = (f) => dolly([2.8, 2.8, 0.5], [0, 1.8, -12], pushK(f, 656, 0.0005), { fov: 42 });
// Shot 6 — push-in toward the stage, then a slow orbit around the crowd edge.
// Orbit radius 12 (was 10, was 7.5 and the lens got inside the wave: giant
// blurry foreground heads filled the frame). With the wave z held behind
// -2.0 the closest approach to ANY actor stays >2.2 m all through the orbit.
const S6a = (f) => S5b(f);
const S6b = (f) => {
  const a = lerp(-0.44, 0.35, smooth((f - 766) / 126));
  return dolly([12 * Math.sin(a), 2.0, -6 + 12 * Math.cos(a)], [0, 1.6, -12], pushK(f, 780, 0.0018), { fov: 40 });
};
// Shot 7 — night-blue courtyard: slow push-in on the doctor, rack to the chain.
// S7b sits ~5.5 m back and WEST of the courtyard's east wall: the old (-9.6,...)
// put the lens right against that wall, which hid the sneezer (i=3) at the
// shot's key beat.
// Pulled back + widened (was [-11.5,1.7,-16.5] fov 38): the old framing put the
// doctor 5.5 m from the lens, half out of the left edge, with the chain jammed
// behind him against a blank wall. Now doctor + all four chain members fit.
const S7a = (f) => dolly([-9.0, 2.4, -13.0], [-13.4, 1.3, -21.0], pushK(f, 893, 0.0015), { fov: 46 });
const S7b = (f) => dolly([-9.5, 2.4, -14.0], [-13.6, 1.3, -21.2], pushK(f, 960, 0.0015), { fov: 46 });
// Shot 8 — track alongside the marching crowd, then crane up to reveal the shrine.
// The march walks NORTH along the street from (0,0,-2); the camera tracks the
// leader's actual walk distance (not a time-based path point — the old version
// raced the camera ahead into the east house row while the marchers stood still).
// The shrine sits behind the east houses, so the crane rises to y=10 to see over them.
const marchPoint = (f) => {
  const d = walk(f, 1044, 1.1).dist;
  return [0, 0, -2 - d];
};
const S8a = (f) => {
  const m = marchPoint(f);
  // Pulled further west (was -4.2): the old track put the marchers ~4 m from the
  // lens, so the near ones sliced at the frame edges. Now the whole line fits.
  return dolly([m[0] - 6.0, m[1] + 2.0, m[2] + 3.5], [m[0] + 0.3, m[1] + 1.2, m[2] - 1.5], pushK(f, 1044, 0.0015), { fov: 40 });
};
// Rise first — a HIGH top-down view of the marching line (the town spread out
// below) — THEN swing east over the houses. Looking north or east during the
// rise put the sight line through the stage / the east house row (a wall
// filled the frame). The swing's blocking house is hidden by the world's
// sight-line culler, which is built for exactly this.
const S8c = (f) => dolly([0, 13, -6], [0, 0.5, -8], pushK(f, 1130, 0.0012), { fov: 44 });
const S8b = (f) => dolly([4, 16, -14], [17, 5, -37], pushK(f, 1150, 0.0012), { fov: 46 });
// Shot 9 — slow push-in with a 3-5 deg roll at the shrine.
// Camera at (13,7,-28) looking at (18,5.5,-37.5): the WHOLE chapel fits —
// door, round window, roof, cross — with the kneelers below it and the shoe
// on the slope. The earlier (15,6.5,-31) was so close the chapel (3.2 m wide)
// filled the frame and the door sat just outside the left edge, leaving a
// flat featureless wall.
// Pulled back + less creep (was [13,7,-28], pushK 0.002, fov 38): the old push-in
// ended with the chapel wall filling the frame and the kneelers cut at the
// bottom. Now the whole chapel + door + kneelers + shoe fit with margin.
const S9a = (f) => dolly([11, 8, -24], [18, 4.8, -37.5], pushK(f, 1166, 0.0008),
  { fov: 42, roll: 0.06 * smooth((f - 1166) / 113) });

const CAMS = {
  1: [{ f: 0, s: S1a }],
  2: [
    { f: 120, s: S1a }, // continuity: start from the shot-1 framing, glide out
    { f: 140, dur: 40, s: S2a },
  ],
  3: [
    { f: 302, s: S2a },
    { f: 322, dur: 45, s: S3a },
    { f: 380, dur: 45, s: S3b },
  ],
  4: [
    { f: 506, s: S4a },
    { f: 585, dur: 14, s: S4b }, // rack up to the face
  ],
  5: [
    { f: 638, s: S4b },
    { f: 656, dur: 18, s: S5b }, // whip-pan (easeOut in camFromKeys via smooth? no — whip uses easeOut below)
  ],
  6: [
    { f: 766, s: S5b },
    { f: 780, dur: 30, s: S6b },
  ],
  7: [
    { f: 893, s: S7a },
    { f: 960, dur: 14, s: S7b },
  ],
  8: [
    { f: 1044, s: S8a },
    { f: 1130, dur: 20, s: S8c }, // rise above the roofs, still looking down the street
    { f: 1150, dur: 16, s: S8b }, // swing east to the shrine
  ],
  9: [{ f: 1166, s: S9a }],
};
// Impact kicks: [time seconds, amplitude] — flip-shake on the first drum hit (f775).
const KICKS = [[775 / FPS, 1]];
export function camAt(id, f) {
  // Shot 5's whip-pan is an easeOut move, not a smootherstep glide: handle it directly.
  if (id === 5 && f >= 638 && f < 674) {
    const k = easeOut((f - 638) / 18);
    const a = S4b(f), b = S5b(f);
    return {
      pos: V3.mix(a.pos, b.pos, k), look: V3.mix(a.look, b.look, k),
      fov: a.fov + (b.fov - a.fov) * k, roll: 0,
    };
  }
  return camFromKeys(CAMS[id], f, { kicks: KICKS });
}

// ---------------- depth of field ----------------
const DOF = [
  { f: 0, cInf: 14, focus: () => [0, 1.75, 0] },
  { f: 120, cInf: 10, focus: () => [0, 1.5, 0] },
  { f: 302, cInf: 0 },
  { f: 506, cInf: 14, focus: () => [0, 0.3, 0.3] },
  { f: 585, dur: 14, cInf: 14, focus: () => [0, 1.4, 0.3] },
  { f: 638, cInf: 10, focus: () => [0, 1.9, -12] },
  { f: 766, cInf: 8, focus: () => [0, 1.6, -12] },
  { f: 778, dur: 10, cInf: 3.5, focus: () => [0, 1.6, -12] },
  { f: 812, dur: 10, cInf: 8, focus: () => [0, 1.6, -12] },
  { f: 893, cInf: 12, focus: () => [-13.4, 1.4, -21.0] },
  { f: 960, dur: 14, cInf: 12, focus: () => [-13.6, 1.3, -21.2] },
  { f: 1044, cInf: 0 },
  { f: 1130, dur: 20, cInf: 8, focus: (fr) => [0, 1.2, marchPoint(fr)[2]] },
  { f: 1150, dur: 15, cInf: 8, focus: () => [18, 4.5, -38] },
  { f: 1166, cInf: 10, focus: () => [18, 4.2, -38] },
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

// ---------------- world state ----------------
/** World animation state for frame f: light blend is in lightFor(); here: flash + stage. */
export function worldAt(f) {
  // 6-frame white flash on the f893 time jump into the explanation.
  const flash = f < 893 ? 0 : f < 896 ? 1 : Math.max(0, 1 - (f - 896) / 3);
  return { flash };
}

// ---------------- actors ----------------
/**
 * A placement for the cast pool. draw(p) draws the 600x1000 card; x/y/z = soles position
 * in metres; scale = height multiplier; mirror flips the card; yaw/roll in radians.
 * key is q()-rounded so the canvas redraws only on visible change.
 */
function place(cam, outfit, x, y, z, opts = {}) {
  const o = opts;
  const mirror = !!o.mirror;
  const light = light2D(cam, mirror);
  const seed = o.seed ?? 1;
  const keyParts = [outfit, o.expr || 'neutral', o.mode || 'stand', q(o.phase || 0), q(o.blink || 0),
    q(o.tilt || 0), q(o.headTilt || 0), o.arm || '', o.prop || '', q(light, 8), mirror ? 'm' : '', q(o.wave ?? -1, 30)];
  const drawOpts = { ...o, light, seed };
  return {
    key: keyParts.join('|'), outfit, x, y, z, seed,
    scale: o.scale ?? 1, mirror, yaw: o.yaw ?? 0, roll: o.roll ?? 0,
    draw: (p) => romanFront(p, outfit, drawOpts),
  };
}
/** side-view placement (marchers): bodySide directly, front view would read wrong. */
function placeSide(cam, outfit, x, y, z, opts = {}) {
  const o = opts;
  const light = light2D(cam, !!o.mirror);
  const seed = o.seed ?? 1;
  const keyParts = ['S', outfit, o.expr || 'neutral', o.mode || 'march', q(o.phase || 0), q(o.blink || 0), q(light, 8), q(o.stride ?? 1, 20)];
  return {
    key: keyParts.join('|'), outfit, x, y, z, seed,
    scale: o.scale ?? 1, mirror: !!o.mirror, yaw: o.yaw ?? 0, roll: o.roll ?? 0,
    draw: (p) => bodySide(p, OUTFITS[outfit], { ...o, light, seed }),
  };
}

const FOLK_COATS = ['townsman', 'townswoman'];
function folkOutfit(i) { return FOLK_COATS[i % 2]; }

/** Fixed crowd roster: one seed per background slot for the WHOLE film (skips the
 *  named-cast seeds: 1 Troffea, 20-22 councillors, 30-31 musicians, 70 doctor, and the
 *  per-shot one-offs 2-9), so a face keeps the same jacket/dress/hat in every shot. */
const ROSTER = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 28, 29, 32, 33, 34, 35, 36, 37, 38];
/** Fixed background cast: one identity per slot — same seed AND same outfit
 *  (townsman/townswoman) in every shot. The old code paired folkOutfit(i) with
 *  ROSTER[s] using DIFFERENT indices per shot, so the same seed flipped gender
 *  (e.g. seed 28 was a woman in shot 3, a man in shot 5) and the front row
 *  reshuffled every shot. Every background placement below uses CAST[k], so the
 *  same face keeps the same clothes and the same place in the crowd. */
const CAST = ROSTER.map((seed, i) => ({ seed, outfit: FOLK_COATS[i % 2] }));

/** Troffea dancing: phase from frame, head bob + arm lift on the stressed word. */
function troffeaDance(f, x, y, z, cam, opts = {}) {
  const t = f / FPS;
  const bob = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2); // 2 Hz dance bounce
  const react = (f >= 91 && f <= 93) || (f >= 199 && f <= 201); // before "dancing"
  return place(cam, 'troffea', x, y, z, {
    seed: 1, expr: react ? 'laugh' : (opts.expr || 'grin'), mode: 'stroll',
    phase: (t * 1.4) % 1, arm: 'up', tilt: react ? -4 : 0, headTilt: react ? -6 : 0,
    blink: blinkAt(f, 1), ...opts,
  });
}

export function actorsAt(f, cam) {
  const id = shotAt(f).id;
  const out = [];
  const t = T(f);

  if (id === 1) {
    // Hook MCU: Troffea alone, mid-spin, arms up, blissful.
    out.push(troffeaDance(f, 0, 0, 0, cam));
  }

  if (id === 2) {
    out.push(troffeaDance(f, 0, 0, 0, cam, { expr: 'grin' }));
    // Two onlookers deep in the street (z -4 corridor), puzzled/squint. One points
    // before "Strasbourg" (f144). The old near positions (-1.6/0.6, -1.2/1.8) crossed
    // the pull-back's frame edge: they sliced into view while the camera retreated.
    const p1 = f >= 141 && f < 175 ? 'point' : 'hang';
    out.push(place(cam, 'townsman', -2.35, 0, -3.9, {
      seed: 2, expr: 'squint', mode: 'stand', arm: p1, blink: blinkAt(f, 2),
    }));
    // Second shakes her head on "no music" (f242-252): headTilt swings.
    const shake = f >= 242 && f <= 252 ? Math.sin((f - 242) * 1.2) * 8 : 0;
    out.push(place(cam, 'townswoman', -0.55, 0, -4.2, {
      seed: 3, expr: 'stern', mode: 'stand', arm: 'hip', headTilt: shake, blink: blinkAt(f, 3),
    }));
  }

  if (id === 3) {
    // Troffea front, leading. Crowd swells in depth as the pull-back continues.
    out.push(troffeaDance(f, 0, 0, 1.5, cam, { expr: 'laugh' }));
    // First 3 joiners step in on "dozens" (f333-335, anticipation dip then spring).
    // Fixed x inside the shot corridor, slide-in from DEPTH (z) so they never cross
    // a frame edge on the way in (the old x slide-in from ±2.5 sliced).
    const joinK = (j) => spring(f, 333 + j * 2, 12);
    const joiners = [
      { x: -1.3, zx: 0.5, z0: -1.35, seed: 4, expr: 'grin' },
      { x: 1.2, zx: 0.8, z0: -1.55, seed: 5, expr: 'smile' },
      { x: 0.4, zx: -0.6, z0: -1.75, seed: 6, expr: 'grin' },
    ];
    joiners.forEach((j, k) => {
      const s = joinK(k);
      const z = lerprojection(j.z0, j.zx, s);
      out.push(place(cam, folkOutfit(k), j.x, 0, z, {
        seed: j.seed, expr: j.expr, mode: 'stroll', phase: (t * 1.4 + k * 0.3) % 1,
        arm: 'up', tilt: (1 - s) * 8, blink: blinkAt(f, j.seed),
      }));
    });
    // The packed square by "four hundred" (f400): rows in depth, mixed expressions.
    // Per-row x spreads sit inside the shot corridor (row 0 is the closest).
    const ROWS = [
      [-3.0, 1.65], [-4.0, 1.4], [-5.0, 1.2], [-6.05, 0.95],
    ];
    const n = f < 377 ? 6 : f < 403 ? 12 : 24;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 6), col = i % 6;
      const [lo, hi] = ROWS[row], z = -1.5 - row * 1.7 + (hh(i, 2) - 0.5) * 0.4;
      const x = lerprojection(lo + 0.35, hi - 0.35, (col + 0.5) / 6) + (hh(i) - 0.5) * 0.44;
      const exprs = ['grin', 'laugh', 'dazed', 'stubborn', 'smile', 'grin'];
      out.push(place(cam, CAST[i].outfit, x, 0, z, {
        seed: CAST[i].seed, expr: exprs[i % 6], mode: 'stroll', phase: (t * 1.4 + i * 0.17) % 1,
        arm: i % 3 === 0 ? 'up' : 'wave', wave: i % 3 === 1 ? q(Math.sin(t * 5 + i), 30) : undefined,
        blink: blinkAt(f, CAST[i].seed),
      }));
    }
  }

  if (id === 4) {
    // Young man stumbles: wobble f592, collapse dip + dust f599-601 (before "collapsed" f602).
    const wobble = f >= 592 && f < 599 ? Math.sin((f - 592) * 1.4) * 6 : 0;
    const collapsed = f >= 599;
    // During the feet insert (f506-585) he STANDS, both feet planted, weight
    // shifting — the old 'stroll' left one foot floating mid-stride, which read
    // as a mistake at this framing. He only starts moving for the wobble/collapse.
    const insert = f < 585;
    out.push(place(cam, 'townsman', 0, 0, 0.5, {
      seed: 7, expr: collapsed ? 'pained' : 'nervous', mode: collapsed ? 'fall' : (insert ? 'stand' : 'stroll'),
      phase: (t * 1.4) % 1, tilt: collapsed ? 18 : (insert ? Math.sin((f - 506) * 0.15) * 4 : wobble), arm: collapsed ? 'up' : 'hang',
      blink: collapsed ? 1 : blinkAt(f, 7),
    }));
    // Troffea behind him, worried, hand to cheek.
    out.push(place(cam, 'troffea', -0.9, 0, 1.4, {
      seed: 1, expr: 'nervous', mode: 'stand', arm: 'cheek', blink: blinkAt(f, 1),
    }));
    // A fourth dancer slowing deeper in the bg — moved further back and aside
    // (was -0.7,-4) so she reads as a small bg figure, fully in frame, during
    // the feet insert instead of a giant sliced head at the top edge.
    out.push(place(cam, 'townswoman', -1.6, 0, -5.5, {
      seed: 8, expr: 'pained', mode: 'stroll', phase: (t * 0.9) % 1, arm: 'belly', blink: blinkAt(f, 8),
    }));
  }

  if (id === 5) {
    // Everything human pops in at f672 once the whip-pan lands (f656-674 glide):
    // during the whip ANY static actor crossed a frame edge at least once, so the
    // stage sweeps in empty and the cast is already-in-place at the landing.
    if (f >= 672) {
      const pop = f >= 672 && f < 676; // settle relative to the whip land
      const popDip = pop ? -(3 * Math.sin((f - 672) * 0.4)) : 0;
      // 3 councillors on the stage (platform top y = 1.2), panicked.
      const arms = ['wave', 'point', 'temple'];
      const exprs = ['shock', 'nervous', 'stern'];
      [-1.5, 0, 1.5].forEach((x, i) => {
        out.push(place(cam, 'councillor', x, 1.2, -12, {
          seed: 20 + i, expr: exprs[i], mode: 'stand', arm: arms[i],
          tilt: (i === 2 ? 5 : 0) + popDip, blink: blinkAt(f, 20 + i),
        }));
      });
      // 2 musicians climb up with pipe + drum, x inside the corridor (±1.4 — the
      // old ±1.7 put the drummer half out of the left edge mid-climb).
      const climb = smooth((f - 678) / 40);
      out.push(place(cam, 'musician_pipe', 1.4, climb * 1.2, -10.5 + climb * -1.0, {
        seed: 30, expr: 'grin', mode: 'stand', arm: 'lift', prop: 'pipe', blink: blinkAt(f, 30),
      }));
      out.push(place(cam, 'musician_drum', -1.4, climb * 1.2, -10.5 + climb * -1.0, {
        seed: 31, expr: 'smile', mode: 'stand', arm: 'reach', prop: 'drum', blink: blinkAt(f, 31),
      }));
      // Troffea + hopeful watchers, in depth rows (cards ~35-40% of frame height);
      // the near rows the first pass had (z -7.5/-9) read as a wall of heads.
      out.push(place(cam, 'troffea', 0.9, 0, -8.4, {
        seed: 1, expr: 'smile', mode: 'stand', arm: 'up', tilt: popDip, blink: blinkAt(f, 1),
      }));
      // Watchers = the SAME front row as shot 3 (cast 0..6), now gathered at the
      // stage. Same faces, same order, same clothes — no reshuffle, no gender flip.
      // z stays IN FRONT of the stage deck (front face z=-10): the first pass put
      // them at z=-10.6, inside the deck, so only their heads showed.
      const WATCH = [
        [-1.3, -8.9, 0], [-0.5, -9.0, 1], [0.3, -8.9, 2], [1.1, -9.0, 3], [1.9, -8.9, 4],
        [-0.6, -9.5, 5], [1.2, -9.5, 6],
      ];
      WATCH.forEach(([x, z, s], i) => {
        out.push(place(cam, CAST[s].outfit, x, 0, z, {
          seed: CAST[s].seed, expr: 'smile', mode: 'stand', arm: 'up',
          phase: (t * 1.3 + i * 0.21) % 1, blink: blinkAt(f, CAST[s].seed),
        }));
      });
    }
  }

  if (id === 6) {
    // Musicians play: pipe raised, drum struck f775-777 (before "music" f778).
    const strike = f >= 775 && f <= 777;
    out.push(place(cam, 'musician_pipe', 1.2, 1.2, -12, {
      seed: 30, expr: 'grin', mode: 'stand', arm: 'lift', prop: 'pipe', blink: blinkAt(f, 30),
    }));
    out.push(place(cam, 'musician_drum', -1.2, 1.2, -12, {
      seed: 31, expr: 'laugh', mode: 'stand', arm: strike ? 'lift' : 'reach', prop: 'drum',
      tilt: strike ? -6 : 0, blink: blinkAt(f, 31),
    }));
    // Councillors throw hands up in despair.
    [-1.5, 0, 1.5].forEach((x, i) => {
      out.push(place(cam, 'councillor', x, 1.2, -12, {
        seed: 20 + i, expr: 'shock', mode: 'stand', arm: 'up', blink: blinkAt(f, 20 + i),
      }));
    });
    // Troffea spins faster, laughing — inside the hold+orbit corridor.
    out.push(troffeaDance(f, 0.75, 0, -6.5, cam, { expr: 'laugh' }));
    // Fresh wave joins on "more" (f820-822): spring-pops already inside the corridor
    // (a side run-in would slice the narrow 9:16 cone at every frame).
    const waveK = (i) => spring(f, 820 + i * 2, 10);
    const WAVE = [
      [-0.25, 0, -7.0], [0.35, 0, -7.4], [0.95, 0, -7.0],
      [1.45, 0, -8.6], [0.45, 0, -8.9], [1.15, 0, -9.55],
    ];
    WAVE.forEach(([x, y, z], i) => {
      const s = waveK(i);
      out.push(place(cam, CAST[6 + i].outfit, x - (1 - clamp01x(s)) * 0.25, 0, z + (1 - s) * -1.2, {
        seed: CAST[6 + i].seed, expr: 'grin', mode: 'stroll', phase: (t * 1.8 + i * 0.2) % 1,
        arm: 'up', tilt: (1 - s) * 8, blink: blinkAt(f, CAST[6 + i].seed),
      }));
    });
    // The packed crowd keeps dancing: the SAME front row as shots 3 and 5
    // (cast 0..5) up front, cast 12..17 behind — same faces, same order.
    const CROWD = [
      [-1.5, -8.5, 0], [-0.9, -8.55, 1], [-0.3, -8.5, 2], [0.3, -8.55, 3], [0.9, -8.5, 4], [1.5, -8.55, 5],
      [-1.25, -9.4, 12], [-0.35, -9.45, 13], [0.65, -9.4, 14], [1.65, -9.45, 15],
      [-0.8, -9.9, 16], [0.8, -9.9, 17],
    ];
    for (let i = 0; i < CROWD.length; i++) {
      const [x, z, s] = CROWD[i];
      out.push(place(cam, CAST[s].outfit, x, 0, z, {
        seed: CAST[s].seed, expr: i % 4 === 0 ? 'dazed' : 'grin', mode: 'stroll',
        phase: (t * 1.6 + i * 0.13) % 1, arm: 'wave', blink: blinkAt(f, CAST[s].seed),
      }));
    }
  }

  if (id === 7) {
    // Restaged for the S7a->S7b rack: both camera axes now cross the same stage
    // corridor (S7b looks at (-13,1.4,-20.5)), so the doctor and the chain of
    // townsfolk sit in a depth queue (x inside per-row corridors) instead of
    // spreading 3.3 m laterally — any wider x spread clipped both camera cones.
    out.push(place(cam, 'doctor', -13.6, 0, -19.7, {
      seed: 70, expr: 'neutral', mode: 'stand', arm: 'point', blink: blinkAt(f, 70),
    }));
    // Chain runs SOUTHEAST from the doctor, ~0.8 m apart across the screen,
    // slightly receding: the old southwest line ran PARALLEL to the camera's
    // view direction, so all four faces stacked into one twin blob. Each member
    // is now ~0.8 m across the screen from the last, face fully distinct.
    for (let i = 0; i < 4; i++) {
      const sneeze = i === 3 && f >= 1012 && f <= 1014;
      const c = [
        [-13.1, -20.35], [-12.6, -21.0], [-12.1, -21.65], [-11.6, -22.3],
      ][i];
      out.push(place(cam, CAST[i].outfit, c[0], 0, c[1], {
        seed: CAST[i].seed, expr: sneeze ? 'shock' : i % 2 ? 'nervous' : 'neutral',
        mode: 'stand', arm: 'reach', headTilt: sneeze ? -8 : 0,
        blink: sneeze ? 1 : blinkAt(f, CAST[i].seed),
      }));
    }
  }

  if (id === 8) {
    // March in a slow orderly line north along the street; heads bowed, tired.
    // Path: (0,0,-2) heading -z. Leader walks from f1044 at 1.1 m/s (~4.4 m in the shot).
    const w = walk(f, 1044, 1.1);
    const pathPt = (d) => [0, 0, -2 - d];
    // Councillor at the front holds the proclamation (fx card, placed in fxAt).
    out.push(placeSide(cam, 'councillor', ...pathPt(w.dist + 1.2), {
      seed: 20, expr: 'stern', mode: 'march', phase: w.phase, stride: 1, blink: blinkAt(f, 20),
    }));
    for (let i = 0; i < 7; i++) {
      const d = w.dist - i * 1.2;
      const p = pathPt(d);
      const lookBack = i === 1 && f >= 1098 && f <= 1108; // Troffea (2nd in the column) looks back before "marched"
      if (lookBack) {
        // Turn to face the camera for a beat, head tilted back over her shoulder.
        out.push(place(cam, 'troffea', p[0], p[1], p[2], {
          seed: 1, expr: 'neutral', mode: 'stand', arm: 'hang', headTilt: -10,
          blink: blinkAt(f, 1),
        }));
      } else {
        out.push(placeSide(cam, i === 1 ? 'troffea' : CAST[i].outfit, p[0], p[1], p[2], {
          seed: i === 1 ? 1 : CAST[i].seed, expr: 'neutral', mode: 'march', phase: (w.phase + i * 0.5) % 1,
          stride: 1, blink: blinkAt(f, i === 1 ? 1 : CAST[i].seed),
        }));
      }
    }
  }

  if (id === 9) {
    // Everyone kneeling/still at the shrine (hill top y=4, shrine at (18,4,-38)),
    // flanking the shrine in a semicircle — none between the camera and the shrine.
    // Kneelers = the same flock that danced (cast 19..23), not new faces —
    // the people the audience followed all film are the ones at the shrine.
    const kneel = [
      [16.6, -37.6, 19], [18.0, -38.4, 20], [19.4, -37.6, 21],
      [17.3, -36.4, 22], [18.7, -36.4, 23],
    ];
    kneel.forEach(([x, z, s]) => {
      out.push(place(cam, CAST[s].outfit, x, 4.0, z, {
        seed: CAST[s].seed, expr: 'smile_closed', mode: 'sit', arm: 'belly', blink: 1,
      }));
    });
    // Troffea sits down, exhales, a small relieved smile on "cure" (f1171-1173).
    const smile = f >= 1171;
    out.push(place(cam, 'troffea', 18.0, 4.0, -36.6, {
      seed: 1, expr: smile ? 'relief' : 'neutral', mode: 'sit', arm: 'belly',
      headTilt: smile ? -4 : 0, blink: 1,
    }));
    // Doctor stands at the shrine steps, calm.
    out.push(place(cam, 'doctor', 19.8, 4.0, -37.8, {
      seed: 70, expr: 'smile_closed', mode: 'stand', arm: 'hang', blink: 1,
    }));
  }

  return out;
}

// ---------------- effects ----------------
/**
 * Effect cards + flash for frame f. Each entry: { key, cw, ch, draw(p), x, y, z, w, h,
 * flat?, rot?, soft? }. w/h in metres. flat = laid on the ground (rotated -90 deg X).
 */
export function fxAt(f, cam) {
  const id = shotAt(f).id;
  const out = [];
  const t = T(f);
  const { flash } = worldAt(f);

  if (id === 1) {
    // Drifting dust motes around Troffea.
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.25 + i * 0.2) % 1);
      out.push({
        key: `mote${i}|${q(u, 20)}`, cw: 120, ch: 120,
        draw: (p) => p.ell(60, 60, 8, 8, 'rgba(255,244,214,0.85)', 0),
        x: -0.8 + i * 0.4, y: 0.6 + 0.9 * u, z: 0.3 - (i % 3) * 0.2,
        w: 0.1, h: 0.1, soft: true,
      });
    }
  }

  if (id === 2) {
    // The lute leaning on the market stall, untouched (the no-music joke).
    out.push({
      key: 'lute', cw: 300, ch: 500,
      draw: (p) => {
        p.ell(150, 180, 70, 95, '#c98f4e', 8);
        p.ell(150, 180, 34, 48, '#8a5a34', 5);
        p.line([[150, 90], [150, 20]], '#7d5234', 16);
        p.dot(150, 30, 8);
      },
      x: 1.5, y: 0, z: 1.8, w: 0.45, h: 0.75, rot: 0.15,
    });
  }

  if (id === 3) {
    // Dust puffs on each new joiner (f333-345).
    if (f >= 333 && f < 360) {
      const u = (f - 333) / 27;
      for (let j = 0; j < 3; j++) {
        const jx = [-2.2, 2.4, 0.6][j], jz = [0.5, 0.8, -0.6][j];
        out.push({
          key: `puff${j}|${q(u, 20)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 20)),
          x: jx, y: 0.05, z: jz, w: 0.7, h: 0.7, soft: true,
        });
      }
    }
    // Sun/moon card drifting overhead to sell "day and night".
    const dayK = 1 - smooth((f - 380) / 100);
    const mx = lerp(-6, 6, smooth((f - 302) / 203));
    out.push({
      key: `sunmoon|${q(dayK, 20)}`, cw: 300, ch: 300,
      draw: (p) => {
        if (dayK > 0.5) { p.ell(150, 150, 70, 70, '#ffd84a', 8); }
        else { p.ell(150, 150, 60, 60, '#f4f1ea', 6); p.ell(170, 135, 55, 55, '#d8d2c4', 0); }
      },
      x: mx, y: 14, z: -8, w: 2.2, h: 2.2, soft: false,
    });
    // Drifting clouds.
    for (let i = 0; i < 3; i++) {
      out.push({
        key: `cloud${i}`, cw: 600, ch: 300, draw: (p) => fxCloud(p, i + 1),
        x: -14 + i * 12 + t * 0.15, y: 16 + i, z: -22 - i * 4, w: 7, h: 3.5, soft: true,
      });
    }
  }

  if (id === 4) {
    // Dust puff on the collapse (f599-601).
    if (f >= 599 && f < 625) {
      const u = (f - 599) / 26;
      out.push({
        key: `collapse-puff|${q(u, 20)}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, q(u, 20)),
        x: 0, y: 0.05, z: 0.5, w: 0.9, h: 0.9, soft: true,
      });
    }
  }

  if (id === 7) {
    // Pale blue wisps travelling hand to hand along the queue (doctor -> F4).
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.5 + i * 0.33) % 1);
      const wx = lerp(-13.7, -11.6, u);
      const wz = lerp(-20.2, -22.3, u);
      out.push({
        key: `wisp${i}|${q(u, 20)}`, cw: 200, ch: 120,
        draw: (p) => p.ell(100, 60, 60, 22, `rgba(159,212,255,${(0.75 * (1 - u)).toFixed(3)})`, 0),
        x: wx, y: 1.5, z: wz, w: 0.7, h: 0.4, soft: true,
      });
    }
  }

  if (id === 8) {
    // Held HIGH overhead (was y=1.6): the old height put the sign right across
    // the lead councillor's face. Now it reads above his head, held up beside him.
    const w = walk(f, 1044, 1.1);
    const pz = -2 - (w.dist + 1.2);
    out.push({
      key: 'proclamation', cw: 700, ch: 520, draw: (p) => drawSign(p),
      x: -0.7, y: 2.05, z: pz + 0.3, w: 0.85, h: 0.63, rot: 0.06,
    });
  }

  if (id === 9) {
    // Drifting leaves — the only motion in the still frame.
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.12 + i * 0.17) % 1);
      out.push({
        key: `leaf${i}|${q(u, 20)}`, cw: 120, ch: 120,
        draw: (p) => p.ell(60, 60, 22, 10, '#c9a44a', 4, 0, 360, (i * 40) % 180),
        x: 16 + i * 0.7, y: 6.5 - 2.5 * u, z: -36 - (i % 3), w: 0.22, h: 0.22,
        rot: u * 4 + i, soft: true,
      });
    }
    // The abandoned shoe on the shrine steps — the payoff prop. It sits on the
    // hill's west shoulder (16.0, 4.05, -35.8), in the open in front of the
    // kneelers: the old spot behind Troffea hid it.
    out.push({
      key: 'shoe', cw: 300, ch: 200,
      draw: (p) => {
        p.poly([[40, 150], [240, 150], [260, 120], [60, 120]], '#5a3b2a', 8);
        p.ell(150, 110, 90, 26, '#6b4a35', 6);
        p.line([[70, 130], [230, 130]], '#3a2a1e', 4);
      },
      x: 16.0, y: 4.05, z: -35.8, w: 0.5, h: 0.33, rot: -0.2,
    });
  }

  return { flash, fx: out };
}
