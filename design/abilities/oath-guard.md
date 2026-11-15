# Oath Guard

| | |
| --- | --- |
| Id | `oath-guard` |
| Rarity | Story (scarf crimson `#b3262e`, oath gold `#e8c46a`), 1 level, never offered in a pick |
| Kind | Key 2, Guard, kept for good |
| Trigger | `press`: key 2 with its charge full (16 points) |
| Origin | New |
| Given | Chapter 5, The Final Castle's chapel, the defaced statue |

## Card

**A great shield turns and answers every blow.** (8 words, 44 chars)

- Icon (48×48 line drawing): a large round shield seen face-on, a small boss in its centre, a ring of short dashes round the rim, one curved arrow bouncing off its edge.
- Hover loop (2.0 s): the key cap "2" lights crimson (0.2 s); a small figure raises its round shield and a great shield of light blooms round it, the brighter frame (0.3 s); three blows fall from different sides and the shield turns to meet each, a gold ring off each one (0.9 s); the shield bashes forward once (0.2 s); it folds back into the small one (0.4 s).

## Idea

The prisoner's round shield blooms into a great round shield of red-gold light, three times their height, with a worn boss in its centre and a ring of old script round its rim. For three seconds it turns by itself to meet every blow, from any side, and answers each one with a bash. The player doesn't time anything: they press it when the boss starts a string, and the string becomes the boss's punishment. The last fight's opponent turns blows in much the same way, and the player is left to make of that what they will.

## Where it's given

In the castle chapel the defaced statue stands: hooded, a round shield, a scarf painted red, its face struck off. When the player first walks within a few metres of it, their own round shield answers the stone one: a faint ring of red-gold light runs once round its rim, and the key 2 cap lights crimson with the ability's name, already full. Nothing pauses, the camera stays free, the statue does not move and no one speaks. The plinth's inscription can still be read with Talk, as before.

## Data

```js
{ id: 'oath-guard', name: 'Oath Guard', rarity: 'story', key: 'guard',
  story: { chapter: 5, place: "The Final Castle's chapel, the defaced statue" },
  text: 'A great shield turns and answers every blow.',
  power: { when: 'press', then: 'oathShield' },
  levels: [
    { charge: 16, time: 3, damage: 40 },
  ] },
```

Numbers: a boss string runs 3-5 blows in 2-3 s, so a press at its start turns the whole string: 3-5 bashes of 40 (120-200), the string's damage never taken, and a riposte after the last turned blow (about 40), so 160-240 for 16 points, 10-15 a point, above the floor (8.4). Pressed into nothing it does nothing, so its worth is the read. Key 2 fills about every 16 s: five or six presses a fight.

## Engine work

- New `press/oathShield`: `['charge', 'time', 'damage']`, a timer on the holder (`perk.oath`, like `perk.stance`), not on an enemy.
- While it runs, every blow a deflect could turn is deflected whatever its side and the player's timing (Iron Stance's `canDeflectNow` path, plus any facing: the shield turns to the blow). Each turned blow is a deflect for the boss's posture and the last-blow riposte, and sends `damage` back to the attacker as a power's blow (it never counts toward `hits` or a crack, and sets off no power). Grabs and floor fire are not blows and still land.
- As with Iron Stance, a deflect made only because `perk.oath > 0` gives no points to the `guard` key (the other keys still fill).
- Given by the level as Scarlet Draw is: `giveAbility: { id: 'oath-guard', trigger: [...] }` round the statue in the chapel (`js/levels/final-castle.js`).
- `validate.js`: `oathShield` needs `charge`, `time` and `damage`.

## Multiplayer

The shield is its holder's own defence (the client owns it). The server knows it from the press it accepted, so for `time` s plus its slack it takes the holder's untimed deflect claims from any side, range- and rate-checking each against the boss's live blow, and resolves each bash on its own enemy. It shelters the holder only: a teammate standing behind it is not covered, and its bash never touches a player. Played together, each player is given it at the statue.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Anticipation | Upper-body pose: the round shield raised before the chest, held; a ring of old script strokes (shapes only, no letters) lights round its rim one stroke at a time; the world dims 20% | `#e8c46a` strokes, `#b3262e` rim |
| 0.40 | Peak (the bloom) | The shield blooms into a great round shield of translucent light 2.6 m across, a worn boss in its centre and the script ring round its rim; a ring of 24 gold shards bursts out from its edge. **The impact frame**, ink and white with crimson and gold kept | `#b3262e` face at 40%, `#e8c46a` rim and boss, `#0b0b0f` ink outline |
| 0.40-3.40 | Guard | The great shield hovers round the holder and turns to face each blow in 0.08 s; each turned blow throws a flat red-gold shock ring off its face and 10 hard sparks, and the shield bashes forward 1 m and back; the script ring turns slowly the whole time | `#e8c46a` ring, `#fff3dc` sparks, `#b3262e` face |
| 3.10-3.40 | Strain | The face's translucency thins and the script ring's strokes go out one by one | `#e8c46a` to `#5a5550` |
| 3.40-4.40 | Fade | The great shield folds back into the round one on the arm; a last thin gold ring runs round its rim | to transparent |

Budget (Story class): 6 pooled meshes (shield face, script ring, centre boss, shock ring reused, shard sheet, small rim ring) + 24 shards + 10 sparks a turned blow (at most 54 alive with three turns in a second; 30 on Normal) + 16 gold motes, 1 effect light (on the shield's face, steady through the guard: the shocks never pulse it, so three turns a second stay well under 3 Hz; × 0.65 on Normal), 1 ribbon (the bash's arc), 1 impact frame at the bloom. Peak 0.2 s. The shield sits between the holder and the blow, never between the camera and the boss's weapon: within 2 m of the weapon during a wind-up its face drops to 15% so the tell reads through it. Reduced motion: the impact frame becomes a 30% darken, no shake, the shield turns without a motion smear.

## Sound

New `abilityOath`: during the anticipation a low choir-like hum rising (sine partials at 110, 165 and 220 Hz, 0.4 s swell); at the bloom a deep struck metal (sine partials at 98, 270 and 530 Hz, 1.5 s decay, a short bright click on the attack) with a low boom (sine 45 Hz, 0.4 s). Each turned blow: the game's deflect sound plus a short gong (sine partials at 196 and 520 Hz, 0.5 s) and a bash thud (sine 70 Hz, 0.12 s). Tail: the hum falling a fourth as it folds.

## Camera

`CONFIG.camera.feel.powers.oathShield = [-1.2, 0.04]` at the bloom; each turned blow keeps the deflect's own feel, nothing added.

## Images

- `img/oath-guard-1.webp`: the swordsman's round shield blooming into a huge translucent round shield of red-gold light with an oath ring of old script around its rim, turning a boss blow into a shockwave.
- `img/oath-guard-2.webp`: a defaced stone statue of a hooded champion with a round shield and a red-painted scarf in a dark castle chapel, the prisoner standing before it.
- `img/oath-guard-3.webp`: the great shield bashing forward into the boss with a red-gold shock ring.
