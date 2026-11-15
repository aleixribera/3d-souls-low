# Ember Lick

| | |
| --- | --- |
| Id | `ember-lick` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `stringEnd` (new): the last blow of a full light string (the fourth light hit) lands on an enemy, unblocked |
| Origin | New |

## Card

**Fourth light hit: a lick of flame.** (7 words, 34 chars)

- Icon (48×48 line drawing): four short curved cut strokes in a row, the last one trailed by a single flame tongue.
- Hover loop (1.6 s): a small figure swings four quick cuts (0.8 s, a tick on each), a flame tongue follows the fourth arc (0.25 s) and is gone; hold, fade.

## Idea

The last cut of a full light string bursts into one short tongue of fire. Newcomers drop strings halfway; this teaches finishing them, and it gives the string a rhythm you can hear and see: three cuts, then the fourth with a lick of flame. It never fires on its own and asks nothing but the full string.

## Data

```js
{ id: 'ember-lick', name: 'Ember Lick', rarity: 'common',
  text: 'Fourth light hit: a lick of flame.',
  power: { when: 'stringEnd', then: 'lick' },
  levels: [{ damage: 10 }, { damage: 13 }, { damage: 16 }, { damage: 19 }] },
```

Numbers: the fourth light hit does 20, so level I adds half of it again. Full strings land 8-12 times a fight: about 80-120 more at level I and 150-230 at level IV, in line with Keen Edge for a player who finishes strings. No cooldown: the string itself (four blows, about 1.5 s) spaces it.

## Engine work

- New `when: 'stringEnd'`: a blow of an attack marked `stringEnd: true` lands unblocked. The mark is a new attack field in js/data/player.js, set on `light4` only (content opts in; engine code never names the attack). `ctx`: `{ enemy, strike }`. validate.js: `stringEnd` is only `true`, on a player attack.
- New `then: 'lick'`: `damage` to that enemy as a power's blow (the `flare`/`spark` case in `fire`). Add `lick` to `ON_ENEMY`. `ABILITY_POWERS['stringEnd/lick'] = ['damage']`.
- Drawing: a new `lick` case in ability-fx.js, along the struck attack's swing arc (the event carries the holder's facing).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The server sees every landed blow with its attack id, so no claim: in `Simulation.hit`, a landed `stringEnd` attack triggers `stringEnd` for the striker, as `fullHeavy` does. It hits that enemy only. Everyone sees the flame.

## Effect

Layered, timed from the fourth hit's landing (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Tongue | One flat, hard-edged flame tongue following the fourth cut's arc (a curved quad on the swing's plane, 1.4 m long), pale body with two dark red inner lines, bone outer edge, dark ink outline | `#ece2cc` body, `#cfc8b6` edge, `#7a1e14` inner lines, `#16130f` outline |
| 0.00-0.10 | Lick | It sweeps along the arc behind the blade, curling up at its tip | as above |
| 0.05-0.25 | Embers | 8 short ember streaks flick off its tip, rising | `#f4f1e8` heads, `#7a1e14` tails |
| 0.10-0.25 | Out | The tongue thins from its base and is gone | to transparent |

Budget (Common class): 1 pooled mesh (the tongue), 8 particles (4 on Normal), no light, no ribbon, no impact frame. Peak 0.1 s, gone by 0.25 s. Reduced motion: no change needed (no flash).

## Sound

Reuse `abilityFlare` (Counterflame's burst of fire) at pitch 1.3 and vel 0.5, played on the hit: a shorter, lighter whoomp under the fourth cut's own sound.

## Camera

No camera kick: commons never take one.

## Images

- `img/ember-lick-1.webp`: the swordsman finishing a four-hit sword string, the final arc followed by a single hard-edged tongue of flame with dark red inner lines.
