# Fourfold

| | |
| --- | --- |
| Id | `fourfold` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered perk (no key) |
| Trigger | `castUltimate` (new): the holder's key-4 ability fires |
| Origin | New |

## Card

**Your Ultimate refills your other keys.** (6 words, 38 chars)

- Icon (48×48 line drawing): four small square key caps in a row, the fourth drawn heavy, three curved threads running from it back into the other three.
- Hover loop (1.6 s): the card's four key caps sit at the bottom, 1-3 dim, 4 full (0.2 s); cap 4 fires and a small figure's big strike bursts above (0.3 s); the burst splits into three ember threads that slam into caps 1, 2 and 3, the brighter frame as they land (0.2 s); the four caps flare full together (0.5 s); dim back (0.4 s).

## Idea

The Ultimate's light doesn't end: it splits into three ember threads that run back into the holder's arms, and keys 1, 2 and 3 stand full again. Four techniques back to back: the Ultimate, then the strike, the guard and the summon while the boss is still reeling. It does nothing on its own; it turns the biggest moment of the fight into the first of four, and asks the player to plan the chain.

## Data

```js
{ id: 'fourfold', name: 'Fourfold', rarity: 'legendary',
  text: 'Your Ultimate refills your other keys.',
  power: { when: 'castUltimate', then: 'refillKeys' },
  levels: [
    { share: 1 },
  ] },
```

Numbers: keys 1-3 fill in about 12-20 s on their own (every key gains from every blow), and the Ultimate comes every 35-45 s, so each cast gives one extra press of each key the holder has: a rare strike (about 80-120), a guard (a heal or a stance, about 60-100 of worth) and a summon (about 100-150), so 250-350 a cast, 500-1000 a fight at two or three Ultimates. On the bar, but only for a holder with a key-4 ability; without one it does nothing, so the offer leaves it out for a player without one (an offer filter on the held keys, built like `party`).

## Engine work

- New `when: 'castUltimate'`: fired when the holder's `ultimate`-key ability fires (`abilityPowers.trigger('press', …)` for a power whose ability has `key: 'ultimate'`, after the press is accepted), with no enemy needed (`ctx`: `{}`; not in `ON_ENEMY`).
- New `then: 'refillKeys'`, a perk (`ABILITY_PERKS`): for each of `strike`, `guard` and `summon` the holder holds, set its charge to at least `share` of that ability's `charge` (never lower). `ABILITY_POWERS['castUltimate/refillKeys'] = ['share']`. The Ultimate's own key is spent as usual.
- Order: the refill lands 0.3 s after the press (as the threads reach the caps), so the strike key can't fire in the same frame as the Ultimate and the four stay a sequence.
- `validate.js`: `refillKeys` needs `share` (a share, above 0 and at most 1).

## Multiplayer

The server already counts every key's charge and accepted the Ultimate's press itself, so it fires the refill on its own count (no new claim) and sends it in the `abilityPower` event; the browser sets its caps from it. Holder only: a teammate's keys are never touched. One holder per team.

## Effect

Timed from the Ultimate's press (t = 0; the Ultimate's own effect plays as usual):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Anticipation | The Ultimate's own cast pose; a ring of ember light gathers round the holder's waist | `#e59a5c` ring |
| 0.20-0.30 | Split | The ring tears into three ember threads (flat ribbons, white-hot core, black ink edge) that whip up and wrap round the holder's arms and blade | `#fff3dc` core, `#e59a5c` edge, `#0b0b0f` ink |
| 0.30 | Peak (keys full) | The threads sink in; the holder's silhouette flares with an ember rim for a breath; on the HUD three threads slam into key caps 1-3 and each fills in one sweep with a short ember ring. No impact frame: the Ultimate's is the moment's one | `#e59a5c` rim, `#fff3dc` cap sweep |
| 0.30-1.20 | Fade | The rim fades from the hands up; caps 1-3 keep a thin ember edge until each is pressed | `#e59a5c` to transparent |

Budget (Legendary class, kept small to sit inside the Ultimate's): 3 pooled meshes (waist ring, the three threads as one ribbon mesh, rim shell) + 18 sparks off the threads (10 on Normal), no effect light (the Ultimate owns both), 1 ribbon (the threads), no impact frame of its own. Peak 0.1 s, on the holder, never near the boss's weapon. Reduced motion: the rim fades in over 0.2 s instead of flaring; the HUD sweep stays.

## Sound

New `abilityFourfold`: under the Ultimate's own cast, three short rising tones landing one after another at 0.30 s, 0.35 s and 0.40 s (sine at 392, 494 and 587 Hz, 0.15 s each, a soft click on each attack) that ring together as a chord (0.6 s, light reverb): the three keys catching.

## Camera

No kick of its own: the Ultimate's is the moment.

## Images

- `img/fourfold-1.webp`: the swordsman firing a huge technique while three ember orange threads of light split off from it and wrap around their arms, ready for the next three techniques.
- `img/fourfold-2.webp`: four techniques chained back to back: a strike, a guard, a summon and an ultimate in one sweeping panel.
