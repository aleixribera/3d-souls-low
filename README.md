# Combat Arena 3D

A small Souls-like 3D action game that runs straight from one HTML file (Three.js from a CDN, no build step).

! IMPORTANT ! More controls and features exist, this list was only used for the first version of the game

## Play

- **Online:** open the GitHub Pages link for this repo (Settings → Pages).
- **Locally:** download the repository (the HTML file together with the `js` folder) and double-click `combat-arena-3d.html`. It needs internet access once to load Three.js.

Keyboard and mouse, or a gamepad (standard Xbox-style layout). There are no touch controls.

## Modes

- **Levels → Tutorial** — one room of training dummies that teaches every control, step by step.
- **Levels → Level 1: The Long Hall** — four gated opponents in order, optional enemies in between, two bonfires.
- **Levels → Level 2: The Sunken Keep** — rooms joined by corridors, four room fights (two of them against pairs), the Shield Warden, two bonfires.
- **Levels → Level 3: The Tower** — a cliff-top keep, about 15 minutes: a gatehouse, a crowd fight in an open courtyard under rampart archers, the ramparts, the Executioner in the tower hall, a postern shortcut, walkways spiralling up the outside of the tower over the courtyard and the cliff, and the Bell Warden on top. Three bonfires; an optional undercroft below the courtyard (drop through the broken grate).
- **Enemies** — duel a single opponent in the arena, including the Tower's Ashen Lancer, Executioner, Pale Duelist, Rampart Bowman, Shover and the Bell Warden.

## Coming next (planned)

- A story, an All Levels mode and title cards.
- Levels 4 and 5, and a final boss.

See [ROADMAPv3.md](ROADMAPv3.md) for the Level 3 plan and how it was delivered.

## Versions

Each version is a tagged commit (`git checkout v3.1` to play that one).

- **v3.1 — Heights.** Room levels gain a 2.5D world: floors at heights, ramps and stairs, walls, rails and open edges, ledges you can drop from but not climb, pits, and fall damage (drops over 4.5 m hurt, 14 m kills). Enemies stop at edges and won't chase you up or down, but can be knocked off. Sight, lock-on and the camera work in 3D (the camera stays under walkways). New developer room *Test: Heights* and an automated test suite (see Testing).
- **v3.2 — Open sky and culling.** Open rooms show the level's sky and distant ruins, and grass grows on open courtyards; lamps are braziers that really light a room. Levels can opt into culling: a fixed pool of real lights follows the nearest light sources (no shader recompiles however many lights a level has), and far, unaware enemies sleep until you come near. New developer room *Test: Courtyard* (twelve enemies, eighteen light sources; culling takes it from 18 real lights to 8).
- **v3.3 — Bows, shoves and shortcuts.** Enemies can fire arrows: bolts fly with a slight arc, stop at walls and gates, can be blocked or rolled through but never parried, and archers shoot without waiting for an attack token. A shove ignores the knockback cap and can throw you off a ledge (block or roll). Shortcut gates open for good from their far side. Test duels *Test: Bowman* and *Test: Shover* are fought on Test: Heights; Test: Courtyard gains a shortcut.
- **v3.4 — The Tower's enemies, and a sturdier knight.** Six new enemies in the Enemies menu: Ashen Lancer (spear), Executioner (greataxe), Pale Duelist (sword and dagger), Rampart Bowman, Shover and the Bell Warden mini-boss, with new weapons and animations (thrust, chop, spin). Sentries: lookouts that see far and belong to no zone. New developer room *Test: Mixed Crowd*. The player now has 1.2x health (120), 1.6x stamina (160), and a slightly lighter heavy attack (44 to 38 damage).
- **v3.5 — Level 3: The Tower.** The new level, after Level 2 (finishing Level 2 carries straight on into it): gatehouse, open courtyard, ramparts, tower hall, three walkway levels round the outside of the tower, and the Bell Warden on the bell platform; three bonfires, a postern shortcut and an optional undercroft. It uses every v3 building block: heights and falls, open sky, culling, archers, shoves and shortcut gates.

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
| Block (hold) | L / Ctrl | LB / L1 |
| Parry | E | LT / L2 |
| Lock-on | Q | Right stick click (R3) |
| Switch target | Tab | Flick the right stick left or right |
| Zoom | Mouse wheel / = and - | D-pad up / down |
| Rest at bonfire | F | Y / △ |
| Use flask | G | X / □ |
| Restart fight / level | R, twice (once on the death or victory screen) | View / Share, twice |
| Pause and options (incl. Graphics: High / Low) | Escape | Menu / Options |
| Help / hitboxes | F1 (H toggles hitboxes) | — |
| Menus | Arrows or W/S, Enter, Escape | D-pad or left stick, A / ✕, B / ○ |

On-screen prompts show keys or gamepad buttons, whichever you used last.

! IMPORTANT ! More controls and features exist, this list was only used for the first version of the game

## Testing

Open the page with `#dev` at the end of the address (`combat-arena-3d.html#dev`). That adds the Test Grounds menu (developer rooms and test duels) and loads the automated tests. In the browser console (F12), run:

```js
await __arena.tests.run()
```

It plays the real game with a manual clock (scripted movement, no rendering delay) and prints `N/N passed`. `__arena.tests.run('heights')` runs only the tests whose name contains a word.

## Adding content

The game data lives in `js/data/` and `js/levels/` and is checked when the page loads; a broken reference shows a readable error instead of starting.

- **Enemies:** add an entry with a unique `id` to `ENEMY_DEFS` (any position). Animations, weapons and idle styles must exist in `ANIMS`, `WEAPONS` and `IDLE_STYLES`.
- **Levels:** add a file to `js/levels/`, list it in `GAME_FILES` in `combat-arena-3d.html`, and add the level to `LEVELS` in `js/data/levels.js`. Zones, alcoves and enemies refer to each other by id.
- **Items:** add to `ITEMS` and to `PLAYER_DEF.inventory`.
