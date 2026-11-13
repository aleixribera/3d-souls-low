# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

- Track A (pass 30, item 1, v7.53.0): the story's ending; frames `docs/scorecard/ending-*.jpg`, in-page `Still Mere:`.
  Next on the track: item 2, Ostrey redone.
- Pass 31 (`PLAN.md` clean-up item 1, v7.54.0): the Lands and the Elden Ring bosses left; Boss Rush and the Arena list
  the story's 14 bosses. Checked: in-page `Story boss`, `calling-browser.cjs`, `boss-battle-browser.cjs`.
- Bots (pass 32, v7.55.0): an aid, not a carry; check `docs/scorecard/bot-aid.txt`.
- Pass 34 (Broken): CI's one red on main (the King's Blade meter test) and the `#dev` title overlap fixed; the
  v7.54.0 and v7.55.0 containers published. Next in this slot: `PLAN.md` clean-up item 2.
- Trap: a changelog text with an apostrophe must be written with Edit as `\'` and parsed (`node -e` vm) before
  commit; Python and heredocs in Git Bash here drop backslashes, so edit such text with the Edit tool.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Toll Wisp,
  Executioner, Shover, Antlered Hunger, Gargoyle (a `tail` bone, wings on `wingL`/`wingR`), Empty Sentinel, Pillager Captain, Bell Warden (`weapon.rest`, an opt-in idle angle), Giant Skeleton (booleans: `carve()`), Aldric (`burn: true` glow slots drawn only while the boss burns, `js/finale.js`). Checked by
  the in-page `model` filter, `Shover`, `Bowman`, `Wisp`, `Ultra performance` and
  validation at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
  A near-black material takes the rim light as a white outline, and a broad sheet seen edge-on reads flat white:
  the model's `rim` and a slot's own `rim` (v7.37.0) scale it; `RIM.strength.value = 0` in the lab tells rim from
  normals; gold and thin shafts want a lower `rim` (v7.39.0).
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
  `Story` and `Church` tests and `tests/campaign-browser.cjs` (Ashmere, the one road since v7.54.0); frames `docs/scorecard/act1-*.jpg` (`.scratch/act1-frames.cjs`).
- Chapters 7-14 (v7.38.0-v7.51.0, rough): `js/levels/windward-moor.js`, `saltgrave.js`, `night-gaol.js`, `aurel.js`,
  `aurel-in-ash.js`, `torn-abbey.js`, `ember-root.js`, `still-mere.js`; bosses in `js/data/bosses/ostrey.js`,
  `castellans.js` (the opt-in `alone` phase), `ringer.js`, `hollis.js`, `oswin.js`, `agathe.js`, `kindling-tree.js`
  (an enemy's `holyLight`), `kings-blade.js` (the player's own moves from `PLAYER_DEF`, a shield `guard`); each an old
  boss's moves renamed, but the King's Blade. In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only: darken with
  another texture. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30): `LEVEL_14.ending`, `LORE.endings['still-mere']`, the credits in `js/finale.js`; checked
  by the in-page `King's Blade's death` and `Still Mere:` tests and `tests/campaign-browser.cjs`.
  `solo-browser.cjs` fails if the page throws while loading (a suite with a syntax error used to drop its tests unseen).
- Bots (v7.52.0, v7.55.0): temperaments, strings, executions: `tests/bot-temperament.cjs`; caution, room, rings:
  `bot-behavior.cjs`; three-bot fights `node tools/bot-fights.cjs [boss|story|all] [n]` (`story 10`: 25 min).
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs` (`DSF=2
  CLIP=x,y,w,h`, `EVAL=<js>`), `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>` (`HIDEP=1`, `YAWOFF=0.15`,
  `WAIT=ms`), `lab-probe.cjs <id>`, `solo-multi.cjs "<filter>" "<filter>" ...` (several in-page filters, one browser).

## Broken

- `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI on pass 34's push: check in the next pass (pushes cancel each other's CI, so look at the newest finished run). Probes
(untracked): `.scratch/ending-frames.cjs` (`VIEW=WxH TAG=x`, the ending's frames), `.scratch/title-shots.cjs` (title frames).

## wip// branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

- (overridable) Bot strength (v7.55.0): 75% damage (`CONFIG.bot.damage`; 0.8: 117/130, 59 deaths), more caution:
  113/130 story wins; a bot dies 35% less a minute, but bot-only fights last 1.8x as long.
- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; tuned when the Lands bosses still existed. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
- (overridable) The ending's cards are the loop's wording of `STORY.md` "The ending" (`LORE.md` 9b).
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapters 7-14's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`LORE.md` 6, 7, 10c-10i). HP: Ostrey 3,000 (moor: 6 flasks), Hale and Harrow 1,700
  each (Godrick's damage x0.85), the Ringer 3,000, the Regent 3,400, Oswin 3,800, Agathe 4,000 (her stand-in keeps the
  Toll Wisp's tall hat), the Kindling Tree 4,200 (its stand-in is chapter 6's Hunger stood upright), the King's Blade 4,400 (its second bar
  "the King's Blade, Ember-Worn"; its stand-in is the player's own figure in ash).
