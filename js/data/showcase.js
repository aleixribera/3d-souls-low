'use strict';
// ============================================================================
// The showcase (PLAN.md "The showcase", Aleix 2026-11-14; the player's view since pass 166, docs/showcase/storyboard.md)
// ============================================================================
// A showcase played live in the engine (js/showcase.js), seen as the player sees the game (Aleix 2026-11-21: "a
// 'player view' all the time ... keep it simple"): the game's own camera behind the wanderer, its HUD, a scripted bot
// at the controls against three of Boss Rush's bosses at a late run's pace, each on its own ground. A short fade to
// black is the only cut between two fights; a small "Showcase" tag says nobody is playing; the game's name ends it.
// Everything is counted in beats of the music (`bpm`, js/showcase-music.js); a beat's `at` is the beat its first blow
// lands on.
//   fights:  who is fought from beat `from` (on a bar: a multiple of 4): a boss id, its phase, the share of that phase's
//            bar it has left, `cracks`: how many times its guard is cracked as the fight is joined (js/finisher.js), and
//            `ground`: the level whose boss room it is fought in (pass 164; read only: where that level's boss waits), or
//            'arena'. The music's chorus starts with the last fight.
//   beats:   what must happen, in order (tests/suite-showcase.js fails when one stops happening):
//     dodge    the boss's string `attack`, every blow dashed through; then `counter` (an action) in the counter window
//     deflect  the boss's string `attack`, every blow deflected (one no deflect can take is dashed); then `counter`.
//              `finisher`: that counter is the Finishing Blow (the fight's cracks and its earlier counters crack the
//              guard to CONFIG.finisher.cracks). `kill`: it ends the fight
//     ability  the number key `key` (1-4) fired, its charge full
//   fade:    s of the fade to black before a new fight (and before the title) and of the fade back in after it.
//   title:   from beat `at` (on a bar) the game's name alone on black, held to the end; the show ends at `length` beats.
//   glare:   the show's own light, kept off white (pass 164): the bloom's strength times `bloom`, its threshold at least
//            `threshold`, a screen flash times `flash`; the game's white impact frames are off.
//   skip:    the "Esc  Skip" cap from `from` s for `for` s, and again for `again` s after any other key (not on a first showing).
const SHOWCASE = {
  bpm: 128, length: 62, seed: 20261114, preroll: 1.6,
  again: 24,   // h: a launch on a version it has not played for yet plays it, at most once in this many hours (Aleix)
  pace: { won: 16, modifiers: ['quickened', 'unbroken'] },   // fight 17 of a run, with two of its modifiers
  kit: ['wind-blade', 'ash-legion'],                          // keys 1 and 4
  profile: 'maren',                                           // the bot's temperament between beats (BOT_PROFILES)
  fights: [
    { from: 0, boss: 'antlered', phase: 'gorge', health: 0.45, ground: 'night-gaol' },
    { from: 16, boss: 'vesper', phase: 'eclipse', health: 0.5, ground: 'final-castle' },
    { from: 32, boss: 'kingsBlade', phase: 'emberWorn', health: 0.5, cracks: 1, ground: 'saltgrave' },
  ],
  beats: [
    { id: 'dash', kind: 'dodge', at: 1, attack: 'frenzy', counter: 'light' },
    { id: 'windBlade', kind: 'ability', at: 9, key: 1 },
    { id: 'tempest', kind: 'deflect', at: 19, attack: 'lunarTempest', counter: 'light' },
    { id: 'legion', kind: 'ability', at: 27, key: 4 },
    { id: 'kingsCuts', kind: 'dodge', at: 35, attack: 'hungerCuts', counter: 'light' },
    { id: 'finale', kind: 'deflect', at: 44, attack: 'keepingRiver', counter: 'light', finisher: true, kill: true },
  ],
  fade: 0.35,
  title: { at: 56 },   // after the Finishing Blow's foe falls (the beat test checks it)
  glare: { bloom: 0.3, threshold: 1.5, flash: 0.25 },
  skip: { from: 0.4, for: 4, again: 2.5 },
};
