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

## Coming next (planned)

- Texture Update
- Sound Effects Update
- Animations Update
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

## Adding content

The game data lives in `js/data/` and `js/levels/` and is checked when the page loads; a broken reference shows a readable error instead of starting.

- **Enemies:** add an entry with a unique `id` to `ENEMY_DEFS` (any position). Animations, weapons and idle styles must exist in `ANIMS`, `WEAPONS` and `IDLE_STYLES`.
- **Levels:** add a file to `js/levels/`, list it in `GAME_FILES` in `combat-arena-3d.html`, and add the level to `LEVELS` in `js/data/levels.js`. Zones, alcoves and enemies refer to each other by id. Room levels can add houses, props (kinds in `js/data/props.js`) and barricade gates; see CLAUDE.md.
- **Items:** add to `ITEMS` and to `PLAYER_DEF.inventory`.
