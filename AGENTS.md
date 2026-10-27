# Project Guide

Combat Arena 3D: a Souls-like action game in the browser. Current version: **v7.19.1** (`VERSION` in `js/config.js`, `LOAD_STAMP` in `combat-arena-3d.html` without the leading v; both `package.json` files carry it too).

The game is complete. It has two Story roads:

- **Ashmere:** Levels 1–5 and an ending. Level 1 teaches the controls with lesson cards.
- **The Lands Between:** eight lands, one per Elden Ring boss, with its own ending and Finn as a solo companion.

There is also a Levels menu, a 1v1 Arena (Enemies, Bosses, Elden Ring Bosses, Boss vs Boss), and an optional multiplayer server with a public lobby and friendly bots.

This file is the guide. History lives elsewhere (`docs/README.md` indexes all the docs):

- `docs/CHANGELOG.md`: one line per release.
- `docs/feature-history.md`: the full per-feature notes, oldest first. Read the section of a system before changing it.
- `docs/*-v<version>.md`: the detailed design notes of a release.

**`LORE.md` is the source of truth for the story.** Every in-game story text must agree with it: dialogues, inscriptions, chapter lines, boss names, level descriptions, ending cards and credits. Change LORE.md first, then the game.

## Tech stack

- Vanilla JavaScript (ES2020+) and Three.js r160, as classic `<script>` files sharing one global scope.
- No build step, bundler or runtime npm dependency. Open `combat-arena-3d.html` in a browser.
- Scripts load strictly in the order of `GAME_FILES` in `combat-arena-3d.html`. Each file has a per-release `?v=LOAD_STAMP` cache key.
- The optional dedicated server (`server/`) is Node ≥ 22.8 with one locked dependency (`ws`). `server/headless.cjs` runs the engine half of `GAME_FILES` in a VM.
- The root `package.json` holds test tooling only (Playwright).

## Load order (layers of `GAME_FILES`)

1. **Base:** `helpers.js`, `config.js` (all tuning), `net-protocol.js`, `terrain.js`.
2. **Data** (`js/data/`, `js/levels/`): player, bots, enemies, models, textures, poses, audio, the Elden Ring bosses (`data/bosses/*.js` before `data/elden-bosses.js`), levels, story, lore. This layer is plain objects only.
3. **Registries and checks:** `states.js`, `registries.js`, `validate.js` (fail-fast validation of all data).
4. **Engine:**
   - `input.js`, `gamepad.js`, `events.js`
   - `world.js` (collision), `scene.js`
   - rigs and kits (`rig.js`, `bodykit.js`, `kit-*.js`), `animator.js`, `attack-anim.js`
   - `character.js`, `player.js`, `enemy.js`, `crowd.js`, `combat.js`, `execution.js`
   - bots (`bot-navigation.js`, `bot.js`), `companions.js`, `projectiles.js`
5. **Presentation and flow:**
   - `fx.js`, `visuals.js`, `textures.js`, `hud.js`, `audio.js`
   - `Game`, split by concern: `game.js` (setup, bonfires, death, update, render), `game-menus.js` (menus and play flow), `game-view.js` (lock-on and camera), `game-level.js` (level rules). Each later file is `Object.assign(Game, {...})`.
   - `finale.js`, `lore.js`, `story.js`, `lessons.js` (the lesson cards; reads only)
6. **Drawing-only effects:**
   - `impact.js`, `camera-feel.js`, `effect-slots.js`
   - `spectral.js`, `flame.js`, `blackblade.js`, `holy.js`, `scarlet.js`
   - `realms.js`, `ultra-*.js`, `bonfire-guidance.js`, `effect-lighting.js`
7. **Modes and boot:** `elden.js`, `boss-battle.js`, `quality-benchmark.js`, `autoquality.js`, `multiplayer.js`, `boot.js` (the main loop).

A new file goes in the layer it belongs to. If the server needs it, add it to the engine set in `server/headless.cjs`.

## Architectural rules

1. **Content is data.** Enemies, attacks, levels, items, lore and bosses are plain objects in `js/data/` or `js/levels/`. Engine code never names a specific enemy, level or attack. Opt-in fields on the data do that.
2. **Reference by string `id`**, never by array index. This applies to save files, network frames and placements (`Game.placementKey`) too.
3. **Fail fast.** `js/validate.js` checks every schema and reference at load and throws a readable error. A new data field gets a validation rule in the same change.
4. **Tuning lives in `CONFIG`** (or in the definition it belongs to). Procedural code holds no stray balance numbers.
5. **Opt-in mechanics.** A new mechanic is a field an entity or level may set. Without it, existing content behaves exactly as before.
6. **Events decouple.** Combat and physics emit through `js/events.js` (`strike`, `dodge`, `parry`, `attackMarker`, …). Visuals, camera, HUD and audio only listen.
7. **Fixed step.** Simulation runs at 1/60 s (`CONFIG.step`). The input buffer ages on that clock (`input.tick`). Rendering interpolates.
8. **Rendering never changes state.** `visuals.js`, render hooks and post-processing only draw. `Game.render` isolates each hook, so a failing hook logs once and the frame continues. Lock-on and other gameplay reads use the simulated camera (`Game.cam`), never the drawn one.

