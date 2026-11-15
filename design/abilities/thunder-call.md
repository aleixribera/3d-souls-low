# Thunder Call

| | |
| --- | --- |
| Id | `thunder-call` |
| Rarity | Legendary (ember orange `#e59a5c`), 1 level |
| Kind | Key 4, Ultimate |
| Trigger | `press`: key 4 with its charge full (40 points) |
| Origin | Kept from `js/data/abilities.js`. Changed: one level instead of two; its own `then: 'dragon'` (was `press/lightning`, shared with Storm King), so the dragon belongs to Thunder Call alone; 48 damage a strike (was 45); new card text. |

## Card

**A lightning dragon strikes the boss {strikes} times.** (8 words, 44 chars)

- Icon (48×48 line drawing): a serpent's head and two coils drawn as one jagged lightning line, falling from a short horizontal cloud stroke.
- Hover loop (1.8 s): the key cap "4" lights (0.2 s); a small figure raises the blade (0.3 s); the sky line splits and a jagged ember dragon pours down and coils round a boss silhouette (0.6 s); one brighter frame as it bites; two quick bolt ticks (0.4 s); fade.

## Idea

The floor of the legendaries, and the showcase's key-4 beat. The sword goes up, the sky splits, and a dragon of lightning pours out of it, coils once round the boss and strikes it again and again. Every other legendary is measured against this one: as spectacular at least, as strong at least. It is the plainest of them on purpose: aim, press, and the dragon does the rest, so a friend on their first run feels the Ultimate key at once.

## Data

```js
{ id: 'thunder-call', name: 'Thunder Call', rarity: 'legendary', key: 'ultimate',
  text: 'A lightning dragon strikes the boss {strikes} times.',
  power: { when: 'press', then: 'dragon' },
  levels: [
    { charge: 40, strikes: 7, lead: 0.75, every: 0.3, damage: 48 },
  ] },
```

Numbers: the bar. A skilled player fills about one point a second in a boss fight (`CONFIG.abilities.press.gain`: 1 a landed blow, 2 more for a heavy finisher, full charge or counter, 3 a deflect or perfect dodge, 6 a Finishing Blow), so 40 points is a cast every 35-45 s, two or three a fight. 7 × 48 = 336 a cast, 8.4 damage a charge point; 670-1000 a fight against bosses of 1600-3500 health: a quarter to a third of a bar. That turns a fight without ending it. Every other Ultimate is held to at least 8.4 a point, or less damage with a hold or an area that pays the difference.

## Engine work

- `press/dragon` in `ABILITY_POWERS`: `['charge', 'strikes', 'lead', 'every', 'damage']`, run like today's `lightning` (in `ON_ENEMY`; a `running` entry, first strike `lead` s after the press, then every `every` s). If the boss dies mid-run, the strikes left go to the nearest live enemy within `CONFIG.abilities.press.range`, else end.
- `fullHeavy/lightning` leaves with Storm King's rework (`boltCrown`); `press/lightning` goes. `js/ability-fx.js` draws the dragon for `then === 'dragon'` only.
- One level: `CONFIG.abilities.rarity.legendary.levels` 1 and the `legendaries` cap goes (PLAN item 6: no cap on any rarity).
- The shared legendary kit, built in the same pass because every legendary uses it:
  - **Cast pose:** pressing key 4 plays the ability's pose on the upper body only (track A's animator); legs, dash and the camera stay the player's, and the power fires whatever the legs do.
  - **The dim:** over the anticipation the world's light drops 20% (a grade uniform on the output pass), for the holder and anyone within `powerNear`.
  - **The impact frame** (`VIS.impactFrame`): one full-screen two-tone pass, black ink `#0b0b0f` and white-hot `#fff3dc`, the effect's ember `#e59a5c` kept where it is brightest; two frames at 60 fps. Drawn only when the peak is on screen and within `powerNear`; gated to one a second from every source, so flashes stay under 3 Hz with a party of four.
