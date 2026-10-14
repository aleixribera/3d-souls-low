# Combat Arena 3D — Code Audit

- **File audited:** `combat-arena-3d.html` — the whole game is this one file (2,234 lines: CSS, HTML and one JavaScript module).
- **Date:** 2026-10-14. **No code was changed.**
- **Line references** (an "L" followed by a line number) match this exact version. After any edit they drift, so search for the named function or object instead.
- **For planning:** §1 is the summary and §9 the suggested order of work. §3–§7 have the line numbers a coding step needs.

---

## 1. The short version

- **It's well organized for a single-file game.** Most numbers you'd want to tune (player, enemies, attacks, the first level) already sit in three blocks near the top: `CONFIG`, `ENEMY_DEFS`, `LEVEL_1`. Tuning existing content is easy.
- **It's built for exactly one level, and only corridor-shaped levels.** `LEVEL_1` is named directly in seven places in the code, plus the help text. Movement, gates, triggers and the camera all assume a straight hall along one axis. A second level, or rooms, corners and stairs, is the biggest job on the list.
- **Lists point at each other by position.** The level says "enemy #2" and "alcove #0" instead of names. Inserting or reordering an entry silently swaps enemies, and a typo freezes the game or leaves a gate that never opens. Nothing checks the data.
- **Items, equipment and levelling up don't exist as systems.** The flask is wired by hand into the game loop and the HUD, the player has one fixed sword moveset, and souls pile up with nothing to spend them on.
- **What each character is doing ("idle", "stagger", "windup"…) is tracked as plain words, compared in about 75 places.** Adding a new action (sprint, backstep, using an item) means finding every spot that lists them, and a typo fails silently.
- **Some behaviour you may not intend:** dying doesn't reset enemies or refill flasks, enemies can notice and hit you through closed gates, the click that captures the mouse also swings your sword, and R restarts the whole level instantly.
- **Recommended first steps:** a data check that shows an on-screen error, names instead of numbered references, and one central list of states. Then make levels generic. Details in §9.

---

## 2. How the code is organized

### 2.1 File layout

| Block | Lines | What it holds |
|---|---|---|
| CSS | L7–89 | All HUD and menu styling, including the death and rest fade timings |
| HTML | L92–145 | Canvas, HUD bars, overlays (YOU DIED, RESTED…), help panel with the controls table, menu shell |
| 1. `CONFIG` | L150–227 | Global tuning: physics, camera, player stats and attacks, jump attacks, block, parry, flask, rest, death, shared enemy and level numbers |
| 2. `ENEMY_DEFS` + `LEVEL_1` | L229–324 | The 4 enemy types (L234–294) and the one level's layout (L297–324) |
| 3. Input + settings | L326–363 | Key bindings (`ACTIONS`), input buffer, saved options |
| 4. Scene setup | L365–731 | A grab bag: renderer and lights, level-building helpers, the arena and hall (both built once at page load), walkable space (`WORLDS`), math helpers, the humanoid model (`Rig`), wall collision and body physics |
| 5. `Player` | L733–1027 | Player state machine (`update`) and animation (`pose`) |
| 6. `Enemy` | L1029–1307 | Enemy AI state machine, taking damage, idle personality, animation |
| 7. `Hitbox` | L1309–1330 | Attack volumes and the overlap test |
| 8. Combat | L1332–1447 | Parry timing, `resolveCombat` (all damage, blocking, staggers), body separation |
| 9. Effects + debug | L1449–1640 | Particle bursts, ground-pound effects, sword trail, lock-on marker, bloodstain, hitbox wireframes |
| 10. HUD | L1642–1699 | Bars, flasks, souls, overlays |
| 11. `Game` | L1701–2153 | About 450 lines: menus, level setup, bonfires, death and souls, lock-on, level gates, camera, the per-step update and the render |
| 12. Bootstrap | L2155–2231 | Keyboard and mouse listeners, resize, the fixed-step frame loop, the `window.__arena` console handle |

