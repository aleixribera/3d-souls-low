# Grave Feast

| | |
| --- | --- |
| Id | `grave-feast` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels; a crate reward |
| Kind | Triggered (no key) |
| Trigger | `finisher`: your Finishing Blow lands (its cut lines open) |
| Origin | Kept from js/data/abilities.js: the same perk, text, numbers and crate; the heal is drawn from the cut lines |

## Card

**Finishing Blow: heal {heal}.** (4 words, 23 chars)

- Icon (48×48 line drawing): three crossing cut lines with a thin stream curling off them into a drop.
- Hover loop (1.8 s): a small figure flashes through a boss leaving three white cut lines (0.5 s), the lines open and blue light streams from each back into the figure (0.6 s), a soft ring at its feet; fade.

## Idea

A crate reward: the Finishing Blow heals big. The boss's cut lines bleed blue light back into you, so the moment of the fight that already feels best also turns it around.

## Data

```js
{ id: 'grave-feast', name: 'Grave Feast', rarity: 'rare', crate: true,
  text: 'Finishing Blow: heal {heal}.',
  perk: { when: 'finisher', then: 'heal' },
  levels: [
    { heal: 0.25 },
    { heal: 0.35 },
    { heal: 0.45 },
  ] },
```

Numbers: 2-4 Finishing Blows a fight, each worth half a flask to a full one (a flask is about 40%). Big, but every heal is earned by two counters and the Finishing Blow, so it follows skill.

## Engine work

- None for the rule: `finisher/heal` exists (its cue is `execute/heal` in js/ability-fx.js and js/audio.js; rename it `finisher/heal` with the perk).
- New look: the heal cue reads the Finishing Blow's cut lines (js/finisher.js keeps their ends) and sends one stream from each line's middle to the player's chest.

## Multiplayer

The heal is the client's own (health is the player's). The Finishing Blow itself is checked by the server as today. Only the holder heals.

## Effect

Layered, timed from the cut lines opening (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Streams | One flat ribbon of blue light from each cut line's middle, curving into the player's chest, its head a hard white droplet | `#8fb8dc` edge, `#f2f6fa` head, `#0e1218` ink |
| 0.40-0.80 | Fill | 20 small hard flakes rising round the player | `#cfe2f2` |
| 0.45 | Ring | A soft-edged heal ring at the feet, 0.5 to 2 m | `#8fb8dc` to transparent |

Budget (Rare class): 4 pooled meshes (3 stream heads, 1 ring) + 20 particles (11 on Normal), 1 effect light (blue, 0.4 s, × 0.65 on Normal), 1 ribbon (the streams share one ribbon of 3 strands), no impact frame (the Finishing Blow keeps its own frozen frame). Peak 0.8 s. Reduced motion: no change needed (no flash).

## Sound

`abilityHeal` (kept, pitch 0.8): the soft rising chord, started as the streams reach the chest (t = 0.45), with a low breath of air (pink noise 300-800 Hz, 0.4 s) as the streams draw out.

## Camera

No camera kick: the Finishing Blow already has its own camera moment. No `powers` entry.

## Images

- `img/grave-feast-1.webp`: the cut lines of a multi-cut finishing blow on a boss bleeding streams of blue light that flow back into the swordsman.
