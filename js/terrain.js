'use strict';
// ============================================================================
// 2a. Terrain: floors at heights, ramps and stairs, edges (room-style levels)
// ============================================================================
// A room is a box: its rect [x0, x1, z0, z1] times [y, y + height]. A ramp is a rect whose floor rises
// in a straight line along `axis` ('x' or 'z') from `from` (at the low-coordinate end) to `to`. Rooms and
// ramps together are the level's regions: every place a body can stand. Regions may overlap in x/z when
// their height bands don't (a walkway over a courtyard). Everything else is derived here, once per level:
//   groundAt(x, z, y)   the highest floor at or below y + stepUp, or -Infinity over a pit,
//   ceilingAt(x, z, y)  the lowest floor underside or roof above y (Infinity under open sky),
//   solids              boxes bodies collide with: walls, rails, ledge faces, lintels, corner posts, pillars, blocks,
//   slabs               floors and roofs: they block sight and the camera, never bodies (landing is groundAt's job).
// Every box is { x0, x1, z0, z1, y0, y1 }; solids and slabs also carry `kind` and the `region` that owns them (for
// its colours), and rails are `low` (they stop walking, not sight or the camera).
// A region's roof (`roof`, a list of rects) leaves out wherever it would lie inside another room's floor slab: that
// floor is already the ceiling there (it would only flicker against it), and holes cut in it show the room below.
// Room edges: n = +z (rect[3]), s = -z (rect[2]), e = +x (rect[1]), w = -x (rect[0]). Each is 'wall' (the
// default), 'rail' or 'open'. Where another region touches an edge at the same floor height it is a doorway;
// where a lower region touches it, a ledge face fills the drop below the floor.
const EDGE_KINDS = ['wall', 'rail', 'open'];
const EDGES = {   // fixed coordinate (rect index), outward sign, the axis the edge runs along (rect indices lo/hi)
  n: { at: 3, out: 1, along: 'x', lo: 0, hi: 1, opp: 's' },
  s: { at: 2, out: -1, along: 'x', lo: 0, hi: 1, opp: 'n' },
  e: { at: 1, out: 1, along: 'z', lo: 2, hi: 3, opp: 'w' },
  w: { at: 0, out: -1, along: 'z', lo: 2, hi: 3, opp: 'e' },
};

// A room or ramp as a region: floorAt(x, z), its floor range lo..hi, and `top` (lo..hi plus headroom).
function makeRegion(src, kind, L) {
  const r = src.rect, height = src.height ?? L.wallHeight;
  const edges = { n: 'wall', s: 'wall', e: 'wall', w: 'wall', ...(src.edges || {}) };
  if (kind === 'ramp') {
    const i = src.axis === 'x' ? 0 : 2, len = r[i + 1] - r[i];
    const floorAt = src.axis === 'x' ? (x) => lerp(src.from, src.to, clamp((x - r[0]) / len, 0, 1))
                                     : (x, z) => lerp(src.from, src.to, clamp((z - r[2]) / len, 0, 1));
    const lo = Math.min(src.from, src.to), hi = Math.max(src.from, src.to);
    return { id: src.id, kind, src, rect: r, axis: src.axis, floorAt, lo, hi, height, top: hi + height, open: true, edges, pits: [] };
  }
  const y = src.y ?? 0;
  return { id: src.id, kind, src, rect: r, axis: null, floorAt: () => y, lo: y, hi: y, height, top: y + height,
           open: !!src.open, edges, pits: src.pits || [] };
}

// The parts of rect r not covered by any of the holes (axis-aligned rects).
function rectMinus(r, holes) {
  let parts = [r];
  for (const h of holes) {
    parts = parts.flatMap(p => {
      if (h[0] >= p[1] || h[1] <= p[0] || h[2] >= p[3] || h[3] <= p[2]) return [p];
      const x0 = Math.max(p[0], h[0]), x1 = Math.min(p[1], h[1]), out = [];
      if (h[0] > p[0]) out.push([p[0], h[0], p[2], p[3]]);
      if (h[1] < p[1]) out.push([h[1], p[1], p[2], p[3]]);
      if (h[2] > p[2]) out.push([x0, x1, p[2], h[2]]);
      if (h[3] < p[3]) out.push([x0, x1, h[3], p[3]]);
      return out;
    });
  }
  return parts;
}

