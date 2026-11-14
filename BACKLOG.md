# Backlog

The loop's cuts and finds (`.claude/iterate.md`); the order of work is `PLAN.md`.

- Crates, after item 7's pass 1 (pass 71): no emotes yet (the plan names them; needs an emote system); no common
  crate ability; once everything is owned a crate gives a duplicate ("already yours") and nothing more; xp only from
  Boss Rush (not Story or Practice); the Collection draws blade looks as flat icons, not on the 3D sword; Bloodsteel
  reads as flat red at fighting distance.

- The Giant Skeleton, after its pass 1 (pass 72; judge 63, 67, 69 vs Hollis 80). Left:
  - **The gaol on its figure** (the judge's gap, character 5 vs 9): the irons read as thin bracelets. A heavy manacle
    on the claw with a broken chain (~1.2 m) that swings on The Taking and The Long Claw and wraps the held player;
    an iron collar and chain at the neck for the silhouette from behind. The figure is at 13,188 of 14,000 triangles:
    take them from the ribs or skull. The name is the most generic part (the judge offered "The Gaol Giant"; Aleix's call).
  - **Effects** (5 vs 9): the grip's burn shows only for the local player (no bodies list for other players);
    the throw lands only about 2 m away.
  - **Moves:** the Bonewheel turns the torso on the spine rather than the whole body; check the claw and foot glows'
    positions in play, not only in the lab.
  - **Balance:** bots find it easy (3 bots 6/6 in 31 s, 31 damage; one bot 4/4 in 64 s), which may suit Ashmere's
    first boss.
  - `js/data/bosses/godfrey.js` is no longer borrowed from: it can go, together with the tests that name it.

- The Pillager Captain, after his pass 2 (pass 66; judge vs Hollis 4-6 vs 5-7). Pass 66 gave the strikes their own
  ends (`docs/scorecard/captain-ends.jpg`), a bigger hook and spike, bots that step out of fires, and a check that a
  parry glint sits only on a parryable hit. Left:
  - **Ends:** the hook's and the firebrand's second hits still end in the thrust's kneeling lunge, and each combo's
    last hit holds its strike frame with no follow-through.
  - **The figure:** the hook and spike still merge into one pale crescent at fighting distance; pauldrons and limbs
    read as stacked rings, the cape is a flat board from the side with a smeared rust texture, and he sinks into the
    dark square (`captain-town.jpg`). The lab shows a black wing-shaped mesh at the firebrand's wind-up end.
  - **Fires:** Kindling's ring can land fires inside the square's walls.
  - **Ideas:** a thrown firepot for a mid-range answer; burning dressing round his square that grows as the fight goes.

- Two presets, what pass 2 (pass 60, baked light) left: the PC stand-in within 15% of the laptop per scene
  (`tools/bench/pc-bench.cjs`, not calibrated). Baked light's gaps: fire flicker and a bonfire's flare no longer
  move the light on walls (a per-light gain could); a 1 m grid softens the hot spot right next to a flame; Normal's
  moon god rays and character shadows went with its shadow map (the rays could march the volume's moon channel; the
  characters keep their blob shadows); a thin wall can pass a little moon to the room behind (solid cells average
  both sides). Ultra could keep its nearest real lights on top of the volume for crisper fire.

- The King's Blade (pass 55, v7.79.0), judge's leftovers: the Turn still reads like Hollis's Turning Cloak (a
  spin with the cape); the Shield Wall's second cut can't be parried because `noParry` is per attack (a per-hit
  `noParry`, there since pass 63, lets the bash be roll-only and the cut parryable); the Shield Burns' wide fling wasn't re-judged.
  Its figure is 16,138 triangles against the 14,000 budget (Hollis 14,208); no test holds the budget.

- The title's missing parts (pass 49, v7.70.0, `docs/scorecard/title-desktop.jpg`): the castle behind the right half
  (a real Blender model with baked light, inside Normal's 60 fps; the right half is empty until then) and Collection
  in the mode list (nothing to collect yet). Controls is in the footer since pass 58.
  The `story` screen is no longer reached from the title (Story starts the road last played; New game asks first); a
  second road would need its own way in.
- The menus' missing parts (pass 51, `docs/scorecard/menus-*.jpg`): the
  end of run has no Crowned count, no "Your best run" (no record kept yet) and no rewards column (no crates yet), so
  the per-boss times take the right side. Pass 58 added Controls and the pad-alone walk (in-page `Menus:`,
  `rush-alone-browser`; the lobby's own pad test is `lobby-controller-browser`). The run intro (`#runIntroScreen`,
  js/multiplayer.js) still has its own look: a glowing crest, a blurred title scaling in and drifting embers, against
  item 3's "no dopamine on menus" and one type system; and the lobby's controls list is its own copy of
  `controlRows`. Only `solo-browser` runs on CI: the multi-page `*-browser.cjs` tests run by hand.
- Abilities, item 6 cut at pass 62 (two passes, then cut). The cut: the Stone Guardian and the Lancer of Ash wear
  enemy figures (the Shield Warden's and the Ashen Lancer's Blender models, recoloured by `js/summon-figures.js`,
  `VISUALS.abilityFx.<kind>.figure/move`), and "a party of four" is three local bodies beside the player
  (`.scratch/summon-frames.cjs`, `docs/scorecard/abilities-summons.jpg`). The real version: each its own Blender
  model (a guardian of carved stone, a lancer of ash and cinder) like the Grave Hound, and all four summons seen in a
  real online party of four browsers. A drawn boss waits for the end of its attack string to turn (the draw only
  starts between attacks): if that feels late, let the draw begin at its next recovery. `KIT=strong` is still the
  pass 56 list; a kit with the twin, hound and Gale reached median 6 vs 4 (12 runs, pass 61); re-run it with the
  guardian and lancer in the pool.
- The blessing pick in tall cards (rarity, drawn icons, level I → II, pad keys, phone 2×2) is built and tested on
  `wip/blessing-tall-cards` (pass 49), parked when the pick moved to the upgrades-from-zero session (PLAN.md item 6).

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
- Radagon beat three bots 11/12 and 10/12 even after v7.50.1's fairer Gold Breaker
  (`git show v7.56.0:docs/scorecard/radagon-gold-breaker.txt`); his other big losers for bots, the Rune Slam's two hits, are 1.5 s
  apart, fair to a person. Check by hand whether a group of people can beat him before The Calling offers him.
- A client that keeps reporting itself drinking (`useItem`) within 10 m holds a boss's attention (`CONFIG.aggro`): the
  server doesn't check flask use. Harmless among friends; worth a check if the lobby ever opens wider (pass 7).
- The Calling (pass 8): with a controller, the boss pick list is walked one button at a time; up/down could move by
  rows, or skip past the list to Start. (Bots no longer fill a party: pass 52.) Whether The Calling should be the lobby's default adventure
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
- The Bell Warden, pass 1 done (pass 68: own Blender figure and bell maul, resonance, the Answering Toll, the
  Waking; `docs/scorecard/warden-moves.jpg`, `bellwarden-lab.jpg`, `bellwarden-tower.jpg`; blind judge 76 vs Hollis
  58). Leftovers for pass 2: the Bell of Waking itself on the tower top (a real prop he guards and the player rings);
  his effects are glow sprites and rings, no bronze dust or sound-wave shimmer; his bronze reads muddy against the
  night sky (a rim light or brighter trim); the broken pose holds the maul upright in the air (not leaning on it);
  the slams' bell sits ~0.2 m into the floor at the deepest frame. The same judge found Hollis's chained hits hold one
  pose through wind-up, strike and follow in the model-lab strips (Courtesy 2-4, Largesse, Ravenous 5) and The
  Feast's blades below the floor: check whether that is the strip sampler or his poses.
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
- Agathe, pass 2 (pass 48 did pass 1: Blender figure, 13 own moves, `rend` and hit `bolt`, drawn by
  `js/storm-rend.js`; `docs/scorecard/agathe-lab.jpg`, `abbey-agathe.jpg`). Bots don't know bolts (Track B's area):
  `js/bot.js` doesn't step off a locked mark (`e.bolt`, `locked`) and doesn't press her to tear pieces back
  (`body.rent`/`rentBy`). The server's parry claim checks `canParryAttack`, not `canParryHit` for the claimed hit: a
  future bolt inside a parryable attack could be parried by a modified client. Pass 53 (v7.77.0) did the grip, the
  haft's angle, the face, habit and mantle. Left: the face still lumpy close up (voxel remesh at 1,500 tris); the
  veil reads as a ball from behind; the mantle goes plank-like in lunges (the judge); the right fist only lines up
  with the haft, it doesn't slide along it (`Rig.holdHaft`); no frame from inside the abbey yet (`agathe-duel.jpg`
  is the arena). The HUD shows torn pieces in Destined Death's gold, not her red. The rent is not carried in a multiplayer resume. No one has fought her by hand yet.
