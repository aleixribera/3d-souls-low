'use strict';
// Opt-in co-op. Solo play never opens a socket or changes simulation authority.
CONFIG.multiplayer = ArenaNet.config;
const multiplayer = (() => {
  const C = CONFIG.multiplayer;
  let socket = null, self = null, leader = null, catalog = null, session = null, connected = false;
  let loaded = false, ready = false, starting = false, seq = 0, swing = 0, playback = null, ping = null;
  let remotes = new Map(), roster = [], lastPose = 0, lastPing = 0, pendingExecution = null;
  let intentionalClose = false, grantedEnemy = null, deferredStart = null, latestFrame = null, receivedFrames = 0, lastStats = 0;
  let reconnectWanted = false, reconnectTimer = null, reconnectAttempt = 0, joinAttempt = 0;
  let spectatorTarget = null, spectatorBarOpen = true, spectatorWasWaiting = false, spectatorViewApplied = false, lastView = null;
  let lobbyPadDirection = null, lobbyPadTimer = 0, adventureBeforeEdit = null, nameDraft = '', nameLowercase = false;
  const viewPosition = new THREE.Vector3(), viewRotation = new THREE.Quaternion(), nextViewRotation = new THREE.Quaternion();
  const decoder = new ArenaNet.FrameDecoder(), tracks = new Map();
  const heldActivity = new Set();
  let activityPending = false, lastActivitySent = -Infinity;
  const hitIds = new WeakMap();
  const panel = document.createElement('section');
  panel.id = 'publicLobby'; panel.className = 'hidden'; panel.setAttribute('aria-label', 'Public lobby');
  panel.innerHTML = `<div class="lobby-card"><h1>PUBLIC LOBBY</h1><p id="lobbyStatus" role="status">Connecting…</p>
    <div id="lobbyCurrentLevel" class="online-level" hidden></div>
    <label>Your name <input id="lobbyName" maxlength="24" autocomplete="nickname" placeholder="Your name"></label>
    <section id="lobbyNameEditor" class="lobby-name-editor" aria-label="Edit your name" hidden>
      <output id="lobbyNamePreview" aria-live="polite"></output><div id="lobbyNameKeys"></div></section>
    <div id="lobbyPlayers" aria-label="Players"></div>
    <section class="lobby-controls" aria-labelledby="lobbyControlsTitle"><h2 id="lobbyControlsTitle">Basic controls</h2>
    <p id="lobbyControlsDevice"></p><dl id="lobbyControlsList"></dl>
    <p class="lobby-controls-tip">Attacks, rolls and blocking use stamina. Ease off to let it refill.</p></section>
    <div id="lobbyLeader"><label>Adventure <select id="lobbyAdventure"></select></label>
    <div class="lobby-actions"><button id="lobbyStart">Start together</button><button id="lobbyRestart">Restart level</button>
    <button id="lobbyNext">Next level</button><button id="lobbyReturn">Return everyone to lobby</button></div></div>
    <p id="lobbyNotice" role="alert"></p><div class="lobby-actions"><button id="lobbyResume">Return to game</button><button id="lobbyLeave">Leave lobby</button></div>
    <p id="lobbyPadHint" class="lobby-hint"></p>
    <p class="lobby-hint">Story 2 (Lands) is selected by default. Chapters continue automatically. BOSS ONLY pits the party against every boss in a row: fallen players spectate, everyone refills between bosses, and a team wipe ends the run. Leadership passes on after five minutes without input.</p></div>`;
  const style = document.createElement('style');
  style.textContent = `#publicLobby{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:#090c12eF;color:#e8dfcd;font:16px Georgia,serif;padding:24px;overflow:auto;box-sizing:border-box}
    #publicLobby.hidden{display:none}#publicLobby .lobby-card{width:min(690px,100%);max-height:90vh;overflow:auto;padding:24px;border:1px solid #6d5c3d;background:#141719;box-shadow:0 18px 70px #0008}
    #publicLobby h1{letter-spacing:.15em;font-size:24px;margin:0 0 12px}#publicLobby label{display:block;margin:16px 0 8px}
    #publicLobby input,#publicLobby select{display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px;background:#23282a;color:#eee6d6;border:1px solid #746448;font:inherit}
    #publicLobby button{padding:10px 14px;background:#2c302e;color:#eee6d6;border:1px solid #817047;cursor:pointer;font:inherit}#publicLobby button:hover,#publicLobby button:focus-visible{background:#474737;outline:2px solid #d1b674}
    #publicLobby button:disabled{opacity:.4;cursor:default}#publicLobby .lobby-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}#publicLobby .lobby-player{display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #393c38}
    #publicLobby.lobby-pad .pad-selected{outline:2px solid #efd393;outline-offset:3px;background:#474737}
    #publicLobby .lobby-name-editor{margin:12px 0;padding:12px;border:1px solid #817047;background:#1b2221}
    #lobbyNameEditor[hidden]{display:none}#lobbyNamePreview{display:block;min-height:1.5em;padding:8px;margin-bottom:10px;background:#111817;color:#fff0c9;white-space:pre-wrap;overflow-wrap:anywhere}
    #lobbyNameKeys{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px}#publicLobby #lobbyNameKeys button{min-height:40px;padding:6px 0;font:14px system-ui}
    #publicLobby #lobbyNameKeys .name-action{grid-column:span 2;font-size:12px}#publicLobby select[size]{max-height:220px}
    #publicLobby .lobby-player span{flex:1}#publicLobby .lobby-player button{font-size:13px;padding:6px 9px}#lobbyNotice{color:#efd393;min-height:1.3em}#publicLobby .lobby-hint{font:13px/1.6 system-ui;color:#aaa99f}
    #publicLobby .lobby-controls{margin:18px 0;padding:14px;background:#1c2223;border:1px solid #454b43;font:14px/1.5 system-ui}
    #publicLobby .lobby-controls h2{margin:0;font-size:18px;color:#efd393}#lobbyControlsDevice{margin:2px 0 10px;color:#bdbeb3;font-size:12px}
    #lobbyControlsList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 24px;margin:0}
    #lobbyControlsList div{display:flex;justify-content:space-between;gap:10px;align-items:baseline}#lobbyControlsList dt{color:#c7c9c0}#lobbyControlsList dd{margin:0;text-align:right;color:#fff1cf;font-weight:600}
    #publicLobby .lobby-controls-tip{margin:12px 0 0;color:#bdbeb3;font-size:12px}
    @media(max-width:600px){#lobbyControlsList{grid-template-columns:1fr}#publicLobby{padding:12px}#publicLobby .lobby-card{padding:16px;box-sizing:border-box}}
    #onlineParty{position:fixed;right:18px;top:42px;z-index:25;max-width:240px;pointer-events:none;color:#e9e1ca;font:12px/1.7 system-ui;text-align:right;text-shadow:0 1px 3px #000;background:#10151599;padding:8px 12px;border-left:2px solid #8c7951}
    .online-level{margin:0 0 8px;padding:6px 10px;border:1px solid #8c7951;background:#161b1bef;color:#fff0c9;font:600 15px/1.4 system-ui;text-align:left}
    .online-level[hidden]{display:none}
    #onlineAlive{margin-top:6px;text-align:left;font:11px/1.6 system-ui;max-height:35vh;overflow:auto;pointer-events:auto}
    #onlineAlive .alive-player{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;margin-bottom:6px}#onlineAlive .alive-player span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #onlineAlive .alive{color:#c4dfad}#onlineAlive .fallen{color:#c4a49d}#onlineAlive strong{white-space:nowrap;font-weight:400}
    .ally-health{height:4px;background:#050907d9;border:1px solid #7d927354;overflow:hidden;box-sizing:content-box}.ally-health[hidden]{display:none}
    .ally-health-fill{display:block;width:100%;height:100%;background:linear-gradient(90deg,#65966d,#c5dba0);transform-origin:left;transition:transform .18s linear}
    #onlineAlive .ally-health{grid-column:1/-1}
    .online-name{min-width:78px;max-width:190px;box-sizing:border-box;text-align:center}.online-name-text{display:block;overflow:hidden;text-overflow:ellipsis}
    .online-name .ally-health{margin:4px 0 1px}
    @media(prefers-reduced-motion:reduce){.ally-health-fill{transition:none}}
    @media(max-width:800px){#onlineParty{top:118px;max-width:180px}}
    #onlineSpectator{position:fixed;z-index:50;bottom:max(18px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));color:#fff0c9;text-align:center;font:14px/1.5 system-ui}
    #onlineSpectator[hidden],#spectatorControls[hidden]{display:none}
    #spectatorControls{padding:10px 12px;background:#111817f2;border:1px solid #8c7951;box-shadow:0 6px 24px #0008}
    #onlineSpectator .spectator-row{display:flex;align-items:center;gap:12px}
    #onlineSpectator .spectator-person{flex:1;min-width:0}#spectatorName{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px}
    #onlineSpectator button{color:#fff0c9;background:#202725;border:1px solid #8c7951;cursor:pointer;font:inherit;padding:8px 12px}
    #onlineSpectator button:focus-visible{outline:2px solid #efd393;outline-offset:3px}#onlineSpectator button:disabled{opacity:.35;cursor:default}
    #onlineSpectator .spectator-arrow{font-size:22px;min-width:44px;min-height:44px}#spectatorHint{margin:6px 0 0;color:#bdbeb3;font-size:12px}
    #spectatorToggle{margin-top:6px;font-size:12px!important}
    body.spectator-view #died,body.spectator-view #pBars{display:none}body.spectator-view canvas#view.dying{filter:none;transition:none}
    #onlineParty.hidden{display:none}.online-name{position:fixed;z-index:21;pointer-events:none;color:#ecd79b;background:#111a;padding:3px 7px;border-radius:3px;font:12px system-ui;transform:translate(-50%,-100%);white-space:nowrap}`;
  document.head.appendChild(style); document.body.appendChild(panel);
  const wipeScreen = document.createElement('section'); wipeScreen.id = 'teamWipeScreen'; wipeScreen.hidden = true;
  wipeScreen.tabIndex = -1; wipeScreen.setAttribute('role', 'alert'); wipeScreen.setAttribute('aria-label', 'Team wiped');
  wipeScreen.innerHTML = '<div class="wipe-message"><p class="wipe-kicker">BOSS ONLY · RUN ENDED</p><h1>TEAM WIPED</h1><div class="wipe-rule"></div><p id="teamWipeScore"></p><p class="wipe-return">Returning to lobby…</p></div>';
  document.body.appendChild(wipeScreen);
  const wipeStyle = document.createElement('style');
  wipeStyle.textContent = `#teamWipeScreen[hidden]{display:none}
    #teamWipeScreen{position:fixed;inset:0;z-index:120;display:grid;place-items:center;box-sizing:border-box;padding:24px;text-align:center;color:#c94242;background:radial-gradient(ellipse at center,#350910 0%,#130206 55%,#030001 100%);box-shadow:inset 0 0 130px #000;animation:wipe-veil .8s ease-out both;outline:none}
    #teamWipeScreen .wipe-message{width:100%;animation:wipe-arrive 1.6s cubic-bezier(.16,1,.3,1) both}
    #teamWipeScreen h1{font:400 clamp(36px,9vw,108px)/1.2 Georgia,serif;letter-spacing:.13em;margin:20px 0;text-indent:.13em;color:#d74747;text-shadow:0 0 30px #c3142570,0 2px 12px #000}
    #teamWipeScreen p{font:14px/1.7 Georgia,serif;letter-spacing:.1em;color:#c18c8c}
    #teamWipeScreen .wipe-kicker{font:11px/1.6 system-ui;letter-spacing:.3em;color:#a26167}
    #teamWipeScreen .wipe-rule{height:1px;width:min(480px,80%);margin:26px auto;background:linear-gradient(90deg,transparent,#b33040,transparent)}
    #teamWipeScreen .wipe-return{margin-top:36px;font-size:12px;color:#95686d}
    @keyframes wipe-veil{from{opacity:0}to{opacity:1}}
    @keyframes wipe-arrive{from{opacity:0;transform:scale(1.12);filter:blur(5px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    @media(prefers-reduced-motion:reduce){#teamWipeScreen,#teamWipeScreen .wipe-message{animation:none}}`;
  document.head.appendChild(wipeStyle);
  let wipeTimer = null;
  function clearTeamWipe() { clearTimeout(wipeTimer); wipeTimer = null; wipeScreen.hidden = true; panel.inert = false; }
  function showTeamWipe(run) {
    clearTeamWipe();
    el('teamWipeScore').textContent = run ? `Bosses defeated · ${run.number - 1} / ${run.total}` : '';
    panel.inert = true; wipeScreen.hidden = false; input.clear(); wipeScreen.focus();
    wipeTimer = setTimeout(() => {
      clearTeamWipe();
      if (connected) { show(); if (!usingPad()) el('lobbyLeave').focus(); }
    }, C.teamWipeScreenTime * 1000);
  }
  const runIntro = document.createElement('section'); runIntro.id = 'runIntroScreen'; runIntro.hidden = true;
  runIntro.tabIndex = -1; runIntro.setAttribute('role', 'status'); runIntro.setAttribute('aria-label', 'Adventure begins');
  runIntro.innerHTML = `<div class="intro-halo" aria-hidden="true"></div><div class="intro-embers" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--ember:${i}"></i>`).join('')}</div>
    <div class="intro-message"><div class="intro-crest" aria-hidden="true"><span>✦</span></div><p id="runIntroKicker" class="intro-kicker"></p>
    <h1 id="runIntroTitle"></h1><div class="intro-rule"></div><p id="runIntroLine" class="intro-line"></p><p id="runIntroTrials" class="intro-trials"></p><p class="intro-ready">PREPARE YOURSELF</p></div>`;
  document.body.appendChild(runIntro);
  const introStyle = document.createElement('style');
  introStyle.textContent = `#runIntroScreen[hidden]{display:none}
    #runIntroScreen{position:fixed;inset:0;z-index:120;display:grid;place-items:center;overflow:hidden;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 44%,#35270d 0%,#100d05 48%,#030302 100%);color:#f7dfa0;text-align:center;outline:none;animation:intro-veil var(--intro-duration) linear both}
    #runIntroScreen .intro-halo{position:absolute;width:min(88vw,650px);aspect-ratio:1;border:1px solid #c1993d1c;border-radius:50%;box-shadow:0 0 90px #e3b3490b,inset 0 0 100px #f4c34b08;animation:intro-halo 5s ease-out both}
    #runIntroScreen .intro-halo:before,#runIntroScreen .intro-halo:after{content:'';position:absolute;inset:25px;border:1px solid #ddbc6120;border-radius:50%}#runIntroScreen .intro-halo:after{inset:65px;border-style:dashed;border-color:#ddbc6115}
    #runIntroScreen .intro-message{position:relative;z-index:1;width:min(1040px,100%)}
    #runIntroScreen .intro-crest{position:relative;width:68px;height:68px;margin:0 auto 34px;border:1px solid #d4ad595e;transform:rotate(45deg);box-shadow:0 0 40px #f5bf3d1c;animation:intro-crest 1.5s ease-out both}
    #runIntroScreen .intro-crest:before{content:'';position:absolute;inset:7px;border:1px solid #dab86c44}#runIntroScreen .intro-crest span{display:block;transform:rotate(-45deg);font:46px/68px Georgia,serif;color:#ffe6a6;text-shadow:0 0 28px #f7c752a0}
    #runIntroScreen .intro-kicker{font:10px/1.8 system-ui;letter-spacing:.26em;color:#c2a96d;animation:intro-rise 1s .25s both}
    #runIntroScreen h1{font:400 clamp(32px,6.8vw,84px)/1.25 Georgia,serif;letter-spacing:.1em;text-indent:.1em;margin:18px 0 22px;color:#ffe8ac;text-shadow:0 0 42px #ecc16340,0 2px 12px #000;animation:intro-title 1.8s .4s cubic-bezier(.16,1,.3,1) both}
    #runIntroScreen .intro-rule{height:1px;width:min(480px,85%);margin:0 auto 24px;background:linear-gradient(90deg,transparent,#d6ae58,transparent);animation:intro-rule 1.6s .65s both}
    #runIntroScreen .intro-line{font:clamp(14px,1.6vw,18px)/1.9 Georgia,serif;white-space:pre-line;color:#decc9f;animation:intro-rise 1.2s 1s both}
    #runIntroScreen .intro-trials{margin-top:24px;font:10px/1.8 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#b89d60;animation:intro-rise 1.2s 1.35s both}
    #runIntroScreen .intro-ready{margin-top:32px;font:9px/1.6 system-ui;letter-spacing:.32em;color:#8f7b4d;animation:intro-rise 1s 1.8s both}
    #runIntroScreen .intro-embers{position:absolute;inset:0;pointer-events:none}#runIntroScreen .intro-embers i{position:absolute;left:calc(6% + var(--ember)*8%);top:85%;width:2px;height:2px;border-radius:50%;background:#f7d47b;box-shadow:0 0 9px #ffd35f;animation:intro-ember 4s calc(var(--ember)*-.33s) linear infinite}
    @keyframes intro-veil{0%{opacity:0}12%,86%{opacity:1}100%{opacity:0}}
    @keyframes intro-title{from{opacity:0;transform:scale(1.08);filter:blur(6px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    @keyframes intro-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes intro-rule{from{opacity:0;transform:scaleX(.15)}to{opacity:1;transform:scaleX(1)}}
    @keyframes intro-crest{from{opacity:0;transform:rotate(25deg) scale(.85)}to{opacity:1;transform:rotate(45deg) scale(1)}}
    @keyframes intro-halo{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1.08)}}
    @keyframes intro-ember{0%{opacity:0;transform:translateY(0)}20%,65%{opacity:.65}100%{opacity:0;transform:translate(20px,-65vh)}}
    @media(max-height:600px){#runIntroScreen .intro-crest{width:44px;height:44px;margin-bottom:18px}#runIntroScreen .intro-crest span{font-size:30px;line-height:44px}#runIntroScreen h1{margin:12px 0 16px}#runIntroScreen .intro-rule{margin-bottom:14px}#runIntroScreen .intro-ready,#runIntroScreen .intro-trials{margin-top:16px}}
    @media(prefers-reduced-motion:reduce){#runIntroScreen,#runIntroScreen *{animation:none!important}#runIntroScreen .intro-embers{display:none}}`;
  document.head.appendChild(introStyle);
  let runIntroPending = null;
  function clearRunIntro() { runIntroPending = null; runIntro.hidden = true; panel.inert = false; el('menu').inert = false; input.clear(); }
  function showRunIntro(id) {
    const data = LOBBY_INTROS.find(x => x.id === id);
    if (!data) throw new Error('Unknown lobby intro: ' + id);
    for (const field of ['kicker', 'title', 'line']) el('runIntro' + field[0].toUpperCase() + field.slice(1)).textContent = data[field];
    el('runIntroTrials').textContent = session.gauntlet ? `${session.gauntlet.total} bosses · One unbroken run` : `${session.campaign.total} chapters · One shared journey`;
    runIntro.style.setProperty('--intro-duration', C.runIntroScreenTime + 's');
    runIntroPending = null; panel.inert = true; el('menu').inert = true; runIntro.hidden = false;
    Game.loading = C.runIntroScreenTime; el('loading').classList.remove('show'); input.clear(); runIntro.focus();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  window.addEventListener('keydown', ev => { if (!runIntro.hidden) { ev.preventDefault(); ev.stopImmediatePropagation(); } }, true);
  const party = document.createElement('div'); party.id = 'onlineParty'; party.className = 'hidden'; document.body.appendChild(party);
  party.innerHTML = '<div id="onlineCurrentLevel" class="online-level" hidden></div><div id="onlinePartyDetails"></div><section id="onlineAlive" aria-label="Players alive"></section>';
  const allyMeters = new Map();
  function makeAllyHealth(parent, id) {
    const meter = document.createElement('div'), fill = document.createElement('span');
    meter.className = 'ally-health'; meter.dataset.playerId = id; meter.setAttribute('role', 'meter');
    meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(PLAYER_DEF.stats.maxHp));
    fill.className = 'ally-health-fill'; meter.appendChild(fill); parent.appendChild(meter);
    return { meter, fill };
  }
  function updateAllyHealth(bar, hp, name) {
    const known = Number.isFinite(hp), max = PLAYER_DEF.stats.maxHp, value = known ? clamp(hp, 0, max) : 0;
    const signature = `${known}/${value}/${name}`;
    if (bar.meter.dataset.health === signature) return;
    bar.meter.dataset.health = signature; bar.meter.hidden = !known;
    bar.meter.setAttribute('aria-label', name + ' health');
    bar.meter.setAttribute('aria-valuenow', String(Math.round(value)));
    bar.meter.setAttribute('aria-valuetext', `${Math.ceil(value)} of ${max} health`);
    bar.meter.title = `${name} · ${Math.ceil(value)} / ${max} HP`;
    bar.fill.style.transform = `scaleX(${value / max})`;
  }
  function updateAlivePanel() {
    if (!active()) return;
    const players = roster.map(p => {
      const state = p.id === self ? Game.player : remotes.get(p.id)?.samples.at(-1);
      const hp = state?.hp ?? p.hp;
      return { id: p.id, hp, name: p.name + (p.id === self ? ' (you)' : ''), status: hp === null || hp === undefined ? 'Loading' : hp > 0 ? 'Alive' : 'Fallen' };
    });
    const signature = JSON.stringify(players.map(({ id, name, status }) => ({ id, name, status }))), pane = el('onlineAlive');
    if (pane.dataset.players !== signature) {
      pane.dataset.players = signature; pane.textContent = ''; allyMeters.clear();
      const title = document.createElement('div'); title.textContent = `PLAYERS ALIVE · ${players.filter(p => p.status === 'Alive').length}/${players.length}`; pane.appendChild(title);
      for (const p of players) {
        const row = document.createElement('div'); row.className = 'alive-player ' + (p.status === 'Alive' ? 'alive' : 'fallen');
        const name = document.createElement('span'), status = document.createElement('strong');
        name.textContent = p.name; status.textContent = p.status; row.append(name, status); pane.appendChild(row);
        if (p.id !== self) allyMeters.set(p.id, makeAllyHealth(row, p.id));
      }
    }
    for (const p of players) if (allyMeters.has(p.id)) updateAllyHealth(allyMeters.get(p.id), p.hp, p.name);
  }
  const el = id => document.getElementById(id);
  function lobbyControls() {
    const root = el('lobbyNameEditor').hidden ? panel : el('lobbyNameEditor');
    return [...root.querySelectorAll('button,input,select')].filter(node => !node.disabled && !node.hidden && node.offsetParent);
  }
  function focusLobbyControl(node) {
    for (const previous of panel.querySelectorAll('.pad-selected')) previous.classList.remove('pad-selected');
    if (!node) return;
    node.classList.add('pad-selected'); node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'nearest' });
  }
  function ensureLobbyFocus() {
    const controls = lobbyControls();
    if (controls.includes(document.activeElement)) {
      if (!document.activeElement.classList.contains('pad-selected')) focusLobbyControl(document.activeElement);
      return document.activeElement;
    }
    const preferred = [el('lobbyAdventure'), el('lobbyResume'), el('lobbyName')].find(node => controls.includes(node));
    const next = preferred || controls[0]; focusLobbyControl(next); return next;
  }
  function updateLobbyPadHint() {
    panel.classList.toggle('lobby-pad', usingPad());
    el('lobbyPadHint').textContent = !usingPad() ? '' : !el('lobbyNameEditor').hidden
      ? 'D-pad / left stick: move · A / ×: choose · X / □: delete · B / ○: cancel'
      : adventureBeforeEdit !== null ? 'D-pad / left stick: choose adventure · A / ×: confirm · B / ○: cancel'
      : 'D-pad / left stick: move · A / ×: select · ← / →: change adventure · B / ○: back';
  }
  events.on('device', updateLobbyPadHint);
  function closeAdventurePicker(cancel = false) {
    if (adventureBeforeEdit !== null && cancel) el('lobbyAdventure').value = adventureBeforeEdit;
    adventureBeforeEdit = null; el('lobbyAdventure').removeAttribute('size'); updateLobbyPadHint();
  }
  function closeNameEditor(save = false, restoreFocus = true) {
    if (save) { el('lobbyName').value = nameDraft; el('lobbyName').dispatchEvent(new Event('change', { bubbles: true })); }
    el('lobbyNameEditor').hidden = true;
    if (restoreFocus) focusLobbyControl(el('lobbyName'));
    updateLobbyPadHint();
  }
  function nameKey(key) {
    if (key === 'done' || key === 'cancel') { closeNameEditor(key === 'done'); return; }
    if (key === 'case') { nameLowercase = !nameLowercase; buildNameKeys(); return; }
    if (key === 'delete') nameDraft = nameDraft.slice(0, -1);
    else if (nameDraft.length < C.maxName) nameDraft += key;
    el('lobbyNamePreview').textContent = nameDraft || 'Your name';
  }
  function buildNameKeys() {
    const previous = document.activeElement?.dataset.nameKey, keys = el('lobbyNameKeys'); keys.textContent = '';
    const characters = (nameLowercase ? 'abcdefghijklmnopqrstuvwxyz' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') + '0123456789-_. ';
    const add = (label, key, row, column, action = false) => {
      const button = document.createElement('button'); button.textContent = label; button.dataset.nameKey = key;
      button.dataset.nameRow = row; button.dataset.nameColumn = column;
      if (action) button.className = 'name-action';
      button.onclick = () => nameKey(key); keys.appendChild(button);
    };
    [...characters].forEach((char, i) => add(char === ' ' ? '␣' : char, char, Math.floor(i / 10), i % 10));
    [['Space', ' '], ['Delete', 'delete'], [nameLowercase ? 'ABC' : 'abc', 'case'], ['Cancel', 'cancel'], ['Done', 'done']]
      .forEach(([label, key], i) => add(label, key, 4, i * 2 + 0.5, true));
    focusLobbyControl([...keys.children].find(node => node.dataset.nameKey === previous) || keys.firstElementChild);
  }
  function openNameEditor() {
    closeAdventurePicker(true); nameDraft = el('lobbyName').value; el('lobbyNameEditor').hidden = false;
    el('lobbyNamePreview').textContent = nameDraft || 'Your name'; buildNameKeys(); updateLobbyPadHint();
  }
  function lobbyBack() {
    if (!wipeScreen.hidden) return;
    if (!el('lobbyNameEditor').hidden) closeNameEditor();
    else if (adventureBeforeEdit !== null) closeAdventurePicker(true);
    else if (active()) hide();
    else leave();
  }
  const spectator = document.createElement('section'); spectator.id = 'onlineSpectator'; spectator.hidden = true;
  spectator.setAttribute('aria-label', 'Spectator controls'); spectator.setAttribute('data-cursor', '');
  spectator.innerHTML = `<div id="spectatorControls"><div class="spectator-row">
    <button id="spectatorPrevious" class="spectator-arrow" aria-label="Previous player">&#8592;</button>
    <div class="spectator-person"><span>SPECTATING</span><strong id="spectatorName" role="status"></strong></div>
    <button id="spectatorNext" class="spectator-arrow" aria-label="Next player">&#8594;</button>
    </div><p id="spectatorHint"></p></div><button id="spectatorToggle" aria-controls="spectatorControls" aria-expanded="true">Hide spectator bar</button>`;
  document.body.appendChild(spectator);
  function waitingForTeamWipe() { return active() && !!session.teamWipeOnly && !!Game.player && !Game.player.alive(); }
  function spectatorCandidates() {
    const now = performance.now() / 1000;
    return [...remotes].filter(([, r]) => {
      const s = r.samples[r.samples.length - 1];
      return s && s.hp > 0 && s.state !== PS.DEAD && s.view && now - s.at < C.stalePlayer;
    });
  }
  function updateSpectatorBar() {
    const target = remotes.get(spectatorTarget), latest = target?.samples[target.samples.length - 1];
    const text = (id, value) => { const node = el(id); if (node.textContent !== value) node.textContent = value; };
    text('spectatorName', latest?.name || 'Waiting for a teammate…');
    el('spectatorPrevious').disabled = el('spectatorNext').disabled = spectatorCandidates().length < 2;
    el('spectatorControls').hidden = !spectatorBarOpen;
    text('spectatorToggle', (spectatorBarOpen ? 'Hide' : 'Show') + ' spectator bar · ' + (usingPad() ? 'X / □' : 'Tab'));
    el('spectatorToggle').setAttribute('aria-expanded', String(spectatorBarOpen));
    text('spectatorHint', usingPad() ? 'LB / L1 · RB / R1 to switch · Menu / Options to pause' : '← / → to switch · Escape to pause');
  }
  function switchSpectator(direction) {
    const candidates = spectatorCandidates(), at = candidates.findIndex(([id]) => id === spectatorTarget);
    if (candidates.length) spectatorTarget = candidates[(at + direction + candidates.length) % candidates.length][0];
    updateSpectatorBar();
  }
  function toggleSpectatorBar() {
    spectatorBarOpen = !spectatorBarOpen;
    if (!spectatorBarOpen && el('spectatorControls').contains(document.activeElement)) el('spectatorToggle').focus();
    updateSpectatorBar();
  }
  el('spectatorPrevious').onclick = () => switchSpectator(-1);
  el('spectatorNext').onclick = () => switchSpectator(1);
  el('spectatorToggle').onclick = toggleSpectatorBar;
  events.on('device', updateSpectatorBar);
  function resetSpectator() {
    spectatorTarget = null; spectatorBarOpen = true; spectatorWasWaiting = false; lastView = null;
    spectator.hidden = true; document.body.classList.remove('spectator-view');
    if (spectatorViewApplied) { camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); }
    spectatorViewApplied = false;
  }
  function applySpectatorView() {
    updateAlivePanel();
    const waiting = waitingForTeamWipe();
    if (waiting && !spectatorWasWaiting) {
      spectatorBarOpen = true; input.clear();
      if (document.pointerLockElement) document.exitPointerLock();
    }
    spectatorWasWaiting = waiting;
    const candidates = waiting ? spectatorCandidates() : [];
    if (!candidates.some(([id]) => id === spectatorTarget)) spectatorTarget = candidates[0]?.[0] || null;
    spectator.hidden = !waiting || Game.mode !== 'play' || !panel.classList.contains('hidden') || Game.loading > 0;
    document.body.classList.toggle('spectator-view', waiting);
    if (waiting) updateSpectatorBar();
    const r = remotes.get(spectatorTarget);
    if (!r) {
      if (spectatorViewApplied) { camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); spectatorViewApplied = false; }
      return;
    }
    const now = performance.now() / 1000 - C.interpolation;
    const { a, b, alpha } = remoteSample(r, now), av = a.view, bv = b.view || av;
    if (!av) return;
    camera.position.fromArray(av.position).lerp(viewPosition.fromArray(bv.position), alpha);
    viewRotation.fromArray(av.quaternion); nextViewRotation.fromArray(bv.quaternion);
    camera.quaternion.copy(viewRotation.slerp(nextViewRotation, alpha));
    camera.fov = lerp(av.fov, bv.fov, alpha); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    spectatorViewApplied = true;
  }
  function captureView() {
    if (active() && session.teamWipeOnly && Game.player?.alive()) lastView = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
  }
  function spectatorKey(ev) {
    if (Game.mode !== 'play' || !waitingForTeamWipe()) return false;
    if (!['ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(ev.code)) return false;
    ev.preventDefault();
    if (!ev.repeat) {
      if (ev.code === 'Tab') toggleSpectatorBar();
      else if (ev.code === 'Escape') Game.pause(false);
      else switchSpectator(ev.code === 'ArrowLeft' ? -1 : 1);
    }
    return true;
  }
  function spectatorPad(pressed) {
    if (Game.mode !== 'play' || !waitingForTeamWipe()) return false;
    if (pressed.includes('PadLB') || pressed.includes('PadLeft')) switchSpectator(-1);
    if (pressed.includes('PadRB') || pressed.includes('PadRight')) switchSpectator(1);
    if (pressed.includes('PadX')) toggleSpectatorBar();
    if (pressed.includes('PadStart')) Game.pause(false);
    return true;
  }
  function buildControls() {
    el('lobbyControlsDevice').textContent = usingPad() ? 'Controller · Xbox / PlayStation' : 'Keyboard & mouse · LMB / RMB = left / right mouse button';
    const rows = [
      ['Move', moveLabel()], ['Look around', usingPad() ? 'Right stick' : 'Mouse · click game first'],
      ['Light attack', bindLabel('light')], ['Heavy attack (hold to charge)', bindLabel('heavy')],
      ['Dodge / roll', bindLabel('roll')], ['Jump', bindLabel('jump')],
      ['Block (hold)', bindLabel('block')], ['Parry', bindLabel('parry')],
      ['Lock on / off', bindLabel('lock')], ['Heal with flask', bindLabel('flask')],
      ['Rest / talk / read', bindLabel('rest')], ['Pause menu', systemLabel('pause')],
    ];
    const list = el('lobbyControlsList'); list.textContent = '';
    for (const [action, binding] of rows) {
      const row = document.createElement('div'), name = document.createElement('dt'), keys = document.createElement('dd');
      name.textContent = action; keys.textContent = keycap(binding); row.append(name, keys); list.appendChild(row);
    }
  }
  events.on('device', buildControls);
  buildControls();
  const notice = s => { el('lobbyNotice').textContent = s; };
  let savedName = '';
  try { savedName = localStorage.getItem('combatArena.onlineName') || ''; } catch {}
  el('lobbyName').value = savedName;
  function send(data) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
  function flushActivity(now) {
    if (connected && activityPending && now - lastActivitySent >= C.activityInterval) {
      activityPending = false; lastActivitySent = now; send({ type: 'activity' });
    }
  }
  function activity() {
    if (!connected || document.visibilityState === 'hidden') return;
    activityPending = true; flushActivity(performance.now());
  }
  function userActivity(ev) {
    if (!ev.isTrusted || !connected) return;
    if (ev.type === 'pointermove' && !ev.movementX && !ev.movementY) return;
    if (ev.type === 'keydown') heldActivity.add(ev.code);
    if (ev.type === 'keyup') heldActivity.delete(ev.code);
    if (ev.type === 'pointerdown') heldActivity.add('pointer/' + ev.pointerId);
    if (ev.type === 'pointerup' || ev.type === 'pointercancel') heldActivity.delete('pointer/' + ev.pointerId);
    activity();
  }
  for (const type of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'pointercancel', 'pointermove', 'wheel'])
    window.addEventListener(type, userActivity, { capture: true, passive: true });
  window.addEventListener('blur', () => { heldActivity.clear(); activityPending = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { heldActivity.clear(); activityPending = false; } });
  function command(type, data = {}) { if (ready) send({ type, epoch: session.epoch, seq: ++seq, ...data }); }
  function control(action, data = {}) { send({ type: 'control', action, ...data }); }
  function show() {
    closeNameEditor(false, false); closeAdventurePicker(true);
    lobbyPadDirection = null; lobbyPadTimer = 0;
    panel.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
    input.clear();
    if (active()) Game.mode = 'pause';
    el('menu').classList.add('hidden');
    document.body.classList.remove('no-cursor');
    updateRoster();
    updateLobbyPadHint(); if (usingPad()) focusLobbyControl(ensureLobbyFocus());
  }
  function hide() { closeNameEditor(false, false); closeAdventurePicker(true); panel.classList.add('hidden'); if (active()) Game.resume(); }
  function active() { return connected && !!session && loaded; }
  function chapterCard(id) {
    const chapter = connected && session?.campaign && STORIES.find(s => s.id === session.campaign.id)?.chapters.find(c => c.level === id);
    return chapter ? [chapter.title, chapter.line] : null;
  }
  function clearRemotes() { for (const r of remotes.values()) { r.body.rig.dispose(); r.label.remove(); } remotes.clear(); }
  function resetStream() { clearTeamWipe(); clearRunIntro(); tracks.clear(); decoder.reset(); latestFrame = null; receivedFrames = 0; playback = null; ready = false; lastPose = 0; pendingExecution = null; deferredStart = null; resetSpectator(); }
  function retryConnection(message) {
    if (!reconnectWanted) return;
    leave(message, true);
    notice('Reconnecting automatically… You can leave the lobby to cancel.');
    const delay = Math.min(C.reconnectMaxDelay, C.reconnectDelay * 2 ** Math.min(reconnectAttempt++, C.reconnectBackoffSteps));
    reconnectTimer = setTimeout(() => { reconnectTimer = null; join(true); }, delay);
  }
  function leave(message = '', retry = false) {
    closeNameEditor(false, false); closeAdventurePicker(true);
    joinAttempt++;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    if (!retry) { reconnectWanted = false; reconnectAttempt = 0; }
    intentionalClose = true;
    if (retry) socket?.close(); else socket?.close(1000, 'Left lobby');
    socket = null;
    connected = false; self = leader = null; session = null; loaded = false; starting = false; resetStream(); clearRemotes();
    finale.cancelEnding();
    heldActivity.clear(); activityPending = false; lastActivitySent = -Infinity;
    party.classList.add('hidden'); panel.classList.add('hidden');
    if (Game.player) Game.clearActors();
    Game.loading = 0; el('loading').classList.remove('show'); Game.showMenu('main');
    if (message) { show(); el('lobbyStatus').textContent = message; el('lobbyLeave').textContent = retry ? 'Leave lobby' : 'Back to main menu'; }
  }
  async function join(retry = false) {
    if (connected) { show(); return; }
    if (starting) return;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    reconnectWanted = true;
    const attempt = ++joinAttempt;
    starting = true; intentionalClose = false; show(); notice('');
    el('lobbyStatus').textContent = 'Connecting to the public lobby…';
    el('lobbyLeave').textContent = 'Leave lobby';
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('Open the game’s home server link to join the public lobby.');
      const response = await fetch('/api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(C.connectTimeout) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The public lobby is available on the home server link. This address only hosts solo play.');
      const info = await response.json();
      if (!starting || attempt !== joinAttempt) return;
      if (info.players >= info.capacity) throw new Error(`The public lobby is full (${info.capacity} players). ${retry ? 'Waiting for a place to open.' : 'Try again when a place opens.'}`);
      const pageBuild = document.querySelector('meta[name="arena-build"]')?.content;
      if (info.version !== VERSION || pageBuild !== info.build) { reconnectWanted = false; throw new Error('The game has updated. Reload this page before joining.'); }
      if (!starting || attempt !== joinAttempt) return;
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${C.path}`);
      const joining = socket;
      const deadline = setTimeout(() => { if (joining === socket && !connected) { retryConnection('The lobby did not respond. Reconnecting…'); } }, C.connectTimeout);
      socket.onopen = () => { if (socket === joining) send({ type: 'hello', protocol: C.protocol, build: info.build, name: el('lobbyName').value }); };
      socket.onmessage = event => { if (socket !== joining) return; try { receive(JSON.parse(event.data)); } catch (e) { console.error('Lobby update failed', e); retryConnection('Recovering the current game…'); } };
      socket.onclose = e => { clearTimeout(deadline); if (socket !== joining) return; if (!intentionalClose) {
        if (e.code === 1008) leave(e.reason || 'The lobby refused the connection.');
        else retryConnection(e.reason || 'Connection lost. Rejoining the current game…');
      } };
      socket.onerror = () => { if (!connected) notice('Could not connect. The lobby may be full or the server may be unavailable.'); };
    } catch (e) {
      if (attempt !== joinAttempt) return;
      starting = false;
      if (retry && reconnectWanted) retryConnection(e.message);
      else { reconnectWanted = false; el('lobbyStatus').textContent = e.message; }
    }
  }
  function updateRoster() {
    const focusKey = document.activeElement?.dataset.padKey;
    const owner = connected && self === leader;
    if (!owner && adventureBeforeEdit !== null) closeAdventurePicker(true);
    if (connected) el('lobbyStatus').textContent = leader ? 'Connected. Anyone with this link can join.' : 'No active leader. Press a key, move the mouse or use your controller to lead.';
    el('lobbyLeader').hidden = !owner;
    el('lobbyResume').hidden = !active();
    el('lobbyRestart').disabled = !session;
    el('lobbyNext').disabled = !session || !!session.gauntlet || !!(session.campaign && (!latestFrame?.complete || !session.campaign.next));
    el('lobbyNext').textContent = session?.campaign ? 'Next chapter' : 'Next level';
    el('lobbyRestart').textContent = session?.gauntlet ? 'Restart boss run' : session?.campaign ? 'Restart chapter' : 'Restart level';
    el('lobbyReturn').disabled = !session;
    el('lobbyStart').disabled = !connected;
    el('lobbyPlayers').textContent = '';
    for (const p of roster) {
      const row = document.createElement('div'); row.className = 'lobby-player';
      const name = document.createElement('span'); name.textContent = `${p.name}${p.id === self ? ' (you)' : ''}${p.id === leader ? ' · Leader' : ''}`; row.appendChild(name);
      if (owner && p.id !== self) for (const [text, action] of [['Make leader', 'transfer'], ['Remove', 'kick']]) {
        const button = document.createElement('button'); button.textContent = text;
        button.dataset.padKey = action + '/' + p.id;
        button.onclick = () => control(action, { player: p.id }); row.appendChild(button);
      }
      el('lobbyPlayers').appendChild(row);
    }
    updateStatus();
    if (!panel.classList.contains('hidden') && usingPad()) {
      const restored = focusKey && lobbyControls().find(node => node.dataset.padKey === focusKey);
      focusLobbyControl(restored || ensureLobbyFocus());
    }
  }
  function updateStatus() {
    const road = session?.campaign;
    const story = session?.kind === 'level' && STORIES.find(s => s.chapters.some(c => c.level === session.id));
    const number = road?.number || (story ? story.chapters.findIndex(c => c.level === session.id) + 1 : null);
    const levelTag = session?.gauntlet ? `BOSS ONLY · ${session.gauntlet.number}/${session.gauntlet.total}` : number ? `Level ${number}${road ? '/' + road.total : ''}` : '';
    for (const id of ['onlineCurrentLevel', 'lobbyCurrentLevel']) {
      const tag = el(id);
      tag.hidden = !connected || !levelTag;
      tag.textContent = levelTag;
    }
    const chapter = road ? `\n${road.name} · Chapter ${road.number}/${road.total}${latestFrame?.complete && !road.next ? ' · Complete' : ''}` : '';
    el('onlinePartyDetails').textContent = `PUBLIC LOBBY · ${roster.length} players${chapter}\nEscape to pause`;
    updateAlivePanel();
    party.style.whiteSpace = 'pre-line'; party.classList.toggle('hidden', !active());
  }
  function receive(msg) {
    if (msg.type === 'welcome') {
      connected = true; starting = false; reconnectAttempt = 0; self = msg.id; leader = msg.leader; roster = msg.players; catalog = msg.catalog;
      activityPending = false; lastActivitySent = -Infinity; heldActivity.clear();
      const select = el('lobbyAdventure'); select.textContent = '';
      const stories = catalog.campaigns.filter(entry => STORIES.some(s => s.id === entry.id && s.lobbyName));
      for (const [label, kind, entries] of [['Stories', 'campaign', stories], ['Challenge', 'gauntlet', [{ id: 'boss-only', name: 'BOSS ONLY' }]]]) {
        const group = document.createElement('optgroup'); group.label = label;
        for (const entry of entries) { const option = document.createElement('option'); option.value = `${kind}/${entry.id}`; option.textContent = kind === 'campaign' ? STORIES.find(s => s.id === entry.id)?.lobbyName || entry.name : entry.name; group.appendChild(option); }
        select.appendChild(group);
      }
      select.value = `${catalog.defaultAdventure.kind}/${catalog.defaultAdventure.id}`;
      el('lobbyStatus').textContent = 'Connected. Anyone with this link can join.'; updateRoster();
    } else if (msg.type === 'roster') {
      roster = msg.players; leader = msg.leader; updateRoster();
      if (msg.notice) notice(msg.notice);
    } else if (msg.type === 'start') {
      finale.cancelEnding();
      session = msg.session; loaded = false; seq = 0; resetStream(); clearRemotes();
      if (msg.opening) runIntroPending = session.gauntlet?.id || session.campaign?.id || null;
      const current = session;
      Game.story = false; Game.eldenBoss = null; panel.classList.add('hidden');
      const data = (session.kind === 'level' ? catalog.levels : catalog.bosses).find(x => x.id === session.id);
      el('lobbyAdventure').value = session.gauntlet ? 'gauntlet/boss-only' : session.campaign ? `campaign/${session.campaign.id}` : `${session.kind}/${session.id}`;
      const begin = () => {
        if (session !== current || !connected) return;
        if (Game.pendingLoad) { deferredStart = begin; return; }
        Game.loadingFirst(...(chapterCard(session.id) || [data?.name || 'Public lobby', 'Playing together']), () => {
          if (session !== current || !connected) return;
          if (session.kind === 'level') Game.startLevel(session.id); else Game.startFight(session.id);
          Game.spawn = { ...session.spawn }; Game.spawnPlayer();
          if (session.gauntlet) $('wonHint').textContent = session.gauntlet.next ? 'Next boss incoming… Everyone returns with full health and flasks.' : 'All bosses defeated! Returning to the lobby…';
          for (const e of Game.enemies) e.netId = e.key || 'duel/' + e.baseDef.id;
          loaded = true; updateRoster();
        });
      };
      begin();
    } else if (msg.type === 'stop') {
      const endedRun = session?.gauntlet;
      finale.cancelEnding();
      session = null; loaded = false; resetStream(); clearRemotes(); Game.loading = 0; el('loading').classList.remove('show');
      if (Game.player) Game.clearActors(); Game.showMenu('main'); show(); notice(msg.message || 'The leader returned everyone to the lobby.');
      if (msg.reason === 'team-wipe') showTeamWipe(endedRun);
    } else if (msg.type === 'frame' && active() && ready && msg.frame.epoch === session.epoch) {
      const packet = decoder.decode(msg), frame = packet.frame;
      if (latestFrame && frame.time <= latestFrame.time) return;
      latestFrame = frame; receivedFrames++; updateRemotes(packet.players || []);
      for (const s of frame.enemies) {
        let track = tracks.get(s.id);
        if (!track) {
          track = new ArenaNet.EnemyTrack(); tracks.set(s.id, track);
          if (s.attack && [ES.WINDUP, ES.ACTIVE].includes(s.state)) {
            const e = Game.enemies.find(e => e.netId === s.id); if (e) e.netJoinSerial = s.serial;
          }
        }
        track.push({ time: frame.time, value: s, events: frame.events.filter(d => d.enemy === s.id), shots: frame.shots.filter(d => d.enemy === s.id) });
        if (track.samples.length > C.maxHistory || frame.time - track.time > C.historySeconds) { retryConnection('Catching up with the current game…'); return; }
      }
      applyProgress(frame, msg.full);
    } else if (msg.type === 'checkpoint' && active()) { session.spawn = msg.spawn; Game.spawn = { ...msg.spawn }; }
    else if (msg.type === 'execution' && active()) {
      const e = Game.enemies.find(e => e.netId === msg.enemy);
      if (msg.accepted && pendingExecution === msg.enemy && e && Game.player.alive()) {
        grantedEnemy = msg.enemy; execution.start(Game.player, e); grantedEnemy = null;
      } else if (!msg.accepted) notice('Another player took that execution, or the opening has ended.');
      pendingExecution = null;
    } else if (msg.type === 'pong') { ping = Math.max(0, Math.round(performance.now() - msg.sent)); updateStatus(); }
    else if (msg.type === 'error') notice(msg.message);
  }
  function capturePose(p) {
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, state: p.state, stateTime: p.stateTime,
      attack: p.attack?.id || null, attackT: p.attackT, charge: p.charge, chargeT: p.chargeT,
      walkPhase: p.walkPhase, grounded: p.grounded, execEnemy: p.exec?.enemy.netId || null,
      vx: p.vx, vy: p.vy, vz: p.vz, activeAt: Number.isFinite(p.activeAt) ? p.activeAt : -1,
      landTime: p.landTime, stunTime: p.stunTime, view: session.teamWipeOnly && p.alive() ? lastView : null };
  }
  function heartbeat(now) {
    if (!connected) return;
    // A stray return to the title must not strand a connected player while the
    // server continues the shared run. Reload from its current session/baseline.
    if (session && loaded && Game.mode === 'menu' && Game.screen === 'main') {
      receive({ type: 'start', session }); return;
    }
    if (heldActivity.size && document.visibilityState !== 'hidden') activityPending = true;
    flushActivity(now);
    if (deferredStart && !Game.pendingLoad) { const start = deferredStart; deferredStart = null; start(); }
    if (active() && !ready && Game.loading <= 0) {
      if (runIntroPending) showRunIntro(runIntroPending);
      else {
        if (!runIntro.hidden) clearRunIntro();
        ready = true; send({ type: 'ready', epoch: session.epoch });
      }
    }
    if (active() && ready && now >= lastPose) {
      const interval = 1000 / C.playerRate;
      lastPose = lastPose && lastPose + interval > now ? lastPose + interval : now + interval;
      send({ type: 'pose', epoch: session.epoch, pose: capturePose(Game.player) });
    }
    if (now - lastPing >= C.pingInterval) { lastPing = now; send({ type: 'ping', sent: now }); }
    if (now - lastStats >= C.metricsInterval) { lastStats = now; updateStatus(); }
  }
  function updateRemotes(list) {
    const ids = new Set();
    for (const s of list) {
      if (s.id === self) continue;
      ids.add(s.id);
      let r = remotes.get(s.id);
      if (!r) {
        const body = new Player(PLAYER_DEF, s.x, s.z, s.yaw, s.y), label = document.createElement('div');
        label.className = 'online-name'; label.dataset.playerId = s.id; document.body.appendChild(label);
        const name = document.createElement('span'); name.className = 'online-name-text'; label.appendChild(name);
        const health = makeAllyHealth(label, s.id);
        r = { body, label, name, health, samples: [] }; remotes.set(s.id, r);
      }
      if (r.poseSeq !== s.poseSeq) { r.samples.push({ ...s, view: ArenaNet.cameraView(s.view), at: performance.now() / 1000 }); r.poseSeq = s.poseSeq; }
      while (r.samples.length > C.maxHistory) r.samples.shift();
      r.name.textContent = s.name + (s.hp <= 0 ? session.teamWipeOnly ? ' · defeated' : ' · returning to checkpoint' : '');
      updateAllyHealth(r.health, s.hp, s.name);
    }
    for (const [id, r] of remotes) if (!ids.has(id)) { r.body.rig.dispose(); r.label.remove(); remotes.delete(id); }
  }
  function sampleEnemies(dt) {
    if (!latestFrame) return;
    let oldest = latestFrame.time;
    for (const [id, track] of tracks) {
      const view = track.advance(dt), e = Game.enemies.find(e => e.netId === id);
      if (!view || !e) continue;
      const { a, b, time, alpha } = view, s = a.value, q = b.value;
      oldest = Math.min(oldest, time);
      track.pendingEvents = (track.pendingEvents || []).concat(view.crossed);
      // Advance the stream while holding the victim locally; its death/phase
      // still cannot appear before this player's execution animation finishes.
      if (Game.player.exec?.enemy === e) { e.stateTime += dt; continue; }
      const priorState = e.state;
      if (e.phase !== s.phase && s.phase >= 0) e.enterPhase(s.phase);
      e.x = lerp(s.x, q.x, alpha); e.y = lerp(s.y, q.y, alpha); e.z = lerp(s.z, q.z, alpha);
      e.yaw = s.yaw + angDiff(q.yaw, s.yaw) * alpha;
      e.state = s.state;
      e.stateTime = s.state === q.state && s.serial === q.serial && s.hitIndex === q.hitIndex
        ? lerp(s.stateTime, q.stateTime, alpha) : s.stateTime + Math.max(0, time - a.time);
      e.holdLeft = s.holdLeft; e.retreatHop = s.retreatHop; e.blinkLeft = s.blinkLeft;
      e.vx = s.vx; e.vy = s.vy; e.vz = s.vz;
      e.hp = s.hp; e.posture = s.posture; e.guardMeter = s.guardMeter; e.poise = s.poise;
      e.attack = s.attack ? e.baseDef.attacks.find(x => x.id === s.attack) : null;
      e.hitIndex = s.hitIndex; e.netSerial = s.serial; e.netTarget = s.target; e.grounded = s.grounded;
      e.walkPhase = s.walkPhase; e.leaping = s.leaping; e.asleep = false;
      e.tint = Math.max(0, e.tint - dt / CONFIG.fx.tintTime);
      if (e.netParried === s.serial && [ES.WINDUP, ES.ACTIVE].includes(s.state)) { e.state = ES.PARRIED; e.stateTime = 0; }
      const boxKey = `${s.serial}/${s.hitIndex}`;
      if (s.hitbox && e.state === ES.ACTIVE && e.attack && e.netParried !== s.serial && e.netJoinSerial !== s.serial) {
        if (e.netBoxKey !== boxKey || !e.hitbox) {
          const hit = e.attack.hits[s.hitIndex];
          e.hitbox = new Hitbox(e, hit.box || e.attack.box, hit.damage ? { ...makeStrike(e.attack), damage: hit.damage } : makeStrike(e.attack)); e.netBoxKey = boxKey;
        }
      } else e.hitbox = null;
      if (e.state === ES.DEAD && priorState !== ES.DEAD && !e.rewarded) { e.rewarded = true; events.emit('enemyDeath', { enemy: e }); }
      for (const sample of track.pendingEvents) presentEvents(sample);
      track.pendingEvents = [];
    }
    playback = oldest;
  }
  // Progress is authoritative and immediate; it never waits behind an enemy's
  // personal presentation clock. Animate gates on every simulation step.
  function applyProgress(frame, initial) {
    for (const s of frame.gates) {
      const g = world.gates.find(g => g.id === s.id); if (!g) continue;
      const opened = g.netOpen === false && s.open; g.netOpen = s.open;
      const entry = (Game.level.sealed || []).find(x => x.id === s.id && x.fog);
      const zone = entry && Game.zones.find(z => z.id === entry.fog);
      g.open = s.open || !!(zone && !inArea(zone.trigger, Game.player.x, Game.player.z));
      if (initial) g.lift = g.open ? 1 : 0;
      if (opened && !entry) events.emit('gateOpened', { gate: g });
    }
    for (const s of frame.traps) {
      const t = world.traps.find(t => t.id === s.id); if (!t) continue;
      if (s.state === 'sprung' && t.state !== 'sprung') { world.openHole(t.region, t.collapse); events.emit('trapSprung', { trap: t }); }
      else if (s.state === 'warning' && t.state === 'set') events.emit('trapWarning', { trap: t });
      Object.assign(t, s);
    }
    if (frame.complete && !Game.complete) {
      Game.complete = true;
      if (Game.kind === 'level') events.emit('levelComplete');
      updateRoster();
      if (session.campaign) notice(session.campaign.next ? 'Chapter complete. Everyone continues to the next chapter automatically.' : session.campaign.done);
    }
  }
  function animateGates(dt) {
    for (const g of world.gates) {
      const entry = (Game.level.sealed || []).find(x => x.id === g.id && x.fog);
      const zone = entry && Game.zones.find(z => z.id === entry.fog);
      if (g.netOpen !== undefined) g.open = g.netOpen || !!(zone && !inArea(zone.trigger, Game.player.x, Game.player.z));
      g.lift = g.open ? Math.min(1, g.lift + dt / CONFIG.level.gateLiftTime)
        : Math.max(0, g.lift - dt / CONFIG.finale.fogClose);
    }
  }
  function presentEvents(sample) {
    for (const d of sample.events) {
      const e = Game.enemies.find(e => e.netId === d.enemy);
      if (d.type === 'strike' && d.player !== self && e) {
        const attacker = remotes.get(d.player)?.body;
        if (attacker) events.emit('strike', { ...d, attacker, target: e });
      } else if (d.type === 'parry' && d.player !== self && e) events.emit('parry', { target: e });
      if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'enemyBlink', 'postureBreak'].includes(d.type) && e) {
        const attack = sample.value.attack ? e.baseDef.attacks.find(a => a.id === sample.value.attack) : e.attack;
        events.emit(d.type, { enemy: e, actor: e, attack, phase: PHASE.ACTIVE, hitIndex: d.hitIndex, seamless: d.seamless, out: d.out });
      } else if (d.type === 'impact') events.emit('impact', { ...d, enemy: e });
    }
    for (const shot of sample.shots) {
      const e = Game.enemies.find(e => e.netId === shot.enemy), attack = e?.baseDef.attacks.find(a => a.id === shot.attack);
      if (e && attack) projectiles.fire(e, attack, shot.target);
    }
  }

  function update(dt) {
    const p = Game.player, c = Game.cam;
    p.savePrev(); for (const e of Game.enemies) e.savePrev(); c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    sampleEnemies(dt);
    animateGates(dt);
    // Credits may outlast the replay buffer. Consume the shared stream at the
    // normal fixed step while leaving personal movement/combat at the ending.
    if (Game.mode === 'ending') return;
    if (!p.alive()) {
      Game.deathTimer += dt;
      if (!session.teamWipeOnly && Game.deathTimer >= CONFIG.death.respawnDelay) { Game.spawnPlayer(); Game.setLock(null); Game.retarget = true; events.emit('respawn', { player: Game.player }); }
      else p.update(dt, { x: 0, z: 0, has: false }, [], null);
    } else if (Game.hitstop > 0) { Game.hitstop = Math.max(0, Game.hitstop - dt); input.hold(dt); }
    else {
      if (Game.mode === 'play') Game.updateLock(dt);
      if (input.peek('rest') && Game.restWins()) { input.consume('rest'); Game.tryRest(); }
      p.update(dt, Game.mode === 'play' ? Game.moveInput() : { x: 0, z: 0, has: false }, Game.enemies.filter(e => e.alive()), Game.lock);
      // The server owns enemy positions. Other players have no body blocking.
      for (const e of Game.enemies) if (e.state !== ES.EXECUTED) separatePair(p, e, 1);
      resolveCombat(Game); execution.mark(p, Game.enemies);
      if (!p.alive()) Game.onPlayerDeath();
    }
    projectiles.update(Game, dt);
    if (Game.kind === 'level') { lore.update(Game, dt); updateHazards(dt); finale.updateOnline(Game, dt); }
    Game.updateCamera(dt, false);
    if (!Game.player.alive() && Game.deathTimer === 0) Game.onPlayerDeath();
  }
  function updateHazards(dt) {
    const p = Game.player;
    if (!p.alive() || p.invulnerable()) return;
    for (const h of world.hazards || []) if (p.grounded && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) <= CONFIG.height.stepUp) {
      p.hp = Math.max(0, p.hp - h.dps * dt);
      if (p.hp <= 0) { p.setState(PS.DEAD); Game.onPlayerDeath(); }
    }
  }
  function remoteSample(r, now) {
    while (r.samples.length > 1 && r.samples[1].at <= now) r.samples.shift();
    const a = r.samples[0], b = r.samples[1] || a;
    return { a, b, alpha: a === b ? 0 : clamp((now - a.at) / (b.at - a.at), 0, 1) };
  }
  function render(game, placed) {
    if (!active()) return;
    const now = performance.now() / 1000 - C.interpolation;
    for (const r of remotes.values()) {
      const { a, b, alpha: f } = remoteSample(r, now); if (!a) continue;
      const p = r.body;
      p.x = lerp(a.x, b.x, f); p.y = lerp(a.y, b.y, f); p.z = lerp(a.z, b.z, f); p.yaw = a.yaw + angDiff(b.yaw, a.yaw) * f;
      p.state = a.state; p.stateTime = a.stateTime + Math.max(0, now - a.at); p.hp = a.hp; p.attackT = a.attackT + (a.charge === 1 ? 0 : Math.max(0, now - a.at));
      p.attack = PLAYER_DEF.moveset.attacks[a.attack] || null; p.charge = a.charge; p.chargeT = a.chargeT + (a.charge === 1 ? Math.max(0, now - a.at) : 0); p.walkPhase = a.walkPhase;
      p.vx = a.vx; p.vy = a.vy; p.vz = a.vz;
      p.usingItem = ITEMS.flask; p.landTime = a.landTime; p.stunTime = a.stunTime;
      p.activeAt = a.activeAt < 0 ? Infinity : a.activeAt;
      p.exec = a.execEnemy ? { enemy: Game.enemies.find(e => e.netId === a.execEnemy), aim: 0 } : null;
      if ([PS.ATTACK, PS.JUMP_ATTACK, PS.LAND, PS.EXECUTE].includes(p.state) && !p.attack) p.state = PS.IDLE;
      const focus = remotes.get(spectatorTarget)?.body || game.player;
      const visible = Math.hypot(p.x - focus.x, p.z - focus.z) < C.remoteRange;
      p.rig.root.visible = p.rig.shadow.visible = visible;
      if (!visible) { r.label.hidden = true; continue; }
      p.rig.place(p.x, p.y, p.z, p.yaw, world.groundAt(p.x, p.z, p.y + 0.05));
      p.pose(p.stateTime, { t: performance.now() / 1000, dt: CONFIG.step, yaw: p.yaw, px: game.player.x, pz: game.player.z });
      placed.push([p, { x: p.x, y: p.y, z: p.z, yaw: p.yaw }]);
      const v = new THREE.Vector3(p.x, p.y + p.height, p.z).project(camera);
      r.label.hidden = v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      r.label.style.left = `${(v.x + 1) * innerWidth / 2}px`; r.label.style.top = `${(1 - v.y) * innerHeight / 2}px`;
    }
  }
  function hit(e, strike) {
    const hb = Game.player.hitbox;
    if (!hitIds.has(hb)) hitIds.set(hb, String(++swing));
    command('hit', { enemy: e.netId, attack: strike.attackId, swing: hitIds.get(hb), charge: strike.charge || 0, riposte: strike.riposte });
    e.tint = 1; e.recoil = 1;
    return { blocked: e.guarding() && isInFront(e, Game.player.x, Game.player.z), broke: false, died: false };
  }
  function parry(e) { command('parry', { enemy: e.netId, serial: e.netSerial }); e.netParried = e.netSerial; return e.getParried(); }
  function lifesteal(e) { command('lifesteal', { enemy: e.netId, serial: e.netSerial, hitIndex: e.hitIndex }); }
  function requestExecution(e) { if (!pendingExecution) { pendingExecution = e.netId; command('execute', { enemy: e.netId }); } }
  function rest(b) {
    const p = Game.player; p.hp = p.maxHp; p.stamina = p.maxStamina; p.refillItems(); p.vx = p.vz = 0; p.setState(PS.REST);
    command('rest', { bonfire: b.id }); hud.showRested(); events.emit('rest', { bonfire: b });
  }
  el('lobbyLeave').onclick = () => leave(); el('lobbyResume').onclick = hide;
  el('lobbyStart').onclick = () => { const value = el('lobbyAdventure').value, slash = value.indexOf('/'); control('start', { kind: value.slice(0, slash), id: value.slice(slash + 1) }); };
  el('lobbyRestart').onclick = () => control('restart'); el('lobbyReturn').onclick = () => control('lobby'); el('lobbyNext').onclick = () => control('next');
  el('lobbyName').onchange = () => { const name = ArenaNet.name(el('lobbyName').value); el('lobbyName').value = name; try { localStorage.setItem('combatArena.onlineName', name); } catch {} send({ type: 'name', name }); };
  function lobbyMove(direction) {
    const focus = ensureLobbyFocus(), controls = lobbyControls();
    if (!focus) return;
    if (!el('lobbyNameEditor').hidden) {
      const row = Number(focus.dataset.nameRow), column = Number(focus.dataset.nameColumn);
      const horizontal = direction === 'left' || direction === 'right', forward = direction === 'right' || direction === 'down';
      const targetRow = horizontal ? row : (row + (forward ? 1 : -1) + 5) % 5;
      const candidates = controls.filter(node => Number(node.dataset.nameRow) === targetRow);
      if (horizontal) {
        const at = candidates.indexOf(focus); focusLobbyControl(candidates[(at + (forward ? 1 : -1) + candidates.length) % candidates.length]);
      } else focusLobbyControl(candidates.sort((a, b) => Math.abs(Number(a.dataset.nameColumn) - column) - Math.abs(Number(b.dataset.nameColumn) - column))[0]);
      return;
    }
    if (focus === el('lobbyAdventure') && (adventureBeforeEdit !== null || direction === 'left' || direction === 'right')) {
      const step = direction === 'up' || direction === 'left' ? -1 : 1;
      focus.selectedIndex = clamp(focus.selectedIndex + step, 0, focus.options.length - 1);
      focus.dispatchEvent(new Event('change', { bubbles: true })); return;
    }
    const current = controls.indexOf(focus), step = direction === 'up' || direction === 'left' ? -1 : 1;
    focusLobbyControl(controls[(current + step + controls.length) % controls.length]);
  }
  function pad(pressed, dt = CONFIG.step) {
    if (!wipeScreen.hidden) return;
    const focus = ensureLobbyFocus();
    if (pressed.includes('PadB')) { lobbyBack(); return; }
    if (pressed.includes('PadStart') && active()) { hide(); return; }
    if (pressed.includes('PadX') && !el('lobbyNameEditor').hidden) nameKey('delete');
    const C = CONFIG.gamepad, S = C.menuStick;
    const direction = gamepad.down.has('PadUp') || gamepad.move.y > S ? 'up'
      : gamepad.down.has('PadDown') || gamepad.move.y < -S ? 'down'
      : gamepad.down.has('PadLeft') || gamepad.move.x < -S ? 'left'
      : gamepad.down.has('PadRight') || gamepad.move.x > S ? 'right' : null;
    if (direction !== lobbyPadDirection) {
      lobbyPadDirection = direction; lobbyPadTimer = C.menuDelay; if (direction) lobbyMove(direction);
    } else if (direction && (lobbyPadTimer -= dt) <= 0) { lobbyPadTimer = C.menuRepeat; lobbyMove(direction); }
    if (pressed.includes('PadA')) {
      const current = document.activeElement || focus;
      if (current === el('lobbyAdventure')) {
        if (adventureBeforeEdit === null) { adventureBeforeEdit = current.value; current.size = 8; current.scrollIntoView({ block: 'nearest' }); }
        else closeAdventurePicker();
        updateLobbyPadHint();
      } else if (current === el('lobbyName')) openNameEditor();
      else if (current?.tagName === 'BUTTON') current.click();
    }
  }
  events.on('executionEnd', d => { if (active() && d.player === Game.player) command('executionEnd', { enemy: d.enemy.netId }); });
  Game.renderHooks.push(render);
  return { join, leave, show, hide, active, chapterCard, heartbeat, activity, update, hit, parry, lifesteal, rest, requestExecution, pad,
    applySpectatorView, captureView, spectatorKey, spectatorPad, lobbyBack,
    get campaign() { return connected ? session?.campaign || null : null; },
    get waitingForTeamWipe() { return waitingForTeamWipe(); },
    get spectatorMode() { return waitingForTeamWipe(); },
    get runIntroActive() { return !runIntro.hidden; },
    get spectating() { return waitingForTeamWipe() && !!spectatorTarget; },
    get connected() { return connected; }, get grantedEnemy() { return grantedEnemy; }, get panelOpen() { return !panel.classList.contains('hidden'); },
    get info() { return { self, leader, connected, ready, session, players: roster, ping, playback, spectatorTarget,
      frames: Math.max(0, ...[...tracks.values()].map(t => t.samples.length)), receivedFrames, remotes: remotes.size,
      playbackDelayMs: latestFrame && playback !== null ? Math.max(0, (latestFrame.time - playback) * 1000) : 0, server: latestFrame?.server }; },
  };
})();
