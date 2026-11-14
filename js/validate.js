'use strict';
// ============================================================================
// 2d. Data check
// ============================================================================
// Verifies every cross-reference and the level ordering rules. Any problem stops the game at load
// with a readable list on screen, instead of a frozen screen or a soft-locked level later.
// The server (server/headless.cjs) runs it with `{ visual: false }`: everything but the checks that need the drawing
// half of the game (models, spectral weapons, stage builders, looks and realms), which the browser still runs.
function validateData({ visual = true } = {}) {
  const errors = [];
  const need = (ok, msg) => { if (!ok) errors.push(msg); };
  const introIds = new Set();
  for (const intro of LOBBY_INTROS) {
    need(!introIds.has(intro.id), `Duplicate lobby intro: ${intro.id}.`); introIds.add(intro.id);
    need(ArenaNet.config.gauntlets[intro.id] || [ArenaNet.config.calling.id, ArenaNet.config.weekly.id].includes(intro.id) || STORIES.some(s => s.id === intro.id && s.lobbyName), `Unknown lobby intro: ${intro.id}.`);
    for (const field of ['title', 'goal']) need(typeof intro[field] === 'string' && intro[field].trim(), `Lobby intro ${intro.id}: missing ${field}.`);
  }
  for (const id of [ArenaNet.config.calling.id, ArenaNet.config.weekly.id, ...Object.keys(ArenaNet.config.gauntlets), ...STORIES.filter(s => s.lobbyName).map(s => s.id)]) need(introIds.has(id), `Missing lobby intro: ${id}.`);
  // The changelog in the game (js/data/changelog.js): newest first, starting at the running version.
  need(Array.isArray(CHANGELOG) && CHANGELOG.length && CHANGELOG[0].version === VERSION, `Changelog: the first entry must be the running version ${VERSION} (js/data/changelog.js).`);
  const changeLabels = new Set();
  for (const c of CHANGELOG || []) {
    for (const field of ['version', 'title', 'text']) need(typeof c[field] === 'string' && c[field].trim(), `Changelog ${c.version}: missing ${field}.`);
    need(!changeLabels.has(c.version), `Changelog: ${c.version} is listed twice.`); changeLabels.add(c.version);
  }
  for (const [id, s] of Object.entries(LESSONS)) {
    need(typeof s.title === 'string' && s.title.trim() && typeof s.text === 'function', `Lesson ${id}: needs a title and text().`);
    need(typeof s.on === 'function' || typeof s.check === 'function', `Lesson ${id}: missing completion rule.`);
    need(Array.isArray(s.keys) && s.keys.length > 0 && s.keys.every(k => k === 'move' || k === 'camera' || typeof ACTIONS === 'undefined' || (typeof k === 'string' ? k in ACTIONS
      : !!k && k.action in ACTIONS && typeof k.key === 'string' && ACTIONS[k.action].includes(k.key))), `Lesson ${id}: keys must name actions (or { action, key } with a key bound to it).`);   // the server has no ACTIONS
  }
  const num = v => typeof v === 'number' && Number.isFinite(v);
  need(BOSS_TEAMS.length === 2 && new Set(BOSS_TEAMS.map(t => t.id)).size === 2,
    'Boss battle needs two teams with unique string ids.');
  for (const t of BOSS_TEAMS) need(typeof t.id === 'string' && typeof t.name === 'string' && /^#[0-9a-f]{6}$/i.test(t.color) && [-1, 1].includes(t.side),
    `Boss battle team ${t.id}: invalid name, color or side.`);
  need(CONFIG.bossBattle.maxTeam === 6, 'Boss battle team limit must be six.');
  for (const k of ['notice', 'spacing', 'startX', 'rowWidth', 'victoryTime']) need(num(CONFIG.bossBattle[k]) && CONFIG.bossBattle[k] > 0, `Boss battle: ${k} must be positive.`);
  for (const [k, v] of Object.entries(CONFIG.bossBattle.camera)) need(num(v) && v > 0, `Boss battle camera: ${k} must be positive.`);
  need(Number.isInteger(CONFIG.practice.maxGroup) && CONFIG.practice.maxGroup >= 2, 'Practice: maxGroup must be a whole number, 2 or more.');
  const PF = CONFIG.practice.fights;
  need(Array.isArray(PF) && PF[0] === 1 && PF.every((f, i) => Number.isInteger(f) && (i === 0 || f > PF[i - 1])),
    'Practice: fights must be whole numbers, rising, starting at 1 (the base pace).');
  for (const [key, value] of Object.entries(CONFIG.companion)) need(num(value) && value > 0, `Companion ${key} must be positive.`);
  need(CONFIG.companion.separationShare <= 1, 'Companion separationShare must be at most 1.');
  const botConfig = CONFIG.bot, nav = botConfig.navigation || {};
  need(num(botConfig.assignmentTime) && botConfig.assignmentTime > 0, 'Bot assignmentTime must be positive.');
  need(Array.isArray(botConfig.follow) && botConfig.follow.length === 2 && botConfig.follow.every(num) && botConfig.follow[0] > 0 && botConfig.follow[1] > botConfig.follow[0],
    'Bot follow needs ordered positive inner/outer distances.');
  for (const key of ['cell', 'sample', 'tile', 'clearance', 'heightTolerance', 'maxDrop', 'anchor', 'anchors', 'maxNodes', 'searchSteps', 'waypoint', 'lookAhead',
    'goalMoved', 'replan', 'retry', 'directionEpsilon', 'progressTime', 'progressDistance', 'stuckTime', 'recoverMin', 'recoverMax'])
    need(num(nav[key]) && nav[key] > 0, `Bot navigation.${key} must be positive.`);
  need(Number.isInteger(nav.anchors) && Number.isInteger(nav.maxNodes) && Number.isInteger(nav.searchSteps) && nav.sample <= nav.cell &&
    nav.maxDrop < CONFIG.fall.lethal && nav.progressTime < nav.stuckTime && nav.recoverMin < nav.recoverMax,
    'Bot navigation needs integer search limits, fine floor samples and ordered recovery limits.');
  // Boss Rush's abilities (v7.70.0, js/abilities.js): every card can be drawn and read.
  const BL = CONFIG.abilities, RAR = BL.rarity || {};
  need(Number.isInteger(BL.offer) && BL.offer >= 1 && num(BL.pickTime) && BL.pickTime > 0 && num(BL.pickHold) && BL.pickHold >= 0 && BL.pickHold < BL.pickTime,
    'CONFIG.abilities: offer a whole number of 1 or more, pickTime positive, pickHold 0 or more and under pickTime.');
  need(['common', 'rare', 'legendary'].every(r => RAR[r]) && Object.values(RAR).every(R => Number.isInteger(R.levels) && R.levels >= 1 && num(R.weight) && R.weight >= 0 && num(R.grow) && R.grow >= 0),
    'CONFIG.abilities.rarity: common, rare and legendary, each with whole levels of 1 or more and a weight and grow of 0 or more.');
  need(new Set(ABILITIES.map(b => b.id)).size === ABILITIES.length, 'Ability ids must be unique.');
  const SUM = BL.summons;   // where each summon stands and how fast it runs (js/abilities.js summonStep)
  need(SUM && [SUM.arrive, SUM.near, SUM.side, SUM.radius].every(x => num(x) && x >= 0) && [...SUMMONS].every(k => SUM[k] && num(SUM[k].gap) && SUM[k].gap >= 0
    && num(SUM[k].flank) && num(SUM[k].speed) && SUM[k].speed > 0 && num(SUM[k].height) && SUM[k].height > 0 && [undefined, true, false].includes(SUM[k].rises)) && [...SUMMON_STRIKERS].every(k => num(SUM[k].reach) && SUM[k].reach > 0),
    `CONFIG.abilities.summons: arrive, near, side and radius 0 or more; each summon (${[...SUMMONS].join(', ')}) a gap, a flank, a speed and a height above 0 (rises true or false); each that strikes (${[...SUMMON_STRIKERS].join(', ')}) a reach above 0.`);
  // A summon drawn in an enemy's figure (js/summon-figures.js): an enemy with a model, and one of its attacks to strike with.
  if (visual) for (const [k, F] of Object.entries(CONFIG.VISUALS.abilityFx)) if (F && F.figure !== undefined) {
    const d = ENEMY_BY_ID[F.figure];
    need(!!d && !!d.model && d.attacks.some(a => a.id === F.move && ATTACK_POSES[a.pose]), `CONFIG.VISUALS.abilityFx.${k}: figure must be an enemy with a model and move one of its attacks with key poses.`);
    need(['windup', 'rise', 'fade', 'strikeGlow', 'cryTime', 'turn', 'scale'].every(n => num(F[n]) && F[n] > 0) && !!F.guard && !!F.cry,
      `CONFIG.VISUALS.abilityFx.${k}: a figure needs windup, rise, fade, strikeGlow, cryTime, turn and scale above 0, and guard and cry poses.`);
  }
  // An ability's text is only its trigger and effect, in the fewest plain words (Aleix, 2026-11-14; a {key} is one word).
  const ABILITY_TEXT_MAX = { words: 9, chars: 56 };
  for (const b of ABILITIES) {
    const where = `Ability ${b.id}`, R = RAR[b.rarity], kinds = ['mods', 'perk', 'power'].filter(k => b[k]);
    need(typeof b.id === 'string' && /^[a-z0-9-]+$/.test(b.id) && typeof b.name === 'string' && b.name.trim() && typeof b.text === 'string' && b.text.trim(),
      `${where}: an id (a-z, 0-9, -), a name and a text.`);
    if (typeof b.text === 'string') { const words = b.text.replace(/\{\w+\}/g, 'n').trim().split(/\s+/).length;
      need(words <= ABILITY_TEXT_MAX.words && b.text.length <= ABILITY_TEXT_MAX.chars,
        `${where}: its text is ${words} words and ${b.text.length} characters; at most ${ABILITY_TEXT_MAX.words} and ${ABILITY_TEXT_MAX.chars}: only the trigger and the effect.`); }
    need(!!R, `${where}: unknown rarity ${b.rarity} (CONFIG.abilities.rarity).`);
    need(kinds.length === 1 && (b.mods ? b.rarity === 'common' : b.perk ? b.rarity === 'rare' : b.rarity !== 'common'),
      `${where}: one of mods (a common), perk (a rare) or power (a rare or a legendary).`);
    if (!R || kinds.length !== 1 || !Array.isArray(b.levels)) { need(Array.isArray(b.levels), `${where}: levels must be a list.`); continue; }
    need(b.levels.length === R.levels, `${where}: ${R.levels} levels for a ${b.rarity}.`);
    const plan = b.perk ? ABILITY_PERKS[b.perk.when + '/' + b.perk.then] : b.power ? ABILITY_POWERS[b.power.when + '/' + b.power.then] : null;
    if (b.perk) need(!!plan, `${where}: unknown perk ${b.perk.when}/${b.perk.then} (ABILITY_PERKS).`);
    if (b.power) {
      need(!!plan, `${where}: unknown power ${b.power.when}/${b.power.then} (ABILITY_POWERS).`);
      need(b.power.action === undefined || Object.hasOwn(PLAYER_DEF.moveset.air, b.power.action), `${where}: power action must be one of the player's air attacks.`);
      need(b.power.once === undefined || typeof b.power.once === 'boolean', `${where}: power once must be true or false.`);
    }
    const keys = Object.keys(b.levels[0] || {});
    for (const [i, v] of b.levels.entries()) {
      need(v && Object.keys(v).length && Object.values(v).every(x => num(x) && x > 0), `${where}: level ${i + 1} needs positive numbers.`);
      need(v && Object.keys(v).join() === keys.join(), `${where}: every level has the same numbers.`);
      need(v && Object.entries(v).every(([k, x]) => (ABILITY_UNITS[k] !== 'n' || Number.isInteger(x)) && (!ABILITY_SHARES.includes(k) || x <= 1)),
        `${where}: level ${i + 1}: counts whole, shares (${ABILITY_SHARES.join(', ')}) at most 1.`);
      if (b.mods) need(v && Object.keys(v).every(k => Object.hasOwn(ABILITY_MODS, k)) && (ABILITY_MODS[keys[0]] !== 'less' || Object.values(v).every(x => x < 1)),
        `${where}: level ${i + 1}: each number one of ABILITY_MODS (a cut below 1).`);
      if (plan) need(v && plan.every(k => num(v[k])), `${where}: level ${i + 1} needs ${plan.join(', ')}.`);
      if (i && v && b.mods) need(keys.every(k => v[k] > b.levels[i - 1][k]), `${where}: each level gives more than the one before.`);
    }
    for (const m of b.text.matchAll(/\{(\w+)\}/g)) need(keys.includes(m[1]), `${where}: its text names {${m[1]}}, not one of its numbers.`);
    need(!/\{[^}]*$|^[^{]*\}/.test(b.text), `${where}: unbalanced braces in its text.`);
    if (visual) need(typeof ABILITY_ICONS === 'object' && typeof ABILITY_ICONS[b.id] === 'string', `${where}: no icon in ABILITY_ICONS (js/ability-cards.js).`);
  }
  for (const k of Object.keys(ABILITY_UNITS)) need(['s', 'm', 'n'].includes(ABILITY_UNITS[k]), `ABILITY_UNITS ${k}: s, m or n.`);
  // Levels and crates (js/data/crates.js): every crate ability is a reward, and every reward is whole.
  const CR = CRATES, whole0 = x => Number.isInteger(x) && x >= 0, crateWords = t => t.trim().split(/\s+/).length;
  need(CR && ['boss', 'crowned', 'minute', 'least'].every(k => whole0(CR.xp?.[k])) && ['first', 'step', 'most'].every(k => whole0(CR.level?.[k])) && CR.level.first > 0 && CR.level.most >= CR.level.first,
    'CRATES: xp boss, crowned, minute and least, and level first, step and most, whole numbers of 0 or more (first above 0, most at least first).');
  need(Object.keys(RAR).every(r => num(CR.odds?.[r]) && CR.odds[r] >= 0) && Object.values(CR.odds).some(w => w > 0), 'CRATES.odds: a weight of 0 or more for each rarity, one above 0.');
  need(Number.isInteger(CR.roll?.tiles) && Number.isInteger(CR.roll.land) && CR.roll.land > 0 && CR.roll.land < CR.roll.tiles - 2 && num(CR.roll.time) && CR.roll.time > 0 && num(CR.roll.still) && CR.roll.still > 0,
    'CRATES.roll: whole tiles, the reward at a whole land with tiles after it, a time and a still above 0.');
  need(new Set(CR.rewards.map(r => r.id)).size === CR.rewards.length, 'CRATES: reward ids must be unique.');
  for (const r of CR.rewards) {
    const where = `Crate reward ${r.id}`;
    need(typeof r.id === 'string' && /^[a-z0-9-]+$/.test(r.id) && ['look', 'ability'].includes(r.kind) && [undefined, true].includes(r.start), `${where}: an id (a-z, 0-9, -), a kind (look or ability), start only true.`);
    if (r.kind === 'look') {
      need(typeof r.name === 'string' && r.name.trim() && typeof r.text === 'string' && r.text.trim() && crateWords(r.text) <= ABILITY_TEXT_MAX.words && r.text.length <= ABILITY_TEXT_MAX.chars,
        `${where}: a name, and a text of at most ${ABILITY_TEXT_MAX.words} words and ${ABILITY_TEXT_MAX.chars} characters.`);
      need(!!RAR[r.rarity] && whole0(r.tint) && r.tint <= 0xffffff && num(r.metal) && r.metal >= 0 && r.metal <= 1 && num(r.rough) && r.rough > 0 && r.rough <= 1.5
        && (r.glow === undefined ? r.glowK === undefined : whole0(r.glow) && r.glow <= 0xffffff && num(r.glowK) && r.glowK > 0 && r.glowK <= 1),
        `${where}: a rarity, a tint colour, metal 0..1 and rough above 0 up to 1.5, and a glow colour only with a glowK above 0, at most 1.`);
    } else need(ABILITY_BY_ID[r.ability]?.crate === true && !r.start && r.rarity === undefined, `${where}: an ability with crate: true, never a start, its rarity the ability's.`);
  }
  need(CR.rewards.some(r => r.kind === 'look' && r.start), 'CRATES: one blade look owned from the start.');
  for (const b of ABILITIES) if (b.crate !== undefined) need(b.crate === true && CR.rewards.some(r => r.ability === b.id), `Ability ${b.id}: crate is only true, and a crate reward must give it.`);
  for (const r of Object.keys(RAR)) need(ABILITIES.filter(b => b.rarity === r && !b.crate).length >= BL.offer + CONFIG.swift.extra, `Abilities: at least ${BL.offer + CONFIG.swift.extra} of rarity ${r} outside the crates, to fill an offer.`);
  need(num(botConfig.parryChanceScale) && botConfig.parryChanceScale >= 0 && botConfig.parryChanceScale <= 1, 'Bot parryChanceScale must be 0..1.');
  for (const [group, fields] of Object.entries({ tempo: ['comboBase', 'comboAggression', 'punishCombo', 'finishBelow', 'regroupBelow'],
    defence: ['walkMargin', 'walkLead', 'margin', 'clear'], string: ['outrun'], execution: ['yield', 'late', 'aside'], jumpDodge: ['clearance', 'timingMargin', 'followMargin', 'maxSpeed'] }))
    for (const key of fields) need(num(botConfig[group]?.[key]) && botConfig[group][key] >= 0, `Bot ${group}.${key} must be non-negative.`);
  // Temperaments (v7.52.0): ordered positive pairs and positive gaps.
  const pair = r => Array.isArray(r) && r.length === 2 && r.every(num) && r[0] >= 0 && r[1] >= r[0];
  need(pair(botConfig.moodJitter) && botConfig.moodJitter[0] > 0 && pair(botConfig.slip?.early) && pair(botConfig.slip?.late) && num(botConfig.slip.lateShare) && botConfig.slip.lateShare >= 0 && botConfig.slip.lateShare <= 1 &&
    num(botConfig.behindMargin) && botConfig.behindMargin >= 0 && num(botConfig.fightGap) && botConfig.fightGap > 0,
    'Bot moodJitter, slip.early and slip.late need ordered pairs and slip.lateShare a share (0..1); behindMargin and fightGap must be non-negative and positive.');
  for (const key of ['comboBase', 'comboAggression', 'punishCombo', 'finishBelow', 'regroupBelow'])
    need(botConfig.tempo[key] <= 1, `Bot tempo.${key} must be 0..1.`);
  for (const key of ['punishWindow', 'punishRecovery', 'punishCommit']) need(num(botConfig.tempo[key]) && botConfig.tempo[key] > 0, `Bot tempo.${key} must be positive.`);
  for (const key of ['windowSlack', 'minWindow', 'reserve'])
    need(num(botConfig.risk?.[key]) && botConfig.risk[key] > 0, `Bot risk.${key} must be positive.`);
  for (const key of ['combo', 'earlyRollChance'])
    need(num(botConfig.risk?.[key]) && botConfig.risk[key] >= 0 && botConfig.risk[key] <= 1, `Bot risk.${key} must be 0..1.`);
  for (const key of ['interval', 'duration', 'rollLead']) {
    const range = botConfig.risk?.[key];
    need(Array.isArray(range) && range.length === 2 && range.every(num) && range[0] > 0 && range[1] >= range[0],
      `Bot risk.${key} needs an ordered positive range.`);
  }
  // An aid, not a carry (pass 32, pass 35): caution, room and support; a bot keeps a player's full stats.
  const CA = botConfig.caution, RM = botConfig.room, SU = botConfig.support;
  need(CA && ['below', 'dry', 'slip'].every(k => num(CA[k]) && CA[k] >= 0 && CA[k] <= 1) && ['spacing', 'hunted', 'company', 'safety'].every(k => num(CA[k]) && CA[k] >= 0) && num(CA.patience) && CA.patience >= 1,
    'Bot caution needs below, dry and slip shares (0..1), non-negative spacing, hunted, company and safety, and patience of 1 or more.');
  need(RM && ['player', 'bot', 'lane', 'laneDepth', 'push'].every(k => num(RM[k]) && RM[k] >= 0) && RM.lane < Math.PI,
    'Bot room needs non-negative player, bot, laneDepth and push, and a lane under pi.');
  const BF = botConfig.fire;
  need(BF && ['margin', 'push', 'ending'].every(k => num(BF[k]) && BF[k] >= 0), 'Bot fire needs non-negative margin (m), push and ending (s).');
  const RD = CONFIG.rend, ST = CONFIG.storm;
  need(RD && Number.isInteger(RD.max) && RD.max >= 1 && num(RD.cut) && RD.cut > 0 && RD.cut * RD.max < 0.6 && num(RD.time) && RD.time > 0,
    'CONFIG.rend needs max (whole pieces, 1 or more), cut (a fraction; all of them under 0.6 of the bar) and time (s).');
  need(ST && num(ST.lock) && ST.lock > 0 && ST.lock < 1 && num(ST.minTell) && ST.minTell > 0, 'CONFIG.storm needs lock (0 to 1) and minTell (s).');
  need(CONFIG.burrow && num(CONFIG.burrow.near) && CONFIG.burrow.near > 0 && num(CONFIG.burrow.minTell) && CONFIG.burrow.minTell > 0, 'CONFIG.burrow needs near (m) and minTell (s).');
  need(SU && ['first', 'near', 'slack', 'reposition', 'settle', 'patience'].every(k => num(SU[k]) && SU[k] >= 0) && SU.slack <= SU.reposition && Array.isArray(SU.behind) && SU.behind.length > 0 && SU.behind.every(d => num(d) && d >= 0 && d <= Math.PI / 2) && num(SU.greed) && SU.greed >= 0 && SU.greed <= 1 && SU.patience >= 1,
    'Bot support needs non-negative first, near, settle, and slack no more than reposition, behind offsets in 0..pi/2, a greed share (0..1) and patience of 1 or more.');
  const jumpRange = botConfig.jumpDodge.lead;
  need(Array.isArray(jumpRange) && jumpRange.length === 2 && jumpRange.every(num) && jumpRange[0] > 0 && jumpRange[1] >= jumpRange[0],
    'Bot jumpDodge.lead needs an ordered positive range.');
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
    // v5.3 (Elden Ring bosses): blockable but not parryable, a spectral weapon drawn, a reaction, branching follow-ups.
    if ('noParry' in a) need(typeof a.noParry === 'boolean', `${tag}: noParry must be true or false.`);
    // v5.4 (Godrick): untouchable through its wind-ups and strikes; a flame breath drawn from the off hand.
    if ('invulnerable' in a) need(typeof a.invulnerable === 'boolean', `${tag}: invulnerable must be true or false.`);
    if ('breath' in a) need(a.breath && num(a.breath.len) && a.breath.len > 0 && num(a.breath.width) && a.breath.width > 0 && (!('from' in a.breath) || num(a.breath.from)),
      `${tag}: breath needs len and width (m, above 0), optionally from (the first hit it burns on).`);
    // v5.8 (Maliketh): Destined Death on the player, the sphere drawn, a golden blast drawn along a hit's box, fanned or stone bolts.
    if ('destined' in a) need(typeof a.destined === 'boolean', `${tag}: destined must be true or false.`);
    if ('sphere' in a) need(a.sphere && num(a.sphere.fwd) && num(a.sphere.r) && a.sphere.r > 0, `${tag}: sphere needs fwd (m) and r (m, above 0).`);
    if (a.hits) need(a.hits.every(h => !('line' in h) || typeof h.line === 'boolean'), `${tag}: a hit's line must be true or false.`);
    if (a.projectile && 'spread' in a.projectile) need(Array.isArray(a.projectile.spread) && a.projectile.spread.length > 0 && a.projectile.spread.every(num),
      `${tag}: projectile spread must list angles (rad).`);
    if (a.projectile && 'colors' in a.projectile) need(Array.isArray(a.projectile.colors) && a.projectile.colors.length === 2 && a.projectile.colors.every(num),
      `${tag}: projectile colors must be [core, rim] (hex numbers).`);
    if (a.projectile && 'look' in a.projectile) need(['arrow', 'slash', 'dagger', 'rock', 'coal', 'thorn'].includes(a.projectile.look),
      `${tag}: projectile look must be arrow, slash, dagger, rock, coal or thorn.`);
    if (visual && 'spectral' in a) need(a.spectral in SPECTRAL_WEAPONS, `${tag}: unknown spectral weapon "${a.spectral}" (known: ${Object.keys(SPECTRAL_WEAPONS).join(', ')}).`);
    if ('hpBelow' in a) need(num(a.hpBelow) && a.hpBelow > 0 && a.hpBelow <= 1, `${tag}: hpBelow must be a fraction of the bar (0 to 1).`);   // v5.9 (Malenia)
    if ('when' in a) need(a.when in REACTIONS, `${tag}: when must be one of ${Object.keys(REACTIONS).join(', ')}.`);
    if ('followUps' in a) need(Array.isArray(a.followUps) && a.followUps.every(f => f && typeof f.attack === 'string' && num(f.chance) && f.chance >= 0 && f.chance <= 1
      && (!('if' in f) || f.if in FOLLOW_IF)), `${tag}: followUps must list { attack, chance (0 to 1), if? (${Object.keys(FOLLOW_IF).join(', ')}) }.`);
    if ('impact' in a) need(a.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(a.impact[k]) && a.impact[k] >= 0),
      `${tag}: impact needs ring, crack, dust and shake (numbers, 0 or more).`);
    // v7.62.0 (the Castellans): a kin answers with its own attack (js/enemy.js cueKin), another move than this one.
    if ('cue' in a) need(a.cue && typeof a.cue.attack === 'string' && a.cue.attack !== a.id && ENEMY_DEFS.some(d => d.attacks.some(x => x && x.id === a.cue.attack))
      && num(a.cue.delay) && a.cue.delay >= 0 && num(a.cue.chance) && a.cue.chance > 0 && a.cue.chance <= 1 && num(a.cue.near) && a.cue.near > 0,
      `${tag}: cue needs attack (another enemy's attack id), delay (s, 0 or more), chance (above 0, at most 1) and near (m, above 0).`);
    // A leap's landing then a ground ring (v7.51.1): room for a roll through each (`CONFIG.enemy.ringAfterLanding`).
    if (Array.isArray(a.hits)) a.hits.forEach((h, i) => {
      const next = a.hits[i + 1], box = next && (next.box || a.box);
      if (!h || !h.leap || !box || !box.ring) return;
      const gap = h.active + (h.follow || 0) + next.startup, want = CONFIG.player.rollTime + CONFIG.enemy.ringAfterLanding;
      need(gap >= want - 1e-6, `${tag}: the ring after the landing of hit ${i + 1} opens ${gap.toFixed(2)} s after it; it needs ${want.toFixed(2)} s (a roll through each).`);
    });
    // A hit's `echo` (pass 44): the cut of an earlier hit of the same attack (`of`), struck again where it hangs; `home`
    // draws it back to the owner; `line` is how its gilt hangs (js/gilt-echo.js) and `tilt` the cut's slant (rad).
    if (Array.isArray(a.hits)) a.hits.forEach((h, i) => {
      if (!h || !('echo' in h)) return;
      const E = h.echo;
      need(E && Number.isInteger(E.of) && E.of >= 0 && E.of < i && !(a.hits[E.of] || {}).echo && !h.leap && !h.blink && !h.step && !(h.box || a.box || {}).ring && !a.projectile,
        `${tag}: hit ${i + 1}'s echo needs of (an earlier hit's index, itself no echo); not with a leap, blink, step, ring or projectile.`);
      need(!E || !('home' in E) || typeof E.home === 'boolean', `${tag}: hit ${i + 1}'s echo.home must be true or false.`);
      need(!E || ['sweep', 'chop', 'thrust', 'field'].includes(E.line), `${tag}: hit ${i + 1}'s echo.line must be sweep, chop, thrust or field.`);
      need(!E || !('tilt' in E) || (num(E.tilt) && Math.abs(E.tilt) <= 1.5), `${tag}: hit ${i + 1}'s echo.tilt must be an angle (rad) from -1.5 to 1.5.`);
    });
    // A hit's `seam` and `erupt` (pass 47, Oswin; js/enemy.js noteSeams): the floor cracked open along a line ahead, and
    // every open seam erupting at once. The first eruption of an attack has a wind-up of at least CONFIG.seams.minTell s.
    if (Array.isArray(a.hits)) a.hits.forEach((h, i) => {
      if (!h) return;
      if ('seam' in h) need(h.seam && num(h.seam.len) && h.seam.len > 0 && (!('from' in h.seam) || (num(h.seam.from) && h.seam.from >= 0))
        && (!('spread' in h.seam) || (Array.isArray(h.seam.spread) && h.seam.spread.length > 0 && h.seam.spread.every(v => num(v) && Math.abs(v) <= Math.PI))) && !h.echo && !a.projectile,
        `${tag}: hit ${i + 1}'s seam needs len (m), optionally from (m ahead) and spread (angles, rad); not with an echo or a projectile.`);
      if ('erupt' in h) {
        need(!(h.box || a.box).ground && !(h.box || a.box).ring, `${tag}: an erupt hit stands walls on the seams: give it a plain box (no ground, no ring).`);
        const E = h.erupt, prev = a.hits[i - 1];
        need((E === true || (E && typeof E === 'object' && (!('keep' in E) || typeof E.keep === 'boolean'))) && !h.echo && !h.seam && !a.projectile,
          `${tag}: hit ${i + 1}'s erupt must be true or { keep }; not with an echo, a seam or a projectile.`);
        need(h.startup >= CONFIG.seams.minTell - 1e-6 || (prev && prev.erupt && prev.erupt.keep),
          `${tag}: hit ${i + 1}'s eruption needs a wind-up of at least ${CONFIG.seams.minTell} s (the seams' tell), unless it follows one that keeps them.`);
      }
      // A `burrow` (pass 50, the Kindling Tree): under the floor from `from` of the wind-up, its heave running after the
      // player at `speed` m/s (turning at most `turn` rad/s) until `lock`, then held still at least CONFIG.burrow.minTell s;
      // it rises in a ring round itself. Never with another way of moving or placing the blow.
      if ('burrow' in h) {
        const B = h.burrow, b = h.box || a.box || {};
        need(B && typeof B === 'object' && num(B.from) && B.from > 0 && num(B.lock) && B.lock > B.from && B.lock < 1 && num(B.speed) && B.speed > 0 && num(B.turn) && B.turn >= 0
          && !h.echo && !h.seam && !h.erupt && !h.bolt && !h.leap && !h.blink && !h.step && !h.hold && !h.abort && !!b.ring && b.fwd === 0 && !a.projectile && !a.dash && !a.track && !a.lunge,
          `${tag}: hit ${i + 1}'s burrow needs from and lock (0 < from < lock < 1), speed (m/s, above 0) and turn (rad/s), and a ring round itself (fwd 0); not with an echo, seam, erupt, bolt, leap, blink, step, hold, abort, projectile, dash, track or lunge.`);
        need(!B || h.startup * (1 - B.lock) >= CONFIG.burrow.minTell - 1e-6, `${tag}: hit ${i + 1}'s burrow holds still ${(h.startup * (1 - ((B && B.lock) || 0))).toFixed(2)} s before it rises; it needs ${CONFIG.burrow.minTell} s.`);
      }
      // A `fire` (pass 63, the Pillager Captain; Enemy.noteFires): fires left burning on the floor where it lands, at [fwd,
      // side] m from him, `r` m across, for `time` s, `dps` a second once caught (within CONFIG.groundFire's limits).
      // A `pull` (pass 63): a hook that drags you in to `pull` m from him instead of throwing you back; it never holds on a
      // guard and cannot be parried (that hit is roll-only).
      if ('fire' in h) {
        const F = h.fire, G = CONFIG.groundFire;
        need(F && Array.isArray(F.at) && F.at.length > 0 && F.at.length <= G.max && F.at.every(p => Array.isArray(p) && p.length === 2 && p.every(num) && Math.hypot(...p) <= 12)
          && num(F.r) && F.r >= 0.4 && F.r <= 3 && num(F.time) && F.time > G.kindle && F.time <= G.maxTime && num(F.dps) && F.dps > 0 && F.dps <= G.maxDps && !a.projectile && !h.echo,
          `${tag}: hit ${i + 1}'s fire needs at (1 to ${G.max} [fwd, side] places within 12 m), r (0.4 to 3 m), time (${G.kindle} to ${G.maxTime} s) and dps (up to ${G.maxDps}); not on a projectile or an echo.`);
      }
      if ('noParry' in h) need(h.noParry === true, `${tag}: hit ${i + 1}'s noParry must be true (the attack's other hits may still be parried).`);
      if ('pull' in h) need(num(h.pull) && h.pull >= 0.8 && h.pull <= 4 && !a.shove && !a.projectile, `${tag}: hit ${i + 1}'s pull must be 0.8 to 4 m (not on a shove or a projectile).`);
      // A `still` hit (pass 50): it does not turn through its wind-up, so it falls where the hit before it was aimed.
      if ('still' in h) need(h.still === true && i > 0, `${tag}: hit ${i + 1}'s still must be true, and not on the first hit.`);
      // A `bolt` (pass 48): lightning on the spot its target stood as the mark locked (Enemy.noteBolt); `lock` a fraction of
      // the wind-up. Never with another way of placing the blow, and never with less than CONFIG.storm.minTell s of mark.
      if ('bolt' in h) {
        const B = h.bolt, b = h.box || a.box || {};
        need((B === true || (B && typeof B === 'object' && (!('lock' in B) || (num(B.lock) && B.lock > 0 && B.lock < 1))))
          && !h.echo && !h.seam && !h.erupt && !h.leap && !h.blink && !h.step && !b.ring && b.fwd === 0 && !a.projectile,
          `${tag}: hit ${i + 1}'s bolt must be true or { lock } (0 to 1), its box centred on the mark (fwd 0); not with an echo, seam, erupt, leap, blink, step, ring or projectile.`);
        need(h.startup >= CONFIG.storm.minTell - 1e-6, `${tag}: hit ${i + 1}'s bolt needs a wind-up of at least ${CONFIG.storm.minTell} s (its mark).`);
      }
    });
    if ('rend' in a) need(typeof a.rend === 'boolean', `${tag}: rend must be true or false.`);
    // Per hit (v4.3): its own `box` (an expanding `ring` round the owner when given), its own `impact`, and `leap`.
    for (const h of Array.isArray(a.hits) ? a.hits : []) {
      if ('box' in h) need(h.box && ['w', 'h', 'd', 'fwd', 'y'].every(k => num(h.box[k])), `${tag}: a hit's box needs w, h, d, fwd and y.`);
      if (h.box && 'ring' in h.box) need(h.box.ring && ['from', 'to', 'width', 'time'].every(k => num(h.box.ring[k]) && h.box.ring[k] >= 0) && h.box.ring.time > 0,
        `${tag}: a hit's ring needs from, to, width and time (numbers; time above 0).`);
      if ('impact' in h) need(h.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(h.impact[k]) && h.impact[k] >= 0), `${tag}: a hit's impact needs ring, crack, dust and shake.`);
      if ('step' in h) need(h.step && num(h.step.from) && h.step.from >= 0 && h.step.from < 1 && num(h.step.speed) && h.step.speed >= 0 && num(h.step.side),
        `${tag}: a hit's step needs from (0 to 1 of its wind-up), speed (m/s, 0 or more) and side (m/s, + to its left).`);
      if ('blink' in h) need(h.blink && num(h.blink.from) && h.blink.from >= 0 && h.blink.from < 1 && (num(h.blink.dist) || num(h.blink.back)) && (!('time' in h.blink) || (num(h.blink.time) && h.blink.time > 0)) && !h.leap,
        `${tag}: a hit's blink needs from (0 to 1 of its wind-up) and dist (m before the player) or back (m away), optionally time (s); not with a leap.`);
      if ('damage' in h) need(num(h.damage) && h.damage > 0, `${tag}: a hit's damage must be a number above 0.`);
      // Pass 55 (the King's Blade): a counter stance through the wind-up (js/enemy.js takeHit), and a wind-up that falters.
      if ('counter' in h) need(h.counter && typeof h.counter.answer === 'string' && (!('arc' in h.counter) || (num(h.counter.arc) && h.counter.arc > 0 && h.counter.arc <= Math.PI))
        && (!('from' in h.counter) || (num(h.counter.from) && h.counter.from >= 0 && h.counter.from < 1))
        && (!('breakers' in h.counter) || (Array.isArray(h.counter.breakers) && h.counter.breakers.every(x => typeof x === 'string'))) && !h.falter,
        `${tag}: a hit's counter needs answer (an attack id), optionally arc (rad), from (0 to 1 of its wind-up) and breakers (player attack ids); not with falter.`);
      if ('falter' in h) need(h.falter && Number.isInteger(h.falter.hits) && h.falter.hits > 0, `${tag}: a hit's falter needs hits (a whole number above 0).`);
      if ('tell' in h) need(h.tell === 'shield', `${tag}: a hit's tell can only be 'shield' (its wind-up glows on the model's shieldTell).`);   // v5.9: overrides the attack's
      if ('sigil' in h) need(num(h.sigil) && h.sigil > 0, `${tag}: a hit's sigil is the radius (m) of the rune drawn where it strikes.`);
      if (h.leap && 'back' in h.leap) need(num(h.leap.back) && h.leap.back > 0, `${tag}: a hit's leap.back must be metres above 0.`);
      if ('abort' in h) need(h.abort && num(h.abort.at) && h.abort.at > 0 && h.abort.at < 1 && num(h.abort.beyond) && typeof h.abort.into === 'string',
        `${tag}: a hit's abort needs at (0 to 1 of its wind-up), beyond (m) and into (an attack id).`);
      if ('leap' in h) need(h.leap && num(h.leap.from) && h.leap.from > 0 && h.leap.from < 1 && num(h.leap.max) && h.leap.max > 0 && (!('short' in h.leap) || num(h.leap.short)) && !a.dash,
        `${tag}: a hit's leap needs from (0 to 1 of its wind-up) and max (m), optionally short (m); not on a dashing attack.`);
    }
    if (Array.isArray(a.hits) && a.hits.length) checkAttackAnim(a, tag, need);   // four-phase fields (js/attack-anim.js)
  };
  // Enemies
  const ids = new Set();
  for (const d of [...ENEMY_DEFS, ...TRAINING_DEFS, ...TEST_DEFS]) {
    const aidList = new Set(d.attacks.map(a => a && a.id));   // follow-ups and aborts name attacks of the same enemy
    for (const a of d.attacks) if (a) {
      for (const f of a.followUps || []) need(aidList.has(f.attack), `Enemy "${d.id}" attack "${a.id}": follow-up "${f.attack}" is not one of its attacks.`);
      for (const h of a.hits || []) if (h.counter) need(aidList.has(h.counter.answer) && h.counter.answer !== a.id, `Enemy "${d.id}" attack "${a.id}": counter answer "${h.counter.answer}" is not another of its attacks.`);
      for (const h of a.hits || []) if (h.counter) need(!!(d.posture || d.guard || d.stagger), `Enemy "${d.id}" attack "${a.id}": a counter breaks the stance, so the enemy needs posture, guard or stagger.`);
      for (const h of a.hits || []) if (h.falter) need(!!d.posture, `Enemy "${d.id}" attack "${a.id}": a falter breaks its posture, so the enemy needs posture.`);
      for (const h of a.hits || []) if (h.abort) need(aidList.has(h.abort.into), `Enemy "${d.id}" attack "${a.id}": abort into "${h.abort.into}" is not one of its attacks.`);
      if (visual && (a.hits || []).some(h => h.tell === 'shield')) { const M = d.model && KIT.resolve(d.model); need(!!(M && M.shieldTell), `Enemy "${d.id}" attack "${a.id}": a shield tell needs a model with shieldTell.`); }
    }
    need(typeof d.id === 'string' && !ids.has(d.id), `Enemy "${d.name}": missing or duplicate id "${d.id}".`);
    ids.add(d.id);
    need(d.weapon in WEAPONS, `Enemy "${d.id}": unknown weapon "${d.weapon}".`);
    if ('bossBar' in d) need(d.bossBar === true && TRAINING_DEFS.includes(d), `Enemy "${d.id}": bossBar is for training dummies (a boss has it already), true or left out.`);
    if ('refill' in d) need(TRAINING_DEFS.includes(d) && d.refill && num(d.refill.delay) && d.refill.delay >= 0 && num(d.refill.time) && d.refill.time > 0,
      `Enemy "${d.id}": refill is for training dummies, { delay (s, 0 or more), time (s, above 0) }.`);
    if ('noRepeat' in d) need(Number.isInteger(d.noRepeat) && d.noRepeat > 0, `Enemy "${d.id}": noRepeat must be a positive whole number.`);
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
    if ('autoLock' in d) need(typeof d.autoLock === 'boolean', `Enemy "${d.id}": autoLock must be true or false.`);
    if ('kite' in d) need(num(d.kite) && d.kite >= 0 && d.kite <= 1, `Enemy "${d.id}": kite must be a number from 0 to 1 (a chance).`);
    if ('lifesteal' in d) need(d.lifesteal && num(d.lifesteal.flat) && d.lifesteal.flat >= 0 && num(d.lifesteal.pct) && d.lifesteal.pct >= 0 && d.lifesteal.pct < 0.2,
      `Enemy "${d.id}": lifesteal needs flat (HP, 0 or more) and pct (a fraction of the bar under 0.2).`);   // v5.9 (Malenia)
    if ('critMul' in d) need(num(d.critMul) && d.critMul > 0 && d.critMul <= 1, `Enemy "${d.id}": critMul must be a number in (0, 1].`);
    if (d.posture) need(['max', 'parry', 'chainGap', 'chainMul', 'decay', 'breakTime', 'hitstop'].every(k => num(d.posture[k])),
      `Enemy "${d.id}": posture needs max, parry, chainGap, chainMul, decay, breakTime and hitstop.`);
    // Group scaling is gone (v7.65.0): no enemy grows with the team, so a leftover `groupScale` is a mistake.
    need(!('groupScale' in d), `Enemy "${d.id}": groupScale is gone; no enemy scales with the number of players (CONFIG.pace).`);
    if ('deathFade' in d) need(num(d.deathFade) && d.deathFade > 1, `Enemy "${d.id}": deathFade must be a number of seconds above 1.`);
    if ('holyLight' in d) need(d.holyLight && [d.holyLight.color, d.holyLight.core].every(v => Number.isInteger(v) && v >= 0 && v <= 0xffffff),
      `Enemy "${d.id}": holyLight needs a color and a core colour (js/holy.js).`);   // v7.50.0 (the Kindling Tree)
    // Pass 55 (the King's Blade): its own still pose while broken (js/attack-anim.js applyKeyPose).
    if ('brokenPose' in d) need(d.posture && d.brokenPose && typeof d.brokenPose === 'object' && Object.entries(d.brokenPose).every(([k, v]) =>
      ['crouch', 'lean', 'kneel'].includes(k) ? num(v) && Math.abs(v) <= 1.5 : Array.isArray(v) && v.length === 3 && v.every(x => num(x) && Math.abs(x) <= 4)),
      `Enemy "${d.id}": brokenPose is a key pose (bone: [x, y, z] rad; crouch, lean, kneel numbers), for a boss with posture.`);
    if ('rooted' in d) need(typeof d.rooted === 'boolean', `Enemy "${d.id}": rooted must be true or false.`);   // pass 50 (the Kindling Tree)
    // Pass 68 (the Bell Warden): blows landed on him fill his resonance; at max a `when: 'resonant'` attack answers. A phase may carry its own.
    const resOk = R => R && typeof R === 'object' && num(R.max) && R.max > 0 && num(R.light) && R.light >= 0 && num(R.heavy) && R.heavy >= 0
      && Array.isArray(R.breakers) && R.breakers.every(b => typeof b === 'string') && num(R.delay) && R.delay >= 0 && num(R.decay) && R.decay >= 0
      && (!('rest' in R) || num(R.rest) && R.rest >= 0);
    const hasAnswer = ids => d.attacks.some(a => a && a.when === 'resonant' && (!ids || ids.includes(a.id)));
    if ('resonance' in d) need(resOk(d.resonance) && hasAnswer(), `Enemy "${d.id}": resonance needs max (above 0), light, heavy, breakers (attack ids), delay and decay (and an optional rest, s), and an attack with when: 'resonant'.`);
    need(!('tether' in d), `Enemy "${d.id}": tether belongs in a phase (a later phase without one lets it go).`);   // pass 42
    if ('echoColor' in d) need(Number.isInteger(d.echoColor) && d.echoColor >= 0 && d.echoColor <= 0xffffff, `Enemy "${d.id}": echoColor must be a colour (0xrrggbb).`);   // pass 44
    // Boss phases (v4.3): each a full health bar; attacks named by id; the transition into it in seconds.
    if ('phases' in d) {
      const P = d.phases, aids = new Set(d.attacks.map(a => a && a.id));
      need(P && typeof P === 'object' && Object.keys(P).length > 0, `Enemy "${d.id}": phases must name at least one phase.`);
      for (const [pid, ph] of Object.entries(P || {})) {
        const tag = `Enemy "${d.id}" phase "${pid}"`;
        // A mid-bar phase (`at`, v5.3) shares the bar it starts on; any other phase is a full bar of its own.
        if (ph && 'at' in ph) need(num(ph.at) && ph.at > 0 && ph.at < 1 && !('hp' in ph) && !('alone' in ph), `${tag}: at must be a fraction of the bar (0 to 1), with no hp of its own and no alone.`);
        // v7.40.0: an `alone` phase begins on the same bar once the rest of its zone has fallen (a pair of bosses).
        else if (ph && 'alone' in ph) need(ph.alone === true && !('hp' in ph) && Object.keys(P)[0] !== pid, `${tag}: alone must be true, with no hp of its own, and not the first phase.`);
        else need(ph && num(ph.hp) && ph.hp > 0, `${tag}: needs hp above 0.`);
        if (visual && ph && 'reveal' in ph) { const M = d.model && KIT.resolve(d.model); need(Array.isArray(ph.reveal) && !!M && ph.reveal.every(sl => (M.hidden || []).includes(sl)),
          `${tag}: reveal must list material slots its model hides (its "hidden").`); }
        if (visual && ph && 'conceal' in ph) { const M = d.model && KIT.resolve(d.model); need(Array.isArray(ph.conceal) && !!M && ph.conceal.every(sl => sl === 'weapon' || sl in M.materials),
          `${tag}: conceal must list material slots of its model (or 'weapon').`); }
        if (ph && 'revealBurst' in ph) need(ph.revealBurst && Number.isInteger(ph.revealBurst.color) && num(ph.revealBurst.count) && ph.revealBurst.count > 0
          && num(ph.revealBurst.speed) && ph.revealBurst.speed > 0 && 'reveal' in ph, `${tag}: revealBurst needs color, count and speed (above 0), and a reveal.`);   // v7.62.0
        if (ph && 'opener' in ph) need(aids.has(ph.opener) && (!ph.attacks || ph.attacks.includes(ph.opener)), `${tag}: opener "${ph.opener}" must be one of its attacks, and of the phase's own when it lists them (the phase looks it up there).`);
        if (ph && 'attacks' in ph) need(Array.isArray(ph.attacks) && ph.attacks.length > 0 && ph.attacks.every(id => aids.has(id)),
          `${tag}: attacks must list attack ids of the enemy (unknown: ${(ph.attacks || []).filter(id => !aids.has(id)).join(', ')}).`);
        for (const k of ['rend', 'storm', 'rooted']) if (ph && k in ph) need(typeof ph[k] === 'boolean', `${tag}: ${k} must be true or false.`);
        if (ph && 'ignite' in ph) need(ph.ignite === true || ph.ignite === 'weapon', `${tag}: ignite must be true (he burns) or 'weapon' (only his weapon does: js/finale.js).`);   // pass 63
        if (ph && 'tether' in ph) need(num(ph.tether) && ph.tether >= 2 && ph.tether <= 40, `${tag}: tether must be a radius in m (2 to 40) round where it stands.`);   // pass 42
        if (ph && 'resonance' in ph) need(resOk(ph.resonance) && hasAnswer(ph.attacks), `${tag}: resonance needs max (above 0), light, heavy, breakers, delay and decay, and one of its attacks with when: 'resonant'.`);   // pass 68
        if (ph && 'echoColor' in ph) need(Number.isInteger(ph.echoColor) && ph.echoColor >= 0 && ph.echoColor <= 0xffffff, `${tag}: echoColor must be a colour (0xrrggbb).`);   // pass 44
        if (ph && 'fill' in ph) need(num(ph.fill) && ph.fill > 0 && ph.fill <= 1 && !('at' in ph), `${tag}: fill must be a fraction (0 to 1] of a refilled bar.`);   // v5.9
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
    need(a.feel === undefined || a.feel === 'heavy', `Player attack "${a.id}": feel must be 'heavy' or left out.`);
    for (const [action, id] of Object.entries(a.next || {})) need(id in M.attacks && action in M.ground, `Player attack "${a.id}": next.${action} -> "${id}" is not a ground action and attack.`);
  }
  const PC = CONFIG.pace;   // a boss's pace and Boss Rush's curve (v7.65.0): it only ever speeds a boss up
  need(PC && num(PC.boss) && PC.boss >= 1 && num(PC.rise) && PC.rise >= 0 && num(PC.scale) && PC.scale > 0 && num(PC.max) && PC.max >= PC.boss
    && num(PC.tell) && PC.tell >= 0 && num(PC.tellFloor) && PC.tellFloor > 0 && PC.tellFloor <= 1,
    'CONFIG.pace: boss must be 1 or more, rise 0 or more, scale above 0, max at least boss, tell 0 or more and tellFloor in (0, 1].');
  const SW = CONFIG.swift, KM = CONFIG.killMoment;   // v7.69.0: Boss Rush's par and swift kill, and the kill moment
  need(SW && num(SW.par) && SW.par > 0 && num(SW.pair) && SW.pair >= 0 && num(SW.max) && SW.max >= SW.par && Number.isInteger(SW.extra) && SW.extra >= 0 && CONFIG.abilities.offer + SW.extra <= ABILITIES.length,
    'CONFIG.swift: par above 0, pair 0 or more, max at least par, extra a whole number of 0 or more that still fits the abilities there are.');
  need(KM && num(KM.slow) && KM.slow > 0 && KM.slow <= 1 && ['time', 'embers', 'emberSpeed'].every(k => num(KM[k]) && KM[k] >= 0),
    'CONFIG.killMoment: slow in (0, 1], and time, embers and emberSpeed 0 or more.');
  // Endless (pass 65): CONFIG.endless and RUSH (js/data/rush.js). A modifier only ever speeds a boss up.
  const EN = CONFIG.endless, whole = (v, min) => Number.isInteger(v) && v >= min;
  need(EN && whole(EN.opening, 0) && whole(EN.crowned, 2) && whole(EN.crownedOffer, CONFIG.abilities.offer) && EN.crownedOffer <= ABILITIES.length &&
    whole(EN.pairFrom, EN.opening + 1) && whole(EN.pairEvery, 1) && num(EN.pairRest) && EN.pairRest > 0 && EN.pairRest <= 1 && num(EN.pairHealth) && EN.pairHealth > 0 && EN.pairHealth <= 1 && Array.isArray(EN.mods) && EN.mods.every((f, i) => whole(f, 1) && (!i || f > EN.mods[i - 1])) && whole(EN.longest, 2),
    'CONFIG.endless: opening 0 or more, crowned 2 or more, crownedOffer from CONFIG.abilities.offer to the abilities there are, pairFrom past the opening, pairEvery 1 or more, pairRest and pairHealth in (0, 1], mods rising fight numbers, longest 2 or more.');
  need(ABILITIES.some(b => b.rarity === 'legendary'), 'Endless: a Crowned win offers a legendary, so there must be one.');
  need(RUSH && Array.isArray(RUSH.opening) && RUSH.opening.length >= 3 && RUSH.opening.every(id => isBossDef(ENEMY_BY_ID[id])) && new Set(RUSH.opening).size === RUSH.opening.length,
    'RUSH.opening: three or more different boss ids (a fight draws none from the fight before).');
  need(Array.isArray(RUSH.modifiers) && new Set(RUSH.modifiers.map(m => m.id)).size === RUSH.modifiers.length, 'RUSH.modifiers: a list with different ids.');
  for (const m of RUSH.modifiers) {
    const where = `RUSH modifier "${m.id}"`, keys = ['pace', 'rest', 'chain'];
    need(typeof m.id === 'string' && /^[a-z][a-z-]*$/.test(m.id) && typeof m.name === 'string' && m.name.length > 0 && whole(m.from, 1), `${where}: an id, a name and the fight it may come from.`);
    need(Object.keys(m).every(k => ['id', 'name', 'from', ...keys].includes(k)) && keys.some(k => k in m) && keys.every(k => !(k in m) || num(m[k]) && m[k] > 1 && m[k] <= 3),
      `${where}: it changes pace, rest or chain, each above 1 and at most 3 (a modifier never adds damage or health, nor slows a boss).`);
  }
  const PR = CONFIG.enemy.postureRest;   // v7.65.0: a boss fights a while between posture breaks
  need(PR && num(PR.time) && PR.time >= 0 && num(PR.mul) && PR.mul >= 0 && PR.mul <= 1, 'CONFIG.enemy.postureRest: time 0 or more and mul from 0 to 1.');
  const AG = CONFIG.aggro;   // a boss against a group (v7.35.0): its targeting and its area attacks
  need(AG && ['damage', 'healReach', 'hold', 'margin', 'crowd', 'areaWidth'].every(k => num(AG[k]) && AG[k] >= 0) && num(AG.memory) && AG.memory > 0
    && num(AG.areaMul) && AG.areaMul >= 1, 'CONFIG.aggro: damage, healReach, hold, margin, crowd and areaWidth must be 0 or more, memory above 0 and areaMul 1 or more.');
  // Executions (js/execution.js): the attack they run, and every tuning number.
  need(M.attacks.execute && M.attacks.execute.pose && M.attacks.execute.hits.length === 1, 'Player moveset: executions need a one-hit "execute" attack with a pose.');
  const X = CONFIG.execution;
  need(X && ['range', 'cone', 'facing', 'floor', 'angleWeight', 'snapTime', 'standoff', 'gap', 'chest', 'thrustHeight', 'hitstop', 'grace', 'push', 'cuePulse', 'cueGlow'].every(k => num(X[k]))
    && ['lightMul', 'bossLightMul', 'bossCap'].every(k => num(X.damage[k])) && X.damage.bossCap <= 0.5
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
  need(typeof ARENA.fullTracking === 'boolean' && typeof BOSS_BATTLE_ARENA.fullTracking === 'boolean', 'Arena: fullTracking must be true or false.');
  // Levels
  const levelIds = new Set();
  for (const L of ALL_LEVELS) {
    const where = `Level "${L.id}"`;
    need(typeof L.id === 'string' && !levelIds.has(L.id), `${where}: missing or duplicate id.`);
    levelIds.add(L.id);
    need(LEVEL_LAYOUTS.includes(L.layout), `${where}: unknown layout "${L.layout}".`);
    if (L.next) need(ALL_LEVELS.some(o => o.id === L.next), `${where}: next level "${L.next}" does not exist.`);
    if ('completeHint' in L) need(typeof L.completeHint === 'string' && L.completeHint.length > 0, `${where}: completeHint must be a line of text.`);
    if ('cull' in L) need(typeof L.cull === 'boolean', `${where}: cull must be true or false.`);
    if ('lessons' in L) validateLessons(L, where, need);
    if ('abilityLab' in L) need(L.abilityLab === true, `${where}: abilityLab must be true or left out.`);
    if ('damageNumbers' in L) need(L.damageNumbers === true, `${where}: damageNumbers must be true or left out (Boss Rush and Story have none).`);
    for (const k of ['wakeZones', 'clearGates', 'steer', 'fullTracking']) if (k in L) need(typeof L[k] === 'boolean', `${where}: ${k} must be true or false.`);
    if (L.layout === 'rooms') { validateRooms(L, where, need, num, visual); continue; }
    if (L.layout === 'arena') {   // a level in the duel arena (the Ability Grounds): training dummies inside its walls
      const inA = s => !!s && num(s.x) && num(s.z) && Math.abs(s.x) < L.halfX && Math.abs(s.z) < L.halfZ;
      need(num(L.halfX) && num(L.halfZ) && inA(L.playerStart) && Array.isArray(L.dispersed) && !('gated' in L),
        `${where}: an arena level needs halfX, halfZ, a playerStart inside them and a dispersed list, and no gated zones.`);
      for (const s of L.dispersed || []) need(s.enemy in ENEMY_BY_ID && BEHAVIORS[s.behavior]?.training && inA(s) && num(s.yaw),
        `${where} enemy "${s.enemy}" (${s.behavior}): an arena level holds training dummies (dummy, sparring) with x, z and yaw inside it.`);
      continue;
    }
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
    for (const b of L.braziers || []) need(inX(b.x) && Math.abs(b.z) < L.halfZ - 0.5 && !L.gated.some(g => Math.abs(g.gateX - b.x) < 1.2), `${where}: a brazier at x ${b.x} must stand in the hall, clear of the gates.`);
  }
  // Arena and timings
  if (visual) need(LEVEL_LAYOUTS.every(k => k in BUILDERS), 'Every layout in LEVEL_LAYOUTS (js/terrain.js) needs a stage builder in BUILDERS (js/scene.js).');
  need(LEVEL_LAYOUTS.includes(ARENA.layout) && ARENA.enemyStart && ARENA.playerStart, 'Arena: needs a layout, playerStart and enemyStart.');
  const Cu = CONFIG.cull;
  need(Number.isInteger(Cu.maxLights) && Cu.maxLights >= 1 && Cu.lightRange > 0 && Cu.fadeBand > 0 && Cu.enemyRange > Math.max(...Object.values(CONFIG.notice)),
    'CONFIG.cull: maxLights must be a whole number of at least 1, ranges above 0, and enemyRange beyond every notice range.');
  const Bk = CONFIG.VISUALS.baked;
  need(Bk.cell > 0 && Number.isInteger(Bk.maxCells) && Bk.maxCells >= 3 && Bk.maxCells <= 120 && Number.isInteger(Bk.maxVolume) && Bk.maxVolume >= 1000
    && Bk.range > 0 && Bk.openRange > 0 && Bk.pad >= 0 && Bk.offset >= 0 && Bk.fill >= 0 && Bk.encode > 0
    && Object.values(CONFIG.VISUALS.quality).every(q => typeof q.baked === 'boolean'),
    'CONFIG.VISUALS.baked: cell, ranges and encode above 0, maxCells a whole number from 3 to 120, maxVolume a whole number of at least 1000, pad, offset and fill not negative; every preset says whether it is `baked`.');
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
  { const D = CONFIG.hud.damageNumbers;   // the Ability Grounds' damage numbers
    need(Number.isInteger(D.pool) && D.pool > 0 && [D.life, D.rise, D.spread, D.big].every(v => num(v) && v > 0) && Array.isArray(D.lanes) && D.lanes.length && D.lanes.every(num),
      'CONFIG.hud.damageNumbers: pool (whole number), life, rise, spread and big above 0, and lanes (numbers).'); }
  need(Array.isArray(CONFIG.hud.text.deathTips) && CONFIG.hud.text.deathTips.length > 0 && CONFIG.hud.text.deathTips.every(t => typeof t === 'string' && t),
    'CONFIG.hud.text.deathTips must be a list of tips (text).');
  const D = CONFIG.death;
  need(D.textDelay + D.textFade <= D.respawnDelay && D.hintDelay < D.respawnDelay, 'CONFIG.death: the YOU DIED text must finish before the respawn.');
  if (visual) {
    checkVisualData(need, num);   // optional look fields (section 9b)
    checkRealmData(need, num);    // levels' set pieces (js/realms.js, v7.0)
    for (const [id, M] of Object.entries(MODEL_DEFS)) for (const o of M.parts || [])   // models built in Blender (js/baked.js)
      if (o.use === 'baked') need(o.mesh in BAKED, `Model "${id}": baked mesh "${o.mesh}" is not packed (run node tools/pack-baked.cjs).`);
    // A baked model sets every body piece to null; a model extending it without its own `body` would lose its limbs.
    const inherited = (id, k) => { for (let M = MODEL_DEFS[id]; M; M = MODEL_DEFS[M.extends]) if (k in M) return M[k]; };
    for (const id of Object.keys(MODEL_DEFS)) {
      const body = inherited(id, 'body');
      if (body && Object.values(body).every(v => v == null))
        need((inherited(id, 'parts') || []).some(o => o.use === 'baked'), `Model "${id}": its body is all null but it has no baked parts (it extends a baked model?): give it its own body.`);
    }
  }
  // Boss effects (js/data/boss-fx.js, the Ultra preset): known elements, impacts, bosses, phases and attacks.
  const isCol = v => Number.isInteger(v) && v >= 0 && v <= 0xffffff;
  for (const [n, E] of Object.entries(FX_ELEMENTS))
    need(['core', 'glow', 'mote', 'trail'].every(k => isCol(E[k])) && E.sparks in CONFIG.VISUALS.ultra.sparks.colors && BOSS_FX_IMPACTS.includes(E.impact)
      && (E.smoke === undefined || isCol(E.smoke)), `FX_ELEMENTS.${n}: core, glow, mote and trail colours, sparks (a spark palette) and an impact (${BOSS_FX_IMPACTS.join(', ')}).`);
  for (const [id, B] of Object.entries(BOSS_FX)) {
    const d = ENEMY_BY_ID[id], w = `BOSS_FX.${id}`;
    need(!!d, `${w}: no enemy "${id}".`);
    if (!d) continue;
    need(B.element in FX_ELEMENTS, `${w}: unknown element "${B.element}".`);
    if ('aura' in B) need(isCol(B.aura), `${w}: aura must be a colour.`);
    for (const [ph, el] of Object.entries(B.phases || {}))
      need(!!(d.phases && d.phases[ph]) && el in FX_ELEMENTS, `${w}.phases.${ph}: needs a phase of "${id}" and a known element ("${el}").`);
    const ids = new Set([...(d.attacks || []), ...Object.values(d.phases || {}).flatMap(P => P.attacks || [])].filter(a => a && typeof a === 'object').map(a => a.id));
    for (const [aid, A] of Object.entries(B.attacks || {})) {
      need(ids.has(aid), `${w}.attacks.${aid}: "${id}" has no attack "${aid}".`);
      if (A.element !== undefined) need(A.element in FX_ELEMENTS, `${w}.attacks.${aid}: unknown element "${A.element}".`);
      if (A.impact !== undefined) need(BOSS_FX_IMPACTS.includes(A.impact), `${w}.attacks.${aid}: unknown impact "${A.impact}".`);
      if (A.windup !== undefined) need(['gather', 'none'].includes(A.windup), `${w}.attacks.${aid}: windup is "gather" or "none".`);
      if (A.aura !== undefined) need(isCol(A.aura), `${w}.attacks.${aid}: aura must be a colour.`);
    }
  }
  // Story mode (js/data/story.js): each campaign's chapters name a real level, once each, with a title and
  // a line; every campaign has its own id, save slot and texts, and no level belongs to two campaigns' chapters.
  const storyIdsAll = [], campaignIds = new Set();
  for (const C of STORIES) {
    const w = `Story "${C && C.id}"`;
    need(C && typeof C.id === 'string' && !campaignIds.has(C.id) && typeof CONFIG.story.saveKeys[C.id] === 'string', `${w}: needs a unique id with a save key in CONFIG.story.saveKeys.`);
    if (!C) continue;
    campaignIds.add(C.id);
    for (const k of ['name', 'short', 'menuTitle', 'menuSub', 'description', 'done']) need(typeof C[k] === 'string' && C[k].length > 0, `${w}: ${k} must be a line of text.`);
    need(C.credits && typeof C.credits.companion === 'string' && Array.isArray(C.credits.foes) && C.credits.foes.every(f => typeof f === 'string'), `${w}: credits need a companion and a list of foes.`);
    if (C.companion) {
      const a = C.companion;
      need(typeof a.id === 'string' && a.id.length > 0 && typeof a.name === 'string' && a.name.trim().length > 0 &&
        BOT_PROFILES.some(p => p.id === a.profile) && Number.isInteger(a.color) && a.color >= 0 && a.color <= 0xffffff,
        `${w}: companion needs an id, name, bot profile and colour.`);
    }
    need(C.progress && typeof C.progress === 'object', `${w}: progress must be an object.`);
    const list = C.chapters || [], storyIds = list.map(c => c && c.level);
    for (const c of list) {
      const tag = `${w} chapter "${c && c.level}"`;
      need(c && ALL_LEVELS.some(l => l.id === c.level), `${tag}: no level with that id.`);
      if (!c) continue;
      need(typeof c.title === 'string' && c.title && typeof c.line === 'string', `${tag}: needs a title and a line.`);
      if ('loadout' in c) for (const [id, r] of Object.entries(c.loadout || {}))
        need(id in ITEMS && r && (r.min === undefined || num(r.min)) && (r.max === undefined || num(r.max)), `${tag}: loadout "${id}" must be an item with numeric min / max.`);
    }
    need(new Set(storyIds).size === storyIds.length && (C.chapters || []).length > 0, `${w}: each level may appear only once, and there must be a chapter.`);
    // A road whose last chapter has no `ending` goes on (its later chapters not built yet): it says so in `goesOn`.
    const lastLevel = ALL_LEVELS.find(l => l.id === storyIds[storyIds.length - 1]);
    if ('goesOn' in C || (lastLevel && !lastLevel.ending)) need(typeof C.goesOn === 'string' && C.goesOn.length > 0, `${w}: goesOn must be a line of text (needed while its last chapter has no ending).`);
    storyIdsAll.push(...(C.chapters || []).map(c => c && c.level));
  }
  need(new Set(storyIdsAll).size === storyIdsAll.length, 'Story: a level may be a chapter of only one campaign.');
  // Lore (js/data/lore.js, v5.1): the NPC's model, and per level a dialogue, inscriptions and scenes with readable text.
  const lines = a => Array.isArray(a) && a.length > 0 && a.every(t => typeof t === 'string' && t.trim().length > 0);
  need(LORE.npc && typeof LORE.npc.name === 'string' && LORE.npc.model in MODEL_DEFS && num(LORE.npc.scale) && num(LORE.npc.bulk), 'Lore: the NPC needs a name, a model in MODEL_DEFS, scale and bulk.');
  need(lines(LORE.ending), 'Lore: ending must be a list of cards (text).');
  // v7.0: the rest of the cast (a level's NPC may name one with `who`) and each road's own ending cards (by level id).
  for (const [id, W] of Object.entries(LORE.cast || {}))
    need(W && typeof W.name === 'string' && W.model in MODEL_DEFS && num(W.scale) && num(W.bulk) && (!('halo' in W) || Number.isInteger(W.halo)),
      `Lore cast "${id}": needs a name, a model in MODEL_DEFS, scale and bulk (and halo, a colour, if given).`);
  for (const [id, cards] of Object.entries(LORE.endings || {})) {
    const L = ALL_LEVELS.find(l => l.id === id);
    need(L && L.ending === true && lines(cards), `Lore ending "${id}": must name a level with ending: true, and list its cards (text).`);
  }
  const inscIds = new Set();
  for (const [id, D] of Object.entries(LORE.levels)) {
    const tag = `Lore "${id}"`;
    need(ALL_LEVELS.some(l => l.id === id), `${tag}: no level with that id.`);
    for (const N of D.npcs || []) {
      const L = ALL_LEVELS.find(l => l.id === id);
      need(num(N.x) && num(N.z) && num(N.yaw) && ['stand', 'sit'].includes(N.pose) && lines(N.lines) && typeof N.idle === 'string', `${tag}: the NPC needs x, z, yaw, pose (stand/sit), lines and an idle line.`);
      if ('who' in N) need(!!(LORE.cast && LORE.cast[N.who]), `${tag}: the NPC's who "${N.who}" is not in LORE.cast.`);
      if ('spirit' in N) need(typeof N.spirit === 'boolean', `${tag}: spirit must be true or false.`);
      if ('solid' in N) need(Array.isArray(N.solid) && N.solid.length === 4 && N.solid.every(num) && N.solid[0] < N.solid[1] && N.solid[2] < N.solid[3], `${tag}: solid must be [x0, x1, z0, z1].`);
      if ('after' in N) need(L && (L.gated || []).some(g => g.id === N.after), `${tag}: the NPC's after must name a zone of the level.`);
      if ('bonfire' in N) need(L && L.bonfires.some(b => b.id === N.bonfire), `${tag}: the NPC's bonfire must name a bonfire of the level.`);
      if ('bars' in N) need(Array.isArray(N.bars) && N.bars.length > 0
        && (Array.isArray(N.bars[0]) ? N.bars : [N.bars]).every(b => Array.isArray(b) && b.length === 4 && b.every(num) && Math.hypot(b[2] - b[0], b[3] - b[1]) > 0),
        `${tag}: bars must be [x0, z0, x1, z1] or a list of those segments.`);
    }
    for (const I of D.inscriptions || []) {
      need(typeof I.id === 'string' && !inscIds.has(I.id), `${tag}: inscription ids must be unique strings ("${I.id}").`); inscIds.add(I.id);
      need(num(I.x) && num(I.z) && num(I.yaw) && ['wall', 'floor', 'none'].includes(I.mount) && typeof I.label === 'string' && lines(I.lines), `${tag} inscription "${I.id}": needs x, z, yaw, mount, label and lines.`);
    }
    for (const S of D.scenes || []) {
      need(LORE_SCENES.includes(S.kind) && num(S.x) && num(S.z), `${tag}: scene "${S.kind}" must be one of ${LORE_SCENES.join(', ')} with x and z.`);
      if ('of' in S) need(S.kind === 'statue' && !!ENEMY_BY_ID[S.of] && !!ENEMY_BY_ID[S.of].model, `${tag}: a scene's of must be on a statue and name an enemy with a model ("${S.of}").`);   // v7.40.0
    }
  }
  errors.push(...validateBonfireGuidance());
  return errors;
}
function validateBonfireGuidance() {
  const errors = [], need = (ok, msg) => { if (!ok) errors.push(`Bonfire guidance: ${msg}`); };
  const num = v => typeof v === 'number' && Number.isFinite(v), C = CONFIG.VISUALS.guidance;
  for (const key of ['spacing', 'particles', 'lowParticles', 'height', 'travel', 'spread', 'rise', 'size', 'maxPx', 'opacity', 'life', 'near', 'far', 'fadeBand', 'arrival', 'floorTolerance', 'sample'])
    need(num(C[key]) && C[key] > 0, `CONFIG.VISUALS.guidance.${key} must be positive.`);
  need(Number.isInteger(C.particles) && Number.isInteger(C.lowParticles) && C.lowParticles <= C.particles, 'particle counts must be integers, Low no higher than High.');
  need(C.far > C.near && C.fadeBand < C.far && C.opacity <= 1, 'invalid fade distances or opacity.');
  const E = CONFIG.VISUALS.effectLight;
  for (const key of ['range', 'intensity', 'decay', 'floor', 'fade', 'maxDistance', 'windup', 'active', 'sourceRetention', 'minPower', 'tip', 'maxDt', 'projectile', 'breath', 'sigil'])
    need(num(E[key]) && E[key] > 0, `CONFIG.VISUALS.effectLight.${key} must be positive.`);
  need(Number.isInteger(E.pulseSlots) && E.pulseSlots > 0, 'effect-light pulseSlots must be a positive integer.');
  need(Array.isArray(E.elements) && E.elements.every(id => id in FX_ELEMENTS), 'effect-light elements must name FX_ELEMENTS.');
  need(num(E.storm.intensity) && E.storm.intensity > 0 && num(E.storm.ambient) && E.storm.ambient > 0
    && Array.isArray(E.storm.direction) && E.storm.direction.length === 3 && E.storm.direction.every(num)
    && Math.hypot(...E.storm.direction) > 0, 'storm lighting needs positive intensity/fill and a nonzero direction.');
  for (const [preset, q] of Object.entries(CONFIG.VISUALS.quality)) {
    const n = CONFIG.VISUALS.effectLight.counts[preset];
    need(Number.isInteger(n) && n > 0 && n < q.lights, `${preset}: effect lights must fit inside its local-light budget.`);
  }
  for (const [id, routes] of Object.entries(BONFIRE_GUIDANCE)) {
    const L = ALL_LEVELS.find(l => l.id === id);
    need(!!L, `unknown level "${id}".`); if (!L) continue;
    need(Array.isArray(routes) && routes.length > 0, `${id}: routes must be a nonempty list.`); if (!Array.isArray(routes)) continue;
    need(routes.filter(r => r && !routes.some(previous => previous && previous.to === r.from)).length === 1, `${id}: routes need one starting bonfire.`);
    need(new Set(routes.filter(Boolean).map(r => r.from)).size === routes.length, `${id}: each bonfire can have only one outgoing route.`);
    const ids = new Set();
    for (const route of routes) {
      const tag = `${id}/${route && route.id}`;
      need(route && typeof route.id === 'string' && !ids.has(route.id), `${tag}: route needs a unique id.`); if (!route) continue;
      ids.add(route.id);
      need(route.from !== route.to && [route.from, route.to].every(id => L.bonfires.some(b => b.id === id)), `${tag}: from/to must name distinct bonfires of the level.`);
      need(Array.isArray(route.paths) && route.paths.length > 0, `${tag}: paths must be a nonempty list.`);
      for (const path of Array.isArray(route.paths) ? route.paths : []) {
        const valid = Array.isArray(path) && path.length >= 2 && path.every(p => Array.isArray(p) && p.length === 3 && p.every(num));
        need(valid, `${tag}: each path needs at least two [x, y, z] points.`); if (!valid) continue;
        if (L.layout === 'rooms') for (const p of path) {
          const y = terrainFor(L).floorY(p[0], p[2], p[1]);
          need(Number.isFinite(y) && Math.abs(y - p[1]) < C.floorTolerance, `${tag}: point (${p.join(', ')}) must stand on its floor.`);
        }
      }
    }
  }
  return errors;
}
const GATE_STYLES = ['portcullis', 'barricade'];
const HOUSE_KINDS = ['house', 'tower'];
/// Room-style level checks (see LEVEL_2 and js/terrain.js): shapes first, then the 3D layout built from them.
// A level's lesson cards (v7.19.0, js/data/lessons.js): each a known lesson, once, with one trigger whose references exist
// in this level (a zone, a bonfire, an enemy kind, an earlier lesson of the same list).
function validateLessons(L, where, need) {
  need(Array.isArray(L.lessons) && L.lessons.length > 0, `${where}: lessons must be a non-empty list.`);
  if (!Array.isArray(L.lessons)) return;
  const seen = new Set();
  for (const e of L.lessons) {
    const tag = `${where} lesson "${e && e.lesson}"`;
    need(e && e.lesson in LESSONS && !seen.has(e.lesson), `${tag}: unknown or repeated lesson.`);
    const w = e && e.when, keys = w && typeof w === 'object' ? Object.keys(w) : [];
    need(keys.length === 1 && LESSON_TRIGGERS.includes(keys[0]), `${tag}: when needs exactly one of ${LESSON_TRIGGERS.join(', ')}.`);
    if (keys.length === 1) {
      const v = w[keys[0]];
      if (keys[0] === 'x' || keys[0] === 'hurt' || keys[0] === 'group') need(Number.isFinite(v) && v >= 0, `${tag}: ${keys[0]} must be a number.`);
      if (keys[0] === 'hurt') need(v > 0 && v < 1, `${tag}: hurt is a fraction of the bar.`);
      if (keys[0] === 'zone') need((L.gated || []).some(z => z.id === v), `${tag}: no zone "${v}" in this level.`);
      if (keys[0] === 'near') need((L.bonfires || []).some(b => b.id === v), `${tag}: no bonfire "${v}" in this level.`);
      if (keys[0] === 'enemy') need(v in ENEMY_BY_ID, `${tag}: no enemy "${v}".`);
      if (keys[0] === 'glint') need(v === 'red' || v === 'blue', `${tag}: glint is red or blue.`);
      if (keys[0] === 'kneel') need(v === true, `${tag}: kneel must be true.`);
      if (keys[0] === 'after') need(seen.has(v), `${tag}: after must name an earlier lesson of this level.`);
    }
    if (e && e.lesson) seen.add(e.lesson);
  }
}
function validateRooms(L, where, need, num, visual = true) {
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
    if ('unseen' in R) check(typeof R.unseen === 'boolean' && !!L.scenery, `${tag}: unseen must be true or false, and needs a level scenery to draw the room.`);
    if ('pillarSize' in R) check(num(R.pillarSize) && R.pillarSize > 0, `${tag}: pillarSize must be a positive number.`);
    if ('pillarHeight' in R) check(num(R.pillarHeight) && R.pillarHeight > H.stepUp && R.pillarHeight <= (R.height ?? L.wallHeight ?? Infinity) && 'pillars' in R,
      `${tag}: pillarHeight must be above CONFIG.height.stepUp (${H.stepUp} m), at most the room's height, with pillars to raise.`);   // v7.62.0
    if ('pillars' in R) check(Array.isArray(R.pillars) && R.pillars.every(P => Array.isArray(P) && num(P[0]) && num(P[1]) && (P[2] === undefined || num(P[2]) && P[2] > 0)), `${tag}: pillars must be a list of [x, z] or [x, z, size].`);
    if ('lampFlame' in R) check(!!R.lampFlame && num(R.lampFlame.size) && num(R.lampFlame.y), `${tag}: lampFlame needs a size and a height y.`);
    if ('lamps' in R) check(Array.isArray(R.lamps) && rectOk(R.rect) && R.lamps.every(l => Array.isArray(l) && l.length === 2 && l.every(num)
      && inRect(R.rect, l[0], l[1])), `${tag}: lamps must be a list of [x, z] inside the room.`);
  }
  if ('ramps' in L) check(Array.isArray(L.ramps), `${where}: ramps must be a list.`);
  for (const R of Array.isArray(L.ramps) ? L.ramps : []) {
    const tag = `${where} ramp "${R.id}"`;
    if ('unseen' in R) check(typeof R.unseen === 'boolean' && !!L.scenery, `${tag}: unseen must be true or false, and needs a level scenery to draw the ramp.`);
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
  // A level's authored scenery (js/scenery.js): its meshes exist only in the browser.
  if ('scenery' in L) {
    const S = L.scenery, list = S && Array.isArray(S.meshes) ? S.meshes : [], slots = S && S.materials ? Object.keys(S.materials) : [];
    check(!!S && list.length > 0 && slots.length > 0 && Number.isFinite(S.far) && S.far > 0, `${where}: scenery needs meshes, materials and a far plane.`);
    if (S && S.instances) check(Object.values(S.instances).every(m => Array.isArray(m) && m.length > 0), `${where}: scenery instances map a kind to its meshes.`);
    if (S && S.veil) check(num(S.veil.x) && Array.isArray(S.veil.y) && Array.isArray(S.veil.z) && Number.isInteger(S.veil.color), `${where}: scenery veil needs x, y, z and color.`);
    if (S && S.veil) check(!!(L.atmosphere && L.atmosphere.interior), `${where}: a scenery veil lifts with atmosphere.interior, which it lacks.`);
    for (const k of ['plan', 'distant']) if (S && k in S) check(Array.isArray(S[k]) && S[k].every(n => list.includes(n)), `${where}: scenery ${k} must list scenery meshes.`);
    if (S && 'thin' in S) check(Array.isArray(S.thin) && S.thin.every(k => S.instances && k in S.instances), `${where}: scenery thin must list instance kinds.`);
    for (const [slot, M] of Object.entries((S && S.materials) || {})) {
      if ('tex' in M) check(TEXTURE_DEFS.some(t => t.id === M.tex), `${where}: scenery material "${slot}" has an unknown tex.`);
      if ('ground' in M) check(M.ground in CONFIG.VISUALS.realms.ground, `${where}: scenery material "${slot}" has an unknown ground.`);
      for (const k of ['tile', 'bump']) if (k in M) check(num(M[k]) && M[k] > 0, `${where}: scenery material "${slot}": ${k} must be a positive number.`);
      if (visual && 'painted' in M) check(scenery.painters.includes(M.painted), `${where}: scenery material "${slot}" has an unknown painter.`);
    }
    if (visual) for (const kind of Object.keys((S && S.instances) || {})) check(kind in BAKED_PLACES, `${where}: scenery instance "${kind}" has no placements.`);
    if (S && S.tracks) check(Array.isArray(S.tracks.rooms) && S.tracks.rooms.length > 0 && S.tracks.rooms.every(id => ids.has(id)), `${where}: scenery tracks need rooms of the level.`);
    if (visual) for (const name of [...list, ...Object.values((S && S.instances) || {}).flat()]) {
      check(name in BAKED, `${where}: scenery mesh "${name}" is not baked.`);
      check(slots.includes(name.split('__')[1]), `${where}: scenery mesh "${name}" has no material.`);
    }
  }
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
    check(P && P.kind in PROP_KINDS && (!visual || P.kind in PROP_LOOKS), `${tag}: unknown prop kind "${P && P.kind}" (known: ${Object.keys(PROP_KINDS).join(', ')}).`);
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
  // v7.0: a level may grant more flasks, and may lay hazard floors (rot) that hurt while stood in.
  if ('flasks' in L) need(Number.isInteger(L.flasks) && L.flasks >= 1 && L.flasks <= 12, `${where}: flasks must be a whole number from 1 to 12.`);
  if ('hazards' in L) need(Array.isArray(L.hazards), `${where}: hazards must be a list.`);
  for (const h of Array.isArray(L.hazards) ? L.hazards : []) {
    const tag = `${where} hazard "${h && h.id}"`;
    need(h && typeof h.id === 'string' && rectOk(h.rect) && num(h.dps) && h.dps > 0 && ['rot'].includes(h.kind) && (!('y' in h) || num(h.y)),
      `${tag}: needs an id, a rect, a kind ('rot') and dps above 0 (and y, if given, a number).`);
    if (h && rectOk(h.rect)) need(inset(h.rect).every(([x, z]) => onFloor(x, z, h.y ?? 0)), `${tag}: its rect must lie on the floor at y ${h.y ?? 0}.`);
    if (h && rectOk(h.rect)) need(!L.bonfires.some(b => inRect(h.rect, b.spawn.x, b.spawn.z) && Math.abs((b.spawn.y ?? 0) - (h.y ?? 0)) < 1), `${tag}: covers a bonfire's spawn.`);
  }
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
    // v7.0: a house given its own `y` may stand over a room that lies wholly beneath it (a cellar under a street).
    const faces = houseFaces(Hs, regions).filter(R => !(Hs.y !== undefined && R.top <= y + 0.05));
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
