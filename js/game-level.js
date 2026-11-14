'use strict';
// ============================================================================
// 11c. Game: level rules
// ============================================================================
// A level's rules each step: zones and gates, shortcuts, traps, hazards, flasks found, the next level,
// and alerts. Methods of `Game` (js/game.js).

// ---- the road's climb (pass 79, PLAN.md track A item 5) -------------------------------------------------------------
// Story grows harder chapter by chapter: its regular enemies' health and damage, and its bosses' pace, health and damage,
// run from the first chapter's values to the last's (CONFIG.story.road, linear in the chapter's place on the road). A
// chapter's own `might` sets its bosses' instead. The level is its chapter wherever it is played (Story, the lobby's
// story, Practice's levels); Boss Rush and Practice's duels never meet it. Flasks grow too, but only as they are found.
// A level's place on the road, 0 (its first chapter) to 1 (its last), or null for a level off the road.
function roadPlace(levelId) {
  const ids = STORY.chapters.map(c => c.level), i = ids.indexOf(levelId);
  return i < 0 ? null : ids.length > 1 ? i / (ids.length - 1) : 1;
}
// An enemy's strength on that chapter, { pace, health, damage } (Enemy.setMight), or null off the road.
function roadMight(levelId, boss) {
  const t = roadPlace(levelId);
  if (t === null) return null;
  const R = CONFIG.story.road[boss ? 'bosses' : 'foes'], own = boss && STORY.chapters.find(c => c.level === levelId).might || {};
  const at = k => own[k] ?? (R[k] ? lerp(R[k][0], R[k][1], t) : 1);
  return { pace: at('pace'), health: at('health'), damage: at('damage') };
}
// The flasks of one who found every flask on the road before `levelId` (and in it too, with `through`): the player's own
// and one for each of those levels' `flaskFinds`. Null off the road.
function roadFlasks(levelId, through = false) {
  const ids = STORY.chapters.map(c => c.level), i = ids.indexOf(levelId);
  if (i < 0) return null;
  const own = PLAYER_DEF.inventory.find(it => it.item === 'flask').max;
  return ids.slice(0, through ? i + 1 : i).reduce((n, id) => n + (ALL_LEVELS.find(l => l.id === id).flaskFinds || []).length, own);
}
// The ids of every flask found on the road before `levelId`.
const roadFinds = levelId => STORY.chapters.slice(0, Math.max(0, STORY.chapters.findIndex(c => c.level === levelId)))
  .flatMap(c => (ALL_LEVELS.find(l => l.id === c.level).flaskFinds || []).map(f => f.id));

