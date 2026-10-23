'use strict';
// Opt-in co-op. Solo play never opens a socket or changes simulation authority.
CONFIG.multiplayer = ArenaNet.config;
const multiplayer = (() => {
  const C = CONFIG.multiplayer;
  let socket = null, self = null, leader = null, catalog = null, session = null, connected = false, capacity = C.defaultCapacity;
  let loaded = false, ready = false, starting = false, seq = 0, swing = 0, playback = null, ping = null;
  let remotes = new Map(), roster = [], lastPose = 0, lastPing = 0, pendingExecution = null;
  let intentionalClose = false, grantedEnemy = null, deferredStart = null, latestFrame = null, receivedFrames = 0, lastStats = 0;
  let reconnectWanted = false, reconnectTimer = null, reconnectAttempt = 0, joinAttempt = 0;
  let spectatorTarget = null, spectatorBarOpen = true, spectatorWasWaiting = false, spectatorViewApplied = false, lastView = null;
  let lobbyPadDirection = null, lobbyPadTimer = 0, adventureBeforeEdit = null, nameDraft = '', nameLowercase = false;
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
  panel.innerHTML = `<div class="lobby-card">
    <header class="lobby-header"><div><p class="lobby-kicker">COMBAT ARENA · ONLINE</p><h1 id="lobbyTitle">Public lobby</h1></div>
    <span id="lobbyConnection" class="lobby-connection">Connecting</span></header>
    <p id="lobbyStatus" role="status" aria-live="polite">Connecting…</p>
    <p id="lobbyNotice" role="alert" hidden></p>
    <div class="lobby-layout"><section class="lobby-adventure" aria-labelledby="lobbyAdventureTitle">
    <h2 id="lobbyAdventureTitle" class="lobby-section-label">Adventure</h2>
    <div id="lobbyCurrentLevel" class="online-level" hidden></div>
    <div id="lobbyLeader"><label for="lobbyAdventure">Choose your adventure</label><select id="lobbyAdventure" aria-describedby="lobbyAdventureSummary"></select>
    <p id="lobbyAdventureSummary" class="lobby-summary"></p>
    <div class="lobby-actions lobby-primary"><button id="lobbyResume">Return to game</button><button id="lobbyStart">Start together</button></div>
    <div id="lobbyRunActions" class="lobby-actions" role="group" aria-labelledby="lobbyRunTitle" hidden><p id="lobbyRunTitle" class="lobby-group-label">Party controls</p><button id="lobbyRestart">Restart level</button>
    <button id="lobbyNext">Next level</button><button id="lobbyReturn">Return everyone to lobby</button></div></div>
    <div id="lobbyWaiting"><p class="lobby-summary">Gathering your party…</p><button id="lobbyGuestResume">Return to game</button></div>
    <button id="lobbyRetry" hidden>Try again</button>
    <p id="lobbyLiveWarning" class="lobby-hint" hidden>The world keeps running while you are here.</p>
    </section><section class="lobby-party" aria-labelledby="lobbyPartyTitle">
    <div class="lobby-section-title"><h2 id="lobbyPartyTitle">Your party</h2><span id="lobbyCount"></span></div>
    <label for="lobbyName">Your name</label><input id="lobbyName" maxlength="24" autocomplete="nickname" placeholder="Your name" spellcheck="false">
    <section id="lobbyNameEditor" class="lobby-name-editor" aria-label="Edit your name" hidden>
      <output id="lobbyNamePreview" aria-live="polite"></output><div id="lobbyNameKeys"></div></section>
    <div id="lobbyPlayers" aria-label="Players"></div>
    <button id="lobbyManage" class="lobby-text-button" aria-expanded="false" aria-controls="lobbyPlayers" hidden>Manage party</button>
    <button id="lobbyAddBot" hidden>Add a friendly bot</button><p id="lobbyBotHint" class="lobby-hint" hidden></p>
    </section></div>
    <footer class="lobby-footer"><div class="lobby-actions"><button id="lobbyHelp" aria-expanded="false" aria-controls="lobbyControls">Controls</button>
    <button id="lobbyOptions">Options</button></div><button id="lobbyLeave" class="lobby-text-button">Leave lobby</button></footer>
    <section id="lobbyControls" class="lobby-controls" aria-labelledby="lobbyControlsTitle" hidden><h2 id="lobbyControlsTitle">Basic controls</h2>
    <p id="lobbyControlsDevice"></p><dl id="lobbyControlsList"></dl>
    <p class="lobby-controls-tip">Attacks, rolls and blocking use stamina. Ease off to let it refill. Talk / read: <span id="lobbyTalkKey"></span>.</p></section>
    <p id="lobbyPadHint" class="lobby-hint"></p>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `#publicLobby,#onlineParty,#onlineLeaderboard,#onlineSpectator,.online-name{--mp-gold:#dcbb74;--mp-gold-hi:#f3dca3;--mp-ink:#ece4d1;--mp-muted:#a9a798;--mp-faint:#7f7d72;--mp-line:#c9a96a2e;--mp-line-hi:#c9a96a66;--mp-panel:#14181af2;--mp-well:#0a0d0fb3;--mp-good:#a9cf8e;--mp-bad:#d89383}
    #publicLobby{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 18%,#2a2416ee,#0a0b0df8 72%);color:var(--mp-ink);font:14px/1.5 system-ui,sans-serif;padding:24px;overflow:auto;box-sizing:border-box;color-scheme:dark}
    #publicLobby.hidden,#publicLobby [hidden]{display:none!important}#publicLobby *{box-sizing:border-box}
    #publicLobby .lobby-card{position:relative;width:min(900px,100%);max-height:calc(100dvh - 48px);overflow:auto;padding:30px 32px 22px;border:1px solid var(--mp-line-hi);border-radius:10px;background:linear-gradient(160deg,#1e1f1b,#0f1315 70%);box-shadow:0 30px 100px #000a,inset 0 1px 0 #ffffff0d;scrollbar-width:thin;scrollbar-color:#756443 transparent;animation:lobby-arrive .22s ease-out}
    #publicLobby .lobby-card:before{content:'';position:absolute;left:32px;right:32px;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--mp-gold),transparent);opacity:.7}
    #publicLobby .lobby-header{display:flex;align-items:center;justify-content:space-between;gap:16px}#publicLobby h1{font:400 clamp(28px,4vw,38px)/1.15 Georgia,serif;letter-spacing:.04em;margin:6px 0 0;color:var(--mp-gold-hi)}
    #publicLobby .lobby-kicker{font-size:10px;font-weight:600;letter-spacing:.24em;color:var(--mp-gold);margin:0}
    #publicLobby .lobby-connection{flex:none;display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#d7d6c8;background:#ffffff08;border:1px solid #ffffff1a;border-radius:999px;padding:6px 12px}
    #publicLobby .lobby-connection:before{content:'';width:8px;height:8px;border-radius:50%;background:#c8a95f;box-shadow:0 0 0 3px #c8a95f26}#publicLobby[data-connected=true] .lobby-connection:before{background:var(--mp-good);box-shadow:0 0 0 3px #a9cf8e26}
    #lobbyStatus{margin:12px 0 22px;padding:10px 14px;border-radius:6px;background:#ffffff06;border:1px solid #ffffff0f;color:#cfcdc0;font-size:13px}
    #publicLobby .lobby-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(250px,.85fr);gap:20px}
    #publicLobby .lobby-adventure,#publicLobby .lobby-party{min-width:0;padding:20px;border:1px solid var(--mp-line);border-radius:8px;background:var(--mp-well)}
    #publicLobby h2{font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;margin:0;color:var(--mp-gold)}
    #publicLobby .lobby-section-label{margin-bottom:14px}#publicLobby .lobby-section-title{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:16px}
    #lobbyCount{font-size:11px;font-variant-numeric:tabular-nums;color:var(--mp-ink);background:#ffffff0d;border-radius:999px;padding:2px 9px}
    #publicLobby label{display:block;margin:0 0 7px;color:var(--mp-muted);font-size:12px}
    #publicLobby input,#publicLobby select{display:block;width:100%;padding:12px;background:#05080acc;color:#f3e8cd;border:1px solid #c9a96a40;font:inherit;border-radius:6px;min-height:44px;transition:border-color .15s}
    #publicLobby input:hover,#publicLobby select:hover{border-color:#c9a96a80}
    #publicLobby input:focus-visible,#publicLobby select:focus-visible{outline:2px solid var(--mp-gold-hi);outline-offset:2px}
    #publicLobby select{font:19px Georgia,serif;padding:13px 40px 13px 14px;appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--mp-gold) 50%),linear-gradient(135deg,var(--mp-gold) 50%,transparent 50%);background-position:calc(100% - 20px) 50%,calc(100% - 14px) 50%;background-size:6px 6px;background-repeat:no-repeat}
    #publicLobby select[size]{background-image:none;padding-right:12px;max-height:220px}#publicLobby select option,#publicLobby select optgroup{background:#161a19;color:#f3e8cd}
    #publicLobby button{min-height:40px;padding:9px 14px;background:#ffffff08;color:#e0dac8;border:1px solid #c9a96a40;border-radius:6px;cursor:pointer;font:inherit;transition:background .15s,color .15s,border-color .15s,transform .1s}
    #publicLobby button:hover{background:#dcbb741a;border-color:#c9a96aa0;color:#fff4d8}#publicLobby button:active{transform:translateY(1px)}
    #publicLobby button:focus-visible,#publicLobby.lobby-pad .pad-selected{outline:2px solid var(--mp-gold-hi);outline-offset:2px;background:#dcbb741f}
    #publicLobby button:disabled{opacity:.4;cursor:default;transform:none}#publicLobby .lobby-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
    #publicLobby .lobby-summary{min-height:4.6em;color:#b9b7a9;line-height:1.65;margin:12px 0 18px;font-size:13px;padding-left:12px;border-left:2px solid #c9a96a55}
    #publicLobby .lobby-primary{margin:0}#publicLobby .lobby-primary button{flex:1 1 160px;min-height:48px;font-size:15px}
    #publicLobby .lobby-primary #lobbyStart,#publicLobby #lobbyGuestResume{background:linear-gradient(115deg,#ead096,#c09d5c);color:#1d180e;border-color:#efd59c;font-weight:650;box-shadow:0 6px 20px #c09d5c33}
    #publicLobby .lobby-primary #lobbyStart:hover,#publicLobby #lobbyGuestResume:hover{background:linear-gradient(115deg,#f4dcaa,#cfab68);color:#1d180e}
    #publicLobby[data-running=true] .lobby-primary #lobbyStart{background:#ffffff08;color:#e0dac8;border-color:#c9a96a40;font-weight:400;box-shadow:none}
    #publicLobby[data-running=true] #lobbyResume{background:linear-gradient(115deg,#ead096,#c09d5c);color:#1d180e;border-color:#efd59c;font-weight:650;box-shadow:0 6px 20px #c09d5c33}
    #publicLobby #lobbyRunActions{margin:18px 0 0;padding-top:16px;border-top:1px solid var(--mp-line)}#publicLobby #lobbyRunActions button{flex:1 1 auto;font-size:12px}
    #publicLobby .lobby-group-label{flex-basis:100%;margin:0 0 2px;font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--mp-faint)}
    #publicLobby #lobbyReturn{border-color:#d8938366;color:#ecc2b7}#publicLobby #lobbyReturn:hover{background:#d8938318;border-color:#d89383}
    #lobbyWaiting .lobby-summary{min-height:0}#publicLobby #lobbyGuestResume{width:100%;min-height:48px}#publicLobby #lobbyRetry{width:100%;min-height:46px}
    #publicLobby .lobby-player{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;padding:8px 10px;margin-bottom:6px;border:1px solid #ffffff0d;border-radius:6px;background:#ffffff05}
    #publicLobby .lobby-player:before{content:attr(data-initial);flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#2b2f2c;border:1px solid #ffffff1f;color:#d8d3c2;font:600 13px/1 system-ui}
    #publicLobby .lobby-player[data-self=true]{border-color:#c9a96a55;background:#dcbb740d}#publicLobby .lobby-player[data-self=true]:before{background:#3a321f;border-color:var(--mp-gold);color:var(--mp-gold-hi)}
    #publicLobby .lobby-player-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #publicLobby .lobby-player[data-bot=true]:before{background:#23312c;border-color:#a9cf8e66;color:var(--mp-good)}
    #publicLobby .lobby-player-role.bot{background:#a9cf8e;}#publicLobby #lobbyAddBot{width:100%;margin-top:8px;border-style:dashed}
    #publicLobby .lobby-bot-remove{font-size:11px;padding:4px 10px;min-height:32px;margin-left:auto}
    #publicLobby .lobby-player-role{font-size:10px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:#1d180e;background:var(--mp-gold);border-radius:999px;padding:2px 8px}
    #lobbyPlayers{max-height:200px;overflow:auto;scrollbar-width:thin;scrollbar-color:#756443 transparent;margin:16px 0 6px}
    #publicLobby .lobby-player-actions{display:none;flex-basis:100%;gap:6px;padding-left:40px}#publicLobby.managing-party .lobby-player-actions{display:flex}
    #publicLobby .lobby-player button{font-size:11px;padding:4px 10px;min-height:32px}
    #publicLobby .lobby-text-button{border-color:transparent;background:transparent;font-size:12px;color:var(--mp-muted)}#publicLobby .lobby-text-button:hover{color:var(--mp-ink)}
    #publicLobby .lobby-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--mp-line)}#publicLobby .lobby-footer .lobby-actions{margin:0}#publicLobby .lobby-footer button{font-size:12px}
    #publicLobby #lobbyLeave{color:#d6a597}#publicLobby #lobbyLeave:hover{color:#f1c4b6;background:#d8938314}
    #lobbyNotice{padding:10px 14px;border:1px solid #d1ad664d;border-left:3px solid var(--mp-gold);border-radius:6px;background:#c4a45e12;color:#ecd59d;font-size:13px;margin:-10px 0 20px;overflow-wrap:anywhere}
    #publicLobby .lobby-hint{font:12px/1.6 system-ui;color:var(--mp-muted);margin:12px 0 0}#lobbyPadHint{text-align:center;margin:14px 0 0}#lobbyPadHint:empty{display:none}
    #publicLobby .lobby-name-editor{margin:12px 0;padding:14px;border:1px solid var(--mp-line-hi);border-radius:8px;background:#151c1b}
    #lobbyNameEditor[hidden]{display:none}#lobbyNamePreview{display:block;min-height:1.5em;padding:10px 12px;margin-bottom:12px;border-radius:6px;background:#0b100f;color:#fff0c9;font-size:17px;white-space:pre-wrap;overflow-wrap:anywhere}
    #lobbyNameKeys{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:5px}#publicLobby #lobbyNameKeys button{min-height:40px;padding:6px 0;font:14px system-ui}
    #publicLobby.editing-name .lobby-layout{grid-template-columns:1fr}#publicLobby.editing-name .lobby-adventure{display:none}
    #publicLobby #lobbyNameKeys .name-action{grid-column:span 2;font-size:12px}
    #publicLobby .lobby-controls{margin:18px 0 0;padding:18px;background:var(--mp-well);border:1px solid var(--mp-line);border-radius:8px;font:13px/1.5 system-ui}
    #lobbyControlsDevice{margin:4px 0 14px;color:var(--mp-muted);font-size:11px}
    #lobbyControlsList{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 24px;margin:0}
    #lobbyControlsList div{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:4px 0;border-bottom:1px solid #ffffff0a}#lobbyControlsList dt{color:#c9cbc1}
    #lobbyControlsList dd{margin:0;text-align:right;color:#fff1cf;font-weight:600;font-size:12px;background:#ffffff0d;border:1px solid #ffffff17;border-radius:4px;padding:1px 7px}
    #publicLobby .lobby-controls-tip{margin:12px 0 0;color:#bdbeb3;font-size:12px}
    @keyframes lobby-arrive{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:650px){#publicLobby{padding:10px}#publicLobby .lobby-card{padding:22px 16px 16px;max-height:calc(100dvh - 20px)}#publicLobby .lobby-card:before{left:16px;right:16px}#publicLobby .lobby-layout{grid-template-columns:1fr;gap:14px}#publicLobby .lobby-adventure,#publicLobby .lobby-party{padding:16px}#publicLobby .lobby-summary{min-height:0}#lobbyControlsList{grid-template-columns:1fr}#lobbyPlayers{max-height:150px}#publicLobby .lobby-header{align-items:flex-start}#publicLobby .lobby-connection{margin-top:4px}#publicLobby .lobby-footer{margin-top:16px;flex-wrap:wrap}#lobbyStatus{margin:10px 0 16px}}
    @media(max-height:560px) and (min-width:651px){#publicLobby .lobby-card{padding:18px 24px 14px}#publicLobby h1{font-size:26px}#lobbyStatus{margin:8px 0 12px;padding:6px 12px}#publicLobby .lobby-adventure,#publicLobby .lobby-party{padding:14px}#publicLobby .lobby-summary{min-height:0;font-size:12px;line-height:1.5;margin:8px 0 12px}#publicLobby .lobby-footer{margin-top:12px;padding-top:10px}}
    #onlineParty{position:fixed;right:18px;top:42px;z-index:25;width:210px;max-width:calc(100vw - 36px);box-sizing:border-box;pointer-events:none;color:var(--mp-ink);font:12px/1.5 system-ui;text-shadow:0 1px 2px #000;background:linear-gradient(160deg,#12171acc,#0d1113a8);padding:10px 12px;border:1px solid var(--mp-line);border-radius:8px;box-shadow:0 8px 24px #0006;backdrop-filter:blur(3px)}
    .online-level{margin:0 0 8px;color:var(--mp-gold-hi,#f3dca3);font:600 11px/1.4 system-ui;text-align:left;letter-spacing:.1em;text-transform:uppercase}
    #publicLobby .online-level{display:inline-block;margin:0 0 14px;padding:3px 10px;border:1px solid var(--mp-line-hi);border-radius:999px;background:#dcbb7412}
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
    const rows = latestFrame?.results;
    if (rows && !leaderboardRows) {
      leaderboardRows = rows;
      el('leaderboardEncounter').textContent = session.kind === 'level' ? Game.level.name : [session.id, ...(session.partners || [])].map(id => ENEMY_BY_ID[id].name).join(' & ');
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
  wipeScreen.innerHTML = '<div class="wipe-message"><p class="wipe-kicker" id="teamWipeKicker">BOSS ONLY · RUN ENDED</p><h1>TEAM WIPED</h1><div class="wipe-rule"></div><p id="teamWipeScore"></p><p class="wipe-return">Returning to lobby…</p></div>';
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
    el('teamWipeKicker').textContent = `${run?.name || 'BOSS ONLY'} · RUN ENDED`;
    el('teamWipeScore').textContent = run ? `Bosses defeated · ${run.defeated ?? run.number - 1} / ${run.bosses ?? run.total}` : '';
    panel.inert = true; wipeScreen.hidden = false; input.clear(); wipeScreen.focus();
    wipeTimer = setTimeout(() => {
      clearTeamWipe();
      if (connected) { show(); if (!usingPad()) el('lobbyLeave').focus(); }
    }, C.teamWipeScreenTime * 1000);
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
      return { id: p.id, hp, name: p.name + (p.id === self ? ' (you)' : p.bot ? ' (bot)' : ''), status: hp === null || hp === undefined ? 'Loading' : hp > 0 ? 'Alive' : 'Fallen' };
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
    const preferred = [el('lobbyResume'), el('lobbyGuestResume'), el('lobbyAdventure'), el('lobbyRetry'), el('lobbyName')].find(node => controls.includes(node));
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
    closeAdventurePicker(true); nameDraft = el('lobbyName').value; el('lobbyNameEditor').hidden = false;
    panel.classList.add('editing-name');
    el('lobbyNamePreview').textContent = nameDraft || 'Your name'; buildNameKeys(); updateLobbyPadHint();
  }
  function lobbyBack() {
    if (!wipeScreen.hidden) return;
    if (!el('lobbyNameEditor').hidden) closeNameEditor();
    else if (adventureBeforeEdit !== null) closeAdventurePicker(true);
    else if (!el('lobbyControls').hidden) { el('lobbyHelp').click(); el('lobbyHelp').focus(); }
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
    updateLeaderboard();
    party.hidden = !active() || Game.mode !== 'play' || Game.loading > 0 || !panel.classList.contains('hidden') || !runIntro.hidden;
    if (party.hidden) for (const remote of remotes.values()) remote.label.hidden = true;
  }
  function show() {
    closeNameEditor(false, false); closeAdventurePicker(true);
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
  function hide() { closeNameEditor(false, false); closeAdventurePicker(true); closePanel(); if (active()) Game.resume(); overlayVisibility(); }
  function active() { return connected && !!session && loaded; }
  function chapterCard(id) {
    const chapter = connected && session?.campaign && STORIES.find(s => s.id === session.campaign.id)?.chapters.find(c => c.level === id);
    return chapter ? [chapter.title, chapter.line] : null;
  }
  function clearRemotes() { for (const r of remotes.values()) { r.body.rig.dispose(); r.label.remove(); } remotes.clear(); }
  function resetStream() { clearLeaderboard(); clearTeamWipe(); clearRunIntro(); tracks.clear(); decoder.reset(); latestFrame = null; receivedFrames = 0; playback = null; ready = false; lastPose = 0; pendingExecution = null; deferredStart = null; resetSpectator(); }
  function retryConnection(message) {
    if (!reconnectWanted) return;
    leave(message, true);
    notice('Reconnecting automatically… You can leave the lobby to cancel.');
    const delay = Math.min(C.reconnectMaxDelay, C.reconnectDelay * 2 ** Math.min(reconnectAttempt++, C.reconnectBackoffSteps));
    reconnectTimer = setTimeout(() => { reconnectTimer = null; join(true); }, delay);
  }
  function leave(message = '', retry = false) {
    publishPose();
    closeNameEditor(false, false); closeAdventurePicker(true);
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
  function adventureSummary() {
    const value = el('lobbyAdventure').value, id = value.slice(value.indexOf('/') + 1);
    const campaign = STORIES.find(s => s.id === id);
    el('lobbyAdventureSummary').textContent = C.gauntlets[id]
      ? `${catalog?.bosses.length || ''} bosses${C.gauntlets[id].size > 1 ? `, ${C.gauntlets[id].size} at a time` : ''}, one shared run. Full refills between fights. Fallen players spectate; a team wipe ends the run.${C.gauntlets[id].then ? ` Survive to face ${C.gauntlets[C.gauntlets[id].then].name}.` : ''}`
      : campaign ? `${campaign.chapters.length} chapters. Explore together, share checkpoints, and continue automatically. Fall and return at your checkpoint.`
      : 'Play this encounter together.';
  }
  function updateRoster() {
    const previousFocus = panel.contains(document.activeElement) ? document.activeElement : null, focusKey = previousFocus?.dataset.padKey;
    const owner = connected && self === leader;
    if (!owner && adventureBeforeEdit !== null) closeAdventurePicker(true);
    if (connected) el('lobbyStatus').textContent = owner ? session ? 'You lead the party. Your adventure is in progress.' : 'You lead the party. Choose an adventure and start when you are ready.'
      : leader ? `${roster.find(p => p.id === leader)?.name || 'The leader'} leads the party.` : 'Use your keyboard, mouse or controller to become the leader.';
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
    el('lobbyStart').textContent = controlPending === 'start' ? 'Starting…' : session ? 'Start new adventure' : 'Start together';
    el('lobbyManage').hidden = !owner || roster.filter(p => !p.bot).length < 2;
    const botCount = roster.filter(p => p.bot).length;
    el('lobbyAddBot').hidden = !owner; el('lobbyAddBot').disabled = !connected || botCount >= C.maxBots;
    el('lobbyBotHint').hidden = !owner;
    el('lobbyBotHint').textContent = botCount >= C.maxBots ? `The party has its ${C.maxBots} bots.` : 'Bots fight beside you with the same moves: rolls, parries, combos and executions.';
    if (!owner) { panel.classList.remove('managing-party'); el('lobbyManage').setAttribute('aria-expanded', 'false'); }
    el('lobbyWaiting').firstElementChild.textContent = session ? 'Your party is already in an adventure. Jump back in when you are ready.' : 'The leader chooses the adventure and starts for everyone.';
    updateConnection(); adventureSummary();
    const signature = JSON.stringify({ roster: roster.map(p => [p.id, p.name, !!p.bot]), self, leader, owner });
    if (signature !== rosterSignature) {
      rosterSignature = signature; el('lobbyPlayers').textContent = '';
      for (const p of roster) {
        const row = document.createElement('div'); row.className = 'lobby-player';
        row.dataset.self = String(p.id === self); row.dataset.bot = String(!!p.bot); row.dataset.initial = ([...p.name.trim()][0] || '?').toUpperCase();
        const name = document.createElement('span'); name.className = 'lobby-player-name'; name.textContent = `${p.name}${p.id === self ? ' (you)' : ''}`; name.title = name.textContent; row.appendChild(name);
        if (p.id === leader) { const role = document.createElement('span'); role.className = 'lobby-player-role'; role.textContent = 'Leader'; row.appendChild(role); }
        if (p.bot) {
          const role = document.createElement('span'); role.className = 'lobby-player-role bot'; role.textContent = 'Bot'; row.appendChild(role);
          if (owner) {
            const button = document.createElement('button'); button.className = 'lobby-bot-remove'; button.textContent = 'Remove';
            button.setAttribute('aria-label', `Remove bot: ${p.name}`); button.dataset.padKey = 'removeBot/' + p.id;
            button.onclick = () => control('removeBot', { player: p.id }); row.appendChild(button);
          }
          el('lobbyPlayers').appendChild(row); continue;
        }
        const actions = document.createElement('div'); actions.className = 'lobby-player-actions'; row.appendChild(actions);
        if (owner && p.id !== self) for (const [text, action] of [['Make leader', 'transfer'], ['Remove', 'kick']]) {
          const button = document.createElement('button'); button.textContent = text;
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
    const levelTag = session?.gauntlet ? `${session.gauntlet.name || 'BOSS ONLY'} · ${session.gauntlet.number}/${session.gauntlet.total}` : number ? `Level ${number}${road ? '/' + road.total : ''}` : '';
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
      const stories = catalog.campaigns.filter(entry => STORIES.some(s => s.id === entry.id && s.lobbyName));
      for (const [label, kind, entries] of [['Stories', 'campaign', stories], ['Challenge', 'gauntlet', Object.entries(C.gauntlets).map(([id, run]) => ({ id, name: run.name }))]]) {
        const group = document.createElement('optgroup'); group.label = label;
        for (const entry of entries) { const option = document.createElement('option'); option.value = `${kind}/${entry.id}`; option.textContent = kind === 'campaign' ? STORIES.find(s => s.id === entry.id)?.lobbyName || entry.name : entry.name; group.appendChild(option); }
        select.appendChild(group);
      }
      select.value = `${catalog.defaultAdventure.kind}/${catalog.defaultAdventure.id}`;
      el('lobbyStatus').textContent = 'Connected. Anyone with this link can join.'; updateRoster();
    } else if (msg.type === 'roster') {
      roster = msg.players; leader = msg.leader; updateRoster();
      if (msg.notice && roster.length > 1) notice(msg.notice, true);
    } else if (msg.type === 'start') {
      clearControlPending(); notice('');
      finale.cancelEnding();
      const tipsRemaining = session && !msg.opening ? hud.controlsTipsTimer : CONFIG.hud.controlsTipsTime;
      session = msg.session; loaded = false; seq = 0; resetStream(); clearRemotes();
      if (msg.opening) runIntroPending = session.gauntlet?.id || session.campaign?.id || null;
      const current = session;
      Game.story = false; Game.eldenBoss = null; closePanel();
      const loadingCard = session.kind === 'arena' ? Game.duelCard(session.id, session.partners || []) : Game.levelCard(session.id);
      el('lobbyAdventure').value = session.gauntlet ? `gauntlet/${session.gauntlet.id}` : session.campaign ? `campaign/${session.campaign.id}` : `${session.kind}/${session.id}`;
      const begin = () => {
        if (session !== current || !connected) return;
        if (Game.pendingLoad) { deferredStart = begin; return; }
        Game.loadingFirst(...loadingCard, () => {
          if (session !== current || !connected) return;
          if (session.kind === 'level') Game.startLevel(session.id); else Game.startFight(session.id, session.partners || []);
          Game.spawn = { ...session.spawn }; Game.spawnPlayer(); restorePlayer(msg.resume);
          hud.controlsTipsTimer = tipsRemaining;
          for (const e of Game.enemies) e.netId = e.key || 'duel/' + e.baseDef.id;
          loaded = true; updateRoster();
        });
      };
      begin();
    } else if (msg.type === 'stop') {
      clearControlPending();
      const endedRun = session?.gauntlet;
      finale.cancelEnding();
      session = null; loaded = false; resetStream(); clearRemotes(); Game.loading = 0; el('loading').classList.remove('show');
      if (Game.player) Game.clearActors(); Game.showMenu('main'); show(); notice(msg.message || 'The leader returned everyone to the lobby.');
      if (msg.reason === 'team-wipe') showTeamWipe(endedRun);
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
    } else if (msg.type === 'pong') { ping = Math.max(0, Math.round(performance.now() - msg.sent)); updateConnection(); }
    else if (msg.type === 'error') { clearControlPending(); updateRoster(); notice(msg.message); }
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
    p.exhausted = !!s.exhausted; p.grounded = !!s.grounded; p.peak = p.y;
    for (const key of ['vx', 'vy', 'vz']) p[key] = !p.grounded && ArenaNet.finite(s[key]) ? s[key] : 0;
    p.setState(p.hp <= 0 || s.state === PS.DEAD ? PS.DEAD : p.grounded ? PS.IDLE : PS.FALL);
    p.savePrev(); Game.deathTimer = 0; Game.cam.yaw = p.yaw; Game.updateCamera(0, true);
  }
  function capturePose(p) {
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, hp: p.hp, state: p.state, stateTime: p.stateTime,
      attack: p.attack?.id || null, attackT: p.attackT, charge: p.charge, chargeT: p.chargeT,
      walkPhase: p.walkPhase, grounded: p.grounded, execEnemy: p.exec?.enemy.netId || null,
      vx: p.vx, vy: p.vy, vz: p.vz, activeAt: Number.isFinite(p.activeAt) ? p.activeAt : -1,
      stamina: p.stamina, flasks: p.item('flask').count, exhausted: p.exhausted, staminaDelay: p.staminaDelay,
      poise: clamp(p.poise, 0, p.maxPoise), poiseTimer: Math.min(p.poiseTimer, CONFIG.player.poiseResetTime), doomTime: p.doomTime, doomDrain: p.doomDrain,
      landTime: p.landTime, stunTime: p.stunTime, view: session.teamWipeOnly && p.alive() ? lastView : null };
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
      r.name.textContent = s.name + (s.bot ? ' · Bot' : '') + (s.hp <= 0 ? session.teamWipeOnly ? ' · defeated' : ' · returning to checkpoint' : '');
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
      e.hp = s.hp; e.posture = s.posture; e.guardMeter = s.guardMeter; e.poise = s.poise;
      e.attack = s.attack ? e.baseDef.attacks.find(x => x.id === s.attack) : null;
      e.hitIndex = s.hitIndex; e.netSerial = s.serial; e.netTarget = s.target; e.grounded = s.grounded;
      e.walkPhase = s.walkPhase; e.leaping = s.leaping; e.asleep = false;
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
      p.attack = PLAYER_DEF.moveset.attacks[a.attack] || null; p.charge = a.charge; p.chargeT = a.chargeT + (a.charge === 1 ? Math.max(0, now - a.at) : 0); p.walkPhase = lerp(a.walkPhase, b.walkPhase, f);
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
  el('lobbyGuestResume').onclick = hide;
  el('lobbyRetry').onclick = () => needsReload ? location.reload() : join();
  el('lobbyAdventure').onchange = () => { adventureSummary(); events.emit('menuAdjust', { dir: 1 }); };
  el('lobbyManage').onclick = () => {
    const open = panel.classList.toggle('managing-party'); el('lobbyManage').setAttribute('aria-expanded', String(open));
    if (open) el('lobbyPlayers').scrollTop = 0;
  };
  el('lobbyHelp').onclick = () => {
    const open = el('lobbyControls').hidden; el('lobbyControls').hidden = !open;
    el('lobbyHelp').setAttribute('aria-expanded', String(open));
    if (open) el('lobbyControls').scrollIntoView({ block: 'nearest' });
  };
  el('lobbyOptions').onclick = () => { closePanel(); Game.optionsFrom = 'lobby'; Game.showMenu('options'); };
  // Native keyboard focus stays inside the dialog. Roster refreshes retain the
  // same controls, so a teammate joining never interrupts typing or selection.
  window.addEventListener('keydown', ev => {
    if (panel.classList.contains('hidden') || panel.inert) return;
    input.use('keyboard');
    if (ev.code !== 'Tab') return;
    const controls = lobbyControls(), at = controls.indexOf(document.activeElement);
    ev.preventDefault();
    const next = at < 0 ? ev.shiftKey ? controls.length - 1 : 0 : (at + (ev.shiftKey ? -1 : 1) + controls.length) % controls.length;
    focusLobbyControl(controls[next]);
  }, true);
  panel.addEventListener('focusin', ev => { if (ev.target.matches('button,input,select')) events.emit('menuMove'); });
  panel.addEventListener('click', ev => {
    const button = ev.target.closest('button');
    if (button && !button.disabled && !['lobbyResume', 'lobbyGuestResume'].includes(button.id)) events.emit(button.id === 'lobbyLeave' ? 'menuBack' : 'menuConfirm');
  });
  el('lobbyStart').onclick = () => { const value = el('lobbyAdventure').value, slash = value.indexOf('/'); control('start', { kind: value.slice(0, slash), id: value.slice(slash + 1) }); };
  el('lobbyAddBot').onclick = () => control('addBot');
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
    get listener() { return waitingForTeamWipe() ? remotes.get(spectatorTarget)?.body || Game.player : Game.player; },
    get gauntlet() { return connected ? session?.gauntlet || null : null; },
    get connected() { return connected; }, get grantedEnemy() { return grantedEnemy; }, get panelOpen() { return !panel.classList.contains('hidden'); },
    get info() { return { self, leader, connected, ready, session, players: roster, ping, playback, spectatorTarget,
      frames: Math.max(0, ...[...tracks.values()].map(t => t.samples.length)), receivedFrames, remotes: remotes.size,
      playbackDelayMs: latestFrame && playback !== null ? Math.max(0, (latestFrame.time - playback) * 1000) : 0, server: latestFrame?.server }; },
  };
})();
