# Game Rules

How the systems of the game behave. Read this before adding mechanics, enemies or levels.

## Files

- `combat-arena-3d.html` is the page you open. It holds the styles, the HUD and menus, and a tiny loader: it imports Three.js r160, then loads the game files from `js/` in the order listed in `GAME_FILES`.
- The game files are classic scripts that share one global scope. A file may only use, while it loads, what earlier files define (inside functions, anything goes).
- Data lives in `js/data/` (player, items, enemies, shared looks) and `js/levels/` (one file per level). `js/data/levels.js` sets the Levels menu order.
- A new file must be added to `GAME_FILES`, after everything it needs at load.
- **Test Grounds:** opening the page with `#dev` at the end of its address adds a Test Grounds menu with developer rooms (`TEST_LEVELS` in `js/data/levels.js`) for trying out mechanics. They are checked at load like every level.
- **Tests:** with `#dev` the page also loads `tests/suite.js`: stepped simulations of the real game (manual clock, gamepad ignored, scripted movement). Run them from the browser console with `await __arena.tests.run()`, or `run('heights')` for the tests whose name contains a word. Run them before every commit, and add tests for each new mechanic.
- `js/terrain.js` turns a room level's rooms and ramps into floors at heights, and builds its walls, rails, ledge faces, floors and roofs from them (see Heights below).

## Golden rules

1. **Content is data.** Enemies, levels, items and attacks are plain data in `js/data/` and `js/levels/`. Add content by adding data, not by writing special cases in the game logic.
2. **Everything is referenced by id**, never by list position.
3. **Data is checked at load.** A broken reference stops the game with a readable error. When you add a new kind of data, add a check for it.
4. **Tuning numbers live in CONFIG or the data entry**, never scattered through the logic.
5. **New behaviour must be opt-in.** A new mechanic is switched on by a field in the data, so existing levels and enemies keep playing exactly the same.
6. **Things announce what happened through events** (strike, parry, death, rest, gate opened, alert…). Effects and the tutorial listen; they don't reach into combat code.

## Time

- The game runs in fixed steps of 1/60 s. Rendering smooths between steps.
- Hit-pause briefly freezes both sides on impact. Bigger hits pause longer.
- Inputs are remembered for a short time (buffer), so a press slightly early still counts.

## Input

- **Keyboard and mouse, or a gamepad.** Every action is a list of codes in `ACTIONS`: keys, mouse buttons and gamepad buttons (`PadRB`…). Gamepad buttons go through the same buffer as keys.
- **Gamepad layout** (Souls standard, Xbox / PlayStation names): RB / R1 light, RT / R2 heavy, LB / L1 block, LT / L2 parry, B / ○ roll, A / ✕ jump, right stick click lock-on, right stick flick switch target, X / □ flask, Y / △ rest, Menu / Options pause, View / Share restart, D-pad up/down zoom. Prompts show both names.
- The left stick is analog: a slight tilt walks slowly. Keys always move at full speed.
- The right stick turns the camera (same sensitivity and invert options as the mouse). While locked on, a flick to one side switches to the nearest target on that side of the screen; holding the stick does not keep switching. Tab still cycles through targets.
- Menus work with the D-pad or left stick, A to confirm and B to go back.
- Prompts, the help panel and menu hints name the keys or buttons of the device used last.

## Combat

- **Attacks** have three phases: wind-up, active (the hitbox exists), recovery. An attack can have several strikes in a row.
- **Hitboxes** are boxes in front of the attacker. **Bodies** are upright cylinders. A hit lands when they overlap. Each strike hits each target once.
- **Wind-ups glow red** so the player can read them.
- **Optional attack mechanics** (fields on an enemy attack, checked at load):
  - *Roll-only* (`rollOnly: true`): cannot be blocked or parried, only dodged. Its wind-up glows cold blue instead of red, and a faint blue ring flashes on the ground under the enemy as it starts (`perilous` event).
  - *Gap closer* (`minRange` + `dash: { speed, from }`): picked only when the player is between `minRange` and `range`. From `from` (a fraction of the wind-up) the enemy rushes forward at `speed` until the strike would reach, then strikes. It does not turn while rushing unless it also tracks, so a late sidestep beats it.
  - *Tracking* (`track: rate`): the enemy keeps turning toward the player at `rate` through the whole wind-up and the swing, instead of locking its aim part way through. Roll through it or away late.
  - An enemy picks a random attack that suits the distance; gap closers only at mid range, the rest at any range (it walks in).
  - Test enemies for each mechanic (`TEST_DEFS`, `js/data/test-enemies.js`) are duels in the `#dev` Test Grounds.
