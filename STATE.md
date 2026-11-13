# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

- Track A (pass 37, item 2, Ostrey pass 1 of 2, v7.58.0): his own Blender figure (bar, hanging lantern) and moves;
  check: on the bridge his tells differ and the lantern opens at 55%. `docs/scorecard/ostrey-*.jpg`, in-page `Moor`.
  Pass 2 (optional): the bridge level, the lantern-overhead tells. Else next: Hale and Harrow.
- Pass 33 (v7.56.0, render-scale complaint; `PLAN.md` item 3's 100% part): every preset draws native (`qualityDraw`,
  `js/visuals.js`); numbers, close-ups: `git show v7.56.0:docs/render-scale-v7.56.0.md`. In-page `Graphics`, `High`, `Low performance`.
- Bots (pass 35, v7.57.0): full stats; the aid is behaviour (`CONFIG.bot.support`). `docs/scorecard/bot-aid.txt`.
- Pass 36 (clean-up item 2, lean files): `docs/` keeps only the homelab guides, `how-online-works.html` and
  `scorecard/`; one `STORY.md` (part one: in the game, `LORE.md`'s numbering; part two: where it goes); `README.md`
  one screen. Old notes: `git show v7.56.0:docs/<file>`. Next in this slot: track B item 1.
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
  the model's `rim` and a slot's own `rim` (v7.37.0) scale it; gold and thin shafts want a lower `rim` (v7.39.0).
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
  boss's moves renamed, but the King's Blade and Ostrey (v7.58.0: baked `weapon: true` parts, `anim.hang`, `halos`, `breathFrom`). In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only: darken with
  another texture. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30): `LEVEL_14.ending`, `LORE.endings['still-mere']`, the credits in `js/finale.js`; checked
  by the in-page `King's Blade's death` and `Still Mere:` tests and `tests/campaign-browser.cjs`.
  `solo-browser.cjs` fails if the page throws while loading (a suite with a syntax error used to drop its tests unseen).
- Bots: temperaments, strings, executions, openings, backup: `tests/bot-temperament.cjs`; caution, room, rings:
  `bot-behavior.cjs`; three-bot fights `node tools/bot-fights.cjs [boss|story|all] [n]` (`story 10`: 25 min;
  `PERSON=1`: one stands in for a person).
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs`,
  `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>`, `lab-probe.cjs <id>`, `solo-multi.cjs "<f>" "<f>" ...`.

## Broken

- `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI and the container of v7.58.0 (pushes cancel each other's CI: look at the newest finished run). Probes (untracked): `.scratch/ending-frames.cjs`, `title-shots.cjs`, `render-scale.cjs`
(`VIEW`, `PRESETS`, `VARIANTS`, `ROOT`), `pass-probe.cjs`.

## wip// branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

- (overridable) Bots at full stats (v7.57.0): 121/130 three-bot wins, 43 deaths; a person gets 80% of executions.
  Feel check with friends: do they still carry?
- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; tuned when the Lands bosses still existed. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
- (overridable) The ending's cards are the loop's wording of `STORY.md` 9b.
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapters 7-14's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`STORY.md` 6, 7, 10c-10j). HP: Ostrey 3,000 (moor: 6 flasks), Hale and Harrow 1,700
  each (Godrick's damage x0.85), the Ringer 3,000, the Regent 3,400, Oswin 3,800, Agathe 4,000 (her stand-in keeps the
  Toll Wisp's tall hat), the Kindling Tree 4,200 (its stand-in is chapter 6's Hunger stood upright), the King's Blade 4,400 (its second bar
  "the King's Blade, Ember-Worn"; its stand-in is the player's own figure in ash).
