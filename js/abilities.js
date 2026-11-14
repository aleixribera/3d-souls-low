'use strict';
// ============================================================================
// Boss Rush's abilities, the engine half (v7.75.0). The data: js/data/abilities.js. The cards: js/ability-cards.js.
// The legendaries' effects: js/ability-fx.js.
// ============================================================================
// A body's abilities become its kit (abilityKit): the commons' numbers summed into `mods`, the rares' perks by their
// `when/then` and the legendaries' powers. The Player reads its kit where each number lives (js/player.js); the perks
// that touch the body itself (stamina, healing, a charged heavy) run on the body's owner: the browser for a person,
// the server for a bot. Whatever reaches the boss is settled by whoever owns the enemies: abilityStrike for a blow,
// abilityPowers for a legendary. Online that is the server, which knows every player's kit and checks each claim.

// The commons' numbers. `less` cuts its Player number by the fraction; the rest raise theirs.
const ABILITY_MODS = { damage: 'more', maxHp: 'more', maxStamina: 'more', staminaRegen: 'more', posture: 'more',
  parryWindow: 'more', rollCost: 'less', rollIFrames: 'more', flaskSpeed: 'more', chargeSpeed: 'more', riposte: 'more',
  execution: 'more' };
// The rares' perks, as `when/then`, and the numbers each level of one gives:
//   parry/stamina:    a parry gives back `stamina` of the bar.
//   dodge/riposte:    a perfect dodge (a roll's i-frames take a blow) opens a riposte for `window` s, as a parry does.
//   hurt/empower:     losing health makes the next landed blow within `window` s do `damage` more.
//   streak/heal:      `hits` landed blows without losing health heal `heal` of the bar.
//   low/freeStamina:  at or under `below` of the bar, rolls and attacks cost no stamina.
//   open/damage:      blows on a boss that is off balance (abilityOpen) do `damage` more.
//   block/charge:     a blocked blow makes the next heavy within `window` s come out fully charged at once.
//   unhurt/empower:   `after` s without losing health make the next landed blow do `damage` more.
const ABILITY_PERKS = {
  'parry/stamina': ['stamina'], 'dodge/riposte': ['window'], 'hurt/empower': ['window', 'damage'], 'streak/heal': ['hits', 'heal'],
  'low/freeStamina': ['below'], 'open/damage': ['damage'], 'block/charge': ['window'], 'unhurt/empower': ['after', 'damage'],
};
// The legendaries' powers, as `when/then`, and the numbers each level needs (abilityPowers runs them):
//   land/blast:          a jump attack (of the air attack `action` names) lands as a blast: `damage` and `posture` to every
//                        enemy within `radius` m.
//   fullHeavy/lightning: a fully charged heavy that lands calls `strikes` bolts on that enemy, one every `every` s.
//   dodge/freeze:        a perfect dodge stops time for every enemy within `radius` m for `time` s: no step, no blow.
//   parry/blades:        a parry rains blades on the parried enemy for `time` s, one every `every` s.
//   low/bloodMoon:       at or under `below` of the bar, for `time` s the holder's blows do `damage` more and heal
//                        `drain` of what they deal.
// A level's `cooldown` s spaces its triggers; `once: true` fires once a fight.
const ABILITY_POWERS = {
  'land/blast': ['radius', 'damage', 'posture', 'cooldown'], 'fullHeavy/lightning': ['strikes', 'lead', 'every', 'damage', 'posture', 'cooldown'],
  'dodge/freeze': ['time', 'radius', 'cooldown'], 'parry/blades': ['time', 'every', 'damage', 'posture', 'cooldown'],
  'low/bloodMoon': ['below', 'time', 'damage', 'drain'],
};
// The triggers a person's browser reports to the server (the rest it sees itself: a parry or a landed heavy it accepted).
const ABILITY_CLAIMS = ['land', 'dodge', 'low'];

// An ability's level for a list of held ids (one id per pick, repeated by its upgrades), at most its last level.
function abilityLevel(b, held) {
  let n = 0;
  for (const id of held || []) if (id === b.id) n++;
  return Math.min(n, b.levels.length);
}
// The numbers of ability `b` at `level` (1 = the first).
const abilityAt = (b, level) => b.levels[clamp(level, 1, b.levels.length) - 1];