Three.js is loaded from a CDN, pinned to version 0.160.0 (L148).

### 2.2 What happens every frame

`frame()` (L2218) runs the simulation in fixed 1/60 s steps, then draws once, smoothing between steps. Each step, `Game.update` (L2068) does this, in order:

1. If the player is dead: slow the world to a stop, then respawn (L2073–2082). End of step.
2. If a hit-pause is running: count it down (L2083). End of step.
3. Lock-on, rest, flask (L2084–2088).
4. Player update, then every enemy (L2090–2091).
5. Push overlapping bodies apart, then `resolveCombat` (L2092–2093).
6. Ground-pound effect, souls for kills, death check, bloodstain pickup, level gates, camera (L2094–2103).

`Game.render` (L2106) then places and animates every model, moves the camera, updates effects, debug boxes and HUD, and draws.

The order matters (the parry is checked after both sides have moved, for example). Any new system needs a deliberate slot in this list.

### 2.3 Shared state

Everything lives in module-level globals: `scene`, `camera`, `renderer`, `input`, `settings`, `world` (L538, reassigned on every restart), `hud`, `Game` and the effect pools. `Game` is the hub. It owns the player, the enemy list, souls, flasks, the spawn point, zones and gates, and also the menus and the camera.

`Player` reads the global `input` directly (L811–816, L851, L894, L901–904), so it can only be driven by the keyboard and mouse, not by a replay, a test or a second controller.

---

## 3. Where the stats live

### 3.1 Already in data tables (keep it this way)

- **`CONFIG`** (L153–227): player stats (L173–182) and attacks (L183–190), jump attacks (L194–204), block (L208–209), parry and riposte (L213–215), flask (L216), rest (L217), death (L218), bloodstain (L219), shared enemy numbers (L220–223), level notice ranges (L224–225).
- **`ENEMY_DEFS`** (L234–294): per enemy, its name, size, looks, HP, poise, speed, cooldowns, souls, boss posture, and attacks with timings and hit volumes.
- **`LEVEL_1`** (L297–324): hall size, start point, bonfires, alcoves, gated zones, scattered enemies, torches.

These are still inside the game file, so changing a stat means editing the game file, but in a safe, predictable spot.

### 3.2 Stats written directly into the logic

**Enemies**

| What | Where | Why it matters |
|---|---|---|
| Weapon colour chosen by weapon type | L1037 | A new weapon type gets the sword's colour |
| Delay before the first attack, 0.6–1.0 s | L1054 | Same for every enemy; can't be set per enemy |
| Next attack picked at random, equal odds | L1117 | No favourite moves, no "use the long attack when far" |
| Must face within ~23° (0.4 rad) to start an attack | L1120 | Same for every enemy |
| `aggroRange` on each enemy | L238, L252, L266, L280 | Only used in the arena (L1815). In the level, notice range comes from `CONFIG.level` by behaviour instead (L224, L1823–1825, L1957). Two sources of truth |
| Placement rules per behaviour (ambush depth = 0.55 of the alcove, facings) | L1821–1825 | Hidden layout rules |
| Gated enemies always spawn facing −X | L1956 | Breaks for a level laid out in another direction |
| Arena enemy start in `CONFIG.enemy.startX/startZ` | L222 | …but the arena player start is inline at L1839 |
| Wind-up glow ramp, posture-break flash, idle blend, recoil lean | L1269, L1067, L1294–1296, L1299 | Feel numbers outside `CONFIG` |

**Player**

