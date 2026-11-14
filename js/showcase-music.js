'use strict';
// ============================================================================
// The showcase's music (js/showcase.js): its own synthesized cue, built like js/audio.js's sounds
// ============================================================================
// 128 bpm in D minor, one bar of chords per entry of CHORDS. Its accents come from SHOWCASE itself, so the cuts and
// the music share one grid: a deep hit where each fight starts and on the title, a brass stab and a drum on every cut.
// It plays through AudioManager's mix (its mood filter, compressor, limiter and Options volume) and its reverb.
// Notes are made a little ahead of time (pump), on the audio clock: the same in a live page and in the recorder's
// offline render (tools/showcase-record.cjs).
//   showcaseMusic.start(audio, t0, beat) -> { t0, pump(now), stop() }
const showcaseMusic = (() => {
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // A chord per bar: its notes (MIDI) and its bass root. Bars 15-16 are the title's held chord.
  const C = { Dm: [[62, 65, 69], 38], Bb: [[58, 62, 65], 34], C: [[60, 64, 67], 36], A: [[57, 61, 64], 33], Gm: [[55, 58, 62], 31], F: [[57, 60, 65], 41] };
  const CHORDS = ['Dm', 'Dm', 'Bb', 'C', 'A', 'Dm', 'Dm', 'Gm', 'Bb', 'A', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Dm'];
  const LEVEL = 0.62, AHEAD = 0.35;

  function start(audio, t0, beat) {
    const ctx = audio.ctx, out = ctx.createGain(), send = ctx.createGain();
    out.gain.value = LEVEL; send.gain.value = 0.35;
    out.connect(audio.mix); out.connect(send); send.connect(audio.verbIn);
    const S = SHOWCASE, noise = audio.noise.white;
    let next = 0, stopped = false;
    // ---- voices: each makes its own nodes, scheduled at absolute audio time t --------------------
    const env = (t, a, peak, d, hold = 0) => {
      const g = ctx.createGain(), p = g.gain;
      p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + a);
      if (hold > 0) p.setValueAtTime(peak, t + a + hold);
      p.setTargetAtTime(0, t + a + hold, d / 4);
      g.connect(out); return g;
    };
    const osc = (type, f, t, end, into, detune = 0) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
      o.connect(into); o.start(t); o.stop(end); o.onended = () => o.disconnect(); return o;
    };
    const filt = (type, f, q, into) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(into); return b; };
    const hiss = (t, len, into) => {
      const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.connect(into);
      s.start(t, (t * 7.31) % (noise.duration - 0.1)); s.stop(t + len); s.onended = () => s.disconnect();
    };
    const V = {
      kick(t, v) {
        const g = env(t, 0.003, 0.95 * v, 0.42), o = osc('sine', 150, t, t + 0.6, g);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      },
      boom(t, v) {   // a fight's first beat and the title: a long low drop and a dark wash of noise
        const g = env(t, 0.004, 1.1 * v, 2.2), o = osc('sine', 82, t, t + 2.8, g);
        o.frequency.exponentialRampToValueAtTime(29, t + 1.4);
        const n = env(t, 0.01, 0.55 * v, 1.6), f = filt('lowpass', 1800, 0.7, n);
        f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(90, t + 1.5);
        hiss(t, 2, f);
      },
      taiko(t, v, f0 = 118) {
        const g = env(t, 0.002, 0.7 * v, 0.34), o = osc('sine', f0, t, t + 0.5, g);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.25);
        const n = env(t, 0.001, 0.32 * v, 0.09); hiss(t, 0.15, filt('bandpass', 900, 0.8, n));
      },
      tick(t, v) { const n = env(t, 0.001, 0.12 * v, 0.05); hiss(t, 0.08, filt('highpass', 6500, 0.5, n)); },
      bass(t, len, m, v) {
        const g = env(t, 0.006, 0.34 * v, len * 0.9), f = filt('lowpass', 520, 1.4, g);
        f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(240, t + len);
        osc('sawtooth', hz(m), t, t + len + 0.2, f, -6); osc('sawtooth', hz(m), t, t + len + 0.2, f, 6);
      },
      pad(t, len, notes, v) {   // low strings: detuned saws, slow in and out
        const g = env(t, 0.35, 0.075 * v, 0.9, Math.max(0, len - 0.35)), f = filt('lowpass', 1500, 0.4, g);
        for (const m of notes) { osc('sawtooth', hz(m), t, t + len + 1.4, f, -9); osc('sawtooth', hz(m - 12), t, t + len + 1.4, f, 7); }
      },
      pluck(t, m, v) {   // the string ostinato
        const g = env(t, 0.004, 0.11 * v, 0.16), f = filt('lowpass', 2600, 1.2, g);
        f.frequency.setValueAtTime(3400, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.15);
        osc('sawtooth', hz(m), t, t + 0.3, f);
      },
      brass(t, len, notes, v) {   // a stab on a cut: a filter that opens and closes like a breath
        const g = env(t, 0.03, 0.16 * v, 0.5, len), f = filt('lowpass', 400, 2, g);
        f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.06); f.frequency.exponentialRampToValueAtTime(700, t + 0.06 + len + 0.3);
        for (const m of notes) { osc('sawtooth', hz(m - 12), t, t + len + 0.9, f, -5); osc('sawtooth', hz(m - 12), t, t + len + 0.9, f, 5); }
      },
      riser(t, len, v) {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * v, t + len); g.gain.setValueAtTime(0, t + len + 0.01); g.connect(out);
        const f = filt('bandpass', 300, 2.5, g); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + len);
        hiss(t, len + 0.02, f);
      },
    };

    // ---- the score: [beat, voice, ...args], sorted ------------------------------------------------
    function score(b) {
      const ev = [], at = (beatN, fn) => ev.push([beatN, fn]), bars = CHORDS.length, title = S.title.at, kill = S.beats.find(x => x.kill);
      const accents = new Set(S.cuts.map(c => c.at)), booms = new Set([...S.fights.map(f => f.from), title]);
      for (let bar = 0; bar < bars; bar++) {
        const [notes, root] = C[CHORDS[bar]], b0 = bar * 4, heat = b0 >= 40 ? 1 : b0 >= 20 ? 0.85 : 0.7;
        if (b0 >= title) {   // the title: one chord, held, and the deep hit (below)
          if (b0 === title) { at(b0, t => V.pad(t, b * 7, notes, 1.6)); at(b0, t => V.brass(t, b * 3, notes, 1)); at(b0, t => V.bass(t, b * 6, root, 1)); }
          continue;
        }
        at(b0, t => V.pad(t, b * 4, notes, heat));
        for (let i = 0; i < 8; i++) {   // the bass in eighths: root, an octave up on the last of each beat pair
          const m = i % 4 === 3 ? root + 12 : root;
          at(b0 + i / 2, t => V.bass(t, b * 0.42, m, i % 2 ? 0.75 : 1));
        }
        if (bar >= 1) for (let i = 0; i < 16; i++) {   // the ostinato: the chord rising and falling in sixteenths
          const shape = [0, 1, 2, 1, 2, 0, 1, 2], m = notes[shape[i % 8]] + (i >= 8 && bar % 2 ? 12 : 0);
          at(b0 + i / 4, t => V.pluck(t, m, heat * (i % 4 === 0 ? 1 : 0.7)));
        }
        for (let i = 0; i < 4; i++) {   // drums: kick on 1 and 3 (and the and-of-3 later), taiko on 2 and 4, ticks between
          const q = b0 + i;
          if (i % 2 === 0) at(q, t => V.kick(t, 1));
          else at(q, t => V.taiko(t, heat));
          if (b0 >= 20 && i === 2) at(q + 0.5, t => V.kick(t, 0.7));
          if (b0 >= 40) at(q + 0.75, t => V.taiko(t, 0.5, 160));
          at(q + 0.5, t => V.tick(t, heat));
        }
      }
      for (const a of accents) if (a < title) at(a, t => { V.brass(t, b * 0.5, C[CHORDS[Math.floor(a / 4)]][0], 1); V.taiko(t, 1, 92); });
      for (const a of booms) at(a, t => V.boom(t, a === title ? 1.2 : 0.9));
      if (kill) { at(kill.at - 4, t => V.riser(t, b * 4, 1)); for (let i = 0; i < 8; i++) at(kill.at - 2 + i / 4, t => V.taiko(t, 0.4 + i * 0.08, 140)); }
      return ev.sort((x, y) => x[0] - y[0]).map(([beatN, fn]) => [t0 + beatN * b, fn]);
    }
    const list = score(beat);
    function pump(now) {
      if (stopped) return;
      while (next < list.length && list[next][0] < now + AHEAD) { const [t, fn] = list[next++]; fn(Math.max(t, now)); }
    }
    function stop() {
      if (stopped) return;
      stopped = true;
      const now = ctx.currentTime; out.gain.cancelScheduledValues(now); out.gain.setTargetAtTime(0, now, 0.08);
      setTimeout(() => { out.disconnect(); send.disconnect(); }, 600);
    }
    pump(t0);
    return { t0, pump, stop };
  }
  return { start, chords: CHORDS };
})();
