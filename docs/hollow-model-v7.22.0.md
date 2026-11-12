# The Hollow Soldier, built in Blender (v7.22.0)

The Hollow Soldier is the enemy the player meets most (36 placements across the levels). It was a mannequin of kit primitives: square shoulders, a gambeson that read as a box, and tube legs. It is now a Blender model, built the same way as the wanderer (`docs/wanderer-model-v7.21.0.md`).

## What it is

- `tools/blender/hollow.py` builds it at the rig's rest pose. It makes one rigid piece per bone, named `hollow:<bone>__<material slot>[.n]`. The `hollow:` prefix keeps its names apart from the wanderer's in the shared `BAKED` table.
- The look keeps v5.5's brief:
  - a quilted ochre gambeson with a standing collar and puffed sleeves;
  - two straps crossed over the chest and back;
  - a belt with a pouch;
  - rust-red trousers;
  - leather cuffs and gloves;
  - iron knee cops over turned-down boot cuffs;
  - a dented, crested morion over a sunken face (eye sockets and cheeks pressed in, where the glowing eyes sit).
- The gambeson's skirt is one body-wide shape cut into three pieces: the back panel hangs from the hips, and a front half hangs from each thigh. The halves overlap at the middle, so the skirt swings with each stride and never cuts through a leg.
- It has 2,754 triangles of body and 2,920 with the `ruinedSword`, which is still built in the kit. That is inside the 3,000 enemy budget. The iron material is double-sided, so the helmet and knee cops are single sheets.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- hollow --export
node tools/pack-baked.cjs hollow
```

`tools/blender/figure_lib.py` holds the shape helpers the wanderer and the hollow share. Start a figure with `begin(colours, prefix)`, build its pieces with `soft()` (fused cloth and boots) and `hard()` (plates, sheets and straps), then return `tally()`.

## Checked

- The model lab (`MODELLAB.open('hollowSoldier')`): idle, walk, the overhead strike and the death dissolve.
- Level 1 on High and Low.
- The in-page `odel` and `Hollow` filters.
