# The Undead Knight, built in Blender (v7.24.0)

The Undead Knight is the Ironbound heavy (11 placements). It was 7,388 triangles of kit primitives, more than twice the enemy budget, and it read as a tin can: a round helm floating over a box, mushroom pauldrons and stick legs. It is now a Blender model, built the same way as the Hollow Soldier and the Ashen Lancer (`docs/hollow-model-v7.22.0.md`).

## What it is

- `tools/blender/knight.py` builds it at the rig's rest pose, one rigid piece per bone, named `knight:<bone>__<material slot>`.
- The look keeps the model's brief:
  - a rounded close helm with a beaked visor, a low comb, a dark eye slit (the eyes glow in it) and breathing holes;
  - a broad gorget of two lames up under the helm's rim;
  - a swelling breastplate with a ridge down the front, drawn in at the waist;
  - great three-lamed pauldrons, the left the larger, over mail sleeves;
  - couters, banded vambraces with flared cuffs, and dark gauntlets closed round the grip;
  - a belt, a two-lame fauld and a mail skirt;
  - tassets over brown trousers, knee cops, greaves and dark sabatons.
- Two material slots are new on `MODEL_DEFS.undeadKnight`: `gauntlet` (darker plate) and `dark` (the slit and the holes).
- The slit and holes are one-sided sheets. The game culls back faces, so `figure_lib.hard(name, build, outward=(x, y, z))` turns a sheet's faces away from a point. The plates are thin solids, so they need no double-sided material.
- It has 2,812 triangles of body and 2,992 with the `knightGreatsword`, which is still built in the kit. That is inside the 3,000 enemy budget.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- knight --export
node tools/pack-baked.cjs knight
```

## Also in this release

The model lab (`js/model-lab.js`) places the rig every frame before it poses the model, as the game does. The twitch idle adds to the root's position, so without a fresh place each frame the rogue and the Pale Duelist drifted tens of metres out of the lab's view.

## Checked

- The model lab (`MODELLAB.open('undeadKnight')`): idle and walk.
- The Long Hall on High, at the game camera's distance.
- The in-page `odel` filter.
