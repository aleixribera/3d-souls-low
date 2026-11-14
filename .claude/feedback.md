# Feedback

Aleix's bug reports, complaints and ideas for the iterate loop, newest last. Each entry: date, what, and the pass that
took it (once taken).

- 2026-11-13, complaint (bots): Make the bots smarter. Not perfect dodging every time: better spacing, and waiting for
  the enemy to finish its attacks before going in. Right now bots keep walking straight into an attack combo and end up
  in an endless rolling loop. Make them more human, believable and realistic, and a bit stronger in general: they
  should carry a bit more, just a bit. (Answers pass 26's question on companion risk-taking.) Taken by pass 29 (v7.52.0).
- 2026-11-13, addition to the bot complaint above: vary their strategy too, not always the same pattern. Taken by pass 29 (v7.52.0).
- 2026-11-13, addition to the bot complaint above: when an enemy is open to an execution, bots leave it to the player
  and do it themselves only if the player doesn't, at the end of the window. Bots should feel like an aid to the
  player, not a carry. Taken by pass 29 (v7.52.0).
- 2026-11-13, complaint (boss health): boss health is too large for most of them; relax it, Aleix's friends are new to
  the genre. Covers the per-player group scaling (v7.35.0, +50% health per extra player) and the health the loop picked
  for the new story bosses (Ostrey, the castellans, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's
  Blade).
- 2026-11-13, correction to the boss health complaint above: withdrawn. The normal (non-Elden Ring) bosses' health,
  group scaling included, is right: keep it as it is. Only the Elden Ring bosses felt too tanky, and they are leaving
  the game soon, so no health change is needed.
- 2026-11-13, decision (relayed by the director from the grilling): remove the Elden Ring bosses and their levels (the
  whole old second road, the Lands Between) now, not later at the swap: "let's make them leave now ... so that the
  next loops build their own levels and bosses." The director records it in VISION.md and PLAN.md. Taken by pass 31
  (v7.54.0).
- 2026-11-13, follow-up to v7.52.0's bots (they now win 111 of 132 three-bot boss fights): weaken them a bit, but make
  them smarter about the game, their position, the situation and their health, so they stay alive longer. Read as:
  less damage and greed, so they win fewer fights on their own; better positioning and backing off to heal when hurt,
  so they die less and live longer. Taken by pass 32 (v7.55.0).
- 2026-11-13, decision (relayed by the director): nothing replaces the removed Lands bosses. The Boss Rush (The Calling,
  being renamed "Boss Rush") roster and the Arena boss lists become the story's own bosses only: Ashmere's five
  (Pillager Captain, Bell Warden, Giant Skeleton, Aldric, Antlered Hunger) plus chapters 7-14's (Ostrey, Hale and
  Harrow, the Ringer, Hollis, Oswin, Agathe, the Kindling Tree, the King's Blade). A story boss built on a Lands boss's
  moves keeps working as it is for now; each gets its own moveset in later passes. Taken by pass 31 (v7.54.0).
- 2026-11-13, complaint (render scale, relayed by the director): "It is crucial that the quality preset never gets a
  lower that 100% render scale setting, it looks incredibly bad, optimize it another way." The director found every
  preset's renderScale is 1, but maxPixelRatio caps Low at 1x and High at 1.5x (js/config.js ~393/397, applied in
  js/visuals.js ~1417), so on a scaled screen they draw below native resolution and get stretched. No preset, and no
  auto-quality step, may render below the screen's own resolution; the speed has to come from elsewhere. Taken by
  pass 33 (v7.56.0).
- 2026-11-13, correction to v7.55.0's bots: bots are normal players. They keep 100% of the player's stats and attacks
  (undo the 75% damage cut and any other stat handicap). The only things to tune are how smart they are and how they
  act in each situation. They should be more of a help and less of a carry through behaviour alone (leaving openings
  and executions to the human, supporting rather than leading), while still playing as individual players.
  Taken by pass 35 (v7.57.0).
- 2026-11-13, measurement (Fedora laptop, Lenovo V15 G5, integrated graphics, v7.56.0, Level 5 the Final Castle):
  Low holds a locked 60 fps most of the time; High runs at about 30-40 fps with the occasional stutter. This is the
  calibration point for `PLAN.md`'s Normal preset (Low and High merge into Normal, plus Ultra): Normal must hold 60 on
  this laptop, so it starts from Low's cost and takes back only the parts of High's look that fit in the budget. Ties
  the stand-in for integrated graphics to these numbers.
