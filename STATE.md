# State

The iterate loop's working note (`.claude/iterate.md`). Cap: 8,000 characters.

## Now

Next: `PLAN.md` stage 1, item 4, `SCORECARD.md`, pass 1 of it: one row per `VISION.md` area, one per Ashmere level
and one per boss (with 1 and with 3 players), each 1-5 with one sentence and a path of evidence. Check: every row has
evidence a reader can open. First check the queued runs below; a red one comes first.

Items 1 to 3 are done. Pass 4 shipped item 3: the Toll Wisp's Arena description is now "A bell-ringer's soul in its
old robe, bound to a handbell", seen in Arena > Enemies at desktop and phone width
(`.scratch/menu/wisp-desc-desktop.png`, `-phone.png`; `.scratch/menu-shot.cjs <menu> <item> <stem>` takes them).
No release for a text fix: the next release's changelog line mentions it.

## Works

- Baked figures: wanderer, Hollow Soldier, Ashen Lancer, Rogue, Undead Knight, Pale Duelist, Shield Warden, Rampart
  Bowman (v7.28.0), Beastman of Farum Azula (v7.29.0, 2,800 body tris, 2,926 with the scimitar), Toll Wisp (v7.30.0,
  2,881 tris, a handbell in the left hand; the first figure with no kit part, so baked meshes now share corners), Grafted
  Scion (v7.31.0, 2,774 body tris, 2,900 with the scimitar), Executioner (v7.32.0, 2,687 body tris, 2,991 with the
  greataxe; its skirt is four panels on new cloth bones loinF/B/L/R), Crucible Squire (v7.33.0, 2,190 body tris, 2,992
  with the kit oval shield and greatsword), Shover (v7.34.0, 2,428 body tris, 2,988 with the kit pavise of 560; a
  kettle hat over a bevor, a barrel cuirass bound in iron hoops). `js/baked/*.js`; checked by the in-page `model`
  filter (5 tests), `Shover` (1), `Bowman` (4), `Lands` (15), `Wisp` (1), `Scion`, `Ultra performance` and validation
  at load.
- Figure lessons: a long thin limb built with `soft()` decimates to slivers whose normals tip toward its capped end and
  renders grey-white; build long shins/forearms as exact open lofts (`hard`). `hard(outward=fn)` takes a per-face
  reference point for bands round a limb. Two slots with the same texture (`tabard`/`stripe` are both `rottenCloth`)
  can't be told apart however the tints differ: give a band its own texture's slot (v7.34.0 used `trim`).
- CI: Node checks and four browser shards on every push.
- Capture scripts (untracked, `.scratch/`): `lab-many.cjs <ids> [anim] [t]` (model lab, 1600x640), `lab-zoom.cjs`
  (same with `DSF=2 CLIP=x,y,w,h`, CSS pixels of the 1600 view), `enemy-play.cjs <q> <dist> <levelId> <enemyId[#n]>`
  (a frame in a level; `HIDEP=1` hides the player; `YAWOFF=0.15` puts the camera nearly in front of the enemy's
  facing, default 0.55; it sets the player to a raised enemy's y, but it can still fall off a ledge, so pick a spot
  with floor in front: the Tower's west-stair Shover works), `lab-probe.cjs <id>` (hides each mesh in turn; `TRY=`,
  `TEX=1`, `NOSHADOW=1` modes), `normals-probe.cjs`.

## Broken

Nothing known. `boss-only` (Node) is flaky: see `BACKLOG.md`.

## Queued runs

- CI on main for pass 4's push (the Toll Wisp's description). v7.34.0's CI and container runs passed, and `:latest`
  reads anonymously (pass 3).

## wip/ branches

None. `wip/2026-10-27-hollow-enemy` was cut in pass 1 and kept as the tag `archive/2026-10-27-hollow-enemy`.

## Backlog

In `BACKLOG.md`.

## Needs Aleix

The earlier three (order of work, how to see progress, the Toll Wisp's description) are answered in `PLAN.md`.

- (overridable) The co-op boss rush's working name, The Calling (`PLAN.md` stage 2).
