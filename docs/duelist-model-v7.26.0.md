# The Pale Duelist, built in Blender (v7.26.0)

The Pale Duelist is the Hollowed fencer (10 placements in the Burning Town, the Tower, the Church and the Final Castle). It was 4,197 triangles of kit primitives and read as a mannequin: a blank head, a box of a doublet, and a cape like a flat board. It is now a Blender model, built the same way as the Hollow Soldier, the Ashen Lancer, the Undead Knight and the Rogue (`docs/hollow-model-v7.22.0.md`).

## What it is

- `tools/blender/duelist.py` builds it at the rig's rest pose, one rigid piece per bone, named `duelist:<bone>__<material slot>`. The left arm is 5% longer than the right, as the rig has it.
- The look keeps the model's brief (a gaunt fallen noble, upright and thin, a plumed cap, rapier and dagger):
  - a gaunt pale face: a long narrow jaw, a pointed chin, a long nose, sunken cheeks and deep sockets where the eyes glow;
  - a crimson beret slouched over the left, with a long white plume sweeping back;
  - a thick pleated millstone ruff;
  - a fitted linen doublet with a peascod front, seven gilt buttons, a gilt band at the waist and a skirt of tabs;
  - a crimson baldric from the right shoulder to the left hip;
  - paned crimson sleeve caps and trunk hose;
  - a crimson half cape over the left shoulder, falling in folds;
  - linen sleeves, grey gauntlet gloves with flared cuffs, closed round the grips;
  - pale hose, tall grey boots with turned-down cuffs, long toes and gilt ankle straps.
- The cape keeps its two cloth bones (`capeA`, `capeB`). The doublet's tails stay on `loinF` / `loinB`, and the crimson sash end on `loinS`.
- A bone can carry two pieces in one material slot. The second is named `<bone>__<slot>.1` (the gauntlet cuffs on the elbows, the boot cuffs on the knees). The part in `MODEL_DEFS.paleDuelist` drops the suffix from its `slot`.
- No material changed. The cloth, plume and cape materials were already double-sided, which the open sheets (the plume, the skirt, the cape, the tails) need.
- 35 pieces, 2,476 triangles of body. With the kit-built rapier and dagger it is 2,665, inside the 3,000 enemy budget.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- duelist --export
node tools/pack-baked.cjs duelist
```
