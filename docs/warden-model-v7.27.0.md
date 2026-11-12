# The Shield Warden, built in Blender (v7.27.0)

The Shield Warden is the Ironbound gaoler (7 placements: two in the Sunken Keep, one each in the Burning Town and the Final Castle, and three in the Lands Between, one of them elite). It was 8,048 triangles of kit primitives, the furthest of any enemy over the 3,000 budget, and it read as a tin can: a bucket helm, mushroom pauldrons and a box of a chest. It is now a Blender model, built the same way as the Undead Knight (`docs/knight-model-v7.24.0.md`).

## What it is

- `tools/blender/warden.py` builds it at the rig's rest pose, one rigid piece per bone, named `warden:<bone>__<material slot>`.
- The look follows LORE.md: the king's old household guard, set over the deep gaol. It wears heavy blued plate:
  - a tall flat-topped tower helm with a blunt ridge down the face, a riveted brow band, and a cross of dark slits (the eyes glow in the eye slit);
  - mail at the neck under a standing collar;
  - a broad squared cuirass with a ridge, and a two-lame plackart over the belly;
  - round pauldrons with two lames, the sword arm's the larger, with three short spikes on its crown;
  - mail sleeves, couters and vambraces, dark gauntlets closed round the grip;
  - a belt, a mail skirt, a fauld, and a ring of three long gaol keys on the left hip;
  - mail on the thighs under cuisses, knee cops, greaves and dark sabatons.
- One material slot is new on `MODEL_DEFS.ironWarden`: `dark` (the slits, as on the Undead Knight). The gauntlets, the plackart, the rivets, the spikes and the sabatons use the darker `guard` steel the model already had; the keys use `rust`.
- 27 pieces, 2,244 triangles of body. With the kit-built greatshield (on the left forearm) and the warden's greatsword it is 2,996, inside the 3,000 enemy budget.

## Models that extend it

`MODEL_DEFS.ironWarden` is the base of three other models: the Crucible Knight (a boss), the Leyndell Knight and the Cleanrot Knight. A child without its own `body` inherits the parent's, and the baked warden's body is all null. The Crucible Knight sets its own body. The Leyndell and Cleanrot Knights now set `body: IRONBOUND_BODY`, the kit's mail body they had before. `js/validate.js` now fails at load when a model's resolved body is all null and none of its parts is baked.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- warden --export
node tools/pack-baked.cjs warden
```
