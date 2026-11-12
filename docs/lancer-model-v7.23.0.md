# The Ashen Lancer, built in Blender (v7.23.0)

The Ashen Lancer is the enemy the player meets second most (16 placements). It was kit primitives: a boxy coat with shoulder blocks floating off it, a ball for a hood, and stick limbs. It is now a Blender model, built the same way as the Hollow Soldier (`docs/hollow-model-v7.22.0.md`).

## What it is

- `tools/blender/lancer.py` builds it at the rig's rest pose, one rigid piece per bone, named `lancer:<bone>__<material slot>`.
- The look keeps v5.5's brief:
  - a skull with deep eye sockets and a nose pit, in a pointed burlap hood that falls as a cowl;
  - a ragged poncho, parted over the ribs and sternum, drawn in at the waist with a torn, flared hem;
  - a twisted red cord round the cowl;
  - burlap caps over the shoulders;
  - bone arms with elbow knobs, forearms bound in leather, and fists closed round the glaive's shaft;
  - femurs, dark knee knobs, shins bound at the ankle, and bony feet;
  - a rag wound round the hips, tatters hanging front, back and sides, and a two-piece cloak down the back.
- The tatters and the cloak hang from the model's cloth bones (`loinF`, `loinB`, `loinL`, `loinR`, `capeA`, `capeB`), so they swing with its stride and lunges.
- The burlap is double-sided, so the hood, poncho, caps and tatters are single sheets. Dark `socket` masses sit inside the ribcage and the eye sockets so nothing shows through.
- It has 2,812 triangles of body and 2,992 with the `glaive`, which is still built in the kit. That is inside the 3,000 enemy budget.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- lancer --export
node tools/pack-baked.cjs lancer
```

## Checked

- The model lab (`MODELLAB.open('ashLancer')`): idle, walk and death.
- The Burning Town on High, at the game camera's distance.
- The in-page `odel` filter.
