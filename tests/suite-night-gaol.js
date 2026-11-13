'use strict';
// ============================================================================
// Level 9: the Night Gaol, the Ringer of Thrale and the Keyless (v7.42.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Night Gaol')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('night-gaol'); Game.loading = 0; sim.begin(); };
  const ringer = () => Game.enemies.find(e => e.baseDef.id === 'ringer');
  test('Night Gaol: Level 9 follows Saltgrave, as chapter 9 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_9) - 1].id === 'saltgrave', 'listed after Saltgrave');
    expect.ok(A.STORY.chapters[8].level === 'night-gaol' && A.STORY.chapters[8].title === 'THE NIGHT GAOL', 'chapter 9 of the Story');
    expect.ok(A.LEVEL_8.next === 'night-gaol', 'the Levels menu carries on from Saltgrave too');
  });
  test('Night Gaol: the Ringer fights with her own moves, each with its own wind-up, every knell fair to jump (pass 42)', () => {
    const d = A.ENEMY_BY_ID.ringer, ids = new Set(d.attacks.map(a => a.id)), P = CONFIG.player;
    for (const a of d.attacks) for (const h of a.hits) {
      const B = h.box || a.box, R = B.ring;
      if (!R) { expect.ok(h.active <= 0.2, `${a.id}: active ${h.active}`); continue; }
      // A knell runs out slowly enough to see, lives as long as it spreads, and its band passes a body inside a roll's
      // i-frames (and far inside a jump's airtime).
      const speed = (R.to - R.from) / R.time, pass = (R.width + 0.8) / speed;
      expect.ok(Math.abs(h.active - R.time) < 1e-6 && B.ground, `${a.id}: the ring is along the floor and lives as long as it spreads`);
      expect.ok(pass <= P.rollIFrames - 0.08 && speed <= 16, `${a.id}: its band passes in ${pass.toFixed(2)} s at ${speed.toFixed(1)} m/s`);
    }
    for (const Ph of Object.values(d.phases)) for (const id of Ph.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    expect.ok(d.attacks.every(a => !a.spectral && a.pose && a.pose.startsWith('ringer')) && !d.guard && !d.offhand, 'no borrowed moves: every pose is hers');
    // A wind-up reads by the arms and legs: no two of her moves share one, but a move's own second-phase form (same name).
    const tell = a => JSON.stringify(['armR', 'elbowR', 'weapon', 'armL', 'elbowL', 'spin', 'legL', 'legR'].map(b => ATTACK_POSES[a.pose].hits[0].windup[b]));
    const seen = new Map();
    for (const a of d.attacks) { const t = tell(a), other = seen.get(t); expect.ok(!other || other.name === a.name, `${a.id} and ${other && other.id} share a wind-up`); seen.set(t, a); }
    expect.ok(d.phases.chained.tether === 8.5 && !('tether' in d.phases.tolling), 'held to her circle, then free of it');
    expect.ok(d.phases.tolling.at === 0.5 && d.phases.tolling.opener === 'overTheLine', 'at half her strength she steps over the line');
    const by = id => d.attacks.find(a => a.id === id);
    expect.ok(by('callAcross').range > 16 && by('callAcross').minRange > 0 && by('callAcross').rollOnly, 'she calls across the ring to anyone who stands off');
    expect.ok(by('nineTailors').hits.length === 4 && by('nineTailors').hits[3].box.ring.to > by('nineTailors').hits[0].box.ring.to, 'three knells, then a wider one');
    const S = A.LEVEL_9.gated.find(z => z.id === 'zone-ringer').enemies[0].spawn;
    expect.ok(S.x === 166 && S.z === 66, 'she stands at the centre of the great ring');
  });
  test('Night Gaol: the Ringer keeps to her circle until half her strength, then crosses it (pass 42)', () => {
    start();
    const e = ringer(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-ringer'), off = () => Math.hypot(e.x - e.home.x, e.z - e.home.z);
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }
    sim.place(e.home.x - 14, e.home.z + 14, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.();
    let far = 0;
    for (let i = 0; i < 80; i++) { e.cooldown = 9; sim.seconds(0.1); far = Math.max(far, off()); p.hp = p.maxHp; }   // walking only
    expect.ok(far > 7 && far <= 8.5 + 1e-6, `she comes to the edge of her circle and no further (${far.toFixed(2)} m)`);
    e.vx = -40; e.vz = 5; sim.seconds(0.3);
    expect.ok(off() <= 8.5 + 1e-6, `a shove does not put her over the line (${off().toFixed(2)} m)`);
    e.hp = e.def.hp * 0.45; sim.seconds(0.1);
    expect.ok(e.def.phaseId === 'tolling' && !e.def.tether, `past half she is over the line (${e.def.phaseId})`);
    const t = sim.until(() => { p.hp = p.maxHp; return off() > 9.5; }, 15);
    expect.ok(t >= 0, `then she follows you out of the circle (${off().toFixed(2)} m)`);
  });
  test('Night Gaol: her circle is drawn on the floor and breaks when she crosses it; a knell is drawn where it hits (pass 42)', () => {
    start();
    const e = ringer(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-ringer');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }
    sim.seconds(2, 1);
    let T = tethers.of(e);
    expect.ok(T && T.visible && T.held && T.r === 8.5 && T.k === 1, `the circle shows round her (${JSON.stringify(T)})`);
    sim.place(e.home.x - 12, e.home.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.();
    e.yaw = -Math.PI / 2; e.beginAttack(e.attackById('callAcross'));
    expect.ok(sim.until(() => e.state === ES.ACTIVE && !!e.hitbox, 4) >= 0, 'she calls across');
    sim.seconds(0.5, 1);
    const R = e.hitbox.box.ring, r = R.from + (R.to - R.from) * Math.min(1, e.stateTime / R.time), W = ringWaves.live().find(w => w.live);
    expect.ok(W && Math.abs(W.r - r) < 1e-6 && Math.abs(W.w - R.width / 2) < 1e-6, `the knell is drawn at its hitbox (${W && W.r.toFixed(2)} vs ${r.toFixed(2)} m)`);
    e.hp = e.def.hp * 0.45; sim.seconds(0.1, 1);
    T = tethers.of(e);
    expect.ok(T && !T.held && T.visible, 'the circle breaks as she steps over it');
    sim.seconds(2, 1); p.hp = p.maxHp;
    expect.ok(!tethers.of(e).visible, 'and is gone');
  });
  test('Night Gaol: the Keyless walk the cells, and nothing of the old road is left in the gaol', () => {
    const ids = new Set([...A.LEVEL_9.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...A.LEVEL_9.dispersed.map(s => s.enemy)]);
    for (const old of ['crucibleSquire', 'omenkin', 'graftedScion', 'crucibleKnight']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('keyless') && ids.has('ringer'), 'the Keyless and the Ringer');
    expect.ok(!/Crucible|Evergaol|Great Rune|Seren|Golden Order|Stormhill/.test(JSON.stringify(A.LEVEL_9)), 'no names of the old road');
    const K = A.ENEMY_BY_ID.keyless, H = A.ENEMY_BY_ID.hollow;
    expect.ok(K.speed < H.speed && K.poise > H.poise, 'slower in their chains, harder to stagger');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'keyless').length >= 6, 'Keyless in the cells');
  });
  test('Night Gaol: killing the Ringer opens the great ring and finishes the level', () => {
    start();
    const e = ringer(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-ringer');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the cells, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.45; sim.step(0.5);
    expect.ok(e.def.phaseId === 'tolling', `past half she is over the line (${e.def.phaseId})`);
    for (let i = 0; i < 4 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE, 20); }
    sim.until(() => Game.complete, 4);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, 'gate open, level complete');
  });
  test('Night Gaol: Level 9 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['night-gaol'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'night-landing' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_9);
    for (const I of L.inscriptions) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id} stands on the floor`);
  });
})();
