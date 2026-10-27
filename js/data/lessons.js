'use strict';
// Lessons (v7.19.0): the controls, taught where a level first needs them. They replaced the Training Hall.
// js/lessons.js shows them, one card at a time, and never stops the game; a level opts in with
// `lessons: [{ lesson, when }]` (see LESSON_TRIGGERS below). Each lesson:
//   title          the card's heading
//   keys           what to press, drawn as keycaps: action ids of ACTIONS ('light'), or 'move' / 'camera'; or
//                  { action, key }: on a keyboard only that key is drawn (when it is still bound), no mouse button
//   text()         one short line (the bindings show on the keycaps, so it never names a key)
//   on(type, d, t, g)  an event that completes it (return true); check(g, t) is polled each step instead or as well.
//                  `t` is the card's own scratch: { flags, dist } (dist: metres walked since it showed).
//   urgent         shown at once over a calmer card (that one waits its turn again)
// A card is done by doing its move while it shows. Learned lessons are kept per player (CONFIG.lessons.storageKey).
const lessonBy = (d, g) => d.attacker === g.player || d.player === g.player;
const LESSONS = {
  move: { title: 'MOVE', keys: ['move', 'camera'],
    text: () => usingPad() ? 'Walk with the left stick. Turn the view with the right.' : 'Walk, and turn the view with the mouse. Click the view to capture it.',
    check: (g, t) => t.dist >= 5 },
  roll: { title: 'ROLL', keys: ['roll'], text: () => 'Roll to slip out of harm. It costs stamina, the green bar.',
    check: g => g.player.state === PS.ROLL },
  jump: { title: 'JUMP', keys: ['jump'], text: () => 'Jump over low rubble, or onto a foe.',
    check: g => g.player.state === PS.JUMP },
  lock: { title: 'LOCK ON', keys: ['lock'], text: () => 'Fix your eyes on the foe ahead. Lock on again to let go.',
    on: type => type === 'lock', check: g => !!g.lock },   // already locked on (while another card showed): done
  // Done on a swing, hit or miss: the first thing to know is how to strike at all.
  light: { title: 'ATTACK', keys: ['light'], text: () => 'Swing your sword. Each blow spends a little stamina, the green bar.',
    check: g => g.player.state === PS.ATTACK && !!g.player.attack && /^light/.test(g.player.attack.id) },
  // The shield, shown as the first red-glinting blow winds up (urgent: the blow is coming). Done on a blow taken on it,
  // or parried.
  block: { title: 'BLOCK', keys: [{ action: 'block', key: 'KeyL' }], urgent: true,
    text: () => 'Hold to raise your shield and take the blow on it. A red glint means it can be blocked.',
    on: (type, d, t, g) => type === 'strike' && d.target === g.player && d.blocked || type === 'parry' && lessonBy(d, g) },
  // Done on a fully charged heavy that lands; a lighter one says how.
  heavy: { title: 'HEAVY ATTACK', keys: ['heavy'], text: () => 'Hold until the blade glows, then let go. Slow, but it breaks guards.',
    on: (type, d, t, g) => {
      if (type !== 'strike' || !lessonBy(d, g) || d.strike.attackId !== 'heavy') return false;
      if (d.strike.charge >= 1 - 1e-6) return true;
      t.hint = 'Hold it longer: let go once the blade glows';
      return false;
    } },
  jumpAttack: { title: 'JUMP ATTACK', keys: ['jump', 'heavy'], text: () => 'Jump at a foe, then strike in the air to come down on it.',
    on: (type, d, t, g) => type === 'strike' && lessonBy(d, g) && !!d.strike.air },
  flask: { title: 'HEAL', keys: ['flask'], urgent: true, text: () => 'Drink from your flask. Bonfires fill it again.',
    on: (type, d, t, g) => type === 'itemUsed' && d.item === 'flask' && d.player === g.player },
  stance: { title: 'BREAK ITS STANCE', keys: ['heavy'], text: () => 'Armoured foes shrug off light blows. Heavy ones bring them to their knees.',
    on: type => type === 'postureBreak' || type === 'executionEnd' },
  execute: { title: 'EXECUTE', keys: ['light'], urgent: true, text: () => 'It kneels. Step close to its front and strike to finish it.',
    on: (type, d, t, g) => type === 'executionEnd' && d.player === g.player },
  parry: { title: 'PARRY', keys: ['parry'], text: () => 'Parry a red glint just before it lands, then strike while it reels.',
    on: (type, d, t, g) => type === 'parry' && lessonBy(d, g) },
  rest: { title: 'BONFIRE', keys: ['rest'], arrow: true,
    text: () => 'Rest to heal and refill your flasks. You return here if you fall, and foes you beat stay down.',
    on: type => type === 'rest' },
  switch: { title: 'SWITCH TARGET', keys: ['switchTarget'], urgent: true, text: () => 'More than one foe. Move your lock to the other.',
    on: type => type === 'switchTarget' },
  // Done on one roll through a blow. A swing that ends without one says why: rolled too early (its invulnerability over
  // before the blow), too late (hit without having rolled), or not into it at all. Polled, so it works online too.
  dodge: { title: 'ROLL INTO IT', keys: ['roll'], urgent: true, text: () => 'Roll into the blow as it falls, not away: you pass through untouched.',
    on: (type, d, t, g) => {
      if (type === 'strike' && d.target === g.player && !d.blocked && t.flags.swing) t.flags.swing.hit = t.flags.swing.rolled ? 'Too early: roll as it falls' : 'Too late: roll sooner';
      return type === 'dodge' && d.player === g.player && !d.projectile;
    },
    check: (g, t) => {
      const e = g.lock || g.enemies.find(e => e.alive() && Math.hypot(e.x - g.player.x, e.z - g.player.z) < 8), s = t.flags.swing;
      if (!e) return false;
      if (!s && e.state === ES.WINDUP) t.flags.swing = { enemy: e, rolled: false, hit: null };
      else if (s && g.player.state === PS.ROLL && (e.state === ES.WINDUP || e.state === ES.ACTIVE)) s.rolled = true;
      else if (s && s.enemy === e && e.state !== ES.WINDUP && e.state !== ES.ACTIVE) {
        if (s.hit || s.rolled) t.hint = s.hit || 'Roll into the blow';
        t.flags.swing = null;
      }
      return false;
    } },
  // Level 2: the first raised shield.
  shield: { title: 'SHIELDS', keys: ['heavy'], text: () => 'A raised shield turns light blows. Heavy attacks batter its guard down, or go round it.',
    on: type => type === 'postureBreak' },
  // Level 3: the first blue glint.
  blue: { title: 'BLUE GLINT', keys: ['roll'], urgent: true, text: () => 'Blue cannot be parried or blocked. Roll through it.',
    on: (type, d, t, g) => type === 'dodge' && d.player === g.player },
};
// When a level's lesson shows (`when`, exactly one of these):
//   { x }                      the player has walked past x (hall levels run along +x)
//   { zone: id }               the player is in that gated zone's fight (its foes are out)
//   { near: bonfire id }       within CONFIG.lessons.nearRange of that bonfire
//   { enemy: def id }          a living foe of that kind within CONFIG.lessons.seeRange
//   { glint: 'red' | 'blue' }  a foe within CONFIG.lessons.seeRange winds up an attack of that colour
//   { kneel: true }            a foe within reach kneels, open to an execution
//   { group: n }               locked on, with n or more foes in sight
//   { hurt: fraction }         health below that fraction of the bar, with a flask left
//   { after: lesson id }       right after that lesson of the same level is done (or learned)
const LESSON_TRIGGERS = ['x', 'zone', 'near', 'enemy', 'glint', 'kneel', 'group', 'hurt', 'after'];
