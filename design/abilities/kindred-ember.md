# Kindred Ember

| | |
| --- | --- |
| Id | `kindred-ember` |
| Rarity | Common (bone ink `#cfc8b6`), 4 levels |
| Kind | Triggered perk (no key), offered only in a party |
| Trigger | `revive` (new): the holder finishes reviving a fallen teammate |
| Origin | New |

## Card

**Revive a friend: they rise with {heal} more health.** (9 words, 46 chars; level I reads "Revive a friend: they rise with 10% more health.")

- Icon (48×48 line drawing): a small ember shape on a ground line with two figure outlines, one kneeling over it, one rising, and a short arc sweeping out from the ember.
- Hover loop (2.0 s): a figure kneels by an ember while a ring fills round it (0.8 s), a second figure rises (0.3 s) and a ring sweeps out from the ember (0.4 s); hold, fade.

## Idea

The co-op common: a friend you revive gets up stronger. Reviving is the most generous thing a player does in Boss Rush (three seconds standing still under a boss's eye); this makes it pay off for the friend, so they are not one blow from falling again the moment they rise. It is only offered in a party, where it can matter.

## Data

```js
{ id: 'kindred-ember', name: 'Kindred Ember', rarity: 'common', party: true,
  text: 'Revive a friend: they rise with {heal} more health.',
  perk: { when: 'revive', then: 'reviveHeal' },
  levels: [{ heal: 0.1 }, { heal: 0.15 }, { heal: 0.2 }, { heal: 0.25 }] },
```

Numbers: a revived player rises with a third of their bar (40 of 120). Level I adds 10% of their bar (about 12, so 52), level IV 25% (about 30, so 70): from "one blow from falling" to "two blows". Revives come 0-3 a fight in a party, so its worth swings with the party's luck; a player alone never sees it.

## Engine work

- New top-level field `party: true`: the offer leaves it out of a run with one player (bots not counted, as revives are people only); validate.js: `party` is only `true`. Like `crate: true`, it is a filter on the offer, not on the kit.
- New `when: 'revive'`: fired for the reviver when a revive they ran finishes (server/simulation.js `reviveStep`, the `risen` entry's `by`). Perks only.
- New `then: 'reviveHeal'`: the risen player's health is `CONFIG.revive.health` plus the reviver's `heal`, of the risen player's bar (capped at the bar). `ABILITY_PERKS['revive/reviveHeal'] = ['heal']`. `heal` is already in `ABILITY_SHARES`.
- Emits `abilityPerk` `{ perk: 'revive/reviveHeal', body: reviver, target: risen }` for the drawing.
- Shared by the effect commons: the validate.js kind rule and the camera-feel.js common skip (see Spark Step).

## Multiplayer

The server decides the revive and already sends the risen player their health (`reviveHealth`, then the risen message's `hp`, which their browser applies). It adds `maxHpOf(risen) × heal` from the reviver's kit to that number. This is the one common that touches a teammate, and only for good: more health on rising. It never slows, moves, links or takes over them. Everyone sees the ring.

## Effect

Layered, timed from the rise (t = 0, the revive's existing rise burst in js/revive.js):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Flare | The revive's ember flares larger: the existing ember sprite scaled 1.6× and warmed, a bone rim on its edge | the ember's own colour, `#cfc8b6` rim |
| 0.05-0.50 | Ring | A flat ring of bone-white ash sweeps out along the ground from the ember to 3 m, hard leading edge, ragged ash trailing edge | `#f4f1e8` leading edge, `#cfc8b6` body, `#4a4740` ash, `#16130f` ink edge |
| 0.10-0.50 | Ash | 16 flat ash flakes lifted by the ring, drifting up and fading | `#cfc8b6`, `#8c877b` |

Budget (Common class): 1 pooled mesh (the ring; the flare is the revive's own ember sprite), 16 particles (9 on Normal), no light, no ribbon, no impact frame. Peak 0.2 s at the flare, all gone by 0.5 s. Reduced motion: no change needed (no flash; the flare is a scale step, once).

## Sound

Reuse `abilityHeal` (a soft rising chord) at pitch 1.1 and vel 0.55, played with the revive's own rise sound, for both the reviver and the risen.

## Camera

No camera kick: commons never take one. camera-feel.js's `perkFov` skips this common's `abilityPerk`.

## Images

- `img/kindred-ember-1.webp`: one warrior kneeling to raise a fallen friend from a glowing ember on the ground, a warm ring of light and ash sweeping out.
