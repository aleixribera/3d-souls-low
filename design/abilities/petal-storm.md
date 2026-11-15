# Petal Storm

| | |
| --- | --- |
| Id | `petal-storm` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `finisher`: your Finishing Blow lands (its cut lines open) |
| Origin | New |

## Card

**Finishing Blow: a storm of petals cuts all near.** (9 words, 48 chars)

- Icon (48×48 line drawing): a spiral of five small pointed petal shapes whirling out from a centre dot.
- Hover loop (1.8 s): a small figure flashes through a boss leaving cut lines (0.5 s), the lines open and a spiral of blue petal blades whirls out from the boss and cuts a second boss beside it (0.7 s); fade.

## Idea

When the Finishing Blow's lines open, a storm of blade-sharp petals bursts out of the boss and cuts everything near. On one boss it is a little more damage at the best moment; on a two-boss fight it is the reason to take it, because the Finishing Blow now reaches the second boss too.

## Data

```js
{ id: 'petal-storm', name: 'Petal Storm', rarity: 'rare',
  text: 'Finishing Blow: a storm of petals cuts all near.',
  power: { when: 'finisher', then: 'petals' },
  levels: [
    { damage: 80, radius: 5 },
    { damage: 110, radius: 5.5 },
    { damage: 140, radius: 6 },
  ] },
```

Numbers: 2-4 Finishing Blows a fight, 80-140 to each enemy within 5-6 m of the finished one: 160-560 a fight on one boss, nearly double on two. In line with Riptide; it comes only after two counters and the Finishing Blow.

## Engine work

- New power `finisher/petals`: ['damage', 'radius'] in ABILITY_POWERS. New `when: 'finisher'` for powers: abilityPowers.trigger fires it from the `finisher` event (js/finisher.js), where the enemies are owned, with `ctx.enemy` the finished one. `petals` wounds every enemy within `radius` m of it, the finished one too if it is still alive and can be hurt (wound already skips one held or between phases).
- `validate.js`: `petals` needs `damage`, `radius` (from ABILITY_POWERS).

## Multiplayer

The server resolves the Finishing Blow already, so it fires the petals itself; no claim. Enemies only: a teammate inside the radius sees the petals pass through them. Every browser draws the storm.

## Effect

Layered, timed from the cut lines opening (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Burst | A flat ring of light at the boss's middle, 1 m, opening the storm | `#f2f6fa` core, `#8fb8dc` edge |
| 0.05-0.90 | Storm | 60 hard little petal slivers whirling out from the boss in a two-armed spiral to `radius`, each a flat pointed blade, 2-tone with an ink edge | `#cfe2f2` face, `#8fb8dc` edge, `#0e1218` ink |
| 0.05-0.70 | Wind | One spiral ribbon tracing the storm's leading arm | `#8fb8dc`, to transparent |
| 0.70-1.20 | Settle | The petals slow, tumble and fall flat, fading on the floor | `#cfe2f2` to transparent |

Budget (Rare class): 2 pooled meshes (burst ring, the instanced petal mesh) + 60 petals (33 on Normal), 1 effect light (blue, 0.5 s, × 0.65 on Normal), 1 ribbon, no impact frame (the Finishing Blow keeps its own frozen frame). Peak 0.9 s. The storm goes 50% translucent within 1.5 m of a second boss's weapon. Reduced motion: the spiral spins at half speed.

## Sound

`abilityPetals` (new, in `js/data/audio.js`): a transient of a sharp paper-cut slice (white noise high-passed at 4 kHz, 30 ms), a body of a whirling rush (band-passed noise sweeping 800 to 2400 Hz over 0.6 s, with a 6 Hz tremolo for the whirl), a tail of soft fluttering (pink noise, 0.4 s). Played at the burst.

## Camera

`CONFIG.camera.feel.powers.petals = [1.4, 0.04]`: a small widening as the storm opens, after the Finishing Blow's own camera.

## Images

- `img/petal-storm-1.webp`: an explosion of pale blue blade-sharp petals spiralling outward from a boss as a finishing blow lands, the swordsman in a held pose.
