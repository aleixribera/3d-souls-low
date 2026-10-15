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

  // ---- first, before any other test draws an effect: frame times around jump-attack landings -------------------
  // A shader compiles the first time something is drawn with it, which stalls that frame, so this test comes first:
  // its first landing is the first after the page loaded. Each frame is one step and one render, waiting for the GPU.
  // The landing frame and the two after it (where the ground ring, crack, dust, burst and blood first show) are held
  // against the frames before the jump: a stall stands out from them, while the odd slow frame of a busy browser
  // (up to about 7 ms here) does not.
  const frames = [];   // ms per frame
  let landedAt = -1;   // the index of the frame whose step landed
  A.events.on('land', () => { landedAt = frames.length; });
  test('jump attack: no landing stalls a frame, the first after loading or later, with a hit or without', () => {
    const gl = A.renderer.getContext(), px = new Uint8Array(4), margin = { ratio: 2, ms: 6 };
    const frame = () => { const t0 = performance.now(); sim.step(1); Game.render(1, STEP); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); frames.push(performance.now() - t0); };
    const median = xs => [...xs].sort((a, b) => a - b)[xs.length >> 1];
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies();
    const p = Game.player, report = [];
    for (const [when, hit] of [['first', false], ['first', true], ['later', false], ['later', true]]) {
      sim.place(12, 0); p.yaw = Math.PI / 2; p.stamina = p.maxStamina;
      const target = hit ? sim.spawn('hollow', 13.6, 0, undefined, -Math.PI / 2) : null;
      if (target) quiet(target);
      frames.length = 0; landedAt = -1;
      for (let i = 0; i < 30; i++) frame();
      sim.press('jump'); frame(); frame(); frame(); sim.press('heavy');
      while (landedAt < 0 && frames.length < 150) frame();
      for (let i = 0; i < 10; i++) frame();
      expect.ok(landedAt >= 0, `${when}: a jump attack landed`);
      const base = median(frames.slice(0, 30)), worst = Math.max(...frames.slice(landedAt, landedAt + 3));
      report.push(`${when}${hit ? ' hit' : ''}: landing ${worst.toFixed(1)} ms, before ${base.toFixed(1)} ms`);
      if (target) { expect.below(target.hp, target.def.hp, `${when}: the jump attack hit`); sim.clearEnemies(); }
      expect.below(worst, base * margin.ratio + margin.ms, `${when} landing${hit ? ' with a hit' : ''}: its slowest frame against ${base.toFixed(1)} ms before`);
    }
    metrics.jumpLanding = report;
  });

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
  const NEW = ['lancer', 'executioner', 'duelist', 'bowman', 'shover', 'bellWarden', 'pillagerCaptain'];
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

  // ---- v3.5 The Tower (Level 4 since v4.0) ---------------------------------------------------------------------------------
  // The way up, as waypoints [x, z, zone?]: arriving at a zone's waypoint kills its fighters and waits for its gate.
  // The passage floor gives way under the player at (26, 0): the fight below, then up to the bait bonfire and round the bend.
  const TOWER_ROUTE = [
    [14, 0, 'zone-gatehouse'], [23, 0], [26, 0], [26, -2, 'zone-undercroft'], [26, -13], [32, -13], [32, -9], [32, -1], [32, 5],
    [35, 5.5], [40, 5.5], [60, 0, 'zone-courtyard'], [42, 0], [38, 18], [38, 24], [48, 24], [60, 24], [68, 24],
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
    expect.ok(A.LEVEL_3.next === 'the-tower' && A.LEVELS.indexOf(A.LEVEL_4) === A.LEVELS.indexOf(A.LEVEL_3) + 1, 'the town leads into the Tower');
    tower();
    expect.ok(Game.zones.length === 7 && Game.zones.every(z => !z.gate.open), 'seven zone gates, all shut');
    expect.ok(world.gates.some(g => g.id === 'postern' && g.opensFrom && !g.open), 'the postern shortcut, shut');
    expect.ok(world.gates.some(g => g.id === 'bonfire-portcullis' && !g.open), 'the portcullis before the bait bonfire, shut');
    expect.ok(world.bonfires.length === 4, 'four bonfires');
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
    sim.place(62, 6);
    sim.until(() => shots.some(s => s.enemy.def.id === 'bowman' && Math.abs(s.enemy.y - 6) < 1e-6), 30);   // their cooldowns run slower while the melee swings
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
  test('attack chance: a player hovering just outside close reach gets struck, not stalked', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player); starts.length = 0;
    const lancer = A.ENEMY_BY_ID.lancer, jab = lancer.attacks.find(a => a.id === 'lancerJab');
    const e = sim.spawn({ ...lancer, approach: 0 }, 30, 0, undefined, -Math.PI / 2), p = Game.player;   // never steps in by chance
    let waited = 0;
    sim.until(() => {   // holding far out, ready: 2 s without attacking is longer than its cooldown
      sim.place(20, 0);
      waited = e.state === ES.CHASE && Math.hypot(e.x - p.x, e.z - p.z) > 7 ? waited + STEP : 0;
      return waited > lancer.cooldown[1] + 0.5;
    }, 40);
    const a = Math.atan2(p.x - e.x, p.z - e.z), at = [e.x + Math.sin(a) * (jab.range + 0.6), e.z + Math.cos(a) * (jab.range + 0.6)];
    const n = starts.length;
    sim.until(() => { sim.place(at[0], at[1]); return starts.length > n; }, 1.5);   // the player stops just out of its jab's reach
    const first = starts[n];
    expect.ok(!!first, `it attacked within 1.5 s (still ${Math.hypot(e.x - p.x, e.z - p.z).toFixed(1)} m away)`);
    expect.ok(!first.attack.dash, `with a close attack (${first.attack.id})`);
  });
  // An enemy held r m from the player, with `busy` other enemies kept mid-attack far off: the seconds between its
  // attacks, and the shots it looses.
  const withBusy = (id, r, busy, seconds) => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player); shots.length = 0;
    sim.place(12, 0);
    const e = sim.spawn(id, 14, 0, undefined, -Math.PI / 2), swing = A.ENEMY_BY_ID.hollow.attacks[0];
    const others = Array.from({ length: busy }, (_, k) => sim.spawn('hollow', 38, k * 6 - 6));
    const waits = [];
    let free = null;
    for (let i = 0; i < seconds / STEP; i++) {
      for (const o of others) { o.attack = swing; o.hitIndex = 0; o.setState(ES.WINDUP); }   // forever winding up
      const was = e.state;
      sim.place(12, 0); holdAt(e, r); sim.step();
      if (was === ES.RECOVER && e.state === ES.CHASE) free = 0;
      else if (free !== null && e.state === ES.CHASE) free += STEP;
      else if (free !== null && e.state === ES.WINDUP) { waits.push(free); free = null; }
    }
    return { waits, shots: shots.filter(s => s.enemy === e).length };
  };
  const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
  test('crowds: cooldowns run slower while other enemies are mid-attack', () => {
    const alone = withBusy('hollow', 1.5, 0, 60).waits, crowded = withBusy('hollow', 1.5, 2, 60).waits;
    expect.above(crowded.length, 5, 'attacks with two others mid-attack');
    expect.above(mean(crowded), 1.5 * mean(alone), `mean wait between attacks, against ${mean(alone).toFixed(2)} s alone`);
  });
  test('crowds: an archer keeps shooting while others are mid-attack', () => {
    const alone = withBusy('bowman', 10, 0, 90).shots, crowded = withBusy('bowman', 10, 2, 90).shots;
    expect.above(alone, 8, 'shots alone');
    expect.above(crowded, 0.6 * alone, `shots with two others mid-attack (alone: ${alone})`);
  });
  test('crowds: an enemy that gives up the chase walks home instead of flickering back to it', () => {
    Game.startLevel('test-mixed'); sim.begin(); sim.clearEnemies(); log.length = 0;
    sim.place(22, 0);
    const e = sim.spawn('hollow', 30, 0, undefined, -Math.PI / 2);
    e.leash = 5;   // the player, 8 m off and in sight, is past its leash
    sim.seconds(3);
    expect.below(log.filter(t => t === 'alert').length, 2, 'alerts');
    expect.ok(e.state !== ES.CHASE, `state ${e.state}`);
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

  // ---- v3.7 tutorial and tower fixes ---------------------------------------------------------------------------
  // The tutorial, jumped straight to one step (its dummies set up as the step starts).
  const tutorialAt = id => {
    Game.startLevel('tutorial'); sim.begin(); log.length = 0;
    Game.tut.index = Game.tutorialSteps().findIndex(s => s.id === id);
    Game.setupTutorialStep(); Game.render(1, STEP);
    return Game.player;
  };
  const shown = id => (document.getElementById(id) || {}).textContent || '';
  test('block: C, L and both side mouse buttons hold block; Ctrl no longer does', () => {
    const p = tutorialAt('block');
    for (const code of ['KeyC', 'KeyL', 'Mouse3', 'Mouse4']) {
      input.down(code); sim.step(2);
      expect.ok(p.state === PS.BLOCK, `${code} blocks (state ${p.state})`);
      input.up(code); sim.step(2);
      expect.ok(p.state !== PS.BLOCK, `${code} let go`);
    }
    for (const code of ['ControlLeft', 'ControlRight']) {
      input.down(code); sim.step(2);
      expect.ok(p.state !== PS.BLOCK, `${code} does not block`);
      input.up(code);
    }
    for (const button of [3, 4]) for (const type of ['mousedown', 'mouseup', 'auxclick']) {
      const ev = new MouseEvent(type, { button, bubbles: true, cancelable: true });
      document.body.dispatchEvent(ev);
      expect.ok(ev.defaultPrevented, `side button ${button} ${type}: the browser does not go back or forward`);
    }
    Game.render(1, STEP);
    expect.ok(shown('tutText').includes('[ c / Side mouse ]'), `block prompt: "${shown('tutText')}"`);
    const row = [...document.querySelectorAll('#helpTable tr')].find(r => r.cells[0].textContent.startsWith('Block'));
    expect.ok(row && row.cells[1].textContent === '[ c / l / Side mouse ]', `help panel: "${row && row.cells[1].textContent}"`);
  });
  test('tutorial: block, parry and dodge start locked on to their dummy; a lock let go stays off', () => {
    const ids = Game.tutorialSteps().map(s => s.id), at = ids.indexOf('block');
    expect.ok(ids.slice(at, at + 3).join() === 'block,parry,dodge', `step order: ${ids.join(', ')}`);
    for (const id of ['block', 'parry', 'dodge']) {
      tutorialAt(id);
      expect.ok(Game.enemies.length === 1 && Game.lock === Game.enemies[0], `${id}: locked on to its dummy`);
      sim.press('lock'); sim.step(1, 1);
      expect.ok(!Game.lock, `${id}: the lock key lets go`);
      sim.seconds(4, 6);
      expect.ok(!Game.lock, `${id}: and nothing locks it again`);
    }
    tutorialAt('light'); expect.ok(!Game.lock, 'other steps start unlocked');
    Game.render(1, STEP);
    expect.ok(shown('tutStep').endsWith(`/ ${ids.length}`) && ids.length === 15, `the step counter counts the new step (${shown('tutStep')})`);
  });
  // The states a training dummy goes through, step by step, for `seconds` with the player standing still.
  const cadence = (stepId, seconds) => {
    tutorialAt(stepId); const e = Game.enemies[0], out = [];
    for (let i = 0; i < seconds / STEP; i++) { sim.step(); out.push(e.state); }
    return out.join();
  };
  test('tutorial: the dodge dummy swings exactly like the sparring dummy, but roll-only; a block or a parry does not answer it', () => {
    expect.ok(cadence('dodge', 12) === cadence('block', 12), 'the same rest, wind-up, strike and recovery, step for step');
    let p = tutorialAt('dodge');
    const dummy = Game.enemies[0], swing = dummy.def.attacks[0];
    expect.ok(sim.until(() => log.includes('perilous'), 4) >= 0, 'its wind-up flashes the blue ring (perilous)');
    expect.ok(makeStrike(swing).rollOnly, 'its swing is roll-only');
    sim.hold('block'); let hp0 = p.hp;
    sim.until(() => dummy.state === ES.RECOVER, 4); sim.release('block');
    expect.ok(p.hp < hp0 && log.includes('strike'), 'it went through the guard');
    expect.ok(Game.currentStep().id === 'dodge' && Game.tut.doneTimer === 0, 'blocking does not finish the step');
    p = tutorialAt('dodge');
    const d = Game.enemies[0];
    sim.until(() => d.state === ES.WINDUP && d.stateTime >= swing.hits[0].startup - 0.08, 6); sim.press('parry');
    sim.until(() => d.state === ES.RECOVER, 2);
    expect.ok(!log.includes('parry') && Game.tut.doneTimer === 0, 'it cannot be parried');
  });
  const dodges = [];
  A.events.on('dodge', d => dodges.push(d));
  // The dodge step: roll `before` s before the dummy's swing lands (negative: after), toward it or `away` from it.
  // What the player sees once that swing is over: the step done, or the hint under the prompt.
  const dodgeRoll = (before, away = false, fresh = true) => {
    const p = fresh ? tutorialAt('dodge') : Game.player, dummy = Game.enemies[0], swing = dummy.def.attacks[0];
    dodges.length = 0;
    sim.until(() => dummy.state === ES.WINDUP, 6); sim.seconds(swing.hits[0].startup - before);
    if (away) sim.move(p.x - dummy.x, p.z - dummy.z);
    sim.press('roll');
    sim.until(() => dummy.state === ES.RECOVER, 3); sim.move(null); sim.step(2); Game.render(1, STEP);
    return { done: Game.tut.doneTimer > 0, hint: shown('tutHint') };
  };
  test('tutorial: a roll through the swing finishes the dodge step; early, late or clear of it shows a hint', () => {
    const timed = dodgeRoll(0.1);
    expect.ok(timed.done, `rolled through the swing as it landed: done (hint "${timed.hint}")`);
    expect.ok(dodges.length === 1 && dodges[0].attacker.def.id === A.TUTORIAL.training.dodge, `one dodge event (${dodges.length})`);
    for (const [before, away, want] of [[0.45, false, 'Too early'], [0.9, false, 'Too early'], [-0.05, false, 'Too late'], [0.5, true, 'Roll into the swing']]) {
      const r = dodgeRoll(before, away);
      expect.ok(!r.done && r.hint === want, `rolled ${before} s before it landed${away ? ', away' : ''}: "${r.hint}" (want "${want}")`);
    }
    dodgeRoll(-0.05);
    sim.seconds(CONFIG.tutorial.hintTime + 0.1); Game.render(1, STEP);
    expect.ok(shown('tutHint') === '', `the hint goes after a while ("${shown('tutHint')}")`);
    dodgeRoll(0.45); const next = dodgeRoll(-0.05, false, false);
    expect.ok(next.hint === 'Too late', `the next hint replaces it ("${next.hint}")`);
  });
  test('events: dodge fires once for a swing rolled through, and for a bolt', () => {
    dodgeRoll(0.1);
    expect.ok(dodges.length === 1 && !dodges[0].projectile, `one for the dummy's swing (${dodges.length})`);
    Game.startFight('testBowman'); sim.begin(); dodges.length = 0;
    const p = Game.player, e = Game.duel, shot = bowShot();
    quiet(e); e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
    const b = A.projectiles.fire(e, shot, p), arrive = Math.hypot(p.x - b.x, p.z - b.z) / shot.projectile.speed;
    sim.seconds(Math.max(0, arrive - CONFIG.player.rollIFrames * 0.5)); sim.press('roll'); settleBolts();
    expect.ok(dodges.length === 1 && dodges[0].projectile && dodges[0].attacker === e, `one for the bolt (${dodges.length})`);
  });
  // The player at (10, 0) facing east in Test: Crowd, with enemies that stay put at the given spots.
  const lockRange = spots => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies();
    sim.place(10, 0); Game.player.yaw = Math.PI / 2; Game.cam.yaw = Math.PI / 2; Game.updateCamera(0, true);
    const out = {};
    for (const [name, x, z] of spots) { out[name] = sim.spawn('hollow', x, z, undefined, -Math.PI / 2); quiet(out[name]); }
    sim.step(5, 1); Game.setLock(null);   // the near ones had their one-time auto lock-on: start unlocked
    return out;
  };
  const tab = () => { sim.press('switchTarget'); sim.step(1, 1); return Game.lock; };
  test('switch target: Tab steps out from the nearest enemy in front to the farthest, and wraps', () => {
    const e = lockRange([['near', 14, 0], ['far', 24, 0.3], ['side', 16, 3], ['mid', 18, -4], ['behind', 2, 0]]);
    Game.setLock(e.near); sim.step(1, 1);
    const order = [tab(), tab(), tab(), tab()];
    const names = order.map(t => Object.keys(e).find(k => e[k] === t));
    expect.ok(names.join() === 'side,mid,far,near', `Tab from the nearest: ${names.join(', ')} (want side, mid, far, near)`);
    Game.setLock(e.behind); sim.step(1, 1);
    expect.ok(tab() === e.near, 'from a target that is not a candidate, Tab picks the nearest');
    for (let i = 0; i < 8; i++) expect.ok(tab() !== e.behind, 'never the enemy behind the player');
  });
  test('switch target: lock-on still picks the middle of the screen, and a flick still picks by side', () => {
    const e = lockRange([['centre', 20, 0], ['right', 13, 2.5], ['left', 14, -3]]);
    sim.press('lock'); sim.step(1, 1);
    expect.ok(Game.lock === e.centre, 'lock-on: the enemy in the middle of the screen, not the nearest');
    input.down('PadFlickR'); input.up('PadFlickR'); sim.step(1, 1);
    expect.ok(Game.lock === e.right, 'a flick right: the enemy to the right');
    Game.setLock(e.centre); sim.step(1, 1);
    input.down('PadFlickL'); input.up('PadFlickL'); sim.step(1, 1);
    expect.ok(Game.lock === e.left, 'a flick left: the enemy to the left');
  });

  test('floors and roofs: no roof is drawn inside the floor above it, in any room level; holes show through', () => {
    const ray = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0);
    ray.camera = A.camera;
    let spots = 0;
    for (const L of A.ALL_LEVELS.filter(l => l.layout === 'rooms')) {
      Game.startLevel(L.id); sim.begin();
      const rooms = L.rooms.map(R => ({ R, lo: R.y ?? 0, top: (R.y ?? 0) + (R.height ?? L.wallHeight) }));
      for (const a of rooms) for (const b of rooms) {   // a roofed room right under b's floor slab
        if (a === b || a.R.open || Math.abs(a.top - (b.lo - H.slab)) > 1e-6) continue;
        const r = [Math.max(a.R.rect[0], b.R.rect[0]), Math.min(a.R.rect[1], b.R.rect[1]), Math.max(a.R.rect[2], b.R.rect[2]), Math.min(a.R.rect[3], b.R.rect[3])];
        if (r[0] >= r[1] || r[2] >= r[3]) continue;
        for (const fx of [0.2, 0.5, 0.8]) for (const fz of [0.2, 0.5, 0.8]) {
          const x = lerp(r[0], r[1], fx), z = lerp(r[2], r[3], fz), hole = (b.R.pits || []).some(q => inRect(q, x, z));
          ray.set(new THREE.Vector3(x, a.top - 0.2, z), up);
          const near = ray.intersectObject(stage.group, true).filter(h => h.distance < 0.5);
          const n = new Set(near.map(h => h.object.material.uuid + h.point.y.toFixed(3))).size;   // surfaces that would fight: two materials at one height
          expect.ok(n === (hole ? 0 : 1), `${L.id}: "${a.R.id}" under "${b.R.id}" at (${x.toFixed(1)}, ${z.toFixed(1)}): ${n} surfaces at its ceiling${hole ? ' (a hole)' : ''}`);
          spots++;
        }
      }
    }
    expect.above(spots, 8, 'places checked');
    Game.startLevel('the-tower');
    expect.ok(!A.LEVEL_4.rooms.find(R => R.id === 'courtyard').pits && world.floorY(45.5, -16.5) === 0, "the courtyard's grate is gone");
  });
  // The Tower's trap: every trapWarning and trapSprung, with when and where the player was.
  const traps = [];
  for (const type of ['trapWarning', 'trapSprung']) A.events.on(type, d => traps.push({ type, trap: d.trap.id, t: clock, x: Game.player.x }));
  const zone = id => Game.zones.find(z => z.id === id);
  const drawn = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const downTo = (x, z) => {   // the first surface drawn below (x, 5, z)
    Game.render(1, STEP);
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0)); ray.camera = A.camera;
    const h = ray.intersectObject(stage.group, true).find(q => drawn(q.object));
    return h ? h.point.y : -Infinity;
  };
  // Into the passage past the gatehouse gate, and on east until the floor gives way and the player lands below.
  const springTrap = () => {
    const p = tower(); sturdy(p); traps.length = 0;
    for (const e of zone('zone-gatehouse').actors) e.die();
    sim.until(() => zone('zone-gatehouse').gate.lift >= 1, 4);
    sim.place(21, 0); sim.move(1, 0);
    sim.until(() => !p.grounded, 6); sim.move(null);
    sim.until(() => p.grounded, 3);
    return p;
  };
  test('the tower: walking up the passage, the floor rumbles, cracks and gives way into the undercroft at no cost', () => {
    const p = springTrap(), T = A.LEVEL_4.traps[0];
    expect.ok(traps.map(t => t.type).join() === 'trapWarning,trapSprung', `warning, then collapse (${traps.map(t => t.type).join(', ')})`);
    expect.ok(traps[0].x >= T.trigger[0] && traps[0].x < T.trigger[0] + 0.2, `the warning as the player stepped onto the trigger (x ${traps[0].x.toFixed(2)})`);
    expect.near(traps[1].t - traps[0].t, T.warning, STEP * 1.01, 'the warning time');
    expect.near(p.y, -4, 1e-6, 'landed in the undercroft'); expect.ok(p.alive() && p.hp === p.maxHp, `no damage (${p.maxHp - p.hp})`);
    expect.ok(downTo(26, 0) < -3.9 && downTo(26, 0) > -4.1, `the floor dropped away: looking down, the undercroft floor (${downTo(26, 0).toFixed(2)})`);
    expect.above(T.collapse[1] - T.collapse[0], 2.3 + 1, 'longer than any jump');
    tower(); sim.clearEnemies(); traps.length = 0;
    const e = sim.spawn('hollow', 27, 2, 0); quiet(e);
    sim.place(24.5, -1.5); sim.seconds(1);
    expect.ok(e.alive() && Math.abs(e.y + 4) < 1e-6, 'an enemy standing on it falls too');
  });
  test('the tower: the ambush below opens its gate only when all three are dead; the stairs lead up to the bait bonfire', () => {
    const p = springTrap(), Z = zone('zone-undercroft'), ids = Z.actors.map(e => e.def.id).sort().join();
    expect.ok(ids === 'executioner,hollow,hollow', `two Hollows and the Executioner (${ids})`);
    sim.seconds(1.5);
    const exec = Z.actors.find(e => e.def.id === 'executioner'), hollows = Z.actors.filter(e => e !== exec);
    expect.ok(hollows.every(e => !e.in('unaware')), 'the Hollows noticed the player at once');
    expect.ok(exec.state !== ES.DORMANT, `the Executioner rose (${exec.state})`);
    expect.above(Math.hypot(exec.x - p.x, exec.z - p.z), 4, 'a few metres away');
    for (const e of [exec, hollows[0]]) e.die();
    sim.seconds(1); expect.ok(!Z.gate.open, 'shut while one is alive');
    hollows[1].die(); expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0, 'open once all three are dead');
    expect.ok(sim.walkTo(26, -13) && sim.walkTo(32, -13) && sim.walkTo(32, -9) && sim.walkTo(32, -1), 'up the exit stairs');
    expect.near(p.y, 0, 1e-6, 'in the bait bonfire room');
    sim.press('rest'); sim.step(2); expect.ok(p.state === PS.REST, 'rested at the bait bonfire');
    sim.seconds(2); expect.ok(world.floorY(26, 0) === -4 && downTo(26, 0) < -3.9, 'after resting, the hole is still open');
    p.hp = 0; p.setState(PS.DEAD); Game.onPlayerDeath(); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    const q = Game.player, fire = world.bonfires.find(b => b.id === 'tower-bait');
    expect.ok(q.alive() && Math.hypot(q.x - fire.x, q.z - fire.z) < 3 && q.y === 0, `respawned at the bait bonfire (${q.x.toFixed(1)}, ${q.z.toFixed(1)})`);
    expect.ok(world.floorY(26, 0) === -4 && downTo(26, 0) < -3.9, 'after dying, the hole is still open');
  });
  test('the tower: the portcullis before the bait bonfire never opens, and nothing in the courtyard sees the bonfire', () => {
    const p = tower(); sturdy(p);
    const g = world.gates.find(q => q.id === 'bonfire-portcullis'), fire = world.bonfires.find(b => b.id === 'tower-bait');
    sim.place(fire.spawn.x, fire.spawn.z);
    const watchers = [...zone('zone-courtyard').actors, ...Game.enemies.filter(e => e.behavior === 'sentry' && e.def.id === 'bowman' && e.y === 6)];
    expect.ok(watchers.length === 7 && watchers.every(e => gateBetween(e, p)), 'no courtyard enemy or rampart bowman has a line to it');
    sim.seconds(5);
    expect.ok(watchers.every(e => e.in('unaware')) && !shots.length, 'nobody noticed or shot');
    sim.press('rest'); sim.step(2); expect.ok(p.state === PS.REST, 'resting is not blocked');
    sim.seconds(2); sim.place(30.5, 1.5); sim.move(-1, 0); sim.seconds(2); sim.move(null);
    expect.above(p.x, 29, 'the portcullis holds');
    for (const Z of Game.zones) for (const e of Z.actors) e.die();
    sim.seconds(3);
    expect.ok(Game.complete && !g.open, 'still shut once every zone is won, and the level completes without it');
  });
  test('data: traps, sealed gates, zone behaviours and the dodge dummy are checked at load', () => {
    expect.ok(A.validateData().length === 0, 'the shipped data passes');
    const L = A.LEVEL_4, trap = L.traps[0], exec = L.gated.find(z => z.id === 'zone-undercroft').enemies.find(m => m.enemy === 'executioner');
    const rejects = (obj, key, value, words) => {   // one bad value: a readable error that names the thing and the problem
      const old = obj[key];
      obj[key] = value;
      const errors = A.validateData();
      obj[key] = old;
      expect.ok(errors.some(m => words.every(w => m.includes(w))), `${key} = ${JSON.stringify(value)}: ${errors.join(' | ') || 'no error'}`);
    };
    rejects(trap, 'collapse', [200, 205, 0, 4], ['trap "passage-floor"', 'collapse']);
    rejects(trap, 'collapse', [40, 45, 0, 4], ['trap "passage-floor"', 'below']);
    rejects(trap, 'trigger', [200, 201, 0, 1], ['trap "passage-floor"', 'trigger']);
    rejects(trap, 'warning', -1, ['trap "passage-floor"', 'warning']); rejects(trap, 'warning', 'soon', ['trap "passage-floor"', 'warning']);
    rejects(exec, 'behavior', 'patrol', ['zone-undercroft', 'behaviour']);
    rejects(L.sealed[0], 'gate', { x: 200, z: 0, along: 'z', width: 6 }, ['sealed gate "bonfire-portcullis"', 'floor']);
    rejects(L.sealed[0], 'gate', { x: 29, z: 0, along: 'y' }, ['sealed gate "bonfire-portcullis"', 'along']);
    rejects(A.TUTORIAL.training, 'dodge', 'nobody', ['training.dodge']);
  });
  const atLoad = { screen: Game.screen, notice: shown('menuNotice') };   // what the page showed as it finished loading
  const menuShows = () => !document.getElementById('menu').classList.contains('hidden');
  test('start screen: a controller notice comes first; any key, click or pad button moves on, once', () => {
    expect.ok(atLoad.screen === 'start' && atLoad.notice.includes('Best played with a controller'), `at load: ${atLoad.screen}, "${atLoad.notice}"`);
    const fakePad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })) };   // A: also confirm
    const presses = {
      key: () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); },
      click: () => document.getElementById('menuBox').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })),
      pad: () => {
        const read = gamepad.read;
        gamepad.read = () => fakePad; real.poll.call(gamepad, STEP);
        gamepad.read = () => null; real.poll.call(gamepad, STEP);
        gamepad.read = read; input.use('keyboard');
      },
    };
    for (const [how, press] of Object.entries(presses)) {
      Game.showMenu('start');
      expect.ok(menuShows() && shown('menuNotice').includes('controller') && shown('menuList') === '', `${how}: the notice, alone`);
      press();
      expect.ok(Game.screen === 'main' && shown('menuNotice') === '' && document.getElementById('menuList').children.length > 0, `${how}: on to the main menu`);
      expect.ok(document.querySelector('#menuList .sel').textContent.startsWith('Levels'), `${how}: the press only moved on, it chose nothing`);
    }
    Game.startLevel('test-crowd'); Game.pause(false);
    Game.select(Game.screens().pause.items.findIndex(it => it.name === 'Back to Menu')); Game.confirm();
    expect.ok(Game.screen === 'main' && shown('menuNotice') === '', 'back to the menu: straight to the main menu');
  });
  test('version: a tiny label shows the version in every menu and hides during play', () => {
    const label = document.getElementById('version'), seen = () => label.offsetParent !== null && label.textContent === A.VERSION;
    expect.ok(/^v\d+\.\d+$/.test(A.VERSION), `one version constant (${A.VERSION})`);
    Game.showMenu('start'); expect.ok(seen(), 'on the start notice');
    Game.showMenu('levels'); expect.ok(seen(), 'in the Levels menu');
    Game.startLevel('test-crowd'); sim.begin(); sim.step(2, 1);
    expect.ok(!seen(), 'hidden during play');
    Game.pause(false); expect.ok(seen(), 'in the pause menu');
    Game.showMenu('options'); expect.ok(seen(), 'in the options');
    Game.resume(); expect.ok(!seen(), 'hidden again on resuming');
  });

  // ---- v4.0 lock-on: cover grace and always-retarget ------------------------------------------------------------
  // Test: Courtyard's pillar at (30, -8) stands between the player at (24, -8) and an enemy at (36, -8).
  const behindPillar = () => {
    Game.startLevel('test-courtyard'); sim.begin(); sim.clearEnemies();
    sim.place(24, -8); Game.player.yaw = Math.PI / 2; Game.cam.yaw = Math.PI / 2; Game.updateCamera(0, true);
    const e = sim.spawn('hollow', 36, -8, undefined, -Math.PI / 2); quiet(e);
    return e;
  };
  const moveTo = (e, x, z) => { e.x = e.px = x; e.z = e.pz = z; };
  test('lock-on: cover holds the lock for a moment, then lets go; seeing the target again restarts the wait', () => {
    const e = behindPillar(), cover = CONFIG.lock.coverTime;
    expect.near(cover, 1.5, 0.5, 'cover time');
    expect.ok(gateBetween(Game.player, e), 'the pillar hides the enemy');
    Game.setLock(e); sim.seconds(cover - 0.2, 6);
    expect.ok(Game.lock === e, `still locked after ${(cover - 0.2).toFixed(1)} s behind the pillar`);
    sim.seconds(0.4, 6);
    expect.ok(!Game.lock, `let go after ${(cover + 0.2).toFixed(1)} s`);
    Game.setLock(e); sim.seconds(cover - 0.4, 6);
    moveTo(e, 36, -4); sim.step(2, 1);
    expect.ok(!gateBetween(Game.player, e) && Game.lock === e, 'stepped out from behind the pillar: seen, still locked');
    moveTo(e, 36, -8); sim.seconds(cover - 0.4, 6);
    expect.ok(Game.lock === e, 'hidden again: the wait started over');
  });
  test('lock-on: a closed gate between the player and the target breaks the lock at once', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies();
    sim.place(36, 0); Game.player.yaw = Math.PI / 2; Game.cam.yaw = Math.PI / 2; Game.updateCamera(0, true);
    const e = sim.spawn('hollow', 43, 0, undefined, -Math.PI / 2); quiet(e);
    expect.ok(world.gates.some(g => g.id === 'zone-crowd' && !g.open), 'the crowd gate is shut');
    Game.setLock(e); sim.step(1, 1);
    expect.ok(!Game.lock, 'the lock broke on the first step');
  });

  // Test: Crowd with the player at (10, 0) facing east, and rooted enemies (no walking, no attacks) at the given
  // spots: [name, enemy id, x, z, noticed]. Those `noticed` are fighting the player. Starts unlocked.
  const rooted = id => ({ ...A.ENEMY_BY_ID[id], speed: 0, firstDelay: [999, 999] });
  const retargetRange = spots => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies();
    sim.place(10, 0); Game.player.yaw = Math.PI / 2; Game.cam.yaw = Math.PI / 2; Game.updateCamera(0, true);
    const out = {};
    for (const [name, id, x, z, noticed] of spots) {
      const e = out[name] = sim.spawn(rooted(id), x, z, undefined, -Math.PI / 2); quiet(e);
      if (noticed) e.setState(ES.CHASE);
    }
    Game.setLock(null);
    return out;
  };
  const nameOf = (e, t) => Object.keys(e).find(k => e[k] === t) || 'nothing';
  test('lock-on: with no target, the lock goes to the enemy fighting the player that is most centred and closest', () => {
    let e = retargetRange([['centreNear', 'hollow', 15, 0.3, true], ['sideFar', 'hollow', 22, 7, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.centreNear, `centred and near beats off to the side and far (${nameOf(e, Game.lock)})`);
    e = retargetRange([['close', 'hollow', 13, 2.6, true], ['farCentre', 'hollow', 25, 0, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.close, `the enemy 4 m away beats one 15 m off in the middle of the screen (${nameOf(e, Game.lock)})`);
    e = retargetRange([['nearSide', 'hollow', 15, 3.5, true], ['nearCentre', 'hollow', 16, 0.2, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.nearCentre, `about as near: the more centred one (${nameOf(e, Game.lock)})`);
  });
  test('lock-on: the automatic pick never takes an enemy that has not noticed the player', () => {
    const e = retargetRange([['idle', 'hollow', 13, 0, false], ['fighting', 'hollow', 20, 4, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.fighting, `the one fighting, not the idle one in front (${nameOf(e, Game.lock)})`);
    e.fighting.die(); sim.seconds(2, 6);
    expect.ok(!Game.lock, `once the fighter is dead, the idle one is not picked either (${nameOf(e, Game.lock)})`);
  });

  test('lock-on: the automatic pick skips a far archer while a melee enemy fights, but takes a near or lone one; Q and Tab reach any', () => {
    let e = retargetRange([['archer', 'bowman', 22, 0, true], ['melee', 'hollow', 17, 5, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.melee, `a far archer in the middle of the screen is skipped (${nameOf(e, Game.lock)})`);
    e = retargetRange([['archer', 'bowman', 16, 0.5, true], ['melee', 'hollow', 21, 5, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.archer, `an archer ${CONFIG.lock.autoRange} m or nearer counts like anyone (${nameOf(e, Game.lock)})`);
    e = retargetRange([['archer', 'bowman', 24, 0, true]]);
    sim.step(1, 1);
    expect.ok(Game.lock === e.archer, `a lone archer is taken (${nameOf(e, Game.lock)})`);
    e = retargetRange([['archer', 'bowman', 22, 0, true], ['melee', 'hollow', 17, 5, true]]);
    sim.step(1, 1); sim.press('lock'); sim.step(1, 1); sim.press('lock'); sim.step(1, 1);
    expect.ok(Game.lock === e.archer, `Q locks the archer in the middle of the screen (${nameOf(e, Game.lock)})`);
    Game.setLock(e.melee); sim.step(1, 1);
    expect.ok(tab() === e.archer, 'Tab reaches the archer');
  });

  test('lock-on: Q letting go turns the automatic pick off; a Q lock-on, a rest, a death and a level start turn it back on', () => {
    // The player at Test: Crowd's bonfire facing east; a rooted enemy fighting it 11 m away (beyond the first-encounter
    // range, so only the automatic pick ever locks it). `picks()`: with no lock, does a step lock it?
    const start = () => { Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); log.length = 0; };
    const atFire = () => { sim.place(4, -11.5); Game.player.yaw = Math.PI / 2; Game.cam.yaw = Math.PI / 2; Game.updateCamera(0, true); };
    const fighter = () => { const e = sim.spawn(rooted('hollow'), 15, -8, undefined, -Math.PI / 2); e.setState(ES.CHASE); return e; };
    const picks = () => { Game.setLock(null); sim.step(1, 1); return !!Game.lock; };
    const letGo = () => { Game.setLock(Game.enemies.find(e => e.alive())); sim.press('lock'); sim.step(1, 1); expect.ok(!Game.lock, 'Q let go'); };
    start(); atFire(); fighter();
    expect.ok(picks(), 'on at the start of a level');
    letGo(); sim.seconds(1, 6);
    expect.ok(!Game.lock, 'after Q lets go, losing the target picks nobody');
    const fresh = sim.spawn(rooted('hollow'), 9, -11, undefined, -Math.PI / 2); quiet(fresh); sim.step(1, 1);
    expect.ok(Game.lock === fresh, 'off: a first encounter still locks on');
    fresh.die(); sim.step(1, 1);
    expect.ok(!!Game.lock && Game.lock !== fresh, 'off: a kill still moves on to the next target');
    letGo(); sim.press('lock'); sim.step(1, 1);
    expect.ok(!!Game.lock && picks(), 'a Q lock-on turns it back on');
    letGo(); sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5, 6);
    expect.ok(log.includes('rest'), 'rested'); sim.clearEnemies(); atFire(); fighter();
    expect.ok(picks(), 'a rest turns it back on');
    letGo(); Game.player.hp = 0; Game.player.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.2, 6);
    expect.ok(Game.player.alive(), 'died and came back'); sim.clearEnemies(); atFire(); fighter();
    expect.ok(picks(), 'a death turns it back on');
    letGo(); start(); atFire(); fighter();
    expect.ok(picks(), 'a level start turns it back on');
  });

  test('lock-on: training dummies are never picked automatically, even swinging at the player', () => {
    tutorialAt('light'); sim.seconds(3, 6);
    expect.ok(!Game.lock, 'the dummy in front is not locked');
    tutorialAt('block'); Game.setLock(null);
    let swung = false;
    for (let i = 0; i < 6 * 10; i++) { sim.step(10, 10); if (Game.enemies[0].state === ES.WINDUP) swung = true; }
    expect.ok(swung && !Game.lock, 'the sparring dummy swung and was never locked');
  });
  test('lock-on: when the target dies, the next is the best enemy fighting the player, not an idle one in the middle', () => {
    const e = retargetRange([['target', 'hollow', 14, 0, true], ['idle', 'hollow', 18, 0.2, false], ['side', 'hollow', 16, 4.5, true]]);
    Game.setLock(e.target); sim.step(1, 1);
    e.target.die(); sim.step(1, 1);
    expect.ok(Game.lock === e.side, `moved on to the one fighting (${nameOf(e, Game.lock)})`);
  });

  // ---- v4.0 the town's pieces: props, barricades, houses (Test: Town) ---------------------------------------------
  // Test: Town's square: the fountain at (20, 0), the well at (8, 8), a cart at (28, 9), a stall at (28, -9) facing
  // north (its back panel to the south), crates at (14, -10). The street east of it ends at a barricade at x 72.
  const town = () => { Game.startLevel('test-town'); sim.begin(); sim.clearEnemies(); log.length = 0; shots.length = 0; return Game.player; };
  const propAt = (x, z) => world.solids.find(s => s.kind === 'prop' && x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1);
  test('props: carts, stalls and the fountain stop the player and enemies; an enemy walks round the fountain to the player', () => {
    const p = town(); sturdy(p);
    expect.ok(propAt(28, 9) && propAt(28, -9) && propAt(20, 0) && propAt(8, 8) && propAt(14, -10), 'the cart, stall, fountain, well and crates are solid');
    sim.place(28, 5); sim.move(0, 1); sim.seconds(2); sim.move(null);
    expect.below(p.z, propAt(28, 9).z0, `walked into the cart: stopped at z ${p.z.toFixed(2)}`);
    sim.place(28, -5); sim.move(0, -1); sim.seconds(2); sim.move(null);
    expect.above(p.z, propAt(28, -9).z1, `walked into the stall: stopped at z ${p.z.toFixed(2)}`);
    sim.place(20, 7); p.yaw = Math.PI;
    const e = sim.spawn('hollow', 20, -7, undefined, 0); e.setState(ES.CHASE);
    let crossed = false;
    for (let i = 0; i < 8 * 60 && !crossed; i++) { sim.step(); crossed = e.z > propAt(20, 0).z1; }
    expect.ok(crossed, `the enemy went round the fountain (stuck at ${e.x.toFixed(1)}, ${e.z.toFixed(1)})`);
  });
  test('props: they stop bolts; a low well hides nobody, a stall\'s back panel does', () => {
    const p = town();
    sim.place(28, -4); p.yaw = Math.PI;
    const archer = sim.spawn('bowman', 28, -14, undefined, 0); quiet(archer);
    const hp0 = p.hp, stopped = log.length;
    A.projectiles.fire(archer, A.ENEMY_BY_ID.bowman.attacks.find(a => a.projectile), p); settleBolts();
    expect.ok(p.hp === hp0 && log.slice(stopped).includes('boltStopped'), 'the bolt hit the stall, not the player');
    expect.ok(gateBetween(p, archer), 'the stall hides the archer');
    archer.die();
    sim.place(8, 3); p.yaw = Game.cam.yaw = 0; Game.updateCamera(0, true);
    const e = sim.spawn('hollow', 8, 13, undefined, Math.PI); quiet(e);
    expect.ok(!gateBetween(p, e), 'seen over the well');
    Game.setLock(null); sim.press('lock'); sim.step(1, 1);
    expect.ok(Game.lock === e, 'and locked on over the well');
    e.die(); Game.setLock(null);
    sim.place(28, -4); p.yaw = Game.cam.yaw = Math.PI; Game.updateCamera(0, true);
    const hidden = sim.spawn('hollow', 28, -14, undefined, 0); quiet(hidden);
    Game.setLock(hidden); sim.seconds(CONFIG.lock.coverTime + 0.2, 6);
    expect.ok(Game.lock !== hidden, 'an enemy behind the stall cannot be held locked past the cover time');
  });
  test('props: a low cart right behind the player leaves the camera behind it, not on the player\'s head', () => {
    const p = town();
    sim.place(28, 7.4); p.yaw = Game.cam.yaw = Math.PI; Game.cam.pitch = 0; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.default;
    Game.mouseHold = 99; Game.updateCamera(0, true); sim.seconds(1);
    const back = Math.hypot(Game.cam.pos.x - p.x, Game.cam.pos.z - p.z);
    expect.above(back, 4, `the camera stays ${back.toFixed(2)} m behind, over the cart`);
  });
  test('props: clutter along the house fronts never stops the player', () => {
    const p = town();
    for (const [x0, z, x1] of [[1, 15.3, 39], [1, -15.3, 39], [41, 3.4, 71], [41, -3.4, 71]]) {
      sim.place(x0, z); sim.move(1, 0);
      sim.until(() => p.x > x1, 12); sim.move(null);
      expect.above(p.x, x1, `walked along z ${z} from x ${x0}: reached x ${p.x.toFixed(1)}`);
    }
  });

  test('barricades: one holds the player and stops bolts and sight while shut, falls when its street is won, and counts toward completion', () => {
    Game.startLevel('test-town'); sim.begin(); log.length = 0;
    const p = Game.player, Z = Game.zones.find(z => z.id === 'zone-street'); sturdy(p);
    expect.ok(A.TEST_TOWN.gated.find(z => z.id === 'zone-street').gate.style === 'barricade', 'the street gate is a barricade');
    for (const e of Z.actors) quiet(e);
    sim.place(68, 0); sim.move(1, 0); sim.seconds(2); sim.move(null);
    expect.below(p.x, 72, `held at the barricade (x ${p.x.toFixed(2)})`);
    const beyond = sim.spawn(rooted('bowman'), 78, 0, undefined, -Math.PI / 2); quiet(beyond);
    expect.ok(gateBetween(p, beyond), 'no sight through it');
    const hp0 = p.hp, n = log.length;
    A.projectiles.fire(beyond, A.ENEMY_BY_ID.bowman.attacks.find(a => a.projectile), p); settleBolts();
    expect.ok(p.hp === hp0 && log.slice(n).includes('boltStopped'), 'a bolt is stopped');
    beyond.die();
    for (const e of Z.actors) e.die();
    expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0 && log.includes('gateOpened'), 'it fell once the street was won');
    sim.place(68, 0); sim.move(1, 0); sim.until(() => p.x > 76, 4); sim.move(null);
    expect.above(p.x, 76, 'walked through where it stood');
    expect.ok(Game.complete && log.includes('levelComplete'), 'its zone counted: the level is complete');
  });

  test('houses: solid to the player, bolts and sight; the inn is walked into by its door, and has a roof', () => {
    const p = town();
    expect.ok(world.solids.some(s => s.kind === 'house'), 'houses are solid');
    sim.place(75, 0); sim.move(1, 0); sim.seconds(2); sim.move(null);   // the chapel stands free in the yard at x 78..82
    expect.below(p.x, 78, `stopped at the chapel (x ${p.x.toFixed(2)})`);
    const e = sim.spawn(rooted('bowman'), 84, 0, undefined, -Math.PI / 2); quiet(e);
    expect.ok(gateBetween(p, e), 'no sight through the chapel');
    const hp0 = p.hp, n = log.length;
    A.projectiles.fire(e, A.ENEMY_BY_ID.bowman.attacks.find(a => a.projectile), p); settleBolts();
    expect.ok(p.hp === hp0 && log.slice(n).includes('boltStopped'), 'a bolt is stopped by it');
    sim.place(13, 14); sim.move(0, 1); sim.until(() => p.z > 21, 4); sim.move(null);
    expect.above(p.z, 21, 'through the inn door and inside');
    expect.below(world.ceilingAt(p.x, p.z, p.y + 1), p.y + 4.5, 'under the inn\'s ceiling');
    sim.place(10, 14); sim.move(0, 1); sim.seconds(2); sim.move(null);
    expect.below(p.z, 16, 'beside the door, the inn front stops the player');
  });
  test('houses: Levels 2 and 4 and the older test rooms build exactly the same solids and slabs as before', () => {
    const sig = L => {   // the same fingerprint taken before houses and props existed
      const T = A.terrainFor(L), f = b => [b.kind, b.x0, b.x1, b.z0, b.z1, b.y0, b.y1].map(v => typeof v === 'number' ? v.toFixed(3) : v).join(',');
      return [T.solids.length, T.slabs.length, strSeed(T.solids.map(f).join(';') + '|' + T.slabs.map(f).join(';'))];
    };
    const want = { 'sunken-keep': [78, 20, 3411835110], 'the-tower': [436, 150, 3494895368], 'test-crowd': [14, 4, 170810182],
                   'test-heights': [131, 54, 3405753706], 'test-courtyard': [77, 19, 1323673726], 'test-mixed': [29, 6, 3293135696] };
    for (const [id, w] of Object.entries(want)) {
      const got = sig(A.ALL_LEVELS.find(l => l.id === id));
      expect.ok(got.join() === w.join(), `${id}: ${got.join()} (want ${w.join()})`);
    }
  });

  test('data: houses, props, gate styles and the landmark are checked at load', () => {
    expect.ok(A.validateData().length === 0, `the shipped data passes (${A.validateData().join(' | ')})`);
    const L = A.TEST_TOWN, chapel = L.houses.find(h => h.rect[0] === 78), cart = L.props.find(p => p.kind === 'cart');
    const rejects = (obj, key, value, words) => {   // one bad value: a readable error that names the thing and the problem
      const had = key in obj, old = obj[key];
      obj[key] = value;
      const errors = A.validateData();
      if (had) obj[key] = old; else delete obj[key];
      expect.ok(errors.some(m => words.every(w => m.includes(w))), `${key} = ${JSON.stringify(value)}: ${errors.join(' | ') || 'no error'}`);
    };
    rejects(chapel, 'y', 3, ['house', 'floor']);
    rejects(chapel, 'rect', [68, 76, -2, 2], ['house', 'overlaps', 'street']);
    rejects(chapel, 'ridge', 'y', ['house', 'ridge']);
    rejects(chapel, 'eaves', 1, ['house', 'eaves']);
    rejects(chapel, 'rooms', ['nowhere'], ['house', 'nowhere']);
    const yardHouse = L.houses.find(h => h.rect[0] === 72 && h.rect[2] === 8);
    rejects(yardHouse, 'rect', [70, 84, 8, 18], ['house', 'overlaps the house']);
    rejects(A.LEVEL_1, 'props', [], ['props belong in room levels']);
    rejects(A.LEVEL_3.dispersed.find(d => d.zone), 'zone', 'zone-nowhere', ['zone "zone-nowhere"']);
    rejects(cart, 'kind', 'boulder', ['prop', 'boulder']);
    rejects(cart, 'yaw', 0.3, ['prop', 'yaw']);
    rejects(cart, 'z', 200, ['prop', 'floor']);
    const withProp = (P, words) => {   // one more prop, somewhere it must not stand
      L.props.push(P); const errors = A.validateData(); L.props.pop();
      expect.ok(errors.some(m => words.every(w => m.includes(w))), `${JSON.stringify(P)}: ${errors.join(' | ') || 'no error'}`);
    };
    withProp({ kind: 'cart', x: 40.5, z: 0 }, ['prop', 'doorway']);
    withProp({ kind: 'crates', x: 4.5, z: 0 }, ['prop', 'spawn']);
    withProp({ kind: 'cart', x: 28, z: 15.5 }, ['prop', 'wall']);
    withProp({ kind: 'well', x: 71, z: 0 }, ['prop', 'gate']);
    rejects(L.gated[0].gate, 'style', 'wall', ['gate style', 'wall']);
    rejects(L.atmosphere, 'landmark', { x: 'far', z: 0 }, ['landmark']);
    rejects(L.atmosphere, 'embers', 5, ['embers']);
  });

  test('town look: the far castle, smoke over burning houses and embers are drawn where a level asks, and nowhere else', () => {
    town(); sim.step(1); Game.render(1, STEP);
    const I = A.visuals.info(), Lm = A.TEST_TOWN.atmosphere.landmark;
    expect.ok(I.landmark, 'the far castle is drawn');
    expect.above(I.far, Math.hypot(Lm.x - Game.player.x, Lm.z - Game.player.z), `the camera sees as far as the castle (far ${I.far})`);
    const burning = A.TEST_TOWN.houses.filter(h => h.burning || h.ruined).length;
    expect.ok(I.smoke === burning, `a smoke column over each burning or ruined house (${I.smoke} of ${burning})`);
    expect.above(I.embers, 0, 'embers drift');
    Game.startLevel('sunken-keep'); sim.begin(); sim.step(1); Game.render(1, STEP);
    const K = A.visuals.info();
    expect.ok(!K.landmark && K.smoke === 0 && K.embers === 0, `Level 2 has none of them (${JSON.stringify({ l: K.landmark, s: K.smoke, e: K.embers })})`);
  });
  test('town look: frame time on Test: Town against Test: Courtyard', () => {
    const gl = A.renderer.getContext(), px = new Uint8Array(4);
    const measure = (id, x, z) => {
      Game.startLevel(id); sim.begin(); sim.place(x, z);
      for (let i = 0; i < 20; i++) { sim.step(1); Game.render(1, STEP); }   // warm-up: shaders compile here
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < 90; i++) { sim.step(1); Game.render(1, STEP); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // wait for the GPU
      return (performance.now() - t0) / 90;
    };
    const court = measure('test-courtyard', 42, 0), townMs = measure('test-town', 20, -6);
    metrics.townFrame = { townMs: +townMs.toFixed(2), courtyardMs: +court.toFixed(2) };
    expect.below(townMs, court * 2.5 + 3, `Test: Town frame (${townMs.toFixed(1)} ms) against Test: Courtyard (${court.toFixed(1)} ms)`);
  });

  // ---- v4.0 the Pillager Captain ----------------------------------------------------------------------------------
  test('Pillager Captain: a posture boss between the throne pair and the Bell Warden, with a halberd that glows with embers', () => {
    Game.startFight('pillagerCaptain'); sim.begin(); Game.render(1, STEP);
    const e = Game.duel, B = A.ENEMY_BY_ID;
    expect.ok(!!e.def.posture && !A.hud.eBars.classList.contains('hidden'), 'its posture shows on the big bar at the top of the screen');
    expect.ok(A.hud.eBars.textContent.includes('Pillager Captain'), 'named on the boss bar');
    expect.near(e.def.hp, 450, 50, 'about 450 HP');
    expect.above(e.def.hp, Math.max(B.knight.hp, B.warden.hp), 'tougher than either of Level 2\'s throne pair');
    expect.below(e.def.hp, B.bellWarden.hp, 'less than the Bell Warden');
    expect.ok(e.def.weapon === 'halberd' && e.def.visual.embers === true && !!e.rig.embers, 'a halberd with embers');
  });
  test('Pillager Captain: its three-cut combo can be parried, its overhead only rolled, its thrust comes only from mid range', () => {
    Game.startFight('pillagerCaptain'); sim.begin(); log.length = 0; sturdy(Game.player);
    const p = Game.player, e = Game.duel, combo = e.def.attacks.find(a => a.hits.length === 3), over = e.def.attacks.find(a => a.rollOnly);
    expect.ok(combo && combo.track > 0 && !makeStrike(combo).rollOnly, 'a tracking three-cut combo, not roll-only');
    faceOff(e, p, 2); e.beginAttack(combo);
    sim.until(() => e.stateTime >= combo.hits[0].startup - 0.08, 2); sim.press('parry');
    sim.until(() => log.includes('parry'), 0.5);
    expect.ok(log.includes('parry') && e.state === ES.PARRIED, 'the combo was parried and left it open');
    Game.startFight('pillagerCaptain'); sim.begin(); sturdy(Game.player); log.length = 0;
    const q = Game.player, c = Game.duel; faceOff(c, q, 2); quiet(c); c.notice = 30;
    sim.hold('block'); sim.step(2); const hp0 = q.hp; c.beginAttack(over);
    sim.until(() => c.state === ES.RECOVER, 4); sim.release('block');
    expect.ok(over && makeStrike(over).rollOnly && q.hp < hp0 && log.includes('perilous'), 'the overhead glowed blue and went through the guard');
    const far = attacksAt('pillagerCaptain', 8), near = attacksAt('pillagerCaptain', 2.2);
    expect.ok(far.includes('captainThrust') && !near.includes('captainThrust'), `thrust only from range (8 m: ${far.join(', ')}; 2.2 m: ${near.join(', ')})`);
  });
  test('Pillager Captain: parries and chained hits break its posture', () => {
    Game.startFight('pillagerCaptain'); sim.begin(); log.length = 0; sturdy(Game.player);
    const p = Game.player, e = Game.duel, combo = e.def.attacks.find(a => a.hits.length === 3);
    let parries = 0;
    while (e.state !== ES.BROKEN && parries < 8) {
      sim.until(() => e.state !== ES.PARRIED && e.state !== ES.WINDUP && e.state !== ES.ACTIVE, 4);
      faceOff(e, p, 2); e.beginAttack(combo); log.length = 0;
      sim.until(() => e.stateTime >= combo.hits[0].startup - 0.08, 2); sim.press('parry');
      sim.until(() => log.includes('parry'), 0.5);
      if (log.includes('parry')) parries++;
      sim.until(() => e.state === ES.BROKEN || e.state === ES.CHASE, 3);
    }
    expect.ok(e.state === ES.BROKEN && parries <= 5, `posture broke after ${parries} parries`);
    Game.startFight('pillagerCaptain'); sim.begin();
    const d = Game.duel; let n = 0;
    while (d.state !== ES.BROKEN && n++ < 30) { d.takeHit(strikeOf('heavy'), behind(d)); sim.step(10); }
    expect.ok(d.state === ES.BROKEN, `posture broke after ${n} chained heavy hits`);
  });

  // ---- v4.0 Level 3: The Burning Town ----------------------------------------------------------------------------
  // The main path, as waypoints [x, z, zone?]: arriving at a zone's waypoint kills its fighters and waits for its gate.
  const TOWN_ROUTE = [
    [20, 0, 'zone-lower-gate'], [30, 0], [46, 0, 'zone-first-street'], [56, 0], [66, 4, 'zone-market'], [65, 12], [65, 20], [65, 25],
    [40, 25, 'zone-steep-street'], [24, 25], [18, 24.5], [18, 30], [18, 38, 'zone-alley'], [18, 43], [18, 49], [22, 59.5],
    [28, 59.5, 'zone-fountain'], [31, 59.5], [38, 59.5], [45, 59.5], [50, 60], [64, 60], [74, 60], [80, 61], [100, 62, 'zone-church'],
    [114, 62], [120, 62], [130, 62], [140, 62, 'zone-captain'], [151, 62],
  ];
  const townLevel = () => { Game.startLevel('burning-town'); sim.begin(); log.length = 0; shots.length = 0; return Game.player; };
  // Walk to (x, z) through whatever engages (it falls at once); returns true if reached.
  const walkClear = (x, z, maxSeconds = 30, each = () => {}) => {
    const p = Game.player;
    const ok = sim.until(() => {
      for (const e of Game.enemies) if (e.alive() && !e.in('unaware') && e.state !== ES.DORMANT) e.die();
      each();
      const dx = x - p.x, dz = z - p.z;
      if (Math.hypot(dx, dz) < 0.5) return true;
      sim.move(dx, dz); return false;
    }, maxSeconds) >= 0;
    sim.move(null);
    return ok;
  };
  const insideHouse = c => world.solids.find(s => s.kind === 'house' && c.x > s.x0 + 0.05 && c.x < s.x1 - 0.05 && c.z > s.z0 + 0.05 && c.z < s.z1 - 0.05
    && c.y > s.y0 + 0.05 && c.y < s.y1 - 0.05);
  test('the burning town: Level 2 leads into it and it into the Tower; the Levels menu shows it as Level 3, the Tower as Level 4', () => {
    const names = A.LEVELS.map(l => l.name), at = A.LEVELS.indexOf(A.LEVEL_3);
    expect.ok(A.LEVEL_3.id === 'burning-town' && A.LEVELS[at - 1] === A.LEVEL_2 && A.LEVELS[at + 1] === A.LEVEL_4, `order: ${names.join(' | ')}`);
    expect.ok(A.LEVEL_3.name === 'Level 3: The Burning Town' && A.LEVEL_4.name === 'Level 4: The Tower', 'names');
    expect.ok(A.LEVEL_2.next === 'burning-town' && A.LEVEL_3.next === 'the-tower', 'Level 2 -> the town -> the Tower');
    Game.showMenu('levels');
    const shown = [...document.querySelectorAll('#menuList .menuBtn .n')].map(n => n.textContent);
    expect.ok(shown.indexOf('Level 3: The Burning Town') + 1 === shown.indexOf('Level 4: The Tower'), `menu: ${shown.join(' | ')}`);
    expect.ok(/sacked|burn/i.test(A.LEVEL_3.description) && /Tower/.test(A.LEVEL_3.completeHint), 'its story: the sacked town, then on to the Tower');
  });
  test('the burning town: 17 enemies with the church Bowman (plus an optional Knight), its HP between Level 2\'s and the Tower\'s', () => {
    const hpOf = L => [...L.gated.flatMap(z => z.enemies || [{ enemy: z.enemy }]), ...L.dispersed].reduce((s, m) => s + A.ENEMY_BY_ID[m.enemy].hp, 0);
    const L = A.LEVEL_3, main = [...L.gated.flatMap(z => z.enemies), ...L.dispersed.filter(s => s.behavior === 'sentry')];
    expect.ok(main.length === 17, `${main.length} enemies on the main path`);
    expect.ok(L.dispersed.some(s => s.enemy === 'knight' && s.behavior === 'slumber'), 'a sleeping Knight off the path');
    const town = main.reduce((s, m) => s + A.ENEMY_BY_ID[m.enemy].hp, 0), keep = hpOf(A.LEVEL_2), tower = hpOf(A.LEVEL_4);
    expect.ok(town > keep * 1.8 && town < keep * 2.4 && town < tower, `HP: town ${town}, Level 2 ${keep}, Tower ${tower}`);
    const debut = id => L.gated.findIndex(z => z.enemies.some(m => m.enemy === id));
    const alone = id => L.gated.find(z => z.enemies.some(m => m.enemy === id)).enemies.length;
    expect.ok(alone('lancer') === 1 && alone('duelist') === 1, 'the Lancer and the Duelist are met alone first');
    expect.ok(debut('lancer') < debut('bowman') && debut('bowman') < debut('duelist'), 'Lancer, then Bowman (with a Lancer), then Duelist');
  });
  test('the burning town: a scripted run opens every gate in turn and completes the level; the camera never enters a house', () => {
    const p = townLevel(); sturdy(p);
    const opened = [], inHouse = [];
    const watch = () => { const h = insideHouse(Game.cam.pos); if (h && inHouse.length < 5) inHouse.push(`(${Game.cam.pos.x.toFixed(1)}, ${Game.cam.pos.y.toFixed(1)}, ${Game.cam.pos.z.toFixed(1)})`); };
    for (const [x, z, zone] of TOWN_ROUTE) {
      const reached = walkClear(x, z, 30, watch);
      expect.ok(reached && p.alive(), `reached (${x}, ${z}); stuck at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
      if (!zone) continue;
      const Z = Game.zones.find(q => q.id === zone);
      for (const e of Z.actors) if (e.alive()) e.die();
      expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0, `${zone}: its gate opened`);
      opened.push(zone);
    }
    expect.near(p.y, 12, 1e-6, 'through the upper town gate, at the top of the town');
    expect.ok(Game.complete && log.includes('levelComplete') && opened.length === Game.zones.length, `LEVEL COMPLETE (${opened.length} gates)`);
    expect.ok(!inHouse.length, `the camera went inside a house at ${inHouse.join(', ')}`);
    sim.seconds(CONFIG.nextLevel.delay + CONFIG.nextLevel.fadeTime + 0.2);
    expect.ok(Game.level.id === 'the-tower', `then on into the Tower (${Game.level.id})`);
  });
  test('the burning town: the steep street\'s barricade stays shut until the Bowman on the balcony is dead; the stair house leads up to it', () => {
    const p = townLevel(); sturdy(p);
    const Z = Game.zones.find(q => q.id === 'zone-steep-street'), bow = Z.actors.find(e => e.def.id === 'bowman');
    expect.ok(!!bow && Math.abs(bow.y - 8) < 1e-6, 'a Bowman of the zone on the balcony, 4 m up');
    sim.place(54, 26, 4);
    for (const e of Z.actors) if (e !== bow) e.die();
    sim.seconds(2);
    expect.ok(!Z.gate.open, 'the Lancer is dead, the Bowman lives: still shut');
    for (const [x, z] of [[54, 28.6], [54, 31], [51, 30.8], [46, 30.8], [43, 30.6]]) {
      bow.notice = 0; bow.setState(ES.IDLE);
      expect.ok(sim.walkTo(x, z, 0.4, 8), `walked to (${x}, ${z}); at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
    }
    expect.near(p.y, 8, 0.01, 'up the stair inside the house and out onto the balcony');
    bow.die();
    expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0, 'with the Bowman dead, the barricade fell');
  });
  test('the burning town: the shortcut is shut from below, opens for good from the fountain square, and leads down to bonfire 1', () => {
    const p = townLevel(); sturdy(p); sim.clearEnemies();
    const g = world.gates.find(q => q.id === 'fountain-shortcut');
    sim.place(6, 5); sim.walkTo(6, 46.6, 0.4, 20);
    expect.below(p.z, 46.6, `held below the shut gate (z ${p.z.toFixed(2)})`); expect.ok(!g.open, 'still shut from below');
    sim.place(6, 52, 8); sim.step(2);
    expect.ok(g.open && log.includes('gateOpened'), 'opened from the fountain square');
    expect.ok(sim.walkTo(6, 46, 0.4, 6) && sim.walkTo(6, 5.5, 0.4, 30) && sim.walkTo(6, 2, 0.4, 4), `down to the lower gate (at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
    expect.near(p.y, 0, 1e-6, 'at the lower gate street');
    sim.place(4.5, -1); sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5);
    Game.player.hp = 0; Game.player.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    expect.ok(world.gates.find(q => q.id === 'fountain-shortcut').open, 'it stays open through resting and dying');
  });
  test('the burning town: resting at the tavern is not blocked by the church square, and makes it the respawn point', () => {
    const p = townLevel(); sim.place(38, 61.4, 8); sim.step(2);
    expect.ok(!!Game.canRest(), 'the tavern bonfire can be rested at with the church square still held');
    sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5);
    expect.ok(log.includes('rest'), 'rested');
    Game.player.hp = 0; Game.player.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    const q = Game.player;
    expect.ok(q.alive() && Math.hypot(q.x - 38, q.z - 60.5) < 0.5 && Math.abs(q.y - 8) < 1e-6, `respawned at the tavern (${q.x.toFixed(1)}, ${q.z.toFixed(1)}, y ${q.y.toFixed(1)})`);
  });
  test('the burning town: the gallery Bowman is optional, and once the church square is won it is not brought back', () => {
    const p = townLevel(); sturdy(p);
    const onGallery = () => Game.enemies.filter(e => e.def.id === 'bowman' && Math.abs(e.y - 17) < 1e-6);
    expect.ok(onGallery().length === 1 && !Game.zones.some(z => z.actors.includes(onGallery()[0])), 'a Bowman on the gallery, in no zone');
    sim.place(38, 61.4, 8); sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5);
    expect.ok(onGallery().length === 1, 'resting before the church square is won brings it back');
    const Z = Game.zones.find(z => z.id === 'zone-church');
    for (const e of Z.actors) e.die();
    sim.until(() => Z.gate.open, 2);
    sim.place(38, 61.4, 8); sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5);
    expect.ok(onGallery().length === 0, 'once the church square is won, resting does not bring it back (the run to the Captain is clear)');
    Game.player.hp = 0; Game.player.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    expect.ok(onGallery().length === 0, 'nor does dying');
  });
  test('the burning town: the overlook is the one drop that hurts (by the numbers); rails hold elsewhere, and nothing kills', () => {
    townLevel(); sim.clearEnemies();
    const open = [...A.LEVEL_3.rooms, ...A.LEVEL_3.ramps].flatMap(R => Object.entries(R.edges || {}).filter(([, v]) => v === 'open').map(([k]) => `${R.id}.${k}`));
    expect.ok(open.join() === 'overlook.s', `open edges: ${open.join(', ')}`);
    expect.ok(A.LEVEL_3.rooms.every(R => !R.pits), 'no pits');
    const [y, dmg, alive] = dropFrom(74, 12, 7.5, 0, -1);
    expect.near(y, 0, 1e-6, 'landed in the market');
    expect.near(dmg, (7.5 - CONFIG.fall.safe) * CONFIG.fall.perMetre, 0.5, 'a 7.5 m drop costs its fall damage');
    expect.ok(alive && dmg >= 25 && dmg <= 30, `about 25 to 30 HP, and the player lives (${dmg.toFixed(1)} HP)`);
    const p = Game.player;
    for (const [x, z, yy, dx, dz, what] of [[38, 29.5, 8, 0, -1, 'the balcony'], [96, 81.4, 17, 0, -1, 'the gallery'], [170, 62, 12, 0, 1, 'the cliff road'],
                                         [170, 62, 12, 0, -1, 'the cliff road, south'], [182, 62, 12, 1, 0, 'the end of the cliff road']]) {
      sim.place(x, z, yy); sim.move(dx, dz); sim.seconds(2); sim.move(null);
      expect.near(p.y, yy, 1e-6, `${what}: the rail held`);
    }
  });
  test('the burning town: the far castle is on screen from most of the main path, facing along it', () => {
    townLevel(); sim.clearEnemies();
    for (const g of world.gates) g.open = true;
    const Lm = A.LEVEL_3.atmosphere.landmark, marks = [0.3, 0.5, 0.7, 0.9].map(f => new THREE.Vector3(Lm.x, Lm.y + Lm.height * f, Lm.z));
    const pts = [[4, 1], ...TOWN_ROUTE.map(([x, z]) => [x, z])], seen = [], hidden = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 5));
      for (let k = 0; k < n; k++) {
        const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n), yaw = Math.atan2(x1 - x0, z1 - z0);
        // The player looking ahead along the street: the camera as low as it goes (at rest it looks down at the player).
        sim.place(x, z); Game.player.yaw = Game.cam.yaw = yaw; Game.cam.pitch = CONFIG.mouse.pitchMin; Game.zoomTarget = Game.cam.zoom = CONFIG.zoom.default;
        Game.mouseHold = 99; Game.updateCamera(0, true); camera.position.copy(Game.cam.pos); camera.lookAt(Game.cam.look); camera.updateMatrixWorld();
        const c = Game.cam.pos, visible = m => {   // some height of the castle on screen, and no wall or house in the way
          const v = m.clone().project(camera), d = m.clone().sub(c);
          return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && !world.solids.some(s => !s.low && segBox3(c.x, c.y, c.z, d.x, d.y, d.z, s) <= 1);
        };
        (marks.some(visible) ? seen : hidden).push(`(${x.toFixed(0)}, ${z.toFixed(0)})`);
      }
    }
    const share = seen.length / (seen.length + hidden.length);
    metrics.townCastleSeen = +share.toFixed(2);
    expect.above(share, 0.5, `the castle seen from ${seen.length} of ${seen.length + hidden.length} points (hidden at ${hidden.slice(0, 12).join(' ')}…)`);
  });
  test('the burning town: frame time on the church square, against Test: Courtyard', () => {
    const gl = A.renderer.getContext(), px = new Uint8Array(4);
    const measure = (id, x, z, y) => {
      Game.startLevel(id); sim.begin(); sim.place(x, z, y);
      for (let i = 0; i < 20; i++) { sim.step(1); Game.render(1, STEP); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < 90; i++) { sim.step(1); Game.render(1, STEP); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { ms: (performance.now() - t0) / 90, lights: A.visuals.info().pointLights };
    };
    const court = measure('test-courtyard', 42, 0), town = measure('burning-town', 96, 62, 12);
    metrics.burningTownFrame = { churchSquareMs: +town.ms.toFixed(2), courtyardMs: +court.ms.toFixed(2), lights: town.lights };
    expect.ok(town.lights === CONFIG.cull.maxLights, `culled lights (${town.lights})`);
    expect.below(town.ms, court.ms * 2.5 + 3, `church square frame (${town.ms.toFixed(1)} ms) against Test: Courtyard (${court.ms.toFixed(1)} ms)`);
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
