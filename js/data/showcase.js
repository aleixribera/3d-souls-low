'use strict';
// ============================================================================
// The showcase (PLAN.md "The showcase", Aleix 2026-11-14): 30 seconds of the game at its best
// ============================================================================
// A cinematic played live in the engine (js/showcase.js): a scripted bot fights three of Boss Rush's most aggressive
// bosses at a late run's pace, cameras cut on the music's beats (js/showcase-music.js), and it ends on the game's title.
// Everything is counted in beats of the music (`bpm`); a beat's `at` is the beat its first blow lands on.
//   fights:  who is fought from beat `from`: a boss id, its phase, the share of that phase's bar it has left, and
//            `cracks`: how many times its guard is cracked as the cut joins the fight (js/finisher.js).
//   beats:   what must happen, in order (tests/suite-showcase.js fails when one stops happening):
//     dodge    the boss's string `attack`, every blow dashed through; then `counter` (an action) in the counter window
//     deflect  the boss's string `attack`, every blow deflected (one no deflect can take is dashed); then `counter`.
//              `finisher`: that counter is the Finishing Blow (the fight's cracks and its earlier counters crack the
//              guard to CONFIG.finisher.cracks, each within its `fade`). `kill`: it ends the fight
//     ability  the number key `key` (1-4) fired, its charge full
//   shots:   camera framings. `at`/`look`: 0 the player, 1 the boss (between: the line joining them). `back` m behind
//            the anchor along that line, `side` m across it, `up` m over the floor; `lookUp` 0..1 of the way from the
//            player's chest to the boss's; `fov` degrees; `push` m/s toward the look point; `orbit` degrees/s round it.
//   cuts:    the shot from beat `at` (hard cuts). `keys`: the key cap drawn from a beat for `for` beats.
//   title:   the game's name from beat `at`; the show ends at `length` beats.
// The finale is a counter chain into the Finishing Blow: the King's Blade joins with one crack, the dash's counter
// makes two, and the deflect's counter is the blow that ends it: its flash steps from beat 56, its cuts open on 58,
// the boss falls by 60 and the title comes up over it.
const SHOWCASE = {
  bpm: 128, length: 64, seed: 20261114, preroll: 1.6,
  again: 24,   // h: a launch on a version it has not played for yet plays it, at most once in this many hours (Aleix)
  pace: { won: 16, modifiers: ['quickened', 'unbroken'] },   // fight 17 of a run, with two of its modifiers
  kit: ['wind-blade', 'thunder-call'],                        // keys 1 and 4; Thunder Call is the lightning dragon
  profile: 'maren',                                           // the bot's temperament between beats (BOT_PROFILES)
  fights: [
    { from: 0, boss: 'antlered', phase: 'gorge', health: 0.45 },
    { from: 20, boss: 'hollis', phase: 'hungry', health: 0.5 },
    { from: 40, boss: 'kingsBlade', phase: 'emberWorn', health: 0.5, cracks: 1 },
  ],
  beats: [
    { id: 'dash', kind: 'dodge', at: 0, attack: 'frenzy', counter: 'light' },
    { id: 'windBlade', kind: 'ability', at: 12, key: 1 },
    { id: 'deflect', kind: 'deflect', at: 23, attack: 'ravenous', counter: 'light' },
    { id: 'dragon', kind: 'ability', at: 34, key: 4 },
    { id: 'finaleDodge', kind: 'dodge', at: 43, attack: 'hungerCuts', counter: 'light' },
    { id: 'finale', kind: 'deflect', at: 50, attack: 'keepingRiver', counter: 'light', finisher: true, kill: true },
  ],
  shots: {
    over: { at: 0, back: 3.4, side: 1.25, up: 2.1, look: 0.75, lookUp: 0.6, fov: 50, push: 0.25 },
    low: { at: 0.5, back: 1.2, side: -5.2, up: 0.55, look: 0.6, lookUp: 0.75, fov: 44, orbit: 5 },
    wide: { at: 0.5, back: 0, side: 9.5, up: 3.4, look: 0.5, lookUp: 0.45, fov: 38, orbit: -6 },
    face: { at: 0, back: 2.2, side: -0.9, up: 1.45, look: 1, lookUp: 0.85, fov: 30, push: 0.35 },
    behind: { at: 0, back: 5.2, side: -1.6, up: 2.6, look: 0.9, lookUp: 0.5, fov: 46, push: 0.6 },
    crane: { at: 0.5, back: 6, side: 4.5, up: 7.5, look: 0.5, lookUp: 0.3, fov: 44, orbit: 7 },
    fallen: { at: 1, back: -5.5, side: 2.4, up: 1.1, look: 0.55, lookUp: 0.35, fov: 36, push: 0.3 },
  },
  cuts: [
    { at: 0, shot: 'over' }, { at: 3, shot: 'low' }, { at: 6, shot: 'wide' }, { at: 11, shot: 'behind' }, { at: 15, shot: 'crane' },
    { at: 20, shot: 'face' }, { at: 22, shot: 'over' }, { at: 25, shot: 'low' }, { at: 28, shot: 'wide' }, { at: 32, shot: 'behind' }, { at: 34, shot: 'crane' },
    { at: 40, shot: 'face' }, { at: 42, shot: 'low' }, { at: 45, shot: 'over' }, { at: 48, shot: 'face' }, { at: 51, shot: 'low' },
    { at: 56, shot: 'crane' }, { at: 58, shot: 'face' }, { at: 60, shot: 'fallen' },
  ],
  keys: [{ at: 12, key: 1, for: 3 }, { at: 34, key: 4, for: 3 }],
  title: { at: 60 },   // after the Finishing Blow's foe falls (the beat test checks it)
};
