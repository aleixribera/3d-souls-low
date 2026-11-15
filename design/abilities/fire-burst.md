# Fire Burst

| | |
| --- | --- |
| Id | `fire-burst` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Key 1, Strike |
| Trigger | `press`: key 1 pressed with its charge full (`charge` points, earned by blows, deflects, perfect dodges and Finishing Blows) |
| Origin | Kept from js/data/abilities.js: the same power, text and numbers; the round flare becomes a lotus of six flame petals |

## Card

**Fire bursts on the boss.** (5 words, 24 chars)

- Icon (48×48 line drawing): six pointed petals in a ring, closing inward toward a centre dot.
- Hover loop (1.6 s): a small key cap fills and is pressed (0.3 s), the figure throws out a hand, six flame petals rise round the boss's feet (0.4 s) and snap shut on it in a burst (0.3 s); hold, fade.

## Idea

The first key-1 technique: a lotus of fire opens under the boss and snaps shut on it. Instant, sure and satisfying: no aim, no travel, the boss in range is hit.

## Data

```js
{ id: 'fire-burst', name: 'Fire Burst', rarity: 'rare', key: 'strike',
  text: 'Fire bursts on the boss.',
  power: { when: 'press', then: 'flare' },
  levels: [
    { charge: 14, damage: 70 },
    { charge: 13, damage: 90 },
    { charge: 12, damage: 110 },
  ] },
```

Numbers: good play earns about one point a second (a light 1, a heavy, full charge or counter 3, a deflect or perfect dodge 3, a Finishing Blow 6), so 12-14 points is a press every 12-14 s: 5-9 damage a second added. The simplest strike, single target, never misses: the baseline the other strikes are measured against (about 5 damage a point at level I, 9 at level III).

## Engine work

- None for the rule: `press/flare` exists (the locked enemy, else the nearest within CONFIG.abilities.press.range).
- New look in js/ability-fx.js: a `flare` event from a press (`v.charge` set) draws the lotus below; Counterflame's (no `charge`) keeps its burst. Told apart by the data, never by id.

## Multiplayer

The browser claims the press; the server checks it against its own count of the key's charge and resolves the flare on its own enemy. Enemies only. Every browser draws it.

## Effect

Layered, timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.10 | Hand | The player's open hand thrown forward; a small blue glint in the palm | `#8fb8dc` |
| 0.05-0.30 | Bloom | 6 flat flame petals, 2.4 m tall, rising in a ring round the boss's feet, blue-white tips, ember inside, ink outlines | `#f2f6fa` tips, `#8fb8dc` edge, `#c8642a` ember inner, `#0e1218` ink |
| 0.30-0.45 | Close | The petals fold inward and meet over the boss in a burst | as above |
| 0.40-0.80 | Embers | 24 hard flakes thrown up from the closed burst | `#cfe2f2`, `#c8642a` |
| 0.45-0.90 | Scorch | A flat scorch ring on the floor, fading | `#2c3a48` |

Budget (Rare class): 3 pooled meshes (the six petals as one mesh, the burst, the scorch decal) + 24 particles (13 on Normal), 1 effect light (blue-white, 0.4 s, × 0.65 on Normal), no ribbon, no impact frame. Peak 0.45 s. The petals go 50% translucent within 1 m of the boss's weapon. Reduced motion: no change needed (no flash).

## Sound

`abilityFlare` (kept) at the close, with a new opening layer: a soft rising rush of flame (pink noise band-passed 400 to 1200 Hz over 0.3 s) from the bloom.

## Camera

Kept: `CONFIG.camera.feel.powers.flare = [-1.1, 0.03]`, at the close.

## Images

- `img/fire-burst-1.webp`: a lotus of six hard-edged flame petals blooming under a boss and snapping shut on it, blue-white tips and an ember core, the swordsman with an outstretched hand.
