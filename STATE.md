# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Next: `PLAN.md` stage 2, item 5, the end of a run, pass 1 of it: time, bosses beaten, deaths and damage per player, and
"again" for the same group. Check: frames of the screen after a win and after a wipe. The run ends in `server/index.cjs`
(`stop(... 'run-complete')` and the team-wipe branch); the client's wipe screen is `showTeamWipe` in `js/multiplayer.js`.
Then stage 2 is done: release v7.35.0 with its changelog lines (AGENTS.md "Releasing").

Pass 9 shipped item 4, blessings between fights (unreleased): pick one of three after each fight but the last, kept for
the run, Rise Again once a fight. Pass 8 item 3 (the run), pass 7 item 2 (`CONFIG.aggro`), pass 6 item 1
(`CONFIG.group`). Notes: `docs/feature-history.md`, the last four sections.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0), Beastman of Farum Azula (v7.29.0, 2,800 body tris, 2,926 with the scimitar), Toll Wisp (v7.30.0,
  2,881 tris, a handbell in the left hand; the first figure with no kit part, so baked meshes now share corners), Grafted
  Scion (v7.31.0, 2,774 body tris, 2,900 with the scimitar), Executioner (v7.32.0, 2,687 body tris, 2,991 with the
  greataxe; its skirt is four panels on new cloth bones loinF/B/L/R), Crucible Squire (v7.33.0, 2,190 body tris, 2,992
  with the kit oval shield and greatsword), Shover (v7.34.0, 2,428 body tris, 2,988 with the kit pavise of 560; a
  kettle hat over a bevor, a barrel cuirass bound in iron hoops). `js/baked/*.js`; checked by the in-page `model`
  filter (5 tests), `Shover` (1), `Bowman` (4), `Lands` (15), `Wisp` (1), `Scion`, `Ultra performance` and validation
  at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
- Group scaling (v7.35.0, unreleased): `CONFIG.group`, `groupDef`/`setGroup` (`js/enemy.js`), the server's scaling in
  `tick()`; checked by `tests/group-scaling.cjs` (every boss at 1-5 players) and `boss-only-browser.cjs` (two clients
  draw the server's two-player bars, `docs/scorecard/boss-only-2p-grouped.jpg`). Tests that pinned Margit's solo bar in
  group sessions now read her scaled bar or her share of it.
- Bosses fight the group (v7.35.0, unreleased): `CONFIG.aggro`, `bossTarget` / `noteDamage` in `server/simulation.js`,
  `grouped` and `isAreaAttack` in `js/enemy.js`; checked by `tests/boss-attention.cjs` (seeded bot fights through
  `createSimulation({ seed })`), frames `docs/scorecard/boss-attention-1..3.jpg`, `boss-attention.txt`.
- The Calling (v7.35.0, unreleased): `C.calling`, `calling()` / `randomRoster()` in `server/simulation.js`, the lobby's
  roster and pick list in `js/multiplayer.js`; checked by `tests/calling.cjs` and `tests/calling-browser.cjs` (two
  browsers and a bot finish a 3-boss run; frames `docs/scorecard/calling-*.jpg`).
- Blessings (v7.35.0, unreleased): `CONFIG.blessings`, `BLESSINGS` (`js/data/blessings.js`), `Player.bless` /
  `riseBody`, the server's `offerBlessings` / `bless` / `rise`, the pick screen `#blessingScreen`; checked by
  `tests/blessings.cjs` and `tests/calling-browser.cjs` (frames `docs/scorecard/blessing-*.jpg`).
- CI: Node checks and four browser shards on every push.
- Scorecard evidence: `node tools/scorecard-frames.cjs [dir] [menu|levels|bosses]` (headless Edge, High), and
  `[BOTS=3] node tests/bot-duel.cjs all 6 600` (bots against every boss in the headless simulation, about a minute).
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab, 1600x640), `lab-zoom.cjs`
  (same with `DSF=2 CLIP=x,y,w,h`, CSS pixels of the 1600 view), `enemy-play.cjs <q> <dist> <levelId> <enemyId[#n]>`
  (a frame in a level; `HIDEP=1` hides the player; `YAWOFF=0.15` puts the camera nearly in front of the enemy's
  facing, default 0.55; it sets the player to a raised enemy's y, but it can still fall off a ledge, so pick a spot
  with floor in front: the Tower's west-stair Shover works), `lab-probe.cjs <id>` (hides each mesh in turn; `TRY=`,
  `TEX=1`, `NOSHADOW=1` modes), `normals-probe.cjs`.

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

CI on pass 9's push: check at the start of pass 10. Pass 8's push was green. Pass 9 locally: the Node group, blessings,
calling, and the multiplayer, lobby, reconnect, boss-only, run-intro and calling browser tests.

## wip/ branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

The earlier three (order of work, how to see progress, the Toll Wisp's description) are answered in `PLAN.md`.

- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
- (overridable) How much harder a boss gets per extra player: +50% health, +30% posture, breaks 10% shorter
  (`CONFIG.group`). Tuned on bots, who fight worse than people; at +60% six of the eight Lands bosses beat three bots
  every time. Worth a feel check with friends.
- (overridable) The five blessings, their names and sizes (`CONFIG.blessings`): Whetted Edge +15% damage, Spare Draught
  +1 flask, Second Wind +40% stamina refill, Keen Ear a 50% wider parry, Rise Again once a fight at half health; 25 s to
  choose. Rise Again is once a fight, not once a run.
