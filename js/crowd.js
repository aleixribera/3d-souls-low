'use strict';
// ============================================================================
// 6b. Crowds
// ============================================================================
// Every enemy may attack: each chooses its own attacks (Enemy.chooseAttack). The crowd keeps a fight both
// readable and surrounding (numbers in CONFIG.ai):
//   - an enemy's chance rolls are multiplied by `busyMul` for every other enemy mid-attack (wind-up, strike or
//     recovery; its close attacks strike at once), and no enemy starts an attack within `gap` s of another one starting;
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
  // What the crowd does to an enemy's attack chances.
  chanceMul(self) {
    let busy = 0;
    for (const e of this.enemies) if (e !== self && e.in('attacking')) busy++;
    return CONFIG.ai.busyMul ** busy;
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
