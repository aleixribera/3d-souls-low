'use strict';
// ============================================================================
// The showcase (PLAN.md "The showcase", Aleix 2026-11-14; an anime opening since pass 160, docs/showcase/storyboard.md)
// ============================================================================
// A cinematic played live in the engine (js/showcase.js): a scripted bot fights four of Boss Rush's bosses at a late
// run's pace, each on its own ground, cameras cut on the music's beats (js/showcase-music.js), each boss gets a
// freeze-frame name card in ink, an ultimate is the climax and the game's logo slams in on its own beat.
// Everything is counted in beats of the music (`bpm`), on the show's clock; a beat's `at` is the beat its first blow lands on.
//   fights:  who is fought from beat `from`: a boss id, its phase, the share of that phase's bar it has left,
//            `cracks`: how many times its guard is cracked as the cut joins the fight (js/finisher.js), `ink`: the
//            accent colour of its name card, and `ground`: the level whose boss room it is fought in (pass 164; read
//            only: where that level's boss waits), or 'arena'.
//   beats:   what must happen, in order (tests/suite-showcase.js fails when one stops happening):
//     dodge    the boss's string `attack`, every blow dashed through; then `counter` (an action) in the counter window
//     deflect  the boss's string `attack`, every blow deflected (one no deflect can take is dashed); then `counter`.
//              `finisher`: that counter is the Finishing Blow (the fight's cracks and its earlier counters crack the
//              guard to CONFIG.finisher.cracks). `kill`: it ends the fight
//     ability  the number key `key` (1-4) fired, its charge full
//   freezes: the game held still from beat `at` for `for` beats while the camera and the ink overlay go on: the frame
//            drops to ink and the fight's `ink`, speed lines close in and `card` slams in: 'boss' (the fight's boss's
//            name) or 'title' (the title's freeze runs to the end). No beat lands inside one.
//   ramps:   slow motion (pass 164): the game runs at `speed` (0..1) from beat `at` for `for` beats while the camera and
//            the music run on; it snaps back to full speed on the ramp's last beat (a hit lands there).
//   impacts: beats on which one ink impact frame is drawn: the picture dropped to dark ink and the fight's colour for a few
//            frames, never white (the climax; never two within 3 s).
//   words:   kinetic type (pass 164): from beat `at` for `for` beats a field of `ink` over the whole frame, `text` slammed
//            across it edge to edge. A new fight's ground is built under one. Each held 1/3 s at least, 1/3 s apart.
//   shots:   camera framings. A line shot: `at`/`look` 0 the player, 1 the boss (between: the line joining them), `back` m
//            behind the anchor along that line, `side` m across it, `up` m over the floor, `lookUp` 0..1 of the way from
//            the player's chest to the boss's, `push` m/s toward the look point, `orbit` degrees/s round it.
//            A body shot (`fit`): one body (`on`) filling `fit` of the frame's height, from `turn` degrees off the line
//            to the other, from `up` of its height, looking at `lookUp` of it.
//            A close-up (`part`): a bone of `on` ('head', 'chest', 'weapon', 'tip') from `dist` m, `turn` degrees off
//            the line, `rise` m over it, aimed `aim` m above it, dollied in by `push` m/s.
//            Any: `fov` degrees; `zoom`: a crash zoom from that many times the fov; `roll`: a Dutch angle (degrees),
//            turning by `spin` degrees/s; `whip`: it arrives in a whip pan from that many degrees off.
//   cuts:    the shot from beat `at` (hard cuts). No key cap or other HUD is drawn (pass 164: the judge's giveaway).
//   bars:    the cold open's letterbox, open from beat `bars`.
//   title:   the game's own beat (pass 164): from `dark` the action is cut away to an empty ink frame (half a beat of black
//            and silence), at `at` the logo slams in on that frame alone, held to the end; the show ends at `length` beats.
//   glare:   the show's own light, kept off white (the judge's note, pass 164): the bloom's strength times `bloom`, its
//            threshold at least `threshold`, a screen flash times `flash`; the game's white impact frames are off.
//   skip:    the "Esc  Skip" cap from `from` s for `for` s, and again for `again` s after any other key (not on a first showing).
const SHOWCASE = {
  bpm: 128, length: 64, seed: 20261114, preroll: 1.6,
  again: 24,   // h: a launch on a version it has not played for yet plays it, at most once in this many hours (Aleix)
  pace: { won: 16, modifiers: ['quickened', 'unbroken'] },   // fight 17 of a run, with two of its modifiers
  kit: ['wind-blade', 'ash-legion'],                          // keys 1 and 4; Ash Legion is the climax
  profile: 'maren',                                           // the bot's temperament between beats (BOT_PROFILES)
  fights: [
    { from: 0, boss: 'antlered', phase: 'gorge', health: 0.45, ink: '#e2b04a', ground: 'night-gaol' },
    { from: 12, boss: 'vesper', phase: 'eclipse', health: 0.5, ink: '#9a7cf0', ground: 'final-castle' },
    { from: 24, boss: 'giant', phase: 'gathered', health: 0.5, ink: '#ee7a3a', ground: 'ember-root' },
    { from: 32, boss: 'kingsBlade', phase: 'emberWorn', health: 0.5, cracks: 1, ink: '#e0463a', ground: 'saltgrave' },
  ],
  beats: [
    { id: 'dash', kind: 'dodge', at: 0, attack: 'frenzy', counter: 'light' },
    { id: 'tempest', kind: 'deflect', at: 14, attack: 'lunarTempest', counter: 'light' },
    { id: 'windBlade', kind: 'ability', at: 20, key: 1 },   // not in the cold open's fight: its slowed frenzy runs to beat 11
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
  ramps: [
    { at: 0, for: 1.5, speed: 0.3 },     // the cold open: the Hunger's frenzy crawling in
    { at: 2.5, for: 1, speed: 0.35 },    // the low hero shot, snapping back on the dash
    { at: 28, for: 1, speed: 0.3 },      // into the Giant's claw, deflected on the snap
    { at: 49, for: 1, speed: 0.3 },      // into the King's Blade's last blow, the Finishing Blow's deflect
  ],
  impacts: [40],
  words: [
    { at: 11.25, for: 0.75, text: 'Dash', ink: '#e2b04a' },
    { at: 23.25, for: 0.75, text: 'Counter', ink: '#ee7a3a' },
    { at: 31.25, for: 0.75, text: 'Finish', ink: '#e0463a' },
  ],
  bars: 4,
  shots: {
    over: { at: 0, back: 2.6, side: 1.1, up: 1.8, look: 0.8, lookUp: 0.65, fov: 46, push: 0.35, roll: 3 },
    low: { at: 0.5, back: 1, side: -3.6, up: 0.4, look: 0.6, lookUp: 0.8, fov: 42, orbit: 14, roll: -6 },
    wide: { at: 0.6, back: 0, side: 6.5, up: 1.2, look: 0.5, lookUp: 0.55, fov: 40, orbit: -10 },
    behind: { at: 0, back: 3.2, side: -1.2, up: 1.5, look: 0.9, lookUp: 0.6, fov: 44, push: 0.8, roll: -4 },
    legion: { at: 0, back: 4.2, side: -0.8, up: 0.55, look: 0.85, lookUp: 0.75, fov: 52, push: 1.2, roll: 6 },
    fallen: { at: 1, back: -4.5, side: 2, up: 0.9, look: 0.55, lookUp: 0.35, fov: 36, push: 0.3 },
    // Body shots: the cards' framings, and the low hero angles.
    hero: { fit: 0.62, on: 'boss', turn: 72, up: 0.22, lookUp: 0.34, fov: 34, push: 0.6 },
    tall: { fit: 0.5, on: 'boss', turn: 72, up: 0.3, lookUp: 0.42, fov: 34, push: 0.4 },   // a boss that stoops toward the lens
    spark: { fit: 0.5, on: 'boss', turn: 70, up: 0.4, lookUp: 0.36, fov: 32, push: 0.5 },
    victor: { fit: 0.55, on: 'player', turn: 150, up: 0.15, lookUp: 0.4, fov: 30, push: 0.3 },
    heroLow: { fit: 0.8, on: 'player', turn: 158, up: 0.06, lookUp: 0.62, fov: 44, push: 0.5, roll: -7 },
    bossLow: { fit: 0.85, on: 'boss', turn: 30, up: 0.05, lookUp: 0.5, fov: 40, push: 0.6, roll: 8, zoom: 1.35 },
    // Close-ups.
    eyes: { part: 'head', on: 'boss', dist: 2.6, turn: 22, rise: 0.05, fov: 26, push: 0.35, roll: -9, spin: 3 },
    eyesWhip: { part: 'head', on: 'boss', dist: 2.2, turn: -26, rise: 0.1, fov: 26, push: 0.2, zoom: 1.5, whip: 70, roll: 6 },
    blade: { part: 'weapon', on: 'player', dist: 1.0, turn: 105, rise: -0.25, aim: 0.1, fov: 34, push: 0.2, zoom: 1.7, roll: 12 },
    helm: { part: 'head', on: 'player', dist: 1.1, turn: 150, rise: 0.05, fov: 30, push: 0.15, roll: 5 },
    face: { part: 'head', on: 'player', dist: 1.9, turn: 40, rise: 0.25, aim: 0.05, fov: 30, push: 0.25, roll: -8, zoom: 1.3 },   // the hero face on
    cast: { part: 'chest', on: 'player', dist: 2.3, turn: 125, rise: -0.7, aim: 0.2, fov: 42, push: 0.5, roll: 9, zoom: 1.4 },
  },
  cuts: [
    { at: 0, shot: 'eyes' }, { at: 1.5, shot: 'blade' }, { at: 2.5, shot: 'heroLow' }, { at: 3.25, shot: 'eyesWhip' },
    { at: 4, shot: 'hero' }, { at: 6, shot: 'behind' }, { at: 7, shot: 'low' }, { at: 8, shot: 'over' }, { at: 8.75, shot: 'bossLow' },
    { at: 10, shot: 'helm' }, { at: 10.5, shot: 'heroLow' },
    { at: 12, shot: 'eyes' }, { at: 13, shot: 'over' }, { at: 14.1, shot: 'spark' }, { at: 16, shot: 'heroLow' }, { at: 17, shot: 'low' },
    { at: 18, shot: 'behind' }, { at: 19, shot: 'helm' }, { at: 20, shot: 'cast' }, { at: 21, shot: 'bossLow' }, { at: 22, shot: 'eyesWhip' }, { at: 23, shot: 'heroLow' },
    { at: 24, shot: 'tall' }, { at: 26, shot: 'heroLow' }, { at: 27, shot: 'behind' }, { at: 28, shot: 'blade' }, { at: 29, shot: 'bossLow' },
    { at: 30, shot: 'low' }, { at: 31, shot: 'eyes' },
    { at: 32, shot: 'hero' }, { at: 34, shot: 'eyes' }, { at: 36, shot: 'heroLow' }, { at: 37, shot: 'blade' }, { at: 38, shot: 'eyesWhip' },
    { at: 39, shot: 'face' },
    { at: 40, shot: 'cast' }, { at: 41, shot: 'legion' }, { at: 43, shot: 'face' }, { at: 44, shot: 'bossLow' }, { at: 46, shot: 'helm' },
    { at: 47, shot: 'heroLow' }, { at: 49, shot: 'bossLow' }, { at: 50, shot: 'eyesWhip' }, { at: 51, shot: 'low' },
    { at: 53, shot: 'heroLow' }, { at: 55, shot: 'behind' }, { at: 58, shot: 'fallen' }, { at: 60, shot: 'victor' },
  ],
  title: { at: 60, dark: 59.5 },   // after the Finishing Blow's foe falls (the beat test checks it)
  glare: { bloom: 0.3, threshold: 1.5, flash: 0.25 },
  skip: { from: 0.4, for: 4, again: 2.5 },
};
