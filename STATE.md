# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 29 took Aleix's bots complaint (`.claude/feedback.md`, 2026-11-13, three entries), pass 1, and released
v7.52.0: a temperament per bot and per fight (`BOT_MOODS`), strings waited out from past their reach, rolls away from a
string, mistimed rolls now and then, executions and ripostes left to the player. Check met: three-bot fights 60/132 to
111/132 wins, damage 519 to 368, roll chains 419 to 146, swings into a string 943 to 260
(`docs/scorecard/bot-temperament.txt`); Kneel frames `docs/scorecard/bots-kneel-before-after.jpg`; the three
execution cases in `tests/bot-temperament.cjs`. Next: `PLAN.md` track A item 3, the ending.
Trap: a changelog text with an apostrophe must be written with Edit as `\'` and parsed (`node -e` vm) before commit.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Beastman, Toll Wisp, Grafted Scion,
  Executioner, Crucible Squire, Shover, Antlered Hunger (v7.49.0 skull: `carve()` in its script), Gargoyle (a `tail` bone, wings on `wingL`/`wingR`), Empty Sentinel, Pillager Captain, Bell Warden (`weapon.rest`, an opt-in idle angle), Giant Skeleton (booleans: `carve()`), Aldric (`burn: true` glow slots drawn only while the boss burns, `js/finale.js`). Checked by
  the in-page `model` filter (5 tests), `Shover`, `Bowman`, `Lands`, `Wisp`, `Scion`, `Ultra performance` and
  validation at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
  A near-black material takes the rim light as a white outline, and a broad sheet seen edge-on reads flat white:
  the model's `rim` and a slot's own `rim` (v7.37.0) scale it; `RIM.strength.value = 0` in the lab tells rim from normals; polished
  gold reads grey under the full rim, and a thin shaft white (v7.39.0: model `rim` .45, a `haft` slot at .4).
- Group scaling (v7.35.0): `CONFIG.group`, `groupDef`/`setGroup` (`js/enemy.js`), the server's scaling in
  `tick()`; checked by `tests/group-scaling.cjs` (every boss at 1-5 players) and `boss-only-browser.cjs` (two clients
  draw the server's two-player bars, `docs/scorecard/boss-only-2p-grouped.jpg`).
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` (`server/simulation.js`), `grouped` / `isAreaAttack`
  (`js/enemy.js`); checked by `tests/boss-attention.cjs`, frames `docs/scorecard/boss-attention-1..3.jpg`.
- The Calling, its blessings and its end screen (v7.35.0): `calling()` / `offerBlessings` / `rise` / `fightTally`
  (`server/simulation.js`), `runSummary` (`server/index.cjs`), `BLESSINGS`, `js/multiplayer.js`; checked by
  `tests/calling.cjs`, `blessings.cjs`, `calling-browser.cjs` (frames `docs/scorecard/calling-*`, `summary-*.jpg`).
- The end of Act I (v7.36.0): `LORE.ending`, `showEnding`'s interlude in `js/finale.js` (an ending with a next level),
  `LEVEL_5.next`, chapter 6 in `js/data/story.js`, `goesOn` / THE ROAD GOES ON (`js/story.js`, `js/game-level.js`),
  Continue from a beaten castle goes on (`resume`), the server's `campaignAdvanceTime` getter. Checked by the in-page
  `Story` (18) and `Church` tests and `ARENA_CAMPAIGN=ashmere node tests/campaign-browser.cjs` (not run by CI: the
  default is lands); frames `docs/scorecard/act1-*.jpg` (`.scratch/act1-frames.cjs`).
- Chapters 7-14 (v7.38.0-v7.51.0, rough): `js/levels/windward-moor.js`, `saltgrave.js`, `night-gaol.js`, `aurel.js`,
  `aurel-in-ash.js`, `torn-abbey.js`, `ember-root.js`, `still-mere.js`; bosses in `js/data/bosses/ostrey.js`,
  `castellans.js` (the opt-in `alone` phase), `ringer.js`, `hollis.js`, `oswin.js`, `agathe.js`, `kindling-tree.js`
  (an enemy's `holyLight`), `kings-blade.js` (the player's own moves from `PLAYER_DEF`, a shield `guard`); each an old
  boss's moves renamed, but the King's Blade. In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only: darken with
  another texture. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- Bots (v7.52.0): temperaments, strings, executions: `tests/bot-temperament.cjs`; three-bot fights with behaviour
  counts `node tools/bot-fights.cjs [boss|all] [n]` (`MOODS=1` logs each bot's choices), about five minutes for all.
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs` (`DSF=2
  CLIP=x,y,w,h`, `EVAL=<js>`), `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>` (`HIDEP=1`, `YAWOFF=0.15`,
  `WAIT=ms`), `lab-probe.cjs <id>`, `solo-multi.cjs "<filter>" "<filter>" ...` (several in-page filters, one browser).

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI and the v7.52.0 container: check in pass 30 (v7.51.1's container failed on its changelog; v7.52.0
supersedes it). Pass 29 locally: `bot-behavior`, `bot-temperament`, `bot-follow`, `bot`, `bot-browser`,
`group-scaling`, `calling`, `boss-attention`. Probes (untracked): `.scratch/bot-wait-frames.cjs` (a companion
against one boss move, frames), `giant-duels.cjs` (solo times by mood), `by-move.cjs <boss> <n> [bots]`.

## wip// branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

- (overridable) Bot strength: three bots now win 111/132 boss fights (60 before), more than "a bit"; raising
  the slips moved it little. Knobs: `slip` and `greed` in `BOT_MOODS`. The four temperaments are the loop's.
- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; at +60% six of the eight Lands bosses beat three bots
  every time. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
- (overridable) Until the ending is built, Story mode ends after the Still Mere on THE ROAD GOES ON (`STORY.goesOn`: "The
  ice is still. The end of the road is still being built."), and
  the end-of-Act-I cards are the loop's wording (`LORE.md` section 9), as are Ysolde's lines in the church (section 6).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapters 7-14's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`LORE.md` 6, 7, 10c-10i). HP: Ostrey 3,000 (moor: 6 flasks), Hale and Harrow 1,700
  each (Godrick's damage x0.85), the Ringer 3,000, the Regent 3,400, Oswin 3,800, Agathe 4,000 (her stand-in keeps the
  Toll Wisp's tall hat), the Kindling Tree 4,200 (its stand-in is chapter 6's Hunger stood upright), the King's Blade 4,400 (its second bar
  "the King's Blade, Ember-Worn"; its stand-in is the player's own figure in ash).
