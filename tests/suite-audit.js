'use strict';
// ============================================================================
// Tests of the v7.18 audit fixes: deaths from every cause, enemy markers, executors who die, lock-on and the frame
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Audit')`.
(function () {
  const A = window.__arena, { Game, CONFIG, PS, ES, events, input } = A, { sim, expect, test } = A.tests;
  const log = [];
  events.onAny((type, d) => { if (['playerDeath', 'hazardDeath', 'respawn', 'attackMarker'].includes(type)) log.push({ type, d }); });
  const seen = type => log.filter(x => x.type === type).length;
  const kneel = e => { e.hitbox = null; e.setState(ES.BROKEN); };
  const inFront = (e, p, gap = 0.6) => {
    const d = e.radius + p.radius + gap;
    sim.place(e.x + Math.sin(e.yaw) * d, e.z + Math.cos(e.yaw) * d, e.y); p.yaw = Math.atan2(e.x - p.x, e.z - p.z);
  };
  const inRot = () => {
    const h = world.hazards[0];
    sim.place((h.rect[0] + h.rect[1]) / 2, (h.rect[2] + h.rect[3]) / 2, h.y);
  };

  test('Audit: a death in the scarlet rot plays the whole death sequence, and the next one waits for its respawn too', () => {
    Game.startLevel('haligtree'); Game.loading = 0; sim.begin(); sim.clearEnemies();
    for (let round = 0; round < 2; round++) {
      log.length = 0; inRot(); Game.player.hp = 1;
      sim.until(() => !Game.player.alive(), 3); sim.step(1);
      expect.ok(seen('hazardDeath') === 1 && seen('playerDeath') === 1, `death ${round + 1}: hazardDeath and playerDeath (${seen('hazardDeath')}, ${seen('playerDeath')})`);
      expect.ok(A.renderer.domElement.classList.contains('dying'), `death ${round + 1}: the dying look`);
      sim.step(10);
      expect.ok(seen('respawn') === 0, `death ${round + 1}: no instant respawn`);
      sim.until(() => seen('respawn') > 0, CONFIG.death.respawnDelay + 1);
      expect.ok(seen('respawn') === 1 && Game.player.alive(), `death ${round + 1}: back at the bonfire after the delay`);
    }
  });

  test('Audit: no hit-pause or death clock carries over into a respawned body', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    Game.hitstop = 0.15; Game.player.die(); sim.step(1);
    sim.until(() => Game.player.alive() && Game.deathTimer === 0, CONFIG.death.respawnDelay + 1);
    expect.ok(Game.player.alive(), 'respawned');
    expect.ok(Game.hitstop === 0 && Game.deathTimer === 0, `fresh clocks (hitstop ${Game.hitstop}, death ${Game.deathTimer})`);
  });

  test('Audit: enemy attack markers sound: the Toll Wisp rings once as each shot winds up', () => {
    Game.startFight('wisp'); Game.loading = 0; sim.begin();
    const e = Game.duel, a = e.def.attacks.find(x => x.id === 'wispBolt');
    log.length = 0; e.beginAttack(a);
    sim.until(() => e.state === ES.RECOVER, 5);
    const rings = log.filter(x => x.type === 'attackMarker' && x.d.actor === e && x.d.marker.sound === 'wispToll').length;
    expect.ok(rings === 1, `one toll per shot (${rings})`);
  });

  test('Audit: the Bell Warden\'s Last Toll rings before each of its three blows', () => {
    Game.startFight('varn'); Game.loading = 0; sim.begin();
    Game.player.maxHp = Game.player.hp = 1e9;
    const e = Game.duel, a = e.baseDef.attacks.find(x => x.id === 'lastToll');
    log.length = 0; e.beginAttack(a);
    sim.until(() => e.state === ES.RECOVER || !e.in('attacking'), 10);
    const tolls = log.filter(x => x.type === 'attackMarker' && x.d.actor === e && x.d.marker.sound === 'bellToll').length;
    expect.ok(tolls === 3, `three tolls (${tolls})`);
  });

  test('Audit: an executor who dies mid-execution never leaves the victim held on the blade', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel; kneel(e); inFront(e, p); sim.step(1);
    sim.press('light'); sim.until(() => p.state === PS.EXECUTE, 0.3);
    expect.ok(p.state === PS.EXECUTE && e.state === ES.EXECUTED, 'executing');
    sim.step(5); p.die();
    expect.ok(e.state !== ES.EXECUTED && !p.exec, `released (${e.state})`);
  });

  test('Audit: a phase may branch (abort, follow-up) into a move only its base def lists', () => {
    const e = new A.Enemy(A.ENEMY_BY_ID.margit, { x: 0, z: 0, yaw: 0, behavior: 'arena', notice: 30 });
    try {
      const base = e.baseDef.attacks.find(a => !e.def.attacks.includes(a)) || e.baseDef.attacks[0];
      expect.ok(e.attackById(base.id) === base, 'found through the base def');
      expect.ok(e.attackById('no-such-move') === undefined, 'an unknown id is still unknown');
      expect.ok(e.isBoss(), 'Margit is a boss by the one rule');
    } finally { e.rig.dispose(); }
  });

  test('Audit: lock-on looks through the simulated camera, so shake and camera feel never change who can be targeted', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin(); sim.step(2);
    const e = Game.duel, before = Game.inView(e);
    const cam = A.camera, saved = cam.position.clone();
    try {
      cam.position.set(saved.x + 40, saved.y + 40, saved.z - 40); cam.lookAt(0, -100, 0); cam.updateMatrixWorld();
      const after = Game.inView(e);
      expect.ok(!!before === !!after && (!before || Math.abs(before.x - after.x) < 1e-6), 'the drawn camera does not matter');
    } finally { cam.position.copy(saved); }
  });

  test('Audit: one failing render hook never stops the frame', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const bad = function auditThrows() { throw new Error('boom'); };
    Game.renderHooks.push(bad);
    try {
      let threw = false;
      try { Game.render(1, CONFIG.step); } catch (err) { threw = true; }
      expect.ok(!threw, 'rendered');
    } finally { Game.renderHooks.splice(Game.renderHooks.indexOf(bad), 1); }
  });

  test('Audit: dying during the level-complete fade lifts the black screen', () => {
    Game.startLevel('long-hall'); Game.loading = 0; sim.begin();
    Game.complete = true; Game.nextTimer = CONFIG.nextLevel.delay + 0.01;
    document.getElementById('fade').classList.add('show');
    Game.player.die(); sim.step(1);
    expect.ok(!document.getElementById('fade').classList.contains('show') && Game.nextTimer === 0, 'no black screen over the death');
    Game.complete = false;
  });

  test('Audit: the input buffer ages on simulation time', () => {
    const real = Object.getPrototypeOf(input) === Object.prototype && input.clock !== undefined;
    expect.ok(real, 'input has its own simulation clock');
    const t0 = input.clock; input.tick(0.5);
    expect.ok(Math.abs(input.clock - t0 - 0.5) < 1e-9, 'ticks with the fixed step');
  });
})();
