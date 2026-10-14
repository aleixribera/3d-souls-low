'use strict';
// Three.js addons, imported by the loader in combat-arena-3d.html.
const { EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, mergeGeometries, mergeVertices } = THREE_ADDONS;

// ============================================================================
// 0. Shared helpers
// ============================================================================
// Defined before everything else so that any code, including level building, can use them.
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const turnToward = (cur, target, maxStep) => cur + clamp(angDiff(target, cur), -maxStep, maxStep);
const isInFront = (b, x, z) => (x - b.x) * Math.sin(b.yaw) + (z - b.z) * Math.cos(b.yaw) > 0;
const BODY_HEIGHT = 1.8;   // a humanoid at scale 1; collision height = BODY_HEIGHT * scale, so it always matches the model
const warned = new Set();
const warnOnce = msg => { if (!warned.has(msg)) { warned.add(msg); console.warn(msg); } };

// Flat geometry for room-style levels. A rect is [x0, x1, z0, z1]; a box is { x0, x1, z0, z1 }.
const inRect = (r, x, z) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
const insideRooms = (rooms, x, z, m = 0) => rooms.some(({ rect: r }) => x >= r[0] + m && x <= r[1] - m && z >= r[2] + m && z <= r[3] - m);
// Fraction (0..1) along the segment from (x, z) by (dx, dz) where it first enters box b grown by m; Infinity if never.
function segBox(x, z, dx, dz, b, m = 0) {
  let t0 = 0, t1 = 1;
  for (const [p, d, lo, hi] of [[x, dx, b.x0 - m, b.x1 + m], [z, dz, b.z0 - m, b.z1 + m]]) {
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return Infinity; continue; }
    let a = (lo - p) / d, c = (hi - p) / d;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    if (t0 > t1) return Infinity;
  }
  return t0;
}
// Wall boxes around the union of the rooms: every stretch of a room's edge that no other room touches,
// plus the outer corners. Each box remembers its room (for its material).
function roomWalls(rooms) {
  const T = CONFIG.rooms.wallThickness, eps = 1e-6, out = [];
  const overlapsRoom = b => rooms.some(({ rect: o }) => b.x0 < o[1] - eps && b.x1 > o[0] + eps && b.z0 < o[3] - eps && b.z1 > o[2] + eps);
  const subtract = (a, b, cuts) => {   // parts of [a, b] not covered by the cuts
    let segs = [[a, b]];
    for (const [c0, c1] of cuts)
      segs = segs.flatMap(([s0, s1]) => c1 <= s0 || c0 >= s1 ? [[s0, s1]] : [[s0, c0], [c1, s1]].filter(([u, v]) => v - u > eps));
    return segs;
  };
  for (const room of rooms) {
    const [x0, x1, z0, z1] = room.rect, others = rooms.filter(o => o !== room).map(o => o.rect);
    const edges = [   // along: the axis the edge runs along; at: its fixed coordinate; out: outward side
      { along: 'x', at: z1, out: 1, lo: x0, hi: x1, touch: o => Math.abs(o[2] - z1) < eps, span: o => [o[0], o[1]] },
      { along: 'x', at: z0, out: -1, lo: x0, hi: x1, touch: o => Math.abs(o[3] - z0) < eps, span: o => [o[0], o[1]] },
      { along: 'z', at: x1, out: 1, lo: z0, hi: z1, touch: o => Math.abs(o[0] - x1) < eps, span: o => [o[2], o[3]] },
      { along: 'z', at: x0, out: -1, lo: z0, hi: z1, touch: o => Math.abs(o[1] - x0) < eps, span: o => [o[2], o[3]] },
    ];
    for (const e of edges) {
      for (const [a, b] of subtract(e.lo, e.hi, others.filter(e.touch).map(e.span))) {
        const t0 = e.out > 0 ? e.at : e.at - T;
        out.push(e.along === 'x' ? { x0: a, x1: b, z0: t0, z1: t0 + T, room } : { x0: t0, x1: t0 + T, z0: a, z1: b, room });
      }
    }
    for (const cx of [x0, x1]) for (const cz of [z0, z1]) {
      const bx = cx === x0 ? x0 - T : x1, bz = cz === z0 ? z0 - T : z1;
      const sq = { x0: bx, x1: bx + T, z0: bz, z1: bz + T, room };
      if (!overlapsRoom(sq)) out.push(sq);
    }
  }
  return out;
}
