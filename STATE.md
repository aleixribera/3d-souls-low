# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 2 picks the next item: the Beastman of Farum Azula (`MODEL_DEFS.beastman`, 13 placements), pass 1 of it.
First check the queued runs below; a red one comes first.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0, 2,760 tris with the bow; Castle Bowman shares it). `js/baked/*.js`; checked by the in-page `model`
  filter (5 tests), `Bowman` (4) and validation at load.
- CI: Node checks and four browser shards on every push.

## Broken

Nothing known.

## Queued runs

- CI run 43291833328 (v7.28.0 on main) and container run 43291838283 (tag v7.28.0) were in progress at hand-over.
  Check both (`gh run view <id>`), and that `ghcr.io/aleixribera/3d-souls-low:latest` reads anonymously.

## wip/ branches

None.

## Backlog

- Kit parts no model uses since v7.28.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet` (kit-identity.js,
  kit-premium.js, bodykit.js). Remove once stage 1 is done, with any others left unused.

## Needs Aleix

- (overridable) The order of work in `.claude/iterate.md`: Blender models by how often the player meets them, then the
  bosses. Say if another area should come first.
- (overridable) How you want to see progress: each pass reports with model-lab frames; say if you want something else.
