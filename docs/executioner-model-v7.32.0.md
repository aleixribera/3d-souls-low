# The Executioner, built in Blender (v7.32.0)

The Executioner is one of the Ashbound (LORE.md: the king's own army, turned): 7 placements in the Tower, the Final Castle, Stormveil and the Ashen Capital, and the test level. It was 7,768 triangles of kit primitives, far over the 3,000 enemy budget. It is now a Blender model, built the same way as the Pale Duelist and the Grafted Scion (`docs/scion-model-v7.31.0.md`).

## What it is

- `tools/blender/executioner.py` builds it at the rig's rest pose, one rigid piece per bone, named `exec:<bone>__<material slot>[.n]`. Shoulders at x ±.37; the left arm 4% longer (elbow y 1.238, wrist .926), the right 2% (elbow 1.244, wrist .938), as `MODEL_DEFS.ashExecutioner.limbs` has them.
- The look keeps v5.5's brief (the comment on `MODEL_DEFS.ashExecutioner`):
  - unhelmed: a broad weathered face with a heavy square jaw, a brow ridge and a broad nose; auburn hair swept back over the crown in combed ridges, falling to ragged locks at the nape;
  - a black patch over the left eye (in front of its glow), its cord tied round the head on a slant;
  - a silver-grey hauberk of feathered scale: four rows of pointed leaf-scales over the chest, each row overlapping the next and flared at the tips, an open V collar over a dark undertunic, its edges turned back;
  - a leather strap from the right shoulder to the left hip, two red-and-white cord tassels hanging from it on the `tasselL` / `tasselR` cloth bones;
  - a feathered mantle down the back, four rows of larger scales, on the `cloakB` bone;
  - a banded amber sash at the waist, two rows of scales below it over the hips, a pouch at the right hip;
  - an olive skirt in four panels, each with an embroidered border at the hem, on four new cloth bones (`loinF`, `loinB`, `loinL`, `loinR`), so it swings instead of standing rigid round the legs; the side panels lap over the front and back ones;
  - feathered pauldrons (a domed cap with two tiers of scales), rust-orange sleeves;
  - the right forearm in a smooth leather bracer and a dark glove closed on the haft; the left in four overlapping scaled plates with three iron spikes on the outside and a scaled fist;
  - dark leather cuisses, three-banded greaves with iron knee-cops, dark boots.
- No new material slots. The kit still builds the greataxe (304 triangles).
- 45 pieces, 2,687 triangles, 2,991 with the greataxe, inside the 3,000 enemy budget.
- The kit parts `eyePatch`, `openCollar`, `featherMantle`, `waistSash`, `borderedSkirt` and `boot` have no users now.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- executioner --export
node tools/pack-baked.cjs executioner
```

The preview sheet lands in `tools/blender/out/previews/executioner.png`.

## Checks

The model lab (front, back, side, silhouette), the Tower's lower hall with an Executioner in play, the in-page `model` and `Ultra performance` filters, the Node checks.
