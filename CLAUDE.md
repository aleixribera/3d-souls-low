# Project Guidelines

Current version: **v4.3 — The Last Toll** (`VERSION` in `js/config.js`). The game is complete: Tutorial, Levels 1–5, and the ending.

## Tech Stack
- **Engine / Core:** Vanilla JavaScript (ES6+), Three.js r160[cite: 1].
- **Structure:** Classic scripts loaded via `<script>` tags sharing a global execution context, loaded strictly in the order listed in `GAME_FILES` inside `combat-arena-3d.html`[cite: 1].
- **Dependencies & Tooling:** Zero build steps, bundlers, or third-party npm runtime dependencies[cite: 1].

## Run & Test Commands
- **Launch:** Open `combat-arena-3d.html` directly in any modern browser[cite: 1].
- **Dev Mode / Test Grounds:** Append `#dev` to the address (`combat-arena-3d.html#dev`) to enable test levels and suites[cite: 1].
- **Test Suite:** Execute in the browser developer console:
  - Run all tests: `await __arena.tests.run()`[cite: 1]
  - Run filtered tests: `await __arena.tests.run('<filter_keyword>')` (e.g., `run('heights')`)[cite: 1]
  - Run tests before every commit when modifying core combat, terrain, or movement logic[cite: 1].

