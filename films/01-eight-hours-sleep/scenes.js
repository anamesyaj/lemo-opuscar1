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

// ---------- Scene 1: night bedroom, monochrome world + one red alarm clock ----------
export function buildBedroom() {
  const R = new Ref(W, H, 1);
  // wall + floor (value-first: 3+ values each via gradient)
  R.fill(P([[0, 0], [W, 0], [W, 1300], [0, 1300]]),
    lin(0, 0, 0, 1300, [[0, '#262c38'], [.6, '#1a1e28'], [1, '#12151c']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 55, detail: 2 });
  R.fill(P([[0, 1300], [W, 1300], [W, H], [0, H]]),
    lin(0, 1300, 0, H, [[0, '#231c15'], [1, '#120e0a']]),
    { dir: 0, fallback: 0, group: 'floor', maxR: 40 });
  R.fill(P([[0, 1290], [W, 1290], [W, 1312], [0, 1312]]), '#0d0b09', { dir: 0, group: 'base', maxR: 8 });
  // window with moon
  R.fill(RR(90, 280, 340, 440, 18), '#0c0e12', { dir: 90, group: 'winf', maxR: 16 });
  R.fill(RR(112, 302, 296, 396, 10),
    lin(112, 302, 408, 698, [[0, '#2c3a52'], [1, '#131826']]),
    { dir: 90, group: 'wing', maxR: 22 });
  R.fill(E(260, 450, 74, 74), '#dfe6f2', { maxR: 10, group: 'moon' });
  R.tint(E(260, 450, 170, 170), rad(260, 450, 20, 170, [[0, 'rgba(200,215,235,.30)'], [1, 'rgba(200,215,235,0)']]));
  R.fill(P([[248, 302], [272, 302], [272, 698], [248, 698]]), '#0c0e12', { dir: 90, group: 'winf', maxR: 8 });
  R.fill(P([[112, 488], [408, 488], [408, 512], [112, 512]]), '#0c0e12', { dir: 0, group: 'winf', maxR: 8 });
  // bed: headboard, mattress, blanket, pillow, sleeper
  R.fill(RR(620, 880, 420, 380, 24), '#2b2119', { dir: 90, group: 'bed', maxR: 26 });
  R.fill(RR(580, 1140, 480, 190, 30), '#3a3f4a', { dir: 0, group: 'bed', maxR: 24 });
  R.fill(RR(580, 1180, 480, 300, 60),
    lin(580, 1180, 1060, 1480, [[0, '#3b4257'], [1, '#262b3a']]),
    { dir: -18, fallback: -18, group: 'blanket', maxR: 30, detail: 1.8 });
  R.fill(E(820, 1330, 150, 90), '#2e3444', { group: 'blanket', maxR: 22 }); // knee lump
  R.fill(RR(660, 1090, 260, 110, 40), '#4a5060', { dir: 0, group: 'pillow', maxR: 16 });
  R.fill(E(790, 1128, 58, 58), '#6a6f7a', { maxR: 8, group: 'head' });
  R.fill(c => { c.arc(790, 1112, 60, Math.PI, 0); c.closePath(); }, '#2c2823', { maxR: 8, group: 'hair' });
  // nightstand
  R.fill(RR(120, 1150, 240, 330, 12), '#241d16', { dir: 90, group: 'stand', maxR: 20 });
  R.fill(P([[140, 1480], [170, 1480], [165, 1620], [135, 1620]]), '#1a1410', { dir: 90, group: 'stand', maxR: 8 });
  R.fill(P([[310, 1480], [340, 1480], [345, 1620], [315, 1620]]), '#1a1410', { dir: 90, group: 'stand', maxR: 8 });
  // rug
  R.fill(E(540, 1700, 340, 95), '#1d2027', { dir: 0, group: 'rug', maxR: 24 });
  return { ref: R, strokes: paintRef(R, { seed: 7 }).data() };
}

// the one coloured thing: red alarm clock, own ref so it renders grey:0
export function buildClock() {
  const R = new Ref(W, H, 1);
  const cx = 240, cy = 1060;
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

// ---------- Scene 3: morning room, raking light ----------
export function buildMorning() {
  const R = new Ref(W, H, 1);
  R.fill(P([[0, 0], [W, 0], [W, 1300], [0, 1300]]),
    lin(0, 0, 0, 1300, [[0, '#e3ac74'], [.6, '#cf9660'], [1, '#a9744a']]),
    { dir: 90, fallback: 90, group: 'wall', maxR: 55, detail: 2 });
  R.fill(P([[0, 1300], [W, 1300], [W, H], [0, H]]),
    lin(0, 1300, 0, H, [[0, '#6b4a30'], [1, '#472e1c']]),
    { dir: 0, fallback: 0, group: 'floor', maxR: 40 });
  R.fill(P([[0, 1290], [W, 1290], [W, 1312], [0, 1312]]), '#3a2417', { dir: 0, group: 'base', maxR: 8 });
  // bright window + sun
  R.fill(RR(90, 280, 340, 440, 18), '#4a2f1c', { dir: 90, group: 'winf', maxR: 16 });
  R.fill(RR(112, 302, 296, 396, 10),
    lin(112, 302, 408, 698, [[0, '#ffe9b0'], [1, '#f7c878']]),
    { dir: 90, group: 'wing', maxR: 22 });
  R.fill(E(260, 450, 80, 80), '#fff3cf', { maxR: 10, group: 'sun' });
  R.fill(P([[248, 302], [272, 302], [272, 698], [248, 698]]), '#4a2f1c', { dir: 90, group: 'winf', maxR: 8 });
  R.fill(P([[112, 488], [408, 488], [408, 512], [112, 512]]), '#4a2f1c', { dir: 0, group: 'winf', maxR: 8 });
  // sun shafts raking across the room
  R.tint(P([[430, 340], [560, 340], [1080, 1500], [900, 1500]]), 'rgba(255,224,160,.30)');
  R.tint(P([[430, 520], [520, 520], [980, 1620], [840, 1620]]), 'rgba(255,224,160,.22)');
  // bed, sleeper sitting up
  R.fill(RR(620, 880, 420, 380, 24), '#5a3a24', { dir: 90, group: 'bed', maxR: 26 });
  R.fill(RR(580, 1140, 480, 190, 30), '#8a6a4a', { dir: 0, group: 'bed', maxR: 24 });
  R.fill(RR(580, 1150, 480, 330, 60),
    lin(580, 1150, 1060, 1480, [[0, '#c98d5e'], [1, '#96603c']]),
    { dir: -18, fallback: -18, group: 'blanket', maxR: 30, detail: 1.8 });
  R.fill(RR(680, 1020, 220, 170, 60), '#e8b98a', { maxR: 14, group: 'torso' }); // shoulders
  R.fill(E(790, 960, 58, 62), '#d9a06f', { maxR: 8, group: 'head' });
  R.fill(c => { c.arc(790, 944, 60, Math.PI, 0); c.closePath(); }, '#4a3524', { maxR: 8, group: 'hair' });
  R.fill(RR(120, 1150, 240, 330, 12), '#5a3d24', { dir: 90, group: 'stand', maxR: 20 });
  R.fill(E(540, 1700, 340, 95), '#8a5f3a', { dir: 0, group: 'rug', maxR: 24 });
  return { ref: R, strokes: paintRef(R, { seed: 55 }).data() };
}
