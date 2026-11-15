# Storm King

| | |
| --- | --- |
| Id | `storm-king` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Triggered (no key) |
| Trigger | `fullHeavy`: a fully charged heavy lands on an enemy (6 s cooldown) |
| Origin | Kept from `js/data/abilities.js`. Changed: no longer draws the lightning dragon (that is Thunder Call's alone): a crown of six bolts in a ring round the boss that converge into one; `then: 'boltCrown'` (was `lightning`); one level, 6 strikes of 34 every 0.12 s after 0.5 s (was 3 or 5 strikes of 36-38 every 0.4-0.45 s after 0.75 s). |

## Card

**Full heavy hit: a crown of {strikes} bolts falls.** (9 words, 41 chars)

- Icon (48×48 line drawing): six short vertical bolt zigzags standing in a ring like the points of a crown, bending in at the top.
- Hover loop (1.6 s): a small figure charges a heavy, the blade glowing up to full (0.5 s), and lands it (0.1 s); six bolts slam down round the boss one after another in a ring (0.4 s); they bend inward and meet in one strike, the brighter frame (0.2 s); a crown-shaped scorch, fade (0.4 s).

## Idea

A fully charged heavy that lands calls a crown of lightning: six bolts slam down in a quick ring round the boss, then bend inward and converge into one. It rewards the most committed blow in the moveset with the fastest, tightest burst in the pool, a crown placed on the boss's head by your own blade.

## Data

```js
{ id: 'storm-king', name: 'Storm King', rarity: 'legendary',
  text: 'Full heavy hit: a crown of {strikes} bolts falls.',
  power: { when: 'fullHeavy', then: 'boltCrown' },
  levels: [
    { strikes: 6, lead: 0.5, every: 0.12, damage: 34, cooldown: 6 },
  ] },
```

Numbers: 6 × 34 = 204 a full heavy that lands. A full charge takes over a second and must land, so in a real fight one lands every 8-15 s: about 14-25 a second on top of the holder's own, 1200-2000 over a 90 s fight for a player built round charged heavies, far less for one who isn't. Strong and earned; never fires on its own.

## Engine work

- New `fullHeavy/boltCrown`: `['strikes', 'lead', 'every', 'damage', 'cooldown']`, in `ON_ENEMY`; a `running` entry like `lightning` (first bolt `lead` s after the hit, then every `every` s). `fullHeavy/lightning` goes.
- Each bolt strikes a point on a ring `e.radius + 1.5` m round the struck enemy (evenly spaced, starting from the side facing the holder) and hits every enemy within 2 m of that point; the struck enemy is always inside that reach, so it takes all six. The convergence after the sixth is drawing only: no extra damage.
- `validate.js`: `boltCrown` needs its five numbers; `strikes` whole.

## Multiplayer

The server sees the landed full heavy itself (a strike with `charge >= 1`) and resolves the crown on its own enemies. Enemies only: a teammate standing on the ring is untouched and sees bolts pass by. One holder per team.

## Effect

Timed from the heavy's hit (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.50 | Anticipation | The heavy's own hit-stop and held pose; a ring of six ember points flickers on the floor round the boss where the bolts will fall; the sky over it darkens and a violet glow gathers | `#e59a5c` points, `#2a2240` sky glow |
| 0.50-1.10 | Crown | Six white-violet bolts edged in ember slam down one after another round the ring, each a hard jagged shape with a black ink outline, each leaving a standing afterimage for 0.3 s so the crown builds up; 10 sparks each | `#ece6ff` core, `#8f7cf0` body, `#e59a5c` edge, `#0b0b0f` ink |
| 1.10-1.25 | Converge | All six afterimages bend inward at the top, like the points of a crown closing | as above |
| 1.25 | Peak (one strike) | They meet over the boss and one thick bolt drives down into it; a ring of 24 shards. **The impact frame** | `#fff3dc` core, `#e59a5c` shards |
| 1.25-2.00 | Fade | A crown-shaped scorch ring (six points) stays on the floor and cools; thin violet arcs crawl over the boss and die | `#e59a5c` to `#2a1a12`, `#8f7cf0` arcs |

Budget (Legendary class): 9 pooled meshes (6 bolts as one pooled set of 3 meshes reused with afterimages as their own fading copies: 3 + 3, the converge bolt, the scorch ring, the floor point ring) + 60 + 24 + 20 arcs = 104 particles (57 on Normal), 2 effect lights (one over the ring that rises steadily as the crown builds, never pulsing per bolt, so six bolts in 0.6 s never strobe; one for the converge strike, the only flash; × 0.65 on Normal), no ribbon, 1 impact frame at t = 1.25. Peak 0.75 s. The bolts land outside the boss's body, never across its weapon. Reduced motion: the impact frame becomes a 30% darken, no shake.

## Sound

`abilityThunder` kept for each ring bolt, at gain 0.55 and pitch stepping up a semitone each, so the six read as one rising crown; `abilityDragon`'s snarl is gone from it. New `abilityCrown` for the convergence: a short rising electric whine (saw 220 to 880 Hz in 0.15 s, band-passed) into a doubled thunder crack with a sub thump (sine 42 to 26 Hz, 0.6 s).

## Camera

`CONFIG.camera.feel.powers.boltCrown = [-2.4, 0.08]` at the convergence; the ring bolts use `spark = [-0.8, 0.02]` each. The heavy's own kick already lands at t = 0.

## Images

- `img/storm-king-1.webp`: six white-violet lightning bolts edged with ember orange slamming down in a ring around a boss like the points of a crown after a charged heavy blow.
- `img/storm-king-2.webp`: the six bolts bending inward and converging into one central strike on the boss, a crown-shaped scorch ring on the floor.
