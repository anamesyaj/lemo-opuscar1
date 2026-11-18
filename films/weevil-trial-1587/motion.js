// motion.js — pure camera/motion math for `weevil-trial-1587` (30 fps, 900 frames).
// All camera and pose evaluators are pure functions of the frame index `f`.
export const FPS = 30;
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** symmetric smootherstep: zero velocity at endpoints */
export const smooth = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (6 * u - 15) + 10);
};
export const smootherstep = smooth;

/** fast attack, soft quartic settle (whip-pans, crash reveals) */
export const easeOut = (u) => 1 - (1 - clamp01(u)) ** 4;
export const easeInOut = (u) => {
  const x = clamp01(u);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
export const lerp = (a, b, k) => a + (b - a) * k;

/** piecewise-linear curve over [[frame, value], ...] */
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

/** Catmull-Rom spline through 3D points, u in [0, 1] */
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

export const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  mix: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
};

export const mixCam = (a, b, k) => ({
  pos: V3.mix(a.pos, b.pos, k),
  look: V3.mix(a.look, b.look, k),
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});
const fullCam = (c) => ({ fov: 40, roll: 0, ...c });

/**
 * Evaluate camera keyframes [{ f, dur?, cut?, ease?, s(f) }] + optional impact flip-shakes.
 * Each kick `[timeSec, amp]` produces a crisp 7-frame oscillating camera jolt.
 */
export function camFromKeys(keys, f, opts = {}) {
  let cur = fullCam(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    if (k.cut) { cur = fullCam(k.s(f)); continue; }
    const u = (f - k.f) / (k.dur ?? 24);
    const weight = k.ease ? k.ease(u) : smooth(u);
    cur = mixCam(cur, fullCam(k.s(f)), weight);
  }
  const kicks = opts.kicks || [];
  let a = 0;
  for (const [t0, g] of kicks) {
    const n = Math.floor(((f / FPS) - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.45;
  }
  if (!a) return cur;
  const d = V3.sub(cur.look, cur.pos), L = V3.len(d) || 1, h = Math.hypot(d[0], d[2]) || 1;
  const m = (3.4 / 640) * Math.tan((cur.fov * Math.PI) / 360) * L * a;
  return {
    ...cur,
    look: [cur.look[0] - (d[2] / h) * m, cur.look[1] + 0.65 * m, cur.look[2] + (d[0] / h) * m],
    roll: cur.roll + a * 0.0055,
  };
}

/** exponential slow push-in scale factor since frame f0 */
export const pushK = (f, f0, rate) => Math.exp(-rate * Math.max(0, f - f0));

/** dolly camera relative to look point by factor k */
export const dolly = (pos, look, k, rest = {}) => ({
  pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k],
  look,
  ...rest,
});

/** subtle deterministic breathing/bob for static card actors */
export const idle = (f, seed = 1) => {
  const t = f / FPS;
  return {
    rot: 0.011 * Math.sin(t * 1.7 + seed * 2.3),
    bob: 0.011 * Math.sin(t * 2.3 + seed * 1.1),
    sway: 0.007 * Math.sin(t * 1.1 + seed * 3.7),
  };
};

const hh = (i, s = 0) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const LID = [0.5, 1, 1, 0.5];
export function blinkAt(f, i, swaps = []) {
  for (const ts of swaps) {
    const k = f - Math.round(ts * FPS) + 1;
    if (k >= 0 && k < 4) return LID[k];
  }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 300; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(16 + 50 * hh(i * 31 + n, 13));
  }
  return 0;
}

/** anticipation dip -> spring overshoot -> settle */
export const spring = (f, f0, dur) => {
  const u = clamp01((f - f0) / dur);
  if (u <= 0) return 0;
  if (u < 0.2) return -0.22 * (u / 0.2);
  const v = (u - 0.2) / 0.8;
  return 1 - 1.22 * Math.cos(v * Math.PI * 2.5) * Math.exp(-3 * v);
};
