# Style bible: the look of a technique

Every ability's effect, card and image is judged against this page. The images in `img/style-*.webp` show it.

## The references, and what each gives us

Feel only. Never a show's or game's names, symbols, characters, crests, costumes or signature looks (VISION.md).

| Reference | What we take | What we leave |
| --- | --- | --- |
| Demon Slayer's elemental breathing forms | Elements as **flat, hard-edged shapes with dark ink outlines and 2-3 tones**: water as a painted wave with foam claws, fire as solid tongues with dark inner lines. The effect follows the blade's path. | Its specific forms, the woodblock wave copied whole, its colours per character. |
| Jujutsu Kaisen's techniques | **Impact frames**: one or two frames where the image inverts to two tones, then snaps back. Domain-style moments where the world itself changes colour. Black sparks of a perfect hit. | Its domains' designs, hand signs, any named technique. |
| Naruto Shippuden's fights | **Clones, flash steps, held anticipation poses**, the hand sign before the big one, speed lines behind a dash, the wide shot after the hit. | Its symbols, headbands, specific jutsu shapes. |
| Sekiro | **Pace**: the deflect spark, the posture moment, the follow-up within half a second. Effects that peak at once and get out of the way. | Its prosthetic tools and kanji prompts. |
| Stellar Blade | **Clean, fast VFX on dark ground**: bright cyan and ember cut lines, sharp particles, the camera tightening on a perfect counter. | Its characters and HUD. |

## The rules the images share

1. **The world is dark; the technique is the brightest, most saturated thing on screen.** Arena ash-grey and blue-black, falling ash, dim light. The effect lights the scene.
2. **Hard edges.** Effect shapes are solid, flat-shaded in 2-3 tones with a dark ink outline or a white hot core. No soft fog glow as the main shape (glow is the halo, not the body).
3. **Rarity colour leads the silhouette.** The colour sits on the outer edge of the shape, where the eye reads it first.
   - Common, bone ink `#cfc8b6`: grey, white and black brush ink. Small: one stroke, one spark.
   - Rare, cool blue `#8fb8dc`: blue edges, white core, black ink lines.
   - Legendary, ember orange `#e59a5c`: ember edges over white-hot or white-violet cores, with black ink.
   - Story, crimson and gold (`#b3262e` scarf red, `#e8c46a` oath gold): the four gifts of the road.
4. **Brush and speed lines.** Ink-brush smears trail the blade; radial speed lines behind dashes and dives; calligraphy strokes for still, precise techniques.
5. **Held poses.** Anticipation (a still beat before the big one), follow-through (a held pose after it, the effect blooming behind). The image is always a keyframe, never a mid-motion blur of nothing.
6. **The delayed cut.** A line hangs in the air, then opens. The signature of our blade techniques.
7. **Few, big, sharp particles.** Streaks, shards, petals, flakes with hard edges. Never a haze of tiny dots.
8. **One impact frame per moment.** Legendaries get one inverted two-tone frame at their peak; nothing else does. Never more than one flash per second from abilities, under 3 Hz in all (VISION).
9. **Boss tells are never hidden.** No effect covers a boss's wind-up for more than 0.3 s; big ones go translucent near the boss's weapon.

## Timing

| Phase | Common | Rare | Legendary | Story |
| --- | --- | --- | --- | --- |
| Anticipation | none | 0-0.15 s | 0.2-0.6 s (held pose, the world dims 20%) | 0.4-1.0 s |
| Peak | within 0.1 s | within 0.15 s | within 0.2 s of the release | within 0.2 s |
| Fade | 0.2-0.6 s | 0.4-1.5 s | 0.5-1.5 s (auras longer) | 1-2 s |

## Budgets on the Normal preset

From `js/config.js`: Normal has `fxBudgets.normal` density 0.55, capacity 0.55, ribbons 4, ribbonSub 2, light 0.65, and two pooled effect lights. Every effect uses pooled meshes from the `VIS.abilityFx` pool, made at load and warmed by `visuals.warmUp`; nothing is allocated per cast.

| Class | Meshes | Particles (Ultra; Normal × 0.55) | Effect lights | Ribbons | Impact frame | Peak length |
| --- | --- | --- | --- | --- | --- | --- |
| Common | ≤ 3 | ≤ 24 | 0 | 0 | no | ≤ 0.6 s |
| Rare | ≤ 8 | ≤ 60 | 1 | ≤ 1 | no | ≤ 1.5 s |
| Rare summon | the model + ≤ 4 | ≤ 40 | 1 while striking | ≤ 1 | no | its time |
| Legendary | ≤ 20 | ≤ 160 | 2 | ≤ 2 | 1 | ≤ 3 s peak |
| Legendary aura (long) | ≤ 4 | ≤ 30 | 1 | 0 | no | its time |
| Story | ≤ 28 | ≤ 200 | 2 | 2 | 1 | ≤ 4 s |

Reduced motion (`reducedMotion()`): the impact frame becomes a 30% darken, no camera shake, speed lines hold still, the world-colour changes fade in over 0.3 s instead of cutting.

## Camera

`CONFIG.camera.feel.powers` maps each power to `[fov kick, dip]` (blast `[4, 0.24]`, lightning `[1.6, 0]`, freeze `[-3.2, 0.05]`). New powers get an entry. Within `powerNear` (26 m) only. Never take the camera from the player: kicks and dips only, at most 0.4 s, and never for commons.

## Sound

Synthesised and layered in `js/data/audio.js`, like `abilityBlast` and `abilityDragon`. Each spec names its layers: a transient (the hit), a body (the element), a tail (the room). Pick pitch by rarity (`ABILITY_PICK_PITCH`: common 1, rare 0.84, legendary 0.67).

## Cards

The card on the pick screen: the rarity colour on its edge and icon, the 48×48 line icon (`ABILITY_ICONS`), the name, the card text. Hover plays a short loop of how the ability activates (the trigger, then the effect, 1.2-2 s, looping), drawn in the icon's line style on the card's dark face. Commons: one stroke loop. Rares: the trigger and the effect in blue. Legendaries: ember, with a single brighter frame at the effect's peak. Story: crimson and gold.

## The image prompt

Every image is made from one preamble plus the subject. The preamble:

> Concept art keyframe for an original dark fantasy action game, 16:9 landscape, anime action style: hard-edged cel-shaded effect shapes with dark ink outlines, ink-brush smears, speed lines, a held dramatic pose, low cinematic camera. A dark ash-grey and blue-black stone arena under falling ash, lit mostly by the technique itself, which is the most saturated thing in the frame. The hero is a lone swordsman in a dark hooded coat with a long red scarf and a round shield, face hidden in shadow. Original designs only: no existing characters, logos, symbols, text, letters or watermarks.

Then: `Technique colour: <rarity line>. Scene: <img subject>. Boss: <boss>.` Bosses rotate through the game's own: a huge antlered beast of hunger, a chained jailer giant, a bell-ringing warden in robes, a knight of ash, a many-armed witch, a stone colossus. Commons may drop the boss for a close-up of the hero.

## Judging an image

Keep it when: the technique reads as one clear shape at a glance; the rarity colour leads; the world stays dark; the hero matches (hood, red scarf, round shield); nothing copies a known show or game; no text. Redo only when it truly misses one of these (a wrong subject, a plain copy, text in the image, the effect unreadable).
