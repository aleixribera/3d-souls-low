# BOSS ONLY (v7.8.0)

The public lobby offers Story 1, Story 2 and BOSS ONLY. The challenge visits every boss in the existing boss catalog in definition order: Ashmere's four bosses, then the eight Elden Ring bosses. Each boss retains its arena, full health and normal phases. Boss references and advancement use definition IDs.

The server waits for all connected players to report ready and send their first pose, then holds the boss still for `ArenaNet.config.bossLoadGrace` (3 seconds). The barrier applies to each boss fight. Once combat starts, joining players do not interrupt it.

Defeated players automatically spectate surviving teammates. Releasing mouse capture to enter spectator controls does not open pause; Escape and the controller menu button still open pause deliberately. A small pane below the online status lists player names with Alive, Fallen or Loading, plus the alive count. Dead spectators see the victory banner too.

The server waits `bossVictoryDelay` (5 seconds) after a boss's final death before advancing. Every new encounter creates fresh players with maximum health, stamina and flask capacity. Execution reservations and phase transitions retain their existing timing. No solo story save is written.

A full team wipe ends the challenge. Since v7.8.1, an explicit server `team-wipe` stop reason shows a four-second crimson TEAM WIPED screen with the defeated-boss count before revealing the lobby. Duration is `teamWipeScreenTime`; keyboard, pointer and controller lobby actions are held during it. New sessions and disconnects clear its timer, and reduced-motion preferences remove the entrance animations. The selection remains BOSS ONLY, and Start together begins at boss one. Defeating the last boss also returns the party to the lobby with a completion message. Restart boss run resets to boss one; manual Next is disabled during this challenge. Direct single-boss arena requests remain supported by the server for compatibility, with their existing shared wipe restart.

Checks: `node tests/boss-only.cjs`, `node tests/boss-only-browser.cjs`, `node tests/spectator-browser.cjs`, `node tests/lobby-controller-browser.cjs`, plus the multiplayer, campaign, recovery, fullscreen, Auto and full solo browser suites. Browser fixtures require Playwright and Edge.
