# The Beastman of Farum Azula, built in Blender (v7.29.0)

The Beastman is the wolfish beast-man of the dragons' city: 13 placements in Farum Azula, the Erdtree and the Haligtree. It was 4,518 triangles of kit primitives, over the 3,000 enemy budget. It is now a Blender model, built the same way as the Rogue and the Rampart Bowman (`docs/rogue-model-v7.25.0.md`).

## What it is

- `tools/blender/beastman.py` builds it at the rig's rest pose, one rigid piece per bone, named `beastman:<bone>__<material slot>[.n]`. Both arms are 12% longer (elbows y 1.214, wrists .878). The model's posture hunches it in the game.
- The look keeps its brief (the comment on `MODEL_DEFS.beastman`) and LORE.md's Farum Azula:
  - a wolf's skull with a long muzzle, the mouth's line cut along its sides over a dark inside, bared canines, a nose pad, and long ears swept back (fur outside, hide inside); the eyes glow at the muzzle's root;
  - a thick ruff round the neck with locks hanging from it;
  - a lean chest with ribs pressed into the fur, under a shaggy mane of matted clumps over the shoulders and the upper back, a ridge down the spine, and 24 loose locks at the mane's edge for a ragged silhouette;
  - scraps of an old robe: a torn sash from the left shoulder to the right hip, front and back, a rope belt with a knot and two hanging ends, a ragged hem behind, two rag tails on `loinF` / `loinB`, a rag tied on the sword arm;
  - long furred arms with tufts at the elbows, big clawed hands (the left open, the right closed round the scimitar's grip);
  - heavy thighs over shins that run back to a raised hock and forward to clawed paws;
  - a bushy tail on the `tail` bone.
- No new material slots: `fur`, `hide`, `rags`, `leather`, `claw`, `void` were already on `MODEL_DEFS.beastman`. The body is all null now; the kit builds only the scimitar.
- 35 pieces, 2,800 triangles of body, 2,926 with the scimitar, inside the 3,000 enemy budget.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- beastman --export
node tools/pack-baked.cjs beastman
```
