# Story audit

Pass 163 (2026-11-21), after Aleix: "all story levels need redoing, or almost all of them, there are broken parts".
Every Story chapter was played through in the real page by a scripted walk, its frames looked at by eye. What is
broken comes first, ranked by how badly it stops a player; then each chapter's "redo" note, what makes it rough beyond
bugs, for Later item 3 (the levels redone in cel style).

## How it was played

`node tools/browser-lock.cjs run <pass> -- node tools/story-audit.cjs [levelId ...] [--no-frames] [--json out.json]`
(in-page half: `tools/story-audit-page.js`). Per chapter, in headless Edge on the dev page, from `story.jumpTo`:

- Spawn: every enemy, 30 steps in, is alive, on a floor, not inside a wall, not floating, and stands on its zone's
  floor (a zone counts the player only on its first member's floor).
- Path: the bot's A* route (`BotNavigation.route`) to every target in turn (each fight's trigger, flask, gift,
  shortcut lever, bonfire), driven by stick input. Under 0.4 m moved in 2 s is "stuck" (frame taken, then it
  teleports on). A trap the road drops through is walked onto and has to spring.
- Fights: 8 s of live fighting per zone (enemies falling off, ending in walls, standing still awake), then every
  member is walked to and killed (boss phases, mid-bar phases and retreats played out). A gate still shut after its
  fight is a finding.
- Pickups: each flask is found, the chapter's ability is given.
- Bonfires: rest, the save is written, Continue puts you back at the bonfire, standing, with won gates still open;
  then a death respawns you there.
- Exit: the chapter is complete and the next one starts (the ending, on the Final Castle and the Still Mere).
- Console errors and page errors fail the chapter.

