// world.js — Strasbourg 1518 world for The Dancing Plague.
// Plain three.js r160 ES module. Procedural geometry + CanvasTexture painted
// textures only: no GLTF, no Kenney kits, no Remotion. Adapted from
// upstream-src/templates/bridge/{world,build,paint,shade}.ts (READ-ONLY refs):
//   - two-tone shading (shade.ts): albedo x mix(shadeCol, litCol, sunTerm),
//     sunTerm = shadow-map visibility x a soft N.L terminator, lit/shade/lift
//     multipliers from LIGHTS; implemented here as MeshLambertMaterial +
//     onBeforeCompile (same LFB shadow-capture trick as upstream).
//   - painted textures (paint.ts): HD Canvas2D, seams painted in as dark
//     tints, per-tile colour jitter, saturation -35% from "storybook".
//   - albedo discipline: muted brick / cream / ochre / terracotta walls,
//     warm grey-beige stone, ochre wood, iron dark + desaturated.
//     Never lemon, never lavender lit faces.
//
// Import map (provided by the harness): `import * as THREE from 'three'`
// resolves to three r160 in node_modules/three.

import * as THREE from "three";
import { LIGHTS, LOOK, lerpPreset, lerpLook } from "./lights.js";

// ---------------------------------------------------------------- LAYOUT ----
export const LAYOUT = {
  street: { axis: "z", width: 8 },
  square: { center: [0, 0, 0], size: 30 },
  stage: { pos: [0, 0, -12], w: 6, h: 1.2 },
  shrine: { pos: [18, 4, -38] },
  courtyard: { pos: [-14, 0, -20] },
  houses: "x=±6..±12",
};

// ------------------------------------------------- camera-relative sun -------
/** Sun direction from upstream az/el, camera-relative and frozen per shot:
 *  az = degrees from the shot camera's forward axis (0 = sun straight ahead =
 *  backlight, +90 = screen right, 180 = behind camera), el = elevation deg.
 *  Same rotation as upstream world.ts shotSun(). The story agent calls this
 *  per shot and positions sunLight at focus + dir * 220, target = focus. */
export function sunDirFromAzEl(az, el, camera) {
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  let fx = fwd.x, fz = fwd.z;
  const n = Math.hypot(fx, fz) || 1;
  fx /= n; fz /= n;
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  const hx = fx * Math.cos(a) - fz * Math.sin(a);
  const hz = fz * Math.cos(a) + fx * Math.sin(a);
  return new THREE.Vector3(hx * Math.cos(e), Math.sin(e), hz * Math.cos(e)).normalize();
}

