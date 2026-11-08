// motion.js — pure camera/motion math for the Dancing Plague web engine.
// No three.js dependency: positions/looks are plain [x, y, z] arrays, fov/roll numbers.
// Grammar (from the skill + upstream story.ts): smootherstep glides 18-45 f, easeOut
// reveals/whips, Catmull-Rom path via-points, every hold creeps, 3-5 deg rolls on drama,
// 7-frame flip-shakes on impacts. All functions are pure in the frame number.
export const FPS = 30;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** smootherstep: symmetric ease, 0 attack / 0 release velocity */
export const smooth = (x) => { const u = clamp01(x); return u * u * u * (u * (6 * u - 15) + 10); };
export const smootherstep = smooth;
/** easeOut quartic: fast start, soft landing (reveals, whips) */
export const easeOut = (u) => 1 - (1 - clamp01(u)) ** 4;
export const easeInOut = (u) => { const x = clamp01(u); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
/** linear interpolation between [f, v] keyframes */
export const lin = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
};
/** Catmull-Rom spline through points p0..pn-1, t in [0, 1] */
export const catmullRom = (pts, t) => {
  const n = pts.length - 1, u = clamp01(t) * n, i = Math.min(n - 1, Math.floor(u)), k = u - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const out = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    out[j] = 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * k
      + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * k * k
      + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * k * k * k);
  }
  return out;
};
/** quadratic Bezier over three control points, t in [0, 1] */
export const bezier2 = (a, b, c, t) => {
  const r = 1 - t;
  return [0, 1, 2].map((i) => r * r * a[i] + 2 * t * r * b[i] + t * t * c[i]);
};

export const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  mix: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};

/** Camera: { pos:[x,y,z], look:[x,y,z], fov, roll } — roll in radians. */
export const mixCam = (a, b, k) => ({
  pos: V3.mix(a.pos, b.pos, k),
  look: V3.mix(a.look, b.look, k),
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const fullCam = (c) => ({ fov: 40, roll: 0, ...c });
/**
 * camFromKeys(keys, f, { kicks }): keys = [{ f, dur?, cut?, s: (f) => Partial<Cam> }].
 * Glides are centred on the key frame: a glide key starts dur/2 earlier (upstream grammar).
 * kicks = [{ f, amp }] — impact flip-shakes: sign flips every frame, decay over 7 f.
 */
export function camFromKeys(keys, f, opts = {}) {
  let cur = fullCam(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    if (k.cut) { cur = fullCam(k.s(f)); continue; }
    cur = mixCam(cur, fullCam(k.s(f)), smooth((f - k.f) / (k.dur ?? 24)));
  }
  const kicks = opts.kicks || [];
  let a = 0;
  for (const [t0, g] of kicks) {
    const n = Math.floor(((f / FPS) - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  if (!a) return cur;
  const d = V3.sub(cur.look, cur.pos), L = V3.len(d) || 1, h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((cur.fov * Math.PI) / 360) * L * a;
  return {
    ...cur,
    look: [cur.look[0] - (d[2] / h) * m, cur.look[1] + 0.6 * m, cur.look[2] + (d[0] / h) * m],
    roll: cur.roll + a * 0.004,
  };
}
/** push-in factor since f0: subject grows ~rate per frame; `punch` raises it (8 f soft edges) for n frames */
export const pushK = (f, f0, rate, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: camera slides toward the look point by factor k */
export const dolly = (pos, look, k, rest = {}) => ({
  pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k],
  look, ...rest,
});
/** zoom push (camera stays put): tan(fov/2) shrinks by k */
export const zoom = (pos, look, fov, k, rest = {}) => ({
  pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest,
});
/** a roll-only move on top of an existing framing */
export const rolled = (s, roll) => (f) => ({ ...s(f), roll });

/** idle sway for a card: tiny rotation + vertical bob, deterministic per seed. */
export const idle = (f, seed = 1) => {
  const t = f / FPS;
  return {
    rot: 0.012 * Math.sin(t * 1.7 + seed * 2.3),
    bob: 0.012 * Math.sin(t * 2.3 + seed * 1.1),
    sway: 0.008 * Math.sin(t * 1.1 + seed * 3.7),
  };
};
/** blink schedule: gaps 0.5-2.3 s, 4-frame blink [half, shut, shut, half]; lid 0 open .. 1 shut. */
const hh = (i, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
export function blinkAt(f, i, swaps = []) {
  for (const ts of swaps) {
    const k = f - Math.round(ts * FPS) + 1;
    if (k >= 0 && k < 4) return LID[k];
  }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13));
  }
  return 0;
}
/**
 * walk(): distance travelled + step phase for a walk at speed m/s from frame f0.
 * 2 steps/s, 0.8 m stride (0.7 m per step at 1.4 Hz in the bridge code — here 0.8 m).
 * Returns { dist, phase } with phase 0..1 (footfalls at 0 and 0.5).
 */
export function walk(f, f0, speed = 1.4) {
  const t = Math.max(0, (f - f0) / FPS);
  const dist = speed * t;
  return { dist, phase: ((t * 2) % 1 + 1) % 1 };
}
/** anticipation → back overshoot → spring settle for a discrete action starting at f0 over dur frames.
 *  Returns 0 at rest, dips to -0.25 during anticipation, overshoots past 1, settles at 1. */
export const spring = (f, f0, dur) => {
  const u = clamp01((f - f0) / dur);
  if (u <= 0) return 0;
  if (u < 0.2) return -0.25 * (u / 0.2); // anticipation dip
  const v = (u - 0.2) / 0.8;
  return 1 - 1.25 * Math.cos(v * Math.PI * 2.5) * Math.exp(-3 * v);
};
