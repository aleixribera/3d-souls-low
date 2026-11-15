# Ink Crows

| | |
| --- | --- |
| Id | `ink-crows` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (18, 16, 15 points) |
| Origin | New |

## Card

**Ink crows swarm the boss for {time}.** (7 words, 31 chars)

- Icon (48×48 line drawing): five small crow shapes in a ring round a horned head's outline, two ink drops falling from it.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a stream of black crows pours from a small figure's coat (0.3 s), loops up and rings the boss's head, pecking in quick darts with ink drops splashing (1.0 s); they tighten in front of its face and it swats at them; fade.

## Idea

A murder of crows made of brush ink pours out of your coat and swarms the boss's head: many small, quick pecks instead of one big blow, and a cloud the boss swats at for a moment. It is the summon of steady pressure, and the most "anime" entrance in the set: a black ribbon of birds unspooling from the hero's coat.

## Data

```js
{ id: 'ink-crows', name: 'Ink Crows', rarity: 'rare', key: 'summon',
  text: 'Ink crows swarm the boss for {time}.',
  power: { when: 'press', then: 'crows' },
  levels: [
    { charge: 18, time: 7, every: 0.25, damage: 5, draw: 1.5 },
    { charge: 16, time: 8, every: 0.25, damage: 6, draw: 1.8 },
    { charge: 15, time: 9, every: 0.25, damage: 7, draw: 2 },
  ] },
```

Numbers: after its 0.7 s arrival it pecks 4 times a second: about 25, 29 and 33 pecks, so about 125, 175 and 230 damage a call, in line with the hound (about 100-265) at a slightly lower charge, with 1.5-2 s of the boss's attention. Small pecks add little posture each, so it never staggers the boss on its own. 18 points at 1-1.4 a second is a swarm every 13-18 s.

## Engine work

- New power `press/crows` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'draw']`); `crows` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`, and `fire`'s summon case takes every kind in `SUMMONS` (it names four today).
- `CONFIG.abilities.summons.crows: { gap: 0, flank: 0, speed: 16, height: 0.6, reach: 1.5, head: true }`: a new `head` flag puts its place at the enemy's head (its body's top, the enemy's `height`), so the swarm rings the head and follows it. While it draws the boss, its decoy sits 1 m in front of the boss's face at head height, so the boss swats at the air before it.
- The pecks are emitted to every browser like any strike (`strike` its number), 4 a second; the drawing picks which crow darts in by the peck's number so every client shows the same one. Their sound and light are throttled (below).
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/ink_crows.py`, packed to `js/baked/ink-crows.js` (a `FILES` entry `'ink-crows': { sources: ['ink_crows'] }` in tools/pack-baked.cjs).
- Look: one crow of black brush ink, ragged wing and tail feathers that end in dry-brush tips, a sharp beak, two blue eyes; the body reads as a single ink stroke at a distance. Twenty-four of them fly at once.
- Size: 0.35 m beak to tail, 0.7 m wingspan.
- Material: the summon fresnel shader: ink-dark body (`#0b0d12`), blue rims on the wing edges (`#8fb8dc`), eyes white-hot (`#f2f6fa`). A vertex weight on the wings (0 at the body, 1 at the tips) lets the vertex shader flap them.
- Rig: none; one mesh of about 300 triangles drawn as one `InstancedMesh` of 24, each crow's place, heading and flap phase set per instance. One draw call for the swarm.
- Animations (in the shader and on the instances): arrive (the crows unspool from the holder's coat in a ribbon, each taking off 25 ms after the last, 0.6 s), idle (a ring 1.6 m round the head, bobbing ±0.4 m, flapping out of step), strike (one crow darts in to the boss and back, 0.2 s), draw (the swarm tightens into a screen before the boss's face, 0.6 s), leave (one by one over 0.6 s each crow bursts into a splash of ink drops that fall and fade). They never pop in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the swarm: it places it, pecks for it and draws the boss's eye with it for `draw` s (1.5-2 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. The crows fly at the boss's head, never in a teammate's way: no collision, no push, no heal. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each peck (t = p):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.60 | Pour | A ribbon of crows unspools from the holder's coat and arcs up to the boss's head; a brush smear of ink trails the stream | `#0b0d12` crows and smear, `#8fb8dc` wing edges |
| 0.60-`time` | Swarm | The ring circles the head; 1 ink drop falls from it every 0.1 s | `#0b0d12`, `#f2f6fa` eyes |
| p-p+0.20 | Peck | One crow darts in; on contact a small flat splash of ink and 2 hard blue sparks | `#0b0d12` splash, `#8fb8dc` sparks |
| draw | Screen | The swarm packs into a flat disc before the face; the boss swats through it | `#0b0d12` |
| `time`-+0.6 | Leave | Crows burst one by one into ink drops that fall and fade | `#0b0d12` to transparent |

Budget (Rare summon class): the model (one instanced mesh of 24) + 2 pooled meshes (the pour smear, the ink splash decal) + ink drops and sparks (at most 40 alive; 22 on Normal), 1 effect light while striking: a low steady blue glow inside the swarm, never pulsed a peck (4 pecks a second would pass 3 Hz). No ribbon besides the smear, no impact frame. Reduced motion: no change needed (no flash). The swarm stays above the boss's shoulders, and the screen at the draw is the one moment it sits before the face, never during a wind-up's last 0.3 s.

## Sound

`abilityCrows` (new, in `js/data/audio.js`) on the call: a transient of a coat snapping open (band-passed noise at 1.5 kHz, 30 ms), a body of many wings beating (pink noise band-passed at 900 Hz with a fast 12 Hz amplitude flutter, 0.6 s), a tail of three harsh caws (sawtooth 420 Hz with a 1.3 partial, band-passed at 1.2 kHz, 0.15 s each, 0.2 s apart). `abilityPeck` on pecks: a dry tick (white noise band-passed at 4 kHz, 8 ms), played at most every 0.25 s with heavy jitter so it reads as a flurry; one caw every 2 s while it swarms.

## Camera

`CONFIG.camera.feel.powers.crows = [0.8, 0.02]` on the call; no kick a peck (4 a second would shake the view); `draw = [1.2, 0.03]` on the screen.

## Images

- `img/ink-crows-1.webp`: a swarm of black brush-ink crows with glowing blue eyes pouring from the swordsman's coat and swirling around a boss's head, ink drops splattering.
