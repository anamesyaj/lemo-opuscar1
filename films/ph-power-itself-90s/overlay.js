// overlay.js — 2D marks overlay for Satellite Briefing: hairlines, brackets,
// reticle, readouts, analyst labels with leader lines, transmission lines,
// instruments. All ground-anchored marks go through project(); only
// instruments and the credit line are screen-space. Deterministic.

import { W, H, project } from './engine.js';

const WHITE = '#F2F5F6';
const AMBER = '#FFBE55';
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => {
  const s = clamp((x - a) / (b - a), 0, 1);
  return s * s * (3 - 2 * s);
};
// deterministic pseudo-random from a seed (no Math.random in render path)
const rnd = (seed) => {
  let h = seed * 127.1 + 311.7;
  const s = Math.sin(h) * 43758.5453;
  return s - Math.floor(s);
};

function haloText(ctx, text, x, y, font, fill, align = 'left') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function hairline(ctx, x1, y1, x2, y2, color = WHITE, w = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

// lock-on reticle: 4 corner brackets + centre dot
function reticle(ctx, x, y, size, alpha, snap) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 2.6;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 8;
  const s = size * snap, g = s * 0.32, o = s / 2;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * o - sx * g, y + sy * o);
    ctx.lineTo(x + sx * o, y + sy * o);
    ctx.lineTo(x + sx * o, y + sy * o - sy * g);
    ctx.stroke();
  }
  ctx.fillStyle = WHITE;
  ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Fit a condensed title to maxWidth by shrinking; returns used px size.
function fitTitle(ctx, lines, maxWidth, base = 72) {
  let size = base;
  ctx.save();
  while (size > 36) {
    ctx.font = `600 ${size}px 'Barlow Condensed'`;
    if (lines.every(l => ctx.measureText(l).width <= maxWidth)) break;
    size -= 2;
  }
  ctx.restore();
  return size;
}

function wrapLines(ctx, text, font, maxWidth) {
  ctx.save();
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width <= maxWidth || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  ctx.restore();
  return lines;
}

