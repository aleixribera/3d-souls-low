# Thorn Guard

| | |
| --- | --- |
| Id | `thorn-guard` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered power (no key) |
| Trigger | `block`: an enemy's blow lands on the holder's raised guard |
| Origin | New |

## Card

**Block: thorns hit the attacker.** (5 words, 31 chars)

- Icon (48×48 line drawing): a round shield face-on with four short sharp thorn strokes jutting out of it to the right.
- Hover loop (1.4 s): a blow falls on a round shield (0.3 s), thorn strokes jab out toward the attacker (0.1 s) and pull back (0.2 s); hold, fade.

## Idea

A blocked blow drives black ink thorns out of the shield into the attacker. Blocking is the newcomer's first defence and today it is only waiting; with this it answers. It never replaces the deflect (a deflect opens a counter and fills the keys far more), it only makes the safe choice less passive.

## Data

```js
{ id: 'thorn-guard', name: 'Thorn Guard', rarity: 'common',
  text: 'Block: thorns hit the attacker.',
  power: { when: 'block', then: 'thorns' },
  levels: [
    { damage: 8, cooldown: 0.8 },
    { damage: 11, cooldown: 0.8 },
    { damage: 14, cooldown: 0.8 },
    { damage: 17, cooldown: 0.8 },
  ] },
```

Numbers: half a light hit at level I, a light hit at level IV. A player who blocks takes 8-16 blows on the guard a fight: about 65-130 more at level I and 135-270 at level IV. The 0.8 s cooldown stops a fast string from firing it on every blow. A blocked blow still costs 15% of its damage, so it never makes blocking better than deflecting.

## Engine work

- `when: 'block'` exists as a perk trigger (Bastion's `block/charge`); a power on it is new. `Player.takeHit` already knows a blow was blocked; it calls `abilityReport(this, 'block', { enemy: attacker })` when the attacker is an enemy whose body is within `CONFIG.abilities.commons.thornReach` (3.5 m) of the holder's (a blocked bolt from afar fires nothing and spends no cooldown).
- New `then: 'thorns'`: `damage` to that enemy as a power's blow (the `flare`/`spark` case in `fire`). Add it to `ON_ENEMY`. `ABILITY_POWERS['block/thorns'] = ['damage', 'cooldown']`.
- Drawing: a new `thorns` case in ability-fx.js on the holder's shield, aimed at the enemy.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

Each client owns its defence, so a block is seen only in the blocker's browser: `block` joins `ABILITY_CLAIMS`. The claim names the enemy and its blow (`serial`, `hit`); the server checks that blow was out near the player lately (as the dodge claim's `struckNear`), the player's pose was blocking and facing it, and the enemy within `thornReach`, then resolves the thorns. It hits that enemy only. Everyone sees the thorns.

## Effect

Layered, timed from the blocked blow (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Thorns | 3-5 black ink thorns (flat, hard-edged long triangles, 0.5-0.9 m) jab out of the round shield's face toward the attacker, each with a thin bone rim on one edge | `#16130f` body, `#4a4740` shade side, `#cfc8b6` rim |
| 0.00-0.06 | Jab | They shoot out to full length | as above |
| 0.06-0.15 | Hold | Held at full length | as above |
| 0.10-0.20 | Chips | 8 short dark splinter streaks off the thorn tips at the attacker | `#16130f`, `#8c877b` |
| 0.15-0.30 | Retract | They pull back into the shield and fade | to transparent |

Budget (Common class): 1 pooled mesh (one thorn-cluster mesh, its 5 thorns scaled per hit), 8 particles (4 on Normal), no light, no ribbon, no impact frame. Peak 0.15 s. Reduced motion: no change needed (no flash).

## Sound

`abilityThorns` (new, in `js/data/audio.js`): a transient of three dry cracks of wood (band-passed noise at 1.5-3 kHz, 15 ms each, 30 ms apart), a body of a short scrape (band-passed noise at 900 Hz, 0.1 s), no tail. Played just after the block's own sound, vel 0.5.

## Camera

No camera kick: commons never take one.

## Images

- `img/thorn-guard-1.webp`: the swordsman blocking a heavy blow with a round shield, sharp black ink thorns stabbing out of the shield face into the attacker.
