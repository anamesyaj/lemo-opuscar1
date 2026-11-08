// post.js — raw three.js r160 post-processing for the Dancing Plague web engine.
//
// Port of upstream bridge/ink.ts (InkPass), lensblur.ts (LensBlur pre+main) and
// grade.ts (parametric grade only — see GRADE note below) as plain ShaderMaterials.
// No `postprocessing` library, no Remotion, no R3F.
//
// Pipeline (per render call, in order):
//   (1) colour pass into a HalfFloat MSAA-4 target (with depth texture)
//   (2) normal+depth pass into a separate target (RGB = view-space normal,
//       A = coverage, plus a depth texture), with per-mesh material swapping
//   (3) ink edge mask + ink composite (3x3 tent filter, gamma-space blend)
//   (4) depth of field, two gather passes (pre 16 taps, main 48 taps)
//   (5) grade (saturation / gain / lift / vignette / flash) to screen.
// The final pass ends with `#include <colorspace_fragment>` (linearToOutputTexel);
// all render targets are linear HalfFloat.
//
// Import: `import * as THREE from 'three'` — the harness must provide an import
// map that resolves 'three' to three r160 (e.g. '../node_modules/three/build/three.module.js').
//
// Layer contract (matches upstream ink.ts): NOINK = 3. Cards, sky, clouds and
// blobs live on layer 3 and are never outlined.

import * as THREE from 'three';

/** Layer for things that must never be outlined (cards, sky, clouds, smoke). */
export const NOINK = 3;

// ---------------------------------------------------------------------------
// Ink defaults — upstream ink.ts DEF (round 2/3). Widths are specified at
// 1080x1920 and scaled by pxScale = height / 1920.
//   widthNear 5.1 px at 6 m -> widthFar 3.3 px at 90 m (full line width).
//   Reconciliation with the skill's "ink radius ~2.5 px at 1080": radius is the
//   half-width, 5.1 / 2 = 2.55 px, so the two numbers agree; the values below
//   are the full widths, exactly as ink.ts specifies them.
//   At 1080x1920 pxScale = 1920/1920 = 1, so the widths used are 5.1 -> 3.3 px.
export const INK_DEFAULTS = Object.freeze({
  color: '#030303',
  strength: 1.0,
  widthNear: 5.1,
  widthFar: 3.3,
  distNear: 6,
  distFar: 90,
  creaseScale: 0.8, // crease line width / silhouette width (round 3: 0.64 -> 0.8)
  depthLo: 0.01, // depth jumps start at a 1 % relative jump
  depthHi: 0.03,
  angleLo: 35, // creases start at 35 deg
  angleHi: 50, // ... full strength at ~50 deg
  concaveGain: 0.7,
  farOpacity: 0.95,
  fadeNear: 150, // m: far fade-out starts
  fadeFar: 450, // m: lines gone (task notes ~450-520 m; upstream uses 450)
});

// DOF defaults — upstream lensblur.ts (maxCoC 24 px at 1080, nearScale 1.2),
// except the main gather is 48 taps per this module's contract (upstream: 64).
export const DOF_DEFAULTS = Object.freeze({
  focus: 10, // view-space depth in metres (distance along the camera forward axis)
  cInf: 0, // px at 1080x1920; 0 = DOF off
  nearScale: 1.2,
  maxCoC: 24,
});

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// --- normal+depth material (world) ---------------------------------------
// Port of ink.ts NORMAL_VERT / NORMAL_FRAG verbatim in behaviour. RGB =
// view-space normal, A = 1 coverage. Cut-out materials (map + alphaTest)
// keep their shape via onBeforeRender (see makeCutHandler below).
const NORMAL_VERT = /* glsl */ `
#include <common>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;
const NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));   // geometry without normals
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);            // back faces of double-sided planes
  gl_FragColor = vec4(n, 1.0);
}`;

