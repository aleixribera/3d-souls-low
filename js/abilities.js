'use strict';
// ============================================================================
// Boss Rush's abilities, the engine half (v7.75.0). The data: js/data/abilities.js. The cards: js/ability-cards.js.
// The legendaries' effects: js/ability-fx.js.
// ============================================================================
// A body's abilities become its kit (abilityKit): the commons' numbers summed into `mods`, the rares' perks by their
// `when/then` and the legendaries' powers. The Player reads its kit where each number lives (js/player.js); the perks
// that touch the body itself (healing, a charged heavy) run on the body's owner: the browser for a person,
// the server for a bot. Whatever reaches the boss is settled by whoever owns the enemies: abilityStrike for a blow,
// abilityPowers for a legendary. Online that is the server, which knows every player's kit and checks each claim.

// The commons' numbers. `less` cuts its Player number by the fraction; the rest raise theirs.
const ABILITY_MODS = { damage: 'more', maxHp: 'more', counterWindow: 'more',
  parryWindow: 'more', dashRefill: 'more', rollIFrames: 'more', flaskSpeed: 'more', chargeSpeed: 'more', riposte: 'more',
  finisher: 'more' };
// The rares' perks, as `when/then`, and the numbers each level of one gives:
//   dodge/flashBehind: a perfect dodge (a roll's i-frames take a blow) flash-steps its holder behind the attacker
//                     (Player.flashBehind, CONFIG.abilities.flashBehind) and opens the counter for `window` s; once every
//                     `cooldown` s (a dodge inside it opens the plain counter). No step to a wall or a drop, the window all the same
//                     (the server can't see the step: js/lobby-sim.js stepDodge).
//   hurt/empower:     losing health makes the next landed blow within `window` s do `damage` more.
//   streak/heal:      `hits` landed blows without losing health heal `heal` of the bar.
//   low/freeDash:     at or under `below` of the bar, dashes take no charge (pass 85: nothing else costs anything).
//   cracked/damage:   blows on an enemy whose guard shows a crack (`e.cracks` > 0) do `damage` more.
//   block/charge:     a blocked blow makes the next heavy within `window` s come out fully charged at once.
//   unhurt/empower:   `after` s without losing health make the next landed blow do `damage` more.
//   finisher/heal:    a Finishing Blow heals `heal` of the bar (a crate's).
//   parry/heal:       a parry heals `heal` of the bar, at most once every `cooldown` s (a crate's).
//   press/heal:       pressed (its key full: `charge` points): heals `heal` of the bar.
//   press/stance:     pressed: for `time` s every blow that can be deflected is, as if timed (canDeflectNow).
// The commons' perks (design/abilities batch 3, the guard and the run), each on its holder's own body:
//   parry/freeDash:      a deflect banks one free dash (the next dash costs no charge), at most once every `cooldown` s.
//   low/veil:            once a fight, at or under `below` of the bar: the next enemy blow does `cut` less.
//   hurt/ironSkin:       losing health: for `time` s enemy blows do `cut` less (not renewed while it holds).
//   parry/keys:          a deflect gives every key `charge` more points.
//   finisher/keys:       a Finishing Blow gives every key `charge` more points.
//   ready/empower:       a key filling makes the next landed blow do `damage` more (no time limit; never stacks).
//   fightStart/freeDash: the fight begins (the holder first moves or acts): dashes cost no charge for `time` s.
//   revive/reviveHeal:   a friend this holder revives rises with `heal` more of their bar (the server's, a party's only).
// Batch 5 (the rares' new triggers), drawn by js/rare-strike-fx.js:
//   flask/unshaken:   a drink begun: for `time` s no blow flinches, staggers, knocks back or cuts a drink short (its
//                     damage lands all the same). Perk clock `unshaken`.
//   summonHit/empower: a blow of the holder's summon that strikes on its own (SUMMON_STRIKERS) marks that enemy for
//                     CONFIG.abilities.mark.keep s: the holder's next landed blow on it does `damage` more. A new mark
//                     replaces the old; it never stacks. Perk clocks `mark` (the enemy) and `markT`.
//   ready/overcharge: a full key keeps filling past full, up to CONFIG.abilities.overcharge.most of its `charge` more
//                     (abilityGain); a press fires its technique raised by `damage` x the share filled past full
//                     (abilityOver): a power's `damage`, a Guard's `heal`. Times, reaches and radii stay.
const ABILITY_PERKS = {
  'dodge/flashBehind': ['window', 'cooldown'], 'hurt/empower': ['window', 'damage'], 'streak/heal': ['hits', 'heal'],
  'low/freeDash': ['below'], 'cracked/damage': ['damage'], 'block/charge': ['window'], 'unhurt/empower': ['after', 'damage'],
  'finisher/heal': ['heal'], 'parry/heal': ['heal', 'cooldown'], 'press/heal': ['charge', 'heal'], 'press/stance': ['charge', 'time'],
  'parry/freeDash': ['cooldown'], 'low/veil': ['below', 'cut'], 'hurt/ironSkin': ['cut', 'time'], 'parry/keys': ['charge'],
  'finisher/keys': ['charge'], 'ready/empower': ['damage'], 'fightStart/freeDash': ['time'], 'revive/reviveHeal': ['heal'],
  'flask/unshaken': ['time'], 'summonHit/empower': ['damage'], 'ready/overcharge': ['damage'],
};
// The `abilityPerk` cues of the commons' perks: drawn in bone ink (js/common-fx.js), never a camera kick (camera-feel.js).
const COMMON_PERKS = new Set(['parry/freeDash', 'freeDash/spent', 'low/veil', 'veil/spent', 'hurt/ironSkin', 'ironSkin/glance',
  'parry/keys', 'finisher/keys', 'ready/empower', 'glint/spent', 'fightStart/freeDash']);
// The rares' state cues (batch 4: a mote, a lit blade, a breath), drawn by js/rare-fx.js but too frequent or too quiet
// for the rares' camera kick (camera-feel.js).
const RARE_QUIET_PERKS = new Set(['streak/step', 'streak/lost', 'hurt/armed', 'unhurt/ready', 'low/freeDash', 'block/armed', 'cracked/damage',
  'unshaken/glance', 'overcharge/step']);
