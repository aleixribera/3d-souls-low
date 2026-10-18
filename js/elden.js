'use strict';
// ============================================================================
// Elden Ring Bosses mode (v5.3)
// ============================================================================
// Main menu -> Elden Ring Bosses -> a card per boss in ELDEN_BOSSES (js/data/elden-bosses.js) -> a duel in the Enemies
// arena (Game.startFight, ARENA). Victory: ENEMY FELLED, then Retry or Boss select (v5.4). Death: YOU DIED, then a choice of
// Retry or Boss select. This file holds only the flow; the bosses are data, and the menu reads the list.
const elden = (() => {
  const C = CONFIG.elden;
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const entry = () => ELDEN_BOSSES.find(b => b.id === Game.eldenBoss) || null;
  let won = 0;   // s since the boss fell
  return {
    // Menu screens, merged into Game.screens(): the boss select and the death choice.
    screens(game) {
      const b = entry();
      return {
        elden: { title: 'COMBAT ARENA 3D', sub: 'ELDEN RING BOSSES', back: 'arena',
          items: [...ELDEN_BOSSES.map(e => ({ name: e.difficulty ? `${e.name}   ${stars(e.difficulty)}` : e.name,
            desc: `${e.title}. ${e.description}`, go: () => Game.loadingFirst(e.name, e.description, () => this.start(e.id)) })),
            { name: 'Back', desc: 'Return to the 1v1 Arena.', cue: 'menuBack', go: () => game.showMenu('arena') }] },
        eldenWon: { title: 'ENEMY FELLED', sub: b ? b.name.toUpperCase() : '', overlay: true, items: [
          { name: 'Retry', desc: 'Fight again from the start.', go: () => Game.loadingFirst(b.name, b.description, () => this.start(b.id)) },
          { name: 'Boss select', desc: 'Choose another boss.', cue: 'menuBack', go: () => this.leave() }] },
        eldenDeath: { title: 'YOU DIED', sub: b ? b.name.toUpperCase() : '', overlay: true, items: [
          { name: 'Retry', desc: 'Fight again from the start.', go: () => Game.loadingFirst(b.name, b.description, () => this.start(b.id)) },
          { name: 'Boss select', desc: 'Choose another boss.', cue: 'menuBack', go: () => this.leave() }] },
      };
    },
    mainItem(game) { return { name: 'Elden Ring Bosses', desc: 'Face bosses from Elden Ring, one on one in the arena.', go: () => game.showMenu('elden') }; },
    start(id) {
      const b = ELDEN_BOSSES.find(e => e.id === id);
      Game.startFight(b.enemy);
      Game.eldenBoss = b.id; won = 0;
      const flask = Game.player.inventory.flask;   // more flasks than the story's 4 (CONFIG.elden.flasks)
      if (flask) flask.count = flask.max = C.flasks;
      $('loadName').textContent = b.name; $('loadTip').textContent = b.description;
      hud.buildTexts(Game);
    },
    // Back to the boss select (the arena is rebuilt behind the menu, as Back to Menu does).
    leave() { Game.eldenBoss = null; Game.reset(); hud.buildTexts(Game); Game.showMenu('elden'); },
    // Each step of an Elden Ring fight (Game.update): after the victory banner, back to the boss select.
    update(game, dt) {
      if (!game.duelWon() || !game.player.alive()) return;
      won += dt;
      if (won >= C.victoryTime) game.showMenu('eldenWon');
    },
    // During the death sequence (Game.update): at `deathMenu` s, the Retry / Boss select choice instead of the respawn.
    onDeath(game) {
      if (game.deathTimer < C.deathMenu) return false;
      game.showMenu('eldenDeath');
      return true;
    },
  };
})();
