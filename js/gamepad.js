'use strict';
// ============================================================================
// 3a. Gamepad
// ============================================================================
// Polled once per rendered frame (see frame() in boot.js). Buttons become codes ('PadRB') fed into the
// same `input` as keys, so buffering and consuming work unchanged; ACTIONS says what each code does.
// The left stick gives analog movement (Game.moveInput), the right stick turns the camera, or flicks
// between targets while locked on. In menus the D-pad or left stick moves, A confirms, B goes back.
// Button indices of the standard mapping.
const PAD_BUTTONS = ['PadA', 'PadB', 'PadX', 'PadY', 'PadLB', 'PadRB', 'PadLT', 'PadRT', 'PadBack', 'PadStart',
                     'PadL3', 'PadR3', 'PadUp', 'PadDown', 'PadLeft', 'PadRight'];
const gamepad = {
  down: new Set(),              // pad codes held last poll
  move: { x: 0, y: 0 },         // left stick after the dead zone (y up), length 0..1
  look: { x: 0, y: 0 },         // right stick after the dead zone (y down)
  flickArmed: true,
  neutralRequired: false,
  menuDir: null, menuTimer: 0,

  // The first connected pad, or null.
  read() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected !== false) return p;
    return null;
  },
  // Radial dead zone, rescaled so the stick's usable range still reaches 0..1.
  stick(x, y) {
    const D = CONFIG.gamepad.deadzone, l = Math.hypot(x, y);
    if (l <= D) return { x: 0, y: 0 };
    const k = Math.min(1, (l - D) / (1 - D)) / l;
    return { x: x * k, y: y * k };
  },
  poll(dt) {
    if (input.suspended) { this.release(); return; }
    const p = this.read();
    if (!p) { this.release(); return; }
    const C = CONFIG.gamepad, now = new Set();
    p.buttons.forEach((b, i) => {
      const on = typeof b === 'object' ? b.pressed || b.value > C.trigger : b > C.trigger;
      if (on && PAD_BUTTONS[i]) now.add(PAD_BUTTONS[i]);
    });
    const ax = p.axes || [];
    const ls = this.stick(ax[0] || 0, -(ax[1] || 0)), rs = this.stick(ax[2] || 0, ax[3] || 0);
    // A button held in another window must be released before it can resume or act here.
    if (this.neutralRequired) {
      this.down = now;
      this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
      if (!now.size && !ls.x && !ls.y && !rs.x && !rs.y) this.neutralRequired = false;
      return;
    }
    this.move = ls; this.look = rs;
    const pressed = [...now].filter(c => !this.down.has(c)), released = [...this.down].filter(c => !now.has(c));
    this.down = now;
    if ((now.size || ls.x || ls.y || rs.x || rs.y) && typeof multiplayer !== 'undefined') multiplayer.activity();
    if (pressed.length || ls.x || ls.y || rs.x || rs.y) input.use('pad');
    for (const c of released) input.up(c);
    if (typeof multiplayer !== 'undefined' && multiplayer.runIntroActive) { input.clear(); return; }
    if (typeof multiplayer !== 'undefined' && multiplayer.panelOpen) { multiplayer.pad(pressed, dt); return; }
    if (typeof multiplayer !== 'undefined' && multiplayer.spectatorPad(pressed)) return;
    if (Game.mode === 'play') this.playInput(pressed, dt);
    else this.menuInput(pressed, dt);
  },
  // Nothing connected (or unplugged): let go of everything the pad was holding.
  release() {
    for (const c of this.down) input.up(c);
    this.down.clear(); this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.menuDir = null; this.menuTimer = 0; this.flickArmed = true;
  },
  playInput(pressed, dt) {
    for (const c of pressed) {
      if (c === SYSTEM_PAD.pause) Game.pause(false);
      else if (c === SYSTEM_PAD.restart) Game.requestRestart();
      else input.down(c);
    }
    const C = CONFIG.gamepad, rx = this.look.x, ry = this.look.y;
    if (Game.lock) {
      // Flick: a sideways push past `flick` after resting near the centre switches target that way.
      const mag = Math.hypot(rx, ry);
      if (mag < C.flickReset) this.flickArmed = true;
      else if (this.flickArmed && Math.abs(rx) >= C.flick && Math.abs(rx) > Math.abs(ry)) {
        this.flickArmed = false;
        const code = rx < 0 ? 'PadFlickL' : 'PadFlickR';
        input.down(code); input.up(code);
      }
    } else {
      this.flickArmed = Math.hypot(rx, ry) < C.flickReset;
      if (rx || ry) Game.stickLook(rx, ry, dt);
    }
  },
  menuInput(pressed, dt) {
    const C = CONFIG.gamepad;
    // D-pad or left stick, one step per press, repeating while held.
    const mx = this.move.x, my = this.move.y, S = C.menuStick;
    const dir = this.down.has(MENU_PAD.up) || my > S ? 'up' : this.down.has(MENU_PAD.down) || my < -S ? 'down'
      : this.down.has(MENU_PAD.left) || mx < -S ? 'left' : this.down.has(MENU_PAD.right) || mx > S ? 'right' : null;
    for (const c of pressed) {
      if (c === MENU_PAD.confirm) Game.confirm();
      else if (c === MENU_PAD.back) Game.menuBack();
      else if (c === SYSTEM_PAD.pause) { if (Game.mode === 'pause') Game.resume(); else Game.confirm(); }
    }
    if (dir !== this.menuDir) { this.menuDir = dir; this.menuTimer = C.menuDelay; if (dir) Game.menuStep(dir); return; }
    if (!dir || (this.menuTimer -= dt) > 0) return;
    this.menuTimer = C.menuRepeat;
    Game.menuStep(dir);
  },
};