// A key's extra points from a commons' `<when>/keys` perk (Kindling's deflect, Tithe's Finishing Blow).
const abilityKeysFor = (kit, when) => (kit.perks[when + '/keys'] || {}).charge || 0;
// A heal of `share` of the bar from a perk (Grave Feast, Iron Mercy), told as that perk (`target`: the enemy it came from).
function abilityHeal(p, share, perk, target = null) {
  if (!p.alive()) return;
  p.hp = Math.min(p.hpCap(), p.hp + p.maxHp * share);
  events.emit('abilityPerk', { body: p, perk, target });
}
// The legendaries' powers, as `when/then`, and the numbers each level needs (abilityPowers runs them):
//   land/blast:          a jump attack (of the air attack `action` names) lands as a blast: `damage` to every
//                        enemy within `radius` m.
//   fullHeavy/lightning: a fully charged heavy that lands calls `strikes` bolts on that enemy, one every `every` s.
//   dodge/freeze:        a perfect dodge stops time for every enemy within `radius` m for `time` s: no step, no blow.
//   parry/blades:        a parry rains blades on the parried enemy for `time` s, one every `every` s.
//   low/bloodMoon:       at or under `below` of the bar, for `time` s the holder's blows do `damage` more and heal
//                        `drain` of what they deal.
//   parry/flare:         a parry bursts into fire on the parried enemy: `damage` (a rare's).
//   hits/spark:          every `hits`th blow the holder lands, a spark strikes that enemy (a rare's).
//   hits/gale:           every `hits`th blow the holder lands, a crescent of wind flies from them through that enemy
//                        and on, `reach` m in all: `damage` to every enemy within `width` m of its path.
//   counter/pyre:        a counter of the holder's that lands (a riposte's blow) lights a pillar of fire under the enemy
//                        for `time` s, burning it every `every` s.
//   flask/twin:          a summon. Drinking a flask calls an ember twin of the holder for `time` s; every blow the
//                        holder lands in that time, the twin lands too, on the enemy's far side: `share` of its
//                        damage.
//   press/hound:         a summon (a rare's, key 3). Pressed, a grave hound comes out of the holder's shadow for `time`
//                        s: it runs round the enemy's flank and bites it every `every` s (`damage`).
//   low/guardian:        a summon (a rare's, once a fight). Dropping under `below` of its health raises a guardian of
//                        stone beside the nearest enemy for `time` s: it holds that enemy's eye `draw` s and bashes it
//                        every `every` s.
//   press/lancer:        a summon (a rare's, key 3). Pressed, a lancer of ash charges the enemy for `time` s, thrusting
//                        every `every` s.
//   press/flare, press/gale, press/blades, press/lightning, press/blast: pressed (key 1 or 4), the power of that name
//                        on the enemy (the blast round its holder).
// The effect commons (design/abilities, batch 2: the blade), each a small blow of `damage` (CONFIG.abilities.commons):
//   dashPast/spark:      a dash that went past an enemy (dashPastOf) sparks it, once every `cooldown` s.
//   stringEnd/lick:      the last blow of a full light string (an attack with `stringEnd`) licks that enemy with flame.
//   fullHeavy/molten:    a fully charged heavy that lands sprays molten sparks into that enemy.
//   dashStrike/lateCut:  a dash attack that lands: its cut opens again on that enemy `lateCut` s later.
//   dodge/afterimage:    a perfect dodge: `imageDelay` s later the afterimage left where the holder stood strikes the
//                        dodged enemy, if it is within `imageReach` m of that place.
//   jump/whirl:          a jump with an enemy close by: a dust whirl cuts every enemy within `whirlRadius` m of the
//                        take-off, once every `cooldown` s.
// Batch 3 (the guard and the run):
//   block/thorns:        an enemy's blow on the raised guard, from within `thornReach` m: thorns hit that enemy.
//   flask/burnHits:      a flask lights the holder's next `hits` landed blows (perk clocks `burn`, renewed, not added):
//                        each burns its enemy for `damage` more, told as a `strike`.
//   crack/shards:        a blow of the holder's cracks an enemy's guard: `shardDelay` s later its shards cut it.
// Batch 5 (the rares' new triggers), drawn in blue ink by js/rare-strike-fx.js:
//   counter/wave:        a counter that lands drives a wave from the holder through that enemy and on, `reach` m in all:
//                        `damage` to every enemy within `width` m of its path (gale's line). One a swing: its `cooldown`
//                        outlasts a counter's blow, which may land on several.
//   land/crescent:       a jump attack (of the air attack `action` names) lands: a crescent cuts the line ahead of the
//                        holder's facing, CONFIG.abilities.crescent's `reach` by `width` m: `damage` to each enemy in it.
//   comboHeavy/cyclone:  the heavy that ends a light string (isComboHeavy) reaches its blow, landed or not: a ring of
//                        steel cuts every enemy within `radius` m of the holder.
//   finisher/petals:     a Finishing Blow ends: petals cut every enemy within `radius` m of the finished one (it too,
//                        when it lives and can be hurt).
//   cast/ghostBlade:     any number key fires (a press, a power's or a Guard's): the holder's next `hits` landed blows
//                        within CONFIG.abilities.echo.keep s each land again CONFIG.abilities.echo.delay s later on that
//                        enemy, `damage` a blow. A new press re-arms it to `hits`. An echo is a power's strike: never a
//                        blow, never echoed, never another power's trigger.
// Batch 6 (Strike I: shapes on the ground), key 1, aimed at the press's enemy; drawn by js/strike-fx.js:
//   press/wave:          a wave from the holder through that enemy and on (Riptide's line): `reach` m, `width` either side.
//   press/spikes:        a line of ice from the holder toward that enemy, `reach` m long, CONFIG.abilities.spikes.width
//                        m either side; its front runs out at `spikes.speed` m/s and wounds each enemy once as it reaches
//                        it, if that enemy is still on the line.
//   press/fist, press/risingFire: the enemy's spot is marked; CONFIG.abilities.<then>.delay s later every enemy within
//                        its `radius` m of that spot is wounded (one that left the spot in that beat is missed).
//   press/clap:          the holder turns to that enemy, which must be within `reach` m (else the key keeps its charge:
//                        pressOpen): every enemy within `reach` m and CONFIG.abilities.clap.angle degrees round that
//                        way is wounded at once.
// Batch 7 (Strike II: the flashy ones), key 1, aimed at the press's enemy; drawn by js/strike-fx-2.js. A held strike
// (flurry, iai) roots its holder (Player.root); here it ends when the holder moves more than CONFIG.abilities.rootSlip
// m from where it pressed, or loses health: a dash out or a blow taken cuts it short (told as `end`).
//   press/flurry:        the enemy within CONFIG.abilities.flurry.reach m (pressOpen): `hits` thrusts spread over
//                        `flurry.time` s, each wounding it while it is still in reach (told as a `strike`).
//   press/drill:         CONFIG.abilities.drill.lead s on, it grinds the enemy `time` / `every` times, `every` s apart.
//   press/stitch:        `hits` stabs from the enemy's shadow, the first `stitch.lead` s on, then every `stitch.every`
//                        s (each told as a `strike`).
//   press/boomerang:     a blade flies from the holder through the enemy to `boomerang.past` m beyond it and back, in
//                        `boomerang.time` s: `hits` passes, each wounding every enemy within `boomerang.width` m of
//                        its path once as it goes by. It returns to where the holder pressed.
//   press/clones:        `clones.lead` s on, the enemy is wounded `hits` times at once (the clones are only drawn).
//   press/iai:           a stance of `iai.stance` s (cut short, the key gets its charge back: `end: 'cancel'`); then
//                        the draw (`strike` 1, with its `path`): every enemy within `iai.width` m of a line `reach` m
//                        from the holder toward the enemy is marked, and `iai.beat` s later each still alive is
//                        wounded (`strike` 2).
// A summon (CONFIG.abilities.summons) stands at its own place round the enemy, worked out here, where the enemies are
// owned. Once it has arrived it draws that enemy's eye for `draw` s: the enemy fights it instead of anyone (it can't be
// hurt), and an attack begun on it is finished on it. One summon a holder at a time: another kind's call waits until
// it has gone (no cooldown spent); the same kind's call renews it.
// A level's `cooldown` s spaces its triggers; `once: true` fires once a fight. Blows counted (`hits`) are the
// holder's own landed and unblocked; a power's own strikes never count, nor set off another power.
const ABILITY_POWERS = {
  'land/blast': ['radius', 'damage', 'cooldown'], 'fullHeavy/lightning': ['strikes', 'lead', 'every', 'damage', 'cooldown'],
  'dodge/freeze': ['time', 'radius', 'cooldown'], 'parry/blades': ['time', 'every', 'damage', 'cooldown'],
  'low/bloodMoon': ['below', 'time', 'damage', 'drain'], 'parry/flare': ['damage', 'cooldown'],
  'hits/spark': ['hits', 'damage'], 'hits/gale': ['hits', 'damage', 'reach', 'width'],
  'counter/pyre': ['time', 'every', 'damage', 'cooldown'], 'flask/twin': ['time', 'share', 'draw', 'cooldown'],
  'press/hound': ['charge', 'time', 'every', 'damage', 'draw'], 'low/guardian': ['below', 'time', 'every', 'damage', 'draw'],
  'press/lancer': ['charge', 'time', 'every', 'damage', 'draw'],
  'press/flare': ['charge', 'damage'], 'press/gale': ['charge', 'damage', 'reach', 'width'],
  'press/blades': ['charge', 'time', 'every', 'damage'], 'press/lightning': ['charge', 'strikes', 'lead', 'every', 'damage'],
  'press/blast': ['charge', 'radius', 'damage'],
  'dashPast/spark': ['damage', 'cooldown'], 'stringEnd/lick': ['damage'], 'fullHeavy/molten': ['damage'],
  'dashStrike/lateCut': ['damage'], 'dodge/afterimage': ['damage'], 'jump/whirl': ['damage', 'cooldown'],
  'block/thorns': ['damage', 'cooldown'], 'flask/burnHits': ['hits', 'damage'], 'crack/shards': ['damage'],
  'parryShot/reflect': ['damage'],
  'counter/wave': ['damage', 'reach', 'width', 'cooldown'], 'land/crescent': ['damage', 'cooldown'], 'comboHeavy/cyclone': ['damage', 'radius', 'cooldown'],
  'finisher/petals': ['damage', 'radius'], 'cast/ghostBlade': ['hits', 'damage'],
  'press/wave': ['charge', 'damage', 'reach', 'width'], 'press/spikes': ['charge', 'damage', 'reach'], 'press/fist': ['charge', 'damage'],
  'press/risingFire': ['charge', 'damage'], 'press/clap': ['charge', 'damage', 'reach'],
  'press/flurry': ['charge', 'hits', 'damage'], 'press/drill': ['charge', 'time', 'every', 'damage'], 'press/stitch': ['charge', 'hits', 'damage'],
  'press/boomerang': ['charge', 'damage', 'hits'], 'press/clones': ['charge', 'hits', 'damage'], 'press/iai': ['charge', 'damage', 'reach'],
};
// The heavies that end a light string: every attack some attack's `next.heavy` leads to (Iron Cyclone's `comboHeavy`).
let comboHeavies = null;
function isComboHeavy(a) {
  if (!comboHeavies) comboHeavies = new Set(Object.values(PLAYER_DEF.moveset.attacks).map(x => x.next && x.next.heavy).filter(Boolean));
  return !!a && comboHeavies.has(a.id);
}
const SUMMONS = new Set(['twin', 'hound', 'guardian', 'lancer']);
// The summons that strike on their own, every `every` s from `reach` m off their enemy's body (the twin echoes its holder).
const SUMMON_STRIKERS = new Set(['hound', 'guardian', 'lancer']);
// Where summon `s` (its `kind`, `x`, `z`) heads round enemy `e` with its holder at `body`: `gap` m off the enemy's
// body, `flank` rad round from its side away from the holder (CONFIG.abilities.summons); with no enemy, beside the
// holder. It runs there at up to `speed` m/s and faces the enemy. The engine moves the real one; js/ability-fx.js and
// js/summon-hound.js and js/summon-figures.js move the drawn one by the same rule. Returns the distance it still has to go.
function summonStep(s, e, body, dt) {
  const K = CONFIG.abilities.summons, S = K[s.kind];
  let x, z;
  if (e) {
    const dx = body ? e.x - body.x : Math.sin(e.yaw), dz = body ? e.z - body.z : Math.cos(e.yaw), l = Math.hypot(dx, dz) || 1;
    const c = Math.cos(S.flank), sn = Math.sin(S.flank), fx = dx / l, fz = dz / l, r = (e.radius || 1) + S.gap;
    x = e.x + (fx * c - fz * sn) * r; z = e.z + (fx * sn + fz * c) * r;
  } else if (body) { x = body.x + Math.cos(body.yaw || 0) * K.side; z = body.z - Math.sin(body.yaw || 0) * K.side; }
  else return 0;
  const gx = x - s.x, gz = z - s.z, far = Math.hypot(gx, gz), go = Math.min(far, S.speed * dt);
  if (far > 1e-6) { s.x += gx / far * go; s.z += gz / far * go; }
  const tx = e ? e.x - s.x : gx, tz = e ? e.z - s.z : gz;
  if (Math.hypot(tx, tz) > 1e-4) s.yaw = Math.atan2(tx, tz);
  return far - go;
}
// The triggers a person's browser reports to the server (the rest it sees itself: a parry, a landed blow, a counter).
// A press is a key's power fired (below); the server checks it against its own count of that key's charge.
// `parryShot` (Mirror Shard): a bolt deflected; each browser flies the shots at its own player (js/projectiles.js).
// `comboHeavy` (Iron Cyclone): a string's heavy reached its blow, landed or not (a whiff the server can't see).
const ABILITY_CLAIMS = ['land', 'dodge', 'low', 'flask', 'press', 'dashPast', 'jump', 'block', 'parryShot', 'comboHeavy'];
// The enemy a dash from `from` to `to` (each { x, z }) went past (Spark Step's `dashPast`): the nearest live one whose
// body's edge came within `gap` m of the path at a point strictly between its ends (past it, not into it), else null.
function dashPastOf(from, to, enemies, gap = CONFIG.abilities.commons.pastGap) {
  const dx = to.x - from.x, dz = to.z - from.z, len2 = dx * dx + dz * dz;
  if (len2 < 0.25) return null;   // under half a metre: no dash to speak of
  let best = null, near = Infinity;
  for (const e of enemies) {
    if (!e.alive() || e.invulnerable()) continue;
    const t = ((e.x - from.x) * dx + (e.z - from.z) * dz) / len2;
    if (!(t > 0.02 && t < 0.98)) continue;
    const d = Math.hypot(from.x + dx * t - e.x, from.z + dz * t - e.z) - (e.radius || 0);
    if (d <= gap && d < near) { near = d; best = e; }
  }
  return best;
}
// The nearest live enemy whose body is within `r` m of (x, y, z) (Dust Devil's take-off), else null.
function enemyNear(enemies, x, y, z, r) {
  let best = null, near = Infinity;
  for (const e of enemies) {
    if (!e.alive() || e.invulnerable() || Math.abs(e.y - y) > CONFIG.height.reach) continue;
    const d = Math.hypot(e.x - x, e.z - z) - (e.radius || 0);
    if (d <= r && d < near) { near = d; best = e; }
  }
  return best;
}

