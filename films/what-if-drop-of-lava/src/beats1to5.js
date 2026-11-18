/* ---------- SCENES FOR BEATS 1 TO 5 ---------- */

const SETS = {};

function buildBeats1To5() {
  /* === BEAT 1 (0.00 - 3.30s): HOOK — TONGS & MOLTEN DROP ABOVE OPEN MOUTH === */
  const s1 = new THREE.Group();
  const heroLeo = buildLeoHeroHead();
  heroLeo.position.set(0, -1.35, 0);
  heroLeo.userData.head.rotation.x = -0.26; // Clean upward gaze toward the drop!
  s1.add(heroLeo);

  // Surgical stainless steel tongs releasing the glowing lava drop cleanly below top headline pill
  const tongL = rbox(0.10, 1.45, 0.13, 0.04, MAT.steel);
  const tongR = rbox(0.10, 1.45, 0.13, 0.04, MAT.steel);
  const tongPivot = new THREE.Group();
  tongPivot.position.set(0, 1.85, 0.72);
  tongPivot.add(tongL, tongR);
  s1.add(tongPivot);

  // Viscous molten neck thread stretching from tongs
  const neckMat = new THREE.MeshBasicMaterial({ color: srgb(0xff7718), transparent: true, opacity: 0.94 });
  const moltenThread = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.10, 1.0, 14), neckMat);
  s1.add(moltenThread);

  const drop1 = createLavaDropRig(0.28);
  s1.add(drop1);

  // Rising heat-shimmer ember motes
  const embers1 = [];
  const emberMat = new THREE.MeshBasicMaterial({ color: srgb(0xffa726) });
  for (let i = 0; i < 16; i++) {
    const em = new THREE.Mesh(new THREE.SphereGeometry(0.025 + 0.02 * rand(i + 5), 8, 8), emberMat);
    s1.add(em);
    embers1.push(em);
  }
  scene.add(s1);
  SETS.s1 = { group: s1, heroLeo, tongL, tongR, tongPivot, moltenThread, neckMat, drop1, embers1 };

  /* === BEAT 2 (3.30 - 10.20s): 1,200°C & HONEY VISCOSITY STUDIO STAGE === */
  const s2 = new THREE.Group();
  const stageFloor = rbox(4.8, 0.32, 3.2, 0.10, MAT.plinth);
  stageFloor.position.set(0, -1.35, 0);
  s2.add(stageFloor);

  // Left side: 100°C Boiling Mug + 1x blue bar
  const mugGrp = new THREE.Group();
  mugGrp.position.set(-0.66, -0.92, 0.18);
  const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.31, 0.60, 24), MAT.mug);
  mugBody.castShadow = true;
  const mugWater = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 20), MAT.water);
  mugWater.position.y = 0.27;
  const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 20, Math.PI), MAT.mug);
  mugHandle.rotation.z = -Math.PI / 2;
  mugHandle.position.set(-0.31, 0.0, 0);
  mugGrp.add(mugBody, mugWater, mugHandle);

  const mugPuffs = [];
  for (let i = 0; i < 6; i++) {
    const pf = new THREE.Mesh(new THREE.SphereGeometry(0.08 + 0.04 * rand(i + 20), 12, 10), MAT.steam.clone());
    mugGrp.add(pf);
    mugPuffs.push(pf);
  }
  // 1x thermal reference block behind mug
  const bar100 = rbox(0.36, 0.20, 0.32, 0.06, clay(0x38bdf8, { emissive: 0x0284c7, emissiveIntensity: 0.38 }));
  bar100.position.set(-0.66, -1.08, -0.42);
  s2.add(mugGrp, bar100);

  // Center-Right: 12x Segmented Towering Lava Column + Tilting Crucible Pouring Viscous Honey Ribbon!
  const barSegs = [];
  for (let i = 0; i < 12; i++) {
    const col = new THREE.Color().setHSL(0.085 - 0.06 * (i / 11), 0.96, 0.50).convertSRGBToLinear();
    const segMat = clay(col, { emissive: col, emissiveIntensity: 0.68, roughness: 0.28 });
    const segMesh = rbox(0.44, 0.17, 0.36, 0.05, segMat);
    segMesh.position.set(-0.02, -1.08 + i * 0.19, -0.45);
    s2.add(segMesh);
    barSegs.push(segMesh);
  }

  // Graphite Crucible pouring thick viscous glowing lava ribbon onto catch basin
  const crucPivot = new THREE.Group();
  crucPivot.position.set(0.72, 0.38, 0.25);
  const crucCup = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.54, 22), MAT.crucible);
  const crucGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.10, 20),
    new THREE.MeshBasicMaterial({ color: srgb(0xff6b0f) }));
  crucGlow.position.y = 0.24;
  crucPivot.add(crucCup, crucGlow);
  s2.add(crucPivot);

  // Thick honey-like pouring ribbon + coiling molten mound below
  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: srgb(0xff5e00), emissive: srgb(0xff3800), emissiveIntensity: 1.38, roughness: 0.26, clearcoat: 0.55,
  });
  const pourRibbon = capsuleMesh(0.105, 1.35, ribbonMat, 18);
  pourRibbon.position.set(0.52, -0.35, 0.30);
  const coilPool = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.105, 14, 24), ribbonMat);
  coilPool.rotation.x = Math.PI / 2;
  coilPool.position.set(0.52, -1.10, 0.30);
  const coilTop = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), ribbonMat);
  coilTop.scale.set(1.3, 0.55, 1.3);
  coilTop.position.set(0.52, -1.02, 0.30);
  s2.add(pourRibbon, coilPool, coilTop);

  scene.add(s2);
  SETS.s2 = { group: s2, mugPuffs, barSegs, crucPivot, pourRibbon, coilPool, coilTop };

  /* === BEAT 3 (10.20 - 17.00s) & BEAT 5 (23.40 - 30.20s): SAGITTAL HEAD & LARYNX CUTAWAY === */
  const s35 = new THREE.Group();
  const sag = buildSagittalCutaway();
  s35.add(sag);

  const drop3 = createLavaDropRig(0.19);
  s35.add(drop3);

  // 28 plump vinyl-clay flash-steam spheres + 2 shockwave rings (1,700x expansion!)
  const steamBalls = [];
  for (let i = 0; i < 28; i++) {
    const sm = MAT.steam.clone();
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.09 + 0.07 * rand(i + 91), 14, 12), sm);
    s35.add(sb);
    steamBalls.push({
      mesh: sb, mat: sm,
      ang: (i / 28) * Math.PI * 2 + 0.2 * rand(i),
      spd: 0.45 + 0.85 * rand(i + 33),
      zOff: (rand(i + 55) - 0.5) * 0.35,
    });
  }
  const shockRing1 = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 36), MAT.cyanRing.clone());
  const shockRing2 = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.19, 36), MAT.cyanRing.clone());
  s35.add(shockRing1, shockRing2);

  // Beat 5: Airway warning halo + blocked blue oxygen spheres above swollen vocal cords
  const airwayHalo = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.39, 36), MAT.dangerRing.clone());
  airwayHalo.position.set(-0.08, -2.05, 0.18);
  s35.add(airwayHalo);

  const oxyBalls = [];
  const oxyMat = clay(0x38bdf8, { emissive: 0x0284c7, emissiveIntensity: 0.45, roughness: 0.2 });
  for (let i = 0; i < 10; i++) {
    const ob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), oxyMat);
    s35.add(ob);
    oxyBalls.push(ob);
  }

  scene.add(s35);
  SETS.s35 = { group: s35, sag, drop3, steamBalls, shockRing1, shockRing2, airwayHalo, oxyBalls };

  /* === BEAT 4 (17.00 - 23.40s): MACRO TONGUE PAPILLAE & LEIDENFROST VAPOR SKATE === */
  const s4 = new THREE.Group();
  // Thick cutaway slab of pink tongue muscle + sub-mucosal nerve fibers
  const tongueSlab = rbox(3.6, 0.85, 2.2, 0.22, MAT.muscle);
  tongueSlab.position.set(0, -0.78, 0);
  const mucosaTop = rbox(3.55, 0.26, 2.15, 0.10, MAT.tongue);
  mucosaTop.position.set(0, -0.32, 0);
  s4.add(tongueSlab, mucosaTop);

  // 64 individual rounded taste-bud papillae + golden nerve filaments underneath!
  const papillae = [];
  for (let ix = 0; ix < 16; ix++) {
    for (let iz = 0; iz < 4; iz++) {
      const px = -1.35 + (ix / 15) * 2.70 + (rand(ix * 7 + iz) - 0.5) * 0.05;
      const pz = -0.45 + (iz / 3) * 0.90 + (rand(ix * 11 + iz) - 0.5) * 0.05;
      const pMat = wetClay(0xe8647c);
      const pap = capsuleMesh(0.068, 0.11, pMat, 12);
      pap.position.set(px, -0.14, pz);
      s4.add(pap);

      // Front-row cutaway golden nerve filament descending into tongue slab
      let nerve = null, nMat = null;
      if (iz === 3) {
        nMat = new THREE.MeshBasicMaterial({ color: srgb(0xfacc15) });
        nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 8), nMat);
        nerve.position.set(px, -0.50, pz + 0.12);
        s4.add(nerve);
      }
      papillae.push({ mesh: pap, mat: pMat, nerve, nMat, x: px, z: pz });
    }
  }

  // Bleached third-degree white sear ribbon trailing behind the skating drop
  const searTrack = rbox(2.4, 0.06, 0.52, 0.025, MAT.searWhite);
  searTrack.position.set(0, -0.17, 0.08);
  s4.add(searTrack);

  // Levitating lava drop + shimmering pressurized Leidenfrost vapor cushion disc + radial steam jets
  const drop4 = createLavaDropRig(0.32);
  const vaporDiscMat = new THREE.MeshBasicMaterial({ color: srgb(0xdbeafe), transparent: true, opacity: 0.84, side: THREE.DoubleSide });
  const vaporDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.07, 28), vaporDiscMat);
  const skateJets = [];
  for (let i = 0; i < 12; i++) {
    const sj = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.steam.clone());
    s4.add(sj);
    skateJets.push(sj);
  }
  s4.add(drop4, vaporDisc);

  scene.add(s4);
  SETS.s4 = { group: s4, papillae, searTrack, drop4, vaporDisc, skateJets };
}
