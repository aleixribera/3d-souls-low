# v7.16.0 — Finn of the Lands

Finn accompanies the human through all eight chapters of the single-player Lands campaign. He is a fellow Tarnished, recorded in LORE.md, with a simple overhead name, a health meter and a different armour colour. Seren remains the guide and lantern bearer.

## Scope and lifecycle

The campaign opts into `companion: { id, name, profile, color }` in `js/data/story.js`. The engine does not special-case a campaign or enemy id. Finn uses the existing Quill profile and ordinary Player health, stamina, damage, controls, inventory and physics. His hands are independent of keyboard/controller input.

He joins every campaign chapter, including New, automatic progression and Continue from an existing save. Resting refills/rejoins the companion; the human's death returns both characters to the checkpoint. If Finn falls while the human lives, the attempt continues and he remains down until a rest, human respawn or new chapter. There is no automatic resurrection during the same attempt.

The shared training hall, Ashmere, individually selected levels, duels, boss teams and connected multiplayer do not create a local companion. Multiplayer retains its existing server-owned bot roster. The save format is unchanged: Finn starts fresh at the restored checkpoint and never overwrites the human's saved resources. His rig is disposed with the other actors, so chapter changes and reloads cannot accumulate extra companions.

## Shared gameplay

`js/companions.js` owns local creation, bot inputs, enemy target groups and the nameplate. `Game.allies()` supplies both local Players to movement/rendering and projectile collision. Finn reuses the existing pathfinder, combat rhythm, rare parries, varied dodges, jumps, flasks and executions. Following keeps the existing short stuck recovery; distance and height do not grant catch-up teleports.

Enemies can fight either living actor. They retain their target during an attack, use separate crowd clocks and surround their actual opponent. Culling considers the companion too. Each actor takes normal melee damage through `resolveCombat`; attack hit sets prevent repeated damage and friendly swings only target enemies. Projectiles hit the first actual body, with independent pass-through records for rolling/executing actors.

Both allies can wake zones, open shortcuts and trigger physical traps. Finn takes ordinary fall and rot damage, with independent hazard feedback clocks. When a boss's fog seals before he arrives, only Finn's input/physics receive the same entry allowance as an online ally. This does not open the gate for the human or enemies, let Finn leave a sealed fight, or bypass an ordinary progression gate.

A shared phase fix keeps both mid-bar changes and new boss bars deferred while an execution holds the boss; Finn and the human finish their critical animation before the phase can change.

Companion parry/dodge events name their owner. Personal stamina denial/refund indicators and camera responses remain attached to the human. Character poses, blade effects and shadows recognise both Player bodies across Low, High and Ultra. The solo Lands ending includes Finn in its credits.

## Validation

`node tests/companion-browser.cjs` exercises the real browser engine: all eight chapter spawns and cleanup, walking/fighting, enemy targeting, normal damage and one hit per swing, friendly safety, projectile interception/rolls, independent flasks and HUD feedback, deferred boss phase during Finn's execution, mortality, bonfire/death/Continue, automatic progression, fog entry, rot/traps, tutorial-to-campaign arrival, excluded modes, three graphics presets and the ending credit.

Regression checks include bot behavior/follow/integration, lobby continuity, multiplayer/campaign and boss-only, boss-team melee/projectile browser tests, the bot spectator browser, fullscreen, Auto, settings and the full solo browser suite.
