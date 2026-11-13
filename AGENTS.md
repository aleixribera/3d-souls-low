# Project Guide

Combat Arena 3D: a Souls-like action game in the browser, played by Aleix and his friends. Current version: **v7.51.0** (`VERSION` in `js/config.js`, `LOAD_STAMP` in `combat-arena-3d.html` without the leading v; both `package.json` files carry it too).

Where the game is going lives in three files at the root. Read them before choosing what to build:

- `VISION.md`: what the game is, its areas and its stages. It wins over every other doc, this one included.
- `PLAN.md`: what comes next, in order, each item with its acceptance check.
- `STORY.md`: the one story being built, which replaces the two roads below chapter by chapter.

Where the work stands is `STATE.md` (what works, what's broken, open questions), and `BACKLOG.md` holds work found or deferred. Both belong to the iterate loop (`.claude/iterate.md`).

In the game today there are two Story roads:

- **Ashmere:** Levels 1–14. Level 1 teaches the controls with lesson cards. Aldric's death (Level 5) is the end of Act I, not
  of the story: its cards lead on to Level 6, the Church in the Pass, over it to Level 7, the Windward Moor, Thrale's
  border, to Level 8, Saltgrave, its border fortress, to Level 9, the Night Gaol, to Level 10, Aurel, Thrale's gilded
  capital, to Level 11, Aurel in Ash, the same city burning, to Level 12, the Torn Abbey, the first of Act III, to
  Level 13, the Root of the Ember, and to Level 14, the Still Mere, the last chapter (`STORY.md`); its ending is not
  built yet.
- **The Lands Between:** eight lands, one per Elden Ring boss, with its own ending and Finn as a solo companion.

There is also a Levels menu, a 1v1 Arena (Enemies, Bosses, Elden Ring Bosses, Boss vs Boss), and an optional multiplayer server with a public lobby and friendly bots.

This file is the guide. History lives elsewhere (`docs/README.md` indexes all the docs):

- `docs/CHANGELOG.md`: one line per release.
- `docs/feature-history.md`: the full per-feature notes, oldest first. Read the section of a system before changing it.
- `docs/*-v<version>.md`: the detailed design notes of a release.

**`LORE.md` is the source of truth for the story in the game today.** Every in-game story text must agree with it: dialogues, inscriptions, chapter lines, boss names, level descriptions, ending cards and credits. Change LORE.md first, then the game. To build a chapter of `STORY.md`, move its text into `LORE.md` first, then into the game.

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
   `baked/*.js`, `baked.js`, `scenery.js` (a level's Blender models) load in the presentation layer; the server loads none of them.
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
| The player's model | `tools/blender/wanderer.py` (rebuild and pack: `docs/wanderer-model-v7.21.0.md`), materials in `MODEL_DEFS.wanderer` |
| The Hollow Soldier's model | `tools/blender/hollow.py` (rebuild and pack: `docs/hollow-model-v7.22.0.md`), materials in `MODEL_DEFS.hollowSoldier` |
| The Ashen Lancer's model | `tools/blender/lancer.py` (rebuild and pack: `docs/lancer-model-v7.23.0.md`), materials in `MODEL_DEFS.ashLancer` |
| The Undead Knight's model | `tools/blender/knight.py` (rebuild and pack: `docs/knight-model-v7.24.0.md`), materials in `MODEL_DEFS.undeadKnight` |
| The Rogue's model | `tools/blender/rogue.py` (rebuild and pack: `docs/rogue-model-v7.25.0.md`), materials in `MODEL_DEFS.rogue` |
| The Pale Duelist's model | `tools/blender/duelist.py` (rebuild and pack: `docs/duelist-model-v7.26.0.md`), materials in `MODEL_DEFS.paleDuelist` |
| The Shield Warden's model | `tools/blender/warden.py` (rebuild and pack: `docs/warden-model-v7.27.0.md`), materials in `MODEL_DEFS.ironWarden` |
| The Rampart Bowman's model | `tools/blender/bowman.py` (rebuild and pack: `docs/bowman-model-v7.28.0.md`), materials in `MODEL_DEFS.rampartBowman` |
| The Beastman of Farum Azula's model | `tools/blender/beastman.py` (rebuild and pack: `docs/beastman-model-v7.29.0.md`), materials in `MODEL_DEFS.beastman` |
| The Toll Wisp's model | `tools/blender/wisp.py` (rebuild and pack: `docs/wisp-model-v7.30.0.md`), materials in `MODEL_DEFS.tollWisp` |
| The Grafted Scion's model | `tools/blender/scion.py` (rebuild and pack: `docs/scion-model-v7.31.0.md`), materials in `MODEL_DEFS.graftedScion` |
| The Executioner's model | `tools/blender/executioner.py` (rebuild and pack: `docs/executioner-model-v7.32.0.md`), materials in `MODEL_DEFS.ashExecutioner` |
| The Crucible Squire's model | `tools/blender/squire.py` (rebuild and pack: `docs/squire-model-v7.33.0.md`), materials in `MODEL_DEFS.crucibleSquire` |
| The Shover's model | `tools/blender/shover.py` (rebuild and pack: `docs/shover-model-v7.34.0.md`), materials in `MODEL_DEFS.ironShover` |
| The Gargoyle's model | `tools/blender/gargoyle.py` (rebuild and pack: `docs/gargoyle-model-v7.37.0.md`), materials in `MODEL_DEFS.gargoyle` |
| The Empty Sentinel's model | `tools/blender/sentinel.py` (rebuild and pack: `docs/sentinel-model-v7.39.0.md`), materials in `MODEL_DEFS.emptySentinel` |
| The Pillager Captain's model | `tools/blender/captain.py` (rebuild and pack: `docs/captain-model-v7.41.0.md`), materials in `MODEL_DEFS.pillagerCaptain` |
| The Bell Warden's model | `tools/blender/bellwarden.py` (rebuild and pack: `docs/bellwarden-model-v7.43.0.md`), materials in `MODEL_DEFS.bellWarden` |
| The Giant Skeleton's model | `tools/blender/giant.py` (rebuild and pack: `docs/giant-model-v7.45.0.md`), materials in `MODEL_DEFS.giantSkeleton` |
| The Antlered Hunger's model | `tools/blender/antlered_beast.py` (rebuild and pack: `docs/antlered-model-v7.49.0.md`), materials in `MODEL_DEFS.antleredHunger` (`js/data/bosses/antlered-hunger.js`) |
| Aldric's model (both phases) | `tools/blender/aldric.py` (rebuild and pack: `docs/aldric-model-v7.47.0.md`), materials in `MODEL_DEFS.varn` |
| An enemy or Ashmere boss | `js/data/enemies.js`, models in `data/models-*.js` |
| An Elden Ring boss | `js/data/bosses/<boss>.js` (poses, model, def), registered in `data/elden-bosses.js`, effects in `data/boss-fx.js` |
| Attack phases and key poses | `js/attack-anim.js`, `js/data/attack-poses.js` |
| Executions | `js/execution.js`, `CONFIG.execution` |
| A boss against a group (health, posture, breaks per player) | `CONFIG.group`, `groupDef` and `setGroup` (`js/enemy.js`), a def's `groupScale`; the server scales each tick |
| Boss phases, reactions, follow-ups | `js/enemy.js` (`enterPhase`, `outlast`, `REACTIONS`, `FOLLOW_IF`, `attackById`); a pair of bosses: an `alone` phase (`checkPhaseAt`, `kin` from `Game.spawnZone`) |
| A level | `js/levels/*.js`, listed in `data/levels.js` |
| Models built in Blender | `tools/blender/*.py`, packed by `tools/pack-baked.cjs` into `js/baked/`, decoded by `js/baked.js`; a level draws them through `scenery` (`js/scenery.js`), a model through `use: 'baked'` parts. Steps in `docs/church-in-the-pass-v7.20.0.md` and `docs/wanderer-model-v7.21.0.md` |
| Story chapters and saves | `js/data/story.js`, `js/story.js`, `CONFIG.story` |
| Lore, NPCs, inscriptions | `LORE.md`, then `js/data/lore.js` / `lore-lands.js` |
| Menus, the title's online card | `js/game-menus.js` (`Game.screens()`, `titleLobby`), `multiplayer.peek()` |
| The in-game changelog (title > Changelog) | `js/data/changelog.js` (newest first; the first entry must be `VERSION`) |
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
  - `node tests/solo-browser.cjs [filter]`: the in-page suite headless, at 640x360. `ARENA_SHARD=k/n` runs the k-th of n slices, `ARENA_VIEWPORT=WxH` another size, `ARENA_TEST_PROGRESS=1` a line per test.
- **Keep the PC usable.** Local runs go at idle priority (`tests/low-priority.cjs`; `ARENA_TEST_PRIORITY=normal` opts out), and every browser test gets Playwright from `tests/browser.cjs`, which keeps Edge's processes idle too. A new browser test requires `./browser.cjs`, never `playwright`. Never run `ARENA_SOFTWARE_GL=1` locally: software WebGL fills every core for most of an hour. Long runs belong on CI.
- **When to run what:**
  - Before committing changes to combat, terrain or movement, run the relevant in-page suites, or the full solo suite for broad changes.
  - Multiplayer changes also need `tests/multiplayer*.cjs`, `lobby-*.cjs` and `reconnect-browser.cjs`.
  - Graphics changes need `fullscreen.cjs` and `autoquality.cjs`.
- **CI:** `.github/workflows/ci.yaml` runs the Node checks and the browser suites (Edge with SwiftShader) on every push and pull request. `container.yaml` runs them again before it publishes an image.

## Releasing

1. Bump `VERSION` (`js/config.js`), `LOAD_STAMP` (`combat-arena-3d.html`) and both `package.json` versions. Then run `npm install --package-lock-only` at the root and in `server/`. A test checks that `LOAD_STAMP` matches `VERSION`.
2. Add a line to `docs/CHANGELOG.md`, and an entry for players at the top of `js/data/changelog.js` (validation fails until its first entry is the new `VERSION`). Detailed notes go in `docs/<topic>-v<version>.md`.
3. Run the full test suite and commit.
4. Push a `v*` tag. It publishes `ghcr.io/aleixribera/3d-souls-low:<version>` and `:latest` through `.github/workflows/container.yaml`.
   - Check that the workflow started; use `workflow_dispatch` if it did not.
   - Check that the `latest` manifest can be read anonymously before telling anyone to pull.
   - The homelab updater (`docs/container-updates.md`) waits while players are in the lobby and rolls back an unhealthy image. Setup is in `docs/homelab-multiplayer.md`.
