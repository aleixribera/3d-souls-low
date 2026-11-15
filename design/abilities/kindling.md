# Kindling

| | |
| --- | --- |
| Id | `kindling` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `parry`: the holder deflects a blow |
| Origin | New |

## Card

**Deflect: every key gains {charge} charge.** (6 words, 34 chars; level I reads "Deflect: every key gains 1 charge.")

- Icon (48×48 line drawing): a small clash spark at the bottom with four thin lines rising from it to four small squares in a row.
- Hover loop (1.5 s): a blade meets a blow (0.1 s), a spark splits into four threads that rise (0.4 s) to four key caps, each flaring once in turn (0.3 s); hold, fade.

## Idea

Deflects feed the four ability keys more. The keys are where the techniques live, and they fill from playing well; this tilts that toward the deflect, so a player who deflects fires techniques sooner. The spark that leaps from the clash to the key caps on the HUD connects the two in the player's head: deflect, and your technique is nearer.

## Data

```js
{ id: 'kindling', name: 'Kindling', rarity: 'common',
  text: 'Deflect: every key gains {charge} charge.',
  perk: { when: 'parry', then: 'keys' },
  levels: [{ charge: 1 }, { charge: 2 }, { charge: 3 }, { charge: 4 }] },
```

Numbers: a deflect already gives every key 3 points; a rare key needs 12-20 and an Ultimate 36-46. Level I makes a deflect worth 4 (a third more); level IV makes it 7. With 6-15 deflects a fight, level I adds 6-15 points to each key held (about half a rare key), level IV 24-60 (one to three more rare fires). Level IV is strong for a common when the kit holds several keys: watch it in play. It does nothing for a kit with no key ability.

## Engine work

- Reuses the perk `when: 'parry'`. New `then: 'keys'`: `ABILITY_PERKS['parry/keys'] = ['charge']`, run with the existing `abilityGain(kit, st, charge)` on the deflect, after the deflect's own gain. Emits `abilityPerk` `{ perk: 'parry/keys' }` (only when the kit holds a key).
- `charge` here is points, not a key's cost: it shares the name with pressed abilities' `charge` (unit `n`, whole), but a key's cost is read only through `kit.pressed`, which holds only abilities with a `key`, so no clash.
- The HUD: the key caps flare on the `abilityPerk` event (js/hud.js), the held keys only.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The key charge is counted on both sides: the holder's browser and the server (which checks presses against its own count). The server sees the deflect itself (`Simulation`'s parry claim), so it adds the `charge` to that person's count in the same place it adds `CONFIG.abilities.press.gain.deflect`. It touches no teammate's keys.

## Effect

Layered, timed from the deflect (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Spark | A small hard four-point spark at the clash point (0.4 m) | `#f4f1e8` core, `#cfc8b6` points |
| 0.05-0.40 | Threads (HUD) | On the HUD, from the player's screen position, one thin bone line per held key leaps up and arcs to that key cap, drawn on like a brush stroke | `#cfc8b6` line, `#16130f` hairline edge |
| 0.40-0.60 | Flare (HUD) | Each reached key cap's rim brightens once and settles, the caps 0.05 s apart | `#f4f1e8` to the cap's colour |

Budget (Common class): 1 pooled mesh (the spark sprite; the threads and flares are HUD strokes), 0 particles, no light, no ribbon, no impact frame. Peak 0.2 s at the flares. A string's blows can be deflected 0.3 s apart, so the flares play at most once every 0.4 s (`VIS.abilityFx.small.keysGap`); a deflect inside that gap adds its points without a second flare. Reduced motion: the threads appear whole and fade instead of leaping.

## Sound

`abilityKeys` (new, in `js/data/audio.js`; Tithe reuses it): four quick soft ticks rising (sine blips at 880, 990, 1110 and 1320 Hz, 25 ms each, 40 ms apart), no transient or tail beyond them (vel 0.35, the holder's only), one tick per held key.

## Camera

No camera kick: commons never take one (the deflect has its own). camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/kindling-1.webp`: a sword deflect throwing a spark that splits into four small glowing threads flying upward, each lighting a numbered rune.
