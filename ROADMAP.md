# Roadmap

## Context
Steps 1–5 of ROADMAP.md are done: the game is split into `js/` files, it supports gamepads, death is free, attack tokens are in, and roll-only, dash and tracking attacks exist on test enemies. Roadmap steps 6 (new enemies), 7 (height) and 8 (open areas with culling) all meet in one place: **Level 3**, a single level that combines an open courtyard with a tower climbed by **outer walkways**. It uses every mechanic so far, and it introduces the enemies and building blocks the later levels will reuse. Story comes later; names here are placeholders.

Your decisions:
- **Tower:** climbed by outer walkways.
- **Edges:** pits kill. High drops onto playable ground deal damage.
- **Length:** much longer than Level 2: about 15+ minutes, three bonfires and an optional side area.

Today's world is flat 2D. Rooms are rectangles at `y = 0`, walls and line of sight are 2D boxes (`roomWalls`, `segBox`, `gateBetween` in `js/helpers.js` and `js/character.js`), `integrateBody` lands on `y = 0`, and the camera clamps to one ceiling. Walkways over a courtyard need floors that **overlap in x/z at different heights**, so the core engine change is a 2.5D world.

---

## 1. Building blocks (all room-layout data, opt-in, checked at load)

| Block | Data | Behaviour |
|---|---|---|
| **Floor height** | room `y` (default 0), `height` (headroom, default `wallHeight`) | A room is now a box `rect × [y, y + height]`. Rooms may overlap in x/z if their height bands don't. |
| **Stairs / ramps** | `ramps: [{ id, rect, axis: 'x'\|'z', from, to, stairs: true }]` | The floor rises linearly along `axis`. Stairs render as steps but collide as a smooth slope. Both ends must meet rooms at matching heights. |
| **Edges** | room `edges: { n, s, e, w: 'wall' \| 'rail' \| 'open' }` (default `'wall'`) | `wall`: full wall. `rail`: knee-high parapet that blocks walking but not sight or the camera. `open`: no wall, so you can walk off. A shared edge with a room at the same height stays a doorway, as today. |
| **Drops** | (automatic) | Walking off an `open` edge, or off a higher room's edge onto a lower one, falls using the existing JUMP/FALL states. |
| **Pits** | `pits: [rect]`, or simply no floor below | Falling below `CONFIG.height.killDepth` under the lowest floor kills (`fell` event, YOU DIED). |
| **Fall damage** | `CONFIG.fall { safe, perMetre, lethal }` | Landing after a drop higher than `safe` (about 4 m) costs `(h - safe) * perMetre` HP. At `lethal` or more (about 14 m) you die. Jumps and stairs never trigger it. |
| **Open sky** | room `open: true` | No ceiling, and the camera ceiling lifts. The level's atmosphere `sky`, `silhouettes` and `grass` are drawn only over open rooms (reusing `addSky`, `addSilhouettes` and `grassMesh` in `js/visuals.js`). |
| **Shortcut gates** | zone-less gate `{ id, gate, opensFrom: rect }` | Opens for good when the player enters `opensFrom` (the far side), giving a way back down to an earlier bonfire. Emits `gateOpened`. |
| **Culling** (roadmap step 8) | `CONFIG.cull { maxLights, lightRange, enemyRange }` | A fixed pool of real point lights is reassigned each frame to the nearest light sources, so the light count never changes and shaders never recompile. Unaware enemies beyond range sleep (no update, rig hidden). Enemies that are fighting always run. |

