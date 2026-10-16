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
