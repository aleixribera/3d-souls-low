# Combat Arena 3D

A small Souls-like 3D action game that runs straight from one HTML file (Three.js from a CDN, no build step).

Keyboard and mouse, or a gamepad (standard Xbox-style layout). There are no touch controls. The game plays best with a gamepad: it opens on a short notice saying so, and any key, click or gamepad button carries on to the main menu (once per visit). The version shows in the bottom-right corner of the menus.

## Modes

- **Levels → Tutorial** — one room of training dummies that teaches every control, step by step. Block, parry and dodge come together, locked on to the dummy: the dodge dummy's swing glows blue, and blue strikes can only be rolled through (a hint says whether the roll came too early, too late or clear of the swing).
- **Levels → Level 1: The Long Hall** — four gated opponents in order, optional enemies in between, two bonfires.
- **Levels → Level 2: The Sunken Keep** — rooms joined by corridors, four room fights (two of them against pairs), the Shield Warden, two bonfires.
- **Levels → Level 3: The Burning Town** — the town below the Tower, sacked and set alight by the invaders, at sunset. About 10 minutes, climbing in terraces from the lower gate (where the Keep comes out) to the upper town gate, with a massive castle on the horizon ahead, the sun setting behind it. Street by street, each fight's barricade falls once it is won: a lone Ashen Lancer, the sacked market, a Lancer below with a Rampart Bowman on a balcony above (reached through the stair house), a Pale Duelist round a bend in an alley, the fountain square, and the church square under a Bowman on the church gallery. The Pillager Captain holds the upper square. Two bonfires (the second in the tavern), a shortcut stair from the fountain square down to the first, a sleeping Knight in a yard, and one drop that hurts.
- **Levels → Level 4: The Tower** — a cliff-top keep, about 15 minutes: a gatehouse, then a passage toward a bonfire glowing behind a portcullis, until its floor gives way into the undercroft: an ambush of two Hollows and an Executioner, whose gate opens on the stairs up to that bonfire. Then a crowd fight in an open courtyard under rampart archers, the ramparts, the Executioner in the tower hall, a postern shortcut, walkways spiralling up the outside of the tower over the courtyard and the cliff, and the Bell Warden on top. Four bonfires.
- **Enemies** — duel a single opponent in the arena, including the Ashen Lancer, Executioner, Pale Duelist, Rampart Bowman, Shover, the Pillager Captain and the Bell Warden.

## Characters (v4.1: Bone and Ash)

Every character is now a procedural model built in code (still no downloads): the player is a hooded wanderer with a swaying cape, a round shield on the back and a faded-red scarf; the enemies belong to four factions, each with its own silhouette and palette.

- **Hollowed** (hoods, rags, amber eyes): Hollow Soldier, Fast Rogue, Pale Duelist, Rampart Bowman.
- **Ironbound** (plate, mail, slate tabards, pale blue eyes): Undead Knight, Shield Warden, Shover, and the Bell Warden boss (a bronze colossus with a temple bell for a hammer).
- **Ashen Host** (soot mail, peaked hoods, ember eyes): Ashen Lancer, Executioner, and the Pillager Captain boss (horned helm, torn cloak, glowing halberd).
- **Old Bones**: the Giant Skeleton, with a cracked skull, one open side of ribs and a thigh-bone club.

Bodies breathe, shift their weight into wind-ups and strikes, flinch, buckle and break up into glowing ash when they die; cloaks, scarves and tabards sway; weapons glint as a strike begins. Gameplay is unchanged: hitboxes, timings and AI are exactly as before. The training dummies and the Test Grounds enemies keep the old plain bodies.

## Combat (v4.2: Weight of Steel)

Every attack now has four phases: wind-up, strike (the only moment it can hit), follow-through and recovery, drawn from whole-body key poses.

- **You:** a three-hit light combo; a heavy you can hold to charge (the body coils, trembles and glows at full charge, up to 1.5x damage); only a slight steer during a wind-up; a roll only cancels a swing in its recovery. One Souls-style input buffer: a press is kept only near the end of what you're doing, and the latest press wins.
- **Enemies:** they turn to track you early in a wind-up, then lock their aim (the commit point): dodge sideways after that and the blow won't follow. A blade glint marks the exact moment the parry window opens; blue strikes still can't be blocked or parried. Some enemies hold a wind-up still to bait a roll (delayed attacks). Combos end on their biggest wind-up, and big misses leave a punishable recovery. Bosses use larger, slower, more dramatic versions.
- **Impact:** hit-pause and a shudder on the body you hit, camera shake scaled by the blow, weapon trails during strikes, cloth that swings with the body, flinches sized to the damage, staggers and parries that throw the body open, and walking that leans with acceleration and turns.
- **Dev keys** (`#dev`): **F6** slow motion (25%), **F7** tracking colours (yellow = still turning, red = committed) and your attack phase; **H** hitboxes.

