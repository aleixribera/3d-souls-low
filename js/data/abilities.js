// ============================================================================
// Boss Rush's abilities (v7.75.0, designed with Aleix): one is picked between fights and kept for the run. An ability
// offered again is its next level. The engine half is js/abilities.js; the cards and icons js/ability-cards.js.
// ============================================================================
// Every ability: an `id`, a `name`, a `rarity` (a key of CONFIG.abilities.rarity, which sets how many levels it has), a
// `text` for the card, and one `levels` entry per level (a level's own numbers, not added to the one before).
// A `text` is only the trigger and the effect, in the fewest plain words ("Parry: a hound hunts the boss for {time}."):
// no flavour, nothing the name or rarity already shows. validate.js holds it to ABILITY_TEXT_MAX (Aleix, 2026-11-14).
// In `text`, {key} is that key's number at the card's level: a percentage, or in ABILITY_UNITS's unit.
//   common:    `mods`: every key of a level is a Player number it raises (ABILITY_MODS).
//   rare:      `perk: { when, then }`: when something happens to its holder, something useful follows (ABILITY_PERKS);
//              or a small `power` (below).
//   legendary: `power: { when, then }`: when it happens, a drawn power strikes the boss (ABILITY_POWERS). The server
//              resolves it; a legendary is held by one player of a team at most. A summon is a power too (`twin`, `hound`, `guardian`, `lancer`).
// A level's `cooldown` (s) spaces a perk's or power's triggers; a power's `once: true` fires once a fight.
const ABILITY_UNITS = { window: 's', after: 's', time: 's', every: 's', lead: 's', cooldown: 's', draw: 's', radius: 'm', reach: 'm', width: 'm', hits: 'n', strikes: 'n' };
// The numbers that are a share of something whole (of the health or stamina bar, of the damage dealt): never above 1.
const ABILITY_SHARES = ['below', 'heal', 'stamina', 'drain', 'share'];
const ABILITIES = [
  // ---- Commons: half plain numbers, half one move made better ----
  { id: 'keen-edge', name: 'Keen Edge', rarity: 'common', text: '{damage} more damage.', mods: true,
    levels: [{ damage: 0.08 }, { damage: 0.16 }, { damage: 0.24 }, { damage: 0.32 }] },
  { id: 'iron-blood', name: 'Iron Blood', rarity: 'common', text: '{maxHp} more health.', mods: true,
    levels: [{ maxHp: 0.1 }, { maxHp: 0.2 }, { maxHp: 0.3 }, { maxHp: 0.4 }] },
  { id: 'deep-lungs', name: 'Deep Lungs', rarity: 'common', text: '{maxStamina} more stamina.', mods: true,
    levels: [{ maxStamina: 0.12 }, { maxStamina: 0.24 }, { maxStamina: 0.36 }, { maxStamina: 0.48 }] },
  { id: 'quick-breath', name: 'Quick Breath', rarity: 'common', text: 'Stamina refills {staminaRegen} faster.', mods: true,
    levels: [{ staminaRegen: 0.12 }, { staminaRegen: 0.24 }, { staminaRegen: 0.36 }, { staminaRegen: 0.48 }] },
  { id: 'breaker', name: 'Breaker', rarity: 'common', text: 'Break bosses {posture} faster.', mods: true,
    levels: [{ posture: 0.12 }, { posture: 0.24 }, { posture: 0.36 }, { posture: 0.48 }] },
  { id: 'keen-eye', name: 'Keen Eye', rarity: 'common', text: 'Parry window {parryWindow} wider.', mods: true,
    levels: [{ parryWindow: 0.15 }, { parryWindow: 0.3 }, { parryWindow: 0.45 }, { parryWindow: 0.6 }] },
  { id: 'light-step', name: 'Light Step', rarity: 'common', text: 'Rolls cost {rollCost} less stamina.', mods: true,
    levels: [{ rollCost: 0.12 }, { rollCost: 0.24 }, { rollCost: 0.36 }, { rollCost: 0.48 }] },
  { id: 'long-shadow', name: 'Long Shadow', rarity: 'common', text: 'Rolls dodge {rollIFrames} longer.', mods: true,
    levels: [{ rollIFrames: 0.15 }, { rollIFrames: 0.3 }, { rollIFrames: 0.45 }, { rollIFrames: 0.6 }] },
  { id: 'quick-draught', name: 'Quick Draught', rarity: 'common', text: 'Drink flasks {flaskSpeed} faster.', mods: true,
    levels: [{ flaskSpeed: 0.2 }, { flaskSpeed: 0.35 }, { flaskSpeed: 0.5 }, { flaskSpeed: 0.6 }] },
  { id: 'swift-charge', name: 'Swift Charge', rarity: 'common', text: 'Heavies charge {chargeSpeed} faster.', mods: true,
    levels: [{ chargeSpeed: 0.2 }, { chargeSpeed: 0.35 }, { chargeSpeed: 0.5 }, { chargeSpeed: 0.6 }] },
  { id: 'cold-riposte', name: 'Cold Riposte', rarity: 'common', text: 'Ripostes: {riposte} more damage.', mods: true,
    levels: [{ riposte: 0.15 }, { riposte: 0.3 }, { riposte: 0.45 }, { riposte: 0.6 }] },
  { id: 'headsman', name: 'Headsman', rarity: 'common', text: 'Executions: {execution} more damage.', mods: true,
    levels: [{ execution: 0.15 }, { execution: 0.3 }, { execution: 0.45 }, { execution: 0.6 }] },

  // ---- Rares: useful perks that happen when something does ----
  { id: 'deep-breath', name: 'Deep Breath', rarity: 'rare', text: 'Parry: regain {stamina} stamina.',
    perk: { when: 'parry', then: 'stamina' }, levels: [{ stamina: 0.4 }, { stamina: 0.7 }, { stamina: 1 }] },
  { id: 'counterstep', name: 'Counterstep', rarity: 'rare', text: 'Perfect dodge: next hit in {window} is a riposte.',
    perk: { when: 'dodge', then: 'riposte' }, levels: [{ window: 1.5 }, { window: 2 }, { window: 2.5 }] },
  { id: 'vengeance', name: 'Vengeance', rarity: 'rare', text: 'Get hit: next hit in {window} does {damage} more.',
    perk: { when: 'hurt', then: 'empower' }, levels: [{ window: 3, damage: 0.3 }, { window: 3, damage: 0.4 }, { window: 3, damage: 0.5 }] },
  { id: 'bloodthirst', name: 'Bloodthirst', rarity: 'rare', text: '{hits} hits unhurt: heal {heal}.',
    perk: { when: 'streak', then: 'heal' }, levels: [{ hits: 5, heal: 0.08 }, { hits: 5, heal: 0.11 }, { hits: 5, heal: 0.14 }] },
  { id: 'last-breath', name: 'Last Breath', rarity: 'rare', text: 'Below {below} health: free rolls and attacks.',
    perk: { when: 'low', then: 'freeStamina' }, levels: [{ below: 0.25 }, { below: 0.3 }, { below: 0.35 }] },
  { id: 'opportunist', name: 'Opportunist', rarity: 'rare', text: 'Boss off balance: {damage} more damage.',
    perk: { when: 'open', then: 'damage' }, levels: [{ damage: 0.3 }, { damage: 0.4 }, { damage: 0.5 }] },
  { id: 'bastion', name: 'Bastion', rarity: 'rare', text: 'Block: next heavy in {window} is fully charged.',
    perk: { when: 'block', then: 'charge' }, levels: [{ window: 3 }, { window: 4 }, { window: 5 }] },
  { id: 'patience', name: 'Patience', rarity: 'rare', text: '{after} unhurt: next hit does double.',
    perk: { when: 'unhurt', then: 'empower' }, levels: [{ after: 8, damage: 1 }, { after: 6.5, damage: 1 }, { after: 5, damage: 1 }] },
  { id: 'second-wind', name: 'Second Wind', rarity: 'rare', text: 'Flask: regain {stamina} stamina.',
    perk: { when: 'flask', then: 'stamina' }, levels: [{ stamina: 0.5 }, { stamina: 0.75 }, { stamina: 1 }] },
  // Small powers: a strike of their own on the boss, drawn and heard (js/ability-fx.js), smaller than a legendary's.
  { id: 'counterflame', name: 'Counterflame', rarity: 'rare', text: 'Parry: fire bursts on the boss.',
    power: { when: 'parry', then: 'flare' }, levels: [{ damage: 40, posture: 10, cooldown: 1 }, { damage: 55, posture: 14, cooldown: 1 }, { damage: 70, posture: 18, cooldown: 1 }] },
  // A summon of a rare's: a hound of the grave that hunts the parried boss and draws its eye for a moment.
  { id: 'grave-hound', name: 'Grave Hound', rarity: 'rare', text: 'Parry: a hound hunts the boss for {time}.',
    power: { when: 'parry', then: 'hound' },
    levels: [{ time: 8, every: 1.2, damage: 16, posture: 5, draw: 2, cooldown: 14 }, { time: 10, every: 1.1, damage: 20, posture: 6, draw: 2.5, cooldown: 12 },
      { time: 12, every: 1, damage: 24, posture: 7, draw: 3, cooldown: 10 }] },
  // A summon that holds the boss: a guardian of stone that rises when its holder is nearly down and keeps the boss on
  // it for a long breath, battering it with its shield now and then. Once a fight.
  { id: 'stone-guardian', name: 'Stone Guardian', rarity: 'rare', text: 'Low health: a guardian holds the boss for {draw}.',
    power: { when: 'low', then: 'guardian', once: true },
    levels: [{ below: 0.33, time: 9, every: 2, damage: 14, posture: 12, draw: 4 }, { below: 0.33, time: 11, every: 1.8, damage: 18, posture: 15, draw: 5 },
      { below: 0.33, time: 13, every: 1.6, damage: 22, posture: 18, draw: 6 }] },
  // A summon that hits: a lancer of ash that charges the boss whose balance its holder broke, and thrusts at it.
  { id: 'ash-lancer', name: 'Lancer of Ash', rarity: 'rare', text: 'Break balance: a lancer charges the boss for {time}.',
    power: { when: 'break', then: 'lancer' },
    levels: [{ time: 6, every: 0.9, damage: 18, posture: 4, draw: 1, cooldown: 12 }, { time: 7, every: 0.8, damage: 22, posture: 5, draw: 1.2, cooldown: 10 },
      { time: 8, every: 0.7, damage: 26, posture: 6, draw: 1.5, cooldown: 8 }] },
  { id: 'static-edge', name: 'Static Edge', rarity: 'rare', text: 'Every {hits}th hit: a spark strikes the boss.',
    power: { when: 'hits', then: 'spark' }, levels: [{ hits: 5, damage: 30, posture: 6 }, { hits: 4, damage: 34, posture: 7 }, { hits: 4, damage: 44, posture: 9 }] },

  // ---- Legendaries: one big power each, drawn in its own colour (js/ability-fx.js) ----
  { id: 'meteor-fall', name: 'Meteor Fall', rarity: 'legendary', text: 'Jump heavy: a blast hits all within {radius}.',
    power: { when: 'land', then: 'blast', action: 'heavy' },
    levels: [{ radius: 4.5, damage: 130, posture: 45, cooldown: 3 }, { radius: 6, damage: 190, posture: 70, cooldown: 3 }] },
  { id: 'storm-king', name: 'Storm King', rarity: 'legendary', text: 'Full heavy hit: {strikes} lightning strikes.',
    power: { when: 'fullHeavy', then: 'lightning' },
    levels: [{ strikes: 3, lead: 0.75, every: 0.45, damage: 55, posture: 14, cooldown: 4 }, { strikes: 5, lead: 0.75, every: 0.4, damage: 65, posture: 16, cooldown: 4 }] },
  { id: 'time-rift', name: 'Time Rift', rarity: 'legendary', text: 'Perfect dodge: the boss freezes for {time}.',
    power: { when: 'dodge', then: 'freeze' },
    levels: [{ time: 2.5, radius: 9, cooldown: 14 }, { time: 3.5, radius: 9, cooldown: 11 }] },
  { id: 'thousand-blades', name: 'Thousand Blades', rarity: 'legendary', text: 'Parry: swords rain on the boss for {time}.',
    power: { when: 'parry', then: 'blades' },
    levels: [{ time: 3, every: 0.2, damage: 12, posture: 3, cooldown: 8 }, { time: 4.5, every: 0.15, damage: 13, posture: 3, cooldown: 8 }] },
  { id: 'blood-moon', name: 'Blood Moon', rarity: 'legendary', text: 'Low health: for {time}, hits do more and heal.',
    power: { when: 'low', then: 'bloodMoon', once: true },
    levels: [{ below: 0.33, time: 10, damage: 0.4, drain: 0.3 }, { below: 0.33, time: 14, damage: 0.6, drain: 0.45 }] },
  { id: 'gale-crescent', name: 'Gale Crescent', rarity: 'legendary', text: 'Every {hits}th hit: a wind blade cuts the boss.',
    power: { when: 'hits', then: 'gale' },
    levels: [{ hits: 8, damage: 90, posture: 30, reach: 14, width: 1.6 }, { hits: 6, damage: 115, posture: 40, reach: 16, width: 2 }] },
  { id: 'pyre', name: 'Pyre', rarity: 'legendary', text: 'Break balance: fire burns the boss for {time}.',
    power: { when: 'break', then: 'pyre' },
    levels: [{ time: 4, every: 0.4, damage: 26, posture: 0.5, cooldown: 2 }, { time: 6, every: 0.35, damage: 30, posture: 0.5, cooldown: 2 }] },
  // The first summon: a twin of its holder, made of embers, that fights at the boss's far side and strikes with them.
  { id: 'ember-twin', name: 'Ember Twin', rarity: 'legendary', text: 'Flask: a twin fights with you for {time}.',
    power: { when: 'flask', then: 'twin' },
    levels: [{ time: 12, share: 0.5, draw: 2, cooldown: 20 }, { time: 16, share: 0.7, draw: 3, cooldown: 16 }] },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(b => [b.id, b]));
