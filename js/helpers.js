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

// Geometry for room-style levels. A rect is [x0, x1, z0, z1]; a box is { x0, x1, z0, z1 } plus, in 3D, y0 and y1.
const inRect = (r, x, z) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
// An area: a rect, or a list of rects (a zone's trigger can be several rooms).
const inArea = (a, x, z) => Array.isArray(a[0]) ? a.some(r => inRect(r, x, z)) : inRect(a, x, z);
// The overlap of two rects, or null.
const rectAnd = (a, b) => {
  const r = [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
  return r[0] < r[1] && r[2] < r[3] ? r : null;
};
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
// The same in 3D: from (x, y, z) by (dx, dy, dz). A box without y0/y1 spans every height.
function segBox3(x, y, z, dx, dy, dz, b, m = 0) {
  let t0 = 0, t1 = 1, lo, hi, a, c;
  for (let i = 0; i < 3; i++) {
    let p, d;
    if (i === 0) { p = x; d = dx; lo = b.x0 - m; hi = b.x1 + m; }
    else if (i === 1) { p = z; d = dz; lo = b.z0 - m; hi = b.z1 + m; }
    else { if (b.y0 === undefined) break; p = y; d = dy; lo = b.y0 - m; hi = b.y1 + m; }
    if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return Infinity; continue; }
    a = (lo - p) / d; c = (hi - p) / d;
    if (a > c) { const s = a; a = c; c = s; }
    if (a > t0) t0 = a;
    if (c < t1) t1 = c;
    if (t0 > t1) return Infinity;
  }
  return t0;
}
