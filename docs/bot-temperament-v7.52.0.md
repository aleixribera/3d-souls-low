# Wiser bots: temperaments, strings and executions (v7.52.0)

Aleix's complaint of 2026-11-13: bots swung into the pause between Godrick's two "Kneel!" rings, rolled sideways inside his spinning axe, walked into attacks, spammed rolls, all fought the same way, and took executions from the player. They should keep spacing, wait out a combo, look human rather than perfect, be a little stronger, and leave executions to the player.

## Temperaments

- `BOT_MOODS` (`js/data/bots.js`): `patient`, `measured`, `bold`, `wary`. Each sets the pause it will swing into (`gap`, `null` = never mid-string), how far past a string's reach it waits (`spacing`), how long after a string it goes in (`goIn`), scales to patience, greed and reset time, a heal-threshold shift, and how often it mistimes a roll (`slip`).
- Each profile weights the moods (`moods`): Quill leans measured, Maren bold, Tobin patient or wary. A bot draws one per fight (`newFight` in `js/bot.js`), when it takes a new target after `CONFIG.bot.fightGap` s of quiet; the draw also jitters its plan weights (`moodJitter`) and picks a circling side.
- `brain.describe()` prints the fight's choices and what it did (strings waited out, pauses swung into, executions yielded and taken). Logs: `MOODS=1 node tools/bot-fights.cjs godrick,margit 2`.

## Strings

- `stringOf(e, me)`: an enemy in wind-up or swing with blows still to come (its hits left, or follow-ups with a chance). `reach` is the farthest of those blows the bot can outrun (`CONFIG.bot.string.outrun`); a leap or blink that lands anywhere doesn't make it back off. A bow's draw is no string.
- While the target is mid-string the bot keeps its edge gap at `holdGap` (past that reach plus its mood's spacing, at most `outrun`), and goes in `goIn` s after the string ends. A `bold` or `measured` bot swings into a pause of `gap` s or more.
- `opening()` counts a follow-up as starting when the last hit ends (no recovery between), plus its walk-in.
- Defence: a blow aimed at someone else when the bot is behind the enemy (`aimedElsewhere`, `behindMargin`), or one it is already clear of at every yaw the enemy can still turn to (`clearOf`, `defence.clear`, `defence.maxTurn`) goes by. A blow with more to come is rolled away from (back), not across.
- `slip`: now and then a roll goes early or late (`CONFIG.bot.slip`), as a person's would.

## Executions

- A kneeling enemy (posture break) with a player (an ally without `botId`) within `execution.yield` m is the player's: the bot waits `execution.aside` m off its flank and executes only when the kneel has `execution.late` s plus its walk left. With no player near it executes at once. A riposte on an enemy someone parried is left the same way until late in the opening.

## Measured

`docs/scorecard/bot-temperament.txt`: three bots against each of the 22 bosses, six seeded fights each (`node tools/bot-fights.cjs all 6`), before and after:

| | v7.51.1 | v7.52.0 |
|---|---|---|
| wins | 60/132 | 111/132 |
| fight time | 116 s | 163 s |
| damage taken a fight | 519 | 368 |
| bots fallen a fight | 1.81 | 0.76 |
| rolls a bot-minute | 12.8 | 8.6 |
| roll chains (3+ within 1.2 s) | 419 | 146 |
| swings started mid-string | 943 | 260 |
| hits taken mid-swing | 1075 | 552 |

Wins nearly double, more than "a bit". The slip chances were raised once (to 0.15–0.27) and moved wins only from 116 to 111: the gain comes from not walking into blows. In real play the player is in the fight and the bots leave executions to them; if the bots still carry, raise `slip` or lower `greed` in `BOT_MOODS`.

Frames: `docs/scorecard/bots-kneel-before-after.jpg`. Tests: `tests/bot-temperament.cjs` (temperaments vary, Kneel waited out, Stormcaller walked out of unhurt, the three execution cases).
