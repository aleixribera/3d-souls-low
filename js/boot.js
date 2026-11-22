'use strict';
const bootReplay = typeof replayView === 'undefined' ? null : replayView;
// ============================================================================
// 12. Bootstrap
// ============================================================================
// Event listeners: visual effects, each in one place (the lesson cards listen in js/lessons.js).
function registerListeners() {
  const F = CONFIG.fx.bursts, chest = b => ({ x: b.x, y: b.y + b.height * 0.6, z: b.z });
  events.on('strike', d => {
    const kind = d.blocked || d.plated ? 'block' : d.attacker instanceof Player ? (d.strike.riposte ? 'riposte' : 'hit') : 'hurt';
    spawnBurst(d.at, F[kind]);
  });
  events.on('chargeFull', d => { if (!d.player || d.player === Game.player) Game.addShake(CONFIG.player.chargeShake.time, CONFIG.player.chargeShake.amp); });
  events.on('parry', d => { spawnBurst(chest(d.target), F.parry); if (!d.player || d.player === Game.player) Game.addShake(CONFIG.parry.shakeTime, CONFIG.parry.shakeAmp); });
  // The Finishing Blow's cracks, steps and cuts: js/finisher-fx.js (pass 103).
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
  events.on('device', () => { hud.buildTexts(Game); Game.showMenuHint(); couchScale(); });   // labels follow keyboard or gamepad
  registerVisualListeners();
  registerHudListeners();
  spectral.attach();   // spectral weapons drawn for `spectral` attacks
  blackBlade.attach(); // the cursed sphere and line blasts drawn (`destined`, `sphere` attacks; js/blackblade.js)
  flame.attach();      // flame breath and revealed parts drawn (`breath` attacks, phase `reveal`; js/flame.js)
  holy.attach();       // teleport flashes, floor runes and light pillars drawn (`blink`, `sigil` hits; js/holy.js)
  abilityFx.attach(); // Boss Rush's legendaries drawn (`abilityPower`, `abilityPerk`; js/ability-fx.js)
  summonBeasts.attach(); // the Grave Hound and the Cinder Fox drawn (js/summon-beasts.js)
  summonLantern.attach(); // the Lantern Spirit drawn (js/summon-lantern.js)
  summonBirds.attach(); // the Thunder Hawk and the Night Owl drawn (js/summon-birds.js)
  summonCrows.attach(); // the Ink Crows drawn (js/summon-crows.js)
  afterimage.attach();  // the dash's afterimages (js/afterimage.js)
  counterFx.attach();   // the counter window's dim and mark, the counter's cut (js/counter-fx.js)
  finisherFx.attach();  // the Finishing Blow's cracks, stopped time, steps and cuts (js/finisher-fx.js)
  abilityTouch.attach(); // the plain commons' small touches (js/ability-touch.js)
  commonFx.attach();     // the blade's commons drawn (js/common-fx.js)
  rareFx.attach();       // the rares' perks drawn (js/rare-fx.js)
  rareStrikeFx.attach(); // the rares' new triggers drawn (js/rare-strike-fx.js)
  strikeFx.attach();     // Strike I, the key-1 shapes on the ground drawn (js/strike-fx.js)
  strikeFx2.attach();    // Strike II, the flashy key-1 strikes drawn (js/strike-fx-2.js)
  guardFx.attach();      // Guard I, the key-2 guards on yourself drawn (js/guard-fx.js)
  guardFx2.attach();     // Guard II, the key-2 guards that answer the boss drawn (js/guard-fx-2.js)
  legendFx3.attach();    // Ultimates I drawn: the dragon, the cataclysm, the lance, the lotus, the tempest, the world dim (js/legend-fx-3.js)
  legendFx4.attach();    // Ultimates II drawn: the wave, the sky blade, the firebird, the black star (js/legend-fx-4.js; after legendFx3, whose dim it adds to)
  legendFx5.attach();    // Ultimates III drawn: the ink world, the cut, the giant, the legion (js/legend-fx-5.js)
  storyFx.attach();      // Story's four drawn: the scarf, the shield, the Seven, the bell (js/story-fx.js); after legendFx5, its ink the stronger
  legendFx2.attach();    // Legendaries II drawn: the suns, the lightning dash, Fourfold's threads, the shade clones (js/legend-fx-2.js)
  summonFigures.attach(); // the Stone Guardian, the Lancer of Ash, the Bone Archer, the Ronin Shade and the Puppet Knight drawn (js/summon-figures.js)
  summonBrutes.attach(); // the Ash Bear and the Glass Mantis drawn (js/summon-brutes.js)
  summonCoil.attach();   // the Mire Serpent drawn (js/summon-coil.js)
  registerAudioListeners();
}

