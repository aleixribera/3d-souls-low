# Mending

| | |
| --- | --- |
| Id | `mending` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (14, 13, 12 points) |
| Origin | Kept from js/data/abilities.js: numbers and text unchanged; the green motes and the gold floor ring become a blue ring with calligraphy strokes rising from the feet to the head. |

## Card

**Heal {heal}.** (2 words, 7 chars)

- Icon (48×48 line drawing): a ring seen at a slant with two short brush strokes rising up through it and three dots falling below.
- Hover loop (1.4 s): the key 2 square fills and lights (0.3 s); a small figure with a low health bar stands still; a blue ring rises from its feet to its head (0.5 s) while the bar fills by a fifth (0.3 s); dots fall; hold, fade.

## Idea

The quick heal on a key. A flask is drunk on the move but a blow cuts it short and it runs out; Mending heals at once, mid-fight, and nothing interrupts it. It is the guard a newcomer takes to survive the first bosses, and a skilled player fills it with deflects and turns it into a second wind. Each press undoes about one boss blow.

## Data

```js
{ id: 'mending', name: 'Mending', rarity: 'rare', key: 'guard',
  text: 'Heal {heal}.',
  perk: { when: 'press', then: 'heal' },
  levels: [
    { charge: 14, heal: 0.2 },
    { charge: 13, heal: 0.25 },
    { charge: 12, heal: 0.3 },
  ] },
```

Numbers: a flask heals 45 of 120 health (37.5%) in a 0.95 s drink a blow can cut; Mending heals 20-30% at once. A key fills at about 1-1.4 points a second of good play (a landed light 1, a heavy or riposte 3, a deflect or perfect dodge 3, a Finishing Blow 6), so 14 points come every 10-14 s: 4-6 heals in a minute-long fight, and each heal (24-36 health) undoes about one median boss blow (34). Unchanged from the shipped entry, which has played well.

## Engine work

- None for the rule: `press/heal` is in `ABILITY_PERKS` and `abilityPressPerk` heals the holder's body (js/abilities.js).
- Drawing only: the `press/heal` cue in js/ability-fx.js (green `perks.heal` motes and a floor ring) becomes the rising ring below. `VIS.abilityFx.perks.heal` turns rare blue, and a new `VIS.abilityFx.perks.mend` holds the ring's tuning (`size` 1.1 m, `height` 1.9 m, `rise` 0.5 s, `strokes` 3).

## Multiplayer

Unchanged: the browser heals its own body (each client owns its health) and claims the press; the server checks it against its own count of the Guard key's charge. It heals its holder only; teammates see the ring.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Ring | A flat hard-edged ring on the floor at the feet, 1.1 m across, a white inner line and a dark ink outline | `#8fb8dc` edge, `#f2f6fa` inner line, `#0b0d12` ink |
| 0.00-0.50 | Rise | The ring rises from the feet to 1.9 m, narrowing to 0.8 m; three thin vertical calligraphy strokes sweep up inside it, each tapering at the top | as above; strokes `#f2f6fa` with `#8fb8dc` edges |
| 0.10-0.90 | Motes | 16 flat diamond flakes shed from the ring's rim, falling slowly and turning | `#f2f6fa`, `#8fb8dc` |
| 0.50-0.80 | Close | The ring closes to a point over the head and blinks out; the healed part of the health bar sweeps blue once | `#8fb8dc` to transparent |

Budget (Rare class): 2 pooled meshes (ring, stroke sheet) + 16 particles (9 on Normal), 1 effect light (blue, 0.5 s, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.5 s. Reduced motion: no change needed (no flash).

## Sound

`abilityMend` (new, in `js/data/audio.js`; it replaces `abilityHeal` for `press/heal` in `ABILITY_PERK_SOUNDS`): a soft bell transient (sine 1047 Hz with a 2.76 partial, 2 ms attack, 0.4 s decay), a body of the rising chord (523, 659 and 784 Hz stepped 60 ms apart, each gliding up a semitone over 0.5 s as the ring climbs), a tail of breath (pink noise band-passed at 3 kHz, 0.4 s). Rare pick pitch 0.84.

## Camera

No new entry: the rare perk kick (`perkFov`, -0.9) already plays for the holder. A heal is not a hit.

## Images

- `img/mending-1.webp`: a ring of cool blue light with thin calligraphy strokes rising up around the swordsman from feet to head, falling motes, mid-fight.