const NO_MODS = Object.freeze(Object.fromEntries(Object.keys(ABILITY_MODS).map(k => [k, 0])));
const NO_KIT = Object.freeze({ ids: Object.freeze([]), mods: NO_MODS, perks: Object.freeze({}), powers: Object.freeze([]), whens: new Set() });
// A body's kit from the ids it holds: { ids, mods: { key: fraction }, perks: { 'when/then': level numbers },
// powers: [{ id, when, then, once, action, v: level numbers }], whens: the triggers it must hear (abilityReport) }.
function abilityKit(held) {
  const ids = (held || []).filter(id => Object.hasOwn(ABILITY_BY_ID, id));
  if (!ids.length) return NO_KIT;
  const mods = { ...NO_MODS }, perks = {}, powers = [], whens = new Set();
  for (const id of new Set(ids)) {
    const b = ABILITY_BY_ID[id], v = abilityAt(b, abilityLevel(b, ids));
    if (b.mods) for (const [key, x] of Object.entries(v)) mods[key] += x;
    if (b.perk) { perks[b.perk.when + '/' + b.perk.then] = v; if (b.perk.when === 'dodge') whens.add('dodge'); }
    if (b.power) { powers.push({ id: b.id, when: b.power.when, then: b.power.then, once: !!b.power.once, action: b.power.action || null, v }); whens.add(b.power.when); }
  }
  for (const key of Object.keys(mods)) if (ABILITY_MODS[key] === 'less') mods[key] = Math.min(mods[key], 1);
  return Object.freeze({ ids: Object.freeze(ids), mods: Object.freeze(mods), perks: Object.freeze(perks), powers: Object.freeze(powers), whens });
}
// A body's perk clocks (on the Player; the server keeps one per person): s since it last lost health (`calm`, reset
// when Patience is spent), Vengeance's and Bastion's s left, the landed blows since it last lost health, and the
// Blood Moon's s left with its level's numbers.
const abilityPerkState = () => ({ calm: 0, vengeance: 0, bastion: 0, streak: 0, moon: 0, moonV: null });
// Off balance, for Opportunist: kneeling, reeling after an execution, opened by a parry, or stopped in time.
const ABILITY_OPEN = new Set([ES.BROKEN, ES.STAGGER, ES.PARRIED, ES.HURT]);
const abilityOpen = e => e.frozen > 0 || ABILITY_OPEN.has(e.state);
// Losing health (any blow, a burn, a fall): the perks that wait for it.
function abilityHurt(kit, st) {
  st.calm = 0; st.streak = 0;
  const v = kit.perks['hurt/empower'];
  if (v) st.vengeance = v.window;
}
function abilityClocks(st, dt) {
  st.calm += dt; st.vengeance = Math.max(0, st.vengeance - dt); st.bastion = Math.max(0, st.bastion - dt); st.moon = Math.max(0, st.moon - dt);
}
// The blow a body lands on `e`, with its kit: damage and posture raised, and the one-shot perks it carries spent.
// Returns `strike` itself when nothing changes it. `strike.riposte` (a parry's or Counterstep's) adds Cold Riposte.
function abilityStrike(kit, st, e, strike) {
  if (kit === NO_KIT && !(st && st.moon > 0)) return strike;
  const m = kit.mods, P = kit.perks;
  let more = m.damage + (strike.riposte ? m.riposte : 0), spent = 0;
  if (P['open/damage'] && abilityOpen(e)) more += P['open/damage'].damage;
  if (st) {
    const hurt = P['hurt/empower'], calm = P['unhurt/empower'];
    if (hurt && st.vengeance > 0) { more += hurt.damage; st.vengeance = 0; spent++; }
    if (calm && st.calm >= calm.after) { more += calm.damage; st.calm = 0; spent++; }
    if (st.moon > 0 && st.moonV) more += st.moonV.damage;
  }
  if (!more && !m.posture) return strike;
  return { ...strike, damage: strike.damage * (1 + more), postureDmg: strike.postureDmg * (1 + m.posture), empowered: spent > 0 };
}
// A blow this body landed (not blocked): Bloodthirst's count, and the Blood Moon's drink. Returns the health it healed.
function abilityLanded(p, strike) {
  const kit = p.kit, st = p.perk, v = kit.perks['streak/heal'];
  let heal = 0;
  if (st.moon > 0 && st.moonV) heal += strike.damage * st.moonV.drain;
  if (v && ++st.streak >= v.hits) { st.streak = 0; heal += p.maxHp * v.heal; events.emit('abilityPerk', { body: p, perk: 'streak/heal' }); }
  if (heal > 0 && p.alive()) p.hp = Math.min(p.hpCap(), p.hp + heal);
  return heal;
}
// A trigger on a body (`when`, an ABILITY_POWERS when or a perk's dodge): told to whoever settles it. A server bot
// sets `onAbility` (its powers run at once); online, the browser claims it from the server (multiplayer.js); alone,
// it runs here.
function abilityReport(body, when, ctx) {
  if (!body.kit || !body.kit.whens.has(when)) return;
  if (body.onAbility) body.onAbility(when, ctx);
  else if (typeof multiplayer !== 'undefined' && multiplayer.active()) multiplayer.abilityClaim(when, ctx);
  else abilityPowers.trigger('self', body, body.kit, when, ctx);
}

