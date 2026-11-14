'use strict';
// The sparring scene (pass 97, PLAN.md item 3d): the new combat, played, never watched. In a small ring a pale figure
// (the teacher: a Player body whose presses come from the script below) shows each move with its key over it, then the
// player does it against the sparring partner (an enemy that swings only when the drill calls for it). js/sparring.js
// runs it; the level is js/levels/sparring.js. It teaches nothing about meters: there are none to learn.
//
// The partner: an Undead Knight's figure (never mistaken for the player), rooted, never dies; its one blow is slow, told and can be deflected
// (its last blow, so a deflect opens a counter). It swings only when js/sparring.js begins it (`restTime` keeps it
// still otherwise).
const SPARRING_PARTNER = { id: 'sparringPartner', name: 'Sparring Partner', model: 'undeadKnight', scale: 1.0, bulk: 1.0, radius: 0.42,
  color: 0x6f7682, weapon: 'sword', visual: { skin: 0x9a9286, roughness: 0.85 }, hp: 300, poise: Infinity, flinchTime: 0,
  parriedTime: 1.2, restTime: 9999,
  attacks: [
    { id: 'sparSwing', name: 'Sparring Swing', anim: 'sweep', hits: [{ startup: 0.9, active: 0.14 }], recovery: 0.7,
      damage: 5, poise: 10, knock: 1.5, lunge: 0, range: 2.8, box: { w: 1.4, h: 2.4, d: 2.4, fwd: 1.3, y: 1.2 } },
  ] };

// Each drill: its `name` and the `keys` the card draws (action ids, 'move' for the movement keys), the teacher's
// `demo` (s from the drill's start: `press` an action, `move` toward 'left' / 'right' / 'forward' / null relative to
// facing the partner, `swing` (the partner swings at the teacher); it lasts `time` s), whether the partner swings at the
// player while they try (`swings`), and how it is done: `on(type, d, t, g)` an event, or `check(g, t)` polled each step
// (`t`: the drill's scratch, { from } the last counter window's cause). `setup(p)`: the player's body made ready.
const SPARRING_SWING = SPARRING_PARTNER.attacks[0].hits[0].startup;   // the teacher's timing hangs on the partner's tell
const sparBy = (d, g) => d.player === g.player || d.attacker === g.player || d.body === g.player;
const SPARRING_DRILLS = [
  { id: 'dash', name: 'Dash', keys: ['roll'], swings: false,
    demo: { time: 1.6, steps: [{ at: 0.3, move: 'left' }, { at: 0.35, press: 'roll' }, { at: 0.8, move: null }] },
    check: g => g.player.state === PS.ROLL },
  { id: 'dodge', name: 'Perfect dodge', keys: ['roll'], swings: true,
    demo: { time: SPARRING_SWING + 1.2, steps: [{ at: 0.2, swing: true }, { at: 0.15 + SPARRING_SWING, move: 'left' }, { at: 0.17 + SPARRING_SWING, press: 'roll' }, { at: 0.6 + SPARRING_SWING, move: null }] },
    on: (type, d, t, g) => type === 'dodge' && d.player === g.player && !d.projectile },
  { id: 'counter', name: 'Counter', keys: ['roll', 'light'], swings: true,
    demo: { time: SPARRING_SWING + 1.6, steps: [{ at: 0.2, swing: true }, { at: 0.15 + SPARRING_SWING, move: 'left' }, { at: 0.17 + SPARRING_SWING, press: 'roll' },
      { at: 0.45 + SPARRING_SWING, move: null }, { at: 0.5 + SPARRING_SWING, press: 'light' }] },
    on: (type, d, t, g) => type === 'strike' && d.attacker === g.player && !!d.strike.riposte && t.from === 'dodge' },
  { id: 'string', name: 'String', keys: ['light', 'light', 'light', 'light'], swings: false,
    demo: { time: 2.6, steps: [{ at: 0.2, press: 'light' }, { at: 0.65, press: 'light' }, { at: 1.1, press: 'light' }, { at: 1.6, press: 'light' }] },
    check: g => g.player.state === PS.ATTACK && !!g.player.attack && g.player.attack.id === 'light4' },
  { id: 'finisher', name: 'Finisher', keys: ['light', 'light', 'heavy'], swings: false,
    demo: { time: 2.4, steps: [{ at: 0.2, press: 'light' }, { at: 0.65, press: 'light' }, { at: 1.1, press: 'heavy' }] },
    check: g => g.player.state === PS.ATTACK && !!g.player.attack && /^finisher/.test(g.player.attack.id) },
  { id: 'deflect', name: 'Deflect', keys: ['block'], swings: true,
    demo: { time: SPARRING_SWING + 1.2, steps: [{ at: 0.2, swing: true }, { at: 0.12 + SPARRING_SWING, press: 'block' }] },
    on: (type, d, t, g) => type === 'parry' && sparBy(d, g) },
  { id: 'riposte', name: 'Riposte', keys: ['block', 'light'], swings: true,
    demo: { time: SPARRING_SWING + 1.6, steps: [{ at: 0.2, swing: true }, { at: 0.12 + SPARRING_SWING, press: 'block' }, { at: 0.5 + SPARRING_SWING, press: 'light' }] },
    on: (type, d, t, g) => type === 'strike' && d.attacker === g.player && !!d.strike.riposte && t.from === 'deflect' },
  { id: 'ability', name: 'Abilities', keys: ['ability1', 'ability2', 'ability3', 'ability4'], swings: false, ability: 'wind-blade',
    demo: { time: 2.2, steps: [{ at: 0.4, press: 'ability1' }] },
    on: (type, d, t, g) => type === 'abilityPress' && d.body === g.player },
  { id: 'flask', name: 'Drink on the move', keys: ['flask', 'move'], swings: false, hurt: 0.55,
    demo: { time: 2.4, steps: [{ at: 0.2, move: 'right' }, { at: 0.35, press: 'flask' }, { at: 1.7, move: null }] },
    check: (g, t) => {
      const p = g.player;
      if (p.state === PS.USE_ITEM && Math.hypot(p.vx, p.vz) > 1) t.moved = true;
      return !!t.moved && p.state !== PS.USE_ITEM;
    } },
];
