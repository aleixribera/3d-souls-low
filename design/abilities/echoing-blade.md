# Echoing Blade

| | |
| --- | --- |
| Id | `echoing-blade` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `cast`: any of your number keys fires its technique; then each of your next `hits` landed blows |
| Origin | New |

## Card

**After a key fires: next {hits} hits echo.** (8 words, 36 chars)

- Icon (48×48 line drawing): a sword stroke with a second, dotted copy of the same stroke offset just behind it.
- Hover loop (1.8 s): a small key cap fires (0.3 s), a figure hits a boss three times, a translucent blue copy of each swing repeating it a beat later (1.0 s); fade.

## Idea

Firing any key leaves ghost blades on you: your next few hits each land again a beat later. It ties the keys to the sword: spend a technique, then follow up at once to cash in the echoes.

## Data

```js
{ id: 'echoing-blade', name: 'Echoing Blade', rarity: 'rare',
  text: 'After a key fires: next {hits} hits echo.',
  power: { when: 'cast', then: 'ghostBlade' },
  levels: [
    { hits: 3, damage: 12 },
    { hits: 4, damage: 14 },
    { hits: 5, damage: 16 },
  ] },
```

Numbers: 36-80 extra damage a key fired. A player with two or three keys fires one every 6-10 s, so about +4-10 damage a second while they follow up. The echoes wait at most CONFIG.abilities.echo.keep (6 s) for the blows.

## Engine work

- New power `cast/echo`: ['hits', 'damage'] in ABILITY_POWERS. New `when: 'cast'`: abilityPowers fires it on any accepted press (it already sees every press where the enemies are owned). It arms `hits` echoes for the holder for `keep` s; each landed blow of the holder's (the `hits` trigger) spends one and queues a running strike `ECHO_DELAY`-style at CONFIG.abilities.echo.delay (0.15 s) on that enemy for `damage`, with its own `abilityPower` event (`strike`: its number).
- An echo is a power's strike: it never counts as a blow, never sets off another power, and never echoes itself.
- `validate.js`: CONFIG.abilities.echo { keep above 0, delay from 0 to 0.5 }.

## Multiplayer

The server sees the press and the landed blows, so it arms and resolves the echoes itself; no new claim. Enemies only. Every browser draws the ghost blade on the holder.

## Effect

Layered, timed from each echoed blow (t = 0 at the holder's hit):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| cast | Arm | 3-5 small blue blade glints orbit the sword hand, one fading as each echo is spent | `#8fb8dc` |
| 0.00-0.15 | Ghost | A translucent flat copy of the sword, ink-edged, repeating the holder's swing path 0.15 s behind | `#8fb8dc` 50%, `#f2f6fa` edge, `#0e1218` ink |
| 0.15 | Cut | A thin blue slash line on the enemy where the ghost lands, 1.6 m, gone in 0.25 s | `#f2f6fa` core, `#8fb8dc` edge |
| 0.15-0.35 | Chips | 6 hard flakes off the cut | `#cfe2f2` |

Budget (Rare class): 3 pooled meshes (ghost blade, slash line, the orbiting glints as one mesh) + 6 particles an echo (4 on Normal), no effect light, 1 ribbon (the ghost blade's trail), no impact frame. Peak 0.35 s an echo. Reduced motion: no change needed (no flash).

## Sound

`abilityGhostBlade` (new, in `js/data/audio.js`): a transient of a thin glassy slice (white noise band-passed at 5 kHz, q 3, 25 ms), a body of a short hollow whoosh (band-passed noise 1.2-2.4 kHz, 0.12 s), a tail of a faint ring (sine 1.5 kHz, 0.3 s). Played at each echo's cut. A soft chime (sine 1.3 kHz, 0.4 s) when the echoes arm.

## Camera

Shares the existing `CONFIG.camera.feel.powers.echo = [-0.6, 0.02]` (the twin's echoed blow), a small pull on each echo.

## Images

- `img/echoing-blade-1.webp`: a swordsman striking a boss while a translucent blue ghost copy of the sword repeats the same slash a moment later.