// --- mask material (NOINK cards) ------------------------------------------
// Alpha-tested card shape only: rgb 0, a 0 (coverage 0, so the ink mask treats
// the card as empty — no ink ON the card), with depthWrite on so the card's
// depth still lands in the normal target's depth texture. Neighbouring world
// pixels can only be *suppressed* by that nearer depth (a nearer neighbour
// gives a positive 2nd difference of 1/z, which never inks), and the
// main-depth test suppresses world ink behind the card outright.
// NOTE: the contract phrase "rgb 0, a = depth" is read as "alpha 0, depth via
// the depth buffer" — writing the perspective depth into the alpha channel
// would make far cards read as solid world (a > 0.5) with a zero normal and
// ink them, which is the opposite of the contract.
const MASK_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const MASK_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
varying vec2 vUv;
void main() {
  if (cut > 0.0 && texture2D(tCut, vUv).a < cut) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
}`;

// --- flat-normal material (water) ------------------------------------------
// Water stays on layer 0 (quay/water contact lines come from the depth jump
// at the water edge), but its displaced/animated surface must not crease:
// a constant world-up normal, so the 2nd difference of 1/z is exactly 0 on
// the plane and no normal-angle creases form on the water itself.
const FLAT_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FLAT_FRAG = /* glsl */ `
varying vec3 vN;
void main() { gl_FragColor = vec4(normalize(vN), 1.0); }`;

// --- ink edge mask ----------------------------------------------------------
// Port of ink.ts MASK_FRAG. textureLod -> texture2D: our targets have no
// mipmaps (generateMipmaps false, Nearest/Linear), so implicit LOD is 0 and
// texture2D is identical; this keeps the shader GLSL1 so it compiles as a
// plain three.js ShaderMaterial. RMAX 9 covers 5.1 px * pxScale 1.333 = 6.8 px
// at 1440x2560 (+0.5 AA ramp).
const INK_MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
uniform float pxScale;   // output px per 1080x1920 px
uniform vec2 fogRange;   // scene fog near / far (m); far <= near = no fog tint
uniform float fogStart;  // ink stays pure black up to here (m), then tints toward the fog colour
varying vec2 vUv;

// pixel steps along x, y and both diagonals, and their length in px
const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9   // covers 5.1 px x pxScale 1.333 = 6.8 px at 1440x2560 (+0.5 AA ramp)

// texture2D: explicit LOD would be textureLod(..., 0.0); targets are
// non-mipmapped, so the implicit LOD is 0 already.
float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(texture2D(t, uv).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

// crease strength between this pixel (n0, P0) and a neighbour
float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = texture2D(tNormal, uq);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;       // sky / depth jump: not a crease
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;        // neighbour in front of our tangent plane: concave
  return k;
}

void main() {
  vec4 nc = texture2D(tNormal, vUv);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }          // sky / empty: ink lives on the near object only
  float zc = dist(tDepth, vUv);

  // characters, cards etc. (not in the world buffer) in front of this pixel: no world ink over them
  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale;           // silhouette line width (output px) at this distance, near side only
  float hc = 0.5 * w * creaseScale;                  // crease line half width (px), drawn on both faces
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];          // distance of this pixel's centre to an edge first seen at r
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);       // continuous coverage -> no width popping, built-in AA
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      // depth jump: this pixel is in front of its neighbours (2nd difference of 1/z < 0; exactly 0 on planes)
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      // crease: normal turns towards a neighbour at the same depth
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`;

// --- ink composite ----------------------------------------------------------
// Port of ink.ts COMP_FRAG. 3x3 tent filter (anti-aliasing), near-black ink
// blended in display gamma (like Canvas2D), fog-tinted ink x0.3 far.
// Ends with #include <colorspace_fragment>: identity when rendering into a
// linear target, linear->sRGB when debugEdges() renders it to screen.
const INK_COMP_FRAG = /* glsl */ `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform vec3 fogColor;
uniform float fogInk;   // how far fully fogged ink moves toward the fog colour (0.3)
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;   // 1-2-1 tent = anti-aliasing
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); }
  else if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); }
  else {
    // blend in display (gamma) space like Canvas2D does for the character drawings: coverage -> darkness is linear
    // on screen, so the measured line widths equal the coverage widths (a linear-light blend reads ~30 % thinner)
    float fk = texture2D(tMask, vUv).g;                       // fog amount of the line (max over the AA footprint)
    fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
    fk = max(fk, max(texture2D(tMask, vUv + vec2(0.0, texel.y)).g, texture2D(tMask, vUv - vec2(0.0, texel.y)).g));
    vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
    vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
    gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
  }
  #include <colorspace_fragment>
}`;

