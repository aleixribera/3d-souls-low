'use strict';
// ============================================================================
// Button hints in the world (pass 86, PLAN.md rework item 3b): the player's own key, over the foe, at the moment it is
// needed, so a friend who has never played learns to strike, deflect and dodge in the first minute without a screen.
// ============================================================================
// One keycap and a word beside one foe: Attack (a foe in reach, standing off), Deflect (a red blow in its last moment of
// wind-up), Dodge (a blue one). The key is read from the live bindings each time it shows (a rebind in Controls, or a
// controller picked up, shows at once). Each hint goes for good once the player has done its move CONFIG.hints.learn
// times (kept per player, every access wrapped); the Lessons option turns them all off and "Show lessons again" brings
// them back. It only reads the game and listens to events, on a render hook: the server never loads it.
const worldHints = (() => {
  const H = () => CONFIG.hints, $ = id => document.getElementById(id);
  // kind: what it teaches, the action whose key it shows, the word under it.
  const KINDS = { attack: { action: 'light', word: 'Attack' }, deflect: { action: 'parry', word: 'Deflect' }, dodge: { action: 'roll', word: 'Dodge' } };
  const done = { attack: 0, deflect: 0, dodge: 0 };
  function load() {
    for (const k in done) done[k] = 0;
    try { const s = JSON.parse(localStorage.getItem(H().storageKey) || '{}'); for (const k in done) if (Number.isFinite(s[k])) done[k] = s[k]; } catch (e) { /* none yet */ }
  }
  const keep = () => { try { localStorage.setItem(H().storageKey, JSON.stringify(done)); } catch (e) { /* this window keeps none */ } };
  load();
  const learned = kind => done[kind] >= H().learn;
  function count(kind) { if (!learned(kind)) { done[kind]++; keep(); } }
  const mine = p => typeof Game !== 'undefined' && p === Game.player;
  events.on('strike', d => { if (mine(d.attacker) && d.target && d.target !== d.attacker) count('attack'); });
  events.on('parry', d => { if (mine(d.player)) count('deflect'); });
  events.on('dodge', d => { if (mine(d.player) && !d.projectile) count('dodge'); });

  // The key as a keycap: the keyboard's key (no mouse button: the hint is for a laptop), or the controller's button.
  function keyText(action) {
    const codes = ACTIONS[action];
    if (usingPad()) { const pad = codes.find(isPadCode); return pad ? keyLabel(pad) : ''; }
    const k = codes.find(isKeyCode) || codes[0];
    if (!k) return '';
    const label = keyLabel(k);
    return label.length === 1 ? label.toUpperCase() : label;
  }

  let el = null, capEl = null, wordEl = null, shownKey = '';
  let pickE = null, pickKind = null;   // pick()'s answer, kept here so a frame allocates nothing
  const v = new THREE.Vector3(), right = new THREE.Vector3();
  // The foe and the hint for it this frame, or false. Hints wait, like the lesson cards, outside plain play (menus,
  // loading, death, an execution, help) and in a boss battle the player only watches.
  function pick(game) {
    const p = game.player, C = H();
    if (!p || !p.alive() || game.mode !== 'play' || game.loading > 0 || game.kind === 'bossBattle' || p.state === PS.EXECUTE
      || settings.lessons === false || (typeof hud !== 'undefined' && hud.helpOpen())) return false;
    let bestD = Infinity; pickE = pickKind = null;
    for (const e of game.enemies) {
      if (!e.alive() || !e.awake() || e.asleep || e.npc || e.execReady) continue;   // a kneeling foe has its own cue (Execute)
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (Math.abs((e.y || 0) - (p.y || 0)) > CONFIG.height.reach + 1) continue;
      let kind = null;
      if (e.state === ES.WINDUP && e.attack && d <= C.range) {
        // Online, a blow is this player's only when the foe faces them (the server picks its target among the party).
        if (e.netTarget != null && Math.abs(angDiff(Math.atan2(p.x - e.x, p.z - e.z), e.yaw)) > C.facing) continue;
        // Time to the blow as the bot reads it: a quicker tell late in a Boss Rush, and a held blow's delay.
        const hit = e.attack.hits && e.attack.hits[e.hitIndex];
        const left = hit && Number.isFinite(e.stateTime) ? (hit.startup - e.stateTime) / (e.tellRate ? e.tellRate() : 1) + (e.holdLeft > 0 ? e.holdLeft : 0) : 0;
        if (left <= C.lead) kind = canParryHit(e.attack, e.hitIndex) ? 'deflect' : 'dodge';
      } else if (d <= C.reach && e.state !== ES.ACTIVE && !e.invulnerable()) kind = 'attack';
      if (!kind || learned(kind)) continue;
      const rank = d + (kind === 'attack' ? C.range : 0);   // a blow coming wins over a foe to strike
      if (rank < bestD) { bestD = rank; pickE = e; pickKind = kind; }
    }
    return !!pickE;
  }
  let shownE = null, shownKind = null;
  function hide() { if (shownE) { el.classList.remove('show'); shownE = shownKind = null; } }
  function draw(game) {
    if (!el) { el = $('worldHint'); capEl = $('worldHintKey'); wordEl = $('worldHintWord'); if (!el) return; }
    if (!pick(game)) return hide();
    const K = KINDS[pickKind], key = keyText(K.action);
    if (!key) return hide();
    // Beside the foe at chest height, on the camera's right: clear of its health bar, the lesson card and the boss bar.
    const q = pickE.rig.root.position, side = (pickE.radius || 0.5) + H().side;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    v.set(q.x + right.x * side, q.y + pickE.height * H().height, q.z + right.z * side).project(camera);
    if (v.z < -1 || v.z >= 1) return hide();
    if (shownKind !== pickKind || shownKey !== key) {
      capEl.textContent = key; wordEl.textContent = K.word; el.dataset.kind = pickKind; shownKey = key;
    }
    const w = window.innerWidth, ht = window.innerHeight, s = (typeof hud !== 'undefined' && hud.scale) || 1;
    el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * ht).toFixed(1)}px) translate(0, -50%) scale(${s})`;
    if (!shownE) el.classList.add('show');
    shownE = pickE; shownKind = pickKind;
  }
  Game.renderHooks.push(draw);
  return {
    forget() { for (const k in done) done[k] = 0; keep(); },
    // tests: what shows now ({ kind, key, word } or null) and how many times each move was done
    get shown() { return shownE && { kind: shownKind, key: capEl.textContent, word: wordEl.textContent, enemy: shownE }; },
    get done() { return { ...done }; }, reload: load,
  };
})();