Timings before and after are in `docs/combat-timings-v4.1.md`.

## Coming next (planned)

- A story, an All Levels mode and title cards.
- Level 5 and the final boss, in the castle on the horizon.

## Controls

| Action | Keys | Gamepad (Xbox / PlayStation) |
|---|---|---|
| Move | W A S D / Arrow keys | Left stick (analog: tilt slightly to walk slowly) |
| Camera | Mouse (click the view to capture it) | Right stick |
| Jump (costs stamina) | Space | A / ✕ |
| Roll | Shift | B / ○ |
| Light attack | J / Left mouse | RB / R1 |
| Heavy attack | K / Right mouse | RT / R2 |
| Jump attack | Light or heavy while airborne | Light or heavy while airborne |
| Block (hold) | L / C | LB / L1 |
| Parry | E | LT / L2 |
| Lock-on | Q | Right stick click (R3) |
| Switch target | Tab (the nearest enemy in front, then the next further away) | Flick the right stick left or right |
| Zoom | Mouse wheel / = and - | D-pad up / down |
| Rest at bonfire | F | Y / △ |
| Use flask | G | X / □ |
| Restart fight / level | R, twice (once on the death or victory screen) | View / Share, twice |
| Pause and options (incl. Graphics: High / Low) | Escape | Menu / Options |
| Help / hitboxes | F1 (H toggles hitboxes) | — |
| Menus | Arrows or W/S, Enter, Escape | D-pad or left stick, A / ✕, B / ○ |

On-screen prompts show keys or gamepad buttons, whichever you used last.

! IMPORTANT ! More controls and features exist, this list was only used for the prototyping versions of the game

## Testing

Open the page with `#dev` at the end of the address (`combat-arena-3d.html#dev`). That adds the Test Grounds menu (developer rooms and test duels) and loads the automated tests. In the browser console (F12), run:

```js
await __arena.tests.run()
```

It plays the real game with a manual clock (scripted movement, no rendering delay) and prints `N/N passed`. `__arena.tests.run('heights')` runs only the tests whose name contains a word.

Developer viewers (open with `#dev`): **F8** shows the texture library, **F9** the model lab (four views and a silhouette test; step through each attack and reaction; toggle the `elite` variant). From the console: `MODELLAB.open('ironKnight')`.

## Adding content

The game data lives in `js/data/` and `js/levels/` and is checked when the page loads; a broken reference shows a readable error instead of starting.

- **Enemies:** add an entry with a unique `id` to `ENEMY_DEFS` (any position). Animations, weapons and idle styles must exist in `ANIMS`, `WEAPONS` and `IDLE_STYLES`. Attacks get their look from `pose` (key poses in `js/data/attack-poses.js`) plus `tracking`, glint `markers` and optional `hold`: see CLAUDE.md.
- **Models:** give an enemy `model: '<id>'` and describe its look in `js/data/models*.js` (proportions, posture, material slots, parts from `KIT_PARTS`, a weapon from `KIT_WEAPONS`; a model can `extends` another). Textures are recipes in `js/data/textures.js`. A level placement can add `variant: 'elite'` for a darker, spiked, auraed version. See CLAUDE.md.
- **Sounds:** every sound is a recipe of noise and tone layers in `js/data/audio.js`, built live by the engine in `js/audio.js` (no audio files). Add a recipe, then play it from an event listener at the bottom of `js/audio.js`. Sound volume is in Options.
- **Levels:** add a file to `js/levels/`, list it in `GAME_FILES` in `combat-arena-3d.html`, and add the level to `LEVELS` in `js/data/levels.js`. Zones, alcoves and enemies refer to each other by id. Room levels can add houses, props (kinds in `js/data/props.js`) and barricade gates; see CLAUDE.md.
- **Items:** add to `ITEMS` and to `PLAYER_DEF.inventory`.
