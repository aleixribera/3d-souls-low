# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now
- Track 2, pass 109, PLAN item 8 batch 1 (pass 1 of 1), done in v7.163.0: legendaries one level, Swift Charge and Long
  Shadow cut, the eight plain commons (`plain: true`, offer weight `plainWeight`) with their touches
  (`js/ability-touch.js`, sounds in `js/audio.js`). Checks: in-page `plain commons`; frames
  `docs/scorecard/now/touch-*.jpg` (`node tools/now-frames.cjs touches`). Next on track 2: batch 2 (Commons I: the
  blade).
- Track 1, pass 108: item 4 (pass 1 of 1), art style exploration, done: the Captain fight in four styles,
  `docs/style/` (`index.html`, `side-by-side.jpg`, MP4s, `frame-times.json`). Normal 1280x720 on this PC, mean ms:
  control 2.4, cel 8.4, dark 6.8, paint 3.8. Laptop bench unreachable (SSH timeout): 60 fps there unverified. Waits on
  Aleix's pick; track 1 takes the next item meanwhile.
- CI: v7.162.0 red on `calling-browser`'s Time Rift bubble wait (SwiftShader); pass 109 holds the boss frozen for
  the wait. Next pass reads CI first.
- Item 1 left: `PLAY-LINK.txt` at the public `/souls/` address, and Pages retired (workflow off, page gone or
  redirecting): next pass. Items 2-3 done.
- The Finishing Blow (pass 100-103, `js/finisher.js`, `js/finisher-fx.js`): 3rd counter; judge 4, 4, 5; its look and
  the showcase finale are "Later" in the plan.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Toll Wisp,
  Executioner, Shover, Antlered Hunger, Gargoyle (`tail`, `wingL`/`wingR`), Empty Sentinel, Pillager Captain, Bell Warden (`weapon.rest`), Giant Skeleton (`carve()`), Aldric (`burn: true` glow slots drawn only while the boss burns, `js/finale.js`). Checked by
  the in-page `model` filter, `Shover`, `Bowman`, `Wisp`, `Ultra performance` and
  validation at load.
- Figure lessons: thin limbs as open lofts (`hard`), not `soft()`; a band needs its own texture's slot; near-black
  and edge-on sheets take the rim light white: lower `rim` (model or slot).
- Pace: `CONFIG.pace`, `CONFIG.enemy.press`, `rushPace`, `bossMove`; `tests/boss-pace.cjs`, `rush-flow.cjs`;
  `tools/rush-curve.cjs bosses|runs|pairs` (`SKILLED=1`, `KIT=`).
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` (`js/lobby-sim.js`), `grouped` / `isAreaAttack`
  (`js/enemy.js`); `tests/boss-attention.cjs`.
- Menus (pass 51, v7.72.0): title style everywhere, `optionsItems`, `pauseFacts`, `#runSummary`, Controls (`controlRows`); in-page `Menus:`.
- Boss Rush (pass 65-73): `calling`, `offerAbilities`, `RUSH`, `CONFIG.endless`, `rushHealth`, `pickHold`
  (`js/lobby-sim.js`); `tests/calling.cjs`, `calling-browser.cjs`, `rush-alone-browser.cjs`. Weekly: `tests/weekly.cjs`.
- Revive (pass 64): `js/revive.js`, `runTitles`; `tests/revive.cjs`, `revive-browser.cjs`.
- The end of Act I (v7.36.0): `LORE.ending`, `showEnding` (`js/finale.js`), `LEVEL_5.next`, `goesOn`, `resume`;
  in-page `Story`, `Church`; `docs/scorecard/act1-*.jpg`.
- Chapters 7-14 (v7.38.0-v7.51.0, rough): `js/levels/windward-moor.js`, `saltgrave.js`, `night-gaol.js`, `aurel.js`,
  `aurel-in-ash.js`, `torn-abbey.js`, `ember-root.js`, `still-mere.js`; bosses in `js/data/bosses/ostrey.js`,
  `castellans.js` (the opt-in `alone` phase), `ringer.js`, `hollis.js`, `oswin.js`, `agathe.js`, `kindling-tree.js`
  (an enemy's `holyLight`), `kings-blade.js` (own moves since pass 55); each an old
  boss's moves renamed, but the King's Blade, Ostrey and the castellans (v7.58.0, v7.62.0: baked `weapon: true` parts, `anim.hang`, `halos`, `breathFrom`). In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30; over the world, pass 82): `LORE.endings`, `tellEnding` in `js/finale.js`; in-page
  `Story moments:` (`inControl`), `Still Mere:`; `moments-*.jpg`.
- Story's road (pass 79): `CONFIG.story.road`, `might`, `roadMight`/`roadFlasks`, `flaskFinds` (save `finds`);
  in-page `Story road:`, `Story: a flask`; `tools/story-curve.cjs`.
- Bots: `tests/bot-temperament.cjs`, `bot-behavior.cjs`; `node tools/bot-fights.cjs story 10` (`PERSON=1`).
- Replays (pass 104): online runs recorded (`server/replays.cjs`, hooks in `lobby-host.js`; REPLAY_DIR, 60 days,
  starred kept; 11.5-13.3 MB/h, ~0.09 ms a snapshot), viewer `js/replay.js` behind the tailnet-only door
  (REPLAY_PORT, homelab :3083), list `replays/`; notes `node tools/replays.cjs`; `tests/server-replays.cjs`; audit
  `docs/design-audit/2026-11-15.md`.
- Abilities and crates (pass 107, v7.162.0): `js/data/crates.js`, `js/progress.js` (save `v` 2), `js/crate-screen.js`;
  `tests/crates.cjs`. Plain commons' touches (pass 109): `js/ability-touch.js`; in-page `plain commons`.
- Art styles (pass 108): `?style=cel|dark|paint`, `js/data/styles.js`, `js/style-lab.js`; `tests/style-browser.cjs`;
  retake `node tools/style-frames.cjs [styles] [still,fight,clip,time]`.
- Scorecard frames: `tools/scorecard-frames.cjs`; current frames `docs/scorecard/now/` (`tools/now-frames.cjs`).

## Broken

- Not in CI: `lobby-polish-browser` (flaky), `experience-browser` (320x568). `calling-browser` runs in `browser-smoke`.

## Queued runs

None (read the newest CI run).

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge` (dashes, not adopted); `wip/p102-deflect-keys` (unjudged). Backlog: `BACKLOG.md`.

## Needs Aleix

- Pick an art style (PLAN item 4): cel, dark, painterly or today's look, from `docs/style/index.html` (or
  `side-by-side.jpg` and the four MP4s). Your taste, so no judge decides it.

Answered: the home server's `/souls/` address is PUBLIC (Aleix, 2026-11-20).
