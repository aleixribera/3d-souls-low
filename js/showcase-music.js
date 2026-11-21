'use strict';
// ============================================================================
// The showcase's music (js/showcase.js): its own synthesized cue, built like js/audio.js's sounds
// ============================================================================
// An opening's song in miniature, 128 bpm in D minor, one chord a bar (CHORDS). Its form comes from SHOWCASE itself, so
// the cuts and the music share one grid (docs/showcase/storyboard.md):
//   the cold open   unison hits on the first cuts over silence, until the letterbox opens (SHOWCASE.bars)
//   the groove      kick, backbeat snare, hats, bass in eighths, the string ostinato; a brass stab and a drum on every cut
//   a break         under each freeze: one hit and its tail, a swell back in over its last beat
//   the build       the bar before the climax (the first impact): a snare roll, a riser, half a beat of silence
//   the chorus      from the climax to the title: the four-chord climb, crashes, a lead hook
//   the title       a deep hit and the last chord, held
// It plays through AudioManager's mix (its mood filter, compressor, limiter and Options volume) and its reverb.
// Notes are made a little ahead of time (pump), on the audio clock: the same in a live page and in the recorder's
// offline render (tools/showcase-record.cjs).
//   showcaseMusic.start(audio, t0, beat) -> { t0, pump(now), stop() }
const showcaseMusic = (() => {
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // A chord: its notes (MIDI) and its bass root.
  const C = { Dm: [[62, 65, 69], 38], Bb: [[58, 62, 65], 34], C: [[60, 64, 67], 36], A: [[57, 61, 64], 33], Gm: [[55, 58, 62], 31],
    F: [[57, 60, 65], 41], Am: [[57, 60, 64], 33] };
  // One a bar (16 bars): the verse, the build on A, the chorus's climb (Bb C Am Dm) and the title's Dm.
  const CHORDS = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'A', 'Bb', 'C', 'Am', 'Dm', 'A', 'Dm'];
  // The chorus's hook, from the climax: [beat into the chorus, MIDI note, length in beats].
  const HOOK = [[0, 74, 0.5], [0.5, 77, 0.5], [1, 81, 1.5], [2.5, 79, 0.5], [3, 77, 1],
    [4, 76, 0.5], [4.5, 79, 0.5], [5, 84, 1.5], [6.5, 82, 0.5], [7, 81, 1],
    [8, 81, 0.5], [8.5, 84, 0.5], [9, 88, 1.5], [10.5, 86, 0.5], [11, 84, 1],
    [12, 86, 2.5], [14.5, 81, 0.5], [15, 77, 1]];
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
        const g = env(t, 0.003, 1.0 * v, 0.42), o = osc('sine', 160, t, t + 0.6, g);
        o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
        const n = env(t, 0.001, 0.25 * v, 0.03); hiss(t, 0.04, filt('lowpass', 3000, 0.7, n));   // the beater's click
      },
      snare(t, v) {   // a crack of noise over a short tone
        const n = env(t, 0.001, 0.42 * v, 0.2); hiss(t, 0.3, filt('bandpass', 2400, 0.6, n));
        const g = env(t, 0.001, 0.32 * v, 0.1), o = osc('triangle', 220, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      },
      hat(t, v) { const n = env(t, 0.001, 0.1 * v, 0.04); hiss(t, 0.06, filt('highpass', 7500, 0.5, n)); },
      crash(t, v) { const n = env(t, 0.002, 0.24 * v, 2.2); hiss(t, 2.5, filt('highpass', 4200, 0.4, n)); },
      boom(t, v) {   // a freeze, a fight's start, the title: a long low drop and a dark wash of noise
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
      bass(t, len, m, v) {
        const g = env(t, 0.006, 0.36 * v, len * 0.9), f = filt('lowpass', 520, 1.4, g);
        f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(260, t + len);
        osc('sawtooth', hz(m), t, t + len + 0.2, f, -6); osc('sawtooth', hz(m), t, t + len + 0.2, f, 6);
      },
      pad(t, len, notes, v) {   // low strings: detuned saws, slow in and out
        const g = env(t, 0.25, 0.07 * v, 0.9, Math.max(0, len - 0.25)), f = filt('lowpass', 1600, 0.4, g);
        for (const m of notes) { osc('sawtooth', hz(m), t, t + len + 1.4, f, -9); osc('sawtooth', hz(m - 12), t, t + len + 1.4, f, 7); }
      },
      pluck(t, m, v) {   // the string ostinato
        const g = env(t, 0.004, 0.1 * v, 0.16), f = filt('lowpass', 2600, 1.2, g);
        f.frequency.setValueAtTime(3400, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.15);
        osc('sawtooth', hz(m), t, t + 0.3, f);
      },
      brass(t, len, notes, v) {   // a stab: a filter that opens and closes like a breath
        const g = env(t, 0.02, 0.17 * v, 0.5, len), f = filt('lowpass', 400, 2, g);
        f.frequency.setValueAtTime(380, t); f.frequency.exponentialRampToValueAtTime(2800, t + 0.05); f.frequency.exponentialRampToValueAtTime(700, t + 0.05 + len + 0.3);
        for (const m of notes) { osc('sawtooth', hz(m - 12), t, t + len + 0.9, f, -5); osc('sawtooth', hz(m - 12), t, t + len + 0.9, f, 5); }
      },
      lead(t, len, m, v) {   // the hook: two saws a fifth of a tone apart, a quick bite, a late vibrato
        const g = env(t, 0.01, 0.12 * v, 0.25, Math.max(0, len - 0.06)), f = filt('lowpass', 3200, 1, g);
        f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.12);
        const a = osc('sawtooth', hz(m), t, t + len + 0.4, f, -7), b = osc('square', hz(m), t, t + len + 0.4, f, 7);
        if (len > 0.4) {
          const lfo = ctx.createOscillator(), d = ctx.createGain(); lfo.frequency.value = 5.5; d.gain.setValueAtTime(0, t); d.gain.linearRampToValueAtTime(18, t + len);
          lfo.connect(d); d.connect(a.detune); d.connect(b.detune); lfo.start(t); lfo.stop(t + len + 0.4); lfo.onended = () => { lfo.disconnect(); d.disconnect(); };
        }
      },
      riser(t, len, v) {
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * v, t + len); g.gain.setValueAtTime(0, t + len + 0.01); g.connect(out);
        const f = filt('bandpass', 300, 2.5, g); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + len);
        hiss(t, len + 0.02, f);
      },
      swell(t, len, v) {   // a reversed cymbal back into the groove after a break
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + len); g.gain.setValueAtTime(0, t + len + 0.005); g.connect(out);
        hiss(t, len + 0.01, filt('highpass', 3000, 0.5, g));
      },
    };

    // ---- the score: [beat, voice], sorted ---------------------------------------------------------
    function score(b) {
      const ev = [], at = (beatN, fn) => ev.push([beatN, fn]), title = S.title.at, open = S.bars;
      const breaks = (S.freezes || []).filter(f => f.at < title).map(f => [f.at, f.at + f.for]);
      const climax = (S.impacts || []).find(x => x < title) ?? title;
      const inBreak = q => breaks.some(([a, z]) => q >= a - 1e-6 && q < z - 1e-6);
      const quiet = q => q < open || inBreak(q) || (q >= climax - 0.5 && q < climax) || q >= (S.title.dark ?? title);   // no groove here
      const chordAt = q => C[CHORDS[Math.min(CHORDS.length - 1, Math.floor(q / 4))]];
      // The cold open: unison hits on its cuts, a tom fill into the groove.
      for (const c of S.cuts) if (c.at < open) at(c.at, t => { V.brass(t, b * 0.35, chordAt(c.at)[0], 1.2); V.taiko(t, 1, 80); V.bass(t, b * 0.8, chordAt(c.at)[1], 1); if (c.at === 0) V.crash(t, 0.8); });
      for (let i = 0; i < 4; i++) at(open - 0.5 + i / 8, t => V.taiko(t, 0.5 + i * 0.12, 150 - i * 12));
      for (let bar = 0; bar * 4 < title; bar++) {
        const [notes, root] = C[CHORDS[bar]], b0 = bar * 4, chorus = b0 >= climax, heat = chorus ? 1 : b0 >= 20 ? 0.9 : 0.8;
        if (b0 >= open && !inBreak(b0)) at(b0, t => V.pad(t, b * 4, notes, chorus ? 1.3 : heat));
        for (let i = 0; i < 8; i++) {   // the bass in eighths, an octave up on each pair's last
          const q = b0 + i / 2, m = i % 4 === 3 ? root + 12 : root;
          if (!quiet(q)) at(q, t => V.bass(t, b * 0.42, m, i % 2 ? 0.75 : 1));
        }
        for (let i = 0; i < 16; i++) {   // the ostinato: the chord rising and falling in sixteenths
          const q = b0 + i / 4, shape = [0, 1, 2, 1, 2, 0, 1, 2], m = notes[shape[i % 8]] + 12 + (chorus && i >= 8 ? 12 : 0);
          if (!quiet(q)) at(q, t => V.pluck(t, m, heat * (i % 4 === 0 ? 1 : 0.65)));
        }
        for (let i = 0; i < 4; i++) {   // drums: kick on 1 and 3 (and the and-of-3), snare on 2 and 4, hats in eighths
          const q = b0 + i;
          if (!quiet(q)) { if (i % 2 === 0) at(q, t => V.kick(t, 1)); else at(q, t => V.snare(t, heat)); }
          if (i === 2 && !quiet(q + 0.5)) at(q + 0.5, t => V.kick(t, 0.75));
          for (const h of [0, 0.5]) if (!quiet(q + h)) at(q + h, t => V.hat(t, h ? 0.9 : 0.5));
          if (chorus && !quiet(q + 0.75)) at(q + 0.75, t => V.hat(t, 0.6));
        }
      }
      // Every cut in the groove: a brass stab and a low drum.
      for (const c of S.cuts) if (c.at >= open && c.at < title && !inBreak(c.at) && c.at !== climax) at(c.at, t => { V.brass(t, b * 0.4, chordAt(c.at)[0], 0.8); V.taiko(t, 0.8, 92); });
      // The breaks: one hit and its tail, a swell back into the groove.
      for (const [a, z] of breaks) {
        at(a, t => { V.boom(t, 0.9); V.brass(t, b * 0.9, chordAt(a)[0], 1.1); V.crash(t, 0.7); V.snare(t, 1); });
        at(Math.max(a, z - 1), t => V.swell(t, (z - Math.max(a, z - 1)) * b, 1));
        at(z, t => V.crash(t, 0.6));
      }
      // The build: a snare roll in eighths, then sixteenths, a riser, half a beat of silence; then the climax.
      for (let q = climax - 4; q < climax - 0.5 - 1e-6; q += q < climax - 2 ? 0.5 : 0.25) { const k = (q - climax + 4) / 3.5; at(q, t => V.snare(t, 0.35 + 0.6 * k)); }
      at(climax - 4, t => V.riser(t, b * 3.5, 1));
      at(climax, t => { V.boom(t, 1.1); V.crash(t, 1); V.brass(t, b * 1.5, chordAt(climax)[0], 1.3); });
      for (let i = 0; i < 16; i += 8) at(climax + 8 + i, t => V.crash(t, 0.7));
      for (const [q, m, len] of HOOK) if (climax + q < title - 4) at(climax + q, t => V.lead(t, len * b, m, 1));
      // Slow motion (SHOWCASE.ramps): a reversed cymbal drawn out over it, and the snap back to speed is a hit.
      for (const r of S.ramps || []) {
        at(r.at, t => V.swell(t, r.for * b, 1.3));
        at(r.at + r.for, t => { V.taiko(t, 1, 70); V.kick(t, 1.1); V.crash(t, 0.6); });
      }
      // The kinetic words: each a stab of the band, a drum and a crack.
      for (const w of S.words || []) at(w.at, t => { V.brass(t, b * w.for * 0.8, chordAt(w.at)[0], 1.1); V.taiko(t, 1, 96); V.snare(t, 0.9); });
      // The last bar before the title: half time, toms down into it; then the cut to black is half a beat of silence
      // but for a cymbal drawn in backwards.
      const dark = S.title.dark ?? title;
      for (let i = 0; i < 8; i++) if (title - 2 + i / 4 < dark - 0.2) at(title - 2 + i / 4, t => V.taiko(t, 0.45 + i * 0.07, 150 - i * 9));
      if (dark < title) at(dark, t => V.swell(t, (title - dark) * b, 1.4));
      // The title: the deep hit, the last chord held; the logo's other two parts each a hit of their own.
      const [notes, root] = C[CHORDS[Math.floor(title / 4)]];
      at(title, t => { V.boom(t, 1.25); V.crash(t, 1.1); V.pad(t, b * 7, notes, 1.6); V.brass(t, b * 3, notes, 1.1); V.bass(t, b * 6, root, 1); V.kick(t, 1.2); V.snare(t, 1); });
      at(title + 0.5, t => { V.taiko(t, 1.1, 88); V.snare(t, 0.8); });
      at(title + 1, t => { V.taiko(t, 1.3, 64); V.kick(t, 1.2); V.crash(t, 0.8); });
      return ev.sort((x, y) => x[0] - y[0]).map(([beatN, fn]) => [t0 + beatN * b, fn]);
    }
    const list = score(beat);
    function pump(now) {
      if (stopped) return;
      while (next < list.length && list[next][0] < now + AHEAD) {   // a note the clock passed (a stalled frame) is dropped
        const [t, fn] = list[next++];
        if (t >= now - 0.05) fn(Math.max(t, now));
      }
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
