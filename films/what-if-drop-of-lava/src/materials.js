/* ---------- STUDIO ENVIRONMENT, LIGHTING & ZACKD VINYL-CLAY MATERIALS ---------- */

const gl = makeGL(W, H);
gl.toneMapping = THREE.ACESFilmicToneMapping;
gl.toneMappingExposure = 1.04;
if (THREE.sRGBEncoding) gl.outputEncoding = THREE.sRGBEncoding;
gl.shadowMap.enabled = true;
gl.shadowMap.type = THREE.PCFSoftShadowMap;

function srgb(hex) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 120);

// Build a procedural studio reflection environment so vinyl-clay clearcoats and mirror-black
// obsidian glass facets catch crisp, realistic softbox highlights offline & on CI workers.
function buildStudioEnvironment(renderer) {
  const ec = document.createElement("canvas");
  ec.width = 512; ec.height = 256;
  const g = ec.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0.0, "#24324c");
  bg.addColorStop(0.48, "#141d2f");
  bg.addColorStop(1.0, "#090d16");
  g.fillStyle = bg;
  g.fillRect(0, 0, 512, 256);

  // Overhead warm studio softbox strip
  const sb1 = g.createRadialGradient(170, 52, 8, 170, 52, 105);
  sb1.addColorStop(0, "rgba(255, 244, 224, 0.85)");
  sb1.addColorStop(0.5, "rgba(255, 226, 188, 0.28)");
  sb1.addColorStop(1, "rgba(255, 226, 188, 0)");
  g.fillStyle = sb1; g.fillRect(0, 0, 512, 180);

  // Cool surgical rim softbox strip
  const sb2 = g.createRadialGradient(390, 78, 6, 390, 78, 92);
  sb2.addColorStop(0, "rgba(145, 200, 255, 0.82)");
  sb2.addColorStop(0.55, "rgba(100, 168, 255, 0.25)");
  sb2.addColorStop(1, "rgba(100, 168, 255, 0)");
  g.fillStyle = sb2; g.fillRect(240, 0, 272, 200);

  // Crisp specular strip for obsidian facets
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.fillRect(115, 28, 95, 11);
  g.fillStyle = "rgba(150,215,255,0.68)";
  g.fillRect(345, 42, 82, 10);

  const tex = new THREE.CanvasTexture(ec);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  if (THREE.PMREMGenerator) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(tex);
    pmrem.dispose();
    tex.dispose();
    return envRT.texture;
  }
  return tex;
}

scene.environment = buildStudioEnvironment(gl);

