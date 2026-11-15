# Iron Stance

| | |
| --- | --- |
| Id | `iron-stance` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 2, Guard |
| Trigger | `press`: key 2 pressed with its charge full (12 points at every level) |
| Origin | Kept from js/data/abilities.js: numbers and text unchanged; the gold sparks and floor ring become a hard blue outline aura and a blue starburst on every blow; untimed deflects in the stance no longer fill the Guard key. |

## Card

**Deflect blows for {time}, no timing needed.** (7 words, 38 chars)

- Icon (48×48 line drawing): a figure's outline drawn as a hard double line, a short slash meeting it from the side and bursting into a four-point star.
- Hover loop (1.8 s): the key 2 square lights (0.2 s); a hard blue outline snaps round a small figure (0.1 s); three falling blows strike it one after another, each bursting into a blue star while the figure stands still (1.2 s); the outline breaks away; fade.

## Idea

Plant your feet and weather a whole combo. For a few seconds every blow a guard could deflect is deflected as if perfectly timed, mid-swing or mid-drink too, each with its clang and spark. It teaches newcomers what a deflected string feels like, and gives skilled players a way to keep attacking straight through a boss's flurry. The blue wind-up of an undeflectable attack still means dash: the stance does not stop it.

## Data

```js
{ id: 'iron-stance', name: 'Iron Stance', rarity: 'rare', key: 'guard',
  text: 'Deflect blows for {time}, no timing needed.',
  perk: { when: 'press', then: 'stance' },
  levels: [
    { charge: 12, time: 2.5 },
    { charge: 12, time: 3 },
    { charge: 12, time: 3.5 },
  ] },
```

Numbers: a boss string runs 3-5 blows in 2-3 s, so 2.5 s covers one string and 3.5 s a string and its follow-up. Each deflect fills the boss's posture and a deflected last blow opens a riposte (2.4× a light hit), so a well-timed press is worth a riposte or a Finishing Blow. 12 points at about 1-1.4 a second comes every 9-12 s. Each deflect gives 3 points to every key, so a four-blow string deflected in the stance would refill the Guard key by itself: the stance's untimed deflects give no points to the Guard key (the other keys still fill).

## Engine work

- Exists: `press/stance` in `ABILITY_PERKS`, `perk.stance` and `canDeflectNow` (js/combat.js) deflect every deflectable blow while it runs.
- New: a deflect made only because `perk.stance > 0` (the player wasn't blocking or tapping) skips `gainCharge` for the `guard` key. `abilityGain` takes an optional key to leave out; the server's count does the same for a stance deflect claim.
- Drawing only: the `press/stance` cue in js/ability-fx.js becomes the aura below; each `parry` event while `perk.stance > 0` adds the starburst.

## Multiplayer

The stance is its holder's own defence (the client owns it). The server already knows the stance from the press it accepted, so it takes untimed deflect claims for `time` s plus its slack, still range- and rate-checking each one against the boss's live blow. Holder only; it never touches a teammate.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Snap | A hard outline aura snaps onto the body: an inverted-hull shell 4 cm out, flat colour, its outer edge ink-dark | `#8fb8dc` shell, `#0b0d12` outer line |
| 0.00-`time` | Hold | The shell holds, a faint white line running up it every 0.8 s; a thin hard ring on the floor at the feet | `#8fb8dc`, `#f2f6fa` line |
| each deflect | Starburst | A flat four-to-six point star of hard spikes at the contact point, 0.9 m across, white core, plus 8 spark streaks thrown along the blow's direction | `#f2f6fa` core, `#8fb8dc` spikes, `#0b0d12` outline |
| `time`-+0.3 | Break | The shell cracks into 6 flat shards that fall and fade | `#8fb8dc` to transparent |

Budget (Rare class): 4 pooled meshes (shell, floor ring, starburst, shard sheet) + 8 sparks a deflect (at most 32 alive; 18 on Normal), 1 effect light (blue, 0.15 s a deflect, intensity × 0.65 on Normal), no ribbon, no impact frame. Peak 0.1 s a deflect; at most 3 deflects a second, so no flash passes 3 Hz. Reduced motion: no change needed.

## Sound

`abilityStance` (new, in `js/data/audio.js`, replacing `abilityCharge` for `press/stance`): a transient of a sword drawn short and set (band-passed white noise 2-5 kHz, 60 ms), a body of a low iron hum (sine 98 Hz with a 2.01 partial, 0.6 s, swelling in over 0.1 s), a tail of a ring (sine 784 Hz, 1 s). Each deflect in the stance plays the normal deflect clang with an added bright blue ping (sine 1568 Hz, 0.25 s), pitched up 2 semitones a deflect in one string so a weathered combo climbs.

## Camera

No new entry: the perk kick (`perkFov`) plays on the press and every deflect already has its own `parryFov`.

## Images

- `img/iron-stance-1.webp`: the swordsman in a planted stance with a hard blue outline aura, deflecting a flurry of boss blows that burst into starbursts of blue sparks.
