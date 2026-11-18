/* ---------- HERO RIGS: LAVA DROP, OBSIDIAN SHARDS, LEO HEAD & SAGITTAL ANATOMY ---------- */

// Soft radial glow sprite texture for molten incandescence
function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0.0, "rgba(255, 245, 190, 1.0)");
  grd.addColorStop(0.28, "rgba(255, 130, 25, 0.72)");
  grd.addColorStop(0.65, "rgba(255, 65, 0, 0.22)");
  grd.addColorStop(1.0, "rgba(255, 40, 0, 0.0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const GLOW_TEX = makeGlowTexture();

// 1. Hero Lava Drop Rig (supports stretch, basalt crust platelets, and continuous cooling 0..1 to obsidian)
function createLavaDropRig(radius = 0.34) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: srgb(0xff5e00),
    emissive: srgb(0xff3800),
    emissiveIntensity: 1.50,
    roughness: 0.30,
    metalness: 0.05,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
  });

  // Teardrop lathe profile
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const v = i / 24; // 0 bottom -> 1 top tip
    const ang = v * Math.PI;
    const pinch = v > 0.55 ? 1.0 - 0.36 * Math.pow((v - 0.55) / 0.45, 1.5) : 1.0;
    const rx = Math.max(0.0001, Math.sin(ang) * radius * pinch);
    const ry = -Math.cos(ang) * radius * (v > 0.5 ? 1.24 : 0.96);
    pts.push(new THREE.Vector2(rx, ry));
  }
  const core = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
  grp.add(core);

  // Cooling dark basalt crust islands hugging surface
  const crustMat = clay(0x1b0f0e, { emissive: 0x6e1400, emissiveIntensity: 0.28, roughness: 0.74, clearcoat: 0.08 });
  const crusts = [];
  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * Math.PI * 2 + rand(i + 11) * 0.4;
    const theta = 0.65 + rand(i + 31) * 1.65;
    const p = new THREE.Mesh(new THREE.SphereGeometry(radius * (0.22 + 0.09 * rand(i + 71)), 10, 8), crustMat);
    p.scale.set(1.30, 0.30, 1.08);
    const rr = radius * 0.95;
    p.position.set(Math.sin(theta) * Math.cos(phi) * rr, -Math.cos(theta) * rr * 0.95, Math.sin(theta) * Math.sin(phi) * rr);
    p.lookAt(0, 0, 0);
    grp.add(p);
    crusts.push(p);
  }

  // Incandescent halo sprite
  const haloMat = new THREE.SpriteMaterial({ map: GLOW_TEX, color: srgb(0xff7714), transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(radius * 5.2, radius * 5.2, 1);
  grp.add(halo);

  const cHot = srgb(0xff5e00);
  const cMid = srgb(0x7c1105);
  const cCold = srgb(0x0c1322);
  const eHot = srgb(0xff3800);
  const eCold = srgb(0x050a14);

  grp.userData.setState = (t, cool = 0, stretchY = 1.0, crustAmt = 0.38) => {
    const k = clamp(cool, 0, 1);
    if (k < 0.55) {
      mat.color.copy(cHot).lerp(cMid, k / 0.55);
    } else {
      mat.color.copy(cMid).lerp(cCold, (k - 0.55) / 0.45);
    }
    const pulse = 1.0 + 0.10 * Math.sin(t * 7.5);
    mat.emissive.copy(eHot).lerp(eCold, Math.pow(k, 0.72));
    mat.emissiveIntensity = (1.50 * pulse) * Math.pow(1.0 - k, 1.65);
    mat.roughness = lerp(0.30, 0.06, k);
    mat.clearcoat = lerp(0.32, 1.0, k);
    mat.clearcoatRoughness = lerp(0.30, 0.04, k);
    mat.metalness = lerp(0.04, 0.26, k);

    core.scale.set(1.0 / Math.sqrt(stretchY), stretchY, 1.0 / Math.sqrt(stretchY));
    haloMat.opacity = 0.72 * Math.pow(1.0 - k, 1.7);
    const cScale = clamp(crustAmt * (1.0 - k * 0.85), 0.001, 1.4);
    crusts.forEach((c, idx) => {
      c.visible = k < 0.90;
      c.scale.set(1.30 * cScale, 0.28, 1.08 * cScale);
      c.rotation.z = t * 0.4 * (idx % 2 ? 1 : -1);
    });
  };
  return grp;
}

// 2. Closed-Manifold Faceted Obsidian Glass Shatter Cluster (9 sharp angular shards for Beat 8 & Beat 9)
function createObsidianShardGeo(seed, scale = 0.18) {
  // Closed Octahedron stretched into sharp volcanic-glass arrowhead facets (zero open caps or flipped normals!)
  const g = new THREE.OctahedronGeometry(scale, 0);
  const pos = g.attributes.position;
  const sx = 0.55 + 0.35 * rand(seed * 11 + 1);
  const sy = 1.25 + 0.55 * rand(seed * 11 + 2);
  const sz = 0.42 + 0.30 * rand(seed * 11 + 3);
  const vMap = new Map();
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;
    if (!vMap.has(key)) {
      const k = vMap.size + 1;
      vMap.set(key, [
        vx * sx + (rand(seed * 29 + k) - 0.5) * scale * 0.18,
        vy * sy + (vy > 0 ? 0.15 * scale : 0),
        vz * sz + (rand(seed * 37 + k) - 0.5) * scale * 0.14,
      ]);
    }
    const nv = vMap.get(key);
    pos.setXYZ(i, nv[0], nv[1], nv[2]);
  }
  const nonIdx = g.index ? g.toNonIndexed() : g;
  nonIdx.computeVertexNormals();
  return nonIdx;
}

