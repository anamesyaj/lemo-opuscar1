// 60 s animated timeline for "Why You're Tired After 8 Hours of Sleep" (impasto).
// Page contract: window.render(t) with t in seconds, window.DUR, window.READY.
//
// Animation follows the library's own method (STYLE.md §5, DEMO.md):
// the world is baked static; living things are separate plates transformed
// EVERY frame from fixed seeds — nothing boils, everything moves.
// Shots: hard cuts on narration beats (paint-over wipes only for the thieves).
//   0–3.5   bedroom: sleeper BREATHES, moon drifts, slow push (hook)
//   3.5–7   clock macro: hands TICK, push tighter
//   7–10.5  bedroom: sleep waves ROLL under the sleeper
//  10.5–16  chart: columns rise beat by beat
//  16–20   chart detail: push into the wave over the DREAM band
//  20–26   face close-up; at 0:24 the crack SPREADS + impact zoom
//  26–30   wine: liquid SWAYS (thief 1)
//  30–34   coffee: STEAM rises (thief 2)
//  34–39   tossing: shake + spreading cracks (thief 3)
//  39–49   bedroom wide: colour re-laid stroke by stroke (the fix)
//  49–60   morning: locked frame, LIGHT moves; disclaimer 56–60
import { Impasto, F } from './engine/impasto.js';
import {
  buildBedroom, buildClock, buildChart, buildMorning,
  buildWaves, buildWine, buildCoffee, buildCracks,
  buildChest, buildClockSecond, buildClockMinute, buildMoon, buildSteam, buildWineLiquid,
} from './scenes.js';

const W = 1080, H = 1920, DUR = 60;
const CLKX = 190, CLKY = 600;   // clock centre in the film's bedroom
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => { k = clamp01(k); return k * k * (3 - 2 * k); };
const sstep = (a, b, x) => ease((x - a) / (b - a));

// Per-frame 2D transforms (M = [a,b,c,d,e,f], x' = a*x + c*y + e, y' = b*x + d*y + f).
const Mscale = (s, cx, cy) => [s, 0, 0, s, cx * (1 - s), cy * (1 - s)];
const Mrot = (th, cx, cy) => {
  const c = Math.cos(th), s = Math.sin(th);
  return [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c];
};
const Mtrans = (dx, dy) => [1, 0, 0, 1, dx, dy];

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

