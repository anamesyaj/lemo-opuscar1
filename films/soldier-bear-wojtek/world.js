// world.js — Three dense modular 3D WWII zones built with paint.js textures and tbox():
//   Zone 1 (z =    0): Hamadan Supply Camp, Iran (1942) — Depot, tents, crates, acacia trees
//   Zone 2 (z =  -50): Alexandria Harbour, Egypt (1944) — Customs gate, NO PETS sign, desk, MS Batory & gangplank
//   Zone 3 (z = -100): Monte Cassino Emplacement & Victory Road, Italy (1944) — 25-pdr howitzer, abbey ruins, rolling emblem truck
import * as THREE from 'three';
import * as P from './paint.js';

// 2-step cel ramp for crisp cartoon world shading
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

// World-scaled UV box from cartoon-short-kit
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

// Non-mirrored planar fascia signboard in a 3D timber frame (Baboon reference style)
function makeFasciaBoard(w, h, line1, line2 = '', opts = {}) {
  const {
    bg = '#233d29',
    border = '#e6c15a',
    textCol = '#fcf6e4',
    subCol = '#f2ce68',
    frameCol = '#4a301c',
  } = opts;

  const grp = new THREE.Group();
  // 3D wooden backing & frame trim
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

  // Double gold border with corner rivets
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

// Standing "NO PETS ABOARD" dock warning sign with red prohibition circle & paw icon
function makeNoPetsSign() {
  const grp = new THREE.Group();
  const post = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.90, 8), toon('#543822')));
  post.position.y = 0.45;
  grp.add(post);

  const base = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.12, 10), toon('#3b3d42')));
  base.position.y = 0.06;
  grp.add(base);

  const boardBack = sh(new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.28, 0.08), toon('#4a301c')));
  boardBack.position.set(0, 1.52, -0.04);
  grp.add(boardBack);

  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 580;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f8f1dc';
  ctx.fillRect(0, 0, 512, 580);
  ctx.strokeStyle = '#1f2838';
  ctx.lineWidth = 18;
  ctx.strokeRect(16, 16, 480, 548);

  // Red circle + slash over bear paw silhouette
  const cx = 256, cy = 205;
  ctx.fillStyle = '#2d241e';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 18, 42, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [ox, oy] of [[-46, -26], [-16, -44], [16, -44], [46, -26]]) {
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy + oy, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.font = '900 68px "Fredoka", sans-serif';
  ctx.fillText('NO PETS', 256, 405);
  ctx.fillStyle = '#cf2a2a';
  ctx.font = '900 58px "Fredoka", sans-serif';
  ctx.fillText('ABOARD', 256, 485);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 1.20),
    new THREE.MeshToonMaterial({ map: tex, gradientMap: CEL })
  );
  face.position.set(0, 1.52, 0.01);
  grp.add(face);
  return grp;
}

