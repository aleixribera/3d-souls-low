# Ironclad

| | |
| --- | --- |
| Id | `ironclad` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `flask`: you start drinking a flask |
| Origin | New |

## Card

**Flask: no blow staggers you for {time}.** (7 words, 34 chars)

- Icon (48×48 line drawing): a small flask with three overlapping plate shapes behind it, like scales.
- Hover loop (1.8 s): a small figure lifts a flask (0.3 s), blue plates ripple over it from the hand outward (0.3 s), a boss's heavy blow lands on it and glances off in blue sparks while it keeps drinking (0.6 s); fade.

## Idea

Drinking turns the skin to blued steel: heavy blows can no longer stagger you or cut the drink short while you heal and strike back. The player still takes the damage, so it buys certainty, not safety. It takes the most punishing moment for new players (a drink cut short) and makes it a choice.

## Data

```js
{ id: 'ironclad', name: 'Ironclad', rarity: 'rare',
  text: 'Flask: no blow staggers you for {time}.',
  perk: { when: 'flask', then: 'unshaken' },
  levels: [
    { time: 3 },
    { time: 4 },
    { time: 5 },
  ] },
```

Numbers: a drink takes about 1.5 s, so 3 s covers the drink and one answer; 5 s covers the drink and a full light string. Blows still deal full damage, so drinking into a combo still costs health; it only keeps the heal and the answer.

## Engine work

- New perk `flask/unshaken`: ['time'] in ABILITY_PERKS, on the body's owner. Perk clock `unshaken` (s left) in abilityPerkState and abilityClocks, set to `time` when the drink starts (Player.useItem, where `flask` is reported).
- Player.takeHit (js/player.js): while `perk.unshaken > 0`, a blow that lands deals its damage but sets no `HURT` or stagger state, no knockback, and does not cut a drink short. Deaths still go through Player.die().
- `abilityPerk` cues `flask/unshaken` at the start and `unshaken/glance` on each blow taken in it.

## Multiplayer

Health and defence are the client's own (AGENTS rule 7): the browser applies the perk to its own body. It never touches a teammate, and a boss's blow still reaches the holder.

## Effect

Layered, timed from the drink's start (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Plates | Flat blue-steel plates rippling over the player from the flask hand outward, a scale-like overlay with ink seams | `#3d5c78` plate, `#8fb8dc` edge, `#0e1218` ink |
| 0.30-time | Sheen | The plates settle into a thin blue rim on the body's silhouette, fading over the last 0.5 s | `#8fb8dc` |
| each blow | Glance | 12 hard blue sparks thrown off the hit point and a small flat star | `#f2f6fa`, `#8fb8dc` |

Budget (Rare class): 2 pooled meshes (the plate overlay shell, the glance star) + 12 sparks a blow (7 on Normal), no effect light, no ribbon, no impact frame. Peak 0.3 s. Reduced motion: no change needed (no flash).

## Sound

`abilityIronclad` (new, in `js/data/audio.js`): a transient of a metallic clink (sine 1.1 kHz with inharmonic partials 2.4 and 3.9, 40 ms), a body of steel plates sliding into place (band-passed noise 1.5-3 kHz, three quick 30 ms grains), a tail of a low ring (sine 220 Hz, 0.5 s). Each blow glancing off adds a short anvil tick (sine 1.8 kHz, 0.12 s) over the hurt sound.

## Camera

No camera kick: the blows taken still push the view as usual. No `powers` entry.

## Images

- `img/ironclad-1.webp`: the swordsman drinking a flask as plates of blued steel ripple across their skin, a boss's heavy blow glancing off in blue sparks.
