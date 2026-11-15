# Keen Eye

| | |
| --- | --- |
| Id | `keen-eye` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `parryWindow` mod) |
| Origin | Kept from js/data/abilities.js: same numbers and text; gains `plain: true` and the window ring. |

## Card

**Deflect window {parryWindow} wider.** (4 words, 23 chars; level I reads "Deflect window 15% wider.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['keen-eye']`, an eye with three short rays above it.
- Hover loop (1.4 s): one stroke: a blade line falls toward a small figure (0.5 s), a thin ring flickers once round the figure's feet (0.15 s), the figure's guard line flashes (0.1 s); hold, fade.

## Idea

A wider deflect window, for friends new to the genre. The deflect is about a third of a second wide; this widens both of its edges. Its touch teaches the timing: a thin bone ring flickers once round your feet the moment a blow you can deflect comes into your window, so a newcomer learns what "now" looks like, and a veteran can ignore it.

## Data

```js
{ id: 'keen-eye', name: 'Keen Eye', rarity: 'common', plain: true,
  text: 'Deflect window {parryWindow} wider.', mods: true,
  levels: [{ parryWindow: 0.15 }, { parryWindow: 0.3 }, { parryWindow: 0.45 }, { parryWindow: 0.6 }] },
```

Numbers: the window opens 0.13 s before a blow's active frame and closes 0.05 s into it, plus the press's 0.17 s arm: about 0.35 s. Each level widens the lead and grace by its share: level I adds about 0.03 s, level IV about 0.11 s (about 0.46 s in all). Deflects are 6-15 a fight; if one in five was mistimed by a hair, level I saves one or two blows a fight and turns them into key charge and counters.

## Engine work

- None for the number: `parryWindow` is an existing `ABILITY_MODS` key (`parryTiming`, js/combat.js; the server's parry check reads it too).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The ring: drawing only, on the local player. Each step, for the locked or nearest enemy in a wind-up, the first step `parryTiming(p, e, 0)` returns a number for a new blow (`blowKey`) draws one ring. At most one ring every 0.4 s (`VIS.abilityFx.small.windowRing.gap`), so a fast string never flickers over 3 Hz.

## Multiplayer

Unchanged: each client owns its own defence and the server's parry check already reads `parryWindow`. The ring is the holder's alone (drawn only in their browser; teammates never see a cue for blows not aimed at them). It touches no teammate.

## Effect

Layered, timed from the blow entering the window (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Ring | A thin flat ring on the ground round the player's feet (radius 0.9 m, 3 cm line), hard edge, a dark ink line just outside it | `#f4f1e8` line, `#cfc8b6` edge, `#16130f` ink line |
| 0.00-0.15 | Hold | Held at full strength while the press would land | as above |
| 0.15-0.35 | Fade | It widens 10% and fades | to transparent |

Budget (Common class): 1 pooled mesh (the ring, the existing `groundFx.ring` pool), 0 particles, no light, no ribbon, no impact frame. Peak 0.15 s. Reduced motion: no widening; the ring fades in place. Never more than one ring every 0.4 s.

## Sound

None. A sound on every boss blow would be noise and would compete with the boss's own tells.

## Camera

No camera kick: commons never take one.

## Images

- `img/keen-eye-1.webp`: the swordsman raising the blade to deflect a huge falling blow, a thin bone-white ring of focus around them, the moment just before impact.
