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
    // It tops out at 0.95 and runs without oversampling: the 2x oversampler's filter rang past the curve on hard-driven
    // bursts (Moonfall Cut's crack 1.014 on CI, v7.177.0; the Storm King's crown 1.007 even with the 0.95 top, v7.203.0).
    // Without it the output is the curve itself, so it can never pass 0.95; the tanh knee is smooth enough not to alias.
    const clip = c.createWaveShaper(), curve = new Float32Array(2049);
    for (let i = 0; i < curve.length; i++) { const x = i / 1024 - 1, m = Math.abs(x); curve[i] = m < 0.6 ? x : Math.sign(x) * (0.6 + 0.35 * Math.tanh((m - 0.6) / 0.35)); }
    clip.curve = curve; clip.oversample = 'none';
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
    const S = AUDIO.space, pl = typeof multiplayer !== 'undefined' ? multiplayer.listener : Game.player,
      ox = pl ? pl.x : camera.position.x, oz = pl ? pl.z : camera.position.z, oy = pl ? pl.y : camera.position.y;
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
    const watching = typeof multiplayer !== 'undefined' && multiplayer.spectating;
    const mood = g.mode === 'pause' ? 'pause' : p && !p.alive() && !watching ? 'death' : 'open';
    if (mood !== this.mood) {
      this.mood = mood;
      const time = mood === 'pause' ? M.pauseTime : mood === 'death' ? M.deathTime : M.openTime;
      this.mood_f.frequency.cancelScheduledValues(now);
      this.mood_f.frequency.setTargetAtTime(M[mood === 'open' ? 'open' : mood], now, time / 3);
    }
    if (!p) { w.player = null; return; }
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
    const listener = watching ? multiplayer.listener : p;
    for (const e of g.enemies) {
      if (e.asleep || e.hp <= 0) continue;
      const dx = e.x - listener.x, dz = e.z - listener.z;
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
  'levelComplete', 'lockOn', 'switchTarget', 'pause', 'resume', 'uiMove', 'uiConfirm', 'uiBack', 'uiAdjust', 'rotSizzle',
  'abilityBlast', 'abilityDragon', 'abilityThunder', 'abilityFreeze', 'abilityBlades', 'abilityBlade', 'abilityMoon', 'abilityPerk', 'abilityPick',
  'abilityTwin', 'abilityEcho', 'abilityGale', 'abilityPyre', 'abilityFlare', 'abilitySpark', 'abilityStep', 'abilityEmpower',
  'abilityHeal', 'abilityCharge', 'abilityHound', 'abilityBite', 'abilityHowl', 'abilityTaunt', 'abilityGuardian', 'abilityBash', 'abilityChallenge',
  'abilityLancer', 'abilityThrust', 'crateOpen', 'crateTick', 'crateLand', 'counterOpen', 'cutOpen',
  'abilityClank', 'abilityChime', 'abilityGulp', 'abilityFrost', 'abilityInk', 'abilitySizzle', 'abilityWhirl', 'abilityMirror',
  'abilityWave', 'abilityMoonfall', 'abilityCyclone', 'abilityPetals', 'abilityGhostBlade', 'abilityOvercharge',
  'abilityBloom', 'abilitySpikes', 'abilityFist', 'abilityFang', 'abilityClap', 'abilityFlurry', 'abilityFlurryHit', 'abilityDrill', 'abilityStitch',
  'abilityPierce', 'abilityBoomerang', 'abilityClones', 'abilitySheathe', 'abilityIaiDraw', 'abilityIai',
  'abilityMend', 'abilityStance', 'abilityStancePing', 'abilityRoot', 'abilityRootThud', 'abilityUnbroken', 'abilityUnbrokenHeld', 'abilityVanish',
  'abilityMail', 'abilityMailShatter', 'abilityPool',
  'abilityWard', 'abilityWardBounce', 'abilityHusk', 'abilityHuskBurst', 'abilityDome', 'abilityDomeStop', 'abilityWait', 'abilityAnswer',
  'abilityRewind', 'abilityRewindEnd', 'abilitySeal', 'abilitySealSputter',
  'abilityFox', 'abilityFoxSlash', 'abilityYip', 'abilityLantern', 'abilityLanternShot', 'abilityLanternHeal',
  'abilityCrows', 'abilityPeck', 'abilityArcher', 'abilityArrow', 'abilityArrowHit', 'abilityHawk', 'abilityStoop', 'abilityStoopHit',
  'abilityOwl', 'abilityMark', 'abilityMarkBurst', 'abilityRonin', 'abilityRoninCut', 'abilitySerpent', 'abilityCoil', 'abilityHiss',
  'abilityPuppet', 'abilityPuppetBlow', 'abilityBear', 'abilityRear', 'abilityMaul', 'abilityRoar', 'abilityMantis', 'abilityScissor', 'abilityCrown', 'abilityCage', 'abilityCageCut',
  'abilitySuns', 'abilityThunderStep', 'abilityFourfold', 'abilityShade', 'abilityCrack', 'abilityLance', 'abilityLotus', 'abilityTempest',
  'abilityGreatWave', 'abilitySkyBlade', 'abilitySkyLand', 'abilityPhoenix', 'abilityPhoenixPass', 'abilityBlackStar', 'abilityImplode'];
