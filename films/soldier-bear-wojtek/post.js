// post.js — Three.js post-processing pipeline: HalfFloat MSAA color pass,
// normal+depth ink outline pass (skipping NOINK = 3 cards/sky), 48-tap DOF gather,
// and final linear-space color grading pass.
import * as THREE from 'three';

/** Layer 3 holds un-outlined 2D cards, sky dome, clouds, and shadow blobs. */
export const NOINK = 3;

export const INK_DEFAULTS = Object.freeze({
  color: '#030303',
  strength: 1.0,
  widthNear: 5.1,
  widthFar: 3.3,
  distNear: 6,
  distFar: 90,
  creaseScale: 0.8,
  depthLo: 0.01,
  depthHi: 0.03,
  angleLo: 35,
  angleHi: 50,
  concaveGain: 0.7,
  farOpacity: 0.95,
  fadeNear: 150,
  fadeFar: 450,
});

export const DOF_DEFAULTS = Object.freeze({
  focus: 10,
  cInf: 0,
  nearScale: 1.2,
  maxCoC: 24,
});

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

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
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  gl_FragColor = vec4(n, 1.0);
}`;

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

const FLAT_VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FLAT_FRAG = /* glsl */ `
varying vec3 vN;
void main() { gl_FragColor = vec4(normalize(vN), 1.0); }`;

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
uniform float pxScale;
uniform vec2 fogRange;
uniform float fogStart;
varying vec2 vUv;

const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 9

float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(texture2D(t, uv).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = texture2D(tNormal, uq);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;
  return k;
}

void main() {
  vec4 nc = texture2D(tNormal, vUv);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float zc = dist(tDepth, vUv);

  if (useMain > 0.5) {
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }

  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale;
  float hc = 0.5 * w * creaseScale;
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }

  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  float f0 = max(fogRange.x, fogStart);
  float fogK = fogRange.y > f0 ? clamp((zc - f0) / (fogRange.y - f0), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(ink, fogK, 0.0, 1.0);
}`;

const INK_COMP_FRAG = /* glsl */ `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform sampler2D tNormal;
uniform vec2 texel;
uniform vec3 inkColor;
uniform vec3 fogColor;
uniform float fogInk;
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); }
  else if (debug == 2) { gl_FragColor = vec4(texture2D(tNormal, vUv).xyz * 0.5 + 0.5, 1.0); }
  else {
    float fk = texture2D(tMask, vUv).g;
    fk = max(fk, max(texture2D(tMask, vUv + vec2(texel.x, 0.0)).g, texture2D(tMask, vUv - vec2(texel.x, 0.0)).g));
    fk = max(fk, max(texture2D(tMask, vUv + vec2(0.0, texel.y)).g, texture2D(tMask, vUv - vec2(0.0, texel.y)).g));
    vec3 inkC = mix(inkColor, fogColor, fk * fogInk);
    vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
    gl_FragColor = vec4(pow(mix(g, pow(inkC, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
  }
  #include <colorspace_fragment>
}`;

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
uniform float focus;
uniform float cInf;
uniform float nearScale;
uniform float maxCoC;
uniform float pxScale;
uniform float cNear;
uniform float cFar;
varying vec2 vUv;