## Where things live

| To change… | Look in |
|---|---|
| Player moves, stats, timings | `js/data/player.js`, `CONFIG.player` |
| An enemy or Ashmere boss | `js/data/enemies.js`, models in `data/models-*.js` |
| An Elden Ring boss | `js/data/bosses/<boss>.js` (poses, model, def), registered in `data/elden-bosses.js`, effects in `data/boss-fx.js` |
| Attack phases and key poses | `js/attack-anim.js`, `js/data/attack-poses.js` |
| Executions | `js/execution.js`, `CONFIG.execution` |
| Boss phases, reactions, follow-ups | `js/enemy.js` (`enterPhase`, `outlast`, `REACTIONS`, `FOLLOW_IF`, `attackById`) |
| A level | `js/levels/*.js`, listed in `data/levels.js` |
| Story chapters and saves | `js/data/story.js`, `js/story.js`, `CONFIG.story` |
| Lore, NPCs, inscriptions | `LORE.md`, then `js/data/lore.js` / `lore-lands.js` |
| Menus, the title's online card | `js/game-menus.js` (`Game.screens()`, `titleLobby`), `multiplayer.peek()` |
| Lessons (the controls taught in levels) | `js/data/lessons.js` (`LESSONS`, triggers), a level's `lessons`, `js/lessons.js`, `CONFIG.lessons` |
| Bots | `js/bot.js`, `js/bot-navigation.js`, `js/data/bots.js`, `CONFIG.bot` |
| Multiplayer | `server/simulation.js`, `server/index.cjs`, `js/multiplayer.js`, `js/net-protocol.js` |
| Graphics presets | `CONFIG.VISUALS.quality` (low / high / ultra), `js/autoquality.js` |
| Drawn effects' clock and per-owner slots | `js/effect-slots.js` (`real()`, `dt()` slowed in hit-pause, `slots(release)`), `CONFIG.VISUALS.effectClock` |
| Reduced motion | `reducedMotion()` (`js/visuals.js`): Camera motion Off or the OS preference; caps in `CONFIG.VISUALS.reducedMotion` |

## Adding content

- **An enemy:**
  1. Add a def to `ENEMY_DEFS` with `model: '<id>'`.
  2. Add the model to a `data/models-*.js` file.
  3. Give each attack `pose` key poses.
  4. Keep every hit's `active` below the roll's i-frames (`CONFIG.player.rollIFrames`, 0.3 s) with margin.
- **An Elden Ring boss:**
  1. Write `js/data/bosses/<boss>.js` with its poses, `MODEL_DEFS` entry and def.
  2. Add the file to `GAME_FILES` before `data/elden-bosses.js`.
  3. Add the def to `ELDEN_BOSS_DEFS` and one entry to `ELDEN_BOSSES`.
  4. Add its `BOSS_FX` entry.
  5. Add a `run('<Boss>')` suite. The menu needs no change.
- **A level:**
  1. Create the file in `js/levels/` and add it to `GAME_FILES`.
  2. List it in `data/levels.js`.
  3. Give placements a `y` wherever floors overlap.
  4. A boss needs a bonfire before it and a `sealed` fog gate.
- **A Story chapter:** add `{ level, title, line }` to the right road in `js/data/story.js`. A level belongs to one road only.
- **Lore:** write it in `LORE.md`, then add it under its level in the lore data. NPCs stand by a bonfire, outside every zone trigger.
- **A timing change:** log the old and new values in `docs/combat-timings-v4.1.md`.

## Invariants (tests check most of these)

