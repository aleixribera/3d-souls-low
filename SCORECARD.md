# Scorecard

One row per `VISION.md` area, scored 1-5 (5: as good as the vision asks; 1: missing or broken), each with one sentence
and its evidence. Written by the loop; a row changes only with new evidence, and scores can go down. The director reads
it to pick each stage's weakest area.

Evidence lives in `docs/scorecard/` (v7.34.0, 2026-11-13). To take it again:
- frames and level timings: `node tools/scorecard-frames.cjs [docs/scorecard] [menu|levels|bosses]` (headless Edge,
  High, 1280x720; level frames from each level's start, boss frames in the 1v1 Arena at fighting distance);
- boss fights: `node tests/bot-duel.cjs all 6 600` (one bot, profile Ser Quill) and `BOTS=3 node tests/bot-duel.cjs all 6 600`
  (three bots together), in the headless server simulation, 6 fights each. A bot stands in for a player.

## Areas

| Area | Score | Why | Evidence |
|---|---|---|---|
| Combat feel | 3 | Timings, parries, rolls and executions are specified and tested, but no play feedback is on record yet. | `docs/combat-timings-v4.1.md`, `tests/suite.js` (261 in-page tests), `.claude/feedback.md` |
| Characters and art | 4 | The wanderer, Ashmere's enemies and all five Ashmere bosses are Blender models that pass the hardened check (the Antlered Hunger last, v7.49.0); the bosses and enemies of chapters 7-12 are still re-coloured stand-in figures. | `docs/scorecard/hunger-lab.jpg`, `hunger-church.jpg`, `aldric-*.jpg`, `giant-*.jpg`, `js/baked/` |
| Levels and content | 3 | Eight levels (the seventh and eighth rough), each with its own light and look; from their opening frames most read as plain corridors and squares (rows below). | `docs/scorecard/level-*.jpg` |
| Bosses | 2 | Every boss scales with the group and turns between its fighters by a readable rule (the striker, a drinker, else the closest), favouring area attacks on a bunched group, but three bots beat the Lands' bosses only 13/48 times. | `docs/scorecard/boss-duels-1-bot.txt`, `boss-duels-3-bots-grouped.txt`, `boss-attention.txt`, `boss-attention-3.jpg` |
| Co-op and multiplayer | 4 | The Calling's first playable version is whole: any bosses or a random roster, bots to three, bosses that scale with the group and turn on it, the last two together, a blessing between fights, and an end screen with time, bosses beaten, each player's damage and deaths, and Again; tuned on bots, not yet played by friends. | `tests/calling-browser.cjs`, `docs/scorecard/calling-final-fight.jpg`, `docs/scorecard/blessing-desktop.jpg`, `docs/scorecard/summary-won-desktop.jpg` |
| Menus and HUD | 3 | The title and HUD read cleanly at desktop and phone width, but the title cards carry eyebrow labels ("PLAY WITH FRIENDS", "PLAY ALONE") Aleix's rules forbid. | `docs/scorecard/menu-title-desktop.jpg`, `menu-title-phone.jpg` |
| Performance | 4 | Every Ashmere level runs at the 144 Hz cap on High on this PC (7 ms median), but with 233-762 draw calls and up to 632k triangles, and friends' machines are unmeasured. | `docs/scorecard/levels-high.json` |

## Levels and content: Ashmere

Scored from each level's opening frame only (pass 1); a deeper look plays through it.

| Level | Score | Why | Evidence |
|---|---|---|---|
| 1. The Long Hall | 3 | A torch-lit gaol hall with cells and the first Hollow in sight: a clear first room. | `docs/scorecard/level-long-hall.jpg` |
| 2. The Sunken Keep | 3 | A green-lit flooded corridor with a light shaft, readable but one long hall like Level 1. | `docs/scorecard/level-sunken-keep.jpg` |
| 3. The Burning Town | 3 | A warm-lit timbered street with depth; a blank white sign on the right wall stands out. | `docs/scorecard/level-burning-town.jpg` |
| 4. The Tower | 2 | A bare stone hall with three Hollows by a gate; flat walls, little light, and the wanderer reads as a dark shape. | `docs/scorecard/level-the-tower.jpg` |
| 5. The Final Castle | 3 | A dark courtyard under a red sky with the castle's silhouette; the ground is a bare plane with grass tufts. | `docs/scorecard/level-final-castle.jpg` |
| 6. The Church in the Pass | 3 | The Blender church in a snowy pass; the snow is a flat white that washes out the ground and the HUD panel. | `docs/scorecard/level-the-church.jpg` |
| 7. The Windward Moor | 2 | Rough (v7.38.0): playable to Old Ostrey in Story mode, a slate storm over Stormhill's old layout, but its thralls and porter wear borrowed, re-coloured figures and the porter reads dark at fighting distance. | `docs/scorecard/moor-ostrey.jpg`, `moor-flock.jpg` |
| 8. Saltgrave | 2 | Rough (v7.40.0): playable to the twin castellans on the tower roof in Story mode, both readable and front-lit at fighting distance, but the twins and Salt Knights wear re-coloured stand-in figures and the hall's kneeling statues read dark. | `docs/scorecard/salt-castellans.jpg`, `salt-statues.jpg`, `salt-gatehouse.jpg` |
| 9. The Night Gaol | 2 | Rough (v7.42.0): playable to the Ringer of Thrale in the great ring in Story mode, the evergaol's star-hung cells kept, but the Ringer and the Keyless wear re-coloured stand-in figures, read small and dark on the blue floor, and show no chains. | `docs/scorecard/gaol-ringer.jpg`, `gaol-keyless.jpg`, `ringer-lab.jpg` |
| 10. Aurel, the Gilded City | 2 | Rough (v7.44.0): playable to the Regent Hollis in the throne court in Story mode, the capital's avenue, court and root kept and front-lit gold, but the Regent and the Gilded Thralls wear re-coloured stand-in figures and the Regent reads thin for a boss. | `docs/scorecard/aurel-hollis.jpg`, `aurel-thrall.jpg`, `hollis-lab.jpg` |
| 11. Aurel in Ash | 2 | Rough (v7.46.0): playable to Oswin in the throne in ash in Story mode, the burned capital's streets, fallen lane and cellars kept, embers underfoot; but Oswin and the Cinderfolk wear re-coloured stand-in figures and the streets are dark enough that a Cinderfolk reads mostly as a silhouette. | `docs/scorecard/ash-oswin.jpg`, `ash-cinderfolk.jpg`, `oswin-lab.jpg` |
| 12. The Torn Abbey | 2 | Rough (v7.48.0): playable to Mother Agathe in the rent in Story mode, the ruins adrift kept under a storm of rain and lightning, both she and the Brothers front-lit and readable at fighting distance; but they wear re-coloured stand-in figures (her tall hat reads more bell-ringer than abbess) and nothing on her body changes when the storm comes. | `docs/scorecard/abbey-agathe.jpg`, `abbey-brother.jpg`, `agathe-lab.jpg` |

## Bosses: with 1 and with 3 players

Wins out of 6 against one bot, then against three bots together (time to win, bots fallen of 3). Frames:
`docs/scorecard/boss-<id>.jpg`. A good group fight is won most of the time, takes a while, and costs someone a fall.
Since v7.35.0 (pass 6) every boss scales with the group (`CONFIG.group`: a bar twice as long for three); the 3-player
column is `docs/scorecard/boss-duels-3-bots-grouped.txt`, and the unscaled run it replaced is `boss-duels-3-bots.txt`.

| Boss | Score | 1 player | 3 players | Why |
|---|---|---|---|---|
| Giant Skeleton | 3 | 6/6, 69 s | 6/6, 49 s, 0 fell | Fair alone; a group now needs most of a minute, but nobody falls. |
| Pillager Captain | 3 | 2/6, 68 s | 6/6, 48 s, 0 fell | A real duel alone; a group is hit (2.3 of 3) but never falls. |
| Bell Warden | 3 | 0/6 | 6/6, 72 s, 0 fell | A longer group fight with every bot hit, still without a fall. |
| Aldric (both phases) | 4 | 0/6 | 5/6, 148 s, 1.5 fell | A long group fight that costs falls and is sometimes lost. |
| The Antlered Hunger | 4 | 1/6, 178 s | 5/6, 91 s, 0.5 fell | Won most of the time, with a fall every other fight. |
| Margit | 4 | 0/6 | 6/6, 103 s, 0.5 fell | A group fight with risk: all three get hit, one sometimes falls. |
| Godrick | 2 | 0/6 | 0/6, all 3 fell | Scaled, three bots can't beat it (4/6 unscaled); untested by people. |
| Crucible Knight | 4 | 1/6, 223 s | 4/6, 127 s, 1.3 fell | Slow alone; a real group fight now. |
| Morgott | 2 | 0/6 | 1/6, 171 s, 2.7 fell | Scaled, nearly unbeatable for bots (3/6 unscaled). |
| Godfrey | 2 | 0/6 | 1/6, 181 s, 2.8 fell | Scaled, nearly unbeatable for bots (6/6 unscaled). |
| Maliketh | 2 | 0/6 | 1/6, 170 s, 2.8 fell | Scaled, nearly unbeatable for bots (5/6 unscaled). |
| Radagon | 2 | 0/12 | 1/12, 188 s, 2.8 fell | Since v7.50.1 the Gold Breaker's shockwave leaves time to roll it after the landing (it hit bots on every use); still the hardest for bots, untested by people (`docs/scorecard/radagon-gold-breaker.txt`). |
| Malenia | 2 | 0/6 | 0/6, all 3 fell | Scaled, unbeaten by bots (3/6 unscaled). |

Bots do worse alone than in v7.12.1's record (Ser Quill beat the Bell Warden and Margit 6/6 then, 0/6 now) by design:
v7.13.1 made companions take greedy exchanges and forward rolls (`docs/bot-risk-v7.13.1.md`); with those at 0 they win
those fights 6/6 again, nearly untouched (pass 26, `docs/scorecard/radagon-gold-breaker.txt`).