| What | Where |
|---|---|
| Look and weapon (scale, bulk, colour, `'sword'`) | L739 |
| Arena spawn `{ x: -6, z: 0 }` | L1839 |
| Spawn facing, both modes | L1853 |
| Air steering is 0.4 × turn rate | L855 |
| Roll exit keeps 0.3 of the speed; jump-attack landing keeps 0.35 | L885, L953 |
| Attack lunge starts at 55% of the wind-up | L892 |
| Both jump attacks always play the `'overhead'` animation (`CONFIG.jumpAttacks` has no `anim` field) | L986–987, L993 |
| Death fade 3.5 s (enemies use `CONFIG.enemy.deathFade`) | L1019 |
| Max HP, stamina and poise read straight from `CONFIG` | maxHp: L743, L917, L1663, L1870 · maxStamina: L743, L832, L1367, L1667, L1870 · maxPoise: L743, L834, L930, L1418, L1423 |

The last row is what blocks levelling up: there's no "this player's max HP", only the global constant.

**Items (flask, souls, bloodstain)**

- Flask numbers are in `CONFIG.flask` (L216). The flask *count*, though, lives on `Game` (L1711), refills in `reset` (L1835) and `tryRest` (L1872), and drinking is started by `Game.update` (L2086–2088), not by the player.
- The HUD creates exactly `CONFIG.flask.charges` flask icons once, at page load (L1648–1650). A flask upgrade would not show.
- Souls per kill are in `ENEMY_DEFS`. The souls wallet lives on `Game` (L1711): awarded at L2099, dropped on death at L1889, recovered at L1897. Nothing spends them.
- There is no item list, inventory, pickup or equipment.

**Levels**

| What | Where |
|---|---|
| Alcove inner height 3.2, repeated across five lines | L491–495 |
| Pillar rhythm (start 5, every 7), floor grid (every 4), border strip 0.6 | L503, L479, L477–478 |
| Exit gate size | L517–518 |
| Torch mount height, flame, light colour/strength/reach (4.5, 26) | L521–526 |
| Bonfire light: 10 in the hall, 11 in the arena | L519, L470 |
| Gate lift distance `gateHeight - 0.3` | L2134 |
| Fog, background, moonlight, ambient light: shared by every level | L375–383 |
| Arena outer ground, pillar ring, border strip, bonfire offset | L461–469, L449, L445 |
| Level list in the menu: only `LEVEL_1` | L1724 |
| Help text "Level 1: defeat each gated opponent…" | L132 |

**Combat feedback:** colour, count and speed of every particle burst (L1353, L1370, L1390, L1410, L1414, L1898). The posture break reuses the parry's screen shake (L1355). Particle gravity 12 (L1474), pool of 180 particles (L1454).

### 3.3 Numbers that must be kept in sync by hand

- **Death timing:** the CSS fades (L12, L76–77) vs `CONFIG.death` (L218). Change `respawnDelay` and "YOU DIED" no longer lines up.
- **Input buffer vs hit-pause:** the 0.2 s buffer (L158) runs on real time (L342), while hit-pauses freeze the game for up to 0.24 s (heavy jump-attack riposte: 0.15 × 1.6, L200 and L214). See B5.
- **Collision size vs model size:** each enemy's `radius`/`height` and its model `scale`/`bulk` are separate numbers (e.g. L237). The player's model is set at L739, its collision at L174.
- **Level positions:** each zone needs trigger < spawn < gate, with bonfires outside zones (L302, L307–310). Nothing checks this. The second bonfire's respawn point can land 0.3 m from the Fast Rogue trigger (L302, L309, L1873).

---

## 4. Fragile spots

Ranked by how likely they are to bite during the next round of features.

**F1 — One level, one world shape (High).**
`LEVEL_1` is named at L475, L534–536, L1724, L1817, L1841 and L2134 (plus L2231 and the help text at L132). The hall is built once at page load into a single `hallGroup` (L474–528). Its gate models sit in a separate `hallGates` list that is matched to `LEVEL_1.gated` by position (L473, L514, L1844). The walkable-space model (`WORLDS`, L531–537; `clampToWorld`, L695–713) only understands a rectangle along X, side alcoves, and gates that are flat walls across X. Zone triggers test `p.x > z.trigger` (L1954). The ground is always at height 0 (L720). The camera dodges walls with the same rectangle maths (L2050–2058), not the real geometry.