// Studio 3-point lighting + dynamic incandescent lava PointLight
const hemiLight = new THREE.HemisphereLight(srgb(0xdbeafe), srgb(0x161e30), 0.72);
const keyLight = new THREE.DirectionalLight(srgb(0xfff2dc), 1.85);
keyLight.position.set(5.5, 9.5, 7.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024;
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 30;
const dCam = 7.5;
keyLight.shadow.camera.left = -dCam; keyLight.shadow.camera.right = dCam;
keyLight.shadow.camera.top = dCam; keyLight.shadow.camera.bottom = -dCam;
keyLight.shadow.bias = -0.0008;

const fillLight = new THREE.DirectionalLight(srgb(0x8ec5ff), 0.74);
fillLight.position.set(-7.0, 3.5, 4.5);

const rimLight = new THREE.DirectionalLight(srgb(0x7dd3fc), 1.28);
rimLight.position.set(-4.5, 6.5, -7.0);

const lavaLight = new THREE.PointLight(srgb(0xff6210), 2.8, 12.5, 1.7);
scene.add(hemiLight, keyLight, fillLight, rimLight, lavaLight);

// Material factories (ZackD vinyl-clay aesthetic with accurate linear color space)
function clay(color, opts = {}) {
  const o = Object.assign({
    color: typeof color === "number" ? srgb(color) : color,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.32,
    clearcoatRoughness: 0.44,
  }, opts);
  if (typeof o.emissive === "number") o.emissive = srgb(o.emissive);
  return new THREE.MeshPhysicalMaterial(o);
}

function wetClay(color, opts = {}) {
  const o = Object.assign({
    color: typeof color === "number" ? srgb(color) : color,
    roughness: 0.24,
    metalness: 0.01,
    clearcoat: 0.78,
    clearcoatRoughness: 0.18,
  }, opts);
  if (typeof o.emissive === "number") o.emissive = srgb(o.emissive);
  return new THREE.MeshPhysicalMaterial(o);
}

const MAT = {
  skin: clay(0xf0b193),
  skinCut: clay(0xd97365, { roughness: 0.48 }),
  hair: clay(0x3a2218, { roughness: 0.50, clearcoat: 0.24 }),
  shirt: clay(0x2563eb, { roughness: 0.48 }),
  collar: clay(0x38bdf8, { roughness: 0.44 }),
  bone: clay(0xf5ecda, { roughness: 0.46, clearcoat: 0.20 }),
  tooth: clay(0xfbf9f0, { roughness: 0.22, clearcoat: 0.65 }),
  tongue: wetClay(0xe25b74),
  mucosa: wetClay(0xd94e67),
  larynx: wetClay(0xe86b82),
  muscle: clay(0xbd3a52, { roughness: 0.38, clearcoat: 0.38 }),
  cartilage: clay(0xcce5ff, { roughness: 0.36, clearcoat: 0.40 }),
  eyeWhite: clay(0xf8fafc, { roughness: 0.20, clearcoat: 0.6 }),
  iris: clay(0x4a2c1d, { roughness: 0.18, clearcoat: 0.8 }),
  pupil: clay(0x0b101d, { roughness: 0.12, clearcoat: 0.9 }),
  steel: new THREE.MeshStandardMaterial({ color: srgb(0xcbd5e1), metalness: 0.78, roughness: 0.24 }),
  crucible: clay(0x2b3344, { roughness: 0.58, clearcoat: 0.14 }),
  plinth: clay(0x20293d, { roughness: 0.50, clearcoat: 0.28 }),
  mug: clay(0x2563eb, { roughness: 0.26, clearcoat: 0.68 }),
  water: new THREE.MeshPhysicalMaterial({ color: srgb(0x38bdf8), transparent: true, opacity: 0.82, roughness: 0.12, clearcoat: 0.9 }),
  acid: new THREE.MeshPhysicalMaterial({ color: srgb(0x65a30d), emissive: srgb(0x1f3a08), emissiveIntensity: 0.32, transparent: true, opacity: 0.76, roughness: 0.16, clearcoat: 0.92 }),
  steam: new THREE.MeshPhysicalMaterial({ color: srgb(0xf1f5f9), emissive: srgb(0xbae6fd), emissiveIntensity: 0.20, roughness: 0.55, clearcoat: 0.1, transparent: true, opacity: 0.86 }),
  searWhite: clay(0xf4efe8, { roughness: 0.65, clearcoat: 0.08 }),
  charDark: clay(0x211312, { roughness: 0.74, clearcoat: 0.05 }),
  obsidian: new THREE.MeshPhysicalMaterial({
    color: srgb(0x11192c),
    emissive: srgb(0x080f1e),
    emissiveIntensity: 0.22,
    roughness: 0.06,
    metalness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 1.0,
    flatShading: true,
  }),
  redBadge: clay(0xef4444, { emissive: 0x991b1b, emissiveIntensity: 0.42, roughness: 0.28, clearcoat: 0.5 }),
  goldBar: clay(0xf97316, { emissive: 0xea580c, emissiveIntensity: 0.58, roughness: 0.28, clearcoat: 0.5 }),
  cyanRing: new THREE.MeshBasicMaterial({ color: srgb(0x38bdf8), transparent: true, opacity: 0.90, side: THREE.DoubleSide }),
  dangerRing: new THREE.MeshBasicMaterial({ color: srgb(0xff4d4f), transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
};

// Geometry builders (rounded box, capsule, lathe teardrop, smooth tube)
function rboxGeo(w, h, d, r = 0.18, segs = 5) {
  const rr = Math.min(r, w * 0.45, h * 0.45, d * 0.45);
  const s = new THREE.Shape();
  const x = -w / 2 + rr, y = -h / 2 + rr, iw = w - 2 * rr, ih = h - 2 * rr;
  s.moveTo(x, y - rr);
  s.lineTo(x + iw, y - rr);
  s.quadraticCurveTo(x + iw + rr, y - rr, x + iw + rr, y);
  s.lineTo(x + iw + rr, y + ih);
  s.quadraticCurveTo(x + iw + rr, y + ih + rr, x + iw, y + ih + rr);
  s.lineTo(x, y + ih + rr);
  s.quadraticCurveTo(x - rr, y + ih + rr, x - rr, y + ih);
  s.lineTo(x - rr, y);
  s.quadraticCurveTo(x - rr, y - rr, x, y - rr);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(0.001, d - 2 * rr),
    bevelEnabled: true,
    bevelSize: rr,
    bevelThickness: rr,
    bevelSegments: segs,
    curveSegments: 8,
  });
  g.center();
  return g;
}

function rbox(w, h, d, r, mat) {
  const m = new THREE.Mesh(rboxGeo(w, h, d, r), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function capsuleMesh(radius, len, mat, seg = 16) {
  const pts = [];
  const half = len * 0.5;
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 10);
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * radius), -half + Math.sin(a) * radius));
  }
  for (let i = 0; i <= 10; i++) {
    const a = (Math.PI / 2) * (i / 10);
    pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * radius), half + Math.sin(a) * radius));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Single world -> screen projection function (DIRECTOR.md §10 & TECHNIQUE.md §2)
const _projVec = new THREE.Vector3();
function worldToScreen(wx, wy, wz) {
  _projVec.set(wx, wy, wz);
  _projVec.project(camera);
  return {
    x: (_projVec.x * 0.5 + 0.5) * W,
    y: (-_projVec.y * 0.5 + 0.5) * H,
    z: _projVec.z,
  };
}
