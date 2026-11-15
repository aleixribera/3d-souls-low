# Ember Twin

| | |
| --- | --- |
| Id | `ember-twin` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `flask`: the holder drinks a flask (20 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level (12 s, 55% share, draws the boss 3 s, cooldown 20: the old level II); its own Blender model in place of `js/rig.js`'s figure (PLAN item 6: a summon never reuses the bot figure). |

## Card

**Flask: a twin fights with you for {time}.** (8 words, 36 chars)

- Icon (48×48 line drawing): two identical small figures facing each other across a circle (the boss), one drawn in broken ember cracks.
- Hover loop (1.8 s): a small figure drinks a flask (0.3 s); on the boss's far side a twin in ember cracks rises out of the floor, the brighter frame as it stands (0.4 s); both strike at once from both sides, three times (0.8 s); the twin burns away into sparks (0.3 s).

## Idea

Drinking calls an ember copy of yourself up out of the floor at the boss's far side: for twelve seconds, every blow you land, it lands too from the other side, and for its first three seconds the boss turns on it. It makes the most defensive act in the game, drinking, into an attack, and gives a lone player a partner for a breath: a pincer of two blades.

## Data

```js
{ id: 'ember-twin', name: 'Ember Twin', rarity: 'legendary',
  text: 'Flask: a twin fights with you for {time}.',
  power: { when: 'flask', then: 'twin' },
  levels: [
    { time: 12, share: 0.55, draw: 3, cooldown: 20 },
  ] },
```

Numbers: 12 s × 30 a second × 0.55 = about 200 echoed a call, plus 3 s of the boss drawn off the holder (a safe drink and a free string, about 60-90). Every 20 s at most, and flasks are few (3-5 a fight), so two to four calls: 500-1100 a fight. On the bar, and the summon most worth a flask.

## Engine work

- `flask/twin` exists, unchanged (`summonStep`, `echo`, the draw).
- The model (below) replaces the rig figure in `js/ability-fx.js` `makeTwins`; its strikes follow the holder's attack by id (the twin plays the same move from its own clip set, mirrored), so online every client draws the same swing.

## Multiplayer

The client claims `flask` (it already does); the server checks it and resolves the twin and its echoes, and the draw on its own boss. The twin fights only the boss, takes its attention for `draw` s, never blocks a teammate (no collision with players), and never revives anyone. One summon per player at a time (another kind's call waits). One holder per team.

## Model

`tools/blender/ember_twin.py`: the holder's silhouette, not their mesh: a hooded swordsman about 1.8 m tall with a scarf and a round shield, built of dark ash plates split by glowing ember cracks, the face a dark hollow with two ember points. Its own skeleton matching the player rig's bone names so the player's attack clips play on it unchanged (mirrored when it faces the holder). About 4k triangles. Material: ash-black flat base, an emissive crack map (white-hot centre, ember edge), a thin black ink rim; the scarf trails embers. Animations: `rise` (out of the floor from the feet up, a seam of light climbing it, 0.7 s), every attack clip of the player (shared), `idle` (a guard stance, breathing embers), `burn-away` (cracks widen from the head down, plates fall as sparks, 0.6 s). Baked to `js/baked/`; four in the pool (one a player), warmed at load. Seen in the game beside the player before it ships.

## Effect

Timed from the drink (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.30 | Anticipation | The flask's own drink; ember threads run from the flask down the holder's arm into the floor and under the boss | `#e59a5c` threads |
| 0.30-0.70 | Rise | At the boss's far side the floor cracks in the holder's outline and the twin rises out of it, a seam of white light climbing from feet to hood | `#2a2420` plates, `#fff3dc` seam, `#e59a5c` cracks, `#0b0b0f` ink |
| 0.70 | Peak (it stands) | The twin snaps into the holder's stance, its eyes light, a ring of ember sparks bursts at its feet. **The impact frame** | `#fff3dc`, `#e59a5c` |
| 0.70-12.0 | Fight | Each blow the holder lands, the twin lands 0.06 s later from its side with an ember slash on its cut line (flat, two tones, ink outline); while it draws the boss, a thin ember line joins the boss's eyes to it | `#e59a5c` slash, `#fff3dc` core |
| 11.4-12.0 | Burn away | Cracks widen from the head down, plates fall as sparks; its scarf goes last | `#e59a5c` to `#5a5550` |

Budget (Legendary class at the rise, summon after): the rise 4 pooled meshes (the twin model, floor crack decal, seam card, spark ring) + 40 sparks, 2 effect lights (the seam, the stand; × 0.65 on Normal), 1 impact frame at t = 0.70, peak 0.4 s. While it fights: the model + 2 meshes (slash pool head, draw line), 20 embers off it (11 on Normal), 1 light on its chest, steady, 1 ribbon (its blade's trail). Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

`abilityTwin` kept for the rise; `abilityEcho` kept for each mirrored blow; `abilityTaunt` for the draw. New `abilityTwinFade` at the burn-away: a soft crackle falling in pitch and a breath of air (band-passed noise at 900 Hz fading, 0.6 s).

## Camera

`CONFIG.camera.feel.powers.twin = [2.6, 0.1]` kept at the rise; `echo = [-0.6, 0.02]` and `draw = [1.2, 0.03]` kept.

## Images

- `img/ember-twin-1.webp`: an ember copy of the swordsman made of glowing cracks and dark ash on the far side of a boss, both striking at once in a pincer.
- `img/ember-twin-2.webp`: the ember twin burning away into sparks as its time ends.