// A power's sound by its `then`, its later blows' (`strike`: a lightning bolt, a twin's echo, a hound's bite) by
// STRIKE_SOUNDS, a summon drawing the boss's eye (`draw`) by DRAW_SOUNDS; a rare's perk its own (ABILITY_PERK_SOUNDS,
// at a pitch), a pick's pitch by its rarity.
const ABILITY_SOUNDS = { blast: 'abilityBlast', dragon: 'abilityDragon', quake: 'abilityCrack', beam: 'abilityLance', iceLotus: 'abilityLotus', tempest: 'abilityTempest', greatWave: 'abilityGreatWave', skyBlade: 'abilitySkyBlade', phoenix: 'abilityPhoenix', blackStar: 'abilityBlackStar', freeze: 'abilityFreeze', blades: 'abilityBlades', bloodMoon: 'abilityMoon',
  twin: 'abilityTwin', gale: 'abilityGale', bladeCage: 'abilityCage', pyre: 'abilityPyre', flare: 'abilityFlare', spark: 'abilitySpark', hound: 'abilityHound',
  guardian: 'abilityGuardian', lancer: 'abilityLancer', fox: 'abilityFox', lantern: 'abilityLantern', crows: 'abilityCrows', archer: 'abilityArcher', hawk: 'abilityHawk', owl: 'abilityOwl', owlBurst: 'abilityMarkBurst',
  ronin: 'abilityRonin', serpent: 'abilitySerpent', puppet: 'abilityPuppet', bear: 'abilityBear', mantis: 'abilityMantis', wave: 'abilityWave', crescent: 'abilityMoonfall', cyclone: 'abilityCyclone', petals: 'abilityPetals',
  ghostBlade: 'abilityChime', spikes: 'abilitySpikes', fist: 'abilityFist', risingFire: 'abilityFang', clap: 'abilityClap',
  flurry: 'abilityFlurry', drill: 'abilityDrill', stitch: 'abilityStitch', boomerang: 'abilityBoomerang', clones: 'abilityClones', iai: 'abilitySheathe',
  ward: 'abilityWardBounce', answer: 'abilityAnswer', husk: 'abilityHusk', seal: 'abilitySeal',
  sunLines: 'abilitySuns', lightningDash: 'abilityThunderStep', shadeClone: 'abilityShade' };   // Echoing Blade armed: a soft chime (each echo: ABILITY_STRIKE_SOUNDS)
