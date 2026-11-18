/* ---------- 2D STUDIO BACKDROP, 3D-PROJECTED DIAGRAM TAGS, TOP BADGES & SAFE CAPTIONS ---------- */

const BEAT_BADGES = [
  { id: "badge-1", t0: 0.00,  t1: 3.30,  text: "1 DROP OF LAVA?",            accent: "#ff7a29" },
  { id: "badge-2", t0: 3.30,  t1: 10.20, text: "1,200°C · 12× BOILING WATER", accent: "#ff7a29" },
  { id: "badge-3", t0: 10.20, t1: 17.00, text: "STEAM EXPANDS 1,700×",       accent: "#38bdf8" },
  { id: "badge-4", t0: 17.00, t1: 23.40, text: "LEIDENFROST VAPOR CUSHION",  accent: "#38bdf8" },
  { id: "badge-5", t0: 23.40, t1: 30.20, text: "STEAM SWELLS AIRWAY SHUT",   accent: "#ff4d4f" },
  { id: "badge-6", t0: 30.20, t1: 36.80, text: "BURNS ESOPHAGUS CRATER",     accent: "#ff7a29" },
  { id: "badge-7", t0: 36.80, t1: 44.10, text: "MYTH BUSTED · ONLY 1,000 J", accent: "#facc15" },
  { id: "badge-8", t0: 44.10, t1: 51.40, text: "QUENCHED TO VOLCANIC GLASS", accent: "#38bdf8" },
  { id: "badge-9", t0: 51.40, t1: 60.01, text: "3 REAL RISKS · NOT MELTING", accent: "#38bdf8" },
];

// Frame-locked sound & cue events for core/render/events.mjs
window.EV = [
  { t: 0.22,  type: "tong_click" },
  { t: 0.55,  type: "molten_stretch" },
  { t: 3.55,  type: "kettle_boil" },
  { t: 6.10,  type: "magma_pour" },
  { t: 9.92,  type: "jcut_steam_burst" },
  { t: 14.85, type: "steam_shockwave_1700x" },
  { t: 17.15, type: "leidenfrost_skate" },
  { t: 23.50, type: "airway_steam_swell" },
  { t: 31.30, type: "esophagus_snag" },
  { t: 36.42, type: "silence1_heartbeat" },
  { t: 40.25, type: "myth_stamp_x" },
  { t: 43.85, type: "jcut_acid_plunge" },
  { t: 50.05, type: "obsidian_shatter_crack" },
  { t: 54.25, type: "diag_ping_airway" },
  { t: 55.15, type: "diag_ping_esophagus" },
  { t: 56.05, type: "diag_ping_obsidian" },
];

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

function drawStudioBackdrop(t) {
  // Clean rich studio radial backdrop (warm orange-slate during molten beats, cool surgical slate in glass beats)
  const coolShift = seg(t, 47.0, 50.2);
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.44, 60, W * 0.5, H * 0.48, H * 0.72);
  if (coolShift < 0.5) {
    bg.addColorStop(0.0, "#25314d");
    bg.addColorStop(0.55, "#161e31");
    bg.addColorStop(1.0, "#0b101b");
  } else {
    bg.addColorStop(0.0, "#1f334f");
    bg.addColorStop(0.55, "#131d30");
    bg.addColorStop(1.0, "#090e18");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
}

// Compute active 3D-tracked diagram callouts using worldToScreen() (single source of truth for draw + TEXTS)
function getActiveDiagramTags(t) {
  const tags = [];
  const pushTag = (id, text, wx, wy, wz, ox, oy, color) => {
    camera.updateMatrixWorld();
    const p = worldToScreen(wx, wy, wz);
    ctx.font = '700 32px "Fredoka", system-ui, sans-serif';
    const tw = Math.ceil(ctx.measureText(text).width) + 38;
    const th = 54;
    const cx = clamp(p.x + ox, 92 + tw / 2, W - 92 - tw / 2);
    const cy = clamp(p.y + oy, 378 + th / 2, 1395 - th / 2);
    tags.push({
      id, text, color,
      ax: clamp(p.x, 90, W - 90),
      ay: clamp(p.y, 370, 1410),
      x0: Math.round(cx - tw / 2),
      y0: Math.round(cy - th / 2),
      x1: Math.round(cx + tw / 2),
      y1: Math.round(cy + th / 2),
    });
  };

  if (t >= 3.45 && t < 10.10) {
    pushTag("b2-100c", "100°C WATER", -0.66, -0.52, 0.18, -28, -95, "#60a5fa");
    pushTag("b2-1200c", "1,200°C (12×)", -0.02, 0.98, -0.45, 25, -55, "#ff8a2b");
  } else if (t >= 11.55 && t < 16.90) {
    pushTag("b3-steam", "1,700× STEAM", -0.30, -0.35, 0.15, -45, -135, "#38bdf8");
  } else if (t >= 17.20 && t < 23.25) {
    const u = ease.inOut(seg(t, 17.00, 23.35));
    const lx = lerp(1.05, -1.05, u);
    pushTag("b4-vapor", "VAPOR GAP", lx, 0.02, 0.08, 0, -135, "#7dd3fc");
  } else if (t >= 25.10 && t < 30.10) {
    pushTag("b5-airway", "AIRWAY SWELLS", -0.08, -2.05, 0.18, -120, -95, "#ff6b6b");
  } else if (t >= 32.70 && t < 36.70) {
    pushTag("b6-crater", "DEEP WALL BURN", 0.46, -0.18, 0.06, -155, -110, "#ff8a2b");
  } else if (t >= 40.30 && t < 44.02) {
    pushTag("b7-myth", "MOVIE MYTH", -0.36, -0.72, 0.50, -35, 105, "#f87171");
    pushTag("b7-joules", "1,000 JOULES", 0.84, 0.95, 0.20, -35, -60, "#fb923c");
  } else if (t >= 46.70 && t < 51.30) {
    pushTag("b8-glass", "VOLCANIC GLASS", 0, -0.26, 0.32, 0, -195, "#38bdf8");
  } else if (t >= 51.60 && t <= 60.01) {
    pushTag("b9-lava", "1,200°C LAVA", -0.54, -0.62, 0.35, -18, 92, "#ff8a2b");
    pushTag("b9-obs", "COLD OBSIDIAN", 0.54, -0.62, 0.35, 18, 92, "#7dd3fc");
    if (t >= 54.25) {
      pushTag("b9-r1", "1 AIRWAY", -0.08, 1.26, 0.06, -190, -12, "#ff6b6b");
    }
    if (t >= 55.15) {
      pushTag("b9-r2", "2 ESOPHAGUS", 0.08, 0.90, 0.06, 215, -4, "#fb923c");
    }
    if (t >= 56.05) {
      pushTag("b9-r3", "3 OBSIDIAN", 0.10, 0.46, 0.10, -195, 14, "#38bdf8");
    }
  }
  return tags;
}

