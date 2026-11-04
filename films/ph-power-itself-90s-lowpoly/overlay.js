// overlay.js — fact labels as STYLE.md §4 titles: geometric caps, wide tracking,
// letters rise one by one with overshoot and settle; sub-line + SRC note fade in.
// Drawn on the #ov 2D canvas after the GL pass. No narration subtitles (user's own).
const W = 1080, H = 1920;
const cv = document.getElementById('ov');
const x = cv.getContext('2d');

const LABELS = [
  { t0: 14, t1: 22, title: 'BATAAN', sub: 'Completed 1984. Never fueled.', src: 'SRC · DOE PHILIPPINES' },
  { t0: 28, t1: 37, title: 'GEOTHERMAL', sub: 'Top producer — barely tapped.', src: 'SRC · DOE PHILIPPINES' },
  { t0: 44, t1: 52, title: 'HYDRO · SOLAR · WIND', sub: 'Unbuilt capacity on every island.', src: 'SRC · DOE PHILIPPINES' },
  { t0: 58, t1: 66, title: 'POWER PRICE', sub: "Among Asia's highest today.", src: 'SRC · DOE PHILIPPINES' },
];
window.__LABELS = LABELS;

const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOutBack = u => { const c = 1.70158; u = clamp01(u); return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

function drawLabel(L, t) {
  const rise = .55, stagger = .055, n = L.title.length;
  const fadeOut = clamp01((L.t1 - t) / .6);
  const fadeIn = clamp01((t - L.t0) / .3);
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;
  x.save();
  x.globalAlpha = alpha;
  x.textAlign = 'center';
  const cx = W / 2, baseY = 640;
  // title: letters rise 55 ms apart from below with overshoot
  // shrink-to-fit: titles never exceed 920 px of the 1080 px frame
  let fontPx = 84, trackPx = 14;
  const setTitleFont = () => {
    x.font = `600 ${fontPx}px "Josefin Sans", sans-serif`;
    try { x.letterSpacing = `${trackPx}px`; } catch (e) {}
  };
  const measureTitle = () => {
    setTitleFont();
    const ws = [...L.title].map(ch => x.measureText(ch).width + trackPx);
    return { ws, total: ws.reduce((a, b) => a + b, 0) - trackPx };
  };
  let { ws: widths, total } = measureTitle();
  if (total > 920) {
    const k = 920 / total;
    fontPx = Math.max(24, Math.floor(fontPx * k));
    trackPx = Math.max(2, Math.round(trackPx * k));
    ({ ws: widths, total } = measureTitle());
  }
  let px = cx - total / 2;
  const amber = '240,200,120';
  [...L.title].forEach((ch, i) => {
    const u = easeOutBack((t - L.t0 - i * stagger) / rise);
    const y = baseY + (1 - u) * 90;
    x.fillStyle = `rgba(${amber},${clamp01((t - L.t0 - i * stagger) / .2)})`;
    x.shadowColor = 'rgba(20,30,60,.55)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
    x.fillText(ch, px + widths[i] / 2 - trackPx / 2, y);
    px += widths[i];
  });
  x.shadowColor = 'transparent'; x.shadowBlur = 0; x.shadowOffsetY = 0;
  try { x.letterSpacing = '2px'; } catch (e) {}
  // sub-line + src fade in after the title settles
  const subA = clamp01((t - L.t0 - .5) / .4) * alpha;
  if (subA > 0) {
    x.globalAlpha = subA;
    x.font = '600 40px "Quicksand", sans-serif';
    x.fillStyle = '#fffdf8';
    x.shadowColor = 'rgba(20,30,60,.5)'; x.shadowBlur = 12;
    x.fillText(L.sub, cx, baseY + 78);
    x.font = '500 28px "IBM Plex Mono", monospace';
    x.fillStyle = 'rgba(255,253,248,.75)';
    x.fillText(L.src, cx, baseY + 132);
  }
  x.restore();
}

export function drawLabels(t) {
  x.clearRect(0, 0, W, H);
  for (const L of LABELS) if (t >= L.t0 - .1 && t <= L.t1) drawLabel(L, t);
}