function createObsidianCluster(count = 9, baseScale = 0.17) {
  const grp = new THREE.Group();
  const shards = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(createObsidianShardGeo(i + 1, baseScale * (0.85 + 0.30 * rand(i + 9))), MAT.obsidian);
    mesh.castShadow = true;
    const phi = (i / count) * Math.PI * 2 + 0.25 * rand(i + 5);
    const elev = (rand(i + 19) - 0.44) * 1.15;
    // Keep z spread compact so shards stay cleanly in the studio focal plane!
    const dir = new THREE.Vector3(
      Math.cos(phi) * Math.cos(elev),
      Math.sin(elev) * 0.95,
      Math.sin(phi) * Math.cos(elev) * 0.42
    ).normalize();
    const rotAxis = new THREE.Vector3(rand(i + 41) - 0.5, rand(i + 42) - 0.5, rand(i + 43) - 0.5).normalize();
    grp.add(mesh);
    shards.push({
      mesh, dir, rotAxis,
      speed: 0.72 + 0.46 * rand(i + 61),
      spin: 2.0 + 2.6 * rand(i + 81),
      baseRot: [rand(i) * 3, rand(i + 2) * 3, rand(i + 4) * 3],
    });
  }
  grp.userData.shards = shards;
  grp.userData.update = (burstProgress) => {
    const raw = clamp(burstProgress, 0, 1);
    const p = ease.out(raw);
    shards.forEach((s) => {
      const dist = 0.08 + p * 0.68 * s.speed;
      s.mesh.position.copy(s.dir).multiplyScalar(dist);
      s.mesh.position.y -= raw * raw * 0.16;
      s.mesh.rotation.set(
        s.baseRot[0] + p * s.spin * s.rotAxis.x,
        s.baseRot[1] + p * s.spin * s.rotAxis.y,
        s.baseRot[2] + p * s.spin * s.rotAxis.z
      );
    });
  };
  return grp;
}

