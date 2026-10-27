'use strict';
// ============================================================================
// 11c. Game: level rules
// ============================================================================
// A level's rules each step: zones and gates, shortcuts, traps, hazards, the next level,
// and alerts. Methods of `Game` (js/game.js).
Object.assign(Game, {
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
    // Carry straight on into the next level: wait, fade to black, then load it.
    const next = this.complete && this.nextLevelId();
    if (next && p.alive()) {
      const N = CONFIG.nextLevel;
      this.nextTimer += dt;
      if (this.nextTimer >= N.delay) $('fade').classList.add('show');
      if (this.nextTimer >= N.delay + N.fadeTime) this.loadingFirst(...this.levelCard(next), () => this.startLevel(next));
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
