# Night Owl

| | |
| --- | --- |
| Id | `night-owl` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (16, 15, 14 points) |
| Origin | New |

## Card

**An owl marks the boss; marks take {mark} more.** (9 words, 41 chars)

`mark` is a share, so js/ability-cards.js shows it as a percentage: "marks take 70% more" (`mark` joins `ABILITY_SHARES`; a flat `damage` would read as a number).

- Icon (48×48 line drawing): an owl seen from below with its wings spread wide, a small ring with a cross-mark beneath it.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); an owl glides down out of the dark and starts circling above the boss (0.4 s); it drops a small blue rune that settles on the boss's back (0.3 s); a sword blow lands on the rune and it bursts in a ring of white (0.4 s); the owl drops another; fade.

## Idea

A pale owl glides down out of the dark and circles silently above the boss, dropping a blue rune mark on it every few seconds. The next blow that lands on a marked boss bursts the mark and hits harder. It is the summon that doesn't fight: it makes everyone's blows count, so it pays most to a player who keeps attacking and to a team that does.

## Data

```js
{ id: 'night-owl', name: 'Night Owl', rarity: 'rare', key: 'summon',
  text: 'An owl marks the boss; marks take {mark} more.',
  power: { when: 'press', then: 'owl' },
  levels: [
    { charge: 16, time: 10, every: 2, mark: 0.7 },
    { charge: 15, time: 11, every: 1.8, mark: 0.85 },
    { charge: 14, time: 12, every: 1.6, mark: 1 },
  ] },
```

Numbers: after its 0.7 s arrival it drops about 5, 6 and 7 marks. Each one, burst by a light blow (16), adds 11-16; by a heavy (30-56), 21-56; by a counter (about 42), 29-42. Alone that is about 60-130 damage a call at level I and 110-260 at level III, near the other summons although it never strikes, and it holds no attention (no `draw`). In a team of four every player's blow can burst it, so marks never go to waste. 16 points at 1-1.4 a second is an owl every 11-16 s. It pays most to a player who hits hard and often.

## Engine work

- New power `press/owl` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'mark']`); `owl` joins `SUMMONS` and `ON_ENEMY`, not `SUMMON_STRIKERS` (it never strikes and never draws: it is no decoy).
- `CONFIG.abilities.summons.owl: { gap: 0, flank: 0, speed: 10, height: 0.6, reach: 30, alt: 6, orbit: 0.8 }`: it circles `alt` m above its enemy (`orbit` rad/s, the same rule as the Cinder Fox's and the Thunder Hawk's), so its `reach` is only a sanity bound.
- Every `every` s it puts a mark on its enemy: `e.mark = { mul: mark, by: holder, t: CONFIG.abilities.summons.owl.markLife }` (`markLife: 4` s). One mark at a time per enemy, whoever's owl made it: a new mark on a marked enemy only renews its clock.
- In `wound` (js/combat.js), when the blow is a player's own weapon blow (light, heavy, counter, plunge, the Finishing Blow) and `e.mark` is set, the damage is multiplied by `1 + mark.mul` and the mark is cleared, emitting `abilityPower` `then: 'owlBurst'`. Blows of powers and summons, damage over time and traps neither burst nor consume it.
- `validate.js`: `press/owl` needs `charge`, `time`, `every`, `mark`, with `mark` in (0, 1].
- Drawing: a beast in `js/summon-beasts.js` (shared with the hound, the fox, the hawk, the bear and the mantis), plus a small pooled rune decal that follows the marked enemy's back.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/night_owl.py`, packed to `js/baked/night-owl.js` (`'night-owl': { sources: ['night_owl'] }`).
- Look: a large pale owl with a flat round facial disc, soft broad wings with fingered tips, ink barring across its wings and breast, two large blue eyes with ink rims, and short ink talons. It reads as a pale cross against the dark sky.
- Size: 0.7 m tall perched, 1.6 m wingspan.
- Material: the summon shader, lit: pale plumage (`#cfd6dc`, cool, never cream) with ink barring (`#0b0d12`) painted in, a faint blue fresnel rim on the wing edges (`#8fb8dc`), the eyes emissive blue with white-hot pupils (`#f2f6fa`). Slots: `plume`, `bar`, `eye` (glows).
- Rig: rigid pieces on pivots (body, head, two wings in two parts each, tail); about 1,400 triangles.
- Animations (by hand): arrive (it glides down out of the dark in a wide silent spiral to circling height, 0.7 s), idle (a slow circle with rare, slow wing beats, its head always turned to the boss), strike (the mark: it tips its head down and a rune falls from its talons to the boss, 0.3 s; there is no blow), leave (it beats its wings twice and rises back into the dark until only its eyes show, then they close, 0.7 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the owl and its marks: it places and circles the owl, puts each mark on the boss and resolves every burst itself, since it owns the boss and checks every hit claim; a client's hit claim on a marked boss gets the bonus only from the server. The owl can't be hurt and draws no attention. Shared benefit: a teammate's blow bursts a mark the same as the holder's (one mark, one blow, whoever lands it), which is the owl's point in a team. It flies above everyone with no collision: it never blocks, pushes or heals a teammate. Every browser draws it and the marks from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0), from each mark (t = m) and from each burst (t = b):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.70 | Glide | It glides down out of the dark in a spiral; its eyes light first | `#cfd6dc` plumage, `#8fb8dc` eyes |
| 0.70-`time` | Circle | It circles at 6 m; no particles | |
| m-m+0.30 | Drop | A small rune falls from its talons along a thin line of light | `#8fb8dc`, `#f2f6fa` core |
| m+0.30-burst | Mark | A flat rune, 0.8 m, sits on the boss's back (never on its weapon arm), a slow brightness pulse once a second | `#8fb8dc` rune, `#0b0d12` ink edge |
| b-b+0.15 | Burst | The rune bursts into a hard ring of white, 1.4 m, and 10 shards fly out from the blow's contact point | `#f2f6fa` ring, `#8fb8dc` shards |
| b+0.15-b+0.40 | Fade | The ring thins and fades | to transparent |
| `time`-+0.7 | Leave | It rises into the dark; the eyes close last | to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (the rune decal, the drop line, the burst ring) + 10 shards a burst (at most 20 alive; 11 on Normal), 1 effect light while a mark is on (a small blue glow on the rune, steady), no ribbon, no impact frame. Peak 0.15 s a burst. The mark's pulse is once a second, and a mark lapses after 4 s unburst (it fades). Reduced motion: the mark holds steady without its pulse. The rune is blue on the back, away from the boss's weapon, so it never reads as an undeflectable wind-up's glow (`#5ab4ff` on the weapon).

## Sound

`abilityOwl` (new, in `js/data/audio.js`) on the call: a transient of soft wing air (pink noise low-passed at 600 Hz, 0.15 s), a body of a low hoot, twice (sine 330 Hz gliding to 290 Hz with a soft attack, 0.25 s each, 0.35 s apart), a tail of a quiet wind (band-passed noise at 400 Hz, 0.6 s). `abilityMark` on each mark: a small chime (sine 1175 Hz, 0.3 s) at low gain. `abilityMarkBurst` on each burst: a bright glass ring (sine 1568 Hz with a 2.4 partial, 0.4 s) layered over the blow's own hit sound.

## Camera

`CONFIG.camera.feel.powers.owl = [0.6, 0]` as it glides in; no kick a mark; `owlBurst = [-0.4, 0.02]` on each burst, small, as it rides the blow's own feel.

## Images

- `img/night-owl-1.webp`: a great pale owl with blue glowing eyes circling above a boss, glowing blue rune circles marked on the boss's body, the swordsman striking one.
