'use strict';
// ============================================================================
// 3. input
// ============================================================================
// Keyboard codes, mouse buttons ('Mouse0'; 'Mouse3' and 'Mouse4' are the side buttons) and gamepad buttons ('PadRB',
// see js/gamepad.js).
// Movement and the camera on a gamepad come from the sticks (Game.moveInput, gamepad.js); a right-stick
// flick presses 'PadFlickL' or 'PadFlickR'.
const ACTIONS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space', 'PadA'], roll: ['ShiftLeft', 'ShiftRight', 'PadB'],
  light: ['KeyJ', 'Mouse0', 'PadRB'], heavy: ['KeyK', 'Mouse2', 'PadRT'],
  block: ['KeyC', 'KeyL', 'Mouse3', 'Mouse4', 'PadLB'], parry: ['KeyE', 'PadLT'],   // no Ctrl: the browser keeps Ctrl+W (close tab)
  lock: ['KeyQ', 'PadR3'], switchTarget: ['Tab', 'PadFlickL', 'PadFlickR'], rest: ['KeyF', 'PadY'], flask: ['KeyG', 'PadX'], talk: ['KeyF', 'PadY'],
};
// Keys handled directly by the key handler rather than through ACTIONS.
const SYSTEM_KEYS = { pause: 'Escape', restart: 'KeyR', help: 'F1' };
const SYSTEM_PAD = { pause: 'PadStart', restart: 'PadBack' };   // gamepad equivalents (handled in gamepad.js)
// Menu navigation. The gamepad's left stick also moves the selection.
const MENU_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'],
                    right: ['KeyD', 'ArrowRight'], confirm: ['Enter', 'KeyJ'], back: ['Escape'] };
const MENU_PAD = { up: 'PadUp', down: 'PadDown', left: 'PadLeft', right: 'PadRight', confirm: 'PadA', back: 'PadB' };
const GAME_CODES = new Set([].concat(...Object.values(ACTIONS), Object.values(SYSTEM_KEYS)));
const isPadCode = c => c.startsWith('Pad');

// Labels built from the live bindings: "[ j / LMB ]" (keyboard first, then mouse), or "[ Space ]".
const KEY_LABELS = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift',
  Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', Equal: '=', Minus: '-', NumpadAdd: 'Num +', NumpadSubtract: 'Num -',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Mouse0: 'LMB', Mouse2: 'RMB', Mouse3: 'Side mouse', Mouse4: 'Side mouse',
  // Gamepad buttons: Xbox name / PlayStation name.
  PadA: 'A / ✕', PadB: 'B / ○', PadX: 'X / □', PadY: 'Y / △', PadLB: 'LB / L1', PadRB: 'RB / R1', PadLT: 'LT / L2', PadRT: 'RT / R2',
  PadL3: 'L3', PadR3: 'R3', PadStart: 'Menu / Options', PadBack: 'View / Share', PadUp: 'D-pad ↑', PadDown: 'D-pad ↓', PadLeft: 'D-pad ←', PadRight: 'D-pad →',
  PadFlickL: 'Right stick ←', PadFlickR: '→' };   // read together: "Right stick ← / →"
function keyLabel(code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
// Labels follow the device used last (input.device): gamepad buttons after a gamepad press, keys otherwise.
const usingPad = () => input.device === 'pad';
// extraMouse: a mouse input bound outside ACTIONS (the wheel), shown after the key.
function bindLabel(action, extraMouse) {
  const codes = ACTIONS[action];
  const pad = codes.filter(isPadCode);
  if (usingPad() && pad.length) return `[ ${pad.map(keyLabel).join(' / ')} ]`;
  const key = codes.find(c => !c.startsWith('Mouse') && !isPadCode(c)), mouse = codes.find(c => c.startsWith('Mouse'));
  const parts = [keyLabel(key)];
  if (mouse) parts.push(keyLabel(mouse)); else if (extraMouse) parts.push(extraMouse);
  return `[ ${parts.join(' / ')} ]`;
}
const moveLabel = () => usingPad() ? '[ Left stick ]' : `[ ${['up', 'left', 'down', 'right'].map(a => keyLabel(ACTIONS[a][0])).join(' ')} ]`;
const systemLabel = name => `[ ${keyLabel(usingPad() && SYSTEM_PAD[name] || SYSTEM_KEYS[name])} ]`;
const menuLabel = name => usingPad() ? keyLabel(MENU_PAD[name]) : MENU_KEYS[name].map(keyLabel).join('/');

const input = {
  device: 'keyboard',   // 'keyboard' (keys and mouse) or 'pad': the last one used, for button labels
  suspended: false,     // a blurred/hidden page must not poll held controller inputs back into play
  // Set the device used last; announces a change so labels can follow.
  use(device) { if (device !== this.device) { this.device = device; events.emit('device', { device }); } },
  held: new Set(),
  pressed: new Map(),   // code -> time of press (s); each press is consumed at most once
  now() { return performance.now() / 1000; },
  down(code) { if (!this.held.has(code)) { this.held.add(code); this.pressed.set(code, this.now()); } },
  up(code) { this.held.delete(code); },
  isHeld(action) { return ACTIONS[action].some(c => this.held.has(c)); },
  // The code of the action's most recent buffered press (e.g. which flick switched target), or null.
  pressedCode(action) {
    let best = null;
    for (const c of ACTIONS[action]) if (this.pressed.has(c) && (!best || this.pressed.get(c) > this.pressed.get(best))) best = c;
    return best;
  },
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
const DEFAULT_SETTINGS = Object.freeze({ sensitivity: 5, invert: false, hudScale: 1,
  graphics: CONFIG.VISUALS.defaultQuality, volume: 8, cameraMotion: true });
function readSettings(value) {
  const clean = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
  for (const key of ['invert', 'cameraMotion'])
    if (typeof value[key] === 'boolean') clean[key] = value[key];
  // Preserve a steadier view when either of the former camera options was disabled.
  if (value.screenShake === false) clean.cameraMotion = false;
  for (const [key, min, max, step] of [['sensitivity', 1, 10, 1], ['hudScale', 0.7, 1.5, 0.1], ['volume', 0, 10, 1]])
    if (Number.isFinite(value[key])) clean[key] = Math.round(clamp(value[key], min, max) / step) / (1 / step);
  if (['auto', ...Object.keys(CONFIG.VISUALS.quality)].includes(value.graphics)) clean.graphics = value.graphics;
  return clean;
}
let savedSettings = null;
try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { /* defaults */ }
const settings = readSettings(savedSettings);
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
