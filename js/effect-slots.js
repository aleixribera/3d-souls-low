'use strict';
// ============================================================================
// Effect slots and the effect clock: shared plumbing for drawn boss effects (drawing only)
// ============================================================================
// The boss effect drawers (js/flame.js, js/holy.js, js/blackblade.js, js/spectral.js) and js/ultra-fx.js /
// js/ultra-boss.js / js/ultra-post.js draw from one frame clock instead of each keeping its own wall clock:
//   effectSlots.real()  this frame's delta: the render delta (Game.renderDt) capped at CONFIG.VISUALS.effectClock.maxDt;
//                       one fixed step a frame while a test steps the game by hand (Game.manualClock). The render loop
//                       does not draw while paused, so a pause never shows up as one long frame.
//   effectSlots.dt()    the same, slowed to `effectClock.hitstop` of itself through a blow's hit-pause (Game.hitstop).
//   effectSlots.time()  seconds of effect time so far (dt summed once a frame), for flicker and drifting hues.
// slots(release) makes a per-actor slot map: acquire(actor, make) returns that actor's slot, made on first need; sweep(actors)
// releases (release(slot, actor)) the slots of actors that are no longer in the given list, with one Set pass, not a
// search per slot. A slot is what one module draws for one body (a flame jet, a rune, a sphere).
const effectSlots = (() => {
  const C = VIS.effectClock;
  let time = 0;
  const real = () => Game.manualClock ? CONFIG.step : Math.min(C.maxDt, Math.max(0, Game.renderDt ?? CONFIG.step));
  const dt = () => Game.hitstop > 0 ? real() * C.hitstop : real();
  // First of the render hooks, so every drawer reads the same effect time this frame.
  Game.renderHooks.unshift(() => { time += dt(); });
  const live = new Set();   // scratch for sweep (one sweep runs at a time)
  function slots(release = () => {}) {
    const map = new Map();
    return {
      get: actor => map.get(actor),
      acquire(actor, make) { let s = map.get(actor); if (!s) { s = make(actor); map.set(actor, s); } return s; },
      release(actor) { const s = map.get(actor); if (s === undefined) return; map.delete(actor); release(s, actor); },
      sweep(actors) {
        if (!map.size) return;
        live.clear();
        for (const a of actors) live.add(a);
        for (const [actor, s] of map) if (!live.has(actor)) { map.delete(actor); release(s, actor); }
        live.clear();
      },
      clear() { for (const [actor, s] of map) { map.delete(actor); release(s, actor); } },
      get size() { return map.size; },
      values: () => map.values(),
    };
  }
  return { slots, real, dt, time: () => time };
})();
