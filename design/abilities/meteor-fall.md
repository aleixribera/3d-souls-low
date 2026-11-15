# Meteor Fall

| | |
| --- | --- |
| Id | `meteor-fall` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `land` with `action: 'heavy'`: the heavy jump attack lands (5 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level; 140 damage at radius 6 (was 95 at 4.5 and 130 at 6); the look gains a held anticipation at the top of the jump and one impact frame. |

## Card

**Jump heavy: a blast hits all within {radius}.** (8 words, 38 chars)

- Icon (48×48 line drawing): a small figure plunging point-down inside a tall flame teardrop, a crater arc under it.
- Hover loop (1.6 s): a small figure jumps (0.3 s), hangs a beat at the top with the blade raised (0.2 s), and plunges in a column of fire (0.2 s); the burst and shock ring, the brighter frame on landing (0.2 s); the crater glows and cools (0.6 s), loop.

## Idea

The heavy jump attack comes down as a meteor: a column of fire falls with you and a molten crater opens where you land, hitting everything within six metres. It turns the riskiest move in the moveset into a signature: jump in over a boss's sweep, hang a beat at the top, and bring the sky down. Every five seconds at most, so it shapes how you play rather than firing once a fight.

## Data

```js
{ id: 'meteor-fall', name: 'Meteor Fall', rarity: 'legendary',
  text: 'Jump heavy: a blast hits all within {radius}.',
  power: { when: 'land', then: 'blast', action: 'heavy' },
  levels: [
    { radius: 6, damage: 140, cooldown: 5 },
  ] },
```

Numbers: 140 a landing on top of the jump heavy's own blow. A heavy jump attack can land about every 6-10 s in a real fight (it commits, and bosses punish it), so about 14-23 damage a second on top of the holder's own 30: roughly 900-1600 over a 90 s fight if used well, less for a careful player. Strong, but only for the player who takes the jump's risk; it never fires on its own. Over the floor on paper; the risk keeps it fair.

## Engine work

- `land/blast` exists, unchanged: a jump attack whose `action` is `heavy` that lands blasts every enemy within `radius` m.
- The anticipation is the jump heavy's own animation (track A): a held beat of 0.12 s at the top before the plunge when the holder has this ability, so the column reads. It doesn't change the attack's timing on the engine side (the beat is inside the existing air time).
- Its drawing (`js/ability-fx.js` `meteor`) gains the impact frame and the tighter column below; nothing allocated per cast.

## Multiplayer

The client claims `land` with the jump's `action` (it already does); the server checks the landing against the body it knows and the cooldown, and resolves the blast. Enemies only; a teammate in the ring is untouched. One holder per team.

## Effect

Timed from the jump's landing (t = 0); the column starts with the plunge:

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| -0.30 to -0.18 | Anticipation | At the top of the jump, the blade raised point-down, held a beat; ember sparks gather on the blade; the world dims 20% (the holder's view only) | `#e59a5c` sparks |
| -0.18 to 0.00 | Column | A hard column of fire falls with the body, 2 m wide, solid flame tongues with dark red inner lines, a white-hot core round the blade; speed lines behind | `#fff3dc` core, `#e59a5c` tongues, `#7a1f12` inner lines, `#0b0b0f` ink |
| 0.00 | Peak (impact) | A white-hot burst at the feet; a hard shock ring runs out to `radius` in 0.15 s; 40 ember shards and 20 rock chips. **The impact frame** | `#fff3dc` burst, `#e59a5c` ring, `#4a4440` chips |
| 0.00-0.50 | Crater | A molten crater decal under the holder, its cracks white-hot, a heat shimmer | `#fff3dc` to `#e59a5c` |
| 0.50-1.80 | Cool | The crater cools from ember to dull red to black; a few motes rise | `#e59a5c` to `#7a1f12` to `#2a1a12` |

Budget (Legendary class): 6 pooled meshes (column, speed-line card, burst sphere, shock ring, crater decal, heat plane) + 40 shards + 20 chips + 20 motes = 80 particles (44 on Normal), 2 effect lights (column, burst; × 0.65 on Normal), 1 ribbon (the column's trailing edge), 1 impact frame at t = 0. Peak 0.5 s. With the 5 s cooldown the impact frame never comes more than once in 5 s from this ability. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

`abilityBlast` kept for the impact. New `abilityMeteorFall` for the plunge: a rising roar of fire (pink noise, band-pass 300 to 1.6 kHz over 0.18 s, heavy drive) and a falling whistle (band-pass 3 kHz down to 900 Hz). Tail: the crater's hiss and crackle cooling (high-passed noise at 4 kHz with crackles, 1.2 s, fading).

## Camera

`CONFIG.camera.feel.powers.blast = [4, 0.24]` kept for the impact. Nothing at the top of the jump; the camera stays the player's.

## Images

- `img/meteor-fall-1.webp`: the swordsman plunging down from the sky in a column of ember fire like a meteor onto a boss, a white-hot burst and shock ring.
- `img/meteor-fall-2.webp`: a cooling molten crater with glowing cracks after a meteor impact, the swordsman rising from its centre.
