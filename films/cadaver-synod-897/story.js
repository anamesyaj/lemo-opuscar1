// story.js — 30.0-second (900 frames @ 30 fps) 6-shot timeline for
// "The Dead Pope Put On Trial" (The Cadaver Synod, Rome, 897 AD).
// Enforces the Mandatory Baboon Reference Standard: brisk visual beats, prop-gripping acting,
// two narrative silences, pop-in Guilty ❌ / Official Ban ✅ badges, and a rolling Papal Edict Cart finale.
import * as M from './motion.js';
import { humanFront, drawSkeletonPope, drawBadge } from './cast_cadaver.js';
import { fxPuff } from './toonbase.js';
import { contactBlob } from './cast.js';

export const DUR = 30.0;
export const FPS = 30;
export const TOTAL_FRAMES = 900;

export const EV = [
  [0.70,  'whoosh',       { shot: 1, note: 'Hook camera pullback in Lateran Basilica' }],
  [2.15,  'gavel_slam',   { shot: 1, note: 'Pope Stephen VI slams pulpit accusing skeleton' }],
  [3.60,  'bone_rattle',  { shot: 1, note: 'Skeleton Pope Formosus jaw clacks on throne' }],
  [7.60,  'stone_scrape', { shot: 2, note: 'Guards slide open stone sarcophagus lid in Papal Crypt' }],
  [9.40,  'bone_rattle',  { shot: 2, note: 'Guards dress skeleton in golden papal mitre & robes' }],
  [11.75, 'throne_thud',  { shot: 3, note: 'Skeleton propped upright on Lateran papal throne' }],
  [13.85, 'deacon_wag',   { shot: 3, note: 'Trembling young deacon waves skeleton hand as lawyer' }],
  [17.55, 'guilty_gavel', { shot: 4, note: 'Guilty verdict gavel strike & red ban badge pop' }],
  [19.55, 'finger_chop',  { shot: 4, note: 'Three blessing fingers chopped off with cartoon pop' }],
  [20.65, 'strip_whoosh', { shot: 4, note: 'Skeleton stripped of gold robes & mitre' }],
  [23.10, 'tiber_splash', { shot: 5, note: 'Corpse tossed into Tiber River splash' }],
  [25.60, 'ban_ding',     { shot: 5, note: 'Green checkmark badge pops on NO DEAD ON TRIAL monument' }],
];

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

  if (world) {
    world.tombLid.position.x = 0.05;
    world.splashRing.visible = false;
    world.papalCart.visible = false;
  }

  let camPos = [0, 1.65, 4.8];
  let camTgt = [0, 1.45, -2.0];
  let fov = 44;
  let dofFocus = 6.4;
  let shake = [0, 0];

  // ==========================================================================
  // SHOT 1 (f = 0..158, 0.00–5.27s): HOOK — POPE STEPHEN VI PROSECUTES SKELETON POPE
  // ==========================================================================
  if (f <= 158) {
    light = 'iran_camp';
    const sun = sunVec(54, 48);
    const uPull = M.ease(f, 16, 78, 'io3');
    const creep = (f / 158) * 0.20;
    camPos = [
      M.lerp(0.15, 0.0, uPull),
      M.lerp(1.54, 1.68, uPull),
      M.lerp(2.95, 5.10, uPull) - creep,
    ];
    camTgt = [
      0.0,
      M.lerp(1.42, 1.52, uPull),
      M.lerp(-1.75, -2.20, uPull),
    ];
    fov = 44;
    dofFocus = camPos[2] - (-1.75);

    const shSlam = M.shake7(f - 64) * 0.04;
    shake = [shSlam, shSlam * 1.25];
    const gavelDown = f >= 60 && f <= 74 ? M.ease(f, 60, 65, 'in2') * (1 - M.ease(f, 67, 74, 'out2')) : 0;

    // Left behind Pulpit (pulpit is at z = -1.22, back face -1.42): Pope Stephen VI at z = -1.85
    const sIdle = M.idle(f, 1);
    cards.push({
      key: `stephen|s1|${f >= 60 && f < 82 ? 'gavel' : 'accuse'}|${(gavelDown * 4) | 0}|${M.blinkAt(f, 1) ? 1 : 0}`,
      x: -0.98, y: 0, z: -1.85,
      scY: 0.98 + sIdle.sy, rotZ: sIdle.rz,
      draw: (p) => humanFront(p, 'stephen', {
        seed: 1, expr: 'stern',
        arm: f >= 60 && f < 82 ? 'gavel' : 'accuse',
        gavelY: gavelDown,
        blink: M.blinkAt(f, 1), facing: 0.45,
        talk: (f % 16) < 8 ? 0.65 : 0.15,
      }),
    });
    contactBlob(fx, -0.98, 0, -1.85, sun, light, 0.98);

    // Right in front of Crimson Papal Throne (throne is at z = -2.55): Skeleton Pope Formosus at z = -1.72
    const jawClack = f >= 105 && f <= 128 ? 0.55 * Math.abs(Math.sin((f - 105) * 0.45)) : 0;
    const fIdle = M.idle(f, 2);
    cards.push({
      key: `formosus|s1|throne|${(jawClack * 4) | 0}|${(f >> 1) & 3}`,
      x: 0.62, y: 0.14, z: -1.72,
      scY: 1.05 + fIdle.sy * 0.4, rotZ: fIdle.rz,
      draw: (p) => drawSkeletonPope(p, {
        pose: 'throne',
        robes: true,
        mitre: true,
        fingers: 3,
        jawOpen: jawClack,
        phase: (f % 60) / 60,
        facing: -0.35,
      }),
    });
    contactBlob(fx, 0.62, 0.14, -1.72, sun, light, 1.15);

    if (f >= 64 && f <= 77) {
      const uPuff = (f - 64) / 13;
      fx.push({
        key: `puff|s1|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
        draw: (p) => fxPuff(p, uPuff, 64),
        x: -0.82, y: 1.02, z: -0.95, w: 0.95, h: 0.48, soft: true,
      });
    }
  }

  // ==========================================================================
  // SHOT 2 (f = 159..334, 5.30–11.13s): PAPAL CRYPT EXHUMATION & GOLD ROBES
  // ==========================================================================
  else if (f <= 334) {
    light = 'alexandria_port';
    const sun = sunVec(66, 44);
    const uShot = (f - 159) / (334 - 159);
    camPos = [
      M.lerp(-0.18, 0.18, uShot),
      M.lerp(1.56, 1.68, uShot),
      M.lerp(-45.15, -44.85, uShot),
    ];
    camTgt = [0.0, 1.44, -52.0];
    fov = 44;
    dofFocus = camPos[2] - (-51.60);

    // Sarcophagus lid at z = -52.55 slides open at f = 215..255 ("guards dug up his corpse")
    const uLid = M.ease(f, 215, 255, 'io2');
    if (world) {
      world.tombLid.position.x = M.lerp(0.05, 0.72, uLid);
    }

    const isDressed = f >= 278; // "dressed the skeleton in gold robes"
    const shDress = M.shake7(f - 278) * 0.04;
    shake = [shDress, shDress * 1.2];

    // All three characters staged cleanly in front of the tomb (tomb front face is at z = -52.10)
    const riseY = M.ease(f, 222, 262, 'outBack') * 0.14;
    const fIdle = M.idle(f, 4);
    cards.push({
      key: `formosus|s2|${isDressed ? 'robed' : 'bare'}|${(f >> 1) & 3}`,
      x: 0.0, y: riseY, z: -51.48,
      scY: (isDressed ? 1.04 : 0.98) + fIdle.sy * 0.4,
      rotZ: fIdle.rz,
      draw: (p) => drawSkeletonPope(p, {
        pose: 'crypt',
        robes: isDressed,
        mitre: isDressed,
        fingers: 3,
        jawOpen: isDressed ? 0.25 : 0,
        phase: (f % 48) / 48,
      }),
    });
    contactBlob(fx, 0.0, 0, -51.48, sun, light, 1.12);

    // Left: Crypt Guard #1 with iron shovel (cleanly in front of tomb at z = -51.55)
    const g1Idle = M.idle(f, 5);
    cards.push({
      key: `guard1|s2|shovel|${M.blinkAt(f, 5) ? 1 : 0}`,
      x: -1.04, y: 0, z: -51.55,
      scY: 0.95 + g1Idle.sy, rotZ: g1Idle.rz,
      draw: (p) => humanFront(p, 'guard', {
        seed: 5, expr: 'stern', arm: 'shovel',
        blink: M.blinkAt(f, 5), facing: 0.4,
      }),
    });
    contactBlob(fx, -1.04, 0, -51.55, sun, light, 0.95);

    // Right: Crypt Guard #2 presenting gold papal robes & mitre (cleanly in front of tomb at z = -51.55)
    const g2Idle = M.idle(f, 6);
    cards.push({
      key: `guard2|s2|${isDressed ? 'up' : 'robe'}|${M.blinkAt(f, 6) ? 1 : 0}`,
      x: 1.04, y: 0, z: -51.55,
      scY: 0.95 + g2Idle.sy, rotZ: g2Idle.rz,
      draw: (p) => humanFront(p, 'guard', {
        seed: 6, expr: isDressed ? 'happy' : 'stern',
        arm: isDressed ? 'up' : 'robe_present',
        blink: M.blinkAt(f, 6), facing: -0.4,
      }),
    });
    contactBlob(fx, 1.04, 0, -51.55, sun, light, 0.95);

    for (const fTrig of [225, 278]) {
      if (f >= fTrig && f <= fTrig + 14) {
        const uPuff = (f - fTrig) / 14;
        fx.push({
          key: `puff|s2|${fTrig}|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
          draw: (p) => fxPuff(p, uPuff, fTrig),
          x: 0.0, y: 0.55, z: -51.10, w: 1.45, h: 0.72, soft: true,
        });
      }
    }
  }

  // ==========================================================================
  // SHOT 3 (f = 335..484, 11.17–16.13s): TREMBLING YOUNG DEACON DEFENSE LAWYER
  // ==========================================================================
  else if (f <= 484) {
    light = 'iran_camp';
    const sun = sunVec(54, 48);
    const uShot = (f - 335) / (484 - 335);
    camPos = [
      M.lerp(-0.10, 0.22, uShot),
      M.lerp(1.62, 1.68, uShot),
      M.lerp(4.95, 4.65, uShot),
    ];
    camTgt = [0.05, 1.46, -2.0];
    fov = 44;
    dofFocus = camPos[2] - (-1.75);

    const isPuppet = f >= 392; // "trembling young deacon to answer as his defence lawyer"

    // Left behind Pulpit: Pope Stephen VI demanding answers
    const sIdle = M.idle(f, 10);
    cards.push({
      key: `stephen|s3|accuse|${M.blinkAt(f, 10) ? 1 : 0}`,
      x: -0.98, y: 0, z: -1.85,
      scY: 0.98 + sIdle.sy, rotZ: sIdle.rz,
      draw: (p) => humanFront(p, 'stephen', {
        seed: 1, expr: 'stern', arm: 'accuse',
        blink: M.blinkAt(f, 10), facing: 0.45,
      }),
    });
    contactBlob(fx, -0.98, 0, -1.85, sun, light, 0.98);

    // Center-Left beside Throne (clear of both pulpit and throne): Trembling Young Deacon sweating with DEFENSE scroll
    const trembleX = isPuppet ? 0.025 * Math.sin(f * 1.4) : 0;
    const dIdle = M.idle(f, 11);
    cards.push({
      key: `deacon|s3|panic|${(f >> 1) & 3}|${M.blinkAt(f, 11) ? 1 : 0}`,
      x: -0.15 + trembleX, y: 0, z: -1.78,
      scY: 0.92 + dIdle.sy, rotZ: dIdle.rz,
      draw: (p) => humanFront(p, 'deacon', {
        seed: 11, expr: 'shock', arm: 'scroll_panic',
        phase: (f % 24) / 24,
        blink: M.blinkAt(f, 11), facing: -0.25,
        talk: isPuppet && (f % 10) < 5 ? 0.75 : 0.15,
      }),
    });
    contactBlob(fx, -0.15 + trembleX, 0, -1.78, sun, light, 0.92);

    // Right in front of Papal Throne: Skeleton Formosus being puppeteered by the deacon
    const fIdle = M.idle(f, 12);
    cards.push({
      key: `formosus|s3|${isPuppet ? 'puppet' : 'throne'}|${(f >> 1) & 3}`,
      x: 0.65, y: 0.14, z: -1.70,
      scY: 1.05 + fIdle.sy * 0.4, rotZ: fIdle.rz,
      draw: (p) => drawSkeletonPope(p, {
        pose: isPuppet ? 'puppet' : 'throne',
        robes: true,
        mitre: true,
        fingers: 3,
        jawOpen: isPuppet ? 0.45 * Math.abs(Math.sin(f * 0.45)) : 0,
        phase: (f % 24) / 24,
        facing: -0.35,
      }),
    });
    contactBlob(fx, 0.65, 0.14, -1.70, sun, light, 1.15);
  }

  // ==========================================================================
  // SHOT 4 (f = 485..662, 16.17–22.07s): GUILTY VERDICT, 3 FINGERS CHOPPED & STRIPPED
  // ==========================================================================
  else if (f <= 662) {
    light = 'monte_cassino';
    const sun = sunVec(-42, 38);
    const uShot = (f - 485) / (662 - 485);
    camPos = [
      M.lerp(0.12, -0.08, uShot),
      M.lerp(1.60, 1.66, uShot),
      M.lerp(4.75, 5.05, uShot),
    ];
    camTgt = [0.05, 1.44, -2.0];
    fov = 44;
    dofFocus = camPos[2] - (-1.72);

    const isGuilty = f >= 525;    // "still lost the case" (17.50s)
    const isChopped = f >= 585;   // "three blessing fingers chopped off" (19.50s)
    const isStripped = f >= 618;  // "stripped of his title" (20.60s)

    const shGavel = M.shake7(f - 525) * 0.045;
    const shChop = M.shake7(f - 585) * 0.055;
    shake = [shGavel + shChop, (shGavel + shChop) * 1.25];

    const gavelDown = f >= 520 && f <= 536 ? M.ease(f, 520, 526, 'in2') * (1 - M.ease(f, 529, 536, 'out2')) : 0;

    // Left behind Pulpit: Pope Stephen VI slamming gavel in triumph
    cards.push({
      key: `stephen|s4|gavel|${(gavelDown * 4) | 0}|${M.blinkAt(f, 15) ? 1 : 0}`,
      x: -0.98, y: 0, z: -1.85,
      scY: 0.98, rotZ: 0,
      draw: (p) => humanFront(p, 'stephen', {
        seed: 1, expr: 'stern', arm: 'gavel', gavelY: gavelDown,
        blink: M.blinkAt(f, 15), facing: 0.45,
      }),
    });
    contactBlob(fx, -0.98, 0, -1.85, sun, light, 0.98);

    // Center-Left: Trembling Deacon throwing hands up in despair
    cards.push({
      key: `deacon|s4|${isGuilty ? 'up' : 'panic'}|${M.blinkAt(f, 16) ? 1 : 0}`,
      x: -0.15, y: 0, z: -1.78,
      scY: 0.92, rotZ: 0,
      draw: (p) => humanFront(p, 'deacon', {
        seed: 11, expr: 'shock', arm: isGuilty ? 'up' : 'scroll_panic',
        blink: M.blinkAt(f, 16), facing: 0.25,
      }),
    });
    contactBlob(fx, -0.15, 0, -1.78, sun, light, 0.92);

    // Right in front of Papal Throne: Skeleton Formosus (loses 3 fingers at f=585, stripped to sackcloth at f=618!)
    cards.push({
      key: `formosus|s4|${isChopped ? 0 : 3}|${isStripped ? 'strip' : 'robe'}|${(f >> 1) & 3}`,
      x: 0.65, y: 0.14, z: -1.70,
      scY: 1.05, rotZ: 0,
      draw: (p) => drawSkeletonPope(p, {
        pose: isChopped ? 'chopped' : 'throne',
        robes: !isStripped,
        mitre: !isStripped,
        fingers: isChopped ? 0 : 3,
        jawOpen: isGuilty ? 0.45 : 0,
        phase: (f % 40) / 40,
        facing: -0.35,
      }),
    });
    contactBlob(fx, 0.65, 0.14, -1.70, sun, light, 1.15);

    // Pop-in Red Guilty Ban Badge above prosecutor pulpit (f >= 525, clear of LATERAN BASILICA sign)
    if (isGuilty) {
      const scBan = M.ease(f, 525, 537, 'outBack');
      cards.push({
        key: 'badge|ban|s4',
        x: -0.98, y: 1.92, z: -1.55,
        scX: 0.36 * scBan, scY: 0.36 * scBan,
        draw: (p) => drawBadge(p, 'ban'),
      });
    }

    for (const [fTrig, px, py] of [[585, 0.95, 1.25], [618, 0.65, 0.95]]) {
      if (f >= fTrig && f <= fTrig + 14) {
        const uPuff = (f - fTrig) / 14;
        fx.push({
          key: `puff|s4|${fTrig}|${(uPuff * 8) | 0}`, cw: 256, ch: 128,
          draw: (p) => fxPuff(p, uPuff, fTrig),
          x: px, y: py, z: -1.35, w: 1.35, h: 0.68, soft: true,
        });
      }
    }
  }

  // ==========================================================================
  // SHOT 5 (f = 663..899, 22.10–30.00s): TIBER RIVER SPLASH, ROME REBELLION & BAN EDICT
  // ==========================================================================
  else {
    light = 'emblem_road';
    const sun = sunVec(60, 42);
    flash = 0;

    const isCartFinale = f >= 815;
    const uShot = (f - 663) / (899 - 663);

    if (!isCartFinale) {
      // Beat 5a (f = 663..814): Tiber River Splash & "NO DEAD ON TRIAL" Stone Monument (at x = 0, z = -102.55)
      camPos = [
        M.lerp(-0.15, 0.12, uShot),
        1.66,
        -94.85,
      ];
      camTgt = [0.0, 1.46, -101.8];
      fov = 44;
      dofFocus = camPos[2] - (-101.55);

      if (world && f >= 690 && f <= 745) {
        world.splashRing.visible = true;
        const scSplash = 1.0 + ((f - 690) / 55) * 2.2;
        world.splashRing.scale.set(scSplash, scSplash, 1);
      }

      const isBannedForever = f >= 765; // "banned putting dead people on trial forever"
      const shBan = M.shake7(f - 765) * 0.035;
      shake = [shBan, shBan];

      // Right of "NO DEAD ON TRIAL" Monument (monument is centered at x = 0, z = -102.55): Restored Skeleton Pope Formosus!
      cards.push({
        key: `formosus|s5a|restored|${(f >> 1) & 3}`,
        x: 0.92, y: 0, z: -101.52,
        scY: 1.04, rotZ: 0,
        draw: (p) => drawSkeletonPope(p, {
          pose: 'crypt',
          robes: true,
          mitre: true,
          fingers: 3,
          jawOpen: 0.2,
          phase: (f % 48) / 48,
        }),
      });
      contactBlob(fx, 0.92, 0, -101.52, sun, light, 1.15);

      // Pop-in Emerald Green Checkmark Badge cleanly on top of NO DEAD ON TRIAL Monument (f >= 765)
      if (isBannedForever) {
        const scCheck = M.ease(f, 765, 777, 'outBack');
        cards.push({
          key: 'badge|check|s5',
          x: 0.0, y: 1.92, z: -101.85,
          scX: 0.36 * scCheck, scY: 0.36 * scCheck,
          draw: (p) => drawBadge(p, 'check'),
        });
      }

      // Left of "NO DEAD ON TRIAL" Monument: Cheering Deacon celebrating the permanent ban
      cards.push({
        key: `deacon|s5a|up|${M.blinkAt(f, 22) ? 1 : 0}`,
        x: -0.98, y: 0, z: -101.55,
        scY: 0.94, rotZ: 0,
        draw: (p) => humanFront(p, 'deacon', {
          seed: 11, expr: 'happy', arm: 'up',
          blink: M.blinkAt(f, 22), facing: 0.35,
        }),
      });
      contactBlob(fx, -0.98, 0, -101.55, sun, light, 0.92);
    } else {
      // Beat 5b (f = 815..899): Rolling Ceremonial Papal Carriage with PAPAL EDICT 897 Seal!
      const uCart = M.ease(f, 815, 899, 'out2');
      const cx = M.lerp(-1.35, 0.25, uCart);
      camPos = [0.05, 1.68, -93.15];
      camTgt = [0.05, 1.48, -100.2];
      fov = 44;
      dofFocus = camPos[2] - (-99.55);

      if (world) {
        world.papalCart.visible = true;
        // Place rolling papalCart at z = -100.55 (front wheels at z = -99.63) so foreground Skeleton Pope at z = -98.85 never touches it
        world.papalCart.position.set(cx, 0, -100.55);
        const wheelSpin = -(cx + 1.35) / 0.52;
        for (const w of world.cartWheels) w.rotation.z = wheelSpin;
      }

      // Restored Skeleton Pope Formosus riding in front of the Papal Edict carriage, waving his 3 blessing fingers!
      cards.push({
        key: `formosus|s5b|cart|${(f >> 1) & 3}`,
        x: cx + 0.72, y: 0.52, z: -98.85,
        scX: 0.72, scY: 0.72, rotZ: 0.02 * Math.sin(f * 0.4),
        draw: (p) => drawSkeletonPope(p, {
          pose: 'puppet', robes: true, mitre: true, fingers: 3, jawOpen: 0.25,
          phase: (f % 30) / 30,
        }),
      });

      cards.push({
        key: `deacon|s5b|up`,
        x: -1.15, y: 0, z: -101.85,
        scY: 0.94, rotZ: 0,
        draw: (p) => humanFront(p, 'deacon', {
          seed: 11, expr: 'happy', arm: 'up', facing: 0.3,
        }),
      });
      cards.push({
        key: `guard|s5b|up`,
        x: 1.25, y: 0, z: -101.85,
        scY: 0.95, rotZ: 0,
        draw: (p) => humanFront(p, 'guard', {
          seed: 5, expr: 'happy', arm: 'up', facing: -0.3,
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
