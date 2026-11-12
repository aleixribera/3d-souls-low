# Plan

The order of work for the iterate loop, under `VISION.md`. Written by the director chat; the loop reads it every pass
and doesn't edit it (cuts and finds go to `BACKLOG.md`, questions to "Needs Aleix" in `STATE.md`). Decisions behind it:
the director's grilling with Aleix, 2026-11-12/13.

## Answers to "Needs Aleix" (STATE.md)

- The order of work: this plan.
- How he sees progress: every pass report shows its frames (for a model, the two in the check below).
- The Toll Wisp: the description changes to fit the model (stage 1, item 3).

## Stage 1 (now): the shared files and the scorecard

In this order; the Iron Shover pass already running finishes first.

1. **Iron Shover** in Blender (in progress).
2. **The shared files.** `BACKLOG.md` at the root takes the backlog out of `STATE.md`; the loop file's Notes section
   names `VISION.md`, `PLAN.md`, `STORY.md`, `STATE.md`, `BACKLOG.md`, `SCORECARD.md` and `.claude/feedback.md`;
   `AGENTS.md`'s opening points at `VISION.md` (what the game is), `PLAN.md` (what's next) and `STORY.md` (the story
   being built). Check: a fresh pass orients from these alone.
3. **The Toll Wisp's description** fits its model and `LORE.md`: a bell-ringer's soul in a robe, bound to a handbell
   (drop "a robe of blue flame"). Check: the enemy's description in the Arena list.
4. **`SCORECARD.md`**: one row per area in `VISION.md` (combat feel, characters and art, levels and content, bosses,
   co-op and multiplayer, menus and HUD, performance), each scored 1-5 with one sentence and a path of evidence. One
   row per Ashmere level under "levels and content", and one per boss under "bosses" (how it plays with 1 and with 3
   players). Check: every row has evidence a reader can open.

**No more work on the old second road's enemies and story** (Omenkin, Leyndell Knight, Golden Zealot, Ashen Warrior,
Cleanrot Knight, Seren, its levels): they leave at the swap in stage 3. Its eight bosses stay in the game as they are
(Aleix, 2026-11-13) but get no new art.

## Stage 2: the co-op boss rush, first playable version

A simple boss rush for friends: super cool boss fights, balanced for groups. It grows out of the multiplayer boss runs
that exist today (`gauntlet()` in `server/simulation.js`, `C.gauntlets`: Boss Only, Double, Triple, Quad). Working
name **The Calling** (*who rings me calls the crown to answer*; overridable, logged under "Needs Aleix"). Items in
order:

1. **Group scaling, for every boss automatically.** A boss's health, posture and stagger scale with the number of
   players fighting it, from one rule in `CONFIG` that every boss gets with no per-boss work, so a boss added later
   (Thrale's included) is balanced for groups the day it lands. A boss def may override the rule (opt-in field).
   Check: the same boss's bar and posture at 1, 2, 3 and 4 players, measured in a test.
2. **Bosses fight the group.** A boss spreads its attention: it switches targets by a readable rule (who hurt it most
   lately, who is closest, who is healing) instead of locking one player for the whole fight, and its big sweeps and
   area attacks are the ones that punish a group standing together. Check: frames and a test of a 3-player fight where
   the boss changes target at least twice and every player gets hit.
3. **The run.** From the lobby, the host starts a run: a length (5 bosses, about 20 minutes, by default) and a roster,
   random or picked by hand from **every boss in the game**, the old second road's bosses included, now and after new
   bosses arrive. Bots fill empty slots for a smaller group. The last fight of a run is two bosses at once. Players who
   fell rise for the next fight if anyone is standing when the boss dies; the run ends when all fall. Check: two
   browser clients and a bot finish a 3-boss run end to end.
4. **Blessings between fights.** At a bonfire between bosses, each player picks one of three blessings (data in
   `js/data/`, tuning in `CONFIG`): more damage, an extra flask, faster stamina, a wider parry, a revive on the spot
   once. They last the run. Check: a picked blessing's effect measured in a test, and the pick screen at desktop and
   phone width.
5. **The end of a run:** time, bosses beaten, deaths and damage per player (the damage leaderboard exists since
   v7.8.11), and "again" for the same group. Check: frames of the screen after a win and after a wipe.

Multiplayer invariants in `AGENTS.md` hold throughout; run `tests/multiplayer*.cjs`, `lobby-*.cjs` and
`reconnect-browser.cjs` for every item. Release when the stage is done.

**Acceptance check for a model (hardened):**
- a baked piece per bone, inside its triangle budget, its look follows `LORE.md` and its brief;
- the model lab sheet (front, back, side, silhouette): no flat-white or untextured surfaces, no texture whose repeat
  is plain to see, the weapon held in the hand at a believable angle;
- a frame in a level with the model **front-lit, facing the camera, at fighting distance**, readable at a glance;
- both images' paths in the pass report.

## Stage 3: two tracks side by side

Passes alternate between the two tracks: one item of track A, then one of track B, and so on. A track with nothing
left gives its turn to the other.

### Track B: bosses, the cast and the co-op mode

1. **Gargoyle**, then **Empty Sentinel**, in Blender.
2. **The Ashmere bosses** in Blender, by how often they are met: the Pillager Captain, the Bell Warden, the Giant
   Skeleton, Aldric (both phases), then the Antlered Hunger. Boss budget 14,000.
3. Then the weakest "bosses" or "co-op and multiplayer" row of `SCORECARD.md`, one at a time.

### Track A: the merged story (`STORY.md`), rough end to end, then the swap

Every chapter works roughly before any gets a second step. Rough means: playable from its loading line to its boss,
in order, in Story mode; stand-ins allowed for models (an existing Blender figure re-coloured, never hand-built
geometry), set dressing and dialogue polish.

1. **Act I's turn:** Aldric's death no longer ends the game. The Ember leaves him (`STORY.md`, the spine); chapter 6
   (the Church in the Pass) follows as part of the Story; Ysolde's lines and the chapter lines updated.
2. **Chapters 7 to 14**, one per item, each built from its old level as raw material: the place re-dressed and renamed,
   its boss (new name, look and moveset, reusing the old fight's engineering where it fits), its new enemy, Ysolde's
   words, the chapter line, inscriptions. Finn joins at chapter 6 as the champion's former squire.
3. **The ending** of `STORY.md` and the credits.
4. **The swap:** the Story is one road. The old second road goes: its levels as named, Seren, its enemies, messages,
   ending and lobby ceremony. Its eight bosses stay selectable wherever bosses are chosen (the Arena, the boss runs,
   The Calling), next to the story's bosses. Saves
   start fresh (`CONFIG.story.saveVersion` bumped, old saves dropped). `LORE.md` becomes `STORY.md`'s story and
   `STORY.md` is deleted.

## Stage 4: deepen by the scorecard

The Calling grown (a map run with the ash closing in, if the scorecard and Aleix want it), Ashmere's weakest levels
rebuilt, the story's new cast in Blender, combat and boss
polish: whichever `SCORECARD.md` and Aleix's feedback rank weakest, one at a time. The `beastFur` texture and the
unused kit parts in `BACKLOG.md` wait for this stage.
