# Lobby continuity and recovery

The dedicated server owns the run independently of the lobby leader. A backgrounded tab, player death or disconnected socket must not reset enemy health, opened gates, checkpoints or campaign progress for the remaining party. Since v7.8.2, the last deliberate Leave lobby ends the run immediately. If the last player disconnects unexpectedly or closes the browser, simulation pauses and the run is retained for `ArenaNet.config.emptyLobbyTimeout` (60 seconds). A quick reconnect receives the same run; after the empty-room timeout, returning players see lobby controls and choose a fresh adventure. Expiry is checked both on the server interval and before welcoming a returning player. Players who remain connected keep their run without a time limit. No solo save is changed.

Unexpected socket closure and excessive playback backlog automatically reconnect the affected browser to the current session. Retries back off from one second to ten seconds. Rejoining loads the current chapter at the shared checkpoint and receives a full state baseline. A connected browser accidentally returned to the main menu also reloads the shared session and requests a fresh baseline. Explicit Leave lobby, server removal and incompatible builds stop retries. Deliberately returning everyone to the lobby still works.

Shared world completion timers and abandoned execution reservations resolve even when no living player pose is available. Enemy AI waits for a living player.

Checks:

- node tests/lobby-continuity.cjs: stale leader; leader, other-player and last-player disconnection; retained campaign, enemy health and gates; rejoin baseline; abandoned execution and chapter advancement.
- node tests/reconnect-browser.cjs (Playwright/Edge): frozen leader page, transport recovery, main-menu recovery, repeated connection failures, explicit leave cancellation and server removal.
- Existing tests/multiplayer.cjs, tests/lobby-leader.cjs, tests/multiplayer-campaign.cjs and tests/multiplayer-browser.cjs remain regression checks.