## Architectural Rules
1. **Content is Data:** All game entities (enemies, levels, items, attacks) must reside as plain data objects in `js/data/` or `js/levels/`[cite: 1]. Do not hardcode content into engine logic[cite: 1].
2. **ID Referencing:** All entities, objects, and assets must be referenced strictly by string `id`, never by array index[cite: 1].
3. **Fail-Fast Validation:** Validate data schemas and references on initialization[cite: 1]. Broken references must throw an explicit, readable error at load[cite: 1].
4. **Configuration Isolation:** Numeric balance, physics constants, and tuning parameters belong in `CONFIG` or data definitions, never scattered through procedural logic[cite: 1].
5. **Opt-In Mechanics:** New gameplay mechanics must remain data-driven and opt-in per entity/level so existing assets remain backward-compatible[cite: 1].
6. **Event-Driven Decoupling:** Combat and physics logic communicate outwards via `js/events.js` (e.g., `strike`, `dodge`, `parry`)[cite: 1]. Visuals, camera effects, HUD, and audio must listen to events rather than injecting into combat loops[cite: 1].
7. **Fixed Simulation Step:** Combat and physics simulate on a fixed 1/60s step, with rendering handling visual interpolation[cite: 1].
8. **Render Separation:** `js/visuals.js` and post-processing only handle drawing and cannot alter game state, collisions, or layout coordinates[cite: 1].
## Attack Animation (four phases, v4.2)
- An attack is wind-up -> active (the only phase with a hitbox) -> follow-through (`follow` per hit) -> recovery, on one clock (`attackTimeline`, `js/character.js`). Draw and hitbox read the same timeline, so they cannot disagree.
- Opt in per attack with `pose: '<id>'` (`ATTACK_POSES`, `js/data/attack-poses.js`): additive key poses (windup, strike, follow) per hit, eased per phase and lagged per joint (legs -> hips -> spine -> arm -> blade). Optional `poseScale` (bosses), `charge` (player heavy), `markers` (`sound`, `shake`, `glint`; `parry: true` glints as the parry window opens). Engine: `js/attack-anim.js` (also validates these fields).
- Enemies: `tracking: { rate, commit }` turns only for `commit` of each wind-up, then locks. A hit's `hold: { at, time, chance }` is a delayed attack, frozen still. No `pose` keeps the legacy `ANIMS` path (the training dummies).
- Player input: one Souls-style buffer slot (`Player.bufferInputs`, `CONFIG.player.bufferWindow`); combos chain through `next` on an attack.
- Feel, all visual: `js/impact.js` (strike shake, hit shudder, enemy trails), cloth and turn lag in `js/animator.js` / `ANIM_SETTINGS`, `Rig.weightLean`. Dev: `js/debug-combat.js` (F6 slow motion, F7 tracking colours).
- Changing a timing? Log old and new in `docs/combat-timings-v4.1.md`. Keep an enemy hit's `active` under the roll's i-frames (`CONFIG.player.rollIFrames`, 0.3 s) by a margin; move extra time into `follow` (a test checks the bosses).
## AI, checkpoints and stamina (v4.2.4)
- Enemy states add `SEARCH` (lost sight: walks to `lastSeen`, looks about, goes home; `CONFIG.ai.search`). Unaware states in `ENEMY_GROUPS.narrowSight` see only in `CONFIG.vision.cone`. Alerts wake every enemy with the same `zone` (zone members, and dispersed entries with `zone`). Optional per-enemy `kite` (0..1): chance it keeps its distance after an attack or flinch instead of stepping in.
- Bonfires are checkpoints: `Game.cleared` holds the placement keys (`Game.placementKey`) of enemies dead at the last rest; they never respawn until a level restart.
- Player exhaustion: `Player.spend` to 0 sets `exhausted`; `canAct()` gates every stamina action (`CONFIG.player.exhaustDelay`, `exhaustRecover`); refused presses emit `staminaDenied`.
- A room may set `railHeight` (lower rails the player can jump). Levels and duels start behind a loading screen (`Game.showLoading`, `CONFIG.loading`); there is no start notice screen.
## Character Models (procedural, no asset files)
- An enemy or the player opts in with `model: '<id>'` (`js/data/enemies.js`, `js/data/player.js`); without it the old box body is used. Definitions live in `js/data/models.js` (format, Hollow Soldier, player), `models-enemies.js` and `models-bosses.js`; a model can `extends` another. Parts and weapons come from `KIT_PARTS` / `KIT_WEAPONS` in `js/bodykit.js`; textures from `js/data/textures.js` via `TEXLIB` (`js/textures.js`).
- The skeleton is fixed (names in `js/bodykit.js`) so key poses and the legacy attack animations keep driving it. Secondary motion (breathing, flinch, death buckle, cloth springs, weapon glint, death dissolve) is `js/animator.js` + `js/data/animations.js`: visual only.
- One skinned mesh per material, geometry shared per model, materials cloned per body. Budgets: ~1,500 triangles normal enemy, ~3,000 player, ~6,000 boss (warned at load). Textures are generated once and cached; `KIT.prewarm()` bakes them while the menus are up.
- A placement can add `variant: 'elite'` (`MODEL_VARIANTS` in `models.js`): darker, spiked and horned, with an aura. Visual only.
- Dev viewers (`#dev`): F8 texture lab, F9 model lab (`MODELLAB.open('<model id>')`, `MODELLAB.pose('<mode>', seconds)`).
## Boss phases, Level 5 and the finale (v4.3)
- **Boss phases:** an enemy def with `phases: { <id>: { hp, name?, attacks: [ids], transition?, ignite?, ...any def field } }`. A placement picks them with `boss: { phases: [...] }` (else the def's `defaultPhases`). `Enemy.enterPhase` builds `this.def` as the base def with the phase's fields over it, so AI, HUD and timings read the phase. When a bar empties, `Enemy.outlast` starts the next phase (`ES.PHASE`: kneels, invulnerable, the bar refills over `transition` s) or, on the last one with `boss.retreat`, a scripted leap away (`ES.RETREAT` then `ES.GONE`, not alive, no death event). `ENEMY_GROUPS.invulnerable` lets blows pass through. Events: `bossPhase`, `bossRetreat`, `bossGone`, `bossLeap`.
- **New attack fields (per hit):** `box` (its own hitbox; `ring: { from, to, width, time }` is an expanding ring round the owner, tested in `Hitbox.overlaps`), `impact`, and `leap: { from, max, short }` (jumps along its locked aim at `from` of the wind-up, landing as the strike opens; no fall damage). All validated in `js/validate.js`.
- **Level fields:** `ending: true` (no LEVEL COMPLETE banner; `js/finale.js` runs the ending), bonfire `litBy: '<zone id>'` (cold until that zone is won; `Game.bonfireLit`), `sealed` gate `fog: '<zone id>'` (open until the player is inside with the fight on), `spectators` (out-of-reach sightings), `hints` (corpses before ambushes), `finaleRoom` (throne dressing), `devJumps`. Placements may set their own `notice`, `leash`, `homeLeash`; a `boss` placement never sleeps in culled levels. Dispersed behaviour `perch` (crouched on a ledge, leaps when you pass; grit falls and stone grinds first).
- **`js/finale.js`:** Level 5's script, all drawn or heard except the fog gate: sightings, corpses, the throne room and its transition timeline (`CONFIG.finale.timeline`), the burning look of an `ignite` phase, the boss pulse, perch grit, the ending cards, credits, the way back to the title, and the completion flag (`localStorage` `combatArena.complete`, a ✦ on the Levels menu). Dev (`#dev`): Level 5 jumps in Test Grounds, **F10** empties the current boss bar; console `__arena.finale`.
- **Level 5** (`js/levels/final-castle.js`): the field fight (Varn's `field` bar ends in a retreat), Section A (outer ward, bridge Sentinel), Section B (great hall, ramparts), Section C (ash bridge, the processional gauntlet), the throne (`throne` then `knell`). New enemies: Gargoyle, Empty Sentinel, Toll Wisp; boss Varn (`js/data/enemies.js`, models in `models-bosses.js` / `models-enemies.js`). Level 4 carries on into it (`next`).
- **Rules:** a transition must never deal damage; boss strikes keep `active` ≤ 0.22 s (tests check Varn too); content stays in data, the finale only reads it.
- **Known gaps:** the throne room's falling pillars, glass and fire are drawn only (no collision). Tolling Chain's four cuts are all parryable (parry is per attack, not per hit). The Ash Wave is a projectile and can be blocked at block rates. Varn's name on the bar changes as the transition starts, not when the bar refills.
