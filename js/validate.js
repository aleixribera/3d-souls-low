'use strict';
// ============================================================================
// 2d. Data check
// ============================================================================
// Verifies every cross-reference and the level ordering rules. Any problem stops the game at load
// with a readable list on screen, instead of a frozen screen or a soft-locked level later.
function validateData() {
  const errors = [];
  const need = (ok, msg) => { if (!ok) errors.push(msg); };
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const checkAttack = (a, owner) => {
    const tag = `${owner} attack "${a && a.id}"`;
    need(a && typeof a.id === 'string', `${owner}: an attack has no id.`);
    if (!a) return;
    need(a.anim in ANIMS, `${tag}: unknown animation "${a.anim}" (known: ${Object.keys(ANIMS).join(', ')}).`);
    need(Array.isArray(a.hits) && a.hits.length > 0 && a.hits.every(h => num(h.startup) && (num(h.active) || h.active === Infinity)),
      `${tag}: "hits" must list { startup, active } for each strike.`);
    need(num(a.recovery) && num(a.damage) && num(a.poise) && num(a.knock), `${tag}: recovery, damage, poise and knock must be numbers.`);
    need(a.box && ['w', 'h', 'd', 'fwd', 'y'].every(k => num(a.box[k])), `${tag}: box needs w, h, d, fwd and y.`);
  };
  // Enemies
  const ids = new Set();
  for (const d of [...ENEMY_DEFS, ...TRAINING_DEFS]) {
    need(typeof d.id === 'string' && !ids.has(d.id), `Enemy "${d.name}": missing or duplicate id "${d.id}".`);
    ids.add(d.id);
    need(d.weapon in WEAPONS, `Enemy "${d.id}": unknown weapon "${d.weapon}".`);
    if (d.offhand) need(d.offhand in OFFHANDS, `Enemy "${d.id}": unknown off-hand "${d.offhand}".`);
    if (d.idle) need(d.idle in IDLE_STYLES, `Enemy "${d.id}": unknown idle style "${d.idle}".`);
    need(num(d.hp) && num(d.scale) && num(d.radius), `Enemy "${d.id}": hp, scale and radius must be numbers.`);
    for (const a of d.attacks) checkAttack(a, `Enemy "${d.id}"`);
  }
  // Player and items
  const M = PLAYER_DEF.moveset;
  for (const a of Object.values(M.attacks)) checkAttack(a, 'Player');
  for (const group of ['ground', 'air'])
    for (const [action, id] of Object.entries(M[group])) need(id in M.attacks, `Player moveset "${group}.${action}": no attack "${id}".`);
  for (const it of PLAYER_DEF.inventory) need(it.item in ITEMS, `Player inventory: unknown item "${it.item}".`);
  need(PLAYER_DEF.look.weapon in WEAPONS, `Player: unknown weapon "${PLAYER_DEF.look.weapon}".`);
  // Levels
  const levelIds = new Set();
  for (const L of ALL_LEVELS) {
    const where = `Level "${L.id}"`;
    need(typeof L.id === 'string' && !levelIds.has(L.id), `${where}: missing or duplicate id.`);
    levelIds.add(L.id);
    need(L.layout in BUILDERS, `${where}: unknown layout "${L.layout}".`);
    if (L.next) need(ALL_LEVELS.some(o => o.id === L.next), `${where}: next level "${L.next}" does not exist.`);
    if ('attackTokens' in L) need(Number.isInteger(L.attackTokens) && L.attackTokens >= 1, `${where}: attackTokens must be a whole number of at least 1.`);
    if (L.layout === 'rooms') { validateRooms(L, where, need, num); continue; }
    const inX = x => num(x) && x > 0 && x < L.length, inZ = z => num(z) && Math.abs(z) < L.halfZ;
    need(inX(L.start.x) && inZ(L.start.z), `${where}: start point is outside the hall.`);
    const alcoves = new Set(L.alcoves.map(a => a.id));
    need(alcoves.size === L.alcoves.length, `${where}: duplicate alcove ids.`);
    for (const a of L.alcoves) need(inX(a.x) && (a.side === 1 || a.side === -1), `${where}: alcove "${a.id}" needs x inside the hall and side 1 or -1.`);
    let lastGate = 0;
    for (const g of L.gated) {
      const tag = `${where} zone "${g.id}"`;
      need(g.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${g.enemy}" (known: ${Object.keys(ENEMY_BY_ID).join(', ')}).`);
      need(num(g.trigger) && g.spawn && num(g.spawn.x) && num(g.spawn.z) && num(g.spawn.yaw) && num(g.gateX),
        `${tag}: needs trigger, spawn { x, z, yaw } and gateX.`);
      need(g.trigger < g.spawn.x && g.spawn.x < g.gateX, `${tag}: must be ordered trigger < spawn.x < gateX.`);
      need(g.trigger > lastGate, `${tag}: overlaps the previous zone (zones must be in order along the hall).`);
      need(g.gateX < L.length, `${tag}: gate is past the end of the hall.`);
      lastGate = g.gateX;
    }
    for (const s of L.dispersed) {
      const tag = `${where} enemy "${s.enemy}" (${s.behavior})`;
      need(s.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${s.enemy}".`);
      need(s.behavior in BEHAVIORS && !BEHAVIORS[s.behavior].training && s.behavior !== 'arena' && s.behavior !== 'gated',
        `${tag}: unknown or unusable behaviour "${s.behavior}" (use ambush, patrol or slumber).`);
      if (s.behavior === 'ambush') need(alcoves.has(s.alcove), `${tag}: unknown alcove "${s.alcove}".`);
      if (s.behavior === 'patrol') need(Array.isArray(s.path) && s.path.length === 2 && s.path.every(inX) && inZ(s.z), `${tag}: patrol needs path [x1, x2] and z inside the hall.`);
      if (s.behavior === 'slumber') need(inX(s.x) && inZ(s.z) && num(s.yaw), `${tag}: needs x, z and yaw inside the hall.`);
    }
    for (const b of L.bonfires) {
      need(inX(b.x) && inZ(b.z), `${where} bonfire "${b.id}": outside the hall.`);
      for (const side of [-1, 1]) {
        const rx = b.x + side * CONFIG.rest.respawnOffset;
        const z = L.gated.find(g => rx >= g.trigger && rx <= g.gateX);
        need(!z, `${where} bonfire "${b.id}": its respawn point (x ${rx.toFixed(1)}) is inside zone "${z && z.id}".`);
      }
    }
    for (const t of L.torches) need(inX(t.x), `${where}: a torch is outside the hall.`);
    if (L.script === 'tutorial') for (const k of ['dummy', 'sparring']) need(L.training && L.training[k] in ENEMY_BY_ID, `${where}: training.${k} must name an enemy.`);
  }
  // Arena and timings
  need(ARENA.layout in BUILDERS && ARENA.enemyStart && ARENA.playerStart, 'Arena: needs a layout, playerStart and enemyStart.');
  const K = CONFIG.tokens;
  need(Number.isInteger(K.default) && K.default >= 1 && K.frontCone >= 0 && K.frontCone < Math.PI, 'CONFIG.tokens: default must be a whole number of at least 1, frontCone between 0 and pi.');
  const D = CONFIG.death;
  need(D.textDelay + D.textFade <= D.respawnDelay && D.hintDelay < D.respawnDelay, 'CONFIG.death: the YOU DIED text must finish before the respawn.');
  checkVisualData(need, num);   // optional look fields (section 9b)
  return errors;
}
// Room-style level checks (see LEVEL_2).
function validateRooms(L, where, need, num) {
  const rectOk = r => Array.isArray(r) && r.length === 4 && r.every(num) && r[0] < r[1] && r[2] < r[3];
  for (const R of L.rooms) need(rectOk(R.rect), `${where} room "${R.id}": rect must be [x0, x1, z0, z1] with x0 < x1 and z0 < z1.`);
  if (!L.rooms.every(R => rectOk(R.rect))) return;
  const inside = (x, z) => num(x) && num(z) && insideRooms(L.rooms, x, z, 0.3);
  need(inside(L.start.x, L.start.z), `${where}: start point is outside the rooms.`);
  for (const w of roomWalls(L.rooms))
    need(!L.rooms.some(R => w.x0 < R.rect[1] - 1e-6 && w.x1 > R.rect[0] + 1e-6 && w.z0 < R.rect[3] - 1e-6 && w.z1 > R.rect[2] + 1e-6),
      `${where}: a wall cuts into a room near (${w.x0}, ${w.z0}); rooms must touch edge to edge, not overlap.`);
  const ids = new Set();
  for (const g of L.gated) {
    const tag = `${where} zone "${g.id}"`;
    need(!ids.has(g.id), `${tag}: duplicate id.`); ids.add(g.id);
    need(rectOk(g.trigger), `${tag}: trigger must be a rect [x0, x1, z0, z1].`);
    need(g.gate && num(g.gate.x) && num(g.gate.z) && num(g.gate.width) && (g.gate.along === 'x' || g.gate.along === 'z'),
      `${tag}: gate needs x, z, width and along ('x' or 'z').`);
    need(Array.isArray(g.enemies) && g.enemies.length > 0, `${tag}: needs at least one enemy.`);
    for (const m of g.enemies || []) {
      need(m.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${m.enemy}".`);
      need(!m.behavior || m.behavior === 'gated' || m.behavior === 'slumber', `${tag}: enemy behaviour must be gated or slumber.`);
      need(m.spawn && inside(m.spawn.x, m.spawn.z) && num(m.spawn.yaw), `${tag}: enemy "${m.enemy}" spawn is outside the rooms.`);
    }
  }
  for (const s of L.dispersed) {
    const tag = `${where} enemy "${s.enemy}" (${s.behavior})`;
    need(s.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${s.enemy}".`);
    need(s.behavior === 'patrol' || s.behavior === 'slumber', `${tag}: use patrol or slumber in a room level.`);
    if (s.behavior === 'patrol') need(Array.isArray(s.path) && s.path.length === 2 && s.path.every(x => inside(x, s.z)), `${tag}: patrol path is outside the rooms.`);
    if (s.behavior === 'slumber') need(inside(s.x, s.z) && num(s.yaw), `${tag}: needs x, z and yaw inside the rooms.`);
  }
  for (const b of L.bonfires) {
    need(inside(b.x, b.z) && b.spawn && inside(b.spawn.x, b.spawn.z), `${where} bonfire "${b.id}": it and its spawn must be inside the rooms.`);
    const z = b.spawn && L.gated.find(g => rectOk(g.trigger) && inRect(g.trigger, b.spawn.x, b.spawn.z));
    need(!z, `${where} bonfire "${b.id}": its spawn is inside zone "${z && z.id}".`);
  }
}
