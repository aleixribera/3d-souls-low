'use strict';
// ============================================================================
// 9d. Audio
// ============================================================================
// A procedural Web Audio engine: every sound is built from noise and oscillators at the moment it plays, from
// the recipes in js/data/audio.js. Nothing here touches game state; the game only emits events (js/events.js),
// and the listeners at the bottom turn those into sounds. Footsteps and the player's own moves are not events,
// so a small per-frame watcher reads the player and enemies (read-only) for those.
//
// Signal path:   layer sources -> filter -> envelope -> channel strip (gain, distance low-pass, pan, reverb send)
//                -> bus (sfx / foot / ui) -> mix -> mood low-pass (pause, death) -> compressor -> limiter -> master
// Performance:   a fixed pool of channel strips and a cap on simultaneous voices (stealing the quietest, oldest);
//                noise comes from three shared buffers; nothing is allocated per frame; every node a voice made is
//                disconnected when it ends, so a long session leaks nothing.
// The random numbers here come from the engine's own generator: the game's Math.random stays untouched, so the
// stepped tests (which seed it) behave the same with or without sound.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class AudioManager {
  constructor() {
    this.ctx = null; this.dead = false; this.offline = false;
    this.vol = 0.8;                       // the Options setting, 0..1
    this.heat = 0;                        // how loud the last moment was: quiet sounds make room while it is high
    this.mood = 'open';                   // 'open' | 'pause' | 'death': the low-pass on the whole mix
    this.rng = mulberry32((Date.now() ^ 0x9e3779b9) >>> 0);
    this.per = {};                        // per sound: { last, live, jit }
    this.warned = new Set();
    this.count = { plays: 0, dropped: 0, stolen: 0 };
    this.lastMs = 0; this.footTarget = -1;
    this.watch = { player: null, state: null, step: 0, vy: 0, enemySteps: new WeakMap() };
    this.sp = { gain: 1, pan: 0, cut: AUDIO.space.nearCut, far: 0 };   // result of space(), reused
  }

  // ---- lifecycle ---------------------------------------------------------------------------------
  // Browsers only start audio after a key press or click: unlock() is called from those.
  unlock() {
    if (this.dead) return;
    if (!this.ctx && !this.init()) return;
    if (this.ctx.state === 'suspended' && !this.offline) this.ctx.resume().catch(() => {});
  }
  // Builds the graph once. A context can be passed in (the tests give an OfflineAudioContext to render sounds).
  init(ctx) {
    if (this.ctx) return true;
    if (this.dead) return false;
    const A = AUDIO;
    try { this.ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); }
    catch (e) { this.dead = true; return false; }
    const c = this.ctx, g = () => c.createGain();
    this.offline = typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;
    const setAll = (node, o) => { for (const k in o) node[k].value = o[k]; };
    this.master = g(); this.master.gain.value = this.masterLevel();
    const limiter = c.createDynamicsCompressor(); setAll(limiter, A.limiter);
    const comp = c.createDynamicsCompressor(); setAll(comp, A.compressor);
    this.mood_f = c.createBiquadFilter(); this.mood_f.type = 'lowpass'; this.mood_f.frequency.value = A.muffle.open; this.mood_f.Q.value = 0.5;
    this.mix = g();
    // A soft clip last of all: transparent below 0.6, then it rounds off whatever the limiter lets through instead of clipping.
    const clip = c.createWaveShaper(), curve = new Float32Array(2049);
    for (let i = 0; i < curve.length; i++) { const x = i / 1024 - 1, m = Math.abs(x); curve[i] = m < 0.6 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh((m - 0.6) / 0.4)); }
    clip.curve = curve; clip.oversample = '2x';
    this.mix.connect(this.mood_f); this.mood_f.connect(comp); comp.connect(limiter); limiter.connect(this.master); this.master.connect(clip); clip.connect(c.destination);
    this.buses = {};
    for (const name in A.buses) { const b = g(); b.gain.value = A.buses[name]; b.connect(this.mix); this.buses[name] = b; }
    // Reverb: a generated room (decaying, darkening noise), shared by every voice through its send.
    this.verbIn = g(); const conv = c.createConvolver(); conv.buffer = this.makeRoom(); const ret = g(); ret.gain.value = A.reverb.level;
    this.verbIn.connect(conv); conv.connect(ret); ret.connect(this.mix);
    // Noise beds, shared; each play starts at a random point in them.
    this.noise = { white: this.makeNoise('white'), pink: this.makeNoise('pink'), brown: this.makeNoise('brown') };
    this.strips = [];
    for (let i = 0; i < A.strips; i++) this.strips.push(this.makeStrip());
    return true;
  }
  masterLevel() { return AUDIO.volume * Math.pow(this.vol, 1.5); }
  setVolume(v) {
    this.vol = clamp(v, 0, 1);
    if (this.ctx) this.master.gain.setTargetAtTime(this.masterLevel(), this.ctx.currentTime, 0.02);
  }
  suspend() { if (this.ctx && !this.offline && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  wake() { if (this.ctx && !this.offline && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  makeNoise(color) {
    const c = this.ctx, n = Math.floor(c.sampleRate * 2), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0), r = mulberry32(color.length * 7919 + 17);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = r() * 2 - 1;
      if (color === 'white') d[i] = w;
      else if (color === 'pink') {   // Paul Kellet's filter
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }   // brown: a leaky integral
    }
    return buf;
  }
  makeRoom() {
    const c = this.ctx, R = AUDIO.reverb, n = Math.floor(c.sampleRate * R.time), buf = c.createBuffer(2, n, c.sampleRate), r = mulberry32(4242);
    const a0 = 1 - Math.exp(-2 * Math.PI * R.damp / c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp += a0 * (1 - 0.65 * t) * ((r() * 2 - 1) - lp);   // darker as it dies away
        d[i] = lp * Math.pow(1 - t, R.decay) * 2.2;
      }
    }
    return buf;
  }
  makeStrip() {
    const c = this.ctx, v = { input: c.createGain(), lp: c.createBiquadFilter(), pan: c.createStereoPanner(), send: c.createGain(),
      bus: null, busy: false, fading: false, pri: 0, born: 0, endEst: 0, pending: 0, id: '', st: null, srcs: [], nodes: [], onEnd: null };
    v.lp.type = 'lowpass'; v.lp.Q.value = 0.4;
    v.input.connect(v.lp); v.lp.connect(v.pan); v.lp.connect(v.send); v.send.connect(this.verbIn);
    // Runs as each source ends (this is that source): it lets go of its own connections at once, and the last one frees the strip.
    const mgr = this;
    v.onEnd = function () { this.onended = null; this.disconnect(); if (--v.pending <= 0) mgr.release(v); };
    return v;
  }

  // ---- playing -----------------------------------------------------------------------------------
  // opts: vel (0..1 how hard), pos {x, y, z} (where it is in the world), pitch (multiplier), gain, delay (s), pan (-1..1).
  play(id, opts) {
    const ctx = this.ctx;
    if (!ctx || (ctx.state !== 'running' && !this.offline)) return false;
    const def = AUDIO.sounds[id];
    if (!def) { if (!this.warned.has(id)) { this.warned.add(id); console.warn(`audio: no sound "${id}"`); } return false; }
    const o = opts || EMPTY_OPTS, now = ctx.currentTime, fin = (v, d) => Number.isFinite(v) ? v : d;
    const st = this.per[id] || (this.per[id] = { last: -9, live: 0, jit: 0 });
    if (now - st.last < (def.cooldown || 0) || (def.max && st.live >= def.max)) { this.count.dropped++; return false; }
    let gain = fin(o.gain, 1), pan = fin(o.pan, 0), cut = AUDIO.space.nearCut, far = 0;
    if (o.pos) {
      const sp = this.space(o.pos);
      if (!sp) { this.count.dropped++; return false; }
      gain *= sp.gain; pan = sp.pan; cut = sp.cut; far = sp.far;
    }
    if (gain < 0.01) { this.count.dropped++; return false; }
    const v = this.acquire(def.priority || 0, now);
    if (!v) { this.count.dropped++; return false; }
    st.last = now; st.live++; v.st = st; v.id = id; v.pri = def.priority || 0; v.born = now; v.busy = true; v.fading = false; v.pending = 0;
    if (v.bus !== def.bus) { v.pan.disconnect(); v.pan.connect(this.buses[def.bus]); v.bus = def.bus; }
    v.input.gain.cancelScheduledValues(0); v.input.gain.setValueAtTime(gain, now);
    v.lp.frequency.cancelScheduledValues(0); v.lp.frequency.setValueAtTime(cut, now);
    v.pan.pan.setValueAtTime(pan, now);
    v.send.gain.setValueAtTime((def.verb || 0) * (0.7 + 0.9 * far), now);
    // Variation: a pitch drawn fresh each time (never the same as the last), a little level drift, and a hard hit
    // sounding lower, louder and brighter than a soft one.
    const vel = clamp(fin(o.vel, 0.7), 0, 1), jit = def.jitter === undefined ? AUDIO.jitter : def.jitter;
    let cents = (this.rng() * 2 - 1) * jit;
    if (Math.abs(cents - st.jit) < jit * 0.3) cents = -cents;
    st.jit = cents;
    const pitch = Math.pow(2, cents / 1200) * clamp(fin(o.pitch, 1), 0.25, 4) * (1 - (def.velPitch === undefined ? 0.08 : def.velPitch) * (vel - 0.5));
    const amp = (0.4 + 0.6 * Math.pow(vel, 1.15)) * (0.88 + this.rng() * 0.12);
    const t0 = now + 0.004 + Math.max(0, fin(o.delay, 0));
    for (const L of def.layers) this.layer(v, L, t0, amp, pitch, vel);
    this.heat = Math.min(1, this.heat + (def.heat || 0) * (0.5 + 0.5 * vel));
    this.applyFoot(now);
    this.count.plays++;
    return true;
  }

  layer(v, L, t0, amp, pitch, vel) {
    const c = this.ctx, r = this.rng, nyq = c.sampleRate * 0.45, vary = (x, f) => x * (1 + (r() * 2 - 1) * f);
    // Every layer drifts a little on each play: its attack and decay lengths, its filter cutoffs and its resonance.
    const t = t0 + (L.at || 0), a = vary(L.a === undefined ? 0.002 : L.a, L.av === undefined ? 0.3 : L.av), h = L.h || 0;
    const d = vary(L.d, L.dv === undefined ? 0.2 : L.dv), len = a + h + d, end = t + len + 0.04;
    const env = c.createGain(), p = env.gain, peak = (L.gain === undefined ? 1 : L.gain) * amp;
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
    if (h > 0) p.setValueAtTime(peak, t + a + h);
    p.setTargetAtTime(0, t + a + h, d / 5);
    env.connect(v.input); v.nodes.push(env);
    let head = env;
    if (L.drive) {   // waveshaper crunch before the envelope, so the tail stays clean
      const ws = c.createWaveShaper(); ws.curve = this.driveCurve(L.drive); ws.connect(env); v.nodes.push(ws); head = ws;
    }
    // Filters: one in series, or "parallel" several side by side (detuned resonances ringing together).
    const list = L.parallel || (L.filter ? [L.filter] : null), ins = [];
    if (list) for (const F of list) {
      const f = c.createBiquadFilter(), open = 1 + (vel - 0.5) * (F.bright || 0);
      f.type = F.type; f.Q.value = vary(F.q === undefined ? 1 : F.q, 0.25);
      f.frequency.setValueAtTime(clamp(vary(this.pick(F.freq), 0.06) * pitch * open, 20, nyq), t);
      if (F.to !== undefined) f.frequency.exponentialRampToValueAtTime(clamp(vary(this.pick(F.to), 0.06) * pitch * open, 20, nyq), t + (L.glide || len * 0.9));
      f.connect(head); v.nodes.push(f); ins.push(f);
    }
    else ins.push(head);
    if (L.noise) {
      const s = c.createBufferSource(), buf = this.noise[L.noise];
      s.buffer = buf; s.loop = true; for (const n of ins) s.connect(n);
      this.start(v, s, t, end, r() * (buf.duration - 0.1));
      return;
    }
    const f0 = this.pick(L.freq) * pitch, f1 = L.to === undefined ? 0 : this.pick(L.to) * pitch, parts = L.partials || SINGLE_PARTIAL;
    let norm = 0; for (const q of parts) norm += q[1] * q[1];
    norm = 1 / Math.sqrt(norm);
    for (const [ratio, pg, decay] of parts) {
      if (f0 * ratio > nyq) continue;
      const o = c.createOscillator(); o.type = L.wave;
      o.frequency.setValueAtTime(f0 * ratio, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * ratio), t + (L.glide || len * 0.85));
      if (L.fm) {   // frequency modulation: an inharmonic modulator makes the clang of metal
        const m = c.createOscillator(), mg = c.createGain(), F = L.fm;
        m.type = 'sine'; m.frequency.setValueAtTime(f0 * ratio * F.ratio, t);
        mg.gain.setValueAtTime(f0 * ratio * F.index, t); mg.gain.setTargetAtTime(0, t + a, d * (F.decay || 0.6) / 5);
        m.connect(mg); mg.connect(o.frequency); v.nodes.push(mg); this.start(v, m, t, end, 0);
      }
      if (parts === SINGLE_PARTIAL) for (const n of ins) o.connect(n);
      else {   // each partial of a bell or chord dies at its own pace
        const pgn = c.createGain(); pgn.gain.setValueAtTime(pg * norm, t);
        if (decay !== 1) pgn.gain.setTargetAtTime(0, t + a, d * decay / 5);
        o.connect(pgn); for (const n of ins) pgn.connect(n); v.nodes.push(pgn);
      }
      this.start(v, o, t, end, 0);
    }
  }
  driveCurve(k) {
    const cache = this.curves || (this.curves = {});
    if (cache[k]) return cache[k];
    const n = 1025, cv = new Float32Array(n), norm = Math.tanh(k);
    for (let i = 0; i < n; i++) cv[i] = Math.tanh(k * (i / (n - 1) * 2 - 1)) / norm;
    return (cache[k] = cv);
  }
  start(v, src, t, end, offset) {
    src.onended = v.onEnd; v.pending++; v.srcs.push(src);
    src.start(t, offset); src.stop(end);
    if (end > v.endEst) v.endEst = end;
  }
  pick(x) { return Array.isArray(x) ? x[0] + this.rng() * (x[1] - x[0]) : x; }

  // ---- voices ------------------------------------------------------------------------------------
  // A free strip; when the voice cap is reached, the lowest-priority, oldest voice is faded out to make room
  // (but never one that outranks the newcomer).
  acquire(pri, now) {
    let active = 0, victim = null, free = null;
    for (const v of this.strips) {
      if (!v.busy) { if (!free) free = v; continue; }
      if (v.fading) continue;
      active++;
      if (v.pri <= pri && (!victim || v.pri < victim.pri || (v.pri === victim.pri && v.born < victim.born))) victim = v;
    }
    if (active >= AUDIO.voices) {
      if (!victim) return null;
      this.steal(victim, now);
      if (!free) return null;
    }
    if (free) { free.endEst = 0; }
    return free;
  }
  steal(v, now) {
    v.fading = true; this.count.stolen++;
    v.input.gain.cancelScheduledValues(0); v.input.gain.setTargetAtTime(0, now, 0.008);
    for (const s of v.srcs) { try { s.stop(now + 0.05); } catch (e) { /* already stopped */ } }
  }
  release(v) {
    for (const s of v.srcs) { s.onended = null; s.disconnect(); }
    for (const n of v.nodes) n.disconnect();
    v.nodes.length = 0; v.srcs.length = 0; v.busy = false; v.fading = false; v.pending = 0;
    if (v.st && v.st.live > 0) v.st.live--;
  }
  // Footsteps make room while something loud is happening: they drop at once, then creep back as heat falls.
  applyFoot(now) {
    const foot = AUDIO.buses.foot * (1 - AUDIO.heat.footDuck * Math.min(1, this.heat));
    if (Math.abs(foot - this.footTarget) < 0.01) return;
    this.buses.foot.gain.setTargetAtTime(foot, now, foot < this.footTarget ? 0.012 : 0.12);
    this.footTarget = foot;
  }
  // Safety net: a voice whose sources never reported back (a context paused mid-sound) is let go after a while.
  sweep(now) {
    for (const v of this.strips) if (v.busy && v.endEst && now > v.endEst + 0.75) { for (const s of v.srcs) { s.onended = null; try { s.stop(); } catch (e) { /* ended */ } } this.release(v); }
  }
  stats() {
    let busy = 0, active = 0;
    for (const v of this.strips) if (v.busy) { busy++; if (!v.fading) active++; }
    return { busy, active, strips: this.strips.length, ...this.count };
  }

  // ---- placing sounds in the world ---------------------------------------------------------------
  // Distance to the player sets the level and a low-pass (far things are duller); the camera's right-hand side sets the pan.
  space(pos) {
    const S = AUDIO.space, pl = Game.player, ox = pl ? pl.x : camera.position.x, oz = pl ? pl.z : camera.position.z, oy = pl ? pl.y : camera.position.y;
    const dx = pos.x - ox, dz = pos.z - oz, dy = ((pos.y === undefined ? oy : pos.y) - oy) * 0.5, d = Math.hypot(dx, dz, dy);
    if (d > S.range) return null;
    const t = d / S.range, e = camera.matrixWorld.elements, sp = this.sp;
    sp.gain = Math.pow(1 - t, S.rolloff);
    sp.pan = clamp((dx * e[0] + dz * e[2]) / Math.max(d, 0.001), -1, 1) * Math.min(1, d / S.near) * S.maxPan;
    sp.cut = S.nearCut * Math.pow(S.farCut / S.nearCut, t);
    sp.far = t;
    return sp;
  }

  // ---- per-frame watcher -------------------------------------------------------------------------
  tick(ms) {
    const dt = Math.min(0.1, (ms - this.lastMs) / 1000); this.lastMs = ms;
    const c = this.ctx;
    if (!c) return;
    this.heat = Math.max(0, this.heat - AUDIO.heat.decay * dt);
    if (c.state !== 'running') return;
    const now = c.currentTime;
    this.applyFoot(now);
    this.sweep(now);
    this.watchWorld(now);
  }
  watchWorld(now) {
    const g = Game, p = g.player, w = this.watch, M = AUDIO.muffle;
    if (!p) return;
    const mood = g.mode === 'pause' ? 'pause' : !p.alive() ? 'death' : 'open';
    if (mood !== this.mood) {
      this.mood = mood;
      const time = mood === 'pause' ? M.pauseTime : mood === 'death' ? M.deathTime : M.openTime;
      this.mood_f.frequency.cancelScheduledValues(now);
      this.mood_f.frequency.setTargetAtTime(M[mood === 'open' ? 'open' : mood], now, time / 3);
    }
    const idx = Math.floor(p.walkPhase / Math.PI);
    if (p !== w.player) { w.player = p; w.state = p.state; w.step = idx; w.vy = 0; return; }   // a new run: start from where it is
    const s = p.state;
    if (g.mode !== 'play') { w.state = s; w.step = idx; return; }
    if (s !== w.state) { this.playerMoved(w.state, s, p, w.vy); w.state = s; }
    w.vy = p.vy;
    if (idx !== w.step) {
      w.step = idx;
      const speed = Math.hypot(p.vx, p.vz);
      if ((s === PS.WALK || s === PS.BLOCK) && p.grounded && speed > AUDIO.steps.minSpeed) this.footstep(null, idx & 1, speed / CONFIG.player.walkSpeed, AUDIO.steps.playerGain, 1);
    }
    // Enemies on the move, close by: heavier ones sound lower.
    let played = 0;
    const R2 = AUDIO.steps.range * AUDIO.steps.range;
    for (const e of g.enemies) {
      if (e.asleep || e.hp <= 0) continue;
      const dx = e.x - p.x, dz = e.z - p.z;
      if (dx * dx + dz * dz > R2) continue;
      const k = Math.floor(e.walkPhase / Math.PI), prev = w.enemySteps.get(e);
      w.enemySteps.set(e, k);
      if (prev === undefined || prev === k || played >= AUDIO.steps.enemyMax) continue;
      if (e.state !== ES.CHASE && e.state !== ES.PATROL && e.state !== ES.RETURN) continue;
      played++;
      this.footstep({ x: e.x, y: e.y, z: e.z }, k & 1, 0.7, AUDIO.steps.enemyGain, 1 / Math.pow(e.def.scale || 1, 0.9));
    }
  }
  footstep(pos, side, speedFrac, gain, pitch) {
    this.play(side ? 'footR' : 'footL', { vel: 0.3 + 0.4 * clamp(speedFrac, 0, 1.2), pos, gain, pitch, pan: pos ? 0 : (side ? 0.1 : -0.1) });
  }
  // The player's own moves are states, not events.
  playerMoved(from, to, p, vy) {
    // Attack swings are not here: they follow the strike itself (attackMarker / attackPhase listeners below).
    if (to === PS.ROLL) this.play('roll', { vel: 0.6 });
    else if (to === PS.PARRY) this.play('swingLight', { vel: 0.3, pitch: 1.2 });
    else if (to === PS.BLOCK && (from === PS.IDLE || from === PS.WALK)) this.play('guardUp', { vel: 0.5 });
    else if (to === PS.JUMP && from !== PS.FALL) this.play('jump', { vel: 0.6 });
    else if ((from === PS.JUMP || from === PS.FALL) && (to === PS.IDLE || to === PS.WALK || to === PS.BLOCK || to === PS.ROLL)) this.play('landSoft', { vel: clamp(-vy / 14, 0.25, 1) });
  }
}
const EMPTY_OPTS = Object.freeze({});
const SINGLE_PARTIAL = [[1, 1, 1]];
const audio = new AudioManager();

