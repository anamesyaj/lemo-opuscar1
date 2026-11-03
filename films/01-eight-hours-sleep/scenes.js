// Style frames for "Why You're Tired After 8 Hours of Sleep" (impasto).
// Own scenes for this film's treatment — bedroom night, sleep-cycle chart, morning.
// 1080x1920 units, scale 1.
import { Ref, paintRef } from './engine/plate.js';

const P = pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const E = (x, y, rx, ry, rot = 0) => c => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
const RR = (x, y, w, h, r) => c => c.roundRect(x, y, w, h, r);
const lin = (x0, y0, x1, y1, stops) => c => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const rad = (x, y, r0, r1, stops) => c => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const SERIF = 'Georgia, "Times New Roman", serif';

const W = 1080, H = 1920;

// ---------- Scene 1: night bedroom — the SLEEPER is the subject ----------
// Closer framing: head in profile on the pillow (hair, closed eye, peaceful
// mouth), blanket over the shoulder. Monochrome world (grey:1); the red alarm
// clock is a separate ref (grey:0). Window/moon/bed secondary.
export function buildBedroom() {
  const R = new Ref(W, H, 1);
  // wall + floor (value-first: 3+ values)
  R.fill(P([[0, 0], [W, 0], [W, 1560], [0, 1560]]),
    lin(0, 0, 0, 1560, [[0, '#232936'], [.6, '#181c26'], [1, '#10131a']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 55, detail: 2 });
  R.fill(P([[0, 1560], [W, 1560], [W, H], [0, H]]),
    lin(0, 1560, 0, H, [[0, '#201913'], [1, '#100c08']]),
    { dir: 0, fallback: 0, group: 'floor', maxR: 40 });
  // window with moon — small, secondary, upper right
  R.fill(RR(740, 200, 260, 340, 14), '#0b0d11', { dir: 90, group: 'winf', maxR: 14 });
  R.fill(RR(762, 222, 216, 296, 8),
    lin(762, 222, 978, 518, [[0, '#2b3850'], [1, '#121724']]),
    { dir: 90, group: 'wing', maxR: 20 });
  R.fill(E(870, 330, 52, 52), '#dfe6f2', { maxR: 9, group: 'moon' });
  R.tint(E(870, 330, 120, 120), rad(870, 330, 16, 120, [[0, 'rgba(200,215,235,.28)'], [1, 'rgba(200,215,235,0)']]));
  R.fill(P([[862, 222], [884, 222], [884, 518], [862, 518]]), '#0b0d11', { dir: 90, group: 'winf', maxR: 7 });
  R.fill(P([[762, 358], [978, 358], [978, 380], [762, 380]]), '#0b0d11', { dir: 0, group: 'winf', maxR: 7 });
  // headboard hint behind the pillow, right edge
  R.fill(RR(880, 980, 200, 430, 30), '#241d15', { dir: 90, group: 'bed', maxR: 24 });
  // pillow — the light plane the sleeper reads against
  R.fill(RR(90, 1060, 900, 300, 90),
    lin(90, 1060, 990, 1360, [[0, '#5d6372'], [1, '#434856']]),
    { dir: 0, fallback: 0, group: 'pillow', maxR: 30, detail: 1.8 });
  R.fill(E(470, 1205, 215, 64), '#3b404d', { group: 'pillow', maxR: 18 });
  // hair mass (face overlaps its front edge)
  R.fill(P([[350, 815], [470, 782], [590, 820], [652, 925], [658, 1050], [632, 1165], [582, 1235], [545, 1180], [562, 1080], [542, 985], [502, 900], [428, 858]]),
    '#2b2724', { dir: -30, fallback: -30, group: 'hair', maxR: 22, detail: 1.6 });
  R.fill(E(705, 1235, 92, 32, .25), '#2b2724', { maxR: 12, group: 'hair' });
  R.fill(E(795, 1272, 58, 22, .3), '#332e2a', { maxR: 10, group: 'hair' });
  // face in profile, facing left
  R.fill(P([[380, 830], [310, 860], [285, 920], [278, 962], [262, 1000], [250, 1032], [268, 1054], [260, 1074], [272, 1092], [264, 1110], [282, 1132], [312, 1162], [362, 1192], [432, 1212], [472, 1262], [560, 1292], [622, 1242], [642, 1152], [646, 1052], [622, 952], [562, 882], [472, 842]]),
    lin(250, 830, 646, 1292, [[0, '#9499a5'], [1, '#787d89']]),
    { dir: -24, fallback: -24, group: 'face', maxR: 14, detail: 2 });
  R.fill(E(505, 1062, 30, 38), '#7e838e', { maxR: 8, group: 'face' });
  R.fill(E(505, 1066, 14, 20), '#5e636d', { maxR: 5, group: 'face' });
  // closed eye, eyebrow, peaceful mouth
  R.line(c => { c.arc(338, 986, 27, Math.PI * .12, Math.PI * .88); }, '#26232a', 11, { group: 'eye', maxR: 4 });
  R.line(c => { c.moveTo(298, 932); c.lineTo(368, 944); }, '#26232a', 13, { group: 'eye', maxR: 4 });
  R.line(c => { c.moveTo(272, 1094); c.quadraticCurveTo(288, 1102, 304, 1096); }, '#4a4e57', 9, { group: 'eye', maxR: 4 });
  R.fill(E(292, 1058, 16, 10), '#6a6f7a', { maxR: 5, group: 'face' });
  // blanket pulled up over the shoulder
  R.fill(P([[240, 1330], [560, 1290], [900, 1380], [1080, 1440], [1080, H], [0, H], [0, 1500]]),
    lin(0, 1300, 1080, 1920, [[0, '#414a63'], [1, '#272c3d']]),
    { dir: -14, fallback: -14, group: 'blanket', maxR: 34, detail: 1.6 });
  R.fill(E(560, 1315, 150, 58), '#4e5872', { group: 'blanket', maxR: 20 });
  R.fill(E(560, 1350, 150, 38), '#323847', { group: 'blanket', maxR: 16 });
  // moonlight wash over the sleeper
  R.tint(E(520, 1150, 430, 220), rad(520, 1150, 40, 430, [[0, 'rgba(200,215,235,.16)'], [1, 'rgba(200,215,235,0)']]));
  // nightstand, upper left — the clock's perch
  R.fill(RR(80, 700, 220, 300, 12), '#221b14', { dir: 90, group: 'stand', maxR: 20 });
  R.fill(RR(100, 1000, 180, 26, 8), '#191410', { dir: 0, group: 'stand', maxR: 8 });
  return { ref: R, strokes: paintRef(R, { seed: 71 }).data() };
}

// the one coloured thing: red alarm clock, own ref so it renders grey:0.
// cx, cy place it per scene (bedroom + morning put it on the nightstand).
export function buildClock(cx = 240, cy = 1060) {
  const R = new Ref(W, H, 1);
  R.fill(E(cx - 62, cy - 78, 30, 22, -.5), '#b8342a', { maxR: 8, group: 'bell' });
  R.fill(E(cx + 62, cy - 78, 30, 22, .5), '#b8342a', { maxR: 8, group: 'bell' });
  R.fill(P([[cx - 40, cy + 78], [cx - 58, cy + 122], [cx - 30, cy + 122]]), '#8e2a20', { maxR: 8, group: 'leg' });
  R.fill(P([[cx + 40, cy + 78], [cx + 58, cy + 122], [cx + 30, cy + 122]]), '#8e2a20', { maxR: 8, group: 'leg' });
  R.fill(E(cx, cy, 92, 92), '#c23a28', { maxR: 12, group: 'case' });
  R.fill(E(cx, cy, 64, 64), '#f2e8d8', { maxR: 8, group: 'face' });
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    R.fill(E(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, 5, 5), '#3a3430', { maxR: 3, group: 'ticks' });
  }
  R.line(c => { c.moveTo(cx, cy); c.lineTo(cx - 22, cy + 30); }, '#3a3430', 9, { group: 'hands', maxR: 4 });
  R.line(c => { c.moveTo(cx, cy); c.lineTo(cx + 34, cy - 12); }, '#3a3430', 7, { group: 'hands', maxR: 4 });
  R.fill(E(cx, cy, 9, 9), '#b8342a', { maxR: 4, group: 'hands' });
  R.tint(E(cx, cy, 190, 190), rad(cx, cy, 30, 190, [[0, 'rgba(220,70,45,.40)'], [1, 'rgba(220,70,45,0)']]));
  return { ref: R, strokes: paintRef(R, { seed: 21 }).data() };
}

