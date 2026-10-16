'use strict';
// ============================================================================
// 6b. Crowds
// ============================================================================
// Every enemy may attack: each chooses its own attacks (Enemy.chooseAttack). The crowd keeps a fight both
// readable and surrounding (numbers in CONFIG.ai):
//   - while others are mid-attack (wind-up, strike or recovery), an enemy's cooldown takes 1 + `busyCooldown` x their
//     number times as long, and its chance rolls (not shots; close attacks strike at once anyway) are multiplied by
//     `busyMul` for each;
//   - no enemy starts an attack within `gap` s of another one starting;
//   - the enemies fighting the player (those that can reach them) get places spread evenly all round the player,
//     in the order they already stand so that nobody has to cross; Enemy.holdVelocity circles toward them.
// Runs once per step, before the enemies update.
const crowd = {
  enemies: [],            // the current fight
  sinceStart: Infinity,   // seconds since an enemy last started an attack

  reset() { this.enemies = []; this.sinceStart = Infinity; },
  update(game, dt) {
    this.enemies = game.enemies; this.sinceStart += dt;
    this.spread(game.player);
  },
  mayStart() { return this.sinceStart >= CONFIG.ai.gap - 1e-9; },
  started() { this.sinceStart = 0; },
  // How many enemies other than `self` are mid-attack.
  busy(self) {
    let n = 0;
    for (const e of this.enemies) if (e !== self && e.in('attacking')) n++;
    return n;
  },
  // What the crowd does to an enemy's attack chances (shots aside), and to how fast its cooldown runs.
  // An enemy may set its own `crowd: { busyMul, busyCooldown, groupCooldown }`: the first two replace the defaults;
  // groupCooldown makes its cooldown last that many times longer whenever any other enemy is fighting the player too
  // (an enemy that is relentless alone but takes turns in a group).
  chanceMul(self) { return ((self.def.crowd && self.def.crowd.busyMul) ?? CONFIG.ai.busyMul) ** this.busy(self); },
  cooldownRate(self) {
    const C = self.def.crowd || {}, group = C.groupCooldown && this.enemies.some(e => e !== self && e.alive() && e.in('fighting')) ? C.groupCooldown : 1;
    return 1 / ((1 + (C.busyCooldown ?? CONFIG.ai.busyCooldown) * this.busy(self)) * group);
  },
  // Evenly spaced places round the player, turned as a whole to sit as close as possible to where the enemies stand.
  spread(p) {
    const ring = [];
    for (const e of this.enemies) {
      e.slot = null;
      if (e.alive() && !e.training && !e.asleep && e.reachable && e.in('fighting')) ring.push([e, Math.atan2(e.x - p.x, e.z - p.z)]);
    }
    ring.sort((a, b) => a[1] - b[1]);
    const step = Math.PI * 2 / ring.length;
    let sx = 0, sz = 0;
    ring.forEach(([, a], i) => { sx += Math.sin(a - step * i); sz += Math.cos(a - step * i); });
    const base = Math.atan2(sx, sz);
    ring.forEach(([e], i) => { e.slot = base + step * i; });
  },
};
