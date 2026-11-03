// "Why You're Tired After 8 Hours of Sleep" — impasto film page.
// Look mode:  ?scene=bedroom|chart|morning  → one composed style frame (still.mjs)
// Film mode:  ?film=1                        → full 60 s timeline (render-chunk.mjs)
// Page contract: window.render(t), window.DUR, window.READY.
import { Impasto } from './engine/impasto.js';
import { buildBedroom, buildClock, buildChart, buildMorning } from './scenes.js';

const W = 1080, H = 1920;
const q = new URLSearchParams(location.search);
const scene = q.get('scene') || 'bedroom';
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const E = new Impasto(canvas, { W, H, ss: 2 });
const cam = { x: W / 2, y: H / 2, zoom: 1 };

// each entry: {S (built scene), grey} — grey:1 = monochrome world, grey:0 = colour
let parts, post;
if (scene === 'bedroom') {
  const room = buildBedroom(), clock = buildClock(190, 600);
  parts = [
    { S: room, grey: 1, reveal: 1e6 },
    { S: clock, grey: 0, reveal: 1e6 },
  ];
  post = { light: [-.35, -.55, .72], amb: .55, dif: .3, spec: .2, ao: 1.2, expo: .95, sat: 1, vig: .35 };
} else if (scene === 'chart') {
  parts = [{ S: buildChart(), grey: 0, reveal: -1e6 }];
  post = { light: [-.5, -.6, .7], amb: .75, dif: .3, spec: .18, ao: 1.1, expo: 1, sat: 1.05, vig: .3 };
} else { // morning
  const room = buildMorning(), clock = buildClock(190, 600);
  parts = [
    { S: room, grey: 0, reveal: -1e6 },
    { S: clock, grey: 0, reveal: -1e6 },
  ];
  // raking light: low grazing angle so every ridge catches it
  post = { light: [-.85, -.14, .5], amb: .7, dif: .34, spec: .3, ao: 1.1, expo: 1.02, sat: 1.05, vig: .3 };
}

const baked = parts.map(({ S, grey, reveal }) => ({
  batch: E.batch(S.strokes),
  tex: E.texture(S.ref.ctx.canvas),
  grey, reveal,
}));

window.render = t => {
  E.begin();
  const o = { cam, t };
  for (const b of baked) {
    E.under(b.tex, W, H, { ...o, grey: b.grey, reveal: b.reveal });
    E.draw(b.batch, { ...o, grey: b.grey, reveal: b.reveal });
  }
  E.finish(post);
};
window.DUR = 60;
window.render(0);
window.READY = true;
