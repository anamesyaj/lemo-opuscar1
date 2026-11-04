// film.js — direction for "What if the Philippines powered itself?" (90 s).
// Camera path, timeline state, labels, reticles, transmission lines, tags.
// Label landings are driven by voices/voice.words.json word starts
// (fallbacks hardcoded from the same file, cited below).

import { Camera, PlateRenderer, project, W, H } from './engine.js';
import { drawOverlay } from './overlay.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => {
  const s = clamp((x - a) / (b - a), 0, 1);
  return s * s * (3 - 2 * s);
};
const lerp = (a, b, s) => a + (b - a) * s;

// t, lon, lat, alt_km, tilt_deg, heading_deg — one continuous zoom, never frozen.
const KEYS = [
  [0.0, 121.50, 11.50, 3000, 42, 0],
  [8.0, 120.90, 12.50, 1800, 38, 0],
  [14.0, 120.55, 14.20, 650, 28, 0],
  [20.0, 120.428, 14.634, 26, 3, 0],   // Bataan close-up
  [23.0, 123.684, 13.462, 90, 5, 0],   // whip -> Tiwi
  [24.5, 123.684, 13.462, 85, 4, 0],
  [29.0, 121.303, 14.095, 70, 4, 0],   // track -> Mak-Ban
  [35.0, 121.303, 14.095, 62, 3, 0],
  [37.0, 121.050, 17.000, 60, 3, 0],   // whip -> Cordillera
  [41.0, 121.000, 17.020, 58, 3, 0],
  [43.0, 120.770, 18.530, 55, 3, 0],   // whip -> Ilocos
  [47.0, 120.750, 18.500, 55, 3, 0],
  [50.0, 121.300, 16.800, 700, 8, 0],  // climb to grid view
  [56.0, 121.800, 13.800, 760, 8, 0],
  [65.0, 121.800, 13.200, 800, 8, 0],
  [72.0, 121.600, 12.800, 820, 10, 0], // night bloom
  [80.0, 121.600, 12.400, 900, 12, 0],
  [86.0, 121.500, 11.800, 1800, 38, 0],// climb back, day returns
  [90.0, 121.500, 11.500, 3000, 42, 0],
];

const BLOOM_SITES = [ // lon, lat — plant sites + cities the what-if lights
  [120.428, 14.634], [123.684, 13.462], [121.303, 14.095], [120.98, 14.60],
  [123.90, 10.31], [125.45, 7.19], [120.77, 18.53], [120.596, 16.402],
];
const PLUME_SITES = [ // Tiwi x2, Mak-Ban x2 — steam-field claim marks
  [123.684, 13.462], [123.650, 13.440], [121.303, 14.095], [121.270, 14.120],
];
const PLUME_AXIS = [[123.684, 13.462], [121.303, 14.095]]; // Tiwi -> Mak-Ban
// point along the geothermal arc (0 = Tiwi, 1 = Mak-Ban) — the scan reveal front
const arcPoint = (f) => [
  lerp(PLUME_AXIS[0][0], PLUME_AXIS[1][0], f),
  lerp(PLUME_AXIS[0][1], PLUME_AXIS[1][1], f),
];

const RETICLES = [
  { anchor: [120.428, 14.634], tSearch: 6.8, tLock: 8.2, tHold1: 18.6, tFade1: 19.6, seed: 11 },
  { anchor: [121.000, 17.020], tSearch: 34.6, tLock: 36.0, tHold1: 40.2, tFade1: 41.0, seed: 23 },
  { anchor: [120.770, 18.530], tSearch: 40.2, tLock: 41.2, tHold1: 46.2, tFade1: 47.0, seed: 37 },
];

