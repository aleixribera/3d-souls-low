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
        { name: 'Lobby', desc: 'Players, the mode and the leader\'s controls.', go: () => multiplayer.show() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        { name: 'Leave lobby', desc: 'Return to solo play.', go: () => multiplayer.leave() },
      ] : this.story ? [
        { name: 'Resume', desc: '', go: () => this.resume() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        { name: 'Quit to main menu', desc: 'Saves first. Continue returns you to your last bonfire.', cue: 'menuBack', go: () => story.quit() },
      ] : [
        { name: 'Resume', desc: '', go: () => this.resume() },
        { name: 'Options', desc: '', go: () => { this.optionsFrom = 'pause'; this.showMenu('options'); } },
        { name: 'Back to Menu', desc: 'Abandons the current fight or level.', cue: 'menuBack', go: () => {
          // Back to the Practice list the fight was started from.
          const back = this.kind === 'bossBattle' ? 'bossBattle' : this.kind === 'arena' ? this.practiceFromGroup ? 'practiceGroup'
            : isBossDef(ENEMY_BY_ID[this.duelId]) ? 'practiceBosses' : 'practiceEnemies' : this.kind === 'level' ? 'practiceLevels' : 'main';
          if (this.kind !== 'bossBattle') this.reset(); this.showMenu(back); } },
      ];
    // A newer version on the server (js/version-check.js): a reload button last in pause and on the title.
    const update = where => typeof versionCheck !== 'undefined' && versionCheck.item(where);
    const pauseUpdate = update(online ? 'online' : this.story ? 'story' : 'fight');
    if (pauseUpdate) pauseItems.push(pauseUpdate);
    const P = CONFIG.practice, group = this.practiceGroup, adding = this.practiceAdding;
    const levelItem = l => ({ name: l.name + (l.ending && finale.completed(l.id) ? '  ✦' : ''), desc: l.description, go: () => this.loadingFirst(l.name, l.description, () => this.startLevel(l.id)) });
    // Practice's opponent lists: a pick starts the fight at once, or, while building a group, joins the group.
    const duelItem = d => ({ name: d.name, desc: d.description, go: () => {
      if (!adding) { this.practiceFromGroup = false; this.loadingFirst(`Duel: ${d.name}`, d.description, () => this.startFight(d.id)); return; }
      if (group.length < P.maxGroup) group.push(d.id);
      this.practiceAdding = false; this.showMenu('practiceGroup');
    } });
    const pickBack = { name: 'Back', desc: '', cue: 'menuBack', go: () => { this.practiceAdding = false; this.showMenu(adding ? 'practiceGroup' : 'practice'); } };
    return {
      ...S.screens, ...bossBattle.screens(this),
      // The title (v7.70.0, the mockups' menu style on js/ui-theme.js): the game's name, the modes as rows, one line
      // about the chosen mode, one primary button that starts it, and a footer of quiet entries. Moving onto a mode or
      // clicking it chooses it; Enter on it (or the primary) starts it. Boss Rush is played in the public lobby; its line
      // says who is in it right now (multiplayer.lobby, asked while the title shows), and it is chosen when the lobby answers.
      main: { title: 'Combat Arena 3D', sub: '', layout: 'title', focus: this.titleLobby().reachable ? 1 : 0, items: [
        { ...S.main[0], size: 'mode' },
        { ...this.titleLobby(), size: 'mode', online: true, name: 'Boss Rush', start: 'Join public lobby', go: () => multiplayer.join() },
        { name: 'Practice', size: 'mode', line: 'Any enemy, boss or level, straight away.', start: 'Choose a fight', go: () => this.showMenu('practice') },
        { name: '', size: 'primary', go: () => { const m = this.menuItems[this.titleMode]; if (m) m.go(); } },
        { name: 'New game', size: 'second', go: () => { const m = this.menuItems[this.titleMode]; if (m && m.newGame) m.newGame(); } },
        { name: 'Options', size: 'foot', go: () => { this.optionsFrom = 'main'; this.showMenu('options'); } },
        { name: 'Changelog', size: 'foot', go: () => this.showMenu('changelog') },
        ...(DEV ? [{ name: 'Test Grounds', size: 'foot', go: () => this.showMenu('tests') }] : []),
        ...(update('title') ? [update('title')] : []),
      ] },
      tests: { title: 'COMBAT ARENA 3D', sub: 'TEST GROUNDS', back: 'main',
        items: [...S.devItems, ...finale.devItems(), ...lore.devItems(),   // the story's jumps live here, off the title
                ...TEST_LEVELS.map(l => ({ name: l.name, desc: l.description, go: () => this.loadingFirst(l.name, l.description, () => this.startLevel(l.id)) })),
                ...TEST_DEFS.map(d => ({ name: `Duel: ${d.name}`, desc: d.description, go: () => this.loadingFirst(`Duel: ${d.name}`, d.description, () => this.startFight(d.id)) }))] },
      changelog: { title: 'COMBAT ARENA 3D', sub: 'CHANGELOG', back: 'main', items: [   // js/data/changelog.js, newest first
        ...CHANGELOG.map(c => ({ name: `${c.version}  ·  ${c.title}`, desc: c.text })),
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('main') }] },
      // Practice: any enemy, boss or level, fighting within two picks. It replaced the 1v1 Arena and the Levels menu.
      practice: { title: 'PRACTICE', sub: '', back: 'main', items: [
        { name: 'Fight a boss', desc: 'Any boss of the story, alone against you.', go: () => { this.practiceAdding = false; this.showMenu('practiceBosses'); } },
        { name: 'Fight an enemy', desc: 'Any common foe of the story, alone against you.', go: () => { this.practiceAdding = false; this.showMenu('practiceEnemies'); } },
        { name: 'Fight several at once', desc: `Choose up to ${P.maxGroup} enemies and bosses, then fight them all together.`, go: () => this.showMenu('practiceGroup') },
        { name: 'Boss vs Boss', desc: 'Build two teams of up to six bosses and watch them battle.', go: () => this.showMenu('bossBattle') },
        { name: 'Play a level', desc: 'Any level of the story, on its own.', go: () => this.showMenu('practiceLevels') },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('main') }] },
      // Each list is titled by what it does; the only line under a title is the group's live count.
      practiceBosses: { title: adding ? 'ADD A BOSS' : 'FIGHT A BOSS', sub: adding ? `${group.length} / ${P.maxGroup}` : '', back: adding ? 'practiceGroup' : 'practice',
        items: [...ENEMY_DEFS.filter(isBossDef).map(duelItem), pickBack] },
      practiceEnemies: { title: adding ? 'ADD AN ENEMY' : 'FIGHT AN ENEMY', sub: adding ? `${group.length} / ${P.maxGroup}` : '', back: adding ? 'practiceGroup' : 'practice',
        items: [...ENEMY_DEFS.filter(d => !isBossDef(d)).map(duelItem), pickBack] },
      // Opens on Fight once the group has someone in it, else on adding a boss.
      practiceGroup: { title: 'SEVERAL AT ONCE', sub: `${group.length} / ${P.maxGroup}`, back: 'practice', focus: group.length ? group.length + 2 : 0, items: [
        ...group.map((id, i) => ({ name: `${ENEMY_BY_ID[id].name}  ×`, label: `Remove ${ENEMY_BY_ID[id].name}`, desc: 'Remove from the group.',
          go: () => { group.splice(i, 1); this.showMenu('practiceGroup', true); } })),
        ...[['Add a boss', 'practiceBosses'], ['Add an enemy', 'practiceEnemies']].map(([name, screen]) => ({ name: `+ ${name}`, disabled: group.length >= P.maxGroup,
          desc: group.length >= P.maxGroup ? 'The group is full. Remove one to add another.' : 'The same one may be added more than once.',
          go: () => { this.practiceAdding = true; this.showMenu(screen); } })),
        { name: 'Fight', disabled: !group.length, desc: group.length > 1 ? `Fight all ${group.length} at once.` : group.length ? 'Fight it alone, or add more first.' : 'Add at least one enemy or boss.',
          go: () => { const [first, ...rest] = group; this.practiceFromGroup = true; this.loadingFirst(...this.duelCard(first, rest), () => this.startFight(first, rest)); } },
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('practice') }] },
      practiceLevels: { title: 'PLAY A LEVEL', sub: '', back: 'practice', items: [...LEVELS.map(levelItem),
        { name: 'Back', desc: '', cue: 'menuBack', go: () => this.showMenu('practice') }] },
      pause: { title: online ? 'ONLINE' : 'PAUSED', sub: online ? 'THE WORLD KEEPS RUNNING' : '', overlay: true, items: pauseItems },
      options: { title: 'OPTIONS', sub: 'LEFT / RIGHT TO ADJUST', overlay: this.optionsFrom !== 'main' && this.optionsFrom !== 'lobby', back: this.optionsFrom === 'lobby' ? 'lobby' : this.optionsFrom === 'main' ? 'main' : 'pause', items: [
        { name: `Camera motion: ${onOff(settings.cameraMotion !== false)}`, desc: 'Camera swing and shake from attacks, rolls, impacts and collapsing floors. Turn off for a steadier view.',
          adjust: () => { settings.cameraMotion = settings.cameraMotion === false; } },
        { name: `Lessons: ${onOff(settings.lessons !== false)}`, desc: 'Cards that teach the controls the first time a level needs them. Each shows once, until you have done it.',
          adjust: () => { settings.lessons = settings.lessons === false; } },
        { name: 'Show lessons again', desc: 'Forget which lessons you have learned, so every card shows again.',
          go: () => { lessons.forget(); settings.lessons = true; saveSettings(); this.showMenu('options', true); } },
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
  // The title's Boss Rush line: what the public lobby looks like from here (multiplayer.lobby).
  titleLobby() {
    const L = typeof multiplayer !== 'undefined' ? multiplayer.lobby : { state: 'absent' }, n = L.players;
    const live = L.state === 'online' && n > 0;
    const line = L.state === 'checking' ? 'Looking for the lobby…'
      : L.state === 'online' ? live ? `${n} playing now${L.playing ? ` · ${L.playing}` : ' · in the lobby'}` : 'Nobody inside yet. Start a run, then share this link.'
      : L.state === 'offline' ? 'The lobby is not answering right now.' : 'Online play is on the home server link.';
    return { line, lobbyState: live ? 'live' : L.state === 'online' ? 'open' : L.state, reachable: L.state === 'online' };
  },
  // A new answer from the lobby: rewrite Boss Rush's line in place (the screen and the selection stay), and choose it
  // if the player has not touched the title yet.
  refreshTitleLobby() {
    if (this.screen !== 'main' || this.mode !== 'menu') return;
    const at = (this.menuItems || []).findIndex(it => it.online), t = this.titleLobby(), b = (this.menuButtons || [])[at];
    if (!b) return;
    b.classList.toggle('offline', !t.reachable && t.lobbyState !== 'checking');
    Object.assign(this.menuItems[at], t);
    if (!this.menuTouched) this.select(t.reachable ? at : 0, !!document.activeElement && $('menuBox').contains(document.activeElement));
    this.chooseMode(this.titleMode);   // the line, when Boss Rush is the chosen mode
  },
  // The title's chosen mode: its row is pressed, and the primary button and the line under the rows follow it.
  chooseMode(i) {
    const items = this.menuItems || [], it = items[i], btns = this.menuButtons || [];
    if (!it || it.size !== 'mode') return;
    this.titleMode = i;
    items.forEach((x, k) => { if (x.size === 'mode') btns[k].setAttribute('aria-pressed', String(k === i)); });
    const p = items.findIndex(x => x.size === 'primary'), s = items.findIndex(x => x.size === 'second');
    if (p >= 0) btns[p].children[0].textContent = items[p].name = it.start;
    if (s >= 0) btns[s].hidden = !it.newGame;
    this.titleLine();
  },
  // The line under the title's modes: the selected entry's own note when it has one (the new-version button), else
  // the chosen mode's line.
  titleLine() {
    const items = this.menuItems || [], it = items[this.selected], mode = items[this.titleMode];
    $('menuDesc').textContent = it && it.desc ? it.desc : mode ? mode.line || '' : '';
  },
  showMenu(screen, keepSelection) {
    if (screen === 'lobby') { multiplayer.show(); return; }
    if (screen === 'practice' || screen === 'practiceGroup') this.practiceAdding = false;   // Esc from a list being added from
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
    $('menu').classList.toggle('title-menu', s.layout === 'title');
    $('menu').classList.toggle('still', reducedMotion());
    $('menu').classList.toggle('story-menu', screen === 'story');
    $('menu').classList.toggle('boss-team-menu', screen === 'bossBattle');
    $('menu').classList.remove('hidden'); $('menu').classList.toggle('overlay', !!s.overlay);
    hud.root.classList.toggle('hidden', !inGame);
    $('menuTitle').textContent = s.title; $('menuSub').textContent = s.sub; $('menuNotice').textContent = s.notice || '';
    for (const id of ['menuList', 'menuAct', 'menuFootActions']) $(id).textContent = '';
    this.menuItems = s.items;   // what select() and adjust() read, so a key press never rebuilds every screen
    this.menuButtons = [];      // every button in item order, wherever it sits (the title spreads them over three places)
    const title = s.layout === 'title';
    // The title's pieces take the shared UI pieces (js/ui-theme.js): modes are rows, the primary starts the chosen one,
    // the rest are quiet text buttons in the footer.
    const titleClass = { mode: 'title-mode ui-row', primary: 'title-primary ui-primary', second: 'title-second ui-text-button',
      foot: 'title-foot ui-text-button', update: 'title-foot title-update ui-text-button' };
    s.items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      if (!title || it.size === 'mode' || it.desc) b.setAttribute('aria-describedby', 'menuDesc');
      b.className = title ? titleClass[it.size] : 'menuBtn' + (it.adjust ? ' adj' : '') + (it.size ? ` ${it.size}` : '');
      b.innerHTML = title ? '<span class="n"></span>' : `<div class="n"></div><div class="d"></div>`;
      b.children[0].textContent = it.name; if (!title) b.children[1].textContent = it.desc;
      if (title && it.size === 'primary') { const key = document.createElement('span'); key.className = 'ui-key'; key.setAttribute('aria-hidden', 'true'); b.appendChild(key); }
      if (title && it.size === 'mode') {
        b.setAttribute('aria-pressed', 'false');
        if (it.reachable === false && it.lobbyState !== 'checking') b.classList.add('offline');
        b.addEventListener('dblclick', () => { this.select(i); this.confirm(); });   // a double click starts the mode, as Enter does
      }
      if (it.group) { b.dataset.group = it.group; b.classList.add('campaign-start'); }
      if (it.label) b.setAttribute('aria-label', it.label);
      if (it.team) b.dataset.team = it.team;
      if (it.row) b.style.gridRow = it.row;
      if (it.disabled) { b.setAttribute('aria-disabled', 'true'); b.classList.add('unavailable'); }
      b.addEventListener('focus', () => this.select(i));
      if (it.adjust) for (const [cls, d] of [['al', -1], ['ar', 1]]) {   // ‹ › : the setting can be stepped either way (clickable)
        const a = document.createElement('span'); a.className = cls; a.textContent = d < 0 ? '‹' : '›';
        a.addEventListener('click', ev => { ev.stopPropagation(); this.select(i); this.adjust(d); });
        b.appendChild(a);
      }
      // A click on a title mode only chooses it, as in the lobby; every other button does its job.
      b.addEventListener('click', () => { this.menuTouched = true; this.select(i); if (!title || it.size !== 'mode') this.confirm(); });
      // Scrolling can put another row under a stationary pointer. Only actual mouse movement may select it, and on the
      // title the pointer only points: it never changes the chosen mode.
      b.addEventListener('mousemove', ev => {
        if ((!ev.movementX && !ev.movementY) || this.selected === i) return;
        events.emit('menuMove'); this.menuTouched = true;
        this.hovering = true; try { this.select(i); } finally { this.hovering = false; }
      });
      (!title || it.size === 'mode' ? list : $(it.size === 'primary' || it.size === 'second' ? 'menuAct' : 'menuFootActions')).appendChild(b);
      this.menuButtons.push(b);
    });
    this.showMenuHint();
    if (!keepSelection) this.menuTouched = false;
    if (title) this.chooseMode(keepSelection && this.titleMode != null ? this.titleMode : s.focus);   // a redraw keeps the chosen mode
    this.select(keepSelection ? this.selected : s.focus ?? Math.max(0, s.items.findIndex(it => !it.disabled)), true);
    if (screen === 'main' && typeof multiplayer !== 'undefined') multiplayer.peek();   // who is online right now
  },
  // Key or button names follow the device used last, so this is redone when it changes.
  showMenuHint() {
    const screen = this.screen, own = this.screens()[screen].hint, hint = $('menuHint');
    hint.classList.toggle('ui-hints', screen === 'main');
    if (own) { hint.textContent = own; return; }
    if (screen === 'main') {   // the title's footer: key caps for moving and choosing, then the version
      const pad = usingPad(); hint.textContent = '';
      for (const [key, label] of [[pad ? 'D-pad' : '↑ ↓', 'Move'], [pad ? 'A' : 'Enter', 'Select'], ['', VERSION]]) {
        const item = document.createElement('span'), cap = document.createElement('span');
        cap.className = 'ui-key'; cap.textContent = key; item.append(cap, label); hint.appendChild(item);
      }
      this.titleKeys();
      return;
    }
    hint.textContent = `${menuLabel('up')} · ${menuLabel('down')} to select · ${menuLabel('confirm')} to confirm` +
      (screen === 'options' ? ` · ${menuLabel('left')} · ${menuLabel('right')} to adjust` : '') +
      ` · ${menuLabel('back')} to go back`;
  },
  // The primary button shows the confirm key while it is what that key does: on the chosen mode or on the button itself.
  titleKeys() {
    if (this.screen !== 'main' || !this.menuButtons) return;
    const items = this.menuItems || [], p = items.findIndex(x => x.size === 'primary'), it = items[this.selected];
    const key = p >= 0 && this.menuButtons[p].querySelector('.ui-key');
    if (key) key.textContent = this.selected === this.titleMode || (it && it.size === 'primary') ? usingPad() ? 'A' : 'Enter' : '';
  },
  // One step of directional menu input (keys, D-pad or stick); 'next' and 'prev' (Tab) go through every entry in order.
  menuStep(dir) {
    const items = this.menuItems || [], it = items[this.selected], shown = i => !(this.menuButtons[i] && this.menuButtons[i].hidden);
    this.menuTouched = true;
    if (dir === 'next' || dir === 'prev') {
      const n = items.length, d = dir === 'next' ? 1 : -1;
      let to = this.selected;
      do to = (to + d + n) % n; while (!shown(to) && to !== this.selected);
      events.emit('menuMove'); this.select(to, true);
      return;
    }
    if (this.screens()[this.screen].layout === 'title' && it) {
      // Rows: each mode, the primary, New game (when shown), then the footer's entries together. Up and down go row
      // to row (wrapping); left and right go along the footer.
      const rows = [];
      items.forEach((x, i) => { if (!shown(i)) return;
        const key = x.size === 'mode' ? `mode${i}` : x.size === 'update' ? 'foot' : x.size, row = rows.find(r => r.key === key);
        if (row) row.at.push(i); else rows.push({ key, at: [i] }); });
      const r = Math.max(0, rows.findIndex(row => row.at.includes(this.selected))), row = rows[r].at;
      const to = dir === 'down' || dir === 'up' ? rows[(r + (dir === 'down' ? 1 : -1) + rows.length) % rows.length].at[0]
        : row.length > 1 ? row[(row.indexOf(this.selected) + (dir === 'left' ? -1 : 1) + row.length) % row.length] : this.selected;
      if (to !== this.selected) { events.emit('menuMove'); this.select(to, true); }
      return;
    }
    if (dir === 'up' || dir === 'down') { events.emit('menuMove'); this.select(this.selected + (dir === 'up' || dir === 'left' ? -1 : 1), true); }
    else this.adjust(dir === 'left' ? -1 : 1);
  },
  select(i, focus = true) {
    const btns = this.menuButtons || [], n = btns.length, title = this.screen === 'main';
    this.selected = n ? (i + n) % n : 0;
    btns.forEach((b, k) => { b.classList.toggle('sel', k === this.selected); b.tabIndex = k === this.selected ? 0 : -1; });
    const cur = btns[this.selected];
    if (focus && cur && document.activeElement !== cur) cur.focus({ preventScroll: true });
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const it = (this.menuItems || [])[this.selected];
    if (title) { if (it && it.size === 'mode' && !this.hovering) this.chooseMode(this.selected); this.titleLine(); this.titleKeys(); }
    else $('menuDesc').textContent = it ? it.desc || '' : '';
    $('menuUp').classList.toggle('off', this.selected <= 0); $('menuDown').classList.toggle('off', this.selected >= n - 1);
  },
  confirm() { const it = (this.menuItems || [])[this.selected]; if (!it || it.disabled) return; if (it.go) { events.emit(it.cue || 'menuConfirm'); it.go(); } else this.adjust(1); },
  adjust(d) {
    const it = this.menuItems[this.selected];
    if (!it || !it.adjust) return;
    it.adjust(d); saveSettings(); applySettings();
    events.emit('menuAdjust', { dir: d });
    // Only the labels change: rewrite them in place (the list, its buttons and the selection stay).
    const items = this.screens()[this.screen].items, btns = this.menuButtons;
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
    if (fromPointer && online && (multiplayer.spectatorMode || multiplayer.blessingPending)) return;   // the blessing pick freed the mouse
    if (this.mode !== 'play' || (!online && !this.player.alive())) return;   // online menus remain available while dead or spectating
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
    this.kind = 'arena'; this.duelId = id; this.duelPartners = partners;
    this.level = L ? { ...L, fullTracking: ARENA.fullTracking, playerStart: d.playerStart, enemyStart: d.enemyStart } : ARENA;
    this.enterPlay(); this.reset(); this.showLoading(...this.duelCard(id, partners));
  },
  // Loading card for a duel, or for a group of opponents fought together.
  duelCard(id, partners = []) {
    const defs = [id, ...partners].map(i => ENEMY_BY_ID[i]);
    return defs.length > 1 ? [`Duel: ${defs.map(d => d.name).join(' & ')}`, `${defs.length} ${defs.every(isBossDef) ? 'bosses' : 'foes'} at once. Fight them together.`] : [`Duel: ${defs[0].name}`, defs[0].description];
  },
  startLevel(id) {
    this.kind = 'level'; this.duelPartners = []; this.level = ALL_LEVELS.find(l => l.id === id); this.enterPlay(); this.reset();
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
  // R: instant on the death, win or level-complete screens; otherwise press twice.
  requestRestart() {
    if (typeof multiplayer !== 'undefined' && multiplayer.active()) { multiplayer.show(); return; }
    if (this.story) return;   // a campaign has no restart: death returns you to the bonfire
    if (!this.player.alive() || this.duelWon() || this.complete || this.restartArm > 0) { this.reset(); return; }
    this.restartArm = CONFIG.restartConfirmTime;
  },
});
