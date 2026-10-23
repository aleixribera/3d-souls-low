# More adaptable bots and arena tracking (v7.12.1)

## What caused the standoffs

The old approach rule required enough predicted safety to walk all the way in **and** finish a swing. At the waiting distance, a ready opponent's theoretical opening could never satisfy that test. Both fighters could hold their preferred distance indefinitely. Conditional counterattacks also shortened every opening, even outside their triggering range or situation.

A wounded bot could repeatedly retreat to seek a flask window. Separately, its 16 m engage range and 9 m wake range could exclude the next opponent after a kill, while enemy sight and player lock-on had their own shorter arena limits.

## Behaviour

Movement plans persist for 2–4 seconds and then change. Each companion mixes all three plans with different weights:

| Companion | Usual approach | Patience without an exchange |
| --- | --- | --- |
| Ser Quill | Close on a flank, mix pressure with baiting | 4.5 s |
| Maren the Bold | Apply pressure, favour heavies and inward dodges | 3 s |
| Old Tobin | Bait and counter, favour parries and retreating dodges | 6 s |

Approaching and swinging are separate decisions. Once patience expires, a bot closes in. After another 1.2 seconds of quiet, it may initiate one light attack even if a hypothetical counter would otherwise discourage every swing. Started attacks from any opponent, incoming projectiles and stamina still veto that commitment. Attacking, taking or dealing damage, healing and phase transitions reset patience. New targets receive fresh plan and patience clocks.

Healing forecasts include reactions triggered by drinking. A bot seeks healing space for three seconds, then fights for an opening if it cannot safely drink; it continues to take safe flask opportunities.

Rolls use weighted escape, sideways, reverse-side, inward-diagonal, outward-diagonal and retreat directions. Before choosing a normal dodge, the brain projects its position at the end of the player's roll i-frames using the player's actual slowdown curve. It rejects directions that fail to clear the attack box or run through the opponent, a wall or a floor edge. A geometric escape remains the fallback. Rings use varied inward diagonals; breaths and spheres use varied retreat diagonals.

## Whole-arena tracking

`ARENA.fullTracking` enables awareness across the entire arena, in every direction. Boss-vs-boss arenas inherit it. A custom room level used for a duel receives the same flag in both browser and server setup.

`trackingRange` in `js/character.js` supplies the range policy for bot acquisition, enemy notice, and player lock acquisition/retention. Arena lock-on also accepts off-screen targets. A bot immediately considers the remaining opponent after a kill, and a player can lock onto a survivor across the arena. Explicitly releasing lock-on still works.

Ordinary levels retain their notice distances and sight cones. Line-of-sight, floor separation, hidden enemies, explicit auto-lock opt-outs and zero notice ranges retain their existing meaning. Attack ranges, collision boxes and execution reach remain physical combat checks.

## Ownership

- `js/data/bots.js`: validated `BOT_TACTICS`, `BOT_DODGES` and profile weights/patience.
- `CONFIG.bot`: plan duration, probe delay, healing retreat duration and dodge margins/angles.
- `js/bot.js`: reads the fight and supplies ordinary player inputs.
- `js/levels/arena.js`, `js/character.js`, `js/enemy.js`, `js/game.js`, `server/simulation.js`: shared arena tracking policy and setup.

All decisions continue to read move data rather than enemy ids.

## Verification

- `node tests/bot-behavior.cjs`: 72 boss/profile/health standoff cases, distinct and persistent movement plans, stamina and defence precedence, whole-arena detection for three profiles against a regular enemy and all 12 bosses, distant survivor reacquisition, ordinary detection, and roll variation over 48 samples per profile. Every waiting-boss case received actual damage within 7.50 s.
- `node tests/bot.cjs`: lobby controls, frames, combat credit, spectator camera, wipe rules and 30/30 Giant Skeleton duels.
- `node tests/bot-duel.cjs all 6 600 <profileId>`, once for each profile: 216 completed fights, no timeouts; longest uninterrupted neutral lull 4.5 s in this sample. Wins depend on the boss and personality; these samples measure engagement as well as combat outcomes.
- Browser checks: friendly bots, boss-vs-boss and the full solo suite, including a new regression for far, off-screen lock-on and releasing it.
- Boss-only progression, fullscreen, graphics selection and matching VERSION / LOAD_STAMP checks.
- The container workflow includes the new headless behaviour regression.
