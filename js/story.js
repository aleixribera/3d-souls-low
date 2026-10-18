'use strict';
// ============================================================================
// Story mode (v4.4; two campaigns since v7.0): tutorial (optional) -> every chapter of a campaign -> its ending -> the title.
// ============================================================================
// A campaign is one entry of STORIES (js/data/story.js): Ashmere (the Gaoler King) and the Lands Between (the Elden
// Throne). Each keeps its own save slot (`saveKey`); one campaign is active at a time (`story.use(id)`), and every
// function below acts on it, so the rest of the game never needs to know which story is running.
// It only connects what exists: levels start through Game.startLevel, chain through Game.nextLevelId, the finale plays
// the ending. While `Game.story` is on it saves to localStorage on every rest, on every level start and when quitting to
// the menu, and Continue rebuilds the last checkpoint from that save.
//
// Save (version CONFIG.story.saveVersion), the same shape for every campaign:
//   { v, level: <level id>, bonfire: <bonfire id> | null, spawn: { x, y?, z, yaw } | null (null: the level start),
//     cleared: [placement keys of enemies beaten at the checkpoint, Game.placementKey], shortcuts: [gate ids opened],
//     zones: [won zone ids, v5.1, optional], traps: [trap ids sprung], seen: [sightings already gone], bosses: [enemy def ids beaten, ever],
//     progress: { inventory: { <item id>: { max } }, currency, equipment, upgrades }, completed: bool, savedAt: ms }
// A save that is missing, unreadable or names something that no longer exists is treated as no save (New Game).
function makeCampaign(C) {
  const S = () => CONFIG.story;
  const chapterIds = () => C.chapters.map(c => c.level);
  const storyLevels = () => [...(C.tutorial ? [C.tutorial.level] : []), ...chapterIds()];
  const chapter = id => C.tutorial && id === C.tutorial.level ? C.tutorial : C.chapters.find(c => c.level === id) || null;
  const key = () => S().saveKeys[C.id];
  let data = null;        // the save as last read or written (null: none)
  let status = 'none';    // 'none' | 'ok' | 'broken'
  let restoring = false;  // Continue is rebuilding a checkpoint: the level start must not overwrite the save
  let storageOk = true;   // false in a private window that refuses storage: the game plays on without saving

  // ---- storage, every access wrapped -----------------------------------------------------------------------------
  function readRaw() {
    try { return localStorage.getItem(key()); } catch (err) { storageOk = false; return null; }
  }
  function write(obj) {
    try { localStorage.setItem(key(), JSON.stringify(obj)); storageOk = true; return true; }
    catch (err) { storageOk = false; return false; }
  }
  function erase() { try { localStorage.removeItem(key()); } catch (err) { storageOk = false; } data = null; status = 'none'; }

  const strs = a => Array.isArray(a) && a.every(s => typeof s === 'string');
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  // A readable save, or null. Anything odd (an old version, a level since removed, a bonfire that moved) is refused.
  function check(d) {
    if (!d || typeof d !== 'object' || d.v !== S().saveVersion) return null;
    if (!storyLevels().includes(d.level)) return null;
    const L = ALL_LEVELS.find(l => l.id === d.level);
    if (!L) return null;
    if (d.bonfire !== null && !(L.bonfires || []).some(b => b.id === d.bonfire)) return null;
    if (d.spawn !== null && !(d.spawn && finite(d.spawn.x) && finite(d.spawn.z) && finite(d.spawn.yaw) && (d.spawn.y === undefined || finite(d.spawn.y)))) return null;
    if (![d.cleared, d.shortcuts, d.traps, d.seen, d.bosses].every(strs)) return null;
    if ('zones' in d && !strs(d.zones)) return null;   // v5.1: optional (older saves derive won zones from `cleared`)
    if (!d.progress || typeof d.progress !== 'object' || !d.progress.inventory || typeof d.progress.inventory !== 'object') return null;
    return { ...d, completed: !!d.completed };
  }
  function load() {
    const raw = readRaw();
    if (raw === null) { data = null; status = 'none'; return; }
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
    data = check(parsed); status = data ? 'ok' : 'broken';
  }

  // ---- progress carried from level to level ---------------------------------------------------------------------
  function freshProgress() {
    const inventory = {};
    for (const e of PLAYER_DEF.inventory) inventory[e.item] = { max: e.max };
    return { ...JSON.parse(JSON.stringify(C.progress)), inventory };
  }
  // What the live player has now (fields this build does not know are kept as they were).
  function captureProgress() {
    const prog = { ...(data ? data.progress : freshProgress()) }, p = Game.player;
    prog.inventory = { ...prog.inventory };
    if (p) for (const [id, it] of Object.entries(p.inventory)) prog.inventory[id] = { ...prog.inventory[id], max: it.max };
    return prog;
  }
  // A fresh player (level start, rest respawn, death): carried capacities, clamped by the chapter's `loadout`, full.
  function applyProgress(p) {
    if (!Game.story || !data) return;
    const lo = (chapter(Game.level.id) || {}).loadout || {};
    for (const [id, saved] of Object.entries(data.progress.inventory)) {
      const it = p.inventory[id];
      if (!it || !ITEMS[id] || !finite(saved.max)) continue;   // an item this build does not have: ignored
      const c = lo[id] || {};
      it.max = clamp(Math.round(saved.max), c.min ?? 0, c.max ?? Infinity);
      it.count = it.max;
    }
  }

  // ---- the checkpoint -----------------------------------------------------------------------------------------------
  // Beaten at the checkpoint: the enemies killed before the last rest, plus beaten bosses (they stay beaten). Kills since
  // the last rest come back, as after a death (v5.1). Won zones are saved by id (`zones`): their gates stay open.
  function checkpointCleared() {
    const keys = new Set(Game.cleared);
    for (const z of Game.zones) if (z.gate.open) for (const a of z.actors) if (a.key && !a.alive() && (a.boss || a.phaseIds || a.baseDef.posture)) keys.add(a.key);
    return [...keys];
  }
  const beatenBosses = new Set();
  function save(bonfire) {
    if (!Game.story || Game.kind !== 'level') return false;
    const tut = Game.isTutorial(), prev = data && data.level === Game.level.id ? data : null;
    data = {
      v: S().saveVersion, level: Game.level.id,
      bonfire: tut ? null : bonfire !== undefined ? bonfire : prev ? prev.bonfire : null,
      spawn: tut || (bonfire === undefined && !(prev && prev.bonfire)) ? null : { ...Game.spawn },
      cleared: tut ? [] : checkpointCleared(),
      zones: tut ? [] : Game.zones.filter(z => z.gate.open).map(z => z.id),
      shortcuts: tut ? [] : world.gates.filter(g => g.opensFrom && g.open).map(g => g.id),
      traps: tut ? [] : world.traps.filter(t => t.state === 'sprung').map(t => t.id),
      seen: tut ? [] : finale.seenSightings(),
      bosses: [...new Set([...(data ? data.bosses : []), ...beatenBosses])],
      progress: captureProgress(),
      completed: !!(data && data.completed),
      savedAt: Date.now(),
    };
    status = 'ok';
    return write(data);
  }
  function bossBeaten(e) {
    beatenBosses.add(e.baseDef.id);
    // The last boss of the road: the finale has started the ending (its listener ran first) - the story is complete.
    if (Game.level.ending && finale.state && finale.state.ending) { if (data) data.completed = true; save(); }
  }
  // Autosaves (v5.1): a zone won or a shortcut opened is kept at once (its gate stays open on Continue; the kills since
  // the last rest still come back, as after a death), and so is everything when the page is hidden or closed.
  const autosave = () => { if (Game.story && !restoring && Game.kind === 'level' && !Game.isTutorial() && Game.player && Game.player.alive()) save(); };
  function finish() {
    if (data) { data.completed = true; write(data); }
    Game.story = false; Game.reset();
    Game.showMenu('storyDone');
  }

  // ---- flow -----------------------------------------------------------------------------------------------------------
  function begin(levelId) {
    Game.story = true; beatenBosses.clear();
    Game.startLevel(levelId);
  }
  function newGame(withTutorial) {
    erase();
    data = { v: S().saveVersion, level: chapterIds()[0], bonfire: null, spawn: null, cleared: [], shortcuts: [], traps: [], seen: [], bosses: [],
             progress: freshProgress(), completed: false, savedAt: Date.now() };
    begin(withTutorial && C.tutorial ? C.tutorial.level : chapterIds()[0]);
  }
  // Developer jump (#dev): a fresh story starting at any chapter.
  function jumpTo(levelId) {
    newGame(false);
    if (levelId !== chapterIds()[0]) begin(levelId);
  }
  // Continue: the saved level, rebuilt to its checkpoint as if the player had just rested there.
  function resume() {
    load();
    if (status !== 'ok') { Game.showMenu('main'); return; }
    const d = data;
    restoring = true;
    try {
      begin(d.level);
      if (!Game.isTutorial()) {
        Game.cleared = new Set(d.cleared);
        for (const g of world.gates) if (g.opensFrom && d.shortcuts.includes(g.id)) { g.open = true; g.lift = 1; }
        for (const t of world.traps) if (d.traps.includes(t.id) && t.state === 'set') { t.state = 'sprung'; t.dropTime = 99; world.openHole(t.region, t.collapse); }
        // Zones whose every member was beaten are won: their gates stand open (silently) and their fighters are gone.
        for (const z of Game.zones) {
          const keys = z.members.map(m => Game.placementKey({ ...m, ...m.spawn }, z.id + '/'));
          if (!(d.zones || []).includes(z.id) && (!keys.length || !keys.every(k => Game.cleared.has(k)))) continue;
          z.gate.open = true; z.gate.lift = 1; z.beaten = true;
          for (const a of z.actors) a.rig.dispose();
          Game.enemies = Game.enemies.filter(e => !z.actors.includes(e)); z.actors = [];
        }
        Game.respawnEnemies();
        finale.skipSightings(d.seen);
        if (d.spawn) { Game.spawn = { ...d.spawn }; Game.spawnPlayer(); }
      }
    } finally { restoring = false; }
    save();
  }
  // Game.startLevel calls this in Story mode: each new level is a save point (not while Continue rebuilds one).
  function onLevelStart() {
    if (restoring) return;
    if (data && data.level !== Game.level.id) { data = { ...data, bonfire: null, spawn: null }; }
    save(null);
  }
  function afterTutorial() { begin(chapterIds()[0]); }
  function nextLevelId(id) {
    const ids = chapterIds(), i = ids.indexOf(id);
    if (C.tutorial && id === C.tutorial.level) return ids[0];
    return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
  }
  function quit() { save(); Game.story = false; Game.reset(); Game.showMenu('main'); }

  // ---- menus --------------------------------------------------------------------------------------------------------
  function levelName(id) { const c = chapter(id); return c ? c.title.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase()) : id; }
  // A story level's title card, shown before the build (Game.loadingFirst): its chapter title and line.
  const card = id => { const ch = chapter(id), L = ALL_LEVELS.find(l => l.id === id); return ch ? [ch.title, ch.line] : [L ? L.name : '', L ? L.description : '']; };
  // The campaign's own screen (from Story): Continue and New Game with a save, else Begin.
  function items(game) {
    const noSave = storageOk ? '' : ' Progress cannot be saved in this window.';
    const back = { name: 'Back', desc: '', cue: 'menuBack', go: () => game.showMenu('story') };
    if (status === 'ok') return [
      { name: 'Continue', desc: `${levelName(data.level)}${data.bonfire ? ', at the last bonfire rested at' : ', from its start'}.${data.completed ? ' The story is complete.' : ''}${noSave}`,
        go: () => { story.use(C.id); Game.loadingFirst(...Game.levelCard(data.level), () => resume()); } },
      { name: 'New Game', desc: 'Begin this story again from the start.', go: () => { story.use(C.id); game.showMenu('storyConfirm'); } },
      back,
    ];
    return [{ name: 'Begin', desc: (status === 'broken' ? 'Your save of this story could not be read. Begin it anew.' : C.description) + noSave,
              go: () => { story.use(C.id); game.showMenu(C.tutorial ? 'storyTutorial' : 'storyBegin'); } }, back];
  }
  load();
  return {
    def: C, items, newGame, resume, jumpTo, quit, save, erase, load, onLevelStart, afterTutorial, nextLevelId, applyProgress, chapter,
    storyLevels, chapterIds, levelName, card, bossBeaten, autosave, finish,
    get data() { return data; }, get status() { return status; }, get storageOk() { return storageOk; },
  };
}