// The data check for the sound recipes: a typo in a layer stops the game at load with a readable line.
function validateAudio() {
  const errors = [], A = AUDIO, num = v => typeof v === 'number' && Number.isFinite(v), rng = v => num(v) || (Array.isArray(v) && v.length === 2 && v.every(num));
  for (const id in A.sounds) {
    const s = A.sounds[id], tag = `Sound "${id}"`;
    if (!(s.bus in A.buses)) errors.push(`${tag}: unknown bus "${s.bus}" (known: ${Object.keys(A.buses).join(', ')}).`);
    if (!Array.isArray(s.layers) || !s.layers.length) { errors.push(`${tag}: it has no layers.`); continue; }
    s.layers.forEach((L, i) => {
      const lt = `${tag} layer ${i + 1}`;
      if (!(L.noise ? ['white', 'pink', 'brown'].includes(L.noise) : ['sine', 'triangle', 'sawtooth', 'square'].includes(L.wave))) errors.push(`${lt}: needs a noise ('white', 'pink', 'brown') or a wave ('sine', 'triangle', 'sawtooth', 'square').`);
      if (!L.noise && !rng(L.freq)) errors.push(`${lt}: a tone needs freq (a number or [min, max]).`);
      if (!num(L.d) || L.d <= 0) errors.push(`${lt}: d (decay seconds) must be a number above 0.`);
      if (L.filter && !(['lowpass', 'highpass', 'bandpass'].includes(L.filter.type) && rng(L.filter.freq))) errors.push(`${lt}: filter needs a type (lowpass, highpass, bandpass) and freq.`);
      if (L.partials && !(L.partials.length && L.partials.every(q => q.length === 3 && q.every(num)))) errors.push(`${lt}: partials must be [ratio, gain, decayMul] triples.`);
    });
  }
  for (const id of AUDIO_CUES) if (!(id in A.sounds)) errors.push(`The game asks for sound "${id}", which js/data/audio.js does not define.`);
  return errors;
}

