'use strict';
// ============================================================================
// 11c. Game: tutorial and level rules
// ============================================================================
// The tutorial's lessons and a level's rules each step: zones and gates, shortcuts, traps, hazards, the next level,
// and alerts. Methods of `Game` (js/game.js).
Object.assign(Game, {
  // ---- tutorial ---------------------------------------------------------------------------------
  // Each step: prompt text (labels from the live bindings), which dummies it needs, whether it starts locked on
  // to its dummy (`lockOn`: once, as it starts), optional setup, and how it completes: on(type, data, t, game) for
  // events and/or check(game, t) polled each step. Returning true from either advances the tutorial.
  tutorialSteps() { return tutorialSteps(); },
  currentStep() { return this.tut ? this.tutorialSteps()[this.tut.index] || null : null; },
  tutorialAllowsPause() { const s = this.currentStep(); return !!s && !!s.allowsPause && this.tut.doneTimer <= 0; },
  // Fresh dummies for the step (this is also how a dummy "resets").
  setupTutorialStep() {
    const T = this.level.training, L = this.level, t = this.tut, s = this.currentStep(), p = this.player;
    for (const e of this.enemies) e.rig.dispose();
    this.enemies = []; this.setLock(null);
    t.flags = {}; t.dist = 0; t.hint = ''; t.hintTimer = 0;
    if (!s) return;
    const dir = p.x + T.pairAhead < L.length - 3 ? 1 : -1;   // place ahead, or behind near the far wall
    const spot = ahead => ({ x: clamp(p.x + dir * ahead, 2, L.length - 2), z: clamp(p.z, -L.halfZ + 2, L.halfZ - 2) });
    const add = (id, behavior, at) => {
      this.enemies.push(new Enemy(ENEMY_BY_ID[id], { x: at.x, z: at.z, yaw: Math.atan2(p.x - at.x, p.z - at.z), behavior, notice: CONFIG.notice[behavior] }));
    };
    if (s.dummies === 'one') add(T.dummy, 'dummy', spot(T.dummyAhead));
    else if (s.dummies === 'sparring') add(T.sparring, 'sparring', spot(T.attackerAhead));
    else if (s.dummies === 'dodge') add(T.dodge, 'sparring', spot(T.attackerAhead));
    else if (s.dummies === 'execution') add(T.execution, 'dummy', spot(T.dummyAhead));
    else if (s.dummies === 'pair') {
      const c = spot(T.pairAhead);
      for (const side of [-1, 1]) add(T.dummy, 'dummy', { x: c.x, z: clamp(c.z + side * T.pairSpread, -L.halfZ + 1.5, L.halfZ - 1.5) });
    }
    if (s.lockOn) this.setLock(this.enemies[0]);   // set once: let go, it stays off (dummies never auto lock-on)
    if (s.setup) s.setup(this, t);
  },
  completeStep() { this.tut.doneTimer = CONFIG.tutorial.doneTime; },
  // Tutorial "rest" step: a glowing arrow bobs over the bonfire so it is easy to find (drawing only).
  drawRestArrow(t) {
    const s = this.isTutorial() && this.tut && this.tut.doneTimer <= 0 ? this.currentStep() : null;
    const b = s && s.bonfire ? world.bonfires.find(b => b.id === s.bonfire) : null;
    if (!this.restArrow) {
      if (!b) return;
      const A = CONFIG.tutorial.restArrow, mat = new THREE.MeshBasicMaterial({ color: A.color, transparent: true, opacity: 0.9, depthTest: false });
      const g = new THREE.Group(), head = new THREE.Mesh(new THREE.ConeGeometry(A.size, A.size * 1.6, 4), mat);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(A.size * 0.35, A.size * 0.35, A.size * 1.4, 6), mat);
      head.rotation.x = Math.PI; shaft.position.y = A.size * 1.5;
      g.add(head, shaft); g.renderOrder = 10; head.renderOrder = shaft.renderOrder = 10;
      scene.add(g); this.restArrow = g;
    }
    const g = this.restArrow;
    g.visible = !!b;
    if (b && !g.parent) scene.add(g);   // a level rebuild may have cleared the scene
    if (!b) return;
    const A = CONFIG.tutorial.restArrow;
    g.position.set(b.x, world.floorY(b.x, b.z, b.y) + A.height + Math.sin(t * A.bobSpeed) * A.bob, b.z);
    g.rotation.y = t * 1.5;
  },
  // A short hint under the prompt (CONFIG.tutorial.hintTime), replacing any shown.
  tutorialHint(text) { this.tut.hint = text; this.tut.hintTimer = CONFIG.tutorial.hintTime; },
  onTutorialEvent(type, data) {
    const t = this.tut, s = this.currentStep();
    if (!this.isTutorial() || !t || !s || t.doneTimer > 0 || !s.on) return;
    if (s.on(type, data, t, this)) this.completeStep();
  },
  updateTutorial(dt) {
    const t = this.tut, p = this.player;
    if (t.completeTimer > 0) {   // all steps done: show the message, then back to the Levels list
      t.completeTimer -= dt;
      if (t.completeTimer <= 0) this.leaveTutorial();
      return;
    }
    const s = this.currentStep();
    if (!s) return;
    t.hintTimer = Math.max(0, t.hintTimer - dt);
    if (t.doneTimer > 0) {   // brief confirmation before the next prompt replaces this one
      t.doneTimer -= dt;
      if (t.doneTimer <= 0) {
        t.index++;
        if (this.currentStep()) this.setupTutorialStep();
        else { for (const e of this.enemies) e.rig.dispose(); this.enemies = []; t.completeTimer = CONFIG.tutorial.completeTime; }
      }
      return;
    }
    if (p.state === PS.WALK) t.dist += Math.hypot(p.x - p.px, p.z - p.pz);
    if (s.check && s.check(this, t)) this.completeStep();
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
