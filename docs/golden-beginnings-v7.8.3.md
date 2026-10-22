# Golden Beginnings (v7.8.3)

New public-lobby story runs and BOSS ONLY runs begin with a five-second gold ceremony after each client's normal loading screen. Ashmere shows RISE FROM ASH, the Lands Between shows FOLLOW THE GOLD, and the gauntlet shows DEFY THEM ALL. A gold crest, expanding halo, drifting embers and a slow title reveal lead into play. Layout adapts to narrow and short screens; reduced motion removes all animations and embers.

Copy is data in `js/data/lobby-intros.js`, validated at startup and recorded first in LORE.md. Duration is `ArenaNet.config.runIntroScreenTime`. The client uses the existing loading hold to keep movement and combat frozen, swallows keyboard/controller actions, and sends ready only after the ceremony ends. Menus and timers are restored if the player leaves or the session changes.

The server's initial `start` message marks an opening explicitly. The initial story simulation waits for every connected player to finish loading, see the ceremony, and send a ready pose. Bosses retain their three-second grace after the party is ready. Automatic chapter/boss advancement, direct level/arena choices, late joining and reconnecting do not replay the ceremony. Restarting a boss run begins at boss one and replays it. Hidden campaigns without intro data keep their existing loading flow. Solo stories and saves are unchanged.

Checks: `tests/run-intro-browser.cjs` covers all three openings, safe loading, input protection, narrow layout, late join, automatic progression, cancellation and reduced motion. `tests/multiplayer-campaign.cjs` verifies the initial party barrier and normal chapter progression. Existing gauntlet, recovery, controller, fullscreen and Auto fixtures remain regression checks.
