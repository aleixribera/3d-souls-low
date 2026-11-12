# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 1 of the loop (2026-11-12): bootstrap, then the Rampart Bowman built in Blender, pass 1 of 1.
Acceptance check: the model lab shows the bowman as baked pieces (hood and gaunt face, canvas doublet, mantle, harness,
quiver of arrows, bracer, wrapped shins), inside 3,000 triangles with its bow; a level frame shows it in play.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden
  (`js/baked/*.js`; checked by `Ultra models` in `tests/suite.js` and validation at load).
- CI: Node checks and four browser shards on every push.

## Broken

Nothing known.

## wip/ branches

None.

## Needs Aleix

- (overridable) The order of work in `.claude/iterate.md`: Blender models by how often the player meets them, then the
  bosses. Say if another area should come first.
- (overridable) How you want to see progress: each pass reports with model-lab frames; say if you want something else.
