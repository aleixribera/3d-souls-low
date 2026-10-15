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
- **Enemies** — duel a single opponent in the arena.

## Coming next (planned)

- **Level 3: The Tower** — a cliff-top keep, much longer than Level 2 (about 15+ minutes, three bonfires): a gatehouse, a big open courtyard fight under the sky, railed ramparts, a tower hall with a shortcut back down, outer walkways around the tower above a deadly cliff, and a mini-boss on the open bell platform. Optional undercroft below the courtyard.
- **New enemies:** Ashen Lancer, Executioner, Pale Duelist, Rampart Bowman (arrows), Shover (pushes you off edges), and the Bell Warden mini-boss.

See [ROADMAPv3.md](ROADMAPv3.md) for the full plan and what is done.

## Versions

Each version is a tagged commit (`git checkout v3.1` to play that one).

- **v3.1 — Heights.** Room levels gain a 2.5D world: floors at heights, ramps and stairs, walls, rails and open edges, ledges you can drop from but not climb, pits, and fall damage (drops over 4.5 m hurt, 14 m kills). Enemies stop at edges and won't chase you up or down, but can be knocked off. Sight, lock-on and the camera work in 3D (the camera stays under walkways). New developer room *Test: Heights* and an automated test suite (see Testing).

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
