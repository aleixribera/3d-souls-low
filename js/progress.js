'use strict';
// ============================================================================
// Levels, crates and abilities (PLAN.md item 7): this browser's own progress, kept in localStorage. A finished Boss
// Rush run earns xp (CRATES.xp); each level gives a crate; opening one unlocks an ability you don't own, its rarity
// drawn by CRATES.odds among the rarities that still hold one. Every player owns the starter set (CRATES.starter) and
// keeps an active pool: the abilities they own, less the ones they turned off, never fewer than CRATE_MIN of a rarity.
// Boss Rush offers cards only from it (the server's setGear). The roll and the Abilities page are js/crate-screen.js.
// The player's name lives here too, so it is kept with the rest of the save: asked once by js/name-ask.js, changed in
// Options.
// ============================================================================
const progress = (() => {
  const KEY = 'arena.progress', KEEP_RUNS = 24;   // the last runs counted, so a summary shown twice pays once
  // Before the name was saved here, the lobby kept it under its own key: a name chosen there counts as chosen. One the
  // server made up by join order ("Player 3", which old builds stored back) does not.
  function legacyName() {
    try { const n = ArenaNet.name(localStorage.getItem('combatArena.onlineName') || ''); return /^Player \d+$/.test(n) ? '' : n; } catch { return ''; }
  }
  const blank = () => ({ v: CRATES.save, xp: 0, crates: 0, owned: [...CRATES.starter], off: [], counted: [], name: legacyName() });
  const whole = (x, most = 1e9) => Number.isInteger(x) && x >= 0 ? Math.min(x, most) : 0;
  const rarityOf = id => ABILITY_BY_ID[id].rarity;
  // A stored state made safe: unknown abilities dropped, the starter set always owned, nothing turned off that would
  // leave a rarity under its minimum. A store from before CRATES.save keeps its xp, crates and name; its abilities reset.
  function clean(s) {
    const b = blank();
    if (!s || typeof s !== 'object') return b;
    const same = Number.isInteger(s.v) && s.v >= CRATES.save, known = list => Array.isArray(list) ? list.filter(id => typeof id === 'string' && Object.hasOwn(ABILITY_BY_ID, id)) : [];
    const owned = [...new Set([...b.owned, ...(same ? known(s.owned) : [])])];
    let off = same ? [...new Set(known(s.off))].filter(id => owned.includes(id)) : [];
    for (const r of Object.keys(CRATE_MIN)) {   // too many off: the starter ones of that rarity come back on
      while (owned.filter(id => rarityOf(id) === r && !off.includes(id)).length < CRATE_MIN[r]) {
        const back = off.find(id => rarityOf(id) === r); if (!back) break; off = off.filter(id => id !== back);
      }
    }
    const counted = Array.isArray(s.counted) ? s.counted.filter(k => typeof k === 'string' && k.length <= 80).slice(-KEEP_RUNS) : [];
    return { v: CRATES.save, xp: whole(s.xp), crates: whole(s.crates, 999), owned, off, counted, name: ArenaNet.name(s.name) || b.name };
  }
  function read() {
    try { const raw = localStorage.getItem(KEY); if (raw) return clean(JSON.parse(raw)); } catch { /* unreadable: start again */ }
    return blank();
  }
  let state = read();
  // Another tab may have changed the store since: start each change from what is stored (or, with storage blocked or
  // empty, from this visit's own state), so two tabs never undo each other's crates.
  function sync() {
    try { const raw = localStorage.getItem(KEY); if (raw) state = clean(JSON.parse(raw)); } catch { /* keep this visit's */ }
  }
  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: kept for this visit */ }
    for (const fn of listeners) { try { fn(); } catch (e) { console.error(e); } }
  }
  // The level `xp` stands at (1 at 0 xp), the xp into it and the xp it needs.
  function levelOf(xp) {
    const L = CRATES.level;
    let level = 1, need = L.first, left = Math.max(0, xp);
    while (left >= need) { left -= need; level++; need = Math.min(L.most, need + L.step); }
    return { level, into: left, need };
  }
  // What a run earns: its fights won, its Crowned ones, its whole minutes, never under `least`.
  function runXp(run) {
    const X = CRATES.xp, n = v => Math.max(0, Math.floor(Number(v) || 0));
    if (run.outcome === 'left' && !n(run.won)) return 0;
    return Math.max(X.least, n(run.won) * X.fight + n(run.crowned) * X.crowned + Math.floor(n(run.time) / 60) * X.minute);
  }
  // Counts a finished run once (`key` names it): its xp, the levels and the crates they give. Null if already counted.
  function award(run, key) {
    sync();
    if (key && state.counted.includes(key)) return null;
    const before = levelOf(state.xp), xp = runXp(run);
    if (!xp) return null;
    state.xp += xp;
    const after = levelOf(state.xp), crates = after.level - before.level;
    state.crates = Math.min(999, state.crates + crates);
    if (key) state.counted = [...state.counted, key].slice(-KEEP_RUNS);
    save();
    return { xp, before, after, crates };
  }
  // The abilities a crate can hold: every one but the starter set.
  const prizes = () => ABILITIES.filter(b => !CRATES.starter.includes(b.id));
  // One ability drawn by the odds from `pool`: a rarity by its weight among those `pool` holds, then one of it.
  function drawFrom(pool, rng) {
    if (!pool.length) return null;
    const weights = Object.entries(CRATES.odds).map(([r, w]) => [r, pool.some(x => x.rarity === r) ? w : 0]);
    const total = weights.reduce((n, [, w]) => n + w, 0);
    if (!total) return pool[Math.floor(rng() * pool.length)];   // no odds for what is left: any of it
    let roll = rng() * total, rarity = weights.find(([, w]) => w > 0)[0];
    for (const [r, w] of weights) { if (w > 0 && roll < w) { rarity = r; break; } roll -= w; }
    const of = pool.filter(x => x.rarity === rarity);
    return of[Math.floor(rng() * of.length)];
  }
  // What a crate holds: an ability you don't own yet; null when you own them all.
  const draw = (rng = Math.random) => drawFrom(prizes().filter(b => !state.owned.includes(b.id)), rng);
  // The roll's strip: CRATES.roll.tiles abilities drawn by the odds from every prize, with `ability` at `land`.
  function strip(ability, rng = Math.random) {
    const R = CRATES.roll, all = prizes();
    return Array.from({ length: R.tiles }, (_, i) => i === R.land ? ability.id : drawFrom(all, rng).id);
  }
  // Opens one crate: the ability it unlocks (owned and active at once) and the strip to roll. Null with no crate or
  // nothing left to unlock.
  function open(rng = Math.random) {
    sync();
    if (state.crates <= 0) return null;
    const ability = draw(rng);
    if (!ability) return null;
    state.crates--;
    state.owned = [...state.owned, ability.id];
    save();
    return { ability, strip: strip(ability, rng) };
  }
  // Turns an owned ability on or off for Boss Rush. Off is refused when it would leave its rarity under CRATE_MIN.
  // True when it changed.
  function setActive(id, on) {
    sync();
    if (!state.owned.includes(id) || on === !state.off.includes(id)) return false;
    if (!on && !canTurnOff(id)) return false;
    state.off = on ? state.off.filter(x => x !== id) : [...state.off, id];
    save(); return true;
  }
  const isActive = id => state.owned.includes(id) && !state.off.includes(id);
  const canTurnOff = id => isActive(id) && state.owned.filter(x => rarityOf(x) === rarityOf(id) && !state.off.includes(x)).length > CRATE_MIN[rarityOf(id)];
  // The name, cleaned as the server cleans it; an empty one is refused. True when it changed.
  function setName(value) {
    sync();
    const name = ArenaNet.name(value);
    if (!name || name === state.name) return false;
    state.name = name; save(); return true;
  }
  return {
    get xp() { return state.xp; }, get crates() { return state.crates; },
    get owned() { return [...state.owned]; }, get name() { sync(); return state.name; },   // read rarely; another tab may have named you since
    get level() { return levelOf(state.xp); },
    // True when every ability is owned: a crate has nothing left to give.
    get complete() { return prizes().every(b => state.owned.includes(b.id)); },
    owns: id => state.owned.includes(id),
    isActive, canTurnOff,
    // The active pool: what Boss Rush may offer this player (sent to the server, js/multiplayer.js gear).
    active: () => { sync(); return state.owned.filter(id => !state.off.includes(id)); },
    sync,   // the Abilities page reads the store afresh when it opens (another tab may have changed it)
    levelOf, runXp, award, open, setActive, setName, draw, strip,
    onChange: fn => { listeners.push(fn); },
    reload() { state = read(); },   // tests: read the store again
  };
})();
