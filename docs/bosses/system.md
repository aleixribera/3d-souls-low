# The boss creation system (PLAN.md item 5)

How a boss is made, start to finish, so the next one takes about three passes and no new engine code. It replaces the
Hollis bar and the old boss rules (`.claude/feedback.md` 2026-11-14). Proven first on the Pillager Captain
(`pillager-captain.md`); the second is the Bell Warden (`bell-warden.md`, from pass 123); then the roster in PLAN item 6's order (the Giant
Skeleton, `giant-skeleton.md`, from pass 125; Aldric, `aldric.md`, from pass 127; the Antlered Hunger, `antlered-hunger.md`, from pass 132; Old Ostrey, `ostrey.md`, from pass 135; Hale and Harrow, `castellans.md`, from pass 138, the first rework). Each step names its tool and the check that closes it.

## 0. The moveset audit: rework or restyle

Every boss starts here (Aleix, 2026-11-21: "Keep in mind that some bosses still need to be reworked, not just
restyled."). Check his moveset as it is against the bars of step 1: 8 to 12 attacks of his own, 3 or 4 combos, one or two
signature moments a phase, a real phase two, and no move renamed from another boss or taken from the borrowed move
sources (`godfrey.js`, `godrick.js`, `maliketh.js`, `radagon.js`, `crucible-knight.js`, `js/data/move-sources.js`).
- All met: a **restyle** (model in cel, animation, effects, the judge).
- One bar short by a move or a string: add it, then restyle.
- `noParry` on more than a quarter of his moves (step 1's rule): give the move whose blow is a weapon's a parry.
- More short, or any move borrowed or renamed: a **rework**: new moves, animation and phase two from a new one-page
  design, before any restyle.
Write the verdict, bar by bar, at the top of the boss's page (`bell-warden.md` "Moveset audit").

## 1. The one-page design

`docs/bosses/<id>.md`, one page, copied from `pillager-captain.md`'s headings:
- **Idea and backstory** from `STORY.md` (part one if he is in the game, part two if not yet). One sentence on what
  fighting him is about.
- **Silhouette**: what reads in black against the sky, from 20 m (weapon, shoulders, head).
- **Moveset**: 8 to 12 attacks. For each: the tell (his own pose, no shared wind-up), the answer (parry, roll, jump,
  step out), and what it punishes. 3 or 4 combos (strings), each named with its branch points.
- **Signature moments**: one or two a phase, the moments players retell.
- **Phase two**: a real change (new moves, a new rule for the arena or the player), not the same fight faster.
- **Rules** (VISION, PLAN item 3): every attack told and dodgeable on its tell; every string breaks on a counter;
  `noParry` on a quarter of the attacks at most; nothing covers the boss during a wind-up (effects on impact, on
  signature moments and on the phase change).

Check: the page exists and every attack in the data file is on it (`node tests/boss-pages.cjs`, pass 123).

## 2. The model, in the chosen style

The style is cel-shaded anime (Aleix, 2026-11-20; `?style=cel`, `js/data/styles.js`). A real Blender model on the
shared skeleton (`tools/blender/<name>.py` from the closest finished figure, `js/bodykit.js` boneSpec): `.claude/iterate.md`
"Build". Check: Model Lab front, back, side and silhouette (`MODELLAB.open('<id>')`), and a frame in a fight.
- **In cel** (pass 118): a body takes the style's `body` bands (flat light steps, no glow passthrough), so its colour is
  its texture's: a material's `tint` sets hue only, so a dark armour needs a dark texture (`wardenPlate`,
  `knightMail`), not a dark tint. Big flat shapes read; small rounded stacks read as a toy.
- **Soft joints** (pass 118): `softJoints: { <bone>: r }` on the model shares the vertices within r m of a joint with
  the bone across it, so knees, elbows, waist and cloak bend as one body instead of hinging as rigid parts.
- Film it in cel: `STYLE=cel node tools/anim-strip.cjs boss:<attackId> <out.jpg> 14 2 1.9` (Model Lab draws no style); `boss:<attackId>@<bossId>` when two bosses share an attack id (the Giant's `sweep`).

## 3. Animation

Key poses per hit (`js/data/attack-poses.js` format: wind-up, strike, follow) blended on the attack's own timeline,
with in-between keys where a straight blend looks stiff:
- **In-between keys:** a hit's `via: { windup | active | follow | recovery: [{ t, ...pose }] }` (js/attack-anim.js):
  the body passes through each key on a smooth curve. `rel: true` keys are offsets from the straight blend.
- **The pose library** (`js/data/pose-library.js`): motions captured from real people, named, used as
  `via: { windup: '<name>' }`. One capture serves every boss of the same build and weapon.
- **Video to motion** (free tools, this PC):
  1. A clip of a person doing the move (a drill, a demonstration) in `.scratch/motion/`, never committed.
  2. `python tools/motion/clip-landmarks.py <clip> <from s> <to s> <out.json> --model <pose_landmarker_full.task>`:
     MediaPipe's 3D pose per frame, with an overlay sheet to check the capture.
  3. `node tools/motion/fit-poses.cjs <out.json> <modelId> <fit.json> --clip <clip> [--mirror]`: fitted onto the
     model's own rig in the game (browser lock), with a sheet of the clip above the fitted body. The haft line comes
     from the wrists and is left out while the hands are close: check it, and keep the authored haft where it is wrong.
  4. `node tools/motion/via-keys.cjs <fit.json> <from s> <to s> --keys 3 --only crouch,spin,chest,head,armR,elbowR`:
     the stretch as `rel` keys, pasted into the pose library under a name.
- **Delayed wind-ups:** a hit's `hold` freezes the wind-up's clock for a while (the delay players read); with
  `hold.creep` (0 to 1) the body keeps creeping on through the wind-up at that share of its pace instead of freezing,
  and the strike still lands on time (`Enemy.creepTime`). Film one with `HOLD=<s>` on `tools/anim-strip.cjs`.
- Check: `node tools/anim-strip.cjs boss:<attackId> <out.jpg> 14 2 1.9` (and `NOVIA=1` for the same attack without its
  in-between keys) shows the move; `tests/pose-via.cjs` holds the curve smooth. `node tools/body-check.cjs <bossId>`
  (retro 130) reads every hit's key poses: the torso's turn, the hips' drop, the follow-through carrying on past the
  strike, and the body's share of the swing; a hit flagged `ARM ONLY`, `NO WEIGHT` or `NO OVERSHOOT` is fixed in its
  key poses before any strip is filmed (a follow-through held on the strike's own pose is the usual cause).
  `tests/body-check.cjs` holds each boss that has cleared it.

## 4. Effects

On impact, signature moments and the phase change only (`js/data/boss-fx.js`, the phase's `revealBurst`, hits'
`impact`). The wind-up's tell sits on the weapon's edge: the model's `edgeTell: { slot, size, along }` colours only that
slot (red: parry it; blue: roll it), puts a small halo at `along` of the weapon, grows it through a heavy's wind-up, and
never tints the body; a boss with no weapon (claws, hooves, antlers) puts its halos on the model's `tells` and sets
`tellsGrow: true` for the same (pass 133). A ground blow's burst waits for the drawn blade (`impact.at`: the share of the hit's active when it
lands; the hitbox still opens on time). A heavy swing's ribbon is a thin arc at the blade's edge (`BOSS_FX` `trail: { edge,
life }`), not a band over the swing; `smear` (0 to 1, the share of the blade from its tip) drags the blade's head in flat
steel over its last few frames, the anime smear. In cel, a blade is a model material with `steel: true`: banded darker than
a body, with one hard glint (a light blade lit as a body drew flat white). Check: the attack's strip shows the boss's body clearly through every wind-up frame,
and the burst in the frame where the blade is down.

## 5. Data and in game

`js/data/bosses/<id>.js`: the model, attacks, phases, key poses; registered in `GAME_FILES`; validated at load
(`js/validate.js`). Check: Practice duel with no console error; `node tests/run-all.cjs fair-attacks pose-via`; the bot
duel (`node tests/run-all.cjs bot-duel -- <id> 10`).

## 6. The judge, then Aleix

A blind subagent sees a strip of each attack beside strips of reference-game boss attacks (`.scratch/bossjudge/`, cut
from `.scratch/ref-clips` with ffmpeg: 14 frames over about 4 s, tiled 7x2), unlabelled, with
`docs/bosses/judge-prompt.txt`. It guesses which are ours, scores motion, readability and spectacle 0 to 10 and names
the single biggest giveaway. Fix that one gap and judge again; one row per round in `docs/scorecard/boss-judge.csv`,
then `node tools/boss-judge.cjs`: it plots the rounds (`boss-judge.svg`) and prints `FLAT` when the current judge has
stopped telling us anything. A flat judge is replaced, not fixed against again: give the new set-up a new name in the
`judge` column.

- **Judge `sekiro-1`** (rounds 0-5, passes 111-118) went flat: caught 9/10 every round while motion crept 3 to 5, and
  its last giveaways were about rendering (a flat white blade beside lit steel), because the references are realistic
  and we are now cel-shaded. "Which is ours" against another render style can't move.
- **Judge `edges-1`**, the fresh one: every strip, ours and the references alike, goes through the same ffmpeg filter
  (`format=gray,edgedetect=low=0.08:high=0.2,negate`; lower both until the dark Sekiro figures read, the same values
  for every strip; `node tools/edge-strip.cjs <clip> <start> <span> <out>` cuts one at 0.05/0.12), so the judge compares line drawings of the motion and the
  render style is out of the comparison. Use at least three references (`.scratch/ref-clips`: both Sekiro clips and
  `stellar-dodge.mp4`) and two of our attacks, so one guess is not the whole verdict. Its question is motion and
  readability; spectacle and the look wait for a judge against cel-shaded references (clips not yet in `ref-clips`).
- **Judge `bars-1`** (from pass 128) replaces the per-boss `edges-1` round, which repeated the same gaps for every boss
  (caught 9/10 in each of rounds 1-9) and never saw that Aldric's sweep was the Giant's. It scores against the system's
  bars, not "which is real": a blind subagent gets cel strips (`tools/anim-strip.cjs`) of two or three of the new boss's
  attacks shuffled among one each from the bosses already through the system, unlabelled, and answers per strip: does
  its wind-up match another strip's (a shared wind-up fails), is the body readable through the wind-up (nothing covers
  it), and can you tell at the wind-up whether to parry or roll. One round per boss; fix what fails and recheck it
  yourself. `edges-1` stays a regression check only when a pass changes the shared animation engine.
- **Once a judge goes flat, the boss gets one fix and one round with the fresh judge, then goes to Aleix** (why: Aleix's fight is
  the real bar, and six rounds of one judge spent five track-1 passes with no plan check met, retro 120).

Then **Aleix fights it**: "awaiting Aleix" in `STATE.md` until he has.
