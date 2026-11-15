# Time Rift

| | |
| --- | --- |
| Id | `time-rift` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `dodge`: a perfect dodge (14 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level (2.5 s, radius 9, cooldown 14: the old level II); the wave and bubble move from violet to the legendary ember over white-violet, and the bubble now shatters like glass with the one impact frame. |

## Card

**Perfect dodge: the boss freezes for {time}.** (7 words, 38 chars)

- Icon (48×48 line drawing): a circle with a clock's two hands, a curved arrow round it turning backwards, a small sidestep arc beside it.
- Hover loop (1.8 s): a small figure sidesteps a falling blow on the beat (0.3 s); a ring of light runs out and the boss silhouette stops mid-swing inside a bubble, a clock face under it turning backwards (0.9 s); the figure walks past and cuts twice; the bubble cracks and shatters, the brighter frame (0.2 s); fade (0.4 s).

## Idea

A perfect dodge tears a rift in time: everything near stops dead inside a bubble of slow light while you move. The boss hangs mid-swing, its clock turning backwards under it, and you have two and a half seconds to do whatever you like; then the bubble shatters and time comes back with a crack. It turns the best defensive moment into the best offensive one, and the world changing colour is its spectacle.

## Data

```js
{ id: 'time-rift', name: 'Time Rift', rarity: 'legendary',
  text: 'Perfect dodge: the boss freezes for {time}.',
  power: { when: 'dodge', then: 'freeze' },
  levels: [
    { time: 2.5, radius: 9, cooldown: 14 },
  ] },
```

Numbers: no damage of its own; 2.5 s of a boss that can't act is a light string, a heavy finisher and a free counter window, about 90-130 damage, plus safety. Every 14 s at most (perfect dodges come every few seconds for a skilled player), so up to about six a fight: 550-800 damage of openings and a lot of health saved. On the bar as a utility, and the one legendary that makes a newcomer feel in control.

## Engine work

- `dodge/freeze` exists, unchanged: every enemy within `radius` m gets `frozen` = `time`.
- New: the shared hold rest (`CONFIG.abilities.holdRest`, 3 s, see Heaven's Lance) applies, so a party can't chain this with other holds into a boss that never moves; the rift still fires and draws, the frozen boss just isn't frozen again until its rest is over.
- Drawing (`js/ability-fx.js` `rift`): new colours, the glass shatter, and the impact frame on the shatter.

## Multiplayer

The client claims `dodge` (it already does); the server checks it against the attack it knows and the cooldown, and freezes its own enemies. Enemies only: a teammate inside the bubble keeps moving at full speed and sees the bubble's tint at 50% for them. One holder per team.

## Effect

Timed from the perfect dodge (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Anticipation | The dodge's own slow-motion beat (the counter window's); a hairline crack of light opens in the air where the blow passed; the world dims 20% | `#ece6ff` crack, `#e59a5c` rim |
| 0.20-0.45 | Wave | A ring of ember-tinted light runs out from the crack to `radius` m, flat, hard-edged, white-violet inside | `#ece6ff` core, `#e59a5c` edge, `#0b0b0f` ink |
| 0.45-2.95 | Bubble | Each frozen enemy sits in a sphere of slow light; inside it the colour drains to grey; falling ash inside hangs still; a clock face of thin ember lines turns backwards on the floor under it; the frozen body keeps a faint afterimage of its last motion | `#ece6ff` sphere at 25%, `#8a8478` grey, `#e59a5c` clock |
| 2.70-2.95 | Strain | Cracks run across the bubble; the clock's hands spin faster | `#fff3dc` cracks |
| 2.95 | Peak (the shatter) | The bubble breaks like glass: 40 curved shards fly out and fall; colour snaps back. **The impact frame** | `#fff3dc`, `#e59a5c` shard edges |
| 2.95-3.50 | Fade | Shards fall and fade before they reach the floor; the clock face dissolves | `#e59a5c` to transparent |

Budget (Legendary class): 6 pooled meshes (crack, wave ring, bubble sphere, clock face, afterimage shell, shard sheet), up to 2 bubbles with two bosses (8 meshes) + 30 hanging ash + 40 shards = 70 particles (39 on Normal), 2 effect lights (the wave, cool; the shatter; × 0.65 on Normal), no ribbon, 1 impact frame at the shatter. Peak 0.5 s at the wave, 0.55 s at the shatter (the bubble between is an aura of 3 meshes). A frozen boss makes no wind-up, so nothing is hidden. Reduced motion: the impact frame becomes a 30% darken, no shake, the grey fades in over 0.3 s instead of cutting.

## Sound

`abilityFreeze` kept (the world's sound sucked backwards, a glassy chime, a clock ticking slow). New tail `abilityRiftBreak` at the shatter: a crisp glass burst (many short bandpassed clicks at 4-7 kHz over 0.3 s) and the world's sound rushing back (a reversed-reverb swell into the room tone, 0.25 s).

## Camera

`CONFIG.camera.feel.powers.freeze = [-3.2, 0.05]` kept for the wave; new `riftBreak = [1.6, 0.04]` at the shatter.

## Images

- `img/time-rift-1.webp`: a boss frozen mid-attack inside a bubble of slow ember-tinted light with a giant clock face turning backwards beneath it, the swordsman moving freely past.
- `img/time-rift-2.webp`: the frozen bubble shattering like glass as time resumes.
