# Public boss arena spectating

Defeated players automatically spectate a surviving teammate while personal respawns are disabled. The view uses the teammate's rendered camera position, orientation and field of view, including lock-on, camera motion and shake. Camera samples travel with the existing player poses and are interpolated with remote bodies; normal network delay still applies. Cameras are shared only in sessions that wait for a team wipe.

The bottom bar names the selected player. Click its arrows, press Left/Right, or use LB/RB (L1/R1) or D-pad Left/Right to cycle through living teammates. Click Hide/Show spectator bar, press Tab, or press X/Square to toggle the bar without interrupting the view. Escape or Menu/Options opens the lobby.

Dead, disconnected and stale teammates cannot be selected. When the current target becomes unavailable, spectating selects another survivor. If nobody is available, the waiting death screen returns. A fresh attempt, leaving the lobby or returning everyone to the lobby clears spectator state and restores the normal camera. Story-level deaths retain personal respawns.

The server validates and whitelists optional camera fields independently of combat poses. Camera data never changes player movement, damage, enemy targeting or team-wipe decisions.

Checks:

- `node tests/spectator-browser.cjs`: three players; relayed camera matching; mouse, keyboard and controller switching; toggle; lobby access; narrow layout; target death/disconnect; team reset; normal level deaths.
- `node tests/arena-wipe.cjs` and `node tests/arena-wipe-browser.cjs`: shared attempt and personal respawn rules.
- `node tests/net-timing.cjs`: camera validation and delta round trips, alongside attack playback checks.
- `node tests/multiplayer.cjs`, `node tests/multiplayer-browser.cjs`, `node tests/solo-browser.cjs`, `node tests/fullscreen.cjs`, `node tests/autoquality.cjs`: regression coverage.