// A hole in region R's floor at (x, z): one of its pits, or one opened since the level started (`holes`, a world's
// list of { region, rect }: sprung traps).
const NO_HOLES = [];
const inHole = (r, x, z) => x > r[0] && x < r[1] && z > r[2] && z < r[3];
const inPit = (R, x, z, holes = NO_HOLES) => (R.pits.length > 0 && R.pits.some(p => inHole(p, x, z)))
  || (holes.length > 0 && holes.some(h => h.region === R && inHole(h.rect, x, z)));

// The highest floor at (x, z) that a body with its feet at y can stand on (within stepUp above), or -Infinity.
function groundIn(regions, x, z, y, holes) {
  const lim = y + CONFIG.height.stepUp;
  let best = -Infinity;
  for (const R of regions) {
    const r = R.rect;
    if (x < r[0] || x > r[1] || z < r[2] || z > r[3]) continue;
    const h = R.floorAt(x, z);
    if (h > lim || h <= best || inPit(R, x, z, holes)) continue;
    best = h;
  }
  return best;
}
// The lowest floor underside or roof above height y at (x, z), or Infinity.
function ceilingIn(regions, x, z, y, holes) {
  const slab = CONFIG.height.slab;
  let best = Infinity;
  for (const R of regions) {
    const r = R.rect;
    if (x < r[0] || x > r[1] || z < r[2] || z > r[3]) continue;
    const under = R.floorAt(x, z) - slab;
    if (under >= y && under < best && !inPit(R, x, z, holes)) best = under;
    if (!R.open && R.top >= y && R.top < best) best = R.top;
  }
  return best;
}

// The room a trap's collapse area lies in, on its floor (the one at the trap's `y`, or the top-most there), or null.
function trapRoom(TR, t) {
  const c = t.collapse, y = TR.floorY((c[0] + c[1]) / 2, (c[2] + c[3]) / 2, t.y);
  return TR.regions.find(R => R.kind === 'room' && Math.abs(R.lo - y) < 1e-6
    && c[0] >= R.rect[0] && c[1] <= R.rect[1] && c[2] >= R.rect[2] && c[3] <= R.rect[3]) || null;
}

