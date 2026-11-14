'use strict';
// The perfect-dodge moment (pass 85, CONFIG.dodgeMoment): a blow slipped inside the dash's i-frames shows itself with a
// pale burst where it passed and, alone (no one else's clock to keep), a beat of slow motion while the counter opens.
// Online the shared world never slows: only the burst. Reduced motion skips the slow too.
const dodgeMoment = (() => {
  let left = 0;
  events.on('dodge', d => {
    if (d.player !== Game.player) return;
    const K = CONFIG.dodgeMoment, p = d.player;
    spawnBurst({ x: p.x, y: p.y + p.height * 0.6, z: p.z }, { color: 0xd8e8ff, count: reducedMotion() ? 6 : K.burst, speed: 4 });
    if (!(typeof multiplayer !== 'undefined' && multiplayer.active()) && !reducedMotion()) left = K.time;
  });
  // Read by the frame loop (js/boot.js): the factor the simulation clock runs at now. Real time drains the moment.
  function scale(frameDt) {
    if (left <= 0) return 1;
    if (Game.mode !== 'play' || (typeof multiplayer !== 'undefined' && multiplayer.active())) { left = 0; return 1; }
    left -= frameDt;
    return CONFIG.dodgeMoment.slow;
  }
  return { scale, get active() { return left > 0; } };
})();
