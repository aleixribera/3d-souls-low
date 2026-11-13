# Backlog

The loop's cuts and finds (`.claude/iterate.md`); the order of work is `PLAN.md`.

- Kit parts no model uses since v7.28.0/v7.29.0: `quiver`, `archerHarness`, `cowl`, `fittedDoublet`, `wolfMuzzle`,
  `beastEars`, `furClumps`, and since v7.30.0 `wispHat`, `wispBeard`, `wispMantle`, `wispSleeve`, `wispRobe`, `wispTassels`
  and since v7.31.0 `scionMask`, `scionLimbs`, and since v7.32.0 `eyePatch`, `openCollar`, `featherMantle`, `waistSash`,
  `borderedSkirt`, `boot`, and since v7.33.0 `crystalCluster` (kit-identity.js, kit-premium.js, kit-realms.js,
  bodykit.js). Remove once stage 1 is done, with any others left unused.
- The `beastFur` texture projects as vertical streaks that read like wood grain on the Beastman, and is brown where its
  brief says grey. A texture pass (Claude-only) after stage 1.
- The Antlered Hunger's hide (`beastHide`, the `bark` pattern) reads as gnarled wood more than a stag's hide (v7.49.0,
  `docs/scorecard/hunger-lab.jpg`); a hide or fur texture of its own in the same texture pass. Ysolde is 3,504
  triangles, over the 3,000 enemy budget (load warning).
- Models over budget seen in the load warnings: seren 3,544, ashenWarrior 7,226, omenkin 8,562 (enemy budget 3,000).
  All three belong to the old second road and leave at the swap (`PLAN.md` stage 3), so they get no Blender pass.
- `boss-only` (Node check) failed once with "boss activates after the grace period" and passed on the rerun, with and
  without the v7.34.0 change: flaky (pass 2, 2026-11-13).
- Bots fight bosses worse alone than in v7.12.1's record: Ser Quill beat the Bell Warden and Margit 6/6 then
  (`.scratch/bot-duel-v7.12.1-final.json`), 0/6 now (`docs/scorecard/boss-duels-1-bot.txt`, pass 5). Bots fill The
  Calling's empty slots (`PLAN.md` stage 2, item 3): find which change since v7.13.0 did it before then. With group
  scaling (pass 6) three bots beat the Lands' bosses only 13/48 (`docs/scorecard/boss-duels-3-bots-grouped.txt`), so a
  run with bot fill-ins needs this fixed, then `CONFIG.group` checked again.
- Group scaling counts everyone in the run, but the Lands road's solo companion Finn (Story mode) doesn't make a boss
  scale; if a companion should, it's a `setGroup` call where companions spawn (pass 6).
- The title cards' eyebrow labels ("PLAY WITH FRIENDS", "PLAY ALONE") and the HUD's "CONTROLS" label break Aleix's
  no-eyebrow rule (`docs/scorecard/menu-title-desktop.jpg`, pass 5).
- Level 4, the Tower, opens on a bare, dim stone hall where the wanderer reads as a dark shape; Level 6's snow is a flat
  white that washes out the ground and the controls panel (`docs/scorecard/level-the-tower.jpg`, `level-the-church.jpg`).
- Radagon is unbeaten by one bot or three (0/6 each, `docs/scorecard/boss-duels-*.txt`): check by hand whether a group
  of people can beat it before The Calling offers it.
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
  flock (an opt-in `follows` field: they patrol the same stretch today and wake on its alarm); Ostrey's lantern in his
  hand (the kit `lantern` is hand-built, so it waits for his Blender figure) and his own figure (a stand-in now: the
  Shover's body re-coloured, no shield, the kit cane in iron); the thralls' and bearer's own figures (re-coloured Hollow
  Soldier and Toll Wisp now); the moor's knight, warden, lancers and bowmen are Ashmere's, standing in for Thrale's.
- Finn joins in the Pass as the champion's former squire (`STORY.md` People; `PLAN.md` track A item 2): not built. The
  companion today is per road (`LANDS_STORY.companion`); Ashmere's road would need it from chapter 6 or 7 on.
- Old Ostrey reuses Margit's tuning (3,000 HP, posture 130) and the moor gives 6 flasks, as Stormhill did; no one has
  fought him by hand yet.
- The Empty Sentinel (v7.39.0, pass 14): its upper arms are thin mail tubes under the great pauldrons, and the left
  tasset leaves a patch of the thigh's mail showing beside the front panel (`docs/scorecard/sentinel-lab.jpg`); the kit's
  halberd spends 180 of its ~350 triangles on six grip rings. Second step, stage 4.
