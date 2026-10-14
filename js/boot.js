'use strict';
// ============================================================================
// 12. Bootstrap
// ============================================================================
// Event listeners: visual effects, souls and the tutorial, each in one place.
function registerListeners() {
  const F = CONFIG.fx.bursts, chest = b => ({ x: b.x, y: b.y + b.height * 0.6, z: b.z });
  events.on('strike', d => {
    const kind = d.blocked ? 'block' : d.attacker === Game.player ? (d.strike.riposte ? 'riposte' : 'hit') : 'hurt';
    spawnBurst(d.at, F[kind]);
  });
  events.on('parry', d => { spawnBurst(chest(d.target), F.parry); Game.addShake(CONFIG.parry.shakeTime, CONFIG.parry.shakeAmp); });
  events.on('postureBreak', d => {
    spawnBurst({ x: d.enemy.x, y: d.enemy.y + d.enemy.height * 0.65, z: d.enemy.z }, F.postureBreak);
    Game.addShake(CONFIG.fx.postureBreakShake.time, CONFIG.fx.postureBreakShake.amp);
  });
  events.on('land', d => { groundFx.spawn(d.x, d.z, d.fx); Game.addShake(CONFIG.groundPound.shakeTime, d.fx.shake); });
  events.on('stainRecovered', d => spawnBurst({ x: d.x, y: 0.6, z: d.z }, F.stain));
  events.on('alert', d => spawnBurst({ x: d.enemy.x, y: d.enemy.y + d.enemy.height + 0.3, z: d.enemy.z }, F.alert));
  events.on('enemyDeath', d => { if (Game.player) Game.player.souls += d.enemy.def.souls || 0; });
  events.onAny((type, data) => Game.onTutorialEvent(type, data));
  events.on('device', () => { hud.buildTexts(Game); Game.showMenuHint(); });   // labels follow keyboard or gamepad
  registerVisualListeners();
}

const isKey = (group, code) => MENU_KEYS[group].includes(code);
window.addEventListener('keydown', ev => {
  const code = ev.code;
  input.use('keyboard');
  if (code === SYSTEM_KEYS.help) {
    ev.preventDefault();
    if (!ev.repeat && Game.mode === 'play') hud.help.classList.toggle('hidden');
    return;
  }
  if (Game.mode === 'menu' || Game.mode === 'pause') {
    if (code === 'Tab') ev.preventDefault();
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
  else if (code === SYSTEM_KEYS.hitboxes) { settings.hitboxes = !settings.hitboxes; saveSettings(); applySettings(); }
  else input.down(code);
});
window.addEventListener('keyup', ev => input.up(ev.code));
window.addEventListener('blur', () => input.held.clear());
hud.toggle.addEventListener('change', () => { settings.hitboxes = hud.toggle.checked; saveSettings(); });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());
canvas.addEventListener('mousedown', ev => {
  input.use('keyboard');
  if (Game.mode !== 'play') return;
  ev.preventDefault();
  // The click that captures the mouse only captures it; it does not also swing the sword.
  if (!document.pointerLockElement && canvas.requestPointerLock) {
    try { canvas.requestPointerLock(); return; } catch (e) { /* unsupported: fall through and attack */ }
  }
  if (ev.button === 0 || ev.button === 2) input.down('Mouse' + ev.button);
});
window.addEventListener('mouseup', ev => input.up('Mouse' + ev.button));
document.addEventListener('mousemove', ev => {
  if (document.pointerLockElement === canvas) Game.mouseLook(ev.movementX, ev.movementY);
});
// Leaving pointer capture (the browser uses Escape for this) opens the pause menu.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && Game.mode === 'play') Game.pause(true);
});
window.addEventListener('wheel', ev => {
  input.use('keyboard');
  if (Game.mode !== 'play') return;
  Game.stepZoom(ev.deltaY > 0 ? 1 : -1);
}, { passive: true });

function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  visuals.resize(w, h);   // renderer, post-processing and particle sizes
  camera.aspect = w / h; camera.updateProjectionMatrix();
}

// Data check first: a broken reference stops here with a readable message.
const dataErrors = validateData();
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
applySettings();
Game.showMenu('main');

// Fixed-step simulation, rendering at the display's native rate with interpolation.
let lastTime = performance.now(), accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;
  gamepad.poll(frameDt);   // in menus too: the pad navigates them
  if (Game.mode !== 'play') { accumulator = 0; return; }   // menus and pause: simulation stopped
  accumulator += frameDt;
  let steps = 0;
  while (accumulator >= CONFIG.step && steps < CONFIG.maxSteps) { Game.update(CONFIG.step); accumulator -= CONFIG.step; steps++; }
  if (accumulator >= CONFIG.step) accumulator = 0;   // stalled tab: drop the backlog instead of catching up
  Game.render(accumulator / CONFIG.step, frameDt);
}
requestAnimationFrame(frame);

// Console handle for tuning and testing.
window.__arena = { Game, CONFIG, PLAYER_DEF, ITEMS, ENEMY_DEFS, ENEMY_BY_ID, LEVELS, LEVEL_1, LEVEL_2, TUTORIAL, ARENA,
                   PS, ES, input, gamepad, hud, settings, camera, renderer, events, validateData, visuals, get world() { return world; } };
window.__arenaReady = true;