const TAGS = [
  // steam-field tag tracks the scan's reveal front along the arc
  { text: 'PROJECTED STEAM FIELD', at: (t, S) => arcPoint(Math.min(S.plumeFront, 1)),
    dx: 70, dy: -110, t0: 25.5, t1: 35 },
  { text: 'PROJECTED INTERCONNECT', at: [121.90, 13.30], dx: -60, dy: 80, t0: 55, t1: 65 },
  { text: 'PROJECTED NIGHT LOAD', at: [121.70, 12.90], dx: -260, dy: -40, t0: 70, t1: 86 },
];

const LINES = [
  { pts: [[120.428, 14.634], [120.70, 14.60], [120.98, 14.60]], t0: 52.0, t1: 55.0 },
  { pts: [[123.684, 13.462], [122.90, 13.90], [122.00, 14.30], [120.98, 14.60]], t0: 53.0, t1: 56.0 },
  { pts: [[121.303, 14.095], [121.10, 14.35], [120.98, 14.60]], t0: 53.5, t1: 56.5 },
  { pts: [[120.77, 18.53], [120.60, 17.20], [120.55, 16.00], [120.70, 15.00], [120.98, 14.60]], t0: 54.0, t1: 57.5 },
  { pts: [[121.00, 17.02], [120.80, 16.00], [120.90, 15.20], [120.98, 14.60]], t0: 54.5, t1: 58.0 },
  { pts: [[120.98, 14.60], [121.80, 13.60], [122.60, 12.40], [123.30, 11.20], [123.90, 10.31], [124.60, 8.90], [125.45, 7.19]], t0: 55.0, t1: 62.0 },
];

const CITIES = [ // lon, lat, radius factor — brightened 54-62 s
  [120.98, 14.60, 1.0], [123.90, 10.31, 0.8], [125.45, 7.19, 0.8],
  [121.05, 13.75, 0.55], [124.65, 8.48, 0.55],
];

function makeLabels(wordStarts) {
  const ws = (w, fb) => (wordStarts && wordStarts[w] != null ? wordStarts[w] : fb) + 0.15;
  return [
    { title: ['BATAAN NUCLEAR', 'POWER PLANT'], sub: 'Completed 1984. Never fueled.',
      src: 'DOE PHILIPPINES', anchor: [120.428, 14.634],
      t0: ws('Bataan.', 8.36), t1: 20 },          // word "Bataan." 8.36-8.96
    { title: ['GEOTHERMAL'], sub: 'Among the world\u2019s top producers \u2014 barely tapped.',
      src: 'DOE', anchor: (t, S) => arcPoint(Math.min(S.plumeFront, 1)),
      t0: ws('geothermal', 26.48), t1: 35 },      // word "geothermal" 26.48-27.44
    { title: ['HYDRO \u00b7 SOLAR \u00b7 WIND'], sub: 'Unbuilt capacity on every island.',
      src: 'DOE',
      // tracks the lock-ons: Cordillera rivers (36-41) -> Ilocos wind (43-50)
      anchor: (t) => {
        const k = sstep(41, 43, t);
        return [lerp(121.00, 120.77, k), lerp(17.02, 18.53, k)];
      },
      t0: ws('Cordillera.', 36.16), t1: 50 },    // word "Cordillera." 36.16-37.28
    { title: ['ELECTRICITY PRICE'], sub: 'Among Asia\u2019s highest today.',
      src: 'DOE', anchor: [120.98, 14.60],
      t0: ws('Electricity', 49.12), t1: 65 },    // word "Electricity" 49.12-49.72
  ];
}

