# Grit

| | |
| --- | --- |
| Id | `grit` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `hurt`: the holder loses health to a blow |
| Origin | New |

## Card

**Get hit: take {cut} less for {time}.** (7 words, 27 chars; level I reads "Get hit: take 20% less for 1.5 s.")

- Icon (48×48 line drawing): a figure outline with a short blow line striking its shoulder and two small spark strokes glancing off.
- Hover loop (1.6 s): a blow strikes a figure (0.2 s), the figure's outline thickens to a heavy line (0.1 s), a second blow glances off it with sparks (0.3 s), the outline thins back (0.6 s); hold, fade.

## Idea

After a hit, the skin turns iron grey for a moment, so the boss's follow-up hurts less. Bosses' danger is in combos; a newcomer caught by the first blow usually eats the second too. Grit softens exactly that second blow and shows it: the body goes dull iron and the next blow glances off in sparks.

## Data

```js
{ id: 'grit', name: 'Grit', rarity: 'common',
  text: 'Get hit: take {cut} less for {time}.',
  perk: { when: 'hurt', then: 'ironSkin' },
  levels: [
    { cut: 0.2, time: 1.5 },
    { cut: 0.25, time: 1.5 },
    { cut: 0.3, time: 1.5 },
    { cut: 0.35, time: 1.5 },
  ] },
```

Numbers: a boss's follow-up blow is mostly 20-40, so level I takes 4-8 off it and level IV 7-14. A player caught in 4-8 combos a fight saves about 15-60 health at level I: about one flask's worth at the top end. 1.5 s covers a boss's next blow in a string (most strings space blows 0.3-1 s apart).

## Engine work

- Reuses the perk `when: 'hurt'` (Vengeance's: `abilityHurt` runs on losing health). New `then: 'ironSkin'`: `ABILITY_PERKS['hurt/ironSkin'] = ['cut', 'time']`.
- Perk clocks (`abilityPerkState`): `iron` (s left) and `ironCut`. In `abilityHurt`, when `iron` is 0, set it to `time` (a hit inside the 1.5 s does not renew it, so a long combo is softened once and steady pressure cannot keep it up). `abilityClocks` counts it down. In `Player.takeHit`, an enemy's blow while `iron` > 0 does `cut` less (it stacks multiplicatively with the block's cut). Emits `abilityPerk` `{ perk: 'hurt/ironSkin' }` on starting.
- `ABILITY_SHARES` gains `cut` (a share, at most 1), as Ash Veil.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

A perk on the holder's own body: their browser runs it (each client owns its health and defence). The server needs nothing. It touches no teammate. The tint is drawn in the holder's browser, as every perk cue is today.

## Effect

Layered, timed from the hit that starts it (t = 0); a blow taken while it holds at its own hit (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.08 | Set | The body's material tint steps to a dull iron grey (the hurt tint's slot, a flat colour mix, not a flash) | `#5c5952` mix at 60% |
| 0.08-1.50 | Hold | The tint eases back toward normal over the time, so its fading shows the time left | `#5c5952` to none |
| t' 0.00-0.25 | Glance | 10 short bone-white spark streaks glance off the struck side | `#f4f1e8` heads, `#8c877b` tails |

Budget (Common class): 0 meshes (the body's own tint), 10 particles a glance (6 on Normal), no light, no ribbon, no impact frame. Peak 0.08 s at the set. Reduced motion: no change needed (a held tint, not a flash).

## Sound

Reuse `abilityClank` (Iron Blood's: a metallic transient and a low iron ring) at pitch 0.85 and vel 0.6 when it starts; a blow while it holds plays it again at pitch 1.1, vel 0.4. The holder's only.

## Camera

No camera kick: commons never take one (the hit has its own). camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/grit-1.webp`: the swordsman taking a hit and staggering, their body flashing to dull iron grey, sparks glancing off as a follow-up blow comes.
