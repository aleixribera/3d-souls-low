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
| Characters and art | 3 | The wanderer, 13 enemies and the Antlered Hunger are Blender models; Aldric, the Bell Warden, the Pillager Captain, the Giant Skeleton, the Gargoyle and the Empty Sentinel are still hand-built geometry. | `docs/scorecard/boss-*.jpg`, `js/baked/` |
| Levels and content | 3 | Six levels, each with its own light and look; from their opening frames most read as plain corridors and squares (rows below). | `docs/scorecard/level-*.jpg` |
| Bosses | 2 | Alone they hold up, but no boss scales with the group: three players beat every Ashmere boss in 20-61 s and none of them falls. | `docs/scorecard/boss-duels-1-bot.txt`, `boss-duels-3-bots.txt` |
| Co-op and multiplayer | 2 | The public lobby, bots and boss runs work, but there is no mode built for a group yet (The Calling, `PLAN.md` stage 2), and group fights are too easy. | `tests/multiplayer.cjs`, `tests/boss-only.cjs`, `docs/scorecard/boss-duels-3-bots.txt` |
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

## Bosses: with 1 and with 3 players

Wins out of 6 against one bot, then against three bots together (time to win, bots fallen of 3). Frames:
`docs/scorecard/boss-<id>.jpg`. A good group fight is won most of the time, takes a while, and costs someone a fall.

| Boss | Score | 1 player | 3 players | Why |
|---|---|---|---|---|
| Giant Skeleton | 2 | 6/6, 69 s | 6/6, 20 s, 0 fell | Fair alone; a group kills it in 20 s and is barely hit (0.3 of 3). |
| Pillager Captain | 2 | 2/6, 68 s | 6/6, 22 s, 0 fell | A real duel alone; trivial for a group. |
| Bell Warden | 2 | 0/6 | 6/6, 29 s, 0 fell | The bot can't beat it alone; a group barely gets hit (0.3 of 3). |
| Aldric (both phases) | 3 | 0/6 | 6/6, 61 s, 0 fell | The longest Ashmere group fight, but nobody falls. |
| The Antlered Hunger | 2 | 1/6, 178 s | 6/6, 37 s, 0 fell | Hard alone; easy for a group. |
| Margit | 4 | 0/6 | 5/6, 47 s, 0.7 fell | A group fight with risk: all three get hit, one sometimes falls. |
| Godrick | 4 | 0/6 | 4/6, 63 s, 1.0 fell | Hard for a group too: a fall in every fight on average. |
| Crucible Knight | 2 | 1/6, 223 s | 6/6, 41 s, 0 fell | Slow alone; easy for a group. |
| Morgott | 4 | 0/6 | 3/6, 81 s, 1.7 fell | The closest group fight: half the runs are lost. |
| Godfrey | 3 | 0/6 | 6/6, 63 s, 0.2 fell | Everyone is hit, but the group always wins. |
| Maliketh | 4 | 0/6 | 5/6, 62 s, 0.8 fell | A group fight with risk. |
| Radagon | 1 | 0/6 | 0/6, all 3 fell | Unbeaten by one bot or three: too hard for bots, untested by people. |
| Malenia | 3 | 0/6 | 3/6, 126 s, 1.5 fell | Hard and long for a group, as intended for the last boss. |

Bots also do worse alone than in v7.12.1's record (Ser Quill beat the Bell Warden and Margit 6/6 then, 0/6 now):
`.scratch/bot-duel-v7.12.1-final.json` (local only) against `docs/scorecard/boss-duels-1-bot.txt`; see `BACKLOG.md`.
