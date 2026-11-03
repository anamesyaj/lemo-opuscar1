// 60 s animated timeline for "Why You're Tired After 8 Hours of Sleep" (impasto).
// Page contract: window.render(t) with t in seconds, window.DUR, window.READY.
// Shots (hard cuts on beats, no dissolves):
//   0–4   bedroom night, monochrome, red clock — slow push-in (hook)
//   4–10  sleep waves roll under the sleeper (architecture)
//  10–20  sleep-cycle chart painted stroke by stroke (mechanism)
//  20–28  face close-up; grey crack at the 0:24 downbeat (alarm)
//  28–40  three thieves: wine / coffee / tossing — paint-over wipes
//  40–52  bedroom wide again; colour re-laid stroke by stroke (the fix)
//  52–60  morning, raking light, pull-back to wide; disclaimer 56–60
import { Impasto, F } from './engine/impasto.js';
import {
  buildBedroom, buildClock, buildChart, buildMorning,
  buildWaves, buildWine, buildCoffee, buildCracks,
} from './scenes.js';

const W = 1080, H = 1920, DUR = 60;
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp01(k); return k * k * (3 - 2 * k); };

// Burned-in subtitles (from audio/captions.srt — 11 cues, Parakeet timings).
const CUES = [
  [0.00, 2.24, 'You slept eight hours last night.'],
  [2.32, 6.68, 'So why do you feel like you got hit by a truck?'],
  [6.96, 9.84, "The answer isn't hours — it's architecture."],
  [9.92, 15.28, 'Your brain sleeps in ninety-minute cycles:\nlight sleep, deep sleep, then dreaming.'],
  [15.36, 19.32, 'A full night is four to six clean cycles.'],
  [19.68, 25.60, 'But if your alarm drags you out of deep\nsleep mid-cycle, you wake up groggy no matter'],
  [25.68, 31.68, 'how long you slept. Alcohol, late\ncaffeine, and a restless room shatter those cycles'],
  [31.76, 38.84, 'into fragments — eight hours of broken\nsleep is not eight hours of sleep.'],
  [38.96, 44.72, 'The fix researchers keep coming back to:\nwake up at the same time every day, keep the'],
  [44.80, 49.12, 'room dark, cool, and quiet — and let the\ncycles finish.'],
  [49.20, 52.12, "Sleep isn't a bank. It's a rhythm."],
];
const DISCLAIMER = 'Educational content only — not medical advice. Talk to your doctor about persistent fatigue.';

const POST_NIGHT = { light: [-.35, -.55, .72], amb: .55, dif: .3, spec: .2, ao: 1.2, expo: .95, sat: 1, vig: .35 };
const POST_CHART = { light: [-.5, -.6, .7], amb: .75, dif: .3, spec: .18, ao: 1.1, expo: 1, sat: 1.05, vig: .3 };
const POST_MORNING = { light: [-.85, -.14, .5], amb: .7, dif: .34, spec: .3, ao: 1.1, expo: 1.02, sat: 1.05, vig: .3 };

