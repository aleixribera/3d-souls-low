# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

- v7.139.0 (2026-11-16): audit repairs shipped outside the loop; `docs/audit-repairs.md` lists what is left, as backlog.
- v7.134.0: online is Boss Rush and the Weekly Run only. Single-Quad Boss, co-op Story, rests, gates and the old wipe
  screens went (code too); a wipe ends the run on its summary. Protocol 3.
- v7.135.0: Boss Rush alone, no server (`js/alone.js` hosts `js/lobby-host.js` in a frame).
- Track A (pass 102): the dash stops at 5 (Aleix's last try, a deep lunge, judged 3, 3, 5 vs 4, 5, 4; BACKLOG).
  `tools/anim-strip.cjs` draws every step; `finisher` films the 3-counter chain (`CLIP=` an mp4). Deflect (in-page
  `pass 99`); sparring (pass 97). `.scratch/locked.sh` guards the browser lock. After the pause: deflect frames 5-9,
  Controls clips, the blow's look.
- Track B (pass 100): no posture/stagger bar; executions gone. The Finishing Blow (`js/finisher.js`,
  `CONFIG.finisher`): a counter cracks the guard (`crackGuard`), cracks fade after `fade` s, the 3rd counter is the
  blow: 90 (boss 480, cap half a bar) + 8% heal, 1.06 s + 0.14 s hitstop, then control. Online the server counts
  (`cracks`/`crackBy` in snapshots), grants it (`beginFinisher`, frame `finisher`), one counter an opening
  (`spentOpening`). Breaker: longer counter window. In-page `Finishing Blow`; pass 98's dodge holds.
- The Finishing Blow's look (pass 103, `js/finisher-fx.js`, `ANIM_SETTINGS.finisherFx`): glowing body cracks per
  counter; the blow stops time (grey, darker, foe frozen mid-pose), red flash-step copies,
  dim cuts all opening at once in a white-to-red X, camera swing and punch, own sounds. Blind judge
  4, 4, 5; left: the freeze is a grey clump (camera far, no crisp silhouettes), the X a soft bloom pasted on, the
  foe's reaction hidden behind the player.
- Showcase: its finale is still a plain killing counter (hp 1); as the Finishing Blow it needs `cracks` at the
  last and its health left alone (`js/showcase.js` 165-170).

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
- Scorecard frames: `tools/scorecard-frames.cjs`.

## Broken

- Not in CI: `lobby-polish-browser` (flaky), `experience-browser` (320x568), `calling-browser` (a swift mark on a
  Crowned offer).

## Queued runs

None (read the newest CI run).

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge` (dashes, not adopted); `wip/p102-deflect-keys` (unjudged). Backlog: `BACKLOG.md`.

## Needs Aleix

None for the authorized audit repairs. Historical choices remain in PLAN.md and git history.
