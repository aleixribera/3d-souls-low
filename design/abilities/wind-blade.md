# Wind Blade

| | |
| --- | --- |
| Id | `wind-blade` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points) |
| Origin | Kept from js/data/abilities.js: the same power, text and numbers; the crescent is redrawn in the rare's blue with ink edges |

## Card

**A wind blade cuts all in its path.** (8 words, 34 chars)

- Icon (48×48 line drawing): a wide flat crescent with three straight speed lines inside it, flying right.
- Hover loop (1.6 s): a small figure finishes a horizontal slash (0.3 s), a pale crescent leaves the blade and flies across the card through two bosses, dust tearing off the floor under it (0.7 s); fade.

## Idea

One horizontal slash throws a crescent of wind that flies on through everything in a line. The strike for lines and two-boss fights: aim it so it passes through both.

## Data

```js
{ id: 'wind-blade', name: 'Wind Blade', rarity: 'rare', key: 'strike',
  text: 'A wind blade cuts all in its path.',
  power: { when: 'press', then: 'gale' },
  levels: [
    { charge: 16, damage: 80, reach: 12, width: 1.4 },
    { charge: 15, damage: 100, reach: 14, width: 1.6 },
    { charge: 14, damage: 120, reach: 16, width: 1.8 },
  ] },
```

Numbers: a press every 14-16 s of good play, 80-120 to each enemy in the line: 5-8.6 damage a point on one boss, double through two. Two more points than Fire Burst for the reach and the second target.

## Engine work

- None for the rule: `press/gale` exists (from the holder through the target and on, `reach` m, `width` m either side).
- New look in js/ability-fx.js (`gale`): the crescent below in place of the current one; CONFIG.VISUALS.abilityFx `gale` keeps its size and speed. Gale Crescent (the legendary) uses the same drawing in its ember colour.

## Multiplayer

The browser claims the press; the server checks the charge and resolves the line against its own enemies. Enemies only: a teammate in the line sees the crescent pass through them. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.12 | Slash | A wide flat slash arc off the blade, ink-edged | `#f2f6fa` core, `#8fb8dc` edge, `#0e1218` ink |
| 0.10 to reach | Crescent | A flat pale crescent, about 3 m across, flying at CONFIG `gale.speed` at waist height, white speed streaks inside it | `#cfe2f2` face, `#8fb8dc` edge, `#f2f6fa` streaks, `#0e1218` ink |
| 0.10 to reach | Dust | Floor dust torn up under its path, 30 hard flakes in two rows | `#6e6a62`, `#cfe2f2` |
| at each enemy | Cut | A thin blue line on the body where it passes, gone in 0.2 s | `#f2f6fa` |
| reach + 0.30 | Out | The crescent thins and fades | to transparent |

Budget (Rare class): 3 pooled meshes (slash arc, crescent, cut line) + 30 particles (17 on Normal), 1 effect light (pale blue, carried with the crescent, × 0.65 on Normal), 1 ribbon (the crescent's trail), no impact frame. Peak about 0.8 s at 16 m. Reduced motion: no change needed (no flash).

## Sound

`abilityGale` (kept): the howl of wind tearing past with a blade's whistle, its low thump on each enemy cut.

## Camera

Kept: `CONFIG.camera.feel.powers.gale = [-2.4, 0.05]`.

## Images

- `img/wind-blade-1.webp`: the swordsman finishing a horizontal slash that throws a huge flying crescent of pale blue wind with white speed streaks, tearing dust from the floor toward a boss.
