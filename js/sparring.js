'use strict';
// ============================================================================
// The sparring scene (pass 97, PLAN.md item 3d): the new combat, played, never watched
// ============================================================================
// In the sparring ring (js/levels/sparring.js) a pale teacher shows each move with its name and key over it, then the
// player does it against the sparring partner: the dash, a perfect dodge, the counter, the string, a finisher, a deflect,
// the riposte, an ability on its number key, a flask drunk on the move (SPARRING_DRILLS, js/data/sparring.js). The
// player's movement and camera stay theirs throughout; the pause menu skips it at any moment.
//
// The teacher is an ordinary Player body (Game.teacher, drawn with the allies) whose presses come from BotHands and the
// drill's script; nothing it does reaches combat (resolveCombat only settles the player's blows). The partner is a
// rooted training enemy that swings only when a drill begins its blow, at the teacher during a demonstration and at the
// player while they try (once they are within `reach`).
//
// When it runs: before a new player's first Story road and first Boss Rush (`before`); offered at launch, up to
// CONFIG.sparring.offers times, to a player with a save from before it until they play it through (`offerAtLaunch`);
// any time from Practice and the lobby's Tutorial button (`start`). Kept per player in CONFIG.sparring.storageKey.
const sparring = (() => {
  const C = () => CONFIG.sparring, $ = id => document.getElementById(id);
  // ---- who has sparred ----------------------------------------------------------------------------------------------
  // { done: played through, seen: started and left (a new player is not sent again), old: had a save when this first
  // ran, offers: launch offers made }.
  let rec = null;
  const keep = () => { try { localStorage.setItem(C().storageKey, JSON.stringify(rec)); } catch (e) { /* this window keeps none */ } };
  function load() {
    if (rec) return rec;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(C().storageKey) || 'null'); } catch (e) { raw = null; }
    if (raw && typeof raw === 'object') {
      rec = { done: !!raw.done, seen: !!raw.seen, old: !!raw.old, offers: Number.isInteger(raw.offers) ? raw.offers : 0 };
      return rec;
    }
    let old = false;   // anything this game kept before (a story, lessons learned, hints, a name online): a player from before
    try {
      for (let i = 0; i < localStorage.length && !old; i++) { const k = localStorage.key(i); old = !!k && ((k.startsWith('combatArena.') && k !== C().storageKey) || k === 'arena.progress'); }
    } catch (e) { old = false; }
    rec = { done: false, seen: false, old, offers: 0 }; keep();
    return rec;
  }
  load();   // at boot, before this session writes anything of its own

  // ---- starting and ending ---------------------------------------------------------------------------------------------
  let pending = null, run = null;
  // opts: { then: what follows the scene (a Story road, the lobby), back: the menu to return to without one }.
  function start(opts = {}) {
    pending = { then: opts.then || null, back: opts.back || 'main' };
    Game.loadingFirst(SPARRING_LEVEL.name, SPARRING_LEVEL.description, () => { Game.story = false; Game.startLevel(SPARRING_LEVEL.id); });
  }
  // Before a new player's first Story road or Boss Rush: the scene first, then `then`. Anyone who has played or left
  // it, or whose save is from before it (they are offered it at launch instead), goes straight on.
  function before(then) {
    const r = load();
    if (r.done || r.seen || r.old) { then(); return; }
    start({ then });
  }
  // The title's first showing: a player from before is offered the scene, up to `offers` launches, until played through.
  let offered = false;
  function offerAtLaunch() {
    const r = load();
    if (offered || r.done || !r.old || r.offers >= C().offers) return false;
    offered = true; r.offers++; keep();
    Game.showMenu('sparOffer');
    return true;
  }
  function finish(played) {
    const r = run; run = null; pending = null;
    load(); rec.seen = true; if (played) rec.done = true; keep();
    events.emit('sparringEnd', { played });
    Game.reset(); Game.showMenu('main');
    if (r && r.then) r.then();
    else if (r && r.back !== 'main') Game.showMenu(r.back);
  }

  // ---- the ring ---------------------------------------------------------------------------------------------------------
  const TEACHER_LOOK = { ...PLAYER_DEF.look, color: 0x8ea3be };
  // Game.reset on the sparring level: a fresh teacher; the drills begin (from start) or carry on (a restart).
  function reset(g) {
    g.teacher = null;
    if (!g.level || !g.level.sparring) { run = null; pending = null; return; }
    if (pending) { run = { ...pending, i: 0, phase: 'show', t: 0, step: 0, move: null, swingT: 0, scratch: { from: null }, last: null }; pending = null; }
    if (!run) return;
    const T = g.level.teacher, y = world.floorY(T.x, T.z, 0);
    run.locked = false;   // the camera locks on the partner again after a restart
    const body = new Player({ ...PLAYER_DEF, name: 'Teacher', look: TEACHER_LOOK }, T.x, T.z, 0, Number.isFinite(y) ? y : 0);
    body.ctl = new BotHands(); body.id = 'sparring-teacher';
    g.teacher = body;
    begin(g, run.i);
  }
  const partner = g => g.enemies.find(e => e.def.id === SPARRING_PARTNER.id && e.alive()) || null;
  const drill = () => run && SPARRING_DRILLS[run.i];
  function begin(g, i) {
    run.i = i; run.phase = 'show'; run.t = 0; run.step = 0; run.move = null; run.swingT = 0; run.scratch = { from: null };
    const D = SPARRING_DRILLS[i], p = g.player, tb = g.teacher;
    if (p && p.alive()) {   // the body made ready: health for the drill, flasks full, the drill's ability in hand
      if (D.ability && !p.kit.pressed[ABILITY_BY_ID[D.ability].key]) p.grantAbilities([D.ability]);
      p.hp = D.hurt ? p.maxHp * D.hurt : p.maxHp; p.lastHp = p.hp;
      const fl = p.inventory && p.inventory.flask; if (fl) fl.count = fl.max;
      if (D.ability) { const key = ABILITY_BY_ID[D.ability].key; p.perk.charge[key] = p.kit.pressed[key].v.charge; }
    }
    if (tb) {   // back on its spot, facing the partner, ready to show it
      const T = g.level.teacher, e = partner(g);
      tb.ctl.clear(); tb.x = T.x; tb.z = T.z; tb.vx = tb.vz = 0;
      if (e) tb.yaw = Math.atan2(e.x - tb.x, e.z - tb.z); else run.face = true;   // the ring not built yet: faced in update
      if (tb.isFree()) tb.setState(PS.IDLE);
      tb.savePrev();
      if (D.ability) {
        if (!tb.kit.pressed[ABILITY_BY_ID[D.ability].key]) tb.grantAbilities([D.ability]);
        const key = ABILITY_BY_ID[D.ability].key; tb.perk.charge[key] = tb.kit.pressed[key].v.charge;
      }
      const fl = tb.inventory && tb.inventory.flask; if (fl) fl.count = fl.max;
    }
  }
  function swingAt(e, body) {
    if (!e || e.state !== ES.IDLE) return false;
    e.yaw = Math.atan2(body.x - e.x, body.z - e.z);
    e.beginAttack(e.def.attacks[0]);
    return true;
  }
  const dirOf = (name, yaw) => name === 'forward' ? { x: Math.sin(yaw), z: Math.cos(yaw), has: true }
    : name === 'left' ? { x: Math.cos(yaw), z: -Math.sin(yaw), has: true } : name === 'right' ? { x: -Math.cos(yaw), z: Math.sin(yaw), has: true }
    : { x: 0, z: 0, has: false };
  // One fixed step (Game.update, after the player and the enemies).
  function update(g, dt) {
    if (!run || !g.level || !g.level.sparring) return;
    const D = drill(), e = partner(g), tb = g.teacher, p = g.player;
    if (e && !run.locked) { run.locked = true; g.setLock(e); }
    if (e && tb && run.face) { run.face = false; tb.yaw = Math.atan2(e.x - tb.x, e.z - tb.z); }   // the camera on the partner from the start; Q frees it
    // The teacher: the demonstration's presses at their moments, its movement relative to facing the partner.
    if (tb && tb.alive()) {
      tb.ctl.tick(dt);
      if (run.phase === 'show') {
        const steps = D.demo.steps;
        while (run.step < steps.length && steps[run.step].at <= run.t) {
          const s = steps[run.step++];
          if (s.press) tb.ctl.press(s.press);
          if ('move' in s) run.move = s.move;
          if (s.swing && !swingAt(e, tb)) { run.step--; run.t -= dt; break; }   // the partner still busy: the demo's clock waits for its blow
        }
      }
      const yaw = e ? Math.atan2(e.x - tb.x, e.z - tb.z) : tb.yaw;
      tb.update(dt, dirOf(run.phase === 'show' ? run.move : null, yaw), e ? [e] : [], e);
    }
    run.t += dt;
    if (!p || !p.alive()) return;
    if (run.phase === 'show') { if (run.t >= D.demo.time) { run.phase = 'do'; run.t = 0; run.scratch = { from: null }; } return; }
    if (run.phase === 'do') {
      if (D.swings && e) {
        // Out of its reach, the partner steps in (it is rooted otherwise), so a player who wandered off still gets the blow.
        const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz);
        if (e.state === ES.IDLE && dist > C().reach - 0.3 + p.radius) {
          const k = Math.min(C().stepIn * dt, dist - (C().reach - 0.4 + p.radius)) / dist;
          e.x += dx * k; e.z += dz * k; e.yaw = Math.atan2(dx, dz);
        }
        run.swingT += dt;
        if (run.swingT >= C().gap && Math.hypot(e.x - p.x, e.z - p.z) <= C().reach + p.radius && swingAt(e, p)) run.swingT = 0;
      }
      if (!D.hurt && p.hp < p.maxHp * 0.5) p.hp = p.maxHp;   // a sparring blow never ends the lesson
      if (p.isFree()) {   // flasks and the drill's ability never run out while it is being learned
        const fl = p.inventory && p.inventory.flask; if (fl && fl.count < 1) fl.count = fl.max;
        if (D.ability) { const key = ABILITY_BY_ID[D.ability].key, k = p.kit.pressed[key]; if (k && !(p.perk.charge[key] >= k.v.charge)) p.perk.charge[key] = k.v.charge; }
      }
      if (D.check && D.check(g, run.scratch)) seal();
      return;
    }
    if (run.phase === 'well' && run.t >= C().well) {
      if (run.i + 1 < SPARRING_DRILLS.length) begin(g, run.i + 1);
      else { run.phase = 'ready'; run.t = 0; }
      return;
    }
    if (run.phase === 'ready' && run.t >= C().ready) finish(true);
  }
  function seal() { run.phase = 'well'; run.t = 0; events.emit('sparringDrill', { drill: drill().id }); }
  events.onAny((type, d) => {
    if (!run || !Game.player) return;
    if (type === 'counterOpen' && d.player === Game.player) run.scratch.from = d.from;
    if (type === 'respawn') run.locked = false;
    const D = drill();
    if (run.phase === 'do' && D && D.on && D.on(type, d, run.scratch, Game)) seal();
  });

  // ---- the card over the figure --------------------------------------------------------------------------------------
  // The drill's name and keys, over the teacher while it shows the move and over the partner while the player tries;
  // sealed once done; a row of marks for the drills. Drawing only.
  let el = null, nameEl = null, keysEl = null, stepsEl = null, drawn = '';
  const v = new THREE.Vector3();
  function fill(D) {
    nameEl.textContent = D ? D.name : 'Ready';
    keysEl.textContent = '';
    const keys = D ? D.keys : [];
    for (let i = 0; i < keys.length; i++) {
      let n = 1; while (keys[i + 1] === keys[i]) { n++; i++; }   // a key pressed again and again: once, times n
      if (keysEl.childNodes.length) keysEl.appendChild(Object.assign(document.createElement('span'), { className: 'spar-then', textContent: '›' }));
      for (const c of lessons.caps(keys[i])) {
        const kb = document.createElement('kbd'); kb.className = `lesson-cap ${c.kind}`; kb.textContent = c.text;
        if (c.title) kb.title = c.title;
        keysEl.appendChild(kb);
      }
      if (n > 1) keysEl.appendChild(Object.assign(document.createElement('span'), { className: 'spar-times', textContent: `×${n}` }));
    }
    stepsEl.textContent = '';
    SPARRING_DRILLS.forEach((x, i) => { const s = document.createElement('span'); s.className = i < run.i || (i === run.i && run.phase !== 'show' && run.phase !== 'do') ? 'on' : i === run.i ? 'now' : ''; stepsEl.appendChild(s); });
  }
  function draw(g) {
    if (!el) { el = $('sparCard'); if (!el) return; nameEl = el.querySelector('.spar-name'); keysEl = el.querySelector('.spar-keys'); stepsEl = el.querySelector('.spar-steps'); }
    const on = !!run && g.mode === 'play' && g.level && g.level.sparring && !(g.loading > 0) && !!g.player;
    if (!on) { if (drawn) { el.classList.remove('show'); drawn = ''; } return; }
    const D = run.phase === 'ready' ? null : drill(), sealed = run.phase === 'well' || run.phase === 'ready';
    const sig = `${run.i}|${run.phase === 'well' ? 'well' : run.phase}|${input.device}|${input.bindings}`;
    if (sig !== drawn) {
      fill(D); drawn = sig;
      el.classList.add('show'); el.classList.toggle('well', sealed); el.classList.toggle('teach', run.phase === 'show');
    }
    // Over the teacher's head while it shows, else over the partner's.
    const body = run.phase === 'show' && g.teacher ? g.teacher : partner(g) || g.player;
    const q = body.rig.root.position;
    v.set(q.x, q.y + (body.height || 1.8) + 0.45, q.z).project(camera);
    if (v.z < -1 || v.z >= 1) { el.style.opacity = '0'; return; }
    el.style.opacity = '';
    const s = (typeof hud !== 'undefined' && hud.scale) || 1;
    // Kept whole on screen: its centre at least half its width from either edge, its top below the top edge.
    const hw = el.offsetWidth * s / 2 + 8, x = Math.min(window.innerWidth - hw, Math.max(hw, (v.x + 1) / 2 * window.innerWidth));
    const y = Math.max(el.offsetHeight * s + 8, (1 - v.y) / 2 * window.innerHeight);
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s})`;
  }
  // The teacher glows a cold pale, so it never reads as a second player.
  const glow = new THREE.Color(0x6f9be0);
  function tint(g) { if (g.teacher && g.teacher.rig) g.teacher.rig.setTint(glow, 0.35); }
  Game.renderHooks.push(tint, draw);

  return {
    start, before, offerAtLaunch, reset, update, load,
    skip() { if (run) finish(false); },
    active: () => !!run,
    // tests: where the scene stands, and the record
    get state() { return run && { drill: drill() && drill().id, i: run.i, phase: run.phase, t: run.t }; },
    get record() { return { ...load() }; },
    // tests: start over as a player with this record (a new one by default), offered nothing yet this launch
    forget(r = { old: false }) { rec = { done: false, seen: false, old: false, offers: 0, ...r }; keep(); offered = false; return load(); },
  };
})();
