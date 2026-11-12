# The Toll Wisp, built in Blender (v7.30.0)

The Toll Wisp is the soul of one of the tower's old bell-ringers (LORE.md): 12 placements in the Final Castle, Farum Azula, the Erdtree, the Evergaol and the Haligtree. It was 3,996 triangles of kit primitives, over the 3,000 enemy budget. It is now a Blender model, built the same way as the Rampart Bowman and the Beastman (`docs/beastman-model-v7.29.0.md`).

## What it is

- `tools/blender/wisp.py` builds it at the rig's rest pose, one rigid piece per bone, named `wisp:<bone>__<material slot>[.n]`. Both arms are 4% longer (elbows y 1.238, wrists .926).
- The look keeps v5.5's brief (the comment on `MODEL_DEFS.tollWisp`) and LORE.md's Toll Wisps:
  - an enormous wide-brimmed felt hat whose crown slouches back into a hooked point, a patterned border round the brim, a pale rope hatband with two tassels behind;
  - a face lost in shadow under the brim, a long bony nose catching the light, the soul's cold blue eyes (`MODEL_DEFS.tollWisp.eyes`), a flowing white beard down onto the chest;
  - a chestnut shoulder capelet in loose folds, a knotted cravat, sage shoulder caps, a buckled leather baldric from the right shoulder to the left hip;
  - wide brown sleeves crossed with pale X-lacing, flaring to gold cuffs over bony hands;
  - a twisted two-strand rope girdle with long tassels on the `tasselF` cloth bone, an angled belt with a buckle, a satchel on the left hip;
  - a dark coat open over a cream-gold brocade robe with a rust-amber stripe and a wide hem border, split down the middle so each half swings with its leg; a fold of the coat's back on the `robeB` cloth bone; boots under the hem;
  - LORE.md binds each ringer to a small bell of its own: a brass handbell with a wooden handle, held mouth down in the left hand.
- One material slot is new: `eye` (the glow of the eyes). The body is all null; the Wisp has no weapon.
- 48 pieces, 2,881 triangles, inside the 3,000 enemy budget.
- `bakedGeometry` now shares corners between triangles at the same vertex projected along the same axis. Without it a figure made only of baked pieces has three vertices per triangle, which the `Ultra performance` test rejects.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- wisp --export
node tools/pack-baked.cjs wisp
```