function getActiveTopBadge(t) {
  const b = BEAT_BADGES.find((x) => t >= x.t0 && t < x.t1) || BEAT_BADGES[BEAT_BADGES.length - 1];
  ctx.font = '700 40px "Fredoka", system-ui, sans-serif';
  const tw = Math.min(880, Math.ceil(ctx.measureText(b.text).width) + 74);
  const x0 = Math.round((W - tw) / 2);
  const y0 = 262;
  const h = 88;
  return { id: b.id, text: b.text, accent: b.accent, x0, y0, x1: x0 + tw, y1: y0 + h };
}

function wrapCaptionLines(text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width <= maxW || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function draw2DOverlays(t) {
  // Subtle cinematic edge vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(4,7,14,0.44)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // 1. 3D-tracked diagram tags + leader lines
  const tags = getActiveDiagramTags(t);
  for (const tg of tags) {
    const cx = (tg.x0 + tg.x1) * 0.5;
    const cy = (tg.y0 + tg.y1) * 0.5;
    ctx.save();
    ctx.strokeStyle = tg.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(tg.ax, tg.ay);
    ctx.lineTo(cx, cy);
    ctx.stroke();

    ctx.fillStyle = tg.color;
    ctx.beginPath();
    ctx.arc(tg.ax, tg.ay, 6.5, 0, Math.PI * 2);
    ctx.fill();

    roundRectPath(ctx, tg.x0, tg.y0, tg.x1 - tg.x0, tg.y1 - tg.y0, 16);
    ctx.fillStyle = "rgba(12, 17, 30, 0.88)";
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = tg.color;
    ctx.stroke();

    ctx.font = '700 32px "Fredoka", system-ui, sans-serif';
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tg.text, cx, cy + 2);
    ctx.restore();
  }

  // 2. Top Beat Headline Pill (strictly inside y = 262..350, >240px top safe margin!)
  const badge = getActiveTopBadge(t);
  ctx.save();
  roundRectPath(ctx, badge.x0, badge.y0, badge.x1 - badge.x0, badge.y1 - badge.y0, 26);
  ctx.fillStyle = "rgba(11, 16, 29, 0.88)";
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = badge.accent;
  ctx.stroke();

  ctx.font = '700 40px "Fredoka", system-ui, sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badge.text, W / 2, (badge.y0 + badge.y1) / 2 + 2);
  ctx.restore();

  // 3. Burned-in Synchronized Voiceover Captions (strictly y <= 1552, >350px above bottom!)
  const cue = CAPTION_CUES.find((c) => t >= c.t0 && t < c.t1);
  if (cue) {
    ctx.save();
    ctx.font = '600 37px "Fredoka", system-ui, sans-serif';
    const lines = wrapCaptionLines(cue.text, 830);
    const lineH = 46;
    const padX = 34, padY = 18;
    let maxLW = 0;
    for (const ln of lines) maxLW = Math.max(maxLW, ctx.measureText(ln).width);
    const boxW = Math.min(900, Math.ceil(maxLW + padX * 2));
    const boxH = lines.length * lineH + padY * 2;
    const bx = Math.round((W - boxW) / 2);
    const by = Math.round(1548 - boxH); // bottom edge anchored at y = 1548 (< 1570 safe limit!)

    roundRectPath(ctx, bx, by, boxW, boxH, 22);
    ctx.fillStyle = "rgba(10, 14, 25, 0.84)";
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((ln, idx) => {
      const ly = by + padY + lineH * (idx + 0.5) + 1;
      ctx.fillText(ln, W / 2, ly);
    });
    ctx.restore();
  }
}

// Page contract for core/render/readcheck.mjs (reports all non-subtitle on-screen texts & bounding boxes)
window.TEXTS = (t) => {
  const clampedT = clamp(t, 0, CONFIG.duration);
  const out = [];
  const badge = getActiveTopBadge(clampedT);
  out.push({ id: badge.id, text: badge.text, x0: badge.x0, y0: badge.y0, x1: badge.x1, y1: badge.y1 });
  for (const tg of getActiveDiagramTags(clampedT)) {
    out.push({ id: tg.id, text: tg.text, x0: tg.x0, y0: tg.y0, x1: tg.x1, y1: tg.y1 });
  }
  return out;
};
