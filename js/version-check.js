'use strict';
// ============================================================================
// A newer version is out (v7.61.0)
// ============================================================================
// The home server updates itself while its lobby is empty, but a tab left open keeps the build it loaded. This asks
// /api/lobby (its `version` and `build`) every CONFIG.versionCheck.interval s, and the title's lobby look (js/multiplayer.js
// peek) passes on each answer it gets. Once the server runs something else, the title and the pause menu offer a
// reload (js/game-menus.js). It never reloads by itself. A page with no server behind it (a file, a static host) asks
// once at most and never shows anything.
const versionCheck = (() => {
  let newer = null, timer = null, busy = false, absent = !/^https?:$/.test(location.protocol);
  const pageBuild = () => document.querySelector('meta[name="arena-build"]')?.content || null;
  // One answer from /api/lobby. A build is compared only when both sides have one.
  function note(info) {
    if (!info || typeof info.version !== 'string' || newer) return;
    const build = typeof info.build === 'string' ? info.build : null, own = pageBuild();
    if (info.version === VERSION && !(build && own && build !== own)) return;
    newer = { version: info.version.slice(0, 24), sameVersion: info.version === VERSION };
    clearTimeout(timer); timer = null;   // nothing more to learn
    // Shown at once on the title or in pause while they are on screen (not under the lobby's panel); the new button
    // goes last, so the selection stays where it was. Elsewhere it shows the next time either is opened.
    const shown = !document.getElementById('menu').classList.contains('hidden');
    if (shown && (Game.mode === 'menu' && Game.screen === 'main' || Game.mode === 'pause' && Game.screen === 'pause')) Game.showMenu(Game.screen, true);
  }
  async function ask() {
    clearTimeout(timer); timer = null;
    if (absent || newer) return;
    if (!busy && !document.hidden) {
      busy = true;
      try {
        const response = await fetch('/api/lobby', { cache: 'no-store', signal: AbortSignal.timeout(CONFIG.versionCheck.timeout * 1000) });
        // No lobby on this host (a static host answers 404, or a page); a failing server is asked again later.
        const json = response.headers.get('content-type')?.includes('application/json');
        if (response.status === 404 || response.ok && !json) absent = true;
        else if (response.ok) note(await response.json());
      } catch (e) { /* unreachable for now: ask again later */ }
      finally { busy = false; }
    }
    if (!absent && !newer) timer = setTimeout(ask, CONFIG.versionCheck.interval * 1000);
  }
  // The pause menu's and the title's button. A story saves first; an online run is left (the lobby keeps going).
  function reload() {
    if (typeof Game !== 'undefined' && Game.story) story.save();
    location.reload();
  }
  // Its line for a menu: the button's name, and what pressing it does here.
  function item(where) {
    if (!newer) return null;
    const what = newer.sameVersion ? `A newer build of ${VERSION.replace(/^v/, '')} is out.` : `Version ${newer.version.replace(/^v/, '')} is out; this page runs ${VERSION.replace(/^v/, '')}.`;
    const then = where === 'online' ? ' Reloading leaves this run; join the lobby again from the title.'
      : where === 'story' ? ' Saves first. Continue returns you to your last bonfire.' : where === 'fight' ? ' Reloading ends this fight.' : '';
    return { name: 'New version — Reload', desc: what + then, size: 'update', go: reload };
  }
  if (!absent) timer = setTimeout(ask, CONFIG.versionCheck.interval * 1000);
  return { note, item, reload, ask, get newer() { return newer; } };
})();