const isKey = (group, code) => MENU_KEYS[group].includes(code);
window.addEventListener('keydown', ev => {
  if (bootReplay?.enabled) return;   // the replay viewer has its own keys (js/replay.js)
  const code = ev.code;
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing) return;
  // The Controls screen waits for a new key: this one is it (Escape keeps the old one).
  if (Game.rebinding && Game.mode !== 'play' && Game.screen === 'controls' && !$('menu').classList.contains('hidden')) { ev.preventDefault(); input.use('keyboard'); if (!ev.repeat) Game.finishRebind(code); return; }
  if (multiplayer.panelOpen) {
    if (code === 'Escape') { ev.preventDefault(); if (!ev.repeat) multiplayer.lobbyBack(); }
    return;
  }
  input.use('keyboard');
  if (multiplayer.spectatorKey(ev)) return;
  if (abilityLab.key(ev)) return;   // B: the ability grounds' list
  if (code === SYSTEM_KEYS.help) {
    ev.preventDefault();
    if (!ev.repeat && Game.mode === 'play') hud.help.classList.toggle('hidden');
    return;
  }
  if (Game.mode === 'menu' || Game.mode === 'pause') {
    if (code === 'Tab') { ev.preventDefault(); if (!ev.repeat) Game.menuStep(ev.shiftKey ? 'prev' : 'next'); return; }
    if (code === 'Home' || code === 'End') { ev.preventDefault(); Game.menuTouched = true; Game.select(code === 'Home' ? 0 : Game.menuItems.length - 1, true); return; }
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
  // Online combat keeps running; returning always requires a deliberate Resume in solo play (Boss Rush alone too).
  // A replay just goes on.
  if ((!multiplayer.active() || multiplayer.alone) && !bootReplay?.enabled) Game.pause(true, true);
}
window.addEventListener('blur', suspendInput);
window.addEventListener('focus', () => { input.suspended = document.hidden; });
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendInput(); else input.suspended = !document.hasFocus(); });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());
// A lost WebGL context (a GPU driver reset, a crashed GPU process): three.js stops drawing and asks for it back; the
// world must not go on unseen. Solo play holds behind "Graphics stopped" (online, the run goes on, as in Pause). When
// the browser restores it, three.js rebuilds its GPU state on the next draw and the game returns to Pause (or the title).
canvas.addEventListener('webglcontextlost', () => {
  if (Game.graphicsLost || bootReplay?.enabled) return;   // a replay just goes on, and draws again once restored
  Game.graphicsLost = true; Game.graphicsInGame = ['play', 'pause', 'loading', 'lab'].includes(Game.mode);
  Game.clearControls(); gamepad.release(); gamepad.holdSteps();
  if (abilityLab.isOpen()) abilityLab.close();   // its Game.resume() holds behind the screen below
  Game.showMenu('graphicsLost');
  events.emit('graphicsLost');
});
canvas.addEventListener('webglcontextrestored', () => {
  if (!Game.graphicsLost) return;
  Game.graphicsLost = false;
  if (Game.screen === 'graphicsLost') Game.showMenu(Game.graphicsInGame ? 'pause' : 'main');
  events.emit('graphicsRestored');
});
let pointerCaptureFailed = false;
document.addEventListener('pointerlockerror', () => { pointerCaptureFailed = true; });
canvas.addEventListener('mousedown', ev => {
  if (bootReplay?.enabled) return;   // a replay's camera is dragged, never captured
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
// The side buttons (3 back, 4 forward) are not bound (v7.19.1), but they never send the browser back or forward out of
// the game. Browsers navigate on different ones of these events, so all three are stopped.
for (const type of ['mousedown', 'mouseup', 'auxclick'])
  window.addEventListener(type, ev => { if (ev.button === 3 || ev.button === 4) ev.preventDefault(); });
document.addEventListener('mousemove', ev => {
  // Moving the mouse in a menu brings the pointer back (after a gamepad hid it).
  if (!document.pointerLockElement && Game.mode !== 'play' && Math.abs(ev.movementX) + Math.abs(ev.movementY) > 3) input.use('keyboard');
  if (document.pointerLockElement === canvas) Game.mouseLook(ev.movementX, ev.movementY);
});
// Leaving pointer capture (the browser uses Escape for this) opens the pause menu.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && Game.mode === 'play' && !bootReplay?.enabled) Game.pause(true);
});

