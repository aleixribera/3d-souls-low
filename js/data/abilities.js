// ============================================================================
// Boss Rush's abilities (v7.75.0, designed with Aleix): one is picked between fights and kept for the run. An ability
// offered again is its next level. The engine half is js/abilities.js; the cards and icons js/ability-cards.js.
// ============================================================================
// Every ability: an `id`, a `name`, a `rarity` (a key of CONFIG.abilities.rarity, which sets how many levels it has), a
// `text` for the card, and one `levels` entry per level (a level's own numbers, not added to the one before).
// A `text` is only the trigger and the effect, in the fewest plain words ("Parry: a hound hunts the boss for {time}."):
// no flavour, nothing the name or rarity already shows. validate.js holds it to ABILITY_TEXT_MAX (Aleix, 2026-11-14).
// In `text`, {key} is that key's number at the card's level: a percentage, or in ABILITY_UNITS's unit.
//   common:    `mods`: every key of a level is a Player number it raises (ABILITY_MODS); or a small `power` (below);
//              or a `perk` on its holder's own body (batch 3: the guard and the run, COMMON_PERKS).
// `party: true`: offered only to a person in a run of two people or more (it helps a friend).
// `needs: '<key>'`: offered only to one who holds an ability on that number key (Fourfold, `ultimate`).
//   rare:      `perk: { when, then }`: when something happens to its holder, something useful follows (ABILITY_PERKS);
//              or a small `power` (below).
//   legendary: `power: { when, then }`: when it happens, a drawn power strikes the boss (ABILITY_POWERS). The server
//              resolves it. A summon is a power too (`twin`, `hound`, `guardian`, `lancer`).
// A level's `cooldown` (s) spaces a perk's or power's triggers; a power's `once: true` fires once a fight.
// Pressed abilities (pass 87, PLAN.md's player rework): a `key` (ABILITY_KEYS: strike, guard, summon or ultimate; the
// number keys 1-4) and a perk or power `when: 'press'`. Each level's `charge` is the points its key fills before it
// fires (js/abilities.js pressGain). Strike, Guard and Summon are rares, Ultimate legendaries; validate.js holds every
// pressed ability to exactly one key. Its text is the effect only: the card and the HUD show its key.
const ABILITY_UNITS = { window: 's', after: 's', time: 's', every: 's', lead: 's', cooldown: 's', draw: 's', radius: 'm', reach: 'm', width: 'm', hits: 'n', strikes: 'n', charge: 'n', most: 'n' };
// The numbers that are a share of something whole (of the health bar, of the damage dealt): never above 1.
const ABILITY_SHARES = ['below', 'heal', 'drain', 'share', 'cut', 'mark'];
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
  // The guard and the run (design/abilities batch 3): a defence or a moment of the fight made a little better, each
  // with its own bone-ink cue (js/common-fx.js). A common may be a perk too: one on its holder's own body.
  { id: 'ringing-steel', name: 'Ringing Steel', rarity: 'common', text: 'Deflect: your next dash is free.',
    perk: { when: 'parry', then: 'freeDash' }, levels: [{ cooldown: 6 }, { cooldown: 5 }, { cooldown: 4 }, { cooldown: 3 }] },
  { id: 'thorn-guard', name: 'Thorn Guard', rarity: 'common', text: 'Block: thorns hit the attacker.',
    power: { when: 'block', then: 'thorns' },
    levels: [{ damage: 8, cooldown: 0.8 }, { damage: 11, cooldown: 0.8 }, { damage: 14, cooldown: 0.8 }, { damage: 17, cooldown: 0.8 }] },
  { id: 'ash-veil', name: 'Ash Veil', rarity: 'common', text: 'Low health: the next blow does {cut} less.',
    perk: { when: 'low', then: 'veil' },
    levels: [{ below: 0.33, cut: 0.4 }, { below: 0.33, cut: 0.5 }, { below: 0.33, cut: 0.6 }, { below: 0.33, cut: 0.7 }] },
  { id: 'bitter-draught', name: 'Bitter Draught', rarity: 'common', text: 'Flask: your next {hits} hits burn.',
    power: { when: 'flask', then: 'burnHits' },
    levels: [{ hits: 3, damage: 9 }, { hits: 4, damage: 9 }, { hits: 5, damage: 9 }, { hits: 6, damage: 9 }] },
  { id: 'grit', name: 'Grit', rarity: 'common', text: 'Get hit: take {cut} less for {time}.',
    perk: { when: 'hurt', then: 'ironSkin' },
    levels: [{ cut: 0.2, time: 1.5 }, { cut: 0.25, time: 1.5 }, { cut: 0.3, time: 1.5 }, { cut: 0.35, time: 1.5 }] },
  { id: 'kindling', name: 'Kindling', rarity: 'common', text: 'Deflect: every key gains {charge} charge.',
    perk: { when: 'parry', then: 'keys' }, levels: [{ charge: 1 }, { charge: 2 }, { charge: 3 }, { charge: 4 }] },
  { id: 'tithe', name: 'Tithe', rarity: 'common', text: 'Finishing Blow: every key gains {charge} charge.',
    perk: { when: 'finisher', then: 'keys' }, levels: [{ charge: 4 }, { charge: 6 }, { charge: 8 }, { charge: 10 }] },
  { id: 'glint', name: 'Glint', rarity: 'common', text: 'A key fills: your next hit does {damage} more.',
    perk: { when: 'ready', then: 'empower' }, levels: [{ damage: 0.4 }, { damage: 0.55 }, { damage: 0.7 }, { damage: 0.85 }] },
  { id: 'hunters-pace', name: "Hunter's Pace", rarity: 'common', text: 'Fight start: free dashes for {time}.',
    perk: { when: 'fightStart', then: 'freeDash' }, levels: [{ time: 4 }, { time: 5 }, { time: 6 }, { time: 7 }] },
  // Offered only in a party (`party: true`): a revive is people only.
  { id: 'kindred-ember', name: 'Kindred Ember', rarity: 'common', party: true, text: 'Revive a friend: they rise with {heal} more health.',
    perk: { when: 'revive', then: 'reviveHeal' }, levels: [{ heal: 0.1 }, { heal: 0.15 }, { heal: 0.2 }, { heal: 0.25 }] },
  { id: 'shatter-guard', name: 'Shatter Guard', rarity: 'common', text: 'Crack a guard: its shards cut the boss.',
    power: { when: 'crack', then: 'shards' }, levels: [{ damage: 22 }, { damage: 28 }, { damage: 34 }, { damage: 40 }] },
  // A specialist's pick: it does nothing against a boss that never shoots (pass 117).
  { id: 'mirror-shard', name: 'Mirror Shard', rarity: 'common', text: 'Deflect a shot: it flies back.',
    power: { when: 'parryShot', then: 'reflect' }, levels: [{ damage: 30 }, { damage: 40 }, { damage: 50 }, { damage: 60 }] },

  // ---- Rares: useful perks that happen when something does ----
  { id: 'counterstep', name: 'Counterstep', rarity: 'rare', text: 'Perfect dodge: flash-step behind the boss.',
    perk: { when: 'dodge', then: 'flashBehind' }, levels: [{ window: 1, cooldown: 3 }, { window: 1.2, cooldown: 2.5 }, { window: 1.4, cooldown: 2 }] },
  { id: 'vengeance', name: 'Vengeance', rarity: 'rare', text: 'Get hit: next hit in {window} does {damage} more.',
    perk: { when: 'hurt', then: 'empower' }, levels: [{ window: 3, damage: 0.3 }, { window: 3, damage: 0.4 }, { window: 3, damage: 0.5 }] },
  { id: 'bloodthirst', name: 'Bloodthirst', rarity: 'rare', text: '{hits} hits unhurt: heal {heal}.',
    perk: { when: 'streak', then: 'heal' }, levels: [{ hits: 5, heal: 0.08 }, { hits: 5, heal: 0.11 }, { hits: 5, heal: 0.14 }] },
  { id: 'last-breath', name: 'Last Breath', rarity: 'rare', text: 'Below {below} health: endless dashes.',
    perk: { when: 'low', then: 'freeDash' }, levels: [{ below: 0.25 }, { below: 0.3 }, { below: 0.35 }] },
  { id: 'opportunist', name: 'Opportunist', rarity: 'rare', text: 'Cracked guard: your hits do {damage} more.',
    perk: { when: 'cracked', then: 'damage' }, levels: [{ damage: 0.25 }, { damage: 0.35 }, { damage: 0.45 }] },
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
  // Batch 10 (design/abilities, Summons I): a fox of blue fire that circles the boss slashing its legs, and a paper
  // lantern at its holder's shoulder that spits fireballs, each that lands healing its holder a sliver.
  { id: 'cinder-fox', name: 'Cinder Fox', rarity: 'rare', key: 'summon', text: 'A fire fox circles the boss for {time}.',
    power: { when: 'press', then: 'fox' },
    levels: [{ charge: 16, time: 8, every: 1, damage: 12, draw: 1 }, { charge: 15, time: 9, every: 0.9, damage: 14, draw: 1.2 },
      { charge: 14, time: 10, every: 0.8, damage: 16, draw: 1.4 }] },
  { id: 'lantern-spirit', name: 'Lantern Spirit', rarity: 'rare', key: 'summon', text: 'A lantern burns the boss and heals you.',
    power: { when: 'press', then: 'lantern' },
    levels: [{ charge: 18, time: 10, every: 1.5, damage: 10, heal: 0.02 }, { charge: 17, time: 11, every: 1.4, damage: 12, heal: 0.025 },
      { charge: 16, time: 12, every: 1.3, damage: 14, heal: 0.03 }] },
  // Batch 11 (design/abilities, Summons II): crows of ink pecking at the boss's head, a bone archer shooting from range,
  // a hawk of lightning stooping from high, and an owl whose marks make anyone's next blow on the boss hit harder.
  { id: 'ink-crows', name: 'Ink Crows', rarity: 'rare', key: 'summon', text: 'Ink crows swarm the boss for {time}.',
    power: { when: 'press', then: 'crows' },
    levels: [{ charge: 18, time: 7, every: 0.25, damage: 5, draw: 1.5 }, { charge: 16, time: 8, every: 0.25, damage: 6, draw: 1.8 },
      { charge: 15, time: 9, every: 0.25, damage: 7, draw: 2 }] },
  { id: 'bone-archer', name: 'Bone Archer', rarity: 'rare', key: 'summon', text: 'A bone archer shoots the boss for {time}.',
    power: { when: 'press', then: 'archer' },
    levels: [{ charge: 17, time: 9, every: 0.9, damage: 14, draw: 0.5 }, { charge: 16, time: 10, every: 0.85, damage: 16, draw: 0.6 },
      { charge: 15, time: 11, every: 0.8, damage: 18, draw: 0.7 }] },
  { id: 'thunder-hawk', name: 'Thunder Hawk', rarity: 'rare', key: 'summon', text: 'A thunder hawk dives on the boss for {time}.',
    power: { when: 'press', then: 'hawk' },
    levels: [{ charge: 18, time: 8, every: 1.6, damage: 26, draw: 1 }, { charge: 17, time: 9, every: 1.5, damage: 30, draw: 1.2 },
      { charge: 16, time: 10, every: 1.4, damage: 34, draw: 1.4 }] },
  { id: 'night-owl', name: 'Night Owl', rarity: 'rare', key: 'summon', text: 'An owl marks the boss; marks take {mark} more.',
    power: { when: 'press', then: 'owl' },
    levels: [{ charge: 16, time: 10, every: 2, mark: 0.7 }, { charge: 15, time: 11, every: 1.8, mark: 0.85 }, { charge: 14, time: 12, every: 1.6, mark: 1 }] },
  // Summons III (design/abilities batch 12, pass 147): a duellist, a coil, a marionette, a bear and a mantis.
  { id: 'ronin-shade', name: 'Ronin Shade', rarity: 'rare', key: 'summon', text: 'A ghost swordsman duels the boss for {time}.',
    power: { when: 'press', then: 'ronin' },
    levels: [{ charge: 20, time: 9, every: 1.4, damage: 22, draw: 3 }, { charge: 18, time: 10, every: 1.3, damage: 26, draw: 3.5 },
      { charge: 16, time: 11, every: 1.2, damage: 30, draw: 4 }] },
  { id: 'mire-serpent', name: 'Mire Serpent', rarity: 'rare', key: 'summon', text: 'A serpent coils round the boss for {time}.',
    power: { when: 'press', then: 'serpent' },
    levels: [{ charge: 20, time: 6, every: 0.5, damage: 9, draw: 2 }, { charge: 18, time: 7, every: 0.5, damage: 10, draw: 2.3 },
      { charge: 16, time: 8, every: 0.5, damage: 11, draw: 2.6 }] },
  { id: 'puppet-knight', name: 'Puppet Knight', rarity: 'rare', key: 'summon', text: 'A puppet knight fights the boss for {time}.',
    power: { when: 'press', then: 'puppet' },
    levels: [{ charge: 20, time: 10, every: 1.3, damage: 20, draw: 3 }, { charge: 18, time: 11, every: 1.2, damage: 24, draw: 3.5 },
      { charge: 16, time: 12, every: 1.1, damage: 28, draw: 4 }] },
  { id: 'ash-bear', name: 'Ash Bear', rarity: 'rare', key: 'summon', text: 'An ash bear mauls the boss for {time}.',
    power: { when: 'press', then: 'bear' },
    levels: [{ charge: 22, time: 8, every: 2, damage: 36, draw: 3 }, { charge: 20, time: 9, every: 1.9, damage: 42, draw: 3.5 },
      { charge: 18, time: 10, every: 1.8, damage: 48, draw: 4 }] },
  { id: 'glass-mantis', name: 'Glass Mantis', rarity: 'rare', key: 'summon', text: 'A glass mantis slices the boss for {time}.',
    power: { when: 'press', then: 'mantis' },
    levels: [{ charge: 18, time: 7, every: 0.8, damage: 16, draw: 1.5 }, { charge: 17, time: 8, every: 0.75, damage: 18, draw: 1.7 },
      { charge: 16, time: 9, every: 0.7, damage: 20, draw: 1.9 }] },
  // Key 1, Strike: a burst of attack on the boss.
  { id: 'fire-burst', name: 'Fire Burst', rarity: 'rare', key: 'strike', text: 'Fire bursts on the boss.',
    power: { when: 'press', then: 'flare' },
    levels: [{ charge: 14, damage: 70 }, { charge: 13, damage: 90 }, { charge: 12, damage: 110 }] },
  { id: 'wind-blade', name: 'Wind Blade', rarity: 'rare', key: 'strike', text: 'A wind blade cuts all in its path.',
    power: { when: 'press', then: 'gale' },
    levels: [{ charge: 16, damage: 80, reach: 12, width: 1.4 }, { charge: 15, damage: 100, reach: 14, width: 1.6 },
      { charge: 14, damage: 120, reach: 16, width: 1.8 }] },
  // Strike I, shapes on the ground (design/abilities batch 6), drawn in blue ink by js/strike-fx.js: a choice of shape
  // (a line, a wide wave, a running line, a spot erupting a beat later, a close cone), not of power.
  { id: 'tidal-arc', name: 'Tidal Arc', rarity: 'rare', key: 'strike', text: 'A wave crashes through all in front.',
    power: { when: 'press', then: 'wave' },
    levels: [{ charge: 16, damage: 80, reach: 10, width: 3 }, { charge: 15, damage: 100, reach: 11, width: 3.2 },
      { charge: 14, damage: 120, reach: 12, width: 3.4 }] },
  { id: 'frost-spike', name: 'Frost Spike', rarity: 'rare', key: 'strike', text: 'A line of ice spikes erupts forward.',
    power: { when: 'press', then: 'spikes' },
    levels: [{ charge: 15, damage: 75, reach: 12 }, { charge: 14, damage: 95, reach: 13 }, { charge: 13, damage: 115, reach: 14 }] },
  { id: 'stone-fist', name: 'Stone Fist', rarity: 'rare', key: 'strike', text: 'A stone fist erupts under the boss.',
    power: { when: 'press', then: 'fist' },
    levels: [{ charge: 17, damage: 100 }, { charge: 16, damage: 125 }, { charge: 15, damage: 150 }] },
  { id: 'rising-fang', name: 'Rising Fang', rarity: 'rare', key: 'strike', text: 'A rising slash throws up blue fire.',
    power: { when: 'press', then: 'risingFire' },
    levels: [{ charge: 15, damage: 85 }, { charge: 14, damage: 105 }, { charge: 13, damage: 125 }] },
  { id: 'thunderclap', name: 'Thunderclap', rarity: 'rare', key: 'strike', text: 'A clap of thunder blasts the front.',
    power: { when: 'press', then: 'clap' },
    levels: [{ charge: 15, damage: 70, reach: 7 }, { charge: 14, damage: 90, reach: 7.5 }, { charge: 13, damage: 110, reach: 8 }] },
  // Strike II, the flashy ones (design/abilities batch 7), in blue ink by js/strike-fx-2.js: a flurry you stand in, a drill
  // that grinds on its own, stabs from the boss's shadow, a blade thrown through and back, clones cutting as one, and the
  // held draw whose line opens a beat later.
  { id: 'sparrow-flurry', name: 'Sparrow Flurry', rarity: 'rare', key: 'strike', text: 'A flurry of {hits} thrusts.',
    power: { when: 'press', then: 'flurry' },
    levels: [{ charge: 15, hits: 10, damage: 9 }, { charge: 14, hits: 12, damage: 10 }, { charge: 13, hits: 14, damage: 10 }] },
  { id: 'whirl-drill', name: 'Whirl Drill', rarity: 'rare', key: 'strike', text: 'A drill of wind grinds the boss.',
    power: { when: 'press', then: 'drill' },
    levels: [{ charge: 16, time: 1.2, every: 0.1, damage: 8 }, { charge: 15, time: 1.3, every: 0.1, damage: 9 }, { charge: 14, time: 1.4, every: 0.1, damage: 10 }] },
  { id: 'shadow-stitch', name: 'Shadow Stitch', rarity: 'rare', key: 'strike', text: "The boss's own shadow stabs it.",
    power: { when: 'press', then: 'stitch' },
    levels: [{ charge: 14, hits: 3, damage: 24 }, { charge: 13, hits: 3, damage: 30 }, { charge: 12, hits: 4, damage: 30 }] },
  { id: 'spinning-blade', name: 'Spinning Blade', rarity: 'rare', key: 'strike', text: 'A ghost blade cuts through the boss twice.',
    power: { when: 'press', then: 'boomerang' },
    levels: [{ charge: 15, damage: 45, hits: 2 }, { charge: 14, damage: 55, hits: 2 }, { charge: 13, damage: 65, hits: 2 }] },
  { id: 'three-shadows', name: 'Three Shadows', rarity: 'rare', key: 'strike', text: 'Shadow clones strike together.',
    power: { when: 'press', then: 'clones' },
    levels: [{ charge: 16, hits: 3, damage: 30 }, { charge: 15, hits: 3, damage: 36 }, { charge: 14, hits: 3, damage: 42 }] },
  { id: 'quick-draw', name: 'Quick Draw', rarity: 'rare', key: 'strike', text: 'Sheathe, then one cut splits all in front.',
    power: { when: 'press', then: 'iai' },
    levels: [{ charge: 18, damage: 120, reach: 10 }, { charge: 17, damage: 145, reach: 11 }, { charge: 16, damage: 170, reach: 12 }] },
  // Key 2, Guard: defence and counters.
  { id: 'mending', name: 'Mending', rarity: 'rare', key: 'guard', text: 'Heal {heal}.',
    perk: { when: 'press', then: 'heal' }, levels: [{ charge: 14, heal: 0.2 }, { charge: 13, heal: 0.25 }, { charge: 12, heal: 0.3 }] },
  { id: 'iron-stance', name: 'Iron Stance', rarity: 'rare', key: 'guard', text: 'Deflect blows for {time}, no timing needed.',
    perk: { when: 'press', then: 'stance' }, levels: [{ charge: 12, time: 2.5 }, { charge: 12, time: 3 }, { charge: 12, time: 3.5 }] },
  // Guard I, on yourself (design/abilities batch 8), in blue ink by js/guard-fx.js (with Mending and Iron Stance above):
  // roots that take the flinch, a flame no blow can put out, a vanish into petals, plates that take whole blows, a pool.
  { id: 'iron-root', name: 'Iron Root', rarity: 'rare', key: 'guard', text: 'For {time}, nothing staggers you; take {cut} less.',
    perk: { when: 'press', then: 'root' }, levels: [{ charge: 13, time: 4, cut: 0.3 }, { charge: 12, time: 4.5, cut: 0.35 }, { charge: 11, time: 5, cut: 0.4 }] },
  { id: 'unbroken', name: 'Unbroken', rarity: 'rare', key: 'guard', text: 'For {time}, no blow can kill you.',
    perk: { when: 'press', then: 'undying' }, levels: [{ charge: 18, time: 3 }, { charge: 17, time: 4 }, { charge: 16, time: 5 }] },
  { id: 'vanishing-step', name: 'Vanishing Step', rarity: 'rare', key: 'guard', text: 'Refill all dashes; vanish for {time}.',
    perk: { when: 'press', then: 'vanish' }, levels: [{ charge: 12, time: 0.6 }, { charge: 11, time: 0.7 }, { charge: 10, time: 0.8 }] },
  { id: 'ember-mail', name: 'Ember Mail', rarity: 'rare', key: 'guard', text: 'Ember armour takes {hits} blows for you.',
    perk: { when: 'press', then: 'armour' }, levels: [{ charge: 15, hits: 1, time: 8 }, { charge: 14, hits: 2, time: 8 }, { charge: 13, hits: 2, time: 10 }] },
  { id: 'still-water', name: 'Still Water', rarity: 'rare', key: 'guard', text: 'A pool heals {heal} over {time}.',
    perk: { when: 'press', then: 'pool' }, levels: [{ charge: 16, time: 5, heal: 0.25, radius: 2.5 }, { charge: 15, time: 5, heal: 0.3, radius: 2.7 }, { charge: 14, time: 5, heal: 0.35, radius: 2.9 }] },
  // Batch 9 (design/abilities, Guard II: on the boss): a pane that bounces the blow back, a husk left to be struck, a dome
  // shots and blasts break on, a stance that answers a blow with a cut, a rewind of place and health, a seal on the next attack.
  { id: 'mirror-ward', name: 'Mirror Ward', rarity: 'rare', key: 'guard', text: 'The next blow bounces back at the boss.',
    perk: { when: 'press', then: 'ward' }, levels: [{ charge: 14, time: 1.5, share: 0.6 }, { charge: 13, time: 1.5, share: 0.8 }, { charge: 12, time: 1.5, share: 1 }] },
  { id: 'ash-husk', name: 'Ash Husk', rarity: 'rare', key: 'guard', text: 'Leave a husk that explodes when struck.',
    power: { when: 'press', then: 'husk' }, levels: [{ charge: 13, time: 3, damage: 40 }, { charge: 12, time: 3, damage: 55 }, { charge: 11, time: 3, damage: 70 }] },
  { id: 'moon-dome', name: 'Moon Dome', rarity: 'rare', key: 'guard', text: 'A dome stops shots and blasts for {time}.',
    perk: { when: 'press', then: 'dome' }, levels: [{ charge: 16, time: 4, radius: 3 }, { charge: 15, time: 4.5, radius: 3.2 }, { charge: 14, time: 5, radius: 3.4 }] },
  { id: 'waiting-blade', name: 'Waiting Blade', rarity: 'rare', key: 'guard', text: 'Stance: the next blow is answered with a cut.',
    perk: { when: 'press', then: 'wait' }, levels: [{ charge: 14, time: 1.2, damage: 120 }, { charge: 13, time: 1.3, damage: 145 }, { charge: 12, time: 1.4, damage: 170 }] },
  { id: 'hourglass', name: 'Hourglass', rarity: 'rare', key: 'guard', text: 'Rewind place and health to {time} ago.',
    perk: { when: 'press', then: 'rewind' }, levels: [{ charge: 18, time: 3 }, { charge: 17, time: 3.5 }, { charge: 16, time: 4 }] },
  { id: 'binding-seal', name: 'Binding Seal', rarity: 'rare', key: 'guard', text: "Seal the boss's next attack.",
    power: { when: 'press', then: 'seal' }, levels: [{ charge: 16, time: 6 }, { charge: 15, time: 7 }, { charge: 14, time: 8 }] },
  { id: 'static-edge', name: 'Static Edge', rarity: 'rare', text: 'Every {hits}th hit: a spark strikes the boss.',
    power: { when: 'hits', then: 'spark' }, levels: [{ hits: 5, damage: 30 }, { hits: 4, damage: 34 }, { hits: 4, damage: 44 }] },

  // ---- Legendaries: one big power each, drawn in its own colour (js/ability-fx.js). Pass 73 (PLAN.md item 11): every
  // effect, sound and camera moment as before; less damage, and longer cooldowns, so one saves a bad
  // fight without carrying a run. No cap on how many a player holds (v7.160.0). ----
  { id: 'meteor-fall', name: 'Meteor Fall', rarity: 'legendary', text: 'Jump heavy: a blast hits all within {radius}.',
    power: { when: 'land', then: 'blast', action: 'heavy' },
    levels: [{ radius: 6, damage: 140, cooldown: 5 }] },
  // Legendaries I (pass 151, design/abilities): Storm King's crown of bolts and Gale Crescent's cage of blades are their
  // own now (the dragon is Thunder Call's, the flying crescent Wind Blade's).
  { id: 'storm-king', name: 'Storm King', rarity: 'legendary', text: 'Full heavy hit: a crown of {strikes} bolts falls.',
    power: { when: 'fullHeavy', then: 'boltCrown' },
    levels: [{ strikes: 6, lead: 0.5, every: 0.12, damage: 34, cooldown: 6 }] },
  { id: 'time-rift', name: 'Time Rift', rarity: 'legendary', text: 'Perfect dodge: the boss freezes for {time}.',
    power: { when: 'dodge', then: 'freeze' },
    levels: [{ time: 2.5, radius: 9, cooldown: 14 }] },
  { id: 'thousand-blades', name: 'Thousand Blades', rarity: 'legendary', text: 'Deflect: swords rain on the boss for {time}.',
    power: { when: 'parry', then: 'blades' },
    levels: [{ time: 4.5, every: 0.15, damage: 6, cooldown: 10 }] },
  { id: 'blood-moon', name: 'Blood Moon', rarity: 'legendary', text: 'Low health: for {time}, hits do more and heal.',
    power: { when: 'low', then: 'bloodMoon', once: true },
    levels: [{ below: 0.33, time: 12, damage: 0.45, drain: 0.35 }] },
  { id: 'gale-crescent', name: 'Gale Crescent', rarity: 'legendary', text: 'Every {hits}th hit: blades whirl round the boss.',
    power: { when: 'hits', then: 'bladeCage' },
    levels: [{ hits: 8, time: 2, every: 0.2, damage: 12 }] },
  { id: 'pyre', name: 'Pyre', rarity: 'legendary', text: 'Counter: fire burns the foe for {time}.',
    power: { when: 'counter', then: 'pyre' },
    levels: [{ time: 4, every: 0.35, damage: 17, cooldown: 2 }] },
  // The first summon: a twin of its holder, made of embers, that fights at the boss's far side and strikes with them.
  { id: 'ember-twin', name: 'Ember Twin', rarity: 'legendary', text: 'Flask: a twin fights with you for {time}.',
    power: { when: 'flask', then: 'twin' },
    levels: [{ time: 20, share: 0.75, draw: 3, cooldown: 20 }] },   // pass 174: ~17% of a mid-run bar a drink (was ~8%)
  // Legendaries II (pass 154, design/abilities batch 14): new triggers. Fourfold `needs` a key-4 ability: offered only to
  // a player who holds one.
  { id: 'hundred-suns', name: 'Hundred Suns', rarity: 'legendary', text: 'Finishing Blow: every cut erupts in sunfire.',
    power: { when: 'finisher', then: 'sunLines' },
    levels: [{ strikes: 6, damage: 45 }] },
  { id: 'thunder-god-step', name: 'Thunder God Step', rarity: 'legendary', text: 'Dashes become lightning that cuts all you pass.',
    power: { when: 'dash', then: 'lightningDash' },
    levels: [{ damage: 120, cooldown: 0.6 }] },   // pass 174: 4 lights a cut (was 1: 4% of a fight's damage)
  { id: 'fourfold', name: 'Fourfold', rarity: 'legendary', text: 'Your Ultimate refills your other keys.', needs: 'ultimate',
    power: { when: 'castUltimate', then: 'refillKeys' },
    levels: [{ share: 1 }] },
  { id: 'shade-host', name: 'Shade Host', rarity: 'legendary', text: 'Perfect dodge: a shadow clone joins for {time}.',
    power: { when: 'dodge', then: 'shadeClone' },
    levels: [{ time: 8, share: 0.6, most: 3, cooldown: 2 }] },   // pass 174 (was 6 s, 0.35: 6% of a fight's damage)
  // Key 4, Ultimate: the longest charge and the biggest moment. Ultimates I (pass 156, design/abilities batch 15), each to
  // Thunder Call's bar of about 8.4 damage a charge point (a hold or an area pays the difference); drawn by js/legend-fx-3.js.
  { id: 'thunder-call', name: 'Thunder Call', rarity: 'legendary', key: 'ultimate', text: 'A lightning dragon strikes the boss {strikes} times.',
    power: { when: 'press', then: 'dragon' },
    levels: [{ charge: 40, strikes: 7, lead: 0.75, every: 0.3, damage: 48 }] },
  { id: 'cataclysm', name: 'Cataclysm', rarity: 'legendary', key: 'ultimate', text: 'A blast hits all within {radius}.',
    power: { when: 'press', then: 'quake' },
    levels: [{ charge: 42, radius: 8, damage: 360 }] },
  { id: 'heavens-lance', name: "Heaven's Lance", rarity: 'legendary', key: 'ultimate', text: 'A pillar of light pins the boss for {time}.',
    power: { when: 'press', then: 'beam' },
    levels: [{ charge: 40, time: 2, every: 0.2, damage: 30 }] },
  { id: 'frozen-lotus', name: 'Frozen Lotus', rarity: 'legendary', key: 'ultimate', text: 'Ice spears the boss for {time}.',
    power: { when: 'press', then: 'iceLotus' },
    levels: [{ charge: 42, time: 3, every: 0.3, damage: 36 }] },
  { id: 'tempest', name: 'Tempest', rarity: 'legendary', key: 'ultimate', text: 'A storm whirls round the boss for {time}.',
    power: { when: 'press', then: 'tempest' },
    levels: [{ charge: 42, time: 5, every: 0.25, damage: 18, radius: 6 }] },
  // Ultimates II (pass 157, design/abilities batch 16), to the same bar; drawn by js/legend-fx-4.js.
  { id: 'great-wave', name: 'Great Wave', rarity: 'legendary', key: 'ultimate', text: 'A wave crashes over all in front.',
    power: { when: 'press', then: 'greatWave' },
    levels: [{ charge: 42, damage: 340, width: 10, reach: 16 }] },
  { id: 'sky-blade', name: 'Sky Blade', rarity: 'legendary', key: 'ultimate', text: 'A sword as tall as a tower falls.',
    power: { when: 'press', then: 'skyBlade' },
    levels: [{ charge: 46, damage: 380 }] },
  { id: 'phoenix-dive', name: 'Phoenix Dive', rarity: 'legendary', key: 'ultimate', text: 'Dive through the boss {strikes} times in fire.',
    power: { when: 'press', then: 'phoenix' },
    levels: [{ charge: 42, strikes: 3, damage: 120 }] },
  { id: 'black-star', name: 'Black Star', rarity: 'legendary', key: 'ultimate', text: 'Holds the boss for {time}, then implodes.',
    power: { when: 'press', then: 'blackStar' },
    levels: [{ charge: 44, time: 1.5, damage: 320, radius: 5 }] },
  // Ultimates III (pass 158, design/abilities batch 17), to the same bar; drawn by js/legend-fx-5.js.
  { id: 'world-of-ink', name: 'World of Ink', rarity: 'legendary', key: 'ultimate', text: 'For {time}, every hit lands twice in ink.',
    power: { when: 'press', then: 'inkWorld' },
    levels: [{ charge: 44, time: 8, share: 1 }] },
  { id: 'severance', name: 'Severance', rarity: 'legendary', key: 'ultimate', text: 'One arena-wide cut hits all on its line.',
    power: { when: 'press', then: 'worldCut' },
    levels: [{ charge: 46, damage: 360 }] },
  { id: 'colossus', name: 'Colossus', rarity: 'legendary', key: 'ultimate', text: 'A giant of embers swings its sword once.',
    power: { when: 'press', then: 'colossus' },
    levels: [{ charge: 46, damage: 340, reach: 14 }] },
  { id: 'ash-legion', name: 'Ash Legion', rarity: 'legendary', key: 'ultimate', text: 'A phantom army charges through the boss.',
    power: { when: 'press', then: 'legion' },
    levels: [{ charge: 44, time: 2.5, every: 0.1, damage: 15 }] },
  // Story's four (pass 159, design/abilities batch 18): rarity `story`, never offered nor in a crate; each given on the
  // road in Story (its chapter's level `giveAbility`) and kept for good. Drawn by js/story-fx.js.
  { id: 'scarlet-draw', name: 'Scarlet Draw', rarity: 'story', key: 'strike', text: 'Your scarf lashes out as a blade.',
    story: { chapter: 2, place: "The Sunken Keep, the Seven's oath hall" },
    power: { when: 'press', then: 'scarfBlade' },
    levels: [{ charge: 14, damage: 120, reach: 12 }] },
  { id: 'oath-guard', name: 'Oath Guard', rarity: 'story', key: 'guard', text: 'A great shield turns and answers every blow.',
    story: { chapter: 5, place: "The Final Castle's chapel, the defaced statue" },
    power: { when: 'press', then: 'oathShield' },
    levels: [{ charge: 16, time: 3, damage: 40 }] },
  { id: 'the-seven', name: 'The Seven', rarity: 'story', key: 'summon', text: 'The Seven rise and strike the boss.',
    story: { chapter: 6, place: 'The Church in the Pass, the painted faces' },
    power: { when: 'press', then: 'seven' },
    levels: [{ charge: 24, time: 9, every: 1, damage: 24, draw: 3 }] },
  { id: 'bell-of-waking', name: 'Bell of Waking', rarity: 'story', key: 'ultimate', text: 'The Bell falls, tolls, and calls the boss down.',
    story: { chapter: 14, place: 'The Still Mere, given by Ysolde' },
    power: { when: 'press', then: 'bellToll' },
    levels: [{ charge: 48, time: 2, damage: 480 }] },

  // ---- Two more rares (pass 71, once crate-only; since PLAN.md item 7 every ability outside the starter set comes from a
  // crate, js/data/crates.js) ----
  { id: 'grave-feast', name: 'Grave Feast', rarity: 'rare', text: 'Finishing Blow: heal {heal}.',
    perk: { when: 'finisher', then: 'heal' }, levels: [{ heal: 0.25 }, { heal: 0.35 }, { heal: 0.45 }] },
  { id: 'iron-mercy', name: 'Iron Mercy', rarity: 'rare', text: 'Deflect: heal {heal}, once per {cooldown}.',
    perk: { when: 'parry', then: 'heal' }, levels: [{ heal: 0.06, cooldown: 3 }, { heal: 0.09, cooldown: 2.5 }, { heal: 0.12, cooldown: 2 }] },

  // ---- The rares' new triggers (design/abilities batch 5), drawn in blue ink (js/rare-strike-fx.js) ----
  { id: 'riptide', name: 'Riptide', rarity: 'rare', text: 'Counter: a wave follows the cut.',
    power: { when: 'counter', then: 'wave' },
    levels: [{ damage: 40, reach: 8, width: 2, cooldown: 0.5 }, { damage: 55, reach: 9, width: 2.2, cooldown: 0.5 }, { damage: 70, reach: 10, width: 2.4, cooldown: 0.5 }] },
  { id: 'moonfall-cut', name: 'Moonfall Cut', rarity: 'rare', text: 'Light jump attack: a moon crescent cuts down.',
    power: { when: 'land', then: 'crescent', action: 'light' },
    levels: [{ damage: 45, cooldown: 4 }, { damage: 60, cooldown: 4 }, { damage: 75, cooldown: 4 }] },
  { id: 'iron-cyclone', name: 'Iron Cyclone', rarity: 'rare', text: 'Heavy finisher: you spin a ring of steel.',
    power: { when: 'comboHeavy', then: 'cyclone' },
    levels: [{ damage: 50, radius: 3, cooldown: 4 }, { damage: 65, radius: 3.3, cooldown: 4 }, { damage: 80, radius: 3.6, cooldown: 4 }] },
  { id: 'petal-storm', name: 'Petal Storm', rarity: 'rare', text: 'Finishing Blow: a storm of petals cuts all near.',
    power: { when: 'finisher', then: 'petals' },
    levels: [{ damage: 80, radius: 5 }, { damage: 110, radius: 5.5 }, { damage: 140, radius: 6 }] },
  { id: 'ironclad', name: 'Ironclad', rarity: 'rare', text: 'Flask: no blow staggers you for {time}.',
    perk: { when: 'flask', then: 'unshaken' }, levels: [{ time: 3 }, { time: 4 }, { time: 5 }] },
  { id: 'hunting-call', name: 'Hunting Call', rarity: 'rare', text: 'Summon strikes: your next hit does {damage} more.',
    perk: { when: 'summonHit', then: 'empower' }, levels: [{ damage: 0.2 }, { damage: 0.3 }, { damage: 0.4 }] },
  { id: 'echoing-blade', name: 'Echoing Blade', rarity: 'rare', text: 'After a key fires: next {hits} hits echo.',
    power: { when: 'cast', then: 'ghostBlade' }, levels: [{ hits: 3, damage: 12 }, { hits: 4, damage: 14 }, { hits: 5, damage: 16 }] },
  { id: 'overcharge', name: 'Overcharge', rarity: 'rare', text: 'A full key overcharges: up to {damage} stronger.',
    perk: { when: 'ready', then: 'overcharge' }, levels: [{ damage: 0.3 }, { damage: 0.45 }, { damage: 0.6 }] },
];
const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(b => [b.id, b]));