const ABILITY_STRIKE_SOUNDS = { dragon: 'abilityThunder', bladeCage: 'abilityCageCut', twin: 'abilityEcho', hound: 'abilityBite', guardian: 'abilityBash', lancer: 'abilityThrust', fox: 'abilityFoxSlash', lantern: 'abilityLanternShot',
  crows: 'abilityPeck', archer: 'abilityArrow', hawk: 'abilityStoop', owl: 'abilityMark',
  ronin: 'abilityRoninCut', serpent: 'abilityCoil', puppet: 'abilityPuppetBlow', bear: 'abilityRear', mantis: 'abilityScissor',
  ghostBlade: 'abilityGhostBlade', flurry: 'abilityFlurryHit', stitch: 'abilityPierce' };
const ABILITY_DRAW_SOUNDS = { twin: 'abilityTaunt', hound: 'abilityHowl', guardian: 'abilityChallenge', lancer: 'abilityChallenge', fox: 'abilityYip',
  crows: 'abilityCrows', archer: 'abilityChallenge', hawk: 'abilityHawk', serpent: 'abilityHiss', puppet: 'abilityChallenge', bear: 'abilityRoar',
  mantis: 'abilityChallenge' };   // a ronin draws in silence: it is heard as it deflects (`parry`)
// A summon's blow that flew landing (`land`): an arrow's thock, a dive's thunderclap (a lantern's is heard as its heal).
const ABILITY_LAND_SOUNDS = { archer: 'abilityArrowHit', hawk: 'abilityStoopHit', bear: 'abilityMaul' };
const ABILITY_PERK_SOUNDS = { empower: ['abilityEmpower', 1], 'streak/heal': ['abilityHeal', 1],
  'dodge/flashBehind': ['abilityStep', 1.15], 'block/charge': ['abilityCharge', 1],
  'finisher/heal': ['abilityHeal', 0.8],
  // batch 4's (js/rare-fx.js): [sound, pitch, vel]; Bloodthirst's mote rises in pitch with each blow (`n`)
  'streak/step': ['abilityChime', 1.1, 0.35], 'streak/lost': ['abilityInk', 0.9, 0.5], 'hurt/armed': ['abilityFlare', 0.7, 0.5],
  'unhurt/ready': ['abilityChime', 1.8, 0.3], 'unhurt/empower': ['abilityInk', 0.75, 0.9], 'low/freeDash': ['abilityFrost', 1.1, 0.55],
  'cracked/damage': ['abilityClank', 1.3, 0.45], 'block/armed': ['abilityCharge', 1.25, 0.5], 'parry/heal': ['abilityHeal', 1.2],
  // Guard I's (batch 8, js/guard-fx.js); Unbroken's killing blow held is its own (abilityPerkSound)
  'press/heal': ['abilityMend', 1], 'press/stance': ['abilityStance', 1], 'stance/deflect': ['abilityStancePing', 1, 0.8],
  'press/root': ['abilityRoot', 1], 'root/bite': ['abilityRootThud', 1, 0.8], 'press/undying': ['abilityUnbroken', 1],
  'press/vanish': ['abilityVanish', 1], 'vanish/end': ['abilityChime', 1.5, 0.3], 'press/armour': ['abilityMail', 1],
  'armour/crack': ['abilityMailShatter', 1], 'armour/broken': ['abilityMailShatter', 0.8], 'press/pool': ['abilityPool', 1],
  // Guard II's (batch 9, js/guard-fx-2.js); the bounce and the answering cut are heard as their powers (ABILITY_SOUNDS)
  'press/ward': ['abilityWard', 1], 'ward/bounce': ['abilityStancePing', 1.3, 0.5], 'press/dome': ['abilityDome', 1],
  'dome/stop': ['abilityDomeStop', 1, 0.7], 'press/wait': ['abilityWait', 1], 'wait/answer': ['abilityStancePing', 0.75, 0.6],
  'wait/end': ['abilityChime', 1.2, 0.25], 'press/rewind': ['abilityRewind', 1], 'rewind/end': ['abilityRewindEnd', 1],
  // the commons' (batch 3): quiet ones, from sounds the plain commons already use
  'parry/freeDash': ['abilityChime', 1.25], 'freeDash/spent': ['abilityChime', 1.6], 'fightStart/freeDash': ['abilityStep', 1.1],
  'low/veil': ['abilityFrost', 0.8], 'veil/spent': ['abilityInk', 1], 'hurt/ironSkin': ['abilityClank', 1], 'ironSkin/glance': ['abilityClank', 1.35],
  // batch 5's (js/rare-strike-fx.js): Ironclad's plates settling, a blow glancing off them
  'flask/unshaken': ['abilityClank', 0.75, 0.6], 'unshaken/glance': ['abilityClank', 1.4, 0.7],
  'overcharge/step': ['abilitySpark', 0.7, 0.3],   // Overcharge: a quiet crackle as a key fills each fifth past full, rising
  'parry/keys': ['abilityChime', 0.9], 'finisher/keys': ['abilityChime', 0.8], 'ready/empower': ['abilityChime', 1.5], 'glint/spent': ['abilitySpark', 1.4] };
