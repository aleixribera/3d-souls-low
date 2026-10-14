'use strict';
// ============================================================================
// 3. input
// ============================================================================
const ACTIONS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], roll: ['ShiftLeft', 'ShiftRight'],
  light: ['KeyJ', 'Mouse0'], heavy: ['KeyK', 'Mouse2'],
  block: ['KeyL', 'ControlLeft', 'ControlRight'], parry: ['KeyE'],
  lock: ['KeyQ'], switchTarget: ['Tab'], rest: ['KeyF'], flask: ['KeyG'],
  zoomIn: ['Equal', 'NumpadAdd'], zoomOut: ['Minus', 'NumpadSubtract'],
};
// Keys handled directly by the key handler rather than through ACTIONS.
const SYSTEM_KEYS = { pause: 'Escape', restart: 'KeyR', hitboxes: 'KeyH', help: 'F1' };
// Menu navigation.
const MENU_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'],
                    right: ['KeyD', 'ArrowRight'], confirm: ['Enter', 'KeyJ'], back: ['Escape'] };
const GAME_CODES = new Set([].concat(...Object.values(ACTIONS), Object.values(SYSTEM_KEYS)));

// Labels built from the live bindings: "[ j / LMB ]" (keyboard first, then mouse), or "[ Space ]".
const KEY_LABELS = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl',
  Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', Equal: '=', Minus: '-', NumpadAdd: 'Num +', NumpadSubtract: 'Num -',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Mouse0: 'LMB', Mouse2: 'RMB' };
function keyLabel(code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
// extraMouse: a mouse input bound outside ACTIONS (the wheel), shown after the key.
function bindLabel(action, extraMouse) {
  const codes = ACTIONS[action];
  const key = codes.find(c => !c.startsWith('Mouse')), mouse = codes.find(c => c.startsWith('Mouse'));
  const parts = [keyLabel(key)];
  if (mouse) parts.push(keyLabel(mouse)); else if (extraMouse) parts.push(extraMouse);
  return `[ ${parts.join(' / ')} ]`;
}
const moveLabel = () => `[ ${['up', 'left', 'down', 'right'].map(a => keyLabel(ACTIONS[a][0])).join(' ')} ]`;
const systemLabel = name => `[ ${keyLabel(SYSTEM_KEYS[name])} ]`;
const menuLabel = name => MENU_KEYS[name].map(keyLabel).join('/');

const input = {
  held: new Set(),
  pressed: new Map(),   // code -> time of press (s); each press is consumed at most once
  now() { return performance.now() / 1000; },
  down(code) { if (!this.held.has(code)) { this.held.add(code); this.pressed.set(code, this.now()); } },
  up(code) { this.held.delete(code); },
  isHeld(action) { return ACTIONS[action].some(c => this.held.has(c)); },
  // True if the action was pressed within the buffer window. Does not consume.
  peek(action) {
    const t = this.now();
    return ACTIONS[action].some(c => this.pressed.has(c) && t - this.pressed.get(c) <= CONFIG.input.buffer);
  },
  consume(action) {
    if (!this.peek(action)) return false;
    for (const c of ACTIONS[action]) this.pressed.delete(c);
    return true;
  },
  // During a hit-pause the buffer clock stops: pending presses age by the frozen time, so none expire.
  hold(dt) { for (const [c, t] of this.pressed) this.pressed.set(c, t + dt); },
  clear() { this.held.clear(); this.pressed.clear(); },
};

// Persistent options (pause menu). Stored per browser; failures fall back to defaults.
const SETTINGS_KEY = 'combat-arena-3d.settings';
const settings = { sensitivity: 5, invert: false, hitboxes: true, hudScale: 1, graphics: CONFIG.VISUALS.defaultQuality };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* defaults */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
