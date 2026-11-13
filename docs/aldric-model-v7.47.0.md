# Aldric, built in Blender (v7.47.0)

Aldric, the Gaoler King (`LORE.md` section 2: the last king to swear the Oath of the Open Hand, who broke the Seven's seal and took the Ember) is Level 5's boss: the Field of Answer, then the throne room, where he becomes Aldric, the Ember-Crowned. He is also a 1v1 Arena boss, Boss vs Boss, the boss runs and The Calling. The game scales him 1.75x (bulk 1.25). He was 12,974 triangles of kit primitives (`castCuirass`, `greatHelm`, `gaolerCrown`, `gorget`, `layeredPauldron`, `oathLock`, `chain`, `vambrace`, `manacle`, `gauntlet`, `kneeCop`, `greave`, `clothStrip`, `capeSegment` over the kit's mail body). He is now a Blender model with both phases' looks, the fourth of `PLAN.md` stage 3 track B item 2.

## What it is

- `tools/blender/aldric.py` builds him at the rig's rest pose, one rigid piece per bone, named `aldric:<bone>__<material slot>[.n]`. The model id stays `varn` (ids never change). Shoulders at x +-.38, elbows y 1.25, wrists .95. The tabard hangs on `loinF` / `loinB`, the cloak on `capeA` to `capeD`, so the cloth swings as before.
- The look keeps the brief (the comment on `MODEL_DEFS.varn`), a soldier-king in ironbound plate gone dark bronze:
  - a closed great helm: a dark eye slit cut through it with the lights behind, breaths on the right cheek, a darker brow band and a strip down the face;
  - the crown of shackles: a gilt circlet, seven tines (the front one and every other tall), an open iron shackle hung under each;
  - a gorget of three dark lames; a cast cuirass with a medial keel, flutes round the back, gilt rims at neck and waist, raised gilt borders and rivets;
  - at the breast the Oath's lock: a dark heater-shaped plate, the Open Hand raised on it in gilt, a keyhole beneath; a chain of office of iron links hung to it from both shoulders;
  - layered pauldrons (a cap and three lames), the left one heavier, gilt rivets round the cap and a gilt edge on the lowest lame;
  - couters, vambraces with two gilt straps, a dark manacle at each wrist with a hinge and a ring, a broken chain off the left; gauntlets closed in fists round the greatsword;
  - a belt with a gilt buckle, three fauld lames, a mail skirt; the slate tabard front and back, a tarnished gold stripe down the front;
  - cuisses, gilt knee cops with fans, keeled greaves, sabatons; a long ash-grey cloak from the shoulders torn into eight strips below the knee.
- **The Ember-Crowned:** the `burn` slot holds cracks walked over the helm (up from the slit's ends), the cuirass (out from the lock) and both pauldrons. A material's new opt-in `burn: true` (glow slots only, checked at load) hides the slot's mesh until the boss burns: `js/finale.js` shows it while a phase with `ignite` has caught (the moment the armour starts to glow) and hides it again when he dies. Drawing only.
- New slots `void` (the slit's inside, the breaths, the keyhole) and `burn`. The model sets `rim: 0.45`, the cloth slots `rim: 0.15` (edge-on, the old cloak took the rim light as a white sheet). The unused `skin` slot is gone.
- 54 pieces, 8,069 triangles; 8,225 in the game with the kit's greatsword, inside the 14,000 boss budget.
- The kit parts `castCuirass`, `gaolerCrown`, `oathLock`, `manacle` (`js/kit-identity.js`), `gorget` and `vambrace` (`js/kit-premium.js`) had no other user and are deleted.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- aldric --export
node tools/pack-baked.cjs aldric
```

The preview sheet lands in `tools/blender/out/previews/aldric.png` (it draws the `burn` cracks, which the game hides until he burns).

## Checks

The model lab (front, back, side, silhouette) with and without the cracks lit, a frame on the Field of Answer and one in the throne room as the Ember-Crowned, both facing the camera at fighting distance; the in-page `Aldric`, `model`, `bosses`, `Ultra models` and `valid` filters, the Node checks. Frames: `docs/scorecard/aldric-lab.jpg`, `aldric-lab-burning.jpg`, `aldric-field.jpg`, `aldric-throne.jpg`.
