// Render one frame chunk of a film page to a segment mp4.
//   node tools/render-chunk.mjs <pageDir> --from F --to T --fps 24 --q '' --out seg.mp4 --size 1080x1920
// Same page contract as core/render/video.mjs: window.render(t), window.READY.
// Frames [from, to) at fps → JPEG q95 piped to ffmpeg (libx264, crf 14, yuv420p),
// exactly like a video.mjs worker segment, so stitch can concat -c copy.
import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
import { openDemo, closeServer, requireDemo, takeSize } from '../core/render/page.mjs';

const args = process.argv.slice(2);
const { w: W, h: H } = takeSize(args);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = args[0]; requireDemo(dir);
const FROM = +opt('--from', 0), TO = +opt('--to', 0);
const FPS = +opt('--fps', 24), Q = opt('--q', '');
const out = path.resolve(opt('--out', 'seg.mp4'));
if (!(FROM >= 0) || !(TO > FROM) || !(FPS > 0)) { console.error('bad --from/--to/--fps'); process.exit(2); }
fs.mkdirSync(path.dirname(out), { recursive: true });

const { browser, page } = await openDemo(dir, { w: W, h: H, q: Q });
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
  '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14',
  '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
let dead = null, done;
const closed = new Promise(r => { done = r; });
ff.on('close', code => done(code));
ff.on('error', e => { dead = e.code === 'ENOENT' ? 'ffmpeg not installed' : e.message; done(-1); });
ff.stdin.on('error', () => { dead ??= 'ffmpeg closed its input early'; });
const t0 = Date.now();
for (let f = FROM; f < TO && !dead; f++) {
  const dataUrl = await page.evaluate(t => {
    window.render(t);
    return window.renderDataURL ? window.renderDataURL() : null;
  }, f / FPS);
  const buf = dataUrl
    ? Buffer.from(dataUrl.split(',')[1], 'base64')
    : await page.screenshot({ type: 'jpeg', quality: 95, timeout: 180000 });
  if (dead) break;
  if (!ff.stdin.write(buf)) await Promise.race([new Promise(r => ff.stdin.once('drain', r)), closed]);
  if ((f - FROM) % 60 === 0) console.log(`frame ${f - FROM}/${TO - FROM}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
const code = await closed;
await browser.close(); closeServer();
if (dead || code !== 0) { console.error(`chunk render failed: ${dead || 'ffmpeg exit ' + code}`); process.exit(1); }
console.log('done', out, TO - FROM, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's');