- **Nothing hits, sees or locks on through a closed gate.** In room levels, walls, pillars, ledges, floors and roofs block too, in 3D (eye to eye): you can see someone on a walkway across an open yard, but not through the walkway's floor from right underneath it. Rails never block sight.
- **Order each step:** parry first, then the player's hits, then enemy hits.

## Player

- **Stamina** pays for attacks, rolls, jumps and blocked hits. It regenerates after a short pause.
- **Roll** gives brief invulnerability at its start. It is available whenever the stamina bar isn't empty (it drains what's left), but a roll that empties the bar leaves the player winded: no more rolls until stamina refills to a full roll's cost. A roll pressed while busy is remembered for a moment and comes out as soon as rolling is allowed: from an attack's recovery, from a jump attack's landing once the impact is over, on landing from a jump, after a missed parry, or after being hit or staggered. If a queued roll can't happen at that moment (no stamina, or winded), it is dropped rather than coming out later. Rolling straight out of a block is always allowed. A roll pressed near the end of a roll chains into the next one; presses earlier in the roll are ignored, so mashing never queues extra rolls.
- **Block** works only against hits from the front. It cuts damage but costs stamina; running out breaks the guard and staggers the player.
- **Parry** works in a short window just before an enemy strike lands. Success leaves the enemy open and makes the next attack a stronger riposte.
- **Jump attacks** strike on landing, then have a short recovery.
- **Poise**: hits reduce it; at zero the player staggers. A swing already in its active phase is never interrupted.
- **Flasks** heal over time, and refill at bonfires and on death.
- **Falling:** walking (or being knocked) off an open edge or a higher floor drops you into the fall state; you can still steer a little and attack on the way down. Landing more than `CONFIG.fall.safe` (4.5 m) below the highest point of the fall costs `(h - safe) * perMetre` HP and a short stumble (`fallDamage` event); `lethal` (14 m) or more kills. A plain jump never reaches `safe`, and stairs and ramps never count as falls. Falling into a pit (no floor below) is death once you drop `CONFIG.height.killDepth` below the level's lowest floor (`fell` event).

## Enemies

- Every enemy is built from the same humanoid parts, changed by scale, colour, weapon and off-hand.
- **Basic loop:** notice the player → chase → pick an attack → wind up → strike → recover → cooldown.
- **Attack tokens:** only a few enemies attack at once (2 unless the level sets `attackTokens`). An enemy needs a token to pick an attack. The others circle the player out of reach, spread over the player's sides and back, facing the player. A token is given back when its attack ends, or when its holder is flinched, staggered, parried, broken or gives up the chase. Free tokens go first to enemies that have waited longest, then to the closest, and an enemy that has waited can take the token of a holder that is still far away. Numbers live in `CONFIG.tokens`; the logic in `js/tokens.js`. A lone enemy (any duel) always holds a token.
- **Behaviours** decide how an enemy starts and what it returns to:
  - *gated*: stands at its post.
  - *patrol*: walks a short path.
  - *ambush*: hides in an alcove and leaps out.
  - *slumber*: lies on the floor and rises when the player comes near.
