# Mirror Shard

| | |
| --- | --- |
| Id | `mirror-shard` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `parryShot` (new): the holder deflects an enemy's shot (a bolt), with the same timing as a blow |
| Origin | New |

## Card

**Deflect a shot: it flies back.** (6 words, 30 chars)

- Icon (48×48 line drawing): a short blade stroke with an arrow meeting it and turning back the way it came, three small shard triangles along the return path.
- Hover loop (1.6 s): an arrow line flies at a figure (0.4 s), meets the raised blade (0.1 s), turns white and flies back along its path with shards behind it (0.4 s) into the shooter; hold, fade.

## Idea

A deflected bolt or thrown thing flies straight back into whoever shot it. Today a shot can only be dodged or blocked; this gives the deflect player an answer to the bosses that keep their distance, and a deflect you can aim. It is a skill shot: the same timing as a blow, against something smaller and faster.

## Data

```js
{ id: 'mirror-shard', name: 'Mirror Shard', rarity: 'common',
  text: 'Deflect a shot: it flies back.',
  power: { when: 'parryShot', then: 'reflect' },
  levels: [{ damage: 30 }, { damage: 40 }, { damage: 50 }, { damage: 60 }] },
```

Numbers: 30 is about three quarters of a counter, for the harder timing on a small fast shape. Against a boss that shoots, 3-6 deflected shots a fight is about 90-180 at level I and 180-360 at level IV. Eight of the eighteen boss files in js/data/bosses have an attack with `projectile`; against the rest it does nothing, so its average is below the other effect commons, by design: a specialist pick. No cooldown: shots are few.

## Engine work

- New `when: 'parryShot'`: today no bolt can be deflected (js/projectiles.js: "it can never be parried"; `canParryHit` refuses `bolt`). For a holder of a `parryShot` power only, a bolt reaching the player with a deflect press armed (`CONFIG.parry.arm`, the same window as a blow, widened by Keen Eye) and the player facing it is deflected instead of hitting: it takes no health and no block cost. `ctx`: `{ enemy: the shooter, bolt }`. Without the power, bolts behave as now. A deflected shot is not a `parry`: it opens no counter, gives no key charge and fires no `parry` power.
- New `then: 'reflect'`: the bolt turns round and flies straight back at the shooter's chest at its own speed (no arc); on reaching the shooter's body, `damage` to it as a power's blow. If the shooter is dead or out of the bolt's life, it flies on and expires. It passes through every other body and stops on walls as bolts do. `ABILITY_POWERS['parryShot/reflect'] = ['damage']`.
- `validate.js`: `parryShot/reflect` needs `damage` (the existing plan check).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

Each browser flies the server's shots against its own player, so the deflect is seen only by the holder's browser: `parryShot` joins `ABILITY_CLAIMS`. The claim names the shooter and the shot; the server checks it fired that shot at this player within the bolt's life, the shooter is alive, and the player's pose was facing it, then resolves the damage when the bolt's return time (distance / speed) has passed. It hits the shooter only; a teammate in the way sees the bolt pass through them. Everyone sees the returning bolt (drawn from the server's `abilityPower` event, from the holder to the shooter).

## Effect

Layered, timed from the deflect (t = 0); the return reaches the shooter at t = R (distance / speed):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Clash | A small hard four-point star where the bolt meets the blade (0.4 m) | `#f4f1e8` core, `#cfc8b6` points |
| 0.00 | Turn | The bolt's own mesh snaps to bone white with a dark ink outline (tinted, the projectile pool's bolt) | `#f4f1e8` body, `#cfc8b6` head, `#16130f` outline |
| 0.00 to R | Trail | A thin strip behind it scattered with flat mirror-shard triangles (hard edges, one bright face, one dark), 14 shards shed along the path and turning as they fall | `#f4f1e8` bright face, `#8c877b` dark face, `#16130f` edges |
| R | Hit | A second small star on the shooter's chest | as the clash |
| R to R + 0.3 | Fade | Shards and star fade | to transparent |

Budget (Common class): 2 pooled meshes (the star sprite, the trail strip; the bolt is the projectile pool's own), 14 particles (8 on Normal), no light, no ribbon, no impact frame. Peak 0.1 s at the clash; the return lasts as long as the flight (under 0.6 s at bolt speeds and boss ranges). Reduced motion: no change needed (no flash).

## Sound

`abilityMirror` (new, in `js/data/audio.js`): a glassy transient clink (sine 3.5 kHz with high-passed noise at 6 kHz, 12 ms), a body of a pitched whoosh of the returning bolt (band-passed noise sweeping 2 kHz to 1 kHz over 0.3 s), no tail. The hit on the shooter reuses the projectile's own hit sound.

## Camera

No camera kick: commons never take one.

## Images

- `img/mirror-shard-1.webp`: the swordsman deflecting an incoming fiery projectile, the projectile turning white and flying back toward the boss with a trail of mirror shards.
