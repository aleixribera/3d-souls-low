# Bell of Waking

| | |
| --- | --- |
| Id | `bell-of-waking` |
| Rarity | Story (scarf crimson `#b3262e`, oath gold `#e8c46a`), 1 level, never offered in a pick |
| Kind | Key 4, Ultimate, kept for good |
| Trigger | `press`: key 4 with its charge full (48 points) |
| Origin | New |
| Given | Chapter 14, The Still Mere, given by Ysolde |

## Card

**The Bell falls, tolls, and calls the boss down.** (9 words, 47 chars)

- Icon (48×48 line drawing): a large bell seen from the side with one crack running down from its shoulder, a small kneeling figure beneath it, two curved toll lines on each side.
- Hover loop (2.0 s): the key cap "4" lights crimson (0.2 s); a huge bell outline falls from the top of the card over a boss silhouette (0.4 s); it tolls, a ring rolls out to the card's edges and the card drains to black and white but for the gold bell (0.2 s); the boss sinks to one knee under it (0.5 s); it tolls again and bursts into gold pieces, the brighter frame (0.2 s); colour comes back (0.5 s).

## Idea

The last gift, and the biggest moment in the game. Pressed, the ghost of the cracked Bell of Waking falls out of the sky over the boss, huge and gold, and tolls once: a ring of sound rolls across the whole arena, the world drains to ink but for the bell's gold and the red scarf, the falling ash stops in the air, and the boss is called down to one knee, as the founders' law says a crown must answer whoever rings. Two seconds later it tolls again and shatters into gold over the kneeling boss. It is the only technique that stops the world, and it is given right before the fight that needs it.

## Where it's given

On the white bough above the Still Mere, Ysolde waits by the first bonfire with the small bell she cast on the road. The first time the player comes within a few metres of her, she lifts it and rings it once over the water: a thin clear note that rolls out across the mere, the ash nearby hangs still for a breath, and the key 4 cap lights crimson with the ability's name, already full. Nothing pauses and the camera stays the player's; she says nothing unless the player presses Talk, and her lines stay as they are. The ice below, and whatever waits on it, is the first place to ring it.

## Data

```js
{ id: 'bell-of-waking', name: 'Bell of Waking', rarity: 'story', key: 'ultimate',
  story: { chapter: 14, place: 'The Still Mere, given by Ysolde' },
  text: 'The Bell falls, tolls, and calls the boss down.',
  power: { when: 'press', then: 'bellToll' },
  levels: [
    { charge: 48, time: 2, damage: 480 },
  ] },
```

Numbers: 480 at the second toll, as much as a Finishing Blow on a boss and the biggest single power blow in the game, plus `time` s of a boss on one knee that can't act (a free light string and heavy, about 90-130). About 580 for 48 points, 12 a point, the highest of Story's four and well over the floor (8.4). Key 4 fills every 45-50 s, so two tolls a fight: about 1150 on a boss of 1600-3500 health, a third to two thirds of a bar with everything else the player lands in the kneel. It turns the fight; it can't end one alone (the second toll never kills through a phase change).

## Engine work

