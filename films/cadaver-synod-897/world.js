// world.js — Three dense modular 3D Roman zones (897 AD) built with paint.js textures and tbox():
//   Zone 1 (z =    0): Lateran Basilica Synod Court, Rome (897 AD) — Marble columns, crimson papal throne, prosecutor pulpit, fascia sign
//   Zone 2 (z =  -50): Papal Crypt of St. Peter's, Rome (897 AD) — Recessed travertine arches, sliding stone sarcophagus (FORMOSUS), torches
//   Zone 3 (z = -100): Tiber River Embankment & Papal Decree Plaza, Rome (897 AD) — Roman stone bridge, river, edict monument, ceremonial papal cart
import * as THREE from 'three';
import * as P from './paint.js';

const CEL = (() => {
  const d = new Uint8Array([92, 92, 92, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 2, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const matCache = new Map();
export function toon(color, map = null) {
  const key = map ? `${color}|${map.uuid}` : color;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, map, gradientMap: CEL });
    matCache.set(key, m);
  }
  return m;
}

function sh(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function tbox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [u, v] = dims[f];
    const su = u / tile, sv = v / tile, i = f * 4;
    uv.setXY(i + 0, 0, sv);
    uv.setXY(i + 1, su, sv);
    uv.setXY(i + 2, 0, 0);
    uv.setXY(i + 3, su, 0);
  }
  return g;
}

// Non-mirrored planar fascia signboard in a 3D timber/gold frame (Baboon Reference Standard)
function makeFasciaBoard(w, h, line1, line2 = '', opts = {}) {
  const {
    bg = '#4a181c',
    border = '#eac45a',
    textCol = '#fcf6e4',
    subCol = '#f2ce68',
    frameCol = '#4a301c',
  } = opts;

  const grp = new THREE.Group();
  const back = sh(new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.10), toon(frameCol)));
  back.position.z = -0.05;
  grp.add(back);

  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = Math.max(256, Math.round(1024 * (h / w)));
  const ctx = cv.getContext('2d');
  const cw = cv.width, ch = cv.height;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = border;
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, cw - 36, ch - 36);
  ctx.lineWidth = 5;
  ctx.strokeRect(36, 36, cw - 72, ch - 72);

  for (const [rx, ry] of [[54, 54], [cw - 54, 54], [54, ch - 54], [cw - 54, ch - 54]]) {
    ctx.fillStyle = border;
    ctx.beginPath();
    ctx.arc(rx, ry, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (line2) {
    ctx.fillStyle = textCol;
    ctx.font = `900 ${Math.round(ch * 0.34)}px "Fredoka", sans-serif`;
    ctx.fillText(line1, cw / 2, ch * 0.38);
    ctx.fillStyle = subCol;
    ctx.font = `800 ${Math.round(ch * 0.22)}px "Fredoka", sans-serif`;
    ctx.fillText(line2, cw / 2, ch * 0.72);
  } else {
    ctx.fillStyle = textCol;
    ctx.font = `900 ${Math.round(ch * 0.44)}px "Fredoka", sans-serif`;
    ctx.fillText(line1, cw / 2, ch * 0.52);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshToonMaterial({ map: tex, gradientMap: CEL })
  );
  face.position.z = 0.01;
  grp.add(face);
  return grp;
}

// Carved Roman Marble Tablet / Edict Plaque ("NO DEAD ON TRIAL")
function makeEdictMonument() {
  const grp = new THREE.Group();
  const base = sh(new THREE.Mesh(tbox(1.45, 0.36, 0.65, 1.0), toon('#b8b09c')));
  base.position.y = 0.18;
  grp.add(base);

  const slab = sh(new THREE.Mesh(tbox(1.22, 1.55, 0.24, 1.2), toon('#dcd4be')));
  slab.position.set(0, 1.12, 0);
  grp.add(slab);

  const cap = sh(new THREE.Mesh(tbox(1.38, 0.20, 0.34, 1.0), toon('#c8b88a')));
  cap.position.set(0, 1.98, 0);
  grp.add(cap);

  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 640;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f5eed8';
  ctx.fillRect(0, 0, 512, 640);
  ctx.strokeStyle = '#b88c32';
  ctx.lineWidth = 18;
  ctx.strokeRect(18, 18, 476, 604);

  // Papal crossed keys & skull prohibition emblem
  const cx = 256, cy = 215;
  ctx.fillStyle = '#2d241e';
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 28, cy + 16, 56, 32);
  ctx.fillStyle = '#f5eed8';
  ctx.beginPath();
  ctx.arc(cx - 16, cy - 12, 11, 0, Math.PI * 2);
  ctx.arc(cx + 16, cy - 12, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#cf2a2a';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(cx, cy, 108, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 76, cy - 76);
  ctx.lineTo(cx + 76, cy + 76);
  ctx.stroke();

  ctx.fillStyle = '#1d2432';
  ctx.textAlign = 'center';
  ctx.font = '900 66px "Fredoka", sans-serif';
  ctx.fillText('NO DEAD', 256, 435);
  ctx.fillStyle = '#9b1c24';
  ctx.font = '900 60px "Fredoka", sans-serif';
  ctx.fillText('ON TRIAL', 256, 520);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.06, 1.34),
    new THREE.MeshToonMaterial({ map: tex, gradientMap: CEL })
  );
  face.position.set(0, 1.12, 0.13);
  grp.add(face);
  return grp;
}

