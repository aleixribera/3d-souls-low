'use strict';
// ============================================================================
// Level 14: the Still Mere, the King's Blade and the Drowned (v7.51.0)
// ============================================================================
// Loaded after tests/suite.js (only with #dev); registered on the same runner: `await __arena.tests.run('Still Mere')`.
(function () {
  const A = window.__arena, { Game, ES } = A, { sim, expect, test } = A.tests;
  const start = () => { Game.startLevel('still-mere'); Game.loading = 0; sim.begin(); };
  const blade = () => Game.enemies.find(e => e.baseDef.id === 'kingsBlade');
  const OLD = /Malenia|Miquella|Haligtree|Elphael|Scarlet|Rot\b|Cleanrot|Omenkin|Zealot|Beast|Scion|Seren|Lands|Grace|Ashen Warrior/i;
  test('Still Mere: Level 14 follows the Root of the Ember, as chapter 14 of the Story', () => {
    expect.ok(A.LEVELS[A.LEVELS.indexOf(A.LEVEL_14) - 1].id === 'ember-root', 'listed after the Root of the Ember');
    expect.ok(A.STORY.chapters[13].level === 'still-mere' && A.STORY.chapters[13].title === 'THE STILL MERE', 'chapter 14 of the Story');
    expect.ok(A.LEVEL_13.next === 'still-mere', 'the Levels menu carries on from the Root of the Ember too');
  });
  test('Still Mere: the King\'s Blade waits behind its shield and answers, within the boss rules', () => {
    const d = A.ENEMY_BY_ID.kingsBlade, ids = new Set(d.attacks.map(a => a.id));
    for (const a of d.attacks) for (const h of a.hits) expect.ok(h.active <= 0.2 || (h.box || a.box).ring, `${a.id}: active ${h.active}`);
    for (const Ph of Object.values(d.phases)) for (const id of Ph.attacks) expect.ok(ids.has(id), `phase move ${id} exists`);
    for (const a of d.attacks) for (const f of a.followUps || []) expect.ok(ids.has(f.attack), `${a.id} follows up into ${f.attack}`);
    for (const a of d.attacks) expect.ok(a.pose && a.pose.startsWith('kb') && ATTACK_POSES[a.pose], `${a.id}: its own key poses (${a.pose})`);
    const by = id => d.attacks.find(a => a.id === id);
    expect.ok(!d.attacks.some(a => A.PLAYER_DEF.moveset.attacks[a.id]), 'none of the player\'s moves any more');
    const oath = by('oathGuard').hits[0];
    expect.ok(oath.counter && oath.counter.answer === 'theAnswer' && by('theAnswer').chance === 0 && d.phases.blade.attacks.includes('oathGuard'), 'the Oath Guard turns a blow and answers it');
    expect.ok(by('corvel').hits[0].falter && by('corvel').hits[0].falter.hits === 3 && d.phases.emberWorn.attacks.includes('corvel'), 'Corvel Burns falters under three blows');
    expect.ok(d.attacks.some(a => a.when === 'healing') && d.attacks.some(a => a.when === 'behind') && d.attacks.some(a => a.when === 'flank') && d.guard, 'it punishes a drink, a back and its shield side');
    const E = d.phases.emberWorn;
    expect.ok(E.at === 0.5 && E.opener === 'torchTaken' && E.ignite && E.guard === null && E.name === 'The King\'s Blade, Ember-Worn', 'past half the hunger takes the torch, and the guard is gone');
    expect.ok(d.brokenPose && d.brokenPose.kneel === 1, 'every break is the refusal: knelt');
    expect.ok(d.hp === 3000, 'its health is kept');
    expect.ok(BOSS_FX.kingsBlade && BOSS_FX.kingsBlade.phases.emberWorn === 'fire', 'its effects are written, fire once the Ember shows');
    expect.ok(!OLD.test(JSON.stringify(d.attacks.map(a => a.name)) + d.name + d.description), 'no names of the old road');
    expect.ok(MODEL_DEFS.kingsBlade.parts.length > 30 && MODEL_DEFS.kingsBlade.parts.every(p => p.use === 'baked'), 'its own Blender figure');
    for (const a of d.attacks) for (const h of a.hits) if ((h.box || a.box) === by('shieldWall').box) expect.ok(h.tell === 'shield', `${a.id}: a shield blow is told on the shield`);
    expect.ok(MODEL_DEFS.kingsBlade.shieldTell && ['rimStrike', 'shieldBurns'].every(id => by(id).hits[0].tell === 'shield'), 'its shield blows are told on the shield');
  });
  test('Still Mere: the Oath Guard answers a blow to its front, breaks to a heavy, and Corvel Burns falters', () => {
    start();
    const e = blade(), p = Game.player;
    for (const z of Game.zones) if (z.id !== 'zone-blade') { z.gate.open = true; z.beaten = true; }
    sim.place(e.x - 2.4, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.2);
    const blow = id => ({ damage: 20, knock: 1, poise: 10, postureDmg: 4, attackId: id, hitstop: 0.05 });
    const stance = id => { e.yaw = Math.atan2(p.x - e.x, p.z - e.z); e.beginAttack(e.attackById(id)); e.stateTime = 0.5; e.posture = 0; };
    stance('oathGuard');
    let hp = e.hp, r = e.takeHit(blow('light'), p);
    expect.ok(r.blocked && e.hp === hp && e.attack.id === 'theAnswer' && e.state === ES.WINDUP, `a light blow is turned and answered (${e.attack && e.attack.id})`);
    stance('oathGuard'); hp = e.hp; r = e.takeHit(blow('heavy'), p);
    expect.ok(r.broke && e.state === ES.BROKEN && e.hp < hp, `a heavy breaks the stance, and lands (${e.state})`);
    sim.seconds(0.6, 6);
    const W = new THREE.Vector3(); e.rig.weapon.getWorldDirection(W);
    expect.ok(W.y < -0.75, `broken, it kneels with the sword planted point down (${W.y.toFixed(2)})`);
    e.setState(ES.CHASE); stance('oathGuard'); hp = e.hp; r = e.takeHit(blow('heavy'), p);
    expect.ok(!r.broke && !r.blocked && e.hp < hp && e.state === ES.WINDUP, `just up from a break, a heavy only lands: a break is a moment, not a loop (${e.state})`);
    e.sinceBreak = Infinity; stance('oathGuard'); hp = e.hp;
    r = e.takeHit(blow('light'), { x: e.x - Math.sin(e.yaw) * 2, z: e.z - Math.cos(e.yaw) * 2 });
    expect.ok(!r.blocked && e.hp < hp && e.attack.id === 'oathGuard', 'from behind, the blow lands');
    stance('corvel');
    for (let i = 0; i < 2; i++) e.takeHit(blow('light'), p);
    expect.ok(e.state === ES.WINDUP && e.attack.id === 'corvel', 'two blows: the torch still rises');
    r = e.takeHit(blow('light'), p);
    expect.ok(r.broke && e.state === ES.BROKEN, 'the third, and the memory refuses: it kneels, open');
    e.setState(ES.CHASE); stance('rimStrike'); e.stateTime = 0.1; sim.seconds(0.15, 6);
    expect.ok(e.state === ES.WINDUP && e.rig.shieldGlow && e.rig.shieldGlow.visible && !e.rig.warnGlow.visible, 'a shield blow\'s wind-up glows on the shield, not the sword');
  });
  test('Still Mere: the Drowned hold the court, and nothing of the old road is left', () => {
    const L = A.LEVEL_14, ids = new Set([...L.gated.flatMap(z => z.enemies.map(m => m.enemy)), ...L.dispersed.map(s => s.enemy)]);
    for (const old of ['cleanrotKnight', 'omenkin', 'goldenZealot', 'ashenWarrior', 'beastman', 'graftedScion', 'malenia']) expect.ok(!ids.has(old), `no ${old}`);
    expect.ok(ids.has('drowned') && ids.has('kingsBlade'), 'the Drowned and the King\'s Blade');
    const text = JSON.stringify({ name: L.name, description: L.description, help: L.help, hint: L.completeHint, rooms: L.rooms.map(r => r.id), bonfires: L.bonfires.map(b => b.id), zones: L.gated.map(z => z.id) });
    expect.ok(!OLD.test(text), 'no names of the old road');
    expect.ok(!L.hazards && !L.realm.blooms && L.realm.pools.every(p => p.kind === 'water'), 'no rot and no scarlet flowers: water where the rot lay');
    const D = A.ENEMY_BY_ID.drowned;
    expect.ok(!OLD.test(D.name + D.description + JSON.stringify(D.attacks.map(a => a.name))), 'the Drowned\'s own names');
    expect.ok(A.ENEMY_BY_ID.hollow.attacks.some(a => a.id === 'swing'), 'the Hollow Soldier itself is untouched');
    start();
    expect.ok(Game.enemies.filter(e => e.baseDef.id === 'drowned').length >= 7, 'Drowned on the boughs and in the court');
  });
  test('Still Mere: killing the King\'s Blade opens the ice and finishes the level', () => {
    const doneKey = 'combatArena.complete.still-mere', kept = localStorage.getItem(doneKey);
    start();
    const e = blade(), p = Game.player, zone = Game.zones.find(z => z.id === 'zone-blade');
    expect.ok(e && zone && !zone.gate.open && !Game.complete, 'shut at first');
    for (const z of Game.zones) if (z !== zone) { z.gate.open = true; z.beaten = true; }   // the mere, won
    sim.place(e.x - 6, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.(); sim.step(0.5);
    e.hp = e.def.hp * 0.45; sim.step(0.5); sim.until(() => e.state !== ES.PHASE && e.def.phaseId === 'emberWorn', 12);
    let opened = null; sim.until(() => (opened = e.attack && e.attack.id) === 'torchTaken', 4);
    expect.ok(opened === 'torchTaken', `the phase opens with the Torch Taken Up (${opened})`);
    expect.ok(e.def.phaseId === 'emberWorn' && e.def.name === 'The King\'s Blade, Ember-Worn', `past half the Ember shows (${e.def.phaseId})`);
    for (let i = 0; i < 6 && e.alive(); i++) { e.deplete(); sim.step(1); sim.until(() => e.state !== ES.PHASE && !e.invulnerable(), 20); }
    sim.until(() => Game.complete, 10);
    expect.ok(!e.alive() && zone.gate.open && Game.complete, `gate open, level complete (hp ${Math.round(e.hp)})`);
    expect.ok(A.finale.state && A.finale.state.ending, 'and the story\'s ending begins (js/finale.js)');
    A.finale.cancelEnding();
    if (kept === null) localStorage.removeItem(doneKey); else localStorage.setItem(doneKey, kept);   // the Levels menu's mark
  });
  test('Still Mere: the King\'s Blade strikes the player in a fair fight, and its shield takes a blow from the front', () => {
    start();
    const e = blade(), p = Game.player;
    for (const z of Game.zones) if (z.id !== 'zone-blade') { z.gate.open = true; z.beaten = true; }
    sim.place(e.x - 2.4, e.z, e.y); p.yaw = Math.PI / 2; p.hp = p.maxHp = 1e6; e.wake?.();
    const seen = new Set();
    for (let t = 0; t < 30 && seen.size < 3; t += 1 / 60) { sim.step(1 / 60); if (e.attack && e.state === ES.ACTIVE) seen.add(e.attack.id); }
    expect.ok(seen.size >= 2 && p.hp < p.maxHp, `it attacks with its moves (${[...seen].join(', ')}), and lands blows`);
    const front = A.ENEMY_BY_ID.kingsBlade.guard;
    expect.ok(front.damageMul < 1 && front.breakers.includes('heavy'), 'the shield takes most of a frontal blow, and a heavy breaks it');
  });
  test('Still Mere: Level 14 is written in the lore, Ysolde by the first bonfire', () => {
    const L = LORE.levels['still-mere'];
    expect.ok(L.npcs.length === 1 && L.npcs[0].bonfire === 'mere-bough' && L.npcs[0].lines.length === 6, 'Ysolde, six lines');
    expect.ok(L.inscriptions.length === 3, 'three inscriptions');
    const R = terrainFor(A.LEVEL_14);
    for (const I of [...L.inscriptions.filter(i => i.mount === 'floor'), ...L.npcs]) expect.ok(Math.abs(R.floorY(I.x, I.z, I.y || 0) - (I.y || 0)) < 0.5, `${I.id || 'Ysolde'} stands on the floor`);
  });
})();