**F2 — References by list position, with no checks (High).**
The level picks enemies by number (`enemy: 2`, L307–320) and alcoves by number (`alcove: 0`, L314–316). Arena mode assumes the duel enemy is `enemies[0]` (L1689, L1972). The last gated zone ends the level only because it's last (L1845). What a typo does:
- A bad `enemy` or `alcove` in `dispersed`: crash in `makeEnemies` (L1819–1822) → frozen screen at level start, or a broken state after resting (`respawnEnemies` disposes the old enemies first, L1882).
- A bad `enemy` in `gated`: the zone is marked as spawned just before the crash (L1955–1956), so its gate never opens. The level is soft-locked.
- A misspelled `behavior`: silently gets the slumbering enemy's placement and notice range (L1825) but starts out standing (L1052). Without an `x`, the enemy gets an invalid position and never appears.
- A new enemy inserted in the middle of `ENEMY_DEFS`: every level entry that points at a later position now gets a different enemy.

**F3 — State names as bare text (High).**
About 75 comparisons like `state === 'stagger'` and 47 `setState('…')` calls, across 15 player states (L746) and 15 enemy states (L1050), with no central list. "Which states allow X" lists are repeated: stamina regen (L830–831), lock-on facing (L939–941), drinking, resting and the rest prompt (L761, L1866, L1687), idle blend (L1294–1295), "unaware" (L1205), rest blocking (L1868). `Enemy` even checks *player* state names for posture decay (L1073). Adding a state means finding all of these, and a typo never matches.

**F4 — The player isn't data-driven (High for items and equipment).**
Moveset = `CONFIG.player.attacks` (L183–190). Look and weapon are fixed at L739. Max stats are read from `CONFIG` (§3.2). Flasks and souls belong to `Game`. There's no player definition, item list or inventory.

**F5 — Walls and gates only block movement (Medium).**
Noticing the player is plain distance (L1078), hitboxes ignore walls (L1319–1328) and so does lock-on (L1913–1920). In Level 1 today, the patroller at x 131–138 (L319) is within its 9 m notice range (L224) of the Fast Rogue fight behind gate 3 at x 128 (L309). It walks into the bars, where the two bodies end up about 1.3 m apart, inside its sword reach. It can hit you through the closed gate, and you can hit it. Every new wall, gate or obstacle will have the same gap.

**F6 — Combat is lopsided (Medium).**
Enemies take damage through `Enemy.takeHit` (L1186–1213). The player's damage, block, guard break, hurt and stagger are written inline inside `resolveCombat` (L1394–1430). There are three attack formats: player ground attacks (L183–190), jump attacks (L194–204: no `anim`, no `active`) and enemy attacks (`hits[]` and `range`, no `hitstop`). The player builds a separate `payload` (L790–794), while enemies pass their definition directly (L1128). "Light" and "heavy" are baked into the riposte and posture formulas (L791–792, L1200), so a third attack type (charged, running, kick) has no slot. Hitboxes are glued to their owner (L1315–1318), so projectiles don't fit.

**F7 — Looks and animations are if/else chains (Medium).**
Attack animations (L635–659: sweep, overhead, stab, bash, stomp), weapon models (L584–590: club, otherwise sword) and idle styles (L1223–1247: guard, still, twitch, sway). An unknown name gives no pose or a default sword, with no warning. Every enemy shares one humanoid body (L556–598), so a beast or a flying enemy needs a new model class. The Undead Knight's "Shield Bash" (L258) swings an empty left arm: there is no shield model.

**F8 — Helpers defined after code that runs at load (Medium).**
`lerp`, `clamp`, `ease` and friends are defined at L541–545, after the arena and hall are built at L446–528, which run immediately. The builders don't call them today. The first time a change adds a `clamp(...)` to level building, the whole script stops at load and the menu comes up with no buttons. `rand` sits mid-file (L443) for the same reason.

