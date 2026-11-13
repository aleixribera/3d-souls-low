# Plan

The order of work under `VISION.md`. Written by the director; the loop reads it every pass and doesn't edit it (cuts
and finds go to `BACKLOG.md`, questions to "Needs Aleix" in `STATE.md`). Decisions: the director's grilling with
Aleix, 2026-11-13.

## How the loop runs

- The bar for every item is `VISION.md`'s: AAA quality and polish, runs on a toaster, fun and challenging, makes
  players come back.
- A pass has full authority over what it works on: balance, numbers, windows, frequency, the code underneath. If an
  item sits on a weak foundation (an old system, a stand-in, a shaky rule), the pass fixes or rebuilds that first, as
  part of the item, instead of building on top of it (the iterate skill now says the same).

- Aleix's feedback (`.claude/feedback.md`) comes first, always.
- Then the clean-up below, then **two tracks in parallel**: two passes at a time, one per track, each in its own git
  worktree, both merged into `main`. Never more than two passes; only one with a browser open at a time.
- Items in a track go in order. An item is done when its check is seen in the running game.
- A release whenever a pass ships something players notice: one entry in the in-game changelog, then the tag.

## Answers to "Needs Aleix"

- The Calling is renamed **Boss Rush** (track B, item 1).
- Group scaling goes (Aleix, 2026-11-13, replacing his earlier "keep it"): no enemy or boss scales with team size,
  anywhere. Boss Rush difficulty scales with fights won instead (track B, item 2).
- Bosses are damage sponges and bots never die (2026-11-13): short fights, bosses that press harder rather than last
  longer, bots that can fall, and more reward moments (track B, item 2). Bots don't get sloppier as a run goes on: the
  bosses already get harder. No damage numbers. Some bosses have too much health in Story too: every boss's own
  health is set so a skilled solo player kills it fast, in the same item. Bosses are killable fast with skill but
  harder to face; the Boss Rush curve scales only their attack pace, never damage or health.
