# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 15 shipped `PLAN.md` stage 3 track A item 2's next chapter, chapter 8 Saltgrave, rough (pass 1 of it), and
released v7.40.0. Check met: Story mode goes on from the moor to Saltgrave; the twin castellans readable on the tower
roof (`docs/scorecard/salt-castellans.jpg`), the kneeling statues (`salt-statues.jpg`), Ysolde (`salt-gatehouse.jpg`).
Also fixed CI's `Guiding light` failure (the moor had no bonfire routes since v7.38.0). Next: track B item 2, the
Pillager Captain; then chapter 9.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Beastman, Toll Wisp, Grafted Scion,
  Executioner, Crucible Squire, Shover, Gargoyle (a `tail` bone, wings on `wingL`/`wingR`), Empty Sentinel. Checked by
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
- Chapter 7, the Windward Moor (v7.38.0, rough): `js/levels/windward-moor.js`, Old Ostrey (`js/data/bosses/ostrey.js`),
  `lanternThrall` / `lanternBearer`; in-page `Moor` (6). Second step in `BACKLOG.md`.
- Chapter 8, Saltgrave (v7.40.0, rough): `js/levels/saltgrave.js` (Stormveil's layout), Hale and Harrow
  (`js/data/bosses/castellans.js`, Godrick's moves split and renamed), the opt-in `alone` phase (`checkPhaseAt`; `kin`
  from `Game.spawnZone` and Arena groups; no kin = alone at once), `saltKnight`, statue `of`/`pose: 'kneel'`
  (`js/lore.js`). In-page `Saltgrave` (7), `Story` (22), `Guiding light`; frames by `.scratch/salt-frames.cjs`.
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]` (headless Edge, High), and
  `[BOTS=3] node tests/bot-duel.cjs all 6 600` (bots against every boss in the headless simulation, about a minute).
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs` (`DSF=2
  CLIP=x,y,w,h`, `EVAL=<js>`), `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>` (`HIDEP=1`, `YAWOFF=0.15`,
  `WAIT=ms`; pick a spot with floor in front of a raised enemy), `lab-probe.cjs <id>` (`TRY=`, `TEX=1`, `NOSHADOW=1`),
  `normals-probe.cjs`, `salt-frames.cjs`.

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI on pass 15's push and the v7.40.0 container: check in pass 16 (the v7.39.0 container passed; CI on pass 14's
STATE push failed only on `Guiding light`, fixed in pass 15). Pass 15 locally: Node group (22/22), in-page
`Saltgrave`, `Story`, `Moor`, `Lore`, `Ultra`, `Guiding light`.

## wip/ branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; at +60% six of the eight Lands bosses beat three bots
  every time. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
- (overridable) Until chapters 9-14 exist, Story mode ends after Saltgrave on THE ROAD GOES ON (`STORY.goesOn`), and
  the end-of-Act-I cards are the loop's wording (`LORE.md` section 9), as are Ysolde's lines in the church (section 6).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapter 7's words are the loop's: Ysolde's six lines, the three inscriptions, Ostrey's and the thralls'
  descriptions, and the porter's second phase, "the lantern catches" (`LORE.md` 6, 7, 10c). Ostrey has 3,000 HP and
  the moor grants 6 flasks, as Stormhill did.
- (overridable) Chapter 8's words are the loop's: Ysolde's lines, the three inscriptions, the castellans' split-armour
  story and names (`LORE.md` 6, 7, 10d). Hale and Harrow have 1,700 HP each and Godrick's damage x0.85.
