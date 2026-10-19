'use strict';
// Browsers require a real click/key before fullscreen. Try once, then respect Escape for this visit.
const fullscreen = {
  attempted: false,
  async enter() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    try { await document.documentElement.requestFullscreen(); } catch (err) { /* blocked/unsupported: keep playing */ }
  },
  auto(ev) {
    if (this.attempted || !ev.isTrusted || ev.repeat || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (ev.type === 'keydown' && (ev.code === 'Escape' || ev.code === 'F11' || /^(Shift|Control|Alt|Meta)/.test(ev.code))) return;
    if (ev.type === 'pointerdown' && ev.button !== 0) return;
    this.attempted = true;
    void this.enter();
  },
  async toggle() {
    this.attempted = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.enter();
    } catch (err) { /* a refused exit must not interrupt the menu */ }
  },
};
window.addEventListener('pointerdown', ev => fullscreen.auto(ev), { capture: true });
window.addEventListener('keydown', ev => fullscreen.auto(ev), { capture: true });
document.addEventListener('fullscreenchange', () => {
  if (Game.screen === 'options') Game.showMenu('options', true);
});