- The five blessings: removed; every upgrade is rebuilt from zero in a separate session (track B, item 6).
- The coolest Boss Rush out there (Aleix, 2026-11-13, yes to all six of the director's ideas): revive a friend
  mid-fight, Focus, highlights on the end screen (track B, item 4); a Crowned boss every 10th fight (item 5); pacts
  (item 6); a weekly run with a friends' board (item 8). Left out on purpose: damage numbers, stat upgrades between
  runs, a separate arena for every boss.
- The UI (2026-11-13): way better to use and look at, before Endless (track B, item 3). Not Souls-like references;
  mouse and keyboard first with full controller support; the best control for each job in one direction; a castle
  scene behind the menus. Later the same day, after seeing 20 mockup directions: the HUD in the game now is perfect
  and stays; the work is the blessing cards and how they're presented, and the menus. Simple, functional menus in
  the approved lobby look; no reward effects (slams, glows, count-ups, shines).
- End-screen titles: plain English, the loop's wording.
- Chapters 6-14's words: the loop's draft stands. Story text is a draft the loop may rewrite.
- THE ROAD GOES ON stays until the ending ships; after that the story keeps growing until Aleix stops it.
- What replaces the Elden Ring bosses: nothing. Boss Rush, Practice and the lobby modes use the story's own bosses:
  Ashmere's five (Pillager Captain, Bell Warden, Giant Skeleton, Aldric, the Antlered Hunger) and chapters 7-14's
  (Ostrey, Hale and Harrow, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade).

## A model or boss is done when

The agent has seen it working in a preview, standing and through every attack, and judged whether it will work in the
game; then a frame of it in its level. Both images in the pass report. Triangle counts are a soft warning, not a rule.

## Before everything else: players know a new version is out (Aleix, 2026-11-13)

Aleix often plays an old version. The home server is fine: `hl` (the homelab's own tool, `hl-games.timer`) pulls
`latest` every 3 minutes while the lobby is empty and holds it while anyone is in. The page is the gap: it compares
its version with the server's only on Join (`js/multiplayer.js`, the `info.version !== VERSION` check), and the
title's `peek()` reads `/api/lobby` (which carries `version` and `build`) every few seconds but ignores both. So a tab
left open, and any solo play in it, stays on the old build and nothing says so.

1. **"New version — Reload".** When `/api/lobby`'s `version` or `build` differs from the page's, the title screen and
   the pause menu show it, with a reload button (keyboard and gamepad reachable). It checks on the title (the
   existing `peek()`) and every few minutes elsewhere, solo or online, with no effect on play and nothing shown when
   there is no server (`file:` or a static host). In the lobby, reloading mid-run is the player's choice, never forced.
   Check: a page served with an older `VERSION` against a newer server shows the notice on the title and in pause,
   and the button loads the new build (a browser test, plus frames at desktop and phone width).
2. **The docs say how it really updates.** `docs/container-updates.md` describes a game-owned updater
   (`deploy/update.sh`, `combat-arena-update.timer`) that was never installed on the server; the server is updated by
   `hl` (`C:\Users\Aleix\Documents\CLAUDE\homelab`, `homelab.toml` `[stacks.combat-arena]`, `update = "when-empty"`).
   Rewrite the doc to say that in a few lines, and delete `deploy/` if nothing uses it (check `compose.yaml`,
   `container.yaml` and the tests first). Check: no mention of the unused updater anywhere (grep).

## Clean-up (first)

1. **The Elden Ring bosses and the Lands Between go** (pass 31, Aleix's feedback): the eight bosses, the Lands levels,
   Seren, its enemies, messages, ending, lobby ceremony and the bosses' `.txt` references in `docs/`. Finn stays only
   if the story road uses him. Story bosses that borrow a Lands boss's moves keep working until they are redone.
   Check: the game loads and validates, no Lands name in any menu, every story boss in Boss Rush's pick list.
2. **Lean files.**
   - Delete from `docs/`: every per-release note, `feature-history.md`, `CHANGELOG.md` (the in-game changelog is the
     one), `combat-timings-v4.1.md`, `prompt-new-bosses.txt`, the `.json` results and the empty `enemy-redesign/`.
     Keep `homelab-multiplayer.md`, `container-updates.md`, `how-online-works.html` and the `scorecard/` frames; rewrite
     `docs/README.md` to list what is left.
   - Delete `SCORECARD.md` and `tools/scorecard-frames.cjs`'s mention of it (the tool may stay).
   - `README.md`: one screen on how to play and how to host. The release notes in it go.
   - Merge `LORE.md` and `STORY.md` into one `STORY.md`: what is in the game, then where it's going, a working draft.
     Point code comments at it.
   - Remove the stale worktrees `.claude/worktrees/onboarding` and `../3d-souls-low-base` (check them for uncommitted
     work first) and the empty `3d-souls-low/.obsidian` folder.
   - The loop file's own sections (Notes, Ship and release) drop the per-model doc, the `feature-history.md` section,
     the AGENTS.md row and the minor release per model.
   Check: no link to a deleted file anywhere (grep), the game loads, `npm run test:node` passes.

## Track A: Story

1. **The ending** (pass 30, in progress).
2. **Chapters 7-14's bosses redone**, in story order, one pass each (two at most): Ostrey, Hale and Harrow, the
   Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade. Each one gets one idea of its own, its meaning
   and backstory, its own moveset (patterns and combos may come from acclaimed souls-likes, never their names or
   looks), effects with nothing held back, smooth animation with real acceleration and easing, and its own Blender
   figure with the best detail and art direction (the re-coloured stand-in goes). Every attack readable on its tell, and
   each attack's wind-up different from the boss's others. Its level is reworked so the place and the fight belong together. Check: the model
   check above, then the boss fought in its level.
3. **Two graphics presets.** Low and High become one **Normal** preset that holds 60 fps on integrated graphics;
   **Ultra** stays for Aleix's PC. Render scale stays at 100% or more in every preset, auto-quality included: the speed
   comes from elsewhere (draw calls, shadows, effects' cost, level of detail, culling). Today every preset's
   `renderScale` is 1, but `maxPixelRatio` caps Low at 1x and High at 1.5x, so on a scaled screen (a laptop at 125-150%)
   they draw below the screen's own resolution and get stretched: that counts as below 100% and goes. Normal keeps
   every one of Ultra's effects, each toned down slightly (fewer particles, cheaper passes), never switched off.
   **Baked lighting** everywhere: every level, boss arena and Boss Rush arena gets baked light (lightmaps, baked in
   Blender or a bake step; light probes or baked ambient occlusion for the moving characters), in every preset, in
   place of most real-time lights and shadows. **The laptop is the judge** (Aleix, through
   duty-shooter's director, 2026-11-13): his Lenovo V15 G5 (`ssh uni-laptop`; Intel UHD Graphics, i7-13620H, Fedora 44,
   Firefox only), shared with duty-shooter's loop, taking turns.
   - Read `~/laptop-test/README.md` on the laptop first. Every laptop test goes through `~/laptop-test/lt run
     3d-souls-low <command...>`, which waits (up to 30 min) for the other project's run and holds the turn; wait with
     Monitor, waiting is not a blocker. Never test outside it. `lt claim 3d-souls-low` when laptop work starts, `lt
     release 3d-souls-low` when done (it keeps the laptop awake); `lt status` shows who holds what.
   - Tests may open a visible Firefox window in his session (prefix `WAYLAND_DISPLAY=wayland-0
     XDG_RUNTIME_DIR=/run/user/1000 DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus`). Close windows and servers
     when done. Never unlock the screen or change lock or power settings; if it's locked, run headless and say so. If
     `ssh` times out, the laptop is away: use the stand-in below.
   - Tests run only while the laptop is plugged in: `lt run` exits 76 on battery (its numbers would be throttled).
     Then wait for power, or ask under "Needs Aleix". Never measure with `LT_ALLOW_BATTERY=1`; that override is only
     for runs that measure nothing.
   - **The stand-in on this PC:** a throttled run (CPU throttle, resolution, whatever brings it closer) that any pass
     can run in under two minutes. Each time the laptop is measured, tune it until its mean and 1% low per scene land
     within 15% of the laptop's latest numbers; record the factors and both sets of numbers; recalibrate when the
     laptop's numbers move.
   Check: the laptop holds 60 fps on Normal on every level and in a four-player Boss Rush fight; frames of each level on Normal and Ultra side by side, Normal showing the same effects and looking very nice, not like a cut-down fallback.
4. **Ashmere's five bosses** get new movesets, effects and animation by the same rules; their Blender models stay (and
   may be improved).
5. **Progression:** flasks found along the road, enemies stronger chapter by chapter. Check: flask count and enemy
   strength across chapters in a test, and a play-through frame per act.
6. **Telling the story without taking control.** Find the best way to tell this story (places, NPCs, inscriptions,
   in-world scenes) and remove every moment that takes movement or the camera away from the player: cutscenes, locked
   cameras, cards that freeze play. Check: play each chapter's story moments with the player moving and turning the
   camera throughout.
7. **The old levels' flaws.** Levels 1-6 and the rough chapters are old and some have clear flaws. Any pass whose
   item touches a level treats them as weak foundations and improves, redesigns or reworks the level as part of the
   item; this item then takes the worst one left, one at a time. Rebuilding a level from zero is allowed when it's
   really needed, never the default. Then the stand-in figures (Ysolde, the chapters'
   regular enemies) in Blender.

## Track B: Boss Rush

1. **Boss Rush and Practice.** The Calling becomes **Boss Rush**, the lobby's default. The title screen: Story, Boss
   Rush, Practice. The leader's small Mode option: Boss Rush, Single, Double, Triple, Quad Boss, and the story for
   co-op. **Practice** replaces the 1v1 Arena, Boss vs Boss and the Levels menu: pick any enemy or boss (one or
   several, or two teams against each other) or any level, and be fighting in seconds. Check: frames of the title,
   the lobby option and Practice at desktop and phone width; a test starts each mode.
2. **Fast fights, bots that fall** (Aleix, 2026-11-13: bosses are damage sponges and bots never die; make it more
   frenetic, with more dopamine). Next in this track: the next track-B pass takes it, ahead of item 3's remaining
   screens, which resume after it.
   - **Why:** bots count as players in `CONFIG.group`, so one person with three bots fights a boss at 2.5 times its
     health; `docs/scorecard/bot-aid.txt` has three bots beating the Pillager Captain and the Bell Warden 10 of 10 in
     about two minutes, with no bot falling.
   - **Team-size scaling goes** for every enemy and boss in every mode (`CONFIG.group`, `groupDef`/`setGroup`, the
     server's scaling in `tick()`): a group of four, bots or people, meets the same boss a solo player does.
   - **Killable fast with skill, hard to face** (Aleix, 2026-11-13). Health is never the obstacle; the pattern is. A
     skilled player who punishes the openings beats a boss fast, and a weaker one takes longer because they find fewer
     openings, not because the bar is long. Bosses get harder to face, in every mode: shorter idle gaps, more mix-ups
     between their own strings, and openings that must be earned, every attack still telegraphed (`VISION.md`, fair
     but challenging).
   - **Fight length:** about 45-60 s for a full party at fight 1, never above about 2 minutes late in a run. A person
     with three bots plays the same as four people.
   - **Base health, story too** (Aleix: some bosses have too much health in Story as well). Every boss's own `hp` is
     set so one skilled person on a clean run beats it in about a minute, the long outliers first. Measure every boss
     against one body alone (`tools/bot-fights.cjs` always fields three today: give it a solo option), list the times
     before and after, and bring the slow ones into line.
   - **The curve** (one `CONFIG` rule, exponential in fights won but subtle, as `VISION.md` says) scales only the
     boss's pace: faster attack patterns (shorter wind-up-to-wind-up gaps and recoveries, quicker follow-ups, longer
     strings), each tell staying readable. Not its health, not its damage (Aleix). The genuinely impossible end comes
     from patterns too fast to answer, not from one-shots or a long bar.
   - **Bots play like a decent friend, not a machine.** Full player stats stay (v7.57.0). Slower, less even reactions,
     about twice the mistimed rolls, a later flask and less backing off. They play the same all run: no extra
     sloppiness as it goes on (Aleix: the bosses already get harder). Target: early on, about one bot falls every three
     fights; by fight 10 most fights cost at least one. A fallen bot is back for the next fight, like a person.
   - **Dopamine:**
     - Less waiting: the blessing is picked in the arena, and the next boss drops straight in. The clock is 30 s and
       skips once everyone has chosen (Aleix, v7.67.0, over an earlier 10 s).
     - A kill moment: a short slow motion and a burst of embers when a boss dies, then one line, "Boss 7 down". Drawn
       only: the simulation and the other players are never slowed; flashes under 3 Hz and `reducedMotion()`.
     - More breaks and executions: posture breaks come about 30% sooner, so the big hit lands more often.
     - A visible streak: the fight count and each boss's time on the HUD and the end screen.
     - **Swift kill** (the director's pick, for flow): beat a boss under its par time (shown on the HUD beside the
       clock, from the fight-length target) and that fight's blessing offer gains one extra choice (one rarity up
       once item 6 brings rarity). Skill pays straight back into the run; nobody is punished for missing it.
     - No damage numbers.
   Check: before-and-after numbers (`node tools/bot-fights.cjs`, `PERSON=1` for a person stand-in): fight 1's length
   for a person with three bots and for four bots, bot falls per fight, and every boss's solo time, against the
   targets above; a test that 1
   and 4 players face the same boss; a test of the curve at fight 1, 5, 10, 20 and 40 (pace changes, health and
   damage don't); frames of the kill moment, the streak on the HUD and a swift-kill offer.
3. **The UI redesign, the whole game** (Aleix, 2026-11-13: menus and UI way better to use and to look at). It comes
   before Endless, blessings and crates, so their screens are built on it.
   - **What's wrong now** (v7.59.0 frames in `docs/scorecard/modes-*` and `.scratch/calling/blessing-desktop.png`):
     three looks (a serif list on the title and Practice; a web-app lobby with rounded cards, a gold gradient button,
     a LEADER pill and small all-caps labels; a web-card blessing panel), uneven navigation (key-only hints, Back on
     some screens only, a title mixing a list and a row of buttons), and clutter (a line of explanation under every
     option, four overlays stacked after a boss dies, a permanent CONTROLS list in the HUD).
   - **References, not Souls-like UIs.** Collect screens from games praised for menus that are easy to use and look
     great, name the patterns they share, and build from those. Show the chosen references to Aleix with the first
     screen.
   - **Input:** mouse and keyboard first, and full controller support on every screen: every control reachable and
     usable with a gamepad, focus always visible, button hints that follow the device used last.
   - **The best control for each job:** a dropdown, a slider, a value cycled in place, a grid or a list, whichever is
     best there. Not one style forced everywhere, but one direction across every menu and the HUD: one type
     system, one palette, one focus style, one way back from every screen.
   - **Less on screen:** a title stands alone; a line of text only when it says something the screen doesn't already
     show; one overlay at a time.
   - **Behind the menus:** a cool live 3D scene of a castle (a real Blender model, baked light), inside the Normal
     preset's 60 fps on integrated graphics.
   - **The HUD stays** (Aleix, 2026-11-13: "the current UI inside the game is perfect"). Don't restyle it. Item 2's
     streak and par timer join it in its current look.
   - **Simple and functional, no dopamine on menus** (Aleix, 2026-11-13: "stay away from this dopamine, let's focus
     on simpler functional menus again"). No slam-in titles, glow pulses, shine sweeps, count-ups or crate reels on
     any menu or card. Motion only where it helps you use the screen: focus moving, a panel opening, a timer draining.
   - **Blessing cards get the most care:** each blessing has its own drawn icon in the menus' style (never emoji or
     stock icons), its rarity readable at a glance, its level and change shown plainly (II → III, 30% → 45%), the
     pick timer, number keys and pad buttons.
   - **Chosen (Aleix, 2026-11-13): tall cards for the blessing pick, and the mockups' menu style.** The mockups are
     on the director's canvas, https://claude.ai/artifact/GRG2DQeaNTRnTFM7cRdz7L (read it with the Artifact tool):
     "Pick 4 · Tall cards", "Title", "Pause", "Options" and "End of run". Build from them.
     - Blessing pick: the HUD stays visible under a dark veil. The title "Choose a blessing" sits on the left with the
       seconds left on the right, and a thin gold line under it runs down with the timer. Below sit three or four
       upright cards in a row, about 216×330 at 1280×720. Each card has, top to bottom: its icon in a square well
       whose bottom edge is the rarity colour; the name (display face); the level change in gold when it has one
       (II → III); what it does, with the change in bold (30% → 45%); and at the foot the rarity word in its colour
       and the number key (pad: the focused card takes A). The focused card gets the gold outline. Rarity colours: common in
       the body ink, rare a cool blue, legendary ember orange; gold stays "focused / yours" only. A Swift kill's extra
       card says so beside its rarity. On a phone the cards go to a 2×2 grid.
     - Title: the game's name top-left, the mode list below it (Story, Boss Rush, Practice, Collection), one line about
       the chosen mode when it says something (chapter, time played), one big primary button. The castle stands behind
       the right half. Footer: Options, Controls, Changelog on the left, key hints and the version on the right.
     - Pause: "Paused" with Resume, Options, Controls and Leave the run as rows on the left; the run's state on the
       right (fight, time against par, party, blessings held with their icons). Esc resumes.
     - Options: categories as rows on the left; each setting is one row with the control that fits it (a value
       cycled in place, a slider with its number, an Off/On pair); one line of help only where it tells you
       something; footer Back and Reset to defaults.
     - End of run: bosses beaten as the title, then Crowned count, time and "Your best run" when it is; highlights
       per player on the left; level and crate rewards as a plain list with icons and rarity on the right; Lobby
       and a primary Run again.
   - **Order:** the lobby first (done, v7.63.0, approved for every menu); then the title, Practice, options, pause
     and the end of run. The blessing pick is built by the upgrades session (item 6), from the tall-card spec above. The loop goes on while it waits; his answer redirects it.
   Check: desktop and phone frames of every screen; a test that walks every screen with the gamepad alone; each
   screen checked against the `design-audit` rule book.
4. **Co-op moments** (Aleix, 2026-11-13: the coolest Boss Rush out there). Friends new to the genre should have
   clutch moments, not wait out a death.
   - **Revive.** A fallen player leaves an ember where they fell. A teammate who stands on it for about 3 s (moving
     off or being hit cancels it) brings them back at a third of their health, once per fall. The boss's attention
     (`CONFIG.aggro`) leans hard on whoever is reviving: the risk is the point. Bots revive too, and a person counts
     as their first priority after their own life. The server checks
     every revive claim (range, time, the ember's owner), like any other claim.
   - **Focus.** Perfect parries and perfect dodges (a roll whose i-frames take a blow) fill a small personal meter
     beside the stamina bar; when it's full, the owner's next heavy blow breaks the boss's posture outright. It touches
     only its owner and the boss, never a teammate. Boss Rush's own mechanic, not a blessing; the whole fill-and-spend
     cycle readable at a glance.
   - **Highlights.** The end screen gives each player one title from their run, the most notable of theirs ("Revived 4
     friends", "12 perfect parries", "Fastest kill: 38 s", ...), in the same view as the run's numbers (and item 7's
     crate roll later), not a screen of its own.
   Check: a test of a revive (claim checked, boss attention moves, cancel on a hit) and of Focus filling and breaking
   posture; frames of an ember mid-revive, the Focus meter full, and the end screen's highlights with four players.
5. **Endless.** A run goes on until everyone falls. The first few fights draw from the easier bosses, then every boss
   can come, each fight harder on item 2's curve: fairly easy at first, slowly more challenging for a good while, then
   genuinely impossible. Bosses still spread their attention over the group (`CONFIG.aggro`); modifiers appear after
   the first few fights (faster, an extra phase of new moves, burning ground, a second boss; none adds damage or
   health) and are shown by name under the boss's bar; every few fights two bosses come at once.
   - **Crowned bosses.** Every 10th fight is a Crowned boss: its own new final phase (new moves, by `VISION.md`'s
     rules: each telegraphed, none shared with another boss), the arena changed for that fight (light, ground,
     hazards: baked, inside Normal's budget), and a guaranteed rare blessing for winning. The HUD shows how many
     fights until the next one, so the endless run has chapters and a goal ("we hit Crowned 2 last time").
   The end screen shows bosses beaten and Crowned reached. Check: a test that the first fights draw only the easier
   bosses and that fight 10, 20 and 30 are Crowned; frames of a modifier on screen and of a Crowned fight.
6. **Upgrades from zero: not the loop's** (Aleix, 2026-11-13: "The current upgrades will be removed, I don't really
   like how they were thought"). A separate session, "Design all upgrades and special upgrades from zero", removes
   the five blessings and designs and builds the new upgrades, special upgrades and their pick screen with Aleix,
   then rewrites this item. Until it has, the loop skips this item and item 3's blessing pick, and doesn't touch
   `js/data/blessings.js`, `CONFIG.blessings` or the offer code; the rest of Boss Rush may assume a run hands out
   upgrades, without naming any. The old brief, for that session to keep or drop: Common blessings are small; rare ones are exciting and rare: skills, passives, things that
   change the fight, perhaps a companion. Rarity is shown. Like a true roguelike, an ability you already hold can be
   offered again as its next upgrade level (shown as such, with what the new level adds), so a run builds a strong
   kit. Upgrades happen inside the game, during the run (between fights, in the arena), never in a menu between runs;
   a run's upgrades end with it. It's multiplayer: an ability acts mainly on its owner and the boss, and touches
   teammates only lightly (a small shared buff at most), never slowing, moving or linking them. Players stack strong abilities: item 2's curve is tuned against a stacked, upgraded team, not a bare one, so
   it still reaches impossible.
   - **Pacts.** After fight 5, 15, 25 and every ten on, the team votes on one pact: the bosses get faster for the
     rest of the run (a step up item 2's pace curve, shown by name with the modifiers), and everyone gets a legendary
     blessing now. Majority wins; a tie or no vote by the blessing clock means no pact. The end screen lists the pacts
     taken.
   Check: the odds in a test; each rare one and an upgrade seen working in a fight; a test of the curve against a team
   holding a typical late-run kit; a test of a pact vote (majority, tie, timeout) and its pace step; a frame of the
   vote.
7. **Levels and crates.** Playing earns levels, kept per browser. Each level-up gives one crate, opened on the
   end-of-run screen: mostly small things (a weapon look, an emote, a common blessing), rarely a special ability that
   joins your blessing pool. A small Collection page off the lobby shows what you own and what's locked. No money, no
   shop, no loadout screen. Opening a crate is a roll like the old CS case opening: a strip of rewards spins past,
   eases to a stop on one, and that one reward is shown with its name, description and what it does, with great
   animation and effects; it should make players want another run just to open the next. Check: odds and saving in a
   test; a frame sequence of a crate rolling and landing, and the Collection.
8. **The weekly run.** Each week, a Weekly mode beside Boss Rush: the same boss order, modifiers and blessing offers
   for everyone (one seed from the week). A small board in the lobby shows the best fight reached and the fastest
   kills of this week's runs, by lobby name, kept by the server on Aleix's home server (a file on a mounted volume so container
   updates keep it; no accounts, no data beyond the lobby name and the numbers). Check: a test that two runs on the same week's seed meet the same bosses
   and offers, and that the board survives a server restart; a frame of the board.
