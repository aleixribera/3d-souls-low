'use strict';
// ============================================================================
// 3. input
// ============================================================================
// Keyboard codes, mouse buttons ('Mouse0'; 'Mouse3' and 'Mouse4' are the side buttons) and gamepad buttons ('PadRB',
// see js/gamepad.js).
// Movement and the camera on a gamepad come from the sticks (Game.moveInput, gamepad.js); a right-stick
// flick presses 'PadFlickL' or 'PadFlickR'.
// The default layout (PLAN.md, the player rework's controls): WASD, Shift dodge, Space jump, J light, K heavy, L block
// and deflect, 1-4 the abilities, Q lock-on and Tab to switch, E flask, F interact. A laptop keyboard plays it all; the
// mouse is never needed. The player changes any of these keys on the Controls screen (BIND_SLOTS, settings.keys).
// ACTIONS always holds the live bindings, rebuilt from DEFAULT_ACTIONS by applyBindings().
const DEFAULT_ACTIONS = Object.freeze({
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space', 'PadA'], roll: ['ShiftLeft', 'ShiftRight', 'PadB'],
  light: ['KeyJ', 'Mouse0', 'PadRB'], heavy: ['KeyK', 'Mouse2', 'PadRT'],   // no Ctrl anywhere: the browser keeps Ctrl+W
  // Block and deflect share one key: held, it guards; tapped as a blow lands, it turns the blow aside. Until the
  // moveset has a deflect of its own, the parry stands in for it: a press of a key bound to both counts as a parry only
  // while the player already guards (input.guarding), so a tap raises the guard for one step and the player's own rule
  // (a parry from the guard commits only when a blow is about to land) does the rest. A tap with nothing coming is a
  // short block, never a whiffed parry. The pad keeps its own parry button.
  block: ['KeyL', 'PadLB'], parry: ['PadLT', 'KeyL'],
  // The four ability keys (Strike, Guard, Summon, Ultimate), bound here so they can be changed and shown; what each
  // fires is the moveset's (a press of `ability1`..`ability4`).
  ability1: ['Digit1', 'PadUp'], ability2: ['Digit2', 'PadRight'], ability3: ['Digit3', 'PadDown'], ability4: ['Digit4', 'PadLeft'],
  lock: ['KeyQ', 'PadR3'], switchTarget: ['Tab', 'PadFlickL', 'PadFlickR'], flask: ['KeyE', 'PadX'],
  rest: ['KeyF', 'PadY'], talk: ['KeyF', 'PadY'],   // one interact key: rest at a fire, talk, read
});
const ACTIONS = {};
for (const [a, codes] of Object.entries(DEFAULT_ACTIONS)) ACTIONS[a] = [...codes];
// Keys handled directly by the key handler rather than through ACTIONS. No action can take them.
const SYSTEM_KEYS = { pause: 'Escape', restart: 'KeyR', help: 'F1' };
const SYSTEM_PAD = { pause: 'PadStart', restart: 'PadBack' };   // gamepad equivalents (handled in gamepad.js)
// Menu navigation. The gamepad's left stick also moves the selection.
const MENU_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'],
                    right: ['KeyD', 'ArrowRight'], confirm: ['Enter', 'KeyJ'], back: ['Escape'] };
