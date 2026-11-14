'use strict';
// The showcase on video (js/showcase.js, PLAN.md "The showcase"), recorded at each release: the show played in the
// engine frame by frame in headless Edge, every frame captured, its sound (the music cue and every sound of the fight)
// rendered by an OfflineAudioContext that is suspended at each frame, so picture and sound share one clock.
//   node tools/showcase-record.cjs [outDir=~/Videos/combat-arena-3d]
// Writes showcase-<version>-1080p60.mp4 (H.264 + AAC, 1920x1080, 60 fps) and showcase-<version>-whatsapp.mp4 (H.264 +
// AAC, 1280x720, 30 fps, under 16 MB), then checks both with ffprobe. Needs ffmpeg and ffprobe on PATH (Windows:
// `winget install Gyan.FFmpeg`). It only writes files: posting either video anywhere is Aleix's.
// One headless Edge at idle priority (tests/low-priority.cjs), closed at the end; a run takes a few minutes.
require('../tests/low-priority.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('../tests/browser.cjs');
const { createServer } = require('../server/index.cjs');

const FPS = 60, W = 1920, H = 1080, RATE = 48000, WHATSAPP_MB = 16;
const outDir = path.resolve(process.argv[2] || path.join(os.homedir(), 'Videos', 'combat-arena-3d'));

function need(tool) {
  const r = spawnSync(tool, ['-version'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    console.error(`${tool} was not found on PATH. Install FFmpeg (Windows: winget install Gyan.FFmpeg; Fedora: sudo dnf install ffmpeg), open a new terminal, and run this again.`);
    process.exit(2);
  }
}
const run = (args, label) => new Promise((done, fail) => {
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('exit', code => code === 0 ? done() : fail(new Error(`ffmpeg (${label}) exited ${code}`)));
});
function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,profile,width,height,r_frame_rate,sample_rate,channels',
    '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe ${file}: ${r.stderr}`);
  const j = JSON.parse(r.stdout), v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  return { file, mb: +(j.format.size / 1048576).toFixed(2), seconds: +(+j.format.duration).toFixed(2),
    video: v && `${v.codec_name} ${v.profile} ${v.width}x${v.height} ${v.r_frame_rate}`, audio: a && `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` };
}

(async () => {
  need('ffmpeg'); need('ffprobe');
  fs.mkdirSync(outDir, { recursive: true });
  const app = createServer({ dev: true });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'showcase-'));
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('combat-arena-3d.settings', JSON.stringify({ v: 2, graphics: 'ultra', volume: 5, lessons: false })));
    await page.goto(`http://127.0.0.1:${app.server.address().port}/combat-arena-3d.html`);
    await page.waitForFunction(() => window.__arenaReady, null, { timeout: 180000 });
    await page.evaluate(() => document.fonts.ready);
    // The page's side: the sound graph on an offline context, the show started by hand, and one call per frame that
    // steps the show a frame, draws it, and lets the sound render up to that frame's end.
    const info = await page.evaluate(async ({ FPS, RATE }) => {
      document.getElementById('publicLobby')?.classList.add('hidden');
      const seconds = SHOWCASE.length * 60 / SHOWCASE.bpm, off = new OfflineAudioContext(2, Math.ceil((seconds + 0.05) * RATE), RATE);
      if (audio.ctx) throw new Error('the page already has a live sound context');
      audio.init(off);
      if (!showcase.play({ manual: true, toMenu: false })) throw new Error('the showcase did not start: ' + JSON.stringify(showcase.report()));
      let frame = 0, rendering = null;
      const settle = () => new Promise(requestAnimationFrame);   // the overlay's styles reach the screen
      window.__record = {
        // Frame `frame` is drawn now (the show at its end); its sounds were made at its start.
        async next() {
          showcase.frame(1 / FPS, { render: true });
          const at = ++frame / FPS;
          if (at < seconds - 1e-6) {
            const reached = off.suspend(Math.round(at * RATE) / RATE);
            if (!rendering) rendering = off.startRendering(); else off.resume();
            await reached;
          }
          await settle();
          return showcase.running;
        },
        // The sound, as 16-bit PCM WAV, base64.
        async wav() {
          if (!rendering) rendering = off.startRendering(); else if (off.state === 'suspended') off.resume();
          const buf = await rendering, n = buf.length, ch = [buf.getChannelData(0), buf.getChannelData(1)];
          const bytes = new Uint8Array(44 + n * 4), d = new DataView(bytes.buffer), str = (o, s) => { for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i); };
          str(0, 'RIFF'); d.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 2, true);
          d.setUint32(24, RATE, true); d.setUint32(28, RATE * 4, true); d.setUint16(32, 4, true); d.setUint16(34, 16, true); str(36, 'data'); d.setUint32(40, n * 4, true);
          for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < 2; c++, o += 2) d.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 32767, true);
          let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
          return btoa(s);
        },
      };
      await settle();
      return { seconds, version: VERSION, gpu: renderer.getContext().getParameter(renderer.getContext().RENDERER) };
    }, { FPS, RATE });
    console.log(`recording ${info.version}: ${info.seconds} s at ${W}x${H} ${FPS} fps (${info.gpu})`);
    const tag = `showcase-${info.version}`, big = path.join(outDir, `${tag}-1080p60.mp4`), small = path.join(outDir, `${tag}-whatsapp.mp4`);
    const silent = path.join(work, 'video.mp4'), wav = path.join(work, 'sound.wav');
    // The picture: each frame a JPEG from the compositor, straight into the encoder.
    const enc = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
    const encoded = new Promise((done, fail) => enc.on('exit', c => c === 0 ? done() : fail(new Error(`ffmpeg (frames) exited ${c}`))));
    const cdp = await page.context().newCDPSession(page);
    const total = Math.round(info.seconds * FPS), began = Date.now();
    let shown = 0;
    for (let n = 0; n < total; n++) {
      if (!await page.evaluate(() => window.__record.next())) break;   // the show's last step ends it: nothing more to draw
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
      if (!enc.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => enc.stdin.once('drain', r));
      shown++;
      if (n % 120 === 0) console.log(`  frame ${n}/${total} (${((Date.now() - began) / 1000).toFixed(0)} s)`);
    }
    enc.stdin.end(); await encoded;
    fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.__record.wav()), 'base64'));
    const report = await page.evaluate(() => showcase.report());
    if (errors.length) console.warn('page errors:\n  ' + errors.slice(0, 5).join('\n  '));
    const missed = report ? report.beats.filter(b => !b.ok).map(b => b.id) : ['(no report)'];
    if (report && report.failed) throw new Error('the showcase stopped: ' + report.error);
    if (missed.length) console.warn(`beats that did not happen in this recording: ${missed.join(', ')}`);
    await browser.close();
    // The release cut (its sound brought to -14 LUFS, as video sites play it), then the WhatsApp one (H.264 Main + AAC-LC, 720p, 30 fps, sized to fit under 16 MB).
    await run(['-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', String(RATE), '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', big], 'mux');
    const kbps = Math.floor((WHATSAPP_MB * 0.85 * 8192) / info.seconds) - 128;
    await run(['-i', big, '-vf', 'scale=1280:720:flags=lanczos,fps=30', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'main', '-level', '3.1', '-pix_fmt', 'yuv420p',
      '-crf', '20', '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`, '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100', '-movflags', '+faststart', small], 'whatsapp');
    const a = probe(big), b = probe(small);
    console.log(JSON.stringify({ frames: shown, beats: report && report.beats.map(x => `${x.id}:${x.ok ? 'ok' : 'MISSED'}`), release: a, whatsapp: b }, null, 1));
    if (b.mb >= WHATSAPP_MB) throw new Error(`the WhatsApp cut is ${b.mb} MB, over ${WHATSAPP_MB} MB`);
    if (!/h264/.test(b.video) || !/aac/.test(b.audio)) throw new Error('the WhatsApp cut is not H.264 + AAC');
  } finally {
    try { await browser.close(); } catch (e) { /* closed */ }
    app.server.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
