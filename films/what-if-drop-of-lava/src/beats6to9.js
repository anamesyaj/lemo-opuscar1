/* ---------- SCENES FOR BEATS 6 TO 9 & MASTER 3D FRAME UPDATE ---------- */

function buildBeats6To9() {
  /* === BEAT 6 (30.20 - 36.80s): ESOPHAGUS TUBE SNAG & DEEP WALL CRATER === */
  const s6 = new THREE.Group();
  // Vertical cutaway esophageal muscular tube (left & right layered walls + rear mucosa)
  const backLumen = rbox(1.15, 3.6, 0.28, 0.10, MAT.mucosa);
  backLumen.position.set(0, 0, -0.28);
  s6.add(backLumen);

  const wallSegsL = [], wallSegsR = [];
  for (let i = 0; i < 14; i++) {
    const wy = 1.55 - i * 0.24;
    const outerL = rbox(0.26, 0.25, 0.42, 0.07, MAT.muscle);
    const innerL = rbox(0.16, 0.24, 0.44, 0.06, MAT.tongue);
    const grpL = new THREE.Group();
    outerL.position.x = -0.12; innerL.position.x = 0.06;
    grpL.position.set(-0.56, wy, 0);
    grpL.add(outerL, innerL);
    s6.add(grpL);
    wallSegsL.push({ grp: grpL, baseY: wy });

    const outerR = rbox(0.28, 0.25, 0.42, 0.07, MAT.muscle);
    const innerRMat = wetClay(0xe25b74);
    const innerR = rbox(0.16, 0.24, 0.44, 0.06, innerRMat);
    const grpR = new THREE.Group();
    outerR.position.x = 0.12; innerR.position.x = -0.06;
    grpR.position.set(0.56, wy, 0);
    grpR.add(outerR, innerR);
    s6.add(grpR);
    wallSegsR.push({ grp: grpR, innerMat: innerRMat, baseY: wy });
  }

  // Deep focal charred crater + glowing ember rim on right esophageal wall
  const craterGrp = new THREE.Group();
  craterGrp.position.set(0.46, -0.18, 0.06);
  const craterCore = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), MAT.charDark);
  craterCore.scale.set(0.75, 1.15, 0.65);
  const craterRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 12, 24),
    clay(0xff5500, { emissive: 0xff3d00, emissiveIntensity: 1.2, roughness: 0.4 }));
  craterRim.rotation.y = Math.PI / 2;
  craterGrp.add(craterCore, craterRim);
  s6.add(craterGrp);

  // Sticky molten taffy strands stretching between drop and esophageal wall
  const strands6 = [];
  const strandMat = new THREE.MeshBasicMaterial({ color: srgb(0xff6208) });
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 1.0, 10), strandMat);
    s6.add(st);
    strands6.push(st);
  }
  const drop6 = createLavaDropRig(0.26);
  s6.add(drop6);

  scene.add(s6);
  SETS.s6 = { group: s6, wallSegsL, wallSegsR, craterGrp, strands6, drop6 };

  /* === BEAT 7 (36.80 - 44.10s): MYTH BUSTED — STOMACH CUTAWAY, RED X & 1,000 JOULES === */
  const s7 = new THREE.Group();
  // Stylized cutaway torso on left-center
  const torsoCut = rbox(1.95, 2.55, 0.85, 0.38, MAT.skin);
  torsoCut.position.set(-0.42, 0.12, -0.35);
  const torsoMuscle = rbox(1.68, 2.28, 0.14, 0.28, MAT.skinCut);
  torsoMuscle.position.set(-0.42, 0.12, 0.05);
  s7.add(torsoCut, torsoMuscle);

  // Rib arches framing upper chest
  for (let side of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      const rib = rbox(0.48, 0.10, 0.16, 0.04, MAT.bone);
      rib.position.set(-0.42 + side * 0.54, 1.02 - r * 0.24, 0.16);
      rib.rotation.z = side * -0.18;
      s7.add(rib);
    }
  }

  // Sculpted J-shaped pink stomach cutaway + green gastric pool
  const stomachOuter = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 20), MAT.muscle);
  stomachOuter.scale.set(1.08, 0.88, 0.55);
  stomachOuter.position.set(-0.36, 0.18, 0.18);
  const stomachCav = new THREE.Mesh(new THREE.SphereGeometry(0.50, 22, 18), MAT.mucosa);
  stomachCav.scale.set(1.05, 0.84, 0.45);
  stomachCav.position.set(-0.36, 0.18, 0.24);
  const stomachEsoph = capsuleMesh(0.11, 0.75, MAT.muscle, 14);
  stomachEsoph.position.set(-0.46, 0.82, 0.18);
  const acidPool7 = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), MAT.acid);
  acidPool7.scale.set(1.06, 0.75, 0.55);
  acidPool7.position.set(-0.36, 0.16, 0.28);
  s7.add(stomachOuter, stomachCav, stomachEsoph, acidPool7);

  // Dashed "Hollywood melt-through" laser path exiting belly downward
  const mythDashes = [];
  const dashMat = new THREE.MeshBasicMaterial({ color: srgb(0xff5e00), transparent: true, opacity: 0.90 });
  for (let i = 0; i < 6; i++) {
    const d = capsuleMesh(0.045, 0.14, dashMat, 10);
    d.position.set(-0.36, -0.15 - i * 0.26, 0.34);
    s7.add(d);
    mythDashes.push(d);
  }

  // Chunky 3D Red "X" Stamp slamming onto the myth path!
  const xStamp = new THREE.Group();
  xStamp.position.set(-0.36, -0.72, 0.50);
  const xBar1 = rbox(0.78, 0.20, 0.18, 0.06, MAT.redBadge);
  xBar1.rotation.z = Math.PI / 4;
  const xBar2 = rbox(0.78, 0.20, 0.18, 0.06, MAT.redBadge);
  xBar2.rotation.z = -Math.PI / 4;
  xStamp.add(xBar1, xBar2);
  s7.add(xStamp);

  // Right side: 1,000 Joules Energy Battery Gauge + Tiny 0.5g Water Drop
  const gaugeFrame = rbox(0.56, 1.52, 0.28, 0.10, MAT.plinth);
  gaugeFrame.position.set(0.84, 0.35, 0.10);
  s7.add(gaugeFrame);
  const jouleSegs = [];
  for (let i = 0; i < 6; i++) {
    const jm = rbox(0.38, 0.18, 0.20, 0.05, MAT.goldBar.clone());
    jm.position.set(0.84, -0.24 + i * 0.23, 0.20);
    s7.add(jm);
    jouleSegs.push(jm);
  }
  // Pea-sized 0.5g water droplet below gauge
  const waterDrop = createLavaDropRig(0.16);
  waterDrop.children[0].material = clay(0x38bdf8, { roughness: 0.14, clearcoat: 0.9 });
  waterDrop.children.slice(1).forEach((c) => { c.visible = false; });
  waterDrop.position.set(0.84, -0.78, 0.25);
  s7.add(waterDrop);

  scene.add(s7);
  SETS.s7 = { group: s7, mythDashes, dashMat, xStamp, jouleSegs, waterDrop };

  /* === BEAT 8 (44.10 - 51.40s): STOMACH ACID QUENCH & OBSIDIAN SHATTER (NATIVE MOVE!) === */
  const s8 = new THREE.Group();
  // Deep curved rugae folds of inner stomach chamber
  const chamberBack = new THREE.Mesh(new THREE.SphereGeometry(2.35, 32, 24, 0, Math.PI, 0, Math.PI), MAT.mucosa);
  chamberBack.rotation.y = Math.PI;
  chamberBack.scale.set(0.88, 1.15, 0.65);
  chamberBack.position.set(0, 0.15, -0.55);
  s8.add(chamberBack);

  for (let i = 0; i < 7; i++) {
    const ruga = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.085, 12, 28, Math.PI * 0.78), MAT.muscle);
    ruga.position.set(0, 1.25 - i * 0.42, -0.45);
    ruga.rotation.set(0.25, Math.PI, 0);
    s8.add(ruga);
  }

  // Cutaway emerald-lime gastric acid cross-section behind z = +0.06 so foreground obsidian shards stay jet-black & crisp!
  const acidBlock = rbox(2.65, 1.95, 0.82, 0.22, MAT.acid);
  acidBlock.position.set(0, -0.78, -0.35);
  const acidMeniscus = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.07, 32),
    new THREE.MeshPhysicalMaterial({ color: srgb(0xa3e635), emissive: srgb(0x365314), emissiveIntensity: 0.35, transparent: true, opacity: 0.68, roughness: 0.08, clearcoat: 1.0 }));
  acidMeniscus.scale.set(1.0, 1.0, 0.36);
  acidMeniscus.position.set(0, 0.18, -0.18);
  s8.add(acidBlock, acidMeniscus);

  // Drop that cools continuously from glowing 1200°C clay -> solid mirror-black obsidian!
  const drop8 = createLavaDropRig(0.34);
  s8.add(drop8);

  // 9 razor-sharp closed-manifold obsidian shards that burst outward at t = 50.05s!
  const obsidian8 = createObsidianCluster(9, 0.19);
  s8.add(obsidian8);

  // Thermal-shock fracture flash ring + rising quench bubbles
  const crackFlash = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.50, 32),
    new THREE.MeshBasicMaterial({ color: srgb(0xe0f2fe), transparent: true, opacity: 0, side: THREE.DoubleSide }));
  s8.add(crackFlash);

  const quenchBubbles = [];
  for (let i = 0; i < 22; i++) {
    const qb = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.05 * rand(i + 120), 12, 10), MAT.steam.clone());
    s8.add(qb);
    quenchBubbles.push(qb);
  }

  scene.add(s8);
  SETS.s8 = { group: s8, acidMeniscus, drop8, obsidian8, crackFlash, quenchBubbles };

  /* === BEAT 9 (51.40 - 60.00s): BOOKEND VERDICT — 3 REAL RISKS & TWIN PEDESTALS === */
  const s9 = new THREE.Group();
  // Upper-center: Clean stylized cutaway bust of Leo showing all 3 hazard zones!
  const bustGrp = new THREE.Group();
  bustGrp.position.set(0, 0.82, -0.32);

  const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 20), MAT.skin);
  bHead.position.set(0, 0.94, 0);
  const bHair = new THREE.Mesh(new THREE.SphereGeometry(0.47, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), MAT.hair);
  bHair.position.set(0, 0.98, -0.02);
  const bNeck = capsuleMesh(0.19, 0.34, MAT.skinCut, 14);
  bNeck.position.set(0, 0.46, 0);
  const bTorso = rbox(1.48, 1.24, 0.60, 0.28, MAT.shirt);
  bTorso.position.set(0, -0.24, -0.08);
  const bCut = rbox(1.08, 1.02, 0.12, 0.20, MAT.skinCut);
  bCut.position.set(0, -0.22, 0.22);

  // Internal mini-organs (larynx, esophagus, stomach)
  const miniAirway = capsuleMesh(0.072, 0.26, MAT.larynx, 12);
  miniAirway.position.set(-0.08, 0.44, 0.26);
  const miniEsoph = capsuleMesh(0.062, 0.50, MAT.muscle, 12);
  miniEsoph.position.set(0.08, 0.12, 0.26);
  const miniStomach = new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), MAT.mucosa);
  miniStomach.scale.set(1.15, 0.85, 0.55);
  miniStomach.position.set(0.10, -0.36, 0.28);
  bustGrp.add(bHead, bHair, bNeck, bTorso, bCut, miniAirway, miniEsoph, miniStomach);

  // 3 Glowing Diagnostic Callout Rings (1: Airway, 2: Esophagus, 3: Stomach Obsidian)
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.21, 32), MAT.dangerRing.clone());
  ring1.position.set(-0.08, 0.44, 0.38);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.21, 32), MAT.dangerRing.clone());
  ring2.position.set(0.08, 0.08, 0.38);
  const ring3 = new THREE.Mesh(new THREE.RingGeometry(0.23, 0.29, 32), MAT.cyanRing.clone());
  ring3.position.set(0.10, -0.36, 0.42);
  bustGrp.add(ring1, ring2, ring3);
  s9.add(bustGrp);

  // Mid-lower Twin Museum Pedestals cleanly framed above caption zone (Bookending Beat 1!)
  const pedL = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.46, 0.24, 28), MAT.plinth);
  pedL.position.set(-0.54, -0.62, 0.35);
  const pedR = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.46, 0.24, 28), MAT.plinth);
  pedR.position.set(0.54, -0.62, 0.35);
  s9.add(pedL, pedR);

  const bookendLava = createLavaDropRig(0.21);
  bookendLava.position.set(-0.54, -0.18, 0.35);
  const bookendObsidian = createObsidianCluster(7, 0.13);
  bookendObsidian.position.set(0.54, -0.20, 0.35);
  s9.add(bookendLava, bookendObsidian);

  scene.add(s9);
  SETS.s9 = { group: s9, bustGrp, ring1, ring2, ring3, bookendLava, bookendObsidian };
}

