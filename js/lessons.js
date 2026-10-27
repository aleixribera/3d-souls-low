'use strict';
// ============================================================================
// Lessons (v7.19.0): the cards that teach the controls inside the levels
// ============================================================================
// A level opts in with `lessons: [{ lesson, when }]` (js/data/lessons.js). This only reads the game and listens to
// events: it never writes to the simulation and never pauses, so it plays the same solo and online, and the server
// never loads it. Its own state: the learned set (kept per player, every access wrapped), this level's plan, the queue
// and the card on screen. update() runs on the fixed step (Game.update), draw() on each frame (a render hook).
const lessons = (() => {
  const L = () => CONFIG.lessons, $ = id => document.getElementById(id);
  const learned = new Set();
  let plan = [];        // this level's entries: { lesson, when, fired }
  let queue = [];       // lesson ids waiting their turn
  let card = null;      // the card on screen: { id, t: { flags, dist, hint }, age, done, hint, hintTimer }
  let shadows = {};     // per lesson heard before its card shows: its own scratch
  let gap = 0, drawn = '', arrow = null;
  function load() {   // what this player has learned, from storage
    learned.clear();
    try { for (const id of JSON.parse(localStorage.getItem(CONFIG.lessons.storageKey) || '[]')) if (LESSONS[id]) learned.add(id); } catch (e) { /* none learned */ }
  }
  load();
  const keep = () => { try { localStorage.setItem(L().storageKey, JSON.stringify([...learned])); } catch (e) { /* this window keeps none */ } };
  const scratch = () => ({ flags: {}, dist: 0, hint: null });

  const enabled = () => settings.lessons !== false;
  // Whether lessons run here: a level that has them, with the option on (the CONTROLS panel steps aside for them).
  const owns = g => enabled() && g.kind === 'level' && !!g.level && !!g.level.lessons;
  function reset(g) {
    plan = owns(g) ? g.level.lessons.map(e => ({ ...e, fired: false })) : [];
    queue = []; card = null; shadows = {}; gap = 0;
  }
  function learn(id) { if (!learned.has(id)) { learned.add(id); keep(); } }

  // ---- triggers ------------------------------------------------------------------------------------------------
  const near = (p, e, range) => Math.hypot(e.x - p.x, e.z - p.z) <= range && Math.abs((e.y || 0) - (p.y || 0)) <= CONFIG.height.reach + 1;
  const awake = e => e.alive() && !e.asleep && !e.npc;
  function fires(w, entry, g) {
    const p = g.player, C = L();
    if ('x' in w) return p.x > w.x;
    if ('zone' in w) {   // standing in its fight (where the player is, not the zone's own state: online the server owns it)
      const z = g.zones.find(z => z.id === w.zone);
      return !!z && !(z.gate && z.gate.open) && (typeof z.trigger === 'number' ? p.x > z.trigger : inArea(z.trigger, p.x, p.z));
    }
    if ('near' in w) { const b = world.bonfires.find(b => b.id === w.near); return !!b && near(p, b, C.nearRange); }
    if ('enemy' in w) return g.enemies.some(e => awake(e) && (e.baseDef || e.def).id === w.enemy && near(p, e, C.seeRange));
    if ('glint' in w) return g.enemies.some(e => awake(e) && e.state === ES.WINDUP && e.attack && near(p, e, C.seeRange)
      && (canParryAttack(e.attack) ? 'red' : 'blue') === w.glint);
    if ('kneel' in w) return g.enemies.some(e => awake(e) && (e.execReady || e.state === ES.BROKEN && near(p, e, C.kneelRange)));
    if ('group' in w) return !!g.lock && g.lockCandidates().length >= w.group;
    if ('hurt' in w) { const f = p.item('flask'); return p.hp < p.maxHp * w.hurt && !!f && f.count > 0 && p.state !== PS.USE_ITEM; }
    if ('after' in w) { const before = plan.find(e => e.lesson === w.after); return !!before && before.fired && learned.has(w.after) && !(card && card.id === w.after); }
    return false;
  }

  // ---- the card --------------------------------------------------------------------------------------------------
  function show(id) { card = { id, t: scratch(), age: 0, done: 0, hint: '', hintTimer: 0 }; queue = queue.filter(q => q !== id); }
  function complete() { learn(card.id); card.done = L().done; events.emit('lessonLearned', { lesson: card.id }); }
  function onEvent(type, d) {
    if (!plan.length) return;
    const g = Game;
    if (!g.player) return;
    if (card && !card.done) {
      const def = LESSONS[card.id];
      if (def.on && def.on(type, d, card.t, g)) complete();
    }
    for (const e of plan) {   // heard before its card: a lesson already done counts as learned
      if (learned.has(e.lesson) || card && card.id === e.lesson) continue;
      const def = LESSONS[e.lesson];
      if (def.on && def.on(type, d, shadows[e.lesson] || (shadows[e.lesson] = scratch()), g)) { learn(e.lesson); queue = queue.filter(q => q !== e.lesson); }
    }
  }
  // Cards wait (their clocks stopped) while the game is not in plain play: menus, loading, death, an execution, help.
  const playing = g => g.mode === 'play' && g.loading <= 0 && !!g.player && g.player.alive() && g.player.state !== PS.EXECUTE && !hud.helpOpen();
  function update(g, dt) {
    if (!plan.length || !owns(g) || !playing(g)) return;
    for (const e of plan) if (!e.fired && fires(e.when, e, g)) { e.fired = true; if (!learned.has(e.lesson) && !queue.includes(e.lesson)) queue.push(e.lesson); }
    queue = queue.filter(id => !learned.has(id));
    if (card) {
      card.age += dt;
      const p = g.player;
      if (p.state !== PS.ROLL) card.t.dist += Math.hypot(p.x - p.px, p.z - p.pz);
      if (card.t.hint) { card.hint = card.t.hint; card.hintTimer = L().hintTime; card.t.hint = null; }
      card.hintTimer = Math.max(0, card.hintTimer - dt);
      if (card.done > 0) { if ((card.done -= dt) <= 0) { card = null; gap = L().gap; } }
      else if (learned.has(card.id)) card.done = L().done;   // learned elsewhere meanwhile
      else {
        const def = LESSONS[card.id];
        if (def.check && def.check(g, card.t)) complete();
        else if (card.age >= L().show) { card = null; gap = L().gap; }   // stepped aside unlearned: it may come again another time
        else { const urgent = queue.find(id => LESSONS[id].urgent); if (urgent && !LESSONS[card.id].urgent) { queue.push(card.id); show(urgent); } }   // the calm card resumes next
      }
    }
    if (gap > 0) gap -= dt;
    // Urgent first, then the newest: the lesson for where the player stands now, before any older one still waiting.
    if (!card && gap <= 0 && queue.length) show(queue.find(id => LESSONS[id].urgent) || queue[queue.length - 1]);
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------
  // Keycaps from the live bindings: the keyboard's first key and its mouse button, or the controller's buttons.
  const NAMES = { move: 'Move', camera: 'Look', block: 'Block', parry: 'Parry', jump: 'Jump', heavy: 'Heavy', light: 'Attack', roll: 'Roll' };
  const FACE = { PadA: 'A', PadB: 'B', PadX: 'X', PadY: 'Y' };
  const cap = label => label.length === 1 ? label.toUpperCase() : label;
  function caps(key) {
    if (key === 'move') return usingPad() ? [{ text: 'Left stick', kind: 'stick' }] : ['up', 'left', 'down', 'right'].map(a => ({ text: cap(keyLabel(ACTIONS[a][0])), kind: 'key' }));
    if (key === 'camera') return [{ text: usingPad() ? 'Right stick' : 'Mouse', kind: usingPad() ? 'stick' : 'mouse' }];
    const codes = ACTIONS[key];
    if (usingPad()) {
      const pad = codes.filter(isPadCode);
      if (key === 'switchTarget') return [{ text: 'Flick right stick', kind: 'stick' }];
      return pad.map(c => FACE[c] ? { text: FACE[c], kind: `face face-${FACE[c].toLowerCase()}`, title: keyLabel(c) } : { text: keyLabel(c), kind: 'pad' });
    }
    const k = codes.find(c => !c.startsWith('Mouse') && !isPadCode(c)), m = codes.find(c => c.startsWith('Mouse'));
    return [...(k ? [{ text: cap(keyLabel(k)), kind: 'key' }] : []), ...(m ? [{ text: keyLabel(m), kind: 'mouse' }] : [])];
  }
  function fill(def) {
    $('lessonTitle').textContent = def.title;
    const keys = $('lessonKeys'); keys.textContent = '';
    def.keys.forEach((k, i) => {
      if (i) { const sep = document.createElement('span'); sep.className = 'lesson-sep'; sep.setAttribute('aria-hidden', 'true'); keys.appendChild(sep); }
      const group = document.createElement('span'); group.className = 'lesson-group';
      if (def.keys.length > 1) { const name = document.createElement('span'); name.className = 'lesson-name'; name.textContent = NAMES[k] || k; group.appendChild(name); }
      for (const c of caps(k)) {
        const el = document.createElement('kbd'); el.className = `lesson-cap ${c.kind}`; el.textContent = c.text;
        if (c.title) el.title = c.title;
        group.appendChild(el);
      }
      keys.appendChild(group);
    });
    $('lessonText').textContent = def.text();
  }
  function draw(g) {
    const box = $('lesson');
    if (!box) return;
    const on = !!card && owns(g) && playing(g), still = reducedMotion();
    const sig = on ? `${card.id}|${input.device}|${card.done > 0}|${card.hintTimer > 0 ? card.hint : ''}|${still}` : '';
    if (sig !== drawn) {
      drawn = sig;
      box.classList.toggle('still', still);   // Camera motion Off or the OS preference: plain fades only
      box.classList.toggle('show', on);
      box.setAttribute('aria-hidden', String(!on));
      if (on) {
        if (box.dataset.lesson !== card.id || box.dataset.device !== input.device) { fill(LESSONS[card.id]); box.dataset.lesson = card.id; box.dataset.device = input.device; restartAnim(box); }
        box.classList.toggle('done', card.done > 0);
        $('lessonHint').textContent = card.hintTimer > 0 ? card.hint : '';
      } else { box.classList.remove('done'); delete box.dataset.lesson; }
    }
    drawArrow(g, on && LESSONS[card.id].arrow ? plan.find(e => e.lesson === card.id) : null);
  }
  const restartAnim = el => { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); };
  // A glowing arrow bobs over the bonfire of a card that names one (`arrow`, its `near` trigger): drawing only.
  function drawArrow(g, entry) {
    const b = entry && entry.when.near && !(card && card.done > 0) ? world.bonfires.find(b => b.id === entry.when.near) : null;
    if (!arrow) {
      if (!b) return;
      const A = L().restArrow, mat = new THREE.MeshBasicMaterial({ color: A.color, transparent: true, opacity: 0.9, depthTest: false });
      const grp = new THREE.Group(), head = new THREE.Mesh(new THREE.ConeGeometry(A.size, A.size * 1.6, 4), mat);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(A.size * 0.35, A.size * 0.35, A.size * 1.4, 6), mat);
      head.rotation.x = Math.PI; shaft.position.y = A.size * 1.5;
      grp.add(head, shaft); grp.renderOrder = head.renderOrder = shaft.renderOrder = 10; grp.userData.shared = true;
      arrow = grp;
    }
    arrow.visible = !!b;
    if (!b) return;
    if (!arrow.parent) scene.add(arrow);   // a level rebuild may have cleared the scene
    const A = L().restArrow, t = performance.now() / 1000;
    const bob = reducedMotion() ? 0 : Math.sin(t * A.bobSpeed) * A.bob;
    arrow.position.set(b.x, world.floorY(b.x, b.z, b.y) + A.height + bob, b.z);
    arrow.rotation.y = reducedMotion() ? 0 : t * 1.5;
  }

  events.onAny(onEvent);
  Game.renderHooks.push(draw);
  return {
    reset, update, owns, load,
    // Options: forget every learned lesson, so they all show again.
    forget() { learned.clear(); keep(); for (const e of plan) e.fired = false; queue = []; card = null; shadows = {}; },
    learned: id => learned.has(id),
    show(id) { if (LESSONS[id]) { show(id); gap = 0; } },   // developer tools and tests: this card, now
    get card() { return card ? { id: card.id, done: card.done > 0, hint: card.hintTimer > 0 ? card.hint : '' } : null; },
    get queue() { return [...queue]; },
  };
})();