**F9 — Keys are spelled out in several places (Medium).**
Gameplay bindings live in `ACTIONS` (L329–336). But the menus hardcode W/S/A/D, arrows, Enter, J and Esc (L2168–2173), R/H/Esc are handled separately (L2179–2181), and the help table (L113–129), rest prompt (L107), win/complete overlays (L109–110) and menu hint (L1756–1757) write key names as text. Rebinding or controller support means editing all of them. The camera can only be turned with the mouse (L2006–2012).

**F10 — Online-only, silent failure (Low).**
If the CDN (L148) can't be reached, the script never runs. The player sees the "COMBAT ARENA 3D" title with no buttons and no error message.

**F11 — Debug view tied to the help panel (Low).**
Hitbox wireframes only draw while the F1 panel is open (L1694). H flips the checkbox for the session but doesn't save it (L2181); the Options menu sets the saved default (L1736).

**F12 — Everything in one 2,234-line file (Low now, grows).**
Every coding step works inside one large file, so unrelated changes can collide. If you split it later, note that the game works when double-clicked today because the script is inside the page. Opened that way, Chrome and most browsers refuse to load separate `.js` module files, so a split needs a plan for how the game is opened (a local server, or a different loading approach).

---

## 5. Duplication

| # | What's duplicated | Where |
|---|---|---|
| D1 | The wind-up → strike → recovery timeline, written once for the player and once for enemies, in different styles | L888–897 vs L1125–1143; poses L977–983 vs L1266–1273 |
| D2 | Three attack data formats | L183–190, L194–204, enemy attacks in `ENEMY_DEFS` |
| D3 | Taking a hit (hurt, stagger, poise rules) | Player inline L1417–1429 vs `Enemy.takeHit` L1204–1211 |
| D4 | "A swing already out isn't interrupted": one rule, two implementations | L1422–1423 vs L1207 |
| D5 | Poise recovery timers | L833–834 vs L1069–1071 |
| D6 | Hurt and stagger poses, nearly identical | L1015–1018 vs L1274–1277 |
| D7 | "Pick an enemy", five times, each re-checking alive / awake / range / in front | `autoAim` L769–781, `lockCandidates` L1913–1920, auto lock-on L1933–1941, `target` L1970–1981, parry target L1363–1364 |
| D8 | Arena and hall builders repeat the floor, border strip, grid lines and walls | L446–471 vs L474–528 |
| D9 | Enemy spawn options built in two places | `makeEnemies` L1812–1829 vs `updateLevel` L1956–1957 |
| D10 | HP "trailing bar" logic with the same magic 0.22 | L1665 vs L1674 |
| D11 | "Player is free (idle or walking)" check | L761, L1687, L1866 |

---

## 6. What makes adding content or features hard