// 3. Leo Open-Mouth Hero Head (Beat 1: clean ZackD vinyl-clay character gazing up at lava drop)
function buildLeoHeroHead() {
  const root = new THREE.Group();

  // Shoulders & neck
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.65, 32, 24), MAT.shirt);
  torso.scale.set(1.05, 0.68, 0.62);
  torso.position.set(0, -2.22, -0.18);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.12, 14, 32), MAT.collar);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, -1.38, 0.02);
  const neck = capsuleMesh(0.50, 0.78, MAT.skin, 24);
  neck.position.set(0, -1.02, -0.04);
  root.add(torso, collar, neck);

  // Head pivot (gently tilted up so face, eyes, brows, hair AND open mouth read clearly!)
  const head = new THREE.Group();
  head.position.set(0, 0.02, 0);

  // Cranium + smooth sculpted cheeks
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.26, 36, 32), MAT.skin);
  cranium.scale.set(0.96, 1.06, 0.98);
  cranium.position.set(0, 0.32, -0.06);
  head.add(cranium);

  // Smooth rounded lower jaw & chin (high-subdivision sphere so zero polygon faceting!)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.84, 32, 26), MAT.skin);
  jaw.scale.set(0.96, 0.66, 0.88);
  jaw.position.set(0, -0.72, 0.20);
  head.add(jaw);

  // Sculpted dark mouth cavity recessed cleanly inside open jaws
  const mouthCavMat = new THREE.MeshBasicMaterial({ color: srgb(0x22050c) });
  const mouthCav = new THREE.Mesh(new THREE.SphereGeometry(0.56, 28, 22), mouthCavMat);
  mouthCav.scale.set(0.96, 0.78, 0.62);
  mouthCav.position.set(0, -0.34, 0.68);
  head.add(mouthCav);

  // Neat full oval lip rim framing the open mouth cleanly (tilted so BOTH upper & lower lips sit proud of cranium/jaw!)
  const lipRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.075, 18, 36), wetClay(0xd66874));
  lipRing.scale.set(1.05, 0.72, 0.85);
  lipRing.position.set(0, -0.34, 1.08);
  lipRing.rotation.x = 0.38;
  head.add(lipRing);

  // Upper & lower teeth arches inside the lips
  for (let side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = -0.58 + (i / 5) * 1.16;
      const tooth = rbox(0.10, 0.11, 0.08, 0.028, MAT.tooth);
      tooth.position.set(
        Math.sin(a) * 0.34,
        side > 0 ? -0.11 - Math.abs(a) * 0.03 : -0.56 + Math.abs(a) * 0.03,
        0.84 + Math.cos(a) * 0.24 - (side > 0 ? 0 : 0.10)
      );
      tooth.rotation.y = a;
      head.add(tooth);
    }
  }

  // Smooth plump pink tongue & uvula inside open mouth
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), MAT.tongue);
  tongue.scale.set(0.95, 0.36, 1.05);
  tongue.position.set(0, -0.48, 0.76);
  tongue.rotation.x = 0.18;
  const uvula = capsuleMesh(0.052, 0.12, MAT.mucosa, 14);
  uvula.position.set(0, -0.12, 0.68);
  head.add(tongue, uvula);

  // Rounded ZackD nose & ears
  const nose = capsuleMesh(0.155, 0.22, MAT.skin, 20);
  nose.rotation.x = -0.26;
  nose.position.set(0, 0.24, 1.16);
  head.add(nose);
  for (let sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), MAT.skin);
    ear.scale.set(0.45, 0.95, 0.68);
    ear.position.set(sx * 1.20, 0.24, -0.04);
    head.add(ear);
  }

  // Expressive vinyl eyes with flush flattened iris/pupil discs looking UP at the drop!
  const brows = [];
  for (let sx of [-1, 1]) {
    const eyeGrp = new THREE.Group();
    eyeGrp.position.set(sx * 0.44, 0.56, 0.99);
    eyeGrp.rotation.x = -0.30; // gaze directed upward toward the hovering lava drop!
    const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 20), MAT.eyeWhite);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.118, 20, 16), MAT.iris);
    iris.scale.set(1.0, 1.0, 0.26);
    iris.position.set(-sx * 0.02, 0.03, 0.186);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), MAT.pupil);
    pupil.scale.set(1.0, 1.0, 0.26);
    pupil.position.set(-sx * 0.02, 0.035, 0.202);
    const spec = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    spec.position.set(-sx * 0.02 + 0.038, 0.075, 0.216);
    eyeGrp.add(eyeball, iris, pupil, spec);
    head.add(eyeGrp);

    // Worried upturned eyebrow on clean skin forehead!
    const brow = capsuleMesh(0.058, 0.30, MAT.hair, 14);
    brow.position.set(sx * 0.45, 0.92, 1.04);
    brow.rotation.z = Math.PI / 2 + sx * -0.26;
    head.add(brow);
    brows.push(brow);
  }

  // Solid sculpted dark espresso vinyl-clay hair volume (closed manifold spheres + soft swept tuft — zero thin shell edges!)
  const hairMain = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 26), MAT.hair);
  hairMain.scale.set(0.99, 1.02, 1.02);
  hairMain.position.set(0, 0.50, -0.22);
  head.add(hairMain);
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.32 - Math.abs(i - 2) * 0.03, 20, 16), MAT.hair);
    puff.scale.set(1.15, 0.72, 1.25);
    puff.position.set(-0.56 + i * 0.28, 1.32 - Math.abs(i - 2) * 0.08, 0.36 - Math.abs(i - 2) * 0.10);
    puff.rotation.set(-0.22, 0, (i - 2) * -0.18);
    head.add(puff);
  }

  root.add(head);
  root.userData = { head, tongue, brows, jaw };
  return root;
}

