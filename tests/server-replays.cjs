'use strict';
// Replays (PLAN.md "replays of multiplayer runs"): a multiplayer Boss Rush is recorded from its first fight to its end
// (a start per fight, snapshots, picks, downs and deaths, the end with its summary); a duel is not. The replay door
// lists, streams, stars, notes and deletes; changes are same-origin JSON POSTs; the public lobby port serves none of it.
// Storage: a run cut short by a stop plays what it has, a damaged file says so after what could be read, a lost index
// comes back from the files, and runs go after 60 days unless starred.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { createServer } = require('../server/index.cjs');
const http = require('node:http');
const { createReplays, replayDoor } = require('../server/replays.cjs');
const { build } = require('../server/headless.cjs');
const { WebSocket } = require('../server/node_modules/ws');
const { config: C } = require('../js/net-protocol.js');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function peer(origin, name) {
  const ws = new WebSocket(origin.replace('http', 'ws') + C.path, { origin }), queue = [];
  ws.on('message', data => queue.push(JSON.parse(data)));
  const next = async (type, ms = 15000) => {
    for (let i = 0; i < ms / 20; i++) {
      const at = queue.findIndex(m => m.type === type);
      if (at >= 0) return queue.splice(at, 1)[0];
      await wait(20);
    }
    throw new Error('Timed out: ' + type);
  };
  const send = m => ws.send(JSON.stringify(m));
  await once(ws, 'open'); send({ type: 'hello', protocol: C.protocol, build, name });
  return { ws, send, next, queue, id: (await next('welcome')).id };
}
const until = async (test, ms, what) => { for (let t = 0; t < ms; t += 25) { if (test()) return; await wait(25); } assert.fail('Timed out: ' + what); };
async function get(base, url, headers = {}) {
  const res = await fetch(base + url, { headers });
  return { status: res.status, headers: res.headers, text: await res.text() };
}
const post = (base, url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });
const lines = text => text.split('\n').filter(Boolean).map(l => JSON.parse(l));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-replays-'));
  const app = createServer({ replayDir: dir, replayOptions: { batchSeconds: 0.5 } });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  await new Promise(r => app.replayServer.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + app.server.address().port, door = 'http://127.0.0.1:' + app.replayServer.address().port;
  const peers = [];
  try {
    // ---- the public port serves nothing of the replays ----
    for (const url of ['/api/runs', '/api/runs/feedback', '/watch', '/watch?run=2026-01-01-abcdef0123', '/replays/index.html', '/replays/list.js', '/healthz/replays'])
      assert.equal((await get(origin, url)).status, 404, `public ${url} is refused`);
    const game = await get(origin, '/combat-arena-3d.html');
    assert.equal(game.status, 200); assert.ok(!game.text.includes('arena-replay'), 'the public game page is never in replay mode');

    // ---- a Boss Rush is recorded from its first fight; nothing before it ----
    const a = await peer(origin, 'Ash'), b = await peer(origin, 'Bram'); peers.push(a, b);
    await wait(300);
    assert.equal(app.replays.list().length, 0, 'the lobby alone records nothing');
    a.send({ type: 'control', action: 'start', kind: 'calling', id: C.calling.id });
    const session = (await a.next('start')).session; await b.next('start');
    for (const p of [a, b]) p.send({ type: 'ready', epoch: session.epoch });
    const hp = new Map([[a, 120], [b, 120]]);
    const feeder = setInterval(() => {
      for (const p of [a, b]) if (p.ws.readyState === 1) p.send({ type: 'pose', epoch: session.epoch, pose: { ...session.spawn, x: session.spawn.x + (p === a ? -1 : 1), hp: hp.get(p),
        state: hp.get(p) > 0 ? 'idle' : 'dead', stateTime: 0, attackT: 0, chargeT: 0, walkPhase: 0, grounded: true } });
    }, 33);
    // The free pick before fight 1: both pick, so the run's first marks are their picks.
    for (const p of [a, b]) { const offer = await p.next('abilities'); p.send({ type: 'pickAbility', epoch: session.epoch, id: offer.offer[0] }); }
    await until(() => app.replays.list()[0]?.live, 5000, 'the run is live');
    const run = app.replays.list()[0];
    assert.equal(run.mode, 'boss-rush'); assert.deepEqual(run.players.sort(), ['Ash', 'Bram']); assert.equal(run.reached, 1);
    await wait(1500);
    // Live: the door lists it and streams what was recorded so far (the file, then what waits for its batch).
    const listed = JSON.parse((await get(door, '/api/runs')).text);
    assert.equal(listed.runs[0].id, run.id); assert.equal(listed.runs[0].live, true);
    // One run by id (what the viewer asks first): an unknown id is an empty list, not an error in its console.
    assert.equal(JSON.parse((await get(door, `/api/runs?id=${run.id}`)).text).runs[0].id, run.id);
    const unknown = await get(door, '/api/runs?id=2026-01-01-0123456789');
    assert.equal(unknown.status, 200); assert.deepEqual(JSON.parse(unknown.text).runs, []);
    const liveStream = await get(door, `/api/runs/${run.id}/stream`);
    assert.equal(liveStream.headers.get('x-run-live'), '1');
    const early = lines(liveStream.text);
    assert.equal(early[0].k, 'run'); assert.equal(early[0].id, run.id);
    assert.equal(early.filter(l => l.k === 'start').length, 1, 'one fight so far');
    assert.ok(early.filter(l => l.k === 'f').length > 20, 'snapshots, about 30 a second');
    assert.ok(early.filter(l => l.k === 'mark' && l.type === 'pick').length >= 2, 'both picks are marked');
    const f = early.find(l => l.k === 'f');
    assert.equal(f.m.full, true, 'each fight starts from a full snapshot'); assert.ok(!('server' in f.m.frame), 'nothing private about the server');
    assert.ok(early.some(l => l.k === 'f' && l.m.players.some(p => p.name === 'Ash' && Number.isFinite(p.x))), 'poses are in it');
    // From a line on: the rest only (a live viewer asks again from where it was).
    const rest = lines((await get(door, `/api/runs/${run.id}/stream?from=${early.length - 3}`)).text);
    assert.deepEqual(rest.slice(0, 3), early.slice(-3));
    // A run being played cannot be deleted.
    assert.equal((await post(door, `/api/runs/${run.id}/delete`, {})).status, 409);

    // Ash falls (a down: Bram still stands), then Bram (a death: the team is wiped). The run ends.
    hp.set(a, 0); await wait(400);
    hp.set(b, 0);
    await a.next('stop', 15000);
    clearInterval(feeder);
    await until(() => !app.replays.card(run.id).live, 5000, 'the run ends');
    const card = app.replays.card(run.id);
    assert.equal(card.outcome, 'wiped'); assert.ok(card.duration > 1.5);
    assert.ok(card.summary, 'a summary'); assert.equal(card.summary.fights.length, 1);
    const ash = card.summary.players.find(p => p.name === 'Ash'), bram = card.summary.players.find(p => p.name === 'Bram');
    assert.equal(ash.downs, 1, 'Ash went down'); assert.equal(bram.deaths, 1, 'Bram died last');
    assert.equal(ash.picks.length, 1); assert.ok(card.result?.players?.length >= 2, 'the end screen totals');
    const all = lines((await get(door, `/api/runs/${run.id}/stream`)).text);
    assert.equal(all.at(-1).k, 'end'); assert.equal(all.at(-1).outcome, 'wiped');
    assert.deepEqual(all.filter(l => l.k === 'mark' && ['down', 'death'].includes(l.type)).map(l => l.type), ['down', 'death']);
    for (let i = 1; i < all.length; i++) if (typeof all[i].t === 'number' && typeof all[i - 1].t === 'number') assert.ok(all[i].t >= all[i - 1].t, 'time never goes back');
    // The file is gzip, written in batches.
    assert.ok(fs.statSync(path.join(dir, run.id + '.rec.gz')).size > 1000);

    // ---- the door: pages, and changes only by same-origin JSON POST ----
    const watch = await get(door, `/watch?run=${run.id}`);
    assert.equal(watch.status, 200); assert.ok(watch.text.includes('<meta name="arena-replay" content="1">'), 'the viewer is the game page in replay mode');
    assert.equal(watch.headers.get('x-frame-options'), 'DENY');
    assert.equal((await get(door, '/')).status, 200); assert.ok((await get(door, '/')).text.includes('/replays/list.js'));
    for (const url of ['/js/replay.js', '/js/net-view.js', '/replays/list.js']) assert.equal((await get(door, url)).status, 200, url);
    for (const url of ['/server/index.cjs', '/package.json', '/.git/config', '/replays/../server/replays.cjs', '/api/runs/nope', '/api/runs/' + run.id + '/stars'])
      assert.equal((await get(door, url)).status, 404, `${url} is not served`);
    assert.equal((await post(door, `/api/runs/${run.id}/star`, { starred: true }, { Origin: 'http://evil.example' })).status, 403, 'another origin');
    assert.equal((await fetch(door + `/api/runs/${run.id}/star`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"starred":true}' })).status, 403, 'no origin');
    assert.equal((await fetch(door + `/api/runs/${run.id}/star`, { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: door }, body: '{"starred":true}' })).status, 403, 'not JSON');
    assert.equal(app.replays.card(run.id).starred, false);
    assert.equal((await post(door, `/api/runs/${run.id}/star`, { starred: true })).status, 200);
    assert.equal(app.replays.card(run.id).starred, true);
    const noteRes = await post(door, `/api/runs/${run.id}/notes`, { t: 1.25, text: '  The slam reads late here <b>  ' });
    assert.equal(noteRes.status, 200);
    const note = await noteRes.json();
    assert.equal(note.text, 'The slam reads late here <b>'); assert.equal(note.t, 1.25);
    assert.equal((await post(door, `/api/runs/${run.id}/notes`, { t: 1, text: '   ' })).status, 400, 'a note needs words');
    // The loop reads notes and summaries from here.
    const fb = JSON.parse((await get(door, '/api/runs/feedback?since=0')).text);
    assert.equal(fb.notes.length, 1); assert.equal(fb.notes[0].run, run.id); assert.equal(fb.notes[0].text, note.text);
    assert.ok(fb.summaries.some(s => s.run === run.id && s.outcome === 'wiped'));
    assert.equal((await post(door, `/api/runs/${run.id}/notes/${note.id}`, {})).status, 200);
    assert.equal(app.replays.card(run.id).notes.length, 0);
    assert.equal((await get(door, '/api/runs/feedback?since=0', {})).status, 200);

    // ---- storage: cut short, damaged, a lost index, keeping ----
    const day = 86400000;
    let clock = Date.now();
    const store = createReplays({ dir, now: () => clock, batchSeconds: 0 });
    assert.ok(store.card(run.id)?.starred, 'the index is read back');
    const rec = store.begin({ mode: 'boss-rush', name: 'BOSS RUSH', version: 'v0.0.1', build: 'x' });
    rec.chapter({ id: 'hollow', gauntlet: { run: true, fight: 0, number: 1, boss: 'hollow' }, spawn: { x: 0, y: 0, z: 0 } }, [{ id: 'p1', name: 'Cole' }]);
    rec.frame({ epoch: 1, time: 0, enemies: [{ id: 'duel/hollow', x: 0, z: 0, hp: 10 }], gates: [], traps: [], events: [], shots: [], embers: [] }, [{ id: 'p1', name: 'Cole', x: 1, y: 0, z: 0, hp: 120, state: 'idle' }]);
    rec.frame({ epoch: 1, time: 0.5, enemies: [{ id: 'duel/hollow', x: 1, z: 0, hp: 10 }], gates: [], traps: [], events: [], shots: [], embers: [] }, [{ id: 'p1', name: 'Cole', x: 1, y: 0, z: 0, hp: 120, state: 'idle' }]);
    store.close();   // the server stops mid-run
    const cut = createReplays({ dir, now: () => clock });
    assert.equal(cut.card(rec.id).outcome, 'cut'); assert.equal(cut.card(rec.id).live, false);
    const cutLines = []; await new Promise(r => cut.stream(rec.id, 0, t => cutLines.push(...lines(t)), r));
    assert.deepEqual(cutLines.map(l => l.k), ['run', 'start', 'f', 'f'], 'a cut run plays what it has');
    // A damaged tail: what came before, then one line saying so.
    fs.appendFileSync(path.join(dir, rec.id + '.rec.gz'), Buffer.from('not gzip at all, a torn write'));
    const torn = []; let error = null;
    await new Promise(r => cut.stream(rec.id, 0, t => torn.push(...lines(t)), e => { error = e; r(); }));
    assert.ok(error, 'the damage is reported'); assert.deepEqual(torn.map(l => l.k), ['run', 'start', 'f', 'f']);
    const cutServer = http.createServer(replayDoor(cut, (req, res) => { res.writeHead(404); res.end(); }));
    await new Promise(r => cutServer.listen(0, '127.0.0.1', r));
    const tornDoor = lines((await get('http://127.0.0.1:' + cutServer.address().port, `/api/runs/${rec.id}/stream`)).text);
    cutServer.close();
    assert.deepEqual(tornDoor.map(l => l.k), ['run', 'start', 'f', 'f', 'damaged']);
    assert.equal(tornDoor.at(-1).error, 'The rest of this run could not be read.');
    // A run the server was still writing when it died: its torn last batch is cut off at the next start.
    const idx = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    idx.runs.find(r => r.id === rec.id).live = true;
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(idx));
    const again = createReplays({ dir, now: () => clock });
    const trimmed = []; let trimError = 'not done';
    await new Promise(r => again.stream(rec.id, 0, t => trimmed.push(...lines(t)), e => { trimError = e; r(); }));
    assert.equal(trimError, null, 'a torn last batch is trimmed at start'); assert.deepEqual(trimmed.map(l => l.k), ['run', 'start', 'f', 'f']);
    // A live viewer polling at the edge is answered from memory, the file untouched (here it does not exist yet).
    const edge = again.begin({ mode: 'boss-rush', name: 'BOSS RUSH', version: 'v0.0.1', build: 'x' });
    edge.chapter({ id: 'hollow', gauntlet: { run: true, fight: 0, number: 1, boss: 'hollow' }, spawn: { x: 0, y: 0, z: 0 } }, [{ id: 'p1', name: 'Cole' }]);
    edge.frame({ epoch: 1, time: 0, enemies: [{ id: 'duel/hollow', x: 0, z: 0, hp: 10 }], gates: [], traps: [], events: [], shots: [], embers: [] }, [{ id: 'p1', name: 'Cole', x: 1, y: 0, z: 0, hp: 120, state: 'idle' }]);
    const atEdge = []; let edgeError = 'not done';
    await new Promise(r => again.stream(edge.id, edge.lines - 1, t => atEdge.push(...lines(t)), e => { edgeError = e; r(); }));
    assert.equal(edgeError, null); assert.deepEqual(atEdge.map(l => l.k), ['f'], 'the newest line, from memory');
    // A recorder that throws ends its recording (cut short), never the game calling it.
    edge.frame(null, null);
    assert.equal(again.live.has(edge.id), false); assert.equal(again.card(edge.id).outcome, 'cut');
    again.stop();
    // A lost index comes back from the files.
    fs.unlinkSync(path.join(dir, 'index.json'));
    const rebuilt = createReplays({ dir, now: () => clock });
    assert.ok(rebuilt.card(run.id), 'the finished run'); assert.equal(rebuilt.card(run.id).outcome, 'wiped');
    assert.deepEqual(rebuilt.card(rec.id).players, ['Cole']);
    rebuilt.star(run.id, true);
    // Sixty days on: the starred run stays, the other goes, and its file with it.
    clock += 61 * day;
    const later = createReplays({ dir, now: () => clock });
    assert.ok(later.card(run.id), 'starred: kept for good');
    assert.equal(later.card(rec.id), null, 'unstarred: gone after 60 days');
    assert.ok(!fs.existsSync(path.join(dir, rec.id + '.rec.gz')));
    // A delete from the door removes the run and its file.
    app.replays.star(run.id, false);
    assert.equal((await post(door, `/api/runs/${run.id}/delete`, {})).status, 200);
    assert.equal(app.replays.card(run.id), null); assert.equal((await get(door, `/api/runs/${run.id}`)).status, 404);
    assert.deepEqual(JSON.parse((await get(door, `/api/runs?id=${run.id}`)).text).runs, [], 'a deleted run is gone for the viewer');
    for (const s of [store, cut, rebuilt, later]) s.stop();
    console.log('server-replays: ok');
  } finally {
    for (const p of peers) p.ws.close();
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
