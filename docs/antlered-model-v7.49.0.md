# The Antlered Hunger, to the hardened model check (v7.49.0)

The Antlered Hunger is Level 6's boss in the church in the pass (`LORE.md` 10b: the stag the hunger put on, grown: antlers, a skull for a face, quills along its back), and a boss in the 1v1 Arena, Boss vs Boss, the boss runs and The Calling. It has been a Blender model since v7.20.0 (`docs/church-in-the-pass-v7.20.0.md`). This release brings it up to `PLAN.md`'s hardened acceptance check for a model, the last Ashmere boss of stage 3 track B item 2.

## What changed

- **The skull.** The head was a smooth tapering snout with two small dark bumps: it read as a lizard's. `antlered_beast.py` now builds a stag's skull: a broad, flat face under a heavy brow, a domed cranium, cheekbones and their arches back to the jaw hinge, and a wide, flat-topped muzzle. The eye sockets (tilted so the inner corners drop: a scowl) and the nasal hole are cut through it by booleans (`carve()`, as `giant.py` does), each with a flat dark back (the `quill` slot) at the bottom of the hole. The skull is still drawn 1.32x about the crown of the neck.
- **The eyes** sit inside the sockets: `eyes` `at` [0, .1, .28], `spread` .1, `size` .022.
- **The rim light.** The quills read silver and the antler tips, claws and hide outline white: the full rim light on thin spikes and a dark hide. The model takes `rim: 0.4`, the quills' slot `rim: 0.15`, the bone slot `rim: 0.5`.
- 22 pieces, 12,474 triangles in the game (11,880 before), inside the 14,000 boss budget. Slots unchanged (`hide`, `quill`, `bone`, the eyes' glow).

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- antlered_beast --export
node tools/pack-baked.cjs snow-church
```

`snow-church` packs `antlered_beast`, `church` and `snow_land` together; the other two come from their exports in `tools/blender/out/` unchanged. The preview sheet lands in `tools/blender/out/previews/antlered_beast.png`.

## Checks

- The model lab (front, back, side, silhouette): `docs/scorecard/hunger-lab.jpg`; the face at 2x: `docs/scorecard/hunger-face.jpg`.
- In the church, facing the player at fighting distance: `docs/scorecard/hunger-church.jpg`.
- In-page filters `model`, `Church`, `Hunger`, `Ultra models`, `valid`.

## Not yet

- The hide's `beastHide` texture is the `bark` pattern and reads as gnarled wood more than fur; a hide of its own is stage 4 work (`BACKLOG.md`).
