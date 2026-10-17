'use strict';
// ============================================================================
// 10. HUD
// ============================================================================
// Drawing only: the HUD reads the game (player, enemies, zones, target) and listens to events; it never writes to
// them. Its own state (lag trails, pulse timers, the calm level) lives on `hud`. All numbers are in CONFIG.hud;
// the layout (anchors, frames, colours) is in the page's stylesheet. Anchors (see #stage): top left, the player's
// vitals; top centre, the boss bar and the tutorial prompt; bottom centre, warnings,
// notices and the interaction prompt; bottom left, help.
const $ = id => document.getElementById(id);
const clamp01 = v => Math.max(0, Math.min(1, v));
// A bar that drops at once but drains its trailing highlight slowly, after a short hold.
class LagMeter {
  constructor(value = 1) { this.set(value); }
  set(value) { this.value = this.trail = this.last = value; this.hold = 0; }
  update(value, dt) {
    if (value < this.last - 1e-4) this.hold = CONFIG.hud.trailHold;   // a fresh loss: the trail waits, then drains
    this.last = value; this.value = value;
    if (value >= this.trail) this.trail = value;
    else if (this.hold > 0) this.hold -= dt;
    else this.trail = Math.max(value, this.trail - dt * CONFIG.fx.trailDrain);
    return this.trail;
  }
}
// Retriggers a CSS animation class (hit shake, empty pulse): drop it, force a reflow, add it back.
const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const keycap = label => label.replace(/^\[\s*|\s*\]$/g, '');   // "[ F ]" -> "F"
const hud = {
  root: $('hud'), pHp: $('pHp'), pHpFill: $('pHpFill'), pHpTrail: $('pHpTrail'), pHpCut: $('pHpCut'),
  pSt: $('pSt'), pExhaust: $('pExhaust'), diedTip: $('diedTip'), pStFill: $('pStFill'), pStTrail: $('pStTrail'), flaskRow: $('pFlasks'), flasks: [],
  eBars: $('eBars'), eHp: $('eHpFill'), eTrail: $('eHpTrail'), eName: $('eName'), eDmg: $('eDmg'), ePost: $('ePost'), ePostFill: $('ePostFill'),
  died: $('died'), won: $('won'), complete: $('complete'), rested: $('rested'), prompt: $('prompt'), promptKey: $('promptKey'), promptText: $('promptText'), talk: $('talk'), talkKey: $('talkKey'), talkText: $('talkText'), execCue: $('execCue'), execKey: $('execKey'),
  sub: $('subtitle'), subName: $('subName'), subText: $('subText'),
  confirm: $('confirm'), toasts: $('toasts'), vignette: $('vignette'),
  tutPrompt: $('tutPrompt'), tutStep: $('tutStep'), tutText: $('tutText'), tutHint: $('tutHint'), tutDone: $('tutDone'),
  help: $('help'), toggle: $('hbToggle'),
  // State of its own. Timers count down in seconds; the listeners at the bottom of this file set them.
  hpLag: new LagMeter(), stLag: new LagMeter(), bossLag: new LagMeter(), calm: 0, idle: 0, clock: 0,
  target: null, restedTimer: 0, lastPosture: 0, postFlash: 0, lastBossHp: 0, tally: 0, tallyTimer: 0,
  healTimer: 0, hurtTimer: 0, refundTimer: 0, deniedTimer: 0, wasAlive: true, popFlask: -1, wasEmpty: false, toastList: [],
  // Texts built from the live key bindings and the current level.
  buildTexts(game) {
    const rows = [
      ['Move', moveLabel()], ['Camera', usingPad() ? 'Right stick' : 'Mouse (click the view to capture it)'],
      ['Jump', bindLabel('jump')], ['Roll', bindLabel('roll')],
      ['Light attack', bindLabel('light')], ['Heavy attack', bindLabel('heavy')],
      ['Jump attack', 'Light or heavy while airborne'],
      ['Block (hold)', usingPad() ? bindLabel('block') : `[ ${ACTIONS.block.filter(c => !isPadCode(c)).map(keyLabel).filter((v, i, a) => a.indexOf(v) === i).join(' / ')} ]`],
      ['Parry', `${bindLabel('parry')} just before the blow lands`],
      ['Lock-on', bindLabel('lock')], ['Switch target', `${bindLabel('switchTarget')} while locked on`],
      ['Zoom in / out', `${bindLabel('zoomIn', 'Wheel up')} ${bindLabel('zoomOut', 'Wheel down')}`],
      ['Rest at bonfire', bindLabel('rest')], ['Use flask', bindLabel('flask')], ['Talk / read', bindLabel('talk')],
      ['Restart', `${systemLabel('restart')} twice`], ['Pause', systemLabel('pause')], ['Help', `[ ${keyLabel(SYSTEM_KEYS.help)} ]`],
    ];
    const table = $('helpTable'); table.textContent = '';
    for (const [k, v] of rows) {
      const tr = table.insertRow(); tr.insertCell().textContent = k; tr.insertCell().textContent = v;
    }
    $('hbLabel').textContent = `Show hitboxes ${systemLabel('hitboxes')}`;
    $('helpLevel').textContent = game.level ? game.level.help || '' : '';
    $('helpHint').textContent = usingPad() ? '' : `${keyLabel(SYSTEM_KEYS.help)}: help`;
    $('wonHint').textContent = game.eldenBoss ? CONFIG.elden.victoryHint : `${systemLabel('restart')} to fight again · ${systemLabel('pause')} to pause`;
    const next = game.level && game.level.next && ALL_LEVELS.find(l => l.id === game.level.next);
    $('completeHint').textContent = game.level && game.level.completeHint ? game.level.completeHint : next ? `Onward to ${next.name}…`
      : `${systemLabel('restart')} to restart · ${systemLabel('pause')} to pause and leave`;
    this.pExhaust.textContent = CONFIG.hud.text.exhausted;
    this.promptKey.textContent = keycap(bindLabel('rest'));
    this.talkKey.textContent = keycap(bindLabel('talk'));
    this.execKey.textContent = keycap(bindLabel('light'));
    this.restText = 'Rest at bonfire';
    this.confirm.textContent = `Press ${systemLabel('restart')} again to restart from the beginning`;
  },
  reset(game) {
    this.hpLag.set(1); this.stLag.set(1); this.bossLag.set(1);
    this.target = null; this.restedTimer = 0; this.idle = 0; this.calm = 0; this.tally = this.tallyTimer = 0;
    this.healTimer = this.hurtTimer = this.refundTimer = this.deniedTimer = 0; this.wasAlive = true; this.popFlask = -1; this.wasEmpty = false;
    for (const t of this.toastList) t.el.remove();
    this.toastList = [];
    for (const el of [this.died, this.won, this.complete, this.rested]) el.classList.remove('show');
    this.buildTexts(game);
    this.layout();
  },
  showRested() { this.restedTimer = CONFIG.rest.messageTime; },

  // ---- layout ----------------------------------------------------------------------------------
  // The stage scale: fit a design-size window to the real one by its tighter side, within limits, times the
  // player's HUD scale. Called on resize and when the setting changes.
  layout() {
    const H = CONFIG.hud, w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const u = Math.max(H.minScale, Math.min(H.maxScale, Math.min(w / H.refWidth, h / H.refHeight))) * settings.hudScale;
    const st = this.root.style;
    st.setProperty('--u', u.toFixed(4));
    st.setProperty('--calm-dim', H.calmDim);
    st.setProperty('--hit-shake', H.hitShake + 's');
    st.setProperty('--toast-time', H.toastTime + 's');
    this.scale = u;
    this.root.classList.toggle('narrow', w / u < H.narrowWidth);
  },

  // ---- pieces ----------------------------------------------------------------------------------
  // Flask icons follow the inventory's capacity, so upgrades show. A flask just drunk pops as it empties.
  syncFlasks(it) {
    while (this.flasks.length < it.max) { const f = document.createElement('span'); f.className = 'flask'; this.flaskRow.appendChild(f); this.flasks.push(f); }
    while (this.flasks.length > it.max) this.flasks.pop().remove();
    this.flasks.forEach((f, i) => f.classList.toggle('full', i < it.count));
    if (this.popFlask >= 0 && this.flasks[this.popFlask]) restart(this.flasks[this.popFlask], 'pop');
    this.popFlask = -1;
    this.flaskRow.classList.toggle('dry', it.count === 0 && it.max > 0);
  },
  // Overhead bars: one per engaged, non-boss enemy in sight. Bosses use the big bar at the top instead.
  tagRoot: $('eTags'), tags: [], tagPos: new THREE.Vector3(),
  updateTags(game, dt) {
    const p = game.player, v = this.tagPos, F = CONFIG.fx;
    const w = window.innerWidth, h = window.innerHeight, s = this.scale;
    camera.updateMatrixWorld();
    let n = 0;
    for (const e of game.enemies) {
      if (!e.alive() || !e.awake() || e.asleep || (e.training && !(e.def.stagger && e.def.stagger.showBar)) || e.def.posture) continue;
      if (e.in('unaware') && e.hp >= e.def.hp && e !== game.lock) continue;   // untouched and unaware: no bar yet
      const q = e.rig.root.position;
      if (Math.hypot(q.x - p.x, q.z - p.z) > F.tagRange || gateBetween(p, e)) continue;
      v.set(q.x, q.y + e.height + F.tagGap, q.z).project(camera);
      if (v.z >= 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      let t = this.tags[n++];
      if (!t) {
        const el = document.createElement('div'); el.className = 'eTag';
        el.innerHTML = '<div class="trail"></div><div class="hp"></div>';
        const gEl = document.createElement('div'); gEl.className = 'eTag eGuard';   // shield guard meter, under the bar
        gEl.innerHTML = '<div class="po"></div>';
        this.tagRoot.append(el, gEl);
        t = { el, trail: el.children[0], hp: el.children[1], gEl, guard: gEl.children[0], enemy: null, lag: new LagMeter() };
        this.tags.push(t);
      }
      const at = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%) scale(${s})`;
      const G = e.def.guard || e.def.stagger;
      if (G) {
        const broken = e.state === ES.BROKEN;
        t.guard.style.width = (broken ? 100 : e.guardMeter / G.max * 100) + '%';
        t.gEl.classList.toggle('broken', broken);
        t.gEl.style.transform = `${at} translateY(8px)`;
      }
      t.gEl.style.display = G ? 'block' : 'none';
      const eh = e.hp / e.def.hp;
      if (t.enemy !== e) { t.enemy = e; t.lag.set(eh); }
      const trail = t.lag.update(eh, dt);
      t.hp.style.width = eh * 100 + '%'; t.trail.style.width = trail * 100 + '%';
      t.el.classList.toggle('locked', e === game.lock);
      t.el.style.transform = at;
      t.el.style.display = 'block';
    }
    for (let i = n; i < this.tags.length; i++) { this.tags[i].el.style.display = this.tags[i].gEl.style.display = 'none'; this.tags[i].enemy = null; }
  },
  // Player vitals: health with a lag trail, a heal glow, a hit shake and a low-health pulse; stamina with a trail of
  // what was just spent, a pause shade while it waits to regenerate, an empty pulse, a winded flush and a refund glow.
  updateVitals(game, dt) {
    const H = CONFIG.hud, p = game.player;
    const ph = clamp01(p.hp / p.maxHp), sp = clamp01(p.stamina / p.maxStamina);
    if (ph > this.hpLag.last + 0.004) this.healTimer = H.healFlash;
    if (ph < this.hpLag.last - 0.004) { restart(this.pHp, 'hit'); this.pHp.addEventListener('animationend', () => this.pHp.classList.remove('hit'), { once: true }); }
    const hpTrail = this.hpLag.update(ph, dt);
    this.pHpFill.style.width = ph * 100 + '%'; this.pHpTrail.style.width = hpTrail * 100 + '%';
    this.pHpCut.style.width = (1 - p.hpCap() / p.maxHp) * 100 + '%';   // Destined Death's cut, at the right end (v5.8)
    const low = p.alive() && ph <= H.lowHp;
    this.pHp.classList.toggle('low', low);
    this.pHp.classList.toggle('heal', this.healTimer > 0);

    const empty = sp <= 0.001;
    if (empty && !this.wasEmpty) { restart(this.pSt, 'empty'); this.pSt.addEventListener('animationend', () => this.pSt.classList.remove('empty'), { once: true }); }
    this.wasEmpty = empty;
    const stTrail = this.stLag.update(sp, dt * 4);   // spent stamina trails away faster than health
    this.pStFill.style.width = sp * 100 + '%'; this.pStTrail.style.width = stTrail * 100 + '%';
    this.pSt.classList.toggle('exhausted', !!p.exhausted);
    this.pExhaust.classList.toggle('show', !!p.exhausted && p.alive());
    this.pExhaust.classList.toggle('flash', this.deniedTimer > 0 && !!p.exhausted);
    this.pSt.classList.toggle('waiting', p.staminaDelay > 0 && sp < 1);
    this.pSt.classList.toggle('refund', this.refundTimer > 0);
    this.syncFlasks(p.item('flask'));

    // Screen edge: a steady red at low health, beating with the heart; a flare when a blow lands.
    const beat = low ? H.critVignette * (0.6 + 0.4 * Math.sin(this.clock * H.heartRate)) * (1 - ph / H.lowHp * 0.5) : 0;
    const hurt = H.hurtVignette * clamp01(this.hurtTimer / H.hurtTime);
    this.vignette.style.opacity = Math.max(beat, hurt).toFixed(3);
  },
  // Engagement: the vitals dim after a quiet spell and come back at the first threat; low health keeps them lit.
  updateCalm(game, t, dt) {
    const H = CONFIG.hud, p = game.player;
    const threatened = (t && t.alive()) || game.lock || p.hp / p.maxHp <= H.lowHp || !p.alive();
    this.idle = threatened ? 0 : this.idle + dt;
    const goal = this.idle > H.calmDelay ? 1 : 0;
    const rate = dt / (goal > this.calm ? H.calmFadeOut : H.calmFadeIn);
    this.calm = this.calm + Math.max(-rate, Math.min(rate, goal - this.calm));
    this.root.style.setProperty('--calm', this.calm.toFixed(3));
  },
  // The boss bar, top centre: fades in with the target, trails its losses, tallies the damage of a combo, and
  // warns when posture is about to break.
  updateBoss(e, dt) {
    const H = CONFIG.hud;
    this.eBars.classList.toggle('hidden', !e);
    this.tallyTimer = Math.max(0, this.tallyTimer - dt);
    if (this.tallyTimer <= 0) this.tally = 0;
    this.eDmg.classList.toggle('show', this.tallyTimer > 0 && this.tally >= 1);
    if (!e) return;
    const eh = clamp01(e.hp / e.def.hp);
    if (e !== this.target) { this.target = e; this.bossLag.set(eh); this.eName.textContent = e.def.name; this.lastBossHp = e.hp; this.tally = this.tallyTimer = 0; this.lastPosture = e.posture || 0; }
    if (e.hp < this.lastBossHp - 1e-6) { this.tally += this.lastBossHp - e.hp; this.tallyTimer = H.tallyHold; this.eDmg.textContent = `−${Math.round(this.tally)}`; }
    this.lastBossHp = e.hp;
    if (this.eName.textContent !== e.def.name) this.eName.textContent = e.def.name;   // a boss's next phase renames it
    const trail = this.bossLag.update(eh, dt);
    this.eHp.style.width = eh * 100 + '%'; this.eTrail.style.width = trail * 100 + '%';
    this.ePost.classList.toggle('hidden', !e.def.posture);
    if (e.def.posture) {
      const pr = e.posture / e.def.posture.max;
      if (e.posture > this.lastPosture + 0.5) this.postFlash = CONFIG.fx.postureFlash;   // pulse when posture rises
      this.lastPosture = e.posture;
      this.postFlash = Math.max(0, this.postFlash - dt);
      this.ePostFill.style.width = pr * 100 + '%';
      this.ePostFill.style.filter = this.postFlash > 0 ? 'brightness(2.2)' : '';
      this.ePost.classList.toggle('warn', pr >= H.postureWarn);
    }
  },
  // Short notices above the prompt; each fades on its own (CSS) and is swept away here.
  toast(text) {
    if (!text) return;
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
    this.toasts.appendChild(el);
    this.toastList.push({ el, until: this.clock + CONFIG.hud.toastTime });
    while (this.toastList.length > CONFIG.hud.maxToasts) this.toastList.shift().el.remove();
  },
  updateToasts() {
    this.toastList = this.toastList.filter(t => t.until > this.clock || (t.el.remove(), false));
  },
  // The interaction prompt: the bonfire is ready, or it is near but enemies are too close.
  updatePrompt(game) {
    const p = game.player, ready = p.isFree() && !!game.canRest();
    const blocked = !ready && p.isFree() && p.alive() && !!game.nearBonfire();
    this.prompt.classList.toggle('show', (ready && (!lore.prompt() || game.restWins())) || blocked);
    this.prompt.classList.toggle('blocked', blocked);
    this.promptText.textContent = blocked ? CONFIG.hud.text.restBlocked : this.restText;
    // Talk / Read (js/lore.js): its own line, so it never hides the bonfire's.
    const talk = p.alive() && !(ready && game.restWins()) ? lore.prompt() : null;   // one key: show only the one it would do
    this.talk.classList.toggle('show', !!talk);
    if (talk && this.talkText.textContent !== talk) this.talkText.textContent = talk;
    // Execute (js/execution.js): a kneeling enemy is in reach, in front of it.
    this.execCue.classList.toggle('show', p.alive() && game.enemies.some(e => e.execReady));
  },
  // Subtitles (js/lore.js): { name, text, show } or null. A line fades in and out; null fades everything away.
  subtitle(s) {
    if (!this.sub) return;
    if (s && s.text !== this.subText.textContent) { this.subName.textContent = s.name; this.subText.textContent = s.text; }
    this.sub.classList.toggle('show', !!s && s.show);
  },
  update(game, dt) {
    const H = CONFIG.hud, t = game.target(), e = t && t.def.posture ? t : null;   // the top bar is for bosses only
    const p = game.player;
    this.clock += dt;
    for (const k of ['healTimer', 'hurtTimer', 'refundTimer', 'deniedTimer']) this[k] = Math.max(0, this[k] - dt);
    this.updateTags(game, dt);
    this.updateCalm(game, t, dt);
    this.updateVitals(game, dt);
    this.updateBoss(e, dt);
    this.updateToasts();
    this.updatePrompt(game);
    this.restedTimer = Math.max(0, this.restedTimer - dt);
    this.rested.classList.toggle('show', this.restedTimer > 0);
    this.confirm.classList.toggle('show', game.restartArm > 0);
    this.died.classList.toggle('show', !p.alive());
    if (!p.alive() && this.wasAlive) {   // a tip under YOU DIED: the stamina one if the player had just run dry
      const T = H.text, tips = T.deathTips;
      this.diedTip.textContent = p.sinceExhausted <= T.staminaTipTime ? tips[0] : tips[Math.floor(Math.random() * tips.length)];
    }
    this.wasAlive = p.alive();
    // Tutorial: one prompt at a time, replaced (never stacked) as steps advance.
    const tut = game.tut, step = game.currentStep();
    this.tutPrompt.classList.toggle('hidden', !step);
    if (step) {
      this.tutStep.textContent = `${tut.index + 1} / ${game.tutorialSteps().length}`;
      this.tutText.textContent = step.text();
      this.tutHint.textContent = tut.hintTimer > 0 ? tut.hint : '';   // a short hint on its own line, replaced, never stacked
      this.tutPrompt.classList.toggle('done', tut.doneTimer > 0);
    }
    this.tutDone.classList.toggle('show', !!tut && tut.completeTimer > 0);
    this.won.classList.toggle('show', game.duelWon() && p.alive());
    this.complete.classList.toggle('show', game.kind === 'level' && game.complete && p.alive() && !game.level.ending);   // the last level ends its own way (js/finale.js)
  },
  helpOpen() { return !this.help.classList.contains('hidden'); },
  showHitboxes() { return this.helpOpen() && this.toggle.checked; },
};
// Listeners: they only set the HUD's own timers and notices, from what the event says and what the game shows.
function registerHudListeners() {
  const H = CONFIG.hud;
  events.on('strike', d => { hud.idle = 0; if (d.target === Game.player && !d.blocked) hud.hurtTimer = H.hurtTime; });
  events.on('parry', () => { hud.idle = 0; hud.refundTimer = H.refundPulse; });   // a parry refunds its stamina
  events.on('dodge', () => { hud.idle = 0; hud.refundTimer = H.refundPulse; });
  events.on('itemUsed', d => { if (d.item === 'flask') { hud.popFlask = d.player.item('flask').count; } });
  events.on('rest', () => { hud.healTimer = H.healFlash; });
  events.on('staminaDenied', () => { hud.deniedTimer = H.exhaustedFlash; restart(hud.pSt, 'empty');
    hud.pSt.addEventListener('animationend', () => hud.pSt.classList.remove('empty'), { once: true }); });
  events.on('gateOpened', d => hud.toast(H.toasts[d.shortcut ? 'shortcut' : d.gate.style || 'portcullis']));   // by the gate's own look
  events.on('trapWarning', () => hud.toast(H.toasts.trapWarning));
}
// FPS counter (settings.fps, F3): its own animation-frame loop, so it also counts in menus; refreshed every
// CONFIG.hud.fps.interval s. Drawing only.
const fpsMeter = (() => {
  const el = document.createElement('div');
  el.id = 'fpsCounter';
  el.style.cssText = 'position:fixed;top:6px;right:8px;z-index:50;font:600 13px/1 monospace;color:#e8e0c8;' +
    'background:rgba(0,0,0,0.45);padding:3px 6px;border-radius:3px;pointer-events:none;display:none';
  document.body.appendChild(el);
  let frames = 0, last = performance.now();
  const tick = now => {
    frames++;
    const span = (now - last) / 1000;
    if (span >= CONFIG.hud.fps.interval) { el.textContent = `${Math.round(frames / span)} FPS`; frames = 0; last = now; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return { show(on) { el.style.display = on ? 'block' : 'none'; } };
})();
function applySettings() {
  fpsMeter.show(settings.fps);
  hud.toggle.checked = settings.hitboxes;
  hud.layout();
  visuals.setQuality(settings.graphics);
  audio.setVolume(clamp(Number(settings.volume), 0, 10) / 10);
}