// ---- The number keys (PLAN.md, the player rework's controls) --------------------------------------------------------
// A pressed ability (`key` in its data, `when: 'press'`) belongs to one of four keys, always the same one: 1 Strike, 2
// Guard, 3 Summon, 4 Ultimate (the `ability1`..`ability4` bindings, js/input.js). A body holds at most one per key.
// Each fills its own charge from playing well (CONFIG.abilities.press.gain: landed blows, more for a finisher, a full
// charge or a riposte; deflects, perfect dodges, Finishing Blows) up to its level's `charge`, and its key fires it when full.
// The charge lives in the perk clocks (`charge`, one count per key): on the body for its owner, and on the server for
// a person, counted from the claims it accepted, so a press is checked against it.
const ABILITY_KEYS = ['strike', 'guard', 'summon', 'ultimate'];
const ABILITY_KEY_NAMES = { strike: 'Strike', guard: 'Guard', summon: 'Summon', ultimate: 'Ultimate' };
// The points a landed blow of `strike` gives toward every key: more for a finisher, a full charge or a riposte.
function pressGain(strike) {
  const G = CONFIG.abilities.press.gain, a = PLAYER_DEF.moveset.attacks[strike.attackId];
  return G.hit + (strike.riposte || a && (a.charge && strike.charge >= 1 || a.feel === 'heavy') ? G.skill : 0);   // a charge counts only on a chargeable attack
}
// `n` points toward each key the kit holds, each up to its ability's `charge`.
// Returns true when a key filled just now woke Glint (`ready/empower`, not already waiting).
// Overcharge (`ready/overcharge`) lets a full key run on past full, up to CONFIG.abilities.overcharge.most of its charge more.
function abilityGain(kit, st, n) {
  let filled = false;
  const most = kit.perks['ready/overcharge'] ? 1 + CONFIG.abilities.overcharge.most : 1;
  for (const key in kit.pressed) {
    const full = kit.pressed[key].v.charge, was = st.charge[key];
    st.charge[key] = Math.min(full * most, was + n);
    if (was < full && st.charge[key] >= full) filled = true;
  }
  if (!filled || !kit.perks['ready/empower'] || st.glint) return false;
  st.glint = 1; return true;
}
// Overcharge: the share (0 to 1) key `key` has filled past full, by `st`'s count (0 without the perk).
function abilityOver(kit, st, key) {
  const slot = kit.pressed[key];
  if (!slot || !kit.perks['ready/overcharge'] || !st) return 0;
  return Math.max(0, Math.min(1, (st.charge[key] - slot.v.charge) / (slot.v.charge * CONFIG.abilities.overcharge.most)));
}
// What Overcharge raises a press by: 1 + its `damage` x the share past full.
const abilityOverBy = (kit, over) => 1 + (over > 0 && kit.perks['ready/overcharge'] ? kit.perks['ready/overcharge'].damage * over : 0);
// The enemy a press strikes: the locked one if alive and in reach, else the nearest live one in reach (null: none).
// One that can't be hurt now (between phases, held through a Finishing Blow) is passed over.
function pressTarget(body, enemies, lock) {
  const R = CONFIG.abilities.press.range, dist = e => Math.hypot(e.x - body.x, e.z - body.z) - (e.radius || 0);
  const open = e => e.alive() && !e.netExec && e.state !== ES.EXECUTED && !e.invulnerable();
  if (lock && open(lock) && dist(lock) <= R) return lock;
  let best = null, near = R;
  for (const e of enemies) if (open(e) && dist(e) <= near) { near = dist(e); best = e; }
  return best;
}
// The pressed powers whose enemy must stand within reach of the holder: the level's `reach` m (Thunderclap's cone), else
// CONFIG.abilities.<then>.reach (Sparrow Flurry's). Their holder turns to that enemy as it presses, as Quick Draw's does.
const PRESS_NEAR = new Set(['clap', 'spikes', 'flurry']);
const PRESS_TURN = new Set([...PRESS_NEAR, 'iai']);
// The s a pressed power roots its holder in place (Player.root): its flurry, its stance; 0 for the rest.
const pressRoot = then => then === 'flurry' ? CONFIG.abilities.flurry.time : then === 'iai' ? CONFIG.abilities.iai.stance : 0;
// Whether key `slot` may fire now at enemy `e` (pressTarget's): a power needing an enemy has one, and one that needs it
// near has it within `reach` m. Else the key keeps its charge (the browser's press and the server's claim alike). The
// server passes `slack` m more: its pose of the player lags the browser's, and a press the browser spent must not be lost.
function pressOpen(slot, body, e, slack = 0) {
  if (!slot.power) return true;
  if (ON_ENEMY.has(slot.then) && !e) return false;
  return !PRESS_NEAR.has(slot.then) || (!!e && Math.hypot(e.x - body.x, e.z - body.z) - (e.radius || 0) <= (slot.v.reach ?? CONFIG.abilities[slot.then].reach) + slack);
}
// The input actions of the four keys, in ABILITY_KEYS order (js/input.js binds them).
const ABILITY_ACTIONS = ['ability1', 'ability2', 'ability3', 'ability4'];
// A pressed perk on its holder's body (Guard's): a heal, or the deflecting stance.
function abilityPressPerk(p, slot, over = 0) {
  if (slot.then === 'heal') abilityHeal(p, Math.min(1, slot.v.heal * abilityOverBy(p.kit, over)), 'press/heal');
  else if (slot.then === 'stance') { p.perk.stance = slot.v.time; events.emit('abilityPerk', { body: p, perk: 'press/stance' }); }
}

