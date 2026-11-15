# Hunting Call

| | |
| --- | --- |
| Id | `hunting-call` |
| Rarity | Rare (cool blue `#8fb8dc`), 3 levels |
| Kind | Triggered (no key) |
| Trigger | `summonHit`: your summon that strikes on its own (a hound, a lancer, a guardian) lands a blow |
| Origin | New |

## Card

**Summon strikes: your next hit does {damage} more.** (8 words, 42 chars)

- Icon (48×48 line drawing): a sharp downward chevron with a small fang stroke at each of its two points.
- Hover loop (1.8 s): a small hound bites a boss and a blue chevron mark appears on it (0.5 s), a figure lunges and strikes the mark, which bursts (0.5 s); fade.

## Idea

Each blow your summon lands marks the boss for you: fight with your summon, not beside it. It turns a summon from a timer you wait out into a partner you follow up.

## Data

```js
{ id: 'hunting-call', name: 'Hunting Call', rarity: 'rare',
  text: 'Summon strikes: your next hit does {damage} more.',
  perk: { when: 'summonHit', then: 'empower' },
  levels: [
    { damage: 0.2 },
    { damage: 0.3 },
    { damage: 0.4 },
  ] },
```

Numbers: a hound bites every 1-1.2 s, a lancer thrusts every 0.7-0.9 s, so with a summon out most of the holder's blows find a mark: about +15-35% damage while it is out, a third to a half of a fight with a key-3 summon. Nothing without a summon, so it is a build pick. A new mark replaces an unspent one; it never stacks.

## Engine work

- New perk `summonHit/empower`: ['damage'] in ABILITY_PERKS. Perk clock `mark` (the marked enemy and s left, CONFIG.abilities.mark.keep 4 s) in abilityPerkState.
- New `when: 'summonHit'`: abilityPowers' summon strike (summonTick) arms the holder's mark on that enemy where the enemies are owned. abilityStrike adds `damage` to the holder's next landed blow on the marked enemy and spends it.
- Only SUMMON_STRIKERS arm it (hound, guardian, lancer): the ember twin echoes its holder's own blows and would mark itself.
- `validate.js`: CONFIG.abilities.mark { keep above 0 }.

## Multiplayer

The server owns the summons and the enemies, so it arms and spends the mark; the browser draws the mark from the summon's strike event (`abilityPower` with `strike`) it already receives. Only the holder's own summon marks, and only the holder's blows spend it.

## Effect

Layered, timed from the summon's blow (t = 0):

| t | Layer | Look | Colour |
| --- | --- | --- | --- |
| 0.00-0.15 | Mark | A hard-edged chevron, 0.5 m, stamped on the enemy where the summon struck, facing the holder, ink outline | `#8fb8dc` edge, `#f2f6fa` core, `#0e1218` ink |
| 0.15-keep | Hold | The chevron stays on the enemy's body, a slow 1 s pulse | as above |
| spent | Burst | The chevron bursts into 10 sharp shards as the holder's blow lands on it | `#f2f6fa`, `#8fb8dc` |

Budget (Rare class): 1 pooled mesh (the chevron) + 10 particles (6 on Normal), no effect light, no ribbon, no impact frame. Peak 0.15 s. Reduced motion: the chevron holds steady instead of pulsing.

## Sound

`abilityMark` (new, in `js/data/audio.js`): on the mark, a short hunting-horn blip (saw 330 Hz low-passed at 1 kHz, 0.15 s) under the summon's own blow; on the spending blow, a hard ring (sine 520 Hz with a 2.76 partial, 0.4 s) over the hit, as `abilityEmpower`'s ring.

## Camera

No camera kick: the holder's blow already punches the view. No `powers` entry.

## Images

- `img/hunting-call-1.webp`: a spectral hound biting a boss leaving a glowing blue chevron mark, the swordsman lunging to strike the mark.
