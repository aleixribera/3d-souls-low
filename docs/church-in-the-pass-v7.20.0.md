# Level 6: the Church in the Pass (v7.20.0)

A standalone level after the Final Castle, built from the video "I Made a Full Boss Fight in Unreal Engine With AI"
(Can It Code?): a snowy hillside, spruces, a split-rail fence and iron crosses, a path to a tiered log church, an icon-lined
nave with four carved pillars, and an antlered skull beast that roars, chains claws, charges and leaps.

## What it is

- `js/levels/the-church.js`, listed in `LEVELS` after `final-castle`. It is in the Levels menu and not in either Story road.
- Rooms are collision only (`unseen`). Everything seen comes from Blender, baked into `js/baked/snow-church.js`.
- The Antlered Hunger: `js/data/bosses/antlered-hunger.js`. Two phases on one bar; also in the Arena's Bosses and Boss vs Boss.
- Story: `LORE.md`, sections 7 and 10b. The Story's ending stands; this is what was left of the hunger.

## How the models get into the game

No build step and no fetch, because the game must run from `file://`. So meshes are packed into a script:

1. `blender -b --factory-startup -P tools/blender/run_asset.py -- <stem> --export [--views=...]`, with stem one of
   `antlered_beast`, `church`, `snow_land`. It writes to `tools/blender/out/` (ignored by git; the scripts are the source).
2. `node tools/pack-baked.cjs` packs the GLBs and `snow_land.places.json` into `js/baked/snow-church.js`.

Rebuild all three before packing: `out/` is not in the repo.

`js/baked.js` decodes a mesh. Blender's UVs are dropped except on the painted walls: a tiling game texture goes on by
projecting each triangle along its main axis. Do not raise `bump` on a texture used this way: with projected UVs the
normals swing past the camera and `addRim` burns flat white. The Hunger's hide and quills use `bump: 0`.

The rooms and the Blender scripts must agree: `snow_land.py`'s `WALK` is the same rectangles as the level's rooms.

## New opt-in fields

| Field | On | Does |
|---|---|---|
| `scenery` | level | meshes, instances, materials, `far`, `plan` (planar ground meshes), `distant` (no shadows), `thin` (instances that thin out by preset), `tracks` (prints in the snow), `veil` (the dark doorway) |
| `unseen` | room, ramp | collision only; `dressRooms` skips it too |
| `lampFlame` | room | a flame on each lamp, for lamps a model already draws |
| `pillarSize` | room | side of its `pillars` (default as before); one pillar may set its own as `[x, z, size]`. Level 6's unseen rocks collide this way |
| `interior` | atmosphere | a second look for `rooms`, eased by `visuals.setInterior` as the camera crosses |
| `noRepeat` | enemy | after that many of one move in a row it must pick another (`Enemy.spent`), in chosen moves, reactions and follow-ups alike |

Validation for each is in `js/validate.js`, or `checkLook` in `js/visuals.js` for `interior`.

## Left out on purpose

The video's hero fights with a hammer and a fire wave. The player keeps the game's own kit here ("use what the game has").
The iron crosses have no collision: thin grave markers, not worth 22 pillars.
