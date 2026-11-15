# Iron Mercy

| | |
| --- | --- |
| Id | `iron-mercy` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels; a crate reward |
| Kind | Triggered (no key) |
| Trigger | `parry`: you deflect a blow, at most once every `cooldown` s |
| Origin | Kept from js/data/abilities.js: the same perk, text, numbers and crate; new look (the cross glint) |

## Card

**Deflect: heal {heal}, once per {cooldown}.** (6 words, 28 chars)

- Icon (48×48 line drawing): two crossed blades with a small four-pointed cross glint at their meeting point.
- Hover loop (1.4 s): a small figure deflects a blow in a burst of sparks (0.3 s), a blue cross glint shines in the sparks and sinks into its chest (0.5 s); fade.

## Idea

A crate reward: deflects heal a little. A deflect build can live without flasks, and the glint at each deflect tells the player the heal came from skill.

## Data

```js
{ id: 'iron-mercy', name: 'Iron Mercy', rarity: 'rare', crate: true,
  text: 'Deflect: heal {heal}, once per {cooldown}.',
  perk: { when: 'parry', then: 'heal' },
  levels: [
    { heal: 0.06, cooldown: 3 },
    { heal: 0.09, cooldown: 2.5 },
    { heal: 0.12, cooldown: 2 },
  ] },
```

Numbers: a deflecting player turns 10-25 blows a fight; the cooldown lets about half of them heal. 5-12 heals of 6-12%: about 30-140% of the bar a fight, only for players who deflect.

## Engine work

- None for the rule: `parry/heal` exists (`perk.mercy`).
- New look in js/ability-fx.js for the `parry/heal` cue: the cross glint below in place of the mote burst.

## Multiplayer

The heal is the client's own. Only the holder heals.

## Effect

Layered, timed from the deflect (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Glint | A four-pointed cross glint in the deflect sparks, 0.6 m, hard edges, white core | `#f2f6fa` core, `#8fb8dc` edge, `#0e1218` ink |
| 0.15-0.45 | Sink | The glint shrinks and travels into the player's chest | as above |
| 0.40-0.60 | Ring | A small heal ring at the feet, 0.4 to 1.3 m | `#8fb8dc` to transparent |
| 0.40-0.70 | Flakes | 8 small flakes rising off the chest | `#cfe2f2` |

Budget (Rare class): 2 pooled meshes (glint, ring) + 8 particles (5 on Normal), no effect light (the deflect has its own spark light), no ribbon, no impact frame. Peak 0.45 s. Reduced motion: no change needed (no flash).

## Sound

`abilityHeal` (kept, pitch 1.2), started as the glint reaches the chest, with a tiny bright ting at the glint (sine 2.1 kHz, 0.15 s).

## Camera

No camera kick: the deflect already punches the view. No `powers` entry.

## Images

- `img/iron-mercy-1.webp`: a deflect's burst of sparks with a cool blue cross-shaped glint in its centre sinking into the swordsman's chest.