// Painted circular Papal Seal Emblem on the Ceremonial Papal Cart (Shot 5b)
function makePapalSealDisc(radius = 0.62) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d');
  const cx = 256, cy = 256;

  ctx.fillStyle = '#fbf4e2';
  ctx.beginPath();
  ctx.arc(cx, cy, 244, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8f1d24';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#d8a432';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 206, 0, Math.PI * 2);
  ctx.stroke();

  // Golden Papal Mitre + Crossed Keys icon
  ctx.strokeStyle = '#b88628';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(cx - 85, cy + 55);
  ctx.lineTo(cx + 85, cy - 95);
  ctx.moveTo(cx + 85, cy + 55);
  ctx.lineTo(cx - 85, cy - 95);
  ctx.stroke();

  ctx.fillStyle = '#e5b842';
  ctx.strokeStyle = '#1d1510';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(cx - 58, cy + 12);
  ctx.lineTo(cx - 42, cy - 75);
  ctx.lineTo(cx, cy - 115);
  ctx.lineTo(cx + 42, cy - 75);
  ctx.lineTo(cx + 58, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8f1d24';
  ctx.font = '900 38px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAPAL EDICT 897', cx, 396);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.Mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshToonMaterial({ map: tex, gradientMap: CEL })
  );
}

export function buildWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const tBrick = P.tex(P.stone(11, 24, 38, 58, 128, 64));
  const tMarble = P.tex(P.stone(22, 42, 12, 76, 128, 64));
  const tCobble = P.tex(P.stone(33, 215, 10, 56, 96, 48));
  const tPlanks = P.tex(P.planks(44));
  const tBeam = P.tex(P.beam(55, [28, 42, 34]));
  const tRoof = P.tex(P.roof(88));

  const mBrick = toon('#c99b72', tBrick);
  const mMarble = toon('#ded6c1', tMarble);
  const mDarkStone = toon('#948c7a', tMarble);
  const mCobble = toon('#969aa2', tCobble);
  const mPlank = toon('#b8834a', tPlanks);
  const mBeam = toon('#5c3c20', tBeam);
  const mRoof = toon('#b85434', tRoof);
  const mCrimson = toon('#8f1d24');
  const mGold = toon('#e2b244');
  const mDarkIron = toon('#2b3038');

  function addCypress(parent, x, z, sc = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(sc);
    const trunk = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 7), mBeam));
    trunk.position.y = 0.6;
    g.add(trunk);
    const cone = sh(new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.8, 9), toon('#385a34')));
    cone.position.y = 2.6;
    g.add(cone);
    parent.add(g);
  }

  function addBrazier(parent, x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const stand = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.24, 0.95, 8), mDarkIron));
    stand.position.y = 0.48;
    g.add(stand);
    const bowl = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.18, 0.28, 10), mGold));
    bowl.position.y = 1.02;
    g.add(bowl);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 8), new THREE.MeshBasicMaterial({ color: '#ffae34' }));
    flame.position.y = 1.34;
    g.add(flame);
    parent.add(g);
  }

  // ==========================================================================
  // ZONE 1 (z = 0): LATERAN BASILICA SYNOD COURT, ROME (897 AD)
  // ==========================================================================
  const z1 = new THREE.Group();
  root.add(z1);

  // Checkered / Flagstone Roman Basilica Floor
  const gnd1 = sh(new THREE.Mesh(tbox(60, 0.4, 46, 3.5), mMarble), false, true);
  gnd1.position.set(0, -0.2, -6);
  z1.add(gnd1);

  const runnerCarpet = sh(new THREE.Mesh(tbox(2.4, 0.04, 12.0, 2.0), mCrimson), false, true);
  runnerCarpet.position.set(0, 0.02, -1.0);
  z1.add(runnerCarpet);

  // Basilica Apse Wall & Marble Columns at (0, 0, -4.5)
  const apse = new THREE.Group();
  apse.position.set(0, 0, -4.5);
  z1.add(apse);

  const apseWall = sh(new THREE.Mesh(tbox(7.2, 3.6, 2.4, 2.0), mBrick));
  apseWall.position.y = 1.8;
  apse.add(apseWall);

  // Classical Roman Marble Columns with Gold Capitals along Basilica Wall
  for (const cx of [-3.1, -1.65, 1.65, 3.1]) {
    const base = sh(new THREE.Mesh(tbox(0.46, 0.24, 0.46, 0.8), mDarkStone));
    base.position.set(cx, 0.12, 1.25);
    apse.add(base);
    const shaft = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 3.0, 12), mMarble));
    shaft.position.set(cx, 1.72, 1.25);
    apse.add(shaft);
    const cap = sh(new THREE.Mesh(tbox(0.48, 0.24, 0.48, 0.8), mGold));
    cap.position.set(cx, 3.32, 1.25);
    apse.add(cap);
  }

  const cornice = sh(new THREE.Mesh(tbox(7.6, 0.30, 2.8, 1.6), mBeam));
  cornice.position.y = 3.55;
  apse.add(cornice);

  const roof1 = sh(new THREE.Mesh(tbox(7.8, 0.55, 3.0, 1.8), mRoof));
  roof1.position.y = 3.95;
  apse.add(roof1);

  // Diegetic Fascia Signboard on Lateran Basilica Entablature (Baboon Standard!)
  const signBasilica = makeFasciaBoard(3.35, 0.70, 'LATERAN BASILICA', 'SYNOD COURT · 897 AD', {
    bg: '#4a161b', border: '#eac45a',
  });
  signBasilica.position.set(0, 2.88, 1.34);
  apse.add(signBasilica);

  // Elevated Crimson-and-Gold Papal Throne for Skeleton Formosus at (0.62, 0, -2.55)
  // Placed cleanly behind the character staging plane (z = -1.72) with flush side pilasters so no armrests clip character cards
  const throne = new THREE.Group();
  throne.position.set(0.62, 0, -2.55);
  z1.add(throne);

  const dais = sh(new THREE.Mesh(tbox(1.55, 0.14, 1.05, 1.2), mMarble));
  dais.position.set(0, 0.07, 0.05);
  throne.add(dais);
  const backRest = sh(new THREE.Mesh(tbox(1.26, 2.35, 0.18, 1.2), mGold));
  backRest.position.set(0, 1.30, -0.22);
  throne.add(backRest);
  const velvetBack = sh(new THREE.Mesh(tbox(1.00, 2.05, 0.20, 1.0), mCrimson));
  velvetBack.position.set(0, 1.28, -0.20);
  throne.add(velvetBack);
  for (const sx of [-0.58, 0.58]) {
    const pilaster = sh(new THREE.Mesh(tbox(0.16, 1.15, 0.24, 0.8), mGold));
    pilaster.position.set(sx, 0.65, -0.18);
    throne.add(pilaster);
  }

  // Prosecutor's Carved Oak Pulpit Desk for Pope Stephen VI at (-0.98, 0, -1.22)
  // Compact depth (d = 0.42) placed cleanly in front of Pope Stephen VI (z = -1.85) so zero diagonal clipping occurs
  const pulpit = new THREE.Group();
  pulpit.position.set(-0.98, 0, -1.22);
  z1.add(pulpit);
  const pBody = sh(new THREE.Mesh(tbox(0.96, 0.88, 0.40, 1.0), mPlank));
  pBody.position.y = 0.44;
  pulpit.add(pBody);
  const pTop = sh(new THREE.Mesh(tbox(1.08, 0.10, 0.48, 1.0), mBeam));
  pTop.position.y = 0.92;
  pulpit.add(pTop);
  // Crimson papal banner hanging on front of pulpit
  const pCloth = sh(new THREE.Mesh(tbox(0.72, 0.56, 0.05, 0.8), mCrimson));
  pCloth.position.set(0, 0.50, 0.21);
  pulpit.add(pCloth);

  addBrazier(z1, -2.35, -2.55);
  addBrazier(z1, 2.35, -2.55);

  // ==========================================================================
  // ZONE 2 (z = -50): PAPAL CRYPT OF ROME (EXHUMATION, 897 AD)
  // ==========================================================================
  const z2 = new THREE.Group();
  z2.position.set(0, 0, -50);
  root.add(z2);

  const gnd2 = sh(new THREE.Mesh(tbox(50, 0.6, 36, 3.0), mCobble), false, true);
  gnd2.position.set(0, -0.3, -4);
  z2.add(gnd2);

  // Roman Travertine Crypt Vault Wall at (0, 0, -4.3)
  const cryptWall = new THREE.Group();
  cryptWall.position.set(0, 0, -4.3);
  z2.add(cryptWall);

  const cwBody = sh(new THREE.Mesh(tbox(6.8, 3.5, 2.2, 1.8), mDarkStone));
  cwBody.position.y = 1.75;
  cryptWall.add(cwBody);

  const cwRoof = sh(new THREE.Mesh(tbox(7.2, 0.48, 2.6, 1.6), mBeam));
  cwRoof.position.y = 3.68;
  cryptWall.add(cwRoof);

  // Diegetic Fascia Signboard on Papal Crypt Arch (Baboon Reference Standard!)
  const signCrypt = makeFasciaBoard(3.25, 0.68, 'PAPAL CRYPT · ROME', 'EXHUMATION · 897 AD', {
    bg: '#2b2538', border: '#e6c15a',
  });
  signCrypt.position.set(0, 2.84, 1.16);
  cryptWall.add(signCrypt);

  // Carved Stone Papal Sarcophagus at (0, 0, -2.55) with Sliding Stone Lid
  // Placed cleanly behind the character staging plane (z = -51.55) so neither tombBox nor sliding tombLid intersects characters
  const tomb = new THREE.Group();
  tomb.position.set(0, 0, -2.55);
  z2.add(tomb);

  const tombBox = sh(new THREE.Mesh(tbox(2.05, 0.82, 0.85, 1.2), mMarble));
  tombBox.position.y = 0.41;
  tomb.add(tombBox);

  const tombPlinth = sh(new THREE.Mesh(tbox(2.25, 0.18, 0.98, 1.2), mDarkStone));
  tombPlinth.position.y = 0.09;
  tomb.add(tombPlinth);

  // Sliding Sarcophagus Lid (animated open in story.js!)
  const tombLid = sh(new THREE.Mesh(tbox(2.10, 0.18, 0.90, 1.2), mGold));
  tombLid.position.set(0.15, 0.90, 0);
  tomb.add(tombLid);

  addBrazier(z2, -2.25, -2.65);
  addBrazier(z2, 2.25, -2.65);

  // ==========================================================================
  // ZONE 3 (z = -100): TIBER RIVER EMBANKMENT & PAPAL DECREE PLAZA (897 AD)
  // ==========================================================================
  const z3 = new THREE.Group();
  z3.position.set(0, 0, -100);
  root.add(z3);

  // Cobblestone Tiber Quay & Embankment Wall
  const quay3 = sh(new THREE.Mesh(tbox(54, 0.8, 12, 3.0), mCobble), false, true);
  quay3.position.set(0, -0.4, 1.2);
  z3.add(quay3);

  const parapet = sh(new THREE.Mesh(tbox(54, 0.36, 0.48, 2.0), mMarble));
  parapet.position.set(0, 0.18, -3.8);
  z3.add(parapet);

  // Flowing Tiber River Water
  const tiber = new THREE.Mesh(new THREE.PlaneGeometry(80, 45), toon('#286e8e'));
  tiber.rotation.x = -Math.PI / 2;
  tiber.position.set(0, -0.28, -22);
  z3.add(tiber);

  // Expanding water splash ring in the Tiber (toggled on "tossed into the Tiber River")
  const splashRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: '#e8f7ff', side: THREE.DoubleSide })
  );
  splashRing.rotation.x = -Math.PI / 2;
  splashRing.position.set(-0.85, -0.22, -5.2);
  splashRing.visible = false;
  z3.add(splashRing);

  // Roman Stone Arch Bridge & Papal Decree Loggia at (0, 0, -4.4)
  const loggia = new THREE.Group();
  loggia.position.set(0, 0, -4.4);
  z3.add(loggia);

  const lWall = sh(new THREE.Mesh(tbox(6.2, 3.4, 2.0, 1.8), mBrick));
  lWall.position.y = 1.7;
  loggia.add(lWall);
  const lRoof = sh(new THREE.Mesh(tbox(6.6, 0.48, 2.4, 1.6), mRoof));
  lRoof.position.y = 3.62;
  loggia.add(lRoof);

  // Diegetic Fascia Signboard on Tiber Embankment Loggia (Baboon Reference Standard!)
  const signTiber = makeFasciaBoard(3.25, 0.68, 'TIBER EMBANKMENT', 'PAPAL DECREE · 897 AD', {
    bg: '#1f3848', border: '#eac45a',
  });
  signTiber.position.set(0, 2.82, 1.06);
  loggia.add(signTiber);

  // Carved Stone Edict Monument ("NO DEAD ON TRIAL") centered at (0.0, 0, -2.55) cleanly behind characters
  const edictMonument = makeEdictMonument();
  edictMonument.position.set(0.0, 0, -2.55);
  z3.add(edictMonument);

  addCypress(z3, -4.2, -5.4, 1.15);
  addCypress(z3, 4.2, -5.4, 1.20);

  // ==========================================================================
  // ROLLING 3D CEREMONIAL PAPAL CARRIAGE / CART WITH PAPAL SEAL (Shot 5b)
  // ==========================================================================
  const papalCart = new THREE.Group();
  papalCart.position.set(-12, 0, -99.1);
  papalCart.visible = false;
  root.add(papalCart);

  const cartBed = sh(new THREE.Mesh(tbox(2.6, 0.82, 1.55, 1.2), mCrimson));
  cartBed.position.set(-0.65, 1.02, 0);
  papalCart.add(cartBed);

  const cartCanopy = sh(new THREE.Mesh(tbox(2.55, 1.25, 1.50, 1.5), mGold));
  cartCanopy.position.set(-0.65, 2.02, 0);
  papalCart.add(cartCanopy);

  const cartFront = sh(new THREE.Mesh(tbox(1.15, 1.45, 1.48, 1.2), mCrimson));
  cartFront.position.set(1.15, 1.34, 0);
  papalCart.add(cartFront);

  const cartWheels = [];
  for (const [wx, wz] of [[-1.35, 0.80], [-1.35, -0.80], [1.25, 0.80], [1.25, -0.80]]) {
    const wGrp = new THREE.Group();
    wGrp.position.set(wx, 0.52, wz);
    const tire = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.24, 16), mBeam));
    tire.rotation.x = Math.PI / 2;
    wGrp.add(tire);
    const rim = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 10), mGold));
    rim.rotation.x = Math.PI / 2;
    wGrp.add(rim);
    papalCart.add(wGrp);
    cartWheels.push(wGrp);
  }

  const sealDisc = makePapalSealDisc(0.62);
  sealDisc.position.set(-0.65, 1.78, 0.79);
  papalCart.add(sealDisc);

  return {
    root,
    tombLid,
    splashRing,
    papalCart,
    cartWheels,
  };
}