const MENU_PAD = { up: 'PadUp', down: 'PadDown', left: 'PadLeft', right: 'PadRight', confirm: 'PadA', back: 'PadB' };
const GAME_CODES = new Set();   // every code the game takes in play (applyBindings fills it)
const isPadCode = c => c.startsWith('Pad');
const isKeyCode = c => !c.startsWith('Mouse') && !isPadCode(c);   // a keyboard key
// The keys a player can change, in the Controls screen's order. A slot is one keyboard key shared by its actions
// (block and deflect; rest, talk and read). The mouse buttons, the spare keys (arrows, right Shift) and the pad's
// buttons stay, except that a spare a slot takes over leaves the action it was a spare for.
const BIND_SLOTS = [
  { id: 'up', name: 'Move forward', actions: ['up'] }, { id: 'down', name: 'Move back', actions: ['down'] },
  { id: 'left', name: 'Move left', actions: ['left'] }, { id: 'right', name: 'Move right', actions: ['right'] },
  { id: 'roll', name: 'Dodge', actions: ['roll'] }, { id: 'jump', name: 'Jump', actions: ['jump'] },
  { id: 'light', name: 'Light attack', actions: ['light'] }, { id: 'heavy', name: 'Heavy attack', actions: ['heavy'], desc: 'Hold to charge.' },
  { id: 'block', name: 'Block and deflect', actions: ['block', 'parry'], desc: 'Hold to block; tap as a blow lands to deflect.' },
  { id: 'lock', name: 'Lock on', actions: ['lock'], desc: 'Boss fights lock on by themselves.' },
  { id: 'switchTarget', name: 'Switch target', actions: ['switchTarget'] },
  { id: 'interact', name: 'Interact', actions: ['rest', 'talk'], desc: 'Rest at a fire, talk, read.' },
  { id: 'ability1', name: 'Ability 1', actions: ['ability1'] }, { id: 'ability2', name: 'Ability 2', actions: ['ability2'] },
  { id: 'ability3', name: 'Ability 3', actions: ['ability3'] }, { id: 'ability4', name: 'Ability 4', actions: ['ability4'] },
  { id: 'flask', name: 'Flask', actions: ['flask'] },
];
const slotDefault = s => DEFAULT_ACTIONS[s.actions[0]].find(isKeyCode);
const slotKey = s => (settings.keys && settings.keys[s.id]) || slotDefault(s);
// A key a player may give an action: any keyboard key but the system ones and the modifiers the browser keeps.
const bindableKey = code => typeof code === 'string' && /^[A-Z][A-Za-z0-9]{1,20}$/.test(code) && isKeyCode(code)
  && !Object.values(SYSTEM_KEYS).includes(code) && !/^(Control|Alt|Meta|OS|Context)/.test(code) && !/^F\d+$/.test(code)
  && !/Enter$/.test(code);   // Enter chooses in the menus (and lets a waiting row be)
// ACTIONS from the defaults and the player's keys, and GAME_CODES from ACTIONS. Called at load and on every change.
function applyBindings() {
  const taken = new Map(BIND_SLOTS.map(s => [slotKey(s), s]));
  for (const [a, codes] of Object.entries(DEFAULT_ACTIONS)) {
    const own = BIND_SLOTS.find(s => s.actions.includes(a));
    ACTIONS[a] = codes.map(c => own && c === slotDefault(own) ? slotKey(own) : c)
      .filter(c => !taken.has(c) || taken.get(c).actions.includes(a));
  }
  GAME_CODES.clear();
  for (const c of [].concat(...Object.values(ACTIONS), Object.values(SYSTEM_KEYS))) GAME_CODES.add(c);
  input.bindings++;
}
// Give a slot a key (the Controls screen). A key another slot holds swaps over: that slot takes this one's old key.
// False for a key no action may take.
function bindKey(slotId, code) {
  const s = BIND_SLOTS.find(x => x.id === slotId);
  if (!s || !bindableKey(code)) return false;
  const old = slotKey(s), other = BIND_SLOTS.find(x => x !== s && slotKey(x) === code);
  const keep = (slot, key) => { if (key === slotDefault(slot)) delete settings.keys[slot.id]; else settings.keys[slot.id] = key; };
  keep(s, code);
  if (other) keep(other, old);
  saveSettings(); applyBindings();
  return true;
}
function resetBindings() { settings.keys = {}; saveSettings(); applyBindings(); }

