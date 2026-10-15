'use strict';
// ============================================================================
// 10. HUD
// ============================================================================
const $ = id => document.getElementById(id);
// A bar that drops at once but drains its trailing highlight slowly.
const trailToward = (trail, value, dt) => value > trail ? value : Math.max(value, trail - dt * CONFIG.fx.trailDrain);
const hud = {
  root: $('hud'), pHp: $('pHpFill'), pTrail: $('pHpTrail'), pSt: $('pStFill'), flaskRow: $('pFlasks'), flasks: [],
  eBars: $('eBars'), eHp: $('eHpFill'), eTrail: $('eHpTrail'), eName: $('eName'), ePost: $('ePost'), ePostFill: $('ePostFill'),
  died: $('died'), won: $('won'), complete: $('complete'), rested: $('rested'), prompt: $('prompt'), confirm: $('confirm'),
  tutPrompt: $('tutPrompt'), tutStep: $('tutStep'), tutText: $('tutText'), tutHint: $('tutHint'), tutDone: $('tutDone'),
  help: $('help'), toggle: $('hbToggle'),
  pTrailV: 1, eTrailV: 1, target: null, restedTimer: 0, lastPosture: 0, postFlash: 0,
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
      ['Rest at bonfire', bindLabel('rest')], ['Use flask', bindLabel('flask')],
      ['Restart', `${systemLabel('restart')} twice`], ['Pause', systemLabel('pause')], ['Help', `[ ${keyLabel(SYSTEM_KEYS.help)} ]`],
    ];
    const table = $('helpTable'); table.textContent = '';
    for (const [k, v] of rows) {
      const tr = table.insertRow(); tr.insertCell().textContent = k; tr.insertCell().textContent = v;
    }
    $('hbLabel').textContent = `Show hitboxes ${systemLabel('hitboxes')}`;
    $('helpLevel').textContent = game.level ? game.level.help || '' : '';
    $('helpHint').textContent = usingPad() ? '' : `${keyLabel(SYSTEM_KEYS.help)}: help`;
    $('wonHint').textContent = `${systemLabel('restart')} to fight again · ${systemLabel('pause')} to pause`;
    const next = game.level && game.level.next && ALL_LEVELS.find(l => l.id === game.level.next);
    $('completeHint').textContent = next ? `Onward to ${next.name}…`
      : `${systemLabel('restart')} to restart · ${systemLabel('pause')} to pause and leave`;
    this.prompt.textContent = `${bindLabel('rest')} Rest at bonfire`;
    this.confirm.textContent = `Press ${systemLabel('restart')} again to restart from the beginning`;
  },
  reset(game) {
    this.pTrailV = this.eTrailV = 1; this.target = null; this.restedTimer = 0;
    for (const el of [this.died, this.won, this.complete, this.rested]) el.classList.remove('show');
    this.buildTexts(game);
  },
  showRested() { this.restedTimer = CONFIG.rest.messageTime; },
  // Flask icons follow the inventory's capacity, so upgrades show.
  syncFlasks(it) {
    while (this.flasks.length < it.max) { const f = document.createElement('span'); f.className = 'flask'; this.flaskRow.appendChild(f); this.flasks.push(f); }
    while (this.flasks.length > it.max) this.flasks.pop().remove();
    this.flasks.forEach((f, i) => f.classList.toggle('full', i < it.count));
  },
  // Overhead bars: one per engaged, non-boss enemy in sight. Bosses use the big bar at the top instead.
  tagRoot: $('eTags'), tags: [], tagPos: new THREE.Vector3(),
  updateTags(game, dt) {
    const p = game.player, v = this.tagPos, F = CONFIG.fx;
    const w = window.innerWidth, h = window.innerHeight;
    camera.updateMatrixWorld();
    let n = 0;
    for (const e of game.enemies) {
      if (!e.alive() || !e.awake() || e.asleep || e.training || e.def.posture) continue;
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
        t = { el, trail: el.children[0], hp: el.children[1], gEl, guard: gEl.children[0], enemy: null, trailV: 1 };
        this.tags.push(t);
      }
      const G = e.def.guard || e.def.stagger;
      if (G) {
        const broken = e.state === ES.BROKEN;
        t.guard.style.width = (broken ? 100 : e.guardMeter / G.max * 100) + '%';
        t.gEl.classList.toggle('broken', broken);
        t.gEl.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%) scale(var(--hud)) translateY(8px)`;
      }
      t.gEl.style.display = G ? 'block' : 'none';
      const eh = e.hp / e.def.hp;
      if (t.enemy !== e) { t.enemy = e; t.trailV = eh; }
      t.trailV = trailToward(t.trailV, eh, dt);
      t.hp.style.width = eh * 100 + '%'; t.trail.style.width = t.trailV * 100 + '%';
      t.el.classList.toggle('locked', e === game.lock);
      t.el.style.transform = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%) scale(var(--hud))`;
      t.el.style.display = 'block';
    }
    for (let i = n; i < this.tags.length; i++) { this.tags[i].el.style.display = this.tags[i].gEl.style.display = 'none'; this.tags[i].enemy = null; }
  },
  update(game, dt) {
    const t = game.target(), e = t && t.def.posture ? t : null;   // the top bar is for bosses only
    const p = game.player;
    this.updateTags(game, dt);
    const ph = p.hp / p.maxHp;
    this.pTrailV = trailToward(this.pTrailV, ph, dt);
    this.pHp.style.width = ph * 100 + '%'; this.pTrail.style.width = this.pTrailV * 100 + '%';
    this.pSt.style.width = p.stamina / p.maxStamina * 100 + '%';
    this.syncFlasks(p.item('flask'));
    this.eBars.classList.toggle('hidden', !e);
    if (e) {
      const eh = e.hp / e.def.hp;
      if (e !== this.target) { this.target = e; this.eTrailV = eh; this.eName.textContent = e.def.name; }
      this.eTrailV = trailToward(this.eTrailV, eh, dt);
      this.eHp.style.width = eh * 100 + '%'; this.eTrail.style.width = this.eTrailV * 100 + '%';
      this.ePost.classList.toggle('hidden', !e.def.posture);
      if (e.def.posture) {
        if (e.posture > this.lastPosture + 0.5) this.postFlash = CONFIG.fx.postureFlash;   // pulse when posture rises
        this.lastPosture = e.posture;
        this.postFlash = Math.max(0, this.postFlash - dt);
        this.ePostFill.style.width = e.posture / e.def.posture.max * 100 + '%';
        this.ePostFill.style.filter = this.postFlash > 0 ? 'brightness(2.2)' : '';
      }
    }
    this.restedTimer = Math.max(0, this.restedTimer - dt);
    this.rested.classList.toggle('show', this.restedTimer > 0);
    this.prompt.classList.toggle('show', p.isFree() && !!game.canRest());   // only when resting would work
    this.confirm.classList.toggle('show', game.restartArm > 0);
    this.died.classList.toggle('show', !p.alive());
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
    this.complete.classList.toggle('show', game.kind === 'level' && game.complete && p.alive());
  },
  helpOpen() { return !this.help.classList.contains('hidden'); },
  showHitboxes() { return this.helpOpen() && this.toggle.checked; },
};
function applySettings() {
  hud.toggle.checked = settings.hitboxes;
  document.documentElement.style.setProperty('--hud', settings.hudScale);
  visuals.setQuality(settings.graphics);
}