// ---- listeners: events become sounds --------------------------------------------------------------
// Every sound id the listeners below ask for (checked at load by validateAudio).
const AUDIO_CUES = ['hitFlesh', 'hitHurt', 'hitBlock', 'riposteBoom', 'parry', 'postureBreak', 'dodge', 'enemyDeath', 'playerDeath', 'groundPound',
  'hardLanding', 'shot', 'boltStopped', 'alert', 'perilous', 'swingLight', 'swingHeavy', 'hurtGrunt', 'hurtMoan', 'flask', 'rest', 'gateOpened', 'trapWarning', 'trapSprung',
  'levelComplete', 'lockOn', 'switchTarget', 'pause', 'resume', 'uiMove', 'uiConfirm', 'uiBack', 'uiAdjust'];
function registerAudioListeners() {
  // Sound is never allowed to break the game: a listener that throws is reported once and skipped.
  const on = (type, fn) => events.on(type, d => { try { fn(d); } catch (e) { if (!audio.warned.has(type)) { audio.warned.add(type); console.warn(`audio: the "${type}" sound failed:`, e); } } });
  const chest = b => b && { x: b.x, y: b.y + (b.height || 1.5) * 0.6, z: b.z };
  const spot = o => o && Number.isFinite(o.x) && Number.isFinite(o.z) ? { x: o.x, y: o.y, z: o.z } : null;
  const trapAt = t => { const c = t.collapse; return c ? { x: (c[0] + c[1]) / 2, y: t.y, z: (c[2] + c[3]) / 2 } : null; };
  const big = b => 1 / Math.pow((b && b.def && b.def.scale) || 1, 0.6);   // big bodies sound lower
  on('strike', d => {
    const vel = clamp(((d.strike && d.strike.damage) || 20) / 45, 0.25, 1), pos = d.at || chest(d.target);
    if (d.blocked) audio.play('hitBlock', { vel, pos });
    else if (d.target === Game.player) {
      audio.play('hitHurt', { vel, pos });
      audio.play(vel > 0.65 ? 'hurtMoan' : 'hurtGrunt', { vel, delay: 0.03 });   // the player's voice
    }
    else {
      audio.play('hitFlesh', { vel, pos, pitch: big(d.target) });
      if (d.strike && d.strike.riposte) audio.play('riposteBoom', { vel, pos });
    }
  });
  on('parry', d => audio.play('parry', { pos: chest(d.target) }));
  on('execution', d => {   // the blade goes in: flesh, the riposte's boom and the break's crack, all at once
    audio.play('hitFlesh', { vel: 1, pos: d.at, pitch: big(d.enemy) * 0.85 });
    audio.play('riposteBoom', { vel: 1, pos: d.at });
    audio.play('postureBreak', { vel: 0.8, pos: d.at, pitch: big(d.enemy) * 0.7, delay: 0.04 });
  });
  on('postureBreak', d => audio.play('postureBreak', { pos: chest(d.enemy), pitch: big(d.enemy) }));
  on('dodge', () => audio.play('dodge', { vel: 0.6 }));
  on('enemyDeath', d => audio.play('enemyDeath', { pos: chest(d.enemy), pitch: big(d.enemy), vel: clamp(0.5 * ((d.enemy.def && d.enemy.def.scale) || 1), 0.4, 1) }));
  on('playerDeath', () => { audio.play('playerDeath'); audio.play('hurtMoan', { vel: 1, pitch: 0.9, delay: 0.05 }); });
  on('land', d => audio.play('groundPound', { pos: spot(d), vel: clamp((d.fx.shake || 0.1) / 0.12, 0.45, 1) }));
  on('impact', d => audio.play('groundPound', { pos: spot(d), vel: clamp((d.fx.shake || 0.1) / 0.12, 0.45, 1), pitch: big(d.enemy) }));
  on('fallDamage', d => { if (d.body === Game.player) audio.play('hurtGrunt', { vel: clamp(d.damage / 40, 0.4, 1), delay: 0.05 }); audio.play('hardLanding', { pos: d.body === Game.player ? null : spot(d.body), vel: clamp(d.damage / 40, 0.4, 1) }); });
  on('shot', d => audio.play('shot', { pos: chest(d.enemy) }));
  on('boltStopped', d => audio.play('boltStopped', { pos: spot(d.bolt) }));
  on('alert', d => audio.play('alert', { pos: chest(d.enemy), pitch: big(d.enemy) }));
  on('perilous', d => audio.play('perilous', { pos: chest(d.enemy), pitch: big(d.enemy) }));
  on('attackMarker', d => { if (d.marker.event === 'sound') audio.play(d.marker.sound, { pos: d.actor === Game.player ? null : chest(d.actor), vel: d.marker.vel ?? 0.7, pitch: big(d.actor) }); });
  // The swing whoosh, as each strike goes active: every cut of a combo, after any held (delayed) wind-up, and a jump
  // attack as it drives down. An attack with its own `sound` markers times them itself (the player's ground attacks).
  on('attackPhase', d => {
    const a = d.attack;
    if (d.phase !== PHASE.ACTIVE || a.projectile || attackHasMarker(a, 'sound')) return;
    const me = d.actor === Game.player;
    audio.play(a.damage >= 30 ? 'swingHeavy' : 'swingLight', { pos: me ? null : chest(d.actor), vel: clamp(a.damage / 45, 0.3, 1), pitch: big(d.actor) });
  });
  on('itemUsed', d => { if (d.item === 'flask') audio.play('flask'); });
  on('rest', () => audio.play('rest'));
  on('gateOpened', d => audio.play('gateOpened', { pos: spot(d.gate) }));
  on('trapWarning', d => audio.play('trapWarning', { pos: trapAt(d.trap) }));
  on('trapSprung', d => audio.play('trapSprung', { pos: trapAt(d.trap) }));
  on('levelComplete', () => audio.play('levelComplete'));
  on('lock', () => audio.play('lockOn'));
  on('switchTarget', () => audio.play('switchTarget'));
  on('pause', () => audio.play('pause'));
  on('resume', () => audio.play('resume'));
  on('menuMove', () => audio.play('uiMove'));
  on('menuConfirm', () => audio.play('uiConfirm'));
  on('menuBack', () => audio.play('uiBack'));
  on('menuAdjust', d => audio.play('uiAdjust', { pitch: d.dir < 0 ? 0.84 : 1.12 }));
  // Browsers start audio only after a key press, click or touch; and a hidden tab goes quiet.
  for (const type of ['keydown', 'mousedown', 'pointerdown', 'touchstart']) window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? audio.suspend() : audio.wake());
  const loop = ms => { requestAnimationFrame(loop); try { audio.tick(ms); } catch (e) { if (!audio.warned.has('tick')) { audio.warned.add('tick'); console.warn('audio: the watcher failed:', e); } } };
  requestAnimationFrame(loop);
}
