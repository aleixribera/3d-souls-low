# Game Rules

How the systems of the game behave. Read this before adding mechanics, enemies or levels.

## Files

- `combat-arena-3d.html` is the page you open. It holds the styles, the HUD and menus, and a tiny loader: it imports Three.js r160, then loads the game files from `js/` in the order listed in `GAME_FILES`.
- The game files are classic scripts that share one global scope. A file may only use, while it loads, what earlier files define (inside functions, anything goes).
- Data lives in `js/data/` (player, items, enemies, shared looks) and `js/levels/` (one file per level). `js/data/levels.js` sets the Levels menu order.
- A new file must be added to `GAME_FILES`, after everything it needs at load.

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
- **Gamepad layout** (Souls standard): RB light, RT heavy, LB block, LT parry, B roll, A jump, right stick click lock-on, right stick flick switch target, X flask, Y rest, Start pause, Back restart, D-pad up/down zoom.
- The left stick is analog: a slight tilt walks slowly. Keys always move at full speed.
- The right stick turns the camera (same sensitivity and invert options as the mouse). While locked on, a flick to one side switches to the nearest target on that side of the screen; holding the stick does not keep switching. Tab still cycles through targets.
- Menus work with the D-pad or left stick, A to confirm and B to go back.
- Prompts, the help panel and menu hints name the keys or buttons of the device used last.

## Combat

- **Attacks** have three phases: wind-up, active (the hitbox exists), recovery. An attack can have several strikes in a row.
- **Hitboxes** are boxes in front of the attacker. **Bodies** are upright cylinders. A hit lands when they overlap. Each strike hits each target once.
- **Wind-ups glow red** so the player can read them.
- **Nothing hits, sees or locks on through a closed gate.** In room levels, walls and pillars block too.
- **Order each step:** parry first, then the player's hits, then enemy hits.

## Player

- **Stamina** pays for attacks, rolls, jumps and blocked hits. It regenerates after a short pause.
- **Roll** gives brief invulnerability at its start. It is available whenever the stamina bar isn't empty (it drains what's left), but a roll that empties the bar leaves the player winded: no more rolls until stamina refills to a full roll's cost. A roll pressed while busy is remembered for a moment and comes out as soon as rolling is allowed: from an attack's recovery, from a jump attack's landing once the impact is over, on landing from a jump, after a missed parry, or after being hit or staggered. If a queued roll can't happen at that moment (no stamina, or winded), it is dropped rather than coming out later. Rolling straight out of a block is always allowed. A roll pressed near the end of a roll chains into the next one; presses earlier in the roll are ignored, so mashing never queues extra rolls.
- **Block** works only against hits from the front. It cuts damage but costs stamina; running out breaks the guard and staggers the player.
- **Parry** works in a short window just before an enemy strike lands. Success leaves the enemy open and makes the next attack a stronger riposte.
- **Jump attacks** strike on landing, then have a short recovery.
- **Poise**: hits reduce it; at zero the player staggers. A swing already in its active phase is never interrupted.
- **Flasks** heal over time, and refill at bonfires and on death.

## Enemies

- Every enemy is built from the same humanoid parts, changed by scale, colour, weapon and off-hand.
- **Basic loop:** notice the player → chase → pick an attack → wind up → strike → recover → cooldown.
- **Behaviours** decide how an enemy starts and what it returns to:
  - *gated*: stands at its post.
  - *patrol*: walks a short path.
  - *ambush*: hides in an alcove and leaps out.
  - *slumber*: lies on the floor and rises when the player comes near.
- Each behaviour has its own **notice range**. Enemies give up and walk home if the player gets too far away, they are dragged too far from home, or they lose sight of the player.
- **How enemies break.** Every enemy uses exactly one of these:
  - *Poise* (default): hits drain a hidden poise value. Small hits make the enemy flinch; at zero it staggers.
  - *Posture* (bosses, e.g. Giant Skeleton): hits never interrupt it. Only hits chained close together fill a visible posture bar; full means it kneels, open, and takes extra damage.
  - *Stagger meter* (e.g. Undead Knight): hits never interrupt it. Each hit fills a visible meter (heavy hits fill more); full means it kneels, open. The meter drains if left alone.
  - *Shield guard* (e.g. Shield Warden): works like the stagger meter (every hit fills a visible meter; full means the guard breaks and it kneels, open). On top of that, its raised shield cuts damage from hits to the front, and those blocked hits fill the meter much less. The shield is lowered while it attacks and in the last step before a swing. Hits from the side or behind, and ripostes after a parry, do full damage.
- **Visible over enemies:** non-boss enemies show a small health bar over their head once they're fighting or hurt, with the stagger/guard meter under it when they have one. Bosses use the big bar at the top of the screen instead.

## Levels

- **Two layouts:**
  - *Hall*: a straight corridor along one axis, with gates across it and alcoves on the sides.
  - *Rooms*: rectangles that touch edge to edge. Walls are generated around them automatically, and a shared edge is an open doorway.
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
- **Camera:** follows behind the player and is pushed in so it never passes through walls or closed gates. Locking on frames both the player and the target.

## Adding things — checklist

- **New enemy:** add an entry with a unique id, stats, attacks (wind-up/active/recovery, damage, poise, hitbox, range), a look, and at most one break system. It appears in the Enemies menu automatically. Make sure it is fair: its attacks should be readable, and at least one approach (flanking, parrying, heavy hits) should beat it.
- **New level:** pick a layout, add rooms or hall size, a start point, bonfires (the respawn point must not be inside a zone), zones with gates, and optional enemies. Add it to the levels list and it appears in the Levels menu.
- **New mechanic:** add its numbers to CONFIG or the data, make it opt-in, announce it with an event if others should react, extend the load-time checks, and verify that Level 1, Level 2 and every arena duel still play the same.
