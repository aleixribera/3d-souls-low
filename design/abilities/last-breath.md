# Last Breath

| | |
| --- | --- |
| Id | `last-breath` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `low`: your health is at or under `below` of the bar |
| Origin | Kept from js/data/abilities.js: the same perk, text and numbers; new look while it holds |

## Card

**Below {below} health: endless dashes.** (5 words, 31 chars)

- Icon (48×48 line drawing): a running foot with three trailing ghost outlines and a small breath puff ahead of it.
- Hover loop (1.8 s): a small figure's health bar drops red (0.3 s), the figure dashes four times in a row round a boss, each dash leaving a chain of blue ghosts (1.2 s); fade.

## Idea

Near death the dash stops costing. The comeback is all footwork: dash through every blow, drink when the boss commits, and walk back out of the low band. It gives new players a second chance without healing them.

## Data

```js
{ id: 'last-breath', name: 'Last Breath', rarity: 'rare',
  text: 'Below {below} health: endless dashes.',
  perk: { when: 'low', then: 'freeDash' },
  levels: [
    { below: 0.25 },
    { below: 0.3 },
    { below: 0.35 },
  ] },
```

Numbers: the player has 3 dash charges refilling over 1.3 s each; endless dashes in the low band mean no lost blow for want of a charge. The band widens from a quarter to over a third of the bar. It deals nothing and heals nothing, so it can't carry a run alone.

## Engine work

- None for the rule: `low/freeDash` exists.
- New: the state is drawn. js/ability-fx.js reads the local player's health against `below` each frame and draws the breath and the afterimage chain on each dash while it holds (no event needed; no allocation).

## Multiplayer

The dash is the client's own movement; the server sees it as any dash. Only the holder's dashes are free; nothing reaches a teammate.

## Effect

Layered, while the perk holds:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| every 1.2 s | Breath | A small flat puff of cold breath from under the hood, 2-tone, drifting up and fading over 0.6 s | `#cfe2f2` body, `#8fb8dc` edge |
| each dash, 0.00-0.25 | Afterimages | 4 flat-shaded silhouettes of the player's dash pose left along the path at 0.06 s steps, each fading over 0.3 s | `#8fb8dc` fill, `#0e1218` ink rim |
| each dash, 0.00 | Kick | 6 sharp flakes off the starting foot | `#f2f6fa` |

Budget (Rare class): 6 pooled meshes (4 afterimages, 2 breath puffs) + 6 particles a dash (4 on Normal), no effect light, no ribbon, no impact frame. Peak 0.25 s a dash. Reduced motion: the afterimages hold still and fade without trailing.

## Sound

New `abilityLastBreath` once when the band is entered: a slow cold inhale (band-passed noise 400-1200 Hz rising over 0.5 s) and a low heartbeat thud (sine 55 Hz, 2 beats). Each free dash adds a faint airy whoosh (noise 2-4 kHz, 80 ms) over the normal dash sound.

## Camera

No camera kick: the dash already widens and dips the view. No `powers` entry.

## Images

- `img/last-breath-1.webp`: a badly wounded swordsman dashing again and again around a boss, a chain of blue afterimages, cold blue breath mist.
