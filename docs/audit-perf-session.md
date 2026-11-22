# Audit: the perf session's changes (PR #15, `claude/affectionate-sanderson-86ac0c`)
nLine references are to the branch head `08b0f7f`.

Independent review, 22 Nov 2026. I read every diff and played the branch, `main` and v7.225.0 in a real browser. I
did not use the perf session's tests, screenshots or reports as evidence.

## What is live, and where the perf commits are

- **The live site has none of the perf session's commits.** `https://aleix.tailfef0f7.ts.net/souls/` serves
  `LOAD_STAMP = '7.226.0'`. Every one of the 253 `js/*.js` files at `6fc3c30` (v7.226.0) matches the live file
  byte for byte. The live HTML differs from the tag only by the server's injected build id (`<meta name="arena-build">`
  and the `?v=…-<build>` suffix, `server/index.cjs:52-62`). There are no modulepreload links, so `2294acc` is not
  live either.
- **`main` has no perf commits.** The 4 commits on `main` after v7.226.0 (`b6b3c8b`..`4e4d172`, merged as PR #14)
  are the test-speed session's work: CI, the test runner and shard weights. They touch no game code.
- **The branch has 14 commits not on `main`:** 12 by the perf session, the merge of `main` (`25bc84c`) and a docs
  commit. PR #15 is still a draft at `08b0f7f`.

## How I tested

The script is `play.cjs` in the session's scratchpad. It ran in headless Edge on this PC's GPU (ANGLE, RTX 5060,
D3D11) at 1280x720, against a plain static server, with `navigator.webdriver` hidden so the real launch flow runs.
The flow:

1. Launch as an existing player on a new version: the showcase plays, then Escape skips it.
2. Title menu by keyboard (Down Down Up), then by a fake standard gamepad (D-pad Down x2).
3. Practice, then Fight a boss, then the first boss picked with pad A.
4. In the fight: move (W), attack (four mouse clicks), take hits, die, respawn.
5. Pause with Escape, resume with pad B.
6. A Story level through `loadingFirst`, then walk in it.

`play2.cjs` ran at the **Normal** preset (the laptop's): Boss Rush alone (`multiplayer.playAlone`), the title's
Tutorial (the `6bdc60d` path), a second level, death and respawn at its bonfire (the `e4b4ded` path), and Level 1
again (a stage seen again: the baked-light cache and retired stage programs). `play3.cjs` played **online Boss Rush**
through the game's own lobby server (`server/index.cjs`, run locally). Two runs repeated the flows with the CPU slowed
6x (CDP `Emulation.setCPUThrottlingRate`) to bring out timing races.

At every checkpoint the script records:

- `Game.mode`
- `Game.loading`
- whether `#loading` is shown
- `TEXLIB.waiting()`
- the renderer's draw count over one second
- whether two screenshots taken one second apart differ (`pictureMoves`)
- every console error, warning and page error

The logs and contact sheets are in `docs/audit-perf-session/`:

| Run | Build | Preset | Sheet | Log |
|---|---|---|---|---|
| Full flow | branch `08b0f7f` | auto (Ultra) | `branch-ultra.jpg` | `out-branch.log.txt` |
| Full flow | `main` `92d6558` | auto (Ultra) | `main-ultra.jpg` | `out-main.log.txt` |
| Full flow | v7.225.0 | auto (Ultra) | `v7.225.0-ultra.jpg` | `out-725.log.txt` |
| Rush alone, Tutorial, levels, death | branch | Normal | `branch-normal-rush-tutorial.jpg` | `out2-branch.log.txt` |
| Same, CPU 6x slower | branch | Normal | `branch-normal-cpu6x.jpg` | `out2t-branch.log.txt` |
| Full flow, CPU 6x slower | branch | Ultra | `branch-ultra-cpu6x.jpg` | `outt-branch.log.txt` |
| Full flow, CPU 6x slower | `main` | Ultra | (none) | `outt-main.log.txt` |
| Online Boss Rush, local lobby server | branch | Normal | `branch-online-rush.jpg` | `out3-branch.log.txt` |

**Results.** All three builds behaved the same. I could not reproduce "picture frozen while the game and boss audio
continue", and I could not reproduce menus misbehaving:

- **Picture.** In every playing state the picture moved and the loading screen lifted. During loading the branch held
  the screen while `TEXLIB.waiting()` was above 0 (18 textures at full speed, 1 when slowed), then lifted it.
- **Menus.** Keyboard and pad moved the selection the same way in all three builds. Pause, resume and the boss list
  all worked.
- **Console.** The same output in every build: 3 × 404 (`/api/lobby` and similar; my static server has no lobby API),
  two "model over triangle budget" warnings, and, in the slowed runs, one UniformsUtils render-target warning, which
  `main` prints too.
- **Drawing.** Side by side, the screenshots differ only by animation timing. The player body is drawn on the branch
  (the `6e9b7ac` bug is fixed), and AO and lighting match `main`.
- **Not exercised:** the boss fight in Boss Rush alone. That run stopped at its first ability pick ("Choose an
  ability", with a countdown) and the script picked nothing. The same pick is in the logic every build shares.

**Limits.** This PC's GPU is much faster than the laptop's Intel iGPU. I did not touch the Fedora laptop (the perf
session's benchmark may be using its screen), and I did not test Firefox. Races that need a slow GPU, such as a shader
compile stalling the presented frame, can hide here. The slowed CPU covers the worker and texture timing, not the GPU.

## Each commit

### `15d2221`: procedural textures bake in a pool of workers; the loading screen holds until they are in

**Verdict: risky.** It works in every run, but one failure mode matches the reported symptom.

- What changes in behaviour:
  - `TEXLIB.deferred()` makes textures empty `THREE.Texture`s (version 0, never drawn) and fills them as up to four
    workers return their pixels (`js/textures.js` `get`/`fill`/`make`).
  - `Game.loadingFirst` wraps every build in `deferred` (`js/game-menus.js:626`).
  - `Game.tickLoading` holds the loading screen while `TEXLIB.waiting() > 0`: it sets `this.loading = 1e-3` each frame
    (`js/game-menus.js:638`).
  - Boot defers the effect pools' textures (`js/boot.js:182`).
  - A build outside a loading screen finishes waiting textures on the main thread (`js/game.js:103`, `TEXLIB.settle`).
- **Risk: the hold has no timeout.** If a worker never answers, `waiting()` never reaches 0 and the loading screen
  stays forever. Only an `onerror` is handled (`lost()`); a hung or silently dropped job is not, and neither is a bake
  that throws again on the main thread. Locally, while `Game.loading > 0`, the boot loop skips the simulation
  (`js/boot.js:216`). In **online Boss Rush** the server runs the boss regardless, so the result would look exactly
  like the report: a still loading card, the run's sounds going on, and no control. I saw no hang in any run.
- Other behaviour changes:
  - Effect pools' textures fill while the title is up; until then those effects are drawn without textures.
  - `renderer.initTexture` uploads each filled texture at once.
  - Tiled clones (`copies`) are refreshed along with their source.
- Fix if kept: cap the hold (for example `CONFIG.loading.textureWait`, 5 s), then `TEXLIB.settle()` on the main thread
  and lift the screen. Also put a timeout on each worker job that requeues it (or bakes it here), like `lost()`.

### `2294acc`: modulepreload for Three.js and its addons, preload for every game script

**Verdict: safe.**

- `GAME_FILES` and `LOAD_STAMP` move from the module script into a classic `<script>` in `<head>`. That makes them,
  and the new `scriptUrl`, global lexical names. No game file declares the same name, so this is safe.
- The places that read these names still match:
  - `server/headless.cjs:10`
  - `tools/body-check.cjs:24`
  - `tools/release.cjs:44`
  - `server/index.cjs:52`, which reads `LOAD_STAMP`.
  - `server/index.cjs:62`, which rewrites the first `'?v=' + LOAD_STAMP`. That is now `scriptUrl`, so the preloads
    and the loader get the same build suffix.
- Off-CDN or offline, the preloads only add console noise. The game loaded in every run.

### `d995eed`, `e6a2148`, `d6a503f`: the perf benchmark and its visual check

**Verdict: safe for the game.** These change only `tools/perf-bench.cjs`, `tools/perf-headed.sh`, `docs/perf/**` and
baseline JPEGs, and nothing loads them in the game.

- `perf-headed.sh` runs Chromium **fullscreen on the laptop's own display**, with screensaver inhibited and Playwright
  driving input (`tools/perf-bench.cjs:41-44`). Its "shots" phase steps the game by hand (`Game.manualClock = true`,
  around line 598), so the picture stands still between shots.
- Anyone at the laptop during a run would see a fullscreen game that ignores them and sometimes freezes. That is the
  likely source of the report, if Aleix was at the laptop.
- One detail does not fit: the bench sets `volume: 0`. It should be silent, unless the sound came from elsewhere.

### `786f682`: `KHR_parallel_shader_compile` and a `renderer.compile` before warm-up's first draw

**Verdict: safe.**

- Enabling the extension (`js/scene.js:9`) changes nothing in r160 unless code polls completion. It lets the driver
  compile programs side by side.
- The extra `renderer.compile` runs only on a stage or quality change during warm-up, which is behind the loading
  screen.
- On a slow GPU, the first draw after it still waits for the link, which is behind the loading screen too.

### `6bdc60d`: the title's Tutorial shows the loading screen while the show sets up

**Verdict: safe, with one rough edge.**

- Behaviour: Tutorial now paints `#loading`, sets `pendingLoad` (a second press does nothing), and calls
  `showcase.play` two frames later (`js/game-menus.js:205-220`).
- `showcase.play` lifts the screen (`js/showcase.js:376`); so does `spar` if the show fails to start. Verified in
  `out2-branch` and `out2t-branch`: the show plays and the sparring scene follows.
- Rough edge: if `showcase.play` *throws* instead of returning false, the loading screen stays over the title. The
  menu is hidden and does nothing, which looks like "menus don't work". Wrapping `go()` in try/catch that calls
  `spar()` fixes it.

### `57e68b2`: baked light kept per stage and lights, reused when a stage is built again

**Verdict: safe after `2470bc6`.**

- Volumes are cached by stage, grid settings, moon direction and every light's position, colour, intensity, distance
  and decay, up to 3M cells (about 24 MB, `js/config.js` `baked.cacheCells`).
- Bonfire changes are tracked per index (`V.fires`) and replayed on a cache hit.
- Problem in this commit alone: a cached volume set aside is "compact" (its float arrays dropped). A bonfire that
  changes after the stage comes back triggers a **full re-bake in the middle of play** (`whole()`, a hitch of hundreds
  of ms). Also, the key used the flame light's flickering intensity, so cache hits depended on the frame.
- `2470bc6` fixes both: it keeps the arrays for stages with bonfires and keys on the flame's steady level and colour.
  In my runs, Level 1 seen again drew the same as the first time.

### `6e9b7ac`: matrices updated once per frame, skipping hidden subtrees

**Verdict: broken as committed, fixed by `1b70017` and `2470bc6`. After the fixes it is still the riskiest change.**

- Behaviour: `visuals.draw` replaces three's scene-wide `updateMatrixWorld` with `updateVisible`
  (`js/visuals.js:1429-1450`). It skips the subtree under any invisible node, then sets
  `scene.matrixWorldAutoUpdate = false` for the render.
- **Broke:**
  - Skinned meshes' `bindMatrixInverse`: the player's body was not drawn. Fixed in `1b70017`.
  - Hidden bones: a hidden weapon bone no longer posed its blade. Fixed in `2470bc6` (`!c.isBone`).
  - Two effect anchors read matrices of hidden rigs. Fixed in `2470bc6` (`js/storm-rend.js:42`, `js/finale.js:228`).
- **Still risky:** any code reading `matrixWorld` / `localToWorld` of an object under a hidden parent now gets that
  object's matrix as of the last frame it was shown. I found 25 such reads outside `visuals.js`. Two are fixed. These
  read a rig's weapon or head and were not checked:
  - `js/fx.js:195`
  - `js/ultra-fx.js:285`
  - `js/ability-touch.js:174`
  - `js/summon-figures.js:237-241`

  They are fine while the rig is visible. A rig hidden by `afterimage`, `ability-fx`, an enemy's `GONE`/`DEAD`
  fade, or culling gives stale positions. Effects then appear at the wrong spot; nothing freezes.
- The simulation never reads these matrices for gameplay (collision reads level data), so it is visual only.
- Recommendation: keep it only with a debug check, run in tests, that compares `updateVisible` against
  `scene.updateMatrixWorld(true)` for every *read* site. Otherwise revert it. It is one of the largest frame-time wins,
  so the trade is Aleix's call.

### `e4b4ded`: a respawn or rest disposes the old enemies after the new ones are drawn

**Verdict: safe.**

- Old rigs leave the scene at once and are disposed after the next `Game.render` (`js/game.js:383`) or at the next
  `clearActors` (`js/game.js:45`). They never draw (they are out of the scene) and only use memory for one frame.
  Respawn verified in `out2-branch`.

### `1b70017`: fix, the player's body drawn again (skinned bind matrices)

**Verdict: safe; a necessary fix for `6e9b7ac`.**

- It matches three r160's `SkinnedMesh.updateMatrixWorld` and `Camera.updateMatrixWorld`, but runs only when the
  matrix changed. That is equivalent, because `bind()` sets its own inverse.
- It adds a render audit test (`tests/suite-render.js`).

### `29764bd`: no shader compiles after loading

**Verdict: safe in my runs; it keeps memory for good.**

- Warm-up compiles at play's light count (`limitLights()` before it) and into the composer's target
  (`compileScene`, `js/visuals.js:1530-1536`).
- Ultra's depth pass warms into its own `warmBuf`. This is the right fix for the earlier `gbuf.clone` shrink: a clone
  shares the image, and resizing it shrank the live AO buffer.
- `retireMaterial` (`js/scene.js:454`) adds one extra use to each retired program, so programs are **never freed** for
  the page's life. The set is bounded by the number of distinct programs (a few hundred), which is acceptable.
- Old stages are disposed after the next stage's first draw (`flushRetiredStages` in `visuals.draw`).
- The Ultra sky material is shared (a single `envMat` plus a `keeper` box that keeps three's background program).
- Additive, double-sided, non-depth-writing materials get `forceSinglePass`. That is the same picture for additive
  blending.
- Baked light reads bonfire state from `Game.bonfireLit`.
- No change I could see to presenting frames: warm-up still happens under the loading screen.

### `2470bc6`: fixes from review

**Verdict: safe.** These are the fixes described under `57e68b2` and `6e9b7ac`. It also fills a shared
roughness/bump map when a later tint brings its pixels (`js/textures.js:319`), which fixes surfaces staying blank
under `15d2221`.

### `25bc84c` (merge of `main`) and `08b0f7f` (results doc)

**Verdict: safe.** The merge resolved only `combat-arena-3d.html`: it took v7.226.0's `LOAD_STAMP` and kept the
`<head>` loader. I checked the combined diff. `08b0f7f` is docs only.

## Recommendation

- **Live and `main` need nothing right now.** Live is exactly v7.226.0 and has none of these commits. On this PC,
  `main` and v7.225.0 behave the same in every flow above. If Aleix saw the breakage on the live site, a perf commit
  did not cause it. The next step would be his browser, GPU and console on the machine where it happened. If it was
  the laptop during the perf session's benchmark, that was the benchmark: a fullscreen, script-driven, hand-stepped
  page.
- **PR #15:**
  - **Keep:**
    - `2294acc`
    - `786f682`
    - `e4b4ded`
    - `1b70017`
    - `57e68b2` + `2470bc6`
    - `29764bd`
    - the bench commits
  - **Keep with a fix before merging:**
    - `15d2221`: cap the texture hold on the loading screen and add a per-job worker timeout. The unbounded hold is
      the one code path that can produce "stuck loading card while the online boss keeps fighting".
    - `6bdc60d`: try/catch round `go()`.
  - **Revert, or keep only with a guard:** `6e9b7ac`. It broke drawing twice and still leaves at least four unchecked
    `matrixWorld` reads of possibly hidden rigs. Ship it only with a dev or test check that compares its matrices with
    three's full update at every read site, and after a play-through on the laptop's iGPU in the browser Aleix uses.
  - Before merging any of it: a real play-through on the laptop's iGPU, in Aleix's browser. This PC's RTX hides
    GPU-bound stalls, and none of the PR's own checks cover the online Boss Rush loading path.
