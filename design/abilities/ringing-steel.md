# Ringing Steel

| | |
| --- | --- |
| Id | `ringing-steel` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key) |
| Trigger | `parry`: the holder deflects a blow |
| Origin | New |

## Card

**Deflect: your next dash is free.** (6 words, 32 chars)

- Icon (48×48 line drawing): two crossed blade strokes with two concentric arcs ringing out from the cross, and a short dash arrow beneath.
- Hover loop (1.6 s): a blade line meets a falling blow (0.1 s), two rings spread from the clash (0.4 s), the figure dashes away leaving a faint ringing trail (0.4 s); hold, fade.

## Idea

Each deflect rings and banks a free dash. The deflect leaves you face to face with the boss; the free dash is the way round it to its back for the counter, even with your charges spent. It ties the two defences together: deflect, then dash, and the dash costs nothing. The ring you see and hear is the reminder that one is banked.

## Data

```js
{ id: 'ringing-steel', name: 'Ringing Steel', rarity: 'common',
  text: 'Deflect: your next dash is free.',
  perk: { when: 'parry', then: 'freeDash' },
  levels: [{ cooldown: 6 }, { cooldown: 5 }, { cooldown: 4 }, { cooldown: 3 }] },
```

Numbers: a charge comes back in 1.3 s, so a free dash is worth about 1.3 s of refill, and it matters most at zero charges, when it is the only dash there is. At most one bank every 6 s at level I (about 10 a fight if you deflect that often) and every 3 s at level IV. Banks never stack past one.

## Engine work

- Reuses the perk `when: 'parry'` (Iron Mercy's) and the `freeDash` effect (Last Breath's `low/freeDash`). New pair `ABILITY_PERKS['parry/freeDash'] = ['cooldown']`.
- Perk clocks (`abilityPerkState`): `freeDash` (0 or 1, a banked dash) and `ring` (s until it may bank again). A deflect with `ring` at 0 sets `freeDash = 1` and `ring = cooldown`; `abilityClocks` counts `ring` down.
- `Player.freeDash()` also returns true while `perk.freeDash` is 1, and the dash that uses it spends the bank instead of a charge (js/player.js line 151): so `canRoll` allows a dash at zero charges. The bank is cleared at the fight's end.
- Emits `abilityPerk` `{ perk: 'parry/freeDash' }` on banking and `{ perk: 'freeDash/spent' }` when the dash uses it (drawing and audio listen).
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

A perk on the holder's own body: their browser runs it (each client owns its movement and dashes). The server needs nothing: it never checks dash charges. It moves only its holder. The ring and the trail are drawn in the holder's browser only, as every perk cue is today (`abilityPerk` is the local player's); teammates see the deflect's own spark.

## Effect

Layered, timed from the deflect (t = 0); the trail plays on the free dash itself (t' = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Ring | A clear flat ring of sound, upright, centred on the clash point and facing the attacker: two hard thin concentric rings, white core lines with bone edges, a dark ink line outside the outer one | `#f4f1e8` lines, `#cfc8b6` edge, `#16130f` ink |
| 0.00-0.35 | Spread | Both rings expand from 0.3 m to 1.6 m, the inner a beat behind, thinning | as above |
| 0.25-0.45 | Fade | They fade out | to transparent |
| t' 0.00-0.40 | Trail | On the free dash: the dash's existing afterimages tinted bone, and a faint ring shape left at the start of the dash, fading | `#cfc8b6`, `#8c877b` |

Budget (Common class): 2 pooled meshes (the two rings; the trail reuses js/afterimage.js's pooled figures, tinted, and one of the rings), 0 particles, no light, no ribbon, no impact frame. Peak 0.35 s. Reduced motion: the rings fade in place without spreading.

## Sound

`abilityRing` (new, in `js/data/audio.js`): no hard transient (the deflect's own clash is the hit), a body of a clear bell partial (sine 1760 Hz with partials at 1.5× and 2.76×, decaying over 0.6 s), a tail of a short room (verb 0.45). On the free dash it plays again at pitch 0.9, vel 0.35, the holder's only.

## Camera

No camera kick: commons never take one (the deflect has its own). camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/ringing-steel-1.webp`: the swordsman deflecting a blow with a bright clash, a crisp ring of sound waves expanding from the blade, then dashing away leaving an echoing trail.
