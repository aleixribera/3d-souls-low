# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Pass 4 picks the next item: the Grafted Scion (`MODEL_DEFS.graftedScion`, 9 placements), pass 1 of it. First check the
queued runs below; a red one comes first.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0), Beastman of Farum Azula (v7.29.0, 2,800 body tris, 2,926 with the scimitar), Toll Wisp (v7.30.0,
  2,881 tris, a handbell in the left hand; the first figure with no kit part, so baked meshes now share corners). `js/baked/*.js`;
  checked by the in-page `model` filter (5 tests), `Bowman` (4), `Lands` (15), `Wisp` (1) and validation at load.
- CI: Node checks and four browser shards on every push.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids>` (model lab, 1600x640), `lab-zoom.cjs` (same with
  `DSF=2 CLIP=x,y,w,h`, CSS pixels of the 1600 view), `enemy-play.cjs <q> <dist> <levelId> <enemyId[#n]>` (a frame in a
  level; `HIDEP=1` hides the player; it does not lift the player onto a raised enemy, so pick one on the floor).

## Broken

Nothing known.

## Queued runs

- The v7.30.0 push: CI on main and the container run for tag v7.30.0. Check both (`gh run list --limit 4`), and that
  `ghcr.io/aleixribera/3d-souls-low:latest` reads anonymously.

## wip/ branches

None.

## Backlog

- Kit parts no model uses since v7.28.0/v7.29.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet`, `wolfMuzzle`,
  `beastEars`, `furClumps`, and since v7.30.0 `wispHat`, `wispBeard`, `wispMantle`, `wispSleeve`, `wispRobe`, `wispTassels`
  (kit-identity.js, kit-premium.js, bodykit.js). Remove once stage 1 is done, with any others
  left unused.
- The `beastFur` texture projects as vertical streaks that read like wood grain on the Beastman, and is brown where its
  brief says grey. A texture pass (Claude-only) after stage 1.
- Models over budget seen in the load warnings: seren 3,544, ashenWarrior 7,226, crucibleSquire 8,572 (budget 3,750),
  ironShover 5,248, ashExecutioner 7,768. Their Blender passes fix it.

## Needs Aleix

- (overridable) The order of work in `.claude/iterate.md`: Blender models by how often the player meets them, then the
  bosses. Say if another area should come first.
- (overridable) How you want to see progress: each pass reports with model-lab frames; say if you want something else.
- (overridable) The Toll Wisp (v7.30.0) keeps v5.5's sorcerer look (wide hat, beard, brocade robe) and adds a handbell in
  its left hand and cold blue eyes for LORE.md's bell-ringer souls. Its in-game description still says "a robe of blue
  flame round a little bell"; say if the model should go that way (a flame body) or the description should change.
