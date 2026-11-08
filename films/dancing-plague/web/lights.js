// lights.js — light presets + world look for The Dancing Plague (Strasbourg 1518).
// Plain three.js r160 ES module. No Remotion / R3F / GLTF.
//
// LIGHTS.day / LIGHTS.golden are copied EXACTLY from
// upstream-src/templates/bridge/lights.ts (values tuned on renders there).
// LIGHTS.nightblue and LIGHTS.dawn are derived presets designed from them:
//   nightblue — shot 7, the doctor's explanation (dark blue night, cool moonlight).
//   dawn      — shots 8-9, the ban/march and the shrine payoff (pale pink-gold horizon).
// LOOK.day / LOOK.golden are likewise copied exactly from upstream lights.ts;
// LOOK.nightblue / LOOK.dawn are the matching derived world looks.
//
// Field names follow upstream LightPreset exactly so the story agent can use
// every preset uniformly:
//   az, el, lit, shade, lift, lambert, sideK, term,
//   charTint, charShade, charGrad, bodyGrad, sideTint,
//   blob, actorShadow,
//   top, hor, skyCurve, fog, fogNear, fogFar, sunDisc,
//   sunCol, sunI, sky, ground, hemiI, bias, normalBias
// WorldLook: sky { c: 5 stops, e: 5 elevations deg }, water { near, mid, far,
// crest, trough, glint, shade }, bounce, sat, cloud { lit, mid, shade }.
//
// Interpolation (shot 3 grades day -> golden continuously):
//   lerpPreset(a, b, t) / lerpLook(a, b, t) lerp every numeric / colour field
//   (booleans flip at t >= 0.5). world.js setLight(name, t) uses this:
//   setLight('day', t) = day lerped toward golden by t (0 = day, 1 = golden),
//   and world.update(f, 3) does the same automatically over f302-505.

export const LIGHTS = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 25, fogFar: 300, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  // --- derived: nightblue (shot 7) -------------------------------------------
  // Moon high-ish behind the camera side so faces read; very low warm-free light.
  // fogNear/fogFar deliberately tight (15/180) so the courtyard walls close in.
  nightblue: {
    az: 200, el: 38,
    lit: [0.42, 0.52, 0.85], shade: [0.05, 0.06, 0.14], lift: [0.02, 0.03, 0.08], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [0.82, 0.86, 1.0], charShade: 0.7, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.75, 0.78, 0.95],
    blob: [0.2, 0.2, 0.28], actorShadow: false,
    top: "#0b1e3a", hor: "#1c3358", skyCurve: [0.0, 0.4, 0.5], fog: "#16294a", fogNear: 15, fogFar: 180, sunDisc: "#dfe8ff",
    sunCol: "#aebfe8", sunI: 0.9, sky: "#16294a", ground: "#1a2233", hemiI: 0.25,
    bias: -0.00025, normalBias: 0.015,
  },
  // --- derived: dawn (shots 8-9) ----------------------------------------------
  // Pale pink-gold horizon, soft warm sun low ahead (az ~0 = backlight down the
  // shrine path), like golden but paler, cooler top, less saturated.
  dawn: {
    az: 10, el: 9,
    lit: [1.45, 0.95, 0.62], shade: [0.22, 0.2, 0.32], lift: [0.06, 0.06, 0.14], lambert: 0.35, sideK: 0.83, term: 0.12,
    charTint: [1.0, 0.88, 0.76], charShade: 0.87, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.88, 0.84, 0.95],
    blob: [0.68, 0.64, 0.72], actorShadow: true,
    top: "#7a8fc4", hor: "#ffc9a0", skyCurve: [0.05, 0.55, 0.9], fog: "#f2c9a8", fogNear: 30, fogFar: 320, sunDisc: "#ffe0b0",
    sunCol: "#ffd9a8", sunI: 3.2, sky: "#e8d5e0", ground: "#9a7a68", hemiI: 0.5,
    bias: -0.0005, normalBias: 0.025,
  },
};

export const LOOK = {
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    water: { near: "#22a7b6", mid: "#167fb2", far: "#1a5596", crest: "#7ddfe8", trough: "#0e4a80", glint: "#ffffff", shade: [0.5, 0.56, 0.72] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  // --- derived looks (same shape as above; water kept for API parity — this
  // story has no river, so water colours are unused by world.js) --------------
  nightblue: {
    sky: { c: ["#1a2f55", "#16294a", "#101f3d", "#0b1830", "#060f22"], e: [0, 3, 8, 16, 40] },
    water: { near: "#0e223e", mid: "#0c1a30", far: "#081222", crest: "#3a5a8a", trough: "#050a16", glint: "#c8d8ff", shade: [0.3, 0.36, 0.55] },
    cloud: { lit: "#8a9cc4", mid: "#5a6d94", shade: "#33415f" },
    bounce: [0, 0, 0.02],
    sat: 0.9,
  },
  dawn: {
    sky: { c: ["#ffd9b0", "#f7b89a", "#e89a90", "#b98aa8", "#7a7fa8"], e: [0, 4, 10, 20, 40] },
    water: { near: "#7a5a7a", mid: "#5a4a72", far: "#c49a92", crest: "#e8b8a0", trough: "#2a2038", glint: "#ffe8c8", shade: [0.42, 0.44, 0.6] },
    cloud: { lit: "#ffe8d0", mid: "#f2b8a0", shade: "#a98fc4" },
    bounce: [0.03, 0.01, 0.0],
    sat: 1.05,
  },
};

// ---- interpolation helpers (used by world.js setLight / update) -------------
function lerpNum(a, b, t) { return a + (b - a) * t; }
function lerpArr(a, b, t) { return a.map((v, i) => lerpNum(v, b[i], t)); }
// Colour strings: lerp in sRGB hex space via integer channels (good enough for
// a per-frame grade; the sky shader takes the result as a THREE.Color).
function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerpNum((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerpNum((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerpNum(pa & 255, pb & 255, t));
  return "#" + ((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0");
}
function lerpVal(a, b, t) {
  if (Array.isArray(a)) return lerpArr(a, b, t);
  if (typeof a === "number") return lerpNum(a, b, t);
  if (typeof a === "string" && a.startsWith("#")) return lerpHex(a, b, t);
  if (typeof a === "boolean") return t < 0.5 ? a : b;
  return a;
}

/** Lerp two LightPresets field-by-field. Returns a fresh preset object. */
export function lerpPreset(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = lerpVal(a[k], b[k], t);
  return out;
}

/** Lerp two WorldLooks field-by-field. Returns a fresh look object. */
export function lerpLook(a, b, t) {
  return {
    sky: {
      c: a.sky.c.map((c, i) => lerpHex(c, b.sky.c[i], t)),
      e: lerpArr(a.sky.e, b.sky.e, t),
    },
    water: {
      near: lerpHex(a.water.near, b.water.near, t),
      mid: lerpHex(a.water.mid, b.water.mid, t),
      far: lerpHex(a.water.far, b.water.far, t),
      crest: lerpHex(a.water.crest, b.water.crest, t),
      trough: lerpHex(a.water.trough, b.water.trough, t),
      glint: lerpHex(a.water.glint, b.water.glint, t),
      shade: lerpArr(a.water.shade, b.water.shade, t),
    },
    cloud: {
      lit: lerpHex(a.cloud.lit, b.cloud.lit, t),
      mid: lerpHex(a.cloud.mid, b.cloud.mid, t),
      shade: lerpHex(a.cloud.shade, b.cloud.shade, t),
    },
    bounce: lerpArr(a.bounce, b.bounce, t),
    sat: lerpNum(a.sat, b.sat, t),
  };
}
