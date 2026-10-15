'use strict';
// ---- shared character helpers (player and enemies) -----------------------------------------------
// Where an attack is at time t: { phase, hitIndex, p (0..1 through the phase), done }.
function attackTimeline(a, t) {
  for (let i = 0; i < a.hits.length; i++) {
    const h = a.hits[i];
    if (t < h.startup) return { phase: PHASE.STARTUP, hitIndex: i, p: t / h.startup };
    t -= h.startup;
    if (t < h.active) return { phase: PHASE.ACTIVE, hitIndex: i, p: t / h.active };
    t -= h.active;
  }
  return { phase: PHASE.RECOVERY, hitIndex: a.hits.length - 1, p: Math.min(1, t / a.recovery), done: t >= a.recovery };
}
// Attack pose for either side; alternate strikes of a combo mirror.
function poseAttack(rig, attack, phase, p, hitIndex = 0) {
  lookup(ANIMS, attack.anim, 'animation', 'sweep')(rig, phase, p, hitIndex % 2 ? -1 : 1);
}
// Hurt (short flinch) and stagger (longer, wobbling) poses, shared.
function flinchPose(r, stagger, p, tt) {
  const arc = Math.sin(clamp(p, 0, 1) * Math.PI);
  if (!stagger) { r.tip.rotation.x = -0.17 * arc; return; }
  r.tip.rotation.x = -0.31 * arc;
  r.spin.rotation.z = Math.sin(tt * 8.5) * 0.11; r.armL.rotation.x = 0.3; r.armR.rotation.x = 0.3;
}
function deathPose(rig, tt, fade) {
  rig.tip.rotation.x = -Math.PI / 2 * ease(tt / 0.9);
  rig.armL.rotation.x = rig.armR.rotation.x = -0.2;
  rig.setOpacity(1 - clamp((tt - 0.7) / (fade - 0.7), 0, 1));
}
// Poise: refills after resetTime without being hit.
function tickPoise(b, dt, resetTime, max) { b.poiseTimer += dt; if (b.poiseTimer > resetTime) b.poise = max; }
// One rule for both sides: a swing already out is not interrupted (poise refills instead).
// Returns POISE.STAGGER (poise broken), POISE.FLINCH, or POISE.NONE (committed).
function applyPoise(b, amount, committed, max) {
  b.poise -= amount; b.poiseTimer = 0;
  if (committed) { if (b.poise <= 0) b.poise = max; return POISE.NONE; }
  return b.poise <= 0 ? POISE.STAGGER : POISE.FLINCH;
}
// True if a closed gate stands between two bodies: no seeing, locking or hitting through it.
// In room-style levels walls, pillars, floors and roofs block the line too (in 3D, eye to eye), but rails don't.
const EYE = 0.75;   // eye height as a fraction of body height
function gateBetween(a, b) {
  if (world && world.solids) {
    const ya = a.y + a.height * EYE, dx = b.x - a.x, dy = b.y + b.height * EYE - ya, dz = b.z - a.z;
    for (const s of world.solids) if (!s.low && segBox3(a.x, ya, a.z, dx, dy, dz, s) <= 1) return true;
    for (const s of world.slabs) if (segBox3(a.x, ya, a.z, dx, dy, dz, s) <= 1) return true;
    for (const g of world.gates) if (!g.open && segBox3(a.x, ya, a.z, dx, dy, dz, g.box) <= 1) return true;
    return false;
  }
  return !!world && world.gates.some(g => !g.open && (a.x - g.x) * (b.x - g.x) < 0);
}
// Room-style levels: push a body's circle out of every wall, pillar and closed gate its height span meets.
// On the ground, anything lower than stepUp above the feet is stepped onto rather than walked into.
function collideSolids(b) {
  const r = b.radius, lo = b.y + (b.grounded ? CONFIG.height.stepUp : 0.05), hi = b.y + b.height;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of world.solids) if (s.y1 > lo && s.y0 < hi) pushOutOfBox(b, s, r);
    for (const g of world.gates) if (!g.open && g.box.y1 > lo && g.box.y0 < hi) pushOutOfBox(b, g.box, r);
  }
}
function pushOutOfBox(b, s, r) {
  const cx = clamp(b.x, s.x0, s.x1), cz = clamp(b.z, s.z0, s.z1), dx = b.x - cx, dz = b.z - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-10) { const d = Math.sqrt(d2); b.x = cx + dx / d * r; b.z = cz + dz / d * r; return; }
  // Centre inside the box: leave by the side it came from (start-of-step position), else the nearest side.
  const px = b.px ?? b.x, pz = b.pz ?? b.z;
  if (px < s.x0) b.x = s.x0 - r; else if (px > s.x1) b.x = s.x1 + r;
  else if (pz < s.z0) b.z = s.z0 - r; else if (pz > s.z1) b.z = s.z1 + r;
  else {
    const pen = [[b.x - s.x0, 'x', s.x0 - r], [s.x1 - b.x, 'x', s.x1 + r], [b.z - s.z0, 'z', s.z0 - r], [s.z1 - b.z, 'z', s.z1 + r]];
    const [, axis, v] = pen.reduce((m, p) => p[0] < m[0] ? p : m);
    b[axis] = v;
  }
}
// Enemies around `from`, filtered: the one place that decides who can be targeted.
// opts: range, cone/yaw (angle limit around a heading), surface (measure to the body's edge), deadFor.
function findEnemies(from, enemies, { range, cone = Infinity, yaw = from.yaw, surface = false, deadFor = 0 }) {
  const out = [];
  for (const e of enemies) {
    const recentlyDead = !e.alive() && e.stateTime < deadFor;
    if ((!e.alive() && !recentlyDead) || !e.awake() || gateBetween(from, e)) continue;
    const dx = e.x - from.x, dz = e.z - from.z, dist = Math.hypot(dx, dz), d = surface ? dist - e.radius : dist;
    if (d > range) continue;
    const dir = Math.atan2(dx, dz), ang = Math.abs(angDiff(dir, yaw));
    if (ang > cone) continue;
    out.push({ e, d, dir, ang });
  }
  return out;
}

