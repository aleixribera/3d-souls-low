# Backlog

The loop's cuts and finds (`.claude/iterate.md`); the order of work is `PLAN.md`.

- Kit parts no model uses since v7.28.0/v7.29.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet`, `wolfMuzzle`,
  `beastEars`, `furClumps`, and since v7.30.0 `wispHat`, `wispBeard`, `wispMantle`, `wispSleeve`, `wispRobe`, `wispTassels`
  and since v7.31.0 `scionMask`, `scionLimbs`, and since v7.32.0 `eyePatch`, `openCollar`, `featherMantle`, `waistSash`,
  `borderedSkirt`, `boot`, and since v7.33.0 `crystalCluster` (kit-identity.js, kit-premium.js, bodykit.js; the ones in
  kit-realms.js left with it in v7.54.0). Remove once stage 1 is done, with any others left unused.
- The Antlered Hunger's hide (`beastHide`, the `bark` pattern) reads as gnarled wood more than a stag's hide (v7.49.0,
  `docs/scorecard/hunger-lab.jpg`); a hide or fur texture of its own in the same texture pass. Ysolde is 3,504
  triangles, over the 3,000 enemy budget (load warning).
- `boss-only` (Node check) failed once with "boss activates after the grace period" and passed on the rerun, with and
  without the v7.34.0 change: flaky (pass 2, 2026-11-13).
- Bots lose to bosses far more since v7.13.1 by design (bisected, pass 26): companions take greedy exchanges and forward
  rolls (`git show v7.13.1:docs/bot-risk-v7.13.1.md`); with both at 0 one bot beats the Bell Warden, Margit and the Pillager Captain 6/6,
  nearly untouched. So the bot-duel numbers measure reckless companions, not a group of people; whether The Calling's
  fill-in bots should be steadier than the lobby's is the director's call. In `bot-duel` no human lives, so the bots
  are always in last-stand mode (turning it off changed little).
- The companion mechanic (`js/companions.js`) stays for Finn's return in the Pass (below); its browser test
  (`companion-browser.cjs`) and polish-browser's companion-feedback check left with the Lands and want a fixture road.
- The title cards' eyebrow labels ("PLAY WITH FRIENDS", "PLAY ALONE") and the HUD's "CONTROLS" label break Aleix's
  no-eyebrow rule (`docs/scorecard/menu-title-desktop.jpg`, pass 5).
- Level 4, the Tower, opens on a bare, dim stone hall where the wanderer reads as a dark shape; Level 6's snow is a flat
  white that washes out the ground and the controls panel (`docs/scorecard/level-the-tower.jpg`, `level-the-church.jpg`).
- Radagon (and the Kindling Tree, his copy) beat three bots 11/12 and 10/12 even after v7.50.1's fairer Gold Breaker
  (`git show v7.56.0:docs/scorecard/radagon-gold-breaker.txt`); his other big losers for bots, the Rune Slam's two hits, are 1.5 s
  apart, fair to a person. Check by hand whether a group of people can beat him before The Calling offers him.
- A client that keeps reporting itself drinking (`useItem`) within 10 m holds a boss's attention (`CONFIG.aggro`): the
  server doesn't check flask use. Harmless among friends; worth a check if the lobby ever opens wider (pass 7).
- The Calling (pass 8): with a controller, the boss pick list is walked one button at a time; up/down could move by
  rows, or skip past the list to Start. The bots that fill the party stay after the run (the leader removes them); a
  restart doesn't top the party back up if a player left. Whether The Calling should be the lobby's default adventure
  (today BOSS ONLY) is the director's call.
- `lobby-polish-browser` failed once ("preset changes preserve online play", switching graphics presets mid-fight) and
  passed on the rerun with no change to that code: flaky (pass 8, 2026-11-13).
- The Calling's blessing pick is a panel over the arena where the boss fell, a stand-in for "a bonfire between bosses"
  (`PLAN.md` stage 2, item 4): a bonfire to gather at, and a rise from Rise Again with its own animation and light
  (the body just stands up now) (pass 9).
- Blessings aren't shown anywhere during a fight (the HUD or the party list); players see them only on the pick screen
  (pass 9).
- Ysolde is still the old hand-built rig (`MODEL_DEFS.ysolde`), not a Blender figure; she now stands in six chapters
  (`docs/scorecard/act1-ysolde.jpg`, pass 11). Part of "the story's new cast in Blender" (`PLAN.md` stage 4).
- The Final Castle played online as a single level (not the Ashmere campaign) now ends on the end-of-Act-I cards and
  "Return to lobby", with no credits; the leader's Next goes on to the church (pass 11). Credits come back with the
  story's ending (track A item 3).
- The Gargoyle (v7.37.0, pass 12) stands upright on its ledges; a crouched perch pose until it springs, and shoulders
  that join the chest (they read as ball joints with the arms spread, `docs/scorecard/gargoyle-arena-close.jpg`), are its
  second step (stage 4).
- Chapter 7, the Windward Moor (v7.38.0, pass 13), rough; its second step: the Lantern Thralls following their bearer as a
  flock (an opt-in `follows` field: they patrol the same stretch today and wake on its alarm); the thralls' and bearer's
  own figures (re-coloured Hollow Soldier and Toll Wisp now); the moor's knight, warden, lancers and bowmen are Ashmere's,
  standing in for Thrale's. Ostrey's own figure and moves shipped in v7.58.0 (pass 37); left from it: the gate bridge
  itself (a level rework fit for him), the lantern-overhead poses (Lantern Bursts' tell reads weak), the mantle texture
  (blotchy up close, `docs/scorecard/ostrey-lab.jpg`), Gate Drop's turn into Shoulder the Gate (beyond 6 m, lenient),
  the lantern up to ~5 degrees off plumb (`updateHang` reads world rotations through the root's uneven scale).
- Finn joins in the Pass as the champion's former squire (`STORY.md` People; `PLAN.md` track A item 2): not built. The
  companion today is per road (`LANDS_STORY.companion`); Ashmere's road would need it from chapter 6 or 7 on.
- Old Ostrey (3,000 HP, poise 240) and the moor's 6 flasks: no one has fought him by hand yet.
- The Empty Sentinel (v7.39.0, pass 14): its upper arms are thin mail tubes under the great pauldrons, and the left
  tasset leaves a patch of the thigh's mail showing beside the front panel (`docs/scorecard/sentinel-lab.jpg`); the kit's
  halberd spends 180 of its ~350 triangles on six grip rings. Second step, stage 4.
- Chapter 8, Saltgrave (v7.40.0, pass 15). Hale and Harrow got their own Blender figures and 15 moves (v7.60.0,
  pass 39; `docs/scorecard/castellans-attacks.jpg`). Left: the Salt Knights' own figures (re-coloured Undead Knight);
  the hall's kneeling statues read dark, swords up rather than point-down (`docs/scorecard/salt-statues.jpg`); rain
  inside the roofed gatehouse (`salt-gatehouse.jpg`); after the whole-castellan reveal, Harrow's glint still rises from
  her fist rather than the axe head; in multiplayer a client puts the whole suit on the survivor before her kneel (a
  phase's `opener` never reaches clients; `conceal` has the same gap); the roof's broken merlons are plain stone
  posts. No one has fought the pair by hand yet (1,700 HP each).
- The Pillager Captain (v7.41.0, pass 16): the helm's face reads as a plain bucket from the front (a visor ridge or
  breaths would break it up); the `dentedSteel` plate shows horizontal streaks; the halberd's glowing edge is the kit's
  flat yellow card (`embers.edge`), not a lit blade (`docs/scorecard/captain-lab.jpg`). Its second step, stage 4.
- The Bell Warden (v7.43.0, pass 18): the bell maul is the kit's (10-sided, 355 triangles) and rests at 0.65 rad
  (`weapon.rest`) so the bell stands on its lip, its lower rim a little into the floor; the eyes' halo blooms white over
  the helm's window on the tower top; the mail sleeves show the `knightMail` grid (`docs/scorecard/bellwarden-lab.jpg`,
  `bellwarden-tower.jpg`). `weapon.rest` and `weapon.size` are checked when a rig is built (`checkModel`), not at load.
  Second step, stage 4.
- The Ringer, pass 2 (pass 42 did pass 1, v7.64.0: Blender figure, 12 own moves, the `tether` circle, knells drawn by
  `js/ring-waves.js`; `docs/scorecard/ringer-*`): her torso reads boxy and her fists like mittens in the lab; the
  clapper is 2.7 m, so any new floor blow needs its `pitch` checked against the floor (the weapon bone's world position
  and direction); non-ring blows (the Hour Struck, Over the Line's first) land a little after their hit, as their
  active is short and the swing long. No one has fought her by hand yet. The Keyless barely read in the cells
  (`gaol-keyless.jpg`).
- The Regent Hollis, pass 2 (pass 44 did pass 1: Blender figure, 13 own moves, the `echo` hit field, gilt drawn by
  `js/gilt-echo.js`; `docs/scorecard/hollis-lab.jpg`, `aurel-hollis.jpg`). Bots don't know echoes (pass 45's area):
  `js/bot.js` 357 plans a parry on an echo hit (`parryTiming` refuses it), and its reach/escape/aimedElsewhere geometry
  measures from him, not from the cut (`e.cutOf(h.echo.of)`), so a bot at the cut after Called Home's leap is hit. The
  server's parry check (`server/simulation.js` ~540) doesn't reject a claim during an echo (honest clients never send
  one). Block and knockback for an echo come from him, not the cut. Figure: the mantle reads as a slab from the side,
  limbs thin, collar tall. The gold gilt is pale on the bright court in `high`; the embers read well. No one has fought
  him by hand yet.
- The evergaol's own lore (`js/data/lore-lands.js` 82-83) has three shackles and a corpse inside cell pillars; fixed in
  the Night Gaol's copy, left in the old road (no more work on it, `PLAN.md`).
- Chapter 10, Aurel, the Gilded City (v7.44.0, pass 19): the Gilded Thralls' own figures (stand-in: the Rogue in gold
  leaf with two curved knives, `gilded-thrall-lab.jpg`). The city has no smiles yet beyond the words: the thralls' gilt
  masks are the Rogue's. (The Regent is his own since pass 44.)
- Oswin, pass 2 (pass 47 did pass 1: Blender figure, 17 own moves, the `seam` and `erupt` hit fields, seams drawn by
  `js/ember-seams.js`; `docs/scorecard/oswin-lab.jpg`, `aurel-in-ash-oswin.jpg`). Bots don't know seams (Track B's
  area): `js/bot.js` neither steps off a seam before Long Live the King / the First Hunger nor reads an eruption's
  walls (`e.hitbox.lines`) as reach, and still plans a parry on a gilt echo; `canParryHit` (js/helpers.js) is the
  per-hit rule to use. A seam runs its full length even through the court's wall (the walls hide it; nothing clamps
  it to the room). No one has fought him by hand yet; his health and posture are pass 45's, kept until every boss is
  reworked. Agathe (chapter 12) should not reuse seams: her floor-rending wants its own idea.
- Chapter 11, Aurel in Ash (v7.46.0, pass 21), rough; its second step: the Cinderfolk's own figure (stand-in: the
  Hollow Soldier charred). The level is the burned capital's layout as it was; the ash gate and the plaza could show the gold of
  chapter 10 burned (charred gilt, a dry fountain) so the two chapters read as one city.
- Chapter 12, the Torn Abbey (v7.48.0, pass 23), rough; its second step: Agathe's and the Rending Brothers' own figures
  (stand-ins: the Toll Wisp beardless in black with a glaive, its tall hat reading more ringer than abbess; the Rogue in
  an undyed cowl). Agathe is Maliketh's moves renamed, 4,000 HP (was 4,600); the robe shed and Black Blade reveal are
  gone, so nothing changes on her body at half health but the storm's light. No one has fought her by hand. The
  Brothers fight with the Beastman's moves, kept as `BEASTMAN_MOVES` in `js/data/move-sources.js` (v7.54.0).
- Chapter 13, the Root of the Ember (v7.50.0, pass 25), rough; its second step: the Kindling Tree's and the Rootbound's
  own figures (stand-ins: the Antlered Hunger, chapter 6's boss, stood upright in red-gold wood, so two chapters share one
  body; the Hollow Soldier in bark, still holding the ruined sword in bark). The tree is Radagon's moves renamed, 4,200 HP
  (was 5,200); its marks and risings burn red-gold (`holyLight`), but the mark's shape is still the old road's crossing
  arcs and the thrown thorns are still gold spears: both want an ember shape (a root knot, a thorn). No one has fought it
  by hand. The Rootbound fight with the Golden Zealot's moves, kept as `ZEALOT_MOVES` in `js/data/move-sources.js`
  (v7.54.0).
- Chapter 14, the Still Mere (v7.51.0, pass 27), rough; its second step: the King's Blade's own figure (stand-in: the
  player's wanderer in ash, so the shield it guards with is still slung on its back; it wants the round shield on the
  arm, and the champion's look of `STORY.md`), a roll or sidestep (no enemy rolls yet: an opt-in evade would make "it
  fights as you fight" whole), and the Drowned's own figure (the Hollow Soldier, waterlogged). Its moves are read from
  `PLAYER_DEF` at load: a change to the player's sword changes the boss's. The ice is a plain floor: a lake surface
  (cracks, the dark water under it) would sell the place. No one has fought it by hand.
- The story's ending (pass 30), rough; its second step: the King's Blade dies Aldric's death (kneels, blazes white,
  breaks into ash, a sword of boxes left standing: `js/finale.js` `updateEnding`), not the one in `STORY.md` (it kneels
  in the shallows, the scarf floats, the player holds the Ember under and the ice closes): an opt-in per-level death
  scene, and a Blender sword for the one left standing (`docs/scorecard/ending-desktop-kneel.jpg`). The fourth card and
  `STORY.md`'s credits name Finn, who doesn't walk the Ashmere road yet (companions are per road, a road's `companion`);
  once he does, the credits list him on their own (`R.companion`). STORY COMPLETE's subtitle is the road's old
  `menuSub`, THE GAOLER KING (`docs/scorecard/ending-desktop-complete.jpg`).
- Opt-in mechanics no content uses since the Lands left (v7.54.0): `lifesteal` (Malenia), hazard floors (`hazards`,
  the rot) and flame `breath` (Godrick). Their tests now lay their own fixture (a patched def, a rot rect in the Long
  Hall). Give one to a new boss or remove each with its test. The seven move-source files in `js/data/bosses/`
  (Margit to Radagon, no figure, in no list) go once their story bosses have moves of their own (track A).
- Low on dense phones (v7.56.0): touch devices go straight to Low without a frame test (`capFor`, `js/autoquality.js`),
  and Low now draws native, so a 3x phone draws nine times its old pixels. Untested on a phone; if too slow, the next
  lever is a cheaper Low material (Lambert-style lighting), never a lower resolution.
- Faster High on weak GPUs at 2x: the flame glows and light pools (`glows`) were the other consistent cost in the 4K
  per-pass probe (`git show v7.56.0:docs/render-scale-v7.56.0.md`); cheaper pools (fewer, tighter quads) would cut it.
- Boss Rush pace (pass 45): a client never learns its boss's pace (`session.pace` is sent but unused), so a person's
  parry lead (`parryTiming`, `js/combat.js`) is measured on the wind-up's own clock and shrinks with `tellRate()`, to
  0.072 s at the floor (fight 40). Set `Enemy.pace` on the client from the session, or count the lead in real time.
  Bot falls are short of the plan's target (`docs/scorecard/boss-rush-pace.txt`): pass 2 of item 2.
