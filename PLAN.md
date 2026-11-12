# Plan

The order of work for the iterate loop. Written by the director chat; the loop reads it every pass and doesn't edit it
(the loop's cuts and finds go to `BACKLOG.md`). The vision is `AGENTS.md` and `LORE.md` until a `VISION.md` exists.

Under review with Aleix since 2026-11-12: the acceptance check for a model, the Lands Between characters (items 3-6
below) and the Toll Wisp's look. Until this note goes, keep building in this order.

## Stage 1: every character a Blender model

One character per pass, by how often the player meets it (placements across `js/levels/`, counted with
`enemy: '<id>'`). Done so far, v7.21-v7.32: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist,
Shield Warden, Rampart Bowman, Beastman of Farum Azula, Toll Wisp, Grafted Scion, Ash Executioner.

1. Crucible Squire (`crucibleSquire`, 7 placements)
2. Iron Shover, Omenkin, Leyndell Knight, Gargoyle (6 each)
3. Empty Sentinel, Golden Zealot, Ashen Warrior (5 each)
4. Varn, Cleanrot Knight (4 each)
5. The Ashmere bosses (`MODEL_DEFS` in `models-bosses.js`; budget 14,000)
6. The Elden Ring bosses (`data/bosses/*.js`; budget 14,000)

**Acceptance check for a model:** a baked piece per bone, inside its triangle budget, its look follows LORE.md and its
old brief (the comment on its `MODEL_DEFS` entry), checked in the model lab (front, back, side, silhouette) and in a
frame from a level.

## Later stages

- After stage 1: the weakest area by Aleix's feedback (`.claude/feedback.md`).
