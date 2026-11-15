# Glass Mantis

| | |
| --- | --- |
| Id | `glass-mantis` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (18, 17, 16 points) |
| Origin | New |

## Card

**A glass mantis slices the boss for {time}.** (8 words, 37 chars)

- Icon (48×48 line drawing): a mantis seen side-on, standing tall, its two long scythe forelegs crossed in an X in front of it, its body drawn in faceted straight lines.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a crystal shard stabs up from the floor beside the boss and unfolds into a tall glass mantis (0.4 s); it scissors both blades through the boss, quick, quick, a thin white cut line hanging each time (1.0 s); fade.

## Idea

A tall mantis of clear glass, outlined in ink, unfolds from a crystal shard beside the boss and slices it with both scythe-arms in quick scissor cuts. It is the precise, fast summon: the most blows of any striker in a short time, each one a clean, thin line that hangs for a breath, and it shatters when its time ends.

## Data

```js
{ id: 'glass-mantis', name: 'Glass Mantis', rarity: 'rare', key: 'summon',
  text: 'A glass mantis slices the boss for {time}.',
  power: { when: 'press', then: 'mantis' },
  levels: [
    { charge: 18, time: 7, every: 0.8, damage: 16, draw: 1.5 },
    { charge: 17, time: 8, every: 0.75, damage: 18, draw: 1.7 },
    { charge: 16, time: 9, every: 0.7, damage: 20, draw: 1.9 },
  ] },
```

Numbers: after its 0.7 s arrival it cuts about 8, 10 and 12 times: about 125, 175 and 240 damage a call, at the hound's level for less charge, paid for by the shortest stay among the strikers and a light hold on the boss's eye (1.5-1.9 s). 18 points at 1-1.4 a second is a mantis every 13-18 s.

## Engine work

- New power `press/mantis` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `mantis` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.mantis: { gap: 1.3, flank: 1.1, speed: 9, height: 2.4, reach: 2, rises: true }`: it rises where it will stand, on the boss's far side away from its holder.
- Drawing: a beast in `js/summon-beasts.js` (shared with the hound, the fox, the hawk, the bear and the owl). Its glass is drawn after the opaque pass with its ink outline drawn solid, so it reads against any floor. Large summons fade to 40% when they stand between a viewer's camera and the boss (drawing only, per browser); the mantis's glass already lets the boss show through, so its fade only thins the outline.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/glass_mantis.py`, packed to `js/baked/glass-mantis.js` (`'glass-mantis': { sources: ['glass_mantis'] }`).
- Look: a tall upright mantis cut from clear glass in hard flat facets: a narrow triangular head with two blue eye-facets, a long thin neck plate, two scythe forelegs with serrated inner edges and needle tips, four thin walking legs, folded wing plates down its back. Every facet edge is drawn with a black ink line; the blade edges glow blue.
- Height: 2.4 m standing, scythes folded.
- Material: a summon glass shader: near-clear (`#cfe4f2` at 25% opacity) with a strong fresnel rim (`#8fb8dc`), facet edges and outline in ink (`#0b0d12`, an inverted-hull outline), the blade edges and eye-facets emissive blue with white-hot tips (`#f2f6fa`). Slots: `glass`, `edge` (glows), `eye` (glows).
- Rig: rigid pieces on pivots (body, head, two forelegs in two parts each, four walking legs, wing plates); about 1,800 triangles.
- Animations (by hand): arrive (a crystal shard stabs up out of the floor, 0.2 s, and unfolds piece by piece into the mantis, 0.5 s), idle (a slow sway with the forelegs raised and folded, head turning in small jerks), strike (both scythes snap open and scissor through the boss in a crossing cut, 0.12 s, then fold back), draw (it rears with its scythes spread wide and its wing plates fanned, 1 s), leave (cracks run through it from the feet up, 0.3 s, and it shatters into shards that fall and fade, 0.5 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the mantis: it places it, cuts for it and draws the boss's eye with it for `draw` s (1.5-1.9 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. It has no collision: it never blocks, pushes or heals a teammate, and its shards on leaving are drawn only. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each cut (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Shard | A crystal shard stabs up from the floor beside the boss, 1.2 m, a crack star on the floor round it | `#cfe4f2` glass, `#0b0d12` outline |
| 0.20-0.70 | Unfold | The shard unfolds into the mantis; its edges light blue from the feet up; 8 glass glints | `#8fb8dc` edges, `#f2f6fa` glints |
| h-h+0.10 | Cut | Two thin straight cut lines cross through the boss in an X, 1.8 m each, hard white core, ink outline | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` outline |
| h+0.10-h+0.35 | Hang | The X hangs, then each line slides apart along its length and fades; 4 glass chips | `#8fb8dc` to transparent, `#cfe4f2` chips |
| draw | Fan | Its wing plates fan out and catch light in a blue rim | `#8fb8dc` |
| `time`-0.3-`time` | Crack | White crack lines climb its body | `#f2f6fa` |
| `time`-+0.5 | Shatter | It breaks into 20 shards that fall and fade | `#cfe4f2`, `#8fb8dc` rims |

Budget (Rare summon class): the model + 2 pooled meshes (the X cut, the floor crack star) + 8 glints at the unfold, 4 chips a cut and 20 shards at the end (at most 30 alive; 17 on Normal), 1 effect light while striking (blue-white, 0.1 s a cut, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.1 s a cut; one every 0.7-0.8 s, under 1.5 Hz, and the light is a soft glint, not a flash. Reduced motion: the X fades in place without sliding apart. The cut lines are thin (2 px at their thickest at 10 m) and cross the boss's body, never its weapon arm in a wind-up.

## Sound

`abilityMantis` (new, in `js/data/audio.js`) on the call: a transient of glass stabbing up (a bright click, sine 3.2 kHz with a 2.76 partial, 2 ms attack, 0.1 s), a body of the mantis unfolding (6 small glass ticks band-passed at 4 kHz over 0.5 s, each a little higher), a tail of a ringing glass tone (sine 1320 Hz with a 2.4 partial, 0.8 s). `abilityScissor` on each cut: two crossed metallic swishes 30 ms apart (band-passed noise sweeping 3 to 8 kHz, 60 ms each) and a short glass ring (sine 1760 Hz, 0.2 s) at low gain. `abilityShatter` as it leaves: glass breaking (white noise grains high-passed at 3 kHz, 0.4 s, with three falling tones at 2.6, 2.1 and 1.7 kHz).

## Camera

`CONFIG.camera.feel.powers.mantis = [1, 0.03]` as it unfolds; no kick a cut; `draw = [1.2, 0.03]` on the fan.

## Images

- `img/glass-mantis-1.webp`: a tall slender mantis of clear blue glass unfolding scythe arms and slicing a boss in a fast scissor cut, light refracting through its body.
