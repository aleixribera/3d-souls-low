# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

- Track A (pass 97): PLAN 3d rough: sparring (`js/sparring.js`, `js/data/sparring.js`, `js/levels/sparring.js`): a
  pale teacher (Player + BotHands, `Game.teacher`) shows each drill, the player copies it on a partner; before a new
  player's first Story road / Boss Rush, 3 launch offers to old saves, Practice, lobby; ~50 s. In-page `pass 97` (a
  bot does each drill). Counter window: halo + closing ring (`counterFx.aura`), judge 3 to 7 twice. Next: Controls
  clips (BACKLOG), the Finishing Blow's look.
- Track B (pass 96): v7.123.0 "fixes from Aleix's run" 1-4: one count, the fight (server `tally.won`/`at`, board
  `reached`); no stamina, guard bar or player poise; only `heavy: true` attacks stagger (amber wind-up,
  `VISUALS.heavyTell`); blocks chip (`CONFIG.block`), undeflectable melee is `rollOnly`; no rend; keys bottom centre;
  rares first. Curve back on pass 90's targets with `pace.rise` .55, press 1.3/1.4
  (`docs/scorecard/rush-curve-pass96.txt`, HUD `pass96-hud-*.jpg`). Next: PLAN item 6 (the name), Story's curve.
  `PS.PARRY` is dead.
- Lean files (pass 36): one `STORY.md`; old docs: `git show v7.56.0:docs/<file>`.
- Release: `node tools/release.cjs "<title>" "<text>"` (any apostrophe is fine). Don't wait on CI after a push.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Toll Wisp,
  Executioner, Shover, Antlered Hunger, Gargoyle (`tail`, `wingL`/`wingR`), Empty Sentinel, Pillager Captain, Bell Warden (`weapon.rest`), Giant Skeleton (`carve()`), Aldric (`burn: true` glow slots drawn only while the boss burns, `js/finale.js`). Checked by
  the in-page `model` filter, `Shover`, `Bowman`, `Wisp`, `Ultra performance` and
  validation at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
  A near-black material takes the rim light as a white outline, and a broad sheet seen edge-on reads flat white:
  the model's `rim` and a slot's own `rim` (v7.37.0) scale it; gold and thin shafts want a lower `rim` (v7.39.0).
- Pace: `CONFIG.pace`, `CONFIG.enemy.press`, `rushPace`, `bossMove`; `tests/boss-pace.cjs`, `rush-flow.cjs`;
  `tools/rush-curve.cjs bosses|runs|pairs` (`SKILLED=1`, `KIT=`). Practice's Speed: `CONFIG.practice.fights`.
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` (`server/simulation.js`), `grouped` / `isAreaAttack`
  (`js/enemy.js`); `tests/boss-attention.cjs`.
- Menus (pass 51, v7.72.0): title style everywhere, `optionsItems`, `pauseFacts`, `#runSummary`, Controls (`controlRows`); in-page `Menus:`.
- Boss Rush (pass 65-73): `calling`, `offerAbilities`, `RUSH`, `CONFIG.endless`, `rushHealth`, `pickHold`
  (`server/simulation.js`); `tests/calling.cjs`, `calling-browser.cjs`, `rush-alone-browser.cjs`. Weekly: `tests/weekly.cjs`.
- Revive (pass 64): `js/revive.js`, `runTitles`; `tests/revive.cjs`, `revive-browser.cjs`.
- The end of Act I (v7.36.0): `LORE.ending`, `showEnding` (`js/finale.js`), `LEVEL_5.next`, `goesOn`, `resume`,
  `campaignAdvanceTime`; in-page `Story`, `Church`, `tests/campaign-browser.cjs`; `docs/scorecard/act1-*.jpg`.
