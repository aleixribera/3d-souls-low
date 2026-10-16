# Project Guidelines

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
## Character Models (procedural, no asset files)
- An enemy or the player opts in with `model: '<id>'` (`js/data/enemies.js`, `js/data/player.js`); without it the old box body is used. Definitions live in `js/data/models.js` (format, Hollow Soldier, player), `models-enemies.js` and `models-bosses.js`; a model can `extends` another. Parts and weapons come from `KIT_PARTS` / `KIT_WEAPONS` in `js/bodykit.js`; textures from `js/data/textures.js` via `TEXLIB` (`js/textures.js`).
- The skeleton is fixed (names in `js/bodykit.js`) so the legacy attack animations keep driving it. Secondary motion (breathing, wind-up weight shifts, flinch, death buckle, cloth springs, weapon glint, death dissolve) is `js/animator.js` + `js/data/animations.js`: visual only, it adds to bone rotations and never touches timings or hitboxes.
- One skinned mesh per material, geometry shared per model, materials cloned per body. Budgets: ~1,500 triangles normal enemy, ~3,000 player, ~6,000 boss (warned at load). Textures are generated once and cached; `KIT.prewarm()` bakes them while the menus are up.
- A placement can add `variant: 'elite'` (`MODEL_VARIANTS` in `models.js`): darker, spiked and horned, with an aura. Visual only.
- Dev viewers (`#dev`): F8 texture lab, F9 model lab (`MODELLAB.open('<model id>')`, `MODELLAB.pose('<mode>', seconds)`).
