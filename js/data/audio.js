'use strict';
// ============================================================================
// 2h. Sound data
// ============================================================================
// Every sound is a recipe of layers that the audio engine (js/audio.js) builds from noise and oscillators at
// the moment it plays; there are no sample files. Layers combine a transient (the snap), a body (the thump)
// and a tail (the ring), the way a foley recording does, and each play varies them a little.
//
// A sound: { bus: 'sfx' | 'foot' | 'ui', priority: 0..3 (higher survives voice stealing), cooldown (s between plays),
//            max (most overlapping plays), verb: 0..1 reverb send, heat: 0..1 how much it masks quieter sounds,
//            jitter: pitch spread in cents (default AUDIO.jitter), velPitch: how far a hard hit drops the pitch,
//            layers: [...] }
// A layer is a noise bed or a tone:
//   noise: 'white' | 'pink' | 'brown'          wave: 'sine' | 'triangle' | 'sawtooth' | 'square'
//   freq: Hz or [min, max] (random per play)   to: Hz it glides to (exponential)    glide: seconds to get there
//   partials: [[ratio, gain, decayMul], ...]    extra oscillators on the tone (bells, steel, chords)
//   filter: { type, freq, to, q }               freq and to as above; `bright` (0..1.5) opens it on a hard hit
//   parallel: [filter, ...]                     several filters side by side instead of one (detuned resonances)
//   fm: { ratio, index, decay }                 a modulator on the tone's pitch (metal, hollow bodies)
//   drive: 1..6                                 waveshaper crunch;  dv, av: how much its decay and attack drift per play (default 0.2, 0.3)
//   at: start delay (s)   a: attack (s)   h: hold (s)   d: decay (s)   gain: peak level (0..1)
// Numbers that take [min, max] are drawn fresh on every play.
const AUDIO = {
  jitter: 150,                      // default pitch spread (cents): about +-9 %
  volume: 2.0,                      // master level before the Options setting (the limiter holds the peaks)
  voices: 20,                       // sounds that may play at once; more steal the quietest oldest
  strips: 28,                       // channel strips in the pool (a few spare for voices fading out)
  buses: { sfx: 0.9, foot: 0.6, ui: 0.55 },
  compressor: { threshold: -16, knee: 14, ratio: 4, attack: 0.004, release: 0.2 },
  limiter: { threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.08 },
  reverb: { time: 2.2, decay: 3.2, level: 0.55, damp: 5200 },   // seconds, decay curve steepness, return level, high cut (Hz)
  space: { range: 34, rolloff: 1.6, near: 4, maxPan: 0.85, farCut: 1800, nearCut: 18000 },   // distance model for sounds placed in the world
  heat: { decay: 0.5, footDuck: 0.72 },   // a loud moment lifts `heat`, which falls back; footsteps fade by up to footDuck while it is high
  muffle: { open: 22000, pause: 900, death: 380, pauseTime: 0.12, deathTime: 1.6, openTime: 0.35 },
  // Footsteps stay underneath everything: soft, low, never above the body of a thud.
  steps: { range: 17, enemyMax: 3, enemyGain: 0.7, playerGain: 1, minSpeed: 0.8 },

  sounds: {
    // ---- weapons through the air ----
    swingLight: { bus: 'sfx', priority: 1, cooldown: 0.05, verb: 0.05, heat: 0.15, layers: [
      // A blade cutting air: a rising hiss, a body of swoosh, a thin steel "shing" on top, and the push of displaced air. No tone.
      { noise: 'white', filter: { type: 'bandpass', freq: [1800, 2400], to: [5500, 7000], q: 1.2, bright: 0.6 }, a: 0.02, d: 0.16, gain: 0.55 },
      { noise: 'pink', filter: { type: 'bandpass', freq: [500, 700], to: [1500, 1800], q: 0.7, bright: 0.8 }, a: 0.03, d: 0.2, gain: 0.7 },
      { noise: 'white', filter: { type: 'bandpass', freq: [3200, 4200], to: [3800, 5200], q: 18 }, a: 0.02, d: 0.22, gain: 1.3 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 300 }, a: 0.03, d: 0.12, gain: 0.3 },
    ] },
    swingHeavy: { bus: 'sfx', priority: 1, cooldown: 0.08, verb: 0.12, heat: 0.3, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: [900, 1300], to: [3000, 4000], q: 1, bright: 0.6 }, a: 0.05, d: 0.28, gain: 0.8 },
      { noise: 'pink', filter: { type: 'bandpass', freq: [250, 350], to: [800, 1000], q: 0.8, bright: 0.8 }, a: 0.07, d: 0.32, gain: 1 },
      { noise: 'white', filter: { type: 'bandpass', freq: [2200, 2800], to: [2800, 3400], q: 14 }, a: 0.05, d: 0.3, gain: 1.1 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 240, to: 110 }, a: 0.06, d: 0.36, gain: 0.8 },
      { wave: 'sine', freq: 80, to: 50, a: 0.05, d: 0.28, gain: 0.2 },
    ] },
    // ---- the player's voice: a rough throat tone shaped by vowel formants, with breath ----
    hurtGrunt: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 1, verb: 0.1, heat: 0, layers: [
      { wave: 'sawtooth', freq: [105, 125], to: 78, parallel: [{ type: 'bandpass', freq: [520, 620], to: 440, q: 5 }, { type: 'bandpass', freq: [850, 1000], to: 700, q: 6 }], a: 0.02, d: 0.26, gain: 1.2, drive: 1.5 },
      { wave: 'sawtooth', freq: [108, 128], to: 80, parallel: [{ type: 'bandpass', freq: [500, 600], to: 430, q: 5 }, { type: 'bandpass', freq: [800, 950], to: 680, q: 6 }], a: 0.025, d: 0.24, gain: 0.8 },
      { noise: 'pink', filter: { type: 'bandpass', freq: [600, 900], q: 1 }, a: 0.01, d: 0.2, gain: 0.3 },
    ] },
    hurtMoan: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.25, heat: 0, layers: [
      { wave: 'sawtooth', freq: [120, 140], to: 68, parallel: [{ type: 'bandpass', freq: [600, 700], to: 420, q: 5 }, { type: 'bandpass', freq: [1000, 1150], to: 720, q: 6 }], a: 0.06, h: 0.12, d: 0.55, gain: 1.2, drive: 1.5 },
      { wave: 'sawtooth', freq: [123, 143], to: 70, parallel: [{ type: 'bandpass', freq: [580, 680], to: 410, q: 5 }, { type: 'bandpass', freq: [950, 1100], to: 700, q: 6 }], a: 0.07, h: 0.1, d: 0.5, gain: 0.8 },
      { noise: 'pink', filter: { type: 'bandpass', freq: [700, 1000], to: 500, q: 1 }, a: 0.05, h: 0.1, d: 0.5, gain: 0.3 },
    ] },
    roll: { bus: 'sfx', priority: 1, cooldown: 0.1, verb: 0.04, heat: 0.05, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: [520, 640], to: 280, q: 0.6 }, a: 0.04, d: 0.24, gain: 0.26 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 220 }, a: 0.03, d: 0.22, gain: 0.3 },
    ] },
    jump: { bus: 'sfx', priority: 1, cooldown: 0.12, heat: 0.03, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 520, to: 900, q: 0.8 }, a: 0.02, d: 0.12, gain: 0.14 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 260 }, a: 0.004, d: 0.1, gain: 0.32 },
    ] },
    landSoft: { bus: 'sfx', priority: 1, cooldown: 0.12, heat: 0.08, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: 320, to: 140, bright: 0.6 }, a: 0.003, d: 0.14, gain: 0.55 },
      { wave: 'sine', freq: 82, to: 46, a: 0.003, d: 0.18, gain: 0.5 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 1100 }, a: 0.002, d: 0.04, gain: 0.18 },
    ] },
    guardUp: { bus: 'sfx', priority: 0, cooldown: 0.2, heat: 0.02, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 700, q: 1.4 }, a: 0.01, d: 0.07, gain: 0.1 },
      { wave: 'sine', freq: 180, to: 130, a: 0.004, d: 0.07, gain: 0.12 },
    ] },
    dodge: { bus: 'sfx', priority: 2, cooldown: 0.15, verb: 0.3, heat: 0.05, layers: [
      { wave: 'sine', freq: 660, partials: [[1, 1, 1], [1.5, 0.6, 0.8]], a: 0.012, d: 0.3, gain: 0.07 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1500, to: 3000, q: 0.9 }, a: 0.02, d: 0.14, gain: 0.1 },
    ] },

    // ---- the counter (pass 95) ----
    // The window opening: a sharp, bright ring (a struck high bell over a glassy shimmer) and a low swell of time
    // slowing under it. Its own: no hit sound is like it.
    counterOpen: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 1, verb: 0.55, heat: 0.35, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 7000, q: 0.7 }, a: 0.0006, d: 0.03, gain: 0.35 },
      { wave: 'sine', freq: 2490, partials: [[1, 1, 1], [2.76, 0.45, 0.5], [5.4, 0.2, 0.3], [1.5, 0.3, 0.8]], a: 0.001, d: 0.9, gain: 0.3 },
      { noise: 'white', parallel: [{ type: 'bandpass', freq: 4200, q: 30 }, { type: 'bandpass', freq: 5600, q: 26 }], a: 0.002, d: 0.6, gain: 1.4 },
      { wave: 'sine', freq: 220, to: 110, glide: 0.5, a: 0.04, d: 0.55, gain: 0.22 },
    ] },
    // The flash step: air torn open in one stroke and a thin, high steel "shing".
    counterFlash: { bus: 'sfx', priority: 3, cooldown: 0.1, verb: 0.3, heat: 0.4, jitter: 60, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1200, to: 7500, q: 1.1 }, a: 0.004, d: 0.13, gain: 0.9 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 900, to: 200 }, a: 0.003, d: 0.18, gain: 0.7 },
      { noise: 'white', filter: { type: 'bandpass', freq: [5200, 5800], q: 24 }, at: 0.02, a: 0.002, d: 0.45, gain: 1.6 },
      { wave: 'sine', freq: 3300, partials: [[1, 1, 1], [2.1, 0.35, 0.6]], at: 0.02, a: 0.002, d: 0.35, gain: 0.08 },
    ] },
    // The rising cut: a deep heave of air sweeping upward into a ringing edge.
    // The Finishing Blow (pass 103, js/finisher-fx.js). A guard cracking: a glassy snap, a crackle running through it
    // and a hard ceramic ping over a dull knock.
    guardCrack: { bus: 'sfx', priority: 3, cooldown: 0.15, verb: 0.35, heat: 0.7, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [4000, 5500], q: 0.7 }, a: 0.0004, d: 0.012, gain: 0.9, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, to: 900, q: 2.2 }, glide: 0.18, at: 0.008, a: 0.002, d: 0.2, dv: 0.4, gain: 1.1, drive: 3 },
      { wave: 'sine', freq: 1860, partials: [[1, 1, 1], [2.92, 0.5, 0.45], [4.7, 0.28, 0.3]], a: 0.001, d: 0.55, gain: 0.16 },
      { wave: 'sine', freq: [90, 110], to: 55, a: 0.002, d: 0.22, gain: 0.7, drive: 2 },
    ] },
    // Time stopping: the air drawn in and cut off, a deep fall in pitch and a thin, glassy ring hanging over the silence.
    finisherFreeze: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.6, heat: 0.8, jitter: 20, layers: [
      { noise: 'pink', filter: { type: 'lowpass', freq: 400, to: 2400 }, glide: 0.12, a: 0.11, h: 0.01, d: 0.06, gain: 0.9 },
      { wave: 'sine', freq: 170, to: 38, glide: 0.45, a: 0.004, d: 0.6, gain: 0.8, drive: 2 },
      { wave: 'sine', freq: 3150, partials: [[1, 1, 1], [1.5, 0.4, 0.8], [2.76, 0.3, 0.5]], at: 0.08, a: 0.01, d: 1.3, gain: 0.12 },
      { noise: 'white', parallel: [{ type: 'bandpass', freq: 3150, q: 40 }, { type: 'bandpass', freq: 4725, q: 34 }], at: 0.08, a: 0.01, d: 1.1, gain: 1.0 },
    ] },
    // A flash step through the held foe: one torn stroke of air and a bright steel hiss.
    finisherStep: { bus: 'sfx', priority: 3, cooldown: 0.05, max: 3, verb: 0.25, heat: 0.4, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, to: 8200, q: 1.3 }, glide: 0.07, a: 0.003, d: 0.1, gain: 1.0 },
      { noise: 'white', filter: { type: 'bandpass', freq: [6000, 6600], q: 26 }, at: 0.015, a: 0.002, d: 0.22, gain: 1.4 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 700, to: 180 }, a: 0.002, d: 0.09, gain: 0.5 },
    ] },
    // Every cut opening at once: three tears of flesh and air one on another, a deep boom that falls away under it,
    // a long ring of steel over the top.
    finisherOpen: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 1, verb: 0.45, heat: 1, jitter: 25, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [2500, 3500], q: 0.7 }, a: 0.0005, d: 0.016, gain: 1.0, drive: 3 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3200, to: 900, q: 1.2 }, glide: 0.3, a: 0.002, d: 0.32, gain: 1.0, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 4200, to: 1200, q: 1.4 }, glide: 0.3, at: 0.03, a: 0.002, d: 0.28, gain: 0.8, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 5200, to: 1500, q: 1.6 }, glide: 0.3, at: 0.06, a: 0.002, d: 0.26, gain: 0.7, drive: 2 },
      { wave: 'sine', freq: [58, 66], to: 24, glide: 0.8, a: 0.003, d: 1.1, gain: 1.1, drive: 3 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 80 }, a: 0.002, d: 0.9, gain: 1.0, drive: 2 },
      { noise: 'white', parallel: [{ type: 'bandpass', freq: 4100, q: 32 }, { type: 'bandpass', freq: 5650, q: 28 }], at: 0.02, a: 0.002, d: 1.4, gain: 1.3 },
    ] },
    // The cut opening a beat after the blow: a tearing hiss and a deep, dry boom.
    cutOpen: { bus: 'sfx', priority: 3, cooldown: 0.12, verb: 0.4, heat: 0.8, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [3000, 4200], to: 9000, q: 0.7 }, a: 0.002, d: 0.16, gain: 0.7, drive: 2 },
      { noise: 'pink', parallel: [{ type: 'bandpass', freq: [300, 360], q: 4 }, { type: 'bandpass', freq: [620, 700], q: 5 }], a: 0.002, d: 0.38, gain: 1.4, drive: 2 },
      { wave: 'sine', freq: [54, 62], to: 30, a: 0.004, d: 0.8, gain: 1.1, drive: 3 },
      { noise: 'white', parallel: [{ type: 'bandpass', freq: 2800, q: 26 }, { type: 'bandpass', freq: 4100, q: 22 }], a: 0.002, d: 0.7, gain: 1.2 },
    ] },

    // ---- impacts ----
    hitFlesh: { bus: 'sfx', priority: 3, cooldown: 0.03, verb: 0.08, heat: 0.6, velPitch: 0.12, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [3000, 4800], q: 0.7 }, a: 0.0005, d: 0.01, dv: 0.4, gain: 0.55 },   // snap: edge on armour
      { noise: 'pink', filter: { type: 'bandpass', freq: [1500, 2200], q: 1.2, bright: 0.8 }, a: 0.001, d: 0.05, gain: 0.34 },   // scrape
      { noise: 'pink', parallel: [{ type: 'bandpass', freq: [340, 420], q: 6 }, { type: 'bandpass', freq: [560, 700], q: 5 }], a: 0.001, d: 0.16, gain: 1.3 },   // hollow body
      { wave: 'sine', freq: [190, 230], fm: { ratio: 1.41, index: 1.1, decay: 0.5 }, a: 0.001, d: 0.13, gain: 0.3 },
      { wave: 'sine', freq: [58, 70], to: 38, a: 0.002, d: 0.14, gain: 1 },   // sub punch
    ] },
    hitHurt: { bus: 'sfx', priority: 3, cooldown: 0.05, verb: 0.12, heat: 0.8, velPitch: 0.12, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [2600, 4000], q: 0.7 }, a: 0.0005, d: 0.012, dv: 0.4, gain: 0.5 },
      { noise: 'pink', parallel: [{ type: 'bandpass', freq: [250, 330], q: 4 }, { type: 'bandpass', freq: [430, 540], q: 4 }], a: 0.001, d: 0.22, gain: 1.4 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 800, to: 260, bright: 0.7 }, a: 0.002, d: 0.22, gain: 0.8 },
      { wave: 'sine', freq: [50, 64], to: 30, a: 0.002, d: 0.3, gain: 1.1 },
      { wave: 'sawtooth', freq: [150, 170], to: 105, filter: { type: 'bandpass', freq: 700, q: 3 }, a: 0.02, d: 0.2, gain: 0.06 },
    ] },
    hitBlock: { bus: 'sfx', priority: 3, cooldown: 0.04, verb: 0.16, heat: 0.55, velPitch: 0.1, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [4000, 6200], q: 0.8 }, a: 0.0005, d: 0.009, dv: 0.4, gain: 0.7 },   // steel bite
      { noise: 'white', parallel: [{ type: 'bandpass', freq: [520, 640], q: 14 }, { type: 'bandpass', freq: [870, 1100], q: 12 }], a: 0.001, d: 0.4, gain: 2.2 },   // shield ring
      { wave: 'sine', freq: [480, 560], fm: { ratio: 2.76, index: 2.2, decay: 0.5 }, a: 0.001, d: 0.34, gain: 0.3 },
      { wave: 'sine', freq: [60, 74], to: 40, a: 0.002, d: 0.12, gain: 0.7 },
    ] },
    riposteBoom: { bus: 'sfx', priority: 3, cooldown: 0.1, verb: 0.3, heat: 1, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [2500, 4000], q: 0.7 }, a: 0.0005, d: 0.014, dv: 0.4, gain: 0.8, drive: 3 },
      { noise: 'pink', parallel: [{ type: 'bandpass', freq: [230, 300], q: 4 }, { type: 'bandpass', freq: [400, 480], q: 5 }], a: 0.001, d: 0.45, gain: 1.4, drive: 2 },
      { wave: 'sine', freq: [62, 74], to: 28, a: 0.003, d: 0.7, gain: 1, drive: 3 },   // bass crunch
      { noise: 'brown', filter: { type: 'lowpass', freq: 500, to: 100 }, a: 0.002, d: 0.55, gain: 0.8, drive: 2 },
    ] },
    parry: { bus: 'sfx', priority: 3, cooldown: 0.1, verb: 0.32, heat: 0.7, velPitch: 0.06, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [5000, 8000], q: 0.8 }, a: 0.0004, d: 0.008, dv: 0.4, gain: 0.7 },   // sharp contact
      { noise: 'white', parallel: [{ type: 'bandpass', freq: [2500, 3000], q: 28 }, { type: 'bandpass', freq: [3300, 3900], q: 24 }], a: 0.001, d: 0.9, gain: 2.4 },   // sustained steel ring
      { wave: 'sine', freq: [800, 1000], fm: { ratio: 2.76, index: 1.5, decay: 0.5 }, a: 0.001, d: 0.5, gain: 0.2 },
      { wave: 'sine', freq: [64, 76], to: 44, a: 0.002, d: 0.1, gain: 0.6 },
    ] },
    postureBreak: { bus: 'sfx', priority: 3, cooldown: 0.2, verb: 0.25, heat: 0.9, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 1500, to: 500 }, a: 0.001, d: 0.36, gain: 0.5, drive: 2 },
      { noise: 'white', filter: { type: 'highpass', freq: [3500, 5000], q: 0.7 }, a: 0.0005, d: 0.012, dv: 0.4, gain: 0.6 },
      { noise: 'pink', parallel: [{ type: 'bandpass', freq: [420, 520], q: 6 }, { type: 'bandpass', freq: [700, 860], q: 6 }], a: 0.001, d: 0.35, gain: 1.3 },
      { wave: 'sine', freq: [50, 62], to: 30, a: 0.003, d: 0.6, gain: 1, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 150 }, a: 0.002, d: 0.5, gain: 0.7 },
    ] },
    groundPound: { bus: 'sfx', priority: 3, cooldown: 0.15, verb: 0.28, heat: 1, velPitch: 0.2, layers: [
      { wave: 'sine', freq: [68, 76], to: 27, a: 0.002, d: 0.95, gain: 1 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 520, to: 110, bright: 0.5 }, a: 0.003, d: 0.85, gain: 1 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 3000, to: 800 }, a: 0.001, d: 0.26, gain: 0.6 },
      { wave: 'triangle', freq: 140, to: 50, a: 0.002, d: 0.4, gain: 0.38 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, q: 0.5 }, at: 0.05, a: 0.05, d: 0.5, gain: 0.08 },
    ] },
    hardLanding: { bus: 'sfx', priority: 3, cooldown: 0.2, verb: 0.12, heat: 0.7, layers: [
      { wave: 'sine', freq: 62, to: 30, a: 0.002, d: 0.5, gain: 1 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 420, to: 130 }, a: 0.002, d: 0.4, gain: 0.8 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 1500 }, a: 0.001, d: 0.08, gain: 0.5 },
    ] },
    enemyDeath: { bus: 'sfx', priority: 3, cooldown: 0.08, verb: 0.22, heat: 0.5, velPitch: 0.1, layers: [
      { wave: 'sine', freq: 100, to: 35, a: 0.004, d: 0.7, gain: 0.8 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 150 }, a: 0.004, d: 0.6, gain: 0.6 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 300, q: 0.8 }, a: 0.1, d: 0.5, gain: 0.22 },
    ] },
    playerDeath: { bus: 'sfx', priority: 3, cooldown: 1, max: 1, verb: 0.7, heat: 1, jitter: 6, layers: [
      { wave: 'sine', freq: 55, partials: [[1, 1, 1], [2, 0.6, 0.8], [2.76, 0.34, 0.6], [4.2, 0.2, 0.4], [5.4, 0.14, 0.3]], a: 0.004, d: 3.6, gain: 0.5 },
      { wave: 'sine', freq: 46, to: 27, a: 0.01, d: 2.6, gain: 0.7 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 320, to: 90 }, a: 0.01, d: 2, gain: 0.4 },
    ] },

    // ---- ranged ----
    shot: { bus: 'sfx', priority: 2, cooldown: 0.1, verb: 0.15, heat: 0.2, layers: [
      { wave: 'triangle', freq: [330, 350], to: 245, partials: [[1, 1, 1], [2, 0.4, 0.6], [3, 0.2, 0.4]], a: 0.001, d: 0.26, gain: 0.26 },
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, q: 1 }, a: 0.001, d: 0.025, gain: 0.26 },
      { wave: 'sine', freq: 112, to: 58, a: 0.002, d: 0.13, gain: 0.45 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1200, to: 300, q: 0.7 }, at: 0.02, a: 0.02, d: 0.12, gain: 0.14 },
    ] },
    boltStopped: { bus: 'sfx', priority: 2, cooldown: 0.05, verb: 0.1, heat: 0.15, layers: [
      { wave: 'sine', freq: 190, to: 92, a: 0.001, d: 0.09, gain: 0.6 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 1300 }, a: 0.001, d: 0.05, gain: 0.46 },
    ] },

    // ---- cues ----
    alert: { bus: 'sfx', priority: 1, cooldown: 0.25, max: 2, verb: 0.2, heat: 0.05, layers: [
      { wave: 'triangle', freq: 300, to: 410, a: 0.025, d: 0.24, gain: 0.1 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 600, to: 900, q: 0.8 }, a: 0.05, d: 0.28, gain: 0.1 },
    ] },
    perilous: { bus: 'sfx', priority: 2, cooldown: 0.4, max: 1, verb: 0.3, heat: 0.2, layers: [
      { wave: 'sawtooth', freq: 108, to: 160, filter: { type: 'lowpass', freq: 520, to: 900, q: 1.2 }, a: 0.14, d: 0.46, gain: 0.2 },
      { wave: 'sine', freq: 54, to: 80, a: 0.1, d: 0.5, gain: 0.34 },
    ] },
    lockOn: { bus: 'ui', priority: 1, cooldown: 0.08, jitter: 8, heat: 0, layers: [
      { wave: 'sine', freq: 300, to: 235, a: 0.001, d: 0.05, gain: 0.34 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1500, q: 1 }, a: 0.001, d: 0.02, gain: 0.2 },
    ] },
    switchTarget: { bus: 'ui', priority: 1, cooldown: 0.08, jitter: 8, heat: 0, layers: [
      { wave: 'sine', freq: 360, to: 300, a: 0.001, d: 0.045, gain: 0.3 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1700, q: 1 }, a: 0.001, d: 0.018, gain: 0.18 },
    ] },

    // ---- items and world ----
    flask: { bus: 'sfx', priority: 2, cooldown: 0.5, max: 1, verb: 0.25, heat: 0.1, layers: [
      { wave: 'sine', freq: [380, 430], to: 620, at: 0.00, a: 0.004, d: 0.08, gain: 0.18 },
      { wave: 'sine', freq: [420, 470], to: 700, at: 0.12, a: 0.004, d: 0.08, gain: 0.16 },
      { wave: 'sine', freq: [460, 520], to: 760, at: 0.25, a: 0.004, d: 0.08, gain: 0.14 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 800, q: 1.2 }, a: 0.04, d: 0.45, gain: 0.09 },
      { wave: 'sine', freq: 140, to: 90, at: 0.4, a: 0.004, d: 0.12, gain: 0.3 },
      { wave: 'sine', freq: 330, partials: [[1, 1, 1], [1.5, 0.8, 1], [2, 0.6, 1]], at: 0.45, a: 0.15, d: 0.9, gain: 0.05 },
    ] },
    rest: { bus: 'sfx', priority: 3, cooldown: 1, max: 1, verb: 0.55, heat: 0.4, jitter: 0, layers: [
      { wave: 'sine', freq: 110, partials: [[1, 1, 1], [1.5, 0.8, 1], [2, 0.7, 1], [3, 0.35, 1]], a: 1.1, d: 2.6, gain: 0.24 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 400, to: 1200 }, a: 0.5, d: 1.6, gain: 0.26 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 2 }, at: 0.25, a: 0.001, d: 0.012, gain: 0.1 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, q: 2 }, at: 0.7, a: 0.001, d: 0.012, gain: 0.09 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3400, q: 2 }, at: 1.15, a: 0.001, d: 0.012, gain: 0.1 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2900, q: 2 }, at: 1.7, a: 0.001, d: 0.012, gain: 0.08 },
    ] },
    gateOpened: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.3, heat: 0.6, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: 230, to: 160 }, a: 0.25, h: 1.0, d: 0.6, gain: 1 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 300, to: 340, q: 3 }, at: 0.2, a: 0.3, h: 0.9, d: 0.5, gain: 0.2 },
      { wave: 'sine', freq: 50, to: 40, a: 0.1, h: 1.2, d: 0.6, gain: 0.8 },
      { wave: 'sine', freq: 80, to: 40, at: 1.7, a: 0.003, d: 0.3, gain: 0.7 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 500, to: 150 }, at: 1.7, a: 0.003, d: 0.4, gain: 0.7 },
    ] },
    trapWarning: { bus: 'sfx', priority: 2, cooldown: 0.5, max: 1, verb: 0.3, heat: 0.3, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 180, to: 270, q: 6 }, a: 0.1, h: 0.2, d: 0.5, gain: 0.34 },
      { wave: 'sine', freq: 44, a: 0.1, h: 0.5, d: 0.4, gain: 0.5 },
    ] },
    trapSprung: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.25, heat: 0.8, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: 520, to: 140 }, a: 0.01, d: 1.2, gain: 1 },
      { noise: 'white', filter: { type: 'bandpass', freq: 1500, to: 600, q: 0.6 }, a: 0.01, d: 0.6, gain: 0.26 },
      { wave: 'sine', freq: 62, to: 28, a: 0.004, d: 1, gain: 0.9 },
    ] },
    levelComplete: { bus: 'sfx', priority: 3, cooldown: 2, max: 1, verb: 0.7, heat: 0.2, jitter: 0, layers: [
      { wave: 'sine', freq: 220, partials: [[1, 1, 1], [1.5, 0.8, 0.9], [2, 0.7, 0.8], [3, 0.3, 0.6]], a: 0.6, d: 4, gain: 0.2 },
      { wave: 'triangle', freq: 110, a: 0.5, d: 4, gain: 0.18 },
      { wave: 'sine', freq: 440, partials: [[1, 0.6, 1], [2.76, 0.12, 0.4]], at: 0.15, a: 0.001, d: 2.4, gain: 0.07 },
    ] },

    // ---- Boss Rush's abilities (v7.75.0): each power its own sound, each rare's perk its own, the pick a note ----
    // Meteor Fall: a white-hot crack, a sub boom that crunches, fire roaring up, stones raining after.
    abilityBlast: { bus: 'sfx', priority: 3, cooldown: 0.2, max: 2, verb: 0.55, heat: 1, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [2200, 3200], q: 0.7 }, a: 0.0005, d: 0.03, dv: 0.4, gain: 0.9, drive: 3 },
      { wave: 'sine', freq: [52, 58], to: 22, a: 0.003, d: 1.5, gain: 1.2, drive: 3 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 700, to: 80 }, a: 0.003, d: 1.7, gain: 1.2, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 380, to: 1300, q: 0.6 }, at: 0.04, a: 0.08, d: 1.6, gain: 0.7 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, q: 0.8 }, at: 0.25, a: 0.1, d: 1.3, gain: 0.12 },
    ] },
    // Storm King's dragon leaving the blade: an electric snarl that climbs, crackling, as it flies to the boss.
    abilityDragon: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 2, verb: 0.45, heat: 0.6, jitter: 80, layers: [
      { wave: 'sawtooth', freq: 70, to: 210, glide: 0.7, fm: { ratio: 0.51, index: 4, decay: 1 }, filter: { type: 'bandpass', freq: 500, to: 2400, q: 1.6 }, a: 0.03, h: 0.45, d: 0.35, gain: 0.5, drive: 4 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3200, to: 6400, q: 2.5 }, a: 0.01, h: 0.5, d: 0.25, gain: 0.35, drive: 3 },
      { noise: 'white', filter: { type: 'highpass', freq: 5000 }, a: 0.0005, d: 0.02, dv: 0.4, gain: 0.6 },
      { wave: 'sine', freq: 46, to: 64, a: 0.15, h: 0.4, d: 0.3, gain: 0.45 },
    ] },
    // Each bolt: a split-second crack overhead, then thunder rolling away.
    abilityThunder: { bus: 'sfx', priority: 3, cooldown: 0.12, max: 3, verb: 0.6, heat: 0.9, jitter: 200, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [3000, 4500], q: 0.7 }, a: 0.0004, d: 0.025, dv: 0.4, gain: 1, drive: 4 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2800, to: 500, q: 0.5 }, a: 0.001, d: 0.3, gain: 0.5, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 420, to: 90 }, at: 0.03, a: 0.06, h: 0.2, d: 1.6, gain: 1 },
      { wave: 'sine', freq: 44, to: 28, at: 0.02, a: 0.01, d: 1.2, gain: 0.6, drive: 2 },
    ] },
    // Time Rift: the world's sound sucked backwards, a glassy chime, and a clock ticking slow.
    abilityFreeze: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 1, verb: 0.8, heat: 0.7, jitter: 0, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 3000, to: 260, q: 0.9 }, a: 0.35, d: 0.25, gain: 0.6 },
      { wave: 'sine', freq: 1240, to: 980, glide: 1.6, partials: [[1, 1, 1], [2.76, 0.35, 0.6], [5.4, 0.12, 0.4]], at: 0.33, a: 0.002, d: 2.4, gain: 0.32 },
      { wave: 'sine', freq: 72, to: 36, glide: 1.4, at: 0.3, a: 0.01, d: 1.8, gain: 0.7 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3600, q: 18 }, at: 0.75, a: 0.001, d: 0.05, gain: 0.7 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2800, q: 18 }, at: 1.35, a: 0.001, d: 0.05, gain: 0.5 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3600, q: 18 }, at: 1.95, a: 0.001, d: 0.05, gain: 0.35 },
    ] },
    // Thousand Blades: a choir of steel rising as the swords gather...
    abilityBlades: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 1, verb: 0.7, heat: 0.5, jitter: 40, layers: [
      { wave: 'sine', freq: 660, partials: [[1, 1, 1], [1.5, 0.6, 0.9], [2, 0.4, 0.8], [3.01, 0.2, 0.5]], a: 0.25, d: 1.5, gain: 0.22 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3800, to: 5200, q: 12 }, a: 0.2, d: 1, gain: 0.5 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 2600, q: 0.8 }, a: 0.3, d: 0.4, gain: 0.25 },
    ] },
    // ...and each one: a ring of steel and a thud into the floor.
    abilityBlade: { bus: 'sfx', priority: 1, cooldown: 0.05, max: 3, verb: 0.3, heat: 0.2, jitter: 250, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 5000 }, a: 0.0005, d: 0.01, dv: 0.4, gain: 0.5 },
      { noise: 'white', filter: { type: 'bandpass', freq: [3000, 4200], q: 22 }, a: 0.001, d: 0.32, gain: 1.2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 320, to: 120 }, a: 0.002, d: 0.14, gain: 0.6 },
    ] },
    // Blood Moon: a low drone swelling up, a slow heartbeat, a thin choir high above.
    abilityMoon: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.7, heat: 0.6, jitter: 0, layers: [
      { wave: 'sine', freq: 41, a: 0.7, h: 0.6, d: 2.4, gain: 0.8 },
      { wave: 'sawtooth', freq: 82, filter: { type: 'lowpass', freq: 240, to: 520 }, a: 0.9, h: 0.4, d: 2.2, gain: 0.12 },
      { wave: 'sine', freq: 60, to: 40, at: 0.1, a: 0.005, d: 0.2, gain: 1 },
      { wave: 'sine', freq: 52, to: 36, at: 0.36, a: 0.005, d: 0.22, gain: 0.75 },
      { wave: 'sine', freq: 60, to: 40, at: 1.15, a: 0.005, d: 0.2, gain: 0.9 },
      { wave: 'sine', freq: 52, to: 36, at: 1.41, a: 0.005, d: 0.22, gain: 0.65 },
      { wave: 'sine', freq: 740, partials: [[1, 1, 1], [1.19, 0.7, 1], [1.5, 0.5, 1]], a: 0.9, d: 2.2, gain: 0.05 },
    ] },
    // A rare acting: a short bright chime (each kind at its own pitch).
    abilityPerk: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 2, verb: 0.35, heat: 0.15, jitter: 20, layers: [
      { wave: 'sine', freq: 880, partials: [[1, 1, 1], [2.76, 0.3, 0.5], [5.4, 0.1, 0.3]], a: 0.002, d: 0.6, gain: 0.22 },
      { noise: 'white', filter: { type: 'bandpass', freq: 5200, q: 4 }, a: 0.001, d: 0.05, gain: 0.25 },
    ] },
    // Ember Twin rising: fire drawn up out of the floor with a breath, a low roar swelling, a ringing double note (two of you).
    abilityTwin: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 1, verb: 0.6, heat: 0.7, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 260, to: 1800, q: 0.7 }, a: 0.35, h: 0.1, d: 0.6, gain: 0.7 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 180, to: 520 }, a: 0.3, h: 0.2, d: 0.9, gain: 0.9, drive: 2 },
      { wave: 'sawtooth', freq: 55, to: 82, glide: 0.5, filter: { type: 'lowpass', freq: 300, to: 900 }, a: 0.25, h: 0.15, d: 0.7, gain: 0.18, drive: 2 },
      { wave: 'sine', freq: 392, partials: [[1, 1, 1], [1.5, 0.7, 0.9], [2.01, 0.3, 0.6]], at: 0.38, a: 0.003, d: 1.5, gain: 0.16 },
      { noise: 'white', filter: { type: 'highpass', freq: 4000 }, at: 0.36, a: 0.001, d: 0.05, gain: 0.35 },
    ] },
    // The twin drawing the boss: a roar of fire flaring up and a low struck note, a challenge.
    abilityTaunt: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 1, verb: 0.5, heat: 0.5, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 400, to: 1400, q: 0.8 }, a: 0.08, h: 0.12, d: 0.5, gain: 0.7, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 220, to: 120 }, a: 0.02, d: 0.5, gain: 0.8 },
      { wave: 'sawtooth', freq: 98, to: 73, glide: 0.4, filter: { type: 'lowpass', freq: 700, to: 260 }, a: 0.01, d: 0.7, gain: 0.2, drive: 2 },
    ] },
    // Grave Hound called: a breath of cold fire from the ground, a growl rising out of it, a hollow far bell.
    abilityHound: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 1, verb: 0.65, heat: 0.4, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 600, to: 2200, q: 0.9 }, a: 0.25, h: 0.08, d: 0.5, gain: 0.5 },
      { wave: 'sawtooth', freq: 62, to: 78, glide: 0.5, filter: { type: 'lowpass', freq: 260, to: 520 }, a: 0.12, h: 0.3, d: 0.45, gain: 0.28, drive: 3 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 160, to: 300 }, a: 0.2, h: 0.2, d: 0.5, gain: 0.7 },
      { wave: 'sine', freq: 233, partials: [[1, 1, 1], [2.4, 0.4, 0.6], [4.1, 0.15, 0.4]], at: 0.3, a: 0.004, d: 1.6, gain: 0.1 },
    ] },
    // Each of its bites: the jaws' clack, a tearing snarl, a thump.
    abilityBite: { bus: 'sfx', priority: 2, cooldown: 0.08, max: 2, verb: 0.25, heat: 0.2, jitter: 160, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, q: 3 }, a: 0.0005, d: 0.03, gain: 0.9 },
      { wave: 'sawtooth', freq: 120, to: 85, filter: { type: 'lowpass', freq: 900, to: 300 }, a: 0.005, d: 0.18, gain: 0.25, drive: 3 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 500, q: 1.2 }, a: 0.004, d: 0.14, gain: 0.45 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 240, to: 90 }, a: 0.002, d: 0.12, gain: 0.55 },
    ] },
    // Its howl as it draws the boss: a long rising and falling cry over a cold wind.
    abilityHowl: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.75, heat: 0.4, jitter: 20, layers: [
      { wave: 'sawtooth', freq: 330, to: 520, glide: 0.35, filter: { type: 'bandpass', freq: 900, to: 1300, q: 3 }, a: 0.12, h: 0.45, d: 0.6, gain: 0.16 },
      { wave: 'sine', freq: 330, to: 520, glide: 0.35, a: 0.12, h: 0.45, d: 0.6, gain: 0.12 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 500, to: 1500, q: 0.7 }, a: 0.3, h: 0.3, d: 0.7, gain: 0.3 },
    ] },
    // Stone Guardian rising: stone grinding up out of the floor, a deep thud as it stands, a cold ringing note over it.
    abilityGuardian: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 1, verb: 0.6, heat: 0.3, jitter: 25, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: 420, to: 180 }, a: 0.25, h: 0.35, d: 0.4, gain: 1, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 400, q: 1.4 }, a: 0.2, h: 0.3, d: 0.3, gain: 0.45 },
      { wave: 'sine', freq: 58, to: 36, at: 0.78, a: 0.003, d: 0.5, gain: 1, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 260, to: 90 }, at: 0.78, a: 0.002, d: 0.35, gain: 0.8 },
      { wave: 'sine', freq: 294, partials: [[1, 1, 1], [2.32, 0.4, 0.6], [3.9, 0.15, 0.4]], at: 0.8, a: 0.004, d: 1.6, gain: 0.1 },
    ] },
    // Each of its shield bashes: stone on flesh, a heavy flat thump with grit after it.
    abilityBash: { bus: 'sfx', priority: 2, cooldown: 0.1, max: 2, verb: 0.3, heat: 0.2, jitter: 120, layers: [
      { wave: 'sine', freq: 90, to: 45, a: 0.002, d: 0.22, gain: 0.9, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 200 }, a: 0.001, d: 0.16, gain: 0.8 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 1.5 }, at: 0.02, a: 0.001, d: 0.09, gain: 0.25 },
    ] },
    // A summon of stone or ash drawing the boss: a struck shield or haft and a low horn-like call over it.
    abilityChallenge: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.7, heat: 0.3, jitter: 20, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2400, q: 2 }, a: 0.0005, d: 0.06, gain: 0.6 },
      { wave: 'sawtooth', freq: 110, to: 123, glide: 0.3, filter: { type: 'lowpass', freq: 500, to: 900 }, at: 0.05, a: 0.12, h: 0.45, d: 0.6, gain: 0.16 },
      { wave: 'sine', freq: 220, to: 247, glide: 0.3, at: 0.05, a: 0.12, h: 0.45, d: 0.6, gain: 0.1 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 200 }, a: 0.002, d: 0.3, gain: 0.6 },
    ] },
    // Lancer of Ash rising: ash swept up on a cold wind, a thin metallic ring as its spear comes level.
    abilityLancer: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 1, verb: 0.6, heat: 0.4, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 500, to: 2600, q: 0.8 }, a: 0.3, h: 0.08, d: 0.5, gain: 0.6 },
      { noise: 'white', filter: { type: 'highpass', freq: 3500 }, a: 0.2, d: 0.4, gain: 0.2 },
      { wave: 'sine', freq: 1320, partials: [[1, 1, 1], [1.51, 0.5, 0.8], [2.76, 0.2, 0.5]], at: 0.32, a: 0.003, d: 1.2, gain: 0.07 },
    ] },
    // Each of its thrusts: a quick whistle of the spear and a hard punch as it lands.
    abilityThrust: { bus: 'sfx', priority: 2, cooldown: 0.08, max: 2, verb: 0.25, heat: 0.2, jitter: 150, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, to: 3600, q: 2.5 }, a: 0.01, d: 0.08, gain: 0.5 },
      { wave: 'sine', freq: 140, to: 70, at: 0.06, a: 0.002, d: 0.14, gain: 0.7, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1100, to: 500, q: 1.2 }, at: 0.06, a: 0.003, d: 0.12, gain: 0.4 },
    ] },
    // Each of the twin's blows: a short hiss of fire and a crackle on top of the blow itself.
    abilityEcho: { bus: 'sfx', priority: 2, cooldown: 0.06, max: 2, verb: 0.3, heat: 0.25, jitter: 180, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 1400, to: 600, q: 0.9 }, a: 0.005, d: 0.22, gain: 0.55 },
      { noise: 'white', filter: { type: 'highpass', freq: 3800 }, a: 0.001, d: 0.04, dv: 0.5, gain: 0.4, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 260, to: 90 }, a: 0.002, d: 0.16, gain: 0.5 },
    ] },
    // Gale Crescent: a howl of wind tearing past, rising and falling, with a clean blade's whistle through it.
    abilityGale: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.45, heat: 0.6, jitter: 60, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 700, to: 3400, q: 2.2 }, a: 0.04, h: 0.08, d: 0.45, gain: 0.8 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 300, to: 900, q: 1.1 }, a: 0.03, d: 0.6, gain: 0.6 },
      { wave: 'sine', freq: 1760, to: 1180, glide: 0.4, a: 0.02, d: 0.45, gain: 0.08 },
      { noise: 'white', filter: { type: 'highpass', freq: 5200 }, at: 0.12, a: 0.001, d: 0.06, gain: 0.45 },
      { wave: 'sine', freq: 70, to: 40, at: 0.12, a: 0.004, d: 0.3, gain: 0.5 },
    ] },
    // Pyre: the ground cracks, a column of fire roars up and keeps burning, low and hungry.
    abilityPyre: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 2, verb: 0.55, heat: 0.9, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: [2000, 2800], q: 0.7 }, a: 0.0005, d: 0.03, gain: 0.7, drive: 3 },
      { wave: 'sine', freq: 62, to: 30, a: 0.003, d: 0.9, gain: 1, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 900, to: 260 }, a: 0.05, h: 0.9, d: 1.6, gain: 1, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 500, to: 1500, q: 0.6 }, a: 0.1, h: 0.8, d: 1.4, gain: 0.5 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 1.5 }, at: 0.2, a: 0.2, h: 0.6, d: 1, gain: 0.08 },
    ] },
    // Counterflame: a dry pop of fire bursting on the parried boss.
    abilityFlare: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 2, verb: 0.4, heat: 0.45, jitter: 120, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 2600 }, a: 0.0005, d: 0.03, gain: 0.6, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 600, to: 1600, q: 0.7 }, a: 0.01, d: 0.45, gain: 0.6 },
      { wave: 'sine', freq: 90, to: 45, a: 0.003, d: 0.25, gain: 0.55, drive: 2 },
    ] },
    // Static Edge: a sharp electric snap and a quick crackle.
    abilitySpark: { bus: 'sfx', priority: 2, cooldown: 0.12, max: 2, verb: 0.3, heat: 0.35, jitter: 220, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 4200 }, a: 0.0004, d: 0.02, gain: 0.8, drive: 4 },
      { wave: 'sawtooth', freq: 160, fm: { ratio: 0.53, index: 5, decay: 0.2 }, filter: { type: 'bandpass', freq: 2200, q: 1.4 }, a: 0.002, d: 0.16, gain: 0.25, drive: 3 },
      { noise: 'white', filter: { type: 'bandpass', freq: 5600, q: 3 }, at: 0.03, a: 0.001, d: 0.09, gain: 0.3 },
    ] },
    // A step that opens a riposte: a quick swish and a bright high chime.
    abilityStep: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 1, verb: 0.35, heat: 0.15, jitter: 20, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2400, to: 5200, q: 1.5 }, a: 0.01, d: 0.12, gain: 0.35 },
      { wave: 'sine', freq: 1320, partials: [[1, 1, 1], [2.76, 0.3, 0.5]], at: 0.05, a: 0.002, d: 0.5, gain: 0.16 },
    ] },
    // A blow made stronger: a low thump under a hard ring.
    abilityEmpower: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 2, verb: 0.35, heat: 0.25, jitter: 30, layers: [
      { wave: 'sine', freq: 75, to: 45, a: 0.003, d: 0.25, gain: 0.6, drive: 2 },
      { wave: 'sine', freq: 520, partials: [[1, 1, 1], [2.76, 0.4, 0.5], [5.4, 0.15, 0.3]], a: 0.002, d: 0.5, gain: 0.2 },
    ] },
    // A heal: a soft rising chord.
    abilityHeal: { bus: 'sfx', priority: 2, cooldown: 0.2, max: 1, verb: 0.5, heat: 0.15, jitter: 0, layers: [
      { wave: 'sine', freq: 523, a: 0.04, d: 0.9, gain: 0.14 },
      { wave: 'sine', freq: 659, at: 0.06, a: 0.04, d: 0.85, gain: 0.12 },
      { wave: 'sine', freq: 784, at: 0.12, a: 0.04, d: 0.8, gain: 0.1 },
    ] },
    // A heavy charged at once: steel scraping up to a ring.
    abilityCharge: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 1, verb: 0.35, heat: 0.2, jitter: 20, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, to: 4800, q: 6 }, a: 0.08, d: 0.12, gain: 0.35 },
      { wave: 'sine', freq: 740, fm: { ratio: 1.41, index: 1.5, decay: 0.4 }, at: 0.12, a: 0.002, d: 0.6, gain: 0.14 },
    ] },
    // The plain commons' touches (js/ability-touch.js), quiet and the holder's only. Iron Blood picked: an iron clank.
    abilityClank: { bus: 'sfx', priority: 2, cooldown: 0.2, max: 1, verb: 0.3, heat: 0.1, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1200, q: 3 }, a: 0.0005, d: 0.025, gain: 0.6, drive: 3 },
      { wave: 'sine', freq: 180, partials: [[1, 1, 1], [2.76, 0.5, 0.6]], a: 0.002, d: 0.35, gain: 0.3 },
    ] },
    // Mirror Shard: a glassy clink as the bolt turns, then the whoosh of its way back (pass 117).
    abilityMirror: { bus: 'sfx', priority: 2, cooldown: 0.12, max: 2, verb: 0.25, heat: 0.1, jitter: 60, layers: [
      { wave: 'sine', freq: 3500, a: 0.0005, d: 0.012, gain: 0.35 },
      { noise: 'white', filter: { type: 'highpass', freq: 6000 }, a: 0.0005, d: 0.012, gain: 0.4 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, to: 1000, q: 2 }, at: 0.01, a: 0.02, d: 0.3, gain: 0.35 },
    ] },
    // Light Step: a dash charge back, a small chime.
    abilityChime: { bus: 'sfx', priority: 1, cooldown: 0.3, max: 1, verb: 0.1, heat: 0, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 6000 }, a: 0.0005, d: 0.01, gain: 0.25 },
      { wave: 'sine', freq: 1320, partials: [[1, 1, 1], [2.76, 0.3, 0.5]], a: 0.002, d: 0.15, gain: 0.12 },
    ] },
    // Quick Draught: one quick swallow after the flask.
    abilityGulp: { bus: 'sfx', priority: 1, cooldown: 0.3, max: 1, verb: 0.05, heat: 0, jitter: 60, layers: [
      { wave: 'sine', freq: 160, a: 0.002, d: 0.04, gain: 0.35 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 400, to: 700, q: 2 }, at: 0.02, a: 0.01, d: 0.12, gain: 0.35 },
    ] },
    // Cold Riposte: a crisp crack and a crystalline crackle under the counter.
    abilityFrost: { bus: 'sfx', priority: 2, cooldown: 0.15, max: 1, verb: 0.3, heat: 0.1, jitter: 80, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 5000 }, a: 0.0005, d: 0.015, gain: 0.6, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: [3000, 6000], q: 6 }, at: 0.01, a: 0.005, d: 0.25, gain: 0.35 },
      { noise: 'white', filter: { type: 'highpass', freq: 7000 }, at: 0.1, a: 0.05, d: 0.2, gain: 0.12 },
    ] },
    // Headsman: a wet brush swish ending in a low thud, under the Finishing Blow.
    abilityInk: { bus: 'sfx', priority: 2, cooldown: 0.3, max: 1, verb: 0.15, heat: 0.1, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 1500, to: 500, q: 1.5 }, glide: 0.18, a: 0.02, d: 0.18, gain: 0.5 },
      { wave: 'sine', freq: 70, at: 0.16, a: 0.003, d: 0.06, gain: 0.5 },
    ] },
    // The blade's commons (js/common-fx.js), small and under the move's own sound. Hot Iron: a hiss, then spitting
    // sizzle grains slowing as the drops cool.
    abilitySizzle: { bus: 'sfx', priority: 2, cooldown: 0.2, max: 1, verb: 0.15, heat: 0.2, jitter: 90, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 5500, q: 1.6 }, a: 0.0005, d: 0.02, gain: 0.55, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 4200, q: 4 }, at: 0.02, a: 0.002, d: 0.05, gain: 0.3 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3200, q: 4 }, at: 0.09, a: 0.002, d: 0.06, gain: 0.25 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, q: 4 }, at: 0.19, a: 0.002, d: 0.07, gain: 0.18 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2100, q: 4 }, at: 0.31, a: 0.002, d: 0.06, gain: 0.1 },
    ] },
    // Riptide: a wave rearing up with a hollow boom, rushing out, and breaking in a hiss of spray.
    abilityWave: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.5, heat: 0.4, jitter: 40, layers: [
      { wave: 'sine', freq: 80, to: 42, a: 0.01, d: 0.4, gain: 0.7, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 400, to: 1400 }, a: 0.06, h: 0.15, d: 0.35, gain: 0.8 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 2600, q: 0.8 }, a: 0.12, d: 0.3, gain: 0.5 },
      { noise: 'white', filter: { type: 'highpass', freq: 4200 }, at: 0.36, a: 0.01, d: 0.4, gain: 0.35 },
    ] },
    // Moonfall Cut: a high clean ring forming, then a heavy blade falling through, a sharp chop into the floor.
    abilityMoonfall: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.55, heat: 0.4, jitter: 30, layers: [
      { wave: 'sine', freq: 1480, partials: [[1, 1, 1], [2.76, 0.3, 0.5]], a: 0.02, d: 0.5, gain: 0.12 },
      { noise: 'white', filter: { type: 'bandpass', freq: 4000, to: 1200, q: 1.4 }, at: 0.08, a: 0.02, d: 0.14, gain: 0.55 },
      { noise: 'white', filter: { type: 'highpass', freq: 3000 }, at: 0.2, a: 0.0005, d: 0.04, gain: 0.6, drive: 3 },
      { wave: 'sine', freq: 90, to: 38, at: 0.2, a: 0.003, d: 0.3, gain: 0.7, drive: 2 },
    ] },
    // Iron Cyclone: blades scraping out of a turn, a fast whirr of steel swelling and gone.
    abilityCyclone: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.35, heat: 0.3, jitter: 50, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 3 }, a: 0.001, d: 0.05, gain: 0.5, drive: 2 },
      { wave: 'sawtooth', freq: 34, fm: { ratio: 7.1, index: 3, decay: 0.4 }, filter: { type: 'bandpass', freq: 1800, q: 2 }, a: 0.04, h: 0.12, d: 0.25, gain: 0.25 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 700, to: 1800, q: 1.4 }, a: 0.05, h: 0.1, d: 0.25, gain: 0.55 },
      { wave: 'sine', freq: 2200, to: 1700, glide: 0.3, a: 0.02, d: 0.3, gain: 0.06 },
    ] },
    // Petal Storm: a bright burst, then a long rushing flutter of many small blades whirling away.
    abilityPetals: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 1, verb: 0.6, heat: 0.4, jitter: 40, layers: [
      { wave: 'sine', freq: 990, partials: [[1, 1, 1], [2, 0.5, 0.7], [3.3, 0.2, 0.5]], a: 0.002, d: 0.7, gain: 0.14 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2600, to: 5200, q: 1.2 }, a: 0.05, h: 0.4, d: 0.6, gain: 0.45 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 600, to: 1400, q: 1 }, a: 0.08, h: 0.3, d: 0.6, gain: 0.4 },
      { wave: 'sine', freq: 70, to: 40, a: 0.004, d: 0.3, gain: 0.5 },
    ] },
    // Echoing Blade: each echo, a thin glassy slice, a short hollow whoosh, a faint ring.
    abilityGhostBlade: { bus: 'sfx', priority: 2, cooldown: 0.08, max: 2, verb: 0.35, heat: 0.2, jitter: 60, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 5000, q: 3 }, a: 0.001, d: 0.025, gain: 0.5 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1200, to: 2400, q: 1.2 }, a: 0.02, d: 0.12, gain: 0.4 },
      { wave: 'sine', freq: 1500, a: 0.005, d: 0.3, gain: 0.07 },
    ] },
    // Overcharge: a full key's press, a sharp driven crack over the technique's own sound.
    abilityOvercharge: { bus: 'sfx', priority: 3, cooldown: 0.2, max: 1, verb: 0.3, heat: 0.4, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 4000 }, a: 0.0005, d: 0.02, gain: 0.7, drive: 3 },
      { wave: 'sawtooth', freq: 110, filter: { type: 'lowpass', freq: 600 }, a: 0.003, d: 0.25, gain: 0.35, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2400, q: 2 }, at: 0.03, a: 0.001, d: 0.05, gain: 0.3 },
    ] },
    // Strike I (batch 6). Fire Burst's opening: a soft rising rush of flame under the lotus (its close is abilityFlare).
    abilityBloom: { bus: 'sfx', priority: 2, cooldown: 0.2, max: 1, verb: 0.35, heat: 0.2, jitter: 40, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 400, to: 1200, q: 0.9 }, a: 0.2, d: 0.12, gain: 0.55 },
    ] },
    // Frost Spike: a hard ice crack, a crunching run of cracks each lower, a cold glassy shimmer.
    abilitySpikes: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.5, heat: 0.35, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 3500 }, a: 0.0005, d: 0.02, gain: 0.7, drive: 3 },
      { wave: 'sine', freq: 900, to: 500, glide: 0.5, a: 0.002, d: 0.5, gain: 0.12 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2400, to: 1200, q: 3 }, at: 0.05, a: 0.002, d: 0.06, gain: 0.4 },
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, to: 1000, q: 3 }, at: 0.17, a: 0.002, d: 0.06, gain: 0.35 },
      { noise: 'white', filter: { type: 'bandpass', freq: 1700, to: 800, q: 3 }, at: 0.3, a: 0.002, d: 0.06, gain: 0.3 },
      { wave: 'sine', freq: 2400, partials: [[1, 1, 1], [2.1, 0.4, 0.6], [3.4, 0.2, 0.4]], at: 0.1, a: 0.02, d: 0.6, gain: 0.07 },
    ] },
    // Stone Fist: a fist on stone, stone grinding as the cracks run, then a deep boom and a crash of rubble, grit falling.
    abilityFist: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 2, verb: 0.55, heat: 0.5, jitter: 30, layers: [
      { wave: 'sine', freq: 90, to: 45, a: 0.002, d: 0.15, gain: 0.7, drive: 2 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 250 }, a: 0.03, d: 0.27, gain: 0.6 },
      { wave: 'sine', freq: 50, to: 30, at: 0.3, a: 0.003, d: 0.5, gain: 1, drive: 3 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 1400, to: 500 }, at: 0.3, a: 0.005, d: 0.5, gain: 0.8 },
      { noise: 'white', filter: { type: 'highpass', freq: 2000 }, at: 0.45, a: 0.05, d: 0.45, gain: 0.15 },
    ] },
    // Rising Fang: a sharp upward slice, a crackle as the fire runs, a roaring eruption with a low thump, hissing embers.
    abilityFang: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.45, heat: 0.4, jitter: 40, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, to: 5000, q: 2 }, a: 0.002, d: 0.04, gain: 0.6 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 4 }, at: 0.04, a: 0.01, d: 0.18, gain: 0.25 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 900, to: 300 }, at: 0.25, a: 0.01, d: 0.5, gain: 0.9, drive: 2 },
      { wave: 'sine', freq: 65, to: 40, at: 0.25, a: 0.003, d: 0.25, gain: 0.8 },
      { noise: 'white', filter: { type: 'highpass', freq: 4500 }, at: 0.4, a: 0.05, d: 0.4, gain: 0.12 },
    ] },
    // Thunderclap: a huge flat metal clap with a ring, a rolling thunder rumble, a long room echo.
    abilityClap: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.85, heat: 0.55, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 1500 }, a: 0.0005, d: 0.015, gain: 0.9, drive: 5 },
      { wave: 'sine', freq: 700, partials: [[1, 1, 1], [2.3, 0.4, 0.5]], a: 0.001, d: 0.35, gain: 0.15 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 400, to: 120 }, at: 0.02, a: 0.03, h: 0.1, d: 0.7, gain: 0.9, drive: 2 },
    ] },
    // Strike II (batch 7). Sparrow Flurry: a steady rush of air under the thrusts, a sharp sting at the end; each thrust
    // its own whistle (abilityFlurryHit, told as it lands).
    abilityFlurry: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.3, heat: 0.3, jitter: 30, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 800, to: 1600, q: 1 }, a: 0.06, h: 0.75, d: 0.2, gain: 0.4 },
      { wave: 'sine', freq: 1600, at: 0.98, a: 0.002, d: 0.2, gain: 0.16 },
      { noise: 'white', filter: { type: 'highpass', freq: 3500 }, at: 0.98, a: 0.0005, d: 0.03, gain: 0.3 },
    ] },
    abilityFlurryHit: { bus: 'sfx', priority: 2, cooldown: 0.04, max: 3, verb: 0.15, heat: 0.1, jitter: 120, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 3500, q: 3 }, a: 0.003, d: 0.025, gain: 0.45 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600 }, a: 0.001, d: 0.03, gain: 0.25 },
    ] },
    // Whirl Drill: a sharp puncture, a shrieking grind held through it, a falling whine as it unwinds.
    abilityDrill: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.35, heat: 0.4, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 3000 }, a: 0.0005, d: 0.03, gain: 0.5 },
      { wave: 'sawtooth', freq: 220, fm: { ratio: 1.5, index: 2, decay: 1.4 }, filter: { type: 'bandpass', freq: 2500, q: 2 }, at: 0.15, a: 0.03, h: 1.0, d: 0.15, gain: 0.3 },
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, q: 4 }, at: 0.15, a: 0.03, h: 1.0, d: 0.15, gain: 0.2 },
      { wave: 'sine', freq: 1200, to: 400, glide: 0.3, at: 1.3, a: 0.01, d: 0.3, gain: 0.1 },
    ] },
    // Shadow Stitch: a soft wet stab into the floor, a dark breathy whoosh under the spikes; each spike's pierce its own.
    abilityStitch: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.45, heat: 0.3, jitter: 30, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: 500 }, a: 0.002, d: 0.04, gain: 0.6 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 200, to: 500, q: 1 }, at: 0.1, a: 0.1, h: 0.2, d: 0.3, gain: 0.45 },
      { wave: 'sine', freq: 600, to: 200, glide: 0.25, at: 0.65, a: 0.01, d: 0.25, gain: 0.1 },
    ] },
    abilityPierce: { bus: 'sfx', priority: 3, cooldown: 0.06, max: 3, verb: 0.35, heat: 0.3, jitter: 60, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2500, q: 2 }, a: 0.001, d: 0.03, gain: 0.55, drive: 2 },
      { wave: 'sine', freq: 80, to: 50, a: 0.002, d: 0.12, gain: 0.45 },
    ] },
    // Spinning Blade: a release swish, a whirring hum rising as it comes back, a clean catch ring.
    abilityBoomerang: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.35, heat: 0.3, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 3000, q: 1.5 }, a: 0.002, d: 0.05, gain: 0.45 },
      { wave: 'sawtooth', freq: 140, to: 210, glide: 0.8, fm: { ratio: 0.086, index: 4, decay: 0.8 }, filter: { type: 'lowpass', freq: 1200 }, at: 0.04, a: 0.1, h: 0.5, d: 0.2, gain: 0.25 },
      { wave: 'sine', freq: 1800, at: 0.38, a: 0.001, d: 0.1, gain: 0.1 },
      { wave: 'sine', freq: 990, partials: [[1, 1, 1], [2.76, 0.3, 0.5]], at: 0.8, a: 0.002, d: 0.3, gain: 0.12 },
    ] },
    // Three Shadows: three quick air snaps, a held breath, one layered slice, an ink splash.
    abilityClones: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.5, heat: 0.4, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 3000 }, a: 0.0005, d: 0.015, gain: 0.4 },
      { noise: 'white', filter: { type: 'highpass', freq: 3200 }, at: 0.03, a: 0.0005, d: 0.015, gain: 0.4 },
      { noise: 'white', filter: { type: 'highpass', freq: 3400 }, at: 0.06, a: 0.0005, d: 0.015, gain: 0.4 },
      { wave: 'sine', freq: 60, at: 0.06, a: 0.05, h: 0.12, d: 0.08, gain: 0.25 },
      { noise: 'white', filter: { type: 'bandpass', freq: 4000, q: 1.5 }, at: 0.3, a: 0.001, d: 0.04, gain: 0.6, drive: 2 },
      { wave: 'sine', freq: 1300, at: 0.3, a: 0.001, d: 0.3, gain: 0.12 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 1000 }, at: 0.32, a: 0.01, d: 0.3, gain: 0.4 },
    ] },
    // Quick Draw: the blade's scrape into the sheath, then near silence (the stance); at the draw a razor whistle
    // (abilityIaiDraw); at the split a deep cleaving slash over a low boom and a long ring (abilityIai).
    abilitySheathe: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.3, heat: 0.2, jitter: 20, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, to: 5000, q: 2 }, a: 0.02, h: 0.1, d: 0.18, gain: 0.3 },
      { wave: 'sine', freq: 2400, at: 0.28, a: 0.001, d: 0.08, gain: 0.06 },
    ] },
    abilityIaiDraw: { bus: 'sfx', priority: 3, cooldown: 0.2, max: 2, verb: 0.3, heat: 0.2, jitter: 20, layers: [
      { wave: 'sine', freq: 4000, to: 3200, glide: 0.04, a: 0.001, d: 0.04, gain: 0.15 },
      { noise: 'white', filter: { type: 'highpass', freq: 5000 }, a: 0.0005, d: 0.04, gain: 0.35 },
    ] },
    abilityIai: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.6, heat: 0.5, jitter: 20, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 600, to: 3000, q: 1.2 }, a: 0.002, d: 0.15, gain: 0.6, drive: 2 },
      { wave: 'sine', freq: 55, to: 40, a: 0.005, d: 0.4, gain: 0.6 },
      { wave: 'sine', freq: 880, partials: [[1, 1, 1], [2.76, 0.3, 0.5]], at: 0.02, a: 0.003, d: 1.0, gain: 0.12 },
    ] },
    // Dust Devil: a gritty scrape, then a short spinning whoosh that swells twice.
    abilityWhirl: { bus: 'sfx', priority: 2, cooldown: 0.2, max: 1, verb: 0.2, heat: 0.1, jitter: 50, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2000, q: 2 }, a: 0.0005, d: 0.02, gain: 0.5, drive: 2 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 400, to: 900, q: 1.2 }, a: 0.04, d: 0.14, gain: 0.45 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, to: 500, q: 1.2 }, at: 0.12, a: 0.04, d: 0.2, gain: 0.4 },
    ] },
    // An ability picked: a struck note, lower and fuller the rarer it is.
    abilityPick: { bus: 'ui', priority: 2, cooldown: 0.1, verb: 0.4, jitter: 0, heat: 0, layers: [
      { wave: 'sine', freq: 523, partials: [[1, 1, 1], [2, 0.4, 0.7], [3, 0.2, 0.5], [4.2, 0.08, 0.3]], a: 0.002, d: 1.1, gain: 0.3 },
      { wave: 'sine', freq: 784, at: 0.07, a: 0.002, d: 0.9, gain: 0.14 },
    ] },
    // The crate roll (js/crate-screen.js): a whoosh as the strip sets off, a dry click as each reward passes the mark,
    // and a deep struck landing (lower the rarer the reward).
    crateOpen: { bus: 'ui', priority: 2, cooldown: 0.2, verb: 0.3, jitter: 40, heat: 0, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 380, to: 2600, q: 1.4 }, glide: 0.5, a: 0.06, d: 0.55, gain: 0.32 },
      { wave: 'sine', freq: 140, to: 90, a: 0.004, d: 0.3, gain: 0.22 },
    ] },
    crateTick: { bus: 'ui', priority: 1, cooldown: 0.025, max: 3, verb: 0.05, jitter: 30, heat: 0, layers: [
      { wave: 'triangle', freq: 2100, to: 1500, a: 0.0005, d: 0.022, gain: 0.16 },
      { noise: 'white', filter: { type: 'highpass', freq: 3200 }, a: 0.0005, d: 0.012, gain: 0.1 },
    ] },
    crateLand: { bus: 'ui', priority: 3, cooldown: 0.3, verb: 0.55, jitter: 0, heat: 0, layers: [
      { wave: 'sine', freq: 98, to: 62, glide: 0.4, a: 0.003, d: 0.9, gain: 0.5 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 900 }, a: 0.002, d: 0.25, gain: 0.35 },
      { wave: 'sine', freq: 392, partials: [[1, 1, 1], [2.01, 0.5, 0.8], [3.02, 0.25, 0.6], [5.1, 0.1, 0.4]], at: 0.03, a: 0.002, d: 1.8, gain: 0.2 },
    ] },

    // ---- Level 5: the castle (v4.3) ----
    // The great bell tolling far off: a deep strike with inharmonic partials and a very long ring.
    bellToll: { bus: 'sfx', priority: 3, cooldown: 0.4, max: 2, verb: 0.8, heat: 0.5, jitter: 0, layers: [
      { wave: 'sine', freq: 82, partials: [[1, 1, 1], [2.0, 0.6, 0.8], [2.76, 0.45, 0.6], [5.4, 0.2, 0.35], [8.9, 0.08, 0.2]], a: 0.004, d: 6.5, gain: 0.5 },
      { wave: 'sine', freq: 41, a: 0.01, d: 5, gain: 0.35 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 900, q: 1.2 }, a: 0.001, d: 0.12, gain: 0.25 },
    ] },
    // Pass 68: a blow landing on the Bell Warden's bronze, a dull struck bell; it climbs as his resonance fills (js/audio.js).
    bronzeRing: { bus: 'sfx', priority: 2, cooldown: 0.08, max: 3, verb: 0.6, heat: 0.2, jitter: 0, layers: [
      { wave: 'sine', freq: 196, partials: [[1, 1, 1], [2.0, 0.5, 0.7], [2.76, 0.4, 0.55], [5.4, 0.15, 0.3]], a: 0.002, d: 1.8, gain: 0.32 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1400, q: 1.5 }, a: 0.001, d: 0.06, gain: 0.2 },
    ] },
    // A Toll Wisp's little bell before it shoots: bright, short, clear.
    wispToll: { bus: 'sfx', priority: 2, cooldown: 0.2, verb: 0.5, heat: 0.1, jitter: 60, layers: [
      { wave: 'sine', freq: [980, 1060], partials: [[1, 1, 1], [2.76, 0.4, 0.5], [5.4, 0.15, 0.3]], a: 0.002, d: 1.1, gain: 0.3 },
    ] },
    // The boss pulse: a low drum and drone beat that runs under a boss fight; the second phase adds the hotter one.
    bossPulse: { bus: 'sfx', priority: 1, cooldown: 0.3, max: 2, verb: 0.35, heat: 0, jitter: 0, layers: [
      { wave: 'sine', freq: 55, to: 38, a: 0.01, d: 0.9, gain: 0.45 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 220 }, a: 0.005, d: 0.5, gain: 0.35 },
      { wave: 'triangle', freq: 110, a: 0.3, d: 1.6, gain: 0.06 },
    ] },
    bossPulseHot: { bus: 'sfx', priority: 1, cooldown: 0.2, max: 2, verb: 0.4, heat: 0, jitter: 0, layers: [
      { wave: 'sine', freq: 62, to: 40, a: 0.008, d: 0.7, gain: 0.5 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 300 }, a: 0.004, d: 0.45, gain: 0.4 },
      { wave: 'sawtooth', freq: 124, filter: { type: 'lowpass', freq: 600 }, a: 0.2, d: 1.2, gain: 0.05 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 2400, q: 0.8 }, a: 0.3, d: 0.8, gain: 0.04 },
    ] },
    // Stained glass bursting.
    glassShatter: { bus: 'sfx', priority: 3, cooldown: 0.2, max: 2, verb: 0.5, heat: 0.4, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 3000 }, a: 0.001, d: 0.9, gain: 0.5 },
      { wave: 'sine', freq: [2600, 3400], partials: [[1, 1, 0.4], [1.7, 0.6, 0.3], [2.9, 0.4, 0.2]], a: 0.001, d: 0.6, gain: 0.12 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1200, q: 0.7 }, a: 0.002, d: 0.3, gain: 0.3 },
    ] },
    // A pillar breaking and falling: a crack, then a long low crash.
    stoneFall: { bus: 'sfx', priority: 3, cooldown: 0.3, max: 2, verb: 0.45, heat: 0.9, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1800, q: 0.6 }, a: 0.001, d: 0.15, gain: 0.5 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 500, to: 120 }, at: 0.35, a: 0.02, d: 1.6, gain: 1 },
      { wave: 'sine', freq: 50, to: 26, at: 0.35, a: 0.004, d: 1.3, gain: 0.8 },
    ] },
    // v7.0: thunder far off (a level's realm `lightning`) (a crack, then a long rolling rumble), and the
    // scarlet rot eating at the feet (a wet hiss under a low burn).
    thunder: { bus: 'sfx', priority: 1, cooldown: 1.5, max: 2, verb: 0.7, heat: 0.2, jitter: 300, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 2400, to: 600, q: 0.5 }, a: 0.002, d: 0.35, gain: 0.25 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 380, to: 90 }, at: 0.05, a: 0.25, h: 0.6, d: 3.4, gain: 0.9 },
      { noise: 'pink', filter: { type: 'lowpass', freq: 900, to: 160 }, at: 0.3, a: 0.4, d: 2.6, gain: 0.35 },
      { wave: 'sine', freq: 42, to: 30, at: 0.1, a: 0.3, d: 3.0, gain: 0.35 },
    ] },
    rotSizzle: { bus: 'sfx', priority: 1, cooldown: 0.4, max: 1, verb: 0.15, heat: 0.05, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: [2800, 4200], q: 1.2 }, a: 0.02, d: 0.35, gain: 0.18 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 260 }, a: 0.05, d: 0.4, gain: 0.25 },
    ] },
    // The Ember drawing a wound shut (pass 75, Aldric's `mend`): a breath of fire drawn in, swelling, a crackle, a low glow.
    emberMend: { bus: 'sfx', priority: 2, cooldown: 1.2, max: 1, verb: 0.35, heat: 0.25, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 260, to: 1500, q: 0.8 }, glide: 0.9, a: 0.85, d: 0.3, gain: 0.5 },
      { noise: 'white', filter: { type: 'bandpass', freq: [2600, 3600], q: 1.4 }, at: 0.35, a: 0.5, d: 0.25, gain: 0.1 },
      { wave: 'sine', freq: 62, to: 96, glide: 0.9, a: 0.8, d: 0.45, gain: 0.3 },
    ] },
    // The Antlered Hunger learning a move (pass 77): a short hard huff through the skull, and a mark catching like a coal.
    hungerLearn: { bus: 'sfx', priority: 2, cooldown: 0.4, max: 1, verb: 0.3, heat: 0.2, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 700, to: 260, q: 1.1 }, glide: 0.25, a: 0.02, d: 0.32, gain: 0.7 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 220 }, a: 0.01, d: 0.28, gain: 0.45 },
      { noise: 'white', filter: { type: 'bandpass', freq: [2400, 3400], q: 1.6 }, at: 0.18, a: 0.08, d: 0.35, gain: 0.08 },
    ] },
    // ... and forgetting them all on a break: the marks snuffed in one hiss, a low groan under it.
    hungerForget: { bus: 'sfx', priority: 3, cooldown: 0.8, max: 1, verb: 0.4, heat: 0.3, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 3200, to: 900, q: 0.9 }, glide: 0.6, a: 0.02, d: 0.7, gain: 0.22 },
      { wave: 'sawtooth', freq: 92, to: 58, glide: 0.8, a: 0.05, d: 0.9, gain: 0.12, filter: { type: 'lowpass', freq: 420 } },
      { noise: 'brown', filter: { type: 'lowpass', freq: 260 }, a: 0.05, d: 0.8, gain: 0.4 },
    ] },
    // Fire catching all at once: a roaring whoosh.
    fireRoar: { bus: 'sfx', priority: 3, cooldown: 0.5, max: 1, verb: 0.4, heat: 0.7, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 400, to: 1400, q: 0.6 }, a: 0.3, d: 1.8, gain: 0.8 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 300 }, a: 0.2, d: 2.2, gain: 0.6 },
      { noise: 'white', filter: { type: 'bandpass', freq: 3200, q: 1 }, a: 0.4, d: 1.2, gain: 0.12 },
    ] },
    // Stone grinding on stone: a gargoyle shifting before it springs (the ambush cue).
    stoneGrind: { bus: 'sfx', priority: 2, cooldown: 0.8, max: 2, verb: 0.3, heat: 0.2, layers: [
      { noise: 'brown', filter: { type: 'bandpass', freq: 260, q: 2 }, a: 0.08, d: 0.6, gain: 0.7, drive: 2 },
      { noise: 'white', filter: { type: 'bandpass', freq: 1600, q: 3 }, a: 0.05, d: 0.5, gain: 0.15 },
    ] },
    // The gate breaking open.
    gateBreak: { bus: 'sfx', priority: 3, cooldown: 1, max: 1, verb: 0.5, heat: 1, layers: [
      { noise: 'white', filter: { type: 'bandpass', freq: 1400, q: 0.5 }, a: 0.001, d: 0.3, gain: 0.6 },
      { noise: 'brown', filter: { type: 'lowpass', freq: 600, to: 100 }, a: 0.01, d: 2.0, gain: 1 },
      { wave: 'sine', freq: 46, to: 24, a: 0.004, d: 1.6, gain: 0.9 },
      { wave: 'sine', freq: 300, partials: [[1, 1, 1], [2.3, 0.5, 0.6]], at: 0.05, a: 0.002, d: 1.2, gain: 0.08 },
    ] },
    // Astral prisms (js/astral-prisms.js): planting a silver crystal, locking its sightline, firing the light-lance,
    // and shattering every prism in a shower of glass when a Counter lands.
    prismPlant: { bus: 'sfx', priority: 2, cooldown: 0.12, max: 3, verb: 0.5, heat: 0.15, jitter: 35, layers: [
      { wave: 'sine', freq: [1320, 1480], partials: [[1, 1, 1], [1.5, 0.55, 0.85], [2.76, 0.3, 0.55]], a: 0.003, d: 0.7, gain: 0.24 },
      { noise: 'white', filter: { type: 'bandpass', freq: 4800, q: 18 }, a: 0.002, d: 0.25, gain: 0.7 },
    ] },
    prismLock: { bus: 'sfx', priority: 3, cooldown: 0.25, max: 2, verb: 0.55, heat: 0.3, jitter: 20, layers: [
      { wave: 'sine', freq: 980, to: 1960, glide: 0.5, partials: [[1, 1, 1], [1.5, 0.5, 0.9], [2.0, 0.35, 0.7]], a: 0.04, h: 0.15, d: 0.55, gain: 0.22 },
      { noise: 'white', parallel: [{ type: 'bandpass', freq: 3600, q: 26 }, { type: 'bandpass', freq: 5400, q: 24 }], a: 0.05, d: 0.55, gain: 0.95 },
    ] },
    prismLance: { bus: 'sfx', priority: 3, cooldown: 0.15, max: 2, verb: 0.5, heat: 0.75, jitter: 30, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 3400, q: 0.7 }, a: 0.0006, d: 0.04, gain: 0.95, drive: 2.5 },
      { noise: 'white', filter: { type: 'bandpass', freq: 5200, to: 1600, q: 1.8 }, glide: 0.24, a: 0.002, d: 0.36, gain: 1.1, drive: 2 },
      { wave: 'sine', freq: 1860, to: 930, glide: 0.32, partials: [[1, 1, 1], [2.5, 0.4, 0.6], [3.8, 0.25, 0.4]], a: 0.001, d: 0.65, gain: 0.22 },
      { wave: 'sine', freq: [96, 112], to: 42, glide: 0.3, a: 0.003, d: 0.42, gain: 0.65, drive: 2 },
    ] },
    prismShatter: { bus: 'sfx', priority: 3, cooldown: 0.2, max: 2, verb: 0.5, heat: 0.45, jitter: 45, layers: [
      { noise: 'white', filter: { type: 'highpass', freq: 4500, q: 0.8 }, a: 0.0005, d: 0.08, gain: 0.9, drive: 2 },
      { wave: 'sine', freq: [2200, 2600], partials: [[1, 1, 1], [1.41, 0.6, 0.7], [2.32, 0.4, 0.5]], a: 0.001, d: 0.55, gain: 0.2 },
      { wave: 'sine', freq: [1650, 1950], partials: [[1, 1, 1], [1.73, 0.5, 0.6]], at: 0.05, a: 0.001, d: 0.5, gain: 0.16 },
      { wave: 'sine', freq: [2900, 3400], at: 0.11, a: 0.001, d: 0.4, gain: 0.12 },
    ] },

    // ---- menus ----
    uiMove: { bus: 'ui', priority: 1, cooldown: 0.04, jitter: 6, heat: 0, layers: [
      { wave: 'sine', freq: 320, to: 290, a: 0.001, d: 0.055, gain: 0.34 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1200, q: 1 }, a: 0.001, d: 0.02, gain: 0.16 },
    ] },
    uiConfirm: { bus: 'ui', priority: 2, cooldown: 0.06, verb: 0.2, jitter: 4, heat: 0, layers: [
      { wave: 'triangle', freq: 330, a: 0.002, d: 0.16, gain: 0.24 },
      { wave: 'triangle', freq: 495, at: 0.06, a: 0.002, d: 0.26, gain: 0.2 },
      { wave: 'sine', freq: 165, a: 0.002, d: 0.22, gain: 0.34 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1400, q: 1 }, a: 0.001, d: 0.02, gain: 0.14 },
    ] },
    uiBack: { bus: 'ui', priority: 2, cooldown: 0.06, verb: 0.15, jitter: 4, heat: 0, layers: [
      { wave: 'triangle', freq: 340, to: 220, a: 0.002, d: 0.15, gain: 0.22 },
      { wave: 'sine', freq: 110, a: 0.002, d: 0.17, gain: 0.32 },
    ] },
    uiAdjust: { bus: 'ui', priority: 1, cooldown: 0.03, jitter: 4, heat: 0, layers: [
      { wave: 'sine', freq: 480, to: 450, a: 0.001, d: 0.045, gain: 0.28 },
      { noise: 'pink', filter: { type: 'bandpass', freq: 1800, q: 1 }, a: 0.001, d: 0.016, gain: 0.14 },
    ] },
    pause: { bus: 'ui', priority: 2, cooldown: 0.1, verb: 0.1, heat: 0, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 420, to: 190, q: 0.8 }, a: 0.02, d: 0.24, gain: 0.3 },
      { wave: 'sine', freq: 105, to: 60, a: 0.004, d: 0.2, gain: 0.3 },
    ] },
    resume: { bus: 'ui', priority: 2, cooldown: 0.1, verb: 0.1, heat: 0, layers: [
      { noise: 'pink', filter: { type: 'bandpass', freq: 200, to: 520, q: 0.8 }, a: 0.08, d: 0.2, gain: 0.28 },
      { wave: 'sine', freq: 70, to: 120, a: 0.04, d: 0.16, gain: 0.26 },
    ] },

    // ---- footsteps: a soft, low heel and a hushed scuff. Nothing above ~1 kHz, so they sit under the mix. ----
    footL: { bus: 'foot', priority: 0, cooldown: 0.1, max: 2, velPitch: 0.1, heat: 0, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: [240, 290], to: 150, q: 0.5, bright: 0.5 }, a: 0.006, d: 0.1, gain: 0.9 },
      { wave: 'sine', freq: [92, 100], to: 58, a: 0.004, d: 0.09, gain: 0.32 },
      { noise: 'pink', filter: { type: 'lowpass', freq: [340, 390], to: 220 }, a: 0.004, d: 0.04, gain: 0.2 },
    ] },
    footR: { bus: 'foot', priority: 0, cooldown: 0.1, max: 2, velPitch: 0.1, heat: 0, layers: [
      { noise: 'brown', filter: { type: 'lowpass', freq: [270, 320], to: 160, q: 0.5, bright: 0.5 }, a: 0.006, d: 0.1, gain: 0.85 },
      { wave: 'sine', freq: [98, 108], to: 62, a: 0.004, d: 0.09, gain: 0.3 },
      { noise: 'pink', filter: { type: 'lowpass', freq: [330, 380], to: 220 }, a: 0.004, d: 0.04, gain: 0.18 },
    ] },
  },
};
