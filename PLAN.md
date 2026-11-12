# Plan

The order of work for the iterate loop, under `VISION.md`. Written by the director chat; the loop reads it every pass
and doesn't edit it (cuts and finds go to `BACKLOG.md`, questions to "Needs Aleix" in `STATE.md`). Decisions behind it:
the director's grilling with Aleix, 2026-11-12/13.

## Stage 1 (now): Ashmere's cast, the shared files, the scorecard

In this order; the Iron Shover pass already running finishes first.

1. **Iron Shover** in Blender (in progress).
2. **The shared files.** `BACKLOG.md` at the root takes the backlog out of `STATE.md`; the loop file's Notes section
   names `VISION.md`, `PLAN.md`, `STORY.md`, `STATE.md`, `BACKLOG.md`, `SCORECARD.md` and `.claude/feedback.md`;
   `AGENTS.md`'s opening points at `VISION.md` (what the game is), `PLAN.md` (what's next) and `STORY.md` (the story
   being built). Check: a fresh pass orients from these alone.
3. **The Toll Wisp's description** fits its model and `LORE.md`: a bell-ringer's soul in a robe, bound to a handbell
   (drop "a robe of blue flame"). Check: the enemy's description in the Arena list.
4. **Gargoyle** in Blender.
5. **Empty Sentinel** in Blender.
6. **`SCORECARD.md`**: one row per area in `VISION.md` (combat feel, characters and art, levels and content, bosses,
   co-op and multiplayer, menus and HUD, performance), each scored 1-5 with one sentence and a path of evidence. One
   row per Ashmere level under "levels and content". Check: every row has evidence a reader can open.
7. **The Ashmere bosses** in Blender, by how often they are met: the Pillager Captain, the Bell Warden, the Giant
   Skeleton, Aldric (both phases), then the Antlered Hunger. Boss budget 14,000.

**No more work on the old second road's characters** (Omenkin, Leyndell Knight, Golden Zealot, Ashen Warrior,
Cleanrot Knight, its eight bosses, Seren): they leave at the swap in stage 3. The Crucible Squire, Beastman and Grafted
Scion stay as they are until then.

**Acceptance check for a model (hardened):**
- a baked piece per bone, inside its triangle budget, its look follows `LORE.md` and its brief;
- the model lab sheet (front, back, side, silhouette): no flat-white or untextured surfaces, no texture whose repeat
  is plain to see, the weapon held in the hand at a believable angle;
- a frame in a level with the model **front-lit, facing the camera, at fighting distance**, readable at a glance;
- both images' paths in the pass report.

## Stage 2: the co-op mode, first playable version

Shape pending Aleix's answers (the director's round 3). Don't start it until this line is gone.

## Stage 3: the merged story (`STORY.md`), rough end to end, then the swap

Every chapter works roughly before any gets a second step. Rough means: playable from its loading line to its boss,
in order, in Story mode; stand-ins allowed for models (an existing Blender figure re-coloured, never hand-built
geometry), set dressing and dialogue polish.

1. **Act I's turn:** Aldric's death no longer ends the game. The Ember leaves him (`STORY.md`, the spine); chapter 6
   (the Church in the Pass) follows as part of the Story; Ysolde's lines and the chapter lines updated.
2. **Chapters 7 to 14**, one per item, each built from its old level as raw material: the place re-dressed and renamed,
   its boss (new name, look and moveset, reusing the old fight's engineering where it fits), its new enemy, Ysolde's
   words, the chapter line, inscriptions. Finn joins at chapter 6 as the champion's former squire.
3. **The ending** of `STORY.md` and the credits.
4. **The swap:** the Story is one road. The old second road goes: its levels as named, Seren, its bosses and arena
   category, its enemies, messages, ending and lobby ceremony. The arena and boss modes list the story's bosses. Saves
   start fresh (`CONFIG.story.saveVersion` bumped, old saves dropped). `LORE.md` becomes `STORY.md`'s story and
   `STORY.md` is deleted.

## Stage 4: deepen by the scorecard

The co-op mode's full version, Ashmere's weakest levels rebuilt, the story's new cast in Blender, combat and boss
polish: whichever `SCORECARD.md` and Aleix's feedback rank weakest, one at a time. The `beastFur` texture and the
unused kit parts in `BACKLOG.md` wait for this stage.
