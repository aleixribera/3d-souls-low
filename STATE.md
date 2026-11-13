# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

- Track A (pass 47, item 2, v7.68.0): Oswin pass 1 of 2 shipped: Blender figure, 17 own moves, the `seam` and `erupt`
  hit fields (the floor cracks and stays cracked; called up, every crack burns), drawn by `js/ember-seams.js`; also
  v7.66.0's six red CI tests (old-Hollis assumptions) and `canParryHit`. `docs/scorecard/oswin-lab.jpg`,
  `aurel-in-ash-oswin.jpg`, in-page `Aurel in Ash`. Pass 2 (bots and seams, figure) in BACKLOG; next: Agathe (ch. 12).
- Pass 33 (v7.56.0, render-scale complaint; `PLAN.md` item 3's 100% part): every preset draws native (`qualityDraw`,
  `js/visuals.js`); numbers, close-ups: `git show v7.56.0:docs/render-scale-v7.56.0.md`. In-page `Graphics`, `High`, `Low performance`.
- Bots (pass 38, v7.59.0, feedback): roll only at blows that can reach them (`clearOf`/`carry`), wait less.
  `docs/scorecard/bot-aid.txt`.
- Track B (pass 46, v7.69.0, item 2 done): kill moment, streak, par, swift kill, next boss drops in, end-screen
  times; bot falls 18% / 40% (fight 1 / 10), cut to BACKLOG. Next: item 3 (lobby done, `js/ui-theme.js`;
  blessing pick, title, Practice, options, pause, end of run). Boss Rush: id `boss-rush`, kind `calling`, 30 s pick.
- Lean files (pass 36): one `STORY.md`; old docs: `git show v7.56.0:docs/<file>`.
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
- Pace, not team size (v7.65.0): `CONFIG.pace`, `rushPace`/`tellRate` (`js/enemy.js`), `setRushFight`
  (`server/simulation.js`); `tests/boss-pace.cjs`, `boss-only-browser.cjs`. Between fights (v7.69.0): `CONFIG.swift`,
  `rushPar`, `fought`, `js/kill-moment.js`; `tests/rush-flow.cjs`.
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` (`server/simulation.js`), `grouped` / `isAreaAttack`
  (`js/enemy.js`); `tests/boss-attention.cjs`.
- Boss Rush (once The Calling), its blessings, end screen (v7.35.0): `calling()` / `offerBlessings` / `rise` / `fightTally`
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
  boss's moves renamed, but the King's Blade, Ostrey and the castellans (v7.58.0, v7.62.0: baked `weapon: true` parts, `anim.hang`, `halos`, `breathFrom`). In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only: darken with
  another texture. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30): `LEVEL_14.ending`, `LORE.endings['still-mere']`, the credits in `js/finale.js`; checked
  by the in-page `King's Blade's death` and `Still Mere:` tests and `tests/campaign-browser.cjs`.
  `solo-browser.cjs` fails if the page throws while loading (a suite with a syntax error used to drop its tests unseen).
- Bots: temperaments, strings, executions, openings, backup: `tests/bot-temperament.cjs`; caution, room, rings, reach:
  `bot-behavior.cjs`; `node tools/bot-fights.cjs story 10` (10 min; `PERSON=1`: a person stand-in).
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs`,
  `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>`, `lab-probe.cjs <id>`, `solo-multi.cjs "<f>" "<f>" ...`.

## Broken

- `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI and container of v7.69.0 (pushes cancel CI: see the newest run). Probes
(untracked, `.scratch/`): `render-scale.cjs` (`VIEW`, `PRESETS`, `VARIANTS`, `ROOT`), `pass-probe.cjs`.

## wip// branches

- None.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

- (overridable) The shared UI look (v7.63.0 lobby, `docs/scorecard/lobby-v2/`): Apex's mode list over one Start,
  Valorant's party column, Destiny 2's device hints. Right before the title follows?
- (overridable) Bots (v7.59.0): 121/130 three-bot wins, 45 deaths; a person gets 82% of executions.
  Feel check with friends: do they still carry?
- (overridable) Practice groups hold up to 6 (`CONFIG.practice.maxGroup`).
- (overridable) Boss health is now set by a lone bot's time (about 3 min, a skilled person's minute), not a ladder:
  the Kindling Tree (2,500) and the King's Blade (3,000) sit below Agathe (3,200).
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health.
  Rise Again is once a fight, not once a run.
- (overridable) Swift kill (v7.69.0): par 45 s, more with pace or a pair, adds a card; a kill says "Boss 7 down".
- (overridable) The ending's cards are the loop's wording of `STORY.md` 9b.
- (overridable) The end screen's titles: "The crown answered" for a won Calling, "Team wiped" for a lost one; the run
  time counts from the leader's start, the opening card and blessing picks included.
- (overridable) Chapters 7-14's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`STORY.md` 6, 7, 10c-10j). HP (v7.65.0): Ostrey 3,000, Hale and Harrow 1,700
  each, the Ringer 3,000, the Regent 2,600, Oswin 3,500, Agathe 3,200, the Kindling Tree 2,500, the King's Blade 3,000.