| You want to… | Today | What's in the way |
|---|---|---|
| Re-tune existing enemies, attacks, player, flask | **Easy** | `CONFIG` / `ENEMY_DEFS` (§3.1) |
| Rearrange Level 1 (bonfires, torches, alcoves, patrols) | **Easy** | Data only in `LEVEL_1`, but nothing checks positions (§3.3) and new walls don't block attacks (F5) |
| Add an enemy that reuses existing looks and moves | **Easy** | Append it to the end of `ENEMY_DEFS`; the arena menu lists it automatically (L1726). Never insert in the middle (F2) |
| Add another boss | **Easy** | Give it a `posture` block (L283–284); the posture bar appears on its own (L1676). Note that posture also turns off flinching and poise staggers for that enemy (L1195–1201) |
| Give an enemy a new animation, weapon or idle style | Medium | `Rig.attackPose`, the `Rig` constructor, `idleLayer`, weapon colour (F7) |
| Multi-hit combos whose hits differ | Medium | All `hits[]` share one hit volume, damage and lunge (L272–274, L1128); left/right alternation is hardcoded (L1254) |
| Smarter enemy AI (weighted moves, keep distance, strafe) | Medium | One `chase` case with a random pick (L1113–1124) |
| A new enemy behaviour (guard that returns home, sentry) | Medium-hard | Start-state map (L1052), the `update` switch, the "unaware" list (L1205), poses, placement in `makeEnemies`, notice range in `CONFIG`, rest blocking (L1868) |
| Ranged enemies, projectiles | Hard | Hitboxes are glued to their owner, and knockback and block direction use the owner's position (L1398–1400); the AI only closes to melee range |
| Non-humanoid enemies | Hard | One humanoid `Rig`; every pose moves its limbs by name |
| A second level | Hard | F1: `LEVEL_1` named in code, built once at load, gates matched by number, one menu entry, help text |
| Rooms, corners, stairs, height | Very hard | Corridor-only collision, gates and triggers only across X, flat ground, rectangle-based camera (F1) |
| Solid obstacles (pillars, crates) | Hard | Collision only knows the outer walls, alcoves and gates; the decorative pillars along the walls have no collision (L501) |
| Items, pickups, inventory | Hard | No item system; the flask is wired into `Game` and the HUD by hand (§3.2) |
| Player weapons, equipment | Hard | Moveset and look are fixed (F4); damage is read straight from `CONFIG` |
| Spending souls, levelling up | Medium-hard | Max stats are global constants read in 4–5 places each (§3.2). The menu system could host a level-up screen |
| Saving progress | Hard | Progress is spread across `Game`, zones, gates, enemies and the bloodstain; only settings are saved (L360–363) |
| Sound | Medium (tedious) | No event hooks: each sound has to be added at the exact line where its effect happens, around a dozen places (L1352–1430, L1886, L1894, L1960, L2094…) |
| Rebinding, controller | Medium | F9 |
| Difficulty modes, New Game+ | Medium | Numbers are read directly from constants; there's no multiplier layer |
| Arena fights with 2+ enemies | Medium | The win check and HUD assume `enemies[0]` (L1689, L1972) |
| Much longer levels with many more torches | Medium | Each torch is a real light (L523) that costs on every pixel while visible, and every wall piece is its own mesh (L399–402). Fine today; slower on laptops as levels grow |

---

## 7. Bugs and behaviour to confirm

Found while reading. None were changed.

- **B1 — Dying doesn't reset the world.** On respawn (L2076 → `spawnPlayer`, L1851–1857) only the player is rebuilt. Enemies keep their damage and position, gated fights don't reset, and flasks aren't refilled. Enemies stop where they are when you die (L1114), so if you died near your bonfire, the enemy that killed you is still standing there when you come back. In Dark Souls-style games, dying usually works like resting. Decide which you want.
- **B2 — "Leash" doesn't send enemies home.** `leash` is measured from the *player* (L1114), and the enemy then goes idle where it stands; every behaviour except patrol uses idle as "home" (L1051). Ambushers never return to their alcoves.
- **B3 — Hitting and being hit through closed gates.** See F5. A data-only stopgap: move the x 131–138 patroller further from gate 3 or shrink its notice range.
- **B4 — The click that captures the mouse also attacks.** A mouse press both requests mouse capture and presses light or heavy attack (L2187–2191). It happens at the start of play and after every pause.
- **B5 — Inputs can be dropped during long hit-pauses.** A press made early in a freeze longer than 0.2 s has expired by the time play resumes (§3.3). Rare today; raising any hit-pause makes it worse.
- **B6 — A staggered enemy is re-staggered by every hit.** Poise isn't restored until the stagger ends (L1148), so each hit restarts it (L1204–1208). Only stamina limits a stun-lock on non-boss enemies. May be intended.
- **B7 — The rest prompt shows when resting is blocked.** "F: Rest at bonfire" appears whenever you're near a bonfire (L1687), but resting is silently refused while an enemy that's after you is within 10 m (L1868–1869).
- **B8 — R restarts instantly.** In a level, R wipes souls and opened gates with no confirmation (L2180). It sits between E (parry) and T, right above F (rest).
- **B9 — Small leftovers.** The comment for `slack`/`drift` ended up on the `autoRange` line (L171). The `#pInfo` CSS (L40–41) is unused; its replacement `#pInfo2` uses inline styles (L99). Every menu button uses the class `enemyBtn` (L23–30, L1761), left over from an older menu.

