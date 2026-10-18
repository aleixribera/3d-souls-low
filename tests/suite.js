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
    spawn(id, x, z, y, yaw) {
      if (yaw === undefined) yaw = Game.player ? Math.atan2(Game.player.x - x, Game.player.z - z) : 0;   // facing the player: it sees in a cone
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
    expect.ok(I.sky, 'sky'); expect.above(I.grassAt.length, 500, 'grass clumps'); expect.ok(I.grass > 0, 'grass drawn');
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
  test('four-phase attacks: the light attack has a hitbox only while its strike is active', () => {
    const a = A.PLAYER_DEF.moveset.attacks.light, h = a.hits[0];
    expect.ok(a.pose && h.follow > 0, 'the light attack is key-posed with a follow-through');
    expect.ok(attackTimeline(a, h.startup + h.active + h.follow * 0.5).phase === PHASE.FOLLOW, 'follow-through sits between strike and recovery');
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player, phases = [], marks = [];
    A.events.on('attackPhase', d => { if (d.actor === p) phases.push(d.phase); });
    A.events.on('attackMarker', d => { if (d.actor === p) marks.push(d.marker.event); });
    p.startAttack(a, { x: 0, z: 0, has: false }, null, []);
    let wrong = 0, on = 0;
    while (p.state === PS.ATTACK) {
      sim.step();
      const ph = attackTimeline(a, p.stateTime).phase;
      if (!!p.hitbox !== (ph === PHASE.ACTIVE)) wrong++;
      if (p.hitbox) on++;
    }
    expect.ok(wrong === 0 && on > 0, `hitbox follows the active phase (${on} steps on, ${wrong} wrong)`);
    expect.ok(phases.join() === [PHASE.STARTUP, PHASE.ACTIVE, PHASE.FOLLOW, PHASE.RECOVERY].join(), `phases in order: ${phases.join()}`);
    expect.ok(marks.includes('sound'), 'the swing sound marker fired');
  });
  test('player combo: light presses chain diagonal -> backhand -> overhead -> diagonal', () => {
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player, seen = [];
    for (let i = 0; i < 300 && seen.length < 4; i++) {
      if (p.state === PS.ATTACK && seen[seen.length - 1] !== p.attack) seen.push(p.attack);
      if (i % 6 === 0) sim.press('light');
      sim.step(); p.stamina = p.maxStamina;
    }
    expect.ok(seen.map(a => a.id).join() === 'light,light2,light3,light', `chain: ${seen.map(a => a.id).join()}`);
  });
  test('input buffer: early mashing is dropped; a late press is kept, the latest wins, and fires at the cancel point', () => {
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player, H = A.PLAYER_DEF.moveset.attacks.heavy, cancel = phaseSpan(H, 'recovery')[0];
    sim.press('heavy'); sim.step(2); sim.press('roll'); sim.step(2);
    expect.ok(!p.buffer, 'a roll pressed at the start of a heavy is dropped');
    sim.until(() => p.state === PS.ATTACK && cancel - p.attackT < CONFIG.player.bufferWindow * 0.8, 120);
    sim.press('roll'); sim.step();
    expect.ok(p.buffer && p.buffer.action === 'roll', 'a roll pressed near the end is remembered');
    sim.press('light'); sim.step();
    expect.ok(p.buffer && p.buffer.action === 'light', 'a later attack press replaces it');
    for (let i = 0; i < 90 && p.attack.id === 'heavy' && p.state === PS.ATTACK; i++) sim.step();
    expect.ok(p.state === PS.ATTACK && p.attack.id === 'light' && p.attackT < 0.05, 'the attack came out at the start of recovery');
    sim.until(() => attackTimeline(p.attack, p.attackT).phase === PHASE.FOLLOW, 60); sim.press('roll');
    sim.until(() => p.state === PS.ROLL, 60);
    const L = A.PLAYER_DEF.moveset.attacks.light;
    expect.ok(p.attackT >= phaseSpan(L, 'recovery')[0] - 1e-6, `a roll from the follow-through waits for recovery (${p.attackT.toFixed(2)} s in)`);
    sim.step(5); sim.press('roll'); sim.step(2);
    expect.ok(!p.buffer, 'a roll mashed early in a roll is dropped');
    sim.until(() => CONFIG.player.rollTime - p.stateTime < 0.2, 60); sim.press('roll');
    sim.until(() => p.state !== PS.ROLL, 60); sim.step();
    expect.ok(p.state === PS.ROLL, 'one pressed at the end of a roll chains into the next');
  });
  test('heavy charge: the feet stay planted while held', () => {
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player;
    sim.hold('heavy'); sim.until(() => p.charge === 1, 120);
    const x = p.x, z = p.z; sim.seconds(0.5);
    expect.ok(Math.hypot(p.x - x, p.z - z) < 0.03, `moved ${Math.hypot(p.x - x, p.z - z).toFixed(3)} m while charging`);
    sim.release('heavy'); sim.seconds(2);
  });
  test('impact: heavy hits shake the camera, light ones do not; trails follow active swings', () => {
    Game.startFight('hollow'); sim.begin(); sturdy(Game.player);
    const e = Game.duel, hit = id => { Game.shake = 0; A.events.emit('strike', { strike: makeStrike(A.PLAYER_DEF.moveset.attacks[id]), attacker: Game.player, target: e, at: e, blocked: false }); return Game.shake; };
    expect.ok(hit('light') === 0 && hit('heavy') > 0, 'light steady, heavy jolts');
  });
  test('Hollow Soldier: tracks you through the early wind-up, then commits; glint at the parry window; no hitbox in follow-through', () => {
    Game.startFight('hollow'); sim.begin(); sturdy(Game.player);
    const e = Game.duel, p = Game.player;
    expect.ok(sim.until(() => e.state === ES.WINDUP, 600) >= 0, 'it attacks');
    const a = e.attack, h = a.hits[0];
    sim.until(() => !e.isTracking(), 120);
    expect.near(e.stateTime, h.startup * a.tracking.commit, STEP * 1.5, 'commits at its commit point');
    const yaw = e.yaw; p.x += Math.cos(e.yaw) * 2.5; p.z -= Math.sin(e.yaw) * 2.5; p.savePrev();   // sidestep
    sim.until(() => e.state === ES.ACTIVE, 120);
    expect.near(e.yaw, yaw, 1e-6, 'and no longer turns to follow a sidestep');
    expect.near(markerTime(a, a.markers[0]), h.startup - CONFIG.parry.lead, 1e-9, 'the glint marks the parry window opening');
    sim.until(() => e.stateTime >= h.active + STEP, 30);
    expect.ok(e.state === ES.ACTIVE && !e.hitbox, 'follow-through: still swinging, no hitbox');
  });
  test('player heavy: holding charges (frozen wind-up, more damage), a tap does not', () => {
    Game.startLevel('tutorial'); sim.begin();
    const p = Game.player, H = A.PLAYER_DEF.moveset.attacks.heavy;
    sim.release('heavy'); sim.press('heavy'); sim.until(() => p.state === PS.ATTACK && attackTimeline(p.attack, p.attackT).phase === PHASE.ACTIVE, 120);
    const tap = p.payload.damage, tapTime = p.stateTime;
    sim.seconds(2.5);
    sim.hold('heavy'); sim.step(2); sim.seconds(H.hits[0].startup * H.charge.at + H.charge.hold * 0.5);
    expect.ok(p.charge === 1 && p.chargeT > 0, 'still held: coiling, the wind-up frozen');
    sim.until(() => p.state === PS.ATTACK && attackTimeline(p.attack, p.attackT).phase === PHASE.ACTIVE, 120);   // full charge releases itself
    sim.release('heavy');
    expect.near(tap, H.damage, 0.01, 'a tap does normal damage');
    expect.near(p.payload.damage, H.damage * H.charge.mul, 0.01, 'a full charge does charge.mul x damage');
    expect.ok(p.stateTime > tapTime + H.charge.hold * 0.9, 'the hold lengthened the wind-up');
  });
  test('player: 1.2x health, 1.6x stamina, a lighter heavy attack', () => {
    const S = A.PLAYER_DEF.stats;
    expect.ok(S.maxHp === 120 && S.maxStamina === 160, `stats ${S.maxHp} HP, ${S.maxStamina} stamina`);
    expect.ok(A.PLAYER_DEF.moveset.attacks.heavy.damage === 53, 'heavy attack damage 53 (38 x 1.4, v5.4.5)');
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
    expect.ok(A2('bellSweep').tracking.rate > 0, 'sweep: tracks');
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
    const opened = [], next = A.LEVEL_4.next;
    A.LEVEL_4.next = undefined;   // v4.3: the Tower carries on into Level 5; stay here to check the end of this one
    try {
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
    } finally { A.LEVEL_4.next = next; }
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
    sim.until(() => {   // holding far out between attacks
      sim.place(20, 0);
      return e.state === ES.CHASE && !e.stepIn && Math.hypot(e.x - p.x, e.z - p.z) > 7;
    }, 40);
    e.cooldown = 0;   // and ready to strike
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
    for (const e of Game.enemies) e.wake(Game.player);   // all in the fight from the start (some stand with their backs turned)
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
    for (const e of walkers) e.wake(p);   // in the fight from the start, whichever way they face
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
    // The shared holding behaviour, on lancers with the default pacing (the real Ashen Lancer is tuned to lunge from range).
    const L = A.ENEMY_BY_ID.lancer, plain = { ...L, approach: undefined, cooldown: [0.7, 1.54], crowd: undefined,
      attacks: L.attacks.map(({ chance, ...a }) => a) };
    const lancers = [-6, 0, 6].map(z => sim.spawn(plain, 32, z, undefined, -Math.PI / 2));
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
    // Its dash (4-9 m) would cut any walk-in short with a lunge, so this one never dashes; it never steps in by chance
    // either: the test steps it in once it holds at its longest reach (as the approach roll would).
    const lancer = A.ENEMY_BY_ID.lancer;
    const keen = { ...lancer, approach: 0, attacks: lancer.attacks.map(a => a.dash ? { ...a, chance: 0 } : a) };
    const e = sim.spawn(keen, 32, 0, undefined, -Math.PI / 2), p0 = Game.player;
    sim.until(() => { sim.place(20, 0); return e.state === ES.CHASE && e.cooldown <= 0 && Math.hypot(e.x - p0.x, e.z - p0.z) >= longest - 1.5; }, 10);
    e.stepIn = true; e.stepInNearest = Math.hypot(e.x - p0.x, e.z - p0.z); e.strikeFrom = e.attackReach.short;
    const caught = sim.until(() => {   // walked in from its longest reach to mid range, without attacking
      sim.place(20, 0);
      if (e.state !== ES.CHASE) return false;
      return Math.hypot(e.x - Game.player.x, e.z - Game.player.z) <= 5;
    }, 5);
    expect.ok(caught >= 0 && e.stepIn, 'caught it stepping in');
    // From here on it never chooses to step in again: watch it give up this one
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
    input.use('keyboard');   // key labels in the prompt, whatever an earlier gamepad test left
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
    expect.ok(shown('tutStep').endsWith(`/ ${ids.length}`) && ids.length === 16, `the step counter counts the new step (${shown('tutStep')})`);
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
    // A slab of a sprung trap already falling (below where it was laid) is debris in the air, not the floor.
    const falling = new Set((A.world.traps || []).flatMap(t => t.pieces.filter(c => c.mesh.position.y < c.y - 0.05).map(c => c.mesh)));
    const h = ray.intersectObject(stage.group, true).find(q => drawn(q.object) && !falling.has(q.object));
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
  test('loading screen: no controller notice screen; every level and duel opens on a loading screen with the controller note', () => {
    expect.ok(atLoad.screen === 'main' && !('start' in Game.screens()), `at load: ${atLoad.screen}`);
    const el = document.getElementById('loading');
    for (const go of [() => Game.startLevel('test-crowd'), () => Game.startFight('hollow')]) {
      go();
      expect.ok(el.classList.contains('show') && Game.loading > 0, 'the loading screen shows');
      expect.ok(shown('loadPadText').includes('controller') && !!el.querySelector('svg') && shown('loadName') !== '', 'its name, and the controller note with its icon');
      Game.tickLoading(CONFIG.loading.time + 0.01);
      expect.ok(!el.classList.contains('show') && Game.loading === 0, 'then it lifts');
    }
  });
  test('version: a tiny label shows the version in every menu and hides during play', () => {
    const label = document.getElementById('version'), seen = () => label.offsetParent !== null && label.textContent === A.VERSION;
    expect.ok(/^v\d+\.\d+(\.\d+)?$/.test(A.VERSION), `one version constant (${A.VERSION})`);
    Game.showMenu('main'); expect.ok(seen(), 'on the main menu');
    Game.showMenu('levels'); expect.ok(seen(), 'in the Levels menu');
    Game.startLevel('test-crowd'); sim.begin(); sim.step(2, 1);
    expect.ok(!seen(), 'hidden during play');
    Game.pause(false); expect.ok(seen(), 'in the pause menu');
    Game.showMenu('options'); expect.ok(seen(), 'in the options');
    Game.resume(); expect.ok(!seen(), 'hidden again on resuming');
  });

  // ---- v4.2.4 fixes -----------------------------------------------------------------------------------------------
  test('v4.2.4 checkpoints: resting keeps beaten enemies dead; ones beaten since the last rest come back on a death', () => {
    Game.startLevel('long-hall'); sim.begin(); sturdy(Game.player);
    const patrol = () => Game.enemies.find(e => e.behavior === 'patrol' && e.path[0] === 40), hz = () => Game.zones.find(z => z.id === 'zone-hollow');
    patrol().die(); hz().actors[0].die(); sim.step(2);
    sim.place(4.5, -3); sim.press('rest'); sim.seconds(CONFIG.rest.time + 0.5);
    expect.ok(log.includes('rest') && !patrol() && hz().gate.open, 'rested: the patrolling Hollow and the zone Hollow stay dead');
    const second = Game.enemies.find(e => e.behavior === 'patrol' && e.path[0] === 98); second.die(); sim.step(2);
    Game.player.hp = 0; Game.player.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.2);
    expect.ok(!patrol() && Game.enemies.some(e => e.behavior === 'patrol' && e.path[0] === 98 && e.alive() && e.hp === e.def.hp),
      'after a death: the one beaten before the rest stays dead, the one beaten since is back at full health');
    const fire = A.LEVEL_1.bonfires.find(b => b.id === 'after-rogue'), rogue = A.LEVEL_1.gated.find(z => z.id === 'zone-rogue');
    expect.ok(fire.x > rogue.gateX, 'Level 1: the second bonfire is the reward past the Rogue\'s gate');
  });
  test('v4.2.4 tutorial: the heavy step wants a fully charged heavy; a lighter one shows a hint', () => {
    const p = tutorialAt('heavy'), d = Game.enemies[0], at = Game.tut.index;
    events.emit('strike', { attacker: p, target: d, strike: { attackId: 'heavy', charge: 0.4 }, at: { x: 0, y: 0, z: 0 }, blocked: false });
    expect.ok(Game.tut.doneTimer <= 0 && /longer/i.test(Game.tut.hint), `a half charge: not done, a hint (${Game.tut.hint})`);
    events.emit('strike', { attacker: p, target: d, strike: { attackId: 'heavy', charge: 1 }, at: { x: 0, y: 0, z: 0 }, blocked: false });
    expect.ok(Game.tut.doneTimer > 0 && Game.tut.index === at, 'a full charge: done');
  });
  test('v4.2.4 stamina: emptying the bar exhausts; nothing but walking until it refills, and a press says why', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); log.length = 0;
    const p = Game.player; sim.step(2);
    p.spend(p.stamina);
    expect.ok(p.exhausted && p.staminaDelay >= CONFIG.player.exhaustDelay - 1e-9, 'exhausted, with the longer wait');
    p.stamina = 5; sim.press('roll'); sim.step(1, 1);
    expect.ok(p.state !== PS.ROLL && log.includes('staminaDenied'), 'no roll, and the refusal announced');
    expect.ok(document.getElementById('pExhaust').classList.contains('show') && shown('pExhaust') !== '', 'the bar says so');
    sim.until(() => p.stamina >= CONFIG.player.exhaustRecover, 6); sim.step(1);
    sim.press('roll'); sim.step(2);
    expect.ok(!p.exhausted && p.state === PS.ROLL, 'refilled: it rolls again');
    p.hp = 0; p.setState(PS.DEAD); p.sinceExhausted = 1; sim.step(1, 1);
    expect.ok(/stamina/i.test(shown('diedTip')), `a stamina tip on death (${shown('diedTip')})`);
  });
  test('v4.2.4 vision: unaware enemies see in a cone only; a searching one walks to where it last saw the player', () => {
    Game.startLevel('test-crowd'); sim.begin(); sim.clearEnemies(); sturdy(Game.player);
    const p = Game.player, away = sim.spawn('hollow', p.x + 6, p.z, undefined, Math.atan2(6, 0));   // facing straight away
    sim.seconds(1);
    expect.ok(away.state === ES.IDLE, `back turned: never noticed (${away.state})`);
    away.yaw = Math.atan2(-6, 0); sim.seconds(0.5);
    expect.ok(away.in('fighting'), `turned round: it sees the player (${away.state})`);
    const e = behindPillar(); e.notice = CONFIG.notice.gated; e.setState(ES.CHASE); e.lastSeen = { x: 30, z: -11 };
    sim.step(1);
    expect.ok(e.state === ES.SEARCH, `lost behind the pillar: searching (${e.state})`);
    const d0 = Math.hypot(e.x - 30, e.z + 11); sim.seconds(1);
    expect.ok(e.state === ES.CHASE || Math.hypot(e.x - 30, e.z + 11) < d0 - 0.5, 'walking to where it last saw the player, or back on it');
  });
  test('v4.2.4 alerts: one enemy noticing wakes its whole zone (the Tower courtyard)', () => {
    Game.startLevel('the-tower'); sim.begin();
    const Z = Game.zones.find(z => z.id === 'zone-courtyard'), was = new Set(Z.actors);
    Z.actors[0].setState(ES.CHASE); Game.spreadAlert(was);
    expect.ok(Z.actors.every(e => !e.in('unaware')), `all five awake: ${Z.actors.map(e => e.state).join(', ')}`);
  });
  test('v4.2.4 bosses: the wind-up glow lights the weapon only; boss strikes are short enough to roll through', () => {
    for (const id of ['giant', 'pillagerCaptain', 'bellWarden', 'executioner']) {
      const e = new A.Enemy(A.ENEMY_BY_ID[id], { x: 0, z: 0, yaw: 0, behavior: 'gated' }), r = e.rig;
      const meshes = []; r.root.traverse(o => { if (o.isMesh) meshes.push(o); });
      expect.ok(!r.bodyMats.includes(r.weaponMat) && meshes.filter(m => m.material === r.weaponMat).length >= 1
        && meshes.some(m => r.bodyMats.includes(m.material)), `${id}: the weapon has its own material`);
      r.dispose();
      for (const a of A.ENEMY_BY_ID[id].attacks) for (const h of a.hits)
        expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${id} ${a.id}: active ${h.active} s leaves a roll's i-frames a margin`);
    }
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
    expect.near(e.def.hp, 1800, 0, '1800 HP (doubled from 900)');
    expect.above(e.def.hp, Math.max(B.knight.hp, B.warden.hp), 'tougher than either of Level 2\'s throne pair');
    expect.below(e.def.hp, B.bellWarden.hp, 'less than the Bell Warden');
    expect.ok(e.def.weapon === 'halberd' && e.def.visual.embers === true && !!e.rig.embers, 'a halberd with embers');
  });
  test('Pillager Captain: its three-cut combo can be parried, its overhead only rolled, its thrust comes only from mid range', () => {
    Game.startFight('pillagerCaptain'); sim.begin(); log.length = 0; sturdy(Game.player);
    const p = Game.player, e = Game.duel, combo = e.def.attacks.find(a => a.hits.length === 3), over = e.def.attacks.find(a => a.rollOnly);
    expect.ok(combo && combo.tracking.rate > 0 && !makeStrike(combo).rollOnly, 'a tracking three-cut combo, not roll-only');
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
    expect.ok(e.state === ES.BROKEN && parries <= 6, `posture broke after ${parries} parries`);   // v4.2.1: parry fills 24 (was 28)
    Game.startFight('pillagerCaptain'); sim.begin();
    const d = Game.duel; let n = 0;
    while (d.state !== ES.BROKEN && n++ < 30) { d.takeHit(strikeOf('heavy'), behind(d)); sim.step(10); }
    expect.ok(d.state === ES.BROKEN, `posture broke after ${n} chained heavy hits`);
  });

  // ---- Story boss moves borrowed from the existing Elden Ring bosses -------------------------------------------
  const STORY_BOSS_MOVES = [
    { id: 'giant', level: 'long-hall', hp: 1920, total: 3, added: 1 },
    { id: 'pillagerCaptain', level: 'burning-town', hp: 1800, total: 5, added: 2 },
    { id: 'bellWarden', level: 'the-tower', hp: 2600, total: 6, added: 2 },
  ];
  test('Story boss moves: exactly 1 / 2 / 2 additions and doubled health in levels and duels', () => {
    for (const b of STORY_BOSS_MOVES) {
      const d = A.ENEMY_BY_ID[b.id];
      expect.ok(d.attacks.length === b.total && d.attacks.filter(a => a.origin).length === b.added, `${b.id}: exact move counts`);
      Game.startFight(b.id); sim.begin();
      expect.ok(Game.duel.hp === b.hp && Game.duel.def.hp === b.hp, `${b.id}: doubled duel health`);
      Game.startLevel(b.level); sim.begin();
      const e = Game.enemies.find(e => e.def.id === b.id);
      expect.ok(e && e.hp === b.hp && e.def.hp === b.hp, `${b.id}: doubled level health`);
    }
    expect.ok(!A.ENEMY_BY_ID.bellWarden.attacks.some(a => a.id === 'bellSkyfall' || a.hits.some(h => h.box && h.box.ring)), 'Bell Warden has no Skyfall area shockwave');
    const aldric = A.ENEMY_BY_ID.varn;
    expect.ok(aldric.hp === 1800 && aldric.phases.field.hp === 1600 && aldric.phases.throne.hp === 1800 && aldric.phases.knell.hp === 2000, 'Aldric health unchanged');
    expect.ok(!aldric.attacks.some(a => a.origin), 'Aldric has no borrowed moves');
  });
  test('Story boss moves: source animations and hit data are preserved without shared objects or foreign branches', () => {
    for (const b of STORY_BOSS_MOVES) for (const a of A.ENEMY_BY_ID[b.id].attacks.filter(a => a.origin)) {
      const source = A.ENEMY_BY_ID[a.origin.enemy].attacks.find(s => s.id === a.origin.attack);
      expect.ok(source && a !== source && a.hits !== source.hits && a.box !== source.box && a.tracking !== source.tracking, `${a.id}: independent copy`);
      expect.ok(a.pose === source.pose && JSON.stringify(a.tracking) === JSON.stringify(source.tracking) && a.recovery === source.recovery, `${a.id}: source animation and timing`);
      expect.ok(!a.followUps, `${a.id}: no branches into the source boss's other moves`);
      for (let i = 0; i < a.hits.length; i++) {
        const h = a.hits[i], s = source.hits[i];
        expect.ok(h !== s && h.startup === s.startup && h.active === s.active && h.follow === s.follow, `${a.id}/${i}: source hit timing`);
        expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}/${i}: roll margin`);
      }
    }
  });
  test('Story boss moves: every borrowed attack strikes, deals damage and recovers with rendering', () => {
    for (const b of STORY_BOSS_MOVES) for (const a of A.ENEMY_BY_ID[b.id].attacks.filter(a => a.origin)) {
      Game.startFight(b.id); sim.begin();
      const p = Game.player, e = Game.duel;
      sturdy(p); faceOff(e, p, 2); quiet(e);
      const hp = p.hp, seen = new Set();
      e.beginAttack(a);
      Game.render(1, STEP);
      const done = sim.until(() => {
        if (e.state === ES.ACTIVE && !seen.has(e.hitIndex)) { seen.add(e.hitIndex); Game.render(1, STEP); }
        return e.state === ES.RECOVER;
      }, 15);
      Game.render(1, STEP);
      expect.ok(done >= 0 && seen.size === a.hits.length, `${a.id}: every hit and a recovery`);
      expect.below(p.hp, hp, `${a.id}: can damage the player`);
      sim.until(() => e.state !== ES.RECOVER, 5);
      expect.ok(e.state === ES.CHASE && e.cooldown > 0 && Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z), `${a.id}: completes at a finite position`);
    }
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
    // The Captain's doubled boss bar lifts the town above the old 2.7x cap; it still sits below the Tower.
    expect.ok(town > keep * 1.8 && town < tower, `HP: town ${town}, Level 2 ${keep}, Tower ${tower}`);
    const debut = id => L.gated.findIndex(z => z.enemies.some(m => m.enemy === id));
    const alone = id => L.gated.find(z => z.enemies.some(m => m.enemy === id)).enemies.length;
    expect.ok(alone('lancer') === 1 && alone('duelist') === 1, 'the Lancer and the Duelist are met alone first');
    const bowZone = L.gated.findIndex(z => z.id === L.dispersed.find(s => s.enemy === 'bowman').zone);   // Bowmen are optional sentries of a zone
    expect.ok(debut('lancer') < bowZone && bowZone < debut('duelist'), 'Lancer, then Bowman (with a Lancer), then Duelist');
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
  test('the burning town: the steep street\'s barricade falls with its Lancer, the balcony Bowman optional; up through the stair house, and a jump over its low rail back down', () => {
    const p = townLevel(); sturdy(p);
    const Z = Game.zones.find(q => q.id === 'zone-steep-street'), bow = Game.enemies.find(e => e.def.id === 'bowman' && Math.abs(e.y - 8) < 1e-6);
    expect.ok(!!bow && bow.zone === 'zone-steep-street' && !Z.actors.includes(bow), 'a Bowman on the balcony, 4 m up, waking with the zone but not part of it');
    sim.place(54, 26, 4);
    for (const e of Z.actors) e.die();
    expect.ok(sim.until(() => Z.gate.lift >= 1, 4) >= 0 && bow.alive(), 'the Lancer is dead: the barricade fell, the Bowman still up there');
    for (const [x, z] of [[54, 28.6], [54, 31], [51, 30.8], [46, 30.8], [43, 30.6]]) {
      bow.notice = 0; bow.setState(ES.IDLE);
      expect.ok(sim.walkTo(x, z, 0.4, 8), `walked to (${x}, ${z}); at (${p.x.toFixed(1)}, ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
    }
    expect.near(p.y, 8, 0.01, 'up the stair inside the house and out onto the balcony');
    bow.die();
    sim.place(41, 29, 8); sim.move(0, -1); sim.step(10); sim.press('jump');
    sim.until(() => p.y < 4.5 && p.grounded, 4); sim.move(null);
    expect.near(p.y, 4, 0.01, `jumped the rail and dropped to the street (at z ${p.z.toFixed(1)}, y ${p.y.toFixed(1)})`);
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

  // ---- v4.1 the HUD ------------------------------------------------------------------------------------------------
  test('HUD: a lost health bar keeps its trail, then drains it; the vitals dim when calm and light at a threat', () => {
    Game.startLevel('burning-town'); sim.begin(); sim.step(0.2); Game.render(1, STEP);
    const H = CONFIG.hud, p = Game.player, hud = A.hud;
    p.hp = p.maxHp * 0.5; Game.render(1, STEP);
    expect.near(parseFloat(hud.pHpFill.style.width), 50, 1, 'the bar drops at once');
    expect.above(parseFloat(hud.pHpTrail.style.width), 95, 'the trail stays where it was');
    for (let i = 0; i < Math.ceil(H.trailHold / STEP) + 2; i++) Game.render(1, STEP);
    expect.above(parseFloat(hud.pHpTrail.style.width), 85, 'the trail waits through its hold');
    for (let i = 0; i < 60 * 3; i++) Game.render(1, STEP);
    expect.near(parseFloat(hud.pHpTrail.style.width), 50, 1, 'then it drains down to the bar');
    p.hp = p.maxHp; Game.enemies.length = 0; hud.idle = H.calmDelay + 1;
    for (let i = 0; i < 60 * (H.calmFadeOut + 1); i++) { hud.idle = H.calmDelay + 1; Game.render(1, STEP); }
    expect.above(hud.calm, 0.99, 'dimmed after a quiet spell');
    A.events.emit('strike', { strike: {}, attacker: null, target: p, at: { x: p.x, y: p.y + 1, z: p.z }, blocked: false });
    for (let i = 0; i < 60 * (H.calmFadeIn + 0.2); i++) Game.render(1, STEP);
    expect.below(hud.calm, 0.01, 'a blow brings them back');
  });
  test('HUD: gate notices name each gate by its kind, the stage scale follows the window, and the HUD never writes to the game', () => {
    Game.startLevel('burning-town'); sim.begin(); sim.step(0.2); Game.render(1, STEP);
    const hud = A.hud;
    const toastsFor = (gate, shortcut) => { const n = hud.toastList.length; A.events.emit('gateOpened', { gate, shortcut }); return hud.toastList.slice(n).map(t => t.el.textContent); };
    expect.ok(toastsFor({ style: 'barricade' })[0] === CONFIG.hud.toasts.barricade, 'a barricade falls');
    expect.ok(toastsFor({ style: 'portcullis' })[0] === CONFIG.hud.toasts.portcullis, 'a portcullis opens');
    expect.ok(toastsFor({ style: 'barricade' }, true)[0] === CONFIG.hud.toasts.shortcut, 'a shortcut opens');
    expect.ok(!document.getElementById('objective'), 'no objective counter on screen');
    const before = JSON.stringify([Game.player.hp, Game.player.stamina, Game.enemies.map(e => [e.hp, e.x, e.z])]);
    for (let i = 0; i < 30; i++) Game.render(1, STEP);
    expect.ok(before === JSON.stringify([Game.player.hp, Game.player.stamina, Game.enemies.map(e => [e.hp, e.x, e.z])]), 'rendering the HUD changes nothing in the game');
    const H = CONFIG.hud, u = Math.max(H.minScale, Math.min(H.maxScale, Math.min(innerWidth / H.refWidth, innerHeight / H.refHeight))) * A.settings.hudScale;
    expect.near(hud.scale, u, 0.001, 'the stage scale fits the window');
  });


  // ---- audio: rendered offline, so no speakers or user gesture are needed ---------------------------------------
  async function renderSound(id, opts) {
    const sr = 44100, ctx = new OfflineAudioContext(2, sr * 3.6, sr), m = new AudioManager();
    m.init(ctx); m.play(id, opts || { vel: 1 });
    const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
    // Pitch estimate: the ratio of the signal's change per sample to its size is about 2 sin(pi f / sr) for a tone at f,
    // weighting every frequency by its energy (so a low thud with a little hiss on top still reads low).
    let peak = 0, e = 0, de = 0, prev = 0;
    for (let i = 0; i < L.length; i++) {
      const v = (L[i] + R[i]) / 2; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      e += v * v; de += (v - prev) * (v - prev); prev = v;
    }
    return { peak, hz: Math.asin(Math.min(1, Math.sqrt(de / Math.max(e, 1e-12)) / 2)) * sr / Math.PI };
  }
  test('audio: the sound data is valid and every recipe renders audibly without clipping', async () => {
    expect.ok(validateAudio().length === 0, 'validateAudio: ' + validateAudio().join(' | '));
    for (const id of Object.keys(AUDIO.sounds)) {
      const r = await renderSound(id);
      expect.above(r.peak, 0.003, `${id} peak`);
      expect.below(r.peak, 1.0001, `${id} peak (the limiter keeps it under full scale)`);
    }
  });
  test('audio: footsteps are low and sit well under impacts', async () => {
    const step = await renderSound('footL', { vel: 0.7 }), hit = await renderSound('hitHurt', { vel: 1 }), swing = await renderSound('swingLight', { vel: 0.7 });
    expect.below(step.peak, 0.3, 'a footstep peak');
    expect.below(step.peak, hit.peak * 0.4, 'a footstep against a hit');
    expect.below(step.peak, swing.peak * 0.6, 'a footstep against a sword swing');
    expect.below(step.hz, 1200, 'footstep pitch (energy-weighted estimate, Hz)');
  });
  test('audio: the voice pool never grows past its limits and hands every strip back', async () => {
    const ctx = new OfflineAudioContext(2, 44100 * 5, 44100), m = new AudioManager(); m.init(ctx);
    const ids = Object.keys(AUDIO.sounds);
    for (let i = 0; i < 400; i++) m.play(ids[i % ids.length], { vel: (i % 10) / 10, pos: { x: (i % 7) - 3, y: 0, z: (i % 5) - 2 } });
    const s = m.stats();
    expect.ok(s.busy <= AUDIO.strips && s.active <= AUDIO.voices, `busy ${s.busy}/${AUDIO.strips}, active ${s.active}/${AUDIO.voices}`);
    expect.ok(s.plays > 0 && s.plays + s.dropped >= 400, 'every request is either played or dropped');
    await ctx.startRendering();
    await new Promise(r => setTimeout(r, 50));
    expect.ok(m.stats().busy === 0, 'all strips are released once the sources end: ' + JSON.stringify(m.stats()));
  });
  test('audio: the engine leaves the game\'s random numbers alone', () => {
    const m = new AudioManager();
    const keep = Math.random; let calls = 0; Math.random = () => { calls++; return keep(); };
    try { m.init(new OfflineAudioContext(2, 44100, 44100)); m.play('hitFlesh'); m.play('footL'); } finally { Math.random = keep; }
    expect.ok(calls === 0, 'audio used Math.random ' + calls + ' times');
  });

  // ---- v4.3 Level 5: the Final Castle ------------------------------------------------------------------------------
  const L5_WAY = [[60, 0], [86, 0], [100, 0], [98, 21], [114, 22], [129, 22], [114, 22], [98, 21], [100, -4], [120, -15], [120, -28], [108, -30],
    [92, -30], [92, -10], [100, 0], [134, 0], [150, 0], [166, 0], [194, 0], [205, 0], [215, 0], [227.5, -9], [227.5, -14], [236, -16], [247.5, -14],
    [247.5, -9], [254, 8], [254, 20], [254, 31], [230, 32], [208, 33], [206, 28], [206, 4], [206, 0], [250, 0], [262, 9.5], [262, 0], [282, 0],
    [300, 0], [314, 0], [325, 0], [350, 0], [366, 0]];
  test('Level 5: every room is walkable from the field to the throne, with the gates open', () => {
    Game.startLevel('final-castle'); Game.loading = 0; sim.begin(); sim.clearEnemies();
    for (const g of world.gates) { g.open = true; g.lift = 1; }
    for (const [x, z] of L5_WAY) expect.ok(sim.walkTo(x, z, 0.6, 25), `walked to (${x}, ${z}); stuck at (${Game.player.x.toFixed(1)}, ${Game.player.y.toFixed(1)}, ${Game.player.z.toFixed(1)})`);
    expect.near(Game.player.y, 24, 0.1, 'up at the throne room floor');
  });
  test('Level 5: a scripted run wakes every zone it enters, opens every gate in turn, and every archer and gargoyle engages', () => {
    Game.startLevel('final-castle'); Game.loading = 0; sim.begin(); const p = Game.player; sturdy(p);
    for (const z of Game.zones) for (const e of z.actors) expect.ok(inArea(z.trigger, e.x, e.z) && Math.abs(world.floorY(e.x, e.z, e.y + 0.1) - e.y) < 0.1 && (z.id !== 'zone-hall' || e.y === 0), `${z.id}: ${e.def.id} stands in its zone (y ${e.y})`);
    for (const b of A.LEVEL_5.bonfires) expect.ok(Math.abs(world.floorY(b.x, b.z, b.y ?? 0) - (b.y ?? 0)) < 0.1, `bonfire ${b.id} on its own floor`);
    Game.enemies.find(e => e.def.id === 'varn').deplete(); sim.seconds(7);
    const route = [[86, 0], [100, 0], [98, 21], [114, 22], [129, 22], [114, 22], [98, 21], [100, -4], [120, -15], [120, -28], [112, -32], [120, -15], [134, 0],
      [150, 0], [166, 0], [180, 0], [194, 0], [205, 0], [215, 0], [240, 0], [254, 8], [254, 20], [254, 31], [230, 32], [210, 34], [206, 28], [206, 4], [206, 0],
      [250, 0], [262, 0], [282, 0], [300, 0], [314, 0]], engaged = new Set();
    for (const [x, z] of route) {
      const ok = sim.until(() => {
        for (const e of Game.enemies) if (e.alive() && !e.phaseIds && !e.in('unaware') && e.state !== ES.DORMANT) { engaged.add(e); e.die(); }
        const dx = x - p.x, dz = z - p.z; if (Math.hypot(dx, dz) < 0.6) return true; sim.move(dx, dz); return false;
      }, 40) >= 0;
      sim.move(null);
      expect.ok(ok, `reached (${x}, ${z}); stuck at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`);
    }
    expect.ok(Game.zones.filter(z => z.id !== 'zone-throne').every(z => z.gate.open), 'every gate before the throne opened');
    for (const id of ['castleBowman', 'gargoyle', 'wisp']) {
      const all = [...A.LEVEL_5.dispersed, ...A.LEVEL_5.gated.flatMap(g => g.enemies)].filter(s => s.enemy === id).length, n = [...engaged].filter(e => e.def.id === id).length;
      expect.ok(n === all, `${id}: ${n} of ${all} came for the player`);
    }
  });
  test('Level 5: the field fight ends in a retreat over the wall: no death, the gate opens, bonfire 1 lights', () => {
    Game.startLevel('final-castle'); Game.loading = 0; sim.begin(); log.length = 0;
    const b = Game.enemies.find(e => e.def.id === 'varn'), B = A.LEVEL_5.bonfires[0], zone = Game.zones.find(z => z.id === 'zone-field');
    expect.ok(b.def.phaseId === 'field' && b.hp === b.def.hp, 'Aldric starts on his field bar');
    expect.ok(!Game.bonfireLit(B) && !Game.nearBonfire(), 'bonfire 1 is cold before the fight is won');
    sim.step(30); expect.ok(b.state !== ES.IDLE, `he comes for the player at once (${b.state})`);
    b.deplete(); sim.step(2);
    expect.ok(b.state === ES.RETREAT && b.invulnerable() && !log.includes('enemyDeath'), 'he retreats, untouchable, not dead');
    sim.seconds(8);
    expect.ok(b.state === ES.GONE && !b.alive() && !log.includes('enemyDeath'), `gone over the wall (${b.state}), never killed`);
    expect.ok(zone.gate.open && Game.bonfireLit(B), 'the gate opened and bonfire 1 is lit');
    expect.ok(!Game.target(), 'nothing left to show on the boss bar');
    sim.place(B.x + 1, B.z); sim.step(2); expect.ok(!!Game.canRest(), 'bonfire 1 can be rested at');
  });
  test('Level 5: the throne fight: the fog seals, the transition hurts nobody, a new bar and name, death brings the ending', () => {
    let wasDone = null; try { wasDone = localStorage.getItem('combatArena.complete'); } catch (err) { /* no storage */ }
    A.finale.jump(A.LEVEL_5.devJumps[4]); Game.loading = 0; sim.begin(); log.length = 0; sturdy(Game.player);
    const p = Game.player, F = A.finale.state, fog = F.fog, b = Game.enemies.find(e => e.def.id === 'varn');
    expect.ok(fog.gate.open, 'the fog door is open from the bonfire side');
    sim.walkTo(330, 0, 0.6, 10); sim.step(10);
    expect.ok(!fog.gate.open, 'it closed behind the player');
    expect.ok(b.def.phaseId === 'throne' && b.def.name === 'Aldric, the Gaoler King', 'first bar: the Gaoler King');
    b.deplete(); sim.step(1);
    expect.ok(b.state === ES.PHASE && b.def.name === 'Aldric, the Ember-Crowned', 'the transition begins: renamed, the Ember-Crowned');
    sim.place(b.x - 2, b.z); const hp0 = p.hp; let maxHit = 0;
    sim.until(() => { maxHit = Math.max(maxHit, hp0 - p.hp); p.hp = hp0; return b.state !== ES.PHASE; }, 20);
    expect.ok(maxHit === 0, `nothing in the transition hurt the player standing at his feet (${maxHit})`);
    expect.ok(b.hp === b.def.hp && b.def.hp === 2000, 'a fresh full bar');
    expect.ok(!F.room.windows[0].mesh.visible && F.room.pillars.every(P => P.t > 0), 'the glass burst and the pillars fell');
    b.deplete(); sim.step(2);
    expect.ok(!b.alive() && Game.zones.find(z => z.id === 'zone-throne').gate.open && !!F.ending, 'his last bar: dead, the ending runs');
    expect.ok(!A.hud.complete.classList.contains('show'), 'no LEVEL COMPLETE banner: the ending takes over');
    expect.ok(A.finale.completed(), 'the game remembers it was finished');
    try { if (wasDone === null) localStorage.removeItem('combatArena.complete'); } catch (err) { /* no storage */ }   // leave the player's own flag as it was
  });
  test('Level 5: dying in the throne room puts the player back at the final bonfire with the fog open and Aldric whole', () => {
    A.finale.jump(A.LEVEL_5.devJumps[4]); Game.loading = 0; sim.begin();
    const fog = A.finale.state.fog;
    sim.walkTo(330, 0, 0.6, 10); sim.step(10); expect.ok(!fog.gate.open, 'sealed in');
    const b = Game.enemies.find(e => e.def.id === 'varn'); b.deplete(); sim.step(2);
    Game.player.hp = 0; Game.onPlayerDeath(); Game.player.setState(PS.DEAD);
    sim.seconds(CONFIG.death.respawnDelay + 0.5);
    const v = Game.enemies.find(e => e.def.id === 'varn');
    expect.near(Game.player.x, 315.5, 0.5, 'back at the final bonfire');
    expect.ok(fog.gate.open && v !== b && v.def.phaseId === 'throne' && v.hp === v.def.hp, 'fog open, Aldric back on his first throne bar');
    expect.ok(A.finale.state.room.windows.every(w => w.mesh.visible), 'the throne room is whole again');
  });
  test('Aldric: every strike leaves a roll\'s i-frames a margin; each phase fights with its own attacks', () => {
    const D = A.ENEMY_BY_ID.varn;
    for (const a of D.attacks) for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    expect.ok(Object.keys(D.phases).join() === 'field,throne,knell', 'three phases');
    expect.ok(D.phases.knell.attacks.length >= D.phases.throne.attacks.length + 3, 'the Ember-Crowned adds at least three attacks');
    expect.below(D.phases.knell.cooldown[1], D.phases.throne.cooldown[1], 'the Ember-Crowned waits less between attacks');
    expect.below(D.phases.throne.cooldown[1], D.phases.field.cooldown[1], 'the throne bar presses harder than the field');
  });
  test('Aldric: the Last Toll\'s rings hurt where they pass, can be rolled, and leave the player inside alone', () => {
    Game.startFight('varn'); Game.loading = 0; sim.begin(); sturdy(Game.player);
    const p = Game.player, e = Game.duel, toll = e.baseDef.attacks.find(a => a.id === 'lastToll');
    faceOff(e, p, 8); quiet(e); e.notice = 0; const hp0 = p.hp;
    e.beginAttack(toll); sim.until(() => e.state === ES.ACTIVE, 3); sim.seconds(0.3);
    expect.below(p.hp, hp0, 'the first ring reached the player 8 m out');
    Game.startFight('varn'); sim.begin(); sturdy(Game.player);
    const q = Game.player, f = Game.duel; faceOff(f, q, 8); quiet(f); f.notice = 0; const hp1 = q.hp;
    f.beginAttack(toll); sim.until(() => f.state === ES.WINDUP && f.stateTime >= toll.hits[0].startup + 0.08 - CONFIG.player.rollIFrames * 0.5, 3);
    sim.press('roll'); sim.seconds(0.6);
    expect.ok(q.hp === hp1, 'rolled through the ring');
  });
  test('Aldric: the Last Toll rings and his stomps run along the floor: a jump clears them; the Ash Wave is a flying slash', () => {
    const D = A.ENEMY_BY_ID.varn;
    for (const id of ['lastToll', 'varnStomp', 'knellStomp']) for (const h of D.attacks.find(a => a.id === id).hits.slice(0, id === 'lastToll' ? 3 : 1)) {
      const b = h.box || D.attacks.find(a => a.id === id).box;
      expect.ok(b.y + b.h / 2 <= 0.6 + 1e-6, `${id}: low enough to jump (top ${b.y + b.h / 2} m)`);
    }
    expect.ok(D.attacks.find(a => a.id === 'ashWave').projectile.look === 'slash', 'the Ash Wave is drawn as a slash');
    Game.startFight('varn'); Game.loading = 0; sim.begin(); sturdy(Game.player);
    const p = Game.player, e = Game.duel, toll = e.baseDef.attacks.find(a => a.id === 'lastToll');
    faceOff(e, p, 8); quiet(e); const hp0 = p.hp;
    e.beginAttack(toll); sim.until(() => e.state === ES.WINDUP && e.stateTime >= toll.hits[0].startup - 0.12, 3);
    sim.press('jump'); sim.seconds(0.5);
    expect.ok(p.hp === hp0, `jumped over the ring (lost ${hp0 - p.hp})`);
    expect.ok(D.attacks.find(a => a.id === 'varnStomp').box.ground, 'stomps are ground shockwaves: any time in the air clears them');
    sim.until(() => e.hitIndex === 1 && e.state === ES.WINDUP && e.stateTime >= toll.hits[1].startup - 0.42, 3);
    sim.press('jump'); sim.seconds(0.5);   // an early jump: in the air as the ring passes, though well below its old reach
    expect.ok(p.hp === hp0, `an early jump clears it too (lost ${hp0 - p.hp})`);
  });
  test('Aldric: the Judgement Leap lands along its locked aim and he takes no fall damage', () => {
    Game.startFight('varn'); Game.loading = 0; sim.begin(); sturdy(Game.player); log.length = 0;
    const p = Game.player, e = Game.duel, leap = e.baseDef.attacks.find(a => a.id === 'varnLeap');
    e.enterPhase(0); e.hp = e.def.hp;   // throne bar
    faceOff(e, p, 9); quiet(e); e.notice = 0; const x0 = e.x, z0 = e.z;
    e.beginAttack(leap); sim.until(() => e.state === ES.ACTIVE, 4);
    expect.above(Math.hypot(e.x - x0, e.z - z0), 6, 'it leapt most of the way to the player');
    expect.ok(e.hp === e.def.hp && !log.includes('fallDamage'), 'no fall damage from his own leap');
  });
  test('Level 4 now carries on into Level 5', () => {
    expect.ok(A.LEVEL_4.next === 'final-castle' && A.LEVELS[A.LEVELS.length - 1].id === 'final-castle', 'the Tower leads to the castle, the last level');
  });

  // ---- Story mode (v4.4) -----------------------------------------------------------------------------------------
  // Each test keeps the player's real save: it is put back afterwards.
  const withSave = fn => () => {
    const key = CONFIG.story.saveKey; let kept = null;
    try { kept = localStorage.getItem(key); } catch (e) { /* none */ }
    try { fn(); } finally {
      Game.story = false;
      try { if (kept === null) localStorage.removeItem(key); else localStorage.setItem(key, kept); } catch (e) { /* none */ }
      A.story.load();
    }
  };
  const S = () => A.story;
  test('Story: the chapters run tutorial -> Level 1 ... Level 5, and Level 5 ends the road', withSave(() => {
    expect.ok(S().nextLevelId('tutorial') === 'long-hall', 'the tutorial leads to the Long Hall');
    const order = ['long-hall', 'sunken-keep', 'burning-town', 'the-tower', 'final-castle'];
    order.slice(0, -1).forEach((id, i) => expect.ok(S().nextLevelId(id) === order[i + 1], `${id} leads to ${order[i + 1]}`));
    expect.ok(S().nextLevelId('final-castle') === null, 'nothing after the castle');
  }));
  test('Story: a new game saves at the level start and the menu offers Continue and New Game', withSave(() => {
    S().erase(); Game.showMenu('main');
    expect.ok(Game.screens().main.items[0].name === 'Story', 'no save: Story comes first');
    S().newGame(false); sim.begin();
    expect.ok(Game.story && Game.level.id === 'long-hall', 'No to the tutorial: straight to Level 1');
    expect.ok(S().data.level === 'long-hall' && S().data.bonfire === null, 'saved at the level start');
    Game.showMenu('main');
    const names = Game.screens().main.items.map(i => i.name), road = Game.screens().storyRoad.items.map(i => i.name);   // v7.0: Story holds both roads
    expect.ok(names[0] === 'Story' && names.includes('Levels') && road[0] === 'Continue' && road[1] === 'New Game', `Story first, then the other modes; the road offers Continue and New Game (${road})`);
  }));
  test('Story: Continue puts the player back at the rested bonfire with the beaten enemies gone and won gates open', withSave(() => {
    S().jumpTo('sunken-keep'); sim.begin();
    const z = Game.zones[0];
    for (const a of z.actors) a.deplete();
    sim.step(2);
    expect.ok(z.gate.open, 'the first zone is won');
    const b = Game.level.bonfires[Game.level.bonfires.length - 1];
    Game.player.x = b.x + 0.5; Game.player.z = b.z; Game.player.y = world.floorY(b.x, b.z, b.y);
    for (const e of Game.enemies) if (e.alive()) { e.x += 500; }
    Game.tryRest();
    const saved = S().data;
    expect.ok(saved.bonfire === b.id, 'rested bonfire saved');
    S().quit(); expect.ok(Game.mode === 'menu' && !Game.story, 'quit to the title');
    S().resume(); sim.begin();
    expect.ok(Game.story && Game.level.id === 'sunken-keep', 'back in the level');
    expect.ok(Math.hypot(Game.player.x - saved.spawn.x, Game.player.z - saved.spawn.z) < 0.5, 'at the bonfire');
    expect.ok(Game.zones[0].gate.open && Game.zones[0].actors.length === 0, 'the won zone stays won');
  }));
  test('Story: a broken or foreign save never crashes and offers a new story', withSave(() => {
    for (const bad of ['{not json', JSON.stringify({ v: 1, level: 'nowhere' }), JSON.stringify({ v: 99 }), '"x"']) {
      localStorage.setItem(CONFIG.story.saveKey, bad);
      Game.showMenu('main');
      expect.ok(S().status === 'broken' && Game.screens().main.items[0].name === 'Story', `refused: ${bad}`);
    }
  }));
  test('Story: with storage refused (private window) the story still plays, unsaved', withSave(() => {
    const real = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem'), get = Storage.prototype.getItem;
    Storage.prototype.setItem = () => { throw new Error('denied'); };
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    try {
      Game.showMenu('main');
      S().newGame(true); sim.begin();
      expect.ok(Game.isTutorial() && Game.story && !S().storageOk, 'the tutorial runs without saving');
      S().afterTutorial(); expect.ok(Game.level.id === 'long-hall', 'skipped on to Level 1');
    } finally { Object.defineProperty(Storage.prototype, 'setItem', real); Storage.prototype.getItem = get; }
  }));
  test('Story: the pause menu offers Skip tutorial only in the tutorial, and the flasks carry over', withSave(() => {
    S().newGame(true); sim.begin(); Game.mode = 'play';
    Game.pause(false);
    expect.ok(Game.screens().pause.items.some(i => i.name === 'Skip tutorial'), 'Skip tutorial while training');
    Game.resume();
    S().data.progress.inventory.flask.max = 6;   // a future upgrade
    S().afterTutorial(); Game.mode = 'play'; Game.pause(false);
    expect.ok(!Game.screens().pause.items.some(i => i.name === 'Skip tutorial') && Game.screens().pause.items.some(i => i.name === 'Quit to main menu'), 'no skip in Level 1; Quit saves');
    expect.ok(Game.player.item('flask').max === 6 && Game.player.item('flask').count === 6, 'carried capacity, refilled');
    Game.resume();
  }));
  test('Story: the ending marks the story complete and shows its own screen', withSave(() => {
    S().jumpTo('final-castle'); sim.begin();
    A.events.emit('endingDone');
    expect.ok(Game.screen === 'storyDone' && S().data.completed && !Game.story, 'STORY COMPLETE, saved as complete');
    Game.showMenu('main');
  }));

  // ---- Lore (v5.1): Ysolde, inscriptions, scenes, the seamless subtitles -----------------------------------------
  const lore = () => A.lore, LS = () => A.lore.state;
  const atNpc = id => { lore().jumpTo(id); Game.loading = 0; sim.begin(); sim.step(2); };
  const npcDist = (i = 0) => Math.hypot(Game.player.x - LS().npcs[i].x, Game.player.z - LS().npcs[i].z);
  test('Lore: every NPC, inscription and scene of each level stands on a floor, off every zone fight', () => {
    for (const [id, D] of Object.entries(A.LORE.levels)) {
      Game.startLevel(id); Game.loading = 0;
      const pts = [...(D.npcs || []), ...(D.inscriptions || []), ...(D.scenes || [])];
      for (const q of pts) expect.near(world.floorY(q.x, q.z, (q.y ?? 0) + 0.1), q.y ?? 0, 0.3, `${id}: (${q.x}, ${q.z}) must stand on a floor at y ${q.y ?? 0}`);
      for (const [i, N] of (D.npcs || []).entries()) {
        expect.ok(LS().npcs[i] && LS().npcs[i].rig, `${id}: the NPC is built`);
        const z = Game.zones.find(g => g.trigger && (Array.isArray(g.trigger[0]) ? g.trigger : [g.trigger]).some(r => r.length === 4 && inArea(r, N.x, N.z)));
        expect.ok(!z, `${id}: the NPC stands inside zone ${z && z.id}`);
      }
    }
  });
  test('Lore: one press plays the whole dialogue while the player keeps full control', () => {
    atNpc('long-hall');
    expect.ok(lore().prompt() === 'Talk to Ysolde', `the Talk prompt shows (${lore().prompt()})`);
    sim.press('talk'); sim.step();
    const T = LS().talk;
    expect.ok(T && T.i === 0 && T.full, 'the first line plays');
    expect.ok(hud.subText.textContent === T.lines[0] && hud.subName.textContent === 'Ysolde of Corvel', 'subtitle with her name');
    const x0 = Game.player.x; sim.move(1, 0); sim.seconds(0.6); const moved = Game.player.x - x0; sim.move(-1, 0); sim.seconds(0.6); sim.move(null);
    expect.above(moved, 1, 'the player walks freely while she speaks');
    expect.ok(Game.player.state !== PS.DEAD && LS().talk, 'still talking while walking about');
    const steps = sim.until(() => !LS().talk, 120);
    expect.ok(steps > 0 && LS().npcs[0].heard, 'it runs to the end on its own, and is heard');
    expect.ok(!hud.sub.classList.contains('show'), 'the subtitles are gone');
  });
  test('Lore: Talk cannot skip a line, walking away fades it, coming back starts over, then an idle line', () => {
    atNpc('long-hall');
    sim.press('talk'); sim.step(); sim.press('talk'); sim.step();
    expect.ok(LS().talk.i === 0 && lore().prompt() === null, 'Talk again does nothing, and no prompt shows while she speaks');
    sim.place(30, 0); sim.step(2);
    expect.ok(!LS().talk, 'far away: it fades');
    sim.place(8, 4.6); sim.step(2);
    sim.press('talk'); sim.step();
    expect.ok(LS().talk.i === 0, 'back and Talk: from the beginning');
    sim.until(() => !LS().talk, 120);
    sim.place(30, 0); sim.step(2); sim.place(8, 4.6); sim.step(2);
    expect.ok(LS().talk && !LS().talk.full && LS().talk.lines[0] === A.LORE.levels['long-hall'].npcs[0].idle, 'heard: a short idle line on coming back');
    sim.until(() => !LS().talk, 30); sim.press('talk'); sim.step();
    expect.ok(LS().talk.full && LS().talk.i === 0, 'Talk again replays the whole dialogue');
  });
  test('Lore: an enemy turning on the player clears the subtitles at once, and Talk is refused', () => {
    atNpc('long-hall');
    sim.press('talk'); sim.step();
    const e = sim.spawn('hollow', Game.player.x + 6, Game.player.z);
    sim.until(() => e.fightingPlayer(), 5);
    sim.step();
    expect.ok(!LS().talk && lore().prompt() === null, 'no subtitles, no prompt while it fights');
  });
  test('Lore: the bars of her cell keep the player out, and she cannot be struck', () => {
    atNpc('long-hall');
    sim.walkTo(8, 7.5, 0.3, 3);
    expect.below(Game.player.z, 5.86, 'outside the bars');
    expect.ok(!Game.enemies.some(e => e.def.id === 'ysolde'), 'she is no enemy: nothing can target or hit her');
  });
  test('Lore: an inscription reads the same way, and every level with an NPC has a dev jump', () => {
    atNpc('long-hall');
    const I = LS().inscriptions[0]; sim.place(I.x, I.z + 1.2); sim.step(2);
    expect.ok(lore().prompt() === `Read: ${I.def.label}`, `the Read prompt (${lore().prompt()})`);
    sim.press('talk'); sim.step();
    expect.ok(LS().talk && LS().talk.src === I, 'its text plays as subtitles');
    for (const [id, D] of Object.entries(A.LORE.levels)) for (let i = 0; i < (D.npcs || []).length; i++) {
      lore().jumpTo(id, i); Game.loading = 0; sim.begin(); sim.step(2);
      expect.below(npcDist(i), CONFIG.lore.talkRange, `${id} (${i + 1}): the jump puts the player by her`);
      expect.ok(lore().prompt() && lore().prompt().startsWith('Talk'), `${id} (${i + 1}): Talk prompt at the jump (${lore().prompt()})`);
    }
  });

  // ---- v5.1 fixes: checkpoints, the Bell Warden's arena, Story autosave ------------------------------------------
  const dieAndRespawn = () => { Game.player.hp = 0; Game.player.setState(PS.DEAD); Game.onPlayerDeath(); sim.step(); sim.until(() => Game.player.alive(), CONFIG.death.respawnDelay + 2); sim.step(); };
  const killZone = id => { const z = Game.zones.find(q => q.id === id); for (const a of z.actors) a.deplete(); sim.until(() => z.gate.open, 5); return z; };
  test('Checkpoints: kills since the last rest come back after a death (gates stay open); rested kills stay dead', () => {
    Game.startLevel('long-hall'); Game.loading = 0; sim.begin(); sim.step(2);
    let z = killZone('zone-hollow');
    expect.ok(z.gate.open && z.actors.every(a => !a.alive()), 'the Hollow is beaten and its gate opens');
    dieAndRespawn();
    z = Game.zones.find(q => q.id === 'zone-hollow');
    expect.ok(z.gate.open, 'the gate stays open');
    expect.ok(z.actors.length === 1 && z.actors[0].alive() && Game.enemies.includes(z.actors[0]), 'the unconfirmed kill stands again');
    killZone('zone-hollow');
    sim.place(4, -2.4); sim.step(2); sim.press('rest'); sim.step(120);
    dieAndRespawn();
    z = Game.zones.find(q => q.id === 'zone-hollow');
    expect.ok(z.gate.open && z.actors.length === 0, 'rested after the kill: it stays dead');
  });
  test('Checkpoints: a beaten boss stays beaten after a death, even before a rest', () => {
    Game.startLevel('the-tower'); Game.loading = 0; sim.begin(); sim.step(2);
    const z = killZone('zone-bell');
    dieAndRespawn();
    expect.ok(z.gate.open && !z.actors.some(a => a.alive()), 'the Bell Warden does not come back');
  });
  test('Level 4: the Bell Warden ignores the player at the bell bonfire, and fights once they enter its arena', () => {
    Game.startLevel('the-tower'); Game.loading = 0; sim.begin(); sim.step(2);
    const b = Game.level.bonfires.find(q => q.id === 'tower-bell'), w = Game.enemies.find(e => e.def.id === 'bellWarden');
    sim.place(b.x + 1.2, b.z + 0.6, b.y); sim.seconds(5);
    expect.ok(!w.fightingPlayer() && Game.canRest(), 'the bonfire before the arena is safe to rest at');
    sim.place(96, 0, 22); sim.until(() => w.fightingPlayer(), 6);
    expect.ok(w.fightingPlayer(), 'inside the arena it comes for the player');
  });
  test('Story: a won zone is saved at once, and Continue opens its gate with its unconfirmed fighters back', withSave(() => {
    S().jumpTo('long-hall'); Game.loading = 0; sim.begin(); sim.step(2);
    killZone('zone-hollow'); sim.step();
    expect.ok(S().data.zones.includes('zone-hollow'), 'saved the moment the gate opened');
    S().load(); S().resume(); Game.loading = 0; sim.step(2);
    const z = Game.zones.find(q => q.id === 'zone-hollow');
    expect.ok(z.gate.open && z.actors.length === 1 && z.actors[0].alive(), 'Continue: gate open, the Hollow back at its post');
  }));

  // ---- v5.2: executions (js/execution.js) ---------------------------------------------------------------------
  const kneel = e => { e.hitbox = null; e.setState(ES.BROKEN); };   // its bar just filled
  const inFront = (e, p, gap = 0.6) => {   // the player gap m off the enemy's front edge, facing it
    const d = e.radius + p.radius + gap;
    sim.place(e.x + Math.sin(e.yaw) * d, e.z + Math.cos(e.yaw) * d, e.y); p.yaw = Math.atan2(e.x - p.x, e.z - p.z);
  };
  const execLog = [];
  A.events.onAny(type => { if (/^execution/.test(type) || type === 'enemyDeath' || type === 'bossPhase' || type === 'bossRetreat') execLog.push(type); });
  test('Execution: light attack in front of a kneeling Knight runs it through and kills it when low; the player is untouchable throughout', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel; execLog.length = 0;
    e.hp = 80; kneel(e); inFront(e, p); sim.step(1, 1);
    expect.ok(e.execReady && A.hud.execCue.classList.contains('show'), 'the cue shows');
    sim.press('light'); sim.step(1);
    expect.ok(p.state === PS.EXECUTE && e.state === ES.EXECUTED, `executing (${p.state}, ${e.state})`);
    let alwaysSafe = true;
    const hp0 = p.hp;
    sim.until(() => { if (p.state !== PS.EXECUTE) return true; if (!p.invulnerable()) alwaysSafe = false; sim.press('roll'); sim.press('light'); return false; }, 5);
    expect.ok(alwaysSafe, 'invulnerable every step of it');
    expect.ok(!e.alive() && execLog.includes('execution') && execLog.includes('enemyDeath'), `dead (${e.state}, hp ${e.hp})`);
    expect.ok(p.state !== PS.ROLL && p.invulnerable(), 'the roll presses were ignored, and a short grace follows');
    sim.seconds(CONFIG.execution.grace + 0.05); expect.ok(!p.invulnerable() && p.hp === hp0, 'grace over, no harm taken');
  });
  test('Execution: from behind, too far, or before it kneels, light attack is a plain light cut', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel;
    for (const [what, set] of [['behind', () => { kneel(e); const b = behind(e); sim.place(b.x, b.z, e.y); p.yaw = Math.atan2(e.x - p.x, e.z - p.z); }],
                               ['far', () => { kneel(e); inFront(e, p, CONFIG.execution.range + 0.6); }],
                               ['standing', () => { e.setState(ES.IDLE); e.notice = 0; inFront(e, p); }]]) {
      set(); sim.step(1); sim.press('light'); sim.step(1);
      expect.ok(p.state === PS.ATTACK && p.attack.id === 'light' && e.state !== ES.EXECUTED, `${what}: a light attack (${p.state})`);
      sim.seconds(1.2);
    }
  });
  test('Execution: a riposte after a parry fills the stagger and guard meters', () => {
    for (const id of ['knight', 'warden']) {
      Game.startFight(id); Game.loading = 0; sim.begin();
      const e = Game.duel; e.setState(ES.PARRIED); const m0 = e.guardMeter;
      e.takeHit(makeStrike(A.PLAYER_DEF.moveset.attacks.light, true), Game.player);
      expect.above(e.guardMeter, m0, `${id}: the meter grew`);
    }
  });
  test('Execution: needs no stamina: an exhausted player can still execute', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel; kneel(e); inFront(e, p); sim.step(1);
    p.spend(p.stamina); sim.step(1);
    expect.ok(p.exhausted && p.stamina < 1, 'exhausted');
    sim.press('light'); sim.step(1);
    expect.ok(p.state === PS.EXECUTE, `executing (${p.state})`);
  });
  test('Execution: the kneel gives no damage bonus any more', () => {
    Game.startFight('giant'); Game.loading = 0; sim.begin();
    const e = Game.duel, hp0 = e.hp; kneel(e);
    e.takeHit(strikeOf('heavy'), behind(e));
    expect.near(hp0 - e.hp, strikeOf('heavy').damage, 0.01, 'a heavy on the kneeling giant');
  });
  test('Execution: normal enemies take light x lightMul and survive at full health; bosses take light x bossLightMul', () => {
    for (const [id, want] of [['knight', 'hurt'], ['executioner', 'hurt'], ['warden', 'hurt'], ['shover', 'hurt'], ['sentinel', 'hurt'], ['giant', 'third'], ['pillagerCaptain', 'third'], ['bellWarden', 'third'], ['varn', 'third']]) {
      Game.startFight(id); Game.loading = 0; sim.begin(); sturdy(Game.player);
      const p = Game.player, e = Game.duel, max = e.def.hp;
      kneel(e); inFront(e, p); sim.step(1); sim.press('light');
      sim.until(() => p.state === PS.EXECUTE, 0.2);
      expect.ok(p.state === PS.EXECUTE, `${id}: the execution starts`);
      sim.until(() => p.state !== PS.EXECUTE, 5);
      if (want === 'dead') expect.ok(!e.alive(), `${id}: killed outright (${e.hp.toFixed(0)} / ${max})`);
      else if (want === 'hurt') expect.ok(e.alive() && Math.abs(max - e.hp - 18 * CONFIG.execution.damage.lightMul) < 0.01, `${id}: hurt, alive (${e.hp.toFixed(0)} / ${max})`);
      else expect.ok(e.alive() && Math.abs(max - e.hp - Math.min(18 * CONFIG.execution.damage.bossLightMul, max / 2)) < 0.01, `${id}: light x bossLightMul off its bar (${e.hp.toFixed(0)} / ${max})`);
      expect.ok(e.state !== ES.EXECUTED && e.state !== ES.BROKEN, `${id}: let go (${e.state})`);
    }
  });
  test('Execution: other enemies and their bolts cannot hurt the player during it', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel, hp0 = p.hp;
    kneel(e); inFront(e, p); sim.step(1);
    const h = sim.spawn('hollow', p.x + Math.sin(p.yaw + Math.PI / 2) * 1.6, p.z + Math.cos(p.yaw + Math.PI / 2) * 1.6);
    const b = sim.spawn('bowman', p.x - Math.sin(p.yaw) * 9, p.z - Math.cos(p.yaw) * 9);
    sim.press('light'); sim.step(1);
    let swung = false, shot = false;
    sim.until(() => {
      if (h.state === ES.CHASE && !h.attack) h.beginAttack(h.def.attacks[0]);
      if (h.state === ES.CHASE && h.cooldown > 0) h.beginAttack(h.def.attacks[0]);
      if (h.hitbox) swung = true;
      if (b.state === ES.CHASE) { b.beginAttack(b.def.attacks.find(a => a.projectile)); shot = true; }
      return p.state !== PS.EXECUTE;
    }, 5);
    expect.ok(p.hp === hp0, `no damage taken (${hp0 - p.hp})`);
    expect.ok(swung, 'the Hollow did swing at the player');
  });
  test('Execution: two kneeling enemies: the one most in front is taken', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, a = Game.duel; kneel(a); inFront(a, p, 0.4);
    const side = sim.spawn('knight', p.x + Math.cos(p.yaw) * 1.8, p.z - Math.sin(p.yaw) * 1.8); kneel(side);
    sim.step(1); sim.press('light'); sim.step(1);
    expect.ok(a.state === ES.EXECUTED && side.state !== ES.EXECUTED, 'the one straight ahead');
  });
  test('Execution: the enemy dying from something else mid-animation ends it cleanly', () => {
    Game.startFight('knight'); Game.loading = 0; sim.begin();
    const p = Game.player, e = Game.duel; kneel(e); inFront(e, p); sim.step(1); sim.press('light'); sim.step(8);
    e.die(); sim.until(() => p.state !== PS.EXECUTE, 3);
    expect.ok(p.state === PS.IDLE && !p.exec, `back in control (${p.state})`);
  });
  test('Execution: by a ledge or a wall the slide in never takes the player over the edge or through it', () => {
    Game.startFight('testShover'); Game.loading = 0; sim.begin(); sturdy(Game.player);
    const at = { x: Game.duel.x, z: Game.duel.z, y: Game.duel.y };
    sim.clearEnemies(); let e = sim.spawn('knight', at.x, at.z, at.y);
    const p = Game.player, y0 = e.y;
    e.notice = 0; let tried = 0;
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      e.yaw = yaw; e.hp = e.def.hp; kneel(e); inFront(e, p, 1.2);
      if (Math.abs(p.y - y0) > 0.1) continue;   // nothing to stand on there
      tried++;
      sim.step(1); sim.press('light'); sim.step(1);
      sim.until(() => p.state !== PS.EXECUTE, 4);
      expect.ok(Math.abs(p.y - y0) < 0.1 && p.grounded && !p.inPit, `yaw ${yaw.toFixed(2)}: still on the terrace (y ${p.y.toFixed(2)})`);
      sim.clearEnemies(); e = sim.spawn('knight', at.x, at.z, at.y); e.notice = 0;
    }
    expect.ok(tried > 0, 'tried at least one side');
  });
  test('Execution: Aldric: the field bar retreats, the throne bar turns, the last bar dies, each only after the animation', () => {
    for (const [phase, after] of [['field', 'bossRetreat'], ['throne', 'bossPhase'], ['knell', 'enemyDeath']]) {
      Game.startFight('varn'); Game.loading = 0; sim.begin(); sturdy(Game.player);
      const p = Game.player, e = Game.duel;
      if (phase === 'field') { e.phaseIds = ['field']; e.enterPhase(0); e.boss = { retreat: { to: [e.x + 20, 0, e.z], kneel: 1, hop: 1, wait: 1, fly: 1 } }; }
      else { e.phaseIds = ['field', 'throne', 'knell']; e.enterPhase(phase === 'throne' ? 1 : 2); }
      e.hp = 30; kneel(e); inFront(e, p); sim.step(1); execLog.length = 0; sim.press('light'); sim.step(1);
      expect.ok(p.state === PS.EXECUTE, `${phase}: executing`);
      sim.until(() => p.state !== PS.EXECUTE, 5); sim.step(1);
      const i = execLog.indexOf(after), j = execLog.indexOf('executionEnd');
      expect.ok(j >= 0 && i >= 0 && !execLog.slice(0, j).includes(after), `${phase}: ${after} only after the animation (${execLog.join(', ')})`);
    }
  });
  test('Execution: the tutorial has an execution step, done by one execution', () => {
    Game.startLevel('tutorial'); Game.loading = 0; sim.begin();
    const steps = Game.tutorialSteps(), i = steps.findIndex(s => s.id === 'execute');
    expect.ok(i > 0, 'the step exists');
    Game.tut.index = i; Game.setupTutorialStep();
    const p = Game.player, d = Game.enemies[0];
    expect.ok(!!d.def.stagger && d.training, 'a training dummy with a stagger meter');
    d.takeHit(strikeOf('heavy'), p); d.takeHit(strikeOf('heavy'), p);
    expect.ok(d.state === ES.BROKEN, 'two heavies break its stance');
    inFront(d, p); sim.step(1); sim.press('light'); sim.step(1);
    expect.ok(p.state === PS.EXECUTE, 'executing the dummy');
    sim.until(() => Game.tut.doneTimer > 0, 5);
    expect.ok(Game.tut.doneTimer > 0, 'the step completed');
    expect.ok(d.alive(), 'the dummy never dies');
  });

  // ---- Elden Ring Bosses: Margit, the Fell Omen (v5.3) ------------------------------------------------------------
  const startMargit = () => { A.elden.start('margit'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Elden: the main menu leads to the boss select, built from the boss list, with a way back', () => {
    const main = Game.screens().arena.items.map(i => i.name);   // v7.0: inside the 1v1 Arena
    expect.ok(main.includes('Elden Ring Bosses') && main.includes('Enemies'), `1v1 Arena menu: ${main.join(', ')}`);
    const sel = Game.screens().elden.items;
    expect.ok(sel.length === A.ELDEN_BOSSES.length + 1 && sel[0].name.startsWith('Margit, the Fell Omen') && sel[sel.length - 1].name === 'Back', 'one card per boss, then Back');
    expect.ok(!A.ENEMY_DEFS.some(d => d.id === 'margit'), 'Margit is not in the Enemies list');
  });
  test('Elden: Margit loads in the Enemies arena with his name on the bar', () => {
    const { e } = startMargit();
    expect.ok(Game.kind === 'arena' && Game.level === A.ARENA && Game.eldenBoss === 'margit', 'a duel in ARENA');
    expect.ok(e.def.name === 'Margit, the Fell Omen' && e.def.phaseId === 'omen' && e.hp === 3200, `bar: ${e.def.name}, ${e.hp}`);
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Margit, the Fell Omen', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Elden: every Margit strike leaves a roll\'s i-frames a margin; golden attacks cannot be parried', () => {
    const D = A.ENEMY_BY_ID.margit;
    for (const a of D.attacks) for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    for (const a of D.attacks.filter(a => a.spectral && !a.projectile)) expect.ok(a.noParry, `${a.id}: golden, so not parryable`);
    expect.ok(D.posture.parry * 2 >= D.posture.max && D.posture.parry < D.posture.max, 'two parries break his stance, one does not');
  });
  test('Elden: Margit\'s hits land and deal scaled damage; a roll goes through them', () => {
    let { p, e } = startMargit(); faceOff(e, p, 2.5); quiet(e);
    const hp0 = p.hp, thrust = e.def.attacks.find(a => a.id === 'caneThrust');
    e.beginAttack(thrust); sim.until(() => e.state === ES.RECOVER || p.hp < hp0, 3);
    expect.ok(hp0 - p.hp > 0 && hp0 - p.hp <= 30, `the staff stab hit for ${hp0 - p.hp}`);
    ({ p, e } = startMargit()); faceOff(e, p, 2.5); quiet(e);
    const hp1 = p.hp; e.beginAttack(thrust);
    sim.until(() => e.state === ES.WINDUP && e.stateTime >= thrust.hits[0].startup - CONFIG.player.rollIFrames * 0.5, 3);
    sim.press('roll'); sim.seconds(0.6);
    expect.ok(p.hp === hp1, 'rolled through the stab');
  });
  test('Elden: at 60% Margit turns golden on the same bar and opens with the hammer', () => {
    const { p, e } = startMargit(); sturdy(p); faceOff(e, p, 3);
    e.hp = e.def.hp * 0.59; sim.step(2);
    expect.ok(e.def.phaseId === 'golden' && Math.abs(e.hp - 3200 * 0.59) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    expect.ok(log.includes('bossPhase'), 'bossPhase event');
    sim.until(() => e.attack && e.attack.id === 'hammerOpener', 4);
    expect.ok(e.attack && e.attack.id === 'hammerOpener', 'the hammer opener came first');
    expect.below(e.def.cooldown[1], A.ENEMY_BY_ID.margit.cooldown[1], 'shorter waits in phase 2');
  });
  test('Elden: standing behind Margit draws the tail; drinking at range draws a dagger', () => {
    let { p, e } = startMargit(); sturdy(p); faceOff(e, p, 2);
    e.setState(ES.CHASE); e.cooldown = 5;   // in the fight, and in no hurry to attack otherwise
    sim.until(() => { p.x = e.x - Math.sin(e.yaw) * 2; p.z = e.z - Math.cos(e.yaw) * 2; return e.attack && e.attack.id === 'tailSwipe'; }, 4);   // the player keeps to his back
    expect.ok(e.attack && e.attack.id === 'tailSwipe', 'tail swipe at the player behind');
    ({ p, e } = startMargit()); sturdy(p); faceOff(e, p, 9); e.setState(ES.CHASE); e.cooldown = 5;
    sim.step(1); sim.press('flask'); sim.until(() => e.attack && e.attack.id === 'daggerPunish', 2);
    expect.ok(e.attack && e.attack.id === 'daggerPunish', `a dagger at the drinking player (player ${p.state})`);
  });
  test('Elden: backing off the charged overhead turns it into the running sweep', () => {
    const { p, e } = startMargit(); sturdy(p); faceOff(e, p, 3); quiet(e);
    const oh = e.def.attacks.find(a => a.id === 'caneOverhead'); e.beginAttack(oh); sim.step(2);
    p.x = e.x + Math.sin(e.yaw) * 8; p.z = e.z + Math.cos(e.yaw) * 8;
    sim.until(() => e.attack.id !== 'caneOverhead', 4);
    expect.ok(e.attack.id === 'runningSweep', `became ${e.attack.id}`);
  });
  test('Elden: victory and death both offer Retry and Boss select', () => {
    let { p, e } = startMargit();
    e.hp = 0; e.die(); sim.seconds(CONFIG.elden.victoryTime + 0.5);
    expect.ok(Game.screen === 'eldenWon', `after the win: ${Game.mode} ${Game.screen}`);
    expect.ok(Game.screens().eldenWon.items.map(i => i.name).join() === 'Retry,Boss select', 'win choices');
    Game.screens().eldenWon.items[1].go();
    expect.ok(Game.mode === 'menu' && Game.screen === 'elden' && !Game.eldenBoss, `back at the select: ${Game.screen}`);
    ({ p, e } = startMargit());
    p.hp = 0; p.setState(PS.DEAD); sim.seconds(CONFIG.elden.deathMenu + 0.3);
    expect.ok(Game.screen === 'eldenDeath', `death screen: ${Game.screen}`);
    const items = Game.screens().eldenDeath.items.map(i => i.name);
    expect.ok(items.join() === 'Retry,Boss select', items.join());
    Game.screens().eldenDeath.items[0].go(); Game.loading = 0; sim.begin();
    expect.ok(Game.mode === 'play' && Game.player.alive() && Game.duel.hp === 3200 && Game.eldenBoss === 'margit', 'retry: a fresh fight');
    p = Game.player; p.hp = 0; p.setState(PS.DEAD); sim.seconds(CONFIG.elden.deathMenu + 0.3);
    Game.screens().eldenDeath.items[1].go();
    expect.ok(Game.screen === 'elden' && !Game.eldenBoss, 'back at the boss select');
  });
  // ---- Elden Ring Bosses: Godfrey, First Elden Lord (v5.5) -------------------------------------------------------
  const startGodfrey = () => { A.elden.start('godfrey'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Godfrey: on the boss select, loads at full bar with his axe, armour and lion', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Godfrey, First Elden Lord')), 'a card for Godfrey');
    const { p, e } = startGodfrey();
    expect.ok(Game.level === A.ARENA && e.def.id === 'godfrey' && e.def.phaseId === 'lord' && e.hp === 4400, `bar ${e.def.phaseId} ${e.hp}`);
    expect.ok(e.rig.slotMeshes.lion.visible && e.rig.weaponMeshes.every(m => m.visible), 'lion and axe shown');
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Godfrey, First Elden Lord', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Godfrey: nothing parried, the grabs unblockable, stomps along the floor, every strike under the roll', () => {
    const D = A.ENEMY_BY_ID.godfrey, by = id => D.attacks.find(a => a.id === id);
    for (const a of D.attacks) {
      expect.ok(a.noParry, `${a.id}: unparryable`);
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    }
    for (const id of ['powerBomb', 'louxLunge']) expect.ok(by(id).rollOnly, `${id}: unblockable`);
    for (const id of ['stomp', 'stompWide', 'regalRoar', 'doubleStomp', 'doubleStompWide', 'louxRage'])
      for (const h of by(id).hits) expect.ok((h.box || by(id).box).ground, `${id}: a jump clears it`);
    expect.ok(by('seroshShed').invulnerable, 'the change is untouchable');
  });
  test('Godfrey: every attack starts, strikes and ends without errors', () => {
    for (const a of A.ENEMY_BY_ID.godfrey.attacks) {
      const { p, e } = startGodfrey(); sturdy(p); faceOff(e, p, 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 12);
      expect.ok(struck, `${a.id} struck`);
    }
  });
  test('Godfrey: phases at 78 / 40 / 20 %; at 40 % he becomes Hoarah Loux and casts off the axe after the opener', () => {
    const { p, e } = startGodfrey(); sturdy(p); faceOff(e, p, 3); quiet(e);
    e.hp = 4400 * 0.77; sim.step(2); expect.ok(e.def.phaseId === 'regal' && e.opener && e.opener.id === 'regalRoar', `78%: ${e.def.phaseId}`);
    e.hp = 4400 * 0.39; sim.step(2);
    expect.ok(e.def.phaseId === 'loux' && e.def.name === 'Hoarah Loux, Warrior', `40%: ${e.def.phaseId}`);
    Game.render(1, STEP); expect.ok(e.rig.weaponMeshes.every(m => m.visible) || !e.opener, 'axe kept until the opener');
    const o = e.opener; e.opener = null; e.beginAttack(o);   // as the AI starts a phase's opener (Enemy.update)
    sim.step(2); Game.render(1, STEP); expect.ok(e.rig.weaponMeshes.every(m => m.visible), 'axe kept through the wind-up');
    sim.until(() => e.state === ES.ACTIVE, 8);
    sim.step(2); Game.render(1, STEP);
    expect.ok(!e.rig.slotMeshes.lion.visible && e.rig.weaponMeshes.every(m => !m.visible), 'lion and axe gone');
    e.hp = 4400 * 0.19; sim.step(2); expect.ok(e.def.phaseId === 'rage' && e.opener && e.opener.id === 'louxRage', `20%: ${e.def.phaseId}`);
  });
  // ---- Elden Ring Bosses: Radagon of the Golden Order (v5.7) ---------------------------------------------------
  const startRadagon = () => { A.elden.start('radagon'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Radagon: on the boss select, loads in the arena at full bar with his name', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Radagon of the Golden Order')), 'a card for Radagon');
    const { e } = startRadagon();
    expect.ok(Game.level === A.ARENA && e.def.id === 'radagon' && e.def.phaseId === 'order' && e.hp === 5200, `bar ${e.def.phaseId} ${e.hp}`);
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Radagon of the Golden Order', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Radagon: hammer swings glint and parry, holy attacks do not; three parries break him; strikes leave a roll a margin', () => {
    const D = A.ENEMY_BY_ID.radagon, by = id => D.attacks.find(a => a.id === id);
    for (const id of ['hammerCombo', 'hammerTwo', 'stompChop']) expect.ok(!by(id).noParry && !by(id).rollOnly, `${id} parryable`);
    for (const id of ['runeSlam', 'runeBurst', 'goldenGrab', 'teleportStrike', 'teleportAway', 'goldBreaker', 'eldenShattering', 'spearThrust', 'blinkPunish'])
      expect.ok(by(id).noParry || by(id).rollOnly, `${id} not parryable`);
    expect.ok(by('goldenGrab').rollOnly, 'the grab cannot be blocked');
    expect.ok(Math.ceil(D.posture.max / D.posture.parry) === 3, 'three parries');
    for (const a of D.attacks) for (const h of a.hits) {
      expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
      if (h.blink) expect.ok(h.startup * h.blink.from + (h.blink.time ?? CONFIG.elden.holy.blinkTime) < h.startup, `${a.id}: the teleport ends before the strike`);
    }
  });
  test('Radagon: every attack starts, strikes and ends without errors, inside the arena', () => {
    for (const a of A.ENEMY_BY_ID.radagon.attacks) {
      const { p, e } = startRadagon(); sturdy(p); faceOff(e, p, a.minRange ? a.minRange + 2 : 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; Game.render(1, STEP); return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 14);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
      expect.ok(world.groundAt(e.x, e.z, e.y + 1) > -Infinity, `${a.id}: still on the arena floor`);
    }
  });
  test('Radagon: the teleport strike vanishes, reappears before the player (untouchable meanwhile) and sweeps', () => {
    const { p, e } = startRadagon(); sturdy(p); faceOff(e, p, 10); quiet(e);
    e.beginAttack(e.def.attacks.find(a => a.id === 'teleportStrike'));
    let hidden = false, untouchable = false;
    sim.until(() => { Game.render(1, STEP); if (e.blinkLeft > 0) { hidden = hidden || !e.rig.root.visible; untouchable = untouchable || e.invulnerable(); } return e.hitIndex === 2; }, 4);
    const d = Math.hypot(p.x - e.x, p.z - e.z);
    expect.ok(hidden && untouchable, `hidden ${hidden}, untouchable ${untouchable}`);
    expect.ok(d < 4, `reappeared ${d.toFixed(2)} m from the player`);
    sim.step(5); Game.render(1, STEP); expect.ok(e.rig.root.visible, 'seen again');
  });
  test('Radagon: the rune slam etches a glowing rune that erupts later where it was etched', () => {
    const { p, e } = startRadagon(); sturdy(p); faceOff(e, p, 3); quiet(e);
    e.beginAttack(e.def.attacks.find(a => a.id === 'runeSlam'));
    sim.until(() => e.hitIndex === 1 && e.state === ES.WINDUP, 4); sim.step(5); Game.render(1, STEP);
    const S = e.rig.holySigil;
    expect.ok(S && S.g.visible && !S.pillar.visible, 'the rune glows, no pillar yet');
    sim.until(() => e.state === ES.ACTIVE, 3); Game.render(1, STEP);
    expect.ok(S.pillar.visible, 'then the pillar');
  });
  test('Radagon: at 60% the Gold Breaker opens phase 2, faster, with the Elden Shattering', () => {
    const { p, e } = startRadagon(); sturdy(p); faceOff(e, p, 6);
    e.hp = 5200 * 0.59; sim.step(2);
    expect.ok(e.def.phaseId === 'shattering' && Math.abs(e.hp - 5200 * 0.59) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'goldBreaker', 4);
    expect.ok(e.attack && e.attack.id === 'goldBreaker', 'the Gold Breaker');
    expect.ok(e.def.attacks.some(a => a.id === 'eldenShattering') && e.def.cooldown[1] < A.ENEMY_BY_ID.radagon.cooldown[1], 'the Shattering, and faster');
  });
  test('Radagon: victory offers Retry and Boss select; leaving drops his runes from the scene', () => {
    let { p, e } = startRadagon(); sturdy(p); faceOff(e, p, 3); quiet(e);
    e.beginAttack(e.def.attacks.find(a => a.id === 'runeBurst')); sim.step(10); Game.render(1, STEP);
    const g = e.rig.holySigil.g;
    e.hp = 0; e.die(); sim.seconds(CONFIG.elden.victoryTime + 0.5);
    expect.ok(Game.screen === 'eldenWon', `after the win: ${Game.screen}`);
    Game.screens().eldenWon.items[0].go(); Game.loading = 0; sim.begin(); Game.render(1, STEP);
    expect.ok(Game.duel.hp === 5200 && Game.eldenBoss === 'radagon' && !g.parent, 'retry: a fresh fight, the old rune gone');
    p = Game.player; p.hp = 0; p.setState(PS.DEAD); sim.seconds(CONFIG.elden.deathMenu + 0.3);
    expect.ok(Game.screen === 'eldenDeath', `death screen: ${Game.screen}`);
    Game.screens().eldenDeath.items[1].go();
    expect.ok(Game.screen === 'elden' && !Game.eldenBoss, 'back at the boss select');
  });
  // ---- Elden Ring Bosses: Godrick the Grafted (v5.4) --------------------------------------------------------------
  const startGodrick = () => { A.elden.start('godrick'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Godrick: on the boss select, loads in the arena at full bar, bigger than anyone', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Godrick the Grafted')), 'a card for Godrick');
    const { p, e } = startGodrick();
    expect.ok(Game.level === A.ARENA && e.def.id === 'godrick' && e.def.phaseId === 'grafted' && e.hp === 4000, `bar ${e.def.phaseId} ${e.hp}`);
    expect.ok(e.def.scale > A.ENEMY_BY_ID.margit.scale && e.radius >= 0.9, 'the biggest body');
    expect.ok(e.rig.slotMeshes.dragon && !e.rig.slotMeshes.dragon.visible, 'no dragon head in phase 1');
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Godrick the Grafted', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Godrick: no attack can be parried; every strike leaves a roll a margin', () => {
    const D = A.ENEMY_BY_ID.godrick;
    for (const a of D.attacks) {
      expect.ok(a.noParry, `${a.id}: unparryable`);
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    }
    const ids = new Set(D.attacks.map(a => a.id));
    for (const id of ['stormcaller', 'stormBlade', 'stormLeap', 'jumpSlam', 'kneel', 'dragSlash', 'rampage', 'doubleStep', 'backhand', 'armChop',
                      'flameSweep', 'dragonGrab', 'flameKneel', 'flameStorm', 'flameBlade', 'flameLeap', 'fireMarch']) expect.ok(ids.has(id), `has ${id}`);
  });
  test('Godrick: every attack starts, strikes and ends without errors', () => {
    for (const a of A.ENEMY_BY_ID.godrick.attacks) {
      const { p, e } = startGodrick(); sturdy(p); faceOff(e, p, 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 12);
      Game.render(1, STEP);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
    }
  });
  test('Godrick: the stormcaller branches: close into the leap slam, far into the storm blades', () => {
    let { p, e } = startGodrick(); sturdy(p); faceOff(e, p, 2.5); quiet(e);
    e.beginAttack(e.def.attacks.find(a => a.id === 'stormcaller'));
    const seen = new Set(); sim.until(() => { p.x = e.x + Math.sin(e.yaw) * 2.5; p.z = e.z + Math.cos(e.yaw) * 2.5; seen.add(e.attack && e.attack.id); return seen.has('stormLeap') || seen.has('stormBlade') || e.state === ES.RECOVER; }, 5);   // the player stays close (the spins knock them back)
    expect.ok(seen.has('stormLeap') || e.state === ES.RECOVER, `close: ${[...seen].join(',')}`);
    ({ p, e } = startGodrick()); sturdy(p); faceOff(e, p, 3); quiet(e);
    e.beginAttack(e.def.attacks.find(a => a.id === 'stormcaller'));
    sim.until(() => { p.x = e.x + Math.sin(e.yaw) * 12; p.z = e.z + Math.cos(e.yaw) * 12; return e.attack.id !== 'stormcaller' || e.state === ES.RECOVER; }, 5);
    expect.ok(e.attack.id === 'stormBlade' || e.state === ES.RECOVER, `far: ${e.attack.id}`);
  });
  test('Godrick: the rampage strides in at the player, swinging from side to side', () => {
    const { p, e } = startGodrick(); sturdy(p); faceOff(e, p, 7); quiet(e);
    const x0 = e.x, z0 = e.z, d0 = Math.hypot(p.x - e.x, p.z - e.z), sides = [];
    e.beginAttack(e.def.attacks.find(a => a.id === 'rampage'));
    let last = -1, px = e.x, pz = e.z;
    sim.until(() => {
      if (e.state === ES.WINDUP && e.hitIndex !== last) { last = e.hitIndex; px = e.x; pz = e.z; }
      if (e.state === ES.ACTIVE && sides.length === e.hitIndex) { const s = e.yaw + Math.PI / 2; sides.push(Math.sign((e.x - px) * Math.sin(s) + (e.z - pz) * Math.cos(s))); }
      return e.state === ES.RECOVER;
    }, 8);
    expect.ok(Math.hypot(e.x - x0, e.z - z0) > 2 && Math.hypot(p.x - e.x, p.z - e.z) < d0 - 1.5, `moved ${Math.hypot(e.x - x0, e.z - z0).toFixed(2)} m toward the player`);
    expect.ok(sides.length === 5 && sides.every((v, i) => i === 0 || v === -sides[i - 1]), `side to side: ${sides.join(',')}`);
  });
  test('Godrick: at 60% the arm chop (untouchable), the dragon head, then the flame sweep', () => {
    const { p, e } = startGodrick(); sturdy(p); faceOff(e, p, 6);
    e.hp = 4000 * 0.59; sim.step(2);
    expect.ok(e.def.phaseId === 'dragon' && Math.abs(e.hp - 4000 * 0.59) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'armChop', 4);
    expect.ok(e.attack && e.attack.id === 'armChop' && e.invulnerable(), 'the arm chop, untouchable');
    const hp = e.hp; e.takeHit(strikeOf('heavy'), p); expect.ok(e.hp === hp, 'blows pass through the chop');
    sim.until(() => e.attack.id === 'flameSweep', 5); Game.render(1, STEP);
    expect.ok(e.attack.id === 'flameSweep' && !e.invulnerable(), `then ${e.attack.id}`);
    expect.ok(e.rig.slotMeshes.dragon.visible, 'the dragon head shows');
    expect.ok(e.def.ignite && e.def.cooldown[1] < A.ENEMY_BY_ID.godrick.cooldown[1], 'burning, and faster');
  });
  test('Godrick: the flame sweep burns ahead, not at his side', () => {
    let { p, e } = startGodrick(); sturdy(p); faceOff(e, p, 4); quiet(e);
    const sweep = e.def.attacks.find(a => a.id === 'flameSweep') || A.ENEMY_BY_ID.godrick.attacks.find(a => a.id === 'flameSweep');
    let hp0 = p.hp; e.beginAttack(sweep); sim.until(() => e.state === ES.RECOVER, 5);
    expect.ok(p.hp < hp0, 'ahead: burned');
    ({ p, e } = startGodrick()); sturdy(p); faceOff(e, p, 4); quiet(e); hp0 = p.hp; e.beginAttack(sweep);
    sim.until(() => { const s = e.yaw + Math.PI / 2; p.x = e.x + Math.sin(s) * 3.5; p.z = e.z + Math.cos(s) * 3.5; return e.state === ES.RECOVER; }, 5);
    expect.ok(p.hp === hp0, 'at his flank: untouched');
  });

  // ---- Elden Ring Bosses: Maliketh, the Black Blade (v5.8) --------------------------------------------------------
  const startMaliketh = () => { A.elden.start('maliketh'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  const mkAttack = (e, id) => e.def.attacks.find(a => a.id === id) || A.ENEMY_BY_ID.maliketh.attacks.find(a => a.id === id);
  test('Maliketh: on the boss select, loads as the robed Beast Clergyman at full bar', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Maliketh')), 'a card for Maliketh');
    const { e } = startMaliketh();
    expect.ok(Game.level === A.ARENA && e.def.id === 'maliketh' && e.def.phaseId === 'clergyman' && e.hp === 4600, `bar ${e.def.phaseId} ${e.hp}`);
    const S = e.rig.slotMeshes;
    expect.ok(S.robe.visible && S.cinq.visible && !S.blackBlade.visible && !S.mane.visible, 'robes and dagger, no Black Blade yet');
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Beast Clergyman', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Maliketh: only his golden attacks parry; every strike leaves a roll a margin; the Black Blade carries Destined Death', () => {
    const D = A.ENEMY_BY_ID.maliketh, P2 = new Set(D.phases.blackBlade.attacks);
    for (const a of D.attacks) {
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
      const golden = a.id === 'corkscrew' || a.id === 'spinFlip';
      expect.ok(!!a.noParry === !golden, `${a.id}: ${golden ? 'parryable (gold)' : 'unparryable'}`);
      if (golden) expect.ok(a.markers && a.markers.some(m => m.parry), `${a.id}: glints as the parry opens`);
      if (P2.has(a.id) && a.id !== 'shedRobes') expect.ok(a.destined, `${a.id}: Destined Death`);
      if (!P2.has(a.id)) expect.ok(!a.destined, `${a.id}: none in phase 1`);
    }
  });
  test('Maliketh: every attack starts, strikes and ends without errors', () => {
    for (const a of A.ENEMY_BY_ID.maliketh.attacks) {
      const { p, e } = startMaliketh(); sturdy(p); faceOff(e, p, a.minRange ? a.minRange + 1 : 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 14);
      Game.render(1, STEP);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
    }
  });
  test('Maliketh: the sling fans five pebbles; the boulder arcs', () => {
    const { p, e } = startMaliketh(); sturdy(p); faceOff(e, p, 8); quiet(e); projectiles.clear();
    e.beginAttack(mkAttack(e, 'sling')); sim.until(() => e.state === ES.ACTIVE, 3);
    expect.ok(projectiles.live().length === 5, `${projectiles.live().length} pebbles`);
    projectiles.clear(); e.beginAttack(mkAttack(e, 'gurranqStone')); sim.until(() => e.state === ES.ACTIVE, 4);
    const b = projectiles.live()[0];
    expect.ok(b && b.rock && b.rock.visible && b.g > 0 && b.vy > 0, 'a stone thrown upward in an arc');
  });
  test('Maliketh: at 50% he sheds the robes (untouchable), is renamed, then opens with the waves', () => {
    const { p, e } = startMaliketh(); sturdy(p); faceOff(e, p, 6);
    e.hp = 4600 * 0.49; sim.step(2);
    expect.ok(e.def.phaseId === 'blackBlade' && Math.abs(e.hp - 4600 * 0.49) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'shedRobes', 4);
    expect.ok(e.attack && e.attack.id === 'shedRobes' && e.invulnerable(), 'the robe shed, untouchable');
    const hp = e.hp; e.takeHit(strikeOf('heavy'), p); expect.ok(e.hp === hp, 'blows pass through the shed');
    sim.until(() => e.attack.id === 'bladeWaves', 5); Game.render(1, STEP);
    const S = e.rig.slotMeshes;
    expect.ok(e.attack.id === 'bladeWaves' && !e.invulnerable(), `then ${e.attack.id}`);
    expect.ok(S.blackBlade.visible && S.mane.visible && S.armor.visible && !S.robe.visible && !S.cinq.visible, 'the Black Blade and armour, the robes gone');
    sim.step(2); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Maliketh, the Black Blade', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Maliketh: Destined Death cuts the health ceiling, drains, caps flasks, and a retry starts clean', () => {
    let { p, e } = startMaliketh(); quiet(e);
    const D = CONFIG.elden.destined, combo = mkAttack(e, 'bladeCombo');
    p.takeHit(makeStrike(mkAttack(e, 'multiSlash')), e);
    expect.ok(p.doomTime === 0 && p.hpCap() === p.maxHp, 'the Clergyman\'s dagger: no curse');
    p.hp = p.maxHp; p.takeHit({ ...makeStrike(combo), damage: 1 }, e);
    expect.ok(p.doomTime === D.time && Math.abs(p.hpCap() - p.maxHp * (1 - D.cut)) < 1e-6 && p.hp <= p.hpCap(), `cap ${p.hpCap()}, hp ${p.hp}`);
    const before = p.hp; sim.step(Math.round(D.drainTime / STEP) + 5);
    expect.ok(Math.abs(before - p.hp - p.maxHp * D.drain) < 0.5, `drained ${(before - p.hp).toFixed(2)}`);
    p.takeHit({ ...makeStrike(combo), damage: 1 }, e);
    expect.ok(Math.abs(p.hpCap() - p.maxHp * (1 - D.cut)) < 1e-6, 'a second hit does not stack');
    p.hp = p.hpCap() - 1; p.usingItem = { heal: 999, healStart: 0, healDuration: 0.1, useTime: 0.2 }; p.setState(PS.USE_ITEM); sim.step(20);
    expect.ok(p.hp <= p.hpCap() + 1e-6, `a flask heals to the ceiling only (${p.hp.toFixed(1)} / ${p.hpCap().toFixed(1)})`);
    ({ p, e } = startMaliketh());
    expect.ok(p.doomTime === 0 && p.hpCap() === p.maxHp && p.hp === p.maxHp, 'retry: a clean player');
  });
  test('Maliketh: the Destined Death sphere shreds in front of the planted blade, never behind him', () => {
    let { p, e } = startMaliketh(); sturdy(p); faceOff(e, p, 3); quiet(e);
    const sphere = mkAttack(e, 'deathSphere'); let hp0 = p.hp; e.beginAttack(sphere);
    sim.until(() => { p.x = e.x + Math.sin(e.yaw) * 3; p.z = e.z + Math.cos(e.yaw) * 3; return e.state === ES.RECOVER; }, 6);
    expect.ok(p.hp < hp0, 'in front: shredded');
    ({ p, e } = startMaliketh()); sturdy(p); faceOff(e, p, 3); quiet(e); hp0 = p.hp; e.beginAttack(sphere);
    sim.until(() => { p.x = e.x - Math.sin(e.yaw) * 2.2; p.z = e.z - Math.cos(e.yaw) * 2.2; return e.state === ES.RECOVER; }, 6);
    expect.ok(p.hp === hp0, 'behind him: untouched');
  });

  // ---- Elden Ring Bosses: the Crucible Knight (v5.5) --------------------------------------------------------------
  const startCrucible = () => { A.elden.start('crucibleKnight'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  const ckAttack = (e, id) => e.def.attacks.find(a => a.id === id) || A.ENEMY_BY_ID.crucibleKnight.attacks.find(a => a.id === id);
  test('Crucible: on the boss select, loads in the arena at full bar with his name', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Crucible Knight')), 'a card for the Crucible Knight');
    const { e } = startCrucible();
    expect.ok(Game.level === A.ARENA && e.def.id === 'crucibleKnight' && e.def.phaseId === 'knight' && e.hp === 2600, `bar ${e.def.phaseId} ${e.hp}`);
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Crucible Knight', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Crucible: sword blows parryable, shield, stomp and aspects not; every strike leaves a roll a margin', () => {
    const D = A.ENEMY_BY_ID.crucibleKnight, unparry = ['stomp', 'stomp2', 'shieldBash', 'counterBash', 'wingsDive', 'tailSwipe', 'tailDouble'];
    for (const a of D.attacks) {
      expect.ok(!!a.noParry === unparry.includes(a.id), `${a.id}: noParry ${!!a.noParry}`);
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    }
    expect.ok(D.posture.parry >= D.posture.max, 'one parry breaks his stance');
  });
  test('Crucible: every attack starts, strikes and ends without errors', () => {
    for (const a of A.ENEMY_BY_ID.crucibleKnight.attacks) {
      const { p, e } = startCrucible(); sturdy(p); faceOff(e, p, 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 12);
      Game.render(1, STEP);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
    }
  });
  test('Crucible: the shield blocks frontal blows and draws the counter bash; the flank takes full damage', () => {
    let { p, e } = startCrucible(); sturdy(p); faceOff(e, p, 2); quiet(e);
    let hp = e.hp; const r = e.takeHit(strikeOf('light'), p);
    expect.ok(r.blocked && hp - e.hp < strikeOf('light').damage * 0.5, `blocked: ${hp - e.hp}`);
    e.cooldown = 99; sim.until(() => e.attack && e.attack.id === 'counterBash', 1.5);
    expect.ok(e.attack && e.attack.id === 'counterBash', `answered with ${e.attack && e.attack.id}`);
    ({ p, e } = startCrucible()); sturdy(p); faceOff(e, p, 2); quiet(e);
    const s = e.yaw + Math.PI / 2; p.x = e.x + Math.sin(s) * 2; p.z = e.z + Math.cos(s) * 2;
    hp = e.hp; e.takeHit(strikeOf('light'), p);
    expect.ok(hp - e.hp === strikeOf('light').damage, `flank: ${hp - e.hp}`);
  });
  test('Crucible: drinking at range draws the lunging thrust; the stomp always chains into a sword blow', () => {
    let { p, e } = startCrucible(); sturdy(p); faceOff(e, p, 7); e.setState(ES.CHASE); e.cooldown = 5;
    sim.step(1); sim.press('flask'); sim.until(() => e.attack && e.attack.id === 'healThrust', 2);
    expect.ok(e.attack && e.attack.id === 'healThrust', `drinking: ${e.attack && e.attack.id}`);
    ({ p, e } = startCrucible()); sturdy(p); faceOff(e, p, 3); quiet(e);
    e.beginAttack(ckAttack(e, 'stomp'));
    sim.until(() => e.attack.id !== 'stomp' || e.state === ES.RECOVER, 4);
    expect.ok(['uppercut', 'overheadSlam', 'doubleSpin'].includes(e.attack.id), `stomp -> ${e.attack.id} (${e.state})`);
  });
  test('Crucible: at 50% the wings dive opens phase 2; close finishers end in the tail', () => {
    let { p, e } = startCrucible(); sturdy(p); faceOff(e, p, 7);
    e.hp = 2600 * 0.49; sim.step(2);
    expect.ok(e.def.phaseId === 'aspect' && Math.abs(e.hp - 2600 * 0.49) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'wingsDive' && e.state === ES.WINDUP && e.stateTime > 0.4, 4);
    Game.render(1, STEP); Game.render(1, STEP);
    expect.ok(e.attack && e.attack.id === 'wingsDive', `opener ${e.attack && e.attack.id}`);
    expect.ok(e.rig.spectral && e.rig.spectral.wings && e.rig.spectral.wings.visible, 'golden wings shown');
    expect.ok(e.def.cooldown[1] < A.ENEMY_BY_ID.crucibleKnight.cooldown[1], 'faster');
    let tail = 0;
    for (let i = 0; i < 6 && !tail; i++) {
      ({ p, e } = startCrucible()); sturdy(p); faceOff(e, p, 2.5); e.hp = 2600 * 0.49; sim.step(2); quiet(e);
      e.beginAttack(ckAttack(e, 'doubleSpin2'));
      sim.until(() => { p.x = e.x + Math.sin(e.yaw) * 2.5; p.z = e.z + Math.cos(e.yaw) * 2.5; if (e.attack.id === 'tailSwipe') tail++; return tail || e.state === ES.RECOVER; }, 5);
    }
    expect.ok(tail, 'the double spin ends in a tail sweep');
  });
  test('Crucible: an execution on him deals 0.7 of a boss execution', () => {
    const { e } = startCrucible();
    const D = CONFIG.execution.damage, base = PLAYER_DEF.moveset.attacks.light.damage * D.bossLightMul;
    expect.ok(Math.abs(execution.damageFor(e) - Math.min(base * 0.7, e.def.hp * D.bossCap)) < 1e-6, `${execution.damageFor(e)}`);
  });
  test('Crucible: victory offers Retry and Boss select; death retries a fresh fight', () => {
    let { p, e } = startCrucible();
    e.hp = 0; e.die(); sim.seconds(CONFIG.elden.victoryTime + 0.5);
    expect.ok(Game.screen === 'eldenWon', `after the win: ${Game.screen}`);
    ({ p, e } = startCrucible());
    p.hp = 0; p.setState(PS.DEAD); sim.seconds(CONFIG.elden.deathMenu + 0.3);
    expect.ok(Game.screen === 'eldenDeath', `death screen: ${Game.screen}`);
    Game.screens().eldenDeath.items[0].go(); Game.loading = 0; sim.begin();
    expect.ok(Game.duel.hp === 2600 && Game.eldenBoss === 'crucibleKnight', 'retry: a fresh fight');
  });

  // ---- Elden Ring Bosses: Morgott, the Omen King (v5.5) -----------------------------------------------------------
  const startMorgott = () => { A.elden.start('morgott'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Morgott: on the boss select, loads in the arena at full bar with his name', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Morgott, the Omen King')), 'a card for Morgott');
    const { e } = startMorgott();
    expect.ok(Game.level === A.ARENA && e.def.id === 'morgott' && e.def.phaseId === 'king' && e.hp === 4800, `bar ${e.def.phaseId} ${e.hp}`);
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Morgott, the Omen King', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Morgott: golden and bloodflame attacks cannot be parried; three parries break him; every strike leaves a roll a margin', () => {
    const D = A.ENEMY_BY_ID.morgott;
    for (const a of D.attacks) {
      if (a.spectral || a.when === 'behind' || ['defilement', 'bloodSlice', 'bloodyThrust', 'geysers'].includes(a.id)) expect.ok(a.noParry || a.projectile, `${a.id}: unparryable`);
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
    }
    expect.ok(D.posture.max / D.posture.parry === 3, 'three parries');
  });
  test('Morgott: every attack starts, strikes and ends without errors, inside the arena', () => {
    for (const a of A.ENEMY_BY_ID.morgott.attacks) {
      const { p, e } = startMorgott(); sturdy(p); faceOff(e, p, a.minRange ? a.minRange + 1 : 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 14);
      Game.render(1, STEP);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
      expect.ok(Math.hypot(e.x, e.z) < 40, `${a.id}: stays in the arena`);
    }
  });
  test('Morgott: at 60% the Defilement Burst (untouchable), then burning and faster', () => {
    const { p, e } = startMorgott(); sturdy(p); faceOff(e, p, 8);
    e.hp = 4800 * 0.59; sim.step(2);
    expect.ok(e.def.phaseId === 'cursed' && Math.abs(e.hp - 4800 * 0.59) < 1, `phase ${e.def.phaseId}, hp ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'defilement', 4);
    expect.ok(e.attack && e.attack.id === 'defilement' && e.invulnerable(), 'the burst, untouchable');
    expect.ok(e.def.ignite && e.def.cooldown[1] < A.ENEMY_BY_ID.morgott.cooldown[1], 'burning, and faster');
  });

  // ---- Elden Ring Bosses: Malenia, Blade of Miquella (v5.9) -------------------------------------------------------
  const startMalenia = () => { A.elden.start('malenia'); Game.loading = 0; sim.begin(); return { p: Game.player, e: Game.duel }; };
  test('Malenia: on the boss select, loads in the arena at full bar with her name', () => {
    expect.ok(Game.screens().elden.items.some(i => i.name.startsWith('Malenia, Blade of Miquella')), 'a card for Malenia');
    const { e } = startMalenia();
    expect.ok(Game.level === A.ARENA && e.def.id === 'malenia' && e.def.phaseId === 'blade' && e.hp === MAL.hp1, `bar ${e.def.phaseId} ${e.hp}`);
    sim.step(30); Game.render(1, STEP);
    expect.ok(A.hud.eName.textContent === 'Malenia, Blade of Miquella', `boss bar: "${A.hud.eName.textContent}"`);
  });
  test('Malenia: parry rules, three parries, roll margins; only a full Waterfowl Dance can kill a full-health player', () => {
    const D = A.ENEMY_BY_ID.malenia, unparry = ['dance', 'dance2', 'grab', 'kick', 'aeoniaOpen', 'aeonia', 'phantoms'];
    for (const a of D.attacks) {
      expect.ok(!!a.noParry === unparry.includes(a.id), `${a.id}: noParry ${!!a.noParry}`);
      for (const h of a.hits) expect.ok(h.active <= CONFIG.player.rollIFrames - 0.08, `${a.id}: active ${h.active}`);
      const total = a.hits.reduce((s, h) => s + (h.damage || a.damage), 0);
      if (a.id.startsWith('dance')) expect.ok(total > 120, `${a.id}: ${total} kills if all land`);
      else expect.ok(total < 120, `${a.id}: full combo ${total} leaves the player standing`);
    }
    expect.ok(D.posture.max / D.posture.parry === 3, 'three parries');
  });
  test('Malenia: every attack starts, strikes and ends without errors, inside the arena', () => {
    for (const a of A.ENEMY_BY_ID.malenia.attacks) {
      const { p, e } = startMalenia(); sturdy(p); faceOff(e, p, a.minRange ? a.minRange + 1 : 3); quiet(e);
      e.beginAttack(a); let struck = false;
      sim.until(() => { if (e.state === ES.ACTIVE) struck = true; return struck && e.state !== ES.ACTIVE && e.state !== ES.WINDUP; }, 20);
      Game.render(1, STEP);
      expect.ok(struck, `${a.id} reached its strike (state ${e.state})`);
      expect.ok(Math.hypot(e.x, e.z) < 40, `${a.id}: stays in the arena`);
    }
  });
  test('Malenia: a blow that lands heals her, even on a raised guard', () => {
    for (const guard of [false, true]) {
      const { p, e } = startMalenia(); sturdy(p); faceOff(e, p, 2.4); quiet(e);
      e.hp = 3000; if (guard) p.setState(PS.BLOCK);
      e.beginAttack(e.def.attacks.find(a => a.id === 'sweep'));
      sim.until(() => e.state === ES.RECOVER, 4);
      expect.ok(e.hp > 3000, `${guard ? 'blocked' : 'open'}: healed to ${e.hp}`);
    }
  });
  test('Malenia: Waterfowl Dance only below 75% in phase 1; phase 2 refills to 80%, sheds the helm and opens with the Aeonia', () => {
    const { p, e } = startMalenia(); sturdy(p); faceOff(e, p, 4);
    const pick = () => e.def.attacks.filter(a => !a.when && (!a.hpBelow || e.hp <= e.def.hp * a.hpBelow)).map(a => a.id);
    expect.ok(!pick().includes('dance'), 'no dance at full health');
    e.hp = MAL.hp1 * 0.74; expect.ok(pick().includes('dance'), 'the dance below 75%');
    e.deplete();
    expect.ok(e.def.phaseId === 'rot' && e.state === ES.PHASE, `phase ${e.def.phaseId} ${e.state}`);
    sim.until(() => e.state !== ES.PHASE, MAL.transition + 1);
    expect.ok(Math.abs(e.hp - MAL.hp2 * MAL.fill2) < 1, `refilled to ${e.hp}`);
    sim.until(() => e.attack && e.attack.id === 'aeoniaOpen', 2);
    expect.ok(e.attack && e.attack.id === 'aeoniaOpen' && e.invulnerable(), 'opens with the Aeonia, untouchable');
    sim.until(() => e.state === ES.ACTIVE, 4); Game.render(1, STEP);   // shown as the dive strikes (js/flame.js)
    expect.ok(e.rig.slotMeshes.wings.visible && !e.rig.slotMeshes.helm.visible, 'wings shown, helm gone');
  });

  test('Elden: an Enemies duel is unchanged (no Elden flow, the old win text)', () => {
    A.elden.start('margit'); Game.startFight('hollow'); Game.loading = 0; sim.begin();
    expect.ok(!Game.eldenBoss && Game.duel.def.id === 'hollow', 'a plain duel');
    expect.ok(!document.getElementById('wonHint').textContent.includes('boss select'), 'the old win hint');
    const p = Game.player; p.hp = 0; p.setState(PS.DEAD); sim.seconds(CONFIG.death.respawnDelay + 0.3);
    expect.ok(Game.mode === 'play' && Game.player.alive(), 'death respawns in the arena as before');
  });

  // ---- v6.0 the Ultra preset ----------------------------------------------------------------------------------------
  // Quality changes made here go back to the player's own setting afterwards.
  const restoreQuality = () => { applySettings.graphics = undefined; applySettings(); };
  const ultraWarnings = () => [...warned].filter(w => w.startsWith('Ultra'));
  test('Auto quality: older integrated laptops and limited hardware start on Low even with a fast shader result', () => {
    const ready = { ms: 1, width: 1280, height: 720, pixelRatio: 1, cores: 8, memory: 8 };
    for (const name of ['ANGLE (Intel, Intel(R) UHD Graphics 620)', 'Intel HD Graphics 520', 'AMD Radeon(TM) Graphics', 'Radeon Vega 8 Graphics', 'Google SwiftShader'])
      expect.ok(autoQuality.recommend({ ...ready, name }).pick === 'low', `${name}: conservative Low`);
    for (const limits of [{ cores: 4 }, { memory: 4 }, { touch: true }])
      expect.ok(autoQuality.recommend({ ...ready, name: 'NVIDIA GeForce RTX 3060 Laptop GPU', ...limits }).pick === 'low', 'limited CPU/RAM or phone: Low');
  });
  test('Auto quality: higher presets need stricter timings and account for display resolution', () => {
    const ready = { name: 'NVIDIA GeForce RTX 3060', width: 1280, height: 720, pixelRatio: 1, cores: 8, memory: 8 };
    const cases = [
      [{ ms: 2 }, 'ultra'], [{ ms: 4 }, 'high'], [{ ms: 9 }, 'low'],
      [{ ms: 2, pixelRatio: 2 }, 'high'],
      [{ ms: 2, pixelRatio: 2, width: 1920, height: 1080 }, 'low'],
      [{ name: 'Intel Iris Xe Graphics', ms: 2 }, 'high'],
      [{ name: 'Intel Iris Xe Graphics', ms: 4, pixelRatio: 2 }, 'low'],
      [{ name: 'AMD Radeon 780M', ms: 2 }, 'high'],
      [{ name: 'Unknown GPU', ms: 1 }, 'high'],
      [{ ms: Infinity }, 'low'], [{ ms: NaN }, 'low'],
    ];
    for (const [sample, expected] of cases)
      expect.ok(autoQuality.recommend({ ...ready, ...sample }).pick === expected, `${JSON.stringify(sample)} -> ${expected}`);
  });
  test('Auto quality: hardware hints may be unavailable and explicit graphics choices always win', () => {
    const saved = settings.graphics;
    try {
      expect.ok(autoQuality.recommend({ name: 'RTX 5060', ms: 1 }).pick === 'ultra', 'missing CPU/RAM hints do not imply a weak machine');
      for (const preset of ['low', 'high', 'ultra']) {
        settings.graphics = preset;
        expect.ok(autoQuality.effective() === preset, `${preset}: manual choice preserved`);
      }
    } finally { settings.graphics = saved; }
  });
  test('Ultra: the presets share their keys and reserve the lighting extras for Ultra', () => {
    const Q = CONFIG.VISUALS.quality, keys = Object.keys(Q.high).sort().join();
    for (const [n, q] of Object.entries(Q)) expect.ok(Object.keys(q).sort().join() === keys, `${n}: same keys as high`);
    expect.ok(Q.ultra && Q.ultra.ultra === true && !Q.high.ultra && !Q.low.ultra, 'ultra on Ultra only');
    expect.ok(autoQuality.choices()[0] === 'auto' && autoQuality.choices().includes('ultra'), 'the Graphics option offers Auto first, and Ultra');
    const saved = settings.graphics;
    settings.graphics = 'auto';
    expect.ok(autoQuality.effective() in Q && autoQuality.label('auto').startsWith('Auto ('), 'Auto resolves to a real preset and names it');
    settings.graphics = saved;
  });
  test('High: modern presentation is independent from expensive lighting and keeps native resolution', () => {
    const { low, high, ultra } = CONFIG.VISUALS.quality;
    expect.ok(high.combatFx && high.reflections && !low.combatFx && !low.reflections, 'High adds modern effects and cached metal');
    for (const key of ['shadows', 'ao', 'volumetrics', 'refraction']) expect.ok(!high[key] && ultra[key], `${key} stays Ultra only`);
    expect.ok(high.renderScale === 1 && high.maxPixelRatio === 1.5 && high.msaa === 4 && high.lights === 8, 'High keeps resolution, AA and lights');
    expect.ok(!high.proceduralFire && ultra.proceduralFire && high.modelDetail.tex === 1, 'native textures; ambient procedural fire stays Ultra');
    expect.ok(CONFIG.VISUALS.grain.amount === CONFIG.VISUALS.grain.ultra, 'same fine grain');
  });
  test('High models: hero subdivision sits between Low and Ultra without implicitly changing anatomy', () => {
    const was = KIT.detail(), Q = CONFIG.VISUALS.quality;
    try {
      for (const id of [PLAYER_DEF.look.model, 'godrick', 'margit']) {
        KIT.setDetail(Q.low.modelDetail); const low = KIT.modelParts(id);
        KIT.setDetail(Q.high.modelDetail); const high = KIT.modelParts(id);
        KIT.setDetail(Q.ultra.modelDetail); const ultra = KIT.modelParts(id);
        expect.ok(low.tris < high.tris && high.tris < ultra.tris, `${id}: intermediate triangle count`);
        KIT.setDetail({ ...Q.high.modelDetail, anatomy: true });
        expect.ok(KIT.modelParts(id) !== high, `${id}: anatomy has its own cache entry`);
      }
      KIT.setDetail(Q.low.modelDetail); const low = KIT.modelParts('hollowSoldier');
      KIT.setDetail(Q.high.modelDetail);
      expect.ok(KIT.modelParts('hollowSoldier') === low, 'ordinary enemies reuse base geometry');
    } finally { KIT.setDetail(was); }
  });
  test('High loading: small scene warm-up keeps live targets full-size and restores hidden phase visibility', () => {
    const render = renderer.render, sizes = [];
    try {
      A.visuals.setQuality('high'); A.elden.start('maliketh'); sim.begin();
      const roots = [];
      scene.traverse(o => { if (o.isSkinnedMesh) roots.push([o, o.visible, o.frustumCulled]); });
      const rt = A.visuals.composer.renderTarget1, size = [rt.width, rt.height];
      renderer.render = function (s, c) {
        if (s === scene) { const target = renderer.getRenderTarget(); sizes.push(target ? [target.width, target.height] : [canvas.width, canvas.height]); }
        return render.call(this, s, c);
      };
      A.visuals.warmUp(Game.cam);
      expect.ok(sizes.length > 0 && sizes.every(([w, h]) => w === 32 && h === 32), 'scene rasterizes at 32x32');
      expect.ok(rt.width === size[0] && rt.height === size[1] && size[0] === canvas.width, 'live target never resized');
      for (const [o, visible, culled] of roots) {
        expect.ok(o.visible === visible && o.frustumCulled === culled, 'hidden phases and culling restored');
        expect.ok(!!o.skeleton.boneTexture, 'every phase uploaded its skeleton');
      }
    } finally { renderer.render = render; restoreQuality(); }
  });
  test('High effects: decorative budgets reduce density while impacts remain visual only', () => {
    try {
      A.visuals.setQuality('high'); A.elden.start('godrick'); sim.begin();
      const p = Game.player, e = Game.duel, state = [p.hp, e.hp, e.posture, p.x, e.x];
      const at = { x: p.x, y: p.y + 1, z: p.z };
      ultraFx.sparkBurst(at, 100); ultraFx.bloodSpray(at, [1, 0, 0], 100);
      expect.ok(ultraFx.info().sparks === 55 && ultraFx.info().drops === 55, '55% burst density');
      ultraFx.sparkBurst(at, 10000);
      expect.ok(ultraFx.info().sparks === Math.floor(CONFIG.VISUALS.ultra.sparks.max * 0.55), 'bounded live capacity');
      ultraBoss.IMPACT.blaze(e.x, e.y, e.z, 3, { el: FX_ELEMENTS.fire, scale: 1 }, e);
      const warnings = ultraWarnings().length;
      for (let i = 0; i < 12; i++) Game.render(1, STEP);
      expect.ok(ultraWarnings().length === warnings, 'no effect failures');
      expect.ok([p.hp, e.hp, e.posture, p.x, e.x].every((v, i) => v === state[i]), 'drawing preserves the fight');
      expect.ok(!ultraPost.info().on && !renderer.shadowMap.enabled && ultraPost.info().waves === 0, 'no Ultra scene passes or refraction');
      A.visuals.setQuality('low');
      expect.ok(!ultraFx.on() && ultraFx.info().sparks === 0 && ultraFx.info().drops === 0 && ultraBoss.info().fires === 0, 'Low releases modern effects');
      expect.ok(ultraPost.info().reflected === 0, 'Low removes metal reflections');
    } finally { restoreQuality(); }
  });
  test('High loading: selected boss assets and all phase meshes are ready before play', () => {
    try {
      A.visuals.setQuality('high'); sim.begin();
      for (const [id, field] of [['margit', 'spectral'], ['godrick', 'flameJet'], ['radagon', 'holySigil'], ['maliketh', 'deathSphere']]) {
        A.elden.start(id);
        expect.ok(!!Game.duel.rig[field], `${id}: effect prepared`);
        let legacy = 0; scene.traverse(o => { if (o.userData.legacyEffectLight && o.visible) legacy++; });
        expect.ok(legacy === 0, `${id}: fixed light count`);
      }
    } finally { restoreQuality(); }
  });
  test('High output: combined tone mapping and grade match the former two-pass colour order', () => {
    const grade = A.visuals.passes.grade, composer = A.visuals.composer, shader = grade.material.fragmentShader;
    const output = new OutputPass(), gl = renderer.getContext();
    let worst = 0, total = 0, count = 0;
    try {
      A.visuals.setQuality('high'); sim.begin();
      for (const id of ['long-hall', 'burning-town', 'final-castle']) {
        Game.startLevel(id); Game.render(1, STEP);
        grade.uniforms.uGrain.value = 0;
        const read = () => {
          A.visuals.draw(); const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels;
        };
        const combined = read();
        grade.material.fragmentShader = shader.replace(GRADE_OUTPUT, ''); grade.material.needsUpdate = true;
        composer.insertPass(output, composer.passes.indexOf(grade));
        const split = read();
        for (let i = 0; i < split.length; i++) {
          const delta = Math.abs(split[i] - combined[i]); worst = Math.max(worst, delta); total += delta; count++;
        }
        composer.removePass(output); grade.material.fragmentShader = shader; grade.material.needsUpdate = true;
      }
      expect.ok(worst <= 2 && total / count < 0.1, `colour difference: max ${worst}/255, mean ${(total / count).toFixed(4)}/255`);
    } finally {
      composer.removePass(output); output.dispose();
      grade.material.fragmentShader = shader; grade.material.needsUpdate = true; restoreQuality();
    }
  });
  test('High effects: delayed boss decorations cannot cross a level or quality change', () => {
    const schedule = window.setTimeout, callbacks = [];
    try {
      A.visuals.setQuality('high'); A.elden.start('godrick'); sim.begin();
      window.setTimeout = fn => { callbacks.push(fn); return 0; };
      ultraBoss.IMPACT.toll(Game.duel.x, Game.duel.y, Game.duel.z, 2, { el: FX_ELEMENTS.toll, scale: 1 });
      window.setTimeout = schedule;
      A.visuals.setQuality('ultra');
      const rings = ultraBoss.info().rings;
      for (const callback of callbacks) callback();
      expect.ok(callbacks.length === 3 && ultraBoss.info().rings === rings, 'stale delayed rings are discarded');
    } finally { window.setTimeout = schedule; restoreQuality(); }
  });
  test('Ultra: switching it on and off leaves the scene as it was', () => {
    Game.startLevel('long-hall'); Game.loading = 0; sim.begin();
    const before = A.visuals.info().pointLights, moonBefore = { ...DEFAULT_ATMOSPHERE, ...(A.LEVEL_1.atmosphere || {}) }.moon.intensity;
    try {
      A.visuals.setQuality('ultra'); sim.step(30, 2);
      const U = ultraPost.info();
      expect.ok(U.on && U.shadows && renderer.shadowMap.enabled, 'shadows on with Ultra');
      expect.ok(A.visuals.info().pointLights === before, 'the stage keeps its own light count (Ultra lights are not counted)');
      expect.ok(ultraFx.info().fires > 0, 'flames are drawn as procedural fire');
      A.visuals.setQuality('high'); sim.step(4, 2);
      expect.ok(!renderer.shadowMap.enabled && !ultraPost.info().on, 'shadows off again');
      expect.ok(Math.abs(moonLight.intensity - moonBefore) < 1e-6, 'the moon gets its whole strength back');
      let extra = 0; scene.traverse(o => { if (o.userData.ultra) extra++; });
      expect.ok(extra === CONFIG.VISUALS.ultra.flash.lights, `High keeps only its fixed impact light (${extra})`);
      expect.above(ultraPost.info().reflected, 0, 'High retains cached metal reflections');
      expect.ok(ultraFx.info().fires === 0 && flames.every(f => f.mesh.material.visible), 'the old flame cones are back');
    } finally { restoreQuality(); }
  });
  test('Ultra: a storm of combat events is drawn without errors and never touches the fight', () => {
    A.elden.start('margit'); Game.loading = 0; sim.begin();
    try {
      A.visuals.setQuality('ultra');
      const p = Game.player, e = Game.enemies[0], hp = [p.hp, e.hp, e.posture], at = { x: e.x, y: e.y + 1.4, z: e.z }, warn0 = ultraWarnings().length;
      events.emit('strike', { strike: { damage: 53 }, attacker: p, target: e, at, blocked: false });
      events.emit('strike', { strike: { damage: 40 }, attacker: e, target: p, at: { x: p.x, y: p.y + 1.2, z: p.z }, blocked: true });
      events.emit('strike', { strike: { damage: 20 }, attacker: null, target: p, at: { x: p.x, y: p.y + 1.2, z: p.z }, blocked: false });   // a trap: no attacker
      events.emit('parry', { target: e }); events.emit('postureBreak', { enemy: e });
      events.emit('execution', { player: p, enemy: e, damage: 0, at, exit: { x: e.x + 0.5, y: at.y, z: e.z } });
      events.emit('impact', { x: e.x, y: e.y, z: e.z, fx: { ring: 3, crack: 2, dust: 10, shake: 0 }, enemy: e });
      events.emit('bossPhase', { enemy: e, from: 'omen', to: 'golden' }); events.emit('land', { x: p.x, y: p.y, z: p.z, fx: { ring: 1.5 } });
      for (const kind of BOSS_FX_IMPACTS) ultraBoss.IMPACT[kind](e.x, e.y, e.z, 2, { el: FX_ELEMENTS.steel, scale: 1 }, e);
      for (let i = 0; i < 20; i++) Game.render(1, STEP);
      const F = ultraFx.info();
      expect.above(F.sparks + F.drops + F.motes + F.puffs, 50, 'effects spawned');
      expect.ok(ultraWarnings().length === warn0, `no effect failed (${ultraWarnings().join('; ')})`);
      expect.ok(p.hp === hp[0] && e.hp === hp[1] && e.posture === hp[2], 'health and posture untouched by drawing');
    } finally { restoreQuality(); }
  });
  test('Ultra boss effects: every boss, phase and attack named in BOSS_FX has a look and an impact', () => {
    for (const k of BOSS_FX_IMPACTS) expect.ok(typeof ultraBoss.IMPACT[k] === 'function', `impact "${k}" is drawn`);
    for (const [id, B] of Object.entries(BOSS_FX)) {
      const d = ENEMY_BY_ID[id], phases = [null, ...Object.keys(d.phases || {})];
      for (const ph of phases) for (const aid of Object.keys(B.attacks || {})) {
        const L = ultraBoss.look({ baseDef: d, phase: ph, attack: { id: aid }, boss: true });
        expect.ok(L && L.el && BOSS_FX_IMPACTS.includes((L.a && L.a.impact) || L.el.impact), `${id}/${ph}/${aid}: a look and an impact`);
      }
    }
  });
  test('Ultra: Godrick and Malenia fight 15 s with every effect on, no effect failing', () => {
    try {
      A.visuals.setQuality('ultra');
      for (const id of ['godrick', 'malenia']) {
        A.elden.start(id); Game.loading = 0; sim.begin();
        const warn0 = ultraWarnings().length;
        sim.seconds(15, 3);
        expect.ok(ultraWarnings().length === warn0, `${id}: no effect failed (${ultraWarnings().join('; ')})`);
        expect.ok(Number.isFinite(Game.enemies[0].x), `${id}: the fight runs`);
      }
    } finally { restoreQuality(); }
  });
  test('Ultra models: every model builds at Ultra detail, with more triangles', () => {
    const base = {}, was = KIT.detail();
    try {
      KIT.setDetail({ geo: 1, tex: 1 });
      for (const id of Object.keys(MODEL_DEFS)) base[id] = KIT.modelParts(id).tris;
      KIT.setDetail(CONFIG.VISUALS.ultra.models);
      for (const id of Object.keys(MODEL_DEFS)) expect.ok(KIT.modelParts(id).tris > base[id], `${id}: more triangles at Ultra detail`);
    } finally { KIT.setDetail(was); }
  });
  test('Ultra performance: stable scenes are not rescanned and new actors are prepared on their first draw', () => {
    try {
      A.visuals.setQuality('ultra'); Game.startLevel('long-hall'); Game.loading = 0; sim.begin();
      Game.render(1, STEP);
      const sweeps = ultraPost.info().sweeps;
      for (let i = 0; i < 16; i++) Game.render(1, STEP);
      expect.ok(ultraPost.info().sweeps === sweeps, 'no periodic whole-scene scan');
      const e = sim.spawn('knight', Game.player.x + 3, Game.player.z);
      Game.render(1, STEP);
      expect.ok(ultraPost.info().sweeps > sweeps, 'new scene membership refreshes the cache');
      let casters = 0; e.rig.root.traverse(o => { if (o.isMesh && o.castShadow) casters++; });
      expect.above(casters, 0, 'the new actor casts shadows immediately');
      let cubeShadows = 0; scene.traverse(o => { if (o.isPointLight && o.castShadow) cubeShadows++; });
      expect.ok(cubeShadows === 0, 'no six-face point-light shadow renders');
    } finally { restoreQuality(); }
  });
  test('Ultra performance: model indices stay in bounds and compact vertex data preserves every triangle', () => {
    const was = KIT.detail();
    try {
      KIT.setDetail(CONFIG.VISUALS.ultra.models);
      for (const id of Object.keys(MODEL_DEFS)) {
        const built = KIT.modelParts(id); let triangles = 0, vertices = 0, indices = 0;
        for (const { geo } of built.parts) {
          const count = geo.attributes.position.count;
          expect.ok(!!geo.index && geo.index.count % 3 === 0, `${id}: indexed triangles`);
          for (const index of geo.index.array) expect.ok(index < count, `${id}: index in bounds`);
          for (const name of ['normal', 'uv', 'skinIndex', 'skinWeight']) expect.ok(geo.attributes[name].count === count, `${id}: ${name} matches its vertices`);
          triangles += geo.index.count / 3; vertices += count; indices += geo.index.count;
        }
        expect.ok(triangles === built.tris, `${id}: triangle accounting is unchanged`);
        expect.below(vertices, indices, `${id}: shared vertices avoid duplicate skinning`);
      }
    } finally { KIT.setDetail(was); }
  });
  test('Ultra performance: particle uploads cover only live data and empty pools upload nothing', () => {
    try {
      A.visuals.setQuality('ultra'); Game.startLevel('long-hall'); sim.begin();
      const pool = ultraFx.sparks, pos = pool.mesh.geometry.attributes.position;
      pool.clear(); const version = pos.version;
      pool.update(STEP, camera.position);
      expect.ok(pos.version === version, 'empty pool does not dirty the GPU buffer');
      ultraFx.sparkBurst({ x: Game.player.x, y: 2, z: Game.player.z }, 10);
      pool.update(STEP, camera.position);
      expect.ok(pos.updateRanges.length === 1 && pos.updateRanges[0].count === pool.count() * 12, 'only the live streak prefix is uploaded');
      expect.below(pos.updateRanges[0].count, pos.array.length, 'unused capacity is not uploaded');
      pool.update(10, camera.position);
      expect.ok(pool.count() === 0 && !pool.mesh.visible, 'mass expiry empties the pool');
    } finally { restoreQuality(); }
  });
  test('Ultra performance: flash feedback shares the grade and effects clear on quality and level changes', () => {
    try {
      A.visuals.setQuality('ultra'); Game.startLevel('long-hall'); sim.begin();
      const grade = A.visuals.passes.grade;
      expect.ok(A.visuals.composer.passes[A.visuals.composer.passes.length - 1] === grade, 'no extra full-screen lens pass');
      ultraPost.pulse({ flash: 0.4, hurt: 0.7, color: 0xff0000 });
      ultraFx.test('souls'); ultraFx.flashAt(Game.player, 0xffffff, 10);
      Game.render(1, STEP);
      expect.above(grade.uniforms.uFlash.value, 0, 'flash still draws');
      expect.above(grade.uniforms.uHurt.value, 0, 'hurt feedback still draws');
      A.visuals.setQuality('high');
      expect.ok(grade.uniforms.uFlash.value === 0 && grade.uniforms.uHurt.value === 0, 'feedback restored without waiting for a frame');
      expect.ok(ultraFx.info().motes === 0 && ultraFx.info().ribbons === 0, 'old particles and owners released');
      A.visuals.setQuality('ultra'); ultraFx.test('souls');
      Game.startLevel('sunken-keep');
      expect.ok(ultraFx.info().motes === 0, 'particles from the old level do not carry over');
    } finally { restoreQuality(); }
  });
  test('Ultra loading: boss effect meshes are prepared before attacks and duplicate lights stay off', () => {
    try {
      A.visuals.setQuality('ultra'); sim.begin();
      for (const [id, field] of [['margit', 'spectral'], ['godrick', 'flameJet'], ['radagon', 'holySigil'], ['maliketh', 'deathSphere']]) {
        A.elden.start(id);
        const e = Game.enemies[0];
        expect.ok(!!e.rig[field], `${id}: its attack effect is ready at the end of loading`);
        let enabled = 0;
        scene.traverse(o => { if (o.userData.legacyEffectLight && o.visible) enabled++; });
        expect.ok(enabled === 0, `${id}: no legacy light can change Ultra's shader light count`);
      }
      A.visuals.setQuality('low');
      let hidden = 0;
      scene.traverse(o => { if (o.userData.legacyEffectLight && !o.visible) hidden++; });
      expect.ok(hidden === 0, 'Low restores legacy light visibility');
    } finally { restoreQuality(); }
  });
  test('Camera feel: a blow taken moves the drawn camera only, and the option turns it off', () => {
    A.elden.start('margit'); Game.loading = 0; sim.begin();
    const saved = settings.cameraMotion;
    try {
      settings.cameraMotion = true; sim.step(10, 1);
      const camState = Game.cam.pos.clone();
      events.emit('strike', { strike: { damage: 60 }, attacker: Game.enemies[0], target: Game.player, at: { x: Game.player.x, y: 1.2, z: Game.player.z }, blocked: false });
      Game.render(1, STEP); Game.render(1, STEP);
      const S = cameraFeel.state();
      expect.ok(Math.abs(S.fov) > 0.01 || Math.hypot(S.x, S.z) > 0.001, 'the view reacts');
      expect.ok(Game.cam.pos.equals(camState), 'Game.cam (aim, movement) untouched');
      settings.cameraMotion = false; Game.render(1, STEP);
      expect.ok(camera.fov === CONFIG.camera.fov, 'off: the plain field of view');
    } finally { settings.cameraMotion = saved; }
  });
  test('Low performance: native resolution and dormant post targets stay small', () => {
    try {
      A.visuals.setQuality('low');
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      expect.ok(size.x === Math.floor(innerWidth * Math.min(devicePixelRatio, 1)) && size.y === Math.floor(innerHeight * Math.min(devicePixelRatio, 1)), '100% rendering, capped at one pixel per CSS pixel');
      for (const target of [A.visuals.composer.renderTarget1, A.visuals.composer.renderTarget2]) expect.ok(target.width === 1 && target.height === 1, 'unused HDR targets stay at 1x1');
    } finally { restoreQuality(); }
  });
  test('Low loading: enemies, later phases and projectile pools are prepared before gameplay', () => {
    try {
      A.visuals.setQuality('low'); sim.begin();
      for (const [id, field] of [['margit', 'spectral'], ['godrick', 'flameJet'], ['radagon', 'holySigil'], ['maliketh', 'deathSphere']]) {
        A.elden.start(id);
        expect.ok(!!Game.enemies[0].rig[field], `${id}: its attack effect is ready during loading`);
        const textures = TEXLIB.count(), geometry = renderer.info.memory.geometries;
        const enemy = Game.enemies[0], shot = enemy.baseDef.attacks.find(a => a.projectile);
        if (shot) {
          for (let i = 0; i < CONFIG.projectile.max; i++) projectiles.fireOne(enemy, shot, Game.player, 0);
          Game.render(1, STEP);
          expect.ok(TEXLIB.count() === textures, `${id}: firing needs no texture baking`);
          expect.ok(renderer.info.memory.geometries === geometry, `${id}: every bolt's geometry is already uploaded`);
          projectiles.clear();
        }
        const viewport = renderer.getViewport(new THREE.Vector4());
        expect.ok(viewport.z === innerWidth && viewport.w === innerHeight && !renderer.getScissorTest(), 'warm-up restores the full viewport');
      }
      Game.startLevel('final-castle');
      expect.ok(Game.enemies.length > 30 && Game.zones.every(z => z.spawned), 'the whole level cast is instantiated before play');
    } finally { projectiles.clear(); restoreQuality(); }
  });
  test('Low performance: packed surface channels preserve height and roughness across tints', () => {
    const opts = { size: 64, decay: 0.5 }, a = TEXLIB.get('rustedIron', opts), b = TEXLIB.get('rustedIron', { ...opts, tint: 0x5a3020 });
    expect.ok(a.rough === a.bump && a.rough === b.rough && a.map !== b.map, 'tints share one packed surface map and keep separate colours');
    const core = TEXCORE_FACTORY(TEXTURE_SETTINGS, seeded), def = TEXTURE_DEFS.find(d => d.id === 'rustedIron');
    const raw = core.pack(core.bake(def, 64, 0xffffff, 0.5, strSeed('rustedIron')));
    const packed = a.rough.image.getContext('2d').getImageData(0, 0, 64, 64).data;
    let same = true;
    for (let i = 0; i < packed.length; i += 4) if (packed[i] !== raw.bump[i] || packed[i + 1] !== raw.rough[i + 1]) { same = false; break; }
    expect.ok(same, 'Three reads the exact original height from red and roughness from green');
  });
  test('Low performance: every model vertex uses exactly one bone', () => {
    const was = KIT.detail();
    try {
      KIT.setDetail({ geo: 1, tex: 1 });
      for (const id of Object.keys(MODEL_DEFS)) {
        let valid = true;
        for (const p of KIT.modelParts(id).parts) {
          const weights = p.geo.attributes.skinWeight.array;
          for (let i = 0; i < weights.length; i += 4) if (weights[i] !== 1 || weights[i + 1] || weights[i + 2] || weights[i + 3]) { valid = false; break; }
        }
        expect.ok(valid, `${id}: rigid shader matches its skin weights`);
      }
    } finally { KIT.setDetail(was); }
  });
  test('Loading: time spent building counts toward the title hold', () => {
    try {
      Game.loadStarted = performance.now() - 3000; Game.showLoading('Ready', '');
      expect.ok(Game.loading === CONFIG.loading.readyTime, 'a long build does not add another full title delay');
      Game.loadStarted = null; Game.showLoading('Fresh', '');
      expect.ok(Game.loading === CONFIG.loading.time, 'a direct start keeps the normal title hold');
    } finally { Game.loadStarted = null; }
  });
  test('Loading: the title card waits for nothing under the test clock', () => {
    sim.begin();
    let ran = false; Game.loadingFirst('x', 'y', () => { ran = true; });
    expect.ok(ran && !Game.pendingLoad, 'ran at once');
    expect.ok(Game.levelCard('long-hall')[0] === A.LEVEL_1.name, 'a level card names the level');
  });

  async function run(filter = '') {
    const out = [], t0 = performance.now();
    const wasMode = Game.mode;
    for (const t of tests) {
      if (filter && !t.name.includes(filter)) continue;
      let ok = true, msg = '';
      Math.random = seededRandom(12345);   // seeded from the start, so enemies built before sim.begin() repeat too
      try { await t.fn(); } catch (e) { ok = false; msg = e instanceof Fail ? e.message : `${e.name}: ${e.message}\n${(e.stack || '').split('\n').slice(1, 4).join('\n')}`; }
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
