'use strict';
// The Story audit's in-page half (pass 163), loaded by tools/story-audit.cjs into the page opened with #dev.
// window.__storyAudit(levelId) plays one chapter of Story through on the hand-stepped clock: it jumps there as a fresh
// story (Story's own flow, story.jumpTo), checks every placement (start, bonfires, enemies, flasks, the given ability)
// stands on a floor and outside the walls, then walks the player with real movement along routes over the collision
// floors (BotNavigation.route) to every place a player must reach: each zone's fight, each flask, the given ability,
// each bonfire (rested at, then the save continued, as Continue does), each shortcut. Enemies within reach of the
// player fall as it passes (a player fighting through); the player cannot die of blows but can fall. Then the level
// must complete and carry on into the next chapter. Each problem is a finding with a place; `frame(name)` (exposed
// by the runner) takes a screenshot of the page.
(function () {
  const STEP = 1 / 60;
  const r1 = v => Math.round(v * 10) / 10;
  const at = o => o ? { x: r1(o.x), y: r1(o.y || 0), z: r1(o.z) } : null;
  const listen = { deaths: null, fell: null };   // one listener for every run (events has no off)
  window.__arena.events.on('playerDeath', d => { if (listen.deaths) listen.deaths.push(at(d.player)); });
  window.__arena.events.on('fell', d => { if (listen.fell && d.body && d.body.baseDef) listen.fell.push({ id: d.body.baseDef.id, zone: d.body.zone, at: at(d.body) }); });

  window.__storyAudit = async function (levelId, { frames = true, every = 30 } = {}) {
    const A = window.__arena, sim = A.tests.sim, { Game, CONFIG, PS } = A;
    const out = { level: levelId, findings: [], walked: 0, seconds: 0, visited: [], deaths: 0, errors: [] };
    const find = (sev, kind, text, where) => { out.findings.push({ sev, kind, text, at: at(where) }); };
    const p = () => Game.player;
    const errs = [], onErr = e => errs.push(String(e.message || e.reason || e));
    window.addEventListener('error', onErr); window.addEventListener('unhandledrejection', onErr);
    const nav = CONFIG.bot.navigation, oldNodes = nav.maxNodes; nav.maxNodes = 400000;
    let frameN = 0;
    const snap = async (name, yaw) => {
      if (!frames || !window.__auditFrame) return null;
      const ld = document.getElementById('loading'); ld.style.transition = 'none'; ld.classList.remove('show');
      document.getElementById('fade').classList.remove('show');
      if (yaw !== undefined) Game.cam.yaw = yaw;
      Game.updateCamera(0, true); Game.render(1, STEP); Game.render(1, STEP);
      const vig = document.getElementById('vignette'); if (vig) vig.style.opacity = '0';   // the walk's blows are not a player's
      const file = `${levelId}-${String(++frameN).padStart(2, '0')}-${name}`;
      await window.__auditFrame(file); if (vig) vig.style.opacity = ''; return file;
    };
    const deaths = [], fell = []; listen.deaths = deaths; listen.fell = fell;
    try {
      sim.begin();
      story.jumpTo(levelId);
      Game.loading = 0; document.getElementById('loading').classList.remove('show');
      if (Game.level.id !== levelId) { find(1, 'start', `story.jumpTo landed on ${Game.level.id}`); return out; }
      const L = Game.level, W = () => world;
      // Blows never land on the walker (no hurt look in the frames); falls and pits still kill.
      const keep = () => { const q = p(); if (q && q.alive()) { q.hp = q.maxHp; if (!q.auditShield) { q.auditShield = true; q.invulnerable = () => true; } } };
      keep();
      out.frames = [await snap('spawn')];

      // ---- placements ------------------------------------------------------------------------------------------
      const insideSolid = (x, y, z, r, h) => (W().solids || []).find(s => !s.low && s.kind !== 'prop' && s.y1 > y + CONFIG.height.stepUp && s.y0 < y + h &&
        Math.hypot(x - clamp(x, s.x0, s.x1), z - clamp(z, s.z0, s.z1)) < r * 0.6);
      const floorAt = (x, z, y = Infinity) => W().floorY(x, z, y);
      const placed = (what, x, z, y, r = 0.45, h = 1.8) => {
        const f = floorAt(x, z, y === undefined ? Infinity : y + 0.5);
        if (!Number.isFinite(f) || f < W().killY) { find(1, 'floor', `${what} has no floor under it`, { x, y: y || 0, z }); return; }
        const s = insideSolid(x, f, z, r, h);
        if (s) find(2, 'wall', `${what} stands inside a ${s.kind || 'wall'}`, { x, y: f, z });
      };
      const sp = L.start; placed('the start', sp.x, sp.z, sp.y);
      for (const b of L.bonfires || []) { placed(`bonfire ${b.id}`, b.x, b.z, b.y, 0.3); if (b.spawn) placed(`bonfire ${b.id}'s respawn`, b.spawn.x, b.spawn.z, b.spawn.y); }
      for (const f of L.flaskFinds || []) placed(`flask ${f.id}`, f.x, f.z, f.y, 0.3);
      const G = L.giveAbility;
      if (G) placed(`the ${G.id} gift`, (G.trigger[0] + G.trigger[1]) / 2, (G.trigger[2] + G.trigger[3]) / 2, G.y);
      sim.step(30); keep();
      for (const e of Game.enemies) {
        const name = `${e.baseDef.id}${e.zone ? ' of ' + e.zone : ''}`;
        if (!e.alive()) { find(2, 'enemy', `${name} is dead at the start`, e); continue; }
        if (!Number.isFinite(e.y) || e.y < W().killY + 0.5) { find(2, 'enemy', `${name} fell out of the level at the start`, e); continue; }
        const s = insideSolid(e.x, e.y, e.z, e.radius, e.height);
        if (s) find(2, 'enemy', `${name} stands inside a ${s.kind || 'wall'}`, e);
        const f = floorAt(e.x, e.z, e.y + 0.5);
        if (Number.isFinite(f) && e.y - f > 0.6) find(3, 'enemy', `${name} floats ${r1(e.y - f)} m over the floor`, e);
      }

      // A zone counts the player in its trigger only on its first member's floor (Game.updateLevel): members on other
      // floors, or a member on a trap's floor (it falls when the floor goes, or stays up there out of reach).
      for (const z of Game.zones) {
        const ys = z.actors.map(a => a.home ? a.home.y : a.y), y0 = ys[0];
        const off = z.actors.filter((a, i) => Math.abs(ys[i] - y0) > CONFIG.height.reach);
        if (off.length) find(2, 'zone', `${z.id} counts the player only at y ${r1(y0)}, but ${off.map(a => `${a.baseDef.id} stands at y ${r1(a.home ? a.home.y : a.y)}`).join(', ')}`, z.actors[0]);
        for (const [i, m] of z.members.entries()) {
          const s = { ...m, ...m.spawn };
          if (s.y !== undefined || !Number.isFinite(s.x)) continue;
          const top = floorAt(s.x, s.z), below = floorAt(s.x, s.z, top - 0.5);
          if (Number.isFinite(below) && below > W().killY && top - below > CONFIG.height.reach) find(3, 'zone', `${m.enemy} of ${z.id} has no y: it stands on the top floor (y ${r1(top)}), over another at y ${r1(below)}`, { x: s.x, y: top, z: s.z });
        }
      }
      for (const e of Game.enemies) for (const t of W().traps || [])
        if (inRect(t.collapse, e.x, e.z) && Math.abs(e.y - t.y) < CONFIG.height.stepUp) find(2, 'trap', `${e.baseDef.id}${e.zone ? ' of ' + e.zone : ''} stands on trap ${t.id}'s floor`, e);

      // ---- the walk --------------------------------------------------------------------------------------------
      // A kill as the last blow of a fight would end it: a boss with another bar kneels into it, one set to retreat leaps
      // away (Enemy.outlast); only its last bar's end is a death (an ending's, js/finale.js).
      // A mid-bar phase (`at`) begins as the bar passes its line: the blow takes it there first.
      const kill = e => {
        if (e.state === A.ES.PHASE || e.state === A.ES.RETREAT) return;
        const next = e.phaseIds && !e.lastPhase() && e.baseDef.phases[e.phaseIds[e.phase + 1]];
        if (next && next.at && !next.alone && e.hp > e.def.hp * next.at) { e.hp = e.def.hp * next.at * 0.98; return; }
        if (!e.outlast()) e.die();
      };
      const busy = e => e.state === A.ES.PHASE || e.state === A.ES.RETREAT;
      // Every bar, then the death (or the retreat, out of the level).
      const finish = e => { for (let i = 0; i < 10 && e.alive(); i++) { if (busy(e)) { sim.until(() => !busy(e), 20); keep(); } else { kill(e); sim.step(2); } } };
      let fighting = false;
      const sweep = () => {   // enemies near the player fall, as to a player fighting through
        if (fighting) return;
        const q = p();
        for (const e of Game.enemies) if (e.alive() && !e.training && Math.hypot(e.x - q.x, e.z - q.z) < 9 && Math.abs(e.y - q.y) < 4) kill(e);
      };
      let lastDeaths = 0, lostY = false;
      let road = 0, tourAt = 0, prev = null, heading = 0;
      const stepOne = () => {
        keep(); sweep(); sim.step(1); out.seconds += STEP;
        const q = p();
        if (!Number.isFinite(q.y) && !lostY) {
          lostY = true;
          find(1, 'floor', `the player's height is lost (y ${q.y}, state ${q.state}, grounded ${q.grounded}, from (${prev && r1(prev.x)}, ${prev && r1(prev.y)}, ${prev && r1(prev.z)}))`, q);
        }
        if (prev) { const d = Math.hypot(q.x - prev.x, q.z - prev.z); if (d > 0.01 && d < 1) { road += d; heading = Math.atan2(q.x - prev.x, q.z - prev.z); } }
        prev = { x: q.x, y: q.y, z: q.z };
        if (deaths.length > lastDeaths) {
          lastDeaths = deaths.length;
          find(1, 'death', 'the player died on the walk (a fall, a pit or a hazard)', deaths[deaths.length - 1]);
          sim.until(() => p().alive() && Game.deathTimer === 0, CONFIG.death.respawnDelay + 2); keep();
        }
      };
      // A teleport (sim.place takes the highest floor at or below y): on a stair the waypoint can sit under the step,
      // so fall back to the top floor there rather than leave the player at -Infinity.
      const put = (x, z, y) => { sim.place(x, z, y); if (!Number.isFinite(p().y)) sim.place(x, z, Infinity); };
      const body = () => ({ x: p().x, y: p().y, z: p().z, radius: p().radius, height: p().height });
      const route = goal => BotNavigation.route(body(), goal);
      // Walk the player along a route to `goal`; returns 'ok', 'noroute', 'stuck'.
      const walk = async (goal, label) => {
        const path = route(goal);
        if (!path) return 'noroute';
        let last = { x: p().x, z: p().z }, idle = 0, guard = 0, stuckOnce = false;
        for (const w of path) {
          for (;;) {
            const q = p(), dx = w.x - q.x, dz = w.z - q.z;
            if (Math.hypot(dx, dz) < 0.45 && Math.abs(w.y - q.y) < 1.5) break;
            if (!q.isFree() && q.state !== PS.RUN && q.state !== PS.WALK) { sim.move(null); stepOne(); if (++guard > 60 * 120) return 'stuck'; continue; }
            sim.move(dx, dz); stepOne(); guard++;
            if (road - tourAt > every) { tourAt = road; await snap('road', heading); }
            idle += STEP;
            if (idle >= 2) {
              const moved = Math.hypot(p().x - last.x, p().z - last.z);
              last = { x: p().x, z: p().z }; idle = 0;
              if (moved < 0.4) {
                if (!stuckOnce) { find(2, 'stuck', `the walk to ${label} sticks here (the route says it is open)`, p()); stuckOnce = true; await snap('stuck'); }
                if (!Number.isFinite(w.y)) find(3, 'route', `the bot's route to ${label} has a waypoint with no floor (${r1(w.x)}, ${r1(w.z)})`, p());
                sim.move(null); put(w.x, w.z, Number.isFinite(w.y) ? w.y + 0.3 : Infinity); keep();
                break;
              }
            }
            if (guard > 60 * 120) { sim.move(null); return 'stuck'; }
          }
        }
        sim.move(null); out.walked += path.length;
        return 'ok';
      };

      // What a player must reach.
      const centre = r => Array.isArray(r[0]) ? centre(r[0]) : ({ x: (r[0] + r[1]) / 2, z: (r[2] + r[3]) / 2 });
      const ground = (pt, y) => ({ x: pt.x, z: pt.z, y: floorAt(pt.x, pt.z, y === undefined ? Infinity : y + 0.5) });
      const targets = [];
      for (const z of Game.zones) {
        if (Array.isArray(z.trigger)) targets.push({ kind: 'zone', id: z.id, ...ground(centre(z.trigger), z.actors[0] && z.actors[0].home ? z.actors[0].home.y : undefined), zone: z });
        else targets.push({ kind: 'zone', id: z.id, ...ground({ x: z.trigger + 1.5, z: 0 }), zone: z });
      }
      for (const f of L.flaskFinds || []) targets.push({ kind: 'flask', id: f.id, ...ground(f, f.y) });
      if (G) targets.push({ kind: 'gift', id: G.id, ...ground(centre(G.trigger), G.y) });
      for (const b of L.bonfires || []) if (b !== (L.bonfires || [])[0]) targets.push({ kind: 'bonfire', id: b.id, b, ...ground(b.spawn || b, (b.spawn || b).y) });
      for (const g of W().gates) if (g.opensFrom) targets.push({ kind: 'shortcut', id: g.id, g, ...ground(centre(g.opensFrom), g.y + 2) });
      for (const t of targets) if (!Number.isFinite(t.y)) { find(1, 'floor', `the ${t.kind} ${t.id} has no floor where it is reached`, t); t.done = true; }

      const arrive = async t => {
        t.done = true; out.visited.push(`${t.kind}:${t.id}`);
        if (t.kind === 'flask') { sim.step(5); if (!Game.found.has(t.id)) find(2, 'pickup', `flask ${t.id} is not picked up when walked over`, t); }
        if (t.kind === 'gift') { sim.step(5); if (!Game.given.has(t.id)) find(2, 'pickup', `the ${t.id} gift is not given when its place is reached`, t); else out.frames.push(await snap('gift')); }
        if (t.kind === 'shortcut') { sim.step(5); if (!t.g.open) find(2, 'shortcut', `shortcut ${t.id} does not open from its side`, t); }
        if (t.kind === 'bonfire') {
          // Rest, then Continue (the save rebuilt, as the title's Continue does): the player must stand at the bonfire.
          put(t.b.x + 1.2, t.b.z, t.y + 0.3); sweep(); sim.step(2);
          // A bonfire refuses rest with an awake enemy near (Game.canRest): beat them first, as a player would.
          for (const e of Game.enemies) if (e.alive() && !e.training && Math.hypot(e.x - p().x, e.z - p().z) < CONFIG.rest.blockRange) finish(e);
          sim.step(2);
          Game.tryRest(); sim.step(Math.round((CONFIG.rest.time || 2) / STEP) + 30); keep();
          if (!story.data || story.data.bonfire !== t.b.id) { find(2, 'save', `resting at ${t.id} does not save it`, t); return; }
          const open = Game.zones.filter(z => z.gate.open).map(z => z.id);
          story.resume(); Game.loading = 0; document.getElementById('loading').classList.remove('show'); keep();
          if (Game.level.id !== levelId) { find(1, 'save', `Continue after resting at ${t.id} loads ${Game.level.id}`); return; }
          sim.step(90); keep();
          const q = p(), s = t.b.spawn || t.b;
          if (Math.hypot(q.x - s.x, q.z - s.z) > 3) find(1, 'save', `Continue after resting at ${t.id} puts the player at (${r1(q.x)}, ${r1(q.z)}), not the bonfire`, q);
          if (!q.grounded || q.y < W().killY + 0.5) find(1, 'save', `Continue at ${t.id}: the player is not on the floor`, q);
          const lost = open.filter(id => !Game.zones.find(z => z.id === id).gate.open);
          if (lost.length) find(1, 'save', `Continue at ${t.id} closes won gates again: ${lost.join(', ')}`, q);
          // And a death after resting: back at this bonfire, on the floor.
          p().die(); sim.until(() => p().alive() && Game.deathTimer === 0, CONFIG.death.respawnDelay + 3); lastDeaths = deaths.length; sim.step(60); keep();
          const d = p();
          if (!d.alive() || Math.hypot(d.x - s.x, d.z - s.z) > 3 || !d.grounded) find(1, 'save', `a death after resting at ${t.id} does not put the player back at it, on the floor`, d);
          // The rebuilt level has its own targets' objects: refresh the zone links.
          for (const u of targets) if (u.zone) u.zone = Game.zones.find(z => z.id === u.id);
          for (const u of targets) if (u.g) u.g = W().gates.find(g => g.id === u.id);
        }
        if (t.kind === 'zone') {
          // The fight: first 8 s of it as it plays, the walker standing in it (blows pass through it): no fighter may
          // fall out of the level, end inside a wall, or stand stuck far from the player while awake.
          const z = t.zone;
          if (z.actors.some(a => a.alive())) {
            const was = fell.length, from = new Map(z.actors.map(a => [a, { x: a.x, z: a.z }]));
            fighting = true; let moved = new Map(z.actors.map(a => [a, 0])), last = new Map(from);
            for (let i = 0; i < 8 * 60; i++) {
              stepOne();
              for (const a of z.actors) { const l = last.get(a); moved.set(a, moved.get(a) + Math.hypot(a.x - l.x, a.z - l.z)); last.set(a, { x: a.x, z: a.z }); }
            }
            fighting = false;
            for (const f of fell.slice(was)) find(1, 'fight', `${f.id}${f.zone ? ' of ' + f.zone : ''} falls out of the level in its fight`, f.at);
            for (const a of z.actors) {
              if (!a.alive()) continue;
              const s = insideSolid(a.x, a.y, a.z, a.radius, a.height);
              if (s) { find(2, 'fight', `${a.baseDef.id} of ${z.id} ends inside a ${s.kind || 'wall'} in its fight`, a); out.frames.push(await snap('in-wall')); }
              const d = Math.hypot(a.x - p().x, a.z - p().z);
              if (!a.in('unaware') && a.state !== A.ES.DORMANT && d > 6 && moved.get(a) < 1 && !a.def.ranged && !(a.def.attacks || []).some(k => k.projectile))
                find(3, 'fight', `${a.baseDef.id} of ${z.id} stands still ${r1(d)} m from the player for its fight's first 8 s`, a);
            }
          }
          for (let i = 0; i < 4 && !z.gate.open; i++) {
            for (const a of z.actors) if (busy(a)) { sim.until(() => !busy(a), 20); keep(); }
            const left = z.actors.filter(a => a.alive());
            for (const a of left) {
              const r = await walk({ x: a.x, y: a.y, z: a.z }, `${a.baseDef.id} of ${z.id}`);
              if (r === 'noroute' && a.alive() && !busy(a)) { find(1, 'enemy', `${a.baseDef.id} of ${z.id} cannot be reached: its gate cannot open`, a); out.frames.push(await snap('unreachable')); finish(a); }
              else if (a.alive() && !busy(a) && Math.hypot(a.x - p().x, a.z - p().z) < 9) finish(a);
            }
            sim.step(10);
          }
          sim.step(Math.round(1.5 / STEP)); keep();
          if (!z.gate.open) { find(1, 'gate', `${z.id}'s gate stays shut after its fight`, z.gate); out.frames.push(await snap('shut-gate')); z.gate.open = true; }
          if (/boss/.test(z.id) || z.actors.some(a => a.isBoss && a.isBoss())) out.bossZone = z.id;
        }
      };

      for (let pass = 0; pass < 60; pass++) {
        const left = targets.filter(t => !t.done);
        if (!left.length) break;
        // The nearest target with a route; zones only in their order (a later zone's trigger may lie past an earlier gate).
        let best = null, bestPath = null;
        // The chapter's last fight ends it (the Final Castle's into its ending): everything else first.
        const lastZone = Game.zones[Game.zones.length - 1];
        for (const t of left) {
          if (t.zone && t.zone === lastZone && left.length > 1 && left.some(u => u !== t && route(u))) continue;
          const path = route(t);
          if (!path) continue;
          let len = 0, a = body(); for (const w of path) { len += Math.hypot(w.x - a.x, w.z - a.z); a = w; }
          if (!best || len < best.len) { best = { t, len }; bestPath = path; }
        }
        if (!best) {
          // A trap floor the road drops through (the tower's passage, Aurel's lane, the abbey's colonnade): walk up to
          // its edge, step onto it and fall with it, before calling anything unreachable.
          const trap = W().traps.find(t => t.state === 'set' && !t.tried && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([sx, sz]) => {
            const c = t.collapse, cx = (c[0] + c[1]) / 2, cz = (c[2] + c[3]) / 2;
            const e = { x: sx ? (sx < 0 ? c[0] - 1 : c[1] + 1) : cx, z: sz ? (sz < 0 ? c[2] - 1 : c[3] + 1) : cz };
            e.y = floorAt(e.x, e.z, t.y + 0.5);
            return Number.isFinite(e.y) && route(e) && (t.edge = e);
          }));
          if (trap) {
            trap.tried = true;
            await walk(trap.edge, `trap ${trap.id}`);
            const c = trap.trigger, cx = (c[0] + c[1]) / 2, cz = (c[2] + c[3]) / 2;
            sim.until(() => { const q = p(); sim.move(cx - q.x, cz - q.z); keep(); sweep(); return trap.state === 'sprung' && q.grounded && q.y < trap.y - 0.5 || Math.hypot(cx - q.x, cz - q.z) < 0.5; }, 8);
            sim.move(null); sim.until(() => trap.state === 'sprung' && p().grounded && p().y < trap.y - 0.5, 4); keep();
            if (trap.state !== 'sprung') find(2, 'trap', `trap ${trap.id} does not spring when walked onto`, p());
            out.visited.push(`trap:${trap.id}`);
            continue;
          }
          // Nothing reachable: the next shut gate in zone order is the block. Open it (noted) and go on.
          const z = Game.zones.find(q => !q.gate.open);
          const names = left.map(t => `${t.kind} ${t.id}`).join(', ');
          if (!z) { find(1, 'path', `no route to ${names}`, p()); out.frames.push(await snap('no-route')); for (const t of left) t.done = true; break; }
          const zt = targets.find(t => t.zone === z);
          if (zt && !zt.done) {
            find(1, 'path', `no route to ${z.id}'s fight (to ${names})`, p()); out.frames.push(await snap('no-route'));
            put(zt.x, zt.z, zt.y + 0.3); await arrive(zt);
          } else { z.gate.open = true; z.gate.lift = 1; }
          continue;
        }
        const r = await walk(best.t, `${best.t.kind} ${best.t.id}`);
        if (r !== 'ok') { find(2, 'path', `the walk to ${best.t.kind} ${best.t.id} failed (${r})`, p()); put(best.t.x, best.t.z, best.t.y + 0.3); }
        await arrive(best.t);
        if (best.t.kind === 'zone' && best.t.id === out.bossZone) out.frames.push(await snap('boss-won'));
      }

      // ---- the exit ----------------------------------------------------------------------------------------------
      for (const e of Game.enemies) if (e.alive() && e.zone && !Game.zones.find(z => z.id === e.zone).gate.open) finish(e);
      sim.step(10);
      if (!Game.complete) find(1, 'exit', `the level does not complete with every fight won (shut: ${Game.zones.filter(z => !z.gate.open).map(z => z.id).join(', ')})`, p());
      const chapters = A.STORY.chapters.map(c => c.level), next = chapters[chapters.indexOf(levelId) + 1] || null;
      const N = CONFIG.nextLevel;
      sim.until(() => Game.level.id !== levelId || Game.mode !== 'play' || (typeof finale !== 'undefined' && finale.state && finale.state.ending), N.delay + N.fadeTime + 3);
      const ending = L.ending && typeof finale !== 'undefined' && finale.state && finale.state.ending;
      out.exit = Game.level.id !== levelId ? `next: ${Game.level.id}` : ending ? 'ending' : `mode ${Game.mode}`;
      if (next && !L.ending && Game.level.id !== next) find(1, 'exit', `the chapter does not carry on into ${next} (${out.exit})`, p());
      if (L.ending && !ending && Game.level.id === levelId) find(1, 'exit', `the chapter's ending never starts (${out.exit})`, p());
    } catch (e) {
      find(1, 'crash', `the audit threw: ${e.message}`, p());
      out.errors.push(String(e.stack || e));
    } finally {
      sim.move(null);
      listen.deaths = listen.fell = null;
      window.removeEventListener('error', onErr); window.removeEventListener('unhandledrejection', onErr);
      nav.maxNodes = oldNodes;
      out.deaths = deaths.length;
      out.errors.push(...errs);
    }
    out.findings.sort((a, b) => a.sev - b.sev);
    return out;
  };
})();
