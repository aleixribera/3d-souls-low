# Stone Guardian

| | |
| --- | --- |
| Id | `stone-guardian` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `low`: your health drops to or under `below` (a third) of the bar; once a fight |
| Origin | Kept from js/data/abilities.js: the same power, text and numbers; the model's look moves from a sword and headstone to a tower shield it bashes with |

## Card

**Low health: a guardian holds the boss for {draw}.** (9 words, 44 chars)

- Icon (48×48 line drawing): a tall rectangular tower shield rising out of a broken floor line, two short rune strokes on its face.
- Hover loop (2.0 s): a small figure's health bar drops red (0.3 s), the floor cracks and a stone figure with a tower shield breaks up between the figure and the boss (0.6 s), it slams the shield forward and the boss turns to it (0.5 s), the small figure drinks behind it (0.4 s); fade.

## Idea

Once a fight, nearly down, a guardian of stone rises between you and the boss and takes its attention: the breather to drink. It's the safety net that lets a friend new to the genre survive their first bad stretch, and it hits back with its shield while it holds.

## Data

```js
{ id: 'stone-guardian', name: 'Stone Guardian', rarity: 'rare',
  text: 'Low health: a guardian holds the boss for {draw}.',
  power: { when: 'low', then: 'guardian', once: true },
  levels: [
    { below: 0.33, time: 9, every: 2, damage: 14, draw: 4 },
    { below: 0.33, time: 11, every: 1.8, damage: 18, draw: 5 },
    { below: 0.33, time: 13, every: 1.6, damage: 22, draw: 6 },
  ] },
```

Numbers: `draw` (4-6 s) is the breather: long enough to back off and drink one flask (about 1.5 s) with time to spare. The guardian stays `time` s, bashing every `every` s: 4-8 bashes of 14-22, about 60-180 damage, so its worth is the held boss, not the damage. Once a fight keeps it a safety net.

## Engine work

- None for the rule: `low/guardian` exists (a summon in abilityPowers, CONFIG.abilities.summons.guardian, drawn by js/summon-figures.js).
- The moves change with the model: CONFIG.VISUALS.abilityFx.guardian.moves become a Shield Bash and a Shield Slam (key poses in js/data/attack-poses.js), and its `cry` (drawing the boss's eye) becomes the braced shield strike below.
- Model: its own Blender model, `tools/blender/guardian.py` (pass 78's model, rebuilt; same game rig at scale 1, rigid parts named `guardian:<bone>__<slot>`, slots `stone`, `worn` and `rune`), built with `run_asset.py` and packed to `js/baked/` by `node tools/pack-baked.cjs`. A hulking tomb guardian of cut stone, about 2.4 m tall in the game (scale 1.37) and 1.4 m across the shoulders: a deep stone hood with two slits of blue light, squared block shoulders, a broad faceted chest split by a glowing seam, thick stone drums for arms and legs bound by rings of light, and a tower shield about 1.8 m tall and 0.9 m wide carved with a ring-cross, blue runes cut into its seams. No sword: the shield is its weapon. About 3,000 triangles. Its 3 animations, as key poses on the game rig:
  - Rise (0.9 s): crouched under the floor, it pushes up through the slabs shield first and straightens.
  - Shield Bash (0.5 s wind-up, 0.12 s strike, 0.55 s recovery): the shield drawn back on its left arm, then driven forward from the shoulder.
  - Brace (its `cry`, 1.2 s): the shield planted in the floor with a ringing strike of the fist on its face, as it draws the boss's eye.

## Multiplayer

As today: the server owns the summon. It draws only the boss it rises beside, only between that boss's attacks, and never blocks, pushes or stands in for a teammate; teammates walk through it. Every browser draws it.

## Effect

Layered, timed from the call (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.20 | Cracks | A star of hard-edged cracks opening in the floor at its spot, glowing from inside | `#8fb8dc` glow, `#0e1218` ink |
| 0.10-0.90 | Rise | The model pushes up through the floor; 8 slab chunks thrown aside, dust | `#6e6a62` stone, `#8fb8dc` runes |
| while out | Runes | Blue light in its seams, eye slits and joint rings, a slow 1 s pulse | `#8fb8dc`, `#e8f6ff` core |
| each bash | Bash | A flat blue shock ring off the shield face at the hit, 1.6 m, and 8 shards | `#8fb8dc` edge, `#f2f6fa` core |
| draw | Brace | A ring of blue light spreading from the planted shield across the floor, 3 m | `#8fb8dc` to transparent |
| end, 0.90 s | Crumble | It sinks back into the floor as dust, runes fading last | `#6e6a62`, `#8fb8dc` |

Budget (Rare summon class): the model + 3 pooled meshes (crack decal, shock ring, brace ring) + up to 34 particles (19 on Normal), 1 effect light while it bashes (blue, 0.25 s, × 0.65 on Normal), no ribbon, no impact frame. Its time is `time`. Reduced motion: the rune pulse holds steady; the bash shake goes.

## Sound

Kept: `abilityGuardian` (the stone grinding up and the deep thud as it stands), `abilityBash` per bash, `abilityChallenge` on the draw, its horn-like call now a struck shield of stone (brown noise thump at 200 Hz under the ring).

## Camera

Kept: `CONFIG.camera.feel.powers.guardian = [2.2, 0.1]` as it rises, and `draw = [1.2, 0.03]` as it takes the boss.

## Images

- `img/stone-guardian-1.webp`: a hulking stone guardian with a tower shield erupting from the arena floor between a wounded swordsman and a boss, blue runes glowing in its seams.
