// story.js — 32.0-second (960 frames @ 30 fps) 7-shot timeline for
// "The Bear That Enlisted in the Polish Army" (Corporal Wojtek, 1942–1944).
// Enforces the Mandatory Baboon Reference Standard: brisk visual beats, prop-gripping acting,
// two narrative silences, pop-in check/ban/corporal badges, and a rolling emblem truck finale.
import * as M from './motion.js';
import { humanFront, drawWojtek, drawBadge } from './cast_wojtek.js';
import { fxPuff } from './toonbase.js';
import { contactBlob } from './cast.js';

export const DUR = 32.0;
export const FPS = 30;
export const TOTAL_FRAMES = 960;

// Sound events exported for core/render/events.mjs verification
export const EV = [
  [0.75,  'whoosh',       { shot: 1, note: 'Hook camera pullback revealing supply camp' }],
  [1.56,  'salute_snap',  { shot: 1, note: 'Wojtek & Polish soldiers snap crisp salute' }],
  [6.05,  'milk_bottle',  { shot: 2, note: 'Orphaned cub Wojtek fed from condensed-milk bottle' }],
  [8.58,  'salute_snap',  { shot: 2, note: 'Wojtek taught to salute' }],
  [9.25,  'wrestle_thud', { shot: 2, note: 'Wojtek playfully wrestles with soldier' }],
  [9.85,  'beer_gulp',    { shot: 2, note: 'Wojtek tips amber beer bottle' }],
  [11.75, 'whistle_ban',  { shot: 3, note: 'British port official blows whistle in Silence #1' }],
  [12.15, 'sign_tap',     { shot: 3, note: 'Red NO PETS ban badge pops above dock sign' }],
  [14.75, 'stamp_slam',   { shot: 4, note: 'Polish officer stamps Paybook #253' }],
  [16.35, 'check_ding',   { shot: 4, note: 'Green checkmark badge pops as Private Wojtek boards' }],
  [18.45, 'flash_whoosh', { shot: 5, note: 'Flash cut to Monte Cassino artillery emplacement' }],
  [19.70, 'cannon_boom',  { shot: 5, note: '25-pounder field howitzer fires at Monte Cassino' }],
  [22.75, 'crate_hoist',  { shot: 6, note: 'Wojtek hoists 100-lb ammo crate in both paws' }],
  [24.35, 'crate_thud',   { shot: 6, note: 'Wojtek sets heavy ammo crate down beside howitzer' }],
  [28.30, 'corporal_ding',{ shot: 7, note: 'Corporal double-chevron badge pops on promotion' }],
  [29.20, 'truck_roll',   { shot: 7, note: '22nd Supply Co. truck with Wojtek shell emblem rolls past' }],
];

// Sun unit vector helper for contact shadow blobs
const sunVec = (az, el) => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
};

