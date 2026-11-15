# Mirror Ward

| | |
| --- | --- |
| Id | `mirror-ward` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (14, 13, 12 points) |
| Origin | New |

## Card

**The next blow bounces back at the boss.** (8 words, 39 chars)

- Icon (48×48 line drawing): a tall upright pane with two crack lines, an arrow striking it and a second arrow flying back out the way it came.
- Hover loop (1.6 s): the key 2 square lights (0.2 s); a blue pane forms in front of a small figure (0.2 s); a boss's falling blow hits the pane and stops dead (0.3 s); the pane shatters outward and its shards fly back into the boss (0.5 s); fade.

## Idea

A pane of blue glass forms in front of you for a breath. The next blow that meets it is stopped whole and a share of its force flies back into the boss as the glass shatters outward. It rewards reading the boss: the bigger the blow you catch, the harder it bounces, so the right moment is the slam you know is coming.

## Data

```js
{ id: 'mirror-ward', name: 'Mirror Ward', rarity: 'rare', key: 'guard',
  text: 'The next blow bounces back at the boss.',
  perk: { when: 'press', then: 'reflect' },
  levels: [
    { charge: 14, time: 1.5, share: 0.6 },
    { charge: 13, time: 1.5, share: 0.8 },
    { charge: 12, time: 1.5, share: 1 },
  ] },
```

Numbers: boss blows run 6-70 damage on a 120-health player (median 34). The pane takes the whole blow, so it is worth one avoided blow, like a deflect without timing but with a 1.5 s window you must place. A reflected `share` of 34 alone would be 20-34 damage on a boss of 1600-3500 health, too little for a rare, so the bounce is `share` × the blow's damage × `CONFIG.abilities.reflect.mul` (3): about 61-102 on a median blow and up to 126-210 on a big slam. That sits beside Fire Burst (70-110 on key 1) and rewards catching the big one.

## Engine work

- New perk `press/reflect` in `ABILITY_PERKS` (`['charge', 'time', 'share']`), with a `ward` clock in `abilityPerkState` (s left) and `abilityClocks` counting it down.
- `Player.takeHit`: while `perk.ward > 0` and the blow comes from the front half (`isInFront`), the blow does nothing to the body (no damage, knock, flinch or counter lost), `perk.ward` goes to 0, and the holder reports a new `reflect` claim with the attacker (`ABILITY_CLAIMS`). Any blow from the front counts, deflectable or not, grabs included; area hits and shots from behind do not meet the pane.
- `abilityPowers` gets a `reflect` resolver: `wound(e, blow damage × share × CONFIG.abilities.reflect.mul)`, emitted as `abilityPower` with `then: 'reflect'` so every browser draws the shatter.
- `CONFIG.abilities.reflect: { mul: 3 }`; `validate.js`: `press/reflect` needs `charge`, `time`, `share` (a share, at most 1), and `reflect.mul` above 0.

## Multiplayer

The pane is its holder's own defence: the browser stops the blow on its own body (the client owns its health) and claims the reflect. The server checks that it accepted a press within `time` s plus its slack, that the attacker's blow is live and within reach of the holder, and computes the damage from its own copy of the attack. The pane stops blows on its holder only: a teammate behind it is not covered, and it never blocks a teammate's movement or blows.

## Effect

Layered, timed from the press (t = 0) and from the blow meeting the pane (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Form | A tall flat pane, 2.2 m high and 1.6 m wide, 0.8 m in front of the holder and turning with them, grows from a vertical line; a cracked-ice texture of straight fracture lines (no hexagons), an ink outline | `#8fb8dc` edge, `#cfe4f2` face at 35% opacity, `#0b0d12` lines |
| 0.15-1.50 | Hold | The pane holds; a white glint slides across it once | `#f2f6fa` glint |
| h | Stop | The blow halts against the pane; a white star of cracks spreads from the contact point in 0.05 s | `#f2f6fa` cracks |
| h+0.05-h+0.45 | Shatter | The pane bursts into 14 flat triangular shards flying in a cone at the boss, each with a short white streak; they vanish on reaching it | `#8fb8dc` shards, `#f2f6fa` streaks |
| h+0.40 | Bounce | A blue starburst on the boss where the shards land | `#8fb8dc`, `#f2f6fa` core |
| 1.50-1.80 | Fade | Unused, the pane dims and slides down into the floor | to transparent |

Budget (Rare class): 3 pooled meshes (pane, crack sheet, starburst) + 14 shards and 10 streaks (24 particles; 13 on Normal), 1 effect light (blue, 0.3 s at the shatter, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.4 s. Reduced motion: no change needed (no flash). The shards fly away from the boss's weapon arm when they would cover it.

## Sound

`abilityWard` (new, in `js/data/audio.js`): on the press a thin glass note forming (sine 1760 Hz with a 2.4 partial, 20 ms attack, 0.6 s); on the stop a hard transient (white noise band-passed at 4 kHz, 25 ms, plus a 140 Hz thump); the shatter's body (high-passed noise above 3 kHz, many short grains over 0.3 s); a tail of tinkling shards (three sines 2.6, 3.1 and 3.7 kHz, 0.4 s, scattered).

## Camera

`CONFIG.camera.feel.powers.reflect = [-1.2, 0.03]`: a small push in as the glass bounces into the boss.

## Images

- `img/mirror-ward-1.webp`: a tall pane of blue glass forming in front of the swordsman stopping a boss blow, cracking and shattering outward into the boss.
