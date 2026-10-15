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
    // Optional mechanics (enemy attacks): roll-only, gap-closing dash, tracking.
    if ('rollOnly' in a) need(typeof a.rollOnly === 'boolean', `${tag}: rollOnly must be true or false.`);
    if ('minRange' in a) need(num(a.minRange) && num(a.range) && a.minRange < a.range, `${tag}: minRange must be a number below range.`);
    if ('chance' in a) need(num(a.chance) && a.chance >= 0, `${tag}: chance must be a number of 0 or more (per second).`);
    if ('dash' in a) need(a.dash && num(a.dash.speed) && a.dash.speed > 0 && num(a.dash.from) && a.dash.from >= 0 && a.dash.from < 1,
      `${tag}: dash needs speed > 0 and from (a fraction of the wind-up, 0 to 1).`);
    if ('track' in a) need(num(a.track) && a.track > 0, `${tag}: track must be a turn rate above 0 (rad/s).`);
    if ('projectile' in a) need(a.projectile && num(a.projectile.speed) && a.projectile.speed > 0 && num(a.projectile.gravity) && a.projectile.gravity >= 0
      && num(a.projectile.size) && a.projectile.size > 0 && num(a.range), `${tag}: projectile needs speed > 0, gravity >= 0 and size > 0, and the attack a range.`);
    if ('shove' in a) need(typeof a.shove === 'boolean', `${tag}: shove must be true or false.`);
    if ('impact' in a) need(a.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(a.impact[k]) && a.impact[k] >= 0),
      `${tag}: impact needs ring, crack, dust and shake (numbers, 0 or more).`);
  };
  // Enemies
  const ids = new Set();
  for (const d of [...ENEMY_DEFS, ...TRAINING_DEFS, ...TEST_DEFS]) {
    need(typeof d.id === 'string' && !ids.has(d.id), `Enemy "${d.name}": missing or duplicate id "${d.id}".`);
    ids.add(d.id);
    need(d.weapon in WEAPONS, `Enemy "${d.id}": unknown weapon "${d.weapon}".`);
    if (d.offhand) need(d.offhand in OFFHANDS, `Enemy "${d.id}": unknown off-hand "${d.offhand}".`);
    if (d.idle) need(d.idle in IDLE_STYLES, `Enemy "${d.id}": unknown idle style "${d.idle}".`);
    need(num(d.hp) && num(d.scale) && num(d.radius), `Enemy "${d.id}": hp, scale and radius must be numbers.`);
    for (const a of d.attacks) {
      checkAttack(a, `Enemy "${d.id}"`);
      need(a && num(a.range) && a.range > 0, `Enemy "${d.id}" attack "${a && a.id}": range must be a number above 0.`);
    }
    if ('approach' in d) need(num(d.approach) && d.approach >= 0, `Enemy "${d.id}": approach must be a number of 0 or more (per second).`);
    if (d.posture) need(['max', 'parry', 'chainGap', 'chainMul', 'decay', 'breakTime', 'damageMul', 'hitstop'].every(k => num(d.posture[k])),
      `Enemy "${d.id}": posture needs max, parry, chainGap, chainMul, decay, breakTime, damageMul and hitstop.`);
    if ('arena' in d) {   // a duel fought on a room level: both starts must stand on its floors
      const L = ALL_LEVELS.find(l => l.id === d.arena), ok = p => p && num(p.x) && num(p.z) && num(p.yaw)
        && L && L.layout === 'rooms' && Number.isFinite(terrainFor(L).floorY(p.x, p.z, p.y));
      need(!!L && L.layout === 'rooms', `Enemy "${d.id}": arena "${d.arena}" must be a room level.`);
      need(ok(d.playerStart) && ok(d.enemyStart), `Enemy "${d.id}": playerStart and enemyStart need x, z and yaw on a floor of "${d.arena}".`);
    }
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
    if ('cull' in L) need(typeof L.cull === 'boolean', `${where}: cull must be true or false.`);
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
        `${tag}: unknown or unusable behaviour "${s.behavior}" (use ambush, patrol, slumber or sentry).`);
      if (s.behavior === 'ambush') need(alcoves.has(s.alcove), `${tag}: unknown alcove "${s.alcove}".`);
      if (s.behavior === 'patrol') need(Array.isArray(s.path) && s.path.length === 2 && s.path.every(inX) && inZ(s.z), `${tag}: patrol needs path [x1, x2] and z inside the hall.`);
      if (s.behavior === 'slumber' || s.behavior === 'sentry') need(inX(s.x) && inZ(s.z) && num(s.yaw), `${tag}: needs x, z and yaw inside the hall.`);
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
  const Cu = CONFIG.cull;
  need(Number.isInteger(Cu.maxLights) && Cu.maxLights >= 1 && Cu.lightRange > 0 && Cu.fadeBand > 0 && Cu.enemyRange > Math.max(...Object.values(CONFIG.notice)),
    'CONFIG.cull: maxLights must be a whole number of at least 1, ranges above 0, and enemyRange beyond every notice range.');
  const AI = CONFIG.ai, nonNeg = v => num(v) && v >= 0;
  need(['basic', 'dash', 'rollOnly', 'shove', 'projectile'].every(k => nonNeg(AI.chance[k])) && nonNeg(AI.approach) && AI.busyMul >= 0 && AI.busyMul <= 1 && nonNeg(AI.gap)
    && nonNeg(AI.holdInset) && AI.holdMax > 0 && nonNeg(AI.holdBand) && AI.holdSpeedMul > 0 && nonNeg(AI.stepOut) && nonNeg(AI.commitReach),
    'CONFIG.ai: chance (basic, dash, rollOnly, shove, projectile), approach, gap, holdInset, holdBand, stepOut and commitReach must be 0 or more, busyMul between 0 and 1, holdMax and holdSpeedMul above 0.');
  const D = CONFIG.death;
  need(D.textDelay + D.textFade <= D.respawnDelay && D.hintDelay < D.respawnDelay, 'CONFIG.death: the YOU DIED text must finish before the respawn.');
  checkVisualData(need, num);   // optional look fields (section 9b)
  return errors;
}
/// Room-style level checks (see LEVEL_2 and js/terrain.js): shapes first, then the 3D layout built from them.
function validateRooms(L, where, need, num) {
  const H = CONFIG.height, eps = 1e-6;
  const rectOk = r => Array.isArray(r) && r.length === 4 && r.every(num) && r[0] < r[1] && r[2] < r[3];
  const within = (p, r) => p[0] >= r[0] && p[1] <= r[1] && p[2] >= r[2] && p[3] <= r[3];
  const edgesOk = e => e === undefined || (!!e && typeof e === 'object' && Object.entries(e).every(([k, v]) => k in EDGES && EDGE_KINDS.includes(v)));
  let shapesOk = true;
  const check = (ok, msg) => { need(ok, msg); if (!ok) shapesOk = false; };
  check(num(L.wallHeight), `${where}: wallHeight must be a number.`);
  const ids = new Set();
  for (const R of L.rooms) {
    const tag = `${where} room "${R.id}"`;
    check(typeof R.id === 'string' && !ids.has(R.id), `${tag}: missing or duplicate id.`); ids.add(R.id);
    check(rectOk(R.rect), `${tag}: rect must be [x0, x1, z0, z1] with x0 < x1 and z0 < z1.`);
    if ('y' in R) check(num(R.y), `${tag}: y (floor height) must be a number.`);
    if ('height' in R) check(num(R.height) && R.height >= 2.5, `${tag}: height (headroom) must be at least 2.5 m.`);
    if ('open' in R) check(typeof R.open === 'boolean', `${tag}: open must be true or false.`);
    check(edgesOk(R.edges), `${tag}: edges must map n, s, e or w to 'wall', 'rail' or 'open'.`);
    if ('pits' in R) check(Array.isArray(R.pits) && rectOk(R.rect) && R.pits.every(p => rectOk(p) && within(p, R.rect)), `${tag}: pits must be rects inside the room.`);
    if ('grass' in R) check(typeof R.grass === 'boolean' && (!R.grass || R.open === true), `${tag}: grass must be true or false, and grows only in an open room.`);
    if ('lamps' in R) check(Array.isArray(R.lamps) && rectOk(R.rect) && R.lamps.every(l => Array.isArray(l) && l.length === 2 && l.every(num)
      && inRect(R.rect, l[0], l[1])), `${tag}: lamps must be a list of [x, z] inside the room.`);
  }
  if ('ramps' in L) check(Array.isArray(L.ramps), `${where}: ramps must be a list.`);
  for (const R of Array.isArray(L.ramps) ? L.ramps : []) {
    const tag = `${where} ramp "${R.id}"`;
    check(typeof R.id === 'string' && !ids.has(R.id), `${tag}: missing or duplicate id.`); ids.add(R.id);
    check(rectOk(R.rect), `${tag}: rect must be [x0, x1, z0, z1] with x0 < x1 and z0 < z1.`);
    check(R.axis === 'x' || R.axis === 'z', `${tag}: axis must be 'x' or 'z' (the direction it rises along).`);
    check(num(R.from) && num(R.to), `${tag}: from and to (the floor height at the low and high coordinate ends) must be numbers.`);
    if ('height' in R) check(num(R.height) && R.height >= 2.5, `${tag}: height (headroom) must be at least 2.5 m.`);
    if ('stairs' in R) check(typeof R.stairs === 'boolean', `${tag}: stairs must be true or false.`);
    check(edgesOk(R.edges), `${tag}: edges must map n, s, e or w to 'wall', 'rail' or 'open'.`);
    if (rectOk(R.rect) && num(R.from) && num(R.to) && (R.axis === 'x' || R.axis === 'z')) {
      const len = R.axis === 'x' ? R.rect[1] - R.rect[0] : R.rect[3] - R.rect[2];
      check(Math.abs(R.to - R.from) / len <= H.maxSlope + eps, `${tag}: too steep (more than ${H.maxSlope} m of rise per metre).`);
    }
  }
  if ('blocks' in L) check(Array.isArray(L.blocks) && L.blocks.every(B => B && rectOk(B.rect) && num(B.y0) && num(B.y1) && B.y0 < B.y1),
    `${where}: blocks must be a list of { rect, y0, y1 } with y0 < y1.`);
  if (!shapesOk) return;

  const T = terrainFor(L), regions = T.regions;
  const overlap = (a, b) => a[0] < b[1] - eps && a[1] > b[0] + eps && a[2] < b[3] - eps && a[3] > b[2] + eps;
  // Regions over the same ground must sit in separate height bands (a walkway above a courtyard).
  for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
    const A = regions[i], B = regions[j];
    if (overlap(A.rect, B.rect)) need(A.top <= B.lo - H.slab + eps || B.top <= A.lo - H.slab + eps,
      `${where}: "${A.id}" and "${B.id}" overlap. Regions over the same ground need separate heights: one's top at or below the other's floor slab.`);
  }
  // Both ends of every ramp meet a floor at the ramp's height there.
  for (const R of regions.filter(R => R.kind === 'ramp')) {
    for (const k of R.axis === 'x' ? ['w', 'e'] : ['s', 'n']) {
      const E = EDGES[k], O_E = EDGES[E.opp], at = R.rect[E.at], mid = (R.rect[E.lo] + R.rect[E.hi]) / 2;
      const [x, z] = E.along === 'x' ? [mid, at] : [at, mid], h = R.floorAt(x, z);
      const met = regions.some(O => O !== R && Math.abs(O.rect[O_E.at] - at) < eps && O.rect[O_E.lo] <= R.rect[E.lo] + eps
        && O.rect[O_E.hi] >= R.rect[E.hi] - eps && Math.abs(O.floorAt(x, z) - h) < 0.05);
      need(met, `${where} ramp "${R.id}": its ${k} end must meet a room or ramp across its whole width at height ${h}.`);
    }
  }
  // Walls never cut into another region's walkable space (rails and ledge faces sit inside their own region).
  // A ramp's walkable band is taken over the wall's own footprint, since its floor rises along it.
  const bandOver = (R, s) => {
    if (R.kind !== 'ramp') return [R.lo, R.top];
    const xs = [clamp(s.x0, R.rect[0], R.rect[1]), clamp(s.x1, R.rect[0], R.rect[1])], zs = [clamp(s.z0, R.rect[2], R.rect[3]), clamp(s.z1, R.rect[2], R.rect[3])];
    const f = [R.floorAt(xs[0], zs[0]), R.floorAt(xs[1], zs[1])];
    return [Math.min(...f), Math.max(...f) + R.height];
  };
  let cuts = 0;
  for (const s of T.solids) for (const R of regions) {
    if (s.region === R || cuts >= 3) continue;
    const [lo, top] = bandOver(R, s);
    if (overlap([s.x0, s.x1, s.z0, s.z1], R.rect) && s.y0 < top - eps && s.y1 > lo + eps) {
      cuts++;
      need(false, `${where}: a ${s.kind} near (${s.x0.toFixed(1)}, ${s.z0.toFixed(1)}) cuts into "${R.id}"; rooms must touch edge to edge, not overlap.`);
    }
  }
  // Placements stand on a floor (at the given height, if any), inside a region, not over a pit.
  const onFloor = (x, z, y) => {
    if (!num(x) || !num(z) || (y !== undefined && !num(y))) return false;
    const f = T.floorY(x, z, y);
    if (!Number.isFinite(f) || (y !== undefined && Math.abs(f - y) > H.stepUp)) return false;
    return regions.some(R => x >= R.rect[0] + 0.3 && x <= R.rect[1] - 0.3 && z >= R.rect[2] + 0.3 && z <= R.rect[3] - 0.3
      && Math.abs(R.floorAt(x, z) - f) < 0.01);
  };
  need(onFloor(L.start.x, L.start.z, L.start.y), `${where}: the start point does not stand on a floor.`);
  const zoneIds = new Set();
  for (const g of L.gated) {
    const tag = `${where} zone "${g.id}"`;
    need(!zoneIds.has(g.id), `${tag}: duplicate id.`); zoneIds.add(g.id);
    need(rectOk(g.trigger), `${tag}: trigger must be a rect [x0, x1, z0, z1].`);
    need(g.gate && num(g.gate.x) && num(g.gate.z) && num(g.gate.width) && (g.gate.along === 'x' || g.gate.along === 'z'),
      `${tag}: gate needs x, z, width and along ('x' or 'z').`);
    if (g.gate && num(g.gate.x) && num(g.gate.z)) need(Number.isFinite(T.floorY(g.gate.x, g.gate.z, g.gate.y)), `${tag}: the gate does not stand on a floor.`);
    need(Array.isArray(g.enemies) && g.enemies.length > 0, `${tag}: needs at least one enemy.`);
    for (const m of g.enemies || []) {
      need(m.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${m.enemy}".`);
      need(!m.behavior || m.behavior === 'gated' || m.behavior === 'slumber', `${tag}: enemy behaviour must be gated or slumber.`);
      need(m.spawn && onFloor(m.spawn.x, m.spawn.z, m.spawn.y) && num(m.spawn.yaw), `${tag}: enemy "${m.enemy}" spawn does not stand on a floor (or has no yaw).`);
    }
  }
  // Shortcut gates: a gate in a doorway that opens for good from its far side (`opensFrom`, a rect).
  if ('shortcuts' in L) need(Array.isArray(L.shortcuts), `${where}: shortcuts must be a list.`);
  for (const sc of Array.isArray(L.shortcuts) ? L.shortcuts : []) {
    const tag = `${where} shortcut "${sc.id}"`;
    need(typeof sc.id === 'string' && !zoneIds.has(sc.id), `${tag}: missing id, or the same as a zone or another shortcut.`); zoneIds.add(sc.id);
    need(sc.gate && num(sc.gate.x) && num(sc.gate.z) && num(sc.gate.width) && (sc.gate.along === 'x' || sc.gate.along === 'z'),
      `${tag}: gate needs x, z, width and along ('x' or 'z').`);
    if (sc.gate && num(sc.gate.x) && num(sc.gate.z)) need(Number.isFinite(T.floorY(sc.gate.x, sc.gate.z, sc.gate.y)), `${tag}: the gate does not stand on a floor.`);
    need(rectOk(sc.opensFrom) && !(sc.gate && inRect(sc.opensFrom, sc.gate.x, sc.gate.z)), `${tag}: opensFrom must be a rect on the gate's far side (not over the gate).`);
  }
  for (const s of L.dispersed) {
    const tag = `${where} enemy "${s.enemy}" (${s.behavior})`;
    need(s.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${s.enemy}".`);
    need(['patrol', 'slumber', 'sentry'].includes(s.behavior), `${tag}: use patrol, slumber or sentry in a room level.`);
    if (s.behavior === 'patrol') need(Array.isArray(s.path) && s.path.length === 2 && s.path.every(x => onFloor(x, s.z, s.y)), `${tag}: patrol path does not stand on a floor.`);
    if (s.behavior === 'slumber' || s.behavior === 'sentry') need(onFloor(s.x, s.z, s.y) && num(s.yaw), `${tag}: needs x, z and yaw on a floor.`);
  }
  for (const b of L.bonfires) {
    need(onFloor(b.x, b.z, b.y) && b.spawn && onFloor(b.spawn.x, b.spawn.z, b.spawn.y),
      `${where} bonfire "${b.id}": it and its spawn must stand on a floor (not over a pit).`);
    const z = b.spawn && L.gated.find(g => rectOk(g.trigger) && inRect(g.trigger, b.spawn.x, b.spawn.z));
    need(!z, `${where} bonfire "${b.id}": its spawn is inside zone "${z && z.id}".`);
  }
}
