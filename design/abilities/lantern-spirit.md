# Lantern Spirit

| | |
| --- | --- |
| Id | `lantern-spirit` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (18, 17, 16 points) |
| Origin | New |

## Card

**A lantern burns the boss and heals you.** (8 words, 39 chars)

- Icon (48×48 line drawing): a round paper lantern with ribbed lines and two hanging streamers, an almond-shaped flame inside it, a small dot flying off to one side.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a paper lantern unfolds at a small figure's shoulder (0.3 s); it spits three small blue fireballs at the boss one after another, and with each that lands the figure's bar ticks up (1.1 s); fade.

## Idea

A paper lantern spirit floats at your shoulder, an eye-shaped blue flame inside it, and spits small fireballs at the boss; each that lands warms you a sliver. It is the support summon: it stays with you rather than going to the boss, draws nothing, and turns a long fight into a slow trickle of health for the player who keeps fighting.

## Data

```js
{ id: 'lantern-spirit', name: 'Lantern Spirit', rarity: 'rare', key: 'summon',
  text: 'A lantern burns the boss and heals you.',
  power: { when: 'press', then: 'lantern' },
  levels: [
    { charge: 18, time: 10, every: 1.5, damage: 10, heal: 0.02 },
    { charge: 17, time: 11, every: 1.4, damage: 12, heal: 0.025 },
    { charge: 16, time: 12, every: 1.3, damage: 14, heal: 0.03 },
  ] },
```

Numbers: after its 0.7 s arrival it shoots about 6, 7 and 8 fireballs: about 60, 85 and 115 damage and 12%, 18% and 24% of the holder's bar (14-29 health) a call, a little under one Mending (20-30%) spread over 10-12 s, plus damage. It is the weakest striker on purpose: half its value is the heal. It has no `draw`: it never takes the boss's attention. 18 points at 1-1.4 a second is a lantern every 13-18 s.

## Engine work

- New power `press/lantern` in `ABILITY_POWERS` (`['charge', 'time', 'every', 'damage', 'heal']`, no `draw`); `lantern` joins `SUMMONS`, `SUMMON_STRIKERS` and `ON_ENEMY`.
- `CONFIG.abilities.summons.lantern: { gap: 0, flank: 0, speed: 9, height: 0.6, reach: 18, perch: true, lift: 1.9, shot: 14 }`: a new `perch` flag puts its place beside its holder (`side` m to their right, `lift` m up, trailing them at `speed`), not round the enemy; `reach` is how far it shoots from there (the press `range`).
- Each strike is a shot, not a touch: the fireball flies at `shot` m/s and the engine wounds the boss when it arrives (a fixed delay of distance / `shot`), then emits `abilityPower` `then: 'lantern'` with `heal` set. A shot that finds the boss gone or untouchable heals nothing.
- The heal is the holder's only (`abilityHeal(holder, heal, 'lantern')`), applied where the holder's body is owned.
- `validate.js`: `press/lantern` needs `charge`, `time`, `every`, `damage`, `heal` (a share, at most 1); the summons check allows a `perch` kind with no flank meaning.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- File: `tools/blender/lantern_spirit.py`, packed to `js/baked/lantern-spirit.js` (`'lantern-spirit': { sources: ['lantern_spirit'] }`).
- Look: a round paper lantern, slightly squashed, its ribs of dark bamboo showing through the paper; a dark wooden cap and base; three long paper streamers hanging from the base that sway; one tear in its paper. Inside, a single almond-shaped flame like an eye, that turns to look at the boss. No face painted on it.
- Size: 0.6 m tall with cap and base, 0.45 m across; the streamers 0.7 m long.
- Material: ink-dark ribs, cap and base (`#0b0d12`); the paper lit from inside (a blue emissive term `#8fb8dc`, bright at the silhouette, darker across the face so the ribs read); the eye-flame white-hot (`#f2f6fa`). Slots: `frame`, `paper` (glows), `flame` (glows).
- Rig: three rigid pieces (body, flame, streamers on a swing bone each); about 900 triangles.
- Animations (by hand): arrive (it unfolds from a flat folded paper at the holder's shoulder, ribs opening like a fan, then the flame lights, 0.5 s), idle (a slow bob of 8 cm and the streamers swaying; the eye-flame tracks the boss), strike (it puffs out, the paper bulging, and spits a fireball, 0.2 s), leave (the flame gutters to a point and the lantern folds flat and drifts down to the floor as a scrap of paper that fades, 0.6 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the lantern's shots on the boss and emits each heal with the shot's event; the holder's browser applies the heal to its own body (the client owns its health) and the server accepts heals up to what it emitted. It heals its holder only, never a teammate. It floats at the holder's shoulder, with no collision, and never blocks or pushes anyone. It draws nothing: the boss never turns to it. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each shot (t = s):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Unfold | The folded paper opens like a fan at the shoulder; the eye-flame lights inside | `#8fb8dc` paper, `#f2f6fa` flame, `#0b0d12` ribs |
| s-s+0.05 | Spit | The paper bulges; a hard flat ring of light at its mouth | `#f2f6fa` |
| s-arrival | Fireball | A small hard-edged fireball, 0.3 m, white core and blue tongues, ink outline, with a short ribbon of flame behind it | `#f2f6fa` core, `#8fb8dc` tongues |
| arrival | Burst | A small flat flame burst on the boss, 0.8 m, 8 sparks | `#8fb8dc`, `#f2f6fa` |
| arrival+0.1 | Warm | A thin blue line runs from the lantern down the holder's arm; the health bar ticks up with a blue sweep | `#8fb8dc` |
| `time`-+0.6 | Leave | The flame gutters; the lantern folds and drifts down | to transparent |

Budget (Rare summon class): the model + 3 pooled meshes (fireball, burst, warm line) + 1 ribbon (the fireball's trail) + 8 sparks a shot and 2 motes a second off the lantern (at most 24 alive; 13 on Normal), 1 effect light while striking (blue, the lantern's own glow, brightening 0.15 s a shot, intensity × 0.65 on Normal), no impact frame. Peak 0.15 s a shot; one every 1.3-1.5 s, under 3 Hz. Reduced motion: no change needed.

## Sound

`abilityLantern` (new, in `js/data/audio.js`) on the call: a transient of paper unfolding (band-passed noise crinkles at 3 kHz, 4 grains in 0.3 s), a body of a candle catching (pink noise band-passed at 600 Hz, 0.3 s), a tail of a soft wind chime (sines 1047, 1319 and 1568 Hz, 0.8 s, staggered). `abilityLanternShot` on each shot: a small puff (brown noise, 60 ms) and a whistle as it flies (sine 1800 Hz gliding to 1200 Hz, 0.2 s); on the heal a single soft chime (sine 784 Hz, 0.3 s), quieter than Mending.

## Camera

`CONFIG.camera.feel.powers.lantern = [0.6, 0]` as it unfolds; no kick a shot.

## Images

- `img/lantern-spirit-1.webp`: a floating paper lantern spirit with a single eye-shaped blue flame inside hovering at the swordsman's shoulder, spitting a small fireball at a boss.