// ---------- Scene 2: sleep-cycle chart ----------
export function buildChart() {
  const R = new Ref(W, H, 1);
  R.fill(P([[0, 0], [W, 0], [W, H], [0, H]]),
    lin(0, 0, 0, H, [[0, '#171d2e'], [1, '#0d1120']]),
    { dir: -6, fallback: -6, group: 'bg', maxR: 55, detail: 2 });
  R.text('ONE NIGHT · FIVE CYCLES', 540, 210, `700 64px ${SERIF}`, '#ece5d3', { maxR: 5, group: 'title' });
  R.text('each block = 90 minutes', 540, 272, `400 40px ${SERIF}`, '#9aa2b5', { maxR: 4, group: 'title' });
  const n = 5, bw = 150, gap = 32, x0 = (W - (n * bw + (n - 1) * gap)) / 2, y0 = 560, bh = 620;
  const bands = [
    { h: 240, c: '#93a0bd', label: 'LIGHT' },
    { h: 200, c: '#2e4a80', label: 'DEEP' },
    { h: 180, c: '#d9965a', label: 'DREAM' },
  ];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (bw + gap);
    let y = y0;
    bands.forEach((b, j) => {
      R.fill(RR(x, y, bw, b.h, 14),
        lin(x, y, x + bw, y, [[0, b.c], [1, b.c]]),
        { dir: j === 1 ? 90 : 0, group: 'band' + j, maxR: 18, detail: 1.5 });
      y += b.h;
    });
    R.text('90', x + bw / 2, y0 + bh + 62, `700 46px ${SERIF}`, '#ece5d3', { maxR: 4, group: 'cap' });
    R.text('MIN', x + bw / 2, y0 + bh + 104, `400 30px ${SERIF}`, '#9aa2b5', { maxR: 4, group: 'cap' });
  }
  // sine wave riding over the blocks
  R.line(c => {
    c.moveTo(x0 - 20, y0 + bh / 2);
    for (let x = x0 - 20; x <= x0 + n * bw + (n - 1) * gap + 20; x += 8)
      c.lineTo(x, y0 + bh / 2 + Math.sin((x - x0) / 90) * 120);
  }, '#e8e2d2', 12, { group: 'wave', maxR: 6 });
  // moon + sun bookends
  R.fill(E(80, 880, 42, 42), '#dfe6f2', { maxR: 8, group: 'moon' });
  R.fill(E(1000, 880, 42, 42), '#f4bc2a', { maxR: 8, group: 'sun' });
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    R.line(c => { c.moveTo(1000 + Math.cos(a) * 56, 880 + Math.sin(a) * 56); c.lineTo(1000 + Math.cos(a) * 78, 880 + Math.sin(a) * 78); }, '#f4bc2a', 8, { group: 'sun', maxR: 4 });
  }
  // legend
  const ly = 1520;
  [['LIGHT', '#93a0bd'], ['DEEP', '#2e4a80'], ['DREAM', '#d9965a']].forEach(([t, col], i) => {
    const lx = 200 + i * 300;
    R.fill(RR(lx, ly, 56, 56, 10), col, { maxR: 8, group: 'leg' + i });
    R.text(t, lx + 150, ly + 44, `600 40px ${SERIF}`, '#ece5d3', { align: 'left', maxR: 4, group: 'leg' + i });
  });
  return { ref: R, strokes: paintRef(R, { seed: 33 }).data() };
}

