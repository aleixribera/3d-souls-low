# The Rampart Bowman, built in Blender (v7.28.0)

The Rampart Bowman is the Hollowed archer of the walls. With its Castle Bowman copy it has 23 placements (the Burning Town, the Sunken Keep, the Final Castle, Stormhill, Farum Azula), the most of any enemy still made of kit primitives. It is now a Blender model, built the same way as the Rogue (`docs/rogue-model-v7.25.0.md`).

## What it is

- `tools/blender/bowman.py` builds it at the rig's rest pose, one rigid piece per bone, named `bowman:<bone>__<material slot>[.n]`. The rig is the Rogue's: shoulders at x ±.31 and the left arm 8% longer.
- The look keeps its brief (hunched, a quiver bristling with arrows) and LORE.md's Hollowed:
  - a gaunt sunken face (`hollowBase` eyes glow in the sockets) in a deep canvas cowl with a peak over the brow;
  - a short ragged shoulder cape of canvas, open in front;
  - a fitted canvas doublet with a standing collar, a leather harness from the left shoulder across to the right hip, front and back, with an iron ring;
  - a leather quiver on the back, low on the right to over the left shoulder, an iron mouth band and seven arrows with pale crossed fletching;
  - bare sinewy arms, a bow hand in a leather glove with a studded bracer where the string slaps, rag wraps on the draw arm and a bare hand;
  - a belt and a pouch, the doublet's skirt (behind on `spin`, in front split on the thighs), two ragged canvas tails on `loinF` / `loinB`;
  - canvas breeches, shins bound in rag wraps, soft leather turnshoes.
- No new material slots: `skin`, `cloth`, `hood`, `leather`, `wrap`, `metal`, `wood` were already on `MODEL_DEFS.rampartBowman`. The body is all null now; the kit builds only the bow.
- 31 pieces, 2,590 triangles of body, 2,760 with the bow, inside the 3,000 enemy budget. Castle Bowman shares the model.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- bowman --export
node tools/pack-baked.cjs bowman
```
