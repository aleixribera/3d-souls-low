'use strict';
// Opt-in co-op. Solo play never opens a socket or changes simulation authority.
CONFIG.multiplayer = ArenaNet.config;
const multiplayer = (() => {
  const C = CONFIG.multiplayer;
  let socket = null, self = null, leader = null, catalog = null, session = null, connected = false, capacity = C.defaultCapacity;
  let loaded = false, ready = false, starting = false, seq = 0, swing = 0, playback = null, ping = null;
  let embers = [], rescuer = null;   // the latest frame's revive embers (js/revive.js draws them), and who is reviving this player
  let remotes = new Map(), roster = [], lastPose = 0, lastPing = 0, pendingExecution = null;
  let intentionalClose = false, grantedEnemy = null, deferredStart = null, latestFrame = null, receivedFrames = 0, lastStats = 0;
  let reconnectWanted = false, reconnectTimer = null, reconnectAttempt = 0, joinAttempt = 0;
  const rushView = { fight: 0, beaten: 0, clock: 0, par: 0, crowned: false, modifiers: [] };   // what `multiplayer.rush` hands the HUD
  const noModifiers = Object.freeze([]);
  let spectatorTarget = null, spectatorBarOpen = true, spectatorWasWaiting = false, spectatorViewApplied = false, lastView = null;
  let lobbyPadDirection = null, lobbyPadTimer = 0, nameDraft = '', nameLowercase = false;
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
    <div id="lobbyRunActions" class="lobby-actions" role="group" aria-label="Party controls" hidden><button id="lobbyRestart" class="ui-button">Restart level</button>
    <button id="lobbyNext" class="ui-button">Next level</button><button id="lobbyReturn" class="ui-button">Return everyone to lobby</button></div></div>
    <div id="lobbyWaiting"><p class="lobby-waiting-text"></p><button id="lobbyGuestResume" class="ui-primary"><span class="ui-key" aria-hidden="true"></span>Return to game</button></div>
    <button id="lobbyRetry" class="ui-primary" hidden>Try again</button>
    </section><section class="lobby-party" aria-labelledby="lobbyPartyTitle">
    <div class="lobby-section-title"><h2 id="lobbyPartyTitle">Party</h2><span id="lobbyCount"></span></div>
    <label for="lobbyName" class="ui-label">Your name</label><input id="lobbyName" maxlength="24" autocomplete="nickname" placeholder="Your name" spellcheck="false">
    <section id="lobbyNameEditor" class="lobby-name-editor" aria-label="Edit your name" hidden>
      <output id="lobbyNamePreview" aria-live="polite"></output><div id="lobbyNameKeys"></div></section>
    <div id="lobbyPlayers" aria-label="Players"></div>
    <div class="lobby-party-actions"><button id="lobbyManage" class="ui-text-button" aria-expanded="false" aria-controls="lobbyPlayers" hidden>Manage party</button></div>
    </section></div>
    <footer class="lobby-footer"><div class="lobby-footer-actions"><button id="lobbyLeave" class="ui-text-button"><span class="ui-key" aria-hidden="true"></span><span>Leave lobby</span></button>
    <button id="lobbyHelp" class="ui-text-button" aria-expanded="false" aria-controls="lobbyControls">Controls</button>
    <button id="lobbyOptions" class="ui-text-button">Options</button></div><p id="lobbyPadHint" class="ui-hints"></p></footer>
    <section id="lobbyControls" class="lobby-controls" aria-labelledby="lobbyControlsTitle" hidden><div class="lobby-controls-head"><h2 id="lobbyControlsTitle">Controls</h2>
    <button id="lobbyControlsClose" class="ui-text-button"><span class="ui-key" aria-hidden="true"></span>Close</button></div>
    <dl id="lobbyControlsList"></dl>
    <p class="lobby-controls-tip">Attacks, rolls and blocking use stamina. Ease off to let it refill. Talk / read: <span id="lobbyTalkKey"></span>.</p></section>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `#publicLobby,#onlineParty,#onlineLeaderboard,#onlineSpectator,.online-name{--mp-gold:#dcbb74;--mp-gold-hi:#f3dca3;--mp-ink:#ece4d1;--mp-muted:#a9a798;--mp-faint:#7f7d72;--mp-line:#c9a96a2e;--mp-line-hi:#c9a96a66;--mp-panel:#14181af2;--mp-well:#0a0d0fb3;--mp-good:#a9cf8e;--mp-bad:#d89383}
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
    #publicLobby #lobbyRetry{margin-top:16px}
    #publicLobby .online-level{margin:0 0 14px;color:var(--ui-accent-hi);font:600 var(--ui-size-text)/1.4 var(--ui-text);letter-spacing:0;text-transform:none}
    #publicLobby .lobby-section-title{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:16px}
    #publicLobby .lobby-section-title h2{font:400 var(--ui-size-head)/1.2 var(--ui-display);color:var(--ui-ink)}
    #lobbyCount{font:var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-muted);font-variant-numeric:tabular-nums}
    #publicLobby input{display:block;width:100%;min-height:44px;padding:0 12px;background:var(--ui-well);color:var(--ui-ink);border:1px solid var(--ui-line);border-radius:2px;font:400 17px var(--ui-display)}
    #publicLobby input:hover{border-color:var(--ui-line-hi)}
    #publicLobby input:focus-visible,#publicLobby input.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;border-color:var(--ui-accent)}
    #publicLobby input:disabled{opacity:.5}
    #lobbyPlayers{max-height:min(320px,40vh);overflow:auto;scrollbar-width:thin;scrollbar-color:#6b5c3f transparent;margin:18px 0 0;border-top:1px solid var(--ui-line)}
    #publicLobby .lobby-player{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;min-height:46px;padding:6px 4px 6px 13px;border-bottom:1px solid var(--ui-line);border-left:3px solid transparent}
    #publicLobby .lobby-player[data-self=true]{border-left-color:var(--ui-accent)}
    #publicLobby .lobby-player-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 18px/1.3 var(--ui-display)}
    #publicLobby .lobby-player-role{font:600 var(--ui-size-hint)/1 var(--ui-text);color:var(--ui-accent)}
    #publicLobby .lobby-player button{min-height:34px;padding:0 10px;font-size:var(--ui-size-hint)}
    #publicLobby .lobby-player-actions{display:none;flex-basis:100%;gap:6px}#publicLobby.managing-party .lobby-player-actions{display:flex}
    #publicLobby .lobby-party-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin-top:12px}
    #publicLobby .lobby-hint{margin:10px 0 0;font:var(--ui-size-hint)/1.5 var(--ui-text);color:var(--ui-muted)}
    #publicLobby #lobbyLiveWarning{margin:0 0 14px}
    #publicLobby .lobby-footer{grid-area:foot;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 24px;margin-top:max(20px,3vh);padding-top:12px;border-top:1px solid var(--ui-line)}
    #publicLobby .lobby-footer-actions{display:flex;flex-wrap:wrap;gap:4px;margin-left:-10px}
    #lobbyPadHint:empty{display:none}
    #publicLobby .lobby-name-editor{margin:12px 0;padding:14px;border:1px solid var(--ui-line-hi);background:var(--ui-panel)}
    #lobbyNamePreview{display:block;min-height:1.5em;padding:10px 12px;margin-bottom:12px;background:var(--ui-well);color:var(--ui-ink);font:400 19px var(--ui-display);white-space:pre-wrap;overflow-wrap:anywhere}
    #lobbyNameKeys{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px}
    #publicLobby #lobbyNameKeys button{min-height:40px;padding:0;font:500 15px var(--ui-text);color:var(--ui-ink);background:#ffffff08;border:1px solid var(--ui-line);border-radius:2px;cursor:pointer}
    #publicLobby #lobbyNameKeys button:hover{background:var(--ui-hover)}
    #publicLobby #lobbyNameKeys button:focus-visible,#publicLobby #lobbyNameKeys button.pad-selected{outline:1px solid var(--ui-accent);outline-offset:-1px;background:#d9b56b33}
    #publicLobby #lobbyNameKeys .name-action{grid-column:span 2;font-size:var(--ui-size-hint)}
    #publicLobby.editing-name .lobby-adventure{display:none}#publicLobby.editing-name .lobby-party{grid-column:1/-1;max-width:640px}
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
    #onlinePartyDetails{color:var(--mp-muted);font-size:10px;letter-spacing:.04em}#onlinePartyDetails:empty{display:none}
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
  const leaderboard = document.createElement('section'); leaderboard.id = 'onlineLeaderboard'; leaderboard.hidden = true;
  leaderboard.setAttribute('aria-labelledby', 'leaderboardTitle');
  leaderboard.setAttribute('aria-live', 'polite');
  leaderboard.innerHTML = '<div class="results-card"><p class="results-kicker">VICTORY · PARTY RESULTS</p><h2 id="leaderboardTitle">Damage leaderboard</h2><p id="leaderboardEncounter"></p><div class="results-scroll"><table><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Total damage</th></tr></thead><tbody id="leaderboardRows"></tbody></table></div></div>';
  document.body.appendChild(leaderboard);
  const resultsStyle = document.createElement('style');
  resultsStyle.textContent = `#onlineLeaderboard[hidden]{display:none}
    #onlineLeaderboard{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:18px;box-sizing:border-box;pointer-events:none;background:radial-gradient(ellipse,#080b0dcc,transparent 80%);color:var(--mp-ink);font:14px/1.5 system-ui}
    #onlineLeaderboard .results-card{position:relative;width:min(560px,100%);max-height:76dvh;box-sizing:border-box;padding:26px 26px 20px;text-align:center;background:linear-gradient(160deg,#21231ff7,#0d1315f7);border:1px solid var(--mp-line-hi);border-radius:10px;box-shadow:0 22px 80px #000b;animation:lobby-arrive .3s ease-out}
    #onlineLeaderboard .results-card:before{content:'';position:absolute;left:26px;right:26px;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--mp-gold),transparent)}
    #onlineLeaderboard h2{margin:6px 0 4px;font:400 clamp(24px,4vw,32px)/1.25 Georgia,serif;color:var(--mp-gold-hi)}
    #onlineLeaderboard p{margin:0 0 18px;color:var(--mp-muted);overflow-wrap:anywhere}#onlineLeaderboard .results-kicker{margin:0;font-size:10px;font-weight:600;letter-spacing:.24em;color:var(--mp-gold)}
    #onlineLeaderboard .results-scroll{max-height:46dvh;overflow:auto;pointer-events:auto;scrollbar-width:thin;scrollbar-color:#756443 transparent;text-align:left}
    #onlineLeaderboard table{width:100%;border-collapse:separate;border-spacing:0 6px;table-layout:fixed}
    #onlineLeaderboard th{color:var(--mp-faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;text-align:left;padding:0 10px}
    #onlineLeaderboard th:first-child{width:58px}#onlineLeaderboard th:last-child{width:118px;text-align:right}
    #onlineLeaderboard td{padding:10px;font-variant-numeric:tabular-nums;background:#ffffff06;border-top:1px solid #ffffff0d;border-bottom:1px solid #ffffff0d}
    #onlineLeaderboard td:first-child{border-left:1px solid #ffffff0d;border-radius:6px 0 0 6px;text-align:center}
    #onlineLeaderboard td:first-child:before{content:attr(data-rank);display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#2b2f2c;color:#d8d3c2;font-weight:700;font-size:13px}
    #onlineLeaderboard td:first-child{font-size:0}
    #onlineLeaderboard td:nth-child(2){overflow-wrap:anywhere;font-weight:500}
    #onlineLeaderboard td:last-child{border-right:1px solid #ffffff0d;border-radius:0 6px 6px 0;text-align:right;color:var(--mp-gold-hi);font-weight:650;background:linear-gradient(270deg,#dcbb7426 calc(var(--share,0)*100%),transparent 0) ,#ffffff06}
    #onlineLeaderboard tr[data-rank="1"] td:first-child:before{background:linear-gradient(135deg,#f6dc9b,#c39a4f);color:#1d180e;box-shadow:0 0 14px #dcbb7466}
    #onlineLeaderboard tr[data-rank="2"] td:first-child:before{background:linear-gradient(135deg,#e5e7e6,#9ea3a4);color:#16191a}
    #onlineLeaderboard tr[data-rank="3"] td:first-child:before{background:linear-gradient(135deg,#e2a77a,#9b6239);color:#1c120b}
    #onlineLeaderboard tr[data-self=true] td{background-color:#dcbb7414;border-color:#c9a96a55}
    body.online-results #won,body.online-results #complete{visibility:hidden}
    @media(max-width:450px){#onlineLeaderboard .results-card{padding:20px 12px 14px}#onlineLeaderboard{font-size:12px}#onlineLeaderboard th:first-child{width:44px}#onlineLeaderboard th:last-child{width:96px}#onlineLeaderboard td{padding:8px 6px}}
    @media(prefers-reduced-motion:reduce){#onlineLeaderboard .results-card{animation:none}}`;
  document.head.appendChild(resultsStyle);
  let leaderboardRows = null;
  function clearLeaderboard() {
    leaderboardRows = null; leaderboard.hidden = true; document.body.classList.remove('online-results');
    el('leaderboardRows').replaceChildren();
  }
  function updateLeaderboard() {
    const rows = session?.gauntlet?.run ? null : latestFrame?.results;   // Boss Rush: the ability pick follows the kill at once
    if (rows && !leaderboardRows) {
      leaderboardRows = rows;
      el('leaderboardEncounter').textContent = session.kind === 'level' ? Game.level.name : [session.id, ...(session.partners || [])].map(id => ArenaNet.own(ENEMY_BY_ID, id)?.name || id).join(' & ');
      for (const row of rows) {
        const tr = document.createElement('tr'); tr.dataset.self = String(row.id === self); tr.dataset.playerId = row.id; tr.dataset.rank = row.rank;
        tr.style.setProperty('--share', String(row.damage / Math.max(1, ...rows.map(x => x.damage))));
        for (const value of [row.rank, row.name + (row.id === self ? ' (you)' : ''), row.damage.toLocaleString(undefined, { maximumFractionDigits: 1 })]) {
          const td = document.createElement('td'); td.textContent = value; if (!tr.children.length) td.dataset.rank = value; tr.appendChild(td);
        }
        el('leaderboardRows').appendChild(tr);
      }
    }
    const visible = !!rows && active() && Game.mode === 'play' && Game.loading <= 0 && panel.classList.contains('hidden') && runIntro.hidden;
    leaderboard.hidden = !visible; document.body.classList.toggle('online-results', visible);
  }
  const wipeScreen = document.createElement('section'); wipeScreen.id = 'teamWipeScreen'; wipeScreen.hidden = true;
  wipeScreen.tabIndex = -1; wipeScreen.setAttribute('role', 'alert'); wipeScreen.setAttribute('aria-label', 'Team wiped');
  wipeScreen.innerHTML = '<div class="wipe-message"><p class="wipe-kicker" id="teamWipeKicker">BOSS RUSH · RUN ENDED</p><h1>TEAM WIPED</h1><div class="wipe-rule"></div><p id="teamWipeScore"></p><p class="wipe-return">Returning to lobby…</p></div>';
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
    #teamWipeScreen #teamWipeScore{display:inline-block;padding:6px 18px;border:1px solid #b3304055;border-radius:999px;background:#2a070c99;color:#e3b0a8;font:600 13px/1.6 system-ui;letter-spacing:.14em;text-transform:uppercase}#teamWipeScreen #teamWipeScore:empty{display:none}
    #teamWipeScreen .wipe-return:before{content:'';display:inline-block;width:10px;height:10px;margin-right:10px;vertical-align:-1px;border:1px solid #95686d;border-top-color:transparent;border-radius:50%;animation:wipe-spin 1s linear infinite}
    @keyframes wipe-spin{to{transform:rotate(360deg)}}
    @keyframes wipe-veil{from{opacity:0}to{opacity:1}}
    @keyframes wipe-arrive{from{opacity:0;transform:scale(1.12);filter:blur(5px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    @media(prefers-reduced-motion:reduce){#teamWipeScreen,#teamWipeScreen .wipe-message,#teamWipeScreen .wipe-return:before{animation:none}}`;
  document.head.appendChild(wipeStyle);
  let wipeTimer = null;
  function clearTeamWipe() { clearTimeout(wipeTimer); wipeTimer = null; wipeScreen.hidden = true; panel.inert = false; }
  function showTeamWipe(run) {
    clearTeamWipe();
    el('teamWipeKicker').textContent = `${run?.name || 'BOSS RUSH'} · RUN ENDED`;
    el('teamWipeScore').textContent = !run ? '' : run.run ? `Bosses defeated · ${run.defeated ?? run.number - 1}` : `Bosses defeated · ${run.defeated ?? run.number - 1} / ${run.bosses ?? run.total}`;
    panel.inert = true; wipeScreen.hidden = false; input.clear(); wipeScreen.focus();
    wipeTimer = setTimeout(() => {
      clearTeamWipe();
      if (connected) { show(); if (!usingPad()) el('lobbyLeave').focus(); }
    }, C.teamWipeScreenTime * 1000);
  }
  // The end of a Calling run, won or wiped: its time, bosses beaten, and each player's damage and falls. It stays until
  // the player closes it (Escape, B, Lobby) or the leader starts the same run again for the same group.
  const runSummary = document.createElement('section'); runSummary.id = 'runSummary'; runSummary.hidden = true;
  runSummary.setAttribute('role', 'dialog'); runSummary.setAttribute('aria-modal', 'true'); runSummary.setAttribute('aria-labelledby', 'runSummaryTitle');
  runSummary.innerHTML = '<div class="summary-panel"><h2 id="runSummaryTitle"></h2><dl class="summary-facts"><div><dt>Crowned</dt><dd id="runSummaryCrowned"></dd></div><div><dt>Time</dt><dd id="runSummaryTime"></dd></div></dl>'
    + '<ol id="runSummaryTimes" aria-label="Time for each boss"></ol>'
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
      #runSummary table{grid-column:1;grid-row:3}#runSummary #runSummaryTimes{grid-column:2;grid-row:3;margin:28px 0 0}}
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
  function showRunSummary(data) {
    summary = data;
    runSummary.classList.toggle('summary-wiped', data.outcome !== 'won');
    // Endless: the bosses beaten are the title (PLAN.md track B item 3's end of run), then the Crowned fights won.
    const beaten = Math.max(0, Math.floor(Number(data.beaten) || 0));
    el('runSummaryTitle').textContent = beaten ? `${beaten} ${beaten === 1 ? 'boss' : 'bosses'} beaten` : 'No boss beaten';
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
    const rows = el('runSummaryRows'); rows.replaceChildren();
    for (const r of data.players || []) {
      const tr = document.createElement('tr'); tr.dataset.self = String(r.id === self);
      // The run's title for this player (server/index.cjs runTitles) under their name.
      const name = document.createElement('td'), who = document.createElement('span'); who.textContent = r.name; name.appendChild(who);
      if (r.title) { const title = document.createElement('span'); title.className = 'summary-title'; title.textContent = r.title; name.appendChild(title); }
      tr.appendChild(name);
      for (const value of [r.damage, r.deaths]) { const td = document.createElement('td'); td.textContent = Number(value).toLocaleString(); tr.appendChild(td); }
      rows.appendChild(tr);
    }
    panel.inert = true; runSummary.hidden = false; input.clear(); if (document.pointerLockElement) document.exitPointerLock();
    el('runSummaryLobbyKey').textContent = usingPad() ? 'B' : 'Esc';
    drawRunSummary(); summaryButtons()[0]?.focus({ preventScroll: true });
  }
  // Only the leader can start the run again; the others see who can.
  function drawRunSummary() {
    if (!summary) return;
    const owner = connected && self === leader;
    el('runSummaryAgain').hidden = !owner;
    el('runSummaryWait').textContent = owner || !connected ? '' : `${roster.find(p => p.id === leader)?.name || 'The leader'} can start this run again.`;
  }
  const summaryButtons = () => [el('runSummaryAgain'), el('runSummaryLobby')].filter(b => !b.hidden);
  function closeRunSummary(focusLobby = true) {
    if (!summary) return;
    summary = null; runSummary.hidden = true; panel.inert = false;
    if (focusLobby && connected && !usingPad()) el('lobbyLeave').focus();
  }
  function moveSummaryFocus(step) {
    const buttons = summaryButtons(), at = buttons.indexOf(document.activeElement);
    buttons[at < 0 ? 0 : (at + step + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  }
  runSummary.querySelector('#runSummaryAgain').onclick = () => {
    const again = !!summary; closeRunSummary(false);
    if (again) control('start', { kind: 'calling', id: C.calling.id });
  };
  runSummary.querySelector('#runSummaryLobby').onclick = () => closeRunSummary();
  window.addEventListener('keydown', ev => {
    if (runSummary.hidden || ev.code === 'Escape') return;
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
  // Boss Rush's abilities (CONFIG.abilities): between fights the server offers each player a few, and a click, a number
  // key or the pad takes one. The next fight starts when everyone has chosen or the time runs out. The cards and their
  // look: js/ability-cards.js.
  const abilityScreen = document.createElement('section'); abilityScreen.id = 'abilityScreen'; abilityScreen.hidden = true;
  abilityScreen.setAttribute('aria-labelledby', 'abilityTitle');
  abilityScreen.innerHTML = '<div class="ability-panel"><div class="ability-head"><h2 id="abilityTitle">Choose an ability</h2><span id="abilityClock"></span></div><div class="ability-time" aria-hidden="true"><i id="abilityTimeFill"></i></div><div id="abilityChoices" role="group" aria-labelledby="abilityTitle"></div><p id="abilityStatus" aria-live="polite"></p></div>';
  document.body.appendChild(abilityScreen);
  let ability = null;   // while the pick is open: { offer, held, chosen, deadline (performance.now() ms), clock }
  function openAbilities(msg) {
    if (!msg.offer) {   // the server took this player's pick
      if (ability) { ability.held = msg.held || []; ability.chosen = ability.chosen || ability.held[ability.held.length - 1] || null; drawAbilities(); }
      return;
    }
    ability = { offer: msg.offer, held: msg.held || [], chosen: null, deadline: performance.now() + Math.max(0, Number(msg.left) || 0) * 1000, clock: '' };
    const list = el('abilityChoices'); list.replaceChildren();
    msg.offer.forEach((id, i) => {
      const b = ArenaNet.own(ABILITY_BY_ID, id); if (!b) return;
      // A swift kill's extra choice (CONFIG.swift) is the last one, and says so.
      const card = abilityCard(b, ability.held, i + 1, !!msg.swift && !msg.crowned && i === msg.offer.length - 1 && i >= CONFIG.abilities.offer);
      card.onclick = () => chooseAbility(id);
      list.appendChild(card);
    });
    const n = list.children.length;
    abilityScreen.style.setProperty('--pick-w', `${n * 216 + (n - 1) * 12}px`);   // the row of tall cards, and the title over it
    input.clear(); if (document.pointerLockElement) document.exitPointerLock();
    abilityScreen.hidden = true; drawAbilities();
  }
  function chooseAbility(id) {
    if (!ability || ability.chosen || !active()) return;
    ability.chosen = id; send({ type: 'pickAbility', id, epoch: session.epoch }); drawAbilities();
    events.emit('abilityPicked', { id, rarity: ABILITY_BY_ID[id]?.rarity });   // a note and a ring round the player
  }
  function closeAbilities() { ability = null; abilityScreen.hidden = true; }
  function moveAbilityFocus(step) {
    const buttons = [...el('abilityChoices').children].filter(b => !b.disabled), at = buttons.indexOf(document.activeElement);
    buttons[at < 0 ? 0 : (at + step + buttons.length) % buttons.length]?.focus({ preventScroll: true });
  }
  function drawAbilities() {
    const visible = !!ability && active() && Game.loading <= 0 && panel.classList.contains('hidden') && runIntro.hidden;
    const opening = visible && abilityScreen.hidden;
    abilityScreen.hidden = !visible;
    if (!visible) return;
    const left = Math.max(0, (ability.deadline - performance.now()) / 1000), clock = Math.ceil(left) + '\u00a0s';
    if (clock !== ability.clock) { ability.clock = clock; el('abilityClock').textContent = clock; }
    el('abilityTimeFill').style.transform = `scaleX(${(left / CONFIG.abilities.pickTime).toFixed(3)})`;
    for (const button of el('abilityChoices').children) {
      button.setAttribute('aria-pressed', String(button.dataset.ability === ability.chosen));
      button.disabled = !!ability.chosen && button.dataset.ability !== ability.chosen;
    }
    const status = ability.chosen ? 'Waiting for the others.' : '';   // what is already yours shows on its card's level
    if (el('abilityStatus').textContent !== status) el('abilityStatus').textContent = status;
    abilityScreen.classList.toggle('ability-pad', usingPad());
    if (opening) el('abilityChoices').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  // While the pick is open the game hears no keys: a number takes that ability, arrows move between them, Enter or
  // Space presses the focused one, and Escape still opens the lobby.
  window.addEventListener('keydown', ev => {
    if (abilityScreen.hidden || ev.code === 'Escape') return;
    userActivity(ev); ev.stopImmediatePropagation();
    if (ev.code === 'Tab') { ev.preventDefault(); moveAbilityFocus(ev.shiftKey ? -1 : 1); return; }   // focus stays in the pick
    const n = /^(?:Digit|Numpad)([1-9])$/.exec(ev.code);
    if (n) { ev.preventDefault(); const b = el('abilityChoices').children[Number(n[1]) - 1]; if (b) chooseAbility(b.dataset.ability); }
    else if (ev.code.startsWith('Arrow')) { ev.preventDefault(); moveAbilityFocus(ev.code === 'ArrowLeft' || ev.code === 'ArrowUp' ? -1 : 1); }
  }, true);
  // The pad: the d-pad moves, A takes the focused ability, Start still opens the lobby.
  function abilityPad(pressed) {
    if (abilityScreen.hidden || pressed.includes('PadStart')) return false;
    input.clear();
    if (pressed.includes('PadLeft') || pressed.includes('PadUp')) moveAbilityFocus(-1);
    if (pressed.includes('PadRight') || pressed.includes('PadDown')) moveAbilityFocus(1);
    if (pressed.includes('PadA') && document.activeElement?.dataset?.ability) chooseAbility(document.activeElement.dataset.ability);
    return true;
  }
  const runIntro = document.createElement('section'); runIntro.id = 'runIntroScreen'; runIntro.hidden = true;
  runIntro.tabIndex = -1; runIntro.setAttribute('role', 'status'); runIntro.setAttribute('aria-label', 'Adventure begins');
  runIntro.innerHTML = `<div class="intro-halo" aria-hidden="true"></div><div class="intro-embers" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--ember:${i}"></i>`).join('')}</div>
    <div class="intro-message"><div class="intro-crest" aria-hidden="true"><span>✦</span></div>
    <h1 id="runIntroTitle"></h1><div class="intro-rule"></div><p id="runIntroGoal" class="intro-goal"></p></div>`;
  document.body.appendChild(runIntro);
  const introStyle = document.createElement('style');
  introStyle.textContent = `#runIntroScreen[hidden]{display:none}
    #runIntroScreen{position:fixed;inset:0;z-index:120;display:grid;place-items:center;overflow:hidden;padding:24px;box-sizing:border-box;background:radial-gradient(ellipse at 50% 44%,#35270d 0%,#100d05 48%,#030302 100%);color:#f7dfa0;text-align:center;outline:none;animation:intro-veil var(--intro-duration) linear both}
    #runIntroScreen .intro-halo{position:absolute;width:min(88vw,650px);aspect-ratio:1;border:1px solid #c1993d1c;border-radius:50%;box-shadow:0 0 90px #e3b3490b,inset 0 0 100px #f4c34b08;animation:intro-halo 5s ease-out both}
    #runIntroScreen .intro-halo:before,#runIntroScreen .intro-halo:after{content:'';position:absolute;inset:25px;border:1px solid #ddbc6120;border-radius:50%}#runIntroScreen .intro-halo:after{inset:65px;border-style:dashed;border-color:#ddbc6115}
    #runIntroScreen .intro-message{position:relative;z-index:1;width:min(1040px,100%)}
    #runIntroScreen .intro-crest{position:relative;width:68px;height:68px;margin:0 auto 34px;border:1px solid #d4ad595e;transform:rotate(45deg);box-shadow:0 0 40px #f5bf3d1c;animation:intro-crest 1.5s ease-out both}
    #runIntroScreen .intro-crest:before{content:'';position:absolute;inset:7px;border:1px solid #dab86c44}#runIntroScreen .intro-crest span{display:block;transform:rotate(-45deg);font:46px/68px Georgia,serif;color:#ffe6a6;text-shadow:0 0 28px #f7c752a0}
    #runIntroScreen h1{font:400 clamp(30px,5.7vw,72px)/1.25 Georgia,serif;letter-spacing:.1em;text-indent:.1em;margin:18px 0 22px;color:#ffe8ac;text-shadow:0 0 42px #ecc16340,0 2px 12px #000;animation:intro-title 1.8s .4s cubic-bezier(.16,1,.3,1) both}
    #runIntroScreen .intro-rule{height:1px;width:min(480px,85%);margin:0 auto 24px;background:linear-gradient(90deg,transparent,#d6ae58,transparent);animation:intro-rule 1.6s .65s both}
    #runIntroScreen .intro-goal{font:clamp(14px,1.6vw,18px)/1.9 Georgia,serif;color:#decc9f;animation:intro-rise 1.2s 1s both}
    #runIntroScreen .intro-embers{position:absolute;inset:0;pointer-events:none}#runIntroScreen .intro-embers i{position:absolute;left:calc(6% + var(--ember)*8%);top:85%;width:2px;height:2px;border-radius:50%;background:#f7d47b;box-shadow:0 0 9px #ffd35f;animation:intro-ember 4s calc(var(--ember)*-.33s) linear infinite}
    @keyframes intro-veil{0%{opacity:0}12%,86%{opacity:1}100%{opacity:0}}
    @keyframes intro-title{from{opacity:0;transform:scale(1.08);filter:blur(6px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
    @keyframes intro-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes intro-rule{from{opacity:0;transform:scaleX(.15)}to{opacity:1;transform:scaleX(1)}}
    @keyframes intro-crest{from{opacity:0;transform:rotate(25deg) scale(.85)}to{opacity:1;transform:rotate(45deg) scale(1)}}
    @keyframes intro-halo{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1.08)}}
    @keyframes intro-ember{0%{opacity:0;transform:translateY(0)}20%,65%{opacity:.65}100%{opacity:0;transform:translate(20px,-65vh)}}
    @media(max-height:600px){#runIntroScreen .intro-crest{width:44px;height:44px;margin-bottom:18px}#runIntroScreen .intro-crest span{font-size:30px;line-height:44px}#runIntroScreen h1{margin:12px 0 16px}#runIntroScreen .intro-rule{margin-bottom:14px}}
    @media(prefers-reduced-motion:reduce){#runIntroScreen,#runIntroScreen *{animation:none!important}#runIntroScreen .intro-embers{display:none}}`;
  document.head.appendChild(introStyle);
  let runIntroPending = null;
  function clearRunIntro() { runIntroPending = null; runIntro.hidden = true; panel.inert = false; el('menu').inert = false; input.clear(); }
  function showRunIntro(id) {
    const data = LOBBY_INTROS.find(x => x.id === id);
    if (!data) throw new Error('Unknown lobby intro: ' + id);
    el('runIntroTitle').textContent = data.title;
    el('runIntroGoal').textContent = data.goal;
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
  // What the controller and the arrow keys move through: the name keyboard or the controls sheet while one is open,
  // else the whole lobby (the mirrored mode select is skipped: the mode list is its row).
  function lobbyControls() {
    const root = !el('lobbyNameEditor').hidden ? el('lobbyNameEditor') : !el('lobbyControls').hidden ? el('lobbyControls') : panel;
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
    const preferred = [el('lobbyResume'), el('lobbyGuestResume'), el('lobbyStart'), el('lobbyRetry'),
      el('lobbyModes').querySelector('[aria-pressed=true]'), el('lobbyLeave')].find(node => controls.includes(node));
    const next = preferred || controls[0]; focusLobbyControl(next); return next;
  }
  // The keys for the device used last: Back's key sits on the button it presses (Return to game, Close or Leave lobby),
  // and the footer names the rest (move, change, select; type and delete in the name keyboard).
  function updateLobbyPadHint() {
    const pad = usingPad();
    panel.classList.toggle('lobby-pad', pad);
    const back = !el('lobbyControls').hidden ? 'lobbyControlsClose' : el('lobbyNameEditor').hidden
      ? ['lobbyResume', 'lobbyGuestResume'].find(id => !el(id).hidden && el(id).offsetParent) || 'lobbyLeave' : null;
    for (const id of ['lobbyResume', 'lobbyGuestResume', 'lobbyLeave', 'lobbyControlsClose'])
      el(id).querySelector('.ui-key').textContent = id === back ? pad ? 'B' : 'Esc' : '';
    const hints = el('lobbyPadHint'); hints.textContent = '';
    const rows = !el('lobbyNameEditor').hidden
      ? [[pad ? 'D-pad' : '↑ ↓ ← →', 'Move'], [pad ? 'A' : 'Enter', 'Type'], [pad ? 'X' : 'Backspace', 'Delete'], [pad ? 'B' : 'Esc', 'Cancel']]
      : [[pad ? 'D-pad' : '↑ ↓', 'Move'], [pad ? 'A' : 'Enter', 'Select']];
    for (const [key, label] of rows) {
      const item = document.createElement('span'), cap = document.createElement('span');
      cap.className = 'ui-key'; cap.textContent = key; item.append(cap, label); hints.appendChild(item);
    }
  }
  events.on('device', updateLobbyPadHint);
  function closeNameEditor(save = false, restoreFocus = true) {
    if (save) { el('lobbyName').value = nameDraft; el('lobbyName').dispatchEvent(new Event('change', { bubbles: true })); }
    el('lobbyNameEditor').hidden = true;
    panel.classList.remove('editing-name');
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
    nameDraft = el('lobbyName').value; el('lobbyNameEditor').hidden = false;
    panel.classList.add('editing-name');
    el('lobbyNamePreview').textContent = nameDraft || 'Your name'; buildNameKeys(); updateLobbyPadHint();
  }
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
    if (!wipeScreen.hidden) return;
    if (summary) { closeRunSummary(); return; }
    if (!el('lobbyNameEditor').hidden) closeNameEditor();
    else if (!el('lobbyControls').hidden) toggleLobbyHelp(false);
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
      ['Dodge / roll', bindLabel('roll')], ['Jump', bindLabel('jump')],
      ['Block (hold)', bindLabel('block')], ['Parry', bindLabel('parry')],
      ['Lock on / off', bindLabel('lock')], ['Heal with flask', bindLabel('flask')],
      ['Rest at bonfire', bindLabel('rest')], ['Game menu', systemLabel('pause')],
    ];
    const list = el('lobbyControlsList'); list.textContent = '';
    for (const [action, binding] of rows) {
      const row = document.createElement('div'), name = document.createElement('dt'), keys = document.createElement('dd');
      name.textContent = action; keys.textContent = keycap(binding); row.append(name, keys); list.appendChild(row);
    }
    el('lobbyTalkKey').textContent = keycap(bindLabel('talk'));
  }
  events.on('device', buildControls);
  buildControls();
  let noticeTimer = null;
  const notice = (s, transient = false) => {
    clearTimeout(noticeTimer); el('lobbyNotice').textContent = s; el('lobbyNotice').hidden = !s;
    if (s && transient) noticeTimer = setTimeout(() => notice(''), CONFIG.hud.online.noticeTime * 1000);
  };
  let savedName = '', resumeToken = '', foreground = !document.hidden;
  try { savedName = localStorage.getItem('combatArena.onlineName') || ''; resumeToken = localStorage.getItem('combatArena.onlineToken') || ''; } catch {}
  el('lobbyName').value = savedName;
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
    if (connected) send({ type: 'presence', foreground });
  }
  window.addEventListener('blur', () => setPresence(false));
  window.addEventListener('focus', () => setPresence(!document.hidden));
  document.addEventListener('visibilitychange', () => setPresence(!document.hidden && document.hasFocus()));
  window.addEventListener('pagehide', () => { publishPose(); if (connected) send({ type: 'presence', foreground: false }); });
  function command(type, data = {}) { if (ready) send({ type, epoch: session.epoch, seq: ++seq, ...data }); }
  function clearControlPending() { clearTimeout(controlDeadline); controlDeadline = null; controlPending = null; }
  function control(action, data = {}) {
    if (!connected || self !== leader || controlPending) return;
    if (['start', 'restart', 'next', 'lobby'].includes(action)) {
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
    updateLeaderboard(); drawAbilities();
    party.hidden = !active() || Game.mode !== 'play' || Game.loading > 0 || !panel.classList.contains('hidden') || !runIntro.hidden;
    if (party.hidden) for (const remote of remotes.values()) remote.label.hidden = true;
  }
  function show() {
    closeNameEditor(false, false); setLobbyHelp(false);
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
  function hide() { closeNameEditor(false, false); setLobbyHelp(false); closePanel(); if (active()) Game.resume(); overlayVisibility(); }
  function active() { return connected && !!session && loaded; }
  function chapterCard(id) {
    const chapter = connected && session?.campaign && STORIES.find(s => s.id === session.campaign.id)?.chapters.find(c => c.level === id);
    return chapter ? [chapter.title, chapter.line] : null;
  }
  function clearRemotes() { for (const r of remotes.values()) { r.body.rig.dispose(); r.label.remove(); } remotes.clear(); }
  function resetStream() { clearLeaderboard(); clearTeamWipe(); closeRunSummary(false); clearRunIntro(); tracks.clear(); decoder.reset(); latestFrame = null; receivedFrames = 0; playback = null; ready = false; lastPose = 0; pendingExecution = null; deferredStart = null; resetSpectator(); embers = []; rescuer = null; revive.clear(); }
  function retryConnection(message) {
    if (!reconnectWanted) return;
    leave(message, true);
    notice('Reconnecting automatically… You can leave the lobby to cancel.');
    const delay = Math.min(C.reconnectMaxDelay, C.reconnectDelay * 2 ** Math.min(reconnectAttempt++, C.reconnectBackoffSteps));
    reconnectTimer = setTimeout(() => { reconnectTimer = null; join(true); }, delay);
  }
  function leave(message = '', retry = false) {
    publishPose();
    closeNameEditor(false, false); setLobbyHelp(false);
    joinAttempt++;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    if (!retry) { reconnectWanted = false; reconnectAttempt = 0; }
    intentionalClose = true;
    if (retry) socket?.close(); else socket?.close(1000, 'Left lobby');
    socket = null;
    connected = false; self = leader = null; session = null; loaded = false; starting = false; ping = null; resetStream(); clearRemotes(); clearControlPending();
    roster = []; rosterSignature = ''; panel.classList.remove('managing-party'); el('lobbyManage').setAttribute('aria-expanded', 'false');
    finale.cancelEnding();
    heldActivity.clear(); activityPending = false; lastActivitySent = -Infinity;
    party.classList.add('hidden'); closePanel(); notice('');
    if (Game.player) Game.clearActors();
    Game.loading = 0; el('loading').classList.remove('show'); Game.showMenu('main');
    if (message) { show(); el('lobbyStatus').textContent = message; el('lobbyLeave').lastElementChild.textContent = retry ? 'Leave lobby' : 'Back to main menu'; }
  }
  async function join(retry = false) {
    if (connected) { show(); return; }
    if (starting) return;
    clearTimeout(reconnectTimer); reconnectTimer = null;
    reconnectWanted = true;
    const attempt = ++joinAttempt;
    starting = true; intentionalClose = false; show(); notice('');
    el('lobbyStatus').textContent = 'Connecting to the public lobby…';
    el('lobbyLeave').lastElementChild.textContent = 'Leave lobby';
    try {
      if (!/^https?:$/.test(location.protocol)) throw new Error('Open the game’s home server link to join the public lobby.');
      const response = await fetch('/api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(C.connectTimeout) });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('The public lobby is available on the home server link. This address only hosts solo play.');
      const info = await response.json();
      if (!starting || attempt !== joinAttempt) return;
      if (info.players >= info.capacity) throw new Error(`The public lobby is full (${info.capacity} players). ${retry ? 'Waiting for a place to open.' : 'Try again when a place opens.'}`);
      if (typeof versionCheck !== 'undefined') versionCheck.note(info);
      const pageBuild = document.querySelector('meta[name="arena-build"]')?.content;
      if (info.version !== VERSION || pageBuild !== info.build) { reconnectWanted = false; needsReload = true; throw new Error('The game has updated. Reload this page before joining.'); }
      if (!starting || attempt !== joinAttempt) return;
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${C.path}`);
      const joining = socket;
      const deadline = setTimeout(() => { if (joining === socket && !connected) { retryConnection('The lobby did not respond. Reconnecting…'); } }, C.connectTimeout);
      socket.onopen = () => { if (socket === joining) send({ type: 'hello', protocol: C.protocol, build: info.build, name: el('lobbyName').value, token: resumeToken, foreground }); };
      socket.onmessage = event => { if (socket !== joining) return; try { receive(JSON.parse(event.data)); } catch (e) { console.error('Lobby update failed', e); retryConnection('Recovering the current game…'); } };
      socket.onclose = e => { clearTimeout(deadline); if (socket !== joining) return; if (!intentionalClose) {
        if (e.code === 1008) leave(e.reason || 'The lobby refused the connection.');
        else retryConnection(e.reason || 'Connection lost. Rejoining the current game…');
      } };
      socket.onerror = () => { if (socket === joining && !connected) notice('Could not connect. The lobby may be full or the server may be unavailable.'); };
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
    el('lobbyWaiting').hidden = connected && self === leader || !connected;
    el('lobbyName').disabled = !connected;
    el('lobbyCount').textContent = connected ? `${roster.length} / ${capacity}` : '—';
  }
  const callingChosen = () => el('lobbyAdventure').value === 'calling/' + C.calling.id;
  function adventureSummary() {
    const value = el('lobbyAdventure').value, id = value.slice(value.indexOf('/') + 1);
    const campaign = STORIES.find(s => s.id === id), run = ArenaNet.own(C.gauntlets, id);
    for (const button of el('lobbyModes').children) button.setAttribute('aria-pressed', String(button.dataset.mode === value));
    el('lobbyAdventureSummary').textContent = callingChosen() ? `Boss after boss until everyone falls, faster every fight. Every ${CONFIG.endless.crowned}th is Crowned.` : run
      ? `Every boss, ${run.size > 1 ? `${run.size} at a time` : 'one at a time'}${run.then ? `, then ${C.gauntlets[run.then].name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}` : ''}. The fallen watch until the fight ends; a team wipe ends the run.`
      : campaign ? `${campaign.chapters.length} chapters, together. Checkpoints are shared.`
      : 'Play this encounter together.';
  }
  // The running adventure, in a few words ("Ashmere: The Long Hall"), or ''.
  function runName() {
    if (!session) return '';
    if (session.campaign) return `${STORIES.find(s => s.id === session.campaign.id)?.short || session.campaign.name}: ${session.campaign.title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}`;
    if (session.gauntlet) return session.gauntlet.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return session.kind === 'level' ? ALL_LEVELS.find(l => l.id === session.id)?.name || '' : ArenaNet.own(ENEMY_BY_ID, session.id)?.name || '';
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
      const response = await fetch('/api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(CONFIG.titleLobby.timeout * 1000) });
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
    el('lobbyNext').hidden = !!session?.gauntlet;
    el('lobbyNext').disabled = !session || !!controlPending || !!session.gauntlet || !!(session.campaign && (!latestFrame?.complete || !session.campaign.next));
    el('lobbyNext').textContent = session?.campaign ? 'Next chapter' : 'Next level';
    el('lobbyRestart').textContent = session?.gauntlet ? 'Restart boss run' : session?.campaign ? 'Restart chapter' : 'Restart level';
    el('lobbyReturn').disabled = !session || !!controlPending;
    el('lobbyStart').disabled = !connected || !!controlPending;
    el('lobbyStart').textContent = controlPending === 'start' ? 'Starting…' : session ? 'Start a new run' : roster.length > 1 ? 'Start together' : 'Start';
    el('lobbyManage').hidden = !owner || roster.length < 2;
    if (!owner) { panel.classList.remove('managing-party'); el('lobbyManage').setAttribute('aria-expanded', 'false'); }
    // A boss run already names itself in the status line above.
    el('lobbyWaiting').firstElementChild.textContent = session?.gauntlet ? '' : session ? `${runName() ? `${runName()} is underway.` : 'Your party is already playing.'}`
      : `Waiting for ${roster.find(p => p.id === leader)?.name || 'the leader'} to start.`;
    updateConnection(); adventureSummary(); updateLobbyPadHint();
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
    const road = session?.campaign;
    const story = session?.kind === 'level' && STORIES.find(s => s.chapters.some(c => c.level === session.id));
    const number = road?.number || (story ? story.chapters.findIndex(c => c.level === session.id) + 1 : null);
    const levelTag = session?.gauntlet ? `${session.gauntlet.name || 'BOSS RUSH'} · ${session.gauntlet.run ? `Fight ${session.gauntlet.number}` : `${session.gauntlet.number}/${session.gauntlet.total}`}` : number ? `Level ${number}${road ? '/' + road.total : ''}` : '';
    for (const id of ['onlineCurrentLevel', 'lobbyCurrentLevel']) {
      const tag = el(id);
      tag.hidden = !connected || !levelTag;
      tag.textContent = levelTag;
    }
    el('onlinePartyDetails').textContent = session?.gauntlet ? '' : road?.name || 'Public lobby';
    updateAlivePanel();
    party.classList.toggle('hidden', !active()); updateConnection(); overlayVisibility();
  }
  function receive(msg) {
    if (msg.type === 'welcome') {
      connected = true; starting = false; reconnectAttempt = 0; needsReload = false; self = msg.id; leader = msg.leader; roster = msg.players; catalog = msg.catalog; capacity = msg.capacity;
      resumeToken = typeof msg.token === 'string' ? msg.token : '';
      el('lobbyName').value = roster.find(p => p.id === self)?.name || el('lobbyName').value;
      try { localStorage.setItem('combatArena.onlineToken', resumeToken); localStorage.setItem('combatArena.onlineName', el('lobbyName').value); } catch {}
      activityPending = false; lastActivitySent = -Infinity; heldActivity.clear();
      const select = el('lobbyAdventure'); select.textContent = '';
      // The leader's Mode: Boss Rush first (the lobby's default), the fixed boss runs, then the story played together.
      const stories = catalog.campaigns.filter(entry => STORIES.some(s => s.id === entry.id && s.lobbyName));
      const titled = name => name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      const modes = [{ kind: 'calling', id: C.calling.id, name: titled(C.calling.name) }, ...Object.entries(C.gauntlets).map(([id, run]) => ({ kind: 'gauntlet', id, name: titled(run.name) })),
        ...stories.map(entry => ({ kind: 'campaign', id: entry.id, name: STORIES.find(s => s.id === entry.id).lobbyName }))];
      el('lobbyModes').textContent = '';
      for (const entry of modes) {
        const option = document.createElement('option'); option.value = `${entry.kind}/${entry.id}`; option.textContent = entry.name; select.appendChild(option);
        // The visible list: one row per mode, mirroring the select.
        const row = document.createElement('button'); row.type = 'button'; row.className = 'ui-row'; row.textContent = entry.name;
        row.dataset.mode = option.value; row.dataset.padKey = 'mode/' + option.value;
        row.onclick = () => { if (select.value !== option.value) { select.value = option.value; select.dispatchEvent(new Event('change', { bubbles: true })); } };
        el('lobbyModes').appendChild(row);
      }
      select.value = `${catalog.defaultAdventure.kind}/${catalog.defaultAdventure.id}`;
      el('lobbyStatus').textContent = ''; updateRoster();
      if (!panel.classList.contains('hidden')) focusLobbyControl(ensureLobbyFocus(true));   // joined: focus moves from Leave to Start
    } else if (msg.type === 'roster') {
      roster = msg.players; leader = msg.leader; updateRoster(); drawRunSummary();
      if (msg.notice && roster.length > 1) notice(msg.notice, true);
    } else if (msg.type === 'start') {
      clearControlPending(); notice('');
      finale.cancelEnding();
      const tipsRemaining = session && !msg.opening ? hud.controlsTipsTimer : CONFIG.hud.controlsTipsTime;
      session = msg.session; loaded = false; seq = 0; resetStream(); clearRemotes(); closeAbilities();
      if (msg.opening) runIntroPending = session.gauntlet?.id || session.campaign?.id || null;
      const current = session;
      Game.story = false; closePanel();
      const loadingCard = session.kind === 'arena' ? Game.duelCard(session.id, session.partners || []) : Game.levelCard(session.id);
      el('lobbyAdventure').value = session.gauntlet ? `${session.gauntlet.run ? 'calling' : 'gauntlet'}/${session.gauntlet.id}` : session.campaign ? `campaign/${session.campaign.id}` : `${session.kind}/${session.id}`;
      const begin = () => {
        if (session !== current || !connected) return;
        if (Game.pendingLoad) { deferredStart = begin; return; }
        const build = () => {
          if (session !== current || !connected) return;
          if (session.kind === 'level') Game.startLevel(session.id); else Game.startFight(session.id, session.partners || []);
          Game.spawn = { ...session.spawn }; Game.spawnPlayer(); Game.player.grantAbilities(session.abilities?.[self]); restorePlayer(msg.resume);
          hud.controlsTipsTimer = tipsRemaining;
          for (const e of Game.enemies) e.netId = e.key || 'duel/' + e.baseDef.id;
          loaded = true; updateRoster();
        };
        // Boss Rush's next boss drops straight in (v7.69.0): the arena is rebuilt at once, with no loading card.
        if (session.drop && Game.mode === 'play') { build(); Game.loading = 0; el('loading').classList.remove('show'); }
        else Game.loadingFirst(...loadingCard, build);
      };
      begin();
    } else if (msg.type === 'stop') {
      clearControlPending();
      const endedRun = session?.gauntlet;
      finale.cancelEnding();
      session = null; loaded = false; resetStream(); clearRemotes(); closeAbilities(); Game.loading = 0; el('loading').classList.remove('show');
      if (Game.player) Game.clearActors(); Game.showMenu('main'); show(); notice(msg.message || 'The leader returned everyone to the lobby.');
      if (msg.summary) showRunSummary(msg.summary);
      else if (msg.reason === 'team-wipe') showTeamWipe(endedRun);
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
      // Each ember with its cue lines made here, once per frame from the server, not in the drawing (js/revive.js).
      embers = (frame.embers || []).map(m => ({ ...m, saved: m.by ? `${nameOf(m.by)} is reviving you` : '',
        reviving: `Reviving ${nameOf(m.id)}`, standIn: `Stand in the ring to revive ${nameOf(m.id)}` }));
      rescuer = embers.find(m => m.id === self)?.by || null;
      revive.set(embers, self);
      applyProgress(frame, msg.full);
    } else if (msg.type === 'checkpoint' && active()) { session.spawn = msg.spawn; Game.spawn = { ...msg.spawn }; }
    else if (msg.type === 'execution' && active()) {
      const e = Game.enemies.find(e => e.netId === msg.enemy);
      if (msg.accepted && pendingExecution === msg.enemy && e && Game.player.alive()) {
        grantedEnemy = msg.enemy; execution.start(Game.player, e); grantedEnemy = null;
      } else if (!msg.accepted) notice('Another player took that execution, or the opening has ended.');
      pendingExecution = null;
    } else if (msg.type === 'revive') riseAgain(msg);
    else if (msg.type === 'abilities' && session) openAbilities(msg);   // also while loading back in: shown once loaded
    else if (msg.type === 'pong') { ping = Math.max(0, Math.round(performance.now() - msg.sent)); updateConnection(); }
    else if (msg.type === 'error') { clearControlPending(); updateRoster(); notice(msg.message); }
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
    if (!s || !['x', 'y', 'z', 'yaw', 'hp', 'stamina', 'flasks'].every(key => ArenaNet.finite(s[key]))) return;
    const p = Game.player;
    for (const key of ['x', 'y', 'z', 'yaw']) p[key] = s[key];
    p.hp = clamp(s.hp, 0, p.maxHp); p.stamina = clamp(s.stamina, 0, p.maxStamina);
    p.item('flask').count = clamp(Math.floor(s.flasks), 0, p.item('flask').max);
    for (const key of ['staminaDelay', 'poise', 'poiseTimer', 'doomTime', 'doomDrain']) if (ArenaNet.finite(s[key]) && s[key] >= 0) p[key] = s[key];
    p.exhausted = !!s.exhausted; p.grounded = !!s.grounded; p.peak = p.y; p.lastHp = p.hp;   // no health lost by coming back
    for (const key of ['vx', 'vy', 'vz']) p[key] = !p.grounded && ArenaNet.finite(s[key]) ? s[key] : 0;
    p.setState(p.hp <= 0 || s.state === PS.DEAD ? PS.DEAD : p.grounded ? PS.IDLE : PS.FALL);
    p.savePrev(); Game.deathTimer = 0; Game.cam.yaw = p.yaw; Game.updateCamera(0, true);
  }
  function capturePose(p) {
    return { ...ArenaNet.bodyPose(p),
      stamina: p.stamina, flasks: p.item('flask').count, exhausted: p.exhausted, staminaDelay: p.staminaDelay,
      poise: clamp(p.poise, 0, p.maxPoise), poiseTimer: Math.min(p.poiseTimer, CONFIG.player.poiseResetTime), doomTime: p.doomTime, doomDrain: p.doomDrain,
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
      if (runIntroPending) showRunIntro(runIntroPending);
      else {
        if (!runIntro.hidden) clearRunIntro();
        ready = true; send({ type: 'ready', epoch: session.epoch });
      }
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
      e.hp = s.hp; e.posture = s.posture; e.guardMeter = s.guardMeter; e.poise = s.poise; e.frozen = s.frozen || 0;
      e.attack = s.attack ? e.baseDef.attacks.find(x => x.id === s.attack) : null;
      e.hitIndex = s.hitIndex; e.netSerial = s.serial; e.attackNo = s.serial; e.netTarget = s.target; e.grounded = s.grounded;
      e.walkPhase = s.walkPhase; e.leaping = s.leaping; e.asleep = false;
      // A bolt's mark (pass 48): noted from the target the snapshot names, as the server notes it from the same body.
      const wh = e.state === ES.WINDUP && e.attack && e.attack.hits[e.hitIndex];
      if (wh && wh.bolt) e.noteBolt(s.lure || (s.target === self ? Game.player : remotes.get(s.target)?.body));   // `lure`: a summon draws it
      if (e.netParried === s.serial && [ES.WINDUP, ES.ACTIVE].includes(s.state)) { e.state = ES.PARRIED; e.stateTime = 0; }
      const boxKey = `${s.serial}/${s.hitIndex}`;
      // Each cut is noted where it was first seen striking, hitbox or not, so that a later `echo` of it hangs there.
      if (e.state === ES.ACTIVE && e.attack && e.netCutKey !== boxKey) { e.netCutKey = boxKey; e.noteCut(); }
      if (s.hitbox && e.state === ES.ACTIVE && e.attack && e.netParried !== s.serial && e.netJoinSerial !== s.serial) {
        if (e.netBoxKey !== boxKey || !e.hitbox) {
          e.hitbox = e.makeHitbox(); e.netBoxKey = boxKey;   // notes where it stands for a later `echo` too
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
  // A legendary, anyone's (js/ability-fx.js draws it): one on an enemy comes with that enemy's sample, one on none (a
  // Meteor's blast, a Blood Moon) as its frame arrives. The Blood Moon's own part, its drink, is this body's.
  function presentAbility(d, e) {
    if (!ArenaNet.own(ABILITY_BY_ID, d.power) || !d.v || typeof d.v !== 'object') return;
    const body = d.holder === self ? Game.player : remotes.get(d.holder)?.body || null;
    if (d.then === 'bloodMoon' && body === Game.player) { body.perk.moon = d.v.time; body.perk.moonV = d.v; }
    events.emit('abilityPower', { ...d, body, enemy: e });
  }
  function presentEvents(sample) {
    for (const d of sample.events) {
      const e = Game.enemies.find(e => e.netId === d.enemy);
      if (d.type === 'strike' && d.player !== self && e) {
        const attacker = remotes.get(d.player)?.body;
        if (attacker) events.emit('strike', { ...d, attacker, player: attacker, target: e });
      // A teammate's parry names its body (or id), so camera feedback for the local player's own parries stays theirs.
      } else if (d.type === 'parry' && d.player !== self && e) events.emit('parry', { target: e, player: remotes.get(d.player)?.body || d.player });
      else if (d.type === 'abilityPower' && e) presentAbility(d, e);
      if (['attackStart', 'attackPhase', 'bossPhase', 'bossRetreat', 'bossGone', 'enemyBlink', 'postureBreak'].includes(d.type) && e) {
        const attack = sample.value.attack ? e.baseDef.attacks.find(a => a.id === sample.value.attack) : e.attack;
        events.emit(d.type, { enemy: e, actor: e, attack, phase: PHASE.ACTIVE, hitIndex: d.hitIndex, seamless: d.seamless, out: d.out });
      } else if (d.type === 'impact') events.emit('impact', { ...d, enemy: e });
      else if (d.type === 'attackMarker' && e) {
        // Wire values: the attack by id from this enemy's own data, the marker index bounds-checked.
        const attack = e.baseDef.attacks.find(a => a.id === d.attackId) || e.def.attacks?.find(a => a.id === d.attackId);
        const marker = attack && Array.isArray(attack.markers) && Number.isInteger(d.marker) && d.marker >= 0 && d.marker < attack.markers.length ? attack.markers[d.marker] : null;
        if (marker) events.emit('attackMarker', { actor: e, attack, marker });
      }
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
    }
    projectiles.update(Game, dt);
    burnInFires(Game, dt, Game.player);   // the fires the server's enemies left (laid here from their strikes, Enemy.noteFires)
    if (Game.kind === 'level') { lore.update(Game, dt); updateHazards(dt); finale.updateOnline(Game, dt); }
    Game.updateCamera(dt, false);
    // One death sequence per body, whatever killed it (a blow, rot, a script): as Game.update does.
    if (!Game.player.alive() && Game.deathOf !== Game.player) Game.onPlayerDeath();
  }
  function updateHazards(dt) {
    const p = Game.player;
    if (!p.alive() || p.invulnerable()) return;
    for (const h of world.hazards || []) if (p.grounded && inRect(h.rect, p.x, p.z) && Math.abs(p.y - h.y) <= CONFIG.height.stepUp) {
      p.hp = Math.max(0, p.hp - h.dps * dt);
      if (p.hp <= 0) { p.die(); return; }   // the end of the online step starts the death sequence
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
      p.attack = ArenaNet.own(PLAYER_DEF.moveset.attacks, a.attack) || null; p.charge = a.charge; p.chargeT = a.chargeT + (a.charge === 1 ? Math.max(0, now - a.at) : 0); p.walkPhase = lerp(a.walkPhase, b.walkPhase, f);
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
      const v = labelPosition.set(p.x, p.y + p.height, p.z).project(camera);
      r.label.hidden = p.hp <= 0 || r === remotes.get(spectatorTarget) || Game.mode !== 'play' || Game.loading > 0 || !runIntro.hidden || v.z < -1 || v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
      r.label.style.left = `${(v.x + 1) * innerWidth / 2}px`; r.label.style.top = `${(1 - v.y) * innerHeight / 2}px`;
    }
  }
  function hit(e, strike) {
    const hb = Game.player.hitbox;
    if (!hitIds.has(hb)) hitIds.set(hb, String(++swing));
    command('hit', { enemy: e.netId, attack: strike.attackId, swing: hitIds.get(hb), charge: strike.charge || 0, riposte: strike.riposte });
    e.tint = 1; e.recoil = 1;
    return { blocked: (e.guarding() && isInFront(e, Game.player.x, Game.player.z)) || e.counterAgainst(Game.player, strike.attackId) === 'turn', broke: false, died: false };   // a counter stance turns it (pass 55)
  }
  function parry(e) { command('parry', { enemy: e.netId, serial: e.netSerial }); e.netParried = e.netSerial; return e.getParried(); }
  function lifesteal(e) { command('lifesteal', { enemy: e.netId, serial: e.netSerial, hitIndex: e.hitIndex }); }
  // An ability's trigger only this browser sees (ABILITY_CLAIMS, js/abilities.js): the server checks it and fires.
  function abilityClaim(when, ctx) {
    if (!ABILITY_CLAIMS.includes(when)) return;   // a parry or a landed heavy: the server sees those itself
    command('ability', { when, ...(ctx.enemy ? { enemy: ctx.enemy.netId, serial: ctx.enemy.netSerial } : {}), ...(ctx.action ? { action: ctx.action } : {}) });
  }
  function requestExecution(e) { if (!pendingExecution) { pendingExecution = e.netId; command('execute', { enemy: e.netId }); } }
  function rest(b) {
    const p = Game.player; p.closeRent(); p.hp = p.maxHp; p.stamina = p.maxStamina; p.refillItems(); p.vx = p.vz = 0; p.setState(PS.REST);
    command('rest', { bonfire: b.id }); hud.showRested(); events.emit('rest', { bonfire: b });
  }
  el('lobbyLeave').onclick = () => leave(); el('lobbyResume').onclick = hide;
  el('lobbyGuestResume').onclick = hide;
  el('lobbyRetry').onclick = () => needsReload ? location.reload() : join();
  el('lobbyAdventure').onchange = () => updateRoster();   // the row's click already sounds
  el('lobbyManage').onclick = () => {
    const open = panel.classList.toggle('managing-party'); el('lobbyManage').setAttribute('aria-expanded', String(open));
    if (open) el('lobbyPlayers').scrollTop = 0;
  };
  el('lobbyHelp').onclick = () => toggleLobbyHelp();
  el('lobbyControlsClose').onclick = () => toggleLobbyHelp(false);
  el('lobbyOptions').onclick = () => { closePanel(); Game.optionsFrom = 'lobby'; Game.showMenu('options'); };
  // Native keyboard focus stays inside the dialog, and the arrow keys move like the controller; a text box keeps its
  // own arrows. Roster refreshes retain the same controls, so a teammate joining never
  // interrupts typing or selection.
  const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  window.addEventListener('keydown', ev => {
    if (panel.classList.contains('hidden') || panel.inert) return;
    input.use('keyboard');   // announces 'device', which redraws the hints
    if (ARROWS[ev.code] && document.activeElement?.tagName !== 'INPUT' && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault(); lobbyMove(ARROWS[ev.code]); return;
    }
    if (ev.code === 'Backspace' && !el('lobbyNameEditor').hidden) { ev.preventDefault(); nameKey('delete'); return; }
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
  el('lobbyRestart').onclick = () => control('restart'); el('lobbyReturn').onclick = () => control('lobby'); el('lobbyNext').onclick = () => control('next');
  el('lobbyName').onchange = () => { const name = ArenaNet.name(el('lobbyName').value) || roster.find(p => p.id === self)?.name || ''; el('lobbyName').value = name; try { localStorage.setItem('combatArena.onlineName', name); } catch {} send({ type: 'name', name }); };
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
    const current = controls.indexOf(focus), step = direction === 'up' || direction === 'left' ? -1 : 1;
    focusLobbyControl(controls[(current + step + controls.length) % controls.length]);
  }
  function pad(pressed, dt = CONFIG.step) {
    if (!wipeScreen.hidden || summaryPad(pressed)) return;
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
      if (current === el('lobbyName')) openNameEditor();
      else if (current?.tagName === 'BUTTON') current.click();
    }
  }
  events.on('executionEnd', d => { if (active() && d.player === Game.player) command('executionEnd', { enemy: d.enemy.netId }); });
  Game.renderHooks.push(render);
  return { join, leave, show, hide, active, chapterCard, peek, heartbeat, activity, update, hit, parry, lifesteal, rest, requestExecution, pad,
    applySpectatorView, captureView, spectatorKey, spectatorPad, lobbyBack, abilityPad, abilityClaim,
    get abilityOpen() { return !abilityScreen.hidden; }, get abilityPending() { return !!ability; },
    get lobby() { return { ...peekState }; },
    get campaign() { return connected ? session?.campaign || null : null; },
    get waitingForTeamWipe() { return waitingForTeamWipe(); },
    get spectatorMode() { return waitingForTeamWipe(); },
    get runIntroActive() { return !runIntro.hidden; },
    get spectating() { return waitingForTeamWipe() && !!spectatorTarget; },
    get listener() { return waitingForTeamWipe() ? remotes.get(spectatorTarget)?.body || Game.player : Game.player; },
    get gauntlet() { return connected ? session?.gauntlet || null : null; },
    // Boss Rush's fight (v7.69.0): its number, the bosses beaten once it is won, its clock (the server's, s) and its par.
    // One object, refilled: the HUD reads it every frame.
    get rush() {
      const g = connected && loaded ? session?.gauntlet : null;
      if (!g?.run) return null;
      rushView.fight = g.number; rushView.beaten = g.defeated + 1 + (g.partners?.length || 0);
      rushView.crowned = !!g.crowned; rushView.modifiers = Array.isArray(g.modifiers) ? g.modifiers : noModifiers;
      rushView.clock = latestFrame?.fought || 0; rushView.par = session.par || 0;
      return rushView;
    },
    get connected() { return connected; }, get grantedEnemy() { return grantedEnemy; }, get panelOpen() { return !panel.classList.contains('hidden'); },
    get info() { return { self, leader, connected, ready, session, players: roster, ping, playback, spectatorTarget,
      frames: Math.max(0, ...[...tracks.values()].map(t => t.samples.length)), receivedFrames, remotes: remotes.size,
      playbackDelayMs: latestFrame && playback !== null ? Math.max(0, (latestFrame.time - playback) * 1000) : 0, server: latestFrame?.server }; },
  };
})();