// ------------------------------------------------------------- painters ------
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const texCache = new Map();
function ctex(key, w, h, draw) {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  draw(cv.getContext("2d"), rng(key.length * 131 + key.charCodeAt(0)));
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const U = (r, a, b) => a + (b - a) * r();
const TAU = Math.PI * 2;
function jitHex(r, hex, dv = 0.1, dh = 5, ds = 0.15) {
  const c = new THREE.Color(hex), hsl = {};
  c.getHSL(hsl);
  const k = (a) => 1 + (r() * 2 - 1) * a;
  c.setHSL(((hsl.h + ((r() * 2 - 1) * dh) / 360) % 1 + 1) % 1,
    Math.min(1, hsl.s * k(ds)), Math.min(0.97, hsl.l * k(dv)));
  return "#" + c.getHexString();
}

function cobbleTex() {
  return ctex("cobbleHD", 1024, 1024, (g, r) => {
    const S = 1024, N = 24, CH = S / N, J = 4;
    g.fillStyle = "#867967"; g.fillRect(0, 0, S, S);
    const cols = ["#c4b6a0", "#b8aa93", "#cdc1ab", "#af9f88", "#c7baa3", "#bdb19b", "#b8ad9c"];
    // Seamless in x: every sett is also drawn one tile over when it crosses an edge.
    const drawSett = (X, Y, W, H, col) => {
      for (const ox of [0, -S, S]) {
        const x = X + ox;
        if (x + W < 0 || x > S) continue;
        g.fillStyle = col;
        g.beginPath(); g.roundRect(x, Y, W, H, 9); g.fill();
        const gr = g.createLinearGradient(x, Y, x + W * 0.6, Y + H);
        gr.addColorStop(0, "rgba(255,250,240,0.20)"); gr.addColorStop(0.5, "rgba(255,250,240,0)");
        gr.addColorStop(1, "rgba(70,58,45,0.16)");
        g.fillStyle = gr;
        g.beginPath(); g.roundRect(x, Y, W, H, 9); g.fill();
      }
    };
    for (let row = 0; row < N; row++) {
      const y = row * CH;
      let x = U(r, 0, 40);
      while (x < S) {
        const w = U(r, 36, 54);
        drawSett(x + J / 2, y + J / 2, w - J, CH - J, jitHex(r, pick(r, cols), 0.1, 6, 0.2));
        x += w;
      }
    }
    for (let i = 0; i < 40; i++) { // damp / worn patches
      const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 60, 200);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(90,70,48,0.10)"); gr.addColorStop(1, "rgba(90,70,48,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
}
function stoneTex(key, cols, mortar) {
  return ctex(key, 1024, 1024, (g, r) => {
    const S = 1024, RH = 128, J = 7;
    g.fillStyle = mortar; g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / RH; row++) {
      const y = row * RH;
      let x = (row % 2) * 140;
      while (x < S) {
        const w = U(r, 200, 360);
        g.fillStyle = jitHex(r, pick(r, cols), 0.1, 5, 0.18);
        g.fillRect(x + J / 2, y + J / 2, w - J, RH - J);
        g.fillStyle = "rgba(255,252,245,0.22)"; g.fillRect(x + J / 2 + 3, y + J / 2, w - J - 6, 6);
        g.fillStyle = "rgba(70,55,45,0.14)"; g.fillRect(x + J / 2 + 3, y + RH - J / 2 - 5, w - J - 6, 5);
        x += w;
      }
    }
  });
}
function planksTex() {
  // Stage deck: transverse ochre boards, near-black seams painted in.
  return ctex("planksHD", 1024, 1024, (g, r) => {
    const S = 1024, B = 128, GAP = 10;
    const fills = ["#c99669", "#c18e64", "#d19f6e", "#bb8961", "#c69466", "#c79b6f"];
    for (let i = 0; i < 8; i++) {
      const y = i * B;
      g.fillStyle = jitHex(r, pick(r, fills), 0.05, 3, 0.08);
      g.fillRect(0, y, S, B);
      g.strokeStyle = "rgba(95,48,18,0.3)"; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const gy = y + U(r, 16, B - 16);
        g.beginPath(); g.moveTo(0, gy);
        g.bezierCurveTo(340, gy + 4, 680, gy - 4, S, gy); g.stroke();
      }
      g.fillStyle = "rgba(255,238,200,0.35)"; g.fillRect(0, y + GAP / 2 + 1, S, 3);
      const jx = U(r, 90, S - 90);
      g.fillStyle = "#24110a"; g.fillRect(jx - 3, y, 7, B);
      for (const nx of [jx - 24, jx + 24]) for (const f of [0.28, 0.72]) {
        g.fillStyle = "#22140c"; g.beginPath(); g.arc(nx, y + B * f, 4, 0, TAU); g.fill();
      }
    }
    for (let i = 0; i <= 8; i++) {
      g.fillStyle = "rgba(40,18,8,0.6)"; g.fillRect(0, i * B - GAP / 2 - 3, S, GAP + 6);
      g.fillStyle = "#1c0c05"; g.fillRect(0, i * B - GAP / 2, S, GAP);
    }
  });
}
function grassTex() {
  return ctex("grassHD", 1024, 1024, (g, r) => {
    const S = 1024;
    g.fillStyle = "#73b23d"; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 16; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), rad = U(r, 120, 320), light = r() > 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, light ? "rgba(140,198,80,0.35)" : "rgba(92,154,48,0.35)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.lineWidth = 2; g.lineCap = "round";
    for (let i = 0; i < 1400; i++) {
      const x = U(r, 0, S), y = U(r, 0, S), h = U(r, 7, 16);
      g.strokeStyle = r() < 0.4 ? "rgba(165,218,98,0.35)" : "rgba(78,138,38,0.45)";
      g.beginPath(); g.moveTo(x - 3, y - h); g.lineTo(x, y); g.lineTo(x + 3, y - h * 0.8); g.stroke();
    }
  });
}
function roofTex(col) {
  return ctex("roofHD" + col, 1024, 1024, (g, r) => {
    const S = 1024, C = 64, TW = 77;
    g.fillStyle = col; g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / C; row++) {
      const y = row * C, off = (row % 2) * TW / 2;
      for (let i = 0; i < Math.ceil(S / TW) + 1; i++) {
        const x = i * TW - off, tone = U(r, -1, 1);
        g.fillStyle = tone > 0 ? `rgba(255,240,225,${0.10 * tone})` : `rgba(60,25,20,${-0.10 * tone})`;
        g.fillRect(x, y, TW, C);
        g.fillStyle = "rgba(60,25,20,0.22)"; g.fillRect(x, y, 2, C);
      }
      g.fillStyle = "rgba(255,235,220,0.22)"; g.fillRect(0, y + C - 9, S, 3);
      g.fillStyle = "rgba(55,22,18,0.32)"; g.fillRect(0, y + C - 5, S, 5);
    }
  });
}
function beamTex() {
  return ctex("beamHD", 512, 512, (g, r) => {
    g.fillStyle = "#a8743f"; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = "rgba(85,48,20,0.16)"; g.lineWidth = 2.5;
    for (let i = 0; i < 22; i++) {
      const y = r() * 512;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + 5, 340, y - 5, 512, y); g.stroke();
    }
  });
}
// Painted facade, 48 px/m: plaster or brick, timber frame, shuttered windows,
// arched door centre ground floor, stone plinth. Seams / joints are dark tints.
function facadeTex(key, wm, hm, st) {
  const PX = 48, W = Math.round(wm * PX), H = Math.round(hm * PX);
  return ctex("facHD" + key, W, H, (g, r) => {
    if (st.brick) {
      g.fillStyle = "#e9d3b4"; g.fillRect(0, 0, W, H);
      const bw = 0.25 * PX, bh = 0.085 * PX;
      for (let y = 0, row = 0; y < H; y += bh, row++) {
        for (let x = -(row % 2) * bw / 2; x < W; x += bw) {
          g.fillStyle = jitHex(r, pick(r, ["#c0583a", "#b44f35", "#c8643f", "#a94a33", "#cf6e45"]), 0.24, 6, 0.15);
          g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        }
      }
    } else {
      g.fillStyle = st.wall; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 24; i++) {
        g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},.05)`;
        g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 40, 10 + r() * 20, 0, 0, TAU); g.fill();
      }
    }
    const floors = Math.max(1, Math.floor(hm / 2.8));
    const nWin = Math.max(1, Math.floor(wm / 2.2));
    g.fillStyle = "rgba(70,55,45,0.28)"; g.fillRect(0, H - 0.45 * PX, W, 0.45 * PX); // plinth
    if (st.timber) {
      g.fillStyle = "#5b3a24";
      const t = 0.18 * PX;
      g.fillRect(0, 0, t, H); g.fillRect(W - t, 0, t, H); g.fillRect(0, 0, W, t);
      for (let fl = 1; fl < floors; fl++) g.fillRect(0, H - fl * 2.8 * PX - t / 2, W, t);
      for (let i = 1; i < nWin; i++) g.fillRect((i * W) / nWin - t / 2, 0, t, H - 2.8 * PX);
    }
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < nWin; i++) {
      const cx = ((i + 0.5) * W) / nWin, by = H - (fl * 2.8 + 0.9) * PX;
      if (fl === 0 && i === Math.floor(nWin / 2)) {
        const dw = 1.1 * PX, dh = 2.1 * PX;
        g.fillStyle = "#e9e2d4";
        g.beginPath(); g.moveTo(cx - dw / 2 - 5, H); g.lineTo(cx - dw / 2 - 5, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2 + 5, Math.PI, 0); g.lineTo(cx + dw / 2 + 5, H); g.fill();
        g.fillStyle = "#7a4a2c";
        g.beginPath(); g.moveTo(cx - dw / 2, H); g.lineTo(cx - dw / 2, H - dh + dw / 2);
        g.arc(cx, H - dh + dw / 2, dw / 2, Math.PI, 0); g.lineTo(cx + dw / 2, H); g.fill();
        g.strokeStyle = "rgba(40,25,15,0.7)"; g.lineWidth = 2; g.stroke();
        g.fillStyle = "#d9b04a"; g.beginPath(); g.arc(cx + dw / 3, H - dh / 2, 3.5, 0, TAU); g.fill();
        continue;
      }
      const ww = 0.85 * PX, wh = 1.25 * PX, x0 = cx - ww / 2, y0 = by - wh, tr = 0.08 * PX, sw = 0.45 * PX;
      for (const sx of [x0 - tr - sw - 1, x0 + ww + tr + 1]) {
        g.fillStyle = st.shutter; g.fillRect(sx, y0, sw, wh);
        g.fillStyle = "rgba(0,0,0,0.22)";
        for (let ly = y0 + 3; ly < y0 + wh - 2; ly += 3) g.fillRect(sx + 2, ly, sw - 4, 1);
        g.strokeStyle = "rgba(40,30,40,0.55)"; g.lineWidth = 1.5; g.strokeRect(sx, y0, sw, wh);
      }
      g.fillStyle = "#f7f2e8"; g.fillRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      const gl = g.createLinearGradient(0, y0, 0, y0 + wh);
      gl.addColorStop(0, "#8d9cdb"); gl.addColorStop(1, "#5761a8");
      g.fillStyle = gl; g.fillRect(x0, y0, ww, wh);
      if (r() < 0.35) {
        g.fillStyle = pick(r, ["#f5c4c8", "#f3e3c6", "#d7e6cf"]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + ww * 0.42, y0); g.lineTo(x0, y0 + wh * 0.75); g.fill();
        g.beginPath(); g.moveTo(x0 + ww, y0); g.lineTo(x0 + ww * 0.58, y0); g.lineTo(x0 + ww, y0 + wh * 0.75); g.fill();
      }
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.save(); g.beginPath(); g.rect(x0, y0, ww, wh); g.clip();
      g.translate(x0 + ww * 0.3, y0 + wh * 0.5); g.rotate(Math.PI / 4);
      g.fillRect(-2, -wh, 4, wh * 2); g.restore();
      g.fillStyle = "#f7f2e8";
      g.fillRect(cx - 1, y0, 2, wh); g.fillRect(x0, y0 + wh * 0.45 - 1, ww, 2);
      g.strokeStyle = "rgba(60,45,40,0.6)"; g.lineWidth = 1.5;
      g.strokeRect(x0 - tr, y0 - tr, ww + 2 * tr, wh + 2 * tr);
      g.fillStyle = "#ebe3d4"; g.fillRect(x0 - tr - 3, by + tr, ww + 2 * tr + 6, 3.5); // sill
    }
  });
}
function cloudTex(seed, pal) {
  return ctex(`cloudHD_${pal.lit}_${seed}`, 1024, 512, (g) => {
    const r = rng(seed * 7919 + 17), W = 1024, base = 400;
    const n = 6 + Math.floor(r() * 4), lobes = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, rad = (60 + 110 * Math.sin(Math.PI * t) ** 0.8) * U(r, 0.75, 1.15);
      lobes.push({ x: 150 + t * 724 + U(r, -30, 30), y: base - rad * U(r, 0.35, 0.65), r: rad });
    }
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const t = U(r, 0.25, 0.75), rad = U(r, 60, 110);
      lobes.push({ x: 150 + t * 724, y: base - 150 - rad * U(r, 0.3, 0.7), r: rad });
    }
    const layer = (dx, dy, k, col, blur) => {
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
      for (const l of lobes) {
        const x = l.x + dx * l.r, y = l.y + dy * l.r;
        g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU);
      }
      g.fill(); g.restore();
    };
    layer(0, 0, 1.0, pal.shade, 6);
    layer(-0.04, -0.12, 0.9, pal.mid, 8);
    layer(-0.1, -0.26, 0.72, pal.lit, 10);
    g.globalCompositeOperation = "destination-in";
    const m = g.createLinearGradient(0, base - 18, 0, base + 6);
    m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = m; g.fillRect(0, 0, W, 512);
    g.globalCompositeOperation = "source-over";
  });
}
function awningTex(stripe) {
  return ctex("awning" + stripe, 256, 256, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? "#efe6d2" : stripe;
      g.fillRect(i * 32, 0, 32, 256);
    }
    g.fillStyle = "rgba(70,50,30,0.15)"; g.fillRect(0, 240, 256, 16);
  });
}
function bannerTex() {
  // Muted crimson gonfalon, ochre border + gold diamond (stage backdrop).
  return ctex("bannerStage", 256, 512, (g) => {
    const W = 256, H = 512;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#b8553a"); gr.addColorStop(1, "#a04a32");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#d1aa5c"; g.lineWidth = 9; g.strokeRect(20, 66, W - 40, H - 86);
    g.fillStyle = "#efe2c2"; g.beginPath(); g.arc(W / 2, 200, 55, 0, TAU); g.fill();
    g.fillStyle = "#d1aa5c";
    g.beginPath(); g.moveTo(W / 2, 154); g.lineTo(W / 2 + 34, 200); g.lineTo(W / 2, 246); g.lineTo(W / 2 - 34, 200); g.closePath(); g.fill();
  });
}

// ------------------------------------------------------- two-tone shading ---
// Shared uniforms, set once per frame from the active LightPreset (world.js
// setLight). Same values as upstream shade.ts TONE.
const TONE = {
  uLitCol: { value: new THREE.Vector3(1.5, 1.44, 1.32) },
  uShadeCol: { value: new THREE.Vector3(0.6, 0.58, 0.86) },
  uShadeLift: { value: new THREE.Vector3() },
  uLambert: { value: 0.35 }, uSideK: { value: 0.84 }, uTerm: { value: 0.2 },
  uBounce: { value: new THREE.Vector3() },
  uSat: { value: 1 },
};
const TWO_TONE_DECL = "#include <common>\nuniform vec3 uLitCol; uniform vec3 uShadeCol; uniform vec3 uShadeLift; uniform float uLambert; uniform float uSideK; uniform float uTerm; uniform vec3 uBounce; uniform float uSat;";
const TWO_TONE = /* glsl */ `
#if NUM_DIR_LIGHTS > 0
{
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float ndl = max( dot( geometryNormal, sunV ), 0.0 );
  float sunTerm = sunVis * smoothstep( 0.0, uTerm, ndl );
  float skyK = mix( uSideK, 1.0, 0.5 + 0.5 * dot( geometryNormal, upV ) );
  vec3 lit = uLitCol * mix( 1.0, ndl, uLambert );
  float facing = max( dot( geometryNormal, geometryViewDir ), 0.0 );
  vec3 alb = max( mix( vec3( dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ), diffuseColor.rgb, uSat ), 0.0 );
  reflectedLight.directDiffuse = alb * ( mix( uShadeCol, lit, sunTerm ) * skyK + uBounce * facing * clamp( 1.0 - dot( geometryNormal, upV ), 0.0, 1.0 ) * ( 1.0 - sunTerm ) )
    + uShadeLift * LIFT_K * ( 1.0 - sunTerm );
  reflectedLight.indirectDiffuse = vec3( 0.0 );
}
#endif
`;
/** Lambert -> two-tone (upstream shade.ts twoTone, r160). If the r160
 *  lights chunk ever changes shape the LFB capture falls back to sunVis = 1
 *  (form shading only, no cast-shadow term) instead of breaking the build. */
function twoTone(m, liftK = 1) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TONE);
    const raw = THREE.ShaderChunk.lights_fragment_begin;
    const patched = raw
      .replace("directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]",
        "sunVis = ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]")
      .replace("vDirectionalShadowCoord[ i ] ) : 1.0;",
        "vDirectionalShadowCoord[ i ] ) : 1.0;\n\t\tdirectLight.color *= sunVis;");
    const lfb = patched.includes("directLight.color *= sunVis") ? patched : raw;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", TWO_TONE_DECL + `\n#define LIFT_K ${liftK.toFixed(3)}`)
      .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + lfb)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + TWO_TONE);
  };
  m.customProgramCacheKey = () => "twoTone5_" + liftK.toFixed(3);
  return m;
}
const matCache = new Map();
function lam(key, make) {
  let m = matCache.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); matCache.set(key, m); }
  return m;
}

