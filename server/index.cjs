'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomUUID, randomBytes } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const net = require('../js/net-protocol.js');
const { createSimulation, build, root } = require('./headless.cjs');
const C = net.config;

// The client's address: the socket's own, or the last X-Forwarded-For entry added by a loopback/private proxy
// (Tailscale Funnel, Docker's port proxy). A local/private peer without that header has no per-address budget.
const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cde][0-9a-f]{2}:)/i;
function clientAddress(req) {
  const remote = String(req.socket.remoteAddress || '').replace(/^::ffff:/i, '');
  if (!PRIVATE.test(remote)) return remote || null;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean).pop();
  return forwarded ? forwarded.replace(/^::ffff:/i, '').slice(0, 64) : null;
}

function createServer(options = {}) {
  const capacity = Number(options.capacity ?? process.env.MAX_PLAYERS ?? C.defaultCapacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > C.maxCapacity) throw new Error(`MAX_PLAYERS must be an integer from 2 to ${C.maxCapacity}`);
  // `clients` holds players who said hello (they own a slot); `pending` sockets are still joining.
  const sim = createSimulation(), clients = new Map(), pending = new Set();
  const addresses = new Map(), hellos = new Map();   // address -> open sockets; address -> { count, at } joins this minute
  const activityNow = options.activityNow || (() => performance.now());
  const loadNow = options.loadNow || (() => performance.now());
  const memories = new Map(); // Private browser credentials; never included in roster or pose broadcasts.
  const freshPose = p => p.ready && p.pose && performance.now() - p.lastPose < C.stalePlayer * 1000;
  const participating = p => p.hello && p.foreground && (p.ready && p.pose ? freshPose(p) : performance.now() - p.loadingSince < C.loadTimeout);
  function remember(p) {
    if (!p.memory) return;
    Object.assign(p.memory, { name: p.name, epoch: session?.epoch, pose: p.pose, arenaDefeated: !!p.arenaDefeated });
  }
  // A token is only worth keeping once its player actually played (`kept`, set on ready). Join spam
  // therefore evicts other never-played tokens first, never a returning player's identity.
  function forget() {
    const offline = [...memories].filter(([, value]) => !clients.has(value.id));
    const oldest = offline.find(([, value]) => !value.kept) || offline[0];
    if (oldest) memories.delete(oldest[0]);
  }
  function identify(p, memory, token) {
    if (!memory) {
      if (memories.size >= C.rememberedPlayers) forget();
      token = randomBytes(32).toString('hex');
      memory = { id: p.id, name: p.name, kept: false }; memories.set(token, memory);
    } else {
      memories.delete(token); memories.set(token, memory);
      const previous = clients.get(memory.id);
      if (previous && previous !== p) { remember(previous); previous.ws.close(1008, 'You joined from another tab. Rejoin here to take over.'); }
      p.id = memory.id;
      p.name = memory.name;
      if (session && memory.epoch === session.epoch) { p.pose = memory.pose; p.arenaDefeated = memory.arenaDefeated; }
    }
    pending.delete(p); clients.set(p.id, p);
    p.memory = memory; p.token = token;
  }
  let leader = null, session = null, last = performance.now(), accumulator = 0, sinceSnapshot = 0;
  let arenaWipeFor = 0, bossLoadFor = 0, bossStarted = false, loadStarted = 0;
  let metricsAt = last, ticks = 0, payloadBytes = 0, tickTimes = [];
  let metrics = { hz: 0, tickMs: 0, bytesPerSecond: 0, websocketBytesPerSecond: 0, bufferedBytes: 0 };
  let rosterAt = -Infinity, rosterTimer = null, lastKick = -Infinity;
  const kicked = new Map();   // player id -> when the leader last removed them
  const roster = () => ({ type: 'roster', leader, capacity, session, players: [...clients.values()].map(p => ({ id: p.id, name: p.name, ready: p.ready, hp: p.pose?.hp ?? null })).concat(sim.botList()) });
  function send(p, data) {
    if (p.ws.readyState !== WebSocket.OPEN) return;
    if (p.ws.bufferedAmount > C.maxBuffered) { p.ws.close(1013, 'Connection too slow. Rejoin the lobby.'); return; }
    const body = JSON.stringify(data); payloadBytes += Buffer.byteLength(body); p.ws.send(body);
  }
  function broadcast(data) { for (const p of clients.values()) send(p, data); }
  // Every roster is the whole current state, so chatter (ready, names, presence, joins) coalesces to one per
  // `rosterInterval`. Structural changes (start, stop, leadership notices) still send at once.
  function sendRoster(extra = {}) { rosterAt = performance.now(); broadcast({ ...roster(), ...extra }); }
  function queueRoster() {
    if (rosterTimer) return;
    const wait = rosterAt + C.rosterInterval - performance.now();
    if (wait <= 0) { sendRoster(); return; }
    rosterTimer = setTimeout(() => { rosterTimer = null; sendRoster(); }, wait); rosterTimer.unref();
  }
  const isActive = (p, now) => p?.hello && p.foreground && (!session || participating(p) || now - p.lastActivity < C.leaderInputGrace) && p.ws.readyState === WebSocket.OPEN
    && Number.isFinite(p.lastActivity) && now - p.lastActivity < C.leaderIdle;
  function refreshLeader(reason = 'idle', now = activityNow()) {
    if (isActive(clients.get(leader), now)) return false;
    const previous = leader;
    leader = [...clients.values()].find(p => isActive(p, now))?.id || null;
    if (previous === leader) return false;
    const next = clients.get(leader);
    const prefix = previous ? reason === 'disconnect' ? 'The leader left. ' : clients.get(previous)?.foreground && (!session || participating(clients.get(previous))) ? 'The leader was inactive for five minutes. ' : 'The leader is away. ' : '';
    sendRoster({ notice: prefix + (next ? `${next.name} is now the leader.` : 'No active leader. Press a key, move the mouse or use your controller to lead.') });
    return true;
  }
  function noteActivity(p) {
    const now = activityNow();
    refreshLeader('idle', now);
    p.lastActivity = now;
    if (!leader) refreshLeader('idle', now);
  }
  const playerFrames = () => [...clients.values()].filter(p => p.foreground && freshPose(p)).map(p => {
    const pose = { ...p.pose };
    for (const key of net.pose.personal) delete pose[key];
    return { ...pose, id: p.id, name: p.name, poseSeq: p.poseSeq };
  }).concat(session ? sim.botFrames() : []);
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
  // Pose age lets contact checks allow for movement since the last 30 Hz pose.
  const syncPlayers = () => {
    const now = performance.now();
    sim.setPlayers([...clients.values()].filter(p => p.foreground && freshPose(p)).map(p => ({ ...p.pose, id: p.id, poseAge: (now - p.lastPose) / 1000 })));
  };
  const error = (p, message) => send(p, { type: 'error', message });
  function stop(message, reason = null) {
    session = null;
    for (const p of clients.values()) { p.ready = false; p.pose = null; p.encoder.reset(); }
    broadcast({ type: 'stop', message, reason }); sendRoster();
  }
  function start(kind, id, campaignId = null, boss = undefined, opening = false) {
    // Ids are resolved and validated before the shared simulation changes; a refused request keeps the run.
    const gauntlet = kind === 'gauntlet' ? sim.gauntlet(boss, id) : null;
    if (gauntlet) { kind = 'arena'; id = gauntlet.boss; }
    const campaign = kind === 'campaign' ? sim.campaign(id) : campaignId ? sim.campaign(campaignId, id) : null;
    if ((kind === 'campaign' || campaignId) && !campaign) throw Object.assign(new Error('Unknown campaign or chapter'), { rejected: true });
    if (campaign) { kind = 'level'; id = campaign.level; }
    try { session = sim.start(kind, id, gauntlet?.partners || []); } catch (e) {
      // A failure after validation leaves the simulation half-built: end the run properly for everyone.
      if (!e.rejected && session) stop('The session stopped after a server error. The leader can start another level.', 'error');
      throw e;
    }
    for (const p of clients.values()) if (p.hello) sim.registerPlayer(p.id, p.name);
    if (gauntlet) session.gauntlet = gauntlet;
    if (campaign) session.campaign = campaign;
    if (opening && (campaign?.intro || gauntlet)) session.opening = true;
    for (const p of clients.values()) { p.ready = false; p.pose = null; p.arenaDefeated = false; p.claims.clear(); p.lastSeq = 0; p.encoder.reset(); p.loadingSince = performance.now(); remember(p); }
    arenaWipeFor = 0; bossLoadFor = 0; bossStarted = false; loadStarted = loadNow();
    accumulator = 0; sinceSnapshot = 0; server.lastSignature = null;
    broadcast({ type: 'start', session, opening: !!session.opening }); sendRoster();
  }
  // Duplicate claims (one contact per swing and enemy, one parry per attack) are dropped before any work.
  function claim(p, key) {
    if (p.claims.has(key)) return false;
    p.claims.add(key); if (p.claims.size > C.maxClaims) p.claims.delete(p.claims.values().next().value);
    return true;
  }
  function hello(p, msg) {
    if (msg.protocol !== C.protocol || msg.build !== build) { p.ws.close(1008, 'Game updated. Reload this page.'); return; }
    // Joins per address and minute are bounded, so one address cannot churn the token memory or the roster.
    if (p.address) {
      const now = performance.now(), h = hellos.get(p.address) || { count: 0, at: now };
      if (now - h.at >= 60000) { h.count = 0; h.at = now; }
      hellos.set(p.address, h);
      if (++h.count > C.hellosPerMinute) { p.ws.close(1008, 'Too many joins. Wait a minute, then rejoin.'); return; }
    }
    const token = typeof msg.token === 'string' && /^[a-f0-9]{64}$/.test(msg.token) ? msg.token : null;
    const memory = token ? memories.get(token) : null;
    // A player slot is taken at hello; replacing your own open tab needs no extra slot.
    if (clients.size >= capacity && !(memory && clients.has(memory.id))) { p.ws.close(1013, 'The lobby is full. Try again later.'); return; }
    p.name = `Player ${clients.size + 1}`;
    identify(p, memory, token);
    p.name = net.name(msg.name) || p.name; p.hello = true; p.foreground = msg.foreground !== false;
    p.loadingSince = performance.now(); remember(p);
    if (session) sim.registerPlayer(p.id, p.name);
    noteActivity(p);
    send(p, { id: p.id, token: p.token, build, catalog: sim.catalog(), ...roster(), type: 'welcome' });
    if (session) send(p, { type: 'start', session, resume: p.pose });
    queueRoster();
  }
  function control(p, msg) {
    noteActivity(p);
    if (p.id !== leader) { error(p, 'Only the lobby leader can use that control.'); return; }
    if (msg.action === 'start') {
      if (!['campaign', 'level', 'arena', 'gauntlet'].includes(msg.kind) || !net.id(msg.id)) return;
      try { start(msg.kind, msg.id, null, undefined, true); } catch (e) {
        if (!e.rejected) console.error('Start failed:', e);
        error(p, e.rejected ? e.message : 'That adventure could not start. Choose another.');
      }
    } else if (msg.action === 'restart' && session) session.gauntlet ? start('gauntlet', session.gauntlet.id, null, undefined, true) : start(session.kind, session.id, session.campaign?.id);
    else if (msg.action === 'lobby') {
      stop('The leader returned everyone to the lobby.');
    } else if (msg.action === 'next' && session && !session.gauntlet) {
      const game = sim.inspect().Game, next = session.campaign ? session.campaign.next : game.level.next;
      if (game.complete && next && sim.catalog().levels.some(l => l.id === next)) start('level', next, session.campaign?.id);
      else error(p, 'Finish this level first, or select another level.');
    } else if (msg.action === 'transfer' && clients.has(msg.player) && clients.get(msg.player).hello) {
      if (!isActive(clients.get(msg.player), activityNow())) { error(p, 'That player is inactive. They must provide input before becoming leader.'); return; }
      leader = msg.player; sendRoster();
    } else if (msg.action === 'addBot') {
      if (!sim.addBot()) error(p, `A party can have at most ${C.maxBots} bots.`); else queueRoster();
    } else if (msg.action === 'removeBot' && net.id(msg.player)) {
      if (sim.removeBot(msg.player)) queueRoster();
    } else if (msg.action === 'kick' && msg.player !== p.id && clients.has(msg.player)) {
      // One removal per cooldown, and a returning player is not removed again within `kickRepeat`.
      const now = performance.now();
      for (const [id, at] of kicked) if (now - at >= C.kickRepeat) kicked.delete(id);
      if (now - lastKick < C.kickCooldown || kicked.has(msg.player)) { error(p, 'Wait a moment before removing that player again.'); return; }
      lastKick = now; kicked.set(msg.player, now);
      clients.get(msg.player).ws.close(1008, 'Removed by the lobby leader.');
    }
  }
  function acceptPose(p, s) {
    const P = net.pose;
    if (!s || typeof s !== 'object' || !P.required.every(k => net.finite(s[k]))) return;
    // Whitelist fields: remote data never becomes a Player object or arbitrary properties.
    if (!P.states.includes(s.state) || typeof s.grounded !== 'boolean' || s.hp < 0 || s.hp > sim.playerMaxHp || s.stateTime < 0 || s.attackT < 0) return;
    const limits = { stamina: sim.playerMaxStamina, flasks: sim.playerMaxFlasks, staminaDelay: C.maxCoordinate,
      poise: sim.playerMaxPoise, poiseTimer: C.maxCoordinate, doomTime: C.maxCoordinate, doomDrain: sim.playerMaxHp };
    if (Object.entries(limits).some(([key, max]) => s[key] !== undefined && (!net.finite(s[key], max) || s[key] < 0)) ||
      s.flasks !== undefined && !Number.isInteger(s.flasks) || s.exhausted !== undefined && typeof s.exhausted !== 'boolean') return;
    const resource = key => s[key] ?? p.pose?.[key] ?? (key === 'stamina' ? sim.playerMaxStamina : key === 'flasks' ? sim.playerMaxFlasks : key === 'poise' ? sim.playerMaxPoise : 0);
    // A personal respawn cannot re-enter an ongoing boss attempt. Only a new
    // shared session clears this player's defeat, including repeated ready messages.
    if (session.teamWipeOnly && (s.hp <= 0 || s.state === 'dead')) p.arenaDefeated = true;
    p.pose = { ...Object.fromEntries(P.required.map(key => [key, s[key]])), state: s.state,
      // Only a real player attack id (own property) is relayed: peers index their attack table with it.
      attack: sim.playerAttack(s.attack), charge: Math.min(2, Math.max(0, Number(s.charge) || 0)),
      grounded: s.grounded, execEnemy: net.id(s.execEnemy) ? s.execEnemy : null,
      ...Object.fromEntries(P.motion.map(key => [key, net.finite(s[key]) ? s[key] : key === 'activeAt' ? -1 : 0])),
      ...Object.fromEntries(P.personal.filter(key => key !== 'exhausted').map(key => [key, resource(key)])), exhausted: s.exhausted ?? p.pose?.exhausted ?? false,
      view: net.cameraView(s.view) };
    if (session.teamWipeOnly && p.arenaDefeated) { p.pose.hp = 0; p.pose.state = 'dead'; p.pose.attack = null; }
    p.lastPose = performance.now(); p.poseSeq++; remember(p);
  }
  function message(p, msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return;
    if (msg.type === 'hello') { if (!p.hello) hello(p, msg); return; }
    if (!p.hello || clients.get(p.id) !== p) return;
    if (msg.type === 'presence' && typeof msg.foreground === 'boolean') {
      if (p.foreground === msg.foreground) return;   // repeats change nothing and broadcast nothing
      p.foreground = msg.foreground;
      if (!refreshLeader('presence')) queueRoster();
      return;
    }
    // Poses, transport keepalives, loading and animation clocks are not input.
    if (msg.type === 'activity') { noteActivity(p); return; }
    if (msg.type === 'ping') { send(p, { type: 'pong', sent: msg.sent }); return; }
    if (msg.type === 'name') {
      noteActivity(p);
      const name = net.name(msg.name) || p.name; if (name === p.name) return;
      p.name = name; remember(p); if (session) sim.registerPlayer(p.id, p.name); queueRoster(); return;
    }
    if (msg.type === 'control') { control(p, msg); return; }
    if (!session || msg.epoch !== session.epoch) return;
    if (msg.type === 'ready') {
      // A full baseline is the costly answer: a repeated ready only resynchronises once per `resyncInterval`.
      const now = performance.now(), again = p.ready;
      if (again && now - p.resyncAt < C.resyncInterval) return;
      p.ready = true; p.resyncAt = now; if (p.memory) p.memory.kept = true;
      p.encoder.reset(); sendFrame(p, sim.frame(false), playerFrames());
      if (!again) queueRoster();
      return;
    }
    if (!p.ready) return;
    if (msg.type === 'pose') { acceptPose(p, msg.pose); return; }
    if (!Number.isSafeInteger(msg.seq) || msg.seq <= p.lastSeq) return;
    p.lastSeq = msg.seq; syncPlayers();
    if (session.teamWipeOnly && p.arenaDefeated && msg.type !== 'executionEnd') return;
    if (msg.type === 'hit') {
      if (!net.id(msg.enemy) || !net.id(msg.swing) || !net.id(msg.attack)) return;
      if (claim(p, `${msg.swing}/${msg.enemy}`)) sim.hit(p.id, msg);
    } else if (msg.type === 'parry') {
      if (net.id(msg.enemy) && Number.isSafeInteger(msg.serial) && claim(p, `parry/${msg.enemy}/${msg.serial}`)) sim.parry(p.id, msg);
    } else if (msg.type === 'execute') {
      const accepted = net.id(msg.enemy) && sim.beginExecution(p.id, msg);
      send(p, { type: 'execution', enemy: net.id(msg.enemy) ? msg.enemy : null, accepted: !!accepted });
    } else if (msg.type === 'executionEnd') {
      if (net.id(msg.enemy)) sim.endExecution(p.id, msg.enemy);
    } else if (msg.type === 'lifesteal') {
      if (net.id(msg.enemy) && claim(p, `heal/${msg.enemy}/${msg.serial}/${msg.hitIndex}`)) sim.lifesteal(p.id, msg);
    } else if (msg.type === 'rest') {
      if (net.id(msg.bonfire) && sim.rest(p.id, msg.bonfire)) { session.spawn = sim.state.checkpoint; broadcast({ type: 'checkpoint', spawn: session.spawn }); }
    }
  }
  // Static files. The page's scripts load as `js/<file>?v=<LOAD_STAMP>`; the served page adds this release's build
  // hash to that query, so a matching versioned file is immutable while a redeploy always changes its URL.
  // Everything else revalidates (ETag of size + mtime + build). Text bodies are gzipped once and kept in memory.
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };
  const textTypes = new Set(['.html', '.js', '.svg', '.css', '.json']);
  const stamp = fs.readFileSync(path.join(root, 'combat-arena-3d.html'), 'utf8').match(/const LOAD_STAMP = '([^']+)'/)?.[1];
  const version = stamp ? `${stamp}-${build}` : null;
  const bodies = new Map(); let bodyBytes = 0;   // path -> { mtime, raw, gzip }
  function body(file, stat) {
    const cached = bodies.get(file);
    if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) return cached;
    let raw = fs.readFileSync(file);
    if (file.endsWith('.html')) {
      let html = raw.toString('utf8').replace('</head>', `<meta name="arena-build" content="${build}"></head>`);
      if (version) html = html.replace("'?v=' + LOAD_STAMP", `'?v=' + LOAD_STAMP + '-${build}'`);
      raw = Buffer.from(html);
    }
    const entry = { mtime: stat.mtimeMs, size: stat.size, raw, gzip: raw.length >= C.compressMin ? zlib.gzipSync(raw, { level: 9 }) : null };
    if (cached) { bodies.delete(file); bodyBytes -= cached.raw.length + (cached.gzip?.length || 0); }
    bodies.set(file, entry); bodyBytes += entry.raw.length + (entry.gzip?.length || 0);
    for (const [key, old] of bodies) { if (bodyBytes <= C.compressCache || key === file) break; bodies.delete(key); bodyBytes -= old.raw.length + (old.gzip?.length || 0); }
    return entry;
  }
  const server = http.createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let pathname, query;
    try { const url = new URL(req.url, 'http://localhost'); pathname = decodeURIComponent(url.pathname); query = url.searchParams; } catch { res.writeHead(400).end(); return; }
    if (pathname === '/healthz') { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, players: clients.size, connections: clients.size + pending.size, version: sim.catalog().version })); return; }
    if (pathname === '/api/lobby') { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ protocol: C.protocol, build, capacity, players: clients.size, version: sim.catalog().version, metrics })); return; }
    if (pathname === '/') pathname = '/combat-arena-3d.html';
    if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    // Serve only public assets, never source control, server code or homelab files.
    if (!['/combat-arena-3d.html', '/index.html'].includes(pathname) && !pathname.startsWith('/js/') && !pathname.startsWith('/assets/') && !(options.dev && pathname.startsWith('/tests/'))) { res.writeHead(404).end(); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || pathname.includes('\\') || pathname.split('/').some(p => p.startsWith('.'))) { res.writeHead(403).end(); return; }
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
      const ext = path.extname(file);
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      const immutable = version && query.get('v') === version;
      res.setHeader('Cache-Control', immutable ? `public, max-age=${C.staticMaxAge}, immutable` : 'no-cache');
      const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}-${build}"`;
      res.setHeader('ETag', etag);
      if (String(req.headers['if-none-match'] || '').split(',').some(tag => tag.trim() === etag)) { res.writeHead(304).end(); return; }
      if (!textTypes.has(ext)) {
        res.setHeader('Content-Length', stat.size);
        if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
        return;
      }
      let entry;
      try { entry = body(file, stat); } catch { res.writeHead(500).end(); return; }
      res.setHeader('Vary', 'Accept-Encoding');
      const gzip = entry.gzip && /\bgzip\b/i.test(String(req.headers['accept-encoding'] || ''));
      const out = gzip ? entry.gzip : entry.raw;
      if (gzip) res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', out.length); res.end(req.method === 'HEAD' ? undefined : out);
    });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: C.maxMessage, perMessageDeflate: {
    threshold: C.compressionThreshold, serverNoContextTakeover: true, clientNoContextTakeover: true,
    concurrencyLimit: C.compressionConcurrency, zlibDeflateOptions: { level: C.compressionLevel },
  } });
  server.on('upgrade', (req, socket, head) => {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { socket.destroy(); return; }
    const address = clientAddress(req);
    if (req.url !== C.path || origin.host !== req.headers.host) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    // Joining sockets hold no player slot, but only a few may wait at once and each address has its own budget.
    if (clients.size >= capacity || pending.size >= C.pendingConnections || address && (addresses.get(address) || 0) >= C.connectionsPerAddress) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, address));
  });
  wss.on('connection', (ws, address = null) => {
    const p = { ws, id: randomUUID(), name: 'Player', hello: false, ready: false, pose: null, address,
      lastPose: 0, lastSeq: 0, claims: new Set(), alive: true, windowAt: performance.now(), count: 0,
      encoder: new net.FrameEncoder(), poseSeq: 0, lastWritten: 0, resyncAt: -Infinity };
    p.lastActivity = null; p.foreground = true; p.loadingSince = performance.now();
    ws._socket.setNoDelay(true);
    pending.add(p);
    if (address) addresses.set(address, (addresses.get(address) || 0) + 1);
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
    ws.on('close', () => {
      pending.delete(p);
      if (address) { const n = (addresses.get(address) || 1) - 1; if (n > 0) addresses.set(address, n); else addresses.delete(address); }
      if (clients.get(p.id) !== p) return; // A replacement connection (or nobody) owns this identity now.
      remember(p); clients.delete(p.id);
      if (!refreshLeader('disconnect')) queueRoster();
    });
    const deadline = setTimeout(() => { if (!p.hello) ws.close(1008, 'Join timed out.'); }, C.connectTimeout); deadline.unref();
  });
  const heartbeat = setInterval(() => {
    for (const p of [...clients.values(), ...pending]) { if (!p.alive) { p.ws.terminate(); continue; } p.alive = false; p.ws.ping(); }
    const now = performance.now();
    for (const [address, h] of hellos) if (now - h.at >= 60000) hellos.delete(address);
  }, C.heartbeat); heartbeat.unref();
  const timer = setInterval(() => {
    const now = performance.now(), elapsed = Math.min((now - last) / 1000, 0.25); last = now;
    updateMetrics(now);
    refreshLeader();
    if (!session) { accumulator = 0; return; }
    syncPlayers(); accumulator += elapsed;
    try {
      while (accumulator >= 1 / C.tickRate) {
        if ((session.teamWipeOnly || session.opening) && !bossStarted) {
          // Background or stalled loaders cannot hold the run hostage. Bots need no browser loading barrier.
          const party = [...clients.values()].filter(participating);
          const allReady = loadNow() - loadStarted >= C.loadTimeout || party.every(p => p.ready && p.pose);
          bossLoadFor = allReady ? bossLoadFor + 1 / C.tickRate : 0;
          bossStarted = allReady && bossLoadFor >= (session.teamWipeOnly ? C.bossLoadGrace : 0);
        }
        const began = performance.now(); sim.tick(1 / C.tickRate, (session.teamWipeOnly || session.opening) && !bossStarted); ticks++;
        tickTimes.push(performance.now() - began); if (tickTimes.length > C.metricsSamples) tickTimes.shift();
        accumulator -= 1 / C.tickRate; sinceSnapshot += 1 / C.tickRate;
        if (session.teamWipeOnly) {
          const party = [...clients.values()].filter(p => p.hello && (p.arenaDefeated || participating(p)));
          // Active loaders get bounded time; away players do not prevent a real team defeat.
          const wiped = (party.length > 0 || sim.botList().length > 0) && party.every(p => p.ready && p.pose && p.arenaDefeated) && sim.botsDown();
          arenaWipeFor = wiped && sim.inspect().Game.enemies.some(e => e.alive()) ? arenaWipeFor + 1 / C.tickRate : 0;
          if (arenaWipeFor >= sim.arenaWipeDelay) {
            if (session.gauntlet) stop(`TEAM WIPED · The boss run ends here. Choose ${session.gauntlet.name} to try again from the start.`, 'team-wipe');
            else start(session.kind, session.id);
            break;
          }
        }
        // Capture every state transition (even a short active phase) reliably. A sleeping run changes nothing.
        if (!sim.sleeping || sinceSnapshot >= 1 / C.snapshotRate - 1e-9) {
          const signature = sim.inspect().Game.enemies.map(e => `${e.state}/${e.netAttack}/${e.hitIndex}/${!!e.hitbox}/${e.phase}`).join('|');
          if (sinceSnapshot >= 1 / C.snapshotRate - 1e-9 || signature !== server.lastSignature) {
            sinceSnapshot = 0; server.lastSignature = signature;
            const frame = sim.frame(), players = playerFrames();
            for (const p of clients.values()) sendFrame(p, frame, players);
          }
        }
        // A campaign carries the entire party through its data-defined chapter
        // order, using the same completion delay as solo story play.
        if (session.campaign?.next && sim.state.completedFor >= Math.max(sim.campaignAdvanceTime, C.leaderboardDelay + C.leaderboardTime)) {
          start('level', session.campaign.next, session.campaign.id);
          break;
        }
        if (session.gauntlet && sim.state.completedFor >= Math.max(C.bossVictoryDelay, C.leaderboardDelay + C.leaderboardTime)) {
          const run = C.gauntlets[session.gauntlet.id];
          if (session.gauntlet.next) start('gauntlet', session.gauntlet.id, null, session.gauntlet.next);
          // A survived run carries the party on into the next, harder run, with its own opening.
          else if (run.then) start('gauntlet', run.then, null, undefined, true);
          else stop(`${run.name} COMPLETE · Every boss defeated. The whole party conquered the gauntlet!`);
          break;
        }
      }
    } catch (e) {
      // Through the ordinary stop path: players lose ready/pose/encoder state and get the stop and a roster.
      console.error('Simulation stopped:', e);
      try { stop('The session stopped after a server error. The leader can start another level.', 'error'); }
      catch (err) { console.error('Stopping after a simulation error failed:', err); session = null; }
    }
  }, 1000 / C.tickRate); timer.unref();
  function close() {
    clearInterval(timer); clearInterval(heartbeat); clearTimeout(rosterTimer);
    for (const ws of wss.clients) ws.terminate(); wss.close(); return new Promise(resolve => server.close(resolve));
  }
  return { server, close, sim, clients, pending, get session() { return session; }, get leader() { return leader; }, get metrics() { return metrics; } };
}
if (require.main === module) {
  // Log everything; an uncaught exception leaves unknown state, so exit and let Docker restart the service.
  process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
  process.on('uncaughtException', e => { console.error('Uncaught exception:', e); process.exit(1); });
  const app = createServer();
  app.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Combat Arena ${app.sim.catalog().version}: one public lobby on port ${app.server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
module.exports = { createServer };