- Chapters 7-14 (v7.38.0-v7.51.0, rough): `js/levels/windward-moor.js`, `saltgrave.js`, `night-gaol.js`, `aurel.js`,
  `aurel-in-ash.js`, `torn-abbey.js`, `ember-root.js`, `still-mere.js`; bosses in `js/data/bosses/ostrey.js`,
  `castellans.js` (the opt-in `alone` phase), `ringer.js`, `hollis.js`, `oswin.js`, `agathe.js`, `kindling-tree.js`
  (an enemy's `holyLight`), `kings-blade.js` (own moves since pass 55); each an old
  boss's moves renamed, but the King's Blade, Ostrey and the castellans (v7.58.0, v7.62.0: baked `weapon: true` parts, `anim.hang`, `halos`, `breathFrom`). In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30; over the world, pass 82): `LORE.endings`, `tellEnding` in `js/finale.js`; in-page
  `Story moments:` (`inControl`), `Still Mere:`, `tests/campaign-browser.cjs`; `moments-*.jpg`.
- Story's road (pass 79): `CONFIG.story.road`, `might`, `roadMight`/`roadFlasks`, `flaskFinds` (save `finds`);
  in-page `Story road:`, `Story: a flask`; `tools/story-curve.cjs`.
- Bots: temperaments, strings, executions, openings, backup: `tests/bot-temperament.cjs`; caution, room, rings, reach:
  `bot-behavior.cjs`; `node tools/bot-fights.cjs story 10` (10 min; `PERSON=1`: a person stand-in).
- Scorecard frames: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab), `lab-zoom.cjs`,
  `enemy-play.cjs <q> <dist> <levelId|arena> <enemyId[#n]>`, `lab-probe.cjs <id>`, `solo-multi.cjs "<f>" "<f>" ...`.

## Broken

- `boss-only` (Node) is flaky: see `BACKLOG.md`.
- `lobby-polish-browser` (not in CI): flaky, a click times out now and then (passes 8, 52).

## Queued runs

None (read the newest CI run). Probes (untracked, `.scratch/`): `render-scale.cjs`.

## wip// branches

None. Backlog: `BACKLOG.md`.

## Needs Aleix

- (overridable) Sparring: a pale teacher shows each of 9 drills, you copy it; skippable.
- (overridable) The skilled player is the bot with a quarter of its mistimed rolls (`SKILLED=1`).
- (overridable) Revive: 3 s in a 1.5 m ring, up with a third of the bar, in every party boss fight; titles' wording.
- (overridable) Endless: modifiers from fight 8, pairs from 9; warm-up bosses at 55-85% health; legendaries a third weaker.
- (overridable) Pass 93: Aldric's Gaoler's Stamp is gone; each phase keeps 2 undeflectable big moments. A quarter
  can't hold while area hits and leaps stay undeflectable (92 of 197 boss attacks).
- (overridable) Ember Twin is an ember copy of your own figure, not a model of its own.
- (overridable) Practice groups hold up to 6 (`CONFIG.practice.maxGroup`).
- (overridable) Story's bosses 0.8x pace, 0.75x health in chapter 1 to 1.1x / 1x; 5 flasks found (ch. 2, 4, 6, 9,
  12), a warm light at a corpse, taken on touch.
- (overridable) Boss health is now set by a lone bot's time (about 3 min, a skilled person's minute), not a ladder:
  the Kindling Tree (2,500) and the King's Blade (3,000) sit below Agathe (3,200).
- (overridable) Swift kill: par 45 s, then 100 s (less with a kit) adds a card. The pick holds 2 s.
- (overridable) Boss Rush: no wall; x1.6 at fight 10, x2.8 at 15, x4 at 20, then +0.25 a fight (pass 96).
- (overridable) Pass 96: heavy = poise 60+ (94 attacks); projectiles stay blockable; the end reads "Reached fight
  N"; Deep Lungs, Quick/Deep Breath and Second Wind are gone; the harder press is every boss's, Story's too.
- (overridable) The Giant's ember eyes, fused skulls, femur club; its rename is yours.
- (overridable) Endings: one line at a time low over the live world; a half-dark veil only behind the credits.
- (overridable) End screen: "The crown answered" (won), "Team wiped" (lost); the clock starts at the leader's start.
- (overridable) Chapters 7-14's words are the loop's: Ysolde's lines, the inscriptions, each boss's story and second
  bar name, enemy descriptions (`STORY.md` 6, 7, 10c-10j). HP (v7.65.0): Ostrey 3,000, Hale and Harrow 1,700
  each, the Ringer 3,000, the Regent 2,600, Oswin 3,500, Agathe 3,200, the Kindling Tree 2,500, the King's Blade 3,000.
