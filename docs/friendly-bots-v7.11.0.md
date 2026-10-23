# Friendly bots (v7.11.0)

The lobby leader can add up to three friendly bots (`ArenaNet.config.maxBots`) from the party panel ("Add a friendly bot"); each bot row has a leader-only Remove button. Guests see bots tagged **Bot** but cannot add or remove them (the server checks `control` actions `addBot` / `removeBot` against the current leader).

## How a bot plays

- **A real player body.** The server (`server/simulation.js`) runs each bot as an ordinary `Player` from `js/player.js`. `Player.ctl` is where presses come from: the global `input` for people, a `BotHands` for bots (`js/bot.js`). So a bot has exactly the player's moveset, stamina, exhaustion, poise, flasks, buffer and combo rules, roll i-frames, parry windows, ripostes and executions.
- **Shared combat.** Its blows and parries go through `resolveCombat` against the server's enemies; damage is credited to the damage leaderboard; enemy blows and bolts (flown on the server for bots) hit it through `Player.takeHit`. Enemies target it like any player. Its hit-pause pauses only itself, as a person's does online.
- **Seen as a teammate.** Frames carry its pose (`bot: true`) with a chase-camera `view`, so nameplates, health meters, the players-alive panel and spectating all work. Its strikes reach clients as `strike` events.
- **Party rules.** A standing bot keeps a boss attempt alive (no team wipe until humans *and* bots are down). In levels it respawns after `CONFIG.bot.respawnDelay`, follows the nearest person and catches up when left behind or on another floor. Bots reset with every new session and leave when the lobby empties.

## The brain

`bot.create(profile)` reads the fight from attack data only, never from an enemy id:

- **Defence:** for each enemy's next blow, the time until its hitbox opens (holds, hit chains, the ring's arrival), its reach (box, ring, lunge, dash, step, leap, blink) and whether it can be parried. It decides once per blow (after a short `notice` delay) to parry or roll, times the roll so the i-frames cover the whole cluster of blows, and rolls out of the box by its nearest edge (through a spreading ring). Bolts in flight are dodged sideways. With no stamina it guards.
- **Openings:** how long until any nearby enemy could hurt it: recoveries, parried/staggered/broken states, a share of the remaining cooldown, walking distance, and reaction attacks (`when`) that ignore cooldown. It only commits to a swing (with its hit-pause) that ends inside the opening.
- **Offence with flair:** light combos chained into the finisher, tapped and charged heavies, ripostes after parries, leaping heavies from a step or two out, executions on a kneeling enemy, circling that changes side, flasks when hurt and safe, a hop when its foe falls. Personalities (`BOT_PROFILES`: Ser Quill, Maren the Bold, Old Tobin) lean toward aggression, parrying, heavies or leaps.

Tuning lives in `CONFIG.bot`; profiles in `js/data/bots.js` (validated at load).

## Record (headless, a lone bot, `node tests/bot-duel.cjs all 10 900`)

| Boss | Wins |
| --- | --- |
| Giant Skeleton | 10/10 (100/100 and 40/40 per profile in longer runs) |
| Pillager Captain, Bell Warden, Crucible Knight | 10/10 |
| Aldric, Margit | 9/10 |
| Morgott | 7/10 |
| Maliketh | 6/10 |
| Godrick, Godfrey | 5/10 |
| Radagon | 1/10 |
| Malenia | 0/10 |

## Checks

- `node tests/bot.cjs`: leader-only add/remove, the cap, roster and frames, the spectator camera, strike events, real damage, no wipe while a bot stands, removal, and 29/30 Giant Skeleton duels across the three profiles.
- `node tests/bot-duel.cjs [boss|all] [trials] [seconds]` (`PROFILE=maren` picks a personality).
- `tests/bot-browser.cjs` (Playwright/Edge): the lobby button and tag, the bot drawn fighting, spectating it after the players fall.

## Known gaps

- The brain sees exact enemy timings (including a hold's length once it starts), softened by a notice delay and random leads, not by animation reading.
- No pathfinding: in levels it walks straight toward its party and teleports to catch up when far behind.
- Bots never rest at bonfires or talk to NPCs.
- Radagon and Malenia still beat a lone bot most of the time.
