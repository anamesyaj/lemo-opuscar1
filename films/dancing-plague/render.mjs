// render.mjs — render stills or frame ranges from the web engine.
//   node render.mjs stills/a "5,40,120,160,340,420,560,600,690,730,800,830,900,950,1020,1080,1130,1200,1270"
//   node render.mjs frames 0 1279        (full render; RESUME=1 skips existing frames)
// Frames go to frames/fNNNN.jpg (or <dir>/fNNNN.jpg in stills mode).
// Run from ~/shorts/dancing-plague with TMPDIR=$HOME/tmp (the VM /tmp is a 512 MB tmpfs).
import { chromium } from 'playwright-core';
import { writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

// playwright-core + a Chromium build.
// Resolution: explicit CHROME env first, then any installed playwright build
// (a GitHub runner after `playwright install chromium`), then this VM's
// cached build. Layout differs by revision: older builds use
// chrome-linux/chrome, newer Chrome-for-Testing builds (v1254+, playwright
// 1.65) use chrome-linux64/chrome — check both, newest revision first.
// (Run #1 failed because only chrome-linux/ was checked and the runner had
// installed v1254 with the chrome-linux64 layout, so it fell back to a
// hardcoded 1194 path that does not exist there.)
function resolveChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  try {
    const entries = readdirSync(base);
    console.log('playwright cache:', entries.join(' '));
    const builds = entries.filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const d of builds) {
      for (const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome']) {
        const p = path.join(base, d, sub);
        if (existsSync(p)) return p;
      }
    }
  } catch {}
  return path.join(base, 'chromium-1194', 'chrome-linux', 'chrome');
}
const CHROME = resolveChrome();
console.log('chrome:', CHROME);

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8137;
const RESUME = process.env.RESUME === '1';

const mode = process.argv[2];
let frames = [];
let outDir = path.join(ROOT, 'frames');
if (mode && mode.startsWith('stills')) {
  outDir = path.join(ROOT, mode);
  frames = process.argv[3].split(',').map((s) => parseInt(s.trim(), 10));
} else if (mode === 'frames') {
  const a = parseInt(process.argv[3], 10), b = parseInt(process.argv[4], 10);
  for (let f = a; f <= b; f++) frames.push(f);
} else {
  console.error('usage: node render.mjs stills/<dir> "f1,f2,..." | frames <a> <b>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// --- local HTTP server (serves project root so the import map resolves) ---
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: ROOT, stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1200));

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${PORT}/web/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });

const t0 = Date.now();
let done = 0;
for (const f of frames) {
  const out = path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`);
  if (RESUME && existsSync(out)) { done++; continue; }
  const dataUrl = await page.evaluate((fr) => window.renderFrame(fr), f);
  const b64 = dataUrl.split(',')[1];
  writeFileSync(out, Buffer.from(b64, 'base64'));
  done++;
  const el = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`f${f} -> ${path.basename(out)} (${done}/${frames.length}, ${el}s)`);
}
const secs = (Date.now() - t0) / 1000;
console.log(`done: ${done} frames in ${secs.toFixed(1)}s = ${(secs / Math.max(1, done)).toFixed(2)}s/frame`);
await browser.close();
server.kill();
