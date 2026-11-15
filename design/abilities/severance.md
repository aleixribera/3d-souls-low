# Severance

| | |
| --- | --- |
| Id | `severance` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (46 points) |
| Origin | New |

## Card

**One arena-wide cut hits all on its line.** (8 words, 40 chars)

- Icon (48×48 line drawing): a single straight diagonal line across the whole icon, the two halves of a small circle (the boss) offset along it.
- Hover loop (1.4 s): key cap "4" lights (0.2 s); a small figure stands still, hand on the hilt (0.3 s); one instant draw, a line across the whole card (one frame); the two halves of the card slide apart along it, the brighter frame showing white void in the gap (0.3 s); they snap back, a crack along the boss (0.2 s); hold, fade.

## Idea

The stillest technique in the game. A held breath, one draw too fast to see, and a single line runs across the whole arena; for a moment the two halves of the world slide apart on it, then snap back with the boss cut. No travel, no aim beyond facing: whatever is on the line is cut. It is the calligraphy stroke of the pool, all anticipation and one clean result.

## Data

```js
{ id: 'severance', name: 'Severance', rarity: 'legendary', key: 'ultimate',
  text: 'One arena-wide cut hits all on its line.',
  power: { when: 'press', then: 'worldCut' },
  levels: [
    { charge: 46, damage: 360 },
  ] },
```

Numbers: 360 in one blow for 46 points, 7.8 a point, just under the dragon's 8.4; it can't miss and it lands everything at once (no strikes lost to a phase change), and it cuts every enemy on its line, so two bosses lined up take 720. About 720-1000 a fight. On the bar.

## Engine work

- New `press/worldCut`: `['charge', 'damage']`, in `ON_ENEMY` for its aim.
- The line runs from the holder through the target's centre and on, `CONFIG.abilities.powers.worldCut.length` = 40 m each way; every enemy whose body is within `width` 1.2 m of it takes `damage` at the snap (t = 0.75). Its direction is fixed at the draw (t = 0.35); the line is shown from then, so a second boss can see it coming.
- The split: a screen pass (one full-screen quad, made at load) that samples the finished frame with the two sides of the line's screen projection offset 6 px apart along its normal, a white void showing in the gap. 0.4 s at most. Normal draws it too (VISION: Normal keeps every effect), at 4 px.
- `validate.js`: `worldCut` needs `damage`.

## Multiplayer

The server resolves it from the press claim, with the line from the holder's position at the draw (checked like any press) through the target. Enemies only: a teammate on the line is never cut. Every browser draws the line; the screen split is drawn only by browsers whose view the line crosses, and within `powerNear`. One holder per team.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.35 | Anticipation | Upper-body pose: low stance, hand on the hilt, the blade half drawn; the world dims 20% and the falling ash slows to a crawl round the holder (the drawing only) | `#e59a5c` thin glint on the hilt |
| 0.35 | Draw | One frame: the blade is out and back; a razor line appears across the arena, 40 m each way, hair-thin white with an ember glow either side | `#fff3dc` line, `#e59a5c` glow |
| 0.35-0.60 | Hold | The line hangs in the air, still; black ink beads along it; nothing else moves in the effect | `#0b0b0f` beads |
| 0.60-0.75 | Split | The two halves of the world slide apart on the line (the screen pass), a white void with an ember edge in the gap | `#fff3dc` void, `#e59a5c` edge |
| 0.75 | Peak (the snap) | The halves snap back; the cut opens across the boss in a bright seam, 30 sharp shards fly from it along the line. **The impact frame** | `#fff3dc` seam, `#e59a5c` shards, `#0b0b0f` ink |
| 0.75-1.40 | Fade | The line fades from its ends inward to the boss; the seam on the boss glows and closes; the holder's held pose: blade sheathing slowly, back half-turned | `#e59a5c` to transparent |

Budget (Legendary class): 5 pooled meshes (cut line, glow sheet, ink bead strip, boss seam, hilt glint) + the screen pass (one quad, made at load) + 30 shards + 20 ink beads = 50 particles (28 on Normal), 1 effect light at the seam (× 0.65 on Normal), no ribbon, 1 impact frame at t = 0.75. Peak 0.4 s (0.35-0.75). The split never covers a boss's wind-up for longer than its 0.15 s. Reduced motion: no screen split (the line and the seam only), the impact frame becomes a 30% darken, no shake.

## Sound

New `abilitySever`: silence first (the sfx bus ducked 60% for the 0.35 s anticipation); the draw a single very short high ring (sine 3.2 kHz with partials at 2.76 and 5.4, 5 ms attack, 0.9 s decay); the snap a dry, enormous cut (white noise high-passed at 2 kHz, 30 ms, heavy drive) over a sub drop (sine 70 to 25 Hz, 0.6 s). Tail: the ring decaying and the room's sound coming back up over 0.4 s.

## Camera

`CONFIG.camera.feel.powers.worldCut = [-3.4, 0.04]` at the snap (a hard pull in). No kick at the draw: the stillness is the point.

## Images

- `img/severance-1.webp`: a single razor-straight cut across the entire scene, the two halves of the world sliding apart with a blinding ember-white gap, the boss split along the line, the swordsman sheathing the blade.
- `img/severance-2.webp`: close on the swordsman in a held pose after a single draw, the world behind them cut in half along a glowing line.