- Chapter 11, Aurel in Ash (v7.46.0, pass 21), rough; its second step: the Cinderfolk's own figure (stand-in: the
  Hollow Soldier charred). The level is the burned capital's layout as it was; the ash gate and the plaza could show the gold of
  chapter 10 burned (charred gilt, a dry fountain) so the two chapters read as one city.
- Chapter 12, the Torn Abbey (v7.48.0, pass 23), rough; its second step: Agathe's and the Rending Brothers' own figures
  (stand-ins: the Toll Wisp beardless in black with a glaive, its tall hat reading more ringer than abbess; the Rogue in
  an undyed cowl). Agathe is Maliketh's moves renamed, 4,000 HP (was 4,600); the robe shed and Black Blade reveal are
  gone, so nothing changes on her body at half health but the storm's light. No one has fought her by hand. The
  Brothers fight with the Beastman's moves, kept as `BEASTMAN_MOVES` in `js/data/move-sources.js` (v7.54.0).
- The Kindling Tree, pass 2 (pass 50 did pass 1, v7.73.0: Blender figure, rooted then uprooted at 60%, hit `burrow`
  drawn by `js/root-heave.js`, hit `still`, `rooted`; `docs/scorecard/tree-moves.jpg`, `tree-heave.jpg`). The blind
  judge put it at 50 to Hollis's 48 and named the model's surface next: the bark is stretched into vertical streaks on
  the trunk (UVs) and a hard ring shows where the trunk meets the root skirt when it bends. The figure is 20.7k
  triangles, over the 14k boss budget. Bots treat a burrow like a blink (out of reach) and don't step off the rise's
  ring on purpose. The strike's trail on the Lash shows at the end of its first swing, high by the crown. The
  Rootbound still fight with the Golden Zealot's moves (`ZEALOT_MOVES`, `js/data/move-sources.js`) in the Hollow
  Soldier in bark. No one has fought the tree by hand; health and posture are kept until every boss is reworked.
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
- Boss Rush bot falls, cut after item 2's two passes (pass 46, `docs/scorecard/boss-rush-pace.txt`): a fall in 18% of
  first fights (target one in three) and 40% at fight 10 (target most). Reaction, slip and flask knobs in `CONFIG.bot`
  are spent (more of them stays within noise); next levers: the moods' slip rate (`BOT_MOODS`, `js/data/bots.js`),
  bots misreading a string's second blow, or bots chasing a hurt boss. The early bosses (Pillager Captain, Bell
  Warden, Giant) still never drop a bot. Fight 20 runs 142 s with a person and three bots (`pace.rise` 0.2), past the
  2-minute line: retune with Endless (item 6), where fights past 13 exist. Par (`CONFIG.swift`) is one rule for every
  boss (45 s at the base pace); the Giant falls in ~26 s and the King's Blade takes ~72: a per-boss par if swift kills feel
  lopsided. A reconnect during the blessing pick replays the kill moment (the new arena sees the boss die again).
