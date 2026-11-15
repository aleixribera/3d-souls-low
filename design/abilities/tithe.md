# Tithe

| | |
| --- | --- |
| Id | `tithe` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `finisher`: the holder's Finishing Blow opens its cuts |
| Origin | New |

## Card

**Finishing Blow: every key gains {charge} charge.** (7 words, 41 chars; level I reads "Finishing Blow: every key gains 4 charge.")

- Icon (48×48 line drawing): three short crossing cut lines at the bottom with four small dots rising from them toward four small squares in a row.
- Hover loop (1.8 s): three cut lines open across a shape (0.4 s), four small motes rise from it (0.5 s) and fly to four key caps, which flare in turn (0.3 s); hold, fade.

## Idea

The Finishing Blow pays into every key, so a big moment chains straight into a technique: crack, crack, Finishing Blow, and your key is full. It makes the fight's best moment the start of the next one. The four motes that rise out of the boss and into you show where the points went.

## Data

```js
{ id: 'tithe', name: 'Tithe', rarity: 'common',
  text: 'Finishing Blow: every key gains {charge} charge.',
  perk: { when: 'finisher', then: 'keys' },
  levels: [{ charge: 4 }, { charge: 6 }, { charge: 8 }, { charge: 10 }] },
```

Numbers: a Finishing Blow already gives every key 6 points; a rare key needs 12-20. Level I makes it worth 10, level IV 16: at level IV a Finishing Blow alone nearly fills a rare key. Finishing Blows come 1-3 times a fight solo, so level I adds 4-12 points to each key a fight and level IV 10-30. The levels are larger than Kindling's because the trigger is far rarer. It does nothing for a kit with no key ability.

## Engine work

- Reuses the perk `when: 'finisher'` (Grave Feast's `finisher/heal`). Reuses Kindling's `then: 'keys'` (`abilityGain` with `charge`): `ABILITY_PERKS['finisher/keys'] = ['charge']`. Emits `abilityPerk` `{ perk: 'finisher/keys' }` (only when the kit holds a key).
- `charge` is points here, as Kindling's.
- The HUD key caps flare on the event, as Kindling.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The key charge is counted in the holder's browser and on the server. The server grants the Finishing Blow itself (it counts the cracks), so it adds the `charge` to the striker's count where it adds `CONFIG.abilities.press.gain.finisher`. Only the striker's keys gain: a teammate who cracked the guard earlier gets nothing from it. It touches no teammate.

## Effect

Layered, timed from the cuts opening (t = 0, the `finisher` event), so it plays after the frozen frame rather than over it:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.15 | Motes | Four bone-white motes (small hard-edged four-point stars, 0.15 m) rise from the foe's chest, one per key slot (dimmer for an empty slot) | `#f4f1e8` core, `#cfc8b6` points, `#16130f` hairline edge |
| 0.15-0.55 | Flight | They arc up and curve into the holder's chest, each a short bone trail behind it | as above, trail `#cfc8b6` |
| 0.55-0.75 | Flare (HUD) | Each held key cap's rim brightens once, 0.05 s apart | `#f4f1e8` to the cap's colour |

Budget (Common class): 1 pooled mesh (the motes, one instanced sprite set of 4), 0 particles beyond the 4 motes, no light, no ribbon, no impact frame. Peak 0.4 s of flight. Reduced motion: no change needed (no flash; the motes fly as normal).

## Sound

Reuse `abilityKeys` (Kindling's four rising ticks) at pitch 0.85 and vel 0.4, timed to the motes arriving (t = 0.55), under the Blow's own sounds.

## Camera

No camera kick: commons never take one (the Finishing Blow has its own push). camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/tithe-1.webp`: after a multi-cut finishing blow, four bone-white glowing motes rising from the staggered boss and flowing into the swordsman.