function hideAllSets() {
  Object.values(SETS).forEach((s) => { s.group.visible = false; });
}

function update3DScene(t) {
  hideAllSets();
  gl.toneMappingExposure = 1.04;
  // Subtle handheld studio drift (deterministic noise1)
  const driftX = noise1(t * 0.9, 3) * 0.03;
  const driftY = noise1(t * 0.85, 9) * 0.03;

  if (t < 3.30) {
    /* --- BEAT 1: HOOK --- */
    const s = SETS.s1;
    s.group.visible = true;
    const u = seg(t, 0.0, 3.30);
    const openK = ease.out(seg(t, 0.20, 0.78));
    const fallK = ease.inOut(seg(t, 0.58, 3.25));

    // Tongs open cleanly and release drop right below the top headline pill
    s.tongL.position.set(-0.22 - openK * 0.20, 0, 0);
    s.tongL.rotation.z = -0.12 - openK * 0.20;
    s.tongR.position.set(0.22 + openK * 0.20, 0, 0);
    s.tongR.rotation.z = 0.12 + openK * 0.20;

    const dropY = lerp(0.68, -1.24, fallK);
    const stretch = 1.0 + 0.30 * Math.sin(seg(t, 0.22, 0.98) * Math.PI);
    s.drop1.position.set(0, dropY, 0.72);
    s.drop1.userData.setState(t, 0.0, stretch, 0.38);

    // Viscous thread stretches from tongs tip (y = 1.12) until t = 0.92s then snaps!
    if (t < 0.94) {
      s.moltenThread.visible = true;
      const topY = 1.12;
      const len = Math.max(0.04, topY - dropY);
      s.moltenThread.position.set(0, (topY + dropY) * 0.5, 0.72);
      s.moltenThread.scale.set(1.0 - 0.75 * seg(t, 0.25, 0.94), len, 1.0 - 0.75 * seg(t, 0.25, 0.94));
    } else {
      s.moltenThread.visible = false;
    }

    // Leo's worried brows lift & jaw opens slightly wider as drop approaches!
    s.heroLeo.userData.jaw.position.y = -0.72 - 0.07 * u;
    s.heroLeo.userData.brows.forEach((b, idx) => {
      b.position.y = 0.92 + 0.05 * u;
      b.rotation.z = Math.PI / 2 + (idx === 0 ? 1 : -1) * (0.26 + 0.08 * u);
    });

    s.embers1.forEach((em, i) => {
      const cyc = (t * (0.55 + 0.25 * rand(i)) + rand(i + 40)) % 1.0;
      const a = i * 1.7 + t * 1.4;
      em.position.set(Math.cos(a) * (0.32 + cyc * 0.42), dropY - 0.15 + cyc * 0.95, 0.72 + Math.sin(a) * 0.25);
      em.scale.setScalar(1.0 - cyc * 0.85);
    });

    lavaLight.intensity = 3.0;
    lavaLight.position.set(0, dropY, 1.15);

    // Camera Move 1: Smooth vertical follow-drop push keeping both drop and open jaws centered!
    camera.position.set(driftX, lerp(0.18, -0.48, ease.inOut(u)) + driftY, lerp(7.15, 5.75, ease.inOut(u)));
    camera.lookAt(0, lerp(-0.28, -1.05, ease.inOut(u)), 0.48);

  } else if (t < 10.20) {
    /* --- BEAT 2: 1,200°C & HONEY VISCOSITY --- */
    const s = SETS.s2;
    s.group.visible = true;
    const bt = t - 3.30;

    // Gentle steam puffs over 100°C blue mug
    s.mugPuffs.forEach((pf, i) => {
      const cyc = (bt * 0.48 + i / 6) % 1.0;
      pf.position.set(Math.sin(bt * 2 + i) * 0.09, 0.36 + cyc * 0.68, Math.cos(bt * 1.7 + i) * 0.07);
      pf.scale.setScalar(0.55 + cyc * 0.85);
      pf.material.opacity = (1.0 - cyc) * 0.65;
    });

    // 12x orange thermal segments light up sequentially around "12 times hotter"
    s.barSegs.forEach((segMesh, i) => {
      const appear = ease.back(seg(t, 4.10 + i * 0.19, 4.45 + i * 0.19));
      segMesh.visible = appear > 0.01;
      segMesh.scale.set(Math.max(0.01, appear), Math.max(0.01, appear), Math.max(0.01, appear));
    });

    // Crucible tilts smoothly and pours thick honey-like viscous lava ribbon
    const pourK = ease.inOut(seg(t, 5.40, 6.80));
    s.crucPivot.rotation.z = pourK * 0.68;
    const ribK = ease.out(seg(t, 5.85, 7.60));
    s.pourRibbon.visible = ribK > 0.01;
    s.pourRibbon.scale.set(1.0 + 0.12 * Math.sin(t * 5.0), Math.max(0.01, ribK), 1.0);
    s.pourRibbon.position.y = lerp(0.25, -0.38, ribK);

    const poolK = ease.out(seg(t, 6.60, 9.60));
    s.coilPool.visible = poolK > 0.01;
    s.coilTop.visible = poolK > 0.01;
    s.coilPool.scale.setScalar(Math.max(0.01, poolK * (1.0 + 0.05 * Math.sin(t * 4))));
    s.coilTop.scale.set(1.3 * poolK, 0.55 * poolK, 1.3 * poolK);

    lavaLight.intensity = 2.6;
    lavaLight.position.set(0.52, -0.15, 1.25);

    // Camera Move 2: Gentle studio dolly keeping BOTH 100°C mug & 1,200°C pour fully inside 9:16!
    const panK = ease.inOut(seg(t, 3.6, 9.8));
    camera.position.set(lerp(-0.08, 0.10, panK) + driftX, lerp(0.12, 0.18, panK) + driftY, lerp(7.75, 7.25, panK));
    camera.lookAt(lerp(-0.04, 0.08, panK), -0.08, 0);

  } else if (t < 17.00) {
    /* --- BEAT 3: SAGITTAL CUTAWAY & 1,700x STEAM FLASH --- */
    const s = SETS.s35;
    s.group.visible = true;
    s.airwayHalo.visible = false;
    s.oxyBalls.forEach((o) => { o.visible = false; });

    // Reset larynx walls to normal open position during Beat 3
    s.sag.userData.larynxLeft.position.x = -0.28;
    s.sag.userData.larynxRight.position.x = 0.12;
    s.sag.userData.larynxLeft.scale.set(1, 1, 1);
    s.sag.userData.larynxRight.scale.set(1, 1, 1);

    // Drop enters open mouth (10.20 -> 11.45s) and hits wet tongue at t = 11.45s!
    const enterK = ease.in(seg(t, 10.20, 11.45));
    const slideK = ease.inOut(seg(t, 11.45, 16.80));
    const dx = t < 11.45 ? lerp(-1.55, -0.52, enterK) : lerp(-0.52, -0.10, slideK);
    const dy = t < 11.45 ? lerp(-0.28, -0.44, enterK) : lerp(-0.44, -0.48, slideK) + 0.03 * Math.sin(t * 22);
    s.drop3.position.set(dx, dy, 0.06);
    s.drop3.userData.setState(t, 0.05, 0.92, 0.35);

    // White sear patch grows on tongue after contact
    const searK = ease.out(seg(t, 11.48, 14.50));
    s.sag.userData.searSpot.scale.set(Math.max(0.001, searK), 1, 1);

    // Violent 1,700x steam cloud eruption filling oral cavity from t = 11.45s!
    s.steamBalls.forEach((sb, i) => {
      if (t < 11.45) {
        sb.mesh.visible = false;
        return;
      }
      sb.mesh.visible = true;
      const age = ((t - 11.45) * sb.spd + (i % 7) * 0.13) % 1.45;
      const p = age / 1.45;
      const rad = 0.12 + p * 1.15;
      sb.mesh.position.set(
        dx + Math.cos(sb.ang) * rad * 0.85,
        dy + 0.08 + Math.abs(Math.sin(sb.ang)) * rad * 0.62,
        0.12 + sb.zOff
      );
      sb.mesh.scale.setScalar(0.45 + p * 1.65);
      sb.mat.opacity = (1.0 - p) * 0.82;
    });

    // 1,700x shockwave rings at "expanding 1,700 times" (t = 14.85s)
    const sh1 = seg(t, 14.80, 16.30);
    s.shockRing1.visible = sh1 > 0 && sh1 < 1;
    s.shockRing1.position.set(dx, dy, 0.22);
    s.shockRing1.scale.setScalar(1.0 + ease.out(sh1) * 4.8);
    s.shockRing1.material.opacity = (1.0 - sh1) * 0.9;

    const sh2 = seg(t, 15.10, 16.60);
    s.shockRing2.visible = sh2 > 0 && sh2 < 1;
    s.shockRing2.position.set(dx, dy, 0.22);
    s.shockRing2.scale.setScalar(1.0 + ease.out(sh2) * 4.2);
    s.shockRing2.material.opacity = (1.0 - sh2) * 0.85;

    lavaLight.intensity = 2.8;
    lavaLight.position.set(dx, dy + 0.1, 0.75);

    // Camera Move 3: Push-in into sagittal oral cavity cutaway
    const pushK = ease.inOut(seg(t, 10.20, 16.80));
    camera.position.set(lerp(-0.15, -0.26, pushK) + driftX, lerp(-0.22, -0.38, pushK) + driftY, lerp(6.85, 5.25, pushK));
    camera.lookAt(-0.18, -0.45, 0);

  } else if (t < 23.40) {
    /* --- BEAT 4: MACRO TONGUE SURFACE & LEIDENFROST VAPOR CUSHION SKATE --- */
    const s = SETS.s4;
    s.group.visible = true;
    const u = ease.inOut(seg(t, 17.00, 23.35));

    // Lava sphere levitates on boiling vapor cushion, skating right (+1.05) -> left (-1.05)
    const lx = lerp(1.05, -1.05, u);
    const hoverY = 0.34 + 0.03 * Math.sin(t * 18.0);
    s.drop4.position.set(lx, hoverY, 0.08);
    s.drop4.userData.setState(t, 0.10, 0.94, 0.38);

    s.vaporDisc.position.set(lx, -0.02, 0.08);
    s.vaporDisc.scale.set(1.0 + 0.12 * Math.sin(t * 25.0), 1.0, 1.0 + 0.12 * Math.cos(t * 25.0));

    // Radial steam jets shooting sideways out from under the Leidenfrost cushion
    s.skateJets.forEach((sj, i) => {
      const cyc = ((t - 17.0) * 2.4 + i / 12) % 1.0;
      const a = (i / 12) * Math.PI * 2 + t * 2.0;
      sj.position.set(lx + Math.cos(a) * (0.28 + cyc * 0.55), -0.01 + cyc * 0.18, 0.08 + Math.sin(a) * (0.28 + cyc * 0.45));
      sj.scale.setScalar(0.5 + cyc * 0.9);
      sj.material.opacity = (1.0 - cyc) * 0.78;
    });

    // White third-degree sear track elongates behind the skating drop; papillae bleach & flatten!
    const trackLen = Math.max(0.02, 1.15 - lx);
    s.searTrack.position.set((1.15 + lx) * 0.5, -0.16, 0.08);
    s.searTrack.scale.set(trackLen / 2.4, 1, 1);

    const cPink = srgb(0xe8647c);
    const cSear = srgb(0xf4efe8);
    const cGold = srgb(0xfacc15);
    const cDead = srgb(0x2d1f1e);
    s.papillae.forEach((p) => {
      const burned = clamp((p.x - (lx - 0.12)) / 0.35, 0, 1);
      p.mat.color.copy(cPink).lerp(cSear, burned);
      p.mesh.scale.set(1.0 + 0.15 * burned, 1.0 - 0.55 * burned, 1.0 + 0.15 * burned);
      p.mesh.position.y = -0.14 - 0.04 * burned;
      if (p.nerve) {
        p.nMat.color.copy(cGold).lerp(cDead, burned);
      }
    });

    lavaLight.intensity = 2.9;
    lavaLight.position.set(lx, hoverY + 0.25, 0.85);

    // Camera Move 4: Low-angle grazing dolly tracking alongside the skating bead
    camera.position.set(lerp(0.55, -0.55, u) + driftX, 0.46 + driftY, 4.65);
    camera.lookAt(lerp(0.35, -0.45, u), -0.12, 0.05);

  } else if (t < 30.20) {
    /* --- BEAT 5: AIRWAY TRAP — SUPERHEATED STEAM SWELLS LARYNX SHUT --- */
    const s = SETS.s35;
    s.group.visible = true;
    s.shockRing1.visible = false;
    s.shockRing2.visible = false;

    // Drop moves toward posterior pharynx/upper esophagus while hot steam pours into trachea!
    const u = seg(t, 23.40, 30.20);
    s.drop3.position.set(lerp(0.18, 0.46, ease.inOut(u)), lerp(-0.95, -2.15, ease.inOut(u)), 0.06);
    s.drop3.userData.setState(t, 0.18, 1.05, 0.45);
    s.sag.userData.searSpot.scale.set(1, 1, 1);

    // Laryngeal mucosal walls visibly balloon INWARD, pinching airway shut!
    const swellK = ease.out(seg(t, 25.00, 28.40));
    s.sag.userData.larynxLeft.position.x = lerp(-0.28, -0.145, swellK);
    s.sag.userData.larynxRight.position.x = lerp(0.12, -0.015, swellK);
    s.sag.userData.larynxLeft.scale.set(1.0 + 0.65 * swellK, 1.08, 1.15);
    s.sag.userData.larynxRight.scale.set(1.0 + 0.65 * swellK, 1.08, 1.15);
    s.sag.userData.epiglottis.rotation.z = lerp(-0.45, -1.05, swellK);

    // Steam billows into upper pharynx & larynx
    s.steamBalls.forEach((sb, i) => {
      sb.mesh.visible = true;
      const cyc = ((t - 23.40) * 0.72 + i / 28) % 1.0;
      sb.mesh.position.set(
        -0.08 + Math.sin(i * 2.1 + t * 2) * 0.24 * (1 - 0.5 * swellK),
        lerp(-1.15, -2.02, cyc),
        0.12 + sb.zOff * 0.5
      );
      sb.mesh.scale.setScalar(0.55 + (1 - cyc) * 0.75);
      sb.mat.opacity = (1.0 - cyc) * 0.62;
    });

    // Blue oxygen spheres blocked above swollen airway + pulsing red danger ring
    s.oxyBalls.forEach((ob, i) => {
      ob.visible = swellK > 0.25;
      const bounce = Math.abs(Math.sin(t * 4.5 + i));
      ob.position.set(-0.22 + (i % 5) * 0.08, -1.68 + bounce * 0.28 + Math.floor(i / 5) * 0.14, 0.16);
    });
    s.airwayHalo.visible = t > 25.2;
    const pulse = 1.0 + 0.14 * Math.sin(t * 9.0);
    s.airwayHalo.scale.setScalar(pulse);
    s.airwayHalo.material.opacity = 0.55 + 0.35 * Math.sin(t * 9.0);

    lavaLight.intensity = 2.2;
    lavaLight.position.set(0.35, -1.85, 0.85);

    // Camera Move 5: Vertical crane tracking down neck cutaway onto the closing larynx
    const craneK = ease.inOut(seg(t, 23.40, 26.80));
    camera.position.set(-0.04 + driftX, lerp(-1.05, -1.88, craneK) + driftY, lerp(5.35, 4.35, craneK));
    camera.lookAt(-0.04, lerp(-1.25, -1.96, craneK), 0);

  } else if (t < 36.80) {
    /* --- BEAT 6: ESOPHAGUS SNAG & DEEP WALL CRATER (+ SILENCE #1 AT 36.02s) --- */
    const s = SETS.s6;
    s.group.visible = true;
    const u = seg(t, 30.20, 36.00);

    // Peristaltic muscular wave squeezing down esophageal walls
    const waveY = lerp(1.35, -0.65, u);
    s.wallSegsL.forEach((w) => {
      const squeeze = Math.exp(-Math.pow((w.baseY - waveY) / 0.45, 2));
      w.grp.position.x = -0.56 + squeeze * 0.16;
    });
    const cMucosa = srgb(0xe25b74);
    const cChar = srgb(0x281412);
    s.wallSegsR.forEach((w) => {
      const squeeze = Math.exp(-Math.pow((w.baseY - waveY) / 0.45, 2));
      const craterDent = Math.exp(-Math.pow((w.baseY - (-0.18)) / 0.36, 2)) * ease.out(seg(t, 32.80, 35.60));
      w.grp.position.x = 0.56 - squeeze * 0.14 + craterDent * 0.18;
      w.innerMat.color.copy(cMucosa).lerp(cChar, craterDent * 0.85);
    });

    // Drop slides down, snags on right wall (31.3 - 35.4s), then detaches slowly during Silence #1!
    let dy, dx;
    if (t < 31.50) {
      const k = ease.out(seg(t, 30.20, 31.50));
      dy = lerp(0.95, -0.08, k);
      dx = lerp(0.0, 0.20, k);
    } else if (t < 35.50) {
      const k = seg(t, 31.50, 35.50);
      dy = lerp(-0.08, -0.24, k) + 0.02 * Math.sin(t * 28.0);
      dx = 0.20 - 0.08 * ease.inOut(k);
    } else {
      const k = ease.in(seg(t, 35.50, 36.80));
      dy = lerp(-0.24, -0.92, k);
      dx = lerp(0.12, 0.0, k);
    }
    s.drop6.position.set(dx, dy, 0.06);
    s.drop6.userData.setState(t, 0.24, 1.12, 0.55);

    // Sticky molten taffy strands stretching between drop and right esophageal wall
    const snagAmt = Math.sin(seg(t, 31.10, 35.90) * Math.PI);
    s.strands6.forEach((st, i) => {
      st.visible = snagAmt > 0.04;
      const wy = -0.04 - i * 0.08;
      const x0 = dx + 0.12, y0 = dy + (i - 2) * 0.05;
      const x1 = 0.46, y1 = wy;
      const len = Math.hypot(x1 - x0, y1 - y0);
      st.position.set((x0 + x1) * 0.5, (y0 + y1) * 0.5, 0.08 + (i - 2) * 0.03);
      st.scale.set(0.7 + 0.4 * snagAmt, Math.max(0.02, len), 0.7 + 0.4 * snagAmt);
      st.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    });

    // Deep charred crater grows into right wall
    const crK = ease.out(seg(t, 32.60, 35.60));
    s.craterGrp.visible = crK > 0.02;
    s.craterGrp.scale.setScalar(Math.max(0.02, crK));

    // Dramatic surgical spotlight hush during Silence #1 (36.02 - 36.80s)
    const hush = seg(t, 36.00, 36.45);
    gl.toneMappingExposure = lerp(1.04, 0.84, hush);
    lavaLight.intensity = lerp(2.7, 1.9, hush);
    lavaLight.position.set(dx, dy, 0.95);

    // Camera Move 6: Slow tense push-in + subtle snag micro-shake
    const pushK = ease.inOut(seg(t, 30.20, 36.60));
    const shake = snagAmt * 0.018 * Math.sin(t * 42.0);
    camera.position.set(0.08 + driftX + shake, lerp(0.18, -0.16, pushK) + driftY, lerp(5.45, 4.35, pushK));
    camera.lookAt(0.14, lerp(0.05, -0.22, pushK), 0);
    return;

  } else if (t < 44.10) {
    /* --- BEAT 7: THE TURN — HOLLYWOOD MELT MYTH BUSTED vs 1,000 JOULES --- */
    const s = SETS.s7;
    s.group.visible = true;

    // 37.0 - 40.25s: Dashed glowing orange "melt-through" path animates downward, then gets cancelled!
    const stampK = ease.back(seg(t, 40.20, 40.62));
    const cancelled = seg(t, 40.25, 40.65);
    s.mythDashes.forEach((d, i) => {
      const appear = seg(t, 37.30 + i * 0.22, 37.65 + i * 0.22);
      d.visible = appear > 0.01;
      const march = ((t * 2.5 - i * 0.25) % 1.0);
      d.scale.setScalar(Math.max(0.01, appear * (1.0 - 0.35 * cancelled)));
      d.position.y = -0.12 - i * 0.25 - (1 - cancelled) * march * 0.08;
    });
    s.dashMat.color.copy(cancelled > 0.5 ? srgb(0x64748b) : srgb(0xff5e00));
    s.dashMat.opacity = lerp(0.92, 0.34, cancelled);

    // Chunky 3D crimson X stamp slams onto the myth path at t = 40.25s!
    s.xStamp.visible = t >= 40.20;
    s.xStamp.scale.setScalar(Math.max(0.01, stampK));
    s.xStamp.position.z = lerp(1.35, 0.50, clamp(seg(t, 40.20, 40.42), 0, 1));

    // Right side: 1,000 J energy segments drain top-down (t = 41.2 -> 43.6s) against tiny 0.5g water drop!
    s.jouleSegs.forEach((jm, i) => {
      const rev = 5 - i;
      const drain = seg(t, 41.20 + rev * 0.34, 41.55 + rev * 0.34);
      jm.scale.set(1.0, Math.max(0.12, 1.0 - 0.78 * drain), 1.0);
      jm.material.emissiveIntensity = lerp(0.62, 0.04, drain);
      jm.material.color.copy(drain > 0.7 ? srgb(0x334155) : srgb(0xf97316));
    });
    s.waterDrop.position.y = -0.78 + 0.04 * Math.sin(t * 4.5);

    lavaLight.intensity = lerp(2.1, 0.9, cancelled);
    lavaLight.position.set(-0.36, 0.18, 1.25);

    const jolt = (t >= 40.22 && t < 40.55) ? Math.exp(-(t - 40.22) * 14) * 0.07 * Math.sin((t - 40.22) * 85) : 0;
    camera.position.set(0.12 + driftX, 0.05 + driftY + jolt, lerp(6.65, 6.05, ease.inOut(seg(t, 36.8, 44.0))));
    camera.lookAt(0.12, 0.02, 0);

  } else if (t < 51.40) {
    /* --- BEAT 8: NATIVE MOVE — QUENCH IN STOMACH ACID & OBSIDIAN GLASS SHATTER! --- */
    const s = SETS.s8;
    s.group.visible = true;

    // Plunge from esophagus into acid pool (44.10 -> 45.60s), then hover-sink while quenching!
    const plungeK = ease.out(seg(t, 44.10, 45.65));
    const dropY = lerp(1.05, -0.26, plungeK) + (t < 50.05 ? 0.025 * Math.sin(t * 9.0) : 0);

    // Continuous material phase transition: 1200°C molten clay -> mirror-black volcanic glass (46.6 -> 49.95s)!
    const coolK = ease.inOut(seg(t, 46.60, 49.90));
    const shattered = t >= 50.05;

    s.drop8.visible = !shattered;
    s.drop8.position.set(0, dropY, 0.32);
    s.drop8.rotation.y = t * 0.85;
    s.drop8.userData.setState(t, coolK, 1.0, 0.45);

    // Acid meniscus ripples on plunge & shatter
    const ripple = (1.0 - seg(t, 44.3, 46.5)) * 0.08 + (shattered ? (1.0 - seg(t, 50.05, 51.2)) * 0.10 : 0);
    s.acidMeniscus.position.y = 0.18 + Math.sin(t * 16.0) * ripple;

    // Boiling quench steam bubbles (intense during 44.4 - 49.4s, quieting right into Silence #2!)
    const boilAmp = (1.0 - seg(t, 48.80, 49.65)) * seg(t, 44.25, 44.60);
    s.quenchBubbles.forEach((qb, i) => {
      qb.visible = boilAmp > 0.02;
      const cyc = ((t - 44.1) * (0.9 + 0.5 * rand(i)) + i / 22) % 1.0;
      const a = i * 2.3 + t * 2.0;
      qb.position.set(
        Math.cos(a) * (0.18 + cyc * 0.52),
        dropY + cyc * 1.15,
        0.22 + Math.sin(a) * 0.20
      );
      qb.scale.setScalar((0.45 + cyc * 0.85) * boilAmp);
      qb.material.opacity = (1.0 - cyc) * 0.78 * boilAmp;
    });

    // AT t = 50.05s ("volcanic glass"): THERMAL SHOCK SHATTERS THE BLACK BEAD INTO 9 SHARP OBSIDIAN SHARDS!
    s.obsidian8.visible = shattered;
    s.obsidian8.position.set(0, dropY, 0.32);
    if (shattered) {
      s.obsidian8.userData.update(seg(t, 50.05, 51.38));
    }

    const flashK = seg(t, 50.05, 50.65);
    s.crackFlash.visible = shattered && flashK < 1.0;
    s.crackFlash.position.set(0, dropY, 0.42);
    s.crackFlash.scale.setScalar(0.5 + ease.out(flashK) * 3.2);
    s.crackFlash.material.opacity = (1.0 - flashK) * 0.95;

    // Lava light extinguishes smoothly as drop freezes into cold black obsidian!
    lavaLight.intensity = 3.0 * Math.pow(1.0 - coolK, 1.6);
    lavaLight.position.set(0, dropY + 0.1, 1.05);

    // Camera Move 6 (Orbital Push): Slow hero orbit around the quenching & shattering obsidian!
    const orbU = ease.inOut(seg(t, 44.10, 51.35));
    const orbAng = lerp(-0.26, 0.28, orbU);
    const radius = lerp(5.55, 4.75, orbU);
    camera.position.set(Math.sin(orbAng) * radius + driftX, lerp(0.28, -0.04, orbU) + driftY, Math.cos(orbAng) * radius);
    camera.lookAt(0, -0.18, 0.20);

  } else {
    /* --- BEAT 9: BOOKEND VERDICT — TWIN PEDESTALS & 3 REAL DANGERS --- */
    const s = SETS.s9;
    s.group.visible = true;

    // Left pedestal: hovering 1,200°C glowing lava drop from Beat 1!
    s.bookendLava.position.y = -0.16 + 0.04 * Math.sin(t * 3.2);
    s.bookendLava.rotation.y = t * 0.9;
    s.bookendLava.userData.setState(t, 0.0, 1.0, 0.36);

    // Right pedestal: shattered mirror-black obsidian shards floating in display formation!
    s.bookendObsidian.position.y = -0.18 + 0.03 * Math.cos(t * 2.8);
    s.bookendObsidian.rotation.y = t * 0.65;
    s.bookendObsidian.userData.update(0.28);

    // 3 Diagnostic rings light up on Leo's cutaway bust at 54.25s, 55.15s, 56.05s!
    const r1K = ease.back(seg(t, 54.20, 54.60));
    const r2K = ease.back(seg(t, 55.10, 55.50));
    const r3K = ease.back(seg(t, 56.00, 56.40));
    [
      [s.ring1, r1K, 0],
      [s.ring2, r2K, 1],
      [s.ring3, r3K, 2],
    ].forEach(([ring, rk, idx]) => {
      ring.visible = rk > 0.02;
      const p = 1.0 + 0.09 * Math.sin(t * 6.0 + idx * 1.5);
      ring.scale.setScalar(Math.max(0.02, rk * p));
    });

    lavaLight.intensity = 2.1;
    lavaLight.position.set(-0.54, -0.10, 1.25);

    // Camera Move 7: Smooth pull-back to iconic bookend hero framing
    const pullK = ease.out(seg(t, 51.40, 54.20));
    camera.position.set(driftX * 0.6, lerp(0.06, 0.14, pullK) + driftY * 0.6, lerp(5.95, 7.15, pullK));
    camera.lookAt(0, 0.12, 0);
  }
}