- Deaths from every cause (blows, falls, rot, scripts) go through `Player.die()` and the single death sequence in `Game.onPlayerDeath`. A respawned body starts with fresh `hitstop`, `deathTimer` and hazard clocks.
- The player is untouchable for all of `PS.EXECUTE` plus `CONFIG.execution.grace`. A boss's death, phase change or retreat never starts mid-execution. Execution damage on a boss stays ≤ half its current bar (`bossCap`). If an executor dies, the victim is released (`execution.abandon`).
- Phase transitions never deal damage. Boss strikes keep `active` ≤ 0.22 s, and Elden Ring bosses ≤ 0.2 s.
- `canParryAttack` (`js/helpers.js`) is the single parry rule. The cue is red when the attack can be parried and blue for `noParry`, `rollOnly` and projectiles.
- Lore never blocks progress or pauses the game. NPCs cannot be hit. Ids saved in files or used across the network (`varn`, `field` / `throne` / `knell`, placement keys) never change.
- Story saves:
  - Only Story mode writes a save, and never while `restoring`.
  - The two roads' saves never touch each other.
  - Every storage access is wrapped in try/catch.
  - Changing the save format means bumping `CONFIG.story.saveVersion` or migrating in `check()`.
- Multiplayer:
  - The server runs `validateData({ visual: false })` once at startup. A browser-only check goes behind the `visual` flag. Data helpers the server needs belong in `terrain.js` or the data layer, not `scene.js`.
  - Hits, executions, parries and rests must come from within reach of the sender's recent pose (`ArenaNet.config.contact*`). Test fixtures place the pose next to the enemy first.
  - Per-address connection limits use the socket address, or the last `X-Forwarded-For` entry when the peer is a loopback/private proxy. `/api/lobby` and `/healthz` count joined players only.
  - The server owns shared enemies, gates and traps.
  - Each client owns its own player's input, movement, health and defence outcomes. Never reconcile player damage against the server.
  - The server range- and rate-checks every client claim (hits, executions, rests, parries).
  - Network references use placement keys and definition ids.
- Drawing never allocates per frame in hot paths (scratch arrays and pools). Effects time themselves with `effectSlots`, never a fixed 60th. A stage change frees its materials (`disposeStageObject`) except shared ones (`userData.shared`). The model cache frees an old detail's geometry when its last rig is disposed. Blood decals are one InstancedMesh; lightning bolts come from a fixed pool outside the depth pass.
- Flashes stay under 3 Hz (lightning: two pulses at most, 0.4 s apart). Every screen flash, hurt pulse, shake and refraction honours `reducedMotion()`.
- Low keeps its one-sample surface path. Ultra effects are drawing only. Switching Ultra off must leave the scene exactly as High has it.

## Run and test

- **Play:** open `combat-arena-3d.html`. Dev tools and test levels: `combat-arena-3d.html#dev`. A local server with the multiplayer lobby: `npm run setup` once, then `npm run serve`.
- **In-page suites** (`#dev`, browser console): `await __arena.tests.run()` runs everything. `await __arena.tests.run('Execution')` runs the tests whose names contain that text. The suites are `tests/suite*.js`. They are deterministic: the test clock replaces `input.now` and seeds `Math.random`.
- **From the command line:** run `npm install` once. Playwright drives Microsoft Edge.
  - `npm run test:node`: the fast Node checks (server, protocol, bots, settings, saves).
  - `npm run test:browser`: the browser suites.
  - `npm test`: both.
  - `npm run test:list`: lists every check.
  - `node tests/run-all.cjs <filter> --bail`: a subset. Logs go to `.scratch/test-logs/`.
  - `node tests/solo-browser.cjs [filter]`: the in-page suite headless.
- **When to run what:**
  - Before committing changes to combat, terrain or movement, run the relevant in-page suites, or the full solo suite for broad changes.
  - Multiplayer changes also need `tests/multiplayer*.cjs`, `lobby-*.cjs` and `reconnect-browser.cjs`.
  - Graphics changes need `fullscreen.cjs` and `autoquality.cjs`.
- **CI:** `.github/workflows/ci.yaml` runs the Node checks and the browser suites (Edge with SwiftShader) on every push and pull request. `container.yaml` runs them again before it publishes an image.

## Releasing

1. Bump `VERSION` (`js/config.js`), `LOAD_STAMP` (`combat-arena-3d.html`) and both `package.json` versions. Then run `npm install --package-lock-only` at the root and in `server/`. A test checks that `LOAD_STAMP` matches `VERSION`.
2. Add a line to `docs/CHANGELOG.md`. Detailed notes go in `docs/<topic>-v<version>.md`.
3. Run the full test suite and commit.
4. Push a `v*` tag. It publishes `ghcr.io/aleixribera/3d-souls-low:<version>` and `:latest` through `.github/workflows/container.yaml`.
   - Check that the workflow started; use `workflow_dispatch` if it did not.
   - Check that the `latest` manifest can be read anonymously before telling anyone to pull.
   - The homelab updater (`docs/container-updates.md`) waits while players are in the lobby and rolls back an unhealthy image. Setup is in `docs/homelab-multiplayer.md`.
