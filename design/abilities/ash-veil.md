# Ash Veil

| | |
| --- | --- |
| Id | `ash-veil` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key), once a fight |
| Trigger | `low`: the holder's health falls to or under a third of the bar (`below`) |
| Origin | New |

## Card

**Low health: the next blow does {cut} less.** (8 words, 38 chars; level I reads "Low health: the next blow does 40% less.")

- Icon (48×48 line drawing): a figure outline wrapped in two loose curling strokes, a short falling blade line meeting them.
- Hover loop (1.8 s): a bar drops to a third (0.3 s), two curling strokes wrap the figure (0.4 s), a blow falls and the strokes burst into flakes (0.3 s); hold, fade.

## Idea

Once a fight, falling under a third of your bar wraps you in a veil of grey ash that eats most of the next blow. It is a second chance you can see coming: the veil is on you, so you know you have one blow of grace, and so does a friend watching. It rewards nothing by itself; it buys the time to drink, dash out or land the counter that turns it round.

## Data

```js
{ id: 'ash-veil', name: 'Ash Veil', rarity: 'common',
  text: 'Low health: the next blow does {cut} less.',
  perk: { when: 'low', then: 'veil', once: true },
  levels: [
    { below: 0.33, cut: 0.4 },
    { below: 0.33, cut: 0.5 },
    { below: 0.33, cut: 0.6 },
    { below: 0.33, cut: 0.7 },
  ] },
```

Numbers: a third of 120 is 40; a boss blow is mostly 20-40. Level I takes 8-16 off that one blow, level IV 14-28: often the difference between surviving the follow-up and not. Once a fight, so its whole worth is one blow: a small, clear safety pick, below Iron Blood's level IV but felt at the moment it matters.

## Engine work

- Reuses the perk `when: 'low'` (Last Breath's `low/freeDash`). New `then: 'veil'`: `ABILITY_PERKS['low/veil'] = ['below', 'cut']`.
- New: `once` on a perk (until now only powers had it). validate.js: `perk.once` is `true` or `false`, as `power.once`.
- Perk clocks (`abilityPerkState`): `veil` (0 idle, 1 on, 2 spent this fight). In `abilityHurt`, when health is now at or under `below` and `veil` is 0, set it to 1 and emit `abilityPerk` `{ perk: 'low/veil' }`. In `Player.takeHit`, an enemy's blow while `veil` is 1 does `cut` less (before the block's cut), sets `veil` to 2 and emits `{ perk: 'veil/spent' }`. Falls, burns and ground fire do not spend it. `veil` is 0 again at each fight's start.
- `ABILITY_SHARES` gains `cut` (a share, at most 1).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

A perk on the holder's own body: their browser runs it (each client owns its health and defence). The server needs nothing. It touches no teammate. The veil and its burst are drawn in the holder's browser, as every perk cue is today.

## Effect

Layered: the veil from the moment it arms (t = 0), the burst from the blow (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.40 | Wrap | A grey ash veil swirls up round the body from the feet: a loose open spiral band (one pooled mesh), flat two-tone ash texture with dark ink edges, 1.8 m tall | `#8c877b` body, `#4a4740` shade, `#cfc8b6` leading edge, `#16130f` ink edge |
| 0.40 on | Hold | It turns slowly round the body (0.3 turns a second) at 45% opacity until the blow | as above |
| t' 0.00 | Burst | The band breaks into 20 flat ash flakes thrown outward from the blow's side, turning | `#8c877b`, `#cfc8b6`, `#16130f` |
| t' 0.00-0.50 | Settle | The flakes slow and drift down, fading | to transparent |

Budget (Common class): 1 pooled mesh (the band), 20 particles (11 on Normal), no light, no ribbon, no impact frame. Peak 0.4 s at the wrap; the held band is a quiet low-opacity aura (its only long layer, kept translucent so it never hides the boss's tells), and the burst lasts 0.5 s. Reduced motion: the band holds still instead of turning.

## Sound

`abilityVeil` (new, in `js/data/audio.js`): on arming, a soft rising whoosh (pink noise, band-passed sweeping 300 to 900 Hz over 0.4 s, vel 0.4); on the blow, a transient soft puff (low-passed noise at 600 Hz, 50 ms), a body of a dusty hiss (high-passed noise at 2 kHz, decaying over 0.4 s), a tail of a short room (verb 0.4). The holder's only.

## Camera

No camera kick: commons never take one. camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/ash-veil-1.webp`: a wounded swordsman wrapped in a swirling veil of grey ash, a boss blow landing and the veil bursting into flakes that absorb it.