// On a controller the player is likely on a couch before a television: the menus (laid out for a 1280x720 window) grow
// with the window like the HUD, to at most CONFIG.hud.couchMax (1.5 at 1080p, so a 1080p screen lays them out as 720p).
// Keyboard and mouse keep them at their own size. js/ui-theme.js zooms the screens by --couch under html.couch.
function couchScale() {
  const H = CONFIG.hud, k = Math.min(H.couchMax, window.innerWidth / H.refWidth, window.innerHeight / H.refHeight);
  const on = usingPad() && k > 1.05, root = document.documentElement;
  root.classList.toggle('couch', on);
  if (on) root.style.setProperty('--couch', k.toFixed(3)); else root.style.removeProperty('--couch');
}
function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  visuals.resize(w, h);   // renderer, post-processing and particle sizes
  hud.layout();           // the HUD stage scale and compact mode
  couchScale();           // the menus' size on a television
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
// Moving to a screen of another scale (or zooming) changes the pixel ratio without always resizing the window. The
// scene follows the screen's own resolution (qualityDraw, js/visuals.js), so redraw at the new ratio.
(function watchPixelRatio() {
  try { matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener('change', () => { resize(); watchPixelRatio(); }, { once: true }); }
  catch (e) { /* no matchMedia: window resizes still apply */ }
})();
resize();
autoQuality.firstRun();   // first launch only: the preset this machine should start on (js/autoquality.js)
applySettings();
$('version').textContent = VERSION;
// The replay door's page (/watch) opens the viewer, never the title, the showcase or the sparring scene.
if (bootReplay?.enabled) bootReplay.boot();
else {
Game.showMenu('main');
autoQuality.show();
// A launch on a new version plays the showcase, once a day at most (js/showcase.js). After it, the very first launch
// goes on to the sparring scene for a new player (js/sparring.js); every launch offers that scene to a player from before.
const toTitle = () => { if (!sparring.offerAtLaunch()) Game.showMenu('main'); };
if (!showcase.firstLaunch(first => first ? sparring.offerAtLaunch() || sparring.before(() => Game.showMenu('main')) : toTitle())) sparring.offerAtLaunch();
}

// Fixed-step simulation, rendering at the display's native rate with interpolation.
let lastTime = performance.now(), accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const frameDt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;
  gamepad.poll(frameDt);   // in menus too: the pad navigates them
  multiplayer.heartbeat(now);
  if (Game.mode === 'pause') Game.tickPause();   // online, pause's run clock goes on (redrawn once a second)
  document.body.classList.toggle('no-cursor', !bootReplay?.enabled && !multiplayer.panelOpen && !multiplayer.spectatorMode && !multiplayer.abilityOpen && (Game.mode === 'play' || input.device === 'pad'));   // spectator controls also accept clicks
  if ((Game.mode !== 'play' && !(multiplayer.active() && (Game.mode === 'ending' || Game.mode === 'pause' && !multiplayer.alone))) || Game.manualClock) { accumulator = 0; lobbyScene.frame(frameDt); return; }   // online menus/credits keep the shared stream running; alone, pause holds. The lobby's scene draws itself (js/lobby-scene.js)
  if (Game.loading > 0) { Game.tickLoading(frameDt); accumulator = 0; Game.render(0, frameDt); return; }   // the loading screen holds the world
  accumulator += frameDt * Game.timeScale * dodgeMoment.scale(frameDt);   // timeScale < 1: the F6 slow motion of developer builds; a perfect dodge's beat (js/dodge-moment.js)
  let steps = 0;
  while (accumulator >= CONFIG.step && steps < CONFIG.maxSteps) { input.tick(CONFIG.step); Game.update(CONFIG.step); accumulator -= CONFIG.step; steps++; }
  if (accumulator >= CONFIG.step) accumulator = 0;   // stalled tab: drop the backlog instead of catching up
  if (Game.mode !== 'ending') Game.render(accumulator / CONFIG.step, frameDt);
}
requestAnimationFrame(frame);

// Console handle for tuning and testing.
window.__arena = { Game, story, spectral, STORY, CONFIG, VERSION, PLAYER_DEF, ITEMS, ENEMY_DEFS, ENEMY_BY_ID, LEVELS, TEST_LEVELS, ALL_LEVELS, TEST_DEFS, crowd, LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, ARENA, LESSONS, lessons, worldHints, sparring, SPARRING_DRILLS, TEST_HEIGHTS, TEST_COURTYARD, TEST_MIXED, TEST_TOWN, makeStrike,
                   PS, ES, input, gamepad, hud, settings, camera, renderer, events, validateData, visuals, terrainFor, Enemy, projectiles, finale, LEVEL_5, LEVEL_6, LEVEL_7, LEVEL_8, LEVEL_9, LEVEL_10, LEVEL_11, LEVEL_12, LEVEL_13, LEVEL_14, lore, LORE,
                   STORIES, realms,
                   get world() { return world; } };
window.__arena.multiplayer = multiplayer;
window.__arena.replay = bootReplay;
window.__arenaReady = true;
window.__bootComplete();
KIT.prewarm();   // bake model textures and geometry in the background while the menus are up
