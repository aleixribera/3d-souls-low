# The Bell Warden, built in Blender (v7.43.0)

The Bell Warden is the king's guard over the Bell of Waking (`LORE.md`: a bellkeeper chained in bronze, set at the top of the Seven's watchtower): Level 4's boss on the tower top, a 1v1 Arena boss, Boss vs Boss, the boss runs and The Calling. The game scales him 1.9x (bulk 1.25). He was 10,662 triangles of kit primitives (`castCuirass`, `carillonSkirt`, `carillonHelm`, `layeredPauldron`, `chain`, `plateBands`, `gauntlet`, `greave`, `manacle`, `clothStrip` over the kit's mail body). He is now a Blender model, the second of `PLAN.md` stage 3 track B item 2.

## What it is

- `tools/blender/bellwarden.py` builds him at the rig's rest pose, one rigid piece per bone, named `bell:<bone>__<material slot>[.n]`. Shoulders at x +-.37, elbows y 1.25, wrists .95. The linen strips hang on `loinF` / `loinB` and swing as before.
- The look keeps the brief (the comment at the top of `js/data/models-bosses.js`), a bellkeeper cast like the bell he keeps:
  - a bell for a helm: a crown loop and four casting ribs, an inscription band, a heavy sound-bow lip over the shoulders, and a barred gaol window where a face would be, set back to a dark inside (`void`), the two cold lights behind the bars;
  - a fluted cuirass in the same bronze with raised V borders and rivets, two iron chains crossed over it and locked at the breast with a padlock;
  - small bells for pauldrons, mouths down over the arms, with lip bands and crown knobs;
  - a bell for a skirt, ribbed, flaring to a heavy lip at the knee, three gilt bands; a belt and buckle; a handbell hung at the right hip; linen strips front and back laid over the skirt's curve;
  - bronze couter cups, banded vambraces and greaves with knee cops; iron fists closed round the grip; shackles at the wrists and ankles with broken chain hanging from them.
- The chains are real links (`link()` / `chain()`), each turned a quarter from the last; `hanging()` drops a broken length from a shackle.
- One new slot, `void` (the window's inside). The bronze takes a verdigris tint (`0x9cb8aa`; untinted it read white-gold on the tower top), the model `rim: 0.45`, the linen `rim: 0.15` (edge-on it took the rim as a white line). The eyes are larger (`size` .016) and sit just in front of the dark inside.
- The kit's bell maul stays. It used to rest sunk 1.2 m into the floor (the `sway` idle lays a weapon at 1.25 rad, and the maul is 4 m long at his scale); a model's `weapon.rest` (new, opt-in, validated from -0.5 to 1.6) sets that angle, and the Warden's 0.65 stands the bell on its lip in front of him.
- 36 pieces, 10,712 triangles; 11,067 in the game with the bell maul, inside the 14,000 boss budget.
- The kit parts `carillonHelm` and `carillonSkirt` had no other user and are deleted.

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- bellwarden --export
node tools/pack-baked.cjs bellwarden
```

The preview sheet lands in `tools/blender/out/previews/bellwarden.png`.

## Checks

The model lab (front, back, side, silhouette), a frame on the tower top facing the camera at fighting distance, the in-page `model`, `bosses` and `Bell Warden` filters, the Node checks. Frames: `docs/scorecard/bellwarden-lab.jpg`, `docs/scorecard/bellwarden-tower.jpg`.