// Labels built from the live bindings: "[ j / LMB ]" (keyboard first, then mouse), or "[ Space ]".
const KEY_LABELS = { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift',
  Tab: 'Tab', Escape: 'Esc', Enter: 'Enter', Equal: '=', Minus: '-', NumpadAdd: 'Num +', NumpadSubtract: 'Num -',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Mouse0: 'LMB', Mouse2: 'RMB', Mouse3: 'Side mouse', Mouse4: 'Side mouse',
};
// A pad button's name on the pad in hand (gamepad.family): PlayStation's shapes, or Xbox's letters.
const PAD_NAMES = {
  ps: { PadA: '✕', PadB: '◯', PadX: '☐', PadY: '△', PadLB: 'L1', PadRB: 'R1', PadLT: 'L2', PadRT: 'R2', PadL3: 'L3', PadR3: 'R3',
        PadStart: 'Options', PadBack: 'Share' },
  xbox: { PadA: 'A', PadB: 'B', PadX: 'X', PadY: 'Y', PadLB: 'LB', PadRB: 'RB', PadLT: 'LT', PadRT: 'RT', PadL3: 'LS', PadR3: 'RS',
          PadStart: 'Menu', PadBack: 'View' },
  any: { PadUp: 'D-pad ↑', PadDown: 'D-pad ↓', PadLeft: 'D-pad ←', PadRight: 'D-pad →', PadFlickL: 'Right stick ←', PadFlickR: '→' },   // flicks read together: "Right stick ← / →"
};
// Whose names to show for the connected pads' ids: Xbox only for a pad that is Microsoft's own (vendor 045e) with no
// PlayStation pad beside it. Steam's virtual pad (vendor 28de, or plain XInput on Windows) copies a DualShock here.
function padFamily(ids) {
  if (ids.some(id => /054c|sony|playstation|dualshock|dualsense/i.test(id))) return 'ps';
  return ids.some(id => /045e/i.test(id)) ? 'xbox' : 'ps';
}
const padName = code => PAD_NAMES.any[code] || (PAD_NAMES[typeof gamepad !== 'undefined' && gamepad.family] || PAD_NAMES.ps)[code];
function keyLabel(code) {
  if (isPadCode(code)) return padName(code) || code;
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
// A changeable key's label on the Controls screen: "J / LMB", "Shift"; on a controller its button ("Left stick" to move).
function slotLabel(s) {
  const a = s.actions[0];
  if (usingPad()) return ['up', 'down', 'left', 'right'].includes(a) ? 'Left stick'   // a pad parries on its own trigger: both shown
    : [...new Set(s.actions.map(x => bindLabel(x).replace(/^\[\s*|\s*\]$/g, '')))].join(', ');
  const key = keyLabel(slotKey(s)), mouse = ACTIONS[a].find(c => c.startsWith('Mouse'));
  return (key.length === 1 ? key.toUpperCase() : key) + (mouse ? ` / ${keyLabel(mouse)}` : '');
}
// The four ability keys together: "[ 1 2 3 4 ]", or the d-pad.
const abilityLabel = () => usingPad() ? '[ D-pad ]' : `[ ${[1, 2, 3, 4].map(n => keyLabel(ACTIONS[`ability${n}`].find(isKeyCode) || '')).join(' ')} ]`;
// Every control, from the live bindings and the device used last: [what it does, its binding ("[ j / LMB ]", or ''),
// a note after it ('' if none)]. The help panel (F1, js/hud.js) and the Controls screen (js/game-menus.js) read it.
// online: the restart key opens the lobby instead.
function controlRows(online) {
  const pad = usingPad();
  return [
    ['Move', moveLabel(), ''], ['Camera', pad ? 'Right stick' : 'Mouse', pad ? '' : '(click the view to capture it)'],
    ['Dodge', bindLabel('roll'), ''], ['Jump', bindLabel('jump'), ''],
    ['Light attack', bindLabel('light'), ''], ['Heavy attack', bindLabel('heavy'), 'hold to charge'],
    ['Jump attack', '', 'Light or heavy while airborne'],
    ['Block', bindLabel('block'), 'hold'], ['Deflect', bindLabel(pad ? 'parry' : 'block'), 'tap as the blow lands'],
    ['Abilities', abilityLabel(), ''],
    ['Lock on', bindLabel('lock'), 'boss fights lock on by themselves'], ['Switch target', bindLabel('switchTarget'), 'while locked on'],
    ['Flask', bindLabel('flask'), ''], ['Interact', bindLabel('rest'), 'rest, talk, read'],
    online ? ['Lobby', systemLabel('restart'), ''] : ['Restart', systemLabel('restart'), 'twice'],
    [online ? 'Game menu' : 'Pause', systemLabel('pause'), ''],
    ...(pad ? [] : [['Help', `[ ${keyLabel(SYSTEM_KEYS.help)} ]`, '']]),   // F1 has no pad button
  ];
}

const input = {
  device: 'keyboard',   // 'keyboard' (keys and mouse) or 'pad': the last one used, for button labels
  suspended: false,     // a blurred/hidden page must not poll held controller inputs back into play
  // Set the device used last; announces a change so labels can follow.
  use(device) { if (device !== this.device) { this.device = device; events.emit('device', { device }); } },
  held: new Set(),
  pressed: new Map(),   // code -> time of press (s); each press is consumed at most once
  // The buffer ages on simulation time (advanced once per fixed step by the loop in js/boot.js), not the wall clock:
  // slow motion, catch-up frames and stalls leave its window the same length of play.
  clock: 0,
  tick(dt) { this.clock += dt; },
  now() { return this.clock; },
  down(code) { if (!this.held.has(code)) { this.held.add(code); this.pressed.set(code, this.now()); } },
  up(code) { this.held.delete(code); },
  bindings: 0,          // bumped on every change of the key bindings (applyBindings), so drawn key caps can follow
  isHeld(action) { return ACTIONS[action].some(c => this.held.has(c)); },
  // The local player is guarding (the block key's deflect, DEFAULT_ACTIONS above).
  guarding() { return typeof Game !== 'undefined' && !!Game.player && Game.player.ctl === this && Game.player.state === PS.BLOCK; },
  // The codes that press `action` now: a parry key shared with block only while guarding.
  live(action) {
    const codes = ACTIONS[action];
    return action === 'parry' && !this.guarding() ? codes.filter(c => !ACTIONS.block.includes(c)) : codes;
  },
  // The code of the action's most recent buffered press (e.g. which flick switched target), or null.
  pressedCode(action) {
    let best = null;
    for (const c of ACTIONS[action]) if (this.pressed.has(c) && (!best || this.pressed.get(c) > this.pressed.get(best))) best = c;
    return best;
  },
  // True if the action was pressed within the buffer window. Does not consume.
  peek(action) {
    const t = this.now();
    return this.live(action).some(c => this.pressed.has(c) && t - this.pressed.get(c) <= CONFIG.input.buffer);
  },
  consume(action) {
    if (!this.peek(action)) return false;
    for (const c of this.live(action)) this.pressed.delete(c);
    return true;
  },
  // During a hit-pause the buffer clock stops: pending presses age by the frozen time, so none expire.
  hold(dt) { for (const [c, t] of this.pressed) this.pressed.set(c, t + dt); },
  clear() { this.held.clear(); this.pressed.clear(); },
};

// Persistent options (pause menu). Stored per browser; failures fall back to defaults.
const SETTINGS_KEY = 'combat-arena-3d.settings';
// `v`: the settings format (2 since v7.18: the one-time volume migration below has run). `keys`: the player's own keys,
// { slot id: code } for each BIND_SLOTS slot moved off its default (bindKey).
const DEFAULT_SETTINGS = Object.freeze({ v: 2, sensitivity: 5, invert: false, hudScale: 1,
  graphics: CONFIG.VISUALS.defaultQuality, volume: 5, cameraMotion: true, lessons: true, practiceFight: 1, keys: Object.freeze({}) });
// The operating system asks for reduced motion: camera motion starts off until the player chooses otherwise.
const prefersReducedMotion = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
// Saved graphics choices from before the two presets (pass 57): Low and High both became Normal.
const OLD_GRAPHICS = Object.freeze({ low: 'normal', high: 'normal' });
function readSettings(value) {
  const clean = { ...DEFAULT_SETTINGS, keys: {} };
  if (prefersReducedMotion()) clean.cameraMotion = false;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clean;
  for (const key of ['invert', 'cameraMotion', 'lessons'])
    if (typeof value[key] === 'boolean') clean[key] = value[key];
  // Preserve a steadier view when either of the former camera options was disabled.
  if (value.screenShake === false) clean.cameraMotion = false;
  for (const [key, min, max, step] of [['sensitivity', 1, 10, 1], ['hudScale', 0.7, 1.5, 0.1], ['volume', 0, 10, 1]])
    if (Number.isFinite(value[key])) clean[key] = Math.round(clamp(value[key], min, max) / step) / (1 / step);
  if (clean.volume === 8 && value.v !== 2) clean.volume = 5;   // v7.14: the old default 8 became 5, once (not a later choice of 8)
  if (['auto', ...Object.keys(CONFIG.VISUALS.quality)].includes(value.graphics)) clean.graphics = value.graphics;
  else if (typeof value.graphics === 'string' && Object.hasOwn(OLD_GRAPHICS, value.graphics)) clean.graphics = OLD_GRAPHICS[value.graphics];
  if (CONFIG.practice.fights.includes(value.practiceFight)) clean.practiceFight = value.practiceFight;   // Practice's Speed
  if (value.keys && typeof value.keys === 'object') {   // known slots, keys an action may take, no key twice
    const used = new Set(BIND_SLOTS.filter(s => !bindableKey(value.keys[s.id])).map(slotDefault));
    for (const s of BIND_SLOTS) {
      const k = value.keys[s.id];
      if (bindableKey(k) && k !== slotDefault(s) && !used.has(k)) { clean.keys[s.id] = k; used.add(k); }
    }
    if (BIND_SLOTS.some(s => !clean.keys[s.id] && Object.values(clean.keys).includes(slotDefault(s)))) clean.keys = {};   // a clash: start over
  }
  return clean;
}
let savedSettings = null;
try { savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { /* defaults */ }
const settings = readSettings(savedSettings);
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
applyBindings();