- Pass 52 (item 9): the server still lists bots added through `sim.addBot` (tests, tools) in the roster, and the lobby
  draws them as people (Make leader / Remove do nothing). Dev only; drop bots from `roster()` if it ever shows.
- Pass 52: a party where one player went away also gets YOU FELL in the lobby notice (the server counts the party
  that took part).
- Item 10 (cut after pass 56, `docs/scorecard/rush-1x-pass56.txt`; skilled bot alone, 256 fights): every boss falls
  0.00-0.11 at fight 1 and 0.01-0.12 at fight 11 now. Still at the band's top: Ostrey 0.11/0.12 (lanternBreath; not
  touched), Varn 0.08/0.11 (knellLeap is what's left), the King's Blade 0.02/0.09 (the Answer: the bot strikes into
  the Oath Guard's front, a read a person learns), Oswin 0.03/0.08 (firstHunger's eruptions were 10 of 21 falls before:
  a bot or seam read). The default bot still falls 0.29 to Oswin and Ostrey at fight 1 (TOTAL 0.14). Fight times run
  68-149 s (the King's Blade ~140 s, Bell Warden ~150 s at fight 11): health is item 2's. The strong kit
  (`KIT=strong`) is one scripted list; re-check it whenever the pool grows. Swift-kill par (45 s) was set for the old pace: the bot's 1x fights run
  68-139 s. Follow-up chances were divided by k; the engine's own inverse, 1 - (1 - c)^(1/k), keeps strings about
  twice as common (the King's Blade's three cuts: 0.11 now, 0.22 that way) if they feel too rare.
- Endless (track B item 5, pass 65, `docs/scorecard/endless-pass65.txt`). Shipped: the seeded draw (easier bosses for 3
  fights, no repeats in a round of the pool), Crowned every 5th fight (a 4-card pick with a legendary, the HUD's
  countdown), pairs from fight 7 every 5th fight (they rest longer: `CONFIG.endless.pairRest`), three pace-only
  modifiers (`js/data/rush.js`) named under the timer, an end screen of bosses beaten and Crowned reached. Left:
  - The Crowned boss's own final phase of new moves: needs each boss's files, after track A's moves pass.
  - The Crowned arena change (light, ground, hazards; baked, inside Normal's budget).
  - Modifiers "an extra phase of new moves" and "burning ground" (a hazard system the arenas lack); more pace-only ones.
  - A swift kill on a Crowned fight adds no card (the pick is 4 either way).
  - Pairs (pass 67): each boss of a pair has half its health; a lone bot's median run is fight 12
    (`docs/scorecard/endless-pass67.txt`). Fights 7 and 12 (pairs) are still where most runs end; party pairs and the
    swift-kill par for a pair (still 1.5x a lone boss's) are unmeasured.
- The weekly run (track B item 8, pass 69). Shipped: the Weekly Run mode (one seed per ISO week, UTC; the same bosses,
  modifiers and offers for the same picks), the lobby board (3 furthest runs, one per party; 3 fastest lone-boss
  kills, one per boss), kept in `BOARD_FILE`. Left:
  - The end screen doesn't say where the run placed on the board.
  - A release mid-week that changes the bosses, abilities or modifiers changes that week's run; the board stays.
  - A party is keyed by its sorted names: a renamed player is a new party.
