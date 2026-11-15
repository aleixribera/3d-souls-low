# Waiting Blade

| | |
| --- | --- |
| Id | `waiting-blade` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (14, 13, 12 points) |
| Origin | New |

## Card

**Stance: the next blow is answered with a cut.** (9 words, 45 chars)

- Icon (48×48 line drawing): a sheathed sword held low with a hand on the hilt, a single long arc line drawn over it from corner to corner.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a small figure settles still, a ring on the floor (0.4 s); a boss blow starts to fall (0.3 s); one enormous blue arc cuts across the card before the blow lands, and the boss reels (0.5 s); hold the arc; fade.

## Idea

The counter stance. Hand on the hilt, eyes closed, perfectly still: any blow that comes in the next breath is answered by one enormous cut before it lands. It is the most patient guard and the biggest payoff of the three single-blow ones, and it asks the player to press it as a boss's wind-up begins, the same read as a deflect, with the whole moment held.

## Data

```js
{ id: 'waiting-blade', name: 'Waiting Blade', rarity: 'rare', key: 'guard',
  text: 'Stance: the next blow is answered with a cut.',
  power: { when: 'press', then: 'counterStance' },
  levels: [
    { charge: 14, time: 1.2, damage: 120 },
    { charge: 13, time: 1.3, damage: 145 },
    { charge: 12, time: 1.4, damage: 170 },
  ] },
```

Numbers: 120-170 is about three to four counters (a counter is about 42) and above Fire Burst's 70-110 on key 1, because it can miss: the stance holds only 1.2-1.4 s and the holder can't move or attack in it. Pressed on a wind-up, it avoids one blow (median 34 of 120 health) and lands the cut. 14 points at 1-1.4 a second is a stance every 10-14 s. Against bosses of 1600-3500 health, four answered stances a fight are 480-680 damage, a strong rare that needs the read.

## Engine work

- New power `press/counterStance` in `ABILITY_POWERS` (`['charge', 'time', 'damage']`).
- The stance lives on the holder's body: a `wait` clock in `abilityPerkState` (s left), a still pose (PS.BLOCK's facing rules, no movement). A dash, an attack or a flask cancels it early; the charge is spent.
- While `perk.wait > 0`, the first enemy blow that would land on the holder from an enemy's body or weapon is answered instead: it never lands (no damage, knock or flinch), `perk.wait` goes to 0, and the holder reports a new `answer` claim with the attacker (`ABILITY_CLAIMS`). Deflectable or not, it is answered; grabs (`seize`, `pull`), shots and ground area hits are not (they have no swing to meet) and land as usual.
- `abilityPowers` resolves `answer`: `wound(e, damage)`, emitted as `abilityPower` `then: 'counterStance'`. The cut is a power's blow, never a counter: the Finishing Blow stays the holder's to earn.
- The answered blow gives no deflect points (it isn't a deflect).
- `validate.js`: `press/counterStance` needs `charge`, `time`, `damage`.

## Multiplayer

The stance is its holder's own defence (the client owns it). The server takes the answer claim only if it accepted the press within `time` s plus its slack and the attacker's blow is live and within reach of the holder, and resolves the cut itself since it owns the boss. Holder only: a teammate beside them is not covered, and the cut hits enemies only.

## Effect

Layered, timed from the press (t = 0) and from the answered blow (t = h):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Settle | A thin hard ring draws itself round the holder's feet, 2 m across, in one brush stroke; the holder's scarf and coat go still | `#8fb8dc` ring, `#0b0d12` ink edge |
| 0.15-`time` | Wait | The ring holds; one white line along the sheathed blade brightens slowly | `#f2f6fa` |
| h | Still | The world dims 20% for 0.12 s (not a flash): the holder and the coming blow stay lit | world × 0.8 |
| h+0.02-h+0.20 | Cut | One enormous flat arc, 7 m long and 0.5 m thick at its middle, sweeps through the attacker from the holder's hip: white core, blue edge, ink outline, a brush smear trailing it | `#f2f6fa` core, `#8fb8dc` edge, `#0b0d12` outline |
| h+0.20-h+0.70 | Hang | The arc hangs in the air, then splits along its length and fades in two halves; 16 spark streaks fall from the split | `#8fb8dc` to transparent, `#f2f6fa` sparks |
| `time`-+0.2 | Lapse | Unanswered, the ring breaks into short dashes and fades | to transparent |

Budget (Rare class): 3 pooled meshes (floor ring, arc, smear ribbon) + 16 particles (9 on Normal), 1 effect light (white-blue, 0.25 s at the cut, intensity × 0.65 on Normal), 1 ribbon (the smear), no impact frame. Peak 0.2 s. The pool's "ink-and-blue frame" is a legendary's impact frame (STYLE.md rule 8), so a rare uses the 20% dim instead. Reduced motion: the dim stays (it is not a flash), the arc's hang is held still.

## Sound

`abilityAnswer` (new, in `js/data/audio.js`): on the press a quiet click of a thumb on a guard (white noise band-passed at 5 kHz, 8 ms) and a held breath (pink noise low-passed at 800 Hz, 0.4 s, falling); on the answer a transient of a sword drawn at once (band-passed noise sweeping 2-7 kHz in 40 ms), a body of a deep cut (sine 110 Hz gliding to 55 Hz, driven, 0.3 s), a tail of a long ring (sine 659 Hz with a 2.76 partial, 1.2 s).

## Camera

`CONFIG.camera.feel.powers.counterStance = [-2, 0.06]`: a push in on the cut, inside the 0.4 s limit.

## Images

- `img/waiting-blade-1.webp`: the swordsman in a still counter stance with eyes closed and hand on the hilt, a boss blow arriving, a single enormous blue arc cutting it first.
