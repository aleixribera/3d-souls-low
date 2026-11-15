# Hundred Suns

| | |
| --- | --- |
| Id | `hundred-suns` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `finisher`: the holder's Finishing Blow opens its cuts |
| Origin | New |

## Card

**Finishing Blow: every cut erupts in sunfire.** (7 words, 44 chars)

- Icon (48×48 line drawing): three crossed cut lines over a small circle, each line flaring into a long blade shape at both ends, a star.
- Hover loop (1.8 s): a small figure flash-steps through a boss three times, three cut lines hanging (0.6 s); they open, and each erupts into two blades of sun fire bursting outward, the brighter frame (0.2 s); the star burns behind the figure's back-turned held pose (0.7 s); fade (0.3 s).

## Idea

When the Finishing Blow's cut lines open, each one erupts in blades of sun fire bursting outward in a star. The biggest moment of every fight gets bigger: the time stop, the flash steps, the held pose with your back to the boss, and then a sun goes off behind you. It needs no key and no aim; it asks only that you earn the Finishing Blow.

## Data

```js
{ id: 'hundred-suns', name: 'Hundred Suns', rarity: 'legendary',
  text: 'Finishing Blow: every cut erupts in sunfire.',
  power: { when: 'finisher', then: 'sunLines' },
  levels: [
    { strikes: 6, damage: 45 },
  ] },
```

Numbers: 6 × 45 = 270 a Finishing Blow, on top of its own 480 on a boss (a 56% boost). Finishing Blows come one to three times a fight (three counters within the crack's 10 s), so 270-810 a fight; the sheets also cut any other enemy within reach of the star. On the bar for a player who counters well, nothing for one who doesn't.

## Engine work

- New `finisher/sunLines`: `['strikes', 'damage']`, fired from the `finisher` event (`js/finisher.js`, the cuts opening) on the finished enemy.
- `strikes` sheets, two from each cut line (`CONFIG.finisher.steps` = 3), one out each side of the body along the cut's direction, each 8 m long and 1.5 m wide: `damage` to the finished enemy for each sheet (so all six land on it) and to every other enemy a sheet crosses. `validate.js` checks `strikes` is a whole multiple of `CONFIG.finisher.steps` and that `damage` is set.
- The Finishing Blow's own bossCap rule is unchanged; the sheets are a power's blows after it (they never leave a boss at 1 hp or skip a phase change).

## Multiplayer

The server runs the Finishing Blow (any player's counters count, the one landing the third gets it), so it fires the sheets for that holder only. Enemies only; sheets pass through teammates. One holder per team.

## Effect

Timed from the cuts opening (t = 0; the Finishing Blow's own 1.06 s and hit-stop come first):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| -1.06 to 0.00 | Anticipation | The Finishing Blow's own frozen time and flash steps; each cut line it leaves hangs with a thin white-gold core, brighter than usual | `#fff6d8` lines |
| 0.00 | Peak (eruption) | The cuts open and every line erupts: two flat sheets of sun fire burst out of each, 8 m long, white-gold core, ember edges, black ink outline, in a six-pointed star round the boss; 40 sparks. **The impact frame** (it replaces the Finishing Blow's own flash at this moment, so there is still one) | `#fff6d8` core, `#e59a5c` edge, `#0b0b0f` ink |
| 0.00-0.60 | Burn | The sheets hang and burn from their tips inward; heat shimmer; the holder holds the Finishing Blow's pose, back to the boss | `#e59a5c`, `#fff3dc` |
| 0.60-1.30 | Fade | The star shrinks into the boss and goes out; sun motes drift up | `#e59a5c` to transparent |

Budget (Legendary class): 4 pooled meshes (6 sheets as one instanced mesh, star glow disc, heat plane, the brighter cut-line core) + 40 sparks + 40 motes = 80 particles (44 on Normal), 2 effect lights (the star's centre, a warm fill; × 0.65 on Normal), no ribbon, 1 impact frame at t = 0 (shared with the Finishing Blow's moment, never added to it). Peak 0.6 s. The boss is held through the Finishing Blow, so no tell is hidden. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

New `abilitySuns`: layered on the Finishing Blow's own cut sound, a bright rising shimmer (sine partials at 880, 1320 and 1760 Hz, 0.1 s attack) into a wide roar of fire (pink noise, band-pass 600 Hz to 2 kHz, drive 2, 0.6 s) and a sub bloom (sine 48 to 30 Hz, 0.8 s). Tail: a high choir-like tone fading (sine 1760 Hz, 1 s, heavy reverb).

## Camera

`CONFIG.camera.feel.powers.sunLines = [3.4, 0.1]` at the eruption, on top of the Finishing Blow's own punch (the total stays under `maxFov`).

## Images

- `img/hundred-suns-1.webp`: many white-gold sheets of sun fire with ember edges erupting from the cut lines of a multi-cut finishing blow on a boss, a star pattern.
- `img/hundred-suns-2.webp`: the swordsman in a held pose with their back to the boss as the sun fire erupts behind them.
