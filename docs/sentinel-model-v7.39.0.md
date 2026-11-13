# The Empty Sentinel, built in Blender (v7.39.0)

The Empty Sentinel is the Ironbound's giant, a suit of armour whose wearer was fed to the Ember whole (`LORE.md`): the Final Castle's bridge guard and an elite on the upper walls, three placements in the Lands' levels, and the 1v1 Arena. The game scales it 1.65x. It was 2,684 triangles of kit primitives (`sentinelHelm`, `sentinelCuirass`, `sentinelSash`, `sentinelSashHem`, `sentinelPauldron`, `sentinelGauntlet`, `sentinelTassets`, `sentinelGreave` over the kit's mail body) with mushroom-cap pauldrons. It is now a Blender model, the second of `PLAN.md` stage 3 track B item 1.

## What it is

- `tools/blender/sentinel.py` builds it at the rig's rest pose, one rigid piece per bone, named `sentinel:<bone>__<material slot>[.n]`. Shoulders at x +-.42, arms 4% longer (elbow y 1.238, wrist .926), as `MODEL_DEFS.emptySentinel` has them. The sash panels hang on the `sashF` / `sashB` bones it already had (cloth sway).
- The look follows the old brief (the comment on `MODEL_DEFS.emptySentinel`):
  - a tall narrow ovoid close-helm with a sharp keel down its face, a filigree brow band, a horsehair crest on the crown, a dark eye slit and two columns of breathing holes: nothing inside but the dark, and two points of cold light (`eyes`, 0xcfe2ff) behind the slit;
  - a wide gorget of three rings, a heavy breastplate with a ridge, a filigree plackart over the upper breast;
  - a pale surcoat sash wound from the right shoulder to the left hip over the plate (`torso()` follows the cuirass and the belt), dark border stripes along both edges, and two hanging panels front and back with the same stripes and hems torn to rags;
  - great horizontally flared pauldrons, high against the neck, low over the arm, the outer lip turned up, a filigree inlay over the crown and two rerebrace lames;
  - barrelled filigree vambraces with projecting couters and flared cuffs, closed gauntlets (the empty left fist filled so it doesn't read as a hook);
  - a molded belt, two filigree fauld lames, a mail skirt; filigree tassets and domed knee cops over mail thighs; keeled greaves and laminar sabatons.
- Material slots as before (`plate`, `filigree`, `mail`, `plume`, `cloth`, `trim`, `rags`, `blade`, `void`), plus `haft`: the halberd's shaft in the plate's brass with `rim: 0.4`, since a long thin shaft is all edge and took the rim light as white. The blade slot takes `rim: 0.6`, the whole model `rim: 0.45` (its polished gold read washed-out grey under the full rim).
- `sentinelFiligree` is a new texture pattern, `filigree` (`js/textures.js`): engraved scrolls on polished plate, a curl per cell winding the other way from its neighbours', a vine through the rows, grime in the grooves. It was the `feathers` pattern, which on the plate read as a grid of scales repeated plainly.
- 36 pieces, 2,508 triangles; 2,856 with the kit's halberd, inside the 3,000 enemy budget.
- The eight kit parts it used had no other user and are deleted; the kit still builds `sentinelHalberd`.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- sentinel --export
node tools/pack-baked.cjs sentinel
```

The preview sheet lands in `tools/blender/out/previews/sentinel.png`.

## Checks

The model lab (front, back, side, silhouette; idle and walk), a frame in the Arena facing the camera and one on the Final Castle's moat bridge, the in-page `model`, `Ultra models` and execution filters, the Node checks (the texture fingerprints change only for `sentinelFiligree`). Frames: `docs/scorecard/sentinel-*.jpg`.