// Painted circular emblem of the Polish 22nd Artillery Supply Company (Wojtek carrying a shell)
function makeEmblemDisc(radius = 0.62) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d');
  const cx = 256, cy = 256;

  // Crisp white badge disc with dark green & red-white Polish border
  ctx.fillStyle = '#f9f4e4';
  ctx.beginPath();
  ctx.arc(cx, cy, 244, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#243b24';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#c92a2a';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 208, 0, Math.PI * 2);
  ctx.stroke();

  // Iconic silhouette of Wojtek walking right while carrying a huge artillery shell
  ctx.fillStyle = '#6e4023';
  ctx.strokeStyle = '#18100c';
  ctx.lineWidth = 8;
  // Bear body + legs + head
  ctx.beginPath();
  ctx.ellipse(cx - 18, cy + 12, 58, 78, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 10, cy - 78, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 32, cy - 110, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 20, cy - 72, 22, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hind legs
  ctx.fillRect(cx - 52, cy + 72, 28, 56);
  ctx.strokeRect(cx - 52, cy + 72, 28, 56);
  ctx.fillRect(cx - 6, cy + 72, 28, 56);
  ctx.strokeRect(cx - 6, cy + 72, 28, 56);

  // Giant golden-brass artillery shell held in bear's arms
  ctx.fillStyle = '#e0ae3c';
  ctx.beginPath();
  ctx.roundRect(cx - 28, cy - 28, 120, 44, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c92a2a';
  ctx.beginPath();
  ctx.moveTo(cx + 92, cy - 28);
  ctx.lineTo(cx + 140, cy - 6);
  ctx.lineTo(cx + 92, cy + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // "22 KOMPANIA" stencil cleanly inside bottom arc
  ctx.fillStyle = '#18100c';
  ctx.font = '900 38px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('22 KOMPANIA', cx, 404);

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

  // Shared painted textures from paint.js
  const tBrick = P.tex(P.stone(11, 28, 34, 62, 128, 64));
  const tStone = P.tex(P.stone(22, 38, 14, 68, 128, 64));
  const tCobble = P.tex(P.stone(33, 215, 10, 58, 96, 48));
  const tPlanks = P.tex(P.planks(44));
  const tBeam = P.tex(P.beam(55, [28, 42, 34]));
  const tSand = P.tex(P.dirt(66, [36, 44, 66]));
  const tHill = P.tex(P.dirt(77, [32, 26, 48]));
  const tRoof = P.tex(P.roof(88));

  const mBrick = toon('#d9b88c', tBrick);
  const mStone = toon('#c7bfa8', tStone);
  const mCobble = toon('#969aa2', tCobble);
  const mPlank = toon('#c9975b', tPlanks);
  const mCrate = toon('#be8b4a', tPlanks);
  const mBeam = toon('#6b4828', tBeam);
  const mSand = toon('#d8bc84', tSand);
  const mHill = toon('#9c8462', tHill);
  const mRoof = toon('#b85d3b', tRoof);
  const mSandbag = toon('#c4a972', tStone);
  const mCanvas = toon('#dfd1ad', tSand);
  const mOlive = toon('#4d5b38');
  const mDarkIron = toon('#2b3038');
  const mBrass = toon('#e2b244');

  // Helper: slatted wooden supply/ammo crate
  function addCrate(parent, x, y, z, w = 0.85, h = 0.55, d = 0.65, ry = 0) {
    const c = sh(new THREE.Mesh(tbox(w, h, d, 0.8), mCrate));
    c.position.set(x, y + h / 2, z);
    c.rotation.y = ry;
    parent.add(c);
    return c;
  }

  // Helper: sandbag wall row
  function addSandbagWall(parent, x, z, count = 4, layers = 3, ry = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    for (let l = 0; l < layers; l++) {
      const off = (l % 2) * 0.18;
      for (let i = 0; i < count; i++) {
        const bag = sh(new THREE.Mesh(tbox(0.58, 0.22, 0.36, 0.6), mSandbag));
        bag.position.set((i - (count - 1) / 2) * 0.56 + off, 0.11 + l * 0.20, 0);
        g.add(bag);
      }
    }
    parent.add(g);
    return g;
  }

  // Helper: stylized multi-tier acacia / cypress tree
  function addTree(parent, x, z, kind = 'acacia', sc = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(sc);
    if (kind === 'acacia') {
      const trunk = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.5, 7), mBeam));
      trunk.position.y = 1.25;
      g.add(trunk);
      for (const [ox, oy, oz, rx, ry] of [
        [0, 2.55, 0, 1.45, 0.42],
        [-0.75, 2.25, 0.2, 0.95, 0.34],
        [0.82, 2.35, -0.15, 1.05, 0.36],
      ]) {
        const crown = sh(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), toon('#6e8c42')));
        crown.scale.set(rx, ry, rx);
        crown.position.set(ox, oy, oz);
        g.add(crown);
      }
    } else {
      // Italian cypress
      const trunk = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 7), mBeam));
      trunk.position.y = 0.6;
      g.add(trunk);
      const cone = sh(new THREE.Mesh(new THREE.ConeGeometry(0.62, 3.8, 9), toon('#3b5e36')));
      cone.position.y = 2.6;
      g.add(cone);
    }
    parent.add(g);
  }

  // ==========================================================================
  // ZONE 1 (z = 0): HAMADAN SUPPLY CAMP, IRAN (1942)
  // ==========================================================================
  const z1 = new THREE.Group();
  root.add(z1);

  // Textured desert camp ground + cobbled parade strip
  const gnd1 = sh(new THREE.Mesh(tbox(60, 0.4, 46, 4.0), mSand), false, true);
  gnd1.position.set(0, -0.2, -6);
  z1.add(gnd1);

  const paradeRoad = sh(new THREE.Mesh(tbox(18, 0.06, 4.2, 2.2), mStone), false, true);
  paradeRoad.position.set(0, 0.03, 0.2);
  z1.add(paradeRoad);

  // Polish Army Supply Depot Building at (0, 0, -4.6)
  const depot = new THREE.Group();
  depot.position.set(0, 0, -4.6);
  z1.add(depot);

  const depotBody = sh(new THREE.Mesh(tbox(6.6, 3.3, 2.8, 2.0), mBrick));
  depotBody.position.y = 1.65;
  depot.add(depotBody);

  // Timber corner columns & roof cornice beam
  for (const sx of [-3.22, -1.35, 1.35, 3.22]) {
    const col = sh(new THREE.Mesh(tbox(0.22, 3.32, 0.26, 1.0), mBeam));
    col.position.set(sx, 1.66, 1.38);
    depot.add(col);
  }
  const lintel = sh(new THREE.Mesh(tbox(6.9, 0.28, 3.0, 1.5), mBeam));
  lintel.position.y = 3.38;
  depot.add(lintel);

  // Terracotta hipped roof
  const depotRoof = sh(new THREE.Mesh(tbox(7.1, 0.55, 3.2, 1.8), mRoof));
  depotRoof.position.y = 3.78;
  depot.add(depotRoof);

  // Double timber depot doors + shuttered windows
  const doorFrame = sh(new THREE.Mesh(tbox(1.55, 2.15, 0.14, 1.2), mBeam));
  doorFrame.position.set(0, 1.08, 1.42);
  depot.add(doorFrame);
  const doorPlank = sh(new THREE.Mesh(tbox(1.35, 2.02, 0.16, 1.0), mPlank));
  doorPlank.position.set(0, 1.04, 1.44);
  depot.add(doorPlank);

  for (const wx of [-2.25, 2.25]) {
    const winFrame = sh(new THREE.Mesh(tbox(0.95, 1.05, 0.14, 1.0), mBeam));
    winFrame.position.set(wx, 1.68, 1.42);
    depot.add(winFrame);
    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.86), toon('#38526e'));
    winGlass.position.set(wx, 1.68, 1.50);
    depot.add(winGlass);
  }

  // Diegetic Fascia Signboard on Depot Front (Baboon Reference Standard!)
  const signIran = makeFasciaBoard(3.3, 0.70, '22ND SUPPLY CO.', 'HAMADAN · IRAN 1942', {
    bg: '#243d29', border: '#e8c35a',
  });
  signIran.position.set(0, 2.86, 1.50);
  depot.add(signIran);

  // Military canvas tents flanking the depot
  for (const [tx, tz, ry] of [[-4.8, -3.5, 0.28], [4.9, -3.6, -0.25]]) {
    const tent = new THREE.Group();
    tent.position.set(tx, 0, tz);
    tent.rotation.y = ry;
    const wall = sh(new THREE.Mesh(tbox(2.6, 1.1, 2.4, 1.5), mCanvas));
    wall.position.y = 0.55;
    tent.add(wall);
    const prism = sh(new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.35, 4), mCanvas));
    prism.rotation.y = Math.PI / 4;
    prism.position.y = 1.75;
    tent.add(prism);
    z1.add(tent);
  }

  // Sandbag revetments & supply crate stacks in Zone 1
  addSandbagWall(z1, -2.8, -1.6, 3, 3, 0.18);
  addSandbagWall(z1, 2.9, -1.5, 3, 3, -0.18);
  addCrate(z1, -2.1, 0, -2.2, 0.9, 0.55, 0.65, 0.12);
  addCrate(z1, -2.0, 0.55, -2.2, 0.75, 0.48, 0.58, -0.08);
  addCrate(z1, 2.15, 0, -2.1, 0.9, 0.55, 0.65, -0.15);

  // Acacia trees & distant Zagros mountain ridges
  addTree(z1, -5.6, -6.8, 'acacia', 1.15);
  addTree(z1, 5.4, -7.2, 'acacia', 1.2);
  addTree(z1, -3.2, -9.5, 'acacia', 0.95);
  for (const [mx, mz, mr, mh] of [[-14, -24, 9, 7.5], [-2, -26, 11, 9.2], [12, -23, 10, 8.0]]) {
    const mt = sh(new THREE.Mesh(new THREE.ConeGeometry(mr, mh, 7), toon('#b89268')), false, true);
    mt.position.set(mx, mh / 2 - 0.3, mz);
    z1.add(mt);
  }

  // ==========================================================================
  // ZONE 2 (z = -50): ALEXANDRIA HARBOUR PORT, EGYPT (1944)
  // ==========================================================================
  const z2 = new THREE.Group();
  z2.position.set(0, 0, -50);
  root.add(z2);

  // Cobblestone harbour quay + stone seawall curb
  const quay = sh(new THREE.Mesh(tbox(50, 0.8, 12, 3.0), mCobble), false, true);
  quay.position.set(0, -0.4, 1.5);
  z2.add(quay);

  const curb = sh(new THREE.Mesh(tbox(50, 0.24, 0.45, 2.0), mStone));
  curb.position.set(0, 0.12, -4.3);
  z2.add(curb);

  // Mediterranean Harbour Water
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), toon('#26699e'));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.32, -32);
  z2.add(sea);

  // Cast-iron dock bollards along the quay edge
  for (const bx of [-3.6, -1.6, 2.8, 4.6]) {
    const bol = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.52, 10), mDarkIron));
    bol.position.set(bx, 0.26, -4.1);
    z2.add(bol);
    const cap = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.16, 0.10, 10), mDarkIron));
    cap.position.set(bx, 0.52, -4.1);
    z2.add(cap);
  }

  // Port Customs Building at (-0.65, 0, -4.2) with Diegetic Fascia Signboard
  const customs = new THREE.Group();
  customs.position.set(-0.65, 0, -4.2);
  z2.add(customs);

  const cWall = sh(new THREE.Mesh(tbox(3.6, 3.4, 2.2, 1.8), mBrick));
  cWall.position.y = 1.7;
  customs.add(cWall);

  const cRoof = sh(new THREE.Mesh(tbox(3.9, 0.45, 2.5, 1.6), mRoof));
  cRoof.position.y = 3.62;
  customs.add(cRoof);

  const signPort = makeFasciaBoard(3.1, 0.68, 'ALEXANDRIA PORT', 'EMBARKATION · 1944', {
    bg: '#1b2d48', border: '#eac45a',
  });
  signPort.position.set(0, 2.82, 1.15);
  customs.add(signPort);

  // Standing "NO PETS ABOARD" Signboard at (-0.52, 0, -2.15)
  const noPetsSign = makeNoPetsSign();
  noPetsSign.position.set(-0.52, 0, -2.15);
  z2.add(noPetsSign);

  // Polish II Corps Enlistment Field Desk at (0.35, 0, -1.55)
  const desk = new THREE.Group();
  desk.position.set(0.35, 0, -1.55);
  z2.add(desk);
  const dTop = sh(new THREE.Mesh(tbox(1.35, 0.10, 0.78, 1.0), mPlank));
  dTop.position.y = 0.88;
  desk.add(dTop);
  for (const [lx, lz] of [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]]) {
    const leg = sh(new THREE.Mesh(tbox(0.10, 0.86, 0.10, 0.6), mBeam));
    leg.position.set(lx, 0.43, lz);
    desk.add(leg);
  }
  // Green Military Paybook + Red Stamp Pad on Desk
  const deskBook = sh(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.44), toon('#385734')));
  deskBook.position.set(0.10, 0.96, 0.04);
  desk.add(deskBook);
  const stampPad = sh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.16), toon('#b82828')));
  stampPad.position.set(-0.32, 0.95, 0.06);
  desk.add(stampPad);

  // Troopship MS Batory moored at (2.1, 0, -6.2) with Slatted Wooden Gangplank
  const ship = new THREE.Group();
  ship.position.set(2.1, 0, -6.2);
  z2.add(ship);

  const hull = sh(new THREE.Mesh(tbox(8.8, 2.3, 3.0, 2.5), toon('#3a4352')));
  hull.position.y = 0.85;
  ship.add(hull);
  const redBoot = sh(new THREE.Mesh(tbox(8.85, 0.38, 3.04, 2.5), toon('#962d28')));
  redBoot.position.y = -0.15;
  ship.add(redBoot);
  const deckHouse = sh(new THREE.Mesh(tbox(6.4, 1.35, 2.3, 2.0), toon('#f2ede0')));
  deckHouse.position.set(0.2, 2.65, 0);
  ship.add(deckHouse);
  // Brass portholes along hull & deckhouse
  for (let px = -2.6; px <= 3.0; px += 0.8) {
    const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), mBrass);
    ph.rotation.x = Math.PI / 2;
    ph.position.set(px, 1.35, 1.52);
    ship.add(ph);
  }
  // Ship smokestack funnel
  const funnel = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 1.85, 14), toon('#c9342c')));
  funnel.position.set(0.4, 4.15, 0);
  ship.add(funnel);
  const funnelTop = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.38, 14), mDarkIron));
  funnelTop.position.set(0.4, 4.95, 0);
  ship.add(funnelTop);

  // Slatted Wooden Gangplank connecting quay to ship deck
  const gangplank = new THREE.Group();
  gangplank.position.set(1.55, 0.55, -3.55);
  gangplank.rotation.x = 0.24;
  z2.add(gangplank);
  const gpRamp = sh(new THREE.Mesh(tbox(1.45, 0.12, 3.2, 1.2), mPlank));
  gangplank.add(gpRamp);
  for (const sx of [-0.66, 0.66]) {
    const rail = sh(new THREE.Mesh(tbox(0.08, 0.08, 3.2, 1.0), mBeam));
    rail.position.set(sx, 0.72, 0);
    gangplank.add(rail);
    for (const sz of [-1.3, 0, 1.3]) {
      const stanchion = sh(new THREE.Mesh(tbox(0.07, 0.72, 0.07, 0.5), mBeam));
      stanchion.position.set(sx, 0.36, sz);
      gangplank.add(stanchion);
    }
  }

  // ==========================================================================
  // ZONE 3 (z = -100): MONTE CASSINO EMPLACEMENT & VICTORY ROAD, ITALY (1944)
  // ==========================================================================
  const z3 = new THREE.Group();
  z3.position.set(0, 0, -100);
  root.add(z3);

  const gnd3 = sh(new THREE.Mesh(tbox(60, 0.6, 50, 4.0), mHill), false, true);
  gnd3.position.set(0, -0.3, -8);
  z3.add(gnd3);

  const road3 = sh(new THREE.Mesh(tbox(24, 0.06, 4.0, 2.4), mStone), false, true);
  road3.position.set(0, 0.03, 0.5);
  z3.add(road3);

  // Sandbagged Artillery Pit & 25-Pounder Field Howitzer at (-1.15, 0, -2.1)
  addSandbagWall(z3, -1.15, -1.15, 4, 3, 0.22);
  addSandbagWall(z3, -2.35, -2.15, 3, 3, 0.85);

  const howitzer = new THREE.Group();
  howitzer.position.set(-1.15, 0, -2.15);
  howitzer.rotation.y = 0.42;
  z3.add(howitzer);

  // Spoked artillery wheels
  for (const sx of [-0.68, 0.68]) {
    const tire = sh(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.10, 10, 18), mDarkIron));
    tire.rotation.y = Math.PI / 2;
    tire.position.set(sx, 0.58, 0);
    howitzer.add(tire);
    const hub = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 10), mOlive));
    hub.rotation.z = Math.PI / 2;
    hub.position.set(sx, 0.58, 0);
    howitzer.add(hub);
  }
  // Angled armoured gun shield
  const shield = sh(new THREE.Mesh(tbox(1.32, 1.15, 0.10, 1.0), mOlive));
  shield.position.set(0, 0.78, -0.12);
  shield.rotation.x = -0.22;
  howitzer.add(shield);

  // Split trail legs extending backward
  for (const sx of [-0.36, 0.36]) {
    const trail = sh(new THREE.Mesh(tbox(0.16, 0.16, 1.85, 1.0), mOlive));
    trail.position.set(sx, 0.28, 0.85);
    trail.rotation.x = 0.24;
    trail.rotation.y = sx * -0.22;
    howitzer.add(trail);
  }

  // Elevating & recoiling gun barrel group
  const gunBarrel = new THREE.Group();
  gunBarrel.position.set(0, 0.88, -0.15);
  gunBarrel.rotation.x = 0.38; // Aimed high toward Monte Cassino ridge
  howitzer.add(gunBarrel);

  const breech = sh(new THREE.Mesh(tbox(0.34, 0.32, 0.95, 0.8), mOlive));
  breech.position.z = 0.15;
  gunBarrel.add(breech);
  const tube = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.25, 12), mDarkIron));
  tube.rotation.x = Math.PI / 2;
  tube.position.z = -1.15;
  gunBarrel.add(tube);
  const brake = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 12), mDarkIron));
  brake.rotation.x = Math.PI / 2;
  brake.position.z = -2.30;
  gunBarrel.add(brake);

  // Muzzle blast fireball (toggled on cannon roar frames)
  const muzzleFlash = new THREE.Mesh(
    new THREE.SphereGeometry(0.65, 12, 10),
    new THREE.MeshBasicMaterial({ color: '#ffcf54' })
  );
  muzzleFlash.position.z = -2.75;
  muzzleFlash.visible = false;
  gunBarrel.add(muzzleFlash);

  // Stacked Ammo Crates & Gleaming Brass 25-Pounder Shells on Right (1.55, 0, -2.0)
  addCrate(z3, 1.65, 0, -2.25, 0.95, 0.56, 0.68, -0.18);
  addCrate(z3, 1.68, 0.56, -2.25, 0.90, 0.52, 0.64, 0.08);
  addCrate(z3, 2.55, 0, -2.05, 0.92, 0.56, 0.66, -0.32);

  // Crate that Wojtek sets down by the gun at frame >= 730
  const deliveredCrate = addCrate(z3, -0.32, 0, -1.25, 0.92, 0.54, 0.64, 0.12);
  deliveredCrate.visible = false;

  // Standing brass artillery shells beside crate stack
  for (let i = 0; i < 4; i++) {
    const shGrp = new THREE.Group();
    shGrp.position.set(0.95 + i * 0.22, 0, -1.65 + (i % 2) * 0.16);
    const casing = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.46, 10), mBrass));
    casing.position.y = 0.23;
    shGrp.add(casing);
    const tip = sh(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 10), toon('#b83426')));
    tip.position.y = 0.55;
    shGrp.add(tip);
    z3.add(shGrp);
  }

  // Diegetic Military Fascia Signpost at Monte Cassino (0.45, 0, -3.75)
  const mcPostGrp = new THREE.Group();
  mcPostGrp.position.set(0.45, 0, -3.75);
  z3.add(mcPostGrp);
  for (const sx of [-1.25, 1.25]) {
    const p = sh(new THREE.Mesh(tbox(0.16, 2.75, 0.16, 1.0), mBeam));
    p.position.set(sx, 1.375, 0);
    mcPostGrp.add(p);
  }
  const signMC = makeFasciaBoard(2.95, 0.68, 'MONTE CASSINO', '22 KOMPANIA · 1944', {
    bg: '#2c3824', border: '#e8c35a',
  });
  signMC.position.set(0, 2.42, 0.08);
  mcPostGrp.add(signMC);

  // Distant Monte Cassino Mountain & Ruined Abbey Silhouette on Ridge (z = -16)
  const abbeyHill = sh(new THREE.Mesh(new THREE.ConeGeometry(9.5, 6.8, 8), toon('#7e6c58')), false, true);
  abbeyHill.position.set(-0.5, 3.1, -16.5);
  z3.add(abbeyHill);

  const abbey = new THREE.Group();
  abbey.position.set(-0.5, 5.9, -15.8);
  z3.add(abbey);
  const aWall1 = sh(new THREE.Mesh(tbox(3.8, 1.6, 1.4, 1.5), mStone));
  abbey.add(aWall1);
  const aTower = sh(new THREE.Mesh(tbox(1.3, 2.4, 1.3, 1.5), mStone));
  aTower.position.set(-1.1, 0.4, 0);
  abbey.add(aTower);

  addTree(z3, -4.4, -5.2, 'cypress', 1.15);
  addTree(z3, 4.2, -5.6, 'cypress', 1.25);
  addTree(z3, 3.1, -7.8, 'cypress', 1.0);

  // ==========================================================================
  // ROLLING 3D POLISH 22ND SUPPLY COMPANY TRUCK WITH WOJTEK EMBLEM (Shot 7)
  // ==========================================================================
  const truck = new THREE.Group();
  truck.position.set(-12, 0, -99.2); // Driven in story.js across z = -99.2
  truck.visible = false;
  root.add(truck);

  // Chassis & Wooden Cargo Bed + Canvas Troop Canopy
  const bed = sh(new THREE.Mesh(tbox(2.7, 0.85, 1.65, 1.2), mOlive));
  bed.position.set(-0.85, 1.05, 0);
  truck.add(bed);

  const canopy = sh(new THREE.Mesh(tbox(2.65, 1.25, 1.60, 1.5), mCanvas));
  canopy.position.set(-0.85, 2.05, 0);
  truck.add(canopy);

  // Truck Cab & Engine Hood (facing +X right)
  const cab = sh(new THREE.Mesh(tbox(1.25, 1.55, 1.58, 1.2), mOlive));
  cab.position.set(1.12, 1.40, 0);
  truck.add(cab);

  const hood = sh(new THREE.Mesh(tbox(1.05, 0.92, 1.38, 1.0), mOlive));
  hood.position.set(2.22, 1.08, 0);
  truck.add(hood);

  // Cab window opening
  const cabWin = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.62), toon('#26384a'));
  cabWin.position.set(1.15, 1.72, 0.80);
  truck.add(cabWin);

  // Brass headlights on front bumper
  for (const sz of [-0.48, 0.48]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), toon('#fff4b8'));
    hl.rotation.z = Math.PI / 2;
    hl.position.set(2.76, 1.12, sz);
    truck.add(hl);
  }

  // 4 Heavy Military Truck Wheels
  const truckWheels = [];
  for (const [wx, wz] of [[-1.45, 0.84], [-1.45, -0.84], [1.95, 0.84], [1.95, -0.84]]) {
    const wGrp = new THREE.Group();
    wGrp.position.set(wx, 0.52, wz);
    const tire = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.28, 16), mDarkIron));
    tire.rotation.x = Math.PI / 2;
    wGrp.add(tire);
    const rim = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.30, 10), mOlive));
    rim.rotation.x = Math.PI / 2;
    wGrp.add(rim);
    truck.add(wGrp);
    truckWheels.push(wGrp);
  }

  // Official Painted White Circular Emblem of Wojtek Carrying an Artillery Shell on Truck Side!
  const emblemMain = makeEmblemDisc(0.64);
  emblemMain.position.set(-0.65, 1.78, 0.83);
  truck.add(emblemMain);

  return {
    root,
    howitzer,
    gunBarrel,
    muzzleFlash,
    deliveredCrate,
    truck,
    truckWheels,
  };
}
