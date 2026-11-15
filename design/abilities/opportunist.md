# Opportunist

| | |
| --- | --- |
| Id | `opportunist` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `cracked`: the enemy you hit has at least one crack in its guard (a counter landed on it, the cracks not yet faded) |
| Origin | Kept from js/data/abilities.js: was `open/damage` (an off-balance boss) at 30/40/50%; now `cracked/damage` at 25/35/45%, with the new text |

## Card

**Cracked guard: your hits do {damage} more.** (7 words, 35 chars)

- Icon (48×48 line drawing): a round shield with a forked crack, two short splinter strokes flying off the crack.
- Hover loop (1.6 s): a small figure lands a counter and a crack opens on the boss's guard (0.4 s), the crack lights blue, the figure hits twice and blue splinters fly off each hit (0.8 s); fade.

## Idea

A counter cracks the boss's guard, and two cracks open the Finishing Blow. Opportunist makes the time between the first crack and the Finishing Blow the moment to press: while a crack shows, every blow does more. It ties the perk to the game's own loop (counter, press, finish) instead of the old, hard-to-read "off balance" states.

## Data

```js
{ id: 'opportunist', name: 'Opportunist', rarity: 'rare',
  text: 'Cracked guard: your hits do {damage} more.',
  perk: { when: 'cracked', then: 'damage' },
  levels: [
    { damage: 0.25 },
    { damage: 0.35 },
    { damage: 0.45 },
  ] },
```

Numbers: a crack lasts up to CONFIG.finisher.fade (10 s) and a boss shows one for perhaps a third of a fight once the player counters well. A third of a player's 600-1200 blow damage a fight, raised 25-45%: about +50-180 a fight. Slightly lower than the old 30-50% because cracks show more often and longer than the old off-balance states.

## Engine work

- New perk `cracked/damage`: ['damage'] in ABILITY_PERKS, replacing `open/damage`. abilityStrike adds `damage` when `e.cracks > 0`. ABILITY_OPEN and abilityOpen go if nothing else uses them.
- js/ability-fx.js: while the local player holds it, an enemy with cracks gets the crack glow tinted blue (enemy tint `CRACK_COLOR` stays for everyone else), and each of the holder's blows on it throws the splinter burst.

## Multiplayer

Cracks live on the shared enemy, which the server owns; abilityStrike runs there and reads `e.cracks` from its own enemy. The cracks are everyone's (any teammate's counter cracks the guard), but only the holder's blows are raised. The blue crack tint is drawn only on the holder's screen.

## Effect

Layered, timed from each of the holder's blows on a cracked enemy (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| while cracked | Crack glow | The existing guard-crack glow drawn blue instead of amber on the holder's screen, a slow 0.8 s pulse (well under 3 Hz) | `#8fb8dc`, `#f2f6fa` core |
| 0.00-0.30 | Splinters | 8 hard-edged blue shards thrown from the hit point, tumbling and falling | `#8fb8dc` edge, `#f2f6fa` face, `#0e1218` ink |
| 0.00-0.12 | Chip | A small flat crack-shaped flash on the hit point, 0.5 m | `#f2f6fa` |

Budget (Rare class): 1 pooled mesh (the chip) + 8 shards a blow (5 on Normal), no effect light, no ribbon, no impact frame. Peak 0.12 s. Reduced motion: the crack glow holds steady instead of pulsing.

## Sound

New `abilitySplinter` on each raised blow, over the hit sound: a dry crack of stone (white noise high-passed at 3 kHz, 25 ms, driven) and a short glassy ring (sine 880 Hz with a 2.4 partial, 0.2 s).

## Camera

No camera kick: blows already punch the view, and a kick per blow would be noise. No `powers` entry.

## Images

- `img/opportunist-1.webp`: an armoured boss whose guard is covered in glowing blue cracks, the swordsman hammering hits into it with blue splinters flying.
