# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now
- Track 2, pass 109, PLAN item 8 batch 1 (pass 1 of 1), done in v7.163.0: legendaries one level, Swift Charge and Long
  Shadow cut, the eight plain commons (`plain: true`, offer weight `plainWeight`) with their touches
  (`js/ability-touch.js`, sounds in `js/audio.js`). Checks: in-page `plain commons`; frames
  `docs/scorecard/now/touch-*.jpg` (`node tools/now-frames.cjs touches`). Next on track 2: batch 2 (Commons I: the
  blade).
- Track 1, pass 111: item 5 (pass 1 of 3), the boss creation system on the Captain, style-independent half done:
  `docs/bosses/system.md` and `pillager-captain.md`; in-between keys (`via`) and the pose library; the video-to-motion
  tools (`tools/motion/`); the cleave's wind-up from a filmed halberd drill; the blind boss judge, round 0: caught 9/10,
  motion 3 (`docs/scorecard/boss-judge.csv`). Acceptance: `node tools/anim-strip.cjs boss:captainOverhead` shows the
  hips and chest winding before the arms (`.scratch/bossjudge/cleave-after.jpg`). Next: the strike's in-betweens and
  follow-through; the wind-up tint and glow off the body; the Captain's cel model. Item 4 (style): Aleix picked cel.
- Pass 110, the retro (track 2 slot): v7.163.0's CI green (run 44830197524), its container published, and players
  are on it at last (they had v7.159.0 until now). Item 1 done: `PLAY-LINK.txt` is https://aleix.tailfef0f7.ts.net/souls/,
  Pages unpublished (old address 404). Step 1 of every pass: `node tools/live-check.cjs`. Items 1-3 done.
- The Finishing Blow (pass 100-103, `js/finisher.js`, `js/finisher-fx.js`): 3rd counter; judge 4, 4, 5; its look and
  the showcase finale are "Later" in the plan.

## Works

- Boss animation (pass 111): `via` in-between keys and `POSE_LIBRARY` (`js/data/pose-library.js`), checked by
  `tests/pose-via.cjs`; `tools/motion/` (clip to MediaPipe landmarks to rig fit to via keys); boss strips
  `node tools/anim-strip.cjs boss:<attackId>`; judge prompt `docs/bosses/judge-prompt.txt`.
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

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge` (dashes, not adopted); `wip/p102-deflect-keys` (unjudged). Backlog: `BACKLOG.md`.

## Needs Aleix

Answered: the art style is cel-shaded anime, for the whole game (Aleix, 2026-11-20; item 4 done). The home server's `/souls/` address is PUBLIC (Aleix, 2026-11-20).
