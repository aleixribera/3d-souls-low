# The Pillager Captain, built in Blender (v7.41.0)

The Pillager Captain is the Ashbound's commander (`LORE.md`: the king's own army, turned, taken by the towns they burned for invaders): Level 3's boss on the burning town's height, a 1v1 Arena boss, Boss vs Boss, the boss runs and The Calling. The game scales him 1.45x. He was 14,631 triangles of kit primitives (`breastplate`, `warHelm`, `ramHorns`, `roundPauldron`, `spikes`, `couter`, `plateBands`, `gauntlet`, `kneeCop`, `greave`, `clothStrip`, `capeSegment` over the kit's mail body), over the 14,000 boss budget. He is now a Blender model, the first of `PLAN.md` stage 3 track B item 2.

## What it is

- `tools/blender/captain.py` builds him at the rig's rest pose, one rigid piece per bone, named `captain:<bone>__<material slot>[.n]`. Shoulders at x +-.40, elbows y 1.25, wrists .95. The loincloths hang on `loinF` / `loinB`, the cloak on the chain `capeA` to `capeD` (all as before, so the cloth swings as it did).
- The look keeps the v6.0 brief (the comment on `MODEL_DEFS.pillagerCaptain`):
  - a sallet with a low keel over the crown and a tail flared over the nape, a dark eye slit with the ember light behind it (`eyes` moved to sit in it), a pointed bevor;
  - iron ram horns from the temples, up and back, round behind the ear, the tips curling forward, ribbed with growth rings;
  - a gorget of three lames, a breastplate with a medial keel and rivets, a plackart over the belly;
  - layered pauldrons (a domed cap and three lames stepping down the arm), three iron spikes along the crown, a rivet ring;
  - fanned couters, vambraces with flared cuffs, gauntlets closed in fists round the halberd's grip;
  - a belt with an iron buckle, three fauld lames, a mail skirt; scorched loincloths front and back, a red rag of sash over the front one;
  - cuisses with fanned knee cops, keeled greaves, sabatons;
  - a dark cloak from the shoulders in four swinging pieces, torn into seven strips of different lengths below the knee.
- One new slot, `void` (the eye slit). The plate is a shade darker (`0x3a3634`, was `0x4a4644`, which read silver in the burning town). The model sets `rim: 0.4` and the cloak slots `rim: 0.15`: edge-on, the cloak took the rim light as a white sheet (`RIM.strength` 0 in the lab proved it).
- 39 pieces, 4,592 triangles; 4,719 with the kit's halberd, inside the 14,000 boss budget.
- The kit parts `warHelm` and `ramHorns` had no other user and are deleted; the kit still builds the halberd.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- captain --export
node tools/pack-baked.cjs captain
```

The preview sheet lands in `tools/blender/out/previews/captain.png`.

## Checks

The model lab (front, back, side, silhouette), a frame on the burning town's height facing the camera at fighting distance, the in-page `model`, `bosses` and `Captain` filters, the Node checks. Frames: `docs/scorecard/captain-lab.jpg`, `docs/scorecard/captain-town.jpg`.