export function evaluateFrame(f, world) {
  const t = f / FPS;
  const cards = [];
  const fx = [];
  let light = 'iran_camp';
  let flash = 0;

  // Reset dynamic world props each frame for determinism
  if (world) {
    world.muzzleFlash.visible = false;
    world.gunBarrel.position.z = 0;
    world.deliveredCrate.visible = f >= 730 && f < 875;
    world.truck.visible = false;
  }

  // Camera state
  let camPos = [0, 1.65, 4.8];
  let camTgt = [0, 1.45, -2.0];
  let fov = 44;
  let dofFocus = 6.4;
  let shake = [0, 0];

  // ==========================================================================
  // SHOT 1 (f = 0..146, 0.00–4.87s): HOOK — 500-LB SOLDIER BEAR SALUTES IN IRAN
  // ==========================================================================
  if (f <= 146) {
    light = 'iran_camp';
    const sun = sunVec(54, 48);
    const uPull = M.ease(f, 18, 76, 'io3');
    const creep = (f / 146) * 0.22;
    camPos = [
      M.lerp(0.0, 0.08, uPull),
      M.lerp(1.52, 1.68, uPull),
      M.lerp(2.85, 5.15, uPull) - creep,
    ];
    camTgt = [
      0.0,
      M.lerp(1.42, 1.52, uPull),
      M.lerp(-1.65, -2.20, uPull),
    ];
    fov = 44;
    dofFocus = camPos[2] - (-1.75);

    // Salute snap at f = 46 (1.53s) with 7-frame camera shake
    const isSalute = f >= 46;
    const shAmt = M.shake7(f - 46);
    shake = [shAmt * 0.035, shAmt * 0.055];
    const popY = f >= 42 && f < 46 ? -0.05 : f >= 46 && f < 56 ? 0.06 * M.decay(f - 46, 0.45) : 0;

    // Center Hero: 500-lb Corporal Wojtek in Polish garrison cap
    const wIdle = M.idle(f, 1);
    cards.push({
      key: `wojtek|s1|${isSalute ? 'salute' : 'stand'}|${M.blinkAt(f, 1) ? 1 : 0}|${(f >> 1) & 3}`,
      x: 0.0, y: Math.max(0, popY), z: -1.65,
      scY: 1.06 + wIdle.sy * 0.5, rotZ: wIdle.rz,
      draw: (p) => drawWojtek(p, {
        stage: 'adult',
        cap: true,
        corporal: false,
        pose: isSalute ? 'salute' : 'stand',
        expr: 'proud',
        phase: (f % 60) / 60,
        blink: M.blinkAt(f, 1),
      }),
    });
    contactBlob(fx, 0.0, 0, -1.65, sun, light, 1.25);

    // Left: Private Piotr Prendysz
    const pIdle = M.idle(f, 2);
    cards.push({
      key: `piotr|s1|${isSalute ? 'salute' : 'hang'}|${M.blinkAt(f, 2) ? 1 : 0}`,
      x: -0.92, y: 0, z: -1.88,
      scY: 0.94 + pIdle.sy, rotZ: pIdle.rz,
      draw: (p) => humanFront(p, 'piotr', {
        seed: 2, expr: 'happy', arm: isSalute ? 'salute' : 'hang',
        blink: M.blinkAt(f, 2), facing: 0.35,
      }),
    });
    contactBlob(fx, -0.92, 0, -1.88, sun, light, 0.95);

    // Right: Polish Commanding Officer
    const oIdle = M.idle(f, 3);
    cards.push({
      key: `officer|s1|${isSalute ? 'salute' : 'hip'}|${M.blinkAt(f, 3) ? 1 : 0}`,
      x: 0.92, y: 0, z: -1.88,
      scY: 0.96 + oIdle.sy, rotZ: oIdle.rz,
      draw: (p) => humanFront(p, 'officer', {
        seed: 3, expr: isSalute ? 'happy' : 'stern', arm: isSalute ? 'salute' : 'hip',
        blink: M.blinkAt(f, 3), facing: -0.35,
      }),
    });
    contactBlob(fx, 0.92, 0, -1.88, sun, light, 0.95);

    // Dust puff under Wojtek's boots on salute stamp
    if (f >= 46 && f <= 60) {
      const uPuff = (f - 46) / 14;
      fx.push({
        key: `puff|s1|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
        draw: (p) => fxPuff(p, uPuff, 46),
        x: 0.0, y: 0.22, z: -1.45, w: 1.35, h: 0.68, soft: true,
      });
    }
  }

  // ==========================================================================
  // SHOT 2 (f = 147..324, 4.90–10.80s): CUB ADOPTION -> SALUTE, WRESTLE & BEER
  // ==========================================================================
  else if (f <= 324) {
    light = 'iran_camp';
    const sun = sunVec(54, 48);
    const uShot = (f - 147) / (324 - 147);
    camPos = [
      M.lerp(-0.18, 0.18, uShot),
      M.lerp(1.52, 1.66, uShot),
      M.lerp(4.25, 4.85, uShot),
    ];
    camTgt = [0.0, M.lerp(1.32, 1.48, uShot), -1.80];
    fov = 44;
    dofFocus = camPos[2] - (-1.68);

    const isCub = f < 236;
    const wPose = isCub ? 'bottle' : f < 271 ? 'salute' : f < 291 ? 'wrestle' : 'beer';
    const wExpr = wPose === 'wrestle' ? 'happy' : wPose === 'beer' ? 'happy' : 'proud';

    const sh1 = M.shake7(f - 236) * 0.03;
    const sh2 = M.shake7(f - 276) * 0.045;
    shake = [sh1 + sh2, (sh1 + sh2) * 1.2];

    const wrestleX = wPose === 'wrestle' ? 0.22 * Math.sin(((f - 271) / 20) * Math.PI) : 0;
    const growBounce = !isCub && f < 252 ? 1.0 + 0.14 * M.spring((f - 236) / 16) * (1 - (f - 236) / 16) : 1.04;

    const wIdle = M.idle(f, 4);
    cards.push({
      key: `wojtek|s2|${isCub ? 'cub' : 'adult'}|${wPose}|${M.blinkAt(f, 4) ? 1 : 0}|${(f >> 1) & 3}`,
      x: 0.04 + wrestleX, y: 0, z: -1.62,
      scY: (isCub ? 0.95 : growBounce) + wIdle.sy * 0.5,
      rotZ: wIdle.rz + (wPose === 'wrestle' ? -0.08 : 0),
      draw: (p) => drawWojtek(p, {
        stage: isCub ? 'cub' : 'adult',
        cap: !isCub,
        pose: wPose,
        expr: wExpr,
        phase: (f % 36) / 36,
        blink: M.blinkAt(f, 4),
        talk: wPose === 'beer' || isCub ? 0.65 : 0,
      }),
    });
    contactBlob(fx, 0.04 + wrestleX, 0, -1.62, sun, light, isCub ? 0.72 : 1.22);

    // Left: Private Piotr (offering milk bottle to cub, then saluting, then cheering with beer)
    const piotrArm = isCub ? 'milk_bottle' : wPose === 'salute' ? 'salute' : wPose === 'wrestle' ? 'up' : 'beer_toast';
    const pIdle = M.idle(f, 5);
    cards.push({
      key: `piotr|s2|${piotrArm}|${M.blinkAt(f, 5) ? 1 : 0}`,
      x: -0.88, y: 0, z: -1.82,
      scY: 0.94 + pIdle.sy, rotZ: pIdle.rz,
      draw: (p) => humanFront(p, 'piotr', {
        seed: 2, expr: 'happy', arm: piotrArm,
        blink: M.blinkAt(f, 5), facing: 0.45,
      }),
    });
    contactBlob(fx, -0.88, 0, -1.82, sun, light, 0.95);

    // Right: Comrade Soldier (wrestling partner & beer toaster)
    const solArm = isCub ? 'cheek' : wPose === 'salute' ? 'salute' : wPose === 'wrestle' ? 'up' : 'beer_toast';
    const sIdle = M.idle(f, 6);
    cards.push({
      key: `sol|s2|${solArm}|${M.blinkAt(f, 6) ? 1 : 0}`,
      x: 0.92 - wrestleX * 0.35, y: 0, z: -1.82,
      scY: 0.94 + sIdle.sy, rotZ: sIdle.rz + (wPose === 'wrestle' ? 0.09 : 0),
      draw: (p) => humanFront(p, 'soldier', {
        seed: 7, expr: 'happy', arm: solArm,
        blink: M.blinkAt(f, 6), facing: -0.45,
      }),
    });
    contactBlob(fx, 0.92 - wrestleX * 0.35, 0, -1.82, sun, light, 0.95);

    // Puff on cub-to-adult growth pop (f236) and wrestle impact (f276)
    for (const fTrig of [236, 276]) {
      if (f >= fTrig && f <= fTrig + 14) {
        const uPuff = (f - fTrig) / 14;
        fx.push({
          key: `puff|s2|${fTrig}|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
          draw: (p) => fxPuff(p, uPuff, fTrig),
          x: 0.10, y: 0.32, z: -1.42, w: 1.45, h: 0.72, soft: true,
        });
      }
    }
  }

  // ==========================================================================
  // SHOT 3 (f = 325..430, 10.83–14.33s): ALEXANDRIA PORT BAN ("NO PETS ABOARD")
  // ==========================================================================
  else if (f <= 430) {
    light = 'alexandria_port';
    const sun = sunVec(66, 44);
    const uShot = (f - 325) / (430 - 325);
    camPos = [
      M.lerp(-0.22, -0.05, uShot),
      M.lerp(1.65, 1.70, uShot),
      M.lerp(-44.85, -45.25, uShot),
    ];
    camTgt = [-0.08, 1.48, -52.2];
    fov = 44;
    dofFocus = camPos[2] - (-51.65);

    // Silence #1 whistle & NO PETS sign tap at f = 352 (11.73s)
    const isBanned = f >= 352;
    const shAmt = M.shake7(f - 352) * 0.035;
    shake = [shAmt, shAmt * 1.2];

    // Left: British Port Official with clipboard halting Wojtek
    const bIdle = M.idle(f, 10);
    cards.push({
      key: `brit|s3|${isBanned ? 'ban' : 'stand'}|${M.blinkAt(f, 10) ? 1 : 0}`,
      x: -1.02, y: 0, z: -51.65,
      scY: 0.96 + bIdle.sy, rotZ: bIdle.rz,
      draw: (p) => humanFront(p, 'brit', {
        seed: 10, expr: 'stern', arm: isBanned ? 'clipboard_ban' : 'hip',
        blink: M.blinkAt(f, 10), facing: 0.45, talk: isBanned && f < 385 ? 0.55 : 0,
      }),
    });
    contactBlob(fx, -1.02, 0, -51.65, sun, light, 0.95);

    // Pop-in Red Ban Badge cleanly above the British Port Official (f >= 352)
    if (isBanned) {
      const scBadge = M.ease(f, 352, 364, 'outBack');
      cards.push({
        key: 'badge|ban',
        x: -1.02, y: 2.04, z: -51.55,
        scX: 0.36 * scBadge, scY: 0.36 * scBadge,
        draw: (p) => drawBadge(p, 'ban'),
      });
    }

    // Center: Private Piotr looking shocked / scheming the enlistment loophole
    const pIdle = M.idle(f, 11);
    cards.push({
      key: `piotr|s3|${isBanned ? 'cheek' : 'hang'}|${M.blinkAt(f, 11) ? 1 : 0}`,
      x: 0.14, y: 0, z: -51.78,
      scY: 0.94 + pIdle.sy, rotZ: pIdle.rz,
      draw: (p) => humanFront(p, 'piotr', {
        seed: 2, expr: isBanned ? 'shock' : 'happy', arm: isBanned ? 'cheek' : 'hang',
        blink: M.blinkAt(f, 11), facing: -0.35,
      }),
    });
    contactBlob(fx, 0.14, 0, -51.78, sun, light, 0.95);

    // Right: 500-lb Wojtek looking curious at the British inspector
    const wIdle = M.idle(f, 12);
    cards.push({
      key: `wojtek|s3|curious|${M.blinkAt(f, 12) ? 1 : 0}`,
      x: 0.94, y: 0, z: -51.55,
      scY: 1.04 + wIdle.sy * 0.5, rotZ: wIdle.rz,
      draw: (p) => drawWojtek(p, {
        stage: 'adult', cap: false, pose: 'stand', expr: 'curious',
        phase: (f % 60) / 60, blink: M.blinkAt(f, 12), facing: -0.4,
      }),
    });
    contactBlob(fx, 0.94, 0, -51.55, sun, light, 1.22);
  }

  // ==========================================================================
  // SHOT 4 (f = 431..552, 14.37–18.40s): ENLISTED WITH PAYBOOK #253 & GANGPLANK
  // ==========================================================================
  else if (f <= 552) {
    light = 'alexandria_port';
    const sun = sunVec(66, 44);
    const uShot = (f - 431) / (552 - 431);
    camPos = [
      M.lerp(0.08, 0.45, uShot),
      M.lerp(1.66, 1.76, uShot),
      M.lerp(-45.10, -45.65, uShot),
    ];
    camTgt = [
      M.lerp(0.18, 0.58, uShot),
      M.lerp(1.45, 1.58, uShot),
      -52.2,
    ];
    fov = 44;
    dofFocus = camPos[2] - (-51.65);

    // Stamp slam at f = 442 ("drafted Wojtek" @ 14.73s)
    const stampDown = f >= 438 && f <= 454 ? M.ease(f, 438, 443, 'in2') * (1 - M.ease(f, 446, 454, 'out2')) : 0;
    const shAmt = M.shake7(f - 442) * 0.04;
    shake = [shAmt, shAmt * 1.3];

    // Left of Desk: Stunned British Official dropping jaw ("up" arms)
    const bIdle = M.idle(f, 14);
    cards.push({
      key: `brit|s4|${f >= 485 ? 'up' : 'ban'}|${M.blinkAt(f, 14) ? 1 : 0}`,
      x: -0.92, y: 0, z: -51.85,
      scY: 0.94 + bIdle.sy, rotZ: bIdle.rz,
      draw: (p) => humanFront(p, 'brit', {
        seed: 10, expr: f >= 485 ? 'shock' : 'stern',
        arm: f >= 485 ? 'up' : 'clipboard_ban',
        blink: M.blinkAt(f, 14), facing: 0.5,
      }),
    });
    contactBlob(fx, -0.92, 0, -51.85, sun, light, 0.95);

    // Center Behind Desk: Polish Officer stamping Wojtek's Paybook #253
    const oIdle = M.idle(f, 15);
    cards.push({
      key: `officer|s4|stamp|${(stampDown * 4) | 0}|${M.blinkAt(f, 15) ? 1 : 0}`,
      x: 0.08, y: 0, z: -51.92,
      scY: 0.96 + oIdle.sy, rotZ: oIdle.rz,
      draw: (p) => humanFront(p, 'officer', {
        seed: 3, expr: 'happy', arm: 'stamp_book', stampY: stampDown,
        blink: M.blinkAt(f, 15), facing: 0.25,
      }),
    });
    contactBlob(fx, 0.08, 0, -51.92, sun, light, 0.95);

    // Right: Private Wojtek wearing his garrison cap, holding up PAYBOOK #253 & boarding gangplank!
    const uBoard = M.ease(f, 495, 550, 'io2');
    const wx = M.lerp(0.95, 1.35, uBoard);
    const wy = M.lerp(0.0, 0.36, uBoard);
    const wz = M.lerp(-51.48, -52.65, uBoard);
    const wIdle = M.idle(f, 16);
    cards.push({
      key: `wojtek|s4|paybook|${M.blinkAt(f, 16) ? 1 : 0}|${(f >> 1) & 3}`,
      x: wx, y: wy, z: wz,
      scY: 1.05 + wIdle.sy * 0.5, rotZ: wIdle.rz,
      draw: (p) => drawWojtek(p, {
        stage: 'adult',
        cap: f >= 442,
        pose: f >= 442 ? 'paybook' : 'stand',
        expr: 'proud',
        phase: (f % 28) / 28,
        blink: M.blinkAt(f, 16),
      }),
    });
    contactBlob(fx, wx, wy, wz, sun, light, 1.22);

    // Pop-in Baboon-style Emerald Green Checkmark Badge above Private Wojtek (f >= 490, "real private")
    if (f >= 490) {
      const scCheck = M.ease(f, 490, 502, 'outBack');
      cards.push({
        key: 'badge|check|s4',
        x: wx, y: wy + 2.25, z: wz + 0.12,
        scX: 0.42 * scCheck, scY: 0.42 * scCheck,
        draw: (p) => drawBadge(p, 'check'),
      });
    }

    // Puff on stamp slam at f = 442
    if (f >= 442 && f <= 455) {
      const uPuff = (f - 442) / 13;
      fx.push({
        key: `puff|s4|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
        draw: (p) => fxPuff(p, uPuff, 442),
        x: 0.35, y: 1.05, z: -51.40, w: 0.95, h: 0.48, soft: true,
      });
    }
  }

  // ==========================================================================
  // SHOT 5 (f = 553..662, 18.43–22.07s): MONTE CASSINO BARRAGE & SILENCE #2
  // ==========================================================================
  else if (f <= 662) {
    light = 'monte_cassino';
    const sun = sunVec(-42, 38);
    if (f <= 558) {
      flash = 0.72 * (1 - (f - 553) / 6);
    }

    const uShot = (f - 553) / (662 - 553);
    camPos = [
      M.lerp(-0.22, 0.18, uShot),
      M.lerp(1.62, 1.68, uShot),
      M.lerp(-94.65, -95.05, uShot),
    ];
    camTgt = [
      M.lerp(-0.15, 0.22, uShot),
      1.42,
      -102.0,
    ];
    fov = 44;
    dofFocus = camPos[2] - (-101.70);

    // 25-Pounder Howitzer Roar at f = 591 (19.70s, "while cannons roared")
    if (world && f >= 591 && f <= 608) {
      const uRec = (f - 591) / 17;
      world.gunBarrel.position.z = 0.45 * Math.sin(uRec * Math.PI);
      world.muzzleFlash.visible = f <= 601;
    }
    const shCannon = M.shake7(f - 591) * 0.075;
    shake = [shCannon, shCannon * 1.35];

    // Artillery Crewman #1 by Howitzer Breech
    const c1Idle = M.idle(f, 20);
    cards.push({
      key: `crew1|s5|${f >= 591 && f < 612 ? 'up' : 'haul'}|${M.blinkAt(f, 20) ? 1 : 0}`,
      x: -1.05, y: 0, z: -101.82,
      scY: 0.94 + c1Idle.sy, rotZ: c1Idle.rz,
      draw: (p) => humanFront(p, 'soldier', {
        seed: 20, expr: 'stern', arm: f >= 591 && f < 612 ? 'up' : 'haul_shell',
        blink: M.blinkAt(f, 20), facing: 0.35,
      }),
    });
    contactBlob(fx, -1.05, 0, -101.82, sun, light, 0.95);

    // Artillery Crewman #2 exhausted beside gun pit
    const c2Idle = M.idle(f, 21);
    cards.push({
      key: `crew2|s5|cheek|${M.blinkAt(f, 21) ? 1 : 0}`,
      x: -0.18, y: 0, z: -101.88,
      scY: 0.94 + c2Idle.sy, rotZ: c2Idle.rz,
      draw: (p) => humanFront(p, 'piotr', {
        seed: 2, expr: 'shock', arm: 'cheek',
        blink: M.blinkAt(f, 21), facing: 0.25,
      }),
    });
    contactBlob(fx, -0.18, 0, -101.88, sun, light, 0.95);

    // Right by Ammo Crates: Wojtek watching the crew during Silence #2 (f = 609..631), then stepping to crates
    const wIdle = M.idle(f, 22);
    const wStep = M.ease(f, 632, 662, 'io2');
    const wx = M.lerp(0.85, 1.05, wStep);
    cards.push({
      key: `wojtek|s5|${f >= 625 ? 'focused' : 'curious'}|${M.blinkAt(f, 22) ? 1 : 0}`,
      x: wx, y: 0, z: -101.55,
      scY: 1.05 + wIdle.sy * 0.5, rotZ: wIdle.rz,
      draw: (p) => drawWojtek(p, {
        stage: 'adult', cap: true, pose: 'stand',
        expr: f >= 625 ? 'focused' : 'curious',
        phase: (f % 40) / 40, blink: M.blinkAt(f, 22), facing: -0.45,
      }),
    });
    contactBlob(fx, wx, 0, -101.55, sun, light, 1.22);

    // Cannon blast smoke cloud at f = 591..612
    if (f >= 591 && f <= 612) {
      const uPuff = (f - 591) / 21;
      fx.push({
        key: `puff|cannon|${(uPuff * 10) | 0}`, cw: 256, ch: 128,
        draw: (p) => fxPuff(p, uPuff, 591),
        x: -0.95, y: 1.55, z: -103.2, w: 2.35, h: 1.25, soft: true,
      });
    }
  }

  // ==========================================================================
  // SHOT 6 (f = 663..772, 22.10–25.73s): WOJTEK HAULS 100-LB AMMO CRATE HIMSELF!
  // ==========================================================================
  else if (f <= 772) {
    light = 'monte_cassino';
    const sun = sunVec(-42, 38);
    const uShot = (f - 663) / (772 - 663);
    camPos = [
      M.lerp(0.22, -0.05, uShot),
      M.lerp(1.58, 1.64, uShot),
      M.lerp(-95.15, -94.85, uShot),
    ];
    camTgt = [
      M.lerp(0.25, -0.02, uShot),
      1.38,
      -101.75,
    ];
    fov = 44;
    dofFocus = camPos[2] - (-101.45);

    const hasCrate = f >= 678 && f < 730;
    const uWalk = M.ease(f, 682, 730, 'io2');
    const wx = f < 682 ? 0.68 : M.lerp(0.68, -0.05, uWalk);
    const dipY = (f >= 678 && f < 682) || (f >= 728 && f < 733) ? -0.08 : 0;

    const shHoist = M.shake7(f - 682) * 0.035;
    const shSet = M.shake7(f - 730) * 0.045;
    shake = [shHoist + shSet, (shHoist + shSet) * 1.25];

    const wIdle = M.idle(f, 25);
    cards.push({
      key: `wojtek|s6|${hasCrate ? 'crate' : 'salute'}|${M.blinkAt(f, 25) ? 1 : 0}|${(f >> 1) & 3}`,
      x: wx, y: Math.max(0, dipY), z: -101.42,
      scY: (hasCrate ? 1.04 : 1.06) + wIdle.sy * 0.4,
      rotZ: wIdle.rz,
      draw: (p) => drawWojtek(p, {
        stage: 'adult',
        cap: true,
        pose: hasCrate ? 'crate' : f >= 730 ? 'salute' : 'stand',
        expr: hasCrate ? 'focused' : 'proud',
        phase: hasCrate ? (f - 682) / 14 : (f % 45) / 45,
        blink: M.blinkAt(f, 25),
      }),
    });
    contactBlob(fx, wx, 0, -101.42, sun, light, 1.28);

    // Pop-in Green Checkmark Badge at f >= 738 ("He never dropped a single shell")
    if (f >= 738) {
      const scCheck = M.ease(f, 738, 750, 'outBack');
      cards.push({
        key: 'badge|check|s6',
        x: wx, y: 2.28, z: -101.30,
        scX: 0.42 * scCheck, scY: 0.42 * scCheck,
        draw: (p) => drawBadge(p, 'check'),
      });
    }

    // Left & Right Cheering Polish Artillery Crewmen
    const c1Idle = M.idle(f, 26);
    cards.push({
      key: `crewL|s6|up|${M.blinkAt(f, 26) ? 1 : 0}`,
      x: -0.96, y: 0, z: -101.82,
      scY: 0.94 + c1Idle.sy, rotZ: c1Idle.rz,
      draw: (p) => humanFront(p, 'piotr', {
        seed: 2, expr: 'happy', arm: f >= 685 ? 'up' : 'point',
        blink: M.blinkAt(f, 26), facing: 0.4,
      }),
    });
    contactBlob(fx, -0.96, 0, -101.82, sun, light, 0.95);

    const c2Idle = M.idle(f, 27);
    cards.push({
      key: `crewR|s6|up|${M.blinkAt(f, 27) ? 1 : 0}`,
      x: 1.02, y: 0, z: -101.85,
      scY: 0.94 + c2Idle.sy, rotZ: c2Idle.rz,
      draw: (p) => humanFront(p, 'soldier', {
        seed: 8, expr: 'happy', arm: f >= 690 ? 'up' : 'hip',
        blink: M.blinkAt(f, 27), facing: -0.4,
      }),
    });
    contactBlob(fx, 1.02, 0, -101.85, sun, light, 0.95);

    // Dust puffs on crate hoist (f682) and crate set-down (f730)
    for (const [fTrig, px] of [[682, 0.68], [730, -0.15]]) {
      if (f >= fTrig && f <= fTrig + 14) {
        const uPuff = (f - fTrig) / 14;
        fx.push({
          key: `puff|s6|${fTrig}|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
          draw: (p) => fxPuff(p, uPuff, fTrig),
          x: px, y: 0.25, z: -101.20, w: 1.35, h: 0.65, soft: true,
        });
      }
    }
  }

  // ==========================================================================
  // SHOT 7 (f = 773..959, 25.77–32.00s): CORPORAL PROMOTION & ROLLING EMBLEM TRUCK
  // ==========================================================================
  else {
    light = 'emblem_road';
    const sun = sunVec(60, 42);
    const uShot = (f - 773) / (959 - 773);
    const isTruckFinale = f >= 875;

    if (!isTruckFinale) {
      // Beat 7a: Corporal Promotion Ceremony (f = 773..874)
      camPos = [
        M.lerp(-0.12, 0.12, uShot),
        1.64,
        -94.85,
      ];
      camTgt = [0.0, 1.44, -101.6];
      fov = 44;
      dofFocus = camPos[2] - (-101.42);

      const isPinned = f >= 825;
      const shPin = M.shake7(f - 825) * 0.03;
      shake = [shPin, shPin];

      const wIdle = M.idle(f, 30);
      cards.push({
        key: `wojtek|s7a|${isPinned ? 'corp' : 'priv'}|${M.blinkAt(f, 30) ? 1 : 0}`,
        x: 0.0, y: 0, z: -101.42,
        scY: 1.06 + wIdle.sy * 0.5, rotZ: wIdle.rz,
        draw: (p) => drawWojtek(p, {
          stage: 'adult',
          cap: true,
          corporal: isPinned,
          pose: 'salute',
          expr: 'proud',
          phase: (f % 50) / 50,
          blink: M.blinkAt(f, 30),
        }),
      });
      contactBlob(fx, 0.0, 0, -101.42, sun, light, 1.25);

      // Pop-in Golden Corporal Double-Chevron Crest Badge (f = 825..874)
      if (isPinned) {
        const scCorp = M.ease(f, 825, 837, 'outBack');
        cards.push({
          key: 'badge|corporal',
          x: 0.0, y: 2.34, z: -101.28,
          scX: 0.44 * scCorp, scY: 0.44 * scCorp,
          draw: (p) => drawBadge(p, 'corporal'),
        });
      }

      // Flanking Polish Officer & Private Piotr saluting Corporal Wojtek
      cards.push({
        key: `officer|s7a|${isPinned ? 'salute' : 'pin'}|${M.blinkAt(f, 31) ? 1 : 0}`,
        x: -0.92, y: 0, z: -101.72,
        scY: 0.95, rotZ: 0,
        draw: (p) => humanFront(p, 'officer', {
          seed: 3, expr: 'happy', arm: isPinned ? 'salute' : 'pin_chevron',
          blink: M.blinkAt(f, 31), facing: 0.35,
        }),
      });
      contactBlob(fx, -0.92, 0, -101.72, sun, light, 0.95);

      cards.push({
        key: `piotr|s7a|salute|${M.blinkAt(f, 32) ? 1 : 0}`,
        x: 0.92, y: 0, z: -101.72,
        scY: 0.94, rotZ: 0,
        draw: (p) => humanFront(p, 'piotr', {
          seed: 2, expr: 'happy', arm: 'salute',
          blink: M.blinkAt(f, 32), facing: -0.35,
        }),
      });
      contactBlob(fx, 0.92, 0, -101.72, sun, light, 0.95);
    } else {
      // Beat 7b (f = 875..959): Rolling 22nd Supply Company Truck with Painted Wojtek Shell Emblem!
      const uTruck = M.ease(f, 875, 959, 'out2');
      const tx = M.lerp(-1.35, 0.25, uTruck);
      camPos = [0.05, 1.68, -93.15];
      camTgt = [0.05, 1.48, -100.2];
      fov = 44;
      dofFocus = camPos[2] - (-99.55);

      if (world) {
        world.truck.visible = true;
        world.truck.position.set(tx, 0, -99.85);
        const wheelSpin = -(tx + 1.35) / 0.52;
        for (const w of world.truckWheels) w.rotation.z = wheelSpin;
      }

      // Corporal Wojtek riding beside the open cab of the rolling emblem truck, saluting!
      cards.push({
        key: `wojtek|s7b|cab|${M.blinkAt(f, 35) ? 1 : 0}`,
        x: tx + 0.72, y: 0.52, z: -98.85,
        scX: 0.72, scY: 0.72, rotZ: 0.02 * Math.sin(f * 0.4),
        draw: (p) => drawWojtek(p, {
          stage: 'adult', cap: true, corporal: true, pose: 'salute', expr: 'happy',
          blink: M.blinkAt(f, 35),
        }),
      });

      // Cheering Polish soldiers in the background saluting as the emblem truck rolls by
      cards.push({
        key: `piotr|s7b|wave`,
        x: -1.15, y: 0, z: -101.85,
        scY: 0.94, rotZ: 0,
        draw: (p) => humanFront(p, 'piotr', {
          seed: 2, expr: 'happy', arm: 'salute', facing: 0.3,
        }),
      });
      cards.push({
        key: `officer|s7b|salute`,
        x: 1.25, y: 0, z: -101.85,
        scY: 0.95, rotZ: 0,
        draw: (p) => humanFront(p, 'officer', {
          seed: 3, expr: 'happy', arm: 'salute', facing: -0.3,
        }),
      });
    }
  }

  return {
    f,
    t,
    light,
    flash,
    camPos,
    camTgt,
    fov,
    dofFocus,
    shake,
    cards,
    fx,
  };
}
