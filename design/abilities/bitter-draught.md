# Bitter Draught

| | |
| --- | --- |
| Id | `bitter-draught` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `flask`: the holder drinks a flask |
| Origin | New |

## Card

**Flask: your next {hits} hits burn.** (6 words, 29 chars; level I reads "Flask: your next 3 hits burn.")

- Icon (48×48 line drawing): a round flask beside an upright sword with three small flame tongues along its blade.
- Hover loop (1.8 s): a flask tips (0.3 s), three small flames catch along a blade (0.3 s), the blade cuts three times and one flame goes out with each (0.8 s); hold, fade.

## Idea

Drinking a flask lights the blade for a few hits. Healing is the moment a newcomer backs off and loses the thread; this makes it a reason to go straight back in. The flames on the blade are the count: you can see how many burning hits are left without any number on the HUD.

## Data

```js
{ id: 'bitter-draught', name: 'Bitter Draught', rarity: 'common',
  text: 'Flask: your next {hits} hits burn.',
  power: { when: 'flask', then: 'burnHits' },
  levels: [
    { hits: 3, damage: 9 },
    { hits: 4, damage: 9 },
    { hits: 5, damage: 9 },
    { hits: 6, damage: 9 },
  ] },
```

Numbers: each burning hit adds 9 (about half a light hit). A flask lights 3-6 hits: 27-54 per flask. With 2-4 flasks a fight that is about 55-110 more at level I and 110-215 at level IV. A new flask renews the count; it never stacks.

## Engine work

- Reuses `when: 'flask'` (Ember Twin's).
- New `then: 'burnHits'`: sets a count of `hits` burning blows on the holder (perk clocks: `burn`, `burnV`; renewed, not added, by another flask; cleared at the fight's end). Each landed, unblocked blow of the holder's own while `burn` > 0 wounds that enemy for `damage` as a power's blow and counts `burn` down, emitting `abilityPower` with `strike` (its number) for the drawing. `ABILITY_POWERS['flask/burnHits'] = ['hits', 'damage']`.
- `hits` here is a count of blows (unit `n`, whole), as Bloodthirst's.
- Drawing: a new `burnHits` case in ability-fx.js: the flames on the holder's blade, one fewer on each `strike` event.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The flask is already a claim (`ABILITY_CLAIMS` has `flask`; the server checks the drinking pose). The server keeps the burn count on that person's perk clocks and spends it on the landed blows it sees, so each burn is resolved where the enemies are owned. It hits only the enemies the holder strikes. Everyone sees the flames on that player's blade.

## Effect

Layered, timed from the drink (t = 0); each burning hit at its hit frame (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Catch | Small flat flame tongues catch along the blade from hilt to tip, one per burning hit (one pooled strip mesh on the blade, its tongues masked by the count), pale bodies with dark red inner lines, bone edges, dark ink outlines | `#ece2cc` body, `#cfc8b6` edge, `#7a1e14` inner lines, `#16130f` outline |
| 0.30 on | Hold | They flicker gently in shape (no brightness flicker) until spent | as above |
| t' 0.00-0.20 | Burn | On the struck enemy, a small hard-edged flame burst and 6 ember streaks | `#ece2cc` burst, `#7a1e14` streak tails |
| t' 0.00-0.15 | Out | The tongue nearest the tip shrinks and goes out | to transparent |

Budget (Common class): 2 pooled meshes (the blade strip, the burst sprite), 6 particles a hit (3 on Normal), no light, no ribbon, no impact frame. Peak 0.3 s at the catch, 0.2 s a hit. The held flames are small and on the blade only. Reduced motion: the flames hold still in shape.

## Sound

Reuse `abilityFlare` at pitch 1.4 and vel 0.4 when the flames catch (a small whoomp). Each burning hit: `abilitySinge` (new, in `js/data/audio.js`): a short hiss transient (band-passed noise at 3 kHz, 60 ms) and a body of a soft crackle (noise grains at 1-2 kHz over 0.1 s), vel 0.4, under the hit's own sound.

## Camera

No camera kick: commons never take one.

## Images

- `img/bitter-draught-1.webp`: the swordsman lowering a flask as small flat flames catch along the length of the sword, ready to strike again.
