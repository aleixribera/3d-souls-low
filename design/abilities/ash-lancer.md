# Lancer of Ash

| | |
| --- | --- |
| Id | `ash-lancer` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 3, Summon |
| Trigger | `press`: key 3 pressed with its charge full (18, 16, 14 points) |
| Origin | Kept from js/data/abilities.js: numbers and text unchanged; its violet cinders become blue embers, and it charges in from the arena's edge with a trail of ash instead of forming at its holder's side. |

## Card

**A lancer charges the boss for {time}.** (7 words, 32 chars)

- Icon (48×48 line drawing): a tall helmed figure leaning into a run, a long lance held level ahead of it, three speed lines behind.
- Hover loop (1.8 s): the key 3 square lights (0.2 s); a tall ash figure forms at the card's edge and charges across it, lance level, ash streaming behind (0.5 s); it thrusts into the boss three times in quick succession (0.8 s); it crumbles; fade.

## Idea

A lancer of ash charges in from the edge of the arena and thrusts at the boss again and again. It is the fastest striker among the summons, short-lived and hard-hitting, with the biggest entrance: a charge across the whole arena that every player sees coming.

## Data

```js
{ id: 'ash-lancer', name: 'Lancer of Ash', rarity: 'rare', key: 'summon',
  text: 'A lancer charges the boss for {time}.',
  power: { when: 'press', then: 'lancer' },
  levels: [
    { charge: 18, time: 6, every: 0.9, damage: 18, draw: 1 },
    { charge: 16, time: 7, every: 0.8, damage: 22, draw: 1.2 },
    { charge: 14, time: 8, every: 0.7, damage: 26, draw: 1.5 },
  ] },
```

Numbers: its charge takes about 1 s; it then thrusts about 5, 7 and 10 times: about 90, 155 and 260 damage a call, with only 1-1.5 s of the boss's attention, so it hits hard but protects little. 18 points at 1-1.4 a second is a lancer every 13-18 s. Unchanged from the shipped entry.

## Engine work

- None for the rule: `press/lancer` is in `ABILITY_POWERS`, `lancer` in `SUMMONS` and `SUMMON_STRIKERS`.
- New placement: the lancer starts `CONFIG.abilities.summons.lancer.from` (12) m from the boss, on the holder's side and 0.6 rad round from them, and runs in at its `speed` (13 m/s); its `arrive` (a new per-kind override of `summons.arrive`, 1 s) covers the run. `summonStep` is unchanged once it starts.
- Drawing (js/summon-figures.js): `VIS.abilityFx.lancer` turns its `color` and `core` and the `cinder` glow to the rare palette below; the run leaves an ash trail.
- Summon pools are built when a player in the run takes the ability (at the pick screen) and warmed then.

### Model

- Kept: `tools/blender/lancer_of_ash.py`, packed to `js/baked/lancer-of-ash.js`. The `cinder` slot's base colour goes from violet to blue (`(0.56, 0.72, 0.86)`); the plume of charred strands is lengthened to read in the charge.
- Look: a tall, lean knight burnt down to ash, a keeled helm with one slit of blue cinder light and a plume streaming back, a cuirass with a hole burnt through the breast glowing blue, one great pauldron, a torn cape, a lance longer than its body with burning edges.
- Height: 1.9 m (2.4 m to the plume's tip); the lance 2.6 m.
- Material: the figures' summon shader: lit `ash` plate (`#aaa59e`) over a `char` body (`#3a3534`, near ink), `cinder` glowing blue-white (`#8fb8dc` rim to `#f2f6fa` core).
- Rig: one rigid mesh per game bone of js/rig.js's skeleton, as now; about 3,500 triangles.
- Animations: arrive (forms from the feet up at the arena's edge with a climbing blue seam, 0.4 s, then charges in), idle (a lance-level guard), strike (Cinder Thrust and Falling Pike, its two `moves`), draw (the lance raised in a challenge, 0.9 s), leave (crumbles from the head down into ash, 0.6 s). It never pops in or out.

## Multiplayer

One summon per holder at a time: a press on key 3 with another summon out sends that one away. The server owns the lancer: it places it, thrusts for it and draws the boss's eye with it for `draw` s (1-1.5 s) after it arrives; it can't be hurt, and an attack begun on it ends on it. Its charge runs through players without touching them: no collision, no push, no heal. Every browser draws it from the `abilityPower` events.

## Effect

Layered, timed from the press (t = 0) and from each thrust (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Form | At the arena's edge the figure forms from the feet up, a blue seam climbing it | `#8fb8dc` seam, `#aaa59e` ash, `#3a3534` char |
| 0.40-1.00 | Charge | It runs in, lance level; a flat ink-brush ash trail streams behind it with radial speed lines at its back | `#9a958c` trail, `#0b0d12` ink edge |
| h-h+0.10 | Thrust | The lance's tip flares white; a flat cone of 3 hard speed lines bursts forward through the boss; 10 blue embers spray | `#f2f6fa` tip, `#8fb8dc` embers |
| draw | Challenge | Lance raised; its cinder flares | `#f2f6fa` |
| `time`-+0.6 | Leave | It crumbles from the head down; ash falls in flakes | `#9a958c` |

Budget (Rare summon class): the model + 2 pooled meshes (thrust cone, speed-line sheet) + 1 ribbon (the ash trail) + 26 particles at the forming and 10 a thrust (at most 40 alive; 22 on Normal), 1 effect light while striking (blue, 0.15 s a thrust, intensity × 0.65 on Normal), no impact frame. Peak 0.1 s a thrust; at most 1.4 a second, under 3 Hz. Reduced motion: the speed lines hold still.

## Sound

Unchanged: `abilityLancer` on the call (ash on a cold wind, a thin ring as the spear comes level), `abilityThrust` on each thrust, `abilityChallenge` on the draw. New: a rising run of footfalls under the charge (brown noise thumps, 5 in 0.6 s, getting louder).

## Camera

Unchanged: `CONFIG.camera.feel.powers.lancer = [1.2, 0.04]` as it arrives, `draw = [1.2, 0.03]` on the challenge. No kick a thrust.

## Images

- `img/ash-lancer-1.webp`: a tall spectral lancer made of grey ash with blue embers in the cracks charging with a long lance at a boss, a trail of ash behind.
