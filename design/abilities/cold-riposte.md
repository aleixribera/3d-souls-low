# Cold Riposte

| | |
| --- | --- |
| Id | `cold-riposte` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Mods (a plain number) |
| Trigger | None: always on (no `when`; raises the `riposte` mod, read on every counter) |
| Origin | Kept from js/data/abilities.js: same numbers; text "Ripostes:" becomes "Counters:" (the word the players see, as Riptide's and Pyre's cards); gains `plain: true` and the frost line. |

## Card

**Counters: {riposte} more damage.** (4 words, 24 chars; level I reads "Counters: 15% more damage.")

- Icon (48×48 line drawing): keep the current `ABILITY_ICONS['cold-riposte']`, a sword laid flat with a snowflake above it.
- Hover loop (1.6 s): one stroke: a figure sidesteps (0.3 s), cuts back (0.2 s), the cut line stays and grows small frost ticks along it (0.4 s), which flake away (0.3 s); hold, fade.

## Idea

Counters hit harder. The counter is the skill the fight is about, so this is the plain number that rewards the right thing: it does nothing for a player who only trades blows. Its touch: frost rime crusts along the counter's cut line and flakes away, so every counter you land reads as colder and heavier than a plain blow.

## Data

```js
{ id: 'cold-riposte', name: 'Cold Riposte', rarity: 'common', plain: true,
  text: 'Counters: {riposte} more damage.', mods: true,
  levels: [{ riposte: 0.15 }, { riposte: 0.3 }, { riposte: 0.45 }, { riposte: 0.6 }] },
```

Numbers: a counter does about 2.4-2.6× its attack (about 40 off a light, about 90 off a heavy). Counters land 4-8 times a fight, so level I adds about 25-50 damage a fight and level IV about 100-200. That is below Keen Edge on damage alone, by design: counters also crack the guard, and the cracks are what the Finishing Blow is built from; a plain pick that rewards the skill should not out-damage one that rewards everything.

## Engine work

- None for the number: `riposte` is an existing `ABILITY_MODS` key (`abilityStrike` adds it when `strike.riposte`).
- `plain: true`: the shared rule (offer weight, validate.js check), as Keen Edge.
- The text change only: "Ripostes:" to "Counters:" (the player-facing word; the code keeps `riposte`).
- The frost line: drawing only, on the existing counter cut (js/counter-fx.js draws a thin line where an attack with `cut` lands as a riposte). For a holder of the mod, that line gets a frost crust layer. A counter from an attack without `cut` gets a short crust line of its own across the struck body, along the swing.

## Multiplayer

Unchanged: the server already adds the holder's `riposte` mod to their counters. The frost is drawn by every browser on that player's counter cut (it reads their kit). It touches no teammate.

## Effect

Layered, timed from the counter's hit frame (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Crust | Along the existing counter cut line, a jagged frost crust: a second sprite on the same line, a saw-toothed strip of flat white crystals with a dark ink edge | `#e8ecea` crystals, `#cfc8b6` edge, `#16130f` ink |
| 0.05-0.30 | Grow | The crust grows from the cut's middle to both ends | as above |
| 0.25-0.55 | Flake | 10 hard-edged frost flakes break off the crust and fall, turning | `#e8ecea`, `#8c877b` shade side |
| 0.30-0.55 | Fade | The crust fades with the cut | to transparent |

Budget (Common class): 1 pooled mesh (the crust sprite; the cut is the existing one), 10 particles (6 on Normal), no light, no ribbon, no impact frame. Peak 0.3 s. Reduced motion: no change needed (no flash); fewer flakes, as the counter's own sparks.

## Sound

`abilityFrost` (new, in `js/data/audio.js`): a crisp transient crack (high-passed noise at 5 kHz, 15 ms), a body of crystalline crackle (short noise grains at 3-6 kHz over 0.25 s, thinning), a soft tail hiss (0.2 s, verb 0.3). Played under the counter's own hit sound, quiet (vel 0.45).

## Camera

No camera kick: commons never take one (the counter already has its own).

## Images

- `img/cold-riposte-1.webp`: the swordsman frozen in a counter slash past the boss, the cut line in the air crusted with pale frost and flaking ice.
