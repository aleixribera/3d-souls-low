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
    need([ArenaNet.config.calling.id, ArenaNet.config.weekly.id].includes(intro.id), `Unknown lobby intro: ${intro.id}.`);
    for (const field of ['title', 'goal']) need(typeof intro[field] === 'string' && intro[field].trim(), `Lobby intro ${intro.id}: missing ${field}.`);
  }
  for (const id of [ArenaNet.config.calling.id, ArenaNet.config.weekly.id]) need(introIds.has(id), `Missing lobby intro: ${id}.`);
  // The player's look (pass 91, js/player-pose.js, Rig.settle): blend times, the deflect's pose, the player's easings.
  // The art style exploration (js/data/styles.js, js/style-lab.js): numbers it writes into shaders must be numbers.
  if (visual) {
    const n = v => Number.isFinite(v), pos = v => n(v) && v > 0, rgb = c => Array.isArray(c) && c.length === 3 && c.every(n), seen = new Set();
    need(STYLE_DEFS.filter(S => S.default === true).length === 1 && STYLE_DEFS.every(S => [undefined, true].includes(S.default)), 'Styles: exactly one style is `default: true` (the look without ?style=).');
    for (const S of STYLE_DEFS) {
      const at = `Style "${S.id}"`, P = S.post, B = S.bands;
      need(typeof S.id === 'string' && /^[a-z]+$/.test(S.id) && !seen.has(S.id) && typeof S.name === 'string', `${at}: a unique lower-case id and a name.`); seen.add(S.id);
      need([null, 'bands', 'soft'].includes(S.shade), `${at}: shade is null, 'bands' or 'soft'.`);
      if (S.shade === 'bands') need(B && Array.isArray(B.at) && Array.isArray(B.level) && B.at.length === B.level.length && B.at.every(n) && B.level.every(pos) && pos(B.keep) && pos(B.soft)
        && B.at.every((a, i) => !i || a > B.at[i - 1]), `${at}: bands need rising \`at\`, one positive \`level\` each, \`keep\` and \`soft\`.`);
      const Bd = S.body;   // (pass 118) a modelled body's own bands
      if (Bd) need(S.shade === 'bands' && Array.isArray(Bd.at) && Array.isArray(Bd.level) && Bd.at.length === Bd.level.length && Bd.at.every(n) && Bd.level.every(pos) && pos(Bd.soft)
        && Bd.at.every((a, i) => !i || a > Bd.at[i - 1]), `${at}: body bands need shade 'bands', rising \`at\`, one positive \`level\` each, and \`soft\`.`);
      const St = S.steel;   // (pass 121) a steel slot's bands and glint
      if (St) need(S.shade === 'bands' && Array.isArray(St.at) && Array.isArray(St.level) && St.at.length === St.level.length && St.at.every(n) && St.level.every(pos) && pos(St.soft)
        && St.at.every((a, i) => !i || a > St.at[i - 1]) && pos(St.glint) && n(St.glintLevel) && St.glintLevel >= 0, `${at}: steel needs shade 'bands', rising \`at\`, one positive \`level\` each, \`soft\`, a positive \`glint\` and \`glintLevel\` 0 or more.`);
      if (S.shade === 'soft') need(pos(S.knee), `${at}: a soft shade needs a positive knee.`);
      need((S.hitFlash === undefined || n(S.hitFlash) && S.hitFlash >= 0 && S.hitFlash <= 1) && [undefined, true].includes(S.tintFromSkin), `${at}: hitFlash is 0 to 1; tintFromSkin only true.`);
      if (S.flat) need(pos(S.flat.bias) && n(S.flat.keep) && S.flat.keep >= 0 && S.flat.keep <= 1, `${at}: flat needs a positive mip bias and keep 0 to 1.`);
      if (!P) continue;
      need(P.sceneDepth === undefined || P.ink && !P.rim && pos(P.sceneDepth.depth), `${at}: post.sceneDepth needs ink, no rim, and a positive depth.`);
      need(pos(P.prepass) && P.prepass <= 1 && (P.sat === undefined || n(P.sat)) && (P.exposure === undefined || pos(P.exposure)) && (P.tint === undefined || rgb(P.tint)), `${at}: post.prepass is 0 to 1 of the screen; sat a number; exposure above 0; tint [r, g, b].`);
      if (P.ink) need(['depth', 'width', 'color', 'fade'].every(k => n(P.ink[k])) && (P.ink.fold === undefined || pos(P.ink.fold)), `${at}: ink needs depth, width, color and fade (fold optional).`);
      if (P.haze) need(n(P.haze.from) && P.haze.to > P.haze.from && rgb(P.haze.color) && n(P.haze.amount), `${at}: haze needs from < to, an [r, g, b] color and amount.`);
      if (P.rim) need(rgb(P.rim.color) && ['power', 'strength', 'near'].every(k => pos(P.rim[k])), `${at}: rim needs an [r, g, b] color, power, strength and near.`);
      if (P.brush) need(Number.isInteger(P.brush.radius) && P.brush.radius >= 1 && P.brush.radius <= 6 && n(P.brush.wobble) && n(P.brush.canvas), `${at}: brush needs a whole radius 1 to 6, wobble and canvas.`);
    }
  }
  if (visual) {
    need(Number.isInteger(TEXTURE_SETTINGS.workers) && TEXTURE_SETTINGS.workers >= 1 && TEXTURE_SETTINGS.workers <= 16, 'TEXTURE_SETTINGS.workers: a whole number of background texture bakers, 1 to 16.');
    const A = ANIM_SETTINGS, num =v => typeof v === 'number' && v > 0 && v < 1, rot = P => P && typeof P === 'object' && Object.values(P).every(v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite));
    need(A.settle && num(A.settle.time) && Object.entries(A.settle.into || {}).every(([s, t]) => Object.values(PS).includes(s) && num(t)), 'ANIM_SETTINGS.settle: time and every `into` time must be 0 to 1 s (states from PS).');
    const D = A.deflect;
    need(D && [D, D.clang].every(d => d && num(d.rise) && num(d.hold) && num(d.fall) && num(d.drop) && rot(d.pose)), 'ANIM_SETTINGS.deflect: rise, hold and fall (s), drop (m) and a pose of [x, y, z] per bone, for the press and its clang.');
    need(D && D.clang && Array.isArray(D.clang.step) && D.clang.step.length === 2 && D.clang.step.every(v => Number.isFinite(v) && Math.abs(v) <= 0.6),
      'ANIM_SETTINGS.deflect.clang.step: [side, back] m the body steps off its line (at most 0.6 each).');
    const Rb = D && D.clang && D.clang.rebound;
    need(Rb && num(Rb.delay) && num(Rb.rise) && num(Rb.hold) && num(Rb.fall) && num(Rb.drop) && rot(Rb.pose),
      'ANIM_SETTINGS.deflect.clang.rebound: delay, rise, hold and fall (s), drop (m) and a pose of [x, y, z] per bone.');
    need(A.clothClamp > 0 && A.clothSpeed > 0, 'ANIM_SETTINGS.clothClamp (rad) and clothSpeed (m/s): both above 0.');
    for (const [id, M] of Object.entries(MODEL_DEFS)) {
      for (const c of (M.anim && M.anim.cloth) || [])
        need(c.max === undefined || (c.max > 0 && c.max <= A.clothClamp), `Model "${id}": cloth ${c.bone}'s max must be above 0 and at most ANIM_SETTINGS.clothClamp (rad).`);
      for (const s of (M.anim && M.anim.spin) || [])
        need(s && typeof s.bone === 'string' && ['x', 'y', 'z'].includes(s.axis) && Number.isFinite(s.speed) && s.speed !== 0
          && (s.revealMul === undefined || (Number.isFinite(s.revealMul) && s.revealMul > 0)),
          `Model "${id}": spin needs bone (string), axis ('x'|'y'|'z'), non-zero speed (rad/s), and optional positive revealMul.`);
    }
    const Da = A.dash, L = A.land, r3 = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
    const Dk = Da && Da.keys;
    need(Da && num(Da.rise) && Da.lift >= 0 && Da.lift <= 0.3 && Array.isArray(Dk) && Dk.length >= 2 && Dk[0].at === 0 && Dk[Dk.length - 1].at === 1
      && Dk.every((k, i) => (i === 0 || k.at > Dk[i - 1].at) && Math.abs(k.lean) < 1.5 && Math.abs(k.tip) < 0.5 && Number.isFinite(k.head)
        && ['legL', 'legR', 'armL', 'armR', 'weapon'].every(b => r3(k[b])) && ['kneeL', 'kneeR', 'elbowL', 'elbowR'].every(b => Number.isFinite(k[b]))),
      'ANIM_SETTINGS.dash: rise (s), lift (0 to 0.3 m) and keys (at least two, `at` rising from 0 to 1), each with lean and tip (rad), head, [x, y, z] for legL, legR, armL, armR and weapon, and a bend for each knee and elbow.');
    const Cg = A.counterGlow;
    need(Cg && Number.isInteger(Cg.color) && Number.isInteger(Cg.bone) && Cg.emissive > 0 && Cg.emissive <= 4 && Cg.min >= 0 && Cg.min < 1 && Cg.glint >= 0 && Cg.glint <= 1
      && Cg.flare >= 0 && Cg.flare <= 4 && num(Cg.flareTime),
      'ANIM_SETTINGS.counterGlow: a colour and a bone colour, emissive (above 0, at most 4), min (0 to 1), glint (0 to 1), flare (0 to 4) and flareTime (s).');
    const Cf = A.counterFx, hex = c => Number.isInteger(c) && c >= 0 && c <= 0xffffff, pos = v => typeof v === 'number' && v > 0 && v < 20;
    need(Cf && Cf.dim && Cf.dim.peak >= 0 && Cf.dim.peak <= 0.8 && num(Cf.dim.in) && num(Cf.dim.out) && Cf.mark && pos(Cf.mark.size) && num(Cf.mark.time) && hex(Cf.mark.color)
      && Cf.trail && hex(Cf.trail.color) && pos(Cf.trail.boost) && Cf.trail.life >= 1 && Cf.trail.life < 6 && Cf.cut && pos(Cf.cut.length) && num(Cf.cut.thin) && Cf.cut.wide > Cf.cut.thin
      && num(Cf.cut.show) && hex(Cf.cut.color) && Number.isInteger(Cf.cut.sparks) && Number.isInteger(Cf.cut.arcSparks) && Number.isFinite(Cf.cut.tilt)
      && Cf.aura && hex(Cf.aura.color) && pos(Cf.aura.size) && pos(Cf.aura.boost) && Cf.aura.min >= 0 && Cf.aura.min <= 1 && Cf.aura.breath >= 0 && Cf.aura.breath < 0.5
      && Cf.aura.pulse > 0 && Cf.aura.pulse < 3 && Cf.aura.body >= 0 && Cf.aura.body <= 1 && num(Cf.aura.in) && num(Cf.aura.out)
      && Cf.aura.ring && hex(Cf.aura.ring.color) && pos(Cf.aura.ring.from) && pos(Cf.aura.ring.to) && Cf.aura.ring.to < Cf.aura.ring.from,
      'ANIM_SETTINGS.counterFx: dim (peak 0 to 0.8, in and out s), mark (size m, time s, colour), trail (colour, boost, life at least 1), cut (length, thin < wide m, show s, colour, sparks and arcSparks counts, tilt rad), aura (colour, size, boost, min 0 to 1, breath under 0.5, pulse under 3 Hz, body 0 to 1, in and out s, ring colour and from > to m).');
    const Ff = A.finisherFx, Fk = Ff && Ff.crack, Fz = Ff && Ff.freeze, Fc = Ff && Ff.cut, unit = v => typeof v === 'number' && v >= 0 && v <= 1;
    need(Fk && pos(Fk.size) && unit(Fk.depth) && pos(Fk.boost) && [Fk.color, Fk.hot].every(hex) && num(Fk.pop) && Fk.breath >= 0 && Fk.breath < 0.5
      && Fk.pulse > 0 && Fk.pulse < 3 && pos(Fk.out) && pos(Fk.burstTime)
      && Fz && unit(Fz.sat) && unit(Fz.vignette) && unit(Fz.dark) && Fz.dark < 1 && unit(Fz.hold) && num(Fz.in) && num(Fz.out) && unit(Fz.kick) && unit(Fz.flash)
      && Array.isArray(Fz.tint) && Fz.tint.length === 3 && Fz.tint.every(v => v >= 0 && v <= 2) && hex(Fz.flashColor)
      && Ff.streak && pos(Ff.streak.width) && num(Ff.streak.life) && unit(Ff.streak.held) && hex(Ff.streak.color)
      && Fc && pos(Fc.length) && num(Fc.thin) && Fc.wide > Fc.thin && unit(Fc.held) && num(Fc.show) && hex(Fc.color) && hex(Fc.glow) && Fc.delay >= 0
      && Array.isArray(Fc.heights) && Fc.heights.length > 0 && Fc.heights.every(unit) && Array.isArray(Fc.tilts) && Fc.tilts.length > 0 && Fc.tilts.every(Number.isFinite)
      && Ff.burst && pos(Ff.burst.size) && num(Ff.burst.time) && hex(Ff.burst.color) && Number.isInteger(Ff.burst.sparks) && unit(Ff.burst.flash)
      && Ff.burst.light >= 0 && Ff.burst.light <= 20 && ['parry', 'ember'].includes(Ff.burst.kind) && hex(Ff.burst.flashColor) && unit(Ff.burst.tint)
      && Ff.camera && Ff.camera.swing >= 0 && Ff.camera.swing < 1.2 && num(Ff.camera.back) && unit(Ff.camera.punch) && pos(Ff.camera.punchRate),
      'ANIM_SETTINGS.finisherFx: crack (size, depth 0 to 1, boost, colour, hot colour, pop s, breath under 0.5, pulse under 3 Hz, out and burstTime s), freeze (sat, vignette, hold, kick and flash 0 to 1, dark 0 to under 1, in and out s, tint [r, g, b] 0 to 2, flashColor), streak (width, life s, held 0 to 1, colour), cut (length, thin < wide m, held 0 to 1, show and delay s, colour, glow colour, heights 0 to 1, tilts rad), burst (size, time s, colour, sparks, flash 0 to 1, light 0 to 20, kind parry or ember, flashColor, tint 0 to 1) and camera (swing under 1.2 rad, back s, punch 0 to 1, punchRate 1/s).');
    const Gd = A.guard;
    need(Gd && Gd.drop >= 0 && Gd.drop < 0.3 && rot(Gd.pose), 'ANIM_SETTINGS.guard: drop (0 to 0.3 m) and a pose of [x, y, z] per bone.');
    need(L && num(L.rise) && num(L.hold) && num(L.fall) && num(L.drop) && num(L.min) && L.ref > 0 && Number.isFinite(L.lean), 'ANIM_SETTINGS.land: rise, hold and fall (s), drop (m), min (0 to 1), ref (m/s) and lean (rad).');
    need(Object.entries(A.playerEase || {}).every(([ph, e]) => MARKER_PHASES.includes(ph) && e in EASE), `ANIM_SETTINGS.playerEase: phases ${MARKER_PHASES.join(', ')}, easings from EASE.`);
    const G = A.afterimage, look = g => g && num(g.life) && num(g.opacity) && Number.isInteger(g.color) && g.color >= 0 && g.color <= 0xffffff;
    need(G && look(G) && look(G.dodge) && look(G.finisher) && Number.isInteger(G.finisher.perStep) && G.finisher.perStep >= 1 && G.finisher.perStep <= G.pool && num(G.core) && num(G.inLine) && G.cover > 0 && Array.isArray(G.clear) && G.clear.length === 2 && G.clear[0] >= 0 && G.clear[1] > G.clear[0] && Number.isInteger(G.pool) && G.pool >= 1 && G.pool <= 12 && G.gap > 0
      && Object.keys(CONFIG.VISUALS.fxBudgets).every(b => Number.isInteger(G.perDash && G.perDash[b]) && G.perDash[b] >= 1 && G.perDash[b] <= G.pool),
      'ANIM_SETTINGS.afterimage: pool (1 to 12 figures), gap (m), core and inLine (0 to 1), cover (m), clear ([from, to] m), life and opacity (0 to 1), a colour, perDash per effect budget (1 to pool), and the same look for `dodge` and `finisher` (its perStep: copies a flash step, 1 to pool).');
  }
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
  // The sparring scene's drills (js/data/sparring.js): each names its keys, shows a timed demo and has a completion rule.
  need(new Set(SPARRING_DRILLS.map(d => d.id)).size === SPARRING_DRILLS.length, 'Sparring: drill ids must be unique.');
  for (const d of SPARRING_DRILLS) {
    const tag = `Sparring drill ${d.id}`, steps = d.demo && d.demo.steps;
    need(typeof d.id === 'string' && typeof d.name === 'string' && d.name.trim() && (typeof d.on === 'function' || typeof d.check === 'function'), `${tag}: needs a name and an on() or check() rule.`);
    need(Array.isArray(d.keys) && d.keys.length > 0 && d.keys.every(k => k === 'move' || (typeof ACTIONS === 'undefined' ? typeof k === 'string' : k in ACTIONS)), `${tag}: keys must name actions or 'move'.`);
    need(d.demo && typeof d.demo.time === 'number' && d.demo.time > 0 && Array.isArray(steps) && steps.length > 0
      && steps.every((s, i) => typeof s.at === 'number' && s.at >= 0 && s.at < d.demo.time && (i === 0 || s.at >= steps[i - 1].at)
        && ('press' in s ? typeof ACTIONS === 'undefined' || s.press in ACTIONS : 'move' in s ? [null, 'left', 'right', 'forward'].includes(s.move) : s.swing === true)),
      `${tag}: demo needs time > 0 and steps in order, each at a time inside it that presses an action, moves (left, right, forward or null) or swings.`);
    need(!d.ability || ABILITIES.some(b => b.id === d.ability), `${tag}: unknown ability ${d.ability}.`);
    need(d.hurt === undefined || (typeof d.hurt === 'number' && d.hurt > 0 && d.hurt < 1), `${tag}: hurt is the share of health left, 0 to 1.`);
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
  need(Array.isArray(PF) && PF[0] === 1 && PF.every((f, i) => Number.isInteger(f) && (i === 0 || f > PF[i - 1] && f > CONFIG.pace.warm)),
    'Practice: fights must be whole numbers, rising, starting at 1 (the base pace), the rest past the Boss Rush warm-up.');
  for (const [key, value] of Object.entries(CONFIG.companion)) need(num(value) && value > 0, `Companion ${key} must be positive.`);
  need(CONFIG.companion.separationShare <= 1, 'Companion separationShare must be at most 1.');
  const botConfig = CONFIG.bot, nav = botConfig.navigation || {};
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
  const DRAWN = Object.keys(RAR).filter(r => !RAR[r].given);   // the rarities a pick or a crate draws (a `given` one is handed out by a level)
  need(Number.isInteger(BL.offer) && BL.offer >= 1 && num(BL.pickTime) && BL.pickTime > 0 && num(BL.pickHold) && BL.pickHold >= 0 && BL.pickHold < BL.pickTime,
    'CONFIG.abilities: offer a whole number of 1 or more, pickTime positive, pickHold 0 or more and under pickTime.');
  need(['common', 'rare', 'legendary'].every(r => RAR[r]) && Object.values(RAR).every(R => Number.isInteger(R.levels) && R.levels >= 1 && num(R.weight) && R.weight >= 0 && num(R.grow) && R.grow >= 0
    && [undefined, true].includes(R.given) && (!R.given || R.weight === 0 && R.grow === 0)),
    'CONFIG.abilities.rarity: common, rare and legendary, each with whole levels of 1 or more and a weight and grow of 0 or more; a `given` one (only true) weighs 0.');
  need(Array.isArray(BL.first) && BL.first.length >= 1 && BL.first.every(r => RAR[r]) && ABILITIES.filter(b => BL.first.includes(b.rarity)).length >= BL.offer,
    'CONFIG.abilities: first a list of rarities with enough abilities for an offer.');
  need(num(BL.plainWeight) && BL.plainWeight > 0 && BL.plainWeight <= 1, 'CONFIG.abilities.plainWeight: above 0, at most 1 (a plain common against another common).');
  need(new Set(ABILITIES.map(b => b.id)).size === ABILITIES.length, 'Ability ids must be unique.');
  const SUM = BL.summons;   // where each summon stands and how fast it runs (js/abilities.js summonStep)
  need(SUM && [SUM.arrive, SUM.near, SUM.side, SUM.radius].every(x => num(x) && x >= 0) && [...SUMMONS].every(k => SUM[k] && num(SUM[k].gap) && SUM[k].gap >= 0
    && num(SUM[k].flank) && num(SUM[k].speed) && SUM[k].speed > 0 && num(SUM[k].height) && SUM[k].height > 0 && [undefined, true, false].includes(SUM[k].rises)) && [...SUMMON_STRIKERS].every(k => num(SUM[k].reach) && SUM[k].reach > 0),
    `CONFIG.abilities.summons: arrive, near, side and radius 0 or more; each summon (${[...SUMMONS].join(', ')}) a gap, a flank, a speed and a height above 0 (rises true or false); each that strikes (${[...SUMMON_STRIKERS].join(', ')}) a reach above 0.`);
  // Batch 10's placements: a kind's own arrive, a charge's start (`from`, `fromTurn`, `hold`), a circle (`orbit`), a perch
  // (its `side`, `lift` and `shot` speed; a perched kind never draws the boss: its levels carry no `draw`).
  if (SUM) for (const k of SUMMONS) {
    const S = SUM[k] || {}, opt = (key, lo = 0) => S[key] === undefined || (num(S[key]) && S[key] >= lo);
    need(opt('arrive') && opt('from') && opt('hold') && (S.fromTurn === undefined || num(S.fromTurn)) && (S.orbit === undefined || num(S.orbit))
      && [undefined, true, false].includes(S.perch) && opt('side') && opt('lift') && (S.shot === undefined || (num(S.shot) && S.shot > 0))
      && (S.hold === undefined || S.hold < (S.arrive ?? SUM.arrive)) && (!S.perch || (num(S.side) && num(S.lift) && num(S.shot)))
      && opt('alt') && opt('dive') && [undefined, true, false].includes(S.head) && [undefined, true, false].includes(S.coil) && opt('drop'),
      `CONFIG.abilities.summons.${k}: arrive, from, hold, side, lift, alt, dive and drop 0 or more, fromTurn and orbit numbers, perch, head and coil true or false (a perch needs side, lift and shot), shot above 0, hold under its arrive.`);
  }
  for (const b of ABILITIES) {
    const pw = b.power;
    if (!pw || !SUMMONS.has(pw.then) || !SUM || !SUM[pw.then]) continue;
    if (SUM[pw.then].perch) need(b.levels.every(v => v.draw === undefined), `Ability ${b.id}: a perched summon never draws the boss (no draw).`);
    // Batch 11: a summon whose blow flies needs its speed (`shot`) or its time (`dive`); an owl's `mark` a share above 0.
    if (SUMMON_SHOTS.has(pw.then)) need((num(SUM[pw.then].shot) && SUM[pw.then].shot > 0) || (num(SUM[pw.then].dive) && SUM[pw.then].dive > 0),
      `CONFIG.abilities.summons.${pw.then}: a shot speed or a dive time above 0 (its blow flies).`);
    if (pw.then === 'owl') need(b.levels.every(v => num(v.mark) && v.mark > 0 && v.mark <= 1 && v.draw === undefined) && num(SUM.owl.markLife) && SUM.owl.markLife > 0,
      `Ability ${b.id}: mark a share above 0, at most 1, no draw (an owl draws nothing), and CONFIG.abilities.summons.owl a markLife above 0.`);
    if (pw.then === 'lantern') need(b.levels.every(v => num(v.heal) && v.heal > 0 && v.heal <= 1) && SUM.lantern.shot > 0,
      `Ability ${b.id}: heal a share above 0, at most 1, and CONFIG.abilities.summons.lantern a shot speed.`);
  }
  // A summon drawn as a figure (js/summon-figures.js): its own model and its own moves (pass 81), each a timeline of key
  // poses no enemy or boss strikes with (VISION.md: no two share attacks).
  const enemyPoses = new Set(ENEMY_DEFS.flatMap(d => [...(d.attacks || []), ...Object.values(d.phases || {}).flatMap(P => P.attacks || [])])
    .filter(a => a && typeof a === 'object').map(a => a.pose));
  if (visual) for (const [k, F] of Object.entries(CONFIG.VISUALS.abilityFx)) if (F && (F.moves !== undefined || F.guard !== undefined)) {   // a figure: it stands guard
    need(Array.isArray(F.moves) && F.moves.length > 0 && F.moves.every(a => a && typeof a.name === 'string' && ATTACK_POSES[a.pose] && !enemyPoses.has(a.pose)
      && Array.isArray(a.hits) && a.hits.length === ATTACK_POSES[a.pose].hits.length && a.hits.every(h => num(h.startup) && h.startup > 0 && num(h.active) && h.active > 0)
      && num(a.recovery) && a.recovery >= 0 && (a.hop === undefined || num(a.hop) && a.hop >= 0)
      && (a.impact === undefined || ['ahead', 'ring', 'crack', 'dust', 'chunks', 'shake'].every(n => num(a.impact[n]) && a.impact[n] >= 0))),
      `CONFIG.VISUALS.abilityFx.${k}: moves must be a list of { name, pose (key poses no enemy uses, one per hit), hits [{ startup, active above 0 }], recovery, hop?, impact? { ahead, ring, crack, dust, chunks, shake } }.`);
    if (Array.isArray(F.moves)) F.moves.forEach((a, i) => a && Array.isArray(a.hits) && checkAttackAnim(a, `CONFIG.VISUALS.abilityFx.${k}.moves[${i}]`, need));
    need(F.idle === undefined || F.idle in IDLE_STYLES, `CONFIG.VISUALS.abilityFx.${k}: idle must be an idle style (${Object.keys(IDLE_STYLES).join(', ')}).`);
    need(typeof F.model === 'string' && ['rise', 'fade', 'strikeGlow', 'cryTime', 'turn', 'scale'].every(n => num(F[n]) && F[n] > 0) && !!F.guard && !!F.cry,
      `CONFIG.VISUALS.abilityFx.${k}: a figure needs a model, rise, fade, strikeGlow, cryTime, turn and scale above 0, and guard and cry poses.`);
    need(['solid', 'floor'].every(n => F[n] === undefined || typeof F[n] === 'boolean'), `CONFIG.VISUALS.abilityFx.${k}: solid and floor are true or false.`);
    // Its own model (pass 78): a model definition, each slot it colours and lights one of that model's materials.
    if ('model' in F) {
      const mats = [], used = [];   // its materials and the slots its parts are drawn in, through what it extends
      for (let M = MODEL_DEFS[F.model]; M; M = MODEL_DEFS[M.extends]) { mats.push(...Object.keys(M.materials || {})); if (!used.length) used.push(...(M.parts || []).map(o => o.slot).filter(Boolean)); }
      need(F.model in MODEL_DEFS && (F.bulk === undefined || num(F.bulk) && F.bulk > 0) && F.slots && typeof F.slots === 'object'
        && Object.entries(F.slots).every(([s, c]) => mats.includes(s) && Number.isInteger(c)) && Array.isArray(F.glows) && F.glows.every(s => mats.includes(s))
        && used.every(s => s in F.slots || F.glows.includes(s)),
        `CONFIG.VISUALS.abilityFx.${k}: model must be a model definition, bulk above 0, slots { <its material slot>: colour } and glows a list of its material slots, every slot its parts use in one of them.`);
    }
  }
  // The plain commons' touches (js/ability-touch.js): times and sizes above 0, each fade ending after it starts, the
  // Keen Eye ring under 3 Hz.
  if (visual) {
    const Tc = CONFIG.VISUALS.abilityFx.touch, pos = (o, ks) => o && ks.every(k => num(o[k]) && o[k] > 0), hx = c => Number.isInteger(c) && c >= 0 && c <= 0xffffff;
    need(Tc && pos(Tc.edge, ['run', 'fade', 'size', 'step']) && hx(Tc.edge.color) && Array.isArray(Tc.edge.bright) && Tc.edge.bright.length >= 1 && Tc.edge.bright.every(b => num(b) && b > 0 && b <= 1)
      && pos(Tc.iron, ['sparks']) && hx(Tc.iron.color) && pos(Tc.feather, ['flick', 'fadeAt', 'life', 'lift', 'size']) && pos(Tc.flask, ['hold', 'fade', 'size']) && hx(Tc.flask.color)
      && pos(Tc.ring, ['radius', 'gap', 'peak']) && Tc.ring.gap >= 1 / 3 && hx(Tc.ring.color)
      && pos(Tc.frost, ['length', 'grow', 'flakeAt', 'fadeAt', 'life', 'flakes']) && hx(Tc.frost.color) && pos(Tc.ink, ['length', 'width', 'sweep', 'fadeAt', 'life']) && num(Tc.ink.tilt)
      && [Tc.feather, Tc.frost, Tc.ink].every(o => o.fadeAt < o.life),
      'CONFIG.VISUALS.abilityFx.touch: edge, iron, feather, flask, ring, frost and ink, their times and sizes above 0, colours as hex, edge.bright 0 to 1, fadeAt before life, ring.gap at least 1/3 s.');
    // Batch 13: the impact frame (one a second at most: under 3 Hz), the crown, the cage, the twin's own model.
    const U1 = CONFIG.VISUALS.abilityFx.ults1;   // Ultimates I's look (js/legend-fx-3.js)
    need(U1 && Object.values(U1).every(x => num(x) && x > 0) && U1.see < 1 && Number.isInteger(U1.rain) && U1.rain <= 60 && Object.keys(U1).length === 27,
      'CONFIG.VISUALS.abilityFx.ults1: every number above 0 (all 27 of them), see under 1, rain a whole number up to 60.');
    const U2 = CONFIG.VISUALS.abilityFx.ults2;   // Ultimates II's look (js/legend-fx-4.js)
    need(U2 && Object.values(U2).every(x => num(x) && x > 0) && U2.see < 1 && U2.drop < CONFIG.abilities.ult.sky && Object.keys(U2).length === 26,
      'CONFIG.VISUALS.abilityFx.ults2: every number above 0 (all 26 of them), see under 1, drop shorter than CONFIG.abilities.ult.sky.');
    const U3 = CONFIG.VISUALS.abilityFx.ults3;   // Ultimates III's look (js/legend-fx-5.js)
    need(U3 && Object.values(U3).every(x => num(x) && x > 0) && U3.see < 1 && U3.half <= 1 && Number.isInteger(U3.riders) && Number.isInteger(U3.spearmen)
      && Number.isInteger(U3.ranks) && U3.close > 0.45 && Object.keys(U3).length === 19,
      'CONFIG.VISUALS.abilityFx.ults3: every number above 0 (all 19 of them), close over 0.45 s (the circle draws from 0.45 s), see under 1, half at most 1, riders, spearmen and ranks whole numbers.');
    const SF = CONFIG.VISUALS.abilityFx.story;   // Story's four's look (js/story-fx.js)
    need(SF && Object.values(SF).every(x => num(x) && x > 0) && SF.half <= 1 && SF.bellMin <= 1 && Object.keys(SF).length === 10,
      'CONFIG.VISUALS.abilityFx.story: every number above 0 (all 10 of them), half and bellMin at most 1.');
    const IF = CONFIG.VISUALS.impactFrame, FX = CONFIG.VISUALS.abilityFx, CRn = FX.crown, CGn = FX.cage, TW = FX.twin;
    need(pos(IF, ['time', 'calm', 'gap', 'near']) && IF.gap >= 1 && IF.time < IF.gap && num(IF.darken) && IF.darken > 0 && IF.darken < 1 && typeof IF.filter === 'string'
      && num(IF.dim) && IF.dim > 0 && IF.dim < 1 && Number.isInteger(IF.dimSteps) && IF.dimSteps >= 1,
      'CONFIG.VISUALS.impactFrame: time, calm, gap (at least 1 s) and near above 0, darken between 0 and 1, filter a CSS filter, dim between 0 and 1 in a whole number of dimSteps.');
    need(pos(CRn, ['fall', 'height', 'jitter', 'width', 'after', 'converge', 'cool', 'scorch', 'arcs']) && ['color', 'core', 'edge', 'ink'].every(c => hx(CRn[c])) && CRn.shards && CRn.burst
      && pos(CGn, ['n', 'size', 'pad', 'spin', 'climb', 'close', 'burst', 'out', 'see', 'slivers', 'light']) && Number.isInteger(CGn.n) && CGn.see <= 1 && CGn.close < CONFIG.abilities.cage.lead + 1e-9
      && ['color', 'edge', 'ink'].every(c => hx(CGn[c])),
      'CONFIG.VISUALS.abilityFx: crown { fall, height, jitter, width, after, converge, cool, scorch, arcs above 0, hex colours, shards, burst } and cage { n whole, sizes and times above 0, see up to 1, close within the cage\'s lead }.');
    const twinMats = []; for (let M = MODEL_DEFS[TW.model]; M; M = MODEL_DEFS[M.extends]) twinMats.push(...Object.keys(M.materials || {}));
    need(TW.model in MODEL_DEFS && hx(TW.ink) && TW.slots && Object.entries(TW.slots).every(([s, c]) => twinMats.includes(s) && hx(c)) && Array.isArray(TW.glows) && TW.glows.every(s => twinMats.includes(s)),
      'CONFIG.VISUALS.abilityFx.twin: model a model definition, ink a colour, slots { <its material slot>: colour } and glows its material slots.');
    // The beasts (js/summon-beasts.js: a kind with a `bright` slot) and the lantern (js/summon-lantern.js), pass 141.
    for (const [k, F] of Object.entries(CONFIG.VISUALS.abilityFx)) if (F && F.bright !== undefined) {
      need(['color', 'core', 'eye', 'ink', 'lit'].every(n => hx(F[n])) && typeof F.bright === 'string'
        && pos(F, ['outline', 'size', 'turn', 'rise', 'fade', 'gallopAt', 'strideRate', 'prowlRate', 'lunge', 'howlTime', 'snap', 'motes', 'pool', 'biteBoost'])
        && num(F.climb) && F.climb >= 0 && num(F.flicker) && F.flicker >= 0 && F.snapAt > 0 && F.snapAt < 1 && (F.ring === undefined || pos(F.ring, ['every', 'width', 'life']))
        && [F.burst, F.hitBurst].every(B => B && pos(B, ['count', 'speed']) && hx(B.color)) && Array.isArray(F.shake) && F.shake.length === 2 && F.shake.every(num),
        `CONFIG.VISUALS.abilityFx.${k}: a beast needs colours color, core, eye, ink and lit as hex, a bright slot's name, outline, size, turn, rise, fade, gallopAt, strideRate, prowlRate, lunge, howlTime, snap, motes, pool and biteBoost above 0, climb and flicker 0 or more, snapAt between 0 and 1, a ring (if any) with every, width and life above 0, burst and hitBurst with count, speed and a hex colour, and shake two numbers.`);
    }
    // The birds (js/summon-birds.js) and the crows (js/summon-crows.js), pass 144.
    for (const k of ['hawk', 'owl']) {
      const B = CONFIG.VISUALS.abilityFx[k];
      need(B && ['color', 'core', 'eye', 'ink', 'lit'].every(n => hx(B[n])) && typeof B.light === 'string' && (B.bar === undefined || (hx(B.bar) && hx(B.barLit)))
        && pos(B, ['outline', 'size', 'flap', 'wing', 'glide', 'turn', 'rise', 'fade', 'glowBoost', 'glowTime', 'motes']) && num(B.flicker) && B.flicker >= 0 && B.burst && pos(B.burst, ['count', 'speed']),
        `CONFIG.VISUALS.abilityFx.${k}: a bird needs color, core, eye, ink and lit as hex (bar and barLit too, if it has bars), a light slot's name, outline, size, flap, wing, glide, turn, rise, fade, glowBoost, glowTime and motes above 0, flicker 0 or more, and a burst.`);
    }
    const Hk = CONFIG.VISUALS.abilityFx.hawk, Ow = CONFIG.VISUALS.abilityFx.owl, Cr = CONFIG.VISUALS.abilityFx.crows;
    need(Hk && pos(Hk, ['climb', 'star', 'scorch']) && Hk.hitBurst && Array.isArray(Hk.shake) && Hk.shake.length === 2 && Hk.shake.every(num)
      && Ow && pos(Ow, ['rune', 'runeUp', 'pulse', 'burstTime', 'burstRing']) && Ow.pulse < 1,
      'CONFIG.VISUALS.abilityFx: the hawk needs climb, star and scorch above 0, a hitBurst and a shake; the owl rune, runeUp, burstTime and burstRing above 0 and a pulse under 1 Hz.');
    need(Cr && Number.isInteger(Cr.count) && Cr.count > 0 && ['color', 'eye', 'ink', 'lit'].every(n => hx(Cr[n]))
      && pos(Cr, ['outline', 'size', 'stagger', 'pour', 'head', 'ring', 'spin', 'spread', 'follow', 'dart', 'flap', 'flapAmp', 'cryTime', 'fade']) && Cr.burst,
      'CONFIG.VISUALS.abilityFx.crows: a whole count above 0, color, eye, ink and lit as hex, outline, size, stagger, pour, head, ring, spin, spread, follow, dart, flap, flapAmp, cryTime and fade above 0, and a burst.');
    // Summons III (pass 147): the brutes (js/summon-brutes.js), the serpent (js/summon-coil.js), the ronin's deflect and
    // the puppet's strings (js/summon-figures.js), and a large summon's `see` (0 to 1).
    const hb = B => B && pos(B, ['count', 'speed']) && hx(B.color), slotsOf = pre => new Set(Object.keys(BAKED).filter(n => n.startsWith(pre)).map(n => n.split('__')[1].split('.')[0]));
    for (const [k, B] of Object.entries(CONFIG.VISUALS.abilityFx)) if (B && B.brute) {
      const slots = slotsOf(k + ':');
      need(['color', 'core', 'ink', 'lit'].every(n => hx(B[n])) && Array.isArray(B.lights) && B.lights.every(s => slots.has(s))
        && Object.entries(B.tones || {}).every(([s, t]) => slots.has(s) && Array.isArray(t) && t.length === 2 && t.every(hx))
        && pos(B, ['outline', 'size', 'turn', 'rise', 'fade', 'strideRate', 'cryTime', 'boost', 'motes']) && num(B.flicker) && B.flicker >= 0
        && num(B.see) && B.see > 0 && B.see <= 1 && hb(B.burst) && hb(B.hitBurst) && Array.isArray(B.shake) && B.shake.length === 2 && B.shake.every(num)
        && (k !== 'bear' || (pos(B, ['swipeTime']) && B.impact && pos(B.impact, ['ahead', 'ring', 'shake']) && ['crack', 'dust', 'chunks'].every(n => num(B.impact[n]) && B.impact[n] >= 0))) && (k !== 'mantis' || pos(B, ['cutTime', 'shatter'])),
        `CONFIG.VISUALS.abilityFx.${k}: a brute needs color, core, ink and lit as hex, lights a list of its model's slots, tones { slot: [ink, lit] }, outline, size, turn, rise, fade, strideRate, cryTime, boost and motes above 0, flicker 0 or more, see above 0 up to 1, burst and hitBurst, a shake, and the bear swipeTime and an impact (ahead, ring and shake above 0, crack, dust and chunks 0 or more), the mantis cutTime and shatter.`);
    }
    need(pos(CONFIG.VISUALS.abilityFx, ['seeWidth']), 'CONFIG.VISUALS.abilityFx.seeWidth: above 0 (m).');
    const Sp = CONFIG.VISUALS.abilityFx.serpent, Ro = CONFIG.VISUALS.abilityFx.ronin, Pu = CONFIG.VISUALS.abilityFx.puppet;
    need(Sp && ['color', 'core', 'ink', 'lit'].every(n => hx(Sp[n])) && Array.isArray(Sp.lights) && Sp.lights.every(s => slotsOf('serpent:').has(s))
      && Number.isInteger(Sp.segs) && Sp.segs >= 4 && pos(Sp, ['outline', 'thick', 'turns', 'gap', 'climb', 'head', 'squeeze', 'squeezeTime', 'hissTime', 'boost', 'rise', 'fade', 'motes'])
      && Sp.squeeze < 0.5 && num(Sp.spin) && hb(Sp.burst) && hb(Sp.hitBurst),
      "CONFIG.VISUALS.abilityFx.serpent: color, core, ink and lit as hex, lights a list of its model's slots, a whole segs of 4 or more, outline, thick, turns, gap, climb, head, squeeze (under 0.5), squeezeTime, hissTime, boost, rise, fade and motes above 0, a spin, burst and hitBurst.");
    need(Ro && Ro.ink === true && pos(Ro, ['star', 'deflectTime']) && Ro.deflect && typeof Ro.deflect === 'object' && Pu && pos(Pu, ['strings'])
      && num(Pu.see) && Pu.see > 0 && Pu.see <= 1 && pos(CONFIG.abilities.summons.puppet, ['drop']),
      'CONFIG.VISUALS.abilityFx: the ronin is ink with star and deflectTime above 0 and a deflect key pose; the puppet strings above 0, see above 0 up to 1, and CONFIG.abilities.summons.puppet a drop above 0.');
    const L = CONFIG.VISUALS.abilityFx.lantern;
    need(L && ['color', 'core', 'deep', 'ink'].every(n => hx(L[n])) && [L.burst, L.hitBurst].every(B => B && pos(B, ['count', 'speed']) && hx(B.color)) && pos(L, ['outline', 'bob', 'bobTime', 'rise', 'fade', 'ball', 'burstSize', 'warm', 'puff', 'sway', 'turn', 'motes']),
      'CONFIG.VISUALS.abilityFx.lantern: color, core, deep and ink as hex, burst and hitBurst with count, speed and a hex colour; outline, bob, bobTime, rise, fade, ball, burstSize, warm, puff, sway, turn and motes above 0.');
  }
  // An ability's text is only its trigger and effect, in the fewest plain words (Aleix, 2026-11-14; a {key} is one word).
  const ABILITY_TEXT_MAX = { words: 9, chars: 56 };
  const COMMON_POWERS = ['spark', 'lick', 'molten', 'lateCut', 'afterimage', 'whirl', 'thorns', 'burnHits', 'shards', 'reflect'];
  for (const b of ABILITIES) {
    const where = `Ability ${b.id}`, R = RAR[b.rarity], kinds = ['mods', 'perk', 'power'].filter(k => b[k]);
    need(typeof b.id === 'string' && /^[a-z0-9-]+$/.test(b.id) && typeof b.name === 'string' && b.name.trim() && typeof b.text === 'string' && b.text.trim(),
      `${where}: an id (a-z, 0-9, -), a name and a text.`);
    if (typeof b.text === 'string') { const words = b.text.replace(/\{\w+\}/g, 'n').trim().split(/\s+/).length;
      need(words <= ABILITY_TEXT_MAX.words && b.text.length <= ABILITY_TEXT_MAX.chars,
        `${where}: its text is ${words} words and ${b.text.length} characters; at most ${ABILITY_TEXT_MAX.words} and ${ABILITY_TEXT_MAX.chars}: only the trigger and the effect.`); }
    need(!!R, `${where}: unknown rarity ${b.rarity} (CONFIG.abilities.rarity).`);
    need(b.plain === undefined || b.plain === true && b.mods && b.rarity === 'common', `${where}: plain is only true, and only on a common with mods.`);
    need(kinds.length === 1 && (b.mods ? b.rarity === 'common' : b.perk ? b.rarity !== 'legendary' : true),
      `${where}: one of mods (a common), perk (a common or a rare) or power (any rarity).`);
    need(b.party === undefined || b.party === true, `${where}: party is only true.`);
    need(b.needs === undefined || ABILITY_KEYS.includes(b.needs), `${where}: needs names a key (${ABILITY_KEYS.join(', ')}).`);
    // Legendaries II (pass 154): each new power's numbers in their range.
    const pv = b.power && Array.isArray(b.levels) ? b.levels : [];
    if (b.power && b.power.then === 'sunLines') need(pv.every(v => v.strikes === 2 * CONFIG.finisher.steps && v.damage > 0),
      `${where}: sunLines' strikes are two a cut, 2 × CONFIG.finisher.steps (${2 * CONFIG.finisher.steps}), with a damage.`);
    if (b.power && b.power.then === 'shadeClone') need(pv.every(v => Number.isInteger(v.most) && v.most >= 1 && v.most <= CONFIG.abilities.summons.shadeClone.flanks.length),
      `${where}: shadeClone's most is a whole number from 1 to its flanks (${CONFIG.abilities.summons.shadeClone.flanks.length}).`);
    if (b.power && b.power.then === 'refillKeys') need(b.needs === 'ultimate', `${where}: refillKeys needs the ultimate key held (needs: 'ultimate').`);
    // Ultimates I (pass 156): key 4's, each a whole number of blows.
    const ult = b.power && ['dragon', 'quake', 'beam', 'iceLotus', 'tempest', 'greatWave', 'skyBlade', 'phoenix', 'blackStar', 'inkWorld', 'worldCut', 'colossus', 'legion'].includes(b.power.then);
    if (ult) need(b.key === 'ultimate' && b.power.when === 'press', `${where}: ${b.power.then} is an Ultimate's (key 'ultimate', when 'press').`);
    if (ult && b.power.then === 'dragon') need(pv.every(v => Number.isInteger(v.strikes) && v.strikes >= 1 && v.lead > 0 && v.every > 0),
      `${where}: dragon's strikes a whole number from 1, lead and every above 0.`);
    if (ult && ['beam', 'iceLotus', 'tempest'].includes(b.power.then)) need(pv.every(v => v.every > 0 && Math.abs(v.time / v.every - Math.round(v.time / v.every)) < 1e-6 && v.time / v.every >= 1),
      `${where}: ${b.power.then}'s time is a whole number of \`every\` (one blow each).`);
    // Ultimates II (pass 157).
    if (ult && b.power.then === 'phoenix') need(pv.every(v => Number.isInteger(v.strikes) && v.strikes >= 1 && v.strikes <= 6 && v.damage > 0),
      `${where}: phoenix's strikes a whole number from 1 to 6, with a damage.`);
    if (ult && b.power.then === 'greatWave') need(pv.every(v => v.width > 0 && v.reach > 0 && v.damage > 0), `${where}: greatWave's width, reach and damage above 0.`);
    if (ult && b.power.then === 'skyBlade') need(pv.every(v => v.damage > 0), `${where}: skyBlade's damage above 0.`);
    // Ultimates III (pass 158).
    if (ult && b.power.then === 'inkWorld') need(pv.every(v => v.time > 0 && v.share > 0 && v.share <= 1), `${where}: inkWorld's time above 0, its share above 0 and at most 1.`);
    if (ult && b.power.then === 'worldCut') need(pv.every(v => v.damage > 0), `${where}: worldCut's damage above 0.`);
    if (ult && b.power.then === 'colossus') need(pv.every(v => v.damage > 0 && v.reach > 0), `${where}: colossus's damage and reach above 0.`);
    if (ult && b.power.then === 'legion') need(pv.every(v => v.damage > 0 && v.every > 0 && Math.abs(v.time / v.every - Math.round(v.time / v.every)) < 1e-6 && v.time / v.every >= 1),
      `${where}: legion's damage above 0, its time a whole number of \`every\`.`);
    if (ult && b.power.then === 'blackStar') need(pv.every(v => v.time > 0 && v.radius > 0 && v.damage > 0), `${where}: blackStar's time, radius and damage above 0.`);
    // A common's perk (pass 114) is one js/common-fx.js draws: its cue in COMMON_PERKS (never a camera kick).
    if (b.perk && b.rarity === 'common') need(COMMON_PERKS.has(b.perk.when + '/' + b.perk.then) || b.perk.when + '/' + b.perk.then === 'revive/reviveHeal',
      `${where}: a common's perk is one of COMMON_PERKS (js/abilities.js) or revive/reviveHeal.`);
    // A common's power (pass 112) is one of the small strikes js/common-fx.js draws, never pressed.
    if (b.power && b.rarity === 'common') need(b.power.when !== 'press' && COMMON_POWERS.includes(b.power.then),
      `${where}: a common's power is not pressed and is one js/common-fx.js draws (${COMMON_POWERS.join(', ')}).`);
    // The number keys (pass 87): every pressed ability names exactly one key, always the same; nothing else names one.
    const pressed = (b.perk || b.power || {}).when === 'press';
    need(pressed === (b.key !== undefined) && (b.key === undefined || ABILITY_KEYS.includes(b.key)),
      `${where}: a pressed ability (when: 'press') names exactly one key (${ABILITY_KEYS.join(', ')}), and only a pressed one names a key.`);
    if (b.key !== undefined && !(R && R.given)) need((b.key === 'ultimate') === (b.rarity === 'legendary'),
      `${where}: key ultimate is a legendary's, strike, guard and summon a rare's (a given rarity's may be any key).`);
    // A given ability (pass 159, Story's four) is handed out by a level in its chapter: one per key, never a starter.
    if (R && R.given) {
      const lvl = b.story && ALL_LEVELS.find(L => L.giveAbility && L.giveAbility.id === b.id);
      need(b.story && Number.isInteger(b.story.chapter) && b.story.chapter >= 1 && typeof b.story.place === 'string' && b.story.place.trim() && b.key !== undefined,
        `${where}: a ${b.rarity} ability names a key and a story { chapter (a whole number from 1), place }.`);
      need(ABILITIES.filter(o => o.rarity === b.rarity && o.key === b.key).length === 1, `${where}: no other ${b.rarity} ability for key ${b.key}.`);
      need(!!lvl && STORY.chapters.findIndex(c => c.level === lvl.id) + 1 === b.story.chapter, `${where}: the level of chapter ${b.story && b.story.chapter} gives it (giveAbility).`);
      need(ALL_LEVELS.filter(L => L.giveAbility && L.giveAbility.id === b.id).length === 1, `${where}: one level gives it, no more.`);
    } else need(b.story === undefined, `${where}: only a given rarity's ability has a story.`);
    // Story's four (pass 159): each new power's numbers in their range.
    if (b.power && b.power.then === 'scarfBlade') need(pv.every(v => v.damage > 0 && v.reach > 0), `${where}: scarfBlade's damage and reach above 0.`);
    if (b.power && b.power.then === 'oathShield') need(pv.every(v => v.time > 0 && v.damage > 0), `${where}: oathShield's time and damage above 0.`);
    if (b.power && b.power.then === 'seven') need(pv.every(v => v.every > 0 && v.damage > 0 && v.draw >= 0 && v.draw <= v.time
      && Math.abs(v.time - v.every * (CONFIG.abilities.summons.seven.count + 2)) < 1e-6),
      `${where}: seven's every and damage above 0, draw from 0 to time, time one \`every\` for each founder, the gather and the blow together (count + 2).`);
    if (b.power && b.power.then === 'bellToll') need(pv.every(v => v.time > 0 && v.damage > 0), `${where}: bellToll's time and damage above 0.`);
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
  const BC = BL.commons;
  need(BC && ['pastGap', 'lateCut', 'imageDelay', 'imageReach', 'whirlRadius', 'thornReach', 'shardDelay'].every(k => num(BC[k]) && BC[k] > 0),
    'CONFIG.abilities.commons: pastGap, lateCut, imageDelay, imageReach, whirlRadius, thornReach and shardDelay, each above 0.');
  const FB = BL.flashBehind;
  need(FB && ['range', 'gap', 'time'].every(k => num(FB[k]) && FB[k] > 0), 'CONFIG.abilities.flashBehind: range, gap and time, each above 0.');
  // Legendaries I (pass 151): Storm King's crown, Gale Crescent's cage, the rest after a hold.
  need(BL.crown && ['gap', 'reach'].every(k => num(BL.crown[k]) && BL.crown[k] > 0) && BL.cage && ['lead', 'reach'].every(k => num(BL.cage[k]) && BL.cage[k] > 0)
    && num(BL.holdRest) && BL.holdRest >= 0, 'CONFIG.abilities: crown { gap, reach } and cage { lead, reach } above 0, holdRest 0 or more.');
  // Story's four (pass 159): the scarf's beat and band, the bell's first toll, the Seven's blow together and how many rise.
  need(BL.story && ['scarf', 'scarfWidth', 'bell', 'together'].every(k => num(BL.story[k]) && BL.story[k] > 0) && Object.keys(BL.story).length === 4
    && Number.isInteger(BL.summons.seven.count) && BL.summons.seven.count >= 1,
    'CONFIG.abilities.story: scarf, scarfWidth, bell and together above 0; summons.seven.count a whole number from 1.');
  const UL = BL.ult;
  need(UL && ['quake', 'beam', 'lotus', 'tempest', 'follow'].every(k => num(UL[k]) && UL[k] > 0) && num(UL.pinTurn) && UL.pinTurn >= 0 && UL.pinTurn <= 1,
    'CONFIG.abilities.ult: quake, beam, lotus, tempest and follow above 0; pinTurn from 0 to 1.');
  need(['wave', 'sky', 'skyRadius', 'star', 'pull', 'diveReach'].every(k => num(UL[k]) && UL[k] > 0),
    'CONFIG.abilities.ult: wave, sky, skyRadius, star, pull and diveReach above 0 (Ultimates II).');
  need(['inkDelay', 'cut', 'cutLength', 'cutWidth', 'giant', 'giantArc', 'legion', 'legionBack', 'legionLength', 'legionWidth'].every(k => num(UL[k]) && UL[k] > 0) && UL.giantArc <= 360 && UL.cut > 0.4 && UL.giant > 0.85,   // the drawing's glint and wind-up (js/legend-fx-5.js) come first
    'CONFIG.abilities.ult: inkDelay, cut, cutLength, cutWidth, giant, giantArc (at most 360), legion, legionBack, legionLength and legionWidth above 0, cut over 0.4 s and giant over 0.85 s (Ultimates III).');
  const PX = BL.phoenix;
  need(PX && ['burst', 'up', 'rise', 'dive', 'gap', 'past', 'land'].every(k => num(PX[k]) && PX[k] > 0) && num(PX.grace) && PX.grace >= 0,
    'CONFIG.abilities.phoenix: burst, up, rise, dive, gap, past and land above 0; grace 0 or more.');
  const CS = BL.crescent, CY = BL.cyclone, MK = BL.mark;
  need(CS && num(CS.reach) && CS.reach > 0 && num(CS.width) && CS.width > 0, 'CONFIG.abilities.crescent: reach and width, each above 0.');
  need(CY && num(CY.gap) && CY.gap > 0, 'CONFIG.abilities.cyclone: gap above 0.');
  need(MK && num(MK.keep) && MK.keep > 0, 'CONFIG.abilities.mark: keep above 0.');
  const SP = BL.spikes, FI = BL.fist, RF = BL.risingFire, CL = BL.clap;
  need(SP && num(SP.width) && SP.width > 0 && num(SP.speed) && SP.speed > 0, 'CONFIG.abilities.spikes: width and speed, each above 0.');
  need(FI && num(FI.delay) && FI.delay >= 0 && FI.delay <= 0.6 && num(FI.radius) && FI.radius > 0, 'CONFIG.abilities.fist: delay from 0 to 0.6, radius above 0.');
  need(RF && num(RF.delay) && RF.delay >= 0 && RF.delay <= 0.5 && num(RF.radius) && RF.radius > 0, 'CONFIG.abilities.risingFire: delay from 0 to 0.5, radius above 0.');
  need(CL && num(CL.angle) && CL.angle > 0 && CL.angle <= 180, 'CONFIG.abilities.clap: angle above 0, up to 180.');
  const FL = BL.flurry, DR = BL.drill, STI = BL.stitch, BO = BL.boomerang, CN = BL.clones, IA = BL.iai, lead = v => num(v) && v >= 0 && v <= 0.5;
  need(FL && num(FL.reach) && FL.reach > 0 && num(FL.time) && FL.time > 0, 'CONFIG.abilities.flurry: reach and time, each above 0.');
  need(DR && lead(DR.lead), 'CONFIG.abilities.drill: lead from 0 to 0.5.');
  need(STI && lead(STI.lead) && num(STI.every) && STI.every > 0, 'CONFIG.abilities.stitch: lead from 0 to 0.5, every above 0.');
  need(BO && num(BO.time) && BO.time > 0 && num(BO.past) && BO.past >= 0 && num(BO.width) && BO.width > 0, 'CONFIG.abilities.boomerang: time above 0, past 0 or more, width above 0.');
  need(CN && lead(CN.lead), 'CONFIG.abilities.clones: lead from 0 to 0.5.');
  need(IA && num(IA.stance) && IA.stance > 0 && num(IA.beat) && IA.beat >= 0 && IA.beat <= 0.6 && num(IA.width) && IA.width > 0, 'CONFIG.abilities.iai: stance above 0, beat from 0 to 0.6, width above 0.');
  need(num(BL.rootSlip) && BL.rootSlip > 0, 'CONFIG.abilities.rootSlip: above 0.');
  // Guard I (batch 8): Unbroken's floor, a pool's share for another, how many pools at once, a vanish's slack on the server.
  need(BL.undying && num(BL.undying.floor) && BL.undying.floor > 0 && BL.shared && num(BL.shared.pool) && BL.shared.pool >= 0 && BL.shared.pool <= 1
    && Number.isInteger(BL.pools) && BL.pools >= 1 && num(BL.guardSlack) && BL.guardSlack >= 0,
    'CONFIG.abilities: undying.floor above 0, shared.pool from 0 to 1, pools a whole number from 1, guardSlack 0 or more.');
  // Guard II (batch 9): the bounce's multiplier, the husk's step and body, how many domes, the rewind's trail, the seal's recovery.
  const HK = BL.husk, RW = BL.rewind;
  need(BL.reflect && num(BL.reflect.mul) && BL.reflect.mul > 0 && HK && ['step', 'body', 'height', 'radius'].every(k => num(HK[k]) && HK[k] > 0)
    && Number.isInteger(BL.domes) && BL.domes >= 1 && RW && num(RW.every) && RW.every > 0 && Number.isInteger(RW.slots) && RW.slots >= 2
    && num(RW.glide) && RW.glide > 0 && BL.seal && num(BL.seal.recover) && BL.seal.recover >= 0,
    'CONFIG.abilities: reflect.mul, husk step, body, height and radius above 0, domes a whole number from 1, rewind.every and glide above 0 with slots a whole number from 2, seal.recover 0 or more.');
  // Hourglass's trail must reach back as far as its longest rewind.
  if (RW) for (const b of ABILITIES) if (b.perk && b.perk.then === 'rewind') need(b.levels.every(v => v.time <= (RW.slots - 1) * RW.every + 1e-9),
    `Ability ${b.id}: a rewind of at most ${(RW.slots - 1) * RW.every} s (CONFIG.abilities.rewind slots and every).`);
  const GF = CONFIG.VISUALS.abilityFx.guard;   // js/guard-fx.js's sizes and times
  if (visual) need(GF && ['mend', 'mendRise', 'mendTime', 'shell', 'star', 'roots', 'flame', 'flare', 'flareRing', 'plate'].every(k => num(GF[k]) && GF[k] > 0) && num(GF.faint) && GF.faint >= 0 && GF.faint < 1,
    'VIS.abilityFx.guard: mend, mendRise, mendTime, shell, star, roots, flame, flare, flareRing and plate above 0; faint from 0 to under 1.');
  const G2 = CONFIG.VISUALS.abilityFx.guard2;   // js/guard-fx-2.js's sizes
  if (visual) need(G2 && ['pane', 'paneOff', 'star', 'huskRing', 'scorch', 'dial', 'answer', 'waist', 'rewindRing', 'seal'].every(k => num(G2[k]) && G2[k] > 0) && num(G2.sealUp) && G2.sealUp > 0 && G2.sealUp <= 1.5,
    'VIS.abilityFx.guard2: pane, paneOff, star, huskRing, scorch, dial, answer, waist, rewindRing and seal above 0; sealUp above 0, at most 1.5.');
  const EC = BL.echo, OC = BL.overcharge;
  need(EC && num(EC.keep) && EC.keep > 0 && num(EC.delay) && EC.delay >= 0 && EC.delay <= 0.5, 'CONFIG.abilities.echo: keep above 0, delay from 0 to 0.5.');
  need(OC && num(OC.most) && OC.most > 0 && OC.most <= 2, 'CONFIG.abilities.overcharge: most above 0, at most 2.');
  const RS = CONFIG.VISUALS.abilityFx.rareStrike;   // js/rare-strike-fx.js's sizes and times
  const SFX = CONFIG.VISUALS.abilityFx.strike;   // js/strike-fx.js's sizes
  const SF2 = CONFIG.VISUALS.abilityFx.strike2;   // js/strike-fx-2.js's
  if (visual) need(SF2 && ['fan', 'drill', 'spike', 'disc', 'waist', 'clone'].every(k => num(SF2[k]) && SF2[k] > 0) && num(SF2.drillTurn) && num(SF2.drillPitch) && Math.abs(SF2.drillPitch) < 1.5,
    'VIS.abilityFx.strike2: fan, drill, spike, disc, waist and clone, each above 0; drillTurn and drillPitch (rad, the pitch under 1.5).');
  if (visual) need(SFX && ['petal', 'petalGap', 'burst', 'sweep', 'crescent', 'waist', 'cutStar', 'spike', 'fist', 'fang', 'clapStar'].every(k => num(SFX[k]) && SFX[k] > 0),
    'VIS.abilityFx.strike: petal, petalGap, burst, sweep, crescent, waist, cutStar, spike, fist, fang and clapStar, each above 0.');
  if (visual) need(RS && ['tide', 'crest', 'moon', 'moonLift', 'cutWidth', 'waist', 'dustLife', 'burst', 'petal', 'whirl', 'shell', 'mark'].every(k => num(RS[k]) && RS[k] > 0),
    'VIS.abilityFx.rareStrike: tide, crest, moon, moonLift, cutWidth, waist, dustLife, burst, petal, whirl, shell and mark, each above 0.');
  for (const k of Object.keys(ABILITY_UNITS)) need(['s', 'm', 'n'].includes(ABILITY_UNITS[k]), `ABILITY_UNITS ${k}: s, m or n.`);
  const BP = BL.press, PG = BP && BP.gain;
  need(PG && ['hit', 'skill', 'deflect', 'dodge', 'finisher'].every(k => num(PG[k]) && PG[k] >= 0) && PG.hit > 0 && num(BP.range) && BP.range > 0
    && num(BP.slack) && BP.slack >= 0 && BP.slack < 1 && num(BP.reachSlack) && BP.reachSlack >= 0 && num(BP.botReach) && BP.botReach > 0 && num(BP.botHeal) && BP.botHeal > 0 && BP.botHeal <= 1,
    'CONFIG.abilities.press: gain { hit above 0; skill, deflect, dodge, finisher 0 or more }, range above 0, slack from 0 to under 1, reachSlack 0 or more, botReach above 0, botHeal above 0 up to 1.');
  for (const key of ABILITY_KEYS) need(ABILITIES.some(b => b.key === key), `Abilities: key ${key} needs at least one ability to fill it.`);
  if (visual) ABILITY_KEYS.forEach((k, i) => need(Object.hasOwn(DEFAULT_ACTIONS, `ability${i + 1}`), `Key ${k}: no ability${i + 1} binding (js/input.js).`));
  // Levels and crates (js/data/crates.js): xp, levels, odds, the roll and the starter set.
  const CR = CRATES, whole0 = x => Number.isInteger(x) && x >= 0;
  need(CR && ['fight', 'crowned', 'minute', 'least'].every(k => whole0(CR.xp?.[k])) && ['first', 'step', 'most'].every(k => whole0(CR.level?.[k])) && CR.level.first > 0 && CR.level.most >= CR.level.first,
    'CRATES: xp fight, crowned, minute and least, and level first, step and most, whole numbers of 0 or more (first above 0, most at least first).');
  need(DRAWN.every(r => num(CR.odds?.[r]) && CR.odds[r] >= 0) && Object.values(CR.odds).some(w => w > 0), 'CRATES.odds: a weight of 0 or more for each rarity, one above 0.');
  need(Number.isInteger(CR.roll?.tiles) && Number.isInteger(CR.roll.land) && CR.roll.land > 0 && CR.roll.land < CR.roll.tiles - 2 && num(CR.roll.time) && CR.roll.time > 0 && num(CR.roll.still) && CR.roll.still > 0,
    'CRATES.roll: whole tiles, the reward at a whole land with tiles after it, a time and a still above 0.');
  // The starter set (PLAN.md item 7): known abilities, each once, some of each rarity, every number key filled (a fresh
  // player can be offered something for each) and a pick before fight 1.
  const STARTER = CR.starter;
  need(Array.isArray(STARTER) && STARTER.every(id => Object.hasOwn(ABILITY_BY_ID, id)) && new Set(STARTER).size === STARTER.length, 'CRATES.starter: ability ids, each once.');
  need(Number.isInteger(CR.save) && CR.save >= 1, 'CRATES.save: a whole version of 1 or more.');
  need(Number.isInteger(CR.pity?.first) && Number.isInteger(CR.pity?.apart) && CR.pity.first >= 1 && CR.pity.apart >= CR.pity.first,
    'CRATES.pity: whole numbers first (1 or more) and apart (at least first).');
  if (Array.isArray(STARTER)) {
    need(DRAWN.every(r => CRATE_MIN[r] >= 1) && cratePool(STARTER)?.length === STARTER.length, 'CRATES.starter: at least one of each rarity.');
    for (const key of ABILITY_KEYS) need(STARTER.some(id => ABILITY_BY_ID[id]?.key === key), `CRATES.starter: an ability for key ${key}.`);
    need(STARTER.filter(id => BL.first.includes(ABILITY_BY_ID[id]?.rarity)).length >= BL.offer, 'CRATES.starter: a whole offer for the first pick (CONFIG.abilities.first).');
    need(ABILITIES.length > STARTER.length, 'CRATES.starter: a crate needs abilities outside the starter set.');
  }
  for (const r of DRAWN) need(ABILITIES.filter(b => b.rarity === r).length >= BL.offer + CONFIG.swift.extra, `Abilities: at least ${BL.offer + CONFIG.swift.extra} of rarity ${r}, to fill an offer.`);
  need(num(botConfig.parryChanceScale) && botConfig.parryChanceScale >= 0 && botConfig.parryChanceScale <= 1, 'Bot parryChanceScale must be 0..1.');
  for (const [group, fields] of Object.entries({ tempo: ['comboBase', 'comboAggression', 'punishCombo', 'finishBelow'],
    defence: ['walkMargin', 'walkLead', 'margin', 'clear'], string: ['outrun'], yieldTo: ['range', 'late'], jumpDodge: ['clearance', 'timingMargin', 'followMargin', 'maxSpeed'] }))
    for (const key of fields) need(num(botConfig[group]?.[key]) && botConfig[group][key] >= 0, `Bot ${group}.${key} must be non-negative.`);
  // Temperaments (v7.52.0): ordered positive pairs and positive gaps.
  const pair = r => Array.isArray(r) && r.length === 2 && r.every(num) && r[0] >= 0 && r[1] >= r[0];
  need(pair(botConfig.moodJitter) && botConfig.moodJitter[0] > 0 && pair(botConfig.slip?.early) && pair(botConfig.slip?.late) && num(botConfig.slip.lateShare) && botConfig.slip.lateShare >= 0 && botConfig.slip.lateShare <= 1 &&
    num(botConfig.behindMargin) && botConfig.behindMargin >= 0 && num(botConfig.fightGap) && botConfig.fightGap > 0,
    'Bot moodJitter, slip.early and slip.late need ordered pairs and slip.lateShare a share (0..1); behindMargin and fightGap must be non-negative and positive.');
  for (const key of ['comboBase', 'comboAggression', 'punishCombo', 'finishBelow'])
    need(botConfig.tempo[key] <= 1, `Bot tempo.${key} must be 0..1.`);
  for (const key of ['punishWindow', 'punishRecovery', 'punishCommit']) need(num(botConfig.tempo[key]) && botConfig.tempo[key] > 0, `Bot tempo.${key} must be positive.`);
  { const D = botConfig.dashIn, T = botConfig.tempo;   // pass 88: finishers and dash attacks
    need(['finisher', 'finisherOpening'].every(k => num(T[k]) && T[k] >= 0) && D && pair(D.gap) && ['rate', 'rest', 'heavy', 'counterReach'].every(k => num(D[k]) && D[k] >= 0),
      'Bot tempo.finisher and finisherOpening must be 0 or more; dashIn needs gap [near, far] and rate, rest, heavy, counterReach of 0 or more.'); }
  for (const key of ['windowSlack', 'minWindow'])
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
  const ST = CONFIG.storm;
  need(ST && num(ST.lock) && ST.lock > 0 && ST.lock < 1 && num(ST.minTell) && ST.minTell > 0, 'CONFIG.storm needs lock (0 to 1) and minTell (s).');
  const PR = CONFIG.prisms;
  need(PR && Number.isInteger(PR.max) && PR.max >= 1 && Number.isInteger(PR.callAt) && PR.callAt >= 1 && PR.callAt <= PR.max
    && ['width', 'height', 'beamLen', 'minTell', 'flyHeight', 'life'].every(k => num(PR[k]) && PR[k] > 0) && num(PR.lock) && PR.lock > 0 && PR.lock < 1,
    'CONFIG.prisms needs max/callAt (whole, 1..max), lock (0 to 1), and positive width, height, beamLen, minTell, flyHeight and life.');
  need(CONFIG.burrow && num(CONFIG.burrow.near) && CONFIG.burrow.near > 0 && num(CONFIG.burrow.minTell) && CONFIG.burrow.minTell > 0, 'CONFIG.burrow needs near (m) and minTell (s).');
  const AR = CONFIG.area;
  need(AR && ['reach', 'tell', 'offset', 'locked'].every(k => num(AR[k]) && AR[k] > 0) && num(AR.held) && AR.held > 0 && AR.held < 1 && num(AR.dash) && AR.dash > 0 && AR.dash <= 1,
    'CONFIG.area needs reach and offset (m), tell and locked (s), and held and dash (fractions, 0 to 1).');
  const BM = CONFIG.bossMove, pos = v => num(v) && v > 0;
  need(BM && pos(BM.pace) && pos(BM.floor) && BM.floor <= 1 && num(BM.max) && BM.max >= 1 && BM.close && pos(BM.close.beyond) && num(BM.close.mul) && BM.close.mul >= 1 && num(BM.close.approach) && BM.close.approach >= 1
    && BM.circle && pos(BM.circle.speed) && BM.circle.speed <= 1 && Array.isArray(BM.circle.flip) && BM.circle.flip.length === 2 && pos(BM.circle.flip[0]) && BM.circle.flip[1] >= BM.circle.flip[0]
    && BM.respace && pos(BM.respace.time) && num(BM.respace.mul) && BM.respace.mul >= 1 && num(BM.respace.turn) && BM.respace.turn >= 1
    && BM.dodged && num(BM.dodged.recovery) && BM.dodged.recovery >= 1,
    'CONFIG.bossMove needs pace (above 0), floor (0 to 1) and max (1 or more); close {beyond (m), mul, approach}; circle {speed (0 to 1), flip [s, s]}; respace {time (s), mul, turn}; dodged {recovery}: multipliers 1 or more.');
  need(CONFIG.undeflectable && Number.isInteger(CONFIG.undeflectable.bigMoments) && CONFIG.undeflectable.bigMoments >= 0, 'CONFIG.undeflectable needs bigMoments (a whole number, 0 or more).');
  const AM = CONFIG.VISUALS.areaMark;
  if (visual) need(AM && Number.isInteger(AM.color) && num(AM.opacity) && AM.opacity > 0 && AM.opacity <= 1 && num(AM.fade) && AM.fade > 0 && Number.isInteger(AM.pool) && AM.pool >= 2,
    'VISUALS.areaMark needs a color, an opacity (0 to 1), a fade (s) and a pool of 2 or more.');
  const HT = CONFIG.VISUALS.heavyTell;   // pass 96: the amber a heavy attack's wind-up ramps to
  if (visual) need(HT && Number.isInteger(HT.color) && num(HT.tint) && HT.tint > 0 && HT.tint <= 1 && num(HT.edge) && HT.edge >= 0, 'VISUALS.heavyTell needs a color, a tint (0 to 1) and an edge (0 or more).');
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
    // The counter's signature moves (pass 95): a flash step through or past the foe, and a cut that opens a beat later.
    if ('flashStep' in a) { const F = a.flashStep; need(F && [F.past, F.min, F.max, F.range, F.cone, F.brake, F.exit].every(v => num(v) && v >= 0) && F.min > 0 && F.max >= F.min && F.max <= 9 && a.hits.length === 1 && num(a.hits[0].active) && a.hits[0].active > 0
      && F.max / a.hits[0].active * CONFIG.step < PLAYER_DEF.radius + CONFIG.height.railThickness,
      `${tag}: flashStep needs past, min <= max (at most 9 m), range, cone, brake (m/s^2) and exit (m/s), on a one-hit attack whose active phase covers max in steps shorter than the body's radius and a rail (no tunnelling through walls).`); }
    if ('cut' in a) need(a.cut && ['line', 'arc'].includes(a.cut.kind) && num(a.cut.open) && a.cut.open >= 0 && a.cut.open < 1, `${tag}: cut needs kind ('line' or 'arc') and open (0 to 1 s).`);
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
    if ('impact' in a) need(a.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(a.impact[k]) && a.impact[k] >= 0) && (a.impact.at === undefined || (num(a.impact.at) && a.impact.at >= 0 && a.impact.at < 1)),
      `${tag}: impact needs ring, crack, dust and shake (numbers, 0 or more), and at (0 to below 1) if given.`);
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
      // A `seize` (pass 72, the Giant Skeleton; Player.seize): a hand that closes on you and carries you to `at` ([side, up,
      // fwd] m from him) over `lift` s, burning `dps` a second for at most `time` s; each press in the grip wins back
      // `escape` s; thrown `throw` m/s when he lets go. It is the attack's last hit, roll-only, and he still holds the
      // attack (its follow and recovery) for the whole grip, so his letting go is never a stale frame.
      if ('seize' in h) {
        const S = h.seize;
        need(S && Array.isArray(S.at) && S.at.length === 3 && S.at.every(num) && S.at[1] >= 0 && S.at[1] <= 4 && Math.hypot(S.at[0], S.at[2]) <= 5
          && num(S.lift) && S.lift >= 0 && num(S.time) && S.time > S.lift && S.time <= 4 && num(S.dps) && S.dps >= 0 && S.dps <= 30
          && num(S.escape) && S.escape > 0 && S.escape <= 1 && num(S.throw) && S.throw >= 0 && S.throw <= 20
          && i === a.hits.length - 1 && !a.followUps && (!a.track || a.tracking) && !a.projectile && !a.shove && !h.pull && !h.echo && !h.bolt && !h.erupt && !(h.box || a.box).ring
          && S.time <= (h.follow || 0) + a.recovery + 1e-6,
          `${tag}: hit ${i + 1}'s seize needs at ([side, up 0-4, fwd] within 5 m), lift (s), time (s, above lift, at most 4 and within the hit's follow and the recovery), dps (0-30), escape (0-1 s) and throw (0-20 m/s); only on the attack's last hit, with no followUps, a tracking turn (not track) if it turns (he would spin chasing the body in his hand), and not with a projectile, shove, pull, echo, bolt, erupt or ring.`);
      }
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
      // Floating astral prisms (`prism` / `prismFire`, js/enemy.js notePrisms & notePrismAim).
      if ('prism' in h) {
        const Pm = h.prism;
        need(Pm && Array.isArray(Pm.at) && Pm.at.length > 0 && Pm.at.every(q => Array.isArray(q) && q.length === 2 && q.every(num))
          && (!('height' in Pm) || (num(Pm.height) && Pm.height > 0 && Pm.height <= 4)) && !h.prismFire && !a.projectile,
          `${tag}: hit ${i + 1}'s prism needs at (non-empty list of [fwd, side]), optional height (0 to 4 m); not with prismFire or a projectile.`);
      }
      if ('prismFire' in h) {
        const Pf = h.prismFire, b = h.box || a.box || {};
        need((Pf === true || (Pf && typeof Pf === 'object'
            && (!('lock' in Pf) || (num(Pf.lock) && Pf.lock > 0 && Pf.lock < 1))
            && (!('len' in Pf) || (num(Pf.len) && Pf.len > 0))
            && (!('keep' in Pf) || typeof Pf.keep === 'boolean')))
          && !b.ground && !b.ring && !h.echo && !h.seam && !h.erupt && !h.bolt && !h.prism && !a.projectile,
          `${tag}: hit ${i + 1}'s prismFire must be true or { lock? (0..1), len? (>0), keep? }; plain box, not with echo, seam, erupt, bolt, prism or projectile.`);
        need(h.startup >= CONFIG.prisms.minTell - 1e-6, `${tag}: hit ${i + 1}'s prismFire needs a wind-up of at least ${CONFIG.prisms.minTell} s (its locked sightline tell).`);
      }
      // Every area attack fair on its own (pass 93, CONFIG.area; areaHit in js/enemy.js, drawn by js/area-marks.js).
      if (h && areaHit(a, i)) {
        const A = CONFIG.area, b = h.box || a.box, prev = a.hits[i - 1], at = `${tag}: hit ${i + 1} (a ground area hit, CONFIG.area)`;
        // Its mark shows from the start of its wind-up, or from the strike before it; a burrow's once it stops (CONFIG.burrow).
        const shown = h.startup + (prev ? prev.active + (prev.follow || 0) : 0);
        need(h.burrow || shown >= A.tell - 1e-6, `${at} shows its reach ${shown.toFixed(2)} s before it strikes; it needs ${A.tell} s.`);
        need(!h.step && !h.blink && !h.abort, `${at} must not move under its mark (no step, blink or abort).`);
        need(!b.round || (b.w === b.d && !b.ring), `${at}: a round burst is as deep as it is wide (w = d), and not a ring.`);
        if (!b.ring && !(b.round && Math.abs(b.fwd) <= A.offset)) {   // turning would carry it: it locks first
          const lock = a.tracking ? h.startup * (1 - a.tracking.commit) : 0;
          need(!a.track && lock >= A.locked - 1e-6, `${at} turns with the body until ${lock.toFixed(2)} s before it strikes; it must stop at least ${A.locked} s before (tracking.commit).`);
        }
        // No spot under it longer than a dash's i-frames allow, so a dash on it always gets through (a body PLAYER_DEF.radius across).
        const iframes = CONFIG.player.rollIFrames * A.dash, under = areaDwell(b, h.active, PLAYER_DEF.radius);
        need(under <= iframes + 1e-6, `${at} holds a spot for ${under.toFixed(2)} s; a dash gets through ${iframes.toFixed(2)} s at most.`);
      }
    });
    // Pass 96 (PLAN.md "No hidden meters"): the only blows that stagger the player; the wind-up shows it (Enemy.drawWindup).
    if ('heavy' in a) need(a.heavy === true, `${tag}: heavy must be true (or left out).`);
    // Per hit (v4.3): its own `box` (an expanding `ring` round the owner when given), its own `impact`, and `leap`.
    for (const h of Array.isArray(a.hits) ? a.hits : []) {
      if ('box' in h) need(h.box && ['w', 'h', 'd', 'fwd', 'y'].every(k => num(h.box[k])), `${tag}: a hit's box needs w, h, d, fwd and y.`);
      if (h.box && 'ring' in h.box) need(h.box.ring && ['from', 'to', 'width', 'time'].every(k => num(h.box.ring[k]) && h.box.ring[k] >= 0) && h.box.ring.time > 0,
        `${tag}: a hit's ring needs from, to, width and time (numbers; time above 0).`);
      if ('impact' in h) need(h.impact && ['ring', 'crack', 'dust', 'shake'].every(k => num(h.impact[k]) && h.impact[k] >= 0) && (h.impact.at === undefined || (num(h.impact.at) && h.impact.at >= 0 && h.impact.at < 1)), `${tag}: a hit's impact needs ring, crack, dust and shake, and at (0 to below 1, the share of its active when the blade lands) if given.`);
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
      if ('tell' in h) need(typeof h.tell === 'string' && h.tell.length > 0, `${tag}: a hit's tell names where its wind-up glows: 'shield' (the model's shieldTell) or one of the model's tells.`);   // v5.9: overrides the attack's
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
      for (const h of a.hits || []) if (h.abort) need(aidList.has(h.abort.into), `Enemy "${d.id}" attack "${a.id}": abort into "${h.abort.into}" is not one of its attacks.`);
      // Pass 77 (the Antlered Hunger): `learns` names the learned form it comes as once it has learned this attack: another of
      // its attacks, marked `learned: true`, that learns nothing itself and is never chosen by a phase (only learned into).
      if ('learns' in a) { const L = d.attacks.find(x => x && x.id === a.learns);
        need(!!L && L !== a && L.learned === true && !('learns' in L) && !Object.values(d.phases || {}).some(ph => (ph.attacks || []).includes(L.id)),
          `Enemy "${d.id}" attack "${a.id}": learns "${a.learns}" must be another of its attacks, marked learned: true, learning nothing itself, in no phase's attacks.`); }
      if ('learned' in a) need(a.learned === true && d.attacks.some(x => x && x.learns === a.id), `Enemy "${d.id}" attack "${a.id}": learned must be true, on an attack another one learns.`);
      if (visual && 'learns' in a && a === d.attacks.find(x => x && 'learns' in x)) {   // one mark on its figure for each attack it can learn
        const n = d.attacks.filter(x => x && 'learns' in x).length, M = d.model && KIT.resolve(d.model);
        need(!!(M && M.marks && M.marks.length >= n), `Enemy "${d.id}": it can learn ${n} attacks, so its model needs as many marks.`);
      }
      if (visual) for (const h of (a.hits || []).filter(h => h.tell)) { const M = d.model && KIT.resolve(d.model); need(!!(M && (h.tell === 'shield' ? M.shieldTell : M.tells && M.tells[h.tell])), `Enemy "${d.id}" attack "${a.id}": tell "${h.tell}" needs the model's ${h.tell === 'shield' ? 'shieldTell' : 'tells.' + h.tell}.`); }
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
    // Pass 100: the posture bar, the stagger meter and the guard meter went (the Finishing Blow, js/finisher.js).
    need(!('posture' in d) && !('stagger' in d) && !(d.guard && ('max' in d.guard || 'breakTime' in d.guard)), `Enemy "${d.id}": posture, stagger and a guard's meter are gone (pass 100: the Finishing Blow).`);
    // Group scaling is gone (v7.65.0): no enemy grows with the team, so a leftover `groupScale` is a mistake.
    need(!('groupScale' in d), `Enemy "${d.id}": groupScale is gone; no enemy scales with the number of players (CONFIG.pace).`);
    if ('deathFade' in d) need(num(d.deathFade) && d.deathFade > 1, `Enemy "${d.id}": deathFade must be a number of seconds above 1.`);
    if ('holyLight' in d) need(d.holyLight && [d.holyLight.color, d.holyLight.core].every(v => Number.isInteger(v) && v >= 0 && v <= 0xffffff),
      `Enemy "${d.id}": holyLight needs a color and a core colour (js/holy.js).`);   // v7.50.0 (the Kindling Tree)
    // Pass 55 (the King's Blade): its own pose as a Finishing Blow's cuts open (pass 100: it was the kneel of a posture
    // break; js/finisher.js executedPose, js/attack-anim.js applyKeyPose).
    if ('brokenPose' in d) need(d.brokenPose && typeof d.brokenPose === 'object' && Object.entries(d.brokenPose).every(([k, v]) =>
      ['crouch', 'lean', 'kneel'].includes(k) ? num(v) && Math.abs(v) <= 1.5 : Array.isArray(v) && v.length === 3 && v.every(x => num(x) && Math.abs(x) <= 4)),
      `Enemy "${d.id}": brokenPose is a key pose (bone: [x, y, z] rad; crouch, lean, kneel numbers).`);
    if ('rooted' in d) need(typeof d.rooted === 'boolean', `Enemy "${d.id}": rooted must be true or false.`);   // pass 50 (the Kindling Tree)
    // Pass 68 (the Bell Warden): blows landed on him fill his resonance; at max a `when: 'resonant'` attack answers. A phase may carry its own.
    const resOk = R => R && typeof R === 'object' && num(R.max) && R.max > 0 && num(R.light) && R.light >= 0 && num(R.heavy) && R.heavy >= 0
      && Array.isArray(R.breakers) && R.breakers.every(b => typeof b === 'string') && num(R.delay) && R.delay >= 0 && num(R.decay) && R.decay >= 0
      && (!('rest' in R) || num(R.rest) && R.rest >= 0);
    const hasAnswer = ids => d.attacks.some(a => a && a.when === 'resonant' && (!ids || ids.includes(a.id)));
    if ('resonance' in d) need(resOk(d.resonance) && hasAnswer(), `Enemy "${d.id}": resonance needs max (above 0), light, heavy, breakers (attack ids), delay and decay (and an optional rest, s), and an attack with when: 'resonant'.`);
    // Pass 75 (Aldric): `share` of each blow landed opens a wound (at most `cap` of the bar) that closes at `rate` of the bar a
    // second once no blow has landed for `delay` s. A phase may carry its own.
    const mendOk = M => M && typeof M === 'object' && num(M.share) && M.share > 0 && M.share <= 1 && num(M.cap) && M.cap > 0 && M.cap <= 1
      && num(M.delay) && M.delay >= 0 && num(M.rate) && M.rate > 0;
    const MEND_MSG = 'mend needs share and cap (fractions above 0, up to 1), delay (s, 0 or more) and rate (a fraction of the bar a second, above 0).';
    if ('mend' in d) need(mendOk(d.mend), `Enemy "${d.id}": ${MEND_MSG}`);
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
        // Most of its moves can be deflected (pass 93, CONFIG.undeflectable): beside its area hits, grabs, leaps, shots and
        // fire, a phase keeps at most `bigMoments` undeflectable moves (a learned form shares its move's name).
        if (ph && Array.isArray(ph.attacks)) {
          const by = id => d.attacks.find(a => a && a.id === id), seen = new Set(), big = new Set();
          const own = ph.attacks.map(by).filter(Boolean), more = own.flatMap(a => [a.learns, ...(a.followUps || []).map(f => f.attack)]).map(id => id && by(id));
          for (const a of own.concat(more)) {   // its learned forms and follow-ups too
            if (!a || !a.hits || seen.has(a) || !(a.noParry || a.rollOnly) || a.projectile) continue;
            seen.add(a);
            if (a.hits.some((h, i) => areaHit(a, i) || h.seize || h.pull || h.leap || h.erupt || h.bolt || h.burrow || h.prismFire)) continue;
            big.add(a.name.replace(/, Learned$/, ''));
          }
          need(big.size <= CONFIG.undeflectable.bigMoments, `${tag}: ${big.size} moves no guard can deflect (${[...big].join(', ')}); a phase keeps at most ${CONFIG.undeflectable.bigMoments} besides its area hits, grabs, leaps, shots and fire (CONFIG.undeflectable).`);
        }
        if (visual && ph && 'reveal' in ph) { const M = d.model && KIT.resolve(d.model); need(Array.isArray(ph.reveal) && !!M && ph.reveal.every(sl => (M.hidden || []).includes(sl)),
          `${tag}: reveal must list material slots its model hides (its "hidden").`); }
        if (visual && ph && 'conceal' in ph) { const M = d.model && KIT.resolve(d.model); need(Array.isArray(ph.conceal) && !!M && ph.conceal.every(sl => sl === 'weapon' || sl in M.materials),
          `${tag}: conceal must list material slots of its model (or 'weapon').`); }
        if (ph && 'revealBurst' in ph) need(ph.revealBurst && Number.isInteger(ph.revealBurst.color) && num(ph.revealBurst.count) && ph.revealBurst.count > 0
          && num(ph.revealBurst.speed) && ph.revealBurst.speed > 0 && 'reveal' in ph, `${tag}: revealBurst needs color, count and speed (above 0), and a reveal.`);   // v7.62.0
        if (ph && 'opener' in ph) need(aids.has(ph.opener) && (!ph.attacks || ph.attacks.includes(ph.opener)), `${tag}: opener "${ph.opener}" must be one of its attacks, and of the phase's own when it lists them (the phase looks it up there).`);
        if (ph && 'attacks' in ph) need(Array.isArray(ph.attacks) && ph.attacks.length > 0 && ph.attacks.every(id => aids.has(id)),
          `${tag}: attacks must list attack ids of the enemy (unknown: ${(ph.attacks || []).filter(id => !aids.has(id)).join(', ')}).`);
        for (const k of ['storm', 'rooted']) if (ph && k in ph) need(typeof ph[k] === 'boolean', `${tag}: ${k} must be true or false.`);
        if (ph && 'ignite' in ph) need(ph.ignite === true || ph.ignite === 'weapon', `${tag}: ignite must be true (he burns) or 'weapon' (only his weapon does: js/finale.js).`);   // pass 63
        if (ph && 'tether' in ph) need(num(ph.tether) && ph.tether >= 2 && ph.tether <= 40, `${tag}: tether must be a radius in m (2 to 40) round where it stands.`);   // pass 42
        if (ph && 'resonance' in ph) need(resOk(ph.resonance) && hasAnswer(ph.attacks), `${tag}: resonance needs max (above 0), light, heavy, breakers, delay and decay, and one of its attacks with when: 'resonant'.`);   // pass 68
        if (ph && 'mend' in ph) need(mendOk(ph.mend), `${tag}: ${MEND_MSG}`);   // pass 75
        if (ph && 'echoColor' in ph) need(Number.isInteger(ph.echoColor) && ph.echoColor >= 0 && ph.echoColor <= 0xffffff, `${tag}: echoColor must be a colour (0xrrggbb).`);   // pass 44
        if (ph && 'fill' in ph) need(num(ph.fill) && ph.fill > 0 && ph.fill <= 1 && !('at' in ph), `${tag}: fill must be a fraction (0 to 1] of a refilled bar.`);   // v5.9
        if (ph && 'transition' in ph) need(num(ph.transition) && ph.transition > 0, `${tag}: transition must be seconds above 0.`);
        if (ph && 'name' in ph) need(typeof ph.name === 'string' && ph.name.length > 0, `${tag}: name must be text.`);
      }
      if ('defaultPhases' in d) need(Array.isArray(d.defaultPhases) && d.defaultPhases.length > 0 && d.defaultPhases.every(id => P && id in P), `Enemy "${d.id}": defaultPhases must list its phase ids.`);
      // (pass 139) an edgeTell on a slot the model hides: a phase reveals it, and until then every blow names its own tell,
      // so the halo never shows on a weapon not yet in its hands (the revealing phase's opener too: the reveal lands after it)
      const EM = visual && d.model && KIT.resolve(d.model), ES = EM && EM.edgeTell && (EM.hidden || []).includes(EM.edgeTell.slot) && EM.edgeTell.slot;
      if (ES && P) {
        const order = Array.isArray(d.defaultPhases) ? d.defaultPhases : Object.keys(P), at = order.findIndex(id => P[id] && (P[id].reveal || []).includes(ES));
        const by = id => d.attacks.find(x => x && x.id === id), untold = [];
        for (const id of at < 0 ? order : order.slice(0, at)) for (const x of (P[id] && P[id].attacks ? P[id].attacks.map(by) : d.attacks)) if (x && x.hits.some(h => !h.tell)) untold.push(x.id);
        if (at >= 0 && P[order[at]].opener && by(P[order[at]].opener).hits.some(h => !h.tell)) untold.push(P[order[at]].opener);
        need(at >= 0 && !untold.length, `Enemy "${d.id}": its edgeTell slot "${ES}" is hidden, so a phase must reveal it, and every blow before then needs a tell (untold: ${[...new Set(untold)].join(', ')}).`);
      }
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
    need(a.flow === undefined || a.flow === true, `Player attack "${a.id}": flow must be true or left out.`);
    need(a.stringEnd === undefined || a.stringEnd === true, `Player attack "${a.id}": stringEnd (the last blow of a full string: Ember Lick) must be true or left out.`);
    for (const [action, id] of Object.entries(a.next || {})) need(id in M.attacks && action in M.ground, `Player attack "${a.id}": next.${action} -> "${id}" is not a ground action and attack.`);
  }
  const PC = CONFIG.pace;   // a boss's pace and Boss Rush's curve (v7.65.0): it only ever speeds a boss up
  need(PC && num(PC.boss) && PC.boss >= 1 && num(PC.rise) && PC.rise >= 0 && num(PC.scale) && PC.scale > 0 && num(PC.max) && PC.max >= PC.boss
    && num(PC.tell) && PC.tell >= 0 && num(PC.tellFloor) && PC.tellFloor > 0 && PC.tellFloor <= 1 && Number.isInteger(PC.warm) && PC.warm >= 0 && num(PC.warmFrom) && PC.warmFrom > 0 && PC.warmFrom <= 1
    && Number.isInteger(PC.steady) && PC.steady >= PC.warm,
    'CONFIG.pace: boss must be 1 or more, rise 0 or more, scale above 0, max at least boss, tell 0 or more, tellFloor in (0, 1], warm a whole number of 0 or more, warmFrom in (0, 1], steady a whole number of fights won, at least warm.');
  const SW = CONFIG.swift, KM = CONFIG.killMoment;   // v7.69.0: Boss Rush's par and swift kill, and the kill moment
  need(SW && num(SW.par) && SW.par > 0 && num(SW.late) && SW.late >= SW.par && num(SW.pair) && SW.pair >= 0 && num(SW.max) && SW.max >= SW.par && Number.isInteger(SW.extra) && SW.extra >= 0 && CONFIG.abilities.offer + SW.extra <= ABILITIES.length
    && SW.might && DRAWN.every(r => num(SW.might[r]) && SW.might[r] >= 0),
    'CONFIG.swift: par above 0, late at least par, pair 0 or more, max at least par, extra a whole number of 0 or more that still fits the abilities there are, and a might of 0 or more for every rarity.');
  need(KM && num(KM.slow) && KM.slow > 0 && KM.slow <= 1 && ['time', 'embers', 'emberSpeed'].every(k => num(KM[k]) && KM[k] >= 0),
    'CONFIG.killMoment: slow in (0, 1], and time, embers and emberSpeed 0 or more.');
  // Endless (pass 65): CONFIG.endless and RUSH (js/data/rush.js). A modifier only ever speeds a boss up.
  const EN = CONFIG.endless, whole = (v, min) => Number.isInteger(v) && v >= min;
  need(EN && Array.isArray(EN.warmHealth) && EN.warmHealth.length === PC.warm && EN.warmHealth.every((k, i) => num(k) && k > 0 && k <= 1 && (!i || k >= EN.warmHealth[i - 1])) && whole(EN.crowned, 2) && whole(EN.crownedOffer, CONFIG.abilities.offer) && EN.crownedOffer <= ABILITIES.length &&
    whole(EN.pairFrom, PC.warm + 1) && whole(EN.pairEvery, 1) && num(EN.pairRest) && EN.pairRest > 0 && EN.pairRest <= 1 && typeof EN.pairTurns === 'boolean' && Array.isArray(EN.settle) && EN.settle.every((k, i) => num(k) && k > 0 && k <= 1 && (!i || k >= EN.settle[i - 1])) && num(EN.pairHealth) && EN.pairHealth > 0 && EN.pairHealth <= 1 && Array.isArray(EN.mods) && EN.mods.every((f, i) => whole(f, 1) && (!i || f > EN.mods[i - 1])) && whole(EN.longest, 2),
    'CONFIG.endless: warmHealth rising shares in (0, 1], one per warm-up fight (CONFIG.pace.warm), crowned 2 or more, crownedOffer from CONFIG.abilities.offer to the abilities there are, pairFrom past the warm-up, pairEvery 1 or more, pairRest and pairHealth in (0, 1], pairTurns true or false, settle rising shares in (0, 1], mods rising fight numbers, longest 2 or more.');
  need(ABILITIES.some(b => b.rarity === 'legendary'), 'Endless: a Crowned win offers a legendary, so there must be one.');
  need(num(EN.mightBlows) && EN.mightBlows >= 0 && EN.mightBlows <= 2, "CONFIG.endless.mightBlows: 0 to 2, what each point of the party's might adds to a boss's blows (pass 174).");
  need(num(CONFIG.bot.counterReach) && CONFIG.bot.counterReach > 0 && CONFIG.bot.counterReach <= 1, "CONFIG.bot.counterReach: a share in (0, 1] of the counter's flash-step range (pass 174).");
  if (CONFIG.fx && CONFIG.fx.strikeShake) need(num(CONFIG.fx.strikeShake.player) && CONFIG.fx.strikeShake.player > 0, "CONFIG.fx.strikeShake.player: above 0, what a player's blow is divided by before it shakes the camera (pass 174).");
  need(RUSH.health && Object.entries(RUSH.health).every(([id, k]) => Object.hasOwn(ENEMY_BY_ID, id) && isBossDef(ENEMY_BY_ID[id]) && num(k) && k > 0 && k <= 1),
    'RUSH.health: a share in (0, 1] for bosses.');
  need(Array.isArray(RUSH.modifiers) && new Set(RUSH.modifiers.map(m => m.id)).size === RUSH.modifiers.length, 'RUSH.modifiers: a list with different ids.');
  for (const m of RUSH.modifiers) {
    const where = `RUSH modifier "${m.id}"`, keys = ['pace', 'rest', 'chain'];
    need(typeof m.id === 'string' && /^[a-z][a-z-]*$/.test(m.id) && typeof m.name === 'string' && m.name.length > 0 && whole(m.from, 1), `${where}: an id, a name and the fight it may come from.`);
    need(Object.keys(m).every(k => ['id', 'name', 'from', ...keys].includes(k)) && keys.some(k => k in m) && keys.every(k => !(k in m) || num(m[k]) && m[k] > 1 && m[k] <= 3),
      `${where}: it changes pace, rest or chain, each above 1 and at most 3 (a modifier never adds damage or health, nor slows a boss).`);
  }
  const AG = CONFIG.aggro;   // a boss against a group (v7.35.0): its targeting and its area attacks
  need(AG && ['damage', 'healReach', 'hold', 'margin', 'crowd', 'areaWidth'].every(k => num(AG[k]) && AG[k] >= 0) && num(AG.memory) && AG.memory > 0
    && num(AG.areaMul) && AG.areaMul >= 1, 'CONFIG.aggro: damage, healReach, hold, margin, crowd and areaWidth must be 0 or more, memory above 0 and areaMul 1 or more.');
  need(num(CONFIG.parry.counterReel) && CONFIG.parry.counterReel > 0, 'CONFIG.parry.counterReel must be positive.');
  // The Finishing Blow (js/finisher.js): the attack it runs, and every tuning number.
  need(num(CONFIG.enemy.bossDamage) && CONFIG.enemy.bossDamage > 0, 'CONFIG.enemy.bossDamage: a share above 0 of the damage of every boss blow.');
  { const Fa = M.attacks.finisher, F = CONFIG.finisher;
    need(Fa && Fa.pose && Fa.hits.length === 1 && Fa.damage === 0, 'Player moveset: the Finishing Blow needs a one-hit "finisher" attack with a pose and no damage of its own.');
    need(F && Number.isInteger(F.cracks) && F.cracks >= 1 && Number.isInteger(F.steps) && F.steps >= 1
      && ['past', 'hitstop', 'grace', 'push'].every(k => num(F[k]) && F[k] >= 0)
      && ['base', 'mul', 'bossMul', 'bossCap'].every(k => num(F.damage[k]) && F.damage[k] > 0) && F.damage.bossCap <= 0.5
      && num(F.heal) && F.heal >= 0 && F.heal < 1 && num(F.camera.rate) && F.camera.rate > 0,
      'CONFIG.finisher: cracks and steps whole numbers 1 or more, the other numbers 0 or more, damage above 0 with bossCap at most 0.5, heal under 1.');
    const GS = CONFIG.fx && CONFIG.fx.guardCrackShake, burst = b => b && num(b.color) && Number.isInteger(b.count) && b.count >= 0 && num(b.speed) && b.speed >= 0;
    need(F.shake && num(F.shake.time) && F.shake.time >= 0 && num(F.shake.amp) && F.shake.amp >= 0
      && num(F.camera.push) && F.camera.push >= 0 && F.camera.push < 1 && num(F.camera.lower) && F.bursts && ['enter', 'exit', 'step'].every(k => burst(F.bursts[k]))
      && GS && num(GS.time) && GS.time >= 0 && num(GS.amp) && GS.amp >= 0,
      'CONFIG.finisher: shake { time, amp } and camera.push (under 1) 0 or more, camera.lower a number, bursts enter, exit and step each { color, count, speed }; CONFIG.fx.guardCrackShake { time, amp } 0 or more.'); }
  for (const group of ['ground', 'air', 'dash', 'counter'])
    for (const [action, id] of Object.entries(M[group] || {})) need(id in M.attacks && action in M.ground, `Player moveset "${group}.${action}": no attack "${id}", or not a ground action.`);
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
  // (pass 162) `ruins: true`: the arena's walls and columns drawn from the Blender stones (js/baked/arena-ruins.js)
  for (const L of [ARENA, ...ALL_LEVELS]) if ('ruins' in L) need(L.layout === 'arena' && L.ruins === true && L.wallHeight === 1.3 && L.wallThickness === 0.9 && Number.isInteger(L.halfX) && Number.isInteger(L.halfZ) && (!visual || ['column', 'broken', 'stump', 'drum', 'wall', 'pier'].every(k => `arena:${k}__stone` in BAKED)),
    `Level "${L.id}": ruins must be true, on an arena layout with whole-metre halfX/halfZ, the stones' 1.3 m wall height and 0.9 m thickness, and js/baked/arena-ruins.js loaded.`);
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
      validateZoneMight(g, tag, need);
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
  need(Bk.cell > 0 && Number.isInteger(Bk.maxCells) && Bk.maxCells >= 3 && Bk.maxCells <= 120 && Number.isInteger(Bk.maxVolume) && Bk.maxVolume >= 1000 && Number.isInteger(Bk.cacheCells) && Bk.cacheCells >= 0
    && Bk.range > 0 && Bk.openRange > 0 && Bk.pad >= 0 && Bk.offset >= 0 && Bk.fill >= 0 && Bk.encode > 0
    && Object.values(CONFIG.VISUALS.quality).every(q => typeof q.baked === 'boolean'),
    'CONFIG.VISUALS.baked: cell, ranges and encode above 0, maxCells a whole number from 3 to 120, maxVolume a whole number of at least 1000, cacheCells a whole number, pad, offset and fill not negative; every preset says whether it is `baked`.');
  const AI = CONFIG.ai, nonNeg = v => num(v) && v >= 0;
  need(['basic', 'dash', 'rollOnly', 'shove', 'projectile'].every(k => nonNeg(AI.chance[k])) && nonNeg(AI.approach) && AI.busyMul >= 0 && AI.busyMul <= 1 && nonNeg(AI.gap)
    && nonNeg(AI.holdInset) && AI.holdMax > 0 && nonNeg(AI.holdBand) && AI.holdSpeedMul > 0 && nonNeg(AI.stepOut) && nonNeg(AI.commitReach) && nonNeg(AI.busyCooldown),
    'CONFIG.ai: chance (basic, dash, rollOnly, shove, projectile), approach, gap, holdInset, holdBand, stepOut, commitReach and busyCooldown must be 0 or more, busyMul between 0 and 1, holdMax and holdSpeedMul above 0.');
  const Se = AI.search, Vi = CONFIG.vision;
  need(AI.kite >= 0 && AI.kite <= 1 && AI.leashResume > 0 && AI.leashResume <= 1 && Se.speedMul > 0 && nonNeg(Se.arrive) && nonNeg(Se.look) && Se.max > 0,
    'CONFIG.ai: kite must be 0..1, leashResume above 0 and at most 1, search.speedMul and search.max above 0, search.arrive and search.look 0 or more.');
  need(Vi.cone > 0 && Vi.cone <= Math.PI && nonNeg(Vi.near), 'CONFIG.vision: cone must be above 0 and at most pi (rad), near 0 or more.');
  const Pl = CONFIG.player, Mo = Pl.momentum;
  need(Mo && num(Mo.carryTime) && Mo.carryTime > 0 && num(Mo.flowSteer) && Mo.flowSteer > 0 && num(Mo.flowOut) && Mo.flowOut >= 0 && Mo.flowOut <= 1,
    'CONFIG.player.momentum: carryTime (s) and flowSteer (rad/s) above 0, flowOut from 0 to 1 (of the recovery).');
  // The pass-85 moveset: dash charges, the counter after a perfect dodge, the dash attack, drinking on the move.
  need(Number.isInteger(Pl.dashCharges) && Pl.dashCharges >= 1 && [Pl.dashRefill, Pl.counterTime, Pl.drinkSpeedMul].every(v => num(v) && v > 0)
    && nonNeg(Pl.dashAttackFrom) && Pl.dashAttackFrom < Pl.rollTime && Pl.rollIFrames < Pl.rollTime && nonNeg(Pl.comboGrace),
    'CONFIG.player: dashCharges must be a whole number 1 or more, dashRefill, counterTime and drinkSpeedMul above 0, dashAttackFrom and rollIFrames under rollTime.');
  { const Pa = CONFIG.parry, Ms = CONFIG.enemy.mash;   // the deflect, and the bosses' answer to mashing
    need(['arm', 'lead', 'grace', 'spamLock', 'reach', 'hitstop', 'riposteTime'].every(k => num(Pa[k]) && Pa[k] >= 0) && Pa.arm > 0 && Pa.spamLock >= Pa.arm,
      'CONFIG.parry: arm, lead, grace, spamLock, reach, hitstop and riposteTime must be 0 or more, arm above 0 and spamLock at least arm.');
    need(Ms && Number.isInteger(Ms.hits) && Ms.hits >= 2 && [Ms.gap, Ms.reach, Ms.areaBonus].every(v => num(v) && v >= 0) && Ms.recoverCut >= 0 && Ms.recoverCut <= 1,
      'CONFIG.enemy.mash: hits a whole number 2 or more, gap, reach and areaBonus 0 or more, recoverCut from 0 to 1.');
    const Bp = CONFIG.enemy.press;   // pass 90: every boss presses harder
    need(Bp && num(Bp.rest) && num(Bp.chain) && Bp.rest >= 1 && Bp.rest <= 2 && Bp.chain >= 1 && Bp.chain <= 2, 'CONFIG.enemy.press: rest and chain from 1 to 2.'); }
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
  const trailOk = t => !!t && typeof t === 'object' && Object.keys(t).every(k => k === 'edge' || k === 'life' || k === 'smear')
    && num(t.edge) && t.edge > 0 && t.edge <= 1 && num(t.life) && t.life > 0 && t.life <= 1
    && (t.smear === undefined || num(t.smear) && t.smear > 0 && t.smear <= 1);   // (pass 121) smear: the share of the blade from its tip smeared
  for (const [n, E] of Object.entries(FX_ELEMENTS))
    need(['core', 'glow', 'mote', 'trail'].every(k => isCol(E[k])) && E.sparks in CONFIG.VISUALS.ultra.sparks.colors && BOSS_FX_IMPACTS.includes(E.impact)
      && (E.smoke === undefined || isCol(E.smoke)), `FX_ELEMENTS.${n}: core, glow, mote and trail colours, sparks (a spark palette) and an impact (${BOSS_FX_IMPACTS.join(', ')}).`);
  for (const [id, B] of Object.entries(BOSS_FX)) {
    const d = ENEMY_BY_ID[id], w = `BOSS_FX.${id}`;
    need(!!d, `${w}: no enemy "${id}".`);
    if (!d) continue;
    need(B.element in FX_ELEMENTS, `${w}: unknown element "${B.element}".`);
    if ('aura' in B) need(isCol(B.aura), `${w}: aura must be a colour.`);
    if ('trail' in B) need(trailOk(B.trail), `${w}: trail is { edge (0 to 1), life (s, above 0, at most 1), smear (0 to 1, optional) }.`);
    for (const [ph, el] of Object.entries(B.phases || {}))
      need(!!(d.phases && d.phases[ph]) && el in FX_ELEMENTS, `${w}.phases.${ph}: needs a phase of "${id}" and a known element ("${el}").`);
    const ids = new Set([...(d.attacks || []), ...Object.values(d.phases || {}).flatMap(P => P.attacks || [])].filter(a => a && typeof a === 'object').map(a => a.id));
    for (const [aid, A] of Object.entries(B.attacks || {})) {
      need(ids.has(aid), `${w}.attacks.${aid}: "${id}" has no attack "${aid}".`);
      if (A.element !== undefined) need(A.element in FX_ELEMENTS, `${w}.attacks.${aid}: unknown element "${A.element}".`);
      if (A.impact !== undefined) need(BOSS_FX_IMPACTS.includes(A.impact), `${w}.attacks.${aid}: unknown impact "${A.impact}".`);
      if (A.windup !== undefined) need(['gather', 'none'].includes(A.windup), `${w}.attacks.${aid}: windup is "gather" or "none".`);
      if (A.aura !== undefined) need(isCol(A.aura), `${w}.attacks.${aid}: aura must be a colour.`);
      if (A.trail !== undefined) need(trailOk(A.trail), `${w}.attacks.${aid}: trail is { edge (0 to 1), life (s, above 0, at most 1), smear (0 to 1, optional) }.`);
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
      // Pass 79: a chapter's own `might` for its bosses (roadMight), over CONFIG.story.road's climb.
      if ('might' in c) need(c.might && typeof c.might === 'object' && Object.entries(c.might).every(([k, v]) => ['pace', 'health', 'damage'].includes(k) && num(v) && v >= 0.3 && v <= 3),
        `${tag}: might may set pace, health and damage, each a number from 0.3 to 3.`);
    }
    need(new Set(storyIds).size === storyIds.length && (C.chapters || []).length > 0, `${w}: each level may appear only once, and there must be a chapter.`);
    // A road whose last chapter has no `ending` goes on (its later chapters not built yet): it says so in `goesOn`.
    const lastLevel = ALL_LEVELS.find(l => l.id === storyIds[storyIds.length - 1]);
    if ('goesOn' in C || (lastLevel && !lastLevel.ending)) need(typeof C.goesOn === 'string' && C.goesOn.length > 0, `${w}: goesOn must be a line of text (needed while its last chapter has no ending).`);
    storyIdsAll.push(...(C.chapters || []).map(c => c && c.level));
  }
  need(new Set(storyIdsAll).size === storyIdsAll.length, 'Story: a level may be a chapter of only one campaign.');
  // The road's climb (pass 79, CONFIG.story.road): each value a [first chapter, last chapter] pair of positive numbers.
  const R = CONFIG.story.road;
  for (const who of ['foes', 'bosses']) for (const k of ['pace', 'health', 'damage'])
    need(R && R[who] && Array.isArray(R[who][k]) && R[who][k].length === 2 && R[who][k].every(v => num(v) && v >= 0.3 && v <= 3),
      `CONFIG.story.road.${who}.${k} must be [first, last], each a number from 0.3 to 3.`);
  // Flasks found on the road (a level's `flaskFinds`): only on a chapter of a campaign, each id unique on every road.
  const findIds = ALL_LEVELS.flatMap(L => (Array.isArray(L.flaskFinds) ? L.flaskFinds : []).map(f => f && f.id));
  need(new Set(findIds).size === findIds.length, 'Levels: every flaskFinds id must be unique.');
  // roadFlasks and roadMight walk STORY's road, and js/lore.js draws a find only where the level has lore.
  for (const L of ALL_LEVELS) if ('flaskFinds' in L) need(STORY.chapters.some(c => c.level === L.id) && LORE.levels[L.id], `Level "${L.id}": flaskFinds only on a chapter of STORY's road, in a level with an entry in LORE.levels.`);
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
  if (typeof SHOWCASE !== 'undefined') validateShowcase(SHOWCASE, need);   // js/data/showcase.js
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
// The showcase's script (js/data/showcase.js, js/showcase.js): bosses, phases and strings that exist, keys its kit holds,
// beats in order inside the show, grounds that exist, fights and the title on the music's bars.
function validateShowcase(S, need) {
  const tag = 'SHOWCASE', num = v => Number.isFinite(v), len = S.length, fights = Array.isArray(S.fights) ? S.fights : [];
  need(num(S.bpm) && S.bpm >= 60 && S.bpm <= 200 && num(len) && len > 0 && num(S.preroll) && S.preroll >= 0 && Number.isInteger(S.seed), `${tag}: bpm 60-200, length > 0 beats, preroll >= 0 s and an integer seed.`);
  need(num(S.again) && S.again > 0, `${tag}: again is the hours between two showings at launch, > 0.`);
  need(!!S.pace && Number.isInteger(S.pace.won) && S.pace.won >= 0 && Array.isArray(S.pace.modifiers) && S.pace.modifiers.every(id => id in RUSH_MODIFIER_BY_ID), `${tag}: pace needs won (fights) and known RUSH modifiers.`);
  need(Array.isArray(S.kit) && S.kit.every(id => id in ABILITY_BY_ID), `${tag}: kit must list known abilities.`);
  need(BOT_PROFILES.some(p => p.id === S.profile), `${tag}: unknown bot profile "${S.profile}".`);
  need(fights.length > 0 && fights[0].from === 0 && fights.every((f, i) => i === 0 || f.from > fights[i - 1].from), `${tag}: fights start at beat 0, in order.`);
  for (const f of fights) {
    const d = ENEMY_BY_ID[f.boss];
    need(!!d && isBossDef(d), `${tag}: fight from beat ${f.from}: "${f.boss}" is not a boss.`);
    if (d) need(f.phase === undefined || (d.phases && f.phase in d.phases && (d.defaultPhases || []).includes(f.phase)), `${tag}: ${f.boss} has no phase "${f.phase}" it fights through.`);
    need(num(f.health) && f.health > 0 && f.health <= 1, `${tag}: ${f.boss}'s health is a share of its bar, 0-1.`);
    need(f.cracks === undefined || (Number.isInteger(f.cracks) && f.cracks >= 0 && f.cracks < CONFIG.finisher.cracks), `${tag}: ${f.boss}'s cracks: 0 to ${CONFIG.finisher.cracks - 1} (its guard as the fight is joined).`);
  }
  const fightAt = b => fights.filter(f => f.from <= b).pop();
  const keyOf = id => ABILITY_BY_ID[id] && ABILITY_BY_ID[id].key;
  let prev = -Infinity; const ids = new Set();
  for (const b of S.beats || []) {
    const t = `${tag}: beat "${b.id}"`;
    need(typeof b.id === 'string' && !ids.has(b.id), `${t}: needs a unique id.`); ids.add(b.id);
    need(num(b.at) && b.at > prev && b.at < (S.title ? S.title.at : len), `${t}: at must be after the beat before it and before the title.`); prev = b.at;
    need(['dodge', 'deflect', 'ability'].includes(b.kind), `${t}: kind is dodge, deflect or ability.`);
    // The blow's cuts (up to half a bar) would kill a boss the script keeps up, so a Finishing Blow is always the kill.
    need(!b.finisher || (b.kill && b.counter), `${t}: a Finishing Blow needs its counter and ends the fight (kill).`);
    need(b.kind !== 'ability' || (!b.kill && !b.finisher && !b.counter), `${t}: an ability beat has no counter, kill or Finishing Blow.`);
    if (b.kind === 'ability') need(Number.isInteger(b.key) && b.key >= 1 && b.key <= ABILITY_KEYS.length && (S.kit || []).some(id => keyOf(id) === ABILITY_KEYS[b.key - 1]), `${t}: key ${b.key} is not one the kit holds.`);
    else {
      const f = fightAt(b.at), d = f && ENEMY_BY_ID[f.boss], P = d && d.phases && f.phase ? d.phases[f.phase] : null;
      const a = d && d.attacks.find(x => x.id === b.attack);
      need(!!a && (!P || !P.attacks || P.attacks.includes(b.attack)), `${t}: ${f ? f.boss : '?'} (${f && f.phase}) has no attack "${b.attack}".`);
      if (a && b.kind === 'deflect') need(a.hits.some((h, i) => canParryHit(a, i)), `${t}: "${b.attack}" has no blow a deflect can take.`);
      need(b.counter === undefined || b.counter in PLAYER_DEF.moveset.counter, `${t}: counter is an action with a counter (${Object.keys(PLAYER_DEF.moveset.counter).join(', ')}).`);
      need(!b.kill || b.counter, `${t}: a kill needs its counter.`);
      // The Finishing Blow (js/finisher.js): the fight's cracks and its earlier counters crack the guard to the last
      // exactly by a `finisher` beat's counter, and no sooner.
      if (b.counter && f) {
        const C = CONFIG.finisher;
        const before = (S.beats || []).filter(x => x !== b && x.counter && x.at < b.at && fightAt(x.at) === f);
        const cracks = (f.cracks || 0) + before.length;
        need(b.finisher ? cracks === C.cracks : cracks < C.cracks, b.finisher
          ? `${t}: its counter is the Finishing Blow only on a guard cracked ${C.cracks} times; ${f.boss}'s cracks and earlier counters make ${cracks}.`
          : `${t}: ${f.boss}'s guard is cracked ${cracks} times by then, so this counter would be a Finishing Blow: mark it finisher.`);
      }
    }
  }
  for (const f of fights) need(f.ground === undefined || f.ground === 'arena' || ALL_LEVELS.some(l => l.id === f.ground), `SHOWCASE: ${f.boss}'s ground "${f.ground}" is not a level.`);
  // The player's view (pass 166): the music's grid holds a fight's start and the title on a bar line, and a fade fits
  // between two of them.
  const lastBeat = (S.beats || []).reduce((m, b) => Math.max(m, b.at), -Infinity);
  need(fights.every(f => num(f.from) && f.from % 4 === 0), `${tag}: each fight starts on a bar line (from: a multiple of 4 beats; the music's chords and fills are on bars).`);
  need(!!S.title && num(S.title.at) && S.title.at < len && S.title.at % 4 === 0 && S.title.at > lastBeat && fights.every(f => f.from < S.title.at),
    `${tag}: the title comes after every beat and fight and before the end, on a bar line (a multiple of 4 beats: the music holds its chord from there).`);
  const gaps = fights.map((f, i) => ((i + 1 < fights.length ? fights[i + 1].from : S.title ? S.title.at : len) - f.from) * 60 / S.bpm);
  need(num(S.fade) && S.fade > 0 && S.fade <= 1 && gaps.every(g => g >= 3 * S.fade), `${tag}: fade is 0-1 s, and every fight lasts at least three fades.`);
  // A beat played in the light: its first blow a fade clear of every cut (both sides) and of the fade into the title.
  const beatS = 60 / S.bpm, cutsAt = fights.slice(1).map(f => f.from * beatS);
  for (const b of S.beats || []) need(num(S.fade) && cutsAt.every(c => Math.abs(b.at * beatS - c) >= S.fade + 0.1) && !!S.title && b.at * beatS <= S.title.at * beatS - 2 * S.fade,
    `${tag}: beat "${b.id}" lands under a fade's black (keep it ${S.fade} s and more from a fight's start and the title's fade).`);
  need(!!S.glare && num(S.glare.bloom) && S.glare.bloom >= 0 && S.glare.bloom <= 1 && num(S.glare.threshold) && S.glare.threshold >= 0 && num(S.glare.flash) && S.glare.flash >= 0 && S.glare.flash <= 1,
    `${tag}: glare needs bloom and flash (shares, 0-1) and a bloom threshold (>= 0).`);
  need(!!S.skip && ['from', 'for', 'again'].every(k => num(S.skip[k]) && S.skip[k] >= 0), `${tag}: skip needs from, for and again (s).`);
}
const GATE_STYLES = ['portcullis', 'barricade'];
const HOUSE_KINDS = ['house', 'tower'];
/// Room-style level checks (see LEVEL_2 and js/terrain.js): shapes first, then the 3D layout built from them.
// A level's lesson cards (v7.19.0, js/data/lessons.js): each a known lesson, once, with one trigger whose references exist
// in this level (a zone, a bonfire, an enemy kind, an earlier lesson of the same list).
// A gated zone's own `might` (Game.onRoad): { pace, health, damage }, each an optional share of the road's, 0.2-2.
function validateZoneMight(g, tag, need) {
  if (!('might' in g)) return;
  const m = g.might;
  need(!!m && typeof m === 'object' && Object.keys(m).length > 0 && Object.entries(m).every(([k, v]) => ['pace', 'health', 'damage'].includes(k)
    && Number.isFinite(v) && v >= 0.2 && v <= 2), `${tag}: might holds pace, health and damage, each a share of the road's from 0.2 to 2.`);
}
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
      if (keys[0] === 'held') need(v === true, `${tag}: held must be true.`);
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
  if ('townLook' in L) {   // pass 169: the houses' palettes and pieces (js/town.js)
    const T = L.townLook, cols = v => Array.isArray(v) && v.length > 0 && v.every(c => Number.isInteger(c) && c >= 0 && c <= 0xffffff), share = v => v === undefined || (num(v) && v >= 0 && v <= 1);
    check(T && 'houses' in L && cols(T.plaster) && cols(T.roof) && cols(T.timber) && share(T.oriels) && share(T.dormers)
      && (T.patterns === undefined || Array.isArray(T.patterns) && T.patterns.length > 0 && T.patterns.every(k => ['ends', 'cross', 'rail'].includes(k))),
      `${where}: townLook needs houses, and plaster, roof and timber lists of colours; patterns of 'ends', 'cross' or 'rail'; oriels and dormers shares 0..1.`);
  }
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
    validateZoneMight(g, tag, need);
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
    if ('fogColor' in sg) need('fog' in sg && Number.isInteger(sg.fogColor) && sg.fogColor >= 0 && sg.fogColor <= 0xffffff, `${tag}: fogColor is a fog gate's colour (0xrrggbb), on a gate with fog.`);
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
  // Pass 79: the flasks found in a level (`flaskFinds`, Game.updateLevel), each an id and a spot on a floor. v7.0: a level may
  // lay hazard floors (rot) that hurt while stood in.
  need(!('flasks' in L), `${where}: flasks are found now (flaskFinds), not granted by a level.`);
  if ('flaskFinds' in L) need(Array.isArray(L.flaskFinds) && L.flaskFinds.every(f => f && typeof f.id === 'string' && f.id.length > 0 && onFloor(f.x, f.z, f.y)),
    `${where}: each of flaskFinds needs an id and x, z (and y) on a floor.`);
  // Pass 159: a level of Story's road may give one ability of a given rarity, when the player first stands in `trigger`.
  if ('giveAbility' in L) {
    const G = L.giveAbility, b = G && Object.hasOwn(ABILITY_BY_ID, G.id) && ABILITY_BY_ID[G.id];
    need(!!b && !!(CONFIG.abilities.rarity[b.rarity] || {}).given && rectOk(G.trigger) && (G.y === undefined || num(G.y))
      && onFloor((G.trigger[0] + G.trigger[1]) / 2, (G.trigger[2] + G.trigger[3]) / 2, G.y ?? 0),
      `${where}: giveAbility needs the id of a given rarity's ability and a trigger rect whose middle is on a floor (at y, if given).`);
  }
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
