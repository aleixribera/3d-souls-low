'use strict';
// Boss Rush alone, with no server (PLAN.md track B item 1): the lobby's own session (js/lobby-host.js) and simulation
// (js/lobby-sim.js) run inside this page, in a hidden frame with its own globals, on the engine files the server loads
// (ArenaNet.engineScript) and the server's stand-ins for drawing (server/headless.cjs). multiplayer.js talks to it
// through a socket made here, so a run alone is the run online: the same bosses, curve, ability offers and end screen.
// The frame is built once, from the page's own script URLs (already cached), the first time a run starts.
const alone = (() => {
  const BUILD = 'alone';   // the hello's build: the frame's lobby runs this page's files, nothing to compare
  let booting = null, lobby = null, ticker = null;
  const hex = bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');
  const uuid = () => { const h = hex(16); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
  // The engine's scripts as this page loaded them (in order, with their cache keys), then the lobby's two.
  function scripts() {
    const base = new URL('js/', document.baseURI).href;
    const urls = [...document.querySelectorAll('script[src]')].map(s => s.src).filter(u => u.startsWith(base) && ArenaNet.engineScript(u.slice(base.length).split('?')[0]));
    const query = urls.length ? new URL(urls[0]).search : '';
    return urls.concat(ArenaNet.hostFiles.map(f => base + f + query));
  }
  function boot() {
    if (booting) return booting;
    booting = new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.hidden = true; frame.tabIndex = -1; frame.title = 'Boss Rush'; frame.setAttribute('aria-hidden', 'true');
      // The server's stand-ins (server/headless.cjs): a Vector3 and a Rig that hold nothing, no projectiles, no key labels.
      const stand = 'class Vector3 { constructor() { this.x = this.y = this.z = 0; } }\nclass Rig { dispose() {} }\n'
        + 'var THREE = { Vector3 }, THREE_ADDONS = {}, projectiles = { fire() {} }, bindLabel = () => \'\', SIM_MAX_BOTS = null;';
      frame.srcdoc = `<!doctype html><meta charset="utf-8"><script>${stand}<\/script>`
        + scripts().map(src => `<script src="${src.replace(/"/g, '&quot;')}"><\/script>`).join('');
      frame.onload = () => {
        const w = frame.contentWindow;
        if (!w || !w.host || !w.ArenaLobby) { booting = null; frame.remove(); reject(new Error('Boss Rush could not load its files.')); return; }
        resolve(w);
      };
      document.body.appendChild(frame);
    });
    return booting;
  }
  // `paused()`: the run holds (the pause menu, a hidden tab).
  function run(paused) {
    clearInterval(ticker);
    ticker = setInterval(() => { if (lobby) lobby.tick(paused()); }, 1000 / ArenaNet.config.tickRate);
  }
  // A socket to a new lobby in the frame: { readyState, send(text), close(), onopen, onmessage, onclose, onerror }, as a
  // WebSocket. Messages each way arrive in order, a task later, as over a network.
  function open(paused) {
    const client = { readyState: 0, bufferedAmount: 0, onopen: null, onmessage: null, onclose: null, onerror: null };
    let player = null, queue = [], flushing = false;
    const flush = () => { flushing = false; const out = queue; queue = []; for (const data of out) if (client.readyState === 1) client.onmessage?.({ data }); };
    const ended = (code, reason) => {
      if (client.readyState === 3) return;
      client.readyState = 3; server.readyState = 3;
      if (lobby && player) lobby.disconnect(player);
      lobby?.close(); lobby = null; clearInterval(ticker); ticker = null;
      setTimeout(() => client.onclose?.({ code, reason }));
    };
    const server = { readyState: 1, bufferedAmount: 0,
      send(text) { if (client.readyState !== 1) return; queue.push(text); if (!flushing) { flushing = true; setTimeout(flush); } },
      close(code = 1000, reason = '') { ended(code, reason); } };
    client.send = text => { if (client.readyState === 1 && lobby) lobby.receive(player, JSON.parse(text)); };
    client.close = (code = 1000, reason = '') => ended(code, reason);
    boot().then(w => {
      if (client.readyState !== 0) return;
      lobby?.close();
      // No weekly board alone, and the one player never goes idle: an end screen left open still offers Run again.
      lobby = w.ArenaLobby.createLobby({ sim: w.host, build: BUILD, capacity: 1, token: hex, uuid, activityNow: () => 0,
        board: { current: () => null, record: () => false } });
      player = lobby.connect(server);
      run(paused);
      client.readyState = 1; client.onopen?.();
    }, e => {
      console.error(e);
      client.readyState = 3; client.onerror?.(); client.onclose?.({ code: 1011, reason: e.message });
    });
    return client;
  }
  return { open, build: BUILD,
    // Developer builds and tests: the frame's simulation and lobby (null until the first run).
    get lobby() { return lobby; } };
})();
