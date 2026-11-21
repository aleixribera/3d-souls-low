# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now
Paused by Aleix, 2026-11-21.
- Why: the stop point (loop file) is reached; PLAN "Last" is met or cut.
- Awaiting Aleix's playtest: Aleix plays 3 solo Rush runs; a friend new to the genre plays 2 solo Rush runs and a
  Story chapter boss; all recorded (replays). A second round fixes what they show (`docs/balance/README.md`).
- Pass 174 (PLAN "Last" balance, 2 of 2): the bot takes its counter openings, Rush blows grow with the kit's might,
  four legendaries up, Story bosses harder, CI fixed (v7.224.0). Acceptance: the plan's checks in `docs/balance/README.md`.

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
- Showcase (pass 166, v7.215.0): the player's view, a fade the only cut, the Finishing Blow its finale; in-page
  `Showcase`, clip `docs/scorecard/now/showcase.mp4`. Rush curve (pass 168): `pairTurns`, `settle`; `docs/scorecard/now/rush-curve.md`.
- Pace: `CONFIG.pace`, `CONFIG.enemy.press`/`bossDamage`, `rushPace`; `tests/boss-pace.cjs`, `rush-flow.cjs`;
  `tools/rush-curve.cjs bosses|runs|pairs` (`SKILLED=1`, `KIT=`, `SPLIT=1`, overrides in its header);
  `CONFIG.endless.mightBlows`; `tools/story-curve.cjs` (`SKILLED=1`). Balance: `docs/balance/README.md`.
- Bosses fight the group (v7.35.0): `CONFIG.aggro`, `bossTarget` (`js/lobby-sim.js`), `grouped` / `isAreaAttack`
  (`js/enemy.js`); `tests/boss-attention.cjs`.
- Menus (pass 51, v7.72.0): title style everywhere, `optionsItems`, `pauseFacts`, `#runSummary`, Controls (`controlRows`); in-page `Menus:`.
- Boss Rush (pass 65-73): `calling`, `offerAbilities`, `RUSH`, `CONFIG.endless`, `rushHealth`, `pickHold`
  (`js/lobby-sim.js`); `tests/calling.cjs`, `calling-browser.cjs`, `rush-alone-browser.cjs`. Weekly: `tests/weekly.cjs`.
- Revive (pass 64): `js/revive.js`, `runTitles`; `tests/revive.cjs`, `revive-browser.cjs`.
- The end of Act I (v7.36.0): `LORE.ending`, `showEnding` (`js/finale.js`), `LEVEL_5.next`, `goesOn`, `resume`;
  in-page `Story`, `Church`; `docs/scorecard/act1-*.jpg`.
- Chapters 7-14 (v7.38.0-v7.51.0, rough): `js/levels/windward-moor.js`, `saltgrave.js`, `night-gaol.js`, `aurel.js`,
  `aurel-in-ash.js`, `torn-abbey.js`, `ember-root.js`, `still-mere.js`; bosses in `js/data/bosses/` (`castellans.js`:
  the opt-in `alone` phase; `kindling-tree.js`: `holyLight`); baked `weapon: true` parts, `anim.hang`, `halos`, `breathFrom`. In-page filters by chapter name (`Moor`, `Saltgrave`, `Night Gaol`,
  `Aurel`, `Aurel in Ash`, `Torn Abbey`, `Ember Root`, `Still Mere`). A material's `tint` sets hue only. A phase's `opener` must be in its own `attacks` (validated since v7.51.0).
- The story's ending (pass 30; over the world, pass 82): `LORE.endings`, `tellEnding` in `js/finale.js`; in-page
  `Story moments:` (`inControl`), `Still Mere:`; `moments-*.jpg`.
- Story's road (pass 79): `CONFIG.story.road`, `might`, `roadMight`/`roadFlasks`, `flaskFinds` (save `finds`);
  in-page `Story road:`, `Story: a flask`; `tools/story-curve.cjs`.
