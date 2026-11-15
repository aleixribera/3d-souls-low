# Shade Host

| | |
| --- | --- |
| Id | `shade-host` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `dodge`: a perfect dodge (2 s cooldown) |
| Origin | New |

## Card

**Perfect dodge: a shadow clone joins for {time}.** (8 words, 42 chars)

- Icon (48×48 line drawing): three hooded figures in a fan, the front one solid, the two behind drawn as ink outlines with two small dots for eyes.
- Hover loop (2.0 s): a small figure sidesteps a falling blow (0.2 s); its afterimage stays behind, darkens to ink and steps out as a clone, the brighter frame as its eyes light (0.3 s); a second dodge, a second clone (0.4 s); figure and clones strike the boss together from three sides (0.7 s); the first clone splashes into ink (0.4 s).

## Idea

Every perfect dodge leaves something behind: the afterimage you dodged out of darkens to black ink, opens two ember eyes and steps out to fight beside you for six seconds, copying your blows from its own side of the boss. Dodge well three times and you fight as four. It is the army technique, built on the hardest defensive timing, so the clones come in the middle of a good exchange and leave when it ends.

## Data

```js
{ id: 'shade-host', name: 'Shade Host', rarity: 'legendary',
  text: 'Perfect dodge: a shadow clone joins for {time}.',
  power: { when: 'dodge', then: 'shadeClone' },
  levels: [
    { time: 6, share: 0.35, most: 3, cooldown: 2 },
  ] },
```

Numbers: each clone echoes `share` of every blow the holder lands; three out at once is 1.05, so the holder hits twice as hard. A skilled player lands about 30 a second in an open exchange and keeps one or two clones out about half the fight: 30 × 0.35 × 1.5 × 45 s = about 700 in a 90 s fight, up to about 1000 for a player who perfect-dodges every two or three seconds. On the bar, and scaled by the hardest timing in the game. The clones draw nothing: the boss keeps its target.

## Engine work

- New `dodge/shadeClone`: `['time', 'share', 'most', 'cooldown']`, a summon of a new kind, `shade`, run by `summonStep` like the twin and echoing like it (`echo`, a power's blow: it never counts toward `hits`, a counter or a crack, and sets off no power).
- A host, not one body: the holder's summon slot holds one `shade` entry with up to `most` clones, each with its own `until`. A perfect dodge with `most` out renews the oldest one's `until` instead of adding one. The slot rule stands: while a host is out, another kind's call waits (and a twin out keeps the host waiting); the host counts as the holder's one summon.
- Places: `CONFIG.abilities.summons.shade = { gap: 1.0, flanks: [1.3, -1.3, 3.14], speed: 18, height: 1.8 }`, clone n standing at `flanks[n]` rad round from the holder's side, so the first two pincer and the third comes from behind. `summonStep` takes `flanks[n]` where a kind has `flanks` (its one `flank` otherwise).
- A clone appears where the dodge happened (the afterimage, `js/afterimage.js`) and flash-steps to its place at `speed`.
- `validate.js`: `shadeClone` needs `time`, `share` (a share), `most` (a whole number 1-4) and `cooldown`.

## Multiplayer

The client claims `dodge` (it already does); the server checks it against the attack it knows and the cooldown, adds the clone and resolves each echo on its own enemy. Clones fight only enemies, have no collision with players, draw nothing and revive no one. One summon slot per player, so a party of four has at most twelve clones, each only echoing its own holder. One holder per team.

## Model

`tools/blender/shade_clone.py`: the holder's silhouette in black ink: a hooded swordsman about 1.8 m tall with a scarf and a round shield, built as flat brush-ink planes over a simple body (the hood, coat tails and scarf end in dry-brush splits), two ember points for eyes and an ember rim on the blade and shield edge. Its skeleton matches the player rig's bone names, so the player's attack clips play on it unchanged (mirrored for clones facing the holder). About 2.5k triangles. Material: flat ink black `#0b0b0f` with a 15% inner ink-wash gradient, an emissive ember rim map, eyes `#fff3dc` over `#e59a5c`. Animations: `step-out` (from the afterimage pose, ink drips upward into the shape, 0.3 s), every attack clip of the player (shared), `idle` (a low stance, the coat tails drifting like ink in water), `splash` (it collapses into an ink splash from the feet up, 0.4 s). Baked to `js/baked/`; twelve in the pool (three a player), warmed at load. Seen in the game beside the player before it ships.

## Effect

Timed from the perfect dodge (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Anticipation | The dodge's own slow beat; the afterimage left behind stays, darkening from its edges inward to ink | `#0b0b0f`, `#e59a5c` edge |
| 0.15 | Peak (eyes open) | The ink figure's eyes light ember and white; a ring of ink splashes out from its feet. **The impact frame**, only for the first clone of a host (the others get the ring alone) | `#fff3dc` eyes, `#e59a5c` iris, `#0b0b0f` ink |
| 0.15-0.45 | Step | It flash-steps to its place round the boss: a brush smear of ink along its path with speed lines | `#0b0b0f` smear, `#e59a5c` fringe |
| 0.45-6.15 | Fight | Each blow the holder lands, every clone lands 0.08 s later from its side, an ink slash with an ember edge on its cut line | `#0b0b0f` slash, `#e59a5c` edge |
| 5.75-6.15 | Splash | The clone collapses into an ink splash that soaks into the floor; the eyes go last | `#0b0b0f` to transparent |

Budget (Legendary class at the first step-out, summon after): the step-out 4 pooled meshes (the clone model, afterimage shell, ink ring, smear) + 30 ink drops (17 on Normal), 1 effect light (the eyes' glow at step-out; × 0.65 on Normal), 1 impact frame per host. While they fight: up to 3 models + 2 meshes (a pooled slash head and the splash), 8 ink motes a clone (24 at most, 13 on Normal), no light (ink casts none; the ember rims are emissive), 1 ribbon shared by the clones' blade trails. Clones stand at the boss's sides and back, never between the camera and its weapon; a clone within 1.5 m of the weapon during a wind-up goes 50% translucent. Reduced motion: the impact frame becomes a 30% darken, no shake, the smear holds still.

## Sound

New `abilityShade`: at the eyes opening a wet ink drop (sine 900 to 300 Hz, 60 ms) and a low breath (band-passed noise at 300 Hz, 0.3 s); the step a brush whip (band-passed noise 1.5 to 4 kHz, 0.1 s). `abilityEcho` kept for each clone's blow, softer (gain × 0.6) and jittered so three clones don't sound as one. The splash: a soft liquid collapse (low-passed noise falling from 1.2 kHz to 200 Hz, 0.4 s).

## Camera

`CONFIG.camera.feel.powers.shadeClone = [1.4, 0.03]` at the first clone of a host only; `echo = [-0.6, 0.02]` is not used for clones (three would shake the view).

## Images

- `img/shade-host-1.webp`: three black ink shadow clones of the swordsman with ember orange eyes and rims surrounding a boss and attacking with the real swordsman.
- `img/shade-host-2.webp`: a shadow clone stepping out of the swordsman's afterimage after a perfect dodge.
