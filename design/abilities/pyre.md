# Pyre

| | |
| --- | --- |
| Id | `pyre` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `counter`: a counter lands (the hit in the window after a perfect dodge or a last-blow deflect; 2 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level (6 s, a burn every 0.35 s for 17: the old level II); the pillar erupts with a held beat and the impact frame, in hard flame tongues instead of a soft column. |

## Card

**Counter: fire burns the foe for {time}.** (7 words, 34 chars)

- Icon (48×48 line drawing): a tall pillar of three stacked flame tongues over a short slash line.
- Hover loop (1.6 s): a small figure sidesteps a blow and counters, one clean cut (0.4 s); the floor under the boss glows, then a pillar of fire erupts, the brighter frame (0.2 s); it burns tall with motes rising (0.7 s); it sinks, fade (0.3 s).

## Idea

A counter lights a pillar of fire under the boss that burns for six seconds. The counter is the skill the fight is built on; Pyre makes each one leave the boss standing in a column of flame while you reset, so the reward of a good counter keeps paying while you get back to safety.

## Data

```js
{ id: 'pyre', name: 'Pyre', rarity: 'legendary',
  text: 'Counter: fire burns the foe for {time}.',
  power: { when: 'counter', then: 'pyre' },
  levels: [
    { time: 4, every: 0.35, damage: 17, cooldown: 2 },
  ] },
```

Numbers: 4 / 0.35 = 11 burns of 17 = 187 a counter. A second counter while it burns lights it afresh rather than stacking, so with counters every 10-15 s it adds 187 each: about 1100 over a fight of six counters, 750 for four. Among the strongest triggered legendaries, and the one that most rewards the skill the game is about, without outdamaging the Ultimates.

## Engine work

- `counter/pyre` exists, unchanged (one pillar an enemy; a new counter relights it).
- Drawing (`js/ability-fx.js` `pyre`): the eruption beat, the impact frame, hard-edged flame tongues as flat cards with dark red inner lines.

## Multiplayer

The server sees the counter itself and resolves the pillar on its own enemy. Enemies only; a teammate standing in the pillar is untouched and sees it at 50% translucent. One holder per team.

## Effect

Timed from the counter's hit (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Anticipation | The counter's own hit-stop; a ring of cracks under the boss glows white-hot | `#fff3dc` cracks, `#e59a5c` rim |
| 0.20 | Peak (eruption) | A pillar of fire erupts up through the boss, 2.5 m wide, 9 m tall: solid flame tongues in two tones, dark red inner lines, a black ink outline; 30 sparks thrown out. **The impact frame** | `#fff3dc` core, `#e59a5c` tongues, `#7a1f12` inner lines, `#0b0b0f` ink |
| 0.20-6.20 | Burn | The pillar burns steadily, its tongues licking up; motes rise off it; it follows the boss; its light paints the arena | `#e59a5c`, `#fff3dc` motes |
| 5.70-6.40 | Sink | The pillar shrinks into the floor; the crack ring cools to black | `#e59a5c` to `#2a1a12` |

Budget (Legendary class at the eruption, aura class for the burn): 4 pooled meshes (crack ring, pillar shell, inner tongue cards, scorch decal) + 30 sparks at the eruption, then 30 rising motes (17 on Normal), 2 effect lights at the eruption, 1 steady for the burn (× 0.65 on Normal), no ribbon, 1 impact frame at t = 0.20 (and the 2 s cooldown keeps it from repeating within a second). Peak 0.4 s, then the burn as an aura. The pillar is 50% translucent from the holder's view where it covers the boss's weapon during a wind-up. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

`abilityPyre` kept. New eruption layer: a deep whump (sine 55 to 30 Hz, 0.3 s) and a roar (pink noise band-pass 400 Hz to 1.2 kHz, drive 2, 0.4 s) at t = 0.20; the burn a low crackling bed (filtered noise with random clicks, 6 s, quiet).

## Camera

`CONFIG.camera.feel.powers.pyre = [3.2, 0.16]` kept, at the eruption.

## Images

- `img/pyre-1.webp`: a tall hard-edged pillar of ember fire with dark red inner lines erupting under a boss after a counter slash, motes rising.
- `img/pyre-2.webp`: the pillar of fire seen from far, lighting the dark arena.
