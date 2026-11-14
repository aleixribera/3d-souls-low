'use strict';
// ============================================================================
// Levels and crates (PLAN.md track B item 7): this browser's own progress, kept in localStorage. A finished Boss Rush
// run earns xp (CRATES.xp); each level gives a crate; opening one draws a reward by CRATES.odds among the rarities that
// still hold something you don't own. What is in a crate is js/data/crates.js; the roll and the Collection are
// js/crate-screen.js. Nothing here touches a fight: the blade look is drawn, and the crate abilities only join this
// player's Boss Rush pool (the server's setGear).
// ============================================================================
const progress = (() => {
  const KEY = 'arena.progress', KEEP_RUNS = 24;   // the last runs counted, so a summary shown twice pays once
  const starts = () => CRATES.rewards.filter(r => r.start).map(r => r.id);
  const blank = () => ({ xp: 0, crates: 0, owned: starts(), look: starts().find(id => CRATE_BY_ID[id].kind === 'look'), counted: [] });
  const whole = (x, most = 1e9) => Number.isInteger(x) && x >= 0 ? Math.min(x, most) : 0;
  // A stored state made safe: unknown rewards dropped, the start rewards always owned, a look you own.
  function clean(s) {
    const b = blank();
    if (!s || typeof s !== 'object') return b;
    const owned = [...new Set([...b.owned, ...(Array.isArray(s.owned) ? s.owned.filter(id => typeof id === 'string' && CRATE_BY_ID[id]) : [])])];
    const look = typeof s.look === 'string' && owned.includes(s.look) && CRATE_BY_ID[s.look].kind === 'look' ? s.look : b.look;
    const counted = Array.isArray(s.counted) ? s.counted.filter(k => typeof k === 'string' && k.length <= 80).slice(-KEEP_RUNS) : [];
    return { xp: whole(s.xp), crates: whole(s.crates, 999), owned, look, counted };
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
  // What a run earns: its bosses beaten, its Crowned ones, its whole minutes, never under `least`.
  function runXp(run) {
    const X = CRATES.xp, n = v => Math.max(0, Math.floor(Number(v) || 0));
    return Math.max(X.least, n(run.beaten) * X.boss + n(run.crowned) * X.crowned + Math.floor(n(run.time) / 60) * X.minute);
  }
  // Counts a finished run once (`key` names it): its xp, the levels and the crates they give. Null if already counted.
  function award(run, key) {
    sync();
    if (key && state.counted.includes(key)) return null;
    const before = levelOf(state.xp), xp = runXp(run);
    state.xp += xp;
    const after = levelOf(state.xp), crates = after.level - before.level;
    state.crates = Math.min(999, state.crates + crates);
    if (key) state.counted = [...state.counted, key].slice(-KEEP_RUNS);
    save();
    return { xp, before, after, crates };
  }
  // One reward drawn by the odds from `pool`: a rarity by its weight among those `pool` holds, then one of it.
  function drawFrom(pool, rng) {
    const weights = Object.entries(CRATES.odds).map(([r, w]) => [r, pool.some(x => crateRarity(x) === r) ? w : 0]);
    const total = weights.reduce((n, [, w]) => n + w, 0);
    if (!total) return pool[Math.floor(rng() * pool.length)];   // no odds for what is left: any of it
    let roll = rng() * total, rarity = weights.find(([, w]) => w > 0)[0];
    for (const [r, w] of weights) { if (w > 0 && roll < w) { rarity = r; break; } roll -= w; }
    const of = pool.filter(x => crateRarity(x) === rarity);
    return of[Math.floor(rng() * of.length)];
  }
  // What a crate holds: something you don't own yet while anything is left, else anything (already yours).
  function draw(rng = Math.random) {
    const all = CRATES.rewards.filter(r => !r.start), left = all.filter(r => !state.owned.includes(r.id));
    return drawFrom(left.length ? left : all, rng);
  }
  // The roll's strip: CRATES.roll.tiles rewards drawn by the odds from every reward, with `reward` at `land`.
  function strip(reward, rng = Math.random) {
    const R = CRATES.roll, all = CRATES.rewards.filter(r => !r.start);
    return Array.from({ length: R.tiles }, (_, i) => i === R.land ? reward.id : drawFrom(all, rng).id);
  }
  // Opens one crate: the reward (kept, and a new look worn at once), whether it is new, and the strip to roll.
  function open(rng = Math.random) {
    sync();
    if (state.crates <= 0) return null;
    const reward = draw(rng), fresh = !state.owned.includes(reward.id);
    state.crates--;
    if (fresh) state.owned = [...state.owned, reward.id];
    if (fresh && reward.kind === 'look') state.look = reward.id;
    save();
    return { reward, fresh, strip: strip(reward, rng) };
  }
  function wear(id) {
    sync();
    if (!state.owned.includes(id) || CRATE_BY_ID[id]?.kind !== 'look' || state.look === id) return false;
    state.look = id; save(); return true;
  }
  return {
    get xp() { return state.xp; }, get crates() { return state.crates; }, get look() { return state.look; },
    get owned() { return [...state.owned]; },
    get level() { return levelOf(state.xp); },
    owns: id => state.owned.includes(id),
    // The crate abilities this browser may be offered in Boss Rush (sent to the server with the look).
    abilities: () => crateAbilities(state.owned),
    levelOf, runXp, award, open, wear, draw, strip,
    onChange: fn => { listeners.push(fn); },
    reload() { state = read(); },   // tests: read the store again
  };
})();