**Engine changes behind these blocks**
- `world.groundAt(x, z, y)` returns the highest floor at or below `y + stepUp`, or `-Infinity` over a pit. `integrateBody` lands on it instead of 0. Landing reports the fall height.
- Solids get `y0` and `y1`. `pushOutOfBox` only collides when the body's height span overlaps, so you can walk over a lower room's wall tops and under walkways. `roomWalls` builds walls per height band and adds ledge faces where a higher room borders a lower one.
- Line of sight (`gateBetween`), lock-on (`findEnemies`) and the camera (`boomFit`) test solids in 3D. The camera ceiling comes from the room the camera is in (`open` means none).
- **Enemy edge sense:** enemies never step off an `open` edge or a drop higher than `stepDown`. They stop at the brink, which also keeps token circlers on walkways. They can still be **knocked** off (see the Shover), and they take the same fall damage and pit deaths.
- `validateRooms` checks, in 3D: rooms overlap only if their height bands are separate; ramp ends meet floors; the start, spawns and bonfires stand on a floor; every bonfire is reachable without a pit (at least, its spawn isn't over one).

## 2. New mechanics on attacks (opt-in fields)
- **Projectiles** (`projectile: { speed, gravity, size }` on an attack): the active phase fires a bolt instead of opening a hitbox.
  - It flies straight with a slight arc, and is stopped by solids and closed gates.
  - It can be blocked (front), rolled through and dodged. It can't be parried, which is the bow's weakness: close in on it.
  - It uses the same wind-up glow, a drawn bow. New `js/projectiles.js`, a pooled set like the particles. It hits through the existing `Player.takeHit`.
- **Shove** (`shove: true` plus a high `knock`): knockback ignores the usual cap, so a shove near an `open` edge sends you over. The wind-up is long and red, and a roll or block (with less knock) saves you.

## 3. New enemies (`js/data/enemies.js`, appear in the Enemies menu)
Each uses the humanoid rig, one break system, readable wind-ups, and has one clear counter. New registry entries: weapons `spear`, `greataxe`, `bow`; anims `thrust` (long forward lunge), `chop` (two-handed overhead), `spin` (360° sweep), `draw` (bow), `shove` (two-handed push).

| Enemy | Break | Attacks | Counter |
|---|---|---|---|
| **Ashen Lancer** (spear) | poise | dash thrust from mid range (`minRange` + `dash`); short jab; **roll-only charged thrust** | stay close, punish the jab |
| **Executioner** (greataxe, large) | stagger meter | slow **tracking** chop; **roll-only spin** | roll late through it, heavy hits to break |
| **Pale Duelist** (twin feel, fast) | poise, fragile | fast tracking 2-hit combo; dash cut | parry the combo |
| **Rampart Bowman** (bow, light) | poise | aimed shot (projectile), quick close-range kick | close the gap, block shots |
| **Shover** (bulky, shield) | shield guard | **shove** (big knockback), bash | keep away from edges, flank |

**Mini-boss, Bell Warden** (posture, big top bar), fought on the open bell platform at the top:
- a tracking sweep
- a roll-only overhead bell slam with a ground flash
- a shove that can throw you off the unrailed side
- a dash charge across the platform

## 4. Level 3 layout (one level, much longer)
A cliff-top keep. The courtyard sits at ground level, the tower rises on its far side, and the cliff edge beyond it is a pit.

1. **Gatehouse** (rooms, y 0, roofed): bonfire 1. A warm-up of 2 Hollows and 1 Lancer that teaches the dash.
2. **Open courtyard** (open sky, grass, ruins, about 50 × 40 m): the big crowd fight. It uses tokens: Hollows, 2 Lancers and a Duelist, with 2 Bowmen on the ramparts above, shooting down. The ramparts are reachable later.
3. **Rampart stairs** (stairs up the courtyard wall to y 6): a narrow railed walkway. A Shover on it holds the doorway. Railed parts of the ramparts give a view over the courtyard; unrailed gaps let you drop back (6 m, small fall damage).
4. **Tower hall** (roofed, y 6): the Executioner gated fight. Then **bonfire 2**, and a **shortcut gate** back down to the courtyard.
5. **Outer walkways** (open edges): three walkway rings around the outside of the tower at y 10, 14 and 18, joined by stair flights. The cliff side drops into a **pit** (death); the courtyard side drops onto the courtyard (heavy or lethal fall damage). Enemies: Bowmen on the corners, Shovers on narrow stretches, Lancers dashing along straight runs, and a Duelist pair on a wider landing (2 tokens). **Bonfire 3** is on the last landing.
6. **Bell platform** (open roof, y 22): the Bell Warden mini-boss. Railed on the courtyard side, open on the cliff side.
7. **Optional undercroft** (rooms, y −5, under the courtyard): reached by a drop through a broken grate in the courtyard (4 m, safe). A slumbering Executioner and a patrol of Hollows; stairs lead back up to the gatehouse. It's a side area with nothing gated.

Gated zones (all must open for LEVEL COMPLETE): gatehouse, courtyard, rampart, tower hall, walkway landing, bell platform. Level fields: `alert: true`, `attackTokens: 2`, atmosphere with a cold dusk sky, wind ash, grass in the courtyard and silhouettes.

## 5. Build order (each part verified, committed, then a pause for you to play)
0. **Save this plan as `ROADMAP.md`**, replacing the old roadmap (your request), and commit it. Then stop before part 1.
1. **2.5D world:** floor heights, height-banded walls, ramps and stairs, edges, drops, pits, fall damage, enemy edge sense, 3D line of sight and camera. Test Grounds: **Test: Heights** (terraces, a ramp, a railed and an open walkway over a pit and over the floor).
2. **Open rooms and culling:** `open` rooms with sky, grass and silhouettes; the light pool; enemy sleep. Test Grounds: **Test: Courtyard** (a big open area with 12 enemies, checked for frame rate).
3. **Projectiles, shove, shortcut gates.** Test duels: Bowman-style test enemy and Shover-style test enemy, on the Heights room.
4. **New enemies and the Bell Warden** (new weapons and anims). Duels in Enemies, plus a crowd room mixing them.
5. **Level 3** built from data in `js/levels/the-tower.js`, added to `LEVELS` after Level 2 (and Level 2's `next` points to it). Tuning pass for a full run of about 15 minutes.

Each part updates RULES.md (new blocks, mechanics and enemies) and README. ROADMAP.md is updated so that steps 6–8 are delivered by this level, and the old step 10 becomes "Levels 4–5 and final boss".

## Critical files
- Engine: `js/helpers.js` (`roomWalls`, `segBox`), `js/character.js` (`integrateBody`, `collideSolids`, `gateBetween`, `findEnemies`), `js/scene.js` (`buildRooms`, `makeWorld`), `js/game.js` (`boomFit`, `updateCamera`, `updateLevel`), `js/enemy.js` (movement edge sense), `js/player.js` (landing, fall damage), `js/validate.js` (`validateRooms`).
- Visuals: `js/visuals.js` (`dressStage`: sky, grass and silhouettes for open rooms; stairs and rail dressing; light pool).
- New: `js/projectiles.js`, `js/levels/the-tower.js`, `js/levels/test-heights.js`, `js/levels/test-courtyard.js`.
- Data: `js/data/enemies.js`, `js/registries.js` (weapons and anims), `js/config.js` (`height`, `fall`, `cull`, `projectile`).

## Verification (each part)
- `static` preview with `#dev`. Stepped simulations through `window.__arena` (manual clock, gamepad stubbed out), checking:
  - **Landing:** on floors at heights, climbing ramps, stopping at rails, falling off open edges, the fall-damage numbers, pit death and respawn.
  - **Enemies:** stop at edges, can be shoved off, and line of sight is blocked by floors.
  - **Camera:** stays under walkways.
  - **Frame time:** before and after culling on Test: Courtyard.
- Regression on every pass: the Tutorial, Level 1, Level 2, all duels, and the token crowd room. No console errors and no boot error.
- Screenshots of each new area. Level 3: a scripted walk through every zone (enemies killed by script), checking that each gate opens and the level completes, then a playthrough by you.
