# Patience

| | |
| --- | --- |
| Id | `patience` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `unhurt`: `after` s pass without you losing health; the next blow that lands spends it |
| Origin | Kept from js/data/abilities.js: the same perk, text and numbers; new look (the still blade, the brush stroke) |

## Card

**{after} unhurt: next hit does double.** (6 words, 31 chars)

- Icon (48×48 line drawing): one thick calligraphy brush stroke crossing a straight blade.
- Hover loop (1.8 s): a small figure stands still while a clock ring closes round it (0.8 s), its blade edge goes pale blue (0.2 s), it cuts once and a thick blue brush stroke crosses the card (0.4 s); hold, fade.

## Idea

Untouched for a while, the blade stills, and the next hit lands double with one calligraphy stroke. It rewards the calm player who keeps their distance and picks the moment, and it reads at once: the pale edge says "ready".

## Data

```js
{ id: 'patience', name: 'Patience', rarity: 'rare',
  text: '{after} unhurt: next hit does double.',
  perk: { when: 'unhurt', then: 'empower' },
  levels: [
    { after: 8, damage: 1 },
    { after: 6.5, damage: 1 },
    { after: 5, damage: 1 },
  ] },
```

Numbers: one doubled blow per 5-8 s unhurt. A good player is unhurt most of a 90 s fight: 6-12 doubled blows, and a skilled one saves it for a heavy counter (about 94, doubled to 188). About +150-500 a fight, more the better the player: the perk of the patient.

## Engine work

- None for the rule: `unhurt/empower` exists (`perk.calm`).
- New look: js/ability-fx.js draws the still edge while `perk.calm >= after` on the local player, and the brush stroke on the `empower` cue when it was Patience that was spent (abilityStrike's `empowered` blow; the cue carries `perk: 'unhurt/empower'` so it is told apart from Vengeance).

## Multiplayer

Health is the client's own, so the browser keeps the clock; the server keeps its own from the claims it accepted and doubles the blow where the enemies are owned. Only the holder's blow is raised.

## Effect

Layered, timed from the doubled blow's hit (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| ready | Still edge | The blade's edge lit an even pale blue with no flicker, a white hairline along it | `#cfe2f2`, `#f2f6fa` |
| 0.00-0.10 | Stroke | One thick flat brush stroke, 4 m long, laid along the swing through the boss, tapering, with dry-brush gaps at its tail | `#8fb8dc` body, `#f2f6fa` core, `#0e1218` ink edge |
| 0.10-0.60 | Hold | The stroke hangs still, then thins from its tail and fades | as above to transparent |
| 0.00-0.30 | Ink spatter | 10 hard ink drops flung off the stroke's end | `#0e1218` |

Budget (Rare class): 2 pooled meshes (edge, stroke) + 10 particles (6 on Normal), 1 effect light (pale blue, 0.2 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.6 s. Reduced motion: no change needed (no flash).

## Sound

`abilityEmpower` (kept) plus a new layer for Patience: a soft brush swish (pink noise band-passed 1-2.5 kHz, 0.2 s) before the hit and a single clear bell tone (sine 660 Hz with a 2.76 partial, 0.8 s) after it. When the edge becomes ready, a quiet tick (1.6 kHz, 30 ms).

## Camera

No new kick: the doubled blow already gets the heavy-hit punch (`heavyHitFov`, from `punchFrom` damage). The shared `perkFov` (-0.9) plays as the stroke is drawn; no `powers` entry (a perk has none).

## Images

- `img/patience-1.webp`: a calm swordsman in a still stance, the blade edge glowing pale blue, then a single thick blue calligraphy brush stroke cutting across a boss.
