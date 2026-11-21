'use strict';
// ============================================================================
// The showcase (PLAN.md "The showcase"): SHOWCASE (js/data/showcase.js) played live in the engine, as an anime opening
// ============================================================================
// A director over the ordinary game: the Arena, a player whose presses come from a bot's hands (BotHands, js/bot.js),
// and four Boss Rush bosses at a late run's pace, one after another. Between the script's beats the bot fights on its
// own (bot.create); for a beat the director presses for it, reading each blow the way the bot does (bot.nextBlow).
// The simulation is the game's own fixed step on a seeded Math.random, so a run is the same run every time; the
// cameras cut on the music's beats (js/showcase-music.js) and only replace where the camera stands.
// Two clocks: the show's (`time`: the music, the cuts, the ink) and the game's (`sim`), which stands still through a
// freeze (SHOWCASE.freezes), so a freeze-frame name card is a real frame of the game, held while the camera moves on.
// The ink (pass 160, docs/showcase/storyboard.md): drawn over the game, never in it. Through a freeze the picture drops
// to ink and one accent (a backdrop filter and a multiplied tint, both page-level so they reach the game's canvas),
// speed lines close in and the name slams in on an ink slab; the cold open is letterboxed; an impact is one white frame.
// A first showing cannot be skipped: keys and clicks do nothing while it plays, pause and restart are held off. A later
// one shows a small "Esc  Skip" cap; Esc (a controller's Start or B, a tap on the cap) ends it at once.
//   showcase.play({ manual, onEnd, skippable })  starts it; `manual`: the caller steps it with frame(dt) (tests, the recorder)
//   showcase.frame(dt, { render })    one frame of a manual run
//   showcase.skip()                   ends a skippable run at once, as Esc does; false when it cannot
//   showcase.firstLaunch(then)        plays it at launch on a new version, once a day at most (boot.js); true if it will.
//                                     then(first): after it; `first` on the very first launch (no save of it at all)
//   showcase.claim({ version, now })  whether this launch plays it ('first' or 'update'), noting it if so (tests)
//   showcase.report()                 the last run's beats: what each needed and whether it happened
//   showcase.stop()                   ends a run at once (a test that failed half-way)
const showcase = (() => {
  const SEEN_KEY = 'combat-arena-3d.showcase', STEP = () => CONFIG.step;
  const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  // The game's random during the show: reseeded every step from the step's number, so a different count of draws by
  // the effects (a quality preset, reduced motion) changes at most that one step, not the rest of the show.
  const shared = { s: 0 }, sharedRandom = () => { shared.s = (shared.s * 1664525 + 1013904223) >>> 0; return shared.s / 4294967296; };
  const beatS = () => 60 / SHOWCASE.bpm;
  const counterId = action => PLAYER_DEF.moveset.attacks[PLAYER_DEF.moveset.counter[action]].id;
  const STRING = { dodge: 1, deflect: 1 };
  // The player's stick this step: one object, rewritten (nothing made per step).
  const IDLE = Object.freeze({ x: 0, z: 0, has: false }), MOVE = { x: 0, z: 0, has: true };
  const walk = (x, z) => { MOVE.x = x; MOVE.z = z; return MOVE; };   // beat kinds that are a boss's string met blow by blow
  let run = null, last = null, overlay = null, hooked = false;
  const scratch = { v: new THREE.Vector3() };

  // ---- the two clocks ---------------------------------------------------------------------------
  // The freezes (speed 0) and the slow-motion ramps (SHOWCASE.ramps, speed 0..1) in seconds of the show, made once at play.
  function freezeSpans() {
    // On whole steps: the game is held for a whole number of them, so the beats after a freeze land where it says.
    const S = STEP(), on = x => Math.round(x / S) * S, end = b => on(Math.min(b, SHOWCASE.length) * beatS());
    return (SHOWCASE.freezes || []).map(f => ({ def: f, speed: 0, t0: on(f.at * beatS()), t1: end(f.at + f.for) }))
      .concat((SHOWCASE.ramps || []).map(r => ({ def: r, speed: r.speed, t0: on(r.at * beatS()), t1: end(r.at + r.for) })));
  }
  // The freeze under show time `t`, or null.
  function frozenAt(t) {
    if (!run) return null;
    for (const f of run.freezes) if (f.speed === 0 && t >= f.t0 - 1e-9 && t < f.t1 - 1e-9) return f;
    return null;
  }
  // The slow-motion ramp under show time `t`, or null.
  function rampAt(t) {
    if (!run) return null;
    for (const f of run.freezes) if (f.speed > 0 && t >= f.t0 - 1e-9 && t < f.t1 - 1e-9) return f;
    return null;
  }
  // The game's time at show time `t`: the show's, less what every freeze and ramp before it held back.
  function simAt(t, spans) {
    let s = t;
    for (const f of spans) if (t > f.t0) s -= (Math.min(t, f.t1) - f.t0) * (1 - f.speed);
    return s;
  }

  // ---- what happened ----------------------------------------------------------------------------
  const watched = ['dodge', 'parry', 'strike', 'abilityPress', 'abilityPower', 'finisher', 'enemyDeath'];
  for (const type of watched) events.on(type, d => { if (run && run.live) noteEvent(type, d); });
  function noteEvent(type, d) {
    const b = run.beat, p = Game.player, k = run.keyBeat;
    // A key's press and its power are its own beat's, pressed between a string's blows or not (see pressKey).
    if (type === 'abilityPress') { if (k && d.body === p && d.key === k.keyName) k.got.press = true; return; }
    if (type === 'abilityPower') {   // its own key's power (a blade in flight may land after the beat)
      const slot = k && k.got.press && p.kit.pressed[k.keyName];
      if (slot && d.power === slot.id && (d.body === p || d.holder === p)) k.got.power = true;
      return;
    }
    if (!b) return;
    const g = b.got;
    if (type === 'dodge' && d.player === p) g.dodges.add(blowKeyOf(d.attacker));
    else if (type === 'parry' && d.player === p) g.parries.add(blowKeyOf(d.target));
    else if (type === 'strike' && d.attacker === p && d.strike.attackId === b.counterId) g.counter = true;
    else if (type === 'strike' && d.target === p && !d.blocked && (b.begun || !STRING[b.def.kind])) g.hurt++;
    else if (type === 'finisher' && d.player === p && d.enemy === run.boss) { g.finisher = true; g.lethal = !!d.lethal; }
    else if (type === 'enemyDeath' && d.enemy === run.boss) { g.kill = true; g.killAt = run.time; }
  }
  const blowKeyOf = e => (e.attackNo || 0) * 64 + (e.hitIndex || 0);
  // Whether a beat happened: every blow of its string dashed through or deflected and its counter landed (as the
  // Finishing Blow, for a `finisher` beat), its key's power fired, its kill made (by the blow's cuts, for a finisher).
  function verdict(b) {
    const D = b.def, g = b.got, need = [];
    if (D.kind === 'dodge') need.push(['every blow dashed through', g.dodges.size >= b.hits && g.hurt === 0]);
    if (D.kind === 'deflect') need.push(['every blow deflected (dashed where none can be)', g.parries.size >= 1 && g.parries.size + g.dodges.size >= b.hits && g.hurt === 0]);
    if (D.counter) need.push([`the ${D.counter} counter landed`, g.counter]);
    if (D.kind === 'ability') need.push([`key ${D.key} pressed`, g.press], ['its power fired', g.power]);
    if (D.finisher) need.push(['the counter was the Finishing Blow', g.finisher]);
    if (D.finisher && D.kill) need.push(['its cuts were lethal', g.lethal]);
    if (D.kill) need.push(['the boss fell', g.kill], ['before the title', g.kill && g.killAt <= SHOWCASE.title.dark * beatS()]);
    return { id: D.id, kind: D.kind, ok: need.every(n => n[1]), need: need.map(([what, ok]) => ({ what, ok: !!ok })),
      dodges: g.dodges.size, parries: g.parries.size, hits: b.hits, hurt: g.hurt, window: !!b.sawWindow, swung: !!b.counterPressed };
  }

  // ---- the fights -------------------------------------------------------------------------------
  function makeBoss(f, i) {
    const S = SHOWCASE, def = ENEMY_BY_ID[f.boss], B = CONFIG.enemy.press;
    const e = i === 0 && Game.enemies[0] && Game.enemies[0].baseDef === def ? Game.enemies[0]
      : new Enemy(def, { x: 0, y: 0, z: 0, behavior: 'arena', notice: CONFIG.notice.arena });
    const k = e.phaseIds ? e.phaseIds.indexOf(f.phase) : -1;
    if (k > 0) e.enterPhase(k);
    e.opener = null;   // the script sets its first move
    // Boss Rush's pace after `won` fights, under its modifiers (as server/simulation.js setRushFight sets them)
    const mods = S.pace.modifiers.map(id => RUSH_MODIFIER_BY_ID[id]), times = key => mods.reduce((n, m) => n * (m[key] || 1), 1);
    e.pace = rushPace(S.pace.won) * times('pace'); e.rest = B.rest * times('rest'); e.chain = B.chain * times('chain');
    e.breakGrow = CONFIG.endless.breakGrow; e.kin = [e];
    e.hp = Math.round(e.def.hp * f.health);
    e.cracks = f.cracks || 0; e.crackTime = 0; e.crackBy = null;   // its guard as the fight is joined (js/finisher.js)
    if (i > 0) e.rig.root.visible = e.rig.shadow.visible = false;
    return e;
  }
  // ---- the grounds ------------------------------------------------------------------------------
  // A fight's `ground` (pass 164): a level whose boss room it is fought in (read only: its first boss's spawn, where the
  // boss stands facing the way it waits), or the Arena. Each is built once at play (behind the loading screen) so a cut
  // to it later rebuilds a stage already warmed.
  // A boss room is fought as Boss Rush fights in one (js/lobby-sim.js): with the Arena's full tracking. One such level
  // per ground, kept, so a ground is known by identity.
  const roomOf = new Map();
  function groundOf(f) {
    const R = !f.ground || f.ground === 'arena' ? ARENA : ALL_LEVELS.find(l => l.id === f.ground) || ARENA;
    if (R !== ARENA && !roomOf.has(R.id)) roomOf.set(R.id, { ...R, fullTracking: ARENA.fullTracking });
    const L = R === ARENA ? ARENA : roomOf.get(R.id);
    if (L === ARENA) return { level: L, x: null };
    let spot = null;
    for (const g of L.gated || []) for (const m of g.enemies || [g]) {
      const d = ENEMY_BY_ID[m.enemy];
      if (!spot && m.spawn && (m.arena || (d && isBossDef(d)))) spot = m.spawn;
    }
    const s = spot || L.playerStart || L.start;
    return { level: L, x: s.x, y: s.y || 0, z: s.z, yaw: spot ? s.yaw ?? -Math.PI / 2 : (s.yaw ?? Math.PI / 2) + Math.PI };
  }
  function enterGround(L) {
    if (Game.level === L && stage && stage.id === L.id) return;
    loadStage(L); world = makeWorld(L, stage); Game.level = L;
  }
  // A new fight starts at a hard cut: both stand facing each other, in the middle of the Arena or in its ground's boss room.
  function stageFight(i) {
    const p = Game.player, e = run.bosses[i], was = run.boss, G = run.grounds[i];
    if (was && was !== e) was.rig.root.visible = was.rig.shadow.visible = false;
    run.fight = i; run.boss = e;
    enterGround(G.level);
    projectiles.clear(); groundFx.clear(); swordTrail.clear(); abilityPowers.reset();
    // The last fight's sparks and star flares (they age in real time, so a freeze would hold them) would glare over the card.
    for (const q of particles) { q.life = 0; q.mesh.visible = false; }
    ultraFx.clear();
    // As far apart as the fight's first string is met at (GAP), so it opens in reach.
    const first = run.beats.find(b => b.fight === i && STRING[b.def.kind]), gap = first ? GAP[first.def.kind] : 2;
    const apart = p.radius + e.radius + gap;
    let ex, ez, yaw;
    if (G.x === null) { ex = ARENA.playerStart.x * 0.5 + apart; ez = 0; yaw = -Math.PI / 2; }
    else { ex = G.x; ez = G.z; yaw = G.yaw; }
    const fx = Math.sin(yaw), fz = Math.cos(yaw), px = ex + fx * apart, pz = ez + fz * apart;
    p.x = px; p.z = pz; p.y = world.floorY(px, pz, G.y ?? 0); p.yaw = yaw + Math.PI; p.vx = p.vz = 0; p.buffer = null; p.riposte = 0; p.savePrev();
    e.x = ex; e.z = ez; e.y = world.floorY(ex, ez, G.y ?? 0); e.yaw = yaw; e.vx = e.vz = 0; e.savePrev();
    e.rig.root.visible = true;
    Game.enemies = [e]; Game.duel = e; Game.duelId = e.baseDef.id;
    Game.setLock(e);
  }

  // ---- the script -------------------------------------------------------------------------------
  // A beat's times are the game's (`land`: its first blow, on the game's clock), so a freeze before it moves it with the show.
  function beatState(D, spans) {
    const keyName = D.key ? ABILITY_KEYS[D.key - 1] : null;
    const fight = SHOWCASE.fights.reduce((k, f, i) => f.from <= D.at ? i : k, 0);
    return { def: D, fight, land: simAt(D.at * beatS(), spans), begun: false, done: false, ends: Infinity, hits: 0, handled: new Set(), side: 1,
      counterId: D.counter ? counterId(D.counter) : null, counterPressed: false, keyName, pressed: false,
      got: { dodges: new Set(), parries: new Set(), counter: false, hurt: 0, press: false, power: false, finisher: false, lethal: false, kill: false, killAt: 0 } };
  }

  const LEAD = { dodge: 0.05, deflect: 0.08 };   // s before a blow lands that the dash or the deflect is pressed
  const GAP = { dodge: 1.5, deflect: 1.1 };      // edge-to-edge m the player waits at for a string
  // The beat that holds the player from game time `t`: one being played, or one about to be (its run-up).
  function holding(t) {
    for (const b of run.beats) if (!b.done && b.fight === run.fight && t >= b.land - (STRING[b.def.kind] ? 2.2 : 1.2)) return b;
    return null;
  }
  const GAP_KEY = 0.6, KEY_WAIT = 4;   // s clear of a string's next blow that a key due in it is pressed in; s it may wait
  // An ability beat's key: pressed on its beat (or as soon after as the player is free and the boss can be hit), again
  // until it takes, for at most KEY_WAIT s; the beat ends 1.2 s after it took.
  function pressKey(b, t, p, hands) {
    if (b.got.press) { if (b.ends === Infinity) b.ends = t + 1.2; }
    else if (t >= b.land + KEY_WAIT) b.done = true;
    else if (t >= b.land && t >= (b.retry || 0) && p.isFree() && pressTarget(p, Game.enemies, Game.lock)) {
      const slot = p.kit.pressed[b.keyName];
      if (slot) { p.perk.charge[b.keyName] = slot.v.charge; hands.press(ABILITY_ACTIONS[b.def.key - 1]); run.keyBeat = b; b.pressed = true; b.retry = t + 0.2; }
    }
    if (t >= b.ends) b.done = true;
  }
  // Presses and movement for one step: the beat's, or the bot's own between beats. On the game's clock.
  function direct(dt) {
    const p = Game.player, e = run.boss, hands = run.brain.hands, t = run.sim;
    const idle = IDLE;
    if (Game.hitstop > 0) return run.mv || idle;   // the game is frozen this step: no clock runs for the hands either
    const b = holding(t);
    if (b !== run.beat) { hands.clear(); run.beat = b; }
    // A key due while a string still holds the fight (the slow motion stretches a string over most of its fight) is
    // pressed in a gap between its blows: none due within GAP_KEY s.
    const k = run.beats.find(x => x.def.kind === 'ability' && !x.done && x.fight === run.fight && t >= x.land);
    if (k && b && k !== b && STRING[b.def.kind] && b.begun && b.handled.size < b.hits) {   // never into the counter after its last blow
      const next = e.attackNo === b.attackNo ? bot.nextBlow(e, p) : null;
      if (!next || next.eta > GAP_KEY) pressKey(k, t, p, hands);
    }
    if (!b) {   // between beats the bot fights on its own, but the number keys are the script's
      const out = run.brain.think(dt, p, Game.enemies.filter(x => x.alive()), [], projectiles.live(), null);
      for (const a of ABILITY_ACTIONS) hands.pressed.delete(a);
      return out.mv;
    }
    hands.tick(dt);
    const dx = e.x - p.x, dz = e.z - p.z, dist = Math.hypot(dx, dz) || 1, ux = dx / dist, uz = dz / dist;
    const edge = dist - p.radius - e.radius, D = b.def;
    if (D.kind === 'ability') {   // the boss gives the moment room
      e.cooldown = Math.max(e.cooldown || 0, 0.6);
      pressKey(b, t, p, hands);
      return idle;
    }
    // A string: walk in to the gap it is met at, the boss holding its own attacks; then it begins, timed so that its
    // first blow lands on the beat.
    if (!b.begun) {
      e.cooldown = Math.max(e.cooldown || 0, 0.3);
      const a = e.attackById(D.attack), lead = a.hits[0].startup / (e.tellRate ? e.tellRate() : 1);
      if (t >= b.land - lead && e.alive() && e.state !== ES.PHASE) {
        e.yaw = Math.atan2(-dx, -dz); e.beginAttack(a); b.begun = true; b.attackNo = e.attackNo; b.hits = e.attack.hits.length; b.ends = t + 6;
        return idle;
      }
      if (edge > GAP[D.kind] + 0.2 && p.isFree()) return walk(ux, uz);
      return idle;
    }
    if (t >= b.ends) { b.done = true; return idle; }
    p.dashes = CONFIG.player.dashCharges;   // a dash for every blow of the string that needs one
    const mine = e.attackNo === b.attackNo && (e.state === ES.WINDUP || e.state === ES.ACTIVE);
    const blow = mine ? bot.nextBlow(e, p) : null;
    if (blow) {
      const key = b.attackNo * 64 + blow.index;
      if (blow.eta > 0.25 && edge > GAP[D.kind] + 0.2 && p.isFree()) return walk(ux, uz);   // still closing in
      const deflect = D.kind === 'deflect' && canParryHit(blow.attack, blow.index);   // a blow a deflect cannot take is dashed
      if (!b.handled.has(key) && blow.eta <= LEAD[deflect ? 'deflect' : 'dodge']) {
        b.handled.add(key);
        if (deflect) { hands.press('parry'); return idle; }
        // Through the string: each dash slips forward past the boss's side, from one side to the other.
        b.side = -b.side; const a = 0.75 * b.side, c = Math.cos(a), s = Math.sin(a);
        hands.press('roll');
        return walk(ux * c + uz * s, -ux * s + uz * c);
      }
    }
    if (b.handled.size >= b.hits && !mine) {   // the string is over: the counter, then the beat is done
      e.cooldown = Math.max(e.cooldown || 0, 0.3);
      if (D.counter && !b.counterPressed) {
        if (D.kill && !D.finisher && e.alive()) e.hp = Math.min(e.hp, 1);   // a plain killing counter
        // A Finishing Blow's beat lasts until its foe falls (the blow runs about 1.2 s), at most 3 s.
        if (p.state === PS.ATTACK && p.attack && p.attack.id === b.counterId) { b.counterPressed = true; b.ends = t + (D.finisher ? 3 : 0.8); return idle; }
        if (p.riposte > 0) {
          b.sawWindow = true;
          if (p.state !== PS.ROLL || p.stateTime > CONFIG.player.rollTime - 0.1) hands.press(D.counter);
          return walk(ux, uz);
        }
        if (b.sawWindow) b.done = true;   // the window shut unused: the beat did not happen (the report says so)
        return idle;
      }
      if (!D.counter || t >= b.ends || (D.kill && b.counterPressed && !e.alive())) b.done = true;
    }
    return D.kind === 'dodge' && p.state === PS.ROLL ? walk(p.vx, p.vz) : idle;
  }

  // ---- cameras ----------------------------------------------------------------------------------
  // A shot keeps the line between the two it had at its cut (so a dash through the boss does not swing it round),
  // turning only by its own `orbit`; where it stands and looks follow the bodies, eased. On the show's clock, so it
  // keeps moving through a freeze.
  function shotAt(t) {
    const cuts = SHOWCASE.cuts, b = t / beatS();
    let i = 0; while (i + 1 < cuts.length && cuts[i + 1].at <= b + 1e-9) i++;
    return i;
  }
  function frameShot(dt) {
    const S = SHOWCASE, i = shotAt(Math.max(0, run.time)), cut = S.cuts[i], sh = S.shots[cut.shot], c = Game.cam, cam = run.cam;
    const p = Game.player, e = run.boss, snap = i !== cam.index;
    if (snap) {
      const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
      cam.index = i; cam.ux = dx / d; cam.uz = dz / d; cam.since = 0;
    } else {
      cam.since += dt;
      if (sh.orbit) { const a = sh.orbit * Math.PI / 180 * dt, ca = Math.cos(a), sa = Math.sin(a), x = cam.ux; cam.ux = x * ca + cam.uz * sa; cam.uz = -x * sa + cam.uz * ca; }
    }
    const k = snap ? 1 : 1 - Math.exp(-(sh.part ? 14 : 5) * dt), lerpTo = (o, key, v) => { o[key] = snap ? v : o[key] + (v - o[key]) * k; };
    if (sh.part) partShot(sh, lerpTo);
    else if (sh.fit) fitShot(sh, lerpTo);
    else {
      const ax = lerp(p.x, e.x, sh.at), az = lerp(p.z, e.z, sh.at), ay = lerp(p.y, e.y, sh.at);
      lerpTo(cam, 'ax', ax); lerpTo(cam, 'az', az); lerpTo(cam, 'ay', ay);
      lerpTo(cam, 'lx', lerp(p.x, e.x, sh.look)); lerpTo(cam, 'lz', lerp(p.z, e.z, sh.look));
      lerpTo(cam, 'ly', lerp(p.y + 1.2, e.y + e.height * 0.8, sh.lookUp));
      const nx = -cam.uz, nz = cam.ux;
      let x = cam.ax - cam.ux * sh.back + nx * sh.side, z = cam.az - cam.uz * sh.back + nz * sh.side, y = cam.ay + sh.up;
      if (sh.push) {   // eased in toward what it looks at, never past half the way
        const tx = cam.lx - x, ty = cam.ly - y, tz = cam.lz - z, d = Math.hypot(tx, ty, tz) || 1, m = Math.min(sh.push * cam.since, d * 0.5) / d;
        x += tx * m; y += ty * m; z += tz * m;
      }
      c.pos.set(x, Math.max(y, cam.ay + 0.3), z);
      c.look.set(cam.lx, cam.ly, cam.lz);
    }
    // The Arena keeps the lens inside its walls; a boss room's shots are framed close enough not to need it.
    const L = Game.level;
    if (L.layout === 'arena') { const mx = (L.halfX || 18) - 0.5, mz = (L.halfZ || 13) - 0.5; c.pos.x = clamp(c.pos.x, -mx, mx); c.pos.z = clamp(c.pos.z, -mz, mz); }
    // A whip pan: the shot arrives swung `whip` degrees off, and snaps onto its subject in 0.12 s.
    if (sh.whip && cam.since < 0.12 && !reducedMotion()) {
      const a = sh.whip * Math.PI / 180 * Math.pow(1 - cam.since / 0.12, 2), ca = Math.cos(a), sa = Math.sin(a), vx = c.look.x - c.pos.x, vz = c.look.z - c.pos.z;
      c.look.x = c.pos.x + vx * ca - vz * sa; c.look.z = c.pos.z + vx * sa + vz * ca;
    }
    if (snap) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); }
    // A crash zoom: the lens opens `zoom` times wider at the cut and slams to the shot's fov in about 0.1 s.
    const calm = reducedMotion();   // no crash zoom, whip or turning roll
    run.fov = sh.fov * (sh.zoom && !calm ? 1 + (sh.zoom - 1) * Math.exp(-cam.since / 0.045) : 1);
    run.roll = (sh.roll || 0) + (calm ? 0 : (sh.spin || 0) * cam.since);
    run.whip = sh.whip && !calm && cam.since < 0.12 ? 1 - cam.since / 0.12 : 0;
  }
  // A card's framing (`fit`): one body (`on`: the boss, or the player) filling `fit` of the frame's height, seen from
  // its side of the line to the other turned by `turn` degrees, from `up` of its height, looking at `lookUp` of it.
  function fitShot(sh, lerpTo) {
    const c = Game.cam, cam = run.cam, p = Game.player, e = run.boss, who = sh.on === 'player' ? p : e;
    const h = Math.max(1.6, who.height || 1.8), a = sh.turn * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    // From the body toward the other, as the line stood at the cut; turned.
    const sx = who === e ? -cam.ux : cam.ux, sz = who === e ? -cam.uz : cam.uz, rx = sx * ca - sz * sa, rz = sx * sa + sz * ca;
    const d = Math.max(2, h / sh.fit / (2 * Math.tan(sh.fov * Math.PI / 360)) - (sh.push || 0) * cam.since);
    lerpTo(cam, 'lx', who.x); lerpTo(cam, 'lz', who.z); lerpTo(cam, 'ly', who.y + h * sh.lookUp);
    c.pos.set(cam.lx + rx * d, who.y + h * sh.up, cam.lz + rz * d);
    c.look.set(cam.lx, cam.ly, cam.lz);
  }
  // A close-up (`part`): a bone of one body (its head, chest, weapon hand or blade tip) from `dist` m (scaled up with a body taller than a man), turned `turn`
  // degrees off the line toward the other, `rise` m over it, dollied in by `push` m/s (never nearer than 0.4 m).
  // The bone's place is the last drawn frame's (its pose), the body's middle where it has no such bone.
  function partShot(sh, lerpTo) {
    const c = Game.cam, cam = run.cam, p = Game.player, e = run.boss, who = sh.on === 'player' ? p : e, v = scratch.v;
    // 'tip': 1.2 m down the weapon bone (as js/rare-fx.js finds a blade's tip); the rig's own `tip` is the body's pivot.
    const tip = sh.part === 'tip', bone = who.rig && (who.rig[tip ? 'weapon' : sh.part] || who.rig.chest), h = who.height || 1.8;
    // The rig is drawn where the body was last rendered: a body just staged on a new ground is moved there first.
    if (bone) {
      who.rig.root.position.set(who.x, who.y, who.z); bone.updateWorldMatrix(true, false);
      if (tip && bone === who.rig.weapon) v.set(0, 0, 1.2).applyMatrix4(bone.matrixWorld); else bone.getWorldPosition(v);
    }
    if (!bone || !Number.isFinite(v.x + v.y + v.z) || Math.hypot(v.x - who.x, v.z - who.z) > h + 2) v.set(who.x, who.y + h * 0.75, who.z);
    lerpTo(cam, 'lx', v.x); lerpTo(cam, 'ly', v.y); lerpTo(cam, 'lz', v.z);
    const a = sh.turn * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const sx = who === e ? -cam.ux : cam.ux, sz = who === e ? -cam.uz : cam.uz, rx = sx * ca - sz * sa, rz = sx * sa + sz * ca;
    const d = Math.max(0.4, (sh.dist - (sh.push || 0) * cam.since) * Math.max(1, h / 1.8));   // a big body is framed from as far again
    c.pos.set(cam.lx + rx * d, Math.max(who.y + 0.15, cam.ly + (sh.rise || 0)), cam.lz + rz * d);
    c.look.set(cam.lx, cam.ly + (sh.aim || 0), cam.lz);
  }
  // Drawing only: the shot's lens and roll, no lock marker, the ink.
  function drawHook() {
    if (!run) return;
    lockMarker.visible = false;
    // A shot's fov is for a 16:9 screen; a narrower one (a phone held upright) keeps that width of view.
    const wide = 16 / 9, fov = camera.aspect >= wide ? run.fov
      : Math.min(100, 2 * Math.atan(Math.tan(run.fov * Math.PI / 360) * wide / camera.aspect) * 180 / Math.PI);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (run.roll) camera.rotateZ(run.roll * Math.PI / 180);   // a Dutch angle (the camera was just aimed: nothing builds up)
    drawOverlay();
  }
  // ---- the ink: letterbox, freeze cards, speed lines, impact frames, the key cap, the skip cap ----------------------
  const CSS = `
  #showcase{position:fixed;inset:0;z-index:9;pointer-events:none;color:var(--ui-ink);font-family:var(--ui-text);overflow:hidden}
  #showcase.hidden,#showcase .hidden,.sc-page.hidden{display:none}
  .sc-page{position:fixed;inset:0;z-index:8;pointer-events:none}
  #scDuo{backdrop-filter:grayscale(1) contrast(1.45) brightness(1.05);-webkit-backdrop-filter:grayscale(1) contrast(1.45) brightness(1.05)}
  #scDuo.hit{backdrop-filter:grayscale(1) contrast(2.4) brightness(.5);-webkit-backdrop-filter:grayscale(1) contrast(2.4) brightness(.5)}
  #scTint{mix-blend-mode:multiply}
  #showcase .sc-ink{position:absolute;inset:0;width:100%;height:100%}
  #showcase .sc-card{position:absolute;left:clamp(20px,6vw,96px);right:20px;bottom:clamp(70px,19vh,220px);margin:0;transform-origin:0 100%;
    font:700 clamp(34px,6.4vw,120px)/.95 var(--ui-display);letter-spacing:.02em;text-transform:uppercase;color:#f4efe2;text-wrap:balance;opacity:0}
  #showcase .sc-word{position:absolute;inset:0;display:flex;align-items:center;overflow:hidden;opacity:0}
  #showcase .sc-word p{margin:0;transform:skewX(-12deg);transform-origin:0 50%}
  #showcase .sc-word span{display:inline-block;margin-left:4.5vw;font-family:var(--sc-heavy);font-weight:900;line-height:.8;letter-spacing:-.04em;
    text-transform:uppercase;color:#0a0a0c;white-space:nowrap;transform-origin:0 50%}
  #showcase .sc-logo{position:absolute;left:clamp(16px,6vw,110px);top:50%;margin:0;transform:translateY(-58%) skewX(-10deg);font-family:var(--sc-heavy);font-weight:900;
    text-transform:uppercase;line-height:.8;letter-spacing:-.035em}
  #showcase .sc-logo b{display:block;opacity:0;transform-origin:30% 60%;font-weight:900}
  #showcase .sc-logo .l1{font-size:clamp(64px,15.5vw,300px);color:transparent;-webkit-text-stroke:clamp(2px,.35vw,6px) #f7f1e3}
  #showcase .sc-logo .l2{font-size:clamp(64px,15.5vw,300px);color:#f7f1e3;margin-left:.42em}
  #showcase .sc-logo .l3{position:absolute;right:-.62em;bottom:-.34em;font-size:clamp(40px,8.6vw,170px)}
  #showcase .sc-logo .l3 i{display:block;padding:.06em .16em .02em;font-style:normal;color:#0a0a0c;background:var(--sc-red);transform:rotate(-7deg)}
  #showcase .sc-skip{position:absolute;right:clamp(16px,3vw,40px);bottom:clamp(16px,4vh,40px);display:flex;align-items:center;gap:10px;margin:0;padding:6px 10px 6px 6px;
    border:1px solid #ffffff26;border-radius:4px;background:#0a0c0fcc;font:500 var(--ui-size-text)/1 var(--ui-text);color:var(--ui-ink);opacity:0}
  #showcase .sc-skip kbd{display:grid;place-items:center;min-width:38px;height:28px;padding:0 6px;box-sizing:border-box;border:1px solid var(--ui-muted);
    border-bottom-width:3px;border-radius:4px;font:600 13px/1 var(--ui-text);color:var(--ui-ink)}
  #showcase .sc-skip.touch{min-height:44px;padding:0 16px;pointer-events:auto;cursor:pointer}
  #showcase .sc-skip.touch kbd{display:none}
  #showcase .sc-gate{position:absolute;inset:0;background:#05070a;pointer-events:auto;cursor:pointer}
  #showcase .sc-gate h2{position:absolute;left:clamp(20px,5vw,64px);bottom:clamp(64px,16vh,180px);margin:0;font:400 clamp(44px,7.4vw,104px)/1.02 var(--ui-display);color:var(--ui-ink)}
  #showcase .sc-gate p{position:absolute;left:clamp(20px,5vw,64px);bottom:clamp(28px,8vh,96px);margin:0;font:400 var(--ui-size-row)/1.3 var(--ui-text);color:var(--ui-muted)}
`;
  const NAME = 'Combat Arena 3D', INK = '#0a0a0c';
  // The heaviest face the system has, for the kinetic words and the logo (the game ships no font of its own).
  const HEAVY = "'Segoe UI Black','Arial Black','Helvetica Neue',Arial,system-ui,sans-serif";
  // The speed lines, the streaks and the slab's ragged edges: fixed numbers made once (drawn with no allocation per frame).
  const LINES = 96, SLAB = 28, STREAKS = 42;
  const lineA = new Float32Array(LINES), lineW = new Float32Array(LINES), lineR = new Float32Array(LINES);
  const slabTop = new Float32Array(SLAB + 1), slabBot = new Float32Array(SLAB + 1);
  const streakY = new Float32Array(STREAKS), streakL = new Float32Array(STREAKS), streakX = new Float32Array(STREAKS);
  {
    const r = seeded(160);
    for (let i = 0; i < LINES; i++) { lineA[i] = (i + r() * 0.8) / LINES * Math.PI * 2; lineW[i] = 0.004 + r() * 0.016; lineR[i] = r(); }
    for (let i = 0; i <= SLAB; i++) { slabTop[i] = r(); slabBot[i] = r(); }
    for (let i = 0; i < STREAKS; i++) { streakY[i] = r(); streakL[i] = 0.2 + r() * 0.7; streakX[i] = r(); }
  }
  const hash = (i, k) => { let h = (i * 374761393 + k * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; };

  function buildOverlay() {
    if (overlay) return overlay;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    // The duotone and its tint sit on the page itself, next to the game's canvas (inside #showcase's stacking context a
    // blend would only see the overlay).
    const duo = document.createElement('div'); duo.id = 'scDuo'; duo.className = 'sc-page hidden';
    const tint = document.createElement('div'); tint.id = 'scTint'; tint.className = 'sc-page hidden';
    const root = document.createElement('div'); root.id = 'showcase'; root.className = 'hidden'; root.setAttribute('aria-hidden', 'true');
    root.style.setProperty('--sc-heavy', HEAVY);
    root.innerHTML = '<canvas class="sc-ink"></canvas><h2 class="sc-card" translate="no"></h2>' +
      '<div class="sc-word"><p><span translate="no"></span></p></div>' +
      '<h2 class="sc-logo" translate="no"><b class="l1">Combat</b><b class="l2">Arena</b><b class="l3"><i>3D</i></b></h2>' +
      '<p class="sc-skip"><kbd>Esc</kbd><span>Skip</span></p>' +
      '<div class="sc-gate hidden"><h2 translate="no"></h2><p></p></div>';
    document.body.append(duo, tint, root);
    const q = s => root.querySelector(s), ink = q('.sc-ink');
    overlay = { root, duo, tint, ink, g: ink.getContext('2d'), card: q('.sc-card'),
      word: q('.sc-word'), wordText: q('.sc-word span'), logo: q('.sc-logo'), logoParts: [q('.sc-logo .l1'), q('.sc-logo .l2'), q('.sc-logo .l3')],
      skip: q('.sc-skip'), gate: q('.sc-gate'), cardOf: null, wordOf: null, mode: '', tintOf: '', drawn: false };
    overlay.logo.setAttribute('aria-label', NAME);
    overlay.gate.querySelector('h2').textContent = NAME;
    overlay.gate.querySelector('p').textContent = 'Press any key';
    overlay.skip.addEventListener('pointerup', ev => { if (run && run.skippable && overlay.skip.classList.contains('touch') && overlay.skip._qa > 0) { ev.preventDefault(); skip(); } });
    return overlay;
  }
  // The kinetic word under beat `b` (SHOWCASE.words), or null.
  function wordAt(b) {
    for (const w of SHOWCASE.words || []) if (b >= w.at - 1e-9 && b < w.at + w.for - 1e-9) return w;
    return null;
  }
  // What the overlay shows at show time `t`, drawn into its canvas and its few elements (each written only on a change).
  function drawOverlay() {
    const o = overlay, S = SHOWCASE, t = run.time, b = t / beatS(), still = reducedMotion();
    if (!o) return;
    // The skip cap: its first seconds, and again after a key.
    const K = S.skip, showSkip = run.skippable && ((t >= K.from && t < K.from + K.for) || t < run.skipAgain);
    setFade(o.skip, showSkip ? 1 : 0, 0, 1);
    // The title's own beat (pass 164): from title.dark the action is cut away to an empty ink frame; the logo slams in
    // on it alone, part by part, and holds.
    const titled = b >= S.title.dark - 1e-9, w = titled ? null : wordAt(b);
    // The freeze: duotone in the fight's ink, its card slammed in.
    // The fight a freeze belongs to is read from its start, not from run.fight: the drawn clock can be a step ahead of
    // the stepped one, before the fight starting on that beat is staged.
    const f = frozenAt(t), into = f ? t - f.t0 : 0, fight = S.fights[fightAt(f ? f.t0 : t)];
    let impact = false;
    if (!still && !titled && !w) for (const x of S.impacts) if (t >= x * beatS() && t < x * beatS() + 0.07) impact = true;
    const mode = titled ? 'title' : w ? 'word' : impact ? 'impact' : f ? 'duo' : '', inked = mode === 'duo' || mode === 'impact';
    if (mode !== o.mode) {
      o.mode = mode;
      o.duo.classList.toggle('hidden', !inked); o.tint.classList.toggle('hidden', !inked); o.duo.classList.toggle('hit', mode === 'impact');
    }
    if (inked && fight.ink !== o.tintOf) { o.tintOf = fight.ink; o.tint.style.background = fight.ink; }
    const card = f && f.def.card === 'boss' && !w ? f.def : null;
    if (card !== o.cardOf) { o.cardOf = card; if (card) o.card.textContent = ENEMY_BY_ID[fight.boss].name; }
    // A card lands 0.04 s into the freeze, from 1.3 times its size, in a tenth of a second (a fade when still).
    const land = card ? clamp((into - 0.04) / 0.1, 0, 1) : 0;
    setFade(o.card, card ? (still ? clamp(into / 0.2, 0, 1) : land > 0 ? 1 : 0) : 0, 0, still ? 1 : 1 + 0.3 * Math.pow(1 - land, 2));
    // A kinetic word: a field of colour over the whole frame, the word filling its width edge to edge, slammed
    // in from 1.6 times its size in 0.07 s (a fade when still).
    if (w !== o.wordOf) {
      o.wordOf = w;
      if (w) {
        o.wordText.textContent = w.text; o.word.style.background = w.ink;
        // Measured at 100 px, then set to fill 88% of the width (the skew leans it a little further) (its whole word read, edge to edge), at most 0.9 of the height.
        o.wordText.style.fontSize = '100px';
        const wide = o.wordText.offsetWidth || w.text.length * 60;
        o.wordText.style.fontSize = `${Math.round(Math.min(100 * window.innerWidth * 0.88 / wide, window.innerHeight * 0.9))}px`;
      }
    }
    const win = w ? (b - w.at) * beatS() : 0;
    setFade(o.word, w ? (still ? clamp(Math.min(win, w.for * beatS() - win) / 0.12, 0, 1) : 1) : 0, 0, 1);
    setFade(o.wordText, w ? 1 : 0, 0, still || !w ? 1 : 1 + 0.6 * Math.pow(1 - clamp(win / 0.07, 0, 1), 2));
    // The logo: each part on its own half beat from title.at.
    const tin = (b - S.title.at) * beatS();
    for (let i = 0; i < 3; i++) {
      const at = i * 0.5 * beatS(), u = titled ? tin - at : -1, l = clamp(u / 0.08, 0, 1);
      setFade(o.logoParts[i], u < 0 ? 0 : still ? clamp(u / 0.2, 0, 1) : 1, 0, still || u < 0 ? 1 : 1 + (i === 2 ? 1.4 : 0.7) * Math.pow(1 - l, 2));
    }
    drawInk(o, t, b, f, into, impact, still, titled ? tin : null, w);
  }
  // The canvas: the cold open's letterbox, a freeze's speed lines and slab, an impact's lines, a whip pan's streaks,
  // the title's frame.
  function drawInk(o, t, b, f, into, impact, still, title, word) {
    const S = SHOWCASE, c = o.ink, g = o.g, W = window.innerWidth, H = window.innerHeight;
    const bars = b < S.bars, whip = run.whip > 0 && !f;
    if (!bars && !f && !impact && title === null && !whip && !word) { if (o.drawn) { g.clearRect(0, 0, c.width, c.height); o.drawn = false; } return; }
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    g.clearRect(0, 0, W, H); o.drawn = true;
    if (title !== null) { drawTitle(o, g, W, H, title, still); return; }
    if (word) { drawRays(g, W, H, W * 0.5, H * 0.5, INK, 0.22, still ? 0 : Math.floor(t * 20)); return; }
    if (whip) {   // a whip pan: ink streaks across the frame, thinning as the shot settles
      g.fillStyle = INK; g.globalAlpha = 0.75 * run.whip;
      for (let i = 0; i < STREAKS; i++) { const y = streakY[i] * H, l = streakL[i] * W, x = (streakX[i] * 1.4 - 0.2) * W - l * 0.5; g.fillRect(x, y, l, 1 + streakL[i] * 5); }
      g.globalAlpha = 1;
    }
    if (f || impact) {
      // Speed lines toward the boss's chest on screen (or the middle), redrawn every 0.05 s (still: once).
      const e = run.boss, v = scratch.v.set(e.x, e.y + e.height * 0.7, e.z).project(camera);
      const fx = clamp((v.x * 0.5 + 0.5) * W, W * 0.25, W * 0.75), fy = clamp((-v.y * 0.5 + 0.5) * H, H * 0.25, H * 0.7);
      drawRays(g, W, H, fx, fy, impact ? INK : '#0b0b0de0', 0.36, still ? 0 : Math.floor(t * 20));
    }
    if (f && f.def.card === 'boss') {
      // The ink slab under the name: a skewed band with ragged ends, swept in from the left in 0.12 s.
      const el = o.card, top = el.offsetTop, h = el.offsetHeight;
      const sweep = still ? 1 : clamp(into / 0.12, 0, 1), x1 = W * (0.12 + 0.98 * (1 - Math.pow(1 - sweep, 3))), pad = h * 0.28;
      slab(g, x1, top - pad, top + h + pad * 0.8, pad, H * 0.03, '#0a0a0c');
      g.fillStyle = S.fights[fightAt(f.t0)].ink;   // the accent: a thin stroke along its top edge
      g.fillRect(0, top - pad + H * 0.015 - 6, x1 * 0.82, 5);
    }
    if (bars) {   // the letterbox, snapping open on its beat
      const k = clamp((S.bars - b) * beatS() / 0.08, 0, 1), bh = H * 0.12 * (still ? 1 : k > 0.999 ? 1 : k);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh);
    }
  }
  // Radial speed lines toward (fx, fy), leaving a clear disc of `clear` of the frame's short side.
  function drawRays(g, W, H, fx, fy, color, clear, tick) {
    const R = Math.hypot(W, H), r0 = Math.min(W, H) * clear;
    g.fillStyle = color; g.beginPath();
    for (let i = 0; i < LINES; i++) {
      const h = hash(i, tick), a = lineA[i] + (h - 0.5) * 0.03, w = lineW[i] * (0.6 + h), r = r0 * (0.85 + 0.9 * lineR[i] * (0.5 + h));
      g.moveTo(fx + Math.cos(a - w) * R, fy + Math.sin(a - w) * R);
      g.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
      g.lineTo(fx + Math.cos(a + w) * R, fy + Math.sin(a + w) * R);
    }
    g.fill();
  }
  // A skewed band with ragged ends from the left edge to x1, between y0 and y1.
  function slab(g, x1, y0, y1, pad, skew, color) {
    g.fillStyle = color; g.beginPath(); g.moveTo(-10, y0 + skew);
    for (let i = 0; i <= SLAB; i++) { const u = i / SLAB; g.lineTo(-10 + (x1 + 10) * u, y0 + skew * (1 - u) + (slabTop[i] - 0.5) * pad * 0.35); }
    for (let i = SLAB; i >= 0; i--) { const u = i / SLAB; g.lineTo(-10 + (x1 + 10) * u - (i === SLAB ? pad * (0.5 + slabBot[i]) : 0), y1 + skew * (1 - u) * 0.4 + (slabBot[i] - 0.5) * pad * 0.35); }
    g.closePath(); g.fill();
  }
  // The title's frame: ink over the whole picture (the action cut away). As the logo lands, rays of the last fight's
  // colour close in on it and a ragged band of it sweeps in under its second line; they move only through the slam,
  // then hold. `tin`: s since title.at (negative before it).
  function drawTitle(o, g, W, H, tin, still) {
    const S = SHOWCASE, ink = S.fights[S.fights.length - 1].ink;
    g.fillStyle = '#08080a'; g.fillRect(0, 0, W, H);
    if (tin < 0) return;
    const logo = o.logo, l2 = o.logoParts[1], top = logo.offsetTop + l2.offsetTop - logo.offsetHeight * 0.58, h = l2.offsetHeight;
    g.globalAlpha = 0.45;
    drawRays(g, W, H, W * 0.42, top + h * 0.2, ink, 0.4, still ? 0 : Math.min(8, Math.floor(tin * 20)));
    g.globalAlpha = 1;
    const sweep = still ? 1 : clamp((tin - 0.25 * beatS()) / 0.1, 0, 1);
    if (sweep > 0) slab(g, W * (0.05 + 1.0 * (1 - Math.pow(1 - sweep, 3))), top + h * 0.35, top + h * 1.12, h * 0.25, H * 0.03, ink);
  }
  // The fight in play at show time `t`.
  function fightAt(t) {
    const F = SHOWCASE.fights; let i = 0;
    while (i + 1 < F.length && t >= F[i + 1].from * beatS() - 1e-9) i++;
    return i;
  }
  // An element's opacity, drop (px) and scale, written only when one moves by a visible step.
  function setFade(el, a, y, s) {
    const qa = Math.round(a * 100), qy = Math.round(y * 4), qs = Math.round(s * 100);
    if (el._qa === qa && el._qy === qy && el._qs === qs) return;
    el._qa = qa; el._qy = qy; el._qs = qs;
    el.style.opacity = String(qa / 100);
    el.style.transform = qy || qs !== 100 ? `translateY(${qy / 4}px) scale(${qs / 100})` : '';
  }
  function resetOverlay() {
    const o = buildOverlay();
    o.cardOf = null; o.wordOf = null; o.mode = ''; o.drawn = false;
    for (const el of [o.card, o.skip, o.word, o.wordText, ...o.logoParts]) setFade(el, 0, 0, 1);
    o.root.style.setProperty('--sc-red', SHOWCASE.fights[SHOWCASE.fights.length - 1].ink);
    o.duo.classList.add('hidden'); o.tint.classList.add('hidden');
    o.g.clearRect(0, 0, o.ink.width, o.ink.height);
    let touch = false; try { touch = matchMedia('(pointer: coarse)').matches; } catch (e) { /* no media queries: keys */ }
    o.skip.classList.toggle('touch', touch);
  }

  // ---- holding the controls ---------------------------------------------------------------------
  const PASS = new Set(['F5', 'F11', 'F12']);
  let waiting = false;   // a first launch waiting for the page to load: the hidden title takes no input either
  let escHeld = false;   // the Esc that skipped is still down: its repeats and its release are the show's, not the next screen's
  const swallow = ev => {
    if (escHeld && ev.code === 'Escape' && (ev.type === 'keydown' || ev.type === 'keyup')) {
      if (ev.type === 'keyup') escHeld = false;
      ev.stopImmediatePropagation(); if (ev.cancelable) ev.preventDefault(); return;
    }
    if (!run && !waiting) return;
    if (ev.type === 'keydown' || ev.type === 'keyup') { if (ev.ctrlKey || ev.metaKey || ev.altKey || PASS.has(ev.code)) return; }
    ev.stopImmediatePropagation(); if (ev.cancelable) ev.preventDefault();
    if (run && run.skippable && ev.type === 'keydown' && ev.code === 'Escape') { escHeld = true; skip(); }
    else if (run && run.skippable && (ev.type === 'keydown' || ev.type === 'mousedown' || ev.type === 'pointerdown')) run.skipAgain = run.time + SHOWCASE.skip.again;   // another key or a tap: the cap says how
  };
  for (const type of ['keydown', 'keyup', 'mousedown', 'pointerdown', 'wheel', 'contextmenu'])
    window.addEventListener(type, swallow, { capture: true, passive: false });
  function skip() {
    if (!run || !run.skippable) return false;
    finish(false, null, true);
    return true;
  }

  // ---- running it -------------------------------------------------------------------------------
  function play(opts = {}) {
    if (run || (typeof multiplayer !== 'undefined' && multiplayer.active())) return false;
    const S = SHOWCASE, real = { hints: readKey(CONFIG.hints.storageKey), update: Game.update, moveInput: Game.moveInput, pause: Game.pause, requestRestart: Game.requestRestart,
      manualClock: Game.manualClock, random: Math.random };
    if (!hooked) { Game.renderHooks.push(drawHook); hooked = true; }
    resetOverlay();
    const rng = sharedRandom, brainRng = seeded(S.seed ^ 0x5bd1e995), spans = freezeSpans(); shared.s = S.seed >>> 0;
    run = { real, rng, manual: !!opts.manual, onEnd: opts.onEnd || null, toMenu: opts.toMenu !== false, skippable: opts.skippable !== false, skipAgain: -1, keyBeat: null,
      time: -S.preroll, sim: -S.preroll, target: -S.preroll, live: false, freezes: spans, frozen: null,
      beats: S.beats.map(D => beatState(D, spans)), beat: null, bosses: [], boss: null, fight: -1, cam: { index: -1 }, fov: CONFIG.camera.fov, music: null, mv: null,
      acc: 0, ramp: null, roll: 0, whip: 0, grounds: S.fights.map(groundOf) };
    try {
      Math.random = rng;
      Game.kind = 'arena'; Game.story = false; Game.duelId = S.fights[0].boss; Game.duelPartners = []; Game.practiceWon = 0; Game.level = ARENA;
      Game.manualClock = true; Game.loading = 0;
      Game.enterPlay(); Game.reset();
      // Every fight's ground built once now, the first last, so cutting to one later only rebuilds what is warm.
      for (const G of [...new Set(run.grounds.map(g => g.level))].reverse()) if (G !== ARENA) { enterGround(G); visuals.warmUp(Game.cam); }
      shared.s = S.seed >>> 0;   // whatever the builds drew, the show starts on its own seed
      hud.root.classList.add('hidden'); $('loading').classList.remove('show');
      const p = Game.player;
      p.grantAbilities(S.kit);
      run.brain = bot.create(BOT_PROFILES.find(x => x.id === S.profile), brainRng);
      p.ctl = run.brain.hands;
      run.bosses = S.fights.map(makeBoss);
      Game.enemies = run.bosses.slice(); visuals.warmUp(Game.cam);   // every boss drawn once now, not at its fight's cut
      Game.pause = () => {}; Game.requestRestart = () => {};
      real.glare = dampGlare();
      Game.moveInput = () => run.mv || IDLE;
      Math.random = real.random;
      stageFight(0);
      overlay.root.classList.remove('hidden'); fpsShown(false);
      // The preroll: the fight already under way when the first frame is drawn, silently (a boss mid-combo).
      const ctx = audio.ctx; audio.ctx = null;
      try { run.live = true; while (run.time < -1e-9) step(); } finally { audio.ctx = ctx; }
      run.time = run.sim = run.target = 0;
      frameShot(0);
      if (run.manual) startMusic();
      else {
        // The first frame is drawn now and the clock and music start two frames later: drawing the cast for the first
        // time (shaders, uploads) takes long, and a clock already running would race to catch it up.
        const r = run;
        Game.manualClock = false;
        try { Game.render(0, 0); } finally { Game.manualClock = true; }
        requestAnimationFrame(() => requestAnimationFrame(now => {
          if (run !== r) return;
          startMusic(); run.started = now; run.lastNow = now; run.shift = 0;
          requestAnimationFrame(tick);
        }));
      }
    } catch (err) { warnOnce(`Showcase failed to start: ${err && err.message}`); finish(true, err); return false; }
    return true;
  }
  // The show's own light (the judge, pass 164: 'white glare, blown-out flashes'): a softer bloom that takes only the
  // brightest light, screen flashes cut down, and none of the game's white impact frames. Returns what puts it back.
  function dampGlare() {
    const G = SHOWCASE.glare, b = typeof visuals !== 'undefined' && visuals.passes ? visuals.passes.bloom : null;
    const was = b ? { strength: b.strength, threshold: b.threshold } : null;
    if (b) { b.strength = was.strength * G.bloom; b.threshold = Math.max(was.threshold, G.threshold); }
    const pulse = typeof ultraPost !== 'undefined' ? ultraPost.pulse : null, hit = typeof impactFrame !== 'undefined' ? impactFrame.hit : null;
    if (pulse) ultraPost.pulse = (o = {}) => pulse.call(ultraPost, Object.assign({}, o, { flash: (o.flash || 0) * G.flash }));
    if (hit) impactFrame.hit = () => false;
    return () => { if (b) { b.strength = was.strength; b.threshold = was.threshold; } if (pulse) ultraPost.pulse = pulse; if (hit) impactFrame.hit = hit; };
  }
  function readKey(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeKey(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* this window keeps none */ } }
  // The FPS counter (js/hud.js) is no part of the show.
  function fpsShown(on) { const f = document.getElementById('fpsCounter'); if (f) f.style.visibility = on ? '' : 'hidden'; }
  function startMusic() {
    const c = audio.ctx;
    if (!c || (c.state !== 'running' && !audio.offline) || typeof showcaseMusic === 'undefined') return;
    run.music = showcaseMusic.start(audio, c.currentTime, beatS());
  }
  // One fixed step of the show: the director's presses, the game's own step on the seeded random, then the camera.
  // Through a freeze only the show's clock and the camera move.
  // A fight is staged on the step its beat is reached, before that step's frame is drawn (a card on its first beat
  // shows its own boss) and before the next step plays it.
  function nextFight() { const next = fightAt(run.time); if (next > run.fight) stageFight(next); }
  function step() {
    const dt = STEP(), p = Game.player, S = SHOWCASE, c = Game.cam;
    const f = run.time >= 0 ? frozenAt(run.time) : null;
    if (f) {
      // Held where they stand, not between two steps; a shake (drawing only) would judder the held frame.
      if (run.frozen !== f) { run.frozen = f; p.savePrev(); for (const e of Game.enemies) e.savePrev(); Game.shake = 0; }
      c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
      run.time += dt;
      nextFight();
      frameShot(dt);
      return;
    }
    run.frozen = null;
    // Slow motion: the show's clock runs on, the game steps only as often as the ramp's speed lets it.
    const r = run.time >= 0 ? rampAt(run.time) : null;
    run.ramp = r;
    if (r) {
      run.acc += dt * r.speed;
      if (run.acc < dt - 1e-9) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); run.time += dt; nextFight(); frameShot(dt); c.prevPos.copy(c.pos); c.prevLook.copy(c.look); return; }
      run.acc -= dt;
    } else run.acc = 0;
    const e = run.boss;
    run.mv = direct(dt);
    Game.setLock(run.boss);
    shared.s = (SHOWCASE.seed + Math.round(run.sim / dt) * 0x9e3779b9) >>> 0; Math.random = run.rng;
    try { run.real.update.call(Game, dt); } finally { Math.random = run.real.random; }
    // Nobody falls but the finale's boss: the player is topped up, the boss kept off its last sliver. Held in its
    // Finishing Blow, the finale's boss is on that sliver, so the cuts end it.
    if (p.alive()) p.hp = p.maxHp;
    const b = run.beat, ending = b && b.def.kill, blow = e.exec && e.state === ES.EXECUTED;
    if (blow && ending && b.def.finisher && !e.exec.impact) e.hp = Math.min(e.hp, 1);
    else if (e.alive() && !ending && !blow) e.hp = Math.max(e.hp, Math.round(e.def.hp * 0.12));
    run.time += dt; run.sim += dt;
    nextFight();
    frameShot(dt);
    if (r) { c.prevPos.copy(c.pos); c.prevLook.copy(c.look); }   // in slow motion the lens moves on the show's clock, unblended
  }
  // The clock: the music's own (audio time) when it plays, else the wall clock. A short hitch catches up over a few
  // frames (with music, so the cuts stay on the beat); a stall (the tab hidden, a long hang) is not caught up at all:
  // the clock is moved on by it (`shift`), so the show resumes at its own speed instead of racing through what it missed.
  const STALL = { music: 1, wall: 0.25 };   // s behind: a stall, not a hitch
  function tick(now) {
    if (!run || run.manual) return;
    requestAnimationFrame(tick);
    const frameDt = Math.min(0.25, (now - (run.lastNow ?? now)) / 1000); run.lastNow = now;
    const c = audio.ctx, onMusic = !!(run.music && c && c.state === 'running');
    let t = (onMusic ? c.currentTime - run.music.t0 : (now - run.started) / 1000) - run.shift;
    if (t - run.time > (onMusic ? STALL.music : STALL.wall)) { run.shift += t - run.time - STEP(); t = run.time + STEP(); }
    advance(t, frameDt, true);
  }
  function frame(dt, opts = {}) {
    if (!run || !run.manual) return false;
    advance(run.target + dt, dt, opts.render !== false);
    return !!run;
  }
  function advance(target, frameDt, render) {
    try {
      run.target = target;
      let n = 0;
      while (run.time + STEP() <= run.target + 1e-9 && n < CONFIG.maxSteps) { step(); n++; }
      if (run.time + STEP() <= run.target) run.target = run.time;   // a stalled tab: drop the backlog
      if (run.music) run.music.pump(audio.ctx.currentTime);
      if (run.time >= SHOWCASE.length * beatS() - 1e-6) { finish(); return; }
      if (render) {   // live, the effects' clock (js/effect-slots.js) runs on the frame's real time, as in play
        // Through a freeze the drawing clock stands still too: no particle, flame or swing moves.
        const still = !!run.frozen;
        if (!run.manual || still) Game.manualClock = false;
        // In slow motion the bodies are drawn between their last two steps by how far the next one has come.
        const r = run.ramp, part = clamp((run.target - run.time) / STEP(), 0, 1), alpha = r ? clamp(run.acc / STEP() + part * r.speed, 0, 1) : part;
        try { Game.render(alpha, still ? 0 : frameDt * (r ? r.speed : 1)); } finally { if (run) Game.manualClock = true; }
      }
    } catch (err) { warnOnce(`Showcase stopped: ${err && err.message}`); finish(true, err); }
  }
  // The end: the beats judged, the game's own controls back, the title screen (the music's last chord rings on; a
  // skip fades it out).
  function finish(failed = false, err = null, skipped = false) {
    if (!run) return;
    const r = run, real = r.real;
    last = { beats: r.beats.map(verdict), failed, skipped, time: r.time, error: err ? `${err.message} ${(err.stack || '').split('\n').slice(1, 3).join(' ')}` : null };
    run = null;
    // The bot's moves are not the player's: the in-world hints it counted as learned are given back (js/world-hints.js).
    writeKey(CONFIG.hints.storageKey, real.hints); if (typeof worldHints !== 'undefined') worldHints.reload();
    if (typeof dodgeMoment !== 'undefined') dodgeMoment.scale(1);   // a counter's slow motion opened in the show ends with it
    if (typeof impactFrame !== 'undefined') impactFrame.clear();   // an ultimate's dim or white frame ends with it
    if (failed || skipped) {   // cut short: whatever was in flight goes with it
      projectiles.clear(); groundFx.clear(); swordTrail.clear(); abilityPowers.reset(); ultraFx.clear();
      for (const q of particles) { q.life = 0; q.mesh.visible = false; }
    }
    Game.update = real.update; Game.moveInput = real.moveInput; Game.pause = real.pause; Game.requestRestart = real.requestRestart;
    Game.manualClock = real.manualClock; Math.random = real.random;
    if (real.glare) real.glare();
    if (Game.level !== ARENA || !stage || stage.id !== ARENA.id) { try { enterGround(ARENA); } catch (e2) { warnOnce(`Showcase: the Arena did not come back: ${e2 && e2.message}`); } }
    if (r.music && (failed || skipped)) r.music.stop();
    if (camera.fov !== CONFIG.camera.fov) { camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); }
    for (const e of r.bosses) if (!Game.enemies.includes(e)) e.rig.dispose();
    if (overlay) overlay.root.classList.add('hidden');
    fpsShown(true);
    resetOverlay();
    if (r.toMenu) Game.showMenu('main');
    if (r.onEnd) r.onEnd(last);
  }

  // ---- at launch ---------------------------------------------------------------------------------
  // Every player sees it after each update (PLAN.md "The showcase", Aleix 2026-11-15): a launch on a version it has not
  // played for yet plays it, unless it played less than SHOWCASE.again hours ago. The save keeps the version and the
  // time it last played; '1' is the save from before (seen once, version unknown). With storage blocked it plays once
  // per page load at most. Never into a lobby or a run under way: that launch leaves the save alone, so the next plays it.
  // Browsers start sound only after a key or a click, so unless the page may already play sound, the game's name waits
  // for one first. Automated browsers (tests) never see it at launch. A save time ahead of the clock (a clock set
  // back) counts as long ago. Only the first ('first') cannot be skipped (Aleix, 2026-11-21).
  const thisLoad = { played: false };
  function claim({ version = VERSION, now = Date.now(), load = thisLoad } = {}) {
    if (Game.mode !== 'menu' || run || waiting || (typeof multiplayer !== 'undefined' && (multiplayer.connected || multiplayer.active()))) return false;
    let last, raw;
    try {
      raw = localStorage.getItem(SEEN_KEY);
      try { last = raw ? JSON.parse(raw) : null; } catch (e) { last = null; }
      if (raw && (!last || typeof last !== 'object')) last = { version: null, at: 0 };   // '1', or anything unreadable
    } catch (e) {   // storage blocked
      if (load.played) return false;
      load.played = true; return 'update';   // nothing known of this player: not taken for a new one
    }
    const age = last ? now - (Number(last.at) || 0) : Infinity;
    if (last && (last.version === version || (age >= 0 && age < SHOWCASE.again * 3600 * 1000))) return false;
    try { localStorage.setItem(SEEN_KEY, JSON.stringify({ version, at: now })); } catch (e) { load.played = true; }
    return raw ? 'update' : 'first';
  }
  // `then`: what follows it (the sparring scene); the title when there is none. Returns whether it is under way.
  let gateGo = null;
  // The controller (js/gamepad.js), before its menus: a button at the gate starts the show; while either shows, the pad
  // does nothing else (the title is hidden behind them), but Start or B skips a show that may be skipped.
  function pad(pressed) {
    if (gateGo) { if (pressed.length) gateGo(null); return true; }
    if (run && run.skippable && pressed.length) {
      if (pressed.includes('PadStart') || pressed.includes('PadB')) { skip(); return true; }   // the press that skipped is used up
      run.skipAgain = run.time + SHOWCASE.skip.again;
    }
    return !!run || waiting;
  }
  function firstLaunch(then = () => Game.showMenu('main')) {
    const why = navigator.webdriver || (typeof DEV !== 'undefined' && DEV) ? false : claim();
    if (!why) return false;
    audio.unlock();
    // `then` once, after the show, or at once if it cannot start. Never before the page has finished loading (its
    // models, textures and fonts): until then the title stays hidden, so the show is the first thing seen.
    // The game's loading screen covers the wait and the show's own setup (seconds on a slow machine), painted before it.
    const show = () => {
      $('menu').classList.add('hidden');
      $('loadName').textContent = ''; $('loadTip').textContent = ''; $('loadPadText').textContent = CONFIG.hud.text.controller;
      $('loading').classList.add('show');
      waiting = true;
      const start = () => requestAnimationFrame(() => requestAnimationFrame(() => {
        waiting = false;
        let ended = false;
        const after = () => { $('loading').classList.remove('show'); then(why === 'first'); };   // a start that failed half-way ends here too
        if (!play({ toMenu: false, skippable: why !== 'first', onEnd: () => { ended = true; after(); } }) && !ended) after();
      }));
      if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
      return true;
    };
    if (audio.ctx && audio.ctx.state === 'running') return show();
    const o = buildOverlay(), gate = o.gate;
    let touch = false; try { touch = matchMedia('(pointer: coarse)').matches; } catch (e) { /* no media queries: keys */ }
    gate.querySelector('p').textContent = touch ? 'Tap anywhere' : 'Press any key';
    o.root.classList.remove('hidden'); gate.classList.remove('hidden'); o.root.removeAttribute('aria-hidden');   // the gate is read out
    $('menu').classList.add('hidden');
    // A key, a click, a tap's end (a browser lets sound start only on those) or a controller button (pad below).
    const GO = ['keydown', 'mousedown', 'pointerup', 'touchend'];
    const go = ev => {
      if (ev && ev.type === 'keydown' && (ev.ctrlKey || ev.metaKey || ev.altKey || PASS.has(ev.code))) return;
      if (ev) { ev.stopImmediatePropagation(); if (ev.cancelable) ev.preventDefault(); }
      for (const t of GO) window.removeEventListener(t, go, true);
      gateGo = null;
      audio.unlock();
      const c = audio.ctx, ready = c && c.state !== 'running' && c.resume ? c.resume() : Promise.resolve();
      Promise.resolve(ready).catch(() => {}).then(() => { gate.classList.add('hidden'); o.root.setAttribute('aria-hidden', 'true'); show(); });
    };
    for (const t of GO) window.addEventListener(t, go, { capture: true, passive: false });
    gateGo = go;
    return true;
  }

  return { play, frame, skip, firstLaunch, pad, stop: () => finish(true), report: () => last, get running() { return !!run; }, get time() { return run ? run.time : null; }, get simTime() { return run ? run.sim : null; },
    get frozen() { return !!(run && run.frozen); }, get skippable() { return !!(run && run.skippable); },
    get beat() { return run && run.beat ? run.beat.def.id : null; }, claim, seenKey: SEEN_KEY };
})();
