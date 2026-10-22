'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const net = require('../js/net-protocol.js');
const { createSimulation, build, root } = require('./headless.cjs');
const C = net.config;

function createServer(options = {}) {
  const capacity = Number(options.capacity ?? process.env.MAX_PLAYERS ?? C.defaultCapacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > C.maxCapacity) throw new Error(`MAX_PLAYERS must be an integer from 2 to ${C.maxCapacity}`);
  const sim = createSimulation(), clients = new Map();
  const activityNow = options.activityNow || (() => performance.now());
  const lobbyNow = options.lobbyNow || (() => performance.now());
  let emptySince = null;
  let leader = null, session = null, last = performance.now(), accumulator = 0, sinceSnapshot = 0;
  let arenaWipeFor = 0, bossLoadFor = 0, bossStarted = false;
  let metricsAt = last, ticks = 0, payloadBytes = 0, tickTimes = [];
  let metrics = { hz: 0, tickMs: 0, bytesPerSecond: 0, websocketBytesPerSecond: 0, bufferedBytes: 0 };
  const roster = () => ({ type: 'roster', leader, capacity, session, players: [...clients.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready, hp: p.pose?.hp ?? null })) });
  function send(p, data) {
    if (p.ws.readyState !== WebSocket.OPEN) return;
    if (p.ws.bufferedAmount > C.maxBuffered) { p.ws.close(1013, 'Connection too slow. Rejoin the lobby.'); return; }
    const body = JSON.stringify(data); payloadBytes += Buffer.byteLength(body); p.ws.send(body);
  }
  function broadcast(data) { for (const p of clients.values()) send(p, data); }
  const isActive = (p, now) => p?.hello && p.ws.readyState === WebSocket.OPEN
    && Number.isFinite(p.lastActivity) && now - p.lastActivity < C.leaderIdle;
  function refreshLeader(reason = 'idle', now = activityNow()) {
    if (isActive(clients.get(leader), now)) return false;
    const previous = leader;
    leader = [...clients.values()].find(p => isActive(p, now))?.id || null;
    if (previous === leader) return false;
    const next = clients.get(leader);
    const prefix = previous ? reason === 'disconnect' ? 'The leader left. ' : 'The leader was inactive for five minutes. ' : '';
    broadcast({ ...roster(), notice: prefix + (next ? `${next.name} is now the leader.` : 'No active leader. Press a key, move the mouse or use your controller to lead.') });
    return true;
  }
  function noteActivity(p) {
    const now = activityNow();
    refreshLeader('idle', now);
    p.lastActivity = now;
    if (!leader) refreshLeader('idle', now);
  }
  const playerFrames = () => [...clients.values()].filter(p => p.ready && p.pose).map(p => ({ ...p.pose, id: p.id, name: p.name, poseSeq: p.poseSeq }));
  function sendFrame(p, frame, players) { if (p.hello && p.ready) send(p, p.encoder.encode({ ...frame, server: metrics }, players)); }
  function updateMetrics(now) {
    if (now - metricsAt < C.metricsInterval) return;
    const span = (now - metricsAt) / 1000, sorted = tickTimes.slice().sort((a, b) => a - b);
    let buffered = 0, written = 0;
    for (const p of clients.values()) {
      buffered = Math.max(buffered, p.ws.bufferedAmount);
      const bytes = p.ws._socket?.bytesWritten || 0; written += Math.max(0, bytes - p.lastWritten); p.lastWritten = bytes;
    }
    metrics = { hz: Math.round(ticks / span), tickMs: Math.round((sorted[Math.floor(sorted.length * 0.95)] || 0) * C.wirePrecision) / C.wirePrecision,
      bytesPerSecond: Math.round(payloadBytes / span), websocketBytesPerSecond: Math.round(written / span), bufferedBytes: buffered };
    metricsAt = now; ticks = 0; payloadBytes = 0; tickTimes = [];
  }
  const syncPlayers = () => sim.setPlayers([...clients.values()].filter(p => p.ready && p.pose && performance.now() - p.lastPose < C.stalePlayer * 1000).map(p => ({ ...p.pose, id: p.id })));
  const error = (p, message) => send(p, { type: 'error', message });
  function stop(message, reason = null) {
    session = null; emptySince = null;
    for (const p of clients.values()) { p.ready = false; p.pose = null; p.encoder.reset(); }
    broadcast({ type: 'stop', message, reason }); broadcast(roster());
  }
  function expireEmptyLobby() {
    if (session && emptySince !== null && lobbyNow() - emptySince >= C.emptyLobbyTimeout)
      stop('The previous party left. Choose an adventure to start a fresh run.');
  }
  function start(kind, id, campaignId = null, boss = undefined, opening = false) {
    const gauntlet = kind === 'gauntlet' && id === 'boss-only' ? sim.gauntlet(boss) : null;
    if (kind === 'gauntlet' && !gauntlet) throw new Error('Unknown boss run');
    if (gauntlet) { kind = 'arena'; id = gauntlet.boss; }
    const campaign = kind === 'campaign' ? sim.campaign(id) : campaignId ? sim.campaign(campaignId, id) : null;
    if ((kind === 'campaign' || campaignId) && !campaign) throw new Error('Unknown campaign or chapter');
    if (campaign) { kind = 'level'; id = campaign.level; }
    session = sim.start(kind, id);
    if (gauntlet) session.gauntlet = gauntlet;
    if (campaign) session.campaign = campaign;
    if (opening && (campaign?.intro || gauntlet)) session.opening = true;
    for (const p of clients.values()) { p.ready = false; p.pose = null; p.arenaDefeated = false; p.claims.clear(); p.lastSeq = 0; p.encoder.reset(); }
    arenaWipeFor = 0; bossLoadFor = 0; bossStarted = false;
    accumulator = 0; sinceSnapshot = 0; server.lastSignature = null;
    broadcast({ type: 'start', session, opening: !!session.opening }); broadcast(roster());
  }
  function message(p, msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    if (msg.type === 'hello') {
      if (p.hello) return;
      if (msg.protocol !== C.protocol || msg.build !== build) { p.ws.close(1008, 'Game updated. Reload this page.'); return; }
      // Check before welcoming the player: an expired run must never send a
      // stale start packet, even if the interval has not processed expiry yet.
      expireEmptyLobby(); emptySince = null;
      p.name = net.name(msg.name) || p.name; p.hello = true;
      noteActivity(p);
      send(p, { id: p.id, build, catalog: sim.catalog(), ...roster(), type: 'welcome' });
      if (session) send(p, { type: 'start', session });
      broadcast(roster()); return;
    }
    if (!p.hello) return;
    // Poses, transport keepalives, loading and animation clocks are not input.
    if (msg.type === 'activity') { noteActivity(p); return; }
    if (msg.type === 'ping') { send(p, { type: 'pong', sent: msg.sent }); return; }
    if (msg.type === 'name') { noteActivity(p); p.name = net.name(msg.name) || p.name; broadcast(roster()); return; }
    if (msg.type === 'control') {
      noteActivity(p);
      if (p.id !== leader) { error(p, 'Only the lobby leader can use that control.'); return; }
      if (msg.action === 'start') {
        if (!['campaign', 'level', 'arena', 'gauntlet'].includes(msg.kind) || !net.id(msg.id)) return;
        try { start(msg.kind, msg.id, null, undefined, true); } catch (e) { error(p, e.message); }
      } else if (msg.action === 'restart' && session) session.gauntlet ? start('gauntlet', 'boss-only', null, undefined, true) : start(session.kind, session.id, session.campaign?.id);
      else if (msg.action === 'lobby') {
        stop('The leader returned everyone to the lobby.');
      } else if (msg.action === 'next' && session && !session.gauntlet) {
        const game = sim.inspect().Game, next = session.campaign ? session.campaign.next : game.level.next;
        if (game.complete && next && sim.catalog().levels.some(l => l.id === next)) start('level', next, session.campaign?.id);
        else error(p, 'Finish this level first, or select another level.');
      } else if (msg.action === 'transfer' && clients.has(msg.player) && clients.get(msg.player).hello) {
        if (!isActive(clients.get(msg.player), activityNow())) { error(p, 'That player is inactive. They must provide input before becoming leader.'); return; }
        leader = msg.player; broadcast(roster());
      } else if (msg.action === 'kick' && msg.player !== p.id && clients.has(msg.player)) clients.get(msg.player).ws.close(1008, 'Removed by the lobby leader.');
      return;
    }
    if (!session || msg.epoch !== session.epoch) return;
    if (msg.type === 'ready') { p.ready = true; p.encoder.reset(); sendFrame(p, sim.frame(false), playerFrames()); broadcast(roster()); return; }
    if (!p.ready) return;
    if (msg.type === 'pose') {
      const s = msg.pose;
      if (!s || !['x', 'y', 'z', 'yaw', 'hp', 'stateTime', 'attackT', 'chargeT', 'walkPhase'].every(k => net.finite(s[k]))) return;
      // Whitelist fields: remote data never becomes a Player object or arbitrary properties.
      const states = ['idle', 'walk', 'jump', 'fall', 'roll', 'attack', 'jumpAttack', 'land', 'block', 'parry', 'useItem', 'rest', 'hurt', 'stagger', 'dead', 'execute'];
      if (!states.includes(s.state) || typeof s.grounded !== 'boolean' || s.hp < 0 || s.hp > sim.playerMaxHp || s.stateTime < 0 || s.attackT < 0) return;
      // A personal respawn cannot re-enter an ongoing boss attempt. Only a new
      // shared session clears this player's defeat, including repeated ready messages.
      if (session.teamWipeOnly && (s.hp <= 0 || s.state === 'dead')) p.arenaDefeated = true;
      p.pose = { x: s.x, y: s.y, z: s.z, yaw: s.yaw, hp: s.hp, state: s.state, stateTime: s.stateTime,
        attack: typeof s.attack === 'string' ? s.attack.slice(0, 60) : null,
        attackT: s.attackT, chargeT: s.chargeT, charge: Math.min(2, Math.max(0, Number(s.charge) || 0)),
        walkPhase: s.walkPhase, grounded: s.grounded, execEnemy: net.id(s.execEnemy) ? s.execEnemy : null,
        vx: net.finite(s.vx) ? s.vx : 0, vy: net.finite(s.vy) ? s.vy : 0, vz: net.finite(s.vz) ? s.vz : 0,
        activeAt: net.finite(s.activeAt) ? s.activeAt : -1, landTime: net.finite(s.landTime) ? s.landTime : 0,
        stunTime: net.finite(s.stunTime) ? s.stunTime : 0,
        view: net.cameraView(s.view) };
      if (session.teamWipeOnly && p.arenaDefeated) { p.pose.hp = 0; p.pose.state = 'dead'; p.pose.attack = null; }
      p.lastPose = performance.now(); p.poseSeq++; return;
    }
    if (!Number.isSafeInteger(msg.seq) || msg.seq <= p.lastSeq) return;
    p.lastSeq = msg.seq; syncPlayers();
    if (session.teamWipeOnly && p.arenaDefeated && msg.type !== 'executionEnd') return;
    if (msg.type === 'hit') {
      if (!net.id(msg.enemy) || !net.id(msg.swing) || !net.id(msg.attack)) return;
      const key = `${msg.swing}/${msg.enemy}`;
      if (p.claims.has(key)) return;
      p.claims.add(key); if (p.claims.size > C.maxClaims) p.claims.delete(p.claims.values().next().value);
      sim.hit(p.id, msg);
    } else if (msg.type === 'parry') {
      const key = `parry/${msg.enemy}/${msg.serial}`;
      if (p.claims.has(key)) return; p.claims.add(key); if (p.claims.size > C.maxClaims) p.claims.delete(p.claims.values().next().value); sim.parry(p.id, msg);
    } else if (msg.type === 'execute') {
      const accepted = sim.beginExecution(p.id, msg);
      send(p, { type: 'execution', enemy: msg.enemy, accepted });
    } else if (msg.type === 'executionEnd') {
      sim.endExecution(p.id, msg.enemy);
    } else if (msg.type === 'lifesteal') {
      const key = `heal/${msg.enemy}/${msg.serial}/${msg.hitIndex}`;
      if (!p.claims.has(key)) { p.claims.add(key); if (p.claims.size > C.maxClaims) p.claims.delete(p.claims.values().next().value); sim.lifesteal(p.id, msg); }
    } else if (msg.type === 'rest') {
      if (sim.rest(p.id, msg.bonfire)) { session.spawn = sim.state.checkpoint; broadcast({ type: 'checkpoint', spawn: session.spawn }); }
    }
  }
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
  const server = http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    if (pathname === '/healthz') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, players: clients.size, version: sim.catalog().version })); return; }
    if (pathname === '/api/lobby') { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ protocol: C.protocol, build, capacity, players: clients.size, version: sim.catalog().version, metrics })); return; }
    if (pathname === '/') pathname = '/combat-arena-3d.html';
    if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    // Serve only public assets, never source control, server code or homelab files.
    if (!['/combat-arena-3d.html', '/index.html'].includes(pathname) && !pathname.startsWith('/js/') && !pathname.startsWith('/assets/') && !(options.dev && pathname.startsWith('/tests/'))) { res.writeHead(404).end(); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      if (file.endsWith('.html')) {
        const html = fs.readFileSync(file, 'utf8').replace('</head>', `<meta name="arena-build" content="${build}"></head>`);
        res.setHeader('Content-Length', Buffer.byteLength(html)); res.end(req.method === 'HEAD' ? undefined : html); return;
      }
      res.setHeader('Content-Length', stat.size);
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: C.maxMessage, perMessageDeflate: {
    threshold: C.compressionThreshold, serverNoContextTakeover: true, clientNoContextTakeover: true,
    concurrencyLimit: C.compressionConcurrency, zlibDeflateOptions: { level: C.compressionLevel },
  } });
  server.on('upgrade', (req, socket, head) => {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { socket.destroy(); return; }
    if (req.url !== C.path || origin.host !== req.headers.host || clients.size >= capacity) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  wss.on('connection', ws => {
    const p = { ws, id: randomUUID(), name: `Player ${clients.size + 1}`, hello: false, ready: false, pose: null,
      lastPose: 0, lastSeq: 0, claims: new Set(), alive: true, windowAt: performance.now(), count: 0,
      encoder: new net.FrameEncoder(), poseSeq: 0, lastWritten: 0 };
    p.lastActivity = null;
    ws._socket.setNoDelay(true);
    clients.set(p.id, p);
    ws.on('pong', () => { p.alive = true; });
    ws.on('error', () => {});
    ws.on('message', (data, binary) => {
      if (binary) { ws.close(1003, 'JSON text required.'); return; }
      const now = performance.now();
      if (now - p.windowAt >= 1000) { p.windowAt = now; p.count = 0; }
      if (++p.count > C.messagesPerSecond) { ws.close(1008, 'Too many messages.'); return; }
      let msg; try { msg = JSON.parse(data); } catch { ws.close(1007, 'Invalid JSON.'); return; }
      try { message(p, msg); } catch (e) { console.error('Lobby message failed:', e); error(p, 'The server could not process that action.'); }
    });
    ws.on('close', code => {
      clients.delete(p.id);
      if (![...clients.values()].some(p => p.hello)) {
        accumulator = 0;
        if (p.hello && code === 1000) stop('The party left. Choose an adventure to start a fresh run.');
        else if (session && emptySince === null) emptySince = lobbyNow();
      }
      if (!refreshLeader('disconnect')) broadcast(roster());
    });
    const deadline = setTimeout(() => { if (!p.hello) ws.close(1008, 'Join timed out.'); }, C.connectTimeout); deadline.unref();
  });
  const heartbeat = setInterval(() => {
    for (const p of clients.values()) { if (!p.alive) { p.ws.terminate(); continue; } p.alive = false; p.ws.ping(); }
  }, C.heartbeat); heartbeat.unref();
  const timer = setInterval(() => {
    const now = performance.now(), elapsed = Math.min((now - last) / 1000, 0.25); last = now;
    updateMetrics(now);
    expireEmptyLobby();
    refreshLeader();
    if (!session || ![...clients.values()].some(p => p.ready)) { accumulator = 0; return; }
    syncPlayers(); accumulator += elapsed;
    try {
      while (accumulator >= 1 / C.tickRate) {
        if ((session.teamWipeOnly || session.opening) && !bossStarted) {
          const party = [...clients.values()].filter(p => p.hello);
          const allReady = party.length > 0 && party.every(p => p.ready && p.pose);
          bossLoadFor = allReady ? bossLoadFor + 1 / C.tickRate : 0;
          bossStarted = allReady && bossLoadFor >= (session.teamWipeOnly ? C.bossLoadGrace : 0);
        }
        const began = performance.now(); sim.tick(1 / C.tickRate, (session.teamWipeOnly || session.opening) && !bossStarted); ticks++;
        tickTimes.push(performance.now() - began); if (tickTimes.length > C.metricsSamples) tickTimes.shift();
        accumulator -= 1 / C.tickRate; sinceSnapshot += 1 / C.tickRate;
        if (session.teamWipeOnly) {
          const party = [...clients.values()].filter(p => p.hello);
          // Loading peers still belong to the attempt; a disconnect removes a
          // peer from this check, while a stale living pose never counts as dead.
          const wiped = party.length > 0 && party.every(p => p.ready && p.pose && p.arenaDefeated);
          arenaWipeFor = wiped && sim.inspect().Game.duel?.alive() ? arenaWipeFor + 1 / C.tickRate : 0;
          if (arenaWipeFor >= sim.arenaWipeDelay) {
            if (session.gauntlet) stop('TEAM WIPED · The boss run ends here. Choose BOSS ONLY to try again from boss 1.', 'team-wipe');
            else start(session.kind, session.id);
            break;
          }
        }
        // Capture every state transition (even a short active phase) reliably.
        const signature = sim.inspect().Game.enemies.map(e => `${e.state}/${e.netAttack}/${e.hitIndex}/${!!e.hitbox}/${e.phase}`).join('|');
        if (sinceSnapshot >= 1 / C.snapshotRate - 1e-9 || signature !== server.lastSignature) {
          sinceSnapshot = 0; server.lastSignature = signature;
          const frame = sim.frame(), players = playerFrames();
          for (const p of clients.values()) sendFrame(p, frame, players);
        }
        // A campaign carries the entire party through its data-defined chapter
        // order, using the same completion delay as solo story play.
        if (session.campaign?.next && sim.state.completedFor >= sim.campaignAdvanceTime) {
          start('level', session.campaign.next, session.campaign.id);
          break;
        }
        if (session.gauntlet && sim.state.completedFor >= C.bossVictoryDelay) {
          if (session.gauntlet.next) start('gauntlet', 'boss-only', null, session.gauntlet.next);
          else stop('BOSS ONLY COMPLETE · Every boss defeated. The whole party conquered the gauntlet!');
          break;
        }
      }
    } catch (e) {
      console.error('Simulation stopped:', e); session = null;
      broadcast({ type: 'stop', message: 'The session stopped after a server error. The leader can start another level.' });
    }
  }, 1000 / C.tickRate); timer.unref();
  function close() { clearInterval(timer); clearInterval(heartbeat); for (const p of clients.values()) p.ws.terminate(); wss.close(); return new Promise(resolve => server.close(resolve)); }
  return { server, close, sim, clients, get session() { return session; }, get metrics() { return metrics; } };
}
if (require.main === module) {
  const app = createServer();
  app.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Combat Arena ${app.sim.catalog().version}: one public lobby on port ${app.server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
module.exports = { createServer };
