'use strict';
// Online play is Boss Rush only. Integration tests that need a known boss pin the run's first bosses on the server
// (`app.sim.newRun`, as tests/calling-browser.cjs does) and start Boss Rush from the lobby like a player.
exports.pinRush = (app, bosses) => {
  const draw = app.sim.drawRun || (app.sim.drawRun = app.sim.newRun);
  app.sim.newRun = (opening = []) => draw(opening.length ? opening : bosses);
};
exports.selectRush = page => page.locator('#lobbyAdventure').selectOption('calling/boss-rush');