function state(t, cam, camNext) {
  const grey = sstep(8, 12, t) * (1 - sstep(80, 84, t));
  const nightOn = sstep(64.5, 65.5, t) * (1 - sstep(85.5, 86.5, t));
  let nightFront;
  if (t < 65) nightFront = 20;
  else if (t < 72) nightFront = lerp(20, 3, sstep(65, 72, t));
  else if (t < 80) nightFront = 3;
  else if (t < 86) nightFront = lerp(3, 20, sstep(80, 86, t));
  else nightFront = 20;
  const bloom = sstep(67, 74, t) * (1 - sstep(86, 88.5, t));
  const plume = sstep(23.5, 25, t) * (1 - sstep(34, 35.5, t));
  // plume reveal front follows the camera along the Tiwi->Mak-Ban arc,
  // so the scan always leads at frame centre and the label/tag anchors stay in frame.
  // After arrival it sweeps slightly past Mak-Ban (1.12) so the field fully prints.
  let plumeFront;
  if (t < 23.5) plumeFront = 0;
  else if (t < 29) {
    const ax = PLUME_AXIS[0], bx = PLUME_AXIS[1];
    const dx = bx[0] - ax[0], dy = bx[1] - ax[1];
    plumeFront = clamp(((cam.lon - ax[0]) * dx + (cam.lat - ax[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  } else plumeFront = Math.min(1.12, 1 + (t - 29) * 0.06);

  // grid scan front, north -> south 52-60 s
  const gridFront = t < 52 ? 20 : t < 60 ? lerp(20, 4, sstep(52, 60, t)) : 4;

  // scan band: night pass wins, then the amber grid sweep, then the geothermal pass
  let scanLat = -999, scanWidth = 1, scanAmp = 0, scanTint = [1, 1, 1];
  if (nightOn > 0.001 && ((t >= 65 && t < 72) || (t >= 80 && t < 86))) {
    scanLat = nightFront; scanWidth = 2.2; scanAmp = 0.10; scanTint = [0.85, 0.92, 1.0];
  } else if (t >= 52 && t < 60.5) {
    scanLat = gridFront; scanWidth = 1.8; scanAmp = 0.16; scanTint = [1.0, 0.75, 0.35];
  } else if (t >= 24 && t < 31.5) {
    scanLat = lerp(13.462, 14.095, plumeFront); scanWidth = 0.5; scanAmp = 0.14;
    scanTint = [1.0, 0.75, 0.35];
  }

  // whip blur from apparent ground motion: how fast the look-at ground point
  // slides across the screen (deterministic; pure zooms give ~0, correctly)
  const dt = 0.05;
  const p0 = project(cam.lon, cam.lat, cam);
  const p1 = project(cam.lon, cam.lat, camNext);
  let pxPerSec = 0, dx = 0, dy = 0;
  if (!p0.behind && !p1.behind) {
    dx = p1.x - p0.x; dy = p1.y - p0.y;
    pxPerSec = Math.hypot(dx, dy) / dt;
  }
  const blurAmt = clamp((pxPerSec - 2000) / 3500, 0, 1);
  const pxPerKm = H / (2 * cam.alt * Math.tan(15 * Math.PI / 180));
  const m = Math.hypot(dx, dy) || 1;
  const blurPx = 24 * blurAmt;
  const cosLat = Math.cos(cam.lat * Math.PI / 180);
  const blurDll = [(dx / m) * blurPx / pxPerKm / (111.32 * cosLat),
                   (dy / m) * blurPx / pxPerKm / 110.57 * -1];
  // note: screen +y is south, so lat offset flips sign

  const fd = 1 - sstep(90, 170, cam.alt);
  return {
    grey, nightOn, nightFront, bloom, plume, plumeFront, gridFront,
    scanLat, scanWidth, scanAmp, scanTint,
    blurDll, blurAmt,
    fades: [1, 1, fd, fd, fd, fd, fd],
    bloomSites: BLOOM_SITES, plumeSites: PLUME_SITES, plumeAxis: PLUME_AXIS,
  };
}

export function createFilm(wordStarts) {
  const camera = new Camera(KEYS);
  const D = { reticles: RETICLES, tags: TAGS, lines: LINES, cities: CITIES, labels: makeLabels(wordStarts) };
  return {
    render(t, renderer, octx) {
      const cam = camera.sample(t);
      const camNext = camera.sample(Math.min(t + 0.05, 90));
      const S = state(t, cam, camNext);
      renderer.render(cam, S);
      drawOverlay(octx, cam, t, S, D);
    },
  };
}

export { W, H };
