# The Giant Skeleton, built in Blender (v7.45.0)

The Giant Skeleton is Level 1's boss at the end of the Long Hall, and a boss in the 1v1 Arena, Boss vs Boss, the boss runs and The Calling. The game scales him 2.3x (bulk 1.2). He was kit primitives (`ribcage`, `skullFace`, `longBone`, `boneHand`, `boneFoot`, `bonePelvis`, `boneNeck`, `knobs`) at 16,948 triangles in the game, over the 14,000 boss budget. He is now a Blender model, the third of `PLAN.md` stage 3 track B item 2.

## What it is

- `tools/blender/giant.py` builds him at the rig's rest pose, one rigid piece per bone, named `giant:<bone>__<material slot>[.n]`. Shoulders at x +-.34; the left arm is 30% longer (elbow y 1.16, wrist .77), the right is the club arm (elbow 1.25, wrist .95).
- The look keeps the brief (the comment at the top of `js/data/models-bosses.js`), a spectral giant:
  - a huge domed skull: real eye sockets and a nose hole cut by booleans (`carve()`, tilted ellipsoids, so the sockets scowl), dark backs behind them, a heavy brow ridge, cheekbones and their arches, a crack running back over the crown; the jaw hangs open, a tall plate of bone; blunt teeth with a few missing;
  - a spine that burns white (the `core` glow slot) from the skull's base through the neck and the thorax into the pelvis, its spines and the cord between the bodies in `dark`;
  - a deep barrel of nine pairs of ribs, drooping to the front, three of them snapped short; cartilage to a long sternum; clavicles; flat shoulder blades with a ridge;
  - a pelvis of two flaring wings with a crest, the pubic ring and hip sockets, a sacrum narrowing to the tail;
  - long bones with flared ends (`bone_shaft()`), round heads and condyles: humerus, radius and ulna, femur with its neck and trochanter, tibia, fibula and kneecap; splayed feet of long bones;
  - a long clawed left hand hanging open, drawn half again larger about the wrist; a right fist of bone closed round the club's haft.
- The posture tips the skull back further (neck 0.9 -> 0.75, head -0.45 -> -0.95): the old pitch left the face pointing at the floor, so at fighting distance the player saw only the crown. Now the sockets and their lights look down at the player.
- The kit's bone club stays. It used to rest with its head sunk into the floor; `weapon.rest: 0.5` lays the head on the floor in front of him.
- The eyes sit in the new sockets (`at` [0, .265, .2], `spread` .105).
- 29 pieces, 12,102 triangles; 12,574 in the game with the club, inside the 14,000 boss budget.
- The kit parts `ribcage`, `skullFace` (`js/bodykit.js`), `longBone`, `boneHand`, `boneFoot`, `bonePelvis` and `boneNeck` (`js/kit-premium.js`) had no other user and are deleted.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- giant --export
node tools/pack-baked.cjs giant
```

The preview sheet lands in `tools/blender/out/previews/giant.png`.

## Checks

The model lab (front, back, side, silhouette), a frame in the Long Hall facing the camera at fighting distance, the in-page `model`, `bosses`, `Giant` and `Ultra models` filters, the Node checks. Frames: `docs/scorecard/giant-lab.jpg`, `docs/scorecard/giant-hall.jpg`.
