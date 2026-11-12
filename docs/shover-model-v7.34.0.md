# The Shover, built in Blender (v7.34.0)

The Shover is the Ironbound brute behind a wall of a shield: 6 placements, in the Tower (three: two stair sentries and one in a zone), the Final Castle, Stormveil and the mixed test level. It was 5,248 triangles of kit primitives over the kit's mail body, over the 3,000 enemy budget, and read as a mannequin behind a door. It is now a Blender model, built the same way as the Shield Warden (`docs/warden-model-v7.27.0.md`).

## What it is

- `tools/blender/shover.py` builds it at the rig's rest pose, one rigid piece per bone, named `shover:<bone>__<material slot>[.n]`. Shoulders at x ±.35, as `MODEL_DEFS.ironShover.proportions` has them; the model's posture hunches it forward in the game.
- The look keeps the old brief (the comment on `MODEL_DEFS.ironShover`: a barrel-chested brute behind a wall-sized shield, no weapon, the shield is the weapon) and LORE.md (the Ironbound: the king's old household guard, kept at their posts past death):
  - a kettle hat with a comb front to back, a wide brim level over the face and sloping down at the sides and the back, three iron rivets on its band;
  - a high bevor over the chin and mouth, the face in shadow between it and the brim (the eyes glow there);
  - a mail aventail from the hat over the shoulders, an iron gorget;
  - a deep round cuirass bound with two iron hoops like a barrel, the pavise's leather guige strap across it front and back, a worn gilt collar rim;
  - a great pauldron (a cop and two lames, three iron rivets) on the shield arm, a small one on the other;
  - mail sleeves; a plate vambrace on the shield arm, a leather bracer bound with two iron bands on the other; heavy iron fists;
  - a wide belt with a gilt buckle over a mail skirt and two lames of fauld;
  - a long brown tabard front and back on `loinF` and `loinB`, a worn gilt band down the front;
  - mail thighs under cuisses with knee cops, greaves bound with an iron band, iron sabatons.
- One new material slot on `MODEL_DEFS.ironShover`: `dark` (the face's shadow). The front band uses `trim` (worn gilt): in `stripe` it was the same cloth texture as the tabard and could not be told from it. Its body is now all null.
- 37 pieces, 2,428 triangles of body. With the kit-built pavise (`bulwarkShield`, 560 triangles, on the left forearm) it is 2,988, inside the 3,000 enemy budget.
- No kit part loses its last user.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- shover --export
node tools/pack-baked.cjs shover
```

The preview sheet lands in `tools/blender/out/previews/shover.png`.

## Checks

The model lab (front, back, side, silhouette, idle and walk), the mixed test level with a Shover in play, the in-page `model` and `Shover` filters, the Node checks.
