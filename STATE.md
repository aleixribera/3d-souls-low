# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 3 picks the next item: the Toll Wisp (`MODEL_DEFS.tollWisp`, 12 placements; 3,996 tris on the kit, over budget),
pass 1 of it. First check the queued runs below; a red one comes first.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0), Beastman of Farum Azula (v7.29.0, 2,800 body tris, 2,926 with the scimitar). `js/baked/*.js`;
  checked by the in-page `model` filter (5 tests), `Bowman` (4), `Lands` (15) and validation at load.
- CI: Node checks and four browser shards on every push.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids>` (model lab, 1600x640), `lab-zoom.cjs` (same with
  `DSF=2 CLIP=x,y,w,h`), `enemy-play.cjs <q> <dist> <levelId> <enemyId>` (a frame in a level; `HIDEP=1` hides the player).

## Broken

Nothing known.

## Queued runs

- The v7.29.0 push: CI on main and the container run for tag v7.29.0. Check both (`gh run list --limit 4`), and that
  `ghcr.io/aleixribera/3d-souls-low:latest` reads anonymously.

## wip/ branches

None.

## Backlog

- Kit parts no model uses since v7.28.0/v7.29.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet`, `wolfMuzzle`,
  `beastEars`, `furClumps` (kit-identity.js, kit-premium.js, bodykit.js). Remove once stage 1 is done, with any others
  left unused.
- The `beastFur` texture projects as vertical streaks that read like wood grain on the Beastman, and is brown where its
  brief says grey. A texture pass (Claude-only) after stage 1.
- Models over budget seen in the load warnings: seren 3,544, ashenWarrior 7,226, crucibleSquire 8,572 (budget 3,750),
  tollWisp 3,996. Their Blender passes fix it.

## Needs Aleix

- (overridable) The order of work in `.claude/iterate.md`: Blender models by how often the player meets them, then the
  bosses. Say if another area should come first.
- (overridable) How you want to see progress: each pass reports with model-lab frames; say if you want something else.