// Keep a body inside the current world: walls, closed gates and side alcoves.
// Uses the body's position from the start of the step (px, pz) to know which side it came from.
function clampToWorld(b) {
  if (world.solids) { collideSolids(b); return; }
  const W = world, r = b.radius, oldX = b.px, oldZ = b.pz;
  let lo = W.minX + r, hi = W.maxX - r;
  for (const g of W.gates) {
    if (g.open) continue;
    const h = W.gateThickness / 2 + r;
    if (oldX <= g.x) hi = Math.min(hi, g.x - h); else lo = Math.max(lo, g.x + h);
  }
  b.x = clamp(b.x, lo, hi);
  const zIn = W.halfZ - r;
  if (Math.abs(b.z) > zIn) {
    const side = Math.sign(b.z), inside = Math.abs(oldZ) > zIn + 1e-6, ref = inside ? oldX : b.x;
    const a = W.alcoves.find(a => a.side === side && ref >= a.x0 + r - 1e-6 && ref <= a.x1 - r + 1e-6);
    if (a) {
      if (inside) b.x = clamp(b.x, a.x0 + r, a.x1 - r);
      b.z = side * Math.min(Math.abs(b.z), W.halfZ + a.depth - r);
    } else b.z = side * zIn;
  }
}
// Shared body physics: voluntary movement (vx, vz), knockback, gravity, floors at heights, world bounds.
// edgeSense (enemies): voluntary movement stops at the brink of an open edge or a drop deeper than stepDown;
// knockback can still push the body over. Keeps b.grounded, and sets b.fallHeight (from the highest point of
// the fall) on the step the body lands, and b.inPit once it falls below the level's kill depth.
function integrateBody(b, dt, knockFriction, edgeSense = false) {
  const H = CONFIG.height;
  let mx = b.vx * dt, mz = b.vz * dt;
  if (edgeSense && b.grounded && (mx || mz)) [mx, mz] = edgeStop(b, mx, mz);
  b.x += mx + b.kx * dt; b.z += mz + b.kz * dt;
  const f = Math.exp(-knockFriction * dt); b.kx *= f; b.kz *= f;
  clampToWorld(b);
  b.fallHeight = 0;
  const ground = world.groundAt(b.x, b.z, b.y);
  if (b.grounded && b.vy <= 0 && ground >= b.y - H.stepDown) { b.y = ground; b.vy = 0; return; }   // follows stairs and ramps
  if (b.grounded) { b.grounded = false; b.peak = b.y; }   // jumped, or walked off an edge
  b.vy -= CONFIG.gravity * dt; b.y += b.vy * dt;
  b.peak = Math.max(b.peak, b.y);
  if (b.y <= ground) {
    if (b.vy <= 0) { b.fallHeight = b.peak - ground; b.y = ground; b.vy = 0; b.grounded = true; }
    else b.y = ground;   // rising past a step within reach: lifted onto it
  }
  if (b.y < world.killY) { b.y = world.killY; b.vy = 0; b.inPit = true; }
}
// Voluntary movement (mx, mz) cut so the body never steps over a drop: slides along the brink if it can.
function edgeStop(b, mx, mz) {
  const H = CONFIG.height, probe = b.radius * H.edgeProbe, l = Math.hypot(mx, mz);
  const safe = (x, z) => world.groundAt(x, z, b.y) >= b.y - H.stepDown;
  if (safe(b.x + mx + mx / l * probe, b.z + mz + mz / l * probe)) return [mx, mz];
  const okX = mx !== 0 && safe(b.x + mx + Math.sign(mx) * probe, b.z);
  const okZ = mz !== 0 && safe(b.x, b.z + mz + Math.sign(mz) * probe);
  if (okX && okZ) return Math.abs(mx) >= Math.abs(mz) ? [mx, 0] : [0, mz];
  return [okX ? mx : 0, okZ ? mz : 0];
}
// Damage for landing after falling h metres: none up to `safe`, then per metre; Infinity from `lethal` on.
function fallDamage(h) {
  const F = CONFIG.fall;
  if (h >= F.lethal) return Infinity;
  return h > F.safe ? (h - F.safe) * F.perMetre : 0;
}
function approachVel(b, tx, tz, maxDelta) {
  const dx = tx - b.vx, dz = tz - b.vz, d = Math.hypot(dx, dz);
  if (d <= maxDelta || d === 0) { b.vx = tx; b.vz = tz; } else { b.vx += dx / d * maxDelta; b.vz += dz / d * maxDelta; }
}