// --- depth of field ---------------------------------------------------------
// Port of lensblur.ts as two raw gather passes (pre 16 taps @ 0.287x CoC,
// main 48 taps @ 0.958x CoC + 32 near-field taps). Per-sample CoC test:
// a sample counts only if its own disc reaches this pixel, and a farther
// sample may never spread wider than this pixel's own CoC — no foreground
// bleed, no halos, no dark rims. Fixed Vogel-disc pattern, no per-pixel
// noise: no grain, no frame-to-frame flicker.
// Deviation from upstream: main gather is 48 taps here (upstream: 64),
// per this module's contract. Pre pass is unchanged (16 taps).
const DOF_STAGES = {
  pre: { taps: 16, spread: 0.287, nearTaps: 0, rot: 0.61 },
  main: { taps: 48, spread: 0.958, nearTaps: 32, rot: 0.0 },
};

function dofFrag(stage) {
  return /* glsl */ `
#include <packing>
#define TAPS ${stage.taps}
#define SPREAD ${stage.spread.toFixed(4)}
#define NEAR_TAPS ${stage.nearTaps}
#define ROT ${stage.rot.toFixed(4)}
#define GOLDEN 2.39996323
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px at 1080x1920) of things at infinity; 0 = off
uniform float nearScale;  // extra blur for things in front of the focus plane
uniform float maxCoC;     // px at 1080x1920
uniform float pxScale;    // output px per 1080x1920 px (height / 1920)
uniform float cNear;
uniform float cFar;
varying vec2 vUv;

float cocAt(float d, float s) {               // signed CoC radius in output px
  float c = cInf * s * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * s, maxCoC * s);
}
float distAt(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cNear, cFar); }

void main() {
  vec4 inputColor = texture2D(tColor, vUv);
  if (cInf < 0.25) { gl_FragColor = inputColor; return; }
  float s = pxScale;
  float d0 = distAt(vUv);
  float r0 = abs(cocAt(d0, s));
  float R = r0 * SPREAD;
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R;
      float a = float(i) * GOLDEN + ROT;
      vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * texel;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds, s)) * SPREAD;
      if (ds > d0) rs = min(rs, R);            // background never bleeds over a nearer pixel
      float w = clamp(rs - rr + 0.5, 0.0, 1.0); // does the sample's disc reach us?
      acc += texture2D(tColor, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;                      // already covered by the disc gather
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * texel;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;              // only things in front of us
    float rs = abs(cocAt(ds, s));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(tColor, suv).rgb * w; fw += w;
    cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  gl_FragColor = vec4(col, inputColor.a);
}`;
}

// --- grade (final pass) -----------------------------------------------------
// GRADE note: upstream grade.ts is a *fitted* preset (7-knot Hermite curve +
// zone saturation/tints, GRADE_DAY2/GRADE_GOLDEN2) selected per shot-light.
// This module's contracted opts carry no preset selector — only the parametric
// controls below — so the final pass implements exactly those, in linear
// space, after DOF: saturation (around Rec.709 luma), gain (multiply), lift
// (add; number or [r, g, b]), vignette (strength; start radius 0.45, as in
// grade.ts), flash (white flash 0..1, mix toward white). The grade.ts curve
// machinery is portable and can be layered in later if the harness adds a
// preset option; it is deliberately NOT baked in here, so the parametric
// controls are the whole grade and cannot double-correct.
// Final pass writes linearToOutputTexel via #include <colorspace_fragment>.
const GRADE_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform float saturation;
uniform float gain;
uniform vec3 lift;
uniform float vignette;
uniform float flash;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = vec3(l) + saturation * (c - vec3(l));
  c = c * gain + lift;
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p) * 0.70710678;
  c *= 1.0 - vignette * smoothstep(0.45, 1.0, r);
  c = mix(c, vec3(1.0), clamp(flash, 0.0, 1.0));
  gl_FragColor = vec4(max(c, vec3(0.0)), 1.0);
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------------------
// Helpers

function makeRT(w, h, { type = THREE.HalfFloatType, filter = THREE.LinearFilter, samples = 0, depth = false } = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type,
    minFilter: filter,
    magFilter: filter,
    generateMipmaps: false,
    depthBuffer: true,
    samples,
    ...(depth ? { depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType) } : {}),
  });
  return rt;
}

