'use strict';
// ============================================================================
// 12. Bootstrap
// ============================================================================
// Keep fullscreen in the existing startup file: a separate optional script must not prevent the game from loading.
// Browsers require a real click/key before fullscreen. Try once, then respect Escape for this visit.
const fullscreen = {
  attempted: false,
  async enter() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    try { await document.documentElement.requestFullscreen(); } catch (err) { /* blocked/unsupported: keep playing */ }
  },
  auto(ev) {
    if (this.attempted || !ev.isTrusted || ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.type === 'keydown' && (ev.code === 'Escape' || ev.code === 'F11' || /^(Shift|Control|Alt|Meta)/.test(ev.code))) return;
    if (ev.type === 'pointerdown' && ev.button !== 0) return;
    this.attempted = true;
    void this.enter();
  },
  async toggle() {
    this.attempted = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.enter();
    } catch (err) { /* a refused exit must not interrupt the menu */ }
  },
};
window.addEventListener('pointerdown', ev => fullscreen.auto(ev), { capture: true });
window.addEventListener('keydown', ev => fullscreen.auto(ev), { capture: true });

// Event listeners: visual effects and the tutorial, each in one place.
function registerListeners() {
  const F = CONFIG.fx.bursts, chest = b => ({ x: b.x, y: b.y + b.height * 0.6, z: b.z });
  events.on('strike', d => {
    const kind = d.blocked ? 'block' : d.attacker instanceof Player ? (d.strike.riposte ? 'riposte' : 'hit') : 'hurt';
    spawnBurst(d.at, F[kind]);
  });
  events.on('chargeFull', d => { if (!d.player || d.player === Game.player) Game.addShake(CONFIG.player.chargeShake.time, CONFIG.player.chargeShake.amp); });
  events.on('parry', d => { spawnBurst(chest(d.target), F.parry); if (!d.player || d.player === Game.player) Game.addShake(CONFIG.parry.shakeTime, CONFIG.parry.shakeAmp); });
  events.on('postureBreak', d => {
    spawnBurst({ x: d.enemy.x, y: d.enemy.y + d.enemy.height * 0.65, z: d.enemy.z }, F.postureBreak);
    Game.addShake(CONFIG.fx.postureBreakShake.time, CONFIG.fx.postureBreakShake.amp);
  });
  // Executions (js/execution.js): blood where the blade goes in, embers where it comes out of the back; a heavy jolt.
  const X = CONFIG.execution;
  events.on('execution', d => { spawnBurst(d.at, X.bursts.enter); spawnBurst(d.exit, X.bursts.exit); if (!d.player || d.player === Game.player) Game.addShake(X.shake.time, X.shake.amp); });
  events.on('executionPull', d => { spawnBurst(chest(d.enemy), X.bursts.pull); if (!d.player || d.player === Game.player) Game.addShake(X.pullShake.time, X.pullShake.amp); });
  events.on('land', d => { groundFx.spawn(d.x, d.z, d.fx, d.y); if (!d.player || d.player === Game.player) Game.addShake(CONFIG.groundPound.shakeTime, d.fx.shake); });
  events.on('fallDamage', d => {   // a hard landing: dust, and a jolt if it was the player
    groundFx.spawn(d.body.x, d.body.z, CONFIG.fx.hardLanding, d.body.y);
    if (d.body === Game.player) Game.addShake(CONFIG.groundPound.shakeTime * 1.5, CONFIG.fx.hardLanding.shake);
  });
  events.on('alert', d => spawnBurst({ x: d.enemy.x, y: d.enemy.y + d.enemy.height + 0.3, z: d.enemy.z }, F.alert));
  events.on('boltStopped', d => spawnBurst({ x: d.bolt.x, y: d.bolt.y, z: d.bolt.z }, F.bolt));
  events.on('impact', d => { groundFx.spawn(d.x, d.z, d.fx, d.y); Game.addShake(CONFIG.groundPound.shakeTime, d.fx.shake); });
  // A trap: a jolt that rumbles on and dust rising from its floor as the warning starts (its cracks spread in
  // placeTrap); dust from the edges as the floor drops away.
  const trapDust = (t, edges) => {
    const T = CONFIG.fx.trap, c = t.collapse;
    for (let i = 0; i < T.puffs; i++) {
      const x = rand(c[0], c[1]), z = edges ? c[2 + (i % 2)] : rand(c[2], c[3]);
      groundFx.puff(x, z, T.dust, t.y);
    }
  };
  events.on('trapWarning', d => { Game.addShake(d.trap.warning + CONFIG.fx.trap.rumble, CONFIG.fx.trap.jolt); trapDust(d.trap, false); });
  events.on('trapSprung', d => trapDust(d.trap, true));
  events.onAny((type, data) => Game.onTutorialEvent(type, data));
  events.on('device', () => { hud.buildTexts(Game); Game.showMenuHint(); });   // labels follow keyboard or gamepad
  registerVisualListeners();
  registerHudListeners();
  spectral.attach();   // golden weapons drawn for `spectral` attacks (Elden Ring bosses)
  blackBlade.attach(); // the Destined Death sphere and line blasts drawn (Maliketh, js/blackblade.js)
  flame.attach();      // flame breath and grafted parts drawn (Godrick, js/flame.js)
  holy.attach();       // teleport flashes, floor runes and light pillars drawn (Radagon, js/holy.js)
  scarlet.attach();    // the lifesteal burst (Malenia, js/scarlet.js; her phantoms and bloom are spectral shapes)
  registerAudioListeners();
}