// 4. ZackD Sagittal Half-Head & Neck Cutaway (Beat 3 & Beat 5)
function buildSagittalCutaway() {
  const grp = new THREE.Group();

  // Outer sagittal head silhouette (facing LEFT so drop enters from left into open mouth!)
  const prof = new THREE.Shape();
  prof.moveTo(-1.15, 0.85);                     // forehead
  prof.quadraticCurveTo(-1.25, 1.85, -0.10, 2.05); // crown
  prof.quadraticCurveTo(1.35, 2.05, 1.55, 0.80);   // occiput
  prof.quadraticCurveTo(1.55, -0.35, 1.05, -1.05); // nape
  prof.lineTo(0.95, -3.40);                     // back of neck
  prof.lineTo(-0.55, -3.40);                    // front of neck
  prof.lineTo(-0.58, -1.75);                    // under chin
  prof.quadraticCurveTo(-1.28, -1.68, -1.32, -1.18); // chin
  prof.lineTo(-1.12, -0.95);                    // lower lip
  // Open oral & pharyngeal cavity carved inward!
  prof.lineTo(-0.35, -0.92);
  prof.quadraticCurveTo(0.22, -0.95, 0.35, -1.55); // tongue base -> pharynx
  prof.lineTo(0.35, -3.38);                     // esophagus anterior border
  prof.lineTo(0.68, -3.38);                     // posterior pharyngeal wall
  prof.lineTo(0.68, -0.55);                     // nasopharynx
  prof.quadraticCurveTo(0.45, 0.05, -0.35, -0.02); // hard palate roof
  prof.lineTo(-1.15, -0.05);                    // upper lip
  prof.lineTo(-1.48, 0.25);                     // nose tip
  prof.lineTo(-1.15, 0.85);                     // nose bridge

  const headShell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prof, { depth: 0.75, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.09, bevelSegments: 5 }),
    MAT.skin
  );
  headShell.position.z = -0.82;
  grp.add(headShell);

  // Inner dermal cut-face rim
  const cutFace = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prof, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }),
    MAT.skinCut
  );
  cutFace.position.z = -0.04;
  grp.add(cutFace);

  // Anatomical cranial vault cross-section + soft pink cerebrum slice inside upper skull!
  const skullVault = new THREE.Mesh(new THREE.SphereGeometry(0.98, 24, 18), MAT.bone);
  skullVault.scale.set(1.12, 0.78, 0.22);
  skullVault.position.set(0.16, 1.08, -0.02);
  const brainSlice = new THREE.Mesh(new THREE.SphereGeometry(0.84, 24, 18), wetClay(0xe995a6));
  brainSlice.scale.set(1.10, 0.74, 0.24);
  brainSlice.position.set(0.16, 1.08, 0.01);
  grp.add(skullVault, brainSlice);

  // Ivory hard palate + mandible + cervical spine vertebrae cross-sections
  const palateBone = rbox(1.15, 0.22, 0.32, 0.08, MAT.bone);
  palateBone.position.set(-0.52, 0.14, -0.10);
  const jawBone = rbox(0.55, 0.42, 0.34, 0.12, MAT.bone);
  jawBone.position.set(-1.02, -1.30, -0.10);
  const spineGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const vert = rbox(0.36, 0.34, 0.38, 0.08, MAT.bone);
    vert.position.set(1.02, -0.95 - i * 0.44, -0.12);
    spineGroup.add(vert);
  }
  grp.add(palateBone, jawBone, spineGroup);

  // Upper & lower cutaway incisors
  const upperIncisor = rbox(0.14, 0.26, 0.20, 0.04, MAT.tooth);
  upperIncisor.position.set(-1.02, -0.14, -0.02);
  const lowerIncisor = rbox(0.14, 0.24, 0.20, 0.04, MAT.tooth);
  lowerIncisor.position.set(-1.02, -0.98, -0.02);
  grp.add(upperIncisor, lowerIncisor);

  // Plump sculpted wet pink tongue + surface sear patch
  const tongue = rbox(1.18, 0.46, 0.52, 0.20, MAT.tongue);
  tongue.position.set(-0.34, -0.78, -0.06);
  tongue.rotation.z = -0.08;
  const searSpot = rbox(0.56, 0.09, 0.38, 0.04, MAT.searWhite);
  searSpot.position.set(-0.42, -0.53, 0.02);
  searSpot.scale.set(0.001, 1, 1);
  grp.add(tongue, searSpot);

  // Anterior Trachea / Larynx airway (with C-cartilage rings & inflatable pink vocal/laryngeal cushions!)
  const tracheaBack = rbox(0.52, 1.85, 0.40, 0.08, MAT.mucosa);
  tracheaBack.position.set(-0.08, -2.52, -0.26);
  grp.add(tracheaBack);

  const larynxLeft = capsuleMesh(0.14, 0.55, MAT.larynx, 16);
  larynxLeft.position.set(-0.28, -2.05, 0.02);
  const larynxRight = capsuleMesh(0.14, 0.55, MAT.larynx, 16);
  larynxRight.position.set(0.12, -2.05, 0.02);
  grp.add(larynxLeft, larynxRight);

  // Epiglottis flap
  const epiglottis = capsuleMesh(0.07, 0.36, MAT.larynx, 12);
  epiglottis.position.set(-0.18, -1.52, 0.02);
  epiglottis.rotation.z = -0.45;
  grp.add(epiglottis);

  for (let i = 0; i < 4; i++) {
    const cRing = rbox(0.12, 0.14, 0.44, 0.04, MAT.cartilage);
    cRing.position.set(-0.38, -2.35 - i * 0.26, -0.02);
    grp.add(cRing);
  }

  // Posterior Esophagus tube behind trachea
  const esophWallL = capsuleMesh(0.08, 1.95, MAT.muscle, 12);
  esophWallL.position.set(0.32, -2.48, 0.02);
  const esophWallR = capsuleMesh(0.09, 1.95, MAT.muscle, 12);
  esophWallR.position.set(0.66, -2.48, 0.02);
  grp.add(esophWallL, esophWallR);

  grp.userData = { tongue, searSpot, larynxLeft, larynxRight, epiglottis };
  return grp;
}
