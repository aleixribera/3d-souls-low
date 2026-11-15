# Vanishing Step

| | |
| --- | --- |
| Id | `vanishing-step` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (12, 11, 10 points) |
| Origin | New |

## Card

**Refill all dashes; vanish for {time}.** (6 words, 32 chars)

- Icon (48×48 line drawing): a figure's outline breaking into five small petal shapes on one side, three short bars beneath it.
- Hover loop (1.4 s): the key 2 square lights (0.2 s); a small figure with empty dash bars is caught in a boss's wind-up; it bursts into a swirl of blue petals (0.3 s) and the blow passes through empty air (0.3 s); the figure reforms beside it and the three dash bars flash full (0.4 s); fade.

## Idea

The instant escape. You blink out in a swirl of blue petals, untouchable and unseen for a moment, and every dash comes back. It is the guard for the moment a newcomer has spent all their dashes in panic and the boss's next blow is already falling, and for a skilled player it is three more perfect dodges in the bank.

## Data

```js
{ id: 'vanishing-step', name: 'Vanishing Step', rarity: 'rare', key: 'guard',
  text: 'Refill all dashes; vanish for {time}.',
  perk: { when: 'press', then: 'vanish' },
  levels: [
    { charge: 12, time: 0.6 },
    { charge: 11, time: 0.7 },
    { charge: 10, time: 0.8 },
  ] },
```

Numbers: three dashes refill one at a time over 1.3 s each, so a full refill from empty is about 3.9 s of waiting given back at once, plus 0.6-0.8 s untouchable (two dashes' i-frames, 0.3 s each). It avoids no more than one blow by itself, so it is the cheapest guard: 12-10 points at 1-1.4 a second, a press every 7-12 s.

## Engine work

- New perk `press/vanish` in `ABILITY_PERKS` (`['charge', 'time']`), with `vanish` (s left) in `abilityPerkState`; `abilityClocks` counts it down.
- On the press: every dash charge is set full; for `time` s the body is untouchable (`invulnerable()` also checks `perk.vanish > 0`) and drawn hidden. The holder can move, dash and block while vanished; an attack or a flask ends the vanish at once.
- A blow that meets the holder while vanished passes through without a perfect dodge: no counter window, no dodge points (so it can't farm counters or charge).
- Targeting: while vanished the holder can't be chosen as a target (an enemy keeps its current swing but does not turn to track them; the server's aggro skips them for new choices).
- `validate.js`: `press/vanish` needs `charge`, `time`.

## Multiplayer

The vanish is its holder's own defence and movement (the client owns both); the server accepts the press, then knows the holder is untouchable and not a target for `time` s plus its slack. To teammates the holder is drawn as the petal swirl and a faint 15% outline, so a friend never loses track of where they are. It never moves or hides a teammate.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.08 | Break | The body breaks from the edges inward into 36 flat petals (hard-edged, two-tone, ink outline); the body is hidden at 0.08 s | `#8fb8dc` petal, `#f2f6fa` inner tone, `#0b0d12` outline |
| 0.08-`time` | Swirl | The petals swirl in a tight column round where the body is (following it as it moves), turning and fluttering | as above |
| 0.00-0.30 | Bars | The three dash bars on the HUD flash full, left to right, 50 ms apart | `#f2f6fa` |
| `time`-+0.15 | Reform | The petals pull in and the body reforms from the middle out | as above |
| +0.15-+0.6 | Settle | 8 petals drift down and fade on the floor | to transparent |

Budget (Rare class): 1 pooled mesh (the petal swirl as one instanced mesh) + 36 petals (20 on Normal), 1 effect light (blue, low, while vanished, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.08 s. Reduced motion: the petals swirl at half speed.

## Sound

`abilityVanish` (new, in `js/data/audio.js`): a transient of a soft air pop (white noise high-passed at 3 kHz, 20 ms), a body of a swirl of petals (pink noise band-passed sweeping 800 Hz to 3 kHz and back over `time`, low gain), a tail on the reform (a rising glass note, sine 988 Hz, 0.4 s). The dash bars filling each tick (the normal dash refill chime, three times, 50 ms apart).

## Camera

No new entry: the perk kick plays on the press; the view never moves on its own while the body is hidden.

## Images

- `img/vanishing-step-1.webp`: the swordsman dissolving into a swirl of blue petals as a boss attack passes through empty air.