The player is kept alive (blows never land, pits still kill). Frames: one at spawn, one every 30 m of road, one at
every gift and won boss; the run prints findings with a position, the repro. Static placements (what the walk can't
see as a failure: a member on another floor than its zone's, an enemy on a trap floor, a floor under every pickup)
are `tests/story-placements.cjs`, in the fast Node checks.

## Broken, fixed this pass

1. **Softlock, the Torn Abbey undercroft.** The Undead Knight of `zone-undercroft` stood on the crumbling colonnade,
   8 m over the undercroft it guards, so the zone counted the player only up there. Repro: walk off the colonnade's
   open side before its floor falls; the undercroft's gate shuts behind you with the knight out of reach and no way
   back up. The walk reported "no route to zone zone-undercroft" and the knight on the trap's floor. Now the knight
   stands in the undercroft (`js/levels/torn-abbey.js`); `tests/story-placements.cjs` failed before, passes after.
2. **Gate lintels hanging in the air**, 14 gates in 5 chapters. A gate taller than its gate height got a stone lintel
   over it even where no wall stands beside it, so a block floated over the opening, and stayed there after the gate
   lifted. The Tower (courtyard, rampart, walkway, bell), the Night Gaol (cells 1 to 4, the ringer's fog), the Torn
   Abbey (steps), the Root of the Ember (ember, sap, grafting), the Still Mere (fork). Now a gate gets its lintel only
   with a wall on both sides (`gateWalled`, `js/terrain.js`; `js/scene.js`), and an open gate lifts out of sight;
   `tests/story-placements.cjs` checks five open and four walled gates.

## Broken, left

Nothing that stops a player: the walk finds no other blocked path, dead trigger, stuck or fallen enemy, failed save
or broken exit. Left, by how much it shows:

1. **Lifted portcullises poke over low walls** (cosmetic): a gate taller than the wall beside it shows 0.2 to 0.3 m
   of bars over the wall once lifted (the Sunken Keep; the Tower's undercroft, hall and postern; the Still Mere;
   Saltgrave). The cel redo (Later item 3) rebuilds these walls; fix there.
2. **The bot's routes are not a player's** (tooling): the walk is `BotNavigation`, so it doesn't prove a jump or a
   drop a person would take is readable, only that one exists. The redo notes below carry what reads badly.

What the walk taught (kept in `tools/story-audit-page.js`): a bonfire refuses rest with an awake enemy near, so beat
them first; a chapter's last fight ends it (the Final Castle's throws you into the ending), so it goes last; Aldric's
Bell Warden retreats and the King's Blade has a mid-bar phase, so a scripted kill must play phases out
(`Enemy.outlast`), or the ending never starts.

## Per chapter

The full run (pass 163, after the fixes): every chapter starts, walks through, saves and reloads, respawns, and hands
over to the next. Walk is game time.

| Chapter | Walk | Findings | Exit |
|---|---|---|---|
| The Long Hall | 50 s | none | the Sunken Keep |
| The Sunken Keep | 47 s | none | the Burning Town |
| The Burning Town | 82 s | none | the Tower |
| The Tower | 119 s | none | the Final Castle |
| The Final Castle | 326 s | none | the ending, then the Church |
| The Church in the Pass | 33 s | none | the Windward Moor |
| The Windward Moor | 72 s | none | Saltgrave |
| Saltgrave | 70 s | none | the Night Gaol |
| The Night Gaol | 56 s | none | Aurel |
| Aurel | 57 s | none | Aurel in Ash |
| Aurel in Ash | 83 s | none | the Torn Abbey |
| The Torn Abbey | 69 s | none (was: the undercroft softlock) | the Root of the Ember |
| The Root of the Ember | 85 s | none | the Still Mere |
| The Still Mere | 78 s | none | the ending |

No console or page errors in any chapter. No enemy starts inside a wall, floating or fallen; no fighter fell out of
the level, ended in a wall or stood stuck in the first 8 s of its fight.

Frames: `docs/story/audit/` (a contact sheet per chapter of the run's frames; the full set is rebuilt by the run in
`.scratch/story-audit/`).

## Redo notes

What makes each chapter rough beyond bugs, from the frames, for Later item 3 (the levels redone in cel). Nothing here
was restyled this pass.

- **Everywhere.** Each chapter is lit in one hue (the Burning Town and Aurel orange, the Torn Abbey red, the Night Gaol
  blue), so rooms, floors and walls run together and the road is hard to read at a glance. A boss's death burst
  whites out the whole view. Toasts stack ("The barricade falls" three times over), and the onboarding's ability
  prompt ("1 Scarlet Draw") hangs beside the player in most frames, long after it was learned. Lifted portcullises
  poke 0.2 to 0.3 m over the low walls beside them (a gate taller than its wall; the Sunken Keep, the Tower's
  undercroft, hall and postern, the Still Mere, Saltgrave).
- **The Long Hall:** reads well: cells, a torch-lit corridor, a gate per fight. Short (50 s), fine as an opening.
- **The Sunken Keep:** a clear route through doors; long corridors of one stone, little to tell rooms apart.
- **The Burning Town:** the half-timbered alleys are its best look, but the same house repeats down every street;
  barricades are the only landmarks.
- **The Tower:** the longest climb (119 s); a mix of red courts and blue ramparts that reads as two places. Its passage
  floor falls on purpose with nothing but a crack to warn of it.
- **The Final Castle:** every fight and the ending work; the field before the gate is wide and empty.
- **The Church in the Pass:** one chamber, a breath between acts; nothing to fix.
- **The Windward Moor:** reads well in the open; the fog gate is a flat white translucent slab.
- **Saltgrave:** sound; the yard is bare but for banner strips on its walls.
- **The Night Gaol:** its cell gates hung blocks in the air (fixed); its fog gates are tall white slabs that read as
  walls of light, not fog.
- **Aurel:** blown out: the gold city is near-white haze, its shapes lost; the hardest chapter to read.
- **Aurel in Ash:** dark and readable, ember-strewn streets; its lane floor falls on purpose.
- **The Torn Abbey:** the undercroft softlock (fixed). Everything is washed red; the colonnade over the undercroft is
  a good idea, but nothing shows that its floor will fall or where it leads, and the undercroft itself is blown out
  white.
- **The Root of the Ember:** its courts stand open at their ends (their floating lintels fixed); all one hue.
- **The Still Mere:** the ending plays through the King's Blade's mid-bar phase; open water with few edges to read.


## The redo (Later item 3)

### Pass 167: Aurel, the Torn Abbey, the Root of the Ember

Fixed everywhere first, from the notes above:

- A boss's death burst no longer whites out the view: fewer and smaller white motes, a smaller flash and flare, half
  the screen pulse (`js/ultra-fx.js`).
- Toasts no longer stack: the same text still on screen is shown afresh, once (`js/hud.js`).
- A lifted portcullis that would poke over the wall beside it now lifts out of sight like an open gate
  (`gateLiftsAway`, `js/terrain.js`; checked in `tests/story-placements.cjs`). That covers the Sunken Keep, the Tower,
  the Final Castle, Saltgrave, the Night Gaol, Aurel in Ash and the Root of the Ember.
- The red in the Torn Abbey's audit frames was the low-health vignette of the kept-alive walk on Low, not the level:
  on Normal it is blue-grey storm (`torn-abbey-before.jpg`).

The approach, proven on Aurel, then carried to the Torn Abbey and the Root of the Ember:

1. **The hue goes where it means something.** The cel style's post (exposure 1.4, saturation 1.4) burns a chapter
   lit in one warm hue to a single-colour haze. Each chapter's base light is now cool or neutral, with exposure under
   1 and saturation near 0.7. Its colour comes from one source: Aurel's sun and gilt, the root's fire below
   (hemi ground), the abbey's braziers.
2. **Each place its own light**: `atmosphere.areas` (`js/visuals.js`, validated), a list of rooms and the look there,
   eased in as the player walks in. Aurel has a warm avenue, a white-noon court, a low-sun terrace, a red glow at the
   root and a dusk throne. The abbey has a warm undercroft, the open storm on the bridge, and the rent's cold violet.
   The root has an amber hollow, a sap-green grafting and a white-gold heartwood.
3. **Floors a clear value step below their walls**, so the road reads at a glance in the cel bands.
4. **Real set pieces for stand-ins**: the town fountain is a Blender model (`tools/blender/fountain.py`, gilt in
   Aurel, bronze in the Burning Town).
5. **The Story recolours from pass 162**: the Gilded Thrall is in wine-red and oxblood with gold leaf and a steel
   blade.

Frames: `docs/story/audit/<chapter>-before.jpg` and `-after.jpg`, one shot per room from its near side
(`node tools/browser-lock.cjs run <pass> -- node tools/story-frames.cjs <tag> <levelId ...>`; the before shots come
from a clean checkout of the previous release). Walk-through: `docs/scorecard/now/story-redo.mp4`.

### Pass 169: the Night Gaol, the fog gates, Aurel in Ash, the Burning Town

- **The Night Gaol**: the night is a cold blue-violet over the bridges (moon up, saturation 0.62), and each cell and
  isle is warm under its own lamps (`lamps` on every cell, `areas` with an amber ambient). The great ring sits between,
  violet and amber. Bridge floors raised a step so the way across reads.
- **Fog gates** (`js/fog-gate.js`, tuned in `CONFIG.finale.fogGate`): three layers of drifting, domain-warped noise
  spread through the doorway, thinning at the sides and top and thickest at the floor; seen edge-on a layer fades out,
  so the gate never reads as a slab. Its colour leans toward the chapter's moon, or `fogColor` on the gate (validated).
  It eases away when the gate opens. Every chapter with fog gets it.
- **Aurel in Ash**: the night over the ash is a cool smoke-grey and the fire is in its sources (houses, lamps, embers
  on the ground). The cellar is warm under four lamps on a neutral base (it was near black); the plaza is in the red
  glow of the city burning; the throne court is a cold violet ash. Floors darker than the pale ash walls.
- **The Burning Town**: house variety (`townLook` on the level, `js/town.js`, validated). Each house draws its plaster
  (limewash, ochre, rose, sage, oxblood), roof (red tile, slate, brown) and timber from palettes, its framing from three
  patterns (corner posts, crossed braces, a mid rail), and some carry a bay window on carved brackets or gabled dormers:
  Blender pieces, `tools/blender/town_bits.py` (196 triangles). 24 bays and 51 dormers in the chapter. A level
  without `townLook` keeps its old houses. Close-ups: `docs/story/audit/burning-town-houses.jpg`.
- **Story recolours**: the Keyless (Night Gaol) in bone, indigo and rust; the Cinderfolk (Aurel in Ash) in ash, char
  and ember-brown.

Walk-through: `docs/scorecard/now/story-redo-2.mp4`, made by `node tools/story-clip.cjs <out.mp4> <tag> <levelId ...>`
from the `tools/story-frames.cjs` frames.

### Pass 172: the Sunken Keep, the Tower, Saltgrave, the Final Castle, and the rest

- **The Sunken Keep**: each wing its own light under a neutral base (exposure 0.9, saturation about 0.6 per wing):
  the vestibule warm, the cistern teal-grey, the chapel violet-grey, the shrine gold, the moss hall green-grey, the
  throne a dark red-brown. Walls paler and floors a clear step down; room lights eased toward neutral, so a wing is
  tinted, not flooded.
- **The Tower**: six areas (the gatehouse warm, the undercroft teal, the courtyard and ramparts in the last sun, the
  hall in firelight, the walkways a wind-blue, the bell gold). The ramparts' sandstone toned down from near white.
- **Saltgrave**: the storm a darker slate; the gatehouse and stair rooms warm, the ward grey-green, the hall of
  statues pale violet, the roof the open storm. Weapon racks, crates and a cart in the yards.
- **The Final Castle**: eight areas, from the outer ward's moonlit grey to the throne room's dark red-brown round the
  gold throne. The field has the Gaoler King's gibbets either side of the road, and racks stand in the courts.
- **Set pieces** (`gibbet`, `rack` in `js/data/props.js`, drawn in `js/town.js`): Blender,
  `tools/blender/castle_bits.py` (660 triangles, 5 pieces). `tests/story-placements.cjs` keeps every prop clear of
  spawns, bonfires, flasks, lamps and gate doorways, and checks the mesh. Close-ups:
  `docs/story/audit/final-castle-props.jpg`, `docs/story/audit/saltgrave-props.jpg`
  (`node tools/story-frames.cjs <tag> <level> --at x,z,yaw`).
- **The Root of the Ember**, a second look: the root walks are `emberbark` and the hollows `bark`, so the hollows'
  floors read as floors; `emberbark` itself is a step lighter.
- **Light touches**: the Still Mere's white gate and long stair had floors as pale as their walls; a step darker,
  exposure 0.92. The Long Hall, the Church and the Windward Moor read well and are unchanged (`tools/story-frames.cjs`
  now shoots a hall level too).
- **Story recolours**: the Moor's lantern thralls in bone and moss, their bearers in rust and brocade; the Still
  Mere's Drowned in moss-green and leather; Saltgrave's Salt Knights in pale plate and verdigris.

Walk-through: `docs/scorecard/now/story-redo-3.mp4`.

### Left

The redo is done for all 14 chapters (`node tools/story-audit.cjs`: 0 findings). Optional: `townLook` for Aurel and
Aurel in Ash, whose houses share the Burning Town's builder.