- 2026-11-13, correction by the loop chat to its own reading of the laptop entry above: ignore "starts from Low's cost
  and takes back only the parts of High's look". `VISION.md` and `PLAN.md` (Story track item 3) rule: Normal keeps every
  one of Ultra's effects, each toned down slightly and never switched off; lighting is baked everywhere, in every preset,
  in place of most real-time lights and shadows; never below 100% render scale. The laptop numbers (Low 60, High 30-40
  on the Final Castle) only calibrate the stand-in for integrated graphics; Normal must hold 60 on it.
- 2026-11-13, bot follow-up after playing v7.57.0: they are good now but wait too much; make them a bit more
  aggressive. And smarter about rolling: they sometimes roll when the attack's hitbox is nowhere near them, for example
  when they stand behind the boss. A bot rolls only when the swing can actually reach it. Taken by pass 38 (v7.58.0).
- 2026-11-13, after seeing pass 43's lobby (v7.63.0, `docs/scorecard/lobby-v2/`): yes, the title and the other menus
  follow this look (mode list over one big Start, the party as the other column, key hints that follow the device).
  The title taken by pass 49 (v7.71.0); Practice, options, pause and the end of run follow (PLAN.md Track B item 3).
- 2026-11-13, on pass 45's question (Kindling Tree 2,500 and King's Blade 3,000 below Agathe's 3,200): fine for now.
  Every boss's health gets adjusted once all the bosses are finished and reworked; until then don't spend passes on it.
- 2026-11-13, after playing the Regent Hollis (pass 44, v7.66.0): "a perfect example of a well built boss". A clear
  idea, a distinct character, a good model, clear attacks, fair attacks, cool effects, balanced, and ready to be pushed
  hard by Boss Rush. Hollis is the bar for every boss still to be redone (Oswin onward, then Ashmere's five), and for
  any second pass on Ostrey, Hale and Harrow and the Ringer.
- 2026-11-13: the wait between Boss Rush rounds goes back from 10 to 30 s (`CONFIG.blessings.pickTime`), and still
  skips as soon as everyone has chosen. This overrides PLAN.md's "10 s clock". Done by the loop chat in v7.67.0.
- 2026-11-13, after seeing pass 49's title (v7.71.0, `docs/scorecard/title-desktop.jpg`, `title-phone.jpg`): yes, it
  matches the mockup he chose. Practice, options, pause and the end of run follow the same style.
- 2026-11-13, after playing Mother Agathe (pass 48, v7.70.0): her mechanics are cool, especially the lightning
  strikes; keep them. Her model and weapon animations need polish: in several attacks the hook is held and rotated
  wrong. Fix the grip and the weapon's angle through every attack (check each tell and strike in the model lab and in
  the abbey), and polish the model (the backlog already notes her face reads as a mask). This is her second pass.
  Taken by pass 53 (v7.77.0).
- 2026-11-14, how a boss's final pass is judged (on top of `VISION.md`, `PLAN.md` track A item 2 and track B item 10,
  with the Regent Hollis as the bar). Three additions, for every boss redo and polish pass from now on:
  1. **Grip and angle in motion.** Every attack is checked from wind-up to recovery as a short clip or a frame strip,
     not one still pose: the weapon's angle and how the hand holds it, all through the swing. (Agathe's hook was held
     and turned wrong in several attacks and still frames didn't catch it.)
  2. **Blind side-by-side against Hollis.** A separate judge subagent sees the boss and Hollis unlabelled, scores both
     on Aleix's list (clear idea, distinct character, good model, clear and fair attacks, cool effects, balanced, ready
     for Boss Rush) and names the single biggest gap. Fix that gap, judge again.
  3. **Aleix is the last gate.** A boss is marked final only after Aleix has fought it. The bot measures balance; fun
     and whether the tells feel fair are his call. Until he has, the boss stays "awaiting Aleix" in `STATE.md`.
- 2026-11-14, the ability pick between Boss Rush fights: "Add a small pause after choosing the card so that the player
  can see what it does, and also view other cards, and make other card's info available to see by the player, because
  they might forget how they work, their triggers, and they might want to form synergies." So:
  1. After a card is chosen, the pick screen holds briefly: the chosen card shows what it does, and the other offered
     cards stay readable.
  2. Every ability the player holds can be looked up at any time (trigger, effect, rarity), so they can remember how
     each works and plan synergies.
