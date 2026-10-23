'use strict';
// Idle companions: fair human assignments and walking routes over the actual collision floors.
// Combat acquisition still belongs to bot.js. No movement here changes a body's position.
const BotNavigation = (() => {
  const idle = () => ({ x: 0, z: 0, has: false });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  // Dormant/lurking enemies still mark the road ahead. Ties keep a stable player-id order.
  function assign(people, followers, enemies, previous = new Map()) {
    const upcoming = enemies.filter(e => e.alive() && e.state !== ES.RETREAT && e.state !== ES.GONE);
    const ranked = people.filter(p => !p.botId && p.alive()).map(p => ({ p,
      ahead: Math.min(Infinity, ...upcoming.map(e => distance(p, e))) }))
      .sort((a, b) => a.ahead - b.ahead || a.p.id.localeCompare(b.p.id));
    const result = new Map();
    if (!ranked.length) return result;
    const live = followers.filter(b => b.alive()), base = Math.floor(live.length / ranked.length), extra = live.length % ranked.length;
    const slots = new Map(ranked.map(({ p }, i) => [p.id, base + (i < extra ? 1 : 0)]));
    for (const b of live) {
      const id = previous.get(b.id);
      if (slots.get(id) > 0) { result.set(b.id, id); slots.set(id, slots.get(id) - 1); }
    }
    for (const b of live) if (!result.has(b.id)) {
      const lead = ranked.find(({ p }) => slots.get(p.id) > 0).p;
      result.set(b.id, lead.id); slots.set(lead.id, slots.get(lead.id) - 1);
    }
    return result;
  }

  const grids = new WeakMap();
  function gridFor(w, body) {
    const C = CONFIG.bot.navigation;
    // Gates and collapsed floors change connectivity, so retire cached edges at those changes.
    const stamp = w.gates.map(g => g.open ? '1' : '0').join('') + '/' + (w.traps || []).map(t => t.state).join(',');
    let grid = grids.get(w);
    if (grid && grid.stamp === stamp && grid.slabs === w.slabs) return grid;
    const cells = new Map(), edges = new Map(), buckets = new Map(), tile = C.tile;
    const boxes = [...(w.solids || []), ...w.gates.filter(g => !g.open && g.box).map(g => g.box)];
    for (const b of boxes) for (let x = Math.floor(b.x0 / tile); x <= Math.floor(b.x1 / tile); x++)
      for (let z = Math.floor(b.z0 / tile); z <= Math.floor(b.z1 / tile); z++) {
        const key = x + ',' + z; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(b);
      }
    const r = body.radius + C.clearance, height = body.height, H = CONFIG.height, step = C.cell;
    const obstacles = p => {
      const found = new Set();
      for (let x = Math.floor((p.x - r) / tile); x <= Math.floor((p.x + r) / tile); x++)
        for (let z = Math.floor((p.z - r) / tile); z <= Math.floor((p.z + r) / tile); z++)
          for (const b of buckets.get(x + ',' + z) || []) found.add(b);
      return found;
    };
    function walkable(p) {
      if (!Number.isFinite(p.y)) return false;
      if (!w.solids) {
        if (p.x < w.minX + r || p.x > w.maxX - r) return false;
        let side = w.halfZ;
        for (const a of w.alcoves || []) if (p.x >= a.x0 + r && p.x <= a.x1 - r && Math.sign(p.z) === a.side) side += a.depth;
        if (Math.abs(p.z) > side - r) return false;
        for (const g of w.gates) if (!g.open && Math.abs(p.x - g.x) < w.gateThickness / 2 + r) return false;
      }
      for (const b of obstacles(p)) if (b.y1 > p.y + H.stepUp && b.y0 < p.y + height &&
        Math.hypot(p.x - clamp(p.x, b.x0, b.x1), p.z - clamp(p.z, b.z0, b.z1)) < r) return false;
      if (w.ceilingAt(p.x, p.z, p.y + H.stepUp) < p.y + height) return false;
      for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
        const floor = w.groundAt(p.x + dx, p.z + dz, p.y);
        if (!Number.isFinite(floor) || p.y - floor > C.maxDrop || floor - p.y > H.stepUp) return false;
      }
      for (const h of w.hazards || []) if (Math.abs(h.y - p.y) < H.stepUp &&
        p.x > h.rect[0] - r && p.x < h.rect[1] + r && p.z > h.rect[2] - r && p.z < h.rect[3] + r) return false;
      for (const t of w.traps || []) if (t.state !== 'sprung' && t.collapse && Math.abs(t.y - p.y) < H.stepUp &&
        p.x > t.collapse[0] - r && p.x < t.collapse[1] + r && p.z > t.collapse[2] - r && p.z < t.collapse[3] + r) return false;
      return true;
    }
    // Sample in travel order: this follows ramps/steps, rather than connecting overlapping floors.
    function clear(a, b) {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / C.sample));
      let y = a.y;
      for (let i = 1; i <= n; i++) {
        const x = lerp(a.x, b.x, i / n), z = lerp(a.z, b.z, i / n), floor = w.groundAt(x, z, y);
        if (!Number.isFinite(floor) || y - floor > C.maxDrop || floor - y > H.stepUp || !walkable({ x, y: floor, z })) return false;
        y = floor;
      }
      return Math.abs(y - b.y) < C.heightTolerance;
    }
    function cell(ix, iz) {
      const key = ix + ',' + iz;
      if (!cells.has(key)) {
        const x = ix * step, z = iz * step, floors = w.regions
          ? w.regions.filter(R => inRect(R.rect, x, z)).map(R => R.floorAt(x, z)) : [0];
        const nodes = [];
        for (const y of floors) if (!nodes.some(n => Math.abs(n.y - y) < C.heightTolerance) && walkable({ x, y, z }))
          nodes.push({ x, y, z, ix, iz, key: key + '/' + y });
        cells.set(key, nodes);
      }
      return cells.get(key);
    }
    function near(p, relaxed = false) {
      const n = Math.ceil(C.anchor / step), ix = Math.round(p.x / step), iz = Math.round(p.z / step), list = [];
      for (let x = ix - n; x <= ix + n; x++) for (let z = iz - n; z <= iz + n; z++) for (const q of cell(x, z))
        if (distance(p, q) <= C.anchor && (relaxed ? Math.abs(p.y - q.y) <= H.stepDown && !closedGateBetween({ ...p, height }, { ...q, height }) : clear(p, q))) list.push(q);
      return list.sort((a, b) => distance(p, a) - distance(p, b)).slice(0, C.anchors);
    }
    function neighbors(p) {
      if (!edges.has(p.key)) {
        const list = [];
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz)
          for (const q of cell(p.ix + dx, p.iz + dz)) if (clear(p, q)) list.push(q);
        edges.set(p.key, list);
      }
      return edges.get(p.key);
    }
    grid = { stamp, slabs: w.slabs, walkable, clear, near, neighbors }; grids.set(w, grid); return grid;
  }
  // A bounded A* search with a heap, shared lazy floor/collision samples and independent search state.
  function* searchRoute(me, goal) {
    const C = CONFIG.bot.navigation, g = gridFor(world, me);
    if (g.walkable(me) && g.clear(me, goal)) return [goal];
    const starts = g.near(me, !g.walkable(me)), ends = g.near(goal, !g.walkable(goal));
    if (!starts.length || !ends.length) return null;
    const endKeys = new Set(ends.map(n => n.key)), costs = new Map(), parents = new Map(), heap = [];
    function push(item) {
      let i = heap.length; heap.push(item);
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p].f <= item.f) break; heap[i] = heap[p]; i = p; } heap[i] = item;
    }
    function pop() {
      const first = heap[0], last = heap.pop();
      if (heap.length) { let i = 0;
        while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
          if (heap[c].f >= last.f) break; heap[i] = heap[c]; i = c; } heap[i] = last;
      }
      return first;
    }
    for (const p of starts) { const cost = distance(me, p); costs.set(p.key, cost); push({ p, cost, f: cost + distance(p, goal) }); }
    for (let visited = 0; heap.length && visited < C.maxNodes; visited++) {
      if (visited && visited % C.searchSteps === 0) yield;
      const { p, cost } = pop(); if (cost !== costs.get(p.key)) continue;
      if (endKeys.has(p.key)) {
        const path = g.walkable(goal) && g.clear(p, goal) ? [goal, p] : [p]; let at = p;
        while (parents.has(at.key)) { at = parents.get(at.key); path.push(at); }
        return path.reverse();
      }
      for (const q of g.neighbors(p)) {
        const next = cost + distance(p, q);
        if (next >= (costs.get(q.key) ?? Infinity)) continue;
        costs.set(q.key, next); parents.set(q.key, p); push({ p: q, cost: next, f: next + distance(q, goal) });
      }
    }
    return null;
  }

  function route(me, goal) {
    const search = searchRoute(me, goal); let step; do { step = search.next(); } while (!step.done); return step.value;
  }

  function create() {
    let leader = null, walking = false, path = null, goal = null, grid = null, replan = 0, search = null;
    let sampleAt = null, sampleTime = 0, stuck = 0, recovery = null;
    function reset() { leader = null; walking = false; path = goal = grid = search = null; replan = 0; sampleAt = null; sampleTime = stuck = 0; recovery = null; }
    function move(dt, me, lead) {
      const C = CONFIG.bot.navigation, follow = CONFIG.bot.follow;
      recovery = null;
      if (!lead || !lead.alive() || lead.botId) { reset(); return idle(); }
      if (leader !== lead.id) { reset(); leader = lead.id; }
      const g = gridFor(world, me), d = distance(me, lead);
      const together = g.clear(me, lead) || d < follow[0] && !gateBetween(me, { ...lead, height: me.height });
      if (together && d < follow[0]) walking = false;
      else if (d > follow[1] || !together) walking = true;
      if (!walking || !me.isFree() || !me.grounded) { sampleAt = null; sampleTime = stuck = 0; return idle(); }
      replan -= dt;
      if (!goal || (!search && (distance(goal, lead) > C.goalMoved || replan <= 0)) || grid !== g) {
        if (grid !== g) path = null;
        goal = { x: lead.x, y: lead.y, z: lead.z }; grid = g;
        search = searchRoute({ x: me.x, y: me.y, z: me.z, radius: me.radius, height: me.height }, goal);
        if (path && !g.clear(me, path[0])) path = null;
      }
      if (search) {
        const step = search.next();
        if (step.done) { path = step.value; search = null; replan = path ? C.replan : C.retry; }
        else if (!path) { sampleAt = null; sampleTime = stuck = 0; return idle(); }
      }
      if (!path) { sampleAt = null; sampleTime = stuck = 0; return idle(); }
      // Count actual displacement, not distance to the player: walking a long detour is healthy progress.
      if (!sampleAt) sampleAt = { x: me.x, y: me.y, z: me.z };
      sampleTime += dt;
      if (sampleTime >= C.progressTime) {
        stuck = distance(me, sampleAt) < C.progressDistance ? stuck + sampleTime : 0;
        sampleAt = { x: me.x, y: me.y, z: me.z }; sampleTime = 0;
      }
      while (path.length && distance(me, path[0]) < C.waypoint) path.shift();
      if (!path.length) { replan = 0; sampleAt = null; sampleTime = stuck = 0; return idle(); }
      let next = path[0], skip = 0;
      // A search may finish after the bot has advanced along its previous route. Reconnect ahead,
      // discarding old start nodes instead of walking backwards to that captured starting position.
      for (let i = 0; i < path.length; i++) {
        const q = path[i];
        if (distance(me, q) <= C.lookAhead && g.clear(me, q)) { next = q; skip = i; }
      }
      if (skip) path.splice(0, skip);
      if (!search && stuck >= C.stuckTime) {
        // A short safe nudge along an existing route; never jump to a distant player or skip a gate.
        recovery = path.find(q => distance(me, q) >= C.recoverMin && distance(me, q) <= C.recoverMax && g.walkable(q)) || null;
        if (!recovery) {
          const len = Math.hypot(next.x - me.x, next.z - me.z), step = Math.min(C.recoverMax, len);
          if (step >= C.recoverMin) {
            const x = me.x + (next.x - me.x) * step / len, z = me.z + (next.z - me.z) * step / len;
            const q = { x, y: world.groundAt(x, z, me.y), z };
            if (g.walkable(q) && g.clear(me, q)) recovery = q;
          }
        }
        if (recovery) { stuck = 0; sampleAt = null; replan = 0; }
      }
      const dx = next.x - me.x, dz = next.z - me.z, len = Math.hypot(dx, dz);
      return len > C.directionEpsilon ? { x: dx / len, z: dz / len, has: true } : idle();
    }
    return { move, reset, get leader() { return leader; }, get recovery() { return recovery; } };
  }
  return { assign, create, route };
})();
