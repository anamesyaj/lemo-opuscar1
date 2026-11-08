// cast.js — character cards as lit flat sprites in the 3D world (plain three.js).
// Adapted from upstream cast.ts: canvas pool (one canvas per distinct drawing, so
// characters sharing a pose share canvases), yaw-only billboards, contact blobs.
// Cards live on the NOINK layer (3) so the world ink pass never outlines their quads.
import * as THREE from 'three';
import { Pen, fxShadow, fxContact } from './toonbase.js';

export const NOINK = 3;
export const SU = 0.00225; // metres per design unit: 1000 units = 2.25 m (skill)
const BODY = (() => {
  const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU);
  g.translate(0, (975 - 500) * SU, 0); // soles at local y = 0
  return g;
})();
const CARD = new THREE.PlaneGeometry(1, 1);

// ---------------- canvas pool ----------------
function makeEntry(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { cv, tex, w, h };
}
export class Pool {
  constructor() { this.live = new Map(); this.free = []; this.reqs = []; }
  req(key, w, h, k, draw) {
    const r = { key: `${w}x${h}|${key}`, w, h, k, draw, tex: null };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map();
    for (const r of this.reqs) {
      const l = want.get(r.key);
      if (l) l.push(r); else want.set(r.key, [r]);
    }
    for (const [key, e] of this.live) {
      if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0];
        const i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext('2d');
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, e.w, e.h);
        g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- card shading (port of upstream cardshade.ts) ----------------
// The card REPLACES the Lambert lighting output: it is essentially self-lit
// (map x preset tint, normalised so faces read the same day and golden),
// with a bright floor where a cast shadow would fall (charShade ~.86) and a
// soft side gradient toward the real sun. The scene sun/hemi never darken a
// backlit card. sunVis is fixed at 1.0: cards ignore cast shadows entirely
// (grounding comes from the contact blob), so no LFB shadow lookup is needed.
const GRAD_K = 5.5, GRAD_KB = 1.6, TINT_K = 0.55;
const CARD_GLSL = /* glsl */ `
vec3 tintK = mix( vec3( 1.0 ), uCharTint, uTintK );
tintK /= pow( max( dot( tintK, vec3( 0.2126, 0.7152, 0.0722 ) ), 0.2 ), uNorm );
vec3 outgoingLight = diffuseColor.rgb * tintK;
#if NUM_DIR_LIGHTS > 0
{
  float sunVis = 1.0;
  vec3 sunV = directionalLights[ 0 ].direction;
  vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float side = sign( sunV.x ) * smoothstep( 0.0, 0.35, abs( sunV.x ) );
  float head = smoothstep( 0.565, 0.6, vMapUv.y );
  float hw = mix( 0.15, 0.2, head );
  float uu = clamp( ( vMapUv.x - 0.5 ) / hw, -1.0, 1.0 ) * sign( dFdx( vMapUv.x ) + 1e-7 );
  float t = uu * side;
  float g = mix( uBodyGrad * uGradKB, min( uGrad * uGradK, 0.4 ), head );
  float dark = smoothstep( -0.15, 0.9, -t );
  vec3 sideK = mix( vec3( 1.0 ), uSideTint, dark * clamp( g / max( min( uGrad * uGradK, 0.4 ), 1e-3 ), 0.0, 1.5 ) * 0.5 );
  float top = 1.0 + 0.05 * clamp( ( vMapUv.y - 0.69 ) / 0.11, -1.0, 1.0 ) * clamp( dot( sunV, upV ) * 2.0, 0.0, 1.0 ) * head;
  float lift = 1.0 + 0.04 * smoothstep( 0.0, 0.9, t );
  outgoingLight *= mix( uCharShade, 1.0, sunVis ) * ( 1.0 - g * dark ) * sideK * top * lift * uGain;
  #ifdef USE_MAP
  {
    float warm = smoothstep( 0.2, 0.4, 1.0 - uCharTint.b );
    float sl = length( sunV.xy );
    vec2 d2 = sunV.xy / max( sl, 1e-4 );
    vec2 duv = 2.0 * uPx * ( d2.x * dFdx( vMapUv ) + d2.y * dFdy( vMapUv ) );
    float edge = step( texture2D( map, vMapUv + duv ).a, 0.5 );
    vec2 dirU = normalize( duv + vec2( 1e-9 ) );
    vec4 c1 = texture2D( map, vMapUv - dirU * vec2( 0.027, 0.016 ) );
    vec4 c2 = texture2D( map, vMapUv - dirU * vec2( 0.067, 0.04 ) );
    float skin = step( 0.5, c1.a ) * step( 0.3, c1.r ) * step( c1.b + 0.12, c1.r ) * step( c1.g, c1.r + 0.02 );
    float torso = step( 0.27, vMapUv.y ) * step( vMapUv.y, 0.57 ) * step( 0.5, c1.a ) * step( 0.5, c2.a ) * step( 0.04, max( c1.r, max( c1.g, c1.b ) ) );
    float rim = warm * smoothstep( 0.1, 0.4, sl ) * edge * max( skin * head, torso ) * mix( 0.6, 1.0, sunVis );
    outgoingLight += vec3( 0.95, 0.52, 0.16 ) * rim;
  }
  #endif
}
#endif
`;
const CARD_DECL = '#include <common>\nuniform vec3 uCharTint; uniform float uCharShade; uniform float uGrad; uniform float uBodyGrad; uniform vec3 uSideTint;'
  + ' uniform float uGradK; uniform float uGradKB; uniform float uTintK; uniform float uNorm; uniform float uGain; uniform float uPx;';
const CARD_K = { uGradK: 5.5, uGradKB: 1.6, uTintK: 0.55, uNorm: 0.7, uGain: 1.03, uPx: 1.0 };

function cardMaterial() {
  const uniforms = {
    uCharTint: { value: new THREE.Vector3(1, 0.94, 0.92) },
    uCharShade: { value: 0.86 },
    uGrad: { value: 0.07 },
    uBodyGrad: { value: 0.2 },
    uSideTint: { value: new THREE.Vector3(0.92, 0.9, 0.96) },
    uGradK: { value: CARD_K.uGradK },
    uGradKB: { value: CARD_K.uGradKB },
    uTintK: { value: CARD_K.uTintK },
    uNorm: { value: CARD_K.uNorm },
    uGain: { value: CARD_K.uGain },
    uPx: { value: CARD_K.uPx },
  };
  const mat = new THREE.MeshLambertMaterial({
    map: null, alphaTest: 0.5, side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', CARD_DECL)
      .replace(
        'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        CARD_GLSL);
  };
  mat.customProgramCacheKey = () => 'card9';
  mat.userData.uniforms = uniforms;
  return mat;
}

/** Lit flat character: receives shadows (dims to the bright floor only). */
export class Actor {
  constructor(parent) {
    this.mat = cardMaterial();
    this.dmat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.castShadow = false;
    // Cards are flat drawings, not 3D objects: they do NOT receive the world's
    // cast shadows (the fixed dummy-cam sun puts the square's hero spot inside
    // the east houses' shadow, which turned Troffea brown). Grounding comes
    // from the contact blob + day shadow tail instead.
    this.mesh.receiveShadow = false;
    // Rim width is in output pixels: tell the card shader the render height.
    this.mesh.onBeforeRender = (r) => {
      const rt = r.getRenderTarget();
      this.mat.userData.uniforms.uPx.value = (rt ? rt.height : r.domElement.height) / 1920;
    };
    this.mesh.visible = false;
    this.mesh.rotation.order = 'YXZ';
    this.mesh.renderOrder = 1;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    this.r = null;
  }
  bind() {
    const t = this.r && this.r.tex;
    if (t) { this.mat.map = t; this.dmat.map = t; this.mat.needsUpdate = false; }
  }
  /** Per-preset card tint/gradient, from the LIGHTS preset's char* fields. */
  setTint(preset) {
    const u = this.mat.userData.uniforms;
    if (!u) return;
    u.uCharTint.value.set(preset.charTint[0], preset.charTint[1], preset.charTint[2]);
    u.uCharShade.value = preset.charShade;
    u.uGrad.value = preset.charGrad;
    u.uBodyGrad.value = preset.bodyGrad;
    u.uSideTint.value.set(preset.sideTint[0], preset.sideTint[1], preset.sideTint[2]);
  }
}

/** Unlit effect card: hard cut-out, soft see-through, or a multiply ground blob. */
export function blobMaterial(map) {
  return new THREE.MeshBasicMaterial({
    map, transparent: true, blending: THREE.MultiplyBlending, depthWrite: false,
    side: THREE.DoubleSide,
  });
}
export class Fx {
  constructor(parent) {
    this.mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide });
    this.soft = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(null);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false;
    this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    this.r = null;
  }
  /** Bind the pooled texture and pick the material for this placement.
   *  The material choice lives HERE (not in the harness): an Fx object is
   *  reused across frames, and a blob assigned after a hard card (or vice
   *  versa) must not keep the previous placement's material — that leaked
   *  the normal-blend material onto multiply blobs and drew white quads
   *  under every character (found in stills sheet A). */
  bind(soft = false) {
    const t = this.r && this.r.tex;
    if (!t) return;
    if (this.r.key.includes('|blob|')) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t;
      this.mesh.material = this.blob;
      this.mesh.renderOrder = 0.5;
    } else {
      this.mat.map = t; this.soft.map = t;
      this.mesh.material = soft ? this.soft : this.mat;
      this.mesh.renderOrder = soft ? 2 : 0;
    }
  }
}

