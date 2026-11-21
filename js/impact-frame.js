'use strict';
// ============================================================================
// The impact frame (pass 151, design/abilities/STYLE.md rule 8): drawing only
// ============================================================================
// A legendary's peak: for a few frames the whole picture inverts to two tones (black and white-hot), then snaps back.
// One a moment: never two within `gap` s of each other (abilities flash under 3 Hz), and only for a peak within `near`
// m of the player. Reduced motion: a 30% darken instead, held a little longer. A CSS filter on the game's canvas, so
// it costs the renderer nothing and allocates nothing. Tuning: VIS.impactFrame.
// The world dim (Ultimates I, pass 156): an Ultimate's anticipation darkens the picture by up to `dim` (`dim(k)`, k 0..1,
// in `dimSteps` steps made at load), under any impact frame and back after it.
const impactFrame = (() => {
  const C = VIS.impactFrame;
  let last = -Infinity, timer = 0, count = 0, dimStep = 0;
  const DIMS = Array.from({ length: C.dimSteps + 1 }, (_, i) => (i ? `brightness(${(1 - C.dim * i / C.dimSteps).toFixed(3)})` : ''));
  const off = () => { timer = 0; renderer.domElement.style.filter = DIMS[dimStep]; };
  // How dark the world is now, 0 (as it is) to 1 (`dim` darker).
  function dim(k) {
    const step = Math.round(Math.max(0, Math.min(1, k)) * C.dimSteps);
    if (step === dimStep) return;
    dimStep = step;
    if (!timer) renderer.domElement.style.filter = DIMS[step];
  }
  // `x`, `z`: where the peak is. Returns whether a frame was shown.
  function hit(x, z) {
    const p = Game.player, now = performance.now() / 1000;
    if (!p || now - last < C.gap || !(Math.hypot(p.x - x, p.z - z) <= C.near)) return false;
    last = now; count++;
    const calm = reducedMotion();
    renderer.domElement.style.filter = calm ? `brightness(${C.darken})` : C.filter;
    if (timer) clearTimeout(timer);
    timer = setTimeout(off, (calm ? C.calm : C.time) * 1000);
    return true;
  }
  function clear() { if (timer) clearTimeout(timer); dimStep = 0; off(); last = -Infinity; }
  return { hit, dim, clear, info: () => ({ count, on: !!timer, dim: dimStep / C.dimSteps, filter: renderer.domElement.style.filter }) };
})();
