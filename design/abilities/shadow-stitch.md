# Shadow Stitch

| | |
| --- | --- |
| Id | `shadow-stitch` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**The boss's own shadow stabs it.** (6 words, 31 chars)

- Icon (48×48 line drawing): a flat dark ellipse (a shadow) with three sharp spikes rising out of it at angles.
- Hover loop (1.6 s): a small figure stabs its own shadow on the floor (0.3 s), three black spikes rise out of the boss's shadow one after another and pierce it (0.6 s), then sink back (0.3 s); fade.

## Idea

Stab your own shadow, and the boss's shadow rises off the floor in spikes and stabs it from below. The cheapest strike to charge, a quick, sure hit in a few blows: for players who like to press often.

## Data

```js
{ id: 'shadow-stitch', name: 'Shadow Stitch', rarity: 'rare', key: 'strike',
  text: "The boss's own shadow stabs it.",
  power: { when: 'press', then: 'stitch' },
  levels: [
    { charge: 14, hits: 3, damage: 24 },
    { charge: 13, hits: 3, damage: 30 },
    { charge: 12, hits: 4, damage: 30 },
  ] },
```

Numbers: `hits` × `damage`: 72, 90 and 120, so 5.1, 6.9 and 10 damage a point: Fire Burst's worth spread over three or four stabs CONFIG.abilities.stitch.every (0.15 s) apart, the first 0.2 s after the press. Level III adds a stab instead of damage: a fourth spike reads as the upgrade.

## Engine work

- New power `press/stitch`: ['charge', 'hits', 'damage'] in ABILITY_POWERS. It runs like `blades`: `hits` wounds on the target, the first at `stitch.lead` (0.2 s), then every `stitch.every`, each with its own `abilityPower` event (`strike`: its number) so each spike is drawn as it lands.
- `stitch` joins ON_ENEMY.
- `validate.js`: CONFIG.abilities.stitch { lead from 0 to 0.5, every above 0 }.

## Multiplayer

The browser claims the press; the server checks the charge and runs the stabs on its own enemy. Enemies only. Every browser draws them at the boss's shadow.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Stab | The player's blade point meeting their own shadow; a small black ripple on the floor | `#0e1218`, `#8fb8dc` rim |
| 0.10-0.20 | Pool | The boss's shadow darkens into flat black ink with a blue rim | `#0b0d12`, `#8fb8dc` rim |
| each stab | Spike | One flat black ink spike, 2.5 m, thrusting up at an angle out of the pool into the boss, a hard blue rim, ink drops off its tip | `#0b0d12` body, `#8fb8dc` rim, `#f2f6fa` tip glint |
| each stab | Drops | 6 hard ink drops flung off the tip | `#0e1218` |
| end + 0.30 | Sink | The spikes withdraw into the pool and the pool fades back to a shadow | to transparent |

Budget (Rare class): 6 pooled meshes (4 spikes, the pool decal, the stab ripple) + 24 ink drops (13 on Normal), 1 effect light (blue, low under the boss, 0.6 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.65 s. Spikes go 50% translucent within 1 m of the boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityStitch` (new, in `js/data/audio.js`): a transient of a soft wet stab into the floor (brown noise low-passed at 500 Hz, 40 ms), then per spike a sharp pierce (white noise band-passed at 2.5 kHz, 30 ms, with a low thud at 80 Hz), a body of a dark breathy whoosh under them (pink noise 200-500 Hz, 0.6 s), a tail of a sinking drip (sine 600 to 200 Hz, 0.25 s).

## Camera

`CONFIG.camera.feel.powers.stitch = [-1.0, 0.03]`: a small pull in at the first spike.

## Images

- `img/shadow-stitch-1.webp`: the swordsman stabbing their own shadow while black ink spikes with glowing blue rims rise out of the boss's shadow and pierce it from below.
