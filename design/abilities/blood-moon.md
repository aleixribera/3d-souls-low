# Blood Moon

| | |
| --- | --- |
| Id | `blood-moon` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `low`: the holder drops to a third of their health or below (once a fight) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level (12 s, 45% more damage, 35% drained: the old level II); the rising moon gets a held beat and the impact frame, and the slashes take ember edges. |

## Card

**Low health: for {time}, hits do more and heal.** (9 words, 41 chars)

- Icon (48×48 line drawing): a large full circle low behind a small kneeling figure, two drops falling from the figure's blade.
- Hover loop (2.0 s): a small figure takes a blow and the health line under it drops low (0.3 s); it kneels a beat as a huge moon rises behind it, the brighter frame as the moon clears the horizon (0.5 s); it stands and cuts three times, each cut a red slash and the health line climbing (0.9 s); the moon sets, fade (0.3 s).

## Idea

Near death a red moon rises over you: for twelve seconds your blows cut deeper and drink back the health they take. It is the comeback legendary, once a fight, the moment a run that was slipping turns: the arena goes crimson, you stand up, and you fight your way back up your own bar.

## Data

```js
{ id: 'blood-moon', name: 'Blood Moon', rarity: 'legendary',
  text: 'Low health: for {time}, hits do more and heal.',
  power: { when: 'low', then: 'bloodMoon', once: true },
  levels: [
    { below: 0.33, time: 12, damage: 0.45, drain: 0.35 },
  ] },
```

Numbers: 12 s × 30 a second × 1.45 = about 520 dealt (160 of it the moon's), and 35% of it drunk back, about 180 health, near a full flask. Once a fight. Its value is the health more than the damage: it decides whether the holder lives through the bad moment. A legendary-sized swing, but only when things are going wrong.

## Engine work

- `low/bloodMoon` exists, unchanged (`perk.moon`, `perk.moonV`; the damage in `abilityStrike`, the drink in `abilityLanded`).
- Drawing (`js/ability-fx.js` `bloodMoon`, `slash`): the held beat and the impact frame at the rise, ember edges on the slashes. The crimson grade reuses World of Ink's grade uniform (a tint instead of ink), only round the holder.

## Multiplayer

The client claims `low` (it already does); the server checks the health it knows and runs the moon on its own copy of the holder's perk clocks. It acts on its holder alone: the moon and the crimson tint are drawn round the holder (12 m) and at 50% for teammates inside it; nobody else hits harder or heals. One holder per team.

## Effect

Timed from the health drop (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Anticipation | A heartbeat: the world dims 20% and goes a shade red; the holder's scarf lifts on a wind from nowhere | `#9e1b1b` tint |
| 0.20-0.60 | Rise | A huge red moon rises behind the holder over the arena's edge, flat-shaded with a black ink rim and two darker crater tones | `#c8323a` face, `#9e1b1b` craters, `#e59a5c` rim light, `#0b0b0f` ink |
| 0.60 | Peak (the moon clears the horizon) | The arena tints crimson round the holder; a red aura snaps on round their body. **The impact frame** | `#c8323a` / `#0b0b0f` |
| 0.60-12.0 | Moon | The moon hangs over the holder's side of the arena; the aura burns in hard red flame tongues on the shoulders and blade; each blow the holder lands leaves a flat red slash with an ember edge on the cut line, and a thin red thread flows from the struck enemy back to the holder | `#c8323a` aura, `#9e1b1b` inner lines, `#e59a5c` slash edge |
| 11.0-12.0 | Wane | The moon sinks, the aura thins, the tint lifts | to the scene's colours |

Budget (Legendary class at the rise, aura class for the 12 s): the rise 5 pooled meshes (moon disc, moon rim, aura shell, scarf-wind card, tint) + 30 rising red motes, 2 effect lights (the moon's red fill; the rise; × 0.65 on Normal), 1 impact frame at t = 0.60, peak 0.6 s. The hold: 4 meshes (moon, aura, slash pool head reused, drain thread), 30 particles (17 on Normal), 1 light (the moon's fill, steady), no flash. The tint never reaches the boss's weapon glows (they skip the grade). Reduced motion: the impact frame becomes a 30% darken, no shake, the tint fades in over 0.3 s.

## Sound

`abilityMoon` kept (a low drone swelling, a slow heartbeat, a thin choir high above). New on each blow while it lasts: `abilityDrink`, a short wet red hiss (band-passed noise at 1.5 kHz, 60 ms) under the hit sound, quiet. At the wane, the heartbeat slows and stops.

## Camera

`CONFIG.camera.feel.powers.bloodMoon = [3, 0.12]` kept, at the rise. No kicks on the blows.

## Images

- `img/blood-moon-1.webp`: a huge blood-red moon rising behind a wounded swordsman, the arena tinted crimson, a red aura, red ember slashes on a boss.
- `img/blood-moon-2.webp`: silhouette of the swordsman against the enormous red moon.
