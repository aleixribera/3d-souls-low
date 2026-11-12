# The Grafted Scion, built in Blender (v7.31.0)

The Grafted Scion is one of Godrick's grafted things (LORE.md, Stormveil): 9 placements in Stormveil, the Ashen Capital, the Evergaol and the Haligtree. It was 5,474 triangles of kit primitives, over the 3,000 enemy budget. It is now a Blender model, built the same way as the Beastman and the Toll Wisp (`docs/wisp-model-v7.30.0.md`).

## What it is

- `tools/blender/scion.py` builds it at the rig's rest pose, one rigid piece per bone, named `scion:<bone>__<material slot>[.n]`. The left arm is 18% longer (elbow y 1.196, wrist .842), the right 15% (elbow 1.205, wrist .86), as `MODEL_DEFS.graftedScion.limbs` has them. The posture hunches it low in the game.
- The look keeps v5.5's brief (the comment on `MODEL_DEFS.graftedScion`):
  - a starved pale body: ribs pressed in down the front and the sides, the belly sunk under them, the spine's knuckles down the back, bony shoulders and collarbones;
  - dark stitched seams down the breastbone, across the belly, round every grafted stump, and round the top of both arms (they were sewn on too);
  - a blank gold mask over a bald pale skull: two narrow eye slits where the eyes glow, a mouth seam, a soft nose ridge and a raised brow; behind it a gold band and eleven flat knife-rays fanned over the head, long and short in turn;
  - a corded neck with a stepped gold circlet;
  - four extra arms sewn on at the shoulder blades and the flanks (v5.5's points), each with a knobbed elbow and a fist gripping a narrow curved blade with a small cross-guard;
  - long thin arms with knobbed elbows, the left hand open with long bony fingers, the right a fist on the scimitar's grip with three leather bands on the forearm;
  - a leather belt with a gold buckle over a torn rag skirt, the loincloth's front and back flaps on the `loinF` / `loinB` cloth bones;
  - thin thighs, knobbed knees, leather-bound shins, bare bony feet with four toes.
- No new material slots (`skin`, `gold`, `void`, `cloth`, `leather`, `blade`, `eye`). The body is all null; the kit builds the scimitar.
- 35 pieces, 2,774 triangles, 2,900 with the scimitar, inside the 3,000 enemy budget.
- The shins are exact open rings (`hard`), not a voxel-remeshed volume: a long thin piece decimates to slivers whose smooth normals tip toward its capped end, and a shin lit that way reads grey-white.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- scion --export
node tools/pack-baked.cjs scion
```
