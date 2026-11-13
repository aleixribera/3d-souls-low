# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 13 shipped `PLAN.md` stage 3 track A item 2's first chapter, chapter 7 the Windward Moor (pass 1 of it, rough),
and released v7.38.0. Check met: Story mode goes church -> moor -> THE ROAD GOES ON (in-page `Story`, `Moor`); frames
`docs/scorecard/moor-ostrey.jpg` (Old Ostrey on the gate bridge) and `moor-flock.jpg` (a Lantern Thrall flock). Next:
track B, the Empty Sentinel in Blender; then track A's chapter 8, Saltgrave.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0), Beastman of Farum Azula (v7.29.0, 2,800 body tris, 2,926 with the scimitar), Toll Wisp (v7.30.0,
  2,881 tris, no kit part), Grafted
  Scion (v7.31.0, 2,774 body tris, 2,900 with the scimitar), Executioner (v7.32.0, 2,687 body tris, 2,991 with the
  greataxe), Crucible Squire (v7.33.0, 2,190 body tris, 2,992
  with the kit oval shield and greatsword), Shover (v7.34.0, 2,428 body tris, 2,988 with the kit pavise), Gargoyle (v7.37.0, 2,992 tris, no weapon; a `tail`
  bone, wings on `wingL`/`wingR`). `js/baked/*.js`; checked by the in-page `model`
  filter (5 tests), `Shover` (1), `Bowman` (4), `Lands` (15), `Wisp` (1), `Scion`, `Ultra performance` and validation
  at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
  A near-black material takes the rim light as a white outline, and a broad sheet seen edge-on reads flat white:
  the model's `rim` and a slot's own `rim` (v7.37.0) scale it; `RIM.strength.value = 0` in the lab tells rim from normals.
- Group scaling (v7.35.0): `CONFIG.group`, `groupDef`/`setGroup` (`js/enemy.js`), the server's scaling in
  `tick()`; checked by `tests/group-scaling.cjs` (every boss at 1-5 players) and `boss-only-browser.cjs` (two clients
  draw the server's two-player bars, `docs/scorecard/boss-only-2p-grouped.jpg`). Tests that pinned Margit's solo bar in
  group sessions now read her scaled bar or her share of it.
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` / `noteDamage` in `server/simulation.js`,
  `grouped` and `isAreaAttack` in `js/enemy.js`; checked by `tests/boss-attention.cjs` (seeded bot fights through
  `createSimulation({ seed })`), frames `docs/scorecard/boss-attention-1..3.jpg`, `boss-attention.txt`.
- The Calling (v7.35.0): `C.calling`, `calling()` / `randomRoster()` in `server/simulation.js`, the lobby's
  roster and pick list in `js/multiplayer.js`; checked by `tests/calling.cjs` and `tests/calling-browser.cjs` (two
  browsers and a bot finish a 3-boss run; frames `docs/scorecard/calling-*.jpg`).
- Blessings (v7.35.0): `CONFIG.blessings`, `BLESSINGS` (`js/data/blessings.js`), `Player.bless` /
  `riseBody`, the server's `offerBlessings` / `bless` / `rise`, the pick screen `#blessingScreen`; checked by
  `tests/blessings.cjs` and `tests/calling-browser.cjs` (frames `docs/scorecard/blessing-*.jpg`).
- The end of a Calling run (v7.35.0): `tally` / `runSummary` in `server/index.cjs`, `noteDeath` / `fightTally` in
  `server/simulation.js`, the screen `#runSummary` in `js/multiplayer.js`; checked by `tests/calling.cjs` and
  `tests/calling-browser.cjs` (frames `docs/scorecard/summary-*.jpg`). A dead pose within `C.riseAnswer` of a granted
  Rise Again is not a new fall (`tests/blessings.cjs`).
- The end of Act I (v7.36.0): `LORE.ending`, `showEnding`'s interlude in `js/finale.js` (an ending with a next level),
  `LEVEL_5.next`, chapter 6 in `js/data/story.js`, `goesOn` / THE ROAD GOES ON (`js/story.js`, `js/game-level.js`),
  Continue from a beaten castle goes on (`resume`), the server's `campaignAdvanceTime` getter. Checked by the in-page
  `Story` (18) and `Church` tests and `ARENA_CAMPAIGN=ashmere node tests/campaign-browser.cjs` (not run by CI: the
  default is lands); frames `docs/scorecard/act1-*.jpg` (`.scratch/act1-frames.cjs`).
- Chapter 7, the Windward Moor (v7.38.0, rough): `js/levels/windward-moor.js` (Stormhill's layout), Old Ostrey
  (`js/data/bosses/ostrey.js`, Margit's engineering renamed through one table, no golden weapons; stand-in figure the
  Shover re-coloured), `lanternThrall` / `lanternBearer` (stand-ins: Hollow Soldier, Toll Wisp re-coloured). Checked by
  the in-page `Moor` (6), `Story` (21) and `Church` tests. Its second step is in `BACKLOG.md`.
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]` (headless Edge, High), and
  `[BOTS=3] node tests/bot-duel.cjs all 6 600` (bots against every boss in the headless simulation, about a minute).
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab, 1600x640), `lab-zoom.cjs`
  (same with `DSF=2 CLIP=x,y,w,h`, CSS pixels of the 1600 view), `enemy-play.cjs <q> <dist> <levelId> <enemyId[#n]>`
  (a frame in a level; `HIDEP=1` hides the player; `YAWOFF=0.15` puts the camera nearly in front of the enemy's
  facing, default 0.55; it sets the player to a raised enemy's y, but it can still fall off a ledge, so pick a spot
  with floor in front: the Tower's west-stair Shover works), `lab-probe.cjs <id>` (hides each mesh in turn; `TRY=`,
  `TEX=1`, `NOSHADOW=1` modes), `normals-probe.cjs`. `enemy-play.cjs` takes `arena` as the level (a 1v1 duel) and
  `WAIT=ms`; `lab-zoom.cjs` takes `EVAL=<js>` run in the page before the shot.

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI on pass 13's push and the v7.38.0 container: check in pass 14 (pass 12's CI was still running). Pass 13 locally: the Node group (22/22), the in-page `Story` (21), `Church` (12), `Lore` (7), `Moor` (6),
`model` (5) and `Levels` filters. `ARENA_CAMPAIGN=ashmere node tests/campaign-browser.cjs` now lists chapter 7 but was not run.

## wip/ branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

The earlier three (order of work, how to see progress, the Toll Wisp's description) are answered in `PLAN.md`.

- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; at +60% six of the eight Lands bosses beat three bots
  every time. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
- (overridable) Until chapters 7-14 exist, Story mode ends after the church on THE ROAD GOES ON, "Thrale lies beyond
  the pass. Its chapters are still being built." (`STORY.goesOn`), and the end-of-Act-I cards are the loop's wording
  (`LORE.md` section 9), as are Ysolde's lines in the church (section 6).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapter 7's words are the loop's: Ysolde's six lines, the three inscriptions, Ostrey's and the thralls'
  descriptions, and the porter's second phase, "the lantern catches" (`LORE.md` 6, 7, 10c). Ostrey has 3,000 HP and
  the moor grants 6 flasks, as Stormhill did.
