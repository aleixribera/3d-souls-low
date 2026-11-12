# Vision

What Combat Arena 3D is. This file wins over every other doc, the plan and the iterate skill. Aleix owns it; the
director chat edits it only with his OK for that change.

## The game

A Souls-like in the browser that Aleix plays with his friends. Playing together is the point: a co-op mode built for
a group of friends, and a lobby they drop into for a short session. Alone, it is one long story told across fourteen
chapters. Combat is weighty, readable and fair. Every character is a real Blender model in one dark-fantasy look.

## Who it is for

Aleix and his friends. It is not distributed beyond them. They like the bosses most.

## What it has

- **Co-op with friends:** a mode made for playing together, built around the bosses (shape being settled; see
  `PLAN.md`). The public lobby, friendly bots and the Boss Only / Double / Triple / Quad boss modes stay.
- **The story:** one road, `STORY.md` (*The Hunger That Wears a King*): Ashmere, then the Pass, then Thrale. It
  replaces the two roads the game has today. `LORE.md` is what is in the game now and follows `STORY.md` chapter by
  chapter as it is built.
- **The 1v1 Arena and the Levels menu**, with the story's bosses and levels.

## Rules

- Everything in the game is original: its world, names, characters, bosses and places. Other games are references
  for mechanics and feel, never for content.
- Real Blender models, Claude-only textures, no stock-AI UI (Aleix's standing rules in `~/.claude/CLAUDE.md`).
- Engineering rules and invariants: `AGENTS.md`.
- No area comes first by default. Each stage takes the weakest area for the state of the game, read from
  `SCORECARD.md` and Aleix's feedback. The areas: combat feel, characters and art, levels and content, bosses, co-op
  and multiplayer, menus and HUD, performance.
- Old content goes when the new replaces it. Build new things and delete old ones freely.

## Stages

1. Finish Ashmere's cast as Blender models under the hardened check; set up the shared files and the scorecard.
2. The co-op mode, first playable version.
3. The merged story, rough end to end, then the swap: the old second road and its bosses go.
4. Deepen by the scorecard: the co-op mode's full version, Ashmere's weaker levels rebuilt, the story's new cast in
   Blender, polish.