// ---- The legendaries' powers ----------------------------------------------------------------------------------------
// Run where the enemies are owned: the server (every player's and bot's), or the game alone. Each power fired emits
// `abilityPower` { power: the ability id, then, holder, body?, enemy?, x, y, z, v: its level's numbers, strike? }:
// the server sends it to every browser and js/ability-fx.js draws it. Lightning emits once more per bolt (`strike`:
// its number), the first `lead` s after it fires (the time its dragon takes to reach the boss), then every `every` s; damage goes through Enemy.takeHit like any blow and `credit` (the server's) counts it to the holder.
const abilityPowers = (() => {
  const running = [];   // { pw, holder, enemy, left, next, n }: the powers still striking (lightning, blades)
  const ready = new Map();   // holder + '/' + ability id -> the clock time it may fire again (Infinity: once, spent)
  let clock = 0;
  const api = { trigger, tick, reset, credit: null, running };
  function reset() { running.length = 0; ready.clear(); clock = 0; }
  // A power's blow: magic, so it comes from behind the enemy's facing (a shield never takes it).
  function wound(e, damage, posture, holder, power) {
    if (!e.alive() || e.invulnerable() || e.netExec || e.state === ES.EXECUTED) return;
    const strike = { attackId: power, air: false, riposte: false, rollOnly: false, shove: false, charge: 0, damage, poise: damage,
      knock: 0, postureDmg: posture, destined: false, hitstop: 0, power: true };
    const from = { x: e.x - Math.sin(e.yaw), y: e.y, z: e.z - Math.cos(e.yaw) };
    const hp = e.hp, res = e.takeHit(strike, from);
    if (!Number.isFinite(e.hp)) e.hp = hp;
    if (api.credit) api.credit(holder, e, hp - e.hp);
    if (res.broke) events.emit('postureBreak', { enemy: e });
  }
  const near = (e, x, y, z, r) => e.alive() && Math.hypot(e.x - x, e.z - z) - e.radius <= r && Math.abs(e.y - y) <= CONFIG.height.reach;
  // `ctx`: { enemy } (the one parried, struck or dodged), { x, y, z } (where), { action } (a jump attack's input).
  function trigger(holder, body, kit, when, ctx = {}) {
    for (const pw of kit.powers) {
      if (pw.when !== when || (pw.action && pw.action !== ctx.action)) continue;
      const key = holder + '/' + pw.id;
      if ((ready.get(key) ?? -Infinity) > clock) continue;
      if (pw.when === 'low' && !(body && body.hp > 0 && body.hp <= body.maxHp * pw.v.below)) continue;
      if (fire(pw, holder, body, ctx)) ready.set(key, pw.once ? Infinity : clock + (pw.v.cooldown || 0));
    }
  }
  function fire(pw, holder, body, ctx) {
    const v = pw.v, at = body || ctx.enemy;
    if (!at) return false;
    const x = ctx.x ?? at.x, y = ctx.y ?? at.y, z = ctx.z ?? at.z, e = ctx.enemy || null, enemies = Game.enemies;
    if ((pw.then === 'lightning' || pw.then === 'blades') && !(e && e.alive())) return false;
    events.emit('abilityPower', { power: pw.id, then: pw.then, holder, body, enemy: e, x, y, z, v });
    switch (pw.then) {
      case 'blast': for (const o of enemies) if (near(o, x, y, z, v.radius)) wound(o, v.damage, v.posture, holder, pw.id); break;
      case 'freeze':
        for (const o of enemies) if (near(o, x, y, z, v.radius)) { o.frozen = Math.max(o.frozen || 0, v.time); o.hitbox = null; }
        break;
      case 'lightning': running.push({ pw, holder, enemy: e, left: v.strikes, next: v.lead, n: 0 }); break;
      case 'blades': running.push({ pw, holder, enemy: e, left: Math.round(v.time / v.every), next: v.every, n: 0 }); break;
      case 'bloodMoon': if (body && body.perk) { body.perk.moon = v.time; body.perk.moonV = v; } break;
    }
    return true;
  }
  function tick(dt) {
    clock += dt;
    for (let i = running.length - 1; i >= 0; i--) {
      const r = running[i], e = r.enemy;
      if ((r.next -= dt) > 0) continue;
      if (!e.alive()) { running.splice(i, 1); continue; }
      r.next += r.pw.v.every; r.left--; r.n++;
      if (r.pw.then === 'lightning') events.emit('abilityPower', { power: r.pw.id, then: r.pw.then, holder: r.holder, enemy: e, x: e.x, y: e.y, z: e.z, v: r.pw.v, strike: r.n });
      wound(e, r.pw.v.damage, r.pw.v.posture, r.holder, r.pw.id);
      if (r.left <= 0) running.splice(i, 1);
    }
  }
  return api;
})();