const ABILITY_PICK_PITCH = { common: 1, rare: 0.84, legendary: 0.67 };
// A common's power (the blade's, design/abilities batch 2): [sound, pitch, vel], lighter than a rare's of the same
// family; `fire` as it fires, `strike` as a late blow lands (Petal Cut's opening, Echo Step's slash).
const ABILITY_COMMON_SOUNDS = {
  fire: { spark: ['abilitySpark', 1.15, 0.6], lick: ['abilityFlare', 1.3, 0.5], molten: ['abilitySizzle', 1, 0.55], whirl: ['abilityWhirl', 1, 0.5],
    thorns: ['abilitySpark', 0.8, 0.5], burnHits: ['abilityFlare', 1.1, 0.5], shards: ['abilitySpark', 0.7, 0.4], reflect: ['abilityMirror', 1, 0.7] },
  strike: { lateCut: ['cutOpen', 1.3, 0.45], afterimage: ['abilityEcho', 1.2, 0.55], burnHits: ['abilitySizzle', 1.25, 0.4], shards: ['cutOpen', 0.8, 0.55], reflect: ['hitFlesh', 1.1, 0.6] },
};
function registerAudioListeners() {
  // Sound is never allowed to break the game: a listener that throws is reported once and skipped.
  const on = (type, fn) => events.on(type, d => { try { fn(d); } catch (e) { if (!audio.warned.has(type)) { audio.warned.add(type); console.warn(`audio: the "${type}" sound failed:`, e); } } });
  const chest = b => b && { x: b.x, y: b.y + (b.height || 1.5) * 0.6, z: b.z };
  const spot = o => o && Number.isFinite(o.x) && Number.isFinite(o.z) ? { x: o.x, y: o.y, z: o.z } : null;
  const trapAt = t => { const c = t.collapse; return c ? { x: (c[0] + c[1]) / 2, y: t.y, z: (c[2] + c[3]) / 2 } : null; };
  const big = b => 1 / Math.pow((b && b.def && b.def.scale) || 1, 0.6);   // big bodies sound lower
  on('strike', d => {
    const vel = clamp(((d.strike && d.strike.damage) || 20) / 45, 0.25, 1), pos = d.at || chest(d.target);
    if (d.blocked || d.plated) audio.play('hitBlock', { vel, pos });   // Ember Mail's plate takes it as a guard would
    else if (d.target === Game.player) {
      audio.play('hitHurt', { vel, pos });
      audio.play(vel > 0.65 ? 'hurtMoan' : 'hurtGrunt', { vel, delay: 0.03 });   // the player's voice
    }
    else {
      audio.play('hitFlesh', { vel, pos, pitch: big(d.target) });
      if (d.strike && d.strike.riposte) audio.play('riposteBoom', { vel, pos });
      // A counter's cut opens a beat after the blow (js/counter-fx.js draws it on the same real-time beat).
      const a = d.attacker && d.attacker.attack;
      if (d.strike && d.strike.riposte && a && a.cut && a.id === d.strike.attackId) audio.play('cutOpen', { vel: 1, pos, delay: a.cut.open });
      const R = d.target && d.target.def && d.target.def.resonance;   // pass 68: his bronze rings, higher the fuller it is
      if (R) audio.play('bronzeRing', { vel, pos, pitch: 1 + 0.6 * (d.target.resonance || 0) / R.max });
    }
  });
  // A counter opening (pass 95): its own bright ring, for the one whose window it is.
  on('counterOpen', d => { if (d.player === Game.player) audio.play('counterOpen', { vel: 1 }); });
  on('parry', d => audio.play('parry', { pos: chest(d.target) }));
  on('hazard', d => audio.play('rotSizzle', { pos: spot(d.player), vel: 0.8 }));   // v7.0: the scarlet rot eating at the feet
  // The Finishing Blow (pass 103): time stopping, each flash step (higher each time), every cut opening at once over
  // the riposte's boom; a guard cracking, higher for each crack.
  on('finisherStart', d => audio.play('finisherFreeze', { vel: 1, pos: d.player === Game.player ? null : chest(d.enemy) }));
  on('finisherStep', d => audio.play('finisherStep', { vel: 0.9, pos: d.player === Game.player ? null : chest(d.enemy), pitch: 1 + 0.09 * d.i }));
  on('finisher', d => {
    audio.play('finisherOpen', { vel: 1, pos: d.at, pitch: Math.min(1, big(d.enemy)) });
    audio.play('riposteBoom', { vel: 1, pos: d.at, pitch: big(d.enemy) * 0.85 });
    audio.play('hitFlesh', { vel: 1, pos: d.at, pitch: big(d.enemy) * 0.8, delay: 0.02 });
  });
  on('guardCrack', d => { if (d.cracks > 0) audio.play('guardCrack', { vel: 0.8 + 0.2 * d.cracks, pos: chest(d.enemy), pitch: big(d.enemy) * (1 + 0.14 * (d.cracks - 1)) }); });
  on('dodge', d => audio.play('dodge', { vel: 0.6, pos: d.player && d.player !== Game.player ? spot(d.player) : null }));
  on('enemyDeath', d => audio.play('enemyDeath', { pos: chest(d.enemy), pitch: big(d.enemy), vel: clamp(0.5 * ((d.enemy.def && d.enemy.def.scale) || 1), 0.4, 1) }));
  on('playerDeath', () => { audio.play('playerDeath'); audio.play('hurtMoan', { vel: 1, pitch: 0.9, delay: 0.05 }); });
  on('land', d => audio.play('groundPound', { pos: spot(d), vel: clamp((d.fx.shake || 0.1) / 0.12, 0.45, 1) }));
  on('impact', d => audio.play('groundPound', { pos: spot(d), vel: clamp((d.fx.shake || 0.1) / 0.12, 0.45, 1), pitch: big(d.enemy) }));
  on('fallDamage', d => { if (d.body === Game.player) audio.play('hurtGrunt', { vel: clamp(d.damage / 40, 0.4, 1), delay: 0.05 }); audio.play('hardLanding', { pos: d.body === Game.player ? null : spot(d.body), vel: clamp(d.damage / 40, 0.4, 1) }); });
  on('shot', d => audio.play('shot', { pos: chest(d.enemy) }));
  on('boltStopped', d => audio.play('boltStopped', { pos: spot(d.bolt) }));
  on('alert', d => audio.play('alert', { pos: chest(d.enemy), pitch: big(d.enemy) }));
  on('perilous', d => audio.play('perilous', { pos: chest(d.enemy), pitch: big(d.enemy) }));
  on('prismPlant', d => audio.play('prismPlant', { pos: d.at || chest(d.enemy), vel: 0.7 }));
  on('prismShatter', d => audio.play('prismShatter', { pos: chest(d.enemy), vel: 0.85 }));
  on('attackMarker', d => { if (d.marker.event === 'sound') audio.play(d.marker.sound, { pos: d.actor === Game.player ? null : chest(d.actor), vel: d.marker.vel ?? 0.7, pitch: big(d.actor) }); });
  // The swing whoosh, as each strike goes active: every cut of a combo, after any held (delayed) wind-up, and a jump
  // attack as it drives down. An attack with its own `sound` markers times them itself (the player's ground attacks).
  on('attackPhase', d => {
    const a = d.attack;
    if (d.phase !== PHASE.ACTIVE || a.projectile || attackHasMarker(a, 'sound')) return;
    const me = d.actor === Game.player;
    audio.play(a.damage >= 30 ? 'swingHeavy' : 'swingLight', { pos: me ? null : chest(d.actor), vel: clamp(a.damage / 45, 0.3, 1), pitch: big(d.actor) });
  });
  on('itemUsed', d => { if (d.item === 'flask') audio.play('flask', { pos: d.player && d.player !== Game.player ? spot(d.player) : null }); });
  on('rest', () => audio.play('rest'));
  on('flaskFound', () => audio.play('rest', { vel: 0.7 }));   // pass 79: a flask found on the road, a smaller kindling
  on('revive', d => audio.play('rest', { pos: d.self ? null : spot(d), vel: d.self ? 1 : 0.8 }));   // a teammate rises (js/multiplayer.js)
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
  // Boss Rush's abilities: a legendary's power where it strikes (its holder's own, close), a rare's chime, the pick.
  // Thousand Blades rings once for each blow of its rain, as the drawn swords land (every `every` s, js/ability-fx.js).
  const rains = [];   // { e, left, next, every }
  on('abilityPower', d => {
    if (ABILITY_BY_ID[d.power] && ABILITY_BY_ID[d.power].rarity === 'common') {
      if (d.then === 'reflect' && !d.strike) {   // it turns at its holder; theirs heard it already (shotDeflected)
        if (d.body !== Game.player) audio.play('abilityMirror', { vel: 0.7, pos: d.body ? chest(d.body) : spot(d) });
        return;
      }
      const c = ABILITY_COMMON_SOUNDS[d.strike ? 'strike' : 'fire'][d.then];
      if (c) audio.play(c[0], { pitch: c[1], vel: c[2], pos: d.body === Game.player ? null : d.enemy && d.then !== 'whirl' ? chest(d.enemy) : spot(d) });
      return;
    }
    if (d.end) return;   // a flurry or a stance cut short: its silence is the sound
    // Quick Draw: the sheathe at the press, the draw's whistle (strike 1), the split a beat later (strike 2).
    // An Ash Husk bursting, a Binding Seal burning out: their own sounds, where they are.
    if (d.burst || d.sputter) { audio.play(d.burst ? 'abilityHuskBurst' : 'abilitySealSputter', { pos: d.sputter && d.enemy ? chest(d.enemy) : spot(d), vel: 1 }); return; }
    if (d.parry) { audio.play('parry', { pos: spot(d), pitch: 0.84, vel: 0.9 }); return; }   // a ronin's deflect: the deflect's clang, 3 semitones down
    if (d.then === 'serpent' && d.strike % 2 && !d.draw) return;   // its creak every other squeeze: a slow pulse
    if (d.then === 'boltCrown') {   // Storm King: heard from its bolts (the heavy that called it is heard already), each a semitone up, the close its own
      if (!d.strike) return;
      const pos = d.enemy ? chest(d.enemy) : spot(d);
      audio.play('abilityThunder', { pos, vel: 0.55, pitch: Math.pow(2, (d.strike - 1) / 12) });
      if (d.v && d.strike >= d.v.strikes) audio.play('abilityCrown', { pos, vel: 1, delay: VIS.abilityFx.crown.converge });
      return;
    }
    // Legendaries II: Fourfold heard as its keys refill; each lightning cut a ring of steel pitched up; a shade clone's
    // blow the twin's echo, softer and a little apart in pitch, so three clones never sound as one.
    if (d.then === 'refillKeys') { if (d.strike) audio.play('abilityFourfold', { pos: d.body === Game.player ? null : spot(d), vel: 1 }); return; }
    if (d.then === 'lightningDash' && d.strike) { audio.play('abilityBlade', { pos: d.enemy ? chest(d.enemy) : spot(d), pitch: 1.3, vel: 0.7 }); return; }
    if (d.then === 'shadeClone' && d.strike) { audio.play('abilityEcho', { pos: d.enemy ? chest(d.enemy) : spot(d), pitch: 1 + 0.07 * ((d.clone || 0) - 1), vel: 0.6 }); return; }
    // Ultimates I: Cataclysm's crack at the press, its blast where it bursts; the Lance's and the Lotus's sounds land
    // with the pillar and the first petal (CONFIG.abilities.ult), each petal a frost tick a little higher; Tempest's wind
    // at the press, a far thunder with each small bolt (every 4th tick).
    if (d.then === 'quake' || d.then === 'beam' || d.then === 'iceLotus' || d.then === 'tempest') {
      const U = CONFIG.abilities.ult, pos = d.then !== 'quake' && d.enemy ? chest(d.enemy) : spot(d);
      if (!d.strike) audio.play(ABILITY_SOUNDS[d.then], { pos, vel: 1, delay: d.then === 'beam' ? U.beam : d.then === 'iceLotus' ? U.lotus : 0 });
      else if (d.then === 'quake') audio.play('abilityBlast', { pos, vel: 1 });
      else if (d.then === 'iceLotus') audio.play('abilityFrost', { pos, vel: 0.5, pitch: 1 + 0.04 * d.strike });
      else if (d.then === 'tempest' && d.strike % 4 === 0) audio.play('abilityThunder', { pos: spot(d), vel: 0.4, pitch: 0.8 });
      return;
    }
    // Ultimates II: the Wave's one sound carries its crash (timed to CONFIG.abilities.ult.wave), so its strike is silent;
    // the Blade rings as it forms and slams as it lands; the Phoenix cries at the press, whooshes at each pass; the Star
    // hums as it arrives and booms as it implodes.
    if (d.then === 'greatWave' || d.then === 'skyBlade' || d.then === 'phoenix' || d.then === 'blackStar') {
      const pos = d.body === Game.player && !d.strike ? null : d.enemy && d.then === 'phoenix' ? chest(d.enemy) : spot(d);
      if (!d.strike) { if (d.then !== 'blackStar') audio.play(ABILITY_SOUNDS[d.then], { pos, vel: 1 }); }
      else if (d.then === 'skyBlade') audio.play('abilitySkyLand', { pos, vel: 1 });
      else if (d.then === 'phoenix') audio.play('abilityPhoenixPass', { pos, vel: 0.8, pitch: 1 + 0.06 * d.strike });
      else if (d.then === 'blackStar') audio.play(d.strike === 1 ? 'abilityBlackStar' : 'abilityImplode', { pos, vel: 1 });
      return;
    }
    const id = d.draw ? ABILITY_DRAW_SOUNDS[d.then] : d.then === 'iai' && d.strike ? (d.strike === 1 ? 'abilityIaiDraw' : 'abilityIai')
      : d.heal ? (d.body === Game.player ? 'abilityLanternHeal' : null)   // a lantern's shot healed you: a soft chime, only to you
      : d.land ? ABILITY_LAND_SOUNDS[d.then]
      : d.strike ? ABILITY_STRIKE_SOUNDS[d.then] : ABILITY_SOUNDS[d.then];
    if (!id) return;
    // A summon's howl or taunt comes from the summon (`x`, `z`), never from its holder's ears.
    const mine = d.body === Game.player, pos = d.draw || d.flight ? spot(d) : mine && (!d.strike || d.heal) ? null : d.enemy && d.then !== 'blast' ? chest(d.enemy) : spot(d);
    const lotus = d.then === 'flare' && d.v && d.v.charge > 0 && !d.strike;   // Fire Burst's press: the lotus opens, its close bursts 0.35 s on
    if (lotus) audio.play('abilityBloom', { pos });
    audio.play(id, lotus ? { pos, vel: 1, delay: 0.35 } : { pos, vel: 1 });
    if (d.then === 'blades' && d.enemy && d.v) for (let i = rains.length - 1; i >= 0; i--) if (rains[i].e === d.enemy) rains.splice(i, 1);   // a new rain on it replaces the old
    if (d.then === 'blades' && d.enemy && d.v && rains.length < 4) rains.push({ e: d.enemy, left: Math.round(d.v.time / d.v.every), next: d.v.every, every: d.v.every });
  });
  // Hunting Call: its holder hears the summon's blow mark the boss, a low chime under the bite.
  on('abilityPower', d => { if (d.mark && d.strike && d.body === Game.player) audio.play('abilityChime', { pitch: 0.7, vel: 0.5, delay: 0.04 }); });
  on('abilityPress', d => { if (d.body === Game.player && d.over > 0) audio.play('abilityOvercharge', { vel: 0.6 + 0.4 * d.over }); });   // Overcharge's crack
  on('shotDeflected', d => { if (d.player === Game.player) audio.play('abilityMirror', { vel: 0.7 }); });   // Mirror Shard, its holder's own
  on('abilityPerk', d => {
    if (d.body !== Game.player) return;
    const [id, pitch, vel] = d.saved ? ['abilityUnbrokenHeld', 1] : ABILITY_PERK_SOUNDS[d.perk] || ['abilityPerk', 1];   // Unbroken holding a killing blow
    audio.play(id, { pitch: pitch * (1 + 0.08 * (d.n || 0)), vel });
  });
  on('abilityPicked', d => audio.play('abilityPick', { pitch: ABILITY_PICK_PITCH[d.rarity] || 1, vel: d.rarity === 'common' ? 0.6 : 0.9 }));
  // The plain commons' touches (js/ability-touch.js): the holder's own, quiet, each on its moment.
  const held = (p, mod) => p && p === Game.player && p.kit && p.kit.mods[mod] > 0;
  on('abilityPicked', d => { if (d.id === 'iron-blood') audio.play('abilityClank', { vel: 0.7, delay: 0.1 }); });
  on('dashReady', d => { if (held(d.body, 'dashRefill')) audio.play('abilityChime', { vel: 0.35 }); });
  on('itemUsed', d => { if (d.item === 'flask' && held(d.player, 'flaskSpeed')) audio.play('abilityGulp', { vel: 0.6, delay: 0.05 }); });
  on('strike', d => { if (!d.blocked && d.strike && d.strike.riposte && held(d.attacker, 'riposte')) audio.play('abilityFrost', { vel: 0.45 }); });
  on('finisher', d => { if (held(d.player, 'finisher')) audio.play('abilityInk', { vel: 0.5 }); });
  on('respawn', () => { rains.length = 0; });
  const rainTick = dt => {
    // The rain falls while the world runs: in play, and online in the menus too (the server goes on striking).
    if (Game.mode !== 'play' && !(Game.mode === 'pause' && typeof multiplayer !== 'undefined' && multiplayer.active())) return;
    for (let i = rains.length - 1; i >= 0; i--) {
      const r = rains[i];
      if ((r.next -= dt) > 0) continue;
      r.next += r.every;
      if (!r.e.alive() || !Game.enemies.includes(r.e) || --r.left < 0) { rains.splice(i, 1); continue; }   // gone with its level
      audio.play('abilityBlade', { pos: chest(r.e), vel: 0.5 + 0.3 * Math.random() });
    }
  };
  // Browsers start audio only after a key press, click or touch; and a hidden tab goes quiet.
  for (const type of ['keydown', 'mousedown', 'pointerdown', 'touchstart']) window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? audio.suspend() : audio.wake());
  let last = 0;
  const loop = ms => { requestAnimationFrame(loop); const dt = last ? Math.min(0.1, (ms - last) / 1000) : 0; last = ms; try { rainTick(dt); audio.tick(ms); } catch (e) { if (!audio.warned.has('tick')) { audio.warned.add('tick'); console.warn('audio: the watcher failed:', e); } } };
  requestAnimationFrame(loop);
}
