'use strict';
// ============================================================================
// 11a. Game: menus and play flow
// ============================================================================
// The title, pause and options menus, and starting, loading and leaving duels and levels. Methods of `Game`
// (js/game.js), kept in their own file; they read and write Game's state through `this`.
Object.assign(Game, {
  // ---- menus -----------------------------------------------------------------------------------
  screens() {
    const onOff = v => v ? 'On' : 'Off';
    const S = story.screens(this);
    const online = typeof multiplayer !== 'undefined' && multiplayer.active();
    const pauseItems = online ? [
        { name: 'Resume', desc: 'The online world keeps running while menus are open.', go: () => this.resume() },
        { name: 'Lobby', desc: 'Players, level selection and leader controls.', go: () => multiplayer.show() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        { name: 'Leave lobby', desc: 'Return to solo play.', go: () => multiplayer.leave() },
      ] : this.story ? [
        { name: 'Resume', desc: '', go: () => this.resume() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        ...(this.isTutorial() ? [{ name: 'Skip tutorial', desc: 'Start the story now.', go: () => story.afterTutorial() }] : []),
        { name: 'Quit to main menu', desc: 'Saves first. Continue returns you to your last bonfire.', cue: 'menuBack', go: () => story.quit() },
      ] : [
        { name: 'Resume', desc: '', go: () => this.resume() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        { name: 'Back to Menu', desc: 'Abandons the current fight or level.', cue: 'menuBack', go: () => {
          const back = this.kind === 'bossBattle' ? 'bossBattle' : this.eldenBoss ? 'elden' : this.kind === 'arena' ? (isBossDef(ENEMY_BY_ID[this.duelId]) ? 'bosses' : 'enemies') : 'main';
          this.eldenBoss = null; if (this.kind !== 'bossBattle') this.reset(); this.showMenu(back); } },
      ];
    const levelItem = l => ({ name: l.name + (l.ending && finale.completed(l.id) ? '  ✦' : ''), desc: l.description, go: () => this.loadingFirst(l.name, l.description, () => this.startLevel(l.id)) });
    const duelItem = d => ({ name: d.name, desc: d.description, go: () => this.loadingFirst(`Duel: ${d.name}`, d.description, () => this.startFight(d.id)) });
    return {
      ...S.screens, ...elden.screens(this), ...bossBattle.screens(this),
      tutorialQuality: { title: 'CHOOSE YOUR QUALITY', sub: 'Pick the look you prefer. You can change it later in Options.',
        back: this.tutorialQualityBack || 'story',
        items: QUALITY_CHOICES.map(choice => ({ ...choice, desc: choice.systems, go: () => {
          const start = this.tutorialQualityStart;
          if (!start) return;
          settings.graphics = choice.id; saveSettings(); applySettings();
          this.tutorialQualityStart = null;
          start();
        } })) },
      main: { title: 'COMBAT ARENA 3D', sub: '', items: [
        ...S.main,
        { name: 'Join public lobby', desc: 'Play together on the home server. Anyone with the link can join.', go: () => multiplayer.join() },
        { name: '1v1 Arena', desc: 'Duel a single opponent: the enemies of both roads, the bosses of Ashmere, or the bosses of Elden Ring.', go: () => this.showMenu('arena') },
        { name: 'Levels', desc: 'Play a level on its own from any story.', go: () => this.showMenu('levels') },
        { name: 'Options', desc: 'Graphics, camera, sound and controls.', go: () => { this.optionsFrom = 'main'; this.showMenu('options'); } },
        ...(DEV ? [{ name: 'Test Grounds', desc: 'Developer rooms for trying out mechanics.', go: () => this.showMenu('tests') }, ...S.devItems] : []),
      ] },
      tests: { title: 'COMBAT ARENA 3D', sub: 'TEST GROUNDS', back: 'main',
        items: [...finale.devItems(), ...lore.devItems(),
                ...TEST_LEVELS.map(l => ({ name: l.name, desc: l.description, go: () => this.loadingFirst(l.name, l.description, () => this.startLevel(l.id)) })),
                ...TEST_DEFS.map(d => ({ name: `Duel: ${d.name}`, desc: d.description, go: () => this.loadingFirst(`Duel: ${d.name}`, d.description, () => this.startFight(d.id)) }))] },
      levels: { title: 'COMBAT ARENA 3D', sub: 'LEVELS', back: 'main', items: [
        { name: 'Ashmere  ›', desc: 'The five levels of Ashmere, from the Long Hall to the Final Castle.', go: () => this.showMenu('levelsAshmere') },
        { name: 'The Lands Between  ›', desc: 'The levels of the second road, from Stormhill to the Haligtree.', go: () => this.showMenu('levelsLands') },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('main') }] },
      levelsAshmere: { title: 'COMBAT ARENA 3D', sub: 'LEVELS · ASHMERE', back: 'levels', items: [...STORY.chapters.map(c => levelItem(ALL_LEVELS.find(l => l.id === c.level))),
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('levels') }] },
      levelsLands: { title: 'COMBAT ARENA 3D', sub: 'LEVELS · THE LANDS BETWEEN', back: 'levels', items: [...LANDS_LEVELS.map(levelItem),
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('levels') }] },
      arena: { title: 'COMBAT ARENA 3D', sub: '1V1 ARENA', back: 'main', items: [
        { name: 'Enemies', desc: 'The common foes of both roads, one at a time.', go: () => this.showMenu('enemies') },
        { name: 'Bosses', desc: 'The bosses of Ashmere: the Giant Skeleton, the Pillager Captain, the Bell Warden and Aldric.', go: () => this.showMenu('bosses') },
        elden.mainItem(this),
        { name: 'Boss vs Boss', desc: 'Build two teams of up to six bosses and watch them battle.', go: () => this.showMenu('bossBattle') },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('main') }] },
      enemies: { title: 'COMBAT ARENA 3D', sub: 'CHOOSE YOUR OPPONENT', back: 'arena',
        items: [...ENEMY_DEFS.filter(d => !isBossDef(d)).map(duelItem), { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('arena') }] },
      bosses: { title: 'COMBAT ARENA 3D', sub: 'THE BOSSES OF ASHMERE', back: 'arena',
        items: [...ENEMY_DEFS.filter(isBossDef).map(duelItem), { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('arena') }] },
      pause: { title: online ? 'ONLINE' : 'PAUSED', sub: online ? 'THE WORLD KEEPS RUNNING' : '', overlay: true, items: pauseItems },
      options: { title: 'OPTIONS', sub: 'LEFT / RIGHT TO ADJUST', overlay: this.optionsFrom !== 'main' && this.optionsFrom !== 'lobby', back: this.optionsFrom === 'lobby' ? 'lobby' : this.optionsFrom === 'main' ? 'main' : 'pause', items: [
        { name: `Camera motion: ${onOff(settings.cameraMotion !== false)}`, desc: 'Camera swing and shake from attacks, rolls, impacts and collapsing floors. Turn off for a steadier view.',
          adjust: () => { settings.cameraMotion = settings.cameraMotion === false; } },
        { name: `Graphics: ${autoQuality.label(settings.graphics)}`, desc: 'Auto picks for this machine. Ultra: real shadows, volumetric light, full effects. High: bloom, light shafts. Low: integrated graphics.',
          adjust: d => {
            const c = autoQuality.choices(), i = Math.max(0, c.indexOf(settings.graphics));
            settings.graphics = c[(i + d + c.length) % c.length];
            if (settings.graphics === 'auto') autoQuality.recheck();
          } },
        { name: 'Check graphics again', desc: autoQuality.summary(),
          go: () => {
            settings.graphics = 'auto'; autoQuality.recheck(); saveSettings(); applySettings(); this.showMenu('options', true);
          } },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu(this.optionsFrom === 'lobby' ? 'lobby' : this.optionsFrom === 'main' ? 'main' : 'pause') },
      ] },
    };
  },
  chooseTutorialQuality(start, back = 'story') {
    const measured = autoQuality.result();
    const recommendation = measured && measured.width === innerWidth && measured.height === innerHeight && measured.pixelRatio === (devicePixelRatio || 1)
      ? measured : autoQuality.recheck();
    this.tutorialQualityRecommendation = recommendation.pick;
    this.tutorialQualityStart = start; this.tutorialQualityBack = back;
    this.showMenu('tutorialQuality');
    const selected = QUALITY_CHOICES.findIndex(c => c.id === autoQuality.effective());
    this.select(Math.max(0, selected));
  },
  showMenu(screen, keepSelection) {
    if (screen === 'lobby') { multiplayer.show(); return; }
    if (screen !== 'tutorialQuality') this.tutorialQualityStart = null;
    if (screen === 'main') { this.story = false; story.load(); }   // the title ends any story session (saved on the way out)
    const s = this.screens()[screen], list = $('menuList');
    const inGame = screen === 'pause' || (screen === 'options' && this.optionsFrom !== 'main' && (this.optionsFrom !== 'lobby' || multiplayer.active()));
    if (!inGame) {
      this.mode = 'menu';
      this.zoomTarget = this.cam.zoom = CONFIG.zoom.default;   // zoom resets when returning to the menu
      this.cam.pitch = 0;
    } else this.mode = 'pause';
    this.screen = screen; this.clearControls(); this.setLock(null);
    if (document.pointerLockElement) document.exitPointerLock();
    $('menu').classList.toggle('quality-choice', screen === 'tutorialQuality');
    $('menu').classList.toggle('story-menu', screen === 'story');
    $('menu').classList.toggle('boss-team-menu', screen === 'bossBattle');
    $('menu').classList.remove('hidden'); $('menu').classList.toggle('overlay', !!s.overlay);
    hud.root.classList.toggle('hidden', !inGame);
    $('menuTitle').textContent = s.title; $('menuSub').textContent = s.sub; $('menuNotice').textContent = s.notice || '';
    this.showMenuHint();
    list.textContent = '';
    this.menuItems = s.items;   // what select() and adjust() read, so a key press never rebuilds every screen
    s.items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-describedby', 'menuDesc');
      b.className = 'menuBtn' + (it.adjust ? ' adj' : '');
      b.innerHTML = `<div class="n"></div><div class="d"></div>`;
      b.children[0].textContent = it.name; b.children[1].textContent = it.desc;
      if (it.group) { b.dataset.group = it.group; b.classList.add('campaign-start'); }
      if (it.label) b.setAttribute('aria-label', it.label);
      if (it.team) b.dataset.team = it.team;
      if (it.row) b.style.gridRow = it.row;
      if (it.disabled) { b.setAttribute('aria-disabled', 'true'); b.classList.add('unavailable'); }
      if (screen === 'tutorialQuality') {
        const frame = document.createElement('span'); frame.className = 'quality-image';
        const img = document.createElement('img'); img.src = it.image; img.alt = it.alt; img.width = 800; img.height = 600;
        const look = document.createElement('span'); look.className = 'quality-look'; look.textContent = it.look;
        frame.append(img, look); b.prepend(frame);
        if (it.id === this.tutorialQualityRecommendation) {
          const badge = document.createElement('span'); badge.className = 'quality-recommended'; badge.textContent = 'System recommended';
          frame.appendChild(badge);
        }
        b.setAttribute('aria-label', `${it.name} quality. ${it.systems}. ${it.look}.${it.id === this.tutorialQualityRecommendation ? ' System recommended.' : ''}`);
      }
      b.addEventListener('focus', () => this.select(i));
      if (it.adjust) for (const [cls, d] of [['al', -1], ['ar', 1]]) {   // ‹ › : the setting can be stepped either way (clickable)
        const a = document.createElement('span'); a.className = cls; a.textContent = d < 0 ? '‹' : '›';
        a.addEventListener('click', ev => { ev.stopPropagation(); this.select(i); this.adjust(d); });
        b.appendChild(a);
      }
      b.addEventListener('click', () => { this.select(i); this.confirm(); });
      // Scrolling can put another row under a stationary pointer. Only actual mouse movement may select it.
      b.addEventListener('mousemove', ev => {
        if ((!ev.movementX && !ev.movementY) || this.selected === i) return;
        events.emit('menuMove'); this.select(i);
      });
      list.appendChild(b);
    });
    this.select(keepSelection ? this.selected : Math.max(0, s.items.findIndex(it => !it.disabled)), true);
  },
  // Key or button names follow the device used last, so this is redone when it changes.
  showMenuHint() {
    const screen = this.screen, own = this.screens()[screen].hint;
    if (own) { $('menuHint').textContent = own; return; }
    if (screen === 'tutorialQuality') {
      $('menuHint').textContent = `${menuLabel('left')} · ${menuLabel('right')} to select · ${menuLabel('confirm')} to start tutorial · ${menuLabel('back')} to go back`;
      return;
    }
    $('menuHint').textContent = `${menuLabel('up')} · ${menuLabel('down')} to select · ${menuLabel('confirm')} to confirm` +
      (screen === 'options' ? ` · ${menuLabel('left')} · ${menuLabel('right')} to adjust` : '') +
      (screen === 'main' ? '' : ` · ${menuLabel('back')} to go back`);
  },
  // One step of directional menu input (keys, D-pad or stick).
  menuStep(dir) {
    if (this.screen === 'tutorialQuality' || dir === 'up' || dir === 'down') { events.emit('menuMove'); this.select(this.selected + (dir === 'up' || dir === 'left' ? -1 : 1), true); }
    else this.adjust(dir === 'left' ? -1 : 1);
  },
  select(i, focus = true) {
    const n = $('menuList').children.length;
    this.selected = n ? (i + n) % n : 0;
    [...$('menuList').children].forEach((b, k) => { b.classList.toggle('sel', k === this.selected); b.tabIndex = k === this.selected ? 0 : -1; });
    const cur = $('menuList').children[this.selected];
    if (focus && cur && document.activeElement !== cur) cur.focus({ preventScroll: true });
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const it = (this.menuItems || [])[this.selected];
    $('menuDesc').textContent = it ? it.desc || '' : '';
    $('menuUp').classList.toggle('off', this.selected <= 0); $('menuDown').classList.toggle('off', this.selected >= n - 1);
  },
  confirm() { const it = (this.menuItems || [])[this.selected]; if (!it || it.disabled) return; if (it.go) { events.emit(it.cue || 'menuConfirm'); it.go(); } else this.adjust(1); },
  adjust(d) {
    const it = this.menuItems[this.selected];
    if (!it || !it.adjust) return;
    it.adjust(d); saveSettings(); applySettings();
    events.emit('menuAdjust', { dir: d });
    // Only the labels change: rewrite them in place (the list, its buttons and the selection stay).
    const items = this.screens()[this.screen].items, btns = $('menuList').children;
    this.menuItems = items;
    items.forEach((x, i) => { if (btns[i]) btns[i].children[0].textContent = x.name; });
    $('menuDesc').textContent = items[this.selected] ? items[this.selected].desc || '' : '';
  },
  menuBack() {
    const s = this.screens()[this.screen];
    if (this.screen === 'pause') this.resume();
    else if (s.back) { events.emit('menuBack'); this.showMenu(s.back); }
  },
  // fromPointer: triggered by losing mouse capture rather than by the pause key.
  pause(fromPointer, fromFocus = false) {
    const online = typeof multiplayer !== 'undefined' && multiplayer.active();
    if (online && multiplayer.runIntroActive) return;
    if (fromPointer && online && multiplayer.spectatorMode) return;
    if (this.mode !== 'play' || (!online && !this.player.alive())) return;   // online menus remain available while dead or spectating
    // Tutorial: the pause key leaves to the Levels list (and restarts), except on the pause step itself.
    if (!fromFocus && this.isTutorial() && !this.story && !this.tutorialAllowsPause()) { if (!fromPointer) this.leaveTutorial(); return; }
    this.showMenu('pause');
    events.emit('pause');
  },
  resume() {
    this.mode = 'play'; this.clearControls();
    $('menu').classList.add('hidden'); hud.root.classList.remove('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    events.emit('resume');
  },
  clearControls() {
    input.clear();
    if (this.player) this.player.buffer = null;
  },
  enterPlay() {
    this.mode = 'play';
    $('menu').classList.add('hidden'); hud.root.classList.remove('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },
  // A duel. Most are fought in the arena; a test enemy can name a room level (`arena`) and starts for both sides there.
  startFight(id, partners = []) {
    const d = ENEMY_BY_ID[id], L = d.arena && ALL_LEVELS.find(l => l.id === d.arena);
    this.kind = 'arena'; this.duelId = id; this.duelPartners = partners; this.eldenBoss = null;   // js/elden.js sets it again for its own fights
    this.level = L ? { ...L, fullTracking: ARENA.fullTracking, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    this.enterPlay(); this.reset(); this.showLoading(...this.duelCard(id, partners));
  },
  // Loading card for a duel, or for a group of opponents fought together.
  duelCard(id, partners = []) {
    const defs = [id, ...partners].map(i => ENEMY_BY_ID[i]);
    return defs.length > 1 ? [`Duel: ${defs.map(d => d.name).join(' & ')}`, `${defs.length} bosses at once. Fight them together.`] : [`Duel: ${defs[0].name}`, defs[0].description];
  },
  startLevel(id) {
    this.kind = 'level'; this.eldenBoss = null; this.duelPartners = []; this.level = ALL_LEVELS.find(l => l.id === id); this.enterPlay(); this.reset();
    const ch = this.story && story.chapter(id);
    const onlineCard = typeof multiplayer !== 'undefined' && multiplayer.chapterCard(id);
    if (ch) { this.showLoading(ch.title, ch.line); this.loading = CONFIG.story.titleTime; story.onLevelStart(); }   // Souls-style title over the load
    else if (onlineCard) { this.showLoading(...onlineCard); this.loading = Math.max(this.loading, CONFIG.story.titleTime); }
    else this.showLoading(this.level.name, this.level.description);
  },
  // The level that follows this one: the next chapter in Story mode, else the level's own `next`.
  nextLevelId() {
    if (typeof multiplayer !== 'undefined' && multiplayer.campaign) return multiplayer.campaign.next;
    return this.story ? story.nextLevelId(this.level.id) : this.level.next || null;
  },
  // The loading screen over a fresh level or duel: its name, a line about it, and the controller note. The world
  // waits behind it (boot.js steps nothing while `loading` > 0), then it fades.
  showLoading(name, tip) {
    $('loadName').textContent = name; $('loadTip').textContent = tip || ''; $('loadPadText').textContent = CONFIG.hud.text.controller;
    document.documentElement.style.setProperty('--load-fade', CONFIG.loading.fade + 's');
    $('loading').classList.add('show');
    const elapsed = this.loadStarted == null ? 0 : (performance.now() - this.loadStarted) / 1000;
    this.loading = Math.max(CONFIG.loading.readyTime, CONFIG.loading.time - elapsed);
  },
  // The title card first, the work after: shows the loading screen (a level's name and line) and waits until it is on
  // screen before `fn` builds the level, so a long build never looks like a freeze. Under a hand-stepped clock (tests)
  // it runs at once. A second request while one is pending is dropped.
  loadingFirst(name, tip, fn) {
    if (this.pendingLoad) return;
    if (this.manualClock) { fn(); return; }
    this.pendingLoad = true; this.mode = 'loading'; input.clear();
    this.loadStarted = performance.now();
    $('loadName').textContent = name; $('loadTip').textContent = tip || ''; $('loadPadText').textContent = CONFIG.hud.text.controller;
    $('loading').classList.add('show'); $('menu').classList.add('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.pendingLoad = false;
      try { fn(); } finally { this.loadStarted = null; }
    }));
  },
  // What a level's loading screen says: its chapter title and line in Story mode, else its name and description.
  levelCard(id) {
    const online = typeof multiplayer !== 'undefined' && multiplayer.chapterCard(id);
    if (online) return online;
    const L = ALL_LEVELS.find(l => l.id === id), ch = this.story && story.chapter(id);
    return ch ? [ch.title, ch.line] : [L ? L.name : '', L ? L.description : ''];
  },
  tickLoading(dt) {
    if (this.loading <= 0) return;
    this.loading = Math.max(0, this.loading - dt);
    if (this.loading <= 0) $('loading').classList.remove('show');
  },
  leaveTutorial() { if (this.story) story.afterTutorial(); else { this.reset(); this.showMenu('levels'); } },
  // R: instant on the death, win or level-complete screens; otherwise press twice.
  requestRestart() {
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) { multiplayer.show(); return; }
    if (this.story) return;   // a campaign has no restart: death returns you to the bonfire
    if (!this.player.alive() || this.duelWon() || this.complete || this.restartArm > 0) { this.reset(); return; }
    this.restartArm = CONFIG.restartConfirmTime;
  },
});