- Each behaviour has its own **notice range**. Enemies give up and walk home if the player gets too far away, they are dragged too far from home, or they lose sight of the player.
- **Heights:** an enemy only comes for a player within `CONFIG.height.reach` (2.5 m) of its own height. If the player is above or below (on a walkway, down a drop), it walks to the brink and waits there facing them, and gives up after `giveUp` seconds. It never takes an attack token while it can't reach.
- **Edges:** enemies never walk, dash or lunge off an open edge or a drop deeper than `stepDown`; they stop at the brink and slide along it, which also keeps circling enemies on a walkway. Knockback is not stopped: an enemy can be knocked off, and it takes the same fall damage and pit deaths as the player.
- **How enemies break.** Every enemy uses exactly one of these:
  - *Poise* (default): hits drain a hidden poise value. Small hits make the enemy flinch; at zero it staggers.
  - *Posture* (bosses, e.g. Giant Skeleton): hits never interrupt it. Every landed hit fills a visible posture bar, and hits chained close together fill it faster. It drains only after a pause without hits. Full means it kneels, open, and takes extra damage.
  - *Stagger meter* (e.g. Undead Knight): hits never interrupt it. Each hit fills a visible meter (heavy hits fill more); full means it kneels, open. The meter drains if left alone.
  - *Shield guard* (e.g. Shield Warden): works like the stagger meter (every hit fills a visible meter; full means the guard breaks and it kneels, open). On top of that, its raised shield cuts damage from hits to the front, and those blocked hits fill the meter much less. The shield is lowered while it attacks and in the last step before a swing. Hits from the side or behind, and ripostes after a parry, do full damage.
- **Visible over enemies:** non-boss enemies show a small health bar over their head once they're fighting or hurt, with the stagger/guard meter under it when they have one. Bosses use the big bar at the top of the screen instead.

## Levels

- **Two layouts:**
  - *Hall*: a straight corridor along one axis, with gates across it and alcoves on the sides. Always flat.
  - *Rooms*: rectangles that touch edge to edge. Walls are generated around them automatically, and a shared edge is an open doorway. Rooms can sit at different heights (see Heights).
