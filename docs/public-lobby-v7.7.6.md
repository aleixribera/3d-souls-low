# v7.7.6 — Lobby Party Play

The public lobby works with a controller throughout: D-pad or left stick moves focus, held directions repeat using the normal menu timings, and focused controls scroll into view. A/Cross selects. B/Circle cancels the current editor, returns to a running fight, or leaves an idle lobby. Menu/Options opens the public lobby during online play and closes it again. Leader changes and roster updates preserve a valid selection and keep hidden or disabled actions out of navigation.

On Adventure, Left/Right cycles choices. A/Cross opens an expanded list, Up/Down chooses, A/Cross confirms, and B/Circle restores the previous choice. Campaigns and individual levels remain available; the arena section lists only the twelve bosses.

The name field is the only name-editing control. Mouse and keyboard users type directly into it. With a controller, focus the name field and press A/Cross to open the on-screen keyboard; simply moving focus there does not open it. D-pad or left stick selects a key, A/Cross types or chooses an action, X/Square deletes, and B/Circle cancels. Space, letter case, Cancel and Done are also clickable once the keyboard is open. Saving a name uses the existing validation, local preference and server update.

Other changes included in this release:

- Numeric current-level tags, such as `Level 3/8`, during play and in the lobby.
- Boss arenas hold defeated players until the entire connected party falls, then restart everyone and the boss together. Ordinary story levels retain personal respawns.
- Automatic spectating of a surviving teammate's rendered camera. A hideable bottom bar shows the player's name and switching arrows. Keyboard: Left/Right and Tab. Controller: LB/RB or D-pad Left/Right and X/Square. See [spectating](lobby-spectating.md).
- Server-owned session continuity and automatic reconnects preserve campaign, enemy and gate progress. Empty lobbies retain their run until the server stops. See [recovery](lobby-recovery.md).

Release checks include the full browser suite; focused controller, spectator, arena-wipe, campaign and reconnect browser checks; multiplayer, campaign, leader, continuity, network timing/load, fullscreen, Auto graphics and deployment fixtures. The container workflow also exercises the actual image before publishing versioned and latest images.

Local validation on Windows: all focused browser and Node checks above passed. The full solo sweep passed 284/285; the existing 3D graphics benchmark reported a rendering error in the long-lived test context, then passed in a fresh browser (1/1). A software-rendered full sweep was stopped because it was impractically slow. No gameplay or controller check failed in the final runs.
