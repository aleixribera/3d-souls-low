# Persistent public lobby — v7.14.0

Online adventures keep running when players tab away or all disconnect. The server no longer requires a ready human to tick, and deliberate leaves no longer clear the run or remove companions. Bots continue their ordinary combat and progression. With nobody alive/present, enemy attacks and phase clocks finish, enemies can return home, and trap, execution and world timers continue.

Away tabs give up leadership immediately through focus/visibility presence. A frozen tab that cannot send presence becomes ineligible once its pose is stale. The next active joiner/input can lead the existing adventure. Pings and animation packets still do not renew the five-minute input lease.

Initial loading is limited to foreground participants, with a 30-second wait for stalled active loaders and an overall startup deadline that reconnects cannot renew. Normal boss grace and opening ceremonies remain. Once combat has started, a late joiner never pauses it. Wins, full team defeat and explicit leader restart/lobby controls retain their normal results.

## Returning players

The server issues an opaque private reconnect token, persisted by the browser for that origin. Returning from that browser keeps the player id, remembered name and current-epoch position, facing, health, stamina and flask count. Exhaustion/stamina delay and Destined Death also survive. The final leave/away packet saves the latest resources.

A reconnect applies these values once while loading. Normal shared frames do not reconcile personal health or stamina. Old swings, dodge invulnerability, flask animations and executions are not replayed. A saved boss defeat remains a defeat until the next shared attempt. An advanced chapter/boss uses its new spawn and normal refills instead of old-map coordinates.

Matching a display name is not authentication. Tokens are sent only to their owner, never broadcast. A token replacing its old connection keeps one body, and the old socket closing cannot remove the replacement. The server remembers up to 1,024 identities, evicting the oldest disconnected identity when full. Run/resource memory lasts for that server process; names also persist locally. Server restarts still begin a fresh lobby.

## Volume

The default is 5 instead of 8. A saved value of 8 is lowered to 5; other validated volume preferences are retained.

## Verification

The continuity regression covers live inactive/empty clocks, away leader/new active player handoff, idle attack completion, same-name isolation, saved resources, connection takeover, epoch isolation, defeated reconnects, bounded loaders and actual bot damage after all humans leave. The browser regression freezes a sole leader's outgoing stream, joins a new leader, then checks resource/name recovery through transport loss, reload, menu recovery and deliberate leave.

Server checks passed for network timing/load, multiplayer, all campaign chapters, leadership, continuity, wipes, boss progression, damage credit, bots, settings, fullscreen and Auto graphics. Browser checks passed for reconnects/reloads, controller navigation, lobby layout, openings, boss runs, bots and multiplayer with delayed delivery. The full solo combat suite passed 282/282 checks. Older adventure-count assertions now follow the configured boss-run catalog.

VERSION / LOAD_STAMP: v7.14.0 / 7.14.0.
