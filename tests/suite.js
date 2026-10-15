'use strict';
// ============================================================================
// Stepped-simulation tests (loaded only with #dev; see combat-arena-3d.html)
// ============================================================================
// Run from the console:  await __arena.tests.run()        (all tests)
//                        await __arena.tests.run('heights') (only tests whose name contains "heights")
// Each test drives the real game with a manual clock: the frame loop stops stepping, the gamepad is
// ignored, the input buffer reads the simulated clock, and movement comes from the test (world-space
// directions instead of camera-relative keys). Nothing here is part of the game itself.
(function () {
  const A = window.__arena, { Game, CONFIG, input, gamepad } = A;
  const STEP = CONFIG.step;
  let clock = 1000, mv = null;
  const real = { now: input.now, poll: gamepad.poll, moveInput: Game.moveInput, random: Math.random };

  // A deterministic Math.random while a test runs, so enemy choices repeat run to run.
  const seededRandom = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  const sim = {
    begin() {
      Game.manualClock = true;
      input.now = () => clock;
      gamepad.poll = () => {};
      gamepad.move = { x: 0, y: 0 };
      Game.moveInput = () => mv ? { x: mv.x, z: mv.z, has: true } : { x: 0, z: 0, has: false };
      Math.random = seededRandom(12345);
      input.clear(); mv = null;
      Game.cam.pitch = 0; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.default; Game.mouseHold = 0;   // no camera state leaks between tests
    },
    end() {
      input.now = real.now; gamepad.poll = real.poll; Game.moveInput = real.moveInput; Math.random = real.random;
      input.clear(); mv = null;
      Game.manualClock = false;
    },
    // Advance n fixed steps (render every `renderEvery` steps so drawing code runs too).
    step(n = 1, renderEvery = 0) {
      for (let i = 0; i < n; i++) {
        clock += STEP;
        Game.update(STEP);
        if (renderEvery && i % renderEvery === 0) Game.render(1, STEP);
      }
    },
    seconds(s, renderEvery = 0) { this.step(Math.round(s / STEP), renderEvery); },
    // Step until fn() is true; returns the number of steps taken, or -1 if it never happened.
    until(fn, maxSeconds = 10) {
      const max = Math.round(maxSeconds / STEP);
      for (let i = 0; i < max; i++) { if (fn()) return i; this.step(); }
      return fn() ? max : -1;
    },
    // Walk in a world direction (x, z), normalised; null stops.
    move(x, z) { if (x === null) { mv = null; return; } const l = Math.hypot(x, z) || 1; mv = { x: x / l, z: z / l }; },
    // Walk toward a point until within `near` m (or time runs out). Returns true if reached.
    walkTo(x, z, near = 0.3, maxSeconds = 20) {
      const p = () => Game.player;
      const ok = this.until(() => {
        const dx = x - p().x, dz = z - p().z;
        if (Math.hypot(dx, dz) < near) return true;
        this.move(dx, dz); return false;
      }, maxSeconds) >= 0;
      this.move(null);
      return ok;
    },
    press(action) { const code = ACTIONS[action][0]; input.down(code); input.up(code); },
    hold(action) { input.down(ACTIONS[action][0]); },
    release(action) { input.up(ACTIONS[action][0]); },
    // Put the player somewhere (on the floor there: the top-most one, or the highest at or below y), at rest.
    place(x, z, y) {
      const p = Game.player;
      p.x = p.px = x; p.z = p.pz = z;
      p.y = p.py = world.floorY(x, z, y);
      p.vx = p.vy = p.vz = p.kx = p.kz = 0;
      p.grounded = true; p.peak = p.y; p.inPit = false;
      p.setState(PS.IDLE);
      Game.updateCamera(0, true);
    },
    // A fresh enemy (an id, or a whole definition) at (x, z) on the floor there (behaviour `gated`), added to the fight.
    spawn(id, x, z, y, yaw = 0) {
      const e = new A.Enemy(typeof id === 'string' ? A.ENEMY_BY_ID[id] : id, { ...Game.spawnSpec({ spawn: { x, y, z, yaw } }, 'gated') });
      Game.enemies.push(e);
      return e;
    },
    // Remove every enemy (optionally keep those matching fn).
    clearEnemies(keep = () => false) {
      for (const e of Game.enemies) if (!keep(e)) e.rig.dispose();
      Game.enemies = Game.enemies.filter(keep);
      for (const z of Game.zones) z.actors = z.actors.filter(keep);
    },
  };

  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });
  class Fail extends Error {}
  const expect = {
    ok(v, msg) { if (!v) throw new Fail(msg || 'expected true'); },
    near(a, b, tol, msg) { if (!(Math.abs(a - b) <= tol)) throw new Fail(`${msg || 'value'}: expected ${b} ± ${tol}, got ${typeof a === 'number' ? a.toFixed(3) : a}`); },
    above(a, b, msg) { if (!(a > b)) throw new Fail(`${msg || 'value'}: expected > ${b}, got ${typeof a === 'number' ? a.toFixed(3) : a}`); },
    below(a, b, msg) { if (!(a < b)) throw new Fail(`${msg || 'value'}: expected < ${b}, got ${typeof a === 'number' ? a.toFixed(3) : a}`); },
  };

  // ---- regression: every level, duel and test room loads and runs ----------------------------------
  const allLevels = () => [...A.LEVELS, ...A.TEST_LEVELS];
  test('regression: every level loads and runs 10 s with rendering', () => {
    for (const L of allLevels()) {
      Game.startLevel(L.id); sim.begin();
      const p = Game.player, y0 = p.y;
      sim.seconds(10, 6);
      expect.ok(p.alive() || L.id !== 'tutorial', `${L.id}: player died standing still`);
      expect.near(p.y, y0, 0.01, `${L.id}: player height at rest`);
      expect.ok(Number.isFinite(Game.cam.pos.y), `${L.id}: camera position is finite`);
    }
  });
  test('regression: every duel runs 20 s and the enemy engages', () => {
    for (const d of [...A.ENEMY_DEFS, ...A.TEST_DEFS]) {
      Game.startFight(d.id); sim.begin();
      let engaged = false;   // the duel can kill the idle player and respawn, so watch it the whole time
      for (let s = 0; s < 20 * 6; s++) { sim.step(10, 10); if (!Game.duel.in('unaware')) engaged = true; }
      const e = Game.duel;
      expect.ok(engaged, `${d.id}: never noticed the player`);
      expect.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z), `${d.id}: position is finite`);
    }
  });
  test('regression: walking, jumping and rolling on flat ground', () => {
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player, x0 = p.x;
    sim.move(1, 0); sim.seconds(1); sim.move(null);
    expect.above(p.x - x0, 3, 'walked distance in 1 s');
    sim.press('jump'); sim.step(3);
    expect.ok(p.state === PS.JUMP, 'jumping'); expect.above(p.y, 0.05, 'off the ground');
    expect.ok(sim.until(() => p.isFree(), 3) >= 0, 'landed'); expect.near(p.y, 0, 1e-9, 'back on the floor');
    sim.seconds(1);
    sim.press('roll'); sim.step(2);
    expect.ok(p.state === PS.ROLL, 'rolling');
    expect.ok(sim.until(() => p.isFree(), 2) >= 0, 'roll ended'); expect.near(p.y, 0, 1e-9, 'still on the floor');
  });
  test('regression: Level 1 walls and gates hold the player', () => {
    Game.startLevel('long-hall'); sim.begin(); sim.clearEnemies();
    const p = Game.player;
    sim.move(0, 1); sim.seconds(4); sim.move(null);
    expect.below(p.z, A.LEVEL_1.halfZ, 'side wall');
    sim.place(30, 0); sim.move(1, 0); sim.seconds(4); sim.move(null);
    expect.below(p.x, 34, 'closed gate');
  });
  test('regression: Level 2 room walls hold the player', () => {
    Game.startLevel('sunken-keep'); sim.begin(); sim.clearEnemies();
    const p = Game.player;
    sim.move(-1, 0); sim.seconds(3); sim.move(0, -1); sim.seconds(3); sim.move(null);
    expect.above(p.x, 0, 'west wall'); expect.above(p.z, -8, 'south wall');
  });

  // ---- v3.1 heights: ramps, stairs, rails, ledges, drops, pits, edge sense, 3D sight and camera ---------------
  const log = [];   // every event type since the last clear (events has no unsubscribe, so record once)
  A.events.onAny(type => log.push(type));
  const F = CONFIG.fall, H = CONFIG.height;
  const heights = () => { Game.startLevel('test-heights'); sim.begin(); sim.clearEnemies(); log.length = 0; return Game.player; };
  test('heights: the ramp climbs to the terrace, stairs to the landing, never hurting', () => {
    const p = heights();
    sim.place(25, -17);
    expect.ok(sim.walkTo(38, -17), 'reached mid-ramp'); expect.near(p.y, 2, 0.15, 'height half way up the ramp');
    expect.ok(sim.walkTo(52, -17), 'reached the terrace'); expect.near(p.y, 4, 1e-6, 'terrace height');
    expect.ok(sim.walkTo(78, -17), 'reached the landing'); expect.near(p.y, 10, 1e-6, 'landing height');
    let airborne = 0;
    sim.until(() => { if (!p.grounded) airborne++; const dx = 50 - p.x; if (Math.abs(dx) < 0.3) return true; sim.move(dx, 0); return false; }, 10);
    sim.move(null);
    expect.near(p.y, 4, 1e-6, 'back down on the terrace'); expect.ok(airborne === 0, `never airborne on stairs (${airborne} steps)`);
    expect.near(p.hp, p.maxHp, 1e-9, 'no damage from ramps and stairs');
  });
  test('heights: rails and ledge faces stop walking', () => {
    const p = heights();
    sim.place(38, -16); sim.move(0, 1); sim.seconds(2); sim.move(null);
    expect.below(p.z, -14 - H.railThickness - p.radius + 0.01, 'ramp rail (north side)'); expect.ok(p.grounded, 'still on the ramp');
    sim.place(76, 0); sim.move(-1, 0); sim.seconds(2); sim.move(null);
    expect.above(p.x, 73 + H.railThickness + p.radius - 0.01, 'landing rail'); expect.near(p.y, 10, 1e-6, 'still on the landing');
    sim.place(27, -4.5); sim.move(1, 0); sim.seconds(2); sim.move(null);
    expect.below(p.x, 30 - p.radius + 0.01, 'the 4 m ledge face under the walkway'); expect.near(p.y, 0, 1e-6, 'still in the yard');
    sim.place(27, -10); sim.move(1, 0); sim.seconds(2); sim.move(null);
    expect.below(p.x, 30 - p.radius + 0.01, 'yard wall against the trench');
    sim.place(27, -10); sim.press('jump'); sim.move(1, 0); sim.seconds(2); sim.move(null);
    expect.below(p.x, 30 - p.radius + 0.01, 'cannot jump over the yard wall');
  });
  test('heights: a 4 m drop is safe, 10 m hurts by the numbers, 15 m kills', () => {
    const p = heights();
    sim.place(32, -4.5); sim.move(-1, 0);
    expect.ok(sim.until(() => !p.grounded, 3) >= 0, 'walked off the walkway end');
    expect.ok(p.state === PS.FALL, 'falling state');
    expect.ok(sim.until(() => p.grounded, 3) >= 0, 'landed'); sim.move(null);
    expect.near(p.y, 0, 1e-6, 'in the yard'); expect.near(p.hp, p.maxHp, 1e-9, 'a 4 m drop is free');
    sim.place(15, 15.5); sim.move(0, 1); sim.until(() => !p.grounded, 3); sim.move(null);
    expect.ok(sim.until(() => p.grounded, 4) >= 0, 'landed from 10 m');
    expect.near(p.hp, p.maxHp - (10 - F.safe) * F.perMetre, 0.6, 'fall damage from 10 m');
    expect.ok(p.alive() && p.state === PS.HURT, 'stumbles but lives'); expect.ok(log.includes('fallDamage'), 'fallDamage event');
    sim.seconds(2); p.hp = p.maxHp;
    sim.place(15, 35.5); sim.move(0, -1); sim.until(() => !p.grounded, 3); sim.move(null);
    expect.ok(sim.until(() => !p.alive(), 4) >= 0, 'a 15 m fall kills'); expect.near(p.y, 0, 1e-6, 'died on the yard floor');
  });
  test('heights: pits kill and the player returns to the bonfire', () => {
    const p = heights();
    sim.place(47, -10); sim.move(-1, 0);
    expect.ok(sim.until(() => !p.alive(), 5) >= 0, 'fell into the trench and died'); sim.move(null);
    expect.ok(log.includes('fell'), 'fell event'); expect.near(p.y, world.killY, 1e-6, 'stopped at the kill depth');
    sim.seconds(CONFIG.death.respawnDelay + 0.2);
    const q = Game.player;
    expect.ok(q.alive(), 'respawned'); expect.near(q.y, 0, 1e-6, 'at the yard bonfire');
    sim.place(21.5, 28); sim.move(0, 1);
    expect.ok(sim.until(() => !Game.player.alive(), 5) >= 0, 'the hole in the yard floor is a pit too'); sim.move(null);
  });
  test('heights: resting on a raised bonfire respawns there', () => {
    const p = heights();
    sim.place(78, 15); sim.press('rest'); sim.step(2);
    expect.ok(p.state === PS.REST, 'resting at the landing bonfire');
    sim.seconds(2); p.hp = 0; p.setState(PS.DEAD); Game.onPlayerDeath();
    sim.seconds(CONFIG.death.respawnDelay + 0.2);
    expect.ok(Game.player.alive(), 'respawned'); expect.near(Game.player.y, 10, 1e-6, 'on the landing, 10 m up');
  });
  test('heights: enemies stop at edges, find the way round, and can be knocked off', () => {
    const p = heights();
    sim.place(35, -4.5);   // on the open walkway over the trench (4 m)
    const e = sim.spawn('hollow', 50, -10);   // on the terrace; straight at the player is over the trench
    e.setState(ES.CHASE);
    let lowest = e.y;
    sim.until(() => { lowest = Math.min(lowest, e.y); return Math.hypot(e.x - p.x, e.z - p.z) < 2.6; }, 10);
    expect.ok(Math.hypot(e.x - p.x, e.z - p.z) < 2.6, `reached the player along the brink (at ${e.x.toFixed(1)}, ${e.z.toFixed(1)})`);
    expect.near(lowest, 4, 1e-6, 'never left the 4 m floor'); expect.ok(e.alive(), 'alive');
    e.notice = 0; e.setState(ES.IDLE);   // calm it, put it mid-walkway and shove it off the side
    e.x = e.px = 40; e.z = e.pz = -4.5; e.kx = 0; e.kz = 20;
    sim.until(() => !e.alive(), 4);
    expect.ok(!e.alive(), 'knocked into the trench and died'); expect.ok(log.includes('fell'), 'fell event');
  });
  test('heights: an enemy above an unreachable player waits at the brink, then goes home', () => {
    const p = heights();
    sim.place(15, -4);   // in the yard, in plain view of the open walkway 10 m up
    const e = sim.spawn('hollow', 15, 16);
    e.setState(ES.CHASE);
    sim.seconds(2);
    expect.ok(e.alive() && Math.abs(e.y - 10) < 1e-6, 'still on the walkway');
    expect.above(e.z, 14 - 0.01, 'stopped at the brink');
    expect.below(e.z, 14 + e.radius + 0.2, 'walked up to the brink');
    sim.seconds(H.giveUp + 1);
    expect.ok(e.state === ES.RETURN || e.in('unaware'), `gave up (state ${e.state})`);
  });
  test('heights: floors block sight, open air does not', () => {
    heights();
    const at = (x, y, z, height = 1.8) => ({ x, y, z, height });
    expect.ok(gateBetween(at(15, 0, 15.5), at(15, 10, 15.5)), 'straight up through the walkway');
    expect.ok(!gateBetween(at(15, 0, -15), at(15, 10, 15.5)), 'across the open yard to the walkway');
    expect.ok(!gateBetween(at(74, 10, 0, 1), at(60, 10, 15.5, 1)), 'rails never block sight, even below their top');
    expect.ok(gateBetween(at(76, 10, 0), at(52, 4, -10)), "the terrace's east wall");
    expect.ok(gateBetween(at(25, 0, -10), at(52, 4, -10)), 'through the yard wall');
  });
  test('heights: the camera stays under walkways and above floors', () => {
    const p = heights();
    sim.place(15, 15.5, 0);   // in the yard, under the open walkway
    Game.cam.yaw = -Math.PI / 2; Game.cam.pitch = CONFIG.mouse.pitchMax; Game.zoomTarget = CONFIG.zoom.max;
    Game.mouseHold = 99; sim.seconds(2);
    const c = Game.cam.pos;
    expect.ok(c.x > 6 && c.x < 30 && c.z > 14 && c.z < 17, `camera under the walkway (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`);
    expect.below(c.y, 10 - H.slab - CONFIG.camera.ceilingMargin + 0.01, 'camera height under the walkway');
    sim.place(15, -10); Game.mouseHold = 99; sim.seconds(2);
    expect.above(Game.cam.pos.y, 9.5, 'open sky: the camera rises freely');
    sim.place(77, -5); Game.mouseHold = 99; sim.seconds(2);
    expect.above(Game.cam.pos.y, 10 + CONFIG.camera.floor - 0.01, 'above the landing floor');
    expect.ok(Number.isFinite(Game.cam.pos.y), 'finite');
  });

  // ---- v3.2 open rooms and culling ---------------------------------------------------------------------------
  const metrics = {};   // numbers worth reading in the report (frame times)
  test('open rooms: sky, grass and ruins over open rooms only', () => {
    Game.startLevel('test-courtyard'); sim.begin();
    const I = A.visuals.info(), yard = A.TEST_COURTYARD.rooms.find(r => r.id === 'courtyard').rect;
    expect.ok(I.sky, 'sky'); expect.above(I.grass, 500, 'grass clumps');
    expect.ok(I.grassAt.every(([x, y, z]) => inRect(yard, x, z) && Math.abs(y + 0.05) < 1e-6), 'every clump on the courtyard floor');
    expect.above(I.far, 200, 'draw distance reaches the ruins around the level');
    Game.startLevel('test-heights'); sim.begin();
    const J = A.visuals.info();
    expect.ok(!J.sky && J.grass === 0, 'no sky or grass where the level sets none');
    Game.startLevel('sunken-keep'); sim.begin();
    const K = A.visuals.info();
    expect.ok(!K.sky && K.grass === 0 && K.far === 200, 'Level 2 unchanged: no sky, no grass, normal draw distance');
  });
  test('culling: a fixed pool of lights follows the nearest light sources', () => {
    Game.startLevel('test-courtyard'); sim.begin(); sim.clearEnemies();
    const counts = new Set(), src = stage.lightSources;
    expect.above(src.length, CONFIG.cull.maxLights, 'more light sources than pool lights');
    for (const [x, z] of [[4, 0], [40, 0], [42, 48], [92, 0], [42, -48], [20, -20]]) {
      sim.place(x, z); Game.render(1, STEP);
      counts.add(A.visuals.info().pointLights);
      const p = Game.player, dist = l => Math.hypot(l.position.x - p.x, l.position.y - p.y, l.position.z - p.z);
      const nearest = src.reduce((a, b) => dist(a) <= dist(b) ? a : b);
      const lit = stage.lightPool.filter(l => l.intensity > 0);
      expect.ok(lit.some(l => l.position.distanceTo(nearest.position) < 1e-6), `the nearest source is lit at (${x}, ${z})`);
    }
    expect.ok(counts.size === 1 && counts.has(CONFIG.cull.maxLights), `the scene always holds exactly the pool (${[...counts]})`);
  });
  test('culling: far unaware enemies sleep; near or fighting ones run', () => {
    Game.startLevel('test-courtyard'); sim.begin();
    const p = Game.player;
    sim.step(2);
    const far = Game.enemies.filter(e => Math.hypot(e.x - p.x, e.z - p.z) > CONFIG.cull.enemyRange);
    expect.ok(far.length >= 6 && far.every(e => e.asleep), `${far.length} far enemies, all asleep`);
    const patrol = Game.enemies.find(e => e.behavior === 'patrol' && e.z > 40), x0 = patrol.x;
    sim.seconds(2); Game.render(1, STEP);
    expect.ok(patrol.x === x0, 'a sleeping patrol stays put'); expect.ok(!patrol.rig.root.visible, 'and is not drawn');
    sim.place(42, 32); sim.seconds(2);
    expect.ok(!patrol.asleep && patrol.x !== x0, 'woke and moved once the player came near');
    const e = Game.zones[0].actors[0];
    e.leash = e.homeLeash = Infinity; e.setState(ES.CHASE);
    sim.place(4, 0); sim.seconds(1);
    expect.above(Math.hypot(e.x - Game.player.x, e.z - Game.player.z), CONFIG.cull.enemyRange - 10, 'the chaser was far');
    expect.ok(!e.asleep && e.state !== ES.IDLE, 'a fighting enemy keeps running');
  });
  test('culling: Level 1 and Level 2 keep every light and never sleep anyone', () => {
    for (const id of ['long-hall', 'sunken-keep']) {
      Game.startLevel(id); sim.begin(); sim.step(5);
      expect.ok(!stage.lightPool && Game.enemies.every(e => !e.asleep), `${id}: no pool, nobody asleep`);
    }
  });
  test('culling: frame time on Test: Courtyard, culled and not', () => {
    const gl = A.renderer.getContext(), px = new Uint8Array(4);
    const measure = def => {
      Game.kind = 'level'; Game.level = def; Game.enterPlay(); Game.reset(); sim.begin();
      sim.place(42, 0);
      for (let i = 0; i < 20; i++) { sim.step(1); Game.render(1, STEP); }   // warm-up: shaders compile here
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < 90; i++) { sim.step(1); Game.render(1, STEP); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // wait for the GPU
      return { ms: (performance.now() - t0) / 90, lights: A.visuals.info().pointLights, awake: Game.enemies.filter(e => !e.asleep).length };
    };
    const off = measure({ ...A.TEST_COURTYARD, id: 'test-courtyard-uncull', cull: false });
    const on = measure(A.TEST_COURTYARD);
    metrics.courtyardFrame = { culledMs: +on.ms.toFixed(2), unculledMs: +off.ms.toFixed(2), culledLights: on.lights, unculledLights: off.lights,
                               culledAwake: on.awake, unculledAwake: off.awake };
    expect.ok(on.lights < off.lights, `fewer real lights when culled (${on.lights} vs ${off.lights})`);
    expect.below(on.ms, off.ms * 1.25 + 1, `culled frame (${on.ms.toFixed(1)} ms) no slower than unculled (${off.ms.toFixed(1)} ms)`);
    Game.startLevel('test-courtyard');   // leave the real level loaded
  });

  // ---- v3.3 projectiles, shove, shortcut gates -----------------------------------------------------------------
  const shots = [];   // every bolt loosed, and who fired it
  A.events.on('shot', d => shots.push({ enemy: d.enemy }));
  const bowShot = () => A.ENEMY_BY_ID.testBowman.attacks.find(a => a.projectile);
  const quiet = e => { e.notice = 0; e.setState(ES.IDLE); };   // an enemy that stays put while we aim for it
  const settleBolts = () => sim.until(() => !A.projectiles.live().length, 4);
  test('projectiles: the Bowman shoots down from the walkway and the bolt hits', () => {
    Game.startFight('testBowman'); sim.begin(); log.length = 0; shots.length = 0;
    const p = Game.player, hp0 = p.hp;
    expect.ok(sim.until(() => shots.length > 0, 8) >= 0, 'a bolt was loosed at a player 4 m below');
    expect.ok(sim.until(() => p.hp < hp0, 3) >= 0, 'it hit the player standing still');
    expect.near(hp0 - p.hp, bowShot().damage, 0.01, 'full damage, unblocked');
    expect.near(Game.duel.y, 4, 1e-6, 'the archer stayed on its walkway');
  });
  test('projectiles: blocked from the front, rolled through, never parried', () => {
    Game.startFight('testBowman'); sim.begin(); log.length = 0;
    const p = Game.player, e = Game.duel, shot = bowShot();
    quiet(e);
    const fire = () => { e.yaw = Math.atan2(p.x - e.x, p.z - e.z); return A.projectiles.fire(e, shot, p); };
    sim.hold('block'); sim.step(2);
    let hp0 = p.hp; fire(); settleBolts(); sim.release('block');
    expect.ok(log.includes('strike'), 'the bolt struck the guard');
    expect.near(hp0 - p.hp, shot.damage * CONFIG.block.damageMul, 0.01, 'blocked damage');
    sim.seconds(1.5); hp0 = p.hp;
    const b = fire(), arrive = Math.hypot(p.x - b.x, p.z - b.z) / shot.projectile.speed;
    sim.seconds(Math.max(0, arrive - CONFIG.player.rollIFrames * 0.5)); sim.press('roll');
    settleBolts();
    expect.near(p.hp, hp0, 1e-9, 'rolled through the bolt');
    // Close up, in the last instant of the draw: a melee swing could be parried here, the shot never.
    const kick = e.def.attacks.find(a => !a.projectile);
    e.x = p.x + Math.sin(p.yaw) * 2; e.z = p.z + Math.cos(p.yaw) * 2; e.y = p.y;
    const lateInDraw = a => { e.attack = a; e.hitIndex = 0; e.setState(ES.WINDUP); e.stateTime = a.hits[0].startup - 0.05; e.yaw = Math.atan2(p.x - e.x, p.z - e.z); };
    lateInDraw(kick); expect.ok(parryTiming(p, e, CONFIG.parry.arm) !== null, 'the kick could be parried');
    lateInDraw(shot); expect.ok(parryTiming(p, e, CONFIG.parry.arm) === null, 'the shot cannot');
  });
  test('projectiles: ledges, floors and closed gates stop bolts', () => {
    Game.startFight('testBowman'); sim.begin(); log.length = 0;
    const e = Game.duel, shot = bowShot();
    quiet(e); sim.place(27, -4.5, 0);   // right under the walkway's 4 m ledge
    const p = Game.player, hp0 = p.hp;
    e.yaw = Math.atan2(p.x - e.x, p.z - e.z); A.projectiles.fire(e, shot, p); settleBolts();
    expect.near(p.hp, hp0, 1e-9, 'the walkway stopped it'); expect.ok(log.includes('boltStopped'), 'boltStopped event');
    Game.startLevel('test-courtyard'); sim.begin(); sim.clearEnemies(); log.length = 0;
    sim.place(98, -24);   // in the corridor, behind the closed shortcut gate
    const q = Game.player, archer = sim.spawn('testBowman', 98, -6, undefined, Math.PI);
    quiet(archer); A.projectiles.fire(archer, shot, q); settleBolts();
    expect.near(q.hp, q.maxHp, 1e-9, 'the closed gate stopped it'); expect.ok(log.includes('boltStopped'), 'stopped at the gate');
  });
  test('projectiles: an archer shoots in the middle of a crowd fight', () => {
    Game.startLevel('test-crowd'); sim.begin(); shots.length = 0; starts.length = 0;
    const bow = sim.spawn('testBowman', 20, 10, undefined, -Math.PI / 2);
    sim.place(12, 0);
    sim.until(() => shots.some(s => s.enemy === bow) && starts.some(s => s.enemy !== bow), 15);
    expect.ok(shots.some(s => s.enemy === bow), 'the archer loosed a bolt');
    expect.ok(starts.some(s => s.enemy !== bow), 'while the Hollows attacked');
  });
  test('shove: throws the player off the open edge; a block keeps them on; others stay capped', () => {
    const setup = () => {
      Game.startFight('testShover'); sim.begin(); log.length = 0;
      const p = Game.player, e = Game.duel, shove = e.def.attacks.find(a => a.shove);
      sim.place(49, -10); p.yaw = Math.PI / 2;   // facing east, the open edge 3 m behind
      e.x = e.px = 50.9; e.z = e.pz = -10; e.yaw = -Math.PI / 2; e.attack = shove; e.hitIndex = 0; e.setState(ES.WINDUP);
      return { p, e };
    };
    let { p } = setup();
    expect.ok(sim.until(() => !p.alive(), 6) >= 0, 'shoved into the trench'); expect.ok(log.includes('fell'), 'fell event');
    ({ p } = setup());
    sim.hold('block'); sim.seconds(3); sim.release('block');
    expect.ok(p.alive() && Math.abs(p.y - 4) < 1e-6, 'blocking kept the player on the terrace');
    expect.above(p.x, 46, 'still short of the edge');
    sim.step(3);
    const from = { x: p.x - 1, z: p.z };   // from behind: no guard
    p.kx = p.kz = 0; p.takeHit({ damage: 0, poise: 0, knock: 26, shove: false }, from);
    expect.near(p.kx, CONFIG.player.knockCap, 1e-6, 'an ordinary hit is capped');
    p.kx = p.kz = 0; p.takeHit({ damage: 0, poise: 0, knock: 26, shove: true }, from);
    expect.near(p.kx, 26, 1e-6, 'a shove is not');
  });
  test('shortcut gates: shut from the near side, open for good from the far side', () => {
    Game.startLevel('test-courtyard'); sim.begin(); sim.clearEnemies(); log.length = 0;
    const g = world.gates.find(g => g.id === 'shortcut-east');
    sim.place(98, -20); sim.move(0, 1); sim.seconds(3); sim.move(null);
    expect.below(Game.player.z, -14, 'the closed gate holds from the corridor'); expect.ok(!g.open, 'still shut');
    sim.place(98, -8); sim.step(2);
    expect.ok(g.open && log.includes('gateOpened'), 'opened on reaching the east hall');
    const p = Game.player; p.hp = 0; p.setState(PS.DEAD); Game.onPlayerDeath(); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    expect.ok(g.open, 'stays open after dying');
    sim.clearEnemies(); sim.place(98, -20); sim.move(0, 1); sim.seconds(3); sim.move(null);
    expect.above(Game.player.z, -14, 'now the corridor leads through'); expect.ok(!Game.complete, 'shortcuts do not complete the level');
  });

  // ---- v3.4 new enemies and the Bell Warden ------------------------------------------------------------------
  const NEW = ['lancer', 'executioner', 'duelist', 'bowman', 'shover', 'bellWarden'];
  const strikeOf = id => makeStrike(A.PLAYER_DEF.moveset.attacks[id]);
  const behind = e => ({ x: e.x - Math.sin(e.yaw) * 2, z: e.z - Math.cos(e.yaw) * 2 });
  const inFrontOf = e => ({ x: e.x + Math.sin(e.yaw) * 2, z: e.z + Math.cos(e.yaw) * 2 });
  const sturdy = p => { p.maxHp = p.hp = 1e9; };   // a player who outlasts any test
  const faceOff = (e, p, d = 2) => {   // the enemy d m in front of the player, facing them
    e.x = e.px = p.x + Math.sin(p.yaw) * d; e.z = e.pz = p.z + Math.cos(p.yaw) * d; e.y = p.y; e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
  };
  const holdAt = (e, r) => { if (e.state === ES.CHASE) faceOff(e, Game.player, r); };   // r m in front of the player while it chooses
  const starts = [];   // every attack an enemy started: who, which, when (s) and how far from the player (m)
  A.events.on('attackStart', d => starts.push({ enemy: d.enemy, attack: d.attack, t: clock,
                                                dist: Math.hypot(d.enemy.x - Game.player.x, d.enemy.z - Game.player.z) }));
  const attacksAt = (id, r, seconds = 30) => {   // a duel with the enemy held r m from the player: the attacks it started
    Game.startFight(id); sim.begin(); sturdy(Game.player); starts.length = 0;
    for (let i = 0; i < seconds / STEP; i++) { holdAt(Game.duel, r); sim.step(); }
    return starts.map(s => s.attack.id);
  };
  test('player: 1.2x health, 1.6x stamina, a lighter heavy attack', () => {
    const S = A.PLAYER_DEF.stats;
    expect.ok(S.maxHp === 120 && S.maxStamina === 160, `stats ${S.maxHp} HP, ${S.maxStamina} stamina`);
    expect.ok(A.PLAYER_DEF.moveset.attacks.heavy.damage === 38, 'heavy attack damage 38');
    Game.startLevel('tutorial'); sim.begin();
    expect.ok(Game.player.hp === 120 && Game.player.stamina === 160, 'a fresh player starts full');
  });
  test('new enemies: each duels in the arena, attacks, and can be beaten', () => {
    for (const id of NEW) {
      Game.startFight(id); sim.begin(); sturdy(Game.player);
      const e = Game.duel;
      expect.ok(sim.until(() => e.state === ES.WINDUP, 12) >= 0, `${id}: attacks`);
      let n = 0;
      while (e.alive() && n++ < 80) { e.takeHit(strikeOf('heavy'), behind(e)); sim.step(12); }
      expect.ok(!e.alive(), `${id}: beaten (${n} heavy hits)`);
    }
  });
  test('new enemies: every attack runs its whole course', () => {
    for (const id of NEW) {
      Game.startFight(id); sim.begin(); sturdy(Game.player); log.length = 0; shots.length = 0;
      const e = Game.duel;
      for (const a of e.def.attacks) {
        log.length = 0;
        sim.until(() => e.state === ES.CHASE || e.state === ES.IDLE, 4);
        e.beginAttack(a);
        expect.ok(sim.until(() => e.state === ES.RECOVER, 6) >= 0, `${id} ${a.id}: wound up, struck and recovered`);
        if (a.projectile) expect.ok(shots.some(s => s.enemy === e), `${id} ${a.id}: loosed a bolt`);
        if (a.rollOnly) expect.ok(log.includes('perilous'), `${id} ${a.id}: perilous warning`);
        if (a.impact) expect.ok(log.includes('impact'), `${id} ${a.id}: ground impact`);
      }
    }
  });
  test('Executioner: three heavy hits break its stagger meter; its spin goes through a guard', () => {
    Game.startFight('executioner'); sim.begin();
    let e = Game.duel;
    e.takeHit(strikeOf('heavy'), behind(e)); e.takeHit(strikeOf('heavy'), behind(e));
    expect.ok(e.state !== ES.BROKEN, 'two heavies do not break it');
    e.takeHit(strikeOf('heavy'), behind(e));
    expect.ok(e.state === ES.BROKEN, 'the third does');
    Game.startFight('executioner'); sim.begin();
    const p = Game.player, spin = A.ENEMY_BY_ID.executioner.attacks.find(a => a.id === 'execSpin'), hp0 = p.hp;
    e = Game.duel; faceOff(e, p, 2.2); sim.hold('block'); sim.step(2);
    e.beginAttack(spin);
    sim.until(() => p.hp < hp0, 4); sim.release('block');
    expect.near(hp0 - p.hp, spin.damage, 0.01, 'full damage through the guard');
  });
  test('Pale Duelist: its combo can be parried, and it is fragile', () => {
    Game.startFight('duelist'); sim.begin(); log.length = 0;
    const p = Game.player, e = Game.duel, combo = e.def.attacks.find(a => a.hits.length > 1);
    faceOff(e, p, 2); e.beginAttack(combo);
    sim.until(() => e.stateTime >= combo.hits[0].startup - 0.08, 2); sim.press('parry');
    sim.until(() => log.includes('parry'), 0.5);
    expect.ok(log.includes('parry') && e.state === ES.PARRIED, 'parried and left open');
    Game.startFight('duelist'); sim.begin();
    const d = Game.duel; let n = 0;
    while (d.alive() && n++ < 20) { d.takeHit(strikeOf('light'), behind(d)); sim.step(30); }
    expect.ok(!d.alive() && n <= 5, `fragile: ${n} light hits`);
  });
  test('Ashen Lancer: dashes again and again from mid range, never up close; its jab leaves an opening', () => {
    const mid = attacksAt('lancer', 6), close = attacksAt('lancer', 2);
    expect.above(mid.filter(id => id === 'lancerDash').length, 1, `dashes from 6 m (${mid.join(', ')})`);
    expect.ok(close.length > 3 && !close.includes('lancerDash'), `never dashes from 2 m (${close.join(', ')})`);
    const jab = A.ENEMY_BY_ID.lancer.attacks.find(a => a.id === 'lancerJab');
    expect.above(jab.recovery, jab.hits[0].startup, 'the jab recovers slower than it strikes');
  });
  test('Shover: its shield blocks frontal hits; flanking does full damage', () => {
    Game.startFight('shover'); sim.begin();
    const e = Game.duel; e.notice = 0; e.setState(ES.IDLE);
    let hp0 = e.hp; e.takeHit(strikeOf('light'), inFrontOf(e));
    expect.near(hp0 - e.hp, strikeOf('light').damage * e.def.guard.damageMul, 0.01, 'blocked from the front');
    hp0 = e.hp; e.takeHit(strikeOf('light'), behind(e));
    expect.near(hp0 - e.hp, strikeOf('light').damage, 0.01, 'full damage from behind');
  });
  test('Bell Warden: a posture boss with a roll-only slam, an uncapped push and a gap-closing charge', () => {
    Game.startFight('bellWarden'); sim.begin(); Game.render(1, STEP);
    const e = Game.duel, A2 = id => e.def.attacks.find(a => a.id === id);
    expect.ok(!!e.def.posture && !A.hud.eBars.classList.contains('hidden'), 'posture bar at the top of the screen');
    expect.ok(makeStrike(A2('bellSlam')).rollOnly && !!A2('bellSlam').impact, 'slam: roll-only, with a ground flash');
    expect.ok(makeStrike(A2('bellShove')).shove && A2('bellShove').knock > CONFIG.player.knockCap, 'push: beyond the knockback cap');
    expect.ok(A2('bellSweep').track > 0, 'sweep: tracks');
    let n = 0;
    while (e.state !== ES.BROKEN && n++ < 30) { e.takeHit(strikeOf('heavy'), behind(e)); sim.step(10); }
    expect.ok(e.state === ES.BROKEN, `posture broke after ${n} chained heavy hits`);
    const far = attacksAt('bellWarden', 8), near = attacksAt('bellWarden', 2.5);
    expect.ok(far.includes('bellCharge') && !near.includes('bellCharge'), `charge: only from range (8 m: ${far.join(', ')}; 2.5 m: ${near.join(', ')})`);
  });
  test('mixed crowd: the gallery bowmen shoot down into the fight', () => {
    Game.startLevel('test-mixed'); sim.begin(); shots.length = 0; starts.length = 0;
    const p = Game.player; sturdy(p); sim.place(24, 0);
    sim.seconds(20);
    expect.above(new Set(starts.filter(s => s.enemy.def.id !== 'bowman').map(s => s.enemy)).size, 2, 'melee enemies that attacked');
    sim.until(() => shots.some(s => s.enemy.def.id === 'bowman'), 40);   // the melee swings damp their chance: give them time
    const bowmen = Game.enemies.filter(e => e.def.id === 'bowman');
    expect.ok(shots.some(s => s.enemy.def.id === 'bowman'), 'the bowmen shot'); expect.ok(bowmen.every(b => Math.abs(b.y - 5) < 1e-6), 'from their gallery');
  });

  // ---- v3.5 Level 3: The Tower ---------------------------------------------------------------------------------
  // The way up, as waypoints [x, z, zone?]: arriving at a zone's waypoint kills its fighters and waits for its gate.
  const TOWER_ROUTE = [
    [22, 0, 'zone-gatehouse'], [33, 0], [40, 0], [60, 0, 'zone-courtyard'], [42, 0], [38, 18], [38, 24], [48, 24], [60, 24], [68, 24],
    [80, 24], [92, 24, 'zone-rampart'], [98, 24], [98, 16], [98, 4, 'zone-hall'], [100, -4], [111.5, -4], [112, 0], [112, 9],
    [112, 11.5], [88, 11.5], [87.5, 8], [87.5, -8], [88, -11.5], [112.5, -11.5], [112.5, -8], [112.5, 8], [112, 14],
    [100, 14, 'zone-walkway'], [88, 14], [88, 9], [88, -8], [87, -13], [95, -13], [96, -4, 'zone-bell'],
  ];
  const tower = () => { Game.startLevel('the-tower'); sim.begin(); log.length = 0; shots.length = 0; return Game.player; };
  const dropFrom = (x, z, y, dx, dz) => {   // walk off an edge; returns [landing height, damage taken, alive]
    const p = Game.player; sim.place(x, z, y); p.hp = p.maxHp;
    sim.move(dx, dz); sim.until(() => !p.grounded, 3); sim.until(() => p.grounded || !p.alive(), 4); sim.move(null);
    return [p.y, p.maxHp - p.hp, p.alive()];
  };
  test('the tower: follows Level 2, and its data, gates and culling are in place', () => {
    expect.ok(A.LEVEL_2.next === 'the-tower' && A.LEVELS.indexOf(A.LEVEL_3) === A.LEVELS.indexOf(A.LEVEL_2) + 1, 'Level 2 leads into the Tower');
    tower();
    expect.ok(Game.zones.length === 6 && Game.zones.every(z => !z.gate.open), 'six zone gates, all shut');
    expect.ok(world.gates.some(g => g.id === 'postern' && g.opensFrom && !g.open), 'the postern shortcut, shut');
    expect.ok(world.bonfires.length === 3, 'three bonfires');
    sim.step(1); Game.render(1, STEP);
    expect.ok(A.visuals.info().pointLights === CONFIG.cull.maxLights && A.visuals.info().sky && A.visuals.info().grass > 0, 'culled lights, sky and grass');
    expect.above(Game.enemies.filter(e => e.asleep).length, 10, 'the far enemies sleep at the start');
  });
  test('the tower: a scripted run opens every gate in turn and completes the level', () => {
    const p = tower(); sturdy(p);
    const opened = [];
    for (const [x, z, zone] of TOWER_ROUTE) {
      const reached = sim.until(() => {
        for (const e of Game.enemies) if (e.alive() && !e.in('unaware') && e.state !== ES.DORMANT) e.die();   // whatever engages falls
        const dx = x - p.x, dz = z - p.z;
        if (Math.hypot(dx, dz) < 0.5) return true;
        sim.move(dx, dz); return false;
      }, 30) >= 0;
      sim.move(null);
      expect.ok(reached && p.alive(), `reached (${x}, ${z}); stuck at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
      if (!zone) continue;
      const Z = Game.zones.find(q => q.id === zone);
      for (const e of Z.actors) if (e.alive()) e.die();
      expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0, `${zone}: its gate opened`);
      opened.push(zone);
    }
    expect.near(p.y, 22, 1e-6, 'on top of the tower');
    expect.ok(Game.complete && log.includes('levelComplete'), `LEVEL COMPLETE (${opened.length} gates)`);
  });
  test('the tower: the grate drops safely into the undercroft, whose stairs climb back to the gatehouse', () => {
    const p = tower(); sim.clearEnemies();
    sim.place(45.5, -13, 0); sim.walkTo(45.5, -16.5, 0.3, 5); sim.until(() => p.grounded && p.y < -1, 4);
    expect.near(p.y, -4, 1e-6, 'in the undercroft'); expect.near(p.hp, p.maxHp, 1e-9, 'a 4 m drop is free');
    expect.ok(sim.walkTo(38, -18) && sim.walkTo(22, -18) && sim.walkTo(18, -12) && sim.walkTo(18, -7.5) && sim.walkTo(22, -4), 'back up the stairs');
    expect.near(p.y, 0, 1e-6, 'in the gatehouse');
  });
  test('the tower: the postern opens only from the stair side, back to the courtyard', () => {
    const p = tower(); sim.clearEnemies();
    const g = world.gates.find(q => q.id === 'postern');
    sim.place(80, -13); sim.move(1, 0); sim.seconds(3); sim.move(null);
    expect.below(p.x, 86, 'shut from the courtyard'); expect.ok(!g.open, 'still shut');
    sim.place(100, -4, 6);
    expect.ok(sim.walkTo(106, -12) && sim.walkTo(95, -13) && sim.walkTo(88.5, -13), 'from the hall down the postern stair');
    sim.step(3); expect.ok(g.open, 'opened from the stair side');
    sim.seconds(2); expect.ok(sim.walkTo(80, -13), 'through into the courtyard'); expect.near(p.y, 0, 1e-6, 'courtyard floor');
  });
  test('the tower: the rampart gap hurts a little, the walks over the courtyard a lot, the cliff kills', () => {
    tower(); sim.clearEnemies();
    const gap = dropFrom(68, 24, 6, 0, -1);
    expect.ok(gap[0] === 0 && gap[2], 'from the rampart gap into the courtyard'); expect.near(gap[1], (6 - F.safe) * F.perMetre, 0.6, 'small damage');
    const walk = dropFrom(87, 11.5, 10, -1, 0);
    expect.ok(walk[0] === 0 && walk[2], 'off the north walk into the courtyard'); expect.near(walk[1], (10 - F.safe) * F.perMetre, 0.6, 'heavy damage');
    const south = dropFrom(87, -11.5, 14, -1, 0);
    expect.ok(!south[2], 'off the south walk (14 m) is lethal');
    tower(); sim.clearEnemies();
    const cliff = dropFrom(113, 11.5, 10, 1, 0);
    expect.ok(!cliff[2] && log.includes('fell'), 'off the cliff side: a pit');
  });
  test('the tower: the rampart bowmen shoot down into the courtyard fight', () => {
    const p = tower(); sturdy(p);
    sim.place(62, 6); sim.seconds(12);
    expect.ok(shots.some(s => s.enemy.def.id === 'bowman' && Math.abs(s.enemy.y - 6) < 1e-6), 'a bolt from the rampart');
  });

  // ---- v3.6 attack chance, holding and crowds ------------------------------------------------------------------
  const inWindow = s => s.dist >= (s.attack.minRange || 0) - 1e-6 && s.dist <= s.attack.range + 1e-6;
  test('attack chance: attacks start only with the player inside their range window', () => {
    for (const id of ['lancer', 'duelist', 'bowman', 'bellWarden', 'knight']) {
      Game.startFight(id); sim.begin(); sturdy(Game.player); starts.length = 0;
      const e = Game.duel;
      for (let i = 0; i < 60 * 30; i++) { holdAt(e, 1.5 + 12 * ((i / 60 / 8) % 1) ** 2); sim.step(); }   // sweeps 1.5 to 13.5 m every 8 s, slower up close
      const mine = starts.filter(s => s.enemy === e), bad = mine.find(s => !inWindow(s));
      expect.above(mine.length, 1, `${id}: attacks started`);
      expect.ok(!bad, `${id}: ${bad && bad.attack.id} started at ${bad && bad.dist.toFixed(2)} m`);
    }
    Game.startLevel('test-mixed'); sim.begin(); sturdy(Game.player); starts.length = 0;   // a crowd, nobody held in place
    sim.place(24, 0);
    for (let i = 0; i < 40; i++) { sim.move(Math.cos(i * 2.4), Math.sin(i * 2.4)); sim.seconds(0.6); }
    sim.move(null);
    const bad = starts.find(s => !inWindow(s));
    expect.above(starts.length, 5, 'the crowd attacked');
    expect.ok(!bad, `${bad && bad.enemy.def.id} ${bad && bad.attack.id} started at ${bad && bad.dist.toFixed(2)} m`);
  });
  // Seconds from the end of each attack to the start of the next, for a duel held r m from the player.
  const waitsAt = (id, r, seconds = 40) => {
    Game.startFight(id); sim.begin(); sturdy(Game.player);
    const e = Game.duel, waits = [];
    let free = null;
    for (let i = 0; i < seconds / STEP; i++) {
      const was = e.state;
      holdAt(e, r); sim.step();
      if (was === ES.RECOVER && e.state === ES.CHASE) free = 0;
      else if (free !== null && e.state === ES.CHASE) free += STEP;
      else if (free !== null && e.state === ES.WINDUP) { waits.push(free); free = null; }
    }
    return waits;
  };
  test('attack chance: close attacks strike as soon as the cooldown is over', () => {
    for (const id of ['hollow', 'knight', 'shover']) {
      const waits = waitsAt(id, 1.5), longest = A.ENEMY_BY_ID[id].cooldown[1];
      expect.above(waits.length, 5, `${id}: attacks`);
      expect.below(Math.max(...waits), longest + 0.1, `${id}: longest wait between attacks (cooldown up to ${longest} s)`);
    }
  });
  test('attack chance: gap closers still wait on their chance', () => {
    const waits = waitsAt('lancer', 6, 60), longest = A.ENEMY_BY_ID.lancer.cooldown[1];
    expect.above(waits.length, 2, 'dashes');
    expect.above(Math.max(...waits), longest + 0.5, 'longest wait between dashes');
  });
  test('attack chance: stepping in, a boss uses all its close attacks, not only its longest', () => {
    Game.startFight('bellWarden'); sim.begin(); sturdy(Game.player); starts.length = 0;
    sim.seconds(120);
    const used = new Set(starts.map(s => s.attack.id));
    expect.ok(['bellSweep', 'bellSlam', 'bellShove'].every(id => used.has(id)), `close attacks used: ${[...used].join(', ')}`);
  });
  test('attack chance: an attack with a higher chance starts more often', () => {
    const swing = A.ENEMY_BY_ID.hollow.attacks.find(a => a.id === 'swing');
    const def = { ...A.ENEMY_BY_ID.hollow, id: 'testOdds', attacks: [{ ...swing, id: 'often', chance: 2 }, { ...swing, id: 'rarely', chance: 0.4 }] };
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player); starts.length = 0;
    sim.place(18, 0);
    const e = sim.spawn(def, 22, 0, undefined, -Math.PI / 2);
    for (let i = 0; i < 90 / STEP; i++) { holdAt(e, 1.5); sim.step(); }
    const n = id => starts.filter(s => s.attack.id === id).length;
    expect.above(n('often') + n('rarely'), 20, 'attacks started');
    expect.above(n('often'), 2.5 * n('rarely'), `the 2/s attack (${n('often')}) against the 0.4/s one (${n('rarely')})`);
  });
  test('crowds: every enemy may attack, but no two attacks start within 0.3 s', () => {
    Game.startLevel('test-crowd'); sim.begin(); sturdy(Game.player); starts.length = 0;
    sim.place(18, 0);
    let most = 0;
    for (let i = 0; i < 40 / STEP; i++) { sim.step(); most = Math.max(most, Game.enemies.filter(e => e.in('attacking')).length); }
    const t = starts.map(s => s.t).sort((a, b) => a - b), gap = Math.min(...t.slice(1).map((v, i) => v - t[i]));
    expect.above(starts.length, 10, 'attacks started');
    expect.above(gap, 0.3 - 1e-6, 'shortest time between two attack starts');
    expect.ok(new Set(starts.map(s => s.enemy)).size === 5, 'all five attacked');
    expect.above(most, 2, 'most enemies mid-attack at once');
  });
  test('crowds: a crowd spreads evenly all round the player, in front too', () => {
    Game.startLevel('test-crowd'); sim.begin(); sturdy(Game.player);
    const TAU = Math.PI * 2, even = TAU / 5;
    let widest = 0, front = 0, samples = 0;
    for (let i = 0; i < 40 / STEP; i++) {
      sim.place(18, 0); sim.step();   // the player pinned, facing the five Hollows' arc
      if (i < 10 / STEP || i % 30) continue;   // every half second once they have closed in
      const p = Game.player, at = Game.enemies.filter(e => e.alive()).map(e => Math.atan2(e.x - p.x, e.z - p.z)).sort((a, b) => a - b);
      const gaps = at.map((a, k) => (k + 1 < at.length ? at[k + 1] : at[0] + TAU) - a);
      widest += Math.max(...gaps); samples++;
      if (at.some(a => Math.abs(angDiff(a, p.yaw)) < even / 2 + 0.2)) front++;
    }
    expect.below(widest / samples, even * 1.5, 'widest gap between neighbours, on average (rad)');
    expect.above(front / samples, 0.8, 'share of the time someone stands in front');
  });
  test('data: attack tokens are gone; chance, approach and minRange are checked at load', () => {
    expect.ok(!('tokens' in CONFIG) && !('tokens' in A), 'no token tuning or module');
    expect.ok(A.ALL_LEVELS.every(L => !('attackTokens' in L)), 'no level sets attackTokens');
    expect.ok(A.validateData().length === 0, 'the shipped data passes');
    const lancer = A.ENEMY_BY_ID.lancer, jab = lancer.attacks.find(a => a.id === 'lancerJab'), dash = lancer.attacks.find(a => a.id === 'lancerDash');
    const rejects = (obj, key, value) => {   // one bad value: the load-time check names the field
      const had = key in obj, old = obj[key];
      obj[key] = value;
      const errors = A.validateData();
      if (had) obj[key] = old; else delete obj[key];
      expect.ok(errors.some(m => m.includes(key)), `${key} = ${JSON.stringify(value)}: ${errors.join(' | ') || 'no error'}`);
    };
    rejects(jab, 'chance', -1); rejects(jab, 'chance', 'often');
    rejects(lancer, 'approach', -0.5); rejects(lancer, 'approach', null);
    rejects(dash, 'minRange', 9); rejects(jab, 'minRange', 3);
  });
  test('holding: circling and stepping in never walk off an open walkway', () => {
    const p = heights(); sturdy(p);   // the open walkway over the trench: 3 m wide, 4 m up, open both sides
    const walkers = [[33, -4.5, 'hollow'], [43, -4.5, 'hollow'], [45, -5, 'lancer'], [31, -4, 'duelist']].map(([x, z, id]) => sim.spawn(id, x, z));
    let lowest = Infinity, moved = 0;
    for (let i = 0; i < 40 / STEP; i++) {
      sim.place(38, -4.5, 4); sim.step();   // the player pinned in the middle of the walkway
      for (const e of walkers) { lowest = Math.min(lowest, e.y); moved += Math.hypot(e.x - e.px, e.z - e.pz); }
    }
    expect.near(lowest, 4, 1e-6, 'never left the walkway'); expect.ok(walkers.every(e => e.alive()), 'all alive');
    expect.above(moved, 40, 'metres walked by the crowd');
    expect.above(starts.filter(s => walkers.includes(s.enemy)).length, 5, 'attacks they started');
  });
  test('holding: enemies wait near their longest reach, and now and then step in to their shortest', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player);
    const ranges = A.ENEMY_BY_ID.lancer.attacks.map(a => a.range), longest = Math.max(...ranges), shortest = Math.min(...ranges);
    const lancers = [-6, 0, 6].map(z => sim.spawn('lancer', 32, z, undefined, -Math.PI / 2));
    const settled = [], last = new Map(), held = new Set();   // distances where they stand; lancers seen waiting far out
    let stepIns = 0;
    for (let i = 0; i < 60 / STEP; i++) {
      sim.place(20, 0); sim.step();   // the player pinned in the middle of the yard
      for (const e of lancers) {
        const d = Math.hypot(e.x - Game.player.x, e.z - Game.player.z), radial = Math.abs(d - (last.get(e) ?? Infinity)) / STEP;
        last.set(e, d);
        if (e.state !== ES.CHASE) { held.delete(e); continue; }   // attacking or reeling: not walking by itself
        if (radial < 0.5) settled.push(d);   // standing its ground (or circling), not closing in or backing off
        if (d >= longest - 1.5) held.add(e);
        else if (d <= shortest && held.has(e)) { stepIns++; held.delete(e); }   // walked all the way in without attacking
      }
    }
    const near = settled.filter(d => d >= longest - 1.5 && d <= longest + 0.5).length / settled.length;
    expect.above(near, 0.5, `share of the time standing near the longest reach (${longest} m)`);
    expect.above(stepIns, 0, 'stepped in to the shortest reach');
  });
  test('holding: an enemy stepping in goes back to its longer range when the player gets well away', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player); starts.length = 0;
    const longest = Math.max(...A.ENEMY_BY_ID.lancer.attacks.map(a => a.range));
    const keen = { ...A.ENEMY_BY_ID.lancer, approach: 3 }, e = sim.spawn(keen, 32, 0, undefined, -Math.PI / 2);   // keen to step in
    let held = false;
    const caught = sim.until(() => {   // walked in from its longest reach to mid range, without attacking
      sim.place(20, 0);
      const d = Math.hypot(e.x - Game.player.x, e.z - Game.player.z);
      if (e.state !== ES.CHASE) held = false;
      else if (d >= longest - 1.5) held = true;
      else if (held && d <= 5) return true;
      return false;
    }, 30);
    expect.ok(caught >= 0, 'caught it stepping in');
    keen.approach = 0;   // from here on it never chooses to step in again: watch it give up this one
    const p = Game.player, a = Math.atan2(p.x - e.x, p.z - e.z), to = [e.x + Math.sin(a) * 10, e.z + Math.cos(a) * 10];
    const n = starts.length;
    let closest = Infinity;
    for (let i = 0; i < 1.5 / STEP && starts.length === n; i++) {   // the player 10 m off (past its dash) until it attacks
      sim.place(to[0], to[1]); sim.step();
      if (i > 0.6 / STEP) closest = Math.min(closest, Math.hypot(e.x - p.x, e.z - p.z));
    }
    expect.ok(Number.isFinite(closest), 'watched it for a while before any attack');
    expect.above(closest, longest - 1.5, `closest it came once the player had left (its longest reach is ${longest} m)`);
  });

  async function run(filter = '') {
    const out = [], t0 = performance.now();
    const wasMode = Game.mode;
    for (const t of tests) {
      if (filter && !t.name.includes(filter)) continue;
      let ok = true, msg = '';
      Math.random = seededRandom(12345);   // seeded from the start, so enemies built before sim.begin() repeat too
      try { t.fn(); } catch (e) { ok = false; msg = e instanceof Fail ? e.message : `${e.name}: ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`; }
      finally { sim.end(); }
      out.push({ name: t.name, ok, msg });
      await new Promise(r => setTimeout(r, 0));   // let the page breathe between tests
    }
    if (wasMode !== 'play') { Game.reset && Game.player && Game.showMenu('main'); }
    const failed = out.filter(r => !r.ok);
    const summary = `${out.length - failed.length}/${out.length} passed in ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    console.log(summary); for (const r of failed) console.warn('FAIL ' + r.name + '\n  ' + r.msg);
    if (Object.keys(metrics).length) console.log('metrics', JSON.stringify(metrics));
    return { summary, failed: failed.map(r => `${r.name}: ${r.msg}`), passed: out.filter(r => r.ok).map(r => r.name), metrics };
  }
  A.tests = { run, sim, expect, test, list: () => tests.map(t => t.name) };
})();