- **Heights** (room levels, `js/terrain.js`; every field is optional, so flat levels stay exactly as they were):
  - A room is a box: `rect` times [`y`, `y + height`] (`y` defaults to 0, `height` to the level's `wallHeight`). Rooms may overlap in x/z only if their height bands are separate (a walkway's floor slab above the yard's top), so you can walk under walkways and over lower walls.
  - **Ramps and stairs:** `ramps: [{ id, rect, axis: 'x' | 'z', from, to, stairs }]`. The floor rises in a straight line along `axis`, from `from` at the west (or south) end to `to`. Stairs are drawn as steps but walk like the slope. Both ends must meet a room (or ramp) at the matching height, and a ramp rises at most `maxSlope` per metre. Ramps have no roof.
  - **Edges:** each side of a room or ramp (`edges: { n, s, e, w }`, n = +z, e = +x) is `wall` (the default), `rail` (a parapet `CONFIG.height.rail` high: it stops walking and jumping, not sight or the camera) or `open` (you can walk off it). Where another region touches a side at the same floor height it is a doorway, as before; where a lower region touches it, a ledge face fills the drop below the floor, so it can't be walked into from below.
  - **Steps:** a body on the ground walks up onto anything within `stepUp` of its feet, and follows floors that drop by at most `stepDown` per step (stairs, ramps). Anything bigger is a ledge or a fall.
  - **Pits:** `pits: [rect]` on a room are holes in its floor. Below a hole (or past an open edge) is whatever floor lies beneath, or nothing: a pit.
  - **Open rooms:** `open: true` has no roof; the camera can rise freely over it. A room level with at least one open room shows its atmosphere's `sky` and distant ruins (`silhouettes`, placed around the whole level), and `grass` grows on open rooms that set `grass: true`.
  - **Lamps:** `lamps: [[x, z]]` on a room are braziers whose fire really lights the room around them (`braziers` are flames only).
  - **Blocks:** `blocks: [{ rect, y0, y1 }]` on the level are solid masses (a tower's core) that are not rooms.
  - **Placements** (start, bonfires and their spawns, zone spawns, patrols, slumberers) stand on the top-most floor under them, or on the highest one at or below their optional `y`. All are checked at load: on a floor, not over a pit.
- **Culling** (opt-in, a level's `cull: true`; numbers in `CONFIG.cull`): every light the level builds is only a source; a fixed pool of `maxLights` real lights follows the sources nearest the player each frame, each fading out before it is dropped, so the light count never changes and shaders never recompile. Unaware enemies (idle, patrolling, going home, slumbering) more than `enemyRange` m away sleep: no update, not drawn, until the player comes near or an alert wakes them. Enemies that are fighting, reeling or dying always run. Levels without `cull` keep every light and never sleep anyone.
- **Gated zones:** each zone has one or more enemies and a gate. The gate opens only when all of the zone's enemies are dead. The level is complete when every gate is open.
- Zone enemies stand at their posts from the start, so the player can see them coming.
- **Optional enemies** (patrol, ambush, slumber) can be placed between zones.
- **Bonfires** heal, refill flasks and set the respawn point. Resting brings back every enemy except those whose gates are already open. You cannot rest while an enemy is closing in.
- **Death:** the world slows, YOU DIED shows, and the player returns to the last bonfire with full health and full flasks. Dying costs nothing but the ground covered since that bonfire: there are no souls, stats or saves. Enemies reset exactly as when resting: every enemy comes back at full health except those whose gates are already open.
- **Alert** (opt-in per level): an enemy that notices the player wakes unaware enemies nearby, if nothing blocks the line between them. Those wake others in turn.
- **Next level** (opt-in): a level can name the level that follows. Completing it fades straight into that level.
- **Atmosphere:** each level can set its own fog, light and colours. Optional look fields (all checked at load) add exposure, a sky/ground fill (`hemi`), a colour grade, ash and dust amounts, moss and grime, light shafts, banner colours, falling debris, and for open levels a sky, distant silhouettes and grass. Enemies can set an optional `visual` (skin colour, metalness, bare arms, rim).

## Visuals

- Rendering lives in its own file (`js/visuals.js`) with its numbers in `CONFIG.VISUALS`. It only draws: it reacts to events (strike, death, rest, gate opened) and never changes combat, AI, collision or layouts. Dressing (rubble, arches, banners) has no collision.
- **Graphics: High / Low** (pause → Options). High adds bloom, colour grade, vignette (redder at low health), grain and light shafts. Low skips post-processing and thins the particles.
- The red wind-up glow is never dimmed: it has its own halo that ignores fog, and the colour grade leaves strong reds saturated.
- **Lock-on:** when the locked target dies, the lock moves to the next enemy in reach (the one nearest the centre of the screen), if there is one.
- **Camera:** follows behind the player and is pushed in so it never passes through walls, ledges, floors, roofs or closed gates (in 3D; it looks over rails). It follows the floor you stand on up stairs and down drops, but a jump lifts it only half as much. Its ceiling is whatever is overhead where the camera is: a room's roof, a walkway's underside, or nothing under open sky. Locking on frames both the player and the target.

## Coming with Level 3 (planned, see ROADMAPv3.md)

Not built yet. These rules apply once each part lands; until then the sections above describe the game.

- **Shortcut gates:** a gate with `opensFrom` opens for good when the player reaches that area (the far side), linking back to an earlier bonfire.
- **Projectiles** (`projectile` on an attack): bows fire bolts that fly with a slight arc, are stopped by walls and closed gates, can be blocked from the front or rolled through, and cannot be parried.
- **Shove** (`shove: true`): a long red wind-up and big knockback that can push you off an open edge. Roll, or block to take less push.
- **New enemies:** Ashen Lancer (spear: dash thrust, roll-only charged thrust), Executioner (greataxe: tracking chop, roll-only spin; stagger meter), Pale Duelist (fast tracking combo, dash cut), Rampart Bowman (bow, kick), Shover (shield, shove). Mini-boss: Bell Warden (posture; tracking sweep, roll-only bell slam, shove, dash charge).

## Adding things — checklist

- **New enemy:** add an entry with a unique id, stats, attacks (wind-up/active/recovery, damage, poise, hitbox, range), a look, and at most one break system. It appears in the Enemies menu automatically. Make sure it is fair: its attacks should be readable, and at least one approach (flanking, parrying, heavy hits) should beat it.
- **New level:** pick a layout, add rooms or hall size, a start point, bonfires (the respawn point must not be inside a zone), zones with gates, and optional enemies. Add it to the levels list and it appears in the Levels menu. With heights, check every drop: enemies won't follow you down, and a gated enemy knocked somewhere out of reach must still be killable.
- **New mechanic:** add its numbers to CONFIG or the data, make it opt-in, announce it with an event if others should react, extend the load-time checks, add tests to `tests/suite.js`, and check with `await __arena.tests.run()` (page opened with `#dev`) that Level 1, Level 2 and every arena duel still play the same.
