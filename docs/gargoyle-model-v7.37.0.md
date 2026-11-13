# The Gargoyle, built in Blender (v7.37.0)

The Gargoyle is the castle's carved guardian, woken by the Ember's heat (`LORE.md`): four placements on the Final Castle's ledges (`perch`), and the 1v1 Arena. It was 1,740 triangles of kit primitives (`gargoyleHead`, `gargoyleChest`, `gargoyleWing` and four more over the kit's body) and read as a mannequin with a moth's wings. It is now a Blender model, the first one of `PLAN.md` stage 3 track B.

## What it is

- `tools/blender/gargoyle.py` builds it at the rig's rest pose, one rigid piece per bone, named `gargoyle:<bone>__<material slot>[.n]`. Shoulders at x ±.35 and arms 24% longer, as `MODEL_DEFS.gargoyle` has them; the model's posture hunches the chest and tilts the wings back in the game.
- The look follows the old brief (the comment on `MODEL_DEFS.gargoyle`):
  - a hound-demon's skull roaring open, fangs over and under, deep eye sockets under a heavy brow, horns swept back, pointed ears;
  - a verdigris bronze band over the brow with five points;
  - a carved muscular torso (pectorals, a carved belly, a groove down the sternum and the spine), a bronze collar and a sternum medallion, six spikes down the spine;
  - long corded arms, a carved stone plate and an elbow spur on each forearm, big open hands with four long curved talons and a thumb;
  - heavy thighs, a spur on each knee, hocked shins, raptor feet with three talons forward and one behind;
  - a stone tail arcing back to the ground with a spade at its tip, on a new `tail` bone that sways a little;
  - great stone wings on the `wingL` / `wingR` bones: an arm rising from the back to a high wrist with a hooked horn, an inward-curling volute over the root, four fingers fanning a scalloped membrane that billows back between them, and two tiers of carved covert feathers along the arm.
- Material slots: `stone`, `carved`, `wing`, `bronze`, `teeth`, `void` (no new slot). The `wing` slot is now `gargoyleStone` (double-sided): the old `gargoyleWing` feather texture repeated as a plain grid on the large membrane, and is gone.
- Rim light: the whole model takes `rim: 0.6` (its basalt is near black, so the full rim outlined it white) and the membrane's slot `rim: 0.15`. A slot's `rim` is new (`js/bodykit.js`, checked in `checkModel`): a broad sheet seen edge-on took the whole rim light and read flat white.
- 40 pieces, 2,992 triangles, inside the 3,000 enemy budget (no weapon).
- The seven kit parts it used (`gargoyleHead`, `gargoyleChest`, `gargoylePelvis`, `gargoyleWing`, `gargoyleClaws`, `gargoyleFoot`, `gargoyleTail`) had no other user and are deleted.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- gargoyle --export
node tools/pack-baked.cjs gargoyle
```

The preview sheet lands in `tools/blender/out/previews/gargoyle.png`.

## Checks

The model lab (front, back, side, silhouette; idle and walk), a frame in the Arena facing the camera and one on the Final Castle's wall-walk, the in-page `model` filter and the Level 5 scripted run, the Node checks (the texture fingerprints lose `gargoyleWing`). Frames: `docs/scorecard/gargoyle-*.jpg`.
