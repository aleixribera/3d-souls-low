// ============================================================================
// Boss Rush's abilities (v7.75.0, designed with Aleix): one is picked between fights and kept for the run. An ability
// offered again is its next level. The engine half is js/abilities.js; the cards and icons js/ability-cards.js.
// ============================================================================
// Every ability: an `id`, a `name`, a `rarity` (a key of CONFIG.abilities.rarity, which sets how many levels it has), a
// short `text` for the card, and one `levels` entry per level (a level's own numbers, not added to the one before).
// In `text`, {key} is that key's number at the card's level: a percentage, or in ABILITY_UNITS's unit.
//   common:    `mods`: every key of a level is a Player number it raises (ABILITY_MODS).
//   rare:      `perk: { when, then }`: when something happens to its holder, something useful follows (ABILITY_PERKS).
//   legendary: `power: { when, then }`: when it happens, a drawn power strikes the boss (ABILITY_POWERS). The server
//              resolves it; a legendary is held by one player of a team at most.
// A level's `cooldown` (s) spaces a perk's or power's triggers; a power's `once: true` fires once a fight.
const ABILITY_UNITS = { window: 's', after: 's', time: 's', every: 's', lead: 's', cooldown: 's', radius: 'm', hits: 'n', strikes: 'n' };
// The numbers that are a share of something whole (of the health or stamina bar, of the damage dealt): never above 1.
const ABILITY_SHARES = ['below', 'heal', 'stamina', 'drain'];
const ABILITIES = [
  // ---- Commons: half plain numbers, half one move made better ----
  { id: 'keen-edge', name: 'Keen Edge', rarity: 'common', text: 'Hits do {damage} more damage.', mods: true,
    levels: [{ damage: 0.08 }, { damage: 0.16 }, { damage: 0.24 }, { damage: 0.32 }] },
  { id: 'iron-blood', name: 'Iron Blood', rarity: 'common', text: '{maxHp} more health.', mods: true,
    levels: [{ maxHp: 0.1 }, { maxHp: 0.2 }, { maxHp: 0.3 }, { maxHp: 0.4 }] },
  { id: 'deep-lungs', name: 'Deep Lungs', rarity: 'common', text: '{maxStamina} more stamina.', mods: true,
    levels: [{ maxStamina: 0.12 }, { maxStamina: 0.24 }, { maxStamina: 0.36 }, { maxStamina: 0.48 }] },
  { id: 'quick-breath', name: 'Quick Breath', rarity: 'common', text: 'Stamina comes back {staminaRegen} faster.', mods: true,
    levels: [{ staminaRegen: 0.12 }, { staminaRegen: 0.24 }, { staminaRegen: 0.36 }, { staminaRegen: 0.48 }] },
  { id: 'breaker', name: 'Breaker', rarity: 'common', text: 'Break the boss {posture} faster.', mods: true,
    levels: [{ posture: 0.12 }, { posture: 0.24 }, { posture: 0.36 }, { posture: 0.48 }] },
  { id: 'keen-eye', name: 'Keen Eye', rarity: 'common', text: 'Parry window {parryWindow} wider.', mods: true,
    levels: [{ parryWindow: 0.15 }, { parryWindow: 0.3 }, { parryWindow: 0.45 }, { parryWindow: 0.6 }] },
  { id: 'light-step', name: 'Light Step', rarity: 'common', text: 'Rolls cost {rollCost} less stamina.', mods: true,
    levels: [{ rollCost: 0.12 }, { rollCost: 0.24 }, { rollCost: 0.36 }, { rollCost: 0.48 }] },
  { id: 'long-shadow', name: 'Long Shadow', rarity: 'common', text: 'Roll dodge time {rollIFrames} longer.', mods: true,
    levels: [{ rollIFrames: 0.15 }, { rollIFrames: 0.3 }, { rollIFrames: 0.45 }, { rollIFrames: 0.6 }] },
  { id: 'quick-draught', name: 'Quick Draught', rarity: 'common', text: 'Drink flasks {flaskSpeed} faster.', mods: true,
    levels: [{ flaskSpeed: 0.2 }, { flaskSpeed: 0.35 }, { flaskSpeed: 0.5 }, { flaskSpeed: 0.6 }] },
  { id: 'swift-charge', name: 'Swift Charge', rarity: 'common', text: 'Heavy attacks charge {chargeSpeed} faster.', mods: true,
    levels: [{ chargeSpeed: 0.2 }, { chargeSpeed: 0.35 }, { chargeSpeed: 0.5 }, { chargeSpeed: 0.6 }] },
  { id: 'cold-riposte', name: 'Cold Riposte', rarity: 'common', text: 'Ripostes do {riposte} more damage.', mods: true,
    levels: [{ riposte: 0.15 }, { riposte: 0.3 }, { riposte: 0.45 }, { riposte: 0.6 }] },
  { id: 'headsman', name: 'Headsman', rarity: 'common', text: 'Executions do {execution} more damage.', mods: true,
    levels: [{ execution: 0.15 }, { execution: 0.3 }, { execution: 0.45 }, { execution: 0.6 }] },

  // ---- Rares: useful perks that happen when something does ----
  { id: 'deep-breath', name: 'Deep Breath', rarity: 'rare', text: 'Parry: get back {stamina} of your stamina.',
    perk: { when: 'parry', then: 'stamina' }, levels: [{ stamina: 0.4 }, { stamina: 0.7 }, { stamina: 1 }] },
  { id: 'counterstep', name: 'Counterstep', rarity: 'rare', text: 'Perfect dodge: your next hit in {window} is a riposte.',
    perk: { when: 'dodge', then: 'riposte' }, levels: [{ window: 1.5 }, { window: 2 }, { window: 2.5 }] },
  { id: 'vengeance', name: 'Vengeance', rarity: 'rare', text: 'Get hit: your next hit does {damage} more damage.',
    perk: { when: 'hurt', then: 'empower' }, levels: [{ window: 3, damage: 0.3 }, { window: 3, damage: 0.4 }, { window: 3, damage: 0.5 }] },
  { id: 'bloodthirst', name: 'Bloodthirst', rarity: 'rare', text: '{hits} hits without getting hit: heal {heal}.',
    perk: { when: 'streak', then: 'heal' }, levels: [{ hits: 5, heal: 0.08 }, { hits: 5, heal: 0.11 }, { hits: 5, heal: 0.14 }] },
  { id: 'last-breath', name: 'Last Breath', rarity: 'rare', text: 'Below {below} health: rolls and attacks cost no stamina.',
    perk: { when: 'low', then: 'freeStamina' }, levels: [{ below: 0.25 }, { below: 0.3 }, { below: 0.35 }] },
  { id: 'opportunist', name: 'Opportunist', rarity: 'rare', text: 'Boss off balance: you do {damage} more damage.',
    perk: { when: 'open', then: 'damage' }, levels: [{ damage: 0.3 }, { damage: 0.4 }, { damage: 0.5 }] },
  { id: 'bastion', name: 'Bastion', rarity: 'rare', text: 'Block a hit: your next heavy in {window} is fully charged.',
    perk: { when: 'block', then: 'charge' }, levels: [{ window: 3 }, { window: 4 }, { window: 5 }] },
  { id: 'patience', name: 'Patience', rarity: 'rare', text: '{after} without getting hit: your next hit does double.',
    perk: { when: 'unhurt', then: 'empower' }, levels: [{ after: 8, damage: 1 }, { after: 6.5, damage: 1 }, { after: 5, damage: 1 }] },

  // ---- Legendaries: one big power each, drawn in its own colour (js/ability-fx.js) ----
  { id: 'meteor-fall', name: 'Meteor Fall', rarity: 'legendary', text: 'Jump heavy attack: crash down like a meteor, {radius} wide.',
    power: { when: 'land', then: 'blast', action: 'heavy' },
    levels: [{ radius: 4.5, damage: 130, posture: 45, cooldown: 3 }, { radius: 6, damage: 190, posture: 70, cooldown: 3 }] },
  { id: 'storm-king', name: 'Storm King', rarity: 'legendary', text: 'Full heavy hit: lightning strikes the boss {strikes} times.',
    power: { when: 'fullHeavy', then: 'lightning' },
    levels: [{ strikes: 3, lead: 0.75, every: 0.45, damage: 55, posture: 14, cooldown: 4 }, { strikes: 5, lead: 0.75, every: 0.4, damage: 65, posture: 16, cooldown: 4 }] },
  { id: 'time-rift', name: 'Time Rift', rarity: 'legendary', text: 'Perfect dodge: time stops for the boss for {time}.',
    power: { when: 'dodge', then: 'freeze' },
    levels: [{ time: 2.5, radius: 9, cooldown: 14 }, { time: 3.5, radius: 9, cooldown: 11 }] },
  { id: 'thousand-blades', name: 'Thousand Blades', rarity: 'legendary', text: 'Parry: ghost swords rain on the boss for {time}.',
    power: { when: 'parry', then: 'blades' },
    levels: [{ time: 3, every: 0.2, damage: 12, posture: 3, cooldown: 8 }, { time: 4.5, every: 0.15, damage: 13, posture: 3, cooldown: 8 }] },
  { id: 'blood-moon', name: 'Blood Moon', rarity: 'legendary', text: 'Low health: a blood moon rises. For {time} your hits heal you.',
    power: { when: 'low', then: 'bloodMoon', once: true },
    levels: [{ below: 0.33, time: 10, damage: 0.4, drain: 0.3 }, { below: 0.33, time: 14, damage: 0.6, drain: 0.45 }] },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(b => [b.id, b]));
