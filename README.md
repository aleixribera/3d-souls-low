# Combat Arena 3D

A small Souls-like 3D action game in a single HTML file (Three.js from a CDN, no build step).

! IMPORTANT ! More controls and features exist, this list was only used for the first version of the game

## Play

- **Online:** open the GitHub Pages link for this repo (Settings → Pages).
- **Locally:** download `combat-arena-3d.html` and open it in a browser. It needs internet access once to load Three.js.

Keyboard and mouse only; there are no touch controls.

## Modes

- **Levels → Tutorial** — one room of training dummies that teaches every control, step by step.
- **Levels → Level 1: The Long Hall** — four gated opponents in order, optional enemies in between, two bonfires.
- **Levels → Level 2: The Sunken Keep** — rooms joined by corridors, four room fights (two of them against pairs), the Shield Warden, two bonfires.
- **Enemies** — duel a single opponent in the arena.

## Controls

| Action | Keys |
|---|---|
| Move | W A S D / Arrow keys |
| Camera | Mouse (click the view to capture it) |
| Jump (costs stamina) | Space |
| Roll | Shift |
| Light attack | J / Left mouse |
| Heavy attack | K / Right mouse |
| Jump attack | Light or heavy while airborne |
| Block (hold) | L / Ctrl |
| Parry | E |
| Lock-on / switch target | Q / Tab |
| Zoom | Mouse wheel / = and - |
| Rest at bonfire | F |
| Use flask | G |
| Restart fight / level | R, twice (once on the death or victory screen) |
| Pause and options (incl. Graphics: High / Low) | Escape |
| Help / hitboxes | F1 (H toggles hitboxes) |

! IMPORTANT ! More controls and features exist, this list was only used for the first version of the game

## Adding content

The game data sits at the top of the script and is checked when the page loads; a broken reference shows a readable error instead of starting.

- **Enemies:** add an entry with a unique `id` to `ENEMY_DEFS` (any position). Animations, weapons and idle styles must exist in `ANIMS`, `WEAPONS` and `IDLE_STYLES`.
- **Levels:** add a level object to `LEVELS`. Zones, alcoves and enemies refer to each other by id.
- **Items:** add to `ITEMS` and to `PLAYER_DEF.inventory`.
