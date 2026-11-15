# Glint

| | |
| --- | --- |
| Id | `glint` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `ready` (new): one of the holder's ability keys becomes full |
| Origin | New |

## Card

**A key fills: your next hit does {damage} more.** (9 words, 39 chars; level I reads "A key fills: your next hit does 40% more.")

- Icon (48×48 line drawing): an upright sword with a sharp four-point star sitting at its tip, a small square key cap beside the hilt.
- Hover loop (1.6 s): a key cap fills (0.4 s), a star glint slides down the blade and sits at its tip (0.3 s), the blade cuts and the star bursts (0.2 s); hold, fade.

## Idea

Each time an ability key fills, the blade glints and your next hit is heavier: a cue and a reward in one. A full key is easy to miss in a busy fight; the glint on the blade tells you without looking at the HUD, and the heavier next hit rewards answering at once (a heavy or a counter makes the most of it).

## Data

```js
{ id: 'glint', name: 'Glint', rarity: 'common',
  text: 'A key fills: your next hit does {damage} more.',
  perk: { when: 'ready', then: 'empower' },
  levels: [{ damage: 0.4 }, { damage: 0.55 }, { damage: 0.7 }, { damage: 0.85 }] },
```

Numbers: keys fill about 3-6 times a fight with one or two key abilities held. The next hit is 16 (a light) to about 61 (a full heavy) or 40-90 (a counter); level I adds 6-36 to it, so about 20-140 a fight, level IV about 40-300: in line with the other effect commons. It does nothing for a kit with no key ability. A second fill before the hit does not stack.

## Engine work

- New `when: 'ready'`: fired in `abilityGain` when a held key's charge reaches its ability's `charge` from below (once per fill; a key that stays full does not fire again).
- Reuses `then: 'empower'` (Vengeance's and Patience's: the next landed blow does `damage` more). New pair `ABILITY_PERKS['ready/empower'] = ['damage']`. Perk clocks: `glint` (0 or 1); `abilityStrike` spends it on the next landed blow like `hurt/empower`, with no time limit; cleared at the fight's end.
- Emits `abilityPerk` `{ perk: 'ready/empower' }` on the fill (the glint on the blade); the hit already emits `{ perk: 'empower' }`, whose cue (ability-fx.js) takes the colour of the rarity of the ability that empowered it (`picked[rarity]`), bone here.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The key charge is counted in the holder's browser and on the server; `abilityStrike` runs where the enemies are owned. So the server detects the fill from its own count and spends the empower on the next blow it sees; the browser detects the fill from its count for the glint only. The two counts can differ by a point (a refused claim), so the glint can lead the server by a blow at worst: the damage is always the server's. It touches no teammate.

## Effect

Layered, timed from the key filling (t = 0); the spend at the empowered hit (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.25 | Slide | A sharp four-point star glint (0.3 m, hard thin points, a white core) slides from the hilt down the blade | `#f4f1e8` core, `#cfc8b6` points, `#16130f` hairline edge |
| 0.25 on | Sit | It sits at the blade's tip, turning slowly (no brightness flicker), until the next hit | as above |
| t' 0.00-0.20 | Burst | The star bursts on the struck enemy: 8 short bone-white streaks | `#f4f1e8` heads, `#8c877b` tails |

Budget (Common class): 1 pooled mesh (the star sprite), 8 particles (4 on Normal), no light, no ribbon, no impact frame. Peak 0.25 s at the slide, 0.2 s at the burst. Reduced motion: the star sits still instead of turning.

## Sound

`abilityGlint` (new, in `js/data/audio.js`): a bright ting (sine 2.8 kHz with a partial at 1.5×, 5 ms attack, decaying over 0.25 s), no other layer, vel 0.4, the holder's only. The empowered hit reuses `abilityEmpower` (a low thump under a hard ring) at pitch 1.15 and vel 0.55.

## Camera

No camera kick: commons never take one. camera-feel.js's `perkFov` skips this common's `abilityPerk` (both the fill and the empowered hit).

## Images

- `img/glint-1.webp`: close on a sword held ready, a sharp four-point star glint sliding down the blade to sit at its tip.
