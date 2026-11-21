# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now
- Track 2, pass 151 (PLAN item 8, batch 13, Legendaries I, pass 1 of 1), done in v7.201.0: Storm King's bolt
  crown, Gale Crescent's blade cage, the impact frame (`js/impact-frame.js`), the Ember Twin's Blender model.
  Acceptance: `tests/legendaries-one.cjs`, in-page `legendaries one`; clip `docs/scorecard/now/legendaries-one.mp4`.
  Next on track 2: batch 14, Legendaries II. Browser lock: `node tools/browser-lock.cjs run <pass> -- <cmd>`.
- Track 1, pass 152 (PLAN item 6), v7.200.0: Kindling Tree `bars-1` done (no red wash on a weaponless body,
  `js/effect-lighting.js`, `js/ultra-boss.js`; its own Reaching Bough). King's Blade audit: restyle
  (`docs/bosses/kings-blade.md`): Leap, Shield Burns, Wall parried; body check clean. Next: Gemini.

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
  `tests/crates.cjs`. Plain commons' touches (pass 109): `js/ability-touch.js`; in-page `plain commons`. Blade commons (pass 112): `js/common-fx.js`; `tests/blade-commons.cjs`, in-page `blade commons`. Guard commons (114, 117): `tests/guard-commons.cjs`, `mirror-shard.cjs`.
- The Finishing Blow (pass 100-103, `js/finisher.js`, `js/finisher-fx.js`): the 3rd counter; its look is "Later".
- Summons (pass 141-147): `js/summon-beasts.js` (hound, fox), `summon-lantern.js`, `summon-figures.js` (archer, ronin, puppet), `summon-birds.js`, `summon-crows.js`, `summon-brutes.js` (bear, mantis), `summon-coil.js`; `tests/summons-{one,two,three}.cjs`, in-page `summons`; clips `tools/ability-clips.cjs summons|summons2|summons3`, side views `tools/summon-closeups.cjs`.
- Legendaries I (pass 151): `tests/legendaries-one.cjs`, in-page `legendaries one`, clip `legends1`.
- Art styles (pass 108): `?style=cel|dark|paint`, `js/data/styles.js`, `js/style-lab.js`; `tests/style-browser.cjs`;
  retake `node tools/style-frames.cjs [styles] [still,fight,clip,time]`.
- Body check (retro 130): `tools/body-check.cjs [bossId]`; `tests/body-check.cjs` holds every boss with a page.
- Clawed bosses' tells (pass 133): `tellsGrow` on a model with `tells`; in-page `Church: a heavy wind-up`.
- Scorecard frames: `tools/scorecard-frames.cjs`; current frames `docs/scorecard/now/` (`tools/now-frames.cjs`).

## Broken

- Not in CI: `lobby-polish-browser` (flaky), `experience-browser` (320x568). `calling-browser` runs in `browser-smoke`.

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge`, `wip/p102-deflect-keys`: not adopted, kept for reference.

## Needs Aleix

- Fight Oswin (Practice, `?style=cel`; reworked: threefold, the leap and his hands now parried unless you say).
- Fight Agathe (Practice, `?style=cel`; the Gale Reap and the Hook from the Storm's landing now parried unless you say).
- Fight the King's Blade (Practice, `?style=cel`; the Ember Leaps, the Shield Burns' swing and the Wall's cut parried unless you say).
- Fight the Kindling Tree (Practice, `?style=cel`; reworked: its boughs parried, the Bramble Sweep and the Charge too, unless you say).
- Fight the Regent Hollis (Practice, `?style=cel`; the Pavane is new, and the Feast's blade is parried unless you say).
- Fight the Ringer (Practice, `?style=cel`; her stamping foot and Over the Line's ball are parried unless you say).
- Fight Hale and Harrow (Practice, `?style=cel`; Harrow's axe stays hidden until the whole phase unless you say).
- Fight Old Ostrey too (Practice, `?style=cel`; one `bars-1` round; the Burning Drop's landing parried unless you say).
- Fight the Antlered Hunger too (Practice, `?style=cel`; one `bars-1` round; its follow-ups parriable unless you say).
- Fight Aldric too (Practice, `?style=cel`; the Turning Key ends on a pommel strike unless you say all blade).
- Fight the Giant Skeleton and the Bell Warden too (Practice, `?style=cel`).
- Fight the Pillager Captain (PLAN item 5's last gate; tried: six judge rounds, nothing left a judge can settle). Practice,
  with `?style=cel` in the address (cel is not yet every player's default); say what feels off or unfair.
Answered: the art style is cel-shaded anime (Aleix, 2026-11-20). The home server's `/souls/` address is PUBLIC (Aleix, 2026-11-20).