// Chart: one 90-minute column per beat — title first, legend early.
const chartApp = (x, y) => {
  if (y < 480) return 0;
  if (y > 1450) return 0.3;
  if (x < 200 || x > 900) return 0.3;
  const i = Math.max(0, Math.min(4, Math.floor((x - 101) / 182)));
  return 0.6 + i * 0.85;
};

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

  const P_BED = bake(buildBedroom({ moon: false, rev: (x, y) => (x / W) * 7 }));
  const P_CLK = bake(buildClock(CLKX, CLKY, { hands: false }));
  const P_MIN = bake(buildClockMinute(CLKX, CLKY));
  const P_SEC = bake(buildClockSecond(CLKX, CLKY));
  const P_CHEST = bake(buildChest());
  const P_MOON = bake(buildMoon());
  const P_CHART = bake(buildChart({ app: chartApp }));
  const P_MORN = bake(buildMorning());
  const P_WAVE = bakeMasked(buildWaves());
  const P_WINE = bake(buildWine({ liquid: false }));
  const P_WLIQ = bake(buildWineLiquid());
  const P_COF = bake(buildCoffee({ steam: false }));
  const P_STEAM = bake(buildSteam());
  const P_CRK = bakeMasked(buildCracks());

  const plate = (P, o) => {
    E.under(P.tex, W, H, {
      cam: o.cam, t: o.t, grey: o.grey ?? 1, reveal: o.reveal ?? -1e6,
      revC: o.revC, alpha: o.ua ?? 1, M: o.M,
    });
    E.draw(P.batch, {
      cam: o.cam, t: o.t, grey: o.grey ?? 1, reveal: o.reveal ?? -1e6,
      revDur: o.revDur ?? 1.2, appear: o.appear ?? -1e6, appDur: o.appDur ?? 0.5,
      alpha: o.alpha ?? 1, M: o.M,
    });
  };
  const cam0 = (x, y, zoom) => ({ x, y, zoom, rot: 0 });

  // Living things, drawn in every bedroom shot: breathing chest, drifting
  // moon, ticking clock hands. t0/dur scope the moon's drift to the shot.
  const breatheM = t => Mscale(1 + 0.016 * Math.sin(t * Math.PI * 2 / 4.3), 560, 1420);
  const bedroomLiving = (t, cam, t0, dur) => {
    plate(P_CHEST, { cam, t, grey: 1, reveal: 1e6, M: breatheM(t) });
    plate(P_MOON, { cam, t, grey: 1, reveal: 1e6, M: Mtrans(30 * clamp01((t - t0) / dur), 0) });
    plate(P_CLK, { cam, t, grey: 0 });
    const sec = Math.floor(t) + sstep(0, 0.18, t % 1);   // stepping second hand
    plate(P_MIN, { cam, t, grey: 0, M: Mrot(t * Math.PI * 2 / 3600, CLKX, CLKY) });
    plate(P_SEC, { cam, t, grey: 0, M: Mrot(sec * Math.PI * 2 / 60, CLKX, CLKY) });
  };

  // ---------- shots ----------
  function shotHook(t) {           // 0–3.5: breathing sleeper, moon drifts, push
    const k = ease(t / 3.5);
    const cam = cam0(lerp(450, 430, k), lerp(1050, 1080, k), lerp(1.35, 1.5, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    bedroomLiving(t, cam, 0, 3.5);
    E.finish(POST_NIGHT);
  }
  function shotClock(t) {          // 3.5–7: clock macro, hands tick, push tighter
    const k = ease((t - 3.5) / 3.5);
    const cam = cam0(260, 600, lerp(2.1, 2.5, k));
    E.begin();
    plate(P_CLK, { cam, t, grey: 0 });
    const sec = Math.floor(t) + sstep(0, 0.18, t % 1);
    plate(P_MIN, { cam, t, grey: 0, M: Mrot(t * Math.PI * 2 / 3600, CLKX, CLKY) });
    plate(P_SEC, { cam, t, grey: 0, M: Mrot(sec * Math.PI * 2 / 60, CLKX, CLKY) });
    E.finish(POST_NIGHT);
  }
  function shotWaves(t) {          // 7–10.5: sleep waves ROLL under the sleeper
    const k = ease((t - 7) / 3.5);
    const cam = cam0(540, lerp(1050, 1080, k), lerp(1.0, 1.08, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    plate(P_WAVE, {
      cam, t, grey: 1, appear: 7, appDur: 0.4,
      M: Mtrans(70 * Math.sin((t - 7) * Math.PI * 2 / 7), 0),
    });
    bedroomLiving(t, cam, 7, 3.5);
    E.finish(POST_NIGHT);
  }
  function shotChart(t) {          // 10.5–16: columns rise beat by beat
    const k = ease((t - 10.5) / 5.5);
    const cam = cam0(540, lerp(960, 900, k), lerp(1, 1.07, k));
    E.begin();
    plate(P_CHART, { cam, t, grey: 0, appear: 10.6, appDur: 0.55 });
    E.finish(POST_CHART);
  }
  function shotChartDetail(t) {    // 16–20: push into the wave over the DREAM band
    const k = ease((t - 16) / 4);
    const cam = cam0(540, lerp(900, 870, k), lerp(1.07, 1.6, k));
    E.begin();
    plate(P_CHART, { cam, t, grey: 0, appear: 10.6, appDur: 0.55 });
    E.finish(POST_CHART);
  }
  function shotAlarm(t) {          // 20–26: face close-up; crack SPREADS at 0:24
    let cx = 450, cy = 1060, zoom = 2.4;
    if (t >= 24) {
      const d = t - 24;
      zoom += 0.55 * Math.exp(-d * 2.5);              // impact punch, decays
      const j = Math.exp(-d * 4);                    // shake, decays
      cx += Math.sin(t * 71) * 9 * j; cy += Math.cos(t * 67) * 7 * j;
    }
    const cam = cam0(cx, cy, zoom);
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    plate(P_CHEST, { cam, t, grey: 1, reveal: 1e6, M: breatheM(t) });
    if (t >= 24) plate(P_CRK, { cam, t, grey: 1, appear: 24, appDur: 0.9 });
    E.finish(POST_NIGHT);
  }
  function shotWine(t) {           // 26–30: thief 1, liquid sways
    const k = ease((t - 26) / 4);
    const cam = cam0(540, lerp(980, 940, k), lerp(1.05, 1.15, k));
    E.begin();
    plate(P_WINE, { cam, t, grey: 0, appear: 26, appDur: 0.5 });
    plate(P_WLIQ, { cam, t, grey: 0, M: Mrot(0.028 * Math.sin(t * Math.PI * 2 / 5.2), 540, 1055) });
    E.finish(POST_NIGHT);
  }
  function shotCoffee(t) {         // 30–34: thief 2, steam rises
    const k = ease((t - 30) / 4);
    const cam = cam0(540, lerp(980, 940, k), lerp(1.05, 1.15, k));
    E.begin();
    plate(P_COF, { cam, t, grey: 0, appear: 30, appDur: 0.5 });
    for (let w = 0; w < 2; w++) {                    // looped rising wisps
      const kk = ((t * 46 + w * 140) % 280) / 280;
      const fade = 0.9 * (1 - kk) * sstep(0, 0.12, kk);
      plate(P_STEAM, {
        cam, t, grey: 0,
        M: Mtrans(8 * Math.sin(t * 2 + w * 2.4), -kk * 280),
        alpha: fade, ua: fade,
      });
    }
    E.finish(POST_NIGHT);
  }
  function shotToss(t) {           // 34–39: thief 3, shake + spreading cracks
    const amp = 13;
    const cam = cam0(540 + Math.sin(t * 61.3) * Math.sin(t * 17.7) * amp,
                     960 + Math.cos(t * 53.1) * Math.sin(t * 23.3) * amp, 1.06);
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 1e6 });
    bedroomLiving(t, cam, 34, 5);
    plate(P_CRK, { cam, t, grey: 1, appear: 34, appDur: 1.4 });
    E.finish(POST_NIGHT);
  }
  function shotFix(t) {            // 39–49: colour re-laid stroke by stroke
    const k = ease((t - 39) / 10);
    const cam = cam0(lerp(540, 520, k), lerp(960, 980, k), lerp(1, 1.05, k));
    E.begin();
    plate(P_BED, { cam, t, grey: 1, reveal: 40.5, revDur: 1.2, revC: [0, 960, 150] });
    bedroomLiving(t, cam, 39, 10);
    E.finish(POST_NIGHT);
  }
  function shotMorning(t) {        // 49–60: locked frame, LIGHT moves
    const k = ease((t - 49) / 11);
    const cam = cam0(540, lerp(1060, 960, k), lerp(1.28, 1.0, k));
    const post = {
      ...POST_MORNING,
      light: [-.85 + .12 * k, -.14, .5],
      expo: 1.02 + .04 * k,
      sat: 1.05 + .03 * k,
    };
    E.begin();
    plate(P_MORN, { cam, t, grey: 0 });
    plate(P_CLK, { cam, t, grey: 0 });
    const sec = Math.floor(t) + sstep(0, 0.18, t % 1);
    plate(P_MIN, { cam, t, grey: 0, M: Mrot(t * Math.PI * 2 / 3600, CLKX, CLKY) });
    plate(P_SEC, { cam, t, grey: 0, M: Mrot(sec * Math.PI * 2 / 60, CLKX, CLKY) });
    E.finish(post);
  }

  // ---------- subtitles + disclaimer (crisp DOM text, 9:16 safe zone) ----------
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
    if (t < 3.5) shotHook(t);
    else if (t < 7) shotClock(t);
    else if (t < 10.5) shotWaves(t);
    else if (t < 16) shotChart(t);
    else if (t < 20) shotChartDetail(t);
    else if (t < 26) shotAlarm(t);
    else if (t < 30) shotWine(t);
    else if (t < 34) shotCoffee(t);
    else if (t < 39) shotToss(t);
    else if (t < 49) shotFix(t);
    else shotMorning(t);
  };
  window.DUR = DUR;
  window.render(0);
  window.READY = true;
}
