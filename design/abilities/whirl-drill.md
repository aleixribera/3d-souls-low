# Whirl Drill

| | |
| --- | --- |
| Id | `whirl-drill` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A drill of wind grinds the boss.** (7 words, 32 chars)

- Icon (48×48 line drawing): a narrow cone wound with a spiral line, its point to the right, three short spark strokes off the point.
- Hover loop (1.8 s): a small figure thrusts (0.2 s), a spiral cone of wind leaves the sword tip and drives into the boss (0.2 s), grinding with sparks spitting off (1.0 s); fade.

## Idea

A spiral of tiny wind blades forms at the sword tip and is driven into the boss, where it grinds on its own for a second. The player is free the moment it leaves the blade: thrust, then get back to the fight while it works.

## Data

```js
{ id: 'whirl-drill', name: 'Whirl Drill', rarity: 'rare', key: 'strike',
  text: 'A drill of wind grinds the boss.',
  power: { when: 'press', then: 'drill' },
  levels: [
    { charge: 16, time: 1.2, every: 0.1, damage: 8 },
    { charge: 15, time: 1.3, every: 0.1, damage: 9 },
    { charge: 14, time: 1.4, every: 0.1, damage: 10 },
  ] },
```

Numbers: `time` / `every` grinds of `damage`: 12 × 8 = 96, 13 × 9 = 117, 14 × 10 = 140, so 6, 7.8 and 10 damage a point. Above Fire Burst because it is spread over more than a second (a boss that dies or goes untouchable between phases wastes the rest), and its small blows never stagger.

## Engine work

- New power `press/drill`: ['charge', 'time', 'every', 'damage'] in ABILITY_POWERS. It runs like `blades`: a running entry on the target, `time / every` grinds, each a wound of `damage`. It reaches the target CONFIG.abilities.drill.lead (0.15 s) after the press.
- `validate.js`: CONFIG.abilities.drill { lead from 0 to 0.5 }.

## Multiplayer

The browser claims the press; the server checks the charge and runs the grinds on its own enemy. Enemies only. Every browser draws it, its grinds following the boss.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Form | A cone of tightly wound wind blades forming at the sword tip and flying to the boss's chest | `#cfe2f2` face, `#8fb8dc` edge, `#0e1218` ink |
| 0.15 to time | Grind | The cone lodged in the boss, 1.2 m long, spinning fast, its blades hard-edged in two tones; it follows the boss's body | as above |
| 0.15 to time | Sparks | 3 hard spark streaks spat off the cone's mouth each 0.1 s grind | `#f2f6fa` |
| time to +0.25 | Burst | The cone unwinds into 8 flat blade flakes and is gone | `#8fb8dc` |

Budget (Rare class): 2 pooled meshes (the cone, a small hit ring at its point) + up to 42 sparks over the grind and 8 flakes (28 on Normal), 1 effect light (blue, held for the grind, × 0.65 on Normal), no ribbon, no impact frame. Peak 1.4 s. The cone goes 50% translucent within 1 m of the boss's weapon. Reduced motion: the spin slows to half (no strobing blades).

## Sound

`abilityDrill` (new, in `js/data/audio.js`): a transient of a sharp air puncture (white noise high-passed at 3 kHz, 30 ms), a body of a shrieking grind (saw 220 Hz with FM ratio 1.5, band-passed at 2.5 kHz, held for `time`, with a soft 10 Hz grit), a tail of a falling whine (sine 1.2 kHz to 400 Hz, 0.3 s).

## Camera

`CONFIG.camera.feel.powers.drill = [-1.0, 0.02]`: a small pull in as it lodges.

## Images

- `img/whirl-drill-1.webp`: the swordsman driving a cone-shaped spiral drill of tightly wound blue wind blades from their sword tip into a boss, sparks spitting off.