// Analyst label: amber reading title, white sub, mono source note, leader line
// to the ground anchor. Block lives in the right third.
function label(ctx, cam, spec, t, S) {
  const aIn = sstep(spec.t0, spec.t0 + 0.45, t);
  const aOut = 1 - sstep(spec.t1 - 0.6, spec.t1, t);
  const alpha = Math.min(aIn, aOut);
  if (alpha <= 0.001) return;
  const anchor = typeof spec.anchor === 'function' ? spec.anchor(t, S) : spec.anchor;
  const p = project(anchor[0], anchor[1], cam);
  if (p.behind) return;

  const maxW = 330;
  const titleSize = fitTitle(ctx, spec.title, maxW);
  const subFont = `400 33px 'Barlow Condensed'`;
  const subLines = wrapLines(ctx, spec.sub, subFont, maxW);
  const srcFont = `400 22px 'IBM Plex Mono'`;

  const lh = titleSize * 1.02, sh = 40, gap = 14;
  const blockH = spec.title.length * lh + gap + subLines.length * sh + 10 + 30;
  const blockW = maxW + 30;
  let bx = clamp(p.x + 130, W - blockW - 36, W - blockW - 36);
  // keep the block clear of the very top/bottom instruments
  let by = clamp(p.y - blockH / 2, 150, H - blockH - 260);
  // never cover the anchor itself
  if (bx < p.x + 40) bx = W - blockW - 36;

  ctx.save();
  ctx.globalAlpha = alpha;
  // leader line: from block's left edge midpoint to the anchor
  const ly = by + (spec.title.length * lh) / 2;
  hairline(ctx, bx - 14, ly, p.x, p.y, WHITE, 2);
  ctx.fillStyle = WHITE;
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  let y = by + titleSize * 0.92;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${titleSize}px 'Barlow Condensed'`;
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 10;
  ctx.fillStyle = AMBER;
  for (const line of spec.title) { ctx.fillText(line, bx, y); y += lh; }
  y += gap * 0.4;
  ctx.font = subFont;
  ctx.fillStyle = 'rgba(242,245,246,0.96)';
  for (const line of subLines) { ctx.fillText(line, bx, y); y += sh; }
  y += 8;
  ctx.font = srcFont;
  ctx.fillStyle = 'rgba(242,245,246,0.62)';
  ctx.fillText('SRC · ' + spec.src, bx, y);
  ctx.restore();
}

// Transmission lines: polylines in lon/lat, amber, drawn progressively and
// revealed behind the scan front (lat > frontLat while the front moves north->south).
function transmission(ctx, cam, lines, t, frontLat) {
  ctx.save();
  ctx.lineCap = 'round';
  // the projected grid is a claim of the 50-65 s beat: it fades as night falls
  ctx.globalAlpha = 1 - sstep(63.5, 65.5, t);
  for (const L of lines) {
    const prog = sstep(L.t0, L.t1, t);
    if (prog <= 0.001) continue;
    const pts = L.pts.map(([lo, la]) => ({ ...project(lo, la, cam), la }));
    const total = pts.length - 1;
    const upto = prog * total;
    for (let i = 0; i < total; i++) {
      const f0 = i / total, f1 = (i + 1) / total;
      if (f0 > upto) break;
      const A = pts[i], B = pts[i + 1];
      if (A.behind || B.behind) continue;
      if (A.la < frontLat || B.la < frontLat) continue; // not yet swept
      const f = clamp((upto - i), 0, 1);
      const ex = A.x + (B.x - A.x) * f, ey = A.y + (B.y - A.y) * f;
      ctx.strokeStyle = AMBER; ctx.lineWidth = 2.6;
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(ex, ey); ctx.stroke();
      // tick marks every segment joint
      if (i > 0 && f >= 1) {
        const dx = B.x - A.x, dy = B.y - A.y, m = Math.hypot(dx, dy) || 1;
        const nx = -dy / m, ny = dx / m;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(A.x - nx * 7, A.y - ny * 7);
        ctx.lineTo(A.x + nx * 7, A.y + ny * 7);
        ctx.stroke();
      }
    }
    // origin node
    const O = pts[0];
    if (!O.behind && prog > 0.02) {
      ctx.fillStyle = AMBER;
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(O.x, O.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = WHITE; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(O.x, O.y, 9, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

// soft radial city glow, screen space at the projected city
function cityGlow(ctx, cam, sites, t, t0, t1, maxR) {
  const a = sstep(t0, t1, t) * (1 - sstep(63, 65.5, t)); // gone when night falls
  if (a <= 0.001) return;
  ctx.save();
  for (const [lo, la, r] of sites) {
    const p = project(lo, la, cam);
    if (p.behind) continue;
    const R = r * maxR;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, `rgba(255,190,85,${0.34 * a})`);
    g.addColorStop(1, 'rgba(255,190,85,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function monoTag(ctx, text, x, y, alpha, align = 'left') {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  haloText(ctx, text, x, y, `500 22px 'IBM Plex Mono'`, AMBER, align);
  ctx.restore();
}

function instruments(ctx, cam, t, S) {
  // altitude readout, top-left
  const alt = cam.alt;
  const altTxt = alt >= 100 ? `ALT ${Math.round(alt).toLocaleString('en-US').replace(/,/g, ' ')} KM`
                            : `ALT ${alt.toFixed(1)} KM`;
  haloText(ctx, altTxt, 40, 64, `500 26px 'IBM Plex Mono'`, 'rgba(242,245,246,0.92)');

  // scale bar, bottom-right: nice 1/2/5 length near 170 px
  const kmPerPx = (2 * cam.alt * Math.tan(15 * Math.PI / 180)) / H;
  const target = 170 * kmPerPx;
  const pow10 = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / pow10;
  const nice = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  const km = nice * pow10;
  const px = km / kmPerPx;
  const x1 = W - 40 - px, x2 = W - 40, y = H - 64;
  ctx.save();
  ctx.strokeStyle = 'rgba(242,245,246,0.92)';
  ctx.lineWidth = 2.4;
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y); ctx.lineTo(x2, y);
  ctx.moveTo(x1, y - 8); ctx.lineTo(x1, y + 8);
  ctx.moveTo(x2, y - 8); ctx.lineTo(x2, y + 8);
  ctx.stroke();
  ctx.restore();
  const label = km >= 1 ? `${km} KM` : `${Math.round(km * 1000)} M`;
  haloText(ctx, label, (x1 + x2) / 2, y - 18, `500 24px 'IBM Plex Mono'`, 'rgba(242,245,246,0.92)', 'center');

  // imagery credit, bottom-left, 80-90 s only
  const ca = sstep(80, 80.8, t) * (1 - sstep(89.2, 90, t));
  if (ca > 0.001) {
    ctx.save(); ctx.globalAlpha = ca;
    haloText(ctx, 'Contains modified Copernicus Sentinel data 2024', 40, H - 96,
             `400 22px 'IBM Plex Mono'`, 'rgba(242,245,246,0.85)');
    haloText(ctx, 'Sentinel-2 cloudless © EOX (2016)', 40, H - 62,
             `400 22px 'IBM Plex Mono'`, 'rgba(242,245,246,0.85)');
    ctx.restore();
  }
  void S;
}

export function drawOverlay(ctx, cam, t, S, D) {
  ctx.clearRect(0, 0, W, H);

  // ---- reticles: search drift -> snap with overshoot -> hold -> fade
  for (const R of D.reticles) {
    if (t < R.tSearch || t > R.tFade1) continue;
    const p = project(R.anchor[0], R.anchor[1], cam);
    if (p.behind) continue;
    let ox = 0, oy = 0, snap = 1, alpha = 1;
    if (t < R.tLock) {
      const k = (t - R.tSearch) / Math.max(R.tLock - R.tSearch, 0.01);
      const d = (1 - k) * 46;
      ox = (rnd(R.seed) - 0.5) * 2 * d;
      oy = (rnd(R.seed + 7) - 0.5) * 2 * d;
      alpha = sstep(R.tSearch, R.tSearch + 0.4, t);
    } else {
      const e = t - R.tLock;
      snap = e < 0.38 ? 1 + 0.32 * Math.cos(e / 0.38 * Math.PI * 0.5) * (1 - e / 0.38) : 1;
      alpha = 1 - sstep(R.tHold1, R.tFade1, t);
    }
    reticle(ctx, p.x + ox, p.y + oy, 96, alpha, snap);
  }

  // ---- amber claim tags (mono, analysis register)
  for (const tg of D.tags) {
    const a = sstep(tg.t0, tg.t0 + 0.5, t) * (1 - sstep(tg.t1 - 0.6, tg.t1, t));
    const at = typeof tg.at === 'function' ? tg.at(t, S) : tg.at;
    const p = project(at[0], at[1], cam);
    if (!p.behind) monoTag(ctx, tg.text, clamp(p.x + tg.dx, 40, W - 320), clamp(p.y + tg.dy, 120, H - 200), a);
  }

  // ---- transmission lines + city brightening (grid beat)
  transmission(ctx, cam, D.lines, t, S.gridFront);
  cityGlow(ctx, cam, D.cities, t, 54, 62, 150);

  // ---- labels (one finding per screen)
  for (const L of D.labels) label(ctx, cam, L, t, S);

  // ---- instruments (screen space)
  instruments(ctx, cam, t, S);
}
