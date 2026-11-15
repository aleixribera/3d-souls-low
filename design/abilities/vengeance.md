# Vengeance

| | |
| --- | --- |
| Id | `vengeance` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `hurt`: you lose health to any blow, burn or fall |
| Origin | Kept from js/data/abilities.js: the same perk, text and numbers; new look and sound |

## Card

**Get hit: next hit in {window} does {damage} more.** (9 words, 35 chars)

- Icon (48×48 line drawing): a blade pointing up with a jagged crack across its middle and two short flame tongues rising off the crack.
- Hover loop (1.6 s): a small figure takes a blow and staggers (0.3 s), blue-black flame climbs its blade (0.4 s), it lunges and the hit lands with a blue star (0.3 s); hold, fade.

## Idea

Getting hit stops being only a loss: for three seconds the blade carries cold fury, and the answer you throw at once hits much harder. It turns the moment after a mistake into a choice, back off and drink, or trade back right now.

## Data

```js
{ id: 'vengeance', name: 'Vengeance', rarity: 'rare',
  text: 'Get hit: next hit in {window} does {damage} more.',
  perk: { when: 'hurt', then: 'empower' },
  levels: [
    { window: 3, damage: 0.3 },
    { window: 3, damage: 0.4 },
    { window: 3, damage: 0.5 },
  ] },
```

Numbers: one empowered blow per blow taken. A player new to the genre takes 8-15 blows a fight; about half get answered inside 3 s, so 4-8 empowered blows of about 20-35 damage each: +25-90 damage a fight at levels I-III, more on a heavy. A comeback perk, kept small because it pays for being hit.

## Engine work

- None for the rule: `hurt/empower` exists (abilityHurt arms `vengeance`, abilityStrike spends it).
- New: the armed state is drawn. The `abilityPerk` event gets `perk: 'hurt/armed'` when the window opens (abilityHurt) and the existing `empower` when it is spent; js/ability-fx.js draws the blade flame while `perk.vengeance > 0` on the local player's body, reading the clock each frame (no allocation).

## Multiplayer

The perk runs where the blow is settled: health is the client's own, so the browser arms the window; the blow's extra damage is applied by the owner of the enemies (abilityStrike on the server), which keeps its own perk clocks from the claims it accepted. Only the holder's own blows are raised; nothing reaches a teammate.

## Effect

Layered, timed from the blow taken (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.10-3.00 | Blade flame | A flat sheath of hard-edged flame tongues along the blade, blue-black body with a blue outer edge, licking up toward the tip; dims over the last 0.5 s of the window | `#1a2a3c` body, `#8fb8dc` edge, `#0e1218` ink |
| 0.10-0.30 | Eye glint | A small blue glint under the hood, once | `#cfe2f2` |
| 0.10-3.00 | Embers | 2 sharp blue flakes a second shed off the blade tip | `#8fb8dc` |
| hit | Answer | A hard-edged blue impact star at the hit point, 1.2 m, with 12 shard streaks thrown out | `#f2f6fa` core, `#8fb8dc` edge |

Budget (Rare class): 3 pooled meshes (blade sheath, glint, impact star) + 6 ember flakes and 12 shards (10 on Normal), 1 effect light (blue, 0.2 s at the answering hit, × 0.65 on Normal), no ribbon, no impact frame (the pool's look names one; a rare gets the impact star at the hit instead). Peak 0.15 s. Reduced motion: no change needed (no flash).

## Sound

`abilityEmpower` (kept) plays on the answering hit. New `abilityFury` when the window opens: a low cold whoosh of flame catching (band-passed noise 300-900 Hz, 0.25 s), a soft breath tail (0.3 s), under the hurt sound.

## Camera

No new kick: the hurt push and the hit punch already move the view. The shared `perkFov` (-0.9) plays on the answering hit; no `powers` entry.

## Images

- `img/vengeance-1.webp`: a wounded swordsman rising from a hit, blue-black flame crawling up the blade, eyes glinting blue, ready to strike back.
