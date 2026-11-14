'use strict';
// The counter's moment (pass 85, CONFIG.dodgeMoment): a blow slipped inside the dash's i-frames shows itself with a
// pale burst where it passed; and as any counter opens (a perfect dodge, or since pass 95 a deflect that left the foe
// open), alone (no one else's clock to keep), a beat of slow motion. It only scales how much real time the frame loop
// feeds the fixed-step simulation (js/boot.js), so every step stays the same 1/60 s. Online the shared world never
// slows: the counter's other cues (js/counter-fx.js) show it there. Reduced motion skips the slow too.
const dodgeMoment = (() => {
  let left = 0;
  events.on('dodge', d => {
    if (d.player !== Game.player) return;
    const K = CONFIG.dodgeMoment, p = d.player;
    spawnBurst({ x: p.x, y: p.y + p.height * 0.6, z: p.z }, { color: 0xd8e8ff, count: reducedMotion() ? 6 : K.burst, speed: 4 });
  });
  events.on('counterOpen', d => {
    if (d.player !== Game.player) return;
    if (!(typeof multiplayer !== 'undefined' && multiplayer.active()) && !reducedMotion()) left = CONFIG.dodgeMoment.time;
  });
  events.on('counterClose', d => { if (d.player === Game.player) left = 0; });   // a blow landed: the counter is gone
  // Read by the frame loop (js/boot.js): the factor the simulation clock runs at now. Real time drains the moment.
  function scale(frameDt) {
    if (left <= 0) return 1;
    if (Game.mode !== 'play' || (typeof multiplayer !== 'undefined' && multiplayer.active())) { left = 0; return 1; }
    left -= frameDt;
    return CONFIG.dodgeMoment.slow;
  }
  return { scale, get active() { return left > 0; } };
})();