// An ability's level for a list of held ids (one id per pick, repeated by its upgrades), at most its last level.
function abilityLevel(b, held) {
  let n = 0;
  for (const id of held || []) if (id === b.id) n++;
  return Math.min(n, b.levels.length);
}
// The numbers of ability `b` at `level` (1 = the first).
const abilityAt = (b, level) => b.levels[clamp(level, 1, b.levels.length) - 1];

const NO_MODS = Object.freeze(Object.fromEntries(Object.keys(ABILITY_MODS).map(k => [k, 0])));
const NO_KIT = Object.freeze({ ids: Object.freeze([]), mods: NO_MODS, perks: Object.freeze({}), powers: Object.freeze([]), whens: new Set(), pressed: Object.freeze({}) });
// A body's kit from the ids it holds: { ids, mods: { key: fraction }, perks: { 'when/then': level numbers },
// powers: [{ id, when, then, once, action, key, v: level numbers }], whens: the triggers it must hear (abilityReport),
// pressed: { key: { id, then, power (true: settled where the enemies are), v } }, one a key: the first held }.
function abilityKit(held) {
  const ids = (held || []).filter(id => Object.hasOwn(ABILITY_BY_ID, id));
  if (!ids.length) return NO_KIT;
  const mods = { ...NO_MODS }, perks = {}, powers = [], whens = new Set(), pressed = {};
  for (const id of new Set(ids)) {
    const b = ABILITY_BY_ID[id], v = abilityAt(b, abilityLevel(b, ids));
    if (b.key) {   // a key's ability: fired by its key only (a second one for the same key, never offered, is idle)
      if (!pressed[b.key]) pressed[b.key] = Object.freeze({ id: b.id, then: (b.perk || b.power).then, power: !!b.power, v });
      if (b.perk || pressed[b.key].id !== b.id) continue;
    }
    if (b.mods) for (const [key, x] of Object.entries(v)) mods[key] += x;
    if (b.perk) { perks[b.perk.when + '/' + b.perk.then] = v; if (b.perk.when === 'dodge') whens.add('dodge'); }
    if (b.power) {
      powers.push({ id: b.id, when: b.power.when, then: b.power.then, once: !!b.power.once, action: b.power.action || null, key: b.key || null, v });
      whens.add(b.power.when);
      if (b.power.then === 'twin' || b.power.then === 'burnHits') whens.add('hits');   // the twin strikes, the burn burns, as its holder lands a blow
      if (b.power.when === 'cast') { whens.add('press'); whens.add('hits'); }   // Echoing Blade: armed by any press, spent by landed blows
    }
  }
  for (const key of Object.keys(mods)) if (ABILITY_MODS[key] === 'less') mods[key] = Math.min(mods[key], 1);
  return Object.freeze({ ids: Object.freeze(ids), mods: Object.freeze(mods), perks: Object.freeze(perks), powers: Object.freeze(powers), whens, pressed: Object.freeze(pressed) });
}
// How much a kit of `held` ids weighs on a fight (CONFIG.swift.might): each pick (a level) of an ability adds its rarity's
// might. Boss Rush's par is divided by 1 + the party's.
function kitMight(held) {
  let n = 0;
  for (const id of held || []) { const b = Object.hasOwn(ABILITY_BY_ID, id) && ABILITY_BY_ID[id]; if (b) n += CONFIG.swift.might[b.rarity] || 0; }
  return n;
}
// A body's perk clocks (on the Player; the server keeps one per person): s since it last lost health (`calm`, reset
// when Patience is spent), Vengeance's and Bastion's s left, the landed blows since it last lost health, and the
// Blood Moon's s left with its level's numbers, Iron Mercy's s until it heals again, the deflecting stance's s left,
// each number key's charge (points), and the commons': Ringing Steel's banked dash (`bank`, 0 or 1) and s until it may
// bank again (`ring`), Ash Veil's state (`veil`: 0 idle, 1 on, 2 spent), Grit's s left (`iron`), Hunter's Pace's s
// left (`hunt`), Glint's waiting blow (`glint`, 0 or 1), Bitter Draught's burning blows left with its level (`burn`, `burnV`),
// Counterstep's s until it may step again (`step`), Ironclad's s left (`unshaken`), Hunting Call's marked enemy and s left
// (`mark`, `markT`).
const abilityPerkState = () => ({ calm: 0, vengeance: 0, bastion: 0, streak: 0, moon: 0, moonV: null, mercy: 0, stance: 0,
  charge: { strike: 0, guard: 0, summon: 0, ultimate: 0 }, bank: 0, ring: 0, veil: 0, iron: 0, hunt: 0, glint: 0, burn: 0, burnV: null, step: 0,
  unshaken: 0, mark: null, markT: 0 });
