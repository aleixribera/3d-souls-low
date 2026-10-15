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
    // A fresh enemy at (x, z) on the floor there (behaviour `gated`), added to the fight.
    spawn(id, x, z, y, yaw = 0) {
      const e = new A.Enemy(A.ENEMY_BY_ID[id], { ...Game.spawnSpec({ spawn: { x, y, z, yaw } }, 'gated') });
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

  async function run(filter = '') {
    const out = [], t0 = performance.now();
    const wasMode = Game.mode;
    for (const t of tests) {
      if (filter && !t.name.includes(filter)) continue;
      let ok = true, msg = '';
      try { t.fn(); } catch (e) { ok = false; msg = e instanceof Fail ? e.message : `${e.name}: ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`; }
      finally { sim.end(); }
      out.push({ name: t.name, ok, msg });
      await new Promise(r => setTimeout(r, 0));   // let the page breathe between tests
    }
    if (wasMode !== 'play') { Game.reset && Game.player && Game.showMenu('main'); }
    const failed = out.filter(r => !r.ok);
    const summary = `${out.length - failed.length}/${out.length} passed in ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    console.log(summary); for (const r of failed) console.warn('FAIL ' + r.name + '\n  ' + r.msg);
    return { summary, failed: failed.map(r => `${r.name}: ${r.msg}`), passed: out.filter(r => r.ok).map(r => r.name) };
  }
  A.tests = { run, sim, expect, test, list: () => tests.map(t => t.name) };
})();
