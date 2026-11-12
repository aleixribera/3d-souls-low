# The wanderer, built in Blender (v7.21.0)

The player's model was the weakest thing on screen: it is in every frame of play, seen from behind, and it was a
mannequin of cylinders and spheres (a fishbowl head inside the cowl, mushroom-shaped pauldrons, a cape that read as a flat
white plank from the side). It is now a Blender model, built the same way as Level 6's Antlered Hunger.

## What it is

- `tools/blender/wanderer.py` builds it: one rigid piece per rig bone, named `<bone>__<material slot>[.n]`, modelled at the
  rig's rest pose (the bone positions are listed at the top of the script). Every key pose, the roll, the death and the
  cape's cloth springs drive it unchanged.
- The look keeps the v6.0 brief: a deep hood and shoulder mantle, the faded-red scarf wound at the neck and drawn over the
  face, a quilted gambeson under a leather cuirass, a mail skirt under a split coat (back panel on the hips, front tails
  on the thighs so they swing with the legs), a domed iron pauldron with three lames on the shield side and a leather one
  on the sword arm, vambraces, gloved fists, tall strapped boots, the cape in three bands with folds that open towards a
  torn hem, and the planked round shield slung on the back.
- About 11,000 triangles in Blender; 12,000 is the player budget with the longsword, which is still built in
  `js/kit-premium.js`. The materials and their tints are the old ones (`MODEL_DEFS.wanderer` in `js/data/models.js`).

## Rebuilding it

```
blender -b --factory-startup -P tools/blender/run_asset.py -- wanderer --export
node tools/pack-baked.cjs wanderer
```

`tools/pack-baked.cjs` now writes one file per entry of its `FILES` map (`snow-church`, `wanderer`); with no argument it
writes all of them, which needs every source's GLB in `tools/blender/out/`. The generated files add to one shared `BAKED`
table (`var BAKED = BAKED || {}`), so a new file only needs its line in `GAME_FILES` after `baked/snow-church.js`.

## Engine fix that came with it

`bodyParts` (`js/bodykit.js`) built the base neck, arms, hands, legs and feet even when a model set those body slots to
`null`, with no material: three.js drew them in its default white. The Hunger's were hidden inside its hide; the
wanderer's hands and soles showed, and on Low and High the Giant Skeleton's arms and legs were white tubes around its
bones. A `null` slot now means the part is left out, as it already did at Ultra detail.

`js/validate.js` checks, in the browser, that every `use: 'baked'` part names a packed mesh.

## Removed

The procedural parts only the old wanderer wore: `cuirass`, `coatBack`, `coatTasset`, `woundScarf`, `plankShield` and
`bandolier`. The others (`gambeson`, `layeredPauldron`, `cowl`, `mantle`, `capeSegment`, ...) are still worn by other models.
