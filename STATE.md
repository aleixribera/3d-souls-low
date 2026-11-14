# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Paused by Aleix, 2026-11-14. Passes 100 and 102 finish, then one track-A pass gives the Finishing Blow its look (Aleix); no other pass until the loop chat resumes it (Friday 2026-11-20, 21:05).
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
- Old docs: `git show v7.56.0:docs/<file>`.

## Works

- Baked figures (`js/baked/*.js`, triangle counts in each `docs/<name>-model-*.md`): wanderer, Hollow Soldier, Ashen
  Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart Bowman, Toll Wisp,
  Executioner, Shover, Antlered Hunger, Gargoyle (`tail`, `wingL`/`wingR`), Empty Sentinel, Pillager Captain, Bell Warden (`weapon.rest`), Giant Skeleton (`carve()`), Aldric (`burn: true` glow slots drawn only while the boss burns, `js/finale.js`). Checked by
  the in-page `model` filter, `Shover`, `Bowman`, `Wisp`, `Ultra performance` and
  validation at load.
- Figure lessons: thin limbs as open lofts (`hard`), not `soft()`; a band needs its own texture's slot; near-black
  and edge-on sheets take the rim light white: lower `rim` (model or slot).
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
- Bots: temperaments, strings, Finishing Blows, openings, backup: `tests/bot-temperament.cjs`; caution, room, rings, reach:
  `bot-behavior.cjs`; `node tools/bot-fights.cjs story 10` (10 min; `PERSON=1`: a person stand-in).
- Scorecard frames: `tools/scorecard-frames.cjs`.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs`, `lab-zoom.cjs`, `enemy-play.cjs`, `lab-probe.cjs`,
  `solo-multi.cjs`.

## Broken

- `boss-only` (Node) is flaky: see `BACKLOG.md`.
- Not in CI: `lobby-polish-browser` (flaky), `experience-browser` (320x568), `boss-only-browser` (adventure count),
  `calling-browser` (a swift mark on a Crowned offer).

## Queued runs

None (read the newest CI run). Probes (untracked, `.scratch/`): `render-scale.cjs`.

## wip// branches

`wip/p101-dash-clip`, `wip/p102-dash-lunge` (dashes, not adopted); `wip/p102-deflect-keys` (unjudged). Backlog: `BACKLOG.md`.

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
- (overridable) Pass 98: "Your name" with Join / Cancel; Options > Game > Name; a new player spars, then is asked.
- (overridable) The Giant's ember eyes, fused skulls, femur club; its rename is yours.
- (overridable) Endings: one line at a time low over the live world; a half-dark veil only behind the credits.
- (overridable) End screen: "The crown answered" (won), "Team wiped" (lost); the clock starts at the leader's start.
- (overridable) Chapters 7-14's words (`STORY.md` 6, 7, 10c-10j) and boss HP (v7.65.0) are the loop's.
