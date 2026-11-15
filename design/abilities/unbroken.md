# Unbroken

| | |
| --- | --- |
| Id | `unbroken` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (18, 17, 16 points) |
| Origin | New |

## Card

**For {time}, no blow can kill you.** (7 words, 28 chars)

- Icon (48×48 line drawing): a kneeling figure with its sword planted, a tall flame shape rising above its head.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a blue flame rises over a small figure with a near-empty bar (0.3 s); a huge blow lands, the figure drops to one knee with a sliver left and the flame flares tall (0.6 s); the figure stands and strikes back (0.4 s); fade.

## Idea

A blue flame of will. For a few seconds nothing takes you below a sliver of health: the all-in moment, when you are low and the boss is nearly down and you decide to stand and finish it. It never heals, so the moment it ends you are as fragile as before, and the choice of when to press it is the whole skill.

## Data

```js
{ id: 'unbroken', name: 'Unbroken', rarity: 'rare', key: 'guard',
  text: 'For {time}, no blow can kill you.',
  perk: { when: 'press', then: 'undying' },
  levels: [
    { charge: 18, time: 3 },
    { charge: 17, time: 4 },
    { charge: 16, time: 5 },
  ] },
```

Numbers: 3-5 s is one boss combo and the punish after it. On full health it does nothing, so its value is all at low health, where it is worth a whole life for a few seconds. 18 points at 1-1.4 a second is a press every 13-18 s, as dear as Hourglass. It never heals, so it never makes a player safe for longer than its time.

## Engine work

- New perk `press/undying` in `ABILITY_PERKS` (`['charge', 'time']`), with `undying` (s left) in `abilityPerkState`; `abilityClocks` counts it down.
- `Player.takeHit` and every other health loss (a burn, a `destined` drain, a hazard's damage): while `perk.undying > 0`, health never drops below `CONFIG.abilities.undying.floor` (1 health). A blow that would have killed plays as a stagger (`PS.STAGGER`, the kneel) and emits `abilityPerk` `perk: 'press/undying'` with `saved: true`.
- A fall into a pit still kills (it isn't a blow) through `Player.die()`, as every death does (AGENTS.md rule 6). Nothing is delayed: when the time runs out the body simply has whatever health it has.
- `validate.js`: `press/undying` needs `charge`, `time`; `CONFIG.abilities.undying.floor` above 0.

## Multiplayer

The floor is its holder's own health (the client owns it); the server accepts the press and then accepts that the holder did not die for `time` s plus its slack. Holder only: the flame never protects a teammate, and a fallen teammate is never revived by it.

## Effect

Layered, timed from the press (t = 0) and from a killing blow held (t = k):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.25 | Ignite | A tall flat flame shape, 1.2 m high, rises over the head: hard-edged tongues in 2 tones with dark inner lines, white at the base | `#f2f6fa` base, `#8fb8dc` tongues, `#0b0d12` inner lines |
| 0.25-`time` | Burn | The flame holds, its tongues swaying; 4 sparks a second lift off its tip | `#8fb8dc` |
| k | Flare | The flame flares to 2.2 m in 0.1 s and a hard ring of blue light bursts from the kneeling body along the floor, 3 m across | `#f2f6fa`, `#8fb8dc` ring |
| k-k+0.6 | Hold | The holder kneels with the sword planted; the health bar's sliver burns blue | `#8fb8dc` |
| last 0.6 s | Gutter | The flame shrinks and gutters so its end is readable | to `#2c5f8a` |
| `time`-+0.3 | Out | The flame goes out in a thin curl of smoke | `#9a958c` |

Budget (Rare class): 3 pooled meshes (flame sheet, floor ring, smoke curl) + 4 sparks a second and 16 at a flare (at most 30 alive; 17 on Normal), 1 effect light (blue, low while it burns, a 0.2 s rise at a flare, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.1 s at a flare. At most one flare a blow, so never past 3 Hz. Reduced motion: the flare grows over 0.2 s instead of 0.1 s.

## Sound

`abilityUnbroken` (new, in `js/data/audio.js`): on the press a body of a flame drawn up (pink noise band-passed sweeping 300 Hz to 1.5 kHz, 0.3 s) over a low held note (sine 110 Hz, held `time` s at low gain, a heartbeat-slow tremolo); on a killing blow held a transient of a deep gong (sine 73 Hz with 2.4 and 3.9 partials, driven, 2 ms attack), a body of the flame roaring up (brown noise low-passed at 600 Hz, 0.4 s), a tail of a long ring (1.5 s).

## Camera

`CONFIG.camera.feel.powers.undying = [2, 0.08]`: on a killing blow held only, a wide kick with the kneel.

## Images

- `img/unbroken-1.webp`: a battered swordsman refusing to fall, a tall blue flame of will burning above their head as a killing blow lands.
