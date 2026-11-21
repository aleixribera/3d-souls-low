'use strict';
// ============================================================================
// The showcase (PLAN.md "The showcase", Aleix 2026-11-14; an anime opening since pass 160, docs/showcase/storyboard.md)
// ============================================================================
// A cinematic played live in the engine (js/showcase.js): a scripted bot fights four of Boss Rush's bosses at a late
// run's pace, cameras cut on the music's beats (js/showcase-music.js), each boss gets a freeze-frame name card in ink,
// an ultimate is the climax and the game's title slams in over the last foe.
// Everything is counted in beats of the music (`bpm`), on the show's clock; a beat's `at` is the beat its first blow lands on.
//   fights:  who is fought from beat `from`: a boss id, its phase, the share of that phase's bar it has left,
//            `cracks`: how many times its guard is cracked as the cut joins the fight (js/finisher.js), and `ink`: the
//            accent colour of its name card.
//   beats:   what must happen, in order (tests/suite-showcase.js fails when one stops happening):
//     dodge    the boss's string `attack`, every blow dashed through; then `counter` (an action) in the counter window
//     deflect  the boss's string `attack`, every blow deflected (one no deflect can take is dashed); then `counter`.
//              `finisher`: that counter is the Finishing Blow (the fight's cracks and its earlier counters crack the
//              guard to CONFIG.finisher.cracks). `kill`: it ends the fight
//     ability  the number key `key` (1-4) fired, its charge full
//   freezes: the game held still from beat `at` for `for` beats while the camera and the ink overlay go on: the frame
//            drops to ink and the fight's `ink`, speed lines close in and `card` slams in: 'boss' (the fight's boss's
//            name) or 'title' (the game's name; the title's freeze runs to the end). No beat lands inside one.
//   impacts: beats on which one white ink frame is drawn (the climax and the title; never two within 3 s).
//   shots:   camera framings (a card's: `fit`, below). `at`/`look`: 0 the player, 1 the boss (between: the line joining them). `back` m behind
//            the anchor along that line, `side` m across it, `up` m over the floor; `lookUp` 0..1 of the way from the
//            player's chest to the boss's; `fov` degrees; `push` m/s toward the look point; `orbit` degrees/s round it.
//   cuts:    the shot from beat `at` (hard cuts). `keys`: the key cap drawn from a beat for `for` beats.
//   bars:    the cold open's letterbox, open from beat `bars`.
//   title:   the game's name from beat `at`; the show ends at `length` beats.
//   skip:    the "Esc  Skip" cap from `from` s for `for` s, and again for `again` s after any other key (not on a first showing).
const SHOWCASE = {
  bpm: 128, length: 64, seed: 20261114, preroll: 1.6,
  again: 24,   // h: a launch on a version it has not played for yet plays it, at most once in this many hours (Aleix)
  pace: { won: 16, modifiers: ['quickened', 'unbroken'] },   // fight 17 of a run, with two of its modifiers
  kit: ['wind-blade', 'ash-legion'],                          // keys 1 and 4; Ash Legion is the climax
  profile: 'maren',                                           // the bot's temperament between beats (BOT_PROFILES)
  fights: [
    { from: 0, boss: 'antlered', phase: 'gorge', health: 0.45, ink: '#e2b04a' },
    { from: 12, boss: 'vesper', phase: 'eclipse', health: 0.5, ink: '#9a7cf0' },
    { from: 24, boss: 'giant', phase: 'gathered', health: 0.5, ink: '#ee7a3a' },
    { from: 32, boss: 'kingsBlade', phase: 'emberWorn', health: 0.5, cracks: 1, ink: '#e0463a' },
  ],
  beats: [
    { id: 'dash', kind: 'dodge', at: 0, attack: 'frenzy', counter: 'light' },
    { id: 'windBlade', kind: 'ability', at: 8, key: 1 },
    { id: 'tempest', kind: 'deflect', at: 14, attack: 'lunarTempest', counter: 'light' },
    { id: 'giantClaw', kind: 'deflect', at: 29, attack: 'giantClaw', counter: 'light' },
    { id: 'kingsCuts', kind: 'dodge', at: 36, attack: 'hungerCuts', counter: 'light' },
    { id: 'legion', kind: 'ability', at: 40, key: 4 },
    { id: 'finale', kind: 'deflect', at: 50, attack: 'keepingRiver', counter: 'light', finisher: true, kill: true },
  ],
  freezes: [
    { at: 4, for: 2, card: 'boss', shot: 'hero' },
    { at: 14.1, for: 1.9, card: 'boss', shot: 'spark' },
    { at: 24, for: 2, card: 'boss', shot: 'tall' },
    { at: 32, for: 2, card: 'boss', shot: 'hero' },
    { at: 60, for: 4, card: 'title', shot: 'victor' },
  ],
  impacts: [40, 60],
  bars: 4,
  shots: {
    over: { at: 0, back: 3.4, side: 1.25, up: 2.1, look: 0.75, lookUp: 0.6, fov: 50, push: 0.25 },
    low: { at: 0.5, back: 1.2, side: -5.2, up: 0.55, look: 0.6, lookUp: 0.75, fov: 44, orbit: 5 },
    wide: { at: 0.5, back: 0, side: 9.5, up: 3.4, look: 0.5, lookUp: 0.45, fov: 38, orbit: -6 },
    face: { at: 0, back: 2.2, side: -0.9, up: 1.45, look: 1, lookUp: 0.85, fov: 30, push: 0.35 },
    behind: { at: 0, back: 5.2, side: -1.6, up: 2.6, look: 0.9, lookUp: 0.5, fov: 46, push: 0.6 },
    crane: { at: 0.5, back: 6, side: 4.5, up: 7.5, look: 0.5, lookUp: 0.3, fov: 44, orbit: 7 },
    fallen: { at: 1, back: -5.5, side: 2.4, up: 1.1, look: 0.55, lookUp: 0.35, fov: 36, push: 0.3 },
    // The cards' framings (`fit`): one body filling `fit` of the frame's height, seen from `turn` degrees off the line to
    // the other, from `up` of its height, looking at `lookUp` of it (so it stands above the card's slab).
    hero: { fit: 0.62, on: 'boss', turn: 72, up: 0.22, lookUp: 0.34, fov: 34, push: 0.6 },
    tall: { fit: 0.5, on: 'boss', turn: 72, up: 0.3, lookUp: 0.42, fov: 34, push: 0.4 },   // a boss that stoops toward the lens
    spark: { fit: 0.5, on: 'boss', turn: 70, up: 0.4, lookUp: 0.36, fov: 32, push: 0.5 },
    victor: { fit: 0.55, on: 'player', turn: 150, up: 0.15, lookUp: 0.4, fov: 30, push: 0.3 },
  },
  cuts: [
    { at: 0, shot: 'face' }, { at: 1.5, shot: 'low' }, { at: 3, shot: 'over' }, { at: 4, shot: 'hero' }, { at: 6, shot: 'behind' },
    { at: 8, shot: 'crane' }, { at: 10, shot: 'wide' },
    { at: 12, shot: 'face' }, { at: 14.1, shot: 'spark' }, { at: 16, shot: 'over' }, { at: 18, shot: 'low' }, { at: 20, shot: 'wide' }, { at: 22, shot: 'behind' },
    { at: 24, shot: 'tall' }, { at: 26, shot: 'crane' }, { at: 27, shot: 'wide' }, { at: 29, shot: 'low' }, { at: 31, shot: 'over' },
    { at: 32, shot: 'hero' }, { at: 34, shot: 'over' }, { at: 36, shot: 'low' }, { at: 37, shot: 'behind' }, { at: 38, shot: 'face' }, { at: 39, shot: 'wide' },
    { at: 40, shot: 'behind' }, { at: 42, shot: 'over' }, { at: 44, shot: 'low' }, { at: 46, shot: 'face' }, { at: 48, shot: 'over' }, { at: 51, shot: 'low' },
    { at: 56, shot: 'crane' }, { at: 58, shot: 'fallen' }, { at: 60, shot: 'victor' },
  ],
  keys: [{ at: 8, key: 1, for: 2 }, { at: 40, key: 4, for: 3 }],
  title: { at: 60 },   // after the Finishing Blow's foe falls (the beat test checks it)
  skip: { from: 0.4, for: 4, again: 2.5 },
};