const isKey = (group, code) => MENU_KEYS[group].includes(code);
window.addEventListener('keydown', ev => {
  const code = ev.code;
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing) return;
  if (multiplayer.panelOpen) {
    if (code === 'Escape') { ev.preventDefault(); if (!ev.repeat) multiplayer.lobbyBack(); }
    return;
  }
  input.use('keyboard');
  if (multiplayer.spectatorKey(ev)) return;
  if (code === SYSTEM_KEYS.help) {
    ev.preventDefault();
    if (!ev.repeat && Game.mode === 'play') hud.help.classList.toggle('hidden');
    return;
  }
  if (Game.mode === 'menu' || Game.mode === 'pause') {
    if (code === 'Tab') { ev.preventDefault(); if (!ev.repeat) Game.menuStep(ev.shiftKey ? 'up' : 'down'); return; }
    if (code === 'Home' || code === 'End') { ev.preventDefault(); Game.select(code === 'Home' ? 0 : Game.menuItems.length - 1, true); return; }
    if (ev.repeat) return;
    const dir = ['up', 'down', 'left', 'right'].find(d => isKey(d, code));
    const handled = dir ? Game.menuStep(dir) || true
      : isKey('confirm', code) ? Game.confirm() || true
      : isKey('back', code) ? Game.menuBack() || true : false;
    if (handled) ev.preventDefault();
    return;
  }
  if (!GAME_CODES.has(code)) return;
  ev.preventDefault();
  if (ev.repeat) return;
  if (code === SYSTEM_KEYS.pause) Game.pause(false);
  else if (code === SYSTEM_KEYS.restart) Game.requestRestart();
  else input.down(code);
});
window.addEventListener('keyup', ev => input.up(ev.code));
function suspendInput() {
  input.suspended = true;
  Game.clearControls(); gamepad.release(); gamepad.neutralRequired = true;
  // Online combat keeps running; returning always requires a deliberate Resume in solo play.
  if (!multiplayer.active()) Game.pause(true, true);
}
window.addEventListener('blur', suspendInput);
window.addEventListener('focus', () => { input.suspended = document.hidden; });
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendInput(); else input.suspended = !document.hasFocus(); });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());
let pointerCaptureFailed = false;
document.addEventListener('pointerlockerror', () => { pointerCaptureFailed = true; });
canvas.addEventListener('mousedown', ev => {
  input.use('keyboard');
  if (multiplayer.spectatorMode) return;
  if (Game.mode !== 'play') return;
  ev.preventDefault();
  // The click that captures the mouse only captures it; it does not also swing the sword.
  if (!document.pointerLockElement && canvas.requestPointerLock && !pointerCaptureFailed) {
    try {
      const capture = canvas.requestPointerLock();
      if (capture && capture.catch) capture.catch(() => { pointerCaptureFailed = true; });
      return;
    } catch (e) { pointerCaptureFailed = true; }   // unsupported: fall through and attack
  }
  if (GAME_CODES.has('Mouse' + ev.button)) input.down('Mouse' + ev.button);
});
window.addEventListener('mouseup', ev => input.up('Mouse' + ev.button));
// The side buttons (3 back, 4 forward) block: they never send the browser back or forward. Browsers navigate on
// different ones of these events, so all three are stopped.
for (const type of ['mousedown', 'mouseup', 'auxclick'])
  window.addEventListener(type, ev => { if (ev.button === 3 || ev.button === 4) ev.preventDefault(); });
