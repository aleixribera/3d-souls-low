'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { randomUUID, randomBytes } = require('node:crypto');
const { WebSocketServer } = require('ws');
const net = require('../js/net-protocol.js');
const { createSimulation, build, root } = require('./headless.cjs');
const { createBoard } = require('./board.cjs');
const { createLobby, runTitles } = require('../js/lobby-host.js');
const C = net.config;

// The client's address: the socket's own, or the last X-Forwarded-For entry added by a loopback/private proxy
// (Tailscale Funnel, Docker's port proxy). A local/private peer without that header has no per-address budget.
// Only trust the header when private peers are proxies (compose.yaml publishes the port on 127.0.0.1 only): a server
// reachable directly on a LAN sets TRUST_PROXY=0, or a LAN client could pick its own address with the header.
const PRIVATE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cde][0-9a-f]{2}:)/i;
function clientAddress(req, trustProxy) {
  const remote = String(req.socket.remoteAddress || '').replace(/^::ffff:/i, '');
  if (!PRIVATE.test(remote)) return remote || null;
  if (!trustProxy) return remote;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean).pop();
  return forwarded ? forwarded.replace(/^::ffff:/i, '').slice(0, 64) : null;
}

// The lobby on the network: static files, the WebSocket upgrade with its per-address limits, each socket's message
// rate, and the heartbeat. The session itself (players, leader, runs, claims) is js/lobby-host.js.
function createServer(options = {}) {
  const capacity = Number(options.capacity ?? process.env.MAX_PLAYERS ?? C.defaultCapacity);
  const trustProxy = options.trustProxy ?? process.env.TRUST_PROXY !== '0';
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > C.maxCapacity) throw new Error(`MAX_PLAYERS must be an integer from 2 to ${C.maxCapacity}`);
  const sim = createSimulation();
  // The weekly run (C.weekly): the week comes from the wall clock (`dateNow`, ms); its board is kept in `boardFile`.
  const dateNow = options.dateNow || Date.now;
  const board = createBoard({ file: options.boardFile ?? process.env.BOARD_FILE ?? null, size: C.weekly.board,
    bosses: sim.catalog().bosses.map(e => e.id), weekOf: () => sim.weekOf(dateNow()) });
  const lobby = createLobby({ sim, build, board, capacity, dateNow, firstPick: options.firstPick, activityNow: options.activityNow, loadNow: options.loadNow,
    token: bytes => randomBytes(bytes).toString('hex'), uuid: randomUUID, byteLength: text => Buffer.byteLength(text) });
  const { clients, pending } = lobby;
  const addresses = new Map();   // address -> open sockets
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
    if (pathname === '/api/lobby') { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ protocol: C.protocol, build, capacity, players: clients.size, playing: clients.size ? sim.describe(lobby.session) : null, version: sim.catalog().version, metrics: lobby.metrics })); return; }
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
    const address = clientAddress(req, trustProxy);
    if (req.url !== C.path || origin.host !== req.headers.host) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    // Joining sockets hold no player slot, but only a few may wait at once and each address has its own budget.
    if (clients.size >= capacity || pending.size >= C.pendingConnections || address && (addresses.get(address) || 0) >= C.connectionsPerAddress) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, address));
  });
  wss.on('connection', (ws, address = null) => {
    const p = lobby.connect(ws, address);
    p.alive = true; p.windowAt = performance.now(); p.count = 0;
    ws._socket.setNoDelay(true);
    if (address) addresses.set(address, (addresses.get(address) || 0) + 1);
    ws.on('pong', () => { p.alive = true; });
    ws.on('error', () => {});
    ws.on('message', (data, binary) => {
      if (binary) { ws.close(1003, 'JSON text required.'); return; }
      const now = performance.now();
      if (now - p.windowAt >= 1000) { p.windowAt = now; p.count = 0; }
      if (++p.count > C.messagesPerSecond) { ws.close(1008, 'Too many messages.'); return; }
      let msg; try { msg = JSON.parse(data); } catch { ws.close(1007, 'Invalid JSON.'); return; }
      lobby.receive(p, msg);
    });
    ws.on('close', () => {
      if (address) { const n = (addresses.get(address) || 1) - 1; if (n > 0) addresses.set(address, n); else addresses.delete(address); }
      lobby.disconnect(p);
    });
    const deadline = setTimeout(() => { if (!p.hello) ws.close(1008, 'Join timed out.'); }, C.connectTimeout); deadline.unref();
  });
  const heartbeat = setInterval(() => {
    for (const p of [...clients.values(), ...pending]) { if (!p.alive) { p.ws.terminate(); continue; } p.alive = false; p.ws.ping(); }
    lobby.sweep();
  }, C.heartbeat); heartbeat.unref();
  const timer = setInterval(() => lobby.tick(), 1000 / C.tickRate); timer.unref();
  function close() {
    clearInterval(timer); clearInterval(heartbeat); lobby.close();
    for (const ws of wss.clients) ws.terminate(); wss.close(); return new Promise(resolve => server.close(resolve));
  }
  return { server, close, sim, lobby, clients, pending, get session() { return lobby.session; }, get leader() { return lobby.leader; }, get metrics() { return lobby.metrics; } };
}
if (require.main === module) {
  // Log everything; an uncaught exception leaves unknown state, so exit and let Docker restart the service.
  process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
  process.on('uncaughtException', e => { console.error('Uncaught exception:', e); process.exit(1); });
  const app = createServer();
  app.server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Combat Arena ${app.sim.catalog().version}: one public lobby on port ${app.server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.close().then(() => process.exit(0)));
}
module.exports = { createServer, runTitles };
