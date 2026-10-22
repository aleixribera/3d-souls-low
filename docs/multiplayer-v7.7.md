# v7.7 — Public lobby

**Current patch:** see [v7.7.1 fixes and measurements](multiplayer-v7.7.1.md) and [update commands](update-v7.7.1.md).

One public co-op lobby per home-server process, reached from **Join public lobby**. Content remains in the existing level and enemy definitions. Solo play and campaign saves remain independent.

## Ownership

- The Node server owns enemy movement, target selection, random attack decisions, health, posture/guard, phases, executions and level gates/traps. `server/headless.cjs` loads the existing classic scripts in their declared order into a private VM; `server/simulation.js` adapts the shared engine to multiple player proxies. No renderer or browser runs on the server.
- Each browser owns its own player movement, input, health, stamina and defense. `resolveCombat` uses the enemy being displayed locally. Hit reports name player attacks; the server calculates their damage from existing data. A successful local parry immediately suppresses the corresponding strike and can be acknowledged from recent server history without cancelling a different, newer move.
- `js/multiplayer.js` buffers enemy snapshots and interpolates remote player rigs. Attack transitions are sent even between periodic snapshots. In v7.7.1 each enemy has an independent clock; idle/recovery delay can be recovered while complete attack cues remain protected. Local player snapshots are never overwritten by the server.
- Executions reserve a single owner. Other clients cannot consume or end the reservation. Damage/phase resolution occurs on the owner's completion, with a disconnect timeout. The executing client's victim stays held until its complete local animation has finished.

## Files

`js/world.js` moves the existing `makeWorld` collision adapter out of the renderer, unchanged. `js/net-protocol.js` is the shared dependency-free wire contract/tuning; the browser exposes its tuning as `CONFIG.multiplayer`. The server has one runtime dependency, `ws`, isolated in `server/package.json` and its lockfile. The browser keeps its existing no-build/no-npm runtime.

The server exposes `/api/lobby`, `/healthz`, static game assets and `/lobby` (WebSocket). It checks origins and build compatibility, limits incoming payloads/messages, rejects unknown actions and stale session IDs, deduplicates contacts, bounds history/claim buffers, and disconnects slow/dead peers. It does not serve server files, repository metadata or environment files.

First arrival leads. Leadership can be transferred or inherited on disconnect. Leader-only controls are checked on the server, not merely hidden in the UI. Late joins receive current shared state and the latest checkpoint. Individual deaths and rests do not reset group enemies. No friendly fire or player collision. There are no persistent co-op saves, enemy HP scaling, or shared solo tutorial progression in this release.

## Release checks

Run `node tests/multiplayer.cjs`, `node tests/fullscreen.cjs`, `node tests/autoquality.cjs`, and `tests/multiplayer-browser.cjs` with Playwright on the module path. The browser runner covers a 150 ms delayed client and then runs the full existing suite. Deployment instructions, capacity/latency limits and the separate Ubuntu-host setup are in [homelab-multiplayer.md](homelab-multiplayer.md).

Validation on 2026-10-22: all 19 level and 33 opponent headless simulations passed; HTTP/WebSocket integration and 16 simultaneous connections passed. Three-browser co-op passed, including 150 ms delayed messages, immediate parry/roll outcomes, shared damage, late join, individual respawn, leadership changes and an execution that defers Aldric's next phase until the local animation ends. Fullscreen and all 13 Auto fixtures passed.

The full browser suite reports 284/285. The remaining `Auto quality: 3D benchmark restores the renderer` check also fails in a separate copy with the multiplayer edits removed, and passes when run alone in a fresh browser. This is an existing graphics/test-order issue, not a newly introduced co-op failure. Docker is unavailable on the development PC, so the image build must be verified on Ubuntu. The later patch notes include a read-only measurement of the actual public Funnel route.
