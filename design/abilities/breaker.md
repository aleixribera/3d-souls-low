# Breaker

| | |
| --- | --- |
| Id | `breaker` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `counterWindow` mod) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true` and the bone tail on the counter glow. |

## Card

**Counter window {counterWindow} longer.** (4 words, 24 chars; level I reads "Counter window 15% longer.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['breaker']`, a circle split by a jagged crack.
- Hover loop (1.6 s): one stroke: a blade line lights (0.1 s) and dims along a bar beneath it (0.8 s), the bar's last stretch drawn in a paler tone; hold, fade.

## Idea

A longer counter window. The counter is the skill the whole fight turns on, and PLAN asks the picks that used to feed posture to feed counters instead. For a newcomer, the window after a perfect dodge (0.8 s) or a last-blow deflect (1.1 s) is often over before they have turned round; this buys them the turn. Its touch shows the time it bought: the blade's counter glow already dims over the window, and the stretch Breaker added is drawn as a bone-white tail, so you see when you are living on borrowed time.

## Data

```js
{ id: 'breaker', name: 'Breaker', rarity: 'common', plain: true,
  text: 'Counter window {counterWindow} longer.', mods: true,
  levels: [{ counterWindow: 0.15 }, { counterWindow: 0.3 }, { counterWindow: 0.45 }, { counterWindow: 0.6 }] },
```

Numbers: after a perfect dodge the window is 0.8 s (level I 0.92 s, level IV 1.28 s); after a deflect 1.1 s (level I 1.27 s, level IV 1.76 s). It adds no damage; it turns missed counters into landed ones. If one counter in six was missed for want of time, level I recovers about one counter a fight (about 40 damage plus a guard crack toward the Finishing Blow).

## Engine work

- None for the number: `counterWindow` is an existing `ABILITY_MODS` key (js/player.js opens the window, the server's riposte check reads it too).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The tail: `counterGlow` (js/player-pose.js) already dims the glow over the window's full length. It also mixes toward bone white once the time left is under the share Breaker added (`riposte < cwFull × counterWindow / (1 + counterWindow)`). Drawing only.

## Multiplayer

Unchanged: the window is the holder's own and the server's riposte check already reads `counterWindow`. The glow is drawn by every browser on that player's blade. It touches no teammate.

## Effect

Layered, timed from the counter window opening (t = 0, `counterOpen`), lasting the window's length `W`:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 to W × 1/(1 + counterWindow) | Glow | The existing counter glow on the blade, dimming as now | the existing glow |
| the rest of W | Tail | The same glow, its colour mixed to bone white with a thin dark ink edge on the blade trail, still dimming | `#f4f1e8` core, `#cfc8b6` edge |
| W to W + 0.2 | Out | The tail fades out | to transparent |

Budget (Common class): 0 new meshes (the existing blade glow, recoloured), 0 particles, no light, no ribbon, no impact frame. Peak: none of its own; the tail lasts 0.12-0.66 s by level and window, a recolour of the existing glow rather than a new effect. Reduced motion: no change needed (a colour shift, no flash).

## Sound

None new. The window's own `counterOpen` ring announces it; a sound cannot show the remaining time as clearly as the glow does.

## Camera

No camera kick: commons never take one.

## Images

- `img/breaker-1.webp`: the swordsman after a perfect dodge, the blade glowing with a long, slowly fading white aura while the boss recovers, time feeling stretched.