Object.assign(Game, {
  // A level's enemy, made as strong as its chapter of the road (roadMight); unchanged off it.
  onRoad(e) {
    if (this.kind === 'level') e.setMight(roadMight(this.level.id, e.isBoss()));
    return e;
  },
  // ---- level -------------------------------------------------------------------------------------
  // Gated zones: spawn on entry, lift the gate when all the zone's enemies fall. Complete when all gates are open.
  // Shortcut gates (`opensFrom`) open for good once the player reaches their far side, on the gate's floor; sealed
  // gates never open. Traps: standing on the trap's floor in its trigger starts the warning; when the warning runs
  // out, its collapse area becomes a hole for good (through resting and dying, like an opened shortcut).
  updateLevel(dt) {
    const p = this.player, V = CONFIG.level, party = this.allies().filter(a => a.alive());
    for (const z of this.zones) {
      const floor = z.actors.length ? z.actors[0].home.y : p.y, onFloor = a => Math.abs(a.y - floor) <= CONFIG.height.reach + V.zoneFloorSlack;
      const actor = party.find(a => (typeof z.trigger === 'number' ? a.x > z.trigger : inArea(z.trigger, a.x, a.z)) && onFloor(a));
      const entered = !!actor;
      if (!z.spawned && entered) this.spawnZone(z);   // normally already standing there since the start
      // `wakeZones` levels (v4.3.1): while the player is in a zone (on its floor), every member and every dispersed enemy
      // tied to it (`zone`: its archers, its gargoyles) is awake and on them, so none sleeps in a corner holding the gate shut.
      // v7.0: one that lost sight of the player (round a house, a pillar) keeps hunting toward where they are now, instead of
      // being flipped back to the chase every step (that froze it in place: the chase loses sight and searches again).
      if (this.level.wakeZones && entered && !z.gate.open)   // `actor` already stands on the zone's floor
        for (const e of this.enemies) {
          if (e.zone !== z.id || !e.alive()) continue;
          e.huntTime = CONFIG.ai.huntTime;   // its own fight: no leash pulls it home while the player stands in it
          if (e.state === ES.SEARCH) { e.lastSeen = { x: actor.x, z: actor.z }; e.searchLook = 0; e.stateTime = 0; }
          else if (e.in('unaware') || e.state === ES.DORMANT) e.wake(actor);
        }
      if (((z.actors.length && z.actors.every(a => !a.alive())) || z.beaten) && !z.gate.open) {
        z.gate.open = true;
        events.emit('gateOpened', { gate: z.gate });
      }
    }
    for (const g of world.gates) {
      if (g.opensFrom && !g.open && party.some(a => inRect(g.opensFrom, a.x, a.z) && Math.abs(a.y - g.y) <= CONFIG.height.reach)) {
        g.open = true;
        events.emit('gateOpened', { gate: g, shortcut: true });
      }
      if (g.open) g.lift = Math.min(1, g.lift + dt / V.gateLiftTime);
    }
    // Flasks found on the road (pass 79; Story alone, js/story.js saves them): walked over, one more flask for the rest
    // of the road, full at once. Off Story's own road the chapter already grants them (spawnPlayer).
    if (this.story && p.alive()) for (const f of this.level.flaskFinds || []) {
      const F = CONFIG.story.find;
      if (this.found.has(f.id) || Math.hypot(p.x - f.x, p.z - f.z) > F.range || Math.abs(world.floorY(f.x, f.z, f.y) - p.y) > F.floorGap) continue;
      const it = p.inventory.flask;
      this.found.add(f.id); it.max++; it.count++;
      events.emit('flaskFound', { find: f, player: p, flasks: it.max });
    }
    // Hazard floors (a level's `hazards`, Player.standInHazards). Enemies are of the rot and wade through it unharmed.
    p.standInHazards(dt, this.hazardTimers);
    companions.hazards(this, dt);
    for (const t of world.traps) {
      if (t.state === 'set' && party.some(a => a.alive() && a.grounded && a.state !== PS.EXECUTE && inRect(t.trigger, a.x, a.z) && Math.abs(a.y - t.y) < CONFIG.height.stepUp)) {
        t.state = 'warning'; t.timer = 0;
        events.emit('trapWarning', { trap: t });
      } else if (t.state === 'warning') t.timer += dt;
      else if (t.state === 'sprung') t.dropTime += dt;
      if (t.state === 'warning' && t.timer >= t.warning - 1e-9) {
        t.state = 'sprung'; world.openHole(t.region, t.collapse);
        events.emit('trapSprung', { trap: t });
      }
    }
    if (!this.complete && this.zones.length && this.zones.every(z => z.gate.open)) {
      this.complete = true;
      events.emit('levelComplete');
    }
    // Carry straight on into the next level: wait, fade to black, then load it. A level with an `ending` hands that to
    // its ending (js/finale.js), which loads the next level after its cards. The last chapter of a Story road that has
    // no ending yet (the road goes on, unbuilt) closes on its own screen instead (story.finish).
    const next = this.complete && !this.level.ending && this.nextLevelId();
    const roadGoesOn = this.complete && this.story && !this.level.ending && !next;
    if ((next || roadGoesOn) && p.alive()) {
      const N = CONFIG.nextLevel;
      this.nextTimer += dt;
      if (this.nextTimer >= N.delay) $('fade').classList.add('show');
      if (this.nextTimer >= N.delay + N.fadeTime) {
        if (next) this.loadingFirst(...this.levelCard(next), () => this.startLevel(next));
        else story.finish();   // Game.reset lifts the fade under the road's closing screen
      }
    }
  },

  // Alert (levels with `alert`): each enemy that just noticed the player wakes unaware enemies near it with a clear
  // line between them (props aside), and every enemy of its zone; the woken pass it on. `was`: enemies unaware before this step.
  spreadAlert(was) {
    const R = CONFIG.alert.radius, p = this.player;
    const queue = this.enemies.filter(e => was.has(e) && e.alive() && !e.in('unaware') && e.state !== ES.DORMANT);
    for (const e of queue) events.emit('alert', { enemy: e });
    while (queue.length) {
      const a = queue.shift(), target = this.companion && this.companion.targets.get(a) || p;
      for (const e of this.enemies) {
        const mate = !!a.zone && e.zone === a.zone;
        if (e === a || (!mate && (Math.hypot(e.x - a.x, e.z - a.z) > R || sightLost(a, e)))) continue;
        if (e.wake(target)) { events.emit('alert', { enemy: e, by: a }); queue.push(e); }
      }
    }
  },
});
