# The Crucible Squire, built in Blender (v7.33.0)

The Crucible Squire is the young knight of the Crucible in the Lands Between: 7 placements, in the Stormhill Evergaol (three), Leyndell (two, one elite), Farum Azula and the Erdtree (one elite each). It was 8,430 triangles of kit primitives, the furthest over the 3,000 enemy budget of the models left. It is now a Blender model, built the same way as the Shield Warden (`docs/warden-model-v7.27.0.md`), whose plate it starts from.

## What it is

- `tools/blender/squire.py` builds it at the rig's rest pose, one rigid piece per bone, named `squire:<bone>__<material slot>[.n]`. Shoulders at x ±.37, as `MODEL_DEFS.crucibleSquire.proportions` has them.
- The look keeps the old brief (the comment on `MODEL_DEFS.crucibleSquire`): a young knight of the Crucible in dark bronze half-plate, slighter than the Crucible Knight, with the old life of the Crucible showing as gold and amber (LORE.md).
  - a closed helm with a prow down the face, a T of dark slits (the eyes glow in the cross-slit), a gilt brow band, a gilt cross-guard and crest spike on the crown, and two gilt horns rising out and up like a lyre;
  - mail at the neck under a gorget with a gilt rim;
  - a ridged cuirass with a gilt vortex boss on the breast;
  - a cluster of amber shards breaking out of the upper back, and another out of the right pauldron;
  - a short russet cape on the two cloth bones it had (`capeA`, `capeB`), its hem torn;
  - layered pauldrons (a cop and two lames, the sword arm's the larger) with three gilt rivets each;
  - mail sleeves, vambraces with couters, bronze gauntlets closed on the grip;
  - a belt, two lames of tassets, a mail skirt, and russet loincloths front and back on `loinF` and `loinB`;
  - mail on the thighs under cuisses with knee cops, greaves, bronze sabatons.
- One new material slot on `MODEL_DEFS.crucibleSquire`: `dark` (the slits, as on the Shield Warden). Its resolved body is now all null (it extended the Crucible Knight's mail body).
- 35 pieces, 2,190 triangles of body. With the kit-built oval shield (on the left forearm) and the knight's greatsword it is 2,992, inside the 3,000 enemy budget.
- The kit part `crystalCluster` has no users now.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- squire --export
node tools/pack-baked.cjs squire
```

The preview sheet lands in `tools/blender/out/previews/squire.png`.

## Checks

The model lab (front, back, side, silhouette, idle and walk), the Stormhill Evergaol with a Squire in play, the in-page `model` and `Lands` filters, the Node checks.
