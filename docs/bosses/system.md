# The boss creation system (PLAN.md item 5)

How a boss is made, start to finish, so the next one takes about three passes and no new engine code. It replaces the
Hollis bar and the old boss rules (`.claude/feedback.md` 2026-11-14). Proven first on the Pillager Captain
(`pillager-captain.md`). Each step names its tool and the check that closes it.

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

Check: the page exists and every attack in the data file is on it.

## 2. The model, in the chosen style

The style is cel-shaded anime (Aleix, 2026-11-20; `?style=cel`, `js/data/styles.js`). A real Blender model on the
shared skeleton (`tools/blender/<name>.py` from the closest finished figure, `js/bodykit.js` boneSpec): `.claude/iterate.md`
"Build". Check: Model Lab front, back, side and silhouette (`MODELLAB.open('<id>')`), and a frame in a fight.

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
- Check: `node tools/anim-strip.cjs boss:<attackId> <out.jpg> 14 2 1.9` (and `NOVIA=1` for the same attack without its
  in-between keys) shows the move; `tests/pose-via.cjs` holds the curve smooth.

## 4. Effects

On impact, signature moments and the phase change only (`js/data/boss-fx.js`, the phase's `revealBurst`, hits'
`impact`). Check: the attack's strip shows the boss's body clearly through every wind-up frame.

## 5. Data and in game

`js/data/bosses/<id>.js`: the model, attacks, phases, key poses; registered in `GAME_FILES`; validated at load
(`js/validate.js`). Check: Practice duel with no console error; `node tests/run-all.cjs fair-attacks pose-via`; the bot
duel (`node tests/run-all.cjs bot-duel -- <id> 10`).

## 6. The judge, then Aleix

A blind subagent sees a strip of each attack beside strips of reference-game boss attacks (`.scratch/bossjudge/`, cut
from `.scratch/ref-clips` with ffmpeg: 14 frames over about 4 s, tiled 7x2), unlabelled, with
`docs/bosses/judge-prompt.txt`. It guesses which are ours, scores motion, readability and spectacle 0 to 10 and names
the single biggest giveaway. Fix that one gap and judge again; one row per round in `docs/scorecard/boss-judge.csv`.
When the scores go flat over three rounds, start a fresh judge. Then **Aleix fights it**: "awaiting Aleix" in
`STATE.md` until he has.
