# v7.7.3 — Active lobby leaders

After **five minutes without input**, the server removes the leader role and gives it to the first other active player in join order. The inactive player stays connected; shared enemies, gates, checkpoints and the current level are preserved.

Keyboard presses/releases, held controls, mouse movement/clicks/wheel and controller buttons/sticks count as activity. Lobby actions count too. Automatic pings, player pose updates, idle animations and loading messages do not count. Background tabs clear held activity. Controller sticks use the existing dead zone.

If everyone is inactive, there is temporarily no leader. The next player to provide input takes the role automatically. An active leader keeps the role when another player returns. Manually transferring to an inactive player is refused until that player provides input.

The server checks the timeout in both the lobby and a running game, and enforces the new leader's authority immediately. The lobby explains role changes and updates controls on every client. Timing lives in `js/net-protocol.js` as `leaderIdle` and `activityInterval`.

## Update on Ubuntu

After the one-time [published-image setup](container-updates.md):

```bash
cd /opt/homelab/stacks/combat-arena
docker compose pull && docker compose up -d
```

Everyone should reload and see **v7.7.3**. The existing automatic-update timer can also install it when the lobby is empty. Host port 3080 and the public URL are unchanged.

## Checks

`node tests/lobby-leader.cjs` uses real WebSockets and an injected activity clock, so it tests the exact five-minute boundary without waiting five minutes. It covers automatic-message exclusion, authority after demotion, all-idle and solo recovery, manual transfers, disconnects, and preservation of the current boss/session. `tests/multiplayer-browser.cjs` checks keyboard/controller input, timeout handoff and lobby controls in both browsers before its existing three-player combat checks.

The full solo browser suite remains at 284/285 with the previously documented Auto renderer-restoration test-order failure. Fullscreen and all 13 first-launch Auto fixtures pass.
