# Combat Arena 3D

A Souls-like in the browser that Aleix plays with his friends. What the game is: `VISION.md` (Aleix's words; it wins
over this file). What comes next: `PLAN.md`. The story: `STORY.md`. This file is an engineering guide written by
agents: a draft, changed whenever the code changes.

## Stack

- Vanilla JavaScript (ES2020+) and Three.js r160, as classic `<script>` files sharing one global scope. No build step
  and no runtime npm dependency: open `combat-arena-3d.html`.
- Scripts load in the order of `GAME_FILES` in `combat-arena-3d.html` (data, then validation, engine, presentation,
  modes, `boot.js`), each with a `?v=LOAD_STAMP` cache key.
- `server/`: the optional multiplayer server, Node 22.8+ with one dependency (`ws`). `server/headless.cjs` runs the
  engine half of `GAME_FILES`; a new file the server needs goes in its engine set.
- Blender models: `tools/blender/<name>.py`, built with
  `blender -b --factory-startup -P tools/blender/run_asset.py -- <stem> --export`, packed into `js/baked/` by
  `node tools/pack-baked.cjs <stem>`.

## Rules that keep it working

1. Content is data: enemies, bosses, attacks, levels and story text are plain objects in `js/data/` and `js/levels/`.
   Engine code never names a specific one; a new mechanic is a field content opts into.
2. `js/validate.js` checks all data at load and throws a readable error. A new data field gets a check.
3. Tuning lives in `CONFIG` (`js/config.js`) or in the definition it belongs to.
4. Reference things by string id, never by array index, in saves and network frames too.
5. The simulation runs at a fixed 1/60 s step. Rendering interpolates and never changes game state. Combat emits
   events (`js/events.js`); visuals, camera, HUD and audio only listen.
6. Every death goes through `Player.die()` and `Game.onPlayerDeath`.
7. Multiplayer: the server owns shared enemies, gates and traps; each client owns its own player's movement, health
   and defence; the server range- and rate-checks every claim (hits, executions, parries, rests). The server runs
   `validateData({ visual: false })` at startup, so browser-only checks sit behind `visual`.
8. Every storage access is wrapped in try/catch. A change to the save format bumps `CONFIG.story.saveVersion`.
9. Drawing allocates nothing per frame in hot paths. Screen flashes stay under 3 Hz and follow `reducedMotion()`.
10. An ability's card text is only its trigger and its effect, in the fewest plain words ("Parry: a hound hunts the boss
    for 8 s."): no flavour, nothing its name or rarity already shows (Aleix). `js/validate.js` caps it.

## Run and test

- Play: open `combat-arena-3d.html`; `#dev` adds dev tools. With the lobby: `npm run setup` once, then `npm run serve`.
- `npm install` once, then:
  - `npm run test:node`: the fast Node checks.
  - `node tests/solo-browser.cjs "<filter>"`: in-page tests by name, in headless Edge.
  - `node tests/run-all.cjs <filter>`: any subset of everything.
  - In the page (`#dev`): `await __arena.tests.run('<filter>')`.
- Run the tests that cover your change. CI (`.github/workflows/ci.yaml`) runs everything on every push; don't run the
  full suite locally.
- Browser tests get Playwright from `tests/browser.cjs`. Never set `ARENA_SOFTWARE_GL=1` locally.

## Release

1. Bump `VERSION` (`js/config.js`), `LOAD_STAMP` (`combat-arena-3d.html`, without the v) and both `package.json`
   files, then `npm install --package-lock-only` at the root and in `server/`.
2. Add a players' entry at the top of `js/data/changelog.js` (its first entry must be `VERSION`).
3. Commit, push, then push a `v*` tag. `.github/workflows/container.yaml` publishes
   `ghcr.io/aleixribera/3d-souls-low:<version>` and `:latest`; check that it started. The homelab's `hl` pulls it
   when the lobby is empty (`docs/container-updates.md`).
