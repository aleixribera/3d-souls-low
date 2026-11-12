# The Rogue, built in Blender (v7.25.0)

The Rogue is the Hollowed cutthroat (14 placements across the Long Hall, the Burning Town, the Sunken Keep, the Final Castle and the test courtyard). It was 5,248 triangles of kit primitives, the heaviest common enemy left in the early levels. It is now a Blender model, built the same way as the Hollow Soldier, the Ashen Lancer and the Undead Knight (`docs/hollow-model-v7.22.0.md`).

## What it is

- `tools/blender/rogue.py` builds it at the rig's rest pose, one rigid piece per bone, named `rogue:<bone>__<material slot>`. The left arm is 8% longer than the right, as the rig has it.
- The look keeps v5.5's brief:
  - a deep charcoal hood, a loose sheet with folds whose cowl drapes onto the shoulders, and a tail on the `hoodTail` cloth bone that swings;
  - a black face wrap with a slit for the eyes (`MODEL_DEFS.rogue.eyes` glow in it);
  - blue-black scale on the torso, arms and legs, under a leather jerkin open at the front with a collar;
  - two crossed chest belts with steel buckles, a belt and back skirt, a pouch;
  - front and back loin flaps on the `loinF` / `loinB` cloth bones;
  - a leather pauldron with a lame on the sword arm;
  - strapped bracers, gloves closed round the grips, and three spikes on the off-hand bracer;
  - blackened knee cops and greaves (open behind) over soft boots.
- One material slot is new on `MODEL_DEFS.rogue`: `strap` (a lighter leather for the belts, bracer straps and pouch). The hood and mask keep their double-sided materials, since the hood is an open sheet.
- 31 pieces. With the kit-built scimitar and dagger it is 3,000 triangles, exactly the enemy budget.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- rogue --export
node tools/pack-baked.cjs rogue
```