- `validate.js`: `dragon` needs every number above; `strikes` a whole number.
- The showcase (its own session) uses the dragon as its key-4 beat: rename `lightning` to `dragon` in one pass and run the showcase's test, which says if the beat broke.

## Multiplayer

The server resolves it from the press claim (it already checks the charge it counted). One holder per team. Bolts hit enemies only; a teammate under the dragon sees it pass through them. Every browser draws it from the server's `abilityPower` events; each strike is its own event, so the bites line up for everyone.

## Effect

Timed from the press (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.35 | Anticipation | Upper-body pose: the blade raised straight up, held. The world dims 20%. Three thin ember threads crawl up the blade to its tip | `#e59a5c` threads, `#fff3dc` tip |
| 0.20-0.40 | Sky split | A jagged white line tears across the clouds above the boss, 20 m wide, opening to a hard violet slit with an ember rim | `#ece6ff` line, `#8f7cf0` slit, `#e59a5c` rim |
| 0.35-0.75 | Release | The dragon pours out of the slit: a ribbon tube of 28 segments, white-violet core, violet body, ember fringe, a black ink outline on its leading edge; a flat head shape with two horn strokes | `#ece6ff` core, `#8f7cf0` body, `#e59a5c` fringe, `#0b0b0f` ink |
| 0.55-0.75 | Coil | It loops once round the boss at chest height, its tail still in the sky | as above |
| 0.75 | Peak (first bite) | The head drives into the boss's chest: a hard bolt from the slit to the boss, a star burst of 24 sharp shards, a scorch ring on the floor. **The impact frame** | `#fff3dc` bolt, `#e59a5c` shards, `#2a1a12` scorch |
| 1.05-2.55 | Strikes 2-7 | Every 0.3 s the coil tightens and a jagged bolt cracks from the slit into the boss: 12 shards each, a short white branch; the light stays lit on the coil and swells a little with each bolt (a swell, never a flash: 3.3 bolts a second would break the 3 Hz rule) | `#fff3dc`, `#e59a5c` |
| 2.55-3.40 | Fade | The dragon unwinds upward into the slit, which seals in a last white line; the scorch ring cools from ember to black; ash flakes drift down | `#8f7cf0` to transparent, `#e59a5c` to `#2a1a12` |

Budget (Legendary class): 9 pooled meshes (sky slit, dragon tube, head, 3 bolt meshes reused round-robin, scorch ring, star burst, blade glow) + 24 + 6 × 12 = 96 particles at most alive at once (53 on Normal), 2 effect lights (the bite's flash; the coil's steady light, intensity × 0.65 on Normal), 2 ribbons (the dragon's two crossed strips), 1 impact frame at t = 0.75. Peak 1.8 s (0.75-2.55). Reduced motion: the impact frame becomes a 30% darken for 0.1 s, no shake, the sky slit fades in over 0.3 s instead of tearing.

## Sound

- Cast: `abilityDragon` (kept: the electric snarl that climbs) at t = 0.35, its glide stretched to 0.4 s so it peaks on the bite.
- Each strike: `abilityThunder` (kept: the crack overhead, then thunder rolling away); the first one louder (gain × 1.3) with an extra sub thump (sine 40 Hz falling to 24 Hz, 0.5 s).
- New tail on the last strike: a rumble that rolls round the arena (brown noise, low-pass 300 to 60 Hz over 1.6 s, high reverb send).

## Camera

`CONFIG.camera.feel.powers.dragon = [2.4, 0.08]` for the cast (the view widens as the sky splits) and the existing `strike = [-1.8, 0.06]` for each bolt. Kicks only, under 0.4 s each, faded out by `powerNear` for others. Lock-on keeps the boss framed; the camera never leaves the player.

## Images

- `img/thunder-call-1.webp`: a long serpentine dragon made of white-violet lightning edged with ember orange pouring down from a split sky and coiling around a boss, the swordsman raising the blade.
- `img/thunder-call-2.webp`: the impact frame of a lightning dragon striking a boss: the whole frame inverted to black and white with ember orange accents, hard bolt shapes.
