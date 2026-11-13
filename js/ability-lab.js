'use strict';
// ============================================================================
// The ability grounds (v7.72.0): a level with `abilityLab: true` (js/levels/test-abilities.js) lists every Boss Rush
// ability beside a mannequin. B opens the list and stops the world; a click on an ability turns it on or up a level
// (shift-click or right-click: down), a legendary's Fire sets its power off at once. Closed, a short list of what is
// on stays at the side. Alone only: online, abilities come from the pick (js/multiplayer.js).
// ============================================================================
const abilityLab = (() => {
  const held = new Map();   // ability id -> level on (absent: off); kept across restarts and deaths, until the page closes
  const RARITIES = ['common', 'rare', 'legendary'];
  let root = null, grid = null, worn = null, open = false, owner = null, firing = null;
  const here = game => !!(game.level && game.level.abilityLab) && !(typeof multiplayer !== 'undefined' && multiplayer.active());
  const make = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  // The kit the player wears: each ability's id once per level, as the pick would have given it.
  function ids() {
    const out = [];
    for (const b of ABILITIES) for (let i = 0; i < (held.get(b.id) || 0); i++) out.push(b.id);
    return out;
  }
  function wear() {
    const p = Game.player;
    if (!p) return;
    p.grantAbilities(ids()); abilityPowers.reset(); owner = p;
    p.perk = abilityPerkState(); p.lowReported = false;   // no moon or perk clock carried over from the last kit
    draw();
  }
  function step(b, by) {
    const n = ((held.get(b.id) || 0) + by + b.levels.length + 1) % (b.levels.length + 1);
    if (n) held.set(b.id, n); else held.delete(b.id);
    events.emit('menuAdjust', { dir: by });
    wear();
  }
  // A legendary's power now, on the locked target (or the nearest mannequin), wherever the player stands: as if its
  // moment had come there.
  function fire(b) {
    if (!held.get(b.id)) held.set(b.id, 1);
    wear(); firing = b; close();
  }
  function fireNow(game) {
    const b = firing, p = game.player; firing = null;
    if (!b || !p || !p.alive()) return;
    const pw = p.kit.powers.find(x => x.id === b.id);
    if (!pw) return;
    const live = game.enemies.filter(e => e.alive());
    const e = game.lock && game.lock.alive() ? game.lock : live.sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z))[0];
    const at = e || p, ctx = { x: at.x, y: at.y, z: at.z, enemy: e, action: pw.action };
    if (pw.v.below) p.hp = Math.min(p.hp, Math.max(1, Math.floor(p.maxHp * pw.v.below * 0.9)));   // a power that waits for low health
    abilityPowers.reset();
    abilityPowers.trigger('self', p, p.kit, pw.when, ctx);
  }

  function build() {
    root = make('section'); root.id = 'abilityLab'; root.hidden = true; root.setAttribute('aria-label', 'Abilities');
    const panel = make('div', 'lab-panel'), head = make('div', 'lab-head');
    const title = make('h2', '', 'Abilities'), tools = make('div', 'lab-tools');
    const tool = (label, go) => { const t = make('button', 'ui-text-button', label); t.type = 'button'; t.addEventListener('click', go); return t; };
    tools.append(
      tool('All off', () => { held.clear(); events.emit('menuBack'); wear(); }),
      tool('Heal', () => { const p = Game.player; if (p && p.alive()) { p.hp = p.maxHp; p.stamina = p.maxStamina; } }),
      tool('Low health', () => { const p = Game.player; if (p && p.alive()) p.hp = Math.max(1, Math.floor(p.maxHp * 0.2)); }));
    const shut = make('button', 'ui-button lab-close'); shut.type = 'button';
    shut.append('Back to the fight ', make('kbd', 'ui-key', 'B'));
    shut.addEventListener('click', close);
    tools.appendChild(shut);
    head.append(title, tools);
    grid = make('div', 'lab-grid');
    for (const r of RARITIES) {
      const col = make('div', 'lab-col'); col.dataset.rarity = r;
      col.appendChild(make('h3', '', ABILITY_RARITY_WORD[r]));
      for (const b of ABILITIES.filter(x => x.rarity === r)) {
        const row = make('div', 'lab-row'); row.dataset.ability = b.id; row.dataset.rarity = r;
        const pick = make('button', 'lab-pick'); pick.type = 'button';
        pick.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${ABILITY_ICONS[b.id] || ''}</svg>`;
        const words = make('span', 'lab-words');
        words.append(make('strong', 'lab-name', b.name), make('span', 'lab-marks'), make('span', 'lab-text'));
        pick.appendChild(words);
        pick.addEventListener('click', ev => step(b, ev.shiftKey ? -1 : 1));
        pick.addEventListener('contextmenu', ev => { ev.preventDefault(); step(b, -1); });
        row.appendChild(pick);
        if (b.rarity === 'legendary') {
          const go = make('button', 'ui-button lab-fire', 'Fire'); go.type = 'button'; go.setAttribute('aria-label', `Fire ${b.name}`);
          go.addEventListener('click', () => fire(b));
          row.appendChild(go);
        }
        col.appendChild(row);
      }
      grid.appendChild(col);
    }
    panel.append(head, grid);
    worn = make('div'); worn.id = 'abilityLabWorn'; worn.hidden = true;
    root.appendChild(panel);
    document.body.append(root, worn);
    const style = make('style'); style.id = 'abilityLabStyle';
    style.textContent = `#abilityLab[hidden],#abilityLabWorn[hidden]{display:none}
  #abilityLab{--rare:#8fb8dc;--leg:#e59a5c;--body:#cfc8b6;position:fixed;inset:0;z-index:46;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;
    padding:24px max(16px,env(safe-area-inset-right)) 24px max(16px,env(safe-area-inset-left));background:#080a0ce6;color:var(--ui-ink);font:400 15px/1.45 var(--ui-text)}
  #abilityLab .lab-panel{max-width:1180px;margin:0 auto}
  #abilityLab .lab-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;margin-bottom:18px}
  #abilityLab h2{margin:0;font:400 var(--ui-size-head)/1.1 var(--ui-display)}
  #abilityLab .lab-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
  #abilityLab .lab-close{margin-left:10px}
  #abilityLab .lab-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 22px;align-items:start}
  #abilityLab h3{margin:0 0 8px;padding-bottom:6px;border-bottom:1px solid var(--ui-line);font:500 var(--ui-size-hint)/1.4 var(--ui-text);color:var(--rc)}
  #abilityLab .lab-col{--rc:var(--body)}#abilityLab [data-rarity=rare]{--rc:var(--rare)}#abilityLab [data-rarity=legendary]{--rc:var(--leg)}
  #abilityLab .lab-row{display:flex;align-items:stretch;gap:6px;margin-bottom:4px}
  #abilityLab .lab-pick{all:unset;box-sizing:border-box;flex:1;min-width:0;display:flex;align-items:flex-start;gap:12px;min-height:44px;padding:9px 12px;cursor:pointer;
    border:1px solid transparent;border-left:3px solid transparent;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  #abilityLab .lab-pick svg{flex:none;width:28px;height:28px;margin-top:1px;fill:none;stroke:var(--rc);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;opacity:.55}
  #abilityLab .lab-words{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;min-width:0;flex:1}
  #abilityLab .lab-name{font:400 17px/1.25 var(--ui-display);color:var(--body)}
  #abilityLab .lab-marks{font:600 12px/1.6 var(--ui-text);color:var(--ui-muted);letter-spacing:.06em;white-space:nowrap;font-variant-numeric:tabular-nums}
  #abilityLab .lab-marks b{color:var(--ui-accent-hi)}
  #abilityLab .lab-text{grid-column:1/-1;margin-top:3px;font-size:13px;line-height:1.4;color:var(--ui-muted);text-wrap:pretty}
  #abilityLab .lab-text b{color:var(--ui-ink);font-weight:600;white-space:nowrap}
  #abilityLab .lab-pick:hover{background:var(--ui-hover)}
  #abilityLab .lab-pick:focus-visible{outline:1px solid var(--ui-accent);outline-offset:-1px}
  #abilityLab .lab-pick[aria-pressed=true]{background:var(--ui-accent-wash);border-left-color:var(--rc)}
  #abilityLab .lab-pick[aria-pressed=true] svg{opacity:1}
  #abilityLab .lab-pick[aria-pressed=true] .lab-name{color:var(--ui-ink)}
  #abilityLab .lab-fire{min-height:0;padding:0 14px}
  #abilityLabWorn{position:fixed;right:max(16px,env(safe-area-inset-right));top:96px;z-index:6;max-width:240px;pointer-events:none;
    font:500 13px/1.5 var(--ui-text);color:var(--ui-muted);text-align:right;text-shadow:0 1px 2px #000}
  #abilityLabWorn ul{list-style:none;margin:0 0 6px;padding:0}
  #abilityLabWorn li{color:var(--ui-ink)}#abilityLabWorn li span{color:var(--ui-accent-hi);margin-left:6px}
  @media (max-width:900px){#abilityLab .lab-grid{grid-template-columns:1fr}}
  @media (hover:none){#abilityLab .ui-key{display:none}}`;
    document.head.appendChild(style);
  }

  // The rows' marks and texts, and the short list beside the fight.
  function draw() {
    if (!root) return;
    for (const row of grid.querySelectorAll('.lab-row')) {
      const b = ABILITY_BY_ID[row.dataset.ability], n = held.get(b.id) || 0, pick = row.firstChild;
      pick.setAttribute('aria-pressed', String(n > 0));
      pick.setAttribute('aria-label', `${b.name}, ${n ? 'level ' + ABILITY_LEVEL_MARK[n - 1] : 'off'}`);
      const marks = pick.querySelector('.lab-marks'); marks.textContent = '';
      for (let i = 0; i < b.levels.length; i++) {
        if (i) marks.appendChild(document.createTextNode(' '));
        marks.appendChild(i < n ? make('b', '', ABILITY_LEVEL_MARK[i]) : document.createTextNode(ABILITY_LEVEL_MARK[i]));
      }
      const text = pick.querySelector('.lab-text'); text.textContent = '';
      for (const part of abilityCardText(b, Math.max(1, n))) text.appendChild(part.strong ? make('b', '', part.text.replace(/^.* → /, '')) : document.createTextNode(part.text));
    }
    worn.textContent = '';
    const list = make('ul');
    for (const b of ABILITIES) { const n = held.get(b.id); if (n) { const li = make('li', '', b.name); li.appendChild(make('span', '', ABILITY_LEVEL_MARK[n - 1])); list.appendChild(li); } }
    if (list.children.length) worn.appendChild(list);
    worn.append('B  abilities');
  }

  function show() {
    if (open || Game.mode !== 'play' || !here(Game)) return;
    if (!root) build();
    open = true; Game.mode = 'lab'; Game.clearControls();
    draw(); root.hidden = false; worn.hidden = true;
    if (document.pointerLockElement) document.exitPointerLock();
    events.emit('pause');
    root.querySelector('.lab-pick').focus({ preventScroll: true });
  }
  function close() {
    if (!open) return;
    open = false; root.hidden = true;
    Game.resume();   // back to 'play': the next click on the game takes the mouse again
    worn.hidden = !here(Game);
  }
  // A key while playing or in the list: B opens and closes it, Escape closes it. True when it was ours: every key
  // while the list is open, so none reaches the game behind it (Tab, Enter and Space go on to the list's buttons).
  function key(ev) {
    if (open) { if (ev.code === 'KeyB' || ev.code === 'Escape') { ev.preventDefault(); if (!ev.repeat) close(); } return true; }
    if (ev.code === 'KeyB' && Game.mode === 'play' && here(Game)) { ev.preventDefault(); if (!ev.repeat) show(); return true; }
    return false;
  }
  // The gamepad (js/gamepad.js), every frame: true when the list took the buttons. On the grounds D-pad up opens it;
  // open, the D-pad moves between its buttons, A presses one, X takes an ability down a level, B or Start closes it.
  function pad(pressed) {
    if (!open) {
      if (pressed.includes('PadUp') && Game.mode === 'play' && here(Game)) { show(); return true; }
      return false;
    }
    const buttons = [...root.querySelectorAll('button')], at = buttons.indexOf(document.activeElement);
    for (const c of pressed) {
      if (c === 'PadB' || c === 'PadStart') { close(); return true; }
      const by = c === 'PadUp' || c === 'PadLeft' ? -1 : c === 'PadDown' || c === 'PadRight' ? 1 : 0;
      if (by) buttons[(Math.max(at, 0) + by + buttons.length) % buttons.length].focus({ focusVisible: true });   // the ring shows for a pad too
      else if (c === 'PadA' && at >= 0) buttons[at].click();
      else if (c === 'PadX' && at >= 0 && buttons[at].classList.contains('lab-pick')) buttons[at].dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }));
    }
    return true;
  }
  // Every step (Game.update): the kit put back on a fresh body (a restart, a death), a power fired once the world runs.
  function update(game) {
    if (!here(game)) { if (worn && !worn.hidden) worn.hidden = true; return; }
    if (!root) build();
    if (game.player && game.player !== owner) wear();
    if (worn.hidden && !open) worn.hidden = false;
    if (firing) fireNow(game);
  }
  events.on('pause', () => { if (worn && !open) worn.hidden = true; });
  return { key, pad, update, isOpen: () => open, held };
})();
