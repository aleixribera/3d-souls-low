# Animation references (PLAN.md item 3c)

What the player's movement is measured against, and what it measured. The clips themselves stay out of the repo
(`.scratch/refs/`, untracked); the numbers and patterns below are what carries over. A pass on item 3c adds to this.

## Sources

| Clip | Source | Watched for |
| --- | --- | --- |
| Sekiro deflect sequence | YouTube `ic8YatKzJJE`, 8.4 to 10 s at 30 fps | deflect, sidestep, run |
| Sekiro, no HUD | YouTube `YeN8J4ZQ0R8` | run start and stop (candidate, not yet sampled) |
| Stellar Blade perfect dodge | YouTube `iheCzLzTtZc`, 2.2 to 4.6 s at 20 fps; `vkJJj9ihH4I` | dash, afterimages, counter |
| Stellar Blade combat | YouTube `NyIcNl0JGbU` | combo chains (candidate) |
| Demon Slayer, Tengen vs Gyutaro | YouTube `c1rBk7XAlj0` | anime key poses, speed lines (candidate) |

Frames were cut locally with yt-dlp and ffmpeg (480p, first 60 s). Gemini's video watch was down (500, 503 and 504 errors)
on pass 91, so every observation here is from frames we looked at ourselves.

## Patterns

- **Sidestep and dash (Sekiro):** full lean in about 3 frames at 30 fps (6 at 60), held for about 10, then flows straight
  into the run with no stop pose. Run: a low forward lean with the arms trailing.
- **Perfect dodge (Stellar Blade):** the screen dims and slows, pale see-through copies of the body trail the dash for
  0.3 to 0.5 s, the camera pulls in, and the counter is a thin bright slash line with a held pose.
- **Deflect (Sekiro):** the blade comes up across the body at once and holds there; each deflected blow throws orange
  spark bursts and knocks the blade back before it settles.
- **Anime fights:** few in-between frames, strong held key poses, and the snap between them carries the speed.

## Input to motion, pass 91

Frames at 60 Hz from the key press, measured with `.scratch/motion-probe.cjs` (hand-stepped game, the model rig's joints in the
body's own frame). first = something moves (a joint 1.5 cm); clear = clearly visible (a joint 8 cm); snap = the largest
one-frame jump of a joint where one move gives way to the next (cm).

| Action | Before: first / clear | After: first / clear | Before: snap | After: snap | Goal (unchanged) |
| --- | --- | --- | --- | --- | --- |
| Run start | 1 / 3 | 2 / 3 | | | full speed at frame 9 |
| Run stop | | | | | stopped at frame 12 |
| Turn round | | | | | turned at frame 13 |
| Dash | 1 / 1 | 1 / 1 | 36.7 | 12.1 | |
| Run into dash | | | 39 | 12 | |
| Light | 1 / 3 | 1 / 2 | | | blow out at frame 14 |
| Heavy, tapped | 1 / 8 | 1 / 2 | | | blow out at frame 32 |
| Jump and landing | | | 75.7 | 20.3 | |
| Block | | | 185 | 75 | |
| Deflect tap (jerk) | | | 370 | 73 | |
| Dash into dash attack | | | 206 | 60 | |
| Light cancelled by a dash | | | 259 | 100 | |
| Deflect into riposte | | | 183 | 82 | |
| Drink while walking (end) | | | 18.8 | 4.2 | |

Light chains were already smooth (3 to 5 cm, js/attack-anim.js's chain pose). The run's speed-up, stop, turn and the
blows' start-up are the moves' own timing (CONFIG.player and js/data/player.js), proposed to Track B in BACKLOG.md.

## The blind judge

Each pass, a subagent sees a reference strip and two strips of ours (before and after), unlabelled, and scores ours
0 to 10 on motion alone: `scorecard/animation-judge.csv`, plotted by `node tools/animation-judge-plot.cjs` to
`scorecard/animation-judge.svg`.

Pass 92 (dash and deflect, item 3c pass 2): head height at the lowest frame, standing = 100%: dash 74% (pass 91)
to 66%, deflect press 100% to 85%, landing 99% to 89%. One judge resumed over two rounds scored both 5 then 5
(flat); a fresh judge on the final build scored dash 4, deflect 4. A resumed judge grows lenient: start a fresh
one each round. Strips: `scorecard/anim-p92-dash.jpg`, `scorecard/anim-p92-deflect.jpg`.

Pass 94 (item 3c pass 3; no reference frames this time, only the patterns above, since fetching clips needs Aleix's
OK): the dash became five key poses on a curve (loaded, push-off, stride with the legs swapping, skid, rise), the
held guard and the deflect hold the blade diagonal across the body with the off-hand on the grip, the cape has a limit
per strip so a low dash can't stand it on end. Two fresh judges, one per round, both scored the pass 93 build 3 and
this one 5 for dash and deflect (the leg swap in round 2 didn't move it: flat). Head height in the dash now dips and
rises (72% to 78% and back to 71%) instead of holding. Strips: `scorecard/anim-p94-dash.jpg`,
`scorecard/anim-p94-deflect.jpg`, the counter glow `scorecard/anim-p94-counter.jpg`. Next loop: a side or
three-quarter camera for the deflect (front-on, the judge can't see the knees bend) and a whole-body lean from the
ankles in the dash.