// ---------------- sizing ----------------
/** drawing resolution by distance: [canvas w, h, scale from the 600x1000 design] */
export function tier(d) {
  if (d < 3.2) return [1800, 3000, 3.0];
  if (d < 6.5) return [1080, 1800, 1.8];
  if (d < 16) return [480, 800, 0.8];
  return [240, 400, 0.4];
}

// ---------------- contact shadows ----------------
const CONTACT_DAY = [0.2, 0.21, 0.33];
const CONTACT_GOLDEN = [0.24, 0.2, 0.33];
const toSrgb = (v) => {
  const c = Math.max(0, Math.min(1, v));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
const hexOf = (c, k) => '#' + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, '0')).join('');
/** Tight contact pool under the feet + (by day) a soft tail away from the sun. */
export function contactBlob(fxList, x, y, z, sun, lightName, sc = 1, k = 1) {
  const hl = Math.hypot(sun[0], sun[2]) || 1;
  const ox = -sun[0] / hl, oz = -sun[2] / hl;
  const rot = Math.atan2(-ox, -oz);
  if (lightName === 'day') {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, sun[1])));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc;
    const h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf([0.42, 0.44, 0.62], k);
    fxList.push({
      key: `blob|shadow|${tc}`, cw: 128, ch: 256,
      draw: (p) => fxShadow(p, tc, false),
      x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot,
    });
  }
  const cc = hexOf(lightName === 'golden' ? CONTACT_GOLDEN : CONTACT_DAY, k);
  fxList.push({
    key: `blob|contact|${cc}`, cw: 128, ch: 128,
    draw: (p) => fxContact(p, cc),
    x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot,
  });
}