- New `press/bellToll`: `['charge', 'time', 'damage']`, in `ON_ENEMY` (the locked enemy, else the nearest within `CONFIG.abilities.press.range`); a `running` entry with two beats.
- First toll, 1.0 s after the press: the enemy gets a new hold timer `kneel` = `time`: it plays its kneel (a held stagger pose; an enemy with no kneel clip uses its stagger, frozen at the low point), makes no attack, turns and moves nowhere. The shared hold rest applies (`CONFIG.abilities.holdRest`, 3 s, see Heaven's Lance): an enemy in its rest isn't knelt; the bell still falls and tolls and the second toll still lands. Kneeling is a hold, not a crack: it opens no Finishing Blow and fills no posture.
- Second toll, at the kneel's end (1.0 + `time` s): `damage` to the enemy as a power's blow (it never counts toward `hits`, a counter or a crack, and sets off no power). Like the Finishing Blow's `bossCap` rule, it never leaves a boss past a phase change in one blow: it stops at the phase line.
- The world: the ink grade from World of Ink (one uniform on the output pass) with gold `#e8c46a` and crimson `#b3262e` left in colour, from the first toll to 0.4 s after the second, for every player within `powerNear` (the holder at full, teammates at half); the world's falling ash freezes for the same span (its time uniform held, no new particles).
- Given by the level: `giveAbility: { id: 'bell-of-waking', trigger: [...] }` round Ysolde's place on the white bough (`js/levels/still-mere.js`), with her ringing as a lore `scene` that plays for the player near it.
- `validate.js`: `bellToll` needs `charge`, `time` and `damage`.

## Multiplayer

The press is checked by the server as every press is; it runs both tolls, the kneel and the blow on its own enemy (the server owns the boss's movement). Enemies only: a teammate under the bell is untouched and sees it pass round them; the grade and the frozen ash are drawn for them at half strength, never slowing or moving them. Played together, the story gives each player their own Bell; the hold rest keeps a party's Bells from chaining a boss into an endless kneel, and the impact frame's one-a-second gate keeps four tolls from flashing together.

## Model

`tools/blender/ghost_bell.py`: a great bronze bell 8 m tall and 7 m across the lip, the old tall shape with a heavy waist, a thick sound bow and a crown of six loops on top, plain bands round the shoulder and the lip and a band of raised marks between them (abstract shapes, no letters). One crack runs from the shoulder down past the waist, its edges chipped. About 3k triangles. A second export, `ghost_bell_shards`, is the same bell pre-broken along the crack into 28 pieces, each with its own pivot packed into a vertex attribute so the shatter runs in the shader (one mesh, one draw call). Material: a ghost shader, translucent gold `#e8c46a` at 55% with a white-hot fresnel rim, the crack emissive `#fff3dc`, a black ink outline from an inverted hull, and dark bronze `#3a2a12` showing in the marks. No skeleton: it falls, hangs, swings a little at each toll and breaks. Baked to `js/baked/`; two of each in the pool, warmed at load. Seen in the game over a boss before it ships.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-1.00 | Anticipation | Upper-body pose: the off hand raised open to the sky, held; the world dims 20%; a gold ring opens in the clouds over the boss and the ghost bell comes down through it, slowly, then fast, its crack glowing | `#e8c46a` bell, `#fff3dc` crack, `#0b0b0f` ink |
| 1.00 | First toll (the call) | The bell stops 3 m above the boss's head and swings once; a white toll ring rolls out flat across the floor of the whole arena, with a thin wall of heat-shimmer standing up from it; behind the ring the world drains to ink and paper, only gold and the crimson scarf keep colour; the ash stops mid-air; the boss is driven to one knee | `#fff3dc` ring, `#0b0b0f` / `#e9e4d8` world, `#e8c46a`, `#b3262e` |
| 1.00-3.00 | Kneel | The boss kneels under the hanging bell, which sways and hums; the frozen ash hangs; the crack spreads down the bell in short jumps, gold light leaking from it in thin rays; the holder's scarf moves, nothing else does | `#e8c46a` rays, `#fff3dc` crack |
| 3.00 | Peak (second toll) | The bell tolls and shatters: 28 gold pieces burst outward, a white shockwave runs across the arena floor, 60 hard gold shards. **The impact frame**, ink and white with gold and crimson kept | `#fff3dc` wave, `#e8c46a` pieces, `#b3262e` scarf |
| 3.00-4.20 | Fall | The pieces turn slowly and fade before they reach the floor; colour comes back from the bell's centre outward; the ash starts falling again | `#e8c46a` to transparent |
| 4.20-5.00 | Fade | The cloud ring closes; a few gold motes settle on the kneeling place | to transparent |

Budget (Story class): 8 pooled meshes (the bell, the shard bell, cloud ring, toll ring, heat wall, shockwave, crack ray card, kneel floor ring) + 60 shards + 40 rays and motes + 30 cloud flakes = 130 particles at most (72 on Normal; the frozen ash is the world's own, not new), 2 effect lights (the bell's steady gold glow from the first toll; the shatter's; × 0.65 on Normal), 2 ribbons (the two toll rings' trailing edges), 1 impact frame at t = 3.00. Peak 2.0 s (the first toll to the shatter) inside the class's 4 s. The kneeling boss makes no attack, so no tell can be hidden; if its rest means it isn't knelt, the bell goes 50% translucent within 2 m of its weapon. Reduced motion: the impact frame becomes a 30% darken, no shake, the ink grade fades in and out over 0.3 s instead of following the ring, and the frozen ash fades out rather than hanging.

## Sound

New `abilityBell`, built on the game's `bellToll` (the great bell, a deep strike with inharmonic partials and a very long ring), close and loud: during the fall a rising air rush (pink noise, high-pass sweeping 200 Hz to 3 kHz over 1 s). The first toll is `bellToll` at gain × 1.4 with a cracked buzz on it (two partials at 220 and 221.5 Hz beating) and a sub swell (sine 36 Hz, 2 s); from it until the shatter the sfx bus is low-passed to 1.8 kHz (World of Ink's muffle), so the bell's hum is the clearest sound in the world. The second toll starts the same and is cut off after 0.15 s by a crack (white noise burst, 30 ms) into a cascade of bronze pieces (many short inharmonic pings at 2-6 kHz over 0.8 s) and a deep drop (sine 40 to 22 Hz, 1.2 s). Then 0.3 s of near silence, and the room's sound and the ash's hiss come back.

## Camera

`CONFIG.camera.feel.powers.bellCall = [-2.0, 0.08]` at the first toll (the view pulls in as the world stops) and `bellToll = [5.0, 0.3]` at the shatter, the biggest kick in the game (still under `maxFov` 6). Lock-on keeps the kneeling boss framed; the camera never leaves the player.

## Images

- `img/bell-of-waking-1.webp`: a colossal ghostly cracked bronze bell of gold light descending from the sky over a kneeling boss on a frozen lake, a white toll ring rolling across the world, everything drained to ink except the gold bell and the swordsman's red scarf.
- `img/bell-of-waking-2.webp`: falling ash frozen in mid-air around the swordsman as a toll ring passes, the world drained of colour, only the red scarf in colour.
- `img/bell-of-waking-3.webp`: the second toll: the giant bell shattering into gold fragments over the boss, a white shockwave across the frozen lake.