document.addEventListener('mousemove', ev => {
  // Moving the mouse in a menu brings the pointer back (after a gamepad hid it).
  if (!document.pointerLockElement && Game.mode !== 'play' && Math.abs(ev.movementX) + Math.abs(ev.movementY) > 3) input.use('keyboard');
  if (document.pointerLockElement === canvas) Game.mouseLook(ev.movementX, ev.movementY);
});
// Leaving pointer capture (the browser uses Escape for this) opens the pause menu.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && Game.mode === 'play') Game.pause(true);
});

function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  visuals.resize(w, h);   // renderer, post-processing and particle sizes
  hud.layout();           // the HUD stage scale and compact mode
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

// Data check first: a broken reference stops here with a readable message.
const dataErrors = validateData().concat(validateAudio());
if (dataErrors.length) {
  window.__bootError('The game data has problems:\n\n• ' + dataErrors.join('\n• '));
  throw new Error('Game data check failed: ' + dataErrors.join(' | '));
}
// Death overlay timings follow CONFIG.death.
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--died-delay', CONFIG.death.textDelay + 's');
rootStyle.setProperty('--died-fade', CONFIG.death.textFade + 's');
rootStyle.setProperty('--died-hint-delay', CONFIG.death.hintDelay + 's');
rootStyle.setProperty('--dying-fade', CONFIG.death.slowTime + 's');
rootStyle.setProperty('--fade-time', CONFIG.nextLevel.fadeTime + 's');
registerListeners();
window.addEventListener('resize', resize);
resize();
autoQuality.firstRun();   // first launch only: the preset this machine should start on (js/autoquality.js)
applySettings();
$('version').textContent = VERSION;
Game.showMenu('main');
autoQuality.show();

// Fixed-step simulation, rendering at the display's native rate with interpolation.
let lastTime = performance.now(), accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;
  gamepad.poll(frameDt);   // in menus too: the pad navigates them
  multiplayer.heartbeat(now);
  document.body.classList.toggle('no-cursor', !multiplayer.panelOpen && !multiplayer.spectatorMode && (Game.mode === 'play' || input.device === 'pad'));   // spectator controls also accept clicks
  if ((Game.mode !== 'play' && !(multiplayer.active() && ['pause', 'ending'].includes(Game.mode))) || Game.manualClock) { accumulator = 0; return; }   // online menus/credits keep the shared stream running
  if (Game.loading > 0) { Game.tickLoading(frameDt); accumulator = 0; Game.render(0, frameDt); return; }   // the loading screen holds the world
  accumulator += frameDt * Game.timeScale;   // timeScale < 1: the F6 slow motion of developer builds
  let steps = 0;
  while (accumulator >= CONFIG.step && steps < CONFIG.maxSteps) { input.tick(CONFIG.step); Game.update(CONFIG.step); accumulator -= CONFIG.step; steps++; }
  if (accumulator >= CONFIG.step) accumulator = 0;   // stalled tab: drop the backlog instead of catching up
  if (Game.mode !== 'ending') Game.render(accumulator / CONFIG.step, frameDt);
}
requestAnimationFrame(frame);

// Console handle for tuning and testing.
window.__arena = { Game, story, elden, spectral, ELDEN_BOSSES, ELDEN_BOSS_DEFS, STORY, CONFIG, VERSION, PLAYER_DEF, ITEMS, ENEMY_DEFS, ENEMY_BY_ID, LEVELS, TEST_LEVELS, ALL_LEVELS, TEST_DEFS, crowd, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, TUTORIAL, ARENA, TEST_HEIGHTS, TEST_COURTYARD, TEST_MIXED, TEST_TOWN, makeStrike,
                   PS, ES, input, gamepad, hud, settings, camera, renderer, events, validateData, visuals, terrainFor, Enemy, projectiles, finale, LEVEL_5, lore, LORE,
                   STORIES, LANDS_STORY, LANDS_LEVELS, LANDS_ENEMY_DEFS, realms, LANDS_1, LANDS_2, LANDS_3, LANDS_4, LANDS_5, LANDS_6, LANDS_7, LANDS_8,
                   get world() { return world; } };
window.__arena.multiplayer = multiplayer;
window.__arenaReady = true;
KIT.prewarm();   // bake model textures and geometry in the background while the menus are up