float cocAt(float d, float s) {
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
      if (ds > d0) rs = min(rs, R);
      float w = clamp(rs - rr + 0.5, 0.0, 1.0);
      acc += texture2D(tColor, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * rr * texel;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;
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

function makeRT(w, h, { type = THREE.HalfFloatType, filter = THREE.LinearFilter, samples = 0, depth = false } = {}) {
  return new THREE.WebGLRenderTarget(w, h, {
    type,
    minFilter: filter,
    magFilter: filter,
    generateMipmaps: false,
    depthBuffer: true,
    samples,
    ...(depth ? { depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType) } : {}),
  });
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

export function createPost(renderer, width, height) {
  let W = width;
  let H = height;

  const colorRT = makeRT(W, H, { samples: 4, depth: true });
  const normalRT = makeRT(W, H, { filter: THREE.NearestFilter, depth: true });
  const maskRT = makeRT(W, H, { type: THREE.UnsignedByteType, filter: THREE.NearestFilter });
  const inkRT = makeRT(W, H, {});
  const dofPreRT = makeRT(W, H, {});
  const dofRT = makeRT(W, H, {});

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
    uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } },
  });
  normalMat.onBeforeRender = cutHandler(normalMat);

  const maskMat = new THREE.ShaderMaterial({
    vertexShader: MASK_VERT,
    fragmentShader: MASK_FRAG,
    side: THREE.DoubleSide,
    depthWrite: true,
    uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } },
  });
  maskMat.onBeforeRender = cutHandler(maskMat);

  const flatMat = new THREE.ShaderMaterial({
    vertexShader: FLAT_VERT,
    fragmentShader: FLAT_FRAG,
    side: THREE.DoubleSide,
  });

  const texel = new THREE.Vector2(1 / W, 1 / H);
  const inkMaskMat = fsMaterial(INK_MASK_FRAG, {
    tNormal: { value: normalRT.texture },
    tDepth: { value: normalRT.depthTexture },
    tMainDepth: { value: colorRT.depthTexture },
    texel: { value: texel.clone() },
    cNear: { value: 0.1 },
    cFar: { value: 1000 },
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
    fogStart: { value: 50 },
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
  const dofUniforms = () => ({
    tColor: { value: inkRT.texture },
    tDepth: { value: colorRT.depthTexture },
    texel: { value: texel.clone() },
    focus: { value: DOF_DEFAULTS.focus },
    cInf: { value: DOF_DEFAULTS.cInf },
    nearScale: { value: DOF_DEFAULTS.nearScale },
    maxCoC: { value: DOF_DEFAULTS.maxCoC },
    pxScale: { value: H / 1920 },
    cNear: { value: 0.1 },
    cFar: { value: 1000 },
  });
  const dofPreMat = fsMaterial(dofFrag(DOF_STAGES.pre), dofUniforms());
  const dofMainMat = fsMaterial(dofFrag(DOF_STAGES.main), dofUniforms());
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

  function renderNormalPass(scene, camera) {
    const saved = [];
    const NOINK_BIT = 1 << NOINK;
    scene.traverse((o) => {
      if (!o.visible) return;
      if (!o.isMesh && !o.isSprite && !o.isPoints && !o.isLine) return;
      if (!o.layers.test(camera.layers)) return;
      const isSpriteLike = o.isSprite || o.isPoints || o.isLine;
      const mats = o.isMesh ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      const name = `${o.name || ''} ${mats.map((m) => (m && m.name) || '').join(' ')}`;
      const onNoInk = (o.layers.mask & NOINK_BIT) !== 0;
      const onLayer0 = (o.layers.mask & 1) !== 0;
      const isWater = /water/i.test(name) || !!o.userData.water;
      const noDepthWrite = mats.length > 0 && mats.every((m) => m && m.depthWrite === false);
      const isCard = !!o.customDepthMaterial || mats.some((m) => m && m.alphaTest > 0) || /card/i.test(o.name || '');
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

  function render(scene, camera, opts = {}) {
    applyInkOpts(opts.ink);
    applyDofOpts(opts.dof, camera);
    applyGradeOpts(opts);

    renderer.setRenderTarget(colorRT);
    renderer.render(scene, camera);

    renderNormalPass(scene, camera);

    updateMaskCameraUniforms(camera, scene);
    quad.material = inkMaskMat;
    renderer.setRenderTarget(maskRT);
    renderer.render(fsScene, fsCam);

    inkCompMat.uniforms.inputBuffer.value = colorRT.texture;
    inkCompMat.uniforms.debug.value = 0;
    quad.material = inkCompMat;
    renderer.setRenderTarget(inkRT);
    renderer.render(fsScene, fsCam);

    dofPreMat.uniforms.tColor.value = inkRT.texture;
    quad.material = dofPreMat;
    renderer.setRenderTarget(dofPreRT);
    renderer.render(fsScene, fsCam);
    dofMainMat.uniforms.tColor.value = dofPreRT.texture;
    quad.material = dofMainMat;
    renderer.setRenderTarget(dofRT);
    renderer.render(fsScene, fsCam);

    gradeMat.uniforms.tColor.value = dofRT.texture;
    quad.material = gradeMat;
    renderer.setRenderTarget(null);
    renderer.render(fsScene, fsCam);
  }

  function setSize(w, h) {
    W = w;
    H = h;
    for (const rt of [colorRT, normalRT, maskRT, inkRT, dofPreRT, dofRT]) rt.setSize(w, h);
    const tx = 1 / w, ty = 1 / h;
    for (const m of [inkMaskMat, inkCompMat, dofPreMat, dofMainMat]) m.uniforms.texel.value.set(tx, ty);
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
  }

  return { render, setSize, dispose };
}