// Build the regions, solids and slabs of a room-style level (cached per level).
const terrainCache = new WeakMap();
function terrainFor(L) {
  if (!terrainCache.has(L)) terrainCache.set(L, buildTerrain(L));
  return terrainCache.get(L);
}
function buildTerrain(L) {
  const H = CONFIG.height, T = CONFIG.rooms.wallThickness, eps = 1e-6, tol = 0.05;
  const regions = [...L.rooms.map(R => makeRegion(R, 'room', L)), ...(L.ramps || []).map(R => makeRegion(R, 'ramp', L))];
  for (const R of regions) {
    const floorsOver = regions.filter(O => O !== R && O.kind === 'room' && Math.abs(O.lo - H.slab - R.top) < eps).map(O => O.rect);
    R.roof = R.open ? [] : rectMinus(R.rect, floorsOver);
  }
  const solids = [], slabs = [];
  const box = (x0, x1, z0, z1, y0, y1, extra) => (y1 - y0 > eps && x1 - x0 > eps && z1 - z0 > eps)
    ? { x0, x1, z0, z1, y0, y1, ...extra } : null;
  const push = (list, b) => { if (b) list.push(b); };

  // One edge of region R: split it where neighbours start and end (and every `segment` m along a slope),
  // decide each piece, merge runs of equal pieces, then turn them into boxes.
  function edgeSolids(R, k) {
    const E = EDGES[k], O_E = EDGES[E.opp], r = R.rect, at = r[E.at], lo = r[E.lo], hi = r[E.hi];
    const pt = s => E.along === 'x' ? [s, at] : [at, s];
    const ptOut = s => E.along === 'x' ? [s, at + E.out * T] : [at + E.out * T, s];   // a wall's depth into the neighbour
    const touching = regions.filter(O => O !== R && Math.abs(O.rect[O_E.at] - at) < eps
      && O.rect[O_E.lo] < hi - eps && O.rect[O_E.hi] > lo + eps);
    // Regions stacked under R along this edge (a walkway under a walkway): a ledge face stops at their top.
    const [s0, s1] = E.out > 0 ? [at - T, at] : [at, at + T], strip = E.along === 'x' ? [lo, hi, s0, s1] : [s0, s1, lo, hi];
    const stacked = regions.filter(O => O !== R && O.top <= R.lo - H.slab + eps && O.rect[0] < strip[1] - eps && O.rect[1] > strip[0] + eps
      && O.rect[2] < strip[3] - eps && O.rect[3] > strip[2] + eps);
    const span = O => E.along === 'x' ? [O.rect[0], O.rect[1]] : [O.rect[2], O.rect[3]];
    let cuts = [lo, hi];
    for (const O of touching) cuts.push(clamp(O.rect[O_E.lo], lo, hi), clamp(O.rect[O_E.hi], lo, hi));
    for (const O of stacked) cuts.push(...span(O).map(c => clamp(c, lo, hi)));
    if (R.axis === E.along || touching.some(O => O.axis === E.along))
      for (let s = lo + H.segment; s < hi - eps; s += H.segment) cuts.push(s);
    cuts = cuts.sort((a, b) => a - b).filter((c, i, a) => i === 0 || c - a[i - 1] > eps);
    const pieces = [];
    const piece = (kind, a, b, y0, y1) => {
      const last = pieces[pieces.length - 1];
      if (last && last.kind === kind && Math.abs(last.b - a) < eps && Math.abs(last.y0 - y0) < eps && Math.abs(last.y1 - y1) < eps) last.b = b;
      else if (y1 - y0 > eps) pieces.push({ kind, a, b, y0, y1 });
    };
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2;
      const hA0 = R.floorAt(...pt(a)), hA1 = R.floorAt(...pt(b)), hA = Math.min(hA0, hA1), hAx = Math.max(hA0, hA1);
      const topA = hAx + R.height;
      let same = null, higher = false, lowest = Infinity;
      for (const O of touching) {
        if (O.rect[O_E.lo] > m || O.rect[O_E.hi] < m) continue;
        const n0 = O.floorAt(...pt(a)), n1 = O.floorAt(...pt(b));
        if (Math.abs(n0 - hA0) < tol && Math.abs(n1 - hA1) < tol) {   // a doorway; a lintel above it clears the neighbour's floor
          if (!same) same = { O, top: Math.max(n0, n1, O.floorAt(...ptOut(a)), O.floorAt(...ptOut(b))) + O.height };
        }
        else if (Math.max(n0, n1) < hA - tol) lowest = Math.min(lowest, n0, n1);
        else if (Math.max(n0, n1) > hA + tol) higher = true;   // even partly higher (a stair's side): it closes the gap
      }
      const below = Math.max(-Infinity, ...stacked.filter(O => span(O)[0] <= m && span(O)[1] >= m).map(O => O.top));
      if (same) { if (topA > same.top + eps) piece('lintel', a, b, same.top, topA); }   // doorway
      else if (!higher) {   // a higher neighbour's own ledge face covers this stretch
        if (R.edges[k] === 'wall') piece('wall', a, b, hA, topA);
        else if (R.edges[k] === 'rail') piece('rail', a, b, hA, hAx + H.rail);
      }
      if (lowest < Infinity) piece('face', a, b, Math.max(lowest, below), hA);
    }
    for (const p of pieces) {
      const inside = p.kind === 'rail' || p.kind === 'face', t = p.kind === 'rail' ? H.railThickness : T;
      const [c0, c1] = inside ? (E.out > 0 ? [at - t, at] : [at, at + t]) : (E.out > 0 ? [at, at + t] : [at - t, at]);
      const b = E.along === 'x' ? box(p.a, p.b, c0, c1, p.y0, p.y1) : box(c0, c1, p.a, p.b, p.y0, p.y1);
      if (b) solids.push(Object.assign(b, { kind: p.kind, region: R, edge: k, low: p.kind === 'rail' }));
    }
  }

  for (const R of regions) {
    for (const k of Object.keys(EDGES)) edgeSolids(R, k);
    const [x0, x1, z0, z1] = R.rect;
    // Corner posts outside the corners between two walls, unless another region (in the same height band) is there.
    for (const [cx, kx] of [[x0, 'w'], [x1, 'e']]) for (const [cz, kz] of [[z0, 's'], [z1, 'n']]) {
      if (R.edges[kx] !== 'wall' || R.edges[kz] !== 'wall') continue;
      const bx = cx === x0 ? x0 - T : x1, bz = cz === z0 ? z0 - T : z1, y0 = R.floorAt(cx, cz), y1 = y0 + R.height;
      const taken = regions.some(O => bx < O.rect[1] - eps && bx + T > O.rect[0] + eps && bz < O.rect[3] - eps && bz + T > O.rect[2] + eps
        && y0 < O.top && y1 > O.lo - H.slab);
      if (!taken) solids.push(Object.assign(box(bx, bx + T, bz, bz + T, y0, y1), { kind: 'post', region: R, low: false }));
    }
    // Floor slabs (with holes for pits), stepped under a ramp; a roof unless the region is open.
    if (R.kind === 'ramp') {
      const ax = R.axis === 'x', a0 = ax ? x0 : z0, a1 = ax ? x1 : z1;
      for (let s = a0; s < a1 - eps; s += H.segment) {
        const s1 = Math.min(a1, s + H.segment), y = Math.min(ax ? R.floorAt(s) : R.floorAt(0, s), ax ? R.floorAt(s1) : R.floorAt(0, s1));
        const floor = { kind: 'floor', region: R };
        push(slabs, ax ? box(s, s1, z0, z1, y - H.slab, y, floor) : box(x0, x1, s, s1, y - H.slab, y, floor));
      }
    } else for (const p of rectMinus(R.rect, R.pits)) push(slabs, box(p[0], p[1], p[2], p[3], R.lo - H.slab, R.lo, { kind: 'floor', region: R }));
    for (const p of R.roof) push(slabs, box(p[0], p[1], p[2], p[3], R.top, R.top + H.slab, { kind: 'roof', region: R }));
    // Pillars: stone columns from floor to roof.
    const s = CONFIG.rooms.pillarSize / 2;
    for (const [px, pz] of (R.src.pillars || []))
      solids.push(Object.assign(box(px - s, px + s, pz - s, pz + s, R.lo, R.top), { kind: 'pillar', region: R, low: false }));
  }
  // Blocks: solid masses (a tower's core, a buttress) that are not rooms.
  for (const B of L.blocks || []) {
    const b = box(B.rect[0], B.rect[1], B.rect[2], B.rect[3], B.y0, B.y1);
    if (b) solids.push(Object.assign(b, { kind: 'block', region: null, block: B, low: false }));
  }
  const lowest = Math.min(...regions.map(R => R.lo));
  return {
    regions, solids, slabs, lowest, killY: lowest - H.killDepth,
    groundAt: (x, z, y) => groundIn(regions, x, z, y),
    ceilingAt: (x, z, y) => ceilingIn(regions, x, z, y),
    // The floor a placement stands on: the highest floor at (x, z) at or below y (default: the top-most one).
    floorY: (x, z, y = Infinity) => groundIn(regions, x, z, y),
  };
}
