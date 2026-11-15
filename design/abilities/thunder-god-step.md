# Thunder God Step

| | |
| --- | --- |
| Id | `thunder-god-step` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `dash` (new): every dash, resolved at its end (0.6 s cooldown) |
| Origin | New |

## Card

**Dashes become lightning that cuts all you pass.** (8 words, 47 chars)

- Icon (48×48 line drawing): a jagged lightning line running corner to corner, a small crouched figure at its lower end, a short cut mark crossing the line's middle.
- Hover loop (1.6 s): a small figure crouches beside a boss silhouette (0.2 s); it vanishes and a jagged line snaps through the boss to the far side, the brighter frame (0.1 s); the figure is crouched at the line's end, the cut on the boss opens (0.5 s); a second dash crosses the first in an X (0.4 s); the lines fade (0.4 s).

## Idea

Every dash becomes a bolt: for the dash's untouchable instant the body is gone, a jagged white-violet line is where you went, and you land crouched at its end with a thunderclap while everything the line crossed is cut. It changes nothing about how the dash moves or protects you; it turns the most-pressed button in the game into an attack, so a fight becomes a web of lightning lines round the boss. It rewards dashing through, not away.

## Data

```js
{ id: 'thunder-god-step', name: 'Thunder God Step', rarity: 'legendary',
  text: 'Dashes become lightning that cuts all you pass.',
  power: { when: 'dash', then: 'lightningDash' },
  levels: [
    { damage: 30, cooldown: 0.6 },
  ] },
```

Numbers: a skilled player dashes every 2-3 s in a boss fight (three dashes, one back every 1.3 s) and through or close past the boss about half the time, so 15-25 cuts in a 90 s fight: 450-750 on the boss, plus every other enemy a line crosses. The 0.6 s cooldown keeps a three-dash burst to two cuts. On the bar for a player who dashes through blows; a player who dashes away gets the look and little else, which is the lesson.

## Engine work

- New `when: 'dash'`: fired once at the end of every dash (the `roll` state ending) with `ctx`: `{ from: { x, z }, to: { x, z } }`, the dash's path. It shares Spark Step's path check (`dashPast`, `CONFIG.abilities.commons.pastGap` = 1.2 m) but needs no "past": any live enemy whose body edge comes within `pastGap` of the segment, through it or beside it, is crossed. A dash that crosses nothing still draws the line and spends no cooldown.
- New `then: 'lightningDash'`: `ABILITY_POWERS['dash/lightningDash'] = ['damage', 'cooldown']`. `damage` to every crossed enemy as a power's blow (`wound`: it never counts toward `hits`, a counter or a crack, and sets off no power), resolved at the dash's end so the cut opens as the holder lands (the delayed cut).
- The dash's movement, length, i-frames and counter window are unchanged. Drawing only: the holder's body is hidden for `CONFIG.player.rollIFrames` and the line stands where it went (teammates see the line, never a missing friend: their view draws the body as a white-violet streak along it).
- `validate.js`: `dash/lightningDash` needs `damage` and `cooldown`.

## Multiplayer

A dash is its player's own, so `dash` joins `ABILITY_CLAIMS`: the browser claims it with the path; the server checks the player's poses showed a dash in the last 0.5 s, that the path starts and ends within 1.5 m of those poses and is no longer than a dash can go, and the cooldown; then it finds the crossed enemies itself from its own positions and resolves the cuts. Enemies only: a line through a teammate passes through them. One holder per team.

## Effect

Timed from the dash's start (t = 0; a dash lasts about 0.4 s):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.04 | Anticipation | The dash's own crouch; four short ember sparks jump off the feet; a thin white crack of light at the start point | `#e59a5c` sparks, `#ece6ff` crack |
| 0.04 | Release | The body is gone; a jagged ribbon line snaps from start to end in one frame, 0.25 m wide, white-violet core, ember fringe, black ink outline; short branch forks off its corners | `#ece6ff` core, `#8f7cf0` body, `#e59a5c` fringe, `#0b0b0f` ink |
| 0.04-0.20 | Clap (start) | A flat star burst of 8 hard shards and a small ring of dust at the start | `#fff3dc`, `#e59a5c` |
| end of dash | Peak (landing) | The holder is crouched at the line's end, blade low; a second clap there; every crossed enemy's body shows a hanging cut line that opens a beat later with 10 shards. **The impact frame**, only when the line crossed a boss and no more than one every 3 s from this ability | `#fff3dc` cut, `#e59a5c` shards |
| +0.0-0.6 | Fade | The line burns from both ends toward the middle, leaving a dark scorch line on the floor that cools ember to black | `#e59a5c` to `#2a1a12` |

Budget (Legendary class): 5 pooled meshes (2 line ribbons reused, so two dashes can stand at once; clap star, cut line, scorch decal) + 8 + 8 + 10 shards a dash, at most 52 alive with two lines (29 on Normal), 1 effect light (a soft, short glow along the line that fades over 0.3 s and never pops: three dashes in a second must not read as flashes), 2 ribbons (the two lines), 1 impact frame at a boss cut, at most one every 3 s. Peak 0.1 s. A line never hides a wind-up: it is thin and gone in 0.6 s. Reduced motion: the impact frame becomes a 30% darken, no shake, the line fades in over 0.1 s instead of snapping.

## Sound

New `abilityThunderStep`: at the release a tight electric snap (white noise high-passed at 3 kHz, 20 ms) over a short rising zap (saw 400 to 1600 Hz, 0.08 s); at the landing a thunderclap (pink noise burst, low-passed from 4 kHz to 400 Hz over 0.3 s) with a dull sub hit (sine 55 Hz, 0.2 s); each cut adds `abilityBlade`'s ring of steel pitched up. No tail: three in a row must not pile into a roar.

## Camera

`CONFIG.camera.feel.powers.lightningDash = [-1.2, 0.03]`, only on a cut that crossed a boss. The dash's own camera is otherwise unchanged.

## Images

- `img/thunder-god-step-1.webp`: the swordsman reappearing at the end of a jagged white-violet lightning line with ember fringes that cuts through a boss, a thunderclap burst at both ends.
- `img/thunder-god-step-2.webp`: several jagged lightning dash lines criss-crossing around a boss, the swordsman crouched.
