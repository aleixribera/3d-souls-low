'use strict';
// The player's name (PLAN.md "Next, small" 6). Asked once, the first time online play opens with no name
// (multiplayer.join), and changed from Options (the Game category's Name row). One field: typed, or spelled with the
// pad's keyboard, which shows while the pad is the device used last. The name is kept with the save (progress.name);
// a change made while online reaches the party at once (js/multiplayer.js listens to progress).
const nameAsk = (() => {
  const max = ArenaNet.config.maxName;
  const root = document.createElement('section');
  root.id = 'nameAsk'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'nameAskTitle');
  root.innerHTML = `<form class="name-card" novalidate>
    <h1 id="nameAskTitle" class="ui-title">Your name</h1>
    <input id="nameAskField" maxlength="${max}" autocomplete="nickname" spellcheck="false" aria-labelledby="nameAskTitle">
    <div id="nameAskKeys" role="group" aria-label="Letters"></div>
    <div class="name-actions"><button id="nameAskDone" class="ui-primary" type="submit"><span class="ui-key" aria-hidden="true"></span><span></span></button>
    <button id="nameAskCancel" class="ui-text-button" type="button"><span class="ui-key" aria-hidden="true"></span>Cancel</button></div>
    <p id="nameAskHint" class="ui-hints"></p></form>`;
  const style = document.createElement('style');
  style.textContent = `#nameAsk{position:fixed;inset:0;z-index:130;overflow:auto;background:#080a0c;color:var(--ui-ink);font:var(--ui-size-text)/1.5 var(--ui-text);color-scheme:dark}
    #nameAsk[hidden],#nameAsk [hidden]{display:none!important}#nameAsk *{box-sizing:border-box}
    #nameAsk .name-card{display:flex;flex-direction:column;gap:18px;width:100%;max-width:560px;padding:max(28px,12vh) max(16px,5vw) 24px}
    #nameAskField{display:block;width:100%;min-height:56px;padding:0 14px;background:var(--ui-well);color:var(--ui-ink);border:1px solid var(--ui-line-hi);border-radius:2px;font:400 26px var(--ui-display)}
    #nameAskField:focus-visible,#nameAskField.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;border-color:var(--ui-accent)}
    #nameAskKeys{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}
    #nameAskKeys button{min-height:42px;padding:0;font:500 15px var(--ui-text);color:var(--ui-ink);background:#ffffff08;border:1px solid var(--ui-line);border-radius:2px;cursor:pointer}
    #nameAskKeys button:hover{background:var(--ui-hover)}
    #nameAskKeys button:focus-visible,#nameAskKeys button.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;background:#d9b56b33}
    #nameAskKeys .name-action{grid-column:span 2;font-size:var(--ui-size-hint)}
    #nameAsk .name-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}
    #nameAsk .name-actions .ui-primary{min-width:180px}
    #nameAsk .name-actions .ui-text-button{margin-left:-10px}
    #nameAskHint:empty{display:none}`;
  document.head.appendChild(style);
  document.body.appendChild(root);
  const $n = id => root.querySelector('#' + id);
  const field = $n('nameAskField'), keys = $n('nameAskKeys'), done = $n('nameAskDone'), cancel = $n('nameAskCancel');
  let ask = null, before = null, lowercase = false, padDir = null, padTimer = 0;

  const valid = () => !!ArenaNet.name(field.value);
  function refresh() { done.disabled = !valid(); }
  function focusNode(node) {
    for (const n of root.querySelectorAll('.pad-selected')) n.classList.remove('pad-selected');
    if (!node) return;
    node.classList.add('pad-selected'); node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'nearest' });
  }
  // What the arrows and the stick move through: the letters and the buttons with the pad; the field and the buttons
  // with the keyboard.
  const targets = () => [...root.querySelectorAll('input,button')].filter(n => !n.disabled && n.offsetParent && (root.classList.contains('pad') ? n !== field : !keys.contains(n)));
  function move(dir) {
    const list = targets(), at = list.includes(document.activeElement) ? document.activeElement : null;
    if (!at) { focusNode(list[0]); return; }
    const a = at.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, score = Infinity;
    for (const n of list) {
      if (n === at) continue;
      const r = n.getBoundingClientRect(), dx = r.left + r.width / 2 - ax, dy = r.top + r.height / 2 - ay;
      const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy, across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 4) continue;
      const s = along + across * 2.5;
      if (s < score) { score = s; best = n; }
    }
    if (best) { focusNode(best); events.emit('menuMove'); }
  }
  function type(key) {
    if (key === 'case') { lowercase = !lowercase; buildKeys(); return; }
    if (key === 'delete') field.value = field.value.slice(0, -1);
    else if (field.value.length < max) field.value += key;
    refresh();
  }
  function buildKeys() {   // the focused key stays focused across the case toggle
    const previous = keys.contains(document.activeElement) ? document.activeElement.dataset.nameKey : null; keys.textContent = '';
    const add = (label, key, action = false) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.nameKey = key;
      if (action) b.className = 'name-action';
      if (key === ' ') b.setAttribute('aria-label', 'Space');
      b.onclick = () => type(key); keys.appendChild(b);
    };
    for (const c of (lowercase ? 'abcdefghijklmnopqrstuvwxyz' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') + '0123456789-_.') add(c, c);
    add('Space', ' ', true); add('Delete', 'delete', true); add(lowercase ? 'ABC' : 'abc', 'case', true);
    const again = previous && [...keys.children].find(b => b.dataset.nameKey === previous);
    if (again) focusNode(again);
  }
  // The device used last decides the layout: the pad gets the letters and its keys on the buttons; the keyboard,
  // the mouse and touch type into the field.
  function layout() {
    if (root.hidden) return;
    const pad = usingPad();
    root.classList.toggle('pad', pad); keys.hidden = !pad;
    done.querySelector('.ui-key').textContent = pad ? 'Start' : 'Enter';
    cancel.querySelector('.ui-key').textContent = pad ? 'B' : 'Esc';
    const hint = $n('nameAskHint'); hint.textContent = '';
    if (pad) for (const [key, label] of [['D-pad', 'Move'], ['A', 'Type'], ['X', 'Delete']]) {
      const item = document.createElement('span'), cap = document.createElement('span');
      cap.className = 'ui-key'; cap.textContent = key; item.append(cap, label); hint.appendChild(item);
    }
    if (!targets().includes(document.activeElement)) focusNode(pad ? keys.firstElementChild : field);
  }
  events.on('device', layout);
  // Opens the ask. `action` names the button that keeps the name ("Join", "Save"); `then(name)` runs once it is kept.
  function open({ action = 'Save', then = null } = {}) {
    ask = { then }; before = document.activeElement;
    field.value = progress.name; done.lastElementChild.textContent = action;
    if (document.pointerLockElement) document.exitPointerLock();
    root.hidden = false; buildKeys(); refresh(); layout();
    if (!usingPad()) { field.focus({ preventScroll: true }); field.select(); }
  }
  function close(keep) {
    if (root.hidden) return;
    const then = ask?.then, name = ArenaNet.name(field.value);
    if (keep && !name) return;
    if (root.contains(document.activeElement)) document.activeElement.blur();
    root.hidden = true; ask = null;
    for (const n of root.querySelectorAll('.pad-selected')) n.classList.remove('pad-selected');
    if (before && before.isConnected) before.focus({ preventScroll: true });
    before = null;
    events.emit(keep ? 'menuConfirm' : 'menuBack');
    if (keep) { progress.setName(name); if (then) then(name); }
  }
  root.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); close(true); });
  field.addEventListener('input', refresh);
  cancel.onclick = () => close(false);
  root.addEventListener('pointerdown', () => { for (const n of root.querySelectorAll('.pad-selected')) n.classList.remove('pad-selected'); });
  const KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  // Registered before every other screen's keys (GAME_FILES order): while the ask is open nothing under it moves, and
  // the field still types.
  window.addEventListener('keydown', ev => {
    if (root.hidden) return;
    ev.stopImmediatePropagation(); input.use('keyboard');
    // A key held from the row that opened the ask must not type into it or press Save.
    if (ev.repeat && ['Enter', 'NumpadEnter', 'Space'].includes(ev.code)) { ev.preventDefault(); return; }
    const inField = document.activeElement === field;
    if (ev.code === 'Escape') { ev.preventDefault(); if (!ev.repeat) close(false); return; }
    if (ev.code === 'Tab') {
      ev.preventDefault(); const list = targets(), at = list.indexOf(document.activeElement);
      focusNode(list[(at + (ev.shiftKey ? -1 : 1) + list.length) % list.length]); return;
    }
    if (KEY_DIR[ev.code] && !inField) { ev.preventDefault(); move(KEY_DIR[ev.code]); return; }
    if (ev.code === 'Backspace' && !inField) { ev.preventDefault(); type('delete'); }
  }, true);
  // The pad, while the ask is open: A presses, X deletes, Start keeps the name, B cancels. True when it took the input.
  function pad(pressed, dt = CONFIG.step) {
    if (root.hidden) return false;
    if (pressed.includes('PadB')) { close(false); return true; }
    if (pressed.includes('PadStart')) { close(true); return true; }
    if (pressed.includes('PadX')) type('delete');
    if (pressed.includes('PadA')) {
      const at = document.activeElement;
      if (at && root.contains(at) && at.tagName === 'BUTTON' && !at.disabled) at.click();
      return true;
    }
    const C = CONFIG.gamepad, S = C.menuStick, m = gamepad.move;
    const dir = gamepad.down.has('PadUp') || m.y > S ? 'up' : gamepad.down.has('PadDown') || m.y < -S ? 'down'
      : gamepad.down.has('PadLeft') || m.x < -S ? 'left' : gamepad.down.has('PadRight') || m.x > S ? 'right' : null;
    if (dir !== padDir) { padDir = dir; padTimer = C.menuDelay; if (dir) move(dir); }
    else if (dir && (padTimer -= dt) <= 0) { padTimer = C.menuRepeat; move(dir); }
    return true;
  }
  return { open, pad, get isOpen() { return !root.hidden; } };
})();
