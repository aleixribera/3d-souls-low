// ============================================================================
// Boss Rush's abilities (v7.75.0, designed with Aleix): one is picked between fights and kept for the run. An ability
// offered again is its next level. The engine half is js/abilities.js; the cards and icons js/ability-cards.js.
// ============================================================================
// Every ability: an `id`, a `name`, a `rarity` (a key of CONFIG.abilities.rarity, which sets how many levels it has), a
// `text` for the card, and one `levels` entry per level (a level's own numbers, not added to the one before).
// A `text` is only the trigger and the effect, in the fewest plain words ("Parry: a hound hunts the boss for {time}."):
// no flavour, nothing the name or rarity already shows. validate.js holds it to ABILITY_TEXT_MAX (Aleix, 2026-11-14).
// In `text`, {key} is that key's number at the card's level: a percentage, or in ABILITY_UNITS's unit.
//   common:    `mods`: every key of a level is a Player number it raises (ABILITY_MODS); or a small `power` (below).
//   rare:      `perk: { when, then }`: when something happens to its holder, something useful follows (ABILITY_PERKS);
//              or a small `power` (below).
//   legendary: `power: { when, then }`: when it happens, a drawn power strikes the boss (ABILITY_POWERS). The server
//              resolves it. A summon is a power too (`twin`, `hound`, `guardian`, `lancer`).
// A level's `cooldown` (s) spaces a perk's or power's triggers; a power's `once: true` fires once a fight.
// Pressed abilities (pass 87, PLAN.md's player rework): a `key` (ABILITY_KEYS: strike, guard, summon or ultimate; the
// number keys 1-4) and a perk or power `when: 'press'`. Each level's `charge` is the points its key fills before it
// fires (js/abilities.js pressGain). Strike, Guard and Summon are rares, Ultimate legendaries; validate.js holds every
// pressed ability to exactly one key. Its text is the effect only: the card and the HUD show its key.
const ABILITY_UNITS = { window: 's', after: 's', time: 's', every: 's', lead: 's', cooldown: 's', draw: 's', radius: 'm', reach: 'm', width: 'm', hits: 'n', strikes: 'n', charge: 'n' };
// The numbers that are a share of something whole (of the health bar, of the damage dealt): never above 1.
const ABILITY_SHARES = ['below', 'heal', 'drain', 'share'];
const ABILITIES = [
  // ---- Commons: half plain numbers, half one move made better ----
  { id: 'keen-edge', name: 'Keen Edge', rarity: 'common', plain: true, text: '{damage} more damage.', mods: true,
    levels: [{ damage: 0.08 }, { damage: 0.16 }, { damage: 0.24 }, { damage: 0.32 }] },
  { id: 'iron-blood', name: 'Iron Blood', rarity: 'common', plain: true, text: '{maxHp} more health.', mods: true,
    levels: [{ maxHp: 0.08 }, { maxHp: 0.16 }, { maxHp: 0.24 }, { maxHp: 0.32 }] },
  { id: 'breaker', name: 'Breaker', rarity: 'common', plain: true, text: 'Counter window {counterWindow} longer.', mods: true,
    levels: [{ counterWindow: 0.15 }, { counterWindow: 0.3 }, { counterWindow: 0.45 }, { counterWindow: 0.6 }] },
  { id: 'keen-eye', name: 'Keen Eye', rarity: 'common', plain: true, text: 'Deflect window {parryWindow} wider.', mods: true,
    levels: [{ parryWindow: 0.15 }, { parryWindow: 0.3 }, { parryWindow: 0.45 }, { parryWindow: 0.6 }] },
  { id: 'light-step', name: 'Light Step', rarity: 'common', plain: true, text: 'Dashes refill {dashRefill} faster.', mods: true,
    levels: [{ dashRefill: 0.12 }, { dashRefill: 0.24 }, { dashRefill: 0.36 }, { dashRefill: 0.48 }] },
  { id: 'quick-draught', name: 'Quick Draught', rarity: 'common', plain: true, text: 'Drink flasks {flaskSpeed} faster.', mods: true,
    levels: [{ flaskSpeed: 0.2 }, { flaskSpeed: 0.35 }, { flaskSpeed: 0.5 }, { flaskSpeed: 0.6 }] },
  { id: 'cold-riposte', name: 'Cold Riposte', rarity: 'common', plain: true, text: 'Counters: {riposte} more damage.', mods: true,
    levels: [{ riposte: 0.15 }, { riposte: 0.3 }, { riposte: 0.45 }, { riposte: 0.6 }] },
  { id: 'headsman', name: 'Headsman', rarity: 'common', plain: true, text: 'Finishing Blow: {finisher} more damage.', mods: true,
    levels: [{ finisher: 0.15 }, { finisher: 0.3 }, { finisher: 0.45 }, { finisher: 0.6 }] },
  // The blade (design/abilities batch 2): one move made a small strike of its own, drawn in bone ink (js/common-fx.js).
  { id: 'spark-step', name: 'Spark Step', rarity: 'common', text: 'Dash past the boss: a spark cuts it.',
    power: { when: 'dashPast', then: 'spark' },
    levels: [{ damage: 10, cooldown: 1 }, { damage: 13, cooldown: 1 }, { damage: 16, cooldown: 1 }, { damage: 19, cooldown: 1 }] },
  { id: 'ember-lick', name: 'Ember Lick', rarity: 'common', text: 'Fourth light hit: a lick of flame.',
    power: { when: 'stringEnd', then: 'lick' }, levels: [{ damage: 10 }, { damage: 13 }, { damage: 16 }, { damage: 19 }] },
  { id: 'hot-iron', name: 'Hot Iron', rarity: 'common', text: 'Full heavy: molten sparks spray the boss.',
    power: { when: 'fullHeavy', then: 'molten' }, levels: [{ damage: 16 }, { damage: 21 }, { damage: 26 }, { damage: 31 }] },
  { id: 'petal-cut', name: 'Petal Cut', rarity: 'common', text: 'Dash attack: the cut opens again a beat later.',
    power: { when: 'dashStrike', then: 'lateCut' }, levels: [{ damage: 12 }, { damage: 15 }, { damage: 18 }, { damage: 21 }] },
  { id: 'echo-step', name: 'Echo Step', rarity: 'common', text: 'Perfect dodge: your afterimage strikes once.',
    power: { when: 'dodge', then: 'afterimage' }, levels: [{ damage: 14 }, { damage: 18 }, { damage: 22 }, { damage: 26 }] },
  { id: 'dust-devil', name: 'Dust Devil', rarity: 'common', text: 'Jump: a dust whirl cuts around you.',
    power: { when: 'jump', then: 'whirl' },
    levels: [{ damage: 10, cooldown: 2 }, { damage: 13, cooldown: 2 }, { damage: 16, cooldown: 2 }, { damage: 19, cooldown: 2 }] },

  // ---- Rares: useful perks that happen when something does ----
  { id: 'counterstep', name: 'Counterstep', rarity: 'rare', text: 'Perfect dodge: next hit in {window} is a riposte.',
    perk: { when: 'dodge', then: 'riposte' }, levels: [{ window: 1.5 }, { window: 2 }, { window: 2.5 }] },
  { id: 'vengeance', name: 'Vengeance', rarity: 'rare', text: 'Get hit: next hit in {window} does {damage} more.',
    perk: { when: 'hurt', then: 'empower' }, levels: [{ window: 3, damage: 0.3 }, { window: 3, damage: 0.4 }, { window: 3, damage: 0.5 }] },
  { id: 'bloodthirst', name: 'Bloodthirst', rarity: 'rare', text: '{hits} hits unhurt: heal {heal}.',
    perk: { when: 'streak', then: 'heal' }, levels: [{ hits: 5, heal: 0.08 }, { hits: 5, heal: 0.11 }, { hits: 5, heal: 0.14 }] },
  { id: 'last-breath', name: 'Last Breath', rarity: 'rare', text: 'Below {below} health: endless dashes.',
    perk: { when: 'low', then: 'freeDash' }, levels: [{ below: 0.25 }, { below: 0.3 }, { below: 0.35 }] },
  { id: 'opportunist', name: 'Opportunist', rarity: 'rare', text: 'Boss off balance: {damage} more damage.',
    perk: { when: 'open', then: 'damage' }, levels: [{ damage: 0.3 }, { damage: 0.4 }, { damage: 0.5 }] },
  { id: 'bastion', name: 'Bastion', rarity: 'rare', text: 'Block: next heavy in {window} is fully charged.',
    perk: { when: 'block', then: 'charge' }, levels: [{ window: 3 }, { window: 4 }, { window: 5 }] },
  { id: 'patience', name: 'Patience', rarity: 'rare', text: '{after} unhurt: next hit does double.',
    perk: { when: 'unhurt', then: 'empower' }, levels: [{ after: 8, damage: 1 }, { after: 6.5, damage: 1 }, { after: 5, damage: 1 }] },
  // Small powers: a strike of their own on the boss, drawn and heard (js/ability-fx.js), smaller than a legendary's.
  { id: 'counterflame', name: 'Counterflame', rarity: 'rare', text: 'Deflect: fire bursts on the boss.',
    power: { when: 'parry', then: 'flare' }, levels: [{ damage: 40, cooldown: 1 }, { damage: 55, cooldown: 1 }, { damage: 70, cooldown: 1 }] },
  // Key 3, Summon: a hound of the grave that hunts the boss and draws its eye for a moment.
  { id: 'grave-hound', name: 'Grave Hound', rarity: 'rare', key: 'summon', text: 'A hound hunts the boss for {time}.',
    power: { when: 'press', then: 'hound' },
    levels: [{ charge: 20, time: 8, every: 1.2, damage: 16, draw: 2 }, { charge: 18, time: 10, every: 1.1, damage: 20, draw: 2.5 },
      { charge: 16, time: 12, every: 1, damage: 24, draw: 3 }] },
  // A summon that holds the boss: a guardian of stone that rises when its holder is nearly down and keeps the boss on
  // it for a long breath, battering it with its shield now and then. Once a fight.
  { id: 'stone-guardian', name: 'Stone Guardian', rarity: 'rare', text: 'Low health: a guardian holds the boss for {draw}.',
    power: { when: 'low', then: 'guardian', once: true },
    levels: [{ below: 0.33, time: 9, every: 2, damage: 14, draw: 4 }, { below: 0.33, time: 11, every: 1.8, damage: 18, draw: 5 },
      { below: 0.33, time: 13, every: 1.6, damage: 22, draw: 6 }] },
  // Key 3, Summon: a lancer of ash that charges the boss and thrusts at it.
  { id: 'ash-lancer', name: 'Lancer of Ash', rarity: 'rare', key: 'summon', text: 'A lancer charges the boss for {time}.',
    power: { when: 'press', then: 'lancer' },
    levels: [{ charge: 18, time: 6, every: 0.9, damage: 18, draw: 1 }, { charge: 16, time: 7, every: 0.8, damage: 22, draw: 1.2 },
      { charge: 14, time: 8, every: 0.7, damage: 26, draw: 1.5 }] },
  // Key 1, Strike: a burst of attack on the boss.
  { id: 'fire-burst', name: 'Fire Burst', rarity: 'rare', key: 'strike', text: 'Fire bursts on the boss.',
    power: { when: 'press', then: 'flare' },
    levels: [{ charge: 14, damage: 70 }, { charge: 13, damage: 90 }, { charge: 12, damage: 110 }] },
  { id: 'wind-blade', name: 'Wind Blade', rarity: 'rare', key: 'strike', text: 'A wind blade cuts all in its path.',
    power: { when: 'press', then: 'gale' },
    levels: [{ charge: 16, damage: 80, reach: 12, width: 1.4 }, { charge: 15, damage: 100, reach: 14, width: 1.6 },
      { charge: 14, damage: 120, reach: 16, width: 1.8 }] },
  // Key 2, Guard: defence and counters.
  { id: 'mending', name: 'Mending', rarity: 'rare', key: 'guard', text: 'Heal {heal}.',
    perk: { when: 'press', then: 'heal' }, levels: [{ charge: 14, heal: 0.2 }, { charge: 13, heal: 0.25 }, { charge: 12, heal: 0.3 }] },
  { id: 'iron-stance', name: 'Iron Stance', rarity: 'rare', key: 'guard', text: 'Deflect blows for {time}, no timing needed.',
    perk: { when: 'press', then: 'stance' }, levels: [{ charge: 12, time: 2.5 }, { charge: 12, time: 3 }, { charge: 12, time: 3.5 }] },
  { id: 'static-edge', name: 'Static Edge', rarity: 'rare', text: 'Every {hits}th hit: a spark strikes the boss.',
    power: { when: 'hits', then: 'spark' }, levels: [{ hits: 5, damage: 30 }, { hits: 4, damage: 34 }, { hits: 4, damage: 44 }] },

  // ---- Legendaries: one big power each, drawn in its own colour (js/ability-fx.js). Pass 73 (PLAN.md item 11): every
  // effect, sound and camera moment as before; less damage, and longer cooldowns, so one saves a bad
  // fight without carrying a run. No cap on how many a player holds (v7.160.0). ----
  { id: 'meteor-fall', name: 'Meteor Fall', rarity: 'legendary', text: 'Jump heavy: a blast hits all within {radius}.',
    power: { when: 'land', then: 'blast', action: 'heavy' },
    levels: [{ radius: 6, damage: 140, cooldown: 5 }] },
  { id: 'storm-king', name: 'Storm King', rarity: 'legendary', text: 'Full heavy hit: {strikes} lightning strikes.',
    power: { when: 'fullHeavy', then: 'lightning' },
    levels: [{ strikes: 5, lead: 0.75, every: 0.4, damage: 36, cooldown: 6 }] },
  { id: 'time-rift', name: 'Time Rift', rarity: 'legendary', text: 'Perfect dodge: the boss freezes for {time}.',
    power: { when: 'dodge', then: 'freeze' },
    levels: [{ time: 2.5, radius: 9, cooldown: 14 }] },
  { id: 'thousand-blades', name: 'Thousand Blades', rarity: 'legendary', text: 'Deflect: swords rain on the boss for {time}.',
    power: { when: 'parry', then: 'blades' },
    levels: [{ time: 4.5, every: 0.15, damage: 6, cooldown: 10 }] },
  { id: 'blood-moon', name: 'Blood Moon', rarity: 'legendary', text: 'Low health: for {time}, hits do more and heal.',
    power: { when: 'low', then: 'bloodMoon', once: true },
    levels: [{ below: 0.33, time: 12, damage: 0.45, drain: 0.35 }] },
  { id: 'gale-crescent', name: 'Gale Crescent', rarity: 'legendary', text: 'Every {hits}th hit: a wind blade cuts the boss.',
    power: { when: 'hits', then: 'gale' },
    levels: [{ hits: 8, damage: 90, reach: 16, width: 2 }] },
  { id: 'pyre', name: 'Pyre', rarity: 'legendary', text: 'Counter: fire burns the foe for {time}.',
    power: { when: 'counter', then: 'pyre' },
    levels: [{ time: 4, every: 0.35, damage: 17, cooldown: 2 }] },
  // The first summon: a twin of its holder, made of embers, that fights at the boss's far side and strikes with them.
  { id: 'ember-twin', name: 'Ember Twin', rarity: 'legendary', text: 'Flask: a twin fights with you for {time}.',
    power: { when: 'flask', then: 'twin' },
    levels: [{ time: 12, share: 0.55, draw: 3, cooldown: 20 }] },
  // Key 4, Ultimate: the longest charge and the biggest moment.
  { id: 'thunder-call', name: 'Thunder Call', rarity: 'legendary', key: 'ultimate', text: '{strikes} lightning strikes on the boss.',
    power: { when: 'press', then: 'lightning' },
    levels: [{ charge: 40, strikes: 7, lead: 0.75, every: 0.3, damage: 48 }] },
  { id: 'cataclysm', name: 'Cataclysm', rarity: 'legendary', key: 'ultimate', text: 'A blast hits all within {radius}.',
    power: { when: 'press', then: 'blast' },
    levels: [{ charge: 42, radius: 8, damage: 360 }] },

  // ---- Two more rares (pass 71, once crate-only; since PLAN.md item 7 every ability outside the starter set comes from a
  // crate, js/data/crates.js) ----
  { id: 'grave-feast', name: 'Grave Feast', rarity: 'rare', text: 'Finishing Blow: heal {heal}.',
    perk: { when: 'finisher', then: 'heal' }, levels: [{ heal: 0.25 }, { heal: 0.35 }, { heal: 0.45 }] },
  { id: 'iron-mercy', name: 'Iron Mercy', rarity: 'rare', text: 'Deflect: heal {heal}, once per {cooldown}.',
    perk: { when: 'parry', then: 'heal' }, levels: [{ heal: 0.06, cooldown: 3 }, { heal: 0.09, cooldown: 2.5 }, { heal: 0.12, cooldown: 2 }] },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(b => [b.id, b]));
