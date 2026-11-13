# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 17 shipped `PLAN.md` stage 3 track A item 2's chapter 9, the Night Gaol (rough, pass 1 of it), and released
v7.42.0. Check met: Saltgrave's castellans lead to chapter 9 and the Ringer's death closes the road (in-page `Story`),
the Ringer in her ring `docs/scorecard/gaol-ringer.jpg`, lab `ringer-lab.jpg`, a cell `gaol-keyless.jpg`. Next: track B,
the Bell Warden in Blender; then track A, chapter 10 (Aurel).

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Beastman, Toll Wisp, Grafted Scion,
  Executioner, Crucible Squire, Shover, Gargoyle (a `tail` bone, wings on `wingL`/`wingR`), Empty Sentinel, Pillager Captain. Checked by
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
- The Calling, its blessings and its end screen (v7.35.0): `C.calling`, `calling()` / `randomRoster()`, `offerBlessings`
  / `bless` / `rise`, `noteDeath` / `fightTally` (`server/simulation.js`), `tally` / `runSummary` (`server/index.cjs`),
  `BLESSINGS` (`js/data/blessings.js`), `#blessingScreen` / `#runSummary` (`js/multiplayer.js`); checked by
  `tests/calling.cjs`, `tests/blessings.cjs`, `tests/calling-browser.cjs` (frames `docs/scorecard/calling-*`,
  `blessing-*`, `summary-*.jpg`).
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
  (`js/lore.js`). In-page `Saltgrave` (9), `Story` (24), `Guiding light`; frames by `.scratch/salt-frames.cjs`.
- Chapter 9, the Night Gaol (v7.42.0, rough): `js/levels/night-gaol.js` (the evergaol's layout), the Ringer of Thrale
  (`js/data/bosses/ringer.js`, the Crucible Knight's moves renamed, no shield, knells), `keyless`; a model's kit weapon
  `size` (`js/bodykit.js`). In-page `Night Gaol` (7).
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

CI on pass 17's push and the v7.42.0 container: check in pass 18 (v7.41.0's CI and container passed). Pass 17 locally:
Node (22/22), in-page `Night Gaol`, `Story`, `Saltgrave`, `Lore`, `Guiding light`, `Changelog`, `model`, `Ultra`.

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
- (overridable) Until chapters 10-14 exist, Story mode ends after the Night Gaol on THE ROAD GOES ON (`STORY.goesOn`), and
  the end-of-Act-I cards are the loop's wording (`LORE.md` section 9), as are Ysolde's lines in the church (section 6).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapter 7's words are the loop's: Ysolde's six lines, the three inscriptions, Ostrey's and the thralls'
  descriptions, and the porter's second phase, "the lantern catches" (`LORE.md` 6, 7, 10c). Ostrey has 3,000 HP and
  the moor grants 6 flasks, as Stormhill did.
- (overridable) Chapter 8's words are the loop's: Ysolde's lines, the three inscriptions, the castellans' split-armour
  story and names (`LORE.md` 6, 7, 10d). Hale and Harrow have 1,700 HP each and Godrick's damage x0.85.
- (overridable) Chapter 9's words are the loop's: Ysolde's lines, the three inscriptions, the Ringer's story and her
  knell, the Keyless (`LORE.md` 6, 7, 10, 10e). The Ringer swings a bell on a haft and has 3,000 HP.
