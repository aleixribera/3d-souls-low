'use strict';
// ============================================================================
// 6b. Attack tokens
// ============================================================================
// Only a few enemies may attack at once: those holding a token. The limit is the level's `attackTokens`,
// else CONFIG.tokens.default. The others circle the player at a distance, spread over the player's sides
// and back (Enemy.circleVelocity), and swap in as the fight changes:
//   - a token is kept while its holder is fighting (chasing, winding up, striking, recovering), and given
//     back when its attack ends or it is hit out of the fight (flinch, stagger, parried, broken, gone home);
//   - free tokens go first to enemies that have waited `patience` s, then to the closest;
//   - a holder still closing in hands its token to a waiter who is `swapMargin` m closer to the player
//     and has waited at least `swapWait` s (so an enemy that just attacked cannot take it straight back).
// Runs once per step, before the enemies update.
const tokens = {
  front: null,   // smoothed player facing that the circling slots are laid out around

  reset() { this.front = null; },
  update(game, dt) {
    const T = CONFIG.tokens, p = game.player;
    const limit = (game.kind === 'level' && game.level.attackTokens) || T.default;
    this.front = this.front === null ? p.yaw : turnToward(this.front, p.yaw, T.frontRate * dt);
    const dist = e => Math.hypot(e.x - p.x, e.z - p.z);
    const live = game.enemies.filter(e => e.alive() && !e.training);
    for (const e of live) if (e.token && !e.in('fighting')) e.token = false;
    const holders = live.filter(e => e.token);
    const waiters = live.filter(e => !e.token && e.state === ES.CHASE && e.reachable);   // not those above or below the player
    for (const e of waiters) e.tokenWait += dt;
    // Free tokens: the patient first, then the closest.
    waiters.sort((a, b) => ((b.tokenWait >= T.patience) - (a.tokenWait >= T.patience)) || dist(a) - dist(b));
    while (holders.length < limit && waiters.length) {
      const e = waiters.shift();
      e.token = true; e.tokenWait = 0; e.slot = null; holders.push(e);
    }
    // Swap: a far holder that has not started its attack yields to a much closer waiter.
    for (const w of waiters.filter(w => w.tokenWait >= T.swapWait)) {
      const far = holders.filter(h => h.state === ES.CHASE).sort((a, b) => dist(b) - dist(a))[0];
      if (!far || dist(far) < dist(w) + T.swapMargin) continue;
      far.token = false; far.next = null; far.tokenWait = 0;
      w.token = true; w.tokenWait = 0; w.slot = null;
      holders.splice(holders.indexOf(far), 1, w); waiters.splice(waiters.indexOf(w), 1, far);
    }
    this.assignSlots(p, waiters);
  },
  // Spread the waiters evenly over the arc behind and beside the player, keeping their order around
  // the player so they never have to cross each other.
  assignSlots(p, waiters) {
    const cone = CONFIG.tokens.frontCone, n = waiters.length, TAU = Math.PI * 2;
    const around = e => { const a = angDiff(Math.atan2(e.x - p.x, e.z - p.z), this.front) - cone; return a < 0 ? a + TAU : a; };
    waiters.sort((a, b) => around(a) - around(b))
      .forEach((e, i) => { e.slot = this.front + cone + (TAU - 2 * cone) * (i + 0.5) / n; });
  },
};