function fsMaterial(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: FS_VERT,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

/**
 * createPost(renderer, width, height) -> { render, setSize, debugEdges, dispose }
 *
 * render(scene, camera, opts):
 *   opts = {
 *     flash: 0..1,            // white flash (default 0)
 *     saturation: 1,          // default 1 = unchanged
 *     gain: 1,                // default 1 = unchanged
 *     lift: 0 | [r, g, b],    // default 0
 *     vignette: 0.12,         // strength, default 0.12
 *     dof: { focus, cInf },   // focus = view-space depth in metres; cInf = px at 1080x1920 (0 = off)
 *     ink: { color, strength, widthNear, widthFar, distNear, distFar,
 *            creaseScale, depthLo, depthHi, angleLo, angleHi,
 *            concaveGain, farOpacity, fadeNear, fadeFar }  // all optional, INK_DEFAULTS
 *   }
 * Executes, in order: (1) colour pass (HalfFloat, MSAA 4) -> (2) normal+depth
 * pass (per-mesh swap; fog/shadows off) -> (3) ink mask + composite ->
 * (4) DOF pre + main -> (5) grade to screen.
 *
 * setSize(w, h): resize all targets.
 * debugEdges(): re-runs passes (1)-(2) + the mask for the last rendered
 *   scene/camera and draws the edge-only mask to screen (white = no ink,
 *   black = ink). Returns false if render() has never been called.
 */
export function createPost(renderer, width, height) {
  // Layer ownership: the harness camera must have NOINK (layer 3) enabled
  // for cards/sky to appear in the colour pass at all (upstream InkPass
  // enabled it in its constructor; here it is the harness's camera setup —
  // this module never mutates camera layers). The normal pass honours
  // camera.layers via layers.test(), so a camera without NOINK simply
  // yields an empty normal buffer where the cards would be (same visible
  // result: no ink on them).

  let W = width;
  let H = height;

  // (1) colour target: HalfFloat, MSAA 4, with a depth texture (used by the
  // ink mask's main-depth test and by DOF).
  const colorRT = makeRT(W, H, { samples: 4, depth: true });
  // (2) normal+depth target: HalfFloat, no MSAA (exact per-pixel normals),
  // with a depth texture.
  const normalRT = makeRT(W, H, { filter: THREE.NearestFilter, depth: true });
  // (3) ink mask target: r = ink coverage, g = fog amount.
  const maskRT = makeRT(W, H, { type: THREE.UnsignedByteType, filter: THREE.NearestFilter });
  // Intermediate linear targets for ink composite / DOF.
  const inkRT = makeRT(W, H, {});
  const dofPreRT = makeRT(W, H, {});
  const dofRT = makeRT(W, H, {});

  // --- normal-pass materials (per-mesh swap; see renderNormalPass) ---
  // origByObj maps each swapped object to its original material(s), so the
  // cut-out handler can read the original map/alphaTest after the swap.
  const origByObj = new Map();
  const cutHandler = (mat) => (r, s, c, g, object, group) => {
    const orig = origByObj.get(object);
    if (!orig) { mat.uniforms.tCut.value = null; mat.uniforms.cut.value = 0; return; }
    const mats = Array.isArray(orig) ? orig : [orig];
    const gi = (group && typeof group.materialIndex === 'number') ? group.materialIndex : 0;
    const src = mats[gi] || mats[0];
    const u = mat.uniforms;
    const map = src && src.alphaTest > 0 ? src.map : null;
    u.tCut.value = map || null;
    u.cut.value = map ? src.alphaTest : 0;
    if (map) { map.updateMatrix(); u.cutUv.value.copy(map.matrix); }
  };
  const normalMat = new THREE.ShaderMaterial({
    vertexShader: NORMAL_VERT,
    fragmentShader: NORMAL_FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      tCut: { value: null },
      cut: { value: 0 },
      cutUv: { value: new THREE.Matrix3() },
    },
  });
  normalMat.onBeforeRender = cutHandler(normalMat);

  const maskMat = new THREE.ShaderMaterial({
    vertexShader: MASK_VERT,
    fragmentShader: MASK_FRAG,
    side: THREE.DoubleSide,
    depthWrite: true,
    uniforms: {
      tCut: { value: null },
      cut: { value: 0 },
      cutUv: { value: new THREE.Matrix3() }, // unused by MASK_FRAG; kept for handler symmetry
    },
  });
  maskMat.onBeforeRender = cutHandler(maskMat);

  const flatMat = new THREE.ShaderMaterial({
    vertexShader: FLAT_VERT,
    fragmentShader: FLAT_FRAG,
    side: THREE.DoubleSide,
  });

  // --- fullscreen materials ---
  const texel = new THREE.Vector2(1 / W, 1 / H);
  const inkMaskMat = fsMaterial(INK_MASK_FRAG, {
    tNormal: { value: normalRT.texture },
    tDepth: { value: normalRT.depthTexture },
    tMainDepth: { value: colorRT.depthTexture },
    texel: { value: texel.clone() },
    cNear: { value: 0.2 },
    cFar: { value: 1500 },
    p00: { value: 1 },
    p11: { value: 1 },
    wNear: { value: INK_DEFAULTS.widthNear },
    wFar: { value: INK_DEFAULTS.widthFar },
    dNear: { value: INK_DEFAULTS.distNear },
    dFar: { value: INK_DEFAULTS.distFar },
    creaseScale: { value: INK_DEFAULTS.creaseScale },
    depthLo: { value: INK_DEFAULTS.depthLo },
    depthHi: { value: INK_DEFAULTS.depthHi },
    cosLo: { value: Math.cos((INK_DEFAULTS.angleLo * Math.PI) / 180) },
    cosHi: { value: Math.cos((INK_DEFAULTS.angleHi * Math.PI) / 180) },
    concaveGain: { value: INK_DEFAULTS.concaveGain },
    farOpacity: { value: INK_DEFAULTS.farOpacity },
    fadeNear: { value: INK_DEFAULTS.fadeNear },
    fadeFar: { value: INK_DEFAULTS.fadeFar },
    strength: { value: INK_DEFAULTS.strength },
    useMain: { value: 1 },
    pxScale: { value: H / 1920 },
    fogRange: { value: new THREE.Vector2(0, 0) },
    fogStart: { value: 60 },
  });
  const inkCompMat = fsMaterial(INK_COMP_FRAG, {
    inputBuffer: { value: colorRT.texture },
    tMask: { value: maskRT.texture },
    tNormal: { value: normalRT.texture },
    texel: { value: texel.clone() },
    inkColor: { value: new THREE.Color(INK_DEFAULTS.color) },
    fogColor: { value: new THREE.Color(0x000000) },
    fogInk: { value: 0.3 },
    debug: { value: 0 },
  });
  const dofUniforms = (stage) => ({
    tColor: { value: inkRT.texture },
    tDepth: { value: colorRT.depthTexture },
    texel: { value: texel.clone() },
    focus: { value: DOF_DEFAULTS.focus },
    cInf: { value: DOF_DEFAULTS.cInf },
    nearScale: { value: DOF_DEFAULTS.nearScale },
    maxCoC: { value: DOF_DEFAULTS.maxCoC },
    pxScale: { value: H / 1920 },
    cNear: { value: 0.2 },
    cFar: { value: 1500 },
  });
  const dofPreMat = fsMaterial(dofFrag(DOF_STAGES.pre), dofUniforms(DOF_STAGES.pre));
  const dofMainMat = fsMaterial(dofFrag(DOF_STAGES.main), dofUniforms(DOF_STAGES.main));
  const gradeMat = fsMaterial(GRADE_FRAG, {
    tColor: { value: dofRT.texture },
    saturation: { value: 1 },
    gain: { value: 1 },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    vignette: { value: 0.12 },
    flash: { value: 0 },
  });

  const fsScene = new THREE.Scene();
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inkMaskMat);
  quad.frustumCulled = false;
  fsScene.add(quad);

  const clearCol = new THREE.Color();
  let last = { scene: null, camera: null, opts: null };

  function applyInkOpts(ink = {}) {
    const o = { ...INK_DEFAULTS, ...ink };
    const u = inkMaskMat.uniforms;
    u.wNear.value = o.widthNear;
    u.wFar.value = o.widthFar;
    u.dNear.value = o.distNear;
    u.dFar.value = o.distFar;
    u.creaseScale.value = o.creaseScale;
    u.depthLo.value = o.depthLo;
    u.depthHi.value = o.depthHi;
    u.cosLo.value = Math.cos((o.angleLo * Math.PI) / 180);
    u.cosHi.value = Math.cos((o.angleHi * Math.PI) / 180);
    u.concaveGain.value = o.concaveGain;
    u.farOpacity.value = o.farOpacity;
    u.fadeNear.value = o.fadeNear;
    u.fadeFar.value = o.fadeFar;
    u.strength.value = o.strength;
    inkCompMat.uniforms.inkColor.value.set(o.color);
  }

  function applyDofOpts(dof = {}, camera) {
    const o = { ...DOF_DEFAULTS, ...dof };
    for (const m of [dofPreMat, dofMainMat]) {
      m.uniforms.focus.value = o.focus;
      m.uniforms.cInf.value = o.cInf;
      m.uniforms.nearScale.value = o.nearScale;
      m.uniforms.maxCoC.value = o.maxCoC;
      m.uniforms.cNear.value = camera.near;
      m.uniforms.cFar.value = camera.far;
    }
  }

  function applyGradeOpts(opts) {
    const u = gradeMat.uniforms;
    u.saturation.value = opts.saturation !== undefined ? opts.saturation : 1;
    u.gain.value = opts.gain !== undefined ? opts.gain : 1;
    const lift = opts.lift !== undefined ? opts.lift : 0;
    if (Array.isArray(lift)) u.lift.value.set(lift[0] || 0, lift[1] || 0, lift[2] || 0);
    else u.lift.value.set(lift, lift, lift);
    u.vignette.value = opts.vignette !== undefined ? opts.vignette : 0.12;
    u.flash.value = opts.flash !== undefined ? opts.flash : 0;
  }

  // --- pass (2): normal+depth with per-mesh material swapping -------------
  // world (layer 0)            -> normal material (alpha-tested cut-outs kept)
  // NOINK cards                -> mask material (rgb 0, a 0, depth written)
  // NOINK sky / clouds / blobs -> hidden (also: sprites, points, lines, and
  //   any depthWrite=false effect mesh, which would otherwise paint normals
  //   with no depth behind them)
  // water (name/userData)      -> flat-normal material
  // Fog and shadows are OFF during this pass; background is suppressed so
  // the target clears to (0,0,0,0) = empty.
  function renderNormalPass(scene, camera) {
    const saved = [];
    const NOINK_BIT = 1 << NOINK;
    scene.traverse((o) => {
      if (!o.visible) return;
      if (!o.isMesh && !o.isSprite && !o.isPoints && !o.isLine) return;
      if (!o.layers.test(camera.layers)) return; // not rendered by this camera anyway
      const isSpriteLike = o.isSprite || o.isPoints || o.isLine;
      const mats = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      const name = `${o.name || ''} ${mats.map((m) => (m && m.name) || '').join(' ')}`;
      const onNoInk = (o.layers.mask & NOINK_BIT) !== 0;
      const onLayer0 = (o.layers.mask & 1) !== 0;
      const isWater = /water/i.test(name) || !!o.userData.water || !!o.userData.isWater;
      const noDepthWrite = mats.length > 0 && mats.every((m) => m && m.depthWrite === false);
      const isCard = !!o.customDepthMaterial
        || mats.some((m) => m && m.alphaTest > 0)
        || /card/i.test(o.name || '');
      const isSkyBlob = /sky|cloud|blob|smoke|fog/i.test(name);

      if (isSpriteLike || isSkyBlob || (onNoInk && !onLayer0 && !isCard) || (noDepthWrite && !isWater)) {
        saved.push({ o, material: o.material, visible: o.visible });
        o.visible = false;
        return;
      }
      if (onNoInk && !onLayer0 && isCard) {
        origByObj.set(o, o.material);
        saved.push({ o, material: o.material, visible: o.visible, mask: true });
        o.material = maskMat;
        return;
      }
      if (!o.isMesh) return;
      origByObj.set(o, o.material);
      saved.push({ o, material: o.material, visible: o.visible });
      o.material = isWater ? flatMat : normalMat;
    });

    const autoClear = renderer.autoClear;
    const shadowAuto = renderer.shadowMap.autoUpdate;
    const background = scene.background;
    const fog = scene.fog;
    renderer.getClearColor(clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    scene.background = null;
    scene.fog = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(normalRT);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    // restore
    for (const s of saved) {
      s.o.material = s.material;
      s.o.visible = s.visible;
    }
    origByObj.clear();
    scene.background = background;
    scene.fog = fog;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(clearCol, clearAlpha);
    renderer.autoClear = autoClear;
  }

  function updateMaskCameraUniforms(camera, scene) {
    const u = inkMaskMat.uniforms;
    const e = camera.projectionMatrix.elements;
    u.cNear.value = camera.near;
    u.cFar.value = camera.far;
    u.p00.value = e[0];
    u.p11.value = e[5];
    const fog = scene.fog;
    if (fog && fog.isFog) {
      u.fogRange.value.set(fog.near, fog.far);
      inkCompMat.uniforms.fogColor.value.copy(fog.color);
    } else {
      u.fogRange.value.set(0, 0);
    }
  }

  function runMaskPass() {
    quad.material = inkMaskMat;
    renderer.setRenderTarget(maskRT);
    renderer.render(fsScene, fsCam);
  }

  function render(scene, camera, opts = {}) {
    last = { scene, camera, opts };
    applyInkOpts(opts.ink);
    applyDofOpts(opts.dof, camera);
    applyGradeOpts(opts);

    // (1) colour pass — HalfFloat, MSAA 4, with depth texture.
    renderer.setRenderTarget(colorRT);
    renderer.render(scene, camera);

    // (2) normal+depth pass (fog/shadows off, background suppressed).
    renderNormalPass(scene, camera);

    // (3a) ink edge mask.
    updateMaskCameraUniforms(camera, scene);
    runMaskPass();

    // (3b) ink composite into a linear temp target (colour only).
    inkCompMat.uniforms.inputBuffer.value = colorRT.texture;
    inkCompMat.uniforms.debug.value = 0;
    quad.material = inkCompMat;
    renderer.setRenderTarget(inkRT);
    renderer.render(fsScene, fsCam);

    // (4) DOF: pre gather, then main gather (+ near-field). Both read the
    // colour pass depth texture; cInf < 0.25 passes through unchanged.
    dofPreMat.uniforms.tColor.value = inkRT.texture;
    quad.material = dofPreMat;
    renderer.setRenderTarget(dofPreRT);
    renderer.render(fsScene, fsCam);
    dofMainMat.uniforms.tColor.value = dofPreRT.texture;
    quad.material = dofMainMat;
    renderer.setRenderTarget(dofRT);
    renderer.render(fsScene, fsCam);

    // (5) grade to screen. Final pass writes linearToOutputTexel(...)
    // (via #include <colorspace_fragment> in GRADE_FRAG).
    gradeMat.uniforms.tColor.value = dofRT.texture;
    quad.material = gradeMat;
    renderer.setRenderTarget(null);
    renderer.render(fsScene, fsCam);
  }

  function debugEdges() {
    if (!last.scene || !last.camera) return false;
    // Re-run passes (1)-(2) + mask for the last scene/camera, then draw the
    // edge-only mask to screen (debug == 1: white = no ink, black = ink).
    renderer.setRenderTarget(colorRT);
    renderer.render(last.scene, last.camera);
    renderNormalPass(last.scene, last.camera);
    updateMaskCameraUniforms(last.camera, last.scene);
    runMaskPass();
    inkCompMat.uniforms.inputBuffer.value = colorRT.texture;
    inkCompMat.uniforms.debug.value = 1;
    quad.material = inkCompMat;
    renderer.setRenderTarget(null);
    renderer.render(fsScene, fsCam);
    inkCompMat.uniforms.debug.value = 0;
    return true;
  }

  function setSize(w, h) {
    W = w;
    H = h;
    for (const rt of [colorRT, normalRT, maskRT, inkRT, dofPreRT, dofRT]) rt.setSize(w, h);
    const tx = 1 / w;
    const ty = 1 / h;
    for (const m of [inkMaskMat, inkCompMat, dofPreMat, dofMainMat]) {
      m.uniforms.texel.value.set(tx, ty);
    }
    inkMaskMat.uniforms.pxScale.value = h / 1920;
    dofPreMat.uniforms.pxScale.value = h / 1920;
    dofMainMat.uniforms.pxScale.value = h / 1920;
  }

  function dispose() {
    for (const rt of [colorRT, normalRT, maskRT, inkRT, dofPreRT, dofRT]) {
      rt.depthTexture?.dispose();
      rt.dispose();
    }
    for (const m of [normalMat, maskMat, flatMat, inkMaskMat, inkCompMat, dofPreMat, dofMainMat, gradeMat]) m.dispose();
    quad.geometry.dispose();
  }

  return { render, setSize, debugEdges, dispose };
}
