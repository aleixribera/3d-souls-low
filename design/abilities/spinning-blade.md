# Spinning Blade

| | |
| --- | --- |
| Id | `spinning-blade` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**A ghost blade cuts through the boss twice.** (8 words, 42 chars)

- Icon (48×48 line drawing): a sword drawn as a spinning disc (a circle with a blade stroke across it) on a looping arrow that goes out and curves back.
- Hover loop (1.8 s): a small figure throws (0.2 s), a spinning blue disc flies out through the boss (0.4 s), curves round and cuts back through it (0.4 s) into the figure's hand; fade.

## Idea

Throw a spinning ghost copy of your sword: it cuts through the boss and comes back through it. Two cuts for one press, and anything else on the path is cut both ways too.

## Data

```js
{ id: 'spinning-blade', name: 'Spinning Blade', rarity: 'rare', key: 'strike',
  text: 'A ghost blade cuts through the boss twice.',
  power: { when: 'press', then: 'boomerang' },
  levels: [
    { charge: 15, damage: 45, hits: 2 },
    { charge: 14, damage: 55, hits: 2 },
    { charge: 13, damage: 65, hits: 2 },
  ] },
```

Numbers: `hits` × `damage`: 90, 110 and 130, so 6, 7.9 and 10 damage a point on the target, the same again to anything else on the path. The second cut lands CONFIG.abilities.boomerang.time (0.7 s) after the first, so a boss that leaps away after the first cut can dodge the return.

## Engine work

- New power `press/boomerang`: ['charge', 'damage', 'hits'] in ABILITY_POWERS. A blade path from the holder to `boomerang.past` (2 m) beyond the press target and back; each pass (`hits` of them, out and back) wounds every enemy within `boomerang.width` (1 m) of the path once, the out pass at `time / 2` × its share of the way, the back pass on the return (running entries).
- `validate.js`: CONFIG.abilities.boomerang { time above 0, past from 0, width above 0 }.

## Multiplayer

The browser claims the press; the server checks the charge and runs both passes from its own copy of the holder's position against its own enemies. The blade returns to where the holder was at the press (it never chases or pulls the holder). Enemies only: it passes through teammates. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Throw | A short slash arc off the throwing arm | `#f2f6fa`, `#8fb8dc` edge |
| 0.05-0.75 | Disc | A translucent blue copy of the sword spinning flat into a disc of light, 1.4 m, ink-edged, flying out and curving back | `#8fb8dc` 60%, `#f2f6fa` core, `#0e1218` ink |
| 0.05-0.75 | Trail | A ring-shaped trail along its path, fading over 0.3 s behind it | `#8fb8dc` to transparent |
| each cut | Cut | A thin slash line on the body where the disc passes and 8 hard sparks | `#f2f6fa`, `#cfe2f2` |
| 0.75-0.90 | Catch | The disc shrinks into the holder's blade with a small glint | `#f2f6fa` |

Budget (Rare class): 3 pooled meshes (disc, slash line, catch glint) + 16 sparks per enemy cut (9 on Normal), 1 effect light (blue, carried with the disc, × 0.65 on Normal), 1 ribbon (the trail), no impact frame. Peak 0.75 s. Reduced motion: the disc's spin slows to half (no strobing).

## Sound

`abilityBoomerang` (new, in `js/data/audio.js`): a transient of a sharp release swish (white noise band-passed 2-4 kHz, 50 ms), a body of a whirring hum that rises as it comes back (saw 140 Hz with a 12 Hz amplitude wobble, low-passed at 1.2 kHz, 0.7 s, gliding up a fifth), a cut tick at each pass (sine 1.8 kHz, 0.1 s), a tail of a clean catch ring (sine 990 Hz, 0.3 s).

## Camera

`CONFIG.camera.feel.powers.boomerang = [-0.8, 0.02]`: a small pull in at the throw.

## Images

- `img/spinning-blade-1.webp`: a spinning translucent blue ghost sword forming a disc of light, cutting through a boss and curving back toward the swordsman, a ring-shaped trail.
