'use strict';
// Opt-in co-op: Boss Rush and the weekly run, the only online modes (PLAN.md track B item 1). Solo play never opens a
// socket or changes simulation authority.
CONFIG.multiplayer = ArenaNet.config;
const multiplayer = (() => {
  const C = CONFIG.multiplayer;
  let socket = null, self = null, leader = null, catalog = null, session = null, connected = false, capacity = C.defaultCapacity;
  let loaded = false, ready = false, starting = false, seq = 0, swing = 0, playback = null, ping = null;
  let embers = [], rescuer = null;   // the latest frame's revive embers (js/revive.js draws them), and who is reviving this player
  let looks = new Map(), looksOf = null;   // each player's blade look, rebuilt when a new roster arrives
  let remotes = new Map(), roster = [], lastPose = 0, lastPing = 0;
  let intentionalClose = false, grantedEnemy = null, deferredStart = null, latestFrame = null, receivedFrames = 0, lastStats = 0;
  let reconnectWanted = false, reconnectTimer = null, reconnectAttempt = 0, joinAttempt = 0;
  let solo = false;   // Boss Rush alone (js/alone.js, the global `alone`): the lobby runs in this page, its socket is the page's
  const ALONE_FAILED = 'Boss Rush stopped after an error.';
  const rushView = { fight: 0, clock: 0, par: 0, crowned: false, modifiers: [] };   // what `multiplayer.rush` hands the HUD
  const noModifiers = Object.freeze([]);
  let spectatorTarget = null, spectatorBarOpen = true, spectatorWasWaiting = false, spectatorViewApplied = false, lastView = null;
  let lobbyPadDirection = null, lobbyPadTimer = 0;
  let rosterSignature = '', needsReload = false, controlPending = null, controlDeadline = null;
  const viewPosition = new THREE.Vector3(), viewRotation = new THREE.Quaternion(), nextViewRotation = new THREE.Quaternion();
  const labelPosition = new THREE.Vector3();
  const decoder = new ArenaNet.FrameDecoder(), tracks = new Map();
  const heldActivity = new Set();
  let activityPending = false, lastActivitySent = -Infinity;
  const hitIds = new WeakMap();
  const panel = document.createElement('section');
  panel.id = 'publicLobby'; panel.className = 'hidden'; panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'lobbyTitle');
  // The lobby (v7.63.0, the first screen on js/ui-theme.js): full screen, edge-anchored. Left: the mode list and its
  // settings, with the one strong action, Start, under them (focus lands there). Right: the party. Bottom: quiet actions
  // and the navigation keys for the device used last. The mode list mirrors the hidden select (#lobbyAdventure), which
  // stays the mode's single source of truth.
  panel.innerHTML = `<div class="lobby-card">
    <header class="lobby-header"><h1 id="lobbyTitle" class="ui-title">Lobby</h1>
    <span id="lobbyConnection" class="lobby-connection">Connecting</span></header>
    <p id="lobbyStatus" role="status" aria-live="polite">Connecting…</p>
    <p id="lobbyNotice" role="alert" hidden></p>
    <div class="lobby-layout"><section class="lobby-adventure" aria-labelledby="lobbyAdventureTitle">
    <div id="lobbyCurrentLevel" class="online-level" hidden></div>
    <p id="lobbyLiveWarning" class="lobby-hint" hidden>The world keeps running while you are here.</p>
    <div id="lobbyLeader"><h2 id="lobbyAdventureTitle" class="ui-label">Mode</h2>
    <select id="lobbyAdventure" class="ui-mirror" tabindex="-1" aria-hidden="true"></select>
    <div id="lobbyModes" role="group" aria-labelledby="lobbyAdventureTitle"></div>
    <p id="lobbyAdventureSummary" class="lobby-summary"></p>
    <div class="lobby-primary"><button id="lobbyResume" class="ui-primary"><span class="ui-key" aria-hidden="true"></span>Return to game</button><button id="lobbyStart" class="ui-primary">Start together</button></div>
    <div id="lobbyRunActions" class="lobby-actions" role="group" aria-label="Party controls" hidden><button id="lobbyRestart" class="ui-button">Restart run</button>
    <button id="lobbyReturn" class="ui-button">Return everyone to lobby</button></div></div>
    <div id="lobbyWaiting"><p class="lobby-waiting-text"></p><button id="lobbyGuestResume" class="ui-primary"><span class="ui-key" aria-hidden="true"></span>Return to game</button></div>
    <button id="lobbyRetry" class="ui-primary" hidden>Try again</button><button id="lobbyPrivate" class="ui-button" hidden>Play in private</button>
    </section><section class="lobby-party" aria-labelledby="lobbyPartyTitle">
    <div class="lobby-section-title"><h2 id="lobbyPartyTitle">Party</h2><span id="lobbyCount"></span></div>
    <div id="lobbyPlayers" aria-label="Players"></div>
    <div class="lobby-party-actions"><button id="lobbyManage" class="ui-text-button" aria-expanded="false" aria-controls="lobbyPlayers" hidden>Manage party</button></div>
    <section id="lobbyBoard" aria-labelledby="lobbyBoardTitle" hidden><div class="lobby-section-title"><h2 id="lobbyBoardTitle">This week</h2><span id="lobbyBoardReset"></span></div>
    <h3 class="ui-label">Furthest</h3><ol id="lobbyBoardRuns" aria-label="Furthest runs this week"></ol>
    <h3 class="ui-label">Fastest kills</h3><ol id="lobbyBoardKills" aria-label="Fastest kills this week"></ol></section>
    </section></div>
    <footer class="lobby-footer"><div class="lobby-footer-actions"><button id="lobbyLeave" class="ui-text-button"><span class="ui-key" aria-hidden="true"></span><span>Leave lobby</span></button>
    <button id="lobbyHelp" class="ui-text-button" aria-expanded="false" aria-controls="lobbyControls">Controls</button>
    <button id="lobbyOptions" class="ui-text-button">Options</button><button id="lobbyCollection" class="ui-text-button">Collection</button><button id="lobbyTutorial" class="ui-text-button">Tutorial</button></div><p id="lobbyPadHint" class="ui-hints"></p></footer>
    <section id="lobbyControls" class="lobby-controls" aria-labelledby="lobbyControlsTitle" hidden><div class="lobby-controls-head"><h2 id="lobbyControlsTitle">Controls</h2>
    <button id="lobbyControlsClose" class="ui-text-button"><span class="ui-key" aria-hidden="true"></span>Close</button></div>
    <dl id="lobbyControlsList"></dl>
    <p class="lobby-controls-tip">Attacks cost nothing; you have three dashes. Blocking takes a little damage. Tap block on the beat to deflect.</p></section>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `#publicLobby,#onlineParty,#onlineSpectator,.online-name{--mp-gold:#dcbb74;--mp-gold-hi:#f3dca3;--mp-ink:#ece4d1;--mp-muted:#a9a798;--mp-faint:#7f7d72;--mp-line:#c9a96a2e;--mp-line-hi:#c9a96a66;--mp-panel:#14181af2;--mp-well:#0a0d0fb3;--mp-good:#a9cf8e;--mp-bad:#d89383}
    #publicLobby{position:fixed;inset:0;z-index:90;background:var(--ui-veil);color:var(--ui-ink);font:var(--ui-size-text)/1.5 var(--ui-text);overflow:auto;box-sizing:border-box;color-scheme:dark;scrollbar-width:thin;scrollbar-color:#6b5c3f transparent;overscroll-behavior:contain}
    #publicLobby .lobby-adventure :is(.ui-row,select){scroll-margin-bottom:96px}
    #publicLobby.hidden,#publicLobby [hidden]{display:none!important}#publicLobby *{box-sizing:border-box}
    #publicLobby .lobby-card{min-height:100%;display:grid;grid-template-columns:minmax(0,420px) minmax(24px,1fr) minmax(0,380px);grid-template-rows:auto auto 1fr auto;
      grid-template-areas:"head head head" "status status status" "setup . party" "foot foot foot";
      padding:max(28px,5vh) max(16px,5vw) max(16px,3.5vh);animation:lobby-arrive .2s ease-out}
    #publicLobby .lobby-layout{display:contents}
    #publicLobby .lobby-header{grid-area:head;display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:max(18px,3.5vh)}
    #publicLobby .lobby-connection{flex:none;display:inline-flex;align-items:center;gap:8px;font:var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-muted);font-variant-numeric:tabular-nums}
    #publicLobby .lobby-connection:before{content:'';width:8px;height:8px;background:var(--ui-accent)}#publicLobby[data-connected=true] .lobby-connection:before{background:var(--ui-good)}
    #lobbyStatus{grid-area:status;margin:-8px 0 20px;color:var(--ui-muted)}#lobbyStatus:empty{display:none}
    #lobbyNotice{grid-area:status;align-self:start;margin:-8px 0 20px;padding:8px 14px;border-left:3px solid var(--ui-accent);background:var(--ui-accent-wash);color:var(--ui-accent-hi);overflow-wrap:anywhere}
    #publicLobby .lobby-adventure{grid-area:setup;min-width:0;display:flex;flex-direction:column}
    #publicLobby .lobby-party{grid-area:party;min-width:0}
    #publicLobby h2{margin:0}
    #lobbyModes{display:flex;flex-direction:column;gap:2px}
    #publicLobby .lobby-summary{margin:10px 0 0;padding-left:16px;color:var(--ui-muted);line-height:1.5;min-height:3em}
    #publicLobby .lobby-primary{position:sticky;bottom:0;z-index:1;display:flex;flex-direction:column;gap:10px;margin-top:12px;padding:12px 0;background:#080a0c}
    #publicLobby[data-running=true] #lobbyStart{background:transparent;color:var(--ui-ink);border:1px solid var(--ui-line);min-height:44px;font-weight:500}
    #publicLobby[data-running=true] #lobbyStart:hover{background:var(--ui-hover)}
    #publicLobby .lobby-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}#publicLobby #lobbyRunActions .ui-button{flex:1 1 auto}
    #publicLobby #lobbyReturn{color:var(--ui-alarm)}
    #lobbyWaiting{margin-top:8px}#lobbyWaiting .lobby-waiting-text:empty{display:none}#lobbyWaiting .lobby-waiting-text{margin:0 0 16px;font:400 var(--ui-size-row)/1.4 var(--ui-display);color:var(--ui-ink)}
    #publicLobby #lobbyRetry{margin-top:16px}#publicLobby #lobbyPrivate{display:flex;width:100%;justify-content:center;margin-top:10px}#publicLobby #lobbyPrivate[hidden]{display:none}
    #publicLobby .online-level{margin:0 0 14px;color:var(--ui-accent-hi);font:600 var(--ui-size-text)/1.4 var(--ui-text);letter-spacing:0;text-transform:none}
    #publicLobby .lobby-section-title{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:16px}
    #publicLobby .lobby-section-title h2{font:400 var(--ui-size-head)/1.2 var(--ui-display);color:var(--ui-ink)}
    #lobbyCount{font:var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-muted);font-variant-numeric:tabular-nums}
    #lobbyPlayers{max-height:min(320px,40vh);overflow:auto;scrollbar-width:thin;scrollbar-color:#6b5c3f transparent;margin:0;border-top:1px solid var(--ui-line)}
    #publicLobby .lobby-player{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;min-height:46px;padding:6px 4px 6px 13px;border-bottom:1px solid var(--ui-line);border-left:3px solid transparent}
    #publicLobby .lobby-player[data-self=true]{border-left-color:var(--ui-accent)}
    #publicLobby .lobby-player-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 18px/1.3 var(--ui-display)}
    #publicLobby .lobby-player-role{font:600 var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-accent)}
    #publicLobby .lobby-player button{min-height:34px;padding:0 10px;font-size:var(--ui-size-hint)}
    #publicLobby .lobby-player-actions{display:none;flex-basis:100%;gap:6px}#publicLobby.managing-party .lobby-player-actions{display:flex}
    #publicLobby .lobby-party-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:12px}
    #lobbyBoard{margin-top:28px}#lobbyBoard .lobby-section-title{margin-bottom:4px}#lobbyBoard h3{margin:14px 0 0}#lobbyBoardReset{font:var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-muted)}
    #lobbyBoard ol{margin:6px 0 0;padding:0;list-style:none;border-top:1px solid var(--ui-line);font-variant-numeric:tabular-nums}
    #lobbyBoard li{display:grid;grid-template-columns:minmax(64px,auto) minmax(0,1fr) auto;align-items:baseline;gap:12px;padding:6px 0;border-bottom:1px solid var(--ui-line)}
    #lobbyBoard li.board-empty{display:block;color:var(--ui-muted)}
    #lobbyBoard .board-main{font:400 17px/1.3 var(--ui-display);color:var(--ui-ink)}
    #lobbyBoard .board-names{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ui-muted)}
    #lobbyBoard .board-time{color:var(--ui-muted)}
    #publicLobby .lobby-hint{margin:10px 0 0;font:var(--ui-size-hint)/1.5 var(--ui-text);color:var(--ui-muted)}
    #publicLobby #lobbyLiveWarning{margin:0 0 14px}
    #publicLobby .lobby-footer{grid-area:foot;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;margin-top:max(20px,3vh);padding-top:12px;border-top:1px solid var(--ui-line)}
    #publicLobby .lobby-footer-actions{display:flex;flex-wrap:wrap;gap:4px;margin-left:-10px}
    #lobbyPadHint:empty{display:none}
    #publicLobby .lobby-controls{position:fixed;z-index:1;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;
      padding:24px 28px;background:var(--ui-panel);border:1px solid var(--ui-line-hi);box-shadow:0 0 0 100vmax #000000a8}
    #publicLobby .lobby-controls-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
    #publicLobby .lobby-controls h2{font:400 var(--ui-size-head)/1.2 var(--ui-display);color:var(--ui-ink)}
    #lobbyControlsList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin:0}
    #lobbyControlsList div{display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:38px;border-bottom:1px solid var(--ui-line)}#lobbyControlsList dt{color:var(--ui-ink)}
    #lobbyControlsList dd{margin:0;text-align:right;color:var(--ui-ink);font:600 var(--ui-size-hint)/1 var(--ui-text);border:1px solid #ffffff40;border-bottom-width:2px;border-radius:3px;padding:4px 7px;background:#ffffff0a}
    #publicLobby .lobby-controls-tip{margin:14px 0 0;color:var(--ui-muted)}
    @keyframes lobby-arrive{from{opacity:0}to{opacity:1}}
    @media (prefers-reduced-motion:reduce){#publicLobby .lobby-card{animation-duration:.01s}}
    @media(max-width:760px){#publicLobby .lobby-card{grid-template-columns:minmax(0,1fr);grid-template-areas:"head" "status" "setup" "party" "foot";padding:max(24px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom))}
      #publicLobby .lobby-party{margin-top:32px}#publicLobby .ui-title{font-size:32px}#lobbyControlsList{grid-template-columns:1fr}#lobbyPlayers{max-height:none}
      #publicLobby .lobby-summary{min-height:0}#publicLobby .lobby-footer{margin-top:28px}}
    @media(max-height:640px) and (min-width:761px){#publicLobby .lobby-card{padding-top:20px}#publicLobby .lobby-header{margin-bottom:14px}#publicLobby .ui-title{font-size:32px}
      #publicLobby #lobbyModes .ui-row{min-height:36px}#publicLobby .lobby-summary{min-height:0;margin-top:6px}#publicLobby .lobby-primary{margin-top:16px}}
    #onlineParty{position:fixed;right:18px;top:42px;z-index:25;width:210px;max-width:calc(100vw - 36px);box-sizing:border-box;pointer-events:none;color:var(--mp-ink);font:12px/1.5 system-ui;text-shadow:0 1px 2px #000;background:linear-gradient(160deg,#12171acc,#0d1113a8);padding:10px 12px;border:1px solid var(--mp-line);border-radius:8px;box-shadow:0 8px 24px #0006;backdrop-filter:blur(3px)}
    .online-level{margin:0 0 8px;color:var(--mp-gold-hi,#f3dca3);font:600 11px/1.4 system-ui;text-align:left;letter-spacing:.1em;text-transform:uppercase}
    .online-level[hidden]{display:none}
    #onlineAlive{margin-top:6px;text-align:left;font:12px/1.5 system-ui;max-height:24vh;overflow:auto;pointer-events:auto;scrollbar-width:thin;scrollbar-color:#756443 transparent}
    #onlineAlive .alive-title{color:var(--mp-muted);font-size:10px;font-weight:600;letter-spacing:.14em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--mp-line)}
    #onlineAlive .alive-player{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:3px 7px;margin-bottom:8px}
    #onlineAlive .alive-player:before{content:'';width:7px;height:7px;border-radius:50%;background:var(--mp-faint)}
    #onlineAlive .alive-player span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #onlineAlive .alive:before{background:var(--mp-good);box-shadow:0 0 6px #a9cf8e88}#onlineAlive .fallen:before{background:var(--mp-bad)}
    #onlineAlive .fallen span{color:#b9a49e;text-decoration:line-through;text-decoration-color:#d8938388}#onlineAlive .loading span{color:var(--mp-muted)}
    #onlineAlive strong{white-space:nowrap;font-weight:600;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--mp-muted)}
    #onlineAlive .alive strong{color:var(--mp-good)}#onlineAlive .fallen strong{color:var(--mp-bad)}
    .ally-health{height:4px;background:#050907d9;border:1px solid #ffffff1f;border-radius:3px;overflow:hidden;box-sizing:content-box}.ally-health[hidden]{display:none}
    .ally-health-fill{display:block;width:100%;height:100%;background:linear-gradient(90deg,#5f9a6a,#c5dfa0);transform-origin:left;transition:transform .18s linear}
    #onlineAlive .ally-health{grid-column:2/-1}
    .online-name{position:fixed;z-index:21;pointer-events:none;min-width:84px;max-width:190px;box-sizing:border-box;text-align:center;color:#f2e0ab;background:linear-gradient(180deg,#14191ccc,#0c1012cc);border:1px solid #c9a96a40;padding:3px 8px 4px;border-radius:5px;font:600 12px/1.3 system-ui;letter-spacing:.02em;text-shadow:0 1px 2px #000;transform:translate(-50%,-100%);white-space:nowrap;box-shadow:0 3px 10px #0007}
    .online-name:after{content:'';position:absolute;left:50%;bottom:-5px;width:8px;height:8px;margin-left:-4px;background:#0c1012cc;border-right:1px solid #c9a96a40;border-bottom:1px solid #c9a96a40;transform:rotate(45deg)}
    .online-name-text{display:block;overflow:hidden;text-overflow:ellipsis}.online-name .ally-health{margin:4px 0 1px}
    @media(prefers-reduced-motion:reduce){.ally-health-fill,#publicLobby button,#publicLobby input,#publicLobby select{transition:none}#publicLobby .lobby-card{animation:none}#publicLobby button:active{transform:none}}
    @media(max-width:800px){#onlineParty{top:118px;width:168px;right:12px;font-size:11px;padding:8px 10px}}
    @media(max-width:640px){#onlineParty{top:162px}}
    #onlineSpectator{position:fixed;z-index:50;bottom:max(18px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(460px,calc(100vw - 24px));color:#fff0c9;text-align:center;font:14px/1.5 system-ui}
    #onlineSpectator[hidden],#spectatorControls[hidden]{display:none}
    #spectatorControls{padding:10px 12px 8px;background:linear-gradient(160deg,#151b1cf0,#0d1112f0);border:1px solid var(--mp-line-hi);border-radius:10px;box-shadow:0 10px 30px #000a;backdrop-filter:blur(4px)}
    #onlineSpectator .spectator-row{display:flex;align-items:center;gap:12px}
    #onlineSpectator .spectator-person{flex:1;min-width:0}#onlineSpectator .spectator-person span{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:600;letter-spacing:.2em;color:var(--mp-gold)}
    #onlineSpectator .spectator-person span:before{content:'';width:7px;height:7px;border-radius:50%;background:#e05c4d;box-shadow:0 0 8px #e05c4d;animation:spectator-live 1.6s ease-in-out infinite}
    #spectatorName{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 19px/1.35 Georgia,serif;color:var(--mp-gold-hi)}
    #onlineSpectator button{color:#fff0c9;background:#ffffff0a;border:1px solid #c9a96a55;border-radius:6px;cursor:pointer;font:inherit;padding:8px 12px;transition:background .15s,border-color .15s}
    #onlineSpectator button:hover{background:#dcbb741f;border-color:var(--mp-gold)}
    #onlineSpectator button:focus-visible{outline:2px solid var(--mp-gold-hi);outline-offset:2px}#onlineSpectator button:disabled{opacity:.35;cursor:default}
    #onlineSpectator .spectator-arrow{font-size:20px;min-width:44px;min-height:44px;border-radius:50%}#spectatorHint{margin:6px 0 0;color:var(--mp-muted);font-size:12px}
    #spectatorToggle{margin-top:8px;font-size:12px!important;background:#0d1112d9!important;border-radius:999px!important;padding:5px 14px!important}
    @keyframes spectator-live{50%{opacity:.35}}
    @media(prefers-reduced-motion:reduce){#onlineSpectator .spectator-person span:before{animation:none}#onlineSpectator button{transition:none}}
    body.spectator-view #died,body.spectator-view #pBars{display:none}body.spectator-view canvas#view.dying{filter:none;transition:none}
    #onlineParty.hidden{display:none}`;
  document.head.appendChild(style); document.body.appendChild(panel);
  // The end of a Calling run, won or wiped: the fight it reached, its time, and each player's damage and falls. It stays until
  // the player closes it (Escape, B, Lobby) or the leader starts the same run again for the same group.
  const runSummary = document.createElement('section'); runSummary.id = 'runSummary'; runSummary.hidden = true;
  runSummary.setAttribute('role', 'dialog'); runSummary.setAttribute('aria-modal', 'true'); runSummary.setAttribute('aria-labelledby', 'runSummaryTitle');
  runSummary.innerHTML = '<div class="summary-panel"><h2 id="runSummaryTitle"></h2><dl class="summary-facts"><div><dt>Crowned</dt><dd id="runSummaryCrowned"></dd></div><div><dt>Time</dt><dd id="runSummaryTime"></dd></div></dl>'
    + '<section id="runSummaryRewards" aria-label="Rewards"></section><ol id="runSummaryTimes" aria-label="Time for each boss"></ol>'
    + '<table><thead><tr><th scope="col">Player</th><th scope="col">Damage</th><th scope="col">Deaths</th></tr></thead><tbody id="runSummaryRows"></tbody></table>'
    + '<div class="summary-actions"><button type="button" id="runSummaryAgain" class="ui-primary">Run again</button><button type="button" id="runSummaryLobby" class="ui-text-button"><span class="ui-key" id="runSummaryLobbyKey" aria-hidden="true"></span>Lobby</button><p id="runSummaryWait"></p></div></div>';
  document.body.appendChild(runSummary);
  // The same page as the menus (index.html's #menu): the well, the title top left in the display face, lines instead of
  // boxes, Again as the one strong action and Lobby as a quiet one with its key.
  const summaryStyle = document.createElement('style');
  summaryStyle.textContent = `#runSummary[hidden],#runSummary [hidden]{display:none}
    #runSummary{position:fixed;inset:0;z-index:121;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;
      padding:max(56px,env(safe-area-inset-top)) 64px max(32px,env(safe-area-inset-bottom));background:var(--ui-well);color:var(--ui-ink);font:var(--ui-size-text)/1.5 var(--ui-text)}
    #runSummary .summary-panel{width:min(720px,100%)}
    @media(min-width:960px){#runSummary .summary-panel{display:grid;width:min(1000px,100%);grid-template-columns:minmax(0,1fr) minmax(0,380px);column-gap:72px;align-items:start}
      #runSummary h2,#runSummary .summary-facts,#runSummary .summary-actions{grid-column:1/-1}
      #runSummary table{grid-column:1;grid-row:3/5}#runSummary #runSummaryRewards{grid-column:2;grid-row:3}#runSummary #runSummaryTimes{grid-column:2;grid-row:4;margin:28px 0 0}}
    #runSummaryRewards{margin:0 0 28px}#runSummaryRewards:empty{display:none}
    #runSummaryRewards h3{margin:0 0 8px;font:400 var(--ui-size-row)/1.2 var(--ui-display);color:var(--ui-ink)}
    #runSummary .summary-rewards{margin:0;border-top:1px solid var(--ui-line)}
    #runSummary .summary-rewards div{display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid var(--ui-line)}
    #runSummary .summary-rewards dt{font-size:var(--ui-size-text);color:var(--ui-muted)}#runSummary .summary-rewards dd{margin:0;font:400 19px/1.2 var(--ui-display)}
    #runSummaryRewards .crates-xp{display:block;width:100%;height:3px;margin:10px 0 0;background:var(--ui-line)}
    #runSummaryRewards .summary-crate{margin-top:14px}
    #runSummary h2{margin:0;font:400 var(--ui-size-title)/1.1 var(--ui-display);color:var(--ui-ink);text-wrap:balance}
    #runSummary.summary-wiped h2{color:var(--ui-alarm)}
    #runSummary .summary-facts{display:flex;gap:56px;margin:32px 0 28px}
    #runSummary dt{font-size:var(--ui-size-hint);color:var(--ui-muted)}
    #runSummary dd{margin:4px 0 0;font:400 32px/1.1 var(--ui-display);font-variant-numeric:tabular-nums}
    #runSummaryTimes{margin:0 0 28px;padding:0;list-style:none;border-top:1px solid var(--ui-line);font-variant-numeric:tabular-nums}#runSummaryTimes:empty{display:none}
    #runSummaryTimes li{display:flex;gap:16px;padding:9px 0;border-bottom:1px solid var(--ui-line)}
    #runSummaryTimes li span:first-child{flex:1;min-width:0;overflow-wrap:anywhere;font:400 17px/1.3 var(--ui-display)}
    #runSummaryTimes .par{min-width:72px;text-align:right;color:var(--ui-muted)}#runSummaryTimes .swift{color:var(--ui-accent-hi)}
    #runSummary table{width:100%;border-collapse:collapse;table-layout:fixed;font-variant-numeric:tabular-nums}
    #runSummary th{padding:0 8px 8px;font-size:var(--ui-size-hint);font-weight:400;color:var(--ui-muted);text-align:right}
    #runSummary th:first-child,#runSummary td:first-child{text-align:left;padding-left:0}
    #runSummary th:nth-child(2){width:110px}#runSummary th:nth-child(3){width:80px}
    #runSummary td{padding:10px 8px;border-top:1px solid var(--ui-line);text-align:right}#runSummary td:last-child,#runSummary th:last-child{padding-right:0}
    #runSummary tbody tr:last-child td{border-bottom:1px solid var(--ui-line)}
    #runSummary td:first-child{overflow-wrap:anywhere;font:400 17px/1.3 var(--ui-display)}#runSummary td small{margin-left:10px;color:var(--ui-muted);font:var(--ui-size-hint)/1 var(--ui-text)}
    #runSummary tr[data-self=true] td:first-child{color:var(--ui-accent-hi)}
    #runSummary .summary-title{display:block;margin-top:3px;font:var(--ui-size-hint)/1.35 var(--ui-text);color:var(--ui-muted)}#runSummary tr[data-self=true] .summary-title{color:var(--ui-ink)}
    #runSummary .summary-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px;margin-top:36px}
    #runSummary #runSummaryAgain{width:auto;min-width:220px}
    #runSummary button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #runSummary button:focus-visible{outline:2px solid var(--ui-accent-hi);outline-offset:3px}
    #runSummaryWait{margin:0;color:var(--ui-muted)}#runSummaryWait:empty{display:none}
    @media(max-width:640px){#runSummary{padding:max(36px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom))}
      #runSummary h2{font-size:32px}#runSummary .summary-facts{gap:36px;margin:24px 0 20px}#runSummary dd{font-size:26px}
      #runSummary th:nth-child(2){width:84px}#runSummary th:nth-child(3){width:62px}
      #runSummary .summary-actions{margin-top:28px}#runSummary #runSummaryAgain{flex:1 1 100%}}
    @media(hover:none) and (pointer:coarse){#runSummaryLobbyKey{display:none}}`;
  document.head.appendChild(summaryStyle);
  let summary = null;   // the last run's summary while its screen is open
  const runClock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  function settleRunResult(data) {
    if ((data.players || []).some(r => r.id === self)) progress.award(data, data.key);
    if (data.key) send({ type: 'runResultSeen', key: data.key });
  }
  function showRunSummary(data) {
    summary = data;
    runSummary.classList.toggle('summary-wiped', data.outcome !== 'won');
    // Endless: the fight reached is the title, the HUD's and the board's number (one count, the fight: pass 96), then
    // the Crowned fights won.
    const reached = Math.max(1, Math.floor(Number(data.reached) || 0));
    el('runSummaryTitle').textContent = `Reached fight ${reached}`;
    el('runSummaryCrowned').textContent = String(Math.max(0, Math.floor(Number(data.crowned) || 0)));
    el('runSummaryTime').textContent = runClock(Math.max(0, Math.round(Number(data.time) || 0)));
    // Each boss's time against its par; under par was a swift kill.
    const times = el('runSummaryTimes'); times.replaceChildren();
    for (const t of Array.isArray(data.times) ? data.times : []) {
      const li = document.createElement('li'), seconds = Math.max(0, Math.round(Number(t.time) || 0)), par = Math.max(0, Math.round(Number(t.par) || 0));
      const parts = [[(t.crowned ? 'Crowned: ' : '') + (t.bosses || []).map(id => ArenaNet.own(ENEMY_BY_ID, id)?.name || id).join(' & '), ''], [runClock(seconds), t.swift ? 'swift' : ''],
        [t.swift ? 'Swift kill' : 'par ' + runClock(par), t.swift ? 'swift' : 'par']];
      for (const [text, cls] of parts) { const span = document.createElement('span'); span.textContent = text; if (cls) span.className = cls; li.appendChild(span); }
      times.appendChild(li);
    }
    // This browser's xp, level and crates (js/crate-screen.js): xp only for those who played the run.
    crateScreen.runRewards(el('runSummaryRewards'), data, (data.players || []).some(r => r.id === self));
    if (data.key) send({ type: 'runResultSeen', key: data.key });
    const rows = el('runSummaryRows'); rows.replaceChildren();
    for (const r of data.players || []) {
      const tr = document.createElement('tr'); tr.dataset.self = String(r.id === self);
      // The run's title for this player (js/lobby-host.js runTitles) under their name.
      const name = document.createElement('td'), who = document.createElement('span'); who.textContent = r.name; name.appendChild(who);
      if (r.title) { const title = document.createElement('span'); title.className = 'summary-title'; title.textContent = r.title; name.appendChild(title); }
      tr.appendChild(name);
      for (const value of [r.damage, r.deaths]) { const td = document.createElement('td'); td.textContent = Number(value).toLocaleString(); tr.appendChild(td); }
      rows.appendChild(tr);
    }
    panel.inert = true; runSummary.hidden = false; input.clear(); if (document.pointerLockElement) document.exitPointerLock();
    el('runSummaryLobbyKey').textContent = usingPad() ? 'B' : 'Esc';
    el('runSummaryLobby').lastChild.textContent = solo ? 'Title' : 'Lobby';
    drawRunSummary(); summaryButtons()[0]?.focus({ preventScroll: true });
  }
  // Only the leader can start the run again; the others see who can.
  function drawRunSummary() {
    if (!summary) return;
    const owner = connected && self === leader;
    el('runSummaryAgain').hidden = !owner;
    el('runSummaryWait').textContent = owner || !connected ? '' : `${roster.find(p => p.id === leader)?.name || 'The leader'} can start this run again.`;
  }
  const summaryButtons = () => [el('runSummaryCrate'), el('runSummaryAgain'), el('runSummaryLobby')].filter(b => b && !b.hidden);
  function closeRunSummary(focusLobby = true) {
    if (!summary) return;
    summary = null; runSummary.hidden = true; panel.inert = false;
    if (focusLobby && solo) { leave(); return; }   // alone, the end screen's way out is the title
    if (focusLobby && connected && !usingPad()) el('lobbyLeave').focus();
  }
  function moveSummaryFocus(step) {
    const buttons = summaryButtons(), at = buttons.indexOf(document.activeElement);
    buttons[at < 0 ? 0 : (at + step + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  }
  runSummary.querySelector('#runSummaryAgain').onclick = () => {
    const again = summary; closeRunSummary(false);
    if (again) control('start', { kind: 'calling', id: again.id === C.weekly.id ? C.weekly.id : C.calling.id });
  };
  runSummary.querySelector('#runSummaryLobby').onclick = () => closeRunSummary();
  window.addEventListener('keydown', ev => {
    if (runSummary.hidden || ev.code === 'Escape' && !solo) return;   // online, Escape reaches the lobby (lobbyBack)
    if (ev.code === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); if (!ev.repeat) closeRunSummary(); return; }
    userActivity(ev); ev.stopImmediatePropagation();
    if (ev.code === 'Tab') { ev.preventDefault(); moveSummaryFocus(ev.shiftKey ? -1 : 1); }
    else if (ev.code.startsWith('Arrow')) { ev.preventDefault(); moveSummaryFocus(ev.code === 'ArrowLeft' || ev.code === 'ArrowUp' ? -1 : 1); }
  }, true);
  function summaryPad(pressed) {
    if (runSummary.hidden) return false;
    if (pressed.includes('PadB')) closeRunSummary();
    else if (pressed.includes('PadLeft') || pressed.includes('PadUp')) moveSummaryFocus(-1);
    else if (pressed.includes('PadRight') || pressed.includes('PadDown')) moveSummaryFocus(1);
    else if (pressed.includes('PadA') && summaryButtons().includes(document.activeElement)) document.activeElement.click();
    return true;
  }
  // Boss Rush's abilities (CONFIG.abilities): between fights the server offers each player a few; clicking a card,
  // pressing Space, a number key or PadA only highlights it, and the Confirm button takes it (v7.160.0, Aleix). The
  // next fight starts when everyone has chosen or the time runs out. The cards and their look: js/ability-cards.js.
  const abilityScreen = document.createElement('section'); abilityScreen.id = 'abilityScreen'; abilityScreen.hidden = true;
  abilityScreen.setAttribute('aria-labelledby', 'abilityTitle');
  abilityScreen.innerHTML = '<div class="ability-panel"><div class="ability-head"><h2 id="abilityTitle">Choose an ability</h2><span id="abilityClock"></span></div><div class="ability-time" aria-hidden="true"><i id="abilityTimeFill"></i></div><div id="abilityChoices" role="group" aria-labelledby="abilityTitle"></div><div class="ability-actions"><button type="button" id="abilityConfirm" class="ui-primary" disabled>Confirm</button></div><p id="abilityStatus" aria-live="polite"></p><section id="abilityHeld" aria-labelledby="abilityHeldTitle"></section></div>';
  document.body.appendChild(abilityScreen);
  let ability = null;   // while the pick is open: { offer, held, selected, chosen, deadline (performance.now() ms), clock }
  function openAbilities(msg) {
    if (msg.offer) crateScreen.close();
    if (!msg.offer) {   // the server took this player's pick
      if (ability) { ability.held = msg.held || []; ability.chosen = ability.chosen || ability.held[ability.held.length - 1] || null; ability.selected = ability.chosen; drawHeld(); drawAbilities(); }
      return;
    }
    ability = { offer: msg.offer, held: msg.held || [], selected: null, chosen: null, deadline: performance.now() + Math.max(0, Number(msg.left) || 0) * 1000, clock: '' };
    const list = el('abilityChoices'); list.replaceChildren();
    msg.offer.forEach((id, i) => {
      const b = ArenaNet.own(ABILITY_BY_ID, id); if (!b) return;
      // A swift kill's extra choice (CONFIG.swift) is the last one, and says so.
      const card = abilityCard(b, ability.held, i + 1, !!msg.swift && !msg.crowned && i === msg.offer.length - 1 && i >= CONFIG.abilities.offer);
      card.onclick = () => selectAbility(id);
      list.appendChild(card);
    });
    el('abilityConfirm').onclick = () => confirmAbility();
    const n = list.children.length;
    abilityScreen.style.setProperty('--pick-w', `${n * 216 + (n - 1) * 12}px`);   // the row of tall cards, and the title over it
    input.clear(); if (document.pointerLockElement) document.exitPointerLock();
    abilityScreen.hidden = true; drawHeld(); drawAbilities();
  }
  // What this player holds, under the cards (abilityHeldList): what each does and its trigger, to plan the next.
  function drawHeld() {
    const box = el('abilityHeld'), list = ability && abilityHeldList(ability.held.filter(id => ArenaNet.own(ABILITY_BY_ID, id)));
    box.replaceChildren();
    if (!list) return;
    const title = document.createElement('h3'); title.id = 'abilityHeldTitle'; title.textContent = 'Your abilities';
    box.append(title, list);
  }
  function selectAbility(id) {
    if (!ability || ability.chosen || !active()) return;
    ability.selected = id; drawAbilities();
  }
  function confirmAbility() {
    if (!ability || ability.chosen || !ability.selected || !active()) return;
    chooseAbility(ability.selected);
  }
  function chooseAbility(id) {
    if (!ability || ability.chosen || !active()) return;
    ability.selected = id; ability.chosen = id; send({ type: 'pickAbility', id, epoch: session.epoch }); drawAbilities();
    events.emit('abilityPicked', { id, rarity: ABILITY_BY_ID[id]?.rarity });   // a note and a ring round the player
  }
  function closeAbilities() { ability = null; abilityScreen.hidden = true; }
  function abilityButtons(includeConfirm = true) {
    const cards = [...el('abilityChoices').children].filter(b => !b.disabled);
    const confirm = el('abilityConfirm');
    if (includeConfirm && confirm && !confirm.disabled) cards.push(confirm);
    return cards;
  }
  function moveAbilityFocus(step, includeConfirm = true) {
    const buttons = abilityButtons(includeConfirm), at = buttons.indexOf(document.activeElement);
    buttons[at < 0 ? 0 : (at + step + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  }
  function drawAbilities() {
    const visible = !!ability && active() && Game.loading <= 0 && panel.classList.contains('hidden');
    const opening = visible && abilityScreen.hidden;
    abilityScreen.hidden = !visible;
    if (!visible) return;
    const left = Math.max(0, (ability.deadline - performance.now()) / 1000), clock = Math.ceil(left) + '\u00a0s';
    if (clock !== ability.clock) { ability.clock = clock; el('abilityClock').textContent = clock; }
    el('abilityTimeFill').style.transform = `scaleX(${(left / CONFIG.abilities.pickTime).toFixed(3)})`;
    const activeId = ability.chosen || ability.selected;
    for (const button of el('abilityChoices').children) {
      button.setAttribute('aria-pressed', String(button.dataset.ability === activeId));
      button.disabled = !!ability.chosen && button.dataset.ability !== ability.chosen;
    }
    const confirm = el('abilityConfirm');
    confirm.disabled = !ability.selected || !!ability.chosen;
    confirm.textContent = ability.chosen ? 'Confirmed' : 'Confirm';
    // Once chosen, the pick holds a moment (CONFIG.abilities.pickHold): the choice in gold, the others still readable.
    const status = ability.chosen && !ability.done && roster.filter(p => !p.bot).length > 1 ? 'Waiting for the others.' : '';
    if (el('abilityStatus').textContent !== status) el('abilityStatus').textContent = status;
    abilityScreen.classList.toggle('ability-pad', usingPad());
    if (opening) el('abilityChoices').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  // While the pick is open the game hears no keys: a number highlights that ability, Space/Enter on a card only
  // highlights it, arrows/Tab move between cards and the Confirm button, and Escape still opens the lobby.
  window.addEventListener('keydown', ev => {
    if (abilityScreen.hidden || ev.code === 'Escape') return;
    userActivity(ev); ev.stopImmediatePropagation();
    if (ev.code === 'Tab') { ev.preventDefault(); moveAbilityFocus(ev.shiftKey ? -1 : 1, true); return; }   // focus stays in the pick
    const n = /^(?:Digit|Numpad)([1-9])$/.exec(ev.code);
    if (n) { ev.preventDefault(); const b = el('abilityChoices').children[Number(n[1]) - 1]; if (b && !b.disabled) { selectAbility(b.dataset.ability); b.focus({ preventScroll: true }); } }
    else if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') { ev.preventDefault(); moveAbilityFocus(ev.code === 'ArrowLeft' ? -1 : 1, false); }
    else if (ev.code === 'ArrowDown' || ev.code === 'ArrowUp') {
      ev.preventDefault();
      const confirm = el('abilityConfirm');
      if (ev.code === 'ArrowDown' && document.activeElement !== confirm && !confirm.disabled) confirm.focus({ preventScroll: true });
      else if (ev.code === 'ArrowUp' && document.activeElement === confirm) {
        const sel = ability?.selected && [...el('abilityChoices').children].find(b => b.dataset.ability === ability.selected && !b.disabled);
        (sel || el('abilityChoices').querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
      } else moveAbilityFocus(ev.code === 'ArrowUp' ? -1 : 1, true);
    }
  }, true);
  // The pad: the d-pad moves between cards and Confirm, A highlights a card or presses Confirm, Start still opens the lobby.
  function abilityPad(pressed) {
    if (abilityScreen.hidden || pressed.includes('PadStart')) return false;
    input.clear();
    const confirm = el('abilityConfirm');
    if (pressed.includes('PadLeft')) moveAbilityFocus(-1, false);
    if (pressed.includes('PadRight')) moveAbilityFocus(1, false);
    if (pressed.includes('PadDown')) {
      if (document.activeElement !== confirm && !confirm.disabled) confirm.focus({ preventScroll: true });
      else moveAbilityFocus(1, true);
    }
    if (pressed.includes('PadUp')) {
      if (document.activeElement === confirm) {
        const sel = ability?.selected && [...el('abilityChoices').children].find(b => b.dataset.ability === ability.selected && !b.disabled);
        (sel || el('abilityChoices').querySelector('button:not(:disabled)'))?.focus({ preventScroll: true });
      } else moveAbilityFocus(-1, true);
    }
    if (pressed.includes('PadA')) {
      if (document.activeElement === confirm && !confirm.disabled) confirmAbility();
      else if (document.activeElement?.dataset?.ability) selectAbility(document.activeElement.dataset.ability);
    }
    return true;
  }
  const party = document.createElement('div'); party.id = 'onlineParty'; party.className = 'hidden'; document.body.appendChild(party);
  party.innerHTML = '<div id="onlineCurrentLevel" class="online-level" hidden></div><section id="onlineAlive" aria-label="Players alive"></section>';
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
      const title = document.createElement('div'); title.className = 'alive-title'; title.textContent = `PLAYERS ALIVE · ${players.filter(p => p.status === 'Alive').length}/${players.length}`; pane.appendChild(title);
      for (const p of players) {
        const row = document.createElement('div'); row.className = 'alive-player ' + p.status.toLowerCase();
        const name = document.createElement('span'), status = document.createElement('strong');
        name.textContent = p.name; status.textContent = p.status; row.append(name, status); pane.appendChild(row);
        if (p.id !== self) allyMeters.set(p.id, makeAllyHealth(row, p.id));
      }
    }
    for (const p of players) if (allyMeters.has(p.id)) updateAllyHealth(allyMeters.get(p.id), p.hp, p.name);
  }
  const el = id => document.getElementById(id);
  // What the controller and the arrow keys move through: the controls sheet while it is open, else the whole lobby (the
  // mirrored mode select is skipped: the mode list is its row).
  function lobbyControls() {
    const root = !el('lobbyControls').hidden ? el('lobbyControls') : panel;
    return [...root.querySelectorAll('button,input,select')].filter(node => !node.disabled && !node.hidden && node.offsetParent
      && !node.classList.contains('ui-mirror'));
  }
  function focusLobbyControl(node) {
    for (const previous of panel.querySelectorAll('.pad-selected')) previous.classList.remove('pad-selected');
    if (!node) return;
    node.classList.add('pad-selected'); node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'nearest' });
  }
  // Focus lands on the screen's one strong action: back to the run, or Start.
  function ensureLobbyFocus(fresh = false) {
    const controls = lobbyControls();
    if (!fresh && controls.includes(document.activeElement)) {
      if (!document.activeElement.classList.contains('pad-selected')) focusLobbyControl(document.activeElement);
      return document.activeElement;
    }
    const preferred = [el('lobbyResume'), el('lobbyGuestResume'), el('lobbyStart'), el('lobbyRetry'), el('lobbyPrivate'),
      el('lobbyModes').querySelector('[aria-pressed=true]'), el('lobbyLeave')].find(node => controls.includes(node));
    const next = preferred || controls[0]; focusLobbyControl(next); return next;
  }
  // The keys for the device used last: Back's key sits on the button it presses (Return to game, Close or Leave lobby),
  // and the footer names the rest (move, select).
  function updateLobbyPadHint() {
    const pad = usingPad();
    panel.classList.toggle('lobby-pad', pad);
    const back = !el('lobbyControls').hidden ? 'lobbyControlsClose'
      : ['lobbyResume', 'lobbyGuestResume'].find(id => !el(id).hidden && el(id).offsetParent) || 'lobbyLeave';
    for (const id of ['lobbyResume', 'lobbyGuestResume', 'lobbyLeave', 'lobbyControlsClose'])
      el(id).querySelector('.ui-key').textContent = id === back ? pad ? 'B' : 'Esc' : '';
    const hints = el('lobbyPadHint'); hints.textContent = '';
    for (const [key, label] of [[pad ? 'D-pad' : '↑ ↓', 'Move'], [pad ? 'A' : 'Enter', 'Select']]) {
      const item = document.createElement('span'), cap = document.createElement('span');
      cap.className = 'ui-key'; cap.textContent = key; item.append(cap, label); hints.appendChild(item);
    }
  }
  events.on('device', updateLobbyPadHint);
  // The controls sheet: one overlay over the lobby, with its own Close (Esc / B).
  // While it is open, the lobby behind it takes no clicks.
  function setLobbyHelp(open) {
    el('lobbyControls').hidden = !open; el('lobbyHelp').setAttribute('aria-expanded', String(open));
    for (const node of panel.querySelectorAll('.lobby-header,#lobbyStatus,#lobbyNotice,.lobby-layout,.lobby-footer')) node.inert = open;
  }
  function toggleLobbyHelp(open = el('lobbyControls').hidden) {
    setLobbyHelp(open); updateLobbyPadHint();
    focusLobbyControl(open ? el('lobbyControlsClose') : el('lobbyHelp'));
  }
  function lobbyBack() {
    if (summary) { closeRunSummary(); return; }
    if (!el('lobbyControls').hidden) toggleLobbyHelp(false);
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
    const canSwitch = spectatorCandidates().length > 1;
    for (const id of ['spectatorPrevious', 'spectatorNext']) {
      const arrow = el(id); arrow.disabled = !canSwitch; arrow.hidden = !canSwitch;
      if (!canSwitch && document.activeElement === arrow) el('spectatorToggle').focus();
    }
    el('spectatorControls').hidden = !spectatorBarOpen;
    text('spectatorToggle', (spectatorBarOpen ? 'Hide' : 'Show') + ' spectator bar · ' + (usingPad() ? 'X / □' : 'Tab'));
    el('spectatorToggle').setAttribute('aria-expanded', String(spectatorBarOpen));
    text('spectatorHint', (canSwitch ? usingPad() ? 'LB / L1 · RB / R1 to switch · ' : '← / → to switch · ' : '')
      + (usingPad() ? 'Menu / Options opens menu' : 'Escape opens menu'));
  }
  function switchSpectator(direction) {
    const candidates = spectatorCandidates(), at = candidates.findIndex(([id]) => id === spectatorTarget);
    if (candidates.length) spectatorTarget = candidates[(at + direction + candidates.length) % candidates.length][0];
    updateSpectatorBar();
    events.emit('menuMove');
  }
  function toggleSpectatorBar() {
    spectatorBarOpen = !spectatorBarOpen;
    if (!spectatorBarOpen && el('spectatorControls').contains(document.activeElement)) el('spectatorToggle').focus();
    updateSpectatorBar();
    events.emit('menuConfirm');
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
    const waiting = waitingForTeamWipe();
    if (waiting && !spectatorWasWaiting) {
      spectatorBarOpen = true; input.clear();
      if (document.pointerLockElement) document.exitPointerLock();
    }
    spectatorWasWaiting = waiting;
    const candidates = waiting ? spectatorCandidates() : [];
    // Whoever is reviving this player is the one to watch.
    if (waiting && rescuer && rescuer !== spectatorTarget && candidates.some(([id]) => id === rescuer)) spectatorTarget = rescuer;
    if (!candidates.some(([id]) => id === spectatorTarget)) spectatorTarget = candidates[0]?.[0] || null;
    spectator.hidden = !waiting || Game.mode !== 'play' || !panel.classList.contains('hidden') || Game.loading > 0 || !abilityScreen.hidden;   // the ability pick covers the spectator bar
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
    const rows = [
      ['Move', moveLabel()], ['Look around', usingPad() ? 'Right stick' : 'Mouse · click game first'],
      ['Light attack', bindLabel('light')], ['Heavy attack (hold to charge)', bindLabel('heavy')],
      ['Dodge', bindLabel('roll')], ['Jump', bindLabel('jump')],
      ['Block (hold)', bindLabel('block')], ['Deflect (tap as it lands)', bindLabel(usingPad() ? 'parry' : 'block')],
      ['Abilities', abilityLabel()], ['Lock on / off', bindLabel('lock')], ['Heal with flask', bindLabel('flask')],
      ['Game menu', systemLabel('pause')],
    ];
    const list = el('lobbyControlsList'); list.textContent = '';
    for (const [action, binding] of rows) {
      const row = document.createElement('div'), name = document.createElement('dt'), keys = document.createElement('dd');
      name.textContent = action; keys.textContent = keycap(binding); row.append(name, keys); list.appendChild(row);
    }
  }
  events.on('device', buildControls);
  buildControls();
  let noticeTimer = null;
  const notice = (s, transient = false) => {
    clearTimeout(noticeTimer); el('lobbyNotice').textContent = s; el('lobbyNotice').hidden = !s;
    if (s && transient) noticeTimer = setTimeout(() => notice(''), CONFIG.hud.online.noticeTime * 1000);
  };
  let resumeToken = '', foreground = !document.hidden;
  try { resumeToken = localStorage.getItem('combatArena.onlineToken') || ''; } catch {}
  function send(data) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); }
  function flushActivity(now) {
    if (connected && activityPending && now - lastActivitySent >= C.activityInterval) {
      activityPending = false; lastActivitySent = now; send({ type: 'activity' });
    }
  }
  function activity() {
    if (!connected || document.visibilityState === 'hidden') return;
    setPresence(true); activityPending = true; flushActivity(performance.now());
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
  function publishPose() { if (active() && ready && Game.player) send({ type: 'pose', epoch: session.epoch, pose: capturePose(Game.player) }); }
  function setPresence(value) {
    if (foreground === value) return;
    if (!value) { publishPose(); heldActivity.clear(); activityPending = false; }
    foreground = value;
    if (connected && !solo) send({ type: 'presence', foreground });   // alone, the run pauses instead (js/alone.js)
  }
  window.addEventListener('blur', () => setPresence(false));
  window.addEventListener('focus', () => setPresence(!document.hidden));
  document.addEventListener('visibilitychange', () => setPresence(!document.hidden && document.hasFocus()));
  window.addEventListener('pagehide', () => { publishPose(); if (connected && !solo) send({ type: 'presence', foreground: false }); });
  function command(type, data = {}) { if (ready) send({ type, epoch: session.epoch, seq: ++seq, ...data }); }
  function clearControlPending() { clearTimeout(controlDeadline); controlDeadline = null; controlPending = null; }
  function control(action, data = {}) {
    if (!connected || self !== leader || controlPending) return;
    if (['start', 'restart', 'lobby'].includes(action)) {
      controlPending = action; notice(''); updateRoster();
      controlDeadline = setTimeout(() => { clearControlPending(); updateRoster(); notice('The request did not finish. Please try again.'); }, C.connectTimeout);
    }
    send({ type: 'control', action, ...data });
  }
  function closePanel() {
    panel.classList.add('hidden');
    el('menu').inert = false; hud.root.inert = false;
    if (panel.contains(document.activeElement)) document.activeElement.blur();
  }
  function overlayVisibility() {
    drawAbilities();
    party.hidden = solo || !active() || Game.mode !== 'play' || Game.loading > 0 || !panel.classList.contains('hidden');
    if (party.hidden) for (const remote of remotes.values()) remote.label.hidden = true;
  }
  function show() {
    setLobbyHelp(false);
    lobbyPadDirection = null; lobbyPadTimer = 0;
    panel.classList.remove('hidden');
    el('menu').inert = true; hud.root.inert = true;
    if (document.pointerLockElement) document.exitPointerLock();
    input.clear();
    if (active()) Game.mode = 'pause';
    el('menu').classList.add('hidden');
    document.body.classList.remove('no-cursor');
    updateRoster(); overlayVisibility();
    updateLobbyPadHint(); focusLobbyControl(ensureLobbyFocus());
  }
  function hide() { setLobbyHelp(false); closePanel(); if (active()) Game.resume(); overlayVisibility(); }
  function active() { return connected && !!session && loaded; }
  function clearRemotes() { for (const r of remotes.values()) { r.body.rig.dispose(); r.label.remove(); } remotes.clear(); }
  function resetStream() { closeRunSummary(false); tracks.clear(); decoder.reset(); latestFrame = null; receivedFrames = 0; playback = null; ready = false; lastPose = 0; deferredStart = null; resetSpectator(); embers = []; rescuer = null; revive.clear(); }
  function retryConnection(message) {
    if (solo) { leave(ALONE_FAILED); return; }   // nothing to reconnect to: the lobby was this page's
    if (!reconnectWanted) return;
    leave(message, true);
    notice('Reconnecting automatically… You can leave the lobby to cancel.');
    const delay = Math.min(C.reconnectMaxDelay, C.reconnectDelay * 2 ** Math.min(reconnectAttempt++, C.reconnectBackoffSteps));
    reconnectTimer = setTimeout(() => { reconnectTimer = null; join(true); }, delay);
  }
  function leave(message = '', retry = false) {
    publishPose();
    setLobbyHelp(false);
    joinAttempt++;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    if (!retry) { reconnectWanted = false; reconnectAttempt = 0; }
    intentionalClose = true;
    if (retry) socket?.close(); else socket?.close(1000, 'Left lobby');
    socket = null; solo = false;
    connected = false; self = leader = null; session = null; loaded = false; starting = false; ping = null; resetStream(); clearRemotes(); clearControlPending();
    roster = []; rosterSignature = ''; panel.classList.remove('managing-party'); el('lobbyManage').setAttribute('aria-expanded', 'false');
    heldActivity.clear(); activityPending = false; lastActivitySent = -Infinity;
    party.classList.add('hidden'); closePanel(); notice('');
    if (Game.player) Game.clearActors();
    Game.loading = 0; el('loading').classList.remove('show'); Game.showMenu('main');
    if (message) { show(); el('lobbyStatus').textContent = message; el('lobbyLeave').lastElementChild.textContent = retry ? 'Leave lobby' : 'Back to main menu'; }
  }
  // A socket to the lobby (the server's, or alone the page's own): hello once open, then every message to receive().
  function attach(next, build) {
    socket = next;
    const joining = socket;
    const deadline = setTimeout(() => { if (joining === socket && !connected) { retryConnection('The lobby did not respond. Reconnecting…'); } }, C.connectTimeout);
    socket.onopen = () => { if (socket === joining) send({ type: 'hello', protocol: C.protocol, build, name: solo ? progress.name || 'You' : progress.name, token: solo ? undefined : resumeToken, foreground: solo || foreground, ...gear() }); };
    socket.onmessage = event => { if (socket !== joining) return; try { receive(JSON.parse(event.data)); } catch (e) { console.error('Lobby update failed', e); retryConnection('Recovering the current game…'); } };
    socket.onclose = e => { clearTimeout(deadline); if (socket !== joining) return; if (!intentionalClose) {
      if (e.code === 1008 || solo) leave(e.reason || 'The lobby refused the connection.');
      else retryConnection(e.reason || 'Connection lost. Rejoining the current game…');
    } };
    socket.onerror = () => { if (socket === joining && !connected && !solo) notice('Could not connect. The lobby may be full or the server may be unavailable.'); };
  }
  // Boss Rush alone, with no server (js/alone.js): the run starts at once, with no lobby screen and no name asked. The
  // loading card covers the title while the page's lobby starts, until the first fight's own card replaces it.
  function playAlone() {
    if (connected || starting) return;
    clearTimeout(reconnectTimer); reconnectTimer = null; reconnectWanted = false;
    joinAttempt++; solo = true; starting = true; intentionalClose = false;
    Game.loadingFirst(C.calling.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()), '', () => {});
    attach(alone.open(() => Game.mode === 'pause' || document.hidden), alone.build);
  }
  async function join(retry = false) {
    if (connected) { show(); return; }
    if (starting) return;
    // The first time online play opens with no name, it asks for one (js/name-ask.js); never again after that.
    if (!progress.name) { nameAsk.open({ action: 'Join', then: () => join(retry) }); return; }
    clearTimeout(reconnectTimer); reconnectTimer = null;
    reconnectWanted = true;
    const attempt = ++joinAttempt;
    starting = true; intentionalClose = false; show(); notice('');
    el('lobbyStatus').textContent = 'Connecting to the public lobby…';
    el('lobbyLeave').lastElementChild.textContent = 'Leave lobby';
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('Open the game’s home server link to join the public lobby.');
      const response = await fetch('api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(C.connectTimeout) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The public lobby is available on the home server link. This address only hosts solo play.');
      const info = await response.json();
      if (!starting || attempt !== joinAttempt) return;
      if (info.players >= info.capacity) throw new Error(`The public lobby is full (${info.capacity} players). ${retry ? 'Waiting for a place to open.' : 'Try again when a place opens.'}`);
      if (typeof versionCheck !== 'undefined') versionCheck.note(info);
      const pageBuild = document.querySelector('meta[name="arena-build"]')?.content;
      if (info.version !== VERSION || pageBuild !== info.build) { reconnectWanted = false; needsReload = true; throw new Error('The game has updated. Reload this page before joining.'); }
      if (!starting || attempt !== joinAttempt) return;
      const wsUrl = new URL(C.path.replace(/^\/+/, ''), location.href);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      attach(new WebSocket(wsUrl.href), info.build);
    } catch (e) {
      if (attempt !== joinAttempt) return;
      starting = false;
      if (retry && reconnectWanted) retryConnection(e.message);
      else { reconnectWanted = false; el('lobbyStatus').textContent = e.name === 'TimeoutError' ? 'The lobby took too long to respond. Try again.'
        : e instanceof TypeError ? 'Could not reach the lobby. Check your connection and try again.' : e.message; }
      updateConnection();
    }
  }
  function updateConnection() {
    panel.dataset.connected = String(connected); panel.dataset.running = String(!!session);
    el('lobbyConnection').textContent = connected ? ping === null ? 'Connected' : `${ping} ms` : starting || reconnectWanted ? 'Connecting' : 'Offline';
    el('lobbyConnection').title = connected ? 'Round-trip connection time' : '';
    el('lobbyRetry').hidden = connected || starting || reconnectWanted;
    el('lobbyRetry').textContent = needsReload ? 'Reload game' : 'Try again';
    el('lobbyPrivate').hidden = connected || starting || needsReload;   // the lobby failed or is being retried: Boss Rush in private instead (Aleix)
    el('lobbyWaiting').hidden = connected && self === leader || !connected;
    el('lobbyCount').textContent = connected ? `${roster.length} / ${capacity}` : '—';
  }
  const weeklyChosen = () => el('lobbyAdventure').value === 'calling/' + C.weekly.id;
  // The weekly board (server/board.cjs): this week's furthest runs and fastest kills, by the party's names. The leader
  // sees it with the weekly run chosen; everyone else, who has no mode list, always.
  let board = null;
  function untilNextWeek(now = Date.now()) {
    const d = new Date(now), monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7 - (d.getUTCDay() + 6) % 7);
    const hours = Math.max(1, Math.ceil((monday - now) / 3600000));
    const days = Math.ceil(hours / 24);
    return hours < 24 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  function drawBoard() {
    const section = el('lobbyBoard'), owner = connected && self === leader;
    section.hidden = !connected || !board || owner && !weeklyChosen();
    if (section.hidden) return;
    // The leader's left column holds the modes, so the board goes under the party; a guest's left column is free.
    const home = owner ? panel.querySelector('.lobby-party') : el('lobbyWaiting');
    if (section.parentNode !== home) home.appendChild(section);
    el('lobbyBoardReset').textContent = `New run in ${untilNextWeek()}`;
    const fill = (list, rows, empty, cells) => {
      list.replaceChildren();
      if (!rows.length) { const li = document.createElement('li'); li.className = 'board-empty'; li.textContent = empty; list.appendChild(li); return; }
      for (const row of rows) {
        const li = document.createElement('li');
        for (const [text, cls] of cells(row)) { const span = document.createElement('span'); span.className = cls; span.textContent = text; if (cls === 'board-names') span.title = text; li.appendChild(span); }
        list.appendChild(li);
      }
    };
    const names = r => (Array.isArray(r.names) ? r.names : []).join(', '), seconds = n => Math.max(0, Math.round(Number(n) || 0));
    fill(el('lobbyBoardRuns'), Array.isArray(board.runs) ? board.runs : [], 'No runs yet this week.',
      r => [[`Fight ${seconds(r.reached)}`, 'board-main'], [names(r), 'board-names'], [runClock(seconds(r.time)), 'board-time']]);
    fill(el('lobbyBoardKills'), Array.isArray(board.kills) ? board.kills : [], 'No kills yet this week.',
      k => [[ArenaNet.own(ENEMY_BY_ID, k.boss)?.name || k.boss, 'board-main'], [names(k), 'board-names'], [runClock(seconds(k.time)), 'board-time']]);
  }
  function adventureSummary() {
    const value = el('lobbyAdventure').value;
    for (const button of el('lobbyModes').children) button.setAttribute('aria-pressed', String(button.dataset.mode === value));
    el('lobbyAdventureSummary').textContent = weeklyChosen() ? 'Boss Rush with this week\'s bosses, modifiers and abilities, the same for everyone.'
      : `Boss after boss until everyone falls, faster every fight. Every ${CONFIG.endless.crowned}th is Crowned.`;
  }
  // ---- the title screen's look at the lobby (v7.19.0) ------------------------------------------------------------
  // How many are inside and what they play, asked only while the title shows (CONFIG.titleLobby). A page with no lobby
  // (opened from a file, or a static host such as GitHub Pages) says so at once and asks no more; a lobby that stops
  // answering keeps being asked. state: 'checking' | 'online' | 'offline' (unreachable for now) | 'absent' (no lobby here).
  const peekState = { state: 'checking', players: 0, capacity: 0, playing: null };
  let peekTimer = null, peekBusy = false;
  const onTitle = () => Game.screen === 'main' && Game.mode === 'menu' && !connected && !starting;
  function setPeek(next) {
    const before = JSON.stringify(peekState);
    Object.assign(peekState, next);
    if (JSON.stringify(peekState) !== before && onTitle()) Game.refreshTitleLobby();
  }
  async function peek() {
    clearTimeout(peekTimer); peekTimer = null;
    if (!onTitle() || peekBusy || peekState.state === 'absent') return;
    if (!/^https?:$/.test(location.protocol)) { setPeek({ state: 'absent' }); return; }
    peekBusy = true;
    try {
      const response = await fetch('api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(CONFIG.titleLobby.timeout * 1000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) setPeek({ state: 'absent' });
      else {
        const info = await response.json();
        if (typeof versionCheck !== 'undefined') versionCheck.note(info);
        setPeek({ state: 'online', players: Math.max(0, Number(info.players) | 0), capacity: Math.max(0, Number(info.capacity) | 0),
          playing: typeof info.playing === 'string' && info.playing ? info.playing.slice(0, 80) : null });
      }
    } catch (e) { setPeek({ state: 'offline' }); }
    finally { peekBusy = false; }
    if (onTitle() && peekState.state !== 'absent') peekTimer = setTimeout(peek, CONFIG.titleLobby.interval * 1000);
  }
  function updateRoster() {
    const previousFocus = panel.contains(document.activeElement) ? document.activeElement : null, focusKey = previousFocus?.dataset.padKey;
    const owner = connected && self === leader;
    // Connected, the screen says it all (Start, the leader's mark, the waiting line): the status line is for trouble.
    if (connected) el('lobbyStatus').textContent = owner || leader ? '' : 'Use your keyboard, mouse or controller to become the leader.';
    el('lobbyLeader').hidden = !owner;
    el('lobbyResume').hidden = !active();
    el('lobbyGuestResume').hidden = !active();
    el('lobbyRunActions').hidden = !session;
    el('lobbyLiveWarning').hidden = !active();
    el('lobbyRestart').disabled = !session || !!controlPending;
    el('lobbyReturn').disabled = !session || !!controlPending;
    el('lobbyStart').disabled = !connected || !!controlPending;
    el('lobbyStart').textContent = controlPending === 'start' ? 'Starting…' : session ? 'Start a new run' : roster.length > 1 ? 'Start together' : 'Start';
    el('lobbyManage').hidden = !owner || roster.length < 2;
    if (!owner) { panel.classList.remove('managing-party'); el('lobbyManage').setAttribute('aria-expanded', 'false'); }
    // A run under way names itself in the status line above.
    el('lobbyWaiting').firstElementChild.textContent = session ? '' : `Waiting for ${roster.find(p => p.id === leader)?.name || 'the leader'} to start.`;
    updateConnection(); adventureSummary(); drawBoard(); updateLobbyPadHint();
    const signature = JSON.stringify({ roster: roster.map(p => [p.id, p.name]), self, leader, owner });
    if (signature !== rosterSignature) {
      rosterSignature = signature; el('lobbyPlayers').textContent = '';
      for (const p of roster) {
        const row = document.createElement('div'); row.className = 'lobby-player';
        row.dataset.self = String(p.id === self);
        const name = document.createElement('span'); name.className = 'lobby-player-name'; name.textContent = `${p.name}${p.id === self ? ' (you)' : ''}`; name.title = name.textContent; row.appendChild(name);
        if (p.id === leader) { const role = document.createElement('span'); role.className = 'lobby-player-role'; role.textContent = 'Leader'; row.appendChild(role); }
        const actions = document.createElement('div'); actions.className = 'lobby-player-actions'; row.appendChild(actions);
        if (owner && p.id !== self) for (const [text, action] of [['Make leader', 'transfer'], ['Remove', 'kick']]) {
          const button = document.createElement('button'); button.className = 'ui-button'; button.textContent = text;
          button.setAttribute('aria-label', `${text}: ${p.name}`);
          button.dataset.padKey = action + '/' + p.id;
          button.onclick = () => control(action, { player: p.id }); actions.appendChild(button);
        }
        el('lobbyPlayers').appendChild(row);
      }
    }
    updateStatus();
    if (!panel.classList.contains('hidden') && (usingPad() || previousFocus && (!previousFocus.isConnected || !previousFocus.offsetParent || previousFocus.disabled))) {
      const restored = focusKey && lobbyControls().find(node => node.dataset.padKey === focusKey);
      focusLobbyControl(restored || ensureLobbyFocus());
    }
  }
  function updateStatus() {
    const levelTag = session?.gauntlet ? `${session.gauntlet.name} · Fight ${session.gauntlet.number}` : '';
    for (const id of ['onlineCurrentLevel', 'lobbyCurrentLevel']) {
      const tag = el(id);
      tag.hidden = !connected || !levelTag;
      tag.textContent = levelTag;
    }
    updateAlivePanel();
    party.classList.toggle('hidden', !active()); updateConnection(); overlayVisibility();
  }
  function receive(msg) {
    if (msg.type === 'welcome') {
      connected = true; starting = false; reconnectAttempt = 0; needsReload = false; self = msg.id; leader = msg.leader; roster = msg.players; catalog = msg.catalog; capacity = msg.capacity;
      board = msg.board && typeof msg.board === 'object' ? msg.board : null;
      if (!solo) { resumeToken = typeof msg.token === 'string' ? msg.token : ''; try { localStorage.setItem('combatArena.onlineToken', resumeToken); } catch {} }
      // A rename made while this was connecting went out with nothing to carry it: send it now.
      const name = progress.name;
      if (name && name !== roster.find(p => p.id === self)?.name) send({ type: 'name', name });
      activityPending = false; lastActivitySent = -Infinity; heldActivity.clear();
      const select = el('lobbyAdventure'); select.textContent = '';
      // The leader's Mode: Boss Rush (the lobby's default) or the weekly run; online play has no other.
      const titled = name => name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const modes = [{ kind: 'calling', id: C.calling.id, name: titled(C.calling.name) }, { kind: 'calling', id: C.weekly.id, name: titled(C.weekly.name) }];
      el('lobbyModes').textContent = '';
      for (const entry of modes) {
        const option = document.createElement('option'); option.value = `${entry.kind}/${entry.id}`; option.textContent = entry.name; select.appendChild(option);
        // The visible list: one row per mode, mirroring the select.
        const row = document.createElement('button'); row.type = 'button'; row.className = 'ui-row'; row.textContent = entry.name;
        row.dataset.mode = option.value; row.dataset.padKey = 'mode/' + option.value;
        row.onclick = () => { if (select.value !== option.value) { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); } };
        el('lobbyModes').appendChild(row);
      }
      select.value = `calling/${C.calling.id}`;
      el('lobbyStatus').textContent = ''; updateRoster();
      if (!panel.classList.contains('hidden')) focusLobbyControl(ensureLobbyFocus(true));   // joined: focus moves from Leave to Start
      if (solo) control('start', { kind: 'calling', id: C.calling.id });
      else if (Array.isArray(msg.results)) {
        const showLast = msg.session ? null : msg.results.at(-1);
        for (const result of msg.results) {
          if (result === showLast) showRunSummary(result);
          else settleRunResult(result);
        }
      }
    } else if (msg.type === 'runResult') {
      if (msg.summary) settleRunResult(msg.summary);
    } else if (msg.type === 'board') {
      board = msg.board && typeof msg.board === 'object' ? msg.board : null; drawBoard();
    } else if (msg.type === 'roster') {
      roster = msg.players; leader = msg.leader; updateRoster(); drawRunSummary();
      if (msg.notice && roster.length > 1) notice(msg.notice, true);
    } else if (msg.type === 'start') {
      clearControlPending(); notice(''); crateScreen.close();   // a fight starting takes over from the Collection or a roll
      const tipsRemaining = session && !msg.opening ? hud.controlsTipsTimer : CONFIG.hud.controlsTipsTime;
      session = msg.session; loaded = false; seq = 0; resetStream(); clearRemotes(); closeAbilities();
      const current = session;
      Game.story = false; closePanel();
      const loadingCard = Game.duelCard(session.id, session.partners || []);
      el('lobbyAdventure').value = `calling/${session.gauntlet.id}`;
      const begin = () => {
        if (session !== current || !connected) return;
        if (Game.pendingLoad) { deferredStart = begin; return; }
        const build = () => {
          if (session !== current || !connected) return;
          Game.startFight(session.id, session.partners || []);
          Game.spawn = { ...session.spawn }; Game.spawnPlayer(); Game.player.grantAbilities(session.abilities?.[self]); restorePlayer(msg.resume);
          hud.controlsTipsTimer = tipsRemaining;
          for (const e of Game.enemies) e.netId = e.key || 'duel/' + e.baseDef.id;
          for (const e of Game.enemies) {   // Boss Rush: the server's bars, each boss's share of its own (rushHealth)
            const k = e.isBoss() && session.health && Object.hasOwn(session.health, e.baseDef.id) ? Number(session.health[e.baseDef.id]) : 1;
            if (k > 0 && k < 1) e.setHealth(k);
          }
          loaded = true; updateRoster();
        };
        // Boss Rush's next boss drops straight in (v7.69.0): the arena is rebuilt at once, with no loading card.
        if (session.drop && Game.mode === 'play') { build(); Game.loading = 0; el('loading').classList.remove('show'); }
        else Game.loadingFirst(...loadingCard, build);
      };
      begin();
    } else if (msg.type === 'stop') {
      clearControlPending();
      session = null; loaded = false; resetStream(); clearRemotes(); closeAbilities(); Game.loading = 0; el('loading').classList.remove('show');
      if (Game.player) Game.clearActors(); Game.showMenu('main');
      if (solo) { if (msg.summary) showRunSummary(msg.summary); else leave(msg.reason === 'error' ? ALONE_FAILED : ''); return; }
      show(); notice(msg.message || 'The leader returned everyone to the lobby.');
      if (msg.summary) showRunSummary(msg.summary);
    } else if (msg.type === 'frame' && active() && ready && msg.frame.epoch === session.epoch) {
      const packet = decoder.decode(msg), frame = packet.frame;
      if (latestFrame && frame.time <= latestFrame.time) return;
      latestFrame = frame; receivedFrames++; updateRemotes(packet.players || []); updateAlivePanel();
      for (const s of frame.enemies) {
        let track = tracks.get(s.id);
        if (!track) {
          track = new ArenaNet.EnemyTrack(); tracks.set(s.id, track);
          if (s.attack && [ES.WINDUP, ES.ACTIVE].includes(s.state)) {
            const e = Game.enemies.find(e => e.netId === s.id); if (e) e.netJoinSerial = s.serial;
          }
        }
        track.push({ time: frame.time, value: s, events: frame.events.filter(d => d.enemy === s.id), shots: frame.shots.filter(d => d.enemy === s.id) });
        if (track.samples.length > C.maxHistory || frame.time - track.time > C.historySeconds) {
          // A stall left this enemy seconds behind: show it where it is now. An attack already under way when it
          // reappears never lands on this player, as when joining mid-swing (pass 52: this used to reconnect).
          const latest = track.catchUp().value;
          const e = Game.enemies.find(e => e.netId === s.id);
          if (e && latest.attack && [ES.WINDUP, ES.ACTIVE].includes(latest.state)) e.netJoinSerial = latest.serial;
        }
      }
      for (const d of frame.events) if (d.type === 'abilityPower' && d.enemy == null) presentAbility(d, null);
      else if (d.type === 'revive') presentRevive(d);
      else if (d.type === 'finisher' && d.player === self) startFinisher(d.enemy);   // pass 100: the server granted this player's Finishing Blow
      else if (d.type === 'opened' && d.player === self) {   // this player's blow broke a stance or a wind-up: a counter (as solo)
        const e = Game.enemies.find(e => e.netId === d.enemy);
        if (e && Game.player.alive()) Game.player.openCounter(CONFIG.parry.riposteTime, 'break', e);
      }
      // Each ember with its cue lines made here, once per frame from the server, not in the drawing (js/revive.js).
      embers = (frame.embers || []).map(m => ({ ...m, saved: m.by ? `${nameOf(m.by)} is reviving you` : '',
        reviving: `Reviving ${nameOf(m.id)}`, standIn: `Stand in the ring to revive ${nameOf(m.id)}` }));
      rescuer = embers.find(m => m.id === self)?.by || null;
      revive.set(embers, self);
      applyProgress(frame);
    } else if (msg.type === 'revive') riseAgain(msg);
    else if (msg.type === 'abilitiesChosen' && session) { if (ability) { ability.done = true; drawAbilities(); } }   // everyone has chosen: the hold
    // The free pick before fight 1 is over (CONFIG.abilities.first): this body takes its kit, the par follows it, and the boss wakes.
    else if (msg.type === 'firstPick' && session) {
      if (msg.abilities && typeof msg.abilities === 'object') session.abilities = msg.abilities;   // a body still loading builds with it
      session.par = Number(msg.par) || session.par;
      if (Game.player && loaded) Game.player.grantAbilities(session.abilities?.[self]);
      closeAbilities();
    }
    else if (msg.type === 'abilities' && session) openAbilities(msg);   // also while loading back in: shown once loaded
    else if (msg.type === 'pong') { ping = Math.max(0, Math.round(performance.now() - msg.sent)); updateConnection(); }
    else if (msg.type === 'error') {
      if (solo && !session) { leave(msg.message); return; }   // alone, a run that cannot start goes back to the title
      clearControlPending(); updateRoster(); notice(msg.message);
    }
  }
  // Revive (CONFIG.revive): a teammate stood on this player's ember long enough (the server decided it). Up again where
  // they fell, with the bar the server gave and a moment untouchable; the next pose, sent at once, tells the server.
  const nameOf = id => id === self ? 'you' : roster.find(p => p.id === id)?.name || remotes.get(id)?.samples.at(-1)?.name || 'A friend';
  function riseAgain(msg) {
    const p = Game.player;
    if (!active() || msg.epoch !== session.epoch || !session.teamWipeOnly || !p || p.alive() || !(msg.hp > 0)) return;
    p.hp = Math.min(p.maxHp, msg.hp); p.lastHp = p.hp; p.execGrace = CONFIG.revive.grace;
    p.vx = p.vz = 0; p.setState(p.grounded ? PS.IDLE : PS.FALL);
    Game.deathOf = null; Game.deathTimer = 0; Game.hitstop = 0; canvas.classList.remove('dying');
    Game.cam.yaw = p.yaw; Game.updateCamera(0, true); input.clear();
    lastPose = 0;
  }
  // Everyone sees a rise: a burst of embers where the ember was, the sound, and a line saying who brought whom back.
  function presentRevive(d) {
    const m = embers.find(m => m.id === d.player), body = d.player === self ? Game.player : remotes.get(d.player)?.samples.at(-1);
    const at = m || body;
    if (at) revive.burst(at.x, at.y, at.z);
    events.emit('revive', { x: at?.x ?? 0, y: at?.y ?? 0, z: at?.z ?? 0, self: d.player === self || d.by === self });
    const who = nameOf(d.by), whom = nameOf(d.player);
    hud.toast(d.by === self ? `You revived ${whom}` : `${who} revived ${whom}`);
  }
  // Reconnect is the only time personal resources come back from the server. Ordinary frames never reconcile them.
  // Resume at the saved position without replaying an old attack, roll, flask or execution animation.
  function restorePlayer(s) {
    if (!s || !['x', 'y', 'z', 'yaw', 'hp', 'flasks'].every(key => ArenaNet.finite(s[key]))) return;
    const p = Game.player;
    for (const key of ['x', 'y', 'z', 'yaw']) p[key] = s[key];
    p.hp = clamp(s.hp, 0, p.maxHp);
    p.item('flask').count = clamp(Math.floor(s.flasks), 0, p.item('flask').max);
    for (const key of ['doomTime', 'doomDrain']) if (ArenaNet.finite(s[key]) && s[key] >= 0) p[key] = s[key];
    p.grounded = !!s.grounded; p.peak = p.y; p.lastHp = p.hp;   // no health lost by coming back
    for (const key of ['vx', 'vy', 'vz']) p[key] = !p.grounded && ArenaNet.finite(s[key]) ? s[key] : 0;
    p.setState(p.hp <= 0 || s.state === PS.DEAD ? PS.DEAD : p.grounded ? PS.IDLE : PS.FALL);
    p.savePrev(); Game.deathTimer = 0; Game.cam.yaw = p.yaw; Game.updateCamera(0, true);
  }
  function capturePose(p) {
    return { ...ArenaNet.bodyPose(p),
      flasks: p.item('flask').count, doomTime: p.doomTime, doomDrain: p.doomDrain,
      view: session.teamWipeOnly && p.alive() ? lastView : null };
  }
  function heartbeat(now) {
    overlayVisibility();
    if (!connected) return;
    // A stray return to the title must not strand a connected player while the
    // server continues the shared run. Reload from its current session/baseline.
    if (session && loaded && Game.mode === 'menu' && Game.screen === 'main') {
      receive({ type: 'start', session, resume: capturePose(Game.player) }); return;
    }
    if (heldActivity.size && document.visibilityState !== 'hidden') activityPending = true;
    flushActivity(now);
    if (deferredStart && !Game.pendingLoad) { const start = deferredStart; deferredStart = null; start(); }
    if (active() && !ready && Game.loading <= 0) {
      ready = true; send({ type: 'ready', epoch: session.epoch });
    }
    if (active() && ready && now >= lastPose) {
      const interval = 1000 / C.playerRate;
      lastPose = lastPose && lastPose + interval > now ? lastPose + interval : now + interval;
      publishPose();
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
        r = { body, label, name, health, samples: [], look: undefined }; remotes.set(s.id, r);
      }
      if (looksOf !== roster) { looksOf = roster; looks = new Map(roster.map(p => [p.id, p.look])); }
      const look = looks.get(s.id);   // the blade look their crates gave them
      if (r.look !== look) { r.look = look; crateScreen.wearLook(r.body.rig, look); }
      if (r.poseSeq !== s.poseSeq) { r.samples.push({ ...s, view: ArenaNet.cameraView(s.view), at: performance.now() / 1000 }); r.poseSeq = s.poseSeq; }
      while (r.samples.length > C.maxHistory) r.samples.shift();
      r.name.textContent = s.name + (s.hp <= 0 ? ' · defeated' : '');
      updateAllyHealth(r.health, s.hp, s.name);
    }
    for (const [id, r] of remotes) if (!ids.has(id)) { r.body.rig.dispose(); r.label.remove(); remotes.delete(id); }
  }
  function sampleEnemies(dt) {
    // These effects are client-local, including during execution holds or stream gaps.
    for (const e of Game.enemies) e.updateFeedback(dt);
    if (!latestFrame) return;
    let oldest = latestFrame.time;
    for (const [id, track] of tracks) {
      const view = track.advance(dt), e = Game.enemies.find(e => e.netId === id);
      if (!view || !e) continue;
      const { a, b, time, alpha } = view, s = a.value, q = b.value;
      oldest = Math.min(oldest, time);
      track.pendingEvents = (track.pendingEvents || []).concat(view.crossed);
      // Advance the stream while holding the victim locally; its death/phase
      // still cannot appear before this player's Finishing Blow ends.
      if (Game.player.exec?.enemy === e) { e.stateTime += dt; continue; }
      netView.enemy(e, s, q, alpha, time - a.time, viewCtx);   // js/net-view.js, shared with the replay viewer
      for (const sample of track.pendingEvents) presentEvents(sample);
      track.pendingEvents = [];
    }
    playback = oldest;
  }
  // The fight's end is authoritative and immediate; it never waits behind an enemy's personal presentation clock.
  function applyProgress(frame) {
    if (frame.complete && !Game.complete) { Game.complete = true; updateRoster(); }
  }
  // A legendary, anyone's (js/ability-fx.js draws it): one on an enemy comes with that enemy's sample, one on none (a
  // Meteor's blast, a Blood Moon) as its frame arrives. The Blood Moon's own part, its drink, is this body's.
  function presentAbility(d, e) { netView.ability(d, e, viewCtx); }
  function presentEvents(sample) { netView.events(sample, viewCtx); }
  // Whose body an id names, for the shared drawing (js/net-view.js).
  const viewCtx = { get self() { return self; }, bodyOf: id => id === self ? Game.player : remotes.get(id)?.body || null };

  function update(dt) {
    const p = Game.player, c = Game.cam;
    p.savePrev(); for (const e of Game.enemies) e.savePrev(); c.prevPos.copy(c.pos); c.prevLook.copy(c.look);
    sampleEnemies(dt);
    // 'ending' mode: the shared stream still steps, the player's own movement and combat do not. The endings no longer
    // set it (pass 82: they play over the world); tests use it to run this update with the player held still.
    if (Game.mode === 'ending') return;
    if (!p.alive()) {
      Game.deathTimer += dt;   // the fallen watch (or are revived) until the fight ends: no respawn online
      p.update(dt, { x: 0, z: 0, has: false }, [], null);
    } else if (Game.hitstop > 0) { Game.hitstop = Math.max(0, Game.hitstop - dt); input.hold(dt); }
    else {
      if (Game.mode === 'play') Game.updateLock(dt);
      p.update(dt, Game.mode === 'play' ? Game.moveInput() : { x: 0, z: 0, has: false }, Game.enemies.filter(e => e.alive()), Game.lock);
      // The server owns enemy positions. Other players have no body blocking.
      for (const e of Game.enemies) if (e.state !== ES.EXECUTED) separatePair(p, e, 1);
      resolveCombat(Game);
    }
    projectiles.update(Game, dt);
    burnInFires(Game, dt, Game.player);   // the fires the server's enemies left (laid here from their strikes, Enemy.noteFires)
    Game.updateCamera(dt, false);
    // One death sequence per body, whatever killed it (a blow, rot, a script): as Game.update does.
    if (!Game.player.alive() && Game.deathOf !== Game.player) Game.onPlayerDeath();
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
      netView.body(p, a, b, f, now - a.at);   // js/net-view.js, shared with the replay viewer
      const focus = remotes.get(spectatorTarget)?.body || game.player;
      const visible = Math.hypot(p.x - focus.x, p.z - focus.z) < C.remoteRange;
      p.rig.root.visible = p.rig.shadow.visible = visible;
      if (!visible) { r.label.hidden = true; continue; }
      p.rig.place(p.x, p.y, p.z, p.yaw, world.groundAt(p.x, p.z, p.y + 0.05));
      p.pose(p.stateTime, { t: performance.now() / 1000, dt: CONFIG.step, yaw: p.yaw, px: game.player.x, pz: game.player.z });
      placed.push([p, { x: p.x, y: p.y, z: p.z, yaw: p.yaw }]);
      const v = labelPosition.set(p.x, p.y + p.height, p.z).project(camera);
      r.label.hidden = p.hp <= 0 || r === remotes.get(spectatorTarget) || Game.mode !== 'play' || Game.loading > 0 || v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      r.label.style.left = `${(v.x + 1) * innerWidth / 2}px`; r.label.style.top = `${(1 - v.y) * innerHeight / 2}px`;
    }
  }
  function hit(e, strike) {
    const hb = Game.player.hitbox;
    if (!hitIds.has(hb)) hitIds.set(hb, String(++swing));
    command('hit', { enemy: e.netId, attack: strike.attackId, swing: hitIds.get(hb), charge: strike.charge || 0, riposte: strike.riposte });
    e.tint = 1; e.recoil = 1;
    const counter = e.counterAgainst(Game.player, strike.attackId);   // a counter stance turns it, or a breaker breaks it open (pass 55)
    const blocked = (e.guarding() && isInFront(e, Game.player.x, Game.player.z)) || counter === 'turn';
    if (!blocked && strike.riposte && strike.attackId === PLAYER_DEF.moveset.counter.light) {
      // Health is client-owned: stop the struck string immediately, as on a last-hit deflect, while the claim travels.
      const known = e.learned.length;
      e.getParried(); e.parriedFor = CONFIG.parry.counterReel;
      e.netCounterSerial = e.netSerial;
      e.netCounterUntil = performance.now() / 1000 + CONFIG.parry.counterReel + C.interpolation;
      e.learned.length = known;
    }
    return { blocked, opened: counter === 'break', died: false };
  }
  // A deflect (pass 85): the blow's index goes too, so the server knows a string's last blow (which opens the foe) from
  // an earlier one (only turned aside, the string goes on). Returns { opened } like Enemy.getDeflected.
  function parry(e) {
    const hit = e.hitIndex || 0, last = !!e.attack && hit === e.attack.hits.length - 1;
    command('parry', { enemy: e.netId, serial: e.netSerial, hit });
    const known = e.learned.length, res = e.getDeflected();
    if (last) e.netParried = e.netSerial;   // only the last blow opens it on the server too
    e.learned.length = known;   // what it learns from the parry is the server's to say (pass 77): its next frame brings it
    return res;
  }
  // A perfect dodge (pass 85): the server marks it, so the counter's riposte that follows is allowed.
  function dodged(e) { publishPose(); command('dodged', { enemy: e.netId, serial: e.netSerial }); }   // the dash pose goes first
  function lifesteal(e) { command('lifesteal', { enemy: e.netId, serial: e.netSerial, hitIndex: e.hitIndex }); }
  function landed(e) { command('landed', { enemy: e.netId, serial: e.netSerial, hitIndex: e.hitIndex }); }   // pass 77: an attack it would learn struck me
  // An ability's trigger only this browser sees (ABILITY_CLAIMS, js/abilities.js): the server checks it and fires.
  // The pose that shows it (drinking, landing, rolling, this low) goes first: the server waits only C.claimWait s for
  // it, and a slow frame after a drink used to let that run out, so the Ember Twin never came (pass 83).
  function abilityClaim(when, ctx) {
    if (!ABILITY_CLAIMS.includes(when)) return;   // a parry or a landed heavy: the server sees those itself
    publishPose();
    command('ability', { when, ...(ctx.enemy ? { enemy: ctx.enemy.netId, serial: ctx.enemy.netSerial } : {}), ...(ctx.action ? { action: ctx.action } : {}),
      ...(ctx.key ? { key: ctx.key } : {}) });   // a number key's press: the server checks its charge and aims it
  }
  // The server granted this player's Finishing Blow on enemy `id` (Simulation.hit): run it here (js/finisher.js).
  function startFinisher(id) {
    const e = Game.enemies.find(e => e.netId === id), p = Game.player;
    if (!e || !p.alive() || p.exec) { if (e) command('finisherEnd', { enemy: id }); return; }   // nothing to run it: let the server end it
    grantedEnemy = id; finisher.start(p, e); grantedEnemy = null;
    if (!p.exec) command('finisherEnd', { enemy: id });
  }
  el('lobbyLeave').onclick = () => leave(); el('lobbyResume').onclick = hide;
  el('lobbyTutorial').onclick = () => { leave(); sparring.start({ then: () => join() }); };   // the sparring scene, then back into the lobby (js/sparring.js)
  el('lobbyGuestResume').onclick = hide;
  el('lobbyRetry').onclick = () => needsReload ? location.reload() : join();
  el('lobbyPrivate').onclick = () => { leave(); playAlone(); };
  el('lobbyAdventure').onchange = () => updateRoster();   // the row's click already sounds
  el('lobbyManage').onclick = () => {
    const open = panel.classList.toggle('managing-party'); el('lobbyManage').setAttribute('aria-expanded', String(open));
    if (open) el('lobbyPlayers').scrollTop = 0;
  };
  el('lobbyHelp').onclick = () => toggleLobbyHelp();
  el('lobbyControlsClose').onclick = () => toggleLobbyHelp(false);
  el('lobbyOptions').onclick = () => { closePanel(); Game.optionsFrom = 'lobby'; Game.showMenu('options'); };
  el('lobbyCollection').onclick = () => crateScreen.collection();
  // What this browser's crates gave it (js/progress.js): the server shows the look to the others and offers the
  // crate abilities in Boss Rush. Sent with hello, and again whenever it changes in the lobby.
  const gear = () => ({ look: progress.look, crates: progress.abilities() });
  // The name lives with the save too (js/name-ask.js): a change made in Options while online reaches the party at once.
  progress.onChange(() => {
    if (!connected) return;
    send({ type: 'gear', ...gear() });
    if (progress.name && progress.name !== roster.find(p => p.id === self)?.name) send({ type: 'name', name: progress.name });
  });
  // Native keyboard focus stays inside the dialog, and the arrow keys move like the controller. Roster refreshes retain
  // the same controls, so a teammate joining never interrupts a selection.
  const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  window.addEventListener('keydown', ev => {
    if (panel.classList.contains('hidden') || panel.inert) return;
    input.use('keyboard');   // announces 'device', which redraws the hints
    if (ARROWS[ev.code] && document.activeElement?.tagName !== 'INPUT' && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault(); lobbyMove(ARROWS[ev.code]); return;
    }
    if (ev.code !== 'Tab') return;
    const controls = lobbyControls(), at = controls.indexOf(document.activeElement);
    ev.preventDefault();
    const next = at < 0 ? ev.shiftKey ? controls.length - 1 : 0 : (at + (ev.shiftKey ? -1 : 1) + controls.length) % controls.length;
    focusLobbyControl(controls[next]);
  }, true);
  panel.addEventListener('focusin', ev => {
    // One ring at a time: a mouse click moves focus without going through focusLobbyControl.
    for (const node of panel.querySelectorAll('.pad-selected')) if (node !== ev.target) node.classList.remove('pad-selected');
    if (ev.target.matches('button,input,select')) events.emit('menuMove'); });
  panel.addEventListener('click', ev => {
    const button = ev.target.closest('button');
    if (button && !button.disabled && !['lobbyResume', 'lobbyGuestResume'].includes(button.id)) events.emit(button.id === 'lobbyLeave' ? 'menuBack' : 'menuConfirm');
  });
  el('lobbyStart').onclick = () => { const value = el('lobbyAdventure').value, slash = value.indexOf('/'); control('start', { kind: value.slice(0, slash), id: value.slice(slash + 1) }); };
  el('lobbyRestart').onclick = () => control('restart'); el('lobbyReturn').onclick = () => control('lobby');
  function lobbyMove(direction) {
    const focus = ensureLobbyFocus(), controls = lobbyControls();
    if (!focus) return;
    const current = controls.indexOf(focus), step = direction === 'up' || direction === 'left' ? -1 : 1;
    focusLobbyControl(controls[(current + step + controls.length) % controls.length]);
  }
  function pad(pressed, dt = CONFIG.step) {
    if (summaryPad(pressed)) return;
    const focus = ensureLobbyFocus();
    if (pressed.includes('PadB')) { lobbyBack(); return; }
    if (pressed.includes('PadStart') && active()) { hide(); return; }
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
      if (current?.tagName === 'BUTTON') current.click();
    }
  }
  events.on('finisherEnd', d => { if (active() && d.player === Game.player) command('finisherEnd', { enemy: d.enemy.netId }); });
  Game.renderHooks.push(render);
  return { join, playAlone, restart: () => control('restart'), leave, show, hide, active, peek, heartbeat, activity, update, hit, parry, dodged, lifesteal, landed, pad,
    applySpectatorView, captureView, spectatorKey, spectatorPad, lobbyBack, abilityPad, abilityClaim,
    get abilityOpen() { return !abilityScreen.hidden; }, get abilityPending() { return !!ability; },
    get lobby() { return { ...peekState }; },
    get waitingForTeamWipe() { return waitingForTeamWipe(); },
    get spectatorMode() { return waitingForTeamWipe(); },
    get runIntroActive() { return false; },
    get spectating() { return waitingForTeamWipe() && !!spectatorTarget; },
    get listener() { if (typeof replayView !== 'undefined' && replayView.active) return replayView.listener; return waitingForTeamWipe() ? remotes.get(spectatorTarget)?.body || Game.player : Game.player; },
    get gauntlet() { return connected ? session?.gauntlet || null : null; },
    // Boss Rush's fight (v7.69.0): its number, its clock (the server's, s) and its par.
    // One object, refilled: the HUD reads it every frame.
    get rush() {
      const g = connected && loaded ? session?.gauntlet : null;
      if (!g?.run) return null;
      rushView.fight = g.number;
      rushView.crowned = !!g.crowned; rushView.modifiers = Array.isArray(g.modifiers) ? g.modifiers : noModifiers;
      rushView.clock = latestFrame?.fought || 0; rushView.par = session.par || 0;
      return rushView;
    },
    get connected() { return connected; }, get alone() { return solo; }, get grantedEnemy() { return grantedEnemy; }, get panelOpen() { return !panel.classList.contains('hidden'); },
    get info() { return { self, leader, connected, ready, session, players: roster, ping, playback, spectatorTarget,
      frames: Math.max(0, ...[...tracks.values()].map(t => t.samples.length)), receivedFrames, remotes: remotes.size,
      playbackDelayMs: latestFrame && playback !== null ? Math.max(0, (latestFrame.time - playback) * 1000) : 0, server: latestFrame?.server }; },
  };
})();
