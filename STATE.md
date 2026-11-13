# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 25 shipped `PLAN.md` stage 3 track A item 2, chapter 13, the Root of the Ember (pass 1, rough), and released
v7.50.0. Check met: Story mode goes on from the Torn Abbey into chapter 13 and its boss, the Kindling Tree, finishes the
level; frames `docs/scorecard/root-tree.jpg`, `root-rootbound.jpg`, `tree-lab.jpg`, `rootbound-lab.jpg`. Next: track B
item 3, the weakest "bosses" or "co-op" row of `SCORECARD.md`; then track A, chapter 14.

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
- Chapter 7, the Windward Moor (v7.38.0, rough): `js/levels/windward-moor.js`, Old Ostrey (`js/data/bosses/ostrey.js`),
  `lanternThrall` / `lanternBearer`; in-page `Moor` (6). Chapters' second steps are in `BACKLOG.md`.
- Chapter 8, Saltgrave (v7.40.0, rough): `js/levels/saltgrave.js` (Stormveil's layout), Hale and Harrow
  (`js/data/bosses/castellans.js`, Godrick's moves split and renamed), the opt-in `alone` phase (`checkPhaseAt`; `kin`
  from `Game.spawnZone` and Arena groups; no kin = alone at once), `saltKnight`, statue `of`/`pose: 'kneel'`
  (`js/lore.js`). In-page `Saltgrave` (9), `Story` (24), `Guiding light`; frames by `.scratch/salt-frames.cjs`.
- Chapter 9, the Night Gaol (v7.42.0, rough): `js/levels/night-gaol.js`, the Ringer (`js/data/bosses/ringer.js`, the
  Crucible Knight's moves renamed), `keyless`; kit weapon `size`. In-page `Night Gaol` (7).
- Chapters 10-12 (v7.44.0-v7.48.0, rough): `js/levels/aurel.js`, `aurel-in-ash.js`, `torn-abbey.js`; bosses in
  `js/data/bosses/hollis.js`, `oswin.js`, `agathe.js` (Morgott's, Godfrey's, Maliketh's moves renamed). In-page `Aurel`
  (5), `Aurel in Ash` (5), `Torn Abbey` (7). A material's `tint` sets hue only: darken with another texture.
- Chapter 13, the Root of the Ember (v7.50.0, rough): `js/levels/ember-root.js`, the Kindling Tree and the Rootbound
  (`js/data/bosses/kindling-tree.js`: Radagon's and the Golden Zealot's moves), an enemy's opt-in `holyLight` (blink and
  mark colours: `js/holy.js`, `effect-lighting.js`, `ultra-fx.js`), the `emberbark` ground. In-page `Ember Root` (5).
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`, and
  `[BOTS=3] node tests/bot-duel.cjs all 6 600` (bots against every boss, headless, about a minute).
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs` (`DSF=2
  CLIP=x,y,w,h`, `EVAL=<js>`), `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>` (`HIDEP=1`, `YAWOFF=0.15`,
  `WAIT=ms`), `lab-probe.cjs <id>`, `solo-multi.cjs "<filter>" "<filter>" ...` (several in-page filters, one browser).

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI on pass 25's push and the v7.50.0 container: check in pass 26 (pass 24's v7.49.0 container green, its CI still
running at pass 25's end; pass 23's CI was cancelled by pass 24's push). Pass 25 locally: Node 22/22, in-page `Ember
Root`, `Story`, `Torn Abbey`, `Guiding light`, `Lore`, `valid`, `Changelog`, `model`, `Radagon`, `Ultra`, `light` (all pass).

## wip// branches

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
- (overridable) Until chapter 14 exists, Story mode ends after the Root of the Ember on THE ROAD GOES ON (`STORY.goesOn`), and
  the end-of-Act-I cards are the loop's wording (`LORE.md` section 9), as are Ysolde's lines in the church (section 6).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapters 7-13's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`LORE.md` 6, 7, 10c-10i). HP: Ostrey 3,000 (moor: 6 flasks), Hale and Harrow 1,700
  each (Godrick's damage x0.85), the Ringer 3,000, the Regent 3,400, Oswin 3,800, Agathe 4,000 (her stand-in keeps the
  Toll Wisp's tall hat), the Kindling Tree 4,200 (its stand-in is chapter 6's Hunger stood upright).