- Bots: `tests/bot-temperament.cjs`, `bot-behavior.cjs`; `tools/bot-fights.cjs story 10`.
- Replays (pass 104): `server/replays.cjs` (REPLAY_DIR, 60 days, starred kept, ~12 MB/h), viewer `js/replay.js` behind the tailnet-only door
  (REPLAY_PORT, homelab :3083), list `replays/`; notes `node tools/replays.cjs`; `tests/server-replays.cjs`; audit
  `docs/design-audit/2026-11-15.md`.
- Abilities and crates (pass 107, v7.162.0): `js/data/crates.js`, `js/progress.js` (save `v` 2), `js/crate-screen.js`;
  `tests/crates.cjs`. Plain commons' touches (pass 109): `js/ability-touch.js`; in-page `plain commons`. Blade commons (pass 112): `js/common-fx.js`; `tests/blade-commons.cjs`, in-page `blade commons`. Guard commons (114, 117): `tests/guard-commons.cjs`, `mirror-shard.cjs`.
- The Finishing Blow (pass 100-103, `js/finisher.js`, `js/finisher-fx.js`): the 3rd counter; its look `ink` (pass 171,
  `ANIM_SETTINGS.finisherFx.looks`, `?finisher=`; `FINISHER=` in `tools/anim-strip.cjs`); in-page `its look`.
- Summons (pass 141-147): `js/summon-beasts.js` (hound, fox), `summon-lantern.js`, `summon-figures.js` (archer, ronin, puppet), `summon-birds.js`, `summon-crows.js`, `summon-brutes.js` (bear, mantis), `summon-coil.js`; `tests/summons-{one,two,three}.cjs`, in-page `summons`; clips `tools/ability-clips.cjs summons|summons2|summons3`, side views `tools/summon-closeups.cjs`.
- Legendaries I, II (151, 154): `tests/legendaries-{one,two}.cjs`, in-page `legendaries one|two`, clips `legends1|2`.
- Ultimates I-III (156-158): `tests/ultimates-{one,two,three}.cjs`, in-page `ultimates`, clips `ults1|2|3`.
- Art style: cel by default (pass 155), `?style=classic|dark|paint`; `js/style-lab.js`, `sceneDepth` on Normal
  (`tools/style-cost.cjs`); `tests/style-browser.cjs`; frames `tools/now-frames.cjs cel`.
- Body check (retro 130): `tools/body-check.cjs [bossId]`; `tests/body-check.cjs` holds every boss with a page.
- Clawed bosses' tells (pass 133): `tellsGrow` on a model with `tells`; in-page `Church: a heavy wind-up`.
- Scorecard frames: `tools/scorecard-frames.cjs`; current frames `docs/scorecard/now/` (`tools/now-frames.cjs`).

## Broken

- Not in CI: `lobby-polish-browser` (flaky), `experience-browser` (320x568). `tests/revive.cjs` flaky once (pass 164). `calling-browser` runs in `browser-smoke`.

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge`, `wip/p102-deflect-keys`: not adopted, kept for reference.

## Needs Aleix

- Fight Oswin (Practice; reworked: threefold, the leap and his hands now parried unless you say).
- Fight Agathe (Practice; the Gale Reap and the Hook from the Storm's landing now parried unless you say).
- Fight Gemini (Practice; the Lunar Tempest ends on a rising cut unless you say).
- Fight the King's Blade (Practice; the Ember Leaps, the Shield Burns' swing and the Wall's cut parried unless you say).
- Fight the Kindling Tree (Practice; reworked: its boughs parried, the Bramble Sweep and the Charge too, unless you say).
- Fight the Regent Hollis (Practice; the Pavane is new, and the Feast's blade is parried unless you say).
- Fight the Ringer (Practice; her stamping foot and Over the Line's ball are parried unless you say).
- Fight Hale and Harrow (Practice; Harrow's axe stays hidden until the whole phase unless you say).
- Fight Old Ostrey, the Antlered Hunger, Aldric, the Giant Skeleton and the Bell Warden too (Practice; calls in commits).
- Fight the Pillager Captain (PLAN item 5's last gate; six judge rounds tried). Practice,
  say what feels off or unfair.
Answered: the art style is cel-shaded anime (Aleix, 2026-11-20). The home server's `/souls/` address is PUBLIC (Aleix, 2026-11-20).