// Losing health (any blow, a burn, a fall): the perks that wait for it. With the `body` (its owner's), the rares' cues:
// Vengeance's blade lit (`hurt/armed`), Bloodthirst's motes scattered (`streak/lost`).
function abilityHurt(kit, st, body) {
  if (body && st.streak > 0 && kit.perks['streak/heal']) events.emit('abilityPerk', { body, perk: 'streak/lost' });
  st.calm = 0; st.streak = 0;
  const v = kit.perks['hurt/empower'];
  if (v) { st.vengeance = v.window; if (body) events.emit('abilityPerk', { body, perk: 'hurt/armed' }); }
}
function abilityClocks(st, dt) {
  st.step = Math.max(0, st.step - dt); st.calm += dt; st.vengeance = Math.max(0, st.vengeance - dt); st.bastion = Math.max(0, st.bastion - dt); st.moon = Math.max(0, st.moon - dt); st.mercy = Math.max(0, st.mercy - dt);
  st.stance = Math.max(0, st.stance - dt); st.ring = Math.max(0, st.ring - dt); st.iron = Math.max(0, st.iron - dt); st.hunt = Math.max(0, st.hunt - dt);
  st.unshaken = Math.max(0, st.unshaken - dt);
  if (st.mark && (st.markT -= dt) <= 0) { st.mark = null; st.markT = 0; }
}
// A deflect, on the deflecting body (js/combat.js; a bot's on the server): Iron Mercy's heal, Ringing Steel's bank,
// Kindling's cue. (Kindling's points go with the deflect's own: abilityKeysFor.)
function abilityParried(p, target) {
  const P = p.kit.perks, st = p.perk;
  const mercy = P['parry/heal'];   // Iron Mercy (a crate's)
  if (mercy && st.mercy <= 0) { st.mercy = mercy.cooldown; abilityHeal(p, mercy.heal, 'parry/heal', target); }
  const ring = P['parry/freeDash'];   // Ringing Steel
  if (ring && st.ring <= 0) { st.ring = ring.cooldown; st.bank = 1; events.emit('abilityPerk', { body: p, perk: 'parry/freeDash', target }); }
  if (P['parry/keys'] && Object.keys(p.kit.pressed).length) events.emit('abilityPerk', { body: p, perk: 'parry/keys', target });
}
// The blow a body lands on `e`, with its kit: damage raised, and the one-shot perks it carries spent.
// Returns `strike` itself when nothing changes it. `strike.riposte` (a counter) adds Cold Riposte. The raised blow says
// which rares raised it, for their cues: `venge` (Vengeance), `calm` (Patience), `cracked` (Opportunist), `marked` (Hunting Call).
function abilityStrike(kit, st, e, strike) {
  if (kit === NO_KIT && !(st && st.moon > 0)) return strike;
  const m = kit.mods, P = kit.perks;
  let more = m.damage + (strike.riposte ? m.riposte : 0), spent = 0, glint = false, venge = false, calmed = false, cracked = false, marked = false;
  if (P['cracked/damage'] && e.cracks > 0) { more += P['cracked/damage'].damage; cracked = true; }
  if (st) {
    const hurt = P['hurt/empower'], calm = P['unhurt/empower'];
    if (hurt && st.vengeance > 0) { more += hurt.damage; st.vengeance = 0; spent++; venge = true; }
    if (calm && st.calm >= calm.after) { more += calm.damage; st.calm = 0; spent++; calmed = true; }
    if (st.moon > 0 && st.moonV) more += st.moonV.damage;
    const g = P['ready/empower'];   // Glint: a key filled since the last blow
    if (g && st.glint) { more += g.damage; st.glint = 0; spent++; glint = true; }
    const hunt = P['summonHit/empower'];   // Hunting Call: the summon's mark on this enemy
    if (hunt && st.mark === e && st.markT > 0) { more += hunt.damage; marked = st.markT; st.mark = null; st.markT = 0; }
  }
  if (!more) return strike;
  // Glint's own spend is told as its own cue (common-fx), not as the rares' empower.
  const out = { ...strike, damage: strike.damage * (1 + more), empowered: spent > (glint ? 1 : 0) };
  if (glint) out.glint = true;
  if (venge) out.venge = true;
  if (calmed) out.calm = true;
  if (cracked) out.cracked = true;
  if (marked) out.marked = marked;   // the mark's time left: a blocked blow gives it back (abilityBlocked)
  return out;
}
// A raised blow that was blocked never landed: Hunting Call's mark it spent is the enemy's again.
function abilityBlocked(st, e, strike) { if (strike.marked && st) { st.mark = e; st.markT = strike.marked; } }
// A blow this body landed (not blocked): Bloodthirst's count, and the Blood Moon's drink. Returns the health it healed.
function abilityLanded(p, strike) {
  const kit = p.kit, st = p.perk, v = kit.perks['streak/heal'];
  let heal = 0;
  if (st.moon > 0 && st.moonV) heal += strike.damage * st.moonV.drain;
  if (v && ++st.streak >= v.hits) { st.streak = 0; heal += p.maxHp * v.heal; events.emit('abilityPerk', { body: p, perk: 'streak/heal' }); }
  else if (v) events.emit('abilityPerk', { body: p, perk: 'streak/step', n: st.streak });   // a mote for each blow of the streak
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
const ECHO_DELAY = 0.06;   // s from its holder's blow to the twin's: the two land as one
// The powers that need a live enemy to strike (the one parried, struck, broken or dodged).
const ON_ENEMY = new Set(['lightning', 'blades', 'flare', 'spark', 'gale', 'pyre', 'hound', 'lancer', 'lick', 'molten', 'lateCut', 'afterimage',
  'thorns', 'shards', 'reflect', 'wave', 'spikes', 'fist', 'risingFire', 'clap',
  'flurry', 'drill', 'stitch', 'boomerang', 'clones', 'iai']);
// The powers whose blow lands a beat after they fire: each tells every browser again as it lands (`strike`).
const DELAYED = new Set(['lightning', 'lateCut', 'afterimage', 'shards', 'reflect', 'ghostBlade', 'flurry', 'stitch']);
const abilityPowers = (() => {
  // The powers still striking (lightning, blades, a pyre, a twin's echo): { pw, holder, enemy, left, next, n }, an echo
  // with its own `damage` and `twin`.
  const running = [];
  // Batch 6's strikes still on their way to the ground: a line of spikes running out { pw, holder, x, y, z, ux, uz,
  // reach, width, speed, front, damage, hit (the enemies it has wounded) }, or a marked spot { pw, holder, x, y, z,
  // radius, next, damage }. Batch 7's: a thrown blade { pw, holder, x, y, z, ux, uz, len, t, time, width, passes, damage,
  // hit (a set a pass) }, or a stance { pw, holder, body, enemy, key, hold, stance, damage, reach, beat, marked (once drawn) }.
  const ahead = [];
  // A held strike's holder still standing where it pressed, unhurt (`hold`: its { x, z, hp } then).
  function holding(holder, body, hold) {
    const b = (api.bodyOf && api.bodyOf(holder)) || body;
    if (!b || (b.alive && !b.alive()) || (b.hp ?? hold.hp) < hold.hp - 1e-6) return false;
    return Math.hypot(b.x - hold.x, b.z - hold.z) <= CONFIG.abilities.rootSlip;
  }
  const ready = new Map();   // holder + '/' + ability id -> the clock time it may fire again (Infinity: once, spent)
  const waiting = new Map();   // holder + '/' + ability id -> { holder, pw, body }: a low-health summon kept out by another
  const counts = new Map();   // holder + '/' + ability id -> blows landed toward a `hits` power
  const ghosts = new Map();   // holder -> Echoing Blade's armed echoes: { pw, left, until }
  // holder -> a summon still out: { kind, pw, body, until, n (its blows so far), x, y, z, yaw, enemy, wait (s until it
  // has arrived), bite (s to its next bite), drew (it has drawn its enemy's eye), lure (the enemy it draws now),
  // lureUntil, decoy (what that enemy fights: its place, never hurt) }.
  const summons = new Map();
  let clock = 0;
  const summonOf = holder => { const s = summons.get(holder); return s && s.until > clock ? s : null; };
  const twinOf = holder => { const s = summonOf(holder); return s && s.kind === 'twin' ? s : null; };
  // The decoy enemy `e` fights instead of a player while a summon draws it (null: none).
  function decoy(e) {
    for (const s of summons.values()) if (s.lure === e) return s.decoy;
    return null;
  }
  // `bodyOf(holder)`: the holder's body now (the server's, whose bodies are remade each pose); else the one it was called with.
  // `perkOf(holder)`: the holder's perk clocks where its body carries none (the server's persons: Hunting Call's mark).
  const api = { trigger, tick, reset, twinOf, summonOf, decoy, credit: null, bodyOf: null, perkOf: null, running, ahead };
  function reset() { running.length = 0; ahead.length = 0; ready.clear(); counts.clear(); summons.clear(); waiting.clear(); ghosts.clear(); clock = 0; }
  // A power's blow: magic, so it comes from behind the enemy's facing (a shield never takes it). Never a counter: the
  // Finishing Blow is the holder's to earn.
  function wound(e, damage, holder, power) {
    if (!e.alive() || e.invulnerable() || e.netExec || e.state === ES.EXECUTED) return;
    const strike = { attackId: power, air: false, riposte: false, rollOnly: false, shove: false, charge: 0, damage, poise: damage,
      knock: 0, destined: false, hitstop: 0, power: true };
    const from = { x: e.x - Math.sin(e.yaw), y: e.y, z: e.z - Math.cos(e.yaw) };
    const hp = e.hp, res = e.takeHit(strike, from);
    if (!Number.isFinite(e.hp)) e.hp = hp;
    if (api.credit) api.credit(holder, e, hp - e.hp);
  }
  const near = (e, x, y, z, r) => e.alive() && Math.hypot(e.x - x, e.z - z) - e.radius <= r && Math.abs(e.y - y) <= CONFIG.height.reach;
  // `ctx`: { enemy } (the one parried, struck, broken or dodged), { x, y, z } (where), { action } (a jump attack's
  // input), { strike } (a landed blow's, for `hits`: what a twin echoes), { key } (a press: that key's power only),
  // { yaw } (the holder's facing, where its body carries none: the server's), { over } (a press: Overcharge's share past full).
  function trigger(holder, body, kit, when, ctx = {}) {
    if (when === 'hits') { echo(holder, body, ctx.enemy, ctx.strike); burn(holder, body, kit, ctx.enemy); ghost(holder, body, kit, ctx.enemy); }
    // A press arms Echoing Blade at once; Quick Draw's only at its draw (a stance cut short gives its charge back, so
    // arming at the press would re-arm the echoes for free).
    if (when === 'press') { const s = kit.pressed && kit.pressed[ctx.key]; if (!(s && s.power && s.then === 'iai')) cast(holder, body, kit, ctx); }
    for (let pw of kit.powers) {
      if (pw.when !== when || (pw.action && pw.action !== ctx.action) || (pw.key && pw.key !== ctx.key)) continue;
      const key = holder + '/' + pw.id;
      if ((ready.get(key) ?? -Infinity) > clock) continue;
      const hits = pw.when === 'hits';
      if (hits) {   // every `hits`th blow; one that finds nothing to strike leaves the next blow due
        const n = Math.min(pw.v.hits, (counts.get(key) || 0) + 1);
        counts.set(key, n);
        if (n < pw.v.hits) continue;
      }
      if (pw.when === 'low' && !(body && body.hp > 0 && body.hp <= body.maxHp * pw.v.below)) continue;
      if (pw.when === 'press' && ctx.over > 0) pw = overcharged(pw, kit, ctx.over);
      if (fire(pw, holder, body, ctx, kit)) { ready.set(key, pw.once ? Infinity : clock + (pw.v.cooldown || 0)); if (hits) counts.set(key, 0); }
      else if (pw.when === 'low' && SUMMONS.has(pw.then) && body) waiting.set(key, { holder, pw, body, kit });   // low is told once: it waits its turn
    }
  }
  // A summon of another kind holds the field: this one may not come yet. A pressed one is its holder's choice: it
  // sends the other away (and the enemy that one drew is free).
  function blocked(holder, pw) {
    const s = summons.get(holder);
    if (pw.when === 'press') { if (s && (s.kind !== pw.then || s.until <= clock)) summons.delete(holder); return false; }
    return !!s && (s.until > clock ? s.kind !== pw.then : !!s.lure);
  }
  // Every enemy within `width` m of the line from (fx, fz) along (ux, uz) for `reach` m, near height `fy` (`also`: struck anyway).
  function line(fx, fy, fz, ux, uz, reach, width, damage, holder, id, also = null) {
    for (const o of Game.enemies) {
      if (!o.alive() || Math.abs(o.y - fy) > CONFIG.height.reach) continue;
      const along = (o.x - fx) * ux + (o.z - fz) * uz, off = Math.abs((o.x - fx) * uz - (o.z - fz) * ux);
      if (o === also || along >= -o.radius && along <= reach + o.radius && off <= width + o.radius) wound(o, damage, holder, id);
    }
  }
  function fire(pw, holder, body, ctx, kit = null) {
    const v = pw.v, at = body || ctx.enemy;
    if (!at) return false;
    const x = ctx.x ?? at.x, y = ctx.y ?? at.y, z = ctx.z ?? at.z, e = ctx.enemy || null, enemies = Game.enemies;
    if (ON_ENEMY.has(pw.then) && !(e && e.alive())) return false;
    if (SUMMONS.has(pw.then) && blocked(holder, pw)) return false;
    if (pw.then === 'afterimage' && Math.hypot(e.x - x, e.z - z) - (e.radius || 0) > CONFIG.abilities.commons.imageReach) return false;   // out of the copy's reach
    // A spark along a dash carries its path (drawn as a line on the ground).
    const path = ctx.from && ctx.to ? { from: { x: ctx.from.x, z: ctx.from.z }, to: { x: ctx.to.x, z: ctx.to.z } } : undefined;
    // A reflected bolt flies back for `flight` s (its way back at its own speed) before it strikes.
    const flight = pw.then === 'reflect' ? clamp(ctx.flight ?? 0.3, 0.05, CONFIG.abilities.commons.reflectMax) : undefined;
    events.emit('abilityPower', { power: pw.id, then: pw.then, holder, body, enemy: e, x, y, z, v, path, flight, yaw: ctx.yaw, over: ctx.over > 0 ? ctx.over : undefined });
    switch (pw.then) {
      case 'blast': for (const o of enemies) if (near(o, x, y, z, v.radius)) wound(o, v.damage, holder, pw.id); break;
      case 'flare': case 'spark': case 'lick': case 'molten': case 'thorns': wound(e, v.damage, holder, pw.id); break;
      case 'burnHits': if (body && body.perk) { body.perk.burn = v.hits; body.perk.burnV = v; } break;   // a new flask renews the count
      case 'shards': running.push({ pw, holder, body, enemy: e, left: 1, next: CONFIG.abilities.commons.shardDelay, n: 0 }); break;
      case 'reflect': running.push({ pw, holder, body, enemy: e, left: 1, next: flight, n: 0 }); break;
      case 'whirl': for (const o of enemies) if (near(o, x, y, z, CONFIG.abilities.commons.whirlRadius)) wound(o, v.damage, holder, pw.id); break;
      case 'lateCut': running.push({ pw, holder, body, enemy: e, left: 1, next: CONFIG.abilities.commons.lateCut, n: 0 }); break;
      case 'afterimage': running.push({ pw, holder, body, enemy: e, left: 1, next: CONFIG.abilities.commons.imageDelay, n: 0, x, y, z }); break;
      case 'gale': case 'wave': {   // from the holder through the enemy and on: everything within `width` m of the path
        const from = body || e, dx = e.x - from.x, dz = e.z - from.z, len = Math.hypot(dx, dz) || 1;
        line(from.x, from.y, from.z, dx / len, dz / len, v.reach, v.width, v.damage, holder, pw.id, e);
        break;
      }
      case 'crescent': {   // the line ahead of the holder's facing
        const C = CONFIG.abilities.crescent, yaw = ctx.yaw ?? (body && body.yaw) ?? 0;
        line(x, y, z, Math.sin(yaw), Math.cos(yaw), C.reach, C.width, v.damage, holder, pw.id);
        break;
      }
      case 'spikes': {   // toward the enemy, from the holder; the front runs out in tick, at least as far as the enemy (a press
        // the server took within its reach slack still gets there)
        const from = body || e, dx = e.x - from.x, dz = e.z - from.z, len = Math.hypot(dx, dz) || 1, S = CONFIG.abilities.spikes;
        ahead.push({ pw, holder, x: from.x, y: from.y, z: from.z, ux: dx / len, uz: dz / len, reach: Math.max(v.reach, len + (e.radius || 0)), width: S.width, speed: S.speed,
          front: 0, damage: v.damage, hit: new Set() });
        break;
      }
      case 'fist': case 'risingFire': {   // where the enemy stands now, a beat later
        const S = CONFIG.abilities[pw.then];
        ahead.push({ pw, holder, x: e.x, y: e.y, z: e.z, radius: S.radius, next: S.delay, damage: v.damage });
        break;
      }
      case 'clap': {   // a cone from the holder toward the enemy, at once
        const from = body || e, dx = e.x - from.x, dz = e.z - from.z, len = Math.hypot(dx, dz) || 1, half = CONFIG.abilities.clap.angle * Math.PI / 360;
        for (const o of enemies) {
          if (!o.alive()) continue;
          if (o === e) { wound(o, v.damage, holder, pw.id); continue; }   // its enemy always: pressOpen spent the key on it
          const ox = o.x - from.x, oz = o.z - from.z, d = Math.hypot(ox, oz), r = o.radius || 0;
          if (Math.abs(o.y - from.y) > CONFIG.height.reach || d - r > v.reach) continue;
          const off = d > 1e-6 ? Math.acos(clamp((ox * dx + oz * dz) / (d * len), -1, 1)) : 0;
          if (off <= half + Math.atan2(r, Math.max(d, 1e-6))) wound(o, v.damage, holder, pw.id);
        }
        break;
      }
      case 'flurry': {   // `hits` thrusts over the flurry's time, while the holder stands
        const T = CONFIG.abilities.flurry.time / v.hits, from = body || e;
        running.push({ pw, holder, body, enemy: e, left: v.hits, next: T, every: T, n: 0, hold: { x: from.x, z: from.z, hp: from.hp }, reach: CONFIG.abilities.flurry.reach });
        break;
      }
      case 'drill': running.push({ pw, holder, body, enemy: e, left: Math.round(v.time / v.every), next: CONFIG.abilities.drill.lead, n: 0 }); break;
      case 'stitch': { const S = CONFIG.abilities.stitch; running.push({ pw, holder, body, enemy: e, left: v.hits, next: S.lead, every: S.every, n: 0 }); break; }
      case 'clones': running.push({ pw, holder, body, enemy: e, left: 1, next: CONFIG.abilities.clones.lead, n: 0, times: v.hits }); break;
      case 'boomerang': {   // out through the enemy and past it, then back to where it was thrown
        const from = body || e, dx = e.x - from.x, dz = e.z - from.z, l = Math.hypot(dx, dz) || 1, B = CONFIG.abilities.boomerang;
        ahead.push({ pw, holder, x: from.x, y: from.y, z: from.z, ux: dx / l, uz: dz / l, len: l + B.past, t: 0, time: B.time, width: B.width,
          passes: v.hits, damage: v.damage, hit: Array.from({ length: v.hits }, () => new Set()) });
        break;
      }
      case 'iai': {   // the stance now; the draw and the cut in tick
        const from = body || e;
        ahead.push({ pw, holder, body, kit, enemy: e, key: ctx.key || 'strike', hold: { x: from.x, y: from.y, z: from.z, hp: from.hp, yaw: ctx.yaw ?? from.yaw ?? 0 },
          stance: CONFIG.abilities.iai.stance, damage: v.damage, reach: v.reach, beat: 0, marked: null });
        break;
      }
      case 'cyclone': case 'petals': for (const o of enemies) if (near(o, x, y, z, v.radius)) wound(o, v.damage, holder, pw.id); break;
      case 'pyre':   // one pillar an enemy: a second break lights it afresh
        for (let i = running.length - 1; i >= 0; i--) if (running[i].pw === pw && running[i].holder === holder && running[i].enemy === e) running.splice(i, 1);
        running.push({ pw, holder, enemy: e, left: Math.round(v.time / v.every), next: v.every, n: 0 }); break;
      case 'twin': case 'hound': case 'guardian': case 'lancer': {
        const out = summonOf(holder), from = out || at, K = CONFIG.abilities.summons;
        const s = { kind: pw.then, pw, body, until: clock + v.time, n: out ? out.n : 0, x: from.x, y: from.y, z: from.z, yaw: from.yaw || 0,
          enemy: e, wait: out ? 0 : K.arrive, bite: 0, drew: out ? out.drew : false, lure: out ? out.lure : null, lureUntil: out ? out.lureUntil : 0, decoy: null };
        if (K[pw.then].rises && !out) summonStep(s, foeOf(s), body, 60);   // a twin or a guardian rises where it stands; a hound or a lancer runs there
        s.mark = !!(kit && kit.perks['summonHit/empower']);   // Hunting Call: its blows mark the enemy
        s.decoy = { decoy: true, holder, x: s.x, y: s.y, z: s.z, radius: K.radius, height: K[pw.then].height, state: null, alive: () => true, isAttacking: () => false };
        summons.set(holder, s); break;
      }
      case 'freeze':
        for (const o of enemies) if (near(o, x, y, z, v.radius)) { o.frozen = Math.max(o.frozen || 0, v.time); o.hitbox = null; }
        break;
      case 'lightning': running.push({ pw, holder, enemy: e, left: v.strikes, next: v.lead, n: 0 }); break;
      case 'blades': running.push({ pw, holder, enemy: e, left: Math.round(v.time / v.every), next: v.every, n: 0 }); break;
      case 'bloodMoon': if (body && body.perk) { body.perk.moon = v.time; body.perk.moonV = v; } break;
    }
    return true;
  }
  // Bitter Draught: a landed blow of a holder whose blade burns burns `e` too, one flame spent (`strike`: its number).
  function burn(holder, body, kit, e) {
    const st = body && body.perk;
    if (!st || !(st.burn > 0) || !st.burnV || !e || !e.alive()) return;
    const pw = kit.powers.find(q => q.then === 'burnHits'), v = st.burnV;
    if (!pw) { st.burn = 0; return; }
    st.burn--;
    events.emit('abilityPower', { power: pw.id, then: 'burnHits', holder, body, enemy: e, x: e.x, y: e.y, z: e.z, v, strike: v.hits - st.burn });
    wound(e, v.damage, holder, pw.id);
  }
  // Overcharge: a copy of pressed power `pw` with its `damage` raised by the share `over` past full (made once a press).
  function overcharged(pw, kit, over) {
    const by = abilityOverBy(kit, over);
    return by > 1 && pw.v.damage ? { ...pw, v: Object.freeze({ ...pw.v, damage: pw.v.damage * by }) } : pw;
  }
  // Echoing Blade: a key fired arms the holder's echoes (`hits` of them, for CONFIG.abilities.echo.keep s; a new press
  // re-arms, never adds). Told with no enemy: every browser draws the glints round its holder's hand.
  function cast(holder, body, kit, ctx) {
    const pw = kit.powers.find(q => q.when === 'cast' && q.then === 'ghostBlade');
    if (!pw) return;
    ghosts.set(holder, { pw, left: pw.v.hits, until: clock + CONFIG.abilities.echo.keep });
    const at = body || ctx.enemy || { x: 0, y: 0, z: 0 };
    events.emit('abilityPower', { power: pw.id, then: 'ghostBlade', holder, body, enemy: null, x: at.x, y: at.y, z: at.z, v: pw.v });
  }
  // A landed blow of a holder with echoes armed spends one: the same enemy is cut again `delay` s later (`strike`: its number).
  function ghost(holder, body, kit, e) {
    const g = ghosts.get(holder);
    if (!g || !e || !e.alive()) return;
    // Spent past its time, or the holder no longer has it: gone. Its numbers are the kit's now (a level-up counts).
    const pw = kit.powers.find(q => q.when === 'cast' && q.then === 'ghostBlade');
    if (g.until <= clock || !pw) { ghosts.delete(holder); return; }
    g.pw = pw;
    const n = g.pw.v.hits - g.left;   // this echo's number, from 0 (the tick counts it up)
    if (--g.left <= 0) ghosts.delete(holder);
    running.push({ pw: g.pw, holder, body, enemy: e, left: 1, next: CONFIG.abilities.echo.delay, n, damage: g.pw.v.damage });
  }
  // A twin out for `holder` strikes `e` as they did, a beat later: `share` of the blow, with its own event.
  function echo(holder, body, e, strike) {
    const t = twinOf(holder);
    if (!t || !e || !strike || !e.alive()) return;
    const v = t.pw.v;
    running.push({ pw: t.pw, holder, body, enemy: e, left: 1, next: ECHO_DELAY, n: 0, damage: strike.damage * v.share, twin: t });
  }
  // The enemy a summon fights: the one it was called on while it lives, else the nearest live one to its holder.
  function foeOf(s) {
    if (s.enemy && s.enemy.alive() && Game.enemies.includes(s.enemy)) return s.enemy;
    const from = s.body || s;
    let best = null, near = CONFIG.abilities.summons.near;
    for (const e of Game.enemies) if (e.alive()) { const d = Math.hypot(e.x - from.x, e.z - from.z); if (d < near) { near = d; best = e; } }
    return (s.enemy = best);
  }
  function summonTick(holder, s, dt) {
    const v = s.pw.v, K = CONFIG.abilities.summons;
    const body = (api.bodyOf && api.bodyOf(holder)) || s.body;
    if (!body || (body.alive && !body.alive())) s.until = Math.min(s.until, clock);   // it goes with its holder
    else s.body = body;
    // Its time up, it goes, but not out of an attack begun on it: that one ends on it, where it stood.
    const held = s.lure && s.lure.alive() && Game.enemies.includes(s.lure);
    if (s.lure && (clock >= s.lureUntil || s.until <= clock || !held) && !(held && s.lure.in('attacking'))) s.lure = null;
    if (s.until <= clock) { if (!s.lure) summons.delete(holder); return; }
    const e = foeOf(s);
    summonStep(s, e, body, dt);
    if (e) s.y = e.y;
    s.decoy.x = s.x; s.decoy.y = s.y; s.decoy.z = s.z;
    if ((s.wait -= dt) > 0 || !e) return;
    // Arrived: it draws its enemy's eye once, when that enemy is between attacks and no other summon has it.
    if (!s.drew && v.draw > 0 && !e.in('attacking') && !(e.frozen > 0) && !decoy(e)) {
      s.drew = true; s.lure = e; s.lureUntil = clock + v.draw;
      events.emit('abilityPower', { power: s.pw.id, then: s.kind, holder, body: s.body, enemy: e, x: s.x, y: s.y, z: s.z, v, draw: true });
    }
    // A hound bites, a guardian bashes, a lancer thrusts: whatever it is beside, every `every` s.
    if (SUMMON_STRIKERS.has(s.kind) && (s.bite -= dt) <= 0 && Math.hypot(e.x - s.x, e.z - s.z) - (e.radius || 1) <= K[s.kind].reach) {
      s.bite = v.every; s.n++;
      events.emit('abilityPower', { power: s.pw.id, then: s.kind, holder, body: s.body, enemy: e, x: s.x, y: s.y, z: s.z, v, strike: s.n, mark: s.mark || undefined });
      wound(e, v.damage, holder, s.pw.id);
      const st = (api.perkOf && api.perkOf(holder)) || (s.body && s.body.perk);   // Hunting Call: the holder's next blow on it does more
      if (s.mark && st && e.alive()) { st.mark = e; st.markT = CONFIG.abilities.mark.keep; }
    }
  }
  function tick(dt) {
    clock += dt;
    for (const [holder, s] of summons) summonTick(holder, s, dt);
    // A low-health summon kept out by another comes when that one is gone, while its holder lives and is still low.
    if (waiting.size) for (const [key, w] of waiting) {
      const b = (api.bodyOf && api.bodyOf(w.holder)) || w.body;
      if (!b || !(b.hp > 0) || (ready.get(key) ?? -Infinity) > clock) { waiting.delete(key); continue; }
      if (blocked(w.holder, w.pw) || b.hp > b.maxHp * w.pw.v.below) continue;
      waiting.delete(key);
      if (fire(w.pw, w.holder, b, {}, w.kit)) ready.set(key, w.pw.once ? Infinity : clock + (w.pw.v.cooldown || 0));
    }
    for (let i = ahead.length - 1; i >= 0; i--) {
      const a = ahead[i];
      if (a.passes) { if (bladeTick(a, dt)) ahead.splice(i, 1); continue; }
      if (a.stance !== undefined) { if (stanceTick(a, dt)) ahead.splice(i, 1); continue; }
      if (a.speed) {   // the spikes' front: each enemy on the line it has reached, once
        a.front = Math.min(a.reach, a.front + a.speed * dt);
        for (const o of Game.enemies) {
          if (a.hit.has(o) || !o.alive() || Math.abs(o.y - a.y) > CONFIG.height.reach) continue;
          const along = (o.x - a.x) * a.ux + (o.z - a.z) * a.uz, off = Math.abs((o.x - a.x) * a.uz - (o.z - a.z) * a.ux);
          if (along - o.radius <= a.front && along >= -o.radius && off <= a.width + o.radius) { a.hit.add(o); wound(o, a.damage, a.holder, a.pw.id); }
        }
        if (a.front >= a.reach) ahead.splice(i, 1);
      } else if ((a.next -= dt) <= 0) {   // the marked spot erupts
        for (const o of Game.enemies) if (near(o, a.x, a.y, a.z, a.radius)) wound(o, a.damage, a.holder, a.pw.id);
        ahead.splice(i, 1);
      }
    }
    for (let i = running.length - 1; i >= 0; i--) {
      const r = running[i], e = r.enemy;
      if (r.hold && !holding(r.holder, r.body, r.hold)) {   // a flurry cut short: the thrusts left are dropped
        events.emit('abilityPower', { power: r.pw.id, then: r.pw.then, holder: r.holder, body: r.body, enemy: e, x: e.x, y: e.y, z: e.z, v: r.pw.v, end: 'cut' });
        running.splice(i, 1); continue;
      }
      if ((r.next -= dt) > 0) continue;
      if (!e.alive()) { running.splice(i, 1); continue; }
      r.next += r.every ?? r.pw.v.every ?? 0; r.left--; r.n++;
      if (r.reach !== undefined) {   // a thrust lands only while its enemy is in reach (the server's pose of the holder lags)
        const b = (api.bodyOf && api.bodyOf(r.holder)) || r.body;
        if (b && Math.hypot(e.x - b.x, e.z - b.z) - (e.radius || 0) > r.reach + CONFIG.abilities.press.reachSlack) { if (r.left <= 0) running.splice(i, 1); continue; }
      }
      // A bolt, and a twin's blow, each tell every browser (`strike`: its number): drawn and heard as it lands.
      if (DELAYED.has(r.pw.then) || r.twin) events.emit('abilityPower', { power: r.pw.id, then: r.pw.then, holder: r.holder, body: r.body, enemy: e,
        x: r.x ?? e.x, y: r.y ?? e.y, z: r.z ?? e.z, v: r.pw.v, strike: r.twin ? ++r.twin.n : r.n });
      for (let k = r.times || 1; k > 0; k--) wound(e, r.damage ?? r.pw.v.damage, r.holder, r.pw.id);
      if (r.left <= 0) running.splice(i, 1);
    }
  }
  // Spinning Blade's flight: its point `s` m along the way (out on even passes, back on odd); each enemy it goes by in a
  // pass is wounded once. True once it is back.
  function bladeAt(a, t) {
    const k = Math.min(a.passes, t / (a.time / a.passes)), p = Math.min(Math.floor(k), a.passes - 1), f = k - p;
    return [p, a.len * (p % 2 ? 1 - f : f)];
  }
  function bladeTick(a, dt) {
    const [p0, s0] = bladeAt(a, a.t); a.t = Math.min(a.time, a.t + dt); const [p1, s1] = bladeAt(a, a.t);
    for (let p = p0; p <= p1; p++) {
      const from = p === p0 ? s0 : (p % 2 ? a.len : 0), to = p === p1 ? s1 : (p % 2 ? 0 : a.len), lo = Math.min(from, to), hi = Math.max(from, to);
      for (const o of Game.enemies) {
        if (a.hit[p].has(o) || !o.alive() || Math.abs(o.y - a.y) > CONFIG.height.reach) continue;
        const along = (o.x - a.x) * a.ux + (o.z - a.z) * a.uz, off = Math.abs((o.x - a.x) * a.uz - (o.z - a.z) * a.ux), r = o.radius || 0;
        if (along >= lo - r && along <= hi + r && off <= a.width + r) { a.hit[p].add(o); wound(o, a.damage, a.holder, a.pw.id); }
      }
    }
    return a.t >= a.time;
  }
  // Quick Draw: the stance holds (cut short, the key gets its charge back); the draw marks the line; the beat cuts it.
  function stanceTick(a, dt) {
    const tell = extra => events.emit('abilityPower', { power: a.pw.id, then: 'iai', holder: a.holder, body: a.body, enemy: a.enemy,
      x: a.hold.x, y: a.hold.y, z: a.hold.z, v: a.pw.v, ...extra });
    if (!a.marked) {
      if (!holding(a.holder, a.body, a.hold)) {
        const st = (api.perkOf && api.perkOf(a.holder)) || (a.body && a.body.perk);
        if (st && st.charge) st.charge[a.key] = Math.max(st.charge[a.key] || 0, a.pw.v.charge);
        tell({ end: 'cancel' });
        return true;
      }
      if ((a.stance -= dt) > 0) return false;
      const b = (api.bodyOf && api.bodyOf(a.holder)) || a.body || a.hold, e = a.enemy, live = e && e.alive();
      const face = b.yaw ?? a.hold.yaw;   // its enemy gone in the stance: along the holder's facing
      const dx = live ? e.x - b.x : Math.sin(face), dz = live ? e.z - b.z : Math.cos(face), l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
      const reach = a.reach, W = CONFIG.abilities.iai.width;
      a.marked = Game.enemies.filter(o => {
        if (!o.alive() || Math.abs(o.y - b.y) > CONFIG.height.reach) return false;
        const along = (o.x - b.x) * ux + (o.z - b.z) * uz, off = Math.abs((o.x - b.x) * uz - (o.z - b.z) * ux), r = o.radius || 0;
        return along >= -r && along <= reach + r && off <= W + r;
      });
      a.beat = CONFIG.abilities.iai.beat;
      if (a.kit) cast(a.holder, a.body, a.kit, { enemy: a.enemy });   // the draw arms Echoing Blade, as a press does
      tell({ strike: 1, path: { from: { x: b.x, z: b.z }, to: { x: b.x + ux * reach, z: b.z + uz * reach } } });
      return false;
    }
    if ((a.beat -= dt) > 0) return false;
    tell({ strike: 2 });
    for (const o of a.marked) wound(o, a.damage, a.holder, a.pw.id);
    return true;
  }
  return api;
})();
