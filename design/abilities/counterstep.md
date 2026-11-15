# Counterstep

| | |
| --- | --- |
| Id | `counterstep` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `dodge`: a perfect dodge (a boss blow meets the dash's untouchable first frames) |
| Origin | Kept from js/data/abilities.js: was `dodge/riposte` (a perfect dodge opens a riposte, which the base game now does since pass 95); now `dodge/flashBehind`, with a shorter `window` and a `cooldown` |

## Card

**Perfect dodge: flash-step behind the boss.** (6 words, 42 chars)

- Icon (48×48 line drawing): a curved arrow hooking round a small circle (the boss), with three short ghost strokes along the arrow's tail.
- Hover loop (1.4 s): a small figure dashes through a falling blow (0.4 s), streaks round the boss in a blue arc with three fading ghost figures (0.25 s), lands behind it inside a blue ring and holds (0.5 s); fade.

## Idea

The perfect dodge already opens a counter. Counterstep makes that counter land from the best angle: the instant the dodge reads, you flash round the boss and stand at its back, facing it, with a slightly longer counter window. A shield-bearing boss can no longer turn the counter on its shield, and the step itself reads as the anime flash step the game is built on. It never fires on a plain dash, only on the skill.

## Data

```js
{ id: 'counterstep', name: 'Counterstep', rarity: 'rare',
  text: 'Perfect dodge: flash-step behind the boss.',
  perk: { when: 'dodge', then: 'flashBehind' },
  levels: [
    { window: 1, cooldown: 3 },
    { window: 1.2, cooldown: 2.5 },
    { window: 1.4, cooldown: 2 },
  ] },
```

Numbers: `window` replaces the counter window the perfect dodge opens (CONFIG.player.counterTime, 0.8 s) with 1-1.4 s, so the counter still fits after the 0.12 s step. `cooldown` keeps it from chaining on a boss's multi-hit combo: one step per 2-3 s, and a second perfect dodge inside the cooldown opens the plain counter. No damage of its own: its worth is position (every counter from behind, never into a shield) and the extra 0.2-0.6 s to land it.

## Engine work

- New perk `dodge/flashBehind`: ['window', 'cooldown'] in ABILITY_PERKS, replacing `dodge/riposte`. It runs on the body's owner (the browser for a person, the server for a bot) when the `dodge` event fires: if the attacker is within CONFIG.abilities.flashBehind.range (6 m) and its back is on walkable floor, the player moves to `radius + gap` (gap 1.2 m) behind the attacker's facing over 0.12 s, untouchable, turned to face it, and the open counter's time is set to `window`. If the spot behind is a wall, a pit or out of the arena, no step: the plain counter opens and no cooldown is spent.
- The step checks the floor the same way a dash does (the player's own collision and fall checks), so it can never put the player inside geometry.
- Perk clock `step` (s until it may step again) in abilityPerkState and abilityClocks.
- `validate.js`: CONFIG.abilities.flashBehind { range above 0, gap above 0, time above 0 }.

## Multiplayer

The player's movement is their own: the browser moves them and the server sees the new position as it sees a dash. The server's range checks on the counter that follows use that position, as for any blow. The step only moves its holder: it never passes through, pushes or swaps with a teammate (a teammate standing on the spot behind the boss shifts the landing up to 1 m sideways, else no step).

## Effect

Layered, timed from the perfect dodge (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00 | Streak | A flat ink-edged blue ribbon from the dodge point curving round the boss to the landing point | `#8fb8dc` edge, `#f2f6fa` core, `#0e1218` ink |
| 0.00-0.12 | Afterimages | 3 flat-shaded silhouettes of the player's pose, left at 0.04 s steps along the curve, each fading over 0.35 s | `#8fb8dc` fill, `#0e1218` ink rim |
| 0.12 | Landing ring | A hard-edged ring on the floor round the player's feet, growing 0.6 to 1.5 m | `#8fb8dc` to transparent |
| 0.12-0.40 | Flakes | 10 sharp blue flakes kicked out of the ring | `#f2f6fa` |

Budget (Rare class): 5 pooled meshes (3 afterimage silhouettes, 1 ring, the ribbon's mesh) + 10 particles (6 on Normal), no effect light, 1 ribbon, no impact frame. Peak 0.4 s. Reduced motion: the afterimages hold still and fade without trailing.

## Sound

`abilityStep` (kept, in `js/data/audio.js`): the swish and high chime, retimed so the chime lands at the landing (t = 0.12). A transient of a sharp cloth snap (filtered noise 3-5 kHz, 20 ms) added at t = 0 for the step itself.

## Camera

No camera kick and no turn: the perfect dodge and the counter already have theirs, and the camera stays the player's (with a lock on, it follows the step as it follows any move). The perk's shared `perkFov` (-0.9) plays at the landing; no `powers` entry.

## Images

- `img/counterstep-1.webp`: the swordsman flash-stepping from in front of a boss to behind it in a blue blur, three fading afterimages along a curved path, a blue ring at the landing.