- Chapter 8, Saltgrave (v7.40.0, pass 15), rough; its second step: Hale's, Harrow's and the Salt Knights' own figures
  (stand-ins: the Empty Sentinel, the Executioner and the Undead Knight re-coloured; Hale shows the Sentinel's gold
  bands); a twin's fall drawn as more than a seamless phase change (the survivor's kneel is Godrick's arm-chop wind-up);
  the hall's kneeling statues read dark, their swords held up rather than point-down (`docs/scorecard/salt-statues.jpg`);
  rain falls inside the roofed gatehouse, as it did in Stormveil (`salt-gatehouse.jpg`). No one has fought the pair by
  hand yet (1,700 HP each, Godrick's damage x0.85).
- A castellan fought alone (Arena, Boss vs Boss, a Calling roster without her sister) begins as the whole castellan at
  once, kneeling into `sistersHalf` (pass 15); a lone-castellan opening without the kneel may read better.
- The Pillager Captain (v7.41.0, pass 16): the helm's face reads as a plain bucket from the front (a visor ridge or
  breaths would break it up); the `dentedSteel` plate shows horizontal streaks; the halberd's glowing edge is the kit's
  flat yellow card (`embers.edge`), not a lit blade (`docs/scorecard/captain-lab.jpg`). Its second step, stage 4.
- The Bell Warden (v7.43.0, pass 18): the bell maul is the kit's (10-sided, 355 triangles) and rests at 0.65 rad
  (`weapon.rest`) so the bell stands on its lip, its lower rim a little into the floor; the eyes' halo blooms white over
  the helm's window on the tower top; the mail sleeves show the `knightMail` grid (`docs/scorecard/bellwarden-lab.jpg`,
  `bellwarden-tower.jpg`). The Ringer's 0.6-size maul still rests at the default 1.25 (`sway`): check whether it sinks
  into the gaol floor and give her a `weapon.rest`. `weapon.rest` and `weapon.size` are checked when a rig is built
  (`checkModel`), not at load. Second step, stage 4.
- Chapter 9, the Night Gaol (v7.42.0, pass 17), rough; its second step: the Ringer's and the Keyless's own figures
  (stand-ins: the Rogue in gaol-grey with the Bell Warden's maul at 0.6 size, the Hollow Soldier in starlit grey;
  `docs/scorecard/ringer-lab.jpg`), chains that show on both, the knell drawn as more than the ground ring, a mark on the
  ring's floor where she was held. The Ringer reads small and dark against the ring's blue floor
  (`gaol-ringer.jpg`); the Keyless barely read in the cells (`gaol-keyless.jpg`). Her moves are the Crucible Knight's
  without the shield: 3,000 HP (was 2,600 behind a 70 % shield); no one has fought her by hand yet. `shackledRush` stays
  unparryable, as the shield bash was.
- The evergaol's own lore (`js/data/lore-lands.js` 82-83) has three shackles and a corpse inside cell pillars; fixed in
  the Night Gaol's copy, left in the old road (no more work on it, `PLAN.md`).
- Chapter 10, Aurel, the Gilded City (v7.44.0, pass 19), rough; its second step: the Regent's and the Gilded Thralls'
  own figures (stand-ins: the Pale Duelist at 1.85 in gold leaf and crimson with the kit greatsword, the Rogue in gold
  leaf with two curved knives; `docs/scorecard/hollis-lab.jpg`, `gilded-thrall-lab.jpg`). The Regent reads thin for a
  boss at that size and the kit greatsword still shows a streaked, wood-like grain (`aurel-hollis.jpg`). His moves are
  Morgott's, renamed, the conjured gilt weapons kept, fire for the second phase's blood: 3,400 HP (was 4,800); no one
  has fought him by hand yet. The "turning cut" is Morgott's tail swipe, a hit behind him with no tail to show it.
  The city has no smiles yet beyond the words: the thralls' gilt masks are the Rogue's.
- Chapter 11, Aurel in Ash (v7.46.0, pass 21), rough; its second step: Oswin's and the Cinderfolk's own figures
  (stand-ins: the Executioner in ash and old gold with its own axe, the Hollow Soldier charred). Oswin is Godfrey's
  moves renamed, 3,800 HP (was 4,400); from 40 % only the axe is cast down (`conceal: ['weapon']`) and he burns, where
  Godfrey also shed a lion and armour the stand-in doesn't have. The kit has no crown for him yet. No one has fought him
  by hand. The level is the burned capital's layout as it was; the ash gate and the plaza could show the gold of
  chapter 10 burned (charred gilt, a dry fountain) so the two chapters read as one city.
- Chapter 12, the Torn Abbey (v7.48.0, pass 23), rough; its second step: Agathe's and the Rending Brothers' own figures
  (stand-ins: the Toll Wisp beardless in black with a glaive, its tall hat reading more ringer than abbess; the Rogue in
  an undyed cowl). Agathe is Maliketh's moves renamed, 4,000 HP (was 4,600); the robe shed and Black Blade reveal are
  gone, so nothing changes on her body at half health but the storm's light. No one has fought her by hand. The
  Brothers borrow the Beastman's def at load (`js/data/bosses/agathe.js`): the swap must keep it or inline it.