// ------------------------------------------------------------- builders ------
const STYLES = [
  { wall: "#ecdab2", shutter: "#3f6fb5", roof: "#d27a62" },
  { wall: "#d8a95f", shutter: "#2f6a43", roof: "#b8644f" },
  { wall: "#c47a5c", shutter: "#2f5f6a", roof: "#8f97a8" },
  { wall: "#efdcb8", shutter: "#2f5f6a", roof: "#c9775a", timber: true },
  { wall: "#ddbd78", shutter: "#5a3b2a", roof: "#d27a62" },
  { wall: "#cc9a6c", shutter: "#3f6fb5", roof: "#8e7aa0" },
  { wall: "#e2c49a", shutter: "#8c3b4a", roof: "#c9775a" },
  { wall: "#e3d2b8", shutter: "#2f6a43", roof: "#8f97a8", brick: true },
];
const HEIGHTS = [7, 8.4, 9.8];

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Quad from 4 corners (counter-clockwise from front), with uv tiling.
function quad(a, b, c, d, mat, u = 1, v = 1) {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute(
    [a, b, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(
    [0, 1, 2, 3, 4, 5].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function tri(a, b, c, mat) {
  const g = new THREE.BufferGeometry();
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c].flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 2].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Gabled timber-framed house, front (facade + door) on local +z.
 *  Centre at (x, 0, z), yaw rotates the front. Walls sit on a stone plinth,
 *  cornice under the eaves, chimney + pot. All meshes userData.occluder=true
 *  (see cullForCamera). */
function makeHouse(x, z, yaw, w, d, h, si) {
  const st = STYLES[si % STYLES.length];
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = yaw;
  const front = lam(`hf${si}_${w}_${h}`, () => ({ map: facadeTex(`hf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`hs${si}_${h}`, () => ({ map: facadeTex(`hs${si}_${h}`, 8, h, st) }));
  const wallM = lam("wall" + st.wall, () => ({ color: st.brick ? "#c8643f" : st.wall }));
  const roofM = lam("roof" + st.roof, () => ({ map: roofTex(st.roof), side: THREE.DoubleSide }));
  const trimM = lam("trimStone", () => ({ color: "#efe3c8" }));
  const plinthM = lam("plinth", () => ({ map: stoneTex("copeHD", ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], "#a99982") }));
  const chimM = lam("chim", () => ({ color: "#b0603f" }));
  const hw = w / 2, hd = d / 2, rh = d * 0.42, o = 0.35;
  grp.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd), front));
  grp.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd), side));
  grp.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd), side));
  grp.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd), side));
  grp.add(tri(V(-hw, h, -hd), V(-hw, h, hd), V(-hw, h + rh, 0), wallM));
  grp.add(tri(V(hw, h, hd), V(hw, h, -hd), V(hw, h + rh, 0), wallM));
  const ru = (w + 2 * o) / 4, rv = Math.hypot(hd + o, rh) / 4;
  grp.add(quad(V(-hw - o, h - 0.25, hd + o), V(hw + o, h - 0.25, hd + o), V(hw + o, h + rh, 0), V(-hw - o, h + rh, 0), roofM, ru, rv));
  grp.add(quad(V(hw + o, h - 0.25, -hd - o), V(-hw - o, h - 0.25, -hd - o), V(-hw - o, h + rh, 0), V(hw + o, h + rh, 0), roofM, ru, rv));
  // relief: plinth, cornice, door step + hood, chimney + cap + pot
  grp.add(box(w + 0.14, 0.45, d + 0.14, plinthM, 0, 0.2, 0));
  grp.add(box(w + 0.24, 0.27, 0.17, trimM, 0, h - 0.38, hd + 0.08));
  grp.add(box(w + 0.24, 0.27, 0.17, trimM, 0, h - 0.38, -hd - 0.08));
  grp.add(box(1.64, 0.2, 0.5, plinthM, 0, 0.1, hd + 0.25)); // door step
  grp.add(box(1.56, 0.14, 0.34, trimM, 0, 2.37, hd + 0.17)); // door hood
  const chx = hw * 0.45 * (si % 2 ? 1 : -1), cz = -hd * 0.35, top = h + rh + 1.1;
  grp.add(box(0.8, 1.1 + rh * 0.3, 0.8, chimM, chx, h + rh * 0.3 + 0.55, cz));
  grp.add(box(1.04, 0.16, 1.04, trimM, chx, top + 0.08, cz));
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.42, 10),
    lam("chimPot", () => ({ color: "#b8684a" })));
  pot.position.set(chx, top + 0.37, cz); pot.castShadow = true;
  grp.add(pot);
  grp.traverse((m) => { if (m.isMesh) m.userData.occluder = true; });
  return grp;
}

/** Market stall: 4 posts, counter, striped awning, goods. `lute=true` leans
 *  a lute against the counter (the "no music" joke prop, shot 2) — untouched. */
function makeStall(x, z, yaw, stripe, lute) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = yaw;
  const woodM = lam("stallWood", () => ({ map: beamTex() }));
  const awnM = lam("awn" + stripe, () => ({ map: awningTex(stripe), side: THREE.DoubleSide }));
  const clothM = lam("stallCloth", () => ({ color: "#d8cbb2" }));
  for (const [px, pz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]])
    grp.add(box(0.12, 2.4, 0.12, woodM, px, 1.2, pz));
  grp.add(box(2.4, 0.5, 1.4, woodM, 0, 0.75, 0)); // counter
  grp.add(box(2.6, 0.08, 1.6, clothM, 0, 1.04, 0)); // counter top
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.9), awnM);
  awn.rotation.x = -Math.PI / 2 + 0.18; awn.position.set(0, 2.5, 0.1);
  awn.castShadow = true; grp.add(awn);
  // goods: bread loaves, apples, cloth bundles (muted, desaturated)
  const goods = [
    ["#c98f4a", 0.16], ["#b8644f", 0.13], ["#8a9a4a", 0.12], ["#d8b96a", 0.14],
  ];
  const r = rng(Math.floor(Math.abs(x * 31 + z * 17)) + 5);
  for (let i = 0; i < 10; i++) {
    const [c, s] = goods[i % goods.length];
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8),
      lam("good" + c, () => ({ color: c })));
    m.position.set(U(r, -1, 1), 1.12 + s * 0.7, U(r, -0.55, 0.55));
    m.scale.y = 0.75; m.castShadow = true;
    grp.add(m);
  }
  if (lute) {
    const luteGrp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10),
      lam("luteBody", () => ({ color: "#a8763e" })));
    body.scale.set(1, 1.25, 0.45);
    const neck = box(0.07, 0.75, 0.05, lam("luteNeck", () => ({ color: "#6e4a30" })), 0, 0.62, 0);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12),
      new THREE.MeshBasicMaterial({ color: "#2a1a10" }));
    hole.position.set(0, 0.05, 0.13);
    luteGrp.add(body, neck, hole);
    luteGrp.position.set(1.35, 0.42, 0.85);
    luteGrp.rotation.set(-0.35, 0.3, 0.25);
    luteGrp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    grp.add(luteGrp);
  }
  return grp;
}

/** Cartoon tree: tapered trunk + 3-4 smooth leaf lobes (no Kenney kit). */
function makeTree(x, z, h, seed) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  const r = rng(seed);
  const bark = lam("bark", () => ({ color: "#8f5d3b" }));
  const leafCols = ["#5aa83c", "#4c9a37", "#69b545", "#55a243"];
  const leaf = lam("leaf" + leafCols[seed % 4], () => ({ color: leafCols[seed % 4] }));
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * h * 0.18, 0.22 * h * 0.18, h * 0.45, 8), bark);
  trunk.position.y = h * 0.22; trunk.castShadow = true;
  grp.add(trunk);
  const lobes = [
    [0, h * 0.62, 0, h * 0.26], [h * 0.16, h * 0.52, h * 0.08, h * 0.19],
    [-h * 0.15, h * 0.55, -h * 0.06, h * 0.18], [0, h * 0.78, 0, h * 0.17],
  ];
  for (const [lx, ly, lz, lr] of lobes) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(lr, 14, 10), leaf);
    m.position.set(lx + U(r, -0.05, 0.05) * h, ly, lz + U(r, -0.05, 0.05) * h);
    m.scale.y = 0.85; m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
  }
  return grp;
}
function makeBush(x, z, s, seed) {
  const leafCols = ["#5aa83c", "#4c9a37", "#69b545"];
  const m = new THREE.Mesh(new THREE.SphereGeometry(s, 12, 9),
    lam("bush" + leafCols[seed % 3], () => ({ color: leafCols[seed % 3] })));
  m.position.set(x, s * 0.55, z);
  m.scale.y = 0.75; m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------ buildWorld -----
export function buildWorld() {
  const group = new THREE.Group();
  group.name = "strasbourg1518";
  const banners = [];   // waving cloth (stage banner)
  const flames = [];    // candle flames (flicker in update)
  const clouds = [];    // Sprite list (drift in update, palette in setLight)

  // ---- lights ------------------------------------------------------------
  const hemiLight = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
  const sunLight = new THREE.DirectionalLight("#fff3e0", 2.8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 20; sc.far = 480;
  sunLight.shadow.bias = -0.00025; sunLight.shadow.normalBias = 0.015;
  group.add(hemiLight, sunLight, sunLight.target);

  // ---- sky dome: 5-stop gradient by elevation (upstream lights.ts LOOK) ---
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() },
      c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() },
      c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
      void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
        vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
        c = mix(c, c2, smoothstep(e.x, e.y, el));
        c = mix(c, c3, smoothstep(e.y, e.z, el));
        c = mix(c, c4, smoothstep(e.z, e.w, el));
        gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
  sky.renderOrder = -1; sky.frustumCulled = false;
  group.add(sky);

  // ---- sun disc + halo (sprites; disc hidden in day: sunDisc "#000000") ---
  const discTex = ctex("sunDisc", 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const haloTex = ctex("sunHalo", 256, 256, (g) => {
    const im = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const u = Math.hypot(x - 127.5, y - 127.5) / 128;
      const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
      const i = (y * 256 + x) * 4;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
    g.putImageData(im, 0, 0);
  });
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex, fog: false, depthWrite: false }));
  const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  sunDisc.renderOrder = -0.5; sunHalo.renderOrder = 5;
  sunDisc.frustumCulled = sunHalo.frustumCulled = false;
  group.add(sunDisc, sunHalo);

  // ---- fog (owned here; story agent assigns scene.fog = world.fog, or
  // calls world.attach(scene)) ---------------------------------------------
  const fog = new THREE.Fog("#b8d0ec", 25, 300);
  let attachedScene = null;

  // ---- ground -------------------------------------------------------------
  const grassM = lam("groundGrass", () => ({ map: grassTex() }));
  grassM.map.repeat.set(48, 48);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), grassM);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  const cobbleM = lam("groundCobble", () => ({ map: cobbleTex() }));
  cobbleM.map.repeat.set(4, 12);
  // One cobble sheet covers square (30 x 30) + street (8 wide, z -45..45):
  // 30 wide x 90 long, no overlapping planes, no z-fighting.
  const cobbles = new THREE.Mesh(new THREE.PlaneGeometry(30, 90), cobbleM);
  cobbles.rotation.x = -Math.PI / 2; cobbles.position.y = 0.01;
  cobbles.receiveShadow = true;
  group.add(cobbles);
  // Dirt/cobble path: square -> shrine hill (axis-aligned, two runs).
  const pathM = lam("pathCobble", () => ({ map: cobbleTex() }));
  for (const [w, d, x, z] of [[3, 18, 14, -27], [5, 3, 16, -36]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathM);
    p.rotation.x = -Math.PI / 2; p.position.set(x, 0.008, z);
    p.receiveShadow = true;
    group.add(p);
  }
  // Rolling green/brown ground beyond the town (kept clear of street/square
  // camera lanes: all hills sit outside |x| < 40 or |z| < 55).
  const hillCols = ["#6a9a4e", "#5f8f47", "#7aa653"];
  const hillGeo = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z, sx, sy, sz, ci] of [
    [-120, 90, 90, 22, 70, 0], [110, 120, 100, 28, 80, 1], [160, -40, 80, 20, 70, 2],
    [-150, -80, 95, 24, 75, 1], [90, -200, 120, 18, 90, 0], [-60, 150, 100, 24, 80, 2],
  ]) {
    const h = new THREE.Mesh(hillGeo, lam("hill" + ci, () => ({ color: hillCols[ci] })));
    h.position.set(x, -0.5, z); h.scale.set(sx, sy, sz);
    h.receiveShadow = true;
    group.add(h);
  }

  // ---- houses: both sides of the street, fronts at x = +/-6, backs +/-12 --
  const slots = [-28, -20, -12, -4, 4, 12, 20, 28];
  slots.forEach((z, i) => {
    for (const s of [-1, 1]) {
      if (s === -1 && z === -20) continue; // west z=-20 is the doctor's courtyard
      const w = 7, d = 6;
      group.add(makeHouse(s * (6 + d / 2), z, s > 0 ? -Math.PI / 2 : Math.PI / 2,
        w, d, HEIGHTS[(i + (s > 0 ? 1 : 0)) % 3], (i * 2 + (s > 0 ? 1 : 0)) % 8));
    }
  });

  // ---- market stalls at the square edges (lute on the west stall) ---------
  group.add(makeStall(-12, 8, Math.PI / 2, "#b8553a", true));
  group.add(makeStall(12, 4, -Math.PI / 2, "#4f8a5a", false));
  group.add(makeStall(-12, -2, Math.PI / 2, "#4f8a5a", false));
  group.add(makeStall(12, 12, -Math.PI / 2, "#b8553a", false));

  // ---- stage (0, 0, -12): 6 m wide, 1.2 m high, facing +z -----------------
  const stage = new THREE.Group();
  stage.position.set(0, 0, -12);
  const plankM = lam("stagePlanks", () => ({ map: planksTex() }));
  const stageSideM = lam("stageBeam", () => ({ map: beamTex() }));
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 4),
    [stageSideM, stageSideM, plankM, stageSideM, stageSideM, stageSideM]);
  deck.position.y = 0.6; deck.castShadow = true; deck.receiveShadow = true;
  stage.add(deck);
  const postM = lam("stagePost", () => ({ map: beamTex() }));
  for (const [px, pz] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]])
    stage.add(box(0.18, 3.2, 0.18, postM, px, 1.2 + 1.6, pz));
  // backdrop: plank wall + waving gonfalon banner
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6),
    lam("stageBack", () => ({ map: planksTex() })));
  back.position.set(0, 1.2 + 1.3, -1.95); back.castShadow = true;
  stage.add(back);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0),
    new THREE.MeshLambertMaterial({ map: bannerTex(), side: THREE.DoubleSide }));
  twoTone(banner.material);
  banner.position.set(0, 2.9, -1.88); banner.castShadow = true;
  banner.userData.baseRotZ = 0;
  stage.add(banner);
  banners.push(banner);
  stage.add(box(0.9, 0.2, 0.5, stageSideM, 0, 0.1, 2.25)); // step
  stage.add(box(1.4, 0.2, 0.5, stageSideM, 0, 0.1, 2.7));
  group.add(stage);

  // ---- shrine hill (18, 4, -38): chapel + candles + clear steps -----------
  const hillM = lam("shrineHill", () => ({ color: "#6aa24e" }));
  const shrineHill = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), hillM);
  shrineHill.position.set(18, 0, -38); shrineHill.scale.set(11, 4.2, 9);
  shrineHill.receiveShadow = true;
  group.add(shrineHill);
  const shrine = new THREE.Group();
  shrine.position.set(18, 4.0, -38);
  const chapelM = lam("chapelWall", () => ({ color: "#e9e0cc" }));
  const slateM = lam("chapelRoof", () => ({ map: roofTex("#8f97a8"), side: THREE.DoubleSide }));
  shrine.add(box(3.2, 2.6, 2.6, chapelM, 0, 1.3, 0));
  shrine.add(quad(V(-1.75, 2.6, 1.45), V(1.75, 2.6, 1.45), V(1.75, 3.9, 0), V(-1.75, 3.9, 0), slateM, 1, 1));
  shrine.add(quad(V(1.75, 2.6, -1.45), V(-1.75, 2.6, -1.45), V(-1.75, 3.9, 0), V(1.75, 3.9, 0), slateM, 1, 1));
  shrine.add(tri(V(-1.6, 2.6, 1.3), V(1.6, 2.6, 1.3), V(0, 3.9, 1.3), chapelM));
  shrine.add(tri(V(1.6, 2.6, -1.3), V(-1.6, 2.6, -1.3), V(0, 3.9, -1.3), chapelM));
  // arched door on the west face (faces the square / the march path)
  const doorM = new THREE.MeshBasicMaterial({ color: "#2a1a10" });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), doorM);
  door.position.set(-1.61, 1.0, 0); door.rotation.y = -Math.PI / 2;
  shrine.add(door);
  const winM = new THREE.MeshBasicMaterial({ color: "#5761a8" });
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), winM);
  win.position.set(-1.61, 2.0, 0); win.rotation.y = -Math.PI / 2;
  shrine.add(win);
  const crossM = lam("chapelCross", () => ({ color: "#6e4a30" }));
  shrine.add(box(0.1, 0.7, 0.1, crossM, 0, 4.2, 0));
  shrine.add(box(0.45, 0.1, 0.1, crossM, 0, 4.35, 0));
  // candles on a stone ledge beside the door (flames flicker in update)
  const ledge = box(0.5, 0.12, 1.6, lam("shrineStone", () => ({ map: stoneTex("copeHD", ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], "#a99982") })), -1.9, 0.35, 0.9);
  shrine.add(ledge);
  const candleM = lam("candle", () => ({ color: "#efe6cc" }));
  for (let i = 0; i < 4; i++) {
    const cz = 0.35 + i * 0.38;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.28, 8), candleM);
    c.position.set(-1.9, 0.55, cz); c.castShadow = true;
    shrine.add(c);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8),
      new THREE.MeshBasicMaterial({ color: "#ffb347" }));
    fl.position.set(-1.9, 0.76, cz);
    shrine.add(fl);
    flames.push(fl);
  }
  group.add(shrine);
  // Steps down the west side of the hill. CLEAR STEP SPACE: no props here —
  // the story agent places the payoff shoe on these steps in shot 9.
  const stepM = lam("shrineStep", () => ({ map: stoneTex("copeHD", ["#e5d9c1", "#dbcdb5", "#ebe1ce", "#d3c4ac"], "#a99982") }));
  for (const [sx, sy] of [[14.0, 3.4], [12.6, 2.6], [11.2, 1.8], [9.8, 1.0]]) {
    const st = box(1.4, 0.35, 2.0, stepM, sx, sy, -38);
    st.userData.step = true;
    group.add(st);
  }

  // ---- doctor's courtyard (-14, 0, -20): walled nook, arch, table, dark ---
  const court = new THREE.Group();
  court.position.set(-14, 0, -20);
  const courtStone = lam("courtStone", () => ({ map: stoneTex("wallHD", ["#c3b198", "#b8a68b", "#cdbda3", "#af9c83", "#beac94"], "#887762") }));
  court.add(box(0.5, 3, 6, courtStone, -3.5, 1.5, 0));            // west wall
  court.add(box(7, 3, 0.5, courtStone, 0, 1.5, -3));              // north wall
  court.add(box(7, 3, 0.5, courtStone, 0, 1.5, 3));               // south wall
  court.add(box(0.6, 3, 0.6, courtStone, 3.5, 1.5, -1.8));        // arch pillar N
  court.add(box(0.6, 3, 0.6, courtStone, 3.5, 1.5, 1.8));         // arch pillar S
  court.add(box(0.6, 0.5, 4.2, courtStone, 3.5, 2.85, 0));        // arch lintel
  const archTrim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 8, 20, Math.PI),
    lam("courtTrim", () => ({ color: "#efe3c8" })));
  archTrim.position.set(3.5, 2.6, 0); archTrim.rotation.y = Math.PI / 2;
  archTrim.castShadow = true;
  court.add(archTrim);
  const tableM = lam("courtTable", () => ({ map: beamTex() }));
  court.add(box(1.6, 0.08, 0.9, tableM, -0.5, 0.9, 0));
  for (const [lx, lz] of [[-1.2, -0.35], [0.2, -0.35], [-1.2, 0.35], [0.2, 0.35]])
    court.add(box(0.09, 0.9, 0.09, tableM, lx, 0.45, lz));
  const tc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.28, 8),
    lam("candle", () => ({ color: "#efe6cc" })));
  tc.position.set(-0.5, 1.08, 0); tc.castShadow = true;
  court.add(tc);
  const tf = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8),
    new THREE.MeshBasicMaterial({ color: "#ffb347" }));
  tf.position.set(-0.5, 1.29, 0);
  court.add(tf);
  flames.push(tf);
  court.traverse((m) => { if (m.isMesh) m.userData.occluder = true; });
  group.add(court);

  // ---- trees / bushes: clear of street + square camera lanes --------------
  const treeSpots = [
    [-30, 26, 8], [30, -28, 9], [-35, -30, 7.5], [35, 32, 8.5], [-26, 40, 7],
    [26, -40, 8], [46, 12, 9], [-46, -10, 8], [22, 44, 7.5], [-22, -44, 8],
    [56, -22, 9], [-56, 22, 8], [42, 46, 7], [-42, -46, 8], [26, -46, 7.5],
    [-28, -52, 9], [60, 30, 8], [-60, -34, 8.5],
  ];
  treeSpots.forEach(([x, z, h], i) => group.add(makeTree(x, z, h, i + 3)));
  // Two trees framing the shrine hill (off the steps / path).
  group.add(makeTree(24, -30, 8, 40));
  group.add(makeTree(10, -44, 7.5, 41));
  const bushSpots = [[-16, 30, 0.9], [16, -30, 1.0], [-18, -34, 0.8], [18, 34, 0.9], [8, -46, 1.1], [-8, 46, 0.9]];
  bushSpots.forEach(([x, z, s], i) => group.add(makeBush(x, z, s, i + 7)));

  // ---- clouds --------------------------------------------------------------
  // (current preset/look state lives here so makeCloud can read it)
  let currentName = "day";
  let currentPreset = LIGHTS.day;
  let currentLook = LOOK.day;
  function makeCloud(seed) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex(seed, currentLook.cloud), transparent: true, depthWrite: false, fog: false,
    }));
    sp.scale.set(170, 85, 1);
    sp.userData.seed = seed;
    sp.renderOrder = -0.5;
    clouds.push(sp);
    return sp;
  }
  for (let i = 0; i < 9; i++) {
    const c = makeCloud(i % 4);
    const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
    c.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d);
    const w = 130 + (i % 4) * 30;
    c.scale.set(w, w / 2, 1);
    group.add(c);
  }

  // ---- light application ----------------------------------------------------
  const dummyCam = new THREE.PerspectiveCamera();
  dummyCam.position.set(0, 1.7, 20);
  dummyCam.lookAt(0, 2, -12);

  function applyPreset(preset, look) {
    currentPreset = preset; currentLook = look;
    TONE.uLitCol.value.set(...preset.lit);
    TONE.uShadeCol.value.set(...preset.shade);
    TONE.uShadeLift.value.set(...preset.lift);
    TONE.uLambert.value = preset.lambert;
    TONE.uSideK.value = preset.sideK;
    TONE.uTerm.value = preset.term;
    TONE.uBounce.value.set(...look.bounce);
    TONE.uSat.value = look.sat;
    hemiLight.color.set(preset.sky);
    hemiLight.groundColor.set(preset.ground);
    hemiLight.intensity = preset.hemiI;
    sunLight.color.set(preset.sunCol);
    sunLight.intensity = preset.sunI;
    sunLight.shadow.bias = preset.bias;
    sunLight.shadow.normalBias = preset.normalBias;
    const dir = sunDirFromAzEl(preset.az, preset.el, dummyCam);
    sunLight.position.set(dir.x * 220, 1 + dir.y * 220, dir.z * 220);
    sunLight.target.position.set(0, 1, 0);
    sunLight.target.updateMatrixWorld();
    const su = skyMat.uniforms;
    look.sky.c.forEach((h, i) => su["c" + i].value.set(h));
    const e = look.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    fog.color.set(preset.fog);
    fog.near = preset.fogNear; fog.far = preset.fogFar;
    if (attachedScene) attachedScene.fog = fog;
    const showSun = preset.sunDisc !== "#000000";
    sunDisc.visible = sunHalo.visible = showSun;
    if (showSun) {
      sunDisc.position.copy(dir).multiplyScalar(850);
      sunDisc.scale.setScalar(2 * 850 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      sunDisc.material.color.set(preset.sunDisc);
      sunHalo.position.copy(sunDisc.position);
      sunHalo.scale.setScalar(2 * 850 * Math.tan(THREE.MathUtils.degToRad(24)));
      sunHalo.material.color.set(preset.sunDisc).multiplyScalar(1.3);
    }
    for (const c of clouds) c.material.map = cloudTex(c.userData.seed, look.cloud);
  }

  /** Switch presets. `t` (0..1) blends the named preset toward golden:
   *  setLight('day', t) = day -> golden by t. With no t, the preset as-is.
   *  The story agent calls setLight per shot; the sun is camera-relative and
   *  frozen per shot — reposition sunLight from sunDirFromAzEl(az, el, camera)
   *  after setLight if the shot camera differs from the default (0,1.7,20)
   *  looking at the stage. */
  function setLight(name, t) {
    currentName = name;
    const base = LIGHTS[name] || LIGHTS.day;
    const baseLook = LOOK[name] || LOOK.day;
    if (t == null) { applyPreset(base, baseLook); return; }
    const tt = THREE.MathUtils.clamp(t, 0, 1);
    applyPreset(lerpPreset(base, LIGHTS.golden, tt), lerpLook(baseLook, LOOK.golden, tt));
  }

  /** Per-frame animation. f = frame (0..1279), shotId = 1..9 (number or
   *  "shot3"-style string). Shot 3 grades day -> golden continuously over
   *  f302-505 (PLAN): t = (f - 302) / 203, clamped. Other shots: no light
   *  change here (the story agent owns setLight per shot). Also drifts
   *  clouds, waves the stage banner, flickers candle flames. */
  function update(f, shotId) {
    const n = typeof shotId === "number" ? shotId : parseInt(String(shotId).replace(/\D/g, ""), 10);
    if (n === 3) {
      const t = THREE.MathUtils.clamp((f - 302) / (505 - 302), 0, 1);
      applyPreset(lerpPreset(LIGHTS.day, LIGHTS.golden, t), lerpLook(LOOK.day, LOOK.golden, t));
    }
    for (const c of clouds) {
      c.position.x += 0.05;
      if (c.position.x > 760) c.position.x = -760;
    }
    banners.forEach((b, i) => { b.rotation.z = Math.sin(f * 0.06 + i * 1.3) * 0.04; });
    flames.forEach((fl, i) => {
      const k = 1 + 0.18 * Math.sin(f * 0.5 + i * 1.7);
      fl.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
    });
  }

  // ---- sight-line culling ---------------------------------------------------
  // Hide any OCCLUDER mesh (houses, courtyard walls only — never the stage,
  // shrine, stalls, ground or sky) whose bounding sphere intersects the
  // segment from the camera position to its look target, so a camera can
  // never end up inside a house or stare through one. Behaviour:
  //   * target = camera.userData.target (THREE.Vector3) if set, else
  //     camera position + forward * 60.
  //   * a mesh is hidden only if its sphere intersects the segment AND its
  //     centre is in front of the target (centre distance from camera <
  //     target distance - 0.5) AND its centre is > 2.5 m from the target
  //     (the subject itself is never culled).
  //   * every call first restores all occluders to visible, then hides the
  //     current set — call once per frame before render. Returns the number
  //     of meshes hidden this frame.
  const occluders = [];
  group.traverse((m) => { if (m.isMesh && m.userData.occluder) occluders.push(m); });
  const _sph = new THREE.Sphere();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _dir = new THREE.Vector3(), _c = new THREE.Vector3();
  function cullForCamera(camera) {
    group.updateMatrixWorld(true);
    camera.getWorldDirection(_dir);
    _a.copy(camera.position);
    if (camera.userData.target && camera.userData.target.isVector3) _b.copy(camera.userData.target);
    else _b.copy(_a).addScaledVector(_dir, 60);
    const targetDist = _a.distanceTo(_b);
    let hidden = 0;
    for (const m of occluders) {
      m.visible = true;
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      _sph.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld);
      _c.copy(_sph.center);
      const centreDist = _a.distanceTo(_c);
      if (centreDist > targetDist - 0.5) continue;
      if (_c.distanceTo(_b) < 2.5) continue;
      // closest point on segment a->b to sphere centre
      const abx = _b.x - _a.x, aby = _b.y - _a.y, abz = _b.z - _a.z;
      const len2 = abx * abx + aby * aby + abz * abz || 1;
      let t = ((_c.x - _a.x) * abx + (_c.y - _a.y) * aby + (_c.z - _a.z) * abz) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = _a.x + abx * t - _c.x, dy = _a.y + aby * t - _c.y, dz = _a.z + abz * t - _c.z;
      if (dx * dx + dy * dy + dz * dz < _sph.radius * _sph.radius) { m.visible = false; hidden++; }
    }
    return hidden;
  }

  setLight("day");

  return {
    group, setLight, update, sunLight, hemiLight, sky, LAYOUT, makeCloud, cullForCamera,
    // Extras (not in the spec API, harmless additions):
    fog,                       // THREE.Fog, kept in sync by setLight
    sunDisc, sunHalo,          // sun/moon sprites
    attach(scene) { attachedScene = scene; scene.fog = fog; },
    get currentLight() { return currentName; },
    get currentPreset() { return currentPreset; },
  };
}
