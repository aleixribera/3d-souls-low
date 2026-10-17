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
    // Per hit (v4.3): its own `box` (an expanding `ring` round the owner when given), its own `impact`, and `leap`.
    for (const h of Array.isArray(a.hits) ? a.hits : []) {
      if ('box' in h) need(h.box && ['w', 'h', 'd', 'fwd', 'y'].every(k => num(h.box[k])), `${tag}: a hit's box needs w, h, d, fwd and y.`);
      if (h.box && 'ring' in h.box) need(h.box.ring && ['from', 'to', 'width', 'time'].every(k => num(h.box.ring[k]) && h.box.ring[k] >= 0) && h.box.ring.time > 0,
        `${tag}: a hit's ring needs from, to, width and time (numbers; time above 0).`);
      if ('impact' in h) need(h.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(h.impact[k]) && h.impact[k] >= 0), `${tag}: a hit's impact needs ring, crack, dust and shake.`);
      if ('leap' in h) need(h.leap && num(h.leap.from) && h.leap.from > 0 && h.leap.from < 1 && num(h.leap.max) && h.leap.max > 0 && (!('short' in h.leap) || num(h.leap.short)) && !a.dash,
        `${tag}: a hit's leap needs from (0 to 1 of its wind-up) and max (m), optionally short (m); not on a dashing attack.`);
    }
    if (Array.isArray(a.hits) && a.hits.length) checkAttackAnim(a, tag, need);   // four-phase fields (js/attack-anim.js)
  };
  // Enemies
  const ids = new Set();
  for (const d of [...ENEMY_DEFS, ...TRAINING_DEFS, ...TEST_DEFS]) {
    need(typeof d.id === 'string' && !ids.has(d.id), `Enemy "${d.name}": missing or duplicate id "${d.id}".`);
    ids.add(d.id);
    need(d.weapon in WEAPONS, `Enemy "${d.id}": unknown weapon "${d.weapon}".`);
    if (d.crowd) need(['busyMul', 'busyCooldown', 'groupCooldown'].every(k => !(k in d.crowd) || (num(d.crowd[k]) && d.crowd[k] >= 0)),
      `Enemy "${d.id}": crowd may set busyMul, busyCooldown and groupCooldown (numbers, 0 or more).`);
    if (d.model) need(d.model in MODEL_DEFS, `Enemy "${d.id}": unknown model "${d.model}".`);
    if (d.offhand) need(d.offhand in OFFHANDS, `Enemy "${d.id}": unknown off-hand "${d.offhand}".`);
    if (d.idle) need(d.idle in IDLE_STYLES, `Enemy "${d.id}": unknown idle style "${d.idle}".`);
    need(num(d.hp) && num(d.scale) && num(d.radius), `Enemy "${d.id}": hp, scale and radius must be numbers.`);
    for (const a of d.attacks) {
      checkAttack(a, `Enemy "${d.id}"`);
      need(a && num(a.range) && a.range > 0, `Enemy "${d.id}" attack "${a && a.id}": range must be a number above 0.`);
    }
    if ('approach' in d) need(num(d.approach) && d.approach >= 0, `Enemy "${d.id}": approach must be a number of 0 or more (per second).`);
    if ('kite' in d) need(num(d.kite) && d.kite >= 0 && d.kite <= 1, `Enemy "${d.id}": kite must be a number from 0 to 1 (a chance).`);
    if (d.posture) need(['max', 'parry', 'chainGap', 'chainMul', 'decay', 'breakTime', 'hitstop'].every(k => num(d.posture[k])),
      `Enemy "${d.id}": posture needs max, parry, chainGap, chainMul, decay, breakTime and hitstop.`);
    if ('deathFade' in d) need(num(d.deathFade) && d.deathFade > 1, `Enemy "${d.id}": deathFade must be a number of seconds above 1.`);
    // Boss phases (v4.3): each a full health bar; attacks named by id; the transition into it in seconds.
    if ('phases' in d) {
      const P = d.phases, aids = new Set(d.attacks.map(a => a && a.id));
      need(P && typeof P === 'object' && Object.keys(P).length > 0, `Enemy "${d.id}": phases must name at least one phase.`);
      for (const [pid, ph] of Object.entries(P || {})) {
        const tag = `Enemy "${d.id}" phase "${pid}"`;
        need(ph && num(ph.hp) && ph.hp > 0, `${tag}: needs hp above 0.`);
        if (ph && 'attacks' in ph) need(Array.isArray(ph.attacks) && ph.attacks.length > 0 && ph.attacks.every(id => aids.has(id)),
          `${tag}: attacks must list attack ids of the enemy (unknown: ${(ph.attacks || []).filter(id => !aids.has(id)).join(', ')}).`);
        if (ph && 'transition' in ph) need(num(ph.transition) && ph.transition > 0, `${tag}: transition must be seconds above 0.`);
        if (ph && 'name' in ph) need(typeof ph.name === 'string' && ph.name.length > 0, `${tag}: name must be text.`);
      }
      if ('defaultPhases' in d) need(Array.isArray(d.defaultPhases) && d.defaultPhases.length > 0 && d.defaultPhases.every(id => P && id in P), `Enemy "${d.id}": defaultPhases must list its phase ids.`);
    }
    if ('arena' in d) {   // a duel fought on a room level: both starts must stand on its floors
      const L = ALL_LEVELS.find(l => l.id === d.arena), ok = p => p && num(p.x) && num(p.z) && num(p.yaw)
        && L && L.layout === 'rooms' && Number.isFinite(terrainFor(L).floorY(p.x, p.z, p.y));
      need(!!L && L.layout === 'rooms', `Enemy "${d.id}": arena "${d.arena}" must be a room level.`);
      need(ok(d.playerStart) && ok(d.enemyStart), `Enemy "${d.id}": playerStart and enemyStart need x, z and yaw on a floor of "${d.arena}".`);
    }
  }
  // Player and items
  const M = PLAYER_DEF.moveset;
  for (const a of Object.values(M.attacks)) {
    checkAttack(a, 'Player');
    for (const [action, id] of Object.entries(a.next || {})) need(id in M.attacks && action in M.ground, `Player attack "${a.id}": next.${action} -> "${id}" is not a ground action and attack.`);
  }
  // Executions (js/execution.js): the attack they run, and every tuning number.
  need(M.attacks.execute && M.attacks.execute.pose && M.attacks.execute.hits.length === 1, 'Player moveset: executions need a one-hit "execute" attack with a pose.');
  const X = CONFIG.execution;
  need(X && ['range', 'cone', 'facing', 'floor', 'angleWeight', 'snapTime', 'standoff', 'gap', 'chest', 'thrustHeight', 'hitstop', 'grace', 'push', 'cuePulse', 'cueGlow'].every(k => num(X[k]))
    && ['lightMul', 'bossCap'].every(k => num(X.damage[k])) && X.damage.bossCap <= 0.5
    && X.snapTime < M.attacks.execute.hits[0].startup, 'CONFIG.execution: a number is missing, bossCap is above 0.5, or snapTime outlasts the wind-up.');
  for (const group of ['ground', 'air'])
    for (const [action, id] of Object.entries(M[group])) need(id in M.attacks, `Player moveset "${group}.${action}": no attack "${id}".`);
  for (const it of PLAYER_DEF.inventory) need(it.item in ITEMS, `Player inventory: unknown item "${it.item}".`);
  const tri3 = v => Array.isArray(v) && v.length === 3 && v.every(num);
  for (const [id, W] of Object.entries(WEAPONS)) {   // where a weapon glows with embers (an enemy's visual `embers`)
    if ('head' in W) need(tri3(W.head), `Weapon "${id}": head must be [x, y, z].`);
    if ('edge' in W) need(W.edge && tri3(W.edge.size) && tri3(W.edge.at), `Weapon "${id}": edge needs size [w, h, d] and at [x, y, z].`);
  }
  if (PLAYER_DEF.look.model) need(PLAYER_DEF.look.model in MODEL_DEFS, `Player: unknown model "${PLAYER_DEF.look.model}".`);
  need(PLAYER_DEF.look.weapon in WEAPONS, `Player: unknown weapon "${PLAYER_DEF.look.weapon}".`);
  // Levels
  const levelIds = new Set();
  for (const L of ALL_LEVELS) {
    const where = `Level "${L.id}"`;
    need(typeof L.id === 'string' && !levelIds.has(L.id), `${where}: missing or duplicate id.`);
    levelIds.add(L.id);
    need(L.layout in BUILDERS, `${where}: unknown layout "${L.layout}".`);
    if (L.next) need(ALL_LEVELS.some(o => o.id === L.next), `${where}: next level "${L.next}" does not exist.`);
    if ('completeHint' in L) need(typeof L.completeHint === 'string' && L.completeHint.length > 0, `${where}: completeHint must be a line of text.`);
    if ('cull' in L) need(typeof L.cull === 'boolean', `${where}: cull must be true or false.`);
    for (const k of ['wakeZones', 'clearGates']) if (k in L) need(typeof L[k] === 'boolean', `${where}: ${k} must be true or false.`);
    if (L.layout === 'rooms') { validateRooms(L, where, need, num); continue; }
    need(!('houses' in L) && !('props' in L), `${where}: houses and props belong in room levels.`);
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
    if (L.script === 'tutorial') for (const k of ['dummy', 'sparring', 'dodge', 'execution']) need(L.training && L.training[k] in ENEMY_BY_ID, `${where}: training.${k} must name an enemy.`);
  }
  // Arena and timings
  need(ARENA.layout in BUILDERS && ARENA.enemyStart && ARENA.playerStart, 'Arena: needs a layout, playerStart and enemyStart.');
  const Cu = CONFIG.cull;
  need(Number.isInteger(Cu.maxLights) && Cu.maxLights >= 1 && Cu.lightRange > 0 && Cu.fadeBand > 0 && Cu.enemyRange > Math.max(...Object.values(CONFIG.notice)),
    'CONFIG.cull: maxLights must be a whole number of at least 1, ranges above 0, and enemyRange beyond every notice range.');
  const AI = CONFIG.ai, nonNeg = v => num(v) && v >= 0;
  need(['basic', 'dash', 'rollOnly', 'shove', 'projectile'].every(k => nonNeg(AI.chance[k])) && nonNeg(AI.approach) && AI.busyMul >= 0 && AI.busyMul <= 1 && nonNeg(AI.gap)
    && nonNeg(AI.holdInset) && AI.holdMax > 0 && nonNeg(AI.holdBand) && AI.holdSpeedMul > 0 && nonNeg(AI.stepOut) && nonNeg(AI.commitReach) && nonNeg(AI.busyCooldown),
    'CONFIG.ai: chance (basic, dash, rollOnly, shove, projectile), approach, gap, holdInset, holdBand, stepOut, commitReach and busyCooldown must be 0 or more, busyMul between 0 and 1, holdMax and holdSpeedMul above 0.');
  const Se = AI.search, Vi = CONFIG.vision;
  need(AI.kite >= 0 && AI.kite <= 1 && AI.leashResume > 0 && AI.leashResume <= 1 && Se.speedMul > 0 && nonNeg(Se.arrive) && nonNeg(Se.look) && Se.max > 0,
    'CONFIG.ai: kite must be 0..1, leashResume above 0 and at most 1, search.speedMul and search.max above 0, search.arrive and search.look 0 or more.');
  need(Vi.cone > 0 && Vi.cone <= Math.PI && nonNeg(Vi.near), 'CONFIG.vision: cone must be above 0 and at most pi (rad), near 0 or more.');
  const Pl = CONFIG.player;
  need(nonNeg(Pl.exhaustDelay) && Pl.exhaustRecover > 0 && Pl.exhaustRecover <= PLAYER_DEF.stats.maxStamina,
    'CONFIG.player: exhaustDelay must be 0 or more, exhaustRecover above 0 and at most the player maxStamina.');
  need(Array.isArray(CONFIG.hud.text.deathTips) && CONFIG.hud.text.deathTips.length > 0 && CONFIG.hud.text.deathTips.every(t => typeof t === 'string' && t),
    'CONFIG.hud.text.deathTips must be a list of tips (text).');
  const D = CONFIG.death;
  need(D.textDelay + D.textFade <= D.respawnDelay && D.hintDelay < D.respawnDelay, 'CONFIG.death: the YOU DIED text must finish before the respawn.');
  checkVisualData(need, num);   // optional look fields (section 9b)
  // Story mode (js/data/story.js): each chapter and the tutorial name a real level, once each, with a title and a line.
  const storyIds = [STORY.tutorial, ...STORY.chapters].map(c => c && c.level);
  for (const c of [STORY.tutorial, ...STORY.chapters]) {
    const tag = `Story chapter "${c && c.level}"`;
    need(c && LEVELS.some(l => l.id === c.level), `${tag}: no level with that id in LEVELS.`);
    if (!c) continue;
    need(typeof c.title === 'string' && c.title && typeof c.line === 'string', `${tag}: needs a title and a line.`);
    if ('loadout' in c) for (const [id, r] of Object.entries(c.loadout || {}))
      need(id in ITEMS && r && (r.min === undefined || num(r.min)) && (r.max === undefined || num(r.max)), `${tag}: loadout "${id}" must be an item with numeric min / max.`);
  }
  need(new Set(storyIds).size === storyIds.length && STORY.chapters.length > 0, 'Story: each level may appear only once, and there must be a chapter.');
  // Lore (js/data/lore.js, v5.1): the NPC's model, and per level a dialogue, inscriptions and scenes with readable text.
  const lines = a => Array.isArray(a) && a.length > 0 && a.every(t => typeof t === 'string' && t.trim().length > 0);
  need(LORE.npc && typeof LORE.npc.name === 'string' && LORE.npc.model in MODEL_DEFS && num(LORE.npc.scale) && num(LORE.npc.bulk), 'Lore: the NPC needs a name, a model in MODEL_DEFS, scale and bulk.');
  need(lines(LORE.ending), 'Lore: ending must be a list of cards (text).');
  const inscIds = new Set();
  for (const [id, D] of Object.entries(LORE.levels)) {
    const tag = `Lore "${id}"`;
    need(LEVELS.some(l => l.id === id), `${tag}: no level with that id in LEVELS.`);
    for (const N of D.npcs || []) {
      const L = LEVELS.find(l => l.id === id);
      need(num(N.x) && num(N.z) && num(N.yaw) && ['stand', 'sit'].includes(N.pose) && lines(N.lines) && typeof N.idle === 'string', `${tag}: the NPC needs x, z, yaw, pose (stand/sit), lines and an idle line.`);
      if ('solid' in N) need(Array.isArray(N.solid) && N.solid.length === 4 && N.solid.every(num) && N.solid[0] < N.solid[1] && N.solid[2] < N.solid[3], `${tag}: solid must be [x0, x1, z0, z1].`);
      if ('after' in N) need(L && (L.gated || []).some(g => g.id === N.after), `${tag}: the NPC's after must name a zone of the level.`);
      if ('bonfire' in N) need(L && L.bonfires.some(b => b.id === N.bonfire), `${tag}: the NPC's bonfire must name a bonfire of the level.`);
      if ('bars' in N) need(Array.isArray(N.bars) && N.bars.length === 4 && N.bars.every(num), `${tag}: bars must be [x0, z0, x1, z1].`);
    }
    for (const I of D.inscriptions || []) {
      need(typeof I.id === 'string' && !inscIds.has(I.id), `${tag}: inscription ids must be unique strings ("${I.id}").`); inscIds.add(I.id);
      need(num(I.x) && num(I.z) && num(I.yaw) && ['wall', 'floor', 'none'].includes(I.mount) && typeof I.label === 'string' && lines(I.lines), `${tag} inscription "${I.id}": needs x, z, yaw, mount, label and lines.`);
    }
    for (const S of D.scenes || []) need(LORE_SCENES.includes(S.kind) && num(S.x) && num(S.z), `${tag}: scene "${S.kind}" must be one of ${LORE_SCENES.join(', ')} with x and z.`);
  }
  return errors;
}
const GATE_STYLES = ['portcullis', 'barricade'];
const HOUSE_KINDS = ['house', 'tower'];
/// Room-style level checks (see LEVEL_2 and js/terrain.js): shapes first, then the 3D layout built from them.
function validateRooms(L, where, need, num) {
  const H = CONFIG.height, eps = 1e-6;
  const rectOk = r => Array.isArray(r) && r.length === 4 && r.every(num) && r[0] < r[1] && r[2] < r[3];
  const areaOk = a => rectOk(a) || (Array.isArray(a) && a.length > 0 && a.every(rectOk));   // a rect, or a list of them
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
    if ('railHeight' in R) check(num(R.railHeight) && R.railHeight > H.stepUp, `${tag}: railHeight must be a number above CONFIG.height.stepUp (${H.stepUp} m), or a rail could be walked over.`);
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
  // Houses (js/terrain.js, drawn by js/town.js) and props (js/data/props.js): their shapes.
  const houseTag = H => `${where} house at [${H && Array.isArray(H.rect) ? H.rect.join(', ') : '?'}]`;
  if ('houses' in L) check(Array.isArray(L.houses), `${where}: houses must be a list.`);
  for (const Hs of Array.isArray(L.houses) ? L.houses : []) {
    const tag = houseTag(Hs);
    check(Hs && rectOk(Hs.rect), `${tag}: rect must be [x0, x1, z0, z1] with x0 < x1 and z0 < z1.`);
    if (!Hs) continue;
    check(num(Hs.eaves) && Hs.eaves >= 2.5, `${tag}: eaves (its walls' height) must be a number of at least 2.5 m.`);
    check(Hs.kind === undefined || HOUSE_KINDS.includes(Hs.kind), `${tag}: unknown kind "${Hs.kind}" (use ${HOUSE_KINDS.join(' or ')}).`);
    if (Hs.kind !== 'tower') check(Hs.ridge === 'x' || Hs.ridge === 'z', `${tag}: ridge must be 'x' or 'z' (the direction its roof's ridge runs).`);
    if ('y' in Hs) check(num(Hs.y), `${tag}: y (its base) must be a number.`);
    for (const k of ['stone', 'burning', 'ruined']) if (k in Hs) check(typeof Hs[k] === 'boolean', `${tag}: ${k} must be true or false.`);
    if ('lit' in Hs) check(num(Hs.lit) && Hs.lit >= 0 && Hs.lit <= 1, `${tag}: lit (the share of glowing windows) must be from 0 to 1.`);
    if ('rooms' in Hs) check(Array.isArray(Hs.rooms) && Hs.rooms.every(id => ids.has(id)),
      `${tag}: rooms must list regions of the level (unknown: ${(Array.isArray(Hs.rooms) ? Hs.rooms : []).filter(id => !ids.has(id)).join(', ')}).`);
  }
  if ('props' in L) check(Array.isArray(L.props), `${where}: props must be a list.`);
  for (const P of Array.isArray(L.props) ? L.props : []) {
    const tag = `${where} prop "${P && P.kind}" at (${P && P.x}, ${P && P.z})`;
    check(P && P.kind in PROP_KINDS && P.kind in PROP_LOOKS, `${tag}: unknown prop kind "${P && P.kind}" (known: ${Object.keys(PROP_KINDS).join(', ')}).`);
    if (!P) continue;
    check(num(P.x) && num(P.z) && (!('y' in P) || num(P.y)), `${tag}: x and z (and y, if given) must be numbers.`);
    const q = (P.yaw || 0) / (Math.PI / 2);
    check(num(q) && Math.abs(q - Math.round(q)) < 1e-6, `${tag}: yaw must be a quarter turn (a multiple of Math.PI / 2).`);
  }
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
    if (s.region === R || s.kind === 'prop' || s.kind === 'house' || cuts >= 3) continue;   // props and houses: checked below
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
  // A gate in a doorway: a zone's, a shortcut's or a sealed one.
  const checkGate = (gt, tag) => {
    need(gt && num(gt.x) && num(gt.z) && num(gt.width) && (gt.along === 'x' || gt.along === 'z'), `${tag}: gate needs x, z, width and along ('x' or 'z').`);
    if (gt && num(gt.x) && num(gt.z)) need(Number.isFinite(T.floorY(gt.x, gt.z, gt.y)), `${tag}: the gate does not stand on a floor.`);
    if (gt && 'style' in gt) need(GATE_STYLES.includes(gt.style), `${tag}: unknown gate style "${gt.style}" (use ${GATE_STYLES.join(' or ')}).`);
  };
  const zoneIds = new Set();
  for (const g of L.gated) {
    const tag = `${where} zone "${g.id}"`;
    need(!zoneIds.has(g.id), `${tag}: duplicate id.`); zoneIds.add(g.id);
    need(areaOk(g.trigger), `${tag}: trigger must be a rect [x0, x1, z0, z1], or a list of them.`);
    checkGate(g.gate, tag);
    need(Array.isArray(g.enemies) && g.enemies.length > 0, `${tag}: needs at least one enemy.`);
    for (const m of g.enemies || []) {
      need(m.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${m.enemy}".`);
      need(!m.behavior || m.behavior === 'gated' || m.behavior === 'slumber', `${tag}: enemy behaviour must be gated or slumber.`);
      need(m.spawn && onFloor(m.spawn.x, m.spawn.z, m.spawn.y) && num(m.spawn.yaw), `${tag}: enemy "${m.enemy}" spawn does not stand on a floor (or has no yaw).`);
      if ('arena' in m) need(typeof m.arena === 'boolean', `${tag}: arena must be true or false.`);
      if ('boss' in m) {   // a boss placement: which phases it fights, and an optional retreat when the last one ends
        const D = ENEMY_BY_ID[m.enemy], B = m.boss, R = B && B.retreat, tri = v => Array.isArray(v) && v.length === 3 && v.every(num);
        need(D && D.phases && B && Array.isArray(B.phases) && B.phases.length > 0 && B.phases.every(id => id in D.phases),
          `${tag}: boss.phases must list phase ids of "${m.enemy}".`);
        if (B && 'retreat' in B) need(R && ['kneel', 'hop', 'wait', 'fly', 'height'].every(k => num(R[k]) && R[k] >= 0) && R.hop > 0 && R.fly > 0 && tri(R.to) && tri(R.out),
          `${tag}: boss.retreat needs kneel, hop, wait, fly and height (s and m) and to, out ([x, y, z]).`);
      }
    }
  }
  // Shortcut gates: a gate in a doorway that opens for good from its far side (`opensFrom`, a rect).
  if ('shortcuts' in L) need(Array.isArray(L.shortcuts), `${where}: shortcuts must be a list.`);
  for (const sc of Array.isArray(L.shortcuts) ? L.shortcuts : []) {
    const tag = `${where} shortcut "${sc.id}"`;
    need(typeof sc.id === 'string' && !zoneIds.has(sc.id), `${tag}: missing id, or the same as a zone or another shortcut.`); zoneIds.add(sc.id);
    checkGate(sc.gate, tag);
    need(rectOk(sc.opensFrom) && !(sc.gate && inRect(sc.opensFrom, sc.gate.x, sc.gate.z)), `${tag}: opensFrom must be a rect on the gate's far side (not over the gate).`);
  }
  // Sealed gates: always closed, part of no zone (somewhere the player can see but not reach).
  if ('sealed' in L) need(Array.isArray(L.sealed), `${where}: sealed must be a list.`);
  for (const sg of Array.isArray(L.sealed) ? L.sealed : []) {
    const tag = `${where} sealed gate "${sg.id}"`;
    need(typeof sg.id === 'string' && !zoneIds.has(sg.id), `${tag}: missing id, or the same as a zone, a shortcut or another sealed gate.`); zoneIds.add(sg.id);
    checkGate(sg.gate, tag);
    if ('fog' in sg) need(L.gated.some(g => g.id === sg.fog), `${tag}: fog must name the zone it seals (a zone of the level).`);
  }
  // Traps: a collapse area on one room's floor, with a floor below it to land on; a trigger on a floor; a warning time.
  if ('traps' in L) need(Array.isArray(L.traps), `${where}: traps must be a list.`);
  const trapIds = new Set(), inset = r => [[r[0] + 0.3, r[2] + 0.3], [r[1] - 0.3, r[2] + 0.3], [r[0] + 0.3, r[3] - 0.3], [r[1] - 0.3, r[3] - 0.3],
    [(r[0] + r[1]) / 2, (r[2] + r[3]) / 2]];
  for (const t of Array.isArray(L.traps) ? L.traps : []) {
    const tag = `${where} trap "${t.id}"`;
    need(typeof t.id === 'string' && !trapIds.has(t.id), `${tag}: missing or duplicate id.`); trapIds.add(t.id);
    if ('y' in t) need(num(t.y), `${tag}: y (the height of its floor) must be a number.`);
    need(num(t.warning) && t.warning >= 0, `${tag}: warning must be a number of seconds, 0 or more.`);
    const R = rectOk(t.collapse) && (!('y' in t) || num(t.y)) ? trapRoom(T, t) : null;
    need(!!R, `${tag}: its collapse area must be a rect [x0, x1, z0, z1] lying on one room's floor.`);
    if (R) {
      const c = t.collapse, nx = Math.ceil(c[1] - c[0]), nz = Math.ceil(c[3] - c[2]), below = [];
      for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) below.push(T.floorY(lerp(c[0], c[1], i / nx), lerp(c[2], c[3], k / nz), R.lo - H.slab - 0.01));
      need(below.every(Number.isFinite), `${tag}: there must be a floor below its collapse area to land on, not a pit.`);
    }
    need(rectOk(t.trigger) && inset(t.trigger).every(([x, z]) => onFloor(x, z, R ? R.lo : t.y)), `${tag}: its trigger area must be a rect lying on a floor.`);
  }
  for (const s of L.dispersed) {
    const tag = `${where} enemy "${s.enemy}" (${s.behavior})`;
    need(s.enemy in ENEMY_BY_ID, `${tag}: unknown enemy "${s.enemy}".`);
    need(['patrol', 'slumber', 'sentry', 'perch'].includes(s.behavior), `${tag}: use patrol, slumber, sentry or perch in a room level.`);
    if (s.behavior === 'patrol') need(Array.isArray(s.path) && s.path.length === 2 && s.path.every(x => onFloor(x, s.z, s.y)), `${tag}: patrol path does not stand on a floor.`);
    if (s.behavior === 'slumber' || s.behavior === 'sentry' || s.behavior === 'perch') need(onFloor(s.x, s.z, s.y) && num(s.yaw), `${tag}: needs x, z and yaw on a floor.`);
    if ('zone' in s) need(zoneIds.has(s.zone) && L.gated.some(g => g.id === s.zone), `${tag}: zone "${s.zone}" is not a zone of the level.`);
  }
  for (const b of L.bonfires) {
    need(onFloor(b.x, b.z, b.y) && b.spawn && onFloor(b.spawn.x, b.spawn.z, b.spawn.y),
      `${where} bonfire "${b.id}": it and its spawn must stand on a floor (not over a pit).`);
    const z = b.spawn && L.gated.find(g => areaOk(g.trigger) && inArea(g.trigger, b.spawn.x, b.spawn.z));
    need(!z, `${where} bonfire "${b.id}": its spawn is inside zone "${z && z.id}".`);
    if ('litBy' in b) need(L.gated.some(g => g.id === b.litBy), `${where} bonfire "${b.id}": litBy must name a zone of the level.`);
  }
  // The last level's extras (v4.3, js/finale.js): out-of-reach sightings, ambush hints, developer jumps.
  if ('ending' in L) need(typeof L.ending === 'boolean', `${where}: ending must be true or false.`);
  for (const sp of L.spectators || []) {
    const tag = `${where} spectator "${sp.id}"`, D = ENEMY_BY_ID[sp.enemy];
    need(!!D && !!D.model, `${tag}: enemy "${sp.enemy}" must exist and have a model.`);
    need(['x', 'y', 'z', 'yaw', 'watch'].every(k => num(sp[k])) && rectOk(sp.trigger) && Array.isArray(sp.leave) && sp.leave.length === 2 && sp.leave.every(num),
      `${tag}: needs x, y, z, yaw, watch (s), trigger (a rect) and leave [dx, dz].`);
  }
  for (const h of L.hints || []) need(h.kind === 'corpse' && onFloor(h.x, h.z, h.y) && num(h.yaw), `${where}: a hint must be { kind: 'corpse', x, z, yaw } on a floor.`);
  for (const j of L.devJumps || []) need(typeof j.name === 'string' && (j.at === null || L.bonfires.some(b => b.id === j.at)) && Array.isArray(j.won) && j.won.every(id => L.gated.some(g => g.id === id)),
    `${where}: dev jump "${j.name}" needs at (a bonfire id or null) and won (zone ids).`);
  // Houses stand outside the rooms (or free on an open room's floor), on or below the floors they face; an enterable
  // house's rooms lie inside it.
  for (const Hs of L.houses || []) {
    const tag = houseTag(Hs), inner = regions.filter(R => (Hs.rooms || []).includes(R.id)), y = houseBase(Hs, regions), top = y + houseHeight(Hs);
    for (const R of inner) need(within(R.rect, Hs.rect), `${tag}: its room "${R.id}" must lie inside it.`);
    for (const R of regions) {
      if (inner.includes(R) || !overlap(Hs.rect, R.rect) || R.lo - H.slab >= top || R.top <= y) continue;
      const free = R.kind === 'room' && R.open && within(Hs.rect, R.rect) && Math.abs(R.lo - y) < 0.05;
      need(free, `${tag}: overlaps "${R.id}". A house stands outside the rooms, or free on an open room's floor.`);
    }
    const other = (L.houses || []).find(O => O !== Hs && overlap(O.rect, Hs.rect));
    need(!other, `${tag}: overlaps the house at [${other && other.rect.join(', ')}]; houses may touch, not overlap.`);
    const faces = houseFaces(Hs, regions);
    need(faces.length > 0 && y <= Math.min(...faces.map(R => R.lo)) + 0.05,
      `${tag}: is off a floor: it must face a room, and stand at or below the lowest floor it faces (its base is at ${y}).`);
  }
  // Props stand on a floor, inside the walls, and out of the way: no doorway, gate, bonfire, ramp end or spawn.
  const spots = [['the start', L.start], ...L.bonfires.flatMap(b => [[`bonfire "${b.id}"`, b], [`bonfire "${b.id}" spawn`, b.spawn]]),
    ...L.gated.flatMap(g => (g.enemies || []).map(m => [`zone "${g.id}" spawn`, m.spawn])),
    ...L.dispersed.flatMap(s => s.behavior === 'patrol' ? s.path.map(x => [`patrol of "${s.enemy}"`, { x, z: s.z }]) : [[`"${s.enemy}" (${s.behavior})`, s]])];
  const doorways = [];   // a strip across each stretch where two regions meet at the same floor height
  for (const R of regions) for (const k of ['n', 'e']) {
    const E = EDGES[k], O_E = EDGES[E.opp], at = R.rect[E.at];
    for (const O of regions) {
      const lo = Math.max(R.rect[E.lo], O.rect[O_E.lo]), hi = Math.min(R.rect[E.hi], O.rect[O_E.hi]);
      if (O === R || Math.abs(O.rect[O_E.at] - at) > eps || hi - lo < eps) continue;
      const m = (lo + hi) / 2, [x, z] = E.along === 'x' ? [m, at] : [at, m];
      if (Math.abs(R.floorAt(x, z) - O.floorAt(x, z)) > 0.05) continue;
      doorways.push({ ids: [R.id, O.id], r: E.along === 'x' ? [lo, hi, at - 1, at + 1] : [at - 1, at + 1, lo, hi] });
    }
  }
  const gateRects = gatedEntries(L).filter(e => e.gate && num(e.gate.x) && num(e.gate.z) && num(e.gate.width)).map(e => {
    const g = e.gate, w = g.width / 2 + 0.5;
    return { id: e.id, r: g.along === 'x' ? [g.x - w, g.x + w, g.z - 1.5, g.z + 1.5] : [g.x - 1.5, g.x + 1.5, g.z - w, g.z + w] };
  });
  const rampEnds = regions.filter(R => R.kind === 'ramp').flatMap(R => {
    const r = R.rect;
    return R.axis === 'x' ? [[r[0] - 1.5, r[0], r[2], r[3]], [r[1], r[1] + 1.5, r[2], r[3]]].map(e => ({ id: R.id, r: e }))
                          : [[r[0], r[1], r[2] - 1.5, r[2]], [r[0], r[1], r[3], r[3] + 1.5]].map(e => ({ id: R.id, r: e }));
  });
  const walls = T.solids.filter(s => ['wall', 'post', 'lintel', 'house', 'block', 'pillar'].includes(s.kind));
  for (const P of L.props || []) {
    const tag = `${where} prop "${P.kind}" at (${P.x}, ${P.z})`;
    if (!onFloor(P.x, P.z, P.y)) { need(false, `${tag}: does not stand on a floor (or stands over a pit).`); continue; }
    const boxes = propBoxes(P, T.floorY(P.x, P.z, P.y)), flat = boxes.map(b => [b.x0, b.x1, b.z0, b.z1]);
    const hits = r => flat.some(f => overlap(f, r));
    const wall = walls.find(s => boxes.some(b => overlap([b.x0, b.x1, b.z0, b.z1], [s.x0, s.x1, s.z0, s.z1]) && b.y0 < s.y1 - eps && b.y1 > s.y0 + eps));
    need(!wall, `${tag}: cuts into a wall or house (a ${wall && wall.kind} near (${wall && wall.x0.toFixed(1)}, ${wall && wall.z0.toFixed(1)})).`);
    const door = doorways.find(d => hits(d.r));
    need(!door, `${tag}: blocks the doorway between "${door && door.ids[0]}" and "${door && door.ids[1]}".`);
    const gate = gateRects.find(g => hits(g.r));
    need(!gate, `${tag}: blocks gate "${gate && gate.id}".`);
    const end = rampEnds.find(e => hits(e.r));
    need(!end, `${tag}: blocks an end of ramp "${end && end.id}".`);
    const spot = spots.find(([, s]) => s && num(s.x) && num(s.z) && flat.some(f => s.x > f[0] - 0.8 && s.x < f[1] + 0.8 && s.z > f[2] - 0.8 && s.z < f[3] + 0.8));
    need(!spot, `${tag}: stands on a spawn (${spot && spot[0]}).`);
  }
}
