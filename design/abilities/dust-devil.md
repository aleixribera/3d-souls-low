# Dust Devil

| | |
| --- | --- |
| Id | `dust-devil` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `jump` (new): the holder jumps off the ground with an enemy close by |
| Origin | New |

## Card

**Jump: a dust whirl cuts around you.** (7 words, 35 chars)

- Icon (48×48 line drawing): a small figure rising over a ground line, an open spiral wound round its feet with three short straight cut strokes inside the spiral.
- Hover loop (1.4 s): a figure crouches (0.2 s) and leaps (0.2 s), a spiral of dust winds up round its feet with short cut lines flicking in it (0.4 s); hold, fade.

## Idea

Leaving the ground near the boss kicks up a cutting whirl of dust: jumping in becomes an attack. The jump is the move players forget they have; this gives it a reason close in (jump a sweep, jump into a jump attack) and a look that sells the leap.

## Data

```js
{ id: 'dust-devil', name: 'Dust Devil', rarity: 'common',
  text: 'Jump: a dust whirl cuts around you.',
  power: { when: 'jump', then: 'whirl' },
  levels: [
    { damage: 10, cooldown: 2 },
    { damage: 13, cooldown: 2 },
    { damage: 16, cooldown: 2 },
    { damage: 19, cooldown: 2 },
  ] },
```

Numbers: two thirds of a light hit, to every enemy in reach. Jumps near the boss 4-10 a fight (the 2 s cooldown stops hopping on the spot from paying): about 40-100 more at level I and 75-190 at level IV, the low end of the effect commons for a player who rarely jumps, the middle for one who does. It hits all enemies in reach, so it is worth more against pairs.

## Engine work

- New `when: 'jump'`: fired as the holder leaves the ground by jumping (`Player` sets `PS.JUMP`, js/player.js), only when a live enemy's body is within `CONFIG.abilities.commons.whirlRadius` (2.4 m); otherwise nothing fires and no cooldown is spent. `ctx`: `{ x, y, z }` (the take-off point), `enemy` the nearest.
- New `then: 'whirl'`: `damage` to every live enemy whose body is within `whirlRadius` of the take-off point and `CONFIG.height.reach` of its height (the `blast` case in `fire`, with the config radius). `ABILITY_POWERS['jump/whirl'] = ['damage', 'cooldown']`. Not in `ON_ENEMY` (it needs a place, not an enemy).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

A person's jump is theirs, so `jump` joins `ABILITY_CLAIMS`: the browser claims it with the take-off point; the server checks the player's pose was jumping (or airborne) within the last 0.3 s and the point within 1.5 m of their recent poses, then resolves the whirl round that point. It hits enemies only; a teammate in the whirl sees it pass round them. Everyone sees the whirl.

## Effect

Layered, timed from the take-off (t = 0), anchored to the take-off point (it stays on the ground as the player rises):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Whirl | A short open spiral of dust round the take-off point (one pooled spiral band, 2.4 m wide at its top, 1.2 m tall), flat two-tone dust texture with dark ink edges | `#8c877b` body, `#4a4740` shade, `#cfc8b6` leading edge, `#16130f` ink edge |
| 0.00-0.35 | Spin | It winds up and turns one and a half turns, widening to `whirlRadius` | as above |
| 0.05-0.30 | Cuts | 4 hard bone-white cut lines flick inside the spiral (straight thin strokes, 0.8 m, each 0.08 s), spaced round it | `#f4f1e8` core, `#cfc8b6` edge |
| 0.10-0.45 | Grit | 14 dust grains as short streaks thrown outward and down | `#8c877b`, `#4a4740` |
| 0.30-0.55 | Settle | The spiral thins from the top and fades | to transparent |

Budget (Common class): 2 pooled meshes (the spiral band, the cut-line set), 14 particles (8 on Normal), no light, no ribbon, no impact frame. Peak 0.35 s. Reduced motion: the spiral fades in place without turning; the cuts stay as drawn.

## Sound

`abilityWhirl` (new, in `js/data/audio.js`): a gritty scrape transient (noise band-passed at 2 kHz, 20 ms), a body of a short spinning whoosh (noise band-passed at 400-900 Hz with a 12 Hz swell in its level, 0.35 s), no tail. Under the jump's own sound, vel 0.5.

## Camera

No camera kick: commons never take one.

## Images

- `img/dust-devil-1.webp`: the swordsman leaping upward from the arena floor, a spiral whirl of dust with sharp white cut lines spinning around their feet.
