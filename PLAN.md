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
- The five blessings: overhauled (track B, item 3).
- End-screen titles: plain English, the loop's wording.
- Chapters 6-14's words: the loop's draft stands. Story text is a draft the loop may rewrite.
- THE ROAD GOES ON stays until the ending ships; after that the story keeps growing until Aleix stops it.
- What replaces the Elden Ring bosses: nothing. Boss Rush, Practice and the lobby modes use the story's own bosses:
  Ashmere's five (Pillager Captain, Bell Warden, Giant Skeleton, Aldric, the Antlered Hunger) and chapters 7-14's
  (Ostrey, Hale and Harrow, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade).

## A model or boss is done when

The agent has seen it working in a preview, standing and through every attack, and judged whether it will work in the
game; then a frame of it in its level. Both images in the pass report. Triangle counts are a soft warning, not a rule.

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
   they draw below the screen's own resolution and get stretched: that counts as below 100% and goes. Build a stand-in for integrated graphics that any pass can run on this PC in under
   two minutes (for example a GPU frame-time budget per frame), calibrated once on Aleix's Fedora laptop when he opens
   it (log it under "Needs Aleix"). Check: the stand-in holds 60 fps on every level and in a four-player Boss Rush
   fight.
4. **Ashmere's five bosses** get new movesets, effects and animation by the same rules; their Blender models stay (and
   may be improved).
5. **Progression:** flasks found along the road, enemies stronger chapter by chapter. Check: flask count and enemy
   strength across chapters in a test, and a play-through frame per act.
6. **Telling the story without taking control.** Find the best way to tell this story (places, NPCs, inscriptions,
   in-world scenes) and remove every moment that takes movement or the camera away from the player: cutscenes, locked
   cameras, cards that freeze play. Check: play each chapter's story moments with the player moving and turning the
   camera throughout.
7. **Levels that hurt the story** rebuilt or replaced, rarely. Then the stand-in figures (Ysolde, the chapters'
   regular enemies) in Blender.

## Track B: Boss Rush

1. **Boss Rush and Practice.** The Calling becomes **Boss Rush**, the lobby's default. The title screen: Story, Boss
   Rush, Practice. The leader's small Mode option: Boss Rush, Single, Double, Triple, Quad Boss, and the story for
   co-op. **Practice** replaces the 1v1 Arena, Boss vs Boss and the Levels menu: pick any enemy or boss (one or
   several, or two teams against each other) or any level, and be fighting in seconds. Check: frames of the title,
   the lobby option and Practice at desktop and phone width; a test starts each mode.
2. **Endless.** A run goes on until everyone falls. The first few fights draw from the easier bosses, then every boss
   can come. Each fight is harder than the last, from one `CONFIG` rule: exponential in fights won but subtle, fairly
   easy at first, slowly more challenging for a good while, then genuinely impossible. The team-size multipliers
   (`CONFIG.group`, `setGroup`, the server's per-tick scaling) are removed for every enemy and boss in every mode; a
   group of four meets the same boss a solo player does. Bosses still spread their attention over the group
   (`CONFIG.aggro`);
   modifiers appear after the first few fights (faster, harder-hitting, an extra phase, burning ground, a second boss)
   and are shown by name under the boss's bar; every few fights two bosses come at once. The end screen shows bosses
   beaten. Check: a test of fight 1, 5, 10, 20 and 40's numbers (the curve), a test that 1 and 4 players face the same boss, and a frame of a modifier on screen.
3. **Blessings overhaul.** Common blessings are small; rare ones are exciting and rare: skills, passives, things that
   change the fight, perhaps a companion. Rarity is shown. Like a true roguelike, an ability you already hold can be
   offered again as its next upgrade level (shown as such, with what the new level adds), so a run builds a strong
   kit. Upgrades happen inside the game, during the run (between fights, in the arena), never in a menu between runs;
   a run's upgrades end with it. It's multiplayer: an ability acts mainly on its owner and the boss, and touches
   teammates only lightly (a small shared buff at most), never slowing, moving or linking them. Players stack strong abilities: item 2's curve is tuned against a stacked, upgraded team, not a bare one, so
   it still reaches impossible. Check: the odds in a test; each rare one and an upgrade seen working in a fight; a
   test of the curve against a team holding a typical late-run kit.
4. **Levels and crates.** Playing earns levels, kept per browser. Each level-up gives one crate, opened on the
   end-of-run screen: mostly small things (a weapon look, an emote, a common blessing), rarely a special ability that
   joins your blessing pool. A small Collection page off the lobby shows what you own and what's locked. No money, no
   shop, no loadout screen. Opening a crate is a roll like the old CS case opening: a strip of rewards spins past,
   eases to a stop on one, and that one reward is shown with its name, description and what it does, with great
   animation and effects; it should make players want another run just to open the next. Check: odds and saving in a
   test; a frame sequence of a crate rolling and landing, and the Collection.
5. **The UI redesign**, the whole game. References first: screens from popular games praised for their UI (Dark Souls
   III and Elden Ring for calm, Hades for clarity in a run, Lies of P, Sekiro and others), the patterns they share,
   and one screen (the title or the lobby) shown to Aleix under "Needs Aleix" before the rest. Plain English,
   easy to use, the game's dark tone. Check: desktop and phone frames of every screen against the `design-audit` rule
   book.