// ---------- Scene 3: morning — the WAKING PERSON is the subject ----------
// Same sleeper as the bedroom scene, now sitting up and stretching;
// warm morning light secondary.
export function buildMorning() {
  const R = new Ref(W, H, 1);
  // warm wall + floor
  R.fill(P([[0, 0], [W, 0], [W, 1560], [0, 1560]]),
    lin(0, 0, 0, 1560, [[0, '#e8b47e'], [.6, '#d29a63'], [1, '#a9784b']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 55, detail: 2 });
  R.fill(P([[0, 1560], [W, 1560], [W, H], [0, H]]),
    lin(0, 1560, 0, H, [[0, '#6e4c31'], [1, '#482f1d']]),
    { dir: 0, fallback: 0, group: 'floor', maxR: 40 });
  // sun window — smaller, secondary, upper right
  R.fill(RR(760, 220, 240, 320, 14), '#4a2f1c', { dir: 90, group: 'winf', maxR: 14 });
  R.fill(RR(780, 240, 200, 280, 8),
    lin(780, 240, 980, 520, [[0, '#ffedb8'], [1, '#f8cd7d']]),
    { dir: 90, group: 'wing', maxR: 20 });
  R.fill(E(880, 350, 58, 58), '#fff6d8', { maxR: 9, group: 'sun' });
  R.fill(P([[872, 240], [894, 240], [894, 520], [872, 520]]), '#4a2f1c', { dir: 90, group: 'winf', maxR: 7 });
  R.fill(P([[780, 368], [980, 368], [980, 390], [780, 390]]), '#4a2f1c', { dir: 0, group: 'winf', maxR: 7 });
  // soft sun shaft, secondary
  R.tint(P([[560, 300], [660, 300], [1080, 1300], [940, 1300]]), 'rgba(255,226,165,.26)');
  // blanket over the lap
  R.fill(P([[240, 1400], [840, 1380], [1080, 1500], [1080, H], [0, H], [0, 1560]]),
    lin(0, 1400, 1080, 1920, [[0, '#cf9463'], [1, '#9a6540']]),
    { dir: -12, fallback: -12, group: 'blanket', maxR: 34, detail: 1.6 });
  // torso — sleep shirt
  R.fill(RR(400, 1060, 280, 300, 80),
    lin(400, 1060, 680, 1360, [[0, '#d9a878'], [1, '#a97a4e']]),
    { dir: -8, fallback: -8, group: 'torso', maxR: 26, detail: 1.6 });
  // arms raised in a stretch: sleeves, elbow dabs, forearms, hands
  R.line(c => { c.moveTo(452, 1120); c.lineTo(342, 882); }, '#bd8857', 74, { group: 'arm', maxR: 12 });
  R.line(c => { c.moveTo(628, 1120); c.lineTo(738, 882); }, '#bd8857', 74, { group: 'arm', maxR: 12 });
  R.fill(E(342, 882, 42, 42), '#bd8857', { maxR: 12, group: 'arm' });
  R.fill(E(738, 882, 42, 42), '#bd8857', { maxR: 12, group: 'arm' });
  R.line(c => { c.moveTo(342, 882); c.lineTo(292, 772); }, '#e0aa72', 54, { group: 'arm', maxR: 10 });
  R.line(c => { c.moveTo(738, 882); c.lineTo(788, 772); }, '#e0aa72', 54, { group: 'arm', maxR: 10 });
  R.fill(E(284, 748, 34, 38), '#e0aa72', { maxR: 10, group: 'hand' });
  R.fill(E(796, 748, 34, 38), '#e0aa72', { maxR: 10, group: 'hand' });
  // neck + hair mass, then the face over it — same dark hair as the sleeper
  R.fill(RR(505, 1022, 70, 80, 22), '#c08b58', { dir: 90, group: 'neck', maxR: 10 });
  R.fill(E(540, 872, 122, 132), '#4a3524', { maxR: 16, group: 'hair', detail: 1.8 });
  R.fill(E(540, 950, 92, 100), '#dfa26e', { maxR: 12, group: 'head', detail: 2 });
  R.fill(E(436, 1010, 42, 72, .18), '#4a3524', { maxR: 12, group: 'hair' });
  R.fill(E(644, 1010, 42, 72, -.18), '#4a3524', { maxR: 12, group: 'hair' });
  // calm awake face: open eyes, brows, nose dab, gentle smile
  R.fill(E(448, 958, 17, 23), '#cf9459', { maxR: 7, group: 'head' });
  R.fill(E(632, 958, 17, 23), '#cf9459', { maxR: 7, group: 'head' });
  R.fill(E(498, 950, 13, 8), '#2e2620', { maxR: 4, group: 'eye' });
  R.fill(E(582, 950, 13, 8), '#2e2620', { maxR: 4, group: 'eye' });
  R.line(c => { c.moveTo(470, 910); c.lineTo(524, 917); }, '#3a2c20', 11, { group: 'eye', maxR: 4 });
  R.line(c => { c.moveTo(556, 917); c.lineTo(610, 910); }, '#3a2c20', 11, { group: 'eye', maxR: 4 });
  R.fill(E(540, 986, 10, 14), '#c08b58', { maxR: 4, group: 'head' });
  R.line(c => { c.arc(540, 998, 32, Math.PI * .18, Math.PI * .82); }, '#7a4a30', 9, { group: 'mouth', maxR: 4 });
  // warm wash over the waker
  R.tint(E(540, 1000, 400, 340), rad(540, 1000, 40, 400, [[0, 'rgba(255,222,160,.14)'], [1, 'rgba(255,222,160,0)']]));
  // nightstand + clock, upper left
  R.fill(RR(80, 700, 220, 300, 12), '#5a3d24', { dir: 90, group: 'stand', maxR: 20 });
  R.fill(RR(100, 1000, 180, 26, 8), '#42291a', { dir: 0, group: 'stand', maxR: 8 });
  return { ref: R, strokes: paintRef(R, { seed: 75 }).data() };
}