export async function initFilm() {
  const canvas = document.getElementById('c');
  canvas.width = W; canvas.height = H;
  const E = new Impasto(canvas, { W, H, ss: 2 });

  // ---------- build + bake plates (once) ----------
  const bake = S => ({ batch: E.batch(S.strokes), tex: E.texture(S.ref.ctx.canvas) });
  // Sparse transparent refs (waves, cracks): keep only strokes near the motif
  // polylines, since paintRef would otherwise lay dark strokes over the
  // transparent field.
  const bakeMasked = S => {
    const d = S.strokes, pts = S.pts, keep = [];
    const near = (x, y) => {
      for (const pl of pts) for (let i = 0; i < pl.length - 1; i++) {
        const ax = pl[i][0], ay = pl[i][1], dx = pl[i + 1][0] - ax, dy = pl[i + 1][1] - ay;
        const L2 = dx * dx + dy * dy;
        let k = L2 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        const px = ax + dx * k, py = ay + dy * k, ddx = x - px, ddy = y - py;
        if (ddx * ddx + ddy * ddy < 48 * 48) return true;
      }
      return false;
    };
    for (let i = 0; i < d.length / F; i++) if (near(d[i * F], d[i * F + 1])) keep.push(...d.subarray(i * F, (i + 1) * F));
    return { batch: E.batch(new Float32Array(keep)), tex: E.texture(S.ref.ctx.canvas) };
  };

  const P_BED = bake(buildBedroom({ rev: (x, y) => (x / W) * 7 }));
  const P_CLK = bake(buildClock(190, 600));
  const P_CHART = bake(buildChart({ app: (x, y) => (x / W) * 7 + (y / H) * 1.5 }));
  const P_MORN = bake(buildMorning());
  const P_WAVE = bakeMasked(buildWaves());
  const P_WINE = bake(buildWine());
  const P_COF = bake(buildCoffee());
  const P_CRK = bakeMasked(buildCracks());

  const plate = (P, o) => {
    E.under(P.tex, W, H, {
      cam: o.cam, t: o.t, grey: o.grey ?? 1, reveal: o.reveal ?? -1e6,
      revC: o.revC, alpha: o.ua ?? 1,
    });
    E.draw(P.batch, {
      cam: o.cam, t: o.t, grey: o.grey ?? 1, reveal: o.reveal ?? -1e6,
      revDur: o.revDur ?? 1.2, appear: o.appear ?? -1e6, appDur: o.appDur ?? 0.5,
      alpha: o.alpha ?? 1,
    });
  };
  const cam0 = (x, y, zoom) => ({ x, y, zoom, rot: 0 });

  // ---------- shots ----------
  function shotHook(t) {           // 0–4: night bedroom, slow push-in
    const k = ease(t / 4);
    const cam = cam0(lerp(540, 505, k), lerp(960, 1000, k), lerp(1, 1.12, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    plate(P_CLK, { cam, t, grey: 0 });
    E.finish(POST_NIGHT);
  }
  function shotWaves(t) {          // 4–10: sleep waves roll under the sleeper
    const k = ease((t - 4) / 6);
    const cam = cam0(lerp(505, 480, k), lerp(1000, 1160, k), lerp(1.12, 1.32, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    plate(P_WAVE, { cam, t, grey: 1, appear: 4, appDur: 0.4 });
    plate(P_CLK, { cam, t, grey: 0 });
    E.finish(POST_NIGHT);
  }
  function shotChart(t) {          // 10–20: chart painted stroke by stroke
    const k = ease((t - 10) / 10);
    const cam = cam0(540, lerp(960, 900, k), lerp(1, 1.07, k));
    E.begin();
    plate(P_CHART, { cam, t, grey: 0, appear: 10.2, appDur: 0.6, ua: 0.05 + 0.95 * clamp01((t - 10) / 3) });
    E.finish(POST_CHART);
  }
  function shotAlarm(t) {          // 20–28: face close-up; crack at the 0:24 downbeat
    let cx = 450, cy = 1060;
    if (t >= 24 && t < 25.5) {
      const j = Math.exp(-(t - 24) * 4);
      cx += Math.sin(t * 71) * 9 * j; cy += Math.cos(t * 67) * 7 * j;
    }
    const cam = cam0(cx, cy, 2.4);
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    if (t >= 24) plate(P_CRK, { cam, t, grey: 1, appear: 24, appDur: 0.25 });
    E.finish(POST_NIGHT);
  }
  function shotThieves(t) {        // 28–40: wine / coffee / tossing
    if (t < 32) {                  // thief 1: alcohol
      const k = ease((t - 28) / 4);
      const cam = cam0(540, lerp(980, 940, k), lerp(1.05, 1.15, k));
      E.begin();
      plate(P_WINE, { cam, t, grey: 0, appear: 28, appDur: 0.5 });
      E.finish(POST_NIGHT);
    } else if (t < 36) {           // thief 2: late caffeine
      const k = ease((t - 32) / 4);
      const cam = cam0(540, lerp(980, 940, k), lerp(1.05, 1.15, k));
      E.begin();
      plate(P_COF, { cam, t, grey: 0, appear: 32, appDur: 0.5 });
      E.finish(POST_NIGHT);
    } else {                       // thief 3: restless tossing — shake + spreading cracks
      const amp = 13;
      const cam = cam0(540 + Math.sin(t * 61.3) * Math.sin(t * 17.7) * amp,
                       960 + Math.cos(t * 53.1) * Math.sin(t * 23.3) * amp, 1.06);
      E.begin();
      plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
      plate(P_CLK, { cam, t, grey: 0 });
      plate(P_CRK, { cam, t, grey: 1, appear: 36, appDur: 1.4 });
      E.finish(POST_NIGHT);
    }
  }
  function shotFix(t) {            // 40–52: repeated wide; colour re-laid stroke by stroke
    const k = ease((t - 40) / 12);
    const cam = cam0(lerp(540, 520, k), lerp(960, 980, k), lerp(1, 1.05, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 42, revDur: 1.2, revC: [0, 960, 150] });
    plate(P_CLK, { cam, t, grey: 0 });
    E.finish(POST_NIGHT);
  }
  function shotMorning(t) {        // 52–60: raking light, pull-back to wide
    const k = ease((t - 52) / 8);
    const cam = cam0(540, lerp(1060, 960, k), lerp(1.3, 1.0, k));
    E.begin();
    plate(P_MORN, { cam, t, grey: 0 });
    plate(P_CLK, { cam, t, grey: 0 });
    E.finish(POST_MORNING);
  }

  // ---------- subtitles + disclaimer (crisp DOM text) ----------
  const capEl = document.getElementById('cap');
  const discEl = document.getElementById('disc');
  let lastCue = -2;
  const updateSubs = t => {
    let idx = -1;
    for (let i = 0; i < CUES.length; i++) if (t >= CUES[i][0] && t < CUES[i][1]) { idx = i; break; }
    if (idx !== lastCue) { lastCue = idx; capEl.textContent = idx >= 0 ? CUES[idx][2] : ''; }
    const showD = t >= 56 && t < 60;
    if (discEl.style.opacity !== (showD ? '1' : '0')) discEl.style.opacity = showD ? '1' : '0';
  };

  window.render = t => {
    updateSubs(t);
    if (t < 4) shotHook(t);
    else if (t < 10) shotWaves(t);
    else if (t < 20) shotChart(t);
    else if (t < 28) shotAlarm(t);
    else if (t < 40) shotThieves(t);
    else if (t < 52) shotFix(t);
    else shotMorning(t);
  };
  window.DUR = DUR;
  window.render(0);
  window.READY = true;
}