// The facade the game talks to: the active campaign's functions, the Story menus, and the shared event listeners.
const story = (() => {
  const campaigns = Object.fromEntries(STORIES.map(C => [C.id, makeCampaign(C)]));
  let active = campaigns[STORIES[0].id];
  const A = () => active;
  events.on('enemyDeath', d => { const e = d.enemy; if (Game.story && (e.phaseIds || e.baseDef.posture)) A().bossBeaten(e); });
  events.on('rest', d => { if (Game.story && !Game.isTutorial()) A().save(d.bonfire.id); });
  events.on('gateOpened', () => A().autosave());
  window.addEventListener('pagehide', () => A().autosave());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') A().autosave(); });
  events.on('endingDone', () => { if (Game.story) A().finish(); });

  // The campaign a level belongs to (its chapters or tutorial), or null.
  const owner = levelId => STORIES.map(C => campaigns[C.id]).find(c => c.chapterIds().includes(levelId)) || null;

  function screens(game) {
    const C = A().def;
    const devJumps = DEV ? [
      { name: 'Story: jump to a level', desc: 'Developer: a fresh story starting at any level of either road.', go: () => game.showMenu('storyJump') },
      { name: 'Story: clear the saves', desc: 'Developer: deletes both story saves.', go: () => { for (const c of Object.values(campaigns)) c.erase(); game.showMenu('main'); } },
    ] : [];
    const first = A().chapterIds()[0];
    return { main: [{ name: 'Story', desc: 'Two roads: Ashmere and the Gaoler King, or the Lands Between and the Elden Throne.', go: () => game.showMenu('story') }],
      devItems: devJumps, screens: {
      story: { title: 'STORY', sub: 'CHOOSE A ROAD', back: 'main', items: [
        ...STORIES.map(S => { const c = campaigns[S.id], st = c.status === 'ok' ? (c.data.completed ? '  ✦' : '  ·  in progress') : '';
          return { name: S.name + st, desc: S.description, go: () => { story.use(S.id); game.showMenu('storyRoad'); } }; }),
        { name: 'Back', desc: '', cue: 'menuBack', go: () => game.showMenu('main') },
      ] },
      storyRoad: { title: C.menuTitle, sub: C.menuSub, back: 'story', items: A().items(game) },
      storyConfirm: { title: 'NEW GAME', sub: C.menuSub, notice: 'Your journey so far on this road will be lost.', back: 'storyRoad', items: [
        { name: 'Begin anew', desc: 'Overwrite this story\'s save and start again.', go: () => game.showMenu(C.tutorial ? 'storyTutorial' : 'storyBegin') },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => game.showMenu('storyRoad') },
      ] },
      storyTutorial: { title: 'PLAY THE TUTORIAL?', sub: '', back: 'storyRoad', items: [
        { name: 'Yes', desc: 'Learn every control on training dummies, then set out.', go: () => Game.loadingFirst(...A().card(C.tutorial.level), () => A().newGame(true)) },
        { name: 'No', desc: `Straight to ${A().levelName(first)}.`, go: () => Game.loadingFirst(...A().card(first), () => A().newGame(false)) },
      ] },
      storyBegin: { title: C.menuTitle, sub: C.menuSub, back: 'storyRoad', items: [
        { name: 'Set out', desc: `Straight to ${A().levelName(first)}.`, go: () => Game.loadingFirst(...A().card(first), () => A().newGame(false)) },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => game.showMenu('storyRoad') },
      ] },
      storyDone: { title: 'STORY COMPLETE', sub: C.menuSub, notice: C.done, items: [
        { name: 'Return to title', desc: '', go: () => game.showMenu('main') },
      ] },
      storyJump: { title: 'STORY', sub: 'JUMP TO A LEVEL', back: 'main',
        items: STORIES.flatMap(S => { const c = campaigns[S.id];
          return c.storyLevels().map(id => ({ name: `${S.short}: ${c.levelName(id)}`, desc: 'Developer: starts a fresh story here (that road\'s save is replaced).',
            go: () => { story.use(S.id); if (S.tutorial && id === S.tutorial.level) c.newGame(true); else c.jumpTo(id); } })); }) },
    } };
  }

  return {
    screens, campaigns, owner,
    // Make a campaign the active one (the menus pick it; jumps and Continue follow it).
    use(id) { if (!campaigns[id]) throw new Error(`Unknown story "${id}".`); active = campaigns[id]; return active; },
    get active() { return active; },
    load() { for (const c of Object.values(campaigns)) c.load(); },
    // Everything else acts on the active campaign.
    newGame: w => A().newGame(w), resume: () => A().resume(), jumpTo: id => { const c = owner(id); if (c) active = c; return A().jumpTo(id); },
    quit: () => A().quit(), save: b => A().save(b), erase: () => A().erase(), onLevelStart: () => A().onLevelStart(),
    afterTutorial: () => A().afterTutorial(), nextLevelId: id => A().nextLevelId(id), applyProgress: p => A().applyProgress(p), chapter: id => A().chapter(id),
    get data() { return A().data; }, get status() { return A().status; }, get storageOk() { return A().storageOk; },
  };
})();
