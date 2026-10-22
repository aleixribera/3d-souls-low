'use strict';
// Test actual collision, saves, phase resolution and opt-in balance, not just data shapes.
(() => {
  const { test, expect, sim } = __arena.tests;
  const start = L => { Game.story = false; Game.startLevel(L.id); Game.loading = 0; sim.begin(); };
  const preserveSaves = fn => {
    const kept = Object.fromEntries(Object.values(CONFIG.story.saveKeys).map(k => [k, localStorage.getItem(k)]));
    try { fn(); } finally {
      Game.story = false;
      for (const [k, v] of Object.entries(kept)) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
      story.load(); story.use('ashmere'); Game.showMenu('main');
    }
  };
  test('Story V2: isolated campaign, menu, tutorial, Continue and completion preserve both original saves', () => preserveSaves(() => {
    const old = ['ashmere', 'lands'].map(id => localStorage.getItem(CONFIG.story.saveKeys[id]));
    const campaign = story.use('story-v2');
    campaign.erase();
    expect.ok(Game.screens().story.items.some(i => i.campaign === 'story-v2' && i.name === 'New'), 'new campaign is selectable');
    expect.ok(Game.screens().levelsV2.items.length === 6, 'five standalone levels and Back');
    story.newGame(true); sim.begin();
    expect.ok(Game.isTutorial(), 'shared tutorial');
    story.afterTutorial(); Game.loading = 0;
    expect.ok(Game.level.id === 'v2-broken-hall', 'tutorial enters V2');
    story.save(Game.level.bonfires[0].id);
    const saved = story.data.spawn;
    story.quit(); story.use('story-v2'); story.resume(); sim.begin();
    expect.ok(Game.level.id === 'v2-broken-hall' && Game.story, 'Continue selects V2');
    expect.near(Game.player.x, saved.x, 0.01, 'checkpoint restored');
    for (const [i, chapter] of STORY_V2.chapters.entries())
      expect.ok(story.nextLevelId(chapter.level) === (STORY_V2.chapters[i + 1]?.level || null), `${chapter.level}: own successor`);
    story.jumpTo('v2-crown-answer');
    events.emit('endingDone');
    expect.ok(story.data.completed && Game.screen === 'storyDone', 'completion saved and menu shown');
    ['ashmere', 'lands'].forEach((id, i) => expect.ok(localStorage.getItem(CONFIG.story.saveKeys[id]) === old[i], `${id} unchanged`));
  }));
  test('Story V2: encounter tuning scales all damage and every boss bar without changing shared enemies', () => {
    const tuning = STORY_V2_5.enemyTuning;
    for (const id of ['hollow', 'bowman', 'giant', 'pillagerCaptain', 'bellWarden', 'varn']) {
      const def = ENEMY_BY_ID[id], before = JSON.stringify(def), tuned = encounterEnemyDef(def, tuning);
      expect.near(tuned.hp, def.hp * (isBossDef(def) ? tuning.bossHealth : tuning.health), 0.001, id);
      for (const [phase, data] of Object.entries(def.phases || {}))
        if (data.hp) expect.near(tuned.phases[phase].hp, data.hp * tuning.bossHealth, 0.001, `${id}/${phase}`);
      const compare = (a, b) => {
        if (!a || typeof a !== 'object') return;
        for (const [k, v] of Object.entries(a)) {
          if (k === 'damage' && typeof v === 'number') expect.near(b[k], v * tuning.damage, 0.001, `${id} damage`);
          else if (k === 'startup' || k === 'active' || k === 'follow' || k === 'recovery') expect.ok(JSON.stringify(v) === JSON.stringify(b[k]), 'timing unchanged');
          else compare(v, b[k]);
        }
      };
      compare(def, tuned);
      expect.ok(JSON.stringify(def) === before && encounterEnemyDef(def) === def, 'registry and default path unchanged');
    }
    start(STORY_V2_5);
    const boss = Game.enemies.find(e => e.zone === 'crown');
    expect.near(boss.hp, ENEMY_BY_ID.varn.phases.throne.hp * tuning.bossHealth, 0.001, 'spawned throne health');
    boss.enterPhase(1);
    expect.near(boss.hp, ENEMY_BY_ID.varn.phases.knell.hp * tuning.bossHealth, 0.001, 'spawned knell health');
    Game.startFight('varn');
    expect.near(Game.duel.hp, Game.duel.def.hp, 0.001, 'duel full health');
    expect.ok(Game.duel.baseDef === ENEMY_BY_ID.varn, 'duel uses original enemy');
  });
  test('Story V2: every checkpoint is safe and each encounter has at most two active targets', () => {
    for (const L of STORY_V2_LEVELS) {
      start(L);
      expect.ok(L.gated.every(z => z.enemies.length <= 2), `${L.id}: readable pairs`);
      for (const b of L.bonfires) {
        sim.place(b.spawn.x, b.spawn.z, b.spawn.y);
        const hp = Game.player.hp;
        sim.seconds(5, 30);
        expect.near(Game.player.hp, hp, 0.001, `${L.id}/${b.id}: no incoming damage`);
        expect.ok(!Game.enemies.some(e => e.fightingPlayer()), `${b.id}: no active enemy at rest`);
      }
    }
  });
  test('Story V2: guidance and the complete critical paths are walkable with real collision and stairs', () => {
    expect.ok(validateData().length === 0, validateData().join(' | '));
    for (const L of STORY_V2_LEVELS) {
      start(L); sim.clearEnemies();
      // Keep the final gate shut so normal automatic level progression cannot interrupt this traversal.
      for (const z of Game.zones.slice(0, -1)) z.gate.open = true;
      for (const route of BONFIRE_GUIDANCE[L.id]) for (const path of route.paths) for (const [x, y, z] of path) {
        expect.ok(sim.walkTo(x, z, 0.35, 25), `${L.id}: blocked walking to ${x},${y},${z} at ${Game.player.x.toFixed(1)},${Game.player.z.toFixed(1)}`);
        expect.near(Game.player.y, y, 0.3, `${L.id}: correct floor`);
      }
      // From the final refuge, follow the doorway centre into the final fight.
      const last = L.gated.at(-1), g = last.gate, e = last.enemies[0].spawn;
      expect.ok(sim.walkTo(Game.player.x, g.z, 0.35, 15), `${L.id}: align with exit`);
      expect.ok(sim.walkTo(e.x, e.z, 0.5, 25), `${L.id}: reach final opponent`);
      expect.ok(Game.player.alive(), `${L.id}: no lethal traversal`);
    }
  });
  test('Story V2: Aldric retreats first, transitions at the throne, and ends only after the final bar', () => {
    start(STORY_V2_5);
    const field = Game.enemies.find(e => e.zone === 'answer-field');
    field.hp = 0; field.outlast();
    expect.ok(field.state === ES.RETREAT && !finale.state.ending, 'field retreat without ending');
    sim.seconds(7);
    expect.ok(field.state === ES.GONE && Game.zones.find(z => z.id === 'answer-field').gate.open, 'field gate opens');
    const king = Game.enemies.find(e => e.zone === 'crown');
    king.deplete();
    expect.ok(king.state === ES.PHASE && !finale.state.ending, 'throne transition without ending');
    sim.seconds(17);
    expect.ok(king.def.phaseId === 'knell', 'Ember-Crowned phase');
    king.deplete(); sim.step(2);
    expect.ok(!!finale.state.ending, 'last bar starts the ending');
  });
})();