---

## 8. What's solid — keep these patterns

- Tuning in one place, with comments that explain the units (`CONFIG`).
- Content as data, with the arena menu built from the enemy list (L1726).
- A fixed 60 Hz simulation with smoothed drawing and a backlog cap (L2217–2228), so the feel doesn't change with frame rate.
- Logic (`update`) and animation (`pose`) kept apart in each character, with visual-only state labelled.
- One hit per target per swing, via the `Hitbox` hit set (L1314, L1320), and visible hitbox wireframes for tuning.
- Effects drawn from fixed pools (particles L1452–1458, ground pound L1513–1570), so big fights don't stutter.
- Graphics memory freed when characters are removed (`Rig.dispose`, L685–690).
- A pinned Three.js version (L148) and safe settings storage (L360–363).
- `window.__arena` (L2231) for live tuning from the browser console.

---

## 9. Suggested order of work

Each item is sized for one step. There are no automated tests, so after each one, play Level 1 start to finish and one arena duel.

1. **Safety net.** Move the shared helpers (`rand`, `lerp`, `clamp`, `ease`, `angDiff`, `turnToward`) to the top of the script. Add a data check at load that verifies every cross-reference and the zone ordering, and shows an on-screen error instead of a frozen screen. *Done when* a deliberate typo in `LEVEL_1` produces a readable message.
2. **Names instead of numbers.** Give each enemy an `id` and each alcove an id (or put its position in the entry), and reference them by name. *Done when* reordering `ENEMY_DEFS` changes nothing in the level.
3. **One list of states.** Define the player and enemy state names once, plus small helpers ("is free", "is committed", "is unaware") that replace the repeated lists in F3. *Done when* no state name is typed as text outside those definitions.
4. **Generic levels.** A `LEVELS` list; build and tear down the current level's geometry on start; gates owned by the level; menu entries and help text generated from level data; fog and lighting per level. *Done when* a second level can be added as data only.
5. **Small player-facing fixes.** Decide B1 (death), fix B4 (click attack), B7 (rest prompt) and B8 (restart confirmation), and apply the B3 stopgap.
6. **One attack format, and `Player.takeHit`.** Merge the three attack formats, move the player's damage out of `resolveCombat`, and give jump attacks an `anim` field. *Done when* both sides go through the same hit path.
7. **Registries for looks.** Tables for animations, weapons and idle styles, with a warning on unknown names. Optionally a shield for the Undead Knight.
8. **Player and item data.** A player definition (look, base stats, starting weapon), per-player max stats, an item list with the flask as the first item, an inventory on the player, and a HUD built from it.
9. **Event hooks.** A small "something happened" channel (hit, parry, block, death, rest, gate opened) so sound, effects and souls listen in one place.
10. **Then the big ones:** saving (much easier after 4 and 8), walls that block sight and swings (F5), and finally rooms, corners and height, which need box-based collision and a matching camera.

---

## Glossary

- **Hardcoded:** a number typed straight into the game logic instead of a settings table.
- **Data table:** a block of plain values (like `ENEMY_DEFS`) that the logic reads.
- **State:** what a character is doing right now ("idle", "windup", "stagger"); the code changes behaviour based on it.
- **Hitbox:** the invisible box an attack uses to decide what it hits.
- **Index:** a position in a list, counted from 0. "Enemy #2" is the third entry in `ENEMY_DEFS`.
- **Hit-pause (hitstop):** the brief freeze when a strong hit lands.
