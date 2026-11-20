'use strict';
// ============================================================================
// 10. HUD
// ============================================================================
// Drawing only: the HUD reads the game (player, enemies, zones, target) and listens to events; it never writes to
// them. Its own state (lag trails, pulse timers, the calm level) lives on `hud`. All numbers are in CONFIG.hud;
// the layout (anchors, frames, colours) is in the page's stylesheet. Anchors (see #stage): top left, the player's
// vitals; top centre, the boss bar and the lesson card (js/lessons.js); bottom centre, warnings,
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
const IRON_FRAME = ['', '1', '2', '3', '4'];   // Iron Blood's frame by level (no string made per frame)
const hud = {
  root: $('hud'), pHp: $('pHp'), pHpFill: $('pHpFill'), pHpTrail: $('pHpTrail'), pHpCut: $('pHpCut'),
  diedTip: $('diedTip'), flaskRow: $('pFlasks'), flasks: [],
  eBars: $('eBars'), eHp: $('eHpFill'), eTrail: $('eHpTrail'), eMend: $('eHpMend'), lastMend: 0, mendClosing: 0, mendShown: true, eName: $('eName'), eDmg: $('eDmg'),
  rushClock: $('rushClock'), rushFight: $('rushFight'), rushCrown: $('rushCrown'), rushTime: $('rushTime'), rushMods: $('rushMods'), rushKey: -1, wonTitle: $('wonTitle'),
  died: $('died'), won: $('won'), complete: $('complete'), rested: $('rested'), prompt: $('prompt'), promptKey: $('promptKey'), promptText: $('promptText'), talk: $('talk'), talkKey: $('talkKey'), talkText: $('talkText'), 
  sub: $('subtitle'), subName: $('subName'), subText: $('subText'),
  confirm: $('confirm'), toasts: $('toasts'), vignette: $('vignette'),
  help: $('help'), controlsTips: $('controlsTips'), controlsTipsRows: $('controlsTipsRows'), controlsTipsTimer: 0,
  healingTip: $('healingTip'), healingTipText: $('healingTipText'), healingTipState: 'pending',
  groupTip: $('groupTip'), groupTipCount: $('groupTipCount'), groupTipText: $('groupTipText'),
  // State of its own. Timers count down in seconds; the listeners at the bottom of this file set them.
  hpLag: new LagMeter(), bossLag: new LagMeter(), calm: 0, idle: 0, clock: 0,
  target: null, restedTimer: 0, lastBossHp: 0, tally: 0, tallyTimer: 0,
  healTimer: 0, hurtTimer: 0, wasAlive: true, popFlask: -1, toastList: [],
  // Texts built from the live key bindings and the current level.
  buildTexts(game) {
    const online = typeof multiplayer !== 'undefined' && multiplayer.connected, run = online && multiplayer.gauntlet;
    this.healingTipText.textContent = `Press ${keycap(bindLabel('flask'))} to heal`;
    this.groupTipText.textContent = `Press ${keycap(bindLabel('switchTarget'))} to switch target`;
    this.controlsTipsRows.textContent = '';
    const basics = [
      ['Attack', bindLabel('light')], ['Heavy attack', bindLabel('heavy')],
      ['Dodge', bindLabel('roll')],
      ['Jump', bindLabel('jump')],
      ['Heal', bindLabel('flask')], ['Lock on', bindLabel('lock')],
    ];
    for (const [label, binding] of basics) {
      const row = document.createElement('div'), name = document.createElement('span'), key = document.createElement('span');
      name.textContent = label; key.textContent = keycap(binding);
      row.append(name, key); this.controlsTipsRows.appendChild(row);
    }
    const table = $('helpTable'); table.textContent = '';
    for (const [k, keys, note] of controlRows(online)) {   // js/input.js, shared with the Controls screen
      const tr = table.insertRow(); tr.insertCell().textContent = k; tr.insertCell().textContent = [keys, note].filter(Boolean).join(' ');
    }
    $('helpLevel').textContent = game.level ? game.level.help || '' : '';
    $('helpHint').textContent = usingPad() ? '' : `${keyLabel(SYSTEM_KEYS.help)}: help`;
    // Boss Rush's kill moment (js/kill-moment.js): "Fight n won", the fight's own number (one count: the fight, pass 96).
    const rush = run && run.run;
    this.won.classList.toggle('rush', !!rush);
    this.wonTitle.textContent = rush ? `Fight ${run.number} won` : 'ENEMY FELLED';
    $('wonHint').textContent = run ? run.next ? 'Next boss incoming… Everyone returns with full health and flasks.' : 'All bosses defeated! Returning to the lobby…'
      : `${systemLabel('restart')} to fight again · ${systemLabel('pause')} to pause`;
    const next = game.level && game.level.next && ALL_LEVELS.find(l => l.id === game.level.next);
    $('completeHint').textContent = game.level && game.level.completeHint ? game.level.completeHint : next ? `Onward to ${next.name}…`
      : `${systemLabel('restart')} to restart · ${systemLabel('pause')} to pause and leave`;
    this.promptKey.textContent = keycap(bindLabel('rest'));
    this.talkKey.textContent = keycap(bindLabel('talk'));
    this.restText = 'Rest at bonfire';
    this.confirm.textContent = `Press ${systemLabel('restart')} again to restart from the beginning`;
  },
  reset(game) {
    this.root.classList.toggle('boss-battle', game.kind === 'bossBattle');
    this.controlsTipsTimer = CONFIG.hud.controlsTipsTime;
    this.controlsTips.hidden = true;
    this.healingTip.hidden = true;
    this.healingTipState = 'pending';
    this.groupTip.hidden = true;
    this.hpLag.set(1); this.bossLag.set(1);
    this.target = null; this.restedTimer = 0; this.idle = 0; this.calm = 0; this.tally = this.tallyTimer = 0;
    this.healTimer = this.hurtTimer = 0; this.wasAlive = true; this.popFlask = -1;
    for (const t of this.toastList) t.el.remove();
    this.toastList = [];
    for (const el of [this.died, this.won, this.complete, this.rested]) el.classList.remove('show');
    this.buildTexts(game);
    this.layout();
  },
  showRested() { this.restedTimer = CONFIG.rest.messageTime; },
  dismissHealingTip() {
    if (this.healingTipState === 'active') this.healingTipState = 'done';
    this.healingTip.hidden = true;
  },
  updateControlsTips(game, dt) {
    const playing = game.mode === 'play' && game.loading <= 0 && !(typeof lessons !== 'undefined' && lessons.owns(game));   // lesson cards teach instead
    if (playing) this.controlsTipsTimer = Math.max(0, this.controlsTipsTimer - dt);
    const p = game.player, hidden = !playing || !p.alive() || this.helpOpen();
    this.controlsTips.hidden = hidden || this.controlsTipsTimer <= 0;
    // Offer the reminder once per level, keeping it dismissed after healing or death.
    if (this.healingTipState === 'active' && (!p.alive() || p.hp >= p.hpCap())) this.dismissHealingTip();
    this.healingTip.hidden = hidden || this.healingTipState === 'done' || this.controlsTipsTimer > 0 || p.hp >= p.hpCap() || p.item('flask').count <= 0 ||
      p.state === PS.USE_ITEM && p.usingItem === ITEMS.flask;
    if (!this.healingTip.hidden) this.healingTipState = 'active';
    // Fights against several bosses at once: how many still stand, while more than one does.
    const group = game.kind === 'arena' && game.duelPartners.length > 0, standing = group ? game.enemies.filter(e => e.alive()).length : 0;
    this.groupTip.hidden = hidden || standing < 2;
    if (!this.groupTip.hidden) this.groupTipCount.textContent = `${standing} of ${game.enemies.length} still stand`;
  },

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
  // Dash charges (pass 90, Aleix): a slim white bar per charge under health, each filling left to right as it comes
  // back, one at a time; written only when a step of it changes.
  syncDashes(p) {
    const n = CONFIG.player.dashCharges;
    if (!this.dashPips) {
      this.dashRow = document.getElementById('pDash'); this.dashPips = []; this.dashShown = [];
      for (let i = 0; i < n; i++) { const d = document.createElement('i'); this.dashRow.appendChild(d); this.dashPips.push(d); this.dashShown.push(-1); }
    }
    const free = p.freeDash(), banked = p.perk.bank > 0;
    if (banked !== this.dashBanked) { this.dashBanked = banked; this.dashRow.classList.toggle('banked', banked); }   // Ringing Steel's dash waits
    for (let i = 0; i < n; i++) {
      const k = free ? 1 : Math.round(clamp01(p.dashes - i) * 20) / 20;
      if (k === this.dashShown[i]) continue;
      this.dashShown[i] = k;
      this.dashPips[i].style.setProperty('--k', k);
      this.dashPips[i].classList.toggle('ready', k >= 1);
    }
  },
  // The number keys (pass 87): one square per key, bottom centre (pass 96, Aleix), shown once any key holds an ability. A held one shows
  // its icon over a charge that fills from below and its bound key; a full one lights. Written only when a step changes.
  syncAbilityKeys(p) {
    if (!this.keySlots) {
      const row = document.createElement('div'); row.className = 'anchor'; row.id = 'aBR'; row.setAttribute('aria-hidden', 'true');
      this.keySlots = ABILITY_KEYS.map(key => {
        const el = document.createElement('div'), fill = document.createElement('i'), icon = document.createElement('span'), bind = document.createElement('b');
        el.className = 'akey empty'; el.dataset.key = key; fill.className = 'akey-fill'; icon.className = 'akey-icon'; bind.className = 'akey-bind';
        el.append(fill, icon, bind); row.appendChild(el);
        return { key, el, fill, icon, bind, id: null, k: -1, label: '' };
      });
      document.getElementById('stage').appendChild(row);
      this.keyRow = row; this.keyKit = null;
      const style = document.createElement('style'); style.id = 'abilityKeys';
      style.textContent = `#aBR{left:50%;bottom:var(--my);transform:translateX(-50%);flex-direction:row;align-items:flex-end;gap:8px}#aBR.off{display:none}
  .akey{--rc:#cfc8b6;position:relative;width:50px;height:50px;box-sizing:border-box;background:#0b0c10b8;border:1px solid #6e5d36;box-shadow:0 0 0 1px #000000c0;overflow:hidden}
  .akey[data-rarity=rare]{--rc:#8fb8dc}.akey[data-rarity=legendary]{--rc:#e59a5c}
  .akey.empty{background:#0b0c1060;border-color:#6e5d3660}
  .akey-fill{position:absolute;left:0;right:0;bottom:0;height:100%;background:color-mix(in srgb,var(--rc) 26%,transparent);transform:scaleY(var(--k,0));transform-origin:bottom}
  .akey-icon{position:absolute;inset:7px}.akey-icon svg{width:100%;height:100%;fill:none;stroke:var(--rc);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;opacity:.55}
  .akey-bind{position:absolute;left:3px;top:2px;font:600 12px/1 Georgia,'Times New Roman',serif;color:#d9c792;text-shadow:0 1px 2px #000}
  .akey.empty .akey-bind{color:#6f6753}
  .akey.ready{border-color:#f0d690;box-shadow:0 0 0 1px #000000c0,0 0 10px 1px color-mix(in srgb,var(--rc) 55%,transparent)}.akey.ready .akey-icon svg{opacity:1}
  .akey.fired{animation:akeyFire .45s ease-out}.akey.denied{animation:akeyDeny .3s ease-out}
  @keyframes akeyFire{0%{background:color-mix(in srgb,var(--rc) 60%,#0b0c10)}100%{background:#0b0c10b8}}
  @keyframes akeyDeny{0%,100%{border-color:#6e5d36}40%{border-color:#e07a5c}}
  @media (prefers-reduced-motion:reduce){.akey.fired,.akey.denied{animation:none}}`;
      document.head.appendChild(style);
    }
    const kit = p.kit;
    if (kit !== this.keyKit) {   // a new pick: who sits in which key
      const on = this.keyOn = !!kit && Object.keys(kit.pressed).length > 0;
      this.keyKit = kit; this.keyRow.classList.toggle('off', !on); this.keyLabelAt = 0;
      for (const s of this.keySlots) {
        const slot = on ? kit.pressed[s.key] : null, b = slot && ABILITY_BY_ID[slot.id];
        if ((b && b.id) === s.id) continue;
        s.id = b ? b.id : null; s.k = -1;
        s.el.classList.toggle('empty', !b); s.el.dataset.rarity = b ? b.rarity : '';
        s.icon.innerHTML = b ? `<svg viewBox="0 0 48 48" focusable="false">${ABILITY_ICONS[b.id] || ''}</svg>` : '';
      }
    }
    if (!this.keyOn) return;
    // The bound keys follow the device used last and the Controls screen: read again when the device changes, else each second.
    if (input.device !== this.keyDevice || this.clock >= this.keyLabelAt) {
      this.keyDevice = input.device; this.keyLabelAt = this.clock + 1;
      for (const s of this.keySlots) { const label = abilityKeyBind(s.key).replace('D-pad ', ''); if (label !== s.label) { s.label = label; s.bind.textContent = label; } }
    }
    for (const s of this.keySlots) {
      if (!s.id) continue;
      const k = Math.round(clamp01(p.perk.charge[s.key] / kit.pressed[s.key].v.charge) * 40) / 40;
      if (k === s.k) continue;
      s.k = k; s.fill.style.setProperty('--k', k); s.el.classList.toggle('ready', k >= 1);
    }
  },
  // A press of a number key: the square flashes when its ability fires, its edge reddens when not yet charged.
  keyPressed(key, fired) {
    const s = this.keySlots && this.keySlots.find(x => x.key === key);
    if (s && s.id) restart(s.el, fired ? 'fired' : 'denied');
  },
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
      if (!e.alive() || !e.awake() || e.asleep || e.training || e.isBoss() && game.kind !== 'bossBattle') continue;
      if (e.in('unaware') && e.hp >= e.def.hp && e !== game.lock) continue;   // untouched and unaware: no bar yet
      const q = e.rig.root.position;
      if (game.kind !== 'bossBattle' && (Math.hypot(q.x - p.x, q.z - p.z) > F.tagRange || gateBetween(p, e))) continue;
      v.set(q.x, q.y + e.height + F.tagGap, q.z).project(camera);
      if (v.z < -1 || v.z >= 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      let t = this.tags[n++];
      if (!t) {
        const el = document.createElement('div'); el.className = 'eTag';
        el.innerHTML = '<div class="trail"></div><div class="hp"></div>';
        this.tagRoot.append(el);
        t = { el, trail: el.children[0], hp: el.children[1], enemy: null, lag: new LagMeter() };
        this.tags.push(t);
      }
      const at = `translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px) translate(-50%, -50%) scale(${s})`;
      const eh = e.hp / e.def.hp;
      if (t.enemy !== e) { t.enemy = e; t.lag.set(eh); }
      const trail = t.lag.update(eh, dt);
      t.hp.style.width = eh * 100 + '%'; t.trail.style.width = trail * 100 + '%';
      t.el.classList.toggle('locked', e === game.lock);
      t.el.dataset.team = game.kind === 'bossBattle' ? e.team : '';
      t.el.dataset.name = game.kind === 'bossBattle' ? `${bossBattle.team(e.team).name} · ${e.def.name}` : '';
      t.el.style.transform = at;
      t.el.style.display = 'block';
    }
    for (let i = n; i < this.tags.length; i++) { this.tags[i].el.style.display = 'none'; this.tags[i].enemy = null; }
  },
  // Damage numbers (a level with `damageNumbers`: the Ability Grounds). Each enemy's health is read every frame and
  // a drop rises off it as a number, so blows and every ability's damage all show. A fixed pool, reused.
  numRoot: $('dmgNums'), nums: [], numNext: 0, numHp: new WeakMap(), numPos: new THREE.Vector3(),
  updateNumbers(game, dt) {
    const D = CONFIG.hud.damageNumbers, on = !!(game.level && game.level.damageNumbers), v = this.numPos;
    if (on && !this.nums.length)
      for (let i = 0; i < D.pool; i++) {
        const el = document.createElement('div'); el.className = 'dmgNum'; this.numRoot.appendChild(el);
        this.nums.push({ el, enemy: null, age: D.life, side: 0 });
      }
    if (on) for (const e of game.enemies) {
      const was = this.numHp.get(e);
      this.numHp.set(e, e.hp);
      if (was === undefined || e.hp >= was - 0.5) continue;
      const n = this.nums[this.numNext], dmg = Math.round(was - e.hp);
      this.numNext = (this.numNext + 1) % this.nums.length;
      n.enemy = e; n.age = 0; n.side = D.lanes[this.numNext % D.lanes.length];   // side to side, so a flurry does not stack up
      n.el.textContent = dmg;
      n.el.classList.toggle('big', dmg >= D.big);
    }
    if (!this.nums.length) return;
    const w = window.innerWidth, h = window.innerHeight, s = this.scale, still = reducedMotion();
    for (const n of this.nums) {
      n.age += dt;
      const e = n.enemy, shown = on && e && n.age < D.life && game.enemies.includes(e);
      if (shown) {
        const q = e.rig.root.position;
        v.set(q.x, q.y + e.height * 0.8, q.z).project(camera);
        if (v.z < -1 || v.z >= 1) { n.el.style.display = 'none'; continue; }
        const k = n.age / D.life, up = still ? 0 : D.rise * (1 - (1 - k) * (1 - k));
        n.el.style.transform = `translate(${(v.x + 1) / 2 * w + n.side * D.spread * s}px, ${(1 - v.y) / 2 * h - up * s}px) translate(-50%, -50%) scale(${s})`;
        n.el.style.opacity = (k < 0.6 ? 1 : (1 - k) / 0.4).toFixed(3);
        n.el.style.display = 'block';
      } else if (n.enemy) { n.el.style.display = 'none'; n.enemy = null; }
    }
  },
  // Player vitals: health with a lag trail, a heal glow, a hit shake and a low-health pulse. Under it the dash charges
  // (syncDashes); no other meter (pass 96, PLAN.md "No hidden meters").
  updateVitals(game, dt) {
    const H = CONFIG.hud, p = game.player;
    const ph = clamp01(p.hp / p.maxHp);
    if (ph > this.hpLag.last + 0.004) this.healTimer = H.healFlash;
    if (ph < this.hpLag.last - 0.004) { restart(this.pHp, 'hit'); this.pHp.addEventListener('animationend', () => this.pHp.classList.remove('hit'), { once: true }); }
    const hpTrail = this.hpLag.update(ph, dt);
    this.pHpFill.style.width = ph * 100 + '%'; this.pHpTrail.style.width = hpTrail * 100 + '%';
    this.pHpCut.style.width = (1 - p.hpCap() / p.maxHp) * 100 + '%';   // Destined Death's cut, at the right end (v5.8)
    const low = p.alive() && ph <= H.lowHp;
    this.pHp.classList.toggle('low', low);
    this.pHp.classList.toggle('heal', this.healTimer > 0);

    // Iron Blood (a plain common): the bar's iron frame, thicker by level (CSS `#pHp[data-iron]`).
    const iron = IRON_FRAME[p.kit && p.kit.mods.maxHp > 0 ? clamp(Math.round(p.kit.mods.maxHp / 0.08), 1, 4) : 0];
    if ((this.pHp.dataset.iron || '') !== iron) { if (iron) this.pHp.dataset.iron = iron; else delete this.pHp.dataset.iron; }
    this.syncDashes(p);
    this.syncAbilityKeys(p);
    this.syncFlasks(p.item('flask'));

    // Screen edge: a steady red at low health, beating with the heart; a flare when a blow lands.
    // Reduced motion (js/visuals.js): the low-health edge holds steady and the hurt flare is softer.
    const calm = reducedMotion();
    const beat = low ? H.critVignette * (calm ? 0.8 : 0.6 + 0.4 * Math.sin(this.clock * H.heartRate)) * (1 - ph / H.lowHp * 0.5) : 0;
    const hurt = H.hurtVignette * clamp01(this.hurtTimer / H.hurtTime) * (calm ? CONFIG.VISUALS.reducedMotion.hurt : 1);
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
  // The boss bar, top centre: fades in with the target, trails its losses and tallies the damage of a combo. Health
  // only (pass 100: the posture bar went).
  updateBoss(e, dt) {
    const H = CONFIG.hud;
    this.eBars.classList.toggle('hidden', !e);
    this.tallyTimer = Math.max(0, this.tallyTimer - dt);
    if (this.tallyTimer <= 0) this.tally = 0;
    this.eDmg.classList.toggle('show', this.tallyTimer > 0 && this.tally >= 1);
    if (!e) return;
    const eh = clamp01(e.hp / e.def.hp);
    if (e !== this.target) { this.target = e; this.bossLag.set(eh); this.eName.textContent = e.def.name; this.lastBossHp = e.hp; this.tally = this.tallyTimer = 0; this.lastMend = 0; this.mendClosing = 0; }
    if (e.hp < this.lastBossHp - 1e-6) { this.tally += this.lastBossHp - e.hp; this.tallyTimer = H.tallyHold; this.eDmg.textContent = `−${Math.round(this.tally)}`; }
    this.lastBossHp = e.hp;
    if (this.eName.textContent !== e.def.name) this.eName.textContent = e.def.name;   // a boss's next phase renames it
    const trail = this.bossLag.update(eh, dt);
    this.eHp.style.width = eh * 100 + '%'; this.eTrail.style.width = trail * 100 + '%';
    // A `mend` boss's open wounds (pass 75): the ember stretch past his bar's end the Ember will close; lit while it closes.
    const mend = e.mendPool > 0 && e.alive() ? Math.min(1 - eh, e.mendPool / e.def.hp) : 0;
    this.mendClosing = mend < this.lastMend - 1e-6 && mend > 0 ? H.mendLit : Math.max(0, this.mendClosing - dt); this.lastMend = mend;
    if (mend > 0 || this.mendShown) { this.eMend.style.left = eh * 100 + '%'; this.eMend.style.width = mend * 100 + '%'; this.mendShown = mend > 0; }
    this.eMend.classList.toggle('closing', this.mendClosing > 0);
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
  },
  // Subtitles (js/lore.js): { name, text, show } or null. A line fades in and out; null fades everything away.
  subtitle(s) {
    if (!this.sub) return;
    if (s && s.text !== this.subText.textContent) { this.subName.textContent = s.name; this.subText.textContent = s.text; }
    this.sub.classList.toggle('show', !!s && s.show);
  },
  update(game, dt) {
    if (game.kind === 'bossBattle') { this.updateTags(game, dt); bossBattle.drawHud(game); return; }
    const H = CONFIG.hud, t = game.target(), e = t && (t.isBoss() || t.def.bossBar) ? t : null;   // the top bar: bosses and the great mannequins
    const p = game.player;
    this.clock += dt;
    this.updateControlsTips(game, dt);
    for (const k of ['healTimer', 'hurtTimer']) this[k] = Math.max(0, this[k] - dt);
    this.updateTags(game, dt);
    this.updateNumbers(game, dt);
    this.updateCalm(game, t, dt);
    this.updateVitals(game, dt);
    this.updateBoss(e, dt);
    this.updateRush();
    this.updateToasts();
    this.updatePrompt(game);
    this.restedTimer = Math.max(0, this.restedTimer - dt);
    this.rested.classList.toggle('show', this.restedTimer > 0);
    this.confirm.classList.toggle('show', game.restartArm > 0);
    this.died.classList.toggle('show', !p.alive());
    if (!p.alive() && this.wasAlive) {   // a tip under YOU DIED, at random
      const tips = H.text.deathTips;
      this.diedTip.textContent = tips[Math.floor(Math.random() * tips.length)];
    }
    const waitingForTeam = typeof multiplayer !== 'undefined' && multiplayer.waitingForTeamWipe;
    $('diedStatus').textContent = waitingForTeam ? game.duelWon() ? 'Boss defeated' : 'Waiting for your team…' : 'Returning to the last bonfire…';
    if (waitingForTeam)
      this.diedTip.textContent = game.duelWon() ? multiplayer.gauntlet?.next ? 'Next boss incoming. You return with full health.' : 'All bosses defeated. Returning to lobby…' : 'A team wipe ends the run.';
    this.wasAlive = p.alive();
    this.won.classList.toggle('show', game.duelWon() && (p.alive() || typeof multiplayer !== 'undefined' && multiplayer.active() && multiplayer.info.session.gauntlet));
    this.complete.classList.toggle('show', game.kind === 'level' && game.complete && p.alive() && !game.level.ending);   // the last level ends its own way (js/finale.js)
  },
  // Boss Rush's corner (pass 96, PLAN.md "No hidden meters"): the fight's number (and Crowned, on a Crowned fight), its
  // clock only while a Swift kill is still possible (under par), and under them the fight's modifiers by name; written
  // only when a second turns over.
  updateRush(r = rushNow()) {   // `r`: the streak to draw (tests hand their own)
    this.rushClock.hidden = !r;
    if (!r) { this.rushKey = -1; this.rushMods.hidden = true; return; }
    const sec = Math.floor(r.clock), key = (r.fight * 4096 + sec) * 4096 + r.par;
    if (key === this.rushKey) return;
    this.rushKey = key;
    const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.rushFight.textContent = `Fight ${r.fight}`;
    this.rushCrown.hidden = !r.crowned;
    this.rushTime.textContent = clock(sec); this.rushTime.hidden = sec > r.par;
    this.rushMods.textContent = r.modifiers.map(id => RUSH_MODIFIER_BY_ID[id]?.name || '').filter(Boolean).join(' · ');
    this.rushMods.hidden = !r.modifiers.length;
  },
  helpOpen() { return !this.help.classList.contains('hidden'); },
  showHitboxes() { return this.helpOpen(); },
};
// Listeners: they only set the HUD's own timers and notices, from what the event says and what the game shows.
function registerHudListeners() {
  const H = CONFIG.hud;
  events.on('strike', d => { hud.idle = 0; if (d.target === Game.player && !d.blocked) hud.hurtTimer = H.hurtTime; });
  events.on('parry', d => { if (!d.player || d.player === Game.player) hud.idle = 0; });
  events.on('dodge', d => { if (!d.player || d.player === Game.player) hud.idle = 0; });
  events.on('itemUsed', d => { if (d.item === 'flask' && d.player === Game.player) {
    hud.popFlask = d.player.item('flask').count; hud.dismissHealingTip();
  } });
  events.on('rest', () => { hud.healTimer = H.healFlash; hud.dismissHealingTip(); });
  events.on('abilityPress', d => { if (d.body === Game.player) hud.keyPressed(d.key, true); });
  events.on('abilityNotReady', d => { if (d.body === Game.player) hud.keyPressed(d.key, false); });
  // Kindling's and Tithe's points: every held key's cap flares.
  events.on('abilityPerk', d => { if (d.body === Game.player && (d.perk === 'parry/keys' || d.perk === 'finisher/keys')) for (const k in d.body.kit.pressed) hud.keyPressed(k, true); });
  events.on('gateOpened', d => hud.toast(H.toasts[d.shortcut ? 'shortcut' : d.gate.style || 'portcullis']));   // by the gate's own look
  events.on('trapWarning', () => hud.toast(H.toasts.trapWarning));
  events.on('saveFailed', () => hud.toast(H.toasts.saveFailed));
  events.on('flaskFound', d => hud.toast(H.toasts.flaskFound.replace('{n}', d.flasks)));   // pass 79: the flask row grows by one too
}
// Always-visible FPS counter: its own animation-frame loop, so it also counts in menus; refreshed every
// CONFIG.hud.fps.interval s. Drawing only.
(() => {
  const el = document.createElement('div');
  el.id = 'fpsCounter';
  el.style.cssText = 'position:fixed;top:6px;right:8px;z-index:50;font:600 13px/1 monospace;color:#e8e0c8;' +
    'background:rgba(0,0,0,0.45);padding:3px 6px;border-radius:3px;pointer-events:none';
  document.body.appendChild(el);
  let frames = 0, last = performance.now();
  const tick = now => {
    frames++;
    const span = (now - last) / 1000;
    if (span >= CONFIG.hud.fps.interval) { el.textContent = `${Math.round(frames / span)} FPS`; frames = 0; last = now; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
function applySettings() {
  hud.layout();
  const q = autoQuality.effective();   // Auto: the detected preset (js/autoquality.js)
  if (applySettings.graphics !== q) { applySettings.graphics = q; visuals.setQuality(q); }   // only when it changed: a quality change rebuilds shaders
  audio.setVolume(clamp(Number(settings.volume), 0, 10) / 10);
}
