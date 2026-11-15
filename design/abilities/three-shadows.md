# Three Shadows

| | |
| --- | --- |
| Id | `three-shadows` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | New |

## Card

**Shadow clones strike together.** (4 words, 30 chars)

- Icon (48×48 line drawing): three small figure silhouettes around a circle, three cut lines crossing at its centre.
- Hover loop (1.8 s): a small figure presses (0.2 s), three black copies of it flash in round the boss in held poses (0.3 s), all three cut at the same instant (0.15 s) and burst into ink (0.4 s); fade.

## Idea

Three shadow copies of you flash in round the boss and cut at the same instant, then vanish: the clones that strike together. A held pose, a single crossing cut and an ink burst: one clean, readable moment.

## Data

```js
{ id: 'three-shadows', name: 'Three Shadows', rarity: 'rare', key: 'strike',
  text: 'Shadow clones strike together.',
  power: { when: 'press', then: 'clones' },
  levels: [
    { charge: 16, hits: 3, damage: 30 },
    { charge: 15, hits: 3, damage: 36 },
    { charge: 14, hits: 3, damage: 42 },
  ] },
```

Numbers: `hits` × `damage`: 90, 108 and 126 on the target, so 5.6, 7.2 and 9 damage a point, landing as one moment CONFIG.abilities.clones.lead (0.3 s) after the press. Three clones at every level, so the card's number never changes: the upgrade is the damage.

## Engine work

- New power `press/clones`: ['charge', 'hits', 'damage'] in ABILITY_POWERS. After `clones.lead` it wounds the target `hits` times at once (one event, `hits` wounds). The clones are drawn only: not a summon, never in SUMMONS, never draw the boss's eye.
- `clones` joins ON_ENEMY.
- `validate.js`: CONFIG.abilities.clones { lead from 0 to 0.5 }.

## Multiplayer

The browser claims the press; the server checks the charge and resolves the cuts on its own enemy. Enemies only. The clones are a picture on every browser, never a body anything can hit or follow.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Flash in | 3 flat ink-black silhouettes of the player appearing at 120° round the boss, each with a short speed-line streak behind it | `#0b0d12` body, `#8fb8dc` rim, `#0e1218` ink |
| 0.10-0.30 | Hold | The clones held still in drawn-sword poses, the blue rims brightening | as above |
| 0.30 | Cut | 3 straight cut lines crossing through the boss's middle in one frame | `#f2f6fa` core, `#8fb8dc` edge |
| 0.30-0.70 | Ink burst | Each clone bursts into 10 hard ink drops and flakes and is gone | `#0e1218`, `#8fb8dc` |
| 0.30-0.60 | Lines fade | The cut lines thin and fade | to transparent |

Budget (Rare class): 4 pooled meshes (3 clone silhouettes, the cut lines as one mesh) + 30 ink drops (17 on Normal), 1 effect light (blue, 0.3 s at the cut, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.3 s. The clones stand outside the boss's weapon reach from its body and go 50% translucent within 1 m of its weapon. Reduced motion: the speed-line streaks hold still.

## Sound

`abilityClones` (new, in `js/data/audio.js`): a transient of three quick air snaps as the clones appear (white noise high-passed at 3 kHz, 15 ms each, 30 ms apart), a body of a held breath of silence with a faint low drone (sine 60 Hz, 0.25 s), then the cut: one sharp layered slice (noise band-passed at 4 kHz, 40 ms, with a sine 1.3 kHz ring), a tail of an ink splash (pink noise low-passed at 1 kHz, 0.3 s).

## Camera

`CONFIG.camera.feel.powers.clones = [-1.6, 0.04]`: a pull in at the cut.

## Images

- `img/three-shadows-1.webp`: three ink-black shadow clones of the swordsman with glowing blue rims appearing around a boss and cutting it at the same instant, held poses.
