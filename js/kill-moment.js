'use strict';
// The kill moment (v7.69.0, CONFIG.killMoment): when a Boss Rush fight's last boss falls, its death and the effects
// play slowed for a moment, embers burst from it, and "Boss n down" stands over the arena (js/hud.js's banner).
// Drawn only: Game.drawSlow scales the drawing clock of the fallen and of the particles; the simulation, the player
// and the other players never slow. Reduced motion keeps the embers (fewer) and the line, and skips the slow.
const killMoment = (() => {
  let left = 0;
  events.on('enemyDeath', d => {
    const e = d.enemy, rush = typeof multiplayer !== 'undefined' && multiplayer.rush;
    if (!rush || !e.isBoss() || Game.enemies.some(o => o.isBoss() && o.alive())) return;
    const K = CONFIG.killMoment, calm = reducedMotion();
    spawnBurst({ x: e.x, y: e.y + (e.height || 2) * 0.6, z: e.z }, { color: 0xff8a30, count: Math.round(calm ? K.embers / 3 : K.embers), speed: K.emberSpeed });
    left = calm ? 0 : K.time;
  });
  Game.renderHooks.push(function killMoment(game) {
    // Over, or the run ended mid-moment (the next game, a Story level too, starts at full speed).
    if (left <= 0 || !multiplayer.rush) { left = 0; game.drawSlow = 1; return; }
    const dt = game.renderDt || 0;
    left -= dt; game.drawSlow = CONFIG.killMoment.slow;
    for (const e of game.enemies) if (!e.alive()) e.drawLag = (e.drawLag || 0) + dt * (1 - game.drawSlow);
  });
  return { get active() { return left > 0; } };
})();
